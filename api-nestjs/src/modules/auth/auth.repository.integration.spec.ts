import { afterAll, beforeEach, describe, expect, inject, it } from 'vitest';
import { createTestDatabase } from '../../../test/database.js';
import { AuthRepository } from './auth.repository.js';
import { sessions, users } from './auth.table.js';

const NOW = new Date('2026-10-28T12:00:00.000Z');

describe('AuthRepository (PostgreSQL)', () => {
  const database = createTestDatabase(inject('databaseUrl'));
  const repository = new AuthRepository(database.db);

  beforeEach(() => database.reset());
  afterAll(() => database.close());

  it('deletes expired sessions only (GLB-013)', async () => {
    const [user] = await database.db
      .insert(users)
      .values({ name: 'Ada', email: 'ada@example.com' })
      .returning();
    await database.db.insert(sessions).values([
      { userId: user!.id, token: 'expired', expiresAt: new Date(NOW.getTime() - 1) },
      { userId: user!.id, token: 'active', expiresAt: new Date(NOW.getTime() + 60_000) },
    ]);

    expect(await repository.deleteExpiredSessions(NOW)).toBe(1);

    const remaining = await database.db.select({ token: sessions.token }).from(sessions);
    expect(remaining).toEqual([{ token: 'active' }]);
  });
});
