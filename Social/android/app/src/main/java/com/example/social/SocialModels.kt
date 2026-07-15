package com.example.social

import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class SocialUser(
    val id: String = "",
    val email: String = "",
    val name: String = "",
    val avatar: String? = null,
    val role: String = "user",
    val status: String = "active"
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
    val privacy: Map<String, Any?> = emptyMap(),
    val preferences: Map<String, Any?> = emptyMap(),
    val followerCount: Int = 0,
    val followingCount: Int = 0,
    val postCount: Int = 0,
    val isFollowing: Boolean = false
)

@JsonClass(generateAdapter = true)
data class SocialMedia(
    val url: String = "",
    val type: String = "image",
    val hlsUrl: String? = null,
    val thumbnailUrl: String? = null,
    val mimeType: String? = null,
    val processingId: String? = null
)

@JsonClass(generateAdapter = true)
data class SocialPost(
    val id: String = "",
    val authorId: String = "",
    val author: SocialUser = SocialUser(),
    val authorProfile: SocialProfile? = null,
    val type: String = "post",
    val body: String = "",
    val media: List<SocialMedia> = emptyList(),
    val thumbnailUrl: String? = null,
    val hlsUrl: String? = null,
    val processingStatus: String = "ready",
    val visibility: String = "public",
    val status: String = "published",
    val viewCount: Int = 0,
    val shareCount: Int = 0,
    val reactionCount: Int = 0,
    val commentCount: Int = 0,
    val viewerReaction: String? = null,
    val publishedAt: String? = null
)

@JsonClass(generateAdapter = true)
data class SocialMessageReaction(val id: String = "", val userId: String = "", val emoji: String = "")

@JsonClass(generateAdapter = true)
data class SocialMessage(
    val id: String = "",
    val conversationId: String = "",
    val senderId: String = "",
    val sender: SocialUser = SocialUser(),
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
    val lastReadAt: String? = null
)

@JsonClass(generateAdapter = true)
data class SocialConversation(
    val id: String = "",
    val type: String = "direct",
    val title: String? = null,
    val avatarUrl: String? = null,
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
        mimeType = mimeType,
        processingId = processingId
    )
}

class SocialApiException(message: String, val code: String? = null) : Exception(message)
