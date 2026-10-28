package com.example.app.feature.auth.ui

import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.autofill.ContentType
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.tooling.preview.Preview
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.app.R
import com.example.app.core.designsystem.AppTheme

@Composable
fun ForgotPasswordRoute(
    onBackToSignIn: () -> Unit,
    viewModel: ForgotPasswordViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    ForgotPasswordScreen(
        state = state,
        onEmailChange = viewModel::onEmailChange,
        onSubmit = viewModel::onSubmit,
        onBackToSignIn = onBackToSignIn,
    )
}

@Composable
fun ForgotPasswordScreen(
    state: ForgotPasswordUiState,
    onEmailChange: (String) -> Unit,
    onSubmit: () -> Unit,
    onBackToSignIn: () -> Unit,
    modifier: Modifier = Modifier,
) {
    AuthScaffold(title = R.string.auth_forgot_password_title, modifier = modifier) {
        if (state.sentTo != null) {
            AuthMessage(stringResource(R.string.auth_forgot_password_sent, state.sentTo), isError = false)
        } else {
            Text(stringResource(R.string.auth_forgot_password_intro))
            AuthTextField(
                value = state.email,
                onValueChange = onEmailChange,
                label = R.string.auth_email_label,
                error = state.emailError,
                contentType = ContentType.EmailAddress,
                keyboardType = KeyboardType.Email,
                imeAction = ImeAction.Done,
                onImeAction = onSubmit,
            )
            state.errorMessage?.let { AuthMessage(stringResource(it)) }
            AuthSubmitButton(label = R.string.auth_forgot_password_submit, isSubmitting = state.isSubmitting, onClick = onSubmit)
        }
        TextButton(onClick = onBackToSignIn) { Text(stringResource(R.string.auth_back_to_sign_in)) }
    }
}

@Preview(showBackground = true)
@Composable
private fun ForgotPasswordScreenPreview() {
    AppTheme {
        ForgotPasswordScreen(ForgotPasswordUiState(), {}, {}, {})
    }
}

@Preview(showBackground = true, fontScale = 1.5f)
@Composable
private fun ForgotPasswordScreenSentPreview() {
    AppTheme {
        ForgotPasswordScreen(ForgotPasswordUiState(sentTo = "ada@example.com"), {}, {}, {})
    }
}
