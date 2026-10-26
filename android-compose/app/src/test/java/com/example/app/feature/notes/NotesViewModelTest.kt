package com.example.app.feature.notes

import app.cash.turbine.test
import com.example.app.R
import com.example.app.core.model.Note
import com.example.app.core.network.ApiError
import com.example.app.core.network.FieldError
import com.example.app.core.network.ProblemDetails
import com.example.app.feature.notes.data.NotesException
import com.example.app.feature.notes.data.NotesRepository
import com.example.app.feature.notes.ui.NotesViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.TestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import java.time.Instant

/** AND-005 : un fake du repository plutôt qu'un mock. */
private class FakeNotesRepository : NotesRepository {
    val notes = mutableListOf<Note>()
    var createError: NotesException? = null
    var lastQuery: String? = null

    override suspend fun list(query: String): Result<List<Note>> {
        lastQuery = query
        return Result.success(notes.filter { it.title.contains(query, ignoreCase = true) })
    }

    override suspend fun create(title: String): Result<Note> {
        createError?.let { return Result.failure(it) }
        val note = Note(id = "${notes.size + 1}", title = title, content = "", createdAt = Instant.EPOCH)
        notes += note
        return Result.success(note)
    }
}

@OptIn(ExperimentalCoroutinesApi::class)
class NotesViewModelTest {
    private val dispatcher: TestDispatcher = StandardTestDispatcher()
    private lateinit var repository: FakeNotesRepository

    @Before
    fun setUp() {
        Dispatchers.setMain(dispatcher)
        repository = FakeNotesRepository()
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `loads notes on start`() =
        runTest(dispatcher) {
            repository.notes += Note("1", "Coffee", "", Instant.EPOCH)
            val viewModel = NotesViewModel(repository)

            advanceUntilIdle()

            val state = viewModel.uiState.value
            assertEquals(false, state.isLoading)
            assertEquals(listOf("Coffee"), state.notes.map { it.title })
        }

    @Test
    fun `refuses an empty title without calling the repository`() =
        runTest(dispatcher) {
            val viewModel = NotesViewModel(repository)
            advanceUntilIdle()

            viewModel.onSubmit()

            assertEquals(R.string.validation_required, viewModel.uiState.value.draftTitleError)
            assertTrue(repository.notes.isEmpty())
        }

    @Test
    fun `creates a note, clears the draft and shows a message`() =
        runTest(dispatcher) {
            val viewModel = NotesViewModel(repository)
            advanceUntilIdle()

            viewModel.uiState.test {
                skipItems(1)
                viewModel.onDraftTitleChange("Buy coffee")
                viewModel.onSubmit()
                advanceUntilIdle()
                val state = expectMostRecentItem()
                assertEquals("", state.draftTitle)
                assertEquals(R.string.notes_added, state.userMessage)
                assertEquals(listOf("Buy coffee"), state.notes.map { it.title })
            }
        }

    @Test
    fun `maps an API field error onto the title field`() =
        runTest(dispatcher) {
            repository.createError =
                NotesException(
                    ApiError.Http(
                        ProblemDetails(
                            title = "Validation failed",
                            status = 400,
                            errors = listOf(FieldError(field = "title", code = "too_small")),
                        ),
                    ),
                )
            val viewModel = NotesViewModel(repository)
            advanceUntilIdle()

            viewModel.onDraftTitleChange("x")
            viewModel.onSubmit()
            advanceUntilIdle()

            assertEquals(R.string.validation_required, viewModel.uiState.value.draftTitleError)
            assertNull(viewModel.uiState.value.userMessage)
        }

    @Test
    fun `debounces the search`() =
        runTest(dispatcher) {
            val viewModel = NotesViewModel(repository)
            advanceUntilIdle()

            viewModel.onQueryChange("c")
            viewModel.onQueryChange("co")
            viewModel.onQueryChange("cof")
            advanceUntilIdle()

            assertEquals("cof", repository.lastQuery)
        }
}
