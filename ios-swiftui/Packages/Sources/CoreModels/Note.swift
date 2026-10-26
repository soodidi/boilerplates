import Foundation

/// Modèle du domaine : les vues ne voient jamais un DTO réseau (IOS-002).
public struct Note: Identifiable, Hashable, Sendable {
    public let id: String
    public let title: String
    public let content: String
    public let createdAt: Date

    public init(id: String, title: String, content: String, createdAt: Date) {
        self.id = id
        self.title = title
        self.content = content
        self.createdAt = createdAt
    }
}
