import { type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module.js';
import { configureApp, createFastifyAdapter } from '../src/app.setup.js';
import { InMemoryMailer, Mailer } from '../src/mail/index.js';

export const WEB_ORIGIN = 'http://localhost:5173';

/** L'API complète, comme en production, avec les e-mails gardés en mémoire. */
export async function createTestApp(databaseUrl: string) {
  Object.assign(process.env, {
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
    DATABASE_URL: databaseUrl,
    ENABLE_DOCS: 'false',
    CORS_ORIGINS: WEB_ORIGIN,
    SMTP_URL: 'smtp://localhost:1025',
    MAIL_FROM: 'Test <noreply@localhost>',
    BETTER_AUTH_SECRET: 'test-secret-with-at-least-32-characters',
    BETTER_AUTH_URL: 'http://localhost:3000',
    WEB_URL: WEB_ORIGIN,
  });
  const mailer = new InMemoryMailer();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(Mailer)
    .useValue(mailer)
    .compile();
  const app = moduleRef.createNestApplication<NestFastifyApplication>(createFastifyAdapter(), {
    bodyParser: false,
  });
  await configureApp(app);
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return { app, mailer };
}

export const PASSWORD = 'correct horse battery staple';

/** Lien contenu dans un e-mail, réduit à son chemin pour `app.inject`. */
export function linkPath(text: string): string {
  const match = /https?:\/\/\S+/.exec(text);
  if (!match) throw new Error('No link in email');
  const url = new URL(match[0]);
  return `${url.pathname}${url.search}`;
}

/** Inscription, vérification de l'adresse via l'e-mail reçu, puis connexion. */
export async function signUpAndSignIn(
  app: NestFastifyApplication,
  mailer: InMemoryMailer,
  email: string,
) {
  const signUp = await app.inject({
    method: 'POST',
    url: '/v1/auth/sign-up/email',
    payload: { email, password: PASSWORD, name: email.split('@')[0] },
  });
  if (signUp.statusCode !== 200) throw new Error(`Sign-up failed: ${signUp.body}`);

  const verification = mailer.lastTo(email);
  if (verification?.template !== 'verify-email') throw new Error('No verification email');
  await app.inject({ method: 'GET', url: linkPath(verification.text) });

  return signIn(app, email);
}

export async function signIn(app: NestFastifyApplication, email: string, password = PASSWORD) {
  const response = await app.inject({
    method: 'POST',
    url: '/v1/auth/sign-in/email',
    payload: { email, password },
  });
  if (response.statusCode !== 200) throw new Error(`Sign-in failed: ${response.body}`);
  const token = response.headers['set-auth-token'];
  if (typeof token !== 'string') throw new Error('No set-auth-token header');
  const setCookie = response.headers['set-cookie'];
  const cookie = (Array.isArray(setCookie) ? setCookie : [setCookie ?? ''])
    .map((value) => value.split(';')[0])
    .join('; ');
  return { token, cookie };
}
