package com.example.app.core.designsystem

import androidx.annotation.StringRes
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.tooling.preview.Preview
import com.example.app.R
import com.example.app.core.network.ErrorKind

/**
 * BE-010 : écran d'erreur commun, mêmes textes que le web. Réessayer pour une panne (réseau,
 * serveur) ; revenir en arrière pour un refus ou une ressource introuvable, où réessayer ne change rien.
 * Annoncé par TalkBack dès qu'il apparaît.
 */
@Composable
fun ErrorState(
    kind: ErrorKind,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
    /** Titre propre à la ressource, par exemple « Note introuvable ». */
    @StringRes notFoundTitle: Int = R.string.error_not_found_title,
    @StringRes notFoundDescription: Int = R.string.error_not_found_description,
    /** Sans lui, un refus ou une ressource introuvable n'a pas de bouton. */
    onBack: (() -> Unit)? = null,
    @StringRes backLabel: Int = R.string.error_back,
) {
    val (title, description) =
        when (kind) {
            ErrorKind.Forbidden -> R.string.error_forbidden_title to R.string.error_forbidden_description
            ErrorKind.NotFound -> notFoundTitle to notFoundDescription
            ErrorKind.Network -> R.string.error_network_title to R.string.error_network_description
            ErrorKind.Server -> R.string.error_title to R.string.error_description
        }
    val canRetry = kind == ErrorKind.Network || kind == ErrorKind.Server
    Column(
        verticalArrangement = Arrangement.spacedBy(Spacing.small),
        modifier = modifier.semantics(mergeDescendants = false) { liveRegion = LiveRegionMode.Polite },
    ) {
        Text(
            text = stringResource(title),
            style = MaterialTheme.typography.titleMedium,
            modifier = Modifier.semantics { heading() },
        )
        Text(stringResource(description), style = MaterialTheme.typography.bodyMedium)
        when {
            canRetry -> OutlinedButton(onClick = onRetry) { Text(stringResource(R.string.error_retry)) }
            onBack != null -> OutlinedButton(onClick = onBack) { Text(stringResource(backLabel)) }
        }
    }
}

@Preview(showBackground = true)
@Composable
private fun ErrorStateNetworkPreview() {
    AppTheme { ErrorState(ErrorKind.Network, onRetry = {}) }
}

@Preview(showBackground = true, fontScale = 1.5f)
@Composable
private fun ErrorStateForbiddenPreview() {
    AppTheme { ErrorState(ErrorKind.Forbidden, onRetry = {}, onBack = {}) }
}
