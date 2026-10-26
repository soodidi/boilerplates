# Instructions pour les assistants IA

Ce projet suit [engineering-guidelines](https://github.com/soodidi/engineering-guidelines). Avant de coder, lire `adr/global/README.md` et `adr/frontend/README.md` de ce repo.

## Règles à appliquer sans demander

- Nouvelle fonctionnalité = nouveau dossier dans `src/features/<nom>/` avec `api/`, `components/`, `routes/`, `schemas/` et un `index.ts`. Les autres dossiers importent uniquement cet `index.ts` (FE-003).
- Routes déclarées dans `src/app/router.tsx`, pages chargées en lazy depuis l'`index.ts` de la feature. Filtres et pagination dans les search params, validés par un schéma Zod (FE-004).
- Données serveur : `queryOptions` + hooks TanStack Query dans `api/`, jamais copiées dans un `useState` (FE-004). Appels HTTP via `request()` de `src/lib/http.ts` avec un schéma Zod de réponse.
- Formulaires : React Hook Form + Zod, champs enveloppés dans `FormField` (FE-006).
- Style : classes Tailwind avec les tokens sémantiques de `src/styles.css`, pas de couleurs brutes ni de valeurs arbitraires (FE-005).
- Aucun texte affiché en dur : ajouter les clés dans `src/i18n/fr.ts` et `en.ts` (GLB-007).
- Pas de `useMemo` / `useCallback` manuels : le React Compiler s'en charge (FE-008).
- Tests : Testing Library avec des requêtes par rôle, réseau mocké via MSW (`src/mocks/handlers.ts`), pas de mock de modules internes (FE-007).
- `npm run verify` doit passer avant de proposer une PR.
