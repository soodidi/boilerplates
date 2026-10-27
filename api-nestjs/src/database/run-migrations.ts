import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

/** Identifiant du verrou PostgreSQL réservé aux migrations (valeur arbitraire, propre à l'app). */
export const MIGRATION_LOCK_ID = 7_342_011;

/**
 * BE-003 / OPS-004 : applique les migrations en attente, sous un verrou PostgreSQL de session.
 * Plusieurs instances qui démarrent en même temps passent l'une après l'autre : la première
 * migre, les suivantes n'ont plus rien à faire. Lève une erreur si une migration échoue.
 */
export async function runMigrations(connectionString: string, migrationsFolder = 'drizzle') {
  const pool = new Pool({ connectionString, max: 1 });
  const client = await pool.connect();
  try {
    await client.query('select pg_advisory_lock($1)', [MIGRATION_LOCK_ID]);
    try {
      await migrate(drizzle({ client }), { migrationsFolder });
    } finally {
      await client.query('select pg_advisory_unlock($1)', [MIGRATION_LOCK_ID]);
    }
  } finally {
    client.release();
    await pool.end();
  }
}
