package com.example.social

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
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
import org.webrtc.audio.JavaAudioDeviceModule
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import kotlin.coroutines.suspendCoroutine

/** Small-audience WebRTC live broadcaster. The authenticated API only transports signaling. */
class WebRtcLiveManager(context: Context, private val repository: SocialRepository) {
    private val appContext = context.applicationContext
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val eglBase = EglBase.create()
    val eglContext: EglBase.Context get() = eglBase.eglBaseContext
    private val audioDeviceModule: JavaAudioDeviceModule
    private val factory: PeerConnectionFactory
    private val peers = mutableMapOf<String, PeerConnection>()
    private val remoteApplied = mutableSetOf<String>()
    private val candidateKeys = mutableMapOf<String, MutableSet<String>>()
    private var cameraCapturer: CameraVideoCapturer? = null
    private var textureHelper: SurfaceTextureHelper? = null
    private var videoSource: VideoSource? = null
    private var audioSource: AudioSource? = null
    private var localAudio: AudioTrack? = null
    private var localVideoTrack: VideoTrack? = null
    private var pollJob: Job? = null
    private var currentStream: SocialLiveStream? = null
    private var ownParticipant: SocialLiveParticipant? = null
    private var hostMode = false
    private var disposed = false
    private var offlineSince: Long? = null
    private var iceServers: List<PeerConnection.IceServer> = listOf(
        PeerConnection.IceServer.builder("stun:stun.l.google.com:19302").createIceServer()
    )

    private val _state = MutableStateFlow("Preparing live…")
    val state: StateFlow<String> = _state.asStateFlow()
    private val _localVideo = MutableStateFlow<VideoTrack?>(null)
    val localVideo: StateFlow<VideoTrack?> = _localVideo.asStateFlow()
    private val _remoteVideo = MutableStateFlow<VideoTrack?>(null)
    val remoteVideo: StateFlow<VideoTrack?> = _remoteVideo.asStateFlow()
    private val _viewerCount = MutableStateFlow(0)
    val viewerCount: StateFlow<Int> = _viewerCount.asStateFlow()
    private val _paused = MutableStateFlow(false)
    val paused: StateFlow<Boolean> = _paused.asStateFlow()
    private val _microphoneEnabled = MutableStateFlow(true)
    val microphoneEnabled: StateFlow<Boolean> = _microphoneEnabled.asStateFlow()

    init {
        PeerConnectionFactory.initialize(
            PeerConnectionFactory.InitializationOptions.builder(appContext).setEnableInternalTracer(false).createInitializationOptions()
        )
        audioDeviceModule = JavaAudioDeviceModule.builder(appContext)
            .setUseHardwareAcousticEchoCanceler(true).setUseHardwareNoiseSuppressor(true).createAudioDeviceModule()
        factory = PeerConnectionFactory.builder()
            .setAudioDeviceModule(audioDeviceModule)
            .setVideoEncoderFactory(DefaultVideoEncoderFactory(eglContext, true, true))
            .setVideoDecoderFactory(DefaultVideoDecoderFactory(eglContext))
            .createPeerConnectionFactory()
    }

    suspend fun startHost(stream: SocialLiveStream) {
        hostMode = true
        currentStream = stream
        _state.value = "Starting live…"
        iceServers = loadIceServers()
        startCapture()
        _state.value = "Live"
        startHostPolling()
    }

    suspend fun join(stream: SocialLiveStream) {
        hostMode = false
        currentStream = stream
        _state.value = "Connecting…"
        iceServers = loadIceServers()
        val participant = repository.joinLiveStream(stream.id)
        ownParticipant = participant
        peers[participant.id] = createPeer(participant.id, viewer = true)
        startViewerPolling(participant.id)
    }

    fun togglePause() {
        if (!hostMode) return
        val value = !_paused.value
        _paused.value = value
        localVideoTrack?.setEnabled(!value)
        scope.launch { currentStream?.id?.let { runCatching { repository.heartbeatLiveStream(it, value) } } }
    }

    fun toggleMicrophone() {
        val value = !_microphoneEnabled.value
        _microphoneEnabled.value = value
        localAudio?.setEnabled(value)
    }

    fun switchCamera() { cameraCapturer?.switchCamera(null) }

    fun end() {
        val id = currentStream?.id
        if (id != null) scope.launch { runCatching { repository.leaveLiveStream(id) } }
        _state.value = "Live ended"
        closeMedia()
    }

    fun dispose(sendEnd: Boolean = false) {
        if (disposed) return
        if (sendEnd) end() else closeMedia()
        disposed = true
        scope.cancel()
        factory.dispose()
        audioDeviceModule.release()
        eglBase.release()
    }

    private suspend fun startCapture() {
        val enumerator = Camera2Enumerator(appContext)
        val camera = enumerator.deviceNames.firstOrNull(enumerator::isFrontFacing) ?: enumerator.deviceNames.firstOrNull()
            ?: throw SocialApiException("No camera is available")
        cameraCapturer = enumerator.createCapturer(camera, null) ?: throw SocialApiException("Camera could not start")
        textureHelper = SurfaceTextureHelper.create("TiwiLiveCamera", eglContext)
        videoSource = factory.createVideoSource(false).also { source ->
            cameraCapturer?.initialize(textureHelper, appContext, source.capturerObserver)
            cameraCapturer?.startCapture(1280, 720, 30)
        }
        localVideoTrack = factory.createVideoTrack("tiwi-live-video", videoSource).also { _localVideo.value = it }
        audioSource = factory.createAudioSource(MediaConstraints())
        localAudio = factory.createAudioTrack("tiwi-live-audio", audioSource)
    }

    private fun startHostPolling() {
        pollJob?.cancel()
        pollJob = scope.launch {
            var heartbeatTick = 0
            while (!disposed && currentStream?.status != "ended") {
                val streamId = currentStream?.id ?: break
                val online = networkAvailable()
                if (!online) {
                    offlineSince = offlineSince ?: System.currentTimeMillis()
                    _state.value = "Reconnecting…"
                    if (System.currentTimeMillis() - (offlineSince ?: 0L) >= 30_000) {
                        _state.value = "Live ended — connection lost"
                        runCatching { repository.leaveLiveStream(streamId) }
                        closeMedia()
                        break
                    }
                    delay(1_000)
                    continue
                }
                offlineSince = null
                try {
                    adaptCaptureToNetwork()
                    val participants = repository.liveParticipants(streamId)
                    _viewerCount.value = participants.size
                    participants.forEach { participant -> connectHostParticipant(participant) }
                    val active = participants.map { it.id }.toSet()
                    peers.keys.filterNot { it in active }.forEach(::removePeer)
                    heartbeatTick += 1
                    if (heartbeatTick >= 6) {
                        heartbeatTick = 0
                        currentStream = repository.heartbeatLiveStream(streamId, _paused.value)
                    }
                    _state.value = if (_paused.value) "Live paused" else "Live"
                } catch (_: Exception) {
                    _state.value = "Reconnecting…"
                }
                delay(1_000)
            }
        }
    }

    private suspend fun connectHostParticipant(participant: SocialLiveParticipant) {
        val peer = peers.getOrPut(participant.id) { createPeer(participant.id, viewer = false) }
        if (peer.localDescription == null) {
            val offer = createOffer(peer)
            setLocal(peer, offer)
            repository.signalLiveStream(participant.id, offer = offer.toMap(), status = "joining")
        }
        val answer = participant.viewerAnswer.toSessionDescription(SessionDescription.Type.ANSWER)
        if (answer != null && remoteApplied.add(participant.id)) {
            setRemote(peer, answer)
            repository.signalLiveStream(participant.id, status = "connected")
        }
        if (participant.id in remoteApplied) addCandidates(participant.id, peer, participant.viewerIce)
    }

    private fun startViewerPolling(participantId: String) {
        pollJob?.cancel()
        pollJob = scope.launch {
            var heartbeatTick = 0
            while (!disposed) {
                val streamId = currentStream?.id ?: break
                if (!networkAvailable()) {
                    offlineSince = offlineSince ?: System.currentTimeMillis()
                    _state.value = "Reconnecting…"
                    if (System.currentTimeMillis() - (offlineSince ?: 0L) >= 30_000) {
                        _state.value = "Live ended — connection lost"
                        runCatching { repository.leaveLiveStream(streamId) }
                        closeMedia()
                        break
                    }
                    delay(1_000)
                    continue
                }
                offlineSince = null
                try {
                    val latestStream = repository.getLiveStream(streamId) ?: break
                    currentStream = latestStream
                    _viewerCount.value = latestStream.viewerCount
                    _paused.value = latestStream.paused
                    if (latestStream.status != "live") {
                        _state.value = "Live ended"
                        closeMedia()
                        break
                    }
                    val latest = repository.signalLiveStream(participantId, status = if (remoteApplied.contains(participantId)) "connected" else "joining")
                    ownParticipant = latest
                    val peer = peers[participantId] ?: break
                    val offer = latest.hostOffer.toSessionDescription(SessionDescription.Type.OFFER)
                    if (offer != null && remoteApplied.add(participantId)) {
                        setRemote(peer, offer)
                        val answer = createAnswer(peer)
                        setLocal(peer, answer)
                        repository.signalLiveStream(participantId, answer = answer.toMap(), status = "connected")
                    }
                    if (participantId in remoteApplied) addCandidates(participantId, peer, latest.hostIce)
                    heartbeatTick += 1
                    if (heartbeatTick >= 6) heartbeatTick = 0
                } catch (_: Exception) {
                    _state.value = "Reconnecting…"
                }
                delay(1_000)
            }
        }
    }

    private fun createPeer(participantId: String, viewer: Boolean): PeerConnection {
        val config = PeerConnection.RTCConfiguration(iceServers).apply {
            sdpSemantics = PeerConnection.SdpSemantics.UNIFIED_PLAN
            continualGatheringPolicy = PeerConnection.ContinualGatheringPolicy.GATHER_CONTINUALLY
        }
        val peer = factory.createPeerConnection(config, peerObserver(participantId, viewer))
            ?: throw SocialApiException("Could not initialize live video")
        if (!viewer) {
            localAudio?.let { peer.addTrack(it, listOf("tiwi-live")) }
            localVideoTrack?.let { peer.addTrack(it, listOf("tiwi-live")) }
        }
        return peer
    }

    private fun peerObserver(participantId: String, viewer: Boolean) = object : PeerConnection.Observer {
        override fun onSignalingChange(state: PeerConnection.SignalingState) = Unit
        override fun onIceConnectionChange(state: PeerConnection.IceConnectionState) {
            when (state) {
                PeerConnection.IceConnectionState.CONNECTED, PeerConnection.IceConnectionState.COMPLETED -> _state.value = "Live"
                PeerConnection.IceConnectionState.DISCONNECTED -> _state.value = "Reconnecting…"
                PeerConnection.IceConnectionState.FAILED -> _state.value = "Connection failed"
                else -> Unit
            }
        }
        override fun onIceConnectionReceivingChange(receiving: Boolean) = Unit
        override fun onIceGatheringChange(state: PeerConnection.IceGatheringState) = Unit
        override fun onIceCandidate(candidate: IceCandidate) {
            scope.launch { runCatching { repository.signalLiveStream(participantId, candidate = candidate.toMap()) } }
        }
        override fun onIceCandidatesRemoved(candidates: Array<out IceCandidate>) = Unit
        override fun onAddStream(stream: MediaStream) = Unit
        override fun onRemoveStream(stream: MediaStream) = Unit
        override fun onDataChannel(channel: DataChannel) = Unit
        override fun onRenegotiationNeeded() = Unit
        override fun onAddTrack(receiver: RtpReceiver, mediaStreams: Array<out MediaStream>) {
            if (viewer) when (val track = receiver.track()) {
                is VideoTrack -> { track.setEnabled(true); _remoteVideo.value = track }
                is AudioTrack -> track.setEnabled(true)
            }
        }
    }

    private fun addCandidates(participantId: String, peer: PeerConnection, values: List<Map<String, Any?>>) {
        val seen = candidateKeys.getOrPut(participantId) { mutableSetOf() }
        values.forEach { value ->
            val candidate = value.toIceCandidate() ?: return@forEach
            val key = "${candidate.sdpMid}:${candidate.sdpMLineIndex}:${candidate.sdp}"
            if (seen.add(key)) peer.addIceCandidate(candidate)
        }
    }

    private fun adaptCaptureToNetwork() {
        val manager = appContext.getSystemService(ConnectivityManager::class.java)
        val capabilities = manager.getNetworkCapabilities(manager.activeNetwork) ?: return
        val downstream = capabilities.linkDownstreamBandwidthKbps
        when {
            downstream in 1..699 -> videoSource?.adaptOutputFormat(640, 360, 18)
            downstream in 700..1799 || capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> videoSource?.adaptOutputFormat(854, 480, 24)
            else -> videoSource?.adaptOutputFormat(1280, 720, 30)
        }
    }

    private suspend fun loadIceServers(): List<PeerConnection.IceServer> {
        val settings = runCatching { repository.socialSettings() }.getOrDefault(emptyMap())
        val rows = settings["stunServers"] as? List<*> ?: emptyList<Any?>()
        val parsed = rows.mapNotNull { row ->
            val map = row as? Map<*, *> ?: return@mapNotNull null
            val urls = when (val raw = map["urls"]) {
                is String -> listOf(raw)
                is List<*> -> raw.mapNotNull { it?.toString() }
                else -> emptyList()
            }.filter(String::isNotBlank)
            if (urls.isEmpty()) return@mapNotNull null
            PeerConnection.IceServer.builder(urls)
                .setUsername(map["username"]?.toString().orEmpty())
                .setPassword(map["credential"]?.toString() ?: map["password"]?.toString().orEmpty())
                .createIceServer()
        }
        return parsed.ifEmpty { iceServers }
    }

    private fun networkAvailable(): Boolean {
        val manager = appContext.getSystemService(ConnectivityManager::class.java)
        val capabilities = manager.getNetworkCapabilities(manager.activeNetwork) ?: return false
        return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) && capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
    }

    private fun removePeer(id: String) {
        peers.remove(id)?.let { it.close(); it.dispose() }
        remoteApplied.remove(id)
        candidateKeys.remove(id)
    }

    private fun closeMedia() {
        pollJob?.cancel(); pollJob = null
        peers.keys.toList().forEach(::removePeer)
        runCatching { cameraCapturer?.stopCapture() }
        cameraCapturer?.dispose(); cameraCapturer = null
        textureHelper?.dispose(); textureHelper = null
        localVideoTrack?.dispose(); localVideoTrack = null; _localVideo.value = null; _remoteVideo.value = null
        videoSource?.dispose(); videoSource = null
        localAudio?.dispose(); localAudio = null
        audioSource?.dispose(); audioSource = null
    }

    private suspend fun createOffer(peer: PeerConnection): SessionDescription = suspendCoroutine { continuation ->
        peer.createOffer(SdpContinuation(continuation), MediaConstraints())
    }
    private suspend fun createAnswer(peer: PeerConnection): SessionDescription = suspendCoroutine { continuation ->
        peer.createAnswer(SdpContinuation(continuation), MediaConstraints())
    }
    private suspend fun setLocal(peer: PeerConnection, value: SessionDescription) = suspendCoroutine { continuation ->
        peer.setLocalDescription(SetContinuation(continuation), value)
    }
    private suspend fun setRemote(peer: PeerConnection, value: SessionDescription) = suspendCoroutine { continuation ->
        peer.setRemoteDescription(SetContinuation(continuation), value)
    }

    private class SdpContinuation(private val continuation: kotlin.coroutines.Continuation<SessionDescription>) : SdpObserver {
        override fun onCreateSuccess(description: SessionDescription) = continuation.resume(description)
        override fun onCreateFailure(error: String) = continuation.resumeWithException(SocialApiException(error))
        override fun onSetSuccess() = Unit
        override fun onSetFailure(error: String) = Unit
    }
    private class SetContinuation(private val continuation: kotlin.coroutines.Continuation<Unit>) : SdpObserver {
        override fun onCreateSuccess(description: SessionDescription) = Unit
        override fun onCreateFailure(error: String) = Unit
        override fun onSetSuccess() = continuation.resume(Unit)
        override fun onSetFailure(error: String) = continuation.resumeWithException(SocialApiException(error))
    }

    private fun SessionDescription.toMap(): Map<String, Any?> = mapOf("type" to type.canonicalForm(), "sdp" to description)
    private fun IceCandidate.toMap(): Map<String, Any?> = mapOf("sdpMid" to sdpMid, "sdpMLineIndex" to sdpMLineIndex, "candidate" to sdp)
    private fun Map<String, Any?>?.toSessionDescription(fallback: SessionDescription.Type): SessionDescription? {
        val value = this ?: return null
        val sdp = value["sdp"]?.toString()?.takeIf(String::isNotBlank) ?: return null
        val type = runCatching { SessionDescription.Type.fromCanonicalForm(value["type"]?.toString() ?: fallback.canonicalForm()) }.getOrDefault(fallback)
        return SessionDescription(type, sdp)
    }
    private fun Map<String, Any?>.toIceCandidate(): IceCandidate? {
        val candidate = this["candidate"]?.toString()?.takeIf(String::isNotBlank) ?: return null
        val index = (this["sdpMLineIndex"] as? Number)?.toInt() ?: this["sdpMLineIndex"]?.toString()?.toIntOrNull() ?: 0
        return IceCandidate(this["sdpMid"]?.toString(), index, candidate)
    }
}
