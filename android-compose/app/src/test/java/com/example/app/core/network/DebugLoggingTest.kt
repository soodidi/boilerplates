package com.example.app.core.network

import mockwebserver3.MockResponse
import mockwebserver3.MockWebServer
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.junit.After
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/** AND-004 : les logs debug ne contiennent ni mot de passe ni token. */
class DebugLoggingTest {
    private val server = MockWebServer()
    private val lines = mutableListOf<String>()
    private val client by lazy { OkHttpClient.Builder().addInterceptor(debugLoggingInterceptor { lines += it }).build() }

    @Before
    fun setUp() = server.start()

    @After
    fun tearDown() = server.close()

    private fun post(
        path: String,
        body: String,
    ) {
        server.enqueue(
            MockResponse
                .Builder()
                .addHeader("set-auth-token", "secret-token")
                .body("""{"token":"raw-token"}""")
                .build(),
        )
        val request =
            Request
                .Builder()
                .url(server.url(path))
                .header("Authorization", "Bearer secret-token")
                .post(body.toRequestBody("application/json".toMediaType()))
                .build()
        client.newCall(request).execute().close()
    }

    @Test
    fun authRoutesLogNeitherBodiesNorTokens() {
        post("/api/v1/auth/sign-in/email", """{"password":"hunter2-hunter2"}""")

        val log = lines.joinToString("\n")
        assertTrue(log.contains("/api/v1/auth/sign-in/email"))
        assertFalse(log.contains("hunter2"))
        assertFalse(log.contains("raw-token"))
        assertFalse(log.contains("secret-token"))
    }

    @Test
    fun otherRoutesLogBodiesButMaskTheToken() {
        post("/v1/notes", """{"title":"Coffee"}""")

        val log = lines.joinToString("\n")
        assertTrue(log.contains("Coffee"))
        assertFalse(log.contains("secret-token"))
    }
}
