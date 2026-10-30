import { type NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, inject, it } from 'vitest';
import { type InMemoryMailer } from '../src/mail/index.js';
import { ADMIN_DISABLED_PATHS, ADMIN_OPEN_PATHS } from '../src/modules/auth/access-control.js';
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
    /** Méthode et charge de chaque route ouverte, pour un compte cible. */
    function request(path: string, userId: string) {
      const get = path === '/admin/list-users' || path === '/admin/get-user';
      return {
        method: get ? ('GET' as const) : ('POST' as const),
        url: `/v1/auth${path}${path === '/admin/get-user' ? `?id=${userId}` : ''}`,
        payload: get ? undefined : { userId, role: 'user' },
      };
    }

    it('exposes the role in the session', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/auth/get-session',
        headers: admin,
      });

      expect(response.json<{ user: { role: string } }>().user.role).toBe('admin');
    });

    it.each(ADMIN_OPEN_PATHS)(
      '%s refuses a user (403) and an anonymous request (401)',
      async (path) => {
        const userId = await database.userId('ada@example.com');

        const refused = await app.inject({ ...request(path, userId), headers: user });
        const anonymous = await app.inject(request(path, userId));

        expect(refused.statusCode).toBe(403);
        expect(anonymous.statusCode).toBe(401);
      },
    );

    it.each(ADMIN_OPEN_PATHS.filter((path) => path !== '/admin/list-users'))(
      '%s answers 400 to a malformed user id',
      async (path) => {
        const response = await app.inject({ ...request(path, 'not-a-uuid'), headers: admin });

        expect(response.statusCode).toBe(400);
      },
    );

    it('serves an admin', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/auth/admin/list-users',
        headers: admin,
      });

      expect(response.statusCode).toBe(200);
      expect(response.json<{ total: number }>().total).toBe(2);
    });

    describe('POST /v1/auth/admin/has-permission (ADMIN_SELF_PATHS)', () => {
      const payload = { permissions: { stats: ['read'] } };

      it('requires authentication (401)', async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/v1/auth/admin/has-permission',
          payload,
        });

        expect(response.statusCode).toBe(401);
      });

      it('answers for the session only, whatever role or user id the body names', async () => {
        const adminId = await database.userId('grace@example.com');

        const forUser = await app.inject({
          method: 'POST',
          url: '/v1/auth/admin/has-permission',
          headers: user,
          payload: { ...payload, role: 'admin', userId: adminId },
        });
        const forAdmin = await app.inject({
          method: 'POST',
          url: '/v1/auth/admin/has-permission',
          headers: admin,
          payload,
        });

        expect(forUser.statusCode).toBe(200);
        expect(forUser.json()).toMatchObject({ success: false });
        expect(forAdmin.json()).toMatchObject({ success: true });
      });
    });

    it.each(ADMIN_DISABLED_PATHS)('%s stays closed, even to an admin (404)', async (path) => {
      const userId = await database.userId('ada@example.com');

      const response = await app.inject({
        method: 'POST',
        url: `/v1/auth${path}`,
        headers: admin,
        payload: { userId, email: 'mallory@example.com', password: 'short', name: 'Mallory' },
      });

      expect(response.statusCode).toBe(404);
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
      const signIn = (password: string) =>
        app.inject({
          method: 'POST',
          url: '/v1/auth/sign-in/email',
          payload: { email: 'ada@example.com', password },
        });
      const right = await signIn(PASSWORD);
      // Le bannissement n'est révélé qu'avec le bon mot de passe : pas d'énumération.
      const wrong = await signIn('wrong password, long enough');

      expect(notes.statusCode).toBe(401);
      expect(right.statusCode).toBe(403);
      expect(right.json()).toMatchObject({ code: 'BANNED_USER' });
      expect(wrong.statusCode).toBe(401);
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
      expect(await database.role('ada@example.com')).toBe('user');
    });

    it('refuses an unknown role', async () => {
      const userId = await database.userId('ada@example.com');
      const response = await app.inject({
        method: 'POST',
        url: '/v1/auth/admin/set-role',
        headers: admin,
        payload: { userId, role: 'superadmin' },
      });

      expect(response.statusCode).toBe(400);
      expect(await database.role('ada@example.com')).toBe('user');
    });

    it('a demoted admin is refused from the next request', async () => {
      const userId = await database.userId('grace@example.com');
      const demote = await app.inject({
        method: 'POST',
        url: '/v1/auth/admin/set-role',
        headers: admin,
        payload: { userId, role: 'user' },
      });
      expect(demote.statusCode).toBe(200);

      const response = await app.inject({ method: 'GET', url: '/v1/admin/stats', headers: admin });

      expect(response.statusCode).toBe(403);
    });
  });

  it('promotes only a verified address, and lifts a ban', async () => {
    await app.inject({
      method: 'POST',
      url: '/v1/auth/sign-up/email',
      payload: { email: 'mallory@example.com', password: PASSWORD, name: 'Mallory' },
    });
    const userId = await database.userId('ada@example.com');
    await app.inject({
      method: 'POST',
      url: '/v1/auth/admin/ban-user',
      headers: admin,
      payload: { userId },
    });

    const users = app.get(UsersService);
    // Inscrit d'avance avec l'adresse du futur admin, sans l'avoir confirmée : rien.
    expect(await users.promoteToAdmin('mallory@example.com')).toBe(false);
    expect(await database.role('mallory@example.com')).toBe('user');
    expect(await users.promoteToAdmin('ada@example.com')).toBe(true);
    const signIn = await app.inject({
      method: 'POST',
      url: '/v1/auth/sign-in/email',
      payload: { email: 'ada@example.com', password: PASSWORD },
    });
    expect(signIn.statusCode).toBe(200);
  });

  it('promoting an unknown address changes nothing', async () => {
    expect(await app.get(UsersService).promoteToAdmin('nobody@example.com')).toBe(false);
  });
});
