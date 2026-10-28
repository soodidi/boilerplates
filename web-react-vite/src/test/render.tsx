import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router';
import { render } from '@testing-library/react';
import { type ReactElement } from 'react';
import { createAppRouter } from '@/app/router';
import { configureAuthClient, createUnauthorizedHandler } from '@/features/auth';
import { I18nProvider, type Locale } from '@/i18n';
import { configureHttp } from '@/lib/http';

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  });
}

/** Rend un composant avec les providers de l'app (sans router). */
export function renderWithProviders(ui: ReactElement) {
  const queryClient = createTestQueryClient();
  return render(
    <I18nProvider locale="fr">
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </I18nProvider>,
  );
}

/** Rend l'app complète sur une URL donnée, avec un historique en mémoire (en français par défaut). */
export function renderRoute(url: string, { locale = 'fr' }: { locale?: Locale } = {}) {
  const queryClient = createTestQueryClient();
  const history = createMemoryHistory({ initialEntries: [url] });
  const router = createAppRouter({ queryClient, history });
  // Client d'auth neuf à chaque test : le SDK garde un état interne (session, requêtes en cours).
  configureAuthClient({ baseUrl: 'http://localhost:3000' });
  configureHttp({
    baseUrl: 'http://localhost:3000',
    onUnauthorized: createUnauthorizedHandler(queryClient, router),
  });
  const result = render(
    <I18nProvider locale={locale}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </I18nProvider>,
  );
  return { ...result, router };
}
