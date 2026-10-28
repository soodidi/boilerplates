package com.example.app.core.auth

import mockwebserver3.MockResponse
import mockwebserver3.MockWebServer
import okhttp3.HttpUrl
import okhttp3.OkHttpClient
import okhttp3.Request
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test

class AuthInterceptorTest {
    private val server = MockWebServer()
    private lateinit var apiUrl: HttpUrl

    @Before
    fun setUp() {
        server.start()
        apiUrl = server.url("/")
    }

    @After
    fun tearDown() {
        server.close()
    }

    private fun client(store: SessionStore) = OkHttpClient.Builder().addInterceptor(AuthInterceptor(store, apiUrl)).build()

    private fun OkHttpClient.get(url: HttpUrl = apiUrl.resolve("v1/notes")!!) =
        newCall(Request.Builder().url(url).build()).execute().use {
            it.code
        }

    @Test
    fun sendsTheTokenAsBearer() {
        server.enqueue(MockResponse.Builder().code(200).build())

        client(FakeSessionStore("token-1")).get()

        assertEquals("Bearer token-1", server.takeRequest().headers["Authorization"])
    }

    @Test
    fun sendsNoAuthorizationWithoutSession() {
        server.enqueue(MockResponse.Builder().code(200).build())

        client(FakeSessionStore()).get()

        assertNull(server.takeRequest().headers["Authorization"])
    }

    @Test
    fun neverSendsTheTokenToAnotherOrigin() {
        server.enqueue(MockResponse.Builder().code(200).build())
        // Même serveur, joint par un autre nom d'hôte : une autre origine pour l'intercepteur.
        val otherHost = if (apiUrl.host == "localhost") "127.0.0.1" else "localhost"

        client(FakeSessionStore("token-1")).get(apiUrl.newBuilder().host(otherHost).build())

        assertNull(server.takeRequest().headers["Authorization"])
    }

    @Test
    fun unauthorizedResponseEndsTheSession() {
        server.enqueue(MockResponse.Builder().code(401).build())
        val store = FakeSessionStore("token-1")

        val code = client(store).get()

        assertEquals(401, code)
        assertEquals(listOf("token-1"), store.unauthorizedTokens)
        assertEquals(SessionState.SignedOut, store.state.value)
    }

    @Test
    fun otherErrorsKeepTheSession() {
        server.enqueue(MockResponse.Builder().code(403).build())
        val store = FakeSessionStore("token-1")

        client(store).get()

        assertEquals(SessionState.SignedIn, store.state.value)
    }
}
