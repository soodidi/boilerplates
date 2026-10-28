import { describe, expect, it } from 'vitest';
import { redactUrl, serializeRequest } from './redact-url.js';

describe('redactUrl', () => {
  it('masks tokens in query strings and reset-password paths', () => {
    expect(redactUrl('/v1/auth/verify-email?token=abc&callbackURL=/x')).toBe(
      '/v1/auth/verify-email?token=[redacted]&callbackURL=/x',
    );
    expect(redactUrl('/v1/auth/reset-password/abc?callbackURL=/x')).toBe(
      '/v1/auth/reset-password/[redacted]?callbackURL=/x',
    );
  });

  it('masks tokens inside a span name or a full URL', () => {
    expect(redactUrl('GET /v1/auth/reset-password/abc')).toBe(
      'GET /v1/auth/reset-password/[redacted]',
    );
    expect(redactUrl('https://api.example.com/v1/auth/verify-email?token=abc')).toBe(
      'https://api.example.com/v1/auth/verify-email?token=[redacted]',
    );
  });

  it('leaves other URLs unchanged', () => {
    expect(redactUrl('/v1/notes?q=token')).toBe('/v1/notes?q=token');
  });
});

describe('serializeRequest', () => {
  it('keeps only the id, the method and the redacted URL (GLB-013)', () => {
    expect(
      serializeRequest({
        id: 'req-1',
        method: 'GET',
        url: '/v1/auth/reset-password/abc',
        headers: { 'user-agent': 'Firefox', 'x-forwarded-for': '203.0.113.7' },
        remoteAddress: '203.0.113.7',
      } as Parameters<typeof serializeRequest>[0]),
    ).toEqual({ id: 'req-1', method: 'GET', url: '/v1/auth/reset-password/[redacted]' });
  });
});
