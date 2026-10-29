import { type z } from 'zod';
import { NetworkError } from './errors';
import { ProblemDetailsError, parseProblemDetails } from './problem-details';

let baseUrl = '';
let onUnauthorized: (() => void) | undefined;

/**
 * Appelé une fois au démarrage avec l'URL de l'API (config.json).
 * `onUnauthorized` : session expirée ou révoquée (401), par exemple pour renvoyer vers la connexion.
 */
export function configureHttp(options: { baseUrl: string; onUnauthorized?: () => void }) {
  baseUrl = options.baseUrl.replace(/\/$/, '');
  onUnauthorized = options.onUnauthorized;
}

/** Un 401 reçu hors de `request()` (client Better Auth) : même traitement, retour à la connexion. */
export function notifyUnauthorized() {
  onUnauthorized?.();
}

/**
 * `fetch` qui lève une `NetworkError` quand l'API ne répond pas, comme `request()`.
 * Pour le client Better Auth, qui laisserait passer l'erreur brute de `fetch`.
 */
export async function fetchOrNetworkError(input: RequestInfo | URL, init?: RequestInit) {
  try {
    return await fetch(input, init);
  } catch (error) {
    if (init?.signal?.aborted) throw error;
    throw new NetworkError({ cause: error });
  }
}

type RequestOptions<TSchema extends z.ZodType> = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /** FE-002 : toute réponse de l'API est validée à l'exécution avant d'être typée. */
  schema: TSchema;
};

export async function request<TSchema extends z.ZodType>(
  path: string,
  { method = 'GET', body, headers, signal, schema }: RequestOptions<TSchema>,
): Promise<z.output<TSchema>> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...headers,
      },
      body: body === undefined ? null : JSON.stringify(body),
      // BE-006 : session web en cookie HttpOnly.
      credentials: 'include',
      signal: signal ?? null,
    });
  } catch (error) {
    // Requête annulée (navigation, nouvelle recherche) : ce n'est pas une panne réseau.
    if (signal?.aborted) throw error;
    // BE-010 : API injoignable, affichée comme telle (écran « hors ligne »), sans réponse à lire.
    throw new NetworkError({ cause: error });
  }

  if (!response.ok) {
    if (response.status === 401) onUnauthorized?.();
    const payload: unknown = await response.json().catch(() => null);
    throw new ProblemDetailsError(
      parseProblemDetails(payload) ?? {
        type: 'about:blank',
        title: response.statusText || 'HTTP error',
        status: response.status,
      },
    );
  }

  const data: unknown = response.status === 204 ? undefined : await response.json();
  return schema.parse(data);
}
