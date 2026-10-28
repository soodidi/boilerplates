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
        let stored: String?
        do {
            stored = try storage.read()
        } catch {
            // Appareil verrouillé avant le premier déverrouillage, ou Keychain indisponible :
            // l'utilisateur se reconnecte ; la copie n'est pas effacée, elle sera remplacée.
            Self.logger.error("Session illisible dans le Keychain : \(String(describing: error))")
            stored = nil
        }
        locked = Mutex(Session(token: stored))
    }

    public var state: SessionState {
        locked.withLock { $0.state }
    }

    /// Lu par le client HTTP, sur ses propres fils.
    public func currentToken() -> String? {
        locked.withLock { $0.token }
    }

    /// Émet l'état courant, puis chaque changement.
    public func states() -> AsyncStream<SessionState> {
        let (stream, continuation) = AsyncStream.makeStream(of: SessionState.self, bufferingPolicy: .bufferingNewest(1))
        let id = UUID()
        // Posé avant l'enregistrement : appelé tout de suite, il prendrait le verrou qu'on tient.
        continuation.onTermination = { [weak self] _ in
            self?.locked.withLock { _ = $0.observers.removeValue(forKey: id) }
        }
        locked.withLock { session in
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
    /// et sera simplement perdue à la fermeture de l'app.
    private func update(to token: String?, onlyIfCurrent expected: String? = nil) {
        locked.withLock { session in
            if let expected, session.token != expected {
                return
            }
            let previous = session.state
            session.token = token
            do {
                try storage.write(token)
            } catch {
                Self.logger.error("Écriture de la session dans le Keychain impossible : \(String(describing: error))")
            }
            if session.state != previous {
                for observer in session.observers.values {
                    observer.yield(session.state)
                }
            }
        }
    }
}
