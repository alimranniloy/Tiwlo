package com.example.social

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.graphics.BitmapFactory
import android.media.AudioAttributes
import android.net.Uri
import android.os.Build
import android.provider.OpenableColumns
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.Data
import androidx.work.ExistingWorkPolicy
import androidx.work.ForegroundInfo
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import androidx.work.workDataOf
import com.example.MainActivity
import com.example.R
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.util.UUID
import java.util.concurrent.TimeUnit

class PostUploadWorker(context: Context, parameters: WorkerParameters) : CoroutineWorker(context, parameters) {
    override suspend fun doWork(): Result {
        val manifestPath = inputData.getString(KEY_MANIFEST) ?: return Result.failure()
        val manifestFile = File(manifestPath)
        if (!manifestFile.exists()) return Result.failure()
        val queueDirectory = manifestFile.parentFile
        val manifest = runCatching { JSONObject(manifestFile.readText()) }.getOrElse { return Result.failure() }
        val notificationId = manifest.optInt("notificationId", id.hashCode())
        setForeground(uploadForeground(notificationId, 1, "Waiting to upload"))
        val repository = SocialRepository(applicationContext)
        if (!repository.hasSavedSession()) return Result.failure(workDataOf(KEY_ERROR to "Sign in again to publish this post"))
        return try {
            val mediaRows = manifest.optJSONArray("media") ?: JSONArray()
            val uploaded = mutableListOf<SocialMedia>()
            for (index in 0 until mediaRows.length()) {
                val row = mediaRows.getJSONObject(index)
                val file = File(row.getString("path"))
                if (!file.exists()) throw SocialApiException("Queued media is no longer available")
                val uri = FileProvider.getUriForFile(applicationContext, "${applicationContext.packageName}.files", file)
                val base = 4 + (index * 78 / mediaRows.length().coerceAtLeast(1))
                val status = "Uploading ${index + 1} of ${mediaRows.length()}"
                setProgress(workDataOf(KEY_PROGRESS to base, KEY_STATUS to status))
                setForeground(uploadForeground(notificationId, base, status))
                uploaded += repository.uploadMedia(applicationContext.contentResolver, uri, "post") { fileProgress ->
                    val progress = 4 + (((index * 100 + fileProgress) * 78) / (mediaRows.length().coerceAtLeast(1) * 100))
                    setProgressAsync(workDataOf(KEY_PROGRESS to progress, KEY_STATUS to status))
                    setForegroundAsync(uploadForeground(notificationId, progress, status))
                }
            }
            setProgress(workDataOf(KEY_PROGRESS to 90, KEY_STATUS to "Publishing to your feed"))
            setForeground(uploadForeground(notificationId, 90, "Publishing to your feed"))
            val type = if (uploaded.any { it.type == "video" }) "video" else "post"
            val metadata = manifest.optJSONObject("metadata")?.toMap().orEmpty()
            val post = repository.createPost(
                manifest.optString("body"), type, uploaded, manifest.optString("visibility", "public"),
                groupId = manifest.optString("groupId").takeIf { it.isNotBlank() },
                commentPermission = manifest.optString("commentPermission", "everyone"),
                metadata = metadata,
                location = manifest.optString("location").takeIf { it.isNotBlank() }
            )
            if (metadata["shareToStory"] == true) {
                runCatching {
                    val storyMedia = uploaded.map { media -> mapOf(
                        "url" to media.url,
                        "type" to media.type,
                        "hlsUrl" to media.hlsUrl,
                        "thumbnailUrl" to media.thumbnailUrl,
                        "mimeType" to media.mimeType,
                        "processingId" to media.processingId,
                        "processingStatus" to media.processingStatus
                    ).filterValues { it != null } }
                    repository.createStory(
                        caption = manifest.optString("body").takeIf { it.isNotBlank() },
                        visibility = manifest.optString("visibility", "public"),
                        metadata = mapOf("sharedPostId" to post.id),
                        items = listOf(
                            mapOf(
                                "type" to when { storyMedia.isEmpty() -> "text"; storyMedia.first()["type"] == "video" -> "video"; else -> "image" },
                                "media" to if (storyMedia.size <= 1) storyMedia.firstOrNull().orEmpty() else mapOf("items" to storyMedia),
                                "text" to manifest.optString("body").takeIf { it.isNotBlank() },
                                "background" to "#111827",
                                "durationMs" to if (storyMedia.firstOrNull()?.get("type") == "video") 60_000 else 5_000,
                                "sortOrder" to 0
                            )
                        )
                    )
                }
            }
            setProgress(workDataOf(KEY_PROGRESS to 100, KEY_STATUS to "Post published", KEY_POST_ID to post.id))
            showComplete(notificationId, post.id)
            queueDirectory?.deleteRecursively()
            Result.success(workDataOf(KEY_PROGRESS to 100, KEY_STATUS to "Post published", KEY_POST_ID to post.id))
        } catch (error: Exception) {
            val message = error.message ?: "Post upload failed"
            val permanent = listOf("blocked", "explicit", "forbidden", "disabled", "verify your email").any { message.contains(it, true) }
            if (!permanent && runAttemptCount < 4) {
                setProgress(workDataOf(KEY_PROGRESS to 0, KEY_STATUS to "Waiting for connection"))
                Result.retry()
            } else {
                showFailure(notificationId, message)
                queueDirectory?.deleteRecursively()
                Result.failure(workDataOf(KEY_ERROR to message))
            }
        }
    }

    private fun uploadForeground(notificationId: Int, progress: Int, status: String): ForegroundInfo {
        ensureChannels(applicationContext)
        val notification = NotificationCompat.Builder(applicationContext, PROGRESS_CHANNEL)
            .setSmallIcon(R.drawable.ic_tiwi_notification)
            .setContentTitle("Uploading your Tiwi post")
            .setContentText(status)
            .setOnlyAlertOnce(true)
            .setOngoing(true)
            .setSilent(true)
            .setProgress(100, progress.coerceIn(0, 100), false)
            .build()
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) ForegroundInfo(notificationId, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
        else ForegroundInfo(notificationId, notification)
    }

    private fun showComplete(notificationId: Int, postId: String) {
        if (!canNotify(applicationContext)) return
        ensureChannels(applicationContext)
        val intent = Intent(applicationContext, MainActivity::class.java).apply {
            action = Intent.ACTION_VIEW
            data = Uri.parse("https://tiwlo.com/social/post/$postId")
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val pending = PendingIntent.getActivity(applicationContext, notificationId, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val manager = NotificationManagerCompat.from(applicationContext)
        manager.cancel(notificationId)
        manager.notify(notificationId xor COMPLETION_NOTIFICATION_MASK, NotificationCompat.Builder(applicationContext, POST_CHANNEL)
            .setSmallIcon(R.drawable.ic_tiwi_notification)
            .setLargeIcon(brandIcon(applicationContext))
            .setContentTitle("Your post is live").setContentText("Tap to view it in your feed")
            .setSound(rawSound(applicationContext, R.raw.tiwi_post_published))
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setOnlyAlertOnce(false)
            .setAutoCancel(true).setContentIntent(pending).build())
    }

    private fun showFailure(notificationId: Int, message: String) {
        if (!canNotify(applicationContext)) return
        ensureChannels(applicationContext)
        NotificationManagerCompat.from(applicationContext).notify(notificationId, NotificationCompat.Builder(applicationContext, PROGRESS_CHANNEL)
            .setSmallIcon(R.drawable.ic_tiwi_notification)
            .setLargeIcon(brandIcon(applicationContext))
            .setContentTitle("Post couldn't be published").setContentText(message)
            .setStyle(NotificationCompat.BigTextStyle().bigText(message)).setAutoCancel(true).build())
    }

    companion object {
        const val TAG = "tiwi_post_upload"
        const val KEY_MANIFEST = "manifest"
        const val KEY_PROGRESS = "progress"
        const val KEY_STATUS = "status"
        const val KEY_POST_ID = "postId"
        const val KEY_ERROR = "error"
        private const val PROGRESS_CHANNEL = "tiwi_post_upload_progress_v2"
        private const val POST_CHANNEL = "tiwi_post_published_brand_v3"
        private const val COMPLETION_NOTIFICATION_MASK = 0x35A17

        suspend fun enqueue(
            context: Context,
            uris: List<Uri>,
            body: String,
            visibility: String,
            commentPermission: String = "everyone",
            groupId: String? = null,
            metadata: Map<String, Any?> = emptyMap(),
            location: String? = null,
            initialDelayMillis: Long = 0L
        ): UUID = withContext(Dispatchers.IO) {
            val queueId = UUID.randomUUID()
            val directory = File(context.filesDir, "post-upload-queue/$queueId").apply { mkdirs() }
            val media = JSONArray()
            try {
                uris.take(20).forEachIndexed { index, uri ->
                    val displayName = context.contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { cursor ->
                        if (cursor.moveToFirst()) cursor.getString(0) else null
                    }.orEmpty()
                    val mime = context.contentResolver.getType(uri).orEmpty()
                    val extension = displayName.substringAfterLast('.', "").takeIf { it.length in 2..6 }
                        ?: when { mime.startsWith("video/") -> "mp4"; mime == "image/png" -> "png"; mime == "image/webp" -> "webp"; else -> "jpg" }
                    val target = File(directory, "media-$index.$extension")
                    context.contentResolver.openInputStream(uri)?.use { input -> target.outputStream().use { output -> input.copyTo(output) } }
                        ?: throw SocialApiException("Selected media could not be prepared")
                    media.put(JSONObject().put("path", target.absolutePath).put("mime", mime))
                }
                val manifest = File(directory, "post.json")
                manifest.writeText(JSONObject()
                    .put("body", body.take(10_000))
                    .put("visibility", visibility)
                    .put("commentPermission", commentPermission)
                    .put("groupId", groupId)
                    .put("metadata", JSONObject(metadata))
                    .put("location", location)
                    .put("notificationId", queueId.hashCode())
                    .put("media", media).toString())
                val request = OneTimeWorkRequestBuilder<PostUploadWorker>()
                    .setInputData(workDataOf(KEY_MANIFEST to manifest.absolutePath))
                    .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
                    .setInitialDelay(initialDelayMillis.coerceAtLeast(0L), TimeUnit.MILLISECONDS)
                    .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 15, TimeUnit.SECONDS)
                    .addTag(TAG)
                    .build()
                WorkManager.getInstance(context).enqueueUniqueWork("$TAG-$queueId", ExistingWorkPolicy.KEEP, request)
                request.id
            } catch (error: Exception) {
                directory.deleteRecursively()
                throw error
            }
        }

        private fun ensureChannels(context: Context) {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
            val manager = context.getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(
                NotificationChannel(PROGRESS_CHANNEL, "Post upload progress", NotificationManager.IMPORTANCE_LOW).apply {
                    description = "Silent background progress for Tiwi posts"
                    setSound(null, null)
                }
            )
            val attributes = AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build()
            manager.createNotificationChannel(
                NotificationChannel(POST_CHANNEL, "Published posts", NotificationManager.IMPORTANCE_DEFAULT).apply {
                    description = "Alerts when your Tiwi post is live"
                    enableVibration(true)
                    setSound(rawSound(context, R.raw.tiwi_post_published), attributes)
                }
            )
        }

        private fun brandIcon(context: Context) = BitmapFactory.decodeResource(
            context.resources,
            R.drawable.tiwi_app_icon,
            BitmapFactory.Options().apply { inSampleSize = 8 }
        )

        private fun rawSound(context: Context, resId: Int): Uri = Uri.parse("android.resource://${context.packageName}/$resId")

        private fun canNotify(context: Context): Boolean = Build.VERSION.SDK_INT < 33 || ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED

        private fun JSONObject.toMap(): Map<String, Any?> = keys().asSequence().associateWith { key ->
            when (val value = opt(key)) {
                is JSONObject -> value.toMap()
                is JSONArray -> (0 until value.length()).map { index ->
                    when (val item = value.opt(index)) {
                        is JSONObject -> item.toMap()
                        JSONObject.NULL -> null
                        else -> item
                    }
                }
                JSONObject.NULL -> null
                else -> value
            }
        }
    }
}
