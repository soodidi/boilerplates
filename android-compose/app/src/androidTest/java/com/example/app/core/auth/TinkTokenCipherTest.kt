package com.example.app.core.auth

import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Test

/** Sur appareil : la clé maîtresse vit dans l'Android Keystore, absent des tests JVM. */
class TinkTokenCipherTest {
    private val cipher = TinkTokenCipher(InstrumentationRegistry.getInstrumentation().targetContext)

    @Test
    fun encryptsAndDecryptsTheToken() {
        val encrypted = cipher.encrypt("token.signature")

        assertFalse(encrypted.contains("token"))
        assertEquals("token.signature", cipher.decrypt(encrypted))
    }

    @Test
    fun usesAFreshNonceEachTime() {
        assertNotEquals(cipher.encrypt("token"), cipher.encrypt("token"))
    }
}
