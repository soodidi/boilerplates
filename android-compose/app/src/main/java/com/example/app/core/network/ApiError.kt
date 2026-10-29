package com.example.app.core.network

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import retrofit2.HttpException
import java.io.IOException

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

    /** Pas de réponse : hors ligne, DNS, serveur arrêté. */
    data object Network : ApiError

    /** Réponse reçue mais illisible (contrat qui a dérivé, date invalide) : ni « hors ligne », ni à réessayer en boucle. */
    data object Unexpected : ApiError
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
        is IOException -> ApiError.Network
        else -> ApiError.Unexpected
    }
