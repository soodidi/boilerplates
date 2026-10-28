# Instructions pour les assistants IA

Ce projet suit [engineering-guidelines](https://github.com/soodidi/engineering-guidelines). Copie locale : `engineering-guidelines/` dans le dossier racine qui contient ce projet (`<racine>` : dossier parent pour une app, grand-parent dans le repo boilerplates), sinon le dépôt GitHub. Avant de coder, y lire `adr/global/README.md` et `adr/frontend/README.md`.

## Règles à appliquer sans demander

- Nouvelle fonctionnalité = nouveau dossier dans `src/features/<nom>/` avec `api/`, `components/`, `routes/`, `schemas/` et un `index.ts`. Les autres dossiers importent uniquement cet `index.ts` (FE-003).
- Routes déclarées dans `src/app/router.tsx`, pages chargées en lazy depuis l'`index.ts` de la feature. Filtres et pagination dans les search params, validés par un schéma Zod (FE-004).
- Données serveur : `queryOptions` + hooks TanStack Query dans `api/`, jamais copiées dans un `useState` (FE-004). Appels HTTP via `request()` de `src/lib/http.ts` avec un schéma Zod de réponse.
- Formulaires : React Hook Form + Zod, champs enveloppés dans `FormField` (FE-006).
- Style : classes Tailwind avec les tokens sémantiques de `src/styles.css`, pas de couleurs brutes ni de valeurs arbitraires (FE-005).
- Aucun texte affiché en dur : ajouter les clés dans `src/i18n/fr.ts` et `en.ts` (GLB-007). Exception : les textes longs d'une feature chargée en lazy (pages légales, `src/features/legal/content/{fr,en}.ts`) restent dans la feature, pour ne pas alourdir le bundle initial (FE-008).
- Pages légales (GLB-013) : toute nouvelle donnée personnelle, tout nouveau sous-traitant ou traceur, ou tout changement de durée de conservation met à jour `src/features/legal/` dans la même PR.
- Pas de `useMemo` / `useCallback` manuels : le React Compiler s'en charge (FE-008).
- Tests : Testing Library avec des requêtes par rôle, réseau mocké via MSW (`src/mocks/handlers.ts`), pas de mock de modules internes (FE-007).
- Auth (BE-006) : une route privée a `beforeLoad: requireSession` ; les appels d'auth passent par `src/features/auth/api` (client Better Auth), jamais par `fetch` direct ; messages d'erreur génériques, sans révéler si un compte existe. Dans les tests, `signInAsDemo()` (`src/mocks/db.ts`) pour démarrer connecté.
- `npm run verify` doit passer avant de proposer une PR.

## Travail avec l'IA (GLB-011)

- Une fonctionnalité passe par `/feature <issue>` : plan validé par un humain, code, vérification, contrôles par les agents `reviewer`, `qa`, `security`, `devops` (`.claude/agents/`), puis PR. Un bug passe par `/fix <issue>` : test qui reproduit le bug, correction, contrôles, PR. `/review` relit une branche ou une PR sans rien modifier. Une décision d'architecture non couverte : `/adr` (brouillon dans engineering-guidelines, GLB-001).
- Les agents échangent via `.claude/work/<sujet>/` (non versionné) ; la synthèse finale va dans la description de la PR.
- Chaque fichier modifié est formaté et linté automatiquement (`.claude/hooks/after-edit.sh`) : corriger les erreurs renvoyées, ne jamais les contourner.
- Fusion : une fois la PR ouverte, `gh pr merge <n> --squash --auto --delete-branch` ; GitHub fusionne quand la CI est verte. Jamais `--admin`, ni force-push, ni action irréversible hors fusion (migration en production, `tofu apply`, publication) : les préparer et les laisser à un humain.
- Ne jamais annoncer qu'un travail est fini, corrigé ou testé sans avoir lancé la vérification et cité son résultat.
- `.claude/agents`, `.claude/skills` et `.claude/hooks` viennent du repo `boilerplates` : les améliorer là-bas, puis reporter ici.
