// Fichier .env de développement : créé ou complété depuis .env.example (GLB-005).
// Sans dépendance, pour pouvoir tourner avant même `npm install`.
import { randomBytes } from 'node:crypto';

/** Variables dont la valeur de développement est générée à la création du .env. */
export const GENERATED = {
  BETTER_AUTH_SECRET: () => randomBytes(32).toString('base64'),
};

/** Noms des variables définies dans un contenu de type .env. */
export function keysOf(content) {
  return new Set(
    content
      .split('\n')
      .map((line) => /^([A-Z0-9_]+)=/.exec(line.trim())?.[1])
      .filter(Boolean),
  );
}

/** Remplace la valeur des variables générées par une valeur aléatoire. */
function withGeneratedValues(content) {
  return content
    .split('\n')
    .map((line) => {
      const key = /^([A-Z0-9_]+)=/.exec(line)?.[1];
      return key && GENERATED[key] ? `${key}=${GENERATED[key]()}` : line;
    })
    .join('\n');
}

/** Valeur d'une variable dans un contenu de type .env. */
function valueOf(content, key) {
  return new RegExp(`^${key}=(.*)$`, 'm').exec(content)?.[1];
}

/**
 * Un .env copié à la main depuis l'exemple garde la valeur d'exemple des secrets : elle est
 * publique (commitée), donc remplacée par une valeur générée.
 */
function withRegeneratedPlaceholders(example, current) {
  let content = current;
  for (const [key, generate] of Object.entries(GENERATED)) {
    const placeholder = valueOf(example, key);
    if (placeholder !== undefined && valueOf(content, key) === placeholder) {
      content = content.replace(new RegExp(`^${key}=.*$`, 'm'), `${key}=${generate()}`);
    }
  }
  return content;
}

/**
 * Idempotent : sans .env, le crée depuis l'exemple (secrets générés) ; avec un .env existant,
 * n'y ajoute que les variables apparues depuis dans l'exemple, sans toucher aux valeurs.
 * Renvoie le nouveau contenu (ou `null` si rien ne change) et les variables ajoutées.
 */
export function syncEnv(example, original) {
  let current = original;
  if (current === null) {
    return { content: withGeneratedValues(example), added: [...keysOf(example)] };
  }
  current = withRegeneratedPlaceholders(example, current);
  const existing = keysOf(current);
  const missing = example.split('\n').filter((line) => {
    const key = /^([A-Z0-9_]+)=/.exec(line.trim())?.[1];
    return key && !existing.has(key);
  });
  if (missing.length === 0) {
    return current === original ? { content: null, added: [] } : { content: current, added: [] };
  }
  const block = withGeneratedValues(missing.join('\n'));
  const content = `${current.trimEnd()}\n\n# Ajouté par npm run setup\n${block}\n`;
  return { content, added: [...keysOf(block)] };
}
