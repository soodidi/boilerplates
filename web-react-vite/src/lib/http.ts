import { type z } from 'zod';
import { ProblemDetailsError, parseProblemDetails } from './problem-details';

let baseUrl = '';

/** Appelé une fois au démarrage avec l'URL de l'API (config.json). */
export function configureHttp(options: { baseUrl: string }) {
  baseUrl = options.baseUrl.replace(/\/$/, '');
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
  const response = await fetch(`${baseUrl}${path}`, {
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

  if (!response.ok) {
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
