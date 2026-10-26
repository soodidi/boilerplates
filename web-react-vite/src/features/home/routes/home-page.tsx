import { Link } from '@tanstack/react-router';
import { useMessages } from '@/i18n';

export function HomePage() {
  const m = useMessages();

  return (
    <section className="grid gap-4">
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
