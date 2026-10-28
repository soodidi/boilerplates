@testable import AuthFeature
import Testing

/// IOS-005 : un fake du repository plutôt qu'un mock généré.
private actor FakeAuthRepository: AuthRepository {
    private(set) var signIns: [(email: String, password: String)] = []
    private(set) var signUps: [(name: String, email: String)] = []
    private(set) var resets: [String] = []
    private var failure: AuthFailure?
    private var gate: CheckedContinuation<Void, Never>?
    private var isGated = false

    init(failure: AuthFailure? = nil) {
        self.failure = failure
    }

    func setFailure(_ failure: AuthFailure?) {
        self.failure = failure
    }

    /// La prochaine connexion attend `release()` : l'état « en cours d'envoi » devient observable.
    func holdNextSignIn() {
        isGated = true
    }

    var isHolding: Bool {
        gate != nil
    }

    func release() {
        gate?.resume()
        gate = nil
    }

    func signIn(email: String, password: String) async throws(AuthFailure) {
        signIns.append((email, password))
        if isGated {
            isGated = false
            await withCheckedContinuation { gate = $0 }
        }
        if let failure {
            throw failure
        }
    }

    func signUp(name: String, email: String, password _: String) async throws(AuthFailure) {
        signUps.append((name, email))
        if let failure {
            throw failure
        }
    }

    func requestPasswordReset(email: String) async throws(AuthFailure) {
        resets.append(email)
        if let failure {
            throw failure
        }
    }

    func signOut() async {}
}

@MainActor
@Suite("SignInViewModel")
struct SignInViewModelTests {
    @Test("champs vides : erreurs sous les champs, sans appeler l'API")
    func validatesBeforeCalling() async {
        let repository = FakeAuthRepository()
        let viewModel = SignInViewModel(repository: repository)

        await viewModel.submit()

        #expect(viewModel.emailError == .required)
        #expect(viewModel.passwordError == .required)
        #expect(await repository.signIns.isEmpty)
    }

    @Test("adresse mal formée")
    func rejectsInvalidEmail() async {
        let viewModel = SignInViewModel(repository: FakeAuthRepository())
        viewModel.email = "camille@"
        viewModel.password = "secret"

        await viewModel.submit()

        #expect(viewModel.emailError == .emailInvalid)
    }

    @Test("envoie l'adresse normalisée et efface le mot de passe après succès")
    func signsIn() async {
        let repository = FakeAuthRepository()
        let viewModel = SignInViewModel(repository: repository)
        viewModel.email = "  Camille@Example.COM "
        viewModel.password = "secret"

        await viewModel.submit()

        let signIns = await repository.signIns
        #expect(signIns.map(\.email) == ["camille@example.com"])
        #expect(signIns.map(\.password) == ["secret"])
        #expect(viewModel.password.isEmpty)
        #expect(viewModel.failure == nil)
        #expect(!viewModel.isSubmitting)
    }

    @Test("échec : message générique, mot de passe conservé pour corriger")
    func showsFailure() async {
        let viewModel = SignInViewModel(repository: FakeAuthRepository(failure: .invalidCredentials))
        viewModel.email = "camille@example.com"
        viewModel.password = "wrong"

        await viewModel.submit()

        #expect(viewModel.failure == .invalidCredentials)
        #expect(viewModel.password == "wrong")
    }

    @Test("modifier un champ efface son erreur et le message")
    func editingClearsErrors() async {
        let viewModel = SignInViewModel(repository: FakeAuthRepository(failure: .network))
        viewModel.email = "camille@example.com"
        viewModel.password = "secret"
        await viewModel.submit()

        viewModel.password = "other"

        #expect(viewModel.failure == nil)
    }

    @Test("pendant l'envoi : état « en cours », et un second appui n'envoie rien")
    func ignoresDoubleSubmit() async {
        let repository = FakeAuthRepository()
        await repository.holdNextSignIn()
        let viewModel = SignInViewModel(repository: repository)
        viewModel.email = "camille@example.com"
        viewModel.password = "secret"

        let first = Task { await viewModel.submit() }
        while await !repository.isHolding {
            await Task.yield()
        }
        #expect(viewModel.isSubmitting)
        await viewModel.submit()
        await repository.release()
        await first.value

        #expect(await repository.signIns.count == 1)
        #expect(!viewModel.isSubmitting)
    }

    @Test("un nouvel envoi efface l'ancien message, même sans modifier les champs")
    func resubmitClearsFailure() async {
        let repository = FakeAuthRepository(failure: .network)
        let viewModel = SignInViewModel(repository: repository)
        viewModel.email = "camille@example.com"
        viewModel.password = "secret"
        await viewModel.submit()
        #expect(viewModel.failure == .network)

        await repository.setFailure(nil)
        await viewModel.submit()

        #expect(viewModel.failure == nil)
    }

    @Test("une valeur réécrite à l'identique (fin d'édition) garde le message")
    func sameValueKeepsFailure() async {
        let viewModel = SignInViewModel(repository: FakeAuthRepository(failure: .invalidCredentials))
        viewModel.email = "camille@example.com"
        viewModel.password = "wrong"
        await viewModel.submit()

        viewModel.password = "wrong"

        #expect(viewModel.failure == .invalidCredentials)
    }

    @Test("modifier l'adresse efface son erreur")
    func editingEmailClearsItsError() async {
        let viewModel = SignInViewModel(repository: FakeAuthRepository())
        await viewModel.submit()
        #expect(viewModel.emailError == .required)

        viewModel.email = "c"

        #expect(viewModel.emailError == nil)
    }
}

@MainActor
@Suite("SignUpViewModel")
struct SignUpViewModelTests {
    @Test("bornes de BE-006 : nom, adresse, mot de passe")
    func validatesFields() async {
        let repository = FakeAuthRepository()
        let viewModel = SignUpViewModel(repository: repository)
        viewModel.name = String(repeating: "a", count: 101)
        viewModel.email = "not-an-email"
        viewModel.password = "short"

        await viewModel.submit()

        #expect(viewModel.nameError == .nameTooLong)
        #expect(viewModel.emailError == .emailInvalid)
        #expect(viewModel.passwordError == .passwordTooShort)
        #expect(await repository.signUps.isEmpty)
    }

    @Test("nom fait d'espaces : obligatoire ; 100 caractères : accepté")
    func nameBounds() async {
        let viewModel = SignUpViewModel(repository: FakeAuthRepository())
        viewModel.name = "   "
        await viewModel.submit()
        #expect(viewModel.nameError == .required)

        #expect(AuthValidation.nameError(String(repeating: "a", count: 100)) == nil)
    }

    @Test("mot de passe trop long")
    func rejectsLongPassword() async {
        let viewModel = SignUpViewModel(repository: FakeAuthRepository())
        viewModel.name = "Camille"
        viewModel.email = "camille@example.com"
        viewModel.password = String(repeating: "a", count: 129)

        await viewModel.submit()

        #expect(viewModel.passwordError == .passwordTooLong)
    }

    @Test("succès : écran « e-mail envoyé » avec l'adresse normalisée")
    func signsUp() async {
        let repository = FakeAuthRepository()
        let viewModel = SignUpViewModel(repository: repository)
        viewModel.name = "  Camille "
        viewModel.email = "Camille@Example.com"
        viewModel.password = "a-long-password"

        await viewModel.submit()

        #expect(viewModel.sentTo == "camille@example.com")
        #expect(viewModel.password.isEmpty)
        let signUps = await repository.signUps
        #expect(signUps.map(\.name) == ["Camille"])
    }

    @Test("échec : message, pas d'écran « e-mail envoyé »")
    func showsFailure() async {
        let viewModel = SignUpViewModel(repository: FakeAuthRepository(failure: .tooManyAttempts))
        viewModel.name = "Camille"
        viewModel.email = "camille@example.com"
        viewModel.password = "a-long-password"

        await viewModel.submit()

        #expect(viewModel.failure == .tooManyAttempts)
        #expect(viewModel.sentTo == nil)
    }
}

@MainActor
@Suite("ForgotPasswordViewModel")
struct ForgotPasswordViewModelTests {
    @Test("adresse obligatoire")
    func requiresEmail() async {
        let repository = FakeAuthRepository()
        let viewModel = ForgotPasswordViewModel(repository: repository)

        await viewModel.submit()

        #expect(viewModel.emailError == .required)
        #expect(await repository.resets.isEmpty)
    }

    @Test("succès : écran « e-mail envoyé »")
    func requestsReset() async {
        let repository = FakeAuthRepository()
        let viewModel = ForgotPasswordViewModel(repository: repository)
        viewModel.email = "Camille@example.com"

        await viewModel.submit()

        #expect(await repository.resets == ["camille@example.com"])
        #expect(viewModel.sentTo == "camille@example.com")
    }

    @Test("hors ligne : message réseau")
    func showsNetworkFailure() async {
        let viewModel = ForgotPasswordViewModel(repository: FakeAuthRepository(failure: .network))
        viewModel.email = "camille@example.com"

        await viewModel.submit()

        #expect(viewModel.failure == .network)
        #expect(viewModel.sentTo == nil)
    }
}

@Suite("AuthValidation")
struct AuthValidationTests {
    @Test("longueurs comptées comme l'API (UTF-16)")
    func countsUTF16() {
        // 6 émojis = 12 unités UTF-16 : accepté par l'API, donc ici aussi.
        #expect(AuthValidation.newPasswordError(String(repeating: "🔒", count: 6)) == nil)
        #expect(AuthValidation.newPasswordError(String(repeating: "a", count: 11)) == .passwordTooShort)
        #expect(AuthValidation.newPasswordError(String(repeating: "a", count: 128)) == nil)
        // 65 émojis = 130 unités UTF-16 : refusé, même si Swift n'y voit que 65 caractères.
        #expect(AuthValidation.newPasswordError(String(repeating: "🔒", count: 65)) == .passwordTooLong)
    }

    @Test("adresse : forme seulement")
    func emailShape() {
        #expect(AuthValidation.emailError("camille@example.com") == nil)
        #expect(AuthValidation.emailError("camille example@example.com") == .emailInvalid)
        #expect(AuthValidation.emailError("   ") == .required)
        #expect(AuthValidation.emailError("a@b") == .emailInvalid)
    }
}
