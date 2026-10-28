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
    if (error.code === 'INVALID_TOKEN') return m.auth.reset.invalidLink;
  }
  return m.auth.errors.generic;
}

export function isEmailNotVerified(error: unknown): boolean {
  return error instanceof AuthError && error.code === 'EMAIL_NOT_VERIFIED';
}

/** GLB-013 : erreur de la suppression du compte (mot de passe à ressaisir). */
export function deleteAccountErrorMessage(error: unknown, m: Messages): string {
  if (error instanceof AuthError) {
    if (error.code === 'INVALID_PASSWORD') return m.account.delete.wrongPassword;
    if (error.status === 429) return m.auth.errors.tooManyAttempts;
  }
  return m.auth.errors.generic;
}
