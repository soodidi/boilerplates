import { NestFactory } from '@nestjs/core';
import { type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module.js';
import { configureApp, createFastifyAdapter } from './app.setup.js';

const app = await NestFactory.create<NestFastifyApplication>(AppModule, createFastifyAdapter(), {
  bufferLogs: true,
});
app.useLogger(app.get(Logger));

const env = await configureApp(app);

// BE-007 : arrêt propre sur SIGTERM (requêtes en cours terminées, connexions fermées).
app.enableShutdownHooks();

await app.listen(env.PORT, '0.0.0.0');
