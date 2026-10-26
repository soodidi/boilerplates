// Valeurs transmises par test/global-setup.ts aux fichiers de test (vitest `inject`).
// Seule une `interface` peut être fusionnée avec celle de Vitest.
/* eslint-disable @typescript-eslint/consistent-type-definitions */
declare module 'vitest' {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}

export {};
