import SwiftUI

/// IOS-001 : vues sans logique métier ; elles lisent l'état du ViewModel et lui transmettent les actions.
struct SignInView: View {
    @State private var viewModel: SignInViewModel
    private let onSignUp: () -> Void
    private let onForgotPassword: () -> Void

    init(viewModel: SignInViewModel, onSignUp: @escaping () -> Void, onForgotPassword: @escaping () -> Void) {
        _viewModel = State(initialValue: viewModel)
        self.onSignUp = onSignUp
        self.onForgotPassword = onForgotPassword
    }

    var body: some View {
        Form {
            Section {
                EmailField(text: $viewModel.email)
                FieldErrorText(error: viewModel.emailError)
                PasswordField(text: $viewModel.password)
                    .onSubmit { Task { await viewModel.submit() } }
                FieldErrorText(error: viewModel.passwordError)
            }
            if let failure = viewModel.failure {
                FailureText(failure: failure)
            }
            Section {
                SubmitButton(title: "auth.signIn.submit", isSubmitting: viewModel.isSubmitting) {
                    await viewModel.submit()
                }
                Button(action: onForgotPassword) {
                    Text("auth.forgotPassword.link", bundle: .module)
                }
                .accessibilityIdentifier("auth.forgotPassword")
                Button(action: onSignUp) {
                    Text("auth.signUp.link", bundle: .module)
                }
                .accessibilityIdentifier("auth.signUp")
            }
        }
        .navigationTitle(Text("auth.signIn.title", bundle: .module))
    }
}

struct SignUpView: View {
    @State private var viewModel: SignUpViewModel
    private let onBackToSignIn: () -> Void

    init(viewModel: SignUpViewModel, onBackToSignIn: @escaping () -> Void) {
        _viewModel = State(initialValue: viewModel)
        self.onBackToSignIn = onBackToSignIn
    }

    var body: some View {
        Form {
            if let sentTo = viewModel.sentTo {
                SentSection(message: Text("auth.signUp.sent \(sentTo)", bundle: .module), onBackToSignIn: onBackToSignIn)
            } else {
                Section {
                    TextField(text: $viewModel.name) {
                        Text("auth.name", bundle: .module)
                    }
                    .nameInput()
                    .accessibilityIdentifier("auth.name")
                    FieldErrorText(error: viewModel.nameError)
                    EmailField(text: $viewModel.email, isNewAccount: true)
                    FieldErrorText(error: viewModel.emailError)
                    PasswordField(text: $viewModel.password, isNewPassword: true)
                    FieldErrorText(error: viewModel.passwordError)
                }
                if let failure = viewModel.failure {
                    FailureText(failure: failure)
                }
                Section {
                    SubmitButton(title: "auth.signUp.submit", isSubmitting: viewModel.isSubmitting) {
                        await viewModel.submit()
                    }
                }
            }
        }
        .navigationTitle(Text("auth.signUp.title", bundle: .module))
    }
}

struct ForgotPasswordView: View {
    @State private var viewModel: ForgotPasswordViewModel
    private let onBackToSignIn: () -> Void

    init(viewModel: ForgotPasswordViewModel, onBackToSignIn: @escaping () -> Void) {
        _viewModel = State(initialValue: viewModel)
        self.onBackToSignIn = onBackToSignIn
    }

    var body: some View {
        Form {
            if let sentTo = viewModel.sentTo {
                SentSection(message: Text("auth.forgotPassword.sent \(sentTo)", bundle: .module), onBackToSignIn: onBackToSignIn)
            } else {
                Section {
                    EmailField(text: $viewModel.email)
                    FieldErrorText(error: viewModel.emailError)
                } footer: {
                    Text("auth.forgotPassword.intro", bundle: .module)
                }
                if let failure = viewModel.failure {
                    FailureText(failure: failure)
                }
                Section {
                    SubmitButton(title: "auth.forgotPassword.submit", isSubmitting: viewModel.isSubmitting) {
                        await viewModel.submit()
                    }
                }
            }
        }
        .navigationTitle(Text("auth.forgotPassword.title", bundle: .module))
    }
}

/// E-mail envoyé : le lien s'ouvre sur le front web, puis l'utilisateur revient se connecter.
private struct SentSection: View {
    let message: Text
    let onBackToSignIn: () -> Void

    var body: some View {
        Section {
            message
                .accessibilityIdentifier("auth.sent")
            Button(action: onBackToSignIn) {
                Text("auth.backToSignIn", bundle: .module)
            }
            .accessibilityIdentifier("auth.backToSignIn")
        }
    }
}

// MARK: - Previews

#Preview("Connexion") {
    NavigationStack {
        SignInView(viewModel: SignInViewModel(repository: PreviewAuthRepository()), onSignUp: {}, onForgotPassword: {})
    }
}

#Preview("Connexion refusée, grande police") {
    let viewModel = SignInViewModel(repository: PreviewAuthRepository(failure: .invalidCredentials))
    viewModel.email = "camille@example.com"
    viewModel.password = "wrong-password"
    return NavigationStack {
        SignInView(viewModel: viewModel, onSignUp: {}, onForgotPassword: {})
            .task { await viewModel.submit() }
    }
    .environment(\.dynamicTypeSize, .accessibility2)
}

#Preview("Inscription") {
    NavigationStack {
        SignUpView(viewModel: SignUpViewModel(repository: PreviewAuthRepository()), onBackToSignIn: {})
    }
}

#Preview("Mot de passe oublié, grande police") {
    NavigationStack {
        ForgotPasswordView(viewModel: ForgotPasswordViewModel(repository: PreviewAuthRepository()), onBackToSignIn: {})
    }
    .environment(\.dynamicTypeSize, .accessibility2)
}
