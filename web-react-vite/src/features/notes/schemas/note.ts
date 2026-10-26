import { z } from 'zod';
import { type Messages } from '@/i18n';

export const NOTE_TITLE_MAX = 120;
export const NOTE_CONTENT_MAX = 2000;

/** Contrat de l'API (BE-004). À générer depuis la spec OpenAPI quand elle est publiée (FE-006). */
export const noteSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  content: z.string(),
  createdAt: z.iso.datetime(),
});

export const notePageSchema = z.object({
  data: z.array(noteSchema),
  nextCursor: z.string().nullable(),
});

export type Note = z.infer<typeof noteSchema>;
export type NotePage = z.infer<typeof notePageSchema>;

/** Paramètres d'URL de la page Notes (FE-004). Une valeur invalide retombe sur la valeur par défaut. */
export const notesSearchSchema = z.object({
  q: z.string().max(100).default('').catch(''),
});

/** Schéma du formulaire : le type est dérivé du schéma, jamais écrit à la main (FE-006). */
export function createNoteFormSchema(m: Messages) {
  return z.object({
    title: z
      .string()
      .trim()
      .min(1, m.validation.required)
      .max(NOTE_TITLE_MAX, m.validation.tooLong(NOTE_TITLE_MAX)),
    content: z.string().trim().max(NOTE_CONTENT_MAX, m.validation.tooLong(NOTE_CONTENT_MAX)),
  });
}

export type CreateNoteInput = z.infer<ReturnType<typeof createNoteFormSchema>>;
