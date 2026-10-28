package com.example.app.feature.auth.data

import kotlinx.serialization.Serializable
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST

/**
 * Routes de Better Auth exposées par l'API (BE-006). Elles répondent `{ code, message }` en cas
 * d'erreur, pas en Problem Details : d'où `Response<Unit>`, lu par le repository.
 */
interface AuthApi {
    /** Le token de session signé arrive dans l'en-tête `set-auth-token` (celui du corps n'est pas signé). */
    @POST("v1/auth/sign-in/email")
    suspend fun signIn(
        @Body body: SignInDto,
    ): Response<Unit>

    @POST("v1/auth/sign-up/email")
    suspend fun signUp(
        @Body body: SignUpDto,
    ): Response<Unit>

    @POST("v1/auth/request-password-reset")
    suspend fun requestPasswordReset(
        @Body body: PasswordResetRequestDto,
    ): Response<Unit>

    @POST("v1/auth/sign-out")
    suspend fun signOut(): Response<Unit>

    /** GLB-013 : suppression immédiate du compte ; l'API exige le mot de passe et révoque la session. */
    @POST("v1/auth/delete-user")
    suspend fun deleteUser(
        @Body body: DeleteUserDto,
    ): Response<Unit>
}

@Serializable
data class SignInDto(
    val email: String,
    val password: String,
)

@Serializable
data class SignUpDto(
    val name: String,
    val email: String,
    val password: String,
    /** Page du front web ouverte après le clic sur le lien de vérification. */
    val callbackURL: String,
)

@Serializable
data class PasswordResetRequestDto(
    val email: String,
    /** Page du front web qui reçoit le jeton et demande le nouveau mot de passe. */
    val redirectTo: String,
)

@Serializable
data class DeleteUserDto(
    val password: String,
)

@Serializable
data class AuthErrorDto(
    val code: String? = null,
)
