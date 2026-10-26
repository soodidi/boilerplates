import CoreModels
import CoreNetworking
import DesignSystem
import SwiftUI

/// IOS-001 : vue sans logique métier ; elle lit l'état du ViewModel et lui transmet les actions.
public struct NotesView: View {
    @State private var viewModel: NotesViewModel

    public init(viewModel: NotesViewModel) {
        _viewModel = State(initialValue: viewModel)
    }

    public var body: some View {
        List {
            Section {
                CreateNoteRow(viewModel: viewModel)
            }
            Section {
                content
            }
        }
        .navigationTitle(Text("notes.title", bundle: .module))
        .searchable(text: $viewModel.query, prompt: Text("notes.search", bundle: .module))
        .task(id: viewModel.query) { await viewModel.search() }
        .refreshable { await viewModel.load() }
        .overlay(alignment: .bottom) { MessageBanner(message: $viewModel.message) }
    }

    @ViewBuilder
    private var content: some View {
        switch viewModel.loadState {
        case .loading where viewModel.notes.isEmpty:
            ProgressView()
                .frame(maxWidth: .infinity)
        case .failed:
            VStack(alignment: .leading, spacing: Spacing.small) {
                Text("notes.loadError", bundle: .module)
                    .foregroundStyle(.red)
                Button {
                    Task { await viewModel.load() }
                } label: {
                    Text("notes.retry", bundle: .module)
                }
            }
        default:
            if viewModel.notes.isEmpty {
                if viewModel.query.isEmpty {
                    Text("notes.empty", bundle: .module)
                } else {
                    Text("notes.noResults \(viewModel.query)", bundle: .module)
                }
            } else {
                ForEach(viewModel.notes) { note in
                    NoteRow(note: note)
                }
            }
        }
    }
}

private struct CreateNoteRow: View {
    @Bindable var viewModel: NotesViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.small) {
            HStack {
                TextField(text: $viewModel.draftTitle) {
                    Text("notes.newTitle", bundle: .module)
                }
                .submitLabel(.done)
                .onSubmit { Task { await viewModel.submit() } }

                Button {
                    Task { await viewModel.submit() }
                } label: {
                    Text("notes.add", bundle: .module)
                }
                .disabled(viewModel.isSubmitting)
            }
            if viewModel.titleIsInvalid {
                Text("validation.required", bundle: .module)
                    .font(.footnote)
                    .foregroundStyle(.red)
            }
        }
    }
}

private struct NoteRow: View {
    let note: Note

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.small / 2) {
            Text(note.title)
                .font(.headline)
            if !note.content.isEmpty {
                Text(note.content)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            Text(note.createdAt, format: .dateTime.day().month().year())
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .accessibilityElement(children: .combine)
    }
}

private struct MessageBanner: View {
    @Binding var message: NotesViewModel.Message?

    var body: some View {
        if let message {
            let text = Text(Self.key(for: message), bundle: .module)
            text
                .padding(Spacing.medium)
                .background(.thinMaterial, in: .capsule)
                .padding(Spacing.large)
                .task {
                    // IOS-001 : message annoncé par VoiceOver, puis effacé.
                    AccessibilityNotification.Announcement(text).post()
                    try? await Task.sleep(for: .seconds(3))
                    self.message = nil
                }
        }
    }

    private static func key(for message: NotesViewModel.Message) -> LocalizedStringKey {
        switch message {
        case .noteAdded: "notes.added"
        case .addFailed: "notes.addError"
        }
    }
}

// MARK: - Previews

private struct PreviewNotesRepository: NotesRepository {
    var notes: [Note] = [
        Note(id: "1", title: "Lire les ADR iOS", content: "adr/ios/README.md", createdAt: .now),
        Note(id: "2", title: "Brancher la vraie API", content: "", createdAt: .now),
    ]
    var fails = false

    func list(query _: String) async throws(APIError) -> [Note] {
        if fails { throw .network }
        return notes
    }

    func create(title: String) async throws(APIError) -> Note {
        Note(id: UUID().uuidString, title: title, content: "", createdAt: .now)
    }
}

#Preview("Liste") {
    NavigationStack {
        NotesView(viewModel: NotesViewModel(repository: PreviewNotesRepository()))
    }
}

#Preview("Erreur, grande police") {
    NavigationStack {
        NotesView(viewModel: NotesViewModel(repository: PreviewNotesRepository(fails: true)))
    }
    .environment(\.dynamicTypeSize, .accessibility2)
}
