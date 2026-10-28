import { Module } from '@nestjs/common';
import { AuthModule as BetterAuthModule } from '@thallesp/nestjs-better-auth';
import { UserDataRegistry } from '../../common/user-data/index.js';
import { ENV, type Env } from '../../config/env.js';
import { DB, type Database } from '../../database/database.module.js';
import { Mailer } from '../../mail/index.js';
import { createAuth } from './auth.config.js';
import { AuthRepository } from './auth.repository.js';
import { AuthUserData } from './auth.user-data.js';

/**
 * BE-006 : routes Better Auth sous /v1/auth et guard global.
 * Toute route est protégée ; `@Public()` ouvre explicitement une route.
 */
@Module({
  imports: [
    BetterAuthModule.forRootAsync({
      inject: [ENV, DB, Mailer, UserDataRegistry],
      useFactory: (env: Env, db: Database, mailer: Mailer, userData: UserDataRegistry) => ({
        auth: createAuth({ env, db, mailer, userData }),
      }),
    }),
  ],
  providers: [AuthRepository, AuthUserData],
})
export class AuthModule {}
