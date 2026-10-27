@testable import CoreNetworking
import Foundation
import Testing

private struct Ping: Decodable, Equatable {
    let ok: Bool
    let at: Date
}

private func stub(status: Int, body: String) -> APIClient.Transport {
    { request in
        let url = try #require(request.url)
        let response = try #require(HTTPURLResponse(url: url, statusCode: status, httpVersion: nil, headerFields: nil))
        return (Data(body.utf8), response)
    }
}

@Suite("APIClient")
struct APIClientTests {
    let baseURL = URL(string: "https://api.example.com")!

    @Test("décode une réponse et ses dates ISO 8601 avec millisecondes")
    func decodesResponse() async throws {
        let client = APIClient(baseURL: baseURL, transport: stub(status: 200, body: #"{"ok":true,"at":"2026-10-26T10:00:00.123Z"}"#))

        let ping: Ping = try await client.get("ping")

        #expect(ping.ok)
        let expected = try Date.ISO8601FormatStyle(includingFractionalSeconds: true).parse("2026-10-26T10:00:00.123Z")
        #expect(abs(ping.at.timeIntervalSince(expected)) < 0.001)
    }

    @Test("transforme un Problem Details en APIError.http")
    func mapsProblemDetails() async {
        let body = #"{"title":"Validation failed","status":400,"errors":[{"field":"title","code":"too_small"}]}"#
        let client = APIClient(baseURL: baseURL, transport: stub(status: 400, body: body))

        await #expect(throws: APIError.http(ProblemDetails(
            title: "Validation failed",
            status: 400,
            errors: [.init(field: "title", code: "too_small", message: nil)]
        ))) {
            let _: Ping = try await client.get("ping")
        }
    }

    @Test("distingue les erreurs réseau")
    func mapsNetworkErrors() async {
        let client = APIClient(baseURL: baseURL) { _ in throw URLError(.notConnectedToInternet) }

        await #expect(throws: APIError.network) {
            let _: Ping = try await client.get("ping")
        }
    }
}
