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

    private fun createImage(context: Context, name: String, width: Int, height: Int): File {
        val file = File(context.cacheDir, "$name-test.jpg")
        Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888).also { bitmap ->
            file.outputStream().use { bitmap.compress(Bitmap.CompressFormat.JPEG, 92, it) }
            bitmap.recycle()
        }
        return file
    }
}
