import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, ilike, type SQL, sql } from 'drizzle-orm';
import { DB, type Database, type Transaction } from '../../database/database.module.js';
import { type NewNote, type Note, notes } from './notes.table.js';

export type NoteCursor = { createdAt: Date; id: string };

type FindPageParams = {
  userId: string;
  q?: string | undefined;
  limit: number;
  cursor: NoteCursor | null;
};

/** BE-002 : seul endroit du module qui parle à la base. */
@Injectable()
export class NotesRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  async findPage({ userId, q, limit, cursor }: FindPageParams) {
    // BE-006 : toujours filtrer sur le propriétaire (protection IDOR).
    const conditions: SQL[] = [eq(notes.userId, userId)];
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

  /** BE-006 : la note n'est trouvée que pour son propriétaire (IDOR : celle d'un autre n'existe pas). */
  async findById(userId: string, id: string): Promise<Note | null> {
    const [note] = await this.db
      .select()
      .from(notes)
      .where(and(eq(notes.id, id), eq(notes.userId, userId)));
    return note ?? null;
  }

  async countAll(): Promise<number> {
    const [row] = await this.db.select({ value: count() }).from(notes);
    return row?.value ?? 0;
  }

  async insert(values: NewNote): Promise<Note> {
    const [note] = await this.db.insert(notes).values(values).returning();
    if (!note) throw new Error('Insert into notes returned no row');
    return note;
  }

  /** GLB-013 : toutes les notes de l'utilisateur, pour l'export de ses données. */
  findAllByUser(userId: string): Promise<Note[]> {
    return this.db
      .select()
      .from(notes)
      .where(eq(notes.userId, userId))
      .orderBy(desc(notes.createdAt), desc(notes.id));
  }

  /** GLB-013 : effacement dans la transaction de suppression du compte. */
  async deleteByUser(userId: string, tx: Transaction): Promise<void> {
    await tx.delete(notes).where(eq(notes.userId, userId));
  }
}

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}
