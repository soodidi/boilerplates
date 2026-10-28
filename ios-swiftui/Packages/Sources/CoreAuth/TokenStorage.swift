import Foundation
import Security

/// Copie persistante du token de session. Le Keychain en production, la mémoire dans les tests.
public protocol TokenStorage: Sendable {
    func read() throws -> String?
    /// `nil` efface la copie.
    func write(_ token: String?) throws
}

/// Code d'erreur du Keychain (`OSStatus`), sans jamais le contenu de l'élément.
public struct KeychainError: Error, Equatable, CustomStringConvertible {
    public let status: OSStatus

    public var description: String {
        "KeychainError(\(status))"
    }
}

/// IOS-004 : token dans le Keychain, lisible seulement sur cet appareil après le premier déverrouillage,
/// jamais sauvegardé ni transféré vers un autre appareil.
public struct KeychainTokenStorage: TokenStorage {
    private let service: String
    private let account = "session_token"

    /// `service` : identifiant propre à l'app, en général son bundle identifier.
    public init(service: String) {
        self.service = service
    }

    public func read() throws -> String? {
        var query = baseQuery
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne
        var result: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        switch status {
        case errSecSuccess:
            guard let data = result as? Data, let token = String(data: data, encoding: .utf8) else {
                throw KeychainError(status: errSecDecode)
            }
            return token
        case errSecItemNotFound:
            return nil
        default:
            throw KeychainError(status: status)
        }
    }

    public func write(_ token: String?) throws {
        // Supprimer puis ajouter : l'accessibilité est reposée à chaque écriture.
        let deleted = SecItemDelete(baseQuery as CFDictionary)
        guard deleted == errSecSuccess || deleted == errSecItemNotFound else {
            throw KeychainError(status: deleted)
        }
        guard let token else {
            return
        }
        var attributes = baseQuery
        attributes[kSecValueData as String] = Data(token.utf8)
        attributes[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        let added = SecItemAdd(attributes as CFDictionary, nil)
        guard added == errSecSuccess else {
            throw KeychainError(status: added)
        }
    }

    private var baseQuery: [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            // Keychain moderne, le même sur iOS et macOS (attributs d'accessibilité respectés).
            kSecUseDataProtectionKeychain as String: true,
        ]
    }
}
