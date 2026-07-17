package com.example

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.test.core.app.ApplicationProvider
import com.example.social.GraphQlClient
import com.example.ui.theme.TiwiTheme
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode
import java.io.File

@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [35])
class MessengerCrashRegressionTest {
    @get:Rule
    val composeRule = createComposeRule()

    @Test
    fun messengerFloatingButtonUsesRenderableDrawable() {
        composeRule.setContent { TiwiTheme { ExactMessengerFloatingButton() } }
        composeRule.waitForIdle()
    }

    @Test
    fun profileAndCoverImagesAreNormalizedWithoutCropActivity() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        val client = GraphQlClient(context) { null }
        val method = GraphQlClient::class.java.getDeclaredMethod(
            "normalizeProfileImage",
            File::class.java,
            String::class.java
        ).apply { isAccessible = true }

        val profile = createImage(context, "profile", 1600, 900)
        method.invoke(client, profile, "profile")
        BitmapFactory.decodeFile(profile.absolutePath).also {
            assertEquals(it.width, it.height)
            assertTrue(it.width <= 1080)
            it.recycle()
        }

        val cover = createImage(context, "cover", 900, 1600)
        method.invoke(client, cover, "cover")
        BitmapFactory.decodeFile(cover.absolutePath).also {
            assertTrue(kotlin.math.abs(it.width.toFloat() / it.height - 16f / 7f) < .02f)
            assertTrue(it.width <= 1600)
            it.recycle()
        }
    }

    @Test
    fun profileCropUsesSquareViewportAndKeepsDragPosition() {
        val centered = calculateProfileCropRect(1600, 900, 900, 900, 1f, 0f, 0f)
        assertEquals(900, centered.width)
        assertEquals(900, centered.height)
        assertEquals(350, centered.left)

        val zoomedCentered = calculateProfileCropRect(1600, 900, 900, 900, 1.5f, 0f, 0f)
        val moved = calculateProfileCropRect(1600, 900, 900, 900, 1.5f, 180f, 0f)
        assertTrue(moved.left < zoomedCentered.left)
        assertEquals(moved.width, moved.height)
    }

    @Test
    fun coverCropKeepsSixteenBySevenViewport() {
        val crop = calculateProfileCropRect(900, 1600, 1600, 700, 1f, 0f, -250f)
        assertTrue(kotlin.math.abs(crop.width.toFloat() / crop.height - 16f / 7f) < .02f)
        assertTrue(crop.top > 0)
    }

    @Test
    fun chatThemeArgbIsNotReadAsPackedComposeColor() {
        assertEquals(0xFF0866FF.toInt(), normalizedChatColorArgb(0xFF0866FFL))
        val purple = 0xFF7F56D9.toInt()
        assertEquals(purple, normalizedChatColorArgb(purple.toLong()))
        assertEquals(0xFF0866FF.toInt(), normalizedChatColorArgb(Long.MIN_VALUE))
    }

    @Test
    fun videoPlayerIsOnlyOwnedByVisiblePlayingContent() {
        assertTrue(shouldOwnVideoPlayer(visibleEnough = true, autoplay = true, startRequested = false))
        assertTrue(shouldOwnVideoPlayer(visibleEnough = true, autoplay = false, startRequested = true))
        assertTrue(!shouldOwnVideoPlayer(visibleEnough = false, autoplay = true, startRequested = true))
        assertTrue(!shouldOwnVideoPlayer(visibleEnough = true, autoplay = false, startRequested = false))
    }

    private fun createImage(context: Context, name: String, width: Int, height: Int): File {
        val file = File(context.cacheDir, "$name-test.jpg")
        Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888).also { bitmap ->
            file.outputStream().use { bitmap.compress(Bitmap.CompressFormat.JPEG, 92, it) }
            bitmap.recycle()
        }
        return file
    }
}
