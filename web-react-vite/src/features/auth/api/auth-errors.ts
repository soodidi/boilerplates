import { type Messages } from '@/i18n';
import { AuthError } from './auth-api';

/**
 * BE-006 : messages génériques. On ne dit jamais si un compte existe : un mauvais mot de passe
 * et une adresse inconnue donnent le même message.
 */
export function authErrorMessage(error: unknown, m: Messages): string {
  if (error instanceof AuthError) {
    if (error.status === 401) return m.auth.errors.invalidCredentials;
    if (error.status === 403 && error.code === 'EMAIL_NOT_VERIFIED')
      return m.auth.errors.emailNotVerified;
    if (error.status === 429) return m.auth.errors.tooManyAttempts;
  }
  return m.auth.errors.generic;
}

export function isEmailNotVerified(error: unknown): boolean {
  return error instanceof AuthError && error.code === 'EMAIL_NOT_VERIFIED';
}
