import CoreModels
import CoreNetworking
import Foundation

/// IOS-002 : les ViewModels dépendent de ce protocole, injecté par le constructeur.
public protocol NotesRepository: Sendable {
    func list(query: String) async throws(APIError) -> [Note]
    func create(title: String) async throws(APIError) -> Note
}

/// Implémentation réseau (contrat du module notes du boilerplate api-nestjs).
public struct LiveNotesRepository: NotesRepository {
    private let client: APIClient

    public init(client: APIClient) {
        self.client = client
    }

    public func list(query: String) async throws(APIError) -> [Note] {
        var items = [URLQueryItem(name: "limit", value: "20")]
        if !query.isEmpty { items.append(URLQueryItem(name: "q", value: query)) }
        let page: NotePageDTO = try await client.get("v1/notes", query: items)
        return page.data.map(\.domain)
    }

    public func create(title: String) async throws(APIError) -> Note {
        let note: NoteDTO = try await client.post("v1/notes", body: CreateNoteDTO(title: title))
        return note.domain
    }
}

struct NoteDTO: Decodable {
    let id: String
    let title: String
    let content: String
    let createdAt: Date

    var domain: Note { Note(id: id, title: title, content: content, createdAt: createdAt) }
}

struct NotePageDTO: Decodable {
    let data: [NoteDTO]
    let nextCursor: String?
}

struct CreateNoteDTO: Encodable {
    let title: String
    var content = ""
}
