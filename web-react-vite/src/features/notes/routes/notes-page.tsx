import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { useMessages } from '@/i18n';
import { notesQueryOptions } from '../api/notes-api';
import { CreateNoteForm } from '../components/create-note-form';
import { NoteList } from '../components/note-list';

const routeApi = getRouteApi('/notes');
const SEARCH_DEBOUNCE_MS = 300;

export function NotesPage() {
  const m = useMessages();
  const { q } = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const [search, setSearch] = useState(q);

  // FE-004 : la recherche est dans l'URL (partageable, survit au rechargement).
  useEffect(() => {
    if (search === q) return;
    const timeout = setTimeout(() => {
      void navigate({ search: { q: search }, replace: true });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(timeout);
    };
  }, [search, q, navigate]);

  // FE-004 : données serveur dans TanStack Query, jamais copiées dans un état local.
  const notesQuery = useQuery({ ...notesQueryOptions(q), placeholderData: keepPreviousData });

  return (
    <div className="grid gap-8">
      <h1 className="text-3xl font-semibold tracking-tight">{m.notes.title}</h1>

      <CreateNoteForm />

      <section aria-labelledby="notes-list-title" className="grid gap-4">
        <h2 id="notes-list-title" className="sr-only">
          {m.notes.listLabel}
        </h2>
        <FormField label={m.notes.searchLabel}>
          {(control) => (
            <Input
              {...control}
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
              }}
            />
          )}
        </FormField>

        {notesQuery.isPending ? (
          <p aria-live="polite" className="text-muted-foreground">
            {m.notes.loading}
          </p>
        ) : notesQuery.isError ? (
          <p role="alert" className="text-destructive">
            {m.errors.title}
          </p>
        ) : (
          <NoteList notes={notesQuery.data.data} query={q} />
        )}
      </section>
    </div>
  );
}
