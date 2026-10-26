# web-react-vite

Boilerplate frontend : **React 19 + TypeScript + Vite 8 + Tailwind 4**, TanStack Router et Query, React Hook Form + Zod, React Compiler, Sentry, Vitest + Testing Library + MSW, Playwright.

Il applique les ADR **FE-001 à FE-009** et les règles globales de [engineering-guidelines](https://github.com/soodidi/engineering-guidelines).

## Démarrer un projet

```bash
npx degit soodidi/boilerplates/web-react-vite mon-projet
cd mon-projet
git init -b main
npm install          # installe aussi les hooks Git (lefthook)
npx msw init public --save
npm run dev
```

Prérequis : Node 26 (voir `.nvmrc`), npm (fourni avec Node), [gitleaks](https://github.com/gitleaks/gitleaks#installing) pour le hook de pré-commit (`brew install gitleaks`).

L'app démarre avec des **mocks MSW** : la page Notes fonctionne sans backend. Pour brancher l'API, mettre son URL dans `public/config.json` et passer `enableMocks` à `false`.

À personnaliser : `name` dans `package.json`, titre dans `index.html`, `app.name` dans `src/i18n/fr.ts` et `en.ts`, couleurs dans `src/styles.css`.

## Scripts

| Commande                              | Rôle                                                                            |
| ------------------------------------- | ------------------------------------------------------------------------------- |
| `npm run dev`                         | Serveur de développement                                                        |
| `npm run build`                       | Build de production                                                             |
| `npm run test` / `npm run test:watch` | Tests unitaires et composants (Vitest)                                          |
| `npm run test:e2e`                    | Tests E2E (Playwright, sur le build de production)                              |
| `npm run verify`                      | Tout ce que vérifie la CI : format, lint, types, tests, build, taille du bundle |

## Organisation (FE-003)

```
src/
├── app/            # bootstrap : providers, routes, layout, écrans d'erreur
├── features/
│   ├── home/
│   └── notes/      # feature d'exemple complète
│       ├── api/        # requêtes + hooks TanStack Query
│       ├── components/
│       ├── routes/     # pages
│       ├── schemas/    # schémas Zod (types dérivés)
│       └── index.ts    # API publique de la feature
├── components/ui/  # composants génériques (design system)
├── i18n/           # textes de l'interface (GLB-007)
├── lib/            # config, client HTTP, Sentry, query client
├── mocks/          # handlers MSW (dev + tests)
└── test/           # setup Vitest et helpers de rendu
```

La feature `notes` est là pour montrer les patterns : la supprimer (et sa route dans `src/app/router.tsx`) une fois la première vraie feature en place.

## Ce qui est déjà en place

| Sujet                                                                 | Où                                                                                       | ADR              |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------- |
| Routes typées, recherche dans l'URL validée par Zod                   | `src/app/router.tsx`                                                                     | FE-001, FE-004   |
| Données serveur avec TanStack Query, query keys par feature           | `src/features/notes/api`                                                                 | FE-004           |
| Formulaire RHF + Zod, erreurs API reportées sur les champs, ARIA      | `src/features/notes/components/create-note-form.tsx`, `src/components/ui/form-field.tsx` | FE-006           |
| Client HTTP qui valide les réponses et lève des `ProblemDetailsError` | `src/lib/http.ts`                                                                        | FE-002, BE-004   |
| Tailwind avec tokens sémantiques, mode sombre, `cn()` + `cva`         | `src/styles.css`, `src/components/ui`                                                    | FE-005           |
| React Compiler                                                        | `vite.config.ts`                                                                         | FE-008           |
| Lien d'évitement, focus, `prefers-reduced-motion`, audit axe en E2E   | `src/app/root-layout.tsx`, `e2e/`                                                        | FE-008           |
| Sentry (RGPD), ErrorBoundary, erreurs de route, source maps en CI     | `src/lib/sentry.ts`, `src/app/error-fallback.tsx`                                        | FE-009           |
| Config d'exécution par environnement (`config.json`)                  | `src/lib/config.ts`, `.github/workflows/deploy-environment.yml`                          | OPS-004          |
| Hooks Git : format, lint, secrets, commitlint, tests au push          | `lefthook.yml`                                                                           | GLB-002, GLB-005 |
| CI : vérifications, E2E, gitleaks, titre de PR                        | `.github/workflows/ci.yml`                                                               | OPS-002          |
| Déploiement staging puis production (approbation) sur Object Storage  | `.github/workflows/deploy.yml`                                                           | OPS-004, OPS-005 |
| Templates de PR (Definition of Done) et de bug                        | `.github/`                                                                               | GLB-003, GLB-009 |

## Déploiement

Le workflow `deploy` construit l'app **une seule fois** par commit sur `main`, la publie en staging, puis en production après approbation dans GitHub. La configuration de chaque environnement (URL d'API, DSN Sentry) est écrite dans `config.json` au déploiement. Les secrets et variables à créer sont listés en tête de `.github/workflows/deploy.yml`. Le bucket et le CDN se créent avec le boilerplate `infra-scaleway`.

## Libs partagées

`eslint.config.js`, `prettier.config.js`, `commitlint.config.js` et `src/lib/problem-details.ts` sont des copies des packages `@soodidi/*` de `shared-libs`. Une fois ces packages publiés, les remplacer par des dépendances (GLB-010).
