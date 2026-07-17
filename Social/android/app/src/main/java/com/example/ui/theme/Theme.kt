package com.example.ui.theme

import android.os.Build
import androidx.compose.foundation.IndicationNodeFactory
import androidx.compose.foundation.LocalIndication
import androidx.compose.foundation.interaction.InteractionSource
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.LocalRippleConfiguration
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.ContentDrawScope
import androidx.compose.ui.node.DelegatableNode
import androidx.compose.ui.node.DrawModifierNode
import androidx.compose.ui.platform.LocalContext

private object TiwiNoTouchIndication : IndicationNodeFactory {
  override fun create(interactionSource: InteractionSource): DelegatableNode = TiwiNoTouchIndicationNode()
  override fun hashCode(): Int = 0
  override fun equals(other: Any?): Boolean = other === this
}

private class TiwiNoTouchIndicationNode : Modifier.Node(), DrawModifierNode {
  override fun ContentDrawScope.draw() = drawContent()
}

private val DarkColorScheme =
  darkColorScheme(
    primary = TiwiBlue,
    secondary = TiwiPurple,
    tertiary = TiwiPink,
    background = TiwiBlack,
    surface = TiwiDarkGrey,
    onPrimary = TiwiWhite,
    onSecondary = TiwiWhite,
    onTertiary = TiwiWhite,
    onBackground = TiwiWhite,
    onSurface = TiwiWhite
  )

private val LightColorScheme =
  lightColorScheme(
    primary = TiwiBlue,
    secondary = TiwiPurple,
    tertiary = TiwiPink,
    background = TiwiWhite,
    surface = Color(0xFFF5F5F5),
    onPrimary = TiwiWhite,
    onSecondary = TiwiWhite,
    onTertiary = TiwiWhite,
    onBackground = TiwiBlack,
    onSurface = TiwiBlack
  )

@Composable
@OptIn(ExperimentalMaterial3Api::class)
fun TiwiTheme(
  darkTheme: Boolean = isSystemInDarkTheme(),
  // Dynamic color is available on Android 12+
  dynamicColor: Boolean = false, // Set to false to keep brand colors consistent
  content: @Composable () -> Unit,
) {
  val colorScheme =
    when {
      dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
        val context = LocalContext.current
        if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
      }

      darkTheme -> DarkColorScheme
      else -> LightColorScheme
    }

  CompositionLocalProvider(
    LocalIndication provides TiwiNoTouchIndication,
    LocalRippleConfiguration provides null
  ) {
    MaterialTheme(colorScheme = colorScheme, typography = Typography, content = content)
  }
}
