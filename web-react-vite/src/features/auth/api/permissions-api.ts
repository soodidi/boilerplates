import { queryOptions, useQuery } from '@tanstack/react-query';
import { hasPermissionSchema } from '../schemas/admin';
import { AuthError, sessionQueryOptions } from './auth-api';
import { authClient } from './auth-client';

/** BE-010 : actions par ressource, comme dans `access-control.ts` de l'API (ex. `{ stats: ['read'] }`). */
export type Permissions = Record<string, string[]>;

/**
 * Hors de la clé `auth` : `resetUserCache` les supprime au changement de compte, comme toutes les
 * données d'un utilisateur.
 */
export const permissionKeys = {
  all: ['permissions'] as const,
  check: (permissions: Permissions) => [...permissionKeys.all, permissions] as const,
};

/**
 * BE-010 : l'API dit si l'utilisateur connecté a ces permissions (route `has-permission` du
 * plugin `admin`). Le web ne copie pas les règles de l'API : un repo par brique les ferait diverger.
 * Pour l'affichage seulement : chaque route de l'API vérifie elle-même. Session refusée : AuthError 401.
 */
export function permissionQueryOptions(permissions: Permissions) {
  return queryOptions({
    queryKey: permissionKeys.check(permissions),
    queryFn: async () => {
      // `$fetch` plutôt que `admin.hasPermission` : son type ne connaît que les ressources du plugin.
      const result = await authClient().$fetch('/admin/has-permission', {
        method: 'POST',
        body: { permissions },
      });
      if (result.error) throw new AuthError(result.error.status, undefined);
      return hasPermissionSchema.parse(result.data).success;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** Vrai si l'utilisateur connecté a ces permissions ; faux sans session, en attendant ou en erreur. */
export function useCan(permissions: Permissions): boolean {
  const { data: session } = useQuery(sessionQueryOptions());
  const { data: allowed } = useQuery({
    ...permissionQueryOptions(permissions),
    enabled: Boolean(session),
  });
  return Boolean(session) && allowed === true;
}
