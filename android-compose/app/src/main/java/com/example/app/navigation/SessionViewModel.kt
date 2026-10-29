package com.example.app.navigation

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.app.core.auth.SessionState
import com.example.app.core.auth.SessionStore
import com.example.app.feature.auth.data.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.NonCancellable
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import javax.inject.Inject

/** Relie la session aux écrans : la navigation suit son état, la déconnexion part d'ici (AND-003). */
@HiltViewModel
class SessionViewModel
    @Inject
    constructor(
        private val sessionStore: SessionStore,
        private val authRepository: AuthRepository,
    ) : ViewModel() {
        val session: StateFlow<SessionState> = sessionStore.state

        private val _accountDeleted = MutableStateFlow(false)

        /** Vrai après la suppression du compte : l'écran de connexion le confirme, jusqu'à la session suivante. */
        val accountDeleted: StateFlow<Boolean> = _accountDeleted.asStateFlow()

        private var signOutJob: Job? = null

        init {
            viewModelScope.launch {
                session.collect { if (it == SessionState.SignedIn) _accountDeleted.value = false }
            }
        }

        /** Un second appui pendant la déconnexion est ignoré. */
        fun signOut() {
            if (signOutJob?.isActive == true) return
            signOutJob = viewModelScope.launch { authRepository.signOut() }
        }

        /**
         * GLB-013 : l'API a supprimé le compte et révoqué sa session ; l'appareil l'oublie à son tour.
         * Le message est posé avant : la navigation vers la connexion part de l'effacement de la session.
         */
        fun onAccountDeleted() {
            _accountDeleted.value = true
            // Comme la déconnexion : l'effacement va au bout, même si l'écran se ferme entre-temps.
            viewModelScope.launch { withContext(NonCancellable) { sessionStore.clear() } }
        }
    }
