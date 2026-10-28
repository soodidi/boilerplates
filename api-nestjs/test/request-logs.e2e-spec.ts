import fs from 'node:fs';
import { type NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, afterEach, describe, expect, inject, it, vi } from 'vitest';
import { createTestApp } from './app.js';
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
      .map((line) => JSON.parse(line) as { req: Record<string, unknown> });
    expect(requestLogs).toHaveLength(1);
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
});
