<template>
  <TransitionRoot as="template" :show="show">
    <DialogModal as="div" class="relative z-50" @close="close">
      <div class="fixed inset-0 overflow-hidden">
        <div class="absolute inset-0 overflow-hidden">
          <div class="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
            <TransitionChild
              as="template"
              enter="transform transition ease-in-out duration-300"
              enter-from="translate-x-full"
              enter-to="translate-x-0"
              leave="transform transition ease-in-out duration-300"
              leave-from="translate-x-0"
              leave-to="translate-x-full"
            >
              <DialogPanel class="pointer-events-auto w-screen max-w-md">
                <div class="chat-sidebar">
                  <!-- Header -->
                  <div class="sidebar-header">
                    <div class="header-info">
                      <h3>Call Chat</h3>
                      <span class="participant-count">{{ participants.length }} participants</span>
                    </div>
                    <button @click="close" class="close-btn">
                      <XMarkIcon class="h-5 w-5" />
                    </button>
                  </div>

                  <!-- Messages -->
                  <div class="messages-container" ref="messagesContainer">
                    <div v-if="messages.length === 0" class="no-messages">
                      <ChatBubbleLeftEllipsisIcon class="h-12 w-12 text-gray-300" />
                      <p class="no-messages-text">No messages yet</p>
                      <span class="no-messages-subtitle">Start the conversation</span>
                    </div>

                    <div v-for="message in messages" :key="message.id" class="message-item">
                      <div class="message-avatar">
                        <img
                          v-if="message.sender_avatar"
                          :src="message.sender_avatar"
                          :alt="message.sender"
                          class="avatar-img"
                        />
                        <div v-else class="avatar-placeholder">
                          {{ getInitials(message.sender) }}
                        </div>
                      </div>
                      <div class="message-content">
                        <div class="message-header">
                          <span class="sender-name">{{ message.sender }}</span>
                          <span class="message-time">{{ formatTime(message.timestamp) }}</span>
                        </div>
                        <div class="message-text">{{ message.message }}</div>
                      </div>
                    </div>

                    <!-- Typing indicator -->
                    <div v-if="showTyping" class="typing-indicator">
                      <div class="typing-dots">
                        <div class="dot"></div>
                        <div class="dot"></div>
                        <div class="dot"></div>
                      </div>
                      <span class="typing-text">Someone is typing...</span>
                    </div>
                  </div>

                  <!-- Input -->
                  <div class="input-container">
                    <div class="input-area">
                      <textarea
                        v-model="newMessage"
                        @keydown="handleKeyDown"
                        @input="handleTyping"
                        placeholder="Type a message..."
                        class="message-input"
                        rows="1"
                        ref="messageInput"
                      ></textarea>
                      <button
                        @click="sendMessage"
                        :disabled="!newMessage.trim()"
                        class="send-btn"
                        title="Send"
                      >
                        <PaperAirplaneIcon class="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  <!-- Quick Actions -->
                  <div class="quick-actions">
                    <button @click="shareFile" class="quick-action" title="Share File">
                      <DocumentIcon class="h-4 w-4" />
                      <span>Share File</span>
                    </button>
                    <button @click="shareScreen" class="quick-action" title="Share Screen">
                      <ComputerDesktopIcon class="h-4 w-4" />
                      <span>Share Screen</span>
                    </button>
                    <button @click="takeNote" class="quick-action" title="Take Note">
                      <PencilSquareIcon class="h-4 w-4" />
                      <span>Take Note</span>
                    </button>
                  </div>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </div>
    </DialogModal>
  </TransitionRoot>
</template>

<script>
import { ref, watch, nextTick, onMounted } from 'vue'
import {
  Dialog,
  DialogPanel,
  TransitionChild,
  TransitionRoot
} from '@headlessui/vue'
import {
  XMarkIcon,
  ChatBubbleLeftEllipsisIcon,
  PaperAirplaneIcon,
  DocumentIcon,
  ComputerDesktopIcon,
  PencilSquareIcon
} from '@heroicons/vue/24/outline'

export default {
  name: 'CallChatSidebar',
  components: {
    DialogModal: Dialog,
    DialogPanel,
    TransitionChild,
    TransitionRoot,
    XMarkIcon,
    ChatBubbleLeftEllipsisIcon,
    PaperAirplaneIcon,
    DocumentIcon,
    ComputerDesktopIcon,
    PencilSquareIcon
  },
  props: {
    show: {
      type: Boolean,
      default: false
    },
    messages: {
      type: Array,
      default: () => []
    },
    participants: {
      type: Array,
      default: () => []
    }
  },
  emits: ['close', 'send-message'],
  setup(props, { emit }) {
    const newMessage = ref('')
    const showTyping = ref(false)
    const messagesContainer = ref(null)
    const messageInput = ref(null)

    let typingTimer = null

    const close = () => {
      emit('close')
    }

    const sendMessage = () => {
      if (!newMessage.value.trim()) return

      emit('send-message', newMessage.value.trim())
      newMessage.value = ''

      nextTick(() => {
        scrollToBottom()
      })
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        sendMessage()
      }
    }

    const handleTyping = () => {
      // Simple typing indicator logic
      if (!showTyping.value) {
        showTyping.value = true
      }

      clearTimeout(typingTimer)
      typingTimer = setTimeout(() => {
        showTyping.value = false
      }, 2000)
    }

    const scrollToBottom = () => {
      if (messagesContainer.value) {
        messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
      }
    }

    const getInitials = (name) => {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }

    const formatTime = (timestamp) => {
      const date = new Date(timestamp)
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    // Quick actions
    const shareFile = () => {
      console.log('Share file from call chat')
      // Implementation for file sharing
    }

    const shareScreen = () => {
      console.log('Share screen from call chat')
      // Implementation for screen sharing
    }

    const takeNote = () => {
      console.log('Take note from call chat')
      // Implementation for note taking
    }

    // Auto-scroll when new messages arrive
    watch(
      () => props.messages.length,
      () => {
        nextTick(() => {
          scrollToBottom()
        })
      }
    )

    // Focus input when sidebar opens
    watch(
      () => props.show,
      (newShow) => {
        if (newShow) {
          nextTick(() => {
            messageInput.value?.focus()
            scrollToBottom()
          })
        }
      }
    )

    onMounted(() => {
      scrollToBottom()
    })

    return {
      newMessage,
      showTyping,
      messagesContainer,
      messageInput,
      close,
      sendMessage,
      handleKeyDown,
      handleTyping,
      getInitials,
      formatTime,
      shareFile,
      shareScreen,
      takeNote
    }
  }
}
</script>

<style scoped>
.chat-sidebar {
  @apply h-full flex flex-col bg-white shadow-xl;
}

.sidebar-header {
  @apply flex items-center justify-between p-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white;
}

.header-info h3 {
  @apply text-lg font-semibold;
}

.participant-count {
  @apply text-sm opacity-90;
}

.close-btn {
  @apply p-2 rounded-lg hover:bg-white hover:bg-opacity-20 transition-all duration-200;
}

.messages-container {
  @apply flex-1 overflow-y-auto p-4 space-y-4;
}

.no-messages {
  @apply flex flex-col items-center justify-center h-full text-center py-12;
}

.no-messages-text {
  @apply text-lg font-medium text-gray-500 mt-4 mb-2;
}

.no-messages-subtitle {
  @apply text-sm text-gray-400;
}

.message-item {
  @apply flex gap-3;
}

.message-avatar {
  @apply w-8 h-8 flex-shrink-0;
}

.avatar-img {
  @apply w-full h-full rounded-full object-cover;
}

.avatar-placeholder {
  @apply w-full h-full rounded-full bg-gray-300 flex items-center justify-center
         text-xs font-medium text-gray-600;
}

.message-content {
  @apply flex-1 min-w-0;
}

.message-header {
  @apply flex items-center gap-2 mb-1;
}

.sender-name {
  @apply text-sm font-semibold text-gray-900;
}

.message-time {
  @apply text-xs text-gray-500;
}

.message-text {
  @apply text-sm text-gray-800 whitespace-pre-wrap break-words;
}

.typing-indicator {
  @apply flex items-center gap-2 opacity-70;
}

.typing-dots {
  @apply flex gap-1;
}

.typing-dots .dot {
  @apply w-2 h-2 bg-gray-400 rounded-full;
  animation: typing-bounce 1.4s infinite ease-in-out;
}

.typing-dots .dot:nth-child(1) { animation-delay: -0.32s; }
.typing-dots .dot:nth-child(2) { animation-delay: -0.16s; }

@keyframes typing-bounce {
  0%, 80%, 100% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.typing-text {
  @apply text-sm text-gray-500;
}

.input-container {
  @apply border-t border-gray-200 bg-white p-4;
}

.input-area {
  @apply flex items-end gap-2;
}

.message-input {
  @apply flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm
         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
         resize-none max-h-32;
}

.send-btn {
  @apply p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700
         disabled:opacity-50 disabled:cursor-not-allowed
         transition-all duration-200;
}

.quick-actions {
  @apply flex flex-col gap-2 p-4 border-t border-gray-100 bg-gray-50;
}

.quick-action {
  @apply flex items-center gap-3 p-3 text-left text-sm text-gray-700
         hover:bg-gray-100 rounded-lg transition-colors duration-200;
}

.quick-action:hover {
  @apply text-gray-900;
}

/* Dark theme support */
[data-theme="dark"] .chat-sidebar {
  @apply bg-gray-800;
}

[data-theme="dark"] .messages-container {
  @apply bg-gray-800;
}

[data-theme="dark"] .message-text {
  @apply text-gray-200;
}

[data-theme="dark"] .sender-name {
  @apply text-gray-100;
}

[data-theme="dark"] .input-container {
  @apply bg-gray-800 border-gray-600;
}

[data-theme="dark"] .message-input {
  @apply bg-gray-700 border-gray-600 text-gray-100;
}

[data-theme="dark"] .quick-actions {
  @apply bg-gray-700 border-gray-600;
}

[data-theme="dark"] .quick-action {
  @apply text-gray-300 hover:bg-gray-600 hover:text-gray-100;
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .chat-sidebar {
    @apply max-w-full;
  }
}
</style>