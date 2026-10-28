import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { ENV, type Env } from '../config/env.js';

/** Jeton d'injection du client Drizzle : `constructor(@Inject(DB) db: Database)`. */
export const DB = Symbol('DB');
export type Database = NodePgDatabase;
/** Transaction Drizzle ouverte par `db.transaction()` : mêmes requêtes que `Database`. */
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

const PG_POOL = Symbol('PG_POOL');

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [ENV],
      useFactory: (env: Env) => new Pool({ connectionString: env.DATABASE_URL, max: 10 }),
    },
    {
      provide: DB,
      inject: [PG_POOL],
      // BE-003 : colonnes en snake_case en base, camelCase dans le code.
      useFactory: (pool: Pool): Database => drizzle({ client: pool, casing: 'snake_case' }),
    },
  ],
  exports: [DB],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  // BE-007 : arrêt propre, les connexions sont fermées sur SIGTERM.
  async onApplicationShutdown() {
    await this.pool.end();
  }
}
