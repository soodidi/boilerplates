import { GenericContainer, type StartedTestContainer, Wait } from 'testcontainers';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { envSchema } from '../config/env.js';
import { createSmtpTransport, SmtpMailer } from './smtp.mailer.js';
import { verifyEmail } from './templates.js';

// BE-009 : le vrai chemin SMTP (nodemailer), contre Mailpit, comme en développement.
const MAILPIT_IMAGE = 'axllent/mailpit:v1.32';

type MailpitMessages = {
  messages: { Subject: string; From: { Address: string }; To: { Address: string }[] }[];
};

describe('SmtpMailer against Mailpit (integration)', () => {
  let container: StartedTestContainer | undefined;
  let mailer: SmtpMailer;
  let apiUrl: string;

  beforeAll(async () => {
    container = await new GenericContainer(MAILPIT_IMAGE)
      .withExposedPorts(1025, 8025)
      .withWaitStrategy(Wait.forHttp('/livez', 8025))
      .start();
    const host = container.getHost();
    apiUrl = `http://${host}:${container.getMappedPort(8025)}/api/v1`;

    const env = envSchema.parse({
      NODE_ENV: 'test',
      DATABASE_URL: 'postgres://unused:unused@localhost:5432/unused',
      SMTP_URL: `smtp://${host}:${container.getMappedPort(1025)}`,
      MAIL_FROM: 'Notes <noreply@example.com>',
    });
    mailer = new SmtpMailer(createSmtpTransport(env), env);
  });

  afterAll(async () => {
    // Le conteneur peut ne pas avoir démarré : beforeAll a alors déjà échoué.
    if (!container) return;
    await mailer.onApplicationShutdown();
    await container.stop();
  });

  it('delivers the email over SMTP', async () => {
    mailer.send(
      verifyEmail({ to: 'ada@example.com', appName: 'Notes', url: 'https://example.com/v' }),
    );
    await mailer.flush();

    const response = await fetch(`${apiUrl}/messages`);
    const { messages } = (await response.json()) as MailpitMessages;
    expect(messages).toHaveLength(1);
    expect(messages[0]?.Subject).toBe('Notes : confirmez votre adresse e-mail');
    expect(messages[0]?.From.Address).toBe('noreply@example.com');
    expect(messages[0]?.To[0]?.Address).toBe('ada@example.com');
  });
});
