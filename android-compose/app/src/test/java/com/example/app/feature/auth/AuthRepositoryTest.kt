package com.example.app.feature.auth

import com.example.app.core.auth.FakeSessionStore
import com.example.app.core.auth.SessionState
import com.example.app.feature.auth.data.AuthApi
import com.example.app.feature.auth.data.AuthException
import com.example.app.feature.auth.data.AuthFailure
import com.example.app.feature.auth.data.DefaultAuthRepository
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import mockwebserver3.MockResponse
import mockwebserver3.MockWebServer
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory

class AuthRepositoryTest {
    private val server = MockWebServer()
    private val json = Json { ignoreUnknownKeys = true }
    private lateinit var store: FakeSessionStore
    private lateinit var repository: DefaultAuthRepository

    @Before
    fun setUp() {
        server.start()
        store = FakeSessionStore()
        repository = repository(store)
    }

    @After
    fun tearDown() {
        server.close()
    }

    private fun repository(store: FakeSessionStore): DefaultAuthRepository {
        val api =
            Retrofit
                .Builder()
                .baseUrl(server.url("/"))
                .client(OkHttpClient())
                .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
                .build()
                .create(AuthApi::class.java)
        return DefaultAuthRepository(api, json, store, "https://app.example.com/".toHttpUrl())
    }

    private fun respond(
        code: Int,
        body: String = "{}",
        vararg headers: Pair<String, String>,
    ) {
        val builder =
            MockResponse
                .Builder()
                .code(code)
                .body(body)
                .addHeader("Content-Type", "application/json")
        headers.forEach { (name, value) -> builder.addHeader(name, value) }
        server.enqueue(builder.build())
    }

    private fun Result<*>.failure() = (exceptionOrNull() as AuthException).failure

    @Test
    fun signInStoresTheSignedTokenFromTheHeader() =
        runTest {
            // Le corps porte le token brut, non signé : seul l'en-tête est accepté par l'API.
            respond(200, """{"token":"raw","user":{"id":"1"}}""", "set-auth-token" to "raw.signature")

            val result = repository.signIn("ada@example.com", "correct-horse-battery")

            assertTrue(result.isSuccess)
            assertEquals("raw.signature", store.token)
            val request = server.takeRequest()
            assertEquals("/v1/auth/sign-in/email", request.url.encodedPath)
            val body = json.parseToJsonElement(request.body!!.utf8()).jsonObject
            assertEquals("ada@example.com", body["email"]!!.jsonPrimitive.content)
        }

    @Test
    fun signInWithoutTokenHeaderFails() =
        runTest {
            respond(200, """{"token":"raw"}""")

            val result = repository.signIn("ada@example.com", "correct-horse-battery")

            assertEquals(AuthFailure.Unknown, result.failure())
            assertNull(store.token)
        }

    @Test
    fun mapsBetterAuthErrors() =
        runTest {
            respond(401, """{"code":"INVALID_EMAIL_OR_PASSWORD"}""")
            respond(403, """{"code":"EMAIL_NOT_VERIFIED"}""")
            respond(429, "")
            respond(500, "oops")

            assertEquals(AuthFailure.InvalidCredentials, repository.signIn("a@b.co", "x").failure())
            assertEquals(AuthFailure.EmailNotVerified, repository.signIn("a@b.co", "x").failure())
            assertEquals(AuthFailure.TooManyAttempts, repository.signIn("a@b.co", "x").failure())
            assertEquals(AuthFailure.Unknown, repository.signIn("a@b.co", "x").failure())
        }

    @Test
    fun networkErrorIsReportedAsSuch() =
        runTest {
            server.close()

            assertEquals(AuthFailure.Network, repository.signIn("a@b.co", "x").failure())
        }

    @Test
    fun signUpSendsTheWebPageOpenedByTheVerificationLink() =
        runTest {
            respond(200, """{"token":null}""")

            assertTrue(repository.signUp("Ada", "ada@example.com", "correct-horse-battery").isSuccess)

            val body = json.parseToJsonElement(server.takeRequest().body!!.utf8()).jsonObject
            assertEquals("https://app.example.com/login", body["callbackURL"]!!.jsonPrimitive.content)
            assertNull(store.token)
        }

    @Test
    fun passwordResetSendsTheWebResetPage() =
        runTest {
            respond(200, """{"status":true}""")

            assertTrue(repository.requestPasswordReset("ada@example.com").isSuccess)

            val body = json.parseToJsonElement(server.takeRequest().body!!.utf8()).jsonObject
            assertEquals("https://app.example.com/reset-password", body["redirectTo"]!!.jsonPrimitive.content)
        }

    @Test
    fun signOutForgetsTheSessionEvenWhenTheServerFails() =
        runTest {
            store.save("token-1")
            respond(500)

            repository.signOut()

            assertEquals("/v1/auth/sign-out", server.takeRequest().url.encodedPath)
            assertEquals(SessionState.SignedOut, store.state.value)
        }

    @Test
    fun signOutForgetsTheSessionOffline() =
        runTest {
            store.save("token-1")
            server.close()

            repository.signOut()

            assertNull(store.token)
        }

    @Test
    fun deleteAccountSendsThePasswordAndLeavesTheSessionToTheCaller() =
        runTest {
            store.save("token-1")
            respond(200, """{"success":true}""")

            assertTrue(repository.deleteAccount("correct-horse-battery").isSuccess)

            val request = server.takeRequest()
            assertEquals("POST", request.method)
            assertEquals("/v1/auth/delete-user", request.url.encodedPath)
            val body = json.parseToJsonElement(request.body!!.utf8()).jsonObject
            assertEquals("correct-horse-battery", body["password"]!!.jsonPrimitive.content)
            // L'appelant oublie la session une fois prêt à quitter les écrans connectés.
            assertEquals("token-1", store.token)
        }

    @Test
    fun deleteAccountMapsTheApiErrors() =
        runTest {
            respond(400, """{"code":"INVALID_PASSWORD","message":"Invalid password"}""")
            respond(400, """{"code":"VALIDATION_ERROR"}""")
            respond(429, "")

            assertEquals(AuthFailure.WrongPassword, repository.deleteAccount("x").failure())
            assertEquals(AuthFailure.Unknown, repository.deleteAccount("x").failure())
            assertEquals(AuthFailure.TooManyAttempts, repository.deleteAccount("x").failure())
        }

    @Test
    fun deleteAccountReportsNetworkErrors() =
        runTest {
            server.close()

            assertEquals(AuthFailure.Network, repository.deleteAccount("x").failure())
        }
}
