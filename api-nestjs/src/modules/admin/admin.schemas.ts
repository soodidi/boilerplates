import { z } from 'zod';

/** BE-005 : seuls les champs déclarés ici sortent de l'API. Des nombres, aucune donnée personnelle. */
export const adminStatsResponseSchema = z.object({
  users: z.number().int(),
  notes: z.number().int(),
});

export type AdminStatsResponse = z.infer<typeof adminStatsResponseSchema>;

/** GLB-013 : l'effacement d'un compte suspendu exige la ressaisie du mot de passe de l'admin. */
export const eraseUserSchema = z.strictObject({ password: z.string().min(1).max(256) });

export type EraseUserInput = z.infer<typeof eraseUserSchema>;
