package com.example.social

import android.content.Context
import android.os.Build
import android.provider.Settings
import android.util.Base64
import java.nio.ByteBuffer
import java.nio.charset.StandardCharsets
import java.security.KeyFactory
import java.security.KeyPairGenerator
import java.security.MessageDigest
import java.security.interfaces.ECPublicKey
import java.security.spec.ECGenParameterSpec
import java.security.spec.X509EncodedKeySpec
import javax.crypto.Cipher
import javax.crypto.KeyAgreement
import javax.crypto.Mac
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec
import kotlin.random.Random

internal class TSecurityClient(private val context: Context, private val api: GraphQlClient) {
    suspend fun issueAuthToken(action: String, form: Map<String, Any?>): String {
        val state = api.getJson("/data/v3/sync-state").objectValue("state")
            ?: throw SocialApiException("tSecurity sync failed")
        val challengeId = state.string("id") ?: throw SocialApiException("tSecurity challenge was incomplete")
        val serverRaw = decode(state.string("key").orEmpty())
        val salt = decode(state.string("salt").orEmpty())
        val keyPair = KeyPairGenerator.getInstance("EC").apply { initialize(ECGenParameterSpec("secp256r1")) }.generateKeyPair()
        val serverKey = KeyFactory.getInstance("EC").generatePublic(X509EncodedKeySpec(P256_SPKI_PREFIX + serverRaw))
        val shared = KeyAgreement.getInstance("ECDH").run {
            init(keyPair.private)
            doPhase(serverKey, true)
            generateSecret()
        }
        val aesKey = hkdf(shared, salt, "tiwlo-tsecurity-gateway-v1".toByteArray(StandardCharsets.UTF_8), 32)
        val iv = ByteArray(12).also(Random.Default::nextBytes)
        val payload = mapOf(
            "action" to action,
            "payload" to mapOf("form" to form, "deviceFingerprint" to fingerprint(), "deviceMetadata" to metadata(), "behavior" to behavior())
        )
        val plaintext = MAP_ADAPTER.toJson(payload).toByteArray(StandardCharsets.UTF_8)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding").apply {
            init(Cipher.ENCRYPT_MODE, SecretKeySpec(aesKey, "AES"), GCMParameterSpec(128, iv))
            updateAAD(challengeId.toByteArray(StandardCharsets.UTF_8))
        }
        val envelope = mapOf(
            "sealed" to true,
            "cid" to challengeId,
            "pub" to encode(rawPublicKey(keyPair.public as ECPublicKey)),
            "iv" to encode(iv),
            "data" to encode(cipher.doFinal(plaintext))
        )
        val response = api.postJson("/data/v3/sync-state", envelope)
        val result = if (response.boolean("sealed")) {
            val responseCipher = Cipher.getInstance("AES/GCM/NoPadding").apply {
                init(Cipher.DECRYPT_MODE, SecretKeySpec(aesKey, "AES"), GCMParameterSpec(128, decode(response.string("iv").orEmpty())))
                updateAAD(challengeId.toByteArray(StandardCharsets.UTF_8))
            }
            MAP_ADAPTER.fromJson(String(responseCipher.doFinal(decode(response.string("data").orEmpty())), StandardCharsets.UTF_8))
                ?: emptyMap()
        } else response
        if (!result.boolean("ok")) throw SocialApiException(result.string("error") ?: result.string("reason") ?: "tSecurity verification failed")
        return result.string("token") ?: throw SocialApiException("tSecurity did not issue an authentication token")
    }

    private fun metadata(): Map<String, Any?> = mapOf(
        "timezone" to java.util.TimeZone.getDefault().id,
        "language" to java.util.Locale.getDefault().toLanguageTag(),
        "platform" to "Android ${Build.VERSION.RELEASE}",
        "vendor" to Build.MANUFACTURER,
        "hardwareConcurrency" to Runtime.getRuntime().availableProcessors(),
        "deviceMemory" to 0,
        "maxTouchPoints" to 5,
        "screen" to "${context.resources.displayMetrics.widthPixels}x${context.resources.displayMetrics.heightPixels}",
        "userAgent" to "Tiwi/${com.example.BuildConfig.VERSION_NAME} Android/${Build.VERSION.SDK_INT}",
        "timezoneOffsetMinutes" to (java.util.TimeZone.getDefault().rawOffset / -60000),
        "webdriver" to false,
        "sessionLock" to mapOf("changedFields" to emptyList<String>(), "seenAt" to System.currentTimeMillis())
    )

    private fun behavior(): Map<String, Any?> {
        val now = System.currentTimeMillis()
        return mapOf(
            "pageLoadedAt" to now, "firstInteractionAt" to now, "keystrokes" to 0,
            "pointerEvents" to 1, "pasteEvents" to 0, "inputEvents" to 1, "focusEvents" to 1,
            "submittedAt" to now, "clientEpochMs" to now, "requestIssuedAt" to now,
            "requestTtlMs" to 600000, "webdriver" to false,
            "consoleSignals" to mapOf("inspectKeyCount" to 0, "devtoolsOpenSamples" to 0, "devtoolsSuspected" to false)
        )
    }

    private fun fingerprint(): String {
        val androidId = Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID).orEmpty()
        return MessageDigest.getInstance("SHA-256").digest("$androidId|${Build.FINGERPRINT}|${Build.MODEL}".toByteArray())
            .joinToString("") { "%02x".format(it) }
    }

    private fun rawPublicKey(key: ECPublicKey): ByteArray {
        fun fixed(value: ByteArray): ByteArray = value.dropWhile { it == 0.toByte() }.toByteArray().let { clean -> ByteArray(32 - clean.size) + clean }
        return byteArrayOf(4) + fixed(key.w.affineX.toByteArray()) + fixed(key.w.affineY.toByteArray())
    }

    private fun hkdf(secret: ByteArray, salt: ByteArray, info: ByteArray, size: Int): ByteArray {
        val extract = Mac.getInstance("HmacSHA256").apply { init(SecretKeySpec(salt, "HmacSHA256")) }.doFinal(secret)
        val output = ByteArray(size)
        var previous = ByteArray(0)
        var offset = 0
        var counter = 1
        while (offset < size) {
            val block = Mac.getInstance("HmacSHA256").apply { init(SecretKeySpec(extract, "HmacSHA256")) }
                .doFinal(previous + info + counter.toByte())
            val take = minOf(block.size, size - offset)
            block.copyInto(output, offset, 0, take)
            offset += take
            previous = block
            counter++
        }
        return output
    }

    private fun encode(value: ByteArray) = Base64.encodeToString(value, Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING)
    private fun decode(value: String) = Base64.decode(value, Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING)

    private companion object {
        val P256_SPKI_PREFIX = byteArrayOf(
            0x30, 0x59, 0x30, 0x13, 0x06, 0x07, 0x2A, 0x86.toByte(), 0x48, 0xCE.toByte(), 0x3D, 0x02, 0x01,
            0x06, 0x08, 0x2A, 0x86.toByte(), 0x48, 0xCE.toByte(), 0x3D, 0x03, 0x01, 0x07, 0x03, 0x42, 0x00
        )
        val MAP_ADAPTER = com.squareup.moshi.Moshi.Builder().add(com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory()).build()
            .adapter<Map<String, Any?>>(com.squareup.moshi.Types.newParameterizedType(Map::class.java, String::class.java, Any::class.java))
    }
}
