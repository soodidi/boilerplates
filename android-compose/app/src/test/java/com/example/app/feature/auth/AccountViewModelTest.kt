package com.example.app.feature.auth

import app.cash.turbine.test
import com.example.app.R
import com.example.app.feature.auth.data.AuthFailure
import com.example.app.feature.auth.ui.AccountViewModel
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import okhttp3.HttpUrl.Companion.toHttpUrl
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class AccountViewModelTest {
    private val dispatcher = StandardTestDispatcher()
    private val repository = FakeAuthRepository()

    @Before
    fun setUp() {
        Dispatchers.setMain(dispatcher)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    private fun viewModel() = AccountViewModel(repository, "https://app.example.com/".toHttpUrl())

    @Test
    fun linksPointToTheWebPages() {
        val viewModel = viewModel()

        assertEquals("https://app.example.com/legal/privacy", viewModel.privacyPolicyUrl)
        assertEquals("https://app.example.com/account", viewModel.exportUrl)
    }

    @Test
    fun deleteRequiresThePasswordAndTheConfirmation() =
        runTest(dispatcher) {
            val viewModel = viewModel()

            viewModel.onDelete()

            val state = viewModel.uiState.value
            assertEquals(R.string.validation_required, state.passwordError)
            assertEquals(R.string.account_delete_confirm_required, state.confirmError)
            assertTrue(repository.calls.isEmpty())

            viewModel.onPasswordChange("x")
            viewModel.onConfirmChange(true)
            assertNull(viewModel.uiState.value.passwordError)
            assertNull(viewModel.uiState.value.confirmError)
        }

    @Test
    fun deleteRequiresTheConfirmationEvenWithThePassword() =
        runTest(dispatcher) {
            val viewModel = viewModel()
            viewModel.onPasswordChange("correct-horse-battery")

            viewModel.onDelete()

            assertEquals(R.string.account_delete_confirm_required, viewModel.uiState.value.confirmError)
            assertNull(viewModel.uiState.value.passwordError)
            assertTrue(repository.calls.isEmpty())
        }

    @Test
    fun deleteRequiresThePasswordEvenWithTheConfirmation() =
        runTest(dispatcher) {
            val viewModel = viewModel()
            viewModel.onConfirmChange(true)

            viewModel.onDelete()

            assertEquals(R.string.validation_required, viewModel.uiState.value.passwordError)
            assertNull(viewModel.uiState.value.confirmError)
            assertTrue(repository.calls.isEmpty())
        }

    @Test
    fun deleteSendsThePasswordOnceAndReportsTheDeletion() =
        runTest(dispatcher) {
            val gate = CompletableDeferred<Unit>()
            repository.deleteAccountGate = gate
            val viewModel = viewModel()
            viewModel.onPasswordChange("correct-horse-battery")
            viewModel.onConfirmChange(true)

            viewModel.uiState.test {
                assertFalse(awaitItem().isDeleting)
                viewModel.onDelete()
                assertTrue(awaitItem().isDeleting)
                // Un second appui pendant l'envoi est ignoré.
                viewModel.onDelete()
                gate.complete(Unit)
                val done = awaitItem()
                assertFalse(done.isDeleting)
                assertTrue(done.isDeleted)
                assertEquals("", done.password)
                assertNull(done.errorMessage)
            }
            assertEquals(listOf(listOf("deleteAccount", "correct-horse-battery")), repository.calls)
        }

    @Test
    fun deleteShowsTheFailureAndKeepsThePassword() =
        runTest(dispatcher) {
            repository.failure = AuthFailure.WrongPassword
            val viewModel = viewModel()
            viewModel.onPasswordChange("wrong-password")
            viewModel.onConfirmChange(true)

            viewModel.onDelete()
            advanceUntilIdle()

            val state = viewModel.uiState.value
            assertEquals(R.string.account_delete_wrong_password, state.errorMessage)
            assertEquals("wrong-password", state.password)
            assertFalse(state.isDeleted)

            // Corriger le mot de passe efface le message.
            viewModel.onPasswordChange("correct-horse-battery")
            assertNull(viewModel.uiState.value.errorMessage)
        }

    @Test
    fun deleteMapsTheOtherFailures() =
        runTest(dispatcher) {
            val viewModel = viewModel()
            viewModel.onPasswordChange("x")
            viewModel.onConfirmChange(true)
            val expected =
                mapOf(
                    AuthFailure.TooManyAttempts to R.string.auth_error_too_many_attempts,
                    AuthFailure.Network to R.string.auth_error_network,
                    AuthFailure.Unknown to R.string.auth_error_generic,
                )

            expected.forEach { (failure, message) ->
                repository.failure = failure
                viewModel.onDelete()
                advanceUntilIdle()
                assertEquals(message, viewModel.uiState.value.errorMessage)
            }
        }

    @Test
    fun aLinkThatCannotBeOpenedIsReported() {
        val viewModel = viewModel()

        viewModel.onLinkUnavailable()

        assertEquals(R.string.account_link_unavailable, viewModel.uiState.value.linkError)
        assertNull(viewModel.uiState.value.errorMessage)
    }
}
