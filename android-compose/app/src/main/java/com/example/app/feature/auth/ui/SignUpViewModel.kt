package com.example.app.feature.auth.ui

import androidx.annotation.StringRes
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.app.feature.auth.data.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class SignUpUiState(
    val name: String = "",
    val email: String = "",
    val password: String = "",
    @StringRes val nameError: Int? = null,
    @StringRes val emailError: Int? = null,
    @StringRes val passwordError: Int? = null,
    val isSubmitting: Boolean = false,
    @StringRes val errorMessage: Int? = null,
    /** Adresse à laquelle l'e-mail de vérification a été envoyé. */
    val sentTo: String? = null,
)

@HiltViewModel
class SignUpViewModel
    @Inject
    constructor(
        private val repository: AuthRepository,
    ) : ViewModel() {
        private val _uiState = MutableStateFlow(SignUpUiState())
        val uiState: StateFlow<SignUpUiState> = _uiState.asStateFlow()

        fun onNameChange(name: String) {
            _uiState.update { it.copy(name = name, nameError = null, errorMessage = null) }
        }

        fun onEmailChange(email: String) {
            _uiState.update { it.copy(email = email, emailError = null, errorMessage = null) }
        }

        fun onPasswordChange(password: String) {
            _uiState.update { it.copy(password = password, passwordError = null, errorMessage = null) }
        }

        fun onSubmit() {
            val state = _uiState.value
            if (state.isSubmitting) return
            val name = state.name.trim()
            val email = normalizeEmail(state.email)
            val errors = Triple(nameError(name), emailError(email), newPasswordError(state.password))
            if (errors.toList().any { it != null }) {
                _uiState.update { it.copy(nameError = errors.first, emailError = errors.second, passwordError = errors.third) }
                return
            }
            _uiState.update { it.copy(isSubmitting = true, errorMessage = null) }
            viewModelScope.launch {
                repository
                    .signUp(name, email, state.password)
                    .onSuccess { _uiState.update { it.copy(isSubmitting = false, password = "", sentTo = email) } }
                    .onFailure { error -> _uiState.update { it.copy(isSubmitting = false, errorMessage = error.toMessage()) } }
            }
        }
    }
