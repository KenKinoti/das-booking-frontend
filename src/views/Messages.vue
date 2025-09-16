<template>
  <div class="messaging-container">
    <!-- Sidebar with threads -->
    <div class="messaging-sidebar" :class="{ 'mobile-hidden': selectedThread }">
      <!-- Header -->
      <div class="sidebar-header">
        <div class="user-info">
          <div class="user-avatar">
            <i class="fas fa-user"></i>
          </div>
          <div class="user-details">
            <h3>Messages</h3>
            <span class="online-status">Online</span>
          </div>
        </div>
        <div class="header-actions">
          <button @click="showNewChatModal = true" class="btn-new-chat" title="New Chat">
            <i class="fas fa-plus"></i>
          </button>
          <button @click="showSettings = true" class="btn-settings" title="Settings">
            <i class="fas fa-cog"></i>
          </button>
        </div>
      </div>

      <!-- Search -->
      <div class="search-section">
        <div class="search-box">
          <i class="fas fa-search"></i>
          <input
            v-model="searchQuery"
            @input="searchMessages"
            placeholder="Search messages..."
            class="search-input"
          />
        </div>
      </div>

      <!-- Thread List -->
      <div class="threads-list">
        <div v-if="loading" class="loading-threads">
          <div class="thread-skeleton" v-for="i in 5" :key="i">
            <div class="skeleton-avatar"></div>
            <div class="skeleton-content">
              <div class="skeleton-line"></div>
              <div class="skeleton-line short"></div>
            </div>
          </div>
        </div>

        <div v-else-if="filteredThreads.length === 0" class="empty-threads">
          <i class="fas fa-comments"></i>
          <p>No conversations yet</p>
          <button @click="showNewChatModal = true" class="btn btn-primary">
            Start a conversation
          </button>
        </div>

        <div
          v-else
          v-for="thread in filteredThreads"
          :key="thread.id"
          class="thread-item"
          :class="{ active: selectedThread?.id === thread.id }"
          @click="selectThread(thread)"
        >
          <div class="thread-avatar">
            <img v-if="getThreadAvatar(thread)" :src="getThreadAvatar(thread)" :alt="getThreadName(thread)" />
            <div v-else class="avatar-placeholder">
              {{ getThreadInitials(thread) }}
            </div>
            <div v-if="getOnlineStatus(thread)" class="online-indicator"></div>
          </div>

          <div class="thread-info">
            <div class="thread-header">
              <h4 class="thread-name">{{ getThreadName(thread) }}</h4>
              <span class="thread-time">{{ formatTime(thread.last_message_at || thread.created_at) }}</span>
            </div>
            <div class="thread-preview">
              <p class="last-message">{{ getLastMessage(thread) }}</p>
              <div class="thread-badges">
                <span v-if="getUnreadCount(thread) > 0" class="unread-badge">
                  {{ getUnreadCount(thread) > 99 ? '99+' : getUnreadCount(thread) }}
                </span>
                <i v-if="thread.is_muted" class="fas fa-volume-mute muted-icon"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Chat Area -->
    <div class="chat-area" :class="{ 'mobile-visible': selectedThread }">
      <!-- No chat selected -->
      <div v-if="!selectedThread" class="no-chat-selected">
        <div class="welcome-message">
          <i class="fas fa-comments"></i>
          <h2>Welcome to Messages</h2>
          <p>Select a conversation to start messaging or create a new one</p>
          <button @click="showNewChatModal = true" class="btn btn-primary">
            <i class="fas fa-plus me-2"></i>
            New Conversation
          </button>
        </div>
      </div>

      <!-- Active chat -->
      <div v-else class="active-chat">
        <!-- Chat Header -->
        <div class="chat-header">
          <button @click="backToThreads" class="btn-back mobile-only">
            <i class="fas fa-arrow-left"></i>
          </button>

          <div class="chat-contact">
            <div class="contact-avatar">
              <img v-if="getThreadAvatar(selectedThread)" :src="getThreadAvatar(selectedThread)" :alt="getThreadName(selectedThread)" />
              <div v-else class="avatar-placeholder">
                {{ getThreadInitials(selectedThread) }}
              </div>
              <div v-if="getOnlineStatus(selectedThread)" class="online-indicator"></div>
            </div>
            <div class="contact-info">
              <h3 class="contact-name">{{ getThreadName(selectedThread) }}</h3>
              <p class="contact-status">
                <span v-if="typingUsers.length > 0" class="typing-indicator">
                  {{ getTypingText() }}
                </span>
                <span v-else>{{ getStatusText(selectedThread) }}</span>
              </p>
            </div>
          </div>

          <div class="chat-actions">
            <button class="btn-action" title="Search">
              <i class="fas fa-search"></i>
            </button>
            <button class="btn-action" title="Call">
              <i class="fas fa-phone"></i>
            </button>
            <button class="btn-action" title="Video Call">
              <i class="fas fa-video"></i>
            </button>
            <button class="btn-action" @click="showThreadOptions = true" title="More">
              <i class="fas fa-ellipsis-v"></i>
            </button>
          </div>
        </div>

        <!-- Messages Area -->
        <div class="messages-area" ref="messagesContainer">
          <div v-if="messagesLoading" class="messages-loading">
            <div class="loading-spinner"></div>
          </div>

          <div v-else class="messages-list">
            <!-- Load more button -->
            <button
              v-if="hasMoreMessages"
              @click="loadMoreMessages"
              class="btn-load-more"
              :disabled="loadingMore"
            >
              <i v-if="loadingMore" class="fas fa-spinner fa-spin"></i>
              <span v-else>Load earlier messages</span>
            </button>

            <!-- Date groups -->
            <div v-for="group in groupedMessages" :key="group.date" class="message-group">
              <div class="date-separator">
                <span>{{ formatDate(group.date) }}</span>
              </div>

              <!-- Messages -->
              <div
                v-for="message in group.messages"
                :key="message.id"
                class="message-wrapper"
                :class="{ 'own-message': message.sender_id === currentUserId }"
              >
                <!-- Message bubble -->
                <div class="message-bubble" :class="getMessageClasses(message)">
                  <!-- Reply reference -->
                  <div v-if="message.reply_to" class="message-reply" @click="scrollToMessage(message.reply_to.id)">
                    <div class="reply-line"></div>
                    <div class="reply-content">
                      <span class="reply-sender">{{ message.reply_to.sender?.first_name || 'Unknown' }}</span>
                      <p class="reply-text">{{ message.reply_to.content }}</p>
                    </div>
                  </div>

                  <!-- Message content -->
                  <div class="message-content">
                    <!-- Text message -->
                    <div v-if="message.message_type === 'text'" class="message-text">
                      {{ message.content }}
                    </div>

                    <!-- Image message -->
                    <div v-else-if="message.message_type === 'image'" class="message-image">
                      <img :src="getAttachmentUrl(message.attachments[0])" :alt="message.content" @click="showImageViewer(message.attachments[0])" />
                      <p v-if="message.content" class="image-caption">{{ message.content }}</p>
                    </div>

                    <!-- File message -->
                    <div v-else-if="message.message_type === 'file'" class="message-file">
                      <div class="file-info">
                        <i class="fas fa-file"></i>
                        <div class="file-details">
                          <span class="file-name">{{ message.attachments[0]?.file_name }}</span>
                          <span class="file-size">{{ formatFileSize(message.attachments[0]?.file_size) }}</span>
                        </div>
                      </div>
                      <button class="btn-download" @click="downloadFile(message.attachments[0])">
                        <i class="fas fa-download"></i>
                      </button>
                    </div>

                    <!-- Audio message -->
                    <div v-else-if="message.message_type === 'audio'" class="message-audio">
                      <button class="btn-play-audio" @click="toggleAudio(message)">
                        <i :class="playingAudio === message.id ? 'fas fa-pause' : 'fas fa-play'"></i>
                      </button>
                      <div class="audio-waveform">
                        <div class="waveform-bar" v-for="i in 20" :key="i"></div>
                      </div>
                      <span class="audio-duration">{{ getAudioDuration(message) }}</span>
                    </div>
                  </div>

                  <!-- Message reactions -->
                  <div v-if="message.reactions && message.reactions.length > 0" class="message-reactions">
                    <span
                      v-for="reaction in getUniqueReactions(message.reactions)"
                      :key="reaction.emoji"
                      class="reaction-bubble"
                      @click="toggleReaction(message, reaction.emoji)"
                    >
                      {{ reaction.emoji }} {{ reaction.count }}
                    </span>
                  </div>

                  <!-- Message info -->
                  <div class="message-info">
                    <span class="message-time">{{ formatTime(message.created_at) }}</span>
                    <div v-if="message.sender_id === currentUserId" class="message-status">
                      <i v-if="message.read_at" class="fas fa-check-double read"></i>
                      <i v-else-if="message.delivered_at" class="fas fa-check-double"></i>
                      <i v-else class="fas fa-check"></i>
                    </div>
                  </div>
                </div>

                <!-- Message options -->
                <div class="message-options">
                  <button @click="replyToMessage(message)" class="btn-option" title="Reply">
                    <i class="fas fa-reply"></i>
                  </button>
                  <button @click="showReactions(message)" class="btn-option" title="React">
                    <i class="fas fa-smile"></i>
                  </button>
                  <button @click="forwardMessage(message)" class="btn-option" title="Forward">
                    <i class="fas fa-share"></i>
                  </button>
                  <button v-if="message.sender_id === currentUserId" @click="deleteMessage(message)" class="btn-option" title="Delete">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Message Input -->
        <div class="message-input-area">
          <!-- Reply preview -->
          <div v-if="replyingTo" class="reply-preview">
            <div class="reply-content">
              <span class="reply-sender">Replying to {{ replyingTo.sender?.first_name }}</span>
              <p class="reply-text">{{ replyingTo.content }}</p>
            </div>
            <button @click="cancelReply" class="btn-cancel-reply">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <!-- Input area -->
          <div class="input-container">
            <button @click="showAttachmentOptions = !showAttachmentOptions" class="btn-attach">
              <i class="fas fa-plus"></i>
            </button>

            <div class="text-input-wrapper">
              <textarea
                ref="messageInput"
                v-model="messageText"
                @keydown="handleKeyDown"
                @input="handleTyping"
                placeholder="Type a message..."
                class="message-textarea"
                rows="1"
              ></textarea>
            </div>

            <button
              v-if="messageText.trim() || selectedFiles.length > 0"
              @click="sendMessage"
              :disabled="sending"
              class="btn-send"
            >
              <i v-if="sending" class="fas fa-spinner fa-spin"></i>
              <i v-else class="fas fa-paper-plane"></i>
            </button>

            <button v-else @click="startVoiceRecording" class="btn-voice" :class="{ recording: isRecording }">
              <i class="fas fa-microphone"></i>
            </button>
          </div>

          <!-- Attachment options -->
          <div v-if="showAttachmentOptions" class="attachment-options">
            <input ref="fileInput" type="file" multiple @change="handleFileSelect" style="display: none" />
            <input ref="imageInput" type="file" accept="image/*" multiple @change="handleFileSelect" style="display: none" />

            <button @click="$refs.fileInput.click()" class="attachment-option">
              <i class="fas fa-file"></i>
              <span>Document</span>
            </button>
            <button @click="$refs.imageInput.click()" class="attachment-option">
              <i class="fas fa-image"></i>
              <span>Photo</span>
            </button>
            <button class="attachment-option">
              <i class="fas fa-camera"></i>
              <span>Camera</span>
            </button>
            <button class="attachment-option">
              <i class="fas fa-map-marker-alt"></i>
              <span>Location</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- New Chat Modal -->
    <div v-if="showNewChatModal" class="modal-overlay" @click="showNewChatModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>New Conversation</h3>
          <button @click="showNewChatModal = false" class="btn-close">×</button>
        </div>

        <div class="modal-body">
          <!-- Selected Participants -->
          <div v-if="selectedParticipants.length > 0" class="selected-participants-section">
            <div class="section-header">
              <h4><i class="fas fa-users"></i> Selected Participants</h4>
              <span class="participant-count">{{ selectedParticipants.length }} selected</span>
            </div>
            <div class="selected-participants">
              <div
                v-for="participantId in selectedParticipants"
                :key="participantId"
                class="selected-participant-chip"
              >
                <div class="participant-avatar-sm">
                  {{ getParticipantById(participantId)?.first_name?.[0] }}{{ getParticipantById(participantId)?.last_name?.[0] }}
                </div>
                <span class="participant-name-sm">{{ getParticipantById(participantId)?.first_name }} {{ getParticipantById(participantId)?.last_name }}</span>
                <button @click="removeParticipant(participantId)" class="btn-remove-participant">
                  <i class="fas fa-times"></i>
                </button>
              </div>
            </div>
          </div>

          <!-- Participant Search -->
          <div class="participants-search-section">
            <div class="section-header">
              <h4><i class="fas fa-search"></i> Find Participants</h4>
            </div>
            <div class="participant-search">
              <div class="search-input-wrapper">
                <i class="fas fa-search search-icon"></i>
                <input
                  v-model="participantSearch"
                  @input="searchParticipants"
                  placeholder="Search colleagues, teams, or email addresses..."
                  class="participant-search-input"
                />
                <div class="search-suggestions" v-if="searchSuggestions.length > 0">
                  <div class="suggestion-category" v-for="category in groupedSearchSuggestions" :key="category.type">
                    <div class="category-header">
                      <i :class="category.icon"></i>
                      <span>{{ category.title }}</span>
                    </div>
                    <div
                      v-for="participant in category.items"
                      :key="participant.id"
                      class="suggestion-item"
                      @click="addParticipant(participant)"
                    >
                      <div class="suggestion-avatar">
                        <div class="avatar-circle" :style="{ background: getAvatarGradient(participant.id) }">
                          {{ participant.first_name?.[0] }}{{ participant.last_name?.[0] }}
                        </div>
                        <div v-if="isOnline(participant.id)" class="status-indicator online"></div>
                        <div v-else class="status-indicator offline"></div>
                      </div>
                      <div class="suggestion-info">
                        <div class="suggestion-name">{{ participant.first_name }} {{ participant.last_name }}</div>
                        <div class="suggestion-details">
                          <span class="role">{{ participant.role }}</span>
                          <span class="email">{{ participant.email }}</span>
                        </div>
                      </div>
                      <div class="suggestion-actions">
                        <i v-if="selectedParticipants.includes(participant.id)" class="fas fa-check-circle selected-icon"></i>
                        <i v-else class="fas fa-plus add-icon"></i>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Quick Suggestions -->
          <div v-if="!participantSearch && quickSuggestions.length > 0" class="quick-suggestions-section">
            <div class="section-header">
              <h4><i class="fas fa-bolt"></i> Quick Add</h4>
            </div>
            <div class="quick-suggestions">
              <div
                v-for="participant in quickSuggestions"
                :key="participant.id"
                class="quick-suggestion-item"
                @click="addParticipant(participant)"
              >
                <div class="suggestion-avatar">
                  <div class="avatar-circle" :style="{ background: getAvatarGradient(participant.id) }">
                    {{ participant.first_name?.[0] }}{{ participant.last_name?.[0] }}
                  </div>
                  <div v-if="isOnline(participant.id)" class="status-indicator online"></div>
                  <div v-else class="status-indicator offline"></div>
                </div>
                <div class="suggestion-info">
                  <div class="suggestion-name">{{ participant.first_name }} {{ participant.last_name }}</div>
                  <div class="suggestion-role">{{ participant.role }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button @click="showNewChatModal = false" class="btn btn-secondary">Cancel</button>
          <button @click="createNewThread" :disabled="selectedParticipants.length === 0" class="btn btn-primary">
            Create Chat
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, onMounted, onUnmounted, nextTick, computed, watch } from 'vue'
import { messagingService, webSocketService, formatMessageTime, groupMessagesByDate } from '../services/messaging'

export default {
  name: 'MessagingView',
  setup() {
    // Reactive state
    const loading = ref(true)
    const messagesLoading = ref(false)
    const sending = ref(false)
    const loadingMore = ref(false)
    const hasMoreMessages = ref(true)

    const threads = ref([])
    const selectedThread = ref(null)
    const messages = ref([])
    const messageText = ref('')
    const searchQuery = ref('')
    const selectedFiles = ref([])
    const replyingTo = ref(null)
    const typingUsers = ref([])
    const playingAudio = ref(null)

    // Modals and UI state
    const showNewChatModal = ref(false)
    const showSettings = ref(false)
    const showAttachmentOptions = ref(false)
    const showThreadOptions = ref(false)
    const isRecording = ref(false)

    // New chat modal
    const participantSearch = ref('')
    const availableUsers = ref([])
    const selectedParticipants = ref([])
    const searchSuggestions = ref([])
    const quickSuggestions = ref([])
    const allUsers = ref([])

    // Current user (would come from auth store)
    const currentUserId = ref(1) // Mock user ID

    // Computed
    const filteredThreads = computed(() => {
      if (!searchQuery.value) return threads.value

      return threads.value.filter(thread => {
        const name = getThreadName(thread).toLowerCase()
        const lastMessage = getLastMessage(thread).toLowerCase()
        const query = searchQuery.value.toLowerCase()

        return name.includes(query) || lastMessage.includes(query)
      })
    })

    const groupedMessages = computed(() => {
      return groupMessagesByDate(messages.value)
    })

    // Methods
    const loadThreads = async () => {
      loading.value = true
      try {
        const response = await messagingService.getThreads()
        if (response.success) {
          threads.value = response.data || []
        }
      } catch (error) {
        console.error('Failed to load threads:', error)
      } finally {
        loading.value = false
      }
    }

    const searchMessages = async () => {
      // If search query is empty, just use the computed filteredThreads
      if (!searchQuery.value.trim()) {
        return
      }

      try {
        // Search for messages across all threads
        const response = await messagingService.searchMessages(searchQuery.value)
        if (response.success && response.data) {
          // Update threads with search results or filter existing threads
          // This would need backend implementation to return relevant threads
          console.log('Search results:', response.data)
        }
      } catch (error) {
        console.error('Failed to search messages:', error)
      }
    }

    const selectThread = async (thread) => {
      selectedThread.value = thread
      messagesLoading.value = true
      messages.value = []

      try {
        const response = await messagingService.getMessages(thread.id)
        if (response.success) {
          messages.value = response.data || []
          scrollToBottom()

          // Join WebSocket room for this thread
          webSocketService.joinThread(thread.id)
        }
      } catch (error) {
        console.error('Failed to load messages:', error)
      } finally {
        messagesLoading.value = false
      }
    }

    const sendMessage = async () => {
      if (!messageText.value.trim() && selectedFiles.value.length === 0) return

      sending.value = true
      try {
        const messageData = {
          content: messageText.value.trim(),
          message_type: 'text',
          reply_to_id: replyingTo.value?.id
        }

        const response = await messagingService.sendMessage(selectedThread.value.id, messageData)
        if (response.success) {
          messageText.value = ''
          replyingTo.value = null
          showAttachmentOptions.value = false
          selectedFiles.value = []

          // Message will be added via WebSocket
          scrollToBottom()
        }
      } catch (error) {
        console.error('Failed to send message:', error)
      } finally {
        sending.value = false
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        sendMessage()
      }
    }

    const handleTyping = () => {
      if (selectedThread.value) {
        webSocketService.startTyping(selectedThread.value.id, currentUserId.value)

        // Stop typing after 3 seconds
        clearTimeout(handleTyping.timeout)
        handleTyping.timeout = setTimeout(() => {
          webSocketService.stopTyping(selectedThread.value.id, currentUserId.value)
        }, 3000)
      }
    }

    const scrollToBottom = () => {
      nextTick(() => {
        const container = document.querySelector('.messages-area')
        if (container) {
          container.scrollTop = container.scrollHeight
        }
      })
    }

    const backToThreads = () => {
      selectedThread.value = null
      if (selectedThread.value) {
        webSocketService.leaveThread(selectedThread.value.id)
      }
    }

    // Helper methods
    const getThreadName = (thread) => {
      if (thread.name) return thread.name

      const otherParticipants = thread.participants?.filter(p => p.user_id !== currentUserId.value) || []
      if (otherParticipants.length === 1) {
        const user = otherParticipants[0].user
        return `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Unknown User'
      }

      return `Group (${otherParticipants.length + 1})`
    }

    const getThreadAvatar = (thread) => {
      // Return avatar URL if available
      return null
    }

    const getThreadInitials = (thread) => {
      const name = getThreadName(thread)
      const words = name.split(' ')
      if (words.length >= 2) {
        return `${words[0][0]}${words[1][0]}`.toUpperCase()
      }
      return name.substring(0, 2).toUpperCase()
    }

    const getLastMessage = (thread) => {
      const lastMessage = thread.messages?.[0]
      if (!lastMessage) return 'No messages yet'

      if (lastMessage.message_type === 'text') {
        return lastMessage.content
      }

      return `${lastMessage.message_type.charAt(0).toUpperCase() + lastMessage.message_type.slice(1)}`
    }

    const getUnreadCount = (thread) => {
      // This would come from the backend
      return Math.floor(Math.random() * 5) // Mock unread count
    }

    const getOnlineStatus = (thread) => {
      // Mock online status
      return Math.random() > 0.5
    }

    const formatTime = (timestamp) => {
      return formatMessageTime(timestamp)
    }

    const formatDate = (dateString) => {
      const date = new Date(dateString)
      const today = new Date()

      if (date.toDateString() === today.toDateString()) {
        return 'Today'
      }

      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday'
      }

      return date.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    }

    const searchParticipants = async () => {
      if (!participantSearch.value.trim()) {
        searchSuggestions.value = []
        return
      }

      try {
        const query = participantSearch.value.toLowerCase()
        const filtered = allUsers.value.filter(user =>
          !selectedParticipants.value.includes(user.id) && (
            user.first_name.toLowerCase().includes(query) ||
            user.last_name.toLowerCase().includes(query) ||
            user.email.toLowerCase().includes(query) ||
            user.role.toLowerCase().includes(query) ||
            user.team?.toLowerCase().includes(query)
          )
        )
        searchSuggestions.value = filtered.slice(0, 10)
      } catch (error) {
        console.error('Failed to search participants:', error)
      }
    }

    const addParticipant = (user) => {
      if (!selectedParticipants.value.includes(user.id)) {
        selectedParticipants.value.push(user.id)
        // Remove from search suggestions
        searchSuggestions.value = searchSuggestions.value.filter(p => p.id !== user.id)
        // Clear search if we added from suggestions
        if (participantSearch.value) {
          participantSearch.value = ''
          searchSuggestions.value = []
        }
      }
    }

    const removeParticipant = (userId) => {
      const index = selectedParticipants.value.indexOf(userId)
      if (index > -1) {
        selectedParticipants.value.splice(index, 1)
      }
    }

    const getParticipantById = (id) => {
      return allUsers.value.find(user => user.id === id)
    }

    const getAvatarGradient = (id) => {
      const gradients = [
        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
        'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
        'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
        'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)'
      ]
      return gradients[id % gradients.length]
    }

    const isOnline = (userId) => {
      // Mock online status
      return Math.random() > 0.3
    }

    const createNewThread = async () => {
      if (selectedParticipants.value.length === 0) return

      try {
        const threadData = {
          participant_ids: selectedParticipants.value,
          name: selectedParticipants.value.length > 1 ? 'Group Chat' : null
        }

        const response = await messagingService.createThread(threadData)
        if (response.success) {
          // Close modal and reload threads
          showNewChatModal.value = false
          selectedParticipants.value = []
          participantSearch.value = ''
          searchSuggestions.value = []

          await loadThreads()

          // Select the new thread
          if (response.data) {
            selectThread(response.data)
          }
        }
      } catch (error) {
        console.error('Failed to create thread:', error)
      }
    }

    // WebSocket event handlers
    const handleNewMessage = (message) => {
      if (selectedThread.value && message.thread_id === selectedThread.value.id) {
        messages.value.push(message)
        scrollToBottom()
      }

      // Update thread last message
      const threadIndex = threads.value.findIndex(t => t.id === message.thread_id)
      if (threadIndex !== -1) {
        threads.value[threadIndex].last_message_at = message.created_at
        if (!threads.value[threadIndex].messages) {
          threads.value[threadIndex].messages = []
        }
        threads.value[threadIndex].messages[0] = message
      }
    }

    const handleTypingIndicator = (data) => {
      if (selectedThread.value && data.thread_id === selectedThread.value.id) {
        const userIndex = typingUsers.value.indexOf(data.user_id)

        if (data.is_typing && userIndex === -1) {
          typingUsers.value.push(data.user_id)
        } else if (!data.is_typing && userIndex !== -1) {
          typingUsers.value.splice(userIndex, 1)
        }
      }
    }

    const loadUsers = async () => {
      try {
        // Mock users data - replace with actual API call
        allUsers.value = [
          { id: 2, first_name: 'John', last_name: 'Smith', role: 'Manager', email: 'john@example.com', team: 'Sales' },
          { id: 3, first_name: 'Jane', last_name: 'Doe', role: 'Staff', email: 'jane@example.com', team: 'Marketing' },
          { id: 4, first_name: 'Mike', last_name: 'Johnson', role: 'Support', email: 'mike@example.com', team: 'Support' },
          { id: 5, first_name: 'Sarah', last_name: 'Wilson', role: 'Admin', email: 'sarah@example.com', team: 'IT' },
          { id: 6, first_name: 'David', last_name: 'Brown', role: 'Developer', email: 'david@example.com', team: 'Engineering' },
          { id: 7, first_name: 'Lisa', last_name: 'Garcia', role: 'Designer', email: 'lisa@example.com', team: 'Design' },
          { id: 8, first_name: 'Tom', last_name: 'Miller', role: 'Analyst', email: 'tom@example.com', team: 'Analytics' },
          { id: 9, first_name: 'Emma', last_name: 'Davis', role: 'Coordinator', email: 'emma@example.com', team: 'Operations' }
        ]

        // Set quick suggestions (recently contacted or frequently messaged)
        quickSuggestions.value = allUsers.value.slice(0, 4)
      } catch (error) {
        console.error('Failed to load users:', error)
      }
    }

    // Lifecycle
    onMounted(async () => {
      await loadThreads()
      await loadUsers()

      // Initialize WebSocket
      webSocketService.connect(currentUserId.value, 1) // Mock org ID

      // Set up WebSocket listeners
      webSocketService.on('message_received', handleNewMessage)
      webSocketService.on('typing_changed', handleTypingIndicator)
    })

    onUnmounted(() => {
      webSocketService.disconnect()
    })

    return {
      // State
      loading,
      messagesLoading,
      sending,
      loadingMore,
      hasMoreMessages,
      threads,
      selectedThread,
      messages,
      messageText,
      searchQuery,
      selectedFiles,
      replyingTo,
      typingUsers,
      playingAudio,
      showNewChatModal,
      showSettings,
      showAttachmentOptions,
      showThreadOptions,
      isRecording,
      participantSearch,
      availableUsers,
      selectedParticipants,
      searchSuggestions,
      quickSuggestions,
      currentUserId,

      // Computed
      filteredThreads,
      groupedMessages,
      groupedSearchSuggestions: computed(() => {
        if (!searchSuggestions.value.length) return []

        const colleagues = searchSuggestions.value.filter(p => p.role !== 'Admin')
        const admins = searchSuggestions.value.filter(p => p.role === 'Admin')

        const groups = []
        if (colleagues.length > 0) {
          groups.push({
            type: 'colleagues',
            title: 'Colleagues',
            icon: 'fas fa-users',
            items: colleagues
          })
        }
        if (admins.length > 0) {
          groups.push({
            type: 'admins',
            title: 'Administrators',
            icon: 'fas fa-user-shield',
            items: admins
          })
        }
        return groups
      }),

      // Methods
      loadThreads,
      selectThread,
      sendMessage,
      handleKeyDown,
      handleTyping,
      scrollToBottom,
      backToThreads,
      searchMessages,
      searchParticipants,
      addParticipant,
      removeParticipant,
      getParticipantById,
      getAvatarGradient,
      isOnline,
      createNewThread,
      getThreadName,
      getThreadAvatar,
      getThreadInitials,
      getLastMessage,
      getUnreadCount,
      getOnlineStatus,
      formatTime,
      formatDate
    }
  }
}
</script>

<style scoped>
.messaging-container {
  display: flex;
  height: calc(100vh - 80px);
  background: var(--bg-primary);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: var(--shadow-md);
}

/* Sidebar */
.messaging-sidebar {
  width: 350px;
  background: var(--card-bg);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
}

.sidebar-header {
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.user-avatar {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.user-details h3 {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.online-status {
  font-size: 0.8rem;
  color: #10b981;
  font-weight: 500;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-new-chat,
.btn-settings {
  width: 36px;
  height: 36px;
  border: none;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-new-chat:hover,
.btn-settings:hover {
  background: var(--primary);
  color: white;
}

/* Search */
.search-section {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.search-box {
  position: relative;
}

.search-box i {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-secondary);
}

.search-input {
  width: 100%;
  padding: 0.75rem 0.75rem 0.75rem 2.5rem;
  border: 1px solid var(--border-color);
  border-radius: 20px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.9rem;
  outline: none;
  transition: all 0.2s ease;
}

.search-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-light);
}

/* Threads List */
.threads-list {
  flex: 1;
  overflow-y: auto;
}

.loading-threads {
  padding: 1rem;
}

.thread-skeleton {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 0;
}

.skeleton-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: var(--skeleton-color);
  animation: skeleton-loading 1.5s infinite;
}

.skeleton-content {
  flex: 1;
}

.skeleton-line {
  height: 12px;
  background: var(--skeleton-color);
  border-radius: 6px;
  margin-bottom: 0.5rem;
  animation: skeleton-loading 1.5s infinite;
}

.skeleton-line.short {
  width: 60%;
}

@keyframes skeleton-loading {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.empty-threads {
  padding: 2rem;
  text-align: center;
  color: var(--text-secondary);
}

.empty-threads i {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.thread-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  cursor: pointer;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
}

.thread-item:hover {
  background: var(--bg-secondary);
}

.thread-item.active {
  background: var(--primary-light);
  border-right: 3px solid var(--primary);
}

.thread-avatar {
  position: relative;
  flex-shrink: 0;
}

.thread-avatar img,
.avatar-placeholder {
  width: 50px;
  height: 50px;
  border-radius: 50%;
}

.avatar-placeholder {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
}

.online-indicator {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 16px;
  height: 16px;
  background: #10b981;
  border-radius: 50%;
  border: 3px solid var(--card-bg);
}

.thread-info {
  flex: 1;
  min-width: 0;
}

.thread-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
}

.thread-name {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.thread-time {
  font-size: 0.75rem;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.thread-preview {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.last-message {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.thread-badges {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.unread-badge {
  background: var(--primary);
  color: white;
  border-radius: 10px;
  padding: 0.2rem 0.5rem;
  font-size: 0.7rem;
  font-weight: 600;
  min-width: 20px;
  text-align: center;
}

.muted-icon {
  color: var(--text-secondary);
  font-size: 0.8rem;
}

/* Chat Area */
.chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
}

.no-chat-selected {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.welcome-message {
  text-align: center;
  color: var(--text-secondary);
}

.welcome-message i {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.3;
}

.welcome-message h2 {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
}

.active-chat {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* Chat Header */
.chat-header {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  gap: 1rem;
  background: var(--card-bg);
}

.btn-back {
  display: none;
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  color: var(--text-primary);
  border-radius: 50%;
  cursor: pointer;
}

.chat-contact {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
}

.contact-avatar {
  position: relative;
}

.contact-avatar img,
.contact-avatar .avatar-placeholder {
  width: 40px;
  height: 40px;
  border-radius: 50%;
}

.contact-avatar .avatar-placeholder {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 0.9rem;
}

.contact-name {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 0.2rem 0;
}

.contact-status {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin: 0;
}

.typing-indicator {
  color: var(--primary);
  font-style: italic;
}

.chat-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-action {
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-action:hover {
  background: var(--bg-secondary);
  color: var(--primary);
}

/* Messages Area */
.messages-area {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  background-image:
    radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0);
  background-size: 20px 20px;
}

.messages-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.loading-spinner {
  width: 30px;
  height: 30px;
  border: 3px solid var(--border-color);
  border-top: 3px solid var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.btn-load-more {
  display: block;
  margin: 1rem auto;
  padding: 0.5rem 1rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-load-more:hover {
  background: var(--primary-light);
}

/* Message Groups */
.message-group {
  margin-bottom: 1.5rem;
}

.date-separator {
  text-align: center;
  margin: 1.5rem 0;
}

.date-separator span {
  background: var(--bg-secondary);
  padding: 0.5rem 1rem;
  border-radius: 16px;
  color: var(--text-secondary);
  font-size: 0.8rem;
  font-weight: 500;
}

/* Messages */
.message-wrapper {
  display: flex;
  margin-bottom: 0.5rem;
  padding: 0 0.5rem;
  position: relative;
}

.message-wrapper.own-message {
  justify-content: flex-end;
}

.message-wrapper.own-message .message-bubble {
  background: var(--primary);
  color: white;
  border-bottom-right-radius: 4px;
}

.message-bubble {
  max-width: 70%;
  background: white;
  border-radius: 18px;
  border-bottom-left-radius: 4px;
  padding: 0.75rem 1rem;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  position: relative;
}

.message-reply {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  border-left: 4px solid var(--primary);
  cursor: pointer;
}

.reply-sender {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--primary);
}

.reply-text {
  font-size: 0.85rem;
  margin: 0.2rem 0 0 0;
  opacity: 0.8;
}

.message-content {
  word-wrap: break-word;
}

.message-text {
  line-height: 1.4;
}

.message-image img {
  max-width: 200px;
  border-radius: 8px;
  cursor: pointer;
}

.image-caption {
  margin-top: 0.5rem;
  font-size: 0.9rem;
}

.message-file {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 8px;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
}

.file-details {
  display: flex;
  flex-direction: column;
}

.file-name {
  font-weight: 500;
  font-size: 0.9rem;
}

.file-size {
  font-size: 0.8rem;
  opacity: 0.7;
}

.message-audio {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem;
}

.btn-play-audio {
  width: 36px;
  height: 36px;
  border: none;
  background: var(--primary);
  color: white;
  border-radius: 50%;
  cursor: pointer;
}

.audio-waveform {
  display: flex;
  gap: 2px;
  flex: 1;
}

.waveform-bar {
  width: 3px;
  height: 20px;
  background: var(--primary);
  border-radius: 2px;
  opacity: 0.3;
}

.message-reactions {
  display: flex;
  gap: 0.25rem;
  margin-top: 0.5rem;
}

.reaction-bubble {
  background: rgba(0, 0, 0, 0.1);
  padding: 0.2rem 0.5rem;
  border-radius: 12px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.reaction-bubble:hover {
  background: rgba(0, 0, 0, 0.2);
}

.message-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.25rem;
  justify-content: flex-end;
}

.message-time {
  font-size: 0.7rem;
  opacity: 0.6;
}

.message-status i {
  font-size: 0.8rem;
  opacity: 0.6;
}

.message-status i.read {
  color: var(--primary);
  opacity: 1;
}

.message-options {
  display: flex;
  gap: 0.25rem;
  position: absolute;
  top: -12px;
  right: 1rem;
  background: white;
  padding: 0.25rem;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  opacity: 0;
  transform: scale(0.8);
  transition: all 0.2s ease;
}

.message-wrapper:hover .message-options {
  opacity: 1;
  transform: scale(1);
}

.btn-option {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  border-radius: 50%;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.2s ease;
}

.btn-option:hover {
  background: var(--bg-secondary);
  color: var(--primary);
}

/* Message Input */
.message-input-area {
  background: var(--card-bg);
  border-top: 1px solid var(--border-color);
  position: relative;
}

.reply-preview {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
}

.reply-preview .reply-content {
  flex: 1;
}

.reply-preview .reply-sender {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--primary);
}

.reply-preview .reply-text {
  font-size: 0.85rem;
  margin: 0.2rem 0 0 0;
  opacity: 0.8;
}

.btn-cancel-reply {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  border-radius: 50%;
  cursor: pointer;
}

.input-container {
  display: flex;
  align-items: flex-end;
  gap: 0.75rem;
  padding: 1rem;
}

.btn-attach {
  width: 40px;
  height: 40px;
  border: none;
  background: var(--primary);
  color: white;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.btn-attach:hover {
  transform: scale(1.1);
}

.text-input-wrapper {
  flex: 1;
  position: relative;
}

.message-textarea {
  width: 100%;
  min-height: 40px;
  max-height: 120px;
  padding: 0.75rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 20px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.9rem;
  resize: none;
  outline: none;
  font-family: inherit;
  line-height: 1.4;
}

.message-textarea:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-light);
}

.btn-send,
.btn-voice {
  width: 40px;
  height: 40px;
  border: none;
  background: var(--primary);
  color: white;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.btn-voice.recording {
  background: #ef4444;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.attachment-options {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  border-top: 1px solid var(--border-color);
  background: var(--bg-secondary);
}

.attachment-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  border: none;
  background: transparent;
  color: var(--text-primary);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.attachment-option:hover {
  background: var(--primary-light);
}

.attachment-option i {
  font-size: 1.2rem;
  color: var(--primary);
}

.attachment-option span {
  font-size: 0.8rem;
}

/* New Chat Modal Enhanced Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease;
}

.modal-content {
  background: var(--card-bg);
  border-radius: 16px;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { transform: translateY(30px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.modal-header {
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  color: white;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.3rem;
  font-weight: 600;
}

.btn-close {
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border-radius: 50%;
  cursor: pointer;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.btn-close:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

.modal-body {
  padding: 0;
  max-height: 60vh;
  overflow-y: auto;
}

/* Selected Participants Section */
.selected-participants-section {
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-secondary);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.section-header h4 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.section-header h4 i {
  color: var(--primary);
}

.participant-count {
  background: var(--primary);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
}

.selected-participants {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.selected-participant-chip {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  padding: 0.5rem 0.75rem;
  transition: all 0.2s ease;
  animation: chipSlideIn 0.3s ease;
}

@keyframes chipSlideIn {
  from { transform: scale(0.8); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.selected-participant-chip:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.participant-avatar-sm {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 0.8rem;
  font-weight: 600;
  flex-shrink: 0;
}

.participant-name-sm {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-primary);
}

.btn-remove-participant {
  width: 20px;
  height: 20px;
  border: none;
  background: var(--danger);
  color: white;
  border-radius: 50%;
  cursor: pointer;
  font-size: 0.7rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.btn-remove-participant:hover {
  background: var(--danger-dark);
  transform: scale(1.1);
}

/* Participant Search Section */
.participants-search-section {
  padding: 1.5rem;
}

.participant-search {
  position: relative;
}

.search-input-wrapper {
  position: relative;
}

.search-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-secondary);
  z-index: 2;
}

.participant-search-input {
  width: 100%;
  padding: 1rem 1rem 1rem 3rem;
  border: 2px solid var(--border-color);
  border-radius: 12px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 1rem;
  outline: none;
  transition: all 0.3s ease;
}

.participant-search-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 4px var(--primary-light);
  transform: translateY(-2px);
}

.search-suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  margin-top: 0.5rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  z-index: 10;
  max-height: 300px;
  overflow-y: auto;
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from { transform: translateY(-10px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.suggestion-category {
  border-bottom: 1px solid var(--border-color);
}

.suggestion-category:last-child {
  border-bottom: none;
}

.category-header {
  padding: 0.75rem 1rem;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.category-header i {
  color: var(--primary);
}

.suggestion-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.suggestion-item:last-child {
  border-bottom: none;
}

.suggestion-item:hover {
  background: var(--primary-light);
  transform: translateX(4px);
}

.suggestion-avatar {
  position: relative;
  flex-shrink: 0;
}

.avatar-circle {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.status-indicator {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid var(--card-bg);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.status-indicator.online {
  background: #10b981;
}

.status-indicator.offline {
  background: #6b7280;
}

.suggestion-info {
  flex: 1;
  min-width: 0;
}

.suggestion-name {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
}

.suggestion-details {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.85rem;
}

.suggestion-details .role {
  color: var(--primary);
  font-weight: 500;
  background: var(--primary-light);
  padding: 0.2rem 0.5rem;
  border-radius: 8px;
}

.suggestion-details .email {
  color: var(--text-secondary);
}

.suggestion-actions {
  flex-shrink: 0;
}

.selected-icon {
  color: var(--success);
  font-size: 1.2rem;
}

.add-icon {
  color: var(--text-secondary);
  font-size: 1rem;
  transition: all 0.2s ease;
}

.suggestion-item:hover .add-icon {
  color: var(--primary);
  transform: scale(1.2);
}

/* Quick Suggestions Section */
.quick-suggestions-section {
  padding: 1.5rem;
  border-top: 1px solid var(--border-color);
  background: var(--bg-primary);
}

.quick-suggestions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.quick-suggestion-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.quick-suggestion-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
  border-color: var(--primary);
}

.quick-suggestion-item .suggestion-info {
  flex: 1;
}

.suggestion-role {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-top: 0.2rem;
}

.modal-footer {
  padding: 1.5rem;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  background: var(--bg-secondary);
}

.modal-footer .btn {
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.modal-footer .btn-secondary {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
}

.modal-footer .btn-secondary:hover {
  background: var(--bg-tertiary);
}

.modal-footer .btn-primary {
  background: var(--primary);
  border: 1px solid var(--primary);
  color: white;
}

.modal-footer .btn-primary:hover {
  background: var(--primary-dark);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.modal-footer .btn-primary:disabled {
  background: var(--text-secondary);
  border-color: var(--text-secondary);
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* Mobile Styles */
@media (max-width: 768px) {
  .messaging-container {
    height: calc(100vh - 60px);
  }

  .messaging-sidebar {
    position: absolute;
    z-index: 10;
    height: 100%;
    transform: translateX(0);
  }

  .messaging-sidebar.mobile-hidden {
    transform: translateX(-100%);
  }

  .chat-area.mobile-visible {
    width: 100%;
  }

  .mobile-only {
    display: flex !important;
  }

  .btn-back {
    display: flex;
  }

  .message-bubble {
    max-width: 85%;
  }

  .message-options {
    position: static;
    margin-top: 0.5rem;
    opacity: 1;
    transform: scale(1);
    justify-content: center;
  }

  /* Mobile Modal Styles */
  .modal-content {
    width: 95%;
    max-height: 90vh;
    margin: 1rem;
  }

  .selected-participants {
    flex-direction: column;
    gap: 0.5rem;
  }

  .selected-participant-chip {
    width: 100%;
    justify-content: space-between;
  }

  .quick-suggestions {
    grid-template-columns: 1fr;
  }

  .suggestion-details {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }

  .modal-footer {
    flex-direction: column;
    gap: 0.75rem;
  }

  .modal-footer .btn {
    width: 100%;
    padding: 1rem;
  }
}
</style>