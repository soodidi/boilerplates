package com.example.app.feature.notes.data

import com.example.app.core.model.Note
import com.example.app.core.network.ApiError
import com.example.app.core.network.ErrorKind
import com.example.app.core.network.kind
import com.example.app.core.network.toApiError
import kotlinx.serialization.json.Json
import java.time.Instant
import javax.inject.Inject
import kotlin.coroutines.cancellation.CancellationException

/** AND-002 : le repository est la seule source de vérité exposée au reste de l'app. */
interface NotesRepository {
    suspend fun list(query: String): Result<List<Note>>

    suspend fun get(id: String): Result<Note>

    suspend fun create(title: String): Result<Note>
}

class NotesException(
    val error: ApiError,
) : Exception()

/** Ce que l'écran peut expliquer d'un échec du repository (BE-010). */
fun Throwable.errorKind(): ErrorKind = (this as? NotesException)?.error?.kind ?: ErrorKind.Server

class DefaultNotesRepository
    @Inject
    constructor(
        private val api: NotesApi,
        private val json: Json,
    ) : NotesRepository {
        override suspend fun list(query: String): Result<List<Note>> =
            call { api.list(query = query.ifBlank { null }).data.map { it.toDomain() } }

        override suspend fun get(id: String): Result<Note> = call { api.get(id).toDomain() }

        override suspend fun create(title: String): Result<Note> = call { api.create(CreateNoteDto(title = title)).toDomain() }

        private suspend fun <T> call(block: suspend () -> T): Result<T> =
            try {
                Result.success(block())
            } catch (exception: CancellationException) {
                throw exception
            } catch (exception: Exception) {
                Result.failure(NotesException(exception.toApiError(json)))
            }
    }

private fun NoteDto.toDomain() = Note(id = id, title = title, content = content, createdAt = Instant.parse(createdAt))
