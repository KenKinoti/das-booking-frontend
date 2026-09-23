<template>
  <header class="header">
    <!-- Left Section: Menu Toggle & Logo -->
    <div class="header-left">
      <button class="menu-toggle" @click.stop="$emit('toggle-sidebar')">
        <i class="fas fa-bars"></i>
      </button>
      <div class="app-logo">
        <i class="fas fa-building-user"></i>
      </div>
    </div>

    <!-- Center Section: Module Selector -->
    <div class="header-center">
      <button class="module-btn" @click="toggleModuleSelector">
        <i class="fas fa-th-large"></i>
        Modules
      </button>
      <!-- Module Dropdown -->
      <div v-if="showModuleSelector" class="module-dropdown">
        <!-- Header with Select All and Apply buttons -->
        <div class="dropdown-header">
          <span class="modules-count">{{ selectedModules.length }} of {{ totalModules }} modules selected</span>
          <div class="dropdown-actions">
            <button class="select-all-btn" @click="selectAllModules">
              <i class="fas fa-check"></i>
              Select All
            </button>
            <button class="apply-changes-btn" @click="applyChanges">
              <i class="fas fa-check"></i>
              Apply Changes
            </button>
          </div>
        </div>

        <div class="dropdown-item" @click="toggleModule('finance')" :class="{ active: selectedModules.includes('finance') }">
          <input type="checkbox" :checked="selectedModules.includes('finance')" @click.stop="toggleModule('finance')" class="module-checkbox">
          <i class="fas fa-calculator"></i>
          <div class="module-info">
            <div class="module-title">Finance & Accounting</div>
            <div class="module-desc">Financial management, accounting, invoicing</div>
          </div>
        </div>
        <div class="dropdown-item" @click="toggleModule('inventory')" :class="{ active: selectedModules.includes('inventory') }">
          <input type="checkbox" :checked="selectedModules.includes('inventory')" @click.stop="toggleModule('inventory')" class="module-checkbox">
          <i class="fas fa-boxes"></i>
          <div class="module-info">
            <div class="module-title">Inventory & Supply Chain</div>
            <div class="module-desc">Inventory management, suppliers, procurement</div>
          </div>
        </div>
        <div class="dropdown-item" @click="toggleModule('crm')" :class="{ active: selectedModules.includes('crm') }">
          <input type="checkbox" :checked="selectedModules.includes('crm')" @click.stop="toggleModule('crm')" class="module-checkbox">
          <i class="fas fa-handshake"></i>
          <div class="module-info">
            <div class="module-title">CRM & Sales</div>
            <div class="module-desc">Customer relationship management, sales pipeline</div>
          </div>
        </div>
        <div class="dropdown-item" @click="toggleModule('services')" :class="{ active: selectedModules.includes('services') }">
          <input type="checkbox" :checked="selectedModules.includes('services')" @click.stop="toggleModule('services')" class="module-checkbox">
          <i class="fas fa-cogs"></i>
          <div class="module-info">
            <div class="module-title">Services & Projects</div>
            <div class="module-desc">Service management and categorization</div>
          </div>
        </div>
        <div class="dropdown-item" @click="toggleModule('hr')" :class="{ active: selectedModules.includes('hr') }">
          <input type="checkbox" :checked="selectedModules.includes('hr')" @click.stop="toggleModule('hr')" class="module-checkbox">
          <i class="fas fa-users-cog"></i>
          <div class="module-info">
            <div class="module-title">Human Resources</div>
            <div class="module-desc">Staff and HR management</div>
          </div>
        </div>
        <div class="dropdown-item" @click="toggleModule('ecommerce')" :class="{ active: selectedModules.includes('ecommerce') }">
          <input type="checkbox" :checked="selectedModules.includes('ecommerce')" @click.stop="toggleModule('ecommerce')" class="module-checkbox">
          <i class="fas fa-shopping-cart"></i>
          <div class="module-info">
            <div class="module-title">Sales & E-commerce</div>
            <div class="module-desc">POS and e-commerce features</div>
          </div>
        </div>
        <div class="dropdown-item" @click="toggleModule('analytics')" :class="{ active: selectedModules.includes('analytics') }">
          <input type="checkbox" :checked="selectedModules.includes('analytics')" @click.stop="toggleModule('analytics')" class="module-checkbox">
          <i class="fas fa-chart-line"></i>
          <div class="module-info">
            <div class="module-title">Analytics & Reports</div>
            <div class="module-desc">Business intelligence and reporting</div>
          </div>
        </div>
        <div class="dropdown-item" @click="toggleModule('events')" :class="{ active: selectedModules.includes('events') }">
          <input type="checkbox" :checked="selectedModules.includes('events')" @click.stop="toggleModule('events')" class="module-checkbox">
          <i class="fas fa-calendar-alt"></i>
          <div class="module-info">
            <div class="module-title">Events Management</div>
            <div class="module-desc">Event creation, ticket management, registrations</div>
          </div>
        </div>
        <div class="dropdown-item" @click="toggleModule('admin')" :class="{ active: selectedModules.includes('admin') }">
          <input type="checkbox" :checked="selectedModules.includes('admin')" @click.stop="toggleModule('admin')" class="module-checkbox">
          <i class="fas fa-cog"></i>
          <div class="module-info">
            <div class="module-title">System Administration</div>
            <div class="module-desc">System settings, user management, audit logs</div>
          </div>
        </div>
        <div class="dropdown-item" @click="toggleModule('communication')" :class="{ active: selectedModules.includes('communication') }">
          <input type="checkbox" :checked="selectedModules.includes('communication')" @click.stop="toggleModule('communication')" class="module-checkbox">
          <i class="fas fa-comments"></i>
          <div class="module-info">
            <div class="module-title">Communication Hub</div>
            <div class="module-desc">Messages, calls, video conferencing, team chat</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Right Section: Theme & User -->
    <div class="header-right">
      <!-- Theme Toggle -->
      <button class="theme-btn" @click="toggleTheme">
        <i class="fas fa-sun" v-if="isDark"></i>
        <i class="fas fa-moon" v-else></i>
      </button>

      <!-- User Menu -->
      <div class="user-menu" @click="toggleUserDropdown">
        <div class="user-avatar">{{ userInitials }}</div>
        <span class="user-name">{{ userName }}</span>
        <i class="fas fa-chevron-down"></i>
      </div>

      <!-- User Dropdown -->
      <div v-if="showUserDropdown" class="user-dropdown">
        <div class="dropdown-item" @click="navigateToProfile">
          <i class="fas fa-user"></i>
          Profile
        </div>
        <div class="dropdown-item logout" @click="handleLogout">
          <i class="fas fa-sign-out-alt"></i>
          Logout
        </div>
      </div>
    </div>
  </header>
</template>

<script>
import { useAuthStore } from '../stores/auth'

export default {
  name: 'AppHeader',
  props: {
    pageTitle: {
      type: String,
      default: 'Dashboard'
    },
    sidebarOpen: {
      type: Boolean,
      default: true
    }
  },
  data() {
    return {
      showUserDropdown: false,
      showModuleSelector: false,
      selectedModules: JSON.parse(localStorage.getItem('selectedModules') || '["crm"]')
    }
  },
  computed: {
    authStore() {
      return useAuthStore()
    },
    userName() {
      return this.authStore.userName || 'User'
    },
    userInitials() {
      if (this.authStore.user) {
        return (this.authStore.user.first_name?.[0] || '') + (this.authStore.user.last_name?.[0] || '')
      }
      return 'U'
    },
    isDark() {
      return document.documentElement.getAttribute('data-bs-theme') === 'dark'
    },
    totalModules() {
      return 10 // Total number of available modules
    }
  },
  methods: {
    toggleTheme() {
      const currentTheme = document.documentElement.getAttribute('data-bs-theme')
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark'
      document.documentElement.setAttribute('data-bs-theme', newTheme)
      localStorage.setItem('theme', newTheme)
    },
    toggleUserDropdown() {
      this.showUserDropdown = !this.showUserDropdown
    },
    toggleModuleSelector() {
      this.showModuleSelector = !this.showModuleSelector
    },
    async handleLogout() {
      try {
        await this.authStore.logout()
        this.$router.push('/login')
      } catch (error) {
        console.error('Logout error:', error)
      }
    },
    navigateToProfile() {
      this.showUserDropdown = false
      this.$router.push('/profile')
    },
    toggleModule(module) {
      const index = this.selectedModules.indexOf(module)
      if (index > -1) {
        // Remove module if already selected
        this.selectedModules.splice(index, 1)
      } else {
        // Add module if not selected
        this.selectedModules.push(module)
      }

      // Save to localStorage
      localStorage.setItem('selectedModules', JSON.stringify(this.selectedModules))

      // Emit events for other components to listen
      this.$emit('modules-selected', this.selectedModules)

      // Dispatch global event
      window.dispatchEvent(new CustomEvent('modules-changed', {
        detail: { modules: this.selectedModules }
      }))

      console.log('Selected modules:', this.selectedModules)
    },
    selectAllModules() {
      // Select all available modules
      this.selectedModules = ['finance', 'inventory', 'crm', 'services', 'hr', 'ecommerce', 'analytics', 'events', 'admin', 'communication']

      // Save to localStorage
      localStorage.setItem('selectedModules', JSON.stringify(this.selectedModules))

      // Emit events
      this.$emit('modules-selected', this.selectedModules)
      window.dispatchEvent(new CustomEvent('modules-changed', {
        detail: { modules: this.selectedModules }
      }))

      console.log('All modules selected:', this.selectedModules)
    },
    applyChanges() {
      // This method can be used to apply any pending changes
      // For now, it just closes the dropdown and confirms the selection
      this.showModuleSelector = false

      // Optional: Show a confirmation message or trigger additional actions
      console.log('Changes applied. Selected modules:', this.selectedModules)

      // Could emit a specific event for "apply changes" if needed
      this.$emit('modules-applied', this.selectedModules)
    }
  },
  mounted() {
    document.addEventListener('click', (e) => {
      if (!this.$el.contains(e.target)) {
        this.showUserDropdown = false
        this.showModuleSelector = false
      }
    })
  }
}
</script>

<style scoped>
.header {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  padding: 0 0 0 16px !important;
  width: 100% !important;
  height: 64px !important;
  max-height: 64px !important;
  min-height: 64px !important;
  overflow: visible !important;
  box-sizing: border-box !important;
}

.header-left {
  display: flex !important;
  align-items: center !important;
  gap: 12px !important;
  flex-shrink: 0 !important;
  min-width: 120px !important;
}

.menu-toggle {
  background: none !important;
  border: none !important;
  padding: 8px !important;
  border-radius: 8px !important;
  cursor: pointer !important;
  color: #6b7280 !important;
  font-size: 18px !important;
  flex-shrink: 0 !important;
}

.menu-toggle:hover {
  background: #f3f4f6 !important;
  color: #374151 !important;
}

.app-logo {
  color: #3b82f6 !important;
  font-size: 20px !important;
  flex-shrink: 0 !important;
}

.header-center {
  flex: 1 !important;
  display: flex !important;
  justify-content: center !important;
  max-width: none !important;
  margin: 0 8px !important;
  overflow: visible !important;
  position: relative !important;
}

.module-btn {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  padding: 8px 16px !important;
  background: #3b82f6 !important;
  color: white !important;
  border: none !important;
  border-radius: 8px !important;
  cursor: pointer !important;
  font-size: 14px !important;
  white-space: nowrap !important;
}

.module-btn:hover {
  background: #2563eb !important;
}

.header-right {
  display: flex !important;
  align-items: center !important;
  gap: 12px !important;
  justify-content: flex-end !important;
  flex-shrink: 0 !important;
  min-width: 200px !important;
  width: auto !important;
  z-index: 1002 !important;
  margin-left: auto !important;
  padding-right: 16px !important;
}

.theme-btn {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 40px !important;
  height: 40px !important;
  background: #f8fafc !important;
  border: 1px solid #e5e7eb !important;
  border-radius: 8px !important;
  color: #374151 !important;
  cursor: pointer !important;
  visibility: visible !important;
  opacity: 1 !important;
  position: relative !important;
  z-index: 1002 !important;
}

.theme-btn:hover {
  background: #f1f5f9;
  border-color: #d1d5db;
}

.user-menu {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  padding: 6px 12px !important;
  background: #f8fafc !important;
  border: 1px solid #e5e7eb !important;
  border-radius: 8px !important;
  cursor: pointer !important;
  min-width: 120px !important;
  visibility: visible !important;
  opacity: 1 !important;
  position: relative !important;
  z-index: 1002 !important;
}

.user-menu:hover {
  background: #f1f5f9;
  border-color: #d1d5db;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  flex-shrink: 0;
}

.user-name {
  font-weight: 500;
  color: #111827;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-dropdown {
  position: absolute !important;
  top: 100% !important;
  right: 0 !important;
  z-index: 10000 !important;
  min-width: 200px !important;
  margin-top: 8px !important;
  background: white !important;
  border: 1px solid #e5e7eb !important;
  border-radius: 8px !important;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15) !important;
  padding: 8px 0 !important;
  visibility: visible !important;
  opacity: 1 !important;
}

.module-dropdown {
  position: absolute !important;
  top: 100% !important;
  left: 50% !important;
  transform: translateX(-50%) !important;
  z-index: 10000 !important;
  min-width: 400px !important;
  max-width: 500px !important;
  margin-top: 8px !important;
  background: white !important;
  border: 1px solid #e5e7eb !important;
  border-radius: 12px !important;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15) !important;
  padding: 0 !important;
  visibility: visible !important;
  opacity: 1 !important;
  max-height: 80vh !important;
  overflow-y: auto !important;
}

/* Dropdown header */
.dropdown-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #f8fafc;
  border-bottom: 1px solid #e5e7eb;
  border-radius: 12px 12px 0 0;
}

.modules-count {
  font-size: 13px;
  color: #6b7280;
  font-weight: 500;
}

.dropdown-actions {
  display: flex;
  gap: 8px;
}

.select-all-btn, .apply-changes-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid;
}

.select-all-btn {
  background: white;
  color: #374151;
  border-color: #d1d5db;
}

.select-all-btn:hover {
  background: #f9fafb;
  border-color: #9ca3af;
}

.apply-changes-btn {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.apply-changes-btn:hover {
  background: #2563eb;
  border-color: #2563eb;
}

/* Update dropdown item padding */
.module-dropdown .dropdown-item {
  padding: 12px 20px;
}

.module-info {
  flex: 1;
  text-align: left;
}

.module-title {
  font-weight: 600;
  font-size: 14px;
  color: #111827;
  margin-bottom: 2px;
}

.module-desc {
  font-size: 12px;
  color: #6b7280;
  line-height: 1.3;
}

.dropdown-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  color: #374151;
  font-size: 14px;
  transition: all 0.2s ease;
}

.dropdown-item:hover {
  background: #f8fafc;
}

.dropdown-item.active {
  background: #dbeafe;
  border-left: 3px solid #3b82f6;
}

.dropdown-item.active .module-title {
  color: #1d4ed8;
}

.dropdown-item i {
  margin-top: 2px;
  font-size: 16px;
  width: 20px;
  text-align: center;
}

.module-checkbox {
  margin-right: 8px;
  margin-top: 2px;
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.dropdown-item.logout {
  color: #dc2626;
}

.dropdown-item.logout:hover {
  background: #fef2f2;
}

/* Tablet responsive */
@media (max-width: 1024px) {
  .header-center {
    max-width: 200px !important;
    margin: 0 8px !important;
  }

  .header-right {
    min-width: 180px !important;
    gap: 8px !important;
  }
}

/* Mobile responsive */
@media (max-width: 768px) {
  .header-center {
    max-width: 150px !important;
    margin: 0 4px !important;
  }

  .header-right {
    min-width: 140px !important;
    gap: 6px !important;
  }

  .user-name {
    display: none !important;
  }

  .user-menu {
    min-width: auto !important;
    padding: 6px 8px !important;
  }

  .theme-btn {
    width: 36px !important;
    height: 36px !important;
  }
}

/* Small mobile */
@media (max-width: 480px) {
  .header-left {
    min-width: 80px !important;
  }

  .header-center {
    display: none !important;
  }

  .header-right {
    min-width: 120px !important;
    flex: 1 !important;
    justify-content: flex-end !important;
  }
}
</style>