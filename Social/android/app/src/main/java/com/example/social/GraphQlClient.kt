package com.example.social

import android.content.ContentResolver
import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import com.example.BuildConfig
import com.squareup.moshi.JsonAdapter
import com.squareup.moshi.Moshi
import com.squareup.moshi.Types
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.Cache
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.File
import java.net.URI
import java.util.concurrent.TimeUnit

internal class GraphQlClient(context: Context, private val token: () -> String?) {
    private val baseUrl = BuildConfig.TIWLO_API_BASE_URL.trimEnd('/')
    private val cacheDirectory = context.cacheDir
    private val jsonType = Types.newParameterizedType(Map::class.java, String::class.java, Any::class.java)
    private val moshi = Moshi.Builder().add(KotlinJsonAdapterFactory()).build()
    private val mapAdapter: JsonAdapter<Map<String, Any?>> = moshi.adapter(jsonType)
    private val http = OkHttpClient.Builder()
        .cache(Cache(File(context.cacheDir, "tiwi_http"), 128L * 1024 * 1024))
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(35, TimeUnit.SECONDS)
        .writeTimeout(120, TimeUnit.SECONDS)
        .retryOnConnectionFailure(true)
        .build()

    suspend fun execute(query: String, variables: Map<String, Any?> = emptyMap()): Map<String, Any?> = withContext(Dispatchers.IO) {
        val payload = mapAdapter.toJson(mapOf("query" to query, "variables" to variables))
        val builder = Request.Builder()
            .url("$baseUrl/graphql")
            .header("Accept", "application/json")
            .header("Cache-Control", "no-cache")
            .post(payload.toRequestBody(JSON))
        token()?.takeIf { it.isNotBlank() }?.let { builder.header("Authorization", "Bearer $it") }
        http.newCall(builder.build()).execute().use { response ->
            val text = response.body?.string().orEmpty()
            val root = runCatching { mapAdapter.fromJson(text) }.getOrNull()
            val errors = root?.list("errors")
            if (!response.isSuccessful || !errors.isNullOrEmpty()) {
                val error = errors?.firstOrNull()?.objectMap()
                val message = error?.string("message") ?: root?.string("error") ?: "Tiwlo API request failed (${response.code})"
                val code = error?.objectValue("extensions")?.string("code")
                throw SocialApiException(message, code)
            }
            root?.objectValue("data") ?: throw SocialApiException("Tiwlo API returned no data")
        }
    }

    suspend fun getJson(path: String): Map<String, Any?> = requestJson(Request.Builder().url(absoluteUrl(path).orEmpty()).get().build())

    suspend fun postJson(path: String, value: Map<String, Any?>): Map<String, Any?> {
        val request = Request.Builder().url(absoluteUrl(path).orEmpty()).post(mapAdapter.toJson(value).toRequestBody(JSON)).build()
        return requestJson(request)
    }

    private suspend fun requestJson(request: Request): Map<String, Any?> = withContext(Dispatchers.IO) {
        http.newCall(request).execute().use { response ->
            val text = response.body?.string().orEmpty()
            val value = runCatching { mapAdapter.fromJson(text) }.getOrNull()
            if (!response.isSuccessful || value == null) throw SocialApiException(value?.string("error") ?: "Secure API request failed (${response.code})")
            value
        }
    }

    suspend fun uploadMedia(resolver: ContentResolver, uri: Uri, kind: String): MediaUploadResult = withContext(Dispatchers.IO) {
        val name = resolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { cursor ->
            if (cursor.moveToFirst()) cursor.getString(0) else null
        } ?: "upload-${System.currentTimeMillis()}"
        val mime = resolver.getType(uri) ?: "application/octet-stream"
        val temp = File.createTempFile("tiwi-", "-${name.replace(Regex("[^a-zA-Z0-9._-]"), "_")}", cacheDirectory)
        try {
            resolver.openInputStream(uri)?.use { input -> temp.outputStream().use(input::copyTo) }
                ?: throw SocialApiException("Selected media could not be opened")
            val body = MultipartBody.Builder().setType(MultipartBody.FORM)
                .addFormDataPart("kind", kind)
                .addFormDataPart("file", name, temp.asRequestBody(mime.toMediaType()))
                .build()
            val builder = Request.Builder().url("$baseUrl/api/social/media").post(body).header("Accept", "application/json")
            token()?.let { builder.header("Authorization", "Bearer $it") }
            http.newCall(builder.build()).execute().use { response ->
                val text = response.body?.string().orEmpty()
                val value = runCatching { mapAdapter.fromJson(text) }.getOrNull()
                if (!response.isSuccessful || value == null) throw SocialApiException(value?.string("error") ?: "Media upload failed (${response.code})")
                MediaUploadResult(
                    processingId = value.string("processingId").orEmpty(), kind = value.string("kind") ?: kind,
                    mimeType = value.string("mimeType") ?: mime, sourceUrl = absoluteUrl(value.string("sourceUrl")).orEmpty(),
                    hlsUrl = absoluteUrl(value.string("hlsUrl")), processingStatus = value.string("processingStatus") ?: "ready"
                )
            }
        } finally { temp.delete() }
    }

    fun absoluteUrl(path: String?): String? {
        val clean = path?.trim()?.takeIf { it.isNotEmpty() } ?: return null
        if (clean.startsWith("http://") || clean.startsWith("https://")) return clean
        return runCatching { URI("$baseUrl/").resolve(clean.removePrefix("/")).toString() }.getOrDefault("$baseUrl/${clean.removePrefix("/")}")
    }

    private companion object { val JSON = "application/json; charset=utf-8".toMediaType() }
}

internal fun Any?.objectMap(): Map<String, Any?>? = (this as? Map<*, *>)?.entries?.associate { it.key.toString() to it.value }
internal fun Map<String, Any?>.objectValue(key: String): Map<String, Any?>? = this[key].objectMap()
internal fun Map<String, Any?>.list(key: String): List<Any?> = this[key] as? List<Any?> ?: emptyList()
internal fun Map<String, Any?>.string(key: String): String? = this[key]?.toString()?.takeUnless { it == "null" }
internal fun Map<String, Any?>.boolean(key: String): Boolean = this[key] as? Boolean ?: false
internal fun Map<String, Any?>.number(key: String): Number? = this[key] as? Number
