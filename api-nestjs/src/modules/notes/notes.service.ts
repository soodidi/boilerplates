import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';
import { type NoteCursor, NotesRepository } from './notes.repository.js';
import { type CreateNoteInput, type ListNotesQuery } from './notes.schemas.js';
import { type Note } from './notes.table.js';

const cursorSchema = z.object({ c: z.iso.datetime(), i: z.uuid() });

export function encodeCursor(cursor: NoteCursor): string {
  return Buffer.from(JSON.stringify({ c: cursor.createdAt.toISOString(), i: cursor.id })).toString(
    'base64url',
  );
}

export function decodeCursor(value: string): NoteCursor {
  try {
    const parsed = cursorSchema.parse(JSON.parse(Buffer.from(value, 'base64url').toString('utf8')));
    return { createdAt: new Date(parsed.c), id: parsed.i };
  } catch {
    throw new BadRequestException('Invalid cursor');
  }
}

/** BE-002 : règles métier du module. Ne connaît ni HTTP ni le SQL. Chaque note appartient à un utilisateur. */
@Injectable()
export class NotesService {
  constructor(private readonly repository: NotesRepository) {}

  async list(
    userId: string,
    query: ListNotesQuery,
  ): Promise<{ notes: Note[]; nextCursor: string | null }> {
    const cursor = query.cursor ? decodeCursor(query.cursor) : null;
    const page = await this.repository.findPage({
      userId,
      q: query.q,
      limit: query.limit,
      cursor,
    });
    return {
      notes: page.notes,
      nextCursor: page.nextCursor ? encodeCursor(page.nextCursor) : null,
    };
  }

  /** BE-010 : 404, jamais 403, pour la note d'un autre : son existence n'est pas révélée. */
  async get(userId: string, id: string): Promise<Note> {
    const note = await this.repository.findById(userId, id);
    if (!note) throw new NotFoundException('Note not found');
    return note;
  }

  create(userId: string, input: CreateNoteInput): Promise<Note> {
    return this.repository.insert({ ...input, userId });
  }

  /** Nombre total de notes, tous comptes confondus (statistiques d'administration). */
  count(): Promise<number> {
    return this.repository.countAll();
  }
}
