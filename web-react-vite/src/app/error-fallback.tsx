import * as Sentry from '@sentry/react';
import { type ErrorComponentProps, Link, useRouter } from '@tanstack/react-router';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useMessages } from '@/i18n';
import { isProblemDetailsError } from '@/lib/problem-details';

/** Écran affiché par l'ErrorBoundary racine quand le rendu plante (FE-009). */
export function ErrorFallback() {
  const m = useMessages();

  return (
    <div role="alert" className="mx-auto grid max-w-md gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">{m.errors.title}</h1>
      <p className="text-muted-foreground">{m.errors.description}</p>
      <div>
        <Button
          onClick={() => {
            window.location.reload();
          }}
        >
          {m.errors.reload}
        </Button>
      </div>
    </div>
  );
}

/** Erreur dans une route (loader, rendu) : le reste de l'app reste utilisable. */
export function RouteError({ error }: ErrorComponentProps) {
  const m = useMessages();
  const router = useRouter();
  const isExpected = isProblemDetailsError(error) && error.isClientError;

  useEffect(() => {
    // Les erreurs attendues (4xx) ne sont pas envoyées à Sentry (FE-009).
    if (!isExpected) Sentry.captureException(error);
  }, [error, isExpected]);

  return (
    <div role="alert" className="grid gap-4">
      <h1 className="text-2xl font-semibold">{m.errors.title}</h1>
      <p className="text-muted-foreground">{isExpected ? error.message : m.errors.description}</p>
      <div>
        <Button
          variant="secondary"
          onClick={() => {
            void router.invalidate();
          }}
        >
          {m.errors.retry}
        </Button>
      </div>
    </div>
  );
}

export function NotFound() {
  const m = useMessages();

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold">{m.errors.notFoundTitle}</h1>
      <p>
        <Link to="/" className="text-primary underline underline-offset-4">
          {m.errors.backHome}
        </Link>
      </p>
    </div>
  );
}
