// BE-003 : les migrations s'appliquent au démarrage de l'API (main.ts). Ce script sert au
// développement local et aux interventions manuelles : node dist/database/migrate.js.
import { runMigrations } from './run-migrations.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL est requis pour appliquer les migrations.');
}

await runMigrations(connectionString);
process.stdout.write('Migrations appliquées.\n');
