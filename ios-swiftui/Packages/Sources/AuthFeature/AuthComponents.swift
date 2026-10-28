import DesignSystem
import SwiftUI

/// Champ d'adresse e-mail : clavier, remplissage automatique, sans majuscule ni correction.
struct EmailField: View {
    @Binding var text: String
    var isNewAccount = false

    var body: some View {
        TextField(text: $text) {
            Text("auth.email", bundle: .module)
        }
        .emailInput(isNewAccount: isNewAccount)
        .accessibilityIdentifier("auth.email")
    }
}

/// Mot de passe masqué par défaut, avec un bouton pour l'afficher.
struct PasswordField: View {
    @Binding var text: String
    var isNewPassword = false
    @State private var isVisible = false

    var body: some View {
        HStack {
            Group {
                if isVisible {
                    TextField(text: $text) { label }
                } else {
                    SecureField(text: $text) { label }
                }
            }
            .passwordInput(isNewPassword: isNewPassword)
            .accessibilityIdentifier("auth.password")

            Button {
                isVisible.toggle()
            } label: {
                Image(systemName: isVisible ? "eye.slash" : "eye")
                    .accessibilityLabel(Text(isVisible ? "auth.password.hide" : "auth.password.show", bundle: .module))
            }
            .buttonStyle(.borderless)
        }
    }

    private var label: Text {
        Text("auth.password", bundle: .module)
    }
}

/// Message d'erreur sous un champ.
struct FieldErrorText: View {
    let error: FieldError?

    var body: some View {
        if let error {
            Text(Self.key(for: error), bundle: .module)
                .font(.footnote)
                .foregroundStyle(AppColor.destructive)
        }
    }

    static func key(for error: FieldError) -> LocalizedStringKey {
        switch error {
        case .required: "validation.required"
        case .emailInvalid: "auth.email.invalid"
        case .passwordTooShort: "auth.password.tooShort"
        case .passwordTooLong: "auth.password.tooLong"
        case .nameTooLong: "auth.name.tooLong"
        }
    }
}

/// BE-006 : messages génériques, qui ne disent jamais si un compte existe. Annoncés par VoiceOver.
struct FailureText: View {
    let failure: AuthFailure

    var body: some View {
        let text = String(localized: Self.key(for: failure), bundle: .module)
        Text(verbatim: text)
            .foregroundStyle(AppColor.destructive)
            .accessibilityIdentifier("auth.failure")
            .task(id: failure) {
                AccessibilityNotification.Announcement(text).post()
            }
    }

    static func key(for failure: AuthFailure) -> String.LocalizationValue {
        switch failure {
        case .invalidCredentials: "auth.error.invalidCredentials"
        case .emailNotVerified: "auth.error.emailNotVerified"
        case .tooManyAttempts: "auth.error.tooManyAttempts"
        case .network: "auth.error.network"
        case .unknown: "auth.error.generic"
        }
    }
}

/// Bouton d'envoi : il garde son libellé pendant l'envoi (VoiceOver), avec un indicateur à côté.
struct SubmitButton: View {
    let title: LocalizedStringKey
    let isSubmitting: Bool
    let action: () async -> Void

    var body: some View {
        Button {
            Task { await action() }
        } label: {
            HStack(spacing: Spacing.small) {
                Text(title, bundle: .module)
                if isSubmitting {
                    ProgressView()
                }
            }
            .frame(maxWidth: .infinity)
        }
        .buttonStyle(.borderedProminent)
        .disabled(isSubmitting)
        .accessibilityIdentifier("auth.submit")
    }
}

/// Réglages de saisie propres à iOS (le package compile aussi pour macOS, pour `swift test`).
extension View {
    func nameInput() -> some View {
        #if os(iOS)
            textContentType(.name)
        #else
            self
        #endif
    }

    fileprivate func emailInput(isNewAccount: Bool) -> some View {
        #if os(iOS)
            textContentType(isNewAccount ? .emailAddress : .username)
                .keyboardType(.emailAddress)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
        #else
            autocorrectionDisabled()
        #endif
    }

    fileprivate func passwordInput(isNewPassword: Bool) -> some View {
        #if os(iOS)
            textContentType(isNewPassword ? .newPassword : .password)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
        #else
            autocorrectionDisabled()
        #endif
    }
}
