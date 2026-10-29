import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { AuthError } from './auth-api';
import { authClient } from './auth-client';

/**
 * BE-010 : administration des comptes par les routes /v1/auth/admin/* du plugin `admin`.
 * L'API n'en ouvre que quelques-unes : lister, changer de rôle, bannir, révoquer les sessions.
 */
export const ROLES = ['user', 'admin'] as const;
export type Role = (typeof ROLES)[number];

/** FE-002 : seuls les champs utilisés par l'écran, validés avant usage. */
export const adminUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.string().nullish(),
  banned: z.boolean().nullish(),
});

const adminUsersSchema = z.object({ users: z.array(adminUserSchema), total: z.number() });

export type AdminUser = z.infer<typeof adminUserSchema>;

export const adminUserKeys = {
  all: ['admin-users'] as const,
  list: () => [...adminUserKeys.all, 'list'] as const,
};

async function call<T>(
  promise: Promise<{ data: T | null; error: { status: number; code?: string } | null }>,
) {
  const result = await promise;
  if (result.error) throw new AuthError(result.error.status, result.error.code);
  return result.data;
}

/** Les 100 comptes les plus récents ; une app avec plus de comptes ajoutera recherche et pagination. */
export function adminUsersQueryOptions() {
  return queryOptions({
    queryKey: adminUserKeys.list(),
    queryFn: async () =>
      adminUsersSchema.parse(
        await call(
          authClient().admin.listUsers({
            query: { limit: 100, sortBy: 'createdAt', sortDirection: 'desc' },
          }),
        ),
      ),
  });
}

type UserAction =
  | { type: 'ban'; userId: string }
  | { type: 'unban'; userId: string }
  | { type: 'set-role'; userId: string; role: Role };

/** Bannir, lever le bannissement ou changer le rôle d'un compte, puis relire la liste. */
export function useAdminUserAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (action: UserAction) => {
      const admin = authClient().admin;
      switch (action.type) {
        case 'ban':
          return call(admin.banUser({ userId: action.userId }));
        case 'unban':
          return call(admin.unbanUser({ userId: action.userId }));
        case 'set-role':
          return call(admin.setRole({ userId: action.userId, role: action.role }));
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: adminUserKeys.all }),
  });
}
