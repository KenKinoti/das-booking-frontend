<template>
  <BaseModal :show="show" @close="$emit('close')" max-width="600px">
    <template #header>
      <div class="modal-header">
        <h3 class="modal-title">
          <i class="fas fa-plus-circle"></i>
          New Conversation
        </h3>
      </div>
    </template>

    <template #body>
      <div class="new-conversation-form">
        <!-- Conversation Type -->
        <div class="form-section">
          <label class="form-label">Conversation Type</label>
          <div class="type-selector">
            <div
              class="type-option"
              :class="{ active: selectedType === 'direct' }"
              @click="selectedType = 'direct'"
            >
              <i class="fas fa-user"></i>
              <div class="type-details">
                <div class="type-title">Direct Message</div>
                <div class="type-subtitle">Private conversation with one person</div>
              </div>
            </div>
            <div
              class="type-option"
              :class="{ active: selectedType === 'group' }"
              @click="selectedType = 'group'"
            >
              <i class="fas fa-users"></i>
              <div class="type-details">
                <div class="type-title">Group Chat</div>
                <div class="type-subtitle">Conversation with multiple people</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Participants Selection -->
        <div class="form-section">
          <label class="form-label">
            {{ selectedType === 'direct' ? 'Select Contact' : 'Add Participants' }}
            <span class="required">*</span>
          </label>

          <!-- Search Input -->
          <div class="search-container">
            <div class="search-box">
              <i class="fas fa-search"></i>
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Search contacts..."
                class="search-input"
                @input="searchContacts"
              >
            </div>
          </div>

          <!-- Selected Participants -->
          <div v-if="selectedParticipants.length > 0" class="selected-participants">
            <div class="participants-label">Selected:</div>
            <div class="participant-chips">
              <div
                v-for="participant in selectedParticipants"
                :key="participant.id"
                class="participant-chip"
              >
                <div class="participant-avatar">
                  <img v-if="participant.avatar" :src="participant.avatar" :alt="participant.name">
                  <div v-else class="avatar-placeholder">{{ getInitials(participant.name) }}</div>
                </div>
                <span class="participant-name">{{ participant.name }}</span>
                <button class="remove-participant" @click="removeParticipant(participant)">
                  <i class="fas fa-times"></i>
                </button>
              </div>
            </div>
          </div>

          <!-- Contact List -->
          <div class="contacts-list">
            <div v-if="isSearching" class="loading-state">
              <div class="spinner"></div>
              <span>Searching contacts...</span>
            </div>

            <div v-else-if="filteredContacts.length === 0" class="empty-state">
              <i class="fas fa-user-slash"></i>
              <p>No contacts found</p>
            </div>

            <div v-else class="contact-items">
              <div
                v-for="contact in filteredContacts"
                :key="contact.id"
                class="contact-item"
                :class="{ selected: isParticipantSelected(contact) }"
                @click="toggleParticipant(contact)"
              >
                <div class="contact-avatar">
                  <img v-if="contact.avatar" :src="contact.avatar" :alt="contact.name">
                  <div v-else class="avatar-placeholder">{{ getInitials(contact.name) }}</div>
                  <div v-if="contact.status === 'online'" class="online-indicator"></div>
                </div>
                <div class="contact-info">
                  <div class="contact-name">{{ contact.name }}</div>
                  <div class="contact-detail">{{ contact.email }}</div>
                </div>
                <div class="contact-status">
                  <span class="status-indicator" :class="contact.status">{{ contact.status }}</span>
                </div>
                <div class="selection-indicator">
                  <i class="fas fa-check" v-if="isParticipantSelected(contact)"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Group Settings (only for group chats) -->
        <div v-if="selectedType === 'group'" class="form-section">
          <label class="form-label" for="groupName">
            Group Name
            <span class="required">*</span>
          </label>
          <input
            id="groupName"
            v-model="groupName"
            type="text"
            class="form-input"
            placeholder="Enter group name..."
            maxlength="50"
          >
          <div class="input-help">
            {{ groupName.length }}/50 characters
          </div>
        </div>

        <!-- Initial Message (optional) -->
        <div class="form-section">
          <label class="form-label" for="initialMessage">Initial Message (Optional)</label>
          <textarea
            id="initialMessage"
            v-model="initialMessage"
            class="form-textarea"
            placeholder="Type a message to start the conversation..."
            rows="3"
            maxlength="500"
          ></textarea>
          <div class="input-help">
            {{ initialMessage.length }}/500 characters
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="modal-actions">
        <button class="btn btn-secondary" @click="$emit('close')">
          Cancel
        </button>
        <button
          class="btn btn-primary"
          @click="createConversation"
          :disabled="!canCreateConversation"
        >
          <i class="fas fa-plus"></i>
          {{ selectedType === 'direct' ? 'Start Chat' : 'Create Group' }}
        </button>
      </div>
    </template>
  </BaseModal>
</template>

<script>
import BaseModal from '../BaseModal.vue'
import { useCommunicationStore } from '../../stores/communication'

export default {
  name: 'NewConversationModal',
  components: {
    BaseModal
  },
  props: {
    show: {
      type: Boolean,
      default: false
    }
  },
  emits: ['close', 'conversation-created'],
  data() {
    return {
      selectedType: 'direct',
      searchQuery: '',
      selectedParticipants: [],
      groupName: '',
      initialMessage: '',
      isSearching: false,
      availableContacts: []
    }
  },
  computed: {
    communicationStore() {
      return useCommunicationStore()
    },
    filteredContacts() {
      if (!this.searchQuery.trim()) {
        return this.availableContacts
      }

      const query = this.searchQuery.toLowerCase()
      return this.availableContacts.filter(contact =>
        contact.name.toLowerCase().includes(query) ||
        contact.email.toLowerCase().includes(query)
      )
    },
    canCreateConversation() {
      if (this.selectedType === 'direct') {
        return this.selectedParticipants.length === 1
      } else {
        return this.selectedParticipants.length >= 2 && this.groupName.trim().length > 0
      }
    }
  },
  watch: {
    show(newVal) {
      if (newVal) {
        this.loadContacts()
        this.resetForm()
      }
    },
    selectedType() {
      this.selectedParticipants = []
    }
  },
  methods: {
    async loadContacts() {
      // Use contacts from communication store
      this.availableContacts = this.communicationStore.contacts || []
    },

    searchContacts() {
      this.isSearching = true
      // Simulate search delay
      setTimeout(() => {
        this.isSearching = false
      }, 300)
    },

    toggleParticipant(contact) {
      if (this.selectedType === 'direct') {
        // For direct messages, only allow one participant
        this.selectedParticipants = [contact]
      } else {
        // For group chats, toggle participant
        const index = this.selectedParticipants.findIndex(p => p.id === contact.id)
        if (index > -1) {
          this.selectedParticipants.splice(index, 1)
        } else {
          this.selectedParticipants.push(contact)
        }
      }
    },

    isParticipantSelected(contact) {
      return this.selectedParticipants.some(p => p.id === contact.id)
    },

    removeParticipant(participant) {
      const index = this.selectedParticipants.findIndex(p => p.id === participant.id)
      if (index > -1) {
        this.selectedParticipants.splice(index, 1)
      }
    },

    getInitials(name) {
      return name
        .split(' ')
        .map(word => word.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2)
    },

    async createConversation() {
      if (!this.canCreateConversation) return

      try {
        const conversationData = {
          type: this.selectedType,
          participants: this.selectedParticipants,
          name: this.selectedType === 'group' ? this.groupName : null,
          initialMessage: this.initialMessage.trim() || null
        }

        // Emit event with conversation data
        this.$emit('conversation-created', conversationData)

        // Close modal
        this.$emit('close')

        // Reset form
        this.resetForm()

      } catch (error) {
        console.error('Failed to create conversation:', error)
        // Handle error (show notification, etc.)
      }
    },

    resetForm() {
      this.selectedType = 'direct'
      this.searchQuery = ''
      this.selectedParticipants = []
      this.groupName = ''
      this.initialMessage = ''
    }
  }
}
</script>

<style scoped>
.modal-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.new-conversation-form {
  padding: 8px 0;
}

.form-section {
  margin-bottom: 24px;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
}

.required {
  color: #dc2626;
}

/* Type Selector */
.type-selector {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.type-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.type-option:hover {
  border-color: #d1d5db;
  background: #f9fafb;
}

.type-option.active {
  border-color: #3b82f6;
  background: #eff6ff;
}

.type-option i {
  font-size: 20px;
  color: #6b7280;
  width: 24px;
  text-align: center;
}

.type-option.active i {
  color: #3b82f6;
}

.type-details {
  flex: 1;
}

.type-title {
  font-weight: 600;
  color: #111827;
  font-size: 14px;
  line-height: 1.3;
}

.type-subtitle {
  font-size: 12px;
  color: #6b7280;
  line-height: 1.4;
  margin-top: 2px;
}

/* Search */
.search-container {
  margin-bottom: 16px;
}

.search-box {
  display: flex;
  align-items: center;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 0 12px;
  height: 40px;
}

.search-box i {
  color: #9ca3af;
  margin-right: 8px;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  color: #111827;
}

.search-input::placeholder {
  color: #9ca3af;
}

/* Selected Participants */
.selected-participants {
  margin-bottom: 16px;
  padding: 12px;
  background: #f9fafb;
  border-radius: 8px;
}

.participants-label {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.participant-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.participant-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 20px;
  padding: 4px 12px 4px 4px;
  font-size: 13px;
}

.participant-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
}

.participant-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
}

.participant-name {
  color: #111827;
  font-weight: 500;
}

.remove-participant {
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 2px;
  border-radius: 50%;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  transition: all 0.2s ease;
}

.remove-participant:hover {
  background: #f3f4f6;
  color: #6b7280;
}

/* Contacts List */
.contacts-list {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  max-height: 300px;
  overflow-y: auto;
}

.loading-state,
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px 20px;
  color: #6b7280;
  text-align: center;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #e5e7eb;
  border-top: 2px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-state i {
  font-size: 24px;
  color: #d1d5db;
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid #f3f4f6;
  cursor: pointer;
  transition: all 0.2s ease;
}

.contact-item:last-child {
  border-bottom: none;
}

.contact-item:hover {
  background: #f9fafb;
}

.contact-item.selected {
  background: #eff6ff;
  border-color: #dbeafe;
}

.contact-avatar {
  position: relative;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
}

.contact-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.contact-avatar .avatar-placeholder {
  font-size: 14px;
}

.online-indicator {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 10px;
  height: 10px;
  background: #10b981;
  border: 2px solid white;
  border-radius: 50%;
}

.contact-info {
  flex: 1;
  min-width: 0;
}

.contact-name {
  font-weight: 600;
  color: #111827;
  font-size: 14px;
  line-height: 1.3;
}

.contact-detail {
  font-size: 12px;
  color: #6b7280;
  line-height: 1.3;
  margin-top: 2px;
}

.contact-status {
  flex-shrink: 0;
}

.status-indicator {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 8px;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.status-indicator.online {
  background: #dcfce7;
  color: #166534;
}

.status-indicator.away {
  background: #fef3c7;
  color: #92400e;
}

.status-indicator.offline {
  background: #f3f4f6;
  color: #6b7280;
}

.selection-indicator {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #3b82f6;
  font-size: 14px;
  flex-shrink: 0;
}

/* Form Inputs */
.form-input,
.form-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  color: #111827;
  background: white;
  transition: all 0.2s ease;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.08);
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.input-help {
  font-size: 12px;
  color: #9ca3af;
  margin-top: 4px;
  text-align: right;
}

/* Modal Actions */
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.btn-secondary {
  background: #f9fafb;
  color: #374151;
  border: 1px solid #e5e7eb;
}

.btn-secondary:hover {
  background: #f3f4f6;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-primary:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

/* Dark theme support */
[data-bs-theme="dark"] .modal-title {
  color: #f9fafb;
}

[data-bs-theme="dark"] .type-option {
  border-color: #4b5563;
  background: #374151;
}

[data-bs-theme="dark"] .type-option:hover {
  border-color: #6b7280;
  background: #4b5563;
}

[data-bs-theme="dark"] .type-option.active {
  border-color: #60a5fa;
  background: #1e3a8a;
}

[data-bs-theme="dark"] .search-box {
  background: #374151;
  border-color: #4b5563;
}

[data-bs-theme="dark"] .search-input {
  color: #f9fafb;
}

[data-bs-theme="dark"] .contacts-list {
  border-color: #4b5563;
  background: #1f2937;
}

[data-bs-theme="dark"] .contact-item {
  border-color: #374151;
}

[data-bs-theme="dark"] .contact-item:hover {
  background: #374151;
}

[data-bs-theme="dark"] .contact-item.selected {
  background: #1e3a8a;
  border-color: #3b82f6;
}

[data-bs-theme="dark"] .form-input,
[data-bs-theme="dark"] .form-textarea {
  background: #374151;
  border-color: #4b5563;
  color: #f9fafb;
}
</style>