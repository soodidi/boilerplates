# Instructions pour les assistants IA

Ce projet suit [engineering-guidelines](https://github.com/soodidi/engineering-guidelines). Avant de modifier l'infrastructure, lire `adr/devops/README.md` de ce repo.

- Toute ressource durable est décrite ici, jamais créée à la main (OPS-003).
- Les environnements utilisent les mêmes modules avec des variables différentes. Ne pas dupliquer de ressource dans `envs/` : ajouter ou étendre un module.
- Tags `env`, `project`, `managed-by` sur chaque ressource.
- Aucun secret en clair dans les fichiers : mots de passe générés (`random_password`), secrets passés en variables d'environnement CI.
- Base de données : jamais d'endpoint public.
- Vérifier avant de proposer une PR : `tofu fmt -recursive`, puis `tofu validate` dans chaque `envs/*`.
