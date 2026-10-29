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
      await db.execute(
        sql`truncate table notes, users, sessions, accounts, verifications, rate_limits restart identity cascade`,
      );
    },
    /** Identifiant d'un compte, pour les routes d'administration qui l'attendent. */
    async userId(email: string): Promise<string> {
      const result = await db.execute<{ id: string }>(
        sql`select id from users where email = ${email}`,
      );
      const id = result.rows[0]?.id;
      if (!id) throw new Error(`No user ${email}`);
      return id;
    },
    close: () => pool.end(),
  };
}
