import { z } from 'zod';

/** `?accountDeleted=true` : retour sur l'accueil après la suppression du compte (GLB-013). */
export const homeSearchSchema = z.object({
  accountDeleted: z.boolean().optional().catch(undefined),
});
