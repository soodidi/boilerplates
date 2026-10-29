import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { ForbiddenError } from '@/lib/errors';
import { adminUsersSchema } from '../schemas/admin';
import { unwrapProtected } from './auth-api';
import { authClient } from './auth-client';
import { permissionKeys } from './permissions-api';

/**
 * BE-010 : administration des comptes par les routes /v1/auth/admin/* du plugin `admin`.
 * L'API n'en ouvre que quelques-unes : lister, changer de rôle, bannir, révoquer les sessions.
 */
export const adminUserKeys = {
  all: ['admin-users'] as const,
  list: () => [...adminUserKeys.all, 'list'] as const,
};

/** Les 100 comptes les plus récents ; une app avec plus de comptes ajoutera recherche et pagination. */
export function adminUsersQueryOptions() {
  return queryOptions({
    queryKey: adminUserKeys.list(),
    queryFn: async () =>
      adminUsersSchema.parse(
        unwrapProtected(
          await authClient().admin.listUsers({
            query: { limit: 100, sortBy: 'createdAt', sortDirection: 'desc' },
            // Données personnelles (e-mails) : jamais dans le cache HTTP du navigateur.
            fetchOptions: { cache: 'no-store' },
          }),
        ),
      ),
  });
}

export type AdminUserAction =
  | { type: 'ban'; userId: string }
  | { type: 'unban'; userId: string }
  | { type: 'set-role'; userId: string; role: 'user' | 'admin' };

/** Bannir, lever le bannissement ou changer le rôle d'un compte, puis relire la liste. */
export function useAdminUserAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (action: AdminUserAction) => {
      const admin = authClient().admin;
      switch (action.type) {
        case 'ban':
          return unwrapProtected(await admin.banUser({ userId: action.userId }));
        case 'unban':
          return unwrapProtected(await admin.unbanUser({ userId: action.userId }));
        case 'set-role':
          return unwrapProtected(await admin.setRole({ userId: action.userId, role: action.role }));
      }
    },
    onError: (error) =>
      // Droit retiré pendant la session : les permissions en cache ne sont plus à jour.
      error instanceof ForbiddenError
        ? queryClient.invalidateQueries({ queryKey: permissionKeys.all })
        : undefined,
    onSettled: () => queryClient.invalidateQueries({ queryKey: adminUserKeys.all }),
  });
}
