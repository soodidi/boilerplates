package com.example.app.feature.notes.data

import dagger.Binds
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import retrofit2.Retrofit
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
abstract class NotesDataModule {
    // AND-003 : on injecte l'interface, ce qui permet un fake dans les tests.
    @Binds
    abstract fun bindNotesRepository(impl: DefaultNotesRepository): NotesRepository

    companion object {
        @Provides
        @Singleton
        fun provideNotesApi(retrofit: Retrofit): NotesApi = retrofit.create(NotesApi::class.java)
    }
}
