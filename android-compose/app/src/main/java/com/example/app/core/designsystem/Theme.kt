package com.example.app.core.designsystem

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp

// AND-001 / GLB-012 : couleurs, formes et espacements centralisés ici, jamais en dur dans les écrans.
// Les couleurs et formes viennent de ThemeTokens.kt, généré par @soodidi/design-tokens :
// pour changer de thème, remplacer ce fichier par celui du thème voulu (generated/android/<thème>/).

/** Couleurs de statut absentes de Material 3. */
@Immutable
data class StatusColors(
    val success: Color,
    val onSuccess: Color,
    val warning: Color,
    val onWarning: Color,
)

private val LocalStatusColors = staticCompositionLocalOf { ThemeTokens.lightStatus }

object Spacing {
    val small = 8.dp
    val medium = 16.dp
    val large = 24.dp
}

/** Accès aux couleurs de statut : `AppTheme.status.success`. */
object AppTheme {
    val status: StatusColors
        @Composable
        @ReadOnlyComposable
        get() = LocalStatusColors.current
}

@Composable
fun AppTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    // Couleurs dynamiques Android 12+ : désactivées par défaut pour garder l'identité du thème.
    dynamicColor: Boolean = false,
    content: @Composable () -> Unit,
) {
    val colorScheme =
        when {
            dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
                val context = LocalContext.current
                if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
            }
            darkTheme -> ThemeTokens.darkColors
            else -> ThemeTokens.lightColors
        }
    val status = if (darkTheme) ThemeTokens.darkStatus else ThemeTokens.lightStatus
    CompositionLocalProvider(LocalStatusColors provides status) {
        MaterialTheme(colorScheme = colorScheme, shapes = ThemeTokens.shapes, content = content)
    }
}
