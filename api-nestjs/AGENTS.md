# Instructions pour les assistants IA

Ce projet suit [engineering-guidelines](https://github.com/soodidi/engineering-guidelines). Copie locale : chemin indiqué dans `~/.claude/CLAUDE.md`, par défaut `~/Documents/projects/engineering-guidelines`. Avant de coder, y lire `adr/global/README.md` et `adr/backend/README.md`.

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

## Travail avec l'IA (GLB-011)

- Une fonctionnalité passe par `/feature <issue>` : plan validé par un humain, code, vérification, contrôles par les agents `reviewer`, `qa`, `security`, `devops` (`.claude/agents/`), puis PR. Un bug passe par `/fix <issue>` : test qui reproduit le bug, correction, contrôles, PR. `/review` relit une branche ou une PR sans rien modifier. Une décision d'architecture non couverte : `/adr` (brouillon dans engineering-guidelines, GLB-001).
- Les agents échangent via `.claude/work/<sujet>/` (non versionné) ; la synthèse finale va dans la description de la PR.
- Chaque fichier modifié est formaté et linté automatiquement (`.claude/hooks/after-edit.sh`) : corriger les erreurs renvoyées, ne jamais les contourner.
- Fusion : une fois la PR ouverte, `gh pr merge <n> --squash --auto --delete-branch` ; GitHub fusionne quand la CI est verte. Jamais `--admin`, ni force-push, ni action irréversible hors fusion (migration en production, `tofu apply`, publication) : les préparer et les laisser à un humain.
- Ne jamais annoncer qu'un travail est fini, corrigé ou testé sans avoir lancé la vérification et cité son résultat.
- `.claude/agents`, `.claude/skills` et `.claude/hooks` viennent du repo `boilerplates` : les améliorer là-bas, puis reporter ici.
