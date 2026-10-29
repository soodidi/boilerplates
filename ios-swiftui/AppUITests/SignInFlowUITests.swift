import XCTest

/// IOS-005 : parcours critique, avec les doublures de l'app (argument `-ui-testing`, Debug) :
/// connexion refusée, connexion, notes, « Mon compte », déconnexion et suppression du compte.
@MainActor
final class SignInFlowUITests: XCTestCase {
    private func launch() -> XCUIApplication {
        continueAfterFailure = false
        let app = XCUIApplication()
        // Français imposé : les textes vérifiés ne dépendent pas de la langue du simulateur (CI en anglais).
        app.launchArguments = ["-ui-testing", "-AppleLanguages", "(fr)", "-AppleLocale", "fr_FR"]
        app.launch()
        return app
    }

    func testSignInThenSignOut() {
        let app = launch()
        let email = app.textFields["auth.email"]
        XCTAssertTrue(email.waitForExistence(timeout: 10))

        signIn(app, email: "camille@example.com", password: "wrong-password")
        XCTAssertTrue(app.staticTexts["auth.failure"].waitForExistence(timeout: 5))

        signIn(app, email: "camille@example.com", password: "correct-password")
        // La liste arrive après le délai de recherche (300 ms) : attendre, ne pas lire tout de suite.
        XCTAssertTrue(app.staticTexts["Bienvenue"].waitForExistence(timeout: 5))

        // La déconnexion est dans « Mon compte ».
        openAccount(app)
        app.buttons["account.signOut"].tap()
        XCTAssertTrue(app.textFields["auth.email"].waitForExistence(timeout: 5))
        // Nouveau formulaire : rien du compte précédent.
        XCTAssertFalse((app.textFields["auth.email"].value as? String ?? "").contains("camille"))
    }

    func testOpensForgotPasswordThenSignUp() {
        let app = launch()
        XCTAssertTrue(app.buttons["auth.forgotPassword"].waitForExistence(timeout: 10))

        app.buttons["auth.forgotPassword"].tap()
        let email = app.textFields["auth.email"]
        XCTAssertTrue(email.waitForExistence(timeout: 5))
        email.tap()
        email.typeText("camille@example.com")
        app.buttons["auth.submit"].tap()
        XCTAssertTrue(app.staticTexts["auth.sent"].waitForExistence(timeout: 5))
        app.buttons["auth.backToSignIn"].tap()

        // Le bouton retour de la barre de navigation n'est pas exposé comme bouton (iOS 27) :
        // on revient par « Retour à la connexion », puis on ouvre l'inscription.
        XCTAssertTrue(app.buttons["auth.signUp"].waitForExistence(timeout: 5))
        app.buttons["auth.signUp"].tap()
        XCTAssertTrue(app.textFields["auth.name"].waitForExistence(timeout: 5))
    }

    func testDeleteAccountAfterAWrongPassword() {
        let app = launch()
        XCTAssertTrue(app.textFields["auth.email"].waitForExistence(timeout: 10))
        signIn(app, email: "camille@example.com", password: "correct-password")
        openAccount(app)

        let password = app.secureTextFields["auth.password"]
        password.tap()
        password.clearAndType("wrong-password")
        confirmDeletion(app)
        app.buttons["auth.submit"].tap()
        XCTAssertTrue(app.staticTexts["auth.failure"].waitForExistence(timeout: 5))

        password.tap()
        password.clearAndType("correct-password")
        app.buttons["auth.submit"].tap()

        // Retour à la connexion, qui confirme la suppression.
        XCTAssertTrue(app.staticTexts["auth.accountDeleted"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.textFields["auth.email"].exists)

        // Le message ne survit pas à la session suivante (la doublure ne supprime pas le compte).
        signIn(app, email: "camille@example.com", password: "correct-password")
        openAccount(app)
        app.buttons["account.signOut"].tap()
        XCTAssertTrue(app.textFields["auth.email"].waitForExistence(timeout: 5))
        XCTAssertFalse(app.staticTexts["auth.accountDeleted"].exists)
    }

    func testOpensANoteFromTheList() {
        let app = launch()
        XCTAssertTrue(app.textFields["auth.email"].waitForExistence(timeout: 10))
        signIn(app, email: "camille@example.com", password: "correct-password")

        let row = app.buttons["notes.row.0190a5e0-0000-7000-8000-000000000001"]
        XCTAssertTrue(row.waitForExistence(timeout: 5))
        row.tap()

        // BE-010 : le détail est chargé par l'API (doublure) : son contenu n'est pas dans la liste.
        let content = app.staticTexts["Première note"]
        XCTAssertTrue(content.waitForExistence(timeout: 10), app.debugDescription)
    }

    func testANoteNotFoundGoesBackToTheList() {
        let app = launch()
        XCTAssertTrue(app.textFields["auth.email"].waitForExistence(timeout: 10))
        signIn(app, email: "camille@example.com", password: "correct-password")

        let row = app.buttons["notes.row.0190a5e0-0000-7000-8000-000000000002"]
        XCTAssertTrue(row.waitForExistence(timeout: 5))
        row.tap()

        // BE-010 : 404 de l'API (doublure) → « Note introuvable », puis retour par « Toutes les notes ».
        XCTAssertTrue(app.staticTexts["error.title"].waitForExistence(timeout: 5))
        XCTAssertEqual(app.staticTexts["error.title"].label, "Note introuvable")
        app.buttons["error.back"].tap()

        // De retour sur la liste, « Mon compte » s'ouvre toujours.
        openAccount(app)
    }

    private func openAccount(_ app: XCUIApplication) {
        let account = app.buttons["notes.account"]
        XCTAssertTrue(account.waitForExistence(timeout: 5))
        account.tap()
        XCTAssertTrue(app.buttons["account.signOut"].waitForExistence(timeout: 5))
    }

    /// Un `Toggle` dans un `Form` ne bascule que par son interrupteur, pas par son libellé.
    private func confirmDeletion(_ app: XCUIApplication) {
        let toggle = app.switches["account.confirm"]
        XCTAssertTrue(toggle.waitForExistence(timeout: 5))
        toggle.switches.firstMatch.tap()
        XCTAssertEqual(toggle.value as? String, "1")
    }

    private func signIn(_ app: XCUIApplication, email: String, password: String) {
        let emailField = app.textFields["auth.email"]
        emailField.tap()
        emailField.clearAndType(email)
        let passwordField = app.secureTextFields["auth.password"]
        passwordField.tap()
        passwordField.clearAndType(password)
        app.buttons["auth.submit"].tap()
    }
}

@MainActor
private extension XCUIElement {
    func clearAndType(_ text: String) {
        if let current = value as? String, !current.isEmpty, current != placeholderValue {
            typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: current.count))
        }
        typeText(text)
    }
}
