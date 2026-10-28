import { Link, useRouterState } from '@tanstack/react-router';
import { useMessages } from '@/i18n';

export function HomePage() {
  const m = useMessages();
  // Posé par la suppression du compte, dans l'état d'historique : un lien ne peut pas l'afficher.
  const accountDeleted = useRouterState({ select: (state) => state.location.state.accountDeleted });

  return (
    <section className="grid gap-4">
      {accountDeleted ? (
        <p role="status" className="rounded-md border border-border bg-muted px-4 py-3 text-sm">
          {m.home.accountDeleted}
        </p>
      ) : null}
      <h1 className="text-3xl font-semibold tracking-tight">{m.home.title}</h1>
      <p className="max-w-prose text-muted-foreground">{m.home.description}</p>
      <p>
        <Link to="/notes" className="font-medium text-primary underline underline-offset-4">
          {m.home.cta}
        </Link>
      </p>
    </section>
  );
}
