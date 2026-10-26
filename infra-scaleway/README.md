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
└── static-site/    # bucket website + lecture publique + CDN optionnel
envs/
├── shared/         # registre d'images (commun aux environnements)
├── staging/
└── production/     # mêmes modules, gabarits de production
```

## Mise en place (une seule fois)

1. Créer un projet Scaleway et une **clé API dédiée à la CI**, limitée à ce projet (OPS-006).
2. Créer à la main le **bucket de state** (privé, versioning activé) et remplacer `CHANGE-ME-tfstate` dans les trois `main.tf`. C'est la seule ressource créée hors code.
3. Exporter les identifiants en local :

   ```bash
   export SCW_ACCESS_KEY=… SCW_SECRET_KEY=… SCW_DEFAULT_PROJECT_ID=… SCW_DEFAULT_ORGANIZATION_ID=…
   export AWS_ACCESS_KEY_ID=$SCW_ACCESS_KEY AWS_SECRET_ACCESS_KEY=$SCW_SECRET_KEY   # backend S3
   ```

4. Appliquer `envs/shared` (registre), puis pousser une première image de l'API depuis sa CI.
5. Pour chaque environnement : copier `terraform.tfvars.example` en `<env>.auto.tfvars`, compléter, puis :

   ```bash
   tofu -chdir=envs/staging init
   tofu -chdir=envs/staging plan
   tofu -chdir=envs/staging apply
   ```

6. Reporter les sorties dans GitHub (voir les commentaires en tête des workflows `deploy.yml` des boilerplates) :
   - repo API : `CONTAINER_ID`, `DATABASE_URL` (secret, `tofu output -raw database_url`) ;
   - repo web : `BUCKET`, `API_URL`.

Commiter le fichier `.terraform.lock.hcl` créé par `tofu init` (versions des providers épinglées, OPS-003).

## Règles

- La console Scaleway sert à **observer**. Toute modification manuelle d'urgence est reportée dans le code le jour même (OPS-003).
- L'image de l'API est déployée par la CI de l'API : OpenTofu ignore les changements d'image (`lifecycle.ignore_changes`).
- Les sorties sensibles (`database_url`) ne s'affichent qu'avec `tofu output -raw`.
- Passer à Kubernetes (Kapsule) seulement via un ADR (OPS-005).
