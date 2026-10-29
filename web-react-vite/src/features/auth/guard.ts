import { type QueryClient } from '@tanstack/react-query';
import { redirect } from '@tanstack/react-router';
import { ForbiddenError } from '@/lib/errors';
import { sessionQueryOptions } from './api/auth-api';
import { permissionQueryOptions, type Permissions } from './api/permissions-api';

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

/**
 * BE-010 : `beforeLoad` d'une route réservée. Sans session, comme `requireSession` ; sans la
 * permission, l'écran « Accès refusé » (erreur de la route). La vraie protection reste l'API.
 */
export function requirePermission(permissions: Permissions) {
  return async (args: { context: { queryClient: QueryClient }; location: { href: string } }) => {
    const { session } = await requireSession(args);
    if (!(await args.context.queryClient.query(permissionQueryOptions(permissions)))) {
      throw new ForbiddenError();
    }
    return { session };
  };
}

/** `beforeLoad` de /login : un utilisateur déjà connecté part vers `?redirect=` ou /notes. */
export async function redirectIfSignedIn({
  context,
  search,
}: {
  context: { queryClient: QueryClient };
  search: { redirect?: string | undefined };
}) {
  const session = await context.queryClient.query(sessionQueryOptions());
  if (session) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw redirect({ to: search.redirect ?? '/notes' });
  }
}
