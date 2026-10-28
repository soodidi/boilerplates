import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { SentryModule } from '@sentry/nestjs/setup';
import { LoggerModule } from 'nestjs-pino';
import { CsrfGuard } from './common/csrf.guard.js';
import { ProblemDetailsFilter } from './common/problem-details.filter.js';
import { UserDataModule } from './common/user-data/index.js';
import { createValidationPipe } from './common/validation.js';
import { ENV, type Env } from './config/env.js';
import { EnvModule } from './config/env.module.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthModule } from './health/health.module.js';
import { MailModule } from './mail/index.js';
import { AccountModule } from './modules/account/index.js';
import { AuthModule } from './modules/auth/index.js';
import { NotesModule } from './modules/notes/index.js';

/** BE-007 : masque les tokens d'URL (`?token=…`, `/reset-password/<token>`) dans les logs. */
export function redactUrlTokens<T extends { url?: string }>(request: T): T {
  if (!request.url) return request;
  const url = request.url
    .replace(/([?&]token=)[^&]+/g, '$1[redacted]')
    .replace(/(\/reset-password\/)[^/?]+/, '$1[redacted]');
  return { ...request, url };
}

@Module({
  imports: [
    EnvModule,
    SentryModule.forRoot(),
    // BE-007 : logs JSON structurés, avec l'identifiant de requête, sans données sensibles.
    LoggerModule.forRootAsync({
      inject: [ENV],
      useFactory: (env: Env) => ({
        pinoHttp: {
          level: env.LOG_LEVEL,
          transport: env.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
          redact: {
            paths: [
              'req.headers.authorization',
              'req.headers.cookie',
              'res.headers["set-cookie"]',
              'res.headers["set-auth-token"]',
            ],
            remove: true,
          },
          // Les liens de vérification et de réinitialisation portent un token dans l'URL.
          serializers: { req: redactUrlTokens },
          customProps: () => ({ version: env.APP_VERSION }),
        },
      }),
    }),
    // BE-006 : limitation de débit globale. Les routes d'authentification ont leurs propres limites (auth.config.ts).
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    DatabaseModule,
    MailModule,
    HealthModule,
    UserDataModule,
    AuthModule,
    AccountModule,
    NotesModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
    { provide: APP_PIPE, useFactory: createValidationPipe },
    { provide: APP_FILTER, useClass: ProblemDetailsFilter },
  ],
})
export class AppModule {}
