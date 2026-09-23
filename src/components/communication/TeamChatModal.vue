<template>
  <TransitionRoot as="template" :show="show">
    <DialogModal as="div" class="relative z-50" @close="close">
      <TransitionChild
        as="template"
        enter="ease-out duration-300"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="ease-in duration-200"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
      </TransitionChild>

      <div class="fixed inset-0 z-10 overflow-y-auto">
        <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <TransitionChild
            as="template"
            enter="ease-out duration-300"
            enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            enter-to="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-200"
            leave-from="opacity-100 translate-y-0 sm:scale-100"
            leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          >
            <DialogPanel class="team-chat-container">
              <!-- Header -->
              <div class="chat-header">
                <div class="header-left">
                  <UsersIcon class="h-6 w-6 text-orange-600" />
                  <div>
                    <h2 class="header-title">Team Chat</h2>
                    <p class="header-subtitle">{{ currentChannel.name }}</p>
                  </div>
                </div>
                <div class="header-actions">
                  <button @click="toggleChannelList" class="action-btn" title="Channels">
                    <Bars3Icon class="h-5 w-5" />
                  </button>
                  <button @click="toggleMembersList" class="action-btn" title="Members">
                    <UserGroupIcon class="h-5 w-5" />
                  </button>
                  <button @click="close" class="action-btn close-btn" title="Close">
                    <XMarkIcon class="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div class="chat-body">
                <!-- Channels Sidebar -->
                <div v-show="showChannels" class="channels-sidebar">
                  <div class="sidebar-header">
                    <h3>Channels</h3>
                    <button @click="createChannel" class="create-btn">
                      <PlusIcon class="h-4 w-4" />
                    </button>
                  </div>
                  <div class="channels-list">
                    <div
                      v-for="channel in channels"
                      :key="channel.id"
                      @click="switchChannel(channel)"
                      :class="['channel-item', { active: currentChannel.id === channel.id }]"
                    >
                      <div class="channel-icon">
                        <HashtagIcon v-if="!channel.isPrivate" class="h-4 w-4" />
                        <LockClosedIcon v-else class="h-4 w-4" />
                      </div>
                      <span class="channel-name">{{ channel.name }}</span>
                      <span v-if="channel.unreadCount > 0" class="unread-count">
                        {{ channel.unreadCount }}
                      </span>
                    </div>
                  </div>

                  <div class="sidebar-section">
                    <h4>Direct Messages</h4>
                    <div class="dm-list">
                      <div
                        v-for="dm in directMessages"
                        :key="dm.id"
                        @click="switchChannel(dm)"
                        :class="['dm-item', { active: currentChannel.id === dm.id }]"
                      >
                        <div class="dm-avatar">
                          <img
                            v-if="dm.avatar"
                            :src="dm.avatar"
                            :alt="dm.name"
                            class="avatar-img"
                          >
                          <div v-else class="avatar-placeholder">
                            {{ getInitials(dm.name) }}
                          </div>
                          <div class="status-dot" :class="getStatusClass(dm.status)"></div>
                        </div>
                        <span class="dm-name">{{ dm.name }}</span>
                        <span v-if="dm.unreadCount > 0" class="unread-count">
                          {{ dm.unreadCount }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Main Chat Area -->
                <div class="main-chat">
                  <!-- Channel Info Bar -->
                  <div class="channel-info">
                    <div class="channel-details">
                      <HashtagIcon v-if="!currentChannel.isPrivate" class="h-4 w-4 text-gray-500" />
                      <LockClosedIcon v-else class="h-4 w-4 text-gray-500" />
                      <span class="channel-name">{{ currentChannel.name }}</span>
                      <span class="member-count">{{ currentChannel.memberCount }} members</span>
                    </div>
                    <div class="channel-actions">
                      <button @click="startCall" class="quick-action" title="Start Call">
                        <PhoneIcon class="h-4 w-4" />
                      </button>
                      <button @click="startVideoCall" class="quick-action" title="Video Call">
                        <VideoCameraIcon class="h-4 w-4" />
                      </button>
                      <button @click="shareScreen" class="quick-action" title="Share Screen">
                        <ComputerDesktopIcon class="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <!-- Messages -->
                  <div class="messages-container" ref="messagesContainer">
                    <div v-if="isLoading" class="loading-messages">
                      <div class="loading-spinner"></div>
                      <span>Loading messages...</span>
                    </div>

                    <div v-for="message in currentMessages" :key="message.id" class="message-group">
                      <!-- Date separator -->
                      <div v-if="shouldShowDateSeparator(message)" class="date-separator">
                        {{ formatMessageDate(message.created_at) }}
                      </div>

                      <div class="message-item" :class="{ 'own-message': message.sender_id === currentUser?.id }">
                        <div class="message-avatar">
                          <img
                            v-if="message.sender.avatar"
                            :src="message.sender.avatar"
                            :alt="message.sender.name"
                            class="avatar-img"
                          >
                          <div v-else class="avatar-placeholder">
                            {{ getInitials(message.sender.name) }}
                          </div>
                        </div>
                        <div class="message-content">
                          <div class="message-header">
                            <span class="sender-name">{{ message.sender.name }}</span>
                            <span class="message-time">{{ formatMessageTime(message.created_at) }}</span>
                          </div>
                          <div class="message-text">{{ message.content }}</div>
                          <div v-if="message.reactions && message.reactions.length > 0" class="message-reactions">
                            <button
                              v-for="reaction in message.reactions"
                              :key="reaction.emoji"
                              @click="toggleReaction(message, reaction.emoji)"
                              class="reaction-btn"
                            >
                              {{ reaction.emoji }} {{ reaction.count }}
                            </button>
                          </div>
                        </div>
                        <div class="message-actions">
                          <button @click="addReaction(message)" class="message-action" title="React">
                            <FaceSmileIcon class="h-4 w-4" />
                          </button>
                          <button @click="replyToMessage(message)" class="message-action" title="Reply">
                            <ArrowUturnLeftIcon class="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <!-- Typing indicators -->
                    <div v-if="typingUsers.length > 0" class="typing-indicator">
                      <div class="typing-dots">
                        <div class="dot"></div>
                        <div class="dot"></div>
                        <div class="dot"></div>
                      </div>
                      <span>{{ getTypingText(typingUsers) }}</span>
                    </div>
                  </div>

                  <!-- Message Input -->
                  <div class="message-input-container">
                    <div v-if="replyingTo" class="reply-preview">
                      <div class="reply-content">
                        <span class="reply-to">Replying to {{ replyingTo.sender.name }}</span>
                        <span class="reply-message">{{ replyingTo.content }}</span>
                      </div>
                      <button @click="cancelReply" class="cancel-reply">
                        <XMarkIcon class="h-4 w-4" />
                      </button>
                    </div>

                    <div class="input-area">
                      <button @click="attachFile" class="attach-btn" title="Attach File">
                        <PaperClipIcon class="h-5 w-5" />
                      </button>
                      <div class="input-wrapper">
                        <textarea
                          v-model="newMessage"
                          @keydown="handleKeyDown"
                          @input="handleTyping"
                          placeholder="Type your message..."
                          class="message-input"
                          rows="1"
                          ref="messageInput"
                        ></textarea>
                      </div>
                      <button
                        @click="sendMessage"
                        :disabled="!newMessage.trim()"
                        class="send-btn"
                        title="Send Message"
                      >
                        <PaperAirplaneIcon class="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Members Sidebar -->
                <div v-show="showMembers" class="members-sidebar">
                  <div class="sidebar-header">
                    <h3>Members ({{ currentChannel.memberCount }})</h3>
                  </div>
                  <div class="members-list">
                    <div class="member-section">
                      <h4>Online ({{ onlineMembers.length }})</h4>
                      <div
                        v-for="member in onlineMembers"
                        :key="member.id"
                        class="member-item"
                      >
                        <div class="member-avatar">
                          <img
                            v-if="member.avatar"
                            :src="member.avatar"
                            :alt="member.name"
                            class="avatar-img"
                          >
                          <div v-else class="avatar-placeholder">
                            {{ getInitials(member.name) }}
                          </div>
                          <div class="status-dot online"></div>
                        </div>
                        <div class="member-info">
                          <span class="member-name">{{ member.name }}</span>
                          <span class="member-role">{{ member.role }}</span>
                        </div>
                      </div>
                    </div>

                    <div class="member-section" v-if="offlineMembers.length > 0">
                      <h4>Offline ({{ offlineMembers.length }})</h4>
                      <div
                        v-for="member in offlineMembers"
                        :key="member.id"
                        class="member-item offline"
                      >
                        <div class="member-avatar">
                          <img
                            v-if="member.avatar"
                            :src="member.avatar"
                            :alt="member.name"
                            class="avatar-img"
                          >
                          <div v-else class="avatar-placeholder">
                            {{ getInitials(member.name) }}
                          </div>
                          <div class="status-dot offline"></div>
                        </div>
                        <div class="member-info">
                          <span class="member-name">{{ member.name }}</span>
                          <span class="member-role">{{ member.role }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </DialogModal>
  </TransitionRoot>
</template>

<script>
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import {
  Dialog,
  DialogPanel,
  TransitionChild,
  TransitionRoot
} from '@headlessui/vue'
import {
  UsersIcon,
  XMarkIcon,
  Bars3Icon,
  UserGroupIcon,
  PlusIcon,
  HashtagIcon,
  LockClosedIcon,
  PhoneIcon,
  VideoCameraIcon,
  ComputerDesktopIcon,
  FaceSmileIcon,
  ArrowUturnLeftIcon,
  PaperClipIcon,
  PaperAirplaneIcon
} from '@heroicons/vue/24/outline'
import { useCommunicationStore } from '../../stores/communication'

export default {
  name: 'TeamChatModal',
  components: {
    DialogModal: Dialog,
    DialogPanel,
    TransitionChild,
    TransitionRoot,
    UsersIcon,
    XMarkIcon,
    Bars3Icon,
    UserGroupIcon,
    PlusIcon,
    HashtagIcon,
    LockClosedIcon,
    PhoneIcon,
    VideoCameraIcon,
    ComputerDesktopIcon,
    FaceSmileIcon,
    ArrowUturnLeftIcon,
    PaperClipIcon,
    PaperAirplaneIcon
  },
  props: {
    show: {
      type: Boolean,
      default: false
    }
  },
  emits: ['close'],
  setup(props, { emit }) {
    const communicationStore = useCommunicationStore()

    // UI State
    const showChannels = ref(true)
    const showMembers = ref(true)
    const isLoading = ref(false)
    const newMessage = ref('')
    const replyingTo = ref(null)
    const typingUsers = ref([])
    const messagesContainer = ref(null)
    const messageInput = ref(null)

    // Current user (mock)
    const currentUser = ref({
      id: 'current',
      name: 'You',
      avatar: null
    })

    // Channels data
    const channels = ref([
      {
        id: 1,
        name: 'general',
        type: 'channel',
        isPrivate: false,
        memberCount: 12,
        unreadCount: 3
      },
      {
        id: 2,
        name: 'development',
        type: 'channel',
        isPrivate: false,
        memberCount: 8,
        unreadCount: 0
      },
      {
        id: 3,
        name: 'management',
        type: 'channel',
        isPrivate: true,
        memberCount: 5,
        unreadCount: 1
      }
    ])

    // Direct messages
    const directMessages = ref([
      {
        id: 'dm-1',
        name: 'John Smith',
        type: 'dm',
        avatar: null,
        status: 'online',
        memberCount: 2,
        unreadCount: 2
      },
      {
        id: 'dm-2',
        name: 'Sarah Johnson',
        type: 'dm',
        avatar: null,
        status: 'away',
        memberCount: 2,
        unreadCount: 0
      }
    ])

    const currentChannel = ref(channels.value[0])

    // Mock messages data
    const allMessages = ref({
      1: [
        {
          id: 1,
          sender_id: 2,
          sender: { id: 2, name: 'John Smith', avatar: null },
          content: 'Good morning team! Ready for today\'s standup?',
          created_at: new Date(Date.now() - 3600000).toISOString(),
          reactions: [
            { emoji: '👍', count: 3, users: ['current', 2, 3] }
          ]
        },
        {
          id: 2,
          sender_id: 3,
          sender: { id: 3, name: 'Sarah Johnson', avatar: null },
          content: 'Yes! I have some updates on the booking system.',
          created_at: new Date(Date.now() - 3000000).toISOString(),
          reactions: []
        }
      ],
      2: [
        {
          id: 3,
          sender_id: 2,
          sender: { id: 2, name: 'John Smith', avatar: null },
          content: 'The new API endpoints are ready for testing.',
          created_at: new Date(Date.now() - 1800000).toISOString(),
          reactions: []
        }
      ]
    })

    // Members data
    const members = ref([
      {
        id: 1,
        name: 'You',
        avatar: null,
        role: 'Owner',
        status: 'online'
      },
      {
        id: 2,
        name: 'John Smith',
        avatar: null,
        role: 'Developer',
        status: 'online'
      },
      {
        id: 3,
        name: 'Sarah Johnson',
        avatar: null,
        role: 'Designer',
        status: 'online'
      },
      {
        id: 4,
        name: 'Mike Davis',
        avatar: null,
        role: 'Developer',
        status: 'offline'
      }
    ])

    const currentMessages = computed(() => {
      return allMessages.value[currentChannel.value.id] || []
    })

    const onlineMembers = computed(() => {
      return members.value.filter(m => m.status === 'online')
    })

    const offlineMembers = computed(() => {
      return members.value.filter(m => m.status === 'offline')
    })

    // Methods
    const close = () => {
      emit('close')
    }

    const toggleChannelList = () => {
      showChannels.value = !showChannels.value
    }

    const toggleMembersList = () => {
      showMembers.value = !showMembers.value
    }

    const switchChannel = (channel) => {
      currentChannel.value = channel
      channel.unreadCount = 0
      scrollToBottom()
    }

    const createChannel = () => {
      // Implementation for creating new channel
      console.log('Create new channel')
    }

    const startCall = () => {
      console.log('Start voice call')
    }

    const startVideoCall = () => {
      console.log('Start video call')
    }

    const shareScreen = () => {
      console.log('Start screen share')
    }

    const sendMessage = async () => {
      if (!newMessage.value.trim()) return

      const message = {
        id: Date.now(),
        sender_id: currentUser.value.id,
        sender: currentUser.value,
        content: newMessage.value,
        created_at: new Date().toISOString(),
        reactions: []
      }

      if (replyingTo.value) {
        message.reply_to = replyingTo.value.id
        replyingTo.value = null
      }

      if (!allMessages.value[currentChannel.value.id]) {
        allMessages.value[currentChannel.value.id] = []
      }
      allMessages.value[currentChannel.value.id].push(message)

      newMessage.value = ''
      await nextTick()
      scrollToBottom()

      // Send through communication store
      communicationStore.sendMessage({
        type: 'team_message',
        payload: {
          channel_id: currentChannel.value.id,
          ...message
        }
      })
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        sendMessage()
      }
    }

    const handleTyping = () => {
      // Implement typing indicator logic
      communicationStore.sendMessage({
        type: 'typing',
        payload: {
          channel_id: currentChannel.value.id,
          user_id: currentUser.value.id
        }
      })
    }

    const replyToMessage = (message) => {
      replyingTo.value = message
      messageInput.value?.focus()
    }

    const cancelReply = () => {
      replyingTo.value = null
    }

    const addReaction = (message) => {
      // Implementation for reaction picker
      console.log('Add reaction to message', message.id)
    }

    const toggleReaction = (message, emoji) => {
      // Implementation for toggling reactions
      console.log('Toggle reaction', emoji, 'on message', message.id)
    }

    const attachFile = () => {
      // Implementation for file attachment
      console.log('Attach file')
    }

    const scrollToBottom = () => {
      nextTick(() => {
        if (messagesContainer.value) {
          messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
        }
      })
    }

    // Utility functions
    const getInitials = (name) => {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }

    const getStatusClass = (status) => {
      return status === 'online' ? 'online' : status === 'away' ? 'away' : 'offline'
    }

    const shouldShowDateSeparator = (message) => {
      // Simple implementation - show for first message or different day
      const currentIndex = currentMessages.value.findIndex(m => m.id === message.id)
      if (currentIndex === 0) return true

      const prevMessage = currentMessages.value[currentIndex - 1]
      if (!prevMessage) return false

      const currentDate = new Date(message.created_at).toDateString()
      const prevDate = new Date(prevMessage.created_at).toDateString()
      return currentDate !== prevDate
    }

    const formatMessageDate = (dateString) => {
      const date = new Date(dateString)
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      if (date.toDateString() === today.toDateString()) {
        return 'Today'
      } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday'
      } else {
        return date.toLocaleDateString()
      }
    }

    const formatMessageTime = (dateString) => {
      return new Date(dateString).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    const getTypingText = (users) => {
      if (users.length === 1) {
        return `${users[0].name} is typing...`
      } else if (users.length === 2) {
        return `${users[0].name} and ${users[1].name} are typing...`
      } else {
        return `${users.length} people are typing...`
      }
    }

    // Lifecycle
    watch(() => props.show, (newShow) => {
      if (newShow) {
        nextTick(() => {
          scrollToBottom()
          messageInput.value?.focus()
        })
      }
    })

    onMounted(() => {
      scrollToBottom()
    })

    return {
      // State
      showChannels,
      showMembers,
      isLoading,
      newMessage,
      replyingTo,
      typingUsers,
      messagesContainer,
      messageInput,
      currentUser,
      channels,
      directMessages,
      currentChannel,
      members,

      // Computed
      currentMessages,
      onlineMembers,
      offlineMembers,

      // Methods
      close,
      toggleChannelList,
      toggleMembersList,
      switchChannel,
      createChannel,
      startCall,
      startVideoCall,
      shareScreen,
      sendMessage,
      handleKeyDown,
      handleTyping,
      replyToMessage,
      cancelReply,
      addReaction,
      toggleReaction,
      attachFile,
      getInitials,
      getStatusClass,
      shouldShowDateSeparator,
      formatMessageDate,
      formatMessageTime,
      getTypingText
    }
  }
}
</script>

<style scoped>
.team-chat-container {
  @apply relative transform overflow-hidden rounded-xl bg-white text-left shadow-xl transition-all;
  @apply sm:my-8 sm:w-full sm:max-w-6xl;
  height: 80vh;
  max-height: 800px;
}

.chat-header {
  @apply flex items-center justify-between p-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white;
}

.header-left {
  @apply flex items-center gap-3;
}

.header-title {
  @apply text-lg font-semibold;
}

.header-subtitle {
  @apply text-sm opacity-90;
}

.header-actions {
  @apply flex items-center gap-2;
}

.action-btn {
  @apply p-2 rounded-lg hover:bg-white hover:bg-opacity-20 transition-all duration-200;
}

.close-btn:hover {
  @apply bg-red-500 bg-opacity-80;
}

.chat-body {
  @apply flex h-full;
  height: calc(100% - 80px);
}

/* Channels Sidebar */
.channels-sidebar {
  @apply w-64 bg-gray-50 border-r border-gray-200 flex flex-col;
}

.sidebar-header {
  @apply flex items-center justify-between p-4 border-b border-gray-200;
}

.sidebar-header h3 {
  @apply text-sm font-semibold text-gray-900;
}

.create-btn {
  @apply p-1 rounded hover:bg-gray-200 transition-colors duration-200;
}

.channels-list,
.dm-list {
  @apply space-y-1 p-2;
}

.channel-item,
.dm-item {
  @apply flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer
         hover:bg-gray-200 transition-all duration-200;
}

.channel-item.active,
.dm-item.active {
  @apply bg-orange-100 text-orange-700;
}

.channel-icon {
  @apply flex-shrink-0 text-gray-400;
}

.channel-name,
.dm-name {
  @apply flex-1 text-sm font-medium truncate;
}

.unread-count {
  @apply bg-orange-500 text-white text-xs rounded-full px-2 py-1 font-semibold min-w-5 text-center;
}

.sidebar-section {
  @apply border-t border-gray-200 mt-4 pt-4;
}

.sidebar-section h4 {
  @apply text-xs font-semibold text-gray-500 uppercase px-4 mb-2;
}

.dm-avatar {
  @apply relative w-6 h-6;
}

.avatar-img {
  @apply w-full h-full rounded-full object-cover;
}

.avatar-placeholder {
  @apply w-full h-full rounded-full bg-gray-300 flex items-center justify-center text-xs font-medium;
}

.status-dot {
  @apply absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white;
}

.status-dot.online {
  @apply bg-green-500;
}

.status-dot.away {
  @apply bg-yellow-500;
}

.status-dot.offline {
  @apply bg-gray-400;
}

/* Main Chat Area */
.main-chat {
  @apply flex-1 flex flex-col;
}

.channel-info {
  @apply flex items-center justify-between p-4 border-b border-gray-200 bg-white;
}

.channel-details {
  @apply flex items-center gap-2;
}

.channel-name {
  @apply font-semibold text-gray-900;
}

.member-count {
  @apply text-sm text-gray-500;
}

.channel-actions {
  @apply flex items-center gap-2;
}

.quick-action {
  @apply p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700
         transition-all duration-200;
}

.messages-container {
  @apply flex-1 overflow-y-auto p-4 space-y-4;
}

.loading-messages {
  @apply flex items-center justify-center gap-2 py-8 text-gray-500;
}

.loading-spinner {
  @apply w-4 h-4 border-2 border-gray-300 border-t-orange-500 rounded-full animate-spin;
}

.date-separator {
  @apply text-center text-xs text-gray-500 py-2;
  position: relative;
}

.date-separator::before,
.date-separator::after {
  content: '';
  @apply absolute top-1/2 w-full h-px bg-gray-200;
}

.date-separator::before {
  @apply -left-4;
  width: calc(50% - 60px);
}

.date-separator::after {
  @apply -right-4;
  width: calc(50% - 60px);
}

.message-item {
  @apply flex gap-3 group hover:bg-gray-50 p-2 rounded-lg;
}

.message-item.own-message {
  @apply flex-row-reverse;
}

.message-avatar {
  @apply w-8 h-8 flex-shrink-0;
}

.message-content {
  @apply flex-1;
}

.message-item.own-message .message-content {
  @apply text-right;
}

.message-header {
  @apply flex items-center gap-2 mb-1;
}

.message-item.own-message .message-header {
  @apply justify-end;
}

.sender-name {
  @apply text-sm font-semibold text-gray-900;
}

.message-time {
  @apply text-xs text-gray-500;
}

.message-text {
  @apply text-sm text-gray-800 whitespace-pre-wrap;
}

.message-reactions {
  @apply flex gap-1 mt-2;
}

.reaction-btn {
  @apply text-xs bg-gray-100 hover:bg-gray-200 rounded-full px-2 py-1
         transition-colors duration-200;
}

.message-actions {
  @apply flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200;
}

.message-action {
  @apply p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700
         transition-all duration-200;
}

.typing-indicator {
  @apply flex items-center gap-2 text-sm text-gray-500 px-2;
}

.typing-dots {
  @apply flex gap-1;
}

.typing-dots .dot {
  @apply w-2 h-2 bg-gray-400 rounded-full animate-pulse;
}

.typing-dots .dot:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-dots .dot:nth-child(3) {
  animation-delay: 0.4s;
}

/* Message Input */
.message-input-container {
  @apply border-t border-gray-200 bg-white;
}

.reply-preview {
  @apply flex items-center justify-between p-3 bg-gray-50 border-b border-gray-200;
}

.reply-content {
  @apply flex flex-col;
}

.reply-to {
  @apply text-xs text-gray-500;
}

.reply-message {
  @apply text-sm text-gray-700 truncate;
}

.cancel-reply {
  @apply p-1 rounded hover:bg-gray-200 text-gray-500;
}

.input-area {
  @apply flex items-end gap-2 p-3;
}

.attach-btn,
.send-btn {
  @apply p-2 rounded-lg transition-all duration-200;
}

.attach-btn {
  @apply text-gray-500 hover:text-gray-700 hover:bg-gray-100;
}

.send-btn {
  @apply bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50
         disabled:cursor-not-allowed;
}

.input-wrapper {
  @apply flex-1;
}

.message-input {
  @apply w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
         focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent
         resize-none max-h-32;
}

/* Members Sidebar */
.members-sidebar {
  @apply w-64 bg-gray-50 border-l border-gray-200 flex flex-col;
}

.members-list {
  @apply flex-1 overflow-y-auto p-4 space-y-4;
}

.member-section h4 {
  @apply text-xs font-semibold text-gray-500 uppercase mb-2;
}

.member-item {
  @apply flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100
         transition-colors duration-200;
}

.member-item.offline {
  @apply opacity-60;
}

.member-avatar {
  @apply relative w-8 h-8;
}

.member-info {
  @apply flex-1;
}

.member-name {
  @apply text-sm font-medium text-gray-900;
}

.member-role {
  @apply text-xs text-gray-500;
}

/* Responsive design */
@media (max-width: 1024px) {
  .team-chat-container {
    @apply sm:max-w-4xl;
  }

  .channels-sidebar,
  .members-sidebar {
    @apply w-48;
  }
}

@media (max-width: 768px) {
  .team-chat-container {
    @apply sm:max-w-full;
    height: 90vh;
  }

  .channels-sidebar,
  .members-sidebar {
    @apply absolute z-10 h-full;
  }
}

/* Dark theme support */
[data-theme="dark"] .team-chat-container {
  @apply bg-gray-800;
}

[data-theme="dark"] .channels-sidebar,
[data-theme="dark"] .members-sidebar {
  @apply bg-gray-700 border-gray-600;
}

[data-theme="dark"] .message-item:hover {
  @apply bg-gray-700;
}

[data-theme="dark"] .message-text {
  @apply text-gray-200;
}
</style>