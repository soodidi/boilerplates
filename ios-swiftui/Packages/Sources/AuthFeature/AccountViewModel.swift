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
    public private(set) var isDeleting = false
    public private(set) var failure: AuthFailure?
    /// Aucune app n'a pu ouvrir un lien vers le web.
    public private(set) var linkUnavailable = false
    /// Le compte est supprimé : la vue le transmet à l'app, qui oublie la session et quitte l'écran.
    /// Il bloque aussi un nouvel envoi.
    public private(set) var isDeleted = false

    /// Durée de conservation des sauvegardes, annoncée avant la suppression (GLB-013).
    public let backupRetentionDays: Int
    public let privacyPolicyURL: URL
    /// L'export se télécharge depuis la page « Mon compte » du web (GLB-013 le permet aux apps mobiles).
    public let exportURL: URL

    private let repository: any AuthRepository

    public init(repository: any AuthRepository, webBaseURL: URL, backupRetentionDays: Int) {
        self.repository = repository
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
        defer { isDeleting = false }
        do throws(AuthFailure) {
            try await repository.deleteAccount(password: password)
            // Le mot de passe ne reste pas en mémoire plus que nécessaire.
            password = ""
            isDeleted = true
        } catch {
            failure = error
        }
    }
}
