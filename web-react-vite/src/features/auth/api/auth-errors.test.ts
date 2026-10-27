import { describe, expect, it } from 'vitest';
import { fr } from '@/i18n/fr';
import { AuthError } from './auth-api';
import { authErrorMessage } from './auth-errors';

describe('authErrorMessage', () => {
  it.each([
    [new AuthError(401, 'INVALID_EMAIL_OR_PASSWORD'), fr.auth.errors.invalidCredentials],
    [new AuthError(403, 'EMAIL_NOT_VERIFIED'), fr.auth.errors.emailNotVerified],
    [new AuthError(429, undefined), fr.auth.errors.tooManyAttempts],
    [new AuthError(400, 'INVALID_TOKEN'), fr.auth.reset.invalidLink],
    [new AuthError(500, undefined), fr.auth.errors.generic],
    [new TypeError('Failed to fetch'), fr.auth.errors.generic],
  ])('traduit %o sans révéler de détail', (error, message) => {
    expect(authErrorMessage(error, fr)).toBe(message);
  });
});
