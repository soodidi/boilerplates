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

  // GLB-013 : l'instrumentation HTTP de Sentry (SDK 11.9, spans en streaming) ajoute ces attributs
  // au span serveur, quelle que soit la liste `dataCollection.httpHeaders`.
  it('drops the browser and the client address from the span attributes', () => {
    const span = redactSpan({
      trace_id: 't',
      span_id: 's',
      name: 'GET /v1/notes',
      start_timestamp: 0,
      status: 'ok',
      is_segment: true,
      attributes: {
        'user_agent.original': { value: 'Mozilla/5.0 ProbeBrowser/1.0', type: 'string' },
        'network.peer.address': { value: '203.0.113.7', type: 'string' },
        'client.address': { value: '203.0.113.7', type: 'string' },
        'http.request.method': { value: 'GET', type: 'string' },
      },
    });

    const serialized = JSON.stringify(span);
    expect(serialized).not.toContain('ProbeBrowser');
    expect(serialized).not.toContain('203.0.113.7');
    expect(span.attributes['http.request.method']).toEqual({ value: 'GET', type: 'string' });
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

describe('redactErrorEvent with a failed query', () => {
  it('drops the query values from the exception message', () => {
    const event = redactErrorEvent({
      type: undefined,
      exception: {
        values: [
          { type: 'DrizzleQueryError', value: 'Failed query: insert\nparams: my secret note' },
        ],
      },
    });

    expect(JSON.stringify(event)).not.toContain('my secret note');
  });
});
