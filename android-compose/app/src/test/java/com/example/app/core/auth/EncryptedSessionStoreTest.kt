package com.example.app.core.auth

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.PreferenceDataStoreFactory
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import java.io.File

/** Chiffrement réversible et reconnaissable, qui échoue sur une valeur qu'il n'a pas produite. */
private class FakeCipher : TokenCipher {
    override fun encrypt(plaintext: String) = "enc:" + plaintext.reversed()

    override fun decrypt(ciphertext: String): String {
        require(ciphertext.startsWith("enc:")) { "undecryptable" }
        return ciphertext.removePrefix("enc:").reversed()
    }
}

class EncryptedSessionStoreTest {
    @get:Rule
    val folder = TemporaryFolder()

    private lateinit var file: File

    // DataStore fait de vraies entrées-sorties : temps réel, pas le temps virtuel de runTest.
    private lateinit var dataStoreScope: CoroutineScope
    private lateinit var storeScope: CoroutineScope
    private lateinit var dataStore: DataStore<Preferences>
    private val key = stringPreferencesKey("session_token")

    @Before
    fun setUp() {
        file = File(folder.root, "secure.preferences_pb")
        dataStoreScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
        storeScope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
        dataStore = PreferenceDataStoreFactory.create(scope = dataStoreScope, produceFile = { file })
    }

    @After
    fun tearDown() {
        storeScope.cancel()
        dataStoreScope.cancel()
    }

    private fun newStore() = EncryptedSessionStore(dataStore, FakeCipher(), storeScope, Dispatchers.IO)

    private suspend fun SessionStore.loaded(): SessionState = withTimeout(5_000) { state.first { it != SessionState.Loading } }

    private suspend fun stored(): String? = dataStore.data.first()[key]

    @Test
    fun startsSignedOutWithoutStoredToken() =
        runBlocking<Unit> {
            val store = newStore()

            assertEquals(SessionState.SignedOut, store.loaded())
            assertNull(store.currentToken())
        }

    @Test
    fun restoresTheStoredSessionAtStartup() =
        runBlocking<Unit> {
            dataStore.edit { it[key] = FakeCipher().encrypt("token-1") }

            val store = newStore()

            assertEquals(SessionState.SignedIn, store.loaded())
            assertEquals("token-1", store.currentToken())
        }

    @Test
    fun dropsATokenThatCannotBeDecrypted() =
        runBlocking<Unit> {
            // Cas d'une clé du Keystore perdue : le fichier existe mais n'est plus lisible.
            dataStore.edit { it[key] = "garbage" }

            val store = newStore()

            assertEquals(SessionState.SignedOut, store.loaded())
            withTimeout(5_000) { dataStore.data.first { it[key] == null } }
        }

    @Test
    fun savesTheTokenEncryptedOnly() =
        runBlocking<Unit> {
            val store = newStore()
            store.loaded()

            store.save("secret-token")

            assertEquals(SessionState.SignedIn, store.state.value)
            assertEquals("secret-token", store.currentToken())
            assertEquals(FakeCipher().encrypt("secret-token"), stored())
            assertFalse(file.readText(Charsets.ISO_8859_1).contains("secret-token"))
        }

    @Test
    fun clearForgetsTheToken() =
        runBlocking<Unit> {
            val store = newStore()
            store.loaded()
            store.save("token-1")

            store.clear()

            assertEquals(SessionState.SignedOut, store.state.value)
            assertNull(store.currentToken())
            assertNull(stored())
        }

    @Test
    fun unauthorizedClearsTheCurrentToken() =
        runBlocking<Unit> {
            val store = newStore()
            store.loaded()
            store.save("token-1")

            store.onUnauthorized("token-1")

            assertEquals(SessionState.SignedOut, store.state.value)
            withTimeout(5_000) { dataStore.data.first { it[key] == null } }
        }

    @Test
    fun unauthorizedWithAnOlderTokenKeepsTheNewSession() =
        runBlocking<Unit> {
            val store = newStore()
            store.loaded()
            store.save("token-2")

            store.onUnauthorized("token-1")

            assertEquals(SessionState.SignedIn, store.state.value)
            assertEquals("token-2", store.currentToken())
            assertTrue(stored() != null)
        }
}
