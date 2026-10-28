package com.example.app.navigation

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.app.core.auth.SessionState
import com.example.app.core.auth.SessionStore
import com.example.app.feature.auth.data.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

/** Relie la session aux écrans : la navigation suit son état, la déconnexion part d'ici (AND-003). */
@HiltViewModel
class SessionViewModel
    @Inject
    constructor(
        sessionStore: SessionStore,
        private val authRepository: AuthRepository,
    ) : ViewModel() {
        val session: StateFlow<SessionState> = sessionStore.state

        fun signOut() {
            viewModelScope.launch { authRepository.signOut() }
        }
    }
