/**
 * BE-007 : masque les tokens d'URL (`?token=…`, `/reset-password/<token>`) avant tout envoi
 * hors de l'API (logs, Sentry). Un lien de réinitialisation suffit à prendre le compte.
 */
export function redactUrl(url: string): string {
  return url
    .replace(/([?&]token=)[^&\s]+/g, '$1[redacted]')
    .replace(/(\/reset-password\/)[^/?\s]+/g, '$1[redacted]');
}

type SerializedRequest = { id?: unknown; method?: string; url?: string };

/**
 * GLB-013 : une requête dans les logs se limite à son identifiant, sa méthode et son URL masquée.
 * Ni adresse IP, ni en-têtes (navigateur, `X-Forwarded-For`) : ce sont des données personnelles.
 */
export function serializeRequest(request: SerializedRequest): SerializedRequest {
  return {
    id: request.id,
    method: request.method,
    ...(request.url === undefined ? {} : { url: redactUrl(request.url) }),
  };
}
