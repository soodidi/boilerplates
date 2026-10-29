package com.example.app.feature.auth.ui

import androidx.activity.compose.BackHandler
import androidx.annotation.StringRes
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.selection.toggleable
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.minimumInteractiveComponentSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.autofill.ContentType
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.res.integerResource
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.error
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.tooling.preview.Preview
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.app.R
import com.example.app.core.designsystem.AppTheme
import com.example.app.core.designsystem.Spacing

@Composable
fun AccountRoute(
    onBack: () -> Unit,
    onSignOut: () -> Unit,
    onAccountDeleted: () -> Unit,
    viewModel: AccountViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val uriHandler = LocalUriHandler.current

    LaunchedEffect(state.isDeleted) {
        if (state.isDeleted) onAccountDeleted()
    }

    fun open(url: String) {
        try {
            uriHandler.openUri(url)
            viewModel.onLinkOpened()
        } catch (_: IllegalArgumentException) {
            // Levée par Compose quand aucune app ne sait ouvrir le lien.
            viewModel.onLinkUnavailable()
        }
    }

    AccountScreen(
        state = state,
        onPasswordChange = viewModel::onPasswordChange,
        onConfirmChange = viewModel::onConfirmChange,
        onDelete = viewModel::onDelete,
        onOpenPrivacyPolicy = { open(viewModel.privacyPolicyUrl) },
        onOpenExport = { open(viewModel.exportUrl) },
        onSignOut = onSignOut,
        onBack = onBack,
    )
}

@Composable
fun AccountScreen(
    state: AccountUiState,
    onPasswordChange: (String) -> Unit,
    onConfirmChange: (Boolean) -> Unit,
    onDelete: () -> Unit,
    onOpenPrivacyPolicy: () -> Unit,
    onOpenExport: () -> Unit,
    onSignOut: () -> Unit,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    // Quitter l'écran annulerait l'appel alors que l'API a peut-être déjà supprimé le compte :
    // l'utilisateur croirait avoir annulé. Le retour attend donc la réponse.
    BackHandler(enabled = state.isDeleting) {}
    AuthScaffold(
        title = R.string.account_title,
        modifier = modifier,
        navigationIcon = {
            TextButton(onClick = onBack, enabled = !state.isDeleting) { Text(stringResource(R.string.account_back)) }
        },
    ) {
        TextButton(onClick = onOpenPrivacyPolicy) { Text(stringResource(R.string.account_privacy_link)) }
        OutlinedButton(onClick = onSignOut, enabled = !state.isDeleting, modifier = Modifier.fillMaxWidth()) {
            Text(stringResource(R.string.auth_sign_out))
        }

        SectionTitle(R.string.account_export_title)
        Text(stringResource(R.string.account_export_description), style = MaterialTheme.typography.bodyMedium)
        OutlinedButton(onClick = onOpenExport, modifier = Modifier.fillMaxWidth()) {
            Text(stringResource(R.string.account_export_open))
        }
        state.linkError?.let { AuthMessage(stringResource(it)) }

        HorizontalDivider()

        DeleteAccountSection(state, onPasswordChange, onConfirmChange, onDelete)
    }
}

@Composable
private fun SectionTitle(
    @StringRes title: Int,
) {
    Text(
        text = stringResource(title),
        style = MaterialTheme.typography.titleMedium,
        modifier = Modifier.semantics { heading() },
    )
}

/** GLB-013 : suppression immédiate et définitive, avec mot de passe et confirmation explicite. */
@Composable
private fun DeleteAccountSection(
    state: AccountUiState,
    onPasswordChange: (String) -> Unit,
    onConfirmChange: (Boolean) -> Unit,
    onDelete: () -> Unit,
) {
    SectionTitle(R.string.account_delete_title)
    val retentionDays = integerResource(R.integer.legal_backup_retention_days)
    Text(
        pluralStringResource(R.plurals.account_delete_description, retentionDays, retentionDays),
        style = MaterialTheme.typography.bodyMedium,
    )
    val focusManager = LocalFocusManager.current
    AuthTextField(
        value = state.password,
        onValueChange = onPasswordChange,
        label = R.string.account_delete_password,
        error = state.passwordError,
        contentType = ContentType.Password,
        keyboardType = KeyboardType.Password,
        imeAction = ImeAction.Done,
        // « Terminé » ferme le clavier : la suppression se confirme encore avec la case.
        onImeAction = { focusManager.clearFocus() },
        isPassword = true,
        enabled = !state.isDeleting,
    )
    ConfirmCheckbox(state, onConfirmChange)
    state.errorMessage?.let { AuthMessage(stringResource(it)) }
    AuthSubmitButton(
        label = R.string.account_delete_submit,
        isSubmitting = state.isDeleting,
        onClick = onDelete,
        colors =
            ButtonDefaults.buttonColors(
                containerColor = MaterialTheme.colorScheme.error,
                contentColor = MaterialTheme.colorScheme.onError,
            ),
    )
}

@Composable
private fun ConfirmCheckbox(
    state: AccountUiState,
    onConfirmChange: (Boolean) -> Unit,
) {
    val errorText = state.confirmError?.let { stringResource(it) }
    Column(verticalArrangement = Arrangement.spacedBy(Spacing.small)) {
        // Toute la ligne est cliquable, et TalkBack l'annonce comme une case à cocher.
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(Spacing.small),
            modifier =
                Modifier
                    .fillMaxWidth()
                    // La case n'a pas de zone de clic à elle : la ligne garde les 48 dp d'une cible tactile.
                    .minimumInteractiveComponentSize()
                    .toggleable(
                        value = state.confirmed,
                        enabled = !state.isDeleting,
                        role = Role.Checkbox,
                        onValueChange = onConfirmChange,
                    ).semantics { if (errorText != null) error(errorText) },
        ) {
            Checkbox(checked = state.confirmed, onCheckedChange = null, enabled = !state.isDeleting)
            Text(stringResource(R.string.account_delete_confirm), style = MaterialTheme.typography.bodyMedium)
        }
        errorText?.let { AuthMessage(it) }
    }
}

@Preview(showBackground = true)
@Composable
private fun AccountScreenPreview() {
    AppTheme {
        AccountScreen(AccountUiState(), {}, {}, {}, {}, {}, {}, {})
    }
}

@Preview(showBackground = true, fontScale = 1.5f)
@Composable
private fun AccountScreenErrorPreview() {
    AppTheme {
        AccountScreen(
            AccountUiState(
                password = "wrong-password",
                confirmed = true,
                errorMessage = R.string.account_delete_wrong_password,
            ),
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
