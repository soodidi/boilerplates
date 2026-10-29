package com.example.app.core.designsystem

import com.example.app.R
import com.example.app.core.network.ErrorKind
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/** BE-010 : ce que montre chaque erreur, vérifié en JVM (les tests d'écran demandent un émulateur). */
class ErrorContentTest {
    @Test
    fun offersARetryForAFailureThatMayPass() {
        assertEquals(
            ErrorContent(R.string.error_network_title, R.string.error_network_description, ErrorAction.Retry),
            errorContent(ErrorKind.Network, canGoBack = true),
        )
        assertEquals(
            ErrorContent(R.string.error_title, R.string.error_description, ErrorAction.Retry),
            errorContent(ErrorKind.Server),
        )
    }

    @Test
    fun offersToGoBackFromARefusalOrAMissingResource() {
        assertEquals(
            ErrorContent(R.string.error_forbidden_title, R.string.error_forbidden_description, ErrorAction.Back),
            errorContent(ErrorKind.Forbidden, canGoBack = true),
        )
        assertEquals(
            ErrorContent(R.string.note_not_found_title, R.string.note_not_found_description, ErrorAction.Back),
            errorContent(
                ErrorKind.NotFound,
                notFoundTitle = R.string.note_not_found_title,
                notFoundDescription = R.string.note_not_found_description,
                canGoBack = true,
            ),
        )
        // Réessayer ne changerait rien : sans retour possible, pas de bouton.
        assertEquals(ErrorAction.None, errorContent(ErrorKind.Forbidden)?.action)
    }

    @Test
    fun showsNothingForAnExpiredSession() {
        assertNull(errorContent(ErrorKind.Unauthorized))
    }
}
