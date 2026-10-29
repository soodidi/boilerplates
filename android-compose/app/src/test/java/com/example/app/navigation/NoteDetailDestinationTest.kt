package com.example.app.navigation

import com.example.app.feature.notes.ui.NoteDetailViewModel
import org.junit.Assert.assertEquals
import org.junit.Test

class NoteDetailDestinationTest {
    @Test
    fun theViewModelReadsTheIdUnderTheNameOfTheRouteProperty() {
        // Renommer la propriété de la route sans la constante ferait planter l'ouverture d'une note.
        assertEquals(NoteDetailViewModel.NOTE_ID_ARG, NoteDetailDestination.serializer().descriptor.getElementName(0))
    }
}
