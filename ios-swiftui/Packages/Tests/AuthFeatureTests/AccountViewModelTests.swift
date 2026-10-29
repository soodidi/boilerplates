@testable import AuthFeature
import Foundation
import Testing

/// IOS-005 : un fake du repository plutôt qu'un mock généré.
private actor FakeAccountRepository: AuthRepository {
    private(set) var deletions: [String] = []
    private var failure: AuthFailure?
    private var gate: CheckedContinuation<Void, Never>?
    private var isGated = false

    init(failure: AuthFailure? = nil) {
        self.failure = failure
    }

    func setFailure(_ failure: AuthFailure?) {
        self.failure = failure
    }

    /// La prochaine suppression attend `release()` : l'état « en cours d'envoi » devient observable.
    func holdNextDeletion() {
        isGated = true
    }

    var isHolding: Bool {
        gate != nil
    }

    func release() {
        gate?.resume()
        gate = nil
    }

    func signIn(email _: String, password _: String) async throws(AuthFailure) {}

    func signUp(name _: String, email _: String, password _: String) async throws(AuthFailure) {}

    func requestPasswordReset(email _: String) async throws(AuthFailure) {}

    func signOut() async {}

    func deleteAccount(password: String) async throws(AuthFailure) {
        deletions.append(password)
        if isGated {
            isGated = false
            await withCheckedContinuation { gate = $0 }
        }
        if let failure {
            throw failure
        }
    }
}

@MainActor
@Suite("AccountViewModel")
final class AccountViewModelTests {
    /// Nombre d'appels à `onAccountDeleted` : l'app y efface la session.
    private var deletionsReported = 0

    private func viewModel(_ repository: FakeAccountRepository) -> AccountViewModel {
        AccountViewModel(
            repository: repository,
            webBaseURL: URL(string: "https://app.example.com")!,
            backupRetentionDays: 14
        ) { [unowned self] in
            deletionsReported += 1
        }
    }

    @Test("liens vers les pages du web")
    func links() {
        let viewModel = viewModel(FakeAccountRepository())

        #expect(viewModel.privacyPolicyURL.absoluteString == "https://app.example.com/legal/privacy")
        #expect(viewModel.exportURL.absoluteString == "https://app.example.com/account")
        #expect(viewModel.backupRetentionDays == 14)
    }

    @Test("rien n'est envoyé sans mot de passe ni confirmation")
    func requiresPasswordAndConfirmation() async {
        let repository = FakeAccountRepository()
        let viewModel = viewModel(repository)

        await viewModel.delete()

        #expect(viewModel.passwordError == .required)
        #expect(viewModel.confirmationMissing)
        #expect(await repository.deletions.isEmpty)

        viewModel.password = "secret"
        viewModel.isConfirmed = true
        #expect(viewModel.passwordError == nil)
        #expect(!viewModel.confirmationMissing)
    }

    @Test("le mot de passe seul ne suffit pas : la confirmation est exigée")
    func requiresConfirmationWithPassword() async {
        let repository = FakeAccountRepository()
        let viewModel = viewModel(repository)
        viewModel.password = "secret"

        await viewModel.delete()

        #expect(viewModel.confirmationMissing)
        #expect(viewModel.passwordError == nil)
        #expect(await repository.deletions.isEmpty)
    }

    @Test("la confirmation seule ne suffit pas : le mot de passe est exigé")
    func requiresPasswordWithConfirmation() async {
        let repository = FakeAccountRepository()
        let viewModel = viewModel(repository)
        viewModel.isConfirmed = true

        await viewModel.delete()

        #expect(viewModel.passwordError == .required)
        #expect(!viewModel.confirmationMissing)
        #expect(await repository.deletions.isEmpty)
    }

    @Test("pendant l'envoi : état « en cours », un second appui n'envoie rien ; puis l'app est prévenue, écran verrouillé")
    func deletesOnce() async {
        let repository = FakeAccountRepository()
        await repository.holdNextDeletion()
        let viewModel = viewModel(repository)
        viewModel.password = "secret"
        viewModel.isConfirmed = true

        let first = Task { await viewModel.delete() }
        while await !repository.isHolding {
            await Task.yield()
        }
        #expect(viewModel.isDeleting)
        await viewModel.delete()
        await repository.release()
        await first.value

        #expect(await repository.deletions == ["secret"])
        #expect(deletionsReported == 1)
        // L'écran reste verrouillé jusqu'au retour à la connexion.
        #expect(viewModel.isDeleting)
        #expect(viewModel.isDeleted)
        #expect(viewModel.password.isEmpty)
        #expect(viewModel.failure == nil)

        // Compte supprimé : plus aucun envoi.
        await viewModel.delete()
        #expect(await repository.deletions.count == 1)
    }

    @Test("mauvais mot de passe : message, mot de passe gardé ; le corriger efface le message")
    func wrongPassword() async {
        let viewModel = viewModel(FakeAccountRepository(failure: .wrongPassword))
        viewModel.password = "wrong"
        viewModel.isConfirmed = true

        await viewModel.delete()

        #expect(viewModel.failure == .wrongPassword)
        #expect(viewModel.password == "wrong")
        #expect(!viewModel.isDeleted)
        #expect(!viewModel.isDeleting)
        #expect(deletionsReported == 0)

        // SwiftUI réécrit la même valeur en fin d'édition : le message reste.
        viewModel.password = viewModel.password
        #expect(viewModel.failure == .wrongPassword)

        viewModel.password = "secret"
        #expect(viewModel.failure == nil)
    }

    @Test("autres échecs", arguments: [AuthFailure.tooManyAttempts, .network, .unknown])
    func otherFailures(failure: AuthFailure) async {
        let viewModel = viewModel(FakeAccountRepository(failure: failure))
        viewModel.password = "secret"
        viewModel.isConfirmed = true

        await viewModel.delete()

        #expect(viewModel.failure == failure)
        #expect(!viewModel.isDeleted)
    }

    @Test("lien refusé par le système : message, effacé au lien suivant")
    func linkUnavailable() {
        let viewModel = viewModel(FakeAccountRepository())

        viewModel.linkOpened(false)
        #expect(viewModel.linkUnavailable)

        viewModel.linkOpened(true)
        #expect(!viewModel.linkUnavailable)
    }
}
