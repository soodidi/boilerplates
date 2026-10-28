package com.example.app.feature.auth.ui

import androidx.annotation.StringRes
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonColors
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.autofill.ContentType
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.contentType
import androidx.compose.ui.semantics.error
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.example.app.R
import com.example.app.core.designsystem.AppTheme
import com.example.app.core.designsystem.Spacing

/** Mise en page commune aux écrans d'auth : titre, formulaire défilant, clavier pris en compte. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun AuthScaffold(
    @StringRes title: Int,
    modifier: Modifier = Modifier,
    navigationIcon: @Composable () -> Unit = {},
    content: @Composable ColumnScope.() -> Unit,
) {
    Scaffold(
        modifier = modifier,
        topBar = { TopAppBar(title = { Text(stringResource(title)) }, navigationIcon = navigationIcon) },
    ) { padding ->
        Column(
            modifier =
                Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .imePadding()
                    .verticalScroll(rememberScrollState())
                    .padding(Spacing.medium),
            verticalArrangement = Arrangement.spacedBy(Spacing.medium),
            content = content,
        )
    }
}

/** Champ de saisie avec erreur lisible par TalkBack et type de contenu pour le remplissage automatique. */
@Composable
internal fun AuthTextField(
    value: String,
    onValueChange: (String) -> Unit,
    @StringRes label: Int,
    @StringRes error: Int?,
    contentType: ContentType,
    keyboardType: KeyboardType,
    modifier: Modifier = Modifier,
    imeAction: ImeAction = ImeAction.Next,
    onImeAction: () -> Unit = {},
    isPassword: Boolean = false,
    enabled: Boolean = true,
) {
    val errorText = error?.let { stringResource(it) }
    var passwordVisible by rememberSaveable { mutableStateOf(false) }
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(stringResource(label)) },
        enabled = enabled,
        isError = errorText != null,
        supportingText = errorText?.let { { Text(it) } },
        singleLine = true,
        visualTransformation =
            if (isPassword && !passwordVisible) PasswordVisualTransformation() else VisualTransformation.None,
        trailingIcon =
            if (isPassword) {
                {
                    TextButton(onClick = { passwordVisible = !passwordVisible }) {
                        Text(stringResource(if (passwordVisible) R.string.auth_password_hide else R.string.auth_password_show))
                    }
                }
            } else {
                null
            },
        keyboardOptions = KeyboardOptions(keyboardType = keyboardType, imeAction = imeAction, autoCorrectEnabled = false),
        keyboardActions = KeyboardActions(onAny = { onImeAction() }),
        modifier =
            modifier
                .fillMaxWidth()
                .semantics {
                    this.contentType = contentType
                    if (errorText != null) error(errorText)
                },
    )
}

@Composable
internal fun AuthSubmitButton(
    @StringRes label: Int,
    isSubmitting: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    colors: ButtonColors = ButtonDefaults.buttonColors(),
) {
    val text = stringResource(label)
    // TalkBack lit le libellé même pendant l'envoi, quand le bouton n'affiche qu'un indicateur.
    Button(
        onClick = onClick,
        enabled = !isSubmitting,
        colors = colors,
        modifier = modifier.fillMaxWidth().semantics(mergeDescendants = true) { contentDescription = text },
    ) {
        if (isSubmitting) {
            // Taille d'une icône de bouton : le bouton ne change pas de hauteur pendant l'envoi.
            CircularProgressIndicator(
                modifier = Modifier.size(ButtonDefaults.IconSize),
                color = LocalContentColor.current,
                strokeWidth = 2.dp,
            )
        } else {
            Text(text)
        }
    }
}

/** Message d'échec ou de confirmation, annoncé par TalkBack dès qu'il apparaît. */
@Composable
internal fun AuthMessage(
    text: String,
    modifier: Modifier = Modifier,
    isError: Boolean = true,
) {
    Text(
        text = text,
        color = if (isError) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface,
        modifier = modifier.semantics { liveRegion = LiveRegionMode.Polite },
    )
}

@Preview(showBackground = true)
@Composable
private fun AuthTextFieldPreview() {
    AppTheme {
        AuthTextField(
            value = "",
            onValueChange = {},
            label = R.string.auth_password_label,
            error = R.string.auth_password_too_short,
            contentType = ContentType.Password,
            keyboardType = KeyboardType.Password,
            isPassword = true,
        )
    }
}
