import { type NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, afterEach, beforeEach, describe, expect, inject, it, vi } from 'vitest';
import { sessions, users } from '../src/modules/auth/auth.table.js';
import { createTestApp } from './app.js';
import { createTestDatabase } from './database.js';

// GLB-013 : la purge des données d'auth expirées est branchée sur le démarrage de l'app complète.
describe('Expired auth data purge (e2e)', () => {
  const databaseUrl = inject('databaseUrl');
  const database = createTestDatabase(databaseUrl);
  let app: NestFastifyApplication | undefined;

  beforeEach(() => database.reset());

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  afterAll(() => database.close());

  it('deletes expired sessions when the API starts', async () => {
    const [user] = await database.db
      .insert(users)
      .values({ name: 'Ada', email: 'ada@example.com' })
      .returning();
    await database.db.insert(sessions).values([
      { userId: user!.id, token: 'expired', expiresAt: new Date(Date.now() - 60_000) },
      { userId: user!.id, token: 'active', expiresAt: new Date(Date.now() + 60_000) },
    ]);

    ({ app } = await createTestApp(databaseUrl));

    await vi.waitFor(async () => {
      const remaining = await database.db.select({ token: sessions.token }).from(sessions);
      expect(remaining).toEqual([{ token: 'active' }]);
    });
  });
});
