import Foundation
import Observation

/// IOS-002 : un ViewModel par écran, `@Observable` et `@MainActor`, testable sans UI.
/// Une connexion réussie enregistre la session : l'app change d'écran, le ViewModel n'a rien à émettre.
@MainActor
@Observable
public final class SignInViewModel {
    public var email = "" {
        didSet {
            emailError = nil
            failure = nil
        }
    }

    public var password = "" {
        didSet {
            passwordError = nil
            failure = nil
        }
    }

    public private(set) var emailError: FieldError?
    public private(set) var passwordError: FieldError?
    public private(set) var isSubmitting = false
    public private(set) var failure: AuthFailure?

    private let repository: any AuthRepository

    public init(repository: any AuthRepository) {
        self.repository = repository
    }

    public func submit() async {
        guard !isSubmitting else {
            return
        }
        let email = AuthValidation.normalizeEmail(email)
        let emailError = AuthValidation.emailError(email)
        let passwordError: FieldError? = password.isEmpty ? .required : nil
        guard emailError == nil, passwordError == nil else {
            self.emailError = emailError
            self.passwordError = passwordError
            return
        }
        isSubmitting = true
        defer { isSubmitting = false }
        do throws(AuthFailure) {
            try await repository.signIn(email: email, password: password)
            // Le mot de passe ne reste pas en mémoire plus que nécessaire.
            password = ""
        } catch {
            failure = error
        }
    }
}

@MainActor
@Observable
public final class SignUpViewModel {
    public var name = "" {
        didSet {
            nameError = nil
            failure = nil
        }
    }

    public var email = "" {
        didSet {
            emailError = nil
            failure = nil
        }
    }

    public var password = "" {
        didSet {
            passwordError = nil
            failure = nil
        }
    }

    public private(set) var nameError: FieldError?
    public private(set) var emailError: FieldError?
    public private(set) var passwordError: FieldError?
    public private(set) var isSubmitting = false
    public private(set) var failure: AuthFailure?
    /// Adresse à laquelle l'e-mail de vérification a été envoyé.
    public private(set) var sentTo: String?

    private let repository: any AuthRepository

    public init(repository: any AuthRepository) {
        self.repository = repository
    }

    public func submit() async {
        guard !isSubmitting else {
            return
        }
        let name = name.trimmingCharacters(in: .whitespacesAndNewlines)
        let email = AuthValidation.normalizeEmail(email)
        let errors = (AuthValidation.nameError(name), AuthValidation.emailError(email), AuthValidation.newPasswordError(password))
        guard errors.0 == nil, errors.1 == nil, errors.2 == nil else {
            (nameError, emailError, passwordError) = errors
            return
        }
        isSubmitting = true
        defer { isSubmitting = false }
        do throws(AuthFailure) {
            try await repository.signUp(name: name, email: email, password: password)
            password = ""
            sentTo = email
        } catch {
            failure = error
        }
    }
}

@MainActor
@Observable
public final class ForgotPasswordViewModel {
    public var email = "" {
        didSet {
            emailError = nil
            failure = nil
        }
    }

    public private(set) var emailError: FieldError?
    public private(set) var isSubmitting = false
    public private(set) var failure: AuthFailure?
    /// Adresse à laquelle le lien a été envoyé, si un compte existe.
    public private(set) var sentTo: String?

    private let repository: any AuthRepository

    public init(repository: any AuthRepository) {
        self.repository = repository
    }

    public func submit() async {
        guard !isSubmitting else {
            return
        }
        let email = AuthValidation.normalizeEmail(email)
        if let error = AuthValidation.emailError(email) {
            emailError = error
            return
        }
        isSubmitting = true
        defer { isSubmitting = false }
        do throws(AuthFailure) {
            try await repository.requestPasswordReset(email: email)
            sentTo = email
        } catch {
            failure = error
        }
    }
}
