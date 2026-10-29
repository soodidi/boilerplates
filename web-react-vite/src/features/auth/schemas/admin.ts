import { z } from 'zod';

/** FE-002 : réponse de `has-permission` (plugin `admin` de Better Auth), validée avant usage. */
export const hasPermissionSchema = z.object({ success: z.boolean() });

/** FE-002 : seuls les champs utilisés par l'écran d'administration, validés avant usage. */
export const adminUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.string().nullish(),
  banned: z.boolean().nullish(),
});

export const adminUsersSchema = z.object({ users: z.array(adminUserSchema), total: z.number() });

export type AdminUser = z.infer<typeof adminUserSchema>;
