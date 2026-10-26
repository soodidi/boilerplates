/// <reference types="vite/client" />

// Augmentation des types de Vite : seule une `interface` peut être fusionnée.
/* eslint-disable @typescript-eslint/consistent-type-definitions */
interface ImportMetaEnv {
  /** SHA du commit, injecté par la CI au build (release Sentry, FE-009). */
  readonly VITE_APP_VERSION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
