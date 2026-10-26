# android-compose

Boilerplate Android : **Kotlin + Jetpack Compose + Material 3 + Hilt + Retrofit/OkHttp + kotlinx.serialization + coroutines/Flow**, Room, DataStore et Tink prêts à l'emploi.

Il applique les ADR **AND-001 à AND-005** de [engineering-guidelines](https://github.com/soodidi/engineering-guidelines).

> Les versions du catalogue sont des versions stables éprouvées ensemble (AGP 8.13, Kotlin 2.2, Compose BOM 2025.09). Après la création du projet, lancer l'**AGP Upgrade Assistant** d'Android Studio puis laisser Renovate proposer le reste.

## Démarrer un projet

```bash
npx degit soodidi/boilerplates/android-compose mon-app-android
cd mon-app-android
git init -b main
```

Puis ouvrir le dossier dans Android Studio (JDK 17), et :

1. Renommer le package `com.example.app` (*Refactor → Rename* sur le package) et mettre à jour `namespace` / `applicationId` dans `app/build.gradle.kts`.
2. Changer `app_name` dans `res/values*/strings.xml` et l'URL de production (`API_BASE_URL`, buildType `release`).
3. Lancer l'API locale (boilerplate `api-nestjs`) : l'émulateur la joint sur `http://10.0.2.2:3000`.

```bash
./gradlew ktlintFormat              # applique le style
./gradlew ktlintCheck lintDebug testDebugUnitTest assembleDebug   # ce que vérifie la CI
./gradlew connectedDebugAndroidTest # tests UI (émulateur ou appareil)
```

## Organisation

Un seul module `:app` au départ, rangé comme les futurs modules (AND-003) : quand l'app grandit, chaque dossier de premier niveau devient un module Gradle (`:core:network`, `:feature:notes`…).

```
app/src/main/java/com/example/app/
├── App.kt / MainActivity.kt
├── core/
│   ├── designsystem/   # thème, espacements
│   ├── model/          # modèles du domaine
│   └── network/        # Retrofit, OkHttp, erreurs Problem Details
├── feature/
│   └── notes/
│       ├── data/       # API, DTO, repository (+ module Hilt)
│       └── ui/         # ViewModel + écran Compose
└── navigation/         # NavHost, routes typées
```

La feature `notes` utilise le même contrat d'API que les boilerplates `api-nestjs` et `web-react-vite`.

## Ce qui est déjà en place

| Sujet | Où | ADR |
|-------|-----|-----|
| Compose uniquement, composables sans état + `@Preview`, thème centralisé | `feature/notes/ui/NotesScreen.kt`, `core/designsystem` | AND-001 |
| ViewModel exposant un seul `StateFlow<UiState>`, messages dans l'état | `NotesViewModel.kt` | AND-002 |
| Navigation Compose avec routes typées | `navigation/AppNavHost.kt` | AND-002 |
| Hilt (KSP), injection par constructeur, repository derrière une interface | `NotesDataModule.kt` | AND-003 |
| Retrofit + kotlinx.serialization, erreurs Problem Details typées | `core/network` | AND-004 |
| HTTPS uniquement (HTTP local autorisé en debug), backups sans données sensibles, R8 | `AndroidManifest.xml`, `res/xml`, `app/build.gradle.kts` | AND-004 |
| Tests du ViewModel avec un fake et Turbine, test UI de l'écran | `app/src/test`, `app/src/androidTest` | AND-005 |
| ktlint + Android Lint + tests en CI | `.github/workflows/android.yml` | AND-005 |

## À ajouter selon le projet

- **Authentification** : tokens chiffrés avec une clé du Keystore (Tink) dans DataStore, intercepteur OkHttp + `Authenticator` pour le refresh (AND-004, BE-006).
- **Hors-ligne** : base Room comme source de vérité, le réseau la met à jour (AND-002).
- **detekt** : à ajouter quand sa version 2 (compatible Kotlin 2.2) sera stable (AND-005).
- **Publication** : Fastlane ou Gradle Play Publisher, Play App Signing, déploiement progressif (AND-005).
- **Client API généré** depuis la spec OpenAPI de l'API (AND-004).
