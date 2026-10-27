import { fileURLToPath, URL } from 'node:url';
import babel from '@rolldown/plugin-babel';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

/**
 * `npm run dev:api` : le front de dev parle à l'API locale (`npm run dev` ou `npm run stack`
 * dans api-nestjs) au lieu des mocks MSW. Seul le config.json servi change (OPS-004).
 */
function localApiConfig(): Plugin {
  const config = {
    environment: 'development',
    apiUrl: 'http://localhost:3000',
    sentryDsn: '',
    enableMocks: false,
  };
  return {
    name: 'local-api-config',
    // Actif seulement avec `vite --mode api` : le config.json de public/ reste servi sinon.
    apply: (_config, { command, mode }) => command === 'serve' && mode === 'api',
    configureServer(server) {
      server.middlewares.use('/config.json', (_request, response) => {
        response.setHeader('Content-Type', 'application/json');
        response.end(JSON.stringify(config));
      });
    },
  };
}

export default defineConfig({
  plugins: [
    localApiConfig(),
    react(),
    // FE-008 : React Compiler, mémoïsation automatique (pas de useMemo/useCallback manuels).
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
    // FE-009 : en CI, envoie les source maps à Sentry puis les supprime de dist/.
    sentryVitePlugin({
      disable: !process.env.SENTRY_AUTH_TOKEN,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      release: { name: process.env.VITE_APP_VERSION },
      sourcemaps: { filesToDeleteAfterUpload: ['./dist/**/*.map'] },
      telemetry: false,
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    // Source maps générées pour Sentry mais non référencées dans les bundles publiés.
    sourcemap: 'hidden',
  },
});
