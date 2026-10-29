import SwiftUI

/// Parcours d'authentification : connexion, inscription, mot de passe oublié.
/// Les liens des e-mails ouvrent le front web (`WEB_BASE_URL`), puis l'utilisateur revient se connecter.
public struct AuthFlowView: View {
    enum Route: Hashable {
        case signUp
        case forgotPassword
    }

    private let repository: any AuthRepository
    private let accountDeleted: Bool
    @State private var path: [Route] = []
    @State private var signIn: SignInViewModel

    /// `accountDeleted` : la connexion confirme la suppression du compte (GLB-013).
    public init(repository: any AuthRepository, accountDeleted: Bool = false) {
        self.repository = repository
        self.accountDeleted = accountDeleted
        _signIn = State(initialValue: SignInViewModel(repository: repository))
    }

    public var body: some View {
        NavigationStack(path: $path) {
            SignInView(
                viewModel: signIn,
                accountDeleted: accountDeleted,
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
