import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { runMigrations } from './run-migrations.js';

// BE-003 : plusieurs instances qui démarrent en même temps ne se gênent pas.
describe('runMigrations (PostgreSQL)', () => {
  const adminUrl = inject('databaseUrl');
  const databaseName = `migrations_${Date.now()}`;
  let databaseUrl: string;

  async function admin<T>(run: (client: Client) => Promise<T>) {
    const client = new Client({ connectionString: adminUrl });
    await client.connect();
    try {
      return await run(client);
    } finally {
      await client.end();
    }
  }

  beforeAll(async () => {
    await admin((client) => client.query(`create database ${databaseName}`));
    const url = new URL(adminUrl);
    url.pathname = `/${databaseName}`;
    databaseUrl = url.toString();
  });

  afterAll(async () => {
    await admin((client) => client.query(`drop database if exists ${databaseName} with (force)`));
  });

  it('applies the migrations once when several instances start at the same time', async () => {
    await Promise.all([1, 2, 3, 4].map(() => runMigrations(databaseUrl)));

    const client = new Client({ connectionString: databaseUrl });
    await client.connect();
    try {
      const applied = await client.query(
        'select count(*)::int as count from drizzle.__drizzle_migrations',
      );
      const tables = await client.query(
        "select count(*)::int as count from information_schema.tables where table_name in ('notes', 'users')",
      );
      expect(applied.rows[0]).toEqual({ count: 1 });
      expect(tables.rows[0]).toEqual({ count: 2 });
    } finally {
      await client.end();
    }
  });
});
