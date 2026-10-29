import AuthFeature
import CoreAuth
import CoreNetworking
import DesignSystem
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
    @Environment(\.scenePhase) private var scenePhase

    init(dependencies: AppDependencies) {
        self.dependencies = dependencies
        _model = State(initialValue: SessionModel(session: dependencies.session, authRepository: dependencies.authRepository))
    }

    var body: some View {
        Group {
            switch model.state {
            case .signedIn:
                SignedInView(dependencies: dependencies, model: model)
            case .signedOut:
                AuthFlowView(repository: dependencies.authRepository, accountDeleted: model.accountDeleted)
            }
        }
        // GLB-012 : couleur du thème pour les boutons et les liens de toute l'app.
        .tint(AppColor.primary)
        .task { await model.observe() }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active {
                model.refresh()
            }
        }
    }
}

/// Écrans connectés : notes, puis « Mon compte ». Recréée à chaque connexion, avec une pile vide.
private struct SignedInView: View {
    /// IOS-002 : routes typées ; un identifiant, jamais l'objet complet.
    enum Route: Hashable {
        case account
        case note(id: String)
    }

    let dependencies: AppDependencies
    let model: SessionModel
    @State private var path: [Route] = []

    var body: some View {
        NavigationStack(path: $path) {
            // Ces écrans s'ouvrent depuis la liste seulement : un double appui n'en empile pas deux.
            NotesView(
                viewModel: dependencies.makeNotesViewModel(),
                onOpenAccount: { open(.account) },
                onOpenNote: { id in open(.note(id: id)) }
            )
            .navigationDestination(for: Route.self) { route in
                switch route {
                case let .note(id):
                    NoteDetailView(viewModel: dependencies.makeNoteDetailViewModel(id: id))
                case .account:
                    AccountView(
                        viewModel: dependencies.makeAccountViewModel(onAccountDeleted: model.onAccountDeleted),
                        onSignOut: { Task { await model.signOut() } }
                    )
                }
            }
        }
    }

    private func open(_ route: Route) {
        if path.isEmpty {
            path.append(route)
        }
    }
}

/// Suit la session : une connexion, une déconnexion ou un `401` changent d'écran.
@MainActor
@Observable
private final class SessionModel {
    private(set) var state: SessionState
    /// Vrai après la suppression du compte : la connexion le confirme, jusqu'à la session suivante.
    private(set) var accountDeleted = false
    private var isSigningOut = false
    private let session: SessionStore
    private let authRepository: any AuthRepository

    init(session: SessionStore, authRepository: any AuthRepository) {
        self.session = session
        self.authRepository = authRepository
        state = session.state
    }

    /// Relit la session : si le Keychain était illisible au lancement (avant le premier déverrouillage),
    /// la session revient dès qu'il l'est.
    func refresh() {
        update(session.state)
    }

    func observe() async {
        for await state in session.states() {
            update(state)
        }
    }

    /// GLB-013 : l'API a supprimé le compte et révoqué sa session ; l'appareil l'oublie à son tour.
    /// Le message est posé avant : c'est l'effacement de la session qui ramène à la connexion.
    func onAccountDeleted() {
        accountDeleted = true
        session.clear()
    }

    private func update(_ state: SessionState) {
        if state == .signedIn {
            accountDeleted = false
        }
        self.state = state
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
    /// Front web : liens des e-mails, politique de confidentialité, export des données.
    let webBaseURL: URL

    static func make() -> AppDependencies {
        let webBaseURL = url(forInfoKey: "WebBaseURL")
        #if DEBUG
            // XCUITest : parcours complet sans API ni Keychain (voir AppUITests).
            if ProcessInfo.processInfo.arguments.contains(UITestFakes.launchArgument) {
                let session = SessionStore(storage: UITestFakes.MemoryTokenStorage())
                return AppDependencies(
                    session: session,
                    authRepository: UITestFakes.AuthRepository(session: session),
                    notesRepository: UITestFakes.NotesRepository(),
                    webBaseURL: webBaseURL
                )
            }
        #endif
        let apiBaseURL = url(forInfoKey: "APIBaseURL")
        // IOS-004 : session dans le Keychain ; son token part en `Bearer` vers l'API, un `401` l'efface.
        let session = SessionStore(storage: KeychainTokenStorage(service: Bundle.main.bundleIdentifier ?? "app"))
        let client = APIClient(baseURL: apiBaseURL, session: session)
        return AppDependencies(
            session: session,
            authRepository: LiveAuthRepository(client: client, session: session, webBaseURL: webBaseURL),
            notesRepository: LiveNotesRepository(client: client),
            webBaseURL: webBaseURL
        )
    }

    func makeNotesViewModel() -> NotesViewModel {
        NotesViewModel(repository: notesRepository)
    }

    func makeNoteDetailViewModel(id: String) -> NoteDetailViewModel {
        NoteDetailViewModel(id: id, repository: notesRepository)
    }

    func makeAccountViewModel(onAccountDeleted: @escaping @MainActor () -> Void) -> AccountViewModel {
        AccountViewModel(
            repository: authRepository,
            webBaseURL: webBaseURL,
            backupRetentionDays: LegalInfo.backupRetentionDays,
            onAccountDeleted: onAccountDeleted
        )
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
