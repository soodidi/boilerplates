import { describe, expect, it } from 'vitest';
import { capSessionExpiry, SESSION_MAX_LIFETIME_MS } from './auth.config.js';

describe('capSessionExpiry', () => {
  const createdAt = new Date('2026-01-01T00:00:00.000Z');
  const limit = new Date(createdAt.getTime() + SESSION_MAX_LIFETIME_MS);

  it('keeps an expiry within 90 days of sign-in', () => {
    const expiresAt = new Date('2026-02-01T00:00:00.000Z');
    expect(capSessionExpiry(expiresAt, createdAt)).toEqual(expiresAt);
  });

  it('caps an expiry beyond 90 days of sign-in', () => {
    expect(capSessionExpiry(new Date('2026-06-01T00:00:00.000Z'), createdAt)).toEqual(limit);
  });
});
