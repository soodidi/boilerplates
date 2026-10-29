import CoreModels
import CoreNetworking
import Foundation
import Observation

/// Route du détail d'une note : un identifiant, jamais l'objet complet (IOS-002).
struct NoteRoute: Hashable {
    let id: String
}

/// IOS-002 : détail d'une note, chargé à l'ouverture de l'écran.
@MainActor
@Observable
public final class NoteDetailViewModel {
    public enum State: Equatable {
        case loading
        case loaded(Note)
        /// BE-010 : note introuvable (ou d'un autre utilisateur), refus, panne réseau ou serveur.
        case failed(ErrorKind)
    }

    public private(set) var state: State = .loading

    private let id: String
    private let repository: any NotesRepository
    private var isLoading = false

    public init(id: String, repository: any NotesRepository) {
        self.id = id
        self.repository = repository
    }

    /// Un second appui pendant le chargement est ignoré.
    public func load() async {
        guard !isLoading else {
            return
        }
        isLoading = true
        defer { isLoading = false }
        state = .loading
        do throws(APIError) {
            state = try await .loaded(repository.get(id: id))
        } catch {
            state = .failed(error.kind)
        }
    }
}
