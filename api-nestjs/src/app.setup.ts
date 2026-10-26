import helmet from '@fastify/helmet';
import { VersioningType } from '@nestjs/common';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { randomUUID } from 'node:crypto';
import { setupOpenApi } from './common/openapi.js';
import { ENV, type Env } from './config/env.js';

/** Adaptateur Fastify : identifiant de requête repris de `x-request-id` ou généré (BE-007). */
export function createFastifyAdapter() {
  return new FastifyAdapter({
    trustProxy: true,
    requestIdHeader: 'x-request-id',
    genReqId: () => randomUUID(),
  });
}

/** Configuration commune à `main.ts` et aux tests e2e. */
export async function configureApp(app: NestFastifyApplication): Promise<Env> {
  const env = app.get<Env>(ENV);

  // BE-006 : en-têtes de sécurité. La CSP stricte bloquerait Swagger UI, d'où l'exception pour /docs.
  await app.register(helmet, { contentSecurityPolicy: env.ENABLE_DOCS ? false : undefined });

  // BE-006 : liste blanche explicite des origines, jamais « * » avec credentials.
  app.enableCors({ origin: env.CORS_ORIGINS, credentials: true });

  // BE-004 : version majeure dans l'URL (/v1/...).
  app.enableVersioning({ type: VersioningType.URI });

  if (env.ENABLE_DOCS) setupOpenApi(app, env.APP_VERSION);

  return env;
}
