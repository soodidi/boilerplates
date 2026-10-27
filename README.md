# boilerplates

Points de départ des nouveaux projets. Chaque boilerplate applique déjà les ADR de [engineering-guidelines](https://github.com/soodidi/engineering-guidelines) ([GLB-010](https://github.com/soodidi/engineering-guidelines/blob/main/adr/global/GLB-010-boilerplates-et-libs-partagees.md)).

| Boilerplate | Stack | ADR |
|-------------|-------|-----|
| [`web-react-vite`](web-react-vite) | React 19, Vite 8, TypeScript, Tailwind 4, TanStack Router + Query, RHF + Zod, Sentry, Vitest, MSW, Playwright | FE-001 → FE-009 |
| [`api-nestjs`](api-nestjs) | NestJS 12 (Fastify, ESM), PostgreSQL, Drizzle, Zod, pino, Sentry, Vitest, Testcontainers, Docker | BE-001 → BE-008 |
| [`infra-scaleway`](infra-scaleway) | OpenTofu : réseau privé, PostgreSQL managé, Serverless Container, Object Storage + Edge Services | OPS-003 → OPS-007 |
| [`android-compose`](android-compose) | Kotlin, Jetpack Compose, Material 3, Hilt, Retrofit, kotlinx.serialization | AND-001 → AND-005 |
| [`ios-swiftui`](ios-swiftui) | Swift 6, SwiftUI, Observation, SPM, XcodeGen, Swift Testing | IOS-001 → IOS-005 |

Les quatre apps partagent la même feature d'exemple, **notes**, sur le même contrat d'API : on peut lancer `api-nestjs` en local et la consommer depuis le web, Android ou iOS.

## Créer un projet

Le plus simple : dans Claude Code, `/new-project` (installé depuis engineering-guidelines, voir `ai/README.md`). Il copie le boilerplate, renomme le projet, crée le repo GitHub, protège `main` et liste les secrets à configurer.

À la main :

```bash
npx degit soodidi/boilerplates/web-react-vite mon-projet
```

Puis suivre le README du boilerplate. Le projet créé a son propre historique Git et ne reste pas lié au boilerplate.

## Kit IA (GLB-011)

Chaque boilerplate embarque une configuration Claude Code dans `.claude/` :

| Élément | Rôle |
|---------|------|
| `agents/` | Agents spécialisés : `planner`, `reviewer`, `qa`, `security`, `devops` |
| `skills/` | Commandes `/feature <issue>` (cycle complet jusqu'à la PR) et `/review [PR]` |
| `hooks/after-edit.sh` | Formate et lint chaque fichier modifié par l'IA, lui renvoie les erreurs |
| `settings.json` | Permissions : vérifications autorisées, actions irréversibles interdites |

S'y ajoute le template d'issue « Fonctionnalité » (`.github/ISSUE_TEMPLATE/feature.yml`), qui sert de brief à `/feature`.

Les agents, commandes, hook et template sont communs : on les modifie dans `_shared/`, puis `scripts/sync-shared.sh` les recopie partout.

## Maintenir ce repo

- La CI (`.github/workflows/boilerplates.yml`) vérifie chaque boilerplate sur chaque PR.
- Les lockfiles (`package-lock.json`, `.terraform.lock.hcl`) sont commités : après un changement de dépendances, lancer l'installation dans le dossier concerné et commiter le lockfile.
- Quand un ADR change une règle outillée, mettre à jour le boilerplate concerné dans la foulée (GLB-010).
- Les configurations ESLint, Prettier, commitlint et le format Problem Details sont des copies des packages `@soodidi/*` de `shared-libs` ; à remplacer par des dépendances une fois ces packages publiés.
