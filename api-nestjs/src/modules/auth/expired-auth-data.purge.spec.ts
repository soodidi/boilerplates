import { Logger } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type AuthRepository } from './auth.repository.js';
import { ExpiredAuthDataPurge, PURGE_INTERVAL_MS } from './expired-auth-data.purge.js';

/** BE-008 : un fake du repository, pour tester le rythme de la purge sans base. */
class FakeAuthRepository {
  calls: Date[] = [];
  failNext = false;

  deleteExpiredAuthData(now: Date) {
    this.calls.push(now);
    if (this.failNext) {
      this.failNext = false;
      return Promise.reject(new Error('database down'));
    }
    return Promise.resolve({ sessions: 0, verifications: 0, rateLimits: 0 });
  }
}

describe('ExpiredAuthDataPurge', () => {
  let repository: FakeAuthRepository;
  let purge: ExpiredAuthDataPurge;

  beforeEach(() => {
    vi.useFakeTimers();
    repository = new FakeAuthRepository();
    purge = new ExpiredAuthDataPurge(repository as unknown as AuthRepository);
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

  it('logs a failure and keeps purging', async () => {
    const logError = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    repository.failNext = true;
    purge.onApplicationBootstrap();
    await vi.advanceTimersByTimeAsync(0);

    expect(logError).toHaveBeenCalledWith(
      'Expired auth data purge failed',
      expect.stringContaining('database down'),
    );

    await vi.advanceTimersByTimeAsync(PURGE_INTERVAL_MS);
    expect(repository.calls).toHaveLength(2);
    logError.mockRestore();
  });

  it('does not keep the process alive', () => {
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
    purge.onApplicationBootstrap();

    const timer = setIntervalSpy.mock.results[0]?.value as NodeJS.Timeout;
    expect(timer.hasRef()).toBe(false);
  });

  it('stops on shutdown', async () => {
    purge.onApplicationBootstrap();
    purge.onApplicationShutdown();
    await vi.advanceTimersByTimeAsync(PURGE_INTERVAL_MS * 2);

    expect(repository.calls).toHaveLength(1);
  });
});
