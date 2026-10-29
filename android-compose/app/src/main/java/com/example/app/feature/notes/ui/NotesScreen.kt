package com.example.app.feature.notes.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.error
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.tooling.preview.Preview
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.app.R
import com.example.app.core.designsystem.AppTheme
import com.example.app.core.designsystem.ErrorState
import com.example.app.core.designsystem.Spacing
import com.example.app.core.model.Note
import com.example.app.core.network.ErrorKind
import java.time.Instant

/** Écran relié au ViewModel : seul composable qui connaît Hilt et le cycle de vie (AND-001). */
@Composable
fun NotesRoute(
    onOpenAccount: () -> Unit,
    onOpenNote: (String) -> Unit,
    viewModel: NotesViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    NotesScreen(
        state = state,
        onQueryChange = viewModel::onQueryChange,
        onDraftTitleChange = viewModel::onDraftTitleChange,
        onSubmit = viewModel::onSubmit,
        onRetry = viewModel::refresh,
        onUserMessageShown = viewModel::onUserMessageShown,
        onOpenAccount = onOpenAccount,
        onOpenNote = onOpenNote,
    )
}

/** Sans état : reçoit l'état, émet des événements. Prévisualisable et testable seul. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotesScreen(
    state: NotesUiState,
    onQueryChange: (String) -> Unit,
    onDraftTitleChange: (String) -> Unit,
    onSubmit: () -> Unit,
    onRetry: () -> Unit,
    onUserMessageShown: () -> Unit,
    onOpenAccount: () -> Unit,
    onOpenNote: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val snackbarHostState = remember { SnackbarHostState() }
    val message = state.userMessage?.let { stringResource(it) }
    LaunchedEffect(message) {
        if (message != null) {
            snackbarHostState.showSnackbar(message)
            onUserMessageShown()
        }
    }

    Scaffold(
        modifier = modifier,
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.notes_title)) },
                // Une seule action : en grande police, le titre et le bouton tiennent encore sur 320 dp.
                // La déconnexion est dans « Mon compte ».
                actions = { TextButton(onClick = onOpenAccount) { Text(stringResource(R.string.account_open)) } },
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
    ) { padding ->
        Column(
            modifier =
                Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(horizontal = Spacing.medium),
            verticalArrangement = Arrangement.spacedBy(Spacing.medium),
        ) {
            CreateNoteForm(state, onDraftTitleChange, onSubmit)
            OutlinedTextField(
                value = state.query,
                onValueChange = onQueryChange,
                label = { Text(stringResource(R.string.notes_search_label)) },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            NotesContent(state, onRetry, onOpenNote)
        }
    }
}

@Composable
private fun CreateNoteForm(
    state: NotesUiState,
    onDraftTitleChange: (String) -> Unit,
    onSubmit: () -> Unit,
) {
    val errorText = state.draftTitleError?.let { stringResource(it) }
    Row(verticalAlignment = Alignment.Top, horizontalArrangement = Arrangement.spacedBy(Spacing.small)) {
        OutlinedTextField(
            value = state.draftTitle,
            onValueChange = onDraftTitleChange,
            label = { Text(stringResource(R.string.notes_new_title_label)) },
            isError = errorText != null,
            supportingText = errorText?.let { { Text(it) } },
            singleLine = true,
            modifier =
                Modifier
                    .weight(1f)
                    .semantics { if (errorText != null) error(errorText) },
        )
        Button(onClick = onSubmit, enabled = !state.isSubmitting, modifier = Modifier.padding(top = Spacing.small)) {
            Text(stringResource(R.string.notes_add))
        }
    }
}

@Composable
private fun NotesContent(
    state: NotesUiState,
    onRetry: () -> Unit,
    onOpenNote: (String) -> Unit,
) {
    when {
        state.isLoading && state.notes.isEmpty() -> CircularProgressIndicator()
        state.loadError != null -> ErrorState(kind = state.loadError, onRetry = onRetry)
        state.notes.isEmpty() ->
            Text(
                if (state.query.isBlank()) {
                    stringResource(R.string.notes_empty)
                } else {
                    stringResource(R.string.notes_no_results, state.query)
                },
            )
        else ->
            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(Spacing.small),
                contentPadding = PaddingValues(bottom = Spacing.large),
            ) {
                items(state.notes, key = { it.id }) { note -> NoteItem(note, onClick = { onOpenNote(note.id) }) }
            }
    }
}

@Composable
private fun NoteItem(
    note: Note,
    onClick: () -> Unit,
) {
    Card(onClick = onClick, modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(Spacing.medium)) {
            Text(note.title, style = MaterialTheme.typography.titleMedium)
            if (note.content.isNotBlank()) {
                Text(note.content, style = MaterialTheme.typography.bodyMedium)
            }
        }
    }
}

private val previewNotes =
    listOf(
        Note("1", "Lire les ADR Android", "adr/android/README.md", Instant.parse("2026-10-20T09:00:00Z")),
        Note("2", "Brancher la vraie API", "", Instant.parse("2026-10-21T14:30:00Z")),
    )

@Preview(showBackground = true)
@Composable
private fun NotesScreenPreview() {
    AppTheme {
        NotesScreen(NotesUiState(notes = previewNotes, isLoading = false), {}, {}, {}, {}, {}, {}, {})
    }
}

@Preview(showBackground = true, widthDp = 320, fontScale = 2f)
@Composable
private fun NotesScreenLargeFontPreview() {
    AppTheme {
        NotesScreen(NotesUiState(notes = previewNotes, isLoading = false), {}, {}, {}, {}, {}, {}, {})
    }
}

@Preview(showBackground = true, fontScale = 1.5f)
@Composable
private fun NotesScreenErrorPreview() {
    AppTheme {
        NotesScreen(
            NotesUiState(isLoading = false, loadError = ErrorKind.Network, draftTitleError = R.string.validation_required),
            {},
            {},
            {},
            {},
            {},
            {},
            {},
        )
    }
}
