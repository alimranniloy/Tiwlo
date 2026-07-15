package com.example.social

import android.content.ContentResolver
import android.content.Context
import android.net.Uri
import kotlinx.coroutines.async
import kotlinx.coroutines.supervisorScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class SocialRepository(context: Context) {
    private val appContext = context.applicationContext
    private val session = appContext.getSharedPreferences("tiwi_social_session_v3", Context.MODE_PRIVATE)
    private val cache = SocialCacheStore(appContext)
    @Volatile private var token: String? = session.getString("token", null)
    private val client = GraphQlClient(appContext) { token }
    private val security = TSecurityClient(appContext, client)

    private val _currentUser = MutableStateFlow(cache.user())
    val currentUser: StateFlow<SocialUser?> = _currentUser.asStateFlow()
    private val _profile = MutableStateFlow(cache.profile())
    val profile: StateFlow<SocialProfile?> = _profile.asStateFlow()
    private val _feed = MutableStateFlow(cache.feed())
    val feed: StateFlow<List<SocialPost>> = _feed.asStateFlow()
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

    fun hasSavedSession(): Boolean = !token.isNullOrBlank() && _currentUser.value != null
    fun currentUserId(): String? = _currentUser.value?.id
    fun absoluteUrl(path: String?): String? = client.absoluteUrl(path)

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

    suspend fun signup(name: String, email: String, password: String, username: String): SocialUser {
        val form = mapOf("name" to name.trim(), "email" to email.trim(), "password" to password)
        val secureToken = security.issueAuthToken("signup", form)
        val data = client.execute(
            """mutation TiwiSignup(${D}input: SignupInput!) { signup(input: ${D}input) { ok requiresWhatsAppOtp challengeId message token user { $USER_FIELDS } } }""",
            mapOf("input" to mapOf("tSecurityToken" to secureToken))
        )
        val payload = data.objectValue("signup") ?: throw SocialApiException("Signup response was incomplete")
        if (payload.boolean("requiresWhatsAppOtp")) throw SocialApiException(payload.string("message") ?: "Complete WhatsApp verification at tiwlo.com")
        val user = mapUser(payload.objectValue("user") ?: throw SocialApiException("Account was not returned"))
        saveSession(payload.string("token") ?: throw SocialApiException("Signup token was not returned"), user)
        updateProfile(mapOf("username" to username.trim()))
        refreshAll(force = true)
        return user
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
                val chatJob = async { runCatching { refreshConversations(force) } }
                profileJob.await(); feedJob.await(); chatJob.await()
            }
        } finally { _syncing.value = false }
    }

    suspend fun refreshFeed(force: Boolean = false): List<SocialPost> {
        if (!force && _feed.value.isNotEmpty() && cache.isFresh("feed", FEED_TTL)) return _feed.value
        val data = client.execute("query TiwiFeed { socialFeed(limit: 60) { $POST_FIELDS } }")
        return data.list("socialFeed").mapNotNull { it.objectMap()?.let(::mapPost) }.also {
            _feed.value = it
            cache.saveFeed(it)
        }
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

    suspend fun searchProfiles(query: String = ""): List<SocialProfile> {
        val data = client.execute(
            """query TiwiDiscover(${D}query: String) { socialSearch(query: ${D}query, limit: 50) { $PROFILE_FIELDS } }""",
            mapOf("query" to query.trim())
        )
        return data.list("socialSearch").mapNotNull { it.objectMap()?.let(::mapProfile) }
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
            cache.saveFeed(_feed.value)
        }
    }

    suspend fun createPost(body: String, type: String = "post", media: List<SocialMedia> = emptyList()): SocialPost {
        val mediaInput = media.map { mapOf("url" to it.url, "type" to it.type, "hlsUrl" to it.hlsUrl, "thumbnailUrl" to it.thumbnailUrl, "mimeType" to it.mimeType, "processingId" to it.processingId) }
        val input = mapOf(
            "type" to type, "body" to body.trim(), "visibility" to "public", "media" to mediaInput,
            "hlsUrl" to media.firstOrNull()?.hlsUrl,
            "processingStatus" to "ready"
        )
        val data = client.execute(
            """mutation CreateTiwiPost(${D}input: SocialPostInput!) { createSocialPost(input: ${D}input) { $POST_FIELDS } }""",
            mapOf("input" to input)
        )
        val post = mapPost(data.objectValue("createSocialPost") ?: throw SocialApiException("Post was not created"))
        val next = listOf(post) + _feed.value.filterNot { it.id == post.id }
        _feed.value = next
        cache.saveFeed(next)
        return post
    }

    suspend fun uploadMedia(resolver: ContentResolver, uri: Uri, kind: String): SocialMedia =
        client.uploadMedia(resolver, uri, kind).asSocialMedia()

    suspend fun reactToPost(id: String): SocialPost {
        val before = _feed.value
        _feed.value = before.map { post ->
            if (post.id != id) post else {
                val removing = post.viewerReaction == "like"
                post.copy(viewerReaction = if (removing) null else "like", reactionCount = (post.reactionCount + if (removing) -1 else 1).coerceAtLeast(0))
            }
        }
        cache.saveFeed(_feed.value)
        return try {
            val data = client.execute(
                """mutation LikeTiwiPost(${D}id: ID!) { reactToSocialPost(id: ${D}id, kind: "like") { $POST_FIELDS } }""",
                mapOf("id" to id)
            )
            mapPost(data.objectValue("reactToSocialPost") ?: throw SocialApiException("Reaction failed")).also { updated ->
                _feed.value = _feed.value.map { if (it.id == id) updated else it }
                cache.saveFeed(_feed.value)
            }
        } catch (error: Exception) {
            _feed.value = before
            cache.saveFeed(before)
            throw error
        }
    }

    suspend fun viewPost(id: String): SocialPost {
        val data = client.execute("""mutation ViewTiwiPost(${D}id: ID!) { viewSocialPost(id: ${D}id) { $POST_FIELDS } }""", mapOf("id" to id))
        return mapPost(data.objectValue("viewSocialPost") ?: throw SocialApiException("Post was not found")).also(::replacePost)
    }

    suspend fun repostPost(id: String): SocialPost {
        val data = client.execute("""mutation RepostTiwi(${D}id: ID!) { repostSocialPost(id: ${D}id) { $POST_FIELDS } }""", mapOf("id" to id))
        return mapPost(data.objectValue("repostSocialPost") ?: throw SocialApiException("Repost failed")).also(::replacePost)
    }

    suspend fun updatePost(id: String, body: String): SocialPost {
        val data = client.execute(
            """mutation EditTiwiPost(${D}input: SocialPostUpdateInput!) { updateSocialPost(input: ${D}input) { $POST_FIELDS } }""",
            mapOf("input" to mapOf("id" to id, "body" to body.trim()))
        )
        return mapPost(data.objectValue("updateSocialPost") ?: throw SocialApiException("Post update failed")).also(::replacePost)
    }

    suspend fun deletePost(id: String) {
        client.execute("""mutation DeleteTiwiPost(${D}id: ID!) { deleteSocialPost(id: ${D}id) }""", mapOf("id" to id))
        _feed.value = _feed.value.filterNot { it.id == id }
        cache.saveFeed(_feed.value)
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
            cache.saveFeed(_feed.value)
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
        val data = client.execute("query TiwiChats { socialConversations { $CONVERSATION_FIELDS } }")
        return data.list("socialConversations").mapNotNull { it.objectMap()?.let(::mapConversation) }.also {
            _conversations.value = it
            cache.saveConversations(it)
        }
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

    suspend fun sendMessage(conversationId: String, body: String, media: List<SocialMedia> = emptyList()): SocialMessage {
        val local = SocialMessage(
            id = "local-${System.nanoTime()}", conversationId = conversationId, senderId = currentUserId().orEmpty(),
            sender = _currentUser.value ?: SocialUser(), body = body.trim(), type = media.firstOrNull()?.type ?: "text",
            media = media, deliveryStatus = "sending", sentAt = System.currentTimeMillis().toString()
        )
        val previous = cachedMessages(conversationId)
        _messages.value = _messages.value + (conversationId to (previous + local))
        cache.saveMessages(conversationId, previous + local)
        return try {
            val data = client.execute(
                """mutation SendTiwiMessage(${D}input: SocialMessageInput!) { sendSocialMessage(input: ${D}input) { $MESSAGE_FIELDS } }""",
                mapOf("input" to mapOf(
                    "conversationId" to conversationId, "body" to body.trim(), "type" to (media.firstOrNull()?.type ?: "text"),
                    "media" to media.map { mapOf("url" to it.url, "type" to it.type, "hlsUrl" to it.hlsUrl, "mimeType" to it.mimeType) }
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

    suspend fun markConversationRead(id: String) {
        client.execute("""mutation ReadTiwiChat(${D}id: ID!) { markSocialConversationRead(id: ${D}id) { id unreadCount } }""", mapOf("id" to id))
        _conversations.value = _conversations.value.map { if (it.id == id) it.copy(unreadCount = 0) else it }
        cache.saveConversations(_conversations.value)
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

    suspend fun socialSettings(): Map<String, Any?> {
        val data = client.execute("query TiwiSocialSettings { socialSettings }")
        return data.objectValue("socialSettings") ?: emptyMap()
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
        avatar = absoluteUrl(value.string("avatar")), role = value.string("role") ?: "user", status = value.string("status") ?: "active"
    )

    private fun mapProfile(value: Map<String, Any?>, fallback: SocialUser? = null): SocialProfile {
        val publicUser = value.objectValue("user")?.let(::mapUser) ?: fallback ?: SocialUser(id = value.string("userId").orEmpty(), name = value.string("username").orEmpty())
        val user = if (publicUser.id == currentUserId()) publicUser.copy(email = _currentUser.value?.email.orEmpty(), role = _currentUser.value?.role ?: publicUser.role) else publicUser
        return SocialProfile(
            id = value.string("id").orEmpty(), userId = value.string("userId") ?: user.id, user = user,
            username = value.string("username").orEmpty(), bio = value.string("bio"), about = value.string("about"),
            category = value.string("category"), website = value.string("website"), location = value.string("location"),
            coverUrl = absoluteUrl(value.string("coverUrl")), verified = value.boolean("verified"),
            privacy = value.objectValue("privacy") ?: emptyMap(), preferences = value.objectValue("preferences") ?: emptyMap(),
            followerCount = value.number("followerCount")?.toInt() ?: 0, followingCount = value.number("followingCount")?.toInt() ?: 0,
            postCount = value.number("postCount")?.toInt() ?: 0, isFollowing = value.boolean("isFollowing")
        )
    }

    private fun mapMedia(value: Map<String, Any?>) = SocialMedia(
        url = absoluteUrl(value.string("url")).orEmpty(), type = value.string("type") ?: "image",
        hlsUrl = absoluteUrl(value.string("hlsUrl")), thumbnailUrl = absoluteUrl(value.string("thumbnailUrl")),
        mimeType = value.string("mimeType"), processingId = value.string("processingId")
    )

    private fun mapPost(value: Map<String, Any?>): SocialPost {
        val author = mapUser(value.objectValue("author") ?: emptyMap())
        return SocialPost(
            id = value.string("id").orEmpty(), authorId = value.string("authorId") ?: author.id, author = author,
            authorProfile = value.objectValue("authorProfile")?.let { mapProfile(it, author) }, type = value.string("type") ?: "post",
            body = value.string("body").orEmpty(), media = value.list("media").mapNotNull { it.objectMap()?.let(::mapMedia) },
            thumbnailUrl = absoluteUrl(value.string("thumbnailUrl")), hlsUrl = absoluteUrl(value.string("hlsUrl")),
            processingStatus = value.string("processingStatus") ?: "ready", visibility = value.string("visibility") ?: "public",
            status = value.string("status") ?: "published", viewCount = value.number("viewCount")?.toInt() ?: 0,
            shareCount = value.number("shareCount")?.toInt() ?: 0, reactionCount = value.number("reactionCount")?.toInt() ?: 0,
            commentCount = value.number("commentCount")?.toInt() ?: 0, viewerReaction = value.string("viewerReaction"), publishedAt = value.string("publishedAt")
        )
    }

    private fun mapMessage(value: Map<String, Any?>) = SocialMessage(
        id = value.string("id").orEmpty(), conversationId = value.string("conversationId").orEmpty(), senderId = value.string("senderId").orEmpty(),
        sender = mapUser(value.objectValue("sender") ?: emptyMap()), type = value.string("type") ?: "text", body = value.string("body").orEmpty(),
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
            SocialConversationMember(member.string("id").orEmpty(), member.string("userId") ?: user.id, user, member.objectValue("profile")?.let { mapProfile(it, user) }, member.string("role") ?: "member", member.string("lastReadAt"))
        } },
        lastMessage = value.objectValue("lastMessage")?.let(::mapMessage), unreadCount = value.number("unreadCount")?.toInt() ?: 0, updatedAt = value.string("updatedAt")
    )

    private fun mapCall(value: Map<String, Any?>) = SocialCallSession(
        id = value.string("id").orEmpty(), conversationId = value.string("conversationId"), callerId = value.string("callerId").orEmpty(),
        caller = mapUser(value.objectValue("caller") ?: emptyMap()), calleeId = value.string("calleeId").orEmpty(),
        callee = mapUser(value.objectValue("callee") ?: emptyMap()), type = value.string("type") ?: "audio", status = value.string("status") ?: "ringing",
        offer = value.objectValue("offer"), answer = value.objectValue("answer"), iceCandidates = value.list("iceCandidates").mapNotNull { it.objectMap() }
    )

    private fun mapComment(value: Map<String, Any?>): SocialComment {
        val author = mapUser(value.objectValue("author") ?: emptyMap())
        return SocialComment(
            id = value.string("id").orEmpty(), postId = value.string("postId").orEmpty(), authorId = value.string("authorId") ?: author.id,
            author = author, authorProfile = value.objectValue("authorProfile")?.let { mapProfile(it, author) }, replyToId = value.string("replyToId"),
            body = value.string("body").orEmpty(), reactionCount = value.number("reactionCount")?.toInt() ?: 0,
            viewerLiked = value.boolean("viewerLiked"), createdAt = value.string("createdAt")
        )
    }

    private fun replacePost(updated: SocialPost) {
        _feed.value = _feed.value.map { if (it.id == updated.id) updated else it }
        cache.saveFeed(_feed.value)
    }

    private fun mapReset(value: Map<String, Any?>) = PasswordResetChallenge(
        value.string("challengeId").orEmpty(), value.string("channel") ?: "email", value.string("destination").orEmpty(),
        value.string("expiresAt").orEmpty(), value.string("resendAvailableAt").orEmpty(), value.string("message").orEmpty()
    )

    private companion object {
        const val D = "$"
        const val FEED_TTL = 60_000L
        const val CHAT_TTL = 20_000L
        const val USER_FIELDS = "id email name avatar role status"
        const val PUBLIC_USER_FIELDS = "id name avatar status"
        const val PROFILE_FIELDS = "id userId username bio about category website location coverUrl verified privacy preferences followerCount followingCount postCount isFollowing user { $PUBLIC_USER_FIELDS }"
        const val POST_FIELDS = "id authorId type body media thumbnailUrl hlsUrl processingStatus visibility status viewCount shareCount reactionCount commentCount viewerReaction publishedAt author { $PUBLIC_USER_FIELDS } authorProfile { id userId username verified isFollowing }"
        const val COMMENT_FIELDS = "id postId authorId replyToId body status reactionCount viewerLiked createdAt author { $PUBLIC_USER_FIELDS } authorProfile { id userId username verified }"
        const val MESSAGE_FIELDS = "id conversationId senderId type body media replyToId deliveryStatus sentAt deliveredAt readAt editedAt unsentAt reactions { id userId emoji } sender { $PUBLIC_USER_FIELDS }"
        const val CONVERSATION_FIELDS = "id type title avatarUrl requestStatus requestedById unreadCount updatedAt members { id userId role lastReadAt user { $PUBLIC_USER_FIELDS } profile { id userId username verified } } lastMessage { $MESSAGE_FIELDS }"
        const val CALL_FIELDS = "id conversationId callerId calleeId type status offer answer iceCandidates caller { $PUBLIC_USER_FIELDS } callee { $PUBLIC_USER_FIELDS }"
    }
}
