import { index, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { v7 as uuidv7 } from 'uuid';

export const NOTE_TITLE_MAX = 120;
export const NOTE_CONTENT_MAX = 2000;

/**
 * BE-003 : table au pluriel, UUID v7, timestamptz en UTC, created_at / updated_at.
 * Précision à la milliseconde pour que la pagination par curseur soit exacte avec les dates JS.
 */
export const notes = pgTable(
  'notes',
  {
    id: uuid()
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    // BE-006 : propriétaire de la note. Pas de clé étrangère vers `users`, qui appartient au
    // module auth (BE-002). La suppression de compte n'est pas encore activée : quand elle le sera
    // (RGPD), un hook `user.delete.after` du module auth supprimera les notes via `notes/index.ts`.
    userId: uuid().notNull(),
    title: varchar({ length: NOTE_TITLE_MAX }).notNull(),
    content: text().notNull().default(''),
    createdAt: timestamp({ withTimezone: true, precision: 3 }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('notes_user_id_created_at_id_idx').on(
      table.userId,
      table.createdAt.desc(),
      table.id.desc(),
    ),
  ],
);

export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
