package com.example.app.navigation

import com.example.app.core.auth.FakeSessionStore
import com.example.app.core.auth.SessionState
import com.example.app.feature.auth.FakeAuthRepository
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class SessionViewModelTest {
    private val dispatcher = StandardTestDispatcher()

    @Before
    fun setUp() {
        Dispatchers.setMain(dispatcher)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun exposesTheSessionAndSignsOutOnce() =
        runTest(dispatcher) {
            val store = FakeSessionStore("token-1")
            val gate = CompletableDeferred<Unit>()
            val repository = FakeAuthRepository().apply { signOutGate = gate }
            val viewModel = SessionViewModel(store, repository)
            assertEquals(SessionState.SignedIn, viewModel.session.value)

            viewModel.signOut()
            advanceUntilIdle()
            viewModel.signOut()
            gate.complete(Unit)
            advanceUntilIdle()

            assertEquals(1, repository.signOutCount)
        }
}
