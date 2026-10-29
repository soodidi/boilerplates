import CoreNetworking
import Foundation
@testable import NotesFeature
import Synchronization
import Testing

/// Répond toujours la même chose et garde les requêtes reçues.
private final class StubAPI: Sendable {
    private let requests = Mutex<[URLRequest]>([])
    private let status: Int
    private let body: String

    init(status: Int = 200, body: String = "{}") {
        self.status = status
        self.body = body
    }

    var received: [URLRequest] {
        requests.withLock { $0 }
    }

    var transport: APIClient.Transport {
        { request in
            self.requests.withLock { $0.append(request) }
            let url = try #require(request.url)
            let response = try #require(HTTPURLResponse(url: url, statusCode: self.status, httpVersion: nil, headerFields: nil))
            return (Data(self.body.utf8), response)
        }
    }
}

@Suite("LiveNotesRepository")
struct NotesRepositoryTests {
    let id = "0190a5e0-0000-7000-8000-000000000001"

    private func repository(_ api: StubAPI) -> LiveNotesRepository {
        LiveNotesRepository(client: APIClient(baseURL: URL(string: "https://api.example.com")!, transport: api.transport))
    }

    @Test("lit une note par son identifiant")
    func getsOneNote() async throws {
        let api = StubAPI(body: #"{"id":"\#(id)","title":"Coffee","content":"","createdAt":"2026-10-20T09:00:00.000Z"}"#)

        let note = try await repository(api).get(id: id)

        #expect(note.title == "Coffee")
        #expect(api.received.first?.url?.path() == "/v1/notes/\(id)")
    }

    @Test(
        "explique les échecs",
        arguments: [
            // BE-010 : la note d'un autre utilisateur répond 404, comme une note inexistante.
            (404, #"{"title":"Not Found","status":404}"#, ErrorKind.notFound),
            (403, #"{"title":"Forbidden","status":403}"#, .forbidden),
            (500, "oops", .server),
            (200, #"{"id":"x","title":"Coffee","content":"","createdAt":"not a date"}"#, .server),
        ]
    )
    func explainsFailures(status: Int, body: String, expected: ErrorKind) async {
        do {
            _ = try await repository(StubAPI(status: status, body: body)).get(id: id)
            Issue.record("Expected a failure")
        } catch {
            #expect(error.kind == expected)
        }
    }

    @Test("un identifiant qui n'est pas un UUID ne part pas vers l'API", arguments: ["..", "a/b", "../auth/x", ""])
    func refusesNonUUIDs(id: String) async {
        let api = StubAPI()

        await #expect(throws: APIError.http(ProblemDetails(title: "Not Found", status: 404))) {
            _ = try await repository(api).get(id: id)
        }
        #expect(api.received.isEmpty)
    }
}
