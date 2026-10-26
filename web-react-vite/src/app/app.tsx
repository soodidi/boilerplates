import * as Sentry from '@sentry/react';
import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { I18nProvider, type Locale } from '@/i18n';
import { ErrorFallback } from './error-fallback';
import { type AppRouter } from './router';

type AppProps = {
  router: AppRouter;
  queryClient: QueryClient;
  locale: Locale;
};

export function App({ router, queryClient, locale }: AppProps) {
  return (
    <I18nProvider locale={locale}>
      {/* FE-009 : toute erreur de rendu non gérée est captée et envoyée à Sentry. */}
      <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </Sentry.ErrorBoundary>
    </I18nProvider>
  );
}
