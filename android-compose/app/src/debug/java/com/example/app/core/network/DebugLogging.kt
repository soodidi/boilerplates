package com.example.app.core.network

import okhttp3.Interceptor
import okhttp3.logging.HttpLoggingInterceptor

/**
 * AND-004 : logs HTTP détaillés en debug uniquement, sans en-têtes d'authentification.
 * Les routes d'auth ne journalisent pas leur corps : il contient le mot de passe ou le token.
 */
fun debugLoggingInterceptor(): Interceptor {
    val withBody = loggingInterceptor(HttpLoggingInterceptor.Level.BODY)
    val headersOnly = loggingInterceptor(HttpLoggingInterceptor.Level.HEADERS)
    return Interceptor { chain ->
        val logger =
            if (chain
                    .request()
                    .url.encodedPath
                    .startsWith(AUTH_PATH)
            ) {
                headersOnly
            } else {
                withBody
            }
        logger.intercept(chain)
    }
}

private const val AUTH_PATH = "/v1/auth/"

private fun loggingInterceptor(logLevel: HttpLoggingInterceptor.Level) =
    HttpLoggingInterceptor().apply {
        level = logLevel
        redactHeader("Authorization")
        redactHeader("Cookie")
        redactHeader("Set-Cookie")
        redactHeader("set-auth-token")
    }
