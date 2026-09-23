<template>
  <BaseModal :show="show" @close="$emit('close')" size="xl" title="">
    <div class="messaging-container">
      <!-- Header -->
      <div class="messaging-header">
        <div class="header-left">
          <h2 class="title">Messages</h2>
          <div class="status-indicator">
            <div class="status-dot" :class="connectionStatus"></div>
            <span>{{ connectionStatusText }}</span>
          </div>
        </div>

        <div class="header-actions">
          <button @click="startNewConversation" class="new-conversation-btn">
            <PlusIcon class="h-5 w-5" />
            New Message
          </button>

          <button @click="$emit('close')" class="close-btn">
            <XMarkIcon class="h-6 w-6" />
          </button>
        </div>
      </div>

      <div class="messaging-body">
        <!-- Sidebar - Conversations -->
        <div class="conversations-sidebar">
          <div class="sidebar-header">
            <div class="search-box">
              <MagnifyingGlassIcon class="h-5 w-5 search-icon" />
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Search conversations..."
                class="search-input"
              />
            </div>

            <div class="conversation-tabs">
              <button
                @click="activeTab = 'all'"
                :class="['tab', { active: activeTab === 'all' }]"
              >
                All
                <span v-if="totalUnreadCount > 0" class="tab-badge">{{ totalUnreadCount }}</span>
              </button>

              <button
                @click="activeTab = 'direct'"
                :class="['tab', { active: activeTab === 'direct' }]"
              >
                Direct
                <span v-if="directUnreadCount > 0" class="tab-badge">{{ directUnreadCount }}</span>
              </button>

              <button
                @click="activeTab = 'teams'"
                :class="['tab', { active: activeTab === 'teams' }]"
              >
                Teams
                <span v-if="teamUnreadCount > 0" class="tab-badge">{{ teamUnreadCount }}</span>
              </button>
            </div>
          </div>

          <div class="conversations-list">
            <div
              v-for="conversation in filteredConversations"
              :key="conversation.id"
              @click="selectConversation(conversation)"
              :class="[
                'conversation-item',
                { active: selectedConversation?.id === conversation.id }
              ]"
            >
              <div class="conversation-avatar">
                <div v-if="conversation.type === 'direct'" class="single-avatar">
                  <img
                    v-if="conversation.participant.avatar"
                    :src="conversation.participant.avatar"
                    :alt="conversation.participant.name"
                  />
                  <div v-else class="avatar-placeholder">
                    {{ getInitials(conversation.participant.name) }}
                  </div>
                  <div
                    v-if="conversation.participant.status === 'online'"
                    class="status-indicator online"
                  ></div>
                </div>

                <div v-else class="group-avatar">
                  <UsersIcon class="h-6 w-6" />
                </div>
              </div>

              <div class="conversation-content">
                <div class="conversation-header">
                  <h3 class="conversation-name">{{ conversation.displayName }}</h3>
                  <span class="last-message-time">{{ formatTime(conversation.lastMessage?.created_at) }}</span>
                </div>

                <div class="conversation-preview">
                  <p class="last-message" :class="{ unread: conversation.unreadCount > 0 }">
                    {{ conversation.lastMessage?.content || 'No messages yet' }}
                  </p>

                  <div class="conversation-indicators">
                    <span v-if="conversation.unreadCount > 0" class="unread-badge">
                      {{ conversation.unreadCount > 99 ? '99+' : conversation.unreadCount }}
                    </span>

                    <div v-if="conversation.participant?.isTyping" class="typing-indicator">
                      <div class="typing-dots">
                        <div class="dot"></div>
                        <div class="dot"></div>
                        <div class="dot"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="filteredConversations.length === 0" class="empty-conversations">
              <ChatBubbleLeftEllipsisIcon class="h-12 w-12 text-gray-400" />
              <p class="text-gray-500">No conversations found</p>
            </div>
          </div>
        </div>

        <!-- Main Chat Area -->
        <div class="chat-area">
          <div v-if="!selectedConversation" class="no-conversation-selected">
            <ChatBubbleLeftRightIcon class="h-16 w-16 text-gray-400" />
            <h3 class="text-xl font-medium text-gray-700 mt-4">Select a conversation</h3>
            <p class="text-gray-500 mt-2">Choose a conversation from the sidebar to start messaging</p>
          </div>

          <div v-else class="chat-container">
            <!-- Chat Header -->
            <div class="chat-header">
              <div class="chat-participant-info">
                <div class="participant-avatar">
                  <div v-if="selectedConversation.type === 'direct'" class="single-avatar">
                    <img
                      v-if="selectedConversation.participant.avatar"
                      :src="selectedConversation.participant.avatar"
                      :alt="selectedConversation.participant.name"
                    />
                    <div v-else class="avatar-placeholder">
                      {{ getInitials(selectedConversation.participant.name) }}
                    </div>
                    <div
                      v-if="selectedConversation.participant.status === 'online'"
                      class="status-indicator online"
                    ></div>
                  </div>

                  <div v-else class="group-avatar">
                    <UsersIcon class="h-6 w-6" />
                  </div>
                </div>

                <div class="participant-details">
                  <h3 class="participant-name">{{ selectedConversation.displayName }}</h3>
                  <p class="participant-status">
                    {{ getParticipantStatus(selectedConversation) }}
                  </p>
                </div>
              </div>

              <div class="chat-actions">
                <button @click="startVideoCall" class="action-btn" title="Start video call">
                  <VideoCameraIcon class="h-5 w-5" />
                </button>

                <button @click="startVoiceCall" class="action-btn" title="Start voice call">
                  <PhoneIcon class="h-5 w-5" />
                </button>

                <MenuComponent as="div" class="relative">
                  <MenuButton class="action-btn">
                    <EllipsisVerticalIcon class="h-5 w-5" />
                  </MenuButton>

                  <MenuItems class="menu-items">
                    <MenuItem v-slot="{ active }">
                      <button :class="[active ? 'active' : '', 'menu-item']" @click="viewProfile">
                        <UserIcon class="h-4 w-4" />
                        View Profile
                      </button>
                    </MenuItem>

                    <MenuItem v-slot="{ active }">
                      <button :class="[active ? 'active' : '', 'menu-item']" @click="clearHistory">
                        <TrashIcon class="h-4 w-4" />
                        Clear History
                      </button>
                    </MenuItem>
                  </MenuItems>
                </MenuComponent>
              </div>
            </div>

            <!-- Messages -->
            <div class="messages-container" ref="messagesContainer">
              <div
                v-for="message in selectedConversation.messages"
                :key="message.id"
                :class="[
                  'message',
                  { 'own-message': message.sender_id === currentUserId }
                ]"
              >
                <div v-if="!isOwnMessage(message)" class="message-avatar">
                  <img
                    v-if="message.sender_avatar"
                    :src="message.sender_avatar"
                    :alt="message.sender_name"
                  />
                  <div v-else class="avatar-placeholder small">
                    {{ getInitials(message.sender_name) }}
                  </div>
                </div>

                <div class="message-content">
                  <div v-if="!isOwnMessage(message)" class="message-sender">
                    {{ message.sender_name }}
                  </div>

                  <div class="message-bubble">
                    <p class="message-text">{{ message.content }}</p>

                    <div class="message-meta">
                      <span class="message-time">{{ formatTime(message.created_at) }}</span>
                      <CheckIcon
                        v-if="isOwnMessage(message) && message.read"
                        class="h-4 w-4 text-green-500 read-indicator"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <!-- Typing indicator -->
              <div v-if="someoneIsTyping" class="typing-message">
                <div class="typing-avatar">
                  <div class="avatar-placeholder small">
                    {{ getInitials(typingUser) }}
                  </div>
                </div>
                <div class="typing-bubble">
                  <div class="typing-indicator">
                    <div class="typing-dots">
                      <div class="dot"></div>
                      <div class="dot"></div>
                      <div class="dot"></div>
                    </div>
                  </div>
                  <span class="typing-text">{{ typingUser }} is typing...</span>
                </div>
              </div>
            </div>

            <!-- Message Input -->
            <div class="message-input-container">
              <div class="input-actions">
                <button class="input-action-btn" title="Attach file">
                  <PaperClipIcon class="h-5 w-5" />
                </button>

                <button class="input-action-btn" title="Emoji">
                  <FaceSmileIcon class="h-5 w-5" />
                </button>
              </div>

              <div class="message-input-wrapper">
                <textarea
                  ref="messageInput"
                  v-model="newMessage"
                  @keydown="handleKeyDown"
                  @input="handleTyping"
                  placeholder="Type a message..."
                  class="message-input"
                  rows="1"
                ></textarea>
              </div>

              <button
                @click="sendMessage"
                :disabled="!newMessage.trim()"
                class="send-button"
              >
                <PaperAirplaneIcon class="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- New Conversation Modal - Commented out due to missing component -->
      <!-- <NewConversationModal
        :show="showNewConversationModal"
        @close="showNewConversationModal = false"
        @conversation-created="onConversationCreated"
      /> -->
    </div>
  </BaseModal>
</template>

<script>
import {
  PlusIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  UsersIcon,
  ChatBubbleLeftEllipsisIcon,
  ChatBubbleLeftRightIcon,
  VideoCameraIcon,
  PhoneIcon,
  EllipsisVerticalIcon,
  UserIcon,
  TrashIcon,
  CheckIcon,
  PaperClipIcon,
  FaceSmileIcon,
  PaperAirplaneIcon
} from '@heroicons/vue/24/outline'
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/vue'
import BaseModal from '../BaseModal.vue'
// import NewConversationModal from './NewConversationModal.vue' // Component not found
import { useCommunicationStore } from '../../stores/communication'

export default {
  name: 'MessagingModal',
  components: {
    BaseModal,
    // NewConversationModal,
    MenuComponent: Menu, MenuButton, MenuItems, MenuItem,
    PlusIcon,
    XMarkIcon,
    MagnifyingGlassIcon,
    UsersIcon,
    ChatBubbleLeftEllipsisIcon,
    ChatBubbleLeftRightIcon,
    VideoCameraIcon,
    PhoneIcon,
    EllipsisVerticalIcon,
    UserIcon,
    TrashIcon,
    CheckIcon,
    PaperClipIcon,
    FaceSmileIcon,
    PaperAirplaneIcon
  },
  props: {
    show: {
      type: Boolean,
      default: false
    }
  },
  emits: ['close', 'message-read'],
  data() {
    return {
      searchQuery: '',
      activeTab: 'all', // 'all', 'direct', 'teams'
      selectedConversation: null,
      newMessage: '',
      showNewConversationModal: false,
      currentUserId: 'current',
      someoneIsTyping: false,
      typingUser: '',
      typingTimeout: null
    }
  },
  computed: {
    communicationStore() {
      return useCommunicationStore()
    },
    conversations() {
      return this.communicationStore.messageThreads.map(thread => ({
        ...thread,
        displayName: this.getDisplayName(thread),
        participant: this.getMainParticipant(thread)
      }))
    },
    filteredConversations() {
      let filtered = this.conversations

      // Filter by tab
      if (this.activeTab === 'direct') {
        filtered = filtered.filter(conv => conv.type === 'direct')
      } else if (this.activeTab === 'teams') {
        filtered = filtered.filter(conv => conv.type === 'team')
      }

      // Filter by search
      if (this.searchQuery) {
        filtered = filtered.filter(conv =>
          conv.displayName.toLowerCase().includes(this.searchQuery.toLowerCase())
        )
      }

      return filtered
    },
    totalUnreadCount() {
      return this.conversations.reduce((sum, conv) => sum + conv.unreadCount, 0)
    },
    directUnreadCount() {
      return this.conversations
        .filter(conv => conv.type === 'direct')
        .reduce((sum, conv) => sum + conv.unreadCount, 0)
    },
    teamUnreadCount() {
      return this.conversations
        .filter(conv => conv.type === 'team')
        .reduce((sum, conv) => sum + conv.unreadCount, 0)
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
    getInitials(name) {
      return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    },

    getDisplayName(thread) {
      if (thread.type === 'team') {
        return thread.name || 'Team Chat'
      }

      const otherParticipant = thread.participants.find(p => p.id !== this.currentUserId)
      return otherParticipant?.name || 'Unknown User'
    },

    getMainParticipant(thread) {
      if (thread.type === 'team') {
        return { name: 'Team', status: 'online', avatar: null }
      }

      return thread.participants.find(p => p.id !== this.currentUserId) || {}
    },

    getParticipantStatus(conversation) {
      if (conversation.type === 'team') {
        return `${conversation.participants.length} members`
      }

      const participant = conversation.participant
      if (participant.status === 'online') {
        return 'Active now'
      } else if (participant.lastSeen) {
        return `Last seen ${this.formatRelativeTime(participant.lastSeen)}`
      }

      return 'Offline'
    },

    formatTime(timestamp) {
      if (!timestamp) return ''

      const date = new Date(timestamp)
      const now = new Date()
      const diffInHours = (now - date) / (1000 * 60 * 60)

      if (diffInHours < 24) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      } else if (diffInHours < 24 * 7) {
        return date.toLocaleDateString([], { weekday: 'short' })
      } else {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
      }
    },

    formatRelativeTime(timestamp) {
      const date = new Date(timestamp)
      const now = new Date()
      const diffInMinutes = (now - date) / (1000 * 60)

      if (diffInMinutes < 1) {
        return 'just now'
      } else if (diffInMinutes < 60) {
        return `${Math.floor(diffInMinutes)}m ago`
      } else if (diffInMinutes < 24 * 60) {
        return `${Math.floor(diffInMinutes / 60)}h ago`
      } else {
        return `${Math.floor(diffInMinutes / (24 * 60))}d ago`
      }
    },

    isOwnMessage(message) {
      return message.sender_id === this.currentUserId
    },

    selectConversation(conversation) {
      this.selectedConversation = conversation

      // Mark messages as read
      if (conversation.unreadCount > 0) {
        this.communicationStore.markMessagesAsRead(conversation.id)
        this.$emit('message-read')
      }

      // Scroll to bottom
      this.$nextTick(() => {
        this.scrollToBottom()
      })
    },

    scrollToBottom() {
      if (this.$refs.messagesContainer) {
        this.$refs.messagesContainer.scrollTop = this.$refs.messagesContainer.scrollHeight
      }
    },

    handleKeyDown(event) {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        this.sendMessage()
      }
    },

    handleTyping() {
      // Send typing indicator
      if (!this.typingTimeout) {
        this.communicationStore.sendMessage({
          type: 'typing_start',
          thread_id: this.selectedConversation.id
        })
      }

      // Clear previous timeout
      clearTimeout(this.typingTimeout)

      // Set new timeout
      this.typingTimeout = setTimeout(() => {
        this.communicationStore.sendMessage({
          type: 'typing_stop',
          thread_id: this.selectedConversation.id
        })
        this.typingTimeout = null
      }, 2000)
    },

    async sendMessage() {
      if (!this.newMessage.trim() || !this.selectedConversation) return

      try {
        await this.communicationStore.sendTextMessage(
          this.selectedConversation.id,
          this.newMessage.trim()
        )

        this.newMessage = ''

        // Clear typing indicator
        if (this.typingTimeout) {
          clearTimeout(this.typingTimeout)
          this.typingTimeout = null
        }

        // Scroll to bottom
        this.$nextTick(() => {
          this.scrollToBottom()
        })

        // Focus input
        this.$refs.messageInput?.focus()

      } catch (error) {
        console.error('Failed to send message:', error)
      }
    },

    startNewConversation() {
      this.showNewConversationModal = true
    },

    onConversationCreated(conversation) {
      this.selectConversation(conversation)
    },

    startVideoCall() {
      if (this.selectedConversation) {
        this.$emit('close')
        // Trigger video call modal through parent component
        this.$root.$emit('start-video-call', this.selectedConversation.participant)
      }
    },

    startVoiceCall() {
      if (this.selectedConversation) {
        this.$emit('close')
        // Trigger voice call modal through parent component
        this.$root.$emit('start-voice-call', this.selectedConversation.participant)
      }
    },

    viewProfile() {
      if (this.selectedConversation?.participant) {
        this.$router.push(`/profile/${this.selectedConversation.participant.id}`)
      }
    },

    clearHistory() {
      if (this.selectedConversation && confirm('Are you sure you want to clear this conversation history?')) {
        // Clear conversation history
        this.selectedConversation.messages = []
        this.selectedConversation.lastMessage = null
      }
    }
  },

  watch: {
    show(newVal) {
      if (newVal) {
        // Auto-select first conversation if available
        if (this.conversations.length > 0 && !this.selectedConversation) {
          this.selectConversation(this.conversations[0])
        }
      }
    }
  }
}
</script>

<style scoped>
.messaging-container {
  @apply flex flex-col h-[80vh] bg-white rounded-lg overflow-hidden;
}

.messaging-header {
  @apply flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50;
}

.header-left {
  @apply flex items-center gap-4;
}

.title {
  @apply text-xl font-semibold text-gray-900;
}

.status-indicator {
  @apply flex items-center gap-2 text-sm text-gray-600;
}

.status-dot {
  @apply w-2 h-2 rounded-full;
}

.status-dot.connected {
  @apply bg-green-500;
}

.status-dot.connecting {
  @apply bg-yellow-500 animate-pulse;
}

.status-dot.disconnected {
  @apply bg-gray-400;
}

.status-dot.error {
  @apply bg-red-500;
}

.header-actions {
  @apply flex items-center gap-2;
}

.new-conversation-btn {
  @apply flex items-center gap-2 px-4 py-2 bg-primary-500 text-white
         rounded-lg hover:bg-primary-600 transition-colors;
}

.close-btn {
  @apply p-2 text-gray-400 hover:text-gray-600 rounded-lg
         hover:bg-gray-100 transition-colors;
}

.messaging-body {
  @apply flex flex-1 overflow-hidden;
}

.conversations-sidebar {
  @apply w-80 border-r border-gray-200 flex flex-col bg-gray-50;
}

.sidebar-header {
  @apply p-4 border-b border-gray-200;
}

.search-box {
  @apply relative mb-4;
}

.search-icon {
  @apply absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400;
}

.search-input {
  @apply w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg
         focus:ring-2 focus:ring-primary-500 focus:border-primary-500
         bg-white;
}

.conversation-tabs {
  @apply flex gap-1 bg-gray-100 p-1 rounded-lg;
}

.tab {
  @apply flex-1 flex items-center justify-center gap-2 py-2 px-3
         text-sm font-medium text-gray-600 rounded-md
         hover:text-gray-900 transition-colors relative;
}

.tab.active {
  @apply bg-white text-primary-600 shadow-sm;
}

.tab-badge {
  @apply bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full
         min-w-[1.25rem] flex items-center justify-center;
}

.conversations-list {
  @apply flex-1 overflow-y-auto;
}

.conversation-item {
  @apply flex items-start gap-3 p-4 hover:bg-white transition-colors
         cursor-pointer border-b border-gray-100;
}

.conversation-item.active {
  @apply bg-white shadow-sm border-l-4 border-l-primary-500;
}

.conversation-avatar {
  @apply relative flex-shrink-0;
}

.single-avatar {
  @apply relative w-12 h-12 rounded-full overflow-hidden;
}

.single-avatar img {
  @apply w-full h-full object-cover;
}

.avatar-placeholder {
  @apply w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-700
         rounded-full flex items-center justify-center
         text-white font-semibold text-sm;
}

.avatar-placeholder.small {
  @apply w-8 h-8 text-xs;
}

.status-indicator.online {
  @apply absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full
         border-2 border-white;
}

.group-avatar {
  @apply w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center
         text-gray-600;
}

.conversation-content {
  @apply flex-1 min-w-0;
}

.conversation-header {
  @apply flex items-center justify-between mb-1;
}

.conversation-name {
  @apply font-medium text-gray-900 truncate;
}

.last-message-time {
  @apply text-xs text-gray-500 flex-shrink-0 ml-2;
}

.conversation-preview {
  @apply flex items-center justify-between gap-2;
}

.last-message {
  @apply text-sm text-gray-600 truncate flex-1;
}

.last-message.unread {
  @apply font-medium text-gray-900;
}

.conversation-indicators {
  @apply flex items-center gap-2;
}

.unread-badge {
  @apply bg-primary-500 text-white text-xs px-2 py-0.5 rounded-full
         min-w-[1.25rem] flex items-center justify-center font-medium;
}

.typing-indicator {
  @apply flex items-center;
}

.typing-dots {
  @apply flex gap-1;
}

.dot {
  @apply w-1.5 h-1.5 bg-gray-400 rounded-full;
  animation: typing 1.4s infinite ease-in-out;
}

.dot:nth-child(1) {
  animation-delay: -0.32s;
}

.dot:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes typing {
  0%, 80%, 100% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.empty-conversations {
  @apply flex flex-col items-center justify-center p-8 text-center;
}

.chat-area {
  @apply flex-1 flex flex-col;
}

.no-conversation-selected {
  @apply flex-1 flex flex-col items-center justify-center text-center p-8;
}

.chat-container {
  @apply flex-1 flex flex-col;
}

.chat-header {
  @apply flex items-center justify-between p-4 border-b border-gray-200 bg-white;
}

.chat-participant-info {
  @apply flex items-center gap-3;
}

.participant-avatar {
  @apply relative;
}

.participant-details h3 {
  @apply font-medium text-gray-900;
}

.participant-details p {
  @apply text-sm text-gray-500;
}

.chat-actions {
  @apply flex items-center gap-2;
}

.action-btn {
  @apply p-2 text-gray-600 hover:text-gray-900 rounded-lg
         hover:bg-gray-100 transition-colors;
}

.menu-items {
  @apply absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg
         border border-gray-200 py-1 z-10;
}

.menu-item {
  @apply flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700
         hover:bg-gray-50 transition-colors;
}

.menu-item.active {
  @apply bg-gray-50;
}

.messages-container {
  @apply flex-1 overflow-y-auto p-4 space-y-4;
}

.message {
  @apply flex gap-3;
}

.message.own-message {
  @apply justify-end;
}

.message.own-message .message-content {
  @apply items-end;
}

.message-avatar {
  @apply flex-shrink-0;
}

.message-content {
  @apply flex flex-col items-start max-w-xs;
}

.message.own-message .message-content {
  @apply items-end max-w-xs;
}

.message-sender {
  @apply text-xs text-gray-600 mb-1;
}

.message-bubble {
  @apply bg-gray-100 rounded-2xl px-4 py-2;
}

.message.own-message .message-bubble {
  @apply bg-primary-500 text-white;
}

.message-text {
  @apply text-sm leading-relaxed;
}

.message-meta {
  @apply flex items-center gap-1 mt-1;
}

.message-time {
  @apply text-xs opacity-70;
}

.read-indicator {
  @apply flex-shrink-0;
}

.typing-message {
  @apply flex gap-3;
}

.typing-avatar {
  @apply flex-shrink-0;
}

.typing-bubble {
  @apply bg-gray-100 rounded-2xl px-4 py-2 flex items-center gap-2;
}

.typing-text {
  @apply text-sm text-gray-600;
}

.message-input-container {
  @apply flex items-end gap-2 p-4 border-t border-gray-200 bg-white;
}

.input-actions {
  @apply flex gap-1;
}

.input-action-btn {
  @apply p-2 text-gray-600 hover:text-gray-900 rounded-lg
         hover:bg-gray-100 transition-colors;
}

.message-input-wrapper {
  @apply flex-1;
}

.message-input {
  @apply w-full px-4 py-3 border border-gray-300 rounded-2xl
         focus:ring-2 focus:ring-primary-500 focus:border-primary-500
         resize-none max-h-32;
}

.send-button {
  @apply p-3 bg-primary-500 text-white rounded-2xl
         hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed
         transition-colors;
}

/* Responsive design */
@media (max-width: 768px) {
  .messaging-container {
    @apply h-screen;
  }

  .conversations-sidebar {
    @apply w-full;
  }

  .chat-area {
    @apply hidden;
  }

  .conversations-sidebar.has-selected {
    @apply hidden;
  }

  .chat-area.has-selected {
    @apply flex;
  }
}
</style>