import CoreModels
import CoreNetworking
import Foundation
import Observation

/// IOS-002 : un ViewModel par écran, `@Observable` et `@MainActor`, testable sans UI.
@MainActor
@Observable
public final class NotesViewModel {
    public enum LoadState: Equatable {
        case loading
        case loaded
        case failed
    }

    public enum Message: Equatable {
        case noteAdded
        case addFailed
    }

    public private(set) var notes: [Note] = []
    public private(set) var loadState: LoadState = .loading
    public private(set) var isSubmitting = false
    public private(set) var titleIsInvalid = false
    /// Message ponctuel, effacé par la vue une fois affiché.
    public var message: Message?
    public var query = ""
    public var draftTitle = "" {
        didSet { titleIsInvalid = false }
    }

    private let repository: any NotesRepository

    public init(repository: any NotesRepository) {
        self.repository = repository
    }

    public func load() async {
        loadState = .loading
        do {
            notes = try await repository.list(query: query)
            loadState = .loaded
        } catch {
            loadState = .failed
        }
    }

    /// Appelée à chaque frappe : la vue relance via `.task(id:)`, qui annule la recherche précédente.
    public func search() async {
        do {
            try await Task.sleep(for: .milliseconds(300))
        } catch {
            return
        }
        await load()
    }

    public func submit() async {
        let title = draftTitle.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !title.isEmpty else {
            titleIsInvalid = true
            return
        }
        isSubmitting = true
        defer { isSubmitting = false }
        do throws(APIError) {
            _ = try await repository.create(title: title)
            draftTitle = ""
            message = .noteAdded
            await load()
        } catch {
            // Erreur de validation renvoyée par l'API sur le champ titre (Problem Details).
            if case let .http(problem) = error, problem.errors.contains(where: { $0.field == "title" }) {
                titleIsInvalid = true
            } else {
                message = .addFailed
            }
        }
    }
}
