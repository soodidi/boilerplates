import { existsSync } from 'node:fs';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { type TestProject } from 'vitest/node';

// BE-008 : un PostgreSQL réel, démarré une fois pour toute la suite d'intégration,
// avec les vraies migrations. Même version majeure qu'en production (OPS-005).
const POSTGRES_IMAGE = 'postgres:17-alpine';

let container: StartedPostgreSqlContainer | undefined;

export async function setup(project: TestProject) {
  if (!existsSync('drizzle/meta/_journal.json')) {
    throw new Error(
      'Aucune migration trouvée : lancer `npm run db:generate` puis commiter le dossier drizzle/.',
    );
  }

  // TEST_DATABASE_URL : base déjà démarrée (poste sans Docker). Elle doit être vide et jetable.
  let databaseUrl = process.env.TEST_DATABASE_URL;
  if (!databaseUrl) {
    container = await new PostgreSqlContainer(POSTGRES_IMAGE).start();
    databaseUrl = container.getConnectionUri();
  }

  const pool = new Pool({ connectionString: databaseUrl, max: 1 });
  try {
    await migrate(drizzle({ client: pool }), { migrationsFolder: 'drizzle' });
  } finally {
    await pool.end();
  }

  project.provide('databaseUrl', databaseUrl);
}

export async function teardown() {
  await container?.stop();
}
