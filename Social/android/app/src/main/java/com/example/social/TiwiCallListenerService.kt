package com.example.social

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.PackageManager
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.example.MainActivity
import com.example.R
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * Keeps authenticated call signaling alive while Tiwi is backgrounded.
 * FCM can replace the polling transport later without changing the call UI/signaling contract.
 */
class TiwiCallListenerService : Service() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var pollJob: Job? = null
    private lateinit var repository: SocialRepository
    private var shownCallId: String? = null
    private var notificationPollTick = 0

    override fun onCreate() {
        super.onCreate()
        repository = SocialRepository(applicationContext)
        createChannels()
        startForeground(SERVICE_NOTIFICATION_ID, serviceNotification())
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (!repository.hasSavedSession()) {
            stopSelf()
            return START_NOT_STICKY
        }
        if (pollJob?.isActive != true) {
            pollJob = scope.launch {
                while (repository.hasSavedSession()) {
                    val incoming = runCatching { repository.refreshIncomingCalls() }.getOrDefault(emptyList()).firstOrNull()
                    if (incoming != null && incoming.id != shownCallId) {
                        shownCallId = incoming.id
                        showIncomingCall(incoming)
                    } else if (incoming == null && shownCallId != null) {
                        NotificationManagerCompat.from(this@TiwiCallListenerService).cancel(INCOMING_NOTIFICATION_ID)
                        shownCallId = null
                    }
                    if (notificationPollTick++ % 5 == 0) {
                        runCatching { repository.refreshNotifications() }.getOrDefault(emptyList())
                            .filter { it.status == "unread" && it.type != "call" }
                            .take(8)
                            .forEach(::showActivityNotification)
                    }
                    delay(3000)
                }
                stopSelf()
            }
        }
        return START_STICKY
    }

    override fun onDestroy() {
        pollJob?.cancel()
        scope.cancel()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun serviceNotification() = NotificationCompat.Builder(this, SERVICE_CHANNEL)
        .setSmallIcon(R.mipmap.ic_launcher)
        .setContentTitle("Tiwi calls are ready")
        .setContentText("Listening securely for incoming audio and video calls")
        .setOngoing(true)
        .setSilent(true)
        .setCategory(NotificationCompat.CATEGORY_SERVICE)
        .build()

    private fun showIncomingCall(call: SocialCallSession) {
        if (Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return
        val openIntent = Intent(this, MainActivity::class.java).apply {
            action = Intent.ACTION_VIEW
            data = android.net.Uri.parse("tiwi://call/${call.id}")
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val pending = PendingIntent.getActivity(
            this,
            call.id.hashCode(),
            openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val label = if (call.type == "video") "Incoming Tiwi video call" else "Incoming Tiwi audio call"
        val notification = NotificationCompat.Builder(this, CALL_CHANNEL)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(call.caller.name.ifBlank { "Tiwi user" })
            .setContentText(label)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setAutoCancel(false)
            .setContentIntent(pending)
            .setFullScreenIntent(pending, true)
            .setVibrate(longArrayOf(0, 700, 350, 700, 350, 700))
            .setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE))
            .build()
        NotificationManagerCompat.from(this).notify(INCOMING_NOTIFICATION_ID, notification)
    }

    private fun showActivityNotification(item: SocialNotification) {
        if (Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return
        val preferences = getSharedPreferences("tiwi_activity_notifications", MODE_PRIVATE)
        val shown = preferences.getStringSet("shown_ids", emptySet()).orEmpty()
        if (item.id in shown) return
        val postId = item.metadata["postId"]?.toString()
        val actorId = item.metadata["actorId"]?.toString()
        val openIntent = Intent(this, MainActivity::class.java).apply {
            action = Intent.ACTION_VIEW
            data = when {
                !postId.isNullOrBlank() -> android.net.Uri.parse("https://tiwlo.com/social/post/$postId")
                !actorId.isNullOrBlank() -> android.net.Uri.parse("https://tiwlo.com/social/profile/$actorId")
                else -> null
            }
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val pending = PendingIntent.getActivity(this, item.id.hashCode(), openIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val notification = NotificationCompat.Builder(this, ACTIVITY_CHANNEL)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(item.title.ifBlank { "Tiwi activity" })
            .setContentText(item.message)
            .setStyle(NotificationCompat.BigTextStyle().bigText(item.message))
            .setCategory(NotificationCompat.CATEGORY_SOCIAL)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .setContentIntent(pending)
            .setGroup("tiwi_social_activity")
            .build()
        NotificationManagerCompat.from(this).notify(item.id.hashCode(), notification)
        preferences.edit().putStringSet("shown_ids", (shown + item.id).toList().takeLast(200).toSet()).apply()
    }

    private fun createChannels() {
        if (Build.VERSION.SDK_INT < 26) return
        val manager = getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(
            NotificationChannel(SERVICE_CHANNEL, "Tiwi call connection", NotificationManager.IMPORTANCE_LOW).apply {
                description = "Keeps incoming Tiwi internet calls available in the background"
                setSound(null, null)
            }
        )
        val ringtone = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
        val attributes = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()
        manager.createNotificationChannel(
            NotificationChannel(CALL_CHANNEL, "Incoming Tiwi calls", NotificationManager.IMPORTANCE_HIGH).apply {
                description = "Audio and video call alerts"
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 700, 350, 700)
                setSound(ringtone, attributes)
                lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
            }
        )
        manager.createNotificationChannel(
            NotificationChannel(ACTIVITY_CHANNEL, "Tiwi activity", NotificationManager.IMPORTANCE_DEFAULT).apply {
                description = "Likes, comments, follows, mentions and messages"
                enableVibration(true)
            }
        )
    }

    companion object {
        private const val SERVICE_CHANNEL = "tiwi_call_connection"
        private const val CALL_CHANNEL = "tiwi_incoming_calls"
        private const val ACTIVITY_CHANNEL = "tiwi_social_activity"
        private const val SERVICE_NOTIFICATION_ID = 4301
        private const val INCOMING_NOTIFICATION_ID = 4302
    }
}
