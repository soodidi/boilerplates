package com.example.app.core.network

import okhttp3.Interceptor
import okhttp3.logging.HttpLoggingInterceptor

/**
 * AND-004 : logs HTTP détaillés en debug uniquement, sans en-têtes d'authentification.
 * Les routes d'auth ne journalisent pas leur corps : il contient le mot de passe ou le token.
 */
fun debugLoggingInterceptor(logger: HttpLoggingInterceptor.Logger = HttpLoggingInterceptor.Logger.DEFAULT): Interceptor {
    val withBody = loggingInterceptor(HttpLoggingInterceptor.Level.BODY, logger)
    val headersOnly = loggingInterceptor(HttpLoggingInterceptor.Level.HEADERS, logger)
    return Interceptor { chain ->
        val isAuthRoute =
            chain
                .request()
                .url.encodedPath
                .contains(AUTH_PATH)
        (if (isAuthRoute) headersOnly else withBody).intercept(chain)
    }
}

// `contains` et non `startsWith` : reste vrai si API_BASE_URL a un chemin (`https://x/api/`).
private const val AUTH_PATH = "/v1/auth/"

private fun loggingInterceptor(
    logLevel: HttpLoggingInterceptor.Level,
    logger: HttpLoggingInterceptor.Logger,
) = HttpLoggingInterceptor(logger).apply {
    level = logLevel
    redactHeader("Authorization")
    redactHeader("Cookie")
    redactHeader("Set-Cookie")
    redactHeader("set-auth-token")
}
