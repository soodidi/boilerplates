import { type NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, inject, it } from 'vitest';
import { type InMemoryMailer } from '../src/mail/index.js';
import { createTestApp, signUpAndSignIn, WEB_ORIGIN } from './app.js';
import { createTestDatabase } from './database.js';

// BE-008 : l'API complète (validation, format d'erreur, codes HTTP, accès) contre une vraie base.
describe('Notes API (e2e)', () => {
  const databaseUrl = inject('databaseUrl');
  const database = createTestDatabase(databaseUrl);
  let app: NestFastifyApplication;
  let mailer: InMemoryMailer;
  let auth: { authorization: string };

  beforeAll(async () => {
    ({ app, mailer } = await createTestApp(databaseUrl));
  });

  beforeEach(async () => {
    await database.reset();
    const { token } = await signUpAndSignIn(app, mailer, 'ada@example.com');
    auth = { authorization: `Bearer ${token}` };
  });

  afterAll(async () => {
    await app.close();
    await database.close();
  });

  it('POST /v1/notes creates a note', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/notes',
      headers: auth,
      payload: { title: '  Buy coffee  ', content: 'Arabica' },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      id: expect.any(String) as unknown,
      title: 'Buy coffee',
      content: 'Arabica',
      createdAt: expect.any(String) as unknown,
    });
  });

  it('POST /v1/notes returns a Problem Details with field errors when invalid', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/notes',
      headers: auth,
      payload: { title: '', unexpected: true },
    });

    expect(response.statusCode).toBe(400);
    expect(response.headers['content-type']).toContain('application/problem+json');
    const problem = response.json<{
      status: number;
      errors: { field: string }[];
      traceId: string;
    }>();
    expect(problem.status).toBe(400);
    expect(problem.traceId).toEqual(expect.any(String));
    expect(problem.errors.map((error) => error.field)).toContain('title');
  });

  it('GET /v1/notes filters by title and paginates with a cursor', async () => {
    for (const title of ['coffee 1', 'coffee 2', 'tea']) {
      await app.inject({ method: 'POST', url: '/v1/notes', headers: auth, payload: { title } });
    }

    const first = await app.inject({
      method: 'GET',
      url: '/v1/notes?q=coffee&limit=1',
      headers: auth,
    });
    const firstPage = first.json<{ data: { title: string }[]; nextCursor: string }>();
    const second = await app.inject({
      method: 'GET',
      url: `/v1/notes?q=coffee&limit=1&cursor=${firstPage.nextCursor}`,
      headers: auth,
    });

    expect(first.statusCode).toBe(200);
    expect(firstPage.data.map((note) => note.title)).toEqual(['coffee 2']);
    expect(second.json<{ data: { title: string }[] }>().data.map((note) => note.title)).toEqual([
      'coffee 1',
    ]);
  });

  it('GET /v1/notes rejects an invalid cursor', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/notes?cursor=oops',
      headers: auth,
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ status: 400, detail: 'Invalid cursor' });
  });

  it('GET /health/ready reports the database as up', async () => {
    const response = await app.inject({ method: 'GET', url: '/health/ready' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: 'ok' });
  });

  it('GET /v1/notes requires authentication (401 Problem Details)', async () => {
    const response = await app.inject({ method: 'GET', url: '/v1/notes' });

    expect(response.statusCode).toBe(401);
    expect(response.headers['content-type']).toContain('application/problem+json');
  });

  it("GET /v1/notes never returns another user's notes (IDOR)", async () => {
    await app.inject({
      method: 'POST',
      url: '/v1/notes',
      headers: auth,
      payload: { title: 'secret of ada' },
    });
    const bob = await signUpAndSignIn(app, mailer, 'bob@example.com');

    const response = await app.inject({
      method: 'GET',
      url: '/v1/notes',
      headers: { authorization: `Bearer ${bob.token}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json<{ data: unknown[] }>().data).toEqual([]);
  });

  it('POST /v1/notes with a session cookie requires a trusted Origin (CSRF)', async () => {
    const { cookie } = await signUpAndSignIn(app, mailer, 'carol@example.com');
    const request = { method: 'POST' as const, url: '/v1/notes', payload: { title: 'x' } };

    const forged = await app.inject({
      ...request,
      headers: { cookie, origin: 'https://evil.example.com' },
    });
    const legit = await app.inject({ ...request, headers: { cookie, origin: WEB_ORIGIN } });

    expect(forged.statusCode).toBe(403);
    expect(legit.statusCode).toBe(201);
  });
});
