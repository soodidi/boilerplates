import { glob } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { is } from 'drizzle-orm';
import { getTableConfig, type PgColumn, PgTable } from 'drizzle-orm/pg-core';

// Indépendant du dossier courant : sinon le test d'architecture ne trouverait aucune table.
const SRC = fileURLToPath(new URL('../src/', import.meta.url));

const toSnakeCase = (name: string) =>
  name.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

/** GLB-013 : toutes les tables Drizzle de `src/` qui ont une colonne `user_id`, avec cette colonne. */
export async function findUserTables(): Promise<{ table: PgTable; userId: PgColumn }[]> {
  const found: { table: PgTable; userId: PgColumn }[] = [];
  for await (const file of glob('**/*.table.ts', { cwd: SRC })) {
    const exports = (await import(resolve(SRC, file))) as Record<string, unknown>;
    for (const value of Object.values(exports)) {
      if (!is(value, PgTable)) continue;
      const userId = getTableConfig(value).columns.find(
        (column) => toSnakeCase(column.name) === 'user_id',
      );
      if (userId) found.push({ table: value, userId });
    }
  }
  return found;
}
