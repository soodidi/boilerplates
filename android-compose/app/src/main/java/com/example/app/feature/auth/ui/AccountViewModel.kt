package com.example.app.feature.auth.ui

import androidx.annotation.StringRes
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.app.R
import com.example.app.feature.auth.data.AuthRepository
import com.example.app.feature.auth.data.DefaultAuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import okhttp3.HttpUrl
import javax.inject.Inject
import javax.inject.Named

data class AccountUiState(
    val password: String = "",
    @StringRes val passwordError: Int? = null,
    val confirmed: Boolean = false,
    @StringRes val confirmError: Int? = null,
    val isDeleting: Boolean = false,
    @StringRes val errorMessage: Int? = null,
    /** Événement ponctuel : l'écran le transmet à la navigation, qui oublie la session. */
    val isDeleted: Boolean = false,
)

/**
 * GLB-013 : « Mon compte ». La suppression se fait ici, avec le mot de passe et une confirmation
 * explicite ; l'export et la politique de confidentialité s'ouvrent sur le web.
 */
@HiltViewModel
class AccountViewModel
    @Inject
    constructor(
        private val repository: AuthRepository,
        @Named(DefaultAuthRepository.WEB_BASE_URL) webBaseUrl: HttpUrl,
    ) : ViewModel() {
        val privacyPolicyUrl: String = webBaseUrl.resolve("legal/privacy").toString()

        /** L'export se télécharge depuis la page « Mon compte » du web (GLB-013 le permet aux apps mobiles). */
        val exportUrl: String = webBaseUrl.resolve("account").toString()

        private val _uiState = MutableStateFlow(AccountUiState())
        val uiState: StateFlow<AccountUiState> = _uiState.asStateFlow()

        fun onPasswordChange(password: String) {
            _uiState.update { it.copy(password = password, passwordError = null, errorMessage = null) }
        }

        fun onConfirmChange(confirmed: Boolean) {
            _uiState.update { it.copy(confirmed = confirmed, confirmError = null) }
        }

        /** Aucun navigateur n'a pu ouvrir le lien. */
        fun onLinkUnavailable() {
            _uiState.update { it.copy(errorMessage = R.string.account_link_unavailable) }
        }

        fun onDelete() {
            val state = _uiState.value
            if (state.isDeleting || state.isDeleted) return
            val passwordError = if (state.password.isEmpty()) R.string.validation_required else null
            val confirmError = if (state.confirmed) null else R.string.account_delete_confirm_required
            if (passwordError != null || confirmError != null) {
                _uiState.update { it.copy(passwordError = passwordError, confirmError = confirmError) }
                return
            }
            _uiState.update { it.copy(isDeleting = true, errorMessage = null) }
            viewModelScope.launch {
                val result = repository.deleteAccount(state.password)
                _uiState.update {
                    it.copy(
                        isDeleting = false,
                        isDeleted = result.isSuccess,
                        // Le mot de passe ne reste pas en mémoire plus que nécessaire.
                        password = if (result.isSuccess) "" else it.password,
                        errorMessage = result.exceptionOrNull()?.toMessage(),
                    )
                }
            }
        }
    }
