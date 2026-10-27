import helmet from '@fastify/helmet';
import { VersioningType } from '@nestjs/common';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { randomUUID } from 'node:crypto';
import { setupOpenApi } from './common/openapi.js';
import { CLIENT_IP_HEADER } from './common/client-ip.js';
import { ENV, type Env, loadEnv } from './config/env.js';

/**
 * Adaptateur Fastify : identifiant de requête repris de `x-request-id` ou généré (BE-007).
 * BE-006 : seuls les `TRUST_PROXY_HOPS` derniers proxys sont crus ; les entrées de X-Forwarded-For
 * ajoutées par le client sont ignorées, sinon il choisirait son IP face au rate limiting.
 */
export function createFastifyAdapter() {
  const hops = loadEnv(process.env).TRUST_PROXY_HOPS;
  return new FastifyAdapter({
    // `hop` 0 est l'adresse de la connexion, puis X-Forwarded-For lu de droite à gauche.
    trustProxy: (_address, hop) => hop < hops,
    requestIdHeader: 'x-request-id',
    genReqId: () => randomUUID(),
  });
}

/** Configuration commune à `main.ts` et aux tests e2e. */
export async function configureApp(app: NestFastifyApplication): Promise<Env> {
  const env = app.get<Env>(ENV);

  // BE-006 : Better Auth lit l'IP du client dans cet en-tête, toujours écrasé ici (jamais celui du client).
  app
    .getHttpAdapter()
    .getInstance()
    .addHook('onRequest', (request, _reply, done) => {
      request.headers[CLIENT_IP_HEADER] = request.ip;
      done();
    });

  // BE-006 : en-têtes de sécurité. La CSP stricte bloquerait Swagger UI, d'où l'exception pour /docs.
  await app.register(helmet, { contentSecurityPolicy: env.ENABLE_DOCS ? false : undefined });

  // BE-006 : liste blanche explicite des origines, jamais « * » avec credentials.
  app.enableCors({ origin: env.CORS_ORIGINS, credentials: true });

  // BE-004 : version majeure dans l'URL (/v1/...).
  app.enableVersioning({ type: VersioningType.URI });

  if (env.ENABLE_DOCS) setupOpenApi(app, env.APP_VERSION);

  return env;
}
