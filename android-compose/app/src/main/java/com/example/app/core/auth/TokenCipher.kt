package com.example.app.core.auth

import android.content.Context
import com.google.crypto.tink.Aead
import com.google.crypto.tink.KeyTemplates
import com.google.crypto.tink.RegistryConfiguration
import com.google.crypto.tink.aead.AeadConfig
import com.google.crypto.tink.integration.android.AndroidKeysetManager
import dagger.hilt.android.qualifiers.ApplicationContext
import java.util.Base64
import javax.inject.Inject
import javax.inject.Singleton

/** Chiffre le token de session avant son stockage (AND-004). Une interface, pour tester sans Keystore. */
interface TokenCipher {
    /** Lève une exception si le chiffrement est impossible : rien ne doit alors être écrit. */
    fun encrypt(plaintext: String): String

    fun decrypt(ciphertext: String): String
}

/**
 * AES-256-GCM avec Tink. Le keyset est lui-même chiffré par une clé de l'Android Keystore, qui ne
 * quitte jamais l'appareil : un fichier copié ailleurs (sauvegarde, transfert) est illisible.
 */
@Singleton
class TinkTokenCipher
    @Inject
    constructor(
        @ApplicationContext private val context: Context,
    ) : TokenCipher {
        // Accès au Keystore lent : fait une seule fois, hors du fil principal (premier appel en IO).
        private val aead: Aead by lazy {
            AeadConfig.register()
            val manager =
                AndroidKeysetManager
                    .Builder()
                    .withSharedPref(context, KEYSET_NAME, KEYSET_PREFS_FILE)
                    .withKeyTemplate(KeyTemplates.get("AES256_GCM"))
                    .withMasterKeyUri(MASTER_KEY_URI)
                    .build()
            // Keystore défaillant : Tink écrit alors le keyset en clair, sans erreur. On le supprime
            // et on refuse de chiffrer : le token reste en mémoire, jamais sur disque.
            if (!manager.isUsingKeystore) {
                context.deleteSharedPreferences(KEYSET_PREFS_FILE)
                throw IllegalStateException("Android Keystore unavailable")
            }
            manager.keysetHandle.getPrimitive(RegistryConfiguration.get(), Aead::class.java)
        }

        override fun encrypt(plaintext: String): String =
            Base64.getEncoder().encodeToString(aead.encrypt(plaintext.toByteArray(), ASSOCIATED_DATA))

        override fun decrypt(ciphertext: String): String = String(aead.decrypt(Base64.getDecoder().decode(ciphertext), ASSOCIATED_DATA))

        private companion object {
            const val KEYSET_NAME = "session_keyset"

            // Exclu des sauvegardes (res/xml/backup_rules.xml, data_extraction_rules.xml).
            const val KEYSET_PREFS_FILE = "secure_keyset"
            const val MASTER_KEY_URI = "android-keystore://session_master_key"
            val ASSOCIATED_DATA = "session_token".toByteArray()
        }
    }
