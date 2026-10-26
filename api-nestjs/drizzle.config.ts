import { defineConfig } from 'drizzle-kit';

// BE-003 : migrations générées par `npm run db:generate`, relues, puis commitées.
// `drizzle-kit push` est interdit hors base locale jetable.
export default defineConfig({
  dialect: 'postgresql',
  // BE-002 : chaque module possède ses tables (fichiers *.table.ts).
  schema: './src/modules/*/*.table.ts',
  out: './drizzle',
  casing: 'snake_case',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://app:app@localhost:5432/app',
  },
  strict: true,
  verbose: true,
});
