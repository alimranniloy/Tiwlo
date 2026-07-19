package com.example.social

import android.content.ContentResolver
import android.content.Context
import android.net.Uri
import kotlinx.coroutines.async
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.supervisorScope
import kotlinx.coroutines.withContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import org.json.JSONObject

class SocialRepository(context: Context) {
    private val appContext = context.applicationContext
    private val session = appContext.getSharedPreferences("tiwi_social_session_v3", Context.MODE_PRIVATE)
    private val cache = SocialCacheStore(appContext)
    private val cacheScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    @Volatile private var token: String? = session.getString("token", null)
    private val client = GraphQlClient(appContext) { token }
    private val security = TSecurityClient(appContext, client)

    private val _currentUser = MutableStateFlow(cache.user())
    val currentUser: StateFlow<SocialUser?> = _currentUser.asStateFlow()
    private val _profile = MutableStateFlow(cache.profile())
    val profile: StateFlow<SocialProfile?> = _profile.asStateFlow()
    // Keep cached feed parsing and JSON serialization off the UI thread.  A
    // feed page is deliberately small; the in-memory list can grow through
    // paging while disk cache stays bounded for a fast cold start.
    private val _feed = MutableStateFlow<List<SocialPost>>(emptyList())
    val feed: StateFlow<List<SocialPost>> = _feed.asStateFlow()
    private val _feedLoadingMore = MutableStateFlow(false)
    val feedLoadingMore: StateFlow<Boolean> = _feedLoadingMore.asStateFlow()
    private val _feedEndReached = MutableStateFlow(false)
    val feedEndReached: StateFlow<Boolean> = _feedEndReached.asStateFlow()
    private val _feedModules = MutableStateFlow<List<SocialFeedModule>>(emptyList())
    val feedModules: StateFlow<List<SocialFeedModule>> = _feedModules.asStateFlow()
    private val _conversations = MutableStateFlow(cache.conversations())
    val conversations: StateFlow<List<SocialConversation>> = _conversations.asStateFlow()
    private val _messages = MutableStateFlow<Map<String, List<SocialMessage>>>(emptyMap())
    val messages: StateFlow<Map<String, List<SocialMessage>>> = _messages.asStateFlow()
    private val _comments = MutableStateFlow<Map<String, List<SocialComment>>>(emptyMap())
    val comments: StateFlow<Map<String, List<SocialComment>>> = _comments.asStateFlow()
    private val _syncing = MutableStateFlow(false)
    val syncing: StateFlow<Boolean> = _syncing.asStateFlow()
    private val _incomingCalls = MutableStateFlow<List<SocialCallSession>>(emptyList())
    val incomingCalls: StateFlow<List<SocialCallSession>> = _incomingCalls.asStateFlow()
    private val _liveStreams = MutableStateFlow<List<SocialLiveStream>>(emptyList())
    val liveStreams: StateFlow<List<SocialLiveStream>> = _liveStreams.asStateFlow()
    private val _notifications = MutableStateFlow<List<SocialNotification>>(emptyList())
    val notifications: StateFlow<List<SocialNotification>> = _notifications.asStateFlow()
    private val _storyTray = MutableStateFlow<List<SocialStoryGroup>>(emptyList())
    val storyTray: StateFlow<List<SocialStoryGroup>> = _storyTray.asStateFlow()
    private val _storyMemories = MutableStateFlow<List<SocialStory>>(emptyList())
    val storyMemories: StateFlow<List<SocialStory>> = _storyMemories.asStateFlow()

    init {
        cacheScope.launch {
            val cached = cache.feed().take(FEED_DISK_CACHE_LIMIT)
            if (cached.isNotEmpty() && _feed.value.isEmpty()) _feed.value = cached
        }
    }

    fun hasSavedSession(): Boolean = !token.isNullOrBlank() && _currentUser.value != null
    fun currentUserId(): String? = _currentUser.value?.id
    fun absoluteUrl(path: String?): String? = client.absoluteUrl(path)
    fun isAccountRestricted(): Boolean = _currentUser.value?.status?.lowercase() in RESTRICTED_STATUSES
    fun requiresEmailVerification(): Boolean = _currentUser.value?.signupSource == "social_app" && _currentUser.value?.emailVerifiedAt.isNullOrBlank()

    suspend fun login(identifier: String, password: String): SocialUser {
        val secureToken = security.issueAuthToken("login", mapOf("email" to identifier.trim(), "password" to password))
        val data = client.execute(
            """mutation TiwiLogin(${D}input: LoginInput!) { login(input: ${D}input) { token user { $USER_FIELDS } } }""",
            mapOf("input" to mapOf("tSecurityToken" to secureToken))
        )
        val payload = data.objectValue("login") ?: throw SocialApiException("Login response was incomplete")
        val user = mapUser(payload.objectValue("user") ?: throw SocialApiException("Account was not returned"))
        saveSession(payload.string("token") ?: throw SocialApiException("Login token was not returned"), user)
        refreshAll(force = true)
        return user
    }

    suspend fun signup(name: String, email: String, password: String, username: String): SocialSignupResult {
        val data = client.execute(
            """mutation TiwiSocialSignup(${D}input: SocialAppSignupInput!) { socialAppSignup(input: ${D}input) { ok requiresEmailVerification message token user { $USER_FIELDS } } }""",
            mapOf("input" to mapOf(
                "name" to name.trim(), "email" to email.trim(), "password" to password,
                "username" to username.trim(), "deviceFingerprint" to security.deviceFingerprint(),
                "deviceMetadata" to security.deviceMetadata()
            ))
        )
        val payload = data.objectValue("socialAppSignup") ?: throw SocialApiException("Signup response was incomplete")
        val user = mapUser(payload.objectValue("user") ?: throw SocialApiException("Account was not returned"))
        saveSession(payload.string("token") ?: throw SocialApiException("Signup token was not returned"), user)
        return SocialSignupResult(user, payload.boolean("requiresEmailVerification"), payload.string("message").orEmpty())
    }

    suspend fun resendEmailVerification() {
        client.execute("mutation TiwiResendEmailVerification { resendEmailVerification }")
    }

    suspend fun validateSession(): Boolean {
        if (token.isNullOrBlank()) return false
        return try {
            val data = client.execute("query TiwiSession { me { $USER_FIELDS } }")
            val user = data.objectValue("me")?.let(::mapUser) ?: return false
            setUser(user)
            true
        } catch (error: SocialApiException) {
            if (error.code == "UNAUTHENTICATED") logout()
            hasSavedSession()
        }
    }

    suspend fun refreshAll(force: Boolean = false) {
        if (_syncing.value) return
        _syncing.value = true
        try {
            supervisorScope {
                val profileJob = async { runCatching { refreshProfile() } }
                val feedJob = async { runCatching { refreshFeed(force) } }
                val feedModulesJob = async { runCatching { refreshFeedModules(FEED_INITIAL_PAGE_SIZE) } }
                val chatJob = async { runCatching { refreshConversations(force) } }
                val notificationJob = async { runCatching { refreshNotifications() } }
                val liveJob = async { runCatching { refreshLiveStreams() } }
                val storyJob = async { runCatching { refreshStoryTray() } }
                profileJob.await(); feedJob.await(); feedModulesJob.await(); chatJob.await(); notificationJob.await(); liveJob.await(); storyJob.await()
            }
        } finally { _syncing.value = false }
    }

    suspend fun refreshFeed(force: Boolean = false): List<SocialPost> {
        if (!force && _feed.value.isNotEmpty() && cache.isFresh("feed", FEED_TTL)) return _feed.value
        val page = requestFeedPage(before = null)
        // Newer server rows are first while already-paged rows remain in the
        // same order. This avoids a full LazyColumn replacement; stable keys
        // ensure only content that actually differs is rebound on screen.
        val merged = (page + _feed.value).distinctBy { it.id }
        _feedEndReached.value = page.size < FEED_INITIAL_PAGE_SIZE
        publishFeed(merged)
        return _feed.value
    }

    /** Loads one incremental page without ever replacing the rendered feed. */
    suspend fun loadNextFeedPage(): List<SocialPost> {
        if (_feedLoadingMore.value || _feedEndReached.value || _feed.value.isEmpty()) return _feed.value
        val cursor = _feed.value.lastOrNull { !it.publishedAt.isNullOrBlank() }?.publishedAt
            ?: run {
                _feedEndReached.value = true
                return _feed.value
            }
        _feedLoadingMore.value = true
        return try {
            val page = requestFeedPage(before = cursor)
            val existing = _feed.value.mapTo(linkedSetOf()) { it.id }
            val additions = page.filter { existing.add(it.id) }
            if (additions.isNotEmpty()) publishFeed(_feed.value + additions)
            if (page.size < FEED_PAGE_SIZE || additions.isEmpty()) _feedEndReached.value = true
            _feed.value
        } finally {
            _feedLoadingMore.value = false
        }
    }

    private suspend fun requestFeedPage(before: String?): List<SocialPost> {
        val data = client.execute(
            """query TiwiFeed(${D}limit: Int!, ${D}before: String) {
                socialFeed(limit: ${D}limit, before: ${D}before) { $POST_FIELDS }
            }""".trimIndent(),
            mapOf("limit" to if (before == null) FEED_INITIAL_PAGE_SIZE else FEED_PAGE_SIZE, "before" to before)
        )
        return withContext(Dispatchers.Default) {
            data.list("socialFeed").mapNotNull { it.objectMap()?.let(::mapPost) }
        }
    }

    private fun publishFeed(value: List<SocialPost>) {
        val normalized = value.distinctBy { it.id }
        _feed.value = normalized
        persistFeed(normalized)
    }

    private fun persistFeed(value: List<SocialPost>) {
        cacheScope.launch { cache.saveFeed(value.take(FEED_DISK_CACHE_LIMIT)) }
    }

    suspend fun refreshFeedModules(feedSize: Int = FEED_INITIAL_PAGE_SIZE): List<SocialFeedModule> {
        val data = client.execute(
            "query TiwiFeedModules { socialFeedModules(feedSize: ${feedSize.coerceIn(1, 100)}) { $FEED_MODULE_FIELDS } }"
        )
        return data.list("socialFeedModules").mapNotNull { it.objectMap()?.let(::mapFeedModule) }.also {
            _feedModules.value = it
        }
    }

    /** Fetches at most one Feed or two Reels campaigns.  Ads are deliberately
     * not merged into the organic Feed StateFlow, preserving stable post keys
     * and avoiding full-list rebinding while a sponsored placement arrives. */
    suspend fun socialAdPlacements(placement: String, limit: Int = 1): List<SocialAd> {
        val data = client.execute(
            """query TiwiAdPlacements(${D}placement: String!, ${D}limit: Int) {
                socialAdPlacements(placement: ${D}placement, limit: ${D}limit) { $SOCIAL_AD_FIELDS }
            }""".trimIndent(),
            mapOf("placement" to placement, "limit" to limit.coerceIn(1, 2))
        )
        return withContext(Dispatchers.Default) {
            data.list("socialAdPlacements").mapNotNull { it.objectMap()?.let(::mapAd) }
        }
    }

    suspend fun trackSocialAdEvent(id: String, placement: String, eventType: String, metadata: Map<String, Any?> = emptyMap()) {
        client.execute(
            """mutation TiwiTrackAd(${D}input: SocialAdEventInput!) {
                trackSocialAdEvent(input: ${D}input) { id impressionCount clickCount }
            }""".trimIndent(),
            mapOf("input" to mapOf("id" to id, "placement" to placement, "eventType" to eventType, "metadata" to metadata))
        )
    }

    suspend fun refreshStoryTray(limit: Int = 100): List<SocialStoryGroup> {
        val data = client.execute(
            """query TiwiStoryTray(${D}limit: Int) { socialStoryTray(limit: ${D}limit) { $STORY_GROUP_FIELDS } }""",
            mapOf("limit" to limit.coerceIn(1, 100))
        )
        return data.list("socialStoryTray").mapNotNull { it.objectMap()?.let(::mapStoryGroup) }.also {
            _storyTray.value = it
        }
    }

    suspend fun refreshStories(limit: Int = 60): List<SocialStoryGroup> = refreshStoryTray(limit)

    suspend fun story(id: String): SocialStory? {
        val data = client.execute(
            """query TiwiStory(${D}id: ID!) { socialStory(id: ${D}id) { $STORY_FIELDS } }""",
            mapOf("id" to id)
        )
        return data.objectValue("socialStory")?.let(::mapStory)?.also(::upsertStory)
    }

    suspend fun storyMemories(limit: Int = 60, before: String? = null): List<SocialStory> {
        val data = client.execute(
            """query TiwiStoryMemories(${D}limit: Int, ${D}before: String) { socialStoryMemories(limit: ${D}limit, before: ${D}before) { $STORY_FIELDS } }""",
            mapOf("limit" to limit.coerceIn(1, 100), "before" to before)
        )
        return data.list("socialStoryMemories").mapNotNull { it.objectMap()?.let(::mapStory) }.also { rows ->
            _storyMemories.value = if (before.isNullOrBlank()) rows else (_storyMemories.value + rows).distinctBy { it.id }
        }
    }

    suspend fun storyViewers(id: String, limit: Int = 100): List<SocialStoryView> {
        val data = client.execute(
            """query TiwiStoryViewers(${D}id: ID!, ${D}limit: Int) { socialStoryViewers(id: ${D}id, limit: ${D}limit) { $STORY_VIEW_FIELDS } }""",
            mapOf("id" to id, "limit" to limit.coerceIn(1, 200))
        )
        return data.list("socialStoryViewers").mapNotNull { it.objectMap()?.let(::mapStoryView) }
    }

    suspend fun storyInteractions(id: String, itemId: String? = null, limit: Int = 100): List<SocialStoryInteraction> {
        val data = client.execute(
            """query TiwiStoryInteractions(${D}id: ID!, ${D}itemId: ID, ${D}limit: Int) {
                socialStoryInteractions(id: ${D}id, itemId: ${D}itemId, limit: ${D}limit) { $STORY_INTERACTION_FIELDS }
            }""".trimIndent(),
            mapOf("id" to id, "itemId" to itemId, "limit" to limit.coerceIn(1, 300))
        )
        return data.list("socialStoryInteractions").mapNotNull { it.objectMap()?.let(::mapStoryInteraction) }
    }

    suspend fun socialStoryInteractions(id: String, itemId: String? = null, limit: Int = 100): List<SocialStoryInteraction> =
        storyInteractions(id, itemId, limit)

    suspend fun storyMusic(search: String = "", limit: Int = 50): List<SocialStoryMusicTrack> {
        val data = client.execute(
            """query TiwiStoryMusic(${D}search: String, ${D}limit: Int) { socialStoryMusic(search: ${D}search, limit: ${D}limit) { $STORY_MUSIC_FIELDS } }""",
            mapOf("search" to search.trim(), "limit" to limit.coerceIn(1, 100))
        )
        return data.list("socialStoryMusic").mapNotNull { it.objectMap()?.let(::mapStoryMusic) }
    }

    suspend fun createStory(
        caption: String? = null,
        visibility: String = "public",
        customAudienceIds: List<String> = emptyList(),
        allowReplies: Boolean = true,
        metadata: Map<String, Any?> = emptyMap(),
        items: List<Map<String, Any?>>
    ): SocialStory = createStoryInput(mapOf(
        "caption" to caption?.trim()?.takeIf { it.isNotBlank() },
        "visibility" to visibility,
        "customAudienceIds" to customAudienceIds.distinct(),
        "allowReplies" to allowReplies,
        "metadata" to metadata,
        "items" to items.mapIndexed { index, item -> storyItemInput(item, index) }
    ).filterValues { it != null })

    suspend fun createStory(draft: SocialStoryDraft): SocialStory = createStoryInput(storyInput(draft))

    private suspend fun createStoryInput(input: Map<String, Any?>): SocialStory {
        val data = client.execute(
            """mutation CreateTiwiStory(${D}input: SocialStoryInput!) { createSocialStory(input: ${D}input) { $STORY_FIELDS } }""",
            mapOf("input" to input)
        )
        return mapStory(data.objectValue("createSocialStory") ?: throw SocialApiException("Story was not created")).also(::upsertStory)
    }

    suspend fun updateStory(
        id: String,
        visibility: String? = null,
        customAudienceIds: List<String>? = null,
        allowReplies: Boolean? = null
    ): SocialStory {
        val data = client.execute(
            """mutation UpdateTiwiStory(${D}id: ID!, ${D}visibility: String, ${D}audience: [ID!], ${D}allowReplies: Boolean) {
                updateSocialStory(id: ${D}id, visibility: ${D}visibility, customAudienceIds: ${D}audience, allowReplies: ${D}allowReplies) { $STORY_FIELDS }
            }""".trimIndent(),
            mapOf("id" to id, "visibility" to visibility, "audience" to customAudienceIds, "allowReplies" to allowReplies)
        )
        return mapStory(data.objectValue("updateSocialStory") ?: throw SocialApiException("Story settings were not updated")).also(::upsertStory)
    }

    suspend fun viewStory(id: String, itemSortOrder: Int): SocialStory {
        val data = client.execute(
            """mutation ViewTiwiStory(${D}id: ID!, ${D}itemSortOrder: Int!) { viewSocialStory(id: ${D}id, itemSortOrder: ${D}itemSortOrder) { $STORY_FIELDS } }""",
            mapOf("id" to id, "itemSortOrder" to itemSortOrder.coerceAtLeast(0))
        )
        return mapStory(data.objectValue("viewSocialStory") ?: throw SocialApiException("Story was not found")).also(::upsertStory)
    }

    suspend fun reactToStory(id: String, itemId: String, emoji: String): SocialStory {
        val data = client.execute(
            """mutation ReactTiwiStory(${D}id: ID!, ${D}itemId: ID!, ${D}emoji: String!) {
                reactToSocialStory(id: ${D}id, itemId: ${D}itemId, emoji: ${D}emoji) { $STORY_FIELDS }
            }""".trimIndent(),
            mapOf("id" to id, "itemId" to itemId, "emoji" to (emoji.trim().takeIf { it.isNotBlank() } ?: "\u2764"))
        )
        return mapStory(data.objectValue("reactToSocialStory") ?: throw SocialApiException("Story reaction failed")).also(::upsertStory)
    }

    suspend fun replyToStory(id: String, itemId: String, body: String): SocialStoryReply {
        val text = body.trim()
        if (text.isBlank()) throw SocialApiException("Write a reply first")
        val data = client.execute(
            """mutation ReplyTiwiStory(${D}id: ID!, ${D}itemId: ID!, ${D}body: String!) {
                replyToSocialStory(id: ${D}id, itemId: ${D}itemId, body: ${D}body) { $STORY_REPLY_FIELDS }
            }""".trimIndent(),
            mapOf("id" to id, "itemId" to itemId, "body" to text.take(2_000))
        )
        mutateStory(id) { it.copy(replyCount = it.replyCount + 1) }
        return mapStoryReply(data.objectValue("replyToSocialStory") ?: throw SocialApiException("Story reply was not sent"))
    }

    suspend fun interactWithStory(
        storyId: String,
        itemId: String,
        kind: String,
        key: String,
        value: Map<String, Any?> = emptyMap()
    ): SocialStoryInteraction {
        val normalizedKind = kind.trim().lowercase().replace(Regex("[\\s-]+"), "_")
        val normalizedKey = key.trim()
        if (normalizedKind.isBlank() || normalizedKey.isBlank()) {
            throw SocialApiException("Story interaction is incomplete")
        }
        val data = client.execute(
            """mutation InteractWithTiwiStory(${D}input: SocialStoryInteractionInput!) {
                interactWithSocialStory(input: ${D}input) { $STORY_INTERACTION_FIELDS }
            }""".trimIndent(),
            mapOf("input" to mapOf(
                "storyId" to storyId,
                "itemId" to itemId,
                "kind" to normalizedKind,
                "key" to normalizedKey,
                "value" to value
            ))
        )
        val interaction = mapStoryInteraction(
            data.objectValue("interactWithSocialStory") ?: throw SocialApiException("Story response was not saved")
        )
        mutateStory(storyId) { story ->
            story.copy(items = story.items.map { item ->
                if (item.id != itemId) item else {
                    val previous = item.viewerInteractions.firstOrNull { it.key == interaction.key }
                    item.copy(
                        interactionCount = item.interactionCount + if (previous == null) 1 else 0,
                        viewerInteractions = (item.viewerInteractions.filterNot {
                            it.id == interaction.id || it.key == interaction.key
                        } + interaction).sortedBy { it.createdAt }
                    )
                }
            })
        }
        return interaction
    }

    suspend fun interactWithSocialStory(
        storyId: String,
        itemId: String,
        kind: String,
        key: String,
        value: Map<String, Any?> = emptyMap()
    ): SocialStoryInteraction = interactWithStory(storyId, itemId, kind, key, value)

    suspend fun deleteStoryInteraction(id: String): Boolean {
        val data = client.execute(
            """mutation DeleteTiwiStoryInteraction(${D}id: ID!) { deleteSocialStoryInteraction(id: ${D}id) }""",
            mapOf("id" to id)
        )
        val deleted = data.boolean("deleteSocialStoryInteraction")
        if (deleted) removeStoryInteractionFromCache(id)
        return deleted
    }

    suspend fun deleteSocialStoryInteraction(id: String): Boolean = deleteStoryInteraction(id)

    suspend fun archiveStory(id: String): SocialStory {
        val data = client.execute(
            """mutation ArchiveTiwiStory(${D}id: ID!) { archiveSocialStory(id: ${D}id) { $STORY_FIELDS } }""",
            mapOf("id" to id)
        )
        val archived = mapStory(data.objectValue("archiveSocialStory") ?: throw SocialApiException("Story was not archived"))
        removeStoryFromTray(id)
        _storyMemories.value = (listOf(archived) + _storyMemories.value).distinctBy { it.id }
        return archived
    }

    suspend fun deleteStory(id: String): Boolean {
        val data = client.execute(
            """mutation DeleteTiwiStory(${D}id: ID!) { deleteSocialStory(id: ${D}id) }""",
            mapOf("id" to id)
        )
        val deleted = data.boolean("deleteSocialStory")
        if (deleted) {
            removeStoryFromTray(id)
            _storyMemories.value = _storyMemories.value.filterNot { it.id == id }
        }
        return deleted
    }

    /** Legacy post-backed stories, kept while older screens migrate to [storyTray]. */
    suspend fun stories(): List<SocialPost> {
        val data = client.execute("query TiwiStories { socialStories(limit: 80) { $POST_FIELDS } }")
        return data.list("socialStories").mapNotNull { it.objectMap()?.let(::mapPost) }
    }

    suspend fun refreshProfile(userId: String? = null): SocialProfile? {
        val data = client.execute(
            """query TiwiProfile(${D}userId: ID) { socialProfile(userId: ${D}userId) { $PROFILE_FIELDS } }""",
            mapOf("userId" to userId)
        )
        val value = data.objectValue("socialProfile")?.let(::mapProfile)
        if (userId == null || userId == currentUserId()) value?.let {
            _profile.value = it
            cache.saveProfile(it)
        }
        return value
    }

    suspend fun connections(userId: String? = null, limit: Int = 30): List<SocialProfile> {
        val data = client.execute(
            """query TiwiConnections(${D}userId: ID, ${D}limit: Int) { socialConnections(userId: ${D}userId, limit: ${D}limit) { $PROFILE_FIELDS } }""",
            mapOf("userId" to userId, "limit" to limit.coerceIn(1, 100))
        )
        return data.list("socialConnections").mapNotNull { it.objectMap()?.let(::mapProfile) }
    }

    suspend fun followers(userId: String? = null, limit: Int = 100): List<SocialProfile> {
        val data = client.execute(
            """query TiwiFollowers(${D}userId: ID, ${D}limit: Int) { socialFollowers(userId: ${D}userId, limit: ${D}limit) { $PROFILE_FIELDS } }""",
            mapOf("userId" to userId, "limit" to limit.coerceIn(1, 100))
        )
        return data.list("socialFollowers").mapNotNull { it.objectMap()?.let(::mapProfile) }
    }

    suspend fun following(userId: String? = null, limit: Int = 100): List<SocialProfile> {
        val data = client.execute(
            """query TiwiFollowing(${D}userId: ID, ${D}limit: Int) { socialFollowing(userId: ${D}userId, limit: ${D}limit) { $PROFILE_FIELDS } }""",
            mapOf("userId" to userId, "limit" to limit.coerceIn(1, 100))
        )
        return data.list("socialFollowing").mapNotNull { it.objectMap()?.let(::mapProfile) }
    }

    suspend fun blockedUsers(limit: Int = 100): List<SocialProfile> {
        val data = client.execute(
            """query TiwiBlockedUsers(${D}limit: Int) { socialBlockedUsers(limit: ${D}limit) { $PROFILE_FIELDS } }""",
            mapOf("limit" to limit.coerceIn(1, 100))
        )
        return data.list("socialBlockedUsers").mapNotNull { it.objectMap()?.let(::mapProfile) }
    }

    suspend fun postReactions(postId: String, limit: Int = 100): List<SocialProfile> {
        val data = client.execute(
            """query TiwiPostReactions(${D}postId: ID!, ${D}limit: Int) { socialPostReactions(postId: ${D}postId, limit: ${D}limit) { $PROFILE_FIELDS } }""",
            mapOf("postId" to postId, "limit" to limit.coerceIn(1, 100))
        )
        return data.list("socialPostReactions").mapNotNull { it.objectMap()?.let(::mapProfile) }
    }

    suspend fun updateProfile(input: Map<String, Any?>): SocialProfile {
        val data = client.execute(
            """mutation UpdateTiwiProfile(${D}input: SocialProfileInput!) { upsertSocialProfile(input: ${D}input) { $PROFILE_FIELDS } }""",
            mapOf("input" to input)
        )
        val value = mapProfile(data.objectValue("upsertSocialProfile") ?: throw SocialApiException("Profile was not updated"))
        _profile.value = value
        cache.saveProfile(value)
        setUser(value.user.copy(email = _currentUser.value?.email.orEmpty()))
        return value
    }

    suspend fun updateAccount(input: Map<String, Any?>): SocialUser {
        val data = client.execute(
            """mutation UpdateTiwiAccount(${D}input: UpdateProfileInput!) { updateProfile(input: ${D}input) { $USER_FIELDS } }""",
            mapOf("input" to input)
        )
        return mapUser(data.objectValue("updateProfile") ?: throw SocialApiException("Account was not updated")).also(::setUser)
    }

    suspend fun changePassword(currentPassword: String, newPassword: String) {
        client.execute(
            """mutation ChangeTiwiPassword(${D}current: String!, ${D}next: String!) { changePassword(currentPassword: ${D}current, newPassword: ${D}next) }""",
            mapOf("current" to currentPassword, "next" to newPassword)
        )
    }

    suspend fun searchProfiles(query: String = ""): List<SocialProfile> {
        val data = client.execute(
            """query TiwiDiscover(${D}query: String) { socialSearch(query: ${D}query, limit: 50) { $PROFILE_FIELDS } }""",
            mapOf("query" to query.trim())
        )
        return data.list("socialSearch").mapNotNull { it.objectMap()?.let(::mapProfile) }
    }

    suspend fun exportAccountDataJson(): String {
        val userId = currentUserId() ?: throw SocialApiException("Sign in to download your information")
        val data = client.execute(
            """query TiwiAccountExport(${D}userId: ID!) {
                me { $USER_FIELDS }
                socialProfile(userId: ${D}userId) { $PROFILE_FIELDS }
                socialFeed(authorId: ${D}userId, limit: 100) { $POST_FIELDS }
                socialConversations { $CONVERSATION_FIELDS }
            }""",
            mapOf("userId" to userId)
        )
        return JSONObject(data).toString(2)
    }

    suspend fun follow(userId: String, follow: Boolean): SocialProfile {
        val operation = if (follow) "followSocialUser" else "unfollowSocialUser"
        val data = client.execute(
            """mutation TiwiFollow(${D}userId: ID!) { $operation(userId: ${D}userId) { $PROFILE_FIELDS } }""",
            mapOf("userId" to userId)
        )
        return mapProfile(data.objectValue(operation) ?: throw SocialApiException("Follow action failed")).also { updated ->
            _feed.value = _feed.value.map { post ->
                if (post.authorId == userId) post.copy(authorProfile = (post.authorProfile ?: updated).copy(isFollowing = updated.isFollowing)) else post
            }
            _feedModules.value = _feedModules.value.map { module ->
                module.copy(profiles = module.profiles.map { if (it.userId == userId) updated else it })
            }
            persistFeed(_feed.value)
        }
    }

    suspend fun createPost(body: String, type: String = "post", media: List<SocialMedia> = emptyList(), visibility: String = "public", groupId: String? = null, commentPermission: String = "everyone", metadata: Map<String, Any?> = emptyMap(), location: String? = null): SocialPost {
        val mediaInput = media.map(::mediaInput)
        val input = mapOf(
            "type" to type, "body" to body.trim(), "visibility" to visibility, "commentPermission" to commentPermission, "media" to mediaInput, "groupId" to groupId,
            "metadata" to metadata,
            "location" to location,
            "hlsUrl" to media.firstOrNull()?.hlsUrl,
            "thumbnailUrl" to media.firstOrNull()?.thumbnailUrl,
            "processingStatus" to (media.firstOrNull()?.processingStatus ?: "ready")
        )
        val data = client.execute(
            """mutation CreateTiwiPost(${D}input: SocialPostInput!) { createSocialPost(input: ${D}input) { $POST_FIELDS } }""",
            mapOf("input" to input)
        )
        val post = mapPost(data.objectValue("createSocialPost") ?: throw SocialApiException("Post was not created"))
        if (type != "story") {
            val next = listOf(post) + _feed.value.filterNot { it.id == post.id }
            _feed.value = next
            persistFeed(next)
        }
        return post
    }

    suspend fun uploadMedia(resolver: ContentResolver, uri: Uri, kind: String, onProgress: ((Int) -> Unit)? = null): SocialMedia =
        client.uploadMedia(resolver, uri, kind, onProgress).asSocialMedia()

    suspend fun reactToPost(id: String): SocialPost {
        val before = _feed.value
        _feed.value = before.map { post ->
            if (post.id != id) post else {
                val removing = post.viewerReaction == "like"
                post.copy(viewerReaction = if (removing) null else "like", reactionCount = (post.reactionCount + if (removing) -1 else 1).coerceAtLeast(0))
            }
        }
        persistFeed(_feed.value)
        return try {
            val data = client.execute(
                """mutation LikeTiwiPost(${D}id: ID!) { reactToSocialPost(id: ${D}id, kind: "like") { $POST_FIELDS } }""",
                mapOf("id" to id)
            )
            mapPost(data.objectValue("reactToSocialPost") ?: throw SocialApiException("Reaction failed")).also { updated ->
                _feed.value = _feed.value.map { if (it.id == id) updated else it }
                persistFeed(_feed.value)
            }
        } catch (error: Exception) {
            _feed.value = before
            persistFeed(before)
            throw error
        }
    }

    suspend fun viewPost(id: String): SocialPost {
        val data = client.execute("""mutation ViewTiwiPost(${D}id: ID!) { viewSocialPost(id: ${D}id) { $POST_FIELDS } }""", mapOf("id" to id))
        return mapPost(data.objectValue("viewSocialPost") ?: throw SocialApiException("Post was not found")).also(::replacePost)
    }

    suspend fun repostPost(id: String): SocialPost {
        val data = client.execute("""mutation RepostTiwi(${D}id: ID!) { repostSocialPost(id: ${D}id) { $POST_FIELDS } }""", mapOf("id" to id))
        val repost = mapPost(data.objectValue("repostSocialPost") ?: throw SocialApiException("Repost failed"))
        val updated = _feed.value
            .map { post -> if (post.id == id) post.copy(shareCount = post.shareCount + 1) else post }
            .filterNot { it.id == repost.id }
        _feed.value = listOf(repost) + updated
        persistFeed(_feed.value)
        return repost
    }

    suspend fun updatePost(id: String, body: String): SocialPost {
        return updatePost(id, body, null)
    }

    suspend fun updatePost(id: String, body: String, media: List<SocialMedia>?): SocialPost {
        val input = mutableMapOf<String, Any?>("id" to id, "body" to body.trim())
        media?.let { items -> input["media"] = items.map(::mediaInput) }
        val data = client.execute(
            """mutation EditTiwiPost(${D}input: SocialPostUpdateInput!) { updateSocialPost(input: ${D}input) { $POST_FIELDS } }""",
            mapOf("input" to input)
        )
        return mapPost(data.objectValue("updateSocialPost") ?: throw SocialApiException("Post update failed")).also(::replacePost)
    }

    suspend fun updatePostOptions(id: String, visibility: String? = null, pinned: Boolean? = null, commentPermission: String? = null): SocialPost {
        val input = mutableMapOf<String, Any?>("id" to id)
        visibility?.let { input["visibility"] = it }
        pinned?.let { input["pinned"] = it }
        commentPermission?.let { input["commentPermission"] = it }
        val data = client.execute(
            """mutation UpdateTiwiPostOptions(${D}input: SocialPostUpdateInput!) { updateSocialPost(input: ${D}input) { $POST_FIELDS } }""",
            mapOf("input" to input)
        )
        return mapPost(data.objectValue("updateSocialPost") ?: throw SocialApiException("Post settings were not updated")).also(::replacePost)
    }

    suspend fun savePost(id: String, save: Boolean): SocialPost {
        val data = client.execute(
            """mutation SaveTiwiPost(${D}id: ID!, ${D}save: Boolean!) { saveSocialPost(id: ${D}id, save: ${D}save) { $POST_FIELDS } }""",
            mapOf("id" to id, "save" to save)
        )
        return mapPost(data.objectValue("saveSocialPost") ?: throw SocialApiException("Save action failed")).also(::replacePost)
    }

    suspend fun favoriteUser(userId: String, favorite: Boolean) {
        client.execute(
            """mutation FavoriteTiwiUser(${D}id: ID!, ${D}favorite: Boolean!) { favoriteSocialUser(userId: ${D}id, favorite: ${D}favorite) }""",
            mapOf("id" to userId, "favorite" to favorite)
        )
    }

    suspend fun snoozeUser(userId: String, days: Int = 30) {
        client.execute(
            """mutation SnoozeTiwiUser(${D}id: ID!, ${D}days: Int!) { snoozeSocialUser(userId: ${D}id, days: ${D}days) }""",
            mapOf("id" to userId, "days" to days)
        )
        _feed.value = _feed.value.filterNot { it.authorId == userId }
        persistFeed(_feed.value)
    }

    suspend fun blockUser(userId: String, block: Boolean = true, reason: String? = null): Boolean {
        val data = client.execute(
            """mutation BlockTiwiUser(${D}id: ID!, ${D}block: Boolean!, ${D}reason: String) { blockSocialUser(userId: ${D}id, block: ${D}block, reason: ${D}reason) }""",
            mapOf("id" to userId, "block" to block, "reason" to reason)
        )
        if (block) {
            _feed.value = _feed.value.filterNot { it.authorId == userId }
            persistFeed(_feed.value)
        }
        return data.boolean("blockSocialUser")
    }

    suspend fun savedPosts(): List<SocialPost> {
        val data = client.execute("query TiwiSavedPosts { socialSavedPosts(limit: 100) { $POST_FIELDS } }")
        return data.list("socialSavedPosts").mapNotNull { it.objectMap()?.let(::mapPost) }
    }

    suspend fun memories(): List<SocialPost> {
        val data = client.execute("query TiwiMemories { socialMemories(limit: 100) { $POST_FIELDS } }")
        return data.list("socialMemories").mapNotNull { it.objectMap()?.let(::mapPost) }
    }

    suspend fun groups(search: String = "", mine: Boolean = false): List<SocialGroup> {
        val data = client.execute(
            """query TiwiGroups(${D}search: String, ${D}mine: Boolean) { socialGroups(search: ${D}search, mine: ${D}mine, limit: 100) { $GROUP_FIELDS } }""",
            mapOf("search" to search.trim(), "mine" to mine)
        )
        return data.list("socialGroups").mapNotNull { it.objectMap()?.let(::mapGroup) }
    }

    suspend fun group(id: String): SocialGroup? {
        val data = client.execute("""query TiwiGroup(${D}id: ID!) { socialGroup(id: ${D}id) { $GROUP_FIELDS } }""", mapOf("id" to id))
        return data.objectValue("socialGroup")?.let(::mapGroup)
    }

    suspend fun groupMembers(id: String): List<SocialGroupMember> {
        val data = client.execute(
            """query TiwiGroupMembers(${D}id: ID!) { socialGroupMembers(groupId: ${D}id, limit: 200) { $GROUP_MEMBER_FIELDS } }""",
            mapOf("id" to id)
        )
        return data.list("socialGroupMembers").mapNotNull { it.objectMap()?.let(::mapGroupMember) }
    }

    suspend fun groupPosts(id: String): List<SocialPost> {
        val data = client.execute("""query TiwiGroupPosts(${D}id: ID!) { socialFeed(groupId: ${D}id, limit: 100) { $POST_FIELDS } }""", mapOf("id" to id))
        return data.list("socialFeed").mapNotNull { it.objectMap()?.let(::mapPost) }
    }

    suspend fun createGroup(name: String, description: String, privacy: String, coverUrl: String? = null): SocialGroup {
        val data = client.execute(
            """mutation CreateTiwiGroup(${D}input: SocialGroupInput!) { createSocialGroup(input: ${D}input) { $GROUP_FIELDS } }""",
            mapOf("input" to mapOf("name" to name.trim(), "description" to description.trim(), "privacy" to privacy, "coverUrl" to coverUrl))
        )
        return mapGroup(data.objectValue("createSocialGroup") ?: throw SocialApiException("Group was not created"))
    }

    suspend fun updateGroup(id: String, name: String, description: String, privacy: String, coverUrl: String? = null): SocialGroup {
        val data = client.execute(
            """mutation UpdateTiwiGroup(${D}input: SocialGroupUpdateInput!) { updateSocialGroup(input: ${D}input) { $GROUP_FIELDS } }""",
            mapOf("input" to mapOf("id" to id, "name" to name.trim(), "description" to description.trim(), "privacy" to privacy, "coverUrl" to coverUrl))
        )
        return mapGroup(data.objectValue("updateSocialGroup") ?: throw SocialApiException("Group was not updated"))
    }

    suspend fun joinGroup(id: String): SocialGroup {
        val data = client.execute("""mutation JoinTiwiGroup(${D}id: ID!) { joinSocialGroup(id: ${D}id) { $GROUP_FIELDS } }""", mapOf("id" to id))
        return mapGroup(data.objectValue("joinSocialGroup") ?: throw SocialApiException("Group was not joined"))
    }

    suspend fun leaveGroup(id: String) {
        client.execute("""mutation LeaveTiwiGroup(${D}id: ID!) { leaveSocialGroup(id: ${D}id) }""", mapOf("id" to id))
    }

    suspend fun updateGroupMember(groupId: String, userId: String, role: String? = null, remove: Boolean = false): SocialGroup {
        val data = client.execute(
            """mutation UpdateTiwiGroupMember(${D}groupId: ID!, ${D}userId: ID!, ${D}role: String, ${D}remove: Boolean) { updateSocialGroupMember(groupId: ${D}groupId, userId: ${D}userId, role: ${D}role, remove: ${D}remove) { $GROUP_FIELDS } }""",
            mapOf("groupId" to groupId, "userId" to userId, "role" to role, "remove" to remove)
        )
        return mapGroup(data.objectValue("updateSocialGroupMember") ?: throw SocialApiException("Member was not updated"))
    }

    suspend fun deletePost(id: String) {
        client.execute("""mutation DeleteTiwiPost(${D}id: ID!) { deleteSocialPost(id: ${D}id) }""", mapOf("id" to id))
        _feed.value = _feed.value.filterNot { it.id == id }
        persistFeed(_feed.value)
    }

    suspend fun reportContent(targetType: String, targetId: String, reason: String, details: String? = null) {
        client.execute(
            """mutation ReportTiwi(${D}type: String!, ${D}id: ID!, ${D}reason: String!, ${D}details: String) { reportSocialContent(targetType: ${D}type, targetId: ${D}id, reason: ${D}reason, details: ${D}details) { id status } }""",
            mapOf("type" to targetType, "id" to targetId, "reason" to reason, "details" to details)
        )
    }

    suspend fun refreshComments(postId: String): List<SocialComment> {
        val data = client.execute(
            """query TiwiComments(${D}postId: ID!) { socialComments(postId: ${D}postId, limit: 100) { $COMMENT_FIELDS } }""",
            mapOf("postId" to postId)
        )
        return data.list("socialComments").mapNotNull { it.objectMap()?.let(::mapComment) }.also {
            _comments.value = _comments.value + (postId to it)
        }
    }

    suspend fun addComment(postId: String, body: String, replyToId: String? = null): SocialComment {
        val data = client.execute(
            """mutation CommentTiwi(${D}postId: ID!, ${D}body: String!, ${D}replyToId: ID) { addSocialComment(postId: ${D}postId, body: ${D}body, replyToId: ${D}replyToId) { $COMMENT_FIELDS } }""",
            mapOf("postId" to postId, "body" to body.trim(), "replyToId" to replyToId)
        )
        return mapComment(data.objectValue("addSocialComment") ?: throw SocialApiException("Comment failed")).also { comment ->
            _comments.value = _comments.value + (postId to (listOf(comment) + _comments.value[postId].orEmpty()))
            _feed.value = _feed.value.map { if (it.id == postId) it.copy(commentCount = it.commentCount + 1) else it }
            persistFeed(_feed.value)
        }
    }

    suspend fun reactToComment(postId: String, id: String): SocialComment {
        val data = client.execute("""mutation LikeTiwiComment(${D}id: ID!) { reactToSocialComment(id: ${D}id) { $COMMENT_FIELDS } }""", mapOf("id" to id))
        return mapComment(data.objectValue("reactToSocialComment") ?: throw SocialApiException("Comment reaction failed")).also { updated ->
            _comments.value = _comments.value + (postId to _comments.value[postId].orEmpty().map { if (it.id == id) updated else it })
        }
    }

    suspend fun deleteComment(postId: String, id: String) {
        client.execute("""mutation DeleteTiwiComment(${D}id: ID!) { deleteSocialComment(id: ${D}id) }""", mapOf("id" to id))
        _comments.value = _comments.value + (postId to _comments.value[postId].orEmpty().filterNot { it.id == id })
    }

    suspend fun refreshConversations(force: Boolean = false): List<SocialConversation> {
        if (!force && _conversations.value.isNotEmpty() && cache.isFresh("conversations", CHAT_TTL)) return _conversations.value
        val data = client.execute("query TiwiChats { socialConversations(archived: false) { $CONVERSATION_FIELDS } }")
        return data.list("socialConversations").mapNotNull { it.objectMap()?.let(::mapConversation) }.also {
            _conversations.value = it
            cache.saveConversations(it)
        }
    }

    suspend fun archivedConversations(): List<SocialConversation> {
        val data = client.execute("query TiwiArchivedChats { socialConversations(archived: true) { $CONVERSATION_FIELDS } }")
        return data.list("socialConversations").mapNotNull { it.objectMap()?.let(::mapConversation) }
    }

    suspend fun createConversation(userId: String): SocialConversation {
        val data = client.execute(
            """mutation CreateTiwiChat(${D}input: SocialConversationInput!) { createSocialConversation(input: ${D}input) { $CONVERSATION_FIELDS } }""",
            mapOf("input" to mapOf("memberIds" to listOf(userId), "type" to "direct"))
        )
        val value = mapConversation(data.objectValue("createSocialConversation") ?: throw SocialApiException("Conversation was not created"))
        _conversations.value = listOf(value) + _conversations.value.filterNot { it.id == value.id }
        cache.saveConversations(_conversations.value)
        return value
    }

    suspend fun createGroupConversation(title: String, memberIds: List<String>): SocialConversation {
        val data = client.execute(
            """mutation CreateTiwiGroupChat(${D}input: SocialConversationInput!) { createSocialConversation(input: ${D}input) { $CONVERSATION_FIELDS } }""",
            mapOf("input" to mapOf(
                "memberIds" to memberIds.distinct(),
                "type" to "group",
                "title" to title.trim().ifBlank { "New group" }
            ))
        )
        val value = mapConversation(data.objectValue("createSocialConversation") ?: throw SocialApiException("Group chat was not created"))
        _conversations.value = listOf(value) + _conversations.value.filterNot { it.id == value.id }
        cache.saveConversations(_conversations.value)
        return value
    }

    suspend fun respondToMessageRequest(id: String, accept: Boolean): SocialConversation {
        val data = client.execute(
            """mutation RespondTiwiRequest(${D}id: ID!, ${D}accept: Boolean!) { respondToSocialMessageRequest(id: ${D}id, accept: ${D}accept) { $CONVERSATION_FIELDS } }""",
            mapOf("id" to id, "accept" to accept)
        )
        return mapConversation(data.objectValue("respondToSocialMessageRequest") ?: throw SocialApiException("Message request failed")).also { updated ->
            _conversations.value = if (updated.requestStatus == "declined") _conversations.value.filterNot { it.id == id }
            else _conversations.value.map { if (it.id == id) updated else it }
            cache.saveConversations(_conversations.value)
        }
    }

    fun cachedMessages(conversationId: String): List<SocialMessage> {
        val rows = _messages.value[conversationId] ?: cache.messages(conversationId)
        if (_messages.value[conversationId] == null && rows.isNotEmpty()) _messages.value = _messages.value + (conversationId to rows)
        return rows
    }

    suspend fun refreshMessages(conversationId: String): List<SocialMessage> {
        cachedMessages(conversationId)
        val data = client.execute(
            """query TiwiMessages(${D}id: ID!) { socialMessages(conversationId: ${D}id, limit: 100) { $MESSAGE_FIELDS } }""",
            mapOf("id" to conversationId)
        )
        return data.list("socialMessages").mapNotNull { it.objectMap()?.let(::mapMessage) }.also {
            _messages.value = _messages.value + (conversationId to it)
            cache.saveMessages(conversationId, it)
        }
    }

    suspend fun sendMessage(conversationId: String, body: String, media: List<SocialMedia> = emptyList(), replyToId: String? = null): SocialMessage {
        val messageType = media.firstOrNull { it.type in setOf("image", "video", "audio", "file") }?.type ?: "text"
        val local = SocialMessage(
            id = "local-${System.nanoTime()}", conversationId = conversationId, senderId = currentUserId().orEmpty(),
            sender = _currentUser.value ?: SocialUser(), body = body.trim(), type = messageType,
            media = media, replyToId = replyToId, deliveryStatus = "sending", sentAt = System.currentTimeMillis().toString()
        )
        val previous = cachedMessages(conversationId)
        _messages.value = _messages.value + (conversationId to (previous + local))
        cache.saveMessages(conversationId, previous + local)
        return try {
            val data = client.execute(
                """mutation SendTiwiMessage(${D}input: SocialMessageInput!) { sendSocialMessage(input: ${D}input) { $MESSAGE_FIELDS } }""",
                mapOf("input" to mapOf(
                    "conversationId" to conversationId, "body" to body.trim(), "type" to messageType,
                    "media" to media.map(::mediaInput),
                    "replyToId" to replyToId
                ))
            )
            mapMessage(data.objectValue("sendSocialMessage") ?: throw SocialApiException("Message was not sent")).also { sent ->
                val next = _messages.value[conversationId].orEmpty().map { if (it.id == local.id) sent else it }
                _messages.value = _messages.value + (conversationId to next)
                cache.saveMessages(conversationId, next)
            }
        } catch (error: Exception) {
            val next = _messages.value[conversationId].orEmpty().map { if (it.id == local.id) it.copy(deliveryStatus = "failed") else it }
            _messages.value = _messages.value + (conversationId to next)
            cache.saveMessages(conversationId, next)
            throw error
        }
    }

    suspend fun linkPreview(url: String): SocialLinkPreview {
        val data = client.execute(
            """query TiwiLinkPreview(${D}url: String!) { socialLinkPreview(url: ${D}url) { url canonicalUrl domain title description imageUrl siteName faviconUrl registeredAt domainAgeYears } }""",
            mapOf("url" to url)
        )
        val value = data.objectValue("socialLinkPreview") ?: throw SocialApiException("Link preview is unavailable")
        return SocialLinkPreview(
            url = value.string("url").orEmpty(), canonicalUrl = value.string("canonicalUrl").orEmpty(), domain = value.string("domain").orEmpty(),
            title = value.string("title").orEmpty(), description = value.string("description"), imageUrl = absoluteUrl(value.string("imageUrl")),
            siteName = value.string("siteName"), faviconUrl = absoluteUrl(value.string("faviconUrl")), registeredAt = value.string("registeredAt"),
            domainAgeYears = value.number("domainAgeYears")?.toInt()
        )
    }

    suspend fun markConversationRead(id: String) {
        client.execute("""mutation ReadTiwiChat(${D}id: ID!) { markSocialConversationRead(id: ${D}id) { id unreadCount } }""", mapOf("id" to id))
        _conversations.value = _conversations.value.map { if (it.id == id) it.copy(unreadCount = 0) else it }
        cache.saveConversations(_conversations.value)
        _notifications.value = _notifications.value.map { item ->
            if (item.scopeId == id && item.type in listOf("message", "message_request")) item.copy(status = "read") else item
        }
    }

    suspend fun updateConversationMember(
        id: String,
        muted: Boolean? = null,
        archived: Boolean? = null,
        markUnread: Boolean = false,
        leave: Boolean = false,
        deleteForMe: Boolean = false
    ): SocialConversation? {
        val data = client.execute(
            """mutation UpdateTiwiChat(${D}id: ID!, ${D}muted: Boolean, ${D}archived: Boolean, ${D}markUnread: Boolean, ${D}leave: Boolean, ${D}deleteForMe: Boolean) {
                updateSocialConversationMember(id: ${D}id, muted: ${D}muted, archived: ${D}archived, markUnread: ${D}markUnread, leave: ${D}leave, deleteForMe: ${D}deleteForMe) { $CONVERSATION_FIELDS }
            }""",
            mapOf("id" to id, "muted" to muted, "archived" to archived, "markUnread" to markUnread, "leave" to leave, "deleteForMe" to deleteForMe)
        )
        val updated = data.objectValue("updateSocialConversationMember")?.let(::mapConversation)
        _conversations.value = when {
            leave || archived == true || deleteForMe -> _conversations.value.filterNot { it.id == id }
            updated != null && _conversations.value.any { it.id == id } -> _conversations.value.map { if (it.id == id) updated else it }
            updated != null -> listOf(updated) + _conversations.value
            else -> _conversations.value
        }
        if (deleteForMe) {
            _messages.value = _messages.value - id
            cache.saveMessages(id, emptyList())
        }
        cache.saveConversations(_conversations.value)
        return updated
    }

    suspend fun addConversationMembers(id: String, userIds: List<String>): SocialConversation {
        val data = client.execute(
            """mutation AddTiwiChatMembers(${D}id: ID!, ${D}userIds: [ID!]!) {
                addSocialConversationMembers(id: ${D}id, userIds: ${D}userIds) { $CONVERSATION_FIELDS }
            }""",
            mapOf("id" to id, "userIds" to userIds.distinct())
        )
        return mapConversation(data.objectValue("addSocialConversationMembers") ?: throw SocialApiException("Members could not be added")).also { updated ->
            _conversations.value = _conversations.value.map { if (it.id == id) updated else it }
            cache.saveConversations(_conversations.value)
        }
    }

    suspend fun setConversationTyping(id: String, typing: Boolean) {
        client.execute(
            """mutation TiwiTyping(${D}id: ID!, ${D}typing: Boolean!) {
                setSocialConversationTyping(id: ${D}id, typing: ${D}typing) { id typingAt }
            }""",
            mapOf("id" to id, "typing" to typing)
        )
    }

    suspend fun reactToMessage(id: String, emoji: String): SocialMessage {
        val data = client.execute(
            """mutation ReactTiwiMessage(${D}id: ID!, ${D}emoji: String!) { reactToSocialMessage(id: ${D}id, emoji: ${D}emoji) { $MESSAGE_FIELDS } }""",
            mapOf("id" to id, "emoji" to emoji)
        )
        return replaceMessage(mapMessage(data.objectValue("reactToSocialMessage") ?: throw SocialApiException("Reaction failed")))
    }

    suspend fun editMessage(id: String, body: String): SocialMessage {
        val data = client.execute(
            """mutation EditTiwiMessage(${D}id: ID!, ${D}body: String!) { editSocialMessage(id: ${D}id, body: ${D}body) { $MESSAGE_FIELDS } }""",
            mapOf("id" to id, "body" to body.trim())
        )
        return replaceMessage(mapMessage(data.objectValue("editSocialMessage") ?: throw SocialApiException("Message was not edited")))
    }

    suspend fun deleteMessageForMe(id: String) {
        client.execute("""mutation DeleteTiwiMessage(${D}id: ID!) { deleteSocialMessageForMe(id: ${D}id) }""", mapOf("id" to id))
        _messages.value = _messages.value.mapValues { (_, rows) -> rows.filterNot { it.id == id } }
        _messages.value.forEach { (conversationId, rows) -> cache.saveMessages(conversationId, rows) }
    }

    suspend fun startCall(conversationId: String?, calleeId: String, video: Boolean, offer: Map<String, Any?>? = null): SocialCallSession {
        val data = client.execute(
            """mutation StartTiwiCall(${D}input: SocialCallInput!) { startSocialCall(input: ${D}input) { $CALL_FIELDS } }""",
            mapOf("input" to mapOf("conversationId" to conversationId, "calleeId" to calleeId, "type" to if (video) "video" else "audio", "offer" to offer))
        )
        return mapCall(data.objectValue("startSocialCall") ?: throw SocialApiException("Call could not start"))
    }

    suspend fun getCall(id: String): SocialCallSession? {
        val data = client.execute("""query TiwiCall(${D}id: ID!) { socialCall(id: ${D}id) { $CALL_FIELDS } }""", mapOf("id" to id))
        return data.objectValue("socialCall")?.let(::mapCall)
    }

    suspend fun refreshIncomingCalls(): List<SocialCallSession> {
        val data = client.execute("query IncomingTiwiCalls { socialIncomingCalls { $CALL_FIELDS } }")
        return data.list("socialIncomingCalls").mapNotNull { it.objectMap()?.let(::mapCall) }.also { _incomingCalls.value = it }
    }

    suspend fun refreshLiveStreams(): List<SocialLiveStream> {
        val data = client.execute("query TiwiLiveStreams { socialLiveStreams(status: \"live\", limit: 40) { $LIVE_STREAM_FIELDS } }")
        return data.list("socialLiveStreams").mapNotNull { it.objectMap()?.let(::mapLiveStream) }.also { _liveStreams.value = it }
    }

    suspend fun getLiveStream(id: String): SocialLiveStream? {
        val data = client.execute(
            """query TiwiLive(${D}id: ID!) { socialLiveStream(id: ${D}id) { $LIVE_STREAM_FIELDS } }""",
            mapOf("id" to id)
        )
        return data.objectValue("socialLiveStream")?.let(::mapLiveStream)
    }

    suspend fun startLiveStream(title: String, description: String?, visibility: String, commentsEnabled: Boolean = true): SocialLiveStream {
        val data = client.execute(
            """mutation StartTiwiLive(${D}input: SocialLiveStreamInput!) { startSocialLiveStream(input: ${D}input) { $LIVE_STREAM_FIELDS } }""",
            mapOf("input" to mapOf("title" to title.trim(), "description" to description?.trim(), "visibility" to visibility, "commentsEnabled" to commentsEnabled))
        )
        return mapLiveStream(data.objectValue("startSocialLiveStream") ?: throw SocialApiException("Live could not start")).also { live ->
            _liveStreams.value = listOf(live) + _liveStreams.value.filterNot { it.id == live.id }
        }
    }

    suspend fun liveParticipants(streamId: String): List<SocialLiveParticipant> {
        val data = client.execute(
            """query TiwiLiveViewers(${D}id: ID!) { socialLiveParticipants(streamId: ${D}id) { $LIVE_PARTICIPANT_FIELDS } }""",
            mapOf("id" to streamId)
        )
        return data.list("socialLiveParticipants").mapNotNull { it.objectMap()?.let(::mapLiveParticipant) }
    }

    suspend fun joinLiveStream(id: String, asCohost: Boolean = false): SocialLiveParticipant {
        val data = client.execute(
            """mutation JoinTiwiLive(${D}id: ID!, ${D}cohost: Boolean) { joinSocialLiveStream(id: ${D}id, asCohost: ${D}cohost) { $LIVE_PARTICIPANT_FIELDS } }""",
            mapOf("id" to id, "cohost" to asCohost)
        )
        return mapLiveParticipant(data.objectValue("joinSocialLiveStream") ?: throw SocialApiException("Could not join this live"))
    }

    suspend fun inviteLiveCohost(streamId: String, userId: String): Boolean {
        val data = client.execute(
            """mutation InviteTiwiLiveCohost(${D}streamId: ID!, ${D}userId: ID!) { inviteSocialLiveCohost(streamId: ${D}streamId, userId: ${D}userId) }""",
            mapOf("streamId" to streamId, "userId" to userId)
        )
        return data.boolean("inviteSocialLiveCohost")
    }

    suspend fun signalLiveStream(
        participantId: String,
        offer: Map<String, Any?>? = null,
        answer: Map<String, Any?>? = null,
        candidate: Map<String, Any?>? = null,
        status: String? = null
    ): SocialLiveParticipant {
        val input = mapOf("participantId" to participantId, "offer" to offer, "answer" to answer, "iceCandidate" to candidate, "status" to status).filterValues { it != null }
        val data = client.execute(
            """mutation SignalTiwiLive(${D}input: SocialLiveSignalInput!) { signalSocialLiveStream(input: ${D}input) { $LIVE_PARTICIPANT_FIELDS } }""",
            mapOf("input" to input)
        )
        return mapLiveParticipant(data.objectValue("signalSocialLiveStream") ?: throw SocialApiException("Live signal failed"))
    }

    suspend fun heartbeatLiveStream(id: String, paused: Boolean): SocialLiveStream {
        val data = client.execute(
            """mutation HeartbeatTiwiLive(${D}id: ID!, ${D}paused: Boolean) { heartbeatSocialLiveStream(id: ${D}id, paused: ${D}paused) { $LIVE_STREAM_FIELDS } }""",
            mapOf("id" to id, "paused" to paused)
        )
        return mapLiveStream(data.objectValue("heartbeatSocialLiveStream") ?: throw SocialApiException("Live heartbeat failed"))
    }

    suspend fun leaveLiveStream(id: String) {
        client.execute("""mutation LeaveTiwiLive(${D}id: ID!) { leaveSocialLiveStream(id: ${D}id) }""", mapOf("id" to id))
        _liveStreams.value = _liveStreams.value.filterNot { it.id == id }
    }

    suspend fun liveComments(streamId: String): List<SocialLiveComment> {
        val data = client.execute(
            """query TiwiLiveComments(${D}id: ID!) { socialLiveComments(streamId: ${D}id, limit: 200) { $LIVE_COMMENT_FIELDS } }""",
            mapOf("id" to streamId)
        )
        return data.list("socialLiveComments").mapNotNull { it.objectMap()?.let(::mapLiveComment) }
    }

    suspend fun addLiveComment(streamId: String, body: String, replyToId: String? = null): SocialLiveComment {
        val data = client.execute(
            """mutation CommentTiwiLive(${D}id: ID!, ${D}body: String!, ${D}reply: ID) { addSocialLiveComment(streamId: ${D}id, body: ${D}body, replyToId: ${D}reply) { $LIVE_COMMENT_FIELDS } }""",
            mapOf("id" to streamId, "body" to body.trim(), "reply" to replyToId)
        )
        return mapLiveComment(data.objectValue("addSocialLiveComment") ?: throw SocialApiException("Comment was not sent"))
    }

    suspend fun deleteLiveComment(id: String) {
        client.execute("""mutation DeleteTiwiLiveComment(${D}id: ID!) { deleteSocialLiveComment(id: ${D}id) }""", mapOf("id" to id))
    }

    suspend fun socialSettings(): Map<String, Any?> {
        val data = client.execute("query TiwiSocialSettings { socialSettings }")
        return data.objectValue("socialSettings") ?: emptyMap()
    }

    suspend fun copyrightStudio(): SocialCopyrightStudio {
        val data = client.execute("query TiwiCopyrightStudio { socialCopyrightStudio { $COPYRIGHT_STUDIO_FIELDS } }")
        return mapCopyrightStudio(data.objectValue("socialCopyrightStudio") ?: throw SocialApiException("Copyright Studio could not be loaded"))
    }

    suspend fun scanCopyrightLibrary(): SocialCopyrightStudio {
        try {
            val data = client.execute("mutation ScanTiwiCopyright { scanSocialCopyrightLibrary { $COPYRIGHT_STUDIO_FIELDS } }")
            return mapCopyrightStudio(data.objectValue("scanSocialCopyrightLibrary") ?: throw SocialApiException("Copyright library scan failed"))
        } catch (error: SocialApiException) {
            // An older production backend must never expose its raw GraphQL
            // schema error to a creator. The mutation is deployed with the
            // Copyright Studio backend; until that deployment finishes, the
            // app keeps the existing library readable and gives a clear state.
            if (error.message.orEmpty().contains("scanSocialCopyrightLibrary", ignoreCase = true) &&
                error.message.orEmpty().contains("Cannot query field", ignoreCase = true)
            ) {
                throw SocialApiException(
                    "Copyright scanning is being updated on the Tiwlo server. Your protected media is safe; refresh this page after the server update finishes.",
                    "COPYRIGHT_API_UPDATING"
                )
            }
            throw error
        }
    }

    suspend fun registerCopyrightReference(postId: String, title: String, protectionEnabled: Boolean = true, autoRemoveMatches: Boolean = false): SocialCopyrightReference {
        val input = mapOf("postId" to postId, "title" to title, "protectionEnabled" to protectionEnabled, "autoRemoveMatches" to autoRemoveMatches)
        val data = client.execute(
            """mutation RegisterTiwiCopyright(${D}input: SocialCopyrightReferenceInput!) { registerSocialCopyrightReference(input: ${D}input) { $COPYRIGHT_REFERENCE_FIELDS } }""",
            mapOf("input" to input)
        )
        return mapCopyrightReference(data.objectValue("registerSocialCopyrightReference") ?: throw SocialApiException("Copyright protection could not be enabled"))
    }

    suspend fun updateCopyrightReference(id: String, protectionEnabled: Boolean? = null, autoRemoveMatches: Boolean? = null): SocialCopyrightReference {
        val input = mutableMapOf<String, Any?>("id" to id)
        protectionEnabled?.let { input["protectionEnabled"] = it }
        autoRemoveMatches?.let { input["autoRemoveMatches"] = it }
        val data = client.execute(
            """mutation UpdateTiwiCopyright(${D}input: SocialCopyrightReferenceUpdateInput!) { updateSocialCopyrightReference(input: ${D}input) { $COPYRIGHT_REFERENCE_FIELDS } }""",
            mapOf("input" to input)
        )
        return mapCopyrightReference(data.objectValue("updateSocialCopyrightReference") ?: throw SocialApiException("Copyright settings could not be updated"))
    }

    suspend fun actOnCopyrightClaim(id: String, action: String): SocialCopyrightClaim {
        val data = client.execute(
            """mutation CopyrightClaimAction(${D}id: ID!, ${D}action: String!) { actOnSocialCopyrightClaim(id: ${D}id, action: ${D}action) { $COPYRIGHT_CLAIM_FIELDS } }""",
            mapOf("id" to id, "action" to action)
        )
        return mapCopyrightClaim(data.objectValue("actOnSocialCopyrightClaim") ?: throw SocialApiException("Copyright action failed"))
    }

    suspend fun requestCopyrightReview(id: String, reason: String): SocialCopyrightClaim {
        val data = client.execute(
            """mutation RequestTiwiCopyrightReview(${D}id: ID!, ${D}reason: String) { requestSocialCopyrightReview(id: ${D}id, reason: ${D}reason) { $COPYRIGHT_CLAIM_FIELDS } }""",
            mapOf("id" to id, "reason" to reason.trim().take(1000))
        )
        return mapCopyrightClaim(data.objectValue("requestSocialCopyrightReview") ?: throw SocialApiException("Copyright review could not be requested"))
    }

    suspend fun refreshNotifications(): List<SocialNotification> {
        val data = client.execute("query TiwiNotifications { notifications(scope: \"social\") { $NOTIFICATION_FIELDS } }")
        return data.list("notifications").mapNotNull { it.objectMap()?.let(::mapNotification) }.also { _notifications.value = it }
    }

    suspend fun markNotificationRead(id: String): SocialNotification {
        val data = client.execute(
            """mutation ReadTiwiNotification(${D}id: ID!) { markNotificationRead(id: ${D}id) { $NOTIFICATION_FIELDS } }""",
            mapOf("id" to id)
        )
        return mapNotification(data.objectValue("markNotificationRead") ?: throw SocialApiException("Notification could not be updated")).also { updated ->
            _notifications.value = _notifications.value.map { if (it.id == id) updated else it }
        }
    }

    suspend fun verificationOptions(): SocialVerificationOptions = supervisorScope {
        val socialJob = async {
            client.execute("""query TiwiVerificationOptions { socialSettings availablePaymentGateways { key name provider status } }""")
        }
        val currencyJob = async { runCatching { client.getJson("/api/platform/currency") }.getOrDefault(emptyMap()) }
        val data = socialJob.await()
        val currencyData = currencyJob.await()
        val settings = data.objectValue("socialSettings") ?: emptyMap()
        val detectedCountry = currencyData.string("detectedCountry") ?: currencyData.string("countryCode") ?: currencyData.string("country")
        val currency = if (detectedCountry.equals("BD", ignoreCase = true) || detectedCountry.equals("Bangladesh", ignoreCase = true)) "BDT" else "USD"
        val policy = currencyData.objectValue("policy") ?: emptyMap()
        val rates = policy.objectValue("rates") ?: emptyMap()
        val targetRate = rates.number(currency)?.toDouble()?.takeIf { it > 0 } ?: 1.0
        val sourceRate = rates.number("USD")?.toDouble()?.takeIf { it > 0 } ?: 1.0
        val usdRate = targetRate / sourceRate
        SocialVerificationOptions(
            packages = settings.list("verificationPackages").mapNotNull { row -> row.objectMap()?.let { plan ->
                SocialVerificationPackage(
                    id = plan.string("id").orEmpty(), name = plan.string("name") ?: "Verification",
                    badgeType = plan.string("badgeType") ?: "blue", priceUsd = plan.number("priceUsd")?.toDouble() ?: 0.0,
                    periodMonths = plan.number("periodMonths")?.toInt() ?: 1, enabled = plan["enabled"] as? Boolean ?: true,
                    notableOnly = plan.boolean("notableOnly"), features = plan.list("features").map { it.toString() }
                )
            } }.filter { it.enabled },
            gateways = data.list("availablePaymentGateways").mapNotNull { row -> row.objectMap()?.let { gateway ->
                SocialPaymentGateway(gateway.string("key") ?: gateway.string("provider").orEmpty(), gateway.string("name") ?: gateway.string("provider").orEmpty(), gateway.string("provider").orEmpty())
            } },
            currency = currency,
            usdRate = usdRate
        )
    }

    suspend fun startVerificationCheckout(packageId: String, provider: String, currency: String): SocialCheckout {
        val data = client.execute(
            """mutation TiwiVerificationCheckout(${D}packageId: String!, ${D}provider: String!, ${D}currency: String) {
                startSocialVerificationCheckout(packageId: ${D}packageId, provider: ${D}provider, currency: ${D}currency) { status provider paymentUrl message }
            }""",
            mapOf("packageId" to packageId, "provider" to provider, "currency" to currency)
        )
        val checkout = data.objectValue("startSocialVerificationCheckout") ?: throw SocialApiException("Verification checkout did not start")
        return SocialCheckout(checkout.string("status") ?: "pending", checkout.string("provider") ?: provider, checkout.string("paymentUrl"), checkout.string("message"))
    }

    suspend fun profileDecorations(): List<SocialProfileDecoration> {
        val data = client.execute("query TiwiProfileDecorations { socialProfileDecorations { $DECORATION_FIELDS } }")
        return data.list("socialProfileDecorations").mapNotNull { it.objectMap()?.let(::mapDecoration) }
    }

    suspend fun applyProfileDecoration(id: String?): SocialProfile {
        val data = client.execute(
            """mutation ApplyTiwiProfileDecoration(${D}id: ID) { applySocialProfileDecoration(id: ${D}id) { $PROFILE_FIELDS } }""",
            mapOf("id" to id)
        )
        return mapProfile(data.objectValue("applySocialProfileDecoration") ?: throw SocialApiException("Decoration was not applied")).also {
            _profile.value = it
            cache.saveProfile(it)
        }
    }

    suspend fun startProfileDecorationCheckout(id: String, provider: String, currency: String): SocialCheckout {
        val data = client.execute(
            """mutation TiwiProfileDecorationCheckout(${D}id: ID!, ${D}provider: String!, ${D}currency: String) {
                startSocialProfileDecorationCheckout(id: ${D}id, provider: ${D}provider, currency: ${D}currency) { status provider paymentUrl message }
            }""",
            mapOf("id" to id, "provider" to provider, "currency" to currency)
        )
        val checkout = data.objectValue("startSocialProfileDecorationCheckout") ?: throw SocialApiException("Decoration checkout did not start")
        return SocialCheckout(checkout.string("status") ?: "pending", checkout.string("provider") ?: provider, checkout.string("paymentUrl"), checkout.string("message"))
    }

    suspend fun profileEffects(): List<SocialProfileDecoration> {
        val data = client.execute("query TiwiProfileEffects { socialProfileEffects { $DECORATION_FIELDS } }")
        return data.list("socialProfileEffects").mapNotNull { it.objectMap()?.let(::mapDecoration) }
    }

    suspend fun profileEffectPlayback(): SocialProfileEffectPlayback {
        val settings = socialSettings().objectValue("profileEffects") ?: emptyMap()
        return SocialProfileEffectPlayback(
            replayIntervalSeconds = (settings.number("replayIntervalSeconds")?.toInt() ?: 0).coerceIn(0, 3600),
            loopCount = (settings.number("loopCount")?.toInt() ?: 2).coerceIn(1, 10)
        )
    }

    suspend fun applyProfileEffect(id: String?): SocialProfile {
        val data = client.execute(
            """mutation ApplyTiwiProfileEffect(${D}id: ID) { applySocialProfileEffect(id: ${D}id) { $PROFILE_FIELDS } }""",
            mapOf("id" to id)
        )
        return mapProfile(data.objectValue("applySocialProfileEffect") ?: throw SocialApiException("Profile effect was not applied")).also {
            _profile.value = it
            cache.saveProfile(it)
        }
    }

    suspend fun startProfileEffectCheckout(id: String, provider: String, currency: String): SocialCheckout {
        val data = client.execute(
            """mutation TiwiProfileEffectCheckout(${D}id: ID!, ${D}provider: String!, ${D}currency: String) {
                startSocialProfileEffectCheckout(id: ${D}id, provider: ${D}provider, currency: ${D}currency) { status provider paymentUrl message }
            }""",
            mapOf("id" to id, "provider" to provider, "currency" to currency)
        )
        val checkout = data.objectValue("startSocialProfileEffectCheckout") ?: throw SocialApiException("Profile effect checkout did not start")
        return SocialCheckout(checkout.string("status") ?: "pending", checkout.string("provider") ?: provider, checkout.string("paymentUrl"), checkout.string("message"))
    }

    suspend fun signalCall(id: String, status: String? = null, offer: Map<String, Any?>? = null, answer: Map<String, Any?>? = null, candidate: Map<String, Any?>? = null): SocialCallSession {
        val data = client.execute(
            """mutation SignalTiwiCall(${D}input: SocialCallSignalInput!) { signalSocialCall(input: ${D}input) { $CALL_FIELDS } }""",
            mapOf("input" to mapOf("id" to id, "status" to status, "offer" to offer, "answer" to answer, "iceCandidate" to candidate))
        )
        return mapCall(data.objectValue("signalSocialCall") ?: throw SocialApiException("Call signal failed"))
    }

    suspend fun endCall(id: String, status: String = "ended") {
        _incomingCalls.value = _incomingCalls.value.filterNot { it.id == id }
        client.execute("""mutation EndTiwiCall(${D}id: ID!, ${D}status: String) { endSocialCall(id: ${D}id, status: ${D}status) { id status } }""", mapOf("id" to id, "status" to status))
    }

    fun dismissIncomingCall(id: String) {
        _incomingCalls.value = _incomingCalls.value.filterNot { it.id == id }
    }

    suspend fun unsendMessage(id: String) {
        val data = client.execute("""mutation UnsendTiwi(${D}id: ID!) { unsendSocialMessage(id: ${D}id) { $MESSAGE_FIELDS } }""", mapOf("id" to id))
        val value = mapMessage(data.objectValue("unsendSocialMessage") ?: throw SocialApiException("Message was not unsent"))
        _messages.value = _messages.value.mapValues { (_, rows) -> rows.map { if (it.id == id) value else it } }
        _messages.value.forEach { (conversationId, rows) -> cache.saveMessages(conversationId, rows) }
    }

    private fun replaceMessage(value: SocialMessage): SocialMessage {
        _messages.value = _messages.value.mapValues { (_, rows) -> rows.map { if (it.id == value.id) value else it } }
        _messages.value.forEach { (conversationId, rows) -> cache.saveMessages(conversationId, rows) }
        return value
    }

    suspend fun startPasswordReset(identifier: String): PasswordResetChallenge {
        val data = client.execute(
            """mutation StartTiwiReset(${D}identifier: String) { startPasswordResetOtp(identifier: ${D}identifier) { ok challengeId channel destination expiresAt resendAvailableAt message } }""",
            mapOf("identifier" to identifier.trim())
        )
        return mapReset(data.objectValue("startPasswordResetOtp") ?: throw SocialApiException("Password reset could not start"))
    }

    suspend fun resendPasswordReset(challengeId: String): PasswordResetChallenge {
        val data = client.execute(
            """mutation ResendTiwiReset(${D}id: ID!) { resendPasswordResetOtp(challengeId: ${D}id) { ok challengeId channel destination expiresAt resendAvailableAt message } }""",
            mapOf("id" to challengeId)
        )
        return mapReset(data.objectValue("resendPasswordResetOtp") ?: throw SocialApiException("Code was not resent"))
    }

    suspend fun verifyPasswordReset(challengeId: String, code: String): String {
        val data = client.execute(
            """mutation VerifyTiwiReset(${D}id: ID!, ${D}code: String!) { verifyPasswordResetOtp(challengeId: ${D}id, code: ${D}code) { ok resetToken message } }""",
            mapOf("id" to challengeId, "code" to code.trim())
        )
        return data.objectValue("verifyPasswordResetOtp")?.string("resetToken") ?: throw SocialApiException("Invalid reset code")
    }

    suspend fun resetPassword(resetToken: String, password: String): SocialUser {
        val data = client.execute(
            """mutation FinishTiwiReset(${D}token: String!, ${D}password: String!) { resetPassword(token: ${D}token, password: ${D}password) { token user { $USER_FIELDS } } }""",
            mapOf("token" to resetToken, "password" to password)
        )
        val payload = data.objectValue("resetPassword") ?: throw SocialApiException("Password was not reset")
        val user = mapUser(payload.objectValue("user") ?: throw SocialApiException("Account was not returned"))
        saveSession(payload.string("token") ?: throw SocialApiException("Session token was not returned"), user)
        return user
    }

    fun logout() {
        token = null
        session.edit().clear().apply()
        cache.clear()
        _currentUser.value = null
        _profile.value = null
        _feed.value = emptyList()
        _conversations.value = emptyList()
        _messages.value = emptyMap()
        _comments.value = emptyMap()
        _storyTray.value = emptyList()
        _storyMemories.value = emptyList()
    }

    private fun saveSession(value: String, user: SocialUser) {
        token = value
        session.edit().putString("token", value).apply()
        setUser(user)
    }

    private fun setUser(user: SocialUser) {
        _currentUser.value = user
        cache.saveUser(user)
    }

    private fun mapUser(value: Map<String, Any?>) = SocialUser(
        id = value.string("id").orEmpty(), email = value.string("email").orEmpty(), name = value.string("name").orEmpty(),
        avatar = absoluteUrl(value.string("avatar")), role = value.string("role") ?: "user", status = value.string("status") ?: "active",
        socialRestrictionCode = value.string("socialRestrictionCode"), socialRestrictionReason = value.string("socialRestrictionReason"),
        socialRestrictedAt = value.string("socialRestrictedAt"), socialModerationScore = value.number("socialModerationScore")?.toDouble(),
        signupSource = value.string("signupSource") ?: "web", emailVerifiedAt = value.string("emailVerifiedAt"),
        phone = value.string("phone"), mobileCountryCode = value.string("mobileCountryCode"), primaryRegion = value.string("primaryRegion"),
        country = value.string("country"), addressLine1 = value.string("addressLine1"), city = value.string("city"), state = value.string("state"),
        postalCode = value.string("postalCode"), billingName = value.string("billingName"), socialLastActiveAt = value.string("socialLastActiveAt")
    )

    private fun mapDecoration(value: Map<String, Any?>) = SocialProfileDecoration(
        id = value.string("id").orEmpty(), slug = value.string("slug").orEmpty(), name = value.string("name").orEmpty(),
        kind = value.string("kind") ?: "avatar-decoration",
        assetUrl = absoluteUrl(value.string("assetUrl")).orEmpty(), fileName = value.string("fileName").orEmpty(),
        mimeType = value.string("mimeType") ?: "image/png", animated = value.boolean("animated"),
        width = value.number("width")?.toInt() ?: 288, height = value.number("height")?.toInt() ?: 288,
        priceUsd = value.number("priceUsd")?.toDouble() ?: 0.0, status = value.string("status") ?: "active",
        sortOrder = value.number("sortOrder")?.toInt() ?: 0, owned = value.boolean("owned"), applied = value.boolean("applied"),
        ownershipSource = value.string("ownershipSource")
    )

    private fun mapProfile(value: Map<String, Any?>, fallback: SocialUser? = null): SocialProfile {
        val publicUser = value.objectValue("user")?.let(::mapUser) ?: fallback ?: SocialUser(id = value.string("userId").orEmpty(), name = value.string("username").orEmpty())
        val user = if (publicUser.id == currentUserId()) {
            val current = _currentUser.value
            current?.copy(name = publicUser.name.ifBlank { current.name }, avatar = publicUser.avatar ?: current.avatar) ?: publicUser
        } else publicUser
        return SocialProfile(
            id = value.string("id").orEmpty(), userId = value.string("userId") ?: user.id, user = user,
            username = value.string("username").orEmpty(), bio = value.string("bio"), about = value.string("about"),
            category = value.string("category"), website = value.string("website"), location = value.string("location"),
            coverUrl = absoluteUrl(value.string("coverUrl")), verified = value.boolean("verified"),
            badgeType = value.string("badgeType") ?: if (value.boolean("verified")) "blue" else "none",
            badgePlan = value.string("badgePlan"), badgeExpiresAt = value.string("badgeExpiresAt"),
            avatarDecoration = value.objectValue("avatarDecoration")?.let(::mapDecoration),
            profileEffect = value.objectValue("profileEffect")?.let(::mapDecoration),
            privacy = value.objectValue("privacy") ?: emptyMap(), preferences = value.objectValue("preferences") ?: emptyMap(),
            followerCount = value.number("followerCount")?.toInt() ?: 0, followingCount = value.number("followingCount")?.toInt() ?: 0,
            postCount = value.number("postCount")?.toInt() ?: 0, isFollowing = value.boolean("isFollowing"),
            createdAt = value.string("createdAt")
        )
    }

    private fun mapMedia(value: Map<String, Any?>) = SocialMedia(
        url = absoluteUrl(value.string("url")).orEmpty(), type = value.string("type") ?: "image",
        hlsUrl = absoluteUrl(value.string("hlsUrl")), thumbnailUrl = absoluteUrl(value.string("thumbnailUrl")),
        mimeType = value.string("mimeType"), processingId = value.string("processingId"),
        processingStatus = value.string("processingStatus") ?: "ready",
        sharedPostId = value.string("sharedPostId"), sharedRootPostId = value.string("sharedRootPostId"), sharedAuthorId = value.string("sharedAuthorId"),
        sharedAuthor = value.string("sharedAuthor"), sharedAvatar = absoluteUrl(value.string("sharedAvatar")),
        sharedBody = value.string("sharedBody"), sharedMediaType = value.string("sharedMediaType"),
        sharedViews = value.number("sharedViews")?.toInt() ?: 0,
        sharedReactions = value.number("sharedReactions")?.toInt() ?: 0,
        sharedComments = value.number("sharedComments")?.toInt() ?: 0,
        sharedPublishedAt = value.string("sharedPublishedAt"), storyId = value.string("storyId"), storyItemId = value.string("itemId"),
        storyAuthorId = value.string("authorId"), title = value.string("title"), description = value.string("description"),
        siteName = value.string("siteName"), domain = value.string("domain"), displayUrl = value.string("displayUrl"),
        domainAgeYears = value.number("domainAgeYears")?.toInt(), forwarded = value.boolean("forwarded"),
        forwardedFromName = value.string("forwardedFromName"), forwardedFromMessageId = value.string("forwardedFromMessageId")
    )

    private fun mapPost(value: Map<String, Any?>): SocialPost {
        val author = mapUser(value.objectValue("author") ?: emptyMap())
        return SocialPost(
            id = value.string("id").orEmpty(), authorId = value.string("authorId") ?: author.id, author = author,
            authorProfile = value.objectValue("authorProfile")?.let { mapProfile(it, author) }, type = value.string("type") ?: "post",
            collaborators = value.list("collaborators").mapNotNull { raw ->
                raw.objectMap()?.let { profile ->
                    val collaborator = mapUser(profile.objectValue("user") ?: emptyMap())
                    mapProfile(profile, collaborator)
                }
            },
            body = value.string("body").orEmpty(), media = value.list("media").mapNotNull { it.objectMap()?.let(::mapMedia) },
            metadata = value.objectValue("metadata") ?: emptyMap(),
            thumbnailUrl = absoluteUrl(value.string("thumbnailUrl")), hlsUrl = absoluteUrl(value.string("hlsUrl")),
            processingStatus = value.string("processingStatus") ?: "ready", visibility = value.string("visibility") ?: "public",
            commentPermission = value.string("commentPermission") ?: "everyone", pinned = value.boolean("pinned"),
            groupId = value.string("groupId"), saved = value.boolean("saved"),
            status = value.string("status") ?: "published", viewCount = value.number("viewCount")?.toInt() ?: 0,
            shareCount = value.number("shareCount")?.toInt() ?: 0, saveCount = value.number("saveCount")?.toInt() ?: 0,
            reactionCount = value.number("reactionCount")?.toInt() ?: 0,
            commentCount = value.number("commentCount")?.toInt() ?: 0, viewerReaction = value.string("viewerReaction"),
            recommended = value.boolean("recommended"), recommendationLabel = value.string("recommendationLabel"),
            copyrightReference = value.objectValue("copyrightReference")?.let(::mapCopyrightReference),
            publishedAt = value.string("publishedAt")
        )
    }

    private fun mapStoryItem(value: Map<String, Any?>): SocialStoryItem = SocialStoryItem(
        id = value.string("id").orEmpty(),
        storyId = value.string("storyId").orEmpty(),
        type = value.string("type") ?: "image",
        media = normalizeStoryMap(value.objectValue("media") ?: emptyMap()),
        text = value.string("text"),
        background = value.string("background"),
        filter = value.objectValue("filter") ?: emptyMap(),
        transform = value.objectValue("transform") ?: emptyMap(),
        overlays = value.list("overlays").mapNotNull { it.objectMap()?.let(::normalizeStoryMap) },
        durationMs = value.number("durationMs")?.toInt() ?: 5_000,
        altText = value.string("altText"),
        aiGenerated = value.boolean("aiGenerated"),
        music = normalizeStoryMap(value.objectValue("music") ?: emptyMap()),
        status = value.string("status") ?: "active",
        sortOrder = value.number("sortOrder")?.toInt() ?: 0,
        reactionCount = value.number("reactionCount")?.toInt() ?: 0,
        viewerReaction = value.string("viewerReaction"),
        interactionCount = value.number("interactionCount")?.toInt() ?: 0,
        viewerInteractions = value.list("viewerInteractions").mapNotNull { it.objectMap()?.let(::mapStoryInteraction) },
        createdAt = value.string("createdAt"),
        updatedAt = value.string("updatedAt")
    )

    private fun normalizeStoryMap(value: Map<String, Any?>): Map<String, Any?> = value.mapValues { (key, raw) ->
        when {
            raw is String && (key.equals("url", true) || key.endsWith("Url", true)) -> absoluteUrl(raw)
            raw is Map<*, *> -> normalizeStoryMap(raw.entries.mapNotNull { (childKey, childValue) ->
                (childKey as? String)?.let { it to childValue }
            }.toMap())
            raw is List<*> -> raw.map { child ->
                if (child is Map<*, *>) normalizeStoryMap(child.entries.mapNotNull { (childKey, childValue) ->
                    (childKey as? String)?.let { it to childValue }
                }.toMap()) else child
            }
            else -> raw
        }
    }

    private fun mapStory(value: Map<String, Any?>): SocialStory {
        val author = mapUser(value.objectValue("author") ?: emptyMap())
        return SocialStory(
            id = value.string("id").orEmpty(),
            authorId = value.string("authorId") ?: author.id,
            author = author,
            authorProfile = value.objectValue("authorProfile")?.let { mapProfile(it, author) },
            visibility = value.string("visibility") ?: "public",
            customAudienceIds = value.list("customAudienceIds").mapNotNull { it as? String },
            allowReplies = value["allowReplies"] as? Boolean ?: true,
            status = value.string("status") ?: "active",
            caption = value.string("caption"),
            metadata = value.objectValue("metadata") ?: emptyMap(),
            items = value.list("items").mapNotNull { it.objectMap()?.let(::mapStoryItem) }.sortedBy { it.sortOrder },
            viewerCount = value.number("viewerCount")?.toInt() ?: 0,
            reactionCount = value.number("reactionCount")?.toInt() ?: 0,
            replyCount = value.number("replyCount")?.toInt() ?: 0,
            seen = value.boolean("seen"),
            viewerLastItemSortOrder = value.number("viewerLastItemSortOrder")?.toInt() ?: 0,
            expiresAt = value.string("expiresAt"),
            archivedAt = value.string("archivedAt"),
            createdAt = value.string("createdAt"),
            updatedAt = value.string("updatedAt")
        )
    }

    private fun mapStoryGroup(value: Map<String, Any?>): SocialStoryGroup {
        val author = mapUser(value.objectValue("author") ?: emptyMap())
        return SocialStoryGroup(
            authorId = value.string("authorId") ?: author.id,
            author = author,
            authorProfile = value.objectValue("authorProfile")?.let { mapProfile(it, author) },
            stories = value.list("stories").mapNotNull { it.objectMap()?.let(::mapStory) },
            unseenCount = value.number("unseenCount")?.toInt() ?: 0,
            latestAt = value.string("latestAt")
        )
    }

    private fun mapStoryView(value: Map<String, Any?>): SocialStoryView {
        val viewer = mapUser(value.objectValue("viewer") ?: emptyMap())
        return SocialStoryView(
            id = value.string("id").orEmpty(),
            viewerId = value.string("viewerId") ?: viewer.id,
            viewer = viewer,
            viewerProfile = value.objectValue("viewerProfile")?.let { mapProfile(it, viewer) },
            lastItemSortOrder = value.number("lastItemSortOrder")?.toInt() ?: 0,
            viewedAt = value.string("viewedAt")
        )
    }

    private fun mapStoryReply(value: Map<String, Any?>): SocialStoryReply {
        val sender = mapUser(value.objectValue("sender") ?: emptyMap())
        return SocialStoryReply(
            id = value.string("id").orEmpty(),
            storyId = value.string("storyId").orEmpty(),
            itemId = value.string("itemId").orEmpty(),
            senderId = value.string("senderId") ?: sender.id,
            sender = sender,
            senderProfile = value.objectValue("senderProfile")?.let { mapProfile(it, sender) },
            body = value.string("body").orEmpty(),
            conversationId = value.string("conversationId"),
            messageId = value.string("messageId"),
            createdAt = value.string("createdAt")
        )
    }

    private fun mapStoryInteraction(value: Map<String, Any?>): SocialStoryInteraction {
        val user = mapUser(value.objectValue("user") ?: emptyMap())
        return SocialStoryInteraction(
            id = value.string("id").orEmpty(),
            storyId = value.string("storyId").orEmpty(),
            itemId = value.string("itemId").orEmpty(),
            userId = value.string("userId") ?: user.id,
            user = user,
            userProfile = value.objectValue("userProfile")?.let { mapProfile(it, user) },
            kind = value.string("kind").orEmpty(),
            key = value.string("key").orEmpty(),
            value = value.objectValue("value") ?: emptyMap(),
            createdAt = value.string("createdAt"),
            updatedAt = value.string("updatedAt")
        )
    }

    private fun mapStoryMusic(value: Map<String, Any?>): SocialStoryMusicTrack = SocialStoryMusicTrack(
        id = value.string("id").orEmpty(),
        title = value.string("title").orEmpty(),
        artist = value.string("artist").orEmpty(),
        artworkUrl = absoluteUrl(value.string("artworkUrl")),
        streamUrl = absoluteUrl(value.string("streamUrl")).orEmpty(),
        durationSeconds = value.number("durationSeconds")?.toInt() ?: 0
    )

    private fun mapFeedModule(value: Map<String, Any?>) = SocialFeedModule(
        id = value.string("id").orEmpty(),
        kind = value.string("kind") ?: "people",
        insertAfter = value.number("insertAfter")?.toInt() ?: 2,
        title = value.string("title") ?: "Suggested for you",
        profiles = value.list("profiles").mapNotNull { it.objectMap()?.let(::mapProfile) },
        posts = value.list("posts").mapNotNull { it.objectMap()?.let(::mapPost) }
    )

    private fun mapAd(value: Map<String, Any?>) = SocialAd(
        id = value.string("id").orEmpty(), advertiserName = value.string("advertiserName").orEmpty(),
        advertiserAvatarUrl = absoluteUrl(value.string("advertiserAvatarUrl")), headline = value.string("headline"), body = value.string("body"),
        media = value.list("media").mapNotNull { it.objectMap()?.let(::mapMedia) }, ctaType = value.string("ctaType") ?: "website",
        destinationUrl = value.string("destinationUrl"), placements = value.list("placements").mapNotNull { it as? String },
        status = value.string("status") ?: "active", startAt = value.string("startAt"), endAt = value.string("endAt"),
        skipAfterSeconds = value.number("skipAfterSeconds")?.toInt() ?: 5, frequencyCap = value.number("frequencyCap")?.toInt() ?: 2,
        impressionCount = value.number("impressionCount")?.toInt() ?: 0, clickCount = value.number("clickCount")?.toInt() ?: 0
    )

    private fun mapMessage(value: Map<String, Any?>) = SocialMessage(
        id = value.string("id").orEmpty(), conversationId = value.string("conversationId").orEmpty(), senderId = value.string("senderId").orEmpty(),
        sender = mapUser(value.objectValue("sender") ?: emptyMap()), senderProfile = value.objectValue("senderProfile")?.let { mapProfile(it) }, type = value.string("type") ?: "text", body = value.string("body").orEmpty(),
        media = value.list("media").mapNotNull { it.objectMap()?.let(::mapMedia) }, replyToId = value.string("replyToId"),
        deliveryStatus = value.string("deliveryStatus") ?: "sent", sentAt = value.string("sentAt"), deliveredAt = value.string("deliveredAt"),
        readAt = value.string("readAt"), editedAt = value.string("editedAt"), unsentAt = value.string("unsentAt"),
        reactions = value.list("reactions").mapNotNull { row -> row.objectMap()?.let { SocialMessageReaction(it.string("id").orEmpty(), it.string("userId").orEmpty(), it.string("emoji").orEmpty()) } }
    )

    private fun mapConversation(value: Map<String, Any?>) = SocialConversation(
        id = value.string("id").orEmpty(), type = value.string("type") ?: "direct", title = value.string("title"), avatarUrl = absoluteUrl(value.string("avatarUrl")),
        requestStatus = value.string("requestStatus") ?: "accepted", requestedById = value.string("requestedById"),
        members = value.list("members").mapNotNull { row -> row.objectMap()?.let { member ->
            val user = mapUser(member.objectValue("user") ?: emptyMap())
            SocialConversationMember(
                id = member.string("id").orEmpty(),
                userId = member.string("userId") ?: user.id,
                user = user,
                profile = member.objectValue("profile")?.let { mapProfile(it, user) },
                role = member.string("role") ?: "member",
                muted = member.boolean("muted"),
                archived = member.boolean("archived"),
                typingAt = member.string("typingAt"),
                lastReadAt = member.string("lastReadAt"),
                blocked = member.boolean("blocked")
            )
        } },
        lastMessage = value.objectValue("lastMessage")?.let(::mapMessage), unreadCount = value.number("unreadCount")?.toInt() ?: 0, updatedAt = value.string("updatedAt")
    )

    private fun mapCall(value: Map<String, Any?>) = SocialCallSession(
        id = value.string("id").orEmpty(), conversationId = value.string("conversationId"), callerId = value.string("callerId").orEmpty(),
        caller = mapUser(value.objectValue("caller") ?: emptyMap()), calleeId = value.string("calleeId").orEmpty(),
        callee = mapUser(value.objectValue("callee") ?: emptyMap()), type = value.string("type") ?: "audio", status = value.string("status") ?: "ringing",
        offer = value.objectValue("offer"), answer = value.objectValue("answer"), iceCandidates = value.list("iceCandidates").mapNotNull { it.objectMap() }
    )

    private fun mapLiveStream(value: Map<String, Any?>) = SocialLiveStream(
        id = value.string("id").orEmpty(), hostId = value.string("hostId").orEmpty(),
        host = mapUser(value.objectValue("host") ?: emptyMap()),
        hostProfile = value.objectValue("hostProfile")?.let(::mapProfile),
        title = value.string("title").orEmpty(), description = value.string("description"),
        status = value.string("status") ?: "live", visibility = value.string("visibility") ?: "public",
        playbackUrl = absoluteUrl(value.string("playbackUrl")), qualities = value.list("qualities").mapNotNull { it?.toString() },
        viewerCount = value.number("viewerCount")?.toInt() ?: 0, commentsEnabled = value.boolean("commentsEnabled"), paused = value.boolean("paused"),
        lastHeartbeatAt = value.string("lastHeartbeatAt"), startedAt = value.string("startedAt"), endedAt = value.string("endedAt")
    )

    private fun mapLiveParticipant(value: Map<String, Any?>) = SocialLiveParticipant(
        id = value.string("id").orEmpty(), streamId = value.string("streamId").orEmpty(), viewerId = value.string("viewerId").orEmpty(),
        viewer = mapUser(value.objectValue("viewer") ?: emptyMap()), viewerProfile = value.objectValue("viewerProfile")?.let(::mapProfile),
        status = value.string("status") ?: "joining", role = value.string("role") ?: "viewer", microphoneEnabled = value.boolean("microphoneEnabled"),
        hostOffer = value.objectValue("hostOffer"), viewerAnswer = value.objectValue("viewerAnswer"),
        hostIce = value.list("hostIce").mapNotNull { it.objectMap() }, viewerIce = value.list("viewerIce").mapNotNull { it.objectMap() }
    )

    private fun mapLiveComment(value: Map<String, Any?>) = SocialLiveComment(
        id = value.string("id").orEmpty(), streamId = value.string("streamId").orEmpty(), authorId = value.string("authorId").orEmpty(),
        author = mapUser(value.objectValue("author") ?: emptyMap()), authorProfile = value.objectValue("authorProfile")?.let(::mapProfile),
        replyToId = value.string("replyToId"), body = value.string("body").orEmpty(), status = value.string("status") ?: "active", createdAt = value.string("createdAt")
    )

    private fun mapNotification(value: Map<String, Any?>) = SocialNotification(
        id = value.string("id").orEmpty(),
        scope = value.string("scope") ?: "social",
        scopeId = value.string("scopeId"),
        type = value.string("type") ?: "info",
        title = value.string("title").orEmpty(),
        message = value.string("message").orEmpty(),
        status = value.string("status") ?: "unread",
        metadata = value.objectValue("metadata") ?: emptyMap(),
        readAt = value.string("readAt"),
        createdAt = value.string("createdAt")
    )

    private fun mapCopyrightReference(value: Map<String, Any?>): SocialCopyrightReference {
        val owner = mapUser(value.objectValue("owner") ?: emptyMap())
        return SocialCopyrightReference(
            id = value.string("id").orEmpty(), ownerId = value.string("ownerId") ?: owner.id, owner = owner,
            postId = value.string("postId"), post = value.objectValue("post")?.let(::mapPost),
            title = value.string("title") ?: "Protected media", mediaType = value.string("mediaType") ?: "audio",
            durationSeconds = value.number("durationSeconds")?.toInt(), protectionEnabled = value.boolean("protectionEnabled"),
            autoRemoveMatches = value.boolean("autoRemoveMatches"), status = value.string("status") ?: "active",
            useCount = value.number("useCount")?.toInt() ?: 0, claimCount = value.number("claimCount")?.toInt() ?: 0,
            createdAt = value.string("createdAt"), updatedAt = value.string("updatedAt")
        )
    }

    private fun mapCopyrightClaim(value: Map<String, Any?>): SocialCopyrightClaim {
        val infringingUser = mapUser(value.objectValue("infringingUser") ?: emptyMap())
        return SocialCopyrightClaim(
            id = value.string("id").orEmpty(), referenceId = value.string("referenceId").orEmpty(),
            reference = value.objectValue("reference")?.let(::mapCopyrightReference),
            infringingPostId = value.string("infringingPostId").orEmpty(), infringingPost = value.objectValue("infringingPost")?.let(::mapPost),
            infringingUserId = value.string("infringingUserId") ?: infringingUser.id, infringingUser = infringingUser,
            status = value.string("status") ?: "detected", action = value.string("action") ?: "notice",
            removeAfter = value.string("removeAfter"), removedAt = value.string("removedAt"),
            evidence = value.objectValue("evidence") ?: emptyMap(), createdAt = value.string("createdAt"), updatedAt = value.string("updatedAt")
        )
    }

    private fun mapCopyrightStudio(value: Map<String, Any?>) = SocialCopyrightStudio(
        references = value.list("references").mapNotNull { it.objectMap()?.let(::mapCopyrightReference) },
        ownerClaims = value.list("ownerClaims").mapNotNull { it.objectMap()?.let(::mapCopyrightClaim) },
        receivedClaims = value.list("receivedClaims").mapNotNull { it.objectMap()?.let(::mapCopyrightClaim) },
        protectionEnabled = value.boolean("protectionEnabled"), pendingRemovalCount = value.number("pendingRemovalCount")?.toInt() ?: 0
    )

    private fun mapGroup(value: Map<String, Any?>) = SocialGroup(
        id = value.string("id").orEmpty(), ownerId = value.string("ownerId").orEmpty(), owner = mapUser(value.objectValue("owner") ?: emptyMap()),
        name = value.string("name").orEmpty(), description = value.string("description"), coverUrl = absoluteUrl(value.string("coverUrl")),
        privacy = value.string("privacy") ?: "public", memberCount = value.number("memberCount")?.toInt() ?: 0,
        viewerRole = value.string("viewerRole"), viewerJoined = value.boolean("viewerJoined"), createdAt = value.string("createdAt")
    )

    private fun mapGroupMember(value: Map<String, Any?>): SocialGroupMember {
        val user = mapUser(value.objectValue("user") ?: emptyMap())
        return SocialGroupMember(
            id = value.string("id").orEmpty(), groupId = value.string("groupId").orEmpty(), userId = value.string("userId") ?: user.id,
            user = user, profile = value.objectValue("profile")?.let { mapProfile(it, user) }, role = value.string("role") ?: "member",
            status = value.string("status") ?: "active", joinedAt = value.string("joinedAt")
        )
    }

    private fun mapComment(value: Map<String, Any?>): SocialComment {
        val author = mapUser(value.objectValue("author") ?: emptyMap())
        return SocialComment(
            id = value.string("id").orEmpty(), postId = value.string("postId").orEmpty(), authorId = value.string("authorId") ?: author.id,
            author = author, authorProfile = value.objectValue("authorProfile")?.let { mapProfile(it, author) }, replyToId = value.string("replyToId"),
            body = value.string("body").orEmpty(), reactionCount = value.number("reactionCount")?.toInt() ?: 0,
            viewerLiked = value.boolean("viewerLiked"), createdAt = value.string("createdAt")
        )
    }

    private fun upsertStory(updated: SocialStory) {
        val current = _storyTray.value
        val existing = current.firstOrNull { it.authorId == updated.authorId }
        val stories = (listOf(updated) + existing?.stories.orEmpty().filterNot { it.id == updated.id })
            .sortedByDescending { it.createdAt.orEmpty() }
        val group = SocialStoryGroup(
            authorId = updated.authorId,
            author = updated.author,
            authorProfile = updated.authorProfile,
            stories = stories,
            unseenCount = if (updated.authorId == currentUserId()) 0 else stories.count { !it.seen },
            latestAt = stories.maxOfOrNull { it.createdAt.orEmpty() }.takeUnless { it.isNullOrBlank() }
        )
        _storyTray.value = sortStoryGroups(listOf(group) + current.filterNot { it.authorId == updated.authorId })
    }

    private fun mutateStory(id: String, transform: (SocialStory) -> SocialStory) {
        _storyTray.value = _storyTray.value.map { group ->
            if (group.stories.none { it.id == id }) group else {
                val stories = group.stories.map { if (it.id == id) transform(it) else it }
                group.copy(
                    stories = stories,
                    unseenCount = if (group.authorId == currentUserId()) 0 else stories.count { !it.seen }
                )
            }
        }
        _storyMemories.value = _storyMemories.value.map { if (it.id == id) transform(it) else it }
    }

    private fun removeStoryFromTray(id: String) {
        _storyTray.value = _storyTray.value.mapNotNull { group ->
            val stories = group.stories.filterNot { it.id == id }
            if (stories.isEmpty()) null else group.copy(
                stories = stories,
                unseenCount = if (group.authorId == currentUserId()) 0 else stories.count { !it.seen },
                latestAt = stories.maxOfOrNull { it.createdAt.orEmpty() }.takeUnless { it.isNullOrBlank() }
            )
        }
    }

    private fun sortStoryGroups(groups: List<SocialStoryGroup>): List<SocialStoryGroup> {
        val viewerId = currentUserId()
        return groups.sortedWith(
            compareByDescending<SocialStoryGroup> { it.authorId == viewerId }
                .thenByDescending { it.unseenCount > 0 }
                .thenByDescending { it.latestAt.orEmpty() }
        )
    }

    private fun storyInput(draft: SocialStoryDraft): Map<String, Any?> = mapOf(
        "caption" to draft.caption?.trim()?.takeIf { it.isNotBlank() },
        "visibility" to draft.visibility,
        "customAudienceIds" to draft.customAudienceIds.distinct(),
        "allowReplies" to draft.allowReplies,
        "metadata" to draft.metadata,
        "items" to draft.items.sortedBy { it.sortOrder }.mapIndexed { index, item ->
            storyItemInput(mapOf(
                "type" to item.type,
                "media" to item.media,
                "text" to item.text,
                "background" to item.background,
                "filter" to item.filter,
                "transform" to item.transform,
                "overlays" to item.overlays,
                "durationMs" to item.durationMs.coerceIn(1_000, 60_000),
                "altText" to item.altText,
                "aiGenerated" to item.aiGenerated,
                "music" to item.music,
                "sortOrder" to item.sortOrder.coerceAtLeast(0)
            ), index)
        }
    ).filterValues { it != null }

    private fun storyItemInput(raw: Map<String, Any?>, fallbackOrder: Int): Map<String, Any?> = mapOf(
        "type" to (raw["type"]?.toString()?.lowercase()?.takeIf { it.isNotBlank() } ?: "image"),
        "media" to when (val media = raw["media"]) {
            is SocialMedia -> mediaInput(media)
            is Map<*, *> -> media.entries.mapNotNull { (key, value) -> (key as? String)?.let { it to value } }.toMap()
            else -> null
        },
        "text" to raw["text"]?.toString(),
        "background" to raw["background"]?.toString(),
        "filter" to (raw["filter"] as? Map<*, *>)?.entries?.mapNotNull { (key, value) -> (key as? String)?.let { it to value } }?.toMap().orEmpty(),
        "transform" to (raw["transform"] as? Map<*, *>)?.entries?.mapNotNull { (key, value) -> (key as? String)?.let { it to value } }?.toMap().orEmpty(),
        "overlays" to (raw["overlays"] as? List<*>)?.mapNotNull { it as? Map<*, *> }?.map { overlay ->
            overlay.entries.mapNotNull { (key, value) -> (key as? String)?.let { it to value } }.toMap()
        }.orEmpty(),
        "durationMs" to ((raw["durationMs"] as? Number)?.toInt() ?: 5_000).coerceIn(1_000, 60_000),
        "altText" to raw["altText"]?.toString(),
        "aiGenerated" to (raw["aiGenerated"] as? Boolean ?: false),
        "music" to (raw["music"] as? Map<*, *>)?.entries?.mapNotNull { (key, value) -> (key as? String)?.let { it to value } }?.toMap().orEmpty(),
        "sortOrder" to ((raw["sortOrder"] as? Number)?.toInt() ?: fallbackOrder).coerceAtLeast(0)
    ).filterValues { it != null }

    private fun replacePost(updated: SocialPost) {
        _feed.value = if (_feed.value.any { it.id == updated.id }) _feed.value.map { if (it.id == updated.id) updated else it }
        else listOf(updated) + _feed.value
        persistFeed(_feed.value)
    }

    private fun removeStoryInteractionFromCache(interactionId: String) {
        _storyTray.value = _storyTray.value.map { group ->
            group.copy(stories = group.stories.map { story ->
                story.copy(items = story.items.map { item ->
                    val removed = item.viewerInteractions.any { it.id == interactionId }
                    if (!removed) item else item.copy(
                        interactionCount = (item.interactionCount - 1).coerceAtLeast(0),
                        viewerInteractions = item.viewerInteractions.filterNot { it.id == interactionId }
                    )
                })
            })
        }
        _storyMemories.value = _storyMemories.value.map { story ->
            story.copy(items = story.items.map { item ->
                val removed = item.viewerInteractions.any { it.id == interactionId }
                if (!removed) item else item.copy(
                    interactionCount = (item.interactionCount - 1).coerceAtLeast(0),
                    viewerInteractions = item.viewerInteractions.filterNot { it.id == interactionId }
                )
            })
        }
    }

    private fun mediaInput(media: SocialMedia): Map<String, Any?> = mapOf(
        "url" to media.url, "type" to media.type, "hlsUrl" to media.hlsUrl, "thumbnailUrl" to media.thumbnailUrl,
        "mimeType" to media.mimeType, "processingId" to media.processingId, "processingStatus" to media.processingStatus,
        "sharedPostId" to media.sharedPostId, "sharedRootPostId" to media.sharedRootPostId, "sharedAuthorId" to media.sharedAuthorId,
        "sharedAuthor" to media.sharedAuthor, "sharedAvatar" to media.sharedAvatar, "sharedBody" to media.sharedBody,
        "sharedMediaType" to media.sharedMediaType, "sharedViews" to media.sharedViews, "sharedReactions" to media.sharedReactions,
        "sharedComments" to media.sharedComments, "sharedPublishedAt" to media.sharedPublishedAt,
        "title" to media.title, "description" to media.description, "siteName" to media.siteName, "domain" to media.domain,
        "displayUrl" to media.displayUrl, "domainAgeYears" to media.domainAgeYears, "forwarded" to media.forwarded,
        "forwardedFromName" to media.forwardedFromName, "forwardedFromMessageId" to media.forwardedFromMessageId
    ).filterValues { it != null }

    private fun mapReset(value: Map<String, Any?>) = PasswordResetChallenge(
        value.string("challengeId").orEmpty(), value.string("channel") ?: "email", value.string("destination").orEmpty(),
        value.string("expiresAt").orEmpty(), value.string("resendAvailableAt").orEmpty(), value.string("message").orEmpty()
    )

    private companion object {
        const val D = "$"
        val RESTRICTED_STATUSES = setOf("disabled", "banned", "blocked", "suspended")
        const val FEED_TTL = 60_000L
        const val FEED_INITIAL_PAGE_SIZE = 12
        const val FEED_PAGE_SIZE = 12
        const val FEED_DISK_CACHE_LIMIT = 36
        const val CHAT_TTL = 20_000L
        const val USER_FIELDS = "id email name avatar role status socialRestrictionCode socialRestrictionReason socialRestrictedAt socialModerationScore signupSource emailVerifiedAt phone mobileCountryCode primaryRegion country addressLine1 city state postalCode billingName socialLastActiveAt"
        const val PUBLIC_USER_FIELDS = "id name avatar status socialLastActiveAt"
        const val DECORATION_FIELDS = "id slug kind name assetUrl fileName mimeType animated width height priceUsd status sortOrder owned applied ownershipSource"
        const val PROFILE_FIELDS = "id userId username bio about category website location coverUrl verified badgeType badgePlan badgeExpiresAt avatarDecoration { $DECORATION_FIELDS } profileEffect { $DECORATION_FIELDS } privacy preferences followerCount followingCount postCount isFollowing createdAt user { $PUBLIC_USER_FIELDS }"
        const val POST_FIELDS = "id authorId type body media metadata thumbnailUrl hlsUrl processingStatus visibility commentPermission pinned groupId saved status viewCount shareCount saveCount reactionCount commentCount viewerReaction recommended recommendationLabel publishedAt copyrightReference { id ownerId postId title mediaType durationSeconds protectionEnabled autoRemoveMatches status useCount claimCount createdAt updatedAt owner { $PUBLIC_USER_FIELDS } } author { $PUBLIC_USER_FIELDS } authorProfile { id userId username verified badgeType isFollowing avatarDecoration { $DECORATION_FIELDS } } collaborators { id userId username verified badgeType avatarDecoration { $DECORATION_FIELDS } user { $PUBLIC_USER_FIELDS } }"
        const val STORY_PROFILE_FIELDS = "id userId username verified badgeType isFollowing avatarDecoration { $DECORATION_FIELDS }"
        const val STORY_INTERACTION_FIELDS = "id storyId itemId userId kind key value createdAt updatedAt user { $PUBLIC_USER_FIELDS } userProfile { $STORY_PROFILE_FIELDS }"
        const val STORY_ITEM_FIELDS = "id storyId type media text background filter transform overlays durationMs altText aiGenerated music status sortOrder reactionCount viewerReaction interactionCount viewerInteractions { $STORY_INTERACTION_FIELDS } createdAt updatedAt"
        const val STORY_FIELDS = "id authorId visibility customAudienceIds allowReplies status caption metadata viewerCount reactionCount replyCount seen viewerLastItemSortOrder expiresAt archivedAt createdAt updatedAt author { $PUBLIC_USER_FIELDS } authorProfile { $STORY_PROFILE_FIELDS } items { $STORY_ITEM_FIELDS }"
        const val STORY_GROUP_FIELDS = "authorId unseenCount latestAt author { $PUBLIC_USER_FIELDS } authorProfile { $STORY_PROFILE_FIELDS } stories { $STORY_FIELDS }"
        const val STORY_VIEW_FIELDS = "id viewerId lastItemSortOrder viewedAt viewer { $PUBLIC_USER_FIELDS } viewerProfile { $STORY_PROFILE_FIELDS }"
        const val STORY_REPLY_FIELDS = "id storyId itemId senderId body conversationId messageId createdAt sender { $PUBLIC_USER_FIELDS } senderProfile { $STORY_PROFILE_FIELDS }"
        const val STORY_MUSIC_FIELDS = "id title artist artworkUrl streamUrl durationSeconds"
        const val FEED_MODULE_FIELDS = "id kind insertAfter title profiles { $PROFILE_FIELDS } posts { $POST_FIELDS }"
        const val SOCIAL_AD_FIELDS = "id advertiserName advertiserAvatarUrl headline body media ctaType destinationUrl placements status startAt endAt skipAfterSeconds frequencyCap impressionCount clickCount"
        const val COMMENT_FIELDS = "id postId authorId replyToId body status reactionCount viewerLiked createdAt author { $PUBLIC_USER_FIELDS } authorProfile { id userId username verified badgeType avatarDecoration { $DECORATION_FIELDS } }"
        const val MESSAGE_FIELDS = "id conversationId senderId type body media replyToId deliveryStatus sentAt deliveredAt readAt editedAt unsentAt reactions { id userId emoji } sender { $PUBLIC_USER_FIELDS } senderProfile { id userId username avatarDecoration { $DECORATION_FIELDS } }"
        const val CONVERSATION_FIELDS = "id type title avatarUrl requestStatus requestedById unreadCount updatedAt members { id userId role muted archived typingAt lastReadAt blocked user { $PUBLIC_USER_FIELDS } profile { id userId username verified badgeType avatarDecoration { $DECORATION_FIELDS } } } lastMessage { $MESSAGE_FIELDS }"
        const val CALL_FIELDS = "id conversationId callerId calleeId type status offer answer iceCandidates caller { $PUBLIC_USER_FIELDS } callee { $PUBLIC_USER_FIELDS }"
        const val LIVE_STREAM_FIELDS = "id hostId title description status visibility playbackUrl qualities viewerCount commentsEnabled paused lastHeartbeatAt startedAt endedAt host { $PUBLIC_USER_FIELDS } hostProfile { $PROFILE_FIELDS }"
        const val LIVE_PARTICIPANT_FIELDS = "id streamId viewerId status role microphoneEnabled hostOffer viewerAnswer hostIce viewerIce viewer { $PUBLIC_USER_FIELDS } viewerProfile { $PROFILE_FIELDS }"
        const val LIVE_COMMENT_FIELDS = "id streamId authorId replyToId body status createdAt author { $PUBLIC_USER_FIELDS } authorProfile { $PROFILE_FIELDS }"
        const val NOTIFICATION_FIELDS = "id scope scopeId type title message status metadata readAt createdAt"
        const val COPYRIGHT_REFERENCE_FIELDS = "id ownerId postId title mediaType durationSeconds protectionEnabled autoRemoveMatches status useCount claimCount createdAt updatedAt owner { $PUBLIC_USER_FIELDS } post { $POST_FIELDS }"
        const val COPYRIGHT_CLAIM_FIELDS = "id referenceId infringingPostId infringingUserId status action removeAfter removedAt evidence createdAt updatedAt reference { $COPYRIGHT_REFERENCE_FIELDS } infringingPost { $POST_FIELDS } infringingUser { $PUBLIC_USER_FIELDS }"
        const val COPYRIGHT_STUDIO_FIELDS = "references { $COPYRIGHT_REFERENCE_FIELDS } ownerClaims { $COPYRIGHT_CLAIM_FIELDS } receivedClaims { $COPYRIGHT_CLAIM_FIELDS } protectionEnabled pendingRemovalCount"
        const val GROUP_FIELDS = "id ownerId name description coverUrl privacy status memberCount viewerRole viewerJoined createdAt owner { $PUBLIC_USER_FIELDS }"
        const val GROUP_MEMBER_FIELDS = "id groupId userId role status joinedAt user { $PUBLIC_USER_FIELDS } profile { id userId username verified badgeType avatarDecoration { $DECORATION_FIELDS } }"
    }
}
