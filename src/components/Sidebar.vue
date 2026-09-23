<template>
  <nav class="sidebar" :class="{ 'collapsed': !isOpen, 'open': isOpen }">
    <div class="sidebar-header">
      <div class="logo">
        <div class="logo-icon">
          <i class="fas fa-building-user"></i>
        </div>
        <span class="logo-text">DAS ERP</span>
      </div>
    </div>

    <div class="nav-menu">
      <!-- Core Dashboard -->
      <div class="nav-item" v-if="shouldShowDashboard">
        <a href="#" class="nav-link" :class="{ active: currentPage === 'dashboard' }" @click="navigate('dashboard')">
          <i class="fas fa-chart-line nav-icon"></i>
          Dashboard
        </a>
      </div>

      <!-- BOOKING MODULE -->
      <div v-if="shouldShowBookingModule" class="nav-section">
        <div class="nav-divider"></div>
        <div class="nav-section-title">Booking Management</div>

        <div class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'bookings' }" @click="navigate('bookings')">
            <i class="fas fa-calendar-alt nav-icon"></i>
            Bookings
          </a>
        </div>

        <div class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'customers' }" @click="navigate('customers')">
            <i class="fas fa-users nav-icon"></i>
            Customers
          </a>
        </div>

        <div class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'services' }" @click="navigate('services')">
            <i class="fas fa-concierge-bell nav-icon"></i>
            Services Overview
          </a>
        </div>

        <!-- Service Categories Submenu -->
        <div class="nav-item nav-dropdown">
          <a href="#" class="nav-link nav-dropdown-toggle" @click.prevent="toggleServiceCategories" :class="{ expanded: showServiceCategories }">
            <i class="fas fa-list nav-icon"></i>
            <span class="nav-text">Service Categories</span>
            <i class="fas fa-chevron-down nav-arrow" :class="{ rotated: showServiceCategories }"></i>
          </a>

          <div class="nav-submenu" v-show="showServiceCategories">
            <div class="nav-item submenu-item">
              <a href="#" class="nav-link submenu-link" :class="{ active: currentPage === 'automotive-repair' }" @click="navigate('automotive-repair')">
                <i class="fas fa-wrench nav-icon"></i>
                Automotive Repair
              </a>
            </div>

            <div class="nav-item submenu-item">
              <a href="#" class="nav-link submenu-link" :class="{ active: currentPage === 'auto-maintenance' }" @click="navigate('auto-maintenance')">
                <i class="fas fa-car nav-icon"></i>
                Auto Maintenance
              </a>
            </div>

            <div class="nav-item submenu-item">
              <a href="#" class="nav-link submenu-link" :class="{ active: currentPage === 'hair-services' }" @click="navigate('hair-services')">
                <i class="fas fa-cut nav-icon"></i>
                Hair Services
              </a>
            </div>

            <div class="nav-item submenu-item">
              <a href="#" class="nav-link submenu-link" :class="{ active: currentPage === 'beauty-spa' }" @click="navigate('beauty-spa')">
                <i class="fas fa-spa nav-icon"></i>
                Beauty & Spa
              </a>
            </div>

            <div class="nav-item submenu-item">
              <a href="#" class="nav-link submenu-link" :class="{ active: currentPage === 'nail-services' }" @click="navigate('nail-services')">
                <i class="fas fa-hand-sparkles nav-icon"></i>
                Nail Services
              </a>
            </div>

            <div class="nav-item submenu-item">
              <a href="#" class="nav-link submenu-link" :class="{ active: currentPage === 'manage-categories' }" @click="navigate('manage-categories')">
                <i class="fas fa-cogs nav-icon"></i>
                Manage Categories
              </a>
            </div>
          </div>
        </div>

        <div class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'staff' }" @click="navigate('staff')">
            <i class="fas fa-user-tie nav-icon"></i>
            Staff
          </a>
        </div>
      </div>

      <!-- INVENTORY MODULE -->
      <div v-if="shouldShowInventory" class="nav-section">
        <div class="nav-divider"></div>
        <div class="nav-section-title">Inventory & Sales</div>

        <div class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'inventory' }" @click="navigate('inventory')">
            <i class="fas fa-box nav-icon"></i>
            Inventory
          </a>
        </div>

        <div class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'pos' }" @click="navigate('pos')">
            <i class="fas fa-shopping-cart nav-icon"></i>
            Point of Sale
          </a>
        </div>

        <div class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'suppliers' }" @click="navigate('suppliers')">
            <i class="fas fa-truck nav-icon"></i>
            Suppliers
          </a>
        </div>
      </div>

      <!-- FINANCE MODULE -->
      <div v-if="shouldShowBanking" class="nav-section">
        <div class="nav-divider"></div>
        <div class="nav-section-title">Finance & Billing</div>

        <div class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'billing' }" @click="navigate('billing')">
            <i class="fas fa-file-invoice-dollar nav-icon"></i>
            Billing
          </a>
        </div>

        <div class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'banking' }" @click="navigate('banking')">
            <i class="fas fa-university nav-icon"></i>
            Banking
          </a>
        </div>

      </div>

      <!-- HUMAN RESOURCES MODULE -->
      <div v-if="shouldShowStaff" class="nav-section">
        <div class="nav-divider"></div>
        <div class="nav-section-title">Human Resources</div>

        <div class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'staff' }" @click="navigate('staff')">
            <i class="fas fa-users-cog nav-icon"></i>
            Staff Management
          </a>
        </div>

        <div class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'payroll' }" @click="navigate('payroll')">
            <i class="fas fa-money-check-alt nav-icon"></i>
            Payroll
          </a>
        </div>

        <div class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'attendance' }" @click="navigate('attendance')">
            <i class="fas fa-clock nav-icon"></i>
            Attendance
          </a>
        </div>

        <div class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'performance' }" @click="navigate('performance')">
            <i class="fas fa-chart-line nav-icon"></i>
            Performance
          </a>
        </div>
      </div>

      <!-- ANALYTICS & REPORTS MODULE -->
      <div v-if="shouldShowReports" class="nav-section">
        <div class="nav-divider"></div>
        <div class="nav-section-title">Analytics & Reports</div>

        <div class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'analytics' }" @click="navigate('analytics')">
            <i class="fas fa-chart-bar nav-icon"></i>
            Analytics Dashboard
          </a>
        </div>

        <div class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'financial-reports' }" @click="navigate('financial-reports')">
            <i class="fas fa-file-invoice-dollar nav-icon"></i>
            Financial Reports
          </a>
        </div>

        <div class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'sales-reports' }" @click="navigate('sales-reports')">
            <i class="fas fa-chart-pie nav-icon"></i>
            Sales Reports
          </a>
        </div>

        <div class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'custom-reports' }" @click="navigate('custom-reports')">
            <i class="fas fa-file-alt nav-icon"></i>
            Custom Reports
          </a>
        </div>
      </div>

      <!-- EVENTS MANAGEMENT MODULE -->
      <div v-if="shouldShowEvents" class="nav-section">
        <div class="nav-divider"></div>
        <div class="nav-section-title">Events Management</div>

        <div class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'events' }" @click="navigate('events')">
            <i class="fas fa-calendar-alt nav-icon"></i>
            Events
          </a>
        </div>

        <div class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'tickets' }" @click="navigate('tickets')">
            <i class="fas fa-ticket-alt nav-icon"></i>
            Ticket Management
          </a>
        </div>

        <div class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'registrations' }" @click="navigate('registrations')">
            <i class="fas fa-user-plus nav-icon"></i>
            Registrations
          </a>
        </div>

        <div class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'venues' }" @click="navigate('venues')">
            <i class="fas fa-building nav-icon"></i>
            Venues
          </a>
        </div>
      </div>

      <!-- COMMUNICATION HUB MODULE -->
      <div v-if="shouldShowCommunication" class="nav-section">
        <div class="nav-divider"></div>
        <div class="nav-section-title">Communication Hub</div>

        <div class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'messages' }" @click="navigate('messages')">
            <i class="fas fa-comments nav-icon"></i>
            Messages
          </a>
        </div>

        <div class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'calls' }" @click="navigate('calls')">
            <i class="fas fa-phone nav-icon"></i>
            Calls
          </a>
        </div>

        <div class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'video-conference' }" @click="navigate('video-conference')">
            <i class="fas fa-video nav-icon"></i>
            Video Conference
          </a>
        </div>

        <div class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'team-chat' }" @click="navigate('team-chat')">
            <i class="fas fa-users nav-icon"></i>
            Team Chat
          </a>
        </div>
      </div>

      <!-- ADMINISTRATION -->
      <div v-if="shouldShowDocuments" class="nav-section">
        <div class="nav-divider"></div>
        <div class="nav-section-title">Administration</div>

        <div class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'documents' }" @click="navigate('documents')">
            <i class="fas fa-folder nav-icon"></i>
            Documents
          </a>
        </div>

        <div class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'settings' }" @click="navigate('settings')">
            <i class="fas fa-cog nav-icon"></i>
            Settings
          </a>
        </div>
      </div>

      <!-- SUPER ADMIN SECTION -->
      <div v-if="shouldShowSuperAdminSection" class="nav-section">
        <div class="nav-divider"></div>
        <div class="nav-section-title">Super Admin</div>

        <div class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'super-admin' }" @click="navigate('super-admin')">
            <i class="fas fa-crown nav-icon"></i>
            Organizations
          </a>
        </div>

        <div class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'users-admin' }" @click="navigate('users-admin')">
            <i class="fas fa-users-cog nav-icon"></i>
            User Management
          </a>
        </div>

        <div class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'system-settings' }" @click="navigate('system-settings')">
            <i class="fas fa-server nav-icon"></i>
            System Settings
          </a>
        </div>

        <div class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'audit-logs' }" @click="navigate('audit-logs')">
            <i class="fas fa-history nav-icon"></i>
            Audit Logs
          </a>
        </div>

        <div class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'database' }" @click="navigate('database')">
            <i class="fas fa-database nav-icon"></i>
            Database
          </a>
        </div>
      </div>

      <!-- Bottom spacer -->
      <div class="nav-spacer"></div>

      <!-- Collapse button at bottom -->
      <div class="nav-collapse">
        <button class="collapse-btn" @click="$emit('toggle-sidebar')" title="Collapse sidebar">
          <i class="fas fa-angle-double-left"></i>
        </button>
      </div>
    </div>
  </nav>
</template>

<script>
import { useAuthStore } from '@/stores/auth'
import { useModuleSelectorStore } from '@/stores/moduleSelector'
import { useSystemModulesStore } from '@/stores/systemModules'

export default {
  name: 'SidebarNavigation',
  props: {
    isOpen: {
      type: Boolean,
      default: true
    },
    currentPage: {
      type: String,
      default: 'dashboard'
    }
  },
  data() {
    return {
      selectedModules: JSON.parse(localStorage.getItem('selectedModules') || '["crm"]'),
      showServiceCategories: false
    }
  },
  emits: ['navigate', 'toggle-sidebar'],
  computed: {
    authStore() {
      return useAuthStore()
    },
    moduleStore() {
      return useModuleSelectorStore()
    },
    systemModulesStore() {
      return useSystemModulesStore()
    },
    isSuperAdmin() {
      const result = this.authStore.isSuperAdmin
      console.log('🔍 SIDEBAR DEBUG: isSuperAdmin =', result, 'user role =', this.authStore.user?.role)
      return result
    },
    // Dashboard visibility
    shouldShowDashboard() {
      return true // Always show dashboard
    },
    // Module visibility based on selected modules
    shouldShowBookingModule() {
      return this.selectedModules.includes('crm') || this.selectedModules.includes('services')
    },
    shouldShowInventory() {
      return this.selectedModules.includes('inventory') || this.selectedModules.includes('ecommerce')
    },
    shouldShowBanking() {
      return this.selectedModules.includes('finance')
    },
    shouldShowStaff() {
      return this.selectedModules.includes('hr')
    },
    shouldShowReports() {
      return this.selectedModules.includes('analytics') || this.selectedModules.includes('finance')
    },
    shouldShowDocuments() {
      return this.selectedModules.includes('admin')
    },
    shouldShowEvents() {
      return this.selectedModules.includes('events')
    },
    shouldShowCommunication() {
      return this.selectedModules.includes('communication')
    },
    shouldShowEcommerce() {
      return this.selectedModules.includes('ecommerce')
    },
    // Super Admin section
    shouldShowSuperAdminSection() {
      return this.isSuperAdmin
    }
  },
  methods: {
    // Enhanced module visibility check that considers both module selector and system modules
    isModuleVisible(moduleKey) {
      // Super admin always sees everything
      if (this.isSuperAdmin) return true

      // Check if module is enabled at system level
      if (!this.systemModulesStore.isModuleEnabled(moduleKey)) return false

      // Check if module is selected in module selector
      return this.moduleStore.isModuleActive(moduleKey)
    },

    navigate(page) {
      this.$emit('navigate', page);
    },

    toggleServiceCategories() {
      this.showServiceCategories = !this.showServiceCategories;
    },

    goToDashboard() {
      this.$emit('navigate', 'dashboard');
    },

    handleModuleSelectionChange(event) {
      console.log('🔍 SIDEBAR DEBUG: Module selection changed:', event.detail)
      // Force reactive update by accessing the store again
      this.$forceUpdate()
    },
    handleModuleChanged(event) {
      console.log('🔍 SIDEBAR DEBUG: Module changed to:', event.detail.module)
      this.selectedModule = event.detail.module
      this.$forceUpdate()
    },
    handleModulesChanged(event) {
      console.log('🔍 SIDEBAR DEBUG: Modules changed to:', event.detail.modules)
      this.selectedModules = event.detail.modules
      this.$forceUpdate()
    }
  },
  async mounted() {
    // Initialize both module stores from localStorage
    this.moduleStore.initializeFromStorage()
    this.systemModulesStore.initializeFromStorage()

    // Listen for global module selection changes
    window.addEventListener('module-selection-changed', this.handleModuleSelectionChange)
    window.addEventListener('module-changed', this.handleModuleChanged)
    window.addEventListener('modules-changed', this.handleModulesChanged)

    // Add debug logging for module store state
    console.log('🔍 SIDEBAR DEBUG: Module store state:', {
      activeModules: this.moduleStore.activeModules,
      availableModules: this.moduleStore.availableModules,
      systemModules: this.systemModulesStore.getEnabledModules
    })
  },

  beforeUnmount() {
    // Clean up event listeners
    window.removeEventListener('module-selection-changed', this.handleModuleSelectionChange)
    window.removeEventListener('module-changed', this.handleModuleChanged)
    window.removeEventListener('modules-changed', this.handleModulesChanged)
  },
  watch: {
    // Watch for changes in active modules to update sidebar visibility
    'moduleStore.activeModules': {
      handler(newModules) {
        console.log('🔍 SIDEBAR DEBUG: Active modules changed:', newModules)
        this.$forceUpdate() // Force component re-render
      },
      deep: true
    }
  }
}
</script>

<style scoped>
/* Modern Dark Sidebar Styles - Visual only (positioning handled by .app-sidebar) */
.sidebar {
  background: #2c3e50;
  border-right: none;
  transition: all 0.3s ease;
  overflow-y: auto;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* Header */
.sidebar-header {
  padding: 20px 16px;
  border-bottom: 1px solid #34495e;
  background: #2c3e50;
  display: flex;
  align-items: center;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  width: 24px;
  height: 24px;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.logo-text {
  color: #ffffff;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: -0.025em;
}

/* Navigation Menu */
.nav-menu {
  padding: 0;
  display: flex;
  flex-direction: column;
}

.nav-item {
  margin: 0;
}

.nav-link {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  color: #bdc3c7;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  border: none;
  background: none;
  width: 100%;
}

.nav-link:hover {
  background: #34495e;
  color: #ffffff;
}

.nav-link.active {
  background: #3498db;
  color: #ffffff;
  border-radius: 0 25px 25px 0;
  margin-right: 8px;
}

.nav-icon {
  width: 20px;
  height: 20px;
  margin-right: 12px;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.nav-text {
  flex: 1;
  text-align: left;
}

.nav-arrow {
  width: 16px;
  height: 16px;
  font-size: 12px;
  color: #7f8c8d;
  margin-left: auto;
}

.nav-badge {
  background: #3498db;
  color: #ffffff;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 10px;
  margin-left: auto;
  min-width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Bottom spacer and collapse button */
.nav-spacer {
  flex: 1;
}

.nav-collapse {
  padding: 16px;
  border-top: 1px solid #34495e;
}

.collapse-btn {
  width: 100%;
  padding: 12px;
  background: #34495e;
  border: none;
  border-radius: 6px;
  color: #bdc3c7;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.collapse-btn:hover {
  background: #3498db;
  color: #ffffff;
}

/* Section divider and title */
.nav-section-divider {
  height: 1px;
  background: #34495e;
  margin: 16px 12px;
}

.nav-section-title {
  padding: 8px 16px 4px 16px;
  font-size: 11px;
  font-weight: 600;
  color: #7f8c8d;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

/* Dark theme compatibility */
[data-bs-theme="dark"] .sidebar {
  background: #1a1a1a;
  border-right: 1px solid #333333;
}

[data-bs-theme="dark"] .sidebar-header {
  background: #1a1a1a;
  border-bottom: 1px solid #333333;
}

[data-bs-theme="dark"] .nav-link:hover {
  background: #333333;
}

[data-bs-theme="dark"] .collapse-btn {
  background: #333333;
}

[data-bs-theme="dark"] .collapse-btn:hover {
  background: #3498db;
}

[data-bs-theme="dark"] .nav-collapse {
  border-top: 1px solid #333333;
}

[data-bs-theme="dark"] .nav-section-divider {
  background: #333333;
}

[data-bs-theme="dark"] .nav-section-title {
  color: #666666;
}

/* Dropdown Navigation Styles */
.nav-dropdown {
  margin: 0;
}

.nav-dropdown-toggle {
  display: flex !important;
  align-items: center;
  padding: 12px 16px;
  color: #bdc3c7;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  border: none;
  background: none;
  width: 100%;
  cursor: pointer;
}

.nav-dropdown-toggle:hover {
  background: #34495e;
  color: #ffffff;
}

.nav-dropdown-toggle.expanded {
  background: #34495e;
  color: #ffffff;
}

.nav-dropdown-toggle .nav-arrow {
  margin-left: auto;
  transition: transform 0.2s ease;
  font-size: 12px;
  color: #7f8c8d;
}

.nav-dropdown-toggle .nav-arrow.rotated {
  transform: rotate(180deg);
}

/* Submenu styles */
.nav-submenu {
  background: #243342;
  border-left: 2px solid #34495e;
  margin-left: 20px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.submenu-item {
  margin: 0;
}

.submenu-link {
  display: flex;
  align-items: center;
  padding: 10px 16px 10px 24px;
  color: #95a5a6;
  text-decoration: none;
  font-size: 13px;
  font-weight: 400;
  transition: all 0.2s ease;
  border: none;
  background: none;
  width: 100%;
  position: relative;
}

.submenu-link:hover {
  background: #2c3e50;
  color: #ecf0f1;
  padding-left: 28px;
}

.submenu-link.active {
  background: #3498db;
  color: #ffffff;
  border-radius: 0 15px 15px 0;
  margin-right: 8px;
  padding-left: 28px;
}

.submenu-link .nav-icon {
  width: 16px;
  height: 16px;
  margin-right: 10px;
  font-size: 14px;
  opacity: 0.8;
}

/* Dark theme for dropdown */
[data-bs-theme="dark"] .nav-dropdown-toggle:hover {
  background: #333333;
}

[data-bs-theme="dark"] .nav-dropdown-toggle.expanded {
  background: #333333;
}

[data-bs-theme="dark"] .nav-submenu {
  background: #1f1f1f;
  border-left-color: #333333;
}

[data-bs-theme="dark"] .submenu-link:hover {
  background: #2a2a2a;
}
</style>