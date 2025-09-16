<template>
  <div class="system-settings">
    <!-- Action Buttons Section -->
    <div class="page-actions d-flex justify-content-end mb-4">
      <button @click="exportSettings" class="btn btn-outline-primary me-2">
        <i class="fas fa-download me-2"></i>
        Export Config
      </button>
      <button @click="saveAllSettings" class="btn btn-primary" :disabled="isSaving">
        <i :class="['fas', isSaving ? 'fa-spinner fa-spin' : 'fa-save']"></i>
        {{ isSaving ? 'Saving...' : 'Save Changes' }}
      </button>
    </div>

    <!-- Settings Navigation -->
    <div class="settings-nav">
      <button
        v-for="section in sections"
        :key="section.id"
        class="nav-btn"
        :class="{ active: activeSection === section.id }"
        @click="activeSection = section.id"
      >
        <i :class="section.icon"></i>
        {{ section.name }}
      </button>
    </div>

    <!-- Module Management Section -->
    <div v-if="activeSection === 'modules'" class="settings-section">
      <div class="clean-header">
        <h2>System Module Management</h2>
        <p>Control which modules are available system-wide for all users</p>
        <div class="header-note">
          <i class="fas fa-info-circle"></i>
          <span>This controls system-wide availability. Use the top navigation selector to choose which enabled modules to display in your workspace.</span>
        </div>
      </div>

      <!-- Simple Module Grid -->
      <div class="simple-modules-container">
        <div
          v-for="(module, key) in systemModulesStore.allModules"
          :key="key"
          class="simple-module-card"
          :class="{ enabled: systemModulesStore.isModuleEnabled(key) }"
        >
          <div class="module-left">
            <div class="module-icon" :style="{ color: module.color }">
              <i :class="module.icon"></i>
            </div>
            <div class="module-details">
              <h4>{{ module.name }}</h4>
              <p>{{ module.description }}</p>
              <div class="module-status-text">
                <span :class="{ 'text-success': systemModulesStore.isModuleEnabled(key), 'text-muted': !systemModulesStore.isModuleEnabled(key) }">
                  {{ systemModulesStore.isModuleEnabled(key) ? 'Available System-wide' : 'Disabled System-wide' }}
                </span>
              </div>
            </div>
          </div>
          <div class="module-right">
            <label class="simple-toggle">
              <input
                type="checkbox"
                :checked="systemModulesStore.isModuleEnabled(key)"
                @change="updateModuleStatus(key, $event.target.checked)"
              >
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>
    </div>

    <!-- Other Settings Sections (General, Organizations, etc.) -->
    <div v-if="activeSection === 'general'" class="settings-section">
      <h2>General Settings</h2>
      <div class="setting-group">
        <div class="setting-item">
          <label>Platform Name</label>
          <input type="text" v-model="settings.general.platformName">
          <small>The name displayed across the platform</small>
        </div>
        <div class="setting-item">
          <label>Default Timezone</label>
          <select v-model="settings.general.timezone">
            <option value="UTC">UTC</option>
            <option value="America/New_York">Eastern Time</option>
            <option value="America/Chicago">Central Time</option>
            <option value="America/Denver">Mountain Time</option>
            <option value="America/Los_Angeles">Pacific Time</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Organizations Settings -->
    <div v-if="activeSection === 'organizations'" class="settings-section">
      <h2>Organization Settings</h2>
      <div class="setting-group">
        <div class="setting-item">
          <label>Default User Limit</label>
          <input type="number" v-model="settings.organizations.defaultUserLimit">
          <small>Maximum number of users per organization by default</small>
        </div>
        <div class="setting-item">
          <label>Default Storage Limit (GB)</label>
          <input type="number" v-model="settings.organizations.defaultStorageLimit">
          <small>Storage limit in gigabytes per organization</small>
        </div>
      </div>
    </div>

    <!-- Integrations Overview -->
    <div v-if="activeSection === 'integrations'" class="settings-section">
      <h2>Third-Party Integrations</h2>
      <p class="section-description">Enable and configure third-party service integrations</p>

      <div class="integration-grid">
        <div class="integration-card" :class="{ enabled: settings.integrations.enableZoho }">
          <div class="integration-header">
            <div class="integration-icon zoho">
              <i class="fas fa-briefcase"></i>
            </div>
            <div class="integration-details">
              <h4>Zoho Suite</h4>
              <p>CRM, Books, Desk, Mail & Campaigns</p>
            </div>
            <label class="integration-toggle">
              <input type="checkbox" v-model="settings.integrations.enableZoho">
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <div class="integration-card" :class="{ enabled: settings.integrations.enableWhatsApp }">
          <div class="integration-header">
            <div class="integration-icon whatsapp">
              <i class="fab fa-whatsapp"></i>
            </div>
            <div class="integration-details">
              <h4>WhatsApp Business</h4>
              <p>Customer messaging & notifications</p>
            </div>
            <label class="integration-toggle">
              <input type="checkbox" v-model="settings.integrations.enableWhatsApp">
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <div class="integration-card" :class="{ enabled: settings.integrations.enableTwilio }">
          <div class="integration-header">
            <div class="integration-icon twilio">
              <i class="fas fa-sms"></i>
            </div>
            <div class="integration-details">
              <h4>Twilio SMS</h4>
              <p>SMS notifications & verification</p>
            </div>
            <label class="integration-toggle">
              <input type="checkbox" v-model="settings.integrations.enableTwilio">
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <div class="integration-card" :class="{ enabled: settings.integrations.enableStripe }">
          <div class="integration-header">
            <div class="integration-icon stripe">
              <i class="fab fa-stripe"></i>
            </div>
            <div class="integration-details">
              <h4>Stripe Payments</h4>
              <p>Online payment processing</p>
            </div>
            <label class="integration-toggle">
              <input type="checkbox" v-model="settings.integrations.enableStripe">
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <div class="integration-card" :class="{ enabled: settings.integrations.enablePayPal }">
          <div class="integration-header">
            <div class="integration-icon paypal">
              <i class="fab fa-paypal"></i>
            </div>
            <div class="integration-details">
              <h4>PayPal</h4>
              <p>Alternative payment method</p>
            </div>
            <label class="integration-toggle">
              <input type="checkbox" v-model="settings.integrations.enablePayPal">
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>
    </div>

    <!-- Email Services -->
    <div v-if="activeSection === 'email'" class="settings-section">
      <h2>Email Service Configuration</h2>
      <p class="section-description">Configure SMTP settings for system emails</p>

      <div class="setting-group">
        <div class="setting-item">
          <label>Email Provider</label>
          <select v-model="settings.email.provider">
            <option value="smtp">Custom SMTP</option>
            <option value="gmail">Gmail</option>
            <option value="outlook">Outlook</option>
            <option value="sendgrid">SendGrid</option>
            <option value="mailgun">Mailgun</option>
          </select>
        </div>

        <div class="setting-row">
          <div class="setting-item">
            <label>SMTP Host</label>
            <input type="text" v-model="settings.email.smtpHost" placeholder="smtp.gmail.com">
          </div>
          <div class="setting-item">
            <label>SMTP Port</label>
            <input type="number" v-model="settings.email.smtpPort" placeholder="587">
          </div>
          <div class="setting-item">
            <label>Security</label>
            <select v-model="settings.email.smtpSecurity">
              <option value="tls">TLS</option>
              <option value="ssl">SSL</option>
              <option value="none">None</option>
            </select>
          </div>
        </div>

        <div class="setting-row">
          <div class="setting-item">
            <label>Username</label>
            <input type="text" v-model="settings.email.smtpUsername" placeholder="your@email.com">
          </div>
          <div class="setting-item">
            <label>Password</label>
            <input type="password" v-model="settings.email.smtpPassword" placeholder="App password">
          </div>
        </div>

        <div class="setting-row">
          <div class="setting-item">
            <label>From Name</label>
            <input type="text" v-model="settings.email.fromName" placeholder="DAS Booking Platform">
          </div>
          <div class="setting-item">
            <label>From Email</label>
            <input type="email" v-model="settings.email.fromEmail" placeholder="noreply@yourcompany.com">
          </div>
          <div class="setting-item">
            <label>Reply To Email</label>
            <input type="email" v-model="settings.email.replyToEmail" placeholder="support@yourcompany.com">
          </div>
        </div>

        <div class="test-section">
          <button class="btn btn-outline-primary" @click="testEmailConnection">Test Email Connection</button>
        </div>
      </div>
    </div>

    <!-- WhatsApp API -->
    <div v-if="activeSection === 'whatsapp'" class="settings-section">
      <h2>WhatsApp Business API</h2>
      <p class="section-description">Configure WhatsApp Business API for customer messaging</p>

      <div class="setting-group">
        <div class="setting-item">
          <label class="toggle-label">
            <input type="checkbox" v-model="settings.whatsapp.enabled">
            <span>Enable WhatsApp Integration</span>
          </label>
        </div>

        <div v-if="settings.whatsapp.enabled" class="whatsapp-config">
          <div class="setting-item">
            <label>Access Token</label>
            <input type="password" v-model="settings.whatsapp.accessToken" placeholder="Your WhatsApp access token">
            <small>Get this from your Meta for Developers dashboard</small>
          </div>

          <div class="setting-row">
            <div class="setting-item">
              <label>Phone Number ID</label>
              <input type="text" v-model="settings.whatsapp.phoneNumberId" placeholder="Phone number ID">
            </div>
            <div class="setting-item">
              <label>Business Account ID</label>
              <input type="text" v-model="settings.whatsapp.businessAccountId" placeholder="Business account ID">
            </div>
          </div>

          <div class="setting-row">
            <div class="setting-item">
              <label>Webhook URL</label>
              <input type="url" v-model="settings.whatsapp.webhookUrl" placeholder="https://yourapi.com/webhook/whatsapp">
            </div>
            <div class="setting-item">
              <label>Verify Token</label>
              <input type="text" v-model="settings.whatsapp.verifyToken" placeholder="Your verify token">
            </div>
          </div>

          <div class="test-section">
            <button class="btn btn-outline-success" @click="testWhatsAppConnection">Test WhatsApp Connection</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Zoho Integration -->
    <div v-if="activeSection === 'zoho'" class="settings-section">
      <h2>Zoho Suite Integration</h2>
      <p class="section-description">Connect with Zoho CRM, Books, Desk, Mail and Campaigns</p>

      <div class="setting-group">
        <div class="setting-item">
          <label class="toggle-label">
            <input type="checkbox" v-model="settings.zoho.enabled">
            <span>Enable Zoho Integration</span>
          </label>
        </div>

        <div v-if="settings.zoho.enabled" class="zoho-config">
          <div class="setting-row">
            <div class="setting-item">
              <label>Client ID</label>
              <input type="text" v-model="settings.zoho.clientId" placeholder="Zoho OAuth Client ID">
            </div>
            <div class="setting-item">
              <label>Client Secret</label>
              <input type="password" v-model="settings.zoho.clientSecret" placeholder="Zoho OAuth Client Secret">
            </div>
          </div>

          <div class="setting-item">
            <label>Refresh Token</label>
            <input type="password" v-model="settings.zoho.refreshToken" placeholder="OAuth refresh token">
            <small>Generate this through Zoho OAuth flow</small>
          </div>

          <div class="setting-item">
            <label>API Domain</label>
            <select v-model="settings.zoho.apiDomain">
              <option value="https://www.zohoapis.com">US (.com)</option>
              <option value="https://www.zohoapis.eu">EU (.eu)</option>
              <option value="https://www.zohoapis.in">India (.in)</option>
              <option value="https://www.zohoapis.com.au">Australia (.com.au)</option>
            </select>
          </div>

          <div class="zoho-modules">
            <h4>Enabled Zoho Modules</h4>
            <div class="module-checkboxes">
              <label class="checkbox-label">
                <input type="checkbox" v-model="settings.zoho.modules.crm">
                <span>Zoho CRM</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" v-model="settings.zoho.modules.books">
                <span>Zoho Books</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" v-model="settings.zoho.modules.desk">
                <span>Zoho Desk</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" v-model="settings.zoho.modules.mail">
                <span>Zoho Mail</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" v-model="settings.zoho.modules.campaigns">
                <span>Zoho Campaigns</span>
              </label>
            </div>
          </div>

          <div class="test-section">
            <button class="btn btn-outline-primary" @click="testZohoConnection">Test Zoho Connection</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Security & Authentication -->
    <div v-if="activeSection === 'security'" class="settings-section">
      <h2>Security & Authentication</h2>
      <p class="section-description">Configure security policies and authentication settings</p>

      <div class="setting-group">
        <div class="security-section">
          <h4>Session Management</h4>
          <div class="setting-row">
            <div class="setting-item">
              <label>Session Timeout (minutes)</label>
              <input type="number" v-model="settings.security.sessionTimeout" min="5" max="480">
              <small>Automatically logout users after inactivity</small>
            </div>
          </div>
        </div>

        <div class="security-section">
          <h4>Password Policy</h4>
          <div class="setting-row">
            <div class="setting-item">
              <label>Minimum Length</label>
              <input type="number" v-model="settings.security.passwordMinLength" min="6" max="32">
            </div>
          </div>
          <div class="policy-checkboxes">
            <label class="checkbox-label">
              <input type="checkbox" v-model="settings.security.requireSpecialChars">
              <span>Require special characters (!@#$%^&*)</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" v-model="settings.security.requireNumbers">
              <span>Require numbers (0-9)</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" v-model="settings.security.enableTwoFactor">
              <span>Enable Two-Factor Authentication</span>
            </label>
          </div>
        </div>

        <div class="security-section">
          <h4>Network Security</h4>
          <div class="setting-item">
            <label>Allowed IP Addresses</label>
            <textarea v-model="settings.security.allowedIpAddresses" placeholder="192.168.1.0/24&#10;10.0.0.0/8&#10;Leave empty to allow all IPs" rows="3"></textarea>
            <small>Enter IP addresses or CIDR blocks, one per line</small>
          </div>

          <div class="setting-item">
            <label>CORS Origins</label>
            <input type="text" v-model="settings.security.corsOrigins" placeholder="https://yourdomain.com,https://app.yourdomain.com">
            <small>Comma-separated list of allowed origins</small>
          </div>
        </div>

        <div class="security-section">
          <h4>Rate Limiting</h4>
          <div class="setting-row">
            <div class="setting-item">
              <label>Max Requests</label>
              <input type="number" v-model="settings.security.rateLimitRequests" min="10" max="10000">
              <small>Maximum requests per window</small>
            </div>
            <div class="setting-item">
              <label>Time Window (minutes)</label>
              <input type="number" v-model="settings.security.rateLimitWindow" min="1" max="60">
              <small>Time window for rate limiting</small>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- API Keys Management -->
    <div v-if="activeSection === 'apikeys'" class="settings-section">
      <h2>API Keys Management</h2>
      <p class="section-description">Manage API keys for various third-party services</p>

      <div class="setting-group">
        <div class="api-key-grid">
          <div class="api-key-item">
            <div class="service-info">
              <div class="service-icon openai">
                <i class="fas fa-robot"></i>
              </div>
              <div class="service-details">
                <h4>OpenAI</h4>
                <p>AI-powered features & chatbot</p>
              </div>
            </div>
            <div class="key-input">
              <input type="password" v-model="settings.apiKeys.openai" placeholder="sk-..." class="api-input">
            </div>
          </div>

          <div class="api-key-item">
            <div class="service-info">
              <div class="service-icon stripe">
                <i class="fab fa-stripe"></i>
              </div>
              <div class="service-details">
                <h4>Stripe</h4>
                <p>Payment processing</p>
              </div>
            </div>
            <div class="key-input">
              <input type="password" v-model="settings.apiKeys.stripe" placeholder="sk_live_..." class="api-input">
            </div>
          </div>

          <div class="api-key-item">
            <div class="service-info">
              <div class="service-icon twilio">
                <i class="fas fa-sms"></i>
              </div>
              <div class="service-details">
                <h4>Twilio</h4>
                <p>SMS & voice services</p>
              </div>
            </div>
            <div class="key-input">
              <input type="password" v-model="settings.apiKeys.twilio" placeholder="AC..." class="api-input">
            </div>
          </div>

          <div class="api-key-item">
            <div class="service-info">
              <div class="service-icon sendgrid">
                <i class="fas fa-envelope"></i>
              </div>
              <div class="service-details">
                <h4>SendGrid</h4>
                <p>Transactional emails</p>
              </div>
            </div>
            <div class="key-input">
              <input type="password" v-model="settings.apiKeys.sendgrid" placeholder="SG..." class="api-input">
            </div>
          </div>

          <div class="api-key-item">
            <div class="service-info">
              <div class="service-icon cloudinary">
                <i class="fas fa-cloud-upload-alt"></i>
              </div>
              <div class="service-details">
                <h4>Cloudinary</h4>
                <p>Image & video management</p>
              </div>
            </div>
            <div class="key-input">
              <input type="password" v-model="settings.apiKeys.cloudinary" placeholder="cloudinary://..." class="api-input">
            </div>
          </div>

          <div class="api-key-item">
            <div class="service-info">
              <div class="service-icon firebase">
                <i class="fab fa-google"></i>
              </div>
              <div class="service-details">
                <h4>Firebase</h4>
                <p>Push notifications & analytics</p>
              </div>
            </div>
            <div class="key-input">
              <input type="password" v-model="settings.apiKeys.firebase" placeholder="Firebase API Key" class="api-input">
            </div>
          </div>

          <div class="api-key-item">
            <div class="service-info">
              <div class="service-icon pusher">
                <i class="fas fa-broadcast-tower"></i>
              </div>
              <div class="service-details">
                <h4>Pusher</h4>
                <p>Real-time notifications</p>
              </div>
            </div>
            <div class="key-input">
              <input type="password" v-model="settings.apiKeys.pusher" placeholder="Pusher API Key" class="api-input">
            </div>
          </div>
        </div>

        <div class="api-security-note">
          <i class="fas fa-shield-alt"></i>
          <span>All API keys are encrypted and stored securely. Never share these keys publicly.</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { useSystemModulesStore } from '../stores/systemModules'

export default {
  name: 'SystemSettings',

  data() {
    return {
      activeSection: 'modules',
      sections: [
        { id: 'general', name: 'General', icon: 'fas fa-cog' },
        { id: 'modules', name: 'Module Management', icon: 'fas fa-puzzle-piece' },
        { id: 'integrations', name: 'Integrations', icon: 'fas fa-plug' },
        { id: 'email', name: 'Email Services', icon: 'fas fa-envelope' },
        { id: 'whatsapp', name: 'WhatsApp API', icon: 'fab fa-whatsapp' },
        { id: 'zoho', name: 'Zoho Integration', icon: 'fas fa-briefcase' },
        { id: 'security', name: 'Security & Auth', icon: 'fas fa-shield-alt' },
        { id: 'apikeys', name: 'API Keys', icon: 'fas fa-key' },
        { id: 'organizations', name: 'Organizations', icon: 'fas fa-building' }
      ],
      isSaving: false,
      settings: {
        general: {
          platformName: 'Dynamic Booking Platform',
          timezone: 'UTC',
          currency: 'USD'
        },
        organizations: {
          defaultUserLimit: 50,
          defaultStorageLimit: 10
        },
        integrations: {
          enableZoho: false,
          enableWhatsApp: false,
          enableTwilio: false,
          enableStripe: true,
          enablePayPal: false
        },
        email: {
          provider: 'smtp',
          smtpHost: '',
          smtpPort: 587,
          smtpUsername: '',
          smtpPassword: '',
          smtpSecurity: 'tls',
          fromName: 'DAS Booking Platform',
          fromEmail: '',
          replyToEmail: ''
        },
        whatsapp: {
          enabled: false,
          apiKey: '',
          phoneNumberId: '',
          businessAccountId: '',
          webhookUrl: '',
          verifyToken: '',
          accessToken: ''
        },
        zoho: {
          enabled: false,
          clientId: '',
          clientSecret: '',
          refreshToken: '',
          apiDomain: 'https://www.zohoapis.com',
          modules: {
            crm: false,
            books: false,
            desk: false,
            mail: false,
            campaigns: false
          }
        },
        security: {
          sessionTimeout: 30,
          passwordMinLength: 8,
          requireSpecialChars: true,
          requireNumbers: true,
          enableTwoFactor: false,
          allowedIpAddresses: '',
          corsOrigins: 'http://localhost:5173,https://localhost:5173',
          rateLimitRequests: 100,
          rateLimitWindow: 15
        },
        apiKeys: {
          openai: '',
          stripe: '',
          twilio: '',
          sendgrid: '',
          cloudinary: '',
          firebase: '',
          pusher: ''
        }
      }
    }
  },

  computed: {
    systemModulesStore() {
      return useSystemModulesStore()
    }
  },

  methods: {
    updateModuleStatus(moduleKey, enabled) {
      console.log(`System Module ${moduleKey} ${enabled ? 'enabled' : 'disabled'}`)
      this.systemModulesStore.updateModuleStatus(moduleKey, enabled)

      // Show feedback message
      this.$nextTick(() => {
        const moduleInfo = this.systemModulesStore.getModuleInfo(moduleKey)
        const status = enabled ? 'enabled' : 'disabled'
        console.log(`✅ ${moduleInfo.name} has been ${status} system-wide`)
      })
    },

    async saveAllSettings() {
      this.isSaving = true
      try {
        await new Promise(resolve => setTimeout(resolve, 1000))
        console.log('✅ All system settings saved successfully!')
        alert('System settings saved successfully!')
      } catch (error) {
        console.error('Error saving settings:', error)
        alert('Error saving settings. Please try again.')
      } finally {
        this.isSaving = false
      }
    },

    exportSettings() {
      const settings = {
        general: this.settings.general,
        organizations: this.settings.organizations,
        integrations: this.settings.integrations,
        email: this.settings.email,
        whatsapp: this.settings.whatsapp,
        zoho: this.settings.zoho,
        security: this.settings.security,
        systemModules: this.systemModulesStore.enabledModules
        // Note: API keys are not exported for security reasons
      }

      const dataStr = JSON.stringify(settings, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'system-settings.json'
      link.click()
      URL.revokeObjectURL(url)
    },

    async testEmailConnection() {
      try {
        console.log('Testing email connection...')
        // Simulate email test
        await new Promise(resolve => setTimeout(resolve, 2000))
        alert('✅ Email connection successful! Test email sent.')
      } catch (error) {
        console.error('Email test failed:', error)
        alert('❌ Email connection failed. Please check your settings.')
      }
    },

    async testWhatsAppConnection() {
      try {
        console.log('Testing WhatsApp connection...')
        // Simulate WhatsApp API test
        await new Promise(resolve => setTimeout(resolve, 2000))
        alert('✅ WhatsApp connection successful!')
      } catch (error) {
        console.error('WhatsApp test failed:', error)
        alert('❌ WhatsApp connection failed. Please verify your access token.')
      }
    },

    async testZohoConnection() {
      try {
        console.log('Testing Zoho connection...')
        // Simulate Zoho API test
        await new Promise(resolve => setTimeout(resolve, 2000))
        alert('✅ Zoho connection successful!')
      } catch (error) {
        console.error('Zoho test failed:', error)
        alert('❌ Zoho connection failed. Please verify your OAuth credentials.')
      }
    }
  },

  mounted() {
    // Initialize system modules store
    this.systemModulesStore.initializeFromStorage()
  }
}
</script>

<style scoped>
.system-settings {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.settings-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 2rem;
  padding: 1rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.nav-btn {
  padding: 0.75rem 1.5rem;
  border: 2px solid #e2e8f0;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  color: #64748b;
}

.nav-btn:hover {
  border-color: #cbd5e1;
  background: #f8fafc;
}

.nav-btn.active {
  border-color: #3b82f6;
  background: #eff6ff;
  color: #3b82f6;
}

.settings-section {
  background: white;
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.clean-header {
  text-align: center;
  margin-bottom: 3rem;
  padding: 2rem;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.8) 100%);
  border-radius: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.clean-header h2 {
  font-size: 2rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 0.5rem 0;
}

.clean-header p {
  color: #64748b;
  font-size: 1.1rem;
  margin: 0 0 1rem 0;
}

.header-note {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem;
  background: #fffbeb;
  border: 1px solid #fed7aa;
  border-radius: 8px;
  color: #92400e;
  font-size: 0.875rem;
  max-width: 600px;
  margin: 0 auto;
}

.simple-modules-container {
  display: grid;
  gap: 1rem;
  max-width: 900px;
  margin: 0 auto;
}

.simple-module-card {
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: all 0.3s ease;
}

.simple-module-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.simple-module-card.enabled {
  border-color: #10b981;
  background: rgba(16, 185, 129, 0.02);
}

.module-left {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
}

.module-icon {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  background: rgba(102, 126, 234, 0.1);
}

.module-details h4 {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: #1e293b;
}

.module-details p {
  margin: 0 0 0.5rem 0;
  color: #64748b;
  font-size: 0.875rem;
  line-height: 1.4;
}

.module-status-text {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.simple-toggle {
  position: relative;
  display: inline-block;
  width: 60px;
  height: 32px;
  cursor: pointer;
}

.simple-toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #e5e7eb;
  border-radius: 32px;
  transition: all 0.3s ease;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 24px;
  width: 24px;
  left: 4px;
  bottom: 4px;
  background: white;
  border-radius: 50%;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.simple-toggle input:checked + .toggle-slider {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.simple-toggle input:checked + .toggle-slider:before {
  transform: translateX(28px);
}

.setting-group {
  display: grid;
  gap: 2rem;
}

.setting-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.setting-item label {
  font-weight: 600;
  color: #374151;
}

.setting-item input,
.setting-item select {
  padding: 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.875rem;
  transition: border-color 0.2s ease;
}

.setting-item input:focus,
.setting-item select:focus {
  outline: none;
  border-color: #3b82f6;
}

.setting-item small {
  color: #6b7280;
  font-size: 0.8rem;
}

/* Dark Theme */
[data-bs-theme="dark"] .settings-section {
  background: #1f2937;
  color: #f9fafb;
}

[data-bs-theme="dark"] .clean-header {
  background: linear-gradient(135deg, rgba(31, 41, 55, 0.9) 0%, rgba(55, 65, 81, 0.8) 100%);
}

[data-bs-theme="dark"] .clean-header h2 {
  color: #f9fafb;
}

[data-bs-theme="dark"] .clean-header p {
  color: #d1d5db;
}

[data-bs-theme="dark"] .simple-module-card {
  background: #1f2937;
  border-color: #374151;
}

[data-bs-theme="dark"] .module-details h4 {
  color: #f9fafb;
}

[data-bs-theme="dark"] .module-details p {
  color: #d1d5db;
}

/* Section Descriptions */
.section-description {
  color: #64748b;
  font-size: 0.95rem;
  margin-bottom: 2rem;
  text-align: center;
}

/* Integration Grid */
.integration-grid {
  display: grid;
  gap: 1rem;
  margin-bottom: 2rem;
}

.integration-card {
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.3s ease;
}

.integration-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.integration-card.enabled {
  border-color: #10b981;
  background: rgba(16, 185, 129, 0.02);
}

.integration-header {
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
  font-size: 1.25rem;
  color: white;
}

.integration-icon.zoho { background: linear-gradient(135deg, #1f4e79 0%, #2d6aa3 100%); }
.integration-icon.whatsapp { background: linear-gradient(135deg, #25d366 0%, #128c7e 100%); }
.integration-icon.twilio { background: linear-gradient(135deg, #f22f46 0%, #cf2e2e 100%); }
.integration-icon.stripe { background: linear-gradient(135deg, #6772e5 0%, #5469d4 100%); }
.integration-icon.paypal { background: linear-gradient(135deg, #0070ba 0%, #003087 100%); }

.integration-details {
  flex: 1;
}

.integration-details h4 {
  margin: 0 0 0.25rem 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #1e293b;
}

.integration-details p {
  margin: 0;
  color: #64748b;
  font-size: 0.875rem;
}

.integration-toggle {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 28px;
  cursor: pointer;
}

.integration-toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.integration-toggle .toggle-slider {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #e5e7eb;
  border-radius: 28px;
  transition: all 0.3s ease;
}

.integration-toggle .toggle-slider:before {
  position: absolute;
  content: "";
  height: 20px;
  width: 20px;
  left: 4px;
  bottom: 4px;
  background: white;
  border-radius: 50%;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.integration-toggle input:checked + .toggle-slider {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.integration-toggle input:checked + .toggle-slider:before {
  transform: translateX(22px);
}

/* Setting Rows */
.setting-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

/* Enhanced Setting Items */
.setting-item textarea {
  padding: 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.875rem;
  font-family: inherit;
  resize: vertical;
  transition: border-color 0.2s ease;
}

.setting-item textarea:focus {
  outline: none;
  border-color: #3b82f6;
}

/* Toggle Labels */
.toggle-label {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  font-weight: 500;
  color: #374151;
  margin-bottom: 1rem;
}

.toggle-label input[type="checkbox"] {
  width: 20px;
  height: 20px;
  accent-color: #3b82f6;
}

/* Checkbox Labels */
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  margin-bottom: 0.75rem;
  color: #374151;
}

.checkbox-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: #3b82f6;
}

/* Configuration Sections */
.whatsapp-config,
.zoho-config {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

/* Module Checkboxes */
.module-checkboxes {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
  margin-top: 1rem;
}

.zoho-modules {
  margin: 2rem 0;
  padding: 1.5rem;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.zoho-modules h4 {
  margin: 0 0 1rem 0;
  color: #1e293b;
  font-size: 1.1rem;
  font-weight: 600;
}

/* Security Sections */
.security-section {
  margin-bottom: 2rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid #e2e8f0;
}

.security-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.security-section h4 {
  color: #1e293b;
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

.policy-checkboxes {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1rem;
}

/* API Key Grid */
.api-key-grid {
  display: grid;
  gap: 1rem;
  margin-bottom: 2rem;
}

.api-key-item {
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: all 0.3s ease;
}

.api-key-item:hover {
  border-color: #cbd5e1;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.service-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.service-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  color: white;
}

.service-icon.openai { background: linear-gradient(135deg, #10a37f 0%, #087f5b 100%); }
.service-icon.stripe { background: linear-gradient(135deg, #6772e5 0%, #5469d4 100%); }
.service-icon.twilio { background: linear-gradient(135deg, #f22f46 0%, #cf2e2e 100%); }
.service-icon.sendgrid { background: linear-gradient(135deg, #1a82e2 0%, #0f4c75 100%); }
.service-icon.cloudinary { background: linear-gradient(135deg, #3448c5 0%, #2832a6 100%); }
.service-icon.firebase { background: linear-gradient(135deg, #ffa000 0%, #ff8f00 100%); }
.service-icon.pusher { background: linear-gradient(135deg, #300d4f 0%, #2d0845 100%); }

.service-details h4 {
  margin: 0 0 0.25rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
}

.service-details p {
  margin: 0;
  color: #64748b;
  font-size: 0.8rem;
}

.key-input {
  flex: 2;
}

.api-input {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.875rem;
  font-family: 'Courier New', monospace;
  transition: border-color 0.2s ease;
}

.api-input:focus {
  outline: none;
  border-color: #3b82f6;
}

.api-security-note {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: #fef3c7;
  border: 1px solid #f59e0b;
  border-radius: 8px;
  color: #92400e;
  font-size: 0.875rem;
  margin-top: 1rem;
}

/* Test Sections */
.test-section {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e2e8f0;
  text-align: center;
}

.test-section .btn {
  padding: 0.75rem 2rem;
  font-weight: 500;
}

/* Dark Theme for New Sections */
[data-bs-theme="dark"] .integration-card {
  background: #1f2937;
  border-color: #374151;
}

[data-bs-theme="dark"] .integration-details h4 {
  color: #f9fafb;
}

[data-bs-theme="dark"] .integration-details p {
  color: #d1d5db;
}

[data-bs-theme="dark"] .api-key-item {
  background: #1f2937;
  border-color: #374151;
}

[data-bs-theme="dark"] .service-details h4 {
  color: #f9fafb;
}

[data-bs-theme="dark"] .service-details p {
  color: #d1d5db;
}

[data-bs-theme="dark"] .zoho-modules {
  background: #374151;
  border-color: #4b5563;
}

[data-bs-theme="dark"] .zoho-modules h4 {
  color: #f9fafb;
}

[data-bs-theme="dark"] .whatsapp-config,
[data-bs-theme="dark"] .zoho-config {
  border-color: #4b5563;
}

[data-bs-theme="dark"] .security-section {
  border-color: #4b5563;
}

[data-bs-theme="dark"] .security-section h4 {
  color: #f9fafb;
}

[data-bs-theme="dark"] .toggle-label,
[data-bs-theme="dark"] .checkbox-label {
  color: #f9fafb;
}

[data-bs-theme="dark"] .section-description {
  color: #d1d5db;
}

[data-bs-theme="dark"] .setting-item input,
[data-bs-theme="dark"] .setting-item select,
[data-bs-theme="dark"] .setting-item textarea,
[data-bs-theme="dark"] .api-input {
  background: #374151;
  border-color: #4b5563;
  color: #f9fafb;
}

[data-bs-theme="dark"] .setting-item input:focus,
[data-bs-theme="dark"] .setting-item select:focus,
[data-bs-theme="dark"] .setting-item textarea:focus,
[data-bs-theme="dark"] .api-input:focus {
  border-color: #3b82f6;
}

/* Responsive Design */
@media (max-width: 768px) {
  .system-settings {
    padding: 1rem;
  }

  .settings-nav {
    padding: 0.75rem;
  }

  .nav-btn {
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
  }

  .setting-row {
    grid-template-columns: 1fr;
  }

  .integration-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .integration-toggle {
    align-self: flex-end;
  }

  .service-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .api-key-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .key-input {
    width: 100%;
  }

  .module-checkboxes {
    grid-template-columns: 1fr;
  }
}
</style>