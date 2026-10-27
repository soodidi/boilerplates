import { z } from 'zod';

/** Booléen lu depuis une variable d'environnement (`z.coerce.boolean()` lit "false" comme vrai). */
const envBoolean = z
  .enum(['true', 'false', '1', '0', ''])
  .transform((value) => value === 'true' || value === '1');

/** GLB-005 / BE-005 : toute la configuration est décrite et validée ici. */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
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
  // BE-009 : serveur SMTP (Mailpit en local, Scaleway TEM en staging et production).
  SMTP_URL: z.url({ protocol: /^smtps?$/ }),
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
  APP_VERSION: z.string().default('dev'),
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
