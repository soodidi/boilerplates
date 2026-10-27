import { Logger } from '@nestjs/common';
import { hash, verify } from '@node-rs/argon2';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { bearer } from 'better-auth/plugins';
import { v7 as uuidv7 } from 'uuid';
import { CLIENT_IP_HEADER } from '../../common/client-ip.js';
import { type Env } from '../../config/env.js';
import { type Database } from '../../database/database.module.js';
import {
  existingAccountEmail,
  type Mailer,
  resetPasswordEmail,
  verifyEmail,
} from '../../mail/index.js';
import { authSchema } from './auth.table.js';

const DAY_SECONDS = 24 * 60 * 60;

/** BE-006 : session de 30 jours, prolongée à l'usage (au plus une fois par jour)… */
export const SESSION_EXPIRES_IN_SECONDS = 30 * DAY_SECONDS;
export const SESSION_UPDATE_AGE_SECONDS = DAY_SECONDS;
/** … sans jamais dépasser 90 jours depuis la connexion. */
export const SESSION_MAX_LIFETIME_MS = 90 * DAY_SECONDS * 1000;

/** Préfixe des routes de Better Auth, dans la version 1 de l'API (BE-004). */
export const AUTH_BASE_PATH = '/v1/auth';

/** Recommandation OWASP pour Argon2id : 19 Mio, 2 passes, 1 fil. Argon2id est l'algorithme par défaut. */
const ARGON2_OPTIONS = { memoryCost: 19_456, timeCost: 2, parallelism: 1 };

/** Borne l'expiration d'une session prolongée à sa durée de vie absolue (BE-006). */
export function capSessionExpiry(expiresAt: Date, createdAt: Date): Date {
  const limit = new Date(createdAt.getTime() + SESSION_MAX_LIFETIME_MS);
  return expiresAt > limit ? limit : expiresAt;
}

type AuthDependencies = { env: Env; db: Database; mailer: Mailer };

/** BE-006 : configuration complète de Better Auth. Toute modification se relit avec l'ADR. */
export function createAuth({ env, db, mailer }: AuthDependencies) {
  const logger = new Logger('BetterAuth');
  const appName = env.APP_NAME;

  return betterAuth({
    appName,
    baseURL: env.BETTER_AUTH_URL,
    basePath: AUTH_BASE_PATH,
    secret: env.BETTER_AUTH_SECRET,
    // Liste, pas fonction : le module NestJS n'applique CORS sur Fastify qu'avec une liste.
    trustedOrigins: env.CORS_ORIGINS,
    database: drizzleAdapter(db, { provider: 'pg', usePlural: true, schema: authSchema }),
    advanced: {
      database: { generateId: () => uuidv7() },
      // IP du client pour le rate limiting et les sessions, calculée par Fastify (app.setup.ts).
      ipAddress: { ipAddressHeaders: [CLIENT_IP_HEADER] },
    },
    // BE-007 : au niveau info, Better Auth écrit l'adresse e-mail en clair. Les arguments
    // supplémentaires (données de la requête) ne sont jamais journalisés.
    logger: {
      level: 'warn',
      log: (level, message) => {
        if (level === 'error') logger.error(message);
        else logger.warn(message);
      },
    },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
      // Rend aussi la réponse d'inscription identique, que l'adresse existe ou non.
      requireEmailVerification: true,
      revokeSessionsOnPasswordReset: true,
      password: {
        hash: (password) => hash(password, ARGON2_OPTIONS),
        verify: ({ hash: digest, password }) => verify(digest, password),
      },
      sendResetPassword: ({ user, url }) => {
        mailer.send(resetPasswordEmail({ to: user.email, appName, url }));
        return Promise.resolve();
      },
      onExistingUserSignUp: ({ user }) => {
        mailer.send(existingAccountEmail({ to: user.email, appName, url: env.WEB_URL }));
        return Promise.resolve();
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: ({ user, url }) => {
        mailer.send(verifyEmail({ to: user.email, appName, url }));
        return Promise.resolve();
      },
    },
    session: {
      expiresIn: SESSION_EXPIRES_IN_SECONDS,
      updateAge: SESSION_UPDATE_AGE_SECONDS,
      // Pas de cache en cookie : une session révoquée est refusée immédiatement.
      cookieCache: { enabled: false },
    },
    databaseHooks: {
      session: {
        update: {
          // La session courante est chargée par getSession avant sa prolongation.
          before: (data, ctx) => {
            const createdAt = ctx?.context.session?.session.createdAt;
            if (data.expiresAt && !createdAt) {
              // Aucun chemin actuel de Better Auth : à revoir à chaque mise à jour de la librairie.
              logger.warn('Session extended without its creation date: lifetime cap not applied');
            }
            if (!data.expiresAt || !createdAt) return Promise.resolve();
            return Promise.resolve({
              data: { ...data, expiresAt: capSessionExpiry(new Date(data.expiresAt), createdAt) },
            });
          },
        },
      },
    },
    rateLimit: {
      // Actif hors développement et tests ; compteurs en base, partagés entre instances.
      enabled: env.NODE_ENV === 'production',
      storage: 'database',
      window: 60,
      max: 100,
      customRules: {
        '/sign-in/email': { window: 60, max: 5 },
        '/sign-up/email': { window: 60, max: 5 },
        '/request-password-reset': { window: 300, max: 3 },
        '/send-verification-email': { window: 300, max: 3 },
      },
    },
    // Mobile : token de session dans `Authorization: Bearer`, reçu signé dans `set-auth-token`.
    // Signature exigée : un token lu dans la table `sessions` ne suffit pas sans le secret.
    plugins: [bearer({ requireSignature: true })],
  });
}

export type Auth = ReturnType<typeof createAuth>;
