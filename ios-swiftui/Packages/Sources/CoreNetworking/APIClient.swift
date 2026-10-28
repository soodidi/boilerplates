import CoreAuth
import Foundation

/// Client HTTP minimal (IOS-004). À remplacer par le client généré depuis la spec OpenAPI
/// (swift-openapi-generator) quand le backend la publie.
public final class APIClient: Sendable {
    /// Transport injectable : URLSession en production, réponses contrôlées dans les tests.
    public typealias Transport = @Sendable (URLRequest) async throws -> (Data, URLResponse)

    private let baseURL: URL
    private let session: SessionStore?
    private let transport: Transport
    private let decoder: JSONDecoder
    private let encoder = JSONEncoder()

    /// `session` : si présent, son token part en `Authorization: Bearer` vers l'API, et un `401` l'efface.
    public init(baseURL: URL, session: SessionStore? = nil, transport: Transport? = nil) {
        self.baseURL = baseURL
        self.session = session
        self.transport = transport ?? { request in try await APIClient.urlSession.data(for: request) }
        decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom { decoder in
            let value = try decoder.singleValueContainer().decode(String.self)
            // BE-004 : dates ISO 8601 en UTC, avec ou sans millisecondes.
            if let date = try? Date.ISO8601FormatStyle(includingFractionalSeconds: true).parse(value) {
                return date
            }
            return try Date.ISO8601FormatStyle().parse(value)
        }
    }

    /// IOS-004 : aucun cookie, ni envoyé ni stocké. L'auth passe uniquement par le token `Bearer` (BE-006) :
    /// un cookie renvoyé automatiquement ferait passer la requête pour une requête web.
    /// Éphémère : rien des réponses (données personnelles) n'est mis en cache sur disque.
    public static func makeConfiguration() -> URLSessionConfiguration {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.httpShouldSetCookies = false
        configuration.httpCookieAcceptPolicy = .never
        configuration.httpCookieStorage = nil
        return configuration
    }

    private static let urlSession = URLSession(configuration: makeConfiguration())

    public func get<Response: Decodable>(_ path: String, query: [URLQueryItem] = []) async throws(APIError) -> Response {
        try await send(makeRequest(method: "GET", path: path, query: query))
    }

    public func post<Response: Decodable>(_ path: String, body: some Encodable) async throws(APIError) -> Response {
        try await send(makeRequest(method: "POST", path: path, body: body))
    }

    /// Réponse brute, quel que soit son statut : pour les routes qui ne répondent pas en Problem Details
    /// (Better Auth : `{ code, message }`) ou dont il faut lire un en-tête (`set-auth-token`).
    public func postRaw(_ path: String, body: some Encodable) async throws(APIError) -> RawResponse {
        let (data, response) = try await perform(makeRequest(method: "POST", path: path, body: body))
        return RawResponse(response: response, data: data)
    }

    private func makeRequest(method: String, path: String, query: [URLQueryItem] = []) -> URLRequest {
        var components = URLComponents(url: baseURL.appending(path: path), resolvingAgainstBaseURL: false)
        if !query.isEmpty {
            components?.queryItems = query
        }
        var request = URLRequest(url: components?.url ?? baseURL, timeoutInterval: 20)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        return request
    }

    private func makeRequest(method: String, path: String, body: some Encodable) -> URLRequest {
        var request = makeRequest(method: method, path: path)
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try? encoder.encode(body)
        return request
    }

    private func send<Response: Decodable>(_ request: URLRequest) async throws(APIError) -> Response {
        let (data, response) = try await perform(request)
        let status = response.statusCode
        guard (200 ..< 300).contains(status) else {
            let problem = (try? decoder.decode(ProblemDetails.self, from: data))
                ?? ProblemDetails(title: HTTPURLResponse.localizedString(forStatusCode: status), status: status)
            throw .http(problem)
        }

        do {
            return try decoder.decode(Response.self, from: data)
        } catch {
            throw .decoding
        }
    }

    /// Ajoute le token de session, seulement vers l'origine de l'API, et l'efface sur un `401`.
    private func perform(_ request: URLRequest) async throws(APIError) -> (Data, HTTPURLResponse) {
        var request = request
        let token = isAPIOrigin(request.url) ? session?.currentToken() : nil
        if let token {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await transport(request)
        } catch {
            throw .network
        }
        guard let http = response as? HTTPURLResponse else {
            throw .decoding
        }
        if let token, http.statusCode == 401 {
            // Seulement ce token : un `401` arrivé après une reconnexion ne déconnecte pas la nouvelle session.
            session?.onUnauthorized(token)
        }
        return (data, http)
    }

    private func isAPIOrigin(_ url: URL?) -> Bool {
        guard let url else {
            return false
        }
        return url.scheme?.lowercased() == baseURL.scheme?.lowercased()
            && url.host()?.lowercased() == baseURL.host()?.lowercased()
            && url.port == baseURL.port
    }
}

/// Réponse HTTP sans interprétation du corps.
public struct RawResponse: Sendable {
    public let status: Int
    public let data: Data
    private let headers: [String: String]

    init(response: HTTPURLResponse, data: Data) {
        status = response.statusCode
        self.data = data
        var headers: [String: String] = [:]
        for case let (name as String, value as String) in response.allHeaderFields {
            headers[name.lowercased()] = value
        }
        self.headers = headers
    }

    public var isSuccess: Bool {
        (200 ..< 300).contains(status)
    }

    /// Nom insensible à la casse, comme en HTTP.
    public func header(_ name: String) -> String? {
        headers[name.lowercased()]
    }
}
