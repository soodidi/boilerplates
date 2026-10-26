// BE-003 / OPS-004 : appliqué par un job dédié AVANT le déploiement, jamais au démarrage de l'app.
// Usage : node dist/database/migrate.js (DATABASE_URL requis).
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL est requis pour appliquer les migrations.');
}

const pool = new Pool({ connectionString, max: 1 });
try {
  await migrate(drizzle({ client: pool }), { migrationsFolder: 'drizzle' });
  process.stdout.write('Migrations appliquées.\n');
} finally {
  await pool.end();
}
