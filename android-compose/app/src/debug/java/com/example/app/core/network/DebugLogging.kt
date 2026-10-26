package com.example.app.core.network

import okhttp3.Interceptor
import okhttp3.logging.HttpLoggingInterceptor

/** AND-004 : logs HTTP détaillés en debug uniquement, sans en-têtes d'authentification. */
fun debugLoggingInterceptor(): Interceptor =
    HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
        redactHeader("Authorization")
        redactHeader("Cookie")
    }
