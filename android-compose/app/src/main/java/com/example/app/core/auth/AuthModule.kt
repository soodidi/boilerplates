package com.example.app.core.auth

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.core.handlers.ReplaceFileCorruptionHandler
import androidx.datastore.preferences.core.PreferenceDataStoreFactory
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.emptyPreferences
import androidx.datastore.preferences.preferencesDataStoreFile
import dagger.Binds
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
abstract class AuthModule {
    @Binds
    abstract fun bindSessionStore(impl: EncryptedSessionStore): SessionStore

    @Binds
    abstract fun bindTokenCipher(impl: TinkTokenCipher): TokenCipher

    companion object {
        @Provides
        @Singleton
        @SecureDataStore
        fun provideSecureDataStore(
            @ApplicationContext context: Context,
        ): DataStore<Preferences> =
            PreferenceDataStoreFactory.create(
                // Fichier corrompu : on repart sans session plutôt que de bloquer l'app.
                corruptionHandler = ReplaceFileCorruptionHandler { emptyPreferences() },
                // datastore/secure.preferences_pb, exclu des sauvegardes (res/xml).
                produceFile = { context.preferencesDataStoreFile("secure") },
            )

        @Provides
        @IoDispatcher
        fun provideIoDispatcher(): CoroutineDispatcher = Dispatchers.IO
    }
}
