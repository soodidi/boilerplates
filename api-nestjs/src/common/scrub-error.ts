import { stdSerializers } from 'pino';

// Drizzle met les paramètres d'une requête en échec dans le message (`Failed query: …\nparams: …`).
const PARAMS = /\nparams: [\s\S]*?(?=\n {4}at |$)/;
// Valeurs d'une requête (`params`) et détail PostgreSQL (`Key (email)=(…) already exists`).
const PERSONAL_KEYS = new Set(['params', 'detail']);

/** GLB-013 : texte d'erreur sans les valeurs de la requête SQL (contenu, e-mail, identifiant). */
export function scrubErrorText(text: string): string {
  return text.replace(PARAMS, '\nparams: [redacted]');
}

function scrub(value: unknown): unknown {
  if (typeof value === 'string') return scrubErrorText(value);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !PERSONAL_KEYS.has(key))
      .map(([key, item]) => [key, scrub(item)]),
  );
}

/** BE-007 : sérialiseur `err` des logs, sans données personnelles issues de la base. */
export function serializeError(error: Error): unknown {
  return scrub(stdSerializers.err(error));
}
