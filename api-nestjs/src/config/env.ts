import { z } from 'zod';

/** Booléen lu depuis une variable d'environnement (`z.coerce.boolean()` lit "false" comme vrai). */
const envBoolean = z
  .enum(['true', 'false', '1', '0', ''])
  .transform((value) => value === 'true' || value === '1');

const LOCAL_SMTP_HOSTS = new Set(['localhost', '127.0.0.1', 'mailpit']);

/** GLB-005 / BE-005 : toute la configuration est décrite et validée ici. */
export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
    CORS_ORIGINS: z
      .string()
      .default('')
      .transform((value) =>
        value
          .split(',')
          .map((origin) => origin.trim())
          .filter(Boolean),
      )
      .pipe(z.array(z.url())),
    ENABLE_DOCS: envBoolean.default(false),
    // BE-006 : Better Auth. Le secret signe les cookies : 32 caractères au moins, propre à chaque environnement.
    APP_NAME: z.string().min(1).default('Mon app'),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    // Rate limiting de Better Auth : actif en production par défaut ; forçable pour les tests.
    AUTH_RATE_LIMIT: envBoolean.optional(),
    WEB_URL: z.url(),
    // BE-009 : serveur SMTP (Mailpit en local, Scaleway TEM en staging et production).
    SMTP_URL: z.url({ protocol: /^smtps?$/ }),
    // Autorise SMTP sans TLS avec NODE_ENV=production : Mailpit dans `npm run stack` uniquement.
    SMTP_INSECURE: envBoolean.default(false),
    MAIL_FROM: z.string().min(1),
    // Staging : seules ces adresses reçoivent des e-mails. Vide = tous les destinataires.
    MAIL_ALLOWED_RECIPIENTS: z
      .string()
      .default('')
      .transform((value) =>
        value
          .split(',')
          .map((email) => email.trim().toLowerCase())
          .filter(Boolean),
      )
      .pipe(z.array(z.email())),
    // BE-010 : comptes nommés administrateurs à chaque démarrage (adresse vérifiée exigée).
    // La liste vient de la configuration de l'environnement (OpenTofu), jamais d'une requête.
    ADMIN_EMAILS: z
      .string()
      .default('')
      .transform((value) => [
        ...new Set(
          value
            .split(',')
            .map((email) => email.trim().toLowerCase())
            .filter(Boolean),
        ),
      ])
      .pipe(z.array(z.email()).max(5)),
    APP_VERSION: z.string().default('dev'),
    // BE-006 : nombre de proxys de confiance devant l'API (1 = l'Envoy de Scaleway Serverless Containers).
    // L'IP du client est la dernière entrée de X-Forwarded-For ajoutée par ce proxy.
    TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(1),
  })
  // BE-009 : SMTP sans TLS seulement vers un Mailpit local (sans identifiants). Un vrai serveur
  // (TEM a toujours des identifiants) exige TLS : sinon la clé et les liens d'auth passeraient en clair.
  .superRefine((env, context) => {
    if (!env.SMTP_INSECURE) return;
    const url = new URL(env.SMTP_URL);
    if (url.username || !LOCAL_SMTP_HOSTS.has(url.hostname)) {
      context.addIssue({
        code: 'custom',
        path: ['SMTP_INSECURE'],
        message:
          'SMTP_INSECURE est réservé à Mailpit en local (localhost ou mailpit, sans identifiants)',
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

/** Jeton d'injection de la configuration validée : `constructor(@Inject(ENV) env: Env)`. */
export const ENV = Symbol('ENV');

/** L'application refuse de démarrer si la configuration est invalide (GLB-005). */
export function loadEnv(source: NodeJS.ProcessEnv): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    throw new Error(`Configuration invalide :\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
