package com.example.social

import android.content.Context
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import android.media.AudioManager
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import org.webrtc.AudioSource
import org.webrtc.AudioTrack
import org.webrtc.Camera1Enumerator
import org.webrtc.Camera2Enumerator
import org.webrtc.CameraEnumerator
import org.webrtc.CameraVideoCapturer
import org.webrtc.DataChannel
import org.webrtc.DefaultVideoDecoderFactory
import org.webrtc.DefaultVideoEncoderFactory
import org.webrtc.EglBase
import org.webrtc.IceCandidate
import org.webrtc.MediaConstraints
import org.webrtc.MediaStream
import org.webrtc.PeerConnection
import org.webrtc.PeerConnectionFactory
import org.webrtc.RtpReceiver
import org.webrtc.SdpObserver
import org.webrtc.SessionDescription
import org.webrtc.SurfaceTextureHelper
import org.webrtc.VideoSource
import org.webrtc.VideoTrack
import org.webrtc.audio.JavaAudioDeviceModule
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import kotlin.coroutines.suspendCoroutine

/** Owns one peer-to-peer Tiwi call. The backend is used only for authenticated WebRTC signaling. */
class WebRtcCallManager(
    context: Context,
    private val repository: SocialRepository
) {
    private val appContext = context.applicationContext
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val endSignalScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val audioManager = appContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    private val previousAudioMode = audioManager.mode
    private val eglBase = EglBase.create()
    val eglContext: EglBase.Context get() = eglBase.eglBaseContext

    private val factory: PeerConnectionFactory
    private val audioDeviceModule: JavaAudioDeviceModule
    private var peerConnection: PeerConnection? = null
    private var cameraCapturer: CameraVideoCapturer? = null
    private var activeCameraName: String? = null
    private var usingCamera2 = false
    private var receivedCameraFrame = false
    private var cameraFallbackTried = false
    private var cameraStartupJob: Job? = null
    private var flashEnabled = false
    private var surfaceTextureHelper: SurfaceTextureHelper? = null
    private var videoSource: VideoSource? = null
    private var audioSource: AudioSource? = null
    private var localAudioTrack: AudioTrack? = null
    private var pollJob: Job? = null
    private var reconnectTimeoutJob: Job? = null
    private var disposed = false
    private var remoteDescriptionApplied = false
    private val pendingCandidates = mutableListOf<IceCandidate>()
    private val receivedCandidateKeys = mutableSetOf<String>()

    private val _call = MutableStateFlow<SocialCallSession?>(null)
    val call: StateFlow<SocialCallSession?> = _call.asStateFlow()
    private val _localVideo = MutableStateFlow<VideoTrack?>(null)
    val localVideo: StateFlow<VideoTrack?> = _localVideo.asStateFlow()
    private val _remoteVideo = MutableStateFlow<VideoTrack?>(null)
    val remoteVideo: StateFlow<VideoTrack?> = _remoteVideo.asStateFlow()
    private val _state = MutableStateFlow("Preparing call…")
    val state: StateFlow<String> = _state.asStateFlow()
    private val _microphoneEnabled = MutableStateFlow(true)
    val microphoneEnabled: StateFlow<Boolean> = _microphoneEnabled.asStateFlow()
    private val _cameraEnabled = MutableStateFlow(true)
    val cameraEnabled: StateFlow<Boolean> = _cameraEnabled.asStateFlow()
    private val _speakerEnabled = MutableStateFlow(false)
    val speakerEnabled: StateFlow<Boolean> = _speakerEnabled.asStateFlow()
    private var audioFocusRequest: AudioFocusRequest? = null

    init {
        PeerConnectionFactory.initialize(
            PeerConnectionFactory.InitializationOptions.builder(appContext)
                .setEnableInternalTracer(false)
                .createInitializationOptions()
        )
        audioDeviceModule = JavaAudioDeviceModule.builder(appContext)
            .setUseHardwareAcousticEchoCanceler(true)
            .setUseHardwareNoiseSuppressor(true)
            .createAudioDeviceModule()
        factory = PeerConnectionFactory.builder()
            .setAudioDeviceModule(audioDeviceModule)
            .setVideoEncoderFactory(DefaultVideoEncoderFactory(eglContext, true, true))
            .setVideoDecoderFactory(DefaultVideoDecoderFactory(eglContext))
            .createPeerConnectionFactory()
    }

    suspend fun startOutgoing(conversationId: String?, calleeId: String, video: Boolean) {
        try {
            _state.value = "Connecting…"
            createPeer(video)
            val offer = createOffer()
            setLocalDescription(offer)
            val started = repository.startCall(conversationId, calleeId, video, offer.toMap())
            _call.value = started
            sendPendingCandidates()
            _state.value = if (started.status == "calling") "Calling…" else "Ringing…"
            startPolling(started.id)
        } catch (error: Exception) {
            _state.value = error.message ?: "Call failed"
            closeMedia()
            throw error
        }
    }

    suspend fun answerIncoming(incoming: SocialCallSession) {
        try {
            _call.value = incoming
            _state.value = "Connecting…"
            createPeer(incoming.type == "video")
            val offer = incoming.offer.toSessionDescription(SessionDescription.Type.OFFER)
                ?: throw SocialApiException("The incoming call offer is missing")
            setRemoteDescription(offer)
            remoteDescriptionApplied = true
            addRemoteCandidates(incoming)
            val answer = createAnswer()
            setLocalDescription(answer)
            _call.value = repository.signalCall(incoming.id, status = "active", answer = answer.toMap())
            sendPendingCandidates()
            _state.value = "Connected"
            startPolling(incoming.id)
        } catch (error: Exception) {
            _state.value = error.message ?: "Call failed"
            runCatching { repository.endCall(incoming.id, "failed") }
            throw error
        }
    }

    fun toggleMicrophone() {
        val enabled = !_microphoneEnabled.value
        _microphoneEnabled.value = enabled
        localAudioTrack?.setEnabled(enabled)
    }

    fun toggleCamera() {
        val enabled = !_cameraEnabled.value
        _cameraEnabled.value = enabled
        _localVideo.value?.setEnabled(enabled)
    }

    fun switchCamera() {
        cameraCapturer?.switchCamera(object : CameraVideoCapturer.CameraSwitchHandler {
            override fun onCameraSwitchDone(isFrontCamera: Boolean) {
                val enumerator = cameraEnumerator()
                activeCameraName = enumerator.deviceNames.firstOrNull { enumerator.isFrontFacing(it) == isFrontCamera }
                if (flashEnabled) setFlash(false)
            }
            override fun onCameraSwitchError(errorDescription: String) {
                _state.value = errorDescription.ifBlank { "Could not switch camera" }
            }
        })
    }

    /** Returns the new torch state, or null when the selected camera has no flash. */
    fun toggleFlash(): Boolean? {
        val cameraId = activeCameraName ?: return null
        val manager = appContext.getSystemService(CameraManager::class.java) ?: return null
        val available = runCatching {
            manager.getCameraCharacteristics(cameraId)
                .get(CameraCharacteristics.FLASH_INFO_AVAILABLE) == true
        }.getOrDefault(false)
        if (!available) return null
        val next = !flashEnabled
        return if (setFlash(next)) next else null
    }

    fun toggleSpeaker() {
        setSpeaker(!_speakerEnabled.value)
    }

    fun declineIncoming(incoming: SocialCallSession) {
        _call.value = incoming
        hangUp("declined")
    }

    fun hangUp(status: String = "ended") {
        val id = _call.value?.id
        if (id != null) {
            repository.dismissIncomingCall(id)
            endSignalScope.launch { runCatching { repository.endCall(id, status) } }
        }
        _state.value = if (status == "declined") "Declined" else "Call ended"
        closeMedia()
    }

    fun dispose(sendEnd: Boolean = true) {
        if (disposed) return
        if (sendEnd && _call.value != null) hangUp() else closeMedia()
        disposed = true
        scope.cancel()
        factory.dispose()
        audioDeviceModule.release()
        eglBase.release()
        abandonAudioFocus()
        audioManager.mode = previousAudioMode
    }

    private suspend fun createPeer(video: Boolean) {
        requestAudioFocus()
        audioManager.mode = AudioManager.MODE_IN_COMMUNICATION
        setSpeaker(video)
        val servers = loadIceServers()
        val config = PeerConnection.RTCConfiguration(servers).apply {
            sdpSemantics = PeerConnection.SdpSemantics.UNIFIED_PLAN
            continualGatheringPolicy = PeerConnection.ContinualGatheringPolicy.GATHER_CONTINUALLY
        }
        peerConnection = factory.createPeerConnection(config, peerObserver)
            ?: throw SocialApiException("Could not initialize the call")

        audioSource = factory.createAudioSource(MediaConstraints())
        localAudioTrack = factory.createAudioTrack("tiwi-audio", audioSource).also {
            it.setEnabled(true)
            peerConnection?.addTrack(it, listOf("tiwi-stream"))
        }
        if (video) startLocalVideo()
    }

    private fun startLocalVideo() {
        val source = factory.createVideoSource(false)
        videoSource = source
        // Prefer the compatibility byte-buffer capturer. Camera2 external
        // textures can give a black local preview on some devices.
        val camera2Available = Camera2Enumerator.isSupported(appContext)
        try {
            openCameraCapture(source, preferCamera2 = false)
        } catch (firstError: Exception) {
            // Use Camera2 only if the compatibility path cannot open.
            if (!camera2Available) throw firstError
            openCameraCapture(source, preferCamera2 = true)
        }
        _localVideo.value = factory.createVideoTrack("tiwi-video", videoSource).also {
            it.setEnabled(true)
            peerConnection?.addTrack(it, listOf("tiwi-stream"))
        }
        scheduleCameraFallback()
    }

    private fun openCameraCapture(source: VideoSource, preferCamera2: Boolean) {
        val enumerator = if (preferCamera2 && Camera2Enumerator.isSupported(appContext)) Camera2Enumerator(appContext) else Camera1Enumerator(false)
        val cameraName = enumerator.deviceNames.firstOrNull(enumerator::isFrontFacing)
            ?: enumerator.deviceNames.firstOrNull()
            ?: throw SocialApiException("No camera is available")
        val capturer = enumerator.createCapturer(cameraName, cameraEvents())
            ?: throw SocialApiException("The camera could not start")
        val helper = SurfaceTextureHelper.create("TiwiCamera", eglContext)
        try {
            capturer.initialize(helper, appContext, source.capturerObserver)
            capturer.startCapture(640, 480, 24)
            cameraCapturer = capturer
            surfaceTextureHelper = helper
            activeCameraName = cameraName
            usingCamera2 = preferCamera2 && Camera2Enumerator.isSupported(appContext)
            receivedCameraFrame = false
        } catch (error: Exception) {
            runCatching { capturer.stopCapture() }
            capturer.dispose()
            helper.dispose()
            throw error
        }
    }

    /** Keeps the local VideoTrack attached to an active call while the capture implementation changes. */
    private fun retryWithCamera1(reason: String) {
        if (disposed || cameraFallbackTried) {
            _state.value = reason
            return
        }
        cameraFallbackTried = true
        cameraStartupJob?.cancel()
        scope.launch {
            _state.value = "Retrying camera..."
            val source = videoSource ?: return@launch
            runCatching { cameraCapturer?.stopCapture() }
            cameraCapturer?.dispose()
            surfaceTextureHelper?.dispose()
            cameraCapturer = null
            surfaceTextureHelper = null
            runCatching { openCameraCapture(source, preferCamera2 = !usingCamera2 && Camera2Enumerator.isSupported(appContext)) }
                .onFailure { _state.value = it.message ?: reason }
                .onSuccess { scheduleCameraFallback() }
        }
    }

    private fun scheduleCameraFallback() {
        cameraStartupJob?.cancel()
        cameraStartupJob = scope.launch {
            delay(3_500)
            if (!receivedCameraFrame) retryWithCamera1("Camera preview did not start")
        }
    }

    private fun cameraEnumerator(): CameraEnumerator =
        if (usingCamera2 && Camera2Enumerator.isSupported(appContext)) Camera2Enumerator(appContext) else Camera1Enumerator(false)

    private fun cameraEvents() = object : CameraVideoCapturer.CameraEventsHandler {
        override fun onCameraError(errorDescription: String) {
            retryWithCamera1(errorDescription.ifBlank { "Camera preview failed" })
        }
        override fun onCameraDisconnected() {
            _state.value = "Camera disconnected"
        }
        override fun onCameraFreezed(errorDescription: String) {
            retryWithCamera1(errorDescription.ifBlank { "Camera preview is frozen" })
        }
        override fun onCameraOpening(cameraName: String) = Unit
        override fun onFirstFrameAvailable() {
            receivedCameraFrame = true
            cameraStartupJob?.cancel()
            if (_state.value.contains("Camera", ignoreCase = true)) _state.value = "Connectingâ€¦"
        }
        override fun onCameraClosed() = Unit
    }

    private suspend fun loadIceServers(): List<PeerConnection.IceServer> {
        val settings = runCatching { repository.socialSettings() }.getOrDefault(emptyMap())
        val rows = settings["stunServers"] as? List<*> ?: emptyList<Any?>()
        val parsed = rows.mapNotNull { row ->
            val map = row as? Map<*, *> ?: return@mapNotNull null
            val rawUrls = map["urls"]
            val urls = when (rawUrls) {
                is String -> listOf(rawUrls)
                is List<*> -> rawUrls.mapNotNull { it?.toString() }
                else -> emptyList()
            }.filter { it.isNotBlank() }
            if (urls.isEmpty()) return@mapNotNull null
            PeerConnection.IceServer.builder(urls)
                .setUsername(map["username"]?.toString().orEmpty())
                .setPassword(map["credential"]?.toString() ?: map["password"]?.toString().orEmpty())
                .createIceServer()
        }
        return parsed.ifEmpty {
            listOf(PeerConnection.IceServer.builder("stun:stun.l.google.com:19302").createIceServer())
        }
    }

    private fun startPolling(callId: String) {
        pollJob?.cancel()
        pollJob = scope.launch {
            var ringingSeconds = 0
            var activeHeartbeatSeconds = 0
            while (!disposed) {
                try {
                    val latest = repository.getCall(callId) ?: break
                    _call.value = latest
                    if (!remoteDescriptionApplied && latest.answer != null) {
                        latest.answer.toSessionDescription(SessionDescription.Type.ANSWER)?.let {
                            setRemoteDescription(it)
                            remoteDescriptionApplied = true
                            _state.value = "Connected"
                        }
                    }
                    if (remoteDescriptionApplied) addRemoteCandidates(latest)
                    when (latest.status) {
                        "calling" -> _state.value = "Calling…"
                        "ringing", "connecting" -> if (!remoteDescriptionApplied) _state.value = "Ringing…"
                        "active" -> {
                            _state.value = "Connected"
                            activeHeartbeatSeconds += 1
                            if (activeHeartbeatSeconds >= 15) {
                                activeHeartbeatSeconds = 0
                                runCatching { repository.signalCall(callId, status = "active") }
                            }
                        }
                        "declined" -> { _state.value = "Declined"; closeMedia(); break }
                        "ended", "missed", "failed" -> { _state.value = "Call ended"; closeMedia(); break }
                    }
                    if (latest.status in setOf("calling", "ringing", "connecting") && latest.answer == null) {
                        ringingSeconds += 1
                        if (ringingSeconds >= 45) {
                            runCatching { repository.endCall(callId, "missed") }
                            _state.value = "Call ended"
                            closeMedia()
                            break
                        }
                    } else ringingSeconds = 0
                    if (latest.status != "active") activeHeartbeatSeconds = 0
                } catch (_: Exception) {
                    // A cached call remains usable through a brief network interruption.
                }
                delay(1000)
            }
        }
    }

    private suspend fun addRemoteCandidates(latest: SocialCallSession) {
        val ownId = repository.currentUserId()
        latest.iceCandidates.forEach { value ->
            if (value["from"]?.toString() == ownId) return@forEach
            val candidate = value.toIceCandidate() ?: return@forEach
            val key = "${candidate.sdpMid}:${candidate.sdpMLineIndex}:${candidate.sdp}"
            if (receivedCandidateKeys.add(key)) peerConnection?.addIceCandidate(candidate)
        }
    }

    private suspend fun sendPendingCandidates() {
        val id = _call.value?.id ?: return
        val candidates = synchronized(pendingCandidates) { pendingCandidates.toList().also { pendingCandidates.clear() } }
        candidates.forEach { repository.signalCall(id, candidate = it.toMap()) }
    }

    private val peerObserver = object : PeerConnection.Observer {
        override fun onSignalingChange(state: PeerConnection.SignalingState) = Unit
        override fun onIceConnectionChange(state: PeerConnection.IceConnectionState) {
            when (state) {
                PeerConnection.IceConnectionState.CONNECTED, PeerConnection.IceConnectionState.COMPLETED -> {
                    reconnectTimeoutJob?.cancel()
                    reconnectTimeoutJob = null
                    _state.value = "Connected"
                }
                PeerConnection.IceConnectionState.DISCONNECTED -> {
                    _state.value = "Reconnecting…"
                    if (reconnectTimeoutJob == null) reconnectTimeoutJob = scope.launch {
                        delay(20_000)
                        if (_state.value.startsWith("Reconnecting")) hangUp("failed")
                        reconnectTimeoutJob = null
                    }
                }
                PeerConnection.IceConnectionState.FAILED -> {
                    _state.value = "Call connection failed"
                    hangUp("failed")
                }
                else -> Unit
            }
        }
        override fun onIceConnectionReceivingChange(receiving: Boolean) = Unit
        override fun onIceGatheringChange(state: PeerConnection.IceGatheringState) = Unit
        override fun onIceCandidate(candidate: IceCandidate) {
            val id = _call.value?.id
            if (id == null) synchronized(pendingCandidates) { pendingCandidates += candidate }
            else scope.launch { runCatching { repository.signalCall(id, candidate = candidate.toMap()) } }
        }
        override fun onIceCandidatesRemoved(candidates: Array<out IceCandidate>) = Unit
        override fun onAddStream(stream: MediaStream) = Unit
        override fun onRemoveStream(stream: MediaStream) = Unit
        override fun onDataChannel(channel: DataChannel) = Unit
        override fun onRenegotiationNeeded() = Unit
        override fun onAddTrack(receiver: RtpReceiver, mediaStreams: Array<out MediaStream>) {
            when (val track = receiver.track()) {
                is VideoTrack -> {
                    track.setEnabled(true)
                    _remoteVideo.value = track
                }
                is AudioTrack -> track.setEnabled(true)
            }
        }
    }

    private suspend fun createOffer(): SessionDescription = suspendCoroutine { continuation ->
        peerConnection?.createOffer(SdpContinuation(continuation), MediaConstraints())
            ?: continuation.resumeWithException(SocialApiException("Call is not ready"))
    }

    private suspend fun createAnswer(): SessionDescription = suspendCoroutine { continuation ->
        peerConnection?.createAnswer(SdpContinuation(continuation), MediaConstraints())
            ?: continuation.resumeWithException(SocialApiException("Call is not ready"))
    }

    private suspend fun setLocalDescription(description: SessionDescription) = suspendCoroutine { continuation ->
        peerConnection?.setLocalDescription(SetContinuation(continuation), description)
            ?: continuation.resumeWithException(SocialApiException("Call is not ready"))
    }

    private suspend fun setRemoteDescription(description: SessionDescription) = suspendCoroutine { continuation ->
        peerConnection?.setRemoteDescription(SetContinuation(continuation), description)
            ?: continuation.resumeWithException(SocialApiException("Call is not ready"))
    }

    private fun closeMedia() {
        pollJob?.cancel()
        pollJob = null
        reconnectTimeoutJob?.cancel()
        reconnectTimeoutJob = null
        cameraStartupJob?.cancel()
        cameraStartupJob = null
        if (flashEnabled) setFlash(false)
        runCatching { cameraCapturer?.stopCapture() }
        cameraCapturer?.dispose()
        cameraCapturer = null
        activeCameraName = null
        usingCamera2 = false
        receivedCameraFrame = false
        cameraFallbackTried = false
        surfaceTextureHelper?.dispose()
        surfaceTextureHelper = null
        _localVideo.value?.dispose()
        _localVideo.value = null
        _remoteVideo.value = null
        videoSource?.dispose()
        videoSource = null
        localAudioTrack?.dispose()
        localAudioTrack = null
        audioSource?.dispose()
        audioSource = null
        peerConnection?.close()
        peerConnection?.dispose()
        peerConnection = null
        abandonAudioFocus()
        _speakerEnabled.value = false
        audioManager.mode = previousAudioMode
    }

    private fun setFlash(enabled: Boolean): Boolean {
        val cameraId = activeCameraName ?: return false
        val manager = appContext.getSystemService(CameraManager::class.java) ?: return false
        return runCatching {
            manager.setTorchMode(cameraId, enabled)
            flashEnabled = enabled
            true
        }.getOrDefault(false)
    }

    @Suppress("DEPRECATION")
    private fun setSpeaker(enabled: Boolean) {
        _speakerEnabled.value = enabled
        audioManager.isSpeakerphoneOn = enabled
    }

    private fun requestAudioFocus() {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            val request = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
                .setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                        .build()
                )
                .setAcceptsDelayedFocusGain(false)
                .setOnAudioFocusChangeListener { }
                .build()
            audioFocusRequest = request
            audioManager.requestAudioFocus(request)
        } else {
            @Suppress("DEPRECATION")
            audioManager.requestAudioFocus(null, AudioManager.STREAM_VOICE_CALL, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
        }
    }

    private fun abandonAudioFocus() {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            audioFocusRequest?.let(audioManager::abandonAudioFocusRequest)
            audioFocusRequest = null
        } else {
            @Suppress("DEPRECATION")
            audioManager.abandonAudioFocus(null)
        }
    }

    private class SdpContinuation(
        private val continuation: kotlin.coroutines.Continuation<SessionDescription>
    ) : SdpObserver {
        override fun onCreateSuccess(description: SessionDescription) = continuation.resume(description)
        override fun onCreateFailure(error: String) = continuation.resumeWithException(SocialApiException(error))
        override fun onSetSuccess() = Unit
        override fun onSetFailure(error: String) = Unit
    }

    private class SetContinuation(
        private val continuation: kotlin.coroutines.Continuation<Unit>
    ) : SdpObserver {
        override fun onCreateSuccess(description: SessionDescription) = Unit
        override fun onCreateFailure(error: String) = Unit
        override fun onSetSuccess() = continuation.resume(Unit)
        override fun onSetFailure(error: String) = continuation.resumeWithException(SocialApiException(error))
    }

    private fun SessionDescription.toMap(): Map<String, Any?> = mapOf("type" to type.canonicalForm(), "sdp" to description)
    private fun IceCandidate.toMap(): Map<String, Any?> = mapOf("sdpMid" to sdpMid, "sdpMLineIndex" to sdpMLineIndex, "candidate" to sdp)

    private fun Map<String, Any?>?.toSessionDescription(fallback: SessionDescription.Type): SessionDescription? {
        val map = this ?: return null
        val sdp = map["sdp"]?.toString()?.takeIf { it.isNotBlank() } ?: return null
        val type = runCatching { SessionDescription.Type.fromCanonicalForm(map["type"]?.toString() ?: fallback.canonicalForm()) }.getOrDefault(fallback)
        return SessionDescription(type, sdp)
    }

    private fun Map<String, Any?>.toIceCandidate(): IceCandidate? {
        val candidate = this["candidate"]?.toString()?.takeIf { it.isNotBlank() } ?: return null
        val index = (this["sdpMLineIndex"] as? Number)?.toInt() ?: this["sdpMLineIndex"]?.toString()?.toIntOrNull() ?: 0
        return IceCandidate(this["sdpMid"]?.toString(), index, candidate)
    }
}
