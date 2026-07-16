package com.example

import android.Manifest
import android.app.Activity
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.RingtoneManager
import android.os.Build
import android.os.Bundle
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
import androidx.compose.foundation.Image
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
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
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.datasource.cache.CacheDataSource
import androidx.media3.datasource.cache.LeastRecentlyUsedCacheEvictor
import androidx.media3.datasource.cache.SimpleCache
import androidx.media3.database.StandaloneDatabaseProvider
import androidx.media3.exoplayer.DefaultLoadControl
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.ui.PlayerView
import com.example.social.SocialConversation
import com.example.social.SocialCallSession
import com.example.social.SocialComment
import com.example.social.SocialGroup
import com.example.social.SocialGroupMember
import com.example.social.SocialMedia
import com.example.social.SocialMessage
import com.example.social.SocialPost
import com.example.social.SocialProfile
import com.example.social.SocialProfileDecoration
import com.example.social.SocialRepository
import com.example.social.SocialUser
import com.example.social.SocialVerificationOptions
import com.example.social.SocialVerificationPackage
import com.example.social.PasswordResetChallenge
import com.example.social.WebRtcCallManager
import kotlinx.coroutines.delay
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import com.github.penfeizhou.animation.apng.APNGDrawable
import org.webrtc.EglBase
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
    val scope = rememberCoroutineScope()
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
    val scope = rememberCoroutineScope()
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
            "${user?.name.orEmpty()}, your Tiwi account is currently ${user?.status ?: "restricted"}. Contact support within 180 days to request a review. After that, your account and information may be permanently removed.",
            textAlign = TextAlign.Center,
            color = Color(0xFF475467),
            lineHeight = 21.sp
        )
        if (!user?.socialRestrictionReason.isNullOrBlank()) {
            Surface(
                modifier = Modifier.fillMaxWidth().padding(top = 14.dp),
                color = Color(0xFFFFF4ED),
                shape = RoundedCornerShape(10.dp),
                border = BorderStroke(1.dp, Color(0xFFFEC89A)),
                tonalElevation = 0.dp
            ) {
                Column(Modifier.padding(12.dp)) {
                    Text("Why this happened", fontWeight = FontWeight.Bold, color = Color(0xFF9A3412))
                    Text(user?.socialRestrictionReason.orEmpty(), color = Color(0xFF7C2D12), fontSize = 13.sp)
                }
            }
        }
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
    val time: String,
    val likes: Int,
    val comments: Int,
    val shares: Int,
    val views: Int = 0,
    val liked: Boolean = false,
    val verified: Boolean = false,
    val badgeType: String = "none",
    val following: Boolean = false,
    val visibility: String = "public",
    val commentPermission: String = "everyone",
    val pinned: Boolean = false,
    val saved: Boolean = false
)

data class Reel(
    val id: String,
    val authorId: String,
    val author: String,
    val authorAvatarUrl: String? = null,
    val authorDecoration: SocialProfileDecoration? = null,
    val thumbnail: Int,
    val thumbnailUrl: String? = null,
    val videoUrl: String? = null,
    val fallbackVideoUrl: String? = null,
    val media: List<SocialMedia> = emptyList(),
    val content: String = "",
    val likes: Int = 0,
    val comments: Int = 0,
    val views: Int = 0,
    val following: Boolean = false,
    val verified: Boolean = false,
    val badgeType: String = "none"
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

private fun formatCount(value: Int): String = when {
    value < 1_000 -> value.toString()
    value < 1_000_000 -> String.format(Locale.US, if (value < 10_000 && value % 1_000 != 0) "%.1fK" else "%.0fK", value / 1_000.0)
    else -> String.format(Locale.US, if (value < 10_000_000 && value % 1_000_000 != 0) "%.1fM" else "%.0fM", value / 1_000_000.0)
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
        time = relativePostTime(value.publishedAt),
        likes = value.reactionCount,
        comments = value.commentCount,
        shares = value.shareCount,
        views = value.viewCount,
        liked = value.viewerReaction == "like",
        verified = value.authorProfile?.verified == true,
        badgeType = value.authorProfile?.badgeType ?: if (value.authorProfile?.verified == true) "blue" else "none",
        following = value.authorProfile?.isFollowing == true,
        visibility = value.visibility,
        commentPermission = value.commentPermission,
        pinned = value.pinned,
        saved = value.saved
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
        thumbnail = R.drawable.img_tiwi_logo,
        thumbnailUrl = value.thumbnailUrl ?: media?.thumbnailUrl ?: media?.takeUnless { it.type == "video" }?.url,
        videoUrl = media?.hlsUrl?.takeIf { media.processingStatus == "ready" } ?: media?.url ?: value.hlsUrl,
        fallbackVideoUrl = media?.url,
        media = value.media,
        content = value.body,
        likes = value.reactionCount,
        comments = value.commentCount,
        views = value.viewCount,
        following = value.authorProfile?.isFollowing == true,
        verified = value.authorProfile?.verified == true,
        badgeType = value.authorProfile?.badgeType ?: if (value.authorProfile?.verified == true) "blue" else "none"
    )
}

@Composable
private fun TiwiAvatar(url: String?, fallback: Int, modifier: Modifier, contentScale: ContentScale = ContentScale.Crop) {
    if (!url.isNullOrBlank()) AsyncImage(model = url, contentDescription = null, modifier = modifier, contentScale = contentScale)
    else Image(painter = painterResource(fallback), contentDescription = null, modifier = modifier, contentScale = contentScale)
}

@Composable
private fun AnimatedProfileDecoration(url: String, modifier: Modifier = Modifier) {
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
            factory = { ImageView(it).apply { scaleType = ImageView.ScaleType.FIT_CENTER } },
            update = { imageView ->
                if (imageView.tag != file.absolutePath) {
                    (imageView.drawable as? APNGDrawable)?.stop()
                    imageView.setImageDrawable(APNGDrawable.fromFile(file.absolutePath))
                    imageView.tag = file.absolutePath
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
            Box(Modifier.fillMaxSize(.74f).clip(CircleShape).background(Color.White))
        }
        TiwiAvatar(
            url,
            fallback,
            Modifier.fillMaxSize(if (decorationUrl != null) .68f else 1f).clip(CircleShape),
            contentScale
        )
        decorationUrl?.let {
            ProfileDecorationImage(
                it,
                Modifier.matchParentSize().graphicsLayer(scaleX = 1.16f, scaleY = 1.16f),
                animated = animateDecoration
            )
        }
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
        LeastRecentlyUsedCacheEvictor(384L * 1024L * 1024L),
        StandaloneDatabaseProvider(context.applicationContext)
    ).also { cache = it }

    fun player(context: Context): ExoPlayer {
        val upstream = DefaultHttpDataSource.Factory().setAllowCrossProtocolRedirects(true).setConnectTimeoutMs(12_000).setReadTimeoutMs(30_000)
        val dataSource = CacheDataSource.Factory().setCache(cache(context)).setUpstreamDataSourceFactory(upstream).setFlags(CacheDataSource.FLAG_IGNORE_CACHE_ON_ERROR)
        val loadControl = DefaultLoadControl.Builder().setBufferDurationsMs(1_200, 20_000, 250, 500).setPrioritizeTimeOverSizeThresholds(true).build()
        return ExoPlayer.Builder(context).setMediaSourceFactory(DefaultMediaSourceFactory(dataSource)).setLoadControl(loadControl).build()
    }
}

private object TiwiPlaybackCoordinator {
    private val scores = mutableMapOf<String, Float>()
    var activeId by mutableStateOf<String?>(null)
        private set

    @Synchronized
    fun update(id: String, score: Float, eligible: Boolean) {
        if (eligible && score >= .55f) scores[id] = score else scores.remove(id)
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

@OptIn(UnstableApi::class)
@Composable
private fun TiwiVideo(url: String, modifier: Modifier, autoplay: Boolean = false, fallbackUrl: String? = null, posterUrl: String? = null) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    var activeUrl by remember(url, fallbackUrl) { mutableStateOf(url) }
    var visibleEnough by remember(url) { mutableStateOf(false) }
    var renderedFirstFrame by remember(activeUrl) { mutableStateOf(false) }
    var buffering by remember(activeUrl) { mutableStateOf(true) }
    var manuallyPaused by remember(activeUrl) { mutableStateOf(false) }
    var playing by remember(activeUrl) { mutableStateOf(false) }
    var showPauseOverlay by remember(activeUrl) { mutableStateOf(false) }
    val playerId = remember(activeUrl) { "$activeUrl#${System.nanoTime()}" }
    val isActivePlayer = TiwiPlaybackCoordinator.activeId == playerId
    val player = remember(activeUrl) {
        TiwiPlaybackCache.player(context).apply {
            setMediaItem(MediaItem.fromUri(activeUrl))
            prepare()
            repeatMode = if (autoplay) ExoPlayer.REPEAT_MODE_ONE else ExoPlayer.REPEAT_MODE_OFF
        }
    }
    LaunchedEffect(player, autoplay, visibleEnough, manuallyPaused, isActivePlayer) {
        player.repeatMode = if (autoplay) ExoPlayer.REPEAT_MODE_ONE else ExoPlayer.REPEAT_MODE_OFF
        if (autoplay && visibleEnough && isActivePlayer && !manuallyPaused) player.play() else if (autoplay || isActivePlayer) player.pause()
    }
    LaunchedEffect(playerId, autoplay) { if (!autoplay) TiwiPlaybackCoordinator.remove(playerId) }
    LaunchedEffect(showPauseOverlay) {
        if (showPauseOverlay) { delay(650); showPauseOverlay = false }
    }
    DisposableEffect(player, lifecycleOwner, activeUrl, fallbackUrl) {
        val listener = object : Player.Listener {
            override fun onPlaybackStateChanged(playbackState: Int) {
                buffering = playbackState == Player.STATE_BUFFERING
            }

            override fun onIsPlayingChanged(isPlaying: Boolean) { playing = isPlaying }

            override fun onRenderedFirstFrame() {
                renderedFirstFrame = true
                buffering = false
            }

            override fun onPlayerError(error: PlaybackException) {
                val fallback = fallbackUrl?.takeIf { it.isNotBlank() && it != activeUrl }
                if (fallback != null) activeUrl = fallback else buffering = false
            }
        }
        val observer = LifecycleEventObserver { _, event ->
            when (event) {
                Lifecycle.Event.ON_PAUSE, Lifecycle.Event.ON_STOP -> player.pause()
                Lifecycle.Event.ON_RESUME -> if (autoplay && visibleEnough && isActivePlayer && !manuallyPaused) player.play()
                else -> Unit
            }
        }
        player.addListener(listener)
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            player.removeListener(listener)
            lifecycleOwner.lifecycle.removeObserver(observer)
            TiwiPlaybackCoordinator.remove(playerId)
            player.release()
        }
    }
    Box(
        modifier.background(Color.Black).onGloballyPositioned { coordinates ->
            val bounds = coordinates.boundsInWindow()
            val screenHeight = context.resources.displayMetrics.heightPixels.toFloat()
            val visibleHeight = (minOf(bounds.bottom, screenHeight) - maxOf(bounds.top, 0f)).coerceAtLeast(0f)
            val ratio = if (bounds.height > 0f) visibleHeight / bounds.height else 0f
            val itemCenter = (bounds.top + bounds.bottom) / 2f
            val centerDistance = kotlin.math.abs(itemCenter - screenHeight / 2f) / screenHeight
            visibleEnough = ratio >= .55f
            TiwiPlaybackCoordinator.update(playerId, ratio - centerDistance * .15f, autoplay)
        }
    ) {
        AndroidView(
            factory = { PlayerView(it).apply { this.player = player; useController = false } },
            update = { it.player = player },
            modifier = Modifier.fillMaxSize()
        )
        if (!renderedFirstFrame && !posterUrl.isNullOrBlank()) {
            AsyncImage(model = posterUrl, contentDescription = "Video thumbnail", modifier = Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
        }
        Box(Modifier.fillMaxSize().clickable {
            if (playing) { manuallyPaused = true; player.pause() } else { manuallyPaused = false; TiwiPlaybackCoordinator.activate(playerId); player.play() }
            showPauseOverlay = true
        })
        if (buffering && visibleEnough) CircularProgressIndicator(Modifier.align(Alignment.Center).size(30.dp), color = Color.White, strokeWidth = 2.5.dp)
        if ((!playing && !buffering && visibleEnough) || showPauseOverlay) {
            Box(Modifier.align(Alignment.Center).size(58.dp).background(Color.Black.copy(alpha = .48f), CircleShape), contentAlignment = Alignment.Center) {
                Icon(if (playing) Icons.Default.Pause else Icons.Default.PlayArrow, if (playing) "Pause" else "Play", tint = Color.White, modifier = Modifier.size(34.dp))
            }
        }
    }
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
    var selectedEditPostId by remember { mutableStateOf<String?>(null) }
    var callRequest by remember { mutableStateOf<TiwiCallRequest?>(null) }
    
    val apiPosts by repository.feed.collectAsState()
    val currentUser by repository.currentUser.collectAsState()
    val currentProfile by repository.profile.collectAsState()
    val incomingCalls by repository.incomingCalls.collectAsState()
    val posts = remember(apiPosts) { apiPosts.map(::toUiPost) }
    val reels = remember(apiPosts) { apiPosts.filter { it.type == "reel" || it.type == "video" }.map(::toUiReel) }
    val scope = rememberCoroutineScope()
    val appContext = LocalContext.current
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
    val hasOverlay = showProfile || showCreatePost || showMessages || showConnect || selectedProfileUserId != null || selectedChat != null || selectedPostId != null || selectedEditPostId != null
    val darkChrome = selectedTab == 2 && !hasOverlay

    if (showPermissionIntro) AlertDialog(
        onDismissRequest = {}, containerColor = Color.White, tonalElevation = 0.dp,
        icon = { Icon(Icons.Default.Security, null, tint = TiwiBlue) },
        title = { Text("Enable Tiwi features") },
        text = { Text("Tiwi uses notifications for activity, photos and videos for posts, camera and microphone for calls, and location only when you choose to add it. You can change these permissions anytime in Android settings.") },
        confirmButton = { TextButton(onClick = { showPermissionIntro = false; permissionPreferences.edit().putBoolean("requested_v1", true).apply(); if (firstRunPermissions.isNotEmpty()) firstRunPermissionLauncher.launch(firstRunPermissions) }) { Text("Continue", fontWeight = FontWeight.Bold) } },
        dismissButton = { TextButton(onClick = { showPermissionIntro = false; permissionPreferences.edit().putBoolean("requested_v1", true).apply() }) { Text("Not now") } }
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
            selectedEditPostId != null -> selectedEditPostId = null
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

    LaunchedEffect(Unit) {
        while (true) {
            delay(15000)
            runCatching { repository.validateSession() }
        }
    }

    LaunchedEffect(initialDeepLink) {
        val link = initialDeepLink ?: return@LaunchedEffect
        val uri = runCatching { android.net.Uri.parse(link) }.getOrNull()
        val segments = uri?.pathSegments.orEmpty()
        when {
            segments.size >= 3 && segments[0] == "social" && segments[1] == "post" -> selectedPostId = segments[2]
            segments.size >= 3 && segments[0] == "social" && segments[1] == "profile" -> selectedProfileUserId = segments[2]
        }
        onDeepLinkConsumed()
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

    sharedPost?.let { post ->
        TiwiShareSheet(repository, post, onDismiss = { sharedPost = null })
    }

    Scaffold(
        topBar = { 
            if (selectedTab != 2 && selectedTab != 4 && !showProfile && !showCreatePost && !showMessages && !showConnect && selectedProfileUserId == null && selectedChat == null && selectedPostId == null && selectedEditPostId == null) {
                TiwiTopBar(
                    avatarUrl = currentUser?.avatar,
                    avatarDecoration = currentProfile?.avatarDecoration,
                    onProfileClick = { showProfile = true },
                    onCreateClick = { showCreatePost = true },
                    onMessagesClick = { showMessages = true },
                    onConnectClick = { showConnect = true }
                ) 
            }
        },
        bottomBar = { 
            if (!showProfile && !showCreatePost && !showMessages && !showConnect && selectedProfileUserId == null && selectedChat == null && selectedPostId == null && selectedEditPostId == null) {
                TiwiBottomBar(selectedTab, dark = selectedTab == 2, avatarUrl = currentUser?.avatar, avatarDecoration = currentProfile?.avatarDecoration) {
                    selectedTab = it
                } 
            }
        },
        containerColor = if (darkChrome) Color.Black else MaterialTheme.colorScheme.background,
        contentWindowInsets = WindowInsets(0, 0, 0, 0)
    ) { innerPadding ->
        Box(modifier = Modifier.padding(innerPadding)) {
            when {
                selectedEditPostId != null -> posts.firstOrNull { it.id == selectedEditPostId }?.let { editing -> EditPostPage(repository, editing, onBack = { selectedEditPostId = null }) } ?: run { selectedEditPostId = null }
                selectedPostId != null -> PostDetailScreen(repository, selectedPostId!!, onBack = { selectedPostId = null }, onProfileClick = { selectedProfileUserId = it; selectedPostId = null }, onShare = { sharedPost = it }, onEdit = { selectedEditPostId = it }, onLinkedPost = { selectedPostId = it })
                selectedProfileUserId != null -> ProfileScreen(
                    repository, posts.filter { it.authorId == selectedProfileUserId }, reels.filter { it.authorId == selectedProfileUserId }, userId = selectedProfileUserId,
                    onBack = { selectedProfileUserId = null }, onPostClick = { selectedPostId = it }, onShare = { sharedPost = it }, onMessage = { id -> scope.launch { selectedChat = repository.createConversation(id); selectedProfileUserId = null } }, onEditPost = { selectedEditPostId = it }
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
                showProfile -> ProfileScreen(repository, posts.filter { it.authorId == repository.currentUserId() }, reels.filter { it.authorId == repository.currentUserId() }, onBack = { showProfile = false }, onPostClick = { selectedPostId = it }, onShare = { sharedPost = it }, onEditPost = { selectedEditPostId = it })
                else -> {
                    when (selectedTab) {
                        0 -> HomeFeed(reels, posts, repository, onShareClick = { sharedPost = it }, onAuthorClick = { selectedProfileUserId = it }, onPostClick = { selectedPostId = it }, onEditPost = { selectedEditPostId = it })
                        1 -> SearchScreen(repository, onProfileClick = { selectedProfileUserId = it }, onPostClick = { selectedPostId = it })
                        2 -> ReelsScreen(reels, repository, onOpen = { selectedPostId = it }, onShare = { reel -> sharedPost = posts.firstOrNull { it.id == reel.id } }, onAuthor = { selectedProfileUserId = it })
                        3 -> NotificationsScreen(repository)
                        4 -> MenuScreen(repository, currentUser?.name.orEmpty(), currentUser?.avatar, onProfileClick = { showProfile = true }, onLogout = { repository.logout(); onLogout() })
                    }
                }
            }
        }
    }
}

@Composable
fun TiwiTopBar(avatarUrl: String?, avatarDecoration: SocialProfileDecoration? = null, onProfileClick: () -> Unit, onCreateClick: () -> Unit, onMessagesClick: () -> Unit, onConnectClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .statusBarsPadding()
            .heightIn(min = 50.dp)
            .padding(horizontal = 12.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            text = "Tiwi",
            style = MaterialTheme.typography.headlineSmall.copy(
                fontWeight = FontWeight.ExtraBold,
                letterSpacing = (-1).sp,
                brush = Brush.linearGradient(listOf(TiwiBlue, TiwiPurple))
            )
        )
        
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onConnectClick, modifier = Modifier.size(40.dp)) {
                Icon(Icons.Outlined.PersonSearch, contentDescription = "Find people", tint = TiwiBlue, modifier = Modifier.size(23.dp))
            }
            IconButton(onClick = onCreateClick, modifier = Modifier.size(40.dp)) {
                Icon(Icons.Outlined.AddBox, contentDescription = "Create", tint = MaterialTheme.colorScheme.onBackground, modifier = Modifier.size(23.dp))
            }
            IconButton(onClick = onMessagesClick, modifier = Modifier.size(40.dp)) {
                Icon(Icons.AutoMirrored.Outlined.Send, contentDescription = "Messages", tint = MaterialTheme.colorScheme.onBackground, modifier = Modifier.size(23.dp))
            }
            Spacer(modifier = Modifier.width(2.dp))
            DecoratedAvatar(
                url = avatarUrl,
                fallback = R.drawable.img_tiwi_avatar_1,
                decoration = avatarDecoration,
                modifier = Modifier.size(38.dp).clickable { onProfileClick() },
                contentScale = ContentScale.Crop
            )
        }
    }
}

@Composable
@OptIn(ExperimentalMaterial3Api::class)
fun HomeFeed(
    reels: List<Reel>,
    posts: List<Post>,
    repository: SocialRepository,
    onShareClick: (Post) -> Unit,
    onAuthorClick: (String) -> Unit,
    onPostClick: (String) -> Unit,
    onEditPost: (String) -> Unit = {}
) {
    val scope = rememberCoroutineScope()
    val syncing by repository.syncing.collectAsState()
    var suggestions by remember { mutableStateOf<List<SocialProfile>>(emptyList()) }
    LaunchedEffect(Unit) { suggestions = runCatching { repository.searchProfiles() }.getOrDefault(emptyList()).take(12) }
    PullToRefreshBox(
        isRefreshing = syncing,
        onRefresh = { scope.launch { repository.refreshAll(force = true) } },
        modifier = Modifier.fillMaxSize()
    ) {
        if (posts.isEmpty() && syncing) FeedSkeleton()
        else LazyColumn(modifier = Modifier.fillMaxSize()) {
            item { ReelsSection(reels) }
            posts.forEachIndexed { index, post ->
                item(key = post.id) {
                    PostCard(post, repository, { onShareClick(post) }, { onAuthorClick(post.authorId) }, { onPostClick(post.id) }, onEditRequest = { onEditPost(it.id) }, onOpenLinkedPost = onPostClick)
                }
                if (suggestions.isNotEmpty() && index % 2 == 1) item(key = "suggest-$index") {
                    SuggestedFriendsSection(suggestions, repository, onAuthorClick) { updated ->
                        suggestions = suggestions.map { if (it.userId == updated.userId) updated else it }
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
                    DecoratedAvatar(profile.user.avatar, R.drawable.img_tiwi_avatar_1, profile.avatarDecoration, Modifier.size(78.dp))
                    Spacer(Modifier.height(6.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(profile.user.name, maxLines = 1, overflow = TextOverflow.Ellipsis, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        if (profile.verified) VerifiedBadge(profile.badgeType, 14.dp)
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
fun PostCard(post: Post, repository: SocialRepository, onShareClick: () -> Unit = {}, onAuthorClick: () -> Unit = {}, onOpen: () -> Unit = {}, onEditRequest: ((Post) -> Unit)? = null, onOpenLinkedPost: ((String) -> Unit)? = null) {
    var isExpanded by remember { mutableStateOf(false) }
    var showMenu by remember { mutableStateOf(false) }
    var showEdit by remember { mutableStateOf(false) }
    var showDelete by remember { mutableStateOf(false) }
    var showReport by remember { mutableStateOf(false) }
    var showVerified by remember { mutableStateOf(false) }
    var showPrivacy by remember { mutableStateOf(false) }
    var showCommentPolicy by remember { mutableStateOf(false) }
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
            DecoratedAvatar(
                url = post.authorAvatarUrl,
                fallback = post.authorAvatar,
                decoration = post.authorDecoration,
                modifier = Modifier.size(42.dp).clickable { onAuthorClick() },
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
                        VerifiedBadge(post.badgeType, 16.dp, onClick = { showVerified = true })
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
            IconButton(onClick = { showMenu = true }, modifier = Modifier.size(36.dp)) {
                Icon(Icons.Default.MoreVert, contentDescription = "More")
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

        PostMediaGrid(post.media, onOpen) { linkedId -> onOpenLinkedPost?.invoke(linkedId) ?: onOpen() }

        if (post.likes + post.comments + post.shares + post.views > 0) {
            Row(Modifier.fillMaxWidth().padding(horizontal = 10.dp, vertical = 5.dp), verticalAlignment = Alignment.CenterVertically) {
                if (post.likes > 0) {
                    Box(Modifier.size(18.dp).background(TiwiBlue, CircleShape), contentAlignment = Alignment.Center) {
                        Icon(Icons.Default.ThumbUp, null, tint = Color.White, modifier = Modifier.size(11.dp))
                    }
                    Spacer(Modifier.width(4.dp))
                    Text(formatCount(post.likes), color = Color.Gray, fontSize = 12.sp)
                }
                Spacer(Modifier.weight(1f))
                Text(
                    listOfNotNull(
                        post.comments.takeIf { it > 0 }?.let { "${formatCount(it)} comments" },
                        post.shares.takeIf { it > 0 }?.let { "${formatCount(it)} reposts" },
                        post.views.takeIf { it > 0 }?.let { "${formatCount(it)} views" }
                    ).joinToString(" · "),
                    color = Color.Gray,
                    fontSize = 12.sp
                )
            }
        }

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
            IconButton(onClick = { scope.launch { runCatching { repository.savePost(post.id, !post.saved) }.onSuccess { Toast.makeText(context, if (post.saved) "Removed from Saved" else "Saved", Toast.LENGTH_SHORT).show() } } }, modifier = Modifier.size(36.dp)) {
                Icon(if (post.saved) Icons.Filled.Bookmark else Icons.Outlined.BookmarkBorder, "Save", Modifier.size(20.dp), tint = if (post.saved) TiwiBlue else Color.Gray)
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
    ModalBottomSheet(onDismissRequest = onDismiss, containerColor = Color.White, contentColor = Color.Black, tonalElevation = 0.dp) {
        Column(Modifier.fillMaxWidth().padding(horizontal = 12.dp)) {
            if (more && !isOwn) {
                Row(Modifier.fillMaxWidth().height(48.dp), verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = { more = false }) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") }
                    Text("More options", fontWeight = FontWeight.Bold, fontSize = 19.sp)
                }
                Text("Choose how this person appears in your Feed.", color = Color.Gray, fontSize = 12.sp, modifier = Modifier.padding(horizontal = 9.dp, vertical = 3.dp))
                PostActionRow(Icons.Outlined.StarOutline, "Add ${post.author} to Favorites", "See this person's posts higher in Feed", onFavorite)
                PostActionRow(Icons.Outlined.Snooze, "Snooze ${post.author} for 30 days", "Temporarily hide this person's posts", onSnooze)
                PostActionRow(Icons.Outlined.ContentCopy, "Copy link", "Copy the post deep link", onCopy)
                Spacer(Modifier.navigationBarsPadding().height(10.dp))
                return@ModalBottomSheet
            }
            Text(if (isOwn) "Manage your post" else "Post options", fontWeight = FontWeight.Bold, fontSize = 19.sp, modifier = Modifier.padding(horizontal = 8.dp, vertical = 8.dp))
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
            Spacer(Modifier.navigationBarsPadding().height(10.dp))
        }
    }
}

@Composable
private fun PostActionRow(icon: ImageVector, title: String, subtitle: String, onClick: () -> Unit, tint: Color = Color(0xFF344054)) {
    Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp)).clickable(onClick = onClick).padding(horizontal = 9.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(42.dp).background(Color(0xFFF0F2F5), CircleShape), contentAlignment = Alignment.Center) { Icon(icon, null, tint = tint, modifier = Modifier.size(22.dp)) }
        Column(Modifier.weight(1f).padding(start = 11.dp)) { Text(title, fontWeight = FontWeight.SemiBold, color = tint); Text(subtitle, fontSize = 12.sp, color = Color.Gray) }
        Icon(Icons.Default.ChevronRight, null, tint = Color.Gray, modifier = Modifier.size(19.dp))
    }
}

@Composable
private fun ChoiceDialog(title: String, options: List<Pair<String, String>>, selected: String, onDismiss: () -> Unit, onSelect: (String) -> Unit) {
    AlertDialog(onDismissRequest = onDismiss, containerColor = Color.White, tonalElevation = 0.dp, title = { Text(title) }, text = {
        Column { options.forEach { option -> Row(Modifier.fillMaxWidth().clickable { onSelect(option.first) }.padding(vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) { RadioButton(selected == option.first, onClick = { onSelect(option.first) }); Text(option.second, Modifier.padding(start = 8.dp)) } } }
    }, confirmButton = {}, dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } })
}

@Composable
private fun PostMediaGrid(media: List<SocialMedia>, onOpen: () -> Unit, onOpenLinkedPost: (String) -> Unit) {
    if (media.isEmpty()) return
    if (media.size == 1 && media.first().type == "shared_post") {
        val shared = media.first()
        SharedPostCard(shared) { shared.sharedPostId?.let(onOpenLinkedPost) ?: onOpen() }
        return
    }
    val visible = media.take(4)
    val cell: @Composable (SocialMedia, Modifier, Int) -> Unit = { item, modifier, index ->
        Box(modifier.clickable(onClick = onOpen).background(Color.Black)) {
            if (item.type == "video") TiwiVideo(item.hlsUrl?.takeIf { item.processingStatus == "ready" } ?: item.url, Modifier.fillMaxSize(), autoplay = media.size == 1, fallbackUrl = item.url, posterUrl = item.thumbnailUrl)
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

@Composable
private fun SharedPostCard(media: SocialMedia, onOpen: () -> Unit) {
    Column(
        Modifier.fillMaxWidth().padding(horizontal = 10.dp, vertical = 4.dp)
            .border(1.dp, Color(0xFFE2E2E2), RoundedCornerShape(10.dp))
            .clip(RoundedCornerShape(10.dp)).clickable(onClick = onOpen).background(Color.White)
    ) {
        Row(Modifier.fillMaxWidth().padding(10.dp), verticalAlignment = Alignment.CenterVertically) {
            TiwiAvatar(media.sharedAvatar, R.drawable.img_tiwi_avatar_1, Modifier.size(38.dp).clip(CircleShape))
            Spacer(Modifier.width(8.dp))
            Column(Modifier.weight(1f)) {
                Text(media.sharedAuthor ?: "Tiwlo user", fontWeight = FontWeight.Bold, color = Color.Black, maxLines = 1)
                Text("Original post · ${relativePostTime(media.sharedPublishedAt)}", fontSize = 12.sp, color = Color.Gray)
            }
        }
        if (!media.sharedBody.isNullOrBlank()) {
            Text(media.sharedBody, modifier = Modifier.padding(horizontal = 10.dp, vertical = 2.dp), color = Color.Black)
        }
        if (media.url.isNotBlank()) {
            Box(Modifier.fillMaxWidth().heightIn(min = 180.dp, max = 360.dp).background(Color.Black), contentAlignment = Alignment.Center) {
                AsyncImage(model = media.url, contentDescription = "Shared post media", modifier = Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                if (media.sharedMediaType == "video") {
                    Icon(Icons.Default.PlayArrow, contentDescription = "Play shared video", tint = Color.White, modifier = Modifier.size(54.dp).background(Color.Black.copy(alpha = .35f), CircleShape).padding(10.dp))
                }
            }
        }
        Text(
            "${media.sharedReactions} reactions  ·  ${media.sharedComments} comments  ·  ${media.sharedViews} views",
            modifier = Modifier.padding(10.dp), fontSize = 12.sp, color = Color.Gray
        )
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
private fun PostDetailScreen(repository: SocialRepository, postId: String, onBack: () -> Unit, onProfileClick: (String) -> Unit, onShare: (Post) -> Unit, onEdit: (String) -> Unit = {}, onLinkedPost: (String) -> Unit = {}) {
    val feed by repository.feed.collectAsState()
    val commentsByPost by repository.comments.collectAsState()
    val post = feed.firstOrNull { it.id == postId }?.let(::toUiPost)
    val comments = commentsByPost[postId].orEmpty()
    val expandedReplies = remember(postId) { mutableStateMapOf<String, Boolean>() }
    var text by remember { mutableStateOf("") }
    var replyTo by remember { mutableStateOf<SocialComment?>(null) }
    var sending by remember { mutableStateOf(false) }
    var showMediaViewer by remember(postId) { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current

    LaunchedEffect(postId) {
        runCatching { repository.viewPost(postId) }
        runCatching { repository.refreshComments(postId) }
    }
    if (showMediaViewer && post != null && post.media.isNotEmpty()) {
        BackHandler { showMediaViewer = false }
        PostMediaViewerPage(post, repository, onBack = { showMediaViewer = false }, onProfileClick = onProfileClick)
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
            post?.let { item { PostCard(it, repository, onShareClick = { onShare(it) }, onAuthorClick = { onProfileClick(it.authorId) }, onOpen = { showMediaViewer = true }, onEditRequest = { value -> onEdit(value.id) }, onOpenLinkedPost = onLinkedPost) } }
            item { Text("Comments", modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp), fontWeight = FontWeight.Bold) }
            if (comments.isEmpty()) item { Text("Be the first to comment", color = Color.Gray, modifier = Modifier.padding(24.dp).fillMaxWidth(), textAlign = TextAlign.Center) }
            val byId = comments.associateBy { it.id }
            val roots = comments.filter { it.replyToId == null }
            roots.forEach { root ->
                item(key = root.id) {
                    CommentRow(
                        comment = root, isOwn = root.authorId == repository.currentUserId(), onProfile = { onProfileClick(root.authorId) },
                        onReply = { replyTo = root; text = "@${root.author.name} " },
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
                        onReply = { replyTo = comment; text = "@${comment.author.name} " },
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
private fun PostMediaViewerPage(post: Post, repository: SocialRepository, onBack: () -> Unit, onProfileClick: (String) -> Unit) {
    val visualMedia = remember(post.media) { post.media.filter { it.type == "image" || it.type == "video" } }
    val pager = rememberPagerState(pageCount = { visualMedia.size.coerceAtLeast(1) })
    val scope = rememberCoroutineScope()
    Column(Modifier.fillMaxSize().background(Color.Black).statusBarsPadding().navigationBarsPadding()) {
        Row(Modifier.fillMaxWidth().height(50.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back", tint = Color.White) }
            Row(Modifier.weight(1f).clickable { onProfileClick(post.authorId) }, verticalAlignment = Alignment.CenterVertically) {
                DecoratedAvatar(post.authorAvatarUrl, post.authorAvatar, post.authorDecoration, Modifier.size(38.dp))
                Text(post.author, color = Color.White, fontWeight = FontWeight.Bold, modifier = Modifier.padding(start = 8.dp))
            }
            if (visualMedia.size > 1) Text("${pager.currentPage + 1}/${visualMedia.size}", color = Color.White, modifier = Modifier.padding(end = 14.dp), fontWeight = FontWeight.Bold)
        }
        HorizontalPager(state = pager, modifier = Modifier.weight(1f).fillMaxWidth(), beyondViewportPageCount = 1) { page ->
            val media = visualMedia.getOrNull(page)
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                when (media?.type) {
                    "video" -> TiwiVideo(media.hlsUrl?.takeIf { media.processingStatus == "ready" } ?: media.url, Modifier.fillMaxSize(), autoplay = pager.currentPage == page, fallbackUrl = media.url, posterUrl = media.thumbnailUrl)
                    "image" -> AsyncImage(media.url, "Post media ${page + 1}", Modifier.fillMaxSize(), contentScale = ContentScale.Fit)
                    else -> Text("Media unavailable", color = Color.White)
                }
            }
        }
        Row(Modifier.fillMaxWidth().height(54.dp).padding(horizontal = 12.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = { scope.launch { runCatching { repository.reactToPost(post.id) } } }) { Icon(if (post.liked) Icons.Filled.Favorite else Icons.Outlined.FavoriteBorder, "Like", tint = if (post.liked) Color.Red else Color.White) }
            Text(formatCount(post.likes), color = Color.White)
            Spacer(Modifier.width(18.dp))
            Icon(Icons.Outlined.ChatBubbleOutline, "Comments", tint = Color.White)
            Text(formatCount(post.comments), color = Color.White, modifier = Modifier.padding(start = 6.dp))
            Spacer(Modifier.weight(1f))
            Text(relativePostTime(post.time), color = Color.LightGray, fontSize = 12.sp)
        }
    }
}

@Composable
private fun EditPostPage(repository: SocialRepository, post: Post, onBack: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
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
                            else if (item.type == "shared_post") SharedPostCard(item, {})
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
        Modifier.fillMaxWidth().padding(start = if (comment.replyToId == null) 10.dp else 46.dp, end = 6.dp, top = 6.dp, bottom = 6.dp),
        verticalAlignment = Alignment.Top
    ) {
        DecoratedAvatar(comment.author.avatar, R.drawable.img_tiwi_avatar_1, comment.authorProfile?.avatarDecoration, Modifier.size(38.dp).clickable(onClick = onProfile))
        Spacer(Modifier.width(8.dp))
        Column(Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(comment.author.name, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                if (comment.authorProfile?.verified == true) VerifiedBadge(comment.authorProfile?.badgeType, 14.dp)
            }
            Text(comment.body, color = MaterialTheme.colorScheme.onBackground)
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(relativePostTime(comment.createdAt), fontSize = 11.sp, color = Color.Gray, modifier = Modifier.padding(end = 10.dp))
                Text("Reply", modifier = Modifier.clickable(onClick = onReply).padding(vertical = 5.dp), fontWeight = FontWeight.Bold, fontSize = 12.sp, color = Color.Gray)
                if (comment.reactionCount > 0) Text("  ${formatCount(comment.reactionCount)} likes", fontSize = 11.sp, color = Color.Gray)
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
fun TiwiShareSheet(repository: SocialRepository, post: Post, onDismiss: () -> Unit) {
    val conversations by repository.conversations.collectAsState()
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val deepLink = "https://tiwlo.com/social/post/${post.id}"
    val contacts = remember(conversations) {
        conversations.filter { it.requestStatus == "accepted" }.distinctBy { it.id }.take(8)
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
                                runCatching { repository.sendMessage(chat.id, deepLink) }
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

private fun shareDeepLink(context: Context, title: String, text: String, url: String) {
    val send = Intent(Intent.ACTION_SEND).apply {
        type = "text/plain"
        putExtra(Intent.EXTRA_SUBJECT, title)
        putExtra(Intent.EXTRA_TEXT, listOf(text.trim(), url).filter { it.isNotBlank() }.joinToString("\n\n"))
    }
    context.startActivity(Intent.createChooser(send, "Share with"))
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
                                repository.uploadMedia(context.contentResolver, uri, "post") { fileProgress ->
                                    val total = selectedUris.size.coerceAtLeast(1)
                                    uploadProgress = 5 + (((index * 80) + (fileProgress * 80 / 100)) / total)
                                    showPostUploadNotification(context, uploadProgress, "Uploading ${index + 1} of ${selectedUris.size}")
                                }
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
fun TiwiBottomBar(selectedTab: Int, dark: Boolean = false, avatarUrl: String? = null, avatarDecoration: SocialProfileDecoration? = null, onTabSelected: (Int) -> Unit) {
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
                    if (index == 4) {
                        DecoratedAvatar(
                            avatarUrl,
                            R.drawable.img_tiwi_avatar_1,
                            avatarDecoration,
                            Modifier.size(34.dp).graphicsLayer(scaleX = iconScale, scaleY = iconScale)
                        )
                    } else Icon(
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
fun ReelsScreen(reels: List<Reel>, repository: SocialRepository, onOpen: (String) -> Unit = {}, onShare: (Reel) -> Unit = {}, onAuthor: (String) -> Unit = {}) {
    if (reels.isEmpty()) {
        Box(Modifier.fillMaxSize().background(Color.Black), contentAlignment = Alignment.Center) {
            Text("No reels yet", color = Color.White)
        }
        return
    }
    val feed by repository.feed.collectAsState()
    val context = LocalContext.current
    var actionPost by remember { mutableStateOf<Post?>(null) }
    var editPost by remember { mutableStateOf<Post?>(null) }
    var editText by remember { mutableStateOf("") }
    var deletePost by remember { mutableStateOf<Post?>(null) }
    var privacyPost by remember { mutableStateOf<Post?>(null) }
    var commentsPost by remember { mutableStateOf<Post?>(null) }
    val pagerState = rememberPagerState(pageCount = { reels.size })
    val scope = rememberCoroutineScope()
    val currentReelId = reels.getOrNull(pagerState.currentPage)?.id
    LaunchedEffect(pagerState.currentPage, currentReelId) {
        currentReelId?.let { id -> runCatching { repository.viewPost(id) } }
    }
    VerticalPager(state = pagerState, beyondViewportPageCount = 1, modifier = Modifier.fillMaxSize().background(Color.Black)) { page ->
        val reel = reels[page]
        val reelMedia = reel.media.filter { it.type == "video" || it.type == "image" }
        val mediaPager = rememberPagerState(pageCount = { reelMedia.size.coerceAtLeast(1) })
        Box(modifier = Modifier.fillMaxSize().background(Color.Black)) {
            HorizontalPager(state = mediaPager, modifier = Modifier.fillMaxSize(), beyondViewportPageCount = 1) { mediaPage ->
                val item = reelMedia.getOrNull(mediaPage)
                when {
                    item?.type == "video" -> TiwiVideo(item.hlsUrl?.takeIf { item.processingStatus == "ready" } ?: item.url, Modifier.fillMaxSize(), autoplay = pagerState.currentPage == page && mediaPager.currentPage == mediaPage, fallbackUrl = item.url, posterUrl = item.thumbnailUrl)
                    item?.type == "image" -> AsyncImage(model = item.url, contentDescription = null, modifier = Modifier.fillMaxSize(), contentScale = ContentScale.Fit)
                    !reel.videoUrl.isNullOrBlank() -> TiwiVideo(reel.videoUrl!!, Modifier.fillMaxSize(), autoplay = pagerState.currentPage == page, fallbackUrl = reel.fallbackVideoUrl, posterUrl = reel.thumbnailUrl)
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
            Text("Reels", modifier = Modifier.align(Alignment.TopStart).statusBarsPadding().padding(horizontal = 14.dp, vertical = 10.dp), color = Color.White, fontWeight = FontWeight.Bold, fontSize = 20.sp)
            if (reelMedia.size > 1) Surface(
                modifier = Modifier.align(Alignment.TopCenter).statusBarsPadding().padding(top = 12.dp),
                color = Color.Black.copy(alpha = .55f), shape = RoundedCornerShape(14.dp), tonalElevation = 0.dp
            ) { Text("${mediaPager.currentPage + 1}/${reelMedia.size}", color = Color.White, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)) }
            IconButton(onClick = { feed.firstOrNull { it.id == reel.id }?.let { actionPost = toUiPost(it) } }, modifier = Modifier.align(Alignment.TopEnd).statusBarsPadding().padding(end = 5.dp, top = 3.dp)) { Icon(Icons.Default.MoreVert, "Reel options", tint = Color.White) }
            Column(
                modifier = Modifier.align(Alignment.BottomEnd).padding(end = 10.dp, bottom = 14.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                IconButton(onClick = { scope.launch { runCatching { repository.reactToPost(reel.id) } } }) { Icon(Icons.Default.Favorite, "Like", tint = Color.White, modifier = Modifier.size(30.dp)) }
                Text(formatCount(reel.likes), color = Color.White, style = MaterialTheme.typography.labelMedium)
                Spacer(modifier = Modifier.height(12.dp))
                IconButton(onClick = { onOpen(reel.id) }) { Icon(Icons.Default.Comment, "Comment", tint = Color.White, modifier = Modifier.size(30.dp)) }
                Text(formatCount(reel.comments), color = Color.White, style = MaterialTheme.typography.labelMedium)
                Spacer(modifier = Modifier.height(12.dp))
                Icon(Icons.Default.Visibility, "Views", tint = Color.White, modifier = Modifier.size(27.dp))
                Text(formatCount(reel.views), color = Color.White, style = MaterialTheme.typography.labelMedium)
                Spacer(modifier = Modifier.height(12.dp))
                IconButton(onClick = { onShare(reel) }) { Icon(Icons.Default.Share, "Share", tint = Color.White, modifier = Modifier.size(30.dp)) }
                Text("Share", color = Color.White, style = MaterialTheme.typography.labelMedium)
            }

            Column(modifier = Modifier.align(Alignment.BottomStart).padding(start = 12.dp, end = 62.dp, bottom = 14.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.clickable { onAuthor(reel.authorId) }) {
                        DecoratedAvatar(reel.authorAvatarUrl, R.drawable.img_tiwi_avatar_1, reel.authorDecoration, Modifier.size(38.dp))
                        Spacer(modifier = Modifier.width(7.dp))
                        Text(reel.author, color = Color.White, fontWeight = FontWeight.Bold, maxLines = 1)
                        if (reel.verified) VerifiedBadge(reel.badgeType, 16.dp)
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
        
        if (notifications.isEmpty()) Box(Modifier.fillMaxSize().padding(bottom = 72.dp), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Box(Modifier.size(72.dp).background(Color(0xFFF2F4F7), CircleShape), contentAlignment = Alignment.Center) { Icon(Icons.Outlined.NotificationsNone, null, tint = Color(0xFF667085), modifier = Modifier.size(32.dp)) }
                Spacer(Modifier.height(14.dp))
                Text("No notifications yet", fontWeight = FontWeight.Bold, fontSize = 17.sp)
                Text("Likes, comments, follows and mentions will appear here.", color = Color.Gray, textAlign = TextAlign.Center, modifier = Modifier.padding(top = 5.dp, start = 28.dp, end = 28.dp))
            }
        } else LazyColumn { items(notifications) { note ->
            ListItem(leadingContent = { Box(modifier = Modifier.size(40.dp).clip(CircleShape).background(TiwiBlue.copy(alpha = 0.1f)), contentAlignment = Alignment.Center) { Icon(Icons.Default.Notifications, contentDescription = null, tint = TiwiBlue) } }, headlineContent = { Text(note) }, supportingContent = { Text("2 hours ago") }, colors = ListItemDefaults.colors(containerColor = Color.Transparent))
        } }
    }
}

@Composable
fun MenuScreen(repository: SocialRepository, name: String, avatarUrl: String?, onProfileClick: () -> Unit, onLogout: () -> Unit) {
    var selectedSetting by remember { mutableStateOf<String?>(null) }
    var selectedShortcut by remember { mutableStateOf<String?>(null) }
    var showEditProfile by remember { mutableStateOf(false) }
    val profile by repository.profile.collectAsState()
    val context = LocalContext.current
    var decorationCatalogAvailable by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) {
        decorationCatalogAvailable = runCatching { repository.profileDecorations().isNotEmpty() }.getOrDefault(false)
    }
    selectedSetting?.let { setting ->
        BackHandler { selectedSetting = null }
        SocialSettingsPage(repository, profile, setting, onBack = { selectedSetting = null })
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
    Column(modifier = Modifier.fillMaxSize().background(Color.White).statusBarsPadding().padding(horizontal = 10.dp)) {
        Surface(
            modifier = Modifier.fillMaxWidth(),
            color = Color.White,
            shape = RoundedCornerShape(12.dp),
            border = BorderStroke(1.dp, Color(0xFFE3E6EA)),
            tonalElevation = 0.dp
        ) {
            Column {
                Box(Modifier.fillMaxWidth().height(142.dp)) {
                    TiwiAvatar(profile?.coverUrl, R.drawable.img_tiwi_cover, Modifier.fillMaxWidth().height(105.dp).clip(RoundedCornerShape(topStart = 12.dp, topEnd = 12.dp)), ContentScale.Crop)
                    DecoratedAvatar(
                        avatarUrl,
                        R.drawable.img_tiwi_avatar_1,
                        profile?.avatarDecoration,
                        Modifier.align(Alignment.BottomStart).padding(start = 10.dp).size(86.dp)
                    )
                    FilledTonalIconButton(
                        onClick = { showEditProfile = true },
                        modifier = Modifier.align(Alignment.BottomEnd).padding(end = 10.dp, bottom = 3.dp).size(36.dp),
                        colors = IconButtonDefaults.filledTonalIconButtonColors(containerColor = Color(0xFFF0F2F5), contentColor = Color.Black)
                    ) { Icon(Icons.Default.Edit, "Edit profile", modifier = Modifier.size(18.dp)) }
                }
                Row(Modifier.fillMaxWidth().clickable(onClick = onProfileClick).padding(horizontal = 12.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(name, style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold))
                            if (profile?.verified == true) VerifiedBadge(profile?.badgeType, 17.dp, Modifier.padding(start = 3.dp))
                        }
                        Text("@${profile?.username.orEmpty()} - View profile", style = MaterialTheme.typography.labelMedium, color = Color.Gray)
                    }
                    Icon(Icons.Default.ChevronRight, contentDescription = null)
                }
            }
        }

        Spacer(modifier = Modifier.height(9.dp))

        Surface(
            modifier = Modifier.fillMaxWidth().clickable { selectedSetting = "Verified badge" },
            color = Color.White,
            shape = RoundedCornerShape(12.dp),
            border = BorderStroke(1.dp, Color(0xFFB9D7FF)),
            tonalElevation = 0.dp
        ) {
            Row(Modifier.padding(horizontal = 14.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(42.dp).background(Color(0xFFEAF3FF), CircleShape), contentAlignment = Alignment.Center) { VerifiedBadge("blue", 24.dp) }
                Column(Modifier.weight(1f).padding(start = 11.dp)) {
                    Text("Apply for a verified badge", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                    Text("Blue subscriptions or Gold notable review", color = Color.Gray, fontSize = 12.sp)
                }
                Icon(Icons.Default.ChevronRight, null, tint = Color.Gray)
            }
        }

        if (decorationCatalogAvailable) {
            Spacer(modifier = Modifier.height(10.dp))
            Surface(
                modifier = Modifier.fillMaxWidth().clickable { selectedSetting = "Profile decoration" },
                color = Color(0xFFF7F4FF),
                shape = RoundedCornerShape(16.dp),
                tonalElevation = 0.dp
            ) {
                Row(Modifier.padding(horizontal = 13.dp, vertical = 11.dp), verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(48.dp).clip(RoundedCornerShape(14.dp)).background(Color.White), contentAlignment = Alignment.Center) {
                        val activeDecoration = profile?.avatarDecoration
                        if (activeDecoration != null) ProfileDecorationImage(activeDecoration.assetUrl, Modifier.size(46.dp))
                        else Icon(Icons.Outlined.AutoAwesome, null, tint = Color(0xFF7F56D9))
                    }
                    Column(Modifier.weight(1f).padding(start = 11.dp)) {
                        Text("Decorate your profile", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                        Text(profile?.avatarDecoration?.name ?: "Avatar frames, free and premium", color = Color(0xFF625B71), fontSize = 12.sp)
                    }
                    Surface(color = Color.White, shape = CircleShape, tonalElevation = 0.dp) {
                        Icon(Icons.Default.ChevronRight, null, tint = Color(0xFF7F56D9), modifier = Modifier.padding(6.dp).size(18.dp))
                    }
                }
            }
            Spacer(modifier = Modifier.height(10.dp))
        }

        LazyColumn(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(12.dp)) {
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
                            modifier = Modifier.weight(1f).height(100.dp).clickable { selectedShortcut = item.first },
                            color = Color.White,
                            shape = RoundedCornerShape(10.dp),
                            border = BorderStroke(1.dp, Color(0xFFE3E6EA)),
                            tonalElevation = 0.dp
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
                    Pair("Account Center", Icons.Default.AccountCircle),
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
                            colors = ListItemDefaults.colors(containerColor = Color.White),
                            modifier = Modifier.clip(RoundedCornerShape(8.dp)).clickable { selectedSetting = item.first }
                        )
                    }
                }
            }
            
            item {
                Button(
                    onClick = onLogout,
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = Color.White, contentColor = Color(0xFFB42318)),
                    border = BorderStroke(1.dp, Color(0xFFF1B4AE)),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text("Log Out", fontWeight = FontWeight.Bold)
                }
                Spacer(modifier = Modifier.height(32.dp))
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
    val scope = rememberCoroutineScope()
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
    val scope = rememberCoroutineScope()
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
    val scope = rememberCoroutineScope()
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
    val scope = rememberCoroutineScope()
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

    if (page == "Profile decoration") {
        ProfileDecorationPage(repository, profile, onBack)
        return
    }
    if (page == "Account Center") {
        AccountCenterPage(repository, currentUser, onBack)
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
    val scope = rememberCoroutineScope()
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
    ModalBottomSheet(onDismissRequest = onDismiss, containerColor = Color.White, contentColor = Color.Black, tonalElevation = 0.dp) {
        Column(Modifier.fillMaxWidth().heightIn(max = 720.dp)) {
            Column(Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(horizontal = 18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) { VerifiedBadge(if (gold) "gold" else "blue", 30.dp); Column(Modifier.padding(start = 10.dp)) { Text("Verification invoice", fontWeight = FontWeight.Bold, fontSize = 20.sp); Text("Choose a method, then use the Pay button below", color = Color.Gray, fontSize = 12.sp) } }
            Surface(color = Color(0xFFF8FAFC), border = BorderStroke(1.dp, Color(0xFFE3E6EA)), shape = RoundedCornerShape(12.dp), tonalElevation = 0.dp) {
                Column(Modifier.padding(14.dp)) {
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
                        Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) { RadioButton(selected, onClick = { selectedProvider = gateway.provider }); Icon(Icons.Outlined.Payment, null, tint = TiwiBlue, modifier = Modifier.padding(start = 4.dp)); Text(gateway.name, Modifier.weight(1f).padding(start = 9.dp), fontWeight = FontWeight.Medium); if (selected) Icon(Icons.Default.CheckCircle, "Selected", tint = TiwiBlue) }
                    }
                }
            }
                Spacer(Modifier.height(8.dp))
            }
            HorizontalDivider(color = Color(0xFFE4E7EC))
            Column(Modifier.fillMaxWidth().background(Color.White).padding(horizontal = 18.dp, vertical = 12.dp).navigationBarsPadding()) {
                Text(if (gold) "Administrator review" else if (selectedProvider.isBlank()) "Select a payment method above" else "Selected: ${options.gateways.firstOrNull { it.provider == selectedProvider }?.name ?: selectedProvider}", color = if (!gold && selectedProvider.isBlank()) Color(0xFFB42318) else Color(0xFF475467), fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                Button(enabled = !busy && (gold || selectedProvider.isNotBlank()), onClick = { onPay(if (gold) "manual" else selectedProvider) }, modifier = Modifier.fillMaxWidth().padding(top = 7.dp).height(48.dp), shape = RoundedCornerShape(9.dp)) { if (busy) CircularProgressIndicator(Modifier.size(19.dp), color = Color.White, strokeWidth = 2.dp) else Text(if (gold) "Submit for review" else "Pay $total", fontWeight = FontWeight.Bold) }
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    repository: SocialRepository,
    posts: List<Post>,
    reels: List<Reel>,
    userId: String? = null,
    onBack: () -> Unit,
    onPostClick: (String) -> Unit = {},
    onShare: (Post) -> Unit = {},
    onMessage: (String) -> Unit = {},
    onEditPost: (String) -> Unit = {}
) {
    var selectedTab by remember { mutableIntStateOf(0) }
    var isFollowing by remember { mutableStateOf(false) }
    var showEdit by remember { mutableStateOf(false) }
    var showVerified by remember { mutableStateOf(false) }
    var showMenu by remember { mutableStateOf(false) }
    val ownProfile by repository.profile.collectAsState()
    val ownUser by repository.currentUser.collectAsState()
    val syncing by repository.syncing.collectAsState()
    var remoteProfile by remember(userId) { mutableStateOf<SocialProfile?>(null) }
    var loadingProfile by remember(userId) { mutableStateOf(true) }
    val isOwn = userId.isNullOrBlank() || userId == repository.currentUserId()
    val profile = if (isOwn) ownProfile else remoteProfile
    val name = profile?.user?.name ?: if (isOwn) ownUser?.name.orEmpty() else ""
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    LaunchedEffect(userId) {
        loadingProfile = true
        val loaded = if (isOwn) runCatching { repository.refreshProfile() }.getOrNull()
        else runCatching { repository.refreshProfile(userId) }.getOrNull().also { remoteProfile = it }
        isFollowing = if (isOwn) false else loaded?.isFollowing == true
        loadingProfile = false
    }

    if (showEdit && isOwn) {
        BackHandler { showEdit = false }
        EditProfilePage(repository, profile, onBack = { showEdit = false })
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
    if (profile == null) {
        ProfileSkeleton(onBack = onBack, loading = loadingProfile)
        return
    }

    Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        Row(Modifier.fillMaxWidth().statusBarsPadding().height(48.dp).padding(horizontal = 2.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") }
            Text("@${profile?.username.orEmpty()}", modifier = Modifier.weight(1f), textAlign = TextAlign.Center, fontWeight = FontWeight.Bold)
            IconButton(onClick = { showMenu = true }) { Icon(Icons.Default.MoreHoriz, "Menu") }
        }
        HorizontalDivider(thickness = .5.dp, color = Color.LightGray.copy(alpha = .55f))
        PullToRefreshBox(
            isRefreshing = syncing,
            onRefresh = { scope.launch {
                if (isOwn) runCatching { repository.refreshAll(force = true) }
                else userId?.let { id -> runCatching { repository.refreshProfile(id) }.onSuccess { loaded -> loaded?.let { remoteProfile = it; isFollowing = it.isFollowing } } }
            } },
            modifier = Modifier.weight(1f)
        ) {
        LazyColumn(Modifier.fillMaxSize()) {
            item {
                Box(Modifier.fillMaxWidth().height(132.dp)) {
                    TiwiAvatar(profile?.coverUrl, R.drawable.img_tiwi_cover, Modifier.fillMaxSize(), ContentScale.Crop)
                    if (isOwn) FilledTonalIconButton(
                        onClick = { showEdit = true },
                        modifier = Modifier.align(Alignment.BottomEnd).padding(8.dp).size(36.dp),
                        colors = IconButtonDefaults.filledTonalIconButtonColors(containerColor = Color.White, contentColor = Color.Black)
                    ) { Icon(Icons.Default.CameraAlt, "Change cover", Modifier.size(18.dp)) }
                }
                Row(Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                    DecoratedAvatar(profile?.user?.avatar ?: if (isOwn) ownUser?.avatar else null, R.drawable.img_tiwi_avatar_1, profile?.avatarDecoration, Modifier.size(96.dp), animateDecoration = true)
                    Row(Modifier.weight(1f), horizontalArrangement = Arrangement.SpaceEvenly) {
                        ProfileStatItem("Posts", (profile?.postCount ?: posts.size).toString())
                        ProfileStatItem("Followers", (profile?.followerCount ?: 0).toString())
                        ProfileStatItem("Following", (profile?.followingCount ?: 0).toString())
                    }
                }
                Column(Modifier.padding(horizontal = 14.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(name, fontWeight = FontWeight.Bold)
                        if (profile?.verified == true) VerifiedBadge(profile?.badgeType, 17.dp, Modifier.padding(start = 3.dp), onClick = { showVerified = true })
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
                    ProfileActionButton("Share profile", Modifier.weight(1f)) {
                        val profileId = profile?.userId ?: repository.currentUserId().orEmpty()
                        shareDeepLink(context, "$name on Tiwi", profile?.bio.orEmpty(), "https://tiwlo.com/social/profile/$profileId")
                    }
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
                0 -> items(posts, key = { it.id }) { post -> PostCard(post, repository, onShareClick = { onShare(post) }, onOpen = { onPostClick(post.id) }, onEditRequest = { onEditPost(it.id) }, onOpenLinkedPost = onPostClick) }
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
    }
    if (showVerified) VerifiedInfoSheet(name, profile?.user?.avatar, profile?.badgeType ?: "blue", profile?.avatarDecoration, onDismiss = { showVerified = false })
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
    val scope = rememberCoroutineScope()
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

@Composable
private fun EditProfilePage(repository: SocialRepository, profile: SocialProfile?, onBack: () -> Unit) {
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
    var avatarDecoration by remember(profile) { mutableStateOf(profile?.avatarDecoration) }
    var showDecorations by remember { mutableStateOf(false) }
    var busy by remember { mutableStateOf(false) }
    var decorationCatalogAvailable by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) {
        decorationCatalogAvailable = runCatching { repository.profileDecorations().isNotEmpty() }.getOrDefault(false)
    }
    val avatarPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        if (uri != null) scope.launch { busy = true; runCatching { repository.uploadMedia(context.contentResolver, uri, "profile").url }.onSuccess { avatarUrl = it }.onFailure { Toast.makeText(context, it.message ?: "Photo upload failed", Toast.LENGTH_LONG).show() }; busy = false }
    }
    val coverPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        if (uri != null) scope.launch { busy = true; runCatching { repository.uploadMedia(context.contentResolver, uri, "cover").url }.onSuccess { coverUrl = it }.onFailure { Toast.makeText(context, it.message ?: "Cover upload failed", Toast.LENGTH_LONG).show() }; busy = false }
    }
    fun save() {
        if (busy || username.isBlank()) return
        scope.launch {
            busy = true
            runCatching { repository.updateProfile(mapOf(
                "username" to username, "bio" to bio, "about" to about, "category" to category,
                "location" to location, "website" to website, "avatar" to avatarUrl, "coverUrl" to coverUrl
            )) }.onSuccess { onBack() }.onFailure { Toast.makeText(context, it.message ?: "Profile update failed", Toast.LENGTH_LONG).show() }
            busy = false
        }
    }
    Column(Modifier.fillMaxSize().background(Color.White).statusBarsPadding()) {
        Row(Modifier.fillMaxWidth().height(52.dp), verticalAlignment = Alignment.CenterVertically) {
            TextButton(enabled = !busy, onClick = onBack) { Text("Cancel", color = Color.Black) }
            Text("Edit profile", Modifier.weight(1f), textAlign = TextAlign.Center, fontWeight = FontWeight.Bold, fontSize = 18.sp)
            TextButton(enabled = !busy && username.isNotBlank(), onClick = ::save) { if (busy) CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp) else Text("Done", fontWeight = FontWeight.Bold) }
        }
        HorizontalDivider(color = Color(0xFFE4E7EC))
        Column(Modifier.weight(1f).verticalScroll(rememberScrollState())) {
            Box(Modifier.fillMaxWidth().height(150.dp).background(Color(0xFFEAF3FF)).clickable { coverPicker.launch("image/*") }) {
                TiwiAvatar(coverUrl, R.drawable.img_tiwi_cover, Modifier.fillMaxSize(), ContentScale.Crop)
                Surface(Modifier.align(Alignment.BottomEnd).padding(10.dp), color = Color.White, shape = CircleShape, tonalElevation = 0.dp) { Icon(Icons.Default.CameraAlt, "Edit cover", Modifier.padding(9.dp)) }
            }
            Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
                DecoratedAvatar(avatarUrl, R.drawable.img_tiwi_avatar_1, avatarDecoration, Modifier.offset(y = (-46).dp).size(104.dp), animateDecoration = true)
                TextButton(onClick = { avatarPicker.launch("image/*") }, modifier = Modifier.offset(y = (-42).dp)) { Text("Edit picture", fontWeight = FontWeight.Bold) }
            }
            Column(Modifier.padding(horizontal = 16.dp).offset(y = (-28).dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                if (decorationCatalogAvailable) {
                    Surface(
                        Modifier.fillMaxWidth().clickable { showDecorations = true },
                        color = Color(0xFFFAF9FF),
                        border = BorderStroke(1.dp, Color(0xFFD8CCFF)),
                        shape = RoundedCornerShape(12.dp),
                        tonalElevation = 0.dp
                    ) {
                        Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                            Box(Modifier.size(42.dp).background(Color(0xFFF0EBFF), CircleShape), contentAlignment = Alignment.Center) { if (avatarDecoration != null) ProfileDecorationImage(avatarDecoration!!.assetUrl, Modifier.fillMaxSize(), animated = true) else Icon(Icons.Outlined.AutoAwesome, null, tint = Color(0xFF7F56D9)) }
                            Column(Modifier.weight(1f).padding(start = 11.dp)) { Text("Avatar decoration", fontWeight = FontWeight.Bold); Text(avatarDecoration?.name ?: "Choose an animated profile effect", color = Color.Gray, fontSize = 12.sp) }
                            Icon(Icons.Default.ChevronRight, null, tint = Color.Gray)
                        }
                    }
                }
                Text("Public profile", fontWeight = FontWeight.Bold, fontSize = 17.sp)
                OutlinedTextField(username, { username = it.take(30) }, label = { Text("Username") }, supportingText = { Text("${username.length}/30") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(bio, { bio = it.take(240) }, label = { Text("Bio") }, supportingText = { Text("${bio.length}/240") }, minLines = 3, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(category, { category = it.take(80) }, label = { Text("Category") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                Text("About and links", fontWeight = FontWeight.Bold, fontSize = 17.sp, modifier = Modifier.padding(top = 6.dp))
                OutlinedTextField(about, { about = it.take(3000) }, label = { Text("About") }, minLines = 4, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(website, { website = it.take(500) }, label = { Text("Website") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(location, { location = it.take(160) }, label = { Text("Location") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                Text("Changes are validated and saved through the Tiwi API.", color = Color.Gray, fontSize = 12.sp)
                Spacer(Modifier.navigationBarsPadding().height(22.dp))
            }
        }
    }
    if (showDecorations) ProfileDecorationSheet(
        repository = repository,
        avatarUrl = avatarUrl,
        current = avatarDecoration,
        onDismiss = { showDecorations = false },
        onApplied = { avatarDecoration = it; showDecorations = false }
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
            ProfileDecorationMarketplace(repository, avatarUrl, current, Modifier.weight(1f), onApplied)
        }
    }
}

@Composable
private fun ProfileDecorationMarketplace(
    repository: SocialRepository,
    avatarUrl: String?,
    current: SocialProfileDecoration?,
    modifier: Modifier = Modifier,
    onApplied: (SocialProfileDecoration?) -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var decorations by remember { mutableStateOf<List<SocialProfileDecoration>>(emptyList()) }
    var paymentOptions by remember { mutableStateOf<SocialVerificationOptions?>(null) }
    var loading by remember { mutableStateOf(true) }
    var busy by remember { mutableStateOf(false) }
    var selectedId by remember(current?.id) { mutableStateOf(current?.id) }
    var activeId by remember(current?.id) { mutableStateOf(current?.id) }
    var selectedGateway by remember { mutableStateOf("") }

    suspend fun refreshDecorations() {
        loading = true
        decorations = runCatching { repository.profileDecorations() }
            .onFailure { Toast.makeText(context, it.message ?: "Decorations could not load", Toast.LENGTH_LONG).show() }
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

    Column(modifier.background(Color(0xFFF8F9FC))) {
        Surface(
            Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 10.dp),
            color = Color.Transparent,
            shape = RoundedCornerShape(22.dp),
            tonalElevation = 0.dp
        ) {
            Box(Modifier.fillMaxWidth().background(Brush.linearGradient(listOf(Color(0xFF201A33), Color(0xFF4C2D80), Color(0xFF7F56D9)))).padding(vertical = 18.dp), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    DecoratedAvatar(avatarUrl, R.drawable.img_tiwi_avatar_1, previewDecoration, Modifier.size(148.dp), animateDecoration = true)
                    Text(repository.currentUser.value?.name.orEmpty(), color = Color.White, fontWeight = FontWeight.ExtraBold, fontSize = 18.sp)
                    Text(previewDecoration?.name ?: "No decoration", color = Color.White.copy(alpha = .76f), fontSize = 12.sp)
                    Surface(Modifier.padding(top = 8.dp), color = Color.White.copy(alpha = .14f), shape = RoundedCornerShape(20.dp), tonalElevation = 0.dp) { Text("LIVE PROFILE PREVIEW", Modifier.padding(horizontal = 12.dp, vertical = 5.dp), color = Color.White, fontWeight = FontWeight.Black, fontSize = 9.sp, letterSpacing = 1.sp) }
                }
            }
        }
        if (loading) Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(Modifier.size(30.dp), strokeWidth = 2.5.dp) }
        else LazyColumn(Modifier.weight(1f), contentPadding = PaddingValues(horizontal = 14.dp, vertical = 4.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            item {
                Row(verticalAlignment = Alignment.CenterVertically) { Text("Your decorations", Modifier.weight(1f), fontWeight = FontWeight.ExtraBold, fontSize = 17.sp); IconButton(onClick = { scope.launch { refreshDecorations() } }, modifier = Modifier.size(34.dp)) { Icon(Icons.Default.Refresh, "Refresh", tint = TiwiBlue, modifier = Modifier.size(19.dp)) } }
                Text("Purchased items and every free decoration available to your account.", color = Color.Gray, fontSize = 11.sp)
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
                    items(yourDecorations, key = { "owned-${it.id}" }) { item -> DecorationStoreCard(item, selectedId == item.id, Modifier.width(116.dp).height(142.dp)) { selectedId = item.id } }
                }
            }
            item { Text("Explore all", fontWeight = FontWeight.ExtraBold, fontSize = 17.sp); Text("Scroll and tap any decoration to see it on your profile.", color = Color.Gray, fontSize = 11.sp) }
            items(decorations.chunked(2), key = { row -> row.joinToString("-") { it.id } }) { row ->
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    row.forEach { item -> DecorationStoreCard(item, selectedId == item.id, Modifier.weight(1f).height(190.dp)) { selectedId = item.id; selectedGateway = options?.gateways?.firstOrNull()?.key.orEmpty() } }
                    if (row.size == 1) Spacer(Modifier.weight(1f))
                }
            }
            if (selected != null && !selected.owned && selected.priceUsd > 0) item {
                Surface(color = Color.White, shape = RoundedCornerShape(14.dp), border = BorderStroke(1.dp, Color(0xFFD8CCFF)), tonalElevation = 0.dp) {
                    Column(Modifier.padding(14.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) { Icon(Icons.Outlined.Payment, null, tint = Color(0xFF7F56D9)); Column(Modifier.weight(1f).padding(start = 9.dp)) { Text("Choose payment method", fontWeight = FontWeight.Bold); Text("${selected.name} · $convertedPrice", color = Color.Gray, fontSize = 11.sp) } }
                        options?.gateways.orEmpty().forEach { gateway ->
                            Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp)).clickable { selectedGateway = gateway.key }.padding(vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) { RadioButton(selectedGateway == gateway.key, { selectedGateway = gateway.key }); Text(gateway.name, fontWeight = FontWeight.SemiBold) }
                        }
                    }
                }
            }
            item { Spacer(Modifier.height(6.dp)) }
        }
        val canApply = selected == null || selected.owned || selected.priceUsd <= 0
        Button(
            enabled = !busy && (canApply || selectedGateway.isNotBlank()),
            onClick = {
                scope.launch {
                    busy = true
                    if (canApply) {
                        runCatching { repository.applyProfileDecoration(selected?.id) }
                            .onSuccess { profile -> activeId = profile.avatarDecoration?.id; onApplied(profile.avatarDecoration); Toast.makeText(context, if (profile.avatarDecoration == null) "Decoration removed" else "${profile.avatarDecoration.name} applied", Toast.LENGTH_SHORT).show() }
                            .onFailure { Toast.makeText(context, it.message ?: "Decoration could not be applied", Toast.LENGTH_LONG).show() }
                    } else if (selected != null && options != null) {
                        runCatching { repository.startProfileDecorationCheckout(selected.id, selectedGateway, options.currency) }
                            .onSuccess { checkout ->
                                if (!checkout.paymentUrl.isNullOrBlank()) context.startActivity(Intent(Intent.ACTION_VIEW, android.net.Uri.parse(checkout.paymentUrl)))
                                else Toast.makeText(context, checkout.message ?: "Decoration added", Toast.LENGTH_LONG).show()
                                refreshDecorations()
                            }
                            .onFailure { Toast.makeText(context, it.message ?: "Checkout failed", Toast.LENGTH_LONG).show() }
                    }
                    busy = false
                }
            },
            modifier = Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 10.dp).navigationBarsPadding(),
            shape = RoundedCornerShape(12.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF6E3CBC))
        ) {
            if (busy) CircularProgressIndicator(Modifier.size(19.dp), color = Color.White, strokeWidth = 2.dp)
            else Text(when { selected?.id == activeId -> "Applied"; canApply -> "Apply decoration"; else -> "Continue · $convertedPrice" }, fontWeight = FontWeight.ExtraBold)
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
                Box(Modifier.fillMaxSize(.66f).background(Brush.linearGradient(listOf(Color(0xFFDDEBFF), Color(0xFFEADFFF))), CircleShape))
                ProfileDecorationImage(item.assetUrl, Modifier.fillMaxSize().graphicsLayer(scaleX = 1.12f, scaleY = 1.12f), animated = true)
                if (item.applied) Icon(Icons.Default.CheckCircle, "Applied", tint = Color(0xFF12B76A), modifier = Modifier.align(Alignment.TopEnd).size(20.dp))
            }
            Text(item.name, fontWeight = FontWeight.Bold, fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(when { item.applied -> "APPLIED"; item.priceUsd <= 0 -> "FREE"; item.owned -> "OWNED"; else -> "\$${String.format(Locale.US, "%.2f", item.priceUsd)}" }, color = if (item.priceUsd <= 0 || item.owned) Color(0xFF067647) else Color(0xFF6941C6), fontWeight = FontWeight.Black, fontSize = 9.sp)
        }
    }
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
        containerColor = Color.White,
        tonalElevation = 0.dp,
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
    val currentUser by repository.currentUser.collectAsState()
    var chatQuery by remember { mutableStateOf("") }
    var showNewMessage by remember { mutableStateOf(false) }
    var messageTab by remember { mutableIntStateOf(0) }
    var stories by remember { mutableStateOf<List<SocialPost>>(emptyList()) }
    var selectedStory by remember { mutableStateOf<SocialPost?>(null) }
    var storyUploading by remember { mutableStateOf(false) }
    val currentUserId = repository.currentUserId()
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val contacts = remember(chats, currentUserId) { chats.mapNotNull { it.members.firstOrNull { member -> member.userId != currentUserId } }.distinctBy { it.userId } }
    val storyCards = remember(stories, currentUserId) { stories.filter { it.authorId != currentUserId }.distinctBy { it.authorId } }
    val myStory = remember(stories, currentUserId) { stories.firstOrNull { it.authorId == currentUserId } }
    val visibleChats = remember(chats, chatQuery, currentUserId, messageTab) {
        val byRequest = chats.filter { chat -> if (messageTab == 0) chat.requestStatus == "accepted" || chat.requestedById == currentUserId else chat.requestStatus == "pending" && chat.requestedById != currentUserId }
        if (chatQuery.isBlank()) byRequest else byRequest.filter { chat ->
            chat.title?.contains(chatQuery, true) == true || chat.members.any { it.userId != currentUserId && it.user.name.contains(chatQuery, true) }
        }
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
        runCatching { repository.refreshConversations() }
        stories = runCatching { repository.stories() }.getOrDefault(emptyList())
    }
    selectedStory?.let { story ->
        BackHandler { selectedStory = null }
        MessengerStoryViewer(story = story, repository = repository, onClose = { selectedStory = null })
        return
    }
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
                val lastMsg = messagePreview(chat.lastMessage, currentUserId)
                ListItem(
                    modifier = Modifier.clickable(enabled = chat.requestStatus == "accepted" || chat.requestedById == currentUserId) { onChatClick(chat) },
                    leadingContent = { DecoratedAvatar(contact?.user?.avatar ?: chat.avatarUrl, R.drawable.img_tiwi_avatar_1, contact?.profile?.avatarDecoration, Modifier.size(62.dp)) },
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
private fun MessengerStoryViewer(story: SocialPost, repository: SocialRepository, onClose: () -> Unit) {
    val media = story.media.firstOrNull()
    Box(Modifier.fillMaxSize().background(Color.Black).statusBarsPadding().navigationBarsPadding()) {
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
                contentScale = ContentScale.Fit
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
        Row(Modifier.fillMaxWidth().align(Alignment.TopStart).padding(top = 14.dp, start = 12.dp, end = 4.dp), verticalAlignment = Alignment.CenterVertically) {
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
                            leadingContent = { DecoratedAvatar(profile.user.avatar, R.drawable.img_tiwi_avatar_1, profile.avatarDecoration, Modifier.size(46.dp)) },
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
    var selectedMessageId by remember { mutableStateOf<String?>(null) }
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
    val selectedMessage = messages.firstOrNull { it.id == selectedMessageId }

    BackHandler(enabled = selectedMessageId != null) { selectedMessageId = null }

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
                    DecoratedAvatar(contact?.user?.avatar, R.drawable.img_tiwi_avatar_1, contact?.profile?.avatarDecoration, Modifier.size(42.dp).clickable { contact?.userId?.let(onProfileClick) }, animateDecoration = true)
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
                if (message.type == "system") {
                    Surface(
                        modifier = Modifier.align(Alignment.CenterHorizontally).combinedClickable(
                            onClick = { selectedMessageId = if (selectedMessageId == message.id) null else message.id },
                            onLongClick = { selectedMessageId = message.id }
                        ),
                        color = if (selectedMessageId == message.id) Color(0xFFE5F0FF) else Color(0xFFF7F8FA),
                        shape = RoundedCornerShape(14.dp),
                        border = BorderStroke(1.dp, if (selectedMessageId == message.id) TiwiBlue.copy(alpha = .45f) else Color(0xFFE4E7EC)),
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
                    return@itemsIndexed
                }
                Box(
                    modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp))
                        .background(if (selectedMessageId == message.id) TiwiBlue.copy(alpha = .09f) else Color.Transparent)
                        .padding(horizontal = 3.dp, vertical = 2.dp),
                    contentAlignment = if (isMe) Alignment.CenterEnd else Alignment.CenterStart
                ) {
                    Column(horizontalAlignment = if (isMe) Alignment.End else Alignment.Start) {
                    Surface(color = if (isMe) TiwiBlue else Color(0xFFF0F0F0), shape = RoundedCornerShape(18.dp), modifier = Modifier.widthIn(max = 280.dp).combinedClickable(
                        onClick = { selectedMessageId = if (selectedMessageId == message.id) null else message.id },
                        onLongClick = { selectedMessageId = message.id }
                    )) {
                        Column {
                            message.media.forEach { media ->
                                when (media.type) {
                                    "video" -> TiwiVideo(media.hlsUrl?.takeIf { media.processingStatus == "ready" } ?: media.url, Modifier.fillMaxWidth().height(180.dp), fallbackUrl = media.url, posterUrl = media.thumbnailUrl)
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
                    if (selectedMessageId == message.id) Text("${messageDay(message.sentAt)} · ${messageClock(message.sentAt)}", color = Color.Gray, fontSize = 10.sp, modifier = Modifier.padding(horizontal = 5.dp).padding(top = 2.dp))
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
