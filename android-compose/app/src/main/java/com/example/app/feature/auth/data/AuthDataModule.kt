package com.example.app.feature.auth.data

import com.example.app.BuildConfig
import dagger.Binds
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import okhttp3.HttpUrl
import okhttp3.HttpUrl.Companion.toHttpUrl
import retrofit2.Retrofit
import javax.inject.Named
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
abstract class AuthDataModule {
    @Binds
    abstract fun bindAuthRepository(impl: DefaultAuthRepository): AuthRepository

    companion object {
        @Provides
        @Singleton
        fun provideAuthApi(retrofit: Retrofit): AuthApi = retrofit.create(AuthApi::class.java)

        @Provides
        @Named(DefaultAuthRepository.WEB_BASE_URL)
        fun provideWebBaseUrl(): HttpUrl = BuildConfig.WEB_BASE_URL.toHttpUrl()
    }
}
