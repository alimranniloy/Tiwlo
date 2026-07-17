package com.example.social

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.content.ContextCompat

/** Restores Tiwi's first-party server listener after a reboot or app update. */
class TiwiStartupReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        if (intent?.action !in setOf(Intent.ACTION_BOOT_COMPLETED, Intent.ACTION_MY_PACKAGE_REPLACED)) return
        val repository = SocialRepository(context.applicationContext)
        if (!repository.hasSavedSession()) return
        runCatching {
            ContextCompat.startForegroundService(
                context.applicationContext,
                Intent(context.applicationContext, TiwiCallListenerService::class.java)
            )
        }
    }
}
