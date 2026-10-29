import { Link } from '@tanstack/react-router';
import { useMessages } from '@/i18n';

/** BE-010 : une note absente ou d'un autre utilisateur (404 de l'API). */
export function NoteNotFound() {
  const m = useMessages();

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold">{m.notes.notFoundTitle}</h1>
      <p className="text-muted-foreground">{m.notes.notFoundDescription}</p>
      <p>
        <Link to="/notes" className="text-primary underline underline-offset-4">
          {m.notes.backToList}
        </Link>
      </p>
    </div>
  );
}
