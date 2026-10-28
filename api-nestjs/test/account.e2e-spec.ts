import { type NestFastifyApplication } from '@nestjs/platform-fastify';
import { count, eq, getTableName } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, inject, it } from 'vitest';
import { UserDataRegistry } from '../src/common/user-data/index.js';
import { type InMemoryMailer } from '../src/mail/index.js';
import { users } from '../src/modules/auth/auth.table.js';
import { createTestApp, PASSWORD, signUpAndSignIn, WEB_ORIGIN } from './app.js';
import { createTestDatabase } from './database.js';
import { findUserTables } from './user-data-tables.js';

// GLB-013 : export et suppression du compte, de bout en bout contre une vraie base.
describe('Account data (e2e)', () => {
  const databaseUrl = inject('databaseUrl');
  const database = createTestDatabase(databaseUrl);
  let app: NestFastifyApplication;
  let mailer: InMemoryMailer;
  let ada: { token: string; cookie: string };

  beforeAll(async () => {
    ({ app, mailer } = await createTestApp(databaseUrl));
  });

  beforeEach(async () => {
    await database.reset();
    mailer.sent.length = 0;
    ada = await signUpAndSignIn(app, mailer, 'ada@example.com');
  });

  afterAll(async () => {
    await app.close();
    await database.close();
  });

  const bearer = (token: string) => ({ authorization: `Bearer ${token}` });
  const createNote = (token: string, title: string) =>
    app.inject({ method: 'POST', url: '/v1/notes', headers: bearer(token), payload: { title } });
  // Les notes plutôt que l'export pour vérifier l'état : l'export est limité à 5 appels par minute.
  const listNotes = (token: string) =>
    app.inject({ method: 'GET', url: '/v1/notes', headers: bearer(token) });
  const exportData = (token: string) =>
    app.inject({ method: 'GET', url: '/v1/account/export', headers: bearer(token) });
  const deleteUser = (token: string, payload: object) =>
    app.inject({
      method: 'POST',
      url: '/v1/auth/delete-user',
      headers: { ...bearer(token), origin: WEB_ORIGIN },
      payload,
    });

  async function adaId() {
    const [user] = await database.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, 'ada@example.com'));
    return user?.id;
  }

  /** Lignes restantes de l'utilisateur, table par table, pour toutes les tables avec `user_id`. */
  async function remainingRows(userId: string) {
    const rows: Record<string, number> = {};
    for (const { table, userId: column } of await findUserTables()) {
      const [result] = await database.db
        .select({ value: count() })
        .from(table)
        .where(eq(column, userId));
      rows[getTableName(table)] = result?.value ?? -1;
    }
    return rows;
  }

  describe('GET /v1/account/export', () => {
    it('returns the account, its sessions and the data of every module, without secrets', async () => {
      await createNote(ada.token, 'secret of ada');
      const bob = await signUpAndSignIn(app, mailer, 'bob@example.com');
      await createNote(bob.token, 'secret of bob');

      const response = await exportData(ada.token);

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-disposition']).toBe(
        'attachment; filename="account-export.json"',
      );
      expect(response.headers['cache-control']).toBe('no-store');
      const body = response.json<{
        exportedAt: string;
        data: {
          account: { user: { email: string }; sessions: unknown[]; signInMethods: unknown[] };
          notes: { title: string }[];
        };
      }>();
      expect(body.data.account.user).toMatchObject({ email: 'ada@example.com', name: 'ada' });
      // Une session à la vérification de l'adresse, une à la connexion.
      expect(body.data.account.sessions).toHaveLength(2);
      expect(body.data.account.sessions).toContainEqual(
        expect.objectContaining({
          ipAddress: '127.0.0.1',
          userAgent: expect.any(String) as unknown,
        }),
      );
      expect(body.data.account.signInMethods).toEqual([
        expect.objectContaining({ providerId: 'credential' }),
      ]);
      expect(body.data.notes.map((note) => note.title)).toEqual(['secret of ada']);
      // Ni token de session, ni hachage du mot de passe, ni données de Bob.
      expect(response.body).not.toContain(ada.token.split('.')[0]);
      expect(response.body).not.toContain('$argon2id$');
      expect(response.body).not.toContain('bob');
    });

    it('requires authentication (401 Problem Details)', async () => {
      const response = await app.inject({ method: 'GET', url: '/v1/account/export' });

      expect(response.statusCode).toBe(401);
      expect(response.headers['content-type']).toContain('application/problem+json');
    });
  });

  describe('POST /v1/auth/delete-user', () => {
    it.each([
      ['without a password', {}],
      ['with an empty password', { password: '' }],
      ['with a wrong password', { password: 'not the right password' }],
    ])('deletes nothing %s', async (_case, payload) => {
      await createNote(ada.token, 'keep me');
      const userId = await adaId();

      const response = await deleteUser(ada.token, payload);

      expect(response.statusCode).toBe(400);
      expect(await adaId()).toBe(userId);
      expect((await listNotes(ada.token)).json<{ data: unknown[] }>().data).toHaveLength(1);
    });

    it('requires authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/auth/delete-user',
        headers: { origin: WEB_ORIGIN },
        payload: { password: PASSWORD },
      });

      expect(response.statusCode).toBe(401);
    });

    it('erases every row of the user, and only theirs, with the password', async () => {
      await createNote(ada.token, 'erase me');
      const bob = await signUpAndSignIn(app, mailer, 'bob@example.com');
      await createNote(bob.token, 'keep me');
      const userId = (await adaId())!;

      const response = await deleteUser(ada.token, { password: PASSWORD });

      expect(response.statusCode).toBe(200);
      expect(await adaId()).toBeUndefined();
      const remaining = await remainingRows(userId);
      expect(Object.keys(remaining)).toEqual(
        expect.arrayContaining(['notes', 'sessions', 'accounts']),
      );
      expect(Object.values(remaining).every((rows) => rows === 0)).toBe(true);
      expect((await listNotes(ada.token)).statusCode).toBe(401);
      const signIn = await app.inject({
        method: 'POST',
        url: '/v1/auth/sign-in/email',
        payload: { email: 'ada@example.com', password: PASSWORD },
      });
      expect(signIn.statusCode).toBe(401);
      expect((await listNotes(bob.token)).json<{ data: unknown[] }>().data).toHaveLength(1);
    });

    it('keeps the email-link deletion route closed', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/auth/delete-user/callback?token=anything',
        headers: bearer(ada.token),
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // GLB-013, mise en application : aucune table avec `user_id` n'échappe au registre.
  it('covers every table with a user_id column by a user data contributor', async () => {
    const covered = new Set(
      app
        .get(UserDataRegistry)
        .list()
        .flatMap((contributor) => contributor.tables),
    );

    const uncovered = (await findUserTables())
      .filter(({ table }) => !covered.has(table))
      .map(({ table }) => getTableName(table));

    expect(uncovered).toEqual([]);
  });
});
