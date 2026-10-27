import { type QueryClient } from '@tanstack/react-query';
import { redirect } from '@tanstack/react-router';
import { sessionQueryOptions } from './api/auth-api';

/**
 * BE-006 : à utiliser dans `beforeLoad` des routes privées. Sans session, renvoie vers la
 * connexion, puis vers la page demandée une fois connecté. La vraie protection reste l'API.
 */
export async function requireSession({
  context,
  location,
}: {
  context: { queryClient: QueryClient };
  location: { href: string };
}) {
  const session = await context.queryClient.query(sessionQueryOptions());
  if (!session) {
    // TanStack Router : `redirect()` est fait pour être levé dans `beforeLoad`.
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw redirect({ to: '/login', search: { redirect: location.href } });
  }
  return { session };
}
