package com.example.app.feature.notes.ui

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.app.core.model.Note
import com.example.app.core.network.ErrorKind
import com.example.app.core.network.kind
import com.example.app.feature.notes.data.NotesException
import com.example.app.feature.notes.data.NotesRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class NoteDetailUiState(
    val note: Note? = null,
    val isLoading: Boolean = true,
    /** BE-010 : note introuvable (ou d'un autre utilisateur), refus, panne réseau ou serveur. */
    val error: ErrorKind? = null,
)

/** Détail d'une note. L'identifiant vient de la route typée (`NoteDetailDestination`), par le SavedStateHandle. */
@HiltViewModel
class NoteDetailViewModel
    @Inject
    constructor(
        savedStateHandle: SavedStateHandle,
        private val repository: NotesRepository,
    ) : ViewModel() {
        private val id: String = checkNotNull(savedStateHandle[NOTE_ID_ARG]) { "Missing note id" }

        private val _uiState = MutableStateFlow(NoteDetailUiState())
        val uiState: StateFlow<NoteDetailUiState> = _uiState.asStateFlow()

        private var loadJob: Job? = null

        init {
            load()
        }

        /** Un second appui pendant le chargement est ignoré. */
        fun load() {
            if (loadJob?.isActive == true) return
            _uiState.update { it.copy(isLoading = true, error = null) }
            loadJob =
                viewModelScope.launch {
                    repository
                        .get(id)
                        .onSuccess { note -> _uiState.update { it.copy(isLoading = false, note = note) } }
                        .onFailure { failure ->
                            val kind = (failure as? NotesException)?.error?.kind ?: ErrorKind.Server
                            _uiState.update { it.copy(isLoading = false, error = kind) }
                        }
                }
        }

        companion object {
            /** Nom de la propriété de `NoteDetailDestination`, sous lequel la navigation range l'identifiant. */
            const val NOTE_ID_ARG = "id"
        }
    }
