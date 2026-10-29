package com.example.app.feature.auth

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.hasClickAction
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.test.platform.app.InstrumentationRegistry
import com.example.app.R
import com.example.app.core.designsystem.AppTheme
import com.example.app.feature.auth.ui.SignInScreen
import com.example.app.feature.auth.ui.SignInUiState
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

/** AND-005 : test UI de l'écran sans état, avec un état contrôlé. */
class SignInScreenTest {
    @get:Rule
    val composeRule = createComposeRule()

    private fun string(id: Int) = InstrumentationRegistry.getInstrumentation().targetContext.getString(id)

    @Test
    fun showsTheErrorAndForwardsTheSubmit() {
        var submitted = false
        composeRule.setContent {
            AppTheme {
                SignInScreen(
                    state = SignInUiState(errorMessage = R.string.auth_error_invalid_credentials),
                    onEmailChange = {},
                    onPasswordChange = {},
                    onSubmit = { submitted = true },
                    onSignUp = {},
                    onForgotPassword = {},
                )
            }
        }

        composeRule.onNodeWithText(string(R.string.auth_error_invalid_credentials)).assertIsDisplayed()
        // Le titre porte le même texte que le bouton : on cible le nœud cliquable.
        composeRule.onNode(hasText(string(R.string.auth_sign_in_submit)) and hasClickAction()).performClick()
        assertTrue(submitted)
    }

    @Test
    fun opensSignUp() {
        var signUp = false
        composeRule.setContent {
            AppTheme {
                SignInScreen(SignInUiState(), {}, {}, {}, onSignUp = { signUp = true }, onForgotPassword = {})
            }
        }

        composeRule.onNodeWithText(string(R.string.auth_sign_up_link), useUnmergedTree = true).performClick()
        assertTrue(signUp)
    }

    @Test
    fun showsTheNoticeAfterAnAccountDeletion() {
        composeRule.setContent {
            AppTheme {
                SignInScreen(SignInUiState(), {}, {}, {}, {}, {}, notice = R.string.account_deleted)
            }
        }

        composeRule.onNodeWithText(string(R.string.account_deleted)).assertIsDisplayed()
    }
}
