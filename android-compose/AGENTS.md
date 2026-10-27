# Instructions pour les assistants IA

Ce projet suit [engineering-guidelines](https://github.com/soodidi/engineering-guidelines). Copie locale : chemin indiqué dans `~/.claude/CLAUDE.md`, par défaut `~/Documents/projects/engineering-guidelines`. Avant de coder, y lire `adr/global/README.md` et `adr/android/README.md`.

## Règles à appliquer sans demander

- Kotlin et Compose uniquement ; coroutines + Flow (pas de RxJava, pas de `GlobalScope`) (AND-001).
- Nouvelle fonctionnalité = `feature/<nom>/data` + `feature/<nom>/ui` sur le modèle de `notes` (AND-002, AND-003).
- Un ViewModel par écran, un seul `StateFlow<XxxUiState>` immuable ; les événements ponctuels sont dans l'état puis consommés (AND-002).
- Composables sans état : l'écran `XxxRoute` relie le ViewModel, `XxxScreen` reçoit l'état et des callbacks. Chaque composable public a un `@Preview` et un paramètre `modifier` (AND-001).
- Aucun texte en dur : `strings.xml` en français et en anglais (GLB-007).
- Les DTO réseau ne sortent pas de la couche `data` ; l'UI ne manipule que les modèles de `core/model` (AND-002).
- Aucun secret dans le code ou les ressources ; aucun token ni donnée personnelle dans les logs (AND-004).
- Tests : ViewModel avec un fake du repository et Turbine ; test UI sur l'écran sans état (AND-005).
- Avant de proposer une PR : `./gradlew ktlintCheck lintDebug testDebugUnitTest`.

## Travail avec l'IA (GLB-011)

- Une fonctionnalité passe par `/feature <issue>` : plan validé par un humain, code, vérification, contrôles par les agents `reviewer`, `qa`, `security`, `devops` (`.claude/agents/`), puis PR. Un bug passe par `/fix <issue>` : test qui reproduit le bug, correction, contrôles, PR. `/review` relit une branche ou une PR sans rien modifier. Une décision d'architecture non couverte : `/adr` (brouillon dans engineering-guidelines, GLB-001).
- Les agents échangent via `.claude/work/<sujet>/` (non versionné) ; la synthèse finale va dans la description de la PR.
- Chaque fichier modifié est formaté et linté automatiquement (`.claude/hooks/after-edit.sh`) : corriger les erreurs renvoyées, ne jamais les contourner.
- Fusion : une fois la PR ouverte, `gh pr merge <n> --squash --auto --delete-branch` ; GitHub fusionne quand la CI est verte. Jamais `--admin`, ni force-push, ni action irréversible hors fusion (migration en production, `tofu apply`, publication) : les préparer et les laisser à un humain.
- Ne jamais annoncer qu'un travail est fini, corrigé ou testé sans avoir lancé la vérification et cité son résultat.
- `.claude/agents`, `.claude/skills` et `.claude/hooks` viennent du repo `boilerplates` : les améliorer là-bas, puis reporter ici.
