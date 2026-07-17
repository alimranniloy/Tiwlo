package com.example.social

import android.content.ContentResolver
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.provider.OpenableColumns
import com.example.BuildConfig
import com.squareup.moshi.JsonAdapter
import com.squareup.moshi.Moshi
import com.squareup.moshi.Types
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext
import okhttp3.Cache
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.File
import java.io.IOException
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
        val retryable = isRetryableGraphQlOperation(query)
        repeat(MAX_QUERY_RETRIES + 1) { attempt ->
            try {
                val builder = Request.Builder()
                    .url("$baseUrl/graphql")
                    .header("Accept", "application/json")
                    .header("Cache-Control", "no-cache")
                    .post(payload.toRequestBody(JSON))
                token()?.takeIf { it.isNotBlank() }?.let { builder.header("Authorization", "Bearer $it") }
                return@withContext http.newCall(builder.build()).execute().use { response ->
                    val text = response.body?.string().orEmpty()
                    val root = runCatching { mapAdapter.fromJson(text) }.getOrNull()
                    val errors = root?.list("errors")
                    if (response.code in RETRYABLE_HTTP_CODES && retryable) {
                        throw RetryableApiException("Tiwlo API is temporarily unavailable (${response.code})")
                    }
                    if (!response.isSuccessful || !errors.isNullOrEmpty()) {
                        val error = errors?.firstOrNull()?.objectMap()
                        val message = error?.string("message") ?: root?.string("error") ?: "Tiwlo API request failed (${response.code})"
                        val code = error?.objectValue("extensions")?.string("code")
                        throw SocialApiException(message, code)
                    }
                    root?.objectValue("data")
                        ?: if (retryable) throw RetryableApiException("Tiwlo API returned an incomplete response")
                        else throw SocialApiException("Tiwlo API returned no data")
                }
            } catch (error: Exception) {
                val networkFailure = error is IOException || error is RetryableApiException
                if (!networkFailure || !retryable || attempt >= MAX_QUERY_RETRIES) {
                    if (networkFailure) throw SocialApiException(
                        "Network is weak or unavailable. Your saved content is still safe; please try again.",
                        "NETWORK"
                    )
                    throw error
                }
                delay(RETRY_DELAYS_MS[attempt])
            }
        }
        throw SocialApiException("Network is weak or unavailable. Your saved content is still safe; please try again.", "NETWORK")
    }

    suspend fun getJson(path: String): Map<String, Any?> = requestJson(Request.Builder().url(absoluteUrl(path).orEmpty()).get().build())

    suspend fun postJson(path: String, value: Map<String, Any?>): Map<String, Any?> {
        val request = Request.Builder().url(absoluteUrl(path).orEmpty()).post(mapAdapter.toJson(value).toRequestBody(JSON)).build()
        return requestJson(request)
    }

    private suspend fun requestJson(request: Request): Map<String, Any?> = withContext(Dispatchers.IO) {
        val retryable = request.method == "GET"
        repeat(MAX_QUERY_RETRIES + 1) { attempt ->
            try {
                return@withContext http.newCall(request).execute().use { response ->
                    val text = response.body?.string().orEmpty()
                    val value = runCatching { mapAdapter.fromJson(text) }.getOrNull()
                    if (response.code in RETRYABLE_HTTP_CODES && retryable) throw RetryableApiException("Secure API is temporarily unavailable")
                    if (!response.isSuccessful || value == null) throw SocialApiException(value?.string("error") ?: "Secure API request failed (${response.code})")
                    value
                }
            } catch (error: Exception) {
                val networkFailure = error is IOException || error is RetryableApiException
                if (!networkFailure || !retryable || attempt >= MAX_QUERY_RETRIES) {
                    if (networkFailure) throw SocialApiException(
                        "Network is weak or unavailable. Please check the connection and try again.",
                        "NETWORK"
                    )
                    throw error
                }
                delay(RETRY_DELAYS_MS[attempt])
            }
        }
        throw SocialApiException("Network is weak or unavailable. Please check the connection and try again.", "NETWORK")
    }

    suspend fun uploadMedia(resolver: ContentResolver, uri: Uri, kind: String, onProgress: ((Int) -> Unit)? = null): MediaUploadResult = withContext(Dispatchers.IO) {
        val name = resolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { cursor ->
            if (cursor.moveToFirst()) cursor.getString(0) else null
        } ?: "upload-${System.currentTimeMillis()}"
        val mime = resolver.getType(uri) ?: "application/octet-stream"
        val temp = File.createTempFile("tiwi-", "-${name.replace(Regex("[^a-zA-Z0-9._-]"), "_")}", cacheDirectory)
        try {
            resolver.openInputStream(uri)?.use { input -> temp.outputStream().use(input::copyTo) }
                ?: throw SocialApiException("Selected media could not be opened")
            var uploadName = name
            var uploadMime = mime
            if (mime.startsWith("image/") && kind in setOf("profile", "cover")) {
                if (normalizeProfileImage(temp, kind)) {
                    uploadName = "${name.substringBeforeLast('.', name)}.jpg"
                    uploadMime = "image/jpeg"
                }
            }
            var uploaded = if (temp.length() > CHUNK_THRESHOLD) uploadMediaInChunks(temp, uploadName, uploadMime, kind, onProgress)
            else uploadMediaMultipart(temp, uploadName, uploadMime, kind, onProgress)
            onProgress?.invoke(95)
            if (uploadMime.startsWith("video/") && uploaded.thumbnailUrl.isNullOrBlank()) {
                uploaded = attachGeneratedThumbnail(temp, uploadName, uploaded)
            }
            awaitMediaPreview(uploaded, onProgress)
        } finally { temp.delete() }
    }

    private fun normalizeProfileImage(file: File, kind: String): Boolean {
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeFile(file.absolutePath, bounds)
        if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return false
        var sample = 1
        while (bounds.outWidth / sample > 4096 || bounds.outHeight / sample > 4096) sample *= 2
        val source = BitmapFactory.decodeFile(file.absolutePath, BitmapFactory.Options().apply { inSampleSize = sample }) ?: return false
        try {
            val ratio = if (kind == "cover") 16f / 7f else 1f
            val sourceRatio = source.width.toFloat() / source.height.coerceAtLeast(1)
            val cropWidth: Int
            val cropHeight: Int
            if (sourceRatio > ratio) {
                cropHeight = source.height
                cropWidth = (cropHeight * ratio).toInt().coerceAtMost(source.width)
            } else {
                cropWidth = source.width
                cropHeight = (cropWidth / ratio).toInt().coerceAtMost(source.height)
            }
            val cropped = Bitmap.createBitmap(
                source,
                ((source.width - cropWidth) / 2).coerceAtLeast(0),
                ((source.height - cropHeight) / 2).coerceAtLeast(0),
                cropWidth.coerceAtLeast(1),
                cropHeight.coerceAtLeast(1)
            )
            try {
                val maxWidth = if (kind == "cover") 1600 else 1080
                val maxHeight = if (kind == "cover") 700 else 1080
                val scale = minOf(1f, maxWidth.toFloat() / cropped.width, maxHeight.toFloat() / cropped.height)
                val output = if (scale < 1f) {
                    Bitmap.createScaledBitmap(
                        cropped,
                        (cropped.width * scale).toInt().coerceAtLeast(1),
                        (cropped.height * scale).toInt().coerceAtLeast(1),
                        true
                    )
                } else cropped
                try {
                    file.outputStream().use { stream ->
                        if (!output.compress(Bitmap.CompressFormat.JPEG, 90, stream)) {
                            throw SocialApiException("Photo could not be prepared")
                        }
                    }
                } finally {
                    if (output !== cropped) output.recycle()
                }
            } finally {
                if (cropped !== source) cropped.recycle()
            }
        } finally {
            source.recycle()
        }
        return true
    }

    private suspend fun uploadMediaMultipart(temp: File, name: String, mime: String, kind: String, onProgress: ((Int) -> Unit)?): MediaUploadResult {
        val body = MultipartBody.Builder().setType(MultipartBody.FORM)
            .addFormDataPart("kind", kind)
            .addFormDataPart("file", name, temp.asRequestBody(mime.toMediaType()))
            .build()
        val builder = Request.Builder().url("$baseUrl/api/social/media").post(body).header("Accept", "application/json")
        token()?.let { builder.header("Authorization", "Bearer $it") }
        onProgress?.invoke(5)
        return http.newCall(builder.build()).execute().use { response ->
            val text = response.body?.string().orEmpty()
            val value = runCatching { mapAdapter.fromJson(text) }.getOrNull()
            if (response.code == 413) return uploadMediaInChunks(temp, name, mime, kind, onProgress)
            if (!response.isSuccessful || value == null) throw SocialApiException(value?.string("error") ?: "Media upload failed (${response.code})")
            mediaResult(value, mime, kind)
        }
    }

    private suspend fun attachGeneratedThumbnail(video: File, originalName: String, result: MediaUploadResult): MediaUploadResult {
        val thumbnail = File.createTempFile("tiwi-video-thumb-", ".jpg", cacheDirectory)
        val retriever = MediaMetadataRetriever()
        return try {
            retriever.setDataSource(video.absolutePath)
            val frame = retriever.getFrameAtTime(1_000_000L, MediaMetadataRetriever.OPTION_CLOSEST_SYNC)
                ?: retriever.getFrameAtTime(0L, MediaMetadataRetriever.OPTION_CLOSEST_SYNC)
                ?: return result
            val largest = maxOf(frame.width, frame.height).coerceAtLeast(1)
            val scale = minOf(1f, 960f / largest.toFloat())
            val scaled = if (scale < 1f) Bitmap.createScaledBitmap(frame, (frame.width * scale).toInt().coerceAtLeast(1), (frame.height * scale).toInt().coerceAtLeast(1), true) else frame
            thumbnail.outputStream().use { scaled.compress(Bitmap.CompressFormat.JPEG, 84, it) }
            if (scaled !== frame) frame.recycle()
            scaled.recycle()
            if (thumbnail.length() == 0L) return result
            val uploadedThumbnail = uploadMediaMultipart(thumbnail, "${originalName.substringBeforeLast('.')}-thumbnail.jpg", "image/jpeg", "thumbnail", null)
            result.copy(thumbnailUrl = uploadedThumbnail.sourceUrl)
        } catch (_: Exception) {
            result
        } finally {
            retriever.release()
            thumbnail.delete()
        }
    }

    private suspend fun uploadMediaInChunks(temp: File, name: String, mime: String, kind: String, onProgress: ((Int) -> Unit)?): MediaUploadResult {
        val start = authenticatedUploadJson(
            Request.Builder()
                .url("$baseUrl/api/social/media/chunks/start")
                .post(mapAdapter.toJson(mapOf("name" to name, "mimeType" to mime, "size" to temp.length(), "kind" to kind)).toRequestBody(JSON))
        )
        val uploadId = start.string("uploadId") ?: throw SocialApiException("Chunked upload did not start")
        val chunkSize = (start.number("chunkSize")?.toInt() ?: DEFAULT_CHUNK_SIZE).coerceIn(64 * 1024, 900 * 1024)
        var sent = 0L
        var index = 0
        temp.inputStream().buffered().use { input ->
            val buffer = ByteArray(chunkSize)
            while (true) {
                val count = input.read(buffer)
                if (count < 0) break
                if (count == 0) continue
                authenticatedUploadJson(
                    Request.Builder()
                        .url("$baseUrl/api/social/media/chunks/$uploadId/$index")
                        .post(buffer.copyOf(count).toRequestBody(OCTET))
                )
                sent += count
                index += 1
                onProgress?.invoke(((sent * 95L) / temp.length()).toInt().coerceIn(1, 95))
            }
        }
        val complete = authenticatedUploadJson(
            Request.Builder().url("$baseUrl/api/social/media/chunks/$uploadId/complete").post(EMPTY_BODY)
        )
        return mediaResult(complete, mime, kind)
    }

    private suspend fun awaitMediaPreview(initial: MediaUploadResult, onProgress: ((Int) -> Unit)?): MediaUploadResult {
        if (!initial.mimeType.startsWith("video/") || initial.processingStatus == "ready" || initial.processingId.isBlank()) {
            onProgress?.invoke(100)
            return initial
        }
        var latest = initial
        repeat(20) { attempt ->
            delay(1000)
            val status = runCatching {
                authenticatedUploadJson(Request.Builder().url("$baseUrl/api/social/media/${initial.processingId}/status").get())
            }.getOrNull()
            if (status != null) {
                val polled = mediaResult(status, initial.mimeType, initial.kind)
                latest = polled.copy(
                    processingId = initial.processingId,
                    sourceUrl = polled.sourceUrl.ifBlank { initial.sourceUrl },
                    hlsUrl = polled.hlsUrl ?: initial.hlsUrl,
                    thumbnailUrl = polled.thumbnailUrl ?: initial.thumbnailUrl
                )
                onProgress?.invoke((96 + attempt / 5).coerceAtMost(99))
                if (!latest.thumbnailUrl.isNullOrBlank() || latest.processingStatus in setOf("ready", "failed")) {
                    onProgress?.invoke(100)
                    return latest
                }
            }
        }
        onProgress?.invoke(100)
        return latest
    }

    private fun authenticatedUploadJson(builder: Request.Builder): Map<String, Any?> {
        builder.header("Accept", "application/json")
        token()?.takeIf { it.isNotBlank() }?.let { builder.header("Authorization", "Bearer $it") }
        http.newCall(builder.build()).execute().use { response ->
            val text = response.body?.string().orEmpty()
            val value = runCatching { mapAdapter.fromJson(text) }.getOrNull()
            if (!response.isSuccessful || value == null) throw SocialApiException(value?.string("error") ?: "Chunked media upload failed (${response.code})")
            return value
        }
    }

    private fun mediaResult(value: Map<String, Any?>, fallbackMime: String, fallbackKind: String) = MediaUploadResult(
        processingId = value.string("processingId").orEmpty(), kind = value.string("kind") ?: fallbackKind,
        mimeType = value.string("mimeType") ?: fallbackMime, sourceUrl = absoluteUrl(value.string("sourceUrl")).orEmpty(),
        hlsUrl = absoluteUrl(value.string("hlsUrl")), thumbnailUrl = absoluteUrl(value.string("thumbnailUrl")),
        processingStatus = value.string("processingStatus") ?: value.string("status") ?: "ready"
    )

    fun absoluteUrl(path: String?): String? {
        val clean = path?.trim()?.takeIf { it.isNotEmpty() } ?: return null
        if (clean.startsWith("http://") || clean.startsWith("https://")) return clean
        return runCatching { URI("$baseUrl/").resolve(clean.removePrefix("/")).toString() }.getOrDefault("$baseUrl/${clean.removePrefix("/")}")
    }

    private companion object {
        const val CHUNK_THRESHOLD = 512L * 1024L
        const val DEFAULT_CHUNK_SIZE = 768 * 1024
        const val MAX_QUERY_RETRIES = 2
        val RETRY_DELAYS_MS = longArrayOf(350L, 900L)
        val RETRYABLE_HTTP_CODES = setOf(408, 425, 429, 500, 502, 503, 504)
        val JSON = "application/json; charset=utf-8".toMediaType()
        val OCTET = "application/octet-stream".toMediaType()
        val EMPTY_BODY: RequestBody = ByteArray(0).toRequestBody(OCTET)
    }
}

private class RetryableApiException(message: String) : IOException(message)

internal fun isRetryableGraphQlOperation(query: String): Boolean {
    val operation = query.trimStart()
    return operation.startsWith("query", ignoreCase = true) || operation.startsWith("{")
}

internal fun Any?.objectMap(): Map<String, Any?>? = (this as? Map<*, *>)?.entries?.associate { it.key.toString() to it.value }
internal fun Map<String, Any?>.objectValue(key: String): Map<String, Any?>? = this[key].objectMap()
internal fun Map<String, Any?>.list(key: String): List<Any?> = this[key] as? List<Any?> ?: emptyList()
internal fun Map<String, Any?>.string(key: String): String? = this[key]?.toString()?.takeUnless { it == "null" }
internal fun Map<String, Any?>.boolean(key: String): Boolean = this[key] as? Boolean ?: false
internal fun Map<String, Any?>.number(key: String): Number? = this[key] as? Number
