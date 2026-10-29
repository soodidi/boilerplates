import CoreNetworking
import SwiftUI

/// Ce qu'un écran d'erreur propose de faire.
public enum ErrorAction: Sendable, Equatable {
    case retry
    case back
    case none
}

/// Clés du titre et de l'explication d'une erreur, et son action : la règle de BE-010, testée sans simulateur.
public struct ErrorContent: Sendable, Equatable {
    public let titleKey: String
    public let messageKey: String
    public let action: ErrorAction
}

/// BE-010 : réessayer pour une panne (réseau, serveur) ; revenir en arrière pour un refus ou une
/// ressource introuvable, où réessayer ne change rien. Rien pour un 401 : l'app revient à la connexion.
public func errorContent(for kind: ErrorKind, canGoBack: Bool) -> ErrorContent? {
    let back: ErrorAction = canGoBack ? .back : .none
    return switch kind {
    case .unauthorized: nil
    case .forbidden: ErrorContent(titleKey: "error.forbidden.title", messageKey: "error.forbidden.message", action: back)
    case .notFound: ErrorContent(titleKey: "error.notFound.title", messageKey: "error.notFound.message", action: back)
    case .network: ErrorContent(titleKey: "error.network.title", messageKey: "error.network.message", action: .retry)
    case .server: ErrorContent(titleKey: "error.server.title", messageKey: "error.server.message", action: .retry)
    }
}

/// Écran d'erreur commun, mêmes textes qu'Android et le web. Le titre est un en-tête, et l'erreur
/// est annoncée par VoiceOver à son apparition.
public struct ErrorStateView: View {
    /// Titre et explication propres à la ressource introuvable (par exemple « Note introuvable »).
    /// Textes déjà traduits par la feature : le titre est aussi celui qu'annonce VoiceOver.
    public struct NotFound: Sendable {
        let title: String
        let message: String

        public init(title: String, message: String) {
            self.title = title
            self.message = message
        }
    }

    private let kind: ErrorKind
    private let notFound: NotFound?
    private let backLabel: Text?
    private let onRetry: () -> Void
    private let onBack: (() -> Void)?

    /// `onBack` : sans lui, un refus ou une ressource introuvable n'a pas de bouton.
    public init(
        kind: ErrorKind,
        notFound: NotFound? = nil,
        backLabel: Text? = nil,
        onRetry: @escaping () -> Void,
        onBack: (() -> Void)? = nil
    ) {
        self.kind = kind
        self.notFound = notFound
        self.backLabel = backLabel
        self.onRetry = onRetry
        self.onBack = onBack
    }

    public var body: some View {
        if let content = errorContent(for: kind, canGoBack: onBack != nil) {
            let custom = kind == .notFound ? notFound : nil
            let title = custom?.title ?? String(localized: String.LocalizationValue(content.titleKey), bundle: .module)
            let message = custom?.message ?? String(localized: String.LocalizationValue(content.messageKey), bundle: .module)
            VStack(alignment: .leading, spacing: Spacing.small) {
                Text(verbatim: title)
                    .font(.headline)
                    .accessibilityAddTraits(.isHeader)
                    .accessibilityIdentifier("error.title")
                Text(verbatim: message)
                    .foregroundStyle(AppColor.mutedForeground)
                switch content.action {
                case .retry:
                    Button(action: onRetry) {
                        Text("error.retry", bundle: .module)
                    }
                    .accessibilityIdentifier("error.retry")
                case .back:
                    Button {
                        onBack?()
                    } label: {
                        backLabel ?? Text("error.back", bundle: .module)
                    }
                    .accessibilityIdentifier("error.back")
                case .none:
                    EmptyView()
                }
            }
            .task(id: kind) {
                AccessibilityNotification.Announcement(title).post()
            }
        }
    }
}

#Preview("Réseau") {
    ErrorStateView(kind: .network, onRetry: {})
        .padding()
}

#Preview("Accès refusé, grande police") {
    ErrorStateView(kind: .forbidden, onRetry: {}, onBack: {})
        .padding()
        .environment(\.dynamicTypeSize, .accessibility2)
}
