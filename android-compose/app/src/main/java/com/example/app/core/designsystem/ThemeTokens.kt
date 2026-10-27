// Généré par @soodidi/design-tokens (thème « Épuré ») : ne pas modifier, régénérer (GLB-012).
package com.example.app.core.designsystem

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Shapes
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

internal object ThemeTokens {
    const val NAME = "clean"

    val lightColors =
        lightColorScheme(
            primary = Color(0xFF18181B),
            onPrimary = Color(0xFFFAFAFA),
            primaryContainer = Color(0xFFEEF2FF),
            onPrimaryContainer = Color(0xFF3730A3),
            inversePrimary = Color(0xFFFAFAFA),
            secondary = Color(0xFFF4F4F5),
            onSecondary = Color(0xFF18181B),
            secondaryContainer = Color(0xFFF4F4F5),
            onSecondaryContainer = Color(0xFF18181B),
            tertiary = Color(0xFFEEF2FF),
            onTertiary = Color(0xFF3730A3),
            tertiaryContainer = Color(0xFFEEF2FF),
            onTertiaryContainer = Color(0xFF3730A3),
            background = Color(0xFFFFFFFF),
            onBackground = Color(0xFF18181B),
            surface = Color(0xFFFFFFFF),
            onSurface = Color(0xFF18181B),
            surfaceVariant = Color(0xFFF4F4F5),
            onSurfaceVariant = Color(0xFF52525B),
            surfaceTint = Color(0xFF18181B),
            inverseSurface = Color(0xFF18181B),
            inverseOnSurface = Color(0xFFFFFFFF),
            error = Color(0xFFDC2626),
            onError = Color(0xFFFFFFFF),
            errorContainer = Color(0xFFDC2626),
            onErrorContainer = Color(0xFFFFFFFF),
            outline = Color(0xFF8D8D96),
            outlineVariant = Color(0xFFE4E4E7),
            scrim = Color(0xFF000000),
            surfaceBright = Color(0xFFFFFFFF),
            surfaceDim = Color(0xFFF4F4F5),
            surfaceContainerLowest = Color(0xFFFFFFFF),
            surfaceContainerLow = Color(0xFFFFFFFF),
            surfaceContainer = Color(0xFFF4F4F5),
            surfaceContainerHigh = Color(0xFFF4F4F5),
            surfaceContainerHighest = Color(0xFFF4F4F5),
        )

    val darkColors =
        darkColorScheme(
            primary = Color(0xFFFAFAFA),
            onPrimary = Color(0xFF18181B),
            primaryContainer = Color(0xFF1E1B4B),
            onPrimaryContainer = Color(0xFFC7D2FE),
            inversePrimary = Color(0xFF18181B),
            secondary = Color(0xFF27272A),
            onSecondary = Color(0xFFFAFAFA),
            secondaryContainer = Color(0xFF27272A),
            onSecondaryContainer = Color(0xFFFAFAFA),
            tertiary = Color(0xFF1E1B4B),
            onTertiary = Color(0xFFC7D2FE),
            tertiaryContainer = Color(0xFF1E1B4B),
            onTertiaryContainer = Color(0xFFC7D2FE),
            background = Color(0xFF0B0B0D),
            onBackground = Color(0xFFFAFAFA),
            surface = Color(0xFF0B0B0D),
            onSurface = Color(0xFFFAFAFA),
            surfaceVariant = Color(0xFF27272A),
            onSurfaceVariant = Color(0xFFA1A1AA),
            surfaceTint = Color(0xFFFAFAFA),
            inverseSurface = Color(0xFFFAFAFA),
            inverseOnSurface = Color(0xFF0B0B0D),
            error = Color(0xFFF87171),
            onError = Color(0xFF450A0A),
            errorContainer = Color(0xFFF87171),
            onErrorContainer = Color(0xFF450A0A),
            outline = Color(0xFF63636D),
            outlineVariant = Color(0xFF27272A),
            scrim = Color(0xFF000000),
            surfaceBright = Color(0xFF18181B),
            surfaceDim = Color(0xFF27272A),
            surfaceContainerLowest = Color(0xFF18181B),
            surfaceContainerLow = Color(0xFF18181B),
            surfaceContainer = Color(0xFF27272A),
            surfaceContainerHigh = Color(0xFF27272A),
            surfaceContainerHighest = Color(0xFF27272A),
        )

    val lightStatus =
        StatusColors(
            success = Color(0xFF15803D),
            onSuccess = Color(0xFFFFFFFF),
            warning = Color(0xFFB45309),
            onWarning = Color(0xFFFFFFFF),
        )

    val darkStatus =
        StatusColors(
            success = Color(0xFF4ADE80),
            onSuccess = Color(0xFF052E16),
            warning = Color(0xFFFBBF24),
            onWarning = Color(0xFF451A03),
        )

    val shapes =
        Shapes(
            extraSmall = RoundedCornerShape(4.dp),
            small = RoundedCornerShape(4.dp),
            medium = RoundedCornerShape(6.dp),
            large = RoundedCornerShape(9.dp),
            extraLarge = RoundedCornerShape(9.dp),
        )
}
