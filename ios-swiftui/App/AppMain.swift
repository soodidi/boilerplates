import CoreAuth
import CoreNetworking
import NotesFeature
import SwiftUI

@main
struct AppMain: App {
    /// IOS-002 : conteneur de dépendances construit une seule fois au démarrage, injection par constructeur.
    private let dependencies = AppDependencies()

    var body: some Scene {
        WindowGroup {
            NavigationStack {
                NotesView(viewModel: dependencies.makeNotesViewModel())
            }
        }
    }
}

@MainActor
private struct AppDependencies {
    let session: SessionStore
    let apiClient: APIClient

    init() {
        guard
            let value = Bundle.main.object(forInfoDictionaryKey: "APIBaseURL") as? String,
            let baseURL = URL(string: value)
        else {
            preconditionFailure("APIBaseURL manquant ou invalide dans Info.plist")
        }
        // IOS-004 : session dans le Keychain ; son token part en `Bearer` vers l'API, un `401` l'efface.
        session = SessionStore(storage: KeychainTokenStorage(service: Bundle.main.bundleIdentifier ?? "app"))
        apiClient = APIClient(baseURL: baseURL, session: session)
    }

    func makeNotesViewModel() -> NotesViewModel {
        NotesViewModel(repository: LiveNotesRepository(client: apiClient))
    }
}
