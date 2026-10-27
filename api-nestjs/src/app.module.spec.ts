import { describe, expect, it } from 'vitest';
import { redactUrlTokens } from './app.module.js';

describe('redactUrlTokens', () => {
  it('masks tokens in query strings and reset-password paths', () => {
    expect(redactUrlTokens({ url: '/v1/auth/verify-email?token=abc&callbackURL=/x' }).url).toBe(
      '/v1/auth/verify-email?token=[redacted]&callbackURL=/x',
    );
    expect(redactUrlTokens({ url: '/v1/auth/reset-password/abc?callbackURL=/x' }).url).toBe(
      '/v1/auth/reset-password/[redacted]?callbackURL=/x',
    );
  });

  it('leaves other URLs unchanged', () => {
    expect(redactUrlTokens({ url: '/v1/notes?q=token' }).url).toBe('/v1/notes?q=token');
  });
});
