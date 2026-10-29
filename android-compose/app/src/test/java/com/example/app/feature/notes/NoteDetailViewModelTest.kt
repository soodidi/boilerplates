package com.example.app.feature.notes

import androidx.lifecycle.SavedStateHandle
import app.cash.turbine.test
import com.example.app.core.model.Note
import com.example.app.core.network.ApiError
import com.example.app.core.network.ErrorKind
import com.example.app.core.network.ProblemDetails
import com.example.app.feature.notes.data.NotesException
import com.example.app.feature.notes.ui.NoteDetailViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import java.time.Instant

@OptIn(ExperimentalCoroutinesApi::class)
class NoteDetailViewModelTest {
    private val dispatcher = StandardTestDispatcher()
    private val repository = FakeNotesRepository()
    private val note = Note("1", "Coffee", "Arabica", Instant.EPOCH)

    @Before
    fun setUp() {
        Dispatchers.setMain(dispatcher)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    private fun viewModel() = NoteDetailViewModel(SavedStateHandle(mapOf(NoteDetailViewModel.NOTE_ID_ARG to "1")), repository)

    private fun http(status: Int) = NotesException(ApiError.Http(ProblemDetails(title = "x", status = status)))

    @Test
    fun loadsTheNoteOfTheRoute() =
        runTest(dispatcher) {
            repository.notes += note
            val viewModel = viewModel()

            viewModel.uiState.test {
                assertTrue(awaitItem().isLoading)
                val loaded = awaitItem()
                assertFalse(loaded.isLoading)
                assertEquals(note, loaded.note)
                assertNull(loaded.error)
            }
        }

    @Test
    fun explainsEachFailure() =
        runTest(dispatcher) {
            val cases =
                mapOf(
                    http(404) to ErrorKind.NotFound,
                    http(403) to ErrorKind.Forbidden,
                    // L'intercepteur efface la session : l'écran n'affiche pas d'erreur.
                    http(401) to ErrorKind.Unauthorized,
                    http(500) to ErrorKind.Server,
                    NotesException(ApiError.Network) to ErrorKind.Network,
                )
            cases.forEach { (failure, expected) ->
                repository.getError = failure
                val viewModel = viewModel()
                advanceUntilIdle()

                assertEquals(expected, viewModel.uiState.value.error)
                assertNull(viewModel.uiState.value.note)
            }
        }

    @Test
    fun retriesOnceAfterANetworkFailure() =
        runTest(dispatcher) {
            repository.notes += note
            repository.getError = NotesException(ApiError.Network)
            val viewModel = viewModel()
            advanceUntilIdle()
            assertEquals(ErrorKind.Network, viewModel.uiState.value.error)

            repository.getError = null
            viewModel.load()
            // Un second appui pendant le chargement est ignoré.
            viewModel.load()
            advanceUntilIdle()

            assertEquals(note, viewModel.uiState.value.note)
            assertNull(viewModel.uiState.value.error)
            assertEquals(2, repository.getCount)
        }
}
