<template>
  <TransitionRoot as="template" :show="show">
    <DialogModal as="div" class="relative z-50" @close="closeCall">
      <TransitionChild
        as="template"
        enter="ease-out duration-300"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="ease-in duration-200"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-black bg-opacity-75 transition-opacity" />
      </TransitionChild>

      <div class="fixed inset-0 z-10 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
          <TransitionChild
            as="template"
            enter="ease-out duration-300"
            enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            enter-to="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-200"
            leave-from="opacity-100 translate-y-0 sm:scale-100"
            leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          >
            <DialogPanel class="voice-call-container">
              <!-- Header -->
              <div class="call-header">
                <div class="call-info">
                  <h2 class="call-title">{{ callStatus }}</h2>
                  <p class="call-subtitle">{{ callDuration }}</p>
                </div>
                <button @click="minimizeCall" class="minimize-btn">
                  <MinusIcon class="h-5 w-5" />
                </button>
              </div>

              <!-- Participant Display -->
              <div class="participant-display">
                <div class="participant-card" v-for="participant in participants" :key="participant.id">
                  <div class="participant-avatar">
                    <img
                      v-if="participant.avatar"
                      :src="participant.avatar"
                      :alt="participant.name"
                      class="avatar-image"
                    >
                    <div v-else class="avatar-placeholder">
                      {{ getInitials(participant.name) }}
                    </div>
                    <div class="audio-indicator" :class="{ active: participant.isSpeaking }">
                      <div class="audio-bars">
                        <div class="bar"></div>
                        <div class="bar"></div>
                        <div class="bar"></div>
                      </div>
                    </div>
                  </div>
                  <h3 class="participant-name">{{ participant.name }}</h3>
                  <div class="participant-status">
                    <div class="status-icon" :class="getStatusClass(participant.status)"></div>
                    <span class="status-text">{{ getStatusText(participant.status) }}</span>
                  </div>
                </div>
              </div>

              <!-- Call Controls -->
              <div class="call-controls">
                <button
                  @click="toggleMute"
                  :class="['control-btn', { muted: isMuted }]"
                  :title="isMuted ? 'Unmute' : 'Mute'"
                >
                  <MicrophoneIcon v-if="!isMuted" class="h-6 w-6" />
                  <MicrophoneIcon v-else class="h-6 w-6 text-red-500" />
                </button>

                <button
                  @click="toggleSpeaker"
                  :class="['control-btn', { active: speakerOn }]"
                  title="Speaker"
                >
                  <SpeakerWaveIcon class="h-6 w-6" />
                </button>

                <button
                  @click="switchToVideo"
                  class="control-btn video-btn"
                  title="Switch to Video"
                >
                  <VideoCameraIcon class="h-6 w-6" />
                </button>

                <button
                  @click="openChat"
                  :class="['control-btn', { 'has-unread': unreadMessages > 0 }]"
                  title="Chat"
                >
                  <ChatBubbleLeftEllipsisIcon class="h-6 w-6" />
                  <span v-if="unreadMessages > 0" class="unread-badge">{{ unreadMessages }}</span>
                </button>

                <button
                  @click="endCall"
                  class="control-btn end-call-btn"
                  title="End Call"
                >
                  <PhoneXMarkIcon class="h-6 w-6" />
                </button>
              </div>

              <!-- Call Statistics (collapsible) -->
              <div v-if="showStats" class="call-stats">
                <div class="stats-grid">
                  <div class="stat-item">
                    <span class="stat-label">Duration</span>
                    <span class="stat-value">{{ callDuration }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">Quality</span>
                    <div class="quality-bars">
                      <div v-for="i in 4" :key="i"
                           :class="['quality-bar', { active: callQuality >= i }]">
                      </div>
                    </div>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">Participants</span>
                    <span class="stat-value">{{ participants.length }}</span>
                  </div>
                </div>
              </div>

              <!-- Toggle stats button -->
              <button @click="showStats = !showStats" class="stats-toggle">
                <ChartBarIcon class="h-4 w-4" />
                {{ showStats ? 'Hide' : 'Show' }} Stats
              </button>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </DialogModal>

    <!-- Chat Sidebar (when opened during call) -->
    <CallChatSidebar
      :show="showChat"
      @close="closeChat"
      @send-message="sendChatMessage"
      :messages="chatMessages"
      :participants="participants"
    />
  </TransitionRoot>
</template>

<script>
import { ref, computed, onUnmounted, watch } from 'vue'
import {
  Dialog,
  DialogPanel,
  TransitionChild,
  TransitionRoot
} from '@headlessui/vue'
import {
  MicrophoneIcon,
  // MicrophoneSlashIcon, // Icon not available in this version
  SpeakerWaveIcon,
  VideoCameraIcon,
  ChatBubbleLeftEllipsisIcon,
  PhoneXMarkIcon,
  MinusIcon,
  ChartBarIcon
} from '@heroicons/vue/24/outline'
import CallChatSidebar from './CallChatSidebar.vue'
import { useCommunicationStore } from '../../stores/communication'

export default {
  name: 'VoiceCallModal',
  components: {
    DialogModal: Dialog,
    DialogPanel,
    TransitionChild,
    TransitionRoot,
    MicrophoneIcon,
    // MicrophoneSlashIcon, // Icon not available in this version
    SpeakerWaveIcon,
    VideoCameraIcon,
    ChatBubbleLeftEllipsisIcon,
    PhoneXMarkIcon,
    MinusIcon,
    ChartBarIcon,
    CallChatSidebar
  },
  props: {
    show: {
      type: Boolean,
      default: false
    }
  },
  emits: ['close', 'call-ended', 'switch-to-video'],
  setup(props, { emit }) {
    const communicationStore = useCommunicationStore()

    // Call state
    const isMuted = ref(false)
    const speakerOn = ref(true)
    const showChat = ref(false)
    const showStats = ref(false)
    const callStartTime = ref(null)
    const callDuration = ref('00:00')
    const callQuality = ref(4)
    const unreadMessages = ref(0)

    // Mock participants data
    const participants = ref([
      {
        id: 1,
        name: 'John Smith',
        avatar: null,
        status: 'connected',
        isSpeaking: false,
        isMuted: false
      },
      {
        id: 2,
        name: 'Sarah Johnson',
        avatar: null,
        status: 'connected',
        isSpeaking: true,
        isMuted: false
      }
    ])

    // Mock chat messages
    const chatMessages = ref([
      {
        id: 1,
        sender: 'John Smith',
        message: 'Can you hear me clearly?',
        timestamp: new Date(Date.now() - 120000)
      }
    ])

    const callStatus = computed(() => {
      return participants.value.length > 1 ?
        `Voice call with ${participants.value.length} participants` :
        'Voice call'
    })

    // Duration timer
    let durationTimer = null

    const updateDuration = () => {
      if (callStartTime.value) {
        const elapsed = Math.floor((Date.now() - callStartTime.value) / 1000)
        const minutes = Math.floor(elapsed / 60)
        const seconds = elapsed % 60
        callDuration.value = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      }
    }

    // Call controls
    const toggleMute = async () => {
      try {
        isMuted.value = !isMuted.value
        // Here you would integrate with WebRTC to actually mute/unmute
        console.log('Mute toggled:', isMuted.value)
      } catch (error) {
        console.error('Failed to toggle mute:', error)
      }
    }

    const toggleSpeaker = () => {
      speakerOn.value = !speakerOn.value
      // Here you would change audio output device
      console.log('Speaker toggled:', speakerOn.value)
    }

    const switchToVideo = () => {
      emit('switch-to-video')
    }

    const openChat = () => {
      showChat.value = true
      unreadMessages.value = 0
    }

    const closeChat = () => {
      showChat.value = false
    }

    const sendChatMessage = (message) => {
      const newMessage = {
        id: Date.now(),
        sender: 'You',
        message: message,
        timestamp: new Date()
      }
      chatMessages.value.push(newMessage)

      // Send through communication store
      communicationStore.sendMessage({
        type: 'call_chat',
        payload: newMessage
      })
    }

    const endCall = async () => {
      try {
        // Clean up WebRTC connections
        if (durationTimer) {
          clearInterval(durationTimer)
          durationTimer = null
        }

        emit('call-ended')
        emit('close')
      } catch (error) {
        console.error('Failed to end call:', error)
      }
    }

    const closeCall = () => {
      endCall()
    }

    const minimizeCall = () => {
      // This would minimize to a small floating window
      console.log('Minimize call - implement floating window')
    }

    // Utility functions
    const getInitials = (name) => {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }

    const getStatusClass = (status) => {
      const classes = {
        'connected': 'status-connected',
        'connecting': 'status-connecting',
        'disconnected': 'status-disconnected'
      }
      return classes[status] || 'status-unknown'
    }

    const getStatusText = (status) => {
      const texts = {
        'connected': 'Connected',
        'connecting': 'Connecting...',
        'disconnected': 'Disconnected'
      }
      return texts[status] || 'Unknown'
    }

    // Lifecycle
    watch(() => props.show, (newShow) => {
      if (newShow) {
        callStartTime.value = Date.now()
        durationTimer = setInterval(updateDuration, 1000)
        updateDuration()
      } else {
        if (durationTimer) {
          clearInterval(durationTimer)
          durationTimer = null
        }
        callStartTime.value = null
        callDuration.value = '00:00'
      }
    })

    onUnmounted(() => {
      if (durationTimer) {
        clearInterval(durationTimer)
      }
    })

    return {
      // State
      isMuted,
      speakerOn,
      showChat,
      showStats,
      callDuration,
      callQuality,
      unreadMessages,
      participants,
      chatMessages,

      // Computed
      callStatus,

      // Methods
      toggleMute,
      toggleSpeaker,
      switchToVideo,
      openChat,
      closeChat,
      sendChatMessage,
      endCall,
      closeCall,
      minimizeCall,
      getInitials,
      getStatusClass,
      getStatusText
    }
  }
}
</script>

<style scoped>
.voice-call-container {
  @apply relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  min-height: 400px;
}

.call-header {
  @apply flex items-center justify-between p-6 pb-4;
}

.call-info h2 {
  @apply text-xl font-semibold;
}

.call-info p {
  @apply text-sm opacity-90;
}

.minimize-btn {
  @apply p-2 rounded-full hover:bg-white hover:bg-opacity-20 transition-all duration-200;
}

.participant-display {
  @apply grid grid-cols-1 gap-4 px-6 py-4;
}

.participant-card {
  @apply text-center;
}

.participant-avatar {
  @apply relative mx-auto mb-3 w-24 h-24;
}

.avatar-image {
  @apply w-full h-full rounded-full object-cover border-4 border-white border-opacity-30;
}

.avatar-placeholder {
  @apply w-full h-full rounded-full bg-white bg-opacity-20 flex items-center justify-center text-2xl font-bold;
}

.audio-indicator {
  @apply absolute -bottom-2 -right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center;
  transition: all 0.3s ease;
}

.audio-indicator.active {
  @apply bg-green-500;
  animation: pulse-audio 1s infinite;
}

.audio-bars {
  @apply flex gap-1;
}

.audio-bars .bar {
  @apply w-1 bg-gray-400 rounded-full;
  height: 8px;
  animation: audio-wave 1s ease-in-out infinite;
}

.audio-bars .bar:nth-child(2) { animation-delay: 0.2s; }
.audio-bars .bar:nth-child(3) { animation-delay: 0.4s; }

.audio-indicator.active .bar {
  @apply bg-white;
}

@keyframes pulse-audio {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

@keyframes audio-wave {
  0%, 100% { height: 4px; }
  50% { height: 12px; }
}

.participant-name {
  @apply text-lg font-medium mb-1;
}

.participant-status {
  @apply flex items-center justify-center gap-2 text-sm opacity-90;
}

.status-icon {
  @apply w-2 h-2 rounded-full;
}

.status-connected {
  @apply bg-green-400;
}

.status-connecting {
  @apply bg-yellow-400;
  animation: pulse 1s infinite;
}

.status-disconnected {
  @apply bg-red-400;
}

.call-controls {
  @apply flex items-center justify-center gap-4 p-6;
}

.control-btn {
  @apply p-3 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30
         transition-all duration-200 transform hover:scale-105;
}

.control-btn.muted {
  @apply bg-red-500 bg-opacity-80;
}

.control-btn.active {
  @apply bg-blue-500 bg-opacity-80;
}

.control-btn.video-btn {
  @apply bg-blue-600 bg-opacity-80;
}

.control-btn.end-call-btn {
  @apply bg-red-600 bg-opacity-80 hover:bg-red-700;
}

.control-btn.has-unread {
  @apply relative;
}

.unread-badge {
  @apply absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5
         flex items-center justify-center font-semibold;
}

.call-stats {
  @apply px-6 py-4 bg-white bg-opacity-10 rounded-lg mx-6 mb-4;
}

.stats-grid {
  @apply grid grid-cols-3 gap-4;
}

.stat-item {
  @apply text-center;
}

.stat-label {
  @apply block text-xs opacity-80 mb-1;
}

.stat-value {
  @apply text-sm font-semibold;
}

.quality-bars {
  @apply flex justify-center gap-1;
}

.quality-bar {
  @apply w-1 h-3 bg-white bg-opacity-30 rounded-full;
}

.quality-bar.active {
  @apply bg-green-400;
}

.stats-toggle {
  @apply flex items-center justify-center gap-2 w-full py-2 text-sm opacity-80
         hover:opacity-100 transition-opacity duration-200;
}

/* Dark theme support */
[data-theme="dark"] .voice-call-container {
  background: linear-gradient(135deg, #4c51bf 0%, #553c9a 100%);
}

/* Responsive design */
@media (min-width: 640px) {
  .participant-display {
    @apply grid-cols-2;
  }
}

@media (min-width: 768px) {
  .voice-call-container {
    @apply sm:max-w-2xl;
  }

  .participant-display {
    @apply grid-cols-3;
  }
}
</style>