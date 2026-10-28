import { z } from 'zod';
import { type Messages } from '@/i18n';

/** FE-002 : réponse de `GET /v1/account/export`, une section par module de l'API (GLB-013). */
export const accountExportSchema = z.object({
  exportedAt: z.iso.datetime(),
  data: z.record(z.string(), z.unknown()),
});

export type AccountExport = z.infer<typeof accountExportSchema>;

/** Ressaisie du mot de passe et confirmation explicite avant la suppression. */
export const deleteAccountFormSchema = (m: Messages) =>
  z.object({
    password: z.string().min(1, { error: m.validation.required }),
    confirm: z.boolean().refine((checked) => checked, { error: m.account.delete.confirmRequired }),
  });
