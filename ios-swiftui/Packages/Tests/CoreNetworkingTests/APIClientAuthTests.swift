import CoreAuth
@testable import CoreNetworking
import Foundation
import Synchronization
import Testing

/// Garde la dernière requête envoyée, pour vérifier ses en-têtes.
private final class RecordingTransport: Sendable {
    private let lastRequest = Mutex<URLRequest?>(nil)
    private let status: Int
    private let headers: [String: String]
    private let body: String
    private let beforeResponse: @Sendable () -> Void

    init(status: Int = 200, headers: [String: String] = [:], body: String = "{}", beforeResponse: @escaping @Sendable () -> Void = {}) {
        self.status = status
        self.headers = headers
        self.body = body
        self.beforeResponse = beforeResponse
    }

    var request: URLRequest? {
        lastRequest.withLock { $0 }
    }

    var transport: APIClient.Transport {
        { request in
            self.lastRequest.withLock { $0 = request }
            self.beforeResponse()
            let url = try #require(request.url)
            let response = try #require(HTTPURLResponse(url: url, statusCode: self.status, httpVersion: nil, headerFields: self.headers))
            return (Data(self.body.utf8), response)
        }
    }
}

private struct Empty: Codable {}

private final class MemoryStorage: TokenStorage {
    private let token = Mutex<String?>(nil)

    func read() -> String? {
        token.withLock { $0 }
    }

    func write(_ value: String?) {
        token.withLock { $0 = value }
    }
}

@Suite("APIClient : session", .timeLimit(.minutes(1)))
struct APIClientAuthTests {
    let baseURL = URL(string: "https://api.example.com")!

    private func signedIn(_ token: String = "token") -> SessionStore {
        let session = SessionStore(storage: MemoryStorage())
        session.save(token)
        return session
    }

    @Test("URLSession sans cookies, ni envoyés ni stockés (IOS-004)")
    func configurationHasNoCookies() {
        let configuration = APIClient.makeConfiguration()

        #expect(!configuration.httpShouldSetCookies)
        #expect(configuration.httpCookieAcceptPolicy == .never)
        #expect(configuration.httpCookieStorage == nil)
    }

    @Test("envoie le token en Bearer vers l'API")
    func sendsBearer() async throws {
        let recorder = RecordingTransport()
        let client = APIClient(baseURL: baseURL, session: signedIn(), transport: recorder.transport)

        let _: Empty = try await client.get("v1/notes")

        #expect(recorder.request?.value(forHTTPHeaderField: "Authorization") == "Bearer token")
    }

    @Test("sans session, aucun en-tête Authorization")
    func noSessionNoHeader() async throws {
        let recorder = RecordingTransport()
        let client = APIClient(baseURL: baseURL, session: SessionStore(storage: MemoryStorage()), transport: recorder.transport)

        let _: Empty = try await client.get("v1/notes")

        #expect(recorder.request?.value(forHTTPHeaderField: "Authorization") == nil)
    }

    private func httpError(_ status: Int) -> APIError {
        .http(ProblemDetails(title: HTTPURLResponse.localizedString(forStatusCode: status), status: status))
    }

    @Test("un 401 efface la session")
    func unauthorizedClearsSession() async {
        let session = signedIn()
        let client = APIClient(baseURL: baseURL, session: session, transport: RecordingTransport(status: 401).transport)

        await #expect(throws: httpError(401)) {
            let _: Empty = try await client.get("v1/notes")
        }

        #expect(session.state == .signedOut)
    }

    @Test("POST : Bearer envoyé, et un 401 efface la session")
    func postSendsBearerAndHandlesUnauthorized() async {
        let session = signedIn()
        let recorder = RecordingTransport(status: 401)
        let client = APIClient(baseURL: baseURL, session: session, transport: recorder.transport)

        await #expect(throws: httpError(401)) {
            let _: Empty = try await client.post("v1/notes", body: Empty())
        }

        #expect(recorder.request?.value(forHTTPHeaderField: "Authorization") == "Bearer token")
        #expect(session.state == .signedOut)
    }

    @Test("postRaw : Bearer envoyé, et un 401 efface la session sans lever d'erreur")
    func postRawHandlesUnauthorized() async throws {
        let session = signedIn()
        let recorder = RecordingTransport(status: 401)
        let client = APIClient(baseURL: baseURL, session: session, transport: recorder.transport)

        let response = try await client.postRaw("v1/auth/sign-out", body: Empty())

        #expect(response.status == 401)
        #expect(recorder.request?.value(forHTTPHeaderField: "Authorization") == "Bearer token")
        #expect(session.state == .signedOut)
    }

    @Test("postRaw : erreur réseau typée, session conservée")
    func postRawNetworkError() async {
        let session = signedIn()
        let client = APIClient(baseURL: baseURL, session: session) { _ in throw URLError(.notConnectedToInternet) }

        await #expect(throws: APIError.network) {
            _ = try await client.postRaw("v1/auth/sign-out", body: Empty())
        }

        #expect(session.state == .signedIn)
    }

    @Test("une réponse qui n'est pas HTTP est une erreur réseau")
    func nonHTTPResponse() async throws {
        let url = try #require(URL(string: "https://api.example.com/v1/notes"))
        let client = APIClient(baseURL: baseURL) { _ in
            (Data(), URLResponse(url: url, mimeType: nil, expectedContentLength: 0, textEncodingName: nil))
        }

        await #expect(throws: APIError.network) {
            let _: Empty = try await client.get("v1/notes")
        }
    }

    @Test("refuse toute redirection : le Bearer ne suit pas vers un autre hôte (IOS-004)")
    func refusesRedirects() async throws {
        let original = try #require(URL(string: "https://api.example.com/v1/notes"))
        let target = try #require(URL(string: "https://evil.example.org/collect"))
        let redirect = try #require(HTTPURLResponse(
            url: original,
            statusCode: 302,
            httpVersion: nil,
            headerFields: ["Location": target.absoluteString]
        ))
        let session = URLSession(configuration: APIClient.makeConfiguration())
        var next = URLRequest(url: target)
        next.setValue("Bearer token", forHTTPHeaderField: "Authorization")

        let followed = await APIClient.NoRedirects().urlSession(
            session,
            task: session.dataTask(with: original),
            willPerformHTTPRedirection: redirect,
            newRequest: next
        )

        #expect(followed == nil)
    }

    @Test("un 401 arrivé après une reconnexion garde la nouvelle session")
    func staleUnauthorizedKeepsNewSession() async {
        let session = signedIn("old")
        // La requête part avec « old » ; l'utilisateur se reconnecte avant la réponse.
        let recorder = RecordingTransport(status: 401) { session.save("new") }
        let client = APIClient(baseURL: baseURL, session: session, transport: recorder.transport)

        await #expect(throws: httpError(401)) {
            let _: Empty = try await client.get("v1/notes")
        }

        #expect(recorder.request?.value(forHTTPHeaderField: "Authorization") == "Bearer old")
        #expect(session.currentToken() == "new")
    }

    @Test("une autre erreur ne touche pas à la session")
    func otherErrorsKeepSession() async {
        let session = signedIn()
        let client = APIClient(baseURL: baseURL, session: session, transport: RecordingTransport(status: 403).transport)

        await #expect(throws: httpError(403)) {
            let _: Empty = try await client.get("v1/notes")
        }

        #expect(session.state == .signedIn)
    }

    @Test("postRaw rend le statut, le corps et les en-têtes, sans lever d'erreur HTTP")
    func rawResponse() async throws {
        let recorder = RecordingTransport(
            status: 401,
            headers: ["Set-Auth-Token": "signed"],
            body: #"{"code":"INVALID_EMAIL_OR_PASSWORD"}"#
        )
        let client = APIClient(baseURL: baseURL, transport: recorder.transport)

        let response = try await client.postRaw("v1/auth/sign-in/email", body: Empty())

        #expect(response.status == 401)
        #expect(!response.isSuccess)
        #expect(response.header("set-auth-token") == "signed")
        #expect(String(bytes: response.data, encoding: .utf8)?.contains("INVALID_EMAIL_OR_PASSWORD") == true)
        #expect(recorder.request?.httpMethod == "POST")
        #expect(recorder.request?.value(forHTTPHeaderField: "Content-Type") == "application/json")
    }
}
