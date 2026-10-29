package com.example.app.core.network

import org.junit.Assert.assertEquals
import org.junit.Test

class ErrorKindTest {
    private fun http(status: Int) = ApiError.Http(ProblemDetails(title = "x", status = status))

    @Test
    fun mapsApiErrorsToWhatTheScreenCanExplain() {
        assertEquals(ErrorKind.Forbidden, http(403).kind)
        assertEquals(ErrorKind.NotFound, http(404).kind)
        assertEquals(ErrorKind.Server, http(400).kind)
        assertEquals(ErrorKind.Server, http(500).kind)
        assertEquals(ErrorKind.Network, ApiError.Network.kind)
    }
}
