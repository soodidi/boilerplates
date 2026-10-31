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

4. Appliquer **`envs/iam` à la main**, avec une clé API personnelle qui a les droits IAM sur l'organisation. Les applications et clés IAM sont des ressources d'organisation : la clé de la CI, limitée au projet, ne peut pas les créer (OPS-006). Ce dossier crée la clé de la CI infra (tous les produits du projet, aucun droit IAM), une clé de déploiement par repo applicatif (web : Object Storage ; API : registre et conteneurs) et une clé SMTP par environnement (envoi TEM uniquement).

   ```bash
   export SCW_ACCESS_KEY=<clé admin> SCW_SECRET_KEY=… SCW_DEFAULT_ORGANIZATION_ID=…
   export AWS_ACCESS_KEY_ID=$SCW_ACCESS_KEY AWS_SECRET_ACCESS_KEY=$SCW_SECRET_KEY   # backend S3
   tofu -chdir=envs/iam init && tofu -chdir=envs/iam apply
   tofu -chdir=envs/iam output -raw ci_access_key        # → SCW_ACCESS_KEY de staging et production (apply)
   tofu -chdir=envs/iam output -raw ci_secret_key        # → SCW_SECRET_KEY de staging et production
   tofu -chdir=envs/iam output -raw ci_plan_access_key   # → SCW_ACCESS_KEY de staging-plan et production-plan
   tofu -chdir=envs/iam output -raw ci_plan_secret_key   # → SCW_SECRET_KEY (lecture seule, plans des PR)
   # Repos applicatifs : une clé par pipeline (OPS-006), jamais la clé de la CI infra.
   tofu -chdir=envs/iam output -json deploy_access_keys   # web → repo web, api → repo API
   tofu -chdir=envs/iam output -json deploy_secret_keys
   ```

   Rotation des clés (OPS-006, au moins une fois par an) : `tofu -chdir=envs/iam apply` avec `-replace` sur chaque clé, puis reporter les nouvelles valeurs dans GitHub :
   - CI infra : `-replace='module.ci.scaleway_iam_api_key.this'` et `-replace='module.ci_plan.scaleway_iam_api_key.this'` ;
   - déploiement : `-replace='module.deploy["web"].scaleway_iam_api_key.this'` et `-replace='module.deploy["api"].scaleway_iam_api_key.this'` ;
   - SMTP : `-replace='module.smtp["staging"].scaleway_iam_api_key.this'` (et `production`), puis ré-appliquer staging et production pour que l'API reçoive la nouvelle `SMTP_URL`.

5. Pour la suite, utiliser la **clé de la CI** en local (`SCW_ACCESS_KEY`, `SCW_SECRET_KEY`, `SCW_DEFAULT_PROJECT_ID`, `SCW_DEFAULT_ORGANIZATION_ID`, mêmes `AWS_*`).
6. Appliquer `envs/shared` (registre et domaine d'envoi des e-mails, BE-009), puis pousser une première image de l'API depuis sa CI. Ce premier push construit et publie l'image ; le déploiement en staging qui suit échoue tant que l'étape 7 n'est pas faite (pas encore de conteneur ni de `CONTAINER_ID`) : c'est attendu. Par la suite, `envs/shared` s'applique depuis l'onglet Actions (`workflow_dispatch`, choix `shared`, approbation production).
   - Si la zone DNS n'est pas chez Scaleway, publier les enregistrements de `tofu -chdir=envs/shared output mail_dns_records` chez le registrar, puis attendre que le domaine soit vérifié dans la console TEM avant le premier envoi.
   - Sinon, mettre `mail_dns_autoconfig = true` : SPF, DKIM et DMARC sont créés automatiquement.
7. Pour chaque environnement : copier `terraform.tfvars.example` en `<env>.auto.tfvars`, compléter, puis appliquer.
   - **Prérequis** : un abonnement Edge Services actif sur le projet (CDN et HTTPS du front), et le domaine acheté (BE-006 : `api_url` et `web_domain` sur le même domaine).
   - **Ordre, pour staging puis pour production** :
     1. apply ciblé du conteneur, pour obtenir la cible du CNAME de l'API : `tofu -chdir=envs/<env> apply -target=module.api.scaleway_container.this`, puis `tofu -chdir=envs/<env> output api_dns_target` ;
     2. créer chez le registrar le CNAME `api.<domaine>` → cette valeur ;
     3. apply complet (Scaleway vérifie le DNS et émet le certificat de l'API) ;
     4. créer le CNAME du front → `tofu -chdir=envs/<env> output web_dns_target` (Edge Services émet ensuite le certificat).
   - Projet déjà en place : ré-appliquer d'abord `envs/iam`, dont staging et production lisent les sorties.

   ```bash
   tofu -chdir=envs/staging init
   tofu -chdir=envs/staging plan
   tofu -chdir=envs/staging apply
   ```

   Au premier démarrage, l'API applique elle-même les migrations (BE-003) : aucun accès à la base n'est nécessaire depuis GitHub. La sonde de démarrage laisse 150 s : une migration plus longue (backfill, index sur une grosse table) se découpe en étapes courtes ou se fait par une intervention manuelle, sinon l'instance redémarre en boucle et le déploiement échoue (l'ancienne version reste en service).

8. Reporter les sorties dans GitHub (voir les commentaires en tête des workflows `deploy.yml` des boilerplates) :
   - repo API : `CONTAINER_ID` (`tofu output -raw api_container_id`, UUID seul) ;
   - repo web : `BUCKET`, `API_URL`.

Commiter le fichier `.terraform.lock.hcl` créé par `tofu init` (versions des providers épinglées, OPS-003).

## Règles

- La console Scaleway sert à **observer**. Toute modification manuelle d'urgence est reportée dans le code le jour même (OPS-003).
- L'image de l'API est déployée par la CI de l'API : OpenTofu ignore les changements d'image (`lifecycle.ignore_changes`).
- Les sorties sensibles (`database_url`) ne s'affichent qu'avec `tofu output -raw`. `database_url` ne sert qu'aux interventions manuelles : la base n'est joignable que depuis le réseau privé, et les migrations tournent dans l'API (BE-003).
- Plans des PR : la clé `ci-plan` est en lecture seule, mais avec `TF_STATE_PASSPHRASE` le code d'une PR peut lire et déchiffrer les states, dont celui de `envs/iam` (clés CI, déploiement, SMTP). Compromis accepté tant qu'une seule personne pousse sur le repo infra ; avec des contributeurs externes, réserver les plans aux branches de confiance.
- Bucket du front : dès qu'une bucket policy existe, Scaleway n'autorise que les principaux qu'elle cite. Elle liste donc la CI infra, la clé des plans et la clé `deploy-web` (sorties de `envs/iam`), en plus de la lecture publique.
- Le state contient des secrets générés (mot de passe de la base, clés API, secret d'auth) : il est chiffré par OpenTofu (`encryption`, passphrase `TF_VAR_state_passphrase`), en plus du chiffrement du bucket (OPS-006).
- Auth (BE-006) : `BETTER_AUTH_SECRET` est généré par environnement (`random_password`). `api_url` DOIT être sur le même domaine que le front (ex. `api.app.example.com` et `app.example.com`) : sinon le navigateur n'envoie pas le cookie de session.
- E-mails (BE-009) : chaque environnement a sa propre clé API, limitée à l'envoi SMTP (`TransactionalEmailEmailSmtpCreate`), créée par `envs/iam` et injectée dans l'API comme secret `SMTP_URL`. En staging, `mail_allowed_recipients` est obligatoire : aucun e-mail ne part vers d'autres adresses.
- Admins (BE-010) : `admin_emails` (dans `<env>.auto.tfvars`, 5 adresses au plus) est passé à l'API, qui promeut ces comptes à chaque démarrage. Une modification passe par une PR, et en production par la validation de l'Environment `production`. La variable est sensible : elle n'apparaît pas dans les plans de la CI.
- Passer à Kubernetes (Kapsule) seulement via un ADR (OPS-005).
