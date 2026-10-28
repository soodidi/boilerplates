package com.example.app.core.auth

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import com.example.app.core.di.ApplicationScope
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Qualifier
import javax.inject.Singleton
import kotlin.coroutines.cancellation.CancellationException

/** État de la session, sans le token : l'UI n'a jamais besoin de le connaître. */
sealed interface SessionState {
    /** Lecture du stockage en cours, au démarrage de l'app. */
    data object Loading : SessionState

    data object SignedOut : SessionState

    data object SignedIn : SessionState
}

/**
 * BE-006 / AND-004 : token de session opaque, signé par l'API, sans refresh token.
 * Il est perdu à la déconnexion ou au premier `401`, et l'utilisateur se reconnecte.
 */
interface SessionStore {
    val state: StateFlow<SessionState>

    /** Lu par l'intercepteur OkHttp, sur ses propres fils. */
    fun currentToken(): String?

    suspend fun save(token: String)

    suspend fun clear()

    /** L'API a refusé ce token : la session est révoquée ou expirée côté serveur. */
    fun onUnauthorized(token: String)
}

/** DataStore `secure` : exclu des sauvegardes et des transferts d'appareil (res/xml). */
@Qualifier
@Retention(AnnotationRetention.BINARY)
annotation class SecureDataStore

@Qualifier
@Retention(AnnotationRetention.BINARY)
annotation class IoDispatcher

/** Le token vit en mémoire ; DataStore n'en garde qu'une copie chiffrée (Tink + Keystore). */
@Singleton
class EncryptedSessionStore
    @Inject
    constructor(
        @SecureDataStore private val dataStore: DataStore<Preferences>,
        private val cipher: TokenCipher,
        @ApplicationScope private val scope: CoroutineScope,
        @IoDispatcher private val ioDispatcher: CoroutineDispatcher,
    ) : SessionStore {
        private val lock = Any()
        private var token: String? = null
        private val _state = MutableStateFlow<SessionState>(SessionState.Loading)
        override val state: StateFlow<SessionState> = _state.asStateFlow()

        private val writeMutex = Mutex()

        init {
            scope.launch {
                val stored = readStoredToken()
                synchronized(lock) { if (_state.value == SessionState.Loading) set(stored) }
                // Valeur absente ou illisible (clé du Keystore perdue) : on repart d'un stockage propre.
                if (stored == null) persist()
            }
        }

        override fun currentToken(): String? = synchronized(lock) { token }

        override suspend fun save(token: String) {
            synchronized(lock) { set(token) }
            persist()
        }

        override suspend fun clear() {
            synchronized(lock) { set(null) }
            persist()
        }

        override fun onUnauthorized(token: String) {
            // Un 401 d'une requête partie avec un ancien token ne déconnecte pas la session suivante.
            val cleared = synchronized(lock) { (this.token == token).also { if (it) set(null) } }
            if (cleared) scope.launch { persist() }
        }

        private fun set(value: String?) {
            token = value
            _state.value = if (value == null) SessionState.SignedOut else SessionState.SignedIn
        }

        private suspend fun readStoredToken(): String? =
            try {
                withContext(ioDispatcher) { dataStore.data.first()[TOKEN_KEY]?.let(cipher::decrypt) }
            } catch (exception: CancellationException) {
                throw exception
            } catch (_: Exception) {
                null
            }

        /** Écrit la valeur courante : quel que soit l'ordre des appels, la dernière écriture est juste. */
        private suspend fun persist() =
            writeMutex.withLock {
                val value = currentToken()
                val encrypted = value?.let { withContext(ioDispatcher) { cipher.encrypt(it) } }
                dataStore.edit { preferences ->
                    if (encrypted == null) preferences.remove(TOKEN_KEY) else preferences[TOKEN_KEY] = encrypted
                }
            }

        private companion object {
            val TOKEN_KEY = stringPreferencesKey("session_token")
        }
    }
