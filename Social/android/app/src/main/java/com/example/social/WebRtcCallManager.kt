package com.example.social

import android.content.Context
import android.media.AudioManager
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
import org.webrtc.Camera2Enumerator
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
    private var peerConnection: PeerConnection? = null
    private var cameraCapturer: CameraVideoCapturer? = null
    private var surfaceTextureHelper: SurfaceTextureHelper? = null
    private var videoSource: VideoSource? = null
    private var audioSource: AudioSource? = null
    private var localAudioTrack: AudioTrack? = null
    private var pollJob: Job? = null
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

    init {
        PeerConnectionFactory.initialize(
            PeerConnectionFactory.InitializationOptions.builder(appContext)
                .setEnableInternalTracer(false)
                .createInitializationOptions()
        )
        factory = PeerConnectionFactory.builder()
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
            _state.value = "Ringing…"
            startPolling(started.id)
        } catch (error: Exception) {
            _state.value = error.message ?: "Call failed"
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
        cameraCapturer?.switchCamera(null)
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
        eglBase.release()
        audioManager.mode = previousAudioMode
    }

    private suspend fun createPeer(video: Boolean) {
        audioManager.mode = AudioManager.MODE_IN_COMMUNICATION
        audioManager.isSpeakerphoneOn = video
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
        val enumerator = Camera2Enumerator(appContext)
        val cameraName = enumerator.deviceNames.firstOrNull(enumerator::isFrontFacing)
            ?: enumerator.deviceNames.firstOrNull()
            ?: return
        val capturer = enumerator.createCapturer(cameraName, null) ?: return
        cameraCapturer = capturer
        surfaceTextureHelper = SurfaceTextureHelper.create("TiwiCamera", eglContext)
        videoSource = factory.createVideoSource(false).also { source ->
            capturer.initialize(surfaceTextureHelper, appContext, source.capturerObserver)
            capturer.startCapture(720, 1280, 30)
        }
        _localVideo.value = factory.createVideoTrack("tiwi-video", videoSource).also {
            it.setEnabled(true)
            peerConnection?.addTrack(it, listOf("tiwi-stream"))
        }
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
                        "active" -> _state.value = "Connected"
                        "declined" -> { _state.value = "Declined"; closeMedia(); break }
                        "ended", "missed", "failed" -> { _state.value = "Call ended"; closeMedia(); break }
                    }
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
                PeerConnection.IceConnectionState.CONNECTED, PeerConnection.IceConnectionState.COMPLETED -> _state.value = "Connected"
                PeerConnection.IceConnectionState.DISCONNECTED -> _state.value = "Reconnecting…"
                PeerConnection.IceConnectionState.FAILED -> _state.value = "Call connection failed"
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
            (receiver.track() as? VideoTrack)?.let { _remoteVideo.value = it }
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
        runCatching { cameraCapturer?.stopCapture() }
        cameraCapturer?.dispose()
        cameraCapturer = null
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
        audioManager.mode = previousAudioMode
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
