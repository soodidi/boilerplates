import { fileURLToPath } from 'node:url';
import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// SWC compile les tests avec les métadonnées de décorateurs, nécessaires à l'injection NestJS.
const swcPlugin = swc.vite({ module: { type: 'es6' } });

export default defineConfig({
  plugins: [swcPlugin],
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/main.ts', 'src/instrument.ts', 'src/database/migrate.ts', 'src/**/*.spec.ts'],
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['src/**/*.spec.ts', 'scripts/**/*.spec.ts'],
          exclude: ['src/**/*.integration.spec.ts'],
        },
      },
      {
        // BE-008 : PostgreSQL réel dans un conteneur (Docker requis).
        extends: true,
        test: {
          name: 'integration',
          include: ['src/**/*.integration.spec.ts', 'test/**/*.e2e-spec.ts'],
          globalSetup: [fileURLToPath(new URL('./test/global-setup.ts', import.meta.url))],
          testTimeout: 30_000,
          hookTimeout: 120_000,
          fileParallelism: false,
        },
      },
    ],
  },
});
