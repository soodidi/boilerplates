// BE-007 / FE-009 : Sentry doit être initialisé avant tout autre import.
// Chargé avec `node --import ./dist/instrument.js dist/main.js` (scripts `start` et `dev`).
import * as Sentry from '@sentry/nestjs';
import { redactErrorEvent, redactSpan } from './common/sentry-redaction.js';

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
    release: process.env.APP_VERSION,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1,
    // RGPD (BE-006) : depuis le SDK v11 la collecte par défaut est large. On la restreint.
    dataCollection: {
      userInfo: false,
      cookies: false,
      // GLB-013 : les autres en-têtes partent avec la valeur `[Filtered]`. La liste compare par
      // sous-chaîne : `accept` laisserait passer `accept-language`.
      httpHeaders: {
        request: { allow: ['content-type', 'content-length'] },
        response: false,
      },
      httpBodies: [],
      databaseQueryData: false,
    },
    // BE-007 : le lien de réinitialisation (`/reset-password/<token>`) ne part jamais chez Sentry.
    beforeSend: redactErrorEvent,
    beforeSendSpan: redactSpan,
  });
}
