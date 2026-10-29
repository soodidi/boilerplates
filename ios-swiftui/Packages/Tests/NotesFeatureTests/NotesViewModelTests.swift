import CoreModels
import CoreNetworking
import Foundation
@testable import NotesFeature
import Testing

/// IOS-005 : un fake du repository plutôt qu'un mock généré.
private actor FakeNotesRepository: NotesRepository {
    private(set) var notes: [Note] = []
    private(set) var lastQuery: String?
    var createError: APIError?

    init(notes: [Note] = []) {
        self.notes = notes
    }

    func setCreateError(_ error: APIError) {
        createError = error
    }

    func list(query: String) async throws(APIError) -> [Note] {
        lastQuery = query
        return query.isEmpty ? notes : notes.filter { $0.title.localizedCaseInsensitiveContains(query) }
    }

    func get(id: String) async throws(APIError) -> Note {
        guard let note = notes.first(where: { $0.id == id }) else {
            throw .http(ProblemDetails(title: "Not Found", status: 404))
        }
        return note
    }

    func create(title: String) async throws(APIError) -> Note {
        if let createError {
            throw createError
        }
        let note = Note(id: "\(notes.count + 1)", title: title, content: "", createdAt: .now)
        notes.append(note)
        return note
    }
}

@MainActor
@Suite("NotesViewModel")
struct NotesViewModelTests {
    @Test("charge les notes")
    func loadsNotes() async {
        let repository = FakeNotesRepository(notes: [Note(id: "1", title: "Coffee", content: "", createdAt: .now)])
        let viewModel = NotesViewModel(repository: repository)

        await viewModel.load()

        #expect(viewModel.loadState == .loaded)
        #expect(viewModel.notes.map(\.title) == ["Coffee"])
    }

    @Test("refuse un titre vide sans appeler l'API")
    func rejectsEmptyTitle() async {
        let repository = FakeNotesRepository()
        let viewModel = NotesViewModel(repository: repository)

        viewModel.draftTitle = "   "
        await viewModel.submit()

        #expect(viewModel.titleIsInvalid)
        #expect(await repository.notes.isEmpty)
    }

    @Test("crée la note, vide le brouillon et affiche un message")
    func createsNote() async {
        let viewModel = NotesViewModel(repository: FakeNotesRepository())

        viewModel.draftTitle = "Buy coffee"
        await viewModel.submit()

        #expect(viewModel.draftTitle.isEmpty)
        #expect(viewModel.message == .noteAdded)
        #expect(viewModel.notes.map(\.title) == ["Buy coffee"])
    }

    @Test("reporte sur le champ l'erreur de validation renvoyée par l'API")
    func mapsFieldError() async {
        let repository = FakeNotesRepository()
        await repository.setCreateError(.http(ProblemDetails(
            title: "Validation failed",
            status: 400,
            errors: [.init(field: "title", code: "too_small", message: nil)]
        )))
        let viewModel = NotesViewModel(repository: repository)

        viewModel.draftTitle = "x"
        await viewModel.submit()

        #expect(viewModel.titleIsInvalid)
        #expect(viewModel.message == nil)
    }

    @Test("affiche une erreur quand le chargement échoue")
    func showsLoadFailure() async {
        let viewModel = NotesViewModel(repository: FailingRepository())

        await viewModel.load()

        // BE-010 : l'écran sait pourquoi (ici, l'API ne répond pas).
        #expect(viewModel.loadState == .failed(.network))
    }
}

private struct FailingRepository: NotesRepository {
    func list(query _: String) async throws(APIError) -> [Note] {
        throw .network
    }

    func get(id _: String) async throws(APIError) -> Note {
        throw .network
    }

    func create(title _: String) async throws(APIError) -> Note {
        throw .network
    }
}
