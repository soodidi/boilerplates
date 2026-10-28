import { z } from 'zod';
import { NOTE_CONTENT_MAX, NOTE_TITLE_MAX } from './notes.table.js';

/** BE-005 : schémas stricts aux frontières. Les types sont dérivés, jamais écrits deux fois. */
export const createNoteSchema = z.strictObject({
  title: z.string().trim().min(1).max(NOTE_TITLE_MAX),
  content: z.string().trim().max(NOTE_CONTENT_MAX).default(''),
});

export const listNotesQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().max(200).optional(),
});

/** BE-005 : seuls les champs déclarés ici sortent de l'API. */
export const noteResponseSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  content: z.string(),
  createdAt: z.iso.datetime(),
});

/** GLB-013 : une note dans l'export des données de l'utilisateur. */
export const noteExportSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  content: z.string(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const notePageResponseSchema = z.object({
  data: z.array(noteResponseSchema),
  nextCursor: z.string().nullable(),
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type ListNotesQuery = z.infer<typeof listNotesQuerySchema>;
export type NoteResponse = z.infer<typeof noteResponseSchema>;
export type NoteExport = z.infer<typeof noteExportSchema>;
export type NotePageResponse = z.infer<typeof notePageResponseSchema>;
