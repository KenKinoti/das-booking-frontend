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

    <!-- Module Management -->
    <!-- Module Management -->
    <div v-if="activeSection === 'modules'" class="settings-section">
      <div class="clean-header">
        <h2>Module Management</h2>
        <p>Enable or disable modules to customize your workspace</p>
      </div>

      <!-- Simple Module Grid -->
      <div class="simple-modules-container">
        <div
          v-for="(module, key) in allModules"
          :key="key"
          class="simple-module-card"
          :class="{ enabled: module.enabled }"
        >
          <div class="module-left">
            <div class="module-icon" :style="{ color: getModuleColor(key) }">
              <i :class="getModuleIcon(key)"></i>
            </div>
            <div class="module-details">
              <h4>{{ module.name }}</h4>
              <p>{{ module.description }}</p>
            </div>
          </div>
          <div class="module-right">
            <label class="simple-toggle">
              <input
                type="checkbox"
                v-model="module.enabled"
                @change="updateModuleStatus(key, module.enabled)"
              >
              <span class="toggle-slider"></span>
            </label>
          </div>
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
        { id: 'modules', name: 'Module Management', icon: 'fas fa-puzzle-piece' },
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
        modules: {
          finance: { enabled: true, name: 'Finance & Accounting', description: 'Financial management and accounting features' },
          inventory: { enabled: true, name: 'Inventory Management', description: 'Stock and inventory tracking' },
          crm: { enabled: true, name: 'Customer Relations', description: 'Customer relationship management' },
          bookings: { enabled: true, name: 'Bookings & Appointments', description: 'Appointment scheduling system' },
          services: { enabled: true, name: 'Service Management', description: 'Service catalog and management' },
          staff: { enabled: true, name: 'Staff Management', description: 'Employee and staff management' },
          messaging: { enabled: true, name: 'Messaging System', description: 'Internal messaging and communication' },
          videocall: { enabled: true, name: 'Video Calling', description: 'Real-time video communication' },
          pos: { enabled: false, name: 'Point of Sale', description: 'Retail point of sale system' },
          ecommerce: { enabled: false, name: 'E-commerce', description: 'Online store and e-commerce features' },
          hcm: { enabled: false, name: 'Human Capital Management', description: 'HR and payroll management' },
          projects: { enabled: false, name: 'Project Management', description: 'Project tracking and management' },
          production: { enabled: false, name: 'Production & MRP', description: 'Manufacturing and production planning' },
          events: { enabled: true, name: 'Events Management', description: 'Event planning and management' },
          reports: { enabled: true, name: 'Reports & Analytics', description: 'Business intelligence and reporting' },
          autoSync: true,
          allowOrganizationOverride: false
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
      availableMenus: [
        // Events Management Menus
        { id: 'event-calendar', name: 'Event Calendar', description: 'View and manage event schedules', category: 'events' },
        { id: 'event-planning', name: 'Event Planning', description: 'Create and plan events', category: 'events' },
        { id: 'venue-management', name: 'Venue Management', description: 'Manage event venues and locations', category: 'events' },
        { id: 'event-reports', name: 'Event Reports', description: 'Analytics and reports for events', category: 'events' },

        // Booking & Scheduling Menus
        { id: 'appointment-calendar', name: 'Appointment Calendar', description: 'View appointment schedules', category: 'bookings' },
        { id: 'booking-management', name: 'Booking Management', description: 'Manage customer bookings', category: 'bookings' },
        { id: 'availability-settings', name: 'Availability Settings', description: 'Configure availability and time slots', category: 'bookings' },
        { id: 'booking-reports', name: 'Booking Reports', description: 'Analytics and reports for bookings', category: 'bookings' },

        // Finance & Accounting Menus
        { id: 'general-ledger', name: 'General Ledger', description: 'Financial accounts and transactions', category: 'finance' },
        { id: 'accounts-payable', name: 'Accounts Payable', description: 'Manage vendor bills and payments', category: 'finance' },
        { id: 'accounts-receivable', name: 'Accounts Receivable', description: 'Manage customer invoices and payments', category: 'finance' },
        { id: 'financial-reports', name: 'Financial Reports', description: 'Financial statements and reports', category: 'finance' },

        // CRM Menus
        { id: 'customer-list', name: 'Customer List', description: 'Manage customer database', category: 'crm' },
        { id: 'lead-management', name: 'Lead Management', description: 'Track and manage leads', category: 'crm' },
        { id: 'opportunity-tracking', name: 'Opportunity Tracking', description: 'Sales opportunities pipeline', category: 'crm' },
        { id: 'sales-pipeline', name: 'Sales Pipeline', description: 'Visual sales pipeline management', category: 'crm' },

        // Staff Management Menus
        { id: 'employee-directory', name: 'Employee Directory', description: 'Staff contact information', category: 'staff' },
        { id: 'staff-scheduling', name: 'Staff Scheduling', description: 'Employee work schedules', category: 'staff' },
        { id: 'performance-tracking', name: 'Performance Tracking', description: 'Employee performance metrics', category: 'staff' },
        { id: 'staff-reports', name: 'Staff Reports', description: 'Staff analytics and reports', category: 'staff' },

        // Service Management Menus
        { id: 'service-catalog', name: 'Service Catalog', description: 'Available services and offerings', category: 'services' },
        { id: 'service-pricing', name: 'Service Pricing', description: 'Pricing and packages', category: 'services' },
        { id: 'service-categories', name: 'Service Categories', description: 'Organize services by category', category: 'services' },
        { id: 'service-reports', name: 'Service Reports', description: 'Service usage and analytics', category: 'services' },

        // Inventory Management Menus
        { id: 'product-catalog', name: 'Product Catalog', description: 'Manage product inventory', category: 'inventory' },
        { id: 'stock-management', name: 'Stock Management', description: 'Track stock levels and movements', category: 'inventory' },
        { id: 'inventory-reports', name: 'Inventory Reports', description: 'Inventory analytics and reports', category: 'inventory' },
        { id: 'purchase-orders', name: 'Purchase Orders', description: 'Manage supplier purchase orders', category: 'inventory' },

        // Messaging System Menus
        { id: 'chat-interface', name: 'Chat Interface', description: 'Real-time messaging', category: 'messaging' },
        { id: 'message-threads', name: 'Message Threads', description: 'Conversation history', category: 'messaging' },
        { id: 'messaging-settings', name: 'Messaging Settings', description: 'Communication preferences', category: 'messaging' },
        { id: 'communication-logs', name: 'Communication Logs', description: 'Message history and logs', category: 'messaging' },

        // Video Calling Menus
        { id: 'video-interface', name: 'Video Interface', description: 'Video call interface', category: 'videocall' },
        { id: 'call-history', name: 'Call History', description: 'Previous video calls', category: 'videocall' },
        { id: 'recording-management', name: 'Recording Management', description: 'Manage call recordings', category: 'videocall' },
        { id: 'video-settings', name: 'Video Settings', description: 'Video call preferences', category: 'videocall' },

        // Reports & Analytics Menus
        { id: 'dashboard-analytics', name: 'Dashboard Analytics', description: 'Main analytics dashboard', category: 'reports' },
        { id: 'custom-reports', name: 'Custom Reports', description: 'Create custom reports', category: 'reports' },
        { id: 'data-visualization', name: 'Data Visualization', description: 'Charts and graphs', category: 'reports' },
        { id: 'export-tools', name: 'Export Tools', description: 'Export data and reports', category: 'reports' }
      ],
      menuAssignments: {},
      expandedModules: [],
      selectedModuleFilter: '',
      menuSearchQuery: '',
      showAllMenus: false,
      showConfigurationSummary: true,
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
    coreModules() {
      const core = ['finance', 'inventory', 'crm', 'bookings', 'services', 'staff', 'messaging', 'videocall']
      const modules = {}
      core.forEach(key => {
        if (this.settings.modules[key]) {
          modules[key] = this.settings.modules[key]
        }
      })
      return modules
    },
    advancedModules() {
      const advanced = ['pos', 'ecommerce', 'hcm', 'projects', 'production', 'events', 'reports']
      const modules = {}
      advanced.forEach(key => {
        if (this.settings.modules[key]) {
          modules[key] = this.settings.modules[key]
        }
      })
      return modules
    },
    enabledModulesCount() {
      return Object.values(this.settings.modules).filter(module => module.enabled).length - 2 // Subtract autoSync and allowOrganizationOverride
    },
    totalModulesCount() {
      return Object.keys(this.settings.modules).length - 2 // Subtract autoSync and allowOrganizationOverride
    },
    allModules() {
      const modules = {}
      Object.keys(this.settings.modules).forEach(key => {
        if (key !== 'autoSync' && key !== 'allowOrganizationOverride') {
          modules[key] = this.settings.modules[key]
        }
      })
      return modules
    },
    filteredModules() {
      let modules = this.allModules

      // Filter by module status
      if (this.selectedModuleFilter === 'enabled') {
        modules = Object.fromEntries(
          Object.entries(modules).filter(([, module]) => module.enabled)
        )
      } else if (this.selectedModuleFilter === 'disabled') {
        modules = Object.fromEntries(
          Object.entries(modules).filter(([, module]) => !module.enabled)
        )
      }

      return modules
    }
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
    async updateModuleStatus(moduleKey, enabled) {
      console.log(`Module ${moduleKey} ${enabled ? 'enabled' : 'disabled'}`)

      // Update the module selector store to affect navigation
      const { useModuleSelectorStore } = await import('../stores/moduleSelector')
      const moduleSelectorStore = useModuleSelectorStore()

      if (enabled) {
        // If enabling a module, make sure it's included in active modules
        if (!moduleSelectorStore.activeModules.includes(moduleKey) && !moduleSelectorStore.activeModules.includes('all')) {
          const newActiveModules = [...moduleSelectorStore.activeModules, moduleKey]
          moduleSelectorStore.setActiveModules(newActiveModules)
        }
      } else {
        // If disabling a module, remove it from active modules
        if (moduleSelectorStore.activeModules.includes('all')) {
          // If 'all' is selected, switch to specific modules and exclude this one
          const allModuleKeys = Object.keys(this.allModules).filter(key => key !== moduleKey)
          moduleSelectorStore.setActiveModules(allModuleKeys)
        } else {
          // Remove this specific module
          const newActiveModules = moduleSelectorStore.activeModules.filter(id => id !== moduleKey)
          moduleSelectorStore.setActiveModules(newActiveModules.length > 0 ? newActiveModules : ['all'])
        }
      }

      // Save to localStorage for persistence
      this.saveMenuConfiguration()

      // Show feedback in console
      console.log(`✅ Module ${enabled ? 'enabled' : 'disabled'} successfully! Navigation updated.`)
    },
    getModuleIcon(moduleKey) {
      const icons = {
        finance: 'fas fa-calculator',
        inventory: 'fas fa-boxes',
        crm: 'fas fa-users',
        bookings: 'fas fa-calendar-check',
        services: 'fas fa-concierge-bell',
        staff: 'fas fa-users-cog',
        messaging: 'fas fa-comments',
        videocall: 'fas fa-video',
        pos: 'fas fa-cash-register',
        ecommerce: 'fas fa-shopping-cart',
        hcm: 'fas fa-user-tie',
        projects: 'fas fa-project-diagram',
        production: 'fas fa-cogs',
        events: 'fas fa-calendar-star',
        reports: 'fas fa-chart-bar'
      }
      return icons[moduleKey] || 'fas fa-puzzle-piece'
    },
    isMenuAssignedToModule(moduleKey, menuId) {
      return this.menuAssignments[moduleKey]?.includes(menuId) || false
    },
    async toggleMenuAssignment(moduleKey, menuId, isChecked) {
      if (!this.menuAssignments[moduleKey]) {
        this.menuAssignments[moduleKey] = []
      }

      const assignments = this.menuAssignments[moduleKey]
      if (isChecked) {
        if (!assignments.includes(menuId)) {
          assignments.push(menuId)
        }
      } else {
        const index = assignments.indexOf(menuId)
        if (index > -1) {
          assignments.splice(index, 1)
        }
      }

      // Update the module selector store with new menu assignments
      try {
        const { useModuleSelectorStore } = await import('../stores/moduleSelector')
        const moduleSelectorStore = useModuleSelectorStore()

        // Update the store's internal menu assignments if it has that capability
        if (moduleSelectorStore.updateMenuAssignment) {
          moduleSelectorStore.updateMenuAssignment(moduleKey, menuId, isChecked)
        }

        // Save to localStorage
        localStorage.setItem('dasyin_menu_assignments', JSON.stringify(this.menuAssignments))

        console.log(`Menu ${menuId} ${isChecked ? 'assigned to' : 'removed from'} module ${moduleKey}`)
      } catch (error) {
        console.error('Error updating menu assignment:', error)
      }
    },
    getAssignedMenusCount(moduleKey) {
      return this.menuAssignments[moduleKey]?.length || 0
    },
    getTotalAssignedMenus() {
      return Object.values(this.menuAssignments).reduce((total, menus) => total + menus.length, 0)
    },
    getUnassignedMenusCount() {
      const assignedMenuIds = new Set()
      Object.values(this.menuAssignments).forEach(menus => {
        menus.forEach(menuId => assignedMenuIds.add(menuId))
      })
      return this.availableMenus.length - assignedMenuIds.size
    },
    toggleModuleExpanded(moduleKey) {
      const index = this.expandedModules.indexOf(moduleKey)
      if (index > -1) {
        this.expandedModules.splice(index, 1)
      } else {
        this.expandedModules.push(moduleKey)
      }
    },
    isModuleExpanded(moduleKey) {
      return this.expandedModules.includes(moduleKey)
    },
    selectAllMenusForModule(moduleKey) {
      const allMenuIds = this.availableMenus.map(menu => menu.id)
      this.menuAssignments[moduleKey] = [...allMenuIds]
    },
    clearAllMenusForModule(moduleKey) {
      this.menuAssignments[moduleKey] = []
    },
    getMenuCategories() {
      const categories = new Set()
      this.availableMenus.forEach(menu => {
        if (menu.category) {
          categories.add(menu.category)
        }
      })
      return Array.from(categories).sort()
    },
    getCategoryIcon(category) {
      const icons = {
        events: 'fas fa-calendar-star',
        bookings: 'fas fa-calendar-check',
        finance: 'fas fa-calculator',
        crm: 'fas fa-users',
        staff: 'fas fa-users-cog',
        services: 'fas fa-concierge-bell',
        inventory: 'fas fa-boxes',
        messaging: 'fas fa-comments',
        videocall: 'fas fa-video',
        reports: 'fas fa-chart-bar'
      }
      return icons[category] || 'fas fa-folder'
    },
    getCategoryDisplayName(category) {
      const names = {
        events: 'Events Management',
        bookings: 'Booking & Scheduling',
        finance: 'Finance & Accounting',
        crm: 'Customer Relations',
        staff: 'Staff Management',
        services: 'Service Management',
        inventory: 'Inventory Management',
        messaging: 'Messaging System',
        videocall: 'Video Calling',
        reports: 'Reports & Analytics'
      }
      return names[category] || category.charAt(0).toUpperCase() + category.slice(1)
    },
    getMenusInCategory(category) {
      return this.availableMenus.filter(menu => menu.category === category)
    },
    getFilteredMenusInCategory(category) {
      let menus = this.getMenusInCategory(category)
      if (this.menuSearchQuery) {
        menus = menus.filter(menu =>
          menu.name.toLowerCase().includes(this.menuSearchQuery.toLowerCase()) ||
          menu.description.toLowerCase().includes(this.menuSearchQuery.toLowerCase())
        )
      }
      return menus
    },
    getModuleColor(moduleKey) {
      const colors = {
        finance: '#059669',
        inventory: '#f59e0b',
        crm: '#8b5cf6',
        bookings: '#3b82f6',
        services: '#06b6d4',
        staff: '#84cc16',
        messaging: '#ec4899',
        videocall: '#10b981',
        pos: '#f97316',
        ecommerce: '#14b8a6',
        hcm: '#6366f1',
        projects: '#8b5cf6',
        production: '#ef4444',
        events: '#f59e0b',
        reports: '#64748b'
      }
      return colors[moduleKey] || '#6b7280'
    },
    resetToDefaults() {
      if (confirm('Are you sure you want to reset menu assignments to default settings?')) {
        // Reset to default menu assignments
        this.menuAssignments = {
          'events': ['event-calendar', 'event-planning', 'venue-management'],
          'bookings': ['appointment-calendar', 'booking-management', 'availability-settings'],
          'finance': ['general-ledger', 'accounts-payable', 'accounts-receivable'],
          'crm': ['customer-list', 'lead-management', 'opportunity-tracking'],
          'staff': ['employee-directory', 'staff-scheduling', 'performance-tracking'],
          'services': ['service-catalog', 'service-pricing', 'service-categories'],
          'inventory': ['product-catalog', 'stock-management', 'inventory-reports'],
          'messaging': ['chat-interface', 'message-threads', 'messaging-settings'],
          'videocall': ['video-interface', 'call-history', 'recording-management'],
          'reports': ['dashboard-analytics', 'custom-reports', 'data-visualization']
        }
        alert('Menu assignments have been reset to defaults.')
      }
    },
    async saveMenuConfiguration() {
      try {
        // Save menu assignments to localStorage
        localStorage.setItem('dasyin_menu_assignments', JSON.stringify(this.menuAssignments))

        // Update the module selector store
        const { useModuleSelectorStore } = await import('../stores/moduleSelector')
        const moduleSelectorStore = useModuleSelectorStore()

        // Ensure module selector store is synced with current state
        const enabledModules = Object.keys(this.allModules).filter(key =>
          this.settings.modules[key]?.enabled
        )

        if (enabledModules.length === Object.keys(this.allModules).length) {
          moduleSelectorStore.setActiveModules(['all'])
        } else {
          moduleSelectorStore.setActiveModules(enabledModules)
        }

        console.log('Saving menu configuration:', this.menuAssignments)
        console.log('Active modules updated:', moduleSelectorStore.activeModules)

        // Force a refresh of the navigation system
        this.$emit('configuration-saved')

        alert('Menu configuration saved successfully! Navigation has been updated.')
      } catch (error) {
        console.error('Error saving menu configuration:', error)
        alert('Error saving menu configuration. Please try again.')
      }
    },

    initializeMenuAssignments() {
      // Load from localStorage or use defaults
      const stored = localStorage.getItem('dasyin_menu_assignments')
      if (stored) {
        try {
          this.menuAssignments = JSON.parse(stored)
        } catch (error) {
          console.error('Error parsing stored menu assignments:', error)
          this.loadDefaultMenuAssignments()
        }
      } else {
        this.loadDefaultMenuAssignments()
      }
    },

    loadDefaultMenuAssignments() {
      this.menuAssignments = {
        'events': ['event-calendar', 'event-planning', 'venue-management'],
        'bookings': ['appointment-calendar', 'booking-management', 'availability-settings'],
        'finance': ['general-ledger', 'accounts-payable', 'accounts-receivable'],
        'crm': ['customer-list', 'lead-management', 'opportunity-tracking'],
        'staff': ['employee-directory', 'staff-scheduling', 'performance-tracking'],
        'services': ['service-catalog', 'service-pricing', 'service-categories'],
        'inventory': ['product-catalog', 'stock-management', 'inventory-reports'],
        'messaging': ['chat-interface', 'message-threads', 'messaging-settings'],
        'videocall': ['video-interface', 'call-history', 'recording-management'],
        'reports': ['dashboard-analytics', 'custom-reports', 'data-visualization']
      }
    }
  },

  async mounted() {
    // Initialize menu assignments
    this.initializeMenuAssignments()

    // Sync with module selector store
    try {
      const { useModuleSelectorStore } = await import('../stores/moduleSelector')
      const moduleSelectorStore = useModuleSelectorStore()

      // Initialize module selector from storage
      moduleSelectorStore.initializeFromStorage()

      // Update local module states based on active modules
      if (moduleSelectorStore.activeModules.includes('all')) {
        // Enable all modules
        Object.keys(this.allModules).forEach(key => {
          if (this.settings.modules[key]) {
            this.settings.modules[key].enabled = true
          }
        })
      } else {
        // Enable only specific modules
        Object.keys(this.allModules).forEach(key => {
          if (this.settings.modules[key]) {
            this.settings.modules[key].enabled = moduleSelectorStore.activeModules.includes(key)
          }
        })
      }

      console.log('SystemSettings initialized with module selector:', moduleSelectorStore.activeModules)
    } catch (error) {
      console.error('Error initializing module selector integration:', error)
    }
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

/* Module Management Styles */
.module-overview {
  margin-bottom: 2rem;
}

.modules-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
  margin-top: 1rem;
}

.module-card {
  background: var(--card-bg);
  border: 2px solid var(--card-border);
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.module-card:hover {
  border-color: #667eea;
  transform: translateY(-4px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
}

.module-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.module-info {
  display: flex;
  gap: 1rem;
  flex: 1;
}

.module-icon {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.25rem;
  flex-shrink: 0;
}

.module-details {
  flex: 1;
}

.module-name {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--bs-body-color);
  margin: 0 0 0.5rem 0;
  line-height: 1.2;
}

.module-description {
  font-size: 0.875rem;
  color: var(--bs-secondary);
  margin: 0;
  line-height: 1.4;
}

.module-toggle {
  flex-shrink: 0;
}

.switch {
  position: relative;
  display: inline-block;
  width: 60px;
  height: 32px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: 0.4s;
  border-radius: 32px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 24px;
  width: 24px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  transition: 0.4s;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

input:checked + .slider {
  background-color: #667eea;
}

input:checked + .slider:before {
  transform: translateX(28px);
}

.module-status {
  text-align: center;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.module-status.enabled {
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
}

.module-status.disabled {
  background: rgba(156, 163, 175, 0.1);
  color: #6b7280;
}

.section-description {
  color: var(--bs-secondary);
  font-size: 1rem;
  margin-bottom: 1.5rem;
  line-height: 1.6;
}

.setting-group h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--bs-body-color);
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--card-border);
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

  .modules-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .module-header {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }

  .module-info {
    width: 100%;
  }

  .module-toggle {
    align-self: flex-end;
  }
}

/* Menu Configuration Styles */
.menu-config-container {
  display: grid;
  gap: 2rem;
}

.module-menu-config {
  background: var(--card-bg);
  border: 2px solid var(--card-border);
  border-radius: 16px;
  padding: 2rem;
  transition: all 0.3s ease;
}

.module-menu-config:hover {
  border-color: #667eea;
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
}

.module-header-config {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--card-border);
}

.module-info-config {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.module-icon-config {
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.5rem;
  flex-shrink: 0;
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.3);
}

.module-details-config h4 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--bs-body-color);
  margin: 0 0 0.5rem 0;
}

.module-details-config p {
  font-size: 0.9rem;
  color: var(--bs-secondary);
  margin: 0;
  line-height: 1.4;
}

.module-status-badge {
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: rgba(156, 163, 175, 0.1);
  color: #6b7280;
  border: 2px solid rgba(156, 163, 175, 0.3);
}

.module-status-badge.enabled {
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
  border-color: rgba(16, 185, 129, 0.3);
}

.menu-assignment {
  margin-top: 1.5rem;
}

.menu-assignment h5 {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--bs-body-color);
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.menu-assignment h5:before {
  content: '';
  width: 4px;
  height: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 2px;
}

.menu-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
}

.menu-item {
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 12px;
  padding: 1rem;
  transition: all 0.3s ease;
}

.menu-item:hover {
  background: rgba(255, 255, 255, 0.8);
  border-color: #667eea;
  transform: translateY(-1px);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
}

.menu-checkbox {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  cursor: pointer;
  width: 100%;
}

.menu-checkbox input[type="checkbox"] {
  margin: 0;
  margin-bottom: 0.5rem;
}

.menu-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--bs-body-color);
  line-height: 1.3;
}

.menu-description {
  font-size: 0.8rem;
  color: var(--bs-secondary);
  line-height: 1.4;
}

.disabled-message {
  text-align: center;
  padding: 2rem;
  background: rgba(156, 163, 175, 0.05);
  border-radius: 12px;
  margin-top: 1.5rem;
}

.disabled-message p {
  color: var(--bs-secondary);
  font-style: italic;
  margin: 0;
}

/* Modern Module Management Styles */
/* Module Overview */
.module-overview {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 20px;
  padding: 2rem;
  margin-bottom: 2.5rem;
  color: white;
  box-shadow: 0 15px 35px rgba(102, 126, 234, 0.3);
}

.overview-header {
  display: flex;
  align-items: center;
  margin-bottom: 2rem;
}

.overview-header .header-icon {
  width: 60px;
  height: 60px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 1.5rem;
  font-size: 1.5rem;
}

.overview-header .header-text .overview-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: white;
}

.overview-header .header-text .overview-description {
  margin: 0.5rem 0 0 0;
  color: rgba(255, 255, 255, 0.9);
  font-size: 1rem;
}

.overview-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
}

.stat-card {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  transition: all 0.3s ease;
}

.stat-card:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

.stat-card .stat-icon {
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 1rem;
  font-size: 1.25rem;
}

.stat-card .stat-content .stat-number {
  font-size: 2rem;
  font-weight: 800;
  color: white;
  line-height: 1;
}

.stat-card .stat-content .stat-label {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 0.25rem;
  font-weight: 500;
}

/* Module Groups */
.module-group {
  margin-bottom: 3rem;
}

.group-header {
  display: flex;
  align-items: center;
  margin-bottom: 2rem;
  padding: 1.5rem 2rem;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border-radius: 16px;
  border: 1px solid #e2e8f0;
}

.group-header .group-icon {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 1.5rem;
  color: white;
  font-size: 1.25rem;
}

.group-header .group-info .group-title {
  margin: 0;
  font-size: 1.375rem;
  font-weight: 700;
  color: #1e293b;
}

.group-header .group-info .group-description {
  margin: 0.5rem 0 0 0;
  color: #64748b;
  font-size: 0.975rem;
}

/* Module Cards */
.module-card.modern {
  background: #ffffff;
  border: 2px solid #e2e8f0;
  border-radius: 20px;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.module-card.modern:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  border-color: #cbd5e1;
}

.module-card.modern.active {
  border-color: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1), 0 10px 15px -3px rgba(16, 185, 129, 0.2);
}

.module-card.modern.inactive {
  opacity: 0.7;
  border-color: #e5e7eb;
}

.module-content {
  padding: 2rem;
  display: flex;
  align-items: flex-start;
  gap: 1.5rem;
}

.module-icon-wrapper {
  position: relative;
  flex-shrink: 0;
}

.module-icon {
  width: 60px;
  height: 60px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  position: relative;
}

.module-status-indicator {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #ef4444;
  border: 3px solid white;
  transition: all 0.2s ease;
}

.module-status-indicator.active {
  background: #10b981;
}

.module-info .module-name {
  margin: 0 0 0.5rem 0;
  font-size: 1.125rem;
  font-weight: 700;
  color: #1e293b;
  line-height: 1.3;
}

.module-info .module-description {
  margin: 0 0 1rem 0;
  color: #64748b;
  font-size: 0.875rem;
  line-height: 1.5;
}

.module-meta {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.menu-count {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #64748b;
  font-size: 0.8rem;
  font-weight: 500;
}

.module-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1rem;
  flex-shrink: 0;
}

/* Toggle Switch */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 60px;
  height: 32px;
  cursor: pointer;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-switch .slider {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #e5e7eb;
  border-radius: 32px;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  padding: 4px;
}

.toggle-switch.checked .slider {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.slider-icon {
  width: 24px;
  height: 24px;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  color: #6b7280;
  transition: all 0.3s ease;
  transform: translateX(0);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.toggle-switch.checked .slider-icon {
  transform: translateX(28px);
  color: #10b981;
}

/* Configure Button */
.configure-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.configure-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 15px rgba(102, 126, 234, 0.4);
}

.configure-btn.expanded {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
}

/* Menu Assignment Panel */
.menu-assignment-panel {
  border-top: 2px solid #f1f5f9;
  background: #f8fafc;
  padding: 2rem;
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    max-height: 0;
    padding: 0 2rem;
  }
  to {
    opacity: 1;
    max-height: 1000px;
    padding: 2rem;
  }
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e2e8f0;
}

.panel-title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 700;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.panel-actions {
  display: flex;
  gap: 0.75rem;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: 2px solid transparent;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn.secondary {
  background: #f1f5f9;
  color: #475569;
  border-color: #e2e8f0;
}

.action-btn.secondary:hover {
  background: #e2e8f0;
  border-color: #cbd5e1;
}

.action-btn.warning {
  background: #fef3c7;
  color: #d97706;
  border-color: #fbbf24;
}

.action-btn.warning:hover {
  background: #fde68a;
  border-color: #f59e0b;
}

.action-btn.primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-color: transparent;
}

.action-btn.primary:hover {
  background: linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%);
  transform: translateY(-1px);
  box-shadow: 0 8px 15px rgba(102, 126, 234, 0.4);
}

/* Menu Categories */
.menu-categories {
  display: grid;
  gap: 1.5rem;
}

.category-section {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
}

.category-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-bottom: 1px solid #e2e8f0;
}

.category-icon {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 0.875rem;
}

.category-title {
  flex: 1;
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: #1e293b;
}

.category-count {
  background: #e2e8f0;
  color: #64748b;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.category-menus {
  padding: 1rem;
  display: grid;
  gap: 0.75rem;
}

/* Menu Items */
.menu-item {
  border-radius: 8px;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.menu-item:hover {
  background: #f8fafc;
  border-color: #e2e8f0;
}

.menu-item.selected {
  background: #eff6ff;
  border-color: #3b82f6;
}

.menu-label {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  cursor: pointer;
  margin: 0;
}

.checkbox-wrapper {
  position: relative;
  flex-shrink: 0;
}

.menu-checkbox {
  appearance: none;
  width: 20px;
  height: 20px;
  margin: 0;
  cursor: pointer;
}

.checkmark {
  position: absolute;
  top: 0;
  left: 0;
  width: 20px;
  height: 20px;
  border: 2px solid #d1d5db;
  border-radius: 4px;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  font-size: 0.75rem;
  color: transparent;
}

.menu-checkbox:checked + .checkmark {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
}

.menu-content .menu-name {
  font-weight: 600;
  color: #1e293b;
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
}

.menu-content .menu-description {
  color: #64748b;
  font-size: 0.75rem;
  line-height: 1.4;
}

/* Inactive Module Message */
.inactive-module-message {
  padding: 2rem;
  border-top: 2px solid #f1f5f9;
  background: #f8fafc;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.message-icon {
  width: 32px;
  height: 32px;
  background: #fbbf24;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 0.875rem;
  flex-shrink: 0;
}

.message-text {
  color: #64748b;
  font-size: 0.875rem;
  font-weight: 500;
}

/* Simple Clean Module Styles */
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
  margin: 0;
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
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.simple-module-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  border-color: #cbd5e1;
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
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  background: rgba(102, 126, 234, 0.1);
  flex-shrink: 0;
}

.module-details h4 {
  margin: 0 0 0.25rem 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
}

.module-details p {
  margin: 0;
  color: #64748b;
  font-size: 0.875rem;
  line-height: 1.4;
}

.module-right {
  flex-shrink: 0;
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

/* Dark Theme */
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

[data-bs-theme="dark"] .simple-module-card:hover {
  border-color: #4b5563;
}

[data-bs-theme="dark"] .simple-module-card.enabled {
  border-color: #10b981;
  background: rgba(16, 185, 129, 0.05);
}

[data-bs-theme="dark"] .module-details h4 {
  color: #f9fafb;
}

[data-bs-theme="dark"] .module-details p {
  color: #d1d5db;
}

/* Dark Theme Overrides */
[data-bs-theme="dark"] .module-overview {
  background: linear-gradient(135deg, #1e293b 0%, #374151 100%);
}

[data-bs-theme="dark"] .group-header {
  background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
  border-color: #374151;
}

[data-bs-theme="dark"] .group-header .group-info .group-title {
  color: #f9fafb;
}

[data-bs-theme="dark"] .group-header .group-info .group-description {
  color: #d1d5db;
}

[data-bs-theme="dark"] .module-card.modern {
  background: #1f2937;
  border-color: #374151;
}

[data-bs-theme="dark"] .module-card.modern:hover {
  border-color: #4b5563;
}

[data-bs-theme="dark"] .module-card.modern.active {
  border-color: #10b981;
}

[data-bs-theme="dark"] .module-info .module-name {
  color: #f9fafb;
}

[data-bs-theme="dark"] .module-info .module-description {
  color: #d1d5db;
}

[data-bs-theme="dark"] .menu-count {
  color: #d1d5db;
}

[data-bs-theme="dark"] .menu-assignment-panel {
  background: #111827;
  border-top-color: #374151;
}

[data-bs-theme="dark"] .panel-title {
  color: #f9fafb;
}

[data-bs-theme="dark"] .category-section {
  background: #1f2937;
  border-color: #374151;
}

[data-bs-theme="dark"] .category-header {
  background: linear-gradient(135deg, #111827 0%, #1f2937 100%);
  border-bottom-color: #374151;
}

[data-bs-theme="dark"] .category-title {
  color: #f9fafb;
}

[data-bs-theme="dark"] .category-count {
  background: #374151;
  color: #d1d5db;
}

[data-bs-theme="dark"] .menu-item:hover {
  background: #374151;
  border-color: #4b5563;
}

[data-bs-theme="dark"] .menu-item.selected {
  background: #1e3a8a;
  border-color: #3b82f6;
}

[data-bs-theme="dark"] .menu-content .menu-name {
  color: #f9fafb;
}

[data-bs-theme="dark"] .menu-content .menu-description {
  color: #d1d5db;
}

[data-bs-theme="dark"] .checkmark {
  background: #374151;
  border-color: #4b5563;
}

[data-bs-theme="dark"] .inactive-module-message {
  background: #111827;
  border-top-color: #374151;
}

[data-bs-theme="dark"] .message-text {
  color: #d1d5db;
}

@media (max-width: 768px) {
  .module-header-config {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .menu-grid {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  .module-menu-config {
    padding: 1.5rem;
  }

  .overview-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .overview-header .header-icon {
    margin-right: 0;
  }

  .group-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .group-header .group-icon {
    margin-right: 0;
  }

  .modules-grid {
    grid-template-columns: 1fr;
  }

  .module-content {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .module-actions {
    flex-direction: row;
    width: 100%;
    justify-content: center;
  }
}
</style>