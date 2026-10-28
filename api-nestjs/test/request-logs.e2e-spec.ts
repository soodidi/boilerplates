import fs from 'node:fs';
import { Logger as NestLogger } from '@nestjs/common';
import { type NestFastifyApplication } from '@nestjs/platform-fastify';
import { DrizzleQueryError } from 'drizzle-orm/errors';
import { Logger } from 'nestjs-pino';
import { afterAll, afterEach, beforeEach, describe, expect, inject, it, vi } from 'vitest';
import { createTestApp, signUpAndSignIn, WEB_ORIGIN } from './app.js';
import { createTestDatabase } from './database.js';

/** Lignes écrites par pino sur la sortie standard (sonic-boom passe par `fs.write`/`fs.writeSync`). */
function captureStdout() {
  const lines: string[] = [];
  const keep = (fd: number, data: unknown) => {
    if (fd === 1) lines.push(String(data));
    return Buffer.byteLength(String(data));
  };
  const write = vi
    .spyOn(fs, 'write')
    .mockImplementation((fd: number, data: unknown, ...rest: unknown[]) => {
      const written = keep(fd, data);
      const callback = rest.find((arg) => typeof arg === 'function') as
        ((error: null, written: number) => void) | undefined;
      callback?.(null, written);
    });
  const writeSync = vi
    .spyOn(fs, 'writeSync')
    .mockImplementation((fd: number, data: unknown) => keep(fd, data));
  return {
    lines,
    restore: () => {
      write.mockRestore();
      writeSync.mockRestore();
    },
  };
}

// GLB-013 / BE-007 : une requête journalisée par l'app complète, sans donnée personnelle ni token.
describe('Request logs (e2e)', () => {
  const databaseUrl = inject('databaseUrl');
  const database = createTestDatabase(databaseUrl);
  let app: NestFastifyApplication | undefined;

  beforeEach(() => database.reset());

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  afterAll(() => database.close());

  it('logs a request without IP address, headers or URL token', async () => {
    const stdout = captureStdout();
    try {
      ({ app } = await createTestApp(databaseUrl, { LOG_LEVEL: 'info' }));
      await app.inject({
        method: 'GET',
        url: '/v1/notes?token=secret-token',
        remoteAddress: '198.51.100.9',
        headers: {
          'user-agent': 'ProbeBrowser/1.0',
          'x-forwarded-for': '203.0.113.7',
          authorization: 'Bearer secret-bearer',
          cookie: 'session=secret-cookie',
        },
      });
      // pino écrit la ligne de façon asynchrone, une fois la réponse terminée.
      await vi.waitFor(() => {
        expect(stdout.lines.join('')).toContain('"req"');
      });
      await app.close();
      app = undefined;
    } finally {
      stdout.restore();
    }

    const requestLogs = stdout.lines
      .flatMap((chunk) => chunk.split('\n'))
      .filter((line) => line.includes('"req"'))
      .map((line) => JSON.parse(line) as { req: Record<string, unknown>; res: unknown });
    expect(requestLogs).toHaveLength(1);
    // Réponse réduite à son statut : ni `set-cookie`, ni `set-auth-token`, ni `location`.
    expect(requestLogs[0]!.res).toEqual({ statusCode: 401 });
    expect(requestLogs[0]!.req).toEqual({
      id: expect.any(String) as unknown,
      method: 'GET',
      url: '/v1/notes?token=[redacted]',
    });

    const output = stdout.lines.join('');
    for (const personal of ['ProbeBrowser', '203.0.113.7', '198.51.100.9', 'secret-']) {
      expect(output).not.toContain(personal);
    }
  });

  // Les routes Better Auth ne passent pas aujourd'hui par pino-http : ce test garde la redirection
  // (en-tête `location` avec le token) hors des logs si elles y passent un jour.
  it('keeps the reset token of a redirect out of the logs', async () => {
    const stdout = captureStdout();
    let resetToken: string | undefined;
    try {
      const created = await createTestApp(databaseUrl, { LOG_LEVEL: 'info' });
      app = created.app;
      await signUpAndSignIn(app, created.mailer, 'ada@example.com');
      await app.inject({
        method: 'POST',
        url: '/v1/auth/request-password-reset',
        payload: { email: 'ada@example.com', redirectTo: `${WEB_ORIGIN}/reset-password` },
      });
      resetToken = /\/reset-password\/([^?\s]+)/.exec(
        created.mailer.lastTo('ada@example.com')?.text ?? '',
      )?.[1];
      expect(resetToken).toBeDefined();

      const redirect = await app.inject({
        method: 'GET',
        url: `/v1/auth/reset-password/${resetToken}?callbackURL=${encodeURIComponent(`${WEB_ORIGIN}/reset-password`)}`,
      });
      expect(redirect.statusCode).toBe(302);
      expect(redirect.headers.location).toContain(resetToken);

      await app.close();
      app = undefined;
    } finally {
      stdout.restore();
    }

    expect(stdout.lines.join('')).not.toContain(resetToken);
  });

  it('logs an unexpected error without the values of the failed query', async () => {
    const stdout = captureStdout();
    try {
      ({ app } = await createTestApp(databaseUrl, { LOG_LEVEL: 'info' }));
      // Comme en production (main.ts), et comme le fait ProblemDetailsFilter pour une erreur 500.
      app.useLogger(app.get(Logger));
      const cause = Object.assign(new Error('duplicate key'), {
        detail: 'Key (email)=(ada@example.com) already exists.',
      });
      new NestLogger('ProblemDetailsFilter').error(
        {
          err: new DrizzleQueryError(
            'insert into "notes" ("title") values ($1)',
            ['my secret note'],
            cause,
          ),
        },
        'Unhandled error',
      );
      await vi.waitFor(() => {
        expect(stdout.lines.join('')).toContain('Unhandled error');
      });
      await app.close();
      app = undefined;
    } finally {
      stdout.restore();
    }

    const output = stdout.lines.join('');
    expect(output).toContain('insert into');
    expect(output).not.toContain('my secret note');
    expect(output).not.toContain('ada@example.com');
  });
});
