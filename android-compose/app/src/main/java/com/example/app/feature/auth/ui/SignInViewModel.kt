package com.example.app.feature.auth.ui

import androidx.annotation.StringRes
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.app.R
import com.example.app.feature.auth.data.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class SignInUiState(
    val email: String = "",
    val password: String = "",
    @StringRes val emailError: Int? = null,
    @StringRes val passwordError: Int? = null,
    val isSubmitting: Boolean = false,
    @StringRes val errorMessage: Int? = null,
)

/** Une connexion réussie enregistre la session : la navigation suit, le ViewModel n'a rien à émettre. */
@HiltViewModel
class SignInViewModel
    @Inject
    constructor(
        private val repository: AuthRepository,
    ) : ViewModel() {
        private val _uiState = MutableStateFlow(SignInUiState())
        val uiState: StateFlow<SignInUiState> = _uiState.asStateFlow()

        fun onEmailChange(email: String) {
            _uiState.update { it.copy(email = email, emailError = null, errorMessage = null) }
        }

        fun onPasswordChange(password: String) {
            _uiState.update { it.copy(password = password, passwordError = null, errorMessage = null) }
        }

        fun onSubmit() {
            val state = _uiState.value
            if (state.isSubmitting) return
            val emailError = emailError(state.email.trim())
            val passwordError = if (state.password.isEmpty()) R.string.validation_required else null
            if (emailError != null || passwordError != null) {
                _uiState.update { it.copy(emailError = emailError, passwordError = passwordError) }
                return
            }
            _uiState.update { it.copy(isSubmitting = true, errorMessage = null) }
            viewModelScope.launch {
                val result = repository.signIn(normalizeEmail(state.email), state.password)
                _uiState.update {
                    it.copy(
                        isSubmitting = false,
                        // Le mot de passe ne reste pas en mémoire plus que nécessaire.
                        password = if (result.isSuccess) "" else it.password,
                        errorMessage = result.exceptionOrNull()?.toMessage(),
                    )
                }
            }
        }
    }
