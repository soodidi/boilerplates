import AuthFeature
import CoreAuth
import CoreNetworking
import NotesFeature
import SwiftUI

@main
struct AppMain: App {
    /// IOS-002 : conteneur de dépendances construit une seule fois au démarrage, injection par constructeur.
    private let dependencies = AppDependencies.make()

    var body: some Scene {
        WindowGroup {
            RootView(dependencies: dependencies)
        }
    }
}

/// Bascule entre l'authentification et l'app selon la session. Changer de branche recrée les vues
/// et leurs ViewModels : aucune donnée du compte précédent ne survit.
private struct RootView: View {
    let dependencies: AppDependencies
    @State private var model: SessionModel

    init(dependencies: AppDependencies) {
        self.dependencies = dependencies
        _model = State(initialValue: SessionModel(session: dependencies.session, authRepository: dependencies.authRepository))
    }

    var body: some View {
        Group {
            switch model.state {
            case .signedIn:
                NavigationStack {
                    NotesView(viewModel: dependencies.makeNotesViewModel()) {
                        Task { await model.signOut() }
                    }
                }
            case .signedOut:
                AuthFlowView(repository: dependencies.authRepository)
            }
        }
        .task { await model.observe() }
    }
}

/// Suit la session : une connexion, une déconnexion ou un `401` changent d'écran.
@MainActor
@Observable
private final class SessionModel {
    private(set) var state: SessionState
    private var isSigningOut = false
    private let session: SessionStore
    private let authRepository: any AuthRepository

    init(session: SessionStore, authRepository: any AuthRepository) {
        self.session = session
        self.authRepository = authRepository
        state = session.state
    }

    func observe() async {
        for await state in session.states() {
            self.state = state
        }
    }

    /// Un second appui pendant la déconnexion est ignoré.
    func signOut() async {
        guard !isSigningOut else {
            return
        }
        isSigningOut = true
        defer { isSigningOut = false }
        await authRepository.signOut()
    }
}

@MainActor
private struct AppDependencies {
    let session: SessionStore
    let authRepository: any AuthRepository
    let notesRepository: any NotesRepository

    static func make() -> AppDependencies {
        #if DEBUG
            // XCUITest : parcours complet sans API ni Keychain (voir AppUITests).
            if ProcessInfo.processInfo.arguments.contains(UITestFakes.launchArgument) {
                let session = SessionStore(storage: UITestFakes.MemoryTokenStorage())
                return AppDependencies(
                    session: session,
                    authRepository: UITestFakes.AuthRepository(session: session),
                    notesRepository: UITestFakes.NotesRepository()
                )
            }
        #endif
        let apiBaseURL = url(forInfoKey: "APIBaseURL")
        // IOS-004 : session dans le Keychain ; son token part en `Bearer` vers l'API, un `401` l'efface.
        let session = SessionStore(storage: KeychainTokenStorage(service: Bundle.main.bundleIdentifier ?? "app"))
        let client = APIClient(baseURL: apiBaseURL, session: session)
        return AppDependencies(
            session: session,
            authRepository: LiveAuthRepository(client: client, session: session, webBaseURL: url(forInfoKey: "WebBaseURL")),
            notesRepository: LiveNotesRepository(client: client)
        )
    }

    func makeNotesViewModel() -> NotesViewModel {
        NotesViewModel(repository: notesRepository)
    }

    private static func url(forInfoKey key: String) -> URL {
        guard
            let value = Bundle.main.object(forInfoDictionaryKey: key) as? String,
            let url = URL(string: value)
        else {
            preconditionFailure("\(key) manquant ou invalide dans Info.plist")
        }
        return url
    }
}
