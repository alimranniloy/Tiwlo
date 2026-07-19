package com.example.social

import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class SocialUser(
    val id: String = "",
    val email: String = "",
    val name: String = "",
    val avatar: String? = null,
    val role: String = "user",
    val status: String = "active",
    val socialRestrictionCode: String? = null,
    val socialRestrictionReason: String? = null,
    val socialRestrictedAt: String? = null,
    val socialModerationScore: Double? = null,
    val signupSource: String = "web",
    val emailVerifiedAt: String? = null,
    val phone: String? = null,
    val mobileCountryCode: String? = null,
    val primaryRegion: String? = null,
    val country: String? = null,
    val addressLine1: String? = null,
    val city: String? = null,
    val state: String? = null,
    val postalCode: String? = null,
    val billingName: String? = null,
    val socialLastActiveAt: String? = null
)

@JsonClass(generateAdapter = true)
data class SocialSignupResult(
    val user: SocialUser,
    val requiresEmailVerification: Boolean = false,
    val message: String = ""
)

@JsonClass(generateAdapter = true)
data class SocialProfileDecoration(
    val id: String = "",
    val slug: String = "",
    val kind: String = "avatar-decoration",
    val name: String = "",
    val assetUrl: String = "",
    val fileName: String = "",
    val mimeType: String = "image/png",
    val animated: Boolean = false,
    val width: Int = 288,
    val height: Int = 288,
    val priceUsd: Double = 0.0,
    val status: String = "active",
    val sortOrder: Int = 0,
    val owned: Boolean = false,
    val applied: Boolean = false,
    val ownershipSource: String? = null
)

@JsonClass(generateAdapter = true)
data class SocialProfileEffectPlayback(
    val replayIntervalSeconds: Int = 0,
    val loopCount: Int = 2
)

@JsonClass(generateAdapter = true)
data class SocialProfile(
    val id: String = "",
    val userId: String = "",
    val user: SocialUser = SocialUser(),
    val username: String = "",
    val bio: String? = null,
    val about: String? = null,
    val category: String? = null,
    val website: String? = null,
    val location: String? = null,
    val coverUrl: String? = null,
    val verified: Boolean = false,
    val badgeType: String = "none",
    val badgePlan: String? = null,
    val badgeExpiresAt: String? = null,
    val avatarDecoration: SocialProfileDecoration? = null,
    val profileEffect: SocialProfileDecoration? = null,
    val privacy: Map<String, Any?> = emptyMap(),
    val preferences: Map<String, Any?> = emptyMap(),
    val followerCount: Int = 0,
    val followingCount: Int = 0,
    val postCount: Int = 0,
    val isFollowing: Boolean = false,
    val createdAt: String? = null
)

@JsonClass(generateAdapter = true)
data class SocialMedia(
    val url: String = "",
    val type: String = "image",
    val hlsUrl: String? = null,
    val thumbnailUrl: String? = null,
    val mimeType: String? = null,
    val processingId: String? = null,
    val processingStatus: String = "ready",
    val sharedPostId: String? = null,
    val sharedRootPostId: String? = null,
    val sharedAuthorId: String? = null,
    val sharedAuthor: String? = null,
    val sharedAvatar: String? = null,
    val sharedBody: String? = null,
    val sharedMediaType: String? = null,
    val sharedViews: Int = 0,
    val sharedReactions: Int = 0,
    val sharedComments: Int = 0,
    val sharedPublishedAt: String? = null,
    val storyId: String? = null,
    val storyItemId: String? = null,
    val storyAuthorId: String? = null,
    val title: String? = null,
    val description: String? = null,
    val siteName: String? = null,
    val domain: String? = null,
    val displayUrl: String? = null,
    val domainAgeYears: Int? = null,
    val forwarded: Boolean = false,
    val forwardedFromName: String? = null,
    val forwardedFromMessageId: String? = null
)

@JsonClass(generateAdapter = true)
data class SocialAd(
    val id: String = "",
    val advertiserName: String = "",
    val advertiserAvatarUrl: String? = null,
    val headline: String? = null,
    val body: String? = null,
    val media: List<SocialMedia> = emptyList(),
    val ctaType: String = "website",
    val destinationUrl: String? = null,
    val placements: List<String> = emptyList(),
    val status: String = "active",
    val startAt: String? = null,
    val endAt: String? = null,
    val skipAfterSeconds: Int = 5,
    val frequencyCap: Int = 2,
    val impressionCount: Int = 0,
    val clickCount: Int = 0
)

@JsonClass(generateAdapter = true)
data class SocialLinkPreview(
    val url: String = "",
    val canonicalUrl: String = "",
    val domain: String = "",
    val title: String = "",
    val description: String? = null,
    val imageUrl: String? = null,
    val siteName: String? = null,
    val faviconUrl: String? = null,
    val registeredAt: String? = null,
    val domainAgeYears: Int? = null
)

@JsonClass(generateAdapter = true)
data class SocialPost(
    val id: String = "",
    val authorId: String = "",
    val author: SocialUser = SocialUser(),
    val authorProfile: SocialProfile? = null,
    val collaborators: List<SocialProfile> = emptyList(),
    val type: String = "post",
    val body: String = "",
    val media: List<SocialMedia> = emptyList(),
    val metadata: Map<String, Any?> = emptyMap(),
    val thumbnailUrl: String? = null,
    val hlsUrl: String? = null,
    val processingStatus: String = "ready",
    val visibility: String = "public",
    val commentPermission: String = "everyone",
    val pinned: Boolean = false,
    val groupId: String? = null,
    val saved: Boolean = false,
    val status: String = "published",
    val viewCount: Int = 0,
    val shareCount: Int = 0,
    val saveCount: Int = 0,
    val reactionCount: Int = 0,
    val commentCount: Int = 0,
    val viewerReaction: String? = null,
    val recommended: Boolean = false,
    val recommendationLabel: String? = null,
    val copyrightReference: SocialCopyrightReference? = null,
    val publishedAt: String? = null
)

@JsonClass(generateAdapter = true)
data class SocialStoryInteraction(
    val id: String = "",
    val storyId: String = "",
    val itemId: String = "",
    val userId: String = "",
    val user: SocialUser = SocialUser(),
    val userProfile: SocialProfile? = null,
    val kind: String = "",
    val key: String = "",
    val value: Map<String, Any?> = emptyMap(),
    val createdAt: String? = null,
    val updatedAt: String? = null
)

@JsonClass(generateAdapter = true)
data class SocialStoryItem(
    val id: String = "",
    val storyId: String = "",
    val type: String = "image",
    val media: Map<String, Any?> = emptyMap(),
    val text: String? = null,
    val background: String? = null,
    val filter: Map<String, Any?> = emptyMap(),
    val transform: Map<String, Any?> = emptyMap(),
    val overlays: List<Map<String, Any?>> = emptyList(),
    val durationMs: Int = 5_000,
    val altText: String? = null,
    val aiGenerated: Boolean = false,
    val music: Map<String, Any?> = emptyMap(),
    val status: String = "active",
    val sortOrder: Int = 0,
    val reactionCount: Int = 0,
    val viewerReaction: String? = null,
    val interactionCount: Int = 0,
    val viewerInteractions: List<SocialStoryInteraction> = emptyList(),
    val createdAt: String? = null,
    val updatedAt: String? = null
)

@JsonClass(generateAdapter = true)
data class SocialStory(
    val id: String = "",
    val authorId: String = "",
    val author: SocialUser = SocialUser(),
    val authorProfile: SocialProfile? = null,
    val visibility: String = "public",
    val customAudienceIds: List<String> = emptyList(),
    val allowReplies: Boolean = true,
    val status: String = "active",
    val caption: String? = null,
    val metadata: Map<String, Any?> = emptyMap(),
    val items: List<SocialStoryItem> = emptyList(),
    val viewerCount: Int = 0,
    val reactionCount: Int = 0,
    val replyCount: Int = 0,
    val seen: Boolean = false,
    val viewerLastItemSortOrder: Int = 0,
    val expiresAt: String? = null,
    val archivedAt: String? = null,
    val createdAt: String? = null,
    val updatedAt: String? = null
)

@JsonClass(generateAdapter = true)
data class SocialStoryGroup(
    val authorId: String = "",
    val author: SocialUser = SocialUser(),
    val authorProfile: SocialProfile? = null,
    val stories: List<SocialStory> = emptyList(),
    val unseenCount: Int = 0,
    val latestAt: String? = null
)

@JsonClass(generateAdapter = true)
data class SocialStoryView(
    val id: String = "",
    val viewerId: String = "",
    val viewer: SocialUser = SocialUser(),
    val viewerProfile: SocialProfile? = null,
    val lastItemSortOrder: Int = 0,
    val viewedAt: String? = null
)

@JsonClass(generateAdapter = true)
data class SocialStoryReply(
    val id: String = "",
    val storyId: String = "",
    val itemId: String = "",
    val senderId: String = "",
    val sender: SocialUser = SocialUser(),
    val senderProfile: SocialProfile? = null,
    val body: String = "",
    val conversationId: String? = null,
    val messageId: String? = null,
    val createdAt: String? = null
)

@JsonClass(generateAdapter = true)
data class SocialStoryMusicTrack(
    val id: String = "",
    val title: String = "",
    val artist: String = "",
    val artworkUrl: String? = null,
    val streamUrl: String = "",
    val durationSeconds: Int = 0
)

data class SocialStoryItemDraft(
    val type: String,
    val media: SocialMedia? = null,
    val text: String? = null,
    val background: String? = null,
    val filter: Map<String, Any?> = emptyMap(),
    val transform: Map<String, Any?> = emptyMap(),
    val overlays: List<Map<String, Any?>> = emptyList(),
    val durationMs: Int = 5_000,
    val altText: String? = null,
    val aiGenerated: Boolean = false,
    val music: Map<String, Any?> = emptyMap(),
    val sortOrder: Int = 0
)

data class SocialStoryDraft(
    val caption: String? = null,
    val visibility: String = "public",
    val customAudienceIds: List<String> = emptyList(),
    val allowReplies: Boolean = true,
    val metadata: Map<String, Any?> = emptyMap(),
    val items: List<SocialStoryItemDraft>
)

@JsonClass(generateAdapter = true)
data class SocialFeedModule(
    val id: String = "",
    val kind: String = "people",
    val insertAfter: Int = 2,
    val title: String = "Suggested for you",
    val profiles: List<SocialProfile> = emptyList(),
    val posts: List<SocialPost> = emptyList()
)

@JsonClass(generateAdapter = true)
data class SocialComment(
    val id: String = "",
    val postId: String = "",
    val authorId: String = "",
    val author: SocialUser = SocialUser(),
    val authorProfile: SocialProfile? = null,
    val replyToId: String? = null,
    val body: String = "",
    val reactionCount: Int = 0,
    val viewerLiked: Boolean = false,
    val createdAt: String? = null
)

@JsonClass(generateAdapter = true)
data class SocialMessageReaction(val id: String = "", val userId: String = "", val emoji: String = "")

@JsonClass(generateAdapter = true)
data class SocialMessage(
    val id: String = "",
    val conversationId: String = "",
    val senderId: String = "",
    val sender: SocialUser = SocialUser(),
    val senderProfile: SocialProfile? = null,
    val type: String = "text",
    val body: String = "",
    val media: List<SocialMedia> = emptyList(),
    val replyToId: String? = null,
    val deliveryStatus: String = "sent",
    val sentAt: String? = null,
    val deliveredAt: String? = null,
    val readAt: String? = null,
    val editedAt: String? = null,
    val unsentAt: String? = null,
    val reactions: List<SocialMessageReaction> = emptyList()
)

@JsonClass(generateAdapter = true)
data class SocialConversationMember(
    val id: String = "",
    val userId: String = "",
    val user: SocialUser = SocialUser(),
    val profile: SocialProfile? = null,
    val role: String = "member",
    val muted: Boolean = false,
    val archived: Boolean = false,
    val typingAt: String? = null,
    val lastReadAt: String? = null,
    val blocked: Boolean = false
)

@JsonClass(generateAdapter = true)
data class SocialConversation(
    val id: String = "",
    val type: String = "direct",
    val title: String? = null,
    val avatarUrl: String? = null,
    val requestStatus: String = "accepted",
    val requestedById: String? = null,
    val members: List<SocialConversationMember> = emptyList(),
    val lastMessage: SocialMessage? = null,
    val unreadCount: Int = 0,
    val updatedAt: String? = null
)

@JsonClass(generateAdapter = true)
data class SocialCallSession(
    val id: String = "",
    val conversationId: String? = null,
    val callerId: String = "",
    val caller: SocialUser = SocialUser(),
    val calleeId: String = "",
    val callee: SocialUser = SocialUser(),
    val type: String = "audio",
    val status: String = "ringing",
    val offer: Map<String, Any?>? = null,
    val answer: Map<String, Any?>? = null,
    val iceCandidates: List<Map<String, Any?>> = emptyList()
)

@JsonClass(generateAdapter = true)
data class SocialLiveStream(
    val id: String = "",
    val hostId: String = "",
    val host: SocialUser = SocialUser(),
    val hostProfile: SocialProfile? = null,
    val title: String = "",
    val description: String? = null,
    val status: String = "live",
    val visibility: String = "public",
    val playbackUrl: String? = null,
    val qualities: List<String> = emptyList(),
    val viewerCount: Int = 0,
    val commentsEnabled: Boolean = true,
    val paused: Boolean = false,
    val lastHeartbeatAt: String? = null,
    val startedAt: String? = null,
    val endedAt: String? = null
)

@JsonClass(generateAdapter = true)
data class SocialLiveParticipant(
    val id: String = "",
    val streamId: String = "",
    val viewerId: String = "",
    val viewer: SocialUser = SocialUser(),
    val viewerProfile: SocialProfile? = null,
    val status: String = "joining",
    val role: String = "viewer",
    val microphoneEnabled: Boolean = true,
    val hostOffer: Map<String, Any?>? = null,
    val viewerAnswer: Map<String, Any?>? = null,
    val hostIce: List<Map<String, Any?>> = emptyList(),
    val viewerIce: List<Map<String, Any?>> = emptyList()
)

@JsonClass(generateAdapter = true)
data class SocialLiveComment(
    val id: String = "",
    val streamId: String = "",
    val authorId: String = "",
    val author: SocialUser = SocialUser(),
    val authorProfile: SocialProfile? = null,
    val replyToId: String? = null,
    val body: String = "",
    val status: String = "active",
    val createdAt: String? = null
)

@JsonClass(generateAdapter = true)
data class SocialNotification(
    val id: String = "",
    val scope: String = "social",
    val scopeId: String? = null,
    val type: String = "info",
    val title: String = "",
    val message: String = "",
    val status: String = "unread",
    val metadata: Map<String, Any?> = emptyMap(),
    val readAt: String? = null,
    val createdAt: String? = null
)

@JsonClass(generateAdapter = true)
data class SocialCopyrightReference(
    val id: String = "",
    val ownerId: String = "",
    val owner: SocialUser = SocialUser(),
    val postId: String? = null,
    val post: SocialPost? = null,
    val title: String = "Protected media",
    val mediaType: String = "audio",
    val durationSeconds: Int? = null,
    val protectionEnabled: Boolean = true,
    val autoRemoveMatches: Boolean = false,
    val status: String = "active",
    val useCount: Int = 0,
    val claimCount: Int = 0,
    val createdAt: String? = null,
    val updatedAt: String? = null
)

@JsonClass(generateAdapter = true)
data class SocialCopyrightClaim(
    val id: String = "",
    val referenceId: String = "",
    val reference: SocialCopyrightReference? = null,
    val infringingPostId: String = "",
    val infringingPost: SocialPost? = null,
    val infringingUserId: String = "",
    val infringingUser: SocialUser = SocialUser(),
    val status: String = "detected",
    val action: String = "notice",
    val removeAfter: String? = null,
    val removedAt: String? = null,
    val evidence: Map<String, Any?> = emptyMap(),
    val createdAt: String? = null,
    val updatedAt: String? = null
)

@JsonClass(generateAdapter = true)
data class SocialCopyrightStudio(
    val references: List<SocialCopyrightReference> = emptyList(),
    val ownerClaims: List<SocialCopyrightClaim> = emptyList(),
    val receivedClaims: List<SocialCopyrightClaim> = emptyList(),
    val protectionEnabled: Boolean = false,
    val pendingRemovalCount: Int = 0
)

@JsonClass(generateAdapter = true)
data class PasswordResetChallenge(
    val challengeId: String = "",
    val channel: String = "email",
    val destination: String = "",
    val expiresAt: String = "",
    val resendAvailableAt: String = "",
    val message: String = ""
)

@JsonClass(generateAdapter = true)
data class MediaUploadResult(
    val processingId: String = "",
    val kind: String = "post",
    val mimeType: String = "application/octet-stream",
    val sourceUrl: String = "",
    val hlsUrl: String? = null,
    val thumbnailUrl: String? = null,
    val processingStatus: String = "ready"
) {
    fun asSocialMedia() = SocialMedia(
        url = sourceUrl,
        type = when {
            mimeType.startsWith("video/") -> "video"
            mimeType.startsWith("audio/") -> "audio"
            else -> "image"
        },
        hlsUrl = hlsUrl,
        thumbnailUrl = thumbnailUrl,
        mimeType = mimeType,
        processingId = processingId,
        processingStatus = processingStatus
    )
}

class SocialApiException(message: String, val code: String? = null) : Exception(message)

data class SocialVerificationPackage(
    val id: String,
    val name: String,
    val badgeType: String,
    val priceUsd: Double,
    val periodMonths: Int,
    val enabled: Boolean,
    val notableOnly: Boolean,
    val features: List<String>
)

data class SocialPaymentGateway(val key: String, val name: String, val provider: String)

data class SocialVerificationOptions(
    val packages: List<SocialVerificationPackage>,
    val gateways: List<SocialPaymentGateway>,
    val currency: String,
    val usdRate: Double
)

data class SocialCheckout(val status: String, val provider: String, val paymentUrl: String?, val message: String?)

data class SocialGroup(
    val id: String = "",
    val ownerId: String = "",
    val owner: SocialUser = SocialUser(),
    val name: String = "",
    val description: String? = null,
    val coverUrl: String? = null,
    val privacy: String = "public",
    val memberCount: Int = 0,
    val viewerRole: String? = null,
    val viewerJoined: Boolean = false,
    val createdAt: String? = null
)

data class SocialGroupMember(
    val id: String = "",
    val groupId: String = "",
    val userId: String = "",
    val user: SocialUser = SocialUser(),
    val profile: SocialProfile? = null,
    val role: String = "member",
    val status: String = "active",
    val joinedAt: String? = null
)
