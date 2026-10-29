import { queryOptions } from '@tanstack/react-query';
import { type Permissions } from '@/features/auth';
import { request } from '@/lib/http';
import { adminStatsSchema } from '../schemas/admin';

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
