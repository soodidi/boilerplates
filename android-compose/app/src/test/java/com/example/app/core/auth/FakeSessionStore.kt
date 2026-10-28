package com.example.app.core.auth

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

/** Session en mémoire, pour tester ce qui l'utilise sans DataStore ni Keystore. */
class FakeSessionStore(
    initialToken: String? = null,
) : SessionStore {
    var token: String? = initialToken
        private set
    val unauthorizedTokens = mutableListOf<String>()

    private val _state = MutableStateFlow(stateOf(initialToken))
    override val state: StateFlow<SessionState> = _state

    override fun currentToken(): String? = token

    override suspend fun save(token: String) = set(token)

    override suspend fun clear() = set(null)

    override fun onUnauthorized(token: String) {
        unauthorizedTokens += token
        if (this.token == token) set(null)
    }

    private fun set(value: String?) {
        token = value
        _state.value = stateOf(value)
    }

    private fun stateOf(token: String?) = if (token == null) SessionState.SignedOut else SessionState.SignedIn
}
