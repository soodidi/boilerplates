package com.example.app.core.network

/** BE-010 : ce que l'écran peut expliquer d'un échec de l'API, quelle que soit la feature. */
enum class ErrorKind {
    /** 403 : connecté, mais sans la permission. */
    Forbidden,

    /** 404 : la ressource n'existe pas, ou appartient à un autre utilisateur (l'API ne distingue pas). */
    NotFound,

    /** Pas de réponse : hors ligne, DNS, serveur arrêté. */
    Network,

    /** Toute autre erreur : réessayer peut suffire. */
    Server,
}

private const val HTTP_FORBIDDEN = 403
private const val HTTP_NOT_FOUND = 404

val ApiError.kind: ErrorKind
    get() =
        when (this) {
            ApiError.Network -> ErrorKind.Network
            is ApiError.Http ->
                when (problem.status) {
                    HTTP_FORBIDDEN -> ErrorKind.Forbidden
                    HTTP_NOT_FOUND -> ErrorKind.NotFound
                    else -> ErrorKind.Server
                }
        }
