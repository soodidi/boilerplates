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
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.compose.dropUnlessResumed
import androidx.navigation.NavDestination.Companion.hasRoute
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navigation
import com.example.app.R
import com.example.app.core.auth.SessionState
import com.example.app.feature.auth.ui.AccountRoute
import com.example.app.feature.auth.ui.ForgotPasswordRoute
import com.example.app.feature.auth.ui.SignInRoute
import com.example.app.feature.auth.ui.SignUpRoute
import com.example.app.feature.notes.ui.NoteDetailRoute
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

/** BE-010 : `id` est lu par `NoteDetailViewModel` (même nom de propriété). */
@Serializable
data class NoteDetailDestination(
    val id: String,
)

@Serializable
data object AccountDestination

@Composable
fun AppNavHost(viewModel: SessionViewModel = hiltViewModel()) {
    val session by viewModel.session.collectAsStateWithLifecycle()
    val accountDeleted by viewModel.accountDeleted.collectAsStateWithLifecycle()
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
                    notice = if (accountDeleted) R.string.account_deleted else null,
                )
            }
            composable<SignUpDestination> { SignUpRoute(onBackToSignIn = navController::popBackStack) }
            composable<ForgotPasswordDestination> { ForgotPasswordRoute(onBackToSignIn = navController::popBackStack) }
        }
        navigation<MainGraph>(startDestination = NotesDestination) {
            composable<NotesDestination> {
                // dropUnlessResumed : un double appui n'ouvre pas deux écrans « Mon compte ».
                NotesRoute(
                    onOpenAccount = dropUnlessResumed { navController.navigate(AccountDestination) },
                    onOpenNote = { id -> navController.navigateOnce(NoteDetailDestination(id)) },
                )
            }
            composable<NoteDetailDestination> {
                NoteDetailRoute(onBack = dropUnlessResumed { navController.popBackStack() })
            }
            composable<AccountDestination> {
                AccountRoute(
                    onBack = dropUnlessResumed { navController.popBackStack() },
                    onSignOut = viewModel::signOut,
                    onAccountDeleted = viewModel::onAccountDeleted,
                )
            }
        }
    }
}

/** Un double appui sur une note n'empile pas deux écrans de détail (`dropUnlessResumed` ne prend pas d'argument). */
private fun NavHostController.navigateOnce(destination: Any) {
    if (currentBackStackEntry?.lifecycle?.currentState == Lifecycle.State.RESUMED) navigate(destination)
}

/** Ouvre `graph` à la place de toute la pile, sauf s'il est déjà affiché (rotation, retour au premier plan). */
private fun NavHostController.showGraph(graph: Any) {
    val graphClass: KClass<*> = graph::class
    if (currentDestination?.hierarchy?.any { it.hasRoute(graphClass) } == true) return
    navigate(graph) { popUpTo(this@showGraph.graph.id) { inclusive = true } }
}
