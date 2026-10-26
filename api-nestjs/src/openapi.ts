// BE-004 : exporte la spec OpenAPI (openapi.json) pour la CI et la génération des clients.
// Usage : npm run build && npm run openapi (DATABASE_URL requis mais aucune connexion n'est ouverte).
import { writeFile } from 'node:fs/promises';
import { NestFactory } from '@nestjs/core';
import { type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module.js';
import { configureApp, createFastifyAdapter } from './app.setup.js';
import { createOpenApiDocument } from './common/openapi.js';

const app = await NestFactory.create<NestFastifyApplication>(AppModule, createFastifyAdapter(), {
  logger: false,
  abortOnError: false, // sinon Nest quitte sans afficher l'erreur (ex : variable d'env manquante)
});
const env = await configureApp(app);
const document = createOpenApiDocument(app, env.APP_VERSION);
await writeFile('openapi.json', `${JSON.stringify(document, null, 2)}\n`);
await app.close();
process.stdout.write('openapi.json écrit.\n');
