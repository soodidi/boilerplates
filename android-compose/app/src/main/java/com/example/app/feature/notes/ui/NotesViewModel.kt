package com.example.app.feature.notes.ui

import androidx.annotation.StringRes
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.app.R
import com.example.app.core.model.Note
import com.example.app.core.network.ApiError
import com.example.app.core.network.ErrorKind
import com.example.app.feature.notes.data.NotesException
import com.example.app.feature.notes.data.NotesRepository
import com.example.app.feature.notes.data.errorKind
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

/** AND-002 : un état unique et immuable par écran. Les messages ponctuels font partie de l'état. */
data class NotesUiState(
    val query: String = "",
    val notes: List<Note> = emptyList(),
    val isLoading: Boolean = true,
    /** Échec du chargement de la liste : l'écran explique pourquoi (BE-010). */
    val loadError: ErrorKind? = null,
    val draftTitle: String = "",
    @StringRes val draftTitleError: Int? = null,
    val isSubmitting: Boolean = false,
    @StringRes val userMessage: Int? = null,
)

@HiltViewModel
class NotesViewModel
    @Inject
    constructor(
        private val repository: NotesRepository,
    ) : ViewModel() {
        private val _uiState = MutableStateFlow(NotesUiState())
        val uiState: StateFlow<NotesUiState> = _uiState.asStateFlow()

        private var searchJob: Job? = null

        init {
            refresh()
        }

        fun refresh() {
            searchJob?.cancel()
            searchJob = viewModelScope.launch { load() }
        }

        fun onQueryChange(query: String) {
            _uiState.update { it.copy(query = query) }
            searchJob?.cancel()
            searchJob =
                viewModelScope.launch {
                    delay(SEARCH_DEBOUNCE_MS)
                    load()
                }
        }

        fun onDraftTitleChange(title: String) {
            _uiState.update { it.copy(draftTitle = title, draftTitleError = null) }
        }

        fun onSubmit() {
            val title = _uiState.value.draftTitle.trim()
            if (title.isEmpty()) {
                _uiState.update { it.copy(draftTitleError = R.string.validation_required) }
                return
            }
            _uiState.update { it.copy(isSubmitting = true) }
            viewModelScope.launch {
                repository
                    .create(title)
                    .onSuccess {
                        _uiState.update {
                            it.copy(isSubmitting = false, draftTitle = "", userMessage = R.string.notes_added)
                        }
                        load()
                    }.onFailure { error ->
                        val fieldError = (error as? NotesException)?.titleFieldError()
                        _uiState.update {
                            it.copy(
                                isSubmitting = false,
                                draftTitleError = if (fieldError != null) R.string.validation_required else null,
                                userMessage = if (fieldError == null) R.string.notes_add_error else null,
                            )
                        }
                    }
            }
        }

        fun onUserMessageShown() {
            _uiState.update { it.copy(userMessage = null) }
        }

        private suspend fun load() {
            _uiState.update { it.copy(isLoading = true, loadError = null) }
            repository
                .list(_uiState.value.query)
                .onSuccess { notes -> _uiState.update { it.copy(isLoading = false, notes = notes) } }
                .onFailure { error -> _uiState.update { it.copy(isLoading = false, loadError = error.errorKind()) } }
        }

        private fun NotesException.titleFieldError() = (error as? ApiError.Http)?.problem?.errors?.firstOrNull { it.field == "title" }

        private companion object {
            const val SEARCH_DEBOUNCE_MS = 300L
        }
    }
