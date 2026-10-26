# Instructions pour les assistants IA

Ce projet suit [engineering-guidelines](https://github.com/soodidi/engineering-guidelines). Avant de coder, lire `adr/global/README.md` et `adr/android/README.md` de ce repo.

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
