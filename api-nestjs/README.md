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
npm run up         # tout en une commande : .env prêt, PostgreSQL + Mailpit, migrations, API (image de prod)
# ou, pour coder l'API avec rechargement à chaud :
npm run setup && npm run dev   # http://localhost:3000, docs sur /docs, e-mails sur http://localhost:8025
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
| `npm run up`               | Tout le local en une commande : `setup` puis `stack`, relançable sans risque                                              |
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
    ├── auth/            # Better Auth : configuration, tables, guard global (BE-006), rôles (access-control.ts, BE-010)
    ├── account/         # export des données de l'utilisateur (GLB-013)
    ├── admin/           # exemple de route réservée : GET /v1/admin/stats (BE-010)
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
| Déploiement : Serverless Container (migrations au démarrage, sous verrou), staging automatique, production lancée à la main (`gh workflow run deploy`, même image)                                                                   | `.github/workflows/deploy*.yml`                         | OPS-004, OPS-005 |

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

## Rôles et permissions (BE-010)

- **Rôles** `user` (par défaut) et `admin`, portés par le compte (plugin `admin` de Better Auth). Le rôle arrive avec la session (`get-session`) ; les clients ne s'en servent que pour l'affichage.
- **Permissions** déclarées une seule fois dans `src/modules/auth/access-control.ts`. Une action s'y ajoute avant d'être utilisée.
- **Route réservée** : `@UserHasPermission({ permissions: { stats: ['read'] } })` (ou `@Roles(['admin'])`), sur le modèle de `GET /v1/admin/stats`. Sans la permission : 403 en Problem Details. Chaque route réservée a son test e2e de refus. La permission ne remplace pas la vérification d'appartenance : la note d'un autre répond 404, jamais 403 (`GET /v1/notes/:id`).
- **Administration des comptes** : routes `/v1/auth/admin/*` du plugin, réservées aux admins (`ADMIN_OPEN_PATHS`) : `list-users`, `get-user`, `ban-user`, `unban-user`, `revoke-user-sessions`, sur des comptes ordinaires seulement (bannir un admin ou couper ses sessions : 403). `set-role` est fermée : aucun rôle ne change depuis l'interface. Leurs refus sont au format de Better Auth (`{ code, message }`), pas en Problem Details. Un compte banni perd ses sessions et ne peut plus se connecter.
- **Ouvertes à toute session** (`ADMIN_SELF_PATHS`) : `has-permission`, qui ne répond que pour la session (le web s'en sert pour `useCan` et `requirePermission`).
- **Fermées** (`ADMIN_DISABLED_PATHS`) : tout ce qui permet de prendre un compte (usurpation, mot de passe, e-mail, création d'un compte déjà vérifié), la liste des sessions d'un compte (elle contient les tokens) et la suppression par un admin (elle n'effacerait pas les données des modules, GLB-013). Ouvrir l'une d'elles demande un ADR de projet. Toute route du plugin est dans l'une des trois listes : `access-control.spec.ts` échoue sinon (mise à jour de Better Auth).
- **Admins : exactement la liste** `ADMIN_EMAILS` (variable `admin_emails` de l'infra en staging et en production, `.env` en local), **liste vide comprise** (aucun admin). Au démarrage de **chaque instance** (déploiement, réveil, montée en charge), après les migrations, puis toutes les 10 minutes, l'API rétrograde tout compte hors liste dont le rôle n'est pas `user` (rôle `user`, sessions coupées), puis promeut chaque compte de la liste dont l'adresse est vérifiée ; elle ne journalise jamais d'adresse (voir « Journal »). En local, mettre son adresse dans `.env` pour être admin.
- **Nommer un admin**, dans cet ordre : s'inscrire et confirmer son adresse ; puis « Mot de passe oublié » pour choisir son mot de passe (si un inconnu avait créé le compte d'avance avec cette adresse, son mot de passe ne sert plus et ses sessions sont révoquées) ; puis ajouter l'adresse à `admin_emails` par une PR sur l'infra, et l'appliquer (staging : à la fusion ; production : workflow `infra` lancé à la main), ce qui redéploie l'API.
- **Écarter un admin** (compte compromis, départ) : retirer son adresse de la liste par une PR, puis l'appliquer de la même façon. Il redevient `user` et perd ses sessions au démarrage, ou au plus tard 10 minutes après. Vérifier ensuite dans la page Administration qu'il n'est plus admin. Aucun admin ne peut bannir ou déconnecter un autre admin : un compte volé ne peut enfermer personne dehors.
- **Compte suspendu** (GLB-013) : il ne peut plus se connecter pour exporter ou supprimer ses données. À sa demande (écrite à l'adresse de contact depuis l'adresse du compte), un admin le fait depuis la page Administration : `GET /v1/admin/users/:id/export` (le même fichier que « Mon compte ») et `POST /v1/admin/users/:id/erase` avec `{ "password": "…" }`, le mot de passe de l'admin (effacement complet, comme `/delete-user`, dans une transaction qui verrouille le compte et revérifie qu'il est suspendu ; 5 par minute). Seulement sur un compte suspendu (409 sinon, suspension expirée comprise), jamais sur un admin (403), journalisé (`user.data_exported`, `user.erased`).
- **Journal** (BE-007) : chaque action d'administration réussie (suspendre, réactiver, couper les sessions, exporter ou effacer un compte suspendu) écrit une ligne `Admin action` avec `action`, `actorId` et `targetId`, et chaque changement de rôle par la liste une ligne `admin.role_changed` avec `grantedIds` et `revokedIds` : des ids seulement, jamais d'adresse. Une action refusée (droits, corps invalide, sans session) n'est pas journalisée. Ces lignes vivent le temps de rétention des logs (Cockpit) ; celles des routes `/v1/auth/*` n'ont pas d'id de requête (pas de pino-http). `revoke-user-sessions` sur un id inconnu répond quand même 200 et est journalisé.
- **Reprise en main** : le bannissement d'un compte listé (posé avant qu'il soit admin) n'est levé automatiquement que si plus aucun admin n'est actif ; un admin peut aussi le lever depuis la page Administration.
- Changer d'adresse est impossible (`change-email` désactivé, testé) : aucun compte ne peut prendre l'adresse d'un admin.

## Données personnelles (GLB-013)

- **Export** : `GET /v1/account/export` renvoie en JSON le compte, ses sessions et les données de chaque module (`data.<clé>`). Limité à 5 appels par minute et par IP, compté par instance (en mémoire).
- **Suppression** : `POST /v1/auth/delete-user` avec `{ "password": "…" }`. Le mot de passe est toujours exigé (Better Auth ne le demande pas pour une session récente). Les données des modules sont effacées dans une transaction, puis Better Auth supprime le compte et ses sessions.
- **Purge** (`expired-auth-data.purge.ts`) : sessions et jetons expirés, compteurs de rate limiting de plus de 24 heures (clé : IP) effacés au démarrage de l'API puis toutes les 24 heures. Better Auth ne le fait pas. Le rythme quotidien suppose une instance toujours active (`min_scale >= 1`, cas de la production) ; un échec part dans Sentry.
- **Logs** : une requête n'est journalisée qu'avec son identifiant, sa méthode et son URL (tokens masqués), une réponse avec son statut : ni IP, ni en-têtes. Les erreurs SQL perdent les valeurs de la requête (`src/common/redact-url.ts`, `src/common/scrub-error.ts`).
- **Sentry** : dans les erreurs, seules les valeurs des en-têtes `content-type` et `content-length` partent (les autres arrivent en `[Filtered]`) ; les spans perdent tous les en-têtes, le navigateur et l'adresse du client ; les tokens des liens d'e-mail et les valeurs SQL sont masqués (`src/common/sentry-redaction.ts`).
- **Nouveau module avec des données d'utilisateur** : ajouter un provider `@ContributesUserData()` qui implémente `UserDataContributor` (`key`, `tables`, `schema`, `export`, `erase`), sur le modèle de `notes.user-data.ts`. Un test e2e échoue si une table avec une colonne `user_id` n'est couverte par aucun contributeur.

## E-mails (BE-009)

Le code métier injecte `Mailer` et lui passe un gabarit de `src/mail/templates.ts` : `this.mailer.send(verifyEmail({ to, appName, url }))`. L'appel rend la main tout de suite ; l'envoi part en arrière-plan, avec 3 reprises. Dans les tests, remplacer `Mailer` par `InMemoryMailer`.

| Environnement | `SMTP_URL`                                               | `MAIL_ALLOWED_RECIPIENTS` |
| ------------- | -------------------------------------------------------- | ------------------------- |
| Local         | `smtp://localhost:1025` (Mailpit)                        | vide                      |
| Staging       | `smtp://<ID projet>:<clé API>@smtp.tem.scaleway.com:587` | tes adresses              |
| Production    | idem, TLS imposé                                         | vide                      |

En staging et en production, `SMTP_URL` est une variable secrète du conteneur, générée par OpenTofu (OPS-006). Avant le premier envoi réel : domaine d'envoi vérifié dans Scaleway TEM, avec SPF, DKIM et DMARC (checklist « nouveau projet »).

## Libs partagées

`eslint.config.js`, `prettier.config.js`, `commitlint.config.js`, `src/common/problem-details.ts` et la validation de `src/config/env.ts` sont des copies des packages `@soodidi/*` de `shared-libs`. Une fois ces packages publiés, les remplacer par des dépendances (GLB-010).
