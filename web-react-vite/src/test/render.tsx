import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router';
import { render } from '@testing-library/react';
import { type ReactElement } from 'react';
import { createAppRouter } from '@/app/router';
import { I18nProvider } from '@/i18n';

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

/** Rend l'app complète sur une URL donnée, avec un historique en mémoire. */
export function renderRoute(url: string) {
  const queryClient = createTestQueryClient();
  const history = createMemoryHistory({ initialEntries: [url] });
  const router = createAppRouter({ queryClient, history });
  const result = render(
    <I18nProvider locale="fr">
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </I18nProvider>,
  );
  return { ...result, router };
}
