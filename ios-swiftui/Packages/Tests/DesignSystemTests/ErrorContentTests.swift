import CoreNetworking
@testable import DesignSystem
import Foundation
import Testing

/// BE-010 : ce que montre chaque erreur, vérifié sans simulateur.
@Suite("errorContent")
struct ErrorContentTests {
    @Test("réessayer pour une panne qui peut passer")
    func retryForOutages() {
        #expect(errorContent(for: .network, canGoBack: true)
            == ErrorContent(titleKey: "error.network.title", messageKey: "error.network.message", action: .retry))
        #expect(errorContent(for: .server, canGoBack: false)
            == ErrorContent(titleKey: "error.server.title", messageKey: "error.server.message", action: .retry))
    }

    @Test("revenir en arrière après un refus ou une ressource introuvable")
    func backForRefusalsAndMissingResources() {
        #expect(errorContent(for: .forbidden, canGoBack: true)
            == ErrorContent(titleKey: "error.forbidden.title", messageKey: "error.forbidden.message", action: .back))
        #expect(errorContent(for: .notFound, canGoBack: true)?.action == .back)
        // Réessayer ne changerait rien : sans retour possible, pas de bouton.
        #expect(errorContent(for: .forbidden, canGoBack: false)?.action == .hidden)
        #expect(errorContent(for: .notFound, canGoBack: false)?.action == .hidden)
        // Une panne propose toujours de réessayer, retour possible ou non.
        #expect(errorContent(for: .network, canGoBack: false)?.action == .retry)
    }

    @Test("chaque texte existe en français et en anglais dans le catalogue")
    func everyKeyIsTranslated() throws {
        // Les clés sont lues à l'exécution : une faute de frappe afficherait la clé brute. On lit le
        // catalogue source : `swift test` ne le compile pas en `.lproj` avec toutes les chaînes d'outils.
        let catalogURL = URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent()
            .appending(path: "../../Sources/DesignSystem/Resources/Localizable.xcstrings")
        let catalog = try JSONDecoder().decode(Catalog.self, from: Data(contentsOf: catalogURL))
        let kinds: [ErrorKind] = [.forbidden, .notFound, .network, .server]
        let keys = kinds.compactMap { errorContent(for: $0, canGoBack: true) }
            .flatMap { [$0.titleKey, $0.messageKey] } + ["error.retry", "error.back"]
        for key in keys {
            let languages = catalog.strings[key]?.localizations.keys.sorted() ?? []
            #expect(languages == ["en", "fr"], "\(key)")
        }
    }

    @Test("rien pour une session expirée : l'app revient à la connexion")
    func nothingWhenUnauthorized() {
        #expect(errorContent(for: .unauthorized, canGoBack: true) == nil)
    }
}

/// String Catalog (`.xcstrings`), réduit à ce que vérifie le test.
private struct Catalog: Decodable {
    struct Entry: Decodable {
        let localizations: [String: Localization]
    }

    struct Localization: Decodable {}

    let strings: [String: Entry]
}
