package com.example

import android.content.ContentUris
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.media.MediaPlayer
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import android.widget.Toast
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.AlternateEmail
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Brush
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.ContentCut
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Event
import androidx.compose.material.icons.filled.GifBox
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.Image
import androidx.compose.material.icons.filled.Link
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.MoreHoriz
import androidx.compose.material.icons.filled.MusicNote
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Poll
import androidx.compose.material.icons.filled.Public
import androidx.compose.material.icons.filled.QuestionAnswer
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.Tag
import androidx.compose.material.icons.filled.TextFields
import androidx.compose.material.icons.filled.Timer
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.outlined.AddPhotoAlternate
import androidx.compose.material.icons.outlined.AutoFixHigh
import androidx.compose.material.icons.outlined.Collections
import androidx.compose.material.icons.outlined.EmojiEmotions
import androidx.compose.material.icons.outlined.FilterVintage
import androidx.compose.material.icons.outlined.History
import androidx.compose.material.icons.outlined.ImageNotSupported
import androidx.compose.material.icons.outlined.KeyboardArrowDown
import androidx.compose.material.icons.outlined.MusicNote
import androidx.compose.material.icons.outlined.PhotoLibrary
import androidx.compose.material.icons.outlined.SentimentSatisfied
import androidx.compose.material.icons.outlined.TextFields
import androidx.compose.material.icons.outlined.Visibility
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RangeSlider
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.graphics.ColorMatrix
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.FileProvider
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.media3.common.MediaItem
import androidx.media3.common.C
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import coil.compose.AsyncImage
import com.example.social.SocialMedia
import com.example.social.SocialProfile
import com.example.social.SocialRepository
import com.example.social.SocialStory
import com.example.social.SocialStoryGroup
import com.example.social.SocialStoryInteraction
import com.example.social.SocialStoryItem
import com.example.social.SocialStoryMusicTrack
import com.example.social.SocialStoryView
import com.example.social.SocialUser
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

private val StoryPink = Color(0xFFE1306C)
private val StoryOrange = Color(0xFFFCAF45)
private val StoryPurple = Color(0xFF833AB4)
private val StoryBlue = Color(0xFF0877FF)

private data class StoryDeviceMedia(val uri: Uri, val mime: String, val video: Boolean)

private data class StoryOverlayDraft(
    val id: String = UUID.randomUUID().toString(),
    val type: String,
    val label: String,
    val value: String = label,
    val x: Float = .5f,
    val y: Float = .5f,
    val scale: Float = 1f,
    val rotation: Float = 0f,
    val color: String = "#FFFFFF",
    val prompt: String? = null,
    val options: List<String> = emptyList(),
    val localAssetUri: String? = null
) {
    fun asInput(assetUrl: String? = null): Map<String, Any?> = mapOf(
        "id" to id, "type" to type, "label" to label, "value" to value,
        "x" to x, "y" to y, "scale" to scale, "rotation" to rotation, "color" to color,
        "key" to id, "prompt" to prompt, "options" to options.mapIndexed { index, option ->
            mapOf("id" to index.toString(), "text" to option)
        }, "url" to assetUrl
    ).filterValues { it != null && it != emptyList<String>() }
}

private data class StoryDraft(
    val uris: List<Uri> = emptyList(),
    val text: String = "",
    val background: String = "#111827",
    val filter: String = "original",
    val cropScale: Float = 1f,
    val cropX: Float = 0f,
    val cropY: Float = 0f,
    val videoDurationMs: Long = 0L,
    val videoTrimStartMs: Long = 0L,
    val videoTrimDurationMs: Long = 15_000L,
    val overlays: List<StoryOverlayDraft> = emptyList(),
    val music: SocialStoryMusicTrack? = null,
    val musicStartMs: Long = 0L,
    val musicDurationMs: Long = 15_000L,
    val altText: String = "",
    val aiGenerated: Boolean = false,
    val visibility: String = "public",
    val allowReplies: Boolean = true,
    val collage: Boolean = false
)

private enum class StoryCreatePage { GALLERY, EDITOR, FILTERS, STICKERS, STICKER_INPUT, TEXT, EFFECTS, MENTION, LINK, MUSIC, GIF, AUDIENCE, MORE, ALT_TEXT }

private suspend fun loadStoryDeviceMedia(context: Context, gifOnly: Boolean = false): List<StoryDeviceMedia> = withContext(Dispatchers.IO) {
    val collection = MediaStore.Files.getContentUri("external")
    val projection = arrayOf(MediaStore.Files.FileColumns._ID, MediaStore.Files.FileColumns.MIME_TYPE, MediaStore.Files.FileColumns.MEDIA_TYPE)
    val selection = if (gifOnly) "${MediaStore.Files.FileColumns.MIME_TYPE} = ?" else
        "${MediaStore.Files.FileColumns.MEDIA_TYPE} = ? OR ${MediaStore.Files.FileColumns.MEDIA_TYPE} = ?"
    val args = if (gifOnly) arrayOf("image/gif") else arrayOf(
        MediaStore.Files.FileColumns.MEDIA_TYPE_IMAGE.toString(), MediaStore.Files.FileColumns.MEDIA_TYPE_VIDEO.toString()
    )
    runCatching {
        context.contentResolver.query(collection, projection, selection, args, "${MediaStore.Files.FileColumns.DATE_ADDED} DESC")?.use { cursor ->
            val id = cursor.getColumnIndexOrThrow(MediaStore.Files.FileColumns._ID)
            val mime = cursor.getColumnIndexOrThrow(MediaStore.Files.FileColumns.MIME_TYPE)
            val type = cursor.getColumnIndexOrThrow(MediaStore.Files.FileColumns.MEDIA_TYPE)
            buildList {
                while (cursor.moveToNext() && size < 500) add(
                    StoryDeviceMedia(
                        ContentUris.withAppendedId(collection, cursor.getLong(id)),
                        cursor.getString(mime).orEmpty(),
                        cursor.getInt(type) == MediaStore.Files.FileColumns.MEDIA_TYPE_VIDEO
                    )
                )
            }
        }.orEmpty()
    }.getOrDefault(emptyList())
}

private suspend fun storyVideoDurationMs(context: Context, uri: Uri): Long = withContext(Dispatchers.IO) {
    runCatching {
        val retriever = MediaMetadataRetriever()
        try {
            retriever.setDataSource(context, uri)
            retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)?.toLongOrNull() ?: 0L
        } finally { retriever.release() }
    }.getOrDefault(0L).coerceAtLeast(0L)
}

private fun cameraBitmapUri(context: Context, bitmap: Bitmap): Uri? = runCatching {
    val file = File(context.cacheDir, "story-camera-${System.currentTimeMillis()}.jpg")
    FileOutputStream(file).use { bitmap.compress(Bitmap.CompressFormat.JPEG, 94, it) }
    FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
}.getOrNull()

private suspend fun saveLocalStoryMedia(context: Context, source: Uri): Boolean = withContext(Dispatchers.IO) {
    runCatching {
        val resolver = context.contentResolver
        val mime = resolver.getType(source).orEmpty().ifBlank { "image/jpeg" }
        val video = mime.startsWith("video/")
        val extension = when {
            mime.contains("gif") -> "gif"
            mime.contains("png") -> "png"
            mime.contains("webp") -> "webp"
            video -> "mp4"
            else -> "jpg"
        }
        val values = ContentValues().apply {
            put(MediaStore.MediaColumns.DISPLAY_NAME, "Tiwi-story-${System.currentTimeMillis()}.$extension")
            put(MediaStore.MediaColumns.MIME_TYPE, mime)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                put(MediaStore.MediaColumns.RELATIVE_PATH, if (video) "Movies/Tiwi" else "Pictures/Tiwi")
                put(MediaStore.MediaColumns.IS_PENDING, 1)
            }
        }
        val collection = if (video) MediaStore.Video.Media.EXTERNAL_CONTENT_URI else MediaStore.Images.Media.EXTERNAL_CONTENT_URI
        val target = resolver.insert(collection, values) ?: error("Could not create gallery item")
        try {
            resolver.openInputStream(source).use { input ->
                requireNotNull(input) { "Could not read story media" }
                resolver.openOutputStream(target).use { output ->
                    requireNotNull(output) { "Could not write story media" }
                    input.copyTo(output)
                }
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                values.clear()
                values.put(MediaStore.MediaColumns.IS_PENDING, 0)
                resolver.update(target, values, null, null)
            }
            true
        } catch (error: Exception) {
            resolver.delete(target, null, null)
            throw error
        }
    }.getOrDefault(false)
}

@Composable
private fun StoryRing(
    total: Int,
    unseen: Int,
    modifier: Modifier = Modifier,
    stroke: Dp = 2.5.dp,
    content: @Composable () -> Unit
) {
    val moving by rememberInfiniteTransition(label = "story-ring").animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(tween(2_200, easing = LinearEasing), RepeatMode.Restart),
        label = "story-ring-dot"
    )
    Box(modifier, contentAlignment = Alignment.Center) {
        Canvas(Modifier.fillMaxSize()) {
            val count = total.coerceIn(1, 14)
            val gap = if (count == 1) 4f else (5f + count * .25f).coerceAtMost(10f)
            val sweep = (360f / count - gap).coerceAtLeast(10f)
            val inset = stroke.toPx() / 2f
            repeat(count) { index ->
                val unseenPart = index >= (count - unseen.coerceIn(0, count))
                val color = if (!unseenPart) Color(0xFFC7C9CE) else when (index % 3) {
                    0 -> StoryPink
                    1 -> StoryOrange
                    else -> StoryPurple
                }
                drawArc(
                    color = color,
                    startAngle = -90f + index * (360f / count) + gap / 2f,
                    sweepAngle = sweep,
                    useCenter = false,
                    topLeft = androidx.compose.ui.geometry.Offset(inset, inset),
                    size = androidx.compose.ui.geometry.Size(size.width - inset * 2, size.height - inset * 2),
                    style = Stroke(stroke.toPx(), cap = StrokeCap.Round)
                )
            }
            if (unseen > 0) {
                val radius = (size.minDimension - stroke.toPx()) / 2f
                val angle = (moving - 90f) * PI.toFloat() / 180f
                drawCircle(
                    color = Color.White,
                    radius = stroke.toPx() * .72f,
                    center = androidx.compose.ui.geometry.Offset(
                        size.width / 2f + cos(angle) * radius,
                        size.height / 2f + sin(angle) * radius
                    )
                )
            }
        }
        Box(Modifier.fillMaxSize().padding(stroke + 2.dp), contentAlignment = Alignment.Center) { content() }
    }
}

@Composable
fun TiwiStoryTray(
    groups: List<SocialStoryGroup>,
    currentUser: SocialUser?,
    currentProfile: SocialProfile?,
    modifier: Modifier = Modifier,
    compact: Boolean = true,
    onCreate: () -> Unit,
    onOpen: (String) -> Unit
) {
    val currentId = currentUser?.id
    val mine = remember(groups, currentId) { groups.firstOrNull { it.authorId == currentId } }
    val others = remember(groups, currentId) { groups.filterNot { it.authorId == currentId } }
    val avatarSize = if (compact) 58.dp else 66.dp
    val itemWidth = if (compact) 68.dp else 76.dp
    LazyRow(
        modifier = modifier.fillMaxWidth().height(if (compact) 91.dp else 104.dp),
        contentPadding = PaddingValues(horizontal = 9.dp, vertical = 6.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        item(key = "story-create") {
            Column(Modifier.width(itemWidth), horizontalAlignment = Alignment.CenterHorizontally) {
                Box(Modifier.size(avatarSize)) {
                    AsyncImage(
                        model = currentUser?.avatar,
                        contentDescription = "Create story",
                        modifier = Modifier.fillMaxSize().clip(CircleShape).background(Color(0xFFE9ECF1)).clickable(onClick = onCreate),
                        contentScale = ContentScale.Crop
                    )
                    Box(
                        Modifier.align(Alignment.BottomEnd).size(20.dp).background(StoryBlue, CircleShape)
                            .border(2.dp, Color.White, CircleShape).clickable(onClick = onCreate),
                        contentAlignment = Alignment.Center
                    ) { Icon(Icons.Default.Add, "Create story", tint = Color.White, modifier = Modifier.size(14.dp)) }
                }
                Text("Create story", fontSize = 10.sp, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(top = 4.dp))
            }
        }
        if (mine != null) item(key = "story-own") {
            Column(Modifier.width(itemWidth).clickable { onOpen(mine.authorId) }, horizontalAlignment = Alignment.CenterHorizontally) {
                StoryRing(
                    total = mine.stories.sumOf { it.items.size.coerceAtLeast(1) }.coerceAtLeast(mine.stories.size),
                    unseen = 0,
                    modifier = Modifier.size(avatarSize)
                ) {
                    AsyncImage(
                        model = currentUser?.avatar,
                        contentDescription = "Your story",
                        modifier = Modifier.fillMaxSize().clip(CircleShape).background(Color(0xFFE9ECF1)),
                        contentScale = ContentScale.Crop
                    )
                }
                Text("Your story", fontSize = 10.sp, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(top = 4.dp))
            }
        }
        items(others, key = { "story-group-${it.authorId}" }) { group ->
            val total = group.stories.sumOf { it.items.size.coerceAtLeast(1) }.coerceAtLeast(group.stories.size)
            Column(
                Modifier.width(itemWidth).clickable { onOpen(group.authorId) },
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                StoryRing(total, group.unseenCount, Modifier.size(avatarSize)) {
                    AsyncImage(
                        model = group.author.avatar,
                        contentDescription = "${group.author.name}'s story",
                        modifier = Modifier.fillMaxSize().clip(CircleShape).background(Color(0xFFE9ECF1)),
                        contentScale = ContentScale.Crop
                    )
                }
                Text(
                    group.author.name.substringBefore(' ').ifBlank { "Tiwi" },
                    fontSize = 10.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    fontWeight = if (group.unseenCount > 0) FontWeight.SemiBold else FontWeight.Normal,
                    modifier = Modifier.padding(top = 4.dp)
                )
            }
        }
    }
}

@Composable
private fun StoryPageHeader(title: String, onBack: () -> Unit, action: String? = null, actionEnabled: Boolean = true, onAction: () -> Unit = {}) {
    Row(Modifier.fillMaxWidth().statusBarsPadding().height(52.dp).padding(horizontal = 4.dp), verticalAlignment = Alignment.CenterVertically) {
        IconButton(onClick = onBack, modifier = Modifier.size(44.dp)) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back", modifier = Modifier.size(23.dp)) }
        Text(title, Modifier.weight(1f), fontSize = 18.sp, fontWeight = FontWeight.ExtraBold, textAlign = TextAlign.Center, maxLines = 1)
        if (action == null) Spacer(Modifier.width(44.dp))
        else TextButton(onClick = onAction, enabled = actionEnabled, modifier = Modifier.widthIn(min = 44.dp)) { Text(action, fontWeight = FontWeight.Bold, fontSize = 12.sp) }
    }
    HorizontalDivider(thickness = .5.dp, color = Color(0xFFE4E7EC))
}

private fun storyMediaInput(media: SocialMedia): Map<String, Any?> = mapOf(
    "url" to media.url,
    "type" to media.type,
    "hlsUrl" to media.hlsUrl,
    "thumbnailUrl" to media.thumbnailUrl,
    "mimeType" to media.mimeType,
    "processingId" to media.processingId,
    "processingStatus" to media.processingStatus
).filterValues { it != null }

private fun storyFilter(name: String): ColorFilter? = when (name) {
    "warm" -> ColorFilter.colorMatrix(ColorMatrix(floatArrayOf(
        1.12f, 0f, 0f, 0f, 12f, 0f, 1.02f, 0f, 0f, 2f, 0f, 0f, .88f, 0f, -4f, 0f, 0f, 0f, 1f, 0f
    )))
    "cool" -> ColorFilter.colorMatrix(ColorMatrix(floatArrayOf(
        .9f, 0f, 0f, 0f, -4f, 0f, 1.02f, 0f, 0f, 3f, 0f, 0f, 1.14f, 0f, 12f, 0f, 0f, 0f, 1f, 0f
    )))
    "mono" -> ColorFilter.colorMatrix(ColorMatrix().apply { setToSaturation(0f) })
    "vivid" -> ColorFilter.colorMatrix(ColorMatrix().apply { setToSaturation(1.45f) })
    "fade" -> ColorFilter.colorMatrix(ColorMatrix(floatArrayOf(
        .82f, .08f, .08f, 0f, 16f, .08f, .82f, .08f, 0f, 16f, .08f, .08f, .82f, 0f, 16f, 0f, 0f, 0f, 1f, 0f
    )))
    "contrast" -> ColorFilter.colorMatrix(ColorMatrix(floatArrayOf(
        1.25f, 0f, 0f, 0f, -28f, 0f, 1.25f, 0f, 0f, -28f, 0f, 0f, 1.25f, 0f, -28f, 0f, 0f, 0f, 1f, 0f
    )))
    else -> null
}

@OptIn(ExperimentalFoundationApi::class, ExperimentalMaterial3Api::class)
@Composable
fun TiwiStoryCreatePage(
    repository: SocialRepository,
    onBack: () -> Unit,
    onPublished: (SocialStory) -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var page by remember { mutableStateOf(StoryCreatePage.GALLERY) }
    var draft by remember { mutableStateOf(StoryDraft()) }
    var deviceMedia by remember { mutableStateOf<List<StoryDeviceMedia>>(emptyList()) }
    var loadingMedia by remember { mutableStateOf(true) }
    var publishing by remember { mutableStateOf(false) }
    var uploadProgress by remember { mutableIntStateOf(0) }
    var multiSelect by remember { mutableStateOf(false) }
    var galleryMode by remember { mutableStateOf("gallery") }
    var pendingStickerType by remember { mutableStateOf("question") }
    var gifMedia by remember { mutableStateOf<List<StoryDeviceMedia>>(emptyList()) }

    val systemPicker = rememberLauncherForActivityResult(ActivityResultContracts.PickMultipleVisualMedia(12)) { uris ->
        if (uris.isNotEmpty()) {
            draft = draft.copy(uris = uris.take(12))
            page = StoryCreatePage.EDITOR
        }
    }
    val camera = rememberLauncherForActivityResult(ActivityResultContracts.TakePicturePreview()) { bitmap ->
        bitmap?.let { cameraBitmapUri(context, it) }?.let { uri ->
            draft = draft.copy(uris = listOf(uri))
            page = StoryCreatePage.EDITOR
        }
    }
    val gifPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        uri?.let {
            draft = draft.copy(overlays = draft.overlays + StoryOverlayDraft(
                type = "gif", label = "", value = "", localAssetUri = it.toString()
            ))
            page = StoryCreatePage.EDITOR
        }
    }
    LaunchedEffect(Unit) {
        loadingMedia = true
        deviceMedia = loadStoryDeviceMedia(context)
        loadingMedia = false
    }
    LaunchedEffect(page) {
        if (page == StoryCreatePage.GIF && gifMedia.isEmpty()) gifMedia = loadStoryDeviceMedia(context, gifOnly = true)
    }
    BackHandler {
        when (page) {
            StoryCreatePage.GALLERY -> onBack()
            StoryCreatePage.EDITOR -> page = StoryCreatePage.GALLERY
            else -> page = StoryCreatePage.EDITOR
        }
    }

    fun addOverlay(type: String, label: String, value: String = label, prompt: String? = null, options: List<String> = emptyList()) {
        draft = draft.copy(overlays = draft.overlays + StoryOverlayDraft(type = type, label = label, value = value, prompt = prompt, options = options))
        page = StoryCreatePage.EDITOR
    }

    when (page) {
        StoryCreatePage.GALLERY -> StoryCreateGalleryPage(
            media = deviceMedia,
            loading = loadingMedia,
            selected = draft.uris,
            multiSelect = multiSelect,
            galleryMode = galleryMode,
            onGalleryMode = { galleryMode = it },
            onToggleMultiple = { multiSelect = !multiSelect },
            onBack = onBack,
            onCamera = { camera.launch(null) },
            onSystemPicker = { systemPicker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageAndVideo)) },
            onText = { draft = StoryDraft(text = "", background = "#2563EB"); page = StoryCreatePage.TEXT },
            onMusic = { page = StoryCreatePage.MUSIC },
            onCollage = { multiSelect = true; draft = draft.copy(collage = true) },
            onTemplate = { draft = StoryDraft(text = "Share a moment", background = "#7C3AED"); page = StoryCreatePage.TEXT },
            onMedia = { item ->
                val next = if (multiSelect || draft.collage) {
                    if (item.uri in draft.uris) draft.uris - item.uri else (draft.uris + item.uri).take(12)
                } else listOf(item.uri)
                draft = draft.copy(uris = next)
                if (!multiSelect && !draft.collage) page = StoryCreatePage.EDITOR
            },
            onNext = { if (draft.uris.isNotEmpty()) page = StoryCreatePage.EDITOR }
        )
        StoryCreatePage.EDITOR -> StoryEditorPage(
            repository = repository,
            draft = draft,
            publishing = publishing,
            uploadProgress = uploadProgress,
            onDraft = { draft = it },
            onBack = { page = StoryCreatePage.GALLERY },
            onTool = { page = it },
            onPublish = {
                if (!publishing && (draft.uris.isNotEmpty() || draft.text.isNotBlank() || draft.music != null)) scope.launch {
                    publishing = true
                    uploadProgress = 1
                    runCatching {
                        val uploaded = draft.uris.mapIndexed { index, uri ->
                            repository.uploadMedia(context.contentResolver, uri, "story") { fileProgress ->
                                uploadProgress = ((index * 100 + fileProgress) / draft.uris.size.coerceAtLeast(1)).coerceIn(1, 98)
                            }
                        }
                        val overlayInputs = draft.overlays.map { overlay ->
                            val assetUrl = overlay.localAssetUri?.let { local ->
                                repository.uploadMedia(context.contentResolver, Uri.parse(local), "story").url
                            }
                            overlay.asInput(assetUrl)
                        }
                        val draftMusic = draft.music
                        val common = mapOf(
                            "filter" to mapOf("name" to draft.filter),
                            "transform" to mapOf(
                                "scale" to draft.cropScale,
                                "x" to draft.cropX,
                                "y" to draft.cropY,
                                "collage" to draft.collage,
                                "trimStartMs" to draft.videoTrimStartMs,
                                "trimDurationMs" to draft.videoTrimDurationMs.coerceIn(1_000L, 60_000L)
                            ),
                            "overlays" to overlayInputs,
                            "altText" to draft.altText.takeIf { it.isNotBlank() },
                            "aiGenerated" to draft.aiGenerated,
                            "music" to draftMusic?.let { track -> mapOf(
                                "id" to track.id, "title" to track.title, "artist" to track.artist,
                                "artworkUrl" to track.artworkUrl, "streamUrl" to track.streamUrl,
                                "startMs" to draft.musicStartMs, "durationMs" to draft.musicDurationMs
                            ) }
                        )
                        val items: List<Map<String, Any?>> = when {
                            draft.collage && uploaded.isNotEmpty() -> listOf(common + mapOf(
                                "type" to "collage", "media" to mapOf("items" to uploaded.map(::storyMediaInput)), "text" to draft.text,
                                "background" to draft.background, "durationMs" to 5_000, "sortOrder" to 0
                            ))
                            uploaded.isNotEmpty() -> uploaded.mapIndexed { index, media -> common + mapOf(
                                "type" to media.type, "media" to storyMediaInput(media), "text" to draft.text,
                                "background" to draft.background,
                                "durationMs" to if (media.type == "video") draft.videoTrimDurationMs.coerceIn(1_000L, 60_000L).toInt() else 5_000,
                                "sortOrder" to index
                            ) }
                            draftMusic != null && draft.text.isBlank() -> listOf(common + mapOf(
                                "type" to "music", "media" to emptyMap<String, Any?>(),
                                "text" to "${draftMusic.title}\n${draftMusic.artist}", "background" to draft.background,
                                "durationMs" to draft.musicDurationMs.toInt(), "sortOrder" to 0
                            ))
                            else -> listOf(common + mapOf(
                                "type" to "text", "media" to emptyMap<String, Any?>(), "text" to draft.text,
                                "background" to draft.background, "durationMs" to 5_000, "sortOrder" to 0
                            ))
                        }
                        repository.createStory(
                            caption = draft.text.take(280),
                            visibility = draft.visibility,
                            customAudienceIds = emptyList(),
                            allowReplies = draft.allowReplies,
                            metadata = mapOf("source" to "android_story_editor", "collage" to draft.collage),
                            items = items
                        )
                    }.onSuccess {
                        uploadProgress = 100
                        onPublished(it)
                    }.onFailure { Toast.makeText(context, it.message ?: "Story could not be shared", Toast.LENGTH_LONG).show() }
                    publishing = false
                }
            }
        )
        StoryCreatePage.FILTERS, StoryCreatePage.EFFECTS -> StoryFilterPage(draft, onBack = { page = StoryCreatePage.EDITOR }) {
            draft = draft.copy(filter = it); page = StoryCreatePage.EDITOR
        }
        StoryCreatePage.STICKERS -> StoryStickerPage(
            onBack = { page = StoryCreatePage.EDITOR },
            onChoose = { type, label ->
                when (type) {
                    "gif" -> page = StoryCreatePage.GIF
                    "time" -> addOverlay("time", SimpleDateFormat("h:mm a", Locale.getDefault()).format(Date()))
                    "mention" -> page = StoryCreatePage.MENTION
                    "link" -> page = StoryCreatePage.LINK
                    "music" -> page = StoryCreatePage.MUSIC
                    "poll", "question", "add_yours", "thoughts", "location", "weather", "event", "donate" -> {
                        pendingStickerType = type
                        page = StoryCreatePage.STICKER_INPUT
                    }
                    else -> addOverlay(type, label)
                }
            }
        )
        StoryCreatePage.STICKER_INPUT -> StoryStickerInputPage(
            type = pendingStickerType,
            onBack = { page = StoryCreatePage.STICKERS },
            onSave = { prompt, options ->
                val label = when (pendingStickerType) {
                    "poll" -> prompt
                    "question" -> prompt
                    "add_yours" -> "Add Yours\n$prompt"
                    "location" -> "📍 $prompt"
                    "weather" -> "☁️ $prompt"
                    "event" -> "🗓️ $prompt"
                    "donate" -> "💝 $prompt"
                    else -> prompt
                }
                addOverlay(pendingStickerType, label, prompt, prompt, options)
            }
        )
        StoryCreatePage.TEXT -> StoryTextPage(
            title = "Text", initial = draft.text, hint = "Type your story",
            onBack = { page = if (draft.uris.isEmpty()) StoryCreatePage.GALLERY else StoryCreatePage.EDITOR },
            onSave = { draft = draft.copy(text = it); page = StoryCreatePage.EDITOR }
        )
        StoryCreatePage.LINK -> StoryTextPage(
            title = "Add link", initial = "", hint = "https://example.com",
            onBack = { page = StoryCreatePage.EDITOR },
            onSave = { addOverlay("link", it, it) }
        )
        StoryCreatePage.MENTION -> StoryMentionPage(repository, onBack = { page = StoryCreatePage.EDITOR }) { profile ->
            addOverlay("mention", "@${profile.username.ifBlank { profile.user.name.replace(" ", "") }}", profile.userId)
        }
        StoryCreatePage.MUSIC -> StoryMusicPage(repository, draft.music, draft.musicStartMs, onBack = {
            page = if (draft.uris.isEmpty() && draft.text.isBlank()) StoryCreatePage.GALLERY else StoryCreatePage.EDITOR
        }) { track, start ->
            draft = draft.copy(music = track, musicStartMs = start)
            page = StoryCreatePage.EDITOR
        }
        StoryCreatePage.GIF -> StoryGifPage(
            media = gifMedia,
            onBack = { page = StoryCreatePage.STICKERS },
            onBrowse = { gifPicker.launch("image/gif") },
            onSelect = { selected ->
                draft = draft.copy(overlays = draft.overlays + StoryOverlayDraft(
                    type = "gif", label = "", value = "", localAssetUri = selected.uri.toString()
                ))
                page = StoryCreatePage.EDITOR
            }
        )
        StoryCreatePage.AUDIENCE -> StoryAudiencePage(draft.visibility, draft.allowReplies, onBack = { page = StoryCreatePage.EDITOR }) { visibility, replies ->
            draft = draft.copy(visibility = visibility, allowReplies = replies); page = StoryCreatePage.EDITOR
        }
        StoryCreatePage.MORE -> StoryMorePage(draft.aiGenerated, onBack = { page = StoryCreatePage.EDITOR }, onAltText = { page = StoryCreatePage.ALT_TEXT }, onSaveMedia = {
            val uri = draft.uris.firstOrNull()
            if (uri == null) Toast.makeText(context, "Add media before saving", Toast.LENGTH_SHORT).show()
            else scope.launch { Toast.makeText(context, if (saveLocalStoryMedia(context, uri)) "Saved to gallery" else "Save failed", Toast.LENGTH_SHORT).show() }
        }) {
            draft = draft.copy(aiGenerated = it)
        }
        StoryCreatePage.ALT_TEXT -> StoryTextPage(
            title = "Alt text", initial = draft.altText, hint = "Describe this story for people using screen readers",
            onBack = { page = StoryCreatePage.MORE }, onSave = { draft = draft.copy(altText = it); page = StoryCreatePage.EDITOR }
        )
    }
}

@Composable
private fun StoryCreateGalleryPage(
    media: List<StoryDeviceMedia>,
    loading: Boolean,
    selected: List<Uri>,
    multiSelect: Boolean,
    galleryMode: String,
    onGalleryMode: (String) -> Unit,
    onToggleMultiple: () -> Unit,
    onBack: () -> Unit,
    onCamera: () -> Unit,
    onSystemPicker: () -> Unit,
    onText: () -> Unit,
    onMusic: () -> Unit,
    onCollage: () -> Unit,
    onTemplate: () -> Unit,
    onMedia: (StoryDeviceMedia) -> Unit,
    onNext: () -> Unit
) {
    Column(Modifier.fillMaxSize().background(Color.White)) {
        Row(Modifier.fillMaxWidth().statusBarsPadding().height(54.dp).padding(horizontal = 5.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) { Icon(Icons.Default.Close, "Close", modifier = Modifier.size(28.dp)) }
            Text("Create story", Modifier.weight(1f), textAlign = TextAlign.Center, fontSize = 18.sp, fontWeight = FontWeight.ExtraBold)
            if (selected.isEmpty()) IconButton(onClick = onSystemPicker) { Icon(Icons.Outlined.PhotoLibrary, "System gallery", modifier = Modifier.size(22.dp)) }
            else TextButton(onClick = onNext) { Text("Next (${selected.size})", fontWeight = FontWeight.Bold, fontSize = 12.sp) }
        }
        LazyRow(
            Modifier.fillMaxWidth().height(94.dp),
            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 7.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            item { StoryCreateMode(Icons.Outlined.TextFields, "Text", onText) }
            item { StoryCreateMode(Icons.Outlined.MusicNote, "Music", onMusic) }
            item { StoryCreateMode(Icons.Outlined.Collections, "Collage", onCollage) }
            item { StoryCreateMode(Icons.Outlined.AutoFixHigh, "Templates", onTemplate) }
        }
        Row(Modifier.fillMaxWidth().height(50.dp).padding(horizontal = 12.dp), verticalAlignment = Alignment.CenterVertically) {
            Surface(
                color = Color.Transparent,
                modifier = Modifier.clickable { onGalleryMode(if (galleryMode == "gallery") "recent" else "gallery") },
                shape = RoundedCornerShape(8.dp)
            ) {
                Row(Modifier.padding(horizontal = 5.dp, vertical = 5.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text(if (galleryMode == "gallery") "Gallery" else "Recent", fontSize = 17.sp, fontWeight = FontWeight.Bold)
                    Icon(Icons.Outlined.KeyboardArrowDown, null, modifier = Modifier.size(20.dp))
                }
            }
            Spacer(Modifier.weight(1f))
            OutlinedButton(
                onClick = onToggleMultiple,
                shape = RoundedCornerShape(20.dp),
                contentPadding = PaddingValues(horizontal = 12.dp),
                modifier = Modifier.height(37.dp),
                colors = ButtonDefaults.outlinedButtonColors(contentColor = if (multiSelect) StoryBlue else Color.Black)
            ) {
                Icon(Icons.Outlined.Collections, null, modifier = Modifier.size(17.dp))
                Text(if (multiSelect) " Multiple on" else " Select multiple", fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
            }
        }
        if (loading) Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(Modifier.size(26.dp), strokeWidth = 2.dp) }
        else if (media.isEmpty()) Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(Icons.Outlined.ImageNotSupported, null, tint = Color(0xFF98A2B3), modifier = Modifier.size(42.dp))
                Text("No photos or videos available", fontWeight = FontWeight.Bold, fontSize = 14.sp, modifier = Modifier.padding(top = 8.dp))
                TextButton(onClick = onSystemPicker) { Text("Open device gallery") }
            }
        } else LazyVerticalGrid(columns = GridCells.Fixed(3), modifier = Modifier.fillMaxSize(), horizontalArrangement = Arrangement.spacedBy(2.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            item(key = "story-camera") {
                Box(Modifier.aspectRatio(1f).background(Color(0xFFF0F2F5)).clickable(onClick = onCamera), contentAlignment = Alignment.Center) {
                    Icon(Icons.Default.CameraAlt, "Camera", modifier = Modifier.size(30.dp))
                }
            }
            items(media, key = { it.uri.toString() }) { item ->
                val selectedIndex = selected.indexOf(item.uri)
                Box(Modifier.aspectRatio(1f).background(Color.Black).clickable { onMedia(item) }) {
                    AsyncImage(item.uri, null, Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                    if (item.video) Surface(Modifier.align(Alignment.TopEnd).padding(5.dp), color = Color.Black.copy(alpha = .55f), shape = RoundedCornerShape(5.dp), tonalElevation = 0.dp) {
                        Text("VIDEO", color = Color.White, fontSize = 7.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp))
                    }
                    if (selectedIndex >= 0) Box(Modifier.fillMaxSize().background(StoryBlue.copy(alpha = .2f)).border(2.dp, StoryBlue)) {
                        Box(Modifier.align(Alignment.TopEnd).padding(5.dp).size(22.dp).background(StoryBlue, CircleShape), contentAlignment = Alignment.Center) {
                            Text((selectedIndex + 1).toString(), color = Color.White, fontWeight = FontWeight.Bold, fontSize = 10.sp)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun StoryCreateMode(icon: androidx.compose.ui.graphics.vector.ImageVector, label: String, onClick: () -> Unit) {
    Surface(
        modifier = Modifier.width(96.dp).fillMaxHeight().clickable(onClick = onClick),
        color = Color.White,
        shape = RoundedCornerShape(13.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE3E5E9)),
        tonalElevation = 0.dp
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
            Icon(icon, null, modifier = Modifier.size(25.dp))
            Text(label, fontSize = 11.sp, modifier = Modifier.padding(top = 5.dp))
        }
    }
}

@Composable
private fun StoryEditorPage(
    repository: SocialRepository,
    draft: StoryDraft,
    publishing: Boolean,
    uploadProgress: Int,
    onDraft: (StoryDraft) -> Unit,
    onBack: () -> Unit,
    onTool: (StoryCreatePage) -> Unit,
    onPublish: () -> Unit
) {
    val context = LocalContext.current
    val firstUri = draft.uris.firstOrNull()
    val firstMime = remember(firstUri) { firstUri?.let { context.contentResolver.getType(it).orEmpty() }.orEmpty() }
    val isVideo = firstUri != null && firstMime.startsWith("video/")
    var cropScale by remember(draft.cropScale) { mutableFloatStateOf(draft.cropScale) }
    var cropX by remember(draft.cropX) { mutableFloatStateOf(draft.cropX) }
    var cropY by remember(draft.cropY) { mutableFloatStateOf(draft.cropY) }
    LaunchedEffect(firstUri, firstMime) {
        if (firstUri != null && isVideo) {
            val duration = storyVideoDurationMs(context, firstUri)
            if (duration > 0L) onDraft(
                draft.copy(
                    videoDurationMs = duration,
                    videoTrimStartMs = 0L,
                    videoTrimDurationMs = duration.coerceIn(1_000L, 60_000L)
                )
            )
        }
    }
    Box(Modifier.fillMaxSize().background(Color.Black).statusBarsPadding().navigationBarsPadding()) {
        Box(
            Modifier.fillMaxSize().padding(top = 4.dp, bottom = 106.dp).clip(RoundedCornerShape(20.dp)).background(Color.Black)
                .pointerInput(firstUri) {
                    detectTransformGestures { _, pan, zoom, _ ->
                        cropScale = (cropScale * zoom).coerceIn(1f, 4f)
                        cropX = (cropX + pan.x / size.width.coerceAtLeast(1)).coerceIn(-1f, 1f)
                        cropY = (cropY + pan.y / size.height.coerceAtLeast(1)).coerceIn(-1f, 1f)
                        onDraft(draft.copy(cropScale = cropScale, cropX = cropX, cropY = cropY))
                    }
                },
            contentAlignment = Alignment.Center
        ) {
            when {
                draft.collage && draft.uris.isNotEmpty() -> StoryCollagePreview(draft.uris, draft.filter)
                firstUri != null && firstMime.startsWith("video/") -> StoryVideoPlayer(
                    firstUri.toString(),
                    paused = false,
                    modifier = Modifier.fillMaxSize(),
                    clipStartMs = draft.videoTrimStartMs,
                    clipDurationMs = draft.videoTrimDurationMs
                )
                firstUri != null -> AsyncImage(
                    firstUri,
                    "Story preview",
                    Modifier.fillMaxSize().graphicsLayer {
                        scaleX = cropScale; scaleY = cropScale
                        translationX = cropX * size.width; translationY = cropY * size.height
                    },
                    contentScale = ContentScale.Crop,
                    colorFilter = storyFilter(draft.filter)
                )
                else -> Box(
                    Modifier.fillMaxSize().background(runCatching { Color(android.graphics.Color.parseColor(draft.background)) }.getOrDefault(Color(0xFF2563EB))),
                    contentAlignment = Alignment.Center
                ) {
                    Text(draft.text.ifBlank { "Tap Text to write" }, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 28.sp, lineHeight = 34.sp, textAlign = TextAlign.Center, modifier = Modifier.padding(28.dp))
                }
            }
            if (firstUri != null && draft.text.isNotBlank()) Text(
                draft.text, color = Color.White, fontSize = 22.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center,
                modifier = Modifier.align(Alignment.Center).widthIn(max = 300.dp).background(Color.Black.copy(alpha = .36f), RoundedCornerShape(8.dp)).padding(8.dp)
            )
            StoryOverlayCanvas(draft.overlays) { updated -> onDraft(draft.copy(overlays = updated)) }
            draft.music?.let { track ->
                Surface(
                    modifier = Modifier.align(Alignment.TopCenter).padding(top = 13.dp),
                    color = Color(0xFF26384A).copy(alpha = .87f),
                    shape = RoundedCornerShape(22.dp),
                    tonalElevation = 0.dp
                ) {
                    Row(Modifier.padding(horizontal = 10.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                        AsyncImage(track.artworkUrl, null, Modifier.size(25.dp).clip(CircleShape), contentScale = ContentScale.Crop)
                        Icon(Icons.Default.MusicNote, null, tint = Color.White, modifier = Modifier.padding(start = 6.dp).size(14.dp))
                        Column(Modifier.padding(start = 5.dp).widthIn(max = 155.dp)) {
                            Text(track.title, color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                            Text(track.artist, color = Color.White.copy(alpha = .72f), fontSize = 8.sp, maxLines = 1)
                        }
                        IconButton(onClick = { onDraft(draft.copy(music = null)) }, modifier = Modifier.size(27.dp)) { Icon(Icons.Default.Close, "Remove music", tint = Color.White, modifier = Modifier.size(16.dp)) }
                    }
                }
            }
        }
        Row(Modifier.align(Alignment.TopCenter).fillMaxWidth().padding(top = 5.dp, start = 5.dp, end = 5.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack, enabled = !publishing, modifier = Modifier.size(42.dp).background(Color.Black.copy(alpha = .45f), CircleShape)) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back", tint = Color.White) }
            Spacer(Modifier.weight(1f))
            IconButton(onClick = { onTool(StoryCreatePage.MORE) }, enabled = !publishing, modifier = Modifier.size(42.dp).background(Color.Black.copy(alpha = .45f), CircleShape)) { Icon(Icons.Default.MoreHoriz, "More", tint = Color.White) }
        }
        Column(Modifier.align(Alignment.BottomCenter).fillMaxWidth().background(Color.Black)) {
            if (isVideo && draft.videoDurationMs > 0L) StoryVideoTrimControl(draft) { start, duration ->
                onDraft(draft.copy(videoTrimStartMs = start, videoTrimDurationMs = duration))
            }
            LazyRow(
                Modifier.fillMaxWidth().height(62.dp),
                contentPadding = PaddingValues(horizontal = 10.dp),
                horizontalArrangement = Arrangement.spacedBy(5.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                item { StoryEditorTool(Icons.Default.MusicNote, "Music") { onTool(StoryCreatePage.MUSIC) } }
                item { StoryEditorTool(Icons.Outlined.EmojiEmotions, "Stickers") { onTool(StoryCreatePage.STICKERS) } }
                item { StoryEditorTool(Icons.Default.TextFields, "Text") { onTool(StoryCreatePage.TEXT) } }
                item { StoryEditorTool(Icons.Default.AutoAwesome, "Effects") { onTool(StoryCreatePage.EFFECTS) } }
                item { StoryEditorTool(Icons.Default.AlternateEmail, "Mention") { onTool(StoryCreatePage.MENTION) } }
                item { StoryEditorTool(Icons.Default.Link, "Link") { onTool(StoryCreatePage.LINK) } }
                item { StoryEditorTool(Icons.Default.Brush, "Filters") { onTool(StoryCreatePage.FILTERS) } }
            }
            if (publishing) Column(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 2.dp)) {
                LinearProgressIndicator(progress = { uploadProgress.coerceIn(0, 100) / 100f }, Modifier.fillMaxWidth().height(3.dp), color = StoryBlue, trackColor = Color.White.copy(alpha = .2f))
                Text("Sharing story $uploadProgress%", color = Color.White.copy(alpha = .8f), fontSize = 9.sp, modifier = Modifier.padding(top = 3.dp))
            }
            Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 7.dp), verticalAlignment = Alignment.CenterVertically) {
                Surface(
                    color = Color.White.copy(alpha = .12f), shape = RoundedCornerShape(20.dp), tonalElevation = 0.dp,
                    modifier = Modifier.height(38.dp).clickable(enabled = !publishing) { onTool(StoryCreatePage.AUDIENCE) }
                ) {
                    Row(Modifier.padding(horizontal = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(if (draft.visibility == "private") Icons.Default.Lock else if (draft.visibility == "followers") Icons.Default.Groups else Icons.Default.Public, null, tint = Color.White, modifier = Modifier.size(16.dp))
                        Text(when (draft.visibility) { "private" -> "Only me"; "followers" -> "Followers"; else -> "Public" }, color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(start = 5.dp))
                    }
                }
                Spacer(Modifier.weight(1f))
                Button(
                    onClick = onPublish,
                    enabled = !publishing && (draft.uris.isNotEmpty() || draft.text.isNotBlank() || draft.music != null),
                    shape = RoundedCornerShape(9.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = StoryBlue),
                    modifier = Modifier.height(42.dp),
                    contentPadding = PaddingValues(horizontal = 23.dp)
                ) {
                    if (publishing) CircularProgressIndicator(Modifier.size(17.dp), color = Color.White, strokeWidth = 2.dp)
                    else { Icon(Icons.Default.Share, null, modifier = Modifier.size(17.dp)); Text(" Share", fontWeight = FontWeight.Bold, fontSize = 12.sp) }
                }
            }
        }
    }
}

@Composable
private fun StoryVideoTrimControl(draft: StoryDraft, onChange: (Long, Long) -> Unit) {
    val totalSeconds = (draft.videoDurationMs / 1_000f).coerceAtLeast(1f)
    val startSeconds = (draft.videoTrimStartMs / 1_000f).coerceIn(0f, totalSeconds - .5f)
    val endSeconds = ((draft.videoTrimStartMs + draft.videoTrimDurationMs) / 1_000f)
        .coerceIn((startSeconds + .5f).coerceAtMost(totalSeconds), totalSeconds)
    Column(Modifier.fillMaxWidth().padding(horizontal = 13.dp, vertical = 5.dp)) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Default.ContentCut, "Trim video", tint = Color.White, modifier = Modifier.size(15.dp))
            Text("Video clip", color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(start = 5.dp))
            Spacer(Modifier.weight(1f))
            Text("${storyDurationLabel(startSeconds)} – ${storyDurationLabel(endSeconds)} · max 1:00", color = Color.White.copy(alpha = .76f), fontSize = 9.sp)
        }
        RangeSlider(
            value = startSeconds..endSeconds,
            onValueChange = { selected ->
                val start = selected.start.coerceIn(0f, totalSeconds - .5f)
                val end = selected.endInclusive.coerceIn(start + .5f, totalSeconds)
                val cappedEnd = minOf(end, start + 60f)
                onChange((start * 1_000).toLong(), ((cappedEnd - start) * 1_000).toLong().coerceIn(1_000L, 60_000L))
            },
            valueRange = 0f..totalSeconds,
            modifier = Modifier.fillMaxWidth().height(30.dp)
        )
    }
}

private fun storyDurationLabel(seconds: Float): String {
    val total = seconds.toInt().coerceAtLeast(0)
    return "%d:%02d".format(Locale.getDefault(), total / 60, total % 60)
}

@Composable
private fun StoryEditorTool(icon: androidx.compose.ui.graphics.vector.ImageVector, label: String, onClick: () -> Unit) {
    Column(Modifier.width(56.dp).clickable(onClick = onClick), horizontalAlignment = Alignment.CenterHorizontally) {
        Box(Modifier.size(35.dp).background(Color.White.copy(alpha = .13f), CircleShape), contentAlignment = Alignment.Center) { Icon(icon, label, tint = Color.White, modifier = Modifier.size(19.dp)) }
        Text(label, color = Color.White, fontSize = 8.sp, modifier = Modifier.padding(top = 3.dp), maxLines = 1)
    }
}

@Composable
private fun StoryCollagePreview(uris: List<Uri>, filter: String) {
    val shown = uris.take(6)
    Column(Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(2.dp)) {
        shown.chunked(2).forEach { row ->
            Row(Modifier.fillMaxWidth().weight(1f), horizontalArrangement = Arrangement.spacedBy(2.dp)) {
                row.forEach { uri -> AsyncImage(uri, null, Modifier.weight(1f).fillMaxHeight(), contentScale = ContentScale.Crop, colorFilter = storyFilter(filter)) }
                if (row.size == 1) Spacer(Modifier.weight(1f))
            }
        }
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun BoxScope.StoryOverlayCanvas(overlays: List<StoryOverlayDraft>, onChange: (List<StoryOverlayDraft>) -> Unit) {
    overlays.forEach { overlay ->
        var x by remember(overlay.id, overlay.x) { mutableFloatStateOf(overlay.x) }
        var y by remember(overlay.id, overlay.y) { mutableFloatStateOf(overlay.y) }
        var scale by remember(overlay.id, overlay.scale) { mutableFloatStateOf(overlay.scale) }
        Surface(
            modifier = Modifier.align(Alignment.Center).offset(x = ((x - .5f) * 310f).dp, y = ((y - .5f) * 520f).dp)
                .graphicsLayer { scaleX = scale; scaleY = scale; rotationZ = overlay.rotation }
                .pointerInput(overlay.id) {
                    detectTransformGestures { _, pan, zoom, _ ->
                        x = (x + pan.x / 360f).coerceIn(.05f, .95f)
                        y = (y + pan.y / 650f).coerceIn(.05f, .95f)
                        scale = (scale * zoom).coerceIn(.55f, 2.5f)
                        onChange(overlays.map { if (it.id == overlay.id) it.copy(x = x, y = y, scale = scale) else it })
                    }
                }
                .combinedClickable(onClick = {}, onLongClick = { onChange(overlays.filterNot { it.id == overlay.id }) }),
            color = when (overlay.type) {
                "poll", "question", "add_yours" -> Color.White
                "mention", "link", "location", "music" -> Color.Black.copy(alpha = .62f)
                else -> Color.Transparent
            },
            shape = RoundedCornerShape(12.dp),
            tonalElevation = 0.dp
        ) {
            Text(
                overlay.label,
                color = if (overlay.type in listOf("poll", "question", "add_yours")) Color.Black else Color.White,
                fontSize = if (overlay.type == "emoji") 36.sp else 15.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                textAlign = TextAlign.Center
            )
        }
    }
}

@Composable
private fun StoryFilterPage(draft: StoryDraft, onBack: () -> Unit, onSelect: (String) -> Unit) {
    val filters = listOf(
        "original" to "Original", "warm" to "Warm", "cool" to "Cool", "vivid" to "Vivid",
        "mono" to "Mono", "fade" to "Fade", "contrast" to "Contrast"
    )
    var selected by remember(draft.filter) { mutableStateOf(draft.filter) }
    Column(Modifier.fillMaxSize().background(Color.Black).statusBarsPadding().navigationBarsPadding()) {
        Box(Modifier.weight(1f).fillMaxWidth().padding(6.dp).clip(RoundedCornerShape(20.dp)).background(Color(0xFF15171A)), contentAlignment = Alignment.Center) {
            val uri = draft.uris.firstOrNull()
            if (uri != null) AsyncImage(uri, "Filter preview", Modifier.fillMaxSize(), contentScale = ContentScale.Crop, colorFilter = storyFilter(selected))
            else Box(Modifier.fillMaxSize().background(runCatching { Color(android.graphics.Color.parseColor(draft.background)) }.getOrDefault(Color.DarkGray)), contentAlignment = Alignment.Center) {
                Text(draft.text.ifBlank { "Story" }, color = Color.White, fontSize = 26.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center)
            }
        }
        LazyRow(
            Modifier.fillMaxWidth().height(95.dp),
            contentPadding = PaddingValues(horizontal = 14.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(13.dp)
        ) {
            items(filters, key = { it.first }) { (id, name) ->
                Column(Modifier.width(59.dp).clickable { selected = id }, horizontalAlignment = Alignment.CenterHorizontally) {
                    Box(Modifier.size(52.dp).border(if (selected == id) 2.5.dp else 1.dp, if (selected == id) Color.White else Color.White.copy(alpha = .4f), CircleShape).padding(3.dp).clip(CircleShape)) {
                        val uri = draft.uris.firstOrNull()
                        if (uri != null) AsyncImage(uri, name, Modifier.fillMaxSize(), contentScale = ContentScale.Crop, colorFilter = storyFilter(id))
                        else Box(Modifier.fillMaxSize().background(runCatching { Color(android.graphics.Color.parseColor(draft.background)) }.getOrDefault(Color.DarkGray)))
                    }
                    Text(name, color = Color.White, fontSize = 8.sp, maxLines = 1, modifier = Modifier.padding(top = 3.dp))
                }
            }
        }
        Row(Modifier.fillMaxWidth().padding(horizontal = 18.dp, vertical = 8.dp), horizontalArrangement = Arrangement.SpaceBetween) {
            IconButton(onClick = onBack, modifier = Modifier.size(48.dp).background(Color.White.copy(alpha = .12f), CircleShape)) { Icon(Icons.Default.Close, "Cancel", tint = Color.White, modifier = Modifier.size(28.dp)) }
            IconButton(onClick = { onSelect(selected) }, modifier = Modifier.size(48.dp).background(StoryBlue, CircleShape)) { Icon(Icons.Default.Check, "Apply", tint = Color.White, modifier = Modifier.size(28.dp)) }
        }
    }
}

@Composable
private fun StoryStickerPage(onBack: () -> Unit, onChoose: (String, String) -> Unit) {
    val tools = listOf(
        Triple("thoughts", "Thoughts", "💭"), Triple("add_yours", "Add Yours", "📷"), Triple("location", "Location", "📍"),
        Triple("weather", "Weather", "☁️"), Triple("time", "Time", "🕒"), Triple("gif", "GIF", "GIF"),
        Triple("music", "Music", "🎵"), Triple("event", "Event", "🗓️"), Triple("mention", "Tag", "@"),
        Triple("donate", "Donate", "💝"), Triple("poll", "Poll", "📊"), Triple("question", "Question", "❓"),
        Triple("link", "Link", "🔗")
    )
    val emoji = listOf("❤️", "😂", "😮", "😢", "😡", "👍", "🔥", "⚽", "🎉", "✨", "💯", "🥳")
    Column(Modifier.fillMaxSize().background(Color(0xFF232527)).statusBarsPadding().navigationBarsPadding()) {
        StoryPageHeader("Stickers", onBack)
        LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(horizontal = 12.dp, vertical = 12.dp)) {
            item {
                LazyVerticalGrid(
                    columns = GridCells.Fixed(3),
                    modifier = Modifier.fillMaxWidth().heightIn(min = 270.dp, max = 390.dp),
                    userScrollEnabled = false,
                    horizontalArrangement = Arrangement.spacedBy(9.dp),
                    verticalArrangement = Arrangement.spacedBy(9.dp)
                ) {
                    items(tools) { (type, label, symbol) ->
                        Surface(
                            modifier = Modifier.height(54.dp).clickable { onChoose(type, if (type in listOf("poll", "question", "thoughts", "add_yours", "location", "weather", "event", "donate")) label else symbol) },
                            color = Color.White,
                            shape = RoundedCornerShape(12.dp),
                            tonalElevation = 0.dp
                        ) {
                            Row(Modifier.padding(horizontal = 9.dp), verticalAlignment = Alignment.CenterVertically) {
                                Text(symbol, fontSize = if (symbol.length > 2) 11.sp else 18.sp, fontWeight = FontWeight.Bold)
                                Text(label, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(start = 5.dp), maxLines = 1)
                            }
                        }
                    }
                }
            }
            item { HorizontalDivider(color = Color.White.copy(alpha = .22f), modifier = Modifier.padding(vertical = 16.dp)) }
            item { Text("Quick reactions", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp, modifier = Modifier.padding(bottom = 10.dp)) }
            item {
                LazyRow(horizontalArrangement = Arrangement.spacedBy(13.dp)) {
                    items(emoji) { value -> Text(value, fontSize = 36.sp, modifier = Modifier.clickable { onChoose("emoji", value) }.padding(3.dp)) }
                }
            }
        }
    }
}

@Composable
private fun StoryGifPage(
    media: List<StoryDeviceMedia>,
    onBack: () -> Unit,
    onBrowse: () -> Unit,
    onSelect: (StoryDeviceMedia) -> Unit
) {
    Column(Modifier.fillMaxSize().background(Color.White).navigationBarsPadding()) {
        StoryPageHeader("GIF", onBack)
        Row(
            Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(Icons.Default.GifBox, null, tint = StoryPink, modifier = Modifier.size(22.dp))
            Text("Choose a GIF", fontSize = 14.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
            OutlinedButton(onClick = onBrowse, contentPadding = PaddingValues(horizontal = 11.dp, vertical = 4.dp)) {
                Icon(Icons.Outlined.PhotoLibrary, null, modifier = Modifier.size(16.dp))
                Text("Browse", fontSize = 11.sp, modifier = Modifier.padding(start = 4.dp))
            }
        }
        if (media.isEmpty()) {
            Column(
                Modifier.fillMaxSize().padding(28.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Icon(Icons.Outlined.ImageNotSupported, null, tint = Color(0xFF98A2B3), modifier = Modifier.size(36.dp))
                Text("No GIFs found on this device", color = Color(0xFF667085), fontSize = 13.sp, modifier = Modifier.padding(top = 10.dp))
                TextButton(onClick = onBrowse) { Text("Browse files") }
            }
        } else {
            LazyVerticalGrid(
                columns = GridCells.Fixed(3),
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(2.dp),
                horizontalArrangement = Arrangement.spacedBy(2.dp),
                verticalArrangement = Arrangement.spacedBy(2.dp)
            ) {
                items(media, key = { it.uri.toString() }) { item ->
                    Box(Modifier.aspectRatio(1f).background(Color(0xFFEFF1F4)).clickable { onSelect(item) }) {
                        AsyncImage(item.uri, "GIF", Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                        Surface(
                            Modifier.align(Alignment.BottomEnd).padding(4.dp),
                            color = Color.Black.copy(alpha = .58f),
                            shape = RoundedCornerShape(4.dp),
                            tonalElevation = 0.dp
                        ) { Text("GIF", color = Color.White, fontSize = 8.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)) }
                    }
                }
            }
        }
    }
}

@Composable
private fun StoryStickerInputPage(type: String, onBack: () -> Unit, onSave: (String, List<String>) -> Unit) {
    var prompt by remember(type) { mutableStateOf("") }
    var first by remember(type) { mutableStateOf("Yes") }
    var second by remember(type) { mutableStateOf("No") }
    val title = when (type) {
        "poll" -> "Create poll"
        "question" -> "Ask a question"
        "add_yours" -> "Add Yours prompt"
        "location" -> "Add location"
        "weather" -> "Add weather"
        "event" -> "Add event"
        "donate" -> "Donation message"
        else -> "Add thoughts"
    }
    Column(Modifier.fillMaxSize().background(Color.White).imePadding()) {
        StoryPageHeader(title, onBack, "Add", prompt.isNotBlank() && (type != "poll" || (first.isNotBlank() && second.isNotBlank()))) {
            onSave(prompt.trim(), if (type == "poll") listOf(first.trim(), second.trim()).distinct() else emptyList())
        }
        OutlinedTextField(
            prompt, { prompt = it.take(220) },
            label = { Text(if (type == "location") "Place" else if (type == "weather") "Weather, for example 28°C" else "Prompt") },
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            minLines = if (type in listOf("question", "add_yours", "thoughts")) 3 else 1
        )
        if (type == "poll") {
            Text("Poll choices", fontWeight = FontWeight.Bold, fontSize = 13.sp, modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp))
            OutlinedTextField(first, { first = it.take(60) }, label = { Text("Choice 1") }, singleLine = true, modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp))
            OutlinedTextField(second, { second = it.take(60) }, label = { Text("Choice 2") }, singleLine = true, modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp))
        }
        Text("This sticker response is saved by Tiwi's Story API and can be changed while the story is active.", color = Color(0xFF667085), fontSize = 10.sp, lineHeight = 14.sp, modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp))
    }
}

@Composable
private fun StoryTextPage(title: String, initial: String, hint: String, onBack: () -> Unit, onSave: (String) -> Unit) {
    var value by remember(initial) { mutableStateOf(initial) }
    Column(Modifier.fillMaxSize().background(Color.White).imePadding()) {
        StoryPageHeader(title, onBack, "Done", value.isNotBlank()) { onSave(value.trim()) }
        Box(Modifier.fillMaxSize().padding(18.dp), contentAlignment = Alignment.TopStart) {
            if (value.isBlank()) Text(hint, color = Color(0xFF98A2B3), fontSize = 18.sp)
            BasicTextField(value, { value = it.take(2_000) }, Modifier.fillMaxWidth(), textStyle = MaterialTheme.typography.bodyLarge.copy(color = Color.Black, fontSize = 18.sp, lineHeight = 25.sp))
        }
    }
}

@Composable
private fun StoryMentionPage(repository: SocialRepository, onBack: () -> Unit, onSelect: (SocialProfile) -> Unit) {
    var query by remember { mutableStateOf("") }
    var profiles by remember { mutableStateOf<List<SocialProfile>>(emptyList()) }
    var loading by remember { mutableStateOf(false) }
    LaunchedEffect(query) {
        delay(250)
        loading = true
        profiles = runCatching { repository.searchProfiles(query) }.getOrDefault(emptyList())
        loading = false
    }
    Column(Modifier.fillMaxSize().background(Color.White)) {
        StoryPageHeader("Mention people", onBack)
        Surface(Modifier.fillMaxWidth().padding(12.dp).height(40.dp), color = Color(0xFFF0F2F5), shape = RoundedCornerShape(20.dp), tonalElevation = 0.dp) {
            Row(Modifier.padding(horizontal = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.Search, null, tint = Color(0xFF667085), modifier = Modifier.size(18.dp))
                BasicTextField(query, { query = it.take(60) }, Modifier.weight(1f).padding(start = 8.dp), singleLine = true, decorationBox = { inner -> if (query.isBlank()) Text("Search people", color = Color(0xFF667085), fontSize = 13.sp); inner() })
            }
        }
        if (loading) LinearProgressIndicator(Modifier.fillMaxWidth().height(2.dp))
        LazyColumn(Modifier.fillMaxSize()) {
            items(profiles, key = { it.userId }) { profile ->
                Row(Modifier.fillMaxWidth().clickable { onSelect(profile) }.padding(horizontal = 14.dp, vertical = 9.dp), verticalAlignment = Alignment.CenterVertically) {
                    AsyncImage(profile.user.avatar, null, Modifier.size(44.dp).clip(CircleShape).background(Color(0xFFE9ECF1)), contentScale = ContentScale.Crop)
                    Column(Modifier.weight(1f).padding(start = 10.dp)) {
                        Text(profile.user.name, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        Text("@${profile.username}", color = Color(0xFF667085), fontSize = 10.sp)
                    }
                    Icon(Icons.Default.AlternateEmail, null, tint = StoryBlue, modifier = Modifier.size(19.dp))
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun StoryMusicPage(
    repository: SocialRepository,
    selected: SocialStoryMusicTrack?,
    selectedStartMs: Long,
    onBack: () -> Unit,
    onSelect: (SocialStoryMusicTrack, Long) -> Unit
) {
    var query by remember { mutableStateOf("") }
    var tracks by remember { mutableStateOf<List<SocialStoryMusicTrack>>(emptyList()) }
    var loading by remember { mutableStateOf(false) }
    var active by remember(selected) { mutableStateOf(selected) }
    var range by remember(selected, selectedStartMs) {
        mutableStateOf(selectedStartMs / 1000f..((selectedStartMs + 15_000L) / 1000f))
    }
    var playingId by remember { mutableStateOf<String?>(null) }
    val context = LocalContext.current
    var player by remember { mutableStateOf<MediaPlayer?>(null) }
    fun stopPreview() { runCatching { player?.stop() }; player?.release(); player = null; playingId = null }
    DisposableEffect(Unit) { onDispose(::stopPreview) }
    LaunchedEffect(query) {
        delay(300)
        loading = true
        tracks = runCatching { repository.storyMusic(query, 40) }.getOrDefault(emptyList())
        loading = false
    }
    Column(Modifier.fillMaxSize().background(Color.White)) {
        StoryPageHeader("Music", onBack, action = active?.let { "Done" }, actionEnabled = active != null) {
            active?.let { onSelect(it, (range.start * 1000).toLong()) }
        }
        Surface(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp).height(40.dp), color = Color(0xFFF0F2F5), shape = RoundedCornerShape(20.dp), tonalElevation = 0.dp) {
            Row(Modifier.padding(horizontal = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.Search, null, tint = Color(0xFF667085), modifier = Modifier.size(18.dp))
                BasicTextField(query, { query = it.take(80) }, Modifier.weight(1f).padding(start = 8.dp), singleLine = true, decorationBox = { inner -> if (query.isBlank()) Text("Search music", color = Color(0xFF667085), fontSize = 13.sp); inner() })
            }
        }
        if (loading) LinearProgressIndicator(Modifier.fillMaxWidth().height(2.dp))
        active?.let { track ->
            Column(Modifier.fillMaxWidth().background(Color(0xFFF7F9FC)).padding(horizontal = 14.dp, vertical = 9.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    AsyncImage(track.artworkUrl, null, Modifier.size(42.dp).clip(RoundedCornerShape(7.dp)), contentScale = ContentScale.Crop)
                    Column(Modifier.weight(1f).padding(start = 9.dp)) {
                        Text(track.title, fontWeight = FontWeight.Bold, fontSize = 12.sp, maxLines = 1)
                        Text("${track.artist} · choose a 15 second clip", color = Color(0xFF667085), fontSize = 9.sp, maxLines = 1)
                    }
                }
                val max = track.durationSeconds.coerceAtLeast(15).toFloat()
                RangeSlider(
                    value = range.start.coerceIn(0f, max)..range.endInclusive.coerceIn(0f, max),
                    onValueChange = { candidate ->
                        val start = candidate.start.coerceIn(0f, (max - 1f).coerceAtLeast(0f))
                        range = start..(start + 15f).coerceAtMost(max)
                    },
                    valueRange = 0f..max,
                    modifier = Modifier.fillMaxWidth().height(32.dp)
                )
                Text("${range.start.toInt()}s – ${range.endInclusive.toInt()}s", color = StoryBlue, fontSize = 9.sp, fontWeight = FontWeight.Bold)
            }
        }
        LazyColumn(Modifier.fillMaxSize()) {
            items(tracks, key = { it.id }) { track ->
                Row(Modifier.fillMaxWidth().clickable { active = track; range = 0f..minOf(15f, track.durationSeconds.toFloat()) }.padding(horizontal = 13.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(45.dp).clip(RoundedCornerShape(8.dp)).background(Color(0xFFE9ECF1))) {
                        AsyncImage(track.artworkUrl, null, Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                        IconButton(onClick = {
                            if (playingId == track.id) stopPreview()
                            else {
                                stopPreview()
                                runCatching {
                                    MediaPlayer().apply {
                                        setDataSource(track.streamUrl)
                                        setOnPreparedListener { prepared -> prepared.seekTo((range.start * 1000).toInt()); prepared.start(); playingId = track.id }
                                        setOnCompletionListener { stopPreview() }
                                        prepareAsync()
                                        player = this
                                    }
                                }.onFailure { Toast.makeText(context, "Preview unavailable", Toast.LENGTH_SHORT).show() }
                            }
                        }, modifier = Modifier.align(Alignment.Center).size(34.dp).background(Color.Black.copy(alpha = .45f), CircleShape)) {
                            Icon(if (playingId == track.id) Icons.Default.Pause else Icons.Default.PlayArrow, "Preview", tint = Color.White, modifier = Modifier.size(20.dp))
                        }
                    }
                    Column(Modifier.weight(1f).padding(start = 10.dp)) {
                        Text(track.title, fontWeight = FontWeight.Bold, fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Text(track.artist, color = Color(0xFF667085), fontSize = 10.sp, maxLines = 1)
                    }
                    if (active?.id == track.id) Icon(Icons.Default.Check, null, tint = StoryBlue)
                }
            }
            if (!loading && tracks.isEmpty()) item {
                Column(Modifier.fillParentMaxHeight(.65f).fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                    Icon(Icons.Outlined.MusicNote, null, tint = Color(0xFF98A2B3), modifier = Modifier.size(42.dp))
                    Text("No music found", fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 8.dp))
                    Text("Try another artist, title, or genre.", color = Color(0xFF667085), fontSize = 11.sp)
                }
            }
        }
    }
}

@Composable
private fun StoryAudiencePage(selected: String, replies: Boolean, onBack: () -> Unit, onSave: (String, Boolean) -> Unit) {
    var visibility by remember(selected) { mutableStateOf(selected) }
    var allowReplies by remember(replies) { mutableStateOf(replies) }
    Column(Modifier.fillMaxSize().background(Color.White)) {
        StoryPageHeader("Story privacy", onBack, "Done") { onSave(visibility, allowReplies) }
        Text("Who can see your story", fontWeight = FontWeight.Bold, fontSize = 14.sp, modifier = Modifier.padding(horizontal = 16.dp, vertical = 13.dp))
        listOf(
            Triple("public", "Public", "Anyone on Tiwi can see it"),
            Triple("followers", "Followers", "Only people who follow you"),
            Triple("connections", "Connections", "People you mutually follow"),
            Triple("private", "Only me", "Keep this story private")
        ).forEach { (id, title, subtitle) ->
            Row(Modifier.fillMaxWidth().clickable { visibility = id }.padding(horizontal = 16.dp, vertical = 11.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(34.dp).background(if (visibility == id) Color(0xFFE7F3FF) else Color(0xFFF0F2F5), CircleShape), contentAlignment = Alignment.Center) {
                    Icon(when (id) { "private" -> Icons.Default.Lock; "public" -> Icons.Default.Public; else -> Icons.Default.Groups }, null, tint = if (visibility == id) StoryBlue else Color.Black, modifier = Modifier.size(19.dp))
                }
                Column(Modifier.weight(1f).padding(start = 10.dp)) { Text(title, fontWeight = FontWeight.Bold, fontSize = 13.sp); Text(subtitle, color = Color(0xFF667085), fontSize = 10.sp) }
                Box(Modifier.size(19.dp).border(2.dp, if (visibility == id) StoryBlue else Color(0xFF98A2B3), CircleShape).padding(3.dp)) { if (visibility == id) Box(Modifier.fillMaxSize().background(StoryBlue, CircleShape)) }
            }
        }
        HorizontalDivider(color = Color(0xFFE4E7EC), modifier = Modifier.padding(vertical = 8.dp))
        Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 9.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) { Text("Allow replies", fontWeight = FontWeight.Bold, fontSize = 13.sp); Text("Viewers can reply privately in Messenger", color = Color(0xFF667085), fontSize = 10.sp) }
            Switch(allowReplies, { allowReplies = it })
        }
    }
}

@Composable
private fun StoryMorePage(aiGenerated: Boolean, onBack: () -> Unit, onAltText: () -> Unit, onSaveMedia: () -> Unit, onAiChanged: (Boolean) -> Unit) {
    var ai by remember(aiGenerated) { mutableStateOf(aiGenerated) }
    Column(Modifier.fillMaxSize().background(Color.White)) {
        StoryPageHeader("Story options", onBack)
        StoryOptionRow(Icons.Default.Download, "Save draft media", "Keep a copy in the Tiwi gallery folder", onSaveMedia)
        StoryOptionRow(Icons.Default.Add, "Write alt text", "Describe visual content for accessibility", onAltText)
        Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(35.dp).background(Color(0xFFF0F2F5), CircleShape), contentAlignment = Alignment.Center) { Icon(Icons.Default.AutoAwesome, null, modifier = Modifier.size(19.dp)) }
            Column(Modifier.weight(1f).padding(start = 11.dp)) {
                Text("Add AI label", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                Text("Label realistic content created or heavily edited with AI", color = Color(0xFF667085), fontSize = 10.sp)
            }
            Switch(ai, { ai = it; onAiChanged(it) })
        }
    }
}

@Composable
private fun StoryOptionRow(icon: androidx.compose.ui.graphics.vector.ImageVector, title: String, subtitle: String, onClick: () -> Unit) {
    Row(Modifier.fillMaxWidth().clickable(onClick = onClick).padding(horizontal = 16.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(35.dp).background(Color(0xFFF0F2F5), CircleShape), contentAlignment = Alignment.Center) { Icon(icon, null, modifier = Modifier.size(19.dp)) }
        Column(Modifier.weight(1f).padding(start = 11.dp)) { Text(title, fontWeight = FontWeight.Bold, fontSize = 13.sp); Text(subtitle, color = Color(0xFF667085), fontSize = 10.sp) }
    }
}

private data class StoryFrame(val story: SocialStory, val item: SocialStoryItem)

private fun SocialStoryGroup.frames(): List<StoryFrame> = stories.sortedBy { it.createdAt }.flatMap { story ->
    story.items.filter { it.status == "active" }.sortedBy { it.sortOrder }.map { StoryFrame(story, it) }
}

private fun overlayString(value: Any?, key: String): String? = (value as? Map<*, *>)?.get(key)?.toString()
private fun overlayNumber(value: Any?, key: String): Float? = ((value as? Map<*, *>)?.get(key) as? Number)?.toFloat()

private fun storyFilterName(value: Map<String, Any?>): String = value["name"]?.toString().orEmpty().ifBlank { "original" }

private fun storyMediaFromMap(value: Map<String, Any?>): SocialMedia = SocialMedia(
    url = value["url"]?.toString().orEmpty(),
    type = value["type"]?.toString().orEmpty().ifBlank { "image" },
    hlsUrl = value["hlsUrl"]?.toString(),
    thumbnailUrl = value["thumbnailUrl"]?.toString(),
    mimeType = value["mimeType"]?.toString(),
    processingId = value["processingId"]?.toString(),
    processingStatus = value["processingStatus"]?.toString().orEmpty().ifBlank { "ready" }
)

private fun SocialStoryItem.mediaItems(): List<SocialMedia> {
    val collage = media["items"] as? List<*>
    if (collage != null) return collage.mapNotNull { raw ->
        (raw as? Map<*, *>)?.entries?.associate { it.key.toString() to it.value }?.let(::storyMediaFromMap)
    }
    return if (media["url"] != null) listOf(storyMediaFromMap(media)) else emptyList()
}

@Composable
fun TiwiStoryViewerPage(
    repository: SocialRepository,
    groups: List<SocialStoryGroup>,
    initialAuthorId: String,
    onClose: () -> Unit
) {
    val start = groups.indexOfFirst { it.authorId == initialAuthorId }.coerceAtLeast(0)
    var groupIndex by remember(initialAuthorId, groups.map { it.authorId }) { mutableIntStateOf(start) }
    var frameIndex by remember(initialAuthorId) { mutableIntStateOf(0) }
    var paused by remember { mutableStateOf(false) }
    var page by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val progress = remember { Animatable(0f) }
    val group = groups.getOrNull(groupIndex)
    val frames = remember(group) { group?.frames().orEmpty() }
    val frame = frames.getOrNull(frameIndex)

    fun advance() {
        if (frameIndex + 1 < frames.size) frameIndex++
        else if (groupIndex + 1 < groups.size) { groupIndex++; frameIndex = 0 }
        else onClose()
    }
    fun previous() {
        if (frameIndex > 0) frameIndex--
        else if (groupIndex > 0) { groupIndex--; frameIndex = groups[groupIndex].frames().lastIndex.coerceAtLeast(0) }
    }
    BackHandler {
        if (page != null) page = null else onClose()
    }
    LaunchedEffect(frame?.item?.id, paused) {
        val current = frame ?: return@LaunchedEffect
        if (!paused) {
            progress.snapTo(0f)
            runCatching { repository.viewStory(current.story.id, current.item.sortOrder) }
            val duration = current.item.durationMs.coerceIn(2_500, 60_000)
            progress.animateTo(1f, tween(duration, easing = LinearEasing))
            if (progress.value >= .999f) advance()
        }
    }
    if (group == null || frame == null) {
        Box(Modifier.fillMaxSize().background(Color.Black), contentAlignment = Alignment.Center) {
            Text("This story is no longer available", color = Color.White)
            IconButton(onClick = onClose, modifier = Modifier.align(Alignment.TopEnd).statusBarsPadding()) { Icon(Icons.Default.Close, "Close", tint = Color.White) }
        }
        return
    }
    when (page) {
        "options" -> StoryViewerOptionsPage(repository, frame.story, frame.item, onBack = { page = null }, onPrivacy = { page = "privacy" }, onViewers = { page = "viewers" }, onDeleted = onClose)
        "privacy" -> StoryViewerPrivacyPage(repository, frame.story, onBack = { page = "options" })
        "viewers" -> StoryViewersPage(repository, frame.story.id, onBack = { page = "options" })
        else -> StoryViewerContent(
            repository = repository,
            group = group,
            frames = frames,
            frameIndex = frameIndex,
            progress = progress.value,
            paused = paused,
            onPause = { paused = it },
            onPrevious = ::previous,
            onNext = ::advance,
            onClose = onClose,
            onOptions = { page = "options" },
            onReact = { emoji -> scope.launch { runCatching { repository.reactToStory(frame.story.id, frame.item.id, emoji) } } },
            onReply = { body ->
                scope.launch {
                    runCatching { repository.replyToStory(frame.story.id, frame.item.id, body) }
                        .onSuccess { Toast.makeText(context, "Reply sent", Toast.LENGTH_SHORT).show() }
                        .onFailure { Toast.makeText(context, it.message ?: "Reply failed", Toast.LENGTH_SHORT).show() }
                }
            }
        )
    }
}

@Composable
private fun StoryViewerContent(
    repository: SocialRepository,
    group: SocialStoryGroup,
    frames: List<StoryFrame>,
    frameIndex: Int,
    progress: Float,
    paused: Boolean,
    onPause: (Boolean) -> Unit,
    onPrevious: () -> Unit,
    onNext: () -> Unit,
    onClose: () -> Unit,
    onOptions: () -> Unit,
    onReact: (String) -> Unit,
    onReply: (String) -> Unit
) {
    val frame = frames[frameIndex]
    val item = frame.item
    var reply by remember(frame.item.id) { mutableStateOf("") }
    var showReactions by remember { mutableStateOf(false) }
    Box(
        Modifier.fillMaxSize().background(Color.Black).statusBarsPadding().navigationBarsPadding()
            .pointerInput(frame.item.id) {
                detectTapGestures(
                    onPress = { onPause(true); tryAwaitRelease(); onPause(false) },
                    onTap = { position -> if (position.x < size.width * .34f) onPrevious() else onNext() }
                )
            }
    ) {
        StoryItemMedia(repository, item, Modifier.fillMaxSize())
        Column(Modifier.align(Alignment.TopCenter).fillMaxWidth().padding(horizontal = 7.dp, vertical = 5.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(3.dp)) {
                frames.forEachIndexed { index, _ ->
                    val value = when { index < frameIndex -> 1f; index == frameIndex -> progress; else -> 0f }
                    LinearProgressIndicator(progress = { value }, modifier = Modifier.weight(1f).height(2.5.dp).clip(CircleShape), color = Color.White, trackColor = Color.White.copy(alpha = .35f))
                }
            }
            Row(Modifier.fillMaxWidth().padding(top = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                AsyncImage(group.author.avatar, null, Modifier.size(38.dp).clip(CircleShape).background(Color.DarkGray), contentScale = ContentScale.Crop)
                Column(Modifier.weight(1f).padding(start = 8.dp)) {
                    Text(group.author.name, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 12.sp, maxLines = 1)
                    Text(relativeStoryTime(frame.story.createdAt), color = Color.White.copy(alpha = .72f), fontSize = 9.sp)
                }
                IconButton(onClick = onOptions, modifier = Modifier.size(36.dp)) { Icon(Icons.Default.MoreHoriz, "Story options", tint = Color.White) }
                IconButton(onClick = onClose, modifier = Modifier.size(36.dp)) { Icon(Icons.Default.Close, "Close", tint = Color.White) }
            }
        }
        if (!item.text.isNullOrBlank() && item.type != "text") Text(
            item.text.orEmpty(),
            color = Color.White,
            fontWeight = FontWeight.Bold,
            fontSize = 20.sp,
            textAlign = TextAlign.Center,
            modifier = Modifier.align(Alignment.Center).widthIn(max = 310.dp).background(Color.Black.copy(alpha = .36f), RoundedCornerShape(8.dp)).padding(8.dp)
        )
        StoryRenderedOverlays(item.overlays)
        item.music?.takeIf { it.isNotEmpty() }?.let { music ->
            Surface(Modifier.align(Alignment.TopCenter).padding(top = 59.dp), color = Color(0xFF26384A).copy(alpha = .82f), shape = RoundedCornerShape(18.dp), tonalElevation = 0.dp) {
                Row(Modifier.padding(horizontal = 9.dp, vertical = 5.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.MusicNote, null, tint = Color.White, modifier = Modifier.size(14.dp))
                    Text("${music["title"] ?: "Original audio"} · ${music["artist"] ?: "Tiwi"}", color = Color.White, fontSize = 9.sp, modifier = Modifier.padding(start = 5.dp), maxLines = 1)
                }
            }
        }
        if (paused) Box(Modifier.align(Alignment.Center).size(54.dp).background(Color.Black.copy(alpha = .5f), CircleShape), contentAlignment = Alignment.Center) { Icon(Icons.Default.Pause, "Paused", tint = Color.White, modifier = Modifier.size(31.dp)) }
        Row(Modifier.align(Alignment.BottomCenter).fillMaxWidth().padding(horizontal = 10.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            Surface(Modifier.weight(1f).heightIn(min = 40.dp), color = Color.Black.copy(alpha = .42f), shape = RoundedCornerShape(22.dp), border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(alpha = .65f)), tonalElevation = 0.dp) {
                BasicTextField(
                    value = reply,
                    onValueChange = { reply = it.take(1_000) },
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 13.dp, vertical = 11.dp),
                    textStyle = MaterialTheme.typography.bodyMedium.copy(color = Color.White, fontSize = 12.sp),
                    singleLine = true,
                    decorationBox = { inner -> if (reply.isBlank()) Text(if (frame.story.allowReplies) "Reply…" else "Replies are off", color = Color.White.copy(alpha = .75f), fontSize = 12.sp); inner() }
                )
            }
            IconButton(onClick = { showReactions = !showReactions }, modifier = Modifier.size(41.dp)) { Icon(Icons.Outlined.SentimentSatisfied, "React", tint = Color.White, modifier = Modifier.size(25.dp)) }
            IconButton(enabled = reply.isNotBlank() && frame.story.allowReplies, onClick = { val value = reply.trim(); reply = ""; onReply(value) }, modifier = Modifier.size(41.dp)) { Icon(Icons.AutoMirrored.Filled.Send, "Send reply", tint = if (reply.isBlank()) Color.White.copy(alpha = .4f) else StoryBlue, modifier = Modifier.size(22.dp)) }
        }
        AnimatedVisibility(showReactions, enter = fadeIn(), exit = fadeOut(), modifier = Modifier.align(Alignment.BottomCenter).padding(bottom = 58.dp)) {
            Surface(color = Color.White, shape = RoundedCornerShape(25.dp), tonalElevation = 0.dp) {
                Row(Modifier.padding(horizontal = 8.dp, vertical = 5.dp)) {
                    listOf("❤️", "😂", "😮", "😢", "😡", "👍").forEach { emoji -> Text(emoji, fontSize = 25.sp, modifier = Modifier.clickable { onReact(emoji); showReactions = false }.padding(horizontal = 4.dp)) }
                }
            }
        }
    }
}

@Composable
private fun StoryItemMedia(repository: SocialRepository, item: SocialStoryItem, modifier: Modifier = Modifier) {
    val media = item.mediaItems()
    Box(modifier.background(runCatching { Color(android.graphics.Color.parseColor(item.background.orEmpty().ifBlank { "#000000" })) }.getOrDefault(Color.Black)), contentAlignment = Alignment.Center) {
        when {
            item.type == "collage" && media.isNotEmpty() -> {
                Column(Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    media.take(6).chunked(2).forEach { row ->
                        Row(Modifier.fillMaxWidth().weight(1f), horizontalArrangement = Arrangement.spacedBy(2.dp)) {
                            row.forEach { entry -> AsyncImage(repository.absoluteUrl(entry.url), item.altText, Modifier.weight(1f).fillMaxHeight(), contentScale = ContentScale.Crop, colorFilter = storyFilter(storyFilterName(item.filter))) }
                            if (row.size == 1) Spacer(Modifier.weight(1f))
                        }
                    }
                }
            }
            media.firstOrNull()?.type == "video" -> {
                val entry = media.first()
                val trimStart = item.transform["trimStartMs"]?.toString()?.toLongOrNull()?.coerceAtLeast(0L) ?: 0L
                val trimDuration = item.transform["trimDurationMs"]?.toString()?.toLongOrNull()
                    ?: item.durationMs.toLong()
                StoryVideoPlayer(
                    repository.absoluteUrl(entry.hlsUrl?.takeIf { entry.processingStatus == "ready" } ?: entry.url).orEmpty(),
                    paused = false,
                    modifier = Modifier.fillMaxSize(),
                    poster = repository.absoluteUrl(entry.thumbnailUrl),
                    clipStartMs = trimStart,
                    clipDurationMs = trimDuration.coerceIn(1_000L, 60_000L)
                )
            }
            media.isNotEmpty() -> AsyncImage(
                repository.absoluteUrl(media.first().url), item.altText.orEmpty().ifBlank { "Story" }, Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop, colorFilter = storyFilter(storyFilterName(item.filter))
            )
            else -> Text(item.text.orEmpty(), color = Color.White, fontWeight = FontWeight.Bold, fontSize = 27.sp, lineHeight = 34.sp, textAlign = TextAlign.Center, modifier = Modifier.padding(28.dp))
        }
    }
}

@Composable
private fun StoryRenderedOverlays(overlays: List<Map<String, Any?>>) {
    Box(Modifier.fillMaxSize()) {
        overlays.forEachIndexed { index, overlay ->
            val x = (overlay["x"] as? Number)?.toFloat() ?: .5f
            val y = (overlay["y"] as? Number)?.toFloat() ?: .5f
            val scale = (overlay["scale"] as? Number)?.toFloat() ?: 1f
            val rotation = (overlay["rotation"] as? Number)?.toFloat() ?: 0f
            val type = overlay["type"]?.toString().orEmpty()
            val label = overlay["label"]?.toString().orEmpty()
            Surface(
                modifier = Modifier.align(Alignment.Center).offset(x = ((x - .5f) * 310f).dp, y = ((y - .5f) * 520f).dp).graphicsLayer { scaleX = scale; scaleY = scale; rotationZ = rotation },
                color = when (type) { "poll", "question", "add_yours" -> Color.White; "mention", "link", "location", "music" -> Color.Black.copy(alpha = .62f); else -> Color.Transparent },
                shape = RoundedCornerShape(12.dp), tonalElevation = 0.dp
            ) {
                Text(label, color = if (type in listOf("poll", "question", "add_yours")) Color.Black else Color.White, fontSize = if (type == "emoji") 36.sp else 15.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp), textAlign = TextAlign.Center)
            }
        }
    }
}

@Composable
private fun StoryVideoPlayer(
    source: String,
    paused: Boolean,
    modifier: Modifier = Modifier,
    poster: String? = null,
    clipStartMs: Long = 0L,
    clipDurationMs: Long? = null
) {
    val context = LocalContext.current
    val lifecycle = LocalLifecycleOwner.current
    val player = remember(source, clipStartMs, clipDurationMs) {
        source.takeIf { it.isNotBlank() }?.let {
            ExoPlayer.Builder(context).build().apply {
                val item = MediaItem.Builder().setUri(it).setClippingConfiguration(
                    MediaItem.ClippingConfiguration.Builder()
                        .setStartPositionMs(clipStartMs.coerceAtLeast(0L))
                        .setEndPositionMs(clipDurationMs?.let { duration -> (clipStartMs + duration).coerceAtLeast(1L) } ?: C.TIME_END_OF_SOURCE)
                        .build()
                ).build()
                setMediaItem(item); repeatMode = Player.REPEAT_MODE_ONE; playWhenReady = !paused; prepare()
            }
        }
    }
    LaunchedEffect(paused, player) { if (paused) player?.pause() else player?.play() }
    DisposableEffect(player, lifecycle) {
        val observer = LifecycleEventObserver { _, event ->
            when (event) { Lifecycle.Event.ON_PAUSE, Lifecycle.Event.ON_STOP -> player?.pause(); Lifecycle.Event.ON_RESUME -> if (!paused) player?.play(); else -> Unit }
        }
        lifecycle.lifecycle.addObserver(observer)
        onDispose { lifecycle.lifecycle.removeObserver(observer); player?.release() }
    }
    Box(modifier.background(Color.Black), contentAlignment = Alignment.Center) {
        if (!poster.isNullOrBlank()) AsyncImage(poster, null, Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
        if (player != null) AndroidView(factory = { PlayerView(it).apply { this.player = player; useController = false } }, update = { it.player = player }, modifier = Modifier.fillMaxSize())
    }
}

private fun relativeStoryTime(value: String?): String {
    if (value.isNullOrBlank()) return "now"
    val parsed = runCatching {
        val normalized = value.replace(Regex("\\.(\\d{3})\\d+Z$"), ".$1Z")
        SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply { timeZone = java.util.TimeZone.getTimeZone("UTC") }.parse(normalized)
            ?: SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply { timeZone = java.util.TimeZone.getTimeZone("UTC") }.parse(value)
    }.getOrNull() ?: return "now"
    val seconds = ((System.currentTimeMillis() - parsed.time) / 1000).coerceAtLeast(0)
    return when { seconds < 60 -> "now"; seconds < 3600 -> "${seconds / 60}m"; else -> "${seconds / 3600}h" }
}

@Composable
private fun StoryViewerOptionsPage(
    repository: SocialRepository,
    story: SocialStory,
    item: SocialStoryItem,
    onBack: () -> Unit,
    onPrivacy: () -> Unit,
    onViewers: () -> Unit,
    onDeleted: () -> Unit
) {
    val own = story.authorId == repository.currentUserId()
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    Column(Modifier.fillMaxSize().background(Color.White)) {
        StoryPageHeader("Story options", onBack)
        if (own) {
            StoryOptionRow(Icons.Default.Visibility, "Viewers", "${story.viewerCount} people viewed this story", onViewers)
            StoryOptionRow(Icons.Default.Public, "Story privacy", "${story.visibility.replaceFirstChar { it.uppercase() }} audience", onPrivacy)
            StoryOptionRow(Icons.Outlined.History, "Move to memories", "Archive it before the 24 hour expiry") {
                scope.launch { runCatching { repository.archiveStory(story.id) }.onSuccess { onDeleted() }.onFailure { Toast.makeText(context, it.message ?: "Archive failed", Toast.LENGTH_SHORT).show() } }
            }
        }
        item.mediaItems().firstOrNull()?.url?.takeIf { it.isNotBlank() }?.let { url ->
            StoryOptionRow(Icons.Default.Download, "Save media", "Download a copy to this device") {
                scope.launch { Toast.makeText(context, if (saveStoryRemoteMedia(context, repository.absoluteUrl(url).orEmpty(), item.mediaItems().firstOrNull()?.type == "video")) "Saved" else "Save failed", Toast.LENGTH_SHORT).show() }
            }
        }
        if (own) StoryOptionRow(Icons.Default.Delete, "Delete story", "Remove it permanently from Tiwi") {
            scope.launch { runCatching { repository.deleteStory(story.id) }.onSuccess { onDeleted() }.onFailure { Toast.makeText(context, it.message ?: "Delete failed", Toast.LENGTH_SHORT).show() } }
        }
    }
}

private suspend fun saveStoryRemoteMedia(context: Context, source: String, video: Boolean): Boolean = withContext(Dispatchers.IO) {
    runCatching {
        val resolver = context.contentResolver
        val name = "Tiwi-story-${System.currentTimeMillis()}.${if (video) "mp4" else "jpg"}"
        val values = ContentValues().apply {
            put(MediaStore.MediaColumns.DISPLAY_NAME, name)
            put(MediaStore.MediaColumns.MIME_TYPE, if (video) "video/mp4" else "image/jpeg")
            if (Build.VERSION.SDK_INT >= 29) { put(MediaStore.MediaColumns.RELATIVE_PATH, if (video) "Movies/Tiwi" else "Pictures/Tiwi"); put(MediaStore.MediaColumns.IS_PENDING, 1) }
        }
        val collection = if (video) MediaStore.Video.Media.EXTERNAL_CONTENT_URI else MediaStore.Images.Media.EXTERNAL_CONTENT_URI
        val uri = resolver.insert(collection, values) ?: error("Could not create media")
        try {
            java.net.URL(source).openStream().use { input -> resolver.openOutputStream(uri)?.use { output -> input.copyTo(output) } ?: error("Could not open media") }
            if (Build.VERSION.SDK_INT >= 29) { values.clear(); values.put(MediaStore.MediaColumns.IS_PENDING, 0); resolver.update(uri, values, null, null) }
            true
        } catch (error: Exception) { resolver.delete(uri, null, null); throw error }
    }.getOrDefault(false)
}

@Composable
private fun StoryViewerPrivacyPage(repository: SocialRepository, story: SocialStory, onBack: () -> Unit) {
    var visibility by remember(story.id) { mutableStateOf(story.visibility) }
    var replies by remember(story.id) { mutableStateOf(story.allowReplies) }
    var saving by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    StoryAudiencePage(visibility, replies, onBack) { selected, allow ->
        visibility = selected; replies = allow; saving = true
        scope.launch {
            runCatching { repository.updateStory(story.id, selected, emptyList(), allow) }
                .onSuccess { onBack() }
                .onFailure { Toast.makeText(context, it.message ?: "Privacy update failed", Toast.LENGTH_SHORT).show() }
            saving = false
        }
    }
}

@Composable
private fun StoryViewersPage(repository: SocialRepository, storyId: String, onBack: () -> Unit) {
    var viewers by remember(storyId) { mutableStateOf<List<SocialStoryView>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    LaunchedEffect(storyId) { viewers = runCatching { repository.storyViewers(storyId, 200) }.getOrDefault(emptyList()); loading = false }
    Column(Modifier.fillMaxSize().background(Color.White)) {
        StoryPageHeader("Story viewers", onBack)
        if (loading) Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(Modifier.size(25.dp), strokeWidth = 2.dp) }
        else if (viewers.isEmpty()) Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) { Icon(Icons.Outlined.Visibility, null, tint = Color(0xFF98A2B3), modifier = Modifier.size(42.dp)); Text("No views yet", fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 8.dp)) }
        } else LazyColumn(Modifier.fillMaxSize()) {
            items(viewers, key = { it.id }) { view ->
                Row(Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 9.dp), verticalAlignment = Alignment.CenterVertically) {
                    AsyncImage(view.viewer.avatar, null, Modifier.size(43.dp).clip(CircleShape).background(Color(0xFFE9ECF1)), contentScale = ContentScale.Crop)
                    Column(Modifier.weight(1f).padding(start = 10.dp)) {
                        Text(view.viewer.name, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        Text("Viewed ${relativeStoryTime(view.viewedAt)}", color = Color(0xFF667085), fontSize = 10.sp)
                    }
                    Text("${view.lastItemSortOrder + 1}", color = StoryBlue, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
fun TiwiStoryMemoriesPage(repository: SocialRepository, onBack: () -> Unit, onOpen: (SocialStory) -> Unit) {
    var stories by remember { mutableStateOf<List<SocialStory>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var deleting by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    LaunchedEffect(Unit) { stories = runCatching { repository.storyMemories(100, null) }.getOrDefault(emptyList()); loading = false }
    Column(Modifier.fillMaxSize().background(Color.White)) {
        StoryPageHeader("Story memories", onBack)
        Text("Only you can see archived stories. They stay here after the 24-hour story expires.", color = Color(0xFF667085), fontSize = 11.sp, lineHeight = 15.sp, modifier = Modifier.padding(horizontal = 14.dp, vertical = 9.dp))
        when {
            loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(Modifier.size(25.dp), strokeWidth = 2.dp) }
            stories.isEmpty() -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) { Icon(Icons.Outlined.History, null, tint = Color(0xFF98A2B3), modifier = Modifier.size(46.dp)); Text("No story memories yet", fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 9.dp)); Text("Expired and archived stories will appear here.", color = Color(0xFF667085), fontSize = 11.sp) }
            }
            else -> LazyVerticalGrid(columns = GridCells.Fixed(3), modifier = Modifier.fillMaxSize(), contentPadding = PaddingValues(4.dp), horizontalArrangement = Arrangement.spacedBy(4.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                items(stories, key = { it.id }) { story ->
                    val item = story.items.firstOrNull()
                    Box(Modifier.aspectRatio(.68f).clip(RoundedCornerShape(10.dp)).background(Color.Black).clickable { onOpen(story) }) {
                        if (item != null) StoryItemMedia(repository, item, Modifier.fillMaxSize())
                        Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Color.Transparent, Color.Black.copy(alpha = .58f)))))
                        Text(formatStoryMemoryDate(story.createdAt), color = Color.White, fontSize = 9.sp, fontWeight = FontWeight.Bold, modifier = Modifier.align(Alignment.BottomStart).padding(7.dp))
                        IconButton(
                            enabled = deleting != story.id,
                            onClick = {
                                deleting = story.id
                                scope.launch { runCatching { repository.deleteStory(story.id) }.onSuccess { stories = stories.filterNot { it.id == story.id } }.onFailure { Toast.makeText(context, it.message ?: "Delete failed", Toast.LENGTH_SHORT).show() }; deleting = null }
                            },
                            modifier = Modifier.align(Alignment.TopEnd).padding(3.dp).size(29.dp).background(Color.Black.copy(alpha = .48f), CircleShape)
                        ) { if (deleting == story.id) CircularProgressIndicator(Modifier.size(13.dp), color = Color.White, strokeWidth = 2.dp) else Icon(Icons.Default.Delete, "Delete memory", tint = Color.White, modifier = Modifier.size(16.dp)) }
                    }
                }
            }
        }
    }
}

private fun formatStoryMemoryDate(value: String?): String {
    if (value.isNullOrBlank()) return "Memory"
    return runCatching {
        val date = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply { timeZone = java.util.TimeZone.getTimeZone("UTC") }.parse(value)
        SimpleDateFormat("MMM d, yyyy", Locale.getDefault()).format(date ?: Date())
    }.getOrDefault("Memory")
}
