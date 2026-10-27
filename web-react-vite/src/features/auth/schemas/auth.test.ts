import { describe, expect, it } from 'vitest';
import { redirectSearchSchema } from './auth';

describe('redirectSearchSchema', () => {
  it.each(['/notes', '/notes?q=api'])('garde un chemin interne (%s)', (redirect) => {
    expect(redirectSearchSchema.parse({ redirect })).toEqual({ redirect });
  });

  it.each([
    '//evil.example.com',
    '/\\evil.example.com',
    '/\tevil.example.com',
    'https://evil.example.com',
  ])('refuse une destination vers un autre site (%s)', (redirect) => {
    expect(redirectSearchSchema.parse({ redirect })).toEqual({ redirect: undefined });
  });
});
