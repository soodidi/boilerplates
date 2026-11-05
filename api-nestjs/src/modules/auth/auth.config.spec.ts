import { describe, expect, it } from 'vitest';
import {
  capSessionExpiry,
  hasAdminRole,
  hasEmailChange,
  SESSION_MAX_LIFETIME_MS,
} from './auth.config.js';

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

  const withBom = (claims: object) =>
    `header.${Buffer.concat([
      Buffer.from([0xef, 0xbb, 0xbf]),
      Buffer.from(JSON.stringify(claims)),
    ]).toString('base64url')}.signature`;

  it.each([
    ['a change-email token', jwt({ email: 'a@example.com', updateTo: 'b@example.com' })],
    // jose retire le BOM avant de lire le jeton : une lecture plus naïve le laisserait passer.
    ['a change-email token with a BOM', withBom({ email: 'a@example.com', updateTo: 'b@x.com' })],
    ['a malformed token', 'not-a-jwt'],
    ['an unreadable payload', 'header.%%%.signature'],
    ['a payload that is not an object', `header.${Buffer.from('"x"').toString('base64url')}.sig`],
    ['a repeated token', ['a', 'b']],
  ])('refuses %s', (_label, token) => {
    expect(hasEmailChange(token)).toBe(true);
  });

  it.each([
    ['a sign-up token', jwt({ email: 'a@example.com' })],
    ['a sign-up token with a BOM', withBom({ email: 'a@example.com' })],
    ['no token', undefined],
  ])('lets %s through to Better Auth', (_label, token) => {
    expect(hasEmailChange(token)).toBe(false);
  });
});

describe('hasAdminRole', () => {
  it.each(['admin', 'user,admin', 'admin, user', ' admin '])('reads %j as an admin', (role) => {
    expect(hasAdminRole(role)).toBe(true);
  });

  it.each(['user', 'Admin', 'administrator', '', null, undefined])(
    'reads %j as not an admin',
    (role) => {
      expect(hasAdminRole(role)).toBe(false);
    },
  );
});
