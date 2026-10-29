import { z } from 'zod';

/** BE-005 : seuls les champs déclarés ici sortent de l'API. Des nombres, aucune donnée personnelle. */
export const adminStatsResponseSchema = z.object({
  users: z.number().int(),
  notes: z.number().int(),
});

export type AdminStatsResponse = z.infer<typeof adminStatsResponseSchema>;
