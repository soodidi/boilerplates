import { Module } from '@nestjs/common';
import { AuthModule as BetterAuthModule } from '@thallesp/nestjs-better-auth';
import { ENV, type Env } from '../../config/env.js';
import { DB, type Database } from '../../database/database.module.js';
import { Mailer } from '../../mail/index.js';
import { createAuth } from './auth.config.js';

/**
 * BE-006 : routes Better Auth sous /v1/auth et guard global.
 * Toute route est protégée ; `@Public()` ouvre explicitement une route.
 */
@Module({
  imports: [
    BetterAuthModule.forRootAsync({
      inject: [ENV, DB, Mailer],
      useFactory: (env: Env, db: Database, mailer: Mailer) => ({
        auth: createAuth({ env, db, mailer }),
      }),
    }),
  ],
})
export class AuthModule {}
