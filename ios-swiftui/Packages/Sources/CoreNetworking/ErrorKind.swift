/// BE-010 : ce que l'écran peut expliquer d'un échec de l'API, quelle que soit la feature.
public enum ErrorKind: Sendable, Equatable {
    /// 401 : la session est expirée ou révoquée. Le client l'efface et l'app revient à la connexion :
    /// l'écran n'affiche rien de plus.
    case unauthorized
    /// 403 : connecté, mais sans la permission.
    case forbidden
    /// 404 : la ressource n'existe pas, ou appartient à un autre utilisateur (l'API ne distingue pas).
    case notFound
    /// Pas de réponse : hors ligne, délai dépassé, serveur arrêté.
    case network
    /// Toute autre erreur, y compris une réponse illisible : réessayer peut suffire.
    case server
}

public extension APIError {
    var kind: ErrorKind {
        switch self {
        case .network: .network
        case .decoding: .server
        case let .http(problem):
            switch problem.status {
            case 401: .unauthorized
            case 403: .forbidden
            case 404: .notFound
            default: .server
            }
        }
    }
}
