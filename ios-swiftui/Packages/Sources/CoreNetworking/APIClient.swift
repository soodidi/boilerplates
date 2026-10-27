import Foundation

/// Client HTTP minimal (IOS-004). À remplacer par le client généré depuis la spec OpenAPI
/// (swift-openapi-generator) quand le backend la publie.
public final class APIClient: Sendable {
    /// Transport injectable : URLSession en production, réponses contrôlées dans les tests.
    public typealias Transport = @Sendable (URLRequest) async throws -> (Data, URLResponse)

    private let baseURL: URL
    private let transport: Transport
    private let decoder: JSONDecoder
    private let encoder = JSONEncoder()

    public init(baseURL: URL, transport: Transport? = nil) {
        self.baseURL = baseURL
        self.transport = transport ?? { request in try await URLSession.shared.data(for: request) }
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

    public func get<Response: Decodable>(_ path: String, query: [URLQueryItem] = []) async throws(APIError) -> Response {
        try await send(makeRequest(method: "GET", path: path, query: query))
    }

    public func post<Response: Decodable>(_ path: String, body: some Encodable) async throws(APIError) -> Response {
        var request = makeRequest(method: "POST", path: path)
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try? encoder.encode(body)
        return try await send(request)
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

    private func send<Response: Decodable>(_ request: URLRequest) async throws(APIError) -> Response {
        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await transport(request)
        } catch {
            throw .network
        }

        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
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
}
