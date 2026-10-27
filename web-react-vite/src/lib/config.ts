import { z } from 'zod';

/**
 * Configuration d'exécution, lue dans /config.json au démarrage (OPS-004 : « build once, deploy many »).
 * Le pipeline de déploiement écrit un config.json différent par environnement.
 */
const configSchema = z
  .object({
    environment: z.enum(['development', 'staging', 'production']),
    /** URL de l'API sans slash final. Vide = même origine. */
    apiUrl: z.union([z.literal(''), z.url()]),
    /** DSN Sentry (public par nature, FE-009). Vide = Sentry désactivé. */
    sentryDsn: z.string().default(''),
    /** Active les mocks MSW (développement et E2E uniquement). */
    enableMocks: z.boolean().default(false),
  })
  .refine((config) => !(config.environment === 'production' && config.enableMocks), {
    message: 'enableMocks est interdit en production',
  });

export type AppConfig = z.infer<typeof configSchema>;

export async function loadConfig(): Promise<AppConfig> {
  const response = await fetch('/config.json', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Impossible de charger /config.json (HTTP ${response.status})`);
  }
  // GLB-005 : l'app refuse de démarrer avec une configuration invalide.
  const result = configSchema.safeParse(await response.json());
  if (!result.success) {
    throw new Error(`config.json invalide :\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
