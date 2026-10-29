package com.example.app.feature.notes

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.test.platform.app.InstrumentationRegistry
import com.example.app.R
import com.example.app.core.designsystem.AppTheme
import com.example.app.core.model.Note
import com.example.app.core.network.ErrorKind
import com.example.app.feature.notes.ui.NotesScreen
import com.example.app.feature.notes.ui.NotesUiState
import org.junit.Assert.assertEquals
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
                    state = NotesUiState(isLoading = false, loadError = ErrorKind.Network),
                    onQueryChange = {},
                    onDraftTitleChange = {},
                    onSubmit = {},
                    onRetry = { retried = true },
                    onUserMessageShown = {},
                    onOpenAccount = {},
                    onOpenNote = {},
                )
            }
        }

        val retryLabel = InstrumentationRegistry.getInstrumentation().targetContext.getString(R.string.error_retry)
        composeRule.onNodeWithText(retryLabel, useUnmergedTree = true).performClick()
        assertTrue(retried)
    }

    @Test
    fun displaysTheNotesAndOpensOne() {
        var opened: String? = null
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
                    onOpenNote = { opened = it },
                )
            }
        }

        composeRule.onNodeWithText("Coffee").assertIsDisplayed().performClick()
        assertEquals("1", opened)
    }

    @Test
    fun opensTheAccount() {
        var accountOpened = false
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
                    onOpenNote = {},
                )
            }
        }

        val label = InstrumentationRegistry.getInstrumentation().targetContext.getString(R.string.account_open)
        composeRule.onNodeWithText(label, useUnmergedTree = true).performClick()
        assertTrue(accountOpened)
    }
}
