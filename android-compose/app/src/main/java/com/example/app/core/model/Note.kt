package com.example.app.core.model

import java.time.Instant

/** Modèle du domaine : l'UI ne voit jamais un DTO réseau (AND-002). */
data class Note(
    val id: String,
    val title: String,
    val content: String,
    val createdAt: Instant,
)
