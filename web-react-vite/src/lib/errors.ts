import { isProblemDetailsError } from './problem-details';

/** L'API est injoignable (hors ligne, DNS, serveur arrêté) : la requête n'a pas eu de réponse. */
export class NetworkError extends Error {
  override readonly name = 'NetworkError';

  constructor(options?: ErrorOptions) {
    super('Network error', options);
  }
}

/** BE-010 : l'utilisateur connecté n'a pas la permission (garde de route ou 403 de l'API). */
export class ForbiddenError extends Error {
  override readonly name = 'ForbiddenError';

  constructor() {
    super('Forbidden');
  }
}

/** Erreur attendue (4xx de l'API, Better Auth compris, ou refus) : ni nouvel essai, ni Sentry. */
export function isClientError(error: unknown): boolean {
  if (error instanceof ForbiddenError) return true;
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status === 'number' && status >= 400 && status < 500;
}

export function isForbidden(error: unknown): boolean {
  return error instanceof ForbiddenError || (isProblemDetailsError(error) && error.status === 403);
}
