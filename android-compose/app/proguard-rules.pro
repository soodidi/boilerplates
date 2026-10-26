# Règles R8 spécifiques au projet. Retrofit, OkHttp et kotlinx.serialization embarquent leurs propres règles.
# Conserver les DTO sérialisés (noms des champs JSON).
-keep,includedescriptorclasses class com.example.app.**.data.**Dto { *; }
