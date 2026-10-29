#if DEBUG
    import AuthFeature
    import CoreAuth
    import CoreModels
    import CoreNetworking
    import Foundation
    import NotesFeature
    import Synchronization

    /// Doublures pour XCUITest (IOS-005), activées par un argument de lancement, en Debug seulement.
    enum UITestFakes {
        static let launchArgument = "-ui-testing"
        static let email = "camille@example.com"
        static let password = "correct-password"

        final class MemoryTokenStorage: TokenStorage {
            private let token = Mutex<String?>(nil)

            func read() -> String? {
                token.withLock { $0 }
            }

            func write(_ value: String?) {
                token.withLock { $0 = value }
            }
        }

        struct AuthRepository: AuthFeature.AuthRepository {
            let session: SessionStore

            func signIn(email: String, password: String) async throws(AuthFailure) {
                guard email == UITestFakes.email, password == UITestFakes.password else {
                    throw .invalidCredentials
                }
                session.save("ui-test-token")
            }

            func signUp(name _: String, email _: String, password _: String) async throws(AuthFailure) {}

            func requestPasswordReset(email _: String) async throws(AuthFailure) {}

            func signOut() async {
                session.clear()
            }

            /// Comme l'API : la session n'est pas effacée ici, l'app s'en charge.
            func deleteAccount(password: String) async throws(AuthFailure) {
                guard password == UITestFakes.password else {
                    throw .wrongPassword
                }
            }
        }

        struct NotesRepository: NotesFeature.NotesRepository {
            static let welcomeID = "0190a5e0-0000-7000-8000-000000000001"
            /// Note listée mais supprimée entre-temps : son détail répond 404.
            static let deletedID = "0190a5e0-0000-7000-8000-000000000002"

            func list(query _: String) async throws(APIError) -> [Note] {
                [
                    Note(id: Self.welcomeID, title: "Bienvenue", content: "", createdAt: .now),
                    Note(id: Self.deletedID, title: "Supprimée ailleurs", content: "", createdAt: .now),
                ]
            }

            func get(id: String) async throws(APIError) -> Note {
                guard id == Self.welcomeID else {
                    throw .http(ProblemDetails(title: "Not Found", status: 404))
                }
                return Note(id: id, title: "Bienvenue", content: "Première note", createdAt: .now)
            }

            func create(title: String) async throws(APIError) -> Note {
                Note(id: UUID().uuidString, title: title, content: "", createdAt: .now)
            }
        }
    }
#endif
