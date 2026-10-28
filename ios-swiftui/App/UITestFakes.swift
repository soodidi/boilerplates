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
        }

        struct NotesRepository: NotesFeature.NotesRepository {
            func list(query _: String) async throws(APIError) -> [Note] {
                [Note(id: "1", title: "Bienvenue", content: "", createdAt: .now)]
            }

            func create(title: String) async throws(APIError) -> Note {
                Note(id: UUID().uuidString, title: title, content: "", createdAt: .now)
            }
        }
    }
#endif
