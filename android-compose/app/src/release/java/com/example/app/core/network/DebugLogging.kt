package com.example.app.core.network

import okhttp3.Interceptor

/** Release : aucun log HTTP. */
fun debugLoggingInterceptor(): Interceptor = Interceptor { chain -> chain.proceed(chain.request()) }
