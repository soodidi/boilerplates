import { useMutation } from '@tanstack/react-query';
import { downloadJson } from '@/lib/download';
import { request } from '@/lib/http';
import { accountExportSchema } from '../schemas/account';

/** GLB-013 : droit d'accès. L'export n'est pas mis en cache : il est téléchargé aussitôt. */
export function useExportAccount() {
  return useMutation({
    mutationFn: async () => {
      const result = await request('/v1/account/export', { schema: accountExportSchema });
      // Date du jour, en heure locale (AAAA-MM-JJ).
      downloadJson(`export-${new Date().toLocaleDateString('sv-SE')}.json`, result);
    },
  });
}
