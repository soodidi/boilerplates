import { describe, expect, it } from 'vitest';
import { capSessionExpiry, hasEmailChange, SESSION_MAX_LIFETIME_MS } from './auth.config.js';

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

describe('hasEmailChange', () => {
  const jwt = (claims: object) =>
    `header.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.signature`;

  it('spots a change-email verification token', () => {
    expect(hasEmailChange(jwt({ email: 'a@example.com', updateTo: 'b@example.com' }))).toBe(true);
  });

  it.each([
    ['a sign-up token', jwt({ email: 'a@example.com' })],
    ['no token', undefined],
    ['a malformed token', 'not-a-jwt'],
    ['an unreadable payload', 'header.%%%.signature'],
  ])('lets %s through to Better Auth', (_label, token) => {
    expect(hasEmailChange(token)).toBe(false);
  });
});
