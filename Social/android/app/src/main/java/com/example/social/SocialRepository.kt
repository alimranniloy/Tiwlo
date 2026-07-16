package com.example.social

import android.content.ContentResolver
import android.content.Context
import android.net.Uri
import kotlinx.coroutines.async
import kotlinx.coroutines.supervisorScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import org.json.JSONObject

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
            cache.saveFeed(_feed.value)
        }
    }

    suspend fun createPost(body: String, type: String = "post", media: List<SocialMedia> = emptyList(), visibility: String = "public", groupId: String? = null): SocialPost {
        val mediaInput = media.map { mapOf("url" to it.url, "type" to it.type, "hlsUrl" to it.hlsUrl, "thumbnailUrl" to it.thumbnailUrl, "mimeType" to it.mimeType, "processingId" to it.processingId, "processingStatus" to it.processingStatus) }
        val input = mapOf(
            "type" to type, "body" to body.trim(), "visibility" to visibility, "media" to mediaInput, "groupId" to groupId,
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
            cache.saveFeed(next)
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
        val repost = mapPost(data.objectValue("repostSocialPost") ?: throw SocialApiException("Repost failed"))
        val updated = _feed.value
            .map { post -> if (post.id == id) post.copy(shareCount = post.shareCount + 1) else post }
            .filterNot { it.id == repost.id }
        _feed.value = listOf(repost) + updated
        cache.saveFeed(_feed.value)
        return repost
    }

    suspend fun updatePost(id: String, body: String): SocialPost {
        return updatePost(id, body, null)
    }

    suspend fun updatePost(id: String, body: String, media: List<SocialMedia>?): SocialPost {
        val input = mutableMapOf<String, Any?>("id" to id, "body" to body.trim())
        media?.let { items -> input["media"] = items.map { mapOf(
            "url" to it.url, "type" to it.type, "hlsUrl" to it.hlsUrl, "thumbnailUrl" to it.thumbnailUrl,
            "mimeType" to it.mimeType, "processingId" to it.processingId, "processingStatus" to it.processingStatus
        ) } }
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
        cache.saveFeed(_feed.value)
    }

    suspend fun blockUser(userId: String, block: Boolean = true, reason: String? = null): Boolean {
        val data = client.execute(
            """mutation BlockTiwiUser(${D}id: ID!, ${D}block: Boolean!, ${D}reason: String) { blockSocialUser(userId: ${D}id, block: ${D}block, reason: ${D}reason) }""",
            mapOf("id" to userId, "block" to block, "reason" to reason)
        )
        if (block) {
            _feed.value = _feed.value.filterNot { it.authorId == userId }
            cache.saveFeed(_feed.value)
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
        avatar = absoluteUrl(value.string("avatar")), role = value.string("role") ?: "user", status = value.string("status") ?: "active",
        socialRestrictionCode = value.string("socialRestrictionCode"), socialRestrictionReason = value.string("socialRestrictionReason"),
        socialRestrictedAt = value.string("socialRestrictedAt"), socialModerationScore = value.number("socialModerationScore")?.toDouble(),
        signupSource = value.string("signupSource") ?: "web", emailVerifiedAt = value.string("emailVerifiedAt"),
        phone = value.string("phone"), mobileCountryCode = value.string("mobileCountryCode"), primaryRegion = value.string("primaryRegion"),
        country = value.string("country"), addressLine1 = value.string("addressLine1"), city = value.string("city"), state = value.string("state"),
        postalCode = value.string("postalCode"), billingName = value.string("billingName")
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
            postCount = value.number("postCount")?.toInt() ?: 0, isFollowing = value.boolean("isFollowing")
        )
    }

    private fun mapMedia(value: Map<String, Any?>) = SocialMedia(
        url = absoluteUrl(value.string("url")).orEmpty(), type = value.string("type") ?: "image",
        hlsUrl = absoluteUrl(value.string("hlsUrl")), thumbnailUrl = absoluteUrl(value.string("thumbnailUrl")),
        mimeType = value.string("mimeType"), processingId = value.string("processingId"),
        processingStatus = value.string("processingStatus") ?: "ready",
        sharedPostId = value.string("sharedPostId"), sharedAuthorId = value.string("sharedAuthorId"),
        sharedAuthor = value.string("sharedAuthor"), sharedAvatar = absoluteUrl(value.string("sharedAvatar")),
        sharedBody = value.string("sharedBody"), sharedMediaType = value.string("sharedMediaType"),
        sharedViews = value.number("sharedViews")?.toInt() ?: 0,
        sharedReactions = value.number("sharedReactions")?.toInt() ?: 0,
        sharedComments = value.number("sharedComments")?.toInt() ?: 0,
        sharedPublishedAt = value.string("sharedPublishedAt")
    )

    private fun mapPost(value: Map<String, Any?>): SocialPost {
        val author = mapUser(value.objectValue("author") ?: emptyMap())
        return SocialPost(
            id = value.string("id").orEmpty(), authorId = value.string("authorId") ?: author.id, author = author,
            authorProfile = value.objectValue("authorProfile")?.let { mapProfile(it, author) }, type = value.string("type") ?: "post",
            body = value.string("body").orEmpty(), media = value.list("media").mapNotNull { it.objectMap()?.let(::mapMedia) },
            thumbnailUrl = absoluteUrl(value.string("thumbnailUrl")), hlsUrl = absoluteUrl(value.string("hlsUrl")),
            processingStatus = value.string("processingStatus") ?: "ready", visibility = value.string("visibility") ?: "public",
            commentPermission = value.string("commentPermission") ?: "everyone", pinned = value.boolean("pinned"),
            groupId = value.string("groupId"), saved = value.boolean("saved"),
            status = value.string("status") ?: "published", viewCount = value.number("viewCount")?.toInt() ?: 0,
            shareCount = value.number("shareCount")?.toInt() ?: 0, reactionCount = value.number("reactionCount")?.toInt() ?: 0,
            commentCount = value.number("commentCount")?.toInt() ?: 0, viewerReaction = value.string("viewerReaction"), publishedAt = value.string("publishedAt")
        )
    }

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

    private fun replacePost(updated: SocialPost) {
        _feed.value = if (_feed.value.any { it.id == updated.id }) _feed.value.map { if (it.id == updated.id) updated else it }
        else listOf(updated) + _feed.value
        cache.saveFeed(_feed.value)
    }

    private fun mapReset(value: Map<String, Any?>) = PasswordResetChallenge(
        value.string("challengeId").orEmpty(), value.string("channel") ?: "email", value.string("destination").orEmpty(),
        value.string("expiresAt").orEmpty(), value.string("resendAvailableAt").orEmpty(), value.string("message").orEmpty()
    )

    private companion object {
        const val D = "$"
        val RESTRICTED_STATUSES = setOf("disabled", "banned", "blocked", "suspended")
        const val FEED_TTL = 60_000L
        const val CHAT_TTL = 20_000L
        const val USER_FIELDS = "id email name avatar role status socialRestrictionCode socialRestrictionReason socialRestrictedAt socialModerationScore signupSource emailVerifiedAt phone mobileCountryCode primaryRegion country addressLine1 city state postalCode billingName"
        const val PUBLIC_USER_FIELDS = "id name avatar status"
        const val DECORATION_FIELDS = "id slug kind name assetUrl fileName mimeType animated width height priceUsd status sortOrder owned applied ownershipSource"
        const val PROFILE_FIELDS = "id userId username bio about category website location coverUrl verified badgeType badgePlan badgeExpiresAt avatarDecoration { $DECORATION_FIELDS } profileEffect { $DECORATION_FIELDS } privacy preferences followerCount followingCount postCount isFollowing user { $PUBLIC_USER_FIELDS }"
        const val POST_FIELDS = "id authorId type body media thumbnailUrl hlsUrl processingStatus visibility commentPermission pinned groupId saved status viewCount shareCount reactionCount commentCount viewerReaction publishedAt author { $PUBLIC_USER_FIELDS } authorProfile { id userId username verified badgeType isFollowing avatarDecoration { $DECORATION_FIELDS } }"
        const val COMMENT_FIELDS = "id postId authorId replyToId body status reactionCount viewerLiked createdAt author { $PUBLIC_USER_FIELDS } authorProfile { id userId username verified badgeType avatarDecoration { $DECORATION_FIELDS } }"
        const val MESSAGE_FIELDS = "id conversationId senderId type body media replyToId deliveryStatus sentAt deliveredAt readAt editedAt unsentAt reactions { id userId emoji } sender { $PUBLIC_USER_FIELDS } senderProfile { id userId username avatarDecoration { $DECORATION_FIELDS } }"
        const val CONVERSATION_FIELDS = "id type title avatarUrl requestStatus requestedById unreadCount updatedAt members { id userId role lastReadAt user { $PUBLIC_USER_FIELDS } profile { id userId username verified badgeType avatarDecoration { $DECORATION_FIELDS } } } lastMessage { $MESSAGE_FIELDS }"
        const val CALL_FIELDS = "id conversationId callerId calleeId type status offer answer iceCandidates caller { $PUBLIC_USER_FIELDS } callee { $PUBLIC_USER_FIELDS }"
        const val GROUP_FIELDS = "id ownerId name description coverUrl privacy status memberCount viewerRole viewerJoined createdAt owner { $PUBLIC_USER_FIELDS }"
        const val GROUP_MEMBER_FIELDS = "id groupId userId role status joinedAt user { $PUBLIC_USER_FIELDS } profile { id userId username verified badgeType avatarDecoration { $DECORATION_FIELDS } }"
    }
}
