import CoreAuth
import CoreNetworking
import Foundation
import OSLog

/// Échecs que l'UI sait expliquer. Jamais « compte inconnu » : la réponse ne le révèle pas (BE-006).
public enum AuthFailure: Error, Sendable, Equatable {
    case invalidCredentials
    case emailNotVerified
    case tooManyAttempts
    /// Mot de passe refusé à la suppression du compte.
    case wrongPassword
    case network
    case unknown
}

/// IOS-002 : les ViewModels dépendent de ce protocole, injecté par le constructeur.
public protocol AuthRepository: Sendable {
    /// En cas de succès, la session est enregistrée : l'app passe d'elle-même aux écrans connectés.
    func signIn(email: String, password: String) async throws(AuthFailure)
    /// L'API envoie un e-mail de vérification ; la réponse est la même si le compte existe déjà.
    func signUp(name: String, email: String, password: String) async throws(AuthFailure)
    func requestPasswordReset(email: String) async throws(AuthFailure)
    /// Révoque la session côté serveur si possible, et l'oublie localement dans tous les cas.
    func signOut() async
    /// GLB-013 : supprime le compte et toutes ses données. L'API révoque la session, mais elle reste
    /// enregistrée sur l'appareil : l'appelant l'oublie, une fois prêt à quitter les écrans connectés.
    func deleteAccount(password: String) async throws(AuthFailure)
}

/// Routes de Better Auth exposées par l'API (BE-006). Elles répondent `{ code, message }` en cas
/// d'erreur, pas en Problem Details : d'où `postRaw`.
public struct LiveAuthRepository: AuthRepository {
    private let client: APIClient
    private let session: SessionStore
    private let webBaseURL: URL
    private static let logger = Logger(subsystem: "AuthFeature", category: "auth")

    /// `webBaseURL` : front web, où mènent les liens des e-mails (vérification, nouveau mot de passe).
    /// Il doit figurer dans `CORS_ORIGINS` de l'API.
    public init(client: APIClient, session: SessionStore, webBaseURL: URL) {
        self.client = client
        self.session = session
        self.webBaseURL = webBaseURL
    }

    public func signIn(email: String, password: String) async throws(AuthFailure) {
        let response = try await post("v1/auth/sign-in/email", SignInDTO(email: email, password: password))
        // IOS-004 : seul le token de l'en-tête est signé ; celui du corps est refusé par l'API.
        guard let token = response.header("set-auth-token"), !token.isEmpty else {
            throw .unknown
        }
        session.save(token)
    }

    public func signUp(name: String, email: String, password: String) async throws(AuthFailure) {
        let body = SignUpDTO(name: name, email: email, password: password, callbackURL: webURL("login"))
        _ = try await post("v1/auth/sign-up/email", body)
    }

    public func requestPasswordReset(email: String) async throws(AuthFailure) {
        _ = try await post("v1/auth/request-password-reset", PasswordResetRequestDTO(email: email, redirectTo: webURL("reset-password")))
    }

    public func signOut() async {
        // Hors ligne : la session expirera côté serveur ; l'appareil, lui, l'oublie tout de suite.
        // Révoquer avant d'effacer : si l'effacement du Keychain échoue, la copie restante est déjà
        // refusée par l'API, et le premier `401` l'efface.
        do {
            let response = try await client.postRaw("v1/auth/sign-out", body: EmptyDTO())
            if !response.isSuccess {
                Self.logger.notice("Révocation de la session refusée : HTTP \(response.status)")
            }
        } catch {
            Self.logger.notice("Révocation de la session impossible : réseau")
        }
        session.clear()
    }

    public func deleteAccount(password: String) async throws(AuthFailure) {
        _ = try await post("v1/auth/delete-user", DeleteUserDTO(password: password))
    }

    private func post(_ path: String, _ body: some Encodable) async throws(AuthFailure) -> RawResponse {
        let response: RawResponse
        do {
            response = try await client.postRaw(path, body: body)
        } catch {
            throw error == .network ? .network : .unknown
        }
        guard response.isSuccess else {
            throw Self.failure(for: response)
        }
        return response
    }

    private func webURL(_ path: String) -> String {
        webBaseURL.appending(path: path).absoluteString
    }

    static func failure(for response: RawResponse) -> AuthFailure {
        let code = (try? JSONDecoder().decode(AuthErrorDTO.self, from: response.data))?.code
        switch (response.status, code) {
        case (401, "INVALID_EMAIL_OR_PASSWORD"): return .invalidCredentials
        case (403, "EMAIL_NOT_VERIFIED"): return .emailNotVerified
        case (400, "INVALID_PASSWORD"): return .wrongPassword
        case (429, _): return .tooManyAttempts
        default: return .unknown
        }
    }
}

struct SignInDTO: Encodable {
    let email: String
    let password: String
}

struct SignUpDTO: Encodable {
    let name: String
    let email: String
    let password: String
    /// Page du front web ouverte après le clic sur le lien de vérification.
    let callbackURL: String
}

struct PasswordResetRequestDTO: Encodable {
    let email: String
    /// Page du front web qui reçoit le jeton et demande le nouveau mot de passe.
    let redirectTo: String
}

struct DeleteUserDTO: Encodable {
    let password: String
}

struct EmptyDTO: Encodable {}

struct AuthErrorDTO: Decodable {
    let code: String?
}
