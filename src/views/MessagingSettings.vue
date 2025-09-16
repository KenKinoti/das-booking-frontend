<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header-content">
        <div class="page-title-section">
          <h1 class="page-title">
            <i class="fas fa-comments-cog"></i>
            Messaging Settings
          </h1>
          <p class="page-subtitle">Configure messaging features and integrations</p>
        </div>
      </div>
    </div>

    <div class="settings-container">
      <!-- Navigation Tabs -->
      <div class="settings-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          @click="activeTab = tab.key"
          class="tab-button"
          :class="{ active: activeTab === tab.key }"
        >
          <i :class="tab.icon"></i>
          {{ tab.label }}
        </button>
      </div>

      <!-- Tab Content -->
      <div class="tab-content">
        <!-- General Settings -->
        <div v-if="activeTab === 'general'" class="settings-section">
          <div class="section-header">
            <h2>General Settings</h2>
            <p>Configure basic messaging features for your organization</p>
          </div>

          <div class="settings-grid">
            <div class="setting-card">
              <div class="setting-header">
                <h3>Core Features</h3>
              </div>
              <div class="setting-options">
                <div class="setting-item">
                  <div class="setting-info">
                    <label>Enable In-App Messaging</label>
                    <span class="setting-description">Allow users to send messages within the application</span>
                  </div>
                  <div class="setting-control">
                    <label class="toggle-switch">
                      <input v-model="settings.enable_in_app_messaging" type="checkbox" />
                      <span class="toggle-slider"></span>
                    </label>
                  </div>
                </div>

                <div class="setting-item">
                  <div class="setting-info">
                    <label>Enable Group Chats</label>
                    <span class="setting-description">Allow users to create and participate in group conversations</span>
                  </div>
                  <div class="setting-control">
                    <label class="toggle-switch">
                      <input v-model="settings.enable_group_chats" type="checkbox" />
                      <span class="toggle-slider"></span>
                    </label>
                  </div>
                </div>

                <div class="setting-item">
                  <div class="setting-info">
                    <label>Enable File Sharing</label>
                    <span class="setting-description">Allow users to share files and documents in messages</span>
                  </div>
                  <div class="setting-control">
                    <label class="toggle-switch">
                      <input v-model="settings.enable_file_sharing" type="checkbox" />
                      <span class="toggle-slider"></span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div class="setting-card">
              <div class="setting-header">
                <h3>File Sharing Limits</h3>
              </div>
              <div class="setting-options">
                <div class="setting-item">
                  <div class="setting-info">
                    <label>Maximum File Size (MB)</label>
                    <span class="setting-description">Maximum size for file uploads</span>
                  </div>
                  <div class="setting-control">
                    <input
                      v-model.number="maxFileSizeMB"
                      type="number"
                      min="1"
                      max="100"
                      class="number-input"
                    />
                  </div>
                </div>

                <div class="setting-item">
                  <div class="setting-info">
                    <label>Allowed File Types</label>
                    <span class="setting-description">Select which file types can be shared</span>
                  </div>
                  <div class="setting-control">
                    <div class="file-types-grid">
                      <label v-for="type in availableFileTypes" :key="type.ext" class="file-type-checkbox">
                        <input
                          v-model="allowedFileTypes"
                          :value="type.ext"
                          type="checkbox"
                        />
                        <span class="checkmark"></span>
                        <div class="file-type-info">
                          <i :class="type.icon"></i>
                          <span>{{ type.label }}</span>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="setting-card">
              <div class="setting-header">
                <h3>Privacy & Features</h3>
              </div>
              <div class="setting-options">
                <div class="setting-item">
                  <div class="setting-info">
                    <label>Read Receipts</label>
                    <span class="setting-description">Show when messages have been read</span>
                  </div>
                  <div class="setting-control">
                    <label class="toggle-switch">
                      <input v-model="settings.enable_read_receipts" type="checkbox" />
                      <span class="toggle-slider"></span>
                    </label>
                  </div>
                </div>

                <div class="setting-item">
                  <div class="setting-info">
                    <label>Typing Indicators</label>
                    <span class="setting-description">Show when someone is typing a message</span>
                  </div>
                  <div class="setting-control">
                    <label class="toggle-switch">
                      <input v-model="settings.enable_typing_indicator" type="checkbox" />
                      <span class="toggle-slider"></span>
                    </label>
                  </div>
                </div>

                <div class="setting-item">
                  <div class="setting-info">
                    <label>Message Reactions</label>
                    <span class="setting-description">Allow users to react to messages with emojis</span>
                  </div>
                  <div class="setting-control">
                    <label class="toggle-switch">
                      <input v-model="settings.enable_message_reactions" type="checkbox" />
                      <span class="toggle-slider"></span>
                    </label>
                  </div>
                </div>

                <div class="setting-item">
                  <div class="setting-info">
                    <label>Voice Messages</label>
                    <span class="setting-description">Allow users to send voice recordings</span>
                  </div>
                  <div class="setting-control">
                    <label class="toggle-switch">
                      <input v-model="settings.enable_voice_messages" type="checkbox" />
                      <span class="toggle-slider"></span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div class="setting-card">
              <div class="setting-header">
                <h3>Data Retention</h3>
              </div>
              <div class="setting-options">
                <div class="setting-item">
                  <div class="setting-info">
                    <label>Message Retention (Days)</label>
                    <span class="setting-description">How long to keep messages before automatic deletion</span>
                  </div>
                  <div class="setting-control">
                    <select v-model.number="settings.message_retention_days" class="select-input">
                      <option value="30">30 days</option>
                      <option value="90">90 days</option>
                      <option value="180">6 months</option>
                      <option value="365">1 year</option>
                      <option value="730">2 years</option>
                      <option value="0">Never delete</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Integrations -->
        <div v-if="activeTab === 'integrations'" class="settings-section">
          <div class="section-header">
            <h2>External Integrations</h2>
            <p>Connect with external messaging platforms</p>
          </div>

          <div class="integrations-grid">
            <!-- WhatsApp Integration -->
            <div class="integration-card">
              <div class="integration-header">
                <div class="integration-info">
                  <div class="integration-icon whatsapp">
                    <i class="fab fa-whatsapp"></i>
                  </div>
                  <div class="integration-details">
                    <h3>WhatsApp Business</h3>
                    <p>Send and receive messages via WhatsApp Business API</p>
                  </div>
                </div>
                <div class="integration-status">
                  <label class="toggle-switch">
                    <input
                      v-model="integrations.whatsapp.is_enabled"
                      @change="toggleIntegration('whatsapp')"
                      type="checkbox"
                    />
                    <span class="toggle-slider"></span>
                  </label>
                </div>
              </div>

              <div v-if="integrations.whatsapp.is_enabled" class="integration-config">
                <div class="config-form">
                  <div class="form-row">
                    <div class="form-group">
                      <label>Phone Number</label>
                      <input
                        v-model="integrations.whatsapp.phone_number"
                        type="tel"
                        placeholder="+1234567890"
                        class="form-input"
                      />
                    </div>
                    <div class="form-group">
                      <label>API Key</label>
                      <input
                        v-model="integrations.whatsapp.api_key"
                        type="password"
                        placeholder="Enter your WhatsApp API key"
                        class="form-input"
                      />
                    </div>
                  </div>
                  <div class="form-group">
                    <label>Webhook URL</label>
                    <div class="webhook-input">
                      <input
                        :value="integrations.whatsapp.webhook_url || generateWebhookURL('whatsapp')"
                        readonly
                        class="form-input"
                      />
                      <button @click="copyWebhookURL('whatsapp')" class="btn-copy">
                        <i class="fas fa-copy"></i>
                      </button>
                    </div>
                  </div>
                  <div class="integration-actions">
                    <button @click="testIntegration('whatsapp')" class="btn btn-outline">
                      Test Connection
                    </button>
                    <button @click="saveIntegration('whatsapp')" class="btn btn-primary">
                      Save Configuration
                    </button>
                  </div>
                </div>

                <div v-if="integrations.whatsapp.is_verified" class="integration-status-badge success">
                  <i class="fas fa-check-circle"></i>
                  Connected
                </div>
                <div v-else class="integration-status-badge warning">
                  <i class="fas fa-exclamation-triangle"></i>
                  Not Verified
                </div>
              </div>
            </div>

            <!-- Telegram Integration -->
            <div class="integration-card">
              <div class="integration-header">
                <div class="integration-info">
                  <div class="integration-icon telegram">
                    <i class="fab fa-telegram"></i>
                  </div>
                  <div class="integration-details">
                    <h3>Telegram Bot</h3>
                    <p>Interact with customers through Telegram bot</p>
                  </div>
                </div>
                <div class="integration-status">
                  <label class="toggle-switch">
                    <input
                      v-model="integrations.telegram.is_enabled"
                      @change="toggleIntegration('telegram')"
                      type="checkbox"
                    />
                    <span class="toggle-slider"></span>
                  </label>
                </div>
              </div>

              <div v-if="integrations.telegram.is_enabled" class="integration-config">
                <div class="config-form">
                  <div class="form-group">
                    <label>Bot Token</label>
                    <input
                      v-model="integrations.telegram.api_key"
                      type="password"
                      placeholder="Enter your Telegram bot token"
                      class="form-input"
                    />
                  </div>
                  <div class="integration-actions">
                    <button @click="testIntegration('telegram')" class="btn btn-outline">
                      Test Bot
                    </button>
                    <button @click="saveIntegration('telegram')" class="btn btn-primary">
                      Save Configuration
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Slack Integration -->
            <div class="integration-card">
              <div class="integration-header">
                <div class="integration-info">
                  <div class="integration-icon slack">
                    <i class="fab fa-slack"></i>
                  </div>
                  <div class="integration-details">
                    <h3>Slack</h3>
                    <p>Send notifications and messages to Slack channels</p>
                  </div>
                </div>
                <div class="integration-status">
                  <label class="toggle-switch">
                    <input
                      v-model="integrations.slack.is_enabled"
                      @change="toggleIntegration('slack')"
                      type="checkbox"
                    />
                    <span class="toggle-slider"></span>
                  </label>
                </div>
              </div>

              <div v-if="integrations.slack.is_enabled" class="integration-config">
                <div class="config-form">
                  <div class="form-group">
                    <label>Slack Webhook URL</label>
                    <input
                      v-model="integrations.slack.webhook_url"
                      type="url"
                      placeholder="https://hooks.slack.com/..."
                      class="form-input"
                    />
                  </div>
                  <div class="integration-actions">
                    <button @click="testIntegration('slack')" class="btn btn-outline">
                      Test Connection
                    </button>
                    <button @click="saveIntegration('slack')" class="btn btn-primary">
                      Save Configuration
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Moderation -->
        <div v-if="activeTab === 'moderation'" class="settings-section">
          <div class="section-header">
            <h2>Content Moderation</h2>
            <p>Configure automated content filtering and moderation</p>
          </div>

          <div class="settings-grid">
            <div class="setting-card">
              <div class="setting-header">
                <h3>Auto-Moderation</h3>
              </div>
              <div class="setting-options">
                <div class="setting-item">
                  <div class="setting-info">
                    <label>Enable Content Moderation</label>
                    <span class="setting-description">Automatically filter inappropriate content</span>
                  </div>
                  <div class="setting-control">
                    <label class="toggle-switch">
                      <input v-model="settings.moderation_enabled" type="checkbox" />
                      <span class="toggle-slider"></span>
                    </label>
                  </div>
                </div>

                <div class="setting-item">
                  <div class="setting-info">
                    <label>Profanity Filter</label>
                    <span class="setting-description">Block messages containing profanity</span>
                  </div>
                  <div class="setting-control">
                    <label class="toggle-switch">
                      <input v-model="settings.profanity_filter_enabled" type="checkbox" />
                      <span class="toggle-slider"></span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div class="setting-card">
              <div class="setting-header">
                <h3>Blocked Words</h3>
                <button @click="showAddWordModal = true" class="btn btn-sm btn-primary">
                  Add Word
                </button>
              </div>
              <div class="blocked-words-list">
                <div v-for="word in blockedWords" :key="word" class="blocked-word-item">
                  <span>{{ word }}</span>
                  <button @click="removeBlockedWord(word)" class="btn-remove">
                    <i class="fas fa-times"></i>
                  </button>
                </div>
                <div v-if="blockedWords.length === 0" class="empty-state">
                  No blocked words configured
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Save Button -->
      <div class="settings-footer">
        <button @click="saveSettings" :disabled="saving" class="btn btn-primary btn-lg">
          <i v-if="saving" class="fas fa-spinner fa-spin"></i>
          <i v-else class="fas fa-save"></i>
          Save Settings
        </button>
      </div>
    </div>

    <!-- Add Blocked Word Modal -->
    <div v-if="showAddWordModal" class="modal-overlay" @click="showAddWordModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>Add Blocked Word</h3>
          <button @click="showAddWordModal = false" class="btn-close">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Word or Phrase</label>
            <input
              v-model="newBlockedWord"
              @keyup.enter="addBlockedWord"
              type="text"
              placeholder="Enter word to block"
              class="form-input"
              autofocus
            />
          </div>
        </div>
        <div class="modal-footer">
          <button @click="showAddWordModal = false" class="btn btn-secondary">Cancel</button>
          <button @click="addBlockedWord" class="btn btn-primary">Add Word</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, onMounted, computed } from 'vue'
import { messagingService } from '../services/messaging'

export default {
  name: 'MessagingSettings',
  setup() {
    const activeTab = ref('general')
    const saving = ref(false)
    const showAddWordModal = ref(false)
    const newBlockedWord = ref('')

    const tabs = [
      { key: 'general', label: 'General', icon: 'fas fa-cogs' },
      { key: 'integrations', label: 'Integrations', icon: 'fas fa-plug' },
      { key: 'moderation', label: 'Moderation', icon: 'fas fa-shield-alt' }
    ]

    const settings = reactive({
      enable_in_app_messaging: true,
      enable_group_chats: true,
      enable_file_sharing: true,
      max_file_size: 10485760,
      allowed_file_types: '[]',
      message_retention_days: 365,
      enable_message_reactions: true,
      enable_typing_indicator: true,
      enable_read_receipts: true,
      enable_voice_messages: true,
      enable_video_messages: true,
      moderation_enabled: false,
      profanity_filter_enabled: false
    })

    const integrations = reactive({
      whatsapp: {
        is_enabled: false,
        is_verified: false,
        phone_number: '',
        api_key: '',
        webhook_url: ''
      },
      telegram: {
        is_enabled: false,
        is_verified: false,
        api_key: ''
      },
      slack: {
        is_enabled: false,
        is_verified: false,
        webhook_url: ''
      }
    })

    const allowedFileTypes = ref([])
    const blockedWords = ref([])

    const availableFileTypes = [
      { ext: 'jpg', label: 'Images (JPG)', icon: 'fas fa-image' },
      { ext: 'png', label: 'Images (PNG)', icon: 'fas fa-image' },
      { ext: 'gif', label: 'Images (GIF)', icon: 'fas fa-image' },
      { ext: 'pdf', label: 'PDF Documents', icon: 'fas fa-file-pdf' },
      { ext: 'doc', label: 'Word Documents', icon: 'fas fa-file-word' },
      { ext: 'docx', label: 'Word Documents', icon: 'fas fa-file-word' },
      { ext: 'txt', label: 'Text Files', icon: 'fas fa-file-alt' },
      { ext: 'zip', label: 'Archives', icon: 'fas fa-file-archive' }
    ]

    const maxFileSizeMB = computed({
      get: () => Math.round(settings.max_file_size / 1024 / 1024),
      set: (value) => settings.max_file_size = value * 1024 * 1024
    })

    const loadSettings = async () => {
      try {
        const response = await messagingService.getSettings()
        if (response.success) {
          Object.assign(settings, response.data)
          allowedFileTypes.value = JSON.parse(settings.allowed_file_types || '[]')
        }
      } catch (error) {
        console.error('Failed to load settings:', error)
      }
    }

    const loadIntegrations = async () => {
      try {
        const response = await messagingService.getIntegrations()
        if (response.success) {
          response.data.forEach(integration => {
            if (integrations[integration.provider]) {
              Object.assign(integrations[integration.provider], integration)
            }
          })
        }
      } catch (error) {
        console.error('Failed to load integrations:', error)
      }
    }

    const saveSettings = async () => {
      saving.value = true
      try {
        // Update file types
        settings.allowed_file_types = JSON.stringify(allowedFileTypes.value)

        const response = await messagingService.updateSettings(settings)
        if (response.success) {
          // Show success notification
          console.log('Settings saved successfully')
        }
      } catch (error) {
        console.error('Failed to save settings:', error)
      } finally {
        saving.value = false
      }
    }

    const toggleIntegration = async (provider) => {
      if (!integrations[provider].is_enabled) {
        // Reset configuration when disabling
        integrations[provider].api_key = ''
        integrations[provider].is_verified = false
        if (provider === 'whatsapp') {
          integrations[provider].phone_number = ''
        }
        if (provider === 'slack') {
          integrations[provider].webhook_url = ''
        }
      }
    }

    const saveIntegration = async (provider) => {
      try {
        const response = await messagingService.updateIntegration(provider, integrations[provider])
        if (response.success) {
          console.log(`${provider} integration saved successfully`)
        }
      } catch (error) {
        console.error(`Failed to save ${provider} integration:`, error)
      }
    }

    const testIntegration = async (provider) => {
      try {
        // This would test the integration
        console.log(`Testing ${provider} integration...`)
        // Mock successful test
        integrations[provider].is_verified = true
      } catch (error) {
        console.error(`Failed to test ${provider} integration:`, error)
      }
    }

    const generateWebhookURL = (provider) => {
      const baseURL = window.location.origin
      return `${baseURL}/api/v1/webhooks/${provider}`
    }

    const copyWebhookURL = (provider) => {
      const url = generateWebhookURL(provider)
      navigator.clipboard.writeText(url).then(() => {
        console.log('Webhook URL copied to clipboard')
      })
    }

    const addBlockedWord = () => {
      if (newBlockedWord.value.trim()) {
        blockedWords.value.push(newBlockedWord.value.trim())
        newBlockedWord.value = ''
        showAddWordModal.value = false
      }
    }

    const removeBlockedWord = (word) => {
      const index = blockedWords.value.indexOf(word)
      if (index > -1) {
        blockedWords.value.splice(index, 1)
      }
    }

    onMounted(async () => {
      await Promise.all([
        loadSettings(),
        loadIntegrations()
      ])
    })

    return {
      activeTab,
      saving,
      showAddWordModal,
      newBlockedWord,
      tabs,
      settings,
      integrations,
      allowedFileTypes,
      blockedWords,
      availableFileTypes,
      maxFileSizeMB,
      saveSettings,
      toggleIntegration,
      saveIntegration,
      testIntegration,
      generateWebhookURL,
      copyWebhookURL,
      addBlockedWord,
      removeBlockedWord
    }
  }
}
</script>

<style scoped>
.settings-container {
  max-width: 1200px;
  margin: 0 auto;
}

.settings-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
  border-bottom: 2px solid var(--border-color);
}

.tab-button {
  padding: 1rem 1.5rem;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  border-radius: 8px 8px 0 0;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.tab-button:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.tab-button.active {
  background: var(--primary);
  color: white;
  border-bottom: 2px solid var(--primary);
}

.section-header {
  margin-bottom: 2rem;
}

.section-header h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 0.5rem 0;
}

.section-header p {
  color: var(--text-secondary);
  margin: 0;
}

.settings-grid {
  display: grid;
  gap: 2rem;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
}

.setting-card {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border-color);
}

.setting-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.setting-header h3 {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.setting-options {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.setting-info {
  flex: 1;
}

.setting-info label {
  font-weight: 500;
  color: var(--text-primary);
  display: block;
  margin-bottom: 0.25rem;
}

.setting-description {
  font-size: 0.85rem;
  color: var(--text-secondary);
  line-height: 1.4;
}

.setting-control {
  flex-shrink: 0;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 24px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: 0.3s;
  border-radius: 24px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

input:checked + .toggle-slider {
  background-color: var(--primary);
}

input:checked + .toggle-slider:before {
  transform: translateX(26px);
}

.number-input,
.select-input,
.form-input {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--text-primary);
  min-width: 120px;
}

.file-types-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.file-type-checkbox {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.file-type-checkbox:hover {
  border-color: var(--primary);
  background: var(--primary-light);
}

.file-type-checkbox input {
  margin: 0;
}

.file-type-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.file-type-info i {
  color: var(--primary);
}

/* Integrations */
.integrations-grid {
  display: grid;
  gap: 2rem;
}

.integration-card {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border-color);
}

.integration-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.integration-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.integration-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: white;
}

.integration-icon.whatsapp {
  background: #25d366;
}

.integration-icon.telegram {
  background: #0088cc;
}

.integration-icon.slack {
  background: #4a154b;
}

.integration-details h3 {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 0.25rem 0;
}

.integration-details p {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin: 0;
}

.integration-config {
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: 500;
  color: var(--text-primary);
  font-size: 0.9rem;
}

.webhook-input {
  display: flex;
  gap: 0.5rem;
}

.webhook-input .form-input {
  flex: 1;
}

.btn-copy {
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-secondary);
  border-radius: 6px;
  cursor: pointer;
}

.btn-copy:hover {
  color: var(--primary);
  border-color: var(--primary);
}

.integration-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}

.integration-status-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 500;
  margin-top: 1rem;
  width: fit-content;
}

.integration-status-badge.success {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.2);
}

.integration-status-badge.warning {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
  border: 1px solid rgba(245, 158, 11, 0.2);
}

/* Moderation */
.blocked-words-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  min-height: 100px;
  padding: 1rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-secondary);
}

.blocked-word-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: var(--primary-light);
  border-radius: 20px;
  font-size: 0.85rem;
}

.btn-remove {
  width: 20px;
  height: 20px;
  border: none;
  background: var(--primary);
  color: white;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
}

.empty-state {
  color: var(--text-secondary);
  font-style: italic;
  align-self: center;
  margin: auto;
}

.settings-footer {
  display: flex;
  justify-content: center;
  padding: 2rem 0;
  margin-top: 2rem;
  border-top: 1px solid var(--border-color);
}

@media (max-width: 768px) {
  .settings-grid {
    grid-template-columns: 1fr;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .file-types-grid {
    grid-template-columns: 1fr;
  }

  .integration-actions {
    flex-direction: column;
  }
}
</style>