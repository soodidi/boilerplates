# Instructions pour les assistants IA

Ce projet suit [engineering-guidelines](https://github.com/soodidi/engineering-guidelines). Avant de coder, lire `adr/global/README.md` et `adr/backend/README.md` de ce repo.

## Règles à appliquer sans demander

- Nouveau domaine métier = nouveau dossier `src/modules/<nom>/` sur le modèle de `notes` : controller, service, repository, `*.table.ts`, `*.schemas.ts`, `index.ts` (BE-002).
- Un module n'importe que l'`index.ts` d'un autre module, jamais son repository ni ses tables. `npm run arch` le vérifie.
- Controller : validation (`@Body({ schema })`, `@Query({ schema })`), appel du service, mapping vers le schéma de réponse (`@SerializeOptions({ schema })`). Pas de règle métier, pas d'accès à la base.
- Imports relatifs avec l'extension `.js` (projet ESM). Ne pas convertir en `import type` une classe injectée par NestJS.
- Base de données : modifier le `*.table.ts`, puis `npm run db:generate`, relire le SQL, commiter. Migrations compatibles avec la version en production (expand/contract, BE-003). Jamais `drizzle-kit push`.
- Erreurs : lever des `HttpException` NestJS (`NotFoundException`, `ConflictException`…) ; le filtre global produit le Problem Details. Messages d'erreur en anglais, sans détail interne.
- Logs via le `Logger` NestJS (pino), jamais `console.log`, jamais de token ni de donnée personnelle (BE-007).
- Tests : service avec un fake du repository ; repository et endpoints contre PostgreSQL réel (`*.integration.spec.ts`, `test/*.e2e-spec.ts`). Jamais de mock de la base (BE-008).
- `npm run verify` doit passer avant de proposer une PR.
