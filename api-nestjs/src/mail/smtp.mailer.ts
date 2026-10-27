import { Inject, Injectable, Logger, type OnApplicationShutdown } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { createTransport, type Transporter } from 'nodemailer';
import { ENV, type Env } from '../config/env.js';
import { type Email, Mailer } from './mailer.js';

/** Jeton d'injection du transport SMTP (nodemailer), remplaçable dans les tests. */
export const MAIL_TRANSPORT = Symbol('MAIL_TRANSPORT');
export type MailTransport = Pick<Transporter, 'sendMail' | 'close'>;

/** Délais avant chaque nouvelle tentative : 3 reprises après le premier essai (BE-009). */
export const RETRY_DELAYS_MS = [1_000, 5_000, 25_000];

/** Temps laissé aux envois en cours lors de l'arrêt de l'application. */
const SHUTDOWN_TIMEOUT_MS = 10_000;

/** Transport SMTP construit depuis `SMTP_URL`. En production, TLS est obligatoire (BE-009). */
export function createSmtpTransport(env: Env): MailTransport {
  const url = new URL(env.SMTP_URL);
  const secure = url.protocol === 'smtps:';
  return createTransport({
    host: url.hostname,
    port: url.port ? Number(url.port) : secure ? 465 : 587,
    secure,
    requireTLS: env.NODE_ENV === 'production' && !secure && !env.SMTP_INSECURE,
    auth: url.username
      ? { user: decodeURIComponent(url.username), pass: decodeURIComponent(url.password) }
      : undefined,
  });
}

/**
 * Envoi SMTP hors de la requête, avec reprises.
 * Les logs et Sentry ne reçoivent que le nom du gabarit et le code d'erreur : jamais l'adresse,
 * le contenu ni le message d'erreur du serveur, qui peut citer le destinataire (BE-007, BE-009).
 */
@Injectable()
export class SmtpMailer extends Mailer implements OnApplicationShutdown {
  private readonly logger = new Logger(SmtpMailer.name);
  private readonly pending = new Set<Promise<void>>();
  private readonly allowedRecipients: Set<string>;

  constructor(
    @Inject(MAIL_TRANSPORT) private readonly transport: MailTransport,
    @Inject(ENV) private readonly env: Env,
  ) {
    super();
    this.allowedRecipients = new Set(env.MAIL_ALLOWED_RECIPIENTS);
  }

  send(email: Email): void {
    // Staging : seules les adresses autorisées reçoivent des e-mails.
    if (this.allowedRecipients.size > 0 && !this.allowedRecipients.has(email.to.toLowerCase())) {
      this.logger.log({ template: email.template }, 'Email skipped: recipient not allowed');
      return;
    }

    const delivery = this.deliver(email).finally(() => this.pending.delete(delivery));
    this.pending.add(delivery);
  }

  /** Attend la fin des envois en cours (pour les tests et l'arrêt de l'application). */
  async flush(): Promise<void> {
    await Promise.allSettled([...this.pending]);
  }

  async onApplicationShutdown() {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<void>(
      (resolve) => (timer = setTimeout(resolve, SHUTDOWN_TIMEOUT_MS)),
    );
    await Promise.race([this.flush(), timeout]);
    clearTimeout(timer);
    this.transport.close();
  }

  private async deliver(email: Email): Promise<void> {
    for (let attempt = 0; ; attempt++) {
      try {
        const info = await this.transport.sendMail({
          from: this.env.MAIL_FROM,
          to: email.to,
          subject: email.subject,
          text: email.text,
          html: email.html,
        });
        this.logger.log({ template: email.template, messageId: info.messageId }, 'Email sent');
        return;
      } catch (error) {
        const code = errorCode(error);
        // Une erreur SMTP 5xx est définitive (adresse inexistante, refus) : inutile de réessayer.
        const delay = code.startsWith('5') ? undefined : RETRY_DELAYS_MS[attempt];
        if (delay === undefined) {
          this.logger.error(
            { template: email.template, code, attempts: attempt + 1 },
            'Email failed',
          );
          Sentry.captureException(new Error(`Email delivery failed: ${email.template}`), {
            tags: { template: email.template, code },
          });
          return;
        }
        this.logger.warn({ template: email.template, code, attempt: attempt + 1 }, 'Email retry');
        await sleep(delay);
      }
    }
  }
}

/** `setTimeout` global plutôt que `node:timers/promises`, pour que les tests puissent simuler le temps. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function errorCode(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    const { code, responseCode } = error as { code?: unknown; responseCode?: unknown };
    if (typeof responseCode === 'number') return String(responseCode);
    if (typeof code === 'string') return code;
  }
  return 'unknown';
}
