package com.example.app.core.network

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import retrofit2.HttpException

/** Problem Details (RFC 9457) renvoyé par l'API en cas d'erreur (BE-004). */
@Serializable
data class ProblemDetails(
    val title: String,
    val status: Int,
    val detail: String? = null,
    val errors: List<FieldError> = emptyList(),
    val traceId: String? = null,
)

@Serializable
data class FieldError(
    val field: String,
    val code: String,
    val message: String? = null,
)

/** Erreurs typées du domaine, construites à partir des erreurs HTTP et réseau (AND-004). */
sealed interface ApiError {
    data class Http(
        val problem: ProblemDetails,
    ) : ApiError

    data object Network : ApiError
}

fun Throwable.toApiError(json: Json): ApiError =
    when (this) {
        is HttpException -> {
            val body = response()?.errorBody()?.string()
            val problem =
                body?.let { runCatching { json.decodeFromString<ProblemDetails>(it) }.getOrNull() }
                    ?: ProblemDetails(title = message(), status = code())
            ApiError.Http(problem)
        }
        else -> ApiError.Network
    }
