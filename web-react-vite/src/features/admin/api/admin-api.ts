import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { adminUsersQueryOptions, permissionKeys, type Permissions } from '@/features/auth';
import { downloadJson } from '@/lib/download';
import { isForbidden } from '@/lib/errors';
import { request } from '@/lib/http';
import { adminStatsSchema, suspendedUserExportSchema } from '../schemas/admin';

/** BE-010 : permissions de la page, les mêmes que celles exigées par l'API pour ses données. */
export const ADMIN_PAGE_PERMISSIONS: Permissions = { stats: ['read'], user: ['list'] };

export const adminKeys = {
  all: ['admin'] as const,
  stats: () => [...adminKeys.all, 'stats'] as const,
};

export function adminStatsQueryOptions() {
  return queryOptions({
    queryKey: adminKeys.stats(),
    queryFn: ({ signal }) => request('/v1/admin/stats', { schema: adminStatsSchema, signal }),
  });
}

/** Compte réactivé, supprimé ou promu entre-temps par un autre admin : la carte n'est plus à jour. */
export function isStaleAccount(error: unknown): boolean {
  const status = (error as { status?: unknown } | null)?.status;
  return status === 404 || status === 409;
}

export function isWrongPassword(error: unknown): boolean {
  return (error as { status?: unknown } | null)?.status === 400;
}

/** Droit retiré pendant la session, ou compte qui a changé : les caches concernés sont relus. */
function useRefreshOnError() {
  const queryClient = useQueryClient();
  return (error: unknown) => {
    if (isForbidden(error)) void queryClient.invalidateQueries({ queryKey: permissionKeys.all });
    if (isStaleAccount(error)) {
      void queryClient.invalidateQueries({ queryKey: adminUsersQueryOptions().queryKey });
    }
  };
}

/**
 * GLB-013 : un compte suspendu ne peut plus exporter ses données ; l'admin télécharge le même fichier
 * que « Mon compte » et le lui envoie. L'API refuse un compte non suspendu (409) ou un admin (403).
 */
export function useExportSuspendedUser() {
  const onError = useRefreshOnError();
  return useMutation({
    mutationFn: async (userId: string) => {
      const result = await request(`/v1/admin/users/${userId}/export`, {
        schema: suspendedUserExportSchema,
      });
      downloadJson(`export-${userId}-${new Date().toLocaleDateString('sv-SE')}.json`, result);
    },
    onError,
  });
}

/**
 * GLB-013 : effacement complet d'un compte suspendu (données de tous les modules comprises), après
 * ressaisie du mot de passe de l'admin (400 s'il est faux).
 */
export function useEraseSuspendedUser() {
  const queryClient = useQueryClient();
  const onError = useRefreshOnError();
  return useMutation({
    mutationFn: ({ userId, password }: { userId: string; password: string }) =>
      request(`/v1/admin/users/${userId}/erase`, {
        method: 'POST',
        body: { password },
        schema: z.undefined(),
      }),
    onError,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: adminUsersQueryOptions().queryKey }),
        queryClient.invalidateQueries({ queryKey: adminKeys.stats() }),
      ]),
  });
}
