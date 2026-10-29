import DesignSystem
import SwiftUI

/// Champs des formulaires d'auth : la touche Retour passe au suivant, puis envoie.
enum AuthField: Hashable {
    case name
    case email
    case password
}

/// Champ de nom. L'erreur est lue par VoiceOver avec le champ.
struct NameField: View {
    @Binding var text: String
    let error: FieldError?
    let focus: FocusState<AuthField?>.Binding

    var body: some View {
        TextField(text: $text) {
            Text("auth.name", bundle: .module)
        }
        .nameInput()
        .focused(focus, equals: .name)
        .submitLabel(.next)
        .fieldError(error)
        .accessibilityIdentifier("auth.name")
    }
}

/// Champ d'adresse e-mail : clavier, remplissage automatique, sans majuscule ni correction.
struct EmailField: View {
    @Binding var text: String
    let error: FieldError?
    let focus: FocusState<AuthField?>.Binding
    var submitLabel: SubmitLabel = .next

    var body: some View {
        TextField(text: $text) {
            Text("auth.email", bundle: .module)
        }
        .emailInput()
        .focused(focus, equals: .email)
        .submitLabel(submitLabel)
        .fieldError(error)
        .accessibilityIdentifier("auth.email")
    }
}

/// Mot de passe masqué par défaut, avec un bouton pour l'afficher.
/// Il est masqué de nouveau quand l'app passe en arrière-plan (capture du sélecteur d'apps).
struct PasswordField: View {
    @Binding var text: String
    let error: FieldError?
    let focus: FocusState<AuthField?>.Binding
    var isNewPassword = false
    var title: LocalizedStringKey = "auth.password"
    var submitLabel: SubmitLabel = .go
    @State private var isVisible = false
    @Environment(\.scenePhase) private var scenePhase

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
            .focused(focus, equals: .password)
            .submitLabel(submitLabel)
            .fieldError(error)
            .accessibilityIdentifier("auth.password")

            Button {
                isVisible.toggle()
            } label: {
                Image(systemName: isVisible ? "eye.slash" : "eye")
                    .frame(minWidth: 44, minHeight: 44)
                    .contentShape(.rect)
                    .accessibilityLabel(Text(isVisible ? "auth.password.hide" : "auth.password.show", bundle: .module))
            }
            .buttonStyle(.borderless)
        }
        .onChange(of: scenePhase) { _, phase in
            if phase != .active {
                isVisible = false
            }
        }
    }

    private var label: Text {
        Text(title, bundle: .module)
    }
}

/// Message d'erreur sous un champ. VoiceOver le lit déjà avec le champ (`fieldError`) : masqué ici.
struct FieldErrorText: View {
    let error: FieldError?

    var body: some View {
        if let error {
            Text(Self.key(for: error), bundle: .module)
                .font(.footnote)
                .foregroundStyle(AppColor.destructive)
                .accessibilityHidden(true)
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
        case .wrongPassword: "account.delete.wrongPassword"
        case .network: "auth.error.network"
        case .unknown: "auth.error.generic"
        }
    }
}

/// Bouton d'envoi aux couleurs du thème (GLB-012). Il garde son libellé pendant l'envoi (VoiceOver),
/// avec un indicateur à côté.
struct SubmitButton: View {
    let title: LocalizedStringKey
    let isSubmitting: Bool
    /// `AppColor.destructive` pour une action irréversible (suppression du compte).
    var color = AppColor.primary
    var foreground = AppColor.primaryForeground
    let action: () async -> Void

    var body: some View {
        Button {
            Task { await action() }
        } label: {
            HStack(spacing: Spacing.small) {
                Text(title, bundle: .module)
                if isSubmitting {
                    ProgressView()
                        .tint(foreground)
                }
            }
            .foregroundStyle(foreground)
            .frame(maxWidth: .infinity, minHeight: 44)
        }
        .buttonStyle(.borderedProminent)
        .tint(color)
        .disabled(isSubmitting)
        .accessibilityIdentifier("auth.submit")
    }
}

extension View {
    /// L'erreur d'un champ est lue par VoiceOver avec lui, comme sur Android (`semantics { error }`).
    func fieldError(_ error: FieldError?) -> some View {
        accessibilityHint(error.map { Text(FieldErrorText.key(for: $0), bundle: .module) } ?? Text(verbatim: ""))
    }

    func nameInput() -> some View {
        #if os(iOS)
            textContentType(.name)
        #else
            self
        #endif
    }

    /// Réglages de saisie propres à iOS (le package compile aussi pour macOS, pour `swift test`).
    /// `.username` à la connexion comme à l'inscription : le trousseau associe le mot de passe à l'adresse.
    fileprivate func emailInput() -> some View {
        #if os(iOS)
            textContentType(.username)
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
