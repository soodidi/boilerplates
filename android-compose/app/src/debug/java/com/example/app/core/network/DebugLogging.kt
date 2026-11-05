package com.example.app.core.network

import okhttp3.Interceptor
import okhttp3.logging.HttpLoggingInterceptor

/**
 * AND-004 / GLB-013 : logs HTTP en debug uniquement, sans aucun corps de requête ni de réponse
 * (notes, export du compte, mot de passe : rien de personnel dans logcat, qui part avec un rapport
 * de bug), et sans en-têtes d'authentification. Méthode, URL, statut et autres en-têtes suffisent ;
 * pour voir un contenu, les logs de l'API locale.
 */
fun debugLoggingInterceptor(logger: HttpLoggingInterceptor.Logger = HttpLoggingInterceptor.Logger.DEFAULT): Interceptor =
    HttpLoggingInterceptor(logger).apply {
        level = HttpLoggingInterceptor.Level.HEADERS
        redactHeader("Authorization")
        redactHeader("Cookie")
        redactHeader("Set-Cookie")
        redactHeader("set-auth-token")
    }
