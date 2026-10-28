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
fun SignUpRoute(
    onBackToSignIn: () -> Unit,
    viewModel: SignUpViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    SignUpScreen(
        state = state,
        onNameChange = viewModel::onNameChange,
        onEmailChange = viewModel::onEmailChange,
        onPasswordChange = viewModel::onPasswordChange,
        onSubmit = viewModel::onSubmit,
        onBackToSignIn = onBackToSignIn,
    )
}

@Composable
fun SignUpScreen(
    state: SignUpUiState,
    onNameChange: (String) -> Unit,
    onEmailChange: (String) -> Unit,
    onPasswordChange: (String) -> Unit,
    onSubmit: () -> Unit,
    onBackToSignIn: () -> Unit,
    modifier: Modifier = Modifier,
) {
    AuthScaffold(title = R.string.auth_sign_up_title, modifier = modifier) {
        if (state.sentTo != null) {
            AuthMessage(stringResource(R.string.auth_sign_up_sent, state.sentTo), isError = false)
        } else {
            AuthTextField(
                value = state.name,
                onValueChange = onNameChange,
                label = R.string.auth_name_label,
                error = state.nameError,
                contentType = ContentType.PersonFullName,
                keyboardType = KeyboardType.Text,
            )
            AuthTextField(
                value = state.email,
                onValueChange = onEmailChange,
                label = R.string.auth_email_label,
                error = state.emailError,
                contentType = ContentType.EmailAddress,
                keyboardType = KeyboardType.Email,
            )
            AuthTextField(
                value = state.password,
                onValueChange = onPasswordChange,
                label = R.string.auth_password_label,
                error = state.passwordError,
                contentType = ContentType.NewPassword,
                keyboardType = KeyboardType.Password,
                imeAction = ImeAction.Done,
                onImeAction = onSubmit,
                isPassword = true,
            )
            state.errorMessage?.let { AuthMessage(stringResource(it)) }
            AuthSubmitButton(label = R.string.auth_sign_up_submit, isSubmitting = state.isSubmitting, onClick = onSubmit)
        }
        TextButton(onClick = onBackToSignIn) { Text(stringResource(R.string.auth_back_to_sign_in)) }
    }
}

@Preview(showBackground = true)
@Composable
private fun SignUpScreenPreview() {
    AppTheme {
        SignUpScreen(SignUpUiState(passwordError = R.string.auth_password_too_short), {}, {}, {}, {}, {})
    }
}

@Preview(showBackground = true, fontScale = 1.5f)
@Composable
private fun SignUpScreenSentPreview() {
    AppTheme {
        SignUpScreen(SignUpUiState(sentTo = "ada@example.com"), {}, {}, {}, {}, {})
    }
}
