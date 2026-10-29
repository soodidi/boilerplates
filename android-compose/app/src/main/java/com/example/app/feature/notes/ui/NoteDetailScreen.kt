package com.example.app.feature.notes.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.heading
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
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle

@Composable
fun NoteDetailRoute(
    onBack: () -> Unit,
    viewModel: NoteDetailViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    NoteDetailScreen(state = state, onRetry = viewModel::load, onBack = onBack)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NoteDetailScreen(
    state: NoteDetailUiState,
    onRetry: () -> Unit,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Scaffold(
        modifier = modifier,
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.notes_title)) },
                navigationIcon = { TextButton(onClick = onBack) { Text(stringResource(R.string.note_back_to_list)) } },
            )
        },
    ) { padding ->
        Column(
            modifier =
                Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .verticalScroll(rememberScrollState())
                    .padding(Spacing.medium),
            verticalArrangement = Arrangement.spacedBy(Spacing.small),
        ) {
            val note = state.note
            when {
                state.isLoading -> CircularProgressIndicator()
                state.error != null ->
                    ErrorState(
                        kind = state.error,
                        onRetry = onRetry,
                        notFoundTitle = R.string.note_not_found_title,
                        notFoundDescription = R.string.note_not_found_description,
                        onBack = onBack,
                        backLabel = R.string.note_back_to_list,
                    )
                note != null -> NoteContent(note)
            }
        }
    }
}

@Composable
private fun NoteContent(note: Note) {
    // Langue courante : elle peut changer sans que le processus redémarre.
    val locale = LocalConfiguration.current.locales[0]
    val dateFormatter = remember(locale) { DateTimeFormatter.ofLocalizedDate(FormatStyle.LONG).withLocale(locale) }
    Text(
        text = note.title,
        style = MaterialTheme.typography.headlineSmall,
        modifier = Modifier.semantics { heading() },
    )
    Text(
        text = stringResource(R.string.note_created_on, dateFormatter.format(note.createdAt.atZone(ZoneId.systemDefault()))),
        style = MaterialTheme.typography.bodySmall,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
    )
    if (note.content.isNotBlank()) {
        Text(note.content, style = MaterialTheme.typography.bodyLarge)
    }
}

@Preview(showBackground = true)
@Composable
private fun NoteDetailScreenPreview() {
    AppTheme {
        NoteDetailScreen(
            NoteDetailUiState(
                note = Note("1", "Lire les ADR Android", "adr/android/README.md", Instant.parse("2026-10-20T09:00:00Z")),
                isLoading = false,
            ),
            {},
            {},
        )
    }
}

@Preview(showBackground = true, fontScale = 1.5f)
@Composable
private fun NoteDetailNotFoundPreview() {
    AppTheme { NoteDetailScreen(NoteDetailUiState(isLoading = false, error = ErrorKind.NotFound), {}, {}) }
}
