import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { adminUsersQueryOptions, type Permissions } from '@/features/auth';
import { downloadJson } from '@/lib/download';
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

/**
 * GLB-013 : un compte suspendu ne peut plus exporter ses données ; l'admin télécharge le même fichier
 * que « Mon compte » et le lui envoie. L'API refuse un compte non suspendu (409) ou un admin (403).
 */
export function useExportSuspendedUser() {
  return useMutation({
    mutationFn: async (userId: string) => {
      const result = await request(`/v1/admin/users/${userId}/export`, {
        schema: suspendedUserExportSchema,
      });
      downloadJson(`export-${userId}-${new Date().toLocaleDateString('sv-SE')}.json`, result);
    },
  });
}

/** GLB-013 : effacement complet d'un compte suspendu (données de tous les modules comprises). */
export function useEraseSuspendedUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      request(`/v1/admin/users/${userId}`, { method: 'DELETE', schema: z.undefined() }),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: adminUsersQueryOptions().queryKey }),
        queryClient.invalidateQueries({ queryKey: adminKeys.stats() }),
      ]),
  });
}
