<template>
  <BaseModal :show="show" @close="$emit('close')" size="full" :closable="false">
    <div class="video-call-container">
      <!-- Header Controls -->
      <div class="call-header">
        <div class="call-info">
          <div class="participant-info">
            <div class="participant-avatar">
              <img v-if="participant.avatar" :src="participant.avatar" :alt="participant.name" />
              <div v-else class="avatar-placeholder">
                {{ getInitials(participant.name) }}
              </div>
            </div>
            <div class="participant-details">
              <h3 class="participant-name">{{ participant.name }}</h3>
              <p class="call-status">{{ callStatusText }}</p>
            </div>
          </div>
          <div class="call-timer">{{ formattedDuration }}</div>
        </div>

        <div class="call-actions">
          <button
            v-if="callStatus === 'incoming'"
            @click="acceptCall"
            class="action-btn accept"
            title="Accept Call"
          >
            <PhoneIcon class="h-6 w-6" />
          </button>

          <button
            @click="toggleMute"
            :class="['action-btn', isMuted ? 'muted' : 'unmuted']"
            :title="isMuted ? 'Unmute' : 'Mute'"
          >
            <MicrophoneIcon v-if="!isMuted" class="h-6 w-6" />
            <MicrophoneIcon v-else class="h-6 w-6 text-red-500" />
          </button>

          <button
            @click="toggleVideo"
            :class="['action-btn', isVideoOff ? 'video-off' : 'video-on']"
            :title="isVideoOff ? 'Turn On Video' : 'Turn Off Video'"
          >
            <VideoCameraIcon v-if="!isVideoOff" class="h-6 w-6" />
            <VideoCameraSlashIcon v-else class="h-6 w-6" />
          </button>

          <button
            @click="toggleScreenShare"
            :class="['action-btn', isScreenSharing ? 'screen-sharing' : 'screen-idle']"
            :title="isScreenSharing ? 'Stop Sharing' : 'Share Screen'"
          >
            <ComputerDesktopIcon class="h-6 w-6" />
          </button>

          <button
            @click="endCall"
            class="action-btn end-call"
            title="End Call"
          >
            <PhoneXMarkIcon class="h-6 w-6" />
          </button>
        </div>
      </div>

      <!-- Video Container -->
      <div class="video-container">
        <!-- Remote Video -->
        <div class="remote-video-wrapper">
          <video
            ref="remoteVideo"
            class="remote-video"
            autoplay
            playsinline
          ></video>

          <!-- Video placeholder when video is off -->
          <div v-if="remoteVideoOff" class="video-placeholder remote">
            <div class="avatar-large">
              <img v-if="participant.avatar" :src="participant.avatar" :alt="participant.name" />
              <div v-else class="avatar-placeholder-large">
                {{ getInitials(participant.name) }}
              </div>
            </div>
            <p class="participant-name">{{ participant.name }}</p>
            <p class="video-status">Camera is off</p>
          </div>

          <!-- Connection status overlay -->
          <div v-if="connectionQuality !== 'good'" class="connection-overlay">
            <div class="connection-indicator" :class="connectionQuality">
              <WifiIcon v-if="connectionQuality === 'fair'" class="h-5 w-5" />
              <ExclamationTriangleIcon v-else class="h-5 w-5" />
            </div>
            <span>{{ connectionQualityText }}</span>
          </div>
        </div>

        <!-- Local Video (Picture-in-Picture) -->
        <div class="local-video-wrapper" :class="{ 'video-off': isVideoOff }">
          <video
            ref="localVideo"
            class="local-video"
            autoplay
            muted
            playsinline
          ></video>

          <div v-if="isVideoOff" class="video-placeholder local">
            <div class="avatar-small">
              <UserIcon class="h-8 w-8" />
            </div>
            <p class="text-xs">You</p>
          </div>

          <!-- Local video controls -->
          <div class="local-video-controls">
            <button @click="switchCamera" class="control-btn" title="Switch Camera">
              <ArrowPathIcon class="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <!-- Chat Panel (Collapsible) -->
      <transition name="slide-right">
        <div v-if="showChat" class="chat-panel">
          <div class="chat-header">
            <h4>Meeting Chat</h4>
            <button @click="showChat = false" class="close-chat-btn">
              <XMarkIcon class="h-5 w-5" />
            </button>
          </div>

          <div class="chat-messages" ref="chatMessages">
            <div
              v-for="message in chatMessages"
              :key="message.id"
              class="chat-message"
              :class="{ 'own-message': message.sender === 'self' }"
            >
              <div class="message-content">
                <span class="sender-name">{{ message.senderName }}</span>
                <p class="message-text">{{ message.text }}</p>
                <span class="message-time">{{ formatTime(message.timestamp) }}</span>
              </div>
            </div>
          </div>

          <div class="chat-input">
            <input
              v-model="newMessage"
              @keypress.enter="sendChatMessage"
              placeholder="Type a message..."
              class="message-input"
            />
            <button @click="sendChatMessage" class="send-btn">
              <PaperAirplaneIcon class="h-5 w-5" />
            </button>
          </div>
        </div>
      </transition>

      <!-- Bottom Controls -->
      <div class="bottom-controls">
        <div class="left-controls">
          <button @click="showChat = !showChat" class="control-btn" :class="{ active: showChat }">
            <ChatBubbleLeftRightIcon class="h-5 w-5" />
            <span v-if="unreadChatCount > 0" class="chat-badge">{{ unreadChatCount }}</span>
          </button>

          <button @click="showParticipants = !showParticipants" class="control-btn">
            <UsersIcon class="h-5 w-5" />
            <span class="participant-count">{{ participantCount }}</span>
          </button>

          <button @click="showSettings = !showSettings" class="control-btn">
            <CogIcon class="h-5 w-5" />
          </button>
        </div>

        <div class="center-controls">
          <div class="call-quality">
            <div class="quality-bars">
              <div class="bar" :class="{ active: connectionQuality !== 'poor' }"></div>
              <div class="bar" :class="{ active: connectionQuality === 'good' }"></div>
              <div class="bar" :class="{ active: connectionQuality === 'excellent' }"></div>
            </div>
            <span class="quality-text">{{ connectionQualityText }}</span>
          </div>
        </div>

        <div class="right-controls">
          <button @click="toggleFullscreen" class="control-btn">
            <ArrowsPointingOutIcon v-if="!isFullscreen" class="h-5 w-5" />
            <ArrowsPointingInIcon v-else class="h-5 w-5" />
          </button>
        </div>
      </div>

      <!-- Incoming Call Overlay -->
      <div v-if="callStatus === 'incoming'" class="incoming-call-overlay">
        <div class="incoming-call-content">
          <div class="caller-info">
            <div class="caller-avatar">
              <img v-if="participant.avatar" :src="participant.avatar" :alt="participant.name" />
              <div v-else class="avatar-placeholder-large">
                {{ getInitials(participant.name) }}
              </div>
            </div>
            <h2 class="caller-name">{{ participant.name }}</h2>
            <p class="call-type">Incoming video call</p>
          </div>

          <div class="incoming-call-actions">
            <button @click="declineCall" class="decline-btn">
              <PhoneXMarkIcon class="h-8 w-8" />
            </button>
            <button @click="acceptCall" class="accept-btn">
              <PhoneIcon class="h-8 w-8" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </BaseModal>
</template>

<script>
import {
  PhoneIcon,
  PhoneXMarkIcon,
  MicrophoneIcon,
  // MicrophoneSlashIcon, // Icon not available in this version
  VideoCameraIcon,
  VideoCameraSlashIcon,
  ComputerDesktopIcon,
  UserIcon,
  ChatBubbleLeftRightIcon,
  UsersIcon,
  CogIcon,
  ArrowPathIcon,
  XMarkIcon,
  PaperAirplaneIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  WifiIcon,
  ExclamationTriangleIcon
} from '@heroicons/vue/24/outline'
import BaseModal from '../BaseModal.vue'
import { useCommunicationStore } from '../../stores/communication'

export default {
  name: 'VideoCallModal',
  components: {
    BaseModal,
    PhoneIcon,
    PhoneXMarkIcon,
    MicrophoneIcon,
    // MicrophoneSlashIcon, // Icon not available in this version
    VideoCameraIcon,
    VideoCameraSlashIcon,
    ComputerDesktopIcon,
    UserIcon,
    ChatBubbleLeftRightIcon,
    UsersIcon,
    CogIcon,
    ArrowPathIcon,
    XMarkIcon,
    PaperAirplaneIcon,
    ArrowsPointingOutIcon,
    ArrowsPointingInIcon,
    WifiIcon,
    ExclamationTriangleIcon
  },
  props: {
    show: {
      type: Boolean,
      default: false
    },
    participant: {
      type: Object,
      default: () => ({
        name: 'John Smith',
        avatar: null,
        email: 'john@company.com'
      })
    },
    callType: {
      type: String,
      default: 'outgoing' // 'incoming', 'outgoing'
    }
  },
  emits: ['close', 'call-started', 'call-ended'],
  data() {
    return {
      callStatus: 'connecting', // 'incoming', 'connecting', 'connected', 'ended'
      callStartTime: null,
      callDuration: 0,
      isMuted: false,
      isVideoOff: false,
      isScreenSharing: false,
      remoteVideoOff: false,
      connectionQuality: 'good', // 'excellent', 'good', 'fair', 'poor'
      isFullscreen: false,
      showChat: false,
      showParticipants: false,
      showSettings: false,
      chatMessages: [],
      newMessage: '',
      unreadChatCount: 0,
      participantCount: 2,

      // WebRTC
      localStream: null,
      remoteStream: null,
      peerConnection: null,

      // Timers
      durationTimer: null,
      qualityTimer: null
    }
  },
  computed: {
    communicationStore() {
      return useCommunicationStore()
    },
    callStatusText() {
      const statusMap = {
        incoming: 'Incoming call...',
        connecting: 'Connecting...',
        connected: 'Connected',
        ended: 'Call ended'
      }
      return statusMap[this.callStatus] || 'Unknown'
    },
    formattedDuration() {
      const hours = Math.floor(this.callDuration / 3600)
      const minutes = Math.floor((this.callDuration % 3600) / 60)
      const seconds = this.callDuration % 60

      if (hours > 0) {
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      } else {
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      }
    },
    connectionQualityText() {
      const qualityMap = {
        excellent: 'Excellent',
        good: 'Good',
        fair: 'Fair',
        poor: 'Poor Connection'
      }
      return qualityMap[this.connectionQuality] || 'Unknown'
    }
  },
  methods: {
    getInitials(name) {
      return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    },

    formatTime(timestamp) {
      return new Date(timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      })
    },

    async initializeCall() {
      try {
        if (this.callType === 'incoming') {
          this.callStatus = 'incoming'
        } else {
          this.callStatus = 'connecting'
          await this.setupLocalVideo()
          await this.initiateCall()
        }
      } catch (error) {
        console.error('Failed to initialize call:', error)
        this.callStatus = 'ended'
      }
    },

    async setupLocalVideo() {
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        })

        if (this.$refs.localVideo) {
          this.$refs.localVideo.srcObject = this.localStream
        }
      } catch (error) {
        console.error('Failed to get user media:', error)
        this.isVideoOff = true
      }
    },

    async initiateCall() {
      // Initialize WebRTC peer connection
      this.peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' }
        ]
      })

      // Add local stream to peer connection
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          this.peerConnection.addTrack(track, this.localStream)
        })
      }

      // Handle remote stream
      this.peerConnection.ontrack = (event) => {
        this.remoteStream = event.streams[0]
        if (this.$refs.remoteVideo) {
          this.$refs.remoteVideo.srcObject = this.remoteStream
        }
      }

      // Handle connection state changes
      this.peerConnection.onconnectionstatechange = () => {
        console.log('Connection state:', this.peerConnection.connectionState)
        if (this.peerConnection.connectionState === 'connected') {
          this.onCallConnected()
        } else if (this.peerConnection.connectionState === 'disconnected' ||
                   this.peerConnection.connectionState === 'failed') {
          this.endCall()
        }
      }

      // Simulate connection for demo
      setTimeout(() => {
        this.onCallConnected()
      }, 2000)
    },

    async acceptCall() {
      await this.setupLocalVideo()
      this.onCallConnected()
    },

    declineCall() {
      this.callStatus = 'ended'
      this.$emit('close')
    },

    onCallConnected() {
      this.callStatus = 'connected'
      this.callStartTime = Date.now()
      this.startDurationTimer()
      this.startQualityMonitoring()

      this.$emit('call-started', {
        participant: this.participant,
        startTime: this.callStartTime
      })
    },

    startDurationTimer() {
      this.durationTimer = setInterval(() => {
        if (this.callStartTime) {
          this.callDuration = Math.floor((Date.now() - this.callStartTime) / 1000)
        }
      }, 1000)
    },

    startQualityMonitoring() {
      // Simulate connection quality changes
      this.qualityTimer = setInterval(() => {
        const qualities = ['excellent', 'good', 'fair', 'poor']
        const randomIndex = Math.floor(Math.random() * qualities.length)
        this.connectionQuality = qualities[randomIndex]
      }, 10000)
    },

    toggleMute() {
      this.isMuted = !this.isMuted
      if (this.localStream) {
        this.localStream.getAudioTracks().forEach(track => {
          track.enabled = !this.isMuted
        })
      }
    },

    toggleVideo() {
      this.isVideoOff = !this.isVideoOff
      if (this.localStream) {
        this.localStream.getVideoTracks().forEach(track => {
          track.enabled = !this.isVideoOff
        })
      }
    },

    async toggleScreenShare() {
      if (!this.isScreenSharing) {
        try {
          const screenStream = await this.communicationStore.startScreenShare()
          // Replace video track with screen share
          const videoTrack = screenStream.getVideoTracks()[0]
          const sender = this.peerConnection.getSenders().find(s =>
            s.track && s.track.kind === 'video'
          )
          if (sender) {
            await sender.replaceTrack(videoTrack)
          }
          this.isScreenSharing = true
        } catch (error) {
          console.error('Screen share failed:', error)
        }
      } else {
        // Switch back to camera
        if (this.localStream) {
          const videoTrack = this.localStream.getVideoTracks()[0]
          const sender = this.peerConnection.getSenders().find(s =>
            s.track && s.track.kind === 'video'
          )
          if (sender && videoTrack) {
            await sender.replaceTrack(videoTrack)
          }
        }
        this.communicationStore.stopScreenShare()
        this.isScreenSharing = false
      }
    },

    switchCamera() {
      // Implementation for switching between front/back camera
      console.log('Switching camera...')
    },

    toggleFullscreen() {
      if (!this.isFullscreen) {
        this.$el.requestFullscreen?.()
      } else {
        document.exitFullscreen?.()
      }
    },

    sendChatMessage() {
      if (this.newMessage.trim()) {
        const message = {
          id: Date.now(),
          sender: 'self',
          senderName: 'You',
          text: this.newMessage,
          timestamp: Date.now()
        }

        this.chatMessages.push(message)
        this.newMessage = ''

        // Auto-scroll to bottom
        this.$nextTick(() => {
          if (this.$refs.chatMessages) {
            this.$refs.chatMessages.scrollTop = this.$refs.chatMessages.scrollHeight
          }
        })
      }
    },

    async endCall() {
      try {
        this.callStatus = 'ended'

        // Stop timers
        if (this.durationTimer) {
          clearInterval(this.durationTimer)
        }
        if (this.qualityTimer) {
          clearInterval(this.qualityTimer)
        }

        // Stop local stream
        if (this.localStream) {
          this.localStream.getTracks().forEach(track => track.stop())
        }

        // Close peer connection
        if (this.peerConnection) {
          this.peerConnection.close()
        }

        // Stop screen sharing
        if (this.isScreenSharing) {
          this.communicationStore.stopScreenShare()
        }

        this.$emit('call-ended', {
          participant: this.participant,
          duration: this.callDuration,
          endTime: Date.now()
        })

        // Close modal after a brief delay
        setTimeout(() => {
          this.$emit('close')
        }, 1500)

      } catch (error) {
        console.error('Error ending call:', error)
        this.$emit('close')
      }
    }
  },

  watch: {
    show(newVal) {
      if (newVal) {
        this.initializeCall()
      } else {
        this.endCall()
      }
    }
  },

  beforeUnmount() {
    this.endCall()
  }
}
</script>

<style scoped>
.video-call-container {
  @apply h-screen bg-gray-900 text-white flex flex-col relative;
  background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
}

[data-bs-theme="dark"] .video-call-container {
  background: linear-gradient(135deg, #0f172a 0%, #020617 100%);
}

.call-header {
  @apply flex items-center justify-between p-6 bg-gray-800 bg-opacity-95 backdrop-blur-lg;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

[data-bs-theme="dark"] .call-header {
  @apply bg-slate-900 bg-opacity-95;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
}

.call-info {
  @apply flex items-center gap-4;
}

.participant-info {
  @apply flex items-center gap-3;
}

.participant-avatar {
  @apply w-14 h-14 rounded-full overflow-hidden border-2 border-white border-opacity-20;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

[data-bs-theme="dark"] .participant-avatar {
  border-color: rgba(148, 163, 184, 0.3);
}

.participant-avatar img {
  @apply w-full h-full object-cover;
}

.avatar-placeholder {
  @apply w-full h-full bg-gradient-to-br from-primary-500 to-primary-700
         flex items-center justify-center text-white font-bold text-lg;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
}

[data-bs-theme="dark"] .avatar-placeholder {
  background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%);
}

.participant-details h3 {
  @apply text-xl font-bold text-white mb-1;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
}

.participant-details p {
  @apply text-sm text-gray-300 font-medium;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
}

[data-bs-theme="dark"] .participant-details p {
  @apply text-slate-400;
}

.call-timer {
  @apply text-xl font-mono text-green-400 font-bold px-3 py-1 rounded-lg;
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
  text-shadow: 0 0 10px rgba(34, 197, 94, 0.5);
}

.call-actions {
  @apply flex items-center gap-2;
}

.action-btn {
  @apply p-4 rounded-full transition-all duration-300 ease-out
         flex items-center justify-center shadow-lg hover:shadow-xl
         transform hover:scale-105 active:scale-95;
  min-width: 56px;
  min-height: 56px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.action-btn.accept {
  @apply bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white;
  box-shadow: 0 8px 32px rgba(34, 197, 94, 0.3);
}

.action-btn.unmuted {
  @apply bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white;
  box-shadow: 0 8px 32px rgba(71, 85, 105, 0.2);
}

.action-btn.muted {
  @apply bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white;
  box-shadow: 0 8px 32px rgba(239, 68, 68, 0.3);
}

.action-btn.video-on {
  @apply bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white;
  box-shadow: 0 8px 32px rgba(71, 85, 105, 0.2);
}

.action-btn.video-off {
  @apply bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white;
  box-shadow: 0 8px 32px rgba(239, 68, 68, 0.3);
}

.action-btn.screen-idle {
  @apply bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white;
  box-shadow: 0 8px 32px rgba(71, 85, 105, 0.2);
}

.action-btn.screen-sharing {
  @apply bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white;
  box-shadow: 0 8px 32px rgba(59, 130, 246, 0.3);
}

.action-btn.end-call {
  @apply bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white;
  box-shadow: 0 8px 32px rgba(239, 68, 68, 0.4);
}

[data-bs-theme="dark"] .action-btn {
  border: 1px solid rgba(148, 163, 184, 0.2);
}

[data-bs-theme="dark"] .action-btn.unmuted,
[data-bs-theme="dark"] .action-btn.video-on,
[data-bs-theme="dark"] .action-btn.screen-idle {
  @apply bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900;
}

.video-container {
  @apply flex-1 relative bg-black;
}

.remote-video-wrapper {
  @apply absolute inset-0;
}

.remote-video {
  @apply w-full h-full object-cover;
}

.video-placeholder {
  @apply absolute inset-0 flex flex-col items-center justify-center text-center;
  background: linear-gradient(135deg, #374151 0%, #1f2937 100%);
}

[data-bs-theme="dark"] .video-placeholder {
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
}

.video-placeholder.remote {
  @apply text-center;
}

.avatar-large {
  @apply w-40 h-40 rounded-full overflow-hidden mb-6 border-4 border-white border-opacity-20;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
}

[data-bs-theme="dark"] .avatar-large {
  border-color: rgba(148, 163, 184, 0.3);
}

.avatar-large img {
  @apply w-full h-full object-cover;
}

.avatar-placeholder-large {
  @apply w-full h-full flex items-center justify-center text-white font-bold text-5xl;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
}

[data-bs-theme="dark"] .avatar-placeholder-large {
  background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%);
}

.video-placeholder .participant-name {
  @apply text-3xl font-bold mb-3 text-white;
  text-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
}

.video-placeholder .video-status {
  @apply text-gray-300 text-lg font-medium px-4 py-2 rounded-full;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

[data-bs-theme="dark"] .video-placeholder .video-status {
  @apply text-slate-400;
  background: rgba(0, 0, 0, 0.5);
}

.connection-overlay {
  @apply absolute top-4 left-4 bg-black bg-opacity-70 rounded-lg px-3 py-2
         flex items-center gap-2 text-sm;
}

.connection-indicator.fair {
  @apply text-yellow-400;
}

.connection-indicator.poor {
  @apply text-red-400;
}

.local-video-wrapper {
  @apply absolute bottom-6 right-6 w-52 h-40 rounded-xl overflow-hidden
         border-2 border-white border-opacity-20 shadow-2xl;
  background: linear-gradient(135deg, #374151 0%, #1f2937 100%);
  backdrop-filter: blur(20px);
}

[data-bs-theme="dark"] .local-video-wrapper {
  border-color: rgba(148, 163, 184, 0.3);
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
}

.local-video-wrapper.video-off {
  background: linear-gradient(135deg, #4b5563 0%, #374151 100%);
}

[data-bs-theme="dark"] .local-video-wrapper.video-off {
  background: linear-gradient(135deg, #334155 0%, #1e293b 100%);
}

.local-video {
  @apply w-full h-full object-cover;
}

.video-placeholder.local {
  @apply absolute inset-0 bg-gray-700 flex flex-col items-center justify-center text-center;
}

.avatar-small {
  @apply w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center mb-2;
}

.local-video-controls {
  @apply absolute top-2 right-2 flex gap-1;
}

.control-btn {
  @apply p-2 bg-black bg-opacity-50 rounded-full text-white
         hover:bg-opacity-70 transition-all duration-200;
}

.chat-panel {
  @apply absolute top-0 right-0 h-full w-80 text-white
         flex flex-col border-l border-gray-600;
  background: linear-gradient(180deg, rgba(31, 41, 55, 0.95) 0%, rgba(17, 24, 39, 0.95) 100%);
  backdrop-filter: blur(20px);
}

[data-bs-theme="dark"] .chat-panel {
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(2, 6, 23, 0.95) 100%);
  border-color: rgba(148, 163, 184, 0.2);
}

.chat-header {
  @apply flex items-center justify-between p-4 border-b border-gray-600;
  background: rgba(0, 0, 0, 0.2);
}

[data-bs-theme="dark"] .chat-header {
  border-color: rgba(148, 163, 184, 0.2);
  background: rgba(0, 0, 0, 0.3);
}

.chat-header h4 {
  @apply font-bold text-white;
}

.close-chat-btn {
  @apply p-2 hover:bg-gray-700 rounded-lg text-gray-300 hover:text-white transition-all duration-200;
}

[data-bs-theme="dark"] .close-chat-btn {
  @apply hover:bg-slate-700;
}

.chat-messages {
  @apply flex-1 overflow-y-auto p-4 space-y-3;
}

.chat-message {
  @apply flex;
}

.chat-message.own-message {
  @apply justify-end;
}

.message-content {
  @apply max-w-xs p-3 rounded-xl backdrop-filter backdrop-blur-sm;
  background: rgba(55, 65, 81, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

[data-bs-theme="dark"] .message-content {
  background: rgba(30, 41, 59, 0.8);
  border-color: rgba(148, 163, 184, 0.2);
}

.chat-message.own-message .message-content {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  border-color: rgba(59, 130, 246, 0.3);
}

[data-bs-theme="dark"] .chat-message.own-message .message-content {
  background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%);
}

.sender-name {
  @apply block font-semibold text-xs mb-1 text-gray-300;
}

[data-bs-theme="dark"] .sender-name {
  @apply text-slate-400;
}

.chat-message.own-message .sender-name {
  @apply text-blue-100;
}

.message-text {
  @apply text-sm text-white;
}

.message-time {
  @apply block text-xs opacity-70 mt-1 text-gray-400;
}

[data-bs-theme="dark"] .message-time {
  @apply text-slate-500;
}

.chat-input {
  @apply flex p-4 border-t border-gray-600;
  background: rgba(0, 0, 0, 0.2);
}

[data-bs-theme="dark"] .chat-input {
  border-color: rgba(148, 163, 184, 0.2);
  background: rgba(0, 0, 0, 0.3);
}

.message-input {
  @apply flex-1 px-4 py-3 bg-gray-700 text-white rounded-l-xl border border-gray-600
         focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400
         transition-all duration-200;
}

[data-bs-theme="dark"] .message-input {
  @apply bg-slate-800 border-slate-600 focus:ring-blue-400;
}

.send-btn {
  @apply px-6 py-3 rounded-r-xl transition-all duration-200 font-medium;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.send-btn:hover {
  background: linear-gradient(135deg, #1d4ed8 0%, #1e3a8a 100%);
  transform: translateY(-1px);
  box-shadow: 0 8px 25px rgba(59, 130, 246, 0.3);
}

.bottom-controls {
  @apply flex items-center justify-between p-4 bg-gray-800 bg-opacity-90;
}

.left-controls, .right-controls {
  @apply flex items-center gap-2;
}

.center-controls {
  @apply flex items-center gap-4;
}

.control-btn.active {
  @apply bg-primary-500;
}

.chat-badge {
  @apply absolute -top-1 -right-1 bg-red-500 text-white text-xs
         rounded-full h-4 w-4 flex items-center justify-center;
}

.participant-count {
  @apply absolute -top-1 -right-1 bg-gray-600 text-white text-xs
         rounded-full h-4 w-4 flex items-center justify-center;
}

.call-quality {
  @apply flex items-center gap-2;
}

.quality-bars {
  @apply flex items-end gap-1;
}

.bar {
  @apply w-1 bg-gray-600 rounded-full transition-colors;
}

.bar:nth-child(1) {
  @apply h-2;
}

.bar:nth-child(2) {
  @apply h-3;
}

.bar:nth-child(3) {
  @apply h-4;
}

.bar.active {
  @apply bg-green-400;
}

.quality-text {
  @apply text-sm text-gray-300;
}

.incoming-call-overlay {
  @apply absolute inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50;
}

.incoming-call-content {
  @apply text-center;
}

.caller-info {
  @apply mb-8;
}

.caller-avatar {
  @apply w-32 h-32 mx-auto rounded-full overflow-hidden mb-4;
}

.caller-name {
  @apply text-3xl font-bold mb-2;
}

.call-type {
  @apply text-gray-300 text-lg;
}

.incoming-call-actions {
  @apply flex items-center justify-center gap-8;
}

.decline-btn, .accept-btn {
  @apply p-4 rounded-full transition-all duration-200;
}

.decline-btn {
  @apply bg-red-500 hover:bg-red-600 text-white;
}

.accept-btn {
  @apply bg-green-500 hover:bg-green-600 text-white;
}

/* Slide transitions */
.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 0.3s ease;
}

.slide-right-enter-from {
  transform: translateX(100%);
}

.slide-right-leave-to {
  transform: translateX(100%);
}

/* Responsive design */
@media (max-width: 768px) {
  .chat-panel {
    @apply w-full;
  }

  .local-video-wrapper {
    @apply w-32 h-24 bottom-20 right-2;
  }

  .call-header {
    @apply flex-col gap-4;
  }
}
</style>