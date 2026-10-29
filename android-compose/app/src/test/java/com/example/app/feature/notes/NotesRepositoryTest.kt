package com.example.app.feature.notes

import com.example.app.core.network.ErrorKind
import com.example.app.core.network.NetworkModule
import com.example.app.core.network.kind
import com.example.app.feature.notes.data.DefaultNotesRepository
import com.example.app.feature.notes.data.NotesApi
import com.example.app.feature.notes.data.NotesException
import kotlinx.coroutines.test.runTest
import mockwebserver3.MockResponse
import mockwebserver3.MockWebServer
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory

class NotesRepositoryTest {
    private val server = MockWebServer()
    private val json = NetworkModule.provideJson()
    private lateinit var repository: DefaultNotesRepository

    @Before
    fun setUp() {
        server.start()
        val api =
            Retrofit
                .Builder()
                .baseUrl(server.url("/"))
                .client(OkHttpClient())
                .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
                .build()
                .create(NotesApi::class.java)
        repository = DefaultNotesRepository(api, json)
    }

    @After
    fun tearDown() {
        server.close()
    }

    private fun respond(
        code: Int,
        body: String,
    ) {
        server.enqueue(
            MockResponse
                .Builder()
                .code(code)
                .body(body)
                .addHeader("Content-Type", "application/json")
                .build(),
        )
    }

    private fun Result<*>.kind() = (exceptionOrNull() as NotesException).error.kind

    @Test
    fun getsOneNoteById() =
        runTest {
            respond(200, """{"id":"1","title":"Coffee","content":"","createdAt":"2026-10-20T09:00:00.000Z"}""")

            val note = repository.get("1").getOrThrow()

            assertEquals("Coffee", note.title)
            assertEquals("/v1/notes/1", server.takeRequest().url.encodedPath)
        }

    @Test
    fun explainsTheFailuresOfGet() =
        runTest {
            // BE-010 : la note d'un autre utilisateur répond 404, comme une note inexistante.
            respond(404, """{"type":"about:blank","title":"Not Found","status":404}""")
            respond(403, """{"type":"about:blank","title":"Forbidden","status":403}""")
            respond(500, "oops")

            assertEquals(ErrorKind.NotFound, repository.get("1").kind())
            assertEquals(ErrorKind.Forbidden, repository.get("1").kind())
            assertEquals(ErrorKind.Server, repository.get("1").kind())
        }

    @Test
    fun encodesTheIdInThePath() =
        runTest {
            // AND-004 : un id ne peut viser ni une autre route ni un autre hôte (le Bearer part avec).
            respond(404, """{"type":"about:blank","title":"Not Found","status":404}""")

            repository.get("a/b?c#d")

            assertEquals("/v1/notes/a%2Fb%3Fc%23d", server.takeRequest().url.encodedPath)
        }

    @Test
    fun refusesADotSegmentWithoutCallingTheApi() =
        runTest {
            assertEquals(ErrorKind.Server, repository.get("..").kind())
            assertEquals(0, server.requestCount)
        }

    @Test
    fun anUnreadableResponseIsNotANetworkFailure() =
        runTest {
            respond(200, """{"id":"1","title":"Coffee","content":"","createdAt":"not a date"}""")

            assertEquals(ErrorKind.Server, repository.get("1").kind())
        }

    @Test
    fun reportsANetworkFailure() =
        runTest {
            server.close()

            assertEquals(ErrorKind.Network, repository.get("1").kind())
        }
}
