# infra-scaleway

Boilerplate d'infrastructure **OpenTofu** pour Scaleway (`fr-par`) : réseau privé, PostgreSQL managé, API en Serverless Container, front statique sur Object Storage (+ CDN Edge Services), registre d'images.

Il applique **OPS-003 à OPS-007** de [engineering-guidelines](https://github.com/soodidi/engineering-guidelines) et correspond aux workflows de déploiement des boilerplates `api-nestjs` et `web-react-vite`.

> Configuration validée (`tofu validate`) avec le provider Scaleway 2.88. Le premier `plan` sur un vrai compte reste à relire attentivement : gabarits et prix dépendent du projet.

## Architecture

```
                 ┌──────────── Edge Services (CDN + HTTPS) ────────────┐
Navigateur ────► │  app.example.com  ──►  Object Storage (SPA statique) │
                 └──────────────────────────────────────────────────────┘
        │
        └──────► Serverless Container (API NestJS) ──► réseau privé ──► PostgreSQL managé (HA en prod)
                          ▲
            Container Registry (une image par commit, promue de staging à production)
```

## Organisation

```
modules/
├── network/        # VPC + réseau privé
├── database/       # PostgreSQL : privé, chiffré, sauvegardé, utilisateur applicatif dédié
├── app-service/    # Serverless Container + sondes /health/live et /health/ready
├── api-key/        # application IAM + clé API limitée à un projet et à des droits précis
└── static-site/    # bucket website + lecture publique + CDN optionnel
envs/
├── iam/            # clés API (CI, SMTP) : appliqué à la main avec une clé admin
├── shared/         # registre d'images et domaine d'envoi (communs aux environnements)
├── staging/
└── production/     # mêmes modules, gabarits de production
```

## Mise en place (une seule fois)

1. Créer un projet Scaleway. Noter son ID et celui de l'organisation.
2. Créer à la main le **bucket de state** (privé, versioning activé) et remplacer `CHANGE-ME-tfstate` dans les `main.tf` (backend de chaque environnement, et `terraform_remote_state` de staging et production). C'est la seule ressource créée hors code.
3. Choisir une **passphrase de chiffrement du state** (OPS-006), 16 caractères au moins. La ranger dans le gestionnaire de mots de passe et dans le secret GitHub `TF_STATE_PASSPHRASE` des environnements du repo infra. Sans elle, le state est illisible : ne jamais la perdre.

   ```bash
   export TF_VAR_state_passphrase=…
   ```

4. Appliquer **`envs/iam` à la main**, avec une clé API personnelle qui a les droits IAM sur l'organisation. Les applications et clés IAM sont des ressources d'organisation : la clé de la CI, limitée au projet, ne peut pas les créer (OPS-006). Ce dossier crée la clé de la CI (tous les produits du projet, aucun droit IAM) et une clé SMTP par environnement (envoi TEM uniquement).

   ```bash
   export SCW_ACCESS_KEY=<clé admin> SCW_SECRET_KEY=… SCW_DEFAULT_ORGANIZATION_ID=…
   export AWS_ACCESS_KEY_ID=$SCW_ACCESS_KEY AWS_SECRET_ACCESS_KEY=$SCW_SECRET_KEY   # backend S3
   tofu -chdir=envs/iam init && tofu -chdir=envs/iam apply
   tofu -chdir=envs/iam output -raw ci_access_key   # → secret SCW_ACCESS_KEY
   tofu -chdir=envs/iam output -raw ci_secret_key   # → secret SCW_SECRET_KEY
   ```

   À refaire pour chaque rotation de clé (OPS-006, au moins une fois par an) : `tofu -chdir=envs/iam apply -replace='module.ci.scaleway_iam_api_key.this'`.

5. Pour la suite, utiliser la **clé de la CI** en local (`SCW_ACCESS_KEY`, `SCW_SECRET_KEY`, `SCW_DEFAULT_PROJECT_ID`, `SCW_DEFAULT_ORGANIZATION_ID`, mêmes `AWS_*`).
6. Appliquer `envs/shared` (registre et domaine d'envoi des e-mails, BE-009), puis pousser une première image de l'API depuis sa CI.
   - Si la zone DNS n'est pas chez Scaleway, publier les enregistrements de `tofu -chdir=envs/shared output mail_dns_records` chez le registrar, puis attendre que le domaine soit vérifié dans la console TEM avant le premier envoi.
   - Sinon, mettre `mail_dns_autoconfig = true` : SPF, DKIM et DMARC sont créés automatiquement.
7. Pour chaque environnement : copier `terraform.tfvars.example` en `<env>.auto.tfvars`, compléter, puis :

   ```bash
   tofu -chdir=envs/staging init
   tofu -chdir=envs/staging plan
   tofu -chdir=envs/staging apply
   ```

8. Reporter les sorties dans GitHub (voir les commentaires en tête des workflows `deploy.yml` des boilerplates) :
   - repo API : `CONTAINER_ID`, `DATABASE_URL` (secret, `tofu output -raw database_url`) ;
   - repo web : `BUCKET`, `API_URL`.

Commiter le fichier `.terraform.lock.hcl` créé par `tofu init` (versions des providers épinglées, OPS-003).

## Règles

- La console Scaleway sert à **observer**. Toute modification manuelle d'urgence est reportée dans le code le jour même (OPS-003).
- L'image de l'API est déployée par la CI de l'API : OpenTofu ignore les changements d'image (`lifecycle.ignore_changes`).
- Les sorties sensibles (`database_url`) ne s'affichent qu'avec `tofu output -raw`.
- Le state contient des secrets générés (mot de passe de la base, clés API, secret d'auth) : il est chiffré par OpenTofu (`encryption`, passphrase `TF_VAR_state_passphrase`), en plus du chiffrement du bucket (OPS-006).
- Auth (BE-006) : `BETTER_AUTH_SECRET` est généré par environnement (`random_password`). `api_url` DOIT être sur le même domaine que le front (ex. `api.app.example.com` et `app.example.com`) : sinon le navigateur n'envoie pas le cookie de session.
- E-mails (BE-009) : chaque environnement a sa propre clé API, limitée à l'envoi SMTP (`TransactionalEmailEmailSmtpCreate`), créée par `envs/iam` et injectée dans l'API comme secret `SMTP_URL`. En staging, `mail_allowed_recipients` est obligatoire : aucun e-mail ne part vers d'autres adresses.
- Passer à Kubernetes (Kapsule) seulement via un ADR (OPS-005).
