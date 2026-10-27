import { type QueryClient } from '@tanstack/react-query';
import { type AnyRouter } from '@tanstack/react-router';
import { resetUserCache } from './api/auth-api';

/**
 * Session expirée ou révoquée (401 de l'API) : tout le cache est vidé, pour qu'aucune donnée
 * de l'utilisateur ne s'affiche au compte suivant, puis retour à la connexion (BE-006).
 */
export function createUnauthorizedHandler(queryClient: QueryClient, router: AnyRouter) {
  return () => {
    void resetUserCache(queryClient, null);
    // `latestLocation` : la page en cours de navigation, pas seulement celle déjà affichée.
    const { pathname, href } = router.latestLocation;
    if (pathname === '/login') return;
    void router.navigate({ to: '/login', search: { redirect: href } });
  };
}
