import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { request } from '@/lib/http';
import { type CreateNoteInput, noteSchema, notePageSchema } from '../schemas/note';

/** FE-004 : factory de query keys par feature, pour des invalidations précises. */
export const noteKeys = {
  all: ['notes'] as const,
  list: (q: string) => [...noteKeys.all, 'list', { q }] as const,
  detail: (id: string) => [...noteKeys.all, 'detail', id] as const,
};

function fetchNotes(q: string, signal: AbortSignal) {
  const params = new URLSearchParams({ limit: '20' });
  if (q) params.set('q', q);
  return request(`/v1/notes?${params.toString()}`, { schema: notePageSchema, signal });
}

function createNote(input: CreateNoteInput) {
  return request('/v1/notes', { method: 'POST', body: input, schema: noteSchema });
}

export function notesQueryOptions(q: string) {
  return queryOptions({
    queryKey: noteKeys.list(q),
    queryFn: ({ signal }) => fetchNotes(q, signal),
  });
}

/** BE-010 : 404 si la note n'existe pas ou appartient à un autre utilisateur. */
export function noteQueryOptions(id: string) {
  return queryOptions({
    queryKey: noteKeys.detail(id),
    queryFn: ({ signal }) =>
      request(`/v1/notes/${encodeURIComponent(id)}`, { schema: noteSchema, signal }),
  });
}

export function useCreateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createNote,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: noteKeys.all }),
  });
}
