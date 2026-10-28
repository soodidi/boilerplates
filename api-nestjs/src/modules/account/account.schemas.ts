import { z } from 'zod';

/** GLB-013 : export des données de l'utilisateur, une section par contributeur du registre. */
export const accountExportResponseSchema = z.object({
  exportedAt: z.iso.datetime(),
  data: z.record(z.string(), z.unknown()),
});

export type AccountExportResponse = z.infer<typeof accountExportResponseSchema>;
