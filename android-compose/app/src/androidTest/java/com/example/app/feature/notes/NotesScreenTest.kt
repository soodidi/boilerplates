package com.example.app.feature.notes

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.test.platform.app.InstrumentationRegistry
import com.example.app.R
import com.example.app.core.designsystem.AppTheme
import com.example.app.core.model.Note
import com.example.app.feature.notes.ui.NotesScreen
import com.example.app.feature.notes.ui.NotesUiState
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import java.time.Instant

/** AND-005 : test UI de l'écran sans état, avec un état contrôlé. */
class NotesScreenTest {
    @get:Rule
    val composeRule = createComposeRule()

    @Test
    fun showsNotesAndForwardsRetry() {
        var retried = false
        composeRule.setContent {
            AppTheme {
                NotesScreen(
                    state = NotesUiState(isLoading = false, loadFailed = true),
                    onQueryChange = {},
                    onDraftTitleChange = {},
                    onSubmit = {},
                    onRetry = { retried = true },
                    onUserMessageShown = {},
                    onOpenAccount = {},
                    onSignOut = {},
                )
            }
        }

        val retryLabel = InstrumentationRegistry.getInstrumentation().targetContext.getString(R.string.notes_retry)
        composeRule.onNodeWithText(retryLabel, useUnmergedTree = true).performClick()
        assertTrue(retried)
    }

    @Test
    fun displaysTheNotes() {
        composeRule.setContent {
            AppTheme {
                NotesScreen(
                    state =
                        NotesUiState(
                            isLoading = false,
                            notes = listOf(Note("1", "Coffee", "Arabica", Instant.EPOCH)),
                        ),
                    onQueryChange = {},
                    onDraftTitleChange = {},
                    onSubmit = {},
                    onRetry = {},
                    onUserMessageShown = {},
                    onOpenAccount = {},
                    onSignOut = {},
                )
            }
        }

        composeRule.onNodeWithText("Coffee").assertIsDisplayed()
    }

    @Test
    fun forwardsAccountAndSignOut() {
        var accountOpened = false
        var signedOut = false
        composeRule.setContent {
            AppTheme {
                NotesScreen(
                    state = NotesUiState(isLoading = false),
                    onQueryChange = {},
                    onDraftTitleChange = {},
                    onSubmit = {},
                    onRetry = {},
                    onUserMessageShown = {},
                    onOpenAccount = { accountOpened = true },
                    onSignOut = { signedOut = true },
                )
            }
        }

        val context = InstrumentationRegistry.getInstrumentation().targetContext
        composeRule.onNodeWithText(context.getString(R.string.account_open), useUnmergedTree = true).performClick()
        composeRule.onNodeWithText(context.getString(R.string.auth_sign_out), useUnmergedTree = true).performClick()
        assertTrue(accountOpened)
        assertTrue(signedOut)
    }
}
