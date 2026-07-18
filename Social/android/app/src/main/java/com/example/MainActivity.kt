package com.example

import android.Manifest
import android.app.Activity
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.ClipData
import android.content.ClipboardManager
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.ImageDecoder
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.MediaPlayer
import android.media.MediaRecorder
import android.net.Uri
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.provider.MediaStore
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.widget.Toast
import android.widget.ImageView
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
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.Image
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items as gridItems
import androidx.compose.foundation.pager.VerticalPager
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.blur
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.layout.boundsInWindow
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.input.pointer.pointerInput
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
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.unit.Dp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import androidx.compose.foundation.border
import androidx.compose.foundation.BorderStroke
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.outlined.Send
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.view.WindowCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.work.WorkInfo
import androidx.work.WorkManager
import com.example.ui.theme.TiwiTheme
import com.example.ui.theme.TiwiBlue
import com.example.ui.theme.TiwiPurple
import com.example.ui.theme.TiwiPink
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.upstream.DefaultBandwidthMeter
import androidx.media3.datasource.cache.CacheDataSource
import androidx.media3.datasource.cache.LeastRecentlyUsedCacheEvictor
import androidx.media3.datasource.cache.SimpleCache
import androidx.media3.database.StandaloneDatabaseProvider
import androidx.media3.exoplayer.DefaultLoadControl
import androidx.media3.exoplayer.upstream.DefaultLoadErrorHandlingPolicy
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.trackselection.DefaultTrackSelector
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.ui.PlayerView
import com.example.social.SocialConversation
import com.example.social.SocialCallSession
import com.example.social.SocialComment
import com.example.social.SocialFeedModule
import com.example.social.SocialGroup
import com.example.social.SocialGroupMember
import com.example.social.SocialMedia
import com.example.social.SocialLinkPreview
import com.example.social.SocialLiveComment
import com.example.social.SocialLiveStream
import com.example.social.SocialMessage
import com.example.social.SocialNotification
import com.example.social.SocialCopyrightClaim
import com.example.social.SocialCopyrightStudio
import com.example.social.SocialPost
import com.example.social.SocialProfile
import com.example.social.SocialProfileDecoration
import com.example.social.SocialProfileEffectPlayback
import com.example.social.SocialRepository
import com.example.social.SocialStory
import com.example.social.SocialStoryGroup
import com.example.social.SocialUser
import com.example.social.SocialVerificationOptions
import com.example.social.SocialVerificationPackage
import com.example.social.PasswordResetChallenge
import com.example.social.PostUploadWorker
import com.example.social.WebRtcCallManager
import com.example.social.WebRtcLiveManager
import com.example.social.TiwiCallListenerService
import kotlinx.coroutines.delay
import kotlinx.coroutines.CoroutineExceptionHandler
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.flow.collect
import com.github.penfeizhou.animation.apng.APNGDrawable
import org.webrtc.EglBase
import org.webrtc.RendererCommon
import org.webrtc.SurfaceViewRenderer
import org.webrtc.VideoTrack
import java.io.File
import java.net.URL
import java.security.MessageDigest
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

val InstaBlue = Color(0xFF0095F6)
val FriendOrange = Color(0xFFFF4C29)
val FriendPurple = Color(0xFFB226DD)
val FriendBlue = Color(0xFF1186FF)
val TiwiBlack = Color(0xFF000000)

private object TiwiUiErrorReporter {
    private var lastShownAt = 0L
    private var lastMessage = ""

    @Synchronized
    fun show(context: Context, error: Throwable) {
        val network = error.message?.contains("network", ignoreCase = true) == true ||
            error.message?.contains("timeout", ignoreCase = true) == true ||
            error.message?.contains("unable to resolve", ignoreCase = true) == true
        val message = if (network) "Network is weak. Cached content remains available." else error.message ?: "Something went wrong. Please try again."
        val now = System.currentTimeMillis()
        if (message == lastMessage && now - lastShownAt < 4_000L) return
        lastShownAt = now
        lastMessage = message
        Handler(Looper.getMainLooper()).post {
            Toast.makeText(context.applicationContext, message, Toast.LENGTH_SHORT).show()
        }
    }
}

@Composable
private fun rememberTiwiCoroutineScope(): CoroutineScope {
    val context = LocalContext.current.applicationContext
    val scope = remember(context) {
        CoroutineScope(
            SupervisorJob() + Dispatchers.Main.immediate + CoroutineExceptionHandler { _, error ->
                TiwiUiErrorReporter.show(context, error)
            }
        )
    }
    DisposableEffect(scope) { onDispose { scope.cancel() } }
    return scope
}

class MainActivity : ComponentActivity() {
    private var pendingDeepLink by mutableStateOf<String?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        pendingDeepLink = intent?.dataString
        enableEdgeToEdge()
        setContent {
            TiwiTheme {
                val repository = remember { SocialRepository(applicationContext) }
                MainNavigation(repository, pendingDeepLink) { pendingDeepLink = null }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        pendingDeepLink = intent.dataString
    }
}

@Composable
fun MainNavigation(repository: SocialRepository, deepLink: String? = null, onDeepLinkConsumed: () -> Unit = {}) {
    var currentScreen by remember { mutableStateOf("splash") }
    val currentUser by repository.currentUser.collectAsState()
    fun signedInDestination() = when {
        repository.isAccountRestricted() -> "disabled"
        repository.requiresEmailVerification() -> "verification"
        else -> "main"
    }
    LaunchedEffect(currentUser?.status, currentUser?.emailVerifiedAt, currentScreen) {
        if (currentScreen != "splash" && currentScreen != "auth") {
            val destination = signedInDestination()
            if (destination != "main" || currentScreen == "disabled" || currentScreen == "verification") currentScreen = destination
        }
    }
    
    when (currentScreen) {
        "splash" -> SplashScreen(onFinished = { currentScreen = if (!repository.hasSavedSession()) "auth" else signedInDestination() })
        "auth" -> AuthScreen(repository, onLoginSuccess = { currentScreen = signedInDestination() })
        "verification" -> EmailVerificationScreen(repository, onVerified = { currentScreen = "main" }, onLogout = { repository.logout(); currentScreen = "auth" })
        "main" -> TiwiApp(repository, onLogout = { currentScreen = "auth" }, initialDeepLink = deepLink, onDeepLinkConsumed = onDeepLinkConsumed)
        "disabled" -> DisabledAccountScreen(repository, onLogout = { repository.logout(); currentScreen = "auth" })
    }
}

@Composable
private fun EmailVerificationScreen(repository: SocialRepository, onVerified: () -> Unit, onLogout: () -> Unit) {
    val context = LocalContext.current
    val user by repository.currentUser.collectAsState()
    val scope = rememberTiwiCoroutineScope()
    var busy by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) {
        while (repository.requiresEmailVerification()) {
            delay(5000)
            runCatching { repository.validateSession() }
            if (!repository.requiresEmailVerification()) onVerified()
        }
    }
    Column(
        Modifier.fillMaxSize().background(Color.White).statusBarsPadding().navigationBarsPadding().padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Box(Modifier.size(84.dp).background(Color(0xFFEAF4FF), CircleShape), contentAlignment = Alignment.Center) {
            Icon(Icons.Default.MarkEmailUnread, null, tint = InstaBlue, modifier = Modifier.size(40.dp))
        }
        Spacer(Modifier.height(20.dp))
        Text("Verify your email", fontSize = 27.sp, fontWeight = FontWeight.ExtraBold, color = Color(0xFF101828))
        Spacer(Modifier.height(10.dp))
        Text("We sent a verification link to ${user?.email.orEmpty()}. Open the link, then return here. Email verification is required before Tiwi Social can be used.", textAlign = TextAlign.Center, color = Color(0xFF475467), lineHeight = 21.sp)
        Spacer(Modifier.height(24.dp))
        Button(onClick = {
            runCatching { context.startActivity(Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_APP_EMAIL).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }
                .onFailure { Toast.makeText(context, "Open your email app to continue", Toast.LENGTH_LONG).show() }
        }, modifier = Modifier.fillMaxWidth().height(48.dp), shape = RoundedCornerShape(8.dp)) { Text("Open email app", fontWeight = FontWeight.Bold) }
        Spacer(Modifier.height(10.dp))
        OutlinedButton(enabled = !busy, onClick = {
            scope.launch {
                busy = true
                runCatching { repository.resendEmailVerification() }
                    .onSuccess { Toast.makeText(context, "Verification email sent", Toast.LENGTH_LONG).show() }
                    .onFailure { Toast.makeText(context, it.message ?: "Could not resend email", Toast.LENGTH_LONG).show() }
                busy = false
            }
        }, modifier = Modifier.fillMaxWidth().height(48.dp), shape = RoundedCornerShape(8.dp)) {
            if (busy) CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp) else Text("Resend verification email", fontWeight = FontWeight.Bold)
        }
        TextButton(onClick = onLogout) { Text("Sign out", color = Color.Gray) }
    }
}

@Composable
private fun DisabledAccountScreen(repository: SocialRepository, onLogout: () -> Unit) {
    val context = LocalContext.current
    val user by repository.currentUser.collectAsState()
    val scope = rememberTiwiCoroutineScope()
    var busy by remember { mutableStateOf(false) }
    var pendingExport by remember { mutableStateOf<String?>(null) }
    val createDocument = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("application/json")) { uri ->
        val json = pendingExport
        if (uri != null && json != null) {
            runCatching { context.contentResolver.openOutputStream(uri)?.bufferedWriter()?.use { it.write(json) } }
                .onSuccess { Toast.makeText(context, "Your information was downloaded", Toast.LENGTH_LONG).show() }
                .onFailure { Toast.makeText(context, it.message ?: "Download failed", Toast.LENGTH_LONG).show() }
        }
        pendingExport = null
        busy = false
    }
    val view = LocalView.current
    val activity = context as? Activity
    SideEffect {
        activity?.window?.let { window ->
            window.statusBarColor = Color.White.toArgb()
            window.navigationBarColor = Color.White.toArgb()
            WindowCompat.getInsetsController(window, view).apply {
                isAppearanceLightStatusBars = true
                isAppearanceLightNavigationBars = true
            }
        }
    }
    LaunchedEffect(Unit) {
        while (true) {
            delay(10000)
            runCatching { repository.validateSession() }
        }
    }
    val restrictionReason = remember(user?.socialRestrictionCode, user?.socialRestrictionReason) {
        val code = user?.socialRestrictionCode.orEmpty().lowercase()
        val raw = user?.socialRestrictionReason.orEmpty()
        if (code.contains("sexual") || code.contains("porn") || raw.contains("porn", true) || raw.contains("nude", true) || raw.contains("sexual", true)) {
            "Pornographic, nude, or explicitly sexual media was detected by Tiwi automated safety."
        } else raw.ifBlank { "This account was restricted after an automated safety review." }
    }
    Column(
        Modifier.fillMaxSize().background(Color.White).statusBarsPadding().navigationBarsPadding().padding(horizontal = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Box(Modifier.size(82.dp).background(Color(0xFFFFF1F0), CircleShape), contentAlignment = Alignment.Center) {
            Icon(Icons.Default.Lock, null, tint = Color(0xFFD92D20), modifier = Modifier.size(38.dp))
        }
        Spacer(Modifier.height(20.dp))
        Text("Account disabled", fontSize = 27.sp, fontWeight = FontWeight.ExtraBold, color = Color(0xFF101828))
        Spacer(Modifier.height(10.dp))
        Text(
            "You have 180 days to request a review. $restrictionReason After that, your account and information may be permanently removed.",
            textAlign = TextAlign.Center,
            color = Color(0xFF475467),
            lineHeight = 21.sp,
            modifier = Modifier.padding(horizontal = 4.dp)
        )
        Spacer(Modifier.height(24.dp))
        Button(
            enabled = !busy,
            onClick = {
                scope.launch {
                    busy = true
                    runCatching { repository.exportAccountDataJson() }
                        .onSuccess { json -> pendingExport = json; createDocument.launch("tiwi-account-information.json") }
                        .onFailure { busy = false; Toast.makeText(context, it.message ?: "Download failed", Toast.LENGTH_LONG).show() }
                }
            },
            modifier = Modifier.fillMaxWidth().height(48.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Color.White, contentColor = Color(0xFF101828)),
            border = BorderStroke(1.dp, Color(0xFFD0D5DD)),
            shape = RoundedCornerShape(8.dp)
        ) {
            if (busy) CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp, color = TiwiBlue)
            else { Icon(Icons.Default.Download, null); Spacer(Modifier.width(8.dp)); Text("Download your information", fontWeight = FontWeight.Bold) }
        }
        Spacer(Modifier.height(10.dp))
        Button(
            onClick = { context.startActivity(Intent(Intent.ACTION_VIEW, android.net.Uri.parse("https://tiwlo.com/support"))) },
            modifier = Modifier.fillMaxWidth().height(48.dp),
            colors = ButtonDefaults.buttonColors(containerColor = TiwiBlue),
            shape = RoundedCornerShape(8.dp)
        ) { Text("Contact support", fontWeight = FontWeight.Bold) }
        TextButton(onClick = onLogout, modifier = Modifier.padding(top = 6.dp)) { Text("Sign out", color = Color(0xFF475467)) }
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
    val scope = rememberTiwiCoroutineScope()
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
                            if (isLogin) onLoginSuccess() else onLoginSuccess()
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
    val authorDecoration: SocialProfileDecoration? = null,
    val content: String,
    val image: Int? = null,
    val imageUrl: String? = null,
    val videoUrl: String? = null,
    val media: List<SocialMedia> = emptyList(),
    val metadata: Map<String, Any?> = emptyMap(),
    val time: String,
    val likes: Int,
    val comments: Int,
    val shares: Int,
    val saves: Int = 0,
    val views: Int = 0,
    val liked: Boolean = false,
    val verified: Boolean = false,
    val badgeType: String = "none",
    val following: Boolean = false,
    val visibility: String = "public",
    val commentPermission: String = "everyone",
    val pinned: Boolean = false,
    val saved: Boolean = false,
    val recommended: Boolean = false,
    val recommendationLabel: String? = null,
    val publishedAt: String? = null
)

data class Reel(
    val id: String,
    val authorId: String,
    val author: String,
    val authorAvatarUrl: String? = null,
    val authorDecoration: SocialProfileDecoration? = null,
    val collaborators: List<SocialProfile> = emptyList(),
    val thumbnail: Int,
    val thumbnailUrl: String? = null,
    val videoUrl: String? = null,
    val fallbackVideoUrl: String? = null,
    val media: List<SocialMedia> = emptyList(),
    val musicTitle: String? = null,
    val content: String = "",
    val likes: Int = 0,
    val comments: Int = 0,
    val views: Int = 0,
    val liked: Boolean = false,
    val following: Boolean = false,
    val verified: Boolean = false,
    val badgeType: String = "none",
    val publishedAt: String? = null
)

private data class TiwiCallRequest(
    val conversationId: String?,
    val peerId: String,
    val peerName: String,
    val peerAvatar: String?,
    val video: Boolean,
    val incoming: SocialCallSession? = null
)

private fun relativePostTime(value: String?): String {
    if (value.isNullOrBlank()) return "Just now"
    val parsed = listOf("yyyy-MM-dd'T'HH:mm:ss.SSSX", "yyyy-MM-dd'T'HH:mm:ssX", "yyyy-MM-dd'T'HH:mm:ss.SSSXXX", "yyyy-MM-dd'T'HH:mm:ssXXX")
        .firstNotNullOfOrNull { pattern -> runCatching { SimpleDateFormat(pattern, Locale.US).apply { timeZone = TimeZone.getTimeZone("UTC") }.parse(value) }.getOrNull() }
        ?: return value.replace('T', ' ').take(16)
    val elapsed = (System.currentTimeMillis() - parsed.time).coerceAtLeast(0L)
    val minutes = elapsed / 60_000L
    val hours = elapsed / 3_600_000L
    val days = elapsed / 86_400_000L
    return when {
        minutes < 1 -> "Just now"
        minutes < 60 -> "$minutes min ago"
        hours == 1L -> "an hour ago"
        hours < 24 -> "$hours hours ago"
        days == 1L -> "a day ago"
        days < 7 -> "$days days ago"
        else -> {
            val nowYear = SimpleDateFormat("yyyy", Locale.US).format(Date())
            val itemYear = SimpleDateFormat("yyyy", Locale.US).format(parsed)
            SimpleDateFormat(if (nowYear == itemYear) "MMM d" else "MMM d, yyyy", Locale.US).format(parsed)
        }
    }
}

private fun socialPresenceAge(value: String?): Long? {
    if (value.isNullOrBlank()) return null
    val parsed = listOf("yyyy-MM-dd'T'HH:mm:ss.SSSX", "yyyy-MM-dd'T'HH:mm:ssX", "yyyy-MM-dd'T'HH:mm:ss.SSSXXX", "yyyy-MM-dd'T'HH:mm:ssXXX")
        .firstNotNullOfOrNull { pattern -> runCatching { SimpleDateFormat(pattern, Locale.US).apply { timeZone = TimeZone.getTimeZone("UTC") }.parse(value) }.getOrNull() }
        ?: return null
    return (System.currentTimeMillis() - parsed.time).coerceAtLeast(0L)
}

private fun isSociallyActive(value: String?): Boolean = (socialPresenceAge(value) ?: Long.MAX_VALUE) <= 120_000L

private fun socialPresenceLabel(value: String?): String = when {
    isSociallyActive(value) -> "Active now"
    value.isNullOrBlank() -> "Offline"
    else -> "Active ${relativePostTime(value)}"
}

private fun formatCount(value: Int): String = when {
    value < 1_000 -> value.toString()
    value < 1_000_000 -> String.format(Locale.US, if (value < 10_000 && value % 1_000 != 0) "%.1fK" else "%.0fK", value / 1_000.0)
    else -> String.format(Locale.US, if (value < 10_000_000 && value % 1_000_000 != 0) "%.1fM" else "%.0fM", value / 1_000_000.0)
}

internal fun linkedSharedPostId(media: SocialMedia): String? = media.sharedRootPostId ?: media.sharedPostId

private fun isWithinDashboardRange(value: String?, range: String): Boolean {
    val date = parseSocialDate(value) ?: return range == "28 days"
    val elapsed = (System.currentTimeMillis() - date.time).coerceAtLeast(0L)
    return when (range) {
        "Today" -> elapsed < 86_400_000L
        "7 days" -> elapsed < 7L * 86_400_000L
        else -> elapsed < 28L * 86_400_000L
    }
}

private fun parseSocialDate(value: String?): Date? {
    if (value.isNullOrBlank()) return null
    return listOf("yyyy-MM-dd'T'HH:mm:ss.SSSX", "yyyy-MM-dd'T'HH:mm:ssX", "yyyy-MM-dd'T'HH:mm:ss.SSSXXX", "yyyy-MM-dd'T'HH:mm:ssXXX")
        .firstNotNullOfOrNull { pattern ->
            runCatching { SimpleDateFormat(pattern, Locale.US).apply { timeZone = TimeZone.getTimeZone("UTC") }.parse(value) }.getOrNull()
        }
}

private fun messageClock(value: String?): String = parseSocialDate(value)?.let {
    SimpleDateFormat("h:mm a", Locale.US).format(it)
} ?: ""

private fun messageDay(value: String?): String = parseSocialDate(value)?.let {
    val today = SimpleDateFormat("yyyyMMdd", Locale.US).format(Date())
    val day = SimpleDateFormat("yyyyMMdd", Locale.US).format(it)
    if (today == day) "Today" else SimpleDateFormat("EEE, MMM d", Locale.US).format(it)
} ?: ""

private data class TiwiCallEvent(val type: String, val status: String, val startedAt: String, val endedAt: String, val callerId: String)

private fun parseCallEvent(body: String): TiwiCallEvent? {
    val parts = body.split('|')
    if (parts.size != 6 || parts.first() != "__tiwi_call__") return null
    return TiwiCallEvent(parts[1], parts[2], parts[3], parts[4], parts[5])
}

private fun callEventLabel(event: TiwiCallEvent, currentUserId: String?): String {
    val type = if (event.type == "video") "Video call" else "Audio call"
    if (event.status in listOf("missed", "declined", "failed")) {
        val incoming = event.callerId != currentUserId
        return when (event.status) {
            "missed" -> if (incoming) "Missed $type" else "No answer"
            "declined" -> if (incoming) "Declined $type" else "$type declined"
            else -> "$type failed"
        }
    }
    val durationSeconds = (((parseSocialDate(event.endedAt)?.time ?: 0L) - (parseSocialDate(event.startedAt)?.time ?: 0L)) / 1000L).coerceAtLeast(0L)
    val duration = when {
        durationSeconds < 60 -> "${durationSeconds}s"
        durationSeconds < 3600 -> "${durationSeconds / 60}m ${durationSeconds % 60}s"
        else -> "${durationSeconds / 3600}h ${(durationSeconds % 3600) / 60}m"
    }
    return "$type · $duration"
}

private fun messagePreview(message: SocialMessage?, currentUserId: String?): String {
    if (message == null) return "Start a conversation"
    if (message.unsentAt != null) return "Message unsent"
    parseCallEvent(message.body)?.let { return callEventLabel(it, currentUserId) }
    if (message.body.isNotBlank()) return message.body
    return when (message.media.firstOrNull()?.type) { "video" -> "Video"; "image" -> "Photo"; "audio" -> "Voice message"; else -> "Attachment" }
}

private fun toUiPost(value: SocialPost): Post {
    val media = value.media.firstOrNull()
    return Post(
        id = value.id,
        authorId = value.authorId,
        author = value.author.name.ifBlank { value.authorProfile?.username ?: "Tiwi User" },
        authorAvatar = R.drawable.img_tiwi_logo,
        authorAvatarUrl = value.author.avatar,
        authorDecoration = value.authorProfile?.avatarDecoration,
        content = value.body,
        imageUrl = media?.takeUnless { it.type == "video" }?.url,
        videoUrl = if (media?.type == "video") media.hlsUrl.takeIf { media.processingStatus == "ready" } ?: media.url else null,
        media = value.media,
        metadata = value.metadata,
        time = relativePostTime(value.publishedAt),
        likes = value.reactionCount,
        comments = value.commentCount,
        shares = value.shareCount,
        saves = value.saveCount,
        views = value.viewCount,
        liked = value.viewerReaction == "like",
        verified = value.authorProfile?.verified == true,
        badgeType = value.authorProfile?.badgeType ?: if (value.authorProfile?.verified == true) "blue" else "none",
        following = value.authorProfile?.isFollowing == true,
        visibility = value.visibility,
        commentPermission = value.commentPermission,
        pinned = value.pinned,
        saved = value.saved,
        recommended = value.recommended,
        recommendationLabel = value.recommendationLabel,
        publishedAt = value.publishedAt
    )
}

private fun toUiReel(value: SocialPost): Reel {
    val media = value.media.firstOrNull()
    return Reel(
        id = value.id,
        authorId = value.authorId,
        author = value.author.name.ifBlank { value.authorProfile?.username ?: "Tiwi User" },
        authorAvatarUrl = value.author.avatar,
        authorDecoration = value.authorProfile?.avatarDecoration,
        collaborators = value.collaborators,
        thumbnail = R.drawable.img_tiwi_logo,
        thumbnailUrl = value.thumbnailUrl ?: media?.thumbnailUrl ?: media?.takeUnless { it.type == "video" }?.url,
        videoUrl = media?.hlsUrl?.takeIf { media.processingStatus == "ready" } ?: media?.url ?: value.hlsUrl,
        fallbackVideoUrl = media?.url,
        media = value.media,
        musicTitle = value.metadata["music"]?.toString(),
        content = value.body,
        likes = value.reactionCount,
        comments = value.commentCount,
        views = value.viewCount,
        liked = value.viewerReaction == "like",
        following = value.authorProfile?.isFollowing == true,
        verified = value.authorProfile?.verified == true,
        badgeType = value.authorProfile?.badgeType ?: if (value.authorProfile?.verified == true) "blue" else "none",
        publishedAt = value.publishedAt
    )
}

@Composable
private fun TiwiAvatar(url: String?, fallback: Int, modifier: Modifier, contentScale: ContentScale = ContentScale.Crop) {
    if (!url.isNullOrBlank()) AsyncImage(model = url, contentDescription = null, modifier = modifier, contentScale = contentScale)
    else Image(painter = painterResource(fallback), contentDescription = null, modifier = modifier, contentScale = contentScale)
}

@Composable
private fun AnimatedProfileDecoration(
    url: String,
    modifier: Modifier = Modifier,
    loopLimit: Int = 0,
    scaleType: ImageView.ScaleType = ImageView.ScaleType.FIT_CENTER
) {
    val context = LocalContext.current
    var localFile by remember(url) { mutableStateOf<File?>(null) }
    LaunchedEffect(url) {
        localFile = withContext(Dispatchers.IO) {
            runCatching {
                val digest = MessageDigest.getInstance("SHA-256").digest(url.toByteArray()).joinToString("") { "%02x".format(it) }
                val directory = File(context.cacheDir, "profile-decorations").apply { mkdirs() }
                val output = File(directory, "$digest.png")
                if (!output.exists() || output.length() == 0L) {
                    val temporary = File(directory, "$digest.download")
                    URL(url).openConnection().apply {
                        connectTimeout = 15_000
                        readTimeout = 30_000
                        setRequestProperty("User-Agent", "Tiwi-Social-Android")
                    }.getInputStream().use { input -> temporary.outputStream().use { outputStream -> input.copyTo(outputStream) } }
                    if (!temporary.renameTo(output)) {
                        temporary.copyTo(output, overwrite = true)
                        temporary.delete()
                    }
                }
                output
            }.getOrNull()
        }
    }
    val file = localFile
    if (file == null) {
        AsyncImage(url, "Profile decoration", modifier, contentScale = ContentScale.Fit)
    } else {
        AndroidView(
            factory = { ImageView(it).apply { this.scaleType = scaleType; isClickable = false; isFocusable = false } },
            update = { imageView ->
                imageView.scaleType = scaleType
                val renderKey = "${file.absolutePath}:$loopLimit:${scaleType.name}"
                if (imageView.tag != renderKey) {
                    (imageView.drawable as? APNGDrawable)?.stop()
                    imageView.setImageDrawable(APNGDrawable.fromFile(file.absolutePath).apply {
                        if (loopLimit > 0) setLoopLimit(loopLimit)
                    })
                    imageView.tag = renderKey
                }
            },
            modifier = modifier
        )
    }
}

@Composable
private fun ProfileDecorationImage(url: String, modifier: Modifier = Modifier, animated: Boolean = false) {
    if (animated) AnimatedProfileDecoration(url, modifier)
    else AsyncImage(url, "Profile decoration", modifier, contentScale = ContentScale.Fit)
}

@Composable
private fun DecoratedAvatar(
    url: String?,
    fallback: Int,
    decoration: SocialProfileDecoration?,
    modifier: Modifier,
    contentScale: ContentScale = ContentScale.Crop,
    animateDecoration: Boolean = false
) {
    val decorationUrl = decoration?.assetUrl?.takeIf { it.isNotBlank() }
    Box(modifier, contentAlignment = Alignment.Center) {
        if (decorationUrl != null) {
            Box(Modifier.fillMaxSize(.87f).clip(CircleShape).background(Color.White))
        }
        TiwiAvatar(
            url,
            fallback,
            Modifier.fillMaxSize(if (decorationUrl != null) .82f else 1f).clip(CircleShape),
            contentScale
        )
        decorationUrl?.let {
            ProfileDecorationImage(
                it,
                Modifier.matchParentSize().graphicsLayer(scaleX = 1.03f, scaleY = 1.03f),
                animated = animateDecoration
            )
        }
    }
}

@Composable
private fun ProfileEffectImage(effect: SocialProfileDecoration?, modifier: Modifier, loopLimit: Int = 2) {
    val url = effect?.assetUrl?.takeIf { it.isNotBlank() } ?: return
    if (effect.animated) AnimatedProfileDecoration(url, modifier, loopLimit, ImageView.ScaleType.FIT_XY)
    else AsyncImage(url, "Profile effect", modifier, contentScale = ContentScale.FillBounds)
}

@Composable
private fun MiniProfileEffectPreview(
    repository: SocialRepository,
    avatarUrl: String?,
    coverUrl: String?,
    effect: SocialProfileDecoration?,
    modifier: Modifier = Modifier
) {
    BoxWithConstraints(modifier.clip(RoundedCornerShape(16.dp)).background(Color.White)) {
        val tiny = maxHeight < 140.dp
        val compact = maxHeight < 200.dp
        val headerHeight = if (tiny) 48.dp else if (compact) 62.dp else 96.dp
        val coverHeight = if (tiny) 34.dp else if (compact) 45.dp else 72.dp
        val avatarSize = if (tiny) 28.dp else if (compact) 36.dp else 50.dp
        val horizontal = if (compact) 7.dp else 11.dp
        Column(Modifier.fillMaxSize()) {
            Box(Modifier.fillMaxWidth().height(headerHeight)) {
                TiwiAvatar(coverUrl, R.drawable.img_tiwi_cover, Modifier.fillMaxWidth().height(coverHeight), ContentScale.Crop)
                TiwiAvatar(
                    avatarUrl,
                    R.drawable.img_tiwi_avatar_1,
                    Modifier.align(Alignment.BottomStart).padding(start = horizontal).size(avatarSize).clip(CircleShape).border(2.dp, Color.White, CircleShape),
                    ContentScale.Crop
                )
            }
            Column(Modifier.padding(horizontal = horizontal)) {
                Text(repository.currentUser.value?.name?.ifBlank { "Tiwi profile" } ?: "Tiwi profile", fontWeight = FontWeight.ExtraBold, fontSize = if (tiny) 8.sp else if (compact) 10.sp else 13.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                if (!tiny) Text("@${repository.profile.value?.username.orEmpty()}", color = Color(0xFF667085), fontSize = if (compact) 7.sp else 9.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
            if (!compact) Row(Modifier.fillMaxWidth().padding(top = 6.dp), horizontalArrangement = Arrangement.SpaceEvenly) {
                listOf("Posts", "Followers", "Following").forEach { label -> Column(horizontalAlignment = Alignment.CenterHorizontally) { Text("12", fontWeight = FontWeight.Bold, fontSize = 10.sp); Text(label, color = Color.Gray, fontSize = 7.sp) } }
            }
            Spacer(Modifier.height(if (tiny) 4.dp else 6.dp))
            Box(Modifier.fillMaxWidth().padding(horizontal = horizontal).height(if (tiny) 12.dp else if (compact) 17.dp else 25.dp).background(Color(0xFFF0F2F5), RoundedCornerShape(6.dp)))
            if (!tiny) repeat(if (compact) 1 else 2) { Box(Modifier.fillMaxWidth().padding(horizontal = horizontal, vertical = 3.dp).height(if (compact) 18.dp else 27.dp).background(Color(0xFFF7F8FA), RoundedCornerShape(6.dp))) }
        }
        ProfileEffectImage(effect, Modifier.matchParentSize(), loopLimit = 2)
    }
}

@Composable
private fun MarketplaceLoadingPlaceholder(modifier: Modifier = Modifier) {
    val alpha by rememberInfiniteTransition(label = "marketplace-placeholder").animateFloat(
        initialValue = .42f, targetValue = .8f,
        animationSpec = infiniteRepeatable(tween(800), repeatMode = RepeatMode.Reverse), label = "marketplace-placeholder-alpha"
    )
    val shade = Color(0xFFDDE2EA).copy(alpha = alpha)
    Column(modifier.padding(horizontal = 14.dp, vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Box(Modifier.width(150.dp).height(18.dp).background(shade, RoundedCornerShape(8.dp)))
        Row(horizontalArrangement = Arrangement.spacedBy(9.dp)) { repeat(3) { Box(Modifier.weight(1f).height(136.dp).background(shade, RoundedCornerShape(14.dp))) } }
        Box(Modifier.width(112.dp).height(18.dp).background(shade, RoundedCornerShape(8.dp)))
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) { repeat(2) { Box(Modifier.weight(1f).height(198.dp).background(shade, RoundedCornerShape(14.dp))) } }
    }
}

@Composable
private fun VerifiedBadge(badgeType: String?, size: Dp, modifier: Modifier = Modifier, onClick: (() -> Unit)? = null) {
    val type = badgeType?.lowercase() ?: "blue"
    val badgeModifier = if (onClick != null) modifier.clickable(onClick = onClick) else modifier
    Icon(
        Icons.Default.Verified,
        contentDescription = if (type == "gold") "Gold verified" else "Verified",
        tint = if (type == "gold") Color(0xFFF4B400) else TiwiBlue,
        modifier = badgeModifier.size(size)
    )
}

@Composable
private fun ExploreImage(url: String?, modifier: Modifier) {
    if (!url.isNullOrBlank()) AsyncImage(model = url, contentDescription = null, modifier = modifier, contentScale = ContentScale.Crop)
    else Box(modifier.background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.35f)))
}

@OptIn(UnstableApi::class)
private object TiwiPlaybackCache {
    @Volatile private var cache: SimpleCache? = null

    @Synchronized
    private fun cache(context: Context): SimpleCache = cache ?: SimpleCache(
        File(context.applicationContext.cacheDir, "tiwi_video_cache"),
        LeastRecentlyUsedCacheEvictor(192L * 1024L * 1024L),
        StandaloneDatabaseProvider(context.applicationContext)
    ).also { cache = it }

    fun player(context: Context): ExoPlayer {
        // Avoid leaving a stalled reel on its poster indefinitely on weak mobile data.
        val upstream = DefaultHttpDataSource.Factory().setAllowCrossProtocolRedirects(true).setConnectTimeoutMs(8_000).setReadTimeoutMs(15_000)
        val dataSource = CacheDataSource.Factory().setCache(cache(context)).setUpstreamDataSourceFactory(upstream).setFlags(CacheDataSource.FLAG_IGNORE_CACHE_ON_ERROR)
        val capabilities = context.getSystemService(ConnectivityManager::class.java)
            ?.let { manager -> manager.activeNetwork?.let(manager::getNetworkCapabilities) }
        val reportedBandwidth = capabilities?.linkDownstreamBandwidthKbps?.takeIf { it > 0 }?.toLong()?.times(1_000L)
        val conservativeEstimate = when {
            reportedBandwidth != null -> (reportedBandwidth * 65L / 100L).coerceIn(220_000L, 25_000_000L)
            capabilities?.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) == true -> 750_000L
            capabilities?.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) == true -> 8_000_000L
            else -> 3_000_000L
        }
        val bandwidthMeter = DefaultBandwidthMeter.Builder(context)
            .setInitialBitrateEstimate(conservativeEstimate)
            .build()
        val trackSelector = DefaultTrackSelector(context).apply {
            parameters = buildUponParameters()
                .setAllowVideoMixedMimeTypeAdaptiveness(true)
                .setAllowVideoNonSeamlessAdaptiveness(true)
                .build()
        }
        val loadControl = DefaultLoadControl.Builder()
            .setBufferDurationsMs(2_500, 20_000, 500, 1_200)
            .setPrioritizeTimeOverSizeThresholds(true)
            .build()
        return ExoPlayer.Builder(context)
            .setBandwidthMeter(bandwidthMeter)
            .setTrackSelector(trackSelector)
            .setMediaSourceFactory(DefaultMediaSourceFactory(dataSource).setLoadErrorHandlingPolicy(DefaultLoadErrorHandlingPolicy(5)))
            .setLoadControl(loadControl)
            .build()
    }
}

private object TiwiPlaybackCoordinator {
    private val scores = mutableMapOf<String, Float>()
    var activeId by mutableStateOf<String?>(null)
        private set

    @Synchronized
    fun update(id: String, score: Float, eligible: Boolean) {
        // Start preparing the nearest visible item before it reaches the exact
        // centre.  The old .55 threshold left videos at their thumbnail until a
        // manual tap on some screen sizes.
        if (eligible && score >= .28f) scores[id] = score else scores.remove(id)
        activeId = scores.maxByOrNull { it.value }?.key
    }

    @Synchronized
    fun activate(id: String) {
        scores[id] = 2f
        activeId = id
    }

    @Synchronized
    fun remove(id: String) {
        scores.remove(id)
        if (activeId == id) activeId = scores.maxByOrNull { it.value }?.key
    }
}

internal fun shouldOwnVideoPlayer(
    visibleEnough: Boolean,
    autoplay: Boolean,
    startRequested: Boolean,
    coordinated: Boolean = false,
    isActivePlayer: Boolean = true
): Boolean = visibleEnough && (autoplay || startRequested) && (!coordinated || isActivePlayer)

@OptIn(UnstableApi::class)
@Composable
private fun TiwiVideo(
    url: String,
    modifier: Modifier,
    autoplay: Boolean = false,
    fallbackUrl: String? = null,
    posterUrl: String? = null,
    posterContentScale: ContentScale = ContentScale.Crop,
    muted: Boolean = false,
    previewClipMs: Long? = null,
    coordinated: Boolean = true,
    interactive: Boolean = true,
    showScrubber: Boolean = false,
    scrubberColor: Color = Color.White
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    var activeUrl by remember(url, fallbackUrl) { mutableStateOf(url) }
    var visibleEnough by remember(url) { mutableStateOf(false) }
    var renderedFirstFrame by remember(activeUrl) { mutableStateOf(false) }
    var buffering by remember(activeUrl) { mutableStateOf(true) }
    var manuallyPaused by remember(url) { mutableStateOf(false) }
    var startRequested by remember(url) { mutableStateOf(autoplay) }
    var playing by remember(activeUrl) { mutableStateOf(false) }
    var showPauseOverlay by remember(activeUrl) { mutableStateOf(false) }
    var playbackPosition by remember(activeUrl) { mutableLongStateOf(0L) }
    var playbackDuration by remember(activeUrl) { mutableLongStateOf(1L) }
    var scrubberVisible by remember(activeUrl) { mutableStateOf(false) }
    var scrubberToken by remember(activeUrl) { mutableLongStateOf(0L) }
    var retryCount by remember(activeUrl) { mutableIntStateOf(0) }
    val retryScope = rememberTiwiCoroutineScope()
    val playerId = remember(activeUrl) { "$activeUrl#${System.nanoTime()}" }
    val isActivePlayer = TiwiPlaybackCoordinator.activeId == playerId
    val shouldCreatePlayer = shouldOwnVideoPlayer(visibleEnough, autoplay, startRequested, coordinated, isActivePlayer)
    val player = remember(activeUrl, shouldCreatePlayer) {
        if (shouldCreatePlayer) {
            TiwiPlaybackCache.player(context).apply {
                setMediaItem(MediaItem.fromUri(activeUrl))
                prepare()
                volume = if (muted) 0f else 1f
                repeatMode = if (autoplay) ExoPlayer.REPEAT_MODE_ONE else ExoPlayer.REPEAT_MODE_OFF
            }
        } else null
    }
    LaunchedEffect(player, muted) { player?.volume = if (muted) 0f else 1f }
    LaunchedEffect(player, autoplay, visibleEnough, manuallyPaused, isActivePlayer, coordinated) {
        val activePlayer = player ?: return@LaunchedEffect
        activePlayer.repeatMode = if (autoplay) ExoPlayer.REPEAT_MODE_ONE else ExoPlayer.REPEAT_MODE_OFF
        val allowed = !coordinated || isActivePlayer
        if ((autoplay || startRequested) && visibleEnough && allowed && !manuallyPaused) activePlayer.play()
        else activePlayer.pause()
    }
    // Slow connections can remain in BUFFERING without emitting an error. Retry
    // the visible reel in place so the user never has to restart the app.
    LaunchedEffect(player, buffering, visibleEnough, autoplay, startRequested, manuallyPaused, retryCount) {
        val activePlayer = player ?: return@LaunchedEffect
        if (!buffering || !visibleEnough || manuallyPaused || (!autoplay && !startRequested) || retryCount >= 3) return@LaunchedEffect
        delay(6_500)
        if (activePlayer.playbackState == Player.STATE_BUFFERING && visibleEnough && !manuallyPaused) {
            retryCount += 1
            activePlayer.prepare()
            activePlayer.play()
        }
    }
    LaunchedEffect(player, previewClipMs) {
        val activePlayer = player ?: return@LaunchedEffect
        val clip = previewClipMs?.coerceAtLeast(1_000L) ?: return@LaunchedEffect
        while (true) {
            delay(250)
            if (activePlayer.isPlaying && activePlayer.currentPosition >= clip) activePlayer.seekTo(0L)
        }
    }
    LaunchedEffect(playerId, autoplay, startRequested, coordinated) {
        if ((!autoplay && !startRequested) || !coordinated) TiwiPlaybackCoordinator.remove(playerId)
    }
    LaunchedEffect(shouldCreatePlayer) {
        if (!shouldCreatePlayer) {
            playing = false
            buffering = true
            renderedFirstFrame = false
        }
    }
    LaunchedEffect(showPauseOverlay) {
        if (showPauseOverlay) { delay(650); showPauseOverlay = false }
    }
    LaunchedEffect(player, playing, showScrubber) {
        val activePlayer = player ?: return@LaunchedEffect
        while (showScrubber && player === activePlayer) {
            playbackPosition = activePlayer.currentPosition.coerceAtLeast(0L)
            playbackDuration = activePlayer.duration.takeIf { it > 0 } ?: playbackDuration.coerceAtLeast(1L)
            delay(180)
        }
    }
    LaunchedEffect(scrubberToken, showScrubber) {
        if (showScrubber && scrubberToken > 0L) {
            scrubberVisible = true
            delay(2_600)
            scrubberVisible = false
        }
    }
    if (player != null) DisposableEffect(player, lifecycleOwner, activeUrl, fallbackUrl) {
        val listener = object : Player.Listener {
            override fun onPlaybackStateChanged(playbackState: Int) {
                buffering = playbackState == Player.STATE_BUFFERING
                if (playbackState == Player.STATE_READY) playbackDuration = player.duration.takeIf { it > 0 } ?: playbackDuration
            }

            override fun onIsPlayingChanged(isPlaying: Boolean) { playing = isPlaying }

            override fun onRenderedFirstFrame() {
                renderedFirstFrame = true
                buffering = false
                retryCount = 0
            }

            override fun onPlayerError(error: PlaybackException) {
                val fallback = fallbackUrl?.takeIf { it.isNotBlank() && it != activeUrl }
                if (fallback != null) {
                    activeUrl = fallback
                } else if (retryCount < 4) {
                    retryCount += 1
                    buffering = true
                    val attempt = retryCount
                    retryScope.launch {
                        delay((700L * attempt).coerceAtMost(2_800L))
                        player.setMediaItem(MediaItem.fromUri(activeUrl))
                        player.prepare()
                        if ((autoplay || startRequested) && visibleEnough && !manuallyPaused) player.play()
                    }
                } else buffering = false
            }
        }
        val observer = LifecycleEventObserver { _, event ->
            when (event) {
                Lifecycle.Event.ON_PAUSE, Lifecycle.Event.ON_STOP -> player.pause()
                Lifecycle.Event.ON_RESUME -> if ((autoplay || startRequested) && visibleEnough && (!coordinated || TiwiPlaybackCoordinator.activeId == playerId) && !manuallyPaused) player.play()
                else -> Unit
            }
        }
        player.addListener(listener)
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            player.removeListener(listener)
            lifecycleOwner.lifecycle.removeObserver(observer)
            if (coordinated) TiwiPlaybackCoordinator.remove(playerId)
            player.release()
        }
    }
    Box(
        modifier.background(Color.Black).onGloballyPositioned { coordinates ->
            val bounds = coordinates.boundsInWindow()
            val screenHeight = context.resources.displayMetrics.heightPixels.toFloat()
            val screenWidth = context.resources.displayMetrics.widthPixels.toFloat()
            val visibleHeight = (minOf(bounds.bottom, screenHeight) - maxOf(bounds.top, 0f)).coerceAtLeast(0f)
            val visibleWidth = (minOf(bounds.right, screenWidth) - maxOf(bounds.left, 0f)).coerceAtLeast(0f)
            val verticalRatio = if (bounds.height > 0f) visibleHeight / bounds.height else 0f
            val horizontalRatio = if (bounds.width > 0f) visibleWidth / bounds.width else 0f
            val ratio = verticalRatio * horizontalRatio
            val itemCenter = (bounds.top + bounds.bottom) / 2f
            val centerDistance = kotlin.math.abs(itemCenter - screenHeight / 2f) / screenHeight
            visibleEnough = ratio >= .28f
            if (coordinated) TiwiPlaybackCoordinator.update(playerId, ratio - centerDistance * .15f, autoplay || startRequested)
        }
    ) {
        if (player != null) AndroidView(
            factory = { PlayerView(it).apply { this.player = player; useController = false } },
            update = { it.player = player },
            modifier = Modifier.fillMaxSize()
        )
        if ((player == null || !renderedFirstFrame) && !posterUrl.isNullOrBlank()) {
            AsyncImage(model = posterUrl, contentDescription = "Video thumbnail", modifier = Modifier.fillMaxSize(), contentScale = posterContentScale)
        }
        if (interactive) Box(Modifier.fillMaxSize().clickable {
            if (playing) {
                manuallyPaused = true
                player?.pause()
            } else {
                startRequested = true
                manuallyPaused = false
                if (coordinated) TiwiPlaybackCoordinator.activate(playerId)
                player?.play()
            }
            showPauseOverlay = true
            if (showScrubber) scrubberToken = System.nanoTime()
        })
        if (interactive && buffering && shouldCreatePlayer) CircularProgressIndicator(Modifier.align(Alignment.Center).size(30.dp), color = Color.White, strokeWidth = 2.5.dp)
        if (interactive && ((!playing && !buffering && visibleEnough) || (player == null && visibleEnough) || showPauseOverlay)) {
            Box(Modifier.align(Alignment.Center).size(58.dp).background(Color.Black.copy(alpha = .48f), CircleShape), contentAlignment = Alignment.Center) {
                Icon(if (playing) Icons.Default.Pause else Icons.Default.PlayArrow, if (playing) "Pause" else "Play", tint = Color.White, modifier = Modifier.size(34.dp))
            }
        }
        AnimatedVisibility(
            visible = showScrubber && player != null && (scrubberVisible || autoplay),
            enter = fadeIn(tween(130)), exit = fadeOut(tween(240)),
            modifier = Modifier.align(Alignment.BottomCenter)
        ) {
            Slider(
                value = (playbackPosition.toFloat() / playbackDuration.coerceAtLeast(1L)).coerceIn(0f, 1f),
                onValueChange = { fraction ->
                    scrubberToken = System.nanoTime()
                    playbackPosition = (fraction * playbackDuration).toLong()
                    player?.seekTo(playbackPosition)
                },
                modifier = Modifier.fillMaxWidth().height(24.dp).padding(horizontal = 7.dp),
                colors = SliderDefaults.colors(thumbColor = scrubberColor, activeTrackColor = scrubberColor, inactiveTrackColor = Color.White.copy(alpha = .38f))
            )
        }
    }
}

private const val POST_UPLOAD_CHANNEL = "tiwi_post_upload_progress_v2"
private const val POST_UPLOAD_NOTIFICATION = 4201

private fun ensurePostUploadChannel(context: Context) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        val manager = context.getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(
            NotificationChannel(POST_UPLOAD_CHANNEL, "Post uploads", NotificationManager.IMPORTANCE_LOW).apply {
                description = "Silent progress updates for Tiwi posts"
                setSound(null, null)
            }
        )
    }
}

private fun showPostUploadNotification(context: Context, progress: Int, message: String, complete: Boolean = false) {
    ensurePostUploadChannel(context)
    if (Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return
    val notification = NotificationCompat.Builder(context, POST_UPLOAD_CHANNEL)
        .setSmallIcon(R.drawable.ic_tiwi_notification)
        .setContentTitle(if (complete) "Your post is live" else "Uploading post")
        .setContentText(message)
        .setOnlyAlertOnce(!complete)
        .setOngoing(!complete)
        .setAutoCancel(complete)
        .setSilent(!complete)
        .setProgress(100, progress.coerceIn(0, 100), false)
        .build()
    NotificationManagerCompat.from(context).notify(POST_UPLOAD_NOTIFICATION, notification)
}

private fun playBundledSound(context: Context, resourceId: Int, usage: Int = AudioAttributes.USAGE_ASSISTANCE_SONIFICATION) {
    runCatching {
        val attributes = AudioAttributes.Builder()
            .setUsage(usage)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()
        MediaPlayer.create(context, resourceId, attributes, AudioManager.AUDIO_SESSION_ID_GENERATE)?.apply {
            setOnCompletionListener { finished -> finished.release() }
            start()
        }
    }
}

private fun playActivityNotificationSound(context: Context) =
    playBundledSound(context, R.raw.tiwi_activity_notification, AudioAttributes.USAGE_NOTIFICATION)

private fun playMessageSound(context: Context) =
    playBundledSound(context, R.raw.tiwi_message, AudioAttributes.USAGE_NOTIFICATION)

private fun playLikeSound(context: Context) = playBundledSound(context, R.raw.tiwi_like)

private suspend fun saveRemoteMediaToGallery(context: Context, sourceUrl: String, video: Boolean): Boolean = withContext(Dispatchers.IO) {
    runCatching {
        val defaultExtension = if (video) "mp4" else "jpg"
        val extension = sourceUrl.substringBefore('?').substringAfterLast('.', defaultExtension).takeIf { it.length in 2..5 } ?: defaultExtension
        val mime = when {
            video && extension.equals("webm", true) -> "video/webm"
            video -> "video/mp4"
            extension.equals("png", true) -> "image/png"
            extension.equals("webp", true) -> "image/webp"
            else -> "image/jpeg"
        }
        val values = ContentValues().apply {
            put(MediaStore.Images.Media.DISPLAY_NAME, "Tiwi-${System.currentTimeMillis()}.$extension")
            put(MediaStore.Images.Media.MIME_TYPE, mime)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                put(MediaStore.Images.Media.RELATIVE_PATH, if (video) "Movies/Tiwi" else "Pictures/Tiwi")
                put(MediaStore.Images.Media.IS_PENDING, 1)
            }
        }
        val resolver = context.contentResolver
        val collection = if (video) MediaStore.Video.Media.EXTERNAL_CONTENT_URI else MediaStore.Images.Media.EXTERNAL_CONTENT_URI
        val uri = resolver.insert(collection, values)
            ?: throw IllegalStateException("Gallery could not create a file")
        try {
            URL(sourceUrl).openStream().use { input ->
                resolver.openOutputStream(uri)?.use { output -> input.copyTo(output) }
                    ?: throw IllegalStateException("Gallery file could not be opened")
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                values.clear()
                values.put(MediaStore.Images.Media.IS_PENDING, 0)
                resolver.update(uri, values, null, null)
            }
            true
        } catch (error: Exception) {
            resolver.delete(uri, null, null)
            throw error
        }
    }.getOrDefault(false)
}

private suspend fun saveRemoteImageToGallery(context: Context, sourceUrl: String): Boolean =
    saveRemoteMediaToGallery(context, sourceUrl, video = false)

private fun currentNetworkAvailable(context: Context): Boolean {
    val manager = context.getSystemService(ConnectivityManager::class.java)
    val network = manager.activeNetwork ?: return false
    val capabilities = manager.getNetworkCapabilities(network) ?: return false
    return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) && capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
}

@Composable
private fun rememberNetworkAvailable(): State<Boolean> {
    val context = LocalContext.current
    return produceState(initialValue = currentNetworkAvailable(context), context) {
        val manager = context.getSystemService(ConnectivityManager::class.java)
        val callback = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) { value = currentNetworkAvailable(context) }
            override fun onLost(network: Network) { value = currentNetworkAvailable(context) }
            override fun onCapabilitiesChanged(network: Network, networkCapabilities: NetworkCapabilities) { value = currentNetworkAvailable(context) }
        }
        runCatching { manager.registerDefaultNetworkCallback(callback) }
        awaitDispose { runCatching { manager.unregisterNetworkCallback(callback) } }
    }
}

private data class PendingUploadSnapshot(val active: Boolean = false, val progress: Int = 0, val status: String = "")

@Composable
private fun rememberPendingUploadSnapshot(): State<PendingUploadSnapshot> {
    val context = LocalContext.current
    return produceState(initialValue = PendingUploadSnapshot(), context) {
        while (true) {
            value = withContext(Dispatchers.IO) {
                val work = runCatching { WorkManager.getInstance(context).getWorkInfosByTag(PostUploadWorker.TAG).get() }.getOrDefault(emptyList())
                val active = work.firstOrNull { it.state == WorkInfo.State.RUNNING }
                    ?: work.firstOrNull { it.state == WorkInfo.State.ENQUEUED || it.state == WorkInfo.State.BLOCKED }
                if (active == null) PendingUploadSnapshot()
                else PendingUploadSnapshot(
                    active = true,
                    progress = active.progress.getInt(PostUploadWorker.KEY_PROGRESS, if (active.state == WorkInfo.State.RUNNING) 2 else 0),
                    status = active.progress.getString(PostUploadWorker.KEY_STATUS)
                        ?: if (active.state == WorkInfo.State.RUNNING) "Uploading your post" else "Waiting for internet connection"
                )
            }
            delay(1_000)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class)
@Composable
fun TiwiApp(repository: SocialRepository, onLogout: () -> Unit, initialDeepLink: String? = null, onDeepLinkConsumed: () -> Unit = {}) {
    var selectedTab by remember { mutableIntStateOf(0) }
    var showProfile by remember { mutableStateOf(false) }
    var showCreatePost by remember { mutableStateOf(false) }
    var sharedPost by remember { mutableStateOf<Post?>(null) }
    var showMessages by remember { mutableStateOf(false) }
    var showConnect by remember { mutableStateOf(false) }
    var isRandomChat by remember { mutableStateOf(false) }
    var selectedProfileUserId by remember { mutableStateOf<String?>(null) }
    var selectedChat by remember { mutableStateOf<SocialConversation?>(null) }
    var selectedPostId by remember { mutableStateOf<String?>(null) }
    var selectedPostMediaIndex by remember { mutableStateOf<Int?>(null) }
    var initialReelId by remember { mutableStateOf<String?>(null) }
    var composerMusic by remember { mutableStateOf<String?>(null) }
    var selectedEditPostId by remember { mutableStateOf<String?>(null) }
    var callRequest by remember { mutableStateOf<TiwiCallRequest?>(null) }
    var showLiveSetup by remember { mutableStateOf(false) }
    var selectedLiveStream by remember { mutableStateOf<SocialLiveStream?>(null) }
    var hostingLive by remember { mutableStateOf(false) }
    var showStoryCreate by remember { mutableStateOf(false) }
    var selectedStoryAuthorId by remember { mutableStateOf<String?>(null) }
    var menuDestination by remember { mutableStateOf<String?>(null) }
    var pendingConversationId by remember { mutableStateOf<String?>(null) }
    
    val apiPosts by repository.feed.collectAsState()
    val currentUser by repository.currentUser.collectAsState()
    val currentProfile by repository.profile.collectAsState()
    val incomingCalls by repository.incomingCalls.collectAsState()
    val conversations by repository.conversations.collectAsState()
    val notifications by repository.notifications.collectAsState()
    val storyGroups by repository.storyTray.collectAsState()
    val unreadMessages = remember(conversations) { conversations.sumOf { it.unreadCount } }
    val unreadActivity = remember(notifications) { notifications.count { it.status == "unread" && it.type !in listOf("message", "message_request") } }
    val posts = remember(apiPosts) { apiPosts.map(::toUiPost) }
    val reels = remember(apiPosts) { apiPosts.filter { it.type == "reel" || it.type == "video" }.map(::toUiReel) }
    val scope = rememberTiwiCoroutineScope()
    val appContext = LocalContext.current
    val appLifecycleOwner = LocalLifecycleOwner.current
    var appVisible by remember { mutableStateOf(appLifecycleOwner.lifecycle.currentState.isAtLeast(Lifecycle.State.STARTED)) }
    val appView = LocalView.current
    val appActivity = appContext as? Activity
    val permissionPreferences = remember { appContext.getSharedPreferences("tiwi_first_run_permissions", Context.MODE_PRIVATE) }
    var showPermissionIntro by remember { mutableStateOf(!permissionPreferences.getBoolean("requested_v1", false)) }
    val firstRunPermissions = remember {
        buildList {
            add(Manifest.permission.CAMERA)
            add(Manifest.permission.RECORD_AUDIO)
            add(Manifest.permission.ACCESS_FINE_LOCATION)
            if (Build.VERSION.SDK_INT >= 33) {
                add(Manifest.permission.POST_NOTIFICATIONS)
                add(Manifest.permission.READ_MEDIA_IMAGES)
                add(Manifest.permission.READ_MEDIA_VIDEO)
            } else add(Manifest.permission.READ_EXTERNAL_STORAGE)
        }.filter { ContextCompat.checkSelfPermission(appContext, it) != PackageManager.PERMISSION_GRANTED }.toTypedArray()
    }
    val firstRunPermissionLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) {
        permissionPreferences.edit().putBoolean("requested_v1", true).apply()
    }
    val notificationPermissionLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        permissionPreferences.edit().putBoolean("notification_permission_v3", true).apply()
        if (!granted) Toast.makeText(appContext, "Enable Tiwi notifications in Android settings to hear calls and alerts", Toast.LENGTH_LONG).show()
    }
    val hasOverlay = showProfile || showCreatePost || showStoryCreate || selectedStoryAuthorId != null || showLiveSetup || selectedLiveStream != null || showMessages || showConnect || selectedProfileUserId != null || selectedChat != null || selectedPostId != null || selectedEditPostId != null
    val darkChrome = selectedTab == 2 && !hasOverlay
    if (showPermissionIntro) AlertDialog(
        onDismissRequest = {}, containerColor = Color.White, tonalElevation = 0.dp,
        icon = { Icon(Icons.Default.Security, null, tint = TiwiBlue) },
        title = { Text("Enable Tiwi features") },
        text = { Text("Tiwi uses notifications for activity, photos and videos for posts, camera and microphone for calls, and location only when you choose to add it. You can change these permissions anytime in Android settings.") },
        confirmButton = { TextButton(onClick = { showPermissionIntro = false; permissionPreferences.edit().putBoolean("requested_v1", true).putBoolean("notification_permission_v3", true).apply(); if (firstRunPermissions.isNotEmpty()) firstRunPermissionLauncher.launch(firstRunPermissions) }) { Text("Continue", fontWeight = FontWeight.Bold) } },
        dismissButton = { TextButton(onClick = { showPermissionIntro = false; permissionPreferences.edit().putBoolean("requested_v1", true).putBoolean("notification_permission_v3", true).apply() }) { Text("Not now") } }
    )

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

    BackHandler(enabled = sharedPost != null || hasOverlay || selectedTab != 0) {
        when {
            sharedPost != null -> sharedPost = null
            selectedStoryAuthorId != null -> selectedStoryAuthorId = null
            showStoryCreate -> showStoryCreate = false
            selectedEditPostId != null -> selectedEditPostId = null
            selectedPostId != null -> { selectedPostId = null; selectedPostMediaIndex = null }
            selectedProfileUserId != null -> selectedProfileUserId = null
            selectedChat != null -> { selectedChat = null; isRandomChat = false }
            selectedLiveStream != null -> { selectedLiveStream = null; hostingLive = false }
            showLiveSetup -> showLiveSetup = false
            showConnect -> showConnect = false
            showMessages -> showMessages = false
            showCreatePost -> showCreatePost = false
            showProfile -> showProfile = false
            selectedTab != 0 -> { selectedTab = 0; initialReelId = null }
        }
    }

    LaunchedEffect(Unit) {
        repository.validateSession()
        repository.refreshAll()
    }

    LaunchedEffect(currentUser?.id, showPermissionIntro) {
        if (currentUser == null || showPermissionIntro || Build.VERSION.SDK_INT < 33) return@LaunchedEffect
        if (ContextCompat.checkSelfPermission(appContext, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED &&
            !permissionPreferences.getBoolean("notification_permission_v3", false)
        ) {
            delay(700)
            notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }

    DisposableEffect(currentUser?.id, appLifecycleOwner) {
        val serviceIntent = Intent(appContext, TiwiCallListenerService::class.java)
        fun updateCallListener(visible: Boolean) {
            appVisible = visible
            if (currentUser == null || visible) appContext.stopService(serviceIntent)
            else runCatching { ContextCompat.startForegroundService(appContext, serviceIntent) }
        }
        val observer = LifecycleEventObserver { _, event ->
            when (event) {
                Lifecycle.Event.ON_START, Lifecycle.Event.ON_RESUME -> updateCallListener(true)
                Lifecycle.Event.ON_STOP -> updateCallListener(false)
                else -> Unit
            }
        }
        appLifecycleOwner.lifecycle.addObserver(observer)
        updateCallListener(appLifecycleOwner.lifecycle.currentState.isAtLeast(Lifecycle.State.STARTED))
        onDispose {
            appLifecycleOwner.lifecycle.removeObserver(observer)
            if (repository.currentUserId() == null) appContext.stopService(serviceIntent)
            else if (!appVisible) runCatching { ContextCompat.startForegroundService(appContext, serviceIntent) }
        }
    }

    LaunchedEffect(Unit) {
        while (true) {
            delay(60000)
            runCatching { repository.validateSession() }
        }
    }

    LaunchedEffect(initialDeepLink) {
        val link = initialDeepLink ?: return@LaunchedEffect
        val uri = runCatching { android.net.Uri.parse(link) }.getOrNull()
        val segments = uri?.pathSegments.orEmpty()
        uri?.getQueryParameter("notification")?.takeIf { it.isNotBlank() }?.let { notificationId ->
            runCatching { repository.markNotificationRead(notificationId) }
        }
        when {
            segments.size >= 3 && segments[0] == "social" && segments[1] == "live" -> {
                runCatching { repository.getLiveStream(segments[2]) }.getOrNull()?.let { live ->
                    hostingLive = live.hostId == repository.currentUserId()
                    selectedLiveStream = live
                }
            }
            segments.size >= 3 && segments[0] == "social" && segments[1] == "post" -> {
                selectedPostMediaIndex = null
                selectedPostId = segments[2]
            }
            segments.size >= 3 && segments[0] == "social" && segments[1] == "profile" -> selectedProfileUserId = segments[2]
            segments.size >= 3 && segments[0] == "social" && segments[1] == "messages" -> {
                pendingConversationId = segments[2]
                showMessages = true
            }
            segments.size >= 2 && segments[0] == "social" && segments[1] == "support" -> {
                menuDestination = "Support Center"
                selectedTab = 4
            }
            segments.size >= 2 && segments[0] == "social" && segments[1] == "notifications" -> selectedTab = 3
            uri?.scheme == "tiwi" && uri.host == "call" && segments.isNotEmpty() -> {
                runCatching { repository.getCall(segments[0]) }.getOrNull()?.let { incoming ->
                    if (incoming.calleeId == repository.currentUserId() && incoming.status in listOf("ringing", "connecting")) {
                        callRequest = TiwiCallRequest(
                            conversationId = incoming.conversationId,
                            peerId = incoming.callerId,
                            peerName = incoming.caller.name.ifBlank { "Tiwi user" },
                            peerAvatar = incoming.caller.avatar,
                            video = incoming.type == "video",
                            incoming = incoming
                        )
                    }
                }
            }
        }
        onDeepLinkConsumed()
    }

    LaunchedEffect(pendingConversationId, conversations) {
        val id = pendingConversationId ?: return@LaunchedEffect
        conversations.firstOrNull { it.id == id }?.let {
            selectedChat = it
            showMessages = false
            pendingConversationId = null
        }
    }

    LaunchedEffect(currentUser?.id, appVisible, showMessages) {
        if (currentUser == null || !appVisible || showMessages) return@LaunchedEffect
        val shownPreferences = appContext.getSharedPreferences("tiwi_activity_notifications", Context.MODE_PRIVATE)
        var primed = false
        while (true) {
            runCatching { repository.refreshConversations(force = true) }
            val refreshed = runCatching { repository.refreshNotifications() }.getOrDefault(emptyList())
            val shown = shownPreferences.getStringSet("shown_ids", emptySet()).orEmpty()
            val unseen = refreshed.filter { it.status == "unread" && it.id !in shown }
            if (primed && unseen.isNotEmpty()) {
                if (unseen.any { it.type in listOf("message", "message_request") }) playMessageSound(appContext)
                else playActivityNotificationSound(appContext)
            }
            if (unseen.isNotEmpty()) shownPreferences.edit().putStringSet("shown_ids", (shown + unseen.map { it.id }).toList().takeLast(200).toSet()).apply()
            primed = true
            delay(8_000)
        }
    }

    LaunchedEffect(currentUser?.id, appVisible) {
        if (currentUser == null || !appVisible) return@LaunchedEffect
        while (true) {
            runCatching { repository.refreshIncomingCalls() }
            delay(3500)
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

    if (showLiveSetup) {
        LiveSetupPage(
            repository = repository,
            onBack = { showLiveSetup = false },
            onStarted = { live -> showLiveSetup = false; hostingLive = true; selectedLiveStream = live }
        )
        return
    }

    selectedLiveStream?.let { live ->
        LiveBroadcastScreen(repository, live, hostingLive, onEnd = {
            selectedLiveStream = null
            hostingLive = false
            scope.launch { runCatching { repository.refreshLiveStreams() } }
        })
        return
    }

    if (showStoryCreate) {
        TiwiStoryCreatePage(
            repository = repository,
            onBack = { showStoryCreate = false },
            onPublished = { story ->
                showStoryCreate = false
                selectedStoryAuthorId = story.authorId
            }
        )
        return
    }

    selectedStoryAuthorId?.let { authorId ->
        TiwiStoryViewerPage(repository, storyGroups, authorId, onClose = { selectedStoryAuthorId = null })
        return
    }

    sharedPost?.let { post ->
        TiwiShareSheet(repository, post, onDismiss = { sharedPost = null })
    }

    Scaffold(
        topBar = { 
            if (selectedTab != 2 && selectedTab != 4 && !showProfile && !showCreatePost && !showStoryCreate && selectedStoryAuthorId == null && !showMessages && !showConnect && selectedProfileUserId == null && selectedChat == null && selectedPostId == null && selectedEditPostId == null) {
                TiwiTopBar(
                    unreadActivity = unreadActivity,
                    onCreateClick = { showCreatePost = true },
                    onNotificationsClick = { selectedTab = 3 },
                    onConnectClick = { showConnect = true }
                ) 
            }
        },
        bottomBar = { 
            if (!showProfile && !showCreatePost && !showStoryCreate && selectedStoryAuthorId == null && !showMessages && !showConnect && selectedProfileUserId == null && selectedChat == null && selectedPostId == null && selectedEditPostId == null) {
                TiwiBottomBar(
                    selectedTab = selectedTab,
                    dark = selectedTab == 2,
                    avatarUrl = currentUser?.avatar,
                    onTabSelected = {
                        initialReelId = null
                        selectedTab = it
                    },
                    onMessagesClick = { showMessages = true },
                    onProfileClick = { menuDestination = null; selectedTab = 4 },
                    unreadMessages = unreadMessages
                )
            }
        },
        containerColor = if (darkChrome) Color.Black else MaterialTheme.colorScheme.background,
        contentWindowInsets = WindowInsets(0, 0, 0, 0)
    ) { innerPadding ->
        Box(modifier = Modifier.padding(innerPadding)) {
            when {
                selectedEditPostId != null -> posts.firstOrNull { it.id == selectedEditPostId }?.let { editing -> EditPostPage(repository, editing, onBack = { selectedEditPostId = null }) } ?: run { selectedEditPostId = null }
                selectedPostId != null -> PostDetailScreen(
                    repository = repository,
                    postId = selectedPostId!!,
                    initialMediaIndex = selectedPostMediaIndex,
                    onBack = { selectedPostId = null; selectedPostMediaIndex = null },
                    onProfileClick = { selectedProfileUserId = it; selectedPostId = null; selectedPostMediaIndex = null },
                    onShare = { sharedPost = it },
                    onEdit = { selectedEditPostId = it },
                    onLinkedPost = { selectedPostMediaIndex = null; selectedPostId = it }
                )
                selectedProfileUserId != null -> ProfileScreen(
                    repository, posts.filter { it.authorId == selectedProfileUserId }, reels.filter { it.authorId == selectedProfileUserId }, userId = selectedProfileUserId,
                    onBack = { selectedProfileUserId = null },
                    onPostClick = { selectedPostMediaIndex = null; selectedPostId = it },
                    onMediaClick = { id, index -> selectedPostMediaIndex = index; selectedPostId = id },
                    onShare = { sharedPost = it }, onMessage = { id -> scope.launch { selectedChat = repository.createConversation(id); selectedProfileUserId = null } }, onEditPost = { selectedEditPostId = it },
                    onConnectionClick = { selectedProfileUserId = it },
                    onLive = { live -> selectedProfileUserId = null; hostingLive = false; selectedLiveStream = live }
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
                showMessages -> MessagesScreen(
                    repository,
                    onBack = { showMessages = false },
                    onChatClick = { selectedChat = it },
                    onProfileClick = { showMessages = false; showProfile = true },
                    onSupportCenter = { showMessages = false; menuDestination = "Support Center"; selectedTab = 4 },
                    storyGroups = storyGroups,
                    onCreateStory = { showMessages = false; showStoryCreate = true },
                    onOpenStory = { showMessages = false; selectedStoryAuthorId = it }
                )
                showCreatePost -> CreatePostScreen(
                    repository,
                    onBack = { showCreatePost = false; composerMusic = null },
                    onLive = { showCreatePost = false; composerMusic = null; showLiveSetup = true },
                    initialMusic = composerMusic
                )
                showProfile -> ProfileScreen(
                    repository,
                    posts.filter { it.authorId == repository.currentUserId() },
                    reels.filter { it.authorId == repository.currentUserId() },
                    onBack = { showProfile = false },
                    onPostClick = { selectedPostMediaIndex = null; selectedPostId = it },
                    onMediaClick = { id, index -> selectedPostMediaIndex = index; selectedPostId = id },
                    onShare = { sharedPost = it },
                    onEditPost = { selectedEditPostId = it },
                    onCreate = { showCreatePost = true },
                    onConnectionClick = { selectedProfileUserId = it },
                    onLive = { live -> showProfile = false; hostingLive = live.hostId == repository.currentUserId(); selectedLiveStream = live }
                )
                else -> {
                    when (selectedTab) {
                        0 -> HomeFeed(reels, posts, repository, storyGroups = storyGroups, onCreateStory = { showStoryCreate = true }, onOpenStory = { selectedStoryAuthorId = it }, onShareClick = { sharedPost = it }, onAuthorClick = { selectedProfileUserId = it }, onPostClick = { selectedPostMediaIndex = null; selectedPostId = it }, onMediaClick = { id, index -> selectedPostMediaIndex = index; selectedPostId = id }, onReelClick = { initialReelId = it; selectedTab = 2 }, onEditPost = { selectedEditPostId = it }, onLive = { live -> hostingLive = live.hostId == repository.currentUserId(); selectedLiveStream = live })
                        1 -> SearchScreen(repository, onProfileClick = { selectedProfileUserId = it }, onPostClick = { selectedPostMediaIndex = null; selectedPostId = it })
                        2 -> ReelsScreen(reels, repository, initialReelId = initialReelId, onOpen = { selectedPostMediaIndex = null; selectedPostId = it }, onShare = { reel -> sharedPost = posts.firstOrNull { it.id == reel.id } }, onAuthor = { selectedProfileUserId = it }, onLive = { live -> hostingLive = live.hostId == repository.currentUserId(); selectedLiveStream = live }, onUseAudio = { reel -> composerMusic = reel.musicTitle?.takeIf { it.isNotBlank() } ?: "Original audio - ${reel.author}"; showCreatePost = true })
                        3 -> NotificationsScreen(
                            repository,
                            onProfileClick = { selectedProfileUserId = it },
                            onPostClick = { selectedPostMediaIndex = null; selectedPostId = it },
                            onSupportCenter = { menuDestination = "Support Center"; selectedTab = 4 },
                            onCopyrightStudio = { menuDestination = "Copyright Studio"; selectedTab = 4 },
                            onLive = { live -> hostingLive = live.hostId == repository.currentUserId(); selectedLiveStream = live }
                        )
                        4 -> MenuScreen(
                            repository,
                            currentUser?.name.orEmpty(),
                            currentUser?.avatar,
                            initialSetting = menuDestination,
                            onInitialSettingConsumed = { menuDestination = null },
                            onProfileClick = { showProfile = true },
                            onUserProfileClick = { selectedProfileUserId = it },
                            onLogout = { repository.logout(); onLogout() }
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun TiwiTopBar(unreadActivity: Int = 0, onCreateClick: () -> Unit, onNotificationsClick: () -> Unit, onConnectClick: () -> Unit) {
    // The system-bar guard and app bar keep a fixed measured height. The feed
    // therefore never moves under the status/navigation bars while scrolling.
    Box(modifier = Modifier.fillMaxWidth().background(Color.White).statusBarsPadding().height(52.dp)) {
        Box(modifier = Modifier.fillMaxWidth().height(52.dp).background(Color.White)) {
            IconButton(onClick = onCreateClick, modifier = Modifier.align(Alignment.CenterStart).padding(start = 7.dp).size(46.dp)) {
                InstagramCreateGlyph()
            }
            Text(
                text = buildAnnotatedString {
                    withStyle(SpanStyle(color = Color(0xFF111318), fontWeight = FontWeight.ExtraBold)) { append("Tiwi") }
                    withStyle(SpanStyle(color = TiwiBlue, fontWeight = FontWeight.Black)) { append(".") }
                },
                style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.ExtraBold, letterSpacing = (-.8).sp),
                modifier = Modifier.align(Alignment.Center)
            )
            Row(Modifier.align(Alignment.CenterEnd).padding(end = 5.dp), verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onConnectClick, modifier = Modifier.size(44.dp)) {
                    Icon(Icons.Outlined.Group, contentDescription = "Connected people", tint = Color.Black, modifier = Modifier.size(26.dp))
                }
                IconButton(onClick = onNotificationsClick, modifier = Modifier.size(44.dp)) {
                    BadgedBox(badge = { if (unreadActivity > 0) Badge(Modifier.size(8.dp)) }) {
                        Icon(Icons.Outlined.NotificationsNone, contentDescription = "Activity", tint = Color.Black, modifier = Modifier.size(26.dp))
                    }
                }
            }
        }
    }
}

/** Rounded-square create control matching the compact Instagram-style post action. */
@Composable
private fun InstagramCreateGlyph(modifier: Modifier = Modifier) {
    Canvas(modifier.size(29.dp)) {
        val stroke = 2.55.dp.toPx()
        val inset = 2.2.dp.toPx()
        val corner = 7.dp.toPx()
        drawRoundRect(
            color = Color.Black,
            topLeft = Offset(inset, inset),
            size = androidx.compose.ui.geometry.Size(size.width - inset * 2, size.height - inset * 2),
            cornerRadius = androidx.compose.ui.geometry.CornerRadius(corner, corner),
            style = Stroke(width = stroke)
        )
        drawLine(Color.Black, Offset(size.width * .5f, size.height * .30f), Offset(size.width * .5f, size.height * .70f), stroke, StrokeCap.Round)
        drawLine(Color.Black, Offset(size.width * .30f, size.height * .5f), Offset(size.width * .70f, size.height * .5f), stroke, StrokeCap.Round)
    }
}

@Composable
@OptIn(ExperimentalMaterial3Api::class)
fun HomeFeed(
    reels: List<Reel>,
    posts: List<Post>,
    repository: SocialRepository,
    storyGroups: List<SocialStoryGroup> = emptyList(),
    onCreateStory: () -> Unit = {},
    onOpenStory: (String) -> Unit = {},
    onShareClick: (Post) -> Unit,
    onAuthorClick: (String) -> Unit,
    onPostClick: (String) -> Unit,
    onMediaClick: (String, Int) -> Unit,
    onReelClick: (String) -> Unit,
    onEditPost: (String) -> Unit = {},
    onLive: (SocialLiveStream) -> Unit = {}
) {
    val scope = rememberTiwiCoroutineScope()
    val syncing by repository.syncing.collectAsState()
    val feedModules by repository.feedModules.collectAsState()
    val liveStreams by repository.liveStreams.collectAsState()
    val currentUser by repository.currentUser.collectAsState()
    val currentProfile by repository.profile.collectAsState()
    val online by rememberNetworkAvailable()
    val pendingUpload by rememberPendingUploadSnapshot()
    var observedUpload by remember { mutableStateOf(false) }
    LaunchedEffect(pendingUpload.active) {
        if (pendingUpload.active) observedUpload = true
        else if (observedUpload) {
            observedUpload = false
            runCatching { repository.refreshAll(force = true) }
        }
    }
    LaunchedEffect(Unit) {
        while (true) {
            runCatching { repository.refreshLiveStreams() }
            delay(15_000)
        }
    }
    PullToRefreshBox(
        isRefreshing = syncing,
        onRefresh = { scope.launch { repository.refreshAll(force = true) } },
        modifier = Modifier.fillMaxSize()
    ) {
        if (posts.isEmpty() && syncing) FeedSkeleton()
        else {
            val feedListState = rememberLazyListState()
            LazyColumn(modifier = Modifier.fillMaxSize(), state = feedListState) {
            if (!online) item {
                Row(Modifier.fillMaxWidth().background(Color(0xFFF4F6F8)).padding(horizontal = 12.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(28.dp).background(Color.White, CircleShape), contentAlignment = Alignment.Center) {
                        Icon(Icons.Outlined.WifiOff, null, tint = Color(0xFF475467), modifier = Modifier.size(16.dp))
                    }
                    Column(Modifier.padding(start = 8.dp)) {
                        Text("You're offline", color = Color(0xFF101828), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        Text("Saved posts remain available. Uploads resume automatically.", color = Color(0xFF667085), fontSize = 10.sp)
                    }
                }
            }
            if (pendingUpload.active) item {
                val animatedProgress by animateFloatAsState(
                    targetValue = pendingUpload.progress.coerceIn(0, 100) / 100f,
                    animationSpec = tween(280), label = "post-upload-progress"
                )
                Column(Modifier.fillMaxWidth().background(Color(0xFFF4F8FF)).padding(horizontal = 12.dp, vertical = 8.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(Modifier.size(29.dp).background(Color.White, CircleShape), contentAlignment = Alignment.Center) {
                            Icon(if (online) Icons.Outlined.CloudUpload else Icons.Outlined.CloudQueue, null, tint = TiwiBlue, modifier = Modifier.size(17.dp))
                        }
                        Column(Modifier.weight(1f).padding(start = 8.dp)) {
                            Text(if (online) "Publishing your post" else "Waiting for connection", color = Color(0xFF173B70), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            Text(pendingUpload.status, color = Color(0xFF667085), fontSize = 10.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        }
                        Text("${pendingUpload.progress}%", color = TiwiBlue, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                    LinearProgressIndicator(progress = { animatedProgress }, modifier = Modifier.fillMaxWidth().padding(top = 7.dp).height(3.dp).clip(CircleShape), color = TiwiBlue, trackColor = Color.White)
                }
            }
            item {
                TiwiStoryTray(
                    groups = storyGroups,
                    currentUser = currentUser,
                    currentProfile = currentProfile,
                    compact = true,
                    feedEmphasis = true,
                    onCreate = onCreateStory,
                    onOpen = onOpenStory
                )
                HorizontalDivider(thickness = .5.dp, color = Color(0xFFE5E7EB))
            }
            item { ReelsSection(reels, onReelClick) }
            if (liveStreams.isNotEmpty()) item { LiveNowSection(liveStreams, onLive) }
            itemsIndexed(posts, key = { _, post -> post.id }) { index, post ->
                Column {
                    post.recommendationLabel?.takeIf { it.isNotBlank() }?.let { label ->
                        Row(Modifier.fillMaxWidth().padding(start = 10.dp, end = 10.dp, top = 7.dp, bottom = 1.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Outlined.AutoAwesome, null, tint = Color(0xFF667085), modifier = Modifier.size(13.dp))
                            Text(label, color = Color(0xFF667085), fontSize = 10.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(start = 4.dp))
                        }
                    }
                    PostCard(
                        post,
                        repository,
                        { onShareClick(post) },
                        { onAuthorClick(post.authorId) },
                        { mediaIndex -> onMediaClick(post.id, mediaIndex) },
                        onEditRequest = { onEditPost(it.id) },
                        onOpenLinkedPost = onPostClick,
                        onCommentProfile = onAuthorClick
                    )
                    feedModules.filter { it.insertAfter == index + 1 }.forEach { module ->
                        when (module.kind) {
                            "reels" -> SuggestedReelsSection(module, onReelClick)
                            else -> SuggestedFriendsSection(module.title, module.profiles, repository, onAuthorClick) { }
                        }
                    }
                }
            }
            }
        }
    }
}

@Composable
private fun FeedSkeleton(modifier: Modifier = Modifier) {
    val shimmer by rememberInfiniteTransition(label = "feed-skeleton").animateFloat(
        initialValue = .42f, targetValue = .78f,
        animationSpec = infiniteRepeatable(tween(850), repeatMode = RepeatMode.Reverse), label = "skeleton-alpha"
    )
    val placeholder = Color(0xFFDDE1E6).copy(alpha = shimmer)
    LazyColumn(modifier.fillMaxSize(), userScrollEnabled = false) {
        items(3) {
            Column(Modifier.fillMaxWidth().padding(bottom = 10.dp)) {
                Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(42.dp).background(placeholder, CircleShape))
                    Column(Modifier.padding(start = 9.dp)) {
                        Box(Modifier.width(130.dp).height(13.dp).background(placeholder, RoundedCornerShape(6.dp)))
                        Spacer(Modifier.height(7.dp)); Box(Modifier.width(76.dp).height(10.dp).background(placeholder, RoundedCornerShape(5.dp)))
                    }
                }
                Box(Modifier.fillMaxWidth().height(280.dp).background(placeholder))
                Row(Modifier.fillMaxWidth().padding(12.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                    repeat(4) { Box(Modifier.width(62.dp).height(12.dp).background(placeholder, RoundedCornerShape(6.dp))) }
                }
            }
        }
    }
}

@Composable
private fun SuggestedFriendsSection(
    title: String,
    profiles: List<SocialProfile>,
    repository: SocialRepository,
    onProfileClick: (String) -> Unit,
    onUpdated: (SocialProfile) -> Unit
) {
    val scope = rememberTiwiCoroutineScope()
    if (profiles.isEmpty()) return
    Column(Modifier.fillMaxWidth().padding(vertical = 10.dp)) {
        Text(title, modifier = Modifier.padding(horizontal = 12.dp, vertical = 5.dp), fontWeight = FontWeight.Bold, fontSize = 14.sp)
        LazyRow(contentPadding = PaddingValues(horizontal = 8.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            items(profiles, key = { it.userId }) { profile ->
                Column(
                    Modifier.width(164.dp).background(Color(0xFFF7F7F7), RoundedCornerShape(12.dp)).clickable { onProfileClick(profile.userId) }.padding(12.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    DecoratedAvatar(profile.user.avatar, R.drawable.img_tiwi_avatar_1, profile.avatarDecoration, Modifier.size(94.dp))
                    Spacer(Modifier.height(7.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(profile.user.name, maxLines = 1, overflow = TextOverflow.Ellipsis, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        if (profile.verified) VerifiedBadge(profile.badgeType, 14.dp)
                    }
                    Text("@${profile.username}", maxLines = 1, color = Color.Gray, fontSize = 11.sp)
                    Button(
                        onClick = { scope.launch { runCatching { repository.follow(profile.userId, !profile.isFollowing) }.onSuccess(onUpdated) } },
                        modifier = Modifier.fillMaxWidth().height(34.dp),
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
private fun SuggestedReelsSection(module: SocialFeedModule, onReelClick: (String) -> Unit) {
    val reels = remember(module.posts) { module.posts.map(::toUiReel) }
    if (reels.isEmpty()) return
    Column(Modifier.fillMaxWidth().padding(vertical = 8.dp)) {
        Text(module.title, modifier = Modifier.padding(horizontal = 12.dp, vertical = 5.dp), fontWeight = FontWeight.Bold, fontSize = 14.sp)
        LazyRow(contentPadding = PaddingValues(horizontal = 10.dp), horizontalArrangement = Arrangement.spacedBy(7.dp)) {
            itemsIndexed(reels, key = { _, reel -> "${module.id}-${reel.id}" }) { index, reel ->
                    ReelItem(
                        reel,
                    autoplayPreview = true,
                    width = 112.dp,
                    height = 198.dp,
                    showFeedAuthor = true
                ) { onReelClick(reel.id) }
            }
        }
    }
}

@Composable
private fun LiveNowSection(streams: List<SocialLiveStream>, onOpen: (SocialLiveStream) -> Unit) {
    Column(Modifier.fillMaxWidth().padding(vertical = 5.dp)) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 5.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(7.dp).background(Color(0xFFE11D48), CircleShape))
            Text("Live now", fontWeight = FontWeight.Black, fontSize = 13.sp, modifier = Modifier.padding(start = 6.dp))
            Text("People you follow and popular lives", color = Color(0xFF667085), fontSize = 9.sp, modifier = Modifier.padding(start = 7.dp))
        }
        LazyRow(contentPadding = PaddingValues(horizontal = 10.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            items(streams, key = { "live-now-${it.id}" }) { live ->
                Column(Modifier.width(78.dp).clickable { onOpen(live) }, horizontalAlignment = Alignment.CenterHorizontally) {
                    Box(Modifier.size(60.dp).border(2.5.dp, Color(0xFFE11D48), CircleShape).padding(3.dp), contentAlignment = Alignment.Center) {
                        TiwiAvatar(live.host.avatar, R.drawable.img_tiwi_avatar_1, Modifier.fillMaxSize().clip(CircleShape))
                        Surface(Modifier.align(Alignment.BottomCenter).offset(y = 5.dp), color = Color(0xFFE11D48), shape = RoundedCornerShape(4.dp), tonalElevation = 0.dp) {
                            Text("LIVE", color = Color.White, fontSize = 7.sp, fontWeight = FontWeight.Black, modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp))
                        }
                    }
                    Text(live.host.name, fontWeight = FontWeight.Bold, fontSize = 9.sp, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(top = 7.dp))
                    Text("${formatCount(live.viewerCount)} watching", color = Color(0xFF667085), fontSize = 8.sp, maxLines = 1)
                }
            }
        }
    }
}

@Composable
fun ReelsSection(reels: List<Reel>, onReelClick: (String) -> Unit = {}) {
    Column(modifier = Modifier.padding(vertical = 8.dp)) {
        Text(
            text = "Reels for you",
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold)
        )
        LazyRow(
            contentPadding = PaddingValues(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            itemsIndexed(reels.take(16), key = { _, reel -> reel.id }) { index, reel ->
                ReelItem(reel, autoplayPreview = true, showFeedAuthor = true) { onReelClick(reel.id) }
            }
        }
    }
}

@Composable
fun ReelItem(
    reel: Reel,
    autoplayPreview: Boolean = false,
    width: Dp = 126.dp,
    height: Dp = 224.dp,
    showFeedAuthor: Boolean = false,
    onClick: () -> Unit = {}
) {
    Box(
        modifier = Modifier
            .size(width = width, height = height)
            .clip(RoundedCornerShape(14.dp))
            .background(Color.Black)
    ) {
        if (autoplayPreview && !reel.videoUrl.isNullOrBlank()) {
            TiwiVideo(
                reel.videoUrl!!,
                Modifier.fillMaxSize(),
                autoplay = true,
                fallbackUrl = reel.fallbackVideoUrl,
                posterUrl = reel.thumbnailUrl,
                posterContentScale = ContentScale.Fit,
                muted = true,
                previewClipMs = 2_500L,
                coordinated = true,
                interactive = false
            )
        } else TiwiAvatar(reel.thumbnailUrl, reel.thumbnail, Modifier.fillMaxSize(), ContentScale.Fit)
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
        if (showFeedAuthor) {
            // Feed rails intentionally use a plain avatar. Decorations belong
            // on profile surfaces, not on these small discovery cards.
            Column(
                modifier = Modifier.align(Alignment.BottomStart).padding(7.dp),
                horizontalAlignment = Alignment.Start
            ) {
                Box(Modifier.size(29.dp)) {
                    TiwiAvatar(
                        url = reel.authorAvatarUrl,
                        fallback = R.drawable.img_tiwi_avatar_1,
                        modifier = Modifier.fillMaxSize().clip(CircleShape).border(1.5.dp, Color.White, CircleShape)
                    )
                    if (reel.verified) {
                        Box(
                            Modifier.align(Alignment.BottomEnd).offset(x = 2.dp, y = 2.dp)
                                .size(13.dp).background(Color.White, CircleShape),
                            contentAlignment = Alignment.Center
                        ) { VerifiedBadge(reel.badgeType, 12.dp) }
                    }
                }
                Text(
                    text = reel.author,
                    modifier = Modifier.padding(top = 3.dp),
                    color = Color.White,
                    style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp, fontWeight = FontWeight.SemiBold),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        } else {
            Text(
                text = reel.author,
                modifier = Modifier.align(Alignment.BottomStart).padding(8.dp),
                color = Color.White,
                style = MaterialTheme.typography.labelSmall,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
        Box(Modifier.matchParentSize().clickable(onClick = onClick))
    }
}

private fun linkPreviewFromMetadata(value: Any?): SocialLinkPreview? {
    val map = value as? Map<*, *> ?: return null
    val url = map["url"]?.toString().orEmpty()
    if (url.isBlank()) return null
    return SocialLinkPreview(
        url = url,
        canonicalUrl = map["canonicalUrl"]?.toString().orEmpty().ifBlank { url },
        domain = map["domain"]?.toString().orEmpty(),
        title = map["title"]?.toString().orEmpty(),
        description = map["description"]?.toString(),
        imageUrl = map["imageUrl"]?.toString(),
        siteName = map["siteName"]?.toString(),
        faviconUrl = map["faviconUrl"]?.toString(),
        registeredAt = map["registeredAt"]?.toString(),
        domainAgeYears = (map["domainAgeYears"] as? Number)?.toInt()
    )
}

private fun SocialLinkPreview.asMetadata(): Map<String, Any?> = mapOf(
    "url" to url, "canonicalUrl" to canonicalUrl, "domain" to domain, "title" to title,
    "description" to description, "imageUrl" to imageUrl, "siteName" to siteName,
    "faviconUrl" to faviconUrl, "registeredAt" to registeredAt, "domainAgeYears" to domainAgeYears
).filterValues { it != null }

private fun SocialLinkPreview.asMessageMedia(): SocialMedia = SocialMedia(
    url = canonicalUrl.ifBlank { url }, type = "link_preview", thumbnailUrl = imageUrl,
    title = title, description = description, siteName = siteName, domain = domain,
    displayUrl = canonicalUrl.ifBlank { url }, domainAgeYears = domainAgeYears
)

private fun SocialMedia.asLinkPreview(): SocialLinkPreview? {
    if (type != "link_preview") return null
    return SocialLinkPreview(
        url = displayUrl ?: url, canonicalUrl = displayUrl ?: url, domain = domain.orEmpty(), title = title.orEmpty(),
        description = description, imageUrl = thumbnailUrl, siteName = siteName, domainAgeYears = domainAgeYears
    )
}

private fun postBackgroundColor(value: Any?): Color? = value?.toString()
    ?.trim()
    ?.takeIf { it.startsWith("#") }
    ?.let { raw -> runCatching { Color(android.graphics.Color.parseColor(raw)) }.getOrNull() }

private fun isDarkPostBackground(value: Any?): Boolean = value?.toString()?.uppercase(Locale.US) in setOf(
    "#111827", "#1877F2", "#C026D3", "#EA580C"
)

private fun backgroundPostTextSize(length: Int) = when {
    length > 360 -> 13.sp
    length > 240 -> 15.sp
    length > 150 -> 17.sp
    length > 85 -> 19.sp
    else -> 22.sp
}

private fun backgroundPostLineHeight(length: Int) = when {
    length > 360 -> 17.sp
    length > 240 -> 19.sp
    length > 150 -> 22.sp
    length > 85 -> 25.sp
    else -> 28.sp
}

@Composable
private fun SocialLinkCard(preview: SocialLinkPreview, modifier: Modifier = Modifier, onClose: (() -> Unit)? = null) {
    val context = LocalContext.current
    val destination = preview.canonicalUrl.ifBlank { preview.url }
    Column(
        modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(Color(0xFFF3F4F6))
            .clickable { runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(destination))) } }
    ) {
        if (!preview.imageUrl.isNullOrBlank()) Box(Modifier.fillMaxWidth().height(154.dp)) {
            AsyncImage(preview.imageUrl, preview.title, Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
            if (onClose != null) IconButton(
                onClick = onClose,
                modifier = Modifier.align(Alignment.TopEnd).padding(5.dp).size(29.dp).background(Color.Black.copy(alpha = .62f), CircleShape)
            ) { Icon(Icons.Default.Close, "Remove link preview", tint = Color.White, modifier = Modifier.size(17.dp)) }
        }
        Column(Modifier.fillMaxWidth().padding(horizontal = 10.dp, vertical = 8.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text((preview.siteName ?: preview.domain).uppercase(Locale.getDefault()), color = Color(0xFF65676B), fontSize = 9.sp, maxLines = 1)
                preview.domainAgeYears?.let { age ->
                    Text("  ·  ${if (age == 0) "New domain" else "$age ${if (age == 1) "year" else "years"} old"}", color = Color(0xFF8A8D91), fontSize = 9.sp)
                }
            }
            Text(preview.title.ifBlank { preview.domain }, fontWeight = FontWeight.Bold, fontSize = 13.sp, lineHeight = 16.sp, maxLines = 2, overflow = TextOverflow.Ellipsis)
            if (!preview.description.isNullOrBlank()) Text(preview.description, color = Color(0xFF65676B), fontSize = 10.sp, lineHeight = 13.sp, maxLines = 2, overflow = TextOverflow.Ellipsis)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PostCard(
    post: Post,
    repository: SocialRepository,
    onShareClick: () -> Unit = {},
    onAuthorClick: () -> Unit = {},
    onOpen: (Int) -> Unit = {},
    onEditRequest: ((Post) -> Unit)? = null,
    onOpenLinkedPost: ((String) -> Unit)? = null,
    onCommentProfile: (String) -> Unit = {}
) {
    var isExpanded by remember { mutableStateOf(false) }
    var showMenu by remember { mutableStateOf(false) }
    var showEdit by remember { mutableStateOf(false) }
    var showDelete by remember { mutableStateOf(false) }
    var showReport by remember { mutableStateOf(false) }
    var showVerified by remember { mutableStateOf(false) }
    var showPrivacy by remember { mutableStateOf(false) }
    var showCommentPolicy by remember { mutableStateOf(false) }
    var showComments by remember { mutableStateOf(false) }
    var showReactions by remember { mutableStateOf(false) }
    var editBody by remember(post.content) { mutableStateOf(post.content) }
    var displayedLiked by remember(post.id) { mutableStateOf(post.liked) }
    var displayedLikes by remember(post.id) { mutableIntStateOf(post.likes) }
    var reacting by remember(post.id) { mutableStateOf(false) }
    val scope = rememberTiwiCoroutineScope()
    val context = LocalContext.current
    val isOwn = post.authorId == repository.currentUserId()
    val backgroundColor = postBackgroundColor(post.metadata["background"])
    val darkBackground = isDarkPostBackground(post.metadata["background"])
    LaunchedEffect(post.liked, post.likes) {
        displayedLiked = post.liked
        displayedLikes = post.likes
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.background)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 11.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            DecoratedAvatar(
                url = post.authorAvatarUrl,
                fallback = post.authorAvatar,
                decoration = post.authorDecoration,
                modifier = Modifier.size(43.dp).clickable { onAuthorClick() },
                contentScale = ContentScale.Crop
            )
            Spacer(modifier = Modifier.width(7.dp))
            Column(modifier = Modifier.weight(1f).clickable { onAuthorClick() }) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = post.author,
                    style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    )
                    if (post.verified) {
                        Spacer(modifier = Modifier.width(2.dp))
                        VerifiedBadge(post.badgeType, 17.dp, onClick = { showVerified = true })
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
            IconButton(onClick = { showMenu = true }, modifier = Modifier.size(40.dp)) {
                PostOptionsGlyph()
            }
        }

        if (post.content.isNotBlank()) {
            val normalPost = backgroundColor == null
            Column(
                modifier = if (normalPost) {
                    Modifier.padding(horizontal = 9.dp, vertical = 2.dp)
                } else {
                    Modifier.fillMaxWidth().padding(horizontal = 9.dp, vertical = 4.dp)
                        .aspectRatio(1f).clip(RoundedCornerShape(14.dp)).background(backgroundColor ?: Color.Transparent)
                        .padding(18.dp)
                },
                verticalArrangement = if (normalPost) Arrangement.Top else Arrangement.Center
            ) {
                Text(
                    text = highlightMentions(post.content),
                    color = if (normalPost) MaterialTheme.colorScheme.onBackground else if (darkBackground) Color.White else Color.Black,
                    style = MaterialTheme.typography.bodyMedium.copy(
                        fontSize = if (normalPost) 14.sp else backgroundPostTextSize(post.content.length),
                        lineHeight = if (normalPost) 20.sp else backgroundPostLineHeight(post.content.length),
                        fontWeight = if (normalPost) FontWeight.Normal else FontWeight.SemiBold,
                        textAlign = if (normalPost) TextAlign.Start else TextAlign.Center
                    ),
                    maxLines = if (isExpanded) Int.MAX_VALUE else if (normalPost) 3 else 12,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.fillMaxWidth()
                )
                if (post.content.length > 100) {
                    Text(
                        text = if (isExpanded) "See less" else "See more",
                        modifier = Modifier.clickable { isExpanded = !isExpanded }.padding(top = 4.dp),
                        color = if (normalPost) TiwiBlue else if (darkBackground) Color.White.copy(alpha = .88f) else Color.Black.copy(alpha = .72f),
                        style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold),
                        textAlign = if (normalPost) TextAlign.Start else TextAlign.Center
                    )
                }
            }
        }

        linkPreviewFromMetadata(post.metadata["linkPreview"])?.let { preview ->
            SocialLinkCard(preview, Modifier.padding(horizontal = 9.dp, vertical = 5.dp))
        }

        PostMediaGrid(
            media = post.media,
            onOpen = onOpen,
            onOpenLinkedPost = { linkedId -> onOpenLinkedPost?.invoke(linkedId) ?: onOpen(0) },
            onOpenLinkedProfile = onCommentProfile
        )

        if (displayedLikes + post.comments + post.shares + post.saves + post.views > 0) {
            Row(Modifier.fillMaxWidth().padding(horizontal = 9.dp, vertical = 2.dp), verticalAlignment = Alignment.CenterVertically) {
                if (displayedLikes > 0) {
                    Row(Modifier.clip(RoundedCornerShape(8.dp)).clickable { showReactions = true }.padding(vertical = 2.dp), verticalAlignment = Alignment.CenterVertically) {
                        Box(Modifier.size(18.dp).background(Color(0xFFFF3B5C), CircleShape), contentAlignment = Alignment.Center) {
                            Icon(Icons.Filled.Favorite, null, tint = Color.White, modifier = Modifier.size(11.dp))
                        }
                        Spacer(Modifier.width(4.dp))
                        Text(formatCount(displayedLikes), color = Color.Gray, fontSize = 11.sp)
                    }
                }
                Spacer(Modifier.weight(1f))
                if (post.comments > 0) Text("${formatCount(post.comments)} comments", color = Color.Gray, fontSize = 10.sp, modifier = Modifier.clickable { showComments = true }.padding(2.dp))
                if (post.shares > 0) Text(" · ${formatCount(post.shares)} reposts", color = Color.Gray, fontSize = 10.sp)
                if (post.saves > 0) Text(" · ${formatCount(post.saves)} saves", color = Color.Gray, fontSize = 10.sp)
                if (post.views > 0) Text(" · ${formatCount(post.views)} views", color = Color.Gray, fontSize = 10.sp)
            }
        }

        Row(
            modifier = Modifier.fillMaxWidth().height(42.dp).padding(horizontal = 3.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            CompactPostAction(
                icon = if (displayedLiked) Icons.Filled.Favorite else Icons.Outlined.FavoriteBorder,
                count = displayedLikes,
                tint = if (displayedLiked) Color.Red else Color.Gray,
                description = "Like"
            ) {
                if (!reacting) {
                    val previousLiked = displayedLiked
                    val previousLikes = displayedLikes
                    displayedLiked = !previousLiked
                    displayedLikes = (previousLikes + if (displayedLiked) 1 else -1).coerceAtLeast(0)
                    reacting = true
                    playLikeSound(context)
                    scope.launch {
                        runCatching { repository.reactToPost(post.id) }
                            .onFailure { displayedLiked = previousLiked; displayedLikes = previousLikes }
                        reacting = false
                    }
                }
            }
            CompactPostAction(Icons.Outlined.ChatBubbleOutline, post.comments, description = "Comment") { showComments = true }
            CompactPostAction(Icons.Default.Repeat, post.shares, description = "Repost") {
                scope.launch { runCatching { repository.repostPost(post.id) }.onSuccess { Toast.makeText(context, "Reposted", Toast.LENGTH_SHORT).show() } }
            }
            IconButton(onClick = onShareClick, modifier = Modifier.size(38.dp)) { Icon(Icons.Outlined.Share, "Share", Modifier.size(22.dp), tint = Color.Gray) }
            IconButton(onClick = { scope.launch { runCatching { repository.savePost(post.id, !post.saved) }.onSuccess { Toast.makeText(context, if (post.saved) "Removed from Saved" else "Saved", Toast.LENGTH_SHORT).show() } } }, modifier = Modifier.size(38.dp)) {
                Icon(if (post.saved) Icons.Filled.Bookmark else Icons.Outlined.BookmarkBorder, "Save", Modifier.size(22.dp), tint = if (post.saved) TiwiBlue else Color.Gray)
            }
        }
        
        HorizontalDivider(
            thickness = 0.5.dp,
            color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.1f)
        )
    }

    if (showEdit) AlertDialog(onDismissRequest = { showEdit = false }, containerColor = Color.White, tonalElevation = 0.dp, title = { Text("Edit post") }, text = {
        OutlinedTextField(editBody, { editBody = it }, modifier = Modifier.fillMaxWidth(), minLines = 3)
    }, confirmButton = { TextButton(onClick = { showEdit = false; scope.launch { runCatching { repository.updatePost(post.id, editBody) } } }) { Text("Save") } }, dismissButton = { TextButton(onClick = { showEdit = false }) { Text("Cancel") } })
    if (showDelete) AlertDialog(onDismissRequest = { showDelete = false }, containerColor = Color.White, tonalElevation = 0.dp, title = { Text("Delete post?") }, text = { Text("This removes the post from every feed.") },
        confirmButton = { TextButton(onClick = { showDelete = false; scope.launch { runCatching { repository.deletePost(post.id) } } }) { Text("Delete", color = Color.Red) } },
        dismissButton = { TextButton(onClick = { showDelete = false }) { Text("Cancel") } })
    if (showReport) AlertDialog(onDismissRequest = { showReport = false }, containerColor = Color.White, tonalElevation = 0.dp, title = { Text("Report post") }, text = { Text("Report spam, harassment, false information or inappropriate content to Tiwlo administrators.") },
        confirmButton = { TextButton(onClick = { showReport = false; scope.launch { runCatching { repository.reportContent("post", post.id, "inappropriate_content") }.onSuccess { Toast.makeText(context, "Report sent", Toast.LENGTH_SHORT).show() } } }) { Text("Send report") } },
        dismissButton = { TextButton(onClick = { showReport = false }) { Text("Cancel") } })
    if (showVerified) VerifiedInfoSheet(post.author, post.authorAvatarUrl, post.badgeType, post.authorDecoration, onDismiss = { showVerified = false })
    if (showMenu) PostActionsSheet(
        post = post, isOwn = isOwn, onDismiss = { showMenu = false },
        onEdit = { showMenu = false; if (onEditRequest != null) onEditRequest(post) else showEdit = true }, onDelete = { showMenu = false; showDelete = true },
        onReport = { showMenu = false; showReport = true }, onPrivacy = { showMenu = false; showPrivacy = true },
        onCommentPolicy = { showMenu = false; showCommentPolicy = true }, onShare = { showMenu = false; onShareClick() },
        onSave = { showMenu = false; scope.launch { runCatching { repository.savePost(post.id, !post.saved) }.onSuccess { Toast.makeText(context, if (post.saved) "Removed from Saved" else "Saved", Toast.LENGTH_SHORT).show() } } },
        onFavorite = { showMenu = false; scope.launch { runCatching { repository.favoriteUser(post.authorId, true) }.onSuccess { Toast.makeText(context, "${post.author} added to Favorites", Toast.LENGTH_SHORT).show() } } },
        onSnooze = { showMenu = false; scope.launch { runCatching { repository.snoozeUser(post.authorId, 30) }.onSuccess { Toast.makeText(context, "${post.author} snoozed for 30 days", Toast.LENGTH_SHORT).show() } } },
        onPin = { showMenu = false; scope.launch { runCatching { repository.updatePostOptions(post.id, pinned = !post.pinned) }.onSuccess { Toast.makeText(context, if (post.pinned) "Post unpinned" else "Post pinned", Toast.LENGTH_SHORT).show() } } },
        onCopy = {
            showMenu = false
            val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            clipboard.setPrimaryClip(ClipData.newPlainText("Tiwi post", "https://tiwlo.com/social/post/${post.id}"))
            Toast.makeText(context, "Link copied", Toast.LENGTH_SHORT).show()
        },
        onCreateAd = { showMenu = false; context.startActivity(Intent(Intent.ACTION_VIEW, android.net.Uri.parse("https://tiwlo.com/ads/create?post=${post.id}"))) },
        onPartnership = { showMenu = false; context.startActivity(Intent(Intent.ACTION_VIEW, android.net.Uri.parse("https://tiwlo.com/social/partnership?post=${post.id}"))) }
    )
    if (showPrivacy) ChoiceDialog("Post audience", listOf("public" to "Public", "followers" to "Followers", "private" to "Only me"), post.visibility, { showPrivacy = false }) { value ->
        showPrivacy = false; scope.launch { runCatching { repository.updatePostOptions(post.id, visibility = value) } }
    }
    if (showCommentPolicy) ChoiceDialog("Who can comment", listOf("everyone" to "Everyone", "followers" to "Followers", "none" to "No one"), post.commentPermission, { showCommentPolicy = false }) { value ->
        showCommentPolicy = false; scope.launch { runCatching { repository.updatePostOptions(post.id, commentPermission = value) } }
    }
    if (showComments) CompactCommentsSheet(repository, post, onDismiss = { showComments = false }, onProfileClick = onCommentProfile)
    if (showReactions) SocialPeopleDialog(
        title = "People who liked this",
        repository = repository,
        load = { repository.postReactions(post.id) },
        onDismiss = { showReactions = false },
        onProfileClick = { showReactions = false; onCommentProfile(it) }
    )
}

/** Compact two-line action glyph used consistently for post actions. */
@Composable
private fun PostOptionsGlyph(modifier: Modifier = Modifier) {
    Canvas(modifier.size(24.dp)) {
        val strokeWidth = 2.7.dp.toPx()
        val start = 2.dp.toPx()
        drawLine(
            color = Color.Black,
            start = Offset(start, size.height * .36f),
            end = Offset(size.width - start, size.height * .36f),
            strokeWidth = strokeWidth,
            cap = StrokeCap.Round
        )
        drawLine(
            color = Color.Black,
            start = Offset(start, size.height * .67f),
            end = Offset(size.width * .63f, size.height * .67f),
            strokeWidth = strokeWidth,
            cap = StrokeCap.Round
        )
    }
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
        IconButton(onClick = onClick, modifier = Modifier.size(38.dp)) {
            Icon(icon, contentDescription = description, modifier = Modifier.size(22.dp), tint = tint)
        }
        if (count > 0) Text(formatCount(count), style = MaterialTheme.typography.labelSmall, color = Color.Gray)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun PostActionsSheet(
    post: Post, isOwn: Boolean, onDismiss: () -> Unit, onEdit: () -> Unit, onDelete: () -> Unit, onReport: () -> Unit,
    onPrivacy: () -> Unit, onCommentPolicy: () -> Unit, onShare: () -> Unit, onSave: () -> Unit, onFavorite: () -> Unit,
    onSnooze: () -> Unit, onPin: () -> Unit, onCopy: () -> Unit, onCreateAd: () -> Unit, onPartnership: () -> Unit
) {
    var more by remember { mutableStateOf(false) }
    ModalBottomSheet(onDismissRequest = onDismiss, dragHandle = null, containerColor = Color.White, contentColor = Color.Black, tonalElevation = 0.dp) {
        Column(Modifier.fillMaxWidth().navigationBarsPadding().padding(start = 10.dp, end = 10.dp, bottom = 2.dp)) {
            if (more && !isOwn) {
                Row(Modifier.fillMaxWidth().height(42.dp), verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = { more = false }) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") }
                    Text("More options", fontWeight = FontWeight.Bold, fontSize = 19.sp)
                }
                Text("Choose how this person appears in your Feed.", color = Color.Gray, fontSize = 12.sp, modifier = Modifier.padding(horizontal = 9.dp, vertical = 3.dp))
                PostActionRow(Icons.Outlined.StarOutline, "Add ${post.author} to Favorites", "See this person's posts higher in Feed", onFavorite)
                PostActionRow(Icons.Outlined.Snooze, "Snooze ${post.author} for 30 days", "Temporarily hide this person's posts", onSnooze)
                PostActionRow(Icons.Outlined.ContentCopy, "Copy link", "Copy the post deep link", onCopy)
                Spacer(Modifier.height(2.dp))
                return@ModalBottomSheet
            }
            Text(if (isOwn) "Manage your post" else "Post options", fontWeight = FontWeight.Bold, fontSize = 17.sp, modifier = Modifier.padding(horizontal = 8.dp, vertical = 7.dp))
            if (isOwn) {
                PostActionRow(Icons.Outlined.Edit, "Edit post", "Update the text in this post", onEdit)
                PostActionRow(if (post.pinned) Icons.Outlined.PushPin else Icons.Filled.PushPin, if (post.pinned) "Unpin post" else "Pin post", "Keep an important post at the top", onPin)
                PostActionRow(Icons.Outlined.Lock, "Edit privacy", post.visibility.replaceFirstChar { it.uppercase() }, onPrivacy)
                PostActionRow(Icons.Outlined.ChatBubbleOutline, "Who can comment", post.commentPermission.replaceFirstChar { it.uppercase() }, onCommentPolicy)
                PostActionRow(Icons.Outlined.ContentCopy, "Copy link", "Share a direct deep link", onCopy)
                PostActionRow(Icons.Outlined.Campaign, "Create ad", "Promote this post with Tiwlo Ads", onCreateAd)
                PostActionRow(Icons.Outlined.Handshake, "Partnership label", "Manage branded-content partnership", onPartnership)
                PostActionRow(Icons.Outlined.Delete, "Delete this post", "This cannot be undone", onDelete, Color(0xFFB42318))
            } else {
                PostActionRow(if (post.saved) Icons.Filled.Bookmark else Icons.Outlined.BookmarkBorder, if (post.saved) "Remove from Saved" else "Save post or reel", "Find it later in Your Shortcuts", onSave)
                PostActionRow(Icons.Outlined.Flag, "Report post", "Send it to Tiwi moderators", onReport)
                PostActionRow(Icons.Outlined.Share, "Share", "Send, repost or copy a link", onShare)
                PostActionRow(Icons.Outlined.Tune, "More options", "Control what appears in your feed", { more = true })
            }
            Spacer(Modifier.height(2.dp))
        }
    }
}

@Composable
private fun PostActionRow(icon: ImageVector, title: String, subtitle: String, onClick: () -> Unit, tint: Color = Color(0xFF344054)) {
    Row(Modifier.fillMaxWidth().height(52.dp).clip(RoundedCornerShape(9.dp)).clickable(onClick = onClick).padding(horizontal = 8.dp), verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(38.dp).background(Color(0xFFF0F2F5), CircleShape), contentAlignment = Alignment.Center) { Icon(icon, null, tint = tint, modifier = Modifier.size(21.dp)) }
        Column(Modifier.weight(1f).padding(start = 9.dp)) {
            Text(title, fontWeight = FontWeight.SemiBold, color = tint, fontSize = 14.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(subtitle, fontSize = 11.sp, color = Color.Gray, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        Icon(Icons.Default.ChevronRight, null, tint = Color.Gray, modifier = Modifier.size(17.dp))
    }
}

@Composable
private fun ChoiceDialog(title: String, options: List<Pair<String, String>>, selected: String, onDismiss: () -> Unit, onSelect: (String) -> Unit) {
    AlertDialog(onDismissRequest = onDismiss, containerColor = Color.White, tonalElevation = 0.dp, title = { Text(title) }, text = {
        Column { options.forEach { option -> Row(Modifier.fillMaxWidth().clickable { onSelect(option.first) }.padding(vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) { RadioButton(selected == option.first, onClick = { onSelect(option.first) }); Text(option.second, Modifier.padding(start = 8.dp)) } } }
    }, confirmButton = {}, dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } })
}

@Composable
private fun PostMediaGrid(
    media: List<SocialMedia>,
    onOpen: (Int) -> Unit,
    onOpenLinkedPost: (String) -> Unit,
    onOpenLinkedProfile: (String) -> Unit
) {
    if (media.isEmpty()) return
    if (media.size == 1 && media.first().type == "shared_post") {
        val shared = media.first()
        SharedPostCard(
            media = shared,
            onOpenPost = { linkedSharedPostId(shared)?.let(onOpenLinkedPost) ?: onOpen(0) },
            onOpenProfile = { shared.sharedAuthorId?.let(onOpenLinkedProfile) }
        )
        return
    }
    val visible = media.take(4)
    val cell: @Composable (SocialMedia, Modifier, Int) -> Unit = { item, modifier, index ->
        Box(modifier.background(Color.Black)) {
            if (item.type == "video") TiwiVideo(
                item.hlsUrl?.takeIf { item.processingStatus == "ready" } ?: item.url,
                Modifier.fillMaxSize(),
                autoplay = media.size == 1,
                fallbackUrl = item.url,
                posterUrl = item.thumbnailUrl,
                interactive = false
            )
            else AsyncImage(model = item.url, contentDescription = null, modifier = Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
            if (index == 3 && media.size > 4) Box(Modifier.fillMaxSize().background(Color.Black.copy(alpha = .55f)), contentAlignment = Alignment.Center) {
                Text("+${media.size - 4}", color = Color.White, fontSize = 28.sp, fontWeight = FontWeight.Bold)
            }
            Box(Modifier.matchParentSize().clickable { onOpen(index) })
        }
    }
    when (visible.size) {
        1 -> cell(visible[0], Modifier.fillMaxWidth().heightIn(min = 200.dp, max = 400.dp), 0)
        2 -> Row(Modifier.fillMaxWidth().height(270.dp), horizontalArrangement = Arrangement.spacedBy(1.dp)) {
            visible.forEachIndexed { i, item -> cell(item, Modifier.weight(1f).fillMaxHeight(), i) }
        }
        else -> Row(Modifier.fillMaxWidth().height(320.dp), horizontalArrangement = Arrangement.spacedBy(1.dp)) {
            cell(visible[0], Modifier.weight(1.2f).fillMaxHeight(), 0)
            Column(Modifier.weight(1f).fillMaxHeight(), verticalArrangement = Arrangement.spacedBy(1.dp)) {
                visible.drop(1).forEachIndexed { i, item -> cell(item, Modifier.weight(1f).fillMaxWidth(), i + 1) }
            }
        }
    }
}

@Composable
private fun SharedPostCard(media: SocialMedia, onOpenPost: () -> Unit, onOpenProfile: () -> Unit) {
    Column(
        Modifier.fillMaxWidth().padding(horizontal = 10.dp, vertical = 4.dp)
            .border(1.dp, Color(0xFFE2E2E2), RoundedCornerShape(10.dp))
            .clip(RoundedCornerShape(10.dp)).background(Color.White)
    ) {
        Row(Modifier.fillMaxWidth().clickable(onClick = onOpenProfile).padding(10.dp), verticalAlignment = Alignment.CenterVertically) {
            TiwiAvatar(media.sharedAvatar, R.drawable.img_tiwi_avatar_1, Modifier.size(38.dp).clip(CircleShape))
            Spacer(Modifier.width(8.dp))
            Column(Modifier.weight(1f)) {
                Text(media.sharedAuthor ?: "Tiwlo user", fontWeight = FontWeight.Bold, color = Color.Black, maxLines = 1)
                Text("Reposted from · ${relativePostTime(media.sharedPublishedAt)}", fontSize = 12.sp, color = Color.Gray)
            }
            Icon(Icons.Default.ChevronRight, contentDescription = "Open source profile", tint = Color.Gray, modifier = Modifier.size(18.dp))
        }
        Column(Modifier.fillMaxWidth().clickable(onClick = onOpenPost)) {
            if (!media.sharedBody.isNullOrBlank()) {
                Text(media.sharedBody, modifier = Modifier.padding(horizontal = 10.dp, vertical = 2.dp), color = Color.Black)
            }
            if (media.url.isNotBlank()) {
                Box(Modifier.fillMaxWidth().heightIn(min = 180.dp, max = 360.dp).background(Color.Black), contentAlignment = Alignment.Center) {
                    if (media.sharedMediaType in listOf("video", "reel")) {
                        TiwiVideo(
                            url = media.hlsUrl?.takeIf { media.processingStatus == "ready" } ?: media.url,
                            modifier = Modifier.fillMaxSize(),
                            autoplay = true,
                            fallbackUrl = media.url,
                            posterUrl = media.thumbnailUrl,
                            muted = false,
                            coordinated = true,
                            interactive = true
                        )
                    } else {
                        AsyncImage(model = media.url, contentDescription = "Shared post media", modifier = Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                    }
                }
            }
            Text(
                "${media.sharedReactions} reactions  ·  ${media.sharedComments} comments  ·  ${media.sharedViews} views",
                modifier = Modifier.padding(10.dp), fontSize = 12.sp, color = Color.Gray
            )
        }
    }
}

@Composable
private fun StoryReferenceCard(media: SocialMedia, onOpenStory: () -> Unit) {
    Surface(
        modifier = Modifier.widthIn(max = 270.dp).padding(horizontal = 3.dp, vertical = 2.dp).clickable(onClick = onOpenStory),
        color = Color.White,
        shape = RoundedCornerShape(13.dp),
        border = BorderStroke(.7.dp, Color(0xFFE0E3E8)),
        tonalElevation = 0.dp
    ) {
        Column {
            Box(Modifier.fillMaxWidth().height(150.dp).background(Color(0xFF1E293B)), contentAlignment = Alignment.Center) {
                when {
                    media.type == "story_reference" && media.hlsUrl?.isNotBlank() == true -> TiwiVideo(
                        url = media.hlsUrl,
                        fallbackUrl = media.url,
                        posterUrl = media.thumbnailUrl,
                        modifier = Modifier.fillMaxSize(),
                        autoplay = false,
                        muted = false,
                        coordinated = false,
                        interactive = true
                    )
                    media.thumbnailUrl?.isNotBlank() == true -> AsyncImage(media.thumbnailUrl, "Story preview", Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                    media.url.isNotBlank() -> AsyncImage(media.url, "Story preview", Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                    else -> Icon(Icons.Outlined.AutoStories, null, tint = Color.White, modifier = Modifier.size(34.dp))
                }
            }
            Row(Modifier.fillMaxWidth().padding(horizontal = 10.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Outlined.AutoStories, null, tint = TiwiBlue, modifier = Modifier.size(17.dp))
                Column(Modifier.padding(start = 7.dp).weight(1f)) {
                    Text(media.title ?: "Story reply", color = Color.Black, fontWeight = FontWeight.Bold, fontSize = 12.sp, maxLines = 1)
                    Text(media.description?.takeIf { it.isNotBlank() } ?: "Tap to view this story", color = Color(0xFF667085), fontSize = 10.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun VerifiedInfoSheet(name: String, avatar: String?, badgeType: String = "blue", decoration: SocialProfileDecoration? = null, onDismiss: () -> Unit) {
    ModalBottomSheet(onDismissRequest = onDismiss, dragHandle = null, containerColor = Color.White, contentColor = Color.Black, tonalElevation = 0.dp) {
        Column(Modifier.fillMaxWidth().padding(20.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            DecoratedAvatar(avatar, R.drawable.img_tiwi_avatar_1, decoration, Modifier.size(82.dp))
            Spacer(Modifier.height(8.dp))
            Row(verticalAlignment = Alignment.CenterVertically) { Text(name, fontWeight = FontWeight.Bold, fontSize = 18.sp); Spacer(Modifier.width(3.dp)); VerifiedBadge(badgeType, 24.dp) }
            Spacer(Modifier.height(10.dp))
            Text("This profile is verified", fontWeight = FontWeight.Bold)
            Text(if (badgeType == "gold") "Tiwi confirmed this is an authentic notable person or organization." else "Tiwi confirmed that this is the authentic presence for this account.", textAlign = TextAlign.Center, color = Color.Gray, modifier = Modifier.padding(vertical = 8.dp))
            Button(onClick = onDismiss, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(8.dp)) { Text("Got it") }
            Spacer(Modifier.navigationBarsPadding())
        }
    }
}

@Composable
private fun PostDetailScreen(
    repository: SocialRepository,
    postId: String,
    initialMediaIndex: Int? = null,
    onBack: () -> Unit,
    onProfileClick: (String) -> Unit,
    onShare: (Post) -> Unit,
    onEdit: (String) -> Unit = {},
    onLinkedPost: (String) -> Unit = {}
) {
    val feed by repository.feed.collectAsState()
    val commentsByPost by repository.comments.collectAsState()
    val post = feed.firstOrNull { it.id == postId }?.let(::toUiPost)
    val comments = commentsByPost[postId].orEmpty()
    val expandedReplies = remember(postId) { mutableStateMapOf<String, Boolean>() }
    var text by remember { mutableStateOf("") }
    var replyTo by remember { mutableStateOf<SocialComment?>(null) }
    var sending by remember { mutableStateOf(false) }
    var showMediaViewer by remember(postId, initialMediaIndex) { mutableStateOf(initialMediaIndex != null) }
    var initialMediaPage by remember(postId, initialMediaIndex) { mutableIntStateOf(initialMediaIndex ?: 0) }
    val scope = rememberTiwiCoroutineScope()
    val context = LocalContext.current

    LaunchedEffect(postId) {
        runCatching { repository.viewPost(postId) }
        runCatching { repository.refreshComments(postId) }
    }
    if (showMediaViewer && post != null && post.media.isNotEmpty()) {
        BackHandler { showMediaViewer = false }
        PostMediaViewerPage(post, repository, initialPage = initialMediaPage, onBack = { showMediaViewer = false }, onProfileClick = onProfileClick)
        return
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
            post?.let { item {
                PostCard(
                    it,
                    repository,
                    onShareClick = { onShare(it) },
                    onAuthorClick = { onProfileClick(it.authorId) },
                    onOpen = { page -> initialMediaPage = page; showMediaViewer = true },
                    onEditRequest = { value -> onEdit(value.id) },
                    onOpenLinkedPost = onLinkedPost,
                    onCommentProfile = onProfileClick
                )
            } }
            item { Text("Comments", modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp), fontWeight = FontWeight.Bold) }
            if (comments.isEmpty()) item { Text("Be the first to comment", color = Color.Gray, modifier = Modifier.padding(24.dp).fillMaxWidth(), textAlign = TextAlign.Center) }
            val byId = comments.associateBy { it.id }
            val roots = comments.filter { it.replyToId == null }
            roots.forEach { root ->
                item(key = root.id) {
                    CommentRow(
                        comment = root, isOwn = root.authorId == repository.currentUserId(), onProfile = { onProfileClick(root.authorId) },
                        onReply = { replyTo = root; text = "@${root.authorProfile?.username?.ifBlank { root.author.name.substringBefore(' ') } ?: root.author.name.substringBefore(' ')} " },
                        onLike = { scope.launch { runCatching { repository.reactToComment(postId, root.id) } } },
                        onDelete = { scope.launch { runCatching { repository.deleteComment(postId, root.id) } } },
                        onReport = { scope.launch { runCatching { repository.reportContent("comment", root.id, "inappropriate_content") }.onSuccess { Toast.makeText(context, "Report sent", Toast.LENGTH_SHORT).show() } } }
                    )
                }
                val replies = comments.filter { candidate ->
                    if (candidate.replyToId == null) false else generateSequence(candidate.replyToId) { id -> byId[id]?.replyToId }.take(20).any { it == root.id }
                }.sortedBy { it.createdAt }
                val shown = if (expandedReplies[root.id] == true) replies else replies.take(1)
                items(shown, key = { it.id }) { comment ->
                    CommentRow(
                        comment = comment, isOwn = comment.authorId == repository.currentUserId(), onProfile = { onProfileClick(comment.authorId) },
                        onReply = { replyTo = comment; text = "@${comment.authorProfile?.username?.ifBlank { comment.author.name.substringBefore(' ') } ?: comment.author.name.substringBefore(' ')} " },
                        onLike = { scope.launch { runCatching { repository.reactToComment(postId, comment.id) } } },
                        onDelete = { scope.launch { runCatching { repository.deleteComment(postId, comment.id) } } },
                        onReport = { scope.launch { runCatching { repository.reportContent("comment", comment.id, "inappropriate_content") }.onSuccess { Toast.makeText(context, "Report sent", Toast.LENGTH_SHORT).show() } } }
                    )
                }
                if (replies.size > shown.size) item(key = "more-${root.id}") {
                    Text(
                        "View ${replies.size - shown.size} more ${if (replies.size - shown.size == 1) "reply" else "replies"}",
                        modifier = Modifier.padding(start = 88.dp, top = 2.dp, bottom = 8.dp).clickable { expandedReplies[root.id] = true },
                        color = Color.Gray, fontWeight = FontWeight.Bold, fontSize = 12.sp
                    )
                }
            }
        }
        replyTo?.let { target ->
            Row(Modifier.fillMaxWidth().background(Color(0xFFF3F3F3)).padding(horizontal = 12.dp, vertical = 5.dp), verticalAlignment = Alignment.CenterVertically) {
                Text("Replying to ${target.author.name}", modifier = Modifier.weight(1f), fontSize = 12.sp, color = Color.Gray)
                IconButton(onClick = { replyTo = null }, modifier = Modifier.size(28.dp)) { Icon(Icons.Default.Close, null, modifier = Modifier.size(16.dp)) }
            }
        }
        Row(Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
            DecoratedAvatar(repository.currentUser.value?.avatar, R.drawable.img_tiwi_avatar_1, repository.profile.value?.avatarDecoration, Modifier.size(38.dp))
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
private fun PostMediaViewerPage(
    post: Post,
    repository: SocialRepository,
    initialPage: Int = 0,
    onBack: () -> Unit,
    onProfileClick: (String) -> Unit
) {
    val visualMedia = remember(post.media) { post.media.filter { it.type == "image" || it.type == "video" } }
    val pager = rememberPagerState(initialPage = initialPage.coerceIn(0, (visualMedia.size - 1).coerceAtLeast(0)), pageCount = { visualMedia.size.coerceAtLeast(1) })
    val scope = rememberTiwiCoroutineScope()
    val context = LocalContext.current
    var showMenu by remember { mutableStateOf(false) }
    var showComments by remember { mutableStateOf(false) }
    val currentMedia = visualMedia.getOrNull(pager.currentPage)
    Column(Modifier.fillMaxSize().background(Color.Black).statusBarsPadding().navigationBarsPadding()) {
        Row(Modifier.fillMaxWidth().height(48.dp).padding(horizontal = 2.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack, modifier = Modifier.size(42.dp)) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back", tint = Color.White, modifier = Modifier.size(22.dp)) }
            Row(Modifier.weight(1f).clickable { onProfileClick(post.authorId) }, verticalAlignment = Alignment.CenterVertically) {
                DecoratedAvatar(post.authorAvatarUrl, post.authorAvatar, post.authorDecoration, Modifier.size(34.dp))
                Text(post.author, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 13.sp, modifier = Modifier.padding(start = 7.dp), maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
            if (visualMedia.size > 1) Text("${pager.currentPage + 1}/${visualMedia.size}", color = Color.White, fontSize = 11.sp, modifier = Modifier.padding(horizontal = 5.dp), fontWeight = FontWeight.Bold)
            Box {
                IconButton(onClick = { showMenu = true }, modifier = Modifier.size(42.dp)) { Icon(Icons.Default.MoreVert, "Media options", tint = Color.White, modifier = Modifier.size(22.dp)) }
                DropdownMenu(expanded = showMenu, onDismissRequest = { showMenu = false }) {
                    DropdownMenuItem(
                        text = { Text("Download") },
                        leadingIcon = { Icon(Icons.Outlined.Download, null) },
                        enabled = currentMedia != null,
                        onClick = {
                            currentMedia?.let { media ->
                                showMenu = false
                                scope.launch {
                                    val saved = saveRemoteMediaToGallery(context, media.url, video = media.type == "video")
                                    Toast.makeText(context, if (saved) "Saved to gallery" else "Download failed", Toast.LENGTH_SHORT).show()
                                }
                            }
                        }
                    )
                    DropdownMenuItem(
                        text = { Text(if (post.saved) "Remove from Saved" else "Save post") },
                        leadingIcon = { Icon(if (post.saved) Icons.Filled.Bookmark else Icons.Outlined.BookmarkBorder, null) },
                        onClick = { showMenu = false; scope.launch { runCatching { repository.savePost(post.id, !post.saved) } } }
                    )
                    DropdownMenuItem(
                        text = { Text("Copy link") },
                        leadingIcon = { Icon(Icons.Outlined.Link, null) },
                        onClick = {
                            showMenu = false
                            (context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager)
                                .setPrimaryClip(ClipData.newPlainText("Tiwi post", "https://tiwlo.com/social/post/${post.id}"))
                            Toast.makeText(context, "Link copied", Toast.LENGTH_SHORT).show()
                        }
                    )
                    if (post.authorId != repository.currentUserId()) DropdownMenuItem(
                        text = { Text("Report post", color = Color(0xFFD92D20)) },
                        leadingIcon = { Icon(Icons.Outlined.Report, null, tint = Color(0xFFD92D20)) },
                        onClick = {
                            showMenu = false
                            scope.launch { runCatching { repository.reportContent("post", post.id, "inappropriate_content") }.onSuccess { Toast.makeText(context, "Report sent", Toast.LENGTH_SHORT).show() } }
                        }
                    )
                }
            }
        }
        HorizontalPager(state = pager, modifier = Modifier.weight(1f).fillMaxWidth(), beyondViewportPageCount = 0) { page ->
            val media = visualMedia.getOrNull(page)
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                when (media?.type) {
                    "video" -> TiwiVideo(media.hlsUrl?.takeIf { media.processingStatus == "ready" } ?: media.url, Modifier.fillMaxSize(), autoplay = pager.currentPage == page, fallbackUrl = media.url, posterUrl = media.thumbnailUrl)
                    "image" -> AsyncImage(media.url, "Post media ${page + 1}", Modifier.fillMaxSize(), contentScale = ContentScale.Fit)
                    else -> Text("Media unavailable", color = Color.White)
                }
            }
        }
        HorizontalDivider(color = Color.White.copy(alpha = .14f), thickness = .5.dp)
        Row(
            Modifier.fillMaxWidth().height(54.dp).padding(horizontal = 9.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceAround
        ) {
            MediaViewerAction(if (post.liked) Icons.Filled.Favorite else Icons.Outlined.FavoriteBorder, formatCount(post.likes), if (post.liked) Color(0xFFFF4D67) else Color.White) {
                playLikeSound(context)
                scope.launch { runCatching { repository.reactToPost(post.id) } }
            }
            MediaViewerAction(Icons.Outlined.ChatBubbleOutline, formatCount(post.comments)) { showComments = true }
            MediaViewerAction(Icons.Default.Repeat, formatCount(post.shares)) {
                scope.launch { runCatching { repository.repostPost(post.id) }.onSuccess { Toast.makeText(context, "Reposted", Toast.LENGTH_SHORT).show() } }
            }
            MediaViewerAction(if (post.saved) Icons.Filled.Bookmark else Icons.Outlined.BookmarkBorder, if (post.saved) "Saved" else "Save", if (post.saved) TiwiBlue else Color.White) {
                scope.launch { runCatching { repository.savePost(post.id, !post.saved) } }
            }
        }
    }
    if (showComments) CompactCommentsSheet(repository, post, onDismiss = { showComments = false }, onProfileClick = onProfileClick)
}

@Composable
private fun MediaViewerAction(icon: ImageVector, label: String, tint: Color = Color.White, onClick: () -> Unit) {
    Row(
        Modifier.clip(RoundedCornerShape(16.dp)).clickable(onClick = onClick).padding(horizontal = 9.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(icon, label, tint = tint, modifier = Modifier.size(20.dp))
        Text(label, color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(start = 4.dp))
    }
}

@Composable
private fun EditPostPage(repository: SocialRepository, post: Post, onBack: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberTiwiCoroutineScope()
    var body by remember(post.id) { mutableStateOf(post.content) }
    val media = remember(post.id) { mutableStateListOf<SocialMedia>().apply { addAll(post.media) } }
    var busy by remember { mutableStateOf(false) }
    var progress by remember { mutableIntStateOf(0) }
    val sharedPost = post.media.any { it.type == "shared_post" }
    val picker = rememberLauncherForActivityResult(ActivityResultContracts.PickMultipleVisualMedia(20)) { uris ->
        if (uris.isNotEmpty() && !sharedPost) scope.launch {
            busy = true
            val available = (20 - media.size).coerceAtLeast(0)
            uris.take(available).forEachIndexed { index, uri ->
                runCatching { repository.uploadMedia(context.contentResolver, uri, "post") { fileProgress -> progress = ((index * 100 + fileProgress) / uris.take(available).size.coerceAtLeast(1)) } }
                    .onSuccess { media.add(it) }
                    .onFailure { Toast.makeText(context, it.message ?: "Media upload failed", Toast.LENGTH_LONG).show() }
            }
            progress = 0
            busy = false
        }
    }
    fun save() {
        if (busy || (body.isBlank() && media.isEmpty())) return
        scope.launch {
            busy = true
            runCatching { if (sharedPost) repository.updatePost(post.id, body) else repository.updatePost(post.id, body, media.toList()) }
                .onSuccess { onBack() }
                .onFailure { Toast.makeText(context, it.message ?: "Post update failed", Toast.LENGTH_LONG).show() }
            busy = false
        }
    }
    Column(Modifier.fillMaxSize().background(Color.White).statusBarsPadding().imePadding()) {
        Row(Modifier.fillMaxWidth().height(52.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(enabled = !busy, onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") }
            Text("Edit post", Modifier.weight(1f), fontWeight = FontWeight.Bold, fontSize = 19.sp)
            Button(
                enabled = !busy && (body.isNotBlank() || media.isNotEmpty()), onClick = ::save,
                modifier = Modifier.padding(end = 10.dp).height(36.dp), shape = RoundedCornerShape(8.dp), contentPadding = PaddingValues(horizontal = 18.dp)
            ) { if (busy && progress == 0) CircularProgressIndicator(Modifier.size(17.dp), color = Color.White, strokeWidth = 2.dp) else Text("Save", fontWeight = FontWeight.Bold) }
        }
        HorizontalDivider(color = Color(0xFFE4E7EC))
        Column(Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                DecoratedAvatar(repository.currentUser.value?.avatar, R.drawable.img_tiwi_avatar_1, repository.profile.value?.avatarDecoration, Modifier.size(48.dp))
                Column(Modifier.padding(start = 10.dp)) { Text(repository.currentUser.value?.name.orEmpty(), fontWeight = FontWeight.Bold); Text(post.visibility.replaceFirstChar { it.uppercase() }, color = Color.Gray, fontSize = 12.sp) }
            }
            BasicTextField(
                value = body, onValueChange = { body = it.take(10000) },
                modifier = Modifier.fillMaxWidth().heightIn(min = 140.dp).padding(top = 16.dp),
                textStyle = MaterialTheme.typography.bodyLarge.copy(color = Color.Black),
                decorationBox = { inner -> if (body.isBlank()) Text("What's on your mind?", color = Color.Gray, fontSize = 18.sp); inner() }
            )
            if (media.isNotEmpty()) {
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp), contentPadding = PaddingValues(vertical = 10.dp)) {
                    items(media, key = { "${it.processingId}-${it.url}" }) { item ->
                        Box(Modifier.size(142.dp).clip(RoundedCornerShape(10.dp)).background(Color.Black)) {
                            if (item.type == "video") AsyncImage(item.thumbnailUrl ?: item.url, null, Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                            else if (item.type == "shared_post") SharedPostCard(item, {}, {})
                            else AsyncImage(item.url, null, Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                            if (!sharedPost) FilledIconButton(onClick = { media.remove(item) }, modifier = Modifier.align(Alignment.TopEnd).padding(5.dp).size(30.dp), colors = IconButtonDefaults.filledIconButtonColors(containerColor = Color.Black.copy(alpha = .65f))) { Icon(Icons.Default.Close, "Remove media", tint = Color.White, modifier = Modifier.size(17.dp)) }
                            if (item.type == "video") Icon(Icons.Default.PlayArrow, null, tint = Color.White, modifier = Modifier.align(Alignment.Center).size(34.dp))
                        }
                    }
                }
            }
            if (busy && progress > 0) {
                LinearProgressIndicator(progress = { progress / 100f }, modifier = Modifier.fillMaxWidth())
                Text("Uploading media · $progress%", color = Color.Gray, fontSize = 12.sp, modifier = Modifier.padding(top = 5.dp))
            }
            if (sharedPost) Text("The original shared post stays linked and cannot be replaced. Your own caption can still be edited.", color = Color.Gray, fontSize = 12.sp, modifier = Modifier.padding(vertical = 10.dp))
            else OutlinedButton(
                enabled = !busy && media.size < 20,
                onClick = { picker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageAndVideo)) },
                modifier = Modifier.fillMaxWidth().padding(top = 8.dp), shape = RoundedCornerShape(9.dp)
            ) { Icon(Icons.Outlined.AddPhotoAlternate, null); Spacer(Modifier.width(8.dp)); Text("Add photos or videos (${media.size}/20)", fontWeight = FontWeight.Bold) }
            Text("All changes are revalidated by the Social API before publication.", color = Color.Gray, fontSize = 12.sp, modifier = Modifier.padding(top = 14.dp))
            Spacer(Modifier.navigationBarsPadding().height(18.dp))
        }
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
        Modifier.fillMaxWidth().padding(start = if (comment.replyToId == null) 10.dp else 38.dp, end = 5.dp, top = 5.dp, bottom = 4.dp),
        verticalAlignment = Alignment.Top
    ) {
        DecoratedAvatar(comment.author.avatar, R.drawable.img_tiwi_avatar_1, comment.authorProfile?.avatarDecoration, Modifier.size(34.dp).clickable(onClick = onProfile))
        Spacer(Modifier.width(7.dp))
        Column(Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(comment.author.name, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                if (comment.authorProfile?.verified == true) VerifiedBadge(comment.authorProfile?.badgeType, 13.dp)
            }
            Text(highlightMentions(comment.body), color = MaterialTheme.colorScheme.onBackground, fontSize = 13.sp, lineHeight = 18.sp)
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(relativePostTime(comment.createdAt), fontSize = 11.sp, color = Color.Gray, modifier = Modifier.padding(end = 10.dp))
                Text("Reply", modifier = Modifier.clickable(onClick = onReply).padding(vertical = 5.dp), fontWeight = FontWeight.Bold, fontSize = 12.sp, color = Color.Gray)
                if (comment.reactionCount > 0) Text("  ${formatCount(comment.reactionCount)} likes", fontSize = 11.sp, color = Color.Gray)
            }
        }
        IconButton(onClick = onLike, modifier = Modifier.size(30.dp)) {
            Icon(if (comment.viewerLiked) Icons.Filled.Favorite else Icons.Outlined.FavoriteBorder, "Like comment", tint = if (comment.viewerLiked) Color.Red else Color.Gray, modifier = Modifier.size(15.dp))
        }
        Box {
            IconButton(onClick = { menu = true }, modifier = Modifier.size(30.dp)) { Icon(Icons.Default.MoreVert, null, modifier = Modifier.size(16.dp)) }
            DropdownMenu(expanded = menu, onDismissRequest = { menu = false }) {
                DropdownMenuItem(text = { Text(if (isOwn) "Delete" else "Report") }, onClick = { menu = false; if (isOwn) onDelete() else onReport() })
            }
        }
    }
}

internal fun mentionRanges(value: String): List<IntRange> =
    Regex("@[\\p{L}\\p{N}._-]+").findAll(value).map { it.range }.toList()

private fun highlightMentions(value: String) = buildAnnotatedString {
    var cursor = 0
    mentionRanges(value).forEach { range ->
        if (cursor < range.first) append(value.substring(cursor, range.first))
        withStyle(SpanStyle(color = TiwiBlue, fontWeight = FontWeight.SemiBold)) {
            append(value.substring(range.first, range.last + 1))
        }
        cursor = range.last + 1
    }
    if (cursor < value.length) append(value.substring(cursor))
}

@Composable
private fun SocialPeoplePage(
    title: String,
    repository: SocialRepository,
    load: suspend () -> List<SocialProfile>,
    onBack: () -> Unit,
    onProfileClick: (String) -> Unit = {},
    followBackMode: Boolean = false,
    unblockMode: Boolean = false,
    emptyText: String = "No people to show"
) {
    val scope = rememberTiwiCoroutineScope()
    val context = LocalContext.current
    var people by remember(title) { mutableStateOf<List<SocialProfile>>(emptyList()) }
    var loading by remember(title) { mutableStateOf(true) }
    var refreshKey by remember(title) { mutableIntStateOf(0) }
    var busyId by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(title, refreshKey) {
        loading = true
        runCatching { load() }
            .onSuccess { people = it }
            .onFailure { Toast.makeText(context, it.message ?: "People could not load", Toast.LENGTH_LONG).show() }
        loading = false
    }
    Column(Modifier.fillMaxSize().background(Color.White).statusBarsPadding()) {
        Row(Modifier.fillMaxWidth().height(48.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack, modifier = Modifier.size(44.dp)) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back", modifier = Modifier.size(21.dp)) }
            Text(title, Modifier.weight(1f), fontWeight = FontWeight.Black, fontSize = 17.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        HorizontalDivider(thickness = .5.dp, color = Color(0xFFE4E7EC))
        when {
            loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(Modifier.size(27.dp), strokeWidth = 2.4.dp) }
            people.isEmpty() -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { Text(emptyText, color = Color(0xFF667085), fontSize = 13.sp) }
            else -> LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(vertical = 4.dp)) {
                items(people, key = { "people-${title}-${it.userId}" }) { person ->
                    Row(
                        Modifier.fillMaxWidth().clickable(enabled = !unblockMode) { onProfileClick(person.userId) }.padding(horizontal = 12.dp, vertical = 7.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        DecoratedAvatar(person.user.avatar, R.drawable.img_tiwi_avatar_1, person.avatarDecoration, Modifier.size(43.dp), animateDecoration = false)
                        Column(Modifier.weight(1f).padding(horizontal = 9.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(person.user.name.ifBlank { person.username.ifBlank { "Tiwlo User" } }, fontWeight = FontWeight.ExtraBold, fontSize = 13.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                if (person.verified) VerifiedBadge(person.badgeType, 14.dp, Modifier.padding(start = 3.dp))
                            }
                            Text("@${person.username}", color = Color(0xFF667085), fontSize = 10.sp, maxLines = 1)
                        }
                        if (person.userId != repository.currentUserId()) {
                            val label = when {
                                unblockMode -> "Unblock"
                                person.isFollowing -> "Following"
                                followBackMode -> "Follow back"
                                else -> "Follow"
                            }
                            OutlinedButton(
                                enabled = busyId != person.userId,
                                onClick = {
                                    busyId = person.userId
                                    scope.launch {
                                        if (unblockMode) runCatching { repository.blockUser(person.userId, false) }
                                            .onSuccess { people = people.filterNot { it.userId == person.userId } }
                                            .onFailure { Toast.makeText(context, it.message ?: "Unblock failed", Toast.LENGTH_LONG).show() }
                                        else runCatching { repository.follow(person.userId, !person.isFollowing) }
                                            .onSuccess { updated -> people = people.map { if (it.userId == updated.userId) updated else it } }
                                            .onFailure { Toast.makeText(context, it.message ?: "Follow failed", Toast.LENGTH_LONG).show() }
                                        busyId = null
                                    }
                                },
                                modifier = Modifier.height(31.dp),
                                shape = RoundedCornerShape(8.dp),
                                contentPadding = PaddingValues(horizontal = 10.dp, vertical = 0.dp),
                                border = BorderStroke(.8.dp, if (unblockMode) Color(0xFFFDA29B) else Color(0xFFD0D5DD))
                            ) {
                                if (busyId == person.userId) CircularProgressIndicator(Modifier.size(13.dp), strokeWidth = 1.8.dp)
                                else Text(label, fontSize = 10.sp, fontWeight = FontWeight.Bold, color = if (unblockMode) Color(0xFFB42318) else if (person.isFollowing) Color(0xFF475467) else TiwiBlue)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SocialPeopleDialog(
    title: String,
    repository: SocialRepository,
    load: suspend () -> List<SocialProfile>,
    onDismiss: () -> Unit,
    onProfileClick: (String) -> Unit
) {
    androidx.compose.ui.window.Dialog(
        onDismissRequest = onDismiss,
        properties = androidx.compose.ui.window.DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false)
    ) {
        Surface(Modifier.fillMaxSize(), color = Color.White, tonalElevation = 0.dp) {
            SocialPeoplePage(title, repository, load, onDismiss, onProfileClick)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CompactCommentsSheet(
    repository: SocialRepository,
    post: Post,
    onDismiss: () -> Unit,
    onProfileClick: (String) -> Unit = {}
) {
    val commentsByPost by repository.comments.collectAsState()
    val comments = commentsByPost[post.id].orEmpty()
    val expandedReplies = remember(post.id) { mutableStateMapOf<String, Boolean>() }
    var text by remember(post.id) { mutableStateOf("") }
    var replyTo by remember(post.id) { mutableStateOf<SocialComment?>(null) }
    var sending by remember(post.id) { mutableStateOf(false) }
    var showReactions by remember(post.id) { mutableStateOf(false) }
    val scope = rememberTiwiCoroutineScope()
    val context = LocalContext.current
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val commentListState = rememberLazyListState()
    val byId = remember(comments) { comments.associateBy { it.id } }
    val roots = remember(comments) { comments.filter { it.replyToId == null } }
    val repliesByRoot = remember(comments, byId, roots) {
        val rootIds = roots.mapTo(mutableSetOf()) { it.id }
        comments.asSequence().filter { it.replyToId != null }.mapNotNull { comment ->
            var parentId = comment.replyToId
            var rootId: String? = null
            repeat(20) {
                val current = parentId ?: return@repeat
                if (current in rootIds) {
                    rootId = current
                    return@repeat
                }
                parentId = byId[current]?.replyToId
            }
            rootId?.let { it to comment }
        }.groupBy({ it.first }, { it.second }).mapValues { (_, rows) -> rows.sortedBy { it.createdAt } }
    }

    LaunchedEffect(post.id) { runCatching { repository.refreshComments(post.id) } }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = Color.White,
        contentColor = Color.Black,
        tonalElevation = 0.dp,
        dragHandle = { BottomSheetDefaults.DragHandle(width = 34.dp, height = 4.dp, color = Color(0xFFD0D5DD)) }
    ) {
        Column(Modifier.fillMaxWidth().fillMaxHeight(.82f).imePadding()) {
            Row(
                Modifier.fillMaxWidth().height(48.dp).padding(horizontal = 14.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(Modifier.weight(1f)) {
                    Text("Comments", fontWeight = FontWeight.Black, fontSize = 17.sp)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("${formatCount(post.likes)} likes", color = TiwiBlue, fontSize = 10.sp, fontWeight = FontWeight.Bold, modifier = Modifier.clickable { showReactions = true })
                        Text(" · ${formatCount(maxOf(post.comments, comments.size))} comments", color = Color(0xFF667085), fontSize = 10.sp)
                    }
                }
                IconButton(onClick = onDismiss, modifier = Modifier.size(34.dp)) {
                    Icon(Icons.Default.Close, "Close comments", modifier = Modifier.size(19.dp))
                }
            }
            HorizontalDivider(thickness = .5.dp, color = Color(0xFFE4E7EC))
            LazyColumn(
                Modifier.fillMaxWidth().weight(1f),
                state = commentListState,
                contentPadding = PaddingValues(vertical = 5.dp)
            ) {
                if (roots.isEmpty()) item {
                    Column(
                        Modifier.fillMaxWidth().padding(vertical = 34.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(Icons.Outlined.ChatBubbleOutline, null, tint = Color(0xFF98A2B3), modifier = Modifier.size(30.dp))
                        Text("Be the first to comment", fontWeight = FontWeight.Bold, fontSize = 14.sp, modifier = Modifier.padding(top = 7.dp))
                    }
                }
                roots.forEach { root ->
                    item(key = "sheet-root-${root.id}") {
                        CommentRow(
                            comment = root,
                            isOwn = root.authorId == repository.currentUserId(),
                            onProfile = { onProfileClick(root.authorId) },
                            onReply = { replyTo = root; text = "@${root.authorProfile?.username?.ifBlank { root.author.name.substringBefore(' ') } ?: root.author.name.substringBefore(' ')} " },
                            onLike = { scope.launch { runCatching { repository.reactToComment(post.id, root.id) } } },
                            onDelete = { scope.launch { runCatching { repository.deleteComment(post.id, root.id) } } },
                            onReport = { scope.launch { runCatching { repository.reportContent("comment", root.id, "inappropriate_content") }.onSuccess { Toast.makeText(context, "Report sent", Toast.LENGTH_SHORT).show() } } }
                        )
                    }
                    val replies = repliesByRoot[root.id].orEmpty()
                    val shown = if (expandedReplies[root.id] == true) replies else replies.take(1)
                    items(shown, key = { "sheet-reply-${it.id}" }) { reply ->
                        CommentRow(
                            comment = reply,
                            isOwn = reply.authorId == repository.currentUserId(),
                            onProfile = { onProfileClick(reply.authorId) },
                            onReply = { replyTo = reply; text = "@${reply.authorProfile?.username?.ifBlank { reply.author.name.substringBefore(' ') } ?: reply.author.name.substringBefore(' ')} " },
                            onLike = { scope.launch { runCatching { repository.reactToComment(post.id, reply.id) } } },
                            onDelete = { scope.launch { runCatching { repository.deleteComment(post.id, reply.id) } } },
                            onReport = { scope.launch { runCatching { repository.reportContent("comment", reply.id, "inappropriate_content") }.onSuccess { Toast.makeText(context, "Report sent", Toast.LENGTH_SHORT).show() } } }
                        )
                    }
                    if (replies.size > shown.size) item(key = "sheet-more-${root.id}") {
                        Text(
                            "View ${replies.size - shown.size} more ${if (replies.size - shown.size == 1) "reply" else "replies"}",
                            modifier = Modifier.padding(start = 72.dp, top = 1.dp, bottom = 6.dp).clickable { expandedReplies[root.id] = true },
                            color = Color(0xFF667085), fontWeight = FontWeight.Bold, fontSize = 11.sp
                        )
                    }
                }
            }
            replyTo?.let { target ->
                Row(
                    Modifier.fillMaxWidth().background(Color(0xFFF7F8FA)).padding(start = 13.dp, end = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Replying to ${target.author.name}", Modifier.weight(1f), color = Color(0xFF667085), fontSize = 10.sp)
                    IconButton(onClick = { replyTo = null }, modifier = Modifier.size(28.dp)) { Icon(Icons.Default.Close, null, modifier = Modifier.size(15.dp)) }
                }
            }
            Row(
                Modifier.fillMaxWidth().padding(horizontal = 10.dp, vertical = 7.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                DecoratedAvatar(repository.currentUser.value?.avatar, R.drawable.img_tiwi_avatar_1, repository.profile.value?.avatarDecoration, Modifier.size(32.dp))
                Surface(
                    Modifier.weight(1f).padding(start = 7.dp).heightIn(min = 38.dp),
                    color = Color(0xFFF0F2F5),
                    shape = RoundedCornerShape(20.dp),
                    tonalElevation = 0.dp
                ) {
                    BasicTextField(
                        value = text,
                        onValueChange = { text = it.take(2000) },
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 10.dp),
                        textStyle = MaterialTheme.typography.bodyMedium.copy(color = Color(0xFF101828), fontSize = 13.sp),
                        decorationBox = { inner -> if (text.isBlank()) Text("Write a comment…", color = Color(0xFF667085), fontSize = 13.sp); inner() }
                    )
                }
                IconButton(
                    enabled = text.isNotBlank() && !sending,
                    modifier = Modifier.size(36.dp),
                    onClick = {
                        val body = text.trim()
                        val target = replyTo
                        val targetRootId = target?.let { reply ->
                            if (reply.replyToId == null) reply.id
                            else roots.firstOrNull { candidate -> candidate.id == reply.replyToId || repliesByRoot[candidate.id].orEmpty().any { it.id == reply.id } }?.id
                        }
                        text = ""
                        sending = true
                        scope.launch {
                            runCatching { repository.addComment(post.id, body, target?.id) }
                                .onSuccess {
                                    replyTo = null
                                    targetRootId?.let { expandedReplies[it] = true }
                                }
                                .onFailure {
                                    text = body
                                    Toast.makeText(context, it.message ?: "Comment failed", Toast.LENGTH_SHORT).show()
                                }
                            sending = false
                        }
                    }
                ) {
                    if (sending) CircularProgressIndicator(Modifier.size(17.dp), strokeWidth = 2.dp)
                    else Icon(Icons.AutoMirrored.Outlined.Send, "Post comment", tint = if (text.isBlank()) Color(0xFF98A2B3) else TiwiBlue, modifier = Modifier.size(20.dp))
                }
            }
            Spacer(Modifier.height(2.dp))
        }
    }
    if (showReactions) SocialPeopleDialog(
        title = "People who liked this",
        repository = repository,
        load = { repository.postReactions(post.id) },
        onDismiss = { showReactions = false },
        onProfileClick = { showReactions = false; onDismiss(); onProfileClick(it) }
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TiwiShareSheet(repository: SocialRepository, post: Post, onDismiss: () -> Unit) {
    val conversations by repository.conversations.collectAsState()
    val context = LocalContext.current
    val scope = rememberTiwiCoroutineScope()
    val deepLink = "https://tiwlo.com/social/post/${post.id}"
    var showTimelineComposer by remember { mutableStateOf(false) }
    val firstMedia = post.media.firstOrNull { it.type != "shared_post" }
    val rootId = post.media.firstOrNull { it.type == "shared_post" }?.let(::linkedSharedPostId) ?: post.id
    val sharedCard = remember(post) {
        SocialMedia(
            url = firstMedia?.url.orEmpty(), type = "shared_post", hlsUrl = firstMedia?.hlsUrl,
            thumbnailUrl = firstMedia?.thumbnailUrl ?: post.imageUrl, processingStatus = firstMedia?.processingStatus ?: "ready",
            sharedPostId = post.id, sharedRootPostId = rootId, sharedAuthorId = post.authorId, sharedAuthor = post.author,
            sharedAvatar = post.authorAvatarUrl, sharedBody = post.content, sharedMediaType = firstMedia?.type,
            sharedViews = post.views, sharedReactions = post.likes, sharedComments = post.comments, sharedPublishedAt = post.publishedAt
        )
    }
    val contacts = remember(conversations) {
        conversations.filter { it.requestStatus == "accepted" }.distinctBy { it.id }.take(8)
    }
    if (showTimelineComposer) {
        ShareToTimelinePage(repository, post, sharedCard, onBack = { showTimelineComposer = false }, onShared = onDismiss)
        return
    }
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = Color.White,
        contentColor = Color.Black,
        tonalElevation = 0.dp,
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

            Row(
                Modifier.fillMaxWidth().clickable { showTimelineComposer = true }.padding(bottom = 13.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(Modifier.size(38.dp).background(Color(0xFFE7F3FF), CircleShape), contentAlignment = Alignment.Center) {
                    Icon(Icons.Default.Repeat, null, tint = TiwiBlue, modifier = Modifier.size(20.dp))
                }
                Column(Modifier.padding(start = 10.dp)) {
                    Text("Share to your timeline", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    Text("Add your thoughts before sharing", color = Color.Gray, fontSize = 10.sp)
                }
            }

            Surface(
                modifier = Modifier.fillMaxWidth().padding(bottom = 14.dp),
                shape = RoundedCornerShape(10.dp),
                color = Color.White,
                border = BorderStroke(1.dp, Color(0xFFE1E4E8)),
                tonalElevation = 0.dp
            ) {
                Column {
                    Row(Modifier.padding(10.dp), verticalAlignment = Alignment.CenterVertically) {
                        DecoratedAvatar(post.authorAvatarUrl, post.authorAvatar, post.authorDecoration, Modifier.size(44.dp))
                        Spacer(Modifier.width(8.dp))
                        Column(Modifier.weight(1f)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(post.author, fontWeight = FontWeight.Bold)
                                if (post.verified) VerifiedBadge(post.badgeType, 15.dp, Modifier.padding(start = 3.dp))
                            }
                            Text(post.time, color = Color.Gray, fontSize = 11.sp)
                        }
                        Icon(Icons.Default.Public, "Shared post", tint = Color.Gray, modifier = Modifier.size(16.dp))
                    }
                    if (post.content.isNotBlank()) Text(post.content, modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp), maxLines = 3, overflow = TextOverflow.Ellipsis)
                    val preview = post.media.firstOrNull()
                    if (preview != null) Box(Modifier.fillMaxWidth().height(160.dp).background(Color.Black), contentAlignment = Alignment.Center) {
                        if (preview.type == "video") {
                            val image = preview.thumbnailUrl ?: post.imageUrl
                            if (!image.isNullOrBlank()) AsyncImage(image, null, Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                            Icon(Icons.Default.PlayCircle, "Video", tint = Color.White, modifier = Modifier.size(48.dp))
                        } else AsyncImage(preview.url, null, Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                    }
                    Row(Modifier.fillMaxWidth().padding(horizontal = 10.dp, vertical = 8.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("${post.likes} reactions", color = Color.Gray, fontSize = 12.sp)
                        Text("${post.comments} comments · ${post.shares} reposts · ${post.views} views", color = Color.Gray, fontSize = 12.sp)
                    }
                }
            }
            
            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(16.dp),
                modifier = Modifier.padding(bottom = 24.dp)
            ) {
                items(contacts, key = { it.id }) { chat ->
                    val contact = chat.members.firstOrNull { it.userId != repository.currentUserId() }
                    val name = chat.title ?: contact?.user?.name.orEmpty()
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier.clickable {
                            scope.launch {
                                runCatching { repository.sendMessage(chat.id, "", listOf(sharedCard)) }
                                    .onSuccess { Toast.makeText(context, "Sent to $name", Toast.LENGTH_SHORT).show(); onDismiss() }
                                    .onFailure { Toast.makeText(context, it.message ?: "Share failed", Toast.LENGTH_SHORT).show() }
                            }
                        }
                    ) {
                        DecoratedAvatar(contact?.user?.avatar, R.drawable.img_tiwi_avatar_1, contact?.profile?.avatarDecoration, Modifier.size(60.dp))
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
                        .clickable {
                            if (name == "Copy Link") {
                                val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                                clipboard.setPrimaryClip(ClipData.newPlainText("Tiwi post", deepLink))
                                Toast.makeText(context, "Link copied", Toast.LENGTH_SHORT).show()
                            } else {
                                shareDeepLink(context, "${post.author} on Tiwi", post.content, deepLink)
                            }
                            onDismiss()
                        }
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
private fun ShareToTimelinePage(
    repository: SocialRepository,
    post: Post,
    sharedCard: SocialMedia,
    onBack: () -> Unit,
    onShared: () -> Unit
) {
    var text by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    val scope = rememberTiwiCoroutineScope()
    val context = LocalContext.current
    Column(Modifier.fillMaxSize().background(Color.White).imePadding()) {
        Box(Modifier.fillMaxWidth().statusBarsPadding().height(52.dp)) {
            IconButton(onClick = onBack, enabled = !busy, modifier = Modifier.align(Alignment.CenterStart)) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") }
            Text("Share post", modifier = Modifier.align(Alignment.Center), fontWeight = FontWeight.ExtraBold, fontSize = 17.sp)
            TextButton(
                enabled = !busy,
                onClick = {
                    busy = true
                    scope.launch {
                        runCatching { repository.createPost(text, media = listOf(sharedCard)) }
                            .onSuccess { Toast.makeText(context, "Shared to your timeline", Toast.LENGTH_SHORT).show(); onShared() }
                            .onFailure { Toast.makeText(context, it.message ?: "Share failed", Toast.LENGTH_SHORT).show() }
                        busy = false
                    }
                },
                modifier = Modifier.align(Alignment.CenterEnd)
            ) { if (busy) CircularProgressIndicator(Modifier.size(16.dp), strokeWidth = 2.dp) else Text("Share", fontWeight = FontWeight.Bold) }
        }
        BasicTextField(
            text, { text = it.take(5_000) },
            Modifier.fillMaxWidth().heightIn(min = 120.dp).padding(14.dp),
            textStyle = MaterialTheme.typography.bodyLarge.copy(color = Color.Black, fontSize = 16.sp),
            cursorBrush = SolidColor(TiwiBlue),
            decorationBox = { inner -> if (text.isBlank()) Text("Say something about this…", color = Color.Gray, fontSize = 16.sp); inner() }
        )
        Surface(Modifier.padding(12.dp).fillMaxWidth(), shape = RoundedCornerShape(12.dp), border = BorderStroke(.7.dp, Color(0xFFDADDE1)), color = Color.White, tonalElevation = 0.dp) {
            Column {
                Row(Modifier.padding(10.dp), verticalAlignment = Alignment.CenterVertically) {
                    DecoratedAvatar(post.authorAvatarUrl, post.authorAvatar, post.authorDecoration, Modifier.size(38.dp))
                    Column(Modifier.padding(start = 8.dp)) { Text(post.author, fontWeight = FontWeight.Bold, fontSize = 13.sp); Text(post.time, color = Color.Gray, fontSize = 9.sp) }
                }
                if (post.content.isNotBlank()) Text(post.content, Modifier.padding(horizontal = 10.dp, vertical = 4.dp), fontSize = 12.sp, maxLines = 3, overflow = TextOverflow.Ellipsis)
                val media = post.media.firstOrNull()
                if (media != null) Box(Modifier.fillMaxWidth().height(190.dp).background(Color.Black), contentAlignment = Alignment.Center) {
                    AsyncImage(media.thumbnailUrl ?: media.url, null, Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                    if (media.type == "video") Icon(Icons.Default.PlayCircle, "Video", tint = Color.White, modifier = Modifier.size(42.dp))
                }
            }
        }
    }
}

private fun shareDeepLink(context: Context, title: String, text: String, url: String) {
    val send = Intent(Intent.ACTION_SEND).apply {
        type = "text/plain"
        putExtra(Intent.EXTRA_SUBJECT, title)
        putExtra(Intent.EXTRA_TEXT, listOf(text.trim(), url).filter { it.isNotBlank() }.joinToString("\n\n"))
    }
    context.startActivity(Intent.createChooser(send, "Share with"))
}

@Composable
fun CreatePostScreen(repository: SocialRepository, onBack: () -> Unit, onLive: () -> Unit = {}, initialMusic: String? = null) {
    var text by remember { mutableStateOf("") }
    var selectedUris by remember { mutableStateOf<List<Uri>>(emptyList()) }
    var visibility by remember { mutableStateOf("public") }
    var busy by remember { mutableStateOf(false) }
    var composerPage by remember { mutableStateOf<String?>(null) }
    var taggedPeople by remember { mutableStateOf<List<SocialProfile>>(emptyList()) }
    var collaborators by remember { mutableStateOf<List<SocialProfile>>(emptyList()) }
    var music by remember(initialMusic) { mutableStateOf(initialMusic) }
    var location by remember { mutableStateOf<String?>(null) }
    var feeling by remember { mutableStateOf<String?>(null) }
    var background by remember { mutableStateOf<String?>(null) }
    var crossPost by remember { mutableStateOf(false) }
    var commentPermission by remember { mutableStateOf("everyone") }
    var scheduledAtMillis by remember { mutableStateOf<Long?>(null) }
    var shareToStory by remember { mutableStateOf(false) }
    var selectedGroupId by remember { mutableStateOf<String?>(null) }
    var selectedGroupName by remember { mutableStateOf<String?>(null) }
    var monetizationRequested by remember { mutableStateOf(false) }
    var abTestEnabled by remember { mutableStateOf(false) }
    var abTestVariant by remember { mutableStateOf("") }
    var aiGeneratedLabel by remember { mutableStateOf(false) }
    var returnToPostSettings by remember { mutableStateOf(false) }
    var locationDraft by remember { mutableStateOf("") }
    var linkPreview by remember { mutableStateOf<SocialLinkPreview?>(null) }
    var previewLoading by remember { mutableStateOf(false) }
    var dismissedPreviewUrl by remember { mutableStateOf<String?>(null) }
    val scope = rememberTiwiCoroutineScope()
    val context = LocalContext.current
    val user by repository.currentUser.collectAsState()
    val notificationPermission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { }
    val mediaPicker = rememberLauncherForActivityResult(ActivityResultContracts.PickMultipleVisualMedia(20)) { uris ->
        selectedUris = (selectedUris + uris).distinct().take(20)
    }
    val gifPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        if (uri != null) selectedUris = (selectedUris + uri).distinct().take(20)
    }
    val detectedUrl = remember(text) { Regex("https?://[^\\s]+", RegexOption.IGNORE_CASE).find(text)?.value?.trimEnd('.', ',', ')', ']', '}') }

    LaunchedEffect(detectedUrl) {
        val url = detectedUrl ?: return@LaunchedEffect
        if (url == linkPreview?.url || url == dismissedPreviewUrl) return@LaunchedEffect
        delay(450)
        previewLoading = true
        runCatching { repository.linkPreview(url) }
            .onSuccess { linkPreview = it; dismissedPreviewUrl = null }
        previewLoading = false
    }
    BackHandler(enabled = busy) { }

    when (composerPage) {
        "settings" -> {
            TiwiPostSettingsPage(
                repository = repository,
                draft = PostSettingsDraft(
                    visibility = visibility,
                    commentPermission = commentPermission,
                    scheduleAtMillis = scheduledAtMillis,
                    shareToStory = shareToStory,
                    groupId = selectedGroupId,
                    groupName = selectedGroupName,
                    monetization = monetizationRequested,
                    abTest = abTestEnabled,
                    abVariant = abTestVariant,
                    aiGenerated = aiGeneratedLabel
                ),
                onBack = { composerPage = null },
                onChange = { settings ->
                    visibility = settings.visibility
                    commentPermission = settings.commentPermission
                    scheduledAtMillis = settings.scheduleAtMillis
                    shareToStory = settings.shareToStory
                    selectedGroupId = settings.groupId
                    selectedGroupName = settings.groupName
                    monetizationRequested = settings.monetization
                    abTestEnabled = settings.abTest
                    abTestVariant = settings.abVariant
                    aiGeneratedLabel = settings.aiGenerated
                },
                onInviteCollaborator = { returnToPostSettings = true; composerPage = "people" },
                onShare = { composerPage = "publish" }
            )
            return
        }
        "music" -> {
            ComposerChoicePage(
                title = "Add music", queryHint = "Search music",
                options = listOf(
                    Triple("Original audio", "Original audio", "Keep the sound from your video"),
                    Triple("Trending", "Trending", "Popular now on Tiwi"),
                    Triple("Chill", "Chill", "Relaxed and calm"),
                    Triple("Pop", "Pop", "Popular music"),
                    Triple("Acoustic", "Acoustic", "Warm unplugged sound")
                ),
                selected = music, icon = Icons.Default.MusicNote,
                onBack = { composerPage = null }, onSelect = { music = it; composerPage = null }
            )
            return
        }
        "feeling" -> {
            ComposerChoicePage(
                title = "Feeling / activity", queryHint = "Search feelings or activities",
                options = listOf(
                    Triple("Happy", "Happy", "Feeling good"), Triple("Excited", "Excited", "Looking forward to something"),
                    Triple("Loved", "Loved", "Feeling loved"), Triple("Celebrating", "Celebrating", "A special moment"),
                    Triple("Traveling", "Traveling", "On a journey"), Triple("Watching", "Watching", "A movie, show or live event"),
                    Triple("Listening", "Listening", "Music, a podcast or audio"), Triple("Playing", "Playing", "A game or sport")
                ),
                selected = feeling, icon = Icons.Outlined.EmojiEmotions,
                onBack = { composerPage = null }, onSelect = { feeling = it; composerPage = null }
            )
            return
        }
        "location" -> {
            ComposerLocationPage(
                initialValue = locationDraft, onBack = { composerPage = null },
                onSave = { location = it; locationDraft = it.orEmpty(); composerPage = null }
            )
            return
        }
        "people" -> {
            ComposerPeoplePage(
                repository = repository, tagged = taggedPeople, collaborators = collaborators,
                onBack = { composerPage = if (returnToPostSettings) { returnToPostSettings = false; "settings" } else null },
                onDone = { newTagged, newCollaborators ->
                    taggedPeople = newTagged
                    collaborators = newCollaborators
                    val mentions = newTagged.map { "@${it.username}" }.filterNot { text.contains(it, ignoreCase = true) }
                    if (mentions.isNotEmpty()) text = listOf(text.trimEnd(), mentions.joinToString(" ")).filter { it.isNotBlank() }.joinToString(" ") + " "
                    composerPage = if (returnToPostSettings) { returnToPostSettings = false; "settings" } else null
                }
            )
            return
        }
        "gallery" -> {
            ComposerGalleryPage(
                title = "Photos and videos", selected = selectedUris, gifOnly = false,
                onBack = { composerPage = null }, onDone = { selectedUris = it.take(20); composerPage = null },
                onSystemPicker = { mediaPicker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageAndVideo)) }
            )
            return
        }
        "gif" -> {
            ComposerGalleryPage(
                title = "GIF", selected = selectedUris.filter { context.contentResolver.getType(it) == "image/gif" }, gifOnly = true,
                onBack = { composerPage = null },
                onDone = { gifs -> selectedUris = (selectedUris.filterNot { context.contentResolver.getType(it) == "image/gif" } + gifs).distinct().take(20); composerPage = null },
                onSystemPicker = { gifPicker.launch("image/gif") }
            )
            return
        }
        "background" -> {
            ComposerBackgroundPage(background, onBack = { composerPage = null }) { background = it; composerPage = null }
            return
        }
        "audience" -> {
            ComposerAudiencePage(visibility, onBack = { composerPage = null }) { visibility = it; composerPage = null }
            return
        }
    }

    val publish = {
        if (!busy && (text.isNotBlank() || selectedUris.isNotEmpty() || linkPreview != null)) {
            if (Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                notificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
            }
            scope.launch {
                busy = true
                try {
                    val metadata = mutableMapOf<String, Any?>(
                        "music" to music,
                        "locationLabel" to location,
                        "feeling" to feeling,
                        "background" to background,
                        "crossPost" to crossPost,
                        "taggedUserIds" to taggedPeople.map { it.userId },
                        "collaboratorIds" to collaborators.map { it.userId },
                        "shareToStory" to shareToStory,
                        "monetizationRequested" to monetizationRequested,
                        "abTestEnabled" to abTestEnabled,
                        "abTestVariant" to abTestVariant.takeIf { abTestEnabled && it.isNotBlank() },
                        "aiGenerated" to aiGeneratedLabel,
                        "scheduledAt" to scheduledAtMillis?.toString(),
                        "linkPreview" to linkPreview?.asMetadata()
                    ).filterValues { value -> value != null && value != "" }
                    PostUploadWorker.enqueue(
                        context = context,
                        uris = selectedUris,
                        body = text,
                        visibility = visibility,
                        commentPermission = commentPermission,
                        groupId = selectedGroupId,
                        metadata = metadata,
                        location = location,
                        initialDelayMillis = (scheduledAtMillis ?: System.currentTimeMillis()).minus(System.currentTimeMillis()).coerceAtLeast(0L)
                    )
                    Toast.makeText(
                        context,
                        when {
                            scheduledAtMillis != null -> "Post scheduled for ${SimpleDateFormat("h:mm a", Locale.getDefault()).format(Date(scheduledAtMillis!!))}"
                            currentNetworkAvailable(context) -> "Posting in the background"
                            else -> "Queued until you're online"
                        },
                        Toast.LENGTH_SHORT
                    ).show()
                    onBack()
                } catch (error: Exception) {
                    Toast.makeText(context, error.message ?: "Post failed", Toast.LENGTH_LONG).show()
                } finally { busy = false }
            }
        }
    }

    LaunchedEffect(composerPage) {
        if (composerPage == "publish") publish()
    }

    val selectedBackgroundColor = postBackgroundColor(background)
    val selectedBackgroundIsDark = isDarkPostBackground(background)

    Column(Modifier.fillMaxSize().background(Color.White).imePadding()) {
        Box(Modifier.fillMaxWidth().statusBarsPadding().height(52.dp)) {
            IconButton(onClick = onBack, enabled = !busy, modifier = Modifier.align(Alignment.CenterStart).padding(start = 5.dp)) {
                Icon(Icons.Default.Close, "Close", modifier = Modifier.size(28.dp), tint = Color.Black)
            }
            Text("New post", modifier = Modifier.align(Alignment.Center), fontSize = 18.sp, fontWeight = FontWeight.ExtraBold, color = Color.Black)
            Button(
                onClick = { composerPage = "settings" },
                enabled = !busy && (text.isNotBlank() || selectedUris.isNotEmpty() || linkPreview != null),
                modifier = Modifier.align(Alignment.CenterEnd).padding(end = 8.dp).height(36.dp),
                contentPadding = PaddingValues(horizontal = 15.dp),
                shape = RoundedCornerShape(9.dp),
                colors = ButtonDefaults.buttonColors(containerColor = TiwiBlue, disabledContainerColor = Color(0xFFE4E6EB))
            ) {
                if (busy) CircularProgressIndicator(Modifier.size(15.dp), color = Color.White, strokeWidth = 2.dp)
                else Text("Next", fontSize = 12.sp, fontWeight = FontWeight.Bold)
            }
        }
        Row(Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            TiwiAvatar(user?.avatar, R.drawable.img_tiwi_avatar_1, Modifier.size(46.dp).clip(CircleShape))
            Text(user?.name.orEmpty().ifBlank { "Tiwi User" }, modifier = Modifier.padding(start = 10.dp), color = Color.Black, fontSize = 15.sp, fontWeight = FontWeight.ExtraBold)
        }

        LazyRow(
            modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
            contentPadding = PaddingValues(horizontal = 14.dp),
            horizontalArrangement = Arrangement.spacedBy(7.dp)
        ) {
            item { ComposerChip(Icons.Default.MusicNote, music ?: "Music") { composerPage = "music" } }
            item { ComposerChip(Icons.Default.PersonAdd, if (taggedPeople.isEmpty() && collaborators.isEmpty()) "Tag/collaborate" else "${taggedPeople.size + collaborators.size} people") { composerPage = "people" } }
            item { ComposerChip(Icons.Default.LocationOn, location ?: "Location") { locationDraft = location.orEmpty(); composerPage = "location" } }
            item { ComposerChip(Icons.Outlined.EmojiEmotions, feeling ?: "Feeling/activity") { composerPage = "feeling" } }
        }

        Column(Modifier.weight(1f).verticalScroll(rememberScrollState())) {
            Box(
                if (selectedBackgroundColor != null) {
                    Modifier.fillMaxWidth().padding(horizontal = 14.dp)
                        .aspectRatio(1f).clip(RoundedCornerShape(14.dp)).background(selectedBackgroundColor)
                        .padding(horizontal = 20.dp, vertical = 18.dp)
                } else {
                    Modifier.fillMaxWidth().heightIn(min = if (selectedUris.isEmpty() && linkPreview == null) 260.dp else 110.dp)
                        .padding(horizontal = 16.dp, vertical = 14.dp)
                },
                contentAlignment = if (selectedBackgroundColor != null) Alignment.Center else Alignment.TopStart
            ) {
                if (text.isBlank()) Text(
                    "What's on your mind?",
                    color = if (selectedBackgroundIsDark) Color.White.copy(alpha = .72f) else Color(0xFF74777D),
                    fontSize = 20.sp,
                    textAlign = if (selectedBackgroundColor != null) TextAlign.Center else TextAlign.Start,
                    modifier = Modifier.fillMaxWidth()
                )
                BasicTextField(
                    value = text,
                    onValueChange = { text = it.take(10_000) },
                    modifier = Modifier.fillMaxWidth(),
                    textStyle = MaterialTheme.typography.bodyLarge.copy(
                        color = if (selectedBackgroundIsDark) Color.White else Color.Black,
                        fontSize = if (selectedBackgroundColor != null) backgroundPostTextSize(text.length) else 18.sp,
                        lineHeight = if (selectedBackgroundColor != null) backgroundPostLineHeight(text.length) else 24.sp,
                        fontWeight = if (selectedBackgroundColor != null) FontWeight.Bold else FontWeight.Normal,
                        textAlign = if (selectedBackgroundColor != null) TextAlign.Center else TextAlign.Start
                    ),
                    cursorBrush = SolidColor(TiwiBlue)
                )
            }
            if (previewLoading) Row(Modifier.padding(horizontal = 16.dp, vertical = 5.dp), verticalAlignment = Alignment.CenterVertically) {
                CircularProgressIndicator(Modifier.size(14.dp), strokeWidth = 2.dp)
                Text("Building link preview…", fontSize = 10.sp, color = Color.Gray, modifier = Modifier.padding(start = 7.dp))
            }
            linkPreview?.let { preview ->
                SocialLinkCard(preview, Modifier.padding(horizontal = 12.dp, vertical = 5.dp)) {
                    dismissedPreviewUrl = preview.url
                    linkPreview = null
                }
            }
            if (selectedUris.isNotEmpty()) LazyRow(
                Modifier.fillMaxWidth().height(190.dp),
                contentPadding = PaddingValues(horizontal = 10.dp),
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                items(selectedUris, key = { it.toString() }) { uri ->
                    Box(Modifier.width(if (selectedUris.size == 1) 330.dp else 170.dp).fillMaxHeight().clip(RoundedCornerShape(11.dp)).background(Color.Black)) {
                        val mime = context.contentResolver.getType(uri).orEmpty()
                        if (mime.startsWith("video/")) TiwiVideo(uri.toString(), Modifier.fillMaxSize(), posterContentScale = ContentScale.Crop)
                        else AsyncImage(uri, "Selected media", Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                        IconButton(
                            onClick = { selectedUris = selectedUris.filterNot { it == uri } },
                            modifier = Modifier.align(Alignment.TopEnd).padding(4.dp).size(28.dp).background(Color.Black.copy(alpha = .65f), CircleShape)
                        ) { Icon(Icons.Default.Close, "Remove", tint = Color.White, modifier = Modifier.size(16.dp)) }
                    }
                }
                item {
                    Box(Modifier.width(82.dp).fillMaxHeight().clip(RoundedCornerShape(11.dp)).background(Color(0xFFF0F2F5)).clickable {
                        mediaPicker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageAndVideo))
                    }, contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) { Icon(Icons.Default.Add, null); Text("Add more", fontSize = 10.sp) }
                    }
                }
            }
        }

        LazyRow(
            Modifier.fillMaxWidth().padding(top = 4.dp),
            contentPadding = PaddingValues(horizontal = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            item { ComposerTool(Icons.Outlined.PhotoLibrary, "Gallery") { composerPage = "gallery" } }
            item { ComposerTool(Icons.Default.GifBox, "GIF") { composerPage = "gif" } }
            item { ComposerTool(Icons.Outlined.Videocam, "Live") { onLive() } }
            item { ComposerTool(Icons.Outlined.Palette, "Background") { composerPage = "background" } }
        }
        Row(Modifier.fillMaxWidth().navigationBarsPadding().padding(horizontal = 14.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            ComposerChip(
                when (visibility) { "private" -> Icons.Default.Lock; "followers" -> Icons.Default.Group; else -> Icons.Default.Public },
                when (visibility) { "private" -> "Only me"; "followers" -> "Followers"; else -> "Public" }
            ) { composerPage = "audience" }
            Spacer(Modifier.width(8.dp))
            Surface(shape = RoundedCornerShape(18.dp), color = Color(0xFFF0F2F5), tonalElevation = 0.dp, modifier = Modifier.height(32.dp).clickable { crossPost = !crossPost }) {
                Row(Modifier.padding(horizontal = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Sync, null, Modifier.size(14.dp), tint = if (crossPost) TiwiBlue else Color.Black)
                    Text(if (crossPost) "Tiwlo On" else "Tiwlo Off", fontSize = 10.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(start = 5.dp))
                }
            }
        }
    }

}

private data class ComposerDeviceMedia(val uri: Uri, val mime: String, val video: Boolean)

private suspend fun loadComposerDeviceMedia(context: Context, gifOnly: Boolean): List<ComposerDeviceMedia> = withContext(Dispatchers.IO) {
    val collection = MediaStore.Files.getContentUri("external")
    val projection = arrayOf(
        MediaStore.Files.FileColumns._ID,
        MediaStore.Files.FileColumns.MIME_TYPE,
        MediaStore.Files.FileColumns.MEDIA_TYPE
    )
    val selection = if (gifOnly) {
        "${MediaStore.Files.FileColumns.MIME_TYPE} = ?"
    } else {
        "${MediaStore.Files.FileColumns.MEDIA_TYPE} = ? OR ${MediaStore.Files.FileColumns.MEDIA_TYPE} = ?"
    }
    val args = if (gifOnly) arrayOf("image/gif") else arrayOf(
        MediaStore.Files.FileColumns.MEDIA_TYPE_IMAGE.toString(),
        MediaStore.Files.FileColumns.MEDIA_TYPE_VIDEO.toString()
    )
    runCatching {
        context.contentResolver.query(
            collection, projection, selection, args,
            "${MediaStore.Files.FileColumns.DATE_ADDED} DESC"
        )?.use { cursor ->
            val idIndex = cursor.getColumnIndexOrThrow(MediaStore.Files.FileColumns._ID)
            val mimeIndex = cursor.getColumnIndexOrThrow(MediaStore.Files.FileColumns.MIME_TYPE)
            val typeIndex = cursor.getColumnIndexOrThrow(MediaStore.Files.FileColumns.MEDIA_TYPE)
            buildList {
                while (cursor.moveToNext() && size < 400) {
                    val id = cursor.getLong(idIndex)
                    val mime = cursor.getString(mimeIndex).orEmpty()
                    val mediaType = cursor.getInt(typeIndex)
                    add(ComposerDeviceMedia(android.content.ContentUris.withAppendedId(collection, id), mime, mediaType == MediaStore.Files.FileColumns.MEDIA_TYPE_VIDEO))
                }
            }
        }.orEmpty()
    }.getOrDefault(emptyList())
}

@Composable
private fun ComposerPageHeader(title: String, onBack: () -> Unit, action: String? = null, actionEnabled: Boolean = true, onAction: () -> Unit = {}) {
    Row(
        Modifier.fillMaxWidth().statusBarsPadding().height(50.dp).padding(horizontal = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back", Modifier.size(22.dp)) }
        Text(title, Modifier.weight(1f), fontSize = 17.sp, fontWeight = FontWeight.Black, maxLines = 1, overflow = TextOverflow.Ellipsis)
        if (action != null) TextButton(onClick = onAction, enabled = actionEnabled) { Text(action, fontWeight = FontWeight.Bold, fontSize = 12.sp) }
    }
    HorizontalDivider(thickness = .6.dp, color = Color(0xFFE5E7EB))
}

@Composable
private fun ComposerChoicePage(
    title: String,
    queryHint: String,
    options: List<Triple<String, String, String>>,
    selected: String?,
    icon: ImageVector,
    onBack: () -> Unit,
    onSelect: (String?) -> Unit
) {
    var query by remember { mutableStateOf("") }
    val filtered = remember(query, options) {
        if (query.isBlank()) options else options.filter { it.second.contains(query, true) || it.third.contains(query, true) }
    }
    Column(Modifier.fillMaxSize().background(Color.White)) {
        ComposerPageHeader(title, onBack)
        Surface(
            Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp).height(38.dp),
            shape = RoundedCornerShape(19.dp), color = Color(0xFFF0F2F5), tonalElevation = 0.dp
        ) {
            Row(Modifier.padding(horizontal = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.Search, null, Modifier.size(18.dp), Color(0xFF667085))
                BasicTextField(
                    query, { query = it.take(80) }, singleLine = true, modifier = Modifier.weight(1f).padding(start = 8.dp),
                    textStyle = MaterialTheme.typography.bodyMedium.copy(fontSize = 13.sp, color = Color.Black),
                    decorationBox = { inner -> if (query.isBlank()) Text(queryHint, color = Color(0xFF667085), fontSize = 13.sp); inner() }
                )
            }
        }
        LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 12.dp)) {
            item {
                ComposerSelectionRow(Icons.Default.Close, "None", "Remove this from your post", selected == null) { onSelect(null) }
            }
            items(filtered, key = { it.first }) { option ->
                ComposerSelectionRow(icon, option.second, option.third, selected == option.first) { onSelect(option.first) }
            }
        }
    }
}

@Composable
private fun ComposerSelectionRow(icon: ImageVector, title: String, subtitle: String, selected: Boolean, onClick: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().clickable(onClick = onClick).padding(horizontal = 14.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(Modifier.size(38.dp).background(Color(0xFFF0F2F5), CircleShape), contentAlignment = Alignment.Center) { Icon(icon, null, Modifier.size(20.dp)) }
        Column(Modifier.weight(1f).padding(horizontal = 10.dp)) {
            Text(title, fontWeight = FontWeight.Bold, fontSize = 13.sp)
            Text(subtitle, color = Color(0xFF667085), fontSize = 10.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        if (selected) Icon(Icons.Default.CheckCircle, "Selected", tint = TiwiBlue, modifier = Modifier.size(21.dp))
    }
}

@Composable
private fun ComposerLocationPage(initialValue: String, onBack: () -> Unit, onSave: (String?) -> Unit) {
    var value by remember { mutableStateOf(initialValue) }
    Column(Modifier.fillMaxSize().background(Color.White)) {
        ComposerPageHeader("Add location", onBack, "Save", value.isNotBlank()) { onSave(value.trim().takeIf(String::isNotBlank)) }
        OutlinedTextField(
            value, { value = it.take(160) }, modifier = Modifier.fillMaxWidth().padding(12.dp), singleLine = true,
            leadingIcon = { Icon(Icons.Default.LocationOn, null, tint = TiwiBlue) },
            placeholder = { Text("Search a city, place or business") }, shape = RoundedCornerShape(12.dp)
        )
        if (initialValue.isNotBlank()) ComposerSelectionRow(Icons.Outlined.Delete, "Remove location", "Do not show a place on this post", false) { onSave(null) }
        Text("Your precise device location is never posted. Only the place you choose is saved.", color = Color(0xFF667085), fontSize = 10.sp, modifier = Modifier.padding(horizontal = 16.dp, vertical = 5.dp))
    }
}

@Composable
private fun ComposerAudiencePage(selected: String, onBack: () -> Unit, onSelect: (String) -> Unit) {
    Column(Modifier.fillMaxSize().background(Color.White)) {
        ComposerPageHeader("Post audience", onBack)
        Text("Who can see your post?", fontWeight = FontWeight.Black, fontSize = 17.sp, modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp))
        listOf(
            Triple("public", Icons.Default.Public, "Public") to "Anyone on or off Tiwi",
            Triple("followers", Icons.Default.Group, "Followers") to "People who follow you",
            Triple("private", Icons.Default.Lock, "Only me") to "Only you"
        ).forEach { item -> ComposerSelectionRow(item.first.second, item.first.third, item.second, selected == item.first.first) { onSelect(item.first.first) } }
    }
}

@Composable
private fun ComposerBackgroundPage(selected: String?, onBack: () -> Unit, onSelect: (String?) -> Unit) {
    val colors = listOf<String?>(null, "#E7F3FF", "#FFF2CC", "#FDE7F3", "#E7F7ED", "#EFE7FD", "#111827", "#1877F2", "#C026D3", "#EA580C")
    Column(Modifier.fillMaxSize().background(Color.White)) {
        ComposerPageHeader("Background", onBack)
        Text("Choose a background", fontWeight = FontWeight.Black, fontSize = 16.sp, modifier = Modifier.padding(14.dp))
        LazyVerticalGrid(GridCells.Fixed(3), contentPadding = PaddingValues(10.dp), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            gridItems(colors, key = { it ?: "none" }) { raw ->
                Box(
                    Modifier.aspectRatio(1f).clip(RoundedCornerShape(12.dp))
                        .background(raw?.let { Color(android.graphics.Color.parseColor(it)) } ?: Color.White)
                        .border(if (selected == raw) 2.dp else .7.dp, if (selected == raw) TiwiBlue else Color(0xFFD0D5DD), RoundedCornerShape(12.dp))
                        .clickable { onSelect(raw) },
                    contentAlignment = Alignment.Center
                ) {
                    Text(if (raw == null) "No background" else "Aa", color = if (raw == "#111827" || raw == "#1877F2" || raw == "#C026D3" || raw == "#EA580C") Color.White else Color.Black, fontWeight = FontWeight.Black, textAlign = TextAlign.Center)
                }
            }
        }
    }
}

@Composable
private fun ComposerPeoplePage(
    repository: SocialRepository,
    tagged: List<SocialProfile>,
    collaborators: List<SocialProfile>,
    onBack: () -> Unit,
    onDone: (List<SocialProfile>, List<SocialProfile>) -> Unit
) {
    var query by remember { mutableStateOf("") }
    var mode by remember { mutableIntStateOf(0) }
    var people by remember { mutableStateOf<List<SocialProfile>>(emptyList()) }
    var selectedTags by remember { mutableStateOf(tagged) }
    var selectedCollaborators by remember { mutableStateOf(collaborators) }
    var loading by remember { mutableStateOf(false) }
    LaunchedEffect(query) {
        delay(220)
        loading = true
        people = runCatching { repository.searchProfiles(query) }.getOrDefault(emptyList()).take(60)
        loading = false
    }
    Column(Modifier.fillMaxSize().background(Color.White)) {
        ComposerPageHeader("Tag or collaborate", onBack, "Done") { onDone(selectedTags, selectedCollaborators) }
        SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp)) {
            listOf("Tag people", "Collaborators").forEachIndexed { index, label ->
                SegmentedButton(selected = mode == index, onClick = { mode = index }, shape = SegmentedButtonDefaults.itemShape(index, 2), label = { Text(label, fontSize = 11.sp) })
            }
        }
        Surface(Modifier.fillMaxWidth().padding(horizontal = 12.dp).height(38.dp), shape = RoundedCornerShape(19.dp), color = Color(0xFFF0F2F5), tonalElevation = 0.dp) {
            Row(Modifier.padding(horizontal = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.Search, null, Modifier.size(18.dp), Color.Gray)
                BasicTextField(query, { query = it.take(80) }, Modifier.weight(1f).padding(start = 8.dp), singleLine = true, decorationBox = { inner -> if (query.isBlank()) Text("Search name or username", color = Color.Gray, fontSize = 12.sp); inner() })
            }
        }
        if (mode == 1) Text("Collaborators can accept the invitation and show this post on their profile. You can invite up to 5 people.", color = Color(0xFF667085), fontSize = 10.sp, modifier = Modifier.padding(horizontal = 14.dp, vertical = 9.dp))
        if (loading) Box(Modifier.fillMaxWidth().height(90.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator(Modifier.size(22.dp), strokeWidth = 2.dp) }
        else LazyColumn(Modifier.fillMaxSize()) {
            items(people, key = { "composer-person-${it.userId}" }) { person ->
                val selected = if (mode == 0) selectedTags.any { it.userId == person.userId } else selectedCollaborators.any { it.userId == person.userId }
                Row(Modifier.fillMaxWidth().clickable {
                    if (mode == 0) selectedTags = if (selected) selectedTags.filterNot { it.userId == person.userId } else selectedTags + person
                    else selectedCollaborators = if (selected) selectedCollaborators.filterNot { it.userId == person.userId } else (selectedCollaborators + person).distinctBy { it.userId }.take(5)
                }.padding(horizontal = 13.dp, vertical = 7.dp), verticalAlignment = Alignment.CenterVertically) {
                    DecoratedAvatar(person.user.avatar, R.drawable.img_tiwi_avatar_1, person.avatarDecoration, Modifier.size(40.dp), animateDecoration = false)
                    Column(Modifier.weight(1f).padding(start = 9.dp)) {
                        Text(person.user.name.ifBlank { person.username }, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        Text("@${person.username}", color = Color(0xFF667085), fontSize = 10.sp)
                    }
                    Checkbox(selected, onCheckedChange = null)
                }
            }
        }
    }
}

@Composable
private fun ComposerGalleryPage(
    title: String,
    selected: List<Uri>,
    gifOnly: Boolean,
    onBack: () -> Unit,
    onDone: (List<Uri>) -> Unit,
    onSystemPicker: () -> Unit
) {
    val context = LocalContext.current
    var media by remember { mutableStateOf<List<ComposerDeviceMedia>>(emptyList()) }
    var chosen by remember { mutableStateOf(selected) }
    var filter by remember { mutableIntStateOf(0) }
    var loading by remember { mutableStateOf(true) }
    LaunchedEffect(selected) { chosen = selected }
    LaunchedEffect(gifOnly) {
        loading = true
        media = loadComposerDeviceMedia(context, gifOnly)
        loading = false
    }
    val filtered = remember(media, filter, gifOnly) {
        if (gifOnly || filter == 0) media else media.filter { if (filter == 2) it.video else !it.video }
    }
    Column(Modifier.fillMaxSize().background(Color.White)) {
        ComposerPageHeader(title, onBack, "Done (${chosen.size})", true) { onDone(chosen) }
        if (!gifOnly) SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 7.dp)) {
            listOf("All", "Photos", "Videos").forEachIndexed { index, label ->
                SegmentedButton(selected = filter == index, onClick = { filter = index }, shape = SegmentedButtonDefaults.itemShape(index, 3), label = { Text(label, fontSize = 10.sp) })
            }
        }
        if (loading) Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(Modifier.size(24.dp), strokeWidth = 2.dp) }
        else if (filtered.isEmpty()) Column(Modifier.fillMaxSize(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
            Icon(if (gifOnly) Icons.Default.GifBox else Icons.Outlined.PhotoLibrary, null, Modifier.size(38.dp), Color(0xFF667085))
            Text(if (gifOnly) "No GIFs found on this device" else "Allow photo and video access to browse here", fontWeight = FontWeight.Bold, fontSize = 13.sp, modifier = Modifier.padding(top = 8.dp))
            TextButton(onClick = onSystemPicker) { Text(if (gifOnly) "Choose a GIF" else "Choose photos and videos") }
        } else LazyVerticalGrid(GridCells.Fixed(3), Modifier.fillMaxSize(), horizontalArrangement = Arrangement.spacedBy(1.dp), verticalArrangement = Arrangement.spacedBy(1.dp)) {
            gridItems(filtered, key = { it.uri.toString() }) { item ->
                val index = chosen.indexOf(item.uri)
                Box(Modifier.aspectRatio(1f).background(Color.Black).clickable {
                    chosen = if (index >= 0) chosen.filterNot { it == item.uri } else (chosen + item.uri).distinct().take(20)
                }) {
                    AsyncImage(item.uri, null, Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                    if (item.video) Icon(Icons.Default.PlayCircle, "Video", Modifier.align(Alignment.Center).size(30.dp), Color.White)
                    if (index >= 0) Box(Modifier.align(Alignment.TopEnd).padding(5.dp).size(22.dp).background(TiwiBlue, CircleShape), contentAlignment = Alignment.Center) { Text("${index + 1}", color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.Bold) }
                }
            }
        }
    }
}

@Composable
private fun ComposerChip(icon: ImageVector, label: String, onClick: () -> Unit) {
    Surface(shape = RoundedCornerShape(18.dp), color = Color.White, border = BorderStroke(.7.dp, Color(0xFFDADDE1)), tonalElevation = 0.dp, modifier = Modifier.height(34.dp).clickable(onClick = onClick)) {
        Row(Modifier.padding(horizontal = 10.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, null, Modifier.size(16.dp), tint = Color.Black)
            Text(label, modifier = Modifier.padding(start = 5.dp), fontSize = 11.sp, color = Color.Black, maxLines = 1)
        }
    }
}

@Composable
private fun ComposerTool(icon: ImageVector, label: String, onClick: () -> Unit) {
    Surface(shape = RoundedCornerShape(11.dp), color = Color.White, border = BorderStroke(.7.dp, Color(0xFFE1E3E6)), tonalElevation = 0.dp, modifier = Modifier.width(92.dp).height(70.dp).clickable(onClick = onClick)) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
            Icon(icon, null, Modifier.size(22.dp), tint = Color.Black)
            Text(label, fontSize = 10.sp, modifier = Modifier.padding(top = 5.dp), color = Color.Black)
        }
    }
}

@Composable
private fun ComposerDialogRow(icon: ImageVector, title: String, subtitle: String, onClick: () -> Unit) {
    Row(Modifier.fillMaxWidth().clickable(onClick = onClick).padding(vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(36.dp).background(Color(0xFFF0F2F5), CircleShape), contentAlignment = Alignment.Center) { Icon(icon, null, Modifier.size(19.dp)) }
        Column(Modifier.padding(start = 10.dp)) { Text(title, fontWeight = FontWeight.Bold, fontSize = 13.sp); Text(subtitle, color = Color.Gray, fontSize = 10.sp) }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ProfileMentionSheet(repository: SocialRepository, onDismiss: () -> Unit, onSelect: (SocialProfile) -> Unit) {
    var query by remember { mutableStateOf("") }
    var people by remember { mutableStateOf<List<SocialProfile>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    LaunchedEffect(query) {
        delay(220)
        loading = true
        people = runCatching { repository.searchProfiles(query) }.getOrDefault(emptyList()).take(30)
        loading = false
    }
    ModalBottomSheet(onDismissRequest = onDismiss, containerColor = Color.White, tonalElevation = 0.dp) {
        Column(Modifier.fillMaxWidth().heightIn(max = 520.dp).navigationBarsPadding()) {
            Text("Mention someone", fontWeight = FontWeight.Black, fontSize = 17.sp, modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp))
            OutlinedTextField(
                query, { query = it.take(80) }, singleLine = true, placeholder = { Text("Search name or username") },
                leadingIcon = { Icon(Icons.Default.Search, null, modifier = Modifier.size(19.dp)) },
                modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp), shape = RoundedCornerShape(20.dp)
            )
            if (loading) Box(Modifier.fillMaxWidth().height(90.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator(Modifier.size(24.dp), strokeWidth = 2.dp) }
            else LazyColumn(Modifier.fillMaxWidth()) {
                items(people, key = { "mention-${it.userId}" }) { person ->
                    Row(Modifier.fillMaxWidth().clickable { onSelect(person) }.padding(horizontal = 13.dp, vertical = 7.dp), verticalAlignment = Alignment.CenterVertically) {
                        DecoratedAvatar(person.user.avatar, R.drawable.img_tiwi_avatar_1, person.avatarDecoration, Modifier.size(40.dp), animateDecoration = false)
                        Column(Modifier.padding(start = 9.dp)) {
                            Text(person.user.name.ifBlank { person.username }, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                            Text("@${person.username}", color = TiwiBlue, fontSize = 10.sp)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun TiwiBottomBar(
    selectedTab: Int,
    dark: Boolean = false,
    avatarUrl: String? = null,
    onTabSelected: (Int) -> Unit,
    onMessagesClick: () -> Unit,
    onProfileClick: () -> Unit,
    unreadMessages: Int = 0
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = if (dark) Color.Black else Color.White,
        tonalElevation = 0.dp,
        shadowElevation = 0.dp
    ) {
        Column(Modifier.fillMaxWidth()) {
            HorizontalDivider(thickness = .5.dp, color = if (dark) Color.White.copy(alpha = .12f) else Color(0xFFE8EAED))
            Row(
                modifier = Modifier.fillMaxWidth().navigationBarsPadding().height(58.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceAround
            ) {
            val items = listOf(
                Triple("home", Icons.Outlined.Home, Icons.Filled.Home),
                Triple("reels", Icons.Outlined.SmartDisplay, Icons.Filled.SmartDisplay),
                Triple("messages", Icons.Outlined.ChatBubbleOutline, Icons.Filled.ChatBubble),
                Triple("search", Icons.Outlined.Search, Icons.Filled.Search),
                Triple("profile", Icons.Outlined.PersonOutline, Icons.Filled.Person)
            )

            items.forEach { (destination, outlined, filled) ->
                val isSelected = when (destination) {
                    "home" -> selectedTab == 0
                    "reels" -> selectedTab == 2
                    "search" -> selectedTab == 1
                    else -> false
                }
                val iconScale by animateFloatAsState(if (isSelected) 1.08f else 1f, label = "bottom-$destination")
                IconButton(
                    onClick = {
                        when (destination) {
                            "home" -> onTabSelected(0)
                            "reels" -> onTabSelected(2)
                            "search" -> onTabSelected(1)
                            "messages" -> onMessagesClick()
                            else -> onProfileClick()
                        }
                    },
                    modifier = Modifier.size(50.dp)
                ) {
                    if (destination == "profile") {
                        TiwiAvatar(
                            avatarUrl,
                            R.drawable.img_tiwi_avatar_1,
                            Modifier.size(31.dp).clip(CircleShape).graphicsLayer(scaleX = iconScale, scaleY = iconScale),
                            ContentScale.Crop
                        )
                    } else Box(Modifier.size(33.dp), contentAlignment = Alignment.Center) {
                        Icon(
                            imageVector = if (isSelected) filled else outlined,
                            contentDescription = null,
                            tint = if (dark) Color.White else Color(0xFF111111),
                            modifier = Modifier.size(27.dp).graphicsLayer(scaleX = iconScale, scaleY = iconScale)
                        )
                        if (destination == "messages" && unreadMessages > 0) {
                            Box(
                                Modifier.align(Alignment.TopEnd).offset(x = 2.dp, y = 0.dp).size(9.dp)
                                    .background(Color(0xFFE11D48), CircleShape)
                                    .border(1.5.dp, if (dark) Color.Black else Color.White, CircleShape)
                            )
                        }
                    }
                }
            }
        }
        }
    }
}

@Composable
fun SearchScreen(repository: SocialRepository, onProfileClick: (String) -> Unit, onPostClick: (String) -> Unit) {
    var query by remember { mutableStateOf("") }
    var profiles by remember { mutableStateOf<List<SocialProfile>>(emptyList()) }
    val scope = rememberTiwiCoroutineScope()
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
                                    DecoratedAvatar(profile.user.avatar, R.drawable.img_tiwi_avatar_1, profile.avatarDecoration, Modifier.size(72.dp))
                                    Spacer(Modifier.height(5.dp))
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Text(profile.user.name, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                        if (profile.verified) VerifiedBadge(profile.badgeType, 14.dp, Modifier.padding(start = 2.dp))
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
                        leadingContent = { DecoratedAvatar(profile.user.avatar, R.drawable.img_tiwi_avatar_1, profile.avatarDecoration, Modifier.size(52.dp)) },
                        headlineContent = { Row(verticalAlignment = Alignment.CenterVertically) { Text(profile.user.name, fontWeight = FontWeight.Bold); if (profile.verified) VerifiedBadge(profile.badgeType, 15.dp, Modifier.padding(start = 3.dp)) } },
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
fun ReelsScreen(reels: List<Reel>, repository: SocialRepository, initialReelId: String? = null, onOpen: (String) -> Unit = {}, onShare: (Reel) -> Unit = {}, onAuthor: (String) -> Unit = {}, onLive: (SocialLiveStream) -> Unit = {}, onUseAudio: (Reel) -> Unit = {}) {
    val feed by repository.feed.collectAsState()
    val liveStreams by repository.liveStreams.collectAsState()
    val context = LocalContext.current
    var feedFilter by remember { mutableStateOf("all") }
    var actionPost by remember { mutableStateOf<Post?>(null) }
    var editPost by remember { mutableStateOf<Post?>(null) }
    var editText by remember { mutableStateOf("") }
    var deletePost by remember { mutableStateOf<Post?>(null) }
    var privacyPost by remember { mutableStateOf<Post?>(null) }
    var commentsPost by remember { mutableStateOf<Post?>(null) }
    var audioReel by remember { mutableStateOf<Reel?>(null) }
    val scope = rememberTiwiCoroutineScope()
    val orderedReels = remember(reels) { reels.sortedWith(compareByDescending<Reel> { it.following }.thenByDescending { it.publishedAt }) }
    val visibleReels = remember(orderedReels, feedFilter) {
        if (feedFilter == "following") orderedReels.filter { it.following } else orderedReels
    }
    val activeLives = remember(liveStreams) { liveStreams.filter { it.status == "live" } }
    LaunchedEffect(Unit) { runCatching { repository.refreshLiveStreams() } }
    audioReel?.let { selected ->
        ReelAudioPage(selected, orderedReels, onBack = { audioReel = null }, onReel = onOpen, onAuthor = onAuthor, onUseAudio = { reel -> audioReel = null; onUseAudio(reel) })
        return
    }
    if (feedFilter == "live") {
        ReelsLiveLanding(activeLives, feedFilter, onFilter = { feedFilter = it }, onOpen = onLive)
        return
    }
    if (visibleReels.isEmpty()) {
        Box(Modifier.fillMaxSize().background(Color.Black)) {
            ReelFeedTabs(feedFilter, activeLives.size, Modifier.align(Alignment.TopCenter).statusBarsPadding().padding(top = 8.dp)) { feedFilter = it }
            Column(Modifier.align(Alignment.Center), horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(Icons.Outlined.Movie, null, tint = Color.White.copy(alpha = .65f), modifier = Modifier.size(34.dp))
                Text("No reels from people you follow yet", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 13.sp, modifier = Modifier.padding(top = 9.dp))
            }
        }
        return
    }
    val initialPage = remember(visibleReels, initialReelId) { visibleReels.indexOfFirst { it.id == initialReelId }.coerceAtLeast(0) }
    val pagerState = rememberPagerState(initialPage = initialPage, pageCount = { visibleReels.size })
    LaunchedEffect(feedFilter, visibleReels.size) {
        pagerState.scrollToPage(pagerState.currentPage.coerceIn(0, visibleReels.lastIndex))
    }
    val currentReelId = visibleReels.getOrNull(pagerState.currentPage)?.id
    LaunchedEffect(pagerState.currentPage, currentReelId) {
        currentReelId?.let { id -> runCatching { repository.viewPost(id) } }
    }
    VerticalPager(state = pagerState, beyondViewportPageCount = 0, modifier = Modifier.fillMaxSize().background(Color.Black)) { page ->
        val sourcePost = feed.firstOrNull { it.id == visibleReels[page].id }
        val reel = sourcePost?.let(::toUiReel) ?: visibleReels[page]
        val liked = sourcePost?.viewerReaction == "like" || (sourcePost == null && reel.liked)
        var displayedLiked by remember(reel.id) { mutableStateOf(liked) }
        var displayedLikes by remember(reel.id) { mutableIntStateOf(reel.likes) }
        var displayedUses by remember(reel.id) { mutableIntStateOf(sourcePost?.shareCount ?: 0) }
        LaunchedEffect(reel.id, liked, reel.likes, sourcePost?.shareCount) {
            displayedLiked = liked
            displayedLikes = reel.likes
            displayedUses = sourcePost?.shareCount ?: displayedUses
        }
        val collaborators = reel.collaborators.filter { it.userId.isNotBlank() && it.userId != reel.authorId }.take(4)
        val collaboratorLabel = if (collaborators.isEmpty()) "@${reel.author}" else "@${reel.author} and ${collaborators.size} more"
        val firstHashtag = remember(reel.content) { Regex("""#[\\p{L}\\p{N}_]+""").find(reel.content)?.value }
        val reelMedia = reel.media.filter { it.type == "video" || it.type == "image" }
        val mediaPager = rememberPagerState(pageCount = { reelMedia.size.coerceAtLeast(1) })
        Box(modifier = Modifier.fillMaxSize().background(Color.Black)) {
            HorizontalPager(state = mediaPager, modifier = Modifier.fillMaxSize(), beyondViewportPageCount = 0) { mediaPage ->
                val item = reelMedia.getOrNull(mediaPage)
                when {
                    item?.type == "video" -> TiwiVideo(item.hlsUrl?.takeIf { item.processingStatus == "ready" } ?: item.url, Modifier.fillMaxSize(), autoplay = pagerState.currentPage == page && mediaPager.currentPage == mediaPage, fallbackUrl = item.url, posterUrl = item.thumbnailUrl, showScrubber = true, scrubberColor = Color(0xFFFF1744))
                    item?.type == "image" -> AsyncImage(model = item.url, contentDescription = null, modifier = Modifier.fillMaxSize(), contentScale = ContentScale.Fit)
                    !reel.videoUrl.isNullOrBlank() -> TiwiVideo(reel.videoUrl!!, Modifier.fillMaxSize(), autoplay = pagerState.currentPage == page, fallbackUrl = reel.fallbackVideoUrl, posterUrl = reel.thumbnailUrl, showScrubber = true, scrubberColor = Color(0xFFFF1744))
                    !reel.thumbnailUrl.isNullOrBlank() -> AsyncImage(model = reel.thumbnailUrl, contentDescription = null, modifier = Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                    else -> Box(Modifier.fillMaxSize().background(Color.Black))
                }
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
            ReelFeedTabs(feedFilter, activeLives.size, Modifier.align(Alignment.TopCenter).statusBarsPadding().padding(top = 8.dp)) { feedFilter = it }
            if (reelMedia.size > 1) Surface(
                modifier = Modifier.align(Alignment.TopEnd).statusBarsPadding().padding(end = 50.dp, top = 12.dp),
                color = Color.Black.copy(alpha = .55f), shape = RoundedCornerShape(14.dp), tonalElevation = 0.dp
            ) { Text("${mediaPager.currentPage + 1}/${reelMedia.size}", color = Color.White, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)) }
            IconButton(onClick = { feed.firstOrNull { it.id == reel.id }?.let { actionPost = toUiPost(it) } }, modifier = Modifier.align(Alignment.TopEnd).statusBarsPadding().padding(end = 5.dp, top = 3.dp)) { Icon(Icons.Default.MoreVert, "Reel options", tint = Color.White) }
            Column(
                modifier = Modifier.align(Alignment.BottomEnd).padding(end = 8.dp, bottom = 27.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                ReelRailAction(
                    icon = if (displayedLiked) Icons.Filled.Favorite else Icons.Outlined.FavoriteBorder,
                    contentDescription = "Like", value = formatCount(displayedLikes), tint = if (displayedLiked) Color(0xFFFF3040) else Color.White
                ) {
                    val wasLiked = displayedLiked
                    displayedLiked = !wasLiked
                    displayedLikes = (displayedLikes + if (wasLiked) -1 else 1).coerceAtLeast(0)
                    playLikeSound(context)
                    scope.launch {
                        runCatching { repository.reactToPost(reel.id) }
                            .onFailure {
                                displayedLiked = wasLiked
                                displayedLikes = (displayedLikes + if (wasLiked) 1 else -1).coerceAtLeast(0)
                            }
                    }
                }
                ReelRailAction(Icons.Outlined.ChatBubbleOutline, "Comment", formatCount(reel.comments)) { onOpen(reel.id) }
                ReelRailAction(Icons.Default.Visibility, "Views", formatCount(reel.views), iconSize = 26.dp) { onOpen(reel.id) }
                ReelRailAction(Icons.Default.Share, "Share", "Share") { onShare(reel) }
                ReelRailAction(Icons.Default.Repeat, "Use this audio", formatCount(displayedUses), iconSize = 29.dp) {
                    displayedUses += 1
                    audioReel = reel
                }
                Spacer(Modifier.height(5.dp))
                TiwiAvatar(reel.authorAvatarUrl, R.drawable.img_tiwi_avatar_1, Modifier.size(36.dp).clip(RoundedCornerShape(10.dp)).border(1.5.dp, Color.White.copy(alpha = .88f), RoundedCornerShape(10.dp)))
            }

            Column(modifier = Modifier.align(Alignment.BottomStart).padding(start = 12.dp, end = 82.dp, bottom = 29.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    ReelCollaboratorStack(reel, collaborators, onAuthor)
                    Text(
                        collaboratorLabel,
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f, fill = false).padding(start = 7.dp).clickable { onAuthor(reel.authorId) }
                    )
                    if (reel.verified) VerifiedBadge(reel.badgeType, 15.dp)
                    if (reel.authorId != repository.currentUserId()) {
                        Spacer(modifier = Modifier.width(7.dp))
                        Button(
                            onClick = { scope.launch { runCatching { repository.follow(reel.authorId, !reel.following) } } },
                            colors = ButtonDefaults.buttonColors(containerColor = Color.White, contentColor = Color.Black),
                            contentPadding = PaddingValues(horizontal = 9.dp, vertical = 0.dp),
                            modifier = Modifier.height(26.dp),
                            shape = RoundedCornerShape(14.dp)
                        ) { Text(if (reel.following) "Following" else "Follow", fontSize = 10.sp, fontWeight = FontWeight.Bold) }
                    }
                }
                if (reel.content.isNotBlank()) Text(
                    reel.content.replace('\n', ' '), color = Color.White, fontSize = 12.sp,
                    maxLines = 1, softWrap = false, overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.padding(top = 6.dp).clickable { onOpen(reel.id) }
                )
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 6.dp)) {
                    firstHashtag?.let { tag ->
                        Surface(color = Color.Black.copy(alpha = .38f), shape = RoundedCornerShape(13.dp), tonalElevation = 0.dp, modifier = Modifier.clickable { onOpen(reel.id) }) {
                            Row(Modifier.padding(horizontal = 8.dp, vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.PlayArrow, null, tint = Color.White, modifier = Modifier.size(14.dp))
                                Text(tag, color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(start = 3.dp), maxLines = 1)
                            }
                        }
                        Spacer(Modifier.width(5.dp))
                    }
                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.clip(RoundedCornerShape(13.dp)).background(Color.Black.copy(alpha = .38f)).clickable { audioReel = reel }.padding(horizontal = 8.dp, vertical = 4.dp)) {
                    Box(Modifier.size(21.dp).background(Brush.linearGradient(listOf(TiwiPurple, TiwiBlue)), CircleShape), contentAlignment = Alignment.Center) { Icon(Icons.Default.MusicNote, null, Modifier.size(12.dp), Color.White) }
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("${reel.musicTitle?.takeIf { it.isNotBlank() } ?: "Original audio"} - @${reel.author}", color = Color.White, fontSize = 10.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Icon(Icons.Default.ChevronRight, null, tint = Color.White.copy(alpha = .8f), modifier = Modifier.size(14.dp))
                    }
                }
            }
        }
    }
    actionPost?.let { post ->
        val isOwn = post.authorId == repository.currentUserId()
        PostActionsSheet(
            post, isOwn, onDismiss = { actionPost = null },
            onEdit = { editPost = post; editText = post.content; actionPost = null },
            onDelete = { deletePost = post; actionPost = null },
            onReport = { actionPost = null; scope.launch { runCatching { repository.reportContent("post", post.id, "inappropriate_content") }.onSuccess { Toast.makeText(context, "Report sent", Toast.LENGTH_SHORT).show() } } },
            onPrivacy = { privacyPost = post; actionPost = null }, onCommentPolicy = { commentsPost = post; actionPost = null },
            onShare = { actionPost = null; reels.firstOrNull { it.id == post.id }?.let(onShare) },
            onSave = { actionPost = null; scope.launch { runCatching { repository.savePost(post.id, !post.saved) }.onSuccess { Toast.makeText(context, if (post.saved) "Removed from Saved" else "Saved", Toast.LENGTH_SHORT).show() } } },
            onFavorite = { actionPost = null; scope.launch { runCatching { repository.favoriteUser(post.authorId, true) }.onSuccess { Toast.makeText(context, "Added to Favorites", Toast.LENGTH_SHORT).show() } } },
            onSnooze = { actionPost = null; scope.launch { runCatching { repository.snoozeUser(post.authorId, 30) }.onSuccess { Toast.makeText(context, "Snoozed for 30 days", Toast.LENGTH_SHORT).show() } } },
            onPin = { actionPost = null; scope.launch { runCatching { repository.updatePostOptions(post.id, pinned = !post.pinned) } } },
            onCopy = { actionPost = null; (context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager).setPrimaryClip(ClipData.newPlainText("Tiwi reel", "https://tiwlo.com/social/post/${post.id}")); Toast.makeText(context, "Link copied", Toast.LENGTH_SHORT).show() },
            onCreateAd = { actionPost = null; context.startActivity(Intent(Intent.ACTION_VIEW, android.net.Uri.parse("https://tiwlo.com/ads/create?post=${post.id}"))) },
            onPartnership = { actionPost = null; context.startActivity(Intent(Intent.ACTION_VIEW, android.net.Uri.parse("https://tiwlo.com/social/partnership?post=${post.id}"))) }
        )
    }
    editPost?.let { post -> AlertDialog(onDismissRequest = { editPost = null }, containerColor = Color.White, tonalElevation = 0.dp, title = { Text("Edit reel") }, text = { OutlinedTextField(editText, { editText = it }, modifier = Modifier.fillMaxWidth(), minLines = 3) }, confirmButton = { TextButton(onClick = { editPost = null; scope.launch { runCatching { repository.updatePost(post.id, editText) } } }) { Text("Save") } }, dismissButton = { TextButton(onClick = { editPost = null }) { Text("Cancel") } }) }
    deletePost?.let { post -> AlertDialog(onDismissRequest = { deletePost = null }, containerColor = Color.White, tonalElevation = 0.dp, title = { Text("Delete reel?") }, text = { Text("This removes the reel from Tiwi.") }, confirmButton = { TextButton(onClick = { deletePost = null; scope.launch { runCatching { repository.deletePost(post.id) } } }) { Text("Delete", color = Color.Red) } }, dismissButton = { TextButton(onClick = { deletePost = null }) { Text("Cancel") } }) }
    privacyPost?.let { post -> ChoiceDialog("Reel audience", listOf("public" to "Public", "followers" to "Followers", "private" to "Only me"), post.visibility, { privacyPost = null }) { value -> privacyPost = null; scope.launch { runCatching { repository.updatePostOptions(post.id, visibility = value) } } } }
    commentsPost?.let { post -> ChoiceDialog("Who can comment", listOf("everyone" to "Everyone", "followers" to "Followers", "none" to "No one"), post.commentPermission, { commentsPost = null }) { value -> commentsPost = null; scope.launch { runCatching { repository.updatePostOptions(post.id, commentPermission = value) } } } }
}

@Composable
private fun ReelFeedTabs(selected: String, liveCount: Int, modifier: Modifier = Modifier, onSelect: (String) -> Unit) {
    Surface(
        modifier = modifier,
        color = Color.Black.copy(alpha = .54f),
        shape = RoundedCornerShape(18.dp),
        tonalElevation = 0.dp
    ) {
        Row(
            modifier = Modifier.height(34.dp).padding(horizontal = 3.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            ReelFeedTab("All", "all", selected, onSelect)
            VerticalDivider(Modifier.height(15.dp), color = Color.White.copy(alpha = .28f), thickness = .5.dp)
            ReelFeedTab("Following", "following", selected, onSelect)
            VerticalDivider(Modifier.height(15.dp), color = Color.White.copy(alpha = .28f), thickness = .5.dp)
            ReelFeedTab("Live", "live", selected, onSelect, liveCount)
        }
    }
}

@Composable
private fun ReelFeedTab(label: String, value: String, selected: String, onSelect: (String) -> Unit, count: Int = 0) {
    val active = selected == value
    Row(
        modifier = Modifier.height(28.dp).clip(RoundedCornerShape(14.dp))
            .background(if (active) Color.White.copy(alpha = .18f) else Color.Transparent)
            .clickable { onSelect(value) }.padding(horizontal = 10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        if (value == "live") Box(Modifier.size(6.dp).background(Color(0xFFE11D48), CircleShape))
        Text(label, color = Color.White, fontWeight = if (active) FontWeight.Bold else FontWeight.Medium, fontSize = 11.sp, modifier = if (value == "live") Modifier.padding(start = 4.dp) else Modifier)
        if (value == "live" && count > 0) Text(count.coerceAtMost(99).toString(), color = Color.White, fontSize = 8.sp, fontWeight = FontWeight.Black, modifier = Modifier.padding(start = 4.dp))
    }
}

@Composable
private fun ReelsLiveLanding(streams: List<SocialLiveStream>, selected: String, onFilter: (String) -> Unit, onOpen: (SocialLiveStream) -> Unit) {
    Box(Modifier.fillMaxSize().background(Color.Black)) {
        ReelFeedTabs(selected, streams.size, Modifier.align(Alignment.TopCenter).statusBarsPadding().padding(top = 8.dp), onFilter)
        if (streams.isEmpty()) {
            Column(Modifier.align(Alignment.Center), horizontalAlignment = Alignment.CenterHorizontally) {
                Box(Modifier.size(46.dp).background(Color.White.copy(alpha = .1f), CircleShape), contentAlignment = Alignment.Center) { Icon(Icons.Outlined.LiveTv, null, tint = Color.White, modifier = Modifier.size(24.dp)) }
                Text("No one is live right now", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp, modifier = Modifier.padding(top = 10.dp))
                Text("Live videos will appear here as soon as they start.", color = Color.White.copy(alpha = .65f), fontSize = 11.sp, modifier = Modifier.padding(top = 3.dp))
            }
        } else {
            Column(Modifier.fillMaxSize().statusBarsPadding().padding(top = 52.dp)) {
                Row(Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(7.dp).background(Color(0xFFE11D48), CircleShape))
                    Text("Live now", color = Color.White, fontWeight = FontWeight.Black, fontSize = 14.sp, modifier = Modifier.padding(start = 6.dp))
                    Text("Tap to watch", color = Color.White.copy(alpha = .62f), fontSize = 10.sp, modifier = Modifier.padding(start = 6.dp))
                }
                LazyVerticalGrid(
                    columns = GridCells.Fixed(2), modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 3.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    gridItems(streams, key = { "reel-live-${it.id}" }) { stream ->
                        Box(
                            Modifier.aspectRatio(.74f).clip(RoundedCornerShape(13.dp))
                                .background(Brush.linearGradient(listOf(Color(0xFF253A66), Color(0xFF101828))))
                                .clickable { onOpen(stream) }
                        ) {
                            Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Color.Transparent, Color.Black.copy(alpha = .85f)))) )
                            Surface(Modifier.align(Alignment.TopStart).padding(8.dp), color = Color(0xFFE11D48), shape = RoundedCornerShape(5.dp), tonalElevation = 0.dp) { Text("LIVE", color = Color.White, fontWeight = FontWeight.Black, fontSize = 8.sp, modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp)) }
                            Column(Modifier.align(Alignment.BottomStart).padding(10.dp)) {
                                TiwiAvatar(stream.host.avatar, R.drawable.img_tiwi_avatar_1, Modifier.size(38.dp).clip(CircleShape).border(1.5.dp, Color.White, CircleShape))
                                Text(stream.host.name.ifBlank { "Tiwi creator" }, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(top = 6.dp))
                                Row(verticalAlignment = Alignment.CenterVertically) { Icon(Icons.Default.Visibility, null, tint = Color.White.copy(alpha = .8f), modifier = Modifier.size(12.dp)); Text("${formatCount(stream.viewerCount)} watching", color = Color.White.copy(alpha = .85f), fontSize = 9.sp, modifier = Modifier.padding(start = 3.dp)) }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ReelRailAction(
    icon: ImageVector,
    contentDescription: String,
    value: String,
    tint: Color = Color.White,
    iconSize: Dp = 30.dp,
    onClick: () -> Unit
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.padding(vertical = 2.dp)
    ) {
        Box(
            modifier = Modifier.size(38.dp).clip(CircleShape).clickable(onClick = onClick),
            contentAlignment = Alignment.Center
        ) {
            Icon(icon, contentDescription, tint = tint, modifier = Modifier.size(iconSize))
        }
        Text(value, color = Color.White, fontWeight = FontWeight.SemiBold, fontSize = 11.sp, maxLines = 1)
    }
}

@Composable
private fun ReelCollaboratorStack(reel: Reel, collaborators: List<SocialProfile>, onAuthor: (String) -> Unit) {
    if (collaborators.isEmpty()) {
        DecoratedAvatar(
            reel.authorAvatarUrl,
            R.drawable.img_tiwi_avatar_1,
            reel.authorDecoration,
            Modifier.size(35.dp).clip(CircleShape).clickable { onAuthor(reel.authorId) }
        )
        return
    }
    val shown = collaborators.take(4)
    Box(Modifier.width((35 + (shown.size - 1) * 18).dp).height(35.dp)) {
        shown.forEachIndexed { index, profile ->
            TiwiAvatar(
                profile.user.avatar,
                R.drawable.img_tiwi_avatar_1,
                Modifier.size(35.dp).offset(x = (index * 18).dp).clip(CircleShape).border(1.dp, Color.White, CircleShape).clickable { onAuthor(profile.userId) }
            )
        }
    }
}

@Composable
private fun ReelAudioPage(
    current: Reel,
    reels: List<Reel>,
    onBack: () -> Unit,
    onReel: (String) -> Unit,
    onAuthor: (String) -> Unit,
    onUseAudio: (Reel) -> Unit
) {
    val title = current.musicTitle ?: "Original audio"
    val related = remember(title, reels) { reels.filter { (it.musicTitle ?: "Original audio") == title }.ifEmpty { listOf(current) } }
    BackHandler(onBack = onBack)
    Column(Modifier.fillMaxSize().background(Color.White)) {
        Row(Modifier.fillMaxWidth().statusBarsPadding().height(52.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") }
            Text("Original audio", fontWeight = FontWeight.ExtraBold, fontSize = 17.sp)
        }
        Row(Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 10.dp).clickable { onAuthor(current.authorId) }, verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(76.dp).clip(RoundedCornerShape(14.dp)).background(Brush.linearGradient(listOf(TiwiPurple, TiwiBlue))), contentAlignment = Alignment.Center) {
                Icon(Icons.Default.MusicNote, null, tint = Color.White, modifier = Modifier.size(34.dp))
            }
            Column(Modifier.weight(1f).padding(start = 12.dp)) {
                Text(title, fontWeight = FontWeight.ExtraBold, fontSize = 16.sp, maxLines = 2)
                Text("Original audio · ${current.author}", color = Color.Gray, fontSize = 11.sp, modifier = Modifier.padding(top = 3.dp))
                Text("${related.size} reel${if (related.size == 1) "" else "s"}", color = Color.Gray, fontSize = 10.sp)
            }
        }
        Button(
            onClick = { onUseAudio(current) },
            modifier = Modifier.fillMaxWidth().padding(horizontal = 14.dp).height(38.dp),
            shape = RoundedCornerShape(9.dp), contentPadding = PaddingValues(0.dp)
        ) { Icon(Icons.Default.VideoCall, null, Modifier.size(18.dp)); Text("Use this audio", fontSize = 11.sp, modifier = Modifier.padding(start = 6.dp)) }
        Text("Reels using this audio", fontWeight = FontWeight.Bold, fontSize = 14.sp, modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp))
        LazyVerticalGrid(columns = GridCells.Fixed(3), modifier = Modifier.fillMaxWidth().weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp), horizontalArrangement = Arrangement.spacedBy(2.dp)) {
            gridItems(related, key = { "audio-reel-${it.id}" }) { reel ->
                Box(Modifier.aspectRatio(.7f).background(Color.Black).clickable { onReel(reel.id) }) {
                    AsyncImage(reel.thumbnailUrl, reel.content, Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                    Box(Modifier.align(Alignment.BottomStart).padding(5.dp).background(Color.Black.copy(alpha = .52f), RoundedCornerShape(8.dp))) {
                        Row(Modifier.padding(horizontal = 5.dp, vertical = 2.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.PlayArrow, null, tint = Color.White, modifier = Modifier.size(12.dp))
                            Text(formatCount(reel.views), color = Color.White, fontSize = 9.sp)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun LiveSetupPage(repository: SocialRepository, onBack: () -> Unit, onStarted: (SocialLiveStream) -> Unit) {
    val context = LocalContext.current
    val scope = rememberTiwiCoroutineScope()
    val user by repository.currentUser.collectAsState()
    val previewManager = remember { WebRtcLiveManager(context, repository) }
    val previewTrack by previewManager.localVideo.collectAsState()
    val previewState by previewManager.state.collectAsState()
    var title by remember(user?.id) { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var visibility by remember { mutableStateOf("public") }
    var commentsEnabled by remember { mutableStateOf(true) }
    var shareToStory by remember { mutableStateOf(true) }
    var route by remember { mutableStateOf("setup") }
    var invitedPeople by remember { mutableStateOf<List<SocialProfile>>(emptyList()) }
    var busy by remember { mutableStateOf(false) }
    var flashOn by remember { mutableStateOf(false) }
    val startPreview: () -> Unit = {
        scope.launch {
            runCatching { previewManager.startPreview() }
                .onFailure { Toast.makeText(context, it.message ?: "Camera preview could not start", Toast.LENGTH_LONG).show() }
        }
    }
    val cameraPermissionLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (granted) startPreview()
        else Toast.makeText(context, "Allow camera access to preview your live", Toast.LENGTH_LONG).show()
    }
    DisposableEffect(previewManager) { onDispose { previewManager.dispose() } }

    if (route == "invite") {
        LiveInvitePeoplePage(
            repository = repository,
            selected = invitedPeople,
            onBack = { route = "setup" },
            onApply = { invitedPeople = it.take(6); route = "setup" }
        )
        return
    }
    if (route == "settings") {
        LiveAdvancedSettingsPage(
            commentsEnabled = commentsEnabled,
            shareToStory = shareToStory,
            onCommentsChanged = { commentsEnabled = it },
            onShareToStoryChanged = { shareToStory = it },
            onBack = { route = "setup" }
        )
        return
    }

    val start: () -> Unit = {
        if (!busy) {
            busy = true
            scope.launch {
                val liveTitle = title.trim().ifBlank { "${user?.name?.ifBlank { "Tiwi" } ?: "Tiwi"}'s live" }
                runCatching { repository.startLiveStream(liveTitle, description.takeIf(String::isNotBlank), visibility, commentsEnabled) }
                    .onSuccess { live ->
                        invitedPeople.forEach { person -> runCatching { repository.inviteLiveCohost(live.id, person.userId) } }
                        if (shareToStory) runCatching {
                            repository.createStory(
                                visibility = visibility,
                                metadata = mapOf("liveStreamId" to live.id, "kind" to "live_announcement"),
                                items = listOf(mapOf(
                                    "type" to "text",
                                    "text" to "${liveTitle}\nLive now",
                                    "background" to "#1265D6",
                                    "durationMs" to 5_000,
                                    "overlays" to listOf(mapOf("type" to "link", "label" to "Watch live", "url" to "https://tiwlo.com/social/live/${live.id}"))
                                ))
                            )
                        }
                        previewManager.stopPreview()
                        onStarted(live)
                    }
                    .onFailure { Toast.makeText(context, it.message ?: "Live could not start", Toast.LENGTH_LONG).show() }
                busy = false
            }
        }
    }
    val permissions = arrayOf(Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO)
    val livePermissionLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { result ->
        if (permissions.all { result[it] == true || ContextCompat.checkSelfPermission(context, it) == PackageManager.PERMISSION_GRANTED }) {
            startPreview()
            start()
        }
        else Toast.makeText(context, "Camera and microphone permission are required", Toast.LENGTH_LONG).show()
    }
    val requestAndStart = {
        if (permissions.all { ContextCompat.checkSelfPermission(context, it) == PackageManager.PERMISSION_GRANTED }) start()
        else livePermissionLauncher.launch(permissions)
    }
    LaunchedEffect(Unit) {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) startPreview()
        else cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
    }

    Column(Modifier.fillMaxSize().background(Color.Black).imePadding().navigationBarsPadding()) {
        Box(Modifier.weight(1f).fillMaxWidth()) {
            Column(Modifier.fillMaxSize()) {
                Box(Modifier.fillMaxWidth().weight(1f).background(Color(0xFF101318))) {
                    if (previewTrack != null) WebRtcVideoSurface(previewTrack, previewManager.eglContext, Modifier.fillMaxSize(), mirror = true)
                    else Column(Modifier.fillMaxSize(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                        CircularProgressIndicator(Modifier.size(30.dp), color = Color.White, strokeWidth = 2.dp)
                        Text(previewState, color = Color.White.copy(alpha = .75f), fontSize = 11.sp, modifier = Modifier.padding(top = 9.dp))
                    }
                    Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Color.Black.copy(alpha = .52f), Color.Transparent, Color.Black.copy(alpha = .38f)))))
                    IconButton(onClick = { previewManager.stopPreview(); onBack() }, modifier = Modifier.align(Alignment.TopEnd).statusBarsPadding().padding(8.dp).size(37.dp).background(Color.Black.copy(alpha = .48f), CircleShape)) { Icon(Icons.Default.Close, "Cancel", tint = Color.White, modifier = Modifier.size(22.dp)) }
                    Row(Modifier.align(Alignment.TopStart).statusBarsPadding().padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        TiwiAvatar(user?.avatar, R.drawable.img_tiwi_avatar_1, Modifier.size(31.dp).clip(CircleShape))
                        Column(Modifier.padding(start = 7.dp)) {
                            Text(user?.name?.ifBlank { "Tiwi" } ?: "Tiwi", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                            Surface(color = Color.White, shape = RoundedCornerShape(8.dp), tonalElevation = 0.dp, modifier = Modifier.padding(top = 3.dp).clickable { visibility = when (visibility) { "public" -> "followers"; "followers" -> "private"; else -> "public" } }) {
                                Row(Modifier.padding(horizontal = 7.dp, vertical = 3.dp), verticalAlignment = Alignment.CenterVertically) { Icon(if (visibility == "private") Icons.Default.Lock else if (visibility == "followers") Icons.Default.Groups else Icons.Default.Public, null, modifier = Modifier.size(12.dp)); Text(if (visibility == "private") "Only me" else if (visibility == "followers") "Followers" else "Public", fontSize = 10.sp, modifier = Modifier.padding(start = 3.dp)) }
                            }
                        }
                    }
                    Column(Modifier.align(Alignment.CenterEnd).padding(end = 11.dp), horizontalAlignment = Alignment.End) {
                        LiveOverlayTool(if (flashOn) Icons.Default.FlashOn else Icons.Default.FlashOff, if (flashOn) "Flash on" else "Flash off") {
                            previewManager.toggleFlash()?.let { flashOn = it } ?: Toast.makeText(context, "Flash is not available on this camera", Toast.LENGTH_SHORT).show()
                        }
                        LiveOverlayTool(Icons.Default.Cameraswitch, "Rotate") { previewManager.switchCamera(); flashOn = false }
                    }
                }
                BasicTextField(
                    value = description,
                    onValueChange = { description = it.take(1_000) },
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 13.dp, vertical = 11.dp),
                    textStyle = MaterialTheme.typography.bodyMedium.copy(color = Color.White, fontSize = 14.sp),
                    decorationBox = { inner -> if (description.isBlank()) Text("Tap to add a description…", color = Color.White.copy(alpha = .72f), fontSize = 14.sp); inner() }
                )
                Row(Modifier.fillMaxWidth().padding(horizontal = 9.dp, vertical = 3.dp), horizontalArrangement = Arrangement.SpaceEvenly) {
                    LiveSetupAction(Icons.Default.PersonAdd, "Add people", invitedPeople.size.takeIf { it > 0 }?.toString()) { route = "invite" }
                    LiveSetupAction(Icons.Default.ChatBubbleOutline, "Comments") { route = "settings" }
                    LiveSetupAction(Icons.Default.AutoAwesome, "Enhance") { Toast.makeText(context, "Camera enhancement follows your device settings", Toast.LENGTH_SHORT).show() }
                    LiveSetupAction(Icons.Default.MoreHoriz, "More") { route = "settings" }
                }
            }
        }
        Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 5.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Default.AutoAwesome, null, tint = Color.White.copy(alpha = .78f), modifier = Modifier.size(15.dp))
            Text("Adaptive 360p–720p · Auto ends after 30 seconds offline", color = Color.White.copy(alpha = .66f), fontSize = 9.sp, modifier = Modifier.padding(start = 5.dp).weight(1f))
            Text("${invitedPeople.size}/6 guests", color = TiwiBlue, fontSize = 9.sp, fontWeight = FontWeight.Bold)
        }
        Button(
            onClick = requestAndStart, enabled = !busy,
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 7.dp).height(52.dp),
            shape = RoundedCornerShape(8.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1877F2))
        ) {
            if (busy) CircularProgressIndicator(Modifier.size(18.dp), color = Color.White, strokeWidth = 2.dp)
            else { Icon(Icons.Default.Videocam, null, Modifier.size(20.dp)); Text("Go Live", Modifier.padding(start = 7.dp), fontWeight = FontWeight.Black, fontSize = 17.sp) }
        }
    }
}

@Composable
private fun LiveOverlayTool(icon: ImageVector, label: String, onClick: () -> Unit) {
    Row(Modifier.padding(vertical = 4.dp).clickable(onClick = onClick), verticalAlignment = Alignment.CenterVertically) {
        Text(label, color = Color.White, fontSize = 11.sp, modifier = Modifier.padding(end = 7.dp))
        Box(Modifier.size(29.dp).background(Color.Black.copy(alpha = .42f), CircleShape), contentAlignment = Alignment.Center) { Icon(icon, label, tint = Color.White, modifier = Modifier.size(17.dp)) }
    }
}

@Composable
private fun LiveSetupAction(icon: ImageVector, label: String, badge: String? = null, onClick: () -> Unit) {
    Column(Modifier.width(72.dp).clickable(onClick = onClick).padding(vertical = 5.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Box(Modifier.size(31.dp).background(Color.White.copy(alpha = .12f), CircleShape), contentAlignment = Alignment.Center) {
            Icon(icon, label, tint = Color.White, modifier = Modifier.size(17.dp))
            badge?.let { Text(it, color = Color.White, fontSize = 8.sp, fontWeight = FontWeight.Black, modifier = Modifier.align(Alignment.TopEnd).background(TiwiBlue, CircleShape).padding(horizontal = 3.dp)) }
        }
        Text(label, color = Color.White.copy(alpha = .85f), fontSize = 9.sp, modifier = Modifier.padding(top = 3.dp), maxLines = 1)
    }
}

@Composable
private fun LiveInvitePeoplePage(repository: SocialRepository, selected: List<SocialProfile>, onBack: () -> Unit, onApply: (List<SocialProfile>) -> Unit) {
    var query by remember { mutableStateOf("") }
    var results by remember { mutableStateOf<List<SocialProfile>>(emptyList()) }
    var chosen by remember(selected) { mutableStateOf(selected) }
    LaunchedEffect(query) { delay(if (query.isBlank()) 0 else 250); results = runCatching { repository.searchProfiles(query) }.getOrDefault(emptyList()).filter { it.userId != repository.currentUserId() } }
    Column(Modifier.fillMaxSize().background(Color(0xFF111318)).statusBarsPadding()) {
        Row(Modifier.fillMaxWidth().height(52.dp).padding(horizontal = 8.dp), verticalAlignment = Alignment.CenterVertically) { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back", tint = Color.White) }; Text("Bring some friends", color = Color.White, fontSize = 17.sp, fontWeight = FontWeight.Black, modifier = Modifier.weight(1f)); TextButton(onClick = { onApply(chosen) }) { Text("Done", color = TiwiBlue, fontWeight = FontWeight.Black) } }
        Text("Invite up to six people. They receive a notification and can join with camera and microphone.", color = Color.White.copy(alpha = .68f), fontSize = 11.sp, lineHeight = 15.sp, modifier = Modifier.padding(horizontal = 16.dp, vertical = 5.dp))
        OutlinedTextField(query, { query = it }, Modifier.fillMaxWidth().padding(12.dp), singleLine = true, placeholder = { Text("Search people", color = Color.White.copy(alpha = .58f)) }, leadingIcon = { Icon(Icons.Default.Search, null, tint = Color.White.copy(alpha = .7f)) }, colors = OutlinedTextFieldDefaults.colors(unfocusedBorderColor = Color.White.copy(alpha = .22f), focusedBorderColor = TiwiBlue, unfocusedTextColor = Color.White, focusedTextColor = Color.White, unfocusedContainerColor = Color.Transparent, focusedContainerColor = Color.Transparent), shape = RoundedCornerShape(10.dp))
        LazyColumn(Modifier.fillMaxSize()) {
            items(results, key = { it.userId }) { person ->
                val picked = chosen.any { it.userId == person.userId }
                Row(Modifier.fillMaxWidth().clickable(enabled = picked || chosen.size < 6) { chosen = if (picked) chosen.filterNot { it.userId == person.userId } else chosen + person }.padding(horizontal = 16.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                    TiwiAvatar(person.user.avatar, R.drawable.img_tiwi_avatar_1, Modifier.size(42.dp).clip(CircleShape))
                    Column(Modifier.weight(1f).padding(start = 10.dp)) { Text(person.user.name, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 13.sp); Text("@${person.username}", color = Color.White.copy(alpha = .62f), fontSize = 10.sp) }
                    Icon(if (picked) Icons.Default.CheckCircle else Icons.Outlined.PersonAdd, null, tint = if (picked) TiwiBlue else Color.White.copy(alpha = .78f), modifier = Modifier.size(22.dp))
                }
            }
        }
    }
}

@Composable
private fun LiveAdvancedSettingsPage(commentsEnabled: Boolean, shareToStory: Boolean, onCommentsChanged: (Boolean) -> Unit, onShareToStoryChanged: (Boolean) -> Unit, onBack: () -> Unit) {
    Column(Modifier.fillMaxSize().background(Color(0xFF111318)).statusBarsPadding()) {
        Row(Modifier.fillMaxWidth().height(54.dp).padding(horizontal = 8.dp), verticalAlignment = Alignment.CenterVertically) { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back", tint = Color.White) }; Text("Live settings", color = Color.White, fontWeight = FontWeight.Black, fontSize = 17.sp) }
        LiveSettingsRow(Icons.Default.ChatBubbleOutline, "Comments", "Viewers can comment and reply", commentsEnabled, onCommentsChanged)
        LiveSettingsRow(Icons.Default.Share, "Share to Story", "Publish a live announcement to your story", shareToStory, onShareToStoryChanged)
        LiveStaticSettingsRow(Icons.Default.HighQuality, "Adaptive video quality", "Automatically uses 360p, 480p or 720p based on network")
        LiveStaticSettingsRow(Icons.Default.Security, "Connection safety", "The live closes after 30 seconds without an internet connection")
    }
}

@Composable
private fun LiveSettingsRow(icon: ImageVector, title: String, subtitle: String, checked: Boolean, onChecked: (Boolean) -> Unit) {
    Row(Modifier.fillMaxWidth().clickable { onChecked(!checked) }.padding(horizontal = 16.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) { Icon(icon, null, tint = Color.White, modifier = Modifier.size(22.dp)); Column(Modifier.weight(1f).padding(start = 12.dp)) { Text(title, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 13.sp); Text(subtitle, color = Color.White.copy(alpha = .6f), fontSize = 10.sp, lineHeight = 13.sp) }; Switch(checked, onChecked) }
}

@Composable
private fun LiveStaticSettingsRow(icon: ImageVector, title: String, subtitle: String) {
    Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) { Icon(icon, null, tint = Color.White, modifier = Modifier.size(22.dp)); Column(Modifier.padding(start = 12.dp)) { Text(title, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 13.sp); Text(subtitle, color = Color.White.copy(alpha = .6f), fontSize = 10.sp, lineHeight = 13.sp) } }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun LiveBroadcastScreen(repository: SocialRepository, stream: SocialLiveStream, host: Boolean, onEnd: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberTiwiCoroutineScope()
    val manager = remember(stream.id, host) { WebRtcLiveManager(context, repository) }
    val state by manager.state.collectAsState()
    val localVideo by manager.localVideo.collectAsState()
    val remoteVideo by manager.remoteVideo.collectAsState()
    val cohostVideos by manager.cohostVideos.collectAsState()
    val participants by manager.participants.collectAsState()
    val viewerCount by manager.viewerCount.collectAsState()
    val paused by manager.paused.collectAsState()
    val microphoneEnabled by manager.microphoneEnabled.collectAsState()
    var comments by remember { mutableStateOf<List<SocialLiveComment>>(emptyList()) }
    var commentText by remember { mutableStateOf("") }
    var replyTo by remember { mutableStateOf<SocialLiveComment?>(null) }
    var started by remember { mutableStateOf(false) }
    var confirmEnd by remember { mutableStateOf(false) }
    var commentsVisible by remember { mutableStateOf(true) }
    var reactionIds by remember { mutableStateOf<List<Int>>(emptyList()) }
    var nextReactionId by remember { mutableIntStateOf(0) }
    val ownId = repository.currentUserId()
    val notifications by repository.notifications.collectAsState()
    val cohostRequested = !host && notifications.any { notification ->
        notification.metadata["liveStreamId"]?.toString() == stream.id && notification.metadata["role"]?.toString() == "cohost"
    }

    LaunchedEffect(stream.id, host) {
        if (!started) {
            started = true
            runCatching { if (host) manager.startHost(stream) else manager.join(stream, asCohost = cohostRequested) }
                .onFailure { Toast.makeText(context, it.message ?: "Could not open live", Toast.LENGTH_LONG).show(); onEnd() }
        }
    }
    LaunchedEffect(stream.id) {
        while (true) {
            comments = runCatching { repository.liveComments(stream.id) }.getOrDefault(comments)
            delay(1_500)
        }
    }
    LaunchedEffect(state) {
        if (state.startsWith("Live ended")) { delay(1_200); onEnd() }
    }
    BackHandler { confirmEnd = true }
    DisposableEffect(manager) { onDispose { manager.dispose(sendEnd = false) } }

    Box(Modifier.fillMaxSize().background(Color.Black)) {
        val track = if (host) localVideo else remoteVideo
        if (track != null) WebRtcVideoSurface(track, manager.eglContext, Modifier.fillMaxSize(), mirror = host)
        else Box(Modifier.fillMaxSize().background(Color(0xFF101828)), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                CircularProgressIndicator(Modifier.size(28.dp), color = Color.White, strokeWidth = 2.dp)
                Text(state, color = Color.White, fontSize = 12.sp, modifier = Modifier.padding(top = 10.dp))
            }
        }
        Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Color.Black.copy(alpha = .45f), Color.Transparent, Color.Black.copy(alpha = .8f)))))
        Row(Modifier.align(Alignment.TopStart).statusBarsPadding().padding(10.dp), verticalAlignment = Alignment.CenterVertically) {
            Surface(color = Color(0xFFE11D48), shape = RoundedCornerShape(5.dp), tonalElevation = 0.dp) { Text("LIVE", color = Color.White, fontWeight = FontWeight.Black, fontSize = 10.sp, modifier = Modifier.padding(horizontal = 7.dp, vertical = 3.dp)) }
            Surface(Modifier.padding(start = 6.dp), color = Color.Black.copy(alpha = .45f), shape = RoundedCornerShape(5.dp), tonalElevation = 0.dp) {
                Row(Modifier.padding(horizontal = 7.dp, vertical = 3.dp), verticalAlignment = Alignment.CenterVertically) { Icon(Icons.Default.Visibility, null, Modifier.size(13.dp), Color.White); Text(formatCount(viewerCount.coerceAtLeast(stream.viewerCount)), color = Color.White, fontSize = 10.sp, modifier = Modifier.padding(start = 4.dp)) }
            }
        }
        IconButton(onClick = { confirmEnd = true }, modifier = Modifier.align(Alignment.TopEnd).statusBarsPadding().padding(6.dp).background(Color.Black.copy(alpha = .38f), CircleShape)) { Icon(Icons.Default.Close, "Close live", tint = Color.White) }

        if (host && cohostVideos.isNotEmpty()) {
            val cohosts = participants.filter { it.role == "cohost" && cohostVideos.containsKey(it.id) }.take(6)
            LazyRow(
                Modifier.align(Alignment.CenterEnd).fillMaxWidth().padding(start = 76.dp, end = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(5.dp),
                reverseLayout = true
            ) {
                items(cohosts, key = { it.id }) { participant ->
                    Box(Modifier.size(width = 82.dp, height = 116.dp).clip(RoundedCornerShape(9.dp)).background(Color(0xFF161A20)).clickable { manager.toggleCohostMicrophone(participant) }) {
                        cohostVideos[participant.id]?.let { track -> WebRtcVideoSurface(track, manager.eglContext, Modifier.fillMaxSize(), mirror = false) }
                        Surface(Modifier.align(Alignment.BottomCenter).padding(4.dp), color = Color.Black.copy(alpha = .6f), shape = RoundedCornerShape(6.dp), tonalElevation = 0.dp) {
                            Row(Modifier.padding(horizontal = 5.dp, vertical = 3.dp), verticalAlignment = Alignment.CenterVertically) {
                                Icon(if (participant.microphoneEnabled) Icons.Default.Mic else Icons.Default.MicOff, null, tint = Color.White, modifier = Modifier.size(11.dp))
                                Text(participant.viewer.name.ifBlank { "Guest" }, color = Color.White, fontSize = 8.sp, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(start = 3.dp).widthIn(max = 49.dp))
                            }
                        }
                    }
                }
            }
        }

        if (reactionIds.isNotEmpty()) {
            Column(Modifier.align(Alignment.CenterEnd).padding(end = 18.dp, bottom = 120.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                reactionIds.takeLast(4).forEachIndexed { index, _ ->
                    Icon(Icons.Filled.Favorite, null, tint = Color(0xFFFF3B5C), modifier = Modifier.size((24 + index * 5).dp))
                }
            }
        }
        if (commentsVisible) Column(Modifier.align(Alignment.BottomStart).fillMaxWidth().padding(bottom = 82.dp)) {
            if (paused) Surface(color = Color.Black.copy(alpha = .62f), tonalElevation = 0.dp, modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp), shape = RoundedCornerShape(7.dp)) { Text("Live video is paused", color = Color.White, fontSize = 11.sp, modifier = Modifier.padding(horizontal = 9.dp, vertical = 5.dp)) }
            LazyColumn(Modifier.fillMaxWidth().heightIn(max = 205.dp), contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                items(comments.takeLast(40), key = { it.id }) { comment ->
                    Row(
                        Modifier.fillMaxWidth().combinedClickable(onClick = { replyTo = comment }, onLongClick = { replyTo = comment }), verticalAlignment = Alignment.Top
                    ) {
                        TiwiAvatar(comment.author.avatar, R.drawable.img_tiwi_avatar_1, Modifier.size(28.dp).clip(CircleShape))
                        Surface(Modifier.padding(start = 6.dp).widthIn(max = 270.dp), color = Color.Black.copy(alpha = .52f), shape = RoundedCornerShape(10.dp), tonalElevation = 0.dp) {
                            Column(Modifier.padding(horizontal = 8.dp, vertical = 5.dp)) {
                                Text(comment.author.name.ifBlank { "Tiwi viewer" }, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 10.sp)
                                Text(comment.body, color = Color.White, fontSize = 11.sp, lineHeight = 14.sp)
                            }
                        }
                    }
                }
            }
        }

        Column(Modifier.align(Alignment.BottomCenter).fillMaxWidth().background(Color.Black.copy(alpha = .56f)).navigationBarsPadding()) {
            replyTo?.let { reply -> Row(Modifier.fillMaxWidth().padding(horizontal = 10.dp, vertical = 3.dp), verticalAlignment = Alignment.CenterVertically) { Text("Replying to ${reply.author.name}", color = Color.White.copy(alpha = .8f), fontSize = 9.sp, modifier = Modifier.weight(1f)); IconButton(onClick = { replyTo = null }, Modifier.size(24.dp)) { Icon(Icons.Default.Close, null, tint = Color.White, modifier = Modifier.size(14.dp)) } } }
            Row(Modifier.fillMaxWidth().height(52.dp).padding(horizontal = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = {
                    val id = nextReactionId + 1
                    nextReactionId = id
                    reactionIds = reactionIds + id
                    scope.launch { delay(1_400); reactionIds = reactionIds - id }
                }) { Icon(Icons.Outlined.FavoriteBorder, "React", tint = Color.White) }
                IconButton(onClick = { commentsVisible = !commentsVisible }) { Icon(if (commentsVisible) Icons.Outlined.ChatBubbleOutline else Icons.Default.ChatBubble, "Show comments", tint = Color.White) }
                if (host) {
                    IconButton(onClick = manager::switchCamera) { Icon(Icons.Default.Cameraswitch, "Switch camera", tint = Color.White) }
                    IconButton(onClick = manager::toggleMicrophone) { Icon(if (microphoneEnabled) Icons.Default.Mic else Icons.Default.MicOff, "Microphone", tint = Color.White) }
                    IconButton(onClick = { manager.toggleFlash()?.let { } ?: Toast.makeText(context, "Flash is not available on this camera", Toast.LENGTH_SHORT).show() }) { Icon(Icons.Default.FlashOn, "Flash", tint = Color.White) }
                } else if (cohostRequested) {
                    IconButton(onClick = manager::switchCamera) { Icon(Icons.Default.Cameraswitch, "Switch camera", tint = Color.White) }
                    IconButton(onClick = manager::toggleMicrophone) { Icon(if (microphoneEnabled) Icons.Default.Mic else Icons.Default.MicOff, "Microphone", tint = Color.White) }
                }
                Surface(Modifier.weight(1f).height(36.dp), shape = RoundedCornerShape(18.dp), color = Color.White.copy(alpha = .16f), tonalElevation = 0.dp) {
                    BasicTextField(
                        commentText, { commentText = it.take(1000) }, Modifier.fillMaxSize().padding(horizontal = 12.dp, vertical = 8.dp),
                        enabled = stream.commentsEnabled || host,
                        textStyle = MaterialTheme.typography.bodyMedium.copy(color = Color.White, fontSize = 12.sp),
                        decorationBox = { inner -> if (commentText.isBlank()) Text(if (stream.commentsEnabled || host) "Comment on this live" else "Comments are off", color = Color.White.copy(alpha = .66f), fontSize = 11.sp); inner() }
                    )
                }
                IconButton(onClick = {
                    val body = commentText.trim()
                    if (body.isNotBlank() && (stream.commentsEnabled || host)) {
                        commentText = ""
                        val replyId = replyTo?.id
                        replyTo = null
                        scope.launch { runCatching { repository.addLiveComment(stream.id, body, replyId) }.onSuccess { comments = comments + it } }
                    }
                }) { Icon(Icons.AutoMirrored.Outlined.Send, "Send comment", tint = if (commentText.isBlank()) Color.Gray else TiwiBlue) }
            }
        }
    }
    if (confirmEnd) LiveEndConfirmationSheet(
        host = host,
        onDismiss = { confirmEnd = false },
        onConfirm = {
            if (host) manager.end() else scope.launch { runCatching { repository.leaveLiveStream(stream.id) } }
            onEnd()
        }
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun LiveEndConfirmationSheet(host: Boolean, onDismiss: () -> Unit, onConfirm: () -> Unit) {
    ModalBottomSheet(onDismissRequest = onDismiss, dragHandle = { BottomSheetDefaults.DragHandle(color = Color(0xFFD0D5DD)) }, containerColor = Color.White, tonalElevation = 0.dp) {
        Column(Modifier.fillMaxWidth().padding(horizontal = 20.dp).navigationBarsPadding()) {
            Text(if (host) "End live video?" else "Leave this live?", fontWeight = FontWeight.Black, fontSize = 20.sp)
            Text(if (host) "Your viewers will no longer be able to watch this live." else "You can join again while the live is still running.", color = Color(0xFF667085), fontSize = 13.sp, lineHeight = 18.sp, modifier = Modifier.padding(top = 7.dp))
            Row(Modifier.fillMaxWidth().padding(top = 18.dp, bottom = 8.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedButton(onClick = onDismiss, modifier = Modifier.weight(1f).height(46.dp), shape = RoundedCornerShape(9.dp)) { Text("Cancel", fontWeight = FontWeight.Bold) }
                Button(onClick = onConfirm, modifier = Modifier.weight(1f).height(46.dp), shape = RoundedCornerShape(9.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFD92D20))) { Text(if (host) "End live" else "Leave", fontWeight = FontWeight.Bold) }
            }
        }
    }
}

@Composable
private fun SocialCallScreen(repository: SocialRepository, request: TiwiCallRequest, onEnd: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberTiwiCoroutineScope()
    val manager = remember(request.incoming?.id, request.peerId, request.video) { WebRtcCallManager(context, repository) }
    val callState by manager.state.collectAsState()
    val localVideo by manager.localVideo.collectAsState()
    val remoteVideo by manager.remoteVideo.collectAsState()
    val microphoneEnabled by manager.microphoneEnabled.collectAsState()
    val cameraEnabled by manager.cameraEnabled.collectAsState()
    val speakerEnabled by manager.speakerEnabled.collectAsState()
    var started by remember(request) { mutableStateOf(false) }
    var callFlashOn by remember(request) { mutableStateOf(false) }

    val beginCall: () -> Unit = {
        if (!started) {
            started = true
            if (request.incoming != null) NotificationManagerCompat.from(context).cancel(TiwiCallListenerService.INCOMING_NOTIFICATION_ID)
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
            NotificationManagerCompat.from(context).cancel(TiwiCallListenerService.INCOMING_NOTIFICATION_ID)
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
        val terminalError = callState.contains("busy", ignoreCase = true) ||
            callState.contains("unavailable", ignoreCase = true) ||
            callState.contains("failed", ignoreCase = true)
        if (started && (callState in setOf("Declined", "Call ended") || terminalError)) {
            delay(if (terminalError) 1_600 else 900)
            onEnd()
        }
    }
    DisposableEffect(request.incoming?.id, callState, started) {
        val sound = when {
            request.incoming != null && !started -> R.raw.tiwi_incoming_ring
            request.incoming == null && callState.startsWith("Ringing", ignoreCase = true) -> R.raw.tiwi_outgoing_ring
            else -> null
        }
        val player = sound?.let { resId ->
            runCatching {
                val attributes = AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION_SIGNALLING)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build()
                MediaPlayer.create(context, resId, attributes, AudioManager.AUDIO_SESSION_ID_GENERATE)?.apply {
                    isLooping = true
                    start()
                }
            }.getOrNull()
        }
        onDispose {
            player?.let { active ->
                runCatching { if (active.isPlaying) active.stop() }
                active.release()
            }
        }
    }
    BackHandler {
        NotificationManagerCompat.from(context).cancel(TiwiCallListenerService.INCOMING_NOTIFICATION_ID)
        if (request.incoming != null && !started) manager.declineIncoming(request.incoming) else manager.hangUp()
        onEnd()
    }
    DisposableEffect(manager) { onDispose { manager.dispose(sendEnd = false) } }
    DisposableEffect(request.video, started, speakerEnabled) {
        if (request.video || !started || speakerEnabled) return@DisposableEffect onDispose { }
        val sensorManager = context.getSystemService(Context.SENSOR_SERVICE) as SensorManager
        val proximity = sensorManager.getDefaultSensor(Sensor.TYPE_PROXIMITY)
        val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
        val wakeLock = powerManager.newWakeLock(PowerManager.PROXIMITY_SCREEN_OFF_WAKE_LOCK, "Tiwi:call-proximity")
        val listener = object : SensorEventListener {
            override fun onSensorChanged(event: SensorEvent) {
                val near = event.values.firstOrNull()?.let { it < event.sensor.maximumRange } == true
                if (near && !wakeLock.isHeld) runCatching { wakeLock.acquire(10 * 60 * 1000L) }
                else if (!near && wakeLock.isHeld) runCatching { wakeLock.release() }
            }
            override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) = Unit
        }
        if (proximity != null) sensorManager.registerListener(listener, proximity, SensorManager.SENSOR_DELAY_NORMAL)
        onDispose {
            sensorManager.unregisterListener(listener)
            if (wakeLock.isHeld) runCatching { wakeLock.release() }
        }
    }

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
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            if (request.incoming != null && !started) {
                CallControl(Icons.Default.CallEnd, Color(0xFFE53935), "Decline") {
                    NotificationManagerCompat.from(context).cancel(TiwiCallListenerService.INCOMING_NOTIFICATION_ID)
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
                CallControl(if (speakerEnabled) Icons.Default.VolumeUp else Icons.Default.Hearing, Color.White.copy(alpha = 0.22f), "Speaker") {
                    manager.toggleSpeaker()
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
                        callFlashOn = false
                    }
                    CallControl(if (callFlashOn) Icons.Default.FlashOn else Icons.Default.FlashOff, Color.White.copy(alpha = 0.22f), "Flash") {
                        manager.toggleFlash()?.let { callFlashOn = it } ?: Toast.makeText(context, "Flash is not available on this camera", Toast.LENGTH_SHORT).show()
                    }
                }
            }
        }
    }
}

@Composable
private fun CallControl(icon: ImageVector, color: Color, description: String, onClick: () -> Unit) {
    Surface(
        modifier = Modifier.size(46.dp).clickable(onClick = onClick),
        shape = CircleShape,
        color = color
    ) {
        Box(contentAlignment = Alignment.Center) {
            Icon(icon, contentDescription = description, tint = Color.White, modifier = Modifier.size(23.dp))
        }
    }
}

@Composable
private fun WebRtcVideoSurface(track: VideoTrack?, eglContext: EglBase.Context, modifier: Modifier, mirror: Boolean) {
    val context = LocalContext.current
    // A stable renderer prevents a valid WebRTC track from being connected to
    // a released SurfaceView during Compose recomposition on slower phones.
    val renderer = remember { SurfaceViewRenderer(context) }
    DisposableEffect(renderer, eglContext) {
        renderer.init(eglContext, null)
        renderer.setEnableHardwareScaler(false)
        renderer.setScalingType(RendererCommon.ScalingType.SCALE_ASPECT_FILL)
        renderer.setMirror(mirror)
        onDispose { renderer.release() }
    }
    AndroidView(
        factory = { renderer },
        update = { it.setMirror(mirror) },
        modifier = modifier.background(Color.Black)
    )
    DisposableEffect(renderer, track) {
        track?.setEnabled(true)
        track?.addSink(renderer)
        onDispose { track?.removeSink(renderer) }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationsScreen(
    repository: SocialRepository,
    onProfileClick: (String) -> Unit = {},
    onPostClick: (String) -> Unit = {},
    onSupportCenter: () -> Unit = {},
    onCopyrightStudio: () -> Unit = {},
    onLive: (SocialLiveStream) -> Unit = {}
) {
    val notifications by repository.notifications.collectAsState()
    val syncing by repository.syncing.collectAsState()
    val scope = rememberTiwiCoroutineScope()
    LaunchedEffect(Unit) {
        while (true) {
            runCatching { repository.refreshNotifications() }
            delay(20_000)
        }
    }
    PullToRefreshBox(
        isRefreshing = syncing,
        onRefresh = { scope.launch { runCatching { repository.refreshNotifications() } } },
        modifier = Modifier.fillMaxSize()
    ) {
        Column(Modifier.fillMaxSize().background(Color.White)) {
            Text("Activity", modifier = Modifier.padding(horizontal = 14.dp, vertical = 11.dp), fontSize = 22.sp, fontWeight = FontWeight.Black)
            if (notifications.isEmpty()) Box(Modifier.fillMaxSize().padding(bottom = 72.dp), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Box(Modifier.size(62.dp).background(Color(0xFFF2F4F7), CircleShape), contentAlignment = Alignment.Center) { Icon(Icons.Outlined.NotificationsNone, null, tint = Color(0xFF667085), modifier = Modifier.size(29.dp)) }
                    Spacer(Modifier.height(11.dp))
                    Text("No notifications yet", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                    Text("Likes, comments, follows and mentions will appear here.", color = Color.Gray, fontSize = 11.sp, textAlign = TextAlign.Center, modifier = Modifier.padding(top = 4.dp, start = 28.dp, end = 28.dp))
                }
            } else LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 8.dp)) {
                items(notifications, key = { "activity-${it.id}" }) { notification ->
                    ActivityNotificationRow(repository, notification) {
                        scope.launch {
                            if (notification.status == "unread") runCatching { repository.markNotificationRead(notification.id) }
                            val actorId = notification.metadata["actorId"]?.toString()
                            val postId = notification.metadata["postId"]?.toString()
                            val liveId = notification.metadata["liveStreamId"]?.toString()
                            when {
                                notification.metadata["destination"]?.toString() == "support_center" -> onSupportCenter()
                                notification.metadata["destination"]?.toString() == "copyright_studio" -> onCopyrightStudio()
                                !liveId.isNullOrBlank() -> repository.getLiveStream(liveId)?.let(onLive)
                                !postId.isNullOrBlank() -> onPostClick(postId)
                                !actorId.isNullOrBlank() -> onProfileClick(actorId)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ActivityNotificationRow(repository: SocialRepository, notification: SocialNotification, onOpen: () -> Unit) {
    val actorId = notification.metadata["actorId"]?.toString().orEmpty()
    val actorAvatar = notification.metadata["actorAvatar"]?.toString()
    var actorProfile by remember(actorId) { mutableStateOf<SocialProfile?>(null) }
    var busy by remember(actorId) { mutableStateOf(false) }
    val scope = rememberTiwiCoroutineScope()
    LaunchedEffect(actorId, notification.type) {
        if (notification.type == "follow" && actorId.isNotBlank()) actorProfile = runCatching { repository.refreshProfile(actorId) }.getOrNull()
    }
    Row(
        Modifier.fillMaxWidth().background(if (notification.status == "unread") Color(0xFFF2F7FF) else Color.White).clickable(onClick = onOpen).padding(horizontal = 12.dp, vertical = 7.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box {
            if (notification.metadata["destination"]?.toString() == "support_center" || notification.metadata["destination"]?.toString() == "copyright_studio") {
                Image(painterResource(R.drawable.tiwi_app_icon), null, Modifier.size(45.dp).clip(CircleShape), contentScale = ContentScale.Crop)
            } else TiwiAvatar(actorAvatar, R.drawable.img_tiwi_avatar_1, Modifier.size(45.dp).clip(CircleShape))
            val marker = when (notification.type) {
                "follow" -> Icons.Outlined.PersonAdd
                "post_like", "comment_like" -> Icons.Filled.Favorite
                "copyright_detected", "copyright_match", "copyright_removed" -> Icons.Default.Copyright
                "post_comment", "comment_reply" -> Icons.Outlined.ChatBubbleOutline
                "mention" -> Icons.Outlined.AlternateEmail
                "live_started" -> Icons.Outlined.LiveTv
                "report_received", "report_reviewed" -> Icons.Outlined.Flag
                "verification_received", "verification_reviewed", "verification_approved", "verification_updated" -> Icons.Outlined.Verified
                else -> Icons.Outlined.Notifications
            }
            Box(Modifier.align(Alignment.BottomEnd).size(17.dp).background(TiwiBlue, CircleShape), contentAlignment = Alignment.Center) { Icon(marker, null, tint = Color.White, modifier = Modifier.size(10.dp)) }
        }
        Column(Modifier.weight(1f).padding(horizontal = 9.dp)) {
            Text(notification.title.ifBlank { "Tiwi activity" }, fontWeight = FontWeight.ExtraBold, fontSize = 13.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text("${notification.message} · ${relativePostTime(notification.createdAt)}", color = Color(0xFF475467), fontSize = 10.sp, lineHeight = 13.sp, maxLines = 2, overflow = TextOverflow.Ellipsis)
        }
        if (notification.type == "follow" && actorId.isNotBlank() && actorProfile?.isFollowing != true) {
            Button(
                enabled = !busy,
                onClick = {
                    busy = true
                    scope.launch {
                        runCatching { repository.follow(actorId, true) }.onSuccess { actorProfile = it }
                        busy = false
                    }
                },
                modifier = Modifier.height(30.dp),
                contentPadding = PaddingValues(horizontal = 9.dp, vertical = 0.dp),
                shape = RoundedCornerShape(8.dp)
            ) { if (busy) CircularProgressIndicator(Modifier.size(12.dp), strokeWidth = 1.7.dp, color = Color.White) else Text("Follow back", fontSize = 9.sp, fontWeight = FontWeight.Bold) }
        } else if (notification.status == "unread") Box(Modifier.size(8.dp).background(TiwiBlue, CircleShape))
    }
}

@Composable
fun MenuScreen(
    repository: SocialRepository,
    name: String,
    avatarUrl: String?,
    initialSetting: String? = null,
    onInitialSettingConsumed: () -> Unit = {},
    onProfileClick: () -> Unit,
    onUserProfileClick: (String) -> Unit = {},
    onLogout: () -> Unit
) {
    var selectedSetting by remember { mutableStateOf<String?>(initialSetting) }
    var selectedShortcut by remember { mutableStateOf<String?>(null) }
    var showEditProfile by remember { mutableStateOf(false) }
    val profile by repository.profile.collectAsState()
    val context = LocalContext.current
    LaunchedEffect(initialSetting) {
        if (!initialSetting.isNullOrBlank()) {
            selectedSetting = initialSetting
            onInitialSettingConsumed()
        }
    }
    selectedSetting?.let { setting ->
        if (setting == "Support Center") SupportCenterPage(repository, onBack = { selectedSetting = null })
        else if (setting == "Copyright Studio") CopyrightStudioPage(repository, onBack = { selectedSetting = null }, onOpenProfile = onUserProfileClick)
        else {
            BackHandler { selectedSetting = null }
            SocialSettingsPage(repository, profile, setting, onBack = { selectedSetting = null })
        }
        return
    }
    selectedShortcut?.let { shortcut ->
        BackHandler { selectedShortcut = null }
        ShortcutScreen(repository, shortcut, onBack = { selectedShortcut = null })
        return
    }
    if (showEditProfile) {
        BackHandler { showEditProfile = false }
        EditProfilePage(repository, profile, onBack = { showEditProfile = false })
        return
    }
    Column(
        modifier = Modifier.fillMaxSize().background(Color.White).statusBarsPadding()
            .verticalScroll(rememberScrollState()).navigationBarsPadding()
    ) {
        Surface(
            modifier = Modifier.fillMaxWidth(),
            color = Color.White,
            shape = RoundedCornerShape(0.dp),
            tonalElevation = 0.dp
        ) {
            Column {
                Box(Modifier.fillMaxWidth().height(150.dp)) {
                    TiwiAvatar(profile?.coverUrl, R.drawable.img_tiwi_cover, Modifier.fillMaxWidth().height(110.dp), ContentScale.Crop)
                    TiwiAvatar(
                        avatarUrl,
                        R.drawable.img_tiwi_avatar_1,
                        Modifier.align(Alignment.BottomStart).padding(start = 16.dp).size(82.dp).clip(CircleShape),
                        ContentScale.Crop
                    )
                }
                Row(Modifier.fillMaxWidth().clickable(onClick = onProfileClick).padding(horizontal = 16.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text(name, style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold))
                        Text("@${profile?.username.orEmpty()}  ·  View your profile", style = MaterialTheme.typography.labelMedium, color = Color(0xFF667085))
                    }
                    FilledTonalIconButton(
                        onClick = { showEditProfile = true },
                        modifier = Modifier.size(34.dp),
                        colors = IconButtonDefaults.filledTonalIconButtonColors(containerColor = Color(0xFFF0F2F5), contentColor = Color(0xFF344054))
                    ) { Icon(Icons.Default.Edit, "Edit profile", modifier = Modifier.size(18.dp)) }
                }
                HorizontalDivider(color = Color(0xFFEEF0F3))
                Row(Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 11.dp), horizontalArrangement = Arrangement.SpaceAround) {
                    listOf(
                        "Posts" to (profile?.postCount ?: 0),
                        "Followers" to (profile?.followerCount ?: 0),
                        "Following" to (profile?.followingCount ?: 0)
                    ).forEach { (label, count) -> Column(horizontalAlignment = Alignment.CenterHorizontally) { Text(count.toString(), fontWeight = FontWeight.ExtraBold, fontSize = 14.sp); Text(label, color = Color(0xFF667085), fontSize = 10.sp) } }
                }
            }
        }

        Spacer(modifier = Modifier.height(12.dp))
        Text("Profile tools", color = Color(0xFF667085), fontSize = 11.sp, fontWeight = FontWeight.Black, modifier = Modifier.padding(start = 16.dp, bottom = 7.dp))

        Surface(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp).clickable { selectedSetting = "Verified badge" },
            color = Color(0xFFEAF2FF),
            shape = RoundedCornerShape(14.dp),
            tonalElevation = 0.dp
        ) {
            Row(Modifier.padding(horizontal = 16.dp, vertical = 11.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(38.dp).background(Color.White, RoundedCornerShape(11.dp)), contentAlignment = Alignment.Center) { VerifiedBadge("blue", 21.dp) }
                Column(Modifier.weight(1f).padding(start = 11.dp)) {
                    Text("Get verified", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    Text("Identity and account protection", color = Color(0xFF475467), fontSize = 11.sp)
                }
                Icon(Icons.Default.ChevronRight, null, tint = Color(0xFF2457A7))
            }
        }

        Spacer(modifier = Modifier.height(8.dp))
        Surface(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp).clickable { showEditProfile = true },
            color = Color(0xFFF4F0FF),
            shape = RoundedCornerShape(14.dp),
            tonalElevation = 0.dp
        ) {
            Row(Modifier.padding(horizontal = 16.dp, vertical = 11.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(38.dp).background(Color.White, RoundedCornerShape(11.dp)), contentAlignment = Alignment.Center) { Icon(Icons.Outlined.AutoAwesome, null, tint = Color(0xFF7F56D9)) }
                Column(Modifier.weight(1f).padding(start = 11.dp)) {
                    Text("Customise your profile", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color(0xFF2D1B69))
                    Text("Avatar decoration and profile effects", color = Color(0xFF625B71), fontSize = 11.sp)
                }
                Icon(Icons.Default.ChevronRight, "Open Edit profile", tint = Color(0xFF7F56D9), modifier = Modifier.size(21.dp))
            }
        }
        Spacer(modifier = Modifier.height(13.dp))

        Column(modifier = Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Column {
                Text("Shortcuts", style = MaterialTheme.typography.titleSmall, color = Color(0xFF667085), fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 16.dp))
                Spacer(modifier = Modifier.height(7.dp))
                val shortcuts = listOf(
                    Triple("Saved", Icons.Default.Bookmark, TiwiPurple),
                    Triple("Memories", Icons.Default.History, TiwiBlue),
                    Triple("Groups", Icons.Default.Group, TiwiPink)
                )
                Column(verticalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(horizontal = 12.dp)) {
                    shortcuts.chunked(3).forEach { shortcutRow ->
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            shortcutRow.forEach { shortcut ->
                                Surface(
                                    modifier = Modifier.weight(1f).height(76.dp).clickable { selectedShortcut = shortcut.first },
                                    color = Color.White,
                                    shape = RoundedCornerShape(12.dp),
                                    border = BorderStroke(.7.dp, Color(0xFFE7EAF0)),
                                    tonalElevation = 0.dp
                                ) {
                                    Column(Modifier.padding(10.dp), verticalArrangement = Arrangement.Center) {
                                        Box(Modifier.size(30.dp).background(shortcut.third.copy(alpha = .12f), RoundedCornerShape(10.dp)), contentAlignment = Alignment.Center) { Icon(shortcut.second, null, tint = shortcut.third, modifier = Modifier.size(18.dp)) }
                                        Text(shortcut.first, Modifier.padding(top = 7.dp), fontWeight = FontWeight.Bold, fontSize = 11.sp)
                                    }
                                }
                            }
                            if (shortcutRow.size == 1) Spacer(Modifier.weight(1f))
                        }
                    }
                }
            }
            
            Column {
                Text("Settings & support", style = MaterialTheme.typography.titleSmall, color = Color(0xFF667085), fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 16.dp))
                Spacer(modifier = Modifier.height(8.dp))
                val settings = listOf(
                    Pair("Account Center", Icons.Default.AccountCircle),
                    Pair("Account Settings", Icons.Default.Settings),
                    Pair("Privacy Center", Icons.Default.Security),
                    Pair("Notifications", Icons.Default.Notifications),
                    Pair("Copyright Studio", Icons.Default.Gavel),
                    Pair("Support Center", Icons.Default.SupportAgent),
                    Pair("Help & Support", Icons.Default.Help),
                    Pair("About Tiwi", Icons.Default.Info)
                )
                Surface(color = Color.White, shape = RoundedCornerShape(18.dp), tonalElevation = 0.dp) {
                    Column {
                    settings.forEachIndexed { index, item ->
                        ListItem(
                            headlineContent = { Text(item.first, fontWeight = FontWeight.SemiBold, fontSize = 14.sp) },
                            leadingContent = { Box(Modifier.size(36.dp).background(Color(0xFFF0F2F5), RoundedCornerShape(11.dp)), contentAlignment = Alignment.Center) { Icon(item.second, contentDescription = null, tint = Color(0xFF475467), modifier = Modifier.size(20.dp)) } },
                            trailingContent = { Icon(Icons.Default.ChevronRight, contentDescription = null, tint = Color(0xFF98A2B3)) },
                            colors = ListItemDefaults.colors(containerColor = Color.White),
                            modifier = Modifier.clickable { selectedSetting = item.first }
                        )
                        if (index < settings.lastIndex) HorizontalDivider(Modifier.padding(start = 64.dp), color = Color(0xFFF0F1F3))
                    }
                    }
                }
            }
            
            Column {
                Button(
                    onClick = onLogout,
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFFEDEB), contentColor = Color(0xFFB42318)),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Text("Log Out", fontWeight = FontWeight.Bold)
                }
                Spacer(modifier = Modifier.height(32.dp))
            }
        }
    }
}

@Composable
private fun CopyrightStudioPage(repository: SocialRepository, onBack: () -> Unit, onOpenProfile: (String) -> Unit) {
    val scope = rememberTiwiCoroutineScope()
    var studio by remember { mutableStateOf<SocialCopyrightStudio?>(null) }
    var loading by remember { mutableStateOf(true) }
    var scanning by remember { mutableStateOf(false) }
    var selectedClaim by remember { mutableStateOf<SocialCopyrightClaim?>(null) }
    var selectedClaimIsOwner by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }
    fun refresh() {
        scope.launch {
            loading = true
            runCatching { repository.copyrightStudio() }
                .onSuccess { studio = it }
                .onFailure { message = it.message ?: "Copyright Studio could not be loaded" }
            loading = false
        }
    }
    LaunchedEffect(Unit) { refresh() }
    selectedClaim?.let { claim ->
        CopyrightClaimActionPage(
            claim = claim,
            ownerCanAct = selectedClaimIsOwner,
            onBack = { selectedClaim = null },
            onOpenProfile = onOpenProfile,
            onAction = { action ->
                scope.launch {
                    runCatching { repository.actOnCopyrightClaim(claim.id, action) }
                        .onSuccess { selectedClaim = null; refresh() }
                        .onFailure { message = it.message ?: "Copyright action failed"; selectedClaim = null }
                }
            }
        )
        return
    }
    BackHandler(onBack = onBack)
    Column(Modifier.fillMaxSize().background(Color.White).statusBarsPadding()) {
        Row(Modifier.fillMaxWidth().height(52.dp).padding(horizontal = 3.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") }
            Column(Modifier.weight(1f)) {
                Text("Copyright Studio", fontWeight = FontWeight.Black, fontSize = 19.sp)
                Text("Protect your audio and video", color = Color(0xFF667085), fontSize = 10.sp)
            }
            IconButton(onClick = ::refresh) { Icon(Icons.Default.Refresh, "Refresh", tint = TiwiBlue, modifier = Modifier.size(20.dp)) }
        }
        HorizontalDivider(color = Color(0xFFE9ECF1))
        if (loading && studio == null) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(Modifier.size(26.dp), strokeWidth = 2.dp) }
            return@Column
        }
        val data = studio ?: SocialCopyrightStudio()
        Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).navigationBarsPadding().padding(horizontal = 14.dp, vertical = 12.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Surface(color = Color(0xFFF6F8FC), shape = RoundedCornerShape(14.dp), tonalElevation = 0.dp, modifier = Modifier.fillMaxWidth()) {
                Column(Modifier.padding(13.dp)) {
                    Text("Your protected library", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    Text("We scan decoded audio, not filenames or upload metadata. Existing posts can be indexed below.", color = Color(0xFF475467), fontSize = 11.sp, lineHeight = 15.sp, modifier = Modifier.padding(top = 3.dp))
                    Button(
                        onClick = {
                            scanning = true
                            scope.launch {
                                runCatching { repository.scanCopyrightLibrary() }
                                    .onSuccess { studio = it; message = "Your existing audio and video library was scanned." }
                                    .onFailure { message = it.message ?: "Copyright scan failed" }
                                scanning = false
                            }
                        }, enabled = !scanning,
                        modifier = Modifier.padding(top = 10.dp).height(34.dp),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 0.dp), shape = RoundedCornerShape(9.dp)
                    ) { if (scanning) CircularProgressIndicator(Modifier.size(13.dp), strokeWidth = 1.6.dp, color = Color.White) else Icon(Icons.Default.Radar, null, Modifier.size(15.dp)); Spacer(Modifier.width(6.dp)); Text(if (scanning) "Scanning…" else "Scan existing media", fontSize = 11.sp, fontWeight = FontWeight.Bold) }
                }
            }
            message?.let { Text(it, color = Color(0xFF155EEF), fontSize = 11.sp, modifier = Modifier.fillMaxWidth().padding(horizontal = 3.dp)) }

            Text("Protected media", fontWeight = FontWeight.Black, fontSize = 15.sp, modifier = Modifier.padding(top = 3.dp))
            if (data.references.isEmpty()) {
                Text("No protected media yet. Scan your existing posts, then keep protection on for each item you own.", color = Color(0xFF667085), fontSize = 11.sp, lineHeight = 15.sp, modifier = Modifier.padding(bottom = 3.dp))
            }
            data.references.forEach { reference ->
                Surface(color = Color.White, shape = RoundedCornerShape(13.dp), border = BorderStroke(.7.dp, Color(0xFFE6EAF0)), tonalElevation = 0.dp, modifier = Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(horizontal = 12.dp, vertical = 10.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(Modifier.size(31.dp).background(TiwiBlue.copy(alpha = .1f), CircleShape), contentAlignment = Alignment.Center) { Icon(if (reference.mediaType == "video") Icons.Default.VideoLibrary else Icons.Default.MusicNote, null, tint = TiwiBlue, modifier = Modifier.size(17.dp)) }
                            Column(Modifier.weight(1f).padding(start = 9.dp)) {
                                Text(reference.title.ifBlank { "Protected media" }, fontWeight = FontWeight.Bold, fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                Text("${reference.useCount} detected uses · ${reference.mediaType}", color = Color(0xFF667085), fontSize = 10.sp)
                            }
                            Switch(checked = reference.protectionEnabled, onCheckedChange = { enabled ->
                                scope.launch { runCatching { repository.updateCopyrightReference(reference.id, protectionEnabled = enabled) }.onSuccess { refresh() }.onFailure { message = it.message } }
                            }, modifier = Modifier.height(26.dp))
                        }
                        Row(Modifier.fillMaxWidth().padding(top = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f)) { Text("Remove matched media", fontWeight = FontWeight.SemiBold, fontSize = 11.sp); Text("Off by default · removes after a two-minute notice", color = Color(0xFF667085), fontSize = 9.sp, lineHeight = 11.sp) }
                            Switch(checked = reference.autoRemoveMatches, onCheckedChange = { enabled ->
                                scope.launch { runCatching { repository.updateCopyrightReference(reference.id, autoRemoveMatches = enabled) }.onSuccess { refresh() }.onFailure { message = it.message } }
                            }, modifier = Modifier.height(25.dp))
                        }
                    }
                }
            }

            Text("Matches on your protected media", fontWeight = FontWeight.Black, fontSize = 15.sp, modifier = Modifier.padding(top = 6.dp))
            if (data.ownerClaims.isEmpty()) Text("No matched uploads yet.", color = Color(0xFF667085), fontSize = 11.sp)
            data.ownerClaims.forEach { claim -> CopyrightClaimRow(claim, "Review action", onClick = { selectedClaimIsOwner = true; selectedClaim = claim }) }

            Text("Copyright notices on your uploads", fontWeight = FontWeight.Black, fontSize = 15.sp, modifier = Modifier.padding(top = 6.dp))
            if (data.receivedClaims.isEmpty()) Text("No copyright notices.", color = Color(0xFF667085), fontSize = 11.sp)
            data.receivedClaims.forEach { claim -> CopyrightClaimRow(claim, "View notice", onClick = { selectedClaimIsOwner = false; selectedClaim = claim }) }
            Spacer(Modifier.height(10.dp))
        }
    }
}

@Composable
private fun CopyrightClaimRow(claim: SocialCopyrightClaim, label: String, onClick: () -> Unit) {
    val owner = claim.reference?.owner?.name?.ifBlank { null } ?: "Rights owner"
    Surface(color = Color.White, shape = RoundedCornerShape(13.dp), border = BorderStroke(.7.dp, Color(0xFFE6EAF0)), tonalElevation = 0.dp, modifier = Modifier.fillMaxWidth().clickable(onClick = onClick)) {
        Row(Modifier.padding(horizontal = 12.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(30.dp).background(Color(0xFFFFF1F0), CircleShape), contentAlignment = Alignment.Center) { Icon(Icons.Default.Copyright, null, tint = Color(0xFFD92D20), modifier = Modifier.size(16.dp)) }
            Column(Modifier.weight(1f).padding(start = 9.dp)) {
                Text(claim.reference?.title?.ifBlank { "Protected media" } ?: "Protected media", fontWeight = FontWeight.Bold, fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text("$owner · ${claim.status.replace('_', ' ')}", color = Color(0xFF667085), fontSize = 10.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
            Text(label, color = TiwiBlue, fontWeight = FontWeight.Bold, fontSize = 10.sp)
        }
    }
}

@Composable
private fun CopyrightClaimActionPage(claim: SocialCopyrightClaim, ownerCanAct: Boolean, onBack: () -> Unit, onOpenProfile: (String) -> Unit, onAction: (String) -> Unit) {
    var working by remember { mutableStateOf(false) }
    fun act(action: String) { if (!working) { working = true; onAction(action) } }
    BackHandler(onBack = onBack)
    Column(Modifier.fillMaxSize().background(Color.White).statusBarsPadding().navigationBarsPadding()) {
        Row(Modifier.fillMaxWidth().height(52.dp).padding(horizontal = 3.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") }
            Text("Copyright details", fontWeight = FontWeight.Black, fontSize = 19.sp)
        }
        HorizontalDivider(color = Color(0xFFE9ECF1))
        Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(claim.reference?.title?.ifBlank { "Protected media" } ?: "Protected media", fontWeight = FontWeight.Black, fontSize = 17.sp)
            Text("Status: ${claim.status.replace('_', ' ')}", color = Color(0xFF475467), fontSize = 12.sp)
            Text("Owner: ${claim.reference?.owner?.name ?: "Rights owner"}", color = Color(0xFF475467), fontSize = 12.sp)
            claim.reference?.ownerId?.takeIf { it.isNotBlank() }?.let { ownerId ->
                Text("View rights owner profile", color = TiwiBlue, fontWeight = FontWeight.Bold, fontSize = 11.sp, modifier = Modifier.clickable { onOpenProfile(ownerId) })
            }
            claim.removeAfter?.let { Text("Automatic removal is scheduled after the notice window.", color = Color(0xFFD92D20), fontSize = 11.sp) }
            HorizontalDivider(color = Color(0xFFE9ECF1))
            // The app only shows owner actions when the reference belongs to the current account. A received notice is informational.
            if (ownerCanAct) {
                Text("Owner actions", fontWeight = FontWeight.Black, fontSize = 15.sp)
                Text("Remove this matched post immediately, release the claim, or block this person from your Social account. Platform-wide account suspension is reviewed by Tiwi administrators.", color = Color(0xFF667085), fontSize = 11.sp, lineHeight = 15.sp)
                Button(onClick = { act("takedown") }, enabled = !working, modifier = Modifier.fillMaxWidth().height(40.dp), shape = RoundedCornerShape(10.dp)) { Text("Take down matched post", fontSize = 12.sp, fontWeight = FontWeight.Bold) }
                OutlinedButton(onClick = { act("release") }, enabled = !working, modifier = Modifier.fillMaxWidth().height(40.dp), shape = RoundedCornerShape(10.dp)) { Text("Release claim", fontSize = 12.sp, fontWeight = FontWeight.Bold) }
                OutlinedButton(onClick = { act("block_account") }, enabled = !working, modifier = Modifier.fillMaxWidth().height(40.dp), shape = RoundedCornerShape(10.dp), colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFD92D20))) { Text("Block this user from my Social", fontSize = 12.sp, fontWeight = FontWeight.Bold) }
            } else {
                Text("This upload matched protected content. Only the rights owner can change protection or take down settings. You can review the owner and status here.", color = Color(0xFF667085), fontSize = 12.sp, lineHeight = 16.sp)
            }
        }
    }
}

@Composable
private fun SupportCenterPage(repository: SocialRepository, onBack: () -> Unit) {
    val notifications by repository.notifications.collectAsState()
    val scope = rememberTiwiCoroutineScope()
    var selected by remember { mutableStateOf<SocialNotification?>(null) }
    val rows = remember(notifications) {
        notifications.filter { item ->
            item.metadata["destination"]?.toString() == "support_center" ||
                item.type.startsWith("report_") || item.type.startsWith("verification_")
        }
    }
    LaunchedEffect(Unit) { runCatching { repository.refreshNotifications() } }
    BackHandler {
        if (selected != null) selected = null else onBack()
    }
    Column(Modifier.fillMaxSize().background(Color.White).statusBarsPadding()) {
        Row(Modifier.fillMaxWidth().height(50.dp).padding(horizontal = 2.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = { if (selected != null) selected = null else onBack() }) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") }
            Text(if (selected == null) "Support Center" else "Support message", fontWeight = FontWeight.Black, fontSize = 19.sp)
        }
        HorizontalDivider(thickness = .5.dp, color = Color(0xFFE4E7EC))
        val active = selected
        if (active != null) {
            Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 18.dp, vertical = 20.dp)) {
                Image(painterResource(R.drawable.tiwi_app_icon), null, Modifier.size(54.dp).clip(CircleShape), contentScale = ContentScale.Crop)
                Text(active.title.ifBlank { "Tiwi Support" }, fontWeight = FontWeight.Black, fontSize = 21.sp, lineHeight = 26.sp, modifier = Modifier.padding(top = 14.dp))
                Text(relativePostTime(active.createdAt), color = Color(0xFF667085), fontSize = 11.sp, modifier = Modifier.padding(top = 4.dp))
                Text(active.message, fontSize = 14.sp, lineHeight = 21.sp, color = Color(0xFF1D2939), modifier = Modifier.padding(top = 18.dp))
                HorizontalDivider(Modifier.padding(vertical = 20.dp), color = Color(0xFFE4E7EC))
                Row(verticalAlignment = Alignment.Top) {
                    Icon(Icons.Outlined.Lock, null, tint = Color(0xFF667085), modifier = Modifier.size(18.dp))
                    Text(
                        "This is a private system message from Tiwi Team. Reports stay confidential and replies are not available here.",
                        color = Color(0xFF667085),
                        fontSize = 12.sp,
                        lineHeight = 17.sp,
                        modifier = Modifier.padding(start = 9.dp)
                    )
                }
            }
        } else if (rows.isEmpty()) {
            Column(Modifier.fillMaxSize(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                Icon(Icons.Outlined.SupportAgent, null, tint = Color(0xFF98A2B3), modifier = Modifier.size(46.dp))
                Text("No support messages", fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 10.dp))
                Text("Report and verification decisions will appear here.", color = Color(0xFF667085), fontSize = 12.sp, modifier = Modifier.padding(top = 4.dp))
            }
        } else LazyColumn(Modifier.fillMaxSize()) {
            item {
                Text("Updates from Tiwi Team", color = Color(0xFF667085), fontSize = 12.sp, modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp))
            }
            items(rows, key = { "support-${it.id}" }) { item ->
                Row(
                    Modifier.fillMaxWidth().background(if (item.status == "unread") Color(0xFFF2F7FF) else Color.White).clickable {
                        selected = if (item.status == "unread") item.copy(status = "read") else item
                        if (item.status == "unread") scope.launch { runCatching { repository.markNotificationRead(item.id) } }
                    }.padding(horizontal = 15.dp, vertical = 11.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Image(painterResource(R.drawable.tiwi_app_icon), null, Modifier.size(43.dp).clip(CircleShape), contentScale = ContentScale.Crop)
                    Column(Modifier.weight(1f).padding(horizontal = 10.dp)) {
                        Text(item.title.ifBlank { "Tiwi Support" }, fontWeight = FontWeight.Bold, fontSize = 13.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Text(item.message, color = Color(0xFF475467), fontSize = 11.sp, lineHeight = 14.sp, maxLines = 2, overflow = TextOverflow.Ellipsis)
                    }
                    if (item.status == "unread") Box(Modifier.size(8.dp).background(Color(0xFFE11900), CircleShape))
                }
                HorizontalDivider(Modifier.padding(start = 68.dp), thickness = .5.dp, color = Color(0xFFF0F1F3))
            }
        }
    }
}

@Composable
private fun ShortcutScreen(repository: SocialRepository, shortcut: String, onBack: () -> Unit) {
    if (shortcut == "Groups") {
        GroupShortcutContent(repository, onBack)
        return
    }
    if (shortcut == "Memories") {
        var selectedMemory by remember { mutableStateOf<SocialStory?>(null) }
        val user by repository.currentUser.collectAsState()
        val profile by repository.profile.collectAsState()
        selectedMemory?.let { story ->
            TiwiStoryViewerPage(
                repository,
                listOf(SocialStoryGroup(story.authorId, story.author, story.authorProfile, listOf(story), unseenCount = 0, latestAt = story.createdAt)),
                story.authorId,
                onClose = { selectedMemory = null }
            )
            return
        }
        TiwiStoryMemoriesPage(repository, onBack = onBack, onOpen = { selectedMemory = it })
        return
    }
    val scope = rememberTiwiCoroutineScope()
    val context = LocalContext.current
    var loading by remember(shortcut) { mutableStateOf(true) }
    var posts by remember(shortcut) { mutableStateOf<List<SocialPost>>(emptyList()) }
    LaunchedEffect(shortcut) {
        if (shortcut != "Groups") {
            loading = true
            runCatching { if (shortcut == "Saved") repository.savedPosts() else repository.memories() }
                .onSuccess { posts = it }.onFailure { Toast.makeText(context, it.message ?: "Could not load $shortcut", Toast.LENGTH_LONG).show() }
            loading = false
        }
    }
    Column(Modifier.fillMaxSize().background(Color.White).statusBarsPadding()) {
        Row(Modifier.fillMaxWidth().height(48.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") }
            Text(shortcut, fontWeight = FontWeight.Bold, fontSize = 19.sp)
        }
        HorizontalDivider(color = Color(0xFFE9EAED), thickness = .5.dp)
        when {
            loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(Modifier.size(28.dp), strokeWidth = 2.5.dp) }
            posts.isEmpty() -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { Column(horizontalAlignment = Alignment.CenterHorizontally) { Icon(if (shortcut == "Saved") Icons.Outlined.BookmarkBorder else Icons.Outlined.History, null, tint = Color.Gray, modifier = Modifier.size(44.dp)); Text(if (shortcut == "Saved") "No saved posts yet" else "No memories yet", fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 10.dp)); Text(if (shortcut == "Saved") "Use a post menu to save it here." else "Posts older than 30 days will appear here.", color = Color.Gray, fontSize = 12.sp) } }
            else -> LazyColumn(Modifier.fillMaxSize()) { items(posts, key = { it.id }) { value -> PostCard(toUiPost(value), repository) } }
        }
    }
}

@Composable
private fun GroupShortcutContent(repository: SocialRepository, onBack: () -> Unit) {
    val scope = rememberTiwiCoroutineScope()
    val context = LocalContext.current
    var query by remember { mutableStateOf("") }
    var mineOnly by remember { mutableStateOf(false) }
    var groups by remember { mutableStateOf<List<SocialGroup>>(emptyList()) }
    var selectedGroup by remember { mutableStateOf<SocialGroup?>(null) }
    var members by remember { mutableStateOf<List<SocialGroupMember>>(emptyList()) }
    var groupPosts by remember { mutableStateOf<List<SocialPost>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var showCreate by remember { mutableStateOf(false) }
    var showSettings by remember { mutableStateOf(false) }
    var postText by remember { mutableStateOf("") }

    suspend fun refreshGroups() {
        loading = true
        runCatching { repository.groups(query, mineOnly) }.onSuccess { groups = it }.onFailure { Toast.makeText(context, it.message ?: "Groups could not load", Toast.LENGTH_LONG).show() }
        loading = false
    }
    LaunchedEffect(query, mineOnly) { delay(250); refreshGroups() }
    LaunchedEffect(selectedGroup?.id) {
        val group = selectedGroup ?: return@LaunchedEffect
        runCatching { repository.group(group.id) }.getOrNull()?.let { selectedGroup = it }
        members = runCatching { repository.groupMembers(group.id) }.getOrDefault(emptyList())
        groupPosts = runCatching { repository.groupPosts(group.id) }.getOrDefault(emptyList())
    }
    if (showCreate) {
        BackHandler { showCreate = false }
        GroupEditorPage(
            repository = repository, title = "Create group", initialName = "", initialDescription = "",
            initialPrivacy = "public", initialCoverUrl = null, onBack = { showCreate = false }
        ) { name, description, privacy, coverUrl ->
            scope.launch {
                runCatching { repository.createGroup(name, description, privacy, coverUrl) }
                    .onSuccess { showCreate = false; selectedGroup = it; refreshGroups() }
                    .onFailure { Toast.makeText(context, it.message ?: "Group could not be created", Toast.LENGTH_LONG).show() }
            }
        }
        return
    }
    if (showSettings && selectedGroup != null) {
        val editing = selectedGroup!!
        BackHandler { showSettings = false }
        GroupEditorPage(
            repository = repository, title = "Group settings", initialName = editing.name,
            initialDescription = editing.description.orEmpty(), initialPrivacy = editing.privacy,
            initialCoverUrl = editing.coverUrl, onBack = { showSettings = false }
        ) { name, description, privacy, coverUrl ->
            scope.launch {
                runCatching { repository.updateGroup(editing.id, name, description, privacy, coverUrl) }
                    .onSuccess { showSettings = false; selectedGroup = it }
                    .onFailure { Toast.makeText(context, it.message ?: "Group could not be updated", Toast.LENGTH_LONG).show() }
            }
        }
        return
    }
    val group = selectedGroup
    if (group != null) {
        BackHandler { selectedGroup = null }
        Column(Modifier.fillMaxSize().background(Color.White).statusBarsPadding()) {
            Row(Modifier.fillMaxWidth().height(48.dp).padding(horizontal = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = { selectedGroup = null }) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Groups") }
                Text(group.name, Modifier.weight(1f), fontWeight = FontWeight.Bold, maxLines = 1)
                if (group.viewerRole == "admin") IconButton(onClick = { showSettings = true }) { Icon(Icons.Outlined.Settings, "Group settings") }
            }
            LazyColumn(Modifier.fillMaxSize()) {
                item {
                    Box(Modifier.fillMaxWidth().height(150.dp).background(Color(0xFFEAF3FF))) { if (!group.coverUrl.isNullOrBlank()) AsyncImage(group.coverUrl, null, Modifier.fillMaxSize(), contentScale = ContentScale.Crop); Icon(Icons.Default.Group, null, tint = TiwiBlue, modifier = Modifier.align(Alignment.Center).size(48.dp)) }
                    Column(Modifier.padding(14.dp)) {
                        Text(group.name, fontWeight = FontWeight.ExtraBold, fontSize = 22.sp)
                        Text("${formatCount(group.memberCount)} members • ${group.privacy.replaceFirstChar { it.uppercase() }} group", color = Color.Gray, fontSize = 12.sp)
                        if (!group.description.isNullOrBlank()) Text(group.description, modifier = Modifier.padding(top = 7.dp))
                        Button(onClick = { scope.launch { if (group.viewerJoined) runCatching { repository.leaveGroup(group.id) }.onSuccess { selectedGroup = null; refreshGroups() } else runCatching { repository.joinGroup(group.id) }.onSuccess { selectedGroup = it } } }, modifier = Modifier.fillMaxWidth().padding(top = 10.dp), shape = RoundedCornerShape(8.dp)) { Text(if (group.viewerJoined) "Leave group" else "Join group", fontWeight = FontWeight.Bold) }
                    }
                }
                if (group.viewerJoined) item {
                    Surface(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 5.dp), color = Color.White, border = BorderStroke(1.dp, Color(0xFFE3E6EA)), shape = RoundedCornerShape(12.dp), tonalElevation = 0.dp) {
                        Column(Modifier.padding(12.dp)) { OutlinedTextField(postText, { postText = it }, label = { Text("Write something to the group") }, modifier = Modifier.fillMaxWidth(), minLines = 2); Button(enabled = postText.isNotBlank(), onClick = { val body = postText; postText = ""; scope.launch { runCatching { repository.createPost(body, groupId = group.id) }.onSuccess { groupPosts = listOf(it) + groupPosts }.onFailure { Toast.makeText(context, it.message ?: "Post failed", Toast.LENGTH_LONG).show() } } }, modifier = Modifier.align(Alignment.End).padding(top = 7.dp), shape = RoundedCornerShape(8.dp)) { Text("Post") } }
                    }
                }
                item { Text("Members", fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp)) }
                items(members, key = { "member-${it.id}" }) { member ->
                    Row(Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                        DecoratedAvatar(member.user.avatar, R.drawable.img_tiwi_avatar_1, member.profile?.avatarDecoration, Modifier.size(44.dp)); Column(Modifier.weight(1f).padding(start = 9.dp)) { Text(member.user.name, fontWeight = FontWeight.SemiBold); Text(member.role.replaceFirstChar { it.uppercase() }, color = Color.Gray, fontSize = 11.sp) }
                        if (group.viewerRole == "admin" && member.userId != repository.currentUserId() && member.userId != group.ownerId) {
                            TextButton(onClick = { scope.launch { val next = if (member.role == "member") "editor" else "member"; runCatching { repository.updateGroupMember(group.id, member.userId, next) }.onSuccess { members = repository.groupMembers(group.id) } } }) { Text(if (member.role == "member") "Make editor" else "Make member", fontSize = 11.sp) }
                            IconButton(onClick = { scope.launch { runCatching { repository.updateGroupMember(group.id, member.userId, remove = true) }.onSuccess { members = repository.groupMembers(group.id) } } }) { Icon(Icons.Outlined.PersonRemove, "Remove") }
                        }
                    }
                }
                if (groupPosts.isNotEmpty()) item { Text("Group posts", fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp)) }
                items(groupPosts, key = { "group-post-${it.id}" }) { value -> PostCard(toUiPost(value), repository) }
                item { Spacer(Modifier.navigationBarsPadding().height(16.dp)) }
            }
        }
    } else Column(Modifier.fillMaxSize().background(Color.White).statusBarsPadding()) {
        Row(Modifier.fillMaxWidth().height(52.dp).padding(horizontal = 2.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") }
            Text("Groups", Modifier.weight(1f), fontWeight = FontWeight.ExtraBold, fontSize = 21.sp)
            IconButton(onClick = { showCreate = true }) { Icon(Icons.Default.Add, "Create group", tint = TiwiBlue) }
        }
        HorizontalDivider(color = Color(0xFFE4E7EC), thickness = .5.dp)
        Row(Modifier.fillMaxWidth().padding(10.dp), verticalAlignment = Alignment.CenterVertically) {
            OutlinedTextField(query, { query = it }, placeholder = { Text("Search groups") }, leadingIcon = { Icon(Icons.Default.Search, null) }, singleLine = true, modifier = Modifier.weight(1f), shape = RoundedCornerShape(24.dp))
        }
        Row(Modifier.padding(horizontal = 10.dp), verticalAlignment = Alignment.CenterVertically) { FilterChip(selected = !mineOnly, onClick = { mineOnly = false }, label = { Text("Discover") }); Spacer(Modifier.width(8.dp)); FilterChip(selected = mineOnly, onClick = { mineOnly = true }, label = { Text("Your groups") }) }
        when { loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(Modifier.size(28.dp), strokeWidth = 2.5.dp) }; groups.isEmpty() -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { Text(if (mineOnly) "You haven't joined a group yet" else "No groups found", color = Color.Gray) }; else -> LazyColumn { items(groups, key = { it.id }) { value -> Surface(Modifier.fillMaxWidth().padding(horizontal = 10.dp, vertical = 5.dp).clickable { selectedGroup = value }, color = Color.White, border = BorderStroke(1.dp, Color(0xFFE3E6EA)), shape = RoundedCornerShape(12.dp), tonalElevation = 0.dp) { Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) { Box(Modifier.size(58.dp).background(Color(0xFFEAF3FF), RoundedCornerShape(10.dp)), contentAlignment = Alignment.Center) { if (!value.coverUrl.isNullOrBlank()) AsyncImage(value.coverUrl, null, Modifier.fillMaxSize(), contentScale = ContentScale.Crop) else Icon(Icons.Default.Group, null, tint = TiwiBlue) }; Column(Modifier.weight(1f).padding(start = 11.dp)) { Text(value.name, fontWeight = FontWeight.Bold); Text("${formatCount(value.memberCount)} members • ${value.privacy}", color = Color.Gray, fontSize = 12.sp) }; if (value.viewerJoined) AssistChip(onClick = { selectedGroup = value }, label = { Text("Joined") }) else Icon(Icons.Default.ChevronRight, null) } } } }
        }
    }
}

@Composable
private fun GroupEditorPage(
    repository: SocialRepository,
    title: String,
    initialName: String,
    initialDescription: String,
    initialPrivacy: String,
    initialCoverUrl: String?,
    onBack: () -> Unit,
    onSave: (String, String, String, String?) -> Unit
) {
    val context = LocalContext.current
    val scope = rememberTiwiCoroutineScope()
    var name by remember { mutableStateOf(initialName) }
    var description by remember { mutableStateOf(initialDescription) }
    var privacy by remember { mutableStateOf(initialPrivacy) }
    var coverUrl by remember { mutableStateOf(initialCoverUrl) }
    var busy by remember { mutableStateOf(false) }
    val coverPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        if (uri != null) scope.launch {
            busy = true
            runCatching { repository.uploadMedia(context.contentResolver, uri, "cover").url }
                .onSuccess { coverUrl = it }
                .onFailure { Toast.makeText(context, it.message ?: "Cover upload failed", Toast.LENGTH_LONG).show() }
            busy = false
        }
    }
    Column(Modifier.fillMaxSize().background(Color.White).statusBarsPadding()) {
        Row(Modifier.fillMaxWidth().height(52.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(enabled = !busy, onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") }
            Text(title, Modifier.weight(1f), fontWeight = FontWeight.Bold, fontSize = 19.sp)
            TextButton(enabled = !busy && name.isNotBlank(), onClick = { onSave(name, description, privacy, coverUrl) }) {
                if (busy) CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp) else Text(if (title == "Create group") "Create" else "Save", fontWeight = FontWeight.Bold)
            }
        }
        HorizontalDivider(color = Color(0xFFE4E7EC))
        Column(Modifier.weight(1f).verticalScroll(rememberScrollState())) {
            Box(Modifier.fillMaxWidth().height(190.dp).background(Color(0xFFEAF3FF)).clickable { coverPicker.launch("image/*") }) {
                if (!coverUrl.isNullOrBlank()) AsyncImage(coverUrl, null, Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                else Icon(Icons.Outlined.AddPhotoAlternate, null, tint = TiwiBlue, modifier = Modifier.align(Alignment.Center).size(44.dp))
                Surface(Modifier.align(Alignment.BottomEnd).padding(12.dp), color = Color.White, shape = CircleShape, tonalElevation = 0.dp) {
                    Icon(Icons.Default.CameraAlt, "Change cover", Modifier.padding(10.dp), tint = Color.Black)
                }
            }
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                if (title == "Create group") {
                    Surface(color = Color(0xFFF7F8FA), shape = RoundedCornerShape(12.dp), border = BorderStroke(1.dp, Color(0xFFE4E7EC)), tonalElevation = 0.dp) {
                        Row(Modifier.padding(13.dp), verticalAlignment = Alignment.CenterVertically) {
                            Box(Modifier.size(44.dp).background(Color(0xFFE7F0FF), CircleShape), contentAlignment = Alignment.Center) { Icon(Icons.Outlined.Groups, null, tint = TiwiBlue) }
                            Column(Modifier.padding(start = 11.dp)) {
                                Text("Build your community", fontWeight = FontWeight.Bold)
                                Text("Choose a name, cover and privacy. You can invite people after creating the group.", color = Color.Gray, fontSize = 12.sp, lineHeight = 16.sp)
                            }
                        }
                    }
                }
                Text("Group details", fontWeight = FontWeight.Bold, fontSize = 17.sp)
                OutlinedTextField(name, { name = it.take(120) }, label = { Text("Group name") }, supportingText = { Text("${name.length}/120") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(description, { description = it.take(2000) }, label = { Text("Description") }, supportingText = { Text("Tell people what this group is about") }, minLines = 4, modifier = Modifier.fillMaxWidth())
                Text("Privacy", fontWeight = FontWeight.Bold, fontSize = 17.sp)
                listOf(
                    Triple("public", Icons.Outlined.Public, "Public · Anyone can find and view the group"),
                    Triple("private", Icons.Outlined.Lock, "Private · Only members can view group posts")
                ).forEach { option ->
                    Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp)).clickable { privacy = option.first }.padding(vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                        Box(Modifier.size(44.dp).background(Color(0xFFF0F2F5), CircleShape), contentAlignment = Alignment.Center) { Icon(option.second, null) }
                        Text(option.third, Modifier.weight(1f).padding(start = 12.dp), fontWeight = FontWeight.Medium)
                        RadioButton(selected = privacy == option.first, onClick = { privacy = option.first })
                    }
                }
                Text("The server checks your role before every group update, member change and post.", color = Color.Gray, fontSize = 12.sp)
                Spacer(Modifier.navigationBarsPadding().height(20.dp))
            }
        }
    }
}

@Composable
private fun SocialSettingsPage(repository: SocialRepository, profile: SocialProfile?, page: String, onBack: () -> Unit) {
    val scope = rememberTiwiCoroutineScope()
    val context = LocalContext.current
    val currentUser by repository.currentUser.collectAsState()
    val isPrivacy = page == "Privacy Center"
    val editable = page == "Account Settings" || isPrivacy
    var autoplay by remember(profile, page) { mutableStateOf(profile?.preferences?.get("autoplayVideo") as? Boolean ?: true) }
    var autoQuality by remember(profile, page) { mutableStateOf(profile?.preferences?.get("autoQuality") as? Boolean ?: true) }
    var dataSaver by remember(profile, page) { mutableStateOf(profile?.preferences?.get("dataSaver") as? Boolean ?: false) }
    var notifications by remember(profile, page) { mutableStateOf(profile?.preferences?.get("notifications") as? Boolean ?: true) }
    var notificationSound by remember(profile, page) { mutableStateOf(profile?.preferences?.get("notificationSound") as? Boolean ?: true) }
    var privateProfile by remember(profile, page) { mutableStateOf(profile?.privacy?.get("profileVisibility") == "private") }
    var allowMessages by remember(profile, page) { mutableStateOf(profile?.privacy?.get("allowMessages") as? Boolean ?: (profile?.privacy?.get("messagePermission") != "nobody")) }
    var allowCalls by remember(profile, page) { mutableStateOf(profile?.privacy?.get("allowCalls") as? Boolean ?: true) }
    var showActivity by remember(profile, page) { mutableStateOf(profile?.privacy?.get("showActivityStatus") as? Boolean ?: true) }
    var readReceipts by remember(profile, page) { mutableStateOf(profile?.privacy?.get("readReceipts") as? Boolean ?: true) }
    var allowMentions by remember(profile, page) { mutableStateOf(profile?.privacy?.get("allowMentions") as? Boolean ?: true) }
    var tagReview by remember(profile, page) { mutableStateOf(profile?.privacy?.get("tagReview") as? Boolean ?: false) }
    var discoverable by remember(profile, page) { mutableStateOf(profile?.privacy?.get("discoverableByEmail") as? Boolean ?: true) }
    var searchIndexing by remember(profile, page) { mutableStateOf(profile?.privacy?.get("searchEngineIndexing") as? Boolean ?: false) }
    var personalizedAds by remember(profile, page) { mutableStateOf(profile?.privacy?.get("personalizedAds") as? Boolean ?: true) }
    var sensitiveMedia by remember(profile, page) { mutableStateOf(profile?.privacy?.get("showSensitiveMedia") as? Boolean ?: false) }
    var verificationOptions by remember { mutableStateOf<SocialVerificationOptions?>(null) }
    var pendingVerificationPlan by remember { mutableStateOf<SocialVerificationPackage?>(null) }
    var packageBusy by remember { mutableStateOf<String?>(null) }
    var optionsLoading by remember { mutableStateOf(false) }
    var showBlockedUsers by remember { mutableStateOf(false) }

    if (page == "Profile decoration") {
        ProfileDecorationPage(repository, profile, onBack)
        return
    }
    if (page == "Account Center") {
        AccountCenterPage(repository, currentUser, onBack)
        return
    }
    if (showBlockedUsers) {
        BackHandler { showBlockedUsers = false }
        SocialPeoplePage(
            title = "Blocked accounts",
            repository = repository,
            load = { repository.blockedUsers() },
            onBack = { showBlockedUsers = false },
            unblockMode = true,
            emptyText = "You haven't blocked anyone"
        )
        return
    }

    var saving by remember { mutableStateOf(false) }
    LaunchedEffect(page) {
        if (page == "Verified badge") {
            optionsLoading = true
            runCatching { repository.verificationOptions() }
                .onSuccess { verificationOptions = it }
                .onFailure { Toast.makeText(context, it.message ?: "Verification packages could not load", Toast.LENGTH_LONG).show() }
            optionsLoading = false
        }
    }
    Column(Modifier.fillMaxSize().background(Color.White).statusBarsPadding()) {
        Row(Modifier.fillMaxWidth().height(48.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack, modifier = Modifier.size(44.dp)) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back", modifier = Modifier.size(22.dp)) }
            Text(page, fontWeight = FontWeight.Bold, fontSize = 18.sp)
        }
        Column(Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(horizontal = 14.dp, vertical = 10.dp)) {
            when {
                page == "Account Settings" -> Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Playback", fontWeight = FontWeight.Bold, color = Color.Gray)
                    SettingSwitch("Autoplay videos", autoplay) { autoplay = it }
                    SettingSwitch("Automatic video quality", autoQuality) { autoQuality = it }
                    SettingSwitch("Data saver", dataSaver) { dataSaver = it }
                    Text("Notifications", fontWeight = FontWeight.Bold, color = Color.Gray, modifier = Modifier.padding(top = 8.dp))
                    SettingSwitch("Activity notifications", notifications) { notifications = it }
                    SettingSwitch("Notification sounds", notificationSound) { notificationSound = it }
                    if (!NotificationManagerCompat.from(context).areNotificationsEnabled()) {
                        Row(
                            Modifier.fillMaxWidth().clip(RoundedCornerShape(9.dp)).background(Color(0xFFFFF4E5)).clickable {
                                context.startActivity(Intent(android.provider.Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply {
                                    putExtra(android.provider.Settings.EXTRA_APP_PACKAGE, context.packageName)
                                })
                            }.padding(horizontal = 11.dp, vertical = 10.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Outlined.NotificationsOff, null, tint = Color(0xFFB54708), modifier = Modifier.size(20.dp))
                            Column(Modifier.weight(1f).padding(start = 9.dp)) {
                                Text("Android notifications are off", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                Text("Turn them on to hear calls, messages and post alerts.", color = Color(0xFF7A2E0E), fontSize = 11.sp)
                            }
                            Icon(Icons.Default.ChevronRight, null, tint = Color(0xFFB54708))
                        }
                    }
                }
                isPrivacy -> Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Audience and visibility", fontWeight = FontWeight.Bold, color = Color.Gray)
                    SettingSwitch("Private profile", privateProfile) { privateProfile = it }
                    SettingSwitch("Find me by email", discoverable) { discoverable = it }
                    SettingSwitch("Show profile in search engines", searchIndexing) { searchIndexing = it }
                    Text("How people interact with you", fontWeight = FontWeight.Bold, color = Color.Gray, modifier = Modifier.padding(top = 8.dp))
                    SettingSwitch("Allow messages", allowMessages) { allowMessages = it }
                    SettingSwitch("Allow audio/video calls", allowCalls) { allowCalls = it }
                    SettingSwitch("Show active status", showActivity) { showActivity = it }
                    SettingSwitch("Read receipts", readReceipts) { readReceipts = it }
                    SettingSwitch("Allow mentions", allowMentions) { allowMentions = it }
                    SettingSwitch("Review tags before showing", tagReview) { tagReview = it }
                    Row(
                        Modifier.fillMaxWidth().clip(RoundedCornerShape(9.dp)).clickable { showBlockedUsers = true }.padding(horizontal = 4.dp, vertical = 9.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Outlined.Block, null, tint = Color(0xFFB42318), modifier = Modifier.size(21.dp))
                        Column(Modifier.weight(1f).padding(start = 10.dp)) {
                            Text("Blocked accounts", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            Text("Review and unblock people", color = Color(0xFF667085), fontSize = 10.sp)
                        }
                        Icon(Icons.Default.ChevronRight, null, tint = Color(0xFF98A2B3), modifier = Modifier.size(19.dp))
                    }
                    Text("Content and data", fontWeight = FontWeight.Bold, color = Color.Gray, modifier = Modifier.padding(top = 8.dp))
                    SettingSwitch("Show sensitive media", sensitiveMedia) { sensitiveMedia = it }
                    SettingSwitch("Personalized ads", personalizedAds) { personalizedAds = it }
                }
                page == "Verified badge" -> Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) { VerifiedBadge(profile?.badgeType, 34.dp); Column(Modifier.padding(start = 11.dp)) { Text("Verification for Tiwi", fontWeight = FontWeight.Bold, fontSize = 20.sp); Text(if (profile?.verified == true) "Your ${profile.badgeType} badge is active" else "Choose a plan or apply as notable", color = Color.Gray) } }
                    Text("Blue badge subscriptions", fontWeight = FontWeight.Bold, color = Color.Gray, fontSize = 13.sp)
                    if (optionsLoading) Box(Modifier.fillMaxWidth().height(100.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator(Modifier.size(28.dp), strokeWidth = 2.5.dp) }
                    val options = verificationOptions
                    if (options != null) {
                        options.packages.forEach { plan ->
                            VerificationPackageCard(plan, options, packageBusy == plan.id, plan.notableOnly || options.gateways.isNotEmpty()) { pendingVerificationPlan = plan }
                        }
                        Text("Prices use Tiwlo's live currency settings. Blue badges activate after confirmed payment. Gold badges are never sold and require administrator review.", color = Color.Gray, fontSize = 11.sp, lineHeight = 16.sp)
                    }
                }
                page == "Help & Support" -> Text("For account and app support, use the support contact on tiwlo.com.")
                else -> Text("Tiwi Social connects your real Tiwlo account, feed, reels, messages and calls.")
            }
        }
        if (editable) Button(
            enabled = !saving,
            onClick = {
                scope.launch {
                    saving = true
                    val input = if (isPrivacy) mapOf(
                        "privacy" to (profile?.privacy.orEmpty() + mapOf(
                            "profileVisibility" to if (privateProfile) "private" else "public",
                            "allowMessages" to allowMessages,
                            "messagePermission" to if (allowMessages) "everyone" else "nobody",
                            "allowCalls" to allowCalls,
                            "showActivityStatus" to showActivity,
                            "readReceipts" to readReceipts,
                            "allowMentions" to allowMentions,
                            "tagReview" to tagReview,
                            "discoverableByEmail" to discoverable,
                            "searchEngineIndexing" to searchIndexing,
                            "personalizedAds" to personalizedAds,
                            "showSensitiveMedia" to sensitiveMedia
                        ))
                    ) else mapOf(
                        "preferences" to (profile?.preferences.orEmpty() + mapOf("autoplayVideo" to autoplay, "autoQuality" to autoQuality, "dataSaver" to dataSaver, "notifications" to notifications, "notificationSound" to notificationSound))
                    )
                    runCatching { repository.updateProfile(input) }
                        .onSuccess { onBack() }
                        .onFailure { Toast.makeText(context, it.message ?: "Settings failed", Toast.LENGTH_SHORT).show() }
                    saving = false
                }
            },
            modifier = Modifier.fillMaxWidth().padding(14.dp),
            shape = RoundedCornerShape(8.dp),
            colors = ButtonDefaults.buttonColors(containerColor = TiwiBlue)
        ) { if (saving) CircularProgressIndicator(Modifier.size(18.dp), color = Color.White, strokeWidth = 2.dp) else Text("Save changes", fontWeight = FontWeight.Bold) }
    }
    val invoicePlan = pendingVerificationPlan
    val invoiceOptions = verificationOptions
    if (invoicePlan != null && invoiceOptions != null) VerificationInvoiceSheet(invoicePlan, invoiceOptions, packageBusy == invoicePlan.id, onDismiss = { pendingVerificationPlan = null }) { provider ->
        scope.launch {
            packageBusy = invoicePlan.id
            runCatching { repository.startVerificationCheckout(invoicePlan.id, provider, invoiceOptions.currency) }
                .onSuccess { checkout ->
                    pendingVerificationPlan = null
                    if (!checkout.paymentUrl.isNullOrBlank()) context.startActivity(Intent(Intent.ACTION_VIEW, android.net.Uri.parse(checkout.paymentUrl)))
                    else Toast.makeText(context, checkout.message ?: "Application submitted", Toast.LENGTH_LONG).show()
                }
                .onFailure { Toast.makeText(context, it.message ?: "Checkout failed", Toast.LENGTH_LONG).show() }
            packageBusy = null
        }
    }
}

@Composable
private fun AccountCenterPage(repository: SocialRepository, user: SocialUser?, onBack: () -> Unit) {
    val scope = rememberTiwiCoroutineScope()
    val context = LocalContext.current
    var section by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    var exportJson by remember { mutableStateOf<String?>(null) }
    val exportLauncher = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("application/json")) { uri ->
        val value = exportJson
        if (uri != null && value != null) runCatching { context.contentResolver.openOutputStream(uri)?.bufferedWriter()?.use { it.write(value) } }
            .onSuccess { Toast.makeText(context, "Your information was downloaded", Toast.LENGTH_LONG).show() }
            .onFailure { Toast.makeText(context, it.message ?: "Download failed", Toast.LENGTH_LONG).show() }
        exportJson = null; busy = false
    }
    var name by remember(user?.id, user?.name) { mutableStateOf(user?.name.orEmpty()) }
    var currentPassword by remember { mutableStateOf("") }
    var newPassword by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var billingName by remember(user?.id) { mutableStateOf(user?.billingName.orEmpty()) }
    var phone by remember(user?.id) { mutableStateOf(user?.phone.orEmpty()) }
    var mobileCountryCode by remember(user?.id) { mutableStateOf(user?.mobileCountryCode.orEmpty()) }
    var country by remember(user?.id) { mutableStateOf(user?.country.orEmpty()) }
    var address by remember(user?.id) { mutableStateOf(user?.addressLine1.orEmpty()) }
    var city by remember(user?.id) { mutableStateOf(user?.city.orEmpty()) }
    var state by remember(user?.id) { mutableStateOf(user?.state.orEmpty()) }
    var postalCode by remember(user?.id) { mutableStateOf(user?.postalCode.orEmpty()) }

    BackHandler { if (section != null) section = null else onBack() }
    Column(Modifier.fillMaxSize().background(Color.White).statusBarsPadding()) {
        Row(Modifier.fillMaxWidth().height(52.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = { if (section != null) section = null else onBack() }) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back")
            }
            Text(section ?: "Account Center", fontWeight = FontWeight.Bold, fontSize = 19.sp)
        }
        HorizontalDivider(color = Color(0xFFE4E7EC), thickness = .5.dp)
        Column(
            Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(horizontal = 14.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            when (section) {
            "Personal details" -> {
                Text("Your name is shared with your linked Tiwlo identity. Your email can be changed only after verification.", color = Color.Gray, fontSize = 12.sp)
                AccountField("Full name", name) { name = it }
                AccountField("Email", user?.email.orEmpty(), enabled = false) {}
                Button(enabled = !busy && name.isNotBlank(), onClick = { scope.launch { busy = true; runCatching { repository.updateAccount(mapOf("name" to name.trim())) }.onSuccess { Toast.makeText(context, "Personal details saved", Toast.LENGTH_SHORT).show(); section = null }.onFailure { Toast.makeText(context, it.message ?: "Save failed", Toast.LENGTH_LONG).show() }; busy = false } }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(8.dp)) { if (busy) CircularProgressIndicator(Modifier.size(18.dp), color = Color.White, strokeWidth = 2.dp) else Text("Save details") }
            }
            "Password and security" -> {
                Text("Changing this password also changes the password for your linked Tiwlo account.", color = Color.Gray, fontSize = 12.sp)
                AccountField("Current password", currentPassword, password = true) { currentPassword = it }
                AccountField("New password", newPassword, password = true) { newPassword = it }
                AccountField("Confirm new password", confirmPassword, password = true) { confirmPassword = it }
                Button(enabled = !busy && currentPassword.isNotBlank() && newPassword.length >= 6 && newPassword == confirmPassword, onClick = { scope.launch { busy = true; runCatching { repository.changePassword(currentPassword, newPassword) }.onSuccess { Toast.makeText(context, "Password changed", Toast.LENGTH_LONG).show(); currentPassword = ""; newPassword = ""; confirmPassword = ""; section = null }.onFailure { Toast.makeText(context, it.message ?: "Password change failed", Toast.LENGTH_LONG).show() }; busy = false } }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(8.dp)) { if (busy) CircularProgressIndicator(Modifier.size(18.dp), color = Color.White, strokeWidth = 2.dp) else Text("Change password") }
            }
            "Billing profile" -> {
                Text("Billing details are used only when you buy Tiwlo services or verification.", color = Color.Gray, fontSize = 12.sp)
                AccountField("Billing name", billingName) { billingName = it }
                AccountField("Mobile country code", mobileCountryCode) { mobileCountryCode = it }
                AccountField("Phone", phone) { phone = it }
                AccountField("Country code", country) { country = it }
                AccountField("Address", address) { address = it }
                AccountField("City", city) { city = it }
                AccountField("State / region", state) { state = it }
                AccountField("Postal code", postalCode) { postalCode = it }
                val complete = listOf(billingName, mobileCountryCode, phone, country, address, city, state, postalCode).all { it.isNotBlank() }
                Button(enabled = !busy && complete, onClick = { scope.launch { busy = true; runCatching { repository.updateAccount(mapOf("billingName" to billingName.trim(), "mobileCountryCode" to mobileCountryCode.trim(), "phone" to phone.trim(), "country" to country.trim(), "addressLine1" to address.trim(), "city" to city.trim(), "state" to state.trim(), "postalCode" to postalCode.trim())) }.onSuccess { Toast.makeText(context, "Billing profile saved", Toast.LENGTH_SHORT).show(); section = null }.onFailure { Toast.makeText(context, it.message ?: "Save failed", Toast.LENGTH_LONG).show() }; busy = false } }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(8.dp)) { if (busy) CircularProgressIndicator(Modifier.size(18.dp), color = Color.White, strokeWidth = 2.dp) else Text("Save billing profile") }
            }
            "Your information and permissions" -> {
                AccountMenuRow(Icons.Outlined.Download, "Download your information", "Posts, profile and messages") { if (!busy) scope.launch { busy = true; runCatching { repository.exportAccountDataJson() }.onSuccess { exportJson = it; exportLauncher.launch("tiwi-account-information.json") }.onFailure { busy = false; Toast.makeText(context, it.message ?: "Download failed", Toast.LENGTH_LONG).show() } } }
                AccountMenuRow(Icons.Outlined.Security, "Android permissions", "Camera, microphone, media, location and notifications") { context.startActivity(Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS, android.net.Uri.parse("package:${context.packageName}"))) }
                AccountMenuRow(Icons.Outlined.Policy, "Privacy Center", "Control social visibility and interactions") { Toast.makeText(context, "Open Privacy Center from the previous menu", Toast.LENGTH_SHORT).show() }
            }
            else -> {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(54.dp).background(Color(0xFFEAF3FF), CircleShape), contentAlignment = Alignment.Center) { Icon(Icons.Default.AccountCircle, null, tint = TiwiBlue, modifier = Modifier.size(30.dp)) }
                    Column(Modifier.padding(start = 12.dp)) { Text("Tiwi Account Center", fontWeight = FontWeight.Bold, fontSize = 20.sp); Text("Connected to your Tiwlo account", color = Color.Gray) }
                }
                Surface(color = Color.White, border = BorderStroke(1.dp, Color(0xFFE3E6EA)), shape = RoundedCornerShape(12.dp), tonalElevation = 0.dp) {
                    Column(Modifier.padding(14.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) { DecoratedAvatar(user?.avatar, R.drawable.img_tiwi_avatar_1, repository.profile.value?.avatarDecoration, Modifier.size(54.dp)); Column(Modifier.padding(start = 10.dp)) { Text(user?.name.orEmpty(), fontWeight = FontWeight.Bold); Text(user?.email.orEmpty(), color = Color.Gray, fontSize = 12.sp) } }
                        HorizontalDivider(Modifier.padding(vertical = 12.dp), color = Color(0xFFE9EAED))
                        Row(verticalAlignment = Alignment.CenterVertically) { Icon(Icons.Default.Link, null, tint = TiwiBlue); Text("Linked to Tiwlo", Modifier.weight(1f).padding(start = 9.dp), fontWeight = FontWeight.SemiBold); Icon(Icons.Default.CheckCircle, null, tint = Color(0xFF12B76A), modifier = Modifier.size(20.dp)) }
                    }
                }
                Text("Manage connected experiences", fontWeight = FontWeight.Bold, color = Color.Gray, fontSize = 13.sp)
                listOf("Personal details" to Icons.Outlined.Person, "Password and security" to Icons.Outlined.Security, "Billing profile" to Icons.Outlined.Payment, "Your information and permissions" to Icons.Outlined.FolderShared).forEach { item ->
                    AccountMenuRow(item.second, item.first, "Manage in the Tiwi app") { section = item.first }
                }
            }
            }
        }
    }
}

@Composable
private fun AccountField(label: String, value: String, enabled: Boolean = true, password: Boolean = false, onChange: (String) -> Unit) {
    OutlinedTextField(value, onChange, enabled = enabled, label = { Text(label) }, singleLine = true, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(8.dp), visualTransformation = if (password) PasswordVisualTransformation() else VisualTransformation.None)
}

@Composable
private fun AccountMenuRow(icon: ImageVector, title: String, subtitle: String, onClick: () -> Unit) {
    Surface(Modifier.fillMaxWidth().clickable(onClick = onClick), color = Color.White, border = BorderStroke(1.dp, Color(0xFFE3E6EA)), shape = RoundedCornerShape(10.dp), tonalElevation = 0.dp) {
        Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) { Icon(icon, null, tint = Color(0xFF475467)); Column(Modifier.weight(1f).padding(start = 11.dp)) { Text(title, fontWeight = FontWeight.Medium); Text(subtitle, color = Color.Gray, fontSize = 11.sp) }; Icon(Icons.Default.ChevronRight, null, tint = Color.Gray, modifier = Modifier.size(18.dp)) }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun VerificationInvoiceSheet(plan: SocialVerificationPackage, options: SocialVerificationOptions, busy: Boolean, onDismiss: () -> Unit, onPay: (String) -> Unit) {
    var selectedProvider by remember(plan.id) { mutableStateOf("") }
    val gold = plan.notableOnly || plan.badgeType == "gold"
    val converted = plan.priceUsd * options.usdRate
    val total = when (options.currency) { "BDT" -> "BDT ${String.format(Locale.US, "%.0f", converted)}"; else -> "\$${String.format(Locale.US, "%.2f", plan.priceUsd)} USD" }
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState, containerColor = Color.White, contentColor = Color.Black, tonalElevation = 0.dp) {
        Column(Modifier.fillMaxWidth().navigationBarsPadding().padding(bottom = 6.dp)) {
            Column(Modifier.fillMaxWidth().padding(horizontal = 18.dp), verticalArrangement = Arrangement.spacedBy(9.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) { VerifiedBadge(if (gold) "gold" else "blue", 30.dp); Column(Modifier.padding(start = 10.dp)) { Text("Verification invoice", fontWeight = FontWeight.Bold, fontSize = 20.sp); Text("Choose a method, then use the Pay button below", color = Color.Gray, fontSize = 12.sp) } }
            Surface(color = Color(0xFFF8FAFC), border = BorderStroke(1.dp, Color(0xFFE3E6EA)), shape = RoundedCornerShape(12.dp), tonalElevation = 0.dp) {
                Column(Modifier.padding(11.dp)) {
                    Row { Text(plan.name, Modifier.weight(1f), fontWeight = FontWeight.SemiBold); Text(total, fontWeight = FontWeight.Bold, color = TiwiBlue) }
                    Text(if (gold) "Notable-person review • No purchase" else "${plan.periodMonths} month subscription • Taxes may be added by the payment provider", color = Color.Gray, fontSize = 12.sp, modifier = Modifier.padding(top = 5.dp))
                }
            }
            if (!gold) {
                Text("Select a payment method", fontWeight = FontWeight.Bold)
                if (options.gateways.isEmpty()) Text("No payment method is enabled on Tiwlo right now.", color = Color(0xFFB42318), fontSize = 12.sp)
                options.gateways.forEach { gateway ->
                    val selected = selectedProvider == gateway.provider
                    Surface(Modifier.fillMaxWidth().clickable { selectedProvider = gateway.provider }, color = if (selected) Color(0xFFEAF3FF) else Color.White, border = BorderStroke(if (selected) 2.dp else 1.dp, if (selected) TiwiBlue else Color(0xFFD0D5DD)), shape = RoundedCornerShape(10.dp), tonalElevation = 0.dp) {
                        Row(Modifier.padding(horizontal = 9.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) { RadioButton(selected, onClick = { selectedProvider = gateway.provider }); Icon(Icons.Outlined.Payment, null, tint = TiwiBlue, modifier = Modifier.padding(start = 2.dp).size(21.dp)); Text(gateway.name, Modifier.weight(1f).padding(start = 8.dp), fontWeight = FontWeight.Medium, fontSize = 14.sp); if (selected) Icon(Icons.Default.CheckCircle, "Selected", tint = TiwiBlue, modifier = Modifier.size(20.dp)) }
                    }
                }
            }
            }
            HorizontalDivider(color = Color(0xFFE4E7EC))
            Column(Modifier.fillMaxWidth().background(Color.White).padding(horizontal = 18.dp, vertical = 9.dp)) {
                Text(if (gold) "Administrator review" else if (selectedProvider.isBlank()) "Select a payment method above" else "Selected: ${options.gateways.firstOrNull { it.provider == selectedProvider }?.name ?: selectedProvider}", color = if (!gold && selectedProvider.isBlank()) Color(0xFFB42318) else Color(0xFF475467), fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                Button(enabled = !busy && (gold || selectedProvider.isNotBlank()), onClick = { onPay(if (gold) "manual" else selectedProvider) }, modifier = Modifier.fillMaxWidth().padding(top = 6.dp).height(44.dp), shape = RoundedCornerShape(9.dp)) { if (busy) CircularProgressIndicator(Modifier.size(19.dp), color = Color.White, strokeWidth = 2.dp) else Text(if (gold) "Submit for review" else "Pay $total", fontWeight = FontWeight.Bold) }
                Text("Payment opens the secure main Tiwlo checkout.", color = Color.Gray, fontSize = 11.sp, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth().padding(top = 5.dp))
            }
        }
    }
}

@Composable
private fun VerificationPackageCard(plan: SocialVerificationPackage, options: SocialVerificationOptions, busy: Boolean, enabled: Boolean, onChoose: () -> Unit) {
    val gold = plan.badgeType == "gold" || plan.notableOnly
    val converted = plan.priceUsd * options.usdRate
    val price = when {
        gold -> "Administrator review"
        options.currency == "USD" -> "\$${String.format(Locale.US, "%.2f", converted)} / month"
        options.currency == "BDT" -> "BDT ${String.format(Locale.US, "%.0f", converted)} / month"
        else -> "${options.currency} ${String.format(Locale.US, "%.2f", converted)} / month"
    }
    Surface(color = Color.White, border = BorderStroke(1.dp, if (gold) Color(0xFFF2C94C) else Color(0xFFB9D7FF)), shape = RoundedCornerShape(13.dp), tonalElevation = 0.dp) {
        Column(Modifier.padding(15.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) { VerifiedBadge(if (gold) "gold" else "blue", 25.dp); Text(plan.name, Modifier.weight(1f).padding(start = 8.dp), fontWeight = FontWeight.Bold, fontSize = 17.sp); if (!gold) Text("\$${plan.priceUsd.toInt()}", color = TiwiBlue, fontWeight = FontWeight.Bold) }
            Text(price, color = if (gold) Color(0xFF9A6700) else TiwiBlue, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 7.dp))
            plan.features.forEach { feature -> Row(Modifier.padding(top = 7.dp), verticalAlignment = Alignment.CenterVertically) { Icon(Icons.Default.CheckCircle, null, tint = Color(0xFF12B76A), modifier = Modifier.size(17.dp)); Text(feature, Modifier.padding(start = 7.dp), fontSize = 13.sp) } }
            Button(onClick = onChoose, enabled = enabled && !busy, modifier = Modifier.fillMaxWidth().padding(top = 13.dp), colors = ButtonDefaults.buttonColors(containerColor = if (gold) Color(0xFFB7791F) else TiwiBlue), shape = RoundedCornerShape(8.dp)) { if (busy) CircularProgressIndicator(Modifier.size(18.dp), color = Color.White, strokeWidth = 2.dp) else Text(if (gold) "Apply for Gold" else "Subscribe", fontWeight = FontWeight.Bold) }
        }
    }
}

@Composable
private fun SettingSwitch(label: String, checked: Boolean, onCheckedChange: (Boolean) -> Unit) {
    Row(modifier = Modifier.fillMaxWidth().height(48.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(label, modifier = Modifier.weight(1f))
        Switch(
            checked = checked,
            onCheckedChange = onCheckedChange,
            colors = SwitchDefaults.colors(
                checkedThumbColor = Color.White,
                checkedTrackColor = TiwiBlue,
                uncheckedThumbColor = Color.White,
                uncheckedTrackColor = Color(0xFFD0D5DD),
                uncheckedBorderColor = Color(0xFFD0D5DD)
            )
        )
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
    val scope = rememberTiwiCoroutineScope()
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
                    if (profile?.verified == true) { Spacer(Modifier.width(5.dp)); VerifiedBadge(profile?.badgeType, 19.dp) }
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

private data class ProfileGalleryMedia(val postId: String, val mediaIndex: Int, val media: SocialMedia)

@Composable
private fun ProfileGalleryTile(item: ProfileGalleryMedia, modifier: Modifier, onClick: () -> Unit) {
    Box(modifier.clip(RoundedCornerShape(10.dp)).background(Color(0xFFF0F2F5)).clickable(onClick = onClick)) {
        AsyncImage(
            model = if (item.media.type == "video") item.media.thumbnailUrl ?: item.media.url else item.media.url,
            contentDescription = null,
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Crop
        )
        if (item.media.type == "video") {
            Box(Modifier.align(Alignment.Center).size(30.dp).background(Color.Black.copy(alpha = .52f), CircleShape), contentAlignment = Alignment.Center) {
                Icon(Icons.Default.PlayArrow, "Video", tint = Color.White, modifier = Modifier.size(21.dp))
            }
            Text("VIDEO", color = Color.White, fontSize = 8.sp, fontWeight = FontWeight.Black, modifier = Modifier.align(Alignment.TopEnd).padding(5.dp).background(Color.Black.copy(alpha = .55f), RoundedCornerShape(5.dp)).padding(horizontal = 5.dp, vertical = 2.dp))
        }
    }
}

@Composable
private fun ProfileGalleryPreview(items: List<ProfileGalleryMedia>, onViewAll: () -> Unit, onOpen: (String, Int) -> Unit) {
    if (items.isEmpty()) return
    Column(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 7.dp)) {
        Row(Modifier.fillMaxWidth().height(32.dp), verticalAlignment = Alignment.CenterVertically) {
            Text("Gallery", Modifier.weight(1f), fontWeight = FontWeight.Black, fontSize = 17.sp)
            TextButton(onClick = onViewAll, contentPadding = PaddingValues(horizontal = 5.dp, vertical = 0.dp), modifier = Modifier.height(30.dp)) {
                Text("View all", color = TiwiBlue, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                Icon(Icons.Default.ChevronRight, null, tint = TiwiBlue, modifier = Modifier.size(16.dp))
            }
        }
        Row(Modifier.fillMaxWidth().height(174.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            val first = items.first()
            ProfileGalleryTile(first, Modifier.weight(1.05f).fillMaxHeight()) { onOpen(first.postId, first.mediaIndex) }
            Column(Modifier.weight(2f).fillMaxHeight(), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                repeat(2) { rowIndex ->
                    Row(Modifier.weight(1f).fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        repeat(2) { columnIndex ->
                            val index = 1 + rowIndex * 2 + columnIndex
                            val item = items.getOrNull(index)
                            if (item != null) ProfileGalleryTile(item, Modifier.weight(1f).fillMaxHeight()) { onOpen(item.postId, item.mediaIndex) }
                            else Spacer(Modifier.weight(1f))
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ProfileGalleryPage(items: List<ProfileGalleryMedia>, onBack: () -> Unit, onOpen: (String, Int) -> Unit) {
    Column(Modifier.fillMaxSize().background(Color.White).statusBarsPadding()) {
        Row(Modifier.fillMaxWidth().height(50.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") }
            Column(Modifier.weight(1f)) {
                Text("Gallery", fontWeight = FontWeight.Black, fontSize = 18.sp)
                Text("${items.count { it.media.type == "image" }} photos · ${items.count { it.media.type == "video" }} videos", color = Color(0xFF667085), fontSize = 10.sp)
            }
        }
        HorizontalDivider(thickness = .5.dp, color = Color(0xFFE4E7EC))
        if (items.isEmpty()) Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { Text("No photos or videos yet", color = Color(0xFF667085)) }
        else LazyVerticalGrid(
            columns = GridCells.Fixed(3),
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(3.dp),
            horizontalArrangement = Arrangement.spacedBy(3.dp),
            verticalArrangement = Arrangement.spacedBy(3.dp)
        ) {
            gridItems(items, key = { "gallery-${it.postId}-${it.mediaIndex}-${it.media.url}" }) { item ->
                ProfileGalleryTile(item, Modifier.fillMaxWidth().aspectRatio(1f)) { onOpen(item.postId, item.mediaIndex) }
            }
        }
    }
}

@Composable
private fun ProfileTabStrip(labels: List<Pair<String, ImageVector>>, selected: Int, onSelect: (Int) -> Unit) {
    Surface(
        Modifier.fillMaxWidth().padding(horizontal = 10.dp, vertical = 7.dp),
        color = Color.White,
        shape = RoundedCornerShape(13.dp),
        border = BorderStroke(.7.dp, Color(0xFFE4E7EC)),
        tonalElevation = 0.dp
    ) {
        Row(Modifier.fillMaxWidth().height(48.dp).padding(4.dp), verticalAlignment = Alignment.CenterVertically) {
            labels.forEachIndexed { index, (label, icon) ->
                Row(
                    Modifier.weight(1f).fillMaxHeight().clip(RoundedCornerShape(9.dp))
                        .background(if (selected == index) Color(0xFFEAF3FF) else Color.Transparent)
                        .clickable { onSelect(index) },
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(icon, label, tint = if (selected == index) TiwiBlue else Color(0xFF344054), modifier = Modifier.size(18.dp))
                    Text(label, color = if (selected == index) TiwiBlue else Color(0xFF344054), fontSize = 10.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(start = 4.dp), maxLines = 1)
                }
            }
        }
    }
}

@Composable
private fun ProfileContentSearchPage(posts: List<Post>, onBack: () -> Unit, onOpen: (String) -> Unit) {
    var query by remember { mutableStateOf("") }
    val results = remember(posts, query) { if (query.isBlank()) posts else posts.filter { it.content.contains(query, true) } }
    Column(Modifier.fillMaxSize().background(Color.White).statusBarsPadding()) {
        Row(Modifier.fillMaxWidth().height(52.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") }
            Surface(Modifier.weight(1f).padding(end = 12.dp).height(38.dp), color = Color(0xFFF0F2F5), shape = RoundedCornerShape(19.dp), tonalElevation = 0.dp) {
                Row(Modifier.padding(horizontal = 11.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Search, null, tint = Color(0xFF667085), modifier = Modifier.size(18.dp))
                    BasicTextField(query, { query = it }, Modifier.weight(1f).padding(start = 7.dp), singleLine = true, textStyle = MaterialTheme.typography.bodyMedium.copy(fontSize = 13.sp, color = Color.Black), decorationBox = { inner -> if (query.isBlank()) Text("Search this profile", color = Color(0xFF667085), fontSize = 13.sp); inner() })
                }
            }
        }
        if (results.isEmpty()) Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { Text("No matching posts", color = Color(0xFF667085)) }
        else LazyColumn(Modifier.fillMaxSize()) {
            items(results, key = { "profile-search-${it.id}" }) { post ->
                Row(Modifier.fillMaxWidth().clickable { onOpen(post.id) }.padding(horizontal = 13.dp, vertical = 7.dp), verticalAlignment = Alignment.CenterVertically) {
                    val media = post.media.firstOrNull { it.type == "image" || it.type == "video" }
                    Box(Modifier.size(52.dp).clip(RoundedCornerShape(8.dp)).background(Color(0xFFF0F2F5))) {
                        if (media != null) AsyncImage(media.thumbnailUrl ?: media.url, null, Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                        if (media?.type == "video") Icon(Icons.Default.PlayArrow, null, tint = Color.White, modifier = Modifier.align(Alignment.Center).size(23.dp))
                    }
                    Column(Modifier.weight(1f).padding(start = 10.dp)) {
                        Text(post.content.ifBlank { "Media post" }, maxLines = 2, overflow = TextOverflow.Ellipsis, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                        Text("${formatCount(post.likes)} likes · ${formatCount(post.comments)} comments", color = Color(0xFF667085), fontSize = 10.sp)
                    }
                    Icon(Icons.Default.ChevronRight, null, tint = Color(0xFF98A2B3), modifier = Modifier.size(18.dp))
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class)
@Composable
fun ProfileScreen(
    repository: SocialRepository,
    posts: List<Post>,
    reels: List<Reel>,
    userId: String? = null,
    onBack: () -> Unit,
    onPostClick: (String) -> Unit = {},
    onMediaClick: (String, Int) -> Unit = { id, _ -> onPostClick(id) },
    onShare: (Post) -> Unit = {},
    onMessage: (String) -> Unit = {},
    onEditPost: (String) -> Unit = {},
    onCreate: () -> Unit = {},
    onConnectionClick: (String) -> Unit = {},
    onLive: (SocialLiveStream) -> Unit = {}
) {
    var selectedTab by remember(userId) { mutableIntStateOf(0) }
    var isFollowing by remember { mutableStateOf(false) }
    var showEdit by remember { mutableStateOf(false) }
    var showVerified by remember { mutableStateOf(false) }
    var showMenu by remember { mutableStateOf(false) }
    var showAllLinks by remember { mutableStateOf(false) }
    var showDashboard by remember { mutableStateOf(false) }
    var showConnections by remember { mutableStateOf(false) }
    var showGallery by remember { mutableStateOf(false) }
    var showProfileSearch by remember { mutableStateOf(false) }
    var showPeople by remember(userId) { mutableStateOf<String?>(null) }
    var savedPosts by remember { mutableStateOf<List<Post>>(emptyList()) }
    var connections by remember(userId) { mutableStateOf<List<SocialProfile>>(emptyList()) }
    val ownProfile by repository.profile.collectAsState()
    val ownUser by repository.currentUser.collectAsState()
    val syncing by repository.syncing.collectAsState()
    val liveStreams by repository.liveStreams.collectAsState()
    var remoteProfile by remember(userId) { mutableStateOf<SocialProfile?>(null) }
    var loadingProfile by remember(userId) { mutableStateOf(true) }
    val isOwn = userId.isNullOrBlank() || userId == repository.currentUserId()
    val profile = if (isOwn) ownProfile else remoteProfile
    val name = profile?.user?.name ?: if (isOwn) ownUser?.name.orEmpty() else ""
    val scope = rememberTiwiCoroutineScope()
    val context = LocalContext.current
    var effectPlayback by remember { mutableStateOf(SocialProfileEffectPlayback()) }
    var effectCycle by remember { mutableIntStateOf(0) }
    val profileTabs = remember(isOwn) {
        buildList {
            add("Posts" to Icons.Outlined.GridView)
            add("Reels" to Icons.Outlined.SmartDisplay)
            if (isOwn) add("Saved" to Icons.Outlined.BookmarkBorder)
            add("About" to Icons.Outlined.PersonOutline)
        }
    }
    val galleryItems = remember(posts) {
        posts.flatMap { post ->
            post.media.mapIndexedNotNull { index, media ->
                media.takeIf { it.type == "image" || it.type == "video" }?.let { ProfileGalleryMedia(post.id, index, it) }
            }
        }
    }
    LaunchedEffect(userId) {
        loadingProfile = true
        val loaded = if (isOwn) runCatching { repository.refreshProfile() }.getOrNull()
        else runCatching { repository.refreshProfile(userId) }.getOrNull().also { remoteProfile = it }
        isFollowing = if (isOwn) false else loaded?.isFollowing == true
        loadingProfile = false
    }
    LaunchedEffect(profile?.userId) {
        val profileId = profile?.userId
        connections = if (profileId.isNullOrBlank()) emptyList()
        else runCatching { repository.connections(profileId, 100) }.getOrDefault(emptyList())
    }
    LaunchedEffect(profile?.profileEffect?.id) {
        if (profile?.profileEffect?.id.isNullOrBlank()) {
            effectCycle = 0
            return@LaunchedEffect
        }
        effectCycle += 1
        effectPlayback = runCatching { repository.profileEffectPlayback() }.getOrDefault(SocialProfileEffectPlayback())
        val interval = effectPlayback.replayIntervalSeconds
        if (interval > 0) {
            while (true) {
                delay(interval * 1_000L)
                effectCycle += 1
            }
        }
    }
    LaunchedEffect(selectedTab, isOwn) {
        if (isOwn && profileTabs.getOrNull(selectedTab)?.first == "Saved") {
            savedPosts = runCatching { repository.savedPosts().map(::toUiPost) }.getOrDefault(emptyList())
        }
    }

    if (showEdit && isOwn) {
        BackHandler { showEdit = false }
        EditProfilePage(repository, profile, onBack = { showEdit = false })
        return
    }
    if (showDashboard && isOwn && profile != null) {
        BackHandler { showDashboard = false }
        ProfileDashboardPage(repository, profile, posts, reels, onBack = { showDashboard = false }, onCreate = onCreate, onPostClick = onPostClick)
        return
    }
    if (showConnections && profile != null) {
        BackHandler { showConnections = false }
        ProfileConnectionsPage(
            title = "${profile.user.name.ifBlank { profile.username }}'s connections",
            connections = connections,
            onBack = { showConnections = false },
            onProfileClick = { id -> showConnections = false; onConnectionClick(id) }
        )
        return
    }
    if (showMenu) {
        BackHandler { showMenu = false }
        ProfileOptionsPage(
            repository = repository, profile = profile, isOwn = isOwn,
            onBack = { showMenu = false }, onEdit = { showMenu = false; showEdit = true },
            onMessage = { profile?.userId?.let(onMessage) }, onProfileClosed = onBack
        )
        return
    }
    if (showGallery) {
        BackHandler { showGallery = false }
        ProfileGalleryPage(galleryItems, onBack = { showGallery = false }) { postId, mediaIndex ->
            showGallery = false
            onMediaClick(postId, mediaIndex)
        }
        return
    }
    if (showProfileSearch) {
        BackHandler { showProfileSearch = false }
        ProfileContentSearchPage(posts, onBack = { showProfileSearch = false }) { postId ->
            showProfileSearch = false
            onPostClick(postId)
        }
        return
    }
    if (showPeople != null && profile != null) {
        val peopleType = showPeople.orEmpty()
        BackHandler { showPeople = null }
        SocialPeoplePage(
            title = peopleType,
            repository = repository,
            load = {
                when (peopleType) {
                    "Followers" -> repository.followers(profile.userId)
                    "Following" -> repository.following(profile.userId)
                    else -> repository.connections(profile.userId, 100)
                }
            },
            onBack = { showPeople = null },
            onProfileClick = { id -> showPeople = null; onConnectionClick(id) },
            followBackMode = isOwn && peopleType == "Followers",
            emptyText = when (peopleType) {
                "Followers" -> "No followers yet"
                "Following" -> "Not following anyone yet"
                else -> "No connections yet"
            }
        )
        return
    }
    if (profile == null) {
        ProfileSkeleton(onBack = onBack, loading = loadingProfile)
        return
    }
    val selectedProfileTab = profileTabs.getOrNull(selectedTab)?.first ?: "Posts"
    val activeLive = liveStreams.firstOrNull { it.hostId == profile.userId && it.status == "live" }

    Box(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        PullToRefreshBox(
            isRefreshing = syncing,
            onRefresh = { scope.launch {
                if (isOwn) runCatching { repository.refreshAll(force = true) }
                else userId?.let { id -> runCatching { repository.refreshProfile(id) }.onSuccess { loaded -> loaded?.let { remoteProfile = it; isFollowing = it.isFollowing } } }
            } },
            modifier = Modifier.fillMaxSize()
        ) {
        LazyColumn(Modifier.fillMaxSize()) {
            stickyHeader {
                Column(
                    Modifier.fillMaxWidth().background(
                        Brush.verticalGradient(
                            listOf(Color.White.copy(alpha = .90f), Color(0xFFF4F8FF).copy(alpha = .80f))
                        )
                    )
                ) {
                    Box(Modifier.fillMaxWidth().statusBarsPadding().height(48.dp)) {
                        IconButton(onClick = onBack, modifier = Modifier.align(Alignment.CenterStart)) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back", modifier = Modifier.size(22.dp)) }
                        Text("@${profile.username}", fontWeight = FontWeight.Black, fontSize = 14.sp, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.align(Alignment.Center).widthIn(max = 150.dp))
                        Row(Modifier.align(Alignment.CenterEnd).padding(end = 2.dp)) {
                            IconButton(onClick = { showProfileSearch = true }, modifier = Modifier.size(42.dp)) { Icon(Icons.Default.Search, "Search profile", modifier = Modifier.size(22.dp)) }
                            IconButton(onClick = { showMenu = true }, modifier = Modifier.size(42.dp)) { Icon(Icons.Default.Menu, "Menu", modifier = Modifier.size(23.dp)) }
                        }
                    }
                    HorizontalDivider(thickness = .5.dp, color = Color.White.copy(alpha = .72f))
                }
            }
            item {
                Box(Modifier.fillMaxWidth().padding(horizontal = 10.dp).height(150.dp).clip(RoundedCornerShape(15.dp))) {
                    TiwiAvatar(profile.coverUrl, R.drawable.img_tiwi_cover, Modifier.fillMaxSize(), ContentScale.Crop)
                    if (isOwn) Surface(
                        Modifier.align(Alignment.BottomEnd).padding(9.dp).height(32.dp).clip(RoundedCornerShape(16.dp)).clickable { showEdit = true },
                        color = Color.White,
                        tonalElevation = 0.dp
                    ) {
                        Row(Modifier.padding(horizontal = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Outlined.CameraAlt, null, modifier = Modifier.size(16.dp))
                            Text("Change cover", fontSize = 10.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(start = 5.dp))
                        }
                    }
                }
                Box(Modifier.fillMaxWidth().height(68.dp).padding(horizontal = 12.dp)) {
                    DecoratedAvatar(
                        profile.user.avatar?.takeIf { it.isNotBlank() } ?: if (isOwn) ownUser?.avatar else null,
                        R.drawable.img_tiwi_avatar_1,
                        profile.avatarDecoration,
                        Modifier.requiredSize(98.dp).offset(y = (-30).dp)
                            .then(if (activeLive != null) Modifier.border(3.dp, Color(0xFFE11D48), CircleShape).padding(2.dp).clickable { onLive(activeLive) } else Modifier),
                        animateDecoration = true
                    )
                    Column(Modifier.fillMaxWidth().padding(start = 108.dp, top = 8.dp, end = 8.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(name, fontWeight = FontWeight.Black, fontSize = 16.sp, lineHeight = 19.sp, maxLines = 2, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f, fill = false))
                            if (profile.verified) VerifiedBadge(profile.badgeType, 16.dp, Modifier.padding(start = 3.dp), onClick = { showVerified = true })
                        }
                        val category = profile.category.orEmpty()
                        if (category.isNotBlank()) Text(category, color = Color(0xFF667085), fontSize = 11.sp, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(top = 2.dp))
                    }
                }
                Row(Modifier.fillMaxWidth().padding(start = 26.dp, end = 26.dp, bottom = 7.dp), horizontalArrangement = Arrangement.SpaceEvenly) {
                    ProfileStatItem("Posts", formatCount(profile.postCount.takeIf { it > 0 } ?: posts.size), Modifier.width(76.dp))
                    ProfileStatItem("Followers", formatCount(profile.followerCount), Modifier.width(76.dp)) { showPeople = "Followers" }
                    ProfileStatItem("Following", formatCount(profile.followingCount), Modifier.width(76.dp)) { showPeople = "Following" }
                }
                Column(Modifier.padding(horizontal = 12.dp, vertical = 2.dp)) {
                    if (!profile.bio.isNullOrBlank()) Text(
                        profile.bio.orEmpty(),
                        fontSize = 12.sp,
                        lineHeight = 16.sp,
                        maxLines = 4,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.fillMaxWidth().padding(bottom = 5.dp)
                    )
                    val socialLinks = profile.preferences.profileObjects("socialLinks").ifEmpty {
                        profile.preferences.profileString("socialMedia").takeIf { it.isNotBlank() }?.let {
                            listOf(mapOf<String, Any?>("label" to "Social media", "url" to it))
                        }.orEmpty()
                    }
                    ProfileCompactInfo(profile, socialLinks, onShowAllLinks = { showAllLinks = true })
                }
                Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 7.dp), horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                    if (isOwn) {
                        ProfileActionButton("Edit profile", Modifier.weight(1f), icon = Icons.Outlined.ManageAccounts) { showEdit = true }
                        ProfileActionButton("Dashboard", Modifier.weight(1f), primary = true, icon = Icons.Outlined.TrendingUp) { showDashboard = true }
                    } else {
                        ProfileActionButton(if (isFollowing) "Following" else "Follow", Modifier.weight(1f), primary = !isFollowing, icon = if (isFollowing) Icons.Outlined.PersonRemove else Icons.Outlined.PersonAdd) {
                            userId?.let { id -> scope.launch { runCatching { repository.follow(id, !isFollowing) }.onSuccess { isFollowing = it.isFollowing } } }
                        }
                        ProfileActionButton("Message", Modifier.weight(1f), icon = Icons.Outlined.ChatBubbleOutline) { userId?.let(onMessage) }
                        ProfileActionButton("Share", Modifier.weight(.75f), icon = Icons.Outlined.Share) {
                            val profileId = profile.userId.ifBlank { repository.currentUserId().orEmpty() }
                            shareDeepLink(context, "$name on Tiwi", profile.bio.orEmpty(), "https://tiwlo.com/social/profile/$profileId")
                        }
                    }
                }
                ProfileGalleryPreview(galleryItems.take(5), onViewAll = { showGallery = true }, onOpen = onMediaClick)
            }
            item { ProfileTabStrip(profileTabs, selectedTab) { selectedTab = it } }
            when (selectedProfileTab) {
                "Posts" -> items(posts, key = { it.id }) { post ->
                    PostCard(post, repository, onShareClick = { onShare(post) }, onOpen = { mediaIndex -> onMediaClick(post.id, mediaIndex) }, onEditRequest = { onEditPost(it.id) }, onOpenLinkedPost = onPostClick, onCommentProfile = onConnectionClick)
                }
                "Reels" -> item {
                    LazyRow(contentPadding = PaddingValues(horizontal = 8.dp, vertical = 3.dp), horizontalArrangement = Arrangement.spacedBy(5.dp)) {
                        items(reels, key = { it.id }) { reel -> ReelItem(reel) { onPostClick(reel.id) } }
                    }
                }
                "Saved" -> {
                    if (savedPosts.isEmpty()) item { Text("No saved posts yet", color = Color(0xFF667085), textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth().padding(32.dp)) }
                    else items(savedPosts, key = { "saved-${it.id}" }) { post -> PostCard(post, repository, onOpen = { mediaIndex -> onMediaClick(post.id, mediaIndex) }, onCommentProfile = onConnectionClick) }
                }
                else -> item { ProfileAboutDetails(profile, connections, isOwn, onEdit = { showEdit = true }) }
            }
        }
        }
        if (effectCycle > 0) key("${profile?.profileEffect?.id}:$effectCycle") {
            ProfileEffectImage(profile?.profileEffect, Modifier.matchParentSize(), loopLimit = effectPlayback.loopCount)
        }
    }
    if (showVerified) VerifiedInfoSheet(name, profile?.user?.avatar, profile?.badgeType ?: "blue", profile?.avatarDecoration, onDismiss = { showVerified = false })
    if (showAllLinks) ProfileLinksSheet(profile?.preferences?.profileObjects("socialLinks").orEmpty(), onDismiss = { showAllLinks = false })
}

@Composable
private fun ProfileAboutRow(icon: ImageVector, text: String, supporting: String? = null) {
    if (text.isBlank()) return
    Row(Modifier.fillMaxWidth().padding(vertical = 8.dp), verticalAlignment = Alignment.Top) {
        Icon(icon, null, tint = Color.Black, modifier = Modifier.size(27.dp))
        Column(Modifier.padding(start = 14.dp)) {
            Text(text, fontSize = 15.sp, fontWeight = FontWeight.Medium, lineHeight = 20.sp)
            if (!supporting.isNullOrBlank()) Text(supporting, color = Color(0xFF667085), fontSize = 12.sp, modifier = Modifier.padding(top = 2.dp))
        }
    }
}

private fun openProfileUrl(context: Context, rawUrl: String) {
    if (rawUrl.isBlank()) return
    val destination = if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) rawUrl else "https://$rawUrl"
    runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, android.net.Uri.parse(destination))) }
        .onFailure { Toast.makeText(context, "This link could not be opened", Toast.LENGTH_SHORT).show() }
}

@Composable
private fun ProfileCompactFact(icon: ImageVector, text: String, onClick: (() -> Unit)? = null) {
    if (text.isBlank()) return
    Row(
        Modifier.padding(end = 4.dp, bottom = 3.dp)
            .border(.6.dp, Color(0xFFE4E7EC), RoundedCornerShape(7.dp))
            .clip(RoundedCornerShape(7.dp))
            .then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier)
            .padding(horizontal = 6.dp, vertical = 3.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(icon, null, tint = if (onClick != null) TiwiBlue else Color(0xFF344054), modifier = Modifier.size(13.dp))
        Text(
            text,
            color = if (onClick != null) TiwiBlue else Color(0xFF1D2939),
            fontWeight = FontWeight.ExtraBold,
            fontSize = 9.sp,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.padding(start = 3.dp).widthIn(max = 120.dp)
        )
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun ProfileCompactInfo(
    profile: SocialProfile,
    socialLinks: List<Map<String, Any?>>,
    onShowAllLinks: () -> Unit
) {
    val context = LocalContext.current
    val preferences = profile.preferences
    val work = preferences.profileString("work")
    val education = preferences.profileString("education")
    val firstLink = socialLinks.firstOrNull()
    val firstLinkLabel = firstLink?.get("label")?.toString().orEmpty()
    val firstLinkUrl = firstLink?.get("url")?.toString().orEmpty()
    FlowRow(
        Modifier.fillMaxWidth().padding(top = 1.dp),
        horizontalArrangement = Arrangement.spacedBy(0.dp),
        verticalArrangement = Arrangement.spacedBy(0.dp)
    ) {
        ProfileCompactFact(Icons.Outlined.Badge, profile.category.orEmpty())
        ProfileCompactFact(Icons.Outlined.LocationOn, profile.location.orEmpty())
        ProfileCompactFact(Icons.Outlined.WorkOutline, work)
        ProfileCompactFact(Icons.Outlined.School, education)
        if (firstLink != null) ProfileCompactFact(Icons.Outlined.Link, firstLinkLabel.ifBlank { firstLinkUrl }) {
            openProfileUrl(context, firstLinkUrl)
        }
        if (socialLinks.size > 1) {
            Text(
                "+${socialLinks.size - 1}",
                color = TiwiBlue,
                fontWeight = FontWeight.ExtraBold,
                fontSize = 12.sp,
                modifier = Modifier.clickable(onClick = onShowAllLinks).padding(horizontal = 3.dp, vertical = 2.dp)
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ProfileLinksSheet(links: List<Map<String, Any?>>, onDismiss: () -> Unit) {
    val context = LocalContext.current
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = Color.White,
        tonalElevation = 0.dp,
        dragHandle = { BottomSheetDefaults.DragHandle(color = Color(0xFFD0D5DD)) }
    ) {
        Column(Modifier.fillMaxWidth().padding(horizontal = 17.dp)) {
            Text("Links", fontWeight = FontWeight.Black, fontSize = 20.sp, modifier = Modifier.padding(bottom = 8.dp))
            links.forEach { link ->
                val label = link["label"]?.toString().orEmpty()
                val url = link["url"]?.toString().orEmpty()
                Row(
                    Modifier.fillMaxWidth().clickable { openProfileUrl(context, url); onDismiss() }.padding(vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Outlined.Link, null, tint = TiwiBlue, modifier = Modifier.size(22.dp))
                    Column(Modifier.weight(1f).padding(start = 11.dp)) {
                        Text(label.ifBlank { "Link" }, fontWeight = FontWeight.ExtraBold)
                        Text(url, color = Color(0xFF667085), fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                    Icon(Icons.Default.ChevronRight, null, tint = Color(0xFF98A2B3))
                }
            }
            Spacer(Modifier.navigationBarsPadding().height(12.dp))
        }
    }
}

@Composable
private fun ProfileAboutOverview(
    profile: SocialProfile,
    connections: List<SocialProfile>,
    isOwn: Boolean,
    onEdit: () -> Unit,
    onSeeMore: () -> Unit,
    onSeeConnections: () -> Unit,
    onConnectionClick: (String) -> Unit
) {
    val preferences = profile.preferences
    val hometown = preferences.profileString("hometown")
    val birthday = preferences.profileString("birthday")
    val socialLinks = preferences.profileObjects("socialLinks").ifEmpty {
        preferences.profileString("socialMedia").takeIf { it.isNotBlank() }?.let {
            listOf(mapOf<String, Any?>("label" to "Social media", "url" to it))
        }.orEmpty()
    }
    val familyNames = connections.filter { it.userId in preferences.profileStrings("familyMemberIds").toSet() }
        .joinToString { it.user.name.ifBlank { it.username } }
    Column(Modifier.fillMaxWidth().background(Color.White).padding(horizontal = 15.dp, vertical = 14.dp)) {
        if (!profile.about.isNullOrBlank()) {
            Text(profile.about.orEmpty(), fontSize = 14.sp, lineHeight = 20.sp, modifier = Modifier.padding(bottom = 12.dp))
        }
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Text("Personal details", Modifier.weight(1f), fontWeight = FontWeight.ExtraBold, fontSize = 20.sp)
            if (isOwn) IconButton(onClick = onEdit, modifier = Modifier.size(36.dp)) { Icon(Icons.Outlined.Edit, "Edit personal details", tint = Color(0xFF475467)) }
        }
        ProfileAboutRow(Icons.Outlined.LocationOn, profile.location.orEmpty())
        ProfileAboutRow(Icons.Outlined.Home, hometown)
        ProfileAboutRow(Icons.Outlined.Cake, birthday)
        ProfileAboutRow(Icons.Outlined.FamilyRestroom, familyNames)
        TextButton(onClick = onSeeMore, contentPadding = PaddingValues(horizontal = 0.dp, vertical = 4.dp)) {
            Text("See more details", color = Color(0xFF475467), fontWeight = FontWeight.ExtraBold)
        }

        if (socialLinks.isNotEmpty() || !profile.website.isNullOrBlank()) {
            Row(Modifier.fillMaxWidth().padding(top = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                Text("Contact info", Modifier.weight(1f), fontWeight = FontWeight.ExtraBold, fontSize = 20.sp)
                if (isOwn) IconButton(onClick = onEdit, modifier = Modifier.size(36.dp)) { Icon(Icons.Outlined.Edit, "Edit contact info", tint = Color(0xFF475467)) }
            }
            socialLinks.forEach { link ->
                ProfileAboutRow(Icons.Outlined.AlternateEmail, link["label"]?.toString().orEmpty(), link["url"]?.toString())
            }
            ProfileAboutRow(Icons.Outlined.Link, profile.website.orEmpty())
        }

        Row(Modifier.fillMaxWidth().padding(top = 12.dp), verticalAlignment = Alignment.CenterVertically) {
            Text("My Connections", Modifier.weight(1f), fontWeight = FontWeight.ExtraBold, fontSize = 20.sp)
            if (connections.isNotEmpty()) TextButton(onClick = onSeeConnections) { Text("See all", color = TiwiBlue, fontWeight = FontWeight.Bold) }
        }
        if (connections.isEmpty()) {
            Text("No mutual connections yet.", color = Color(0xFF667085), fontSize = 13.sp, modifier = Modifier.padding(vertical = 10.dp))
        } else {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                connections.take(4).forEach { connection ->
                    Column(
                        Modifier.weight(1f).clickable { onConnectionClick(connection.userId) },
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Box {
                            DecoratedAvatar(connection.user.avatar, R.drawable.img_tiwi_avatar_1, connection.avatarDecoration, Modifier.size(68.dp), animateDecoration = false)
                            if (isSociallyActive(connection.user.socialLastActiveAt)) Box(
                                Modifier.align(Alignment.BottomEnd).size(16.dp).background(Color.White, CircleShape).padding(2.dp).background(Color(0xFF31A24C), CircleShape)
                            )
                        }
                        Row(Modifier.padding(top = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                            Text(connection.user.name.ifBlank { connection.username }, maxLines = 1, overflow = TextOverflow.Ellipsis, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            if (connection.verified) VerifiedBadge(connection.badgeType, 13.dp, Modifier.padding(start = 2.dp))
                        }
                    }
                }
                repeat((4 - connections.take(4).size).coerceAtLeast(0)) { Spacer(Modifier.weight(1f)) }
            }
        }
    }
    HorizontalDivider(color = Color(0xFFF0F2F5), thickness = 8.dp)
}

@Composable
private fun ProfileAboutDetails(profile: SocialProfile, connections: List<SocialProfile>, isOwn: Boolean, onEdit: () -> Unit) {
    val preferences = profile.preferences
    val familyNames = connections.filter { it.userId in preferences.profileStrings("familyMemberIds").toSet() }
        .joinToString { it.user.name.ifBlank { it.username } }
    val socialLinks = preferences.profileObjects("socialLinks").ifEmpty {
        preferences.profileString("socialMedia").takeIf { it.isNotBlank() }?.let {
            listOf(mapOf<String, Any?>("label" to "Social media", "url" to it))
        }.orEmpty()
    }
    val joinedYear = parseSocialDate(profile.createdAt)?.let { SimpleDateFormat("yyyy", Locale.US).format(it) }
    Column(Modifier.fillMaxWidth().background(Color.White).padding(horizontal = 16.dp, vertical = 14.dp)) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Text("About", Modifier.weight(1f), fontWeight = FontWeight.ExtraBold, fontSize = 21.sp)
            if (isOwn) IconButton(onClick = onEdit) { Icon(Icons.Outlined.Edit, "Edit about") }
        }
        Surface(Modifier.fillMaxWidth().padding(top = 4.dp), color = Color(0xFFF4F7FB), shape = RoundedCornerShape(16.dp), tonalElevation = 0.dp) {
            Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                DecoratedAvatar(profile.user.avatar, R.drawable.img_tiwi_avatar_1, profile.avatarDecoration, Modifier.size(58.dp), animateDecoration = false)
                Column(Modifier.padding(start = 12.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(profile.user.name.ifBlank { profile.username }, fontWeight = FontWeight.Black, fontSize = 17.sp)
                        if (profile.verified) VerifiedBadge(profile.badgeType, 15.dp, Modifier.padding(start = 3.dp))
                    }
                    Text("Alias · @${profile.username}", color = Color(0xFF475467), fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                    Text(if (joinedYear != null) "Joined Tiwi in $joinedYear" else "Tiwi member", color = Color(0xFF667085), fontSize = 12.sp)
                }
            }
        }
        if (!profile.about.isNullOrBlank()) Surface(
            Modifier.fillMaxWidth().padding(top = 12.dp),
            color = Color(0xFFEAF3FF),
            shape = RoundedCornerShape(16.dp),
            tonalElevation = 0.dp
        ) {
            Row(Modifier.padding(14.dp), verticalAlignment = Alignment.Top) {
                Box(Modifier.size(34.dp).background(Color.White, CircleShape), contentAlignment = Alignment.Center) {
                    Icon(Icons.Outlined.Info, null, tint = TiwiBlue, modifier = Modifier.size(19.dp))
                }
                Column(Modifier.padding(start = 11.dp)) {
                    Text("About ${profile.user.name.ifBlank { profile.username }}", fontWeight = FontWeight.ExtraBold, fontSize = 15.sp)
                    Text(profile.about.orEmpty(), color = Color(0xFF344054), fontSize = 13.sp, lineHeight = 19.sp, modifier = Modifier.padding(top = 4.dp))
                }
            }
        }
        Text("Overview", fontWeight = FontWeight.Black, fontSize = 18.sp, modifier = Modifier.padding(top = 18.dp, bottom = 4.dp))
        if (!profile.bio.isNullOrBlank()) ProfileAboutRow(Icons.Outlined.WavingHand, profile.bio.orEmpty(), "Bio")
        if (!profile.category.isNullOrBlank()) ProfileAboutRow(Icons.Outlined.Badge, profile.category.orEmpty(), "Profile category")
        ProfileAboutRow(Icons.Outlined.LocationOn, profile.location.orEmpty(), "Current city")
        ProfileAboutRow(Icons.Outlined.Home, preferences.profileString("hometown"), "Hometown")
        ProfileAboutRow(Icons.Outlined.Cake, preferences.profileString("birthday"), "Birthday")
        ProfileAboutRow(Icons.Outlined.FavoriteBorder, preferences.profileString("relationship"), "Relationship")
        ProfileAboutRow(Icons.Outlined.FamilyRestroom, familyNames, "Family members")
        Text("Work and identity", fontWeight = FontWeight.Black, fontSize = 18.sp, modifier = Modifier.padding(top = 14.dp, bottom = 4.dp))
        ProfileAboutRow(Icons.Outlined.Person, preferences.profileString("gender"), "Gender and pronouns")
        ProfileAboutRow(Icons.Outlined.Translate, preferences.profileStrings("languages").joinToString(), "Languages")
        ProfileAboutRow(Icons.Outlined.WorkOutline, preferences.profileString("work"), "Work")
        ProfileAboutRow(Icons.Outlined.School, preferences.profileString("education"), "Education")
        Text("Links and interests", fontWeight = FontWeight.Black, fontSize = 18.sp, modifier = Modifier.padding(top = 14.dp, bottom = 4.dp))
        socialLinks.forEach { link ->
            ProfileAboutRow(Icons.Outlined.AlternateEmail, link["label"]?.toString().orEmpty(), link["url"]?.toString())
        }
        ProfileAboutRow(Icons.Outlined.Link, profile.website.orEmpty(), "Website")
        ProfileAboutRow(Icons.Outlined.Interests, preferences.profileStrings("hobbies").joinToString(), "Hobbies")
        ProfileAboutRow(Icons.Outlined.MusicNote, preferences.profileStrings("interests").joinToString(), "Interests")
        Spacer(Modifier.navigationBarsPadding().height(12.dp))
    }
}

@Composable
private fun ProfileConnectionsPage(
    title: String,
    connections: List<SocialProfile>,
    onBack: () -> Unit,
    onProfileClick: (String) -> Unit
) {
    Column(Modifier.fillMaxSize().background(Color.White).statusBarsPadding()) {
        Row(Modifier.fillMaxWidth().height(54.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") }
            Text(title, Modifier.weight(1f), fontWeight = FontWeight.ExtraBold, fontSize = 18.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        HorizontalDivider(color = Color(0xFFE4E7EC), thickness = .5.dp)
        if (connections.isEmpty()) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("No mutual connections yet.", color = Color(0xFF667085))
            }
        } else LazyColumn(Modifier.fillMaxSize()) {
            item {
                Text(
                    "${formatCount(connections.size)} mutual ${if (connections.size == 1) "connection" else "connections"}",
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF475467),
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 13.dp)
                )
            }
            items(connections, key = { it.userId }) { connection ->
                Row(
                    Modifier.fillMaxWidth().clickable { onProfileClick(connection.userId) }.padding(horizontal = 15.dp, vertical = 9.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box {
                        DecoratedAvatar(connection.user.avatar, R.drawable.img_tiwi_avatar_1, connection.avatarDecoration, Modifier.size(58.dp), animateDecoration = false)
                        if (isSociallyActive(connection.user.socialLastActiveAt)) Box(
                            Modifier.align(Alignment.BottomEnd).size(15.dp).background(Color.White, CircleShape).padding(2.dp).background(Color(0xFF31A24C), CircleShape)
                        )
                    }
                    Column(Modifier.weight(1f).padding(start = 12.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(connection.user.name.ifBlank { connection.username }, fontWeight = FontWeight.ExtraBold, maxLines = 1)
                            if (connection.verified) VerifiedBadge(connection.badgeType, 15.dp, Modifier.padding(start = 3.dp))
                        }
                        Text("@${connection.username}", color = Color(0xFF667085), fontSize = 12.sp)
                        Text(socialPresenceLabel(connection.user.socialLastActiveAt), color = if (isSociallyActive(connection.user.socialLastActiveAt)) Color(0xFF31A24C) else Color(0xFF98A2B3), fontSize = 11.sp)
                    }
                    Icon(Icons.Default.ChevronRight, null, tint = Color(0xFF98A2B3))
                }
            }
            item { Spacer(Modifier.navigationBarsPadding().height(14.dp)) }
        }
    }
}

@Composable
private fun ProfileDashboardMetric(title: String, value: String, icon: ImageVector, color: Color, modifier: Modifier = Modifier) {
    Surface(modifier, color = color.copy(alpha = .1f), shape = RoundedCornerShape(12.dp), tonalElevation = 0.dp) {
        Column(Modifier.padding(11.dp)) {
            Box(Modifier.size(29.dp).background(color.copy(alpha = .16f), RoundedCornerShape(8.dp)), contentAlignment = Alignment.Center) {
                Icon(icon, null, tint = color, modifier = Modifier.size(17.dp))
            }
            Text(value, fontWeight = FontWeight.Black, fontSize = 18.sp, modifier = Modifier.padding(top = 7.dp))
            Text(title, color = Color(0xFF667085), fontSize = 10.sp)
        }
    }
}

@Composable
private fun ProfileDashboardPage(
    repository: SocialRepository,
    profile: SocialProfile,
    posts: List<Post>,
    reels: List<Reel>,
    onBack: () -> Unit,
    onCreate: () -> Unit,
    onPostClick: (String) -> Unit
) {
    var section by remember { mutableStateOf("Analytics") }
    BackHandler(enabled = section != "Analytics") { section = "Analytics" }
    Column(Modifier.fillMaxSize().background(Color.White).statusBarsPadding()) {
        Row(Modifier.fillMaxWidth().height(50.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = { if (section == "Analytics") onBack() else section = "Analytics" }) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back")
            }
            Text(if (section == "Analytics") "Dashboard" else section, Modifier.weight(1f), textAlign = TextAlign.Center, fontWeight = FontWeight.ExtraBold, fontSize = 18.sp)
            IconButton(onClick = onCreate) { Icon(Icons.Default.Add, "Create") }
        }
        HorizontalDivider(color = Color(0xFFE4E7EC), thickness = .5.dp)
        when (section) {
            "Content" -> DashboardContentPage(posts, reels, onPostClick, Modifier.weight(1f))
            "Community" -> DashboardCommunityPage(repository, posts, onPostClick, Modifier.weight(1f))
            "Monetize" -> DashboardMonetizePage(repository, profile, Modifier.weight(1f))
            else -> DashboardAnalyticsPage(profile, posts, reels, onSection = { section = it }, onPostClick = onPostClick, modifier = Modifier.weight(1f))
        }
    }
}

@Composable
private fun DashboardNavigation(onSection: (String) -> Unit) {
    LazyRow(
        contentPadding = PaddingValues(horizontal = 14.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        items(listOf("Analytics", "Content", "Community", "Monetize")) { title ->
            Surface(
                Modifier.clickable { if (title != "Analytics") onSection(title) },
                color = if (title == "Analytics") Color(0xFFDDEEFF) else Color(0xFFEEF0F3),
                shape = RoundedCornerShape(50),
                tonalElevation = 0.dp
            ) {
                Text(title, color = if (title == "Analytics") TiwiBlue else Color.Black, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(horizontal = 13.dp, vertical = 7.dp))
            }
        }
    }
}

@Composable
private fun DashboardActivityRing(icon: ImageVector, value: String, label: String, progress: Float, color: Color, modifier: Modifier = Modifier) {
    Column(modifier, horizontalAlignment = Alignment.CenterHorizontally) {
        Box(Modifier.size(68.dp), contentAlignment = Alignment.Center) {
            CircularProgressIndicator(progress = { 1f }, modifier = Modifier.fillMaxSize(), strokeWidth = 4.dp, color = color.copy(alpha = .15f), trackColor = Color.Transparent)
            CircularProgressIndicator(progress = { progress.coerceIn(0f, 1f) }, modifier = Modifier.fillMaxSize(), strokeWidth = 4.dp, color = color, trackColor = Color.Transparent)
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(icon, null, modifier = Modifier.size(18.dp))
                Text(value, fontWeight = FontWeight.Bold, fontSize = 11.sp)
            }
        }
        Text(label, color = Color(0xFF667085), fontWeight = FontWeight.Bold, fontSize = 10.sp, modifier = Modifier.padding(top = 4.dp))
    }
}

@Composable
private fun DashboardAnalyticsPage(
    profile: SocialProfile,
    posts: List<Post>,
    reels: List<Reel>,
    onSection: (String) -> Unit,
    onPostClick: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    var selectedRange by remember { mutableStateOf("28 days") }
    val rangePosts = remember(posts, selectedRange) { posts.filter { isWithinDashboardRange(it.publishedAt, selectedRange) } }
    val rangeReels = remember(reels, selectedRange) { reels.filter { isWithinDashboardRange(it.publishedAt, selectedRange) } }
    val views = rangePosts.sumOf { it.views } + rangeReels.sumOf { it.views }
    val interactions = rangePosts.sumOf { it.likes + it.comments + it.shares } + rangeReels.sumOf { it.likes + it.comments }
    val latest = rangePosts.maxByOrNull { it.views }
    LazyColumn(modifier, contentPadding = PaddingValues(bottom = 18.dp)) {
        item { DashboardNavigation(onSection) }
        item {
            Row(Modifier.fillMaxWidth().padding(horizontal = 15.dp, vertical = 7.dp), verticalAlignment = Alignment.CenterVertically) {
                DecoratedAvatar(profile.user.avatar, R.drawable.img_tiwi_avatar_1, profile.avatarDecoration, Modifier.size(50.dp), animateDecoration = false)
                Column(Modifier.weight(1f).padding(start = 9.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(profile.user.name.ifBlank { profile.username }, fontWeight = FontWeight.ExtraBold, fontSize = 15.sp)
                        if (profile.verified) VerifiedBadge(profile.badgeType, 15.dp, Modifier.padding(start = 3.dp))
                    }
                    Text("Your Tiwi creator activity", color = Color(0xFF667085), fontSize = 11.sp)
                }
            }
        }
        item {
            Row(Modifier.fillMaxWidth().padding(horizontal = 15.dp, vertical = 12.dp), horizontalArrangement = Arrangement.SpaceEvenly) {
                DashboardActivityRing(Icons.Outlined.GridView, "${posts.size}/7", "Posts", posts.size / 7f, TiwiBlue, Modifier.weight(1f))
                DashboardActivityRing(Icons.Outlined.PlayCircleOutline, "${reels.size}/14", "Reels", reels.size / 14f, Color(0xFFF79009), Modifier.weight(1f))
                DashboardActivityRing(Icons.Outlined.ThumbUpAlt, formatCount(interactions), "Reception", (interactions / 100f).coerceAtMost(1f), Color(0xFFD946EF), Modifier.weight(1f))
            }
        }
        item {
            Text("Analytics", fontWeight = FontWeight.Black, fontSize = 18.sp, modifier = Modifier.padding(horizontal = 15.dp, vertical = 6.dp))
            LazyRow(contentPadding = PaddingValues(horizontal = 17.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(listOf("28 days", "7 days", "Today")) { range ->
                    Surface(Modifier.clickable { selectedRange = range }, color = if (range == selectedRange) Color(0xFFDDEEFF) else Color.White, shape = RoundedCornerShape(50), tonalElevation = 0.dp) {
                        Text(range, color = if (range == selectedRange) TiwiBlue else Color.Black, fontSize = 12.sp, modifier = Modifier.padding(horizontal = 13.dp, vertical = 7.dp))
                    }
                }
            }
        }
        item {
            Row(Modifier.fillMaxWidth().padding(horizontal = 15.dp, vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                ProfileDashboardMetric("Views", formatCount(views), Icons.Outlined.Insights, TiwiBlue, Modifier.weight(1f))
                ProfileDashboardMetric("Estimated earnings", "--", Icons.Outlined.Payments, Color(0xFF12B76A), Modifier.weight(1f))
            }
            Row(Modifier.fillMaxWidth().padding(horizontal = 15.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                ProfileDashboardMetric("Engagement", formatCount(interactions), Icons.Outlined.TouchApp, Color(0xFF7F56D9), Modifier.weight(1f))
                ProfileDashboardMetric("Net followers", formatCount(profile.followerCount), Icons.Outlined.Group, Color(0xFFF79009), Modifier.weight(1f))
            }
        }
        item {
            Row(Modifier.fillMaxWidth().padding(horizontal = 15.dp, vertical = 11.dp), verticalAlignment = Alignment.CenterVertically) {
                Text("Content", Modifier.weight(1f), fontWeight = FontWeight.Black, fontSize = 18.sp)
                TextButton(onClick = { onSection("Content") }) { Text("See all", color = TiwiBlue, fontWeight = FontWeight.Bold) }
            }
            if (latest == null) Text("Create your first post to see content analytics.", color = Color(0xFF667085), modifier = Modifier.padding(horizontal = 17.dp))
            else Surface(
                Modifier.fillMaxWidth().padding(horizontal = 17.dp).clickable { onPostClick(latest.id) },
                color = Color(0xFFF7F9FC),
                shape = RoundedCornerShape(16.dp),
                tonalElevation = 0.dp
            ) {
                Row(Modifier.heightIn(min = 124.dp).padding(11.dp)) {
                    Column(Modifier.weight(1f)) {
                        Text("Latest top content", color = Color(0xFF667085), fontSize = 11.sp)
                        Text(latest.content.ifBlank { "Media post" }, fontWeight = FontWeight.ExtraBold, fontSize = 14.sp, maxLines = 4, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(top = 5.dp))
                    }
                    Column(Modifier.width(110.dp).padding(start = 8.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        DashboardMiniStat("Views", formatCount(latest.views))
                        DashboardMiniStat("Engagement", formatCount(latest.likes + latest.comments + latest.shares))
                    }
                }
            }
        }
        item { Spacer(Modifier.navigationBarsPadding().height(8.dp)) }
    }
}

@Composable
private fun DashboardMiniStat(title: String, value: String) {
    Column(Modifier.fillMaxWidth().background(Color.White, RoundedCornerShape(10.dp)).padding(horizontal = 9.dp, vertical = 7.dp)) {
        Text(title, color = Color(0xFF667085), fontSize = 10.sp)
        Text(value, fontWeight = FontWeight.Black, fontSize = 14.sp)
    }
}

private data class DashboardContentItem(
    val id: String,
    val title: String,
    val imageUrl: String?,
    val imageRes: Int?,
    val views: Int,
    val video: Boolean,
    val collaboration: Boolean,
    val kind: String
)

private fun dashboardContentItems(posts: List<Post>, reels: List<Reel>): List<DashboardContentItem> {
    val postItems = posts.map { post ->
        val media = post.media.firstOrNull()
        DashboardContentItem(
            id = post.id,
            title = post.content.ifBlank { if (post.videoUrl != null || media?.type == "video") "Video post" else "Photo post" },
            imageUrl = media?.thumbnailUrl ?: post.imageUrl ?: media?.url,
            imageRes = post.image,
            views = post.views,
            video = post.videoUrl != null || media?.type == "video",
            collaboration = post.media.any { it.sharedPostId != null },
            kind = "Post"
        )
    }
    val reelItems = reels.map { reel ->
        DashboardContentItem(
            id = reel.id,
            title = reel.content.ifBlank { "Reel" },
            imageUrl = reel.thumbnailUrl,
            imageRes = reel.thumbnail,
            views = reel.views,
            video = true,
            collaboration = false,
            kind = "Reel"
        )
    }
    return (postItems + reelItems).distinctBy { it.id }
}

@Composable
private fun DashboardContentCard(item: DashboardContentItem, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Box(modifier.aspectRatio(.78f).background(Color(0xFFF0F2F5)).clickable(onClick = onClick)) {
        when {
            !item.imageUrl.isNullOrBlank() -> AsyncImage(item.imageUrl, null, Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
            item.imageRes != null -> Image(painterResource(item.imageRes), null, Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
            else -> Text(item.title, fontWeight = FontWeight.SemiBold, fontSize = 15.sp, lineHeight = 19.sp, maxLines = 6, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(9.dp))
        }
        Row(Modifier.align(Alignment.BottomStart).padding(6.dp).background(Color.Black.copy(alpha = .55f), RoundedCornerShape(5.dp)).padding(horizontal = 6.dp, vertical = 3.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(if (item.video) Icons.Default.PlayArrow else Icons.Outlined.BarChart, null, tint = Color.White, modifier = Modifier.size(12.dp))
            Text(formatCount(item.views), color = Color.White, fontSize = 10.sp, modifier = Modifier.padding(start = 3.dp))
        }
        if (item.video) Icon(Icons.Default.Videocam, "Video", tint = Color.White, modifier = Modifier.align(Alignment.TopEnd).padding(6.dp).size(18.dp))
        if (item.collaboration) Icon(Icons.Outlined.Group, "Collaboration", tint = Color.White, modifier = Modifier.align(Alignment.BottomEnd).padding(6.dp).size(18.dp))
    }
}

@Composable
private fun DashboardContentPage(
    posts: List<Post>,
    reels: List<Reel>,
    onPostClick: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    var tab by remember { mutableStateOf("Library") }
    var contentType by remember { mutableStateOf("All") }
    var sortViews by remember { mutableStateOf(true) }
    val allItems = remember(posts, reels) { dashboardContentItems(posts, reels) }
    val visibleItems = remember(allItems, tab, contentType, sortViews) {
        var result = when (tab) {
            "Videos" -> allItems.filter { it.video }
            "Collaborations" -> allItems.filter { it.collaboration }
            "Insights" -> allItems.sortedByDescending { it.views }
            else -> allItems
        }
        result = when (contentType) {
            "Posts" -> result.filter { it.kind == "Post" }
            "Reels" -> result.filter { it.kind == "Reel" }
            else -> result
        }
        if (sortViews) result.sortedByDescending { it.views } else result
    }
    Column(modifier.background(Color.White)) {
        LazyRow(contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            items(listOf("Library", "Videos", "Collaborations", "Insights")) { item ->
                Surface(Modifier.clickable { tab = item }, color = if (tab == item) Color(0xFFDDEEFF) else Color.White, shape = RoundedCornerShape(50), tonalElevation = 0.dp) {
                    Text(item, color = if (tab == item) TiwiBlue else Color.Black, modifier = Modifier.padding(horizontal = 15.dp, vertical = 9.dp), maxLines = 1)
                }
            }
        }
        LazyRow(contentPadding = PaddingValues(horizontal = 16.dp, vertical = 6.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            item {
                Surface(Modifier.clickable { contentType = when (contentType) { "All" -> "Posts"; "Posts" -> "Reels"; else -> "All" } }, color = Color(0xFFEEF0F3), shape = RoundedCornerShape(9.dp), tonalElevation = 0.dp) {
                    Row(Modifier.padding(horizontal = 12.dp, vertical = 9.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Outlined.FilterList, null, Modifier.size(18.dp))
                        Text(contentType, modifier = Modifier.padding(start = 6.dp))
                    }
                }
            }
            item {
                Surface(Modifier.clickable { sortViews = !sortViews }, color = if (sortViews) Color(0xFFDDEEFF) else Color(0xFFEEF0F3), shape = RoundedCornerShape(9.dp), tonalElevation = 0.dp) {
                    Row(Modifier.padding(horizontal = 12.dp, vertical = 9.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Outlined.TrendingUp, null, tint = if (sortViews) TiwiBlue else Color.Black, modifier = Modifier.size(18.dp))
                        Text(if (sortViews) "Top views" else "Original order", color = if (sortViews) TiwiBlue else Color.Black, modifier = Modifier.padding(start = 6.dp))
                    }
                }
            }
        }
        if (visibleItems.isEmpty()) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text(
                    when (tab) {
                        "Videos" -> "No video content is available."
                        "Collaborations" -> "No collaboration content yet."
                        else -> "No content found."
                    },
                    color = Color(0xFF667085),
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(30.dp)
                )
            }
        } else LazyColumn(Modifier.weight(1f)) {
            items(visibleItems.chunked(3)) { row ->
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(1.dp)) {
                    row.forEach { item -> DashboardContentCard(item, Modifier.weight(1f)) { onPostClick(item.id) } }
                    repeat(3 - row.size) { Spacer(Modifier.weight(1f)) }
                }
                Spacer(Modifier.height(1.dp))
            }
            item { Spacer(Modifier.navigationBarsPadding().height(10.dp)) }
        }
    }
}

private data class DashboardCommentItem(val comment: SocialComment, val post: Post, val responded: Boolean)

@Composable
private fun DashboardCommunityGroupDetail(
    repository: SocialRepository,
    group: SocialGroup,
    onBack: () -> Unit,
    onPostClick: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    var members by remember(group.id) { mutableStateOf<List<SocialGroupMember>>(emptyList()) }
    var groupPosts by remember(group.id) { mutableStateOf<List<SocialPost>>(emptyList()) }
    var loading by remember(group.id) { mutableStateOf(true) }
    LaunchedEffect(group.id) {
        loading = true
        members = runCatching { repository.groupMembers(group.id) }.getOrDefault(emptyList())
        groupPosts = runCatching { repository.groupPosts(group.id) }.getOrDefault(emptyList())
        loading = false
    }
    BackHandler(onBack = onBack)
    Column(modifier.background(Color.White)) {
        Row(Modifier.fillMaxWidth().height(50.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back to groups") }
            Text(group.name, Modifier.weight(1f), fontWeight = FontWeight.ExtraBold, fontSize = 18.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        if (loading) DashboardLoadingPlaceholder(Modifier.weight(1f))
        else LazyColumn(Modifier.weight(1f)) {
            item {
                Box(Modifier.fillMaxWidth().height(150.dp).background(Color(0xFFEAF3FF))) {
                    if (!group.coverUrl.isNullOrBlank()) AsyncImage(group.coverUrl, null, Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                    else Icon(Icons.Outlined.Groups, null, tint = TiwiBlue, modifier = Modifier.align(Alignment.Center).size(48.dp))
                }
                Column(Modifier.padding(16.dp)) {
                    Text(group.name, fontWeight = FontWeight.Black, fontSize = 21.sp)
                    if (!group.description.isNullOrBlank()) Text(group.description.orEmpty(), color = Color(0xFF475467), fontSize = 13.sp, lineHeight = 18.sp, modifier = Modifier.padding(top = 4.dp))
                    Text("${formatCount(group.memberCount)} members · ${group.privacy.replaceFirstChar { it.uppercase() }} · ${group.viewerRole ?: "member"}", color = Color(0xFF667085), fontSize = 12.sp, modifier = Modifier.padding(top = 6.dp))
                }
            }
            if (members.isNotEmpty()) item {
                Text("Members", fontWeight = FontWeight.Black, fontSize = 18.sp, modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp))
                LazyRow(contentPadding = PaddingValues(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    items(members.take(12), key = { it.userId }) { member ->
                        Column(Modifier.width(68.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                            DecoratedAvatar(member.user.avatar, R.drawable.img_tiwi_avatar_1, member.profile?.avatarDecoration, Modifier.size(52.dp), animateDecoration = false)
                            Text(member.user.name, fontSize = 10.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(top = 4.dp))
                        }
                    }
                }
            }
            item { Text("Group content", fontWeight = FontWeight.Black, fontSize = 18.sp, modifier = Modifier.padding(horizontal = 16.dp, vertical = 14.dp)) }
            if (groupPosts.isEmpty()) item { Text("No group posts yet.", color = Color(0xFF667085), modifier = Modifier.padding(horizontal = 16.dp)) }
            else items(groupPosts, key = { it.id }) { post ->
                PostCard(toUiPost(post), repository, onOpen = { onPostClick(post.id) })
            }
            item { Spacer(Modifier.navigationBarsPadding().height(10.dp)) }
        }
    }
}

@Composable
private fun DashboardCommunityPage(
    repository: SocialRepository,
    posts: List<Post>,
    onPostClick: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    var tab by remember { mutableStateOf("Comments") }
    var unansweredOnly by remember { mutableStateOf(true) }
    var loading by remember { mutableStateOf(true) }
    var commentItems by remember { mutableStateOf<List<DashboardCommentItem>>(emptyList()) }
    var groups by remember { mutableStateOf<List<SocialGroup>>(emptyList()) }
    var selectedGroup by remember { mutableStateOf<SocialGroup?>(null) }
    val currentUserId = repository.currentUserId()
    LaunchedEffect(Unit) {
        loading = true
        val loadedComments = mutableListOf<Pair<Post, SocialComment>>()
        posts.take(20).forEach { post ->
            runCatching { repository.refreshComments(post.id) }.getOrDefault(emptyList()).forEach { loadedComments += post to it }
        }
        commentItems = loadedComments.filter { (_, comment) -> comment.replyToId == null && comment.authorId != currentUserId }.map { (post, comment) ->
            DashboardCommentItem(comment, post, loadedComments.any { (_, reply) -> reply.replyToId == comment.id && reply.authorId == currentUserId })
        }.sortedByDescending { it.comment.createdAt }
        groups = runCatching { repository.groups(mine = true) }.getOrDefault(emptyList())
        loading = false
    }
    selectedGroup?.let { group ->
        DashboardCommunityGroupDetail(repository, group, onBack = { selectedGroup = null }, onPostClick = onPostClick, modifier = modifier)
        return
    }
    Column(modifier.background(Color.White)) {
        LazyRow(contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            items(listOf("Comments", "Groups", "Moderation Assist", "Invites")) { item ->
                Surface(Modifier.clickable { tab = item }, color = if (tab == item) Color(0xFFDDEEFF) else Color.White, shape = RoundedCornerShape(50), tonalElevation = 0.dp) {
                    Text(item, color = if (tab == item) TiwiBlue else Color.Black, modifier = Modifier.padding(horizontal = 15.dp, vertical = 9.dp))
                }
            }
        }
        when (tab) {
            "Comments" -> {
                Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 5.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Surface(Modifier.clickable { unansweredOnly = !unansweredOnly }, color = Color(0xFFDDEEFF), shape = RoundedCornerShape(9.dp), tonalElevation = 0.dp) {
                        Row(Modifier.padding(horizontal = 12.dp, vertical = 9.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Outlined.FilterList, null, tint = TiwiBlue, modifier = Modifier.size(18.dp))
                            Text(if (unansweredOnly) "Not responded" else "All comments", color = TiwiBlue, modifier = Modifier.padding(start = 6.dp))
                        }
                    }
                }
                val visible = if (unansweredOnly) commentItems.filterNot { it.responded } else commentItems
                when {
                    loading -> DashboardLoadingPlaceholder(Modifier.weight(1f))
                    visible.isEmpty() -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { Text(if (unansweredOnly) "No comments need a response." else "No comments yet.", color = Color(0xFF667085)) }
                    else -> LazyColumn(Modifier.weight(1f)) {
                        items(visible, key = { it.comment.id }) { item ->
                            Row(Modifier.fillMaxWidth().clickable { onPostClick(item.post.id) }.padding(horizontal = 16.dp, vertical = 10.dp), verticalAlignment = Alignment.Top) {
                                DecoratedAvatar(item.comment.author.avatar, R.drawable.img_tiwi_avatar_1, item.comment.authorProfile?.avatarDecoration, Modifier.size(46.dp), animateDecoration = false)
                                Column(Modifier.weight(1f).padding(start = 10.dp)) {
                                    Text(item.comment.author.name.ifBlank { item.comment.authorProfile?.username.orEmpty() }, fontWeight = FontWeight.ExtraBold)
                                    Text(item.comment.body, fontSize = 13.sp, lineHeight = 18.sp, maxLines = 3, overflow = TextOverflow.Ellipsis)
                                    Text("${relativePostTime(item.comment.createdAt)} · ${if (item.responded) "Responded" else "Not responded"}", color = if (item.responded) Color(0xFF12B76A) else Color(0xFF667085), fontSize = 11.sp, modifier = Modifier.padding(top = 4.dp))
                                }
                                Icon(Icons.Default.ChevronRight, null, tint = Color(0xFF98A2B3))
                            }
                        }
                    }
                }
            }
            "Groups" -> when {
                loading -> DashboardLoadingPlaceholder(Modifier.weight(1f))
                groups.isEmpty() -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { Text("You have not joined a Tiwi group yet.", color = Color(0xFF667085)) }
                else -> LazyColumn(Modifier.weight(1f)) {
                    items(groups, key = { it.id }) { group ->
                        Row(Modifier.fillMaxWidth().clickable { selectedGroup = group }.padding(horizontal = 16.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                            Box(Modifier.size(52.dp).background(Color(0xFFEAF3FF), RoundedCornerShape(12.dp)), contentAlignment = Alignment.Center) {
                                if (!group.coverUrl.isNullOrBlank()) AsyncImage(group.coverUrl, null, Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                                else Icon(Icons.Outlined.Groups, null, tint = TiwiBlue)
                            }
                            Column(Modifier.weight(1f).padding(start = 11.dp)) {
                                Text(group.name, fontWeight = FontWeight.ExtraBold)
                                Text("${formatCount(group.memberCount)} members · ${group.viewerRole ?: "member"}", color = Color(0xFF667085), fontSize = 12.sp)
                            }
                            Icon(Icons.Default.ChevronRight, "Open group", tint = Color(0xFF98A2B3))
                        }
                    }
                }
            }
            "Moderation Assist" -> LazyColumn(Modifier.weight(1f), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                item {
                    Text("Tiwi Moderation Assist", fontWeight = FontWeight.Black, fontSize = 21.sp)
                    Text("The Tiwi Team automatically checks public content and helps you review conversations around your profile.", color = Color(0xFF667085), fontSize = 13.sp, lineHeight = 18.sp, modifier = Modifier.padding(top = 5.dp))
                }
                item { ProfileDashboardMetric("Comments reviewed", formatCount(commentItems.size), Icons.Outlined.Comment, TiwiBlue, Modifier.fillMaxWidth()) }
                item { ProfileDashboardMetric("Waiting for response", formatCount(commentItems.count { !it.responded }), Icons.Outlined.MarkChatUnread, Color(0xFFF79009), Modifier.fillMaxWidth()) }
            }
            else -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Outlined.MailOutline, null, tint = Color(0xFF98A2B3), modifier = Modifier.size(48.dp))
                    Text("No pending community invites", fontWeight = FontWeight.ExtraBold, modifier = Modifier.padding(top = 11.dp))
                    Text("New Tiwi collaboration and group invitations will appear here.", color = Color(0xFF667085), textAlign = TextAlign.Center, fontSize = 12.sp, modifier = Modifier.padding(horizontal = 34.dp, vertical = 5.dp))
                }
            }
        }
    }
}

@Composable
private fun DashboardLoadingPlaceholder(modifier: Modifier = Modifier) {
    val alpha by rememberInfiniteTransition(label = "dashboard-loading").animateFloat(.35f, .75f, infiniteRepeatable(tween(800), repeatMode = RepeatMode.Reverse), label = "dashboard-loading-alpha")
    Column(modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(13.dp)) {
        repeat(4) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(48.dp).background(Color(0xFFE4E7EC).copy(alpha = alpha), CircleShape))
                Column(Modifier.weight(1f).padding(start = 11.dp), verticalArrangement = Arrangement.spacedBy(7.dp)) {
                    Box(Modifier.fillMaxWidth(.45f).height(12.dp).background(Color(0xFFE4E7EC).copy(alpha = alpha), RoundedCornerShape(6.dp)))
                    Box(Modifier.fillMaxWidth(.82f).height(10.dp).background(Color(0xFFE4E7EC).copy(alpha = alpha), RoundedCornerShape(6.dp)))
                }
            }
        }
    }
}

private data class TiwiMonetizationProgram(val id: String, val title: String, val description: String, val status: String, val icon: ImageVector)

@Composable
private fun DashboardMonetizePage(repository: SocialRepository, profile: SocialProfile, modifier: Modifier = Modifier) {
    val programs = remember {
        listOf(
            TiwiMonetizationProgram("partnership_ads", "Partnership ads", "Manage partner permissions and branded content.", "Ready to set up", Icons.Outlined.Handshake),
            TiwiMonetizationProgram("content_monetization", "Content monetization", "Register interest in earning from eligible Tiwi content.", "Interest form", Icons.Outlined.VideoLibrary),
            TiwiMonetizationProgram("stars", "Stars and gifts", "Let your audience support eligible live and video content.", "Eligibility required", Icons.Outlined.AutoAwesome),
            TiwiMonetizationProgram("subscriptions", "Subscriptions", "Offer monthly supporter benefits when your account qualifies.", "Eligibility required", Icons.Outlined.Subscriptions)
        )
    }
    var tab by remember { mutableStateOf("Ways to earn") }
    var expandedProgram by remember { mutableStateOf<String?>(null) }
    var preferences by remember(profile.preferences) { mutableStateOf(profile.preferences) }
    var interests by remember(profile.preferences) { mutableStateOf(profile.preferences.profileStrings("monetizationInterests").toSet()) }
    var busyProgram by remember { mutableStateOf<String?>(null) }
    val scope = rememberTiwiCoroutineScope()
    val context = LocalContext.current
    fun toggleInterest(program: TiwiMonetizationProgram) {
        if (busyProgram != null) return
        val updated = if (program.id in interests) interests - program.id else interests + program.id
        scope.launch {
            busyProgram = program.id
            val updatedPreferences = if (updated.isEmpty()) preferences - "monetizationInterests" else preferences + ("monetizationInterests" to updated.toList())
            runCatching { repository.updateProfile(mapOf("preferences" to updatedPreferences)) }
                .onSuccess {
                    preferences = updatedPreferences
                    interests = updated
                    Toast.makeText(context, if (program.id in updated) "Interest submitted to the Tiwi Team" else "Interest removed", Toast.LENGTH_SHORT).show()
                }
                .onFailure { Toast.makeText(context, it.message ?: "Request could not be saved", Toast.LENGTH_LONG).show() }
            busyProgram = null
        }
    }
    LazyColumn(modifier.background(Color.White), contentPadding = PaddingValues(bottom = 18.dp)) {
        item {
            Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp), horizontalArrangement = Arrangement.spacedBy(9.dp)) {
                listOf("Ways to earn", "Where to start").forEach { item ->
                    Surface(Modifier.clickable { tab = item }.weight(1f), color = if (tab == item) Color(0xFFDDEEFF) else Color.White, shape = RoundedCornerShape(50), tonalElevation = 0.dp) {
                        Text(item, color = if (tab == item) TiwiBlue else Color.Black, textAlign = TextAlign.Center, modifier = Modifier.padding(vertical = 10.dp))
                    }
                }
            }
        }
        if (tab == "Where to start") {
            item {
                Column(Modifier.padding(17.dp)) {
                    Text("Start earning on Tiwi", fontWeight = FontWeight.Black, fontSize = 22.sp)
                    Text("Complete these creator basics. Final eligibility and regional availability are reviewed by the Tiwi Team.", color = Color(0xFF667085), fontSize = 13.sp, lineHeight = 18.sp, modifier = Modifier.padding(top = 5.dp))
                }
            }
            item { MonetizeCriterion("Publish at least 3 posts", postsReady = profile.postCount >= 3, detail = "${profile.postCount}/3 posts") }
            item { MonetizeCriterion("Build your audience", postsReady = profile.followerCount >= 100, detail = "${formatCount(profile.followerCount)}/100 followers") }
            item { MonetizeCriterion("Keep your account in good standing", postsReady = profile.user.status == "active", detail = if (profile.user.status == "active") "Account active" else "Account review required") }
            item { MonetizeCriterion("Submit program interest", postsReady = interests.isNotEmpty(), detail = if (interests.isEmpty()) "Choose a program under Ways to earn" else "${interests.size} program selected") }
        } else {
            item {
                Text("Updates", fontWeight = FontWeight.Black, fontSize = 22.sp, modifier = Modifier.padding(horizontal = 17.dp, vertical = 12.dp))
                LazyRow(contentPadding = PaddingValues(horizontal = 17.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    item {
                        Surface(Modifier.width(270.dp), color = Color.White, border = BorderStroke(1.dp, Color(0xFFE4E7EC)), shape = RoundedCornerShape(16.dp), tonalElevation = 0.dp) {
                            Column(Modifier.padding(15.dp)) {
                                Icon(Icons.Outlined.Paid, null, modifier = Modifier.size(25.dp))
                                Text("Submit your interest for Tiwi monetization", fontWeight = FontWeight.ExtraBold, fontSize = 17.sp, lineHeight = 20.sp, modifier = Modifier.padding(top = 12.dp))
                                Text("The Tiwi Team will review eligibility and notify you when a program becomes available.", color = Color(0xFF667085), fontSize = 12.sp, lineHeight = 17.sp, modifier = Modifier.padding(top = 6.dp))
                            }
                        }
                    }
                    item {
                        Surface(Modifier.width(270.dp), color = Color.White, border = BorderStroke(1.dp, Color(0xFFE4E7EC)), shape = RoundedCornerShape(16.dp), tonalElevation = 0.dp) {
                            Column(Modifier.padding(15.dp)) {
                                Icon(Icons.Outlined.Groups, null, modifier = Modifier.size(25.dp))
                                Text("Turn ideas into audience value", fontWeight = FontWeight.ExtraBold, fontSize = 17.sp, lineHeight = 20.sp, modifier = Modifier.padding(top = 12.dp))
                                Text("Use original posts, reels and live content to build an eligible Tiwi creator profile.", color = Color(0xFF667085), fontSize = 12.sp, lineHeight = 17.sp, modifier = Modifier.padding(top = 6.dp))
                            }
                        }
                    }
                }
            }
            item { Text("Monetization programs", fontWeight = FontWeight.Black, fontSize = 22.sp, modifier = Modifier.padding(horizontal = 17.dp, vertical = 17.dp)) }
            items(programs, key = { it.id }) { program ->
                val expanded = expandedProgram == program.id
                val interested = program.id in interests
                Column(Modifier.fillMaxWidth().clickable { expandedProgram = if (expanded) null else program.id }.padding(horizontal = 17.dp, vertical = 10.dp)) {
                    Row(verticalAlignment = Alignment.Top) {
                        Icon(program.icon, null, modifier = Modifier.size(29.dp))
                        Column(Modifier.weight(1f).padding(start = 13.dp)) {
                            Text(program.title, fontWeight = FontWeight.ExtraBold, fontSize = 17.sp)
                            Text(program.description, fontSize = 13.sp, lineHeight = 18.sp)
                            Text(if (interested) "Interest submitted" else program.status, color = if (interested) Color(0xFF12B76A) else Color(0xFF667085), fontSize = 12.sp, modifier = Modifier.padding(top = 3.dp))
                        }
                        Icon(if (expanded) Icons.Default.KeyboardArrowUp else Icons.Default.ChevronRight, null, tint = Color(0xFF667085))
                    }
                    if (expanded) {
                        Text("Availability depends on account standing, audience activity, original content and supported country. The Tiwi Team makes the final decision.", color = Color(0xFF667085), fontSize = 12.sp, lineHeight = 17.sp, modifier = Modifier.padding(start = 42.dp, top = 10.dp))
                        Button(
                            onClick = { toggleInterest(program) },
                            enabled = busyProgram == null,
                            modifier = Modifier.fillMaxWidth().padding(start = 42.dp, top = 10.dp),
                            shape = RoundedCornerShape(9.dp),
                            elevation = ButtonDefaults.buttonElevation(0.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = if (interested) Color(0xFFEEF0F3) else TiwiBlue, contentColor = if (interested) Color.Black else Color.White)
                        ) {
                            if (busyProgram == program.id) CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
                            else Text(if (interested) "Withdraw interest" else "Submit interest", fontWeight = FontWeight.ExtraBold)
                        }
                    }
                }
            }
            item {
                Text("Learning on Tiwi", fontWeight = FontWeight.Black, fontSize = 21.sp, modifier = Modifier.padding(horizontal = 17.dp, vertical = 14.dp))
                Text("Creator guidance and program updates will appear here from the Tiwi Team.", color = Color(0xFF667085), fontSize = 12.sp, modifier = Modifier.padding(horizontal = 17.dp))
            }
        }
        item { Spacer(Modifier.navigationBarsPadding().height(8.dp)) }
    }
}

@Composable
private fun MonetizeCriterion(title: String, postsReady: Boolean, detail: String) {
    Row(Modifier.fillMaxWidth().padding(horizontal = 17.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
        Icon(if (postsReady) Icons.Default.CheckCircle else Icons.Outlined.RadioButtonUnchecked, null, tint = if (postsReady) Color(0xFF12B76A) else Color(0xFF98A2B3), modifier = Modifier.size(27.dp))
        Column(Modifier.padding(start = 12.dp)) {
            Text(title, fontWeight = FontWeight.ExtraBold)
            Text(detail, color = Color(0xFF667085), fontSize = 12.sp)
        }
    }
}

@Composable
private fun ProfileSkeleton(onBack: () -> Unit, loading: Boolean) {
    val alpha by rememberInfiniteTransition(label = "profile-skeleton").animateFloat(
        initialValue = .4f, targetValue = .8f,
        animationSpec = infiniteRepeatable(tween(850), repeatMode = RepeatMode.Reverse), label = "profile-alpha"
    )
    val color = Color(0xFFDDE1E6).copy(alpha = alpha)
    Column(Modifier.fillMaxSize().background(Color.White)) {
        Row(Modifier.statusBarsPadding().height(48.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") }
            Box(Modifier.width(120.dp).height(13.dp).background(color, RoundedCornerShape(6.dp)))
        }
        Box(Modifier.fillMaxWidth().height(132.dp).background(color))
        Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(86.dp).background(color, CircleShape))
            Row(Modifier.weight(1f), horizontalArrangement = Arrangement.SpaceEvenly) { repeat(3) { Box(Modifier.width(58.dp).height(28.dp).background(color, RoundedCornerShape(6.dp))) } }
        }
        Column(Modifier.padding(horizontal = 14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Box(Modifier.width(150.dp).height(16.dp).background(color, RoundedCornerShape(6.dp)))
            Box(Modifier.fillMaxWidth(.72f).height(12.dp).background(color, RoundedCornerShape(6.dp)))
            Box(Modifier.fillMaxWidth().height(36.dp).background(color, RoundedCornerShape(7.dp)))
        }
        if (!loading) Text("This profile is unavailable.", color = Color.Gray, modifier = Modifier.padding(14.dp))
    }
}

@Composable
private fun ProfileOptionsPage(
    repository: SocialRepository,
    profile: SocialProfile?,
    isOwn: Boolean,
    onBack: () -> Unit,
    onEdit: () -> Unit,
    onMessage: () -> Unit,
    onProfileClosed: () -> Unit
) {
    val scope = rememberTiwiCoroutineScope()
    val context = LocalContext.current
    val userId = profile?.userId.orEmpty()
    val name = profile?.user?.name?.ifBlank { profile?.username.orEmpty() } ?: "Profile"
    var busy by remember { mutableStateOf(false) }
    fun copyProfileLink() {
        val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        clipboard.setPrimaryClip(ClipData.newPlainText("Tiwi profile", "https://tiwlo.com/social/profile/$userId"))
        Toast.makeText(context, "Profile link copied", Toast.LENGTH_SHORT).show()
    }
    Column(Modifier.fillMaxSize().background(Color.White).statusBarsPadding()) {
        Row(Modifier.fillMaxWidth().height(52.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") }
            Text(if (isOwn) "Profile settings" else "$name's profile", Modifier.weight(1f), fontWeight = FontWeight.Bold, fontSize = 19.sp, maxLines = 1)
        }
        HorizontalDivider(color = Color(0xFFE4E7EC))
        Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            DecoratedAvatar(profile?.user?.avatar, R.drawable.img_tiwi_avatar_1, profile?.avatarDecoration, Modifier.size(64.dp), animateDecoration = true)
            Column(Modifier.padding(start = 12.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) { Text(name, fontWeight = FontWeight.Bold, fontSize = 17.sp); if (profile?.verified == true) VerifiedBadge(profile.badgeType, 17.dp, Modifier.padding(start = 4.dp)) }
                Text("@${profile?.username.orEmpty()}", color = Color.Gray)
            }
        }
        HorizontalDivider(color = Color(0xFFF0F2F5), thickness = 8.dp)
        LazyColumn(Modifier.weight(1f).padding(horizontal = 10.dp)) {
            if (isOwn) item { PostActionRow(Icons.Outlined.Edit, "Edit profile", "Photo, bio, links and public details", onEdit) }
            item { PostActionRow(Icons.Outlined.Share, "Share profile", "Send this profile through any app", onClick = { shareDeepLink(context, "$name on Tiwi", profile?.bio.orEmpty(), "https://tiwlo.com/social/profile/$userId") }) }
            item { PostActionRow(Icons.Outlined.ContentCopy, "Copy profile link", "Copy a direct Tiwi deep link", ::copyProfileLink) }
            if (!isOwn) {
                item { PostActionRow(Icons.AutoMirrored.Outlined.Send, "Message $name", "Start a chat or send a message request", onMessage) }
                item { PostActionRow(Icons.Outlined.StarOutline, "Add to Favorites", "Show this person's posts higher in Feed", onClick = { scope.launch { runCatching { repository.favoriteUser(userId, true) }.onSuccess { Toast.makeText(context, "Added to Favorites", Toast.LENGTH_SHORT).show() } } }) }
                item { PostActionRow(Icons.Outlined.Snooze, "Snooze for 30 days", "Temporarily hide this person's posts", onClick = { scope.launch { runCatching { repository.snoozeUser(userId, 30) }.onSuccess { onProfileClosed() } } }) }
                item { PostActionRow(Icons.Outlined.Flag, "Find support or report", "Report impersonation, harassment or another issue", onClick = { scope.launch { runCatching { repository.reportContent("profile", userId, "impersonation_or_abuse") }.onSuccess { Toast.makeText(context, "Report sent to Tiwi moderators", Toast.LENGTH_SHORT).show() } } }) }
                item { PostActionRow(Icons.Outlined.Block, "Block $name", "Stops following and prevents profile, Feed and new-message access", {
                    if (!busy) scope.launch {
                        busy = true
                        runCatching { repository.blockUser(userId, true, "Blocked from profile options") }
                            .onSuccess { Toast.makeText(context, "$name blocked", Toast.LENGTH_SHORT).show(); onProfileClosed() }
                            .onFailure { Toast.makeText(context, it.message ?: "Block failed", Toast.LENGTH_LONG).show() }
                        busy = false
                    }
                }, Color(0xFFB42318)) }
            }
            item { Spacer(Modifier.navigationBarsPadding().height(18.dp)) }
        }
    }
}

private val PROFILE_CATEGORY_OPTIONS = listOf(
    "Digital creator", "Public figure", "Artist", "Musician", "Blogger", "Gamer",
    "Photographer", "Entrepreneur", "Business", "Organization", "Community", "Personal profile"
)
private val PROFILE_PINNED_OPTIONS = listOf("Category", "Location", "Website", "Social media", "Work", "Education")
private val PROFILE_RELATIONSHIP_OPTIONS = listOf("Single", "In a relationship", "Engaged", "Married", "It's complicated", "Prefer not to say")
private val PROFILE_GENDER_OPTIONS = listOf("Woman", "Man", "Non-binary", "Prefer not to say")
private val PROFILE_LANGUAGE_OPTIONS = listOf("Bangla", "English", "Hindi", "Urdu", "Arabic", "Spanish", "French", "German")
private val PROFILE_HOBBY_OPTIONS = listOf("Photography", "Travel", "Reading", "Cooking", "Fitness", "Gaming", "Gardening", "Technology", "Fashion", "Art")
private val PROFILE_INTEREST_OPTIONS = listOf("Music", "TV shows", "Movies", "Games", "Sports teams and athletes", "Technology", "Business", "News", "Food", "Travel")

private fun Map<String, Any?>.profileString(key: String): String = this[key]?.toString()?.takeUnless { it == "null" }.orEmpty()
private fun Map<String, Any?>.profileStrings(key: String): List<String> = (this[key] as? List<*>)?.mapNotNull { it?.toString() }.orEmpty()
private fun Map<String, Any?>.profileObjects(key: String): List<Map<String, Any?>> =
    (this[key] as? List<*>)?.mapNotNull { item ->
        (item as? Map<*, *>)?.entries?.associate { (mapKey, value) -> mapKey.toString() to value }
    }.orEmpty()

@Composable
private fun ProfileEditSection(title: String, content: @Composable ColumnScope.() -> Unit) {
    Column(Modifier.fillMaxWidth().padding(top = 10.dp)) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 18.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(title, Modifier.weight(1f), fontWeight = FontWeight.ExtraBold, fontSize = 18.sp, color = Color(0xFF101828))
            Icon(Icons.Default.KeyboardArrowUp, null, tint = Color(0xFF344054))
        }
        content()
    }
}

@Composable
private fun ProfileEditRow(
    icon: ImageVector,
    title: String,
    value: String,
    enabled: Boolean = true,
    onClick: () -> Unit = {}
) {
    Row(
        Modifier.fillMaxWidth().clickable(enabled = enabled, onClick = onClick).padding(horizontal = 18.dp, vertical = 11.dp),
        verticalAlignment = Alignment.Top
    ) {
        Icon(icon, null, tint = if (enabled) Color.Black else Color(0xFF98A2B3), modifier = Modifier.size(29.dp))
        Column(Modifier.weight(1f).padding(start = 15.dp)) {
            Text(title, fontWeight = FontWeight.Bold, fontSize = 15.sp, color = if (enabled) Color(0xFF101828) else Color(0xFF667085))
            if (value.isNotBlank()) Text(value, color = Color(0xFF667085), fontSize = 13.sp, lineHeight = 17.sp, modifier = Modifier.padding(top = 2.dp))
        }
        if (enabled) Icon(Icons.Outlined.Edit, "Edit $title", tint = Color(0xFF667085), modifier = Modifier.size(22.dp))
    }
}

@Composable
private fun ProfileTextEditorPage(
    title: String,
    value: String,
    placeholder: String,
    maxLength: Int,
    multiline: Boolean,
    onBack: () -> Unit,
    onSave: (String) -> Unit
) {
    var draft by remember(title, value) { mutableStateOf(value) }
    Column(Modifier.fillMaxSize().background(Color.White).statusBarsPadding().imePadding()) {
        Row(Modifier.fillMaxWidth().height(54.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") }
            Text(title, Modifier.weight(1f), textAlign = TextAlign.Center, fontWeight = FontWeight.ExtraBold, fontSize = 19.sp)
            TextButton(onClick = { onSave(draft.trim()) }) { Text("Save", fontWeight = FontWeight.Bold, color = TiwiBlue) }
        }
        HorizontalDivider(color = Color(0xFFE4E7EC), thickness = .5.dp)
        OutlinedTextField(
            value = draft,
            onValueChange = { draft = it.take(maxLength) },
            placeholder = { Text(placeholder) },
            minLines = if (multiline) 5 else 1,
            singleLine = !multiline,
            supportingText = { Text("${draft.length}/$maxLength") },
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            shape = RoundedCornerShape(14.dp)
        )
    }
}

@Composable
private fun ProfileOptionEditorPage(
    title: String,
    options: List<String>,
    selected: Set<String>,
    multiple: Boolean,
    onBack: () -> Unit,
    onSave: (Set<String>) -> Unit
) {
    var draft by remember(title, selected) { mutableStateOf(selected) }
    Column(Modifier.fillMaxSize().background(Color.White).statusBarsPadding()) {
        Row(Modifier.fillMaxWidth().height(54.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") }
            Text(title, Modifier.weight(1f), textAlign = TextAlign.Center, fontWeight = FontWeight.ExtraBold, fontSize = 19.sp)
            TextButton(onClick = { onSave(draft) }) { Text("Save", fontWeight = FontWeight.Bold, color = TiwiBlue) }
        }
        HorizontalDivider(color = Color(0xFFE4E7EC), thickness = .5.dp)
        Text(if (multiple) "Choose all that apply" else "Choose one option", color = Color(0xFF667085), fontSize = 12.sp, modifier = Modifier.padding(horizontal = 18.dp, vertical = 12.dp))
        LazyColumn {
            items(options, key = { it }) { option ->
                val checked = option in draft
                Row(
                    Modifier.fillMaxWidth().clickable {
                        draft = if (multiple) {
                            if (checked) draft - option else draft + option
                        } else setOf(option)
                    }.padding(horizontal = 18.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(option, Modifier.weight(1f), fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                    if (multiple) Checkbox(checked, onCheckedChange = { isChecked -> draft = if (isChecked) draft + option else draft - option })
                    else RadioButton(checked, onClick = { draft = setOf(option) })
                }
            }
        }
    }
}

@Composable
private fun ProfileFamilyEditorPage(
    connections: List<SocialProfile>,
    selected: Set<String>,
    onBack: () -> Unit,
    onSave: (Set<String>) -> Unit
) {
    var draft by remember(selected) { mutableStateOf(selected) }
    Column(Modifier.fillMaxSize().background(Color.White).statusBarsPadding()) {
        Row(Modifier.fillMaxWidth().height(54.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") }
            Text("Family members", Modifier.weight(1f), textAlign = TextAlign.Center, fontWeight = FontWeight.ExtraBold, fontSize = 19.sp)
            TextButton(onClick = { onSave(draft) }) { Text("Save", color = TiwiBlue, fontWeight = FontWeight.Bold) }
        }
        HorizontalDivider(color = Color(0xFFE4E7EC), thickness = .5.dp)
        Text(
            "Choose family members from My Connections. You can add or remove them any time.",
            color = Color(0xFF667085),
            fontSize = 12.sp,
            lineHeight = 17.sp,
            modifier = Modifier.padding(horizontal = 17.dp, vertical = 13.dp)
        )
        if (connections.isEmpty()) {
            Column(Modifier.fillMaxSize().padding(28.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                Icon(Icons.Outlined.FamilyRestroom, null, tint = Color(0xFF98A2B3), modifier = Modifier.size(46.dp))
                Text("No mutual connections yet", fontWeight = FontWeight.ExtraBold, fontSize = 17.sp, modifier = Modifier.padding(top = 12.dp))
                Text("When someone you follow follows you back, they can be selected here.", color = Color(0xFF667085), textAlign = TextAlign.Center, fontSize = 12.sp, lineHeight = 17.sp, modifier = Modifier.padding(top = 5.dp))
            }
        } else LazyColumn(Modifier.weight(1f)) {
            items(connections, key = { it.userId }) { connection ->
                val checked = connection.userId in draft
                Row(
                    Modifier.fillMaxWidth().clickable { draft = if (checked) draft - connection.userId else draft + connection.userId }
                        .padding(horizontal = 17.dp, vertical = 9.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    DecoratedAvatar(connection.user.avatar, R.drawable.img_tiwi_avatar_1, connection.avatarDecoration, Modifier.size(52.dp), animateDecoration = false)
                    Column(Modifier.weight(1f).padding(start = 12.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(connection.user.name.ifBlank { connection.username }, fontWeight = FontWeight.ExtraBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                            if (connection.verified) VerifiedBadge(connection.badgeType, 14.dp, Modifier.padding(start = 3.dp))
                        }
                        Text("@${connection.username}", color = Color(0xFF667085), fontSize = 12.sp)
                    }
                    Checkbox(checked = checked, onCheckedChange = { enabled -> draft = if (enabled) draft + connection.userId else draft - connection.userId })
                }
            }
            item { Spacer(Modifier.navigationBarsPadding().height(12.dp)) }
        }
    }
}

@Composable
private fun ProfileSocialLinksEditorPage(
    links: List<Map<String, Any?>>,
    onBack: () -> Unit,
    onSave: (List<Map<String, Any?>>) -> Unit
) {
    var draft by remember(links) { mutableStateOf(links) }
    var label by remember { mutableStateOf("") }
    var url by remember { mutableStateOf("") }
    var editingIndex by remember { mutableIntStateOf(-1) }
    val valid = label.isNotBlank() && url.isNotBlank()
    fun clearEditor() {
        label = ""
        url = ""
        editingIndex = -1
    }
    fun commitLink() {
        if (!valid) return
        val value = mapOf<String, Any?>("label" to label.trim(), "url" to url.trim())
        draft = if (editingIndex in draft.indices) draft.mapIndexed { index, item -> if (index == editingIndex) value else item }
        else draft + value
        clearEditor()
    }
    Column(Modifier.fillMaxSize().background(Color.White).statusBarsPadding().imePadding()) {
        Row(Modifier.fillMaxWidth().height(54.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") }
            Text("Social links", Modifier.weight(1f), textAlign = TextAlign.Center, fontWeight = FontWeight.ExtraBold, fontSize = 19.sp)
            TextButton(onClick = { onSave(draft) }) { Text("Save", color = TiwiBlue, fontWeight = FontWeight.Bold) }
        }
        HorizontalDivider(color = Color(0xFFE4E7EC), thickness = .5.dp)
        Column(Modifier.padding(horizontal = 16.dp, vertical = 12.dp)) {
            Text(if (editingIndex >= 0) "Edit link" else "Add a social link", fontWeight = FontWeight.ExtraBold, fontSize = 17.sp)
            OutlinedTextField(
                value = label,
                onValueChange = { label = it.take(50) },
                label = { Text("Name") },
                placeholder = { Text("Instagram, YouTube, Portfolio") },
                singleLine = true,
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth().padding(top = 9.dp)
            )
            OutlinedTextField(
                value = url,
                onValueChange = { url = it.take(500) },
                label = { Text("Link") },
                placeholder = { Text("https://example.com/your-name") },
                singleLine = true,
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth().padding(top = 8.dp)
            )
            Row(Modifier.fillMaxWidth().padding(top = 9.dp), horizontalArrangement = Arrangement.End) {
                if (editingIndex >= 0) TextButton(onClick = ::clearEditor) { Text("Cancel", color = Color(0xFF667085)) }
                Button(
                    onClick = ::commitLink,
                    enabled = valid,
                    shape = RoundedCornerShape(9.dp),
                    elevation = ButtonDefaults.buttonElevation(0.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = TiwiBlue)
                ) { Text(if (editingIndex >= 0) "Update link" else "Add link", fontWeight = FontWeight.Bold) }
            }
        }
        HorizontalDivider(color = Color(0xFFF0F2F5), thickness = 8.dp)
        Text("Your links", fontWeight = FontWeight.ExtraBold, fontSize = 17.sp, modifier = Modifier.padding(horizontal = 17.dp, vertical = 12.dp))
        if (draft.isEmpty()) {
            Text("No social links added.", color = Color(0xFF667085), fontSize = 13.sp, modifier = Modifier.padding(horizontal = 17.dp))
        } else LazyColumn(Modifier.weight(1f)) {
            itemsIndexed(draft) { index, link ->
                val linkLabel = link["label"]?.toString().orEmpty()
                val linkUrl = link["url"]?.toString().orEmpty()
                Row(
                    Modifier.fillMaxWidth().clickable {
                        label = linkLabel
                        url = linkUrl
                        editingIndex = index
                    }.padding(horizontal = 17.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(Modifier.size(42.dp).background(Color(0xFFEAF3FF), CircleShape), contentAlignment = Alignment.Center) {
                        Icon(Icons.Outlined.Link, null, tint = TiwiBlue)
                    }
                    Column(Modifier.weight(1f).padding(start = 12.dp)) {
                        Text(linkLabel, fontWeight = FontWeight.ExtraBold)
                        Text(linkUrl, color = Color(0xFF667085), fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                    IconButton(onClick = {
                        draft = draft.filterIndexed { itemIndex, _ -> itemIndex != index }
                        if (editingIndex == index) clearEditor()
                    }) { Icon(Icons.Outlined.Delete, "Remove link", tint = Color(0xFFD92D20)) }
                }
            }
            item { Spacer(Modifier.navigationBarsPadding().height(12.dp)) }
        }
    }
}

private data class PreparedProfilePhoto(val uri: Uri, val file: File)

internal data class ProfileCropRect(val left: Int, val top: Int, val width: Int, val height: Int)

internal fun calculateProfileCropRect(
    sourceWidth: Int,
    sourceHeight: Int,
    viewportWidth: Int,
    viewportHeight: Int,
    zoom: Float,
    translationX: Float,
    translationY: Float
): ProfileCropRect {
    val safeSourceWidth = sourceWidth.coerceAtLeast(1)
    val safeSourceHeight = sourceHeight.coerceAtLeast(1)
    val viewWidth = viewportWidth.coerceAtLeast(1).toFloat()
    val viewHeight = viewportHeight.coerceAtLeast(1).toFloat()
    val effectiveScale = maxOf(viewWidth / safeSourceWidth, viewHeight / safeSourceHeight) * zoom.coerceIn(1f, 5f)
    val cropWidth = (viewWidth / effectiveScale).toInt().coerceIn(1, safeSourceWidth)
    val cropHeight = (viewHeight / effectiveScale).toInt().coerceIn(1, safeSourceHeight)
    val centerX = safeSourceWidth / 2f - translationX / effectiveScale
    val centerY = safeSourceHeight / 2f - translationY / effectiveScale
    return ProfileCropRect(
        left = (centerX - cropWidth / 2f).toInt().coerceIn(0, (safeSourceWidth - cropWidth).coerceAtLeast(0)),
        top = (centerY - cropHeight / 2f).toInt().coerceIn(0, (safeSourceHeight - cropHeight).coerceAtLeast(0)),
        width = cropWidth,
        height = cropHeight
    )
}

private suspend fun prepareProfilePhotoCrop(
    context: Context,
    uri: Uri,
    kind: String,
    zoom: Float,
    translationX: Float,
    translationY: Float,
    viewportWidth: Int,
    viewportHeight: Int
): PreparedProfilePhoto = withContext(Dispatchers.IO) {
    val resolver = context.contentResolver
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    resolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, bounds) }
    if (bounds.outWidth <= 0 || bounds.outHeight <= 0) throw IllegalArgumentException("Selected photo could not be opened")
    var sample = 1
    while (bounds.outWidth / sample > 4096 || bounds.outHeight / sample > 4096) sample *= 2
    val source = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
        ImageDecoder.decodeBitmap(ImageDecoder.createSource(resolver, uri)) { decoder, _, _ ->
            decoder.allocator = ImageDecoder.ALLOCATOR_SOFTWARE
            decoder.setTargetSampleSize(sample)
        }
    } else {
        resolver.openInputStream(uri)?.use {
            BitmapFactory.decodeStream(it, null, BitmapFactory.Options().apply { inSampleSize = sample })
        } ?: throw IllegalArgumentException("Selected photo could not be decoded")
    }
    try {
        val crop = calculateProfileCropRect(
            source.width,
            source.height,
            viewportWidth,
            viewportHeight,
            zoom,
            translationX,
            translationY
        )
        val cropped = Bitmap.createBitmap(source, crop.left, crop.top, crop.width, crop.height)
        try {
            val maxWidth = if (kind == "cover") 1600 else 1080
            val maxHeight = if (kind == "cover") 700 else 1080
            val outputScale = minOf(1f, maxWidth.toFloat() / cropped.width, maxHeight.toFloat() / cropped.height)
            val output = if (outputScale < 1f) {
                Bitmap.createScaledBitmap(
                    cropped,
                    (cropped.width * outputScale).toInt().coerceAtLeast(1),
                    (cropped.height * outputScale).toInt().coerceAtLeast(1),
                    true
                )
            } else cropped
            try {
                val file = File(context.cacheDir, "tiwi-${kind}-crop-${System.currentTimeMillis()}.jpg")
                file.outputStream().use { stream ->
                    if (!output.compress(Bitmap.CompressFormat.JPEG, 92, stream)) {
                        throw IllegalStateException("Photo crop could not be saved")
                    }
                }
                PreparedProfilePhoto(
                    FileProvider.getUriForFile(context, "${context.packageName}.files", file),
                    file
                )
            } finally {
                if (output !== cropped) output.recycle()
            }
        } finally {
            if (cropped !== source) cropped.recycle()
        }
    } finally {
        source.recycle()
    }
}

@Composable
private fun ProfilePhotoCropPage(
    uri: Uri,
    kind: String,
    busy: Boolean,
    onCancel: () -> Unit,
    onApply: (Float, Float, Float, Int, Int) -> Unit
) {
    val context = LocalContext.current
    val cover = kind == "cover"
    var zoom by remember(uri) { mutableFloatStateOf(1f) }
    var translationX by remember(uri) { mutableFloatStateOf(0f) }
    var translationY by remember(uri) { mutableFloatStateOf(0f) }
    var viewportWidth by remember(uri) { mutableIntStateOf(1) }
    var viewportHeight by remember(uri) { mutableIntStateOf(1) }
    var sourceWidth by remember(uri) { mutableIntStateOf(1) }
    var sourceHeight by remember(uri) { mutableIntStateOf(1) }

    LaunchedEffect(uri) {
        val size = withContext(Dispatchers.IO) {
            val options = BitmapFactory.Options().apply { inJustDecodeBounds = true }
            context.contentResolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, options) }
            options.outWidth.coerceAtLeast(1) to options.outHeight.coerceAtLeast(1)
        }
        sourceWidth = size.first
        sourceHeight = size.second
    }
    BackHandler(enabled = !busy, onBack = onCancel)

    fun clampTranslation(nextZoom: Float, nextX: Float, nextY: Float): Pair<Float, Float> {
        val width = viewportWidth.coerceAtLeast(1).toFloat()
        val height = viewportHeight.coerceAtLeast(1).toFloat()
        val baseScale = maxOf(width / sourceWidth.coerceAtLeast(1), height / sourceHeight.coerceAtLeast(1))
        val maxX = ((sourceWidth * baseScale * nextZoom - width) / 2f).coerceAtLeast(0f)
        val maxY = ((sourceHeight * baseScale * nextZoom - height) / 2f).coerceAtLeast(0f)
        return nextX.coerceIn(-maxX, maxX) to nextY.coerceIn(-maxY, maxY)
    }

    Column(Modifier.fillMaxSize().background(Color.White).statusBarsPadding().navigationBarsPadding()) {
        Row(Modifier.fillMaxWidth().height(56.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(enabled = !busy, onClick = onCancel) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Cancel") }
            Text(
                if (cover) "Adjust cover photo" else "Adjust profile photo",
                modifier = Modifier.weight(1f),
                textAlign = TextAlign.Center,
                fontWeight = FontWeight.ExtraBold,
                fontSize = 18.sp
            )
            TextButton(
                enabled = !busy,
                onClick = { onApply(zoom, translationX, translationY, viewportWidth, viewportHeight) }
            ) {
                if (busy) CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
                else Text("Use photo", color = TiwiBlue, fontWeight = FontWeight.Bold)
            }
        }
        HorizontalDivider(thickness = .5.dp, color = Color(0xFFE4E7EC))
        Column(
            Modifier.fillMaxSize().padding(horizontal = if (cover) 12.dp else 30.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            val shape = if (cover) RoundedCornerShape(18.dp) else CircleShape
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(if (cover) 16f / 7f else 1f)
                    .onGloballyPositioned {
                        viewportWidth = it.size.width.coerceAtLeast(1)
                        viewportHeight = it.size.height.coerceAtLeast(1)
                    }
                    .clip(shape)
                    .background(Color.Black)
                    .pointerInput(uri, sourceWidth, sourceHeight, viewportWidth, viewportHeight) {
                        detectTransformGestures { _, pan, gestureZoom, _ ->
                            val nextZoom = (zoom * gestureZoom).coerceIn(1f, 5f)
                            val clamped = clampTranslation(nextZoom, translationX + pan.x, translationY + pan.y)
                            zoom = nextZoom
                            translationX = clamped.first
                            translationY = clamped.second
                        }
                    }
            ) {
                AsyncImage(
                    model = uri,
                    contentDescription = "Photo crop preview",
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize().graphicsLayer(
                        scaleX = zoom,
                        scaleY = zoom,
                        translationX = translationX,
                        translationY = translationY
                    )
                )
                Box(Modifier.fillMaxSize().border(2.dp, Color.White.copy(alpha = .9f), shape))
            }
            Text("Pinch to zoom · drag to reposition", color = Color(0xFF65676B), fontSize = 13.sp, modifier = Modifier.padding(top = 18.dp))
            TextButton(enabled = !busy && (zoom != 1f || translationX != 0f || translationY != 0f), onClick = {
                zoom = 1f
                translationX = 0f
                translationY = 0f
            }) { Text("Reset", color = TiwiBlue, fontWeight = FontWeight.Bold) }
        }
    }
}

@Composable
private fun EditProfilePage(repository: SocialRepository, profile: SocialProfile?, onBack: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberTiwiCoroutineScope()
    var username by remember(profile) { mutableStateOf(profile?.username.orEmpty()) }
    var bio by remember(profile) { mutableStateOf(profile?.bio.orEmpty()) }
    var about by remember(profile) { mutableStateOf(profile?.about.orEmpty()) }
    var category by remember(profile) { mutableStateOf(profile?.category.orEmpty()) }
    var website by remember(profile) { mutableStateOf(profile?.website.orEmpty()) }
    var location by remember(profile) { mutableStateOf(profile?.location.orEmpty()) }
    var preferences by remember(profile) { mutableStateOf(profile?.preferences ?: emptyMap()) }
    var avatarUrl by remember(profile) { mutableStateOf(profile?.user?.avatar) }
    var coverUrl by remember(profile) { mutableStateOf(profile?.coverUrl) }
    var avatarDecoration by remember(profile) { mutableStateOf(profile?.avatarDecoration) }
    var profileEffect by remember(profile) { mutableStateOf(profile?.profileEffect) }
    var showDecorations by remember { mutableStateOf(false) }
    var showEffects by remember { mutableStateOf(false) }
    var activeEditor by remember { mutableStateOf<String?>(null) }
    var pendingPhoto by remember { mutableStateOf<Pair<Uri, String>?>(null) }
    var busy by remember { mutableStateOf(false) }
    var decorationCatalogAvailable by remember { mutableStateOf(false) }
    var effectCatalogAvailable by remember { mutableStateOf(false) }
    var availableConnections by remember(profile?.userId) { mutableStateOf<List<SocialProfile>>(emptyList()) }
    LaunchedEffect(Unit) {
        decorationCatalogAvailable = runCatching { repository.profileDecorations().isNotEmpty() }.getOrDefault(false)
        effectCatalogAvailable = runCatching { repository.profileEffects().isNotEmpty() }.getOrDefault(false)
    }
    LaunchedEffect(profile?.userId) {
        availableConnections = runCatching { repository.connections(profile?.userId, 100) }.getOrDefault(emptyList())
    }
    val avatarPicker = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
        uri?.let { pendingPhoto = it to "profile" }
    }
    val coverPicker = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
        uri?.let { pendingPhoto = it to "cover" }
    }
    pendingPhoto?.let { (uri, kind) ->
        ProfilePhotoCropPage(
            uri = uri,
            kind = kind,
            busy = busy,
            onCancel = { pendingPhoto = null },
            onApply = { zoom, translationX, translationY, width, height ->
                if (!busy) scope.launch {
                    busy = true
                    var prepared: PreparedProfilePhoto? = null
                    runCatching {
                        prepareProfilePhotoCrop(context, uri, kind, zoom, translationX, translationY, width, height).also { prepared = it }
                    }.mapCatching {
                        repository.uploadMedia(context.contentResolver, it.uri, kind).url
                    }.onSuccess { uploaded ->
                        if (kind == "cover") coverUrl = uploaded else avatarUrl = uploaded
                        pendingPhoto = null
                    }.onFailure {
                        Toast.makeText(context, it.message ?: "Photo upload failed", Toast.LENGTH_LONG).show()
                    }
                    prepared?.file?.delete()
                    busy = false
                }
            }
        )
        return
    }
    fun save() {
        if (busy || username.isBlank()) return
        scope.launch {
            busy = true
            runCatching { repository.updateProfile(mapOf(
                "username" to username, "bio" to bio, "about" to about, "category" to category,
                "location" to location, "website" to website, "avatar" to avatarUrl, "coverUrl" to coverUrl,
                "preferences" to preferences
            )) }.onSuccess { onBack() }.onFailure { Toast.makeText(context, it.message ?: "Profile update failed", Toast.LENGTH_LONG).show() }
            busy = false
        }
    }

    fun updatePreference(key: String, value: Any?) {
        preferences = if (value == null || value.toString().isBlank() || value == emptyList<String>()) preferences - key
        else preferences + (key to value)
    }

    val selectedFamilyIds = preferences.profileStrings("familyMemberIds").toSet()
    val selectedFamilyNames = availableConnections.filter { it.userId in selectedFamilyIds }
        .joinToString { it.user.name.ifBlank { it.username } }
    val structuredSocialLinks = preferences.profileObjects("socialLinks").ifEmpty {
        preferences.profileString("socialMedia").takeIf { it.isNotBlank() }?.let {
            listOf(mapOf<String, Any?>("label" to "Social media", "url" to it))
        }.orEmpty()
    }

    when (activeEditor) {
        "bio" -> ProfileTextEditorPage("Bio", bio, "Tell people about yourself", 240, true, { activeEditor = null }) { bio = it; activeEditor = null }
        "about" -> ProfileTextEditorPage("About", about, "Share more about you", 3000, true, { activeEditor = null }) { about = it; activeEditor = null }
        "username" -> ProfileTextEditorPage("Username", username, "Your Tiwi username", 30, false, { activeEditor = null }) { if (it.isNotBlank()) username = it; activeEditor = null }
        "location" -> ProfileTextEditorPage("Current city", location, "City, country", 160, false, { activeEditor = null }) { location = it; activeEditor = null }
        "hometown" -> ProfileTextEditorPage("Hometown", preferences.profileString("hometown"), "Hometown, country", 160, false, { activeEditor = null }) { updatePreference("hometown", it); activeEditor = null }
        "birthday" -> ProfileTextEditorPage("Birthday", preferences.profileString("birthday"), "Example: November 20, 2000", 40, false, { activeEditor = null }) { updatePreference("birthday", it); activeEditor = null }
        "family" -> ProfileFamilyEditorPage(availableConnections, selectedFamilyIds, { activeEditor = null }) {
            preferences = if (it.isEmpty()) preferences - "familyMemberIds" - "family"
            else (preferences - "family") + ("familyMemberIds" to it.toList())
            activeEditor = null
        }
        "socialMedia" -> ProfileSocialLinksEditorPage(structuredSocialLinks, { activeEditor = null }) {
            preferences = if (it.isEmpty()) preferences - "socialLinks" - "socialMedia"
            else (preferences - "socialMedia") + ("socialLinks" to it)
            activeEditor = null
        }
        "website" -> ProfileTextEditorPage("Websites, blogs, portfolios", website, "https://your-site.com", 500, true, { activeEditor = null }) { website = it; activeEditor = null }
        "work" -> ProfileTextEditorPage("Work experience", preferences.profileString("work"), "Company, role and dates", 500, true, { activeEditor = null }) { updatePreference("work", it); activeEditor = null }
        "education" -> ProfileTextEditorPage("Education", preferences.profileString("education"), "School, college or university", 500, true, { activeEditor = null }) { updatePreference("education", it); activeEditor = null }
        "category" -> ProfileOptionEditorPage("Category", PROFILE_CATEGORY_OPTIONS, setOfNotNull(category.takeIf { it.isNotBlank() }), false, { activeEditor = null }) { category = it.firstOrNull().orEmpty(); activeEditor = null }
        "pinned" -> ProfileOptionEditorPage("Pinned details", PROFILE_PINNED_OPTIONS, preferences.profileStrings("pinnedDetails").toSet(), true, { activeEditor = null }) { updatePreference("pinnedDetails", it.toList()); activeEditor = null }
        "relationship" -> ProfileOptionEditorPage("Relationship", PROFILE_RELATIONSHIP_OPTIONS, setOfNotNull(preferences.profileString("relationship").takeIf { it.isNotBlank() }), false, { activeEditor = null }) { updatePreference("relationship", it.firstOrNull()); activeEditor = null }
        "gender" -> ProfileOptionEditorPage("Gender and pronouns", PROFILE_GENDER_OPTIONS, setOfNotNull(preferences.profileString("gender").takeIf { it.isNotBlank() }), false, { activeEditor = null }) { updatePreference("gender", it.firstOrNull()); activeEditor = null }
        "languages" -> ProfileOptionEditorPage("Languages", PROFILE_LANGUAGE_OPTIONS, preferences.profileStrings("languages").toSet(), true, { activeEditor = null }) { updatePreference("languages", it.toList()); activeEditor = null }
        "hobbies" -> ProfileOptionEditorPage("Hobbies", PROFILE_HOBBY_OPTIONS, preferences.profileStrings("hobbies").toSet(), true, { activeEditor = null }) { updatePreference("hobbies", it.toList()); activeEditor = null }
        "interests" -> ProfileOptionEditorPage("Interests", PROFILE_INTEREST_OPTIONS, preferences.profileStrings("interests").toSet(), true, { activeEditor = null }) { updatePreference("interests", it.toList()); activeEditor = null }
        else -> Unit
    }
    if (activeEditor != null) {
        BackHandler { activeEditor = null }
        return
    }

    Column(Modifier.fillMaxSize().background(Color.White).statusBarsPadding()) {
        Row(Modifier.fillMaxWidth().height(54.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(enabled = !busy, onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") }
            Text("Edit profile", Modifier.weight(1f), textAlign = TextAlign.Center, fontWeight = FontWeight.ExtraBold, fontSize = 19.sp)
            TextButton(enabled = !busy && username.isNotBlank(), onClick = ::save) {
                if (busy) CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
                else Text("Done", fontWeight = FontWeight.Bold, color = TiwiBlue)
            }
        }
        HorizontalDivider(color = Color(0xFFE4E7EC), thickness = .5.dp)
        Column(Modifier.weight(1f).verticalScroll(rememberScrollState())) {
            Box(Modifier.fillMaxWidth().height(232.dp)) {
                Box(
                    Modifier.align(Alignment.TopCenter).fillMaxWidth().padding(horizontal = 14.dp, vertical = 12.dp)
                        .height(158.dp).clip(RoundedCornerShape(18.dp)).background(Color(0xFFEAF3FF))
                        .clickable { if (!busy) coverPicker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) }
                ) {
                    TiwiAvatar(coverUrl, R.drawable.img_tiwi_cover, Modifier.fillMaxSize(), ContentScale.Crop)
                    Box(Modifier.align(Alignment.BottomEnd).padding(11.dp).size(42.dp).background(Color.Black.copy(alpha = .58f), CircleShape), contentAlignment = Alignment.Center) {
                        Icon(Icons.Default.CameraAlt, "Change cover", tint = Color.White, modifier = Modifier.size(22.dp))
                    }
                }
                Box(Modifier.align(Alignment.BottomCenter).size(124.dp).background(Color.White, CircleShape), contentAlignment = Alignment.Center) {
                    DecoratedAvatar(avatarUrl, R.drawable.img_tiwi_avatar_1, avatarDecoration, Modifier.size(118.dp), animateDecoration = true)
                    Box(
                        Modifier.align(Alignment.BottomEnd).padding(5.dp).size(34.dp).background(Color.White, CircleShape)
                            .border(1.dp, Color(0xFFE4E7EC), CircleShape).clickable { if (!busy) avatarPicker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) },
                        contentAlignment = Alignment.Center
                    ) { Icon(Icons.Default.CameraAlt, "Change profile picture", modifier = Modifier.size(19.dp)) }
                }
            }

            if (decorationCatalogAvailable || effectCatalogAvailable) ProfileEditSection("Profile style") {
                if (decorationCatalogAvailable) ProfileEditRow(Icons.Outlined.AutoAwesome, "Avatar decoration", avatarDecoration?.name ?: "Choose a profile decoration") { showDecorations = true }
                if (effectCatalogAvailable) ProfileEditRow(Icons.Outlined.Layers, "Profile effect", profileEffect?.name ?: "Choose a full-profile effect") { showEffects = true }
            }
            ProfileEditSection("Intro") {
                ProfileEditRow(Icons.Outlined.WavingHand, "Bio", bio.ifBlank { "Add bio" }) { activeEditor = "bio" }
                ProfileEditRow(Icons.Outlined.PushPin, "Pinned details", preferences.profileStrings("pinnedDetails").joinToString(" · ").ifBlank { "Choose details to feature" }) { activeEditor = "pinned" }
                ProfileEditRow(Icons.Outlined.Info, "About", about.ifBlank { "Add more information about you" }) { activeEditor = "about" }
            }
            ProfileEditSection("Category") {
                ProfileEditRow(Icons.Outlined.Badge, "Profile category", category.ifBlank { "Choose a category" }) { activeEditor = "category" }
            }
            ProfileEditSection("Personal details") {
                ProfileEditRow(Icons.Outlined.LocationOn, "Current city", location.ifBlank { "Add current city" }) { activeEditor = "location" }
                ProfileEditRow(Icons.Outlined.Home, "Hometown", preferences.profileString("hometown").ifBlank { "Add hometown" }) { activeEditor = "hometown" }
                ProfileEditRow(Icons.Outlined.Cake, "Birthday", preferences.profileString("birthday").ifBlank { "Add birthday" }) { activeEditor = "birthday" }
                ProfileEditRow(Icons.Outlined.FavoriteBorder, "Relationship", preferences.profileString("relationship").ifBlank { "Add relationship status" }) { activeEditor = "relationship" }
                ProfileEditRow(Icons.Outlined.FamilyRestroom, "Family members", selectedFamilyNames.ifBlank { "Choose from My Connections" }) { activeEditor = "family" }
                ProfileEditRow(Icons.Outlined.Person, "Gender and pronouns", preferences.profileString("gender").ifBlank { "Choose from system options" }) { activeEditor = "gender" }
                ProfileEditRow(Icons.Outlined.Translate, "Languages", preferences.profileStrings("languages").joinToString().ifBlank { "Choose languages" }) { activeEditor = "languages" }
            }
            ProfileEditSection("Links") {
                ProfileEditRow(Icons.Outlined.AlternateEmail, "Social links", structuredSocialLinks.joinToString { it["label"]?.toString().orEmpty() }.ifBlank { "Add name and link" }) { activeEditor = "socialMedia" }
                ProfileEditRow(Icons.Outlined.Link, "Websites, blogs, portfolios", website.ifBlank { "Add website" }) { activeEditor = "website" }
            }
            ProfileEditSection("Work") {
                ProfileEditRow(Icons.Outlined.WorkOutline, "Work experience", preferences.profileString("work").ifBlank { "Add work experience" }) { activeEditor = "work" }
            }
            ProfileEditSection("Education") {
                ProfileEditRow(Icons.Outlined.School, "High school or college", preferences.profileString("education").ifBlank { "Add education" }) { activeEditor = "education" }
            }
            ProfileEditSection("Hobbies") {
                ProfileEditRow(Icons.Outlined.Interests, "Hobbies", preferences.profileStrings("hobbies").joinToString().ifBlank { "Choose hobbies" }) { activeEditor = "hobbies" }
            }
            ProfileEditSection("Interests") {
                ProfileEditRow(Icons.Outlined.MusicNote, "Music, shows, movies, games and more", preferences.profileStrings("interests").joinToString().ifBlank { "Choose interests" }) { activeEditor = "interests" }
            }
            ProfileEditSection("Contact info") {
                ProfileEditRow(Icons.Outlined.AlternateEmail, "Username", "@$username") { activeEditor = "username" }
                ProfileEditRow(Icons.Outlined.Email, "Email", repository.currentUser.value?.email ?: "Managed in Account Center", enabled = false)
                ProfileEditRow(Icons.Outlined.Phone, "Phone number", "Managed in Account Center", enabled = false)
            }
            Text("Your profile information is reviewed and protected by the Tiwi Team.", color = Color(0xFF667085), fontSize = 11.sp, modifier = Modifier.padding(horizontal = 18.dp, vertical = 18.dp))
            Spacer(Modifier.navigationBarsPadding().height(12.dp))
        }
    }
    if (showDecorations) ProfileDecorationSheet(
        repository = repository,
        avatarUrl = avatarUrl,
        current = avatarDecoration,
        onDismiss = { showDecorations = false },
        onApplied = { avatarDecoration = it; showDecorations = false }
    )
    if (showEffects) ProfileEffectSheet(
        repository = repository,
        avatarUrl = avatarUrl,
        coverUrl = coverUrl,
        current = profileEffect,
        onDismiss = { showEffects = false },
        onApplied = { profileEffect = it; showEffects = false }
    )
}

@Composable
private fun ProfileDecorationPage(repository: SocialRepository, profile: SocialProfile?, onBack: () -> Unit) {
    Column(Modifier.fillMaxSize().background(Color.White).statusBarsPadding()) {
        Row(Modifier.fillMaxWidth().height(52.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") }
            Column { Text("Decorate your profile", fontWeight = FontWeight.Bold, fontSize = 19.sp); Text("Animated avatar decorations", color = Color.Gray, fontSize = 11.sp) }
        }
        HorizontalDivider(color = Color(0xFFE4E7EC), thickness = .5.dp)
        ProfileDecorationMarketplace(repository, profile?.user?.avatar, profile?.avatarDecoration, Modifier.weight(1f)) { }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ProfileDecorationSheet(
    repository: SocialRepository,
    avatarUrl: String?,
    current: SocialProfileDecoration?,
    onDismiss: () -> Unit,
    onApplied: (SocialProfileDecoration?) -> Unit
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = Color.White,
        contentColor = Color.Black,
        tonalElevation = 0.dp,
        dragHandle = { BottomSheetDefaults.DragHandle(color = Color(0xFFD0D5DD)) }
    ) {
        Column(Modifier.fillMaxWidth().fillMaxHeight(.92f)) {
            Row(Modifier.fillMaxWidth().padding(horizontal = 18.dp, vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) { Text("Avatar decoration", fontWeight = FontWeight.ExtraBold, fontSize = 21.sp); Text("Preview, choose and apply without leaving Edit profile", color = Color.Gray, fontSize = 12.sp) }
                IconButton(onClick = onDismiss) { Icon(Icons.Default.Close, "Close") }
            }
            ProfileDecorationMarketplace(repository = repository, avatarUrl = avatarUrl, current = current, modifier = Modifier.weight(1f), onApplied = onApplied)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ProfileEffectSheet(
    repository: SocialRepository,
    avatarUrl: String?,
    coverUrl: String?,
    current: SocialProfileDecoration?,
    onDismiss: () -> Unit,
    onApplied: (SocialProfileDecoration?) -> Unit
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = Color.White,
        contentColor = Color.Black,
        tonalElevation = 0.dp,
        dragHandle = { BottomSheetDefaults.DragHandle(color = Color(0xFFD0D5DD)) }
    ) {
        Column(Modifier.fillMaxWidth().fillMaxHeight(.94f)) {
            Row(Modifier.fillMaxWidth().padding(horizontal = 18.dp, vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) { Text("Profile effect", fontWeight = FontWeight.ExtraBold, fontSize = 21.sp); Text("Preview the full profile, choose and apply", color = Color.Gray, fontSize = 12.sp) }
                IconButton(onClick = onDismiss) { Icon(Icons.Default.Close, "Close") }
            }
            ProfileDecorationMarketplace(
                repository = repository,
                avatarUrl = avatarUrl,
                current = current,
                modifier = Modifier.weight(1f),
                effectMode = true,
                coverUrl = coverUrl,
                onApplied = onApplied
            )
        }
    }
}

@Composable
private fun ProfileDecorationMarketplace(
    repository: SocialRepository,
    avatarUrl: String?,
    current: SocialProfileDecoration?,
    modifier: Modifier = Modifier,
    effectMode: Boolean = false,
    coverUrl: String? = null,
    onApplied: (SocialProfileDecoration?) -> Unit
) {
    val context = LocalContext.current
    val scope = rememberTiwiCoroutineScope()
    var decorations by remember { mutableStateOf<List<SocialProfileDecoration>>(emptyList()) }
    var paymentOptions by remember { mutableStateOf<SocialVerificationOptions?>(null) }
    var loading by remember { mutableStateOf(true) }
    var busy by remember { mutableStateOf(false) }
    var selectedId by remember(current?.id) { mutableStateOf(current?.id) }
    var activeId by remember(current?.id) { mutableStateOf(current?.id) }
    var selectedGateway by remember { mutableStateOf("") }
    var checkoutDecoration by remember { mutableStateOf<SocialProfileDecoration?>(null) }

    suspend fun refreshDecorations() {
        loading = true
        decorations = runCatching { if (effectMode) repository.profileEffects() else repository.profileDecorations() }
            .onFailure { Toast.makeText(context, it.message ?: if (effectMode) "Profile effects could not load" else "Decorations could not load", Toast.LENGTH_LONG).show() }
            .getOrDefault(emptyList())
        val serverApplied = decorations.firstOrNull { it.applied }
        activeId = serverApplied?.id
        if (selectedId == null && serverApplied != null) selectedId = serverApplied.id
        loading = false
    }
    LaunchedEffect(Unit) {
        refreshDecorations()
        paymentOptions = runCatching { repository.verificationOptions() }.getOrNull()
        if (selectedGateway.isBlank()) selectedGateway = paymentOptions?.gateways?.firstOrNull()?.key.orEmpty()
    }

    val selected = decorations.firstOrNull { it.id == selectedId }
    val previewDecoration = selected
    val options = paymentOptions
    val convertedPrice = selected?.let { item ->
        if (options?.currency == "BDT") "BDT ${String.format(Locale.US, "%.0f", item.priceUsd * options.usdRate)}"
        else "\$${String.format(Locale.US, "%.2f", item.priceUsd)} USD"
    }.orEmpty()
    val yourDecorations = decorations.filter { it.owned || it.priceUsd <= 0 }

    checkoutDecoration?.let { checkoutItem ->
        ProfileDecorationCheckoutPage(
            repository = repository,
            item = checkoutItem,
            avatarUrl = avatarUrl,
            coverUrl = coverUrl,
            effectMode = effectMode,
            options = options,
            selectedGateway = selectedGateway,
            busy = busy,
            onBack = { checkoutDecoration = null },
            onGatewaySelected = { selectedGateway = it },
            onPay = {
                val checkoutOptions = options
                if (checkoutOptions != null && selectedGateway.isNotBlank()) scope.launch {
                    busy = true
                    runCatching {
                        if (effectMode) repository.startProfileEffectCheckout(checkoutItem.id, selectedGateway, checkoutOptions.currency)
                        else repository.startProfileDecorationCheckout(checkoutItem.id, selectedGateway, checkoutOptions.currency)
                    }
                        .onSuccess { checkout ->
                            if (!checkout.paymentUrl.isNullOrBlank()) context.startActivity(Intent(Intent.ACTION_VIEW, android.net.Uri.parse(checkout.paymentUrl)))
                            else Toast.makeText(context, checkout.message ?: if (effectMode) "Profile effect added" else "Decoration added", Toast.LENGTH_LONG).show()
                            refreshDecorations()
                        }
                        .onFailure { Toast.makeText(context, it.message ?: "Checkout failed", Toast.LENGTH_LONG).show() }
                    busy = false
                }
            }
        )
        return
    }

    Column(modifier.background(Color(0xFFF8F9FC))) {
        Surface(
            Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 10.dp),
            color = Color.Transparent,
            shape = RoundedCornerShape(22.dp),
            tonalElevation = 0.dp
        ) {
            Box(
                Modifier.fillMaxWidth().background(
                    Brush.linearGradient(
                        if (effectMode) listOf(Color(0xFFFFF0F7), Color(0xFFF4F0FF), Color(0xFFEAF4FF))
                        else listOf(Color(0xFF201A33), Color(0xFF4C2D80), Color(0xFF7F56D9))
                    )
                ).padding(vertical = 14.dp),
                contentAlignment = Alignment.Center
            ) {
                if (effectMode) {
                    Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.Center) {
                        MiniProfileEffectPreview(repository, avatarUrl, coverUrl, previewDecoration, Modifier.width(132.dp).height(228.dp))
                        Column(Modifier.weight(1f).padding(start = 17.dp)) {
                            Text("PROFILE EFFECT", color = Color(0xFF7F56D9), fontSize = 10.sp, fontWeight = FontWeight.Black, letterSpacing = 1.sp)
                            Text(previewDecoration?.name ?: "No effect selected", color = Color(0xFF1D2939), fontWeight = FontWeight.ExtraBold, fontSize = 20.sp, lineHeight = 24.sp, modifier = Modifier.padding(top = 7.dp))
                            Text("See the complete profile exactly as visitors will see it.", color = Color(0xFF667085), fontSize = 11.sp, lineHeight = 16.sp, modifier = Modifier.padding(top = 7.dp))
                            Surface(color = Color.White.copy(alpha = .82f), shape = RoundedCornerShape(50), tonalElevation = 0.dp, modifier = Modifier.padding(top = 12.dp)) { Text(if (previewDecoration == null) "Original profile" else "Live preview", color = Color(0xFF6941C6), fontWeight = FontWeight.Bold, fontSize = 10.sp, modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)) }
                        }
                    }
                } else Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    DecoratedAvatar(avatarUrl, R.drawable.img_tiwi_avatar_1, previewDecoration, Modifier.size(148.dp), animateDecoration = true)
                    Text(repository.currentUser.value?.name.orEmpty(), color = Color.White, fontWeight = FontWeight.ExtraBold, fontSize = 18.sp)
                    Text(previewDecoration?.name ?: "No decoration", color = Color.White.copy(alpha = .76f), fontSize = 12.sp)
                }
            }
        }
        if (loading) MarketplaceLoadingPlaceholder(Modifier.weight(1f))
        else LazyColumn(Modifier.weight(1f), contentPadding = PaddingValues(horizontal = 14.dp, vertical = 4.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            item {
                Row(verticalAlignment = Alignment.CenterVertically) { Text(if (effectMode) "Your profile effects" else "Your decorations", Modifier.weight(1f), fontWeight = FontWeight.ExtraBold, fontSize = 17.sp); IconButton(onClick = { scope.launch { refreshDecorations() } }, modifier = Modifier.size(34.dp)) { Icon(Icons.Default.Refresh, "Refresh", tint = TiwiBlue, modifier = Modifier.size(19.dp)) } }
                Text(if (effectMode) "Purchased and free full-profile effects available to your account." else "Purchased items and every free decoration available to your account.", color = Color.Gray, fontSize = 11.sp)
            }
            item {
                LazyRow(horizontalArrangement = Arrangement.spacedBy(9.dp)) {
                    item {
                        Surface(
                            Modifier.width(116.dp).height(142.dp).clickable { selectedId = null },
                            color = if (selectedId == null) Color(0xFFEAF2FF) else Color.White,
                            border = BorderStroke(if (selectedId == null) 2.dp else 1.dp, if (selectedId == null) TiwiBlue else Color(0xFFE4E7EC)),
                            shape = RoundedCornerShape(14.dp), tonalElevation = 0.dp
                        ) { Column(Modifier.padding(10.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) { Box(Modifier.size(76.dp).background(Color(0xFFF0F2F5), CircleShape), contentAlignment = Alignment.Center) { Icon(Icons.Outlined.Block, null, tint = Color.Gray) }; Text("None", fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 7.dp)) } }
                    }
                    items(yourDecorations, key = { "owned-${it.id}" }) { item ->
                        if (effectMode) ProfileEffectStoreCard(repository, avatarUrl, coverUrl, item, selectedId == item.id, Modifier.width(116.dp).height(142.dp)) { selectedId = item.id }
                        else DecorationStoreCard(item, selectedId == item.id, Modifier.width(116.dp).height(142.dp)) { selectedId = item.id }
                    }
                }
            }
            item {
                Surface(Modifier.fillMaxWidth(), color = Color.White, shape = RoundedCornerShape(15.dp), tonalElevation = 0.dp) {
                    Row(Modifier.padding(horizontal = 13.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                        Box(Modifier.size(38.dp).background(if (effectMode) Color(0xFFEEEAFE) else Color(0xFFEAF2FF), RoundedCornerShape(12.dp)), contentAlignment = Alignment.Center) { Icon(if (effectMode) Icons.Outlined.Explore else Icons.Outlined.AutoAwesome, null, tint = if (effectMode) Color(0xFF5865F2) else TiwiBlue, modifier = Modifier.size(21.dp)) }
                        Column(Modifier.padding(start = 10.dp)) { Text("Explore all", fontWeight = FontWeight.ExtraBold, fontSize = 16.sp); Text(if (effectMode) "Choose an effect to preview your complete profile." else "Choose a decoration to preview it on your photo.", color = Color(0xFF667085), fontSize = 11.sp) }
                    }
                }
            }
            items(decorations.chunked(2), key = { row -> row.joinToString("-") { it.id } }) { row ->
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    row.forEach { item ->
                        val cardClick = {
                            selectedId = item.id
                            selectedGateway = options?.gateways?.firstOrNull()?.key.orEmpty()
                            if (!item.owned && item.priceUsd > 0) checkoutDecoration = item
                        }
                        if (effectMode) ProfileEffectStoreCard(repository, avatarUrl, coverUrl, item, selectedId == item.id, Modifier.weight(1f).height(210.dp), cardClick)
                        else DecorationStoreCard(item, selectedId == item.id, Modifier.weight(1f).height(190.dp), cardClick)
                    }
                    if (row.size == 1) Spacer(Modifier.weight(1f))
                }
            }
            item { Spacer(Modifier.height(6.dp)) }
        }
        val canApply = selected == null || selected.owned || selected.priceUsd <= 0
        Button(
            enabled = !busy,
            onClick = {
                if (!canApply && selected != null) {
                    selectedGateway = options?.gateways?.firstOrNull()?.key.orEmpty()
                    checkoutDecoration = selected
                } else scope.launch {
                    busy = true
                    runCatching { if (effectMode) repository.applyProfileEffect(selected?.id) else repository.applyProfileDecoration(selected?.id) }
                        .onSuccess { profile ->
                            val appliedItem = if (effectMode) profile.profileEffect else profile.avatarDecoration
                            activeId = appliedItem?.id
                            onApplied(appliedItem)
                            Toast.makeText(context, appliedItem?.let { "${it.name} applied" } ?: if (effectMode) "Profile effect removed" else "Decoration removed", Toast.LENGTH_SHORT).show()
                        }
                        .onFailure { Toast.makeText(context, it.message ?: if (effectMode) "Profile effect could not be applied" else "Decoration could not be applied", Toast.LENGTH_LONG).show() }
                    busy = false
                }
            },
            modifier = Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 10.dp).navigationBarsPadding(),
            shape = RoundedCornerShape(12.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF6E3CBC))
        ) {
            if (busy) CircularProgressIndicator(Modifier.size(19.dp), color = Color.White, strokeWidth = 2.dp)
            else Text(when { selected?.id == activeId -> "Applied"; canApply -> if (effectMode) "Apply profile effect" else "Apply decoration"; else -> "View payment options · $convertedPrice" }, fontWeight = FontWeight.ExtraBold)
        }
    }
}

@Composable
private fun ProfileDecorationCheckoutPage(
    repository: SocialRepository,
    item: SocialProfileDecoration,
    avatarUrl: String?,
    coverUrl: String?,
    effectMode: Boolean,
    options: SocialVerificationOptions?,
    selectedGateway: String,
    busy: Boolean,
    onBack: () -> Unit,
    onGatewaySelected: (String) -> Unit,
    onPay: () -> Unit
) {
    val price = if (options?.currency == "BDT") {
        "BDT ${String.format(Locale.US, "%.0f", item.priceUsd * options.usdRate)}"
    } else "\$${String.format(Locale.US, "%.2f", item.priceUsd)} USD"
    Column(Modifier.fillMaxSize().background(Color(0xFFF8F9FC))) {
        Row(Modifier.fillMaxWidth().height(54.dp).background(Color.White), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") }
            Column {
                Text(if (effectMode) "Get profile effect" else "Get avatar decoration", fontWeight = FontWeight.ExtraBold, fontSize = 18.sp)
                Text("Secure Tiwlo checkout", color = Color.Gray, fontSize = 11.sp)
            }
        }
        HorizontalDivider(color = Color(0xFFE4E7EC), thickness = .5.dp)
        LazyColumn(
            Modifier.weight(1f),
            contentPadding = PaddingValues(14.dp),
            verticalArrangement = Arrangement.spacedBy(13.dp)
        ) {
            item {
                Surface(Modifier.fillMaxWidth(), color = Color(0xFF261A3D), shape = RoundedCornerShape(22.dp), tonalElevation = 0.dp) {
                    Column(Modifier.padding(22.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                        if (effectMode) MiniProfileEffectPreview(repository, avatarUrl, coverUrl, item, Modifier.width(164.dp).height(286.dp))
                        else DecoratedAvatar(avatarUrl, R.drawable.img_tiwi_avatar_1, item, Modifier.size(142.dp), animateDecoration = true)
                        Text(item.name, color = Color.White, fontWeight = FontWeight.ExtraBold, fontSize = 20.sp)
                        Text(price, color = Color(0xFFD9C8FF), fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 4.dp))
                    }
                }
            }
            item {
                Text("Choose payment method", fontWeight = FontWeight.ExtraBold, fontSize = 18.sp)
                Text("Your enabled Tiwlo payment gateways appear here.", color = Color.Gray, fontSize = 12.sp, modifier = Modifier.padding(top = 3.dp))
            }
            when {
                options == null -> item {
                    Box(Modifier.fillMaxWidth().height(90.dp), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(Modifier.size(28.dp), strokeWidth = 2.5.dp)
                    }
                }
                options.gateways.isEmpty() -> item {
                    Surface(color = Color(0xFFFFF1F0), shape = RoundedCornerShape(12.dp), tonalElevation = 0.dp) {
                        Text("No payment gateway is enabled right now.", color = Color(0xFFB42318), modifier = Modifier.padding(14.dp), fontWeight = FontWeight.SemiBold)
                    }
                }
                else -> items(options.gateways, key = { it.key }) { gateway ->
                    val selected = selectedGateway == gateway.key
                    Surface(
                        Modifier.fillMaxWidth().clickable { onGatewaySelected(gateway.key) },
                        color = if (selected) Color(0xFFF1ECFF) else Color.White,
                        border = BorderStroke(if (selected) 2.dp else 1.dp, if (selected) Color(0xFF7F56D9) else Color(0xFFE4E7EC)),
                        shape = RoundedCornerShape(13.dp),
                        tonalElevation = 0.dp
                    ) {
                        Row(Modifier.padding(13.dp), verticalAlignment = Alignment.CenterVertically) {
                            RadioButton(selected, onClick = { onGatewaySelected(gateway.key) })
                            Icon(Icons.Outlined.Payment, null, tint = Color(0xFF7F56D9), modifier = Modifier.padding(start = 3.dp))
                            Text(gateway.name, Modifier.weight(1f).padding(start = 10.dp), fontWeight = FontWeight.Bold)
                            if (selected) Icon(Icons.Default.CheckCircle, "Selected", tint = Color(0xFF12B76A))
                        }
                    }
                }
            }
            item {
                Text("Payment opens on Tiwlo's secure checkout. The ${if (effectMode) "profile effect" else "decoration"} is added after confirmed payment.", color = Color.Gray, fontSize = 11.sp, lineHeight = 16.sp)
            }
        }
        Button(
            onClick = onPay,
            enabled = !busy && options != null && options.gateways.isNotEmpty() && selectedGateway.isNotBlank(),
            modifier = Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 10.dp).navigationBarsPadding(),
            shape = RoundedCornerShape(12.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF6E3CBC))
        ) {
            if (busy) CircularProgressIndicator(Modifier.size(19.dp), color = Color.White, strokeWidth = 2.dp)
            else Text(if (selectedGateway.isBlank()) "Select a payment method" else "Continue to pay · $price", fontWeight = FontWeight.ExtraBold)
        }
    }
}

@Composable
private fun DecorationStoreCard(item: SocialProfileDecoration, selected: Boolean, modifier: Modifier, onClick: () -> Unit) {
    Surface(
        modifier.clickable(onClick = onClick),
        color = if (selected) Color(0xFFF1ECFF) else Color.White,
        shape = RoundedCornerShape(14.dp),
        border = BorderStroke(if (selected) 2.dp else 1.dp, if (selected) Color(0xFF7F56D9) else Color(0xFFE4E7EC)),
        tonalElevation = 0.dp
    ) {
        Column(Modifier.padding(9.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Box(Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
                Box(Modifier.size(82.dp).background(Brush.linearGradient(listOf(Color(0xFFDDEBFF), Color(0xFFEADFFF))), CircleShape))
                ProfileDecorationImage(item.assetUrl, Modifier.size(96.dp), animated = true)
                if (item.applied) Icon(Icons.Default.CheckCircle, "Applied", tint = Color(0xFF12B76A), modifier = Modifier.align(Alignment.TopEnd).size(20.dp))
            }
            Text(item.name, fontWeight = FontWeight.Bold, fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(when { item.applied -> "APPLIED"; item.priceUsd <= 0 -> "FREE"; item.owned -> "OWNED"; else -> "\$${String.format(Locale.US, "%.2f", item.priceUsd)}" }, color = if (item.priceUsd <= 0 || item.owned) Color(0xFF067647) else Color(0xFF6941C6), fontWeight = FontWeight.Black, fontSize = 9.sp)
        }
    }
}

@Composable
private fun ProfileEffectStoreCard(
    repository: SocialRepository,
    avatarUrl: String?,
    coverUrl: String?,
    item: SocialProfileDecoration,
    selected: Boolean,
    modifier: Modifier,
    onClick: () -> Unit
) {
    Surface(
        modifier.clickable(onClick = onClick),
        color = if (selected) Color(0xFFEAF2FF) else Color.White,
        shape = RoundedCornerShape(14.dp),
        border = BorderStroke(if (selected) 2.dp else 1.dp, if (selected) Color(0xFF2457A7) else Color(0xFFE4E7EC)),
        tonalElevation = 0.dp
    ) {
        Column(Modifier.padding(7.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Box(Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
                MiniProfileEffectPreview(repository, avatarUrl, coverUrl, item, Modifier.fillMaxHeight().aspectRatio(450f / 880f))
                if (item.applied) Icon(Icons.Default.CheckCircle, "Applied", tint = Color(0xFF12B76A), modifier = Modifier.align(Alignment.TopEnd).size(19.dp))
            }
            Text(item.name, fontWeight = FontWeight.Bold, fontSize = 11.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(when { item.applied -> "APPLIED"; item.priceUsd <= 0 -> "FREE"; item.owned -> "OWNED"; else -> "\$${String.format(Locale.US, "%.2f", item.priceUsd)}" }, color = if (item.priceUsd <= 0 || item.owned) Color(0xFF067647) else Color(0xFF2457A7), fontWeight = FontWeight.Black, fontSize = 9.sp)
        }
    }
}

@Composable
private fun ProfileActionButton(text: String, modifier: Modifier, primary: Boolean = false, icon: ImageVector? = null, onClick: () -> Unit) {
    Surface(
        modifier.height(36.dp).clip(RoundedCornerShape(10.dp)).clickable(onClick = onClick),
        color = if (primary) TiwiBlue else Color.White,
        contentColor = if (primary) Color.White else Color(0xFF101828),
        shape = RoundedCornerShape(10.dp),
        border = if (primary) null else BorderStroke(.8.dp, Color(0xFFD0D5DD)),
        tonalElevation = 0.dp
    ) {
        Row(Modifier.fillMaxSize().padding(horizontal = 5.dp), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
            if (icon != null) Icon(icon, null, modifier = Modifier.size(16.dp))
            Text(text, fontSize = 11.sp, fontWeight = FontWeight.Bold, maxLines = 1, modifier = if (icon != null) Modifier.padding(start = 5.dp) else Modifier)
        }
    }
}

@Composable
private fun EditProfileDialog(repository: SocialRepository, profile: SocialProfile?, onDismiss: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberTiwiCoroutineScope()
    var username by remember(profile) { mutableStateOf(profile?.username.orEmpty()) }
    var bio by remember(profile) { mutableStateOf(profile?.bio.orEmpty()) }
    var about by remember(profile) { mutableStateOf(profile?.about.orEmpty()) }
    var category by remember(profile) { mutableStateOf(profile?.category.orEmpty()) }
    var website by remember(profile) { mutableStateOf(profile?.website.orEmpty()) }
    var location by remember(profile) { mutableStateOf(profile?.location.orEmpty()) }
    var avatarUrl by remember(profile) { mutableStateOf(profile?.user?.avatar) }
    var coverUrl by remember(profile) { mutableStateOf(profile?.coverUrl) }
    var busy by remember { mutableStateOf(false) }
    val avatarPicker = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
        if (uri != null) scope.launch {
            busy = true
            runCatching { repository.uploadMedia(context.contentResolver, uri, "profile").url }
                .onSuccess { avatarUrl = it }
                .onFailure { Toast.makeText(context, it.message ?: "Photo upload failed", Toast.LENGTH_LONG).show() }
            busy = false
        }
    }
    val coverPicker = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
        if (uri != null) scope.launch {
            busy = true
            runCatching { repository.uploadMedia(context.contentResolver, uri, "cover").url }
                .onSuccess { coverUrl = it }
                .onFailure { Toast.makeText(context, it.message ?: "Cover upload failed", Toast.LENGTH_LONG).show() }
            busy = false
        }
    }

    AlertDialog(
        onDismissRequest = { if (!busy) onDismiss() },
        containerColor = Color.White,
        tonalElevation = 0.dp,
        title = { Text("Edit Profile") },
        text = {
            LazyColumn(modifier = Modifier.heightIn(max = 480.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedButton(
                            enabled = !busy,
                            onClick = { avatarPicker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) },
                            modifier = Modifier.weight(1f)
                        ) { Text("Profile photo") }
                        OutlinedButton(
                            enabled = !busy,
                            onClick = { coverPicker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) },
                            modifier = Modifier.weight(1f)
                        ) { Text("Cover photo") }
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

@OptIn(ExperimentalFoundationApi::class, ExperimentalMaterial3Api::class)
@Composable
fun MessagesScreen(
    repository: SocialRepository,
    onBack: () -> Unit,
    onChatClick: (SocialConversation) -> Unit,
    onProfileClick: () -> Unit = {},
    onSupportCenter: () -> Unit = {},
    storyGroups: List<SocialStoryGroup> = emptyList(),
    onCreateStory: () -> Unit = {},
    onOpenStory: (String) -> Unit = {}
) {
    val chats by repository.conversations.collectAsState()
    val notifications by repository.notifications.collectAsState()
    val currentUser by repository.currentUser.collectAsState()
    val currentProfile by repository.profile.collectAsState()
    val scope = rememberTiwiCoroutineScope()
    val context = LocalContext.current
    val haptics = androidx.compose.ui.platform.LocalHapticFeedback.current
    val preferences = remember { context.getSharedPreferences("tiwi_messenger", Context.MODE_PRIVATE) }
    var tab by remember { mutableIntStateOf(0) }
    var query by remember { mutableStateOf("") }
    var composerMode by remember { mutableStateOf<String?>(null) }
    var selectedConversation by remember { mutableStateOf<SocialConversation?>(null) }
    var addMembersTo by remember { mutableStateOf<SocialConversation?>(null) }
    var refreshing by remember { mutableStateOf(false) }
    var pinnedIds by remember { mutableStateOf(preferences.getStringSet("pinned_conversations", emptySet()).orEmpty()) }
    val currentUserId = repository.currentUserId()

    val filteredChats = remember(chats, query, currentUserId, pinnedIds) {
        chats.filter { it.requestStatus == "accepted" || it.requestedById == currentUserId }
            .filter { chat ->
                query.isBlank() || chat.title?.contains(query, true) == true ||
                    chat.members.any { it.userId != currentUserId && it.user.name.contains(query, true) }
            }
            .sortedWith(compareByDescending<SocialConversation> { it.id in pinnedIds }.thenByDescending { it.updatedAt })
    }

    LaunchedEffect(Unit) {
        runCatching { repository.refreshStories() }
        var refreshCycle = 0
        while (true) {
            runCatching { repository.refreshConversations(force = true) }
            if (refreshCycle % 3 == 0) runCatching { repository.refreshNotifications() }
            refreshCycle++
            delay(5000)
        }
    }
    composerMode?.let { mode ->
        NewConversationPage(
            repository,
            groupMode = mode == "group",
            onBack = { composerMode = null },
            onCreated = { composerMode = null; onChatClick(it) }
        )
        return
    }
    addMembersTo?.let { conversation ->
        AddConversationMembersPage(
            repository = repository,
            conversation = conversation,
            onBack = { addMembersTo = null },
            onDone = { updated -> addMembersTo = null; onChatClick(updated) }
        )
        return
    }

    Scaffold(
        containerColor = Color.White,
        contentWindowInsets = WindowInsets(0, 0, 0, 0),
        bottomBar = {
            ExactMessengerBottomNavigation(
                selected = tab,
                unreadMessages = chats.sumOf { it.unreadCount },
                unreadNotifications = notifications.count { it.status == "unread" && it.type !in listOf("message", "message_request") },
                hasRequests = chats.any { it.requestStatus == "pending" && it.requestedById != currentUserId },
                onSelect = { tab = it }
            )
        }
    ) { padding ->
        when (tab) {
            0 -> ExactMessengerChatsPage(
                chats = filteredChats,
                storyGroups = storyGroups,
                currentUser = currentUser,
                currentProfile = currentProfile,
                currentUserId = currentUserId,
                query = query,
                uploading = false,
                refreshing = refreshing,
                contentPadding = padding,
                onQuery = { query = it },
                onNewMessage = { composerMode = "direct" },
                onNewGroup = { composerMode = "group" },
                onAddStory = onCreateStory,
                onStory = onOpenStory,
                onRefresh = {
                    scope.launch {
                        refreshing = true
                        runCatching { repository.refreshConversations(force = true) }
                        runCatching { repository.refreshStories() }
                        refreshing = false
                    }
                },
                onChat = onChatClick,
                onLongPress = {
                    haptics.performHapticFeedback(androidx.compose.ui.hapticfeedback.HapticFeedbackType.LongPress)
                    selectedConversation = it
                }
            )
            1 -> ExactMessengerStoryGroupsPage(
                groups = storyGroups,
                currentUser = currentUser,
                currentProfile = currentProfile,
                contentPadding = padding,
                onAdd = onCreateStory,
                onOpen = onOpenStory
            )
            2 -> ExactMessengerNotificationsPage(repository, notifications, chats, padding, onChatClick, onSupportCenter)
            else -> ExactMessengerMenuPage(
                repository = repository,
                chats = chats,
                currentUser = currentUser,
                currentProfile = currentProfile,
                contentPadding = padding,
                onNewMessage = { composerMode = "direct" },
                onNewGroup = { composerMode = "group" },
                onChat = onChatClick,
                onProfile = onProfileClick,
                onSupportCenter = onSupportCenter
            )
        }
    }

    selectedConversation?.let { chat ->
        MessengerConversationActions(
            repository = repository,
            conversation = chat,
            pinned = chat.id in pinnedIds,
            onPin = {
                pinnedIds = if (chat.id in pinnedIds) pinnedIds - chat.id else pinnedIds + chat.id
                preferences.edit().putStringSet("pinned_conversations", pinnedIds).apply()
                selectedConversation = null
            },
            onDismiss = { selectedConversation = null },
            onOpen = { selectedConversation = null; onChatClick(chat) },
            onAddMembers = if (chat.type == "group") ({
                selectedConversation = null
                addMembersTo = chat
            }) else null
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class)
@Composable
private fun ExactMessengerChatsPage(
    chats: List<SocialConversation>,
    storyGroups: List<SocialStoryGroup>,
    currentUser: SocialUser?,
    currentProfile: SocialProfile?,
    currentUserId: String?,
    query: String,
    uploading: Boolean,
    refreshing: Boolean,
    contentPadding: PaddingValues,
    onQuery: (String) -> Unit,
    onNewMessage: () -> Unit,
    onNewGroup: () -> Unit,
    onAddStory: () -> Unit,
    onStory: (String) -> Unit,
    onRefresh: () -> Unit,
    onChat: (SocialConversation) -> Unit,
    onLongPress: (SocialConversation) -> Unit
) {
    var inboxFilter by remember { mutableStateOf("all") }
    val unreadTotal = remember(chats) { chats.sumOf { it.unreadCount } }
    val visibleChats = remember(chats, inboxFilter) {
        when (inboxFilter) {
            "unread" -> chats.filter { it.unreadCount > 0 }
            "groups" -> chats.filter { it.type == "group" }
            else -> chats
        }
    }
    Box(Modifier.fillMaxSize().padding(contentPadding).background(Color.White)) {
        PullToRefreshBox(
            isRefreshing = refreshing,
            onRefresh = onRefresh,
            modifier = Modifier.fillMaxSize()
        ) {
            LazyColumn(Modifier.fillMaxSize().statusBarsPadding()) {
                item {
                    Row(
                        Modifier.fillMaxWidth().height(50.dp).padding(start = 15.dp, end = 5.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Tiwi Chats", color = Color(0xFF0866FF), fontSize = 20.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = (-.3).sp, modifier = Modifier.weight(1f))
                        IconButton(onClick = onNewMessage, modifier = Modifier.size(38.dp)) { Icon(Icons.Outlined.Edit, "New message", modifier = Modifier.size(21.dp)) }
                        IconButton(onClick = onNewGroup, modifier = Modifier.size(38.dp)) { Icon(Icons.Outlined.GroupAdd, "New group", modifier = Modifier.size(22.dp)) }
                    }
                }
                item {
                    Surface(
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 2.dp).height(42.dp),
                        shape = RoundedCornerShape(26.dp),
                        color = Color(0xFFF0F2F5),
                        tonalElevation = 0.dp
                    ) {
                        Row(Modifier.padding(horizontal = 15.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Search, null, tint = Color(0xFF65676B), modifier = Modifier.size(20.dp))
                            BasicTextField(
                                value = query,
                                onValueChange = onQuery,
                                singleLine = true,
                                modifier = Modifier.weight(1f).padding(start = 8.dp),
                                textStyle = MaterialTheme.typography.bodyMedium.copy(color = Color(0xFF1C1E21), fontSize = 14.sp),
                                decorationBox = { inner ->
                                    if (query.isBlank()) Text("Ask Tiwi AI or Search", color = Color(0xFF65676B), fontSize = 14.sp)
                                    inner()
                                }
                            )
                        }
                    }
                }
                item {
                    TiwiStoryTray(
                        groups = storyGroups,
                        currentUser = currentUser,
                        currentProfile = currentProfile,
                        compact = true,
                        onCreate = onAddStory,
                        onOpen = onStory
                    )
                }
                item {
                    LazyRow(
                        modifier = Modifier.fillMaxWidth().height(40.dp),
                        contentPadding = PaddingValues(horizontal = 13.dp, vertical = 5.dp),
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        item {
                            MessengerInboxFilterChip("All", inboxFilter == "all") { inboxFilter = "all" }
                        }
                        item {
                            MessengerInboxFilterChip(
                                if (unreadTotal > 0) "Unread $unreadTotal" else "Unread",
                                inboxFilter == "unread"
                            ) { inboxFilter = "unread" }
                        }
                        item {
                            MessengerInboxFilterChip("Groups", inboxFilter == "groups") { inboxFilter = "groups" }
                        }
                        item {
                            IconButton(onClick = onNewGroup, modifier = Modifier.size(30.dp)) {
                                Icon(Icons.Default.MoreVert, "More chat shortcuts", tint = Color(0xFF65676B), modifier = Modifier.size(18.dp))
                            }
                        }
                    }
                }
                if (visibleChats.isEmpty()) item {
                    Column(Modifier.fillParentMaxHeight(.55f).fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                        Icon(Icons.Outlined.Forum, null, tint = Color(0xFF8A8D91), modifier = Modifier.size(54.dp))
                        Text(
                            when (inboxFilter) {
                                "unread" -> "No unread chats"
                                "groups" -> "No group chats"
                                else -> "No conversations yet"
                            },
                            fontWeight = FontWeight.Bold,
                            fontSize = 18.sp,
                            modifier = Modifier.padding(top = 10.dp)
                        )
                        if (inboxFilter == "all") Text("Tap the compose button to start messaging.", color = Color(0xFF65676B), fontSize = 13.sp)
                    }
                }
                items(visibleChats, key = { "exact-chat-${it.id}" }) { chat ->
                    val contact = chat.members.firstOrNull { it.userId != currentUserId }
                    val name = chat.title ?: contact?.user?.name ?: "Tiwi conversation"
                    val preview = messagePreview(chat.lastMessage, currentUserId)
                    Row(
                        Modifier.fillMaxWidth().heightIn(min = 68.dp).combinedClickable(
                            onClick = { onChat(chat) },
                            onLongClick = { onLongPress(chat) }
                        ).padding(horizontal = 14.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box {
                            DecoratedAvatar(contact?.user?.avatar ?: chat.avatarUrl, R.drawable.img_tiwi_avatar_1, contact?.profile?.avatarDecoration, Modifier.size(52.dp))
                            if (chat.type == "direct" && isSociallyActive(contact?.user?.socialLastActiveAt)) {
                                Box(Modifier.align(Alignment.BottomEnd).size(16.dp).background(Color.White, CircleShape).padding(2.dp).background(Color(0xFF31A24C), CircleShape))
                            }
                        }
                        Column(Modifier.weight(1f).padding(start = 10.dp, end = 7.dp)) {
                            Text(name, fontWeight = if (chat.unreadCount > 0) FontWeight.Black else FontWeight.Medium, fontSize = 14.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                            Text(
                                if (chat.unreadCount > 0) "${chat.unreadCount} new ${if (chat.unreadCount == 1) "message" else "messages"}" else preview,
                                color = if (chat.unreadCount > 0) Color(0xFF050505) else Color(0xFF65676B),
                                fontWeight = if (chat.unreadCount > 0) FontWeight.Bold else FontWeight.Normal,
                                fontSize = 12.sp,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                        Column(horizontalAlignment = Alignment.End) {
                            Text(relativePostTime(chat.updatedAt), color = Color(0xFF65676B), fontSize = 10.sp)
                            Spacer(Modifier.height(6.dp))
                            if (chat.unreadCount > 0) Box(Modifier.size(9.dp).background(Color(0xFF0866FF), CircleShape))
                            else if (chat.lastMessage?.deliveryStatus == "read" && chat.lastMessage.senderId == currentUserId) {
                                DecoratedAvatar(contact?.user?.avatar, R.drawable.img_tiwi_avatar_1, contact?.profile?.avatarDecoration, Modifier.size(13.dp))
                            }
                        }
                    }
                }
                item { Spacer(Modifier.height(78.dp)) }
            }
        }
        ExactMessengerFloatingButton(Modifier.align(Alignment.BottomEnd).padding(end = 17.dp, bottom = 14.dp))
    }
}

@Composable
private fun MessengerInboxFilterChip(label: String, selected: Boolean, onClick: () -> Unit) {
    Surface(
        modifier = Modifier.height(30.dp).clickable(onClick = onClick),
        shape = RoundedCornerShape(18.dp),
        color = if (selected) Color(0xFFE7F3FF) else Color(0xFFE4E6EB),
        tonalElevation = 0.dp
    ) {
        Box(Modifier.padding(horizontal = 11.dp), contentAlignment = Alignment.Center) {
            Text(
                label,
                color = if (selected) Color(0xFF0866FF) else Color(0xFF4B4F56),
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold
            )
        }
    }
}

@Composable
private fun ExactMessengerStoryBubble(
    name: String,
    avatar: String?,
    decoration: SocialProfileDecoration?,
    note: String,
    active: Boolean,
    create: Boolean,
    uploading: Boolean,
    onClick: () -> Unit
) {
    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.width(79.dp).clickable(enabled = !uploading, onClick = onClick)) {
        Box(Modifier.height(105.dp).fillMaxWidth(), contentAlignment = Alignment.BottomCenter) {
            Surface(
                modifier = Modifier.align(Alignment.TopCenter).widthIn(max = 78.dp),
                shape = RoundedCornerShape(14.dp),
                color = if (create) Color.White else Color(0xFFF0F2F5),
                border = BorderStroke(.5.dp, Color(0xFFDADDE1)),
                tonalElevation = 0.dp
            ) {
                Text(note, maxLines = 2, overflow = TextOverflow.Ellipsis, textAlign = TextAlign.Center, fontSize = 9.sp, lineHeight = 10.sp, modifier = Modifier.padding(horizontal = 6.dp, vertical = 4.dp))
            }
            Box(Modifier.align(Alignment.BottomCenter)) {
                DecoratedAvatar(
                    avatar,
                    R.drawable.img_tiwi_avatar_1,
                    decoration,
                    Modifier.size(68.dp).then(if (!create) Modifier.border(2.dp, Color(0xFF0866FF), CircleShape).padding(2.dp) else Modifier)
                )
                if (create) Surface(Modifier.align(Alignment.BottomEnd).size(26.dp), shape = CircleShape, color = Color.White, tonalElevation = 0.dp) {
                    Box(contentAlignment = Alignment.Center) {
                        if (uploading) CircularProgressIndicator(Modifier.size(16.dp), strokeWidth = 2.dp)
                        else Icon(Icons.Default.Add, "Add story", modifier = Modifier.size(20.dp))
                    }
                }
                if (active) Box(Modifier.align(Alignment.BottomEnd).offset(x = (-2).dp).size(15.dp).background(Color.White, CircleShape).padding(3.dp).background(Color(0xFF31A24C), CircleShape))
            }
        }
        Text(name, fontSize = 11.sp, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(top = 2.dp))
    }
}

@Composable
private fun ExactMessengerBottomNavigation(
    selected: Int,
    unreadMessages: Int,
    unreadNotifications: Int,
    hasRequests: Boolean,
    onSelect: (Int) -> Unit
) {
    NavigationBar(
        containerColor = Color.White,
        tonalElevation = 0.dp,
        modifier = Modifier.navigationBarsPadding().height(62.dp)
    ) {
        val rows = listOf(
            Triple("Chats", Icons.Filled.ChatBubble, Icons.Outlined.ChatBubbleOutline),
            Triple("Stories", Icons.Filled.AutoStories, Icons.Outlined.AutoStories),
            Triple("Notifications", Icons.Filled.Notifications, Icons.Outlined.NotificationsNone),
            Triple("Menu", Icons.Filled.Menu, Icons.Outlined.Menu)
        )
        rows.forEachIndexed { index, item ->
            NavigationBarItem(
                selected = selected == index,
                onClick = { onSelect(index) },
                icon = {
                    BadgedBox(badge = {
                        when {
                            index == 0 && unreadMessages > 0 -> Badge { Text(if (unreadMessages > 50) "50+" else unreadMessages.toString()) }
                            index == 2 && unreadNotifications > 0 -> Badge { Text(if (unreadNotifications > 9) "9+" else unreadNotifications.toString()) }
                            (index == 1 && unreadNotifications > 0) || (index == 3 && hasRequests) -> Badge(Modifier.size(9.dp))
                        }
                    }) {
                        Icon(if (selected == index) item.second else item.third, item.first, modifier = Modifier.size(22.dp))
                    }
                },
                label = { Text(item.first, fontSize = 9.sp, maxLines = 1) },
                colors = NavigationBarItemDefaults.colors(
                    selectedIconColor = Color(0xFF0866FF),
                    selectedTextColor = Color(0xFF0866FF),
                    indicatorColor = Color.Transparent,
                    unselectedIconColor = Color(0xFF8A8D91),
                    unselectedTextColor = Color(0xFF65676B)
                )
            )
        }
    }
}

@Composable
internal fun ExactMessengerFloatingButton(modifier: Modifier = Modifier) {
    Surface(
        modifier = modifier.size(48.dp),
        shape = CircleShape,
        color = Color.White,
        border = BorderStroke(.5.dp, Color(0xFFDADDE1)),
        tonalElevation = 0.dp
    ) {
        Box(contentAlignment = Alignment.Center) {
            Image(painterResource(R.drawable.img_tiwi_avatar_1), null, modifier = Modifier.size(36.dp).clip(CircleShape), contentScale = ContentScale.Crop)
        }
    }
}

private fun storyItemThumbnail(item: com.example.social.SocialStoryItem?): String? {
    if (item == null) return null
    val direct = item.media["thumbnailUrl"]?.toString() ?: item.media["url"]?.toString()
    if (!direct.isNullOrBlank()) return direct
    val first = (item.media["items"] as? List<*>)?.firstOrNull() as? Map<*, *>
    return first?.get("thumbnailUrl")?.toString() ?: first?.get("url")?.toString()
}

@Composable
private fun ExactMessengerStoryGroupsPage(
    groups: List<SocialStoryGroup>,
    currentUser: SocialUser?,
    currentProfile: SocialProfile?,
    contentPadding: PaddingValues,
    onAdd: () -> Unit,
    onOpen: (String) -> Unit
) {
    val currentId = currentUser?.id
    val mine = groups.firstOrNull { it.authorId == currentId }
    val others = groups.filterNot { it.authorId == currentId }
    Column(Modifier.fillMaxSize().padding(contentPadding).background(Color.White).statusBarsPadding()) {
        Text("Stories", fontSize = 25.sp, fontWeight = FontWeight.Black, letterSpacing = (-.5).sp, modifier = Modifier.padding(start = 15.dp, top = 8.dp, bottom = 5.dp))
        TiwiStoryTray(groups, currentUser, currentProfile, compact = true, onCreate = onAdd, onOpen = onOpen)
        HorizontalDivider(thickness = .5.dp, color = Color(0xFFE4E7EC))
        Text("Latest stories", fontSize = 14.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 14.dp, vertical = 9.dp))
        LazyVerticalGrid(
            columns = GridCells.Fixed(2),
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(horizontal = 10.dp, vertical = 2.dp),
            horizontalArrangement = Arrangement.spacedBy(7.dp),
            verticalArrangement = Arrangement.spacedBy(7.dp)
        ) {
            item(key = "messenger-add-story") {
                Box(Modifier.aspectRatio(.72f).clip(RoundedCornerShape(13.dp)).background(Color(0xFFE9ECF1)).clickable(onClick = onAdd), contentAlignment = Alignment.Center) {
                    AsyncImage(currentUser?.avatar, null, Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                    Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Color.Transparent, Color.Black.copy(alpha = .58f)))))
                    Box(Modifier.align(Alignment.TopStart).padding(10.dp).size(38.dp).background(Color.White, CircleShape), contentAlignment = Alignment.Center) { Icon(Icons.Default.Add, null, tint = TiwiBlue) }
                    Text("Add to story", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold, modifier = Modifier.align(Alignment.BottomStart).padding(11.dp))
                }
            }
            gridItems(others, key = { "messenger-story-group-${it.authorId}" }) { group ->
                val item = group.stories.lastOrNull()?.items?.firstOrNull()
                Box(Modifier.aspectRatio(.72f).clip(RoundedCornerShape(13.dp)).background(Color.Black).clickable { onOpen(group.authorId) }) {
                    AsyncImage(storyItemThumbnail(item) ?: group.author.avatar, null, Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                    Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Color.Transparent, Color.Black.copy(alpha = .66f)))))
                    TiwiAvatar(group.author.avatar, R.drawable.img_tiwi_avatar_1, Modifier.align(Alignment.TopStart).padding(9.dp).size(38.dp).clip(CircleShape).border(if (group.unseenCount > 0) 2.dp else 1.dp, if (group.unseenCount > 0) Color(0xFFE1306C) else Color.White.copy(alpha = .7f), CircleShape).padding(2.dp))
                    Text(group.author.name, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 12.sp, maxLines = 2, modifier = Modifier.align(Alignment.BottomStart).padding(11.dp))
                }
            }
        }
    }
}

@Composable
private fun ExactMessengerStoriesPage(
    repository: SocialRepository,
    stories: List<SocialPost>,
    currentUser: SocialUser?,
    uploading: Boolean,
    contentPadding: PaddingValues,
    onAdd: () -> Unit,
    onOpen: (SocialPost) -> Unit
) {
    val currentUserId = repository.currentUserId()
    val cards = remember(stories, currentUserId) { stories.filter { it.authorId != currentUserId }.distinctBy { it.authorId } }
    Box(Modifier.fillMaxSize().padding(contentPadding).background(Color.White)) {
        Column(Modifier.fillMaxSize().statusBarsPadding()) {
            Text("Stories", fontSize = 25.sp, fontWeight = FontWeight.Black, letterSpacing = (-.5).sp, modifier = Modifier.padding(start = 15.dp, top = 8.dp, bottom = 7.dp))
            LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(horizontal = 12.dp, vertical = 2.dp), verticalArrangement = Arrangement.spacedBy(7.dp)) {
                val all = listOf<SocialPost?>(null) + cards
                items(all.chunked(2), key = { row -> row.joinToString("-") { it?.id ?: "create" } }) { row ->
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                        row.forEach { story ->
                            val media = story?.media?.firstOrNull()
                            Box(
                                Modifier.weight(1f).aspectRatio(.72f).clip(RoundedCornerShape(13.dp)).background(Color(0xFFF0F2F5))
                                    .clickable(enabled = !uploading) { if (story == null) onAdd() else onOpen(story) }
                            ) {
                                if (story == null) {
                                    TiwiAvatar(currentUser?.avatar, R.drawable.img_tiwi_avatar_1, Modifier.fillMaxSize(), ContentScale.Crop)
                                    Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Color.Transparent, Color.Black.copy(alpha = .58f)))))
                                    Surface(Modifier.align(Alignment.TopStart).padding(13.dp).size(43.dp), shape = CircleShape, color = Color.White, tonalElevation = 0.dp) {
                                        Box(contentAlignment = Alignment.Center) { if (uploading) CircularProgressIndicator(Modifier.size(21.dp), strokeWidth = 2.dp) else Icon(Icons.Default.Add, "Add story", modifier = Modifier.size(30.dp)) }
                                    }
                                    Text("Add to story", color = Color.White, fontWeight = FontWeight.Medium, fontSize = 16.sp, modifier = Modifier.align(Alignment.BottomStart).padding(13.dp))
                                } else {
                                    when (media?.type) {
                                        "image" -> AsyncImage(media.url, null, Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                                        "video" -> AsyncImage(media.thumbnailUrl ?: story.author.avatar, null, Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                                        else -> Box(Modifier.fillMaxSize().background(Brush.linearGradient(listOf(TiwiBlue, TiwiPurple))))
                                    }
                                    Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Color.Transparent, Color.Black.copy(alpha = .58f)))))
                                    Box(Modifier.align(Alignment.TopStart).padding(11.dp)) {
                                        DecoratedAvatar(story.author.avatar, R.drawable.img_tiwi_avatar_1, story.authorProfile?.avatarDecoration, Modifier.size(44.dp).border(3.dp, Color(0xFF0866FF), CircleShape).padding(3.dp))
                                        if (isSociallyActive(story.author.socialLastActiveAt)) Box(Modifier.align(Alignment.BottomEnd).size(12.dp).background(Color(0xFF31A24C), CircleShape))
                                    }
                                    Text(story.author.name, color = Color.White, fontWeight = FontWeight.Medium, fontSize = 14.sp, maxLines = 2, modifier = Modifier.align(Alignment.BottomStart).padding(12.dp))
                                }
                            }
                        }
                        if (row.size == 1) Spacer(Modifier.weight(1f))
                    }
                }
                item { Spacer(Modifier.height(74.dp)) }
            }
        }
        ExactMessengerFloatingButton(Modifier.align(Alignment.BottomEnd).padding(end = 17.dp, bottom = 14.dp))
    }
}

@Composable
private fun ExactMessengerNotificationsPage(
    repository: SocialRepository,
    notifications: List<SocialNotification>,
    chats: List<SocialConversation>,
    contentPadding: PaddingValues,
    onChat: (SocialConversation) -> Unit,
    onSupportCenter: () -> Unit
) {
    val scope = rememberTiwiCoroutineScope()
    val rows = remember(notifications, chats) {
        if (notifications.isNotEmpty()) notifications else chats.filter { it.unreadCount > 0 }.map { chat ->
            val contact = chat.members.firstOrNull { it.userId != repository.currentUserId() }
            SocialNotification(
                id = "chat-${chat.id}",
                scopeId = chat.id,
                type = "message",
                title = contact?.user?.name ?: chat.title ?: "Tiwi message",
                message = if (chat.unreadCount > 1) "Sent ${chat.unreadCount} messages" else messagePreview(chat.lastMessage, repository.currentUserId()),
                status = "unread",
                metadata = mapOf("conversationId" to chat.id, "actorAvatar" to contact?.user?.avatar),
                createdAt = chat.updatedAt
            )
        }
    }
    Box(Modifier.fillMaxSize().padding(contentPadding).background(Color.White)) {
        LazyColumn(Modifier.fillMaxSize().statusBarsPadding()) {
            item { Text("Notifications", fontSize = 25.sp, fontWeight = FontWeight.Black, letterSpacing = (-.5).sp, modifier = Modifier.padding(start = 15.dp, top = 8.dp, bottom = 16.dp)) }
            item { Text("New", color = Color(0xFF65676B), fontSize = 13.sp, modifier = Modifier.padding(horizontal = 15.dp, vertical = 4.dp)) }
            if (rows.isEmpty()) item {
                Column(Modifier.fillParentMaxHeight(.65f).fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                    Icon(Icons.Outlined.NotificationsNone, null, tint = Color(0xFF8A8D91), modifier = Modifier.size(54.dp))
                    Text("No notifications yet", fontWeight = FontWeight.Bold, fontSize = 18.sp, modifier = Modifier.padding(top = 10.dp))
                }
            }
            items(rows, key = { "exact-notification-${it.id}" }) { notification ->
                val avatar = notification.metadata["actorAvatar"]?.toString()
                Row(
                    Modifier.fillMaxWidth().clickable {
                        scope.launch {
                            if (!notification.id.startsWith("chat-") && notification.status == "unread") runCatching { repository.markNotificationRead(notification.id) }
                            if (notification.metadata["destination"]?.toString() == "support_center") {
                                onSupportCenter()
                                return@launch
                            }
                            val conversationId = notification.metadata["conversationId"]?.toString() ?: notification.scopeId
                            chats.firstOrNull { it.id == conversationId }?.let(onChat)
                        }
                    }.padding(horizontal = 14.dp, vertical = 7.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box {
                        TiwiAvatar(avatar, R.drawable.img_tiwi_avatar_1, Modifier.size(50.dp).clip(CircleShape))
                        if (notification.type in listOf("message", "message_request")) Box(Modifier.align(Alignment.BottomEnd).size(13.dp).background(Color(0xFF31A24C), CircleShape))
                    }
                    Column(Modifier.weight(1f).padding(start = 10.dp, end = 7.dp)) {
                        Text(notification.title, fontWeight = FontWeight.Black, fontSize = 14.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Text("${notification.message} · ${relativePostTime(notification.createdAt)}", fontSize = 12.sp, color = Color(0xFF1C1E21), maxLines = 2, overflow = TextOverflow.Ellipsis)
                    }
                    if (notification.status == "unread") Box(Modifier.size(9.dp).background(Color(0xFF0866FF), CircleShape))
                }
            }
            item { Spacer(Modifier.height(74.dp)) }
        }
        ExactMessengerFloatingButton(Modifier.align(Alignment.BottomEnd).padding(end = 17.dp, bottom = 14.dp))
    }
}

@Composable
private fun ExactMessengerMenuPage(
    repository: SocialRepository,
    chats: List<SocialConversation>,
    currentUser: SocialUser?,
    currentProfile: SocialProfile?,
    contentPadding: PaddingValues,
    onNewMessage: () -> Unit,
    onNewGroup: () -> Unit,
    onChat: (SocialConversation) -> Unit,
    onProfile: () -> Unit,
    onSupportCenter: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberTiwiCoroutineScope()
    var page by remember { mutableStateOf<String?>(null) }
    var archived by remember { mutableStateOf<List<SocialConversation>>(emptyList()) }
    var people by remember { mutableStateOf<List<SocialProfile>>(emptyList()) }
    val requests = chats.filter { it.requestStatus == "pending" && it.requestedById != repository.currentUserId() }
    LaunchedEffect(page) {
        if (page == "Archive") archived = runCatching { repository.archivedConversations() }.getOrDefault(emptyList())
        if (page == "Friend requests") people = runCatching { repository.searchProfiles("") }.getOrDefault(emptyList()).filter { !it.isFollowing && it.userId != repository.currentUserId() }
    }
    if (page == "Support Center") {
        SupportCenterPage(repository, onBack = { page = null })
        return
    }
    if (page != null) {
        Column(Modifier.fillMaxSize().padding(contentPadding).background(Color.White).statusBarsPadding()) {
            Row(Modifier.fillMaxWidth().height(58.dp), verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = { page = null }) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") }
                Text(page.orEmpty(), fontWeight = FontWeight.Black, fontSize = 22.sp)
            }
            when (page) {
                "Settings" -> {
                    val prefs = remember { context.getSharedPreferences("tiwi_messenger", Context.MODE_PRIVATE) }
                    var sounds by remember { mutableStateOf(prefs.getBoolean("sounds", true)) }
                    MessengerSettingSwitch(Icons.Outlined.VolumeUp, "Notifications & sounds", "Play a sound for new messages", sounds) { sounds = it; prefs.edit().putBoolean("sounds", it).apply() }
                    MessengerInfoRow(Icons.Outlined.Security, "Privacy & safety", "Message requests, blocking and reporting are managed per chat", enabled = false) {}
                }
                "Message requests" -> {
                    if (requests.isEmpty()) Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { Text("No message requests", color = Color(0xFF65676B)) }
                    else LazyColumn {
                        items(requests, key = { "request-${it.id}" }) { chat ->
                            val contact = chat.members.firstOrNull { it.userId != repository.currentUserId() }
                            Column(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 10.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    DecoratedAvatar(contact?.user?.avatar, R.drawable.img_tiwi_avatar_1, contact?.profile?.avatarDecoration, Modifier.size(58.dp))
                                    Column(Modifier.weight(1f).padding(start = 11.dp)) {
                                        Text(contact?.user?.name ?: "Tiwi user", fontWeight = FontWeight.Black, fontSize = 16.sp)
                                        Text(messagePreview(chat.lastMessage, repository.currentUserId()), maxLines = 2, overflow = TextOverflow.Ellipsis)
                                    }
                                }
                                Row(Modifier.fillMaxWidth().padding(top = 9.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Button(onClick = { scope.launch { repository.respondToMessageRequest(chat.id, false) } }, modifier = Modifier.weight(1f), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFE4E6EB), contentColor = Color.Black), shape = RoundedCornerShape(8.dp)) { Text("Delete") }
                                    Button(onClick = { scope.launch { runCatching { repository.respondToMessageRequest(chat.id, true) }.onSuccess(onChat) } }, modifier = Modifier.weight(1f), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0866FF)), shape = RoundedCornerShape(8.dp)) { Text("Accept") }
                                }
                            }
                        }
                    }
                }
                "Archive" -> {
                    if (archived.isEmpty()) Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { Text("No archived chats", color = Color(0xFF65676B)) }
                    else LazyColumn {
                        items(archived, key = { "archive-${it.id}" }) { chat ->
                            val contact = chat.members.firstOrNull { it.userId != repository.currentUserId() }
                            Row(Modifier.fillMaxWidth().clickable { onChat(chat) }.padding(horizontal = 16.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                                DecoratedAvatar(contact?.user?.avatar, R.drawable.img_tiwi_avatar_1, contact?.profile?.avatarDecoration, Modifier.size(58.dp))
                                Text(chat.title ?: contact?.user?.name ?: "Tiwi chat", fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f).padding(start = 11.dp))
                                TextButton(onClick = { scope.launch { repository.updateConversationMember(chat.id, archived = false); archived = archived.filterNot { it.id == chat.id } } }) { Text("Restore") }
                            }
                        }
                    }
                }
                else -> {
                    LazyColumn {
                        items(people, key = { "connection-${it.userId}" }) { profile ->
                            Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 9.dp), verticalAlignment = Alignment.CenterVertically) {
                                DecoratedAvatar(profile.user.avatar, R.drawable.img_tiwi_avatar_1, profile.avatarDecoration, Modifier.size(58.dp))
                                Column(Modifier.weight(1f).padding(start = 11.dp)) {
                                    Text(profile.user.name, fontWeight = FontWeight.Black)
                                    Text("@${profile.username}", color = Color(0xFF65676B), fontSize = 12.sp)
                                }
                                Button(onClick = { scope.launch { runCatching { repository.follow(profile.userId, true) }.onSuccess { people = people.filterNot { row -> row.userId == profile.userId } } } }, shape = RoundedCornerShape(8.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0866FF))) { Text("Follow") }
                            }
                        }
                    }
                }
            }
        }
        return
    }
    Box(Modifier.fillMaxSize().padding(contentPadding).background(Color.White)) {
        Column(Modifier.fillMaxSize().statusBarsPadding().verticalScroll(rememberScrollState())) {
            Row(Modifier.fillMaxWidth().height(54.dp).padding(horizontal = 15.dp), verticalAlignment = Alignment.CenterVertically) {
                Text("Menu", fontSize = 25.sp, fontWeight = FontWeight.Black, modifier = Modifier.weight(1f))
                Icon(Icons.Default.QrCode2, "Tiwi code", modifier = Modifier.size(25.dp))
            }
            Row(Modifier.fillMaxWidth().clickable(onClick = onProfile).padding(horizontal = 15.dp, vertical = 7.dp), verticalAlignment = Alignment.CenterVertically) {
                DecoratedAvatar(currentUser?.avatar, R.drawable.img_tiwi_avatar_1, currentProfile?.avatarDecoration, Modifier.size(46.dp))
                Column(Modifier.weight(1f).padding(start = 10.dp)) {
                    Text(currentUser?.name ?: "Tiwi account", fontWeight = FontWeight.Medium, fontSize = 14.sp)
                    Text("Switch profile · @${currentProfile?.username.orEmpty()}", color = Color(0xFF65676B), fontSize = 11.sp)
                }
                if (requests.isNotEmpty()) Badge { Text(requests.size.toString()) }
            }
            ExactMenuRow(Icons.Filled.Settings, "Settings") { page = "Settings" }
            HorizontalDivider(thickness = .6.dp, color = Color(0xFFDADDE1), modifier = Modifier.padding(vertical = 8.dp))
            ExactMenuRow(Icons.Filled.Storefront, "Marketplace") { context.startActivity(Intent(Intent.ACTION_VIEW, android.net.Uri.parse("https://tiwlo.com/marketplace"))) }
            ExactMenuRow(Icons.Filled.Groups, "Communities") { onNewGroup() }
            ExactMenuRow(Icons.Filled.Help, "Support") { context.startActivity(Intent(Intent.ACTION_VIEW, android.net.Uri.parse("https://tiwlo.com/support"))) }
            ExactMenuRow(Icons.Filled.SupportAgent, "Support Center") { page = "Support Center" }
            ExactMenuRow(Icons.Filled.QuestionAnswer, "Message requests", if (requests.isNotEmpty()) requests.size.toString() else null) { page = "Message requests" }
            ExactMenuRow(Icons.Filled.Inventory2, "Archive") { page = "Archive" }
            HorizontalDivider(thickness = .6.dp, color = Color(0xFFDADDE1), modifier = Modifier.padding(vertical = 8.dp))
            ExactMenuRow(Icons.Filled.GroupAdd, "Friend requests") { page = "Friend requests" }
            Text("Also from Tiwi", color = Color(0xFF65676B), fontSize = 13.sp, modifier = Modifier.padding(horizontal = 15.dp, vertical = 9.dp))
            ExactMenuRow(Icons.Filled.SmartDisplay, "Tiwi Reels") { context.startActivity(Intent(Intent.ACTION_VIEW, android.net.Uri.parse("https://tiwlo.com/social/reels"))) }
            ExactMenuRow(Icons.Filled.Event, "Tiwi Events") { context.startActivity(Intent(Intent.ACTION_VIEW, android.net.Uri.parse("https://tiwlo.com/social/events"))) }
            Spacer(Modifier.height(90.dp))
        }
        ExactMessengerFloatingButton(Modifier.align(Alignment.BottomEnd).padding(end = 17.dp, bottom = 14.dp))
    }
}

@Composable
private fun ExactMenuRow(icon: ImageVector, title: String, badge: String? = null, onClick: () -> Unit) {
    Row(Modifier.fillMaxWidth().clickable(onClick = onClick).padding(horizontal = 18.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
        Icon(icon, null, modifier = Modifier.size(23.dp))
        Text(title, fontSize = 15.sp, modifier = Modifier.weight(1f).padding(start = 16.dp))
        if (badge != null) Badge { Text(badge) }
    }
}

@Composable
private fun AddConversationMembersPage(
    repository: SocialRepository,
    conversation: SocialConversation,
    onBack: () -> Unit,
    onDone: (SocialConversation) -> Unit
) {
    val scope = rememberTiwiCoroutineScope()
    val context = LocalContext.current
    var query by remember { mutableStateOf("") }
    var people by remember { mutableStateOf<List<SocialProfile>>(emptyList()) }
    var selected by remember { mutableStateOf<Set<String>>(emptySet()) }
    var busy by remember { mutableStateOf(false) }
    val existing = remember(conversation.members) { conversation.members.map { it.userId }.toSet() }
    LaunchedEffect(query) {
        delay(220)
        people = runCatching { repository.searchProfiles(query) }.getOrDefault(emptyList()).filter { it.userId !in existing }
    }
    Column(Modifier.fillMaxSize().background(Color.White).statusBarsPadding().navigationBarsPadding()) {
        Row(Modifier.fillMaxWidth().height(58.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack, enabled = !busy) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") }
            Column(Modifier.weight(1f)) {
                Text("Add members", fontWeight = FontWeight.Black, fontSize = 21.sp)
                Text("${selected.size} selected", color = Color(0xFF65676B), fontSize = 12.sp)
            }
            TextButton(enabled = selected.isNotEmpty() && !busy, onClick = {
                busy = true
                scope.launch {
                    runCatching { repository.addConversationMembers(conversation.id, selected.toList()) }
                        .onSuccess(onDone)
                        .onFailure { Toast.makeText(context, it.message ?: "Members could not be added", Toast.LENGTH_LONG).show() }
                    busy = false
                }
            }) { if (busy) CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp) else Text("Add", fontWeight = FontWeight.Bold) }
        }
        Surface(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp).height(48.dp), color = Color(0xFFF0F2F5), shape = RoundedCornerShape(24.dp), tonalElevation = 0.dp) {
            Row(Modifier.padding(horizontal = 14.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.Search, null, tint = Color(0xFF65676B))
                BasicTextField(query, { query = it }, Modifier.weight(1f).padding(start = 9.dp), singleLine = true, decorationBox = { inner -> if (query.isBlank()) Text("Search people", color = Color(0xFF65676B)); inner() })
            }
        }
        LazyColumn(Modifier.fillMaxSize()) {
            items(people, key = { "add-member-${it.userId}" }) { profile ->
                Row(Modifier.fillMaxWidth().clickable { selected = if (profile.userId in selected) selected - profile.userId else selected + profile.userId }.padding(horizontal = 16.dp, vertical = 9.dp), verticalAlignment = Alignment.CenterVertically) {
                    DecoratedAvatar(profile.user.avatar, R.drawable.img_tiwi_avatar_1, profile.avatarDecoration, Modifier.size(56.dp))
                    Column(Modifier.weight(1f).padding(start = 11.dp)) {
                        Text(profile.user.name, fontWeight = FontWeight.Bold)
                        Text("@${profile.username}", color = Color(0xFF65676B), fontSize = 12.sp)
                    }
                    Checkbox(profile.userId in selected, { checked -> selected = if (checked) selected + profile.userId else selected - profile.userId })
                }
            }
        }
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun LegacyMessagesScreen(repository: SocialRepository, onBack: () -> Unit, onChatClick: (SocialConversation) -> Unit) {
    val chats by repository.conversations.collectAsState()
    val currentUser by repository.currentUser.collectAsState()
    var chatQuery by remember { mutableStateOf("") }
    var composerMode by remember { mutableStateOf<String?>(null) }
    var messageTab by remember { mutableIntStateOf(0) }
    var messengerTab by remember { mutableIntStateOf(0) }
    var selectedConversation by remember { mutableStateOf<SocialConversation?>(null) }
    var stories by remember { mutableStateOf<List<SocialPost>>(emptyList()) }
    var selectedStory by remember { mutableStateOf<SocialPost?>(null) }
    var storyUploading by remember { mutableStateOf(false) }
    val currentUserId = repository.currentUserId()
    val scope = rememberTiwiCoroutineScope()
    val context = LocalContext.current
    val messengerPreferences = remember { context.getSharedPreferences("tiwi_messenger", Context.MODE_PRIVATE) }
    var pinnedIds by remember { mutableStateOf(messengerPreferences.getStringSet("pinned_conversations", emptySet()).orEmpty()) }
    val contacts = remember(chats, currentUserId) {
        chats.filter { it.requestStatus == "accepted" }
            .mapNotNull { it.members.firstOrNull { member -> member.userId != currentUserId } }
            .distinctBy { it.userId }
    }
    val activeContacts = remember(contacts) { contacts.filter { isSociallyActive(it.user.socialLastActiveAt) }.take(12) }
    val storyCards = remember(stories, currentUserId) { stories.filter { it.authorId != currentUserId }.distinctBy { it.authorId } }
    val myStory = remember(stories, currentUserId) { stories.firstOrNull { it.authorId == currentUserId } }
    val visibleChats = remember(chats, chatQuery, currentUserId, messageTab, pinnedIds) {
        val byRequest = chats.filter { chat -> if (messageTab == 0) chat.requestStatus == "accepted" || chat.requestedById == currentUserId else chat.requestStatus == "pending" && chat.requestedById != currentUserId }
        val filtered = if (chatQuery.isBlank()) byRequest else byRequest.filter { chat ->
            chat.title?.contains(chatQuery, true) == true || chat.members.any { it.userId != currentUserId && it.user.name.contains(chatQuery, true) }
        }
        filtered.sortedWith(compareByDescending<SocialConversation> { it.id in pinnedIds }.thenByDescending { it.updatedAt })
    }
    val storyPicker = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
        if (uri != null) scope.launch {
            storyUploading = true
            runCatching {
                val media = repository.uploadMedia(context.contentResolver, uri, "story")
                repository.createPost("", type = "story", media = listOf(media), visibility = "public")
            }.onSuccess { stories = repository.stories(); selectedStory = it }
                .onFailure { Toast.makeText(context, it.message ?: "Story upload failed", Toast.LENGTH_LONG).show() }
            storyUploading = false
        }
    }
    LaunchedEffect(Unit) {
        var previousUnread = chats.sumOf { it.unreadCount }
        stories = runCatching { repository.stories() }.getOrDefault(emptyList())
        while (true) {
            val refreshed = runCatching { repository.refreshConversations(force = true) }.getOrDefault(emptyList())
            val currentUnread = refreshed.sumOf { it.unreadCount }
            if (currentUnread > previousUnread && messengerPreferences.getBoolean("sounds", true)) playMessageSound(context)
            previousUnread = currentUnread
            delay(3000)
        }
    }
    selectedStory?.let { story ->
        BackHandler { selectedStory = null }
        MessengerStoryViewer(story = story, repository = repository, onClose = { selectedStory = null })
        return
    }
    composerMode?.let { mode ->
        NewConversationPage(
            repository = repository,
            groupMode = mode == "group",
            onBack = { composerMode = null },
            onCreated = { conversation -> composerMode = null; onChatClick(conversation) }
        )
        return
    }
    Scaffold(
        containerColor = Color.White,
        bottomBar = {
            MessengerBottomNavigation(
                selected = messengerTab,
                unread = chats.sumOf { it.unreadCount },
                onSelect = { messengerTab = it }
            )
        }
    ) { messengerPadding ->
    when (messengerTab) {
    0 -> Column(modifier = Modifier.fillMaxSize().padding(messengerPadding).background(Color.White)) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .statusBarsPadding()
                .height(48.dp)
                .padding(horizontal = 2.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, contentDescription = "Back") }
            Text("Tiwi Messenger", style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Black))
            Spacer(modifier = Modifier.weight(1f))
            IconButton(onClick = { composerMode = "group" }) { Icon(Icons.Default.GroupAdd, contentDescription = "Create group", tint = TiwiBlue) }
            IconButton(onClick = { composerMode = "direct" }) { Icon(Icons.Default.Edit, contentDescription = "New Message", tint = TiwiBlue) }
        }
        HorizontalDivider(thickness = .5.dp, color = Color.LightGray.copy(alpha = .55f))

        TabRow(selectedTabIndex = messageTab, containerColor = Color.Transparent, divider = {}) {
            Tab(selected = messageTab == 0, onClick = { messageTab = 0 }, text = { Text("Chats", fontWeight = FontWeight.Bold) })
            Tab(selected = messageTab == 1, onClick = { messageTab = 1 }, text = { Text("Requests${chats.count { it.requestStatus == "pending" && it.requestedById != currentUserId }.let { if (it > 0) " ($it)" else "" }}", fontWeight = FontWeight.Bold) })
        }

        // Real 24-hour stories, shared through the Social API.
        if (messageTab == 0) LazyRow(
            contentPadding = PaddingValues(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(16.dp),
            modifier = Modifier.padding(top = 8.dp, bottom = 10.dp)
        ) {
            item {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Box(
                        modifier = Modifier.size(68.dp)
                            .border(if (myStory != null) 3.dp else 1.dp, if (myStory != null) TiwiBlue else Color(0xFFD0D5DD), CircleShape)
                            .padding(2.dp)
                            .clickable(enabled = !storyUploading) {
                                if (myStory != null) selectedStory = myStory
                                else storyPicker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageAndVideo))
                            },
                        contentAlignment = Alignment.Center
                    ) {
                        DecoratedAvatar(currentUser?.avatar, R.drawable.img_tiwi_avatar_1, repository.profile.value?.avatarDecoration, Modifier.fillMaxSize())
                        Surface(Modifier.align(Alignment.BottomEnd).size(22.dp), shape = CircleShape, color = TiwiBlue, border = BorderStroke(2.dp, Color.White)) {
                            Box(contentAlignment = Alignment.Center) {
                                if (storyUploading) CircularProgressIndicator(Modifier.size(13.dp), color = Color.White, strokeWidth = 2.dp)
                                else Icon(Icons.Default.Add, contentDescription = "Add story", tint = Color.White, modifier = Modifier.size(15.dp))
                            }
                        }
                    }
                    Text(if (myStory != null) "Your story" else "Add story", style = MaterialTheme.typography.labelSmall, maxLines = 1)
                }
            }
            items(storyCards, key = { "story-${it.authorId}" }) { story ->
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    DecoratedAvatar(
                        story.author.avatar,
                        R.drawable.img_tiwi_avatar_1,
                        story.authorProfile?.avatarDecoration,
                        Modifier.size(68.dp).border(3.dp, TiwiBlue, CircleShape).padding(2.dp).clickable { selectedStory = story }
                    )
                    Text(story.author.name.substringBefore(' ').take(11), style = MaterialTheme.typography.labelSmall, maxLines = 1)
                }
            }
        }

        if (messageTab == 0 && activeContacts.isNotEmpty()) {
            Text("Active now", modifier = Modifier.padding(horizontal = 16.dp, vertical = 5.dp), fontWeight = FontWeight.Bold, fontSize = 14.sp)
            LazyRow(
                contentPadding = PaddingValues(horizontal = 14.dp),
                horizontalArrangement = Arrangement.spacedBy(14.dp),
                modifier = Modifier.padding(bottom = 10.dp)
            ) {
                items(activeContacts, key = { "active-${it.userId}" }) { member ->
                    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.width(64.dp)) {
                        Box {
                            DecoratedAvatar(member.user.avatar, R.drawable.img_tiwi_avatar_1, member.profile?.avatarDecoration, Modifier.size(56.dp))
                            Box(Modifier.align(Alignment.BottomEnd).size(15.dp).background(Color.White, CircleShape).padding(2.dp).background(Color(0xFF31A24C), CircleShape))
                        }
                        Text(member.user.name.substringBefore(' ').take(10), fontSize = 10.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
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

        // Chat list and Messenger-style requests.
        LazyColumn(contentPadding = PaddingValues(horizontal = 8.dp, vertical = 6.dp), verticalArrangement = Arrangement.spacedBy(7.dp)) {
            if (visibleChats.isEmpty()) item {
                Column(Modifier.fillMaxWidth().padding(vertical = 54.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Box(Modifier.size(68.dp).background(Color(0xFFEAF2FF), CircleShape), contentAlignment = Alignment.Center) { Icon(if (messageTab == 1) Icons.Outlined.MarkEmailUnread else Icons.Outlined.Forum, null, tint = TiwiBlue, modifier = Modifier.size(30.dp)) }
                    Text(if (messageTab == 1) "No message requests" else "No conversations yet", fontWeight = FontWeight.Bold, fontSize = 17.sp, modifier = Modifier.padding(top = 12.dp))
                    Text(if (messageTab == 1) "New requests from people you may know appear here." else "Start a private chat or create a group.", color = Color(0xFF667085), fontSize = 12.sp, textAlign = TextAlign.Center, modifier = Modifier.padding(top = 4.dp, start = 30.dp, end = 30.dp))
                }
            }
            items(visibleChats, key = { it.id }) { chat ->
                val contact = chat.members.firstOrNull { it.userId != currentUserId }
                val name = chat.title ?: contact?.user?.name.orEmpty()
                val lastMsg = messagePreview(chat.lastMessage, currentUserId)
                if (chat.requestStatus == "pending" && chat.requestedById != currentUserId) {
                    Surface(Modifier.fillMaxWidth(), color = Color.White, shape = RoundedCornerShape(18.dp), tonalElevation = 0.dp) {
                        Column(Modifier.padding(13.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                DecoratedAvatar(contact?.user?.avatar ?: chat.avatarUrl, R.drawable.img_tiwi_avatar_1, contact?.profile?.avatarDecoration, Modifier.size(64.dp))
                                Column(Modifier.weight(1f).padding(start = 11.dp)) {
                                    Text(name, fontWeight = FontWeight.ExtraBold, fontSize = 16.sp)
                                    Text("Wants to send you a message", color = Color(0xFF667085), fontSize = 12.sp)
                                    if (lastMsg.isNotBlank()) Text(lastMsg, maxLines = 2, overflow = TextOverflow.Ellipsis, fontSize = 13.sp, modifier = Modifier.padding(top = 5.dp))
                                }
                            }
                            Row(Modifier.fillMaxWidth().padding(top = 12.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Button(
                                    onClick = { scope.launch { runCatching { repository.respondToMessageRequest(chat.id, false) }.onFailure { Toast.makeText(context, it.message ?: "Request could not be deleted", Toast.LENGTH_SHORT).show() } } },
                                    modifier = Modifier.weight(1f).height(40.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF0F2F5), contentColor = Color(0xFF344054)),
                                    shape = RoundedCornerShape(11.dp)
                                ) { Text("Delete", fontWeight = FontWeight.Bold) }
                                Button(
                                    onClick = { scope.launch { runCatching { repository.respondToMessageRequest(chat.id, true) }.onSuccess(onChatClick).onFailure { Toast.makeText(context, it.message ?: "Request could not be accepted", Toast.LENGTH_SHORT).show() } } },
                                    modifier = Modifier.weight(1f).height(40.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = TiwiBlue),
                                    shape = RoundedCornerShape(11.dp)
                                ) { Text("Accept", fontWeight = FontWeight.Bold) }
                            }
                        }
                    }
                } else {
                    Surface(
                        modifier = Modifier.fillMaxWidth().combinedClickable(
                            onClick = { onChatClick(chat) },
                            onLongClick = { selectedConversation = chat }
                        ),
                        color = Color.White,
                        shape = RoundedCornerShape(16.dp),
                        tonalElevation = 0.dp
                    ) {
                        Row(Modifier.padding(horizontal = 11.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                            Box {
                                DecoratedAvatar(contact?.user?.avatar ?: chat.avatarUrl, R.drawable.img_tiwi_avatar_1, contact?.profile?.avatarDecoration, Modifier.size(62.dp))
                                if (chat.type == "direct" && isSociallyActive(contact?.user?.socialLastActiveAt)) Box(Modifier.align(Alignment.BottomEnd).size(16.dp).background(Color.White, CircleShape).padding(2.dp).background(Color(0xFF31A24C), CircleShape))
                            }
                            Column(Modifier.weight(1f).padding(start = 11.dp)) {
                                Text(name.ifBlank { "Tiwi conversation" }, fontWeight = FontWeight.Bold, fontSize = 15.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                Text(if (chat.type == "group") "${chat.members.size} members · $lastMsg" else lastMsg, maxLines = 1, overflow = TextOverflow.Ellipsis, color = if (chat.unreadCount > 0) Color(0xFF101828) else Color(0xFF667085), fontWeight = if (chat.unreadCount > 0) FontWeight.SemiBold else FontWeight.Normal, fontSize = 12.sp)
                            }
                            Column(horizontalAlignment = Alignment.End) {
                                Text(relativePostTime(chat.updatedAt), color = Color(0xFF98A2B3), fontSize = 9.sp)
                                if (chat.requestStatus == "pending") Text("Request sent", color = Color(0xFF667085), fontSize = 10.sp, modifier = Modifier.padding(top = 4.dp))
                                else if (chat.unreadCount > 0) Badge(Modifier.padding(top = 5.dp)) { Text(chat.unreadCount.toString()) }
                            }
                        }
                    }
                }
            }
        }
    }
    1 -> MessengerStoriesPage(
        repository = repository,
        stories = stories,
        currentUser = currentUser,
        uploading = storyUploading,
        contentPadding = messengerPadding,
        onAdd = { storyPicker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageAndVideo)) },
        onOpen = { selectedStory = it }
    )
    2 -> MessengerNotificationsPage(
        repository = repository,
        chats = chats,
        contentPadding = messengerPadding,
        onChatClick = onChatClick
    )
    else -> MessengerMenuPage(
        repository = repository,
        chats = chats,
        currentUser = currentUser,
        contentPadding = messengerPadding,
        onBack = onBack,
        onNewDirect = { composerMode = "direct" },
        onNewGroup = { composerMode = "group" },
        onChatClick = onChatClick
    )
    }
    }

    selectedConversation?.let { chat ->
        MessengerConversationActions(
            repository = repository,
            conversation = chat,
            pinned = chat.id in pinnedIds,
            onPin = {
                pinnedIds = if (chat.id in pinnedIds) pinnedIds - chat.id else pinnedIds + chat.id
                messengerPreferences.edit().putStringSet("pinned_conversations", pinnedIds).apply()
                selectedConversation = null
            },
            onDismiss = { selectedConversation = null },
            onOpen = { selectedConversation = null; onChatClick(chat) }
        )
    }
}

@Composable
private fun MessengerBottomNavigation(selected: Int, unread: Int, onSelect: (Int) -> Unit) {
    NavigationBar(
        containerColor = Color.White,
        tonalElevation = 0.dp,
        modifier = Modifier.navigationBarsPadding().height(62.dp)
    ) {
        val rows = listOf(
            Triple("Chats", Icons.Filled.ChatBubble, Icons.Outlined.ChatBubbleOutline),
            Triple("Stories", Icons.Filled.AutoStories, Icons.Outlined.AutoStories),
            Triple("Notifications", Icons.Filled.Notifications, Icons.Outlined.NotificationsNone),
            Triple("Menu", Icons.Filled.Menu, Icons.Outlined.Menu)
        )
        rows.forEachIndexed { index, row ->
            NavigationBarItem(
                selected = selected == index,
                onClick = { onSelect(index) },
                icon = {
                    BadgedBox(badge = {
                        if (index == 0 && unread > 0) Badge { Text(if (unread > 99) "99+" else unread.toString()) }
                    }) {
                        Icon(if (selected == index) row.second else row.third, row.first, modifier = Modifier.size(23.dp))
                    }
                },
                label = { Text(row.first, fontSize = 10.sp) },
                colors = NavigationBarItemDefaults.colors(
                    selectedIconColor = TiwiBlue,
                    selectedTextColor = TiwiBlue,
                    indicatorColor = Color.Transparent,
                    unselectedIconColor = Color(0xFF667085),
                    unselectedTextColor = Color(0xFF667085)
                )
            )
        }
    }
}

@Composable
private fun MessengerStoriesPage(
    repository: SocialRepository,
    stories: List<SocialPost>,
    currentUser: SocialUser?,
    uploading: Boolean,
    contentPadding: PaddingValues,
    onAdd: () -> Unit,
    onOpen: (SocialPost) -> Unit
) {
    val currentUserId = repository.currentUserId()
    val cards = remember(stories, currentUserId) {
        stories.filter { it.authorId != currentUserId }.distinctBy { it.authorId }
    }
    Column(Modifier.fillMaxSize().padding(contentPadding).background(Color.White).statusBarsPadding()) {
        Text("Stories", fontSize = 30.sp, fontWeight = FontWeight.Black, modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp))
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            val allCards = listOf<SocialPost?>(null) + cards
            items(allCards.chunked(2), key = { row -> row.joinToString("-") { it?.id ?: "create" } }) { row ->
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    row.forEach { story ->
                        val media = story?.media?.firstOrNull()
                        Box(
                            modifier = Modifier.weight(1f).aspectRatio(.72f)
                                .clip(RoundedCornerShape(14.dp))
                                .background(Color(0xFFF0F2F5))
                                .clickable(enabled = !uploading) { if (story == null) onAdd() else onOpen(story) }
                        ) {
                            if (story == null) {
                                TiwiAvatar(currentUser?.avatar, R.drawable.img_tiwi_avatar_1, Modifier.fillMaxSize(), ContentScale.Crop)
                                Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Color.Transparent, Color.Black.copy(alpha = .6f)))))
                                Surface(Modifier.align(Alignment.TopStart).padding(10.dp).size(38.dp), shape = CircleShape, color = Color.White) {
                                    Box(contentAlignment = Alignment.Center) {
                                        if (uploading) CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp)
                                        else Icon(Icons.Default.Add, "Add story", tint = TiwiBlue)
                                    }
                                }
                                Text("Add to story", color = Color.White, fontWeight = FontWeight.Bold, modifier = Modifier.align(Alignment.BottomStart).padding(12.dp))
                            } else {
                                when (media?.type) {
                                    "video" -> AsyncImage(model = media.thumbnailUrl ?: story.author.avatar, contentDescription = null, modifier = Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                                    "image" -> AsyncImage(model = media.url, contentDescription = null, modifier = Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                                    else -> Box(Modifier.fillMaxSize().background(Brush.linearGradient(listOf(TiwiBlue, TiwiPurple))))
                                }
                                Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Color.Transparent, Color.Black.copy(alpha = .64f)))))
                                DecoratedAvatar(
                                    story.author.avatar,
                                    R.drawable.img_tiwi_avatar_1,
                                    story.authorProfile?.avatarDecoration,
                                    Modifier.align(Alignment.TopStart).padding(9.dp).size(39.dp).border(2.dp, TiwiBlue, CircleShape).padding(2.dp)
                                )
                                Text(story.author.name, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 12.sp, maxLines = 2, modifier = Modifier.align(Alignment.BottomStart).padding(11.dp))
                            }
                        }
                    }
                    if (row.size == 1) Spacer(Modifier.weight(1f))
                }
            }
        }
    }
}

@Composable
private fun MessengerNotificationsPage(
    repository: SocialRepository,
    chats: List<SocialConversation>,
    contentPadding: PaddingValues,
    onChatClick: (SocialConversation) -> Unit
) {
    val currentUserId = repository.currentUserId()
    val notifications = remember(chats, currentUserId) {
        chats.filter { it.unreadCount > 0 || (it.requestStatus == "pending" && it.requestedById != currentUserId) }
    }
    Column(Modifier.fillMaxSize().padding(contentPadding).background(Color.White).statusBarsPadding()) {
        Text("Notifications", fontSize = 30.sp, fontWeight = FontWeight.Black, modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp))
        if (notifications.isEmpty()) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Outlined.NotificationsNone, null, tint = Color(0xFF98A2B3), modifier = Modifier.size(50.dp))
                    Text("No new notifications", fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 10.dp))
                    Text("New messages and requests appear here.", color = Color(0xFF667085), fontSize = 12.sp)
                }
            }
        } else {
            Text("New", color = Color(0xFF667085), modifier = Modifier.padding(horizontal = 16.dp, vertical = 7.dp))
            LazyColumn(Modifier.fillMaxSize()) {
                items(notifications, key = { "notification-${it.id}" }) { chat ->
                    val contact = chat.members.firstOrNull { it.userId != currentUserId }
                    val request = chat.requestStatus == "pending" && chat.requestedById != currentUserId
                    Row(
                        Modifier.fillMaxWidth().clickable { onChatClick(chat) }.padding(horizontal = 14.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        DecoratedAvatar(contact?.user?.avatar ?: chat.avatarUrl, R.drawable.img_tiwi_avatar_1, contact?.profile?.avatarDecoration, Modifier.size(58.dp))
                        Column(Modifier.weight(1f).padding(start = 10.dp)) {
                            Text(chat.title ?: contact?.user?.name ?: "Tiwi chat", fontWeight = FontWeight.Bold)
                            Text(
                                if (request) "Sent you a message request"
                                else if (chat.unreadCount == 1) "Sent you a message"
                                else "Sent ${chat.unreadCount} messages",
                                color = Color(0xFF344054),
                                fontSize = 13.sp
                            )
                            Text(relativePostTime(chat.updatedAt), color = Color(0xFF667085), fontSize = 11.sp)
                        }
                        Box(Modifier.size(9.dp).background(TiwiBlue, CircleShape))
                    }
                }
            }
        }
    }
}

@Composable
private fun MessengerMenuPage(
    repository: SocialRepository,
    chats: List<SocialConversation>,
    currentUser: SocialUser?,
    contentPadding: PaddingValues,
    onBack: () -> Unit,
    onNewDirect: () -> Unit,
    onNewGroup: () -> Unit,
    onChatClick: (SocialConversation) -> Unit
) {
    val context = LocalContext.current
    val scope = rememberTiwiCoroutineScope()
    var page by remember { mutableStateOf<String?>(null) }
    var archived by remember { mutableStateOf<List<SocialConversation>>(emptyList()) }
    val requests = chats.filter { it.requestStatus == "pending" && it.requestedById != repository.currentUserId() }
    LaunchedEffect(page) {
        if (page == "Archive") archived = runCatching { repository.archivedConversations() }.getOrDefault(emptyList())
    }
    if (page == "Settings") {
        MessengerSettingsPage(contentPadding = contentPadding, onBack = { page = null })
        return
    }
    if (page == "Message requests" || page == "Archive") {
        val rows = if (page == "Archive") archived else requests
        Column(Modifier.fillMaxSize().padding(contentPadding).background(Color.White).statusBarsPadding()) {
            Row(Modifier.height(52.dp).fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = { page = null }) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") }
                Text(page.orEmpty(), fontSize = 20.sp, fontWeight = FontWeight.Bold)
            }
            if (rows.isEmpty()) Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text(if (page == "Archive") "No archived chats" else "No message requests", color = Color(0xFF667085))
            } else LazyColumn {
                items(rows, key = { "menu-chat-${it.id}" }) { chat ->
                    val contact = chat.members.firstOrNull { it.userId != repository.currentUserId() }
                    Row(
                        Modifier.fillMaxWidth().clickable { onChatClick(chat) }.padding(horizontal = 14.dp, vertical = 9.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        DecoratedAvatar(contact?.user?.avatar ?: chat.avatarUrl, R.drawable.img_tiwi_avatar_1, contact?.profile?.avatarDecoration, Modifier.size(54.dp))
                        Column(Modifier.weight(1f).padding(start = 10.dp)) {
                            Text(chat.title ?: contact?.user?.name ?: "Tiwi chat", fontWeight = FontWeight.Bold)
                            Text(messagePreview(chat.lastMessage, repository.currentUserId()), color = Color(0xFF667085), maxLines = 1)
                        }
                        if (page == "Archive") TextButton(onClick = {
                            scope.launch {
                                repository.updateConversationMember(chat.id, archived = false)
                                archived = archived.filterNot { it.id == chat.id }
                            }
                        }) { Text("Restore") }
                    }
                }
            }
        }
        return
    }
    Column(
        Modifier.fillMaxSize().padding(contentPadding).background(Color.White).statusBarsPadding()
            .verticalScroll(rememberScrollState())
    ) {
        Row(Modifier.fillMaxWidth().padding(start = 16.dp, end = 8.dp, top = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            Text("Menu", fontSize = 30.sp, fontWeight = FontWeight.Black, modifier = Modifier.weight(1f))
            IconButton(onClick = onBack) { Icon(Icons.Default.Close, "Close Messenger") }
        }
        Row(Modifier.fillMaxWidth().clickable { onNewDirect() }.padding(horizontal = 16.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
            DecoratedAvatar(currentUser?.avatar, R.drawable.img_tiwi_avatar_1, repository.profile.value?.avatarDecoration, Modifier.size(52.dp))
            Column(Modifier.weight(1f).padding(start = 10.dp)) {
                Text(currentUser?.name ?: "Tiwi account", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                Text("Start a new Tiwi conversation", color = Color(0xFF667085), fontSize = 12.sp)
            }
            if (requests.isNotEmpty()) Badge { Text(requests.size.toString()) }
        }
        HorizontalDivider(color = Color(0xFFE4E7EC), thickness = .5.dp)
        MessengerMenuRow(Icons.Outlined.Settings, "Settings") { page = "Settings" }
        MessengerMenuRow(Icons.Outlined.GroupAdd, "Create group chat") { onNewGroup() }
        MessengerMenuRow(Icons.Outlined.MarkEmailUnread, "Message requests", if (requests.isNotEmpty()) requests.size.toString() else null) { page = "Message requests" }
        MessengerMenuRow(Icons.Outlined.Archive, "Archive") { page = "Archive" }
        HorizontalDivider(color = Color(0xFFE4E7EC), thickness = .5.dp, modifier = Modifier.padding(vertical = 4.dp))
        MessengerMenuRow(Icons.Outlined.Groups, "Communities") { onNewGroup() }
        MessengerMenuRow(Icons.Outlined.SupportAgent, "Support") {
            context.startActivity(Intent(Intent.ACTION_VIEW, android.net.Uri.parse("https://tiwlo.com/support")))
        }
        MessengerMenuRow(Icons.Outlined.Movie, "Tiwi Reels") {
            context.startActivity(Intent(Intent.ACTION_VIEW, android.net.Uri.parse("https://tiwlo.com/social/reels")))
        }
    }
}

@Composable
private fun MessengerMenuRow(icon: ImageVector, label: String, badge: String? = null, onClick: () -> Unit) {
    Row(Modifier.fillMaxWidth().clickable(onClick = onClick).padding(horizontal = 17.dp, vertical = 13.dp), verticalAlignment = Alignment.CenterVertically) {
        Icon(icon, null, modifier = Modifier.size(25.dp))
        Text(label, modifier = Modifier.weight(1f).padding(start = 17.dp), fontSize = 16.sp)
        if (badge != null) Badge { Text(badge) }
        else Icon(Icons.Default.ChevronRight, null, tint = Color(0xFF98A2B3))
    }
}

@Composable
private fun MessengerSettingsPage(contentPadding: PaddingValues, onBack: () -> Unit) {
    val context = LocalContext.current
    val preferences = remember { context.getSharedPreferences("tiwi_messenger", Context.MODE_PRIVATE) }
    var sounds by remember { mutableStateOf(preferences.getBoolean("sounds", true)) }
    Column(Modifier.fillMaxSize().padding(contentPadding).background(Color.White).statusBarsPadding()) {
        Row(Modifier.height(52.dp).fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") }
            Text("Messenger settings", fontSize = 20.sp, fontWeight = FontWeight.Bold)
        }
        Text("Notifications & privacy", color = Color(0xFF667085), modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp))
        MessengerSettingSwitch(Icons.Outlined.VolumeUp, "Notifications & sounds", "Play alerts for new messages", sounds) {
            sounds = it; preferences.edit().putBoolean("sounds", it).apply()
        }
        MessengerInfoRow(Icons.Outlined.MarkEmailRead, "Read receipts", "Delivered and seen states come from Tiwi's message API", enabled = false) {}
        MessengerInfoRow(Icons.Outlined.Security, "Message permissions", "Message requests protect chats from accounts you do not follow", enabled = false) {}
    }
}

@Composable
private fun MessengerSettingSwitch(icon: ImageVector, title: String, subtitle: String, checked: Boolean, onChange: (Boolean) -> Unit) {
    Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
        Icon(icon, null, modifier = Modifier.size(25.dp))
        Column(Modifier.weight(1f).padding(horizontal = 14.dp)) {
            Text(title, fontWeight = FontWeight.SemiBold)
            Text(subtitle, color = Color(0xFF667085), fontSize = 11.sp)
        }
        Switch(checked = checked, onCheckedChange = onChange)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun MessengerConversationActions(
    repository: SocialRepository,
    conversation: SocialConversation,
    pinned: Boolean,
    onPin: () -> Unit,
    onDismiss: () -> Unit,
    onOpen: () -> Unit,
    onAddMembers: (() -> Unit)? = null
) {
    val scope = rememberTiwiCoroutineScope()
    val context = LocalContext.current
    val membership = conversation.members.firstOrNull { it.userId == repository.currentUserId() }
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        dragHandle = null,
        containerColor = Color.White,
        tonalElevation = 0.dp
    ) {
        Column(Modifier.fillMaxWidth().navigationBarsPadding().padding(bottom = 5.dp)) {
            Row(Modifier.fillMaxWidth().height(43.dp).padding(horizontal = 18.dp), verticalAlignment = Alignment.CenterVertically) {
                Text("Chat options", fontSize = 17.sp, fontWeight = FontWeight.ExtraBold, modifier = Modifier.weight(1f))
                IconButton(onClick = onDismiss, modifier = Modifier.size(32.dp)) { Icon(Icons.Default.Close, "Close", modifier = Modifier.size(20.dp)) }
            }
            HorizontalDivider(thickness = .5.dp, color = Color(0xFFE4E7EC))
            MessengerActionRow(Icons.Outlined.PushPin, if (pinned) "Unpin" else "Pin", onPin)
            MessengerActionRow(Icons.Outlined.Archive, "Archive", onClick = {
                scope.launch {
                    runCatching { repository.updateConversationMember(conversation.id, archived = true) }
                        .onSuccess { onDismiss() }
                        .onFailure { Toast.makeText(context, it.message ?: "Archive failed", Toast.LENGTH_SHORT).show() }
                }
            })
            MessengerActionRow(Icons.Outlined.VisibilityOff, "Ignore", onClick = {
                scope.launch {
                    runCatching {
                        if (conversation.requestStatus == "pending" && conversation.requestedById != repository.currentUserId()) {
                            repository.respondToMessageRequest(conversation.id, false)
                        } else {
                            repository.updateConversationMember(conversation.id, muted = true, archived = true)
                        }
                    }.onSuccess { onDismiss() }
                        .onFailure { Toast.makeText(context, it.message ?: "Ignore failed", Toast.LENGTH_SHORT).show() }
                }
            })
            if (onAddMembers != null) MessengerActionRow(Icons.Outlined.PersonAdd, "Add members", onClick = onAddMembers)
            MessengerActionRow(if (membership?.muted == true) Icons.Outlined.NotificationsActive else Icons.Outlined.NotificationsOff, if (membership?.muted == true) "Unmute" else "Mute", onClick = {
                scope.launch {
                    runCatching { repository.updateConversationMember(conversation.id, muted = membership?.muted != true) }
                        .onSuccess { onDismiss() }
                        .onFailure { Toast.makeText(context, it.message ?: "Mute failed", Toast.LENGTH_SHORT).show() }
                }
            })
            MessengerActionRow(Icons.Outlined.Forum, "Open chat thread", onOpen)
            MessengerActionRow(Icons.Outlined.MarkEmailUnread, "Mark as unread", onClick = {
                scope.launch {
                    runCatching { repository.updateConversationMember(conversation.id, markUnread = true) }
                        .onSuccess { onDismiss() }
                        .onFailure { Toast.makeText(context, it.message ?: "Could not mark unread", Toast.LENGTH_SHORT).show() }
                }
            })
            if (conversation.type == "group") MessengerActionRow(Icons.Outlined.ExitToApp, "Leave group", {
                scope.launch {
                    runCatching { repository.updateConversationMember(conversation.id, leave = true) }
                        .onSuccess { onDismiss() }
                        .onFailure { Toast.makeText(context, it.message ?: "Could not leave group", Toast.LENGTH_SHORT).show() }
                }
            }, destructive = true)
            MessengerActionRow(Icons.Outlined.Delete, "Delete from inbox", {
                scope.launch {
                    runCatching { repository.updateConversationMember(conversation.id, deleteForMe = true) }
                        .onSuccess { onDismiss() }
                        .onFailure { Toast.makeText(context, it.message ?: "Delete failed", Toast.LENGTH_SHORT).show() }
                }
            }, destructive = true)
        }
    }
}

@Composable
private fun MessengerActionRow(icon: ImageVector, label: String, onClick: () -> Unit, destructive: Boolean = false) {
    Row(Modifier.fillMaxWidth().height(42.dp).clickable(onClick = onClick).padding(horizontal = 20.dp), verticalAlignment = Alignment.CenterVertically) {
        Icon(icon, null, tint = if (destructive) Color(0xFFD92D20) else Color.Black, modifier = Modifier.size(22.dp))
        Text(label, color = if (destructive) Color(0xFFD92D20) else Color.Black, fontSize = 14.sp, modifier = Modifier.padding(start = 16.dp))
    }
}

@Composable
private fun MessengerStoryViewer(story: SocialPost, repository: SocialRepository, onClose: () -> Unit) {
    val media = story.media.firstOrNull()
    Box(Modifier.fillMaxSize().background(Color.Black)) {
        when (media?.type) {
            "video" -> TiwiVideo(
                media.hlsUrl?.takeIf { media.processingStatus == "ready" } ?: media.url,
                Modifier.fillMaxSize(),
                autoplay = true,
                fallbackUrl = media.url,
                posterUrl = media.thumbnailUrl
            )
            "image" -> AsyncImage(
                model = repository.absoluteUrl(media.url),
                contentDescription = "Story",
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop
            )
            else -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text(story.body, color = Color.White, fontSize = 24.sp, textAlign = TextAlign.Center, modifier = Modifier.padding(28.dp))
            }
        }
        LinearProgressIndicator(
            progress = { 1f },
            modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 6.dp).height(3.dp).align(Alignment.TopCenter),
            color = Color.White,
            trackColor = Color.White.copy(alpha = .35f)
        )
        Row(Modifier.fillMaxWidth().align(Alignment.TopStart).statusBarsPadding().padding(top = 8.dp, start = 12.dp, end = 4.dp), verticalAlignment = Alignment.CenterVertically) {
            DecoratedAvatar(story.author.avatar, R.drawable.img_tiwi_avatar_1, story.authorProfile?.avatarDecoration, Modifier.size(42.dp))
            Column(Modifier.weight(1f).padding(start = 9.dp)) {
                Text(story.author.name, color = Color.White, fontWeight = FontWeight.Bold)
                Text(relativePostTime(story.publishedAt), color = Color.White.copy(alpha = .78f), fontSize = 11.sp)
            }
            IconButton(onClick = onClose) { Icon(Icons.Default.Close, "Close story", tint = Color.White) }
        }
        if (story.body.isNotBlank() && media != null) Text(
            story.body,
            color = Color.White,
            textAlign = TextAlign.Center,
            modifier = Modifier.align(Alignment.BottomCenter).fillMaxWidth().background(Color.Black.copy(alpha = .45f)).padding(16.dp)
        )
    }
}

@Composable
private fun NewConversationPage(
    repository: SocialRepository,
    groupMode: Boolean,
    onBack: () -> Unit,
    onCreated: (SocialConversation) -> Unit
) {
    var query by remember { mutableStateOf("") }
    var profiles by remember { mutableStateOf<List<SocialProfile>>(emptyList()) }
    var groupName by remember { mutableStateOf("") }
    var selectedIds by remember { mutableStateOf<Set<String>>(emptySet()) }
    var busy by remember { mutableStateOf(false) }
    val scope = rememberTiwiCoroutineScope()
    val context = LocalContext.current
    LaunchedEffect(query) {
        delay(250)
        profiles = runCatching { repository.searchProfiles(query) }.getOrDefault(emptyList())
    }
    Column(Modifier.fillMaxSize().background(Color(0xFFF7F8FA)).statusBarsPadding().imePadding()) {
        Row(Modifier.fillMaxWidth().height(54.dp).background(Color.White), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack, enabled = !busy) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") }
            Column(Modifier.weight(1f)) {
                Text(if (groupMode) "Create group" else "New message", fontWeight = FontWeight.ExtraBold, fontSize = 19.sp)
                Text(if (groupMode) "${selectedIds.size} selected" else "Choose someone to message", color = Color(0xFF667085), fontSize = 11.sp)
            }
            if (groupMode) TextButton(
                enabled = !busy && selectedIds.isNotEmpty(),
                onClick = {
                    scope.launch {
                        busy = true
                        runCatching { repository.createGroupConversation(groupName, selectedIds.toList()) }
                            .onSuccess(onCreated)
                            .onFailure { Toast.makeText(context, it.message ?: "Group could not be created", Toast.LENGTH_LONG).show() }
                        busy = false
                    }
                }
            ) { if (busy) CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp) else Text("Create", fontWeight = FontWeight.Bold, color = TiwiBlue) }
        }
        HorizontalDivider(color = Color(0xFFE4E7EC), thickness = .5.dp)
        if (groupMode) OutlinedTextField(
            value = groupName,
            onValueChange = { groupName = it.take(120) },
            label = { Text("Group name") },
            placeholder = { Text("Family, friends, project…") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 10.dp),
            shape = RoundedCornerShape(15.dp),
            colors = OutlinedTextFieldDefaults.colors(focusedContainerColor = Color.White, unfocusedContainerColor = Color.White, unfocusedBorderColor = Color.Transparent)
        )
        Surface(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = if (groupMode) 0.dp else 10.dp).height(44.dp), color = Color.White, shape = RoundedCornerShape(14.dp), tonalElevation = 0.dp) {
            Row(Modifier.padding(horizontal = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.Search, null, tint = Color(0xFF98A2B3), modifier = Modifier.size(19.dp))
                BasicTextField(
                    value = query,
                    onValueChange = { query = it },
                    modifier = Modifier.weight(1f).padding(start = 9.dp),
                    singleLine = true,
                    textStyle = MaterialTheme.typography.bodyMedium.copy(color = Color(0xFF101828)),
                    decorationBox = { inner -> if (query.isBlank()) Text("Search people", color = Color(0xFF98A2B3)); inner() }
                )
            }
        }
        if (groupMode && selectedIds.isNotEmpty()) LazyRow(
            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 10.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(profiles.filter { it.userId in selectedIds }, key = { "selected-${it.userId}" }) { profile ->
                Surface(color = Color(0xFFEAF2FF), shape = RoundedCornerShape(50), tonalElevation = 0.dp) {
                    Row(Modifier.padding(start = 5.dp, end = 8.dp, top = 5.dp, bottom = 5.dp), verticalAlignment = Alignment.CenterVertically) {
                        DecoratedAvatar(profile.user.avatar, R.drawable.img_tiwi_avatar_1, profile.avatarDecoration, Modifier.size(28.dp))
                        Text(profile.user.name.substringBefore(' '), fontSize = 11.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(start = 5.dp))
                        Icon(Icons.Default.Close, "Remove", tint = Color(0xFF667085), modifier = Modifier.padding(start = 5.dp).size(15.dp).clickable { selectedIds = selectedIds - profile.userId })
                    }
                }
            }
        }
        Text(if (groupMode) "Suggested people" else "People", color = Color(0xFF667085), fontSize = 11.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 16.dp, vertical = 9.dp))
        LazyColumn(Modifier.weight(1f), contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
            items(profiles, key = { it.userId }) { profile ->
                val selected = profile.userId in selectedIds
                Surface(
                    Modifier.fillMaxWidth().clickable(enabled = !busy) {
                        if (groupMode) selectedIds = if (selected) selectedIds - profile.userId else selectedIds + profile.userId
                        else scope.launch {
                            busy = true
                            runCatching { repository.createConversation(profile.userId) }
                                .onSuccess(onCreated)
                                .onFailure { Toast.makeText(context, it.message ?: "Chat failed", Toast.LENGTH_SHORT).show() }
                            busy = false
                        }
                    },
                    color = Color.White,
                    shape = RoundedCornerShape(15.dp),
                    tonalElevation = 0.dp
                ) {
                    Row(Modifier.padding(10.dp), verticalAlignment = Alignment.CenterVertically) {
                        Box {
                            DecoratedAvatar(profile.user.avatar, R.drawable.img_tiwi_avatar_1, profile.avatarDecoration, Modifier.size(52.dp))
                            if (isSociallyActive(profile.user.socialLastActiveAt)) Box(Modifier.align(Alignment.BottomEnd).size(14.dp).background(Color.White, CircleShape).padding(2.dp).background(Color(0xFF31A24C), CircleShape))
                        }
                        Column(Modifier.weight(1f).padding(start = 10.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) { Text(profile.user.name, fontWeight = FontWeight.Bold); if (profile.verified) VerifiedBadge(profile.badgeType, 14.dp, Modifier.padding(start = 3.dp)) }
                            Text("@${profile.username} · ${socialPresenceLabel(profile.user.socialLastActiveAt)}", color = Color(0xFF667085), fontSize = 11.sp)
                        }
                        if (groupMode) Checkbox(checked = selected, onCheckedChange = { selectedIds = if (it) selectedIds + profile.userId else selectedIds - profile.userId })
                        else Icon(Icons.Default.ChevronRight, null, tint = Color(0xFF98A2B3))
                    }
                }
            }
        }
    }
}

private const val DEFAULT_CHAT_COLOR = 0xFF0866FFL

internal fun normalizedChatColorArgb(stored: Long): Int {
    return if (
        stored in Int.MIN_VALUE.toLong()..Int.MAX_VALUE.toLong() ||
        stored in 0L..0xFFFFFFFFL
    ) stored.toInt() else DEFAULT_CHAT_COLOR.toInt()
}

private fun messengerChatColor(preferences: android.content.SharedPreferences, conversationId: String): Color {
    return Color(normalizedChatColorArgb(preferences.getLong("chat_color_$conversationId", DEFAULT_CHAT_COLOR)))
}

@Composable
private fun MessengerMediaCell(
    media: SocialMedia,
    modifier: Modifier,
    extraCount: Int = 0,
    onOpen: (SocialMedia) -> Unit
) {
    Box(
        modifier.clip(RoundedCornerShape(12.dp)).background(Color(0xFF101010)).clickable { onOpen(media) },
        contentAlignment = Alignment.Center
    ) {
        if (media.type == "image") {
            AsyncImage(media.url, "Photo attachment", Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
        } else {
            if (!media.thumbnailUrl.isNullOrBlank()) {
                AsyncImage(media.thumbnailUrl, "Video attachment", Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
            }
            Box(Modifier.size(42.dp).background(Color.Black.copy(alpha = .58f), CircleShape), contentAlignment = Alignment.Center) {
                Icon(Icons.Default.PlayArrow, "Play video", tint = Color.White, modifier = Modifier.size(29.dp))
            }
        }
        if (extraCount > 0) {
            Box(Modifier.fillMaxSize().background(Color.Black.copy(alpha = .58f)), contentAlignment = Alignment.Center) {
                Text("+$extraCount", color = Color.White, fontSize = 27.sp, fontWeight = FontWeight.ExtraBold)
            }
        }
    }
}

@Composable
private fun MessengerMediaGrid(media: List<SocialMedia>, onOpen: (SocialMedia) -> Unit) {
    val items = media.filter { it.type == "image" || it.type == "video" }
    if (items.isEmpty()) return
    when (items.size) {
        1 -> MessengerMediaCell(items.first(), Modifier.fillMaxWidth().height(if (items.first().type == "video") 180.dp else 238.dp), onOpen = onOpen)
        2 -> Row(Modifier.fillMaxWidth().height(190.dp), horizontalArrangement = Arrangement.spacedBy(2.dp)) {
            items.forEach { MessengerMediaCell(it, Modifier.weight(1f).fillMaxHeight(), onOpen = onOpen) }
        }
        3 -> Row(Modifier.fillMaxWidth().height(224.dp), horizontalArrangement = Arrangement.spacedBy(2.dp)) {
            MessengerMediaCell(items[0], Modifier.weight(1.15f).fillMaxHeight(), onOpen = onOpen)
            Column(Modifier.weight(1f).fillMaxHeight(), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                MessengerMediaCell(items[1], Modifier.weight(1f).fillMaxWidth(), onOpen = onOpen)
                MessengerMediaCell(items[2], Modifier.weight(1f).fillMaxWidth(), onOpen = onOpen)
            }
        }
        else -> Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            items.take(4).chunked(2).forEachIndexed { rowIndex, row ->
                Row(Modifier.fillMaxWidth().height(132.dp), horizontalArrangement = Arrangement.spacedBy(2.dp)) {
                    row.forEachIndexed { columnIndex, item ->
                        val itemIndex = rowIndex * 2 + columnIndex
                        MessengerMediaCell(
                            item,
                            Modifier.weight(1f).fillMaxHeight(),
                            extraCount = if (itemIndex == 3) (items.size - 4).coerceAtLeast(0) else 0,
                            onOpen = onOpen
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun PendingMessengerMediaGrid(uris: List<Uri>) {
    if (uris.isEmpty()) return
    Column(Modifier.width(270.dp).clip(RoundedCornerShape(16.dp)).background(Color(0xFFF0F2F5)).padding(3.dp)) {
        uris.take(4).chunked(2).forEachIndexed { rowIndex, row ->
            Row(Modifier.fillMaxWidth().height(112.dp), horizontalArrangement = Arrangement.spacedBy(3.dp)) {
                row.forEachIndexed { columnIndex, uri ->
                    val itemIndex = rowIndex * 2 + columnIndex
                    Box(Modifier.weight(1f).fillMaxHeight().clip(RoundedCornerShape(11.dp)).background(Color.Black)) {
                        AsyncImage(uri, "Sending attachment", Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                        if (itemIndex == 3 && uris.size > 4) Box(Modifier.fillMaxSize().background(Color.Black.copy(alpha = .55f)), contentAlignment = Alignment.Center) {
                            Text("+${uris.size - 4}", color = Color.White, fontWeight = FontWeight.ExtraBold, fontSize = 24.sp)
                        }
                    }
                }
                if (row.size == 1) Spacer(Modifier.weight(1f))
            }
            if (rowIndex == 0 && uris.size > 2) Spacer(Modifier.height(3.dp))
        }
        Row(Modifier.fillMaxWidth().padding(horizontal = 9.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
            CircularProgressIndicator(Modifier.size(14.dp), strokeWidth = 2.dp, color = TiwiBlue)
            Text("Sending ${uris.size} ${if (uris.size == 1) "attachment" else "attachments"}…", color = Color(0xFF65676B), fontSize = 11.sp, modifier = Modifier.padding(start = 7.dp))
        }
    }
}

private data class MessengerMediaSelection(val message: SocialMessage, val media: SocialMedia)

@Composable
private fun MessengerMediaViewer(
    selection: MessengerMediaSelection,
    currentUserId: String?,
    onBack: () -> Unit,
    onEditCaption: () -> Unit,
    onDelete: () -> Unit,
    onUnsend: () -> Unit
) {
    val media = selection.media
    var menu by remember { mutableStateOf(false) }
    BackHandler(onBack = onBack)
    Box(Modifier.fillMaxSize().background(Color.Black).statusBarsPadding().navigationBarsPadding()) {
        if (media.type == "video") {
            TiwiVideo(
                media.hlsUrl?.takeIf { media.processingStatus == "ready" } ?: media.url,
                Modifier.fillMaxSize(),
                autoplay = true,
                fallbackUrl = media.url,
                posterUrl = media.thumbnailUrl,
                posterContentScale = ContentScale.Fit,
                coordinated = false
            )
        } else {
            AsyncImage(media.url, "Full screen photo", Modifier.fillMaxSize(), contentScale = ContentScale.Fit)
        }
        IconButton(
            onClick = onBack,
            modifier = Modifier.align(Alignment.TopStart).padding(8.dp).background(Color.Black.copy(alpha = .48f), CircleShape)
        ) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back", tint = Color.White) }
        Box(Modifier.align(Alignment.TopEnd).padding(8.dp)) {
            IconButton(onClick = { menu = true }, modifier = Modifier.background(Color.Black.copy(alpha = .48f), CircleShape)) {
                Icon(Icons.Default.MoreVert, "Media options", tint = Color.White)
            }
            DropdownMenu(expanded = menu, onDismissRequest = { menu = false }) {
                if (selection.message.senderId == currentUserId && selection.message.unsentAt == null) {
                    DropdownMenuItem(text = { Text("Edit caption") }, leadingIcon = { Icon(Icons.Outlined.Edit, null) }, onClick = { menu = false; onEditCaption() })
                    DropdownMenuItem(text = { Text("Unsend for everyone", color = Color(0xFFD92D20)) }, leadingIcon = { Icon(Icons.Outlined.DeleteForever, null, tint = Color(0xFFD92D20)) }, onClick = { menu = false; onUnsend() })
                }
                DropdownMenuItem(text = { Text("Delete for me", color = Color(0xFFD92D20)) }, leadingIcon = { Icon(Icons.Outlined.Delete, null, tint = Color(0xFFD92D20)) }, onClick = { menu = false; onDelete() })
            }
        }
    }
}

@OptIn(ExperimentalFoundationApi::class, ExperimentalMaterial3Api::class)
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
    var selectedMessageId by remember { mutableStateOf<String?>(null) }
    var replyTo by remember { mutableStateOf<SocialMessage?>(null) }
    var messageToEdit by remember { mutableStateOf<SocialMessage?>(null) }
    var editText by remember { mutableStateOf("") }
    var messageToDelete by remember { mutableStateOf<SocialMessage?>(null) }
    var showInfo by remember { mutableStateOf(false) }
    var showAddMembers by remember { mutableStateOf(false) }
    var showEmojiPicker by remember { mutableStateOf(false) }
    var mediaViewer by remember { mutableStateOf<MessengerMediaSelection?>(null) }
    var messageToForward by remember { mutableStateOf<SocialMessage?>(null) }
    var messageActions by remember { mutableStateOf<SocialMessage?>(null) }
    var messageLinkPreview by remember { mutableStateOf<SocialLinkPreview?>(null) }
    var dismissedMessagePreviewUrl by remember { mutableStateOf<String?>(null) }
    var pendingAttachmentUris by remember { mutableStateOf<List<Uri>>(emptyList()) }
    var recording by remember { mutableStateOf(false) }
    var recorder by remember { mutableStateOf<MediaRecorder?>(null) }
    var recordingFile by remember { mutableStateOf<File?>(null) }
    val context = LocalContext.current
    val chatPreferences = remember { context.getSharedPreferences("tiwi_messenger", Context.MODE_PRIVATE) }
    var emojiHistory by remember {
        mutableStateOf(chatPreferences.getString("emoji_history", "").orEmpty().split(" ").filter { it.isNotBlank() }.take(12))
    }
    var pinnedMessageIds by remember {
        mutableStateOf(chatPreferences.getStringSet("pinned_messages_${conversation.id}", emptySet()).orEmpty())
    }
    val messagesByConversation by repository.messages.collectAsState()
    var liveConversation by remember(conversation.id) { mutableStateOf(conversation) }
    val contact = liveConversation.members.firstOrNull { it.userId != repository.currentUserId() }
    val contactBlocked = liveConversation.type == "direct" && contact?.blocked == true
    val contactTyping = (parseSocialDate(contact?.typingAt)?.time ?: 0L) > System.currentTimeMillis() - 6_000L
    val name = chatPreferences.getString("nickname_${conversation.id}", null)?.takeIf { it.isNotBlank() }
        ?: liveConversation.title ?: contact?.user?.name.orEmpty()
    val outgoingMessageColor = messengerChatColor(chatPreferences, conversation.id)
    val rawMessages = messagesByConversation[conversation.id] ?: repository.cachedMessages(conversation.id)
    val disappearingSeconds = chatPreferences.getInt("disappearing_${conversation.id}", 0)
    val messages = if (disappearingSeconds > 0) {
        val cutoff = System.currentTimeMillis() - disappearingSeconds * 1000L
        rawMessages.filter { (parseSocialDate(it.sentAt)?.time ?: Long.MAX_VALUE) >= cutoff }
    } else rawMessages
    val lastReadAt = liveConversation.members.firstOrNull { it.userId == repository.currentUserId() }?.lastReadAt
    val lastReadTime = parseSocialDate(lastReadAt)?.time ?: 0L
    val firstUnreadId = messages.firstOrNull {
        it.senderId != repository.currentUserId() && (parseSocialDate(it.sentAt)?.time ?: 0L) > lastReadTime
    }?.id
    val scope = rememberTiwiCoroutineScope()
    val sendAttachments: (List<Uri>) -> Unit = send@ { selectedUris ->
        if (contactBlocked) {
            Toast.makeText(context, "You can't message this blocked account", Toast.LENGTH_SHORT).show()
            return@send
        }
        val uris = selectedUris.distinct().take(10)
        if (uris.isEmpty()) return@send
        if (pendingAttachmentUris.isNotEmpty()) {
            Toast.makeText(context, "Please wait for the current attachments to finish", Toast.LENGTH_SHORT).show()
            return@send
        }
        pendingAttachmentUris = uris
        scope.launch {
            runCatching {
                uris.map { repository.uploadMedia(context.contentResolver, it, "chat") }
            }.onSuccess { uploaded ->
                pendingAttachmentUris = emptyList()
                runCatching { repository.sendMessage(conversation.id, "", uploaded) }
                    .onSuccess { playMessageSound(context) }
                    .onFailure { Toast.makeText(context, it.message ?: "Message failed", Toast.LENGTH_SHORT).show() }
            }.onFailure {
                pendingAttachmentUris = emptyList()
                Toast.makeText(context, it.message ?: "Attachment failed", Toast.LENGTH_SHORT).show()
            }
        }
    }
    val filePicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri -> uri?.let { sendAttachments(listOf(it)) } }
    val mediaPicker = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri -> uri?.let { sendAttachments(listOf(it)) } }
    val galleryPicker = rememberLauncherForActivityResult(ActivityResultContracts.PickMultipleVisualMedia(10)) { sendAttachments(it) }
    val selectedMessage = messages.firstOrNull { it.id == selectedMessageId }
    val messageDetectedUrl = remember(messageText) { Regex("https?://[^\\s]+", RegexOption.IGNORE_CASE).find(messageText)?.value?.trimEnd('.', ',', ')', ']', '}') }
    val clipboard = remember { context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager }
    val chatHaptics = androidx.compose.ui.platform.LocalHapticFeedback.current

    val finishRecording: () -> Unit = {
        val activeRecorder = recorder
        val file = recordingFile
        runCatching { activeRecorder?.stop() }
        runCatching { activeRecorder?.release() }
        recorder = null
        recording = false
        if (file != null && file.exists() && file.length() > 0L) {
            scope.launch {
                runCatching {
                    val uri = FileProvider.getUriForFile(context, "${context.packageName}.files", file)
                    val media = repository.uploadMedia(context.contentResolver, uri, "chat")
                    repository.sendMessage(conversation.id, "", listOf(media))
                }.onSuccess { playMessageSound(context) }
                    .onFailure { Toast.makeText(context, it.message ?: "Voice message failed", Toast.LENGTH_SHORT).show() }
                file.delete()
                recordingFile = null
            }
        }
    }
    val startRecording: () -> Unit = start@ {
        if (contactBlocked) {
            Toast.makeText(context, "Voice messages are unavailable for blocked accounts", Toast.LENGTH_SHORT).show()
            return@start
        }
        val file = File(context.cacheDir, "tiwi-voice-${System.currentTimeMillis()}.m4a")
        runCatching {
            @Suppress("DEPRECATION")
            val next = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) MediaRecorder(context) else MediaRecorder()
            next.setAudioSource(MediaRecorder.AudioSource.MIC)
            next.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
            next.setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
            next.setAudioEncodingBitRate(96_000)
            next.setAudioSamplingRate(44_100)
            next.setOutputFile(file.absolutePath)
            next.prepare()
            next.start()
            recorder = next
            recordingFile = file
            recording = true
        }.onFailure {
            file.delete()
            Toast.makeText(context, it.message ?: "Microphone could not start", Toast.LENGTH_SHORT).show()
        }
    }
    val recordPermission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (granted) startRecording() else Toast.makeText(context, "Microphone permission is required", Toast.LENGTH_SHORT).show()
    }

    mediaViewer?.let { selection ->
        MessengerMediaViewer(
            selection, repository.currentUserId(), onBack = { mediaViewer = null },
            onEditCaption = { mediaViewer = null; messageToEdit = selection.message; editText = selection.message.body },
            onDelete = { mediaViewer = null; messageToDelete = selection.message },
            onUnsend = { mediaViewer = null; messageToUnsend = selection.message }
        )
        return
    }
    messageToForward?.let { target ->
        ForwardMessagePage(repository, target, onBack = { messageToForward = null }) { messageToForward = null }
        return
    }
    if (showAddMembers) {
        AddConversationMembersPage(
            repository = repository,
            conversation = liveConversation,
            onBack = { showAddMembers = false },
            onDone = { updated -> liveConversation = updated; showAddMembers = false; showInfo = true }
        )
        return
    }
    if (showInfo) {
        BackHandler { showInfo = false }
        MessengerChatInfoPage(
            repository = repository,
            conversation = liveConversation,
            messages = messages,
            pinnedMessageIds = pinnedMessageIds,
            onBack = { showInfo = false },
            onProfile = { contact?.userId?.let(onProfileClick) },
            onAddMembers = { showInfo = false; showAddMembers = true }
        )
        return
    }

    BackHandler(enabled = selectedMessageId != null || replyTo != null) {
        if (selectedMessageId != null) selectedMessageId = null else replyTo = null
    }
    DisposableEffect(Unit) {
        onDispose {
            runCatching { recorder?.stop() }
            runCatching { recorder?.release() }
            recordingFile?.delete()
        }
    }

    LaunchedEffect(messageText, conversation.id) {
        if (!chatPreferences.getBoolean("typing_${conversation.id}", true)) return@LaunchedEffect
        if (messageText.isBlank()) {
            runCatching { repository.setConversationTyping(conversation.id, false) }
        } else {
            runCatching { repository.setConversationTyping(conversation.id, true) }
            delay(1800)
            runCatching { repository.setConversationTyping(conversation.id, false) }
        }
    }

    LaunchedEffect(messageDetectedUrl) {
        val url = messageDetectedUrl ?: return@LaunchedEffect
        if (url == messageLinkPreview?.url || url == dismissedMessagePreviewUrl) return@LaunchedEffect
        delay(450)
        runCatching { repository.linkPreview(url) }.onSuccess { messageLinkPreview = it; dismissedMessagePreviewUrl = null }
    }

    LaunchedEffect(conversation.id) {
        var knownIncomingIds = repository.cachedMessages(conversation.id)
            .filter { it.senderId != repository.currentUserId() }
            .mapTo(mutableSetOf()) { it.id }
        var soundPrimed = false
        runCatching { repository.markConversationRead(conversation.id) }
        while (true) {
            val refreshed = runCatching { repository.refreshMessages(conversation.id) }.getOrNull()
            if (refreshed != null) {
                val incomingIds = refreshed.filter { it.senderId != repository.currentUserId() }.mapTo(mutableSetOf()) { it.id }
                if (soundPrimed && incomingIds.any { it !in knownIncomingIds } && chatPreferences.getBoolean("sounds", true)) {
                    playMessageSound(context)
                }
                knownIncomingIds = incomingIds
                soundPrimed = true
            }
            if (refreshed != null && chatPreferences.getBoolean("auto_save_${conversation.id}", false)) {
                val savedKey = "saved_media_${conversation.id}"
                var saved = chatPreferences.getStringSet(savedKey, emptySet()).orEmpty()
                refreshed.asSequence()
                    .filter { it.senderId != repository.currentUserId() }
                    .flatMap { it.media.asSequence() }
                    .filter { it.type == "image" && it.url.isNotBlank() && it.url !in saved }
                    .take(6)
                    .forEach { media ->
                        if (saveRemoteImageToGallery(context, media.url)) {
                            saved = (saved + media.url).toList().takeLast(500).toSet()
                            chatPreferences.edit().putStringSet(savedKey, saved).apply()
                        }
                    }
            }
            runCatching { repository.refreshConversations(force = true) }.getOrNull()?.firstOrNull { it.id == conversation.id }?.let { liveConversation = it }
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
                    .height(62.dp)
                    .padding(horizontal = 2.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                if (selectedMessage != null) {
                    IconButton(onClick = { selectedMessageId = null }) { Icon(Icons.Default.Close, contentDescription = "Cancel selection") }
                    Column(Modifier.weight(1f)) {
                        Text("1 selected", fontWeight = FontWeight.Bold)
                        Text("${messageDay(selectedMessage.sentAt)} · ${messageClock(selectedMessage.sentAt)}", color = Color.Gray, fontSize = 11.sp)
                    }
                    if (selectedMessage.senderId == repository.currentUserId() && selectedMessage.unsentAt == null && !selectedMessage.id.startsWith("local-")) {
                        IconButton(onClick = { messageToUnsend = selectedMessage }) { Icon(Icons.Outlined.Delete, "Unsend", tint = Color(0xFFD92D20)) }
                    }
                } else {
                    IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, contentDescription = "Back") }
                    Box {
                        if (contactBlocked) Box(Modifier.size(48.dp).background(Color(0xFFF2F4F7), CircleShape), contentAlignment = Alignment.Center) {
                            Icon(Icons.Outlined.Person, null, tint = Color(0xFF98A2B3), modifier = Modifier.size(25.dp))
                        } else DecoratedAvatar(contact?.user?.avatar ?: liveConversation.avatarUrl, R.drawable.img_tiwi_avatar_1, contact?.profile?.avatarDecoration, Modifier.size(48.dp).clickable { contact?.userId?.let(onProfileClick) }, animateDecoration = true)
                        if (!contactBlocked && liveConversation.type == "direct" && isSociallyActive(contact?.user?.socialLastActiveAt)) Box(Modifier.align(Alignment.BottomEnd).size(13.dp).background(Color.White, CircleShape).padding(2.dp).background(Color(0xFF31A24C), CircleShape))
                    }
                    Spacer(modifier = Modifier.width(7.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(name, fontWeight = FontWeight.Bold)
                        Text(
                            if (contactBlocked) "Blocked account"
                            else if (contactTyping) "Typing…"
                            else if (liveConversation.type == "group") "${liveConversation.members.size} members"
                            else socialPresenceLabel(contact?.user?.socialLastActiveAt),
                            style = MaterialTheme.typography.labelSmall,
                            color = if (contactTyping || isSociallyActive(contact?.user?.socialLastActiveAt)) Color(0xFF31A24C) else Color(0xFF667085)
                        )
                    }
                    if (liveConversation.type == "direct") {
                        IconButton(enabled = !contactBlocked, onClick = { onCall(false) }) { Icon(Icons.Default.Call, contentDescription = "Call", tint = if (contactBlocked) Color(0xFFBFC5CE) else Color(0xFF0866FF), modifier = Modifier.size(27.dp)) }
                        IconButton(enabled = !contactBlocked, onClick = { onCall(true) }) { Icon(Icons.Default.VideoCall, contentDescription = "Video Call", tint = if (contactBlocked) Color(0xFFBFC5CE) else Color(0xFF0866FF), modifier = Modifier.size(29.dp)) }
                    }
                    IconButton(onClick = { showInfo = true }) { Icon(Icons.Default.Info, contentDescription = "Info", tint = Color(0xFF0866FF), modifier = Modifier.size(28.dp)) }
                }
            }
        }
        HorizontalDivider(thickness = .5.dp, color = Color.LightGray.copy(alpha = .55f))

        // Messages Area
        LazyColumn(
            modifier = Modifier.weight(1f).padding(horizontal = 8.dp),
            verticalArrangement = Arrangement.spacedBy(2.dp),
            contentPadding = PaddingValues(top = 8.dp, bottom = 8.dp),
            reverseLayout = false
        ) {
            item {
                if (isRandom) {
                    Column(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 40.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Box(contentAlignment = Alignment.BottomEnd) {
                            DecoratedAvatar(contact?.user?.avatar, R.drawable.img_tiwi_avatar_1, contact?.profile?.avatarDecoration, Modifier.size(112.dp), animateDecoration = true)
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
            
            itemsIndexed(messages, key = { _, item -> item.id }) { index, message ->
                if (message.id == firstUnreadId) {
                    Row(Modifier.fillMaxWidth().padding(vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                        HorizontalDivider(Modifier.weight(1f), color = Color(0xFFBCC0C4))
                        Text("Unread messages", color = Color(0xFF65676B), fontSize = 11.sp, modifier = Modifier.padding(horizontal = 12.dp))
                        HorizontalDivider(Modifier.weight(1f), color = Color(0xFFBCC0C4))
                    }
                }
                val previousDay = messages.getOrNull(index - 1)?.sentAt?.let(::messageDay)
                val currentDay = messageDay(message.sentAt)
                if (currentDay.isNotBlank() && currentDay != previousDay) {
                    Box(Modifier.fillMaxWidth().padding(vertical = 7.dp), contentAlignment = Alignment.Center) {
                        Surface(color = Color(0xFFF0F2F5), shape = RoundedCornerShape(14.dp), tonalElevation = 0.dp) {
                            Text(currentDay, Modifier.padding(horizontal = 11.dp, vertical = 5.dp), color = Color(0xFF667085), fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                        }
                    }
                }
                val msg = if (message.unsentAt != null) "Message unsent" else message.body
                val isMe = message.senderId == repository.currentUserId()
                val callEvent = parseCallEvent(message.body)
                val visualMessageMedia = message.media.filter { it.type == "image" || it.type == "video" }
                if (message.type == "system") {
                    val outgoingCall = callEvent?.callerId == repository.currentUserId() || message.senderId == repository.currentUserId()
                    Box(
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 3.dp, vertical = 2.dp),
                        contentAlignment = if (callEvent == null) Alignment.Center else if (outgoingCall) Alignment.CenterEnd else Alignment.CenterStart
                    ) {
                    Surface(
                        modifier = Modifier.combinedClickable(
                            onClick = {},
                            onLongClick = {
                                chatHaptics.performHapticFeedback(androidx.compose.ui.hapticfeedback.HapticFeedbackType.LongPress)
                                selectedMessageId = message.id
                            }
                        ),
                        color = Color(0xFFF7F8FA),
                        shape = RoundedCornerShape(14.dp),
                        border = BorderStroke(.7.dp, Color(0xFFE4E7EC)),
                        tonalElevation = 0.dp
                    ) {
                        Row(Modifier.padding(horizontal = 13.dp, vertical = 9.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(if (callEvent?.type == "video") Icons.Outlined.Videocam else Icons.Outlined.Call, null, tint = if (callEvent?.status in listOf("missed", "declined", "failed")) Color(0xFFD92D20) else TiwiBlue, modifier = Modifier.size(21.dp))
                            Column(Modifier.padding(start = 9.dp)) {
                                Text(callEvent?.let { callEventLabel(it, repository.currentUserId()) } ?: msg, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                                if (callEvent != null) Text("${messageClock(callEvent.startedAt)} – ${messageClock(callEvent.endedAt)}", color = Color.Gray, fontSize = 10.sp)
                                else Text(messageClock(message.sentAt), color = Color.Gray, fontSize = 10.sp)
                            }
                        }
                    }
                    }
                    return@itemsIndexed
                }
                Box(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 3.dp, vertical = 2.dp),
                    contentAlignment = if (isMe) Alignment.CenterEnd else Alignment.CenterStart
                ) {
                    Row(verticalAlignment = Alignment.Bottom) {
                    if (!isMe) {
                        DecoratedAvatar(message.sender.avatar, R.drawable.img_tiwi_avatar_1, message.senderProfile?.avatarDecoration, Modifier.size(34.dp))
                        Spacer(Modifier.width(7.dp))
                    }
                    Column(horizontalAlignment = if (isMe) Alignment.End else Alignment.Start) {
                    AnimatedVisibility(
                        visible = selectedMessageId == message.id,
                        enter = fadeIn(animationSpec = tween(140)),
                        exit = fadeOut(animationSpec = tween(100))
                    ) {
                        Surface(
                            color = Color.White,
                            shape = RoundedCornerShape(28.dp),
                            border = BorderStroke(.5.dp, Color(0xFFDADDE1)),
                            tonalElevation = 0.dp,
                            modifier = Modifier.padding(bottom = 5.dp)
                        ) {
                            Row(Modifier.padding(horizontal = 7.dp, vertical = 5.dp), verticalAlignment = Alignment.CenterVertically) {
                                listOf("❤️", "😆", "😮", "😢", "😡", "👍").forEach { emoji ->
                                    Text(
                                        emoji,
                                        fontSize = 24.sp,
                                        modifier = Modifier.clip(CircleShape).clickable {
                                            chatHaptics.performHapticFeedback(androidx.compose.ui.hapticfeedback.HapticFeedbackType.LongPress)
                                            scope.launch {
                                                runCatching { repository.reactToMessage(message.id, emoji) }
                                                    .onSuccess { selectedMessageId = null }
                                                    .onFailure { Toast.makeText(context, it.message ?: "Reaction failed", Toast.LENGTH_SHORT).show() }
                                            }
                                        }.padding(5.dp)
                                    )
                                }
                                Box(Modifier.size(34.dp).background(Color(0xFFF0F2F5), CircleShape).clickable {
                                    showEmojiPicker = true
                                    selectedMessageId = null
                                }, contentAlignment = Alignment.Center) {
                                    Icon(Icons.Default.Add, "More emoji", modifier = Modifier.size(20.dp))
                                }
                            }
                        }
                    }
                    Box(Modifier.padding(bottom = if (message.reactions.isNotEmpty()) 9.dp else 0.dp)) {
                    Surface(
                        color = when {
                            message.unsentAt != null -> Color.White
                            visualMessageMedia.isNotEmpty() && msg.isBlank() -> Color.Transparent
                            isMe -> outgoingMessageColor
                            else -> Color(0xFFF0F2F5)
                        },
                        shape = RoundedCornerShape(19.dp),
                        border = if (message.unsentAt != null) BorderStroke(.7.dp, Color(0xFFDADDE1)) else null,
                        modifier = Modifier.widthIn(max = 270.dp).combinedClickable(
                            onClick = {},
                            onLongClick = {
                                chatHaptics.performHapticFeedback(androidx.compose.ui.hapticfeedback.HapticFeedbackType.LongPress)
                                selectedMessageId = message.id
                            }
                        )
                    ) {
                        Column {
                            message.replyToId?.let { targetId ->
                                val quoted = messages.firstOrNull { it.id == targetId }
                                Surface(
                                    color = if (isMe) Color.White.copy(alpha = .17f) else Color.Black.copy(alpha = .06f),
                                    shape = RoundedCornerShape(12.dp),
                                    modifier = Modifier.padding(start = 7.dp, end = 7.dp, top = 7.dp).fillMaxWidth()
                                ) {
                                    Column(Modifier.padding(horizontal = 9.dp, vertical = 6.dp)) {
                                        Text(
                                            if (quoted?.senderId == repository.currentUserId()) "You" else quoted?.sender?.name ?: "Message",
                                            fontSize = 10.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = if (isMe) Color.White else TiwiBlue
                                        )
                                        Text(
                                            quoted?.body?.takeIf { it.isNotBlank() } ?: "Attachment",
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis,
                                            fontSize = 11.sp,
                                            color = if (isMe) Color.White.copy(alpha = .85f) else Color(0xFF475467)
                                        )
                                    }
                                }
                            }
                            if (message.media.any { it.forwarded }) Text("Forwarded", color = if (isMe) Color.White.copy(alpha = .78f) else Color(0xFF667085), fontSize = 9.sp, fontStyle = FontStyle.Italic, modifier = Modifier.padding(start = 12.dp, end = 12.dp, top = 6.dp))
                            if (visualMessageMedia.isNotEmpty()) MessengerMediaGrid(visualMessageMedia) { mediaViewer = MessengerMediaSelection(message, it) }
                            message.media.filter { it.type == "audio" }.forEach { TiwiAudioMessage(it.url, isMe) }
                            message.media.filter { it.type == "link_preview" }.mapNotNull { it.asLinkPreview() }.forEach {
                                SocialLinkCard(it, Modifier.widthIn(max = 270.dp))
                            }
                            message.media.filter { it.type == "shared_post" }.forEach { shared ->
                                SharedPostCard(shared, onOpenPost = {
                                    val target = linkedSharedPostId(shared)
                                    if (target != null) context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://tiwlo.com/social/post/$target")))
                                }, onOpenProfile = { shared.sharedAuthorId?.let(onProfileClick) })
                            }
                            message.media.filter { it.type == "story_reference" }.forEach { story ->
                                StoryReferenceCard(story) {
                                    val target = story.storyId?.takeIf { it.isNotBlank() }
                                    if (target != null) context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://tiwlo.com/social/story/$target")))
                                }
                            }
                            message.media.filter { it.type !in listOf("image", "video", "audio", "link_preview", "shared_post", "story_reference", "forwarded_message") }.forEach {
                                Text(it.title ?: "Attachment", modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp), color = if (isMe) Color.White else Color.Black)
                            }
                            if (msg.isNotBlank()) Text(
                                text = if (message.unsentAt != null) {
                                    if (isMe) "You unsent a message" else "${message.sender.name} unsent a message"
                                } else msg,
                                modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp),
                                color = if (message.unsentAt != null) Color(0xFF65676B) else if (isMe) Color.White else Color.Black,
                                style = MaterialTheme.typography.bodyMedium.copy(fontStyle = if (message.unsentAt != null) FontStyle.Italic else FontStyle.Normal)
                            )
                        }
                    }
                    if (message.reactions.isNotEmpty()) Surface(
                        color = Color(0xFFF0F2F5),
                        shape = RoundedCornerShape(18.dp),
                        border = BorderStroke(2.dp, Color.White),
                        tonalElevation = 0.dp,
                        modifier = Modifier
                            .align(if (isMe) Alignment.BottomEnd else Alignment.BottomStart)
                            .offset(x = if (isMe) 5.dp else (-5).dp, y = 9.dp)
                    ) {
                        Text(
                            message.reactions.groupingBy { it.emoji }.eachCount().entries.joinToString(" ") { (emoji, count) -> if (count > 1) "$emoji$count" else emoji },
                            fontSize = 13.sp,
                            modifier = Modifier.padding(horizontal = 7.dp, vertical = 2.dp)
                        )
                    }
                    }
                    val isLatestOutgoing = isMe && messages.drop(index + 1).none { it.senderId == repository.currentUserId() }
                    if (isLatestOutgoing) {
                        if (message.deliveryStatus == "read" || message.readAt != null) {
                            DecoratedAvatar(
                                contact?.user?.avatar,
                                R.drawable.img_tiwi_avatar_1,
                                contact?.profile?.avatarDecoration,
                                Modifier.padding(end = 3.dp, top = 3.dp).size(15.dp)
                            )
                        } else {
                            Text(
                                when (message.deliveryStatus) {
                                    "delivered" -> "Delivered"
                                    "sending" -> "Sending…"
                                    "failed" -> "Failed"
                                    else -> "Sent"
                                },
                                color = Color.Gray,
                                fontSize = 10.sp,
                                modifier = Modifier.padding(end = 5.dp, top = 2.dp)
                            )
                        }
                    }
                    if (selectedMessageId == message.id) Text("${messageDay(message.sentAt)} · ${messageClock(message.sentAt)}", color = Color.Gray, fontSize = 10.sp, modifier = Modifier.padding(horizontal = 5.dp).padding(top = 2.dp))
                    }
                    }
                }
            }
            if (contactTyping) item(key = "live-typing-bubble") {
                Row(Modifier.fillMaxWidth().padding(horizontal = 3.dp, vertical = 2.dp), verticalAlignment = Alignment.Bottom) {
                    DecoratedAvatar(contact?.user?.avatar, R.drawable.img_tiwi_avatar_1, contact?.profile?.avatarDecoration, Modifier.size(30.dp))
                    Surface(color = Color(0xFFF0F2F5), shape = RoundedCornerShape(18.dp), tonalElevation = 0.dp, modifier = Modifier.padding(start = 6.dp)) {
                        Row(Modifier.padding(horizontal = 12.dp, vertical = 10.dp), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            repeat(3) { index ->
                                val alpha by rememberInfiniteTransition(label = "typing").animateFloat(
                                    initialValue = .28f, targetValue = 1f,
                                    animationSpec = infiniteRepeatable(tween(430, delayMillis = index * 120), RepeatMode.Reverse),
                                    label = "typing-$index"
                                )
                                Box(Modifier.size(6.dp).alpha(alpha).background(Color(0xFF65676B), CircleShape))
                            }
                        }
                    }
                }
            }
            if (pendingAttachmentUris.isNotEmpty()) {
                item(key = "pending-chat-attachments") {
                    Box(Modifier.fillMaxWidth().padding(horizontal = 3.dp, vertical = 2.dp), contentAlignment = Alignment.CenterEnd) {
                        PendingMessengerMediaGrid(pendingAttachmentUris)
                    }
                }
            }
        }

        if (selectedMessage != null) {
            Row(
                Modifier.fillMaxWidth().navigationBarsPadding().height(62.dp),
                horizontalArrangement = Arrangement.SpaceEvenly,
                verticalAlignment = Alignment.CenterVertically
            ) {
                MessengerSelectionAction(Icons.Default.Reply, "Reply") { replyTo = selectedMessage; selectedMessageId = null }
                MessengerSelectionAction(Icons.Outlined.ContentCopy, "Copy") {
                    clipboard.setPrimaryClip(ClipData.newPlainText("Tiwi message", selectedMessage.body))
                    Toast.makeText(context, "Message copied", Toast.LENGTH_SHORT).show()
                    selectedMessageId = null
                }
                MessengerSelectionAction(Icons.Outlined.Translate, "Translate") {
                    val target = android.net.Uri.parse("https://translate.google.com/?sl=auto&tl=en&text=${android.net.Uri.encode(selectedMessage.body)}")
                    context.startActivity(Intent(Intent.ACTION_VIEW, target))
                    selectedMessageId = null
                }
                MessengerSelectionAction(Icons.Outlined.MoreHoriz, "More") {
                    messageActions = selectedMessage
                    selectedMessageId = null
                }
            }
        } else {
            replyTo?.let { target ->
                Row(
                    Modifier.fillMaxWidth().background(Color(0xFFF7F8FA)).padding(horizontal = 14.dp, vertical = 7.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(Modifier.width(3.dp).height(34.dp).background(TiwiBlue, RoundedCornerShape(2.dp)))
                    Column(Modifier.weight(1f).padding(start = 9.dp)) {
                        Text(if (target.senderId == repository.currentUserId()) "Replying to yourself" else "Replying to ${target.sender.name}", color = TiwiBlue, fontWeight = FontWeight.Bold, fontSize = 11.sp)
                        Text(target.body.ifBlank { "Attachment" }, maxLines = 1, overflow = TextOverflow.Ellipsis, color = Color(0xFF667085), fontSize = 11.sp)
                    }
                    IconButton(onClick = { replyTo = null }, modifier = Modifier.size(32.dp)) { Icon(Icons.Default.Close, "Cancel reply", modifier = Modifier.size(17.dp)) }
                }
            }
            AnimatedVisibility(
                visible = showEmojiPicker,
                enter = fadeIn(tween(140)) + androidx.compose.animation.expandVertically(animationSpec = tween(180), expandFrom = Alignment.Bottom),
                exit = fadeOut(tween(100)) + androidx.compose.animation.shrinkVertically(animationSpec = tween(150), shrinkTowards = Alignment.Bottom)
            ) {
                val emojiChoices = (emojiHistory + listOf(
                    "❤️", "😂", "🥰", "😮", "😢", "😡", "👍", "🙏",
                    "🔥", "🎉", "😍", "🤔", "👏", "💯", "😊", "😘",
                    "😭", "😎", "🤍", "💙", "✨", "🤣", "😁", "🙌"
                )).distinct()
                Column(Modifier.fillMaxWidth().background(Color.White).heightIn(max = 215.dp)) {
                    Row(Modifier.fillMaxWidth().padding(start = 14.dp, top = 8.dp, end = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                        Text("Recent emoji", fontWeight = FontWeight.Bold, fontSize = 13.sp, modifier = Modifier.weight(1f))
                        IconButton(onClick = { showEmojiPicker = false }, modifier = Modifier.size(32.dp)) { Icon(Icons.Default.Close, "Close emoji", modifier = Modifier.size(18.dp)) }
                    }
                    LazyColumn(contentPadding = PaddingValues(horizontal = 10.dp, vertical = 3.dp)) {
                        items(emojiChoices.chunked(8), key = { it.joinToString() }) { row ->
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                                row.forEach { emoji ->
                                    Text(emoji, fontSize = 28.sp, modifier = Modifier.size(43.dp).clip(CircleShape).clickable {
                                        chatHaptics.performHapticFeedback(androidx.compose.ui.hapticfeedback.HapticFeedbackType.TextHandleMove)
                                        playMessageSound(context)
                                        messageText += emoji
                                        emojiHistory = (listOf(emoji) + emojiHistory.filterNot { it == emoji }).take(12)
                                        chatPreferences.edit().putString("emoji_history", emojiHistory.joinToString(" ")).apply()
                                    }.wrapContentSize(Alignment.Center))
                                }
                                repeat(8 - row.size) { Spacer(Modifier.size(43.dp)) }
                            }
                        }
                    }
                }
            }
            messageLinkPreview?.let { preview ->
                SocialLinkCard(preview, Modifier.padding(horizontal = 9.dp, vertical = 4.dp)) {
                    dismissedMessagePreviewUrl = preview.url
                    messageLinkPreview = null
                }
            }
            Row(
                modifier = Modifier.fillMaxWidth().navigationBarsPadding().padding(horizontal = 4.dp, vertical = 5.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(enabled = !contactBlocked, onClick = { filePicker.launch("*/*") }) { Icon(Icons.Default.AddCircle, contentDescription = "More", tint = if (contactBlocked) Color(0xFFBFC5CE) else TiwiBlue) }
                IconButton(enabled = !contactBlocked, onClick = { mediaPicker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) }) { Icon(Icons.Default.CameraAlt, contentDescription = "Camera", tint = if (contactBlocked) Color(0xFFBFC5CE) else TiwiBlue) }
                IconButton(enabled = !contactBlocked, onClick = { galleryPicker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageAndVideo)) }) { Icon(Icons.Default.Image, contentDescription = "Gallery", tint = if (contactBlocked) Color(0xFFBFC5CE) else TiwiBlue) }
                if (messageText.isBlank()) IconButton(enabled = !contactBlocked, onClick = {
                    chatHaptics.performHapticFeedback(androidx.compose.ui.hapticfeedback.HapticFeedbackType.LongPress)
                    if (recording) finishRecording()
                    else if (ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) startRecording()
                    else recordPermission.launch(Manifest.permission.RECORD_AUDIO)
                }) {
                    Icon(if (recording) Icons.Default.StopCircle else Icons.Default.Mic, if (recording) "Stop recording" else "Voice message", tint = if (recording) Color(0xFFD92D20) else TiwiBlue)
                }
                Surface(
                    modifier = Modifier.weight(1f).heightIn(min = 42.dp, max = 96.dp),
                    color = if (recording) Color(0xFFFFEBEE) else Color(0xFFF1F1F1),
                    shape = RoundedCornerShape(22.dp)
                ) {
                    Row(
                        Modifier.fillMaxWidth().padding(start = 15.dp, end = 3.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        BasicTextField(
                            value = messageText,
                            onValueChange = { if (!recording) messageText = it.take(8000) },
                            enabled = !recording && !contactBlocked,
                            textStyle = MaterialTheme.typography.bodyLarge.copy(color = Color(0xFF1C1E21), fontSize = 16.sp),
                            modifier = Modifier.weight(1f).padding(vertical = 10.dp),
                            decorationBox = { inner ->
                                if (messageText.isBlank()) {
                                    Text(
                                        if (contactBlocked) "Messaging unavailable" else if (recording) "Recording voice message…" else "Message",
                                        color = if (recording) Color(0xFFD92D20) else Color(0xFF65676B),
                                        fontSize = 16.sp
                                    )
                                }
                                inner()
                            }
                        )
                        IconButton(enabled = !contactBlocked, onClick = { showEmojiPicker = !showEmojiPicker }, modifier = Modifier.size(36.dp)) {
                            Icon(Icons.Outlined.EmojiEmotions, "Emoji", tint = if (contactBlocked) Color(0xFFBFC5CE) else TiwiBlue, modifier = Modifier.size(23.dp))
                        }
                    }
                }
                IconButton(enabled = !contactBlocked, onClick = {
                    chatHaptics.performHapticFeedback(androidx.compose.ui.hapticfeedback.HapticFeedbackType.TextHandleMove)
                    if (messageText.isBlank()) {
                        scope.launch {
                            runCatching { repository.sendMessage(conversation.id, "👍", replyToId = replyTo?.id) }
                                .onSuccess { playMessageSound(context) }
                        }
                        replyTo = null
                        return@IconButton
                    }
                    val sending = messageText
                    val replyId = replyTo?.id
                    val previewMedia = messageLinkPreview?.asMessageMedia()?.let(::listOf).orEmpty()
                    messageText = ""
                    messageLinkPreview = null
                    dismissedMessagePreviewUrl = null
                    replyTo = null
                    scope.launch {
                        runCatching { repository.sendMessage(conversation.id, sending, media = previewMedia, replyToId = replyId) }
                            .onSuccess { playMessageSound(context) }
                            .onFailure { Toast.makeText(context, it.message ?: "Message failed", Toast.LENGTH_SHORT).show() }
                    }
                }) {
                    Icon(if (messageText.isEmpty()) Icons.Default.ThumbUp else Icons.Default.Send, contentDescription = "Send", tint = TiwiBlue)
                }
            }
        }
    }

    messageActions?.let { target ->
        ModalBottomSheet(
            onDismissRequest = { messageActions = null },
            containerColor = Color.White,
            tonalElevation = 0.dp,
            dragHandle = { BottomSheetDefaults.DragHandle(Modifier.height(20.dp)) }
        ) {
            Column(Modifier.fillMaxWidth().navigationBarsPadding().padding(horizontal = 10.dp, vertical = 2.dp)) {
                MessengerOptionRow(Icons.Default.Reply, "Reply") { replyTo = target; messageActions = null }
                MessengerOptionRow(Icons.Outlined.Forward, "Forward") { messageToForward = target; messageActions = null }
                MessengerOptionRow(Icons.Outlined.PushPin, if (target.id in pinnedMessageIds) "Unpin message" else "Pin message") {
                    pinnedMessageIds = if (target.id in pinnedMessageIds) pinnedMessageIds - target.id else pinnedMessageIds + target.id
                    chatPreferences.edit().putStringSet("pinned_messages_${conversation.id}", pinnedMessageIds).apply()
                    messageActions = null
                }
                if (target.senderId == repository.currentUserId() && target.unsentAt == null) MessengerOptionRow(Icons.Outlined.Edit, if (target.media.isEmpty()) "Edit message" else "Edit caption") {
                    editText = target.body; messageToEdit = target; messageActions = null
                }
                MessengerOptionRow(Icons.Outlined.Delete, "Delete for me", destructive = true) { messageToDelete = target; messageActions = null }
                if (target.senderId == repository.currentUserId() && target.unsentAt == null) MessengerOptionRow(Icons.Outlined.DeleteForever, "Unsend for everyone", destructive = true) { messageToUnsend = target; messageActions = null }
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
                    selectedMessageId = null
                    scope.launch {
                        runCatching { repository.unsendMessage(target.id) }
                            .onFailure { Toast.makeText(context, it.message ?: "Unsend failed", Toast.LENGTH_SHORT).show() }
                    }
                }) { Text("Unsend", color = Color.Red) }
            },
            dismissButton = { TextButton(onClick = { messageToUnsend = null }) { Text("Cancel") } }
        )
    }
    messageToEdit?.let { target ->
        AlertDialog(
            onDismissRequest = { messageToEdit = null },
            containerColor = Color.White,
            tonalElevation = 0.dp,
            title = { Text("Message options") },
            text = {
                Column {
                    OutlinedTextField(editText, { editText = it.take(8000) }, modifier = Modifier.fillMaxWidth(), label = { Text(if (target.media.isEmpty()) "Edit message" else "Caption (optional)") })
                    TextButton(onClick = {
                        pinnedMessageIds = if (target.id in pinnedMessageIds) pinnedMessageIds - target.id else pinnedMessageIds + target.id
                        chatPreferences.edit().putStringSet("pinned_messages_${conversation.id}", pinnedMessageIds).apply()
                        messageToEdit = null
                    }) {
                        Icon(Icons.Outlined.PushPin, null)
                        Text(if (target.id in pinnedMessageIds) "Unpin message" else "Pin message", modifier = Modifier.padding(start = 7.dp))
                    }
                    TextButton(onClick = { messageToEdit = null; messageToUnsend = target }) {
                        Icon(Icons.Outlined.DeleteForever, null, tint = Color(0xFFD92D20))
                        Text("Unsend for everyone", color = Color(0xFFD92D20), modifier = Modifier.padding(start = 7.dp))
                    }
                }
            },
            confirmButton = {
                TextButton(enabled = editText.isNotBlank() || target.media.isNotEmpty(), onClick = {
                    messageToEdit = null
                    scope.launch {
                        runCatching { repository.editMessage(target.id, editText) }
                            .onFailure { Toast.makeText(context, it.message ?: "Edit failed", Toast.LENGTH_SHORT).show() }
                    }
                }) { Text("Save") }
            },
            dismissButton = {
                TextButton(onClick = { messageToEdit = null; messageToDelete = target }) { Text("Delete for me", color = Color(0xFFD92D20)) }
            }
        )
    }
    messageToDelete?.let { target ->
        AlertDialog(
            onDismissRequest = { messageToDelete = null },
            containerColor = Color.White,
            tonalElevation = 0.dp,
            title = { Text("Delete message?") },
            text = {
                Column {
                    Text("This removes the message from your chat history only.")
                    TextButton(onClick = {
                        pinnedMessageIds = if (target.id in pinnedMessageIds) pinnedMessageIds - target.id else pinnedMessageIds + target.id
                        chatPreferences.edit().putStringSet("pinned_messages_${conversation.id}", pinnedMessageIds).apply()
                        messageToDelete = null
                    }) {
                        Icon(Icons.Outlined.PushPin, null)
                        Text(if (target.id in pinnedMessageIds) "Unpin message" else "Pin message", modifier = Modifier.padding(start = 7.dp))
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = {
                    messageToDelete = null
                    scope.launch {
                        runCatching { repository.deleteMessageForMe(target.id) }
                            .onFailure { Toast.makeText(context, it.message ?: "Delete failed", Toast.LENGTH_SHORT).show() }
                    }
                }) { Text("Delete", color = Color(0xFFD92D20)) }
            },
            dismissButton = { TextButton(onClick = { messageToDelete = null }) { Text("Cancel") } }
        )
    }
}

@Composable
private fun ForwardMessagePage(
    repository: SocialRepository,
    message: SocialMessage,
    onBack: () -> Unit,
    onDone: () -> Unit
) {
    val conversations by repository.conversations.collectAsState()
    var query by remember { mutableStateOf("") }
    var sendingIds by remember { mutableStateOf<Set<String>>(emptySet()) }
    val scope = rememberTiwiCoroutineScope()
    val context = LocalContext.current
    BackHandler(onBack = onBack)
    val visible = conversations.filter { conversation ->
        val contact = conversation.members.firstOrNull { it.userId != repository.currentUserId() }
        val name = conversation.title ?: contact?.user?.name.orEmpty()
        conversation.requestStatus == "accepted" && (query.isBlank() || name.contains(query, true))
    }
    Column(Modifier.fillMaxSize().background(Color.White)) {
        Row(Modifier.fillMaxWidth().statusBarsPadding().height(52.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") }
            Text("Forward message", fontWeight = FontWeight.ExtraBold, fontSize = 17.sp)
        }
        OutlinedTextField(
            query, { query = it.take(80) }, Modifier.fillMaxWidth().padding(horizontal = 12.dp), singleLine = true,
            leadingIcon = { Icon(Icons.Default.Search, null, Modifier.size(19.dp)) }, placeholder = { Text("Search chats") }, shape = RoundedCornerShape(22.dp)
        )
        Surface(Modifier.fillMaxWidth().padding(12.dp), color = Color(0xFFF0F2F5), shape = RoundedCornerShape(12.dp), tonalElevation = 0.dp) {
            Column(Modifier.padding(10.dp)) {
                Text("Forwarded", color = Color.Gray, fontSize = 9.sp, fontStyle = FontStyle.Italic)
                Text(message.body.ifBlank { messagePreview(message, repository.currentUserId()) }, maxLines = 2, overflow = TextOverflow.Ellipsis, fontSize = 12.sp)
                if (message.media.isNotEmpty()) Text("${message.media.size} attachment${if (message.media.size == 1) "" else "s"}", color = TiwiBlue, fontSize = 10.sp)
            }
        }
        LazyColumn(Modifier.fillMaxWidth().weight(1f), contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp)) {
            items(visible, key = { "forward-${it.id}" }) { chat ->
                val contact = chat.members.firstOrNull { it.userId != repository.currentUserId() }
                val name = chat.title ?: contact?.user?.name.orEmpty().ifBlank { "Tiwi chat" }
                Row(Modifier.fillMaxWidth().padding(vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                    DecoratedAvatar(contact?.user?.avatar ?: chat.avatarUrl, R.drawable.img_tiwi_avatar_1, contact?.profile?.avatarDecoration, Modifier.size(43.dp))
                    Column(Modifier.weight(1f).padding(start = 9.dp)) { Text(name, fontWeight = FontWeight.Bold, fontSize = 13.sp); Text(if (chat.type == "group") "Group" else socialPresenceLabel(contact?.user?.socialLastActiveAt), color = Color.Gray, fontSize = 9.sp) }
                    Button(
                        enabled = chat.id !in sendingIds,
                        onClick = {
                            sendingIds = sendingIds + chat.id
                            val forwardedMedia = if (message.media.isEmpty()) listOf(SocialMedia(type = "forwarded_message", title = message.body, forwarded = true, forwardedFromName = message.sender.name, forwardedFromMessageId = message.id))
                            else message.media.map { it.copy(forwarded = true, forwardedFromName = message.sender.name, forwardedFromMessageId = message.id) }
                            scope.launch {
                                runCatching { repository.sendMessage(chat.id, message.body, forwardedMedia) }
                                    .onSuccess { Toast.makeText(context, "Sent to $name", Toast.LENGTH_SHORT).show() }
                                    .onFailure { Toast.makeText(context, it.message ?: "Forward failed", Toast.LENGTH_SHORT).show() }
                                sendingIds = sendingIds - chat.id
                            }
                        },
                        modifier = Modifier.height(31.dp), shape = RoundedCornerShape(8.dp), contentPadding = PaddingValues(horizontal = 12.dp)
                    ) { if (chat.id in sendingIds) CircularProgressIndicator(Modifier.size(13.dp), color = Color.White, strokeWidth = 2.dp) else Text("Send", fontSize = 10.sp) }
                }
            }
        }
        TextButton(onClick = onDone, modifier = Modifier.align(Alignment.End).navigationBarsPadding().padding(end = 8.dp)) { Text("Done") }
    }
}

@Composable
private fun MessengerSelectionAction(icon: ImageVector, label: String, onClick: () -> Unit) {
    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.clickable(onClick = onClick).padding(horizontal = 10.dp, vertical = 5.dp)) {
        Icon(icon, label, tint = Color(0xFF001489), modifier = Modifier.size(24.dp))
        Text(label, fontSize = 10.sp, modifier = Modifier.padding(top = 3.dp))
    }
}

@Composable
private fun MessengerOptionRow(icon: ImageVector, label: String, destructive: Boolean = false, onClick: () -> Unit) {
    Row(Modifier.fillMaxWidth().clickable(onClick = onClick).padding(horizontal = 8.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
        Icon(icon, null, tint = if (destructive) Color(0xFFD92D20) else Color(0xFF101828), modifier = Modifier.size(21.dp))
        Text(label, color = if (destructive) Color(0xFFD92D20) else Color(0xFF101828), fontSize = 13.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(start = 12.dp))
    }
}

@Composable
private fun TiwiAudioMessage(url: String, isMe: Boolean) {
    val context = LocalContext.current
    var player by remember(url) { mutableStateOf<ExoPlayer?>(null) }
    var playing by remember { mutableStateOf(false) }
    var progress by remember { mutableFloatStateOf(0f) }
    var durationMs by remember { mutableLongStateOf(0L) }
    LaunchedEffect(player, playing) {
        val activePlayer = player ?: return@LaunchedEffect
        while (playing) {
            val duration = activePlayer.duration.takeIf { it > 0 } ?: 1L
            progress = (activePlayer.currentPosition.toFloat() / duration).coerceIn(0f, 1f)
            delay(150)
        }
    }
    DisposableEffect(player) {
        val activePlayer = player ?: return@DisposableEffect onDispose { }
        val listener = object : Player.Listener {
            override fun onIsPlayingChanged(isPlaying: Boolean) { playing = isPlaying }
            override fun onPlaybackStateChanged(playbackState: Int) {
                if (playbackState == Player.STATE_READY) durationMs = activePlayer.duration.coerceAtLeast(0L)
                if (playbackState == Player.STATE_ENDED) {
                    playing = false
                    progress = 0f
                    activePlayer.seekTo(0)
                }
            }
        }
        activePlayer.addListener(listener)
        onDispose { activePlayer.removeListener(listener); activePlayer.release() }
    }
    Row(Modifier.widthIn(min = 235.dp).padding(horizontal = 9.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
        Box(
            Modifier.size(43.dp).background(if (isMe) Color(0xFF001B8E) else Color.White, CircleShape).clickable {
                val activePlayer = player ?: ExoPlayer.Builder(context).build().apply {
                    setMediaItem(MediaItem.fromUri(url))
                    prepare()
                }.also { player = it }
                if (activePlayer.isPlaying) activePlayer.pause() else activePlayer.play()
            },
            contentAlignment = Alignment.Center
        ) {
            Icon(if (playing) Icons.Default.Pause else Icons.Default.PlayArrow, if (playing) "Pause voice message" else "Play voice message", tint = if (isMe) Color.White else TiwiBlue, modifier = Modifier.size(27.dp))
        }
        Canvas(Modifier.weight(1f).height(38.dp).padding(horizontal = 8.dp)) {
            val bars = 31
            val gap = size.width / (bars * 1.65f)
            val barWidth = gap * .65f
            repeat(bars) { index ->
                val ratio = (.22f + ((index * 37) % 11) / 14f).coerceAtMost(1f)
                val height = size.height * ratio
                val x = index * (barWidth + gap * .35f)
                val played = index.toFloat() / bars <= progress
                drawLine(
                    color = if (played) {
                        if (isMe) Color.White else TiwiBlue
                    } else {
                        if (isMe) Color.White.copy(alpha = .55f) else Color(0xFF8A8D91)
                    },
                    start = Offset(x, (size.height - height) / 2f),
                    end = Offset(x, (size.height + height) / 2f),
                    strokeWidth = barWidth,
                    cap = StrokeCap.Round
                )
            }
        }
        val seconds = ((if (durationMs > 0) durationMs else 0L) / 1000L).coerceAtLeast(0L)
        Text(String.format(Locale.US, "%d:%02d", seconds / 60, seconds % 60), color = if (isMe) Color.White else Color(0xFF65676B), fontSize = 11.sp)
    }
}

@Composable
private fun MessengerChatInfoPage(
    repository: SocialRepository,
    conversation: SocialConversation,
    messages: List<SocialMessage>,
    pinnedMessageIds: Set<String>,
    onBack: () -> Unit,
    onProfile: () -> Unit,
    onAddMembers: () -> Unit
) {
    val scope = rememberTiwiCoroutineScope()
    val context = LocalContext.current
    val preferences = remember { context.getSharedPreferences("tiwi_messenger", Context.MODE_PRIVATE) }
    val currentUserId = repository.currentUserId()
    val contact = conversation.members.firstOrNull { it.userId != currentUserId }
    val membership = conversation.members.firstOrNull { it.userId == currentUserId }
    var nickname by remember { mutableStateOf(preferences.getString("nickname_${conversation.id}", null).orEmpty()) }
    val name = nickname.takeIf { it.isNotBlank() } ?: conversation.title ?: contact?.user?.name ?: "Tiwi chat"
    val mediaCount = messages.sumOf { it.media.size }
    val links = messages.count { it.body.contains("http://") || it.body.contains("https://") }
    var muted by remember(membership?.muted) { mutableStateOf(membership?.muted == true) }
    var sounds by remember { mutableStateOf(preferences.getBoolean("sounds", true)) }
    var section by remember { mutableStateOf<String?>(null) }
    var searchQuery by remember { mutableStateOf("") }
    var nicknameDialog by remember { mutableStateOf(false) }
    var nicknameDraft by remember { mutableStateOf(nickname) }
    var groupDialog by remember { mutableStateOf(false) }
    var groupName by remember { mutableStateOf("") }
    var groupBusy by remember { mutableStateOf(false) }
    var customizeDialog by remember { mutableStateOf(false) }
    var permissionsDialog by remember { mutableStateOf(false) }
    var autoSave by remember { mutableStateOf(preferences.getBoolean("auto_save_${conversation.id}", false)) }
    var disappearing by remember { mutableStateOf(preferences.getInt("disappearing_${conversation.id}", 0)) }
    var readReceipts by remember { mutableStateOf(preferences.getBoolean("read_receipts_${conversation.id}", true)) }
    var typingIndicator by remember { mutableStateOf(preferences.getBoolean("typing_${conversation.id}", true)) }

    section?.let { active ->
        val rows = when (active) {
            "search" -> messages.filter { searchQuery.isNotBlank() && it.body.contains(searchQuery, true) }
            "media" -> messages.filter { it.media.isNotEmpty() || it.body.contains("http://") || it.body.contains("https://") }
            else -> messages.filter { it.id in pinnedMessageIds }
        }
        Column(Modifier.fillMaxSize().background(Color.White).statusBarsPadding().navigationBarsPadding()) {
            Row(Modifier.fillMaxWidth().height(52.dp), verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = { section = null }) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") }
                Text(when (active) { "search" -> "Search in conversation"; "media" -> "Media, files & links"; else -> "Pinned messages" }, fontSize = 18.sp, fontWeight = FontWeight.Bold)
            }
            if (active == "search") OutlinedTextField(
                searchQuery,
                { searchQuery = it },
                modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp),
                singleLine = true,
                leadingIcon = { Icon(Icons.Default.Search, null) },
                placeholder = { Text("Search messages") },
                shape = RoundedCornerShape(18.dp)
            )
            if (rows.isEmpty()) Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text(if (active == "search" && searchQuery.isBlank()) "Type to search this conversation" else "Nothing found", color = Color(0xFF667085))
            } else LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(rows, key = { "info-message-${it.id}" }) { message ->
                    Surface(color = Color(0xFFF7F8FA), shape = RoundedCornerShape(14.dp), tonalElevation = 0.dp) {
                        Column(Modifier.fillMaxWidth().padding(11.dp)) {
                            Text(if (message.senderId == currentUserId) "You" else message.sender.name, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                            message.media.forEach { media ->
                                if (media.type == "image") AsyncImage(model = media.url, contentDescription = null, modifier = Modifier.fillMaxWidth().heightIn(max = 220.dp).clip(RoundedCornerShape(10.dp)), contentScale = ContentScale.Crop)
                                else Text("${media.type.replaceFirstChar { it.uppercase() }} attachment", color = TiwiBlue, modifier = Modifier.padding(vertical = 6.dp))
                            }
                            if (message.body.isNotBlank()) Text(message.body, modifier = Modifier.padding(top = 4.dp))
                            Text("${messageDay(message.sentAt)} · ${messageClock(message.sentAt)}", color = Color(0xFF667085), fontSize = 10.sp, modifier = Modifier.padding(top = 5.dp))
                        }
                    }
                }
            }
        }
        return
    }

    Column(Modifier.fillMaxSize().background(Color.White).statusBarsPadding().navigationBarsPadding().verticalScroll(rememberScrollState())) {
        Row(Modifier.fillMaxWidth().height(50.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") }
            Spacer(Modifier.weight(1f))
            IconButton(onClick = {
                val share = Intent(Intent.ACTION_SEND).apply {
                    type = "text/plain"
                    putExtra(Intent.EXTRA_TEXT, "Chat with $name on Tiwi")
                }
                context.startActivity(Intent.createChooser(share, "Share contact"))
            }) { Icon(Icons.Default.MoreVert, "More") }
        }
        Column(Modifier.fillMaxWidth().padding(vertical = 12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            DecoratedAvatar(contact?.user?.avatar ?: conversation.avatarUrl, R.drawable.img_tiwi_avatar_1, contact?.profile?.avatarDecoration, Modifier.size(118.dp), animateDecoration = true)
            Text(name, fontSize = 25.sp, fontWeight = FontWeight.Black, textAlign = TextAlign.Center, modifier = Modifier.padding(horizontal = 20.dp, vertical = 12.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                MessengerInfoShortcut(Icons.Outlined.Person, "Profile", onProfile)
                MessengerInfoShortcut(Icons.Outlined.TextFields, "Nicknames") { nicknameDraft = nickname; nicknameDialog = true }
                MessengerInfoShortcut(Icons.Outlined.Search, "Search") { section = "search" }
                MessengerInfoShortcut(Icons.Outlined.Palette, "Customize") { customizeDialog = true }
            }
        }
        Text("Chat info", color = Color(0xFF667085), modifier = Modifier.padding(horizontal = 16.dp, vertical = 9.dp))
        MessengerInfoRow(Icons.Outlined.PhotoLibrary, "View media, files & links", "$mediaCount media · $links links") {
            section = "media"
        }
        MessengerInfoRow(Icons.Outlined.PushPin, "Pinned messages", "${pinnedMessageIds.size} pinned") { section = "pinned" }
        Text("Actions", color = Color(0xFF667085), modifier = Modifier.padding(horizontal = 16.dp, vertical = 9.dp))
        MessengerSettingSwitch(Icons.Outlined.NotificationsOff, "Mute $name", "Silence this conversation", muted) {
            muted = it
            scope.launch {
                runCatching { repository.updateConversationMember(conversation.id, muted = it) }
                    .onFailure { error -> muted = !muted; Toast.makeText(context, error.message ?: "Mute failed", Toast.LENGTH_SHORT).show() }
            }
        }
        MessengerSettingSwitch(Icons.Outlined.VolumeUp, "Notifications & sounds", "Message alert sound", sounds) {
            sounds = it
            preferences.edit().putBoolean("sounds", it).apply()
        }
        MessengerInfoRow(
            Icons.Outlined.GroupAdd,
            if (conversation.type == "group") "Add members" else "Create group chat with $name"
        ) { if (conversation.type == "group") onAddMembers() else groupDialog = true }
        MessengerSettingSwitch(Icons.Outlined.Download, "Auto-save photos", "Save incoming photos to your gallery", autoSave) {
            autoSave = it
            preferences.edit().putBoolean("auto_save_${conversation.id}", it).apply()
        }
        MessengerInfoRow(Icons.Outlined.Share, "Share contact") {
            val share = Intent(Intent.ACTION_SEND).apply { type = "text/plain"; putExtra(Intent.EXTRA_TEXT, "Chat with $name on Tiwi") }
            context.startActivity(Intent.createChooser(share, "Share contact"))
        }
        Text("Privacy & support", color = Color(0xFF667085), modifier = Modifier.padding(horizontal = 16.dp, vertical = 9.dp))
        MessengerInfoRow(Icons.Outlined.Timer, "Disappearing messages", if (disappearing == 0) "Off" else "${disappearing / 3600} hour") {
            disappearing = if (disappearing == 0) 3600 else 0
            preferences.edit().putInt("disappearing_${conversation.id}", disappearing).apply()
        }
        MessengerSettingSwitch(Icons.Outlined.Visibility, "Read receipts", if (readReceipts) "On" else "Off", readReceipts) {
            readReceipts = it
            preferences.edit().putBoolean("read_receipts_${conversation.id}", it).apply()
        }
        MessengerSettingSwitch(Icons.Outlined.MoreHoriz, "Typing indicator", if (typingIndicator) "On" else "Off", typingIndicator) {
            typingIndicator = it
            preferences.edit().putBoolean("typing_${conversation.id}", it).apply()
        }
        MessengerInfoRow(Icons.Outlined.GppGood, "Message permissions", "Control who can message you") { permissionsDialog = true }
        MessengerInfoRow(Icons.Outlined.Lock, "Encrypted transport", "Messages use authenticated HTTPS; calls use encrypted WebRTC", enabled = false) {}
        MessengerInfoRow(Icons.Outlined.Block, "Block") {
            contact?.userId?.let { userId -> scope.launch { runCatching { repository.blockUser(userId, true, "Blocked from chat") } } }
        }
        MessengerInfoRow(Icons.Outlined.DoNotDisturbOn, "Restrict") {
            contact?.userId?.let { userId ->
                val restricted = preferences.getStringSet("restricted_users", emptySet()).orEmpty() + userId
                preferences.edit().putStringSet("restricted_users", restricted).apply()
                scope.launch { repository.updateConversationMember(conversation.id, muted = true, archived = true); onBack() }
            }
        }
        MessengerInfoRow(Icons.Outlined.Report, "Report", destructive = true) {
            scope.launch {
                runCatching { repository.reportContent("profile", contact?.userId.orEmpty(), "harassment") }
                    .onSuccess { Toast.makeText(context, "Report sent", Toast.LENGTH_SHORT).show() }
            }
        }
        MessengerInfoRow(Icons.Outlined.Delete, "Delete chat", destructive = true) {
            scope.launch { repository.updateConversationMember(conversation.id, archived = true); onBack() }
        }
    }

    if (nicknameDialog) AlertDialog(
        onDismissRequest = { nicknameDialog = false },
        containerColor = Color.White,
        tonalElevation = 0.dp,
        title = { Text("Nickname") },
        text = { OutlinedTextField(nicknameDraft, { nicknameDraft = it.take(60) }, singleLine = true, placeholder = { Text(contact?.user?.name ?: "Nickname") }) },
        confirmButton = {
            TextButton(onClick = {
                nickname = nicknameDraft.trim()
                preferences.edit().putString("nickname_${conversation.id}", nickname).apply()
                nicknameDialog = false
            }) { Text("Save") }
        },
        dismissButton = {
            TextButton(onClick = {
                nickname = ""
                preferences.edit().remove("nickname_${conversation.id}").apply()
                nicknameDialog = false
            }) { Text("Remove") }
        }
    )
    if (groupDialog) AlertDialog(
        onDismissRequest = { if (!groupBusy) groupDialog = false },
        containerColor = Color.White,
        tonalElevation = 0.dp,
        title = { Text("Create group chat") },
        text = { OutlinedTextField(groupName, { groupName = it.take(120) }, singleLine = true, label = { Text("Group name") }) },
        confirmButton = {
            TextButton(enabled = !groupBusy && contact != null, onClick = {
                val memberId = contact?.userId ?: return@TextButton
                groupBusy = true
                scope.launch {
                    runCatching { repository.createGroupConversation(groupName.ifBlank { "$name group" }, listOf(memberId)) }
                        .onSuccess {
                            Toast.makeText(context, "Group chat created", Toast.LENGTH_SHORT).show()
                            groupDialog = false
                        }
                        .onFailure { Toast.makeText(context, it.message ?: "Group could not be created", Toast.LENGTH_SHORT).show() }
                    groupBusy = false
                }
            }) { if (groupBusy) CircularProgressIndicator(Modifier.size(17.dp), strokeWidth = 2.dp) else Text("Create") }
        },
        dismissButton = { TextButton(enabled = !groupBusy, onClick = { groupDialog = false }) { Text("Cancel") } }
    )
    if (customizeDialog) AlertDialog(
        onDismissRequest = { customizeDialog = false },
        containerColor = Color.White,
        tonalElevation = 0.dp,
        title = { Text("Customize chat") },
        text = {
            Column {
                val themes = listOf(
                    "Tiwi" to Color(0xFF0866FF),
                    "Ocean" to Color(0xFF0077B6),
                    "Purple" to Color(0xFF7F56D9),
                    "Berry" to Color(0xFFD81B60),
                    "Rose" to Color(0xFFE91E63),
                    "Orange" to Color(0xFFF57C00),
                    "Gold" to Color(0xFFC58B00),
                    "Green" to Color(0xFF008A45),
                    "Teal" to Color(0xFF00897B),
                    "Indigo" to Color(0xFF3949AB),
                    "Graphite" to Color(0xFF344054),
                    "Black" to Color(0xFF111111)
                )
                val selectedArgb = messengerChatColor(preferences, conversation.id).toArgb()
                Text("Choose a message theme", color = Color(0xFF65676B), fontSize = 13.sp, modifier = Modifier.padding(bottom = 10.dp))
                themes.chunked(4).forEach { row ->
                    Row(Modifier.fillMaxWidth().padding(vertical = 4.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                        row.forEach { (name, color) ->
                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally,
                                modifier = Modifier.width(55.dp).clickable {
                                    preferences.edit().putLong("chat_color_${conversation.id}", color.toArgb().toLong()).commit()
                                    customizeDialog = false
                                }
                            ) {
                                Box(
                                    Modifier.size(39.dp).background(color, CircleShape).border(
                                        if (selectedArgb == color.toArgb()) 3.dp else 1.dp,
                                        if (selectedArgb == color.toArgb()) Color.Black else Color.White,
                                        CircleShape
                                    ),
                                    contentAlignment = Alignment.Center
                                ) {
                                    if (selectedArgb == color.toArgb()) Icon(Icons.Default.Check, "Selected", tint = Color.White, modifier = Modifier.size(20.dp))
                                }
                                Text(name, fontSize = 9.sp, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(top = 3.dp))
                            }
                        }
                        repeat(4 - row.size) { Spacer(Modifier.width(55.dp)) }
                    }
                }
            }
        },
        confirmButton = { TextButton(onClick = { customizeDialog = false }) { Text("Done") } }
    )
    if (permissionsDialog) AlertDialog(
        onDismissRequest = { permissionsDialog = false },
        containerColor = Color.White,
        tonalElevation = 0.dp,
        title = { Text("Message permissions") },
        text = {
            Column {
                Text("People you follow can message you directly. Other conversations arrive in Message requests.", color = Color(0xFF65676B))
                MessengerInfoRow(Icons.Outlined.MarkEmailUnread, "Use message requests", "Enabled", enabled = false) {}
                MessengerInfoRow(Icons.Outlined.Block, "Blocked accounts", "Manage blocking from each chat", enabled = false) {}
            }
        },
        confirmButton = { TextButton(onClick = { permissionsDialog = false }) { Text("Done") } }
    )
}

@Composable
private fun MessengerInfoShortcut(icon: ImageVector, label: String, onClick: () -> Unit) {
    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.width(76.dp).clickable(onClick = onClick)) {
        Box(Modifier.size(44.dp).background(Color(0xFFF0F2F5), CircleShape), contentAlignment = Alignment.Center) { Icon(icon, label, modifier = Modifier.size(22.dp)) }
        Text(label, fontSize = 11.sp, modifier = Modifier.padding(top = 5.dp))
    }
}

@Composable
private fun MessengerInfoRow(icon: ImageVector, title: String, subtitle: String? = null, destructive: Boolean = false, enabled: Boolean = true, onClick: () -> Unit) {
    Row(Modifier.fillMaxWidth().clickable(enabled = enabled, onClick = onClick).padding(horizontal = 16.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
        Icon(icon, null, tint = if (destructive) Color(0xFFD92D20) else Color.Black, modifier = Modifier.size(25.dp))
        Column(Modifier.weight(1f).padding(start = 15.dp)) {
            Text(title, color = if (destructive) Color(0xFFD92D20) else Color.Black, fontSize = 16.sp)
            if (!subtitle.isNullOrBlank()) Text(subtitle, color = Color(0xFF667085), fontSize = 11.sp)
        }
        if (enabled) Icon(Icons.Default.ChevronRight, null, tint = Color(0xFF98A2B3), modifier = Modifier.size(19.dp))
    }
}

@Composable
fun ProfileStatItem(label: String, value: String, modifier: Modifier = Modifier, onClick: (() -> Unit)? = null) {
    Column(
        modifier = modifier.clip(RoundedCornerShape(7.dp)).then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier).padding(horizontal = 2.dp, vertical = 3.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(text = value, fontSize = 14.sp, lineHeight = 15.sp, fontWeight = FontWeight.Black, maxLines = 1)
        Text(text = label, fontSize = 9.sp, lineHeight = 10.sp, color = Color(0xFF667085), maxLines = 1)
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
                        else if (!post.videoUrl.isNullOrBlank()) TiwiVideo(post.videoUrl, Modifier.fillMaxSize(), autoplay = true, fallbackUrl = post.media.firstOrNull()?.url, posterUrl = post.media.firstOrNull()?.thumbnailUrl)
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
    val scope = rememberTiwiCoroutineScope()
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
    val currentProfile by repository.profile.collectAsState()
    
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
                    DecoratedAvatar(currentUser?.avatar, R.drawable.img_tiwi_avatar_1, currentProfile?.avatarDecoration, Modifier.size(108.dp))
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
                        DecoratedAvatar(matchedUser?.user?.avatar, R.drawable.img_tiwi_avatar_1, matchedUser?.avatarDecoration, Modifier.size(148.dp))
                        
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
    val scope = rememberTiwiCoroutineScope()
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
                    leadingContent = { DecoratedAvatar(profile.user.avatar, R.drawable.img_tiwi_avatar_1, profile.avatarDecoration, Modifier.size(52.dp)) },
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
