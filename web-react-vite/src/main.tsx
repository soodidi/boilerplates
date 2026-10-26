import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/app';
import { createAppRouter } from '@/app/router';
import { detectLocale } from '@/i18n';
import { loadConfig } from '@/lib/config';
import { configureHttp } from '@/lib/http';
import { createQueryClient } from '@/lib/query-client';
import { initSentry } from '@/lib/sentry';
import './styles.css';

async function bootstrap() {
  // OPS-004 : la config d'environnement est lue au démarrage (public/config.json), pas au build.
  const config = await loadConfig();
  configureHttp({ baseUrl: config.apiUrl });

  if (config.enableMocks) {
    // Import dynamique : MSW n'est jamais chargé quand les mocks sont désactivés.
    const { startMockWorker } = await import('@/mocks/browser');
    await startMockWorker();
  }

  const queryClient = createQueryClient();
  const router = createAppRouter({ queryClient });
  initSentry(config, router);

  const container = document.getElementById('root');
  if (!container) throw new Error('Élément #root introuvable dans index.html');

  createRoot(container).render(
    <StrictMode>
      <App router={router} queryClient={queryClient} locale={detectLocale()} />
    </StrictMode>,
  );
}

bootstrap().catch((error: unknown) => {
  console.error(error);
  document.body.textContent =
    "L'application n'a pas pu démarrer. Réessayez dans quelques instants.";
});
