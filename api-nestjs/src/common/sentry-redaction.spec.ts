import { describe, expect, it } from 'vitest';
import { redactErrorEvent, redactSpan } from './sentry-redaction.js';

const RESET_URL = 'https://api.example.com/v1/auth/reset-password/secret-token?callbackURL=/x';

describe('redactSpan', () => {
  it('masks the reset token in the span name and its URL attributes', () => {
    const span = redactSpan({
      trace_id: 't',
      span_id: 's',
      name: 'GET /v1/auth/reset-password/secret-token',
      start_timestamp: 0,
      status: 'ok',
      is_segment: true,
      attributes: {
        'url.full': RESET_URL,
        'http.target': { value: '/v1/auth/reset-password/secret-token' },
        'http.status_code': 302,
      },
    });

    expect(JSON.stringify(span)).not.toContain('secret-token');
    expect(span.attributes['http.status_code']).toBe(302);
  });
});

describe('redactErrorEvent', () => {
  it('masks the token in the request URL, the transaction and the breadcrumbs', () => {
    const event = redactErrorEvent({
      type: undefined,
      transaction: 'GET /v1/auth/reset-password/secret-token',
      request: { url: RESET_URL },
      breadcrumbs: [{ data: { url: RESET_URL }, message: `GET ${RESET_URL}` }],
    });

    expect(JSON.stringify(event)).not.toContain('secret-token');
  });
});
