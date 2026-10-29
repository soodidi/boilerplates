package com.example.app.feature.auth

import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.assertIsOff
import androidx.compose.ui.test.hasClickAction
import androidx.compose.ui.test.hasContentDescription
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.performTextInput
import androidx.test.platform.app.InstrumentationRegistry
import com.example.app.R
import com.example.app.core.designsystem.AppTheme
import com.example.app.feature.auth.ui.AccountScreen
import com.example.app.feature.auth.ui.AccountUiState
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

/** AND-005 : test UI de l'écran sans état, avec un état contrôlé. */
class AccountScreenTest {
    @get:Rule
    val composeRule = createComposeRule()

    private fun string(id: Int) = InstrumentationRegistry.getInstrumentation().targetContext.getString(id)

    // Le titre de la section porte le même texte que le bouton : on cible le nœud cliquable. Pendant
    // l'envoi, le bouton n'affiche qu'un indicateur : son libellé reste dans contentDescription.
    private val deleteButton
        get() = composeRule.onNode(hasContentDescription(string(R.string.account_delete_submit)) and hasClickAction())

    private fun setScreen(
        state: AccountUiState,
        onPasswordChange: (String) -> Unit = {},
        onConfirmChange: (Boolean) -> Unit = {},
        onDelete: () -> Unit = {},
        onOpenPrivacyPolicy: () -> Unit = {},
        onOpenExport: () -> Unit = {},
        onSignOut: () -> Unit = {},
        onBack: () -> Unit = {},
    ) {
        composeRule.setContent {
            AppTheme {
                AccountScreen(state, onPasswordChange, onConfirmChange, onDelete, onOpenPrivacyPolicy, onOpenExport, onSignOut, onBack)
            }
        }
    }

    @Test
    fun forwardsTheDeletionInputs() {
        var password = ""
        var confirmed = false
        var deleted = false
        setScreen(
            AccountUiState(),
            onPasswordChange = { password = it },
            onConfirmChange = { confirmed = it },
            onDelete = { deleted = true },
        )

        composeRule.onNodeWithText(string(R.string.account_delete_password)).performScrollTo().performTextInput("secret")
        composeRule.onNodeWithText(string(R.string.account_delete_confirm)).performScrollTo()
        // TalkBack annonce toute la ligne comme une case à cocher, décochée.
        composeRule
            .onNode(SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Checkbox))
            .assertIsOff()
            .performClick()
        deleteButton.performScrollTo().performClick()

        assertEquals("secret", password)
        assertTrue(confirmed)
        assertTrue(deleted)
    }

    @Test
    fun showsTheErrors() {
        setScreen(
            AccountUiState(
                confirmError = R.string.account_delete_confirm_required,
                errorMessage = R.string.account_delete_wrong_password,
            ),
        )

        composeRule.onNodeWithText(string(R.string.account_delete_confirm_required)).performScrollTo().assertIsDisplayed()
        composeRule.onNodeWithText(string(R.string.account_delete_wrong_password)).performScrollTo().assertIsDisplayed()
    }

    @Test
    fun locksTheScreenWhileDeleting() {
        setScreen(AccountUiState(password = "secret", confirmed = true, isDeleting = true))

        // Quitter l'écran annulerait l'appel alors que le compte est peut-être déjà supprimé.
        composeRule.onNode(hasText(string(R.string.account_back)) and hasClickAction()).assertIsNotEnabled()
        composeRule.onNode(hasText(string(R.string.auth_sign_out)) and hasClickAction()).assertIsNotEnabled()
        composeRule.onNodeWithText(string(R.string.account_delete_password)).performScrollTo().assertIsNotEnabled()
        composeRule
            .onNode(SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Checkbox))
            .performScrollTo()
            .assertIsNotEnabled()
        deleteButton.performScrollTo().assertIsNotEnabled()
    }

    @Test
    fun showsTheLinkErrorNearTheLinks() {
        setScreen(AccountUiState(linkError = R.string.account_link_unavailable))

        composeRule.onNodeWithText(string(R.string.account_link_unavailable)).performScrollTo().assertIsDisplayed()
    }

    @Test
    fun forwardsTheLinksSignOutAndBack() {
        var privacy = false
        var export = false
        var signedOut = false
        var back = false
        setScreen(
            AccountUiState(),
            onOpenPrivacyPolicy = { privacy = true },
            onOpenExport = { export = true },
            onSignOut = { signedOut = true },
            onBack = { back = true },
        )

        composeRule.onNodeWithText(string(R.string.account_privacy_link)).performClick()
        composeRule.onNodeWithText(string(R.string.account_export_open)).performScrollTo().performClick()
        composeRule.onNodeWithText(string(R.string.auth_sign_out)).performScrollTo().performClick()
        composeRule.onNodeWithText(string(R.string.account_back)).performClick()

        assertTrue(privacy)
        assertTrue(export)
        assertTrue(signedOut)
        assertTrue(back)
    }
}
