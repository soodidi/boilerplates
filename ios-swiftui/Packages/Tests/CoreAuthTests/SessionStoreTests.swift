@testable import CoreAuth
import Synchronization
import Testing

/// IOS-005 : un fake du stockage plutôt que le Keychain, indisponible sous `swift test` (macOS).
final class InMemoryTokenStorage: TokenStorage {
    private struct Contents {
        var token: String?
        var failsReads = false
        var failsWrites = false
    }

    private let contents: Mutex<Contents>

    init(token: String? = nil, failsReads: Bool = false, failsWrites: Bool = false) {
        contents = Mutex(Contents(token: token, failsReads: failsReads, failsWrites: failsWrites))
    }

    var token: String? {
        contents.withLock { $0.token }
    }

    func read() throws -> String? {
        try contents.withLock { contents in
            if contents.failsReads {
                throw KeychainError(status: -25308)
            }
            return contents.token
        }
    }

    func write(_ token: String?) throws {
        try contents.withLock { contents in
            if contents.failsWrites {
                throw KeychainError(status: -34018)
            }
            contents.token = token
        }
    }
}

@Suite("SessionStore")
struct SessionStoreTests {
    @Test("reprend la session enregistrée au démarrage")
    func restoresStoredSession() {
        let store = SessionStore(storage: InMemoryTokenStorage(token: "stored"))

        #expect(store.state == .signedIn)
        #expect(store.currentToken() == "stored")
    }

    @Test("démarre déconnecté sans session enregistrée")
    func startsSignedOut() {
        let store = SessionStore(storage: InMemoryTokenStorage())

        #expect(store.state == .signedOut)
        #expect(store.currentToken() == nil)
    }

    @Test("Keychain illisible : déconnecté, sans effacer la copie")
    func unreadableStorage() {
        let storage = InMemoryTokenStorage(token: "stored", failsReads: true)
        let store = SessionStore(storage: storage)

        #expect(store.state == .signedOut)
        #expect(storage.token == "stored")
    }

    @Test("enregistre puis efface le token")
    func savesAndClears() {
        let storage = InMemoryTokenStorage()
        let store = SessionStore(storage: storage)

        store.save("token")
        #expect(store.state == .signedIn)
        #expect(storage.token == "token")

        store.clear()
        #expect(store.state == .signedOut)
        #expect(storage.token == nil)
    }

    @Test("un 401 efface le token qui l'a provoqué")
    func unauthorizedClearsCurrentToken() {
        let storage = InMemoryTokenStorage(token: "token")
        let store = SessionStore(storage: storage)

        store.onUnauthorized("token")

        #expect(store.state == .signedOut)
        #expect(storage.token == nil)
    }

    @Test("un 401 d'un ancien token ne déconnecte pas la nouvelle session")
    func unauthorizedIgnoresStaleToken() {
        let storage = InMemoryTokenStorage(token: "old")
        let store = SessionStore(storage: storage)
        store.save("new")

        store.onUnauthorized("old")

        #expect(store.currentToken() == "new")
        #expect(storage.token == "new")
    }

    @Test("écriture impossible : la session reste valable en mémoire")
    func keepsSessionWhenWriteFails() {
        let store = SessionStore(storage: InMemoryTokenStorage(failsWrites: true))

        store.save("token")

        #expect(store.state == .signedIn)
        #expect(store.currentToken() == "token")
    }

    @Test("émet l'état courant puis chaque changement")
    func streamsStates() async {
        let store = SessionStore(storage: InMemoryTokenStorage())
        var states = store.states().makeAsyncIterator()

        #expect(await states.next() == .signedOut)
        store.save("token")
        #expect(await states.next() == .signedIn)
        store.save("other")
        store.clear()
        // Un nouveau token sans changement d'état n'émet rien.
        #expect(await states.next() == .signedOut)
    }
}
