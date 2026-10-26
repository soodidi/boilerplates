// BE-007 / FE-009 : Sentry doit être initialisé avant tout autre import.
// Chargé avec `node --import ./dist/instrument.js dist/main.js` (scripts `start` et `dev`).
import * as Sentry from '@sentry/nestjs';

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
      httpBodies: [],
      databaseQueryData: false,
    },
  });
}
