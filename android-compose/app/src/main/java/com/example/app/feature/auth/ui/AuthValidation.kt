package com.example.app.feature.auth.ui

import androidx.annotation.StringRes
import com.example.app.R
import com.example.app.feature.auth.data.AuthException
import com.example.app.feature.auth.data.AuthFailure

/** BE-006 : mêmes bornes que l'API (auth.config.ts) et le front web. */
internal const val PASSWORD_MIN_LENGTH = 12
internal const val PASSWORD_MAX_LENGTH = 128
internal const val NAME_MAX_LENGTH = 100

// Vérification de forme seulement : c'est l'e-mail de vérification qui prouve l'adresse.
private val EMAIL_PATTERN = Regex("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")

@StringRes
internal fun emailError(email: String): Int? =
    when {
        email.isBlank() -> R.string.validation_required
        !EMAIL_PATTERN.matches(email) -> R.string.auth_email_invalid
        else -> null
    }

@StringRes
internal fun newPasswordError(password: String): Int? =
    when {
        password.length < PASSWORD_MIN_LENGTH -> R.string.auth_password_too_short
        password.length > PASSWORD_MAX_LENGTH -> R.string.auth_password_too_long
        else -> null
    }

@StringRes
internal fun nameError(name: String): Int? =
    when {
        name.isBlank() -> R.string.validation_required
        name.length > NAME_MAX_LENGTH -> R.string.auth_name_too_long
        else -> null
    }

/** Adresse telle que l'API la stocke : sans espaces, en minuscules. */
internal fun normalizeEmail(email: String) = email.trim().lowercase()

/** BE-006 : messages génériques, qui ne disent jamais si un compte existe. */
@StringRes
internal fun Throwable.toMessage(): Int =
    when ((this as? AuthException)?.failure) {
        AuthFailure.InvalidCredentials -> R.string.auth_error_invalid_credentials
        AuthFailure.EmailNotVerified -> R.string.auth_error_email_not_verified
        AuthFailure.TooManyAttempts -> R.string.auth_error_too_many_attempts
        AuthFailure.Network -> R.string.auth_error_network
        AuthFailure.Unknown, null -> R.string.auth_error_generic
    }
