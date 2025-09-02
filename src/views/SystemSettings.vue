<template>
  <div class="system-settings">
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">
          <div class="title-icon">
            <i class="fas fa-cogs"></i>
          </div>
          System Settings
        </h1>
        <p class="page-description">Configure platform-wide settings, features, and organization management</p>
      </div>
      <div class="header-actions">
        <button @click="exportSettings" class="btn btn-outline">
          <i class="fas fa-download"></i>
          Export Config
        </button>
        <button @click="saveAllSettings" class="btn btn-primary" :disabled="isSaving">
          <i :class="['fas', isSaving ? 'fa-spinner fa-spin' : 'fa-save']"></i>
          {{ isSaving ? 'Saving...' : 'Save Changes' }}
        </button>
      </div>
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

    <!-- General Settings -->
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
        <div class="setting-item">
          <label>Default Currency</label>
          <select v-model="settings.general.currency">
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
            <option value="CAD">CAD (C$)</option>
          </select>
        </div>
        <div class="setting-item">
          <label class="checkbox-label">
            <input type="checkbox" v-model="settings.general.maintenanceMode">
            <span class="checkmark"></span>
            Maintenance Mode
          </label>
          <small>Temporarily disable access for all users except super admins</small>
        </div>
      </div>
    </div>

    <!-- Organization Management -->
    <div v-if="activeSection === 'organizations'" class="settings-section">
      <h2>Organization Management</h2>
      
      <!-- Organization Overview -->
      <div class="org-overview">
        <div class="overview-stats">
          <div class="stat-item">
            <div class="stat-number">{{ organizations.length }}</div>
            <div class="stat-label">Total Organizations</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">{{ activeOrganizations }}</div>
            <div class="stat-label">Active</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">{{ pendingOrganizations }}</div>
            <div class="stat-label">Pending Approval</div>
          </div>
        </div>
      </div>

      <!-- Organization Settings -->
      <div class="setting-group">
        <h3>Registration Settings</h3>
        <div class="setting-item">
          <label class="checkbox-label">
            <input type="checkbox" v-model="settings.organizations.autoApproval">
            <span class="checkmark"></span>
            Automatically approve new organization registrations
          </label>
        </div>
        <div class="setting-item">
          <label class="checkbox-label">
            <input type="checkbox" v-model="settings.organizations.requireVerification">
            <span class="checkmark"></span>
            Require email verification for new organizations
          </label>
        </div>
        <div class="setting-item">
          <label>Maximum organizations per user</label>
          <input type="number" v-model="settings.organizations.maxOrgsPerUser" min="1" max="10">
          <small>Users can create up to this many organizations</small>
        </div>
        <div class="setting-item">
          <label>Trial period (days)</label>
          <input type="number" v-model="settings.organizations.trialPeriod" min="0" max="365">
          <small>Free trial period for new organizations</small>
        </div>
      </div>

      <!-- Subscription Management -->
      <div class="setting-group">
        <h3>Subscription Management</h3>
        <div class="setting-item">
          <label class="checkbox-label">
            <input type="checkbox" v-model="settings.organizations.enableSubscriptions">
            <span class="checkmark"></span>
            Enable subscription-based billing
          </label>
        </div>
        <div class="setting-item" v-if="settings.organizations.enableSubscriptions">
          <label>Default subscription plan</label>
          <select v-model="settings.organizations.defaultPlan">
            <option value="basic">Basic Plan</option>
            <option value="professional">Professional Plan</option>
            <option value="enterprise">Enterprise Plan</option>
          </select>
        </div>
        <div class="setting-item">
          <label class="checkbox-label">
            <input type="checkbox" v-model="settings.organizations.allowPlanChanges">
            <span class="checkmark"></span>
            Allow organizations to change subscription plans
          </label>
        </div>
      </div>

      <!-- Data Limits -->
      <div class="setting-group">
        <h3>Resource Limits</h3>
        <div class="setting-item">
          <label>Default user limit per organization</label>
          <input type="number" v-model="settings.organizations.defaultUserLimit" min="1" max="1000">
        </div>
        <div class="setting-item">
          <label>Default storage limit (GB)</label>
          <input type="number" v-model="settings.organizations.defaultStorageLimit" min="1" max="1000">
        </div>
        <div class="setting-item">
          <label>Default booking limit per month</label>
          <input type="number" v-model="settings.organizations.defaultBookingLimit" min="10" max="10000">
        </div>
      </div>

    </div>

    <!-- Email Settings -->
    <div v-if="activeSection === 'email'" class="settings-section">
      <h2>Email Configuration</h2>
      <div class="setting-group">
        <div class="setting-item">
          <label>SMTP Host</label>
          <input type="text" v-model="settings.email.smtpHost">
        </div>
        <div class="setting-item">
          <label>SMTP Port</label>
          <input type="number" v-model="settings.email.smtpPort">
        </div>
        <div class="setting-item">
          <label>Username</label>
          <input type="text" v-model="settings.email.username">
        </div>
        <div class="setting-item">
          <label>Password</label>
          <input type="password" v-model="settings.email.password">
        </div>
        <div class="setting-item">
          <label>From Email</label>
          <input type="email" v-model="settings.email.fromEmail">
        </div>
        <div class="setting-item">
          <label>From Name</label>
          <input type="text" v-model="settings.email.fromName">
        </div>
        <div class="setting-item">
          <label class="checkbox-label">
            <input type="checkbox" v-model="settings.email.useSSL">
            <span class="checkmark"></span>
            Use SSL/TLS
          </label>
        </div>
        <div class="test-email">
          <button class="btn secondary" @click="testEmail">Send Test Email</button>
        </div>
      </div>
    </div>

    <!-- Security Settings -->
    <div v-if="activeSection === 'security'" class="settings-section">
      <h2>Security Configuration</h2>
      <div class="setting-group">
        <div class="setting-item">
          <label>Session Timeout (minutes)</label>
          <input type="number" v-model="settings.security.sessionTimeout" min="5" max="1440">
        </div>
        <div class="setting-item">
          <label>Max Login Attempts</label>
          <input type="number" v-model="settings.security.maxLoginAttempts" min="3" max="10">
        </div>
        <div class="setting-item">
          <label>Password Min Length</label>
          <input type="number" v-model="settings.security.passwordMinLength" min="6" max="32">
        </div>
        <div class="setting-item">
          <label class="checkbox-label">
            <input type="checkbox" v-model="settings.security.requireStrongPasswords">
            <span class="checkmark"></span>
            Require Strong Passwords
          </label>
          <small>Passwords must contain uppercase, lowercase, numbers, and symbols</small>
        </div>
        <div class="setting-item">
          <label class="checkbox-label">
            <input type="checkbox" v-model="settings.security.enableTwoFactor">
            <span class="checkmark"></span>
            Enable Two-Factor Authentication
          </label>
        </div>
        <div class="setting-item">
          <label class="checkbox-label">
            <input type="checkbox" v-model="settings.security.enableAuditLogging">
            <span class="checkmark"></span>
            Enable Audit Logging
          </label>
        </div>
      </div>
    </div>

    <!-- Backup Settings -->
    <div v-if="activeSection === 'backup'" class="settings-section">
      <h2>Backup Configuration</h2>
      <div class="setting-group">
        <div class="setting-item">
          <label class="checkbox-label">
            <input type="checkbox" v-model="settings.backup.autoBackup">
            <span class="checkmark"></span>
            Enable Automatic Backups
          </label>
        </div>
        <div class="setting-item">
          <label>Backup Frequency</label>
          <select v-model="settings.backup.frequency">
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
        <div class="setting-item">
          <label>Retention Period (days)</label>
          <input type="number" v-model="settings.backup.retentionDays" min="1" max="365">
        </div>
        <div class="setting-item">
          <label>Backup Location</label>
          <select v-model="settings.backup.location">
            <option value="local">Local Storage</option>
            <option value="s3">Amazon S3</option>
            <option value="gcs">Google Cloud Storage</option>
          </select>
        </div>
        <div class="backup-actions">
          <button class="btn secondary" @click="createBackup">Create Backup Now</button>
          <button class="btn secondary" @click="restoreBackup">Restore from Backup</button>
        </div>
      </div>
    </div>

    <!-- API Settings -->
    <div v-if="activeSection === 'api'" class="settings-section">
      <h2>API Configuration</h2>
      <div class="setting-group">
        <div class="setting-item">
          <label>Rate Limit (requests per minute)</label>
          <input type="number" v-model="settings.api.rateLimit" min="10" max="1000">
        </div>
        <div class="setting-item">
          <label class="checkbox-label">
            <input type="checkbox" v-model="settings.api.enableApiDocs">
            <span class="checkmark"></span>
            Enable API Documentation
          </label>
        </div>
        <div class="setting-item">
          <label class="checkbox-label">
            <input type="checkbox" v-model="settings.api.requireApiKey">
            <span class="checkmark"></span>
            Require API Keys for Access
          </label>
        </div>
        <div class="setting-item">
          <label>Default API Version</label>
          <select v-model="settings.api.defaultVersion">
            <option value="v1">Version 1.0</option>
            <option value="v2">Version 2.0</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Save Button -->
    <div class="save-section">
      <button class="btn primary save-btn" @click="saveSettings">
        <i class="fas fa-save"></i>
        Save All Settings
      </button>
      <p class="save-note">Changes will be applied system-wide immediately</p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SystemSettings',
  data() {
    return {
      activeSection: 'general',
      sections: [
        { id: 'general', name: 'General', icon: 'fas fa-cog' },
        { id: 'organizations', name: 'Organizations', icon: 'fas fa-building' },
        { id: 'email', name: 'Email', icon: 'fas fa-envelope' },
        { id: 'security', name: 'Security', icon: 'fas fa-shield-alt' },
        { id: 'backup', name: 'Backup', icon: 'fas fa-database' },
        { id: 'api', name: 'API', icon: 'fas fa-plug' }
      ],
      settings: {
        general: {
          platformName: 'Dynamic Booking Platform',
          timezone: 'UTC',
          currency: 'USD',
          maintenanceMode: false
        },
        organizations: {
          autoApproval: false,
          requireVerification: true,
          maxOrgsPerUser: 3,
          trialPeriod: 30,
          enableSubscriptions: true,
          defaultPlan: 'basic',
          allowPlanChanges: true,
          defaultUserLimit: 50,
          defaultStorageLimit: 10,
          defaultBookingLimit: 1000
        },
        email: {
          smtpHost: 'smtp.gmail.com',
          smtpPort: 587,
          username: '',
          password: '',
          fromEmail: 'noreply@bookingplatform.com',
          fromName: 'Booking Platform',
          useSSL: true
        },
        security: {
          sessionTimeout: 60,
          maxLoginAttempts: 5,
          passwordMinLength: 8,
          requireStrongPasswords: true,
          enableTwoFactor: false,
          enableAuditLogging: true
        },
        backup: {
          autoBackup: true,
          frequency: 'daily',
          retentionDays: 30,
          location: 'local'
        },
        api: {
          rateLimit: 100,
          enableApiDocs: true,
          requireApiKey: true,
          defaultVersion: 'v1'
        }
      },
      isSaving: false,
      organizations: [
        {
          id: '1',
          name: 'AutoCare Plus',
          email: 'admin@autocareplus.com',
          status: 'active',
          user_count: 15,
          created_at: '2024-01-15',
          subscription: 'professional'
        },
        {
          id: '2',
          name: 'Beauty Haven Spa',
          email: 'contact@beautyhaven.com',
          status: 'active',
          user_count: 8,
          created_at: '2024-02-20',
          subscription: 'basic'
        },
        {
          id: '3',
          name: 'Quick Fix Garage',
          email: 'info@quickfix.com',
          status: 'pending',
          user_count: 0,
          created_at: '2024-03-01',
          subscription: 'trial'
        },
        {
          id: '4',
          name: 'Elite Salon & Spa',
          email: 'hello@elitesalon.com',
          status: 'suspended',
          user_count: 12,
          created_at: '2024-01-08',
          subscription: 'professional'
        }
      ]
    }
  },
  computed: {
    activeOrganizations() {
      return this.organizations.filter(org => org.status === 'active').length
    },
    pendingOrganizations() {
      return this.organizations.filter(org => org.status === 'pending').length
    },
  },
  methods: {
    async saveAllSettings() {
      this.isSaving = true
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 2000))
        console.log('Saving settings:', this.settings)
        alert('Settings saved successfully!')
      } catch (error) {
        console.error('Failed to save settings:', error)
        alert('Failed to save settings. Please try again.')
      } finally {
        this.isSaving = false
      }
    },
    exportSettings() {
      const dataStr = JSON.stringify(this.settings, null, 2)
      const dataBlob = new Blob([dataStr], {type: 'application/json'})
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'system-settings.json'
      link.click()
      URL.revokeObjectURL(url)
    },
    saveSettings() {
      this.saveAllSettings()
    },
    testEmail() {
      alert('Test email sent successfully!')
    },
    createBackup() {
      alert('Creating backup... This may take a few minutes.')
    },
    restoreBackup() {
      if (confirm('Are you sure you want to restore from backup? This will overwrite current data.')) {
        alert('Restore initiated. The system will be temporarily unavailable.')
      }
    },
    formatDate(dateString) {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    },
  }
}
</script>

<style scoped>
.system-settings {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1.5rem;
  min-height: 100vh;
}

/* Modern Header */
.page-header {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.85) 100%);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--card-border);
  border-radius: 24px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: var(--bs-box-shadow-lg);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
}

.page-header:hover {
  transform: translateY(-2px);
  box-shadow: 0 15px 50px rgba(0, 0, 0, 0.1);
}

.page-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(147, 197, 253, 0.5), transparent);
}

.header-content {
  flex: 1;
}

.page-title {
  font-size: 2.25rem;
  font-weight: 700;
  color: var(--bs-body-color);
  margin: 0 0 0.75rem 0;
  display: flex;
  align-items: center;
  gap: 1.25rem;
  line-height: 1.3;
  letter-spacing: -0.025em;
}

.title-icon {
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 32px rgba(99, 102, 241, 0.25);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
}

.title-icon:hover {
  transform: scale(1.05) translateY(-2px);
  box-shadow: 0 12px 40px rgba(99, 102, 241, 0.35);
}

.title-icon i {
  font-size: 1.75rem;
  color: white;
}

.page-description {
  font-size: 1.125rem;
  color: var(--bs-secondary);
  margin: 0;
  line-height: 1.6;
  max-width: 640px;
  font-weight: 400;
}

.header-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.btn {
  padding: 12px 20px;
  border-radius: 10px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
  font-size: 14px;
}

.btn-primary {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(99, 102, 241, 0.3);
}

.btn-outline {
  background: rgba(255, 255, 255, 0.9);
  border: 2px solid rgba(226, 232, 240, 0.6);
  color: var(--bs-secondary);
}

.btn-outline:hover {
  border-color: #6366f1;
  color: #6366f1;
  background: rgba(99, 102, 241, 0.1);
  transform: translateY(-2px);
}

.btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

/* Organization Management Styles */
.org-overview {
  margin-bottom: 2rem;
}

.overview-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1.5rem;
}

.stat-item {
  background: var(--card-bg);
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: var(--stat-card-shadow);
  text-align: center;
  transition: all 0.3s ease;
}

.stat-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
}

.stat-number {
  font-size: 2rem;
  font-weight: 700;
  color: var(--bs-body-color);
  margin-bottom: 0.5rem;
}

.stat-label {
  font-size: 0.875rem;
  color: var(--bs-secondary);
  font-weight: 500;
}

.org-filters {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  align-items: center;
  flex-wrap: wrap;
}

.search-input,
.status-filter {
  padding: 12px 16px;
  border: 2px solid rgba(226, 232, 240, 0.6);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.9);
  color: var(--bs-body-color);
  font-size: 14px;
  transition: all 0.3s ease;
}

.search-input {
  flex: 1;
  min-width: 200px;
}

.search-input:focus,
.status-filter:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.org-list {
  display: grid;
  gap: 1rem;
}

.org-item {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: var(--stat-card-shadow);
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 1.5rem;
  align-items: center;
  transition: all 0.3s ease;
}

.org-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
}

.org-info {
  flex: 1;
}

.org-name {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--bs-body-color);
  margin-bottom: 0.5rem;
}

.org-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.org-email {
  font-size: 0.875rem;
  color: var(--bs-secondary);
}

.org-created {
  font-size: 0.75rem;
  color: #94a3b8;
}

.org-status {
  text-align: center;
}

.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  margin-bottom: 0.5rem;
}

.status-badge.active {
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
}

.status-badge.pending {
  background: rgba(251, 191, 36, 0.1);
  color: #d97706;
}

.status-badge.suspended {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

.org-users {
  font-size: 0.75rem;
  color: var(--bs-secondary);
}

.org-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-sm {
  padding: 8px 12px;
  font-size: 0.75rem;
}

.btn-success {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
}

.btn-warning {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: white;
}

.btn-danger {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
}

.btn-success:hover,
.btn-warning:hover,
.btn-danger:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.page-title i {
  color: #667eea;
  margin-right: 0.75rem;
}

.page-subtitle {
  color: var(--bs-secondary);
  font-size: 1.1rem;
}

.settings-nav {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.nav-btn {
  padding: 0.75rem 1.5rem;
  background: var(--card-bg);
  border: 2px solid var(--card-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.nav-btn:hover {
  border-color: #667eea;
  color: #667eea;
}

.nav-btn.active {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

.settings-section {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  margin-bottom: 2rem;
}

.settings-section h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--bs-body-color);
  margin-bottom: 1.5rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid #e9ecef;
}

.setting-group {
  display: grid;
  gap: 1.5rem;
}

.setting-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.setting-item label {
  font-weight: 600;
  color: var(--bs-body-color);
}

.setting-item input, .setting-item select {
  padding: 0.75rem;
  border: 2px solid var(--card-border);
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.setting-item input:focus, .setting-item select:focus {
  outline: none;
  border-color: #667eea;
}

.setting-item small {
  color: var(--bs-secondary);
  font-size: 0.85rem;
}

.checkbox-label {
  display: flex !important;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  flex-direction: row !important;
}

.checkbox-label input[type="checkbox"] {
  margin: 0;
  width: auto;
}

.checkmark {
  position: relative;
  display: inline-block;
  width: 20px;
  height: 20px;
  background: var(--bs-tertiary-bg);
  border: 2px solid var(--card-border);
  border-radius: 4px;
}

.checkbox-label input:checked + .checkmark {
  background: #667eea;
  border-color: #667eea;
}

.checkbox-label input:checked + .checkmark::after {
  content: '✓';
  position: absolute;
  left: 2px;
  top: -2px;
  color: white;
  font-size: 12px;
}

.test-email, .backup-actions {
  margin-top: 1rem;
  display: flex;
  gap: 1rem;
}

.save-section {
  text-align: center;
  padding: 2rem;
}

.save-btn {
  padding: 1rem 2rem;
  font-size: 1.1rem;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.save-note {
  margin-top: 1rem;
  color: var(--bs-secondary);
  font-style: italic;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn.primary {
  background: #667eea;
  color: white;
}

.btn.primary:hover {
  background: #5a6fd8;
}

.btn.secondary {
  background: var(--bs-tertiary-bg);
  color: var(--bs-secondary);
  border: 2px solid var(--card-border);
}

.btn.secondary:hover {
  background: #e9ecef;
}

@media (max-width: 768px) {
  .system-settings {
    padding: 1rem;
  }
  
  .settings-nav {
    flex-direction: column;
  }
  
  .nav-btn {
    justify-content: center;
  }
  
  .settings-section {
    padding: 1.5rem;
  }
}
</style>