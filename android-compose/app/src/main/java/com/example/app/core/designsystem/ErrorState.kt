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

/** Ce qu'un écran d'erreur propose de faire. */
enum class ErrorAction { Retry, Back, None }

/** Titre, explication et action d'une erreur : la règle de BE-010, testée sans émulateur. */
data class ErrorContent(
    @StringRes val title: Int,
    @StringRes val description: Int,
    val action: ErrorAction,
)

/**
 * BE-010 : réessayer pour une panne (réseau, serveur) ; revenir en arrière pour un refus ou une
 * ressource introuvable, où réessayer ne change rien. Rien pour un 401 : l'app revient à la connexion.
 */
fun errorContent(
    kind: ErrorKind,
    @StringRes notFoundTitle: Int = R.string.error_not_found_title,
    @StringRes notFoundDescription: Int = R.string.error_not_found_description,
    canGoBack: Boolean = false,
): ErrorContent? {
    val back = if (canGoBack) ErrorAction.Back else ErrorAction.None
    return when (kind) {
        ErrorKind.Unauthorized -> null
        ErrorKind.Forbidden -> ErrorContent(R.string.error_forbidden_title, R.string.error_forbidden_description, back)
        ErrorKind.NotFound -> ErrorContent(notFoundTitle, notFoundDescription, back)
        ErrorKind.Network -> ErrorContent(R.string.error_network_title, R.string.error_network_description, ErrorAction.Retry)
        ErrorKind.Server -> ErrorContent(R.string.error_title, R.string.error_description, ErrorAction.Retry)
    }
}

/** Écran d'erreur commun, mêmes textes que le web. Annoncé par TalkBack (zone « live »). */
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
    val content = errorContent(kind, notFoundTitle, notFoundDescription, canGoBack = onBack != null) ?: return
    Column(
        verticalArrangement = Arrangement.spacedBy(Spacing.small),
        modifier = modifier.semantics { liveRegion = LiveRegionMode.Polite },
    ) {
        Text(
            text = stringResource(content.title),
            style = MaterialTheme.typography.titleMedium,
            modifier = Modifier.semantics { heading() },
        )
        Text(stringResource(content.description), style = MaterialTheme.typography.bodyMedium)
        when (content.action) {
            ErrorAction.Retry -> OutlinedButton(onClick = onRetry) { Text(stringResource(R.string.error_retry)) }
            ErrorAction.Back -> OutlinedButton(onClick = { onBack?.invoke() }) { Text(stringResource(backLabel)) }
            ErrorAction.None -> Unit
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
