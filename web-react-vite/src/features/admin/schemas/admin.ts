import { z } from 'zod';

/** Contrat de `GET /v1/admin/stats` (BE-010) : des nombres, aucune donnée personnelle. */
export const adminStatsSchema = z.object({
  users: z.number().int(),
  notes: z.number().int(),
});

export type AdminStats = z.infer<typeof adminStatsSchema>;
