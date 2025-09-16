import api from './api'

// WebRTC Configuration with STUN/TURN servers for low latency
const DEFAULT_RTC_CONFIGURATION = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' }
  ],
  iceCandidatePoolSize: 10,
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require'
}

// Media constraints for high quality, low latency
const DEFAULT_MEDIA_CONSTRAINTS = {
  video: {
    width: { min: 640, ideal: 1280, max: 1920 },
    height: { min: 480, ideal: 720, max: 1080 },
    frameRate: { min: 15, ideal: 30, max: 60 },
    facingMode: 'user'
  },
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 48000,
    channelCount: 2
  }
}

// Screen sharing constraints
const SCREEN_SHARE_CONSTRAINTS = {
  video: {
    mediaSource: 'screen',
    width: { max: 1920 },
    height: { max: 1080 },
    frameRate: { max: 30 }
  },
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: false
  }
}

export class WebRTCService {
  constructor() {
    this.localStream = null
    this.remoteStream = null
    this.screenStream = null
    this.peerConnection = null
    this.signalingSocket = null
    this.roomId = null
    this.userId = null
    this.isHost = false
    this.isConnected = false
    this.isScreenSharing = false
    this.isRecording = false
    this.mediaRecorder = null
    this.recordedChunks = []
    this.eventHandlers = new Map()

    // Connection state
    this.connectionState = 'disconnected'
    this.iceCandidates = []
    this.pendingIceCandidates = []
  }

  // Initialize WebRTC connection
  async initialize(userId, organizationId) {
    this.userId = userId
    this.organizationId = organizationId

    try {
      await this.connectSignaling()
      this.setupPeerConnection()
      return true
    } catch (error) {
      console.error('WebRTC initialization failed:', error)
      throw error
    }
  }

  // Connect to signaling server
  async connectSignaling() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.hostname
    const port = import.meta.env.VITE_WS_PORT || '8089'
    const token = localStorage.getItem('auth_token')
    const wsUrl = `${protocol}//${host}:${port}/ws/webrtc?token=${token}`

    return new Promise((resolve, reject) => {
      this.signalingSocket = new WebSocket(wsUrl)

      this.signalingSocket.onopen = () => {
        console.log('WebRTC signaling connected')
        this.isConnected = true
        this.startHeartbeat()
        resolve()
      }

      this.signalingSocket.onmessage = (event) => {
        this.handleSignalingMessage(JSON.parse(event.data))
      }

      this.signalingSocket.onclose = () => {
        console.log('WebRTC signaling disconnected')
        this.isConnected = false
        this.emit('signaling-disconnected')
      }

      this.signalingSocket.onerror = (error) => {
        console.error('WebRTC signaling error:', error)
        reject(error)
      }
    })
  }

  // Setup peer connection
  setupPeerConnection() {
    this.peerConnection = new RTCPeerConnection(DEFAULT_RTC_CONFIGURATION)

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignalingMessage({
          type: 'ice-candidate',
          data: event.candidate
        })
      }
    }

    // Handle remote stream
    this.peerConnection.ontrack = (event) => {
      console.log('Received remote stream')
      this.remoteStream = event.streams[0]
      this.emit('remote-stream', this.remoteStream)
    }

    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      this.connectionState = this.peerConnection.connectionState
      console.log('Connection state:', this.connectionState)
      this.emit('connection-state-change', this.connectionState)
    }

    // Handle ICE connection state changes
    this.peerConnection.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', this.peerConnection.iceConnectionState)
      this.emit('ice-connection-state-change', this.peerConnection.iceConnectionState)
    }
  }

  // Get user media with specified constraints
  async getUserMedia(constraints = DEFAULT_MEDIA_CONSTRAINTS) {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints)

      // Add tracks to peer connection
      if (this.peerConnection) {
        this.localStream.getTracks().forEach(track => {
          this.peerConnection.addTrack(track, this.localStream)
        })
      }

      this.emit('local-stream', this.localStream)
      return this.localStream
    } catch (error) {
      console.error('Failed to get user media:', error)

      // Emit specific permission-related errors
      if (error.name === 'NotAllowedError') {
        this.emit('permission-denied', { type: 'media', error })
      } else if (error.name === 'NotFoundError') {
        this.emit('device-not-found', { type: 'media', error })
      } else if (error.name === 'NotReadableError') {
        this.emit('device-not-readable', { type: 'media', error })
      } else if (error.name === 'OverconstrainedError') {
        this.emit('constraints-error', { type: 'media', error })
      }

      throw error
    }
  }

  // Check if browser supports getUserMedia
  static isSupported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
  }

  // Check current permission status for camera and microphone
  async checkPermissions() {
    if (!navigator.permissions) {
      return { camera: 'unknown', microphone: 'unknown' }
    }

    try {
      const [cameraResult, microphoneResult] = await Promise.all([
        navigator.permissions.query({ name: 'camera' }),
        navigator.permissions.query({ name: 'microphone' })
      ])

      return {
        camera: cameraResult.state,
        microphone: microphoneResult.state
      }
    } catch (error) {
      console.warn('Could not check permissions:', error)
      return { camera: 'unknown', microphone: 'unknown' }
    }
  }

  // Request permissions with fallback
  async requestPermissions() {
    try {
      // Try to get a minimal stream to trigger permission request
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      })

      // Stop tracks immediately as we just wanted to trigger permission
      stream.getTracks().forEach(track => track.stop())

      return { success: true, permissions: await this.checkPermissions() }
    } catch (error) {
      console.error('Permission request failed:', error)
      return {
        success: false,
        error: error.name,
        message: this.getPermissionErrorMessage(error),
        permissions: await this.checkPermissions()
      }
    }
  }

  // Get user-friendly error message for permission errors
  getPermissionErrorMessage(error) {
    switch (error.name) {
      case 'NotAllowedError':
        return 'Camera and microphone access was denied. Please allow access in your browser settings.'
      case 'NotFoundError':
        return 'No camera or microphone found. Please connect a device and try again.'
      case 'NotReadableError':
        return 'Camera or microphone is already in use by another application.'
      case 'OverconstrainedError':
        return 'Camera or microphone does not support the requested settings.'
      case 'SecurityError':
        return 'Camera and microphone access is not allowed on non-secure connections.'
      default:
        return 'An error occurred while accessing camera and microphone.'
    }
  }

  // Start screen sharing
  async startScreenShare() {
    try {
      this.screenStream = await navigator.mediaDevices.getDisplayMedia(SCREEN_SHARE_CONSTRAINTS)

      // Replace video track with screen share
      if (this.peerConnection && this.localStream) {
        const videoTrack = this.localStream.getVideoTracks()[0]
        const screenTrack = this.screenStream.getVideoTracks()[0]

        if (videoTrack && screenTrack) {
          const sender = this.peerConnection.getSenders().find(s =>
            s.track && s.track.kind === 'video'
          )

          if (sender) {
            await sender.replaceTrack(screenTrack)
          }
        }

        // Handle screen share ending
        screenTrack.onended = () => {
          this.stopScreenShare()
        }
      }

      this.isScreenSharing = true
      this.emit('screen-share-started', this.screenStream)

      // Notify other participants
      this.sendSignalingMessage({
        type: 'screen-share',
        data: { started: true }
      })

      return this.screenStream
    } catch (error) {
      console.error('Failed to start screen share:', error)
      throw error
    }
  }

  // Stop screen sharing
  async stopScreenShare() {
    if (!this.isScreenSharing || !this.screenStream) return

    try {
      // Stop screen stream
      this.screenStream.getTracks().forEach(track => track.stop())

      // Replace screen track with camera track
      if (this.peerConnection && this.localStream) {
        const cameraTrack = this.localStream.getVideoTracks()[0]

        if (cameraTrack) {
          const sender = this.peerConnection.getSenders().find(s =>
            s.track && s.track.kind === 'video'
          )

          if (sender) {
            await sender.replaceTrack(cameraTrack)
          }
        }
      }

      this.isScreenSharing = false
      this.screenStream = null
      this.emit('screen-share-stopped')

      // Notify other participants
      this.sendSignalingMessage({
        type: 'stop-screen-share',
        data: { stopped: true }
      })
    } catch (error) {
      console.error('Failed to stop screen share:', error)
      throw error
    }
  }

  // Start recording
  async startRecording() {
    if (this.isRecording) return

    try {
      const options = {
        mimeType: 'video/webm;codecs=vp9,opus',
        videoBitsPerSecond: 2500000, // 2.5 Mbps for high quality
        audioBitsPerSecond: 128000   // 128 kbps for audio
      }

      // Create mixed stream for recording
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      canvas.width = 1280
      canvas.height = 720

      const canvasStream = canvas.captureStream(30)

      // Add audio from local stream
      if (this.localStream) {
        const audioTracks = this.localStream.getAudioTracks()
        audioTracks.forEach(track => canvasStream.addTrack(track))
      }

      this.mediaRecorder = new MediaRecorder(canvasStream, options)
      this.recordedChunks = []

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data)
        }
      }

      this.mediaRecorder.onstop = () => {
        this.saveRecording()
      }

      this.mediaRecorder.start(1000) // Collect data every second
      this.isRecording = true

      this.emit('recording-started')

      // Notify other participants
      this.sendSignalingMessage({
        type: 'start-recording',
        data: { started: true }
      })

    } catch (error) {
      console.error('Failed to start recording:', error)
      throw error
    }
  }

  // Stop recording
  stopRecording() {
    if (!this.isRecording || !this.mediaRecorder) return

    this.mediaRecorder.stop()
    this.isRecording = false

    this.emit('recording-stopped')

    // Notify other participants
    this.sendSignalingMessage({
      type: 'stop-recording',
      data: { stopped: true }
    })
  }

  // Save recording
  saveRecording() {
    if (this.recordedChunks.length === 0) return

    const blob = new Blob(this.recordedChunks, { type: 'video/webm' })
    const url = URL.createObjectURL(blob)

    // Create download link
    const a = document.createElement('a')
    a.style.display = 'none'
    a.href = url
    a.download = `video-call-${Date.now()}.webm`
    document.body.appendChild(a)
    a.click()

    // Cleanup
    setTimeout(() => {
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }, 100)

    this.emit('recording-saved', { blob, url })
  }

  // Join a room
  async joinRoom(roomId, callId) {
    this.roomId = roomId

    this.sendSignalingMessage({
      type: 'join-room',
      data: { room_id: roomId, call_id: callId }
    })
  }

  // Leave room
  leaveRoom() {
    if (!this.roomId) return

    this.sendSignalingMessage({
      type: 'leave-room',
      data: { room_id: this.roomId }
    })

    this.cleanup()
  }

  // Create offer
  async createOffer() {
    if (!this.peerConnection) return

    try {
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      })

      await this.peerConnection.setLocalDescription(offer)

      this.sendSignalingMessage({
        type: 'offer',
        data: offer
      })
    } catch (error) {
      console.error('Failed to create offer:', error)
      throw error
    }
  }

  // Create answer
  async createAnswer(offer) {
    if (!this.peerConnection) return

    try {
      await this.peerConnection.setRemoteDescription(offer)

      // Add pending ICE candidates
      for (const candidate of this.pendingIceCandidates) {
        await this.peerConnection.addIceCandidate(candidate)
      }
      this.pendingIceCandidates = []

      const answer = await this.peerConnection.createAnswer()
      await this.peerConnection.setLocalDescription(answer)

      this.sendSignalingMessage({
        type: 'answer',
        data: answer
      })
    } catch (error) {
      console.error('Failed to create answer:', error)
      throw error
    }
  }

  // Handle answer
  async handleAnswer(answer) {
    if (!this.peerConnection) return

    try {
      await this.peerConnection.setRemoteDescription(answer)

      // Add pending ICE candidates
      for (const candidate of this.pendingIceCandidates) {
        await this.peerConnection.addIceCandidate(candidate)
      }
      this.pendingIceCandidates = []
    } catch (error) {
      console.error('Failed to handle answer:', error)
      throw error
    }
  }

  // Handle ICE candidate
  async handleIceCandidate(candidate) {
    if (!this.peerConnection) return

    try {
      if (this.peerConnection.remoteDescription) {
        await this.peerConnection.addIceCandidate(candidate)
      } else {
        this.pendingIceCandidates.push(candidate)
      }
    } catch (error) {
      console.error('Failed to add ICE candidate:', error)
    }
  }

  // Toggle audio
  toggleAudio() {
    if (!this.localStream) return

    const audioTracks = this.localStream.getAudioTracks()
    audioTracks.forEach(track => {
      track.enabled = !track.enabled
    })

    const isEnabled = audioTracks[0]?.enabled || false
    this.emit('audio-toggle', isEnabled)

    this.sendSignalingMessage({
      type: 'mute-audio',
      data: { muted: !isEnabled }
    })

    return isEnabled
  }

  // Toggle video
  toggleVideo() {
    if (!this.localStream) return

    const videoTracks = this.localStream.getVideoTracks()
    videoTracks.forEach(track => {
      track.enabled = !track.enabled
    })

    const isEnabled = videoTracks[0]?.enabled || false
    this.emit('video-toggle', isEnabled)

    this.sendSignalingMessage({
      type: 'mute-video',
      data: { muted: !isEnabled }
    })

    return isEnabled
  }

  // Send signaling message
  sendSignalingMessage(message) {
    if (this.isConnected && this.signalingSocket) {
      this.signalingSocket.send(JSON.stringify(message))
    }
  }

  // Handle incoming signaling messages
  async handleSignalingMessage(message) {
    console.log('Received signaling message:', message.type)

    switch (message.type) {
      case 'room-joined':
        this.isHost = message.data.is_host
        this.emit('room-joined', message.data)
        break

      case 'user-joined':
        this.emit('user-joined', message.data)
        if (this.isHost) {
          await this.createOffer()
        }
        break

      case 'user-left':
        this.emit('user-left', message.data)
        break

      case 'offer':
        await this.createAnswer(message.data)
        break

      case 'answer':
        await this.handleAnswer(message.data)
        break

      case 'ice-candidate':
        await this.handleIceCandidate(message.data)
        break

      case 'mute-audio':
        this.emit('remote-audio-toggle', message.data)
        break

      case 'mute-video':
        this.emit('remote-video-toggle', message.data)
        break

      case 'screen-share':
        this.emit('remote-screen-share', message.data)
        break

      case 'stop-screen-share':
        this.emit('remote-screen-share-stopped', message.data)
        break

      case 'start-recording':
        this.emit('remote-recording-started', message.data)
        break

      case 'stop-recording':
        this.emit('remote-recording-stopped', message.data)
        break

      case 'call-end':
        this.emit('call-ended', message.data)
        this.cleanup()
        break

      case 'error':
        this.emit('error', message.data)
        break

      case 'pong':
        // Heartbeat response
        break

      default:
        console.log('Unknown message type:', message.type)
    }
  }

  // Start heartbeat
  startHeartbeat() {
    setInterval(() => {
      if (this.isConnected) {
        this.sendSignalingMessage({ type: 'ping' })
      }
    }, 30000) // Every 30 seconds
  }

  // Event handling
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, [])
    }
    this.eventHandlers.get(event).push(handler)
  }

  off(event, handler) {
    if (this.eventHandlers.has(event)) {
      const handlers = this.eventHandlers.get(event)
      const index = handlers.indexOf(handler)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    }
  }

  emit(event, data) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event).forEach(handler => handler(data))
    }
  }

  // Cleanup
  cleanup() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop())
      this.localStream = null
    }

    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => track.stop())
      this.screenStream = null
    }

    if (this.peerConnection) {
      this.peerConnection.close()
      this.peerConnection = null
    }

    if (this.signalingSocket) {
      this.signalingSocket.close()
      this.signalingSocket = null
    }

    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop()
    }

    this.isConnected = false
    this.isScreenSharing = false
    this.isRecording = false
    this.roomId = null
  }
}

// Video call API service
export const videoCallService = {
  // Initiate a video call
  async initiateCall(calleeId, callType = 'video', options = {}) {
    try {
      const response = await api.post('/video/calls/initiate', {
        callee_id: calleeId,
        call_type: callType,
        thread_id: options.threadId,
        is_emergency: options.isEmergency || false,
        quality: options.quality || 'hd'
      })
      return response.data
    } catch (error) {
      throw error
    }
  },

  // Accept a video call
  async acceptCall(callId) {
    try {
      const response = await api.post(`/video/calls/${callId}/accept`)
      return response.data
    } catch (error) {
      throw error
    }
  },

  // Reject a video call
  async rejectCall(callId) {
    try {
      const response = await api.post(`/video/calls/${callId}/reject`)
      return response.data
    } catch (error) {
      throw error
    }
  },

  // End a video call
  async endCall(callId) {
    try {
      const response = await api.post(`/video/calls/${callId}/end`)
      return response.data
    } catch (error) {
      throw error
    }
  },

  // Get call history
  async getCallHistory(page = 1, limit = 20) {
    try {
      const response = await api.get(`/video/calls/history?page=${page}&limit=${limit}`)
      return response.data
    } catch (error) {
      throw error
    }
  },

  // Start recording
  async startRecording(callId) {
    try {
      const response = await api.post(`/video/calls/${callId}/recording/start`)
      return response.data
    } catch (error) {
      throw error
    }
  },

  // Stop recording
  async stopRecording(callId) {
    try {
      const response = await api.post(`/video/calls/${callId}/recording/stop`)
      return response.data
    } catch (error) {
      throw error
    }
  },

  // Create live stream
  async createLiveStream(streamData) {
    try {
      const response = await api.post('/video/streams/create', streamData)
      return response.data
    } catch (error) {
      throw error
    }
  },

  // Start live stream
  async startLiveStream(streamId) {
    try {
      const response = await api.post(`/video/streams/${streamId}/start`)
      return response.data
    } catch (error) {
      throw error
    }
  },

  // End live stream
  async endLiveStream(streamId) {
    try {
      const response = await api.post(`/video/streams/${streamId}/end`)
      return response.data
    } catch (error) {
      throw error
    }
  },

  // Get video settings
  async getVideoSettings() {
    try {
      const response = await api.get('/video/settings')
      return response.data
    } catch (error) {
      throw error
    }
  },

  // Update video settings
  async updateVideoSettings(settings) {
    try {
      const response = await api.put('/video/settings', settings)
      return response.data
    } catch (error) {
      throw error
    }
  }
}

// Create singleton WebRTC service instance
export const webRTCService = new WebRTCService()