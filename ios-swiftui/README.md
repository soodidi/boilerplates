# ios-swiftui

Boilerplate iOS : **Swift 6 (concurrence stricte) + SwiftUI + Observation + async/await**, code organisé en modules Swift Package Manager, projet Xcode généré par XcodeGen, tests Swift Testing.

Il applique les ADR **IOS-001 à IOS-005** de [engineering-guidelines](https://github.com/soodidi/engineering-guidelines).

> Vérifié avec Xcode 26.6 : `swiftformat --lint .`, `swiftlint --strict`, `swift test --package-path Packages` et `xcodebuild test` sur simulateur iOS 26.5 passent. Les tests des modules sont aussi lancés par le schéma `iOSApp`.

## Démarrer un projet

```bash
npx degit soodidi/boilerplates/ios-swiftui mon-app-ios
cd mon-app-ios
git init -b main
brew install xcodegen swiftlint swiftformat
xcodegen generate        # crée iOSApp.xcodeproj (non versionné)
open iOSApp.xcodeproj
```

À personnaliser : `name`, `bundleIdPrefix` et `PRODUCT_BUNDLE_IDENTIFIER` dans `project.yml`, `CFBundleDisplayName` dans `App/Info*.plist`, `API_BASE_URL` (Release) dans `project.yml`, `DEVELOPMENT_TEAM` pour signer.

En Debug, l'app appelle l'API locale (`http://localhost:3000`, boilerplate `api-nestjs`).

## Organisation (IOS-002)

```
project.yml              # définition du projet Xcode (XcodeGen)
App/                     # point d'entrée, injection des dépendances, Info.plist, Privacy Manifest
Packages/                # package local : un target = un module
├── Package.swift
├── Sources/
│   ├── CoreAuth/        # session : token en mémoire, copie dans le Keychain
│   ├── CoreModels/      # modèles du domaine
│   ├── CoreNetworking/  # client HTTP sans cookies, Bearer, Problem Details, APIError
│   ├── DesignSystem/    # espacements, composants partagés
│   └── NotesFeature/    # feature d'exemple : repository, ViewModel, vue, String Catalog
└── Tests/               # Swift Testing
docs/smoke-test.md       # checklist avant soumission (GLB-009)
scripts/test-simulator.sh  # tests du schéma iOSApp sur un simulateur iPhone
```

Une nouvelle feature = un nouveau target `XxxFeature` dans `Package.swift`, qui dépend des modules `Core*` et jamais d'une autre feature. La feature `notes` utilise le même contrat d'API que les boilerplates `api-nestjs`, `web-react-vite` et `android-compose`.

## Ce qui est déjà en place

| Sujet | Où | ADR |
|-------|-----|-----|
| Swift 6, concurrence stricte, `@Observable`, async/await | `Package.swift`, `project.yml` | IOS-001 |
| Vues sans logique métier, `#Preview` (nominal + grande police), annonces VoiceOver | `NotesView.swift` | IOS-001 |
| ViewModel `@MainActor @Observable`, repository derrière un protocole, injection par constructeur | `NotesViewModel.swift`, `App/AppMain.swift` | IOS-002 |
| Modules SPM, frontières vérifiées par le compilateur | `Packages/Package.swift` | IOS-002, IOS-003 |
| Privacy Manifest | `App/PrivacyInfo.xcprivacy` | IOS-003 |
| Client HTTP typé, erreurs Problem Details, ATS strict (exception locale en Debug) | `CoreNetworking`, `App/Info*.plist` | IOS-004 |
| Session : token signé dans le Keychain (`AfterFirstUnlockThisDeviceOnly`), `Bearer` vers l'API seulement, URLSession sans cookies, `401` → session effacée | `CoreAuth`, `CoreNetworking` | IOS-004, BE-006 |
| Textes dans un String Catalog fr/en | `NotesFeature/Resources/Localizable.xcstrings` | GLB-007 |
| Swift Testing avec fakes, SwiftLint + SwiftFormat, CI macOS | `Packages/Tests`, `.swiftlint.yml`, `.github/workflows/ios.yml` | IOS-005 |

## À ajouter selon le projet

- **Persistance locale** : SwiftData (IOS-004).
- **Client généré** depuis la spec OpenAPI avec swift-openapi-generator (IOS-004).
- **Publication** : Fastlane (`match`, TestFlight, publication progressive) (IOS-005).
- **Suivi des crashs** : Sentry ou Crashlytics (IOS-005).
