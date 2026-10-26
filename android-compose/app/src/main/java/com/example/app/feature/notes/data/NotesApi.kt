package com.example.app.feature.notes.data

import kotlinx.serialization.Serializable
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Query

/**
 * Contrat de l'API (module notes du boilerplate api-nestjs).
 * AND-004 : à générer depuis la spec OpenAPI publiée par le backend quand elle existe.
 */
interface NotesApi {
    @GET("v1/notes")
    suspend fun list(
        @Query("q") query: String?,
        @Query("limit") limit: Int = 20,
        @Query("cursor") cursor: String? = null,
    ): NotePageDto

    @POST("v1/notes")
    suspend fun create(
        @Body body: CreateNoteDto,
    ): NoteDto
}

@Serializable
data class NoteDto(
    val id: String,
    val title: String,
    val content: String,
    val createdAt: String,
)

@Serializable
data class NotePageDto(
    val data: List<NoteDto>,
    val nextCursor: String?,
)

@Serializable
data class CreateNoteDto(
    val title: String,
    val content: String = "",
)
