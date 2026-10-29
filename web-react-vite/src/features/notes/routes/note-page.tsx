import { useSuspenseQuery } from '@tanstack/react-query';
import { getRouteApi, Link } from '@tanstack/react-router';
import { useMessages } from '@/i18n';
import { noteQueryOptions } from '../api/notes-api';

const routeApi = getRouteApi('/notes/$id');
const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'long' });

/** Détail d'une note. Le loader de la route l'a déjà chargée, ou a affiché « Note introuvable ». */
export function NotePage() {
  const m = useMessages();
  const { id } = routeApi.useParams();
  const { data: note } = useSuspenseQuery(noteQueryOptions(id));

  return (
    <article className="grid gap-4">
      <p>
        <Link to="/notes" className="text-sm text-primary underline underline-offset-4">
          {m.notes.backToList}
        </Link>
      </p>
      <h1 className="text-3xl font-semibold tracking-tight">{note.title}</h1>
      <p className="text-sm text-muted-foreground">
        <time dateTime={note.createdAt}>
          {m.notes.createdOn(dateFormatter.format(new Date(note.createdAt)))}
        </time>
      </p>
      {note.content ? <p className="whitespace-pre-line">{note.content}</p> : null}
    </article>
  );
}
