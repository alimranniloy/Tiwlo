package com.example.social

import android.content.Context
import com.squareup.moshi.JsonAdapter
import com.squareup.moshi.Moshi
import com.squareup.moshi.Types
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory

internal class SocialCacheStore(context: Context) {
    private val prefs = context.getSharedPreferences("tiwi_social_cache_v3", Context.MODE_PRIVATE)
    private val moshi = Moshi.Builder().add(KotlinJsonAdapterFactory()).build()
    private val userAdapter = moshi.adapter(SocialUser::class.java)
    private val profileAdapter = moshi.adapter(SocialProfile::class.java)
    private val postListAdapter: JsonAdapter<List<SocialPost>> = moshi.adapter(Types.newParameterizedType(List::class.java, SocialPost::class.java))
    private val conversationListAdapter: JsonAdapter<List<SocialConversation>> = moshi.adapter(Types.newParameterizedType(List::class.java, SocialConversation::class.java))
    private val messageListAdapter: JsonAdapter<List<SocialMessage>> = moshi.adapter(Types.newParameterizedType(List::class.java, SocialMessage::class.java))

    fun user(): SocialUser? = read("user", userAdapter)
    fun profile(): SocialProfile? = read("profile", profileAdapter)
    fun feed(): List<SocialPost> = read("feed", postListAdapter).orEmpty()
    fun conversations(): List<SocialConversation> = read("conversations", conversationListAdapter).orEmpty()
    fun messages(id: String): List<SocialMessage> = read("messages_$id", messageListAdapter).orEmpty()

    fun saveUser(value: SocialUser) = write("user", value, userAdapter)
    fun saveProfile(value: SocialProfile) = write("profile", value, profileAdapter)
    fun saveFeed(value: List<SocialPost>) = write("feed", value, postListAdapter)
    fun saveConversations(value: List<SocialConversation>) = write("conversations", value, conversationListAdapter)
    fun saveMessages(id: String, value: List<SocialMessage>) = write("messages_$id", value, messageListAdapter)

    fun isFresh(key: String, maxAgeMs: Long): Boolean = System.currentTimeMillis() - prefs.getLong("${key}_saved_at", 0) < maxAgeMs
    fun clear() = prefs.edit().clear().apply()

    private fun <T> read(key: String, adapter: JsonAdapter<T>): T? = runCatching { prefs.getString(key, null)?.let(adapter::fromJson) }.getOrNull()
    private fun <T> write(key: String, value: T, adapter: JsonAdapter<T>) {
        runCatching { adapter.toJson(value) }.getOrNull()?.let {
            prefs.edit().putString(key, it).putLong("${key}_saved_at", System.currentTimeMillis()).apply()
        }
    }
}
