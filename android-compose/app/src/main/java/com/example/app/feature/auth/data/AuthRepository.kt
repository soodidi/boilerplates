package com.example.app.feature.auth.data

import com.example.app.core.auth.SessionStore
import kotlinx.coroutines.NonCancellable
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import okhttp3.HttpUrl
import retrofit2.Response
import java.io.IOException
import javax.inject.Inject
import javax.inject.Named
import kotlin.coroutines.cancellation.CancellationException

/** Échecs que l'UI sait expliquer. Jamais « compte inconnu » : la réponse ne le révèle pas (BE-006). */
enum class AuthFailure {
    InvalidCredentials,
    EmailNotVerified,
    TooManyAttempts,
    Network,
    Unknown,
}

class AuthException(
    val failure: AuthFailure,
) : Exception(failure.name)

interface AuthRepository {
    /** En cas de succès, la session est enregistrée : la navigation passe d'elle-même aux écrans connectés. */
    suspend fun signIn(
        email: String,
        password: String,
    ): Result<Unit>

    /** L'API envoie un e-mail de vérification ; la réponse est la même si le compte existe déjà. */
    suspend fun signUp(
        name: String,
        email: String,
        password: String,
    ): Result<Unit>

    suspend fun requestPasswordReset(email: String): Result<Unit>

    /** Révoque la session côté serveur si possible, et l'oublie localement dans tous les cas. */
    suspend fun signOut()
}

class DefaultAuthRepository
    @Inject
    constructor(
        private val api: AuthApi,
        private val json: Json,
        private val sessionStore: SessionStore,
        @Named(WEB_BASE_URL) private val webBaseUrl: HttpUrl,
    ) : AuthRepository {
        override suspend fun signIn(
            email: String,
            password: String,
        ): Result<Unit> =
            call {
                val response = api.signIn(SignInDto(email = email, password = password)).orThrow()
                val token = response.headers()[SET_AUTH_TOKEN] ?: throw AuthException(AuthFailure.Unknown)
                sessionStore.save(token)
            }

        override suspend fun signUp(
            name: String,
            email: String,
            password: String,
        ): Result<Unit> =
            call {
                val body = SignUpDto(name = name, email = email, password = password, callbackURL = webUrl("login"))
                api.signUp(body).orThrow()
            }

        override suspend fun requestPasswordReset(email: String): Result<Unit> =
            call { api.requestPasswordReset(PasswordResetRequestDto(email = email, redirectTo = webUrl("reset-password"))).orThrow() }

        override suspend fun signOut() {
            try {
                api.signOut()
            } catch (exception: CancellationException) {
                throw exception
            } catch (_: Exception) {
                // Hors ligne : la session expirera côté serveur ; l'appareil, lui, l'oublie tout de suite.
            } finally {
                withContext(NonCancellable) { sessionStore.clear() }
            }
        }

        private fun webUrl(path: String) = webBaseUrl.resolve(path).toString()

        private fun <T> Response<T>.orThrow(): Response<T> {
            if (isSuccessful) return this
            val code = errorBody()?.string()?.let { runCatching { json.decodeFromString<AuthErrorDto>(it).code }.getOrNull() }
            throw AuthException(
                when {
                    code() == 401 && code == "INVALID_EMAIL_OR_PASSWORD" -> AuthFailure.InvalidCredentials
                    code() == 403 && code == "EMAIL_NOT_VERIFIED" -> AuthFailure.EmailNotVerified
                    code() == 429 -> AuthFailure.TooManyAttempts
                    else -> AuthFailure.Unknown
                },
            )
        }

        private suspend fun <T> call(block: suspend () -> T): Result<T> =
            try {
                Result.success(block())
            } catch (exception: CancellationException) {
                throw exception
            } catch (exception: AuthException) {
                Result.failure(exception)
            } catch (_: IOException) {
                Result.failure(AuthException(AuthFailure.Network))
            } catch (_: Exception) {
                Result.failure(AuthException(AuthFailure.Unknown))
            }

        companion object {
            const val WEB_BASE_URL = "webBaseUrl"
            private const val SET_AUTH_TOKEN = "set-auth-token"
        }
    }
