package com.example.app.navigation

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavDestination.Companion.hasRoute
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navigation
import com.example.app.core.auth.SessionState
import com.example.app.feature.auth.ui.ForgotPasswordRoute
import com.example.app.feature.auth.ui.SignInRoute
import com.example.app.feature.auth.ui.SignUpRoute
import com.example.app.feature.notes.ui.NotesRoute
import kotlinx.serialization.Serializable
import kotlin.reflect.KClass

/** AND-002 : routes typées. Les arguments sont des identifiants, jamais des objets complets. */
@Serializable
data object LoadingDestination

/** Écrans accessibles sans session. */
@Serializable
data object AuthGraph

@Serializable
data object SignInDestination

@Serializable
data object SignUpDestination

@Serializable
data object ForgotPasswordDestination

/** Écrans qui exigent une session. */
@Serializable
data object MainGraph

@Serializable
data object NotesDestination

@Composable
fun AppNavHost(viewModel: SessionViewModel = hiltViewModel()) {
    val session by viewModel.session.collectAsStateWithLifecycle()
    val navController = rememberNavController()

    // La session décide du graphe affiché. En changer vide la pile : à la déconnexion (ou au
    // premier 401), les ViewModels des écrans connectés et leurs données sont détruits.
    LaunchedEffect(session) {
        when (session) {
            SessionState.Loading -> Unit
            SessionState.SignedOut -> navController.showGraph(AuthGraph)
            SessionState.SignedIn -> navController.showGraph(MainGraph)
        }
    }

    NavHost(navController = navController, startDestination = LoadingDestination) {
        composable<LoadingDestination> {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
        }
        navigation<AuthGraph>(startDestination = SignInDestination) {
            composable<SignInDestination> {
                SignInRoute(
                    onSignUp = { navController.navigate(SignUpDestination) },
                    onForgotPassword = { navController.navigate(ForgotPasswordDestination) },
                )
            }
            composable<SignUpDestination> { SignUpRoute(onBackToSignIn = navController::popBackStack) }
            composable<ForgotPasswordDestination> { ForgotPasswordRoute(onBackToSignIn = navController::popBackStack) }
        }
        navigation<MainGraph>(startDestination = NotesDestination) {
            composable<NotesDestination> { NotesRoute(onSignOut = viewModel::signOut) }
        }
    }
}

/** Ouvre `graph` à la place de toute la pile, sauf s'il est déjà affiché (rotation, retour au premier plan). */
private fun NavHostController.showGraph(graph: Any) {
    val graphClass: KClass<*> = graph::class
    if (currentDestination?.hierarchy?.any { it.hasRoute(graphClass) } == true) return
    navigate(graph) { popUpTo(this@showGraph.graph.id) { inclusive = true } }
}
