package com.example.app.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.example.app.feature.notes.ui.NotesRoute
import kotlinx.serialization.Serializable

/** AND-002 : routes typées. Les arguments sont des identifiants, jamais des objets complets. */
@Serializable
data object NotesDestination

@Composable
fun AppNavHost() {
    val navController = rememberNavController()
    NavHost(navController = navController, startDestination = NotesDestination) {
        composable<NotesDestination> { NotesRoute() }
    }
}
