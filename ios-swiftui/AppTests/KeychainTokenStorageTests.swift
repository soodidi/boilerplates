// Le Keychain demande un trousseau d'app : ces tests tournent dans l'app hôte, sur simulateur
// (`scripts/test-simulator.sh`). Un bundle de tests du package, sans hôte, reçoit -34018.
import CoreAuth
import Foundation
import Security
import Testing

@Suite("KeychainTokenStorage", .serialized)
struct KeychainTokenStorageTests {
    /// Un service par test : aucun élément partagé avec l'app ni entre les tests.
    private let service = "CoreAuthTests.\(UUID().uuidString)"

    @Test("écrit, relit, remplace puis efface le token")
    func roundTrip() throws {
        let storage = KeychainTokenStorage(service: service)
        defer { try? storage.write(nil) }

        #expect(try storage.read() == nil)
        try storage.write("first")
        #expect(try storage.read() == "first")
        try storage.write("second")
        #expect(try storage.read() == "second")
        try storage.write(nil)
        #expect(try storage.read() == nil)
    }

    @Test("effacer une session absente n'est pas une erreur")
    func clearsMissingItem() throws {
        try KeychainTokenStorage(service: service).write(nil)
    }

    @Test("élément lisible seulement sur cet appareil, après le premier déverrouillage")
    func usesRestrictiveAccessibility() throws {
        let storage = KeychainTokenStorage(service: service)
        defer { try? storage.write(nil) }
        try storage.write("token")

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecUseDataProtectionKeychain as String: true,
            kSecReturnAttributes as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var result: CFTypeRef?
        #expect(SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess)
        let attributes = try #require(result as? [String: Any])
        #expect(attributes[kSecAttrAccessible as String] as? String == kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly as String)
    }

    @Test("SessionStore retrouve la session au redémarrage de l'app")
    func sessionSurvivesRestart() {
        let storage = KeychainTokenStorage(service: service)
        defer { try? storage.write(nil) }

        SessionStore(storage: storage).save("token")

        #expect(SessionStore(storage: storage).currentToken() == "token")
    }
}
