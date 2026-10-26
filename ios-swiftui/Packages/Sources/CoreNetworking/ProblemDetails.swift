import Foundation

/// Problem Details (RFC 9457) renvoyé par l'API en cas d'erreur (BE-004).
public struct ProblemDetails: Decodable, Sendable, Equatable {
    public struct FieldError: Decodable, Sendable, Equatable {
        public let field: String
        public let code: String
        public let message: String?

        public init(field: String, code: String, message: String? = nil) {
            self.field = field
            self.code = code
            self.message = message
        }
    }

    public let title: String
    public let status: Int
    public let detail: String?
    public let errors: [FieldError]
    public let traceId: String?

    public init(title: String, status: Int, detail: String? = nil, errors: [FieldError] = [], traceId: String? = nil) {
        self.title = title
        self.status = status
        self.detail = detail
        self.errors = errors
        self.traceId = traceId
    }

    public init(from decoder: any Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        title = try container.decode(String.self, forKey: .title)
        status = try container.decode(Int.self, forKey: .status)
        detail = try container.decodeIfPresent(String.self, forKey: .detail)
        errors = try container.decodeIfPresent([FieldError].self, forKey: .errors) ?? []
        traceId = try container.decodeIfPresent(String.self, forKey: .traceId)
    }

    private enum CodingKeys: String, CodingKey {
        case title, status, detail, errors, traceId
    }
}

/// Erreurs typées du domaine (IOS-004).
public enum APIError: Error, Sendable, Equatable {
    /// L'API a répondu avec une erreur (4xx/5xx).
    case http(ProblemDetails)
    /// Pas de réseau, délai dépassé…
    case network
    /// Réponse illisible : le contrat n'est pas respecté.
    case decoding

    /// Erreur attendue, à afficher à l'utilisateur (pas à envoyer au suivi d'erreurs).
    public var isClientError: Bool {
        if case let .http(problem) = self { return problem.status < 500 }
        return false
    }
}
