import CoreModels
import CoreNetworking
import Foundation
@testable import NotesFeature
import Testing

/// IOS-005 : un fake du repository plutôt qu'un mock généré.
private actor FakeNoteRepository: NotesRepository {
    private var result: Result<Note, APIError>
    private(set) var gets = 0
    private var gate: CheckedContinuation<Void, Never>?
    private var isGated = false

    init(_ result: Result<Note, APIError>) {
        self.result = result
    }

    func setResult(_ result: Result<Note, APIError>) {
        self.result = result
    }

    /// Le prochain chargement attend `release()` : l'état « en cours » devient observable.
    func holdNextGet() {
        isGated = true
    }

    var isHolding: Bool {
        gate != nil
    }

    func release() {
        gate?.resume()
        gate = nil
    }

    func list(query _: String) async throws(APIError) -> [Note] {
        []
    }

    func get(id _: String) async throws(APIError) -> Note {
        gets += 1
        if isGated {
            isGated = false
            await withCheckedContinuation { gate = $0 }
        }
        return try result.get()
    }

    func create(title _: String) async throws(APIError) -> Note {
        throw .network
    }
}

@MainActor
@Suite("NoteDetailViewModel")
struct NoteDetailViewModelTests {
    let note = Note(id: "1", title: "Coffee", content: "Arabica", createdAt: .now)

    @Test("charge la note de la route")
    func loadsTheNote() async {
        let viewModel = NoteDetailViewModel(id: "1", repository: FakeNoteRepository(.success(note)))

        await viewModel.load()

        #expect(viewModel.state == .loaded(note))
    }

    @Test(
        "explique chaque échec",
        arguments: [
            (APIError.http(ProblemDetails(title: "x", status: 404)), ErrorKind.notFound),
            (.http(ProblemDetails(title: "x", status: 403)), .forbidden),
            // Le client efface la session : l'écran n'affiche pas d'erreur.
            (.http(ProblemDetails(title: "x", status: 401)), .unauthorized),
            (.network, .network),
            (.decoding, .server),
        ]
    )
    func explainsFailures(error: APIError, expected: ErrorKind) async {
        let viewModel = NoteDetailViewModel(id: "1", repository: FakeNoteRepository(.failure(error)))

        await viewModel.load()

        #expect(viewModel.state == .failed(expected))
    }

    @Test("réessaie après une panne, et ignore un second appui pendant le chargement")
    func retries() async {
        let repository = FakeNoteRepository(.failure(.network))
        let viewModel = NoteDetailViewModel(id: "1", repository: repository)
        await viewModel.load()
        #expect(viewModel.state == .failed(.network))

        await repository.setResult(.success(note))
        await repository.holdNextGet()
        let first = Task { await viewModel.load() }
        while await !repository.isHolding {
            await Task.yield()
        }
        #expect(viewModel.state == .loading)
        await viewModel.load()
        await repository.release()
        await first.value

        #expect(viewModel.state == .loaded(note))
        #expect(await repository.gets == 2)
    }
}
