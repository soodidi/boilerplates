import { type NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, inject, it } from 'vitest';
import { type InMemoryMailer } from '../src/mail/index.js';
import { UsersService } from '../src/modules/auth/index.js';
import { createTestApp, PASSWORD, signUpAndSignIn } from './app.js';
import { createTestDatabase } from './database.js';

// BE-010 : rôles et permissions, appliqués par l'API contre une vraie base.
describe('Roles and permissions (e2e)', () => {
  const databaseUrl = inject('databaseUrl');
  const database = createTestDatabase(databaseUrl);
  let app: NestFastifyApplication;
  let mailer: InMemoryMailer;
  let user: { authorization: string };
  let admin: { authorization: string };

  beforeAll(async () => {
    ({ app, mailer } = await createTestApp(databaseUrl));
  });

  beforeEach(async () => {
    await database.reset();
    user = bearer(await signUpAndSignIn(app, mailer, 'ada@example.com'));
    const adminSession = await signUpAndSignIn(app, mailer, 'grace@example.com');
    // Comme `npm run user:promote` ; le rôle s'applique à la requête suivante (pas de cache de session).
    expect(await app.get(UsersService).promoteToAdmin(' Grace@Example.com ')).toBe(true);
    admin = bearer(adminSession);
  });

  afterAll(async () => {
    await app.close();
    await database.close();
  });

  function bearer({ token }: { token: string }) {
    return { authorization: `Bearer ${token}` };
  }

  describe('GET /v1/admin/stats (@UserHasPermission stats:read)', () => {
    it('requires authentication (401 Problem Details)', async () => {
      const response = await app.inject({ method: 'GET', url: '/v1/admin/stats' });

      expect(response.statusCode).toBe(401);
      expect(response.headers['content-type']).toContain('application/problem+json');
    });

    it('refuses a user without the permission (403 Problem Details)', async () => {
      const response = await app.inject({ method: 'GET', url: '/v1/admin/stats', headers: user });

      expect(response.statusCode).toBe(403);
      expect(response.headers['content-type']).toContain('application/problem+json');
      expect(response.json()).toMatchObject({ status: 403 });
    });

    it('returns counts only to an admin', async () => {
      await app.inject({
        method: 'POST',
        url: '/v1/notes',
        headers: user,
        payload: { title: 'secret of ada' },
      });

      const response = await app.inject({ method: 'GET', url: '/v1/admin/stats', headers: admin });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ users: 2, notes: 1 });
    });
  });

  describe('account administration (/v1/auth/admin/*)', () => {
    it('exposes the role in the session', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/auth/get-session',
        headers: admin,
      });

      expect(response.json<{ user: { role: string } }>().user.role).toBe('admin');
    });

    it('refuses a user and serves an admin', async () => {
      const refused = await app.inject({
        method: 'GET',
        url: '/v1/auth/admin/list-users',
        headers: user,
      });
      const served = await app.inject({
        method: 'GET',
        url: '/v1/auth/admin/list-users',
        headers: admin,
      });

      expect(refused.statusCode).toBe(403);
      expect(served.statusCode).toBe(200);
      expect(served.json<{ total: number }>().total).toBe(2);
    });

    it('keeps impersonation and deletion by an admin closed', async () => {
      const userId = await database.userId('ada@example.com');
      for (const path of ['impersonate-user', 'remove-user']) {
        const response = await app.inject({
          method: 'POST',
          url: `/v1/auth/admin/${path}`,
          headers: admin,
          payload: { userId },
        });
        expect(response.statusCode, path).toBe(404);
      }
    });

    it('a banned user loses their session and cannot sign in again', async () => {
      const userId = await database.userId('ada@example.com');
      const ban = await app.inject({
        method: 'POST',
        url: '/v1/auth/admin/ban-user',
        headers: admin,
        payload: { userId, banReason: 'spam' },
      });
      expect(ban.statusCode).toBe(200);

      const notes = await app.inject({ method: 'GET', url: '/v1/notes', headers: user });
      const signIn = await app.inject({
        method: 'POST',
        url: '/v1/auth/sign-in/email',
        payload: { email: 'ada@example.com', password: PASSWORD },
      });

      expect(notes.statusCode).toBe(401);
      expect(signIn.statusCode).toBe(403);
    });

    it('a user cannot promote themselves', async () => {
      const userId = await database.userId('ada@example.com');
      const response = await app.inject({
        method: 'POST',
        url: '/v1/auth/admin/set-role',
        headers: user,
        payload: { userId, role: 'admin' },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  it('promoting an unknown address changes nothing', async () => {
    expect(await app.get(UsersService).promoteToAdmin('nobody@example.com')).toBe(false);
  });
});
