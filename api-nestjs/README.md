# api-nestjs

Boilerplate backend : **Node.js + TypeScript + NestJS 12 (Fastify, ESM) + PostgreSQL + Drizzle + Zod**, logs pino, Sentry, Vitest + Testcontainers, Docker.

Il applique les ADR **BE-001 à BE-008**, OPS-001 et OPS-004, et les règles globales de [engineering-guidelines](https://github.com/soodidi/engineering-guidelines).

## Démarrer un projet

```bash
npx degit soodidi/boilerplates/api-nestjs mon-api
cd mon-api
git init -b main
cp .env.example .env
npm install              # installe aussi les hooks Git (lefthook)
npm run db:generate          # génère la première migration depuis le schéma (à commiter)
docker compose up -d      # PostgreSQL et Mailpit (e-mails sur http://localhost:8025)
npm run build && npm run db:migrate
npm run dev                  # http://localhost:3000, docs sur /docs
```

Prérequis : Node 26 (`.nvmrc`), npm (fourni avec Node), Docker (base locale et tests d'intégration), [gitleaks](https://github.com/gitleaks/gitleaks#installing) pour le hook de pré-commit.

À personnaliser : `name` dans `package.json`, titre OpenAPI dans `src/common/openapi.ts`.

## Scripts

| Commande                   | Rôle                                                                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`              | API en mode watch (lit `.env`)                                                                                            |
| `npm run test`             | Tests unitaires                                                                                                           |
| `npm run test:integration` | Tests d'intégration et e2e sur un vrai PostgreSQL (Testcontainers ; sans Docker : `TEST_DATABASE_URL` vers une base vide) |
| `npm run db:generate`      | Génère une migration SQL depuis les fichiers `*.table.ts` (à relire avant de commiter)                                    |
| `npm run db:migrate`       | Applique les migrations (après `npm run build`)                                                                           |
| `npm run openapi`          | Écrit `openapi.json` (après `npm run build`)                                                                              |
| `npm run arch`             | Vérifie les frontières entre modules (dependency-cruiser)                                                                 |
| `npm run verify`           | Tout ce que vérifie la CI                                                                                                 |

## Organisation (BE-002)

```
src/
├── main.ts / app.module.ts / app.setup.ts
├── instrument.ts        # Sentry, chargé avant tout le reste (--import)
├── config/              # configuration validée au démarrage (GLB-005)
├── common/              # Problem Details, validation, OpenAPI
├── database/            # client Drizzle, script de migration
├── health/              # /health/live et /health/ready
├── mail/                # envoi d'e-mails : interface Mailer, SMTP, gabarits (BE-009)
└── modules/
    └── notes/           # module d'exemple complet
        ├── notes.controller.ts   # HTTP uniquement
        ├── notes.service.ts      # règles métier
        ├── notes.repository.ts   # seul accès à la base
        ├── notes.table.ts        # table Drizzle du module
        ├── notes.schemas.ts      # schémas Zod d'entrée et de sortie
        └── index.ts              # API publique du module
drizzle/                 # migrations générées (commitées)
test/                    # setup Testcontainers, tests e2e
```

Le module `notes` sert d'exemple et correspond à la feature `notes` du boilerplate `web-react-vite` (même contrat d'API). Le supprimer une fois le premier vrai module en place, puis régénérer les migrations.

## Ce qui est déjà en place

| Sujet                                                                                         | Où                                                      | ADR              |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ---------------- |
| Validation Zod des requêtes (`@Body({ schema })`), réponses filtrées par un schéma de sortie  | `src/common/validation.ts`, `notes.controller.ts`       | BE-005           |
| Erreurs au format Problem Details avec erreurs par champ et `traceId`                         | `src/common/problem-details.filter.ts`                  | BE-004           |
| Versioning `/v1`, pagination par curseur, contrat OpenAPI exporté en CI                       | `app.setup.ts`, `notes.repository.ts`, `src/openapi.ts` | BE-004           |
| Drizzle, UUID v7, `timestamptz`, snake_case, migrations versionnées                           | `notes.table.ts`, `drizzle.config.ts`                   | BE-003           |
| Frontières entre modules vérifiées en CI                                                      | `.dependency-cruiser.cjs`                               | BE-002           |
| Helmet, CORS en liste blanche, rate limiting                                                  | `app.setup.ts`, `app.module.ts`                         | BE-006           |
| Logs JSON pino sans données sensibles, `x-request-id`, health checks, arrêt propre            | `app.module.ts`, `src/health/`                          | BE-007           |
| Sentry (RGPD) : erreurs inattendues uniquement                                                | `src/instrument.ts`, `problem-details.filter.ts`        | BE-007           |
| Tests unitaires avec fakes, intégration et e2e sur PostgreSQL réel                            | `*.spec.ts`, `*.integration.spec.ts`, `test/`           | BE-008           |
| E-mails : `Mailer` injectable, SMTP hors requête avec reprises, gabarits FR, Mailpit en local | `src/mail/`, `compose.yaml`                             | BE-009           |
| Image Docker multi-stage non-root, scan Trivy                                                 | `Dockerfile`, `.github/workflows/docker.yml`            | OPS-001          |
| Déploiement : migrations puis Serverless Container, staging puis production                   | `.github/workflows/deploy*.yml`                         | OPS-004, OPS-005 |

## À ajouter selon le projet

- **Authentification** (BE-006) : Better Auth, en cours d'intégration. À l'ajout : guard global avec décorateur `@Public()` pour les routes ouvertes, et un test d'accès refusé par endpoint protégé (BE-008).
- **Files d'attente** (Redis/BullMQ) : seulement quand le besoin apparaît (BE-001).

## E-mails (BE-009)

Le code métier injecte `Mailer` et lui passe un gabarit de `src/mail/templates.ts` : `this.mailer.send(verifyEmail({ to, appName, url }))`. L'appel rend la main tout de suite ; l'envoi part en arrière-plan, avec 3 reprises. Dans les tests, remplacer `Mailer` par `InMemoryMailer`.

| Environnement | `SMTP_URL`                                               | `MAIL_ALLOWED_RECIPIENTS` |
| ------------- | -------------------------------------------------------- | ------------------------- |
| Local         | `smtp://localhost:1025` (Mailpit)                        | vide                      |
| Staging       | `smtp://<ID projet>:<clé API>@smtp.tem.scaleway.com:587` | tes adresses              |
| Production    | idem, TLS imposé                                         | vide                      |

En staging et en production, `SMTP_URL` est un secret (Secret Manager, OPS-006). Avant le premier envoi réel : domaine d'envoi vérifié dans Scaleway TEM, avec SPF, DKIM et DMARC (checklist « nouveau projet »).

## Libs partagées

`eslint.config.js`, `prettier.config.js`, `commitlint.config.js`, `src/common/problem-details.ts` et la validation de `src/config/env.ts` sont des copies des packages `@soodidi/*` de `shared-libs`. Une fois ces packages publiés, les remplacer par des dépendances (GLB-010).
