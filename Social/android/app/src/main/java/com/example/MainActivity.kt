package com.example

import android.Manifest
import android.app.Activity
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.pm.PackageManager
import android.media.RingtoneManager
import android.os.Build
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
import androidx.compose.foundation.pager.VerticalPager
import androidx.compose.foundation.pager.rememberPagerState
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
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.layout.boundsInWindow
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.foundation.Canvas
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.animation.core.*
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
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
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.view.WindowCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.example.ui.theme.TiwiTheme
import com.example.ui.theme.TiwiBlue
import com.example.ui.theme.TiwiPurple
import com.example.ui.theme.TiwiPink
import androidx.media3.common.MediaItem
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import com.example.social.SocialConversation
import com.example.social.SocialCallSession
import com.example.social.SocialComment
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
                if (busy) CircularProgressIndicator(Modifier.size(19.dp), color = Color.White, strokeWidth = 2.dp)
                else Text(if (isLogin) "Log In" else "Next", fontWeight = FontWeight.Bold, color = Color.White)
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
    val media: List<SocialMedia> = emptyList(),
    val time: String,
    val likes: Int,
    val comments: Int,
    val shares: Int,
    val views: Int = 0,
    val liked: Boolean = false,
    val verified: Boolean = false,
    val following: Boolean = false,
    val visibility: String = "public"
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
    val comments: Int = 0,
    val following: Boolean = false,
    val verified: Boolean = false
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
        media = value.media,
        time = value.publishedAt?.replace('T', ' ')?.take(16) ?: "Now",
        likes = value.reactionCount,
        comments = value.commentCount,
        shares = value.shareCount,
        views = value.viewCount,
        liked = value.viewerReaction == "like",
        verified = value.authorProfile?.verified == true,
        following = value.authorProfile?.isFollowing == true,
        visibility = value.visibility
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
        comments = value.commentCount,
        following = value.authorProfile?.isFollowing == true,
        verified = value.authorProfile?.verified == true
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
    val lifecycleOwner = LocalLifecycleOwner.current
    var visibleEnough by remember(url) { mutableStateOf(true) }
    val player = remember(url) {
        ExoPlayer.Builder(context).build().apply {
            setMediaItem(MediaItem.fromUri(url))
            prepare()
            repeatMode = if (autoplay) ExoPlayer.REPEAT_MODE_ONE else ExoPlayer.REPEAT_MODE_OFF
        }
    }
    LaunchedEffect(player, autoplay, visibleEnough) {
        player.repeatMode = if (autoplay) ExoPlayer.REPEAT_MODE_ONE else ExoPlayer.REPEAT_MODE_OFF
        if (autoplay && visibleEnough) player.play() else player.pause()
    }
    DisposableEffect(player, lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            when (event) {
                Lifecycle.Event.ON_PAUSE, Lifecycle.Event.ON_STOP -> player.pause()
                Lifecycle.Event.ON_RESUME -> if (autoplay && visibleEnough) player.play()
                else -> Unit
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
            player.release()
        }
    }
    AndroidView(
        factory = {
            PlayerView(it).apply {
                this.player = player
                useController = true
                controllerShowTimeoutMs = 1500
            }
        },
        update = { it.player = player },
        modifier = modifier
            .background(Color.Black)
            .onGloballyPositioned { coordinates ->
                val bounds = coordinates.boundsInWindow()
                val screenHeight = context.resources.displayMetrics.heightPixels.toFloat()
                val visibleHeight = (minOf(bounds.bottom, screenHeight) - maxOf(bounds.top, 0f)).coerceAtLeast(0f)
                visibleEnough = bounds.height > 0f && visibleHeight / bounds.height >= .6f
            }
    )
}

private const val POST_UPLOAD_CHANNEL = "tiwi_post_uploads"
private const val POST_UPLOAD_NOTIFICATION = 4201

private fun ensurePostUploadChannel(context: Context) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        val manager = context.getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(
            NotificationChannel(POST_UPLOAD_CHANNEL, "Post uploads", NotificationManager.IMPORTANCE_LOW).apply {
                description = "Progress and completion updates for Tiwi posts"
            }
        )
    }
}

private fun showPostUploadNotification(context: Context, progress: Int, message: String, complete: Boolean = false) {
    ensurePostUploadChannel(context)
    if (Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return
    val notification = NotificationCompat.Builder(context, POST_UPLOAD_CHANNEL)
        .setSmallIcon(R.mipmap.ic_launcher)
        .setContentTitle(if (complete) "Your post is live" else "Uploading post")
        .setContentText(message)
        .setOnlyAlertOnce(!complete)
        .setOngoing(!complete)
        .setAutoCancel(complete)
        .setProgress(100, progress.coerceIn(0, 100), false)
        .build()
    NotificationManagerCompat.from(context).notify(POST_UPLOAD_NOTIFICATION, notification)
}

private fun playPostPublishedSound(context: Context) {
    runCatching {
        val uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
        RingtoneManager.getRingtone(context, uri)?.play()
    }
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
    var selectedPostId by remember { mutableStateOf<String?>(null) }
    var callRequest by remember { mutableStateOf<TiwiCallRequest?>(null) }
    
    val apiPosts by repository.feed.collectAsState()
    val currentUser by repository.currentUser.collectAsState()
    val incomingCalls by repository.incomingCalls.collectAsState()
    val posts = remember(apiPosts) { apiPosts.map(::toUiPost) }
    val reels = remember(apiPosts) { apiPosts.filter { it.type == "reel" || it.type == "video" }.map(::toUiReel) }
    val scope = rememberCoroutineScope()
    val appView = LocalView.current
    val appActivity = LocalContext.current as? Activity
    val hasOverlay = showProfile || showCreatePost || showMessages || showConnect || selectedProfileUserId != null || selectedChat != null || selectedPostId != null
    val darkChrome = selectedTab == 2 && !hasOverlay

    SideEffect {
        appActivity?.window?.let { window ->
            window.statusBarColor = (if (darkChrome) Color.Black else Color.Transparent).toArgb()
            window.navigationBarColor = (if (darkChrome) Color.Black else Color.White).toArgb()
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                window.isStatusBarContrastEnforced = false
                window.isNavigationBarContrastEnforced = false
            }
            WindowCompat.getInsetsController(window, appView).apply {
                isAppearanceLightStatusBars = !darkChrome
                isAppearanceLightNavigationBars = !darkChrome
            }
        }
    }

    BackHandler(enabled = showShareSheet || hasOverlay || selectedTab != 0) {
        when {
            showShareSheet -> showShareSheet = false
            selectedPostId != null -> selectedPostId = null
            selectedProfileUserId != null -> selectedProfileUserId = null
            selectedChat != null -> { selectedChat = null; isRandomChat = false }
            showConnect -> showConnect = false
            showMessages -> showMessages = false
            showCreatePost -> showCreatePost = false
            showProfile -> showProfile = false
            selectedTab != 0 -> selectedTab = 0
        }
    }

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
            if (selectedTab != 2 && !showProfile && !showCreatePost && !showMessages && !showConnect && selectedProfileUserId == null && selectedChat == null && selectedPostId == null) {
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
            if (!showProfile && !showCreatePost && !showMessages && !showConnect && selectedProfileUserId == null && selectedChat == null && selectedPostId == null) {
                TiwiBottomBar(selectedTab, dark = selectedTab == 2) {
                    selectedTab = it
                } 
            }
        },
        containerColor = if (darkChrome) Color.Black else MaterialTheme.colorScheme.background,
        contentWindowInsets = WindowInsets(0, 0, 0, 0)
    ) { innerPadding ->
        Box(modifier = Modifier.padding(innerPadding)) {
            when {
                selectedPostId != null -> PostDetailScreen(repository, selectedPostId!!, onBack = { selectedPostId = null }, onProfileClick = { selectedProfileUserId = it; selectedPostId = null })
                selectedProfileUserId != null -> ProfileScreen(
                    repository, posts.filter { it.authorId == selectedProfileUserId }, reels.filter { it.authorId == selectedProfileUserId }, userId = selectedProfileUserId,
                    onBack = { selectedProfileUserId = null }, onPostClick = { selectedPostId = it }, onMessage = { id -> scope.launch { selectedChat = repository.createConversation(id); selectedProfileUserId = null } }
                )
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
                showProfile -> ProfileScreen(repository, posts.filter { it.authorId == repository.currentUserId() }, reels.filter { it.authorId == repository.currentUserId() }, onBack = { showProfile = false }, onPostClick = { selectedPostId = it })
                else -> {
                    when (selectedTab) {
                        0 -> HomeFeed(reels, posts, repository, onShareClick = { showShareSheet = true }, onAuthorClick = { selectedProfileUserId = it }, onPostClick = { selectedPostId = it })
                        1 -> SearchScreen(repository, onProfileClick = { selectedProfileUserId = it }, onPostClick = { selectedPostId = it })
                        2 -> ReelsScreen(reels, repository, onOpen = { selectedPostId = it }, onShare = { showShareSheet = true }, onAuthor = { selectedProfileUserId = it })
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
fun HomeFeed(
    reels: List<Reel>,
    posts: List<Post>,
    repository: SocialRepository,
    onShareClick: () -> Unit,
    onAuthorClick: (String) -> Unit,
    onPostClick: (String) -> Unit
) {
    val scope = rememberCoroutineScope()
    var suggestions by remember { mutableStateOf<List<SocialProfile>>(emptyList()) }
    LaunchedEffect(Unit) { suggestions = runCatching { repository.searchProfiles() }.getOrDefault(emptyList()).take(12) }
    LazyColumn(modifier = Modifier.fillMaxSize()) {
        item {
            ReelsSection(reels)
        }
        posts.forEachIndexed { index, post ->
            item(key = post.id) {
                PostCard(post, repository, onShareClick, { onAuthorClick(post.authorId) }, { onPostClick(post.id) })
            }
            if (suggestions.isNotEmpty() && index % 2 == 1) item(key = "suggest-$index") {
                SuggestedFriendsSection(suggestions, repository, onAuthorClick) { updated ->
                    suggestions = suggestions.map { if (it.userId == updated.userId) updated else it }
                }
            }
        }
    }
}

@Composable
private fun SuggestedFriendsSection(
    profiles: List<SocialProfile>,
    repository: SocialRepository,
    onProfileClick: (String) -> Unit,
    onUpdated: (SocialProfile) -> Unit
) {
    val scope = rememberCoroutineScope()
    Column(Modifier.fillMaxWidth().padding(vertical = 10.dp)) {
        Text("Suggested for you", modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp), fontWeight = FontWeight.Bold)
        LazyRow(contentPadding = PaddingValues(horizontal = 8.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            items(profiles, key = { it.userId }) { profile ->
                Column(
                    Modifier.width(136.dp).background(Color(0xFFF7F7F7), RoundedCornerShape(10.dp)).clickable { onProfileClick(profile.userId) }.padding(10.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    TiwiAvatar(profile.user.avatar, R.drawable.img_tiwi_avatar_1, Modifier.size(72.dp).clip(CircleShape))
                    Spacer(Modifier.height(6.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(profile.user.name, maxLines = 1, overflow = TextOverflow.Ellipsis, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        if (profile.verified) Icon(Icons.Default.Verified, null, tint = TiwiBlue, modifier = Modifier.size(14.dp))
                    }
                    Text("@${profile.username}", maxLines = 1, color = Color.Gray, fontSize = 11.sp)
                    Button(
                        onClick = { scope.launch { runCatching { repository.follow(profile.userId, !profile.isFollowing) }.onSuccess(onUpdated) } },
                        modifier = Modifier.fillMaxWidth().height(32.dp),
                        contentPadding = PaddingValues(0.dp),
                        shape = RoundedCornerShape(7.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = if (profile.isFollowing) Color(0xFFE6E6E6) else TiwiBlue, contentColor = if (profile.isFollowing) Color.Black else Color.White)
                    ) { Text(if (profile.isFollowing) "Following" else "Follow", fontSize = 12.sp, fontWeight = FontWeight.Bold) }
                }
            }
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PostCard(post: Post, repository: SocialRepository, onShareClick: () -> Unit = {}, onAuthorClick: () -> Unit = {}, onOpen: () -> Unit = {}) {
    var isExpanded by remember { mutableStateOf(false) }
    var showMenu by remember { mutableStateOf(false) }
    var showEdit by remember { mutableStateOf(false) }
    var showDelete by remember { mutableStateOf(false) }
    var showReport by remember { mutableStateOf(false) }
    var showVerified by remember { mutableStateOf(false) }
    var editBody by remember(post.content) { mutableStateOf(post.content) }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val isOwn = post.authorId == repository.currentUserId()

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.background)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 10.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            TiwiAvatar(
                url = post.authorAvatarUrl,
                fallback = post.authorAvatar,
                modifier = Modifier
                    .size(38.dp)
                    .clip(CircleShape)
                    .clickable { onAuthorClick() },
                contentScale = ContentScale.Crop
            )
            Spacer(modifier = Modifier.width(8.dp))
            Column(modifier = Modifier.weight(1f).clickable { onAuthorClick() }) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = post.author,
                        style = MaterialTheme.typography.bodyLarge.copy(fontWeight = FontWeight.Bold)
                    )
                    if (post.verified) {
                        Spacer(modifier = Modifier.width(2.dp))
                        Icon(Icons.Default.Verified, contentDescription = "Verified", tint = TiwiBlue, modifier = Modifier.size(16.dp).clickable { showVerified = true })
                    }
                    if (!isOwn) {
                        Spacer(modifier = Modifier.width(5.dp))
                        Text(if (post.following) "Following" else "Follow", color = if (post.following) Color.Gray else TiwiBlue,
                            style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.ExtraBold),
                            modifier = Modifier.clickable { scope.launch { runCatching { repository.follow(post.authorId, !post.following) } } })
                    }
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(post.time, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.6f))
                    if (post.visibility != "public") {
                        Spacer(Modifier.width(3.dp))
                        Icon(
                            if (post.visibility == "private") Icons.Default.Lock else Icons.Default.Group,
                            contentDescription = post.visibility,
                            tint = Color.Gray,
                            modifier = Modifier.size(11.dp)
                        )
                    }
                }
            }
            Box {
            IconButton(onClick = { showMenu = true }, modifier = Modifier.size(36.dp)) {
                Icon(Icons.Default.MoreVert, contentDescription = "More")
            }
                DropdownMenu(expanded = showMenu, onDismissRequest = { showMenu = false }) {
                    if (isOwn) {
                        DropdownMenuItem(text = { Text("Edit post") }, leadingIcon = { Icon(Icons.Default.Edit, null) }, onClick = { showMenu = false; showEdit = true })
                        DropdownMenuItem(text = { Text("Delete post", color = Color.Red) }, leadingIcon = { Icon(Icons.Default.Delete, null, tint = Color.Red) }, onClick = { showMenu = false; showDelete = true })
                    } else DropdownMenuItem(text = { Text("Report post") }, leadingIcon = { Icon(Icons.Default.Flag, null) }, onClick = { showMenu = false; showReport = true })
                }
            }
        }

        if (post.content.isNotBlank()) Column(modifier = Modifier.padding(horizontal = 10.dp, vertical = 2.dp)) {
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
                        .padding(vertical = 2.dp),
                    color = TiwiBlue,
                    style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold)
                )
            }
        }

        PostMediaGrid(post.media, onOpen)

        Row(
            modifier = Modifier.fillMaxWidth().height(44.dp).padding(horizontal = 5.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            CompactPostAction(
                icon = if (post.liked) Icons.Filled.Favorite else Icons.Outlined.FavoriteBorder,
                count = post.likes,
                tint = if (post.liked) Color.Red else Color.Gray,
                description = "Like"
            ) { scope.launch { runCatching { repository.reactToPost(post.id) } } }
            CompactPostAction(Icons.Outlined.ChatBubbleOutline, post.comments, description = "Comment", onClick = onOpen)
            CompactPostAction(Icons.Default.Repeat, post.shares, description = "Repost") {
                scope.launch { runCatching { repository.repostPost(post.id) }.onSuccess { Toast.makeText(context, "Reposted", Toast.LENGTH_SHORT).show() } }
            }
            IconButton(onClick = onShareClick, modifier = Modifier.size(36.dp)) { Icon(Icons.Outlined.Share, "Share", Modifier.size(20.dp), tint = Color.Gray) }
            Spacer(Modifier.weight(1f))
            CompactPostAction(Icons.Outlined.BarChart, post.views, description = "Views") { scope.launch { runCatching { repository.viewPost(post.id) } } }
            IconButton(onClick = { Toast.makeText(context, "Saved", Toast.LENGTH_SHORT).show() }, modifier = Modifier.size(36.dp)) {
                Icon(Icons.Outlined.BookmarkBorder, "Save", Modifier.size(20.dp), tint = Color.Gray)
            }
        }
        
        HorizontalDivider(
            thickness = 0.5.dp,
            color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.1f)
        )
    }

    if (showEdit) AlertDialog(onDismissRequest = { showEdit = false }, title = { Text("Edit post") }, text = {
        OutlinedTextField(editBody, { editBody = it }, modifier = Modifier.fillMaxWidth(), minLines = 3)
    }, confirmButton = { TextButton(onClick = { showEdit = false; scope.launch { runCatching { repository.updatePost(post.id, editBody) } } }) { Text("Save") } }, dismissButton = { TextButton(onClick = { showEdit = false }) { Text("Cancel") } })
    if (showDelete) AlertDialog(onDismissRequest = { showDelete = false }, title = { Text("Delete post?") }, text = { Text("This removes the post from every feed.") },
        confirmButton = { TextButton(onClick = { showDelete = false; scope.launch { runCatching { repository.deletePost(post.id) } } }) { Text("Delete", color = Color.Red) } },
        dismissButton = { TextButton(onClick = { showDelete = false }) { Text("Cancel") } })
    if (showReport) AlertDialog(onDismissRequest = { showReport = false }, title = { Text("Report post") }, text = { Text("Report spam, harassment, false information or inappropriate content to Tiwlo administrators.") },
        confirmButton = { TextButton(onClick = { showReport = false; scope.launch { runCatching { repository.reportContent("post", post.id, "inappropriate_content") }.onSuccess { Toast.makeText(context, "Report sent", Toast.LENGTH_SHORT).show() } } }) { Text("Send report") } },
        dismissButton = { TextButton(onClick = { showReport = false }) { Text("Cancel") } })
    if (showVerified) VerifiedInfoSheet(post.author, post.authorAvatarUrl, onDismiss = { showVerified = false })
}

@Composable
private fun CompactPostAction(
    icon: ImageVector,
    count: Int,
    tint: Color = Color.Gray,
    description: String,
    onClick: () -> Unit
) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        IconButton(onClick = onClick, modifier = Modifier.size(34.dp)) {
            Icon(icon, contentDescription = description, modifier = Modifier.size(20.dp), tint = tint)
        }
        if (count > 0) Text(count.toString(), style = MaterialTheme.typography.labelSmall, color = Color.Gray)
    }
}

@Composable
private fun PostMediaGrid(media: List<SocialMedia>, onOpen: () -> Unit) {
    if (media.isEmpty()) return
    val visible = media.take(4)
    val cell: @Composable (SocialMedia, Modifier, Int) -> Unit = { item, modifier, index ->
        Box(modifier.clickable(onClick = onOpen).background(Color.Black)) {
            if (item.type == "video") TiwiVideo(item.hlsUrl ?: item.url, Modifier.fillMaxSize(), autoplay = media.size == 1)
            else AsyncImage(model = item.url, contentDescription = null, modifier = Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
            if (index == 3 && media.size > 4) Box(Modifier.fillMaxSize().background(Color.Black.copy(alpha = .55f)), contentAlignment = Alignment.Center) {
                Text("+${media.size - 4}", color = Color.White, fontSize = 28.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
    when (visible.size) {
        1 -> cell(visible[0], Modifier.fillMaxWidth().heightIn(min = 220.dp, max = 460.dp), 0)
        2 -> Row(Modifier.fillMaxWidth().height(300.dp), horizontalArrangement = Arrangement.spacedBy(1.dp)) {
            visible.forEachIndexed { i, item -> cell(item, Modifier.weight(1f).fillMaxHeight(), i) }
        }
        else -> Row(Modifier.fillMaxWidth().height(360.dp), horizontalArrangement = Arrangement.spacedBy(1.dp)) {
            cell(visible[0], Modifier.weight(1.2f).fillMaxHeight(), 0)
            Column(Modifier.weight(1f).fillMaxHeight(), verticalArrangement = Arrangement.spacedBy(1.dp)) {
                visible.drop(1).forEachIndexed { i, item -> cell(item, Modifier.weight(1f).fillMaxWidth(), i + 1) }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun VerifiedInfoSheet(name: String, avatar: String?, onDismiss: () -> Unit) {
    ModalBottomSheet(onDismissRequest = onDismiss, dragHandle = null) {
        Column(Modifier.fillMaxWidth().padding(20.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            TiwiAvatar(avatar, R.drawable.img_tiwi_avatar_1, Modifier.size(72.dp).clip(CircleShape))
            Spacer(Modifier.height(8.dp))
            Row(verticalAlignment = Alignment.CenterVertically) { Text(name, fontWeight = FontWeight.Bold, fontSize = 18.sp); Spacer(Modifier.width(3.dp)); Icon(Icons.Default.Verified, null, tint = TiwiBlue) }
            Spacer(Modifier.height(10.dp))
            Text("This profile is verified", fontWeight = FontWeight.Bold)
            Text("Tiwlo confirmed that this is the authentic presence for this person or notable account.", textAlign = TextAlign.Center, color = Color.Gray, modifier = Modifier.padding(vertical = 8.dp))
            Button(onClick = onDismiss, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(8.dp)) { Text("Got it") }
            Spacer(Modifier.navigationBarsPadding())
        }
    }
}

@Composable
private fun PostDetailScreen(repository: SocialRepository, postId: String, onBack: () -> Unit, onProfileClick: (String) -> Unit) {
    val feed by repository.feed.collectAsState()
    val commentsByPost by repository.comments.collectAsState()
    val post = feed.firstOrNull { it.id == postId }?.let(::toUiPost)
    val comments = commentsByPost[postId].orEmpty()
    var text by remember { mutableStateOf("") }
    var replyTo by remember { mutableStateOf<SocialComment?>(null) }
    var sending by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current

    LaunchedEffect(postId) {
        runCatching { repository.viewPost(postId) }
        runCatching { repository.refreshComments(postId) }
    }
    Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background).imePadding()) {
        Row(
            Modifier.fillMaxWidth().statusBarsPadding().height(48.dp).padding(horizontal = 4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") }
            Text("Post", fontWeight = FontWeight.Bold, fontSize = 18.sp)
        }
        HorizontalDivider(thickness = .5.dp)
        LazyColumn(Modifier.weight(1f)) {
            post?.let { item { PostCard(it, repository, onAuthorClick = { onProfileClick(it.authorId) }) } }
            item { Text("Comments", modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp), fontWeight = FontWeight.Bold) }
            if (comments.isEmpty()) item { Text("Be the first to comment", color = Color.Gray, modifier = Modifier.padding(24.dp).fillMaxWidth(), textAlign = TextAlign.Center) }
            items(comments, key = { it.id }) { comment ->
                CommentRow(
                    comment = comment,
                    isOwn = comment.authorId == repository.currentUserId(),
                    onProfile = { onProfileClick(comment.authorId) },
                    onReply = { replyTo = comment; text = "@${comment.author.name} " },
                    onLike = { scope.launch { runCatching { repository.reactToComment(postId, comment.id) } } },
                    onDelete = { scope.launch { runCatching { repository.deleteComment(postId, comment.id) } } },
                    onReport = { scope.launch { runCatching { repository.reportContent("comment", comment.id, "inappropriate_content") }.onSuccess { Toast.makeText(context, "Report sent", Toast.LENGTH_SHORT).show() } } }
                )
            }
        }
        replyTo?.let { target ->
            Row(Modifier.fillMaxWidth().background(Color(0xFFF3F3F3)).padding(horizontal = 12.dp, vertical = 5.dp), verticalAlignment = Alignment.CenterVertically) {
                Text("Replying to ${target.author.name}", modifier = Modifier.weight(1f), fontSize = 12.sp, color = Color.Gray)
                IconButton(onClick = { replyTo = null }, modifier = Modifier.size(28.dp)) { Icon(Icons.Default.Close, null, modifier = Modifier.size(16.dp)) }
            }
        }
        Row(Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
            TiwiAvatar(repository.currentUser.value?.avatar, R.drawable.img_tiwi_avatar_1, Modifier.size(34.dp).clip(CircleShape))
            BasicTextField(
                value = text,
                onValueChange = { text = it },
                modifier = Modifier.weight(1f).padding(horizontal = 10.dp, vertical = 9.dp),
                textStyle = MaterialTheme.typography.bodyMedium.copy(color = MaterialTheme.colorScheme.onBackground),
                decorationBox = { inner -> if (text.isBlank()) Text("Add a comment…", color = Color.Gray); inner() }
            )
            TextButton(enabled = text.isNotBlank() && !sending, onClick = {
                val body = text
                text = ""
                sending = true
                scope.launch {
                    runCatching { repository.addComment(postId, body, replyTo?.id) }
                        .onFailure { Toast.makeText(context, it.message ?: "Comment failed", Toast.LENGTH_SHORT).show() }
                    replyTo = null; sending = false
                }
            }) { if (sending) CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp) else Text("Post", fontWeight = FontWeight.Bold) }
        }
        Spacer(Modifier.navigationBarsPadding())
    }
}

@Composable
private fun CommentRow(
    comment: SocialComment,
    isOwn: Boolean,
    onProfile: () -> Unit,
    onReply: () -> Unit,
    onLike: () -> Unit,
    onDelete: () -> Unit,
    onReport: () -> Unit
) {
    var menu by remember { mutableStateOf(false) }
    Row(
        Modifier.fillMaxWidth().padding(start = if (comment.replyToId == null) 10.dp else 46.dp, end = 6.dp, top = 6.dp, bottom = 6.dp),
        verticalAlignment = Alignment.Top
    ) {
        TiwiAvatar(comment.author.avatar, R.drawable.img_tiwi_avatar_1, Modifier.size(34.dp).clip(CircleShape).clickable(onClick = onProfile))
        Spacer(Modifier.width(8.dp))
        Column(Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(comment.author.name, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                if (comment.authorProfile?.verified == true) Icon(Icons.Default.Verified, null, tint = TiwiBlue, modifier = Modifier.size(14.dp))
            }
            Text(comment.body, color = MaterialTheme.colorScheme.onBackground)
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Reply", modifier = Modifier.clickable(onClick = onReply).padding(vertical = 5.dp), fontWeight = FontWeight.Bold, fontSize = 12.sp, color = Color.Gray)
                if (comment.reactionCount > 0) Text("  ${comment.reactionCount} likes", fontSize = 11.sp, color = Color.Gray)
            }
        }
        IconButton(onClick = onLike, modifier = Modifier.size(34.dp)) {
            Icon(if (comment.viewerLiked) Icons.Filled.Favorite else Icons.Outlined.FavoriteBorder, "Like comment", tint = if (comment.viewerLiked) Color.Red else Color.Gray, modifier = Modifier.size(16.dp))
        }
        Box {
            IconButton(onClick = { menu = true }, modifier = Modifier.size(30.dp)) { Icon(Icons.Default.MoreVert, null, modifier = Modifier.size(16.dp)) }
            DropdownMenu(expanded = menu, onDismissRequest = { menu = false }) {
                DropdownMenuItem(text = { Text(if (isOwn) "Delete" else "Report") }, onClick = { menu = false; if (isOwn) onDelete() else onReport() })
            }
        }
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
    var selectedUris by remember { mutableStateOf<List<android.net.Uri>>(emptyList()) }
    var pickerType by remember { mutableStateOf<ActivityResultContracts.PickVisualMedia.VisualMediaType>(ActivityResultContracts.PickVisualMedia.ImageAndVideo) }
    var visibility by remember { mutableStateOf("public") }
    var showPrivacyMenu by remember { mutableStateOf(false) }
    var busy by remember { mutableStateOf(false) }
    var uploadProgress by remember { mutableIntStateOf(0) }
    var uploadStatus by remember { mutableStateOf("") }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val user by repository.currentUser.collectAsState()
    val notificationPermission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { }
    val mediaPicker = rememberLauncherForActivityResult(ActivityResultContracts.PickMultipleVisualMedia(20)) { uris ->
        selectedUris = (selectedUris + uris).distinct().take(20)
    }
    BackHandler(enabled = busy) { }
    
    Column(modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background).imePadding()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .statusBarsPadding()
                .padding(horizontal = 8.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            TextButton(onClick = onBack, enabled = !busy) {
                Text("Cancel", color = MaterialTheme.colorScheme.onBackground)
            }
            Button(
                onClick = {
                    if (busy) return@Button
                    if (Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                        notificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
                    }
                    scope.launch {
                        busy = true
                        uploadProgress = 2
                        uploadStatus = "Preparing your post"
                        showPostUploadNotification(context, uploadProgress, uploadStatus)
                        try {
                            val media = selectedUris.mapIndexed { index, uri ->
                                uploadStatus = "Uploading ${index + 1} of ${selectedUris.size}"
                                uploadProgress = if (selectedUris.isEmpty()) 45 else 5 + ((index * 75) / selectedUris.size)
                                showPostUploadNotification(context, uploadProgress, uploadStatus)
                                repository.uploadMedia(context.contentResolver, uri, "post")
                            }
                            uploadProgress = 88
                            uploadStatus = "Publishing to the feed"
                            showPostUploadNotification(context, uploadProgress, uploadStatus)
                            val postType = if (media.any { it.type == "video" }) "video" else "post"
                            repository.createPost(text, postType, media, visibility)
                            uploadProgress = 100
                            uploadStatus = "Post published"
                            showPostUploadNotification(context, 100, uploadStatus, complete = true)
                            playPostPublishedSound(context)
                            onBack()
                        } catch (error: Exception) {
                            NotificationManagerCompat.from(context).cancel(POST_UPLOAD_NOTIFICATION)
                            Toast.makeText(context, error.message ?: "Post failed", Toast.LENGTH_LONG).show()
                        } finally {
                            busy = false
                            if (uploadProgress < 100) { uploadProgress = 0; uploadStatus = "" }
                        }
                    }
                },
                enabled = (text.isNotBlank() || selectedUris.isNotEmpty()) && !busy,
                colors = ButtonDefaults.buttonColors(containerColor = TiwiBlue),
                shape = RoundedCornerShape(20.dp)
            ) {
                if (busy) CircularProgressIndicator(Modifier.size(18.dp), color = Color.White, strokeWidth = 2.dp)
                else Text("Post", fontWeight = FontWeight.Bold)
            }
        }

        if (busy) Column(Modifier.fillMaxWidth()) {
            LinearProgressIndicator(progress = { uploadProgress / 100f }, modifier = Modifier.fillMaxWidth(), color = TiwiBlue)
            Text(uploadStatus, modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 4.dp), fontSize = 12.sp, color = Color.Gray)
        }
        
        Row(modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp).fillMaxWidth()) {
            TiwiAvatar(user?.avatar, R.drawable.img_tiwi_avatar_1, Modifier.size(40.dp).clip(CircleShape))
            Spacer(modifier = Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Box {
                    TextButton(onClick = { showPrivacyMenu = true }, contentPadding = PaddingValues(horizontal = 0.dp), modifier = Modifier.height(28.dp)) {
                        Icon(
                            when (visibility) { "private" -> Icons.Default.Lock; "followers" -> Icons.Default.Group; else -> Icons.Default.Public },
                            contentDescription = "Post privacy",
                            modifier = Modifier.size(15.dp)
                        )
                        Spacer(Modifier.width(4.dp))
                        Text(when (visibility) { "private" -> "Only me"; "followers" -> "Followers"; else -> "Public" }, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        Icon(Icons.Default.ArrowDropDown, null, Modifier.size(15.dp))
                    }
                    DropdownMenu(expanded = showPrivacyMenu, onDismissRequest = { showPrivacyMenu = false }) {
                        listOf(
                            Triple("public", Icons.Default.Public, "Public"),
                            Triple("followers", Icons.Default.Group, "Followers"),
                            Triple("private", Icons.Default.Lock, "Only me")
                        ).forEach { option ->
                            DropdownMenuItem(
                                text = { Text(option.third) },
                                leadingIcon = { Icon(option.second, null) },
                                onClick = { visibility = option.first; showPrivacyMenu = false }
                            )
                        }
                    }
                }
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
        }

        if (selectedUris.isNotEmpty()) {
            LazyRow(
                modifier = Modifier.fillMaxWidth().height(220.dp),
                contentPadding = PaddingValues(horizontal = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                items(selectedUris, key = { it.toString() }) { uri ->
                    Box(Modifier.width(if (selectedUris.size == 1) 340.dp else 190.dp).fillMaxHeight()) {
                        val mime = context.contentResolver.getType(uri).orEmpty()
                        if (mime.startsWith("video/")) {
                            TiwiVideo(uri.toString(), Modifier.fillMaxSize())
                        } else AsyncImage(model = uri, contentDescription = "Selected photo", modifier = Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                        IconButton(
                            onClick = { selectedUris = selectedUris.filterNot { it == uri } },
                            modifier = Modifier.align(Alignment.TopEnd).padding(4.dp).size(30.dp).background(Color.Black.copy(alpha = .65f), CircleShape)
                        ) { Icon(Icons.Default.Close, "Remove", tint = Color.White, modifier = Modifier.size(18.dp)) }
                    }
                }
                item {
                    Box(
                        Modifier.width(100.dp).fillMaxHeight().clickable {
                            mediaPicker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageAndVideo))
                        }.background(Color(0xFFF1F1F1)),
                        contentAlignment = Alignment.Center
                    ) { Column(horizontalAlignment = Alignment.CenterHorizontally) { Icon(Icons.Default.Add, null); Text("Add more", fontSize = 12.sp) } }
                }
            }
        }

        Spacer(modifier = Modifier.weight(1f))
        
        // Attachment Bar
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp, vertical = 4.dp),
            horizontalArrangement = Arrangement.SpaceAround
        ) {
            IconButton(onClick = {
                pickerType = ActivityResultContracts.PickVisualMedia.ImageOnly
                mediaPicker.launch(PickVisualMediaRequest(pickerType))
            }) { Icon(Icons.Default.Photo, "Photo", tint = TiwiBlue) }
            IconButton(onClick = {
                pickerType = ActivityResultContracts.PickVisualMedia.VideoOnly
                mediaPicker.launch(PickVisualMediaRequest(pickerType))
            }) { Icon(Icons.Default.VideoLibrary, "Video", tint = TiwiPurple) }
            IconButton(onClick = {}) { Icon(Icons.Default.PersonAdd, "Tag", tint = TiwiPink) }
            IconButton(onClick = {}) { Icon(Icons.Default.LocationOn, "Location", tint = Color.Red) }
            IconButton(onClick = {}) { Icon(Icons.Default.Gif, "Gif", tint = TiwiBlue) }
        }
    }
}

@Composable
fun TiwiBottomBar(selectedTab: Int, dark: Boolean = false, onTabSelected: (Int) -> Unit) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = if (dark) Color.Black else MaterialTheme.colorScheme.background,
        tonalElevation = 0.dp,
        shadowElevation = 0.dp
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().navigationBarsPadding().height(54.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceAround
        ) {
            val items = listOf(
                Icons.Outlined.Home to Icons.Filled.Home,
                Icons.Outlined.Search to Icons.Filled.Search,
                Icons.Outlined.SmartDisplay to Icons.Filled.SmartDisplay,
                Icons.Outlined.FavoriteBorder to Icons.Filled.Favorite,
                Icons.Outlined.Menu to Icons.Filled.Menu
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
                        tint = if (dark) Color.White else if (isSelected) Color.Black else Color.Gray,
                        modifier = Modifier.size(25.dp).graphicsLayer(scaleX = iconScale, scaleY = iconScale)
                    )
                }
            }
        }
    }
}

@Composable
fun SearchScreen(repository: SocialRepository, onProfileClick: (String) -> Unit, onPostClick: (String) -> Unit) {
    var query by remember { mutableStateOf("") }
    var profiles by remember { mutableStateOf<List<SocialProfile>>(emptyList()) }
    val scope = rememberCoroutineScope()
    val feed by repository.feed.collectAsState()
    LaunchedEffect(query) {
        delay(if (query.isBlank()) 0 else 250)
        profiles = runCatching { repository.searchProfiles(query) }.getOrDefault(emptyList())
    }
    val matchingPosts = remember(feed, query) {
        feed.filter { post ->
            post.media.isNotEmpty() && (query.isBlank() || post.body.contains(query, true) || post.author.name.contains(query, true))
        }
    }
    Column(modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp, vertical = 7.dp)
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

        LazyColumn(modifier = Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 2.dp)) {
            if (query.isBlank() && profiles.isNotEmpty()) {
                item { Text("Suggested people", modifier = Modifier.padding(horizontal = 10.dp, vertical = 7.dp), fontWeight = FontWeight.Bold) }
                item {
                    LazyRow(contentPadding = PaddingValues(horizontal = 8.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        items(profiles.take(12), key = { it.userId }) { profile ->
                            Surface(
                                modifier = Modifier.width(154.dp).clickable { onProfileClick(profile.userId) },
                                color = MaterialTheme.colorScheme.surface,
                                shape = RoundedCornerShape(9.dp),
                                border = BorderStroke(.5.dp, Color.LightGray.copy(alpha = .55f))
                            ) {
                                Column(Modifier.padding(9.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                    TiwiAvatar(profile.user.avatar, R.drawable.img_tiwi_avatar_1, Modifier.size(66.dp).clip(CircleShape))
                                    Spacer(Modifier.height(5.dp))
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Text(profile.user.name, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                        if (profile.verified) Icon(Icons.Default.Verified, "Verified", tint = TiwiBlue, modifier = Modifier.padding(start = 2.dp).size(14.dp))
                                    }
                                    Text("@${profile.username}", color = Color.Gray, fontSize = 11.sp, maxLines = 1)
                                    Button(
                                        onClick = { scope.launch { runCatching { repository.follow(profile.userId, !profile.isFollowing) }.onSuccess { updated -> profiles = profiles.map { if (it.userId == updated.userId) updated else it } } } },
                                        modifier = Modifier.fillMaxWidth().height(31.dp),
                                        contentPadding = PaddingValues(0.dp),
                                        shape = RoundedCornerShape(7.dp),
                                        colors = ButtonDefaults.buttonColors(containerColor = if (profile.isFollowing) Color(0xFFEFEFEF) else TiwiBlue, contentColor = if (profile.isFollowing) Color.Black else Color.White)
                                    ) { Text(if (profile.isFollowing) "Following" else "Follow", fontSize = 12.sp, fontWeight = FontWeight.Bold) }
                                }
                            }
                        }
                    }
                }
            } else if (profiles.isNotEmpty()) {
                item { Text("People", modifier = Modifier.padding(horizontal = 10.dp, vertical = 7.dp), fontWeight = FontWeight.Bold) }
                items(profiles, key = { it.userId }) { profile ->
                    ListItem(
                        modifier = Modifier.clickable { onProfileClick(profile.userId) },
                        leadingContent = { TiwiAvatar(profile.user.avatar, R.drawable.img_tiwi_avatar_1, Modifier.size(48.dp).clip(CircleShape)) },
                        headlineContent = { Row(verticalAlignment = Alignment.CenterVertically) { Text(profile.user.name, fontWeight = FontWeight.Bold); if (profile.verified) Icon(Icons.Default.Verified, "Verified", tint = TiwiBlue, modifier = Modifier.padding(start = 3.dp).size(15.dp)) } },
                        supportingContent = { Text("@${profile.username}") },
                        trailingContent = {
                            TextButton(onClick = { scope.launch { runCatching { repository.follow(profile.userId, !profile.isFollowing) }.onSuccess { updated -> profiles = profiles.map { if (it.userId == updated.userId) updated else it } } } }) {
                                Text(if (profile.isFollowing) "Following" else "Follow", fontWeight = FontWeight.Bold)
                            }
                        },
                        colors = ListItemDefaults.colors(containerColor = Color.Transparent)
                    )
                }
            }
            item { Text("Posts and videos", modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp), fontWeight = FontWeight.Bold) }
            if (matchingPosts.isEmpty()) {
                item { Text("No media posts found", modifier = Modifier.fillMaxWidth().padding(28.dp), textAlign = TextAlign.Center, color = Color.Gray) }
            } else {
                items(matchingPosts.chunked(3), key = { row -> row.joinToString("-") { it.id } }) { row ->
                    Row(Modifier.fillMaxWidth().height(126.dp)) {
                        row.forEach { post -> ExplorePostTile(post, Modifier.weight(1f).fillMaxHeight(), onPostClick) }
                        repeat(3 - row.size) { Spacer(Modifier.weight(1f)) }
                    }
                }
            }
        }
    }
}

@Composable
private fun ExplorePostTile(post: SocialPost, modifier: Modifier, onPostClick: (String) -> Unit) {
    val media = post.media.firstOrNull()
    Box(modifier.padding(.75.dp).background(Color(0xFFE9E9E9)).clickable { onPostClick(post.id) }) {
        when {
            !media?.thumbnailUrl.isNullOrBlank() -> AsyncImage(media?.thumbnailUrl, null, Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
            media?.type == "video" && !post.thumbnailUrl.isNullOrBlank() -> AsyncImage(post.thumbnailUrl, null, Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
            media?.type == "video" -> Box(Modifier.fillMaxSize().background(Color.Black))
            !media?.url.isNullOrBlank() -> AsyncImage(media?.url, null, Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
        }
        if (media?.type == "video" || post.type == "video" || post.type == "reel") {
            Icon(Icons.Filled.PlayArrow, "Video", tint = Color.White, modifier = Modifier.align(Alignment.TopEnd).padding(5.dp).size(22.dp))
        }
        if (post.media.size > 1) Icon(Icons.Default.Collections, "Multiple media", tint = Color.White, modifier = Modifier.align(Alignment.TopStart).padding(5.dp).size(19.dp))
    }
}

@Composable
fun ReelsScreen(reels: List<Reel>, repository: SocialRepository, onOpen: (String) -> Unit = {}, onShare: () -> Unit = {}, onAuthor: (String) -> Unit = {}) {
    if (reels.isEmpty()) {
        Box(Modifier.fillMaxSize().background(Color.Black), contentAlignment = Alignment.Center) {
            Text("No reels yet", color = Color.White)
        }
        return
    }
    val pagerState = rememberPagerState(pageCount = { reels.size })
    val scope = rememberCoroutineScope()
    VerticalPager(state = pagerState, modifier = Modifier.fillMaxSize().background(Color.Black)) { page ->
        val reel = reels[page]
        Box(modifier = Modifier.fillMaxSize().background(Color.Black)) {
            when {
                !reel.videoUrl.isNullOrBlank() -> TiwiVideo(reel.videoUrl!!, Modifier.fillMaxSize(), autoplay = pagerState.currentPage == page)
                !reel.thumbnailUrl.isNullOrBlank() -> AsyncImage(model = reel.thumbnailUrl, contentDescription = null, modifier = Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                else -> Box(Modifier.fillMaxSize().background(Color.Black))
            }
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        Brush.verticalGradient(
                            listOf(Color.Transparent, Color.Black.copy(alpha = 0.82f)),
                            startY = 900f
                        )
                    )
            )
            Text("Reels", modifier = Modifier.align(Alignment.TopStart).statusBarsPadding().padding(horizontal = 14.dp, vertical = 10.dp), color = Color.White, fontWeight = FontWeight.Bold, fontSize = 20.sp)
            Column(
                modifier = Modifier.align(Alignment.BottomEnd).padding(end = 10.dp, bottom = 14.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                IconButton(onClick = { scope.launch { runCatching { repository.reactToPost(reel.id) } } }) { Icon(Icons.Default.Favorite, "Like", tint = Color.White, modifier = Modifier.size(30.dp)) }
                Text(reel.likes.toString(), color = Color.White, style = MaterialTheme.typography.labelMedium)
                Spacer(modifier = Modifier.height(12.dp))
                IconButton(onClick = { onOpen(reel.id) }) { Icon(Icons.Default.Comment, "Comment", tint = Color.White, modifier = Modifier.size(30.dp)) }
                Text(reel.comments.toString(), color = Color.White, style = MaterialTheme.typography.labelMedium)
                Spacer(modifier = Modifier.height(12.dp))
                IconButton(onClick = onShare) { Icon(Icons.Default.Share, "Share", tint = Color.White, modifier = Modifier.size(30.dp)) }
                Text("Share", color = Color.White, style = MaterialTheme.typography.labelMedium)
            }

            Column(modifier = Modifier.align(Alignment.BottomStart).padding(start = 12.dp, end = 62.dp, bottom = 14.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.clickable { onAuthor(reel.authorId) }) {
                        TiwiAvatar(reel.authorAvatarUrl, R.drawable.img_tiwi_avatar_1, Modifier.size(32.dp).clip(CircleShape))
                        Spacer(modifier = Modifier.width(7.dp))
                        Text(reel.author, color = Color.White, fontWeight = FontWeight.Bold, maxLines = 1)
                        if (reel.verified) Icon(Icons.Default.Verified, null, tint = TiwiBlue, modifier = Modifier.padding(start = 3.dp).size(16.dp))
                    }
                    if (reel.authorId != repository.currentUserId()) {
                        Spacer(modifier = Modifier.width(9.dp))
                        Button(
                            onClick = { scope.launch { runCatching { repository.follow(reel.authorId, !reel.following) } } },
                            colors = ButtonDefaults.buttonColors(containerColor = Color.White, contentColor = Color.Black),
                            contentPadding = PaddingValues(horizontal = 10.dp, vertical = 0.dp),
                            modifier = Modifier.height(27.dp),
                            shape = RoundedCornerShape(7.dp)
                        ) { Text(if (reel.following) "Following" else "Follow", fontSize = 11.sp) }
                    }
                }
                if (reel.content.isNotBlank()) Text(reel.content, color = Color.White, maxLines = 2, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(top = 7.dp))
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 6.dp)) {
                    Icon(Icons.Default.MusicNote, null, Modifier.size(15.dp), Color.White)
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Original sound by ${reel.author}", color = Color.White, style = MaterialTheme.typography.labelSmall, maxLines = 1)
                }
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
private fun LegacyProfileScreen(repository: SocialRepository, posts: List<Post>, reels: List<Reel>, userId: String? = null, onBack: () -> Unit) {
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
                items(posts) { post -> PostCard(post, repository) }
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
fun ProfileScreen(
    repository: SocialRepository,
    posts: List<Post>,
    reels: List<Reel>,
    userId: String? = null,
    onBack: () -> Unit,
    onPostClick: (String) -> Unit = {},
    onMessage: (String) -> Unit = {}
) {
    var selectedTab by remember { mutableIntStateOf(0) }
    var isFollowing by remember { mutableStateOf(false) }
    var showEdit by remember { mutableStateOf(false) }
    var showVerified by remember { mutableStateOf(false) }
    var showMenu by remember { mutableStateOf(false) }
    val ownProfile by repository.profile.collectAsState()
    val ownUser by repository.currentUser.collectAsState()
    var remoteProfile by remember(userId) { mutableStateOf<SocialProfile?>(null) }
    val isOwn = userId.isNullOrBlank() || userId == repository.currentUserId()
    val profile = if (isOwn) ownProfile else remoteProfile
    val name = profile?.user?.name ?: ownUser?.name.orEmpty()
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    LaunchedEffect(userId) {
        val loaded = if (isOwn) runCatching { repository.refreshProfile() }.getOrNull()
        else runCatching { repository.refreshProfile(userId) }.getOrNull().also { remoteProfile = it }
        isFollowing = if (isOwn) false else loaded?.isFollowing == true
    }

    Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        Row(Modifier.fillMaxWidth().statusBarsPadding().height(48.dp).padding(horizontal = 2.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") }
            Text("@${profile?.username.orEmpty()}", modifier = Modifier.weight(1f), textAlign = TextAlign.Center, fontWeight = FontWeight.Bold)
            Box {
                IconButton(onClick = { showMenu = true }) { Icon(Icons.Default.MoreHoriz, "Menu") }
                DropdownMenu(expanded = showMenu, onDismissRequest = { showMenu = false }) {
                    if (!isOwn) DropdownMenuItem(text = { Text("Report profile") }, onClick = {
                        showMenu = false
                        userId?.let { scope.launch { runCatching { repository.reportContent("profile", it, "impersonation_or_abuse") }.onSuccess { Toast.makeText(context, "Report sent", Toast.LENGTH_SHORT).show() } } }
                    }) else DropdownMenuItem(text = { Text("Edit profile") }, onClick = { showMenu = false; showEdit = true })
                }
            }
        }
        HorizontalDivider(thickness = .5.dp, color = Color.LightGray.copy(alpha = .55f))
        LazyColumn(Modifier.weight(1f)) {
            item {
                if (!profile?.coverUrl.isNullOrBlank()) {
                    AsyncImage(
                        model = profile?.coverUrl,
                        contentDescription = "Cover photo",
                        modifier = Modifier.fillMaxWidth().height(132.dp),
                        contentScale = ContentScale.Crop
                    )
                }
                Row(Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                    TiwiAvatar(profile?.user?.avatar ?: ownUser?.avatar, R.drawable.img_tiwi_avatar_1, Modifier.size(86.dp).clip(CircleShape))
                    Row(Modifier.weight(1f), horizontalArrangement = Arrangement.SpaceEvenly) {
                        ProfileStatItem("Posts", (profile?.postCount ?: posts.size).toString())
                        ProfileStatItem("Followers", (profile?.followerCount ?: 0).toString())
                        ProfileStatItem("Following", (profile?.followingCount ?: 0).toString())
                    }
                }
                Column(Modifier.padding(horizontal = 14.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(name, fontWeight = FontWeight.Bold)
                        if (profile?.verified == true) Icon(Icons.Default.Verified, "Verified", tint = TiwiBlue, modifier = Modifier.padding(start = 3.dp).size(17.dp).clickable { showVerified = true })
                    }
                    if (!profile?.bio.isNullOrBlank()) Text(profile?.bio.orEmpty(), fontSize = 14.sp)
                    if (!profile?.category.isNullOrBlank()) Text(profile?.category.orEmpty(), color = Color.Gray, fontSize = 13.sp)
                    if (!profile?.location.isNullOrBlank()) Text(profile?.location.orEmpty(), fontSize = 13.sp)
                }
                Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 10.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    if (isOwn) ProfileActionButton("Edit profile", Modifier.weight(1f)) { showEdit = true }
                    else {
                        ProfileActionButton(if (isFollowing) "Following" else "Follow", Modifier.weight(1f), primary = !isFollowing) {
                            userId?.let { id -> scope.launch { runCatching { repository.follow(id, !isFollowing) }.onSuccess { isFollowing = it.isFollowing } } }
                        }
                        ProfileActionButton("Message", Modifier.weight(1f)) { userId?.let(onMessage) }
                    }
                    ProfileActionButton("Share profile", Modifier.weight(1f)) { Toast.makeText(context, "Profile link ready", Toast.LENGTH_SHORT).show() }
                }
                val highlights = posts.flatMap { it.media }.filter { it.type == "image" }.take(8)
                if (highlights.isNotEmpty()) LazyRow(contentPadding = PaddingValues(horizontal = 12.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    items(highlights) { media -> AsyncImage(model = media.url, contentDescription = null, modifier = Modifier.size(62.dp).clip(CircleShape), contentScale = ContentScale.Crop) }
                }
                Spacer(Modifier.height(8.dp))
            }
            item {
                TabRow(selectedTabIndex = selectedTab, containerColor = Color.Transparent, divider = {}, indicator = { positions -> TabRowDefaults.SecondaryIndicator(Modifier.tabIndicatorOffset(positions[selectedTab]), color = Color.Black) }) {
                    listOf(Icons.Outlined.GridOn, Icons.Outlined.SmartDisplay, Icons.Outlined.Info).forEachIndexed { index, icon ->
                        Tab(selected = selectedTab == index, onClick = { selectedTab = index }, icon = { Icon(icon, null) })
                    }
                }
            }
            when (selectedTab) {
                0 -> items(posts, key = { it.id }) { post -> PostCard(post, repository, onOpen = { onPostClick(post.id) }) }
                1 -> item { LazyRow(contentPadding = PaddingValues(4.dp), horizontalArrangement = Arrangement.spacedBy(2.dp)) { items(reels) { ReelItem(it) } } }
                else -> item {
                    Column(Modifier.padding(14.dp)) {
                        Text("About", fontWeight = FontWeight.Bold)
                        Text(profile?.about ?: profile?.bio.orEmpty())
                        if (!profile?.website.isNullOrBlank()) Text(profile?.website.orEmpty(), color = TiwiBlue)
                    }
                }
            }
        }
    }
    if (showEdit) EditProfileDialog(repository, profile, onDismiss = { showEdit = false })
    if (showVerified) VerifiedInfoSheet(name, profile?.user?.avatar, onDismiss = { showVerified = false })
}

@Composable
private fun ProfileActionButton(text: String, modifier: Modifier, primary: Boolean = false, onClick: () -> Unit) {
    Button(
        onClick = onClick,
        modifier = modifier.height(34.dp),
        contentPadding = PaddingValues(horizontal = 4.dp),
        shape = RoundedCornerShape(7.dp),
        elevation = ButtonDefaults.buttonElevation(0.dp),
        colors = ButtonDefaults.buttonColors(containerColor = if (primary) TiwiBlue else Color(0xFFEFEFEF), contentColor = if (primary) Color.White else Color.Black)
    ) { Text(text, fontSize = 12.sp, fontWeight = FontWeight.Bold, maxLines = 1) }
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
    var messageTab by remember { mutableIntStateOf(0) }
    val currentUserId = repository.currentUserId()
    val scope = rememberCoroutineScope()
    val contacts = remember(chats, currentUserId) { chats.mapNotNull { it.members.firstOrNull { member -> member.userId != currentUserId } }.distinctBy { it.userId } }
    val visibleChats = remember(chats, chatQuery, currentUserId, messageTab) {
        val byRequest = chats.filter { chat -> if (messageTab == 0) chat.requestStatus == "accepted" || chat.requestedById == currentUserId else chat.requestStatus == "pending" && chat.requestedById != currentUserId }
        if (chatQuery.isBlank()) byRequest else byRequest.filter { chat ->
            chat.title?.contains(chatQuery, true) == true || chat.members.any { it.userId != currentUserId && it.user.name.contains(chatQuery, true) }
        }
    }
    LaunchedEffect(Unit) { runCatching { repository.refreshConversations() } }
    Column(modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .statusBarsPadding()
                .height(48.dp)
                .padding(horizontal = 2.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, contentDescription = "Back") }
            Text("Chats", style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Bold))
            Spacer(modifier = Modifier.weight(1f))
            IconButton(onClick = { showNewMessage = true }) { Icon(Icons.Default.Edit, contentDescription = "New Message") }
        }
        HorizontalDivider(thickness = .5.dp, color = Color.LightGray.copy(alpha = .55f))

        TabRow(selectedTabIndex = messageTab, containerColor = Color.Transparent, divider = {}) {
            Tab(selected = messageTab == 0, onClick = { messageTab = 0 }, text = { Text("Chats", fontWeight = FontWeight.Bold) })
            Tab(selected = messageTab == 1, onClick = { messageTab = 1 }, text = { Text("Requests${chats.count { it.requestStatus == "pending" && it.requestedById != currentUserId }.let { if (it > 0) " ($it)" else "" }}", fontWeight = FontWeight.Bold) })
        }

        // Stories in Messenger style
        if (messageTab == 0) LazyRow(
            contentPadding = PaddingValues(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(16.dp),
            modifier = Modifier.padding(top = 8.dp, bottom = 10.dp)
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
            modifier = Modifier.padding(horizontal = 8.dp).fillMaxWidth().height(38.dp),
            color = Color(0xFFF1F1F1),
            shape = RoundedCornerShape(10.dp)
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

        Spacer(modifier = Modifier.height(4.dp))

        // Chat List
        LazyColumn {
            items(visibleChats, key = { it.id }) { chat ->
                val contact = chat.members.firstOrNull { it.userId != currentUserId }
                val name = chat.title ?: contact?.user?.name.orEmpty()
                val lastMsg = chat.lastMessage?.body.orEmpty()
                ListItem(
                    modifier = Modifier.clickable(enabled = chat.requestStatus == "accepted" || chat.requestedById == currentUserId) { onChatClick(chat) },
                    leadingContent = { TiwiAvatar(contact?.user?.avatar ?: chat.avatarUrl, R.drawable.img_tiwi_avatar_1, Modifier.size(56.dp).clip(CircleShape)) },
                    headlineContent = { Text(name, fontWeight = FontWeight.Bold) },
                    supportingContent = { Text(lastMsg, maxLines = 1, overflow = TextOverflow.Ellipsis) },
                    trailingContent = {
                        if (chat.requestStatus == "pending" && chat.requestedById != currentUserId) Row {
                            TextButton(onClick = { scope.launch { runCatching { repository.respondToMessageRequest(chat.id, false) } } }) { Text("Delete", color = Color.Gray) }
                            Button(onClick = { scope.launch { runCatching { repository.respondToMessageRequest(chat.id, true) } } }, contentPadding = PaddingValues(horizontal = 10.dp), modifier = Modifier.height(32.dp), shape = RoundedCornerShape(7.dp)) { Text("Accept", fontSize = 12.sp) }
                        } else if (chat.requestStatus == "pending") Text("Request sent", color = Color.Gray, fontSize = 11.sp)
                        else if (chat.unreadCount > 0) Badge { Text(chat.unreadCount.toString()) }
                        else Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Color.Gray, modifier = Modifier.size(14.dp))
                    },
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
    
    Column(modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background).imePadding()) {
        // Chat Header
        Surface(tonalElevation = 0.dp) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .statusBarsPadding()
                    .height(50.dp)
                    .padding(horizontal = 2.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, contentDescription = "Back") }
                TiwiAvatar(contact?.user?.avatar, R.drawable.img_tiwi_avatar_1, Modifier.size(36.dp).clip(CircleShape).clickable { contact?.userId?.let(onProfileClick) })
                Spacer(modifier = Modifier.width(7.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(name, fontWeight = FontWeight.Bold)
                    Text("Active now", style = MaterialTheme.typography.labelSmall, color = TiwiBlue)
                }
                IconButton(onClick = { onCall(false) }) { Icon(Icons.Default.Call, contentDescription = "Call", tint = TiwiBlue) }
                IconButton(onClick = { onCall(true) }) { Icon(Icons.Default.VideoCall, contentDescription = "Video Call", tint = TiwiBlue) }
                IconButton(onClick = { contact?.userId?.let(onProfileClick) }) { Icon(Icons.Default.Info, contentDescription = "Info", tint = TiwiBlue) }
            }
        }
        HorizontalDivider(thickness = .5.dp, color = Color.LightGray.copy(alpha = .55f))

        // Messages Area
        LazyColumn(
            modifier = Modifier.weight(1f).padding(horizontal = 8.dp),
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
                    Column(horizontalAlignment = if (isMe) Alignment.End else Alignment.Start) {
                    Surface(color = if (isMe) TiwiBlue else Color(0xFFF0F0F0), shape = RoundedCornerShape(18.dp), modifier = Modifier.widthIn(max = 280.dp).combinedClickable(
                        onClick = {}, onLongClick = { if (isMe && message.unsentAt == null && !message.id.startsWith("local-")) messageToUnsend = message }
                    )) {
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
                    if (isMe) Text(when (message.deliveryStatus) { "read" -> "Seen"; "delivered" -> "Delivered"; "sending" -> "Sending…"; "failed" -> "Failed"; else -> "Sent" }, color = Color.Gray, fontSize = 10.sp, modifier = Modifier.padding(end = 5.dp, top = 2.dp))
                    }
                }
            }
        }

        // Input Area
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .navigationBarsPadding()
                .padding(horizontal = 4.dp, vertical = 5.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = { filePicker.launch("*/*") }) { Icon(Icons.Default.AddCircle, contentDescription = "More", tint = TiwiBlue) }
            IconButton(onClick = { mediaPicker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) }) { Icon(Icons.Default.CameraAlt, contentDescription = "Camera", tint = TiwiBlue) }
            IconButton(onClick = { mediaPicker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageAndVideo)) }) { Icon(Icons.Default.Image, contentDescription = "Gallery", tint = TiwiBlue) }
            
            Surface(
                modifier = Modifier.weight(1f).height(40.dp),
                color = Color(0xFFF1F1F1),
                shape = RoundedCornerShape(20.dp)
            ) {
                TextField(
                    value = messageText,
                    onValueChange = { messageText = it },
                    placeholder = { Text("Aa", color = Color.Gray) },
                    modifier = Modifier.fillMaxSize(),
                    colors = TextFieldDefaults.colors(
                        focusedTextColor = Color.Black,
                        unfocusedTextColor = Color.Black,
                        cursorColor = TiwiBlue,
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
    var busy by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current

    when (step) {
        0 -> IdentifyAccountScreen(
            loading = busy,
            onBack = onBack,
            onNext = { e ->
                scope.launch {
                    if (busy) return@launch
                    busy = true
                    runCatching { repository.startPasswordReset(e) }
                        .onSuccess { challenge = it; email = it.destination.ifBlank { e }; step = 1 }
                        .onFailure { Toast.makeText(context, it.message ?: "Unable to send code", Toast.LENGTH_LONG).show() }
                    busy = false
                }
            }
        )
        1 -> OTPVerificationScreen(
            email = email,
            loading = busy,
            onBack = { step = 0 },
            onNext = { code ->
                scope.launch {
                    if (busy) return@launch
                    busy = true
                    val id = challenge?.challengeId ?: run { busy = false; return@launch }
                    runCatching { repository.verifyPasswordReset(id, code) }
                        .onSuccess { token -> otp = code; resetToken = token; step = 2 }
                        .onFailure { Toast.makeText(context, it.message ?: "Invalid code", Toast.LENGTH_LONG).show() }
                    busy = false
                }
            },
            onResend = {
                scope.launch {
                    challenge?.challengeId?.let { id -> runCatching { repository.resendPasswordReset(id) }.onSuccess { challenge = it } }
                }
            }
        )
        2 -> ResetPasswordScreen(
            loading = busy,
            onBack = { step = 1 },
            onComplete = { password ->
                scope.launch {
                    if (busy) return@launch
                    busy = true
                    runCatching { repository.resetPassword(resetToken, password) }
                        .onSuccess { onComplete() }
                        .onFailure { Toast.makeText(context, it.message ?: "Password reset failed", Toast.LENGTH_LONG).show() }
                    busy = false
                }
            }
        )
    }
}

@Composable
fun IdentifyAccountScreen(loading: Boolean = false, onBack: () -> Unit, onNext: (String) -> Unit) {
    var email by remember { mutableStateOf("") }
    
    Column(
        modifier = Modifier.fillMaxSize().background(Color.White).statusBarsPadding().padding(horizontal = 24.dp),
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
            enabled = email.isNotEmpty() && !loading
        ) {
            if (loading) CircularProgressIndicator(Modifier.size(18.dp), color = Color.White, strokeWidth = 2.dp) else Text("Send Login Code", color = Color.White, fontWeight = FontWeight.Bold)
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
fun OTPVerificationScreen(email: String, loading: Boolean = false, onBack: () -> Unit, onNext: (String) -> Unit, onResend: () -> Unit) {
    var otp by remember { mutableStateOf("") }
    var timer by remember { mutableIntStateOf(60) }
    
    LaunchedEffect(Unit) {
        while (timer > 0) {
            kotlinx.coroutines.delay(1000)
            timer--
        }
    }
    
    Column(
        modifier = Modifier.fillMaxSize().background(Color.White).statusBarsPadding().padding(horizontal = 24.dp),
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
            enabled = otp.length == 6 && !loading
        ) {
            if (loading) CircularProgressIndicator(Modifier.size(18.dp), color = Color.White, strokeWidth = 2.dp) else Text("Verify", color = Color.White, fontWeight = FontWeight.Bold)
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
fun ResetPasswordScreen(loading: Boolean = false, onBack: () -> Unit, onComplete: (String) -> Unit) {
    var password by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    
    Column(
        modifier = Modifier.fillMaxSize().background(Color.White).statusBarsPadding().padding(horizontal = 24.dp),
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
            enabled = password.isNotEmpty() && password == confirmPassword && !loading
        ) {
            if (loading) CircularProgressIndicator(Modifier.size(18.dp), color = Color.White, strokeWidth = 2.dp) else Text("Reset Password", color = Color.White, fontWeight = FontWeight.Bold)
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
