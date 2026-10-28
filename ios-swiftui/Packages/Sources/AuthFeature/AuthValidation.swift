import Foundation

/// BE-006 : mêmes bornes que l'API (auth.config.ts), le front web et Android.
/// Longueurs en unités UTF-16, comme `String.length` côté API (JavaScript) et Kotlin.
enum AuthLimits {
    static let passwordMinLength = 12
    static let passwordMaxLength = 128
    static let nameMaxLength = 100
}

/// Erreur d'un champ, affichée sous celui-ci. La clé du String Catalog est dans la vue.
public enum FieldError: Sendable, Equatable {
    case required
    case emailInvalid
    case passwordTooShort
    case passwordTooLong
    case nameTooLong
}

enum AuthValidation {
    static func emailError(_ email: String) -> FieldError? {
        if email.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return .required
        }
        // Vérification de forme seulement : c'est l'e-mail de vérification qui prouve l'adresse.
        return email.wholeMatch(of: #/[^\s@]+@[^\s@]+\.[^\s@]+/#) == nil ? .emailInvalid : nil
    }

    static func newPasswordError(_ password: String) -> FieldError? {
        if password.utf16.count < AuthLimits.passwordMinLength {
            return .passwordTooShort
        }
        return password.utf16.count > AuthLimits.passwordMaxLength ? .passwordTooLong : nil
    }

    static func nameError(_ name: String) -> FieldError? {
        if name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return .required
        }
        return name.utf16.count > AuthLimits.nameMaxLength ? .nameTooLong : nil
    }

    /// Adresse telle que l'API la stocke : sans espaces, en minuscules.
    static func normalizeEmail(_ email: String) -> String {
        email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    }
}
