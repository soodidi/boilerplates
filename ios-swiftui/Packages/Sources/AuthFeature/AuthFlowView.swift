import SwiftUI

/// Parcours d'authentification : connexion, inscription, mot de passe oublié.
/// Les liens des e-mails ouvrent le front web (`WEB_BASE_URL`), puis l'utilisateur revient se connecter.
public struct AuthFlowView: View {
    enum Route: Hashable {
        case signUp
        case forgotPassword
    }

    private let repository: any AuthRepository
    @State private var path: [Route] = []
    @State private var signIn: SignInViewModel

    public init(repository: any AuthRepository) {
        self.repository = repository
        _signIn = State(initialValue: SignInViewModel(repository: repository))
    }

    public var body: some View {
        NavigationStack(path: $path) {
            SignInView(
                viewModel: signIn,
                onSignUp: { path.append(.signUp) },
                onForgotPassword: { path.append(.forgotPassword) }
            )
            .navigationDestination(for: Route.self) { route in
                switch route {
                case .signUp:
                    SignUpView(viewModel: SignUpViewModel(repository: repository)) { path.removeAll() }
                case .forgotPassword:
                    ForgotPasswordView(viewModel: ForgotPasswordViewModel(repository: repository)) { path.removeAll() }
                }
            }
        }
    }
}

// MARK: - Previews

struct PreviewAuthRepository: AuthRepository {
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
