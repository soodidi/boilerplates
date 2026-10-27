import { Global, Module } from '@nestjs/common';
import { ENV, type Env } from '../config/env.js';
import { Mailer } from './mailer.js';
import { createSmtpTransport, MAIL_TRANSPORT, SmtpMailer } from './smtp.mailer.js';

/** BE-009 : envoi d'e-mails. Les modules injectent `Mailer`, jamais le transport. */
@Global()
@Module({
  providers: [
    { provide: MAIL_TRANSPORT, inject: [ENV], useFactory: (env: Env) => createSmtpTransport(env) },
    SmtpMailer,
    { provide: Mailer, useExisting: SmtpMailer },
  ],
  exports: [Mailer],
})
export class MailModule {}
