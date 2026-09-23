<template>
  <div class="communication-hub">
    <!-- Communication Toggle Button -->
    <div class="communication-toggle">
      <MenuComponent as="div" class="relative">
        <MenuButton class="communication-button">
          <div class="communication-icon-wrapper">
            <ChatBubbleLeftRightIcon class="h-6 w-6" />
            <span v-if="unreadCount > 0" class="notification-badge">
              {{ unreadCount > 99 ? '99+' : unreadCount }}
            </span>
          </div>
          <ChevronDownIcon class="h-4 w-4 ml-2" />
        </MenuButton>

        <transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="transform scale-95 opacity-0"
          enter-to-class="transform scale-100 opacity-100"
          leave-active-class="transition duration-75 ease-in"
          leave-from-class="transform scale-100 opacity-100"
          leave-to-class="transform scale-95 opacity-0"
        >
          <MenuItems class="communication-dropdown">
            <div class="dropdown-header">
              <h3>Communication</h3>
              <div class="status-indicator" :class="connectionStatus">
                <div class="status-dot"></div>
                <span>{{ connectionStatusText }}</span>
              </div>
            </div>

            <div class="communication-options">
              <!-- Video Calls -->
              <MenuItem v-slot="{ active }">
                <button
                  @click="openVideoCall"
                  :class="[
                    'communication-option',
                    active && 'active'
                  ]"
                >
                  <div class="option-icon video-call">
                    <VideoCameraIcon class="h-3 w-3" />
                  </div>
                  <div class="option-content">
                    <span class="option-title">Video</span>
                  </div>
                  <div class="option-status">
                    <span v-if="activeCall" class="status-active text-xs">●</span>
                  </div>
                </button>
              </MenuItem>

              <!-- Voice Calls -->
              <MenuItem v-slot="{ active }">
                <button
                  @click="openVoiceCall"
                  :class="[
                    'communication-option',
                    active && 'active'
                  ]"
                >
                  <div class="option-icon voice-call">
                    <PhoneIcon class="h-3 w-3" />
                  </div>
                  <div class="option-content">
                    <span class="option-title">Voice</span>
                  </div>
                </button>
              </MenuItem>

              <!-- Messages -->
              <MenuItem v-slot="{ active }">
                <button
                  @click="openMessages"
                  :class="[
                    'communication-option',
                    active && 'active'
                  ]"
                >
                  <div class="option-icon messaging">
                    <ChatBubbleLeftEllipsisIcon class="h-3 w-3" />
                  </div>
                  <div class="option-content">
                    <span class="option-title">Chat</span>
                  </div>
                  <div class="option-status">
                    <span v-if="unreadMessages > 0" class="unread-badge text-xs">{{ unreadMessages }}</span>
                  </div>
                </button>
              </MenuItem>

              <!-- Team Chat -->
              <MenuItem v-slot="{ active }">
                <button
                  @click="openTeamChat"
                  :class="[
                    'communication-option',
                    active && 'active'
                  ]"
                >
                  <div class="option-icon team-chat">
                    <UsersIcon class="h-3 w-3" />
                  </div>
                  <div class="option-content">
                    <span class="option-title">Team</span>
                  </div>
                  <div class="option-status">
                    <span v-if="teamNotifications > 0" class="unread-badge text-xs">{{ teamNotifications }}</span>
                  </div>
                </button>
              </MenuItem>

              <!-- Screen Share -->
              <MenuItem v-slot="{ active }">
                <button
                  @click="startScreenShare"
                  :class="[
                    'communication-option',
                    active && 'active'
                  ]"
                >
                  <div class="option-icon screen-share">
                    <ComputerDesktopIcon class="h-3 w-3" />
                  </div>
                  <div class="option-content">
                    <span class="option-title">Screen</span>
                  </div>
                  <div class="option-status">
                    <span v-if="isScreenSharing" class="status-active text-xs">●</span>
                  </div>
                </button>
              </MenuItem>
            </div>

            <div class="dropdown-footer">
              <button @click="openCommunicationSettings" class="settings-btn">
                <CogIcon class="h-4 w-4 mb-1" />
                <span class="font-medium tracking-wide" style="font-size: 10px; text-transform: uppercase;">Settings</span>
              </button>
            </div>
          </MenuItems>
        </transition>
      </MenuComponent>
    </div>

    <!-- Communication Modals -->
    <VideoCallModal
      :show="showVideoCall"
      @close="closeVideoCall"
      @call-started="onCallStarted"
      @call-ended="onCallEnded"
    />

    <VoiceCallModal
      :show="showVoiceCall"
      @close="closeVoiceCall"
    />

    <MessagingModal
      :show="showMessaging"
      @close="closeMessaging"
      @message-read="onMessageRead"
    />

    <TeamChatModal
      :show="showTeamChat"
      @close="closeTeamChat"
    />

    <ScreenShareModal
      :show="showScreenShare"
      @close="closeScreenShare"
      @share-started="onScreenShareStarted"
      @share-ended="onScreenShareEnded"
    />
  </div>
</template>

<script>
import {
  Menu, MenuButton, MenuItems, MenuItem
} from '@headlessui/vue'
import {
  ChatBubbleLeftRightIcon,
  ChevronDownIcon,
  VideoCameraIcon,
  PhoneIcon,
  ChatBubbleLeftEllipsisIcon,
  UsersIcon,
  ComputerDesktopIcon,
  CogIcon
} from '@heroicons/vue/24/outline'
import VideoCallModal from './VideoCallModal.vue'
import VoiceCallModal from './VoiceCallModal.vue'
import MessagingModal from './MessagingModal.vue'
import TeamChatModal from './TeamChatModal.vue'
import ScreenShareModal from './ScreenShareModal.vue'
import { useCommunicationStore } from '../../stores/communication'

export default {
  name: 'CommunicationHub',
  components: {
    MenuComponent: Menu, MenuButton, MenuItems, MenuItem,
    ChatBubbleLeftRightIcon,
    ChevronDownIcon,
      VideoCameraIcon,
    PhoneIcon,
    ChatBubbleLeftEllipsisIcon,
    UsersIcon,
    ComputerDesktopIcon,
    CogIcon,
    VideoCallModal,
    VoiceCallModal,
    MessagingModal,
    TeamChatModal,
    ScreenShareModal
  },
  data() {
    return {
      showVideoCall: false,
      showVoiceCall: false,
      showMessaging: false,
      showTeamChat: false,
      showScreenShare: false,
      activeCall: null,
      isScreenSharing: false
    }
  },
  computed: {
    communicationStore() {
      return useCommunicationStore()
    },
    unreadMessages() {
      return this.communicationStore.unreadMessages
    },
    teamNotifications() {
      return this.communicationStore.teamNotifications
    },
    unreadCount() {
      return this.unreadMessages + this.teamNotifications
    },
    connectionStatus() {
      return this.communicationStore.connectionStatus
    },
    connectionStatusText() {
      const statusMap = {
        connected: 'Online',
        connecting: 'Connecting...',
        disconnected: 'Offline',
        error: 'Connection Error'
      }
      return statusMap[this.connectionStatus] || 'Unknown'
    }
  },
  methods: {
    openVideoCall() {
      this.showVideoCall = true
    },
    closeVideoCall() {
      this.showVideoCall = false
    },
    openVoiceCall() {
      this.showVoiceCall = true
    },
    closeVoiceCall() {
      this.showVoiceCall = false
    },
    openMessages() {
      this.showMessaging = true
    },
    closeMessaging() {
      this.showMessaging = false
    },
    openTeamChat() {
      this.showTeamChat = true
    },
    closeTeamChat() {
      this.showTeamChat = false
    },
    startScreenShare() {
      this.showScreenShare = true
    },
    closeScreenShare() {
      this.showScreenShare = false
    },
    openCommunicationSettings() {
      this.$router.push('/settings/communication')
    },
    onCallStarted(callInfo) {
      this.activeCall = callInfo
    },
    onCallEnded() {
      this.activeCall = null
    },
    onScreenShareStarted() {
      this.isScreenSharing = true
    },
    onScreenShareEnded() {
      this.isScreenSharing = false
    },
    onMessageRead() {
      this.communicationStore.markMessagesAsRead()
    }
  },
  mounted() {
    this.communicationStore.initialize()
  }
}
</script>

<style scoped>
.communication-hub {
  position: relative;
}

.communication-toggle {
  display: flex;
  align-items: center;
}

.communication-button {
  @apply flex items-center px-4 py-2 text-white bg-gradient-to-r from-primary-500 to-primary-600
         rounded-xl hover:from-primary-600 hover:to-primary-700
         shadow-lg hover:shadow-xl transform hover:-translate-y-0.5
         transition-all duration-300 ease-out;
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
}

.communication-icon-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.notification-badge {
  position: absolute;
  -top: 8px;
  -right: 8px;
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 0.125rem 0.375rem;
  border-radius: 9999px;
  min-width: 1.25rem;
  height: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
  animation: pulse-glow 2s infinite;
}

@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4); }
  50% { box-shadow: 0 2px 12px rgba(239, 68, 68, 0.7); }
}

.communication-dropdown {
  @apply absolute right-0 mt-2 w-28 bg-white rounded-lg shadow-lg border border-gray-100
         focus:outline-none z-50;
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.95);
  max-height: 80vh;
  overflow-y: auto;
}

.dropdown-header {
  @apply p-1.5 border-b border-gray-100;
}

.dropdown-header h3 {
  @apply text-xs font-semibold text-gray-900 mb-0.5 text-center;
}

.status-indicator {
  @apply flex items-center gap-2 text-sm;
}

.status-dot {
  @apply w-2 h-2 rounded-full;
}

.status-indicator.connected .status-dot {
  @apply bg-green-500;
  box-shadow: 0 0 8px rgba(34, 197, 94, 0.4);
}

.status-indicator.connecting .status-dot {
  @apply bg-yellow-500;
  animation: pulse 1s infinite;
}

.status-indicator.disconnected .status-dot {
  @apply bg-gray-400;
}

.status-indicator.error .status-dot {
  @apply bg-red-500;
}

.communication-options {
  @apply p-1;
}

.communication-option {
  @apply flex flex-col items-center w-full p-1 rounded-md text-center
         hover:bg-gray-50 transition-all duration-200
         focus:outline-none focus:ring-1 focus:ring-primary-500
         border border-transparent hover:border-gray-200;
  min-height: 36px;
}

.communication-option.active {
  @apply bg-primary-50 text-primary-700;
}

.option-icon {
  @apply flex items-center justify-center w-6 h-6 rounded-md mb-1;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

.option-icon.video-call {
  @apply bg-blue-100 text-blue-600;
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
}

.option-icon.voice-call {
  @apply bg-green-100 text-green-600;
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
}

.option-icon.messaging {
  @apply bg-purple-100 text-purple-600;
  background: linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%);
}

.option-icon.team-chat {
  @apply bg-orange-100 text-orange-600;
  background: linear-gradient(135deg, #fed7aa 0%, #fdba74 100%);
}

.option-icon.screen-share {
  @apply bg-indigo-100 text-indigo-600;
  background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
}

.option-content {
  @apply flex-1 text-center;
}

.option-title {
  @apply block font-medium text-gray-900 text-xs leading-tight;
}

.option-description {
  @apply hidden;
}

.option-status {
  @apply absolute top-1 right-1;
}

.status-active {
  @apply text-xs font-medium px-2 py-1 bg-green-100 text-green-700 rounded-lg;
}

.unread-badge {
  @apply text-xs font-semibold px-2 py-1 bg-red-100 text-red-700 rounded-lg;
}

.dropdown-footer {
  @apply p-1 border-t border-gray-100 bg-gray-50 rounded-b-lg;
}

.settings-btn {
  @apply flex flex-col items-center w-full p-1 text-xs text-gray-600
         hover:text-gray-900 hover:bg-white rounded-md
         transition-all duration-200;
}

/* Dark theme support */
[data-bs-theme="dark"] .communication-dropdown {
  @apply bg-gray-800 border-gray-700;
  background: rgba(31, 41, 55, 0.98);
  backdrop-filter: blur(16px);
}

[data-bs-theme="dark"] .dropdown-header {
  @apply border-gray-600;
}

[data-bs-theme="dark"] .dropdown-header h3 {
  @apply text-white;
}

[data-bs-theme="dark"] .communication-option {
  @apply hover:bg-gray-700 text-gray-200 border-gray-700 hover:border-gray-600;
}

[data-bs-theme="dark"] .communication-option.active {
  @apply bg-primary-900 text-primary-300 border-primary-800;
}

[data-bs-theme="dark"] .option-title {
  @apply text-gray-100;
}

[data-bs-theme="dark"] .option-icon {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

[data-bs-theme="dark"] .option-icon.video-call {
  background: linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%);
  @apply text-blue-300;
}

[data-bs-theme="dark"] .option-icon.voice-call {
  background: linear-gradient(135deg, #14532d 0%, #16a34a 100%);
  @apply text-green-300;
}

[data-bs-theme="dark"] .option-icon.messaging {
  background: linear-gradient(135deg, #581c87 0%, #7c3aed 100%);
  @apply text-purple-300;
}

[data-bs-theme="dark"] .option-icon.team-chat {
  background: linear-gradient(135deg, #9a3412 0%, #ea580c 100%);
  @apply text-orange-300;
}

[data-bs-theme="dark"] .option-icon.screen-share {
  background: linear-gradient(135deg, #3730a3 0%, #4f46e5 100%);
  @apply text-indigo-300;
}

[data-bs-theme="dark"] .option-description {
  @apply text-gray-400;
}

[data-bs-theme="dark"] .dropdown-footer {
  @apply bg-gray-700 border-gray-600;
}

[data-bs-theme="dark"] .settings-btn {
  @apply text-gray-300 hover:text-white hover:bg-gray-600;
}

/* Enhanced Responsive Design */
@media (max-width: 1024px) {
  .communication-dropdown {
    @apply w-36 right-0;
    transform: translateX(0);
  }

  .communication-option {
    min-height: 46px;
  }

  .option-icon {
    @apply w-7 h-7;
  }
}

@media (max-width: 768px) {
  .communication-dropdown {
    @apply w-40 max-w-[90vw];
    right: 0;
    left: auto;
    transform: translateX(0);
    margin-right: 0;
  }

  .dropdown-header {
    @apply px-2 py-1.5;
  }

  .dropdown-header h3 {
    @apply text-xs;
  }

  .communication-options {
    @apply p-1.5 space-y-0.5;
  }

  .communication-option {
    @apply p-1.5;
    min-height: 44px;
  }

  .option-icon {
    @apply w-7 h-7 mb-1;
  }

  .option-title {
    @apply text-xs;
  }

  .dropdown-footer {
    @apply p-1.5;
  }

  .settings-btn {
    @apply p-1;
  }
}

@media (max-width: 480px) {
  .communication-dropdown {
    @apply w-36 max-w-[85vw];
    right: 0;
    left: auto;
    transform: translateX(0);
  }

  .dropdown-header {
    @apply px-1.5 py-1;
  }

  .dropdown-header h3 {
    @apply text-xs;
  }

  .communication-options {
    @apply p-1 space-y-0.5;
  }

  .communication-option {
    @apply p-1;
    min-height: 40px;
  }

  .option-icon {
    @apply w-6 h-6 mb-0.5;
  }

  .option-title {
    @apply text-xs;
    font-size: 10px;
  }

  .dropdown-footer {
    @apply p-1;
  }

  .settings-btn {
    @apply p-0.5;
  }

  .settings-btn span {
    font-size: 9px;
  }
}
</style>