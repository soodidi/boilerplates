import CoreNetworking
@testable import DesignSystem
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
        #expect(errorContent(for: .forbidden, canGoBack: false)?.action == ErrorAction.none)
    }

    @Test("rien pour une session expirée : l'app revient à la connexion")
    func nothingWhenUnauthorized() {
        #expect(errorContent(for: .unauthorized, canGoBack: true) == nil)
    }
}
