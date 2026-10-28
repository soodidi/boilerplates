import SwiftUI

/// IOS-001 : vues sans logique métier ; elles lisent l'état du ViewModel et lui transmettent les actions.
struct SignInView: View {
    @State private var viewModel: SignInViewModel
    @FocusState private var focus: AuthField?
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
                EmailField(text: $viewModel.email, error: viewModel.emailError, focus: $focus)
                FieldErrorText(error: viewModel.emailError)
                PasswordField(text: $viewModel.password, error: viewModel.passwordError, focus: $focus)
                FieldErrorText(error: viewModel.passwordError)
            }
            if let failure = viewModel.failure {
                FailureText(failure: failure)
            }
            Section {
                SubmitButton(title: "auth.signIn.submit", isSubmitting: viewModel.isSubmitting, action: submit)
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
        .disabled(viewModel.isSubmitting)
        .onSubmit {
            if focus == .email {
                focus = .password
            } else {
                Task { await submit() }
            }
        }
        .navigationTitle(Text("auth.signIn.title", bundle: .module))
    }

    private func submit() async {
        focus = nil
        await viewModel.submit()
    }
}

struct SignUpView: View {
    @State private var viewModel: SignUpViewModel
    @FocusState private var focus: AuthField?
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
                    NameField(text: $viewModel.name, error: viewModel.nameError, focus: $focus)
                    FieldErrorText(error: viewModel.nameError)
                    EmailField(text: $viewModel.email, error: viewModel.emailError, focus: $focus)
                    FieldErrorText(error: viewModel.emailError)
                    PasswordField(text: $viewModel.password, error: viewModel.passwordError, focus: $focus, isNewPassword: true)
                    FieldErrorText(error: viewModel.passwordError)
                }
                if let failure = viewModel.failure {
                    FailureText(failure: failure)
                }
                Section {
                    SubmitButton(title: "auth.signUp.submit", isSubmitting: viewModel.isSubmitting, action: submit)
                }
            }
        }
        .disabled(viewModel.isSubmitting)
        .onSubmit {
            switch focus {
            case .name: focus = .email
            case .email: focus = .password
            default: Task { await submit() }
            }
        }
        .navigationTitle(Text("auth.signUp.title", bundle: .module))
    }

    private func submit() async {
        focus = nil
        await viewModel.submit()
    }
}

struct ForgotPasswordView: View {
    @State private var viewModel: ForgotPasswordViewModel
    @FocusState private var focus: AuthField?
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
                    EmailField(text: $viewModel.email, error: viewModel.emailError, focus: $focus, submitLabel: .send)
                    FieldErrorText(error: viewModel.emailError)
                } footer: {
                    Text("auth.forgotPassword.intro", bundle: .module)
                }
                if let failure = viewModel.failure {
                    FailureText(failure: failure)
                }
                Section {
                    SubmitButton(title: "auth.forgotPassword.submit", isSubmitting: viewModel.isSubmitting, action: submit)
                }
            }
        }
        .disabled(viewModel.isSubmitting)
        .onSubmit { Task { await submit() } }
        .navigationTitle(Text("auth.forgotPassword.title", bundle: .module))
    }

    private func submit() async {
        focus = nil
        await viewModel.submit()
    }
}

/// E-mail envoyé : le lien s'ouvre sur le front web, puis l'utilisateur revient se connecter.
/// Le message est annoncé par VoiceOver, le formulaire ayant disparu avec le focus.
private struct SentSection: View {
    let message: Text
    let onBackToSignIn: () -> Void
    @AccessibilityFocusState private var isFocused: Bool

    var body: some View {
        Section {
            message
                .accessibilityIdentifier("auth.sent")
                .accessibilityFocused($isFocused)
                .onAppear { isFocused = true }
            Button(action: onBackToSignIn) {
                Text("auth.backToSignIn", bundle: .module)
            }
            .accessibilityIdentifier("auth.backToSignIn")
        }
    }
}
