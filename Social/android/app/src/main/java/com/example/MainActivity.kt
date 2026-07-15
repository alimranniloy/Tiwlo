package com.example

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.widget.Toast
import androidx.activity.compose.BackHandler
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.Image
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.blur
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.foundation.Canvas
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.animation.core.*
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import androidx.compose.foundation.border
import androidx.compose.foundation.BorderStroke
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.core.content.ContextCompat
import com.example.ui.theme.TiwiTheme
import com.example.ui.theme.TiwiBlue
import com.example.ui.theme.TiwiPurple
import com.example.ui.theme.TiwiPink
import androidx.media3.common.MediaItem
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import com.example.social.SocialConversation
import com.example.social.SocialCallSession
import com.example.social.SocialMedia
import com.example.social.SocialMessage
import com.example.social.SocialPost
import com.example.social.SocialProfile
import com.example.social.SocialRepository
import com.example.social.PasswordResetChallenge
import com.example.social.WebRtcCallManager
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import org.webrtc.EglBase
import org.webrtc.SurfaceViewRenderer
import org.webrtc.VideoTrack

val InstaBlue = Color(0xFF0095F6)
val FriendOrange = Color(0xFFFF4C29)
val FriendPurple = Color(0xFFB226DD)
val FriendBlue = Color(0xFF1186FF)
val TiwiBlack = Color(0xFF000000)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            TiwiTheme {
                val repository = remember { SocialRepository(applicationContext) }
                MainNavigation(repository)
            }
        }
    }
}

@Composable
fun MainNavigation(repository: SocialRepository) {
    var currentScreen by remember { mutableStateOf("splash") }
    
    when (currentScreen) {
        "splash" -> SplashScreen(onFinished = { currentScreen = if (repository.hasSavedSession()) "main" else "auth" })
        "auth" -> AuthScreen(repository, onLoginSuccess = { currentScreen = "main" })
        "main" -> TiwiApp(repository, onLogout = { currentScreen = "auth" })
    }
}

@Composable
fun SplashScreen(onFinished: () -> Unit) {
    LaunchedEffect(Unit) {
        kotlinx.coroutines.delay(2000)
        onFinished()
    }
    
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(TiwiBlack),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Image(
                painter = painterResource(R.drawable.img_tiwi_logo),
                contentDescription = "Logo",
                modifier = Modifier
                    .size(120.dp)
                    .clip(CircleShape)
            )
            Spacer(modifier = Modifier.height(24.dp))
            Text(
                text = "Tiwi",
                style = MaterialTheme.typography.displayMedium.copy(
                    fontWeight = FontWeight.ExtraBold,
                    brush = Brush.linearGradient(listOf(TiwiBlue, TiwiPurple))
                )
            )
        }
    }
}

@Composable
fun AuthScreen(repository: SocialRepository, onLoginSuccess: () -> Unit) {
    var isLogin by remember { mutableStateOf(true) }
    var isForgotPassword by remember { mutableStateOf(false) }
    var forgotStep by remember { mutableIntStateOf(0) }
    var signupStep by remember { mutableIntStateOf(0) }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    
    // Onboarding data
    var fullName by remember { mutableStateOf("") }
    var username by remember { mutableStateOf("") }
    var bio by remember { mutableStateOf("") }
    var category by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current

    if (isForgotPassword) {
        ForgotPasswordFlow(
            repository = repository,
            onBack = { isForgotPassword = false; forgotStep = 0 },
            onComplete = { isForgotPassword = false; forgotStep = 0; onLoginSuccess() }
        )
        return
    }

    if (!isLogin && signupStep > 0) {
        when (signupStep) {
            1 -> OnboardingProfilePic(onNext = { signupStep = 2 })
            2 -> OnboardingBio(onNext = { name, b -> fullName = name; bio = b; signupStep = 3 })
            3 -> OnboardingCategory(onNext = { cat -> category = cat; signupStep = 4 })
            4 -> OnboardingFollow(repository, onFinished = onLoginSuccess)
        }
        return
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White)
            .statusBarsPadding(),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Box(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
            if (!isLogin && signupStep == 0) {
                IconButton(onClick = { isLogin = true }, modifier = Modifier.align(Alignment.CenterStart)) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", modifier = Modifier.size(24.dp))
                }
            }
        }

        Spacer(modifier = Modifier.height(40.dp))
        
        Text(
            text = "Tiwi",
            style = MaterialTheme.typography.displayMedium.copy(
                fontWeight = FontWeight.Normal,
                fontFamily = FontFamily.Cursive
            ),
            modifier = Modifier.padding(bottom = 40.dp)
        )
        
        Column(modifier = Modifier.padding(horizontal = 24.dp)) {
            if (!isLogin) {
                AuthTextField(value = email, onValueChange = { email = it }, placeholder = "Email")
                Spacer(modifier = Modifier.height(12.dp))
                AuthTextField(value = fullName, onValueChange = { fullName = it }, placeholder = "Full Name")
                Spacer(modifier = Modifier.height(12.dp))
                AuthTextField(value = username, onValueChange = { username = it }, placeholder = "Username")
                Spacer(modifier = Modifier.height(12.dp))
            } else {
                AuthTextField(
                    value = email, 
                    onValueChange = { email = it }, 
                    placeholder = "Phone number, username or email"
                )
                Spacer(modifier = Modifier.height(12.dp))
            }
            
            AuthTextField(
                value = password, 
                onValueChange = { password = it }, 
                placeholder = "Password", 
                isPassword = true
            )
            
            if (isLogin) {
                Box(modifier = Modifier.fillMaxWidth().padding(top = 16.dp), contentAlignment = Alignment.CenterEnd) {
                    Text(
                        text = "Forgotten password?",
                        style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.SemiBold),
                        color = InstaBlue,
                        modifier = Modifier.clickable { isForgotPassword = true }
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(32.dp))

            Button(
                onClick = {
                    if (busy) return@Button
                    scope.launch {
                        busy = true
                        try {
                            if (isLogin) repository.login(email, password)
                            else repository.signup(fullName, email, password, username)
                            if (isLogin) onLoginSuccess() else signupStep = 1
                        } catch (error: Exception) {
                            Toast.makeText(context, error.message ?: "Unable to continue", Toast.LENGTH_LONG).show()
                        } finally { busy = false }
                    }
                },
                modifier = Modifier.fillMaxWidth().height(44.dp),
                colors = ButtonDefaults.buttonColors(containerColor = InstaBlue),
                shape = RoundedCornerShape(8.dp),
                elevation = ButtonDefaults.buttonElevation(0.dp)
            ) {
                Text(if (isLogin) "Log In" else "Next", fontWeight = FontWeight.Bold, color = Color.White)
            }

            Spacer(modifier = Modifier.height(24.dp))
        }

        Spacer(modifier = Modifier.height(32.dp))
        
        HorizontalDivider(color = Color.LightGray.copy(alpha = 0.3f), modifier = Modifier.padding(horizontal = 24.dp))
        
        Row(
            modifier = Modifier
                .padding(vertical = 16.dp)
                .clickable { isLogin = !isLogin; signupStep = 0 },
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = if (isLogin) "Don't have an account? " else "Already have an account? ",
                style = MaterialTheme.typography.bodySmall,
                color = Color.Gray
            )
            Text(
                text = if (isLogin) "Sign Up." else "Log In.",
                style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.Bold),
                color = InstaBlue
            )
        }
    }
}

@Composable
fun AuthTextField(value: String, onValueChange: (String) -> Unit, placeholder: String, isPassword: Boolean = false) {
    TextField(
        value = value,
        onValueChange = onValueChange,
        placeholder = { Text(placeholder, style = MaterialTheme.typography.bodyMedium, color = Color.Gray) },
        modifier = Modifier
            .fillMaxWidth()
            .height(52.dp)
            .border(1.dp, Color.LightGray.copy(alpha = 0.6f), RoundedCornerShape(4.dp)),
        shape = RoundedCornerShape(4.dp),
        colors = TextFieldDefaults.colors(
            focusedTextColor = Color.Black,
            unfocusedTextColor = Color.Black,
            focusedContainerColor = Color(0xFFF5F5F5),
            unfocusedContainerColor = Color(0xFFF5F5F5),
            disabledContainerColor = Color(0xFFF5F5F5),
            focusedIndicatorColor = Color.Transparent,
            unfocusedIndicatorColor = Color.Transparent
        ),
        trailingIcon = if (isPassword) {
            { Icon(Icons.Outlined.VisibilityOff, null, tint = Color.Gray, modifier = Modifier.size(20.dp)) }
        } else null,
        singleLine = true,
        visualTransformation = if (isPassword) PasswordVisualTransformation() else VisualTransformation.None
    )
}

data class Post(
    val id: String,
    val authorId: String,
    val author: String,
    val authorAvatar: Int,
    val authorAvatarUrl: String? = null,
    val content: String,
    val image: Int? = null,
    val imageUrl: String? = null,
    val videoUrl: String? = null,
    val time: String,
    val likes: Int,
    val comments: Int,
    val shares: Int,
    val views: Int = 0,
    val liked: Boolean = false,
    val verified: Boolean = false
)

data class Reel(
    val id: String,
    val authorId: String,
    val author: String,
    val authorAvatarUrl: String? = null,
    val thumbnail: Int,
    val thumbnailUrl: String? = null,
    val videoUrl: String? = null,
    val content: String = "",
    val likes: Int = 0,
    val comments: Int = 0
)

private data class TiwiCallRequest(
    val conversationId: String?,
    val peerId: String,
    val peerName: String,
    val peerAvatar: String?,
    val video: Boolean,
    val incoming: SocialCallSession? = null
)

private fun toUiPost(value: SocialPost): Post {
    val media = value.media.firstOrNull()
    return Post(
        id = value.id,
        authorId = value.authorId,
        author = value.author.name.ifBlank { value.authorProfile?.username ?: "Tiwi User" },
        authorAvatar = R.drawable.img_tiwi_logo,
        authorAvatarUrl = value.author.avatar,
        content = value.body,
        imageUrl = media?.takeUnless { it.type == "video" }?.url,
        videoUrl = if (media?.type == "video") media.hlsUrl ?: media.url else null,
        time = value.publishedAt?.replace('T', ' ')?.take(16) ?: "Now",
        likes = value.reactionCount,
        comments = value.commentCount,
        shares = value.shareCount,
        views = value.viewCount,
        liked = value.viewerReaction == "like",
        verified = value.authorProfile?.verified == true
    )
}

private fun toUiReel(value: SocialPost): Reel {
    val media = value.media.firstOrNull()
    return Reel(
        id = value.id,
        authorId = value.authorId,
        author = value.author.name.ifBlank { value.authorProfile?.username ?: "Tiwi User" },
        authorAvatarUrl = value.author.avatar,
        thumbnail = R.drawable.img_tiwi_logo,
        thumbnailUrl = value.thumbnailUrl ?: media?.thumbnailUrl ?: media?.url,
        videoUrl = media?.hlsUrl ?: media?.url ?: value.hlsUrl,
        content = value.body,
        likes = value.reactionCount,
        comments = value.commentCount
    )
}

@Composable
private fun TiwiAvatar(url: String?, fallback: Int, modifier: Modifier, contentScale: ContentScale = ContentScale.Crop) {
    if (!url.isNullOrBlank()) AsyncImage(model = url, contentDescription = null, modifier = modifier, contentScale = contentScale)
    else Image(painter = painterResource(fallback), contentDescription = null, modifier = modifier, contentScale = contentScale)
}

@Composable
private fun ExploreImage(url: String?, modifier: Modifier) {
    if (!url.isNullOrBlank()) AsyncImage(model = url, contentDescription = null, modifier = modifier, contentScale = ContentScale.Crop)
    else Box(modifier.background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.35f)))
}

@Composable
private fun TiwiVideo(url: String, modifier: Modifier, autoplay: Boolean = false) {
    val context = LocalContext.current
    val player = remember(url) {
        ExoPlayer.Builder(context).build().apply {
            setMediaItem(MediaItem.fromUri(url))
            prepare()
            playWhenReady = autoplay
            repeatMode = if (autoplay) ExoPlayer.REPEAT_MODE_ONE else ExoPlayer.REPEAT_MODE_OFF
        }
    }
    DisposableEffect(player) { onDispose { player.release() } }
    AndroidView(
        factory = { PlayerView(it).apply { this.player = player; useController = !autoplay } },
        update = { it.player = player },
        modifier = modifier.background(Color.Black)
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TiwiApp(repository: SocialRepository, onLogout: () -> Unit) {
    var selectedTab by remember { mutableIntStateOf(0) }
    var showProfile by remember { mutableStateOf(false) }
    var showCreatePost by remember { mutableStateOf(false) }
    var showShareSheet by remember { mutableStateOf(false) }
    var showMessages by remember { mutableStateOf(false) }
    var showConnect by remember { mutableStateOf(false) }
    var isRandomChat by remember { mutableStateOf(false) }
    var selectedProfileUserId by remember { mutableStateOf<String?>(null) }
    var selectedChat by remember { mutableStateOf<SocialConversation?>(null) }
    var callRequest by remember { mutableStateOf<TiwiCallRequest?>(null) }
    
    val apiPosts by repository.feed.collectAsState()
    val currentUser by repository.currentUser.collectAsState()
    val incomingCalls by repository.incomingCalls.collectAsState()
    val posts = remember(apiPosts) { apiPosts.map(::toUiPost) }
    val reels = remember(apiPosts) { apiPosts.filter { it.type == "reel" || it.type == "video" }.map(::toUiReel) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        repository.validateSession()
        repository.refreshAll()
    }

    LaunchedEffect(currentUser?.id) {
        if (currentUser == null) return@LaunchedEffect
        while (true) {
            runCatching { repository.refreshIncomingCalls() }
            delay(3000)
        }
    }

    LaunchedEffect(incomingCalls, callRequest) {
        if (callRequest == null) incomingCalls.firstOrNull()?.let { incoming ->
            callRequest = TiwiCallRequest(
                conversationId = incoming.conversationId,
                peerId = incoming.callerId,
                peerName = incoming.caller.name.ifBlank { "Tiwi User" },
                peerAvatar = incoming.caller.avatar,
                video = incoming.type == "video",
                incoming = incoming
            )
        }
    }

    callRequest?.let { request ->
        SocialCallScreen(repository, request, onEnd = { callRequest = null })
        return
    }

    if (showShareSheet) {
        TiwiShareSheet(repository, onDismiss = { showShareSheet = false })
    }

    Scaffold(
        topBar = { 
            if (!showProfile && !showCreatePost && !showMessages && !showConnect && selectedProfileUserId == null && selectedChat == null) {
                TiwiTopBar(
                    avatarUrl = currentUser?.avatar,
                    onProfileClick = { showProfile = true },
                    onCreateClick = { showCreatePost = true },
                    onMessagesClick = { showMessages = true },
                    onConnectClick = { showConnect = true }
                ) 
            }
        },
        bottomBar = { 
            if (!showProfile && !showCreatePost && !showMessages && !showConnect && selectedProfileUserId == null && selectedChat == null) {
                TiwiBottomBar(selectedTab) { 
                    selectedTab = it
                } 
            }
        },
        containerColor = MaterialTheme.colorScheme.background
    ) { innerPadding ->
        Box(modifier = Modifier.padding(innerPadding)) {
            when {
                selectedProfileUserId != null -> ProfileScreen(repository, posts.filter { it.authorId == selectedProfileUserId }, reels.filter { it.authorId == selectedProfileUserId }, userId = selectedProfileUserId, onBack = { selectedProfileUserId = null })
                showConnect -> RandomConnectScreen(
                    repository = repository,
                    onBack = { showConnect = false },
                    onChatClick = { profile ->
                        scope.launch {
                            try {
                                selectedChat = repository.createConversation(profile.userId)
                                showConnect = false
                                isRandomChat = true
                            } catch (_: Exception) {}
                        }
                    }
                )
                selectedChat != null -> ChatDetailScreen(
                    repository = repository,
                    conversation = selectedChat!!,
                    onBack = { selectedChat = null; isRandomChat = false },
                    isRandom = isRandomChat,
                    onProfileClick = { id -> selectedProfileUserId = id; selectedChat = null },
                    onCall = { video ->
                        val contact = selectedChat?.members?.firstOrNull { it.userId != repository.currentUserId() }
                        if (contact != null) callRequest = TiwiCallRequest(
                            conversationId = selectedChat?.id,
                            peerId = contact.userId,
                            peerName = contact.user.name.ifBlank { "Tiwi User" },
                            peerAvatar = contact.user.avatar,
                            video = video
                        )
                    }
                )
                showMessages -> MessagesScreen(repository, onBack = { showMessages = false }, onChatClick = { selectedChat = it })
                showCreatePost -> CreatePostScreen(repository, onBack = { showCreatePost = false })
                showProfile -> ProfileScreen(repository, posts.filter { it.authorId == repository.currentUserId() }, reels.filter { it.authorId == repository.currentUserId() }, onBack = { showProfile = false })
                else -> {
                    when (selectedTab) {
                        0 -> HomeFeed(reels, posts, repository, onShareClick = { showShareSheet = true }, onAuthorClick = { selectedProfileUserId = it })
                        1 -> SearchScreen(repository) { selectedProfileUserId = it }
                        2 -> ReelsScreen(reels, repository)
                        3 -> NotificationsScreen(repository)
                        4 -> MenuScreen(repository, currentUser?.name.orEmpty(), currentUser?.avatar, onProfileClick = { showProfile = true }, onLogout = { repository.logout(); onLogout() })
                    }
                }
            }
        }
    }
}

@Composable
fun TiwiTopBar(avatarUrl: String?, onProfileClick: () -> Unit, onCreateClick: () -> Unit, onMessagesClick: () -> Unit, onConnectClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .statusBarsPadding()
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            text = "Tiwi",
            style = MaterialTheme.typography.headlineMedium.copy(
                fontWeight = FontWeight.ExtraBold,
                letterSpacing = (-1).sp,
                brush = Brush.linearGradient(listOf(TiwiBlue, TiwiPurple))
            )
        )
        
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onConnectClick) {
                Icon(Icons.Outlined.Explore, contentDescription = "Connect", tint = TiwiBlue)
            }
            IconButton(onClick = onCreateClick) {
                Icon(Icons.Outlined.AddBox, contentDescription = "Create", tint = MaterialTheme.colorScheme.onBackground)
            }
            IconButton(onClick = onMessagesClick) {
                Icon(Icons.Outlined.ChatBubbleOutline, contentDescription = "Messages", tint = MaterialTheme.colorScheme.onBackground)
            }
            Spacer(modifier = Modifier.width(8.dp))
            TiwiAvatar(
                url = avatarUrl,
                fallback = R.drawable.img_tiwi_avatar_1,
                modifier = Modifier
                    .size(36.dp)
                    .clip(CircleShape)
                    .clickable { onProfileClick() },
                contentScale = ContentScale.Crop
            )
        }
    }
}

@Composable
fun HomeFeed(reels: List<Reel>, posts: List<Post>, repository: SocialRepository, onShareClick: () -> Unit, onAuthorClick: (String) -> Unit) {
    val scope = rememberCoroutineScope()
    LazyColumn(modifier = Modifier.fillMaxSize()) {
        item {
            ReelsSection(reels)
        }
        items(posts) { post ->
            PostCard(
                post = post,
                onShareClick = onShareClick,
                onAuthorClick = { onAuthorClick(post.authorId) },
                onLikeClick = { scope.launch { runCatching { repository.reactToPost(post.id) } } },
                onFollowClick = { scope.launch { runCatching { repository.follow(post.authorId, true) } } }
            )
        }
    }
}

@Composable
fun ReelsSection(reels: List<Reel>) {
    Column(modifier = Modifier.padding(vertical = 8.dp)) {
        Text(
            text = "Trending Reels",
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold)
        )
        LazyRow(
            contentPadding = PaddingValues(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(reels) { reel ->
                ReelItem(reel)
            }
        }
    }
}

@Composable
fun ReelItem(reel: Reel) {
    Box(
        modifier = Modifier
            .size(width = 110.dp, height = 180.dp)
            .clip(RoundedCornerShape(16.dp))
            .background(MaterialTheme.colorScheme.surface)
    ) {
        TiwiAvatar(reel.thumbnailUrl, reel.thumbnail, Modifier.fillMaxSize(), ContentScale.Crop)
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(Color.Transparent, Color.Black.copy(alpha = 0.6f)),
                        startY = 300f
                    )
                )
        )
        Text(
            text = reel.author,
            modifier = Modifier
                .align(Alignment.BottomStart)
                .padding(8.dp),
            color = Color.White,
            style = MaterialTheme.typography.labelSmall,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}

@Composable
fun PostCard(
    post: Post,
    onShareClick: () -> Unit = {},
    onAuthorClick: () -> Unit = {},
    onLikeClick: () -> Unit = {},
    onFollowClick: () -> Unit = {}
) {
    var isExpanded by remember { mutableStateOf(false) }
    
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 12.dp)
            .background(MaterialTheme.colorScheme.background)
    ) {
        // Author Info
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            TiwiAvatar(
                url = post.authorAvatarUrl,
                fallback = post.authorAvatar,
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .clickable { onAuthorClick() },
                contentScale = ContentScale.Crop
            )
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.clickable { onAuthorClick() }) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = post.author,
                        style = MaterialTheme.typography.bodyLarge.copy(fontWeight = FontWeight.Bold)
                    )
                    if (post.verified) {
                        Spacer(modifier = Modifier.width(4.dp))
                        Icon(Icons.Default.Verified, contentDescription = "Verified", tint = TiwiBlue, modifier = Modifier.size(16.dp))
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Follow",
                        color = TiwiBlue,
                        style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.ExtraBold),
                        modifier = Modifier.clickable(onClick = onFollowClick)
                    )
                }
                Text(
                    text = post.time,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.6f)
                )
            }
            Spacer(modifier = Modifier.weight(1f))
            IconButton(onClick = { }) {
                Icon(Icons.Default.MoreVert, contentDescription = "More")
            }
        }
        
        // Content
        Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
            Text(
                text = post.content,
                style = MaterialTheme.typography.bodyMedium,
                maxLines = if (isExpanded) Int.MAX_VALUE else 3,
                overflow = TextOverflow.Ellipsis
            )
            if (post.content.length > 100) {
                Text(
                    text = if (isExpanded) "See less" else "See more",
                    modifier = Modifier
                        .clickable { isExpanded = !isExpanded }
                        .padding(vertical = 4.dp),
                    color = TiwiBlue,
                    style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold)
                )
            }
        }
        
        // Image
        when {
            !post.videoUrl.isNullOrBlank() -> TiwiVideo(post.videoUrl, Modifier.fillMaxWidth().height(300.dp))
            !post.imageUrl.isNullOrBlank() -> AsyncImage(model = post.imageUrl, contentDescription = null, modifier = Modifier.fillMaxWidth().height(300.dp), contentScale = ContentScale.Crop)
            post.image != null -> Image(painter = painterResource(post.image), contentDescription = null, modifier = Modifier.fillMaxWidth().height(300.dp), contentScale = ContentScale.Crop)
        }
        
        // Interaction
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 4.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = { }) {
                    Icon(Icons.Outlined.ChatBubbleOutline, contentDescription = "Comment", modifier = Modifier.size(18.dp), tint = Color.Gray)
                }
                Text(text = post.comments.toString(), style = MaterialTheme.typography.labelSmall, color = Color.Gray)
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = { }) {
                    Icon(Icons.Default.Repeat, contentDescription = "Repost", modifier = Modifier.size(18.dp), tint = Color.Gray)
                }
                Text(text = post.shares.toString(), style = MaterialTheme.typography.labelSmall, color = Color.Gray)
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onLikeClick) {
                    Icon(if (post.liked) Icons.Filled.Favorite else Icons.Outlined.FavoriteBorder, contentDescription = "Like", modifier = Modifier.size(18.dp), tint = if (post.liked) Color.Red else Color.Gray)
                }
                Text(text = post.likes.toString(), style = MaterialTheme.typography.labelSmall, color = Color.Gray)
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = { }) {
                    Icon(Icons.Outlined.BarChart, contentDescription = "Views", modifier = Modifier.size(18.dp), tint = Color.Gray)
                }
                Text(text = post.views.toString(), style = MaterialTheme.typography.labelSmall, color = Color.Gray)
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = { }) {
                    Icon(Icons.Outlined.BookmarkBorder, contentDescription = "Save", modifier = Modifier.size(18.dp), tint = Color.Gray)
                }
                IconButton(onClick = onShareClick) {
                    Icon(Icons.Outlined.Share, contentDescription = "Share", modifier = Modifier.size(18.dp), tint = Color.Gray)
                }
            }
        }
        
        HorizontalDivider(
            modifier = Modifier.padding(horizontal = 16.dp),
            thickness = 0.5.dp,
            color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.1f)
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TiwiShareSheet(repository: SocialRepository, onDismiss: () -> Unit) {
    val conversations by repository.conversations.collectAsState()
    val contacts = remember(conversations) {
        conversations.mapNotNull { chat -> chat.members.firstOrNull { it.userId != repository.currentUserId() }?.user?.name }.distinct().take(8)
    }
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = MaterialTheme.colorScheme.surface,
        dragHandle = { BottomSheetDefaults.DragHandle() }
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Text(
                text = "Share to",
                style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold),
                modifier = Modifier.padding(bottom = 16.dp)
            )
            
            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(16.dp),
                modifier = Modifier.padding(bottom = 24.dp)
            ) {
                items(contacts) { name ->
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Box(
                            modifier = Modifier
                                .size(56.dp)
                                .clip(CircleShape)
                                .background(TiwiBlue.copy(alpha = 0.1f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(name.take(1), fontWeight = FontWeight.Bold, color = TiwiBlue)
                        }
                        Text(name, style = MaterialTheme.typography.labelSmall, modifier = Modifier.padding(top = 4.dp))
                    }
                }
            }
            
            val apps = listOf(
                Triple("Copy Link", Icons.Default.Link, Color.Gray),
                Triple("WhatsApp", Icons.Default.Chat, Color(0xFF25D366)),
                Triple("Facebook", Icons.Default.Facebook, Color(0xFF1877F2)),
                Triple("X", Icons.Default.Close, Color.Black)
            )
            
            apps.forEach { (name, icon, color) ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onDismiss() }
                        .padding(vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(icon, contentDescription = null, tint = color)
                    Spacer(modifier = Modifier.width(16.dp))
                    Text(name, style = MaterialTheme.typography.bodyLarge)
                }
            }
            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}

@Composable
fun CreatePostScreen(repository: SocialRepository, onBack: () -> Unit) {
    var text by remember { mutableStateOf("") }
    var selectedUri by remember { mutableStateOf<android.net.Uri?>(null) }
    var postType by remember { mutableStateOf("post") }
    var busy by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val user by repository.currentUser.collectAsState()
    val photoPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri -> selectedUri = uri; postType = "post" }
    val videoPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri -> selectedUri = uri; postType = "reel" }
    
    Column(modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            TextButton(onClick = onBack) {
                Text("Cancel", color = MaterialTheme.colorScheme.onBackground)
            }
            Button(
                onClick = {
                    if (busy) return@Button
                    scope.launch {
                        busy = true
                        try {
                            val media = selectedUri?.let { listOf(repository.uploadMedia(context.contentResolver, it, postType)) }.orEmpty()
                            repository.createPost(text, postType, media)
                            onBack()
                        } catch (error: Exception) {
                            Toast.makeText(context, error.message ?: "Post failed", Toast.LENGTH_LONG).show()
                        } finally { busy = false }
                    }
                },
                enabled = (text.isNotBlank() || selectedUri != null) && !busy,
                colors = ButtonDefaults.buttonColors(containerColor = TiwiBlue),
                shape = RoundedCornerShape(20.dp)
            ) {
                Text("Post", fontWeight = FontWeight.Bold)
            }
        }
        
        Row(modifier = Modifier.padding(16.dp).fillMaxWidth()) {
            TiwiAvatar(user?.avatar, R.drawable.img_tiwi_avatar_1, Modifier.size(40.dp).clip(CircleShape))
            Spacer(modifier = Modifier.width(12.dp))
            TextField(
                value = text,
                onValueChange = { text = it },
                placeholder = { Text("What's happening?", color = Color.Gray) },
                modifier = Modifier.fillMaxWidth(),
                colors = TextFieldDefaults.colors(
                    focusedContainerColor = Color.Transparent,
                    unfocusedContainerColor = Color.Transparent,
                    disabledContainerColor = Color.Transparent,
                    focusedIndicatorColor = Color.Transparent,
                    unfocusedIndicatorColor = Color.Transparent
                )
            )
        }
        
        Spacer(modifier = Modifier.weight(1f))
        
        // Attachment Bar
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
                .background(MaterialTheme.colorScheme.surface, RoundedCornerShape(12.dp))
                .padding(8.dp),
            horizontalArrangement = Arrangement.SpaceAround
        ) {
            IconButton(onClick = { photoPicker.launch("image/*") }) { Icon(Icons.Default.Photo, "Photo", tint = TiwiBlue) }
            IconButton(onClick = { videoPicker.launch("video/*") }) { Icon(Icons.Default.VideoLibrary, "Video", tint = TiwiPurple) }
            IconButton(onClick = {}) { Icon(Icons.Default.PersonAdd, "Tag", tint = TiwiPink) }
            IconButton(onClick = {}) { Icon(Icons.Default.LocationOn, "Location", tint = Color.Red) }
            IconButton(onClick = {}) { Icon(Icons.Default.Gif, "Gif", tint = TiwiBlue) }
        }
    }
}

@Composable
fun TiwiBottomBar(selectedTab: Int, onTabSelected: (Int) -> Unit) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 24.dp, vertical = 20.dp)
            .height(64.dp),
        color = MaterialTheme.colorScheme.surface.copy(alpha = 0.95f),
        shape = RoundedCornerShape(32.dp),
        tonalElevation = 8.dp,
        shadowElevation = 12.dp
    ) {
        Row(
            modifier = Modifier.fillMaxSize().padding(horizontal = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceAround
        ) {
            val items = listOf(
                Icons.Outlined.Home to Icons.Filled.Home,
                Icons.Outlined.Search to Icons.Filled.Search,
                Icons.Outlined.PlayCircle to Icons.Filled.PlayCircle,
                Icons.Outlined.Notifications to Icons.Filled.Notifications,
                Icons.Outlined.Person to Icons.Filled.Person
            )
            
            items.forEachIndexed { index, (outlined, filled) ->
                val isSelected = selectedTab == index
                val iconScale by animateFloatAsState(if (isSelected) 1.2f else 1f)
                
                IconButton(
                    onClick = { onTabSelected(index) },
                    modifier = Modifier.size(48.dp)
                ) {
                    Icon(
                        imageVector = if (isSelected) filled else outlined,
                        contentDescription = null,
                        tint = if (isSelected) TiwiBlue else Color.Gray.copy(alpha = 0.6f),
                        modifier = Modifier.size(26.dp).graphicsLayer(scaleX = iconScale, scaleY = iconScale)
                    )
                }
            }
        }
    }
}

@Composable
fun SearchScreen(repository: SocialRepository, onProfileClick: (String) -> Unit) {
    var query by remember { mutableStateOf("") }
    var profiles by remember { mutableStateOf<List<SocialProfile>>(emptyList()) }
    val feed by repository.feed.collectAsState()
    LaunchedEffect(query) {
        if (query.isBlank()) profiles = emptyList()
        else {
            delay(300)
            profiles = runCatching { repository.searchProfiles(query) }.getOrDefault(emptyList())
        }
    }
    Column(modifier = Modifier.fillMaxSize()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
                .background(MaterialTheme.colorScheme.surface, RoundedCornerShape(12.dp))
                .padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(Icons.Default.Search, contentDescription = null, tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
            Spacer(modifier = Modifier.width(8.dp))
            BasicTextField(
                value = query,
                onValueChange = { query = it },
                modifier = Modifier.weight(1f),
                singleLine = true,
                textStyle = MaterialTheme.typography.bodyMedium.copy(color = MaterialTheme.colorScheme.onSurface),
                decorationBox = { inner -> if (query.isBlank()) Text("Search Tiwi", color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)); inner() }
            )
        }

        if (query.isNotBlank()) {
            LazyColumn(modifier = Modifier.fillMaxSize()) {
                items(profiles, key = { it.userId }) { profile ->
                    ListItem(
                        modifier = Modifier.clickable { onProfileClick(profile.userId) },
                        leadingContent = { TiwiAvatar(profile.user.avatar, R.drawable.img_tiwi_avatar_1, Modifier.size(48.dp).clip(CircleShape)) },
                        headlineContent = { Text(profile.user.name, fontWeight = FontWeight.Bold) },
                        supportingContent = { Text("@${profile.username}") },
                        trailingContent = { if (profile.verified) Icon(Icons.Default.Verified, "Verified", tint = TiwiBlue) },
                        colors = ListItemDefaults.colors(containerColor = Color.Transparent)
                    )
                }
            }
            return@Column
        }
        
        // Explore Grid (Instagram style)
        val images = (feed.mapNotNull { post -> post.thumbnailUrl ?: post.media.firstOrNull()?.thumbnailUrl ?: post.media.firstOrNull()?.url } + List(6) { null }).take(6)
        
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(1.dp)
        ) {
            item {
                Row(modifier = Modifier.fillMaxWidth().height(240.dp)) {
                    Box(modifier = Modifier.weight(2f).fillMaxHeight().padding(1.dp)) {
                        ExploreImage(images[0], Modifier.fillMaxSize())
                    }
                    Column(modifier = Modifier.weight(1f).fillMaxHeight()) {
                        ExploreImage(images[1], Modifier.weight(1f).fillMaxWidth().padding(1.dp))
                        ExploreImage(images[2], Modifier.weight(1f).fillMaxWidth().padding(1.dp))
                    }
                }
            }
            item {
                Row(modifier = Modifier.fillMaxWidth().height(120.dp)) {
                    ExploreImage(images[3], Modifier.weight(1f).fillMaxHeight().padding(1.dp))
                    ExploreImage(images[4], Modifier.weight(1f).fillMaxHeight().padding(1.dp))
                    ExploreImage(images[5], Modifier.weight(1f).fillMaxHeight().padding(1.dp))
                }
            }
            items(10) { index ->
                Row(modifier = Modifier.fillMaxWidth().height(120.dp)) {
                    ExploreImage(images[index % images.size], Modifier.weight(1f).fillMaxHeight().padding(1.dp))
                    ExploreImage(images[(index + 1) % images.size], Modifier.weight(1f).fillMaxHeight().padding(1.dp))
                    ExploreImage(images[(index + 2) % images.size], Modifier.weight(1f).fillMaxHeight().padding(1.dp))
                }
            }
        }
    }
}

@Composable
fun ReelsScreen(reels: List<Reel>, repository: SocialRepository) {
    val reel = reels.firstOrNull()
    val scope = rememberCoroutineScope()
    Box(modifier = Modifier.fillMaxSize()) {
        when {
            !reel?.videoUrl.isNullOrBlank() -> TiwiVideo(reel!!.videoUrl!!, Modifier.fillMaxSize(), autoplay = true)
            !reel?.thumbnailUrl.isNullOrBlank() -> AsyncImage(model = reel?.thumbnailUrl, contentDescription = null, modifier = Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
            else -> Box(Modifier.fillMaxSize().background(Color.Black))
        }
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        listOf(Color.Transparent, Color.Black.copy(alpha = 0.8f)),
                        startY = 1000f
                    )
                )
        )
        Column(
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            IconButton(onClick = { reel?.let { scope.launch { runCatching { repository.reactToPost(it.id) } } } }) { Icon(Icons.Default.Favorite, "Like", tint = Color.White, modifier = Modifier.size(32.dp)) }
            Text((reel?.likes ?: 0).toString(), color = Color.White, style = MaterialTheme.typography.labelMedium)
            Spacer(modifier = Modifier.height(16.dp))
            IconButton(onClick = { }) { Icon(Icons.Default.Comment, "Comment", tint = Color.White, modifier = Modifier.size(32.dp)) }
            Text((reel?.comments ?: 0).toString(), color = Color.White, style = MaterialTheme.typography.labelMedium)
            Spacer(modifier = Modifier.height(16.dp))
            IconButton(onClick = { }) { Icon(Icons.Default.Share, "Share", tint = Color.White, modifier = Modifier.size(32.dp)) }
            Text("Share", color = Color.White, style = MaterialTheme.typography.labelMedium)
        }
        
        Column(
            modifier = Modifier
                .align(Alignment.BottomStart)
                .padding(16.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                TiwiAvatar(reel?.authorAvatarUrl, R.drawable.img_tiwi_avatar_1, Modifier.size(32.dp).clip(CircleShape))
                Spacer(modifier = Modifier.width(8.dp))
                Text(reel?.author.orEmpty(), color = Color.White, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.width(12.dp))
                Button(
                    onClick = {},
                    colors = ButtonDefaults.buttonColors(containerColor = Color.White, contentColor = Color.Black),
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 0.dp),
                    modifier = Modifier.height(28.dp),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text("Follow", fontSize = 12.sp)
                }
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text(reel?.content.orEmpty(), color = Color.White)
            Spacer(modifier = Modifier.height(8.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.MusicNote, null, Modifier.size(16.dp), Color.White)
                Spacer(modifier = Modifier.width(4.dp))
                Text("Original sound by ${reel?.author.orEmpty()}", color = Color.White, style = MaterialTheme.typography.labelSmall)
            }
        }
    }
}

@Composable
private fun SocialCallScreen(repository: SocialRepository, request: TiwiCallRequest, onEnd: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val manager = remember(request.incoming?.id, request.peerId, request.video) { WebRtcCallManager(context, repository) }
    val callState by manager.state.collectAsState()
    val localVideo by manager.localVideo.collectAsState()
    val remoteVideo by manager.remoteVideo.collectAsState()
    val microphoneEnabled by manager.microphoneEnabled.collectAsState()
    val cameraEnabled by manager.cameraEnabled.collectAsState()
    var started by remember(request) { mutableStateOf(false) }

    val beginCall: () -> Unit = {
        if (!started) {
            started = true
            scope.launch {
                runCatching {
                    if (request.incoming != null) manager.answerIncoming(request.incoming)
                    else manager.startOutgoing(request.conversationId, request.peerId, request.video)
                }.onFailure { Toast.makeText(context, it.message ?: "Call failed", Toast.LENGTH_SHORT).show() }
            }
        }
    }
    val requiredPermissions = remember(request.video) {
        if (request.video) arrayOf(Manifest.permission.RECORD_AUDIO, Manifest.permission.CAMERA)
        else arrayOf(Manifest.permission.RECORD_AUDIO)
    }
    val permissionLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { result ->
        if (requiredPermissions.all { result[it] == true || ContextCompat.checkSelfPermission(context, it) == PackageManager.PERMISSION_GRANTED }) beginCall()
        else {
            request.incoming?.let(manager::declineIncoming)
            Toast.makeText(context, "Microphone/camera permission is required", Toast.LENGTH_SHORT).show()
            onEnd()
        }
    }
    val requestPermissionAndStart: () -> Unit = {
        if (requiredPermissions.all { ContextCompat.checkSelfPermission(context, it) == PackageManager.PERMISSION_GRANTED }) beginCall()
        else permissionLauncher.launch(requiredPermissions)
    }

    LaunchedEffect(request) {
        if (request.incoming == null) requestPermissionAndStart()
    }
    LaunchedEffect(callState) {
        if (started && callState in setOf("Declined", "Call ended")) {
            delay(900)
            onEnd()
        }
    }
    BackHandler {
        if (request.incoming != null && !started) manager.declineIncoming(request.incoming) else manager.hangUp()
        onEnd()
    }
    DisposableEffect(manager) { onDispose { manager.dispose(sendEnd = false) } }

    Box(modifier = Modifier.fillMaxSize().background(Color.Black)) {
        if (request.video && remoteVideo != null) {
            WebRtcVideoSurface(remoteVideo, manager.eglContext, Modifier.fillMaxSize(), mirror = false)
        } else {
            Column(
                modifier = Modifier.align(Alignment.Center),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                TiwiAvatar(request.peerAvatar, R.drawable.img_tiwi_avatar_1, Modifier.size(132.dp).clip(CircleShape))
                Spacer(Modifier.height(20.dp))
                Text(request.peerName, color = Color.White, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
            }
        }

        Column(
            modifier = Modifier.align(Alignment.TopCenter).statusBarsPadding().padding(top = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(if (request.video) "Tiwi video call" else "Tiwi audio call", color = Color.White.copy(alpha = 0.8f))
            Text(
                if (request.incoming != null && !started) "Incoming call" else callState,
                color = Color.White,
                style = MaterialTheme.typography.titleMedium
            )
        }

        if (request.video && localVideo != null && started) {
            WebRtcVideoSurface(
                localVideo,
                manager.eglContext,
                Modifier.align(Alignment.TopEnd).statusBarsPadding().padding(top = 88.dp, end = 16.dp)
                    .size(width = 112.dp, height = 168.dp).clip(RoundedCornerShape(16.dp)),
                mirror = true
            )
        }

        Row(
            modifier = Modifier.align(Alignment.BottomCenter).navigationBarsPadding().padding(bottom = 32.dp),
            horizontalArrangement = Arrangement.spacedBy(24.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            if (request.incoming != null && !started) {
                CallControl(Icons.Default.CallEnd, Color(0xFFE53935), "Decline") {
                    manager.declineIncoming(request.incoming)
                    onEnd()
                }
                CallControl(if (request.video) Icons.Default.VideoCall else Icons.Default.Call, Color(0xFF36B65B), "Answer") {
                    requestPermissionAndStart()
                }
            } else {
                CallControl(if (microphoneEnabled) Icons.Default.Mic else Icons.Default.MicOff, Color.White.copy(alpha = 0.22f), "Microphone") {
                    manager.toggleMicrophone()
                }
                CallControl(Icons.Default.CallEnd, Color(0xFFE53935), "End call") {
                    manager.hangUp()
                    onEnd()
                }
                if (request.video) {
                    CallControl(if (cameraEnabled) Icons.Default.Videocam else Icons.Default.VideocamOff, Color.White.copy(alpha = 0.22f), "Camera") {
                        manager.toggleCamera()
                    }
                    CallControl(Icons.Default.Cameraswitch, Color.White.copy(alpha = 0.22f), "Switch camera") {
                        manager.switchCamera()
                    }
                }
            }
        }
    }
}

@Composable
private fun CallControl(icon: ImageVector, color: Color, description: String, onClick: () -> Unit) {
    Surface(
        modifier = Modifier.size(58.dp).clickable(onClick = onClick),
        shape = CircleShape,
        color = color
    ) {
        Box(contentAlignment = Alignment.Center) {
            Icon(icon, contentDescription = description, tint = Color.White, modifier = Modifier.size(28.dp))
        }
    }
}

@Composable
private fun WebRtcVideoSurface(track: VideoTrack?, eglContext: EglBase.Context, modifier: Modifier, mirror: Boolean) {
    var renderer by remember { mutableStateOf<SurfaceViewRenderer?>(null) }
    AndroidView(
        factory = { viewContext ->
            SurfaceViewRenderer(viewContext).apply {
                init(eglContext, null)
                setEnableHardwareScaler(true)
                setMirror(mirror)
                setZOrderMediaOverlay(mirror)
                renderer = this
            }
        },
        update = { it.setMirror(mirror) },
        modifier = modifier.background(Color.Black)
    )
    DisposableEffect(renderer, track) {
        val activeRenderer = renderer
        if (activeRenderer != null && track != null) track.addSink(activeRenderer)
        onDispose { if (activeRenderer != null && track != null) track.removeSink(activeRenderer) }
    }
    DisposableEffect(renderer) {
        val activeRenderer = renderer
        onDispose { activeRenderer?.release() }
    }
}

@Composable
fun NotificationsScreen(repository: SocialRepository) {
    Column(modifier = Modifier.fillMaxSize()) {
        Text(
            text = "Activity",
            modifier = Modifier.padding(16.dp),
            style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Bold)
        )
        
        val notifications = emptyList<String>()
        
        LazyColumn {
            items(notifications) { note ->
                ListItem(
                    leadingContent = { 
                        Box(modifier = Modifier.size(40.dp).clip(CircleShape).background(TiwiBlue.copy(alpha = 0.1f)), contentAlignment = Alignment.Center) {
                            Icon(Icons.Default.Notifications, contentDescription = null, tint = TiwiBlue)
                        }
                    },
                    headlineContent = { Text(note) },
                    supportingContent = { Text("2 hours ago") },
                    colors = ListItemDefaults.colors(containerColor = Color.Transparent)
                )
            }
        }
    }
}

@Composable
fun MenuScreen(repository: SocialRepository, name: String, avatarUrl: String?, onProfileClick: () -> Unit, onLogout: () -> Unit) {
    var selectedSetting by remember { mutableStateOf<String?>(null) }
    val profile by repository.profile.collectAsState()
    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text(
            text = "Menu",
            style = MaterialTheme.typography.headlineLarge.copy(fontWeight = FontWeight.Bold)
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        // Profile Card
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .clickable { onProfileClick() },
            color = MaterialTheme.colorScheme.surface,
            shape = RoundedCornerShape(16.dp)
        ) {
            Row(
                modifier = Modifier.padding(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                TiwiAvatar(avatarUrl, R.drawable.img_tiwi_avatar_1, Modifier.size(50.dp).clip(CircleShape))
                Spacer(modifier = Modifier.width(16.dp))
                Column {
                    Text(name, style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold))
                    Text("See your profile", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                }
                Spacer(modifier = Modifier.weight(1f))
                Icon(Icons.Default.ChevronRight, contentDescription = null)
            }
        }
        
        Spacer(modifier = Modifier.height(24.dp))
        
        LazyColumn(verticalArrangement = Arrangement.spacedBy(16.dp)) {
            item {
                Text("Your Shortcuts", style = MaterialTheme.typography.titleSmall, color = Color.Gray)
                Spacer(modifier = Modifier.height(8.dp))
                val shortcuts = listOf(
                    Triple("Saved", Icons.Default.Bookmark, TiwiPurple),
                    Triple("Memories", Icons.Default.History, TiwiBlue),
                    Triple("Groups", Icons.Default.Group, TiwiPink)
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    shortcuts.forEach { item ->
                        Surface(
                            modifier = Modifier.weight(1f).height(100.dp),
                            color = MaterialTheme.colorScheme.surface,
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Column(
                                modifier = Modifier.padding(12.dp),
                                verticalArrangement = Arrangement.Center
                            ) {
                                Icon(item.second, contentDescription = null, tint = item.third)
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(item.first, style = MaterialTheme.typography.labelMedium)
                            }
                        }
                    }
                }
            }
            
            item {
                Text("Settings & Support", style = MaterialTheme.typography.titleSmall, color = Color.Gray)
                Spacer(modifier = Modifier.height(8.dp))
                val settings = listOf(
                    Pair("Account Settings", Icons.Default.Settings),
                    Pair("Privacy Center", Icons.Default.Security),
                    Pair("Help & Support", Icons.Default.Help),
                    Pair("About Tiwi", Icons.Default.Info)
                )
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    settings.forEach { item ->
                        ListItem(
                            headlineContent = { Text(item.first) },
                            leadingContent = { Icon(item.second, contentDescription = null, tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)) },
                            trailingContent = { Icon(Icons.Default.ChevronRight, contentDescription = null) },
                            colors = ListItemDefaults.colors(containerColor = MaterialTheme.colorScheme.surface),
                            modifier = Modifier.clip(RoundedCornerShape(8.dp)).clickable { selectedSetting = item.first }
                        )
                    }
                }
            }
            
            item {
                Button(
                    onClick = onLogout,
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = TiwiPink.copy(alpha = 0.1f), contentColor = TiwiPink),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text("Log Out", fontWeight = FontWeight.Bold)
                }
                Spacer(modifier = Modifier.height(32.dp))
            }
        }
    }
    selectedSetting?.let { setting ->
        SocialSettingsDialog(repository, profile, setting, onDismiss = { selectedSetting = null })
    }
}

@Composable
private fun SocialSettingsDialog(repository: SocialRepository, profile: SocialProfile?, page: String, onDismiss: () -> Unit) {
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val isPrivacy = page == "Privacy Center"
    val editable = page == "Account Settings" || isPrivacy
    var autoplay by remember(profile, page) { mutableStateOf(profile?.preferences?.get("autoplayVideo") as? Boolean ?: true) }
    var autoQuality by remember(profile, page) { mutableStateOf(profile?.preferences?.get("autoQuality") as? Boolean ?: true) }
    var dataSaver by remember(profile, page) { mutableStateOf(profile?.preferences?.get("dataSaver") as? Boolean ?: false) }
    var privateProfile by remember(profile, page) { mutableStateOf(profile?.privacy?.get("profileVisibility") == "private") }
    var allowMessages by remember(profile, page) { mutableStateOf(profile?.privacy?.get("allowMessages") as? Boolean ?: true) }
    var allowCalls by remember(profile, page) { mutableStateOf(profile?.privacy?.get("allowCalls") as? Boolean ?: true) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(page) },
        text = {
            when {
                page == "Account Settings" -> Column {
                    SettingSwitch("Autoplay videos", autoplay) { autoplay = it }
                    SettingSwitch("Automatic video quality", autoQuality) { autoQuality = it }
                    SettingSwitch("Data saver", dataSaver) { dataSaver = it }
                }
                isPrivacy -> Column {
                    SettingSwitch("Private profile", privateProfile) { privateProfile = it }
                    SettingSwitch("Allow messages", allowMessages) { allowMessages = it }
                    SettingSwitch("Allow audio/video calls", allowCalls) { allowCalls = it }
                }
                page == "Help & Support" -> Text("For account and app support, use the support contact on tiwlo.com.")
                else -> Text("Tiwi Social connects your real Tiwlo account, feed, reels, messages and calls.")
            }
        },
        confirmButton = {
            TextButton(onClick = {
                if (!editable) onDismiss() else scope.launch {
                    val input = if (isPrivacy) mapOf(
                        "privacy" to (profile?.privacy.orEmpty() + mapOf(
                            "profileVisibility" to if (privateProfile) "private" else "public",
                            "allowMessages" to allowMessages,
                            "allowCalls" to allowCalls
                        ))
                    ) else mapOf(
                        "preferences" to (profile?.preferences.orEmpty() + mapOf("autoplayVideo" to autoplay, "autoQuality" to autoQuality, "dataSaver" to dataSaver))
                    )
                    runCatching { repository.updateProfile(input) }
                        .onSuccess { onDismiss() }
                        .onFailure { Toast.makeText(context, it.message ?: "Settings failed", Toast.LENGTH_SHORT).show() }
                }
            }) { Text(if (editable) "Save" else "Close") }
        },
        dismissButton = { if (editable) TextButton(onClick = onDismiss) { Text("Cancel") } }
    )
}

@Composable
private fun SettingSwitch(label: String, checked: Boolean, onCheckedChange: (Boolean) -> Unit) {
    Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Text(label, modifier = Modifier.weight(1f))
        Switch(checked = checked, onCheckedChange = onCheckedChange)
    }
}

@Composable
fun ProfileScreen(repository: SocialRepository, posts: List<Post>, reels: List<Reel>, userId: String? = null, onBack: () -> Unit) {
    var selectedProfileTab by remember { mutableIntStateOf(0) }
    var isFollowing by remember { mutableStateOf(false) }
    var showEditProfile by remember { mutableStateOf(false) }
    val ownProfile by repository.profile.collectAsState()
    val ownUser by repository.currentUser.collectAsState()
    var remoteProfile by remember(userId) { mutableStateOf<SocialProfile?>(null) }
    val profile = if (userId == null || userId == repository.currentUserId()) ownProfile else remoteProfile
    val name = profile?.user?.name ?: if (userId == null) ownUser?.name.orEmpty() else posts.firstOrNull()?.author.orEmpty()
    val isOwn = userId == null || userId == repository.currentUserId()
    val scope = rememberCoroutineScope()
    LaunchedEffect(userId) {
        val loaded = if (isOwn) runCatching { repository.refreshProfile() }.getOrNull()
        else runCatching { repository.refreshProfile(userId) }.getOrNull().also { remoteProfile = it }
        isFollowing = loaded?.isFollowing ?: false
    }
    
    LazyColumn(modifier = Modifier.fillMaxSize()) {
        item {
            Box(modifier = Modifier.fillMaxWidth().height(260.dp)) {
                // Cover
                TiwiAvatar(profile?.coverUrl, R.drawable.img_tiwi_cover, Modifier.fillMaxWidth().height(180.dp), ContentScale.Crop)
                
                IconButton(
                    onClick = onBack,
                    modifier = Modifier.statusBarsPadding().padding(8.dp).background(Color.Black.copy(alpha = 0.3f), CircleShape)
                ) {
                    Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = Color.White)
                }
                
                // Avatar and Buttons Row
                Row(
                    modifier = Modifier.align(Alignment.BottomStart).fillMaxWidth().padding(horizontal = 16.dp),
                    verticalAlignment = Alignment.Bottom,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    TiwiAvatar(
                        url = profile?.user?.avatar ?: ownUser?.avatar,
                        fallback = R.drawable.img_tiwi_avatar_1,
                        modifier = Modifier
                            .size(110.dp)
                            .border(4.dp, MaterialTheme.colorScheme.background, CircleShape)
                            .clip(CircleShape),
                        contentScale = ContentScale.Crop
                    )
                    
                    Row(
                        modifier = Modifier.padding(bottom = 8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Button(
                            onClick = {
                                if (isOwn) showEditProfile = true
                                else if (userId != null) scope.launch {
                                    runCatching { repository.follow(userId, !isFollowing) }.onSuccess { isFollowing = it.isFollowing }
                                }
                            },
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (isFollowing) Color.LightGray.copy(alpha = 0.2f) else TiwiBlue,
                                contentColor = if (isFollowing) Color.Black else Color.White
                            ),
                            contentPadding = PaddingValues(horizontal = 20.dp, vertical = 0.dp),
                            modifier = Modifier.height(36.dp)
                        ) {
                            Text(
                                if (isOwn) "Edit Profile" else if (isFollowing) "Following" else "Follow",
                                style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.Bold)
                            )
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        IconButton(
                            onClick = {},
                            modifier = Modifier.size(36.dp).background(Color.LightGray.copy(alpha = 0.2f), RoundedCornerShape(12.dp))
                        ) {
                            Icon(Icons.Default.MoreHoriz, contentDescription = null, modifier = Modifier.size(20.dp))
                        }
                    }
                }
            }
            
            Column(modifier = Modifier.padding(16.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(name, style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Bold))
                    if (profile?.verified == true) { Spacer(Modifier.width(5.dp)); Icon(Icons.Default.Verified, "Verified", tint = TiwiBlue, modifier = Modifier.size(19.dp)) }
                }
                Text(profile?.bio.orEmpty(), style = MaterialTheme.typography.bodyMedium)
                Spacer(modifier = Modifier.height(12.dp))
                
                // Stats Card
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        horizontalArrangement = Arrangement.SpaceAround
                    ) {
                        ProfileStatItem("Posts", (profile?.postCount ?: posts.size).toString())
                        ProfileStatItem("Followers", (profile?.followerCount ?: 0).toString())
                        ProfileStatItem("Following", (profile?.followingCount ?: 0).toString())
                        ProfileStatItem("Score", if (profile?.verified == true) "Verified" else "—")
                    }
                }
            }
        }

        item {
            FeaturedContentSection(posts)
        }
            
        item {
            // Profile Tabs
            ScrollableTabRow(
                selectedTabIndex = selectedProfileTab,
                containerColor = Color.Transparent,
                contentColor = TiwiBlue,
                divider = {},
                edgePadding = 16.dp,
                indicator = { tabPositions ->
                    TabRowDefaults.SecondaryIndicator(
                        Modifier.tabIndicatorOffset(tabPositions[selectedProfileTab]),
                        color = TiwiBlue
                    )
                }
            ) {
                listOf("Posts", "Reels", "Albums", "About").forEachIndexed { index, title ->
                    Tab(
                        selected = selectedProfileTab == index,
                        onClick = { selectedProfileTab = index },
                        text = { Text(title, fontWeight = if (selectedProfileTab == index) FontWeight.Bold else FontWeight.Normal) }
                    )
                }
            }
        }
        
        when (selectedProfileTab) {
            0 -> {
                items(posts) { post -> PostCard(post) }
            }
            1 -> {
                item {
                    LazyRow(
                        modifier = Modifier.padding(16.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(reels) { reel -> ReelItem(reel) }
                    }
                }
            }
            2 -> {
                item { 
                    Column(
                        modifier = Modifier.fillMaxWidth().padding(32.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Box(
                            modifier = Modifier
                                .size(80.dp)
                                .clip(CircleShape)
                                .background(TiwiPurple.copy(alpha = 0.1f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Default.PhotoLibrary, null, Modifier.size(40.dp), TiwiPurple)
                        }
                        Spacer(modifier = Modifier.height(16.dp))
                        Text("No Albums Yet", style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold))
                        Text(
                            "Share your memories by creating your first photo album.",
                            textAlign = TextAlign.Center,
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color.Gray
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Button(onClick = {}, colors = ButtonDefaults.buttonColors(containerColor = TiwiPurple)) {
                            Text("Create Album")
                        }
                    }
                }
            }
            3 -> {
                item {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text("Bio", style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold))
                        Text(profile?.about ?: profile?.bio.orEmpty())
                        Spacer(modifier = Modifier.height(16.dp))
                        Text("Details", style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold))
                        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(vertical = 4.dp)) {
                            Icon(Icons.Default.Home, contentDescription = null, modifier = Modifier.size(18.dp), tint = Color.Gray)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(profile?.location.orEmpty())
                        }
                        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(vertical = 4.dp)) {
                            Icon(Icons.Default.Work, contentDescription = null, modifier = Modifier.size(18.dp), tint = Color.Gray)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(profile?.category.orEmpty())
                        }
                    }
                }
            }
        }
    }
    if (showEditProfile) EditProfileDialog(repository, profile, onDismiss = { showEditProfile = false })
}

@Composable
private fun EditProfileDialog(repository: SocialRepository, profile: SocialProfile?, onDismiss: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var username by remember(profile) { mutableStateOf(profile?.username.orEmpty()) }
    var bio by remember(profile) { mutableStateOf(profile?.bio.orEmpty()) }
    var about by remember(profile) { mutableStateOf(profile?.about.orEmpty()) }
    var category by remember(profile) { mutableStateOf(profile?.category.orEmpty()) }
    var website by remember(profile) { mutableStateOf(profile?.website.orEmpty()) }
    var location by remember(profile) { mutableStateOf(profile?.location.orEmpty()) }
    var avatarUrl by remember(profile) { mutableStateOf(profile?.user?.avatar) }
    var coverUrl by remember(profile) { mutableStateOf(profile?.coverUrl) }
    var busy by remember { mutableStateOf(false) }
    val avatarPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        if (uri != null) scope.launch {
            busy = true
            runCatching { repository.uploadMedia(context.contentResolver, uri, "profile").url }
                .onSuccess { avatarUrl = it }
                .onFailure { Toast.makeText(context, it.message ?: "Photo upload failed", Toast.LENGTH_SHORT).show() }
            busy = false
        }
    }
    val coverPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        if (uri != null) scope.launch {
            busy = true
            runCatching { repository.uploadMedia(context.contentResolver, uri, "cover").url }
                .onSuccess { coverUrl = it }
                .onFailure { Toast.makeText(context, it.message ?: "Cover upload failed", Toast.LENGTH_SHORT).show() }
            busy = false
        }
    }

    AlertDialog(
        onDismissRequest = { if (!busy) onDismiss() },
        title = { Text("Edit Profile") },
        text = {
            LazyColumn(modifier = Modifier.heightIn(max = 480.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedButton(onClick = { avatarPicker.launch("image/*") }, modifier = Modifier.weight(1f)) { Text("Profile photo") }
                        OutlinedButton(onClick = { coverPicker.launch("image/*") }, modifier = Modifier.weight(1f)) { Text("Cover photo") }
                    }
                }
                item { OutlinedTextField(username, { username = it }, label = { Text("Username") }, singleLine = true) }
                item { OutlinedTextField(bio, { bio = it }, label = { Text("Bio") }) }
                item { OutlinedTextField(about, { about = it }, label = { Text("About") }) }
                item { OutlinedTextField(category, { category = it }, label = { Text("Category") }, singleLine = true) }
                item { OutlinedTextField(location, { location = it }, label = { Text("Location") }, singleLine = true) }
                item { OutlinedTextField(website, { website = it }, label = { Text("Website") }, singleLine = true) }
            }
        },
        confirmButton = {
            TextButton(enabled = !busy, onClick = {
                scope.launch {
                    busy = true
                    runCatching { repository.updateProfile(mapOf(
                        "username" to username, "bio" to bio, "about" to about, "category" to category,
                        "location" to location, "website" to website, "avatar" to avatarUrl, "coverUrl" to coverUrl
                    )) }.onSuccess { onDismiss() }
                        .onFailure { Toast.makeText(context, it.message ?: "Profile update failed", Toast.LENGTH_SHORT).show() }
                    busy = false
                }
            }) { Text(if (busy) "Saving…" else "Save") }
        },
        dismissButton = { TextButton(enabled = !busy, onClick = onDismiss) { Text("Cancel") } }
    )
}

@Composable
fun MessagesScreen(repository: SocialRepository, onBack: () -> Unit, onChatClick: (SocialConversation) -> Unit) {
    val chats by repository.conversations.collectAsState()
    var chatQuery by remember { mutableStateOf("") }
    var showNewMessage by remember { mutableStateOf(false) }
    val currentUserId = repository.currentUserId()
    val contacts = remember(chats, currentUserId) { chats.mapNotNull { it.members.firstOrNull { member -> member.userId != currentUserId } }.distinctBy { it.userId } }
    val visibleChats = remember(chats, chatQuery, currentUserId) {
        if (chatQuery.isBlank()) chats else chats.filter { chat ->
            chat.title?.contains(chatQuery, true) == true || chat.members.any { it.userId != currentUserId && it.user.name.contains(chatQuery, true) }
        }
    }
    LaunchedEffect(Unit) { runCatching { repository.refreshConversations() } }
    Column(modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, contentDescription = "Back") }
            Text("Chats", style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Bold))
            Spacer(modifier = Modifier.weight(1f))
            IconButton(onClick = { showNewMessage = true }) { Icon(Icons.Default.Edit, contentDescription = "New Message") }
        }

        // Stories in Messenger style
        LazyRow(
            contentPadding = PaddingValues(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(16.dp),
            modifier = Modifier.padding(bottom = 16.dp)
        ) {
            item {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Box(modifier = Modifier.size(60.dp).clip(CircleShape).background(MaterialTheme.colorScheme.surface), contentAlignment = Alignment.Center) {
                        Icon(Icons.Default.Add, contentDescription = null, tint = TiwiBlue)
                    }
                    Text("Your Story", style = MaterialTheme.typography.labelSmall)
                }
            }
            items(contacts, key = { it.userId }) { contact ->
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    TiwiAvatar(contact.user.avatar, R.drawable.img_tiwi_avatar_1, Modifier.size(60.dp).clip(CircleShape).background(TiwiBlue, CircleShape).padding(2.dp).clip(CircleShape))
                    Text(contact.user.name, style = MaterialTheme.typography.labelSmall)
                }
            }
        }

        // Search
        Surface(
            modifier = Modifier.padding(horizontal = 16.dp).fillMaxWidth().height(40.dp),
            color = MaterialTheme.colorScheme.surface,
            shape = RoundedCornerShape(20.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(horizontal = 12.dp)) {
                Icon(Icons.Default.Search, contentDescription = null, tint = Color.Gray, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(8.dp))
                BasicTextField(
                    value = chatQuery,
                    onValueChange = { chatQuery = it },
                    modifier = Modifier.weight(1f),
                    singleLine = true,
                    textStyle = MaterialTheme.typography.bodyMedium.copy(color = MaterialTheme.colorScheme.onSurface),
                    decorationBox = { inner -> if (chatQuery.isBlank()) Text("Search", color = Color.Gray); inner() }
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Chat List
        LazyColumn {
            items(visibleChats, key = { it.id }) { chat ->
                val contact = chat.members.firstOrNull { it.userId != currentUserId }
                val name = chat.title ?: contact?.user?.name.orEmpty()
                val lastMsg = chat.lastMessage?.body.orEmpty()
                ListItem(
                    modifier = Modifier.clickable { onChatClick(chat) },
                    leadingContent = { TiwiAvatar(contact?.user?.avatar ?: chat.avatarUrl, R.drawable.img_tiwi_avatar_1, Modifier.size(56.dp).clip(CircleShape)) },
                    headlineContent = { Text(name, fontWeight = FontWeight.Bold) },
                    supportingContent = { Text(lastMsg, maxLines = 1, overflow = TextOverflow.Ellipsis) },
                    trailingContent = { if (chat.unreadCount > 0) Badge { Text(chat.unreadCount.toString()) } else Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Color.Gray, modifier = Modifier.size(14.dp)) },
                    colors = ListItemDefaults.colors(containerColor = Color.Transparent)
                )
            }
        }
    }
    if (showNewMessage) NewMessageDialog(repository, onDismiss = { showNewMessage = false }) { conversation ->
        showNewMessage = false
        onChatClick(conversation)
    }
}

@Composable
private fun NewMessageDialog(repository: SocialRepository, onDismiss: () -> Unit, onCreated: (SocialConversation) -> Unit) {
    var query by remember { mutableStateOf("") }
    var profiles by remember { mutableStateOf<List<SocialProfile>>(emptyList()) }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    LaunchedEffect(query) {
        delay(250)
        profiles = runCatching { repository.searchProfiles(query) }.getOrDefault(emptyList())
    }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("New Message") },
        text = {
            Column {
                OutlinedTextField(query, { query = it }, label = { Text("Search people") }, singleLine = true)
                Spacer(Modifier.height(8.dp))
                LazyColumn(modifier = Modifier.heightIn(max = 340.dp)) {
                    items(profiles, key = { it.userId }) { profile ->
                        ListItem(
                            modifier = Modifier.clickable {
                                scope.launch {
                                    runCatching { repository.createConversation(profile.userId) }
                                        .onSuccess(onCreated)
                                        .onFailure { Toast.makeText(context, it.message ?: "Chat failed", Toast.LENGTH_SHORT).show() }
                                }
                            },
                            leadingContent = { TiwiAvatar(profile.user.avatar, R.drawable.img_tiwi_avatar_1, Modifier.size(42.dp).clip(CircleShape)) },
                            headlineContent = { Text(profile.user.name) },
                            supportingContent = { Text("@${profile.username}") },
                            colors = ListItemDefaults.colors(containerColor = Color.Transparent)
                        )
                    }
                }
            }
        },
        confirmButton = {},
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } }
    )
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun ChatDetailScreen(
    repository: SocialRepository,
    conversation: SocialConversation,
    onBack: () -> Unit,
    isRandom: Boolean = false,
    onProfileClick: (String) -> Unit = {},
    onCall: (Boolean) -> Unit = {}
) {
    var messageText by remember { mutableStateOf("") }
    var messageToUnsend by remember { mutableStateOf<SocialMessage?>(null) }
    val messagesByConversation by repository.messages.collectAsState()
    val contact = conversation.members.firstOrNull { it.userId != repository.currentUserId() }
    val name = conversation.title ?: contact?.user?.name.orEmpty()
    val messages = messagesByConversation[conversation.id] ?: repository.cachedMessages(conversation.id)
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val sendAttachment: (android.net.Uri) -> Unit = { uri ->
        scope.launch {
            runCatching {
                val media = repository.uploadMedia(context.contentResolver, uri, "chat")
                repository.sendMessage(conversation.id, "", listOf(media))
            }.onFailure { Toast.makeText(context, it.message ?: "Attachment failed", Toast.LENGTH_SHORT).show() }
        }
    }
    val filePicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri -> uri?.let(sendAttachment) }
    val mediaPicker = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri -> uri?.let(sendAttachment) }

    LaunchedEffect(conversation.id) {
        runCatching { repository.markConversationRead(conversation.id) }
        while (true) {
            runCatching { repository.refreshMessages(conversation.id) }
            delay(3000)
        }
    }
    
    Column(modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        // Chat Header
        Surface(tonalElevation = 0.dp) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .statusBarsPadding()
                    .padding(horizontal = 8.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, contentDescription = "Back") }
                TiwiAvatar(contact?.user?.avatar, R.drawable.img_tiwi_avatar_1, Modifier.size(36.dp).clip(CircleShape).clickable { contact?.userId?.let(onProfileClick) })
                Spacer(modifier = Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(name, fontWeight = FontWeight.Bold)
                    Text("Active now", style = MaterialTheme.typography.labelSmall, color = TiwiBlue)
                }
                IconButton(onClick = { onCall(false) }) { Icon(Icons.Default.Call, contentDescription = "Call", tint = TiwiBlue) }
                IconButton(onClick = { onCall(true) }) { Icon(Icons.Default.VideoCall, contentDescription = "Video Call", tint = TiwiBlue) }
                IconButton(onClick = { contact?.userId?.let(onProfileClick) }) { Icon(Icons.Default.Info, contentDescription = "Info", tint = TiwiBlue) }
            }
        }

        // Messages Area
        LazyColumn(
            modifier = Modifier.weight(1f).padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
            contentPadding = PaddingValues(top = 16.dp, bottom = 16.dp),
            reverseLayout = false
        ) {
            item {
                if (isRandom) {
                    Column(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 40.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Box(contentAlignment = Alignment.BottomEnd) {
                            TiwiAvatar(contact?.user?.avatar, R.drawable.img_tiwi_avatar_1, Modifier.size(100.dp).clip(CircleShape).border(3.dp, Color.White, CircleShape))
                            Surface(
                                modifier = Modifier.size(24.dp).offset(x = 4.dp, y = 4.dp),
                                shape = CircleShape,
                                color = Color(0xFF4CAF50),
                                border = BorderStroke(2.dp, Color.White)
                            ) {}
                        }
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(name, style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold))
                        Text("You're connected on Tiwi", style = MaterialTheme.typography.bodySmall, color = Color.Gray)
                        Spacer(modifier = Modifier.height(16.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Button(
                                onClick = { contact?.userId?.let { scope.launch { runCatching { repository.follow(it, true) } } } },
                                modifier = Modifier.height(32.dp),
                                contentPadding = PaddingValues(horizontal = 16.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = TiwiBlue),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Text("Follow", style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold))
                            }
                            OutlinedButton(
                                onClick = { contact?.userId?.let(onProfileClick) },
                                modifier = Modifier.height(32.dp),
                                contentPadding = PaddingValues(horizontal = 16.dp),
                                shape = RoundedCornerShape(8.dp),
                                border = BorderStroke(1.dp, Color.LightGray)
                            ) {
                                Text("View Profile", style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold), color = Color.Black)
                            }
                        }
                        Spacer(modifier = Modifier.height(24.dp))
                        Surface(
                            color = Color.LightGray.copy(alpha = 0.1f),
                            shape = RoundedCornerShape(20.dp)
                        ) {
                            Text(
                                "SAY HI TO YOUR NEW FRIEND!",
                                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                                style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold, letterSpacing = 1.sp),
                                color = Color.Gray
                            )
                        }
                    }
                }
            }
            
            items(messages, key = { it.id }) { message ->
                val msg = if (message.unsentAt != null) "Message unsent" else message.body
                val isMe = message.senderId == repository.currentUserId()
                Box(modifier = Modifier.fillMaxWidth(), contentAlignment = if (isMe) Alignment.CenterEnd else Alignment.CenterStart) {
                    Surface(
                        color = if (isMe) TiwiBlue else Color(0xFFF0F0F0),
                        shape = RoundedCornerShape(18.dp),
                        modifier = Modifier.widthIn(max = 280.dp).combinedClickable(
                            onClick = {},
                            onLongClick = { if (isMe && message.unsentAt == null && !message.id.startsWith("local-")) messageToUnsend = message }
                        )
                    ) {
                        Column {
                            message.media.forEach { media ->
                                when (media.type) {
                                    "video" -> TiwiVideo(media.hlsUrl ?: media.url, Modifier.fillMaxWidth().height(180.dp))
                                    "image" -> AsyncImage(model = media.url, contentDescription = "Attachment", modifier = Modifier.fillMaxWidth().heightIn(max = 220.dp), contentScale = ContentScale.Crop)
                                    else -> Text("Attachment", modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp), color = if (isMe) Color.White else Color.Black)
                                }
                            }
                            if (msg.isNotBlank()) Text(
                                text = msg,
                                modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp),
                                color = if (isMe) Color.White else Color.Black,
                                style = MaterialTheme.typography.bodyMedium
                            )
                        }
                    }
                }
            }
        }

        // Input Area
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = { filePicker.launch("*/*") }) { Icon(Icons.Default.AddCircle, contentDescription = "More", tint = TiwiBlue) }
            IconButton(onClick = { mediaPicker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) }) { Icon(Icons.Default.CameraAlt, contentDescription = "Camera", tint = TiwiBlue) }
            IconButton(onClick = { mediaPicker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageAndVideo)) }) { Icon(Icons.Default.Image, contentDescription = "Gallery", tint = TiwiBlue) }
            
            Surface(
                modifier = Modifier.weight(1f).height(40.dp),
                color = MaterialTheme.colorScheme.surface,
                shape = RoundedCornerShape(20.dp)
            ) {
                TextField(
                    value = messageText,
                    onValueChange = { messageText = it },
                    placeholder = { Text("Aa", color = Color.Gray) },
                    modifier = Modifier.fillMaxSize(),
                    colors = TextFieldDefaults.colors(
                        focusedContainerColor = Color.Transparent,
                        unfocusedContainerColor = Color.Transparent,
                        focusedIndicatorColor = Color.Transparent,
                        unfocusedIndicatorColor = Color.Transparent
                    )
                )
            }
            
            IconButton(onClick = {
                if (messageText.isBlank()) return@IconButton
                val sending = messageText
                messageText = ""
                scope.launch {
                    runCatching { repository.sendMessage(conversation.id, sending) }
                        .onFailure { Toast.makeText(context, it.message ?: "Message failed", Toast.LENGTH_SHORT).show() }
                }
            }) {
                Icon(
                    if (messageText.isEmpty()) Icons.Default.ThumbUp else Icons.Default.Send,
                    contentDescription = "Send",
                    tint = TiwiBlue
                )
            }
        }
    }

    messageToUnsend?.let { target ->
        AlertDialog(
            onDismissRequest = { messageToUnsend = null },
            title = { Text("Unsend message?") },
            text = { Text("This message will be removed for everyone.") },
            confirmButton = {
                TextButton(onClick = {
                    messageToUnsend = null
                    scope.launch {
                        runCatching { repository.unsendMessage(target.id) }
                            .onFailure { Toast.makeText(context, it.message ?: "Unsend failed", Toast.LENGTH_SHORT).show() }
                    }
                }) { Text("Unsend", color = Color.Red) }
            },
            dismissButton = { TextButton(onClick = { messageToUnsend = null }) { Text("Cancel") } }
        )
    }
}

@Composable
fun ProfileStatItem(label: String, value: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(text = value, style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.ExtraBold))
        Text(text = label, style = MaterialTheme.typography.labelSmall, color = Color.Gray)
    }
}

@Composable
fun FeaturedContentSection(posts: List<Post>) {
    Column(modifier = Modifier.padding(vertical = 8.dp)) {
        Text(
            "Featured Moments", 
            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
        )
        LazyRow(
            contentPadding = PaddingValues(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(posts.filter { !it.imageUrl.isNullOrBlank() || !it.videoUrl.isNullOrBlank() }.take(4), key = { it.id }) { post ->
                Card(
                    modifier = Modifier.size(width = 140.dp, height = 200.dp),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Box {
                        if (!post.imageUrl.isNullOrBlank()) AsyncImage(model = post.imageUrl, contentDescription = null, modifier = Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                        else if (!post.videoUrl.isNullOrBlank()) TiwiVideo(post.videoUrl, Modifier.fillMaxSize())
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .background(Brush.verticalGradient(listOf(Color.Transparent, Color.Black.copy(alpha = 0.7f))))
                        )
                        Text(
                            text = post.content.take(40),
                            modifier = Modifier.align(Alignment.BottomStart).padding(12.dp),
                            color = Color.White,
                            style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold)
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun ForgotPasswordFlow(repository: SocialRepository, onBack: () -> Unit, onComplete: () -> Unit) {
    var step by remember { mutableIntStateOf(0) }
    var email by remember { mutableStateOf("") }
    var otp by remember { mutableStateOf("") }
    var newPassword by remember { mutableStateOf("") }
    var challenge by remember { mutableStateOf<PasswordResetChallenge?>(null) }
    var resetToken by remember { mutableStateOf("") }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current

    when (step) {
        0 -> IdentifyAccountScreen(
            onBack = onBack,
            onNext = { e ->
                scope.launch {
                    runCatching { repository.startPasswordReset(e) }
                        .onSuccess { challenge = it; email = it.destination.ifBlank { e }; step = 1 }
                        .onFailure { Toast.makeText(context, it.message ?: "Unable to send code", Toast.LENGTH_LONG).show() }
                }
            }
        )
        1 -> OTPVerificationScreen(
            email = email,
            onBack = { step = 0 },
            onNext = { code ->
                scope.launch {
                    val id = challenge?.challengeId ?: return@launch
                    runCatching { repository.verifyPasswordReset(id, code) }
                        .onSuccess { token -> otp = code; resetToken = token; step = 2 }
                        .onFailure { Toast.makeText(context, it.message ?: "Invalid code", Toast.LENGTH_LONG).show() }
                }
            },
            onResend = {
                scope.launch {
                    challenge?.challengeId?.let { id -> runCatching { repository.resendPasswordReset(id) }.onSuccess { challenge = it } }
                }
            }
        )
        2 -> ResetPasswordScreen(
            onBack = { step = 1 },
            onComplete = { password ->
                scope.launch {
                    runCatching { repository.resetPassword(resetToken, password) }
                        .onSuccess { onComplete() }
                        .onFailure { Toast.makeText(context, it.message ?: "Password reset failed", Toast.LENGTH_LONG).show() }
                }
            }
        )
    }
}

@Composable
fun IdentifyAccountScreen(onBack: () -> Unit, onNext: (String) -> Unit) {
    var email by remember { mutableStateOf("") }
    
    Column(
        modifier = Modifier.fillMaxSize().background(Color.White).padding(24.dp).statusBarsPadding(),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Box(modifier = Modifier.fillMaxWidth()) {
            IconButton(onClick = onBack, modifier = Modifier.align(Alignment.CenterStart)) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
            }
        }
        
        Spacer(modifier = Modifier.height(40.dp))
        
        Icon(
            imageVector = Icons.Outlined.Lock,
            contentDescription = null,
            modifier = Modifier.size(80.dp).border(2.dp, Color.Black, CircleShape).padding(16.dp)
        )
        
        Spacer(modifier = Modifier.height(24.dp))
        
        Text("Trouble logging in?", style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Bold))
        
        Text(
            "Enter your username or email and we'll send you a code to get back into your account.",
            textAlign = TextAlign.Center,
            color = Color.Gray,
            modifier = Modifier.padding(vertical = 16.dp, horizontal = 12.dp),
            style = MaterialTheme.typography.bodyMedium
        )
        
        AuthTextField(value = email, onValueChange = { email = it }, placeholder = "Username or Email")
        
        Spacer(modifier = Modifier.height(24.dp))
        
        Button(
            onClick = { if (email.isNotEmpty()) onNext(email) },
            modifier = Modifier.fillMaxWidth().height(44.dp),
            colors = ButtonDefaults.buttonColors(containerColor = InstaBlue),
            shape = RoundedCornerShape(8.dp),
            enabled = email.isNotEmpty()
        ) {
            Text("Send Login Code", color = Color.White, fontWeight = FontWeight.Bold)
        }
        
        Spacer(modifier = Modifier.height(24.dp))
        
        Row(verticalAlignment = Alignment.CenterVertically) {
            HorizontalDivider(modifier = Modifier.weight(1f), color = Color.LightGray.copy(alpha = 0.5f))
            Text(" OR ", style = MaterialTheme.typography.labelSmall, color = Color.Gray, modifier = Modifier.padding(horizontal = 16.dp))
            HorizontalDivider(modifier = Modifier.weight(1f), color = Color.LightGray.copy(alpha = 0.5f))
        }
        
        Spacer(modifier = Modifier.height(24.dp))
        
        Text(
            "Can't reset your password?",
            color = InstaBlue,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.clickable { }
        )
        
        Spacer(modifier = Modifier.weight(1f))
        
        HorizontalDivider(color = Color.LightGray.copy(alpha = 0.3f))
        
        TextButton(onClick = onBack, modifier = Modifier.padding(vertical = 8.dp)) {
            Text("Back to Login", color = Color.Black, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
fun OTPVerificationScreen(email: String, onBack: () -> Unit, onNext: (String) -> Unit, onResend: () -> Unit) {
    var otp by remember { mutableStateOf("") }
    var timer by remember { mutableIntStateOf(60) }
    
    LaunchedEffect(Unit) {
        while (timer > 0) {
            kotlinx.coroutines.delay(1000)
            timer--
        }
    }
    
    Column(
        modifier = Modifier.fillMaxSize().background(Color.White).padding(24.dp).statusBarsPadding(),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Box(modifier = Modifier.fillMaxWidth()) {
            IconButton(onClick = onBack, modifier = Modifier.align(Alignment.CenterStart)) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
            }
        }
        
        Spacer(modifier = Modifier.height(40.dp))
        
        Text("Enter Login Code", style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Bold))
        
        Text(
            "Enter the 6-digit code we sent to\n$email",
            textAlign = TextAlign.Center,
            color = Color.Gray,
            modifier = Modifier.padding(vertical = 16.dp),
            style = MaterialTheme.typography.bodyMedium
        )
        
        AuthTextField(value = otp, onValueChange = { if (it.length <= 6) otp = it }, placeholder = "6-digit code")
        
        Spacer(modifier = Modifier.height(24.dp))
        
        Button(
            onClick = { if (otp.length == 6) onNext(otp) },
            modifier = Modifier.fillMaxWidth().height(44.dp),
            colors = ButtonDefaults.buttonColors(containerColor = InstaBlue),
            shape = RoundedCornerShape(8.dp),
            enabled = otp.length == 6
        ) {
            Text("Verify", color = Color.White, fontWeight = FontWeight.Bold)
        }
        
        Spacer(modifier = Modifier.height(24.dp))
        
        if (timer > 0) {
            Text("Resend code in ${timer}s", color = Color.Gray, style = MaterialTheme.typography.labelMedium)
        } else {
            Text(
                "Resend code",
                color = InstaBlue,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.clickable { timer = 60; onResend() }
            )
        }
    }
}

@Composable
fun ResetPasswordScreen(onBack: () -> Unit, onComplete: (String) -> Unit) {
    var password by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    
    Column(
        modifier = Modifier.fillMaxSize().background(Color.White).padding(24.dp).statusBarsPadding(),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Box(modifier = Modifier.fillMaxWidth()) {
            IconButton(onClick = onBack, modifier = Modifier.align(Alignment.CenterStart)) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
            }
        }
        
        Spacer(modifier = Modifier.height(40.dp))
        
        Text("Create New Password", style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Bold))
        
        Text(
            "Your new password must be different from previous passwords.",
            textAlign = TextAlign.Center,
            color = Color.Gray,
            modifier = Modifier.padding(vertical = 16.dp),
            style = MaterialTheme.typography.bodyMedium
        )
        
        AuthTextField(value = password, onValueChange = { password = it }, placeholder = "New Password", isPassword = true)
        Spacer(modifier = Modifier.height(12.dp))
        AuthTextField(value = confirmPassword, onValueChange = { confirmPassword = it }, placeholder = "Confirm New Password", isPassword = true)
        
        Spacer(modifier = Modifier.height(32.dp))
        
        Button(
            onClick = { if (password.isNotEmpty() && password == confirmPassword) onComplete(password) },
            modifier = Modifier.fillMaxWidth().height(44.dp),
            colors = ButtonDefaults.buttonColors(containerColor = InstaBlue),
            shape = RoundedCornerShape(8.dp),
            enabled = password.isNotEmpty() && password == confirmPassword
        ) {
            Text("Reset Password", color = Color.White, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
fun CenteredText(text: String) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Text(text, style = MaterialTheme.typography.titleLarge)
    }
}

@Composable
fun RandomConnectScreen(repository: SocialRepository, onBack: () -> Unit, onChatClick: (SocialProfile) -> Unit) {
    var isSearching by remember { mutableStateOf(true) }
    var matchedUser by remember { mutableStateOf<SocialProfile?>(null) }
    val currentUser by repository.currentUser.collectAsState()
    
    val infiniteTransition = rememberInfiniteTransition()
    
    // Pulse animation for ripple effect
    val rippleScale by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = 2f,
        animationSpec = infiniteRepeatable(
            animation = tween(2000, easing = LinearOutSlowInEasing),
            repeatMode = RepeatMode.Restart
        )
    )
    val rippleAlpha by infiniteTransition.animateFloat(
        initialValue = 0.5f,
        targetValue = 0f,
        animationSpec = infiniteRepeatable(
            animation = tween(2000, easing = LinearOutSlowInEasing),
            repeatMode = RepeatMode.Restart
        )
    )

    // Rotating border animation
    val rotation by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(
            animation = tween(3000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        )
    )

    LaunchedEffect(isSearching) {
        if (isSearching) {
            delay(800)
            matchedUser = runCatching { repository.searchProfiles() }.getOrDefault(emptyList())
                .filterNot { it.userId == repository.currentUserId() }
                .randomOrNull()
            isSearching = false
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White)
            .statusBarsPadding()
            .navigationBarsPadding()
    ) {
        Column(
            modifier = Modifier.fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Header
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 8.dp, vertical = 12.dp)
            ) {
                IconButton(onClick = onBack, modifier = Modifier.align(Alignment.CenterStart)) {
                    Icon(Icons.Default.Close, contentDescription = null, tint = Color.Black)
                }
                Text(
                    "Discover Friends", 
                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.ExtraBold),
                    color = Color.Black,
                    modifier = Modifier.align(Alignment.Center)
                )
            }

            Spacer(modifier = Modifier.weight(0.8f))

            if (isSearching) {
                // Searching UI
                Box(contentAlignment = Alignment.Center, modifier = Modifier.size(280.dp)) {
                    // Ripple effects
                    repeat(3) { index ->
                        val delay = index * 600
                        val scale by infiniteTransition.animateFloat(
                            initialValue = 1f,
                            targetValue = 2.5f,
                            animationSpec = infiniteRepeatable(
                                animation = tween(2000, delayMillis = delay, easing = LinearOutSlowInEasing),
                                repeatMode = RepeatMode.Restart
                            )
                        )
                        val alpha by infiniteTransition.animateFloat(
                            initialValue = 0.3f,
                            targetValue = 0f,
                            animationSpec = infiniteRepeatable(
                                animation = tween(2000, delayMillis = delay, easing = LinearOutSlowInEasing),
                                repeatMode = RepeatMode.Restart
                            )
                        )
                        Box(
                            modifier = Modifier
                                .size(100.dp)
                                .graphicsLayer(scaleX = scale, scaleY = scale)
                                .background(FriendBlue.copy(alpha = alpha), CircleShape)
                        )
                    }

                    // Rotating gradient border
                    Canvas(modifier = Modifier.size(120.dp)) {
                        drawCircle(
                            brush = Brush.sweepGradient(listOf(FriendPurple, FriendBlue, FriendOrange, FriendPurple)),
                            style = Stroke(width = 4.dp.toPx(), cap = StrokeCap.Round),
                            alpha = 0.8f
                        )
                    }

                    // Central Avatar
                    Surface(
                        modifier = Modifier.size(100.dp),
                        shape = CircleShape,
                        color = Color.White,
                        tonalElevation = 4.dp
                    ) {
                        TiwiAvatar(currentUser?.avatar, R.drawable.img_tiwi_avatar_1, Modifier.fillMaxSize().padding(4.dp).clip(CircleShape), ContentScale.Crop)
                    }
                }
                
                Spacer(modifier = Modifier.height(48.dp))
                Text(
                    "Searching for new connections...", 
                    style = MaterialTheme.typography.bodyLarge.copy(fontWeight = FontWeight.Medium),
                    color = Color.Gray
                )
                Text(
                    "This won't take long", 
                    style = MaterialTheme.typography.labelSmall,
                    color = Color.LightGray
                )
            } else {
                // Match Found UI
                val scale by animateFloatAsState(
                    targetValue = 1f, 
                    animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy)
                )
                
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.graphicsLayer(scaleX = scale, scaleY = scale).padding(horizontal = 40.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        // Background Glow
                        Box(
                            modifier = Modifier
                                .size(180.dp)
                                .background(
                                    Brush.radialGradient(listOf(FriendPurple.copy(alpha = 0.15f), Color.Transparent)),
                                    CircleShape
                                )
                        )
                        
                        // Avatar Frame
                        Surface(
                            modifier = Modifier.size(140.dp),
                            shape = CircleShape,
                            color = Color.White,
                            border = BorderStroke(4.dp, Brush.linearGradient(listOf(FriendPurple, FriendOrange))),
                            shadowElevation = 12.dp
                        ) {
                            TiwiAvatar(matchedUser?.user?.avatar, R.drawable.img_tiwi_avatar_1, Modifier.fillMaxSize().padding(4.dp).clip(CircleShape), ContentScale.Crop)
                        }
                        
                        // Verification Badge
                        Surface(
                            modifier = Modifier.size(32.dp).align(Alignment.BottomEnd).offset(x = (-8).dp, y = (-8).dp),
                            shape = CircleShape,
                            color = FriendBlue,
                            border = BorderStroke(2.dp, Color.White)
                        ) {
                            Icon(Icons.Default.Check, null, tint = Color.White, modifier = Modifier.padding(6.dp))
                        }
                    }
                    
                    Spacer(modifier = Modifier.height(32.dp))
                    
                    Text(
                        matchedUser?.user?.name.orEmpty(),
                        style = MaterialTheme.typography.headlineMedium.copy(fontWeight = FontWeight.ExtraBold),
                        color = Color.Black
                    )
                    Text(
                        "is ready to connect with you", 
                        style = MaterialTheme.typography.bodyLarge,
                        color = Color.Gray,
                        textAlign = TextAlign.Center
                    )
                }
            }

            Spacer(modifier = Modifier.weight(1.2f))

            if (!isSearching) {
                Column(
                    modifier = Modifier.padding(24.dp).fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Button(
                        onClick = { matchedUser?.let(onChatClick) },
                        modifier = Modifier.fillMaxWidth().height(52.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = FriendBlue),
                        shape = RoundedCornerShape(12.dp),
                        elevation = ButtonDefaults.buttonElevation(defaultElevation = 0.dp)
                    ) {
                        Text("Send Message", color = Color.White, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
                    }
                    
                    Spacer(modifier = Modifier.height(12.dp))
                    
                    TextButton(
                        onClick = { isSearching = true; matchedUser = null },
                        modifier = Modifier.fillMaxWidth().height(52.dp)
                    ) {
                        Text("Find Someone Else", color = Color.Gray, fontWeight = FontWeight.Bold)
                    }
                }
            } else {
                Spacer(modifier = Modifier.height(140.dp))
            }
        }
    }
}

@Composable
fun UserPin(name: String, isMatched: Boolean = false) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Box(contentAlignment = Alignment.TopEnd) {
            // Pin Shape (Circle with border and shadow)
            Surface(
                modifier = Modifier.size(80.dp),
                shape = CircleShape,
                color = Color.White,
                border = BorderStroke(3.dp, Color.White),
                shadowElevation = 6.dp
            ) {
                Image(
                    painter = painterResource(R.drawable.img_tiwi_avatar_1),
                    contentDescription = null,
                    modifier = Modifier.fillMaxSize().clip(CircleShape),
                    contentScale = ContentScale.Crop
                )
            }
            
            if (isMatched) {
                Surface(
                    modifier = Modifier.size(24.dp).offset(x = 4.dp, y = 4.dp),
                    shape = CircleShape,
                    color = FriendOrange,
                    border = BorderStroke(2.dp, Color.White)
                ) {
                    Icon(Icons.Default.Check, null, tint = Color.White, modifier = Modifier.padding(4.dp))
                }
            }
            
            // The small dot at the bottom of the "pin"
            Box(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .offset(y = 10.dp)
                    .size(12.dp)
                    .background(Color.White, CircleShape)
                    .border(2.dp, FriendBlue, CircleShape)
            )
        }
        Spacer(modifier = Modifier.height(16.dp))
        Text(name, color = Color.White, style = MaterialTheme.typography.labelMedium)
    }
}

@Composable
fun OnboardingProfilePic(onNext: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize().background(Color.White).padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(modifier = Modifier.height(60.dp))
        Box(
            modifier = Modifier
                .size(120.dp)
                .border(2.dp, Color.LightGray.copy(alpha = 0.5f), CircleShape)
                .padding(4.dp),
            contentAlignment = Alignment.Center
        ) {
            Icon(Icons.Default.Person, contentDescription = null, modifier = Modifier.size(80.dp), tint = Color.LightGray)
        }
        Spacer(modifier = Modifier.height(32.dp))
        Text("Add Profile Photo", style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Bold))
        Text(
            "Add a profile photo so your friends know it's you.",
            textAlign = TextAlign.Center,
            color = Color.Gray,
            modifier = Modifier.padding(vertical = 16.dp)
        )
        Spacer(modifier = Modifier.height(32.dp))
        Button(
            onClick = onNext,
            modifier = Modifier.fillMaxWidth().height(44.dp),
            colors = ButtonDefaults.buttonColors(containerColor = InstaBlue),
            shape = RoundedCornerShape(8.dp)
        ) {
            Text("Add a Photo", color = Color.White, fontWeight = FontWeight.Bold)
        }
        TextButton(onClick = onNext) {
            Text("Skip", color = InstaBlue, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
fun OnboardingBio(onNext: (String, String) -> Unit) {
    var name by remember { mutableStateOf("") }
    var bio by remember { mutableStateOf("") }

    Column(
        modifier = Modifier.fillMaxSize().background(Color.White).padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(modifier = Modifier.height(40.dp))
        Text("Add Your Name & Bio", style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Bold))
        Spacer(modifier = Modifier.height(32.dp))
        AuthTextField(value = name, onValueChange = { name = it }, placeholder = "Full Name")
        Spacer(modifier = Modifier.height(12.dp))
        AuthTextField(value = bio, onValueChange = { bio = it }, placeholder = "Bio (What do you do?)")
        Spacer(modifier = Modifier.height(32.dp))
        Button(
            onClick = { onNext(name, bio) },
            modifier = Modifier.fillMaxWidth().height(44.dp),
            colors = ButtonDefaults.buttonColors(containerColor = InstaBlue),
            shape = RoundedCornerShape(8.dp)
        ) {
            Text("Next", color = Color.White, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
fun OnboardingCategory(onNext: (String) -> Unit) {
    val categories = listOf("Creator", "Artist", "Gamer", "Tech", "Traveler", "Foodie", "Musician")
    var selectedCat by remember { mutableStateOf("") }

    Column(
        modifier = Modifier.fillMaxSize().background(Color.White).padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(modifier = Modifier.height(40.dp))
        Text("Choose a Category", style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Bold))
        Text("This will help people discover your profile.", color = Color.Gray, modifier = Modifier.padding(top = 8.dp))
        Spacer(modifier = Modifier.height(32.dp))
        
        categories.forEach { cat ->
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 4.dp)
                    .clickable { selectedCat = cat },
                shape = RoundedCornerShape(8.dp),
                color = if (selectedCat == cat) InstaBlue.copy(alpha = 0.1f) else Color.Transparent,
                border = BorderStroke(1.dp, if (selectedCat == cat) InstaBlue else Color.LightGray.copy(alpha = 0.5f))
            ) {
                Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text(cat, modifier = Modifier.weight(1f), fontWeight = if (selectedCat == cat) FontWeight.Bold else FontWeight.Normal)
                    if (selectedCat == cat) Icon(Icons.Default.Check, null, tint = InstaBlue)
                }
            }
        }

        Spacer(modifier = Modifier.weight(1f))
        Button(
            onClick = { if (selectedCat.isNotEmpty()) onNext(selectedCat) },
            enabled = selectedCat.isNotEmpty(),
            modifier = Modifier.fillMaxWidth().height(44.dp),
            colors = ButtonDefaults.buttonColors(containerColor = InstaBlue),
            shape = RoundedCornerShape(8.dp)
        ) {
            Text("Next", color = Color.White, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
fun OnboardingFollow(repository: SocialRepository, onFinished: () -> Unit) {
    var profiles by remember { mutableStateOf<List<SocialProfile>>(emptyList()) }
    val scope = rememberCoroutineScope()
    LaunchedEffect(Unit) { profiles = runCatching { repository.searchProfiles() }.getOrDefault(emptyList()).filterNot { it.userId == repository.currentUserId() } }
    Column(
        modifier = Modifier.fillMaxSize().background(Color.White).padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(modifier = Modifier.height(40.dp))
        Text("Suggested for You", style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Bold))
        Spacer(modifier = Modifier.height(16.dp))
        
        LazyColumn(modifier = Modifier.weight(1f)) {
            items(profiles, key = { it.userId }) { profile ->
                ListItem(
                    leadingContent = { TiwiAvatar(profile.user.avatar, R.drawable.img_tiwi_avatar_1, Modifier.size(48.dp).clip(CircleShape)) },
                    headlineContent = { Text(profile.user.name, fontWeight = FontWeight.Bold) },
                    supportingContent = { Text("Suggested for you") },
                    trailingContent = {
                        Button(
                            onClick = { scope.launch { runCatching { repository.follow(profile.userId, !profile.isFollowing) }.onSuccess { next -> profiles = profiles.map { if (it.userId == next.userId) next else it } } } },
                            colors = ButtonDefaults.buttonColors(containerColor = InstaBlue),
                            shape = RoundedCornerShape(8.dp),
                            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 0.dp),
                            modifier = Modifier.height(32.dp)
                        ) {
                            Text(if (profile.isFollowing) "Following" else "Follow", style = MaterialTheme.typography.labelSmall)
                        }
                    },
                    colors = ListItemDefaults.colors(containerColor = Color.Transparent)
                )
            }
        }
        
        Button(
            onClick = onFinished,
            modifier = Modifier.fillMaxWidth().height(44.dp),
            colors = ButtonDefaults.buttonColors(containerColor = InstaBlue),
            shape = RoundedCornerShape(8.dp)
        ) {
            Text("Done", color = Color.White, fontWeight = FontWeight.Bold)
        }
    }
}
