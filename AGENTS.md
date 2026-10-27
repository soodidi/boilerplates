# Instructions pour les assistants IA

Repo de boilerplates : chaque dossier est un projet autonome avec son propre `AGENTS.md`. Lire celui du boilerplate concerné avant de le modifier.

- Un boilerplate doit rester fonctionnel seul : installation, lint, tests et build passent sans autre étape que celles de son README (GLB-010).
- Garder la feature d'exemple `notes` cohérente entre les quatre apps (même contrat d'API).
- Toute évolution d'une règle outillée suit l'ADR correspondant dans engineering-guidelines.
- Le kit IA commun (agents, commandes, hook, template d'issue « Fonctionnalité ») vit dans `_shared/`. Le modifier là, puis lancer `scripts/sync-shared.sh` pour le recopier dans chaque boilerplate ; la CI vérifie que les copies sont identiques (GLB-011).
- Les `.claude/settings.json` (permissions) sont propres à chaque stack et se modifient directement dans le boilerplate.
