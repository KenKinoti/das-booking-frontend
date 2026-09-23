<template>
  <TransitionRoot as="template" :show="show">
    <DialogModal as="div" class="relative z-50" @close="closeScreenShare">
      <TransitionChild
        as="template"
        enter="ease-out duration-300"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="ease-in duration-200"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-black bg-opacity-90 transition-opacity" />
      </TransitionChild>

      <div class="fixed inset-0 z-10 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4">
          <TransitionChild
            as="template"
            enter="ease-out duration-300"
            enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            enter-to="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-200"
            leave-from="opacity-100 translate-y-0 sm:scale-100"
            leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          >
            <DialogPanel class="screen-share-container">
              <!-- Header -->
              <div class="share-header">
                <div class="header-info">
                  <div class="share-status">
                    <div class="recording-indicator">
                      <div class="recording-dot"></div>
                    </div>
                    <div>
                      <h2 class="share-title">{{ shareStatus }}</h2>
                      <p class="share-subtitle">{{ shareSubtitle }}</p>
                    </div>
                  </div>
                  <div class="session-info">
                    <span class="duration">{{ sessionDuration }}</span>
                    <span class="participant-count">{{ participants.length }} viewers</span>
                  </div>
                </div>
                <div class="header-actions">
                  <button @click="toggleFullscreen" class="header-btn" title="Toggle Fullscreen">
                    <ArrowsPointingOutIcon v-if="!isFullscreen" class="h-5 w-5" />
                    <ArrowsPointingInIcon v-else class="h-5 w-5" />
                  </button>
                  <button @click="minimizeShare" class="header-btn" title="Minimize">
                    <MinusIcon class="h-5 w-5" />
                  </button>
                  <button @click="closeScreenShare" class="header-btn close-btn" title="Stop Sharing">
                    <XMarkIcon class="h-5 w-5" />
                  </button>
                </div>
              </div>

              <!-- Main Content -->
              <div class="share-content">
                <!-- Screen Selection (if not sharing) -->
                <div v-if="!isSharing" class="source-selection">
                  <div class="selection-header">
                    <h3>Choose what to share</h3>
                    <p>Select a screen, window, or browser tab to share</p>
                  </div>

                  <div class="source-tabs">
                    <button
                      v-for="tab in sourceTabs"
                      :key="tab.id"
                      @click="activeTab = tab.id"
                      :class="['source-tab', { active: activeTab === tab.id }]"
                    >
                      <component :is="tab.icon" class="h-5 w-5" />
                      {{ tab.label }}
                    </button>
                  </div>

                  <div class="source-grid">
                    <div
                      v-for="source in currentSources"
                      :key="source.id"
                      @click="selectSource(source)"
                      :class="['source-item', { selected: selectedSource?.id === source.id }]"
                    >
                      <div class="source-preview">
                        <img v-if="source.thumbnail" :src="source.thumbnail" :alt="source.name" />
                        <div v-else class="preview-placeholder">
                          <component :is="source.icon" class="h-8 w-8 text-gray-400" />
                        </div>
                        <div class="source-overlay">
                          <CheckCircleIcon v-if="selectedSource?.id === source.id" class="h-6 w-6 text-green-500" />
                        </div>
                      </div>
                      <div class="source-info">
                        <h4 class="source-name">{{ source.name }}</h4>
                        <p class="source-type">{{ source.type }}</p>
                      </div>
                    </div>
                  </div>

                  <div class="selection-options">
                    <label class="option-item">
                      <input type="checkbox" v-model="shareAudio" class="option-checkbox" />
                      <span>Share system audio</span>
                    </label>
                    <label class="option-item">
                      <input type="checkbox" v-model="highQuality" class="option-checkbox" />
                      <span>High quality (uses more bandwidth)</span>
                    </label>
                  </div>

                  <div class="selection-actions">
                    <button @click="closeScreenShare" class="cancel-btn">Cancel</button>
                    <button
                      @click="startSharing"
                      :disabled="!selectedSource"
                      class="share-btn"
                    >
                      Start Sharing
                    </button>
                  </div>
                </div>

                <!-- Active Screen Share -->
                <div v-else class="active-share">
                  <div class="share-display">
                    <video
                      v-if="shareStream"
                      ref="shareVideo"
                      :srcObject="shareStream"
                      autoplay
                      muted
                      class="share-video"
                    ></video>
                    <div v-else class="share-loading">
                      <div class="loading-spinner"></div>
                      <span>Starting screen share...</span>
                    </div>

                    <!-- Share Controls Overlay -->
                    <div class="share-controls-overlay">
                      <div class="controls-container">
                        <button
                          @click="togglePause"
                          :class="['control-btn', { paused: isPaused }]"
                          :title="isPaused ? 'Resume' : 'Pause'"
                        >
                          <PlayIcon v-if="isPaused" class="h-5 w-5" />
                          <PauseIcon v-else class="h-5 w-5" />
                        </button>

                        <button
                          @click="toggleAnnotations"
                          :class="['control-btn', { active: showAnnotations }]"
                          title="Annotations"
                        >
                          <PencilIcon class="h-5 w-5" />
                        </button>

                        <button
                          @click="takeScreenshot"
                          class="control-btn"
                          title="Take Screenshot"
                        >
                          <CameraIcon class="h-5 w-5" />
                        </button>

                        <button
                          @click="openSettings"
                          class="control-btn"
                          title="Settings"
                        >
                          <CogIcon class="h-5 w-5" />
                        </button>
                      </div>
                    </div>

                    <!-- Annotation Layer -->
                    <canvas
                      v-show="showAnnotations"
                      ref="annotationCanvas"
                      @mousedown="startDrawing"
                      @mousemove="draw"
                      @mouseup="stopDrawing"
                      class="annotation-canvas"
                    ></canvas>
                  </div>

                  <!-- Participants Panel -->
                  <div class="participants-panel">
                    <div class="panel-header">
                      <h3>Viewers ({{ participants.length }})</h3>
                      <button @click="showInvite = !showInvite" class="invite-btn">
                        <PlusIcon class="h-4 w-4" />
                        Invite
                      </button>
                    </div>

                    <div v-if="showInvite" class="invite-section">
                      <div class="invite-input">
                        <input
                          v-model="inviteEmail"
                          type="email"
                          placeholder="Enter email address"
                          class="email-input"
                          @keydown.enter="sendInvite"
                        />
                        <button @click="sendInvite" class="send-invite-btn">Send</button>
                      </div>
                      <button @click="copyShareLink" class="copy-link-btn">
                        <LinkIcon class="h-4 w-4" />
                        Copy Share Link
                      </button>
                    </div>

                    <div class="participants-list">
                      <div
                        v-for="participant in participants"
                        :key="participant.id"
                        class="participant-item"
                      >
                        <div class="participant-avatar">
                          <img
                            v-if="participant.avatar"
                            :src="participant.avatar"
                            :alt="participant.name"
                            class="avatar-img"
                          />
                          <div v-else class="avatar-placeholder">
                            {{ getInitials(participant.name) }}
                          </div>
                          <div class="viewer-status" :class="participant.status">
                            <EyeIcon v-if="participant.isViewing" class="h-3 w-3" />
                          </div>
                        </div>
                        <div class="participant-info">
                          <span class="participant-name">{{ participant.name }}</span>
                          <span class="join-time">Joined {{ getRelativeTime(participant.joinedAt) }}</span>
                        </div>
                        <div class="participant-actions">
                          <button
                            v-if="participant.id !== currentUser?.id"
                            @click="removeParticipant(participant)"
                            class="remove-btn"
                            title="Remove viewer"
                          >
                            <XMarkIcon class="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Footer Actions -->
              <div v-if="isSharing" class="share-footer">
                <div class="footer-info">
                  <span class="quality-indicator">{{ currentQuality }}</span>
                  <span class="bandwidth-usage">{{ bandwidthUsage }}</span>
                </div>
                <div class="footer-actions">
                  <button @click="stopSharing" class="stop-btn">
                    Stop Sharing
                  </button>
                </div>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </DialogModal>

    <!-- Settings Modal -->
    <ScreenShareSettings
      :show="showSettings"
      @close="closeSettings"
      @update-settings="updateSettings"
      :settings="shareSettings"
    />
  </TransitionRoot>
</template>

<script>
import { ref, computed, watch, nextTick, onUnmounted } from 'vue'
import {
  Dialog,
  DialogPanel,
  TransitionChild,
  TransitionRoot
} from '@headlessui/vue'
import {
  XMarkIcon,
  MinusIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  ComputerDesktopIcon,
  WindowIcon,
  RectangleStackIcon,
  CheckCircleIcon,
  PlayIcon,
  PauseIcon,
  PencilIcon,
  CameraIcon,
  CogIcon,
  PlusIcon,
  LinkIcon,
  EyeIcon
} from '@heroicons/vue/24/outline'
// import { useCommunicationStore } from '../../stores/communication'

export default {
  name: 'ScreenShareModal',
  components: {
    DialogModal: Dialog,
    DialogPanel,
    TransitionChild,
    TransitionRoot,
    XMarkIcon,
    MinusIcon,
    ArrowsPointingOutIcon,
    ArrowsPointingInIcon,
    ComputerDesktopIcon,
    WindowIcon,
    RectangleStackIcon,
    CheckCircleIcon,
    PlayIcon,
    PauseIcon,
    PencilIcon,
    CameraIcon,
    CogIcon,
    PlusIcon,
    LinkIcon,
    EyeIcon
  },
  props: {
    show: {
      type: Boolean,
      default: false
    }
  },
  emits: ['close', 'share-started', 'share-ended'],
  setup(props, { emit }) {

    // State
    const isSharing = ref(false)
    const isPaused = ref(false)
    const isFullscreen = ref(false)
    const showAnnotations = ref(false)
    const showInvite = ref(false)
    const showSettings = ref(false)
    const shareStream = ref(null)
    const shareVideo = ref(null)
    const annotationCanvas = ref(null)
    const sessionStartTime = ref(null)
    const sessionDuration = ref('00:00')

    // Selection state
    const activeTab = ref('screen')
    const selectedSource = ref(null)
    const shareAudio = ref(false)
    const highQuality = ref(false)
    const inviteEmail = ref('')

    // Mock current user
    const currentUser = ref({
      id: 'current',
      name: 'You',
      avatar: null
    })

    // Source tabs
    const sourceTabs = ref([
      {
        id: 'screen',
        label: 'Entire Screen',
        icon: ComputerDesktopIcon
      },
      {
        id: 'window',
        label: 'Application Window',
        icon: WindowIcon
      },
      {
        id: 'tab',
        label: 'Browser Tab',
        icon: RectangleStackIcon
      }
    ])

    // Mock sources
    const screenSources = ref([
      {
        id: 'screen-1',
        name: 'Screen 1',
        type: 'Primary Display',
        thumbnail: null,
        icon: ComputerDesktopIcon
      },
      {
        id: 'screen-2',
        name: 'Screen 2',
        type: 'Secondary Display',
        thumbnail: null,
        icon: ComputerDesktopIcon
      }
    ])

    const windowSources = ref([
      {
        id: 'window-1',
        name: 'Visual Studio Code',
        type: 'Application',
        thumbnail: null,
        icon: WindowIcon
      },
      {
        id: 'window-2',
        name: 'Google Chrome',
        type: 'Browser',
        thumbnail: null,
        icon: WindowIcon
      }
    ])

    const tabSources = ref([
      {
        id: 'tab-1',
        name: 'DAS Booking System',
        type: 'Browser Tab',
        thumbnail: null,
        icon: RectangleStackIcon
      }
    ])

    // Mock participants
    const participants = ref([
      {
        id: 'current',
        name: 'You (Presenter)',
        avatar: null,
        status: 'presenting',
        isViewing: true,
        joinedAt: new Date()
      },
      {
        id: 1,
        name: 'John Smith',
        avatar: null,
        status: 'viewing',
        isViewing: true,
        joinedAt: new Date(Date.now() - 300000)
      },
      {
        id: 2,
        name: 'Sarah Johnson',
        avatar: null,
        status: 'viewing',
        isViewing: false,
        joinedAt: new Date(Date.now() - 600000)
      }
    ])

    // Settings
    const shareSettings = ref({
      quality: 'high',
      frameRate: 30,
      audioEnabled: false,
      annotationsEnabled: true
    })

    // Computed
    const currentSources = computed(() => {
      switch (activeTab.value) {
        case 'screen': return screenSources.value
        case 'window': return windowSources.value
        case 'tab': return tabSources.value
        default: return []
      }
    })

    const shareStatus = computed(() => {
      if (!isSharing.value) return 'Select Source'
      if (isPaused.value) return 'Screen Share Paused'
      return 'Sharing Screen'
    })

    const shareSubtitle = computed(() => {
      if (!isSharing.value) return 'Choose what to share with participants'
      if (selectedSource.value) return selectedSource.value.name
      return ''
    })

    const currentQuality = computed(() => {
      return `${shareSettings.value.quality} quality • ${shareSettings.value.frameRate}fps`
    })

    const bandwidthUsage = computed(() => {
      return '2.1 MB/s'
    })

    // Duration timer
    let durationTimer = null

    const updateDuration = () => {
      if (sessionStartTime.value) {
        const elapsed = Math.floor((Date.now() - sessionStartTime.value) / 1000)
        const minutes = Math.floor(elapsed / 60)
        const seconds = elapsed % 60
        sessionDuration.value = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      }
    }

    // Methods
    const selectSource = (source) => {
      selectedSource.value = source
    }

    const startSharing = async () => {
      try {
        if (!selectedSource.value) return

        // Request screen share
        const constraints = {
          video: {
            mediaSource: activeTab.value,
            width: { ideal: highQuality.value ? 1920 : 1280 },
            height: { ideal: highQuality.value ? 1080 : 720 },
            frameRate: { ideal: shareSettings.value.frameRate }
          },
          audio: shareAudio.value
        }

        shareStream.value = await navigator.mediaDevices.getDisplayMedia(constraints)

        // Handle stream ended
        shareStream.value.getVideoTracks()[0].addEventListener('ended', () => {
          stopSharing()
        })

        isSharing.value = true
        sessionStartTime.value = Date.now()
        durationTimer = setInterval(updateDuration, 1000)
        updateDuration()

        emit('share-started', {
          source: selectedSource.value,
          quality: shareSettings.value.quality
        })

        // Setup video element
        await nextTick()
        if (shareVideo.value) {
          shareVideo.value.srcObject = shareStream.value
        }

      } catch (error) {
        console.error('Failed to start screen share:', error)
        // Handle permission denied, etc.
      }
    }

    const stopSharing = () => {
      if (shareStream.value) {
        shareStream.value.getTracks().forEach(track => track.stop())
        shareStream.value = null
      }

      if (durationTimer) {
        clearInterval(durationTimer)
        durationTimer = null
      }

      isSharing.value = false
      isPaused.value = false
      sessionStartTime.value = null
      sessionDuration.value = '00:00'

      emit('share-ended')
    }

    const closeScreenShare = () => {
      if (isSharing.value) {
        stopSharing()
      }
      emit('close')
    }

    const minimizeShare = () => {
      // Implementation for minimizing to floating window
      console.log('Minimize screen share')
    }

    const toggleFullscreen = () => {
      isFullscreen.value = !isFullscreen.value
      // Implementation for fullscreen mode
    }

    const togglePause = () => {
      isPaused.value = !isPaused.value
      if (shareStream.value) {
        shareStream.value.getVideoTracks().forEach(track => {
          track.enabled = !isPaused.value
        })
      }
    }

    const toggleAnnotations = () => {
      showAnnotations.value = !showAnnotations.value
      if (showAnnotations.value) {
        nextTick(() => {
          setupAnnotationCanvas()
        })
      }
    }

    const setupAnnotationCanvas = () => {
      if (annotationCanvas.value && shareVideo.value) {
        const canvas = annotationCanvas.value
        const video = shareVideo.value
        canvas.width = video.clientWidth
        canvas.height = video.clientHeight
      }
    }

    const startDrawing = (event) => {
      // Annotation drawing logic
      console.log('Start drawing annotation', event)
    }

    const draw = (event) => {
      // Annotation drawing logic
      console.log('Drawing annotation', event)
    }

    const stopDrawing = () => {
      // Stop annotation drawing
      console.log('Stop drawing annotation')
    }

    const takeScreenshot = () => {
      if (shareVideo.value) {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        canvas.width = shareVideo.value.videoWidth
        canvas.height = shareVideo.value.videoHeight
        ctx.drawImage(shareVideo.value, 0, 0)

        // Create download link
        const link = document.createElement('a')
        link.download = `screen-share-${Date.now()}.png`
        link.href = canvas.toDataURL()
        link.click()
      }
    }

    const openSettings = () => {
      showSettings.value = true
    }

    const closeSettings = () => {
      showSettings.value = false
    }

    const updateSettings = (newSettings) => {
      shareSettings.value = { ...shareSettings.value, ...newSettings }
    }

    const sendInvite = () => {
      if (inviteEmail.value) {
        console.log('Send invite to:', inviteEmail.value)
        inviteEmail.value = ''
        showInvite.value = false
      }
    }

    const copyShareLink = async () => {
      try {
        const shareUrl = `${window.location.origin}/share/session-${Date.now()}`
        await navigator.clipboard.writeText(shareUrl)
        console.log('Share link copied')
      } catch (error) {
        console.error('Failed to copy link:', error)
      }
    }

    const removeParticipant = (participant) => {
      const index = participants.value.findIndex(p => p.id === participant.id)
      if (index > -1) {
        participants.value.splice(index, 1)
      }
    }

    // Utility functions
    const getInitials = (name) => {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }

    const getRelativeTime = (date) => {
      const elapsed = Date.now() - date.getTime()
      const minutes = Math.floor(elapsed / 60000)
      if (minutes < 1) return 'just now'
      if (minutes < 60) return `${minutes}m ago`
      const hours = Math.floor(minutes / 60)
      return `${hours}h ago`
    }

    // Lifecycle
    watch(() => props.show, (newShow) => {
      if (!newShow) {
        if (isSharing.value) {
          stopSharing()
        }
        // Reset state
        selectedSource.value = null
        activeTab.value = 'screen'
        shareAudio.value = false
        highQuality.value = false
      }
    })

    onUnmounted(() => {
      if (durationTimer) {
        clearInterval(durationTimer)
      }
      if (shareStream.value) {
        shareStream.value.getTracks().forEach(track => track.stop())
      }
    })

    return {
      // State
      isSharing,
      isPaused,
      isFullscreen,
      showAnnotations,
      showInvite,
      showSettings,
      shareStream,
      shareVideo,
      annotationCanvas,
      sessionDuration,
      activeTab,
      selectedSource,
      shareAudio,
      highQuality,
      inviteEmail,
      currentUser,
      participants,
      shareSettings,

      // Data
      sourceTabs,
      screenSources,
      windowSources,
      tabSources,

      // Computed
      currentSources,
      shareStatus,
      shareSubtitle,
      currentQuality,
      bandwidthUsage,

      // Methods
      selectSource,
      startSharing,
      stopSharing,
      closeScreenShare,
      minimizeShare,
      toggleFullscreen,
      togglePause,
      toggleAnnotations,
      setupAnnotationCanvas,
      startDrawing,
      draw,
      stopDrawing,
      takeScreenshot,
      openSettings,
      closeSettings,
      updateSettings,
      sendInvite,
      copyShareLink,
      removeParticipant,
      getInitials,
      getRelativeTime
    }
  }
}
</script>

<style scoped>
.screen-share-container {
  @apply relative transform overflow-hidden rounded-xl bg-white text-left shadow-xl transition-all;
  @apply w-full max-w-5xl;
  height: 85vh;
  max-height: 900px;
}

.share-header {
  @apply flex items-center justify-between p-4 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white;
}

.header-info {
  @apply flex items-center gap-4;
}

.share-status {
  @apply flex items-center gap-3;
}

.recording-indicator {
  @apply flex items-center;
}

.recording-dot {
  @apply w-3 h-3 bg-red-500 rounded-full;
  animation: pulse-record 2s infinite;
}

@keyframes pulse-record {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.share-title {
  @apply text-lg font-semibold;
}

.share-subtitle {
  @apply text-sm opacity-90;
}

.session-info {
  @apply flex flex-col text-sm opacity-90;
}

.header-actions {
  @apply flex items-center gap-2;
}

.header-btn {
  @apply p-2 rounded-lg hover:bg-white hover:bg-opacity-20 transition-all duration-200;
}

.close-btn:hover {
  @apply bg-red-500;
}

.share-content {
  @apply flex-1 overflow-hidden;
  height: calc(100% - 80px);
}

/* Source Selection */
.source-selection {
  @apply h-full flex flex-col p-6;
}

.selection-header {
  @apply text-center mb-6;
}

.selection-header h3 {
  @apply text-xl font-semibold text-gray-900 mb-2;
}

.selection-header p {
  @apply text-gray-600;
}

.source-tabs {
  @apply flex justify-center gap-2 mb-6;
}

.source-tab {
  @apply flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200
         hover:bg-gray-50 transition-all duration-200;
}

.source-tab.active {
  @apply bg-indigo-50 border-indigo-200 text-indigo-700;
}

.source-grid {
  @apply grid grid-cols-2 md:grid-cols-3 gap-4 flex-1 mb-6;
}

.source-item {
  @apply border border-gray-200 rounded-lg p-4 cursor-pointer
         hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-200;
}

.source-item.selected {
  @apply border-indigo-500 bg-indigo-50;
}

.source-preview {
  @apply relative aspect-video bg-gray-100 rounded-lg mb-3 overflow-hidden;
}

.source-preview img {
  @apply w-full h-full object-cover;
}

.preview-placeholder {
  @apply w-full h-full flex items-center justify-center;
}

.source-overlay {
  @apply absolute inset-0 flex items-center justify-center bg-black bg-opacity-0
         transition-all duration-200;
}

.source-item.selected .source-overlay {
  @apply bg-opacity-20;
}

.source-info {
  @apply text-center;
}

.source-name {
  @apply font-medium text-gray-900 text-sm;
}

.source-type {
  @apply text-xs text-gray-500;
}

.selection-options {
  @apply space-y-3 mb-6 p-4 bg-gray-50 rounded-lg;
}

.option-item {
  @apply flex items-center gap-2 cursor-pointer;
}

.option-checkbox {
  @apply w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500;
}

.selection-actions {
  @apply flex justify-end gap-3;
}

.cancel-btn {
  @apply px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors duration-200;
}

.share-btn {
  @apply px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700
         disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200;
}

/* Active Share */
.active-share {
  @apply h-full flex;
}

.share-display {
  @apply flex-1 relative bg-black;
}

.share-video {
  @apply w-full h-full object-contain;
}

.share-loading {
  @apply flex items-center justify-center h-full text-white gap-3;
}

.loading-spinner {
  @apply w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin;
}

.share-controls-overlay {
  @apply absolute bottom-4 left-1/2 transform -translate-x-1/2;
}

.controls-container {
  @apply flex items-center gap-3 bg-black bg-opacity-70 rounded-lg p-2;
}

.control-btn {
  @apply p-2 rounded-lg text-white hover:bg-white hover:bg-opacity-20
         transition-all duration-200;
}

.control-btn.active,
.control-btn.paused {
  @apply bg-white bg-opacity-30;
}

.annotation-canvas {
  @apply absolute inset-0 cursor-crosshair;
  z-index: 10;
}

.participants-panel {
  @apply w-80 bg-white border-l border-gray-200 flex flex-col;
}

.panel-header {
  @apply flex items-center justify-between p-4 border-b border-gray-200;
}

.panel-header h3 {
  @apply font-semibold text-gray-900;
}

.invite-btn {
  @apply flex items-center gap-1 px-3 py-1 text-sm bg-indigo-600 text-white rounded-lg
         hover:bg-indigo-700 transition-colors duration-200;
}

.invite-section {
  @apply p-4 border-b border-gray-200 space-y-3;
}

.invite-input {
  @apply flex gap-2;
}

.email-input {
  @apply flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm
         focus:outline-none focus:ring-2 focus:ring-indigo-500;
}

.send-invite-btn {
  @apply px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700
         transition-colors duration-200 text-sm;
}

.copy-link-btn {
  @apply flex items-center gap-2 w-full px-3 py-2 text-sm text-indigo-600
         hover:bg-indigo-50 rounded-lg transition-colors duration-200;
}

.participants-list {
  @apply flex-1 overflow-y-auto p-4 space-y-3;
}

.participant-item {
  @apply flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50
         transition-colors duration-200;
}

.participant-avatar {
  @apply relative w-8 h-8;
}

.avatar-img {
  @apply w-full h-full rounded-full object-cover;
}

.avatar-placeholder {
  @apply w-full h-full rounded-full bg-gray-300 flex items-center justify-center
         text-xs font-medium text-gray-600;
}

.viewer-status {
  @apply absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center;
}

.viewer-status.viewing {
  @apply bg-green-500 text-white;
}

.participant-info {
  @apply flex-1;
}

.participant-name {
  @apply text-sm font-medium text-gray-900;
}

.join-time {
  @apply text-xs text-gray-500;
}

.participant-actions {
  @apply flex items-center gap-1;
}

.remove-btn {
  @apply p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-600
         transition-all duration-200;
}

/* Footer */
.share-footer {
  @apply flex items-center justify-between p-4 bg-gray-50 border-t border-gray-200;
}

.footer-info {
  @apply flex items-center gap-4 text-sm text-gray-600;
}

.quality-indicator {
  @apply px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-medium;
}

.bandwidth-usage {
  @apply text-gray-500;
}

.stop-btn {
  @apply px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700
         transition-colors duration-200;
}

/* Responsive design */
@media (max-width: 1024px) {
  .screen-share-container {
    @apply max-w-4xl;
  }

  .participants-panel {
    @apply w-64;
  }
}

@media (max-width: 768px) {
  .screen-share-container {
    @apply max-w-full;
    height: 95vh;
  }

  .source-grid {
    @apply grid-cols-1;
  }

  .active-share {
    @apply flex-col;
  }

  .participants-panel {
    @apply w-full h-48;
  }
}

/* Dark theme support */
[data-theme="dark"] .screen-share-container {
  @apply bg-gray-800;
}

[data-theme="dark"] .source-item {
  @apply bg-gray-700 border-gray-600 text-white;
}

[data-theme="dark"] .participants-panel {
  @apply bg-gray-800 border-gray-600;
}
</style>