import { Inject, Injectable } from '@nestjs/common';
import { and, desc, ilike, type SQL, sql } from 'drizzle-orm';
import { DB, type Database } from '../../database/database.module.js';
import { type NewNote, type Note, notes } from './notes.table.js';

export type NoteCursor = { createdAt: Date; id: string };

type FindPageParams = {
  q?: string | undefined;
  limit: number;
  cursor: NoteCursor | null;
};

/** BE-002 : seul endroit du module qui parle à la base. */
@Injectable()
export class NotesRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  async findPage({ q, limit, cursor }: FindPageParams) {
    const conditions: SQL[] = [];
    if (q) conditions.push(ilike(notes.title, `%${escapeLike(q)}%`));
    if (cursor) {
      conditions.push(sql`(${notes.createdAt}, ${notes.id}) < (${cursor.createdAt}, ${cursor.id})`);
    }

    // BE-004 : pagination par curseur ; on lit une ligne de plus pour savoir s'il reste des résultats.
    const rows = await this.db
      .select()
      .from(notes)
      .where(and(...conditions))
      .orderBy(desc(notes.createdAt), desc(notes.id))
      .limit(limit + 1);

    const page = rows.slice(0, limit);
    const last = page.at(-1);
    const nextCursor: NoteCursor | null =
      rows.length > limit && last ? { createdAt: last.createdAt, id: last.id } : null;

    return { notes: page, nextCursor };
  }

  async insert(values: NewNote): Promise<Note> {
    const [note] = await this.db.insert(notes).values(values).returning();
    if (!note) throw new Error('Insert into notes returned no row');
    return note;
  }
}

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}
