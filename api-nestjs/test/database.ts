import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { type Database } from '../src/database/database.module.js';

/** Client Drizzle de test, connecté au conteneur démarré par global-setup. */
export function createTestDatabase(databaseUrl: string) {
  const pool = new Pool({ connectionString: databaseUrl, max: 2 });
  const db: Database = drizzle({ client: pool, casing: 'snake_case' });

  return {
    db,
    /** BE-008 : chaque test part d'une base propre. */
    async reset() {
      await db.execute(sql`truncate table notes restart identity cascade`);
    },
    close: () => pool.end(),
  };
}
