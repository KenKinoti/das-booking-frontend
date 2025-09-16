<template>
  <nav class="sidebar" :class="{ 'collapsed': !isOpen, 'open': isOpen }">
    <div class="sidebar-header">
      <div class="logo">
        <div class="logo-icon">
          <i class="bi bi-building-gear"></i>
        </div>
        <span class="logo-text">DASYIN ERP</span>
      </div>
    </div>
    
    <div class="nav-menu">
      <!-- Core ERP Modules -->
      <div v-if="shouldShowDashboard" class="nav-item">
        <a href="#" class="nav-link" :class="{ active: currentPage === 'dashboard' }" @click="navigate('dashboard')">
          <i class="fas fa-chart-line nav-icon"></i>
          Dashboard
        </a>
      </div>

      <!-- Financial Management -->
      <div v-if="shouldShowFinanceSection" class="nav-section">
        <div class="nav-section-title">Financial Management</div>
        <div v-if="shouldShowFinanceMenu()" class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'finance' }" @click="navigate('finance')">
            <i class="fas fa-calculator nav-icon"></i>
            Finance & Accounting
          </a>
        </div>
        <div v-if="shouldShowInvoicesMenu()" class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'invoices' }" @click="navigate('invoices')">
            <i class="fas fa-file-invoice-dollar nav-icon"></i>
            Billing & Invoicing
          </a>
        </div>
        <div v-if="shouldShowBillsMenu()" class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'bills' }" @click="navigate('bills')">
            <i class="fas fa-receipt nav-icon"></i>
            Bills & Expenses
          </a>
        </div>
        <div v-if="shouldShowBankingMenu()" class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'banking' }" @click="navigate('banking')">
            <i class="fas fa-bank nav-icon"></i>
            Banking & Transactions
          </a>
        </div>
      </div>

      <!-- Operations Management -->
      <div v-if="shouldShowOperationsSection" class="nav-section">
        <div class="nav-divider"></div>
        <div class="nav-section-title">Operations</div>
        <div v-if="shouldShowInventoryMenu()" class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'inventory' }" @click="navigate('inventory')">
            <i class="fas fa-boxes nav-icon"></i>
            Inventory Management
          </a>
        </div>
        <div v-if="shouldShowSuppliersMenu()" class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'suppliers' }" @click="navigate('suppliers')">
            <i class="fas fa-truck nav-icon"></i>
            Supplier Management
          </a>
        </div>
        <div v-if="shouldShowProductionMenu()" class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'production' }" @click="navigate('production')">
            <i class="fas fa-cogs nav-icon"></i>
            Production & MRP
          </a>
        </div>
      </div>

      <!-- Customer Relations -->
      <div v-if="shouldShowCustomerSection" class="nav-section">
        <div class="nav-divider"></div>
        <div class="nav-section-title">Customer Relations</div>
        <div v-if="shouldShowCRMMenu()" class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'crm' }" @click="navigate('crm')">
            <i class="fas fa-users nav-icon"></i>
            CRM
          </a>
        </div>
        <div v-if="shouldShowBookingsMenu()" class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'bookings' }" @click="navigate('bookings')">
            <i class="fas fa-calendar-check nav-icon"></i>
            Bookings & Appointments
          </a>
        </div>
        <div v-if="shouldShowCustomersMenu()" class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'customers' }" @click="navigate('customers')">
            <i class="fas fa-user-friends nav-icon"></i>
            Customer Management
          </a>
        </div>
        <div v-if="shouldShowEventsMenu()" class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'events' }" @click="navigate('events')">
            <i class="fas fa-calendar-star nav-icon"></i>
            Events Management
          </a>
        </div>
        <div v-if="shouldShowMessagesMenu()" class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'messages' }" @click="navigate('messages')">
            <i class="fas fa-comments nav-icon"></i>
            <span class="nav-text">Messages</span>
            <span v-if="unreadMessageCount > 0" class="nav-badge">{{ unreadMessageCount > 99 ? '99+' : unreadMessageCount }}</span>
          </a>
        </div>
        <div v-if="shouldShowVideoCallMenu()" class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'video-call' }" @click="navigate('video-call')">
            <i class="fas fa-video nav-icon"></i>
            Video Call
          </a>
        </div>
      </div>

      <!-- Service Management -->
      <div v-if="shouldShowServicesSection" class="nav-section">
        <div class="nav-divider"></div>
        <div class="nav-section-title">Services & Projects</div>
        <div v-if="shouldShowServiceCategoriesMenu()" class="nav-item nav-expandable">
          <div class="nav-parent">
            <a href="#" class="nav-link" :class="{ active: isServiceCategoryActive }" @click="toggleServiceCategories">
              <i class="fas fa-concierge-bell nav-icon"></i>
              Service Categories
              <i class="fas fa-chevron-right expand-icon" :class="{ expanded: serviceCategoriesExpanded }"></i>
            </a>
          </div>
          <div class="nav-submenu" :class="{ expanded: serviceCategoriesExpanded }">
            <div v-if="shouldShowAutomotiveRepairSubmenu()" class="nav-item nav-sub-item">
              <a href="#" class="nav-link nav-sub-link"
                 :class="{ active: currentPage === 'automotive-repair' }"
                 @click="navigate('services/automotive-repair')">
                <i class="fas fa-tools nav-icon"></i>
                Automotive Repair
              </a>
            </div>
            <div v-if="shouldShowAutomotiveMaintenanceSubmenu()" class="nav-item nav-sub-item">
              <a href="#" class="nav-link nav-sub-link"
                 :class="{ active: currentPage === 'automotive-maintenance' }"
                 @click="navigate('services/automotive-maintenance')">
                <i class="fas fa-car nav-icon"></i>
                Auto Maintenance
              </a>
            </div>
            <div v-if="shouldShowHairServicesSubmenu()" class="nav-item nav-sub-item">
              <a href="#" class="nav-link nav-sub-link"
                 :class="{ active: currentPage === 'hair-services' }"
                 @click="navigate('services/hair-services')">
                <i class="fas fa-cut nav-icon"></i>
                Hair Services
              </a>
            </div>
            <div v-if="shouldShowSpaServicesSubmenu()" class="nav-item nav-sub-item">
              <a href="#" class="nav-link nav-sub-link"
                 :class="{ active: currentPage === 'beauty-spa' }"
                 @click="navigate('services/beauty-spa')">
                <i class="fas fa-spa nav-icon"></i>
                Beauty & Spa
              </a>
            </div>
            <div v-if="shouldShowNailServicesSubmenu()" class="nav-item nav-sub-item">
              <a href="#" class="nav-link nav-sub-link"
                 :class="{ active: currentPage === 'nail-services' }"
                 @click="navigate('services/nail-services')">
                <i class="fas fa-hand-paper nav-icon"></i>
                Nail Services
              </a>
            </div>
            <div class="nav-item nav-sub-item">
              <a href="#" class="nav-link nav-sub-link"
                 :class="{ active: currentPage === 'service-categories' }"
                 @click="navigate('services/categories')">
                <i class="fas fa-cog nav-icon"></i>
                Manage Categories
              </a>
            </div>
          </div>
        </div>
        <div v-if="shouldShowProjectsMenu()" class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'projects' }" @click="navigate('projects')">
            <i class="fas fa-project-diagram nav-icon"></i>
            Project Management
          </a>
        </div>
      </div>

      <!-- Human Resources -->
      <div v-if="shouldShowHRSection" class="nav-section">
        <div class="nav-divider"></div>
        <div class="nav-section-title">Human Resources</div>
        <div v-if="shouldShowStaffMenu()" class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'staff' }" @click="navigate('staff')">
            <i class="fas fa-users-cog nav-icon"></i>
            Staff Management
          </a>
        </div>
        <div class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'hcm' }" @click="navigate('hcm')">
            <i class="fas fa-user-tie nav-icon"></i>
            HCM & Payroll
          </a>
        </div>
      </div>

      <!-- Sales & E-commerce -->
      <div v-if="shouldShowSalesSection" class="nav-section">
        <div class="nav-divider"></div>
        <div class="nav-section-title">Sales & E-commerce</div>
        <div v-if="shouldShowPOSMenu()" class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'pos' }" @click="navigate('pos')">
            <i class="fas fa-cash-register nav-icon"></i>
            Point of Sale
          </a>
        </div>
        <div class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'pos-transactions' }" @click="navigate('pos-transactions')">
            <i class="fas fa-receipt nav-icon"></i>
            POS Transactions
          </a>
        </div>
        <div v-if="shouldShowEcommerceMenu()" class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'ecommerce' }" @click="navigate('ecommerce')">
            <i class="fas fa-shopping-cart nav-icon"></i>
            E-commerce Integration
          </a>
        </div>
      </div>

      <!-- Analytics & Reports -->
      <div v-if="shouldShowReportsSection" class="nav-section">
        <div class="nav-divider"></div>
        <div class="nav-section-title">Analytics & Reports</div>
        <div v-if="shouldShowReportsMenu()" class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'reports' }" @click="navigate('reports')">
            <i class="fas fa-chart-bar nav-icon"></i>
            Reports & Analytics
          </a>
        </div>
      </div>
      <div v-if="visibleNavigation.includes('settings')" class="nav-item">
        <a href="#" class="nav-link" :class="{ active: currentPage === 'settings' }" @click="navigate('settings')">
          <i class="fas fa-cog nav-icon"></i>
          Settings
        </a>
      </div>
      
      <!-- Super Admin Section -->
      <div v-if="isSuperAdmin" class="nav-section">
        <div class="nav-divider"></div>
        <div class="nav-section-title">Super Admin</div>
        <div class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'organizations' }" @click="navigate('organizations')">
            <i class="fas fa-building nav-icon"></i>
            Organizations
          </a>
        </div>
        <div class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'users-admin' }" @click="navigate('users-admin')">
            <i class="fas fa-users-shield nav-icon"></i>
            User Management
          </a>
        </div>
        <div class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'system-settings' }" @click="navigate('system-settings')">
            <i class="fas fa-cogs nav-icon"></i>
            System Settings
          </a>
        </div>
        <div class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'menu-manager' }" @click="navigate('menu-manager')">
            <i class="fas fa-bars nav-icon"></i>
            Menu Manager
          </a>
        </div>
        <div class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'analytics' }" @click="navigate('analytics')">
            <i class="fas fa-chart-pie nav-icon"></i>
            Analytics
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
    </div>
  </nav>
</template>

<script>
import { useAuthStore } from '../stores/auth'
import { usePermissionsStore } from '../stores/permissions'
import { useModuleSelectorStore } from '../stores/moduleSelector'
import { useSystemModulesStore } from '../stores/systemModules'
import { moduleService } from '../services/moduleService'
import { messagingService } from '../services/messaging'

export default {
  name: 'AppSidebar',
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
      serviceCategoriesExpanded: false,
      moduleConfig: null,
      unreadMessageCount: 0,
      menuConfigVersion: 0 // Used to trigger reactivity when localStorage changes
    }
  },
  computed: {
    authStore() {
      return useAuthStore()
    },
    permissionsStore() {
      return usePermissionsStore()
    },
    moduleSelectorStore() {
      return useModuleSelectorStore()
    },
    systemModulesStore() {
      return useSystemModulesStore()
    },
    isSuperAdmin() {
      return this.authStore.isSuperAdmin
    },
    visibleNavigation() {
      // Ensure we always return an array even if permissions store isn't ready
      const navigation = this.permissionsStore.visibleNavigation
      const baseNavigation = Array.isArray(navigation) ? navigation : []
      
      // Ensure core navigation items are always available for authenticated users
      const coreNavigation = ['dashboard', 'bookings', 'customers', 'services', 'events']
      coreNavigation.forEach(item => {
        if (!baseNavigation.includes(item)) {
          baseNavigation.push(item)
        }
      })
      
      return baseNavigation
    },
    isServiceCategoryActive() {
      const serviceCategoryPages = [
        'automotive-repair', 'automotive-maintenance', 'hair-services',
        'beauty-spa', 'nail-services', 'diagnostic-services', 'service-categories'
      ]
      return serviceCategoryPages.some(page => this.currentPage.includes(page))
    },
    isERPEnabled() {
      // ERP modules are now always enabled as part of the comprehensive system
      return true
    },
    isPOSEnabled() {
      // POS modules are now integrated into the main navigation
      return true
    },
    shouldShowFinanceSection() {
      // Check both system-wide availability AND navigation selector
      const systemEnabled = this.systemModulesStore.isModuleEnabled('finance')
      const navSelected = this.moduleSelectorStore.shouldShowRoute('finance')
      return !this.isSuperAdmin || (systemEnabled && navSelected)
    },
    shouldShowOperationsSection() {
      const inventoryEnabled = this.systemModulesStore.isModuleEnabled('inventory') && this.moduleSelectorStore.shouldShowRoute('inventory')
      const productionEnabled = this.systemModulesStore.isModuleEnabled('inventory') && this.moduleSelectorStore.shouldShowRoute('production')
      return !this.isSuperAdmin || (inventoryEnabled || productionEnabled)
    },
    shouldShowCustomerSection() {
      const crmEnabled = this.systemModulesStore.isModuleEnabled('crm') && this.moduleSelectorStore.shouldShowRoute('crm')
      const bookingsEnabled = this.systemModulesStore.isModuleEnabled('crm') && this.moduleSelectorStore.shouldShowRoute('bookings')
      const customersEnabled = this.systemModulesStore.isModuleEnabled('crm') && this.moduleSelectorStore.shouldShowRoute('customers')
      const eventsEnabled = this.systemModulesStore.isModuleEnabled('events') && this.moduleSelectorStore.shouldShowRoute('events')
      return !this.isSuperAdmin || (crmEnabled || bookingsEnabled || customersEnabled || eventsEnabled)
    },
    shouldShowServicesSection() {
      const systemEnabled = this.systemModulesStore.isModuleEnabled('services')
      const navSelected = this.moduleSelectorStore.shouldShowRoute('services')
      return !this.isSuperAdmin || (systemEnabled && navSelected)
    },
    shouldShowHRSection() {
      const systemEnabled = this.systemModulesStore.isModuleEnabled('staff')
      const navSelected = this.moduleSelectorStore.shouldShowRoute('hcm')
      return !this.isSuperAdmin || (systemEnabled && navSelected)
    },
    shouldShowSalesSection() {
      const posEnabled = this.systemModulesStore.isModuleEnabled('sales') && this.moduleSelectorStore.shouldShowRoute('pos')
      const ecommerceEnabled = this.systemModulesStore.isModuleEnabled('sales') && this.moduleSelectorStore.shouldShowRoute('ecommerce')
      return !this.isSuperAdmin || (posEnabled || ecommerceEnabled)
    },
    shouldShowReportsSection() {
      const systemEnabled = this.systemModulesStore.isModuleEnabled('reports')
      const navSelected = this.moduleSelectorStore.shouldShowRoute('reports')
      return !this.isSuperAdmin || (systemEnabled && navSelected)
    },
    shouldShowDashboard() {
      // Dashboard is always available
      return true
    }
  },
  methods: {
    navigate(page) {
      this.$emit('navigate', page)
    },
    toggleServiceCategories() {
      this.serviceCategoriesExpanded = !this.serviceCategoriesExpanded
    },
    async fetchModuleConfig() {
      try {
        const response = await moduleService.getOrganizationModules()
        this.moduleConfig = response.data.module_config
      } catch (error) {
        console.error('Error fetching module config:', error)
      }
    },
    async fetchUnreadMessageCount() {
      try {
        const response = await messagingService.getUnreadCount()
        this.unreadMessageCount = response.data.count
      } catch (error) {
        console.error('Error fetching unread message count:', error)
      }
    },
    handleNewMessage(message) {
      // Update unread count when a new message is received
      if (message.thread_id && !message.is_read) {
        this.unreadMessageCount++
      }
    },
    handleMessageRead() {
      // Decrease unread count when messages are read
      if (this.unreadMessageCount > 0) {
        this.unreadMessageCount--
      }
    },

    // Menu Configuration Methods
    shouldShowMenuItem(moduleKey, menuId) {
      // Check if menu item should be shown based on menu manager configuration
      // Use menuConfigVersion to ensure reactivity
      this.menuConfigVersion; // Access to trigger reactivity
      try {
        const storedMenus = localStorage.getItem('dasyin_enabled_menus')
        if (!storedMenus) return true // Show all if no configuration exists

        const enabledMenus = JSON.parse(storedMenus)
        return enabledMenus[moduleKey]?.includes(menuId) || false
      } catch (e) {
        return true // Show all if parsing fails
      }
    },

    shouldShowSubmenu(moduleKey, menuId, submenuId) {
      // Check if submenu should be shown based on menu manager configuration
      // Use menuConfigVersion to ensure reactivity
      this.menuConfigVersion; // Access to trigger reactivity
      try {
        const storedSubmenus = localStorage.getItem('dasyin_enabled_submenus')
        if (!storedSubmenus) return true // Show all if no configuration exists

        const enabledSubmenus = JSON.parse(storedSubmenus)
        const key = `${moduleKey}.${menuId}.${submenuId}`
        return enabledSubmenus[key] || false
      } catch (e) {
        return true // Show all if parsing fails
      }
    },

    // Method to refresh menu visibility when configuration changes
    refreshMenuVisibility() {
      this.menuConfigVersion++
    },

    // Handle localStorage changes from other windows/tabs
    handleStorageChange(event) {
      if (event.key === 'dasyin_enabled_menus' ||
          event.key === 'dasyin_enabled_submenus' ||
          event.key === 'dasyin_system_modules' ||
          event.key === 'dasyin_active_modules') {
        this.refreshMenuVisibility()
      }
    },

    // Specific menu visibility checks
    shouldShowFinanceMenu() {
      return this.shouldShowMenuItem('finance', 'finance')
    },

    shouldShowInvoicesMenu() {
      return this.shouldShowMenuItem('finance', 'invoices')
    },

    shouldShowBillsMenu() {
      return this.shouldShowMenuItem('finance', 'bills')
    },

    shouldShowBankingMenu() {
      return this.shouldShowMenuItem('finance', 'banking')
    },

    shouldShowInventoryMenu() {
      return this.shouldShowMenuItem('inventory', 'inventory')
    },

    shouldShowSuppliersMenu() {
      return this.shouldShowMenuItem('inventory', 'suppliers')
    },

    shouldShowProductionMenu() {
      return this.shouldShowMenuItem('inventory', 'production')
    },

    shouldShowCRMMenu() {
      return this.shouldShowMenuItem('crm', 'crm')
    },

    shouldShowBookingsMenu() {
      return this.shouldShowMenuItem('crm', 'bookings')
    },

    shouldShowCustomersMenu() {
      return this.shouldShowMenuItem('crm', 'customers')
    },

    shouldShowEventsMenu() {
      return this.shouldShowMenuItem('crm', 'events')
    },

    shouldShowMessagesMenu() {
      return this.shouldShowMenuItem('crm', 'messages')
    },

    shouldShowVideoCallMenu() {
      return this.shouldShowMenuItem('crm', 'video-call')
    },

    shouldShowServiceCategoriesMenu() {
      return this.shouldShowMenuItem('services', 'service-categories')
    },

    shouldShowProjectsMenu() {
      return this.shouldShowMenuItem('services', 'projects')
    },

    shouldShowStaffMenu() {
      return this.shouldShowMenuItem('staff', 'staff')
    },

    shouldShowPOSMenu() {
      return this.shouldShowMenuItem('sales', 'pos')
    },

    shouldShowEcommerceMenu() {
      return this.shouldShowMenuItem('sales', 'ecommerce')
    },

    shouldShowReportsMenu() {
      return this.shouldShowMenuItem('reports', 'reports')
    },

    // Submenu visibility checks
    shouldShowAutomotiveRepairSubmenu() {
      return this.shouldShowSubmenu('services', 'service-categories', 'automotive-repair')
    },

    shouldShowAutomotiveMaintenanceSubmenu() {
      return this.shouldShowSubmenu('services', 'service-categories', 'automotive-maintenance')
    },

    shouldShowHairServicesSubmenu() {
      return this.shouldShowSubmenu('services', 'service-categories', 'hair-services')
    },

    shouldShowNailServicesSubmenu() {
      return this.shouldShowSubmenu('services', 'service-categories', 'nail-services')
    },

    shouldShowSpaServicesSubmenu() {
      return this.shouldShowSubmenu('services', 'service-categories', 'spa-services')
    }
  },
  async mounted() {
    await this.fetchModuleConfig()
    await this.fetchUnreadMessageCount()

    // Initialize stores
    this.systemModulesStore.initializeFromStorage()

    // Set up WebSocket listener for real-time message updates
    if (messagingService.wsService) {
      messagingService.wsService.on('message', this.handleNewMessage)
      messagingService.wsService.on('message_read', this.handleMessageRead)
    }

    // Listen for localStorage changes to refresh menu visibility
    window.addEventListener('storage', this.handleStorageChange)

    // Also listen for custom events for same-window changes
    window.addEventListener('dasyin-menu-config-updated', this.refreshMenuVisibility)

    // Listen for system module changes
    window.addEventListener('dasyin-system-modules-updated', this.refreshMenuVisibility)
  },
  beforeUnmount() {
    // Clean up WebSocket listeners
    if (messagingService.wsService) {
      messagingService.wsService.off('message', this.handleNewMessage)
      messagingService.wsService.off('message_read', this.handleMessageRead)
    }

    // Clean up event listeners
    window.removeEventListener('storage', this.handleStorageChange)
    window.removeEventListener('dasyin-menu-config-updated', this.refreshMenuVisibility)
    window.removeEventListener('dasyin-system-modules-updated', this.refreshMenuVisibility)
  },
  watch: {
    currentPage(newPage) {
      // Auto-expand service categories if we're on a service category page
      const serviceCategoryPages = [
        'automotive-repair', 'automotive-maintenance', 'hair-services', 
        'beauty-spa', 'nail-services', 'diagnostic-services', 'service-categories'
      ]
      if (serviceCategoryPages.some(page => newPage.includes(page))) {
        this.serviceCategoriesExpanded = true
      }
    }
  }
}
</script>

<style scoped>
.sidebar {
  width: 260px;
  background: #2c3e50;
  border-right: 1px solid #34495e;
  position: fixed;
  height: 100vh;
  top: 0;
  left: 0;
  z-index: 99;
  transition: all 0.3s ease;
  overflow-y: auto;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  padding-top: 60px;
}

.sidebar.collapsed {
  transform: translateX(-100%);
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid #34495e;
  background: #2c3e50;
  position: fixed;
  top: 0;
  left: 0;
  width: 260px;
  z-index: 98;
  height: 60px;
  display: flex;
  align-items: center;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-icon {
  width: 28px;
  height: 28px;
  background: #3498db;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 16px;
}

.logo-text {
  font-size: 18px;
  font-weight: 700;
  color: #ecf0f1;
  letter-spacing: 0.5px;
}

.nav-menu {
  padding: 12px 0;
  overflow-y: auto;
  flex: 1;
}

.nav-item {
  margin: 0;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  text-decoration: none;
  color: #bdc3c7;
  transition: all 0.2s ease;
  font-weight: 500;
  font-size: 14px;
  position: relative;
  border-left: 3px solid transparent;
  border-radius: 0 8px 8px 0;
  margin: 0;
  min-height: 44px;
}

.nav-link:hover {
  background: #34495e;
  color: #ecf0f1;
}

.nav-link.active {
  background: #3498db;
  color: white;
  border-left: 3px solid #2980b9;
}

.nav-icon {
  width: 18px;
  text-align: center;
  font-size: 16px;
  flex-shrink: 0;
}

.nav-section {
  margin-top: 16px;
}

.nav-divider {
  height: 1px;
  background: #34495e;
  margin: 8px 16px;
}

.nav-section-title {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: #7f8c8d;
  padding: 16px 16px 8px 16px;
  margin: 0;
}

/* Expandable navigation styles */
.nav-expandable {
  position: relative;
}

.nav-parent .nav-link {
  position: relative;
  justify-content: space-between;
}

.expand-icon {
  font-size: 10px;
  transition: transform 0.2s ease;
  opacity: 0.6;
}

.expand-icon.expanded {
  transform: rotate(90deg);
}

.nav-submenu {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease-out;
  background: #34495e;
}

.nav-submenu.expanded {
  max-height: 400px;
  transition: max-height 0.4s ease-in;
}

.nav-sub-item {
  margin: 0;
}

.nav-sub-link {
  font-size: 13px;
  padding: 10px 16px 10px 40px;
  margin: 0;
  border-left: 3px solid transparent;
  color: #95a5a6;
  min-height: 40px;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.2s ease;
}

.nav-sub-link:hover {
  background: #34495e;
  color: #ecf0f1;
}

.nav-sub-link.active {
  background: #2980b9;
  color: white;
  border-left-color: #3498db;
}

.nav-sub-link .nav-icon {
  font-size: 12px;
  width: 14px;
}

/* Navigation badge for unread counts */
.nav-badge {
  background: #ff4757;
  color: white;
  font-size: 0.7rem;
  font-weight: var(--font-weight-bold);
  padding: 0.2rem 0.5rem;
  border-radius: 12px;
  min-width: 18px;
  text-align: center;
  margin-left: auto;
  box-shadow: 0 2px 8px rgba(255, 71, 87, 0.3);
  animation: pulse-badge 2s infinite;
}

@keyframes pulse-badge {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

.nav-link.active .nav-badge {
  background: rgba(255, 255, 255, 0.9);
  color: var(--primary-color);
  box-shadow: 0 2px 8px rgba(255, 255, 255, 0.2);
}

/* Responsive Design */
@media (max-width: 1024px) {
  .sidebar {
    width: 240px;
  }

  .sidebar-header {
    width: 240px;
  }

  .nav-link {
    font-size: 13px;
    padding: 10px 12px;
  }

  .nav-icon {
    font-size: 14px;
    width: 16px;
  }
}

@media (max-width: 768px) {
  .sidebar {
    transform: translateX(-100%);
    width: 280px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    z-index: 1000;
  }

  .sidebar.open {
    transform: translateX(0);
  }

  .sidebar-header {
    padding: 12px 16px;
    width: 280px;
    height: 56px;
  }

  .sidebar {
    padding-top: 56px;
  }

  .logo-text {
    font-size: 16px;
  }

  .logo-icon {
    width: 24px;
    height: 24px;
    font-size: 14px;
  }

  .nav-menu {
    padding: 8px 0;
  }

  .nav-link {
    padding: 12px 16px;
    font-size: 14px;
    min-height: 48px;
  }

  .nav-icon {
    font-size: 16px;
    width: 18px;
  }

  .nav-section-title {
    padding: 12px 16px 6px 16px;
    font-size: 11px;
  }

  /* Better touch targets */
  .nav-sub-link {
    padding: 10px 16px 10px 40px;
    min-height: 44px;
    font-size: 13px;
  }
}

/* Extra small devices */
@media (max-width: 480px) {
  .sidebar {
    width: 100vw;
    max-width: 320px;
  }

  .sidebar-header {
    width: 100%;
    max-width: 320px;
    height: 52px;
    padding: 10px 16px;
  }

  .sidebar {
    padding-top: 52px;
  }

  .logo-text {
    font-size: 15px;
  }

  .logo-icon {
    width: 22px;
    height: 22px;
    font-size: 13px;
  }

  .nav-link {
    padding: 10px 12px;
    font-size: 13px;
    min-height: 44px;
  }

  .nav-icon {
    font-size: 15px;
    width: 16px;
  }

  .nav-section-title {
    font-size: 10px;
    padding: 10px 12px 4px 12px;
  }

  .nav-sub-link {
    padding: 8px 12px 8px 36px;
    font-size: 12px;
    min-height: 40px;
  }
}
</style>