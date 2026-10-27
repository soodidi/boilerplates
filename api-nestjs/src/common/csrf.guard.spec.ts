import { type ExecutionContext, ForbiddenException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { type Env } from '../config/env.js';
import { CsrfGuard } from './csrf.guard.js';

const guard = new CsrfGuard({
  CORS_ORIGINS: ['http://localhost:5173'],
  BETTER_AUTH_URL: 'http://localhost:3000',
} as Env);

function check(method: string, headers: Record<string, string>) {
  const context = {
    switchToHttp: () => ({ getRequest: () => ({ method, headers }) }),
  } as unknown as ExecutionContext;
  return () => guard.canActivate(context);
}

const cookie = 'better-auth.session_token=abc.sig';

describe('CsrfGuard', () => {
  it('lets safe methods through, even with a cookie from another site', () => {
    expect(check('GET', { cookie, origin: 'https://evil.example.com' })()).toBe(true);
  });

  it('lets requests without a cookie through', () => {
    expect(check('POST', {})()).toBe(true);
  });

  it.each([['http://localhost:5173'], ['http://localhost:3000']])(
    'accepts a cookie request from the trusted origin %s',
    (origin) => {
      expect(check('POST', { cookie, origin })()).toBe(true);
    },
  );

  it('accepts a same-origin request without Origin (Sec-Fetch-Site)', () => {
    expect(check('POST', { cookie, 'sec-fetch-site': 'same-origin' })()).toBe(true);
  });

  it.each([
    ['an untrusted origin', { origin: 'https://evil.example.com' }],
    ['Origin: null', { origin: 'null' }],
    ['a cross-site request without Origin', { 'sec-fetch-site': 'cross-site' }],
    ['no Origin at all', {}],
    ['an empty Authorization header', { authorization: '' }],
    ['a non-Bearer Authorization header', { authorization: 'Basic abc' }],
  ])('refuses a cookie request with %s', (_label, headers: Record<string, string>) => {
    expect(check('DELETE', { cookie, ...headers })).toThrow(ForbiddenException);
  });

  it('accepts a cookie request carrying a Bearer token (iOS URLSession)', () => {
    expect(check('POST', { cookie, authorization: 'Bearer abc.sig' })()).toBe(true);
  });
});
