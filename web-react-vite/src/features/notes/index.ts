import { lazyRouteComponent } from '@tanstack/react-router';

// API publique de la feature (FE-003). Le reste de l'app n'importe que ce fichier.

/** Page chargée à la demande (FE-008 : routes en lazy). */
export const NotesPage = lazyRouteComponent(() => import('./routes/notes-page'), 'NotesPage');
export const NotePage = lazyRouteComponent(() => import('./routes/note-page'), 'NotePage');

export { NoteNotFound } from './components/note-not-found';

export { noteQueryOptions, notesQueryOptions, noteKeys } from './api/notes-api';
export { notesSearchSchema, type Note } from './schemas/note';
