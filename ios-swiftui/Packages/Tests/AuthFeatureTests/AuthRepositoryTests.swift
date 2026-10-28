@testable import AuthFeature
import CoreAuth
import CoreNetworking
import Foundation
import Synchronization
import Testing

private final class MemoryStorage: TokenStorage {
    private let token = Mutex<String?>(nil)

    func read() -> String? {
        token.withLock { $0 }
    }

    func write(_ value: String?) {
        token.withLock { $0 = value }
    }
}

/// Répond toujours la même chose et garde les requêtes reçues.
private final class StubAPI: Sendable {
    private let requests = Mutex<[URLRequest]>([])
    private let status: Int
    private let headers: [String: String]
    private let body: String
    private let fails: Bool

    init(status: Int = 200, headers: [String: String] = [:], body: String = "{}", fails: Bool = false) {
        self.status = status
        self.headers = headers
        self.body = body
        self.fails = fails
    }

    var received: [URLRequest] {
        requests.withLock { $0 }
    }

    func json(_ index: Int = 0) throws -> [String: String] {
        let data = try #require(received[index].httpBody)
        return try JSONDecoder().decode([String: String].self, from: data)
    }

    var transport: APIClient.Transport {
        { request in
            self.requests.withLock { $0.append(request) }
            if self.fails {
                throw URLError(.notConnectedToInternet)
            }
            let url = try #require(request.url)
            let response = try #require(HTTPURLResponse(url: url, statusCode: self.status, httpVersion: nil, headerFields: self.headers))
            return (Data(self.body.utf8), response)
        }
    }
}

@Suite("LiveAuthRepository", .timeLimit(.minutes(1)))
struct AuthRepositoryTests {
    let apiURL = URL(string: "https://api.example.com")!
    let webURL = URL(string: "https://app.example.com")!

    private func repository(_ api: StubAPI, session: SessionStore = SessionStore(storage: MemoryStorage())) -> LiveAuthRepository {
        let client = APIClient(baseURL: apiURL, session: session, transport: api.transport)
        return LiveAuthRepository(client: client, session: session, webBaseURL: webURL)
    }

    @Test("connexion : garde le token signé de l'en-tête, pas celui du corps")
    func signInStoresSignedHeaderToken() async throws {
        let api = StubAPI(headers: ["set-auth-token": "signed.token"], body: #"{"token":"unsigned","user":{}}"#)
        let session = SessionStore(storage: MemoryStorage())

        try await repository(api, session: session).signIn(email: "camille@example.com", password: "secret")

        #expect(session.currentToken() == "signed.token")
        #expect(api.received.first?.url?.path() == "/v1/auth/sign-in/email")
        #expect(try api.json() == ["email": "camille@example.com", "password": "secret"])
    }

    @Test("connexion sans en-tête set-auth-token : erreur, aucune session")
    func signInWithoutHeaderFails() async {
        let api = StubAPI(body: #"{"token":"unsigned"}"#)
        let session = SessionStore(storage: MemoryStorage())

        await #expect(throws: AuthFailure.unknown) {
            try await repository(api, session: session).signIn(email: "camille@example.com", password: "secret")
        }
        #expect(session.state == .signedOut)
    }

    @Test(
        "traduit les erreurs de Better Auth en messages génériques",
        arguments: [
            (401, #"{"code":"INVALID_EMAIL_OR_PASSWORD"}"#, AuthFailure.invalidCredentials),
            (403, #"{"code":"EMAIL_NOT_VERIFIED"}"#, .emailNotVerified),
            (429, "", .tooManyAttempts),
            (401, #"{"code":"OTHER"}"#, .unknown),
            (500, "oops", .unknown),
        ]
    )
    func mapsErrors(status: Int, body: String, expected: AuthFailure) async {
        await #expect(throws: expected) {
            try await repository(StubAPI(status: status, body: body)).signIn(email: "camille@example.com", password: "secret")
        }
    }

    @Test("hors ligne : erreur réseau")
    func networkFailure() async {
        await #expect(throws: AuthFailure.network) {
            try await repository(StubAPI(fails: true)).requestPasswordReset(email: "camille@example.com")
        }
    }

    @Test("inscription : le lien de vérification mène au front web")
    func signUpSendsCallbackURL() async throws {
        let api = StubAPI()

        try await repository(api).signUp(name: "Camille", email: "camille@example.com", password: "a-long-password")

        #expect(api.received.first?.url?.path() == "/v1/auth/sign-up/email")
        #expect(try api.json() == [
            "name": "Camille",
            "email": "camille@example.com",
            "password": "a-long-password",
            "callbackURL": "https://app.example.com/login",
        ])
    }

    @Test("mot de passe oublié : le lien mène à la page du front web")
    func passwordResetSendsRedirect() async throws {
        let api = StubAPI()

        try await repository(api).requestPasswordReset(email: "camille@example.com")

        #expect(api.received.first?.url?.path() == "/v1/auth/request-password-reset")
        #expect(try api.json() == ["email": "camille@example.com", "redirectTo": "https://app.example.com/reset-password"])
    }

    @Test("déconnexion : révoque côté serveur avec le token, puis l'oublie")
    func signOutRevokesThenClears() async {
        let api = StubAPI()
        let session = SessionStore(storage: MemoryStorage())
        session.save("token")

        await repository(api, session: session).signOut()

        #expect(api.received.first?.url?.path() == "/v1/auth/sign-out")
        #expect(api.received.first?.value(forHTTPHeaderField: "Authorization") == "Bearer token")
        #expect(session.state == .signedOut)
    }

    @Test("déconnexion hors ligne : la session est quand même oubliée")
    func signOutOffline() async {
        let session = SessionStore(storage: MemoryStorage())
        session.save("token")

        await repository(StubAPI(fails: true), session: session).signOut()

        #expect(session.state == .signedOut)
    }
}
