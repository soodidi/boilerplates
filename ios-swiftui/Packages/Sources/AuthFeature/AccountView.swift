import DesignSystem
import SwiftUI

/// GLB-013 : « Mon compte ». Ouvert depuis les notes par l'app, car une feature ne dépend pas d'une autre (IOS-002).
public struct AccountView: View {
    @State private var viewModel: AccountViewModel
    @FocusState private var focus: AuthField?
    @Environment(\.openURL) private var openURL
    private let onSignOut: () -> Void
    private let onAccountDeleted: () -> Void

    /// `onAccountDeleted` : l'app oublie la session, ce qui ramène à la connexion.
    public init(viewModel: AccountViewModel, onSignOut: @escaping () -> Void, onAccountDeleted: @escaping () -> Void) {
        _viewModel = State(initialValue: viewModel)
        self.onSignOut = onSignOut
        self.onAccountDeleted = onAccountDeleted
    }

    public var body: some View {
        Form {
            Section {
                Button {
                    open(viewModel.privacyPolicyURL)
                } label: {
                    Text("account.privacyLink", bundle: .module)
                }
                .accessibilityIdentifier("account.privacy")
                Button(action: onSignOut) {
                    Text("account.signOut", bundle: .module)
                }
                .accessibilityIdentifier("account.signOut")
            }
            Section {
                Button {
                    open(viewModel.exportURL)
                } label: {
                    Text("account.export.open", bundle: .module)
                }
                .accessibilityIdentifier("account.export")
                if viewModel.linkUnavailable {
                    Text("account.linkUnavailable", bundle: .module)
                        .foregroundStyle(AppColor.destructive)
                }
            } header: {
                Text("account.export.title", bundle: .module)
            } footer: {
                Text("account.export.description", bundle: .module)
            }
            DeleteAccountSection(viewModel: viewModel, focus: $focus)
            if let failure = viewModel.failure {
                FailureText(failure: failure)
            }
            Section {
                SubmitButton(
                    title: "account.delete.submit",
                    isSubmitting: viewModel.isDeleting,
                    color: AppColor.destructive,
                    foreground: AppColor.destructiveForeground,
                    action: delete
                )
            }
        }
        .disabled(viewModel.isDeleting)
        // Quitter l'écran annulerait l'appel alors que l'API a peut-être déjà supprimé le compte :
        // l'utilisateur croirait avoir annulé. Masquer le bouton retour coupe aussi le geste de retour.
        .navigationBarBackButtonHidden(viewModel.isDeleting)
        // « Terminé » ferme le clavier : la suppression se confirme encore avec l'interrupteur.
        .onSubmit { focus = nil }
        .onChange(of: viewModel.isDeleted) { _, isDeleted in
            if isDeleted {
                onAccountDeleted()
            }
        }
        .navigationTitle(Text("account.title", bundle: .module))
    }

    private func open(_ url: URL) {
        openURL(url) { accepted in
            viewModel.linkOpened(accepted)
        }
    }

    /// En cas d'erreur de saisie, le focus va au champ ; sinon, l'absence de confirmation est annoncée.
    private func delete() async {
        focus = nil
        await viewModel.delete()
        if viewModel.passwordError != nil {
            focus = .password
        } else if viewModel.confirmationMissing {
            AccessibilityNotification.Announcement(String(localized: "account.delete.confirmRequired", bundle: .module)).post()
        }
    }
}

/// Mot de passe actuel et confirmation explicite (GLB-013).
private struct DeleteAccountSection: View {
    @Bindable var viewModel: AccountViewModel
    let focus: FocusState<AuthField?>.Binding

    var body: some View {
        Section {
            PasswordField(text: $viewModel.password, error: viewModel.passwordError, focus: focus, title: "account.delete.password")
            FieldErrorText(error: viewModel.passwordError)
            // Interrupteur plutôt que case à cocher : c'est le contrôle natif d'iOS, annoncé par VoiceOver.
            Toggle(isOn: $viewModel.isConfirmed) {
                Text("account.delete.confirm", bundle: .module)
            }
            .tint(AppColor.destructive)
            .accessibilityHint(viewModel.confirmationMissing ? Text("account.delete.confirmRequired", bundle: .module) : Text(verbatim: ""))
            .accessibilityIdentifier("account.confirm")
            if viewModel.confirmationMissing {
                Text("account.delete.confirmRequired", bundle: .module)
                    .font(.footnote)
                    .foregroundStyle(AppColor.destructive)
                    .accessibilityHidden(true)
            }
        } header: {
            Text("account.delete.title", bundle: .module)
        } footer: {
            Text("account.delete.description \(viewModel.backupRetentionDays)", bundle: .module)
        }
    }
}
