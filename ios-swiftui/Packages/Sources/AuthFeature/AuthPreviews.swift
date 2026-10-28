import SwiftUI

// MARK: - Previews

/// Fake réservé aux aperçus : privé, il n'est visible d'aucun autre fichier.
private struct PreviewAuthRepository: AuthRepository {
    var failure: AuthFailure?

    func signIn(email _: String, password _: String) async throws(AuthFailure) {
        if let failure {
            throw failure
        }
    }

    func signUp(name _: String, email _: String, password _: String) async throws(AuthFailure) {}

    func requestPasswordReset(email _: String) async throws(AuthFailure) {}

    func signOut() async {}
}

#Preview("Parcours") {
    AuthFlowView(repository: PreviewAuthRepository())
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
