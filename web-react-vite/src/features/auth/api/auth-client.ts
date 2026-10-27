import { createAuthClient } from 'better-auth/client';

type AuthClient = ReturnType<typeof createAuthClient>;

let client: AuthClient | undefined;

/**
 * BE-006 : client Better Auth (routes /v1/auth de l'API). Appelé une fois au démarrage,
 * avec la même URL d'API que `configureHttp`. Vide = même origine.
 */
export function configureAuthClient(options: { baseUrl: string }) {
  client = createAuthClient({
    baseURL: options.baseUrl.replace(/\/$/, '') || window.location.origin,
    basePath: '/v1/auth',
    // Session en cookie HttpOnly, envoyé à l'API même sur un autre sous-domaine.
    fetchOptions: {
      credentials: 'include',
      // `fetch` global lu à chaque appel (et non mémorisé à la création) : MSW peut l'intercepter.
      customFetchImpl: (input, init) => fetch(input, init),
    },
  });
}

export function authClient(): AuthClient {
  if (!client) throw new Error('configureAuthClient() must be called at startup');
  return client;
}
