import Foundation
import Observation

/// GLB-013 : « Mon compte ». La suppression se fait ici, avec le mot de passe et une confirmation
/// explicite ; l'export et la politique de confidentialité s'ouvrent sur le web.
@MainActor
@Observable
public final class AccountViewModel {
    public var password = "" {
        didSet {
            // SwiftUI réécrit la même valeur en fin d'édition : seul un vrai changement efface les erreurs.
            guard password != oldValue else {
                return
            }
            passwordError = nil
            failure = nil
        }
    }

    public var isConfirmed = false {
        didSet {
            if isConfirmed {
                confirmationMissing = false
            }
        }
    }

    public private(set) var passwordError: FieldError?
    /// La suppression a été demandée sans cocher la confirmation.
    public private(set) var confirmationMissing = false
    /// Vrai pendant l'envoi, et après un succès : l'écran reste verrouillé jusqu'au retour à la connexion.
    public private(set) var isDeleting = false
    public private(set) var failure: AuthFailure?
    /// Aucune app n'a pu ouvrir un lien vers le web.
    public private(set) var linkUnavailable = false
    /// Le compte est supprimé : plus aucun envoi.
    public private(set) var isDeleted = false

    /// Durée de conservation des sauvegardes, annoncée avant la suppression (GLB-013).
    public let backupRetentionDays: Int
    public let privacyPolicyURL: URL
    /// L'export se télécharge depuis la page « Mon compte » du web (GLB-013 le permet aux apps mobiles).
    public let exportURL: URL

    private let repository: any AuthRepository
    private let onAccountDeleted: @MainActor () -> Void

    /// `onAccountDeleted` : l'app oublie la session, ce qui ramène à la connexion. Appelé dès la réponse
    /// de l'API, sans attendre le rendu de l'écran : la session est effacée même si l'écran a disparu.
    public init(
        repository: any AuthRepository,
        webBaseURL: URL,
        backupRetentionDays: Int,
        onAccountDeleted: @escaping @MainActor () -> Void
    ) {
        self.repository = repository
        self.onAccountDeleted = onAccountDeleted
        self.backupRetentionDays = backupRetentionDays
        privacyPolicyURL = webBaseURL.appending(path: "legal/privacy")
        exportURL = webBaseURL.appending(path: "account")
    }

    /// Résultat de l'ouverture d'un lien par le système.
    public func linkOpened(_ accepted: Bool) {
        linkUnavailable = !accepted
    }

    public func delete() async {
        guard !isDeleting, !isDeleted else {
            return
        }
        let passwordError: FieldError? = password.isEmpty ? .required : nil
        guard passwordError == nil, isConfirmed else {
            self.passwordError = passwordError
            confirmationMissing = !isConfirmed
            return
        }
        isDeleting = true
        // Un message identique au précédent est réaffiché et réannoncé.
        failure = nil
        do throws(AuthFailure) {
            try await repository.deleteAccount(password: password)
            // Le mot de passe ne reste pas en mémoire plus que nécessaire.
            password = ""
            isDeleted = true
            onAccountDeleted()
        } catch {
            failure = error
            isDeleting = false
        }
    }
}
