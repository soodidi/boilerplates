package com.example.app.feature.auth

import app.cash.turbine.test
import com.example.app.R
import com.example.app.feature.auth.data.AuthFailure
import com.example.app.feature.auth.ui.ForgotPasswordViewModel
import com.example.app.feature.auth.ui.SignInViewModel
import com.example.app.feature.auth.ui.SignUpViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class AuthViewModelsTest {
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

    @Test
    fun signInValidatesBeforeCallingTheApi() =
        runTest(dispatcher) {
            val viewModel = SignInViewModel(repository)
            viewModel.onEmailChange("not-an-email")

            viewModel.onSubmit()

            assertEquals(R.string.auth_email_invalid, viewModel.uiState.value.emailError)
            assertEquals(R.string.validation_required, viewModel.uiState.value.passwordError)
            assertTrue(repository.calls.isEmpty())
        }

    @Test
    fun signInNormalizesTheEmailAndClearsThePasswordOnSuccess() =
        runTest(dispatcher) {
            val viewModel = SignInViewModel(repository)
            viewModel.onEmailChange("  Ada@Example.com ")
            viewModel.onPasswordChange("correct-horse-battery")

            viewModel.uiState.test {
                assertFalse(awaitItem().isSubmitting)
                viewModel.onSubmit()
                assertTrue(awaitItem().isSubmitting)
                val done = awaitItem()
                assertFalse(done.isSubmitting)
                assertEquals("", done.password)
                assertNull(done.errorMessage)
            }
            assertEquals(listOf("signIn", "ada@example.com", "correct-horse-battery"), repository.calls.single())
        }

    @Test
    fun signInShowsAGenericMessageOnBadCredentials() =
        runTest(dispatcher) {
            repository.failure = AuthFailure.InvalidCredentials
            val viewModel = SignInViewModel(repository)
            viewModel.onEmailChange("ada@example.com")
            viewModel.onPasswordChange("wrong")

            viewModel.onSubmit()
            advanceUntilIdle()

            assertEquals(R.string.auth_error_invalid_credentials, viewModel.uiState.value.errorMessage)
            assertEquals("wrong", viewModel.uiState.value.password)

            viewModel.onPasswordChange("other")
            assertNull(viewModel.uiState.value.errorMessage)
        }

    @Test
    fun signInExplainsAnUnverifiedEmail() =
        runTest(dispatcher) {
            repository.failure = AuthFailure.EmailNotVerified
            val viewModel = SignInViewModel(repository)
            viewModel.onEmailChange("ada@example.com")
            viewModel.onPasswordChange("correct-horse-battery")

            viewModel.onSubmit()
            advanceUntilIdle()

            assertEquals(R.string.auth_error_email_not_verified, viewModel.uiState.value.errorMessage)
        }

    @Test
    fun signUpRequiresAStrongEnoughPassword() =
        runTest(dispatcher) {
            val viewModel = SignUpViewModel(repository)
            viewModel.onNameChange(" ")
            viewModel.onEmailChange("ada@example.com")
            viewModel.onPasswordChange("short")

            viewModel.onSubmit()

            assertEquals(R.string.validation_required, viewModel.uiState.value.nameError)
            assertNull(viewModel.uiState.value.emailError)
            assertEquals(R.string.auth_password_too_short, viewModel.uiState.value.passwordError)
            assertTrue(repository.calls.isEmpty())
        }

    @Test
    fun signInIgnoresASecondSubmitWhileSending() =
        runTest(dispatcher) {
            val viewModel = SignInViewModel(repository)
            viewModel.onEmailChange("ada@example.com")
            viewModel.onPasswordChange("correct-horse-battery")

            viewModel.onSubmit()
            viewModel.onSubmit()
            advanceUntilIdle()

            assertEquals(1, repository.calls.size)
        }

    @Test
    fun signUpRejectsTooLongValues() =
        runTest(dispatcher) {
            val viewModel = SignUpViewModel(repository)
            viewModel.onNameChange("a".repeat(101))
            viewModel.onEmailChange("ada@example.com")
            viewModel.onPasswordChange("p".repeat(129))

            viewModel.onSubmit()

            assertEquals(R.string.auth_name_too_long, viewModel.uiState.value.nameError)
            assertEquals(R.string.auth_password_too_long, viewModel.uiState.value.passwordError)
            assertTrue(repository.calls.isEmpty())
        }

    @Test
    fun signUpConfirmsTheVerificationEmail() =
        runTest(dispatcher) {
            val viewModel = SignUpViewModel(repository)
            viewModel.onNameChange(" Ada ")
            viewModel.onEmailChange("Ada@Example.com")
            viewModel.onPasswordChange("correct-horse-battery")

            viewModel.onSubmit()
            advanceUntilIdle()

            assertEquals("ada@example.com", viewModel.uiState.value.sentTo)
            assertEquals("", viewModel.uiState.value.password)
            assertEquals(listOf("signUp", "Ada", "ada@example.com", "correct-horse-battery"), repository.calls.single())
        }

    @Test
    fun signUpReportsTooManyAttempts() =
        runTest(dispatcher) {
            repository.failure = AuthFailure.TooManyAttempts
            val viewModel = SignUpViewModel(repository)
            viewModel.onNameChange("Ada")
            viewModel.onEmailChange("ada@example.com")
            viewModel.onPasswordChange("correct-horse-battery")

            viewModel.onSubmit()
            advanceUntilIdle()

            assertNull(viewModel.uiState.value.sentTo)
            assertEquals(R.string.auth_error_too_many_attempts, viewModel.uiState.value.errorMessage)
        }

    @Test
    fun forgotPasswordConfirmsWithoutRevealingTheAccount() =
        runTest(dispatcher) {
            val viewModel = ForgotPasswordViewModel(repository)
            viewModel.onEmailChange("ada@example.com")

            viewModel.onSubmit()
            advanceUntilIdle()

            assertEquals("ada@example.com", viewModel.uiState.value.sentTo)
            assertEquals(listOf("requestPasswordReset", "ada@example.com"), repository.calls.single())
        }

    @Test
    fun forgotPasswordValidatesTheEmail() =
        runTest(dispatcher) {
            val viewModel = ForgotPasswordViewModel(repository)
            viewModel.onEmailChange("ada@")

            viewModel.onSubmit()

            assertEquals(R.string.auth_email_invalid, viewModel.uiState.value.emailError)
            assertTrue(repository.calls.isEmpty())
        }

    @Test
    fun forgotPasswordReportsNetworkErrors() =
        runTest(dispatcher) {
            repository.failure = AuthFailure.Network
            val viewModel = ForgotPasswordViewModel(repository)
            viewModel.onEmailChange("ada@example.com")

            viewModel.onSubmit()
            advanceUntilIdle()

            assertNull(viewModel.uiState.value.sentTo)
            assertEquals(R.string.auth_error_network, viewModel.uiState.value.errorMessage)
        }
}
