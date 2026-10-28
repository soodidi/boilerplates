import { NestFactory } from '@nestjs/core';
import * as Sentry from '@sentry/nestjs';
import { type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module.js';
import { configureApp, createFastifyAdapter } from './app.setup.js';
import { runMigrations } from './database/run-migrations.js';

const app = await NestFactory.create<NestFastifyApplication>(AppModule, createFastifyAdapter(), {
  bufferLogs: true,
  // BE-006 : Better Auth lit le corps brut de ses routes ; le module réinstalle les parseurs ailleurs.
  bodyParser: false,
});
app.useLogger(app.get(Logger));

const env = await configureApp(app);

// BE-003 / OPS-004 : migrations avant d'accepter du trafic, sous verrou entre instances.
// Si elles échouent, le processus s'arrête : /health/ready ne répond jamais et la plateforme
// garde l'ancienne version en service.
const logger = app.get(Logger);
logger.log('Applying database migrations', 'Migrations');
try {
  await runMigrations(env.DATABASE_URL);
} catch (error) {
  // Dans les logs JSON et dans Sentry, plutôt qu'une pile brute sur stderr.
  logger.error({ err: error }, 'Database migrations failed', 'Migrations');
  Sentry.captureException(error);
  await Sentry.flush(2000);
  await app.close();
  process.exit(1);
}
logger.log('Database migrations applied', 'Migrations');

// BE-007 : arrêt propre sur SIGTERM (requêtes en cours terminées, connexions fermées).
app.enableShutdownHooks();

await app.listen(env.PORT, '0.0.0.0');
