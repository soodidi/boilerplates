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
2. Changer `app_name` dans `res/values*/strings.xml` et les URL de production (`API_BASE_URL` et `WEB_BASE_URL`, buildType `release`). `WEB_BASE_URL` est le front web : il DOIT figurer dans `CORS_ORIGINS` de l'API, sinon l'inscription et le mot de passe oublié sont refusés (`INVALID_CALLBACK_URL`).
3. Lancer l'API locale (boilerplate `api-nestjs`, `npm run setup && npm run stack`) : l'émulateur la joint sur `http://10.0.2.2:3000`. Les e-mails arrivent dans Mailpit (`http://localhost:8025`), et leurs liens s'ouvrent dans le navigateur de la machine.

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
│   ├── auth/           # session : stockage chiffré, intercepteur Bearer
│   ├── designsystem/   # thème, espacements
│   ├── di/             # portée de l'application
│   ├── model/          # modèles du domaine
│   └── network/        # Retrofit, OkHttp, erreurs Problem Details
├── feature/
│   ├── auth/           # connexion, inscription, mot de passe oublié
│   └── notes/
│       ├── data/       # API, DTO, repository (+ module Hilt)
│       └── ui/         # ViewModel + écran Compose
└── navigation/         # NavHost, routes typées, graphe selon la session
```

## Authentification (BE-006, AND-004)

- **Connexion** : l'API renvoie un token de session **signé** dans l'en-tête `set-auth-token`. Le token du corps de la réponse n'est pas signé et n'est pas utilisé.
- **Stockage** : le token est chiffré avec Tink (AES-256-GCM, keyset protégé par une clé de l'Android Keystore), puis stocké dans le DataStore `secure`. Le fichier et le keyset sont exclus des sauvegardes et des transferts : sur un nouvel appareil, l'utilisateur se reconnecte.
- **Requêtes** : `AuthInterceptor` ajoute `Authorization: Bearer` aux appels vers `API_BASE_URL`, et seulement vers elle. Pas de cookies.
- **Fin de session** : il n'y a pas de refresh token. Un `401` efface le token, et la navigation revient à la connexion. La déconnexion révoque la session côté serveur si le réseau le permet, et l'oublie localement dans tous les cas. Changer de graphe vide la pile de navigation : les ViewModels de l'utilisateur précédent sont détruits.
- **Inscription et mot de passe oublié** : les formulaires sont dans l'app. Les liens des e-mails ouvrent le front web (`WEB_BASE_URL` + `login` ou `reset-password`), puis l'utilisateur revient se connecter dans l'app. Il n'y a pas de deep links.
- **Logs debug** : les routes `/v1/auth/` ne journalisent que leurs en-têtes, masqués (`Authorization`, `set-auth-token`, cookies). Elles ne journalisent jamais leur corps.

La feature `notes` utilise le même contrat d'API que les boilerplates `api-nestjs` et `web-react-vite`.

## Ce qui est déjà en place

| Sujet | Où | ADR |
|-------|-----|-----|
| Compose uniquement, composables sans état + `@Preview`, thème centralisé | `feature/notes/ui/NotesScreen.kt`, `core/designsystem` | AND-001 |
| ViewModel exposant un seul `StateFlow<UiState>`, messages dans l'état | `NotesViewModel.kt` | AND-002 |
| Navigation Compose avec routes typées | `navigation/AppNavHost.kt` | AND-002 |
| Hilt (KSP), injection par constructeur, repository derrière une interface | `NotesDataModule.kt` | AND-003 |
| Retrofit + kotlinx.serialization, erreurs Problem Details typées | `core/network` | AND-004 |
| Session Better Auth : token `Bearer` chiffré (Tink + Keystore), `401` → connexion, déconnexion | `core/auth`, `feature/auth` | AND-004, BE-006 |
| HTTPS uniquement (HTTP local autorisé en debug), backups sans données sensibles, R8 | `AndroidManifest.xml`, `res/xml`, `app/build.gradle.kts` | AND-004 |
| Tests des ViewModels avec un fake et Turbine, intercepteur et repository contre MockWebServer, tests UI des écrans | `app/src/test`, `app/src/androidTest` | AND-005 |
| ktlint + Android Lint + tests en CI | `.github/workflows/android.yml` | AND-005 |

## À ajouter selon le projet

- **Liens des e-mails dans l'app** (App Links) : vérification et nouveau mot de passe sans passer par le web. Cela demande `assetlinks.json` sur le domaine.
- **Hors-ligne** : base Room comme source de vérité, le réseau la met à jour (AND-002).
- **detekt** : à ajouter quand sa version 2 (compatible Kotlin 2.2) sera stable (AND-005).
- **Publication** : Fastlane ou Gradle Play Publisher, Play App Signing, déploiement progressif (AND-005).
- **Client API généré** depuis la spec OpenAPI de l'API (AND-004).
