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

    func setFailsReads(_ fails: Bool) {
        contents.withLock { $0.failsReads = fails }
    }

    func setFailsWrites(_ fails: Bool) {
        contents.withLock { $0.failsWrites = fails }
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

@Suite("SessionStore", .timeLimit(.minutes(1)))
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

    @Test("Keychain de nouveau lisible : la session revient, et les abonnés le voient")
    func retriesUnreadableStorage() async {
        let storage = InMemoryTokenStorage(token: "stored", failsReads: true)
        let store = SessionStore(storage: storage)
        var states = store.states().makeAsyncIterator()
        #expect(await states.next() == .signedOut)

        storage.setFailsReads(false)

        #expect(store.currentToken() == "stored")
        #expect(await states.next() == .signedIn)
    }

    @Test("une connexion pendant que le Keychain est illisible n'est pas écrasée par la relecture")
    func signInWhileUnreadable() {
        let storage = InMemoryTokenStorage(token: "old", failsReads: true)
        let store = SessionStore(storage: storage)

        store.save("new")
        storage.setFailsReads(false)

        #expect(store.currentToken() == "new")
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

    @Test("effacement impossible : déconnecté en mémoire, la copie reste")
    func clearWhenWriteFails() {
        let storage = InMemoryTokenStorage(token: "token")
        let store = SessionStore(storage: storage)
        storage.setFailsWrites(true)

        store.clear()

        // Choix documenté dans SessionStore : la déconnexion révoque d'abord la session côté serveur,
        // la copie restante recevra un 401 au lancement suivant.
        #expect(store.state == .signedOut)
        #expect(storage.token == "token")
    }

    @Test("émet l'état courant puis chaque changement")
    func streamsStates() async {
        let store = SessionStore(storage: InMemoryTokenStorage())
        var states = store.states().makeAsyncIterator()

        #expect(await states.next() == .signedOut)
        store.save("token")
        #expect(await states.next() == .signedIn)
        // Un nouveau token sans changement d'état n'émet rien : la valeur suivante est celle de clear().
        store.save("other")
        store.clear()
        #expect(await states.next() == .signedOut)
    }

    @Test("un abonné tardif reçoit l'état courant, chaque abonné reçoit les changements")
    func severalObservers() async {
        let store = SessionStore(storage: InMemoryTokenStorage())
        store.save("token")
        var first = store.states().makeAsyncIterator()
        var second = store.states().makeAsyncIterator()

        #expect(await first.next() == .signedIn)
        #expect(await second.next() == .signedIn)
        store.clear()
        #expect(await first.next() == .signedOut)
        #expect(await second.next() == .signedOut)
    }

    @Test("un abonné qui s'arrête est retiré")
    func removesFinishedObserver() async {
        let store = SessionStore(storage: InMemoryTokenStorage())
        let task = Task {
            for await _ in store.states() {}
        }
        while store.observerCount == 0 {
            await Task.yield()
        }

        task.cancel()
        await task.value

        #expect(store.observerCount == 0)
    }
}
