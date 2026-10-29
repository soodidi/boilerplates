package com.example.app.feature.notes

import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.hasClickAction
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onFirst
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.test.platform.app.InstrumentationRegistry
import com.example.app.R
import com.example.app.core.designsystem.AppTheme
import com.example.app.core.model.Note
import com.example.app.core.network.ErrorKind
import com.example.app.feature.notes.ui.NoteDetailScreen
import com.example.app.feature.notes.ui.NoteDetailUiState
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import java.time.Instant

/** AND-005 : test UI de l'écran sans état, avec un état contrôlé. */
class NoteDetailScreenTest {
    @get:Rule
    val composeRule = createComposeRule()

    private fun string(id: Int) = InstrumentationRegistry.getInstrumentation().targetContext.getString(id)

    private fun setScreen(
        state: NoteDetailUiState,
        onRetry: () -> Unit = {},
        onBack: () -> Unit = {},
    ) {
        composeRule.setContent { AppTheme { NoteDetailScreen(state, onRetry, onBack) } }
    }

    @Test
    fun showsTheNote() {
        setScreen(NoteDetailUiState(note = Note("1", "Coffee", "Arabica", Instant.EPOCH), isLoading = false))

        composeRule.onNodeWithText("Coffee").assertIsDisplayed()
        composeRule.onNodeWithText("Arabica").assertIsDisplayed()
    }

    @Test
    fun explainsANoteNotFoundAndGoesBackToTheList() {
        var backs = 0
        setScreen(NoteDetailUiState(isLoading = false, error = ErrorKind.NotFound), onBack = { backs++ })

        composeRule.onNodeWithText(string(R.string.note_not_found_title)).assertIsDisplayed()
        // La barre du haut et l'écran d'erreur proposent tous deux « Toutes les notes ».
        val backButtons = composeRule.onAllNodes(hasText(string(R.string.note_back_to_list)) and hasClickAction())
        backButtons.assertCountEquals(2)
        backButtons.onFirst().performClick()
        assertEquals(1, backs)
    }

    @Test
    fun explainsAForbiddenNote() {
        setScreen(NoteDetailUiState(isLoading = false, error = ErrorKind.Forbidden))

        composeRule.onNodeWithText(string(R.string.error_forbidden_title)).assertIsDisplayed()
        composeRule.onNodeWithText(string(R.string.error_retry)).assertDoesNotExist()
        // BE-010 : un refus propose de revenir en arrière (barre du haut et écran d'erreur).
        composeRule.onAllNodes(hasText(string(R.string.note_back_to_list)) and hasClickAction()).assertCountEquals(2)
    }

    @Test
    fun offersARetryWhenTheServerCannotBeReached() {
        var retried = false
        setScreen(NoteDetailUiState(isLoading = false, error = ErrorKind.Network), onRetry = { retried = true })

        composeRule.onNodeWithText(string(R.string.error_network_title)).assertIsDisplayed()
        composeRule.onNodeWithText(string(R.string.error_retry)).performClick()
        assertTrue(retried)
    }
}
