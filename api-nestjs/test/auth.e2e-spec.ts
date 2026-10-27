import { type NestFastifyApplication } from '@nestjs/platform-fastify';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, inject, it } from 'vitest';
import { type InMemoryMailer } from '../src/mail/index.js';
import { accounts, sessions } from '../src/modules/auth/auth.table.js';
import { createTestApp, PASSWORD, signIn, signUpAndSignIn, WEB_ORIGIN } from './app.js';
import { createTestDatabase } from './database.js';

const DAY_MS = 24 * 60 * 60 * 1000;

// BE-006 : les règles d'authentification, vérifiées de bout en bout contre une vraie base.
describe('Auth (e2e)', () => {
  const databaseUrl = inject('databaseUrl');
  const database = createTestDatabase(databaseUrl);
  let app: NestFastifyApplication;
  let mailer: InMemoryMailer;

  beforeAll(async () => {
    ({ app, mailer } = await createTestApp(databaseUrl));
  });

  beforeEach(async () => {
    await database.reset();
    mailer.sent.length = 0;
  });

  afterAll(async () => {
    await app.close();
    await database.close();
  });

  const bearer = (token: string) => ({ authorization: `Bearer ${token}` });
  /** Structure d'une réponse (clés et types), sans les valeurs propres à chaque compte. */
  const shape = (value: unknown): unknown =>
    value && typeof value === 'object'
      ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, shape(item)]))
      : value === null
        ? null
        : typeof value;
  const listNotes = (token: string) =>
    app.inject({ method: 'GET', url: '/v1/notes', headers: bearer(token) });

  it('signing up with an existing email looks like a success and warns the owner', async () => {
    await signUpAndSignIn(app, mailer, 'ada@example.com');

    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/sign-up/email',
      payload: { email: 'ada@example.com', password: PASSWORD, name: 'Mallory' },
    });

    const fresh = await app.inject({
      method: 'POST',
      url: '/v1/auth/sign-up/email',
      payload: { email: 'new@example.com', password: PASSWORD, name: 'New' },
    });

    expect(response.statusCode).toBe(200);
    expect(shape(response.json())).toEqual(shape(fresh.json()));
    expect(mailer.lastTo('ada@example.com')?.template).toBe('existing-account');
  });

  it('refuses to sign in before the email is verified', async () => {
    await app.inject({
      method: 'POST',
      url: '/v1/auth/sign-up/email',
      payload: { email: 'ada@example.com', password: PASSWORD, name: 'Ada' },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/sign-in/email',
      payload: { email: 'ada@example.com', password: PASSWORD },
    });

    expect(response.statusCode).toBe(403);
  });

  it('returns the same error for a wrong password and an unknown email', async () => {
    await signUpAndSignIn(app, mailer, 'ada@example.com');
    const attempt = (email: string) =>
      app.inject({
        method: 'POST',
        url: '/v1/auth/sign-in/email',
        payload: { email, password: 'wrong password, wrong' },
      });

    const wrongPassword = await attempt('ada@example.com');
    const unknownEmail = await attempt('nobody@example.com');

    expect(wrongPassword.statusCode).toBe(401);
    expect(unknownEmail.statusCode).toBe(401);
    expect(wrongPassword.json()).toEqual(unknownEmail.json());
  });

  it('hashes passwords with Argon2id', async () => {
    await signUpAndSignIn(app, mailer, 'ada@example.com');

    const [account] = await database.db.select().from(accounts);

    // Paramètres OWASP de BE-006 : 19 Mio, 2 passes, 1 fil.
    expect(account?.password).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
  });

  it('revokes the session on sign-out', async () => {
    const { token } = await signUpAndSignIn(app, mailer, 'ada@example.com');
    expect((await listNotes(token)).statusCode).toBe(200);

    const signOut = await app.inject({
      method: 'POST',
      url: '/v1/auth/sign-out',
      headers: { ...bearer(token), origin: WEB_ORIGIN },
    });

    expect(signOut.statusCode).toBe(200);
    expect((await listNotes(token)).statusCode).toBe(401);
  });

  it('resets the password and revokes every existing session', async () => {
    const { token } = await signUpAndSignIn(app, mailer, 'ada@example.com');

    await app.inject({
      method: 'POST',
      url: '/v1/auth/request-password-reset',
      payload: { email: 'ada@example.com', redirectTo: `${WEB_ORIGIN}/reset-password` },
    });
    const email = mailer.lastTo('ada@example.com');
    expect(email?.template).toBe('reset-password');
    const resetToken = /\/reset-password\/([^?\s]+)/.exec(email?.text ?? '')?.[1];

    const reset = await app.inject({
      method: 'POST',
      url: '/v1/auth/reset-password',
      payload: { token: resetToken, newPassword: 'a brand new long password' },
    });

    expect(reset.statusCode).toBe(200);
    expect((await listNotes(token)).statusCode).toBe(401);
    await expect(signIn(app, 'ada@example.com', 'a brand new long password')).resolves.toEqual(
      expect.objectContaining({ token: expect.any(String) as unknown }),
    );
  });

  it('answers a password reset for an unknown email exactly like a known one, without sending anything', async () => {
    await signUpAndSignIn(app, mailer, 'ada@example.com');
    mailer.sent.length = 0;
    const requestReset = (email: string) =>
      app.inject({
        method: 'POST',
        url: '/v1/auth/request-password-reset',
        payload: { email, redirectTo: `${WEB_ORIGIN}/reset-password` },
      });

    const unknown = await requestReset('nobody@example.com');
    expect(mailer.sent).toHaveLength(0);
    const known = await requestReset('ada@example.com');

    expect(unknown.statusCode).toBe(200);
    expect(unknown.json()).toEqual(known.json());
  });

  it('refuses a password reset redirecting to an untrusted origin', async () => {
    await signUpAndSignIn(app, mailer, 'ada@example.com');
    mailer.sent.length = 0;

    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/request-password-reset',
      payload: { email: 'ada@example.com', redirectTo: 'https://evil.example.com/steal' },
    });

    expect(response.statusCode).toBeGreaterThanOrEqual(400);
    expect(mailer.sent).toHaveLength(0);
  });

  it('sets the session cookie HttpOnly and SameSite=Lax', async () => {
    await signUpAndSignIn(app, mailer, 'ada@example.com');

    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/sign-in/email',
      payload: { email: 'ada@example.com', password: PASSWORD },
    });
    const cookies = [response.headers['set-cookie'] ?? []].flat();
    const session = cookies.find((cookie) => cookie.includes('session_token='));

    expect(session).toMatch(/HttpOnly/i);
    expect(session).toMatch(/SameSite=Lax/i);
  });

  it('revokes the session on sign-out with the web cookie', async () => {
    const { cookie } = await signUpAndSignIn(app, mailer, 'ada@example.com');
    const notesWithCookie = () =>
      app.inject({ method: 'GET', url: '/v1/notes', headers: { cookie } });
    expect((await notesWithCookie()).statusCode).toBe(200);

    const signOut = await app.inject({
      method: 'POST',
      url: '/v1/auth/sign-out',
      headers: { cookie, origin: WEB_ORIGIN },
    });

    expect(signOut.statusCode).toBe(200);
    expect((await notesWithCookie()).statusCode).toBe(401);
  });

  it('refuses an expired session', async () => {
    const { token } = await signUpAndSignIn(app, mailer, 'ada@example.com');
    await database.db
      .update(sessions)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(sessions.token, token.split('.')[0] ?? ''));

    expect((await listNotes(token)).statusCode).toBe(401);
  });

  it('refuses a Bearer token with a forged signature', async () => {
    const { token } = await signUpAndSignIn(app, mailer, 'ada@example.com');
    const forged = `${token.split('.')[0] ?? ''}.${'A'.repeat(43)}=`;

    expect((await listNotes(forged)).statusCode).toBe(401);
  });

  it('never extends a session beyond 90 days after sign-in', async () => {
    const { token } = await signUpAndSignIn(app, mailer, 'ada@example.com');
    // Le token Bearer est signé (`<token>.<signature>`) ; la base ne garde que le token.
    const sessionToken = token.split('.')[0] ?? '';
    const createdAt = new Date(Date.now() - 89 * DAY_MS);
    // Session ouverte il y a 89 jours, dont le renouvellement quotidien est dû.
    await database.db
      .update(sessions)
      .set({ createdAt, expiresAt: new Date(Date.now() + 28 * DAY_MS) })
      .where(eq(sessions.token, sessionToken));

    // Une requête authentifiée prolonge la session…
    expect((await listNotes(token)).statusCode).toBe(200);

    // … mais pas au-delà de 90 jours après la connexion.
    const [session] = await database.db
      .select()
      .from(sessions)
      .where(eq(sessions.token, sessionToken));
    expect(session?.expiresAt.getTime()).toBe(createdAt.getTime() + 90 * DAY_MS);
  });

  it('records the client IP added by the trusted proxy, not one forged by the client', async () => {
    await signUpAndSignIn(app, mailer, 'ada@example.com');

    await app.inject({
      method: 'POST',
      url: '/v1/auth/sign-in/email',
      headers: { 'x-forwarded-for': '6.6.6.6, 203.0.113.7', 'x-client-ip': '6.6.6.6' },
      payload: { email: 'ada@example.com', password: PASSWORD },
    });

    const ips = (await database.db.select().from(sessions)).map((session) => session.ipAddress);
    expect(ips).toContain('203.0.113.7');
    expect(ips).not.toContain('6.6.6.6');
  });

  it('refuses an unsigned Bearer token, even if it exists in the database', async () => {
    const { token } = await signUpAndSignIn(app, mailer, 'ada@example.com');
    const unsigned = token.split('.')[0] ?? '';

    expect((await listNotes(token)).statusCode).toBe(200);
    expect((await listNotes(unsigned)).statusCode).toBe(401);
  });
});
