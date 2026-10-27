import { type Email, Mailer } from './mailer.js';

/** Faux `Mailer` pour les tests : garde les e-mails en mémoire au lieu de les envoyer. */
export class InMemoryMailer extends Mailer {
  readonly sent: Email[] = [];

  send(email: Email): void {
    this.sent.push(email);
  }

  /** Dernier e-mail envoyé à `to`, ou `undefined`. */
  lastTo(to: string): Email | undefined {
    return this.sent.findLast((email) => email.to === to);
  }
}
