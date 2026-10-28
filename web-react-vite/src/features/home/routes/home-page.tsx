import { getRouteApi, Link } from '@tanstack/react-router';
import { useMessages } from '@/i18n';

const routeApi = getRouteApi('/');

export function HomePage() {
  const m = useMessages();
  const { accountDeleted } = routeApi.useSearch();

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
