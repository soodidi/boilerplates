# api-nestjs

Boilerplate backend : **Node.js + TypeScript + NestJS 12 (Fastify, ESM) + PostgreSQL + Drizzle + Zod**, logs pino, Sentry, Vitest + Testcontainers, Docker.

Il applique les ADR **BE-001 à BE-008**, OPS-001 et OPS-004, et les règles globales de [engineering-guidelines](https://github.com/soodidi/engineering-guidelines).

## Démarrer un projet

En temps normal, `/new-project` fait tout cela. À la main :

```bash
npx degit soodidi/boilerplates/api-nestjs mon-api
cd mon-api
git init -b main
npm install        # installe aussi les hooks Git (lefthook)
npm run setup      # .env prêt (secrets de dev générés), PostgreSQL + Mailpit, migrations
npm run dev        # http://localhost:3000, docs sur /docs, e-mails sur http://localhost:8025
```

`npm run setup` se relance sans risque : il ne fait que compléter le `.env` avec les variables apparues dans `.env.example`, sans toucher aux valeurs existantes.

**Même image qu'en production** : `npm run stack` lance l'API dans l'image construite par le `Dockerfile`, celle qui part en staging et en production (OPS-001, OPS-004). Seule la configuration change (le `.env` et `compose.yaml`). La CI rejoue ce parcours à chaque PR (`npm run stack:smoke` : santé, inscription, e-mail reçu dans Mailpit). Utiliser `npm run dev` pour le rechargement à chaud, `npm run stack` pour vérifier le comportement réel de l'image. Les deux utilisent le port 3000 : arrêter l'un avant de lancer l'autre. Comme en production, la stack active le rate limiting de l'auth : en cas de 429 pendant des essais répétés, mettre `AUTH_RATE_LIMIT=false` dans `.env`.

Prérequis : Node 26 (`.nvmrc`), npm (fourni avec Node), Docker (base locale et tests d'intégration), [gitleaks](https://github.com/gitleaks/gitleaks#installing) pour le hook de pré-commit.

À personnaliser : `name` dans `package.json`, titre OpenAPI dans `src/common/openapi.ts`.

## Scripts

| Commande                   | Rôle                                                                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `npm run setup`            | Prépare le dev : `.env` créé ou complété, PostgreSQL et Mailpit, migrations (relançable)                                  |
| `npm run dev`              | API en mode watch (lit `.env`)                                                                                            |
| `npm run stack`            | API dans l'image de production, avec PostgreSQL et Mailpit (`stack:down` pour arrêter, `stack:smoke` pour tester)         |
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
├── common/              # Problem Details, validation, OpenAPI, registre des données d'utilisateur (GLB-013)
├── database/            # client Drizzle, migrations au démarrage sous verrou (BE-003)
├── health/              # /health/live et /health/ready (publiques)
├── mail/                # envoi d'e-mails : interface Mailer, SMTP, gabarits (BE-009)
└── modules/
    ├── auth/            # Better Auth : configuration, tables, guard global (BE-006)
    ├── account/         # export des données de l'utilisateur (GLB-013)
    └── notes/           # module d'exemple complet, propre à chaque utilisateur
        ├── notes.controller.ts   # HTTP uniquement
        ├── notes.service.ts      # règles métier
        ├── notes.repository.ts   # seul accès à la base
        ├── notes.table.ts        # table Drizzle du module
        ├── notes.user-data.ts    # export et effacement des notes avec le compte (GLB-013)
        ├── notes.schemas.ts      # schémas Zod d'entrée et de sortie
        └── index.ts              # API publique du module
drizzle/                 # migrations générées (commitées)
test/                    # setup Testcontainers, tests e2e
```

Le module `notes` sert d'exemple et correspond à la feature `notes` du boilerplate `web-react-vite` (même contrat d'API). Le supprimer une fois le premier vrai module en place, puis régénérer les migrations.

## Ce qui est déjà en place

| Sujet                                                                                                                                                                                                                                | Où                                                      | ADR              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- | ---------------- |
| Validation Zod des requêtes (`@Body({ schema })`), réponses filtrées par un schéma de sortie                                                                                                                                         | `src/common/validation.ts`, `notes.controller.ts`       | BE-005           |
| Erreurs au format Problem Details avec erreurs par champ et `traceId`                                                                                                                                                                | `src/common/problem-details.filter.ts`                  | BE-004           |
| Versioning `/v1`, pagination par curseur, contrat OpenAPI exporté en CI                                                                                                                                                              | `app.setup.ts`, `notes.repository.ts`, `src/openapi.ts` | BE-004           |
| Drizzle, UUID v7, `timestamptz`, snake_case, migrations versionnées                                                                                                                                                                  | `notes.table.ts`, `drizzle.config.ts`                   | BE-003           |
| Frontières entre modules vérifiées en CI                                                                                                                                                                                             | `.dependency-cruiser.cjs`                               | BE-002           |
| Helmet, CORS en liste blanche, rate limiting                                                                                                                                                                                         | `app.setup.ts`, `app.module.ts`                         | BE-006           |
| Logs JSON pino sans données sensibles, `x-request-id`, health checks, arrêt propre                                                                                                                                                   | `app.module.ts`, `src/health/`                          | BE-007           |
| Sentry (RGPD) : erreurs inattendues uniquement                                                                                                                                                                                       | `src/instrument.ts`, `problem-details.filter.ts`        | BE-007           |
| Tests unitaires avec fakes, intégration et e2e sur PostgreSQL réel                                                                                                                                                                   | `*.spec.ts`, `*.integration.spec.ts`, `test/`           | BE-008           |
| Authentification Better Auth : inscription, vérification d'e-mail, connexion, mot de passe oublié, sessions révocables (cookie web, `Bearer` mobile), Argon2id, guard global + `@Public()`, CSRF, notes propres à chaque utilisateur | `src/modules/auth/`, `src/common/csrf.guard.ts`         | BE-006           |
| E-mails : `Mailer` injectable, SMTP hors requête avec reprises, gabarits FR, Mailpit en local                                                                                                                                        | `src/mail/`, `compose.yaml`                             | BE-009           |
| RGPD : export des données (`GET /v1/account/export`), suppression du compte avec mot de passe (`POST /v1/auth/delete-user`), registre `UserDataContributor`                                                                          | `src/common/user-data/`, `src/modules/account/`         | GLB-013          |
| Image Docker multi-stage non-root, scan Trivy                                                                                                                                                                                        | `Dockerfile`, `.github/workflows/docker.yml`            | OPS-001          |
| Déploiement : Serverless Container (migrations au démarrage, sous verrou), staging puis production                                                                                                                                   | `.github/workflows/deploy*.yml`                         | OPS-004, OPS-005 |

## À ajouter selon le projet

- **Files d'attente** (Redis/BullMQ) : seulement quand le besoin apparaît (BE-001).

## Authentification (BE-006)

Better Auth sert ses routes sous `/v1/auth` : `sign-up/email`, `sign-in/email`, `sign-out`, `get-session`, `request-password-reset`, `reset-password`, `verify-email`… Toute la configuration est dans `src/modules/auth/auth.config.ts`, à relire avec BE-006 avant toute modification.

- **Toute route est protégée.** `@Public()` ouvre une route ; `@Session() session: UserSession` donne l'utilisateur connecté (`session.user.id`).
- **Contrôle d'accès sur la ressource** : chaque requête filtre sur `userId` dans le repository, comme dans `notes`. Un test e2e vérifie qu'un utilisateur ne voit pas les données d'un autre.
- **Web** : cookie de session `HttpOnly`. Les requêtes avec cookie qui modifient l'état doivent venir d'une origine de `CORS_ORIGINS` (`CsrfGuard`).
- **Mobile** : le token arrive dans l'en-tête `set-auth-token` à la connexion, puis s'envoie en `Authorization: Bearer`.
- **Sessions** : 30 jours, prolongées à l'usage, jamais plus de 90 jours après la connexion ; révoquées à la déconnexion et à la réinitialisation du mot de passe.
- **Mises à jour** : Renovate ne fusionne jamais `better-auth` ni `@thallesp/nestjs-better-auth` automatiquement. Lire le changelog et lancer `npm run test:integration` avant de fusionner.

- **IP du client** (rate limiting, sessions) : dernière entrée de `X-Forwarded-For` ajoutée par les `TRUST_PROXY_HOPS` proxys de confiance (1 derrière Scaleway). Au premier déploiement en staging, vérifier que `sessions.ip_address` contient bien ta vraie IP.

En local, l'e-mail de vérification arrive dans Mailpit (http://localhost:8025).

## Données personnelles (GLB-013)

- **Export** : `GET /v1/account/export` renvoie en JSON le compte, ses sessions et les données de chaque module (`data.<clé>`). Limité à 5 appels par minute et par IP, compté par instance (en mémoire).
- **Suppression** : `POST /v1/auth/delete-user` avec `{ "password": "…" }`. Le mot de passe est toujours exigé (Better Auth ne le demande pas pour une session récente). Les données des modules sont effacées dans une transaction, puis Better Auth supprime le compte et ses sessions.
- **Sessions expirées** : effacées au démarrage de l'API puis toutes les 24 heures (`expired-sessions.purge.ts`). Better Auth ne les efface que si on les lui présente à nouveau.
- **Logs et Sentry** : une requête n'est journalisée qu'avec son identifiant, sa méthode et son URL, ni IP ni en-têtes (`src/common/redact-url.ts`). Sentry ne reçoit que les en-têtes `accept`, `content-type` et `content-length`, et les tokens des liens d'e-mail sont masqués dans les erreurs et les traces (`src/common/sentry-redaction.ts`).
- **Nouveau module avec des données d'utilisateur** : ajouter un provider `@ContributesUserData()` qui implémente `UserDataContributor` (`key`, `tables`, `schema`, `export`, `erase`), sur le modèle de `notes.user-data.ts`. Un test e2e échoue si une table avec une colonne `user_id` n'est couverte par aucun contributeur.

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
