package com.example.app.feature.auth

import com.example.app.feature.auth.data.AuthException
import com.example.app.feature.auth.data.AuthFailure
import com.example.app.feature.auth.data.AuthRepository

/** AND-005 : un fake du repository plutôt qu'un mock. */
class FakeAuthRepository : AuthRepository {
    var failure: AuthFailure? = null
    val calls = mutableListOf<List<String>>()
    var signedOut = false

    private fun result(): Result<Unit> = failure?.let { Result.failure(AuthException(it)) } ?: Result.success(Unit)

    override suspend fun signIn(
        email: String,
        password: String,
    ): Result<Unit> {
        calls += listOf("signIn", email, password)
        return result()
    }

    override suspend fun signUp(
        name: String,
        email: String,
        password: String,
    ): Result<Unit> {
        calls += listOf("signUp", name, email, password)
        return result()
    }

    override suspend fun requestPasswordReset(email: String): Result<Unit> {
        calls += listOf("requestPasswordReset", email)
        return result()
    }

    override suspend fun signOut() {
        signedOut = true
    }
}
