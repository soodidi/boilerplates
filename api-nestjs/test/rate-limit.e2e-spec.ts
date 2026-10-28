import { type NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { type InMemoryMailer } from '../src/mail/index.js';
import { createTestApp, signUpAndSignIn, WEB_ORIGIN } from './app.js';
import { createTestDatabase } from './database.js';

// BE-006 : rate limiting de Better Auth, stocké en base, par IP du client (actif comme en production).
describe('Auth rate limiting (e2e)', () => {
  const databaseUrl = inject('databaseUrl');
  const database = createTestDatabase(databaseUrl);
  let app: NestFastifyApplication;
  let mailer: InMemoryMailer;

  beforeAll(async () => {
    await database.reset();
    ({ app, mailer } = await createTestApp(databaseUrl, { AUTH_RATE_LIMIT: 'true' }));
  });

  afterAll(async () => {
    await app.close();
    await database.close();
  });

  const signIn = (ip: string) =>
    app.inject({
      method: 'POST',
      url: '/v1/auth/sign-in/email',
      headers: { 'x-forwarded-for': ip },
      payload: { email: 'nobody@example.com', password: 'wrong password, wrong' },
    });

  it('limits sign-in to 5 attempts per minute and per client IP', async () => {
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 6; attempt++)
      statuses.push((await signIn('203.0.113.1')).statusCode);

    expect(statuses.slice(0, 5)).not.toContain(429);
    expect(statuses[5]).toBe(429);
    // Un autre client n'est pas bloqué : les compteurs sont séparés par IP.
    expect((await signIn('203.0.113.2')).statusCode).not.toBe(429);
  });

  // GLB-013 : ressaisie du mot de passe depuis une session volée, peu d'essais.
  it('limits account deletion to 5 attempts per minute and per client IP', async () => {
    const { token } = await signUpAndSignIn(app, mailer, 'ada@example.com');
    const deleteUser = (ip: string) =>
      app.inject({
        method: 'POST',
        url: '/v1/auth/delete-user',
        headers: { authorization: `Bearer ${token}`, origin: WEB_ORIGIN, 'x-forwarded-for': ip },
        payload: { password: 'not the right password' },
      });

    const statuses: number[] = [];
    for (let attempt = 0; attempt < 6; attempt++)
      statuses.push((await deleteUser('203.0.113.3')).statusCode);

    expect(statuses.slice(0, 5)).toEqual([400, 400, 400, 400, 400]);
    expect(statuses[5]).toBe(429);
  });
});
