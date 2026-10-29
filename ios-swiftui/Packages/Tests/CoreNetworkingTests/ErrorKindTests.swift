import CoreNetworking
import Testing

@Suite("ErrorKind")
struct ErrorKindTests {
    @Test(
        "traduit une erreur de l'API en ce que l'écran peut expliquer",
        arguments: [
            (APIError.http(ProblemDetails(title: "x", status: 401)), ErrorKind.unauthorized),
            (.http(ProblemDetails(title: "x", status: 403)), .forbidden),
            (.http(ProblemDetails(title: "x", status: 404)), .notFound),
            (.http(ProblemDetails(title: "x", status: 422)), .server),
            (.http(ProblemDetails(title: "x", status: 500)), .server),
            (.network, .network),
            // Une réponse reçue mais illisible n'est pas une panne réseau.
            (.decoding, .server),
        ]
    )
    func maps(error: APIError, expected: ErrorKind) {
        #expect(error.kind == expected)
    }
}
