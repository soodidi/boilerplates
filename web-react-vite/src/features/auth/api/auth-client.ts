import { createAuthClient } from 'better-auth/client';
import { adminClient } from 'better-auth/client/plugins';
import { fetchOrNetworkError } from '@/lib/http';

function createClient(baseUrl: string) {
  return createAuthClient({
    baseURL: baseUrl.replace(/\/$/, '') || window.location.origin,
    basePath: '/v1/auth',
    // Session en cookie HttpOnly, envoyé à l'API même sur un autre sous-domaine.
    fetchOptions: {
      credentials: 'include',
      // `fetch` global lu à chaque appel (et non mémorisé à la création) : MSW peut l'intercepter.
      // API injoignable : `NetworkError`, comme `request()` (écran « Connexion impossible »).
      customFetchImpl: fetchOrNetworkError,
    },
    // BE-010 : routes /v1/auth/admin/* (comptes) ; les permissions sont vérifiées par l'API.
    plugins: [adminClient()],
  });
}

type AuthClient = ReturnType<typeof createClient>;

let client: AuthClient | undefined;

/**
 * BE-006 : client Better Auth (routes /v1/auth de l'API). Appelé une fois au démarrage,
 * avec la même URL d'API que `configureHttp`. Vide = même origine.
 */
export function configureAuthClient(options: { baseUrl: string }) {
  client = createClient(options.baseUrl);
}

export function authClient(): AuthClient {
  if (!client) throw new Error('configureAuthClient() must be called at startup');
  return client;
}
