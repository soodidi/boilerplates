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
    let apiClient: APIClient

    init() {
        guard
            let value = Bundle.main.object(forInfoDictionaryKey: "APIBaseURL") as? String,
            let baseURL = URL(string: value)
        else {
            preconditionFailure("APIBaseURL manquant ou invalide dans Info.plist")
        }
        apiClient = APIClient(baseURL: baseURL)
    }

    func makeNotesViewModel() -> NotesViewModel {
        NotesViewModel(repository: LiveNotesRepository(client: apiClient))
    }
}
