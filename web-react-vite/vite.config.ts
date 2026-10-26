import { fileURLToPath, URL } from 'node:url';
import babel from '@rolldown/plugin-babel';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
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
