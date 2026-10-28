import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type AuthRepository } from './auth.repository.js';
import { ExpiredSessionsPurge, PURGE_INTERVAL_MS } from './expired-sessions.purge.js';

/** BE-008 : un fake du repository, pour tester le rythme de la purge sans base. */
class FakeAuthRepository {
  calls: Date[] = [];
  failNext = false;

  deleteExpiredSessions(now: Date) {
    this.calls.push(now);
    if (this.failNext) {
      this.failNext = false;
      return Promise.reject(new Error('database down'));
    }
    return Promise.resolve(0);
  }
}

describe('ExpiredSessionsPurge', () => {
  let repository: FakeAuthRepository;
  let purge: ExpiredSessionsPurge;

  beforeEach(() => {
    vi.useFakeTimers();
    repository = new FakeAuthRepository();
    purge = new ExpiredSessionsPurge(repository as unknown as AuthRepository);
  });

  afterEach(() => {
    purge.onApplicationShutdown();
    vi.useRealTimers();
  });

  it('purges at startup, then every 24 hours', async () => {
    purge.onApplicationBootstrap();
    await vi.advanceTimersByTimeAsync(0);
    expect(repository.calls).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(PURGE_INTERVAL_MS);
    expect(repository.calls).toHaveLength(2);
  });

  it('keeps purging after a failure', async () => {
    repository.failNext = true;
    purge.onApplicationBootstrap();
    await vi.advanceTimersByTimeAsync(PURGE_INTERVAL_MS);

    expect(repository.calls).toHaveLength(2);
  });

  it('stops on shutdown', async () => {
    purge.onApplicationBootstrap();
    purge.onApplicationShutdown();
    await vi.advanceTimersByTimeAsync(PURGE_INTERVAL_MS * 2);

    expect(repository.calls).toHaveLength(1);
  });
});
