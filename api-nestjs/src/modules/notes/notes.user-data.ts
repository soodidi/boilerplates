import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { ContributesUserData, type UserDataContributor } from '../../common/user-data/index.js';
import { type Transaction } from '../../database/database.module.js';
import { NotesRepository } from './notes.repository.js';
import { type NoteExport, noteExportSchema } from './notes.schemas.js';
import { notes } from './notes.table.js';

/** GLB-013 : les notes de l'utilisateur, exportées et effacées avec son compte. */
@ContributesUserData()
@Injectable()
export class NotesUserData implements UserDataContributor<NoteExport[]> {
  readonly key = 'notes';
  readonly tables = [notes];
  readonly schema = z.array(noteExportSchema);

  constructor(private readonly repository: NotesRepository) {}

  async export(userId: string): Promise<NoteExport[]> {
    const rows = await this.repository.findAllByUser(userId);
    return rows.map((note) => ({
      id: note.id,
      title: note.title,
      content: note.content,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    }));
  }

  erase(userId: string, tx: Transaction): Promise<void> {
    return this.repository.deleteByUser(userId, tx);
  }
}
