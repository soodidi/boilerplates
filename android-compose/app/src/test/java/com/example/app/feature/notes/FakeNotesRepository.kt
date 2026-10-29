package com.example.app.feature.notes

import com.example.app.core.model.Note
import com.example.app.feature.notes.data.NotesException
import com.example.app.feature.notes.data.NotesRepository
import java.time.Instant

/** AND-005 : un fake du repository plutôt qu'un mock. */
class FakeNotesRepository : NotesRepository {
    val notes = mutableListOf<Note>()
    var listError: NotesException? = null
    var getError: NotesException? = null
    var createError: NotesException? = null
    var lastQuery: String? = null
    var getCount = 0

    override suspend fun list(query: String): Result<List<Note>> {
        lastQuery = query
        listError?.let { return Result.failure(it) }
        return Result.success(notes.filter { it.title.contains(query, ignoreCase = true) })
    }

    override suspend fun get(id: String): Result<Note> {
        getCount++
        getError?.let { return Result.failure(it) }
        return notes.firstOrNull { it.id == id }?.let { Result.success(it) }
            ?: Result.failure(IllegalStateException("No note $id in the fake"))
    }

    override suspend fun create(title: String): Result<Note> {
        createError?.let { return Result.failure(it) }
        val note = Note(id = "${notes.size + 1}", title = title, content = "", createdAt = Instant.EPOCH)
        notes += note
        return Result.success(note)
    }
}
