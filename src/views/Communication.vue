<template>
  <div class="communication-page">
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-left">
          <div class="page-title-section">
            <div class="page-title">
              <i class="fas fa-comments page-icon"></i>
              Communication Hub
            </div>
            <p class="page-subtitle">Team messaging, calls, video conferences, and collaboration tools</p>
          </div>
        </div>
        <div class="header-right">
          <button class="btn btn-primary" @click="startNewConversation">
            <i class="fas fa-plus"></i>
            New Conversation
          </button>
        </div>
      </div>
    </div>

    <!-- Communication Stats -->
    <div class="stats-overview">
      <div class="row">
        <div class="col-md-3">
          <div class="stat-card">
            <div class="stat-icon messages">
              <i class="fas fa-envelope"></i>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.totalMessages }}</div>
              <div class="stat-label">Messages Today</div>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="stat-card">
            <div class="stat-icon calls">
              <i class="fas fa-phone"></i>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.totalCalls }}</div>
              <div class="stat-label">Calls Today</div>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="stat-card">
            <div class="stat-icon active">
              <i class="fas fa-users"></i>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.activeUsers }}</div>
              <div class="stat-label">Active Users</div>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="stat-card">
            <div class="stat-icon meetings">
              <i class="fas fa-video"></i>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.scheduledMeetings }}</div>
              <div class="stat-label">Scheduled Meetings</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Communication Interface -->
    <div class="communication-container">
      <div class="row">
        <!-- Sidebar with conversations -->
        <div class="col-md-4">
          <div class="communication-sidebar">
            <div class="sidebar-header">
              <h5>Recent Conversations</h5>
              <div class="search-conversations">
                <div class="search-box">
                  <i class="fas fa-search"></i>
                  <input type="text" placeholder="Search conversations..." v-model="searchQuery">
                </div>
              </div>
            </div>

            <div class="conversations-list">
              <div v-for="conversation in filteredConversations" :key="conversation.id"
                   class="conversation-item" :class="{ active: selectedConversation?.id === conversation.id }"
                   @click="selectConversation(conversation)">
                <div class="conversation-avatar">
                  <img v-if="conversation.avatar" :src="conversation.avatar" :alt="conversation.name">
                  <div v-else class="avatar-placeholder">
                    {{ getInitials(conversation.name) }}
                  </div>
                  <div v-if="conversation.isOnline" class="online-indicator"></div>
                </div>
                <div class="conversation-info">
                  <div class="conversation-header">
                    <span class="conversation-name">{{ conversation.name }}</span>
                    <span class="conversation-time">{{ formatTime(conversation.lastMessage.timestamp) }}</span>
                  </div>
                  <div class="conversation-preview">
                    <span class="last-message">{{ conversation.lastMessage.text }}</span>
                    <span v-if="conversation.unreadCount > 0" class="unread-badge">{{ conversation.unreadCount }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Main chat area -->
        <div class="col-md-8">
          <div class="chat-container" v-if="selectedConversation">
            <!-- Chat Header -->
            <div class="chat-header">
              <div class="chat-participant">
                <div class="participant-avatar">
                  <img v-if="selectedConversation.avatar" :src="selectedConversation.avatar" :alt="selectedConversation.name">
                  <div v-else class="avatar-placeholder">
                    {{ getInitials(selectedConversation.name) }}
                  </div>
                  <div v-if="selectedConversation.isOnline" class="online-indicator"></div>
                </div>
                <div class="participant-info">
                  <h6>{{ selectedConversation.name }}</h6>
                  <span class="status">{{ selectedConversation.isOnline ? 'Online' : 'Offline' }}</span>
                </div>
              </div>
              <div class="chat-actions">
                <button class="action-btn" @click="startVoiceCall" title="Voice Call">
                  <i class="fas fa-phone"></i>
                </button>
                <button class="action-btn" @click="startVideoCall" title="Video Call">
                  <i class="fas fa-video"></i>
                </button>
                <button class="action-btn" @click="openChatSettings" title="Settings">
                  <i class="fas fa-cog"></i>
                </button>
              </div>
            </div>

            <!-- Messages Area -->
            <div class="messages-area" ref="messagesContainer">
              <div v-for="message in selectedConversation.messages" :key="message.id"
                   class="message" :class="{ 'own-message': message.sender === 'me' }">
                <div class="message-avatar" v-if="message.sender !== 'me'">
                  <div class="avatar-small">{{ getInitials(message.senderName) }}</div>
                </div>
                <div class="message-content">
                  <div class="message-bubble">
                    <p>{{ message.text }}</p>
                    <span class="message-time">{{ formatTime(message.timestamp) }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Message Input -->
            <div class="message-input-area">
              <div class="input-container">
                <button class="input-action" @click="openEmojiPicker" title="Emoji">
                  <i class="fas fa-smile"></i>
                </button>
                <input type="text"
                       v-model="newMessage"
                       placeholder="Type a message..."
                       @keypress.enter="sendMessage"
                       class="message-input">
                <button class="input-action" @click="attachFile" title="Attach File">
                  <i class="fas fa-paperclip"></i>
                </button>
                <button class="send-btn" @click="sendMessage" :disabled="!newMessage.trim()">
                  <i class="fas fa-paper-plane"></i>
                </button>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div v-else class="empty-state">
            <div class="empty-icon">
              <i class="fas fa-comments"></i>
            </div>
            <h5>Select a conversation</h5>
            <p>Choose a conversation from the sidebar to start chatting</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Communication Modals -->
    <VideoCallModal v-if="showVideoCall" @close="showVideoCall = false" :participant="callParticipant" />
    <VoiceCallModal v-if="showVoiceCall" @close="showVoiceCall = false" :participant="callParticipant" />
    <MessagingModal v-if="showMessaging" @close="showMessaging = false" />
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import VideoCallModal from '@/components/communication/VideoCallModal.vue'
import VoiceCallModal from '@/components/communication/VoiceCallModal.vue'
import MessagingModal from '@/components/communication/MessagingModal.vue'

export default {
  name: 'CommunicationPage',
  components: {
    VideoCallModal,
    VoiceCallModal,
    MessagingModal
  },
  setup() {
    const searchQuery = ref('')
    const newMessage = ref('')
    const selectedConversation = ref(null)
    const messagesContainer = ref(null)

    // Modal states
    const showVideoCall = ref(false)
    const showVoiceCall = ref(false)
    const showMessaging = ref(false)
    const callParticipant = ref(null)

    // Sample data - replace with real API calls
    const stats = reactive({
      totalMessages: 127,
      totalCalls: 8,
      activeUsers: 12,
      scheduledMeetings: 3
    })

    const conversations = ref([
      {
        id: 1,
        name: 'John Smith',
        avatar: null,
        isOnline: true,
        unreadCount: 2,
        lastMessage: {
          text: 'Can we schedule a meeting for tomorrow?',
          timestamp: new Date(Date.now() - 5 * 60 * 1000)
        },
        messages: [
          {
            id: 1,
            sender: 'john',
            senderName: 'John Smith',
            text: 'Hi, how are you doing?',
            timestamp: new Date(Date.now() - 60 * 60 * 1000)
          },
          {
            id: 2,
            sender: 'me',
            senderName: 'Me',
            text: 'I\'m good, thanks! How about you?',
            timestamp: new Date(Date.now() - 50 * 60 * 1000)
          },
          {
            id: 3,
            sender: 'john',
            senderName: 'John Smith',
            text: 'Can we schedule a meeting for tomorrow?',
            timestamp: new Date(Date.now() - 5 * 60 * 1000)
          }
        ]
      },
      {
        id: 2,
        name: 'Sarah Johnson',
        avatar: null,
        isOnline: false,
        unreadCount: 0,
        lastMessage: {
          text: 'Thanks for the update!',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000)
        },
        messages: [
          {
            id: 1,
            sender: 'me',
            senderName: 'Me',
            text: 'Here\'s the project update you requested.',
            timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000)
          },
          {
            id: 2,
            sender: 'sarah',
            senderName: 'Sarah Johnson',
            text: 'Thanks for the update!',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000)
          }
        ]
      }
    ])

    const filteredConversations = computed(() => {
      if (!searchQuery.value) return conversations.value
      return conversations.value.filter(conv =>
        conv.name.toLowerCase().includes(searchQuery.value.toLowerCase())
      )
    })

    // Methods
    const getInitials = (name) => {
      return name.split(' ').map(n => n[0]).join('').toUpperCase()
    }

    const formatTime = (timestamp) => {
      const now = new Date()
      const date = new Date(timestamp)
      const diffInHours = (now - date) / (1000 * 60 * 60)

      if (diffInHours < 1) {
        const minutes = Math.floor((now - date) / (1000 * 60))
        return minutes === 0 ? 'now' : `${minutes}m`
      } else if (diffInHours < 24) {
        return `${Math.floor(diffInHours)}h`
      } else {
        return date.toLocaleDateString()
      }
    }

    const selectConversation = (conversation) => {
      selectedConversation.value = conversation
      conversation.unreadCount = 0
      nextTick(() => {
        scrollToBottom()
      })
    }

    const scrollToBottom = () => {
      if (messagesContainer.value) {
        messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
      }
    }

    const sendMessage = () => {
      if (!newMessage.value.trim() || !selectedConversation.value) return

      const message = {
        id: Date.now(),
        sender: 'me',
        senderName: 'Me',
        text: newMessage.value.trim(),
        timestamp: new Date()
      }

      selectedConversation.value.messages.push(message)
      selectedConversation.value.lastMessage = {
        text: message.text,
        timestamp: message.timestamp
      }

      newMessage.value = ''
      nextTick(() => {
        scrollToBottom()
      })
    }

    const startVoiceCall = () => {
      if (!selectedConversation.value) return
      callParticipant.value = selectedConversation.value
      showVoiceCall.value = true
    }

    const startVideoCall = () => {
      if (!selectedConversation.value) return
      callParticipant.value = selectedConversation.value
      showVideoCall.value = true
    }

    const startNewConversation = () => {
      showMessaging.value = true
    }

    const openEmojiPicker = () => {
      // TODO: Implement emoji picker
      console.log('Open emoji picker')
    }

    const attachFile = () => {
      // TODO: Implement file attachment
      console.log('Attach file')
    }

    const openChatSettings = () => {
      // TODO: Implement chat settings
      console.log('Open chat settings')
    }

    onMounted(() => {
      // Auto-select first conversation
      if (conversations.value.length > 0) {
        selectConversation(conversations.value[0])
      }
    })

    return {
      searchQuery,
      newMessage,
      selectedConversation,
      messagesContainer,
      showVideoCall,
      showVoiceCall,
      showMessaging,
      callParticipant,
      stats,
      conversations,
      filteredConversations,
      getInitials,
      formatTime,
      selectConversation,
      sendMessage,
      startVoiceCall,
      startVideoCall,
      startNewConversation,
      openEmojiPicker,
      attachFile,
      openChatSettings
    }
  }
}
</script>

<style scoped>
.communication-page {
  padding: 1.5rem;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  min-height: 100vh;
}

.page-header {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 4px 20px rgba(0,0,0,0.08);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-title {
  font-size: 2rem;
  font-weight: 700;
  color: #2d3748;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.page-icon {
  color: #10b981;
}

.page-subtitle {
  color: #718096;
  margin: 0;
  font-size: 1rem;
}

.stats-overview {
  margin-bottom: 2rem;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
  transition: transform 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  color: white;
}

.stat-icon.messages { background: #10b981; }
.stat-icon.calls { background: #3b82f6; }
.stat-icon.active { background: #8b5cf6; }
.stat-icon.meetings { background: #f59e0b; }

.stat-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: #2d3748;
  margin-bottom: 0.25rem;
}

.stat-label {
  color: #718096;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.communication-container {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0,0,0,0.08);
  min-height: 600px;
}

.communication-sidebar {
  border-right: 1px solid #e5e7eb;
  height: 600px;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.sidebar-header h5 {
  margin: 0 0 1rem 0;
  color: #374151;
  font-weight: 600;
}

.search-box {
  position: relative;
}

.search-box i {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
}

.search-box input {
  width: 100%;
  padding: 0.5rem 0.75rem 0.5rem 2.5rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
}

.conversations-list {
  flex: 1;
  overflow-y: auto;
}

.conversation-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  cursor: pointer;
  transition: background-color 0.2s;
  border-bottom: 1px solid #f3f4f6;
}

.conversation-item:hover {
  background-color: #f9fafb;
}

.conversation-item.active {
  background-color: #ecfdf5;
  border-left: 3px solid #10b981;
}

.conversation-avatar {
  position: relative;
  flex-shrink: 0;
}

.conversation-avatar img,
.avatar-placeholder {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: #6b7280;
  font-size: 0.875rem;
}

.online-indicator {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 12px;
  height: 12px;
  background: #10b981;
  border: 2px solid white;
  border-radius: 50%;
}

.conversation-info {
  flex: 1;
  min-width: 0;
}

.conversation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
}

.conversation-name {
  font-weight: 600;
  color: #374151;
  font-size: 0.875rem;
}

.conversation-time {
  color: #9ca3af;
  font-size: 0.75rem;
}

.conversation-preview {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.last-message {
  color: #6b7280;
  font-size: 0.75rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.unread-badge {
  background: #ef4444;
  color: white;
  font-size: 0.625rem;
  padding: 0.125rem 0.375rem;
  border-radius: 10px;
  min-width: 16px;
  text-align: center;
}

.chat-container {
  height: 600px;
  display: flex;
  flex-direction: column;
}

.chat-header {
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chat-participant {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.participant-avatar {
  position: relative;
}

.participant-avatar img,
.participant-avatar .avatar-placeholder {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: #6b7280;
  font-size: 0.875rem;
}

.participant-info h6 {
  margin: 0;
  color: #374151;
  font-weight: 600;
}

.participant-info .status {
  color: #10b981;
  font-size: 0.75rem;
}

.chat-actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  background: white;
  color: #6b7280;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: #f9fafb;
  color: #10b981;
}

.messages-area {
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
  background: #f9fafb;
}

.message {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.message.own-message {
  flex-direction: row-reverse;
}

.message-avatar .avatar-small {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: #6b7280;
  font-size: 0.75rem;
}

.message-content {
  max-width: 70%;
}

.message.own-message .message-content {
  display: flex;
  justify-content: flex-end;
}

.message-bubble {
  background: white;
  padding: 0.75rem 1rem;
  border-radius: 12px;
  position: relative;
}

.message.own-message .message-bubble {
  background: #10b981;
  color: white;
}

.message-bubble p {
  margin: 0 0 0.25rem 0;
  font-size: 0.875rem;
  line-height: 1.4;
}

.message-time {
  font-size: 0.625rem;
  opacity: 0.7;
}

.message-input-area {
  padding: 1.5rem;
  border-top: 1px solid #e5e7eb;
  background: white;
}

.input-container {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: #f9fafb;
  border-radius: 24px;
  padding: 0.5rem;
}

.input-action {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;
}

.input-action:hover {
  color: #10b981;
}

.message-input {
  flex: 1;
  border: none;
  background: transparent;
  padding: 0.5rem;
  font-size: 0.875rem;
  outline: none;
}

.send-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: #10b981;
  color: white;
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
}

.send-btn:disabled {
  background: #d1d5db;
  cursor: not-allowed;
}

.send-btn:hover:not(:disabled) {
  background: #059669;
}

.empty-state {
  height: 600px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: #6b7280;
}

.empty-icon {
  font-size: 4rem;
  color: #e5e7eb;
  margin-bottom: 1rem;
}

.empty-state h5 {
  color: #374151;
  margin-bottom: 0.5rem;
}
</style>