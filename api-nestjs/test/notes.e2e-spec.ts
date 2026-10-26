import { type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, inject, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { configureApp, createFastifyAdapter } from '../src/app.setup.js';
import { createTestDatabase } from './database.js';

// BE-008 : l'API complète (validation, format d'erreur, codes HTTP) contre une vraie base.
describe('Notes API (e2e)', () => {
  const databaseUrl = inject('databaseUrl');
  const database = createTestDatabase(databaseUrl);
  let app: NestFastifyApplication;

  beforeAll(async () => {
    Object.assign(process.env, {
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
      DATABASE_URL: databaseUrl,
      ENABLE_DOCS: 'false',
    });
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(createFastifyAdapter());
    await configureApp(app);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  beforeEach(() => database.reset());

  afterAll(async () => {
    await app.close();
    await database.close();
  });

  it('POST /v1/notes creates a note', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/notes',
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
      await app.inject({ method: 'POST', url: '/v1/notes', payload: { title } });
    }

    const first = await app.inject({ method: 'GET', url: '/v1/notes?q=coffee&limit=1' });
    const firstPage = first.json<{ data: { title: string }[]; nextCursor: string }>();
    const second = await app.inject({
      method: 'GET',
      url: `/v1/notes?q=coffee&limit=1&cursor=${firstPage.nextCursor}`,
    });

    expect(first.statusCode).toBe(200);
    expect(firstPage.data.map((note) => note.title)).toEqual(['coffee 2']);
    expect(second.json<{ data: { title: string }[] }>().data.map((note) => note.title)).toEqual([
      'coffee 1',
    ]);
  });

  it('GET /v1/notes rejects an invalid cursor', async () => {
    const response = await app.inject({ method: 'GET', url: '/v1/notes?cursor=oops' });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ status: 400, detail: 'Invalid cursor' });
  });

  it('GET /health/ready reports the database as up', async () => {
    const response = await app.inject({ method: 'GET', url: '/health/ready' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: 'ok' });
  });
});
