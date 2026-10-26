import { useMessages } from '@/i18n';
import { type Note } from '../schemas/note';

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

type NoteListProps = {
  notes: Note[];
  query: string;
};

export function NoteList({ notes, query }: NoteListProps) {
  const m = useMessages();

  if (notes.length === 0) {
    return (
      <p className="text-muted-foreground">{query ? m.notes.noResults(query) : m.notes.empty}</p>
    );
  }

  return (
    <ul aria-label={m.notes.listLabel} className="grid gap-3">
      {notes.map((note) => (
        <li key={note.id} className="rounded-md border border-border p-4">
          <h3 className="font-medium">{note.title}</h3>
          {note.content ? (
            <p className="mt-1 text-sm whitespace-pre-line text-muted-foreground">{note.content}</p>
          ) : null}
          <time dateTime={note.createdAt} className="mt-2 block text-xs text-muted-foreground">
            {dateFormatter.format(new Date(note.createdAt))}
          </time>
        </li>
      ))}
    </ul>
  );
}
