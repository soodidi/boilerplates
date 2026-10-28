package com.example.app.feature.auth

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.test.platform.app.InstrumentationRegistry
import com.example.app.R
import com.example.app.core.designsystem.AppTheme
import com.example.app.feature.auth.ui.ForgotPasswordScreen
import com.example.app.feature.auth.ui.ForgotPasswordUiState
import com.example.app.feature.auth.ui.SignUpScreen
import com.example.app.feature.auth.ui.SignUpUiState
import org.junit.Rule
import org.junit.Test

/** AND-005 : écrans sans état, dans leur état « e-mail envoyé ». */
class SignUpAndForgotPasswordScreenTest {
    @get:Rule
    val composeRule = createComposeRule()

    private val context = InstrumentationRegistry.getInstrumentation().targetContext

    @Test
    fun signUpConfirmsTheEmailWasSent() {
        composeRule.setContent {
            AppTheme { SignUpScreen(SignUpUiState(sentTo = "ada@example.com"), {}, {}, {}, {}, {}) }
        }

        composeRule.onNodeWithText(context.getString(R.string.auth_sign_up_sent, "ada@example.com")).assertIsDisplayed()
        composeRule.onNodeWithText(context.getString(R.string.auth_back_to_sign_in)).assertIsDisplayed()
    }

    @Test
    fun forgotPasswordConfirmsTheEmailWasSent() {
        composeRule.setContent {
            AppTheme { ForgotPasswordScreen(ForgotPasswordUiState(sentTo = "ada@example.com"), {}, {}, {}) }
        }

        composeRule.onNodeWithText(context.getString(R.string.auth_forgot_password_sent, "ada@example.com")).assertIsDisplayed()
    }
}
