# Instructions pour les assistants IA

Ce projet suit [engineering-guidelines](https://github.com/soodidi/engineering-guidelines). Copie locale : chemin indiqué dans `~/.claude/CLAUDE.md`, par défaut `~/Documents/projects/engineering-guidelines`. Avant de modifier l'infrastructure, y lire `adr/global/README.md` et `adr/devops/README.md`.

- Toute ressource durable est décrite ici, jamais créée à la main (OPS-003).
- Les environnements utilisent les mêmes modules avec des variables différentes. Ne pas dupliquer de ressource dans `envs/` : ajouter ou étendre un module.
- Tags `env`, `project`, `managed-by` sur chaque ressource.
- Aucun secret en clair dans les fichiers : mots de passe générés (`random_password`), secrets passés en variables d'environnement CI.
- Base de données : jamais d'endpoint public.
- Vérifier avant de proposer une PR : `tofu fmt -recursive`, puis `tofu validate` dans chaque `envs/*`.

## Travail avec l'IA (GLB-011)

- Une fonctionnalité passe par `/feature <issue>` : plan validé par un humain, code, vérification, contrôles par les agents `reviewer`, `qa`, `security`, `devops` (`.claude/agents/`), puis PR. Un bug passe par `/fix <issue>` : test qui reproduit le bug, correction, contrôles, PR. `/review` relit une branche ou une PR sans rien modifier. Une décision d'architecture non couverte : `/adr` (brouillon dans engineering-guidelines, GLB-001).
- Les agents échangent via `.claude/work/<sujet>/` (non versionné) ; la synthèse finale va dans la description de la PR.
- Chaque fichier modifié est formaté et linté automatiquement (`.claude/hooks/after-edit.sh`) : corriger les erreurs renvoyées, ne jamais les contourner.
- Ne jamais fusionner une PR, forcer un push, ni lancer une action irréversible (migration en production, `tofu apply`, publication). Les préparer et les laisser à un humain.
- `.claude/agents`, `.claude/skills` et `.claude/hooks` viennent du repo `boilerplates` : les améliorer là-bas, puis reporter ici.
