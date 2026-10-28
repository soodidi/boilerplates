import Foundation
import OSLog
import Synchronization

/// État de la session, sans le token : l'UI n'a jamais besoin de le connaître.
public enum SessionState: Sendable, Equatable {
    case signedOut
    case signedIn
}

/// BE-006 / IOS-004 : token de session opaque, signé par l'API, sans refresh token.
/// Il est perdu à la déconnexion ou au premier `401`, et l'utilisateur se reconnecte.
///
/// Le token vit en mémoire ; le Keychain n'en garde qu'une copie, relue au démarrage.
/// Utilisable depuis n'importe quel fil : le client HTTP le lit pendant ses requêtes.
public final class SessionStore: Sendable {
    private struct Session {
        var token: String?
        /// La lecture du Keychain a échoué : elle est retentée au prochain accès.
        var needsRead = false
        var observers: [UUID: AsyncStream<SessionState>.Continuation] = [:]

        var state: SessionState {
            token == nil ? .signedOut : .signedIn
        }
    }

    private let storage: any TokenStorage
    private let locked: Mutex<Session>
    private static let logger = Logger(subsystem: "CoreAuth", category: "session")

    public init(storage: any TokenStorage) {
        self.storage = storage
        var session = Session()
        Self.read(from: storage, into: &session)
        locked = Mutex(session)
    }

    public var state: SessionState {
        locked.withLock { session in
            retryRead(&session)
            return session.state
        }
    }

    /// Nombre d'abonnés à `states()`, pour les tests.
    var observerCount: Int {
        locked.withLock { $0.observers.count }
    }

    /// Lu par le client HTTP, sur ses propres fils.
    public func currentToken() -> String? {
        locked.withLock { session in
            retryRead(&session)
            return session.token
        }
    }

    /// Émet l'état courant, puis chaque changement (rares : aucun n'est perdu).
    public func states() -> AsyncStream<SessionState> {
        let (stream, continuation) = AsyncStream.makeStream(of: SessionState.self)
        let id = UUID()
        // Posé avant l'enregistrement : appelé tout de suite, il prendrait le verrou qu'on tient.
        continuation.onTermination = { [weak self] _ in
            self?.locked.withLock { _ = $0.observers.removeValue(forKey: id) }
        }
        locked.withLock { session in
            retryRead(&session)
            session.observers[id] = continuation
            continuation.yield(session.state)
        }
        return stream
    }

    public func save(_ token: String) {
        update(to: token)
    }

    public func clear() {
        update(to: nil)
    }

    /// L'API a refusé ce token : la session est révoquée ou expirée côté serveur.
    /// Un `401` d'une requête partie avec un ancien token ne déconnecte pas la session suivante.
    public func onUnauthorized(_ token: String) {
        update(to: nil, onlyIfCurrent: token)
    }

    /// Sous le verrou, pour que la dernière écriture dans le Keychain soit toujours la bonne.
    /// Un échec d'écriture n'est pas propagé : la session reste valable en mémoire
    /// et sera simplement perdue à la fermeture de l'app. Si c'est l'effacement qui échoue,
    /// la copie revient au lancement suivant : la déconnexion révoque d'abord la session côté
    /// serveur, et ce token périmé reçoit alors un `401`, qui l'efface.
    private func update(to token: String?, onlyIfCurrent expected: String? = nil) {
        locked.withLock { session in
            if let expected, session.token != expected {
                return
            }
            let previous = session.state
            session.token = token
            session.needsRead = false
            do {
                try storage.write(token)
            } catch {
                Self.logger.error("Écriture de la session dans le Keychain impossible : \(String(describing: error))")
            }
            if session.state != previous {
                notify(session)
            }
        }
    }

    /// Keychain indisponible, par exemple quand le système lance l'app en avance (prewarming) avant
    /// le premier déverrouillage : session vue comme déconnectée, et la copie n'est pas effacée.
    private static func read(from storage: any TokenStorage, into session: inout Session) {
        do {
            session.token = try storage.read()
            session.needsRead = false
        } catch {
            logger.error("Session illisible dans le Keychain : \(String(describing: error))")
            session.needsRead = true
        }
    }

    private func retryRead(_ session: inout Session) {
        guard session.needsRead else {
            return
        }
        let previous = session.state
        Self.read(from: storage, into: &session)
        if session.state != previous {
            notify(session)
        }
    }

    private func notify(_ session: Session) {
        for observer in session.observers.values {
            observer.yield(session.state)
        }
    }
}
