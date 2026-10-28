package com.example.app.core.auth

import okhttp3.HttpUrl
import okhttp3.Interceptor
import okhttp3.Response
import javax.inject.Inject
import javax.inject.Named

/**
 * AND-004 : ajoute `Authorization: Bearer` aux appels de notre API, et seulement à eux.
 * Sur un `401`, le token est effacé : la navigation renvoie alors vers la connexion.
 */
class AuthInterceptor
    @Inject
    constructor(
        private val sessionStore: SessionStore,
        @Named(API_BASE_URL) private val apiBaseUrl: HttpUrl,
    ) : Interceptor {
        override fun intercept(chain: Interceptor.Chain): Response {
            val request = chain.request()
            val token = sessionStore.currentToken()?.takeIf { request.url.isSameOrigin(apiBaseUrl) }
            if (token == null) return chain.proceed(request)

            val response = chain.proceed(request.newBuilder().header("Authorization", "Bearer $token").build())
            if (response.code == HTTP_UNAUTHORIZED) sessionStore.onUnauthorized(token)
            return response
        }

        private fun HttpUrl.isSameOrigin(other: HttpUrl) = scheme == other.scheme && host == other.host && port == other.port

        companion object {
            const val API_BASE_URL = "apiBaseUrl"
            private const val HTTP_UNAUTHORIZED = 401
        }
    }
