# Instructions pour les assistants IA

Ce projet suit [engineering-guidelines](https://github.com/soodidi/engineering-guidelines). Avant de coder, lire `adr/global/README.md` et `adr/ios/README.md` de ce repo.

## Règles à appliquer sans demander

- Swift 6 en concurrence stricte, SwiftUI, async/await, `@Observable` (pas d'`ObservableObject`, pas de Combine) (IOS-001).
- Nouvelle fonctionnalité = nouveau target `XxxFeature` dans `Packages/Package.swift`, sur le modèle de `NotesFeature`. Une feature ne dépend jamais d'une autre feature (IOS-002).
- Un ViewModel `@MainActor @Observable` par écran, qui dépend d'un protocole de repository injecté par le constructeur (IOS-002).
- Les vues ne contiennent ni logique métier ni appel réseau ; chaque vue a un `#Preview` (IOS-001).
- Aucun texte en dur : clés dans le String Catalog du module, en français et en anglais (GLB-007).
- Les DTO restent dans le module de la feature ; les vues ne manipulent que les modèles de `CoreModels`.
- Pas de `print` : `Logger` (OSLog) avec la confidentialité par défaut ; jamais de token ni de donnée personnelle (IOS-004).
- Ne pas modifier le `.xcodeproj` à la main : il est généré par `xcodegen generate` depuis `project.yml`.
- Avant de proposer une PR : `swiftformat --lint .`, `swiftlint --strict`, `swift test --package-path Packages`.
