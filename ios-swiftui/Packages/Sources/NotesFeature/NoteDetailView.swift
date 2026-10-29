import CoreModels
import CoreNetworking
import DesignSystem
import SwiftUI

/// IOS-001 : vue sans logique métier ; elle lit l'état du ViewModel et lui transmet les actions.
public struct NoteDetailView: View {
    @State private var viewModel: NoteDetailViewModel
    @Environment(\.dismiss) private var dismiss

    public init(viewModel: NoteDetailViewModel) {
        _viewModel = State(initialValue: viewModel)
    }

    public var body: some View {
        List {
            switch viewModel.state {
            case .loading:
                ProgressView()
                    .frame(maxWidth: .infinity)
            case let .loaded(note):
                NoteContent(note: note)
            case let .failed(kind):
                ErrorStateView(
                    kind: kind,
                    notFound: ErrorStateView.NotFound(
                        title: String(localized: "notes.notFound.title", bundle: .module),
                        message: String(localized: "notes.notFound.message", bundle: .module)
                    ),
                    backLabel: Text("notes.backToList", bundle: .module),
                    onRetry: { Task { await viewModel.load() } },
                    onBack: { dismiss() }
                )
            }
        }
        .navigationTitle(Text("notes.title", bundle: .module))
        .navigationBarTitleDisplayModeInline()
        .task { await viewModel.load() }
    }
}

private struct NoteContent: View {
    let note: Note

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.small) {
            Text(note.title)
                .font(.title2)
                .accessibilityAddTraits(.isHeader)
                .accessibilityIdentifier("note.title")
            Text("notes.createdOn \(note.createdAt.formatted(date: .long, time: .omitted))", bundle: .module)
                .font(.caption)
                .foregroundStyle(AppColor.mutedForeground)
            if !note.content.isEmpty {
                Text(note.content)
            }
        }
    }
}

private extension View {
    /// Titre court dans la barre (iOS) ; le package compile aussi pour macOS, pour `swift test`.
    func navigationBarTitleDisplayModeInline() -> some View {
        #if os(iOS)
            navigationBarTitleDisplayMode(.inline)
        #else
            self
        #endif
    }
}

// MARK: - Previews

private struct PreviewNoteRepository: NotesRepository {
    var error: APIError?

    func list(query _: String) async throws(APIError) -> [Note] {
        []
    }

    func get(id: String) async throws(APIError) -> Note {
        if let error {
            throw error
        }
        return Note(id: id, title: "Lire les ADR iOS", content: "adr/ios/README.md", createdAt: .now)
    }

    func create(title: String) async throws(APIError) -> Note {
        Note(id: UUID().uuidString, title: title, content: "", createdAt: .now)
    }
}

#Preview("Note") {
    NavigationStack {
        NoteDetailView(viewModel: NoteDetailViewModel(id: "1", repository: PreviewNoteRepository()))
    }
}

#Preview("Note introuvable, grande police") {
    NavigationStack {
        NoteDetailView(viewModel: NoteDetailViewModel(
            id: "1",
            repository: PreviewNoteRepository(error: .http(ProblemDetails(title: "Not Found", status: 404)))
        ))
    }
    .environment(\.dynamicTypeSize, .accessibility2)
}
