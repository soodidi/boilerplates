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

data class ForgotPasswordUiState(
    val email: String = "",
    @StringRes val emailError: Int? = null,
    val isSubmitting: Boolean = false,
    @StringRes val errorMessage: Int? = null,
    /** Adresse à laquelle le lien a été envoyé, si elle correspond à un compte. */
    val sentTo: String? = null,
)

/** Le nouveau mot de passe se choisit sur le front web, ouvert par le lien de l'e-mail. */
@HiltViewModel
class ForgotPasswordViewModel
    @Inject
    constructor(
        private val repository: AuthRepository,
    ) : ViewModel() {
        private val _uiState = MutableStateFlow(ForgotPasswordUiState())
        val uiState: StateFlow<ForgotPasswordUiState> = _uiState.asStateFlow()

        fun onEmailChange(email: String) {
            _uiState.update { it.copy(email = email, emailError = null, errorMessage = null) }
        }

        fun onSubmit() {
            val state = _uiState.value
            if (state.isSubmitting) return
            val email = normalizeEmail(state.email)
            val emailError = emailError(email)
            if (emailError != null) {
                _uiState.update { it.copy(emailError = emailError) }
                return
            }
            _uiState.update { it.copy(isSubmitting = true, errorMessage = null) }
            viewModelScope.launch {
                repository
                    .requestPasswordReset(email)
                    .onSuccess { _uiState.update { it.copy(isSubmitting = false, sentTo = email) } }
                    .onFailure { error -> _uiState.update { it.copy(isSubmitting = false, errorMessage = error.toMessage()) } }
            }
        }
    }
