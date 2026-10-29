import * as Sentry from '@sentry/react';
import { type ErrorComponentProps, Link, useRouter } from '@tanstack/react-router';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useMessages } from '@/i18n';
import { isForbidden, NetworkError } from '@/lib/errors';
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
  const isOffline = error instanceof NetworkError;
  const isExpected =
    isOffline || isForbidden(error) || (isProblemDetailsError(error) && error.isClientError);

  useEffect(() => {
    // Les erreurs attendues (4xx, API injoignable) ne sont pas envoyées à Sentry (FE-009).
    if (!isExpected) Sentry.captureException(error);
  }, [error, isExpected]);

  // BE-010 : connecté, mais sans la permission (garde de route ou 403 de l'API).
  if (isForbidden(error)) return <Forbidden />;

  if (isOffline) {
    return (
      <div role="alert" className="grid gap-4">
        <h1 className="text-2xl font-semibold">{m.errors.networkTitle}</h1>
        <p className="text-muted-foreground">{m.errors.networkDescription}</p>
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

  return (
    <div role="alert" className="grid gap-4">
      <h1 className="text-2xl font-semibold">{m.errors.title}</h1>
      <p className="text-muted-foreground">
        {isProblemDetailsError(error) && error.isClientError ? error.message : m.errors.description}
      </p>
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

/** BE-010 : « Accès refusé », avec un retour à l'accueil. */
export function Forbidden() {
  const m = useMessages();

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold">{m.errors.forbiddenTitle}</h1>
      <p className="text-muted-foreground">{m.errors.forbiddenDescription}</p>
      <p>
        <Link to="/" className="text-primary underline underline-offset-4">
          {m.errors.backHome}
        </Link>
      </p>
    </div>
  );
}

/** Page dont les données se chargent encore (au-delà d'une seconde, réglage du router). */
export function PageLoading() {
  const m = useMessages();

  return (
    <p aria-live="polite" className="text-muted-foreground">
      {m.app.loading}
    </p>
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
