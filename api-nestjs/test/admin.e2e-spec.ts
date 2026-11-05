import { Logger } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { signJWT } from 'better-auth/crypto';
import { sql } from 'drizzle-orm';
import { type NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, inject, it, vi } from 'vitest';
import { type InMemoryMailer } from '../src/mail/index.js';
import {
  ADMIN_DISABLED_PATHS,
  ADMIN_OPEN_PATHS,
  ADMIN_SELF_PATHS,
} from '../src/modules/auth/access-control.js';
import { UsersService } from '../src/modules/auth/index.js';
import { createTestApp, PASSWORD, signUpAndSignIn, TEST_AUTH_SECRET } from './app.js';
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
    // Comme la liste ADMIN_EMAILS au démarrage ; le rôle s'applique à la requête suivante (pas de cache de session).
    expect(await app.get(UsersService).promoteToAdmin(' Grace@Example.com ')).not.toBeNull();
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

  // GLB-013 : un compte suspendu ne peut plus exporter ni effacer ses données ; l'admin le fait.
  describe('data of a suspended account (/v1/admin/users/:id)', () => {
    async function suspendAda() {
      const userId = await database.userId('ada@example.com');
      const ban = await app.inject({
        method: 'POST',
        url: '/v1/auth/admin/ban-user',
        headers: admin,
        payload: { userId },
      });
      expect(ban.statusCode).toBe(200);
      return userId;
    }

    it.each([
      ['GET', 'export'],
      ['POST', 'erase'],
    ] as const)(
      'refuses %s %s without session (401), to a user (403), on a bad id (400), without logging',
      async (method, suffix) => {
        const log = vi.spyOn(Logger.prototype, 'log');
        const ada = await database.userId('ada@example.com');
        const grace = await database.userId('grace@example.com');
        // L'export est limité à 5 par minute et les compteurs sont partagés en e2e : une IP par appel.
        let call = 0;
        const status = async (id: string, headers: Record<string, string> = {}) => {
          call += 1;
          const ip = `198.51.100.${(method === 'GET' ? 0 : 50) + call}`;
          const response = await app.inject({
            method,
            url: `/v1/admin/users/${id}/${suffix}`,
            headers: { ...headers, 'x-forwarded-for': ip },
            payload: method === 'POST' ? { password: PASSWORD } : undefined,
          });
          return response.statusCode;
        };

        expect(await status(ada)).toBe(401);
        expect(await status(ada, user)).toBe(403);
        expect(await status('not-a-uuid', admin)).toBe(400);
        expect(await status('01900000-0000-7000-8000-000000000000', admin)).toBe(404);
        // Compte non suspendu, puis admin (géré par la configuration).
        expect(await status(ada, admin)).toBe(409);
        expect(await status(grace, admin)).toBe(403);
        expect(await database.role('ada@example.com')).toBe('user');
        // Une action refusée n'est pas journalisée.
        expect(log.mock.calls.filter(([, message]) => message === 'Admin action')).toEqual([]);
        log.mockRestore();
      },
    );

    it('treats an expired suspension as no suspension (409)', async () => {
      const ada = await suspendAda();
      await database.db.execute(
        sql`update users set ban_expires = now() - interval '1 minute' where id = ${ada}`,
      );

      const response = await app.inject({
        method: 'POST',
        url: `/v1/admin/users/${ada}/erase`,
        headers: admin,
        payload: { password: PASSWORD },
      });

      expect(response.statusCode).toBe(409);
      await expect(database.userId('ada@example.com')).resolves.toBe(ada);
    });

    it('requires the admin password to erase (400 when missing or wrong)', async () => {
      const ada = await suspendAda();

      for (const payload of [{}, { password: '' }, { password: 'not the password' }]) {
        const response = await app.inject({
          method: 'POST',
          url: `/v1/admin/users/${ada}/erase`,
          headers: { ...admin, 'x-forwarded-for': '198.51.100.200' },
          payload,
        });
        expect(response.statusCode).toBe(400);
      }
      await expect(database.userId('ada@example.com')).resolves.toBe(ada);
    });

    it('exports the data of a suspended account, like « Mon compte »', async () => {
      await app.inject({
        method: 'POST',
        url: '/v1/notes',
        headers: user,
        payload: { title: 'note of ada' },
      });
      const ada = await suspendAda();
      const log = vi.spyOn(Logger.prototype, 'log');
      try {
        const response = await app.inject({
          method: 'GET',
          url: `/v1/admin/users/${ada}/export`,
          headers: { ...admin, 'x-forwarded-for': '203.0.113.12' },
        });

        expect(response.statusCode).toBe(200);
        expect(response.headers['content-disposition']).toContain('account-export.json');
        const body = response.json<{
          data: { account: { user: { email: string } }; notes: unknown[] };
        }>();
        expect(body.data.account.user.email).toBe('ada@example.com');
        expect(body.data.notes).toHaveLength(1);
        const grace = await database.userId('grace@example.com');
        expect(log).toHaveBeenCalledWith(
          { action: 'user.data_exported', actorId: grace, targetId: ada },
          'Admin action',
        );
      } finally {
        log.mockRestore();
      }
    });

    it('erases a suspended account and all its data', async () => {
      await app.inject({
        method: 'POST',
        url: '/v1/notes',
        headers: user,
        payload: { title: 'note of ada' },
      });
      const ada = await suspendAda();

      const log = vi.spyOn(Logger.prototype, 'log');

      const response = await app.inject({
        method: 'POST',
        url: `/v1/admin/users/${ada}/erase`,
        headers: admin,
        payload: { password: PASSWORD },
      });

      expect(response.statusCode).toBe(204);
      const grace = await database.userId('grace@example.com');
      expect(log).toHaveBeenCalledWith(
        { action: 'user.erased', actorId: grace, targetId: ada },
        'Admin action',
      );
      log.mockRestore();
      await expect(database.userId('ada@example.com')).rejects.toThrow();
      const stats = await app.inject({ method: 'GET', url: '/v1/admin/stats', headers: admin });
      expect(stats.json()).toEqual({ users: 1, notes: 0 });
      const signIn = await app.inject({
        method: 'POST',
        url: '/v1/auth/sign-in/email',
        payload: { email: 'ada@example.com', password: PASSWORD },
      });
      expect(signIn.statusCode).toBe(401);
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

    describe('routes open to any session (ADMIN_SELF_PATHS)', () => {
      const payload = { permissions: { stats: ['read'] } };

      it.each(ADMIN_SELF_PATHS)(
        '%s requires a session, whatever role the body names (401)',
        async (path) => {
          const response = await app.inject({
            method: 'POST',
            url: `/v1/auth${path}`,
            payload: { ...payload, role: 'admin' },
          });

          expect(response.statusCode).toBe(401);
        },
      );

      it('has-permission answers for the session only, whatever role or user id the body names', async () => {
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
        expect(forAdmin.statusCode).toBe(200);
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

    it('logs each successful admin action with ids only (BE-007)', async () => {
      const log = vi.spyOn(Logger.prototype, 'log');
      try {
        const target = await database.userId('ada@example.com');
        const actor = await database.userId('grace@example.com');

        for (const path of [
          '/admin/ban-user',
          '/admin/unban-user',
          '/admin/revoke-user-sessions',
        ]) {
          const response = await app.inject({
            method: 'POST',
            url: `/v1/auth${path}`,
            headers: admin,
            payload: { userId: target },
          });
          expect(response.statusCode).toBe(200);
        }

        const actions = log.mock.calls.filter(([, message]) => message === 'Admin action');
        expect(actions.map(([entry]): unknown => entry)).toEqual([
          { action: 'user.banned', actorId: actor, targetId: target },
          { action: 'user.unbanned', actorId: actor, targetId: target },
          { action: 'user.sessions_revoked', actorId: actor, targetId: target },
        ]);
        expect(JSON.stringify(actions)).not.toContain('@');
      } finally {
        log.mockRestore();
      }
    });

    it('never logs a refused admin action, whatever refuses it', async () => {
      const log = vi.spyOn(Logger.prototype, 'log');
      try {
        const target = await database.userId('ada@example.com');
        const refused = [
          // Compte ordinaire : refus du plugin (403).
          { headers: user, payload: { userId: await database.userId('grace@example.com') } },
          { headers: user, payload: { userId: target } },
          // Corps invalide : erreur de validation (400), qui n'est pas une APIError du core.
          { headers: admin, payload: { userId: target, banReason: 42 } },
          // Sans session (401).
          { headers: {}, payload: { userId: target } },
        ];
        for (const { headers, payload } of refused) {
          const response = await app.inject({
            method: 'POST',
            url: '/v1/auth/admin/ban-user',
            headers,
            payload,
          });
          expect(response.statusCode).toBeGreaterThanOrEqual(400);
        }

        expect(log.mock.calls.filter(([, message]) => message === 'Admin action')).toEqual([]);
      } finally {
        log.mockRestore();
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

    it('never lets an admin ban another admin or cut their sessions (403)', async () => {
      // Deux admins : grace (session `admin`) et ada, nommée comme le ferait la liste.
      expect(await app.get(UsersService).promoteToAdmin('ada@example.com')).not.toBeNull();
      const ada = await database.userId('ada@example.com');

      for (const path of ['/admin/ban-user', '/admin/revoke-user-sessions']) {
        const response = await app.inject({
          method: 'POST',
          url: `/v1/auth${path}`,
          headers: admin,
          payload: { userId: ada },
        });
        expect(response.statusCode).toBe(403);
        expect(response.json()).toMatchObject({ message: 'Admins are managed by configuration' });
        // Sans session : 401, comme pour un compte ordinaire (rien ne trahit un admin).
        const anonymous = await app.inject({
          method: 'POST',
          url: `/v1/auth${path}`,
          payload: { userId: ada },
        });
        expect(anonymous.statusCode).toBe(401);
      }
      // ada garde sa session et son accès.
      const stats = await app.inject({ method: 'GET', url: '/v1/admin/stats', headers: user });
      expect(stats.statusCode).toBe(200);
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
    expect(await users.promoteToAdmin('mallory@example.com')).toBeNull();
    expect(await database.role('mallory@example.com')).toBe('user');
    expect(await users.promoteToAdmin('ada@example.com')).not.toBeNull();
    const signIn = await app.inject({
      method: 'POST',
      url: '/v1/auth/sign-in/email',
      payload: { email: 'ada@example.com', password: PASSWORD },
    });
    expect(signIn.statusCode).toBe(200);
  });

  it('promoting an unknown address changes nothing', async () => {
    expect(await app.get(UsersService).promoteToAdmin('nobody@example.com')).toBeNull();
  });

  describe('admins named by the configuration (ADMIN_EMAILS)', () => {
    function signIn(email: string) {
      return app.inject({
        method: 'POST',
        url: '/v1/auth/sign-in/email',
        payload: { email, password: PASSWORD },
      });
    }

    /** Redémarrage de l'API avec la liste (casse et espaces comme dans un fichier de configuration). */
    async function restartWith(ADMIN_EMAILS: string) {
      const restarted = await createTestApp(databaseUrl, { ADMIN_EMAILS });
      await restarted.app.close();
    }

    async function banAda() {
      const ban = await app.inject({
        method: 'POST',
        url: '/v1/auth/admin/ban-user',
        headers: admin,
        payload: { userId: await database.userId('ada@example.com') },
      });
      expect(ban.statusCode).toBe(200);
      expect((await signIn('ada@example.com')).statusCode).toBe(403);
    }

    it('demotes admins missing from the list, and cuts their sessions', async () => {
      await restartWith('ada@example.com');

      expect(await database.role('grace@example.com')).toBe('user');
      const stats = await app.inject({ method: 'GET', url: '/v1/admin/stats', headers: admin });
      expect(stats.statusCode).toBe(401);
    });

    it('demotes a multi-value role outside the list (the plugin reads "user,admin" as admin)', async () => {
      await database.db.execute(
        sql`update users set role = 'user,admin' where email = 'ada@example.com'`,
      );

      await restartWith('grace@example.com');

      expect(await database.role('ada@example.com')).toBe('user');
      const stats = await app.inject({ method: 'GET', url: '/v1/admin/stats', headers: user });
      expect(stats.statusCode).toBe(401);
    });

    it('promotes listed verified accounts at startup, and only them', async () => {
      await app.inject({
        method: 'POST',
        url: '/v1/auth/sign-up/email',
        payload: { email: 'mallory@example.com', password: PASSWORD, name: 'Mallory' },
      });

      await restartWith(' ADA@example.com , mallory@example.com');

      expect(await database.role('ada@example.com')).toBe('admin');
      // Inscrit avec une adresse de la liste, sans l'avoir confirmée : rien.
      expect(await database.role('mallory@example.com')).toBe('user');
    });

    it('keeps the ban of a listed admin while another admin can sign in', async () => {
      await banAda();

      await restartWith('ada@example.com, grace@example.com');

      expect(await database.role('ada@example.com')).toBe('admin');
      expect((await signIn('ada@example.com')).statusCode).toBe(403);
    });

    it('lifts the ban when no admin can sign in any more', async () => {
      await banAda();

      // grace, seule admin active, n'est plus dans la liste : rétrogradée d'abord, il ne reste
      // aucun admin actif, donc le bannissement d'ada est levé.
      await restartWith('ada@example.com');

      expect((await signIn('ada@example.com')).statusCode).toBe(200);
    });

    // Défense en profondeur : avec le secret de Better Auth, un jeton de changement d'adresse forgé
    // ouvrirait une session sur n'importe quel compte, même avec change-email désactivé.
    const changeEmail = {
      email: 'grace@example.com',
      updateTo: 'mallory@example.com',
      requestType: 'change-email-verification',
    };

    /** Jeton HS256 signé à la main, payload précédé d'un BOM (que jose retire avant de le lire). */
    function signWithBom(claims: object): string {
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString(
        'base64url',
      );
      const payload = Buffer.concat([
        Buffer.from([0xef, 0xbb, 0xbf]),
        Buffer.from(JSON.stringify({ ...claims, exp: Math.floor(Date.now() / 1000) + 3600 })),
      ]).toString('base64url');
      const signature = createHmac('sha256', TEST_AUTH_SECRET)
        .update(`${header}.${payload}`)
        .digest('base64url');
      return `${header}.${payload}.${signature}`;
    }

    it.each([
      ['signed by Better Auth', () => signJWT(changeEmail, TEST_AUTH_SECRET)],
      ['with a BOM before its payload', () => Promise.resolve(signWithBom(changeEmail))],
    ])('refuses a verification link that changes an address (%s)', async (_label, sign) => {
      const response = await app.inject({
        method: 'GET',
        url: `/v1/auth/verify-email?token=${await sign()}`,
      });

      expect(response.statusCode).toBe(400);
      expect(response.headers['set-cookie']).toBeUndefined();
      expect(response.headers['set-auth-token']).toBeUndefined();
    });

    // La liste désigne des adresses : aucun compte ne doit pouvoir prendre celle d'un autre.
    it('never lets a user change their address', async () => {
      const changeEmail = await app.inject({
        method: 'POST',
        url: '/v1/auth/change-email',
        headers: user,
        payload: { newEmail: 'grace@example.com' },
      });
      const updateUser = await app.inject({
        method: 'POST',
        url: '/v1/auth/update-user',
        headers: user,
        payload: { email: 'grace@example.com' },
      });

      expect(changeEmail.statusCode).toBe(400);
      expect(changeEmail.json()).toMatchObject({ code: 'CHANGE_EMAIL_DISABLED' });
      expect(updateUser.statusCode).toBe(400);
      // L'adresse de grace n'a pas changé de compte.
      expect(await database.userId('grace@example.com')).not.toBe(
        await database.userId('ada@example.com'),
      );
      await expect(database.userId('ada@example.com')).resolves.toBeDefined();
    });
  });
});
