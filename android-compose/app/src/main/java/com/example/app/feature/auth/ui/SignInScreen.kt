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
fun SignInRoute(
    onSignUp: () -> Unit,
    onForgotPassword: () -> Unit,
    viewModel: SignInViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    SignInScreen(
        state = state,
        onEmailChange = viewModel::onEmailChange,
        onPasswordChange = viewModel::onPasswordChange,
        onSubmit = viewModel::onSubmit,
        onSignUp = onSignUp,
        onForgotPassword = onForgotPassword,
    )
}

@Composable
fun SignInScreen(
    state: SignInUiState,
    onEmailChange: (String) -> Unit,
    onPasswordChange: (String) -> Unit,
    onSubmit: () -> Unit,
    onSignUp: () -> Unit,
    onForgotPassword: () -> Unit,
    modifier: Modifier = Modifier,
) {
    AuthScaffold(title = R.string.auth_sign_in_title, modifier = modifier) {
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
            contentType = ContentType.Password,
            keyboardType = KeyboardType.Password,
            imeAction = ImeAction.Done,
            onImeAction = onSubmit,
            isPassword = true,
        )
        state.errorMessage?.let { AuthMessage(stringResource(it)) }
        AuthSubmitButton(label = R.string.auth_sign_in_submit, isSubmitting = state.isSubmitting, onClick = onSubmit)
        TextButton(onClick = onForgotPassword) { Text(stringResource(R.string.auth_forgot_password_link)) }
        TextButton(onClick = onSignUp) { Text(stringResource(R.string.auth_sign_up_link)) }
    }
}

@Preview(showBackground = true)
@Composable
private fun SignInScreenPreview() {
    AppTheme {
        SignInScreen(SignInUiState(email = "ada@example.com"), {}, {}, {}, {}, {})
    }
}

@Preview(showBackground = true, fontScale = 1.5f)
@Composable
private fun SignInScreenErrorPreview() {
    AppTheme {
        SignInScreen(
            SignInUiState(email = "ada@example.com", errorMessage = R.string.auth_error_invalid_credentials),
            {},
            {},
            {},
            {},
            {},
        )
    }
}
