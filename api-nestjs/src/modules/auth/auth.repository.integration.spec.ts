import { afterAll, beforeEach, describe, expect, inject, it } from 'vitest';
import { createTestDatabase } from '../../../test/database.js';
import { AuthRepository } from './auth.repository.js';
import { rateLimits, sessions, users, verifications } from './auth.table.js';

const NOW = new Date('2026-10-28T12:00:00.000Z');

describe('AuthRepository (PostgreSQL)', () => {
  const database = createTestDatabase(inject('databaseUrl'));
  const repository = new AuthRepository(database.db);

  beforeEach(() => database.reset());
  afterAll(() => database.close());

  it('deletes expired sessions and tokens and stale rate limit counters only (GLB-013)', async () => {
    const [user] = await database.db
      .insert(users)
      .values({ name: 'Ada', email: 'ada@example.com' })
      .returning();
    const past = new Date(NOW.getTime() - 1);
    const future = new Date(NOW.getTime() + 60_000);
    await database.db.insert(sessions).values([
      { userId: user!.id, token: 'expired', expiresAt: past },
      { userId: user!.id, token: 'active', expiresAt: future },
    ]);
    await database.db.insert(verifications).values([
      { identifier: 'reset-password:expired', value: user!.id, expiresAt: past },
      { identifier: 'reset-password:active', value: user!.id, expiresAt: future },
    ]);
    await database.db.insert(rateLimits).values([
      { key: '203.0.113.7/sign-in/email', count: 1, lastRequest: NOW.getTime() - 25 * 3_600_000 },
      { key: '203.0.113.8/sign-in/email', count: 1, lastRequest: NOW.getTime() - 60_000 },
    ]);

    expect(await repository.deleteExpiredAuthData(NOW)).toEqual({
      sessions: 1,
      verifications: 1,
      rateLimits: 1,
    });

    expect(await database.db.select({ token: sessions.token }).from(sessions)).toEqual([
      { token: 'active' },
    ]);
    expect(
      await database.db.select({ identifier: verifications.identifier }).from(verifications),
    ).toEqual([{ identifier: 'reset-password:active' }]);
    expect(await database.db.select({ key: rateLimits.key }).from(rateLimits)).toEqual([
      { key: '203.0.113.8/sign-in/email' },
    ]);
  });
});
