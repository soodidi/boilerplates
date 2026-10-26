import * as Sentry from '@sentry/react';
import { type AppRouter } from '@/app/router';
import { type AppConfig } from './config';
import { isProblemDetailsError } from './problem-details';

/** FE-009 : suivi des erreurs. Sans DSN (développement local), Sentry n'est pas initialisé. */
export function initSentry(config: AppConfig, router: AppRouter) {
  if (!config.sentryDsn) return;

  Sentry.init({
    dsn: config.sentryDsn,
    environment: config.environment,
    release: import.meta.env.VITE_APP_VERSION,
    integrations: [Sentry.tanstackRouterBrowserTracingIntegration(router)],
    tracesSampleRate: config.environment === 'production' ? 0.1 : 1,
    // Les en-têtes de trace ne partent que vers notre API (corrélation avec BE-007).
    tracePropagationTargets: config.apiUrl ? [config.apiUrl] : [/^\//],
    // RGPD : depuis le SDK v11, la collecte par défaut est large. On la restreint.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpBodies: [],
    },
    beforeSend(event, hint) {
      const error = hint.originalException;
      // Les erreurs attendues (4xx) sont gérées dans l'UI, pas dans Sentry.
      if (isProblemDetailsError(error) && error.isClientError) return null;
      return event;
    },
  });
}

/** Identifie l'utilisateur par son identifiant interne uniquement, jamais son e-mail (FE-009). */
export function setSentryUser(userId: string | null) {
  Sentry.setUser(userId ? { id: userId } : null);
}
