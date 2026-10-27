// API publique de l'envoi d'e-mails (BE-009). Le reste du code n'importe que ce fichier.
export { InMemoryMailer } from './in-memory.mailer.js';
export { MailModule } from './mail.module.js';
export { type Email, Mailer } from './mailer.js';
export { escapeHtml, existingAccountEmail, resetPasswordEmail, verifyEmail } from './templates.js';
