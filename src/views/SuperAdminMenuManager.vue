<template>
  <div class="menu-manager">
    <!-- Header -->
    <div class="clean-header">
      <h1>Navigation Menu Manager</h1>
      <p>Configure which navigation menus and submenus are available for each top navigation module</p>
      <div class="header-note">
        <i class="fas fa-info-circle"></i>
        <span>Only system-wide enabled modules are shown here. Cross-module features like "Finance Messages" allow sharing functionality between modules.</span>
      </div>
    </div>

    <!-- Module Navigation Cards -->
    <div class="modules-container">
      <div
        v-for="(module, moduleKey) in moduleMenus"
        :key="moduleKey"
        class="module-nav-card"
        :class="{ enabled: isModuleEnabled(moduleKey) }"
      >
        <!-- Module Header -->
        <div class="module-header">
          <div class="module-info">
            <div class="module-icon" :style="{ color: getModuleColor(moduleKey) }">
              <i :class="getModuleIcon(moduleKey)"></i>
            </div>
            <div class="module-details">
              <h3>{{ module.name }}</h3>
              <p>{{ module.description }}</p>
            </div>
          </div>
          <div class="module-status">
            <span class="status-badge" :class="{ enabled: isModuleEnabled(moduleKey) }">
              {{ isModuleEnabled(moduleKey) ? 'Active' : 'Inactive' }}
            </span>
          </div>
        </div>

        <!-- Menu Configuration (only show if module is enabled) -->
        <div v-if="isModuleEnabled(moduleKey)" class="menu-config">
          <h4>Navigation Menus</h4>
          <div class="menus-grid">
            <div
              v-for="menu in module.menus"
              :key="menu.id"
              class="menu-item"
              :class="{ enabled: isMenuEnabled(moduleKey, menu.id) }"
            >
              <div class="menu-content">
                <div class="menu-icon">
                  <i :class="menu.icon"></i>
                </div>
                <div class="menu-info">
                  <h5>
                    {{ menu.name }}
                    <span v-if="menu.crossModule" class="cross-module-badge" :title="`Available from ${menu.sourceModule} module`">
                      <i class="fas fa-link"></i>
                    </span>
                  </h5>
                  <p>{{ menu.description }}</p>
                  <div v-if="menu.crossModule" class="cross-module-info">
                    <small><i class="fas fa-info-circle"></i> Cross-module from {{ getModuleName(menu.sourceModule) }}</small>
                  </div>
                </div>
                <label class="menu-toggle">
                  <input
                    type="checkbox"
                    :checked="isMenuEnabled(moduleKey, menu.id)"
                    @change="toggleMenu(moduleKey, menu.id, $event.target.checked)"
                  >
                  <span class="toggle-slider"></span>
                </label>
              </div>

              <!-- Submenus -->
              <div v-if="menu.submenus && menu.submenus.length > 0 && isMenuEnabled(moduleKey, menu.id)" class="submenus">
                <h6>Submenus</h6>
                <div class="submenu-list">
                  <div
                    v-for="submenu in menu.submenus"
                    :key="submenu.id"
                    class="submenu-item"
                  >
                    <div class="submenu-content">
                      <i :class="submenu.icon" class="submenu-icon"></i>
                      <span class="submenu-name">{{ submenu.name }}</span>
                      <label class="submenu-toggle">
                        <input
                          type="checkbox"
                          :checked="isSubmenuEnabled(moduleKey, menu.id, submenu.id)"
                          @change="toggleSubmenu(moduleKey, menu.id, submenu.id, $event.target.checked)"
                        >
                        <span class="toggle-slider-small"></span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Disabled Module Message -->
        <div v-else class="disabled-message">
          <i class="fas fa-info-circle"></i>
          <span>Enable this module in System Settings to configure its menus</span>
        </div>
      </div>
    </div>

    <!-- Save Button -->
    <div class="save-section">
      <button @click="saveConfiguration" class="save-btn" :disabled="isSaving">
        <i :class="['fas', isSaving ? 'fa-spinner fa-spin' : 'fa-save']"></i>
        {{ isSaving ? 'Saving...' : 'Save Configuration' }}
      </button>
    </div>
  </div>
</template>

<script>
import { useSystemModulesStore } from '../stores/systemModules'

export default {
  name: 'SuperAdminMenuManager',
  data() {
    return {
      isSaving: false,
      enabledMenus: {},
      enabledSubmenu: {},
      moduleMenus: {
        finance: {
          name: 'Financial Management',
          description: 'Finance, accounting, and billing features',
          menus: [
            {
              id: 'finance',
              name: 'Finance & Accounting',
              description: 'Core financial management',
              icon: 'fas fa-calculator',
              submenus: [
                { id: 'general-ledger', name: 'General Ledger', icon: 'fas fa-book' },
                { id: 'chart-of-accounts', name: 'Chart of Accounts', icon: 'fas fa-list' },
                { id: 'journal-entries', name: 'Journal Entries', icon: 'fas fa-edit' }
              ]
            },
            {
              id: 'invoices',
              name: 'Billing & Invoicing',
              description: 'Customer invoices and billing',
              icon: 'fas fa-file-invoice-dollar',
              submenus: [
                { id: 'create-invoice', name: 'Create Invoice', icon: 'fas fa-plus' },
                { id: 'manage-invoices', name: 'Manage Invoices', icon: 'fas fa-list' },
                { id: 'recurring-invoices', name: 'Recurring Invoices', icon: 'fas fa-redo' }
              ]
            },
            {
              id: 'bills',
              name: 'Bills & Expenses',
              description: 'Vendor bills and expense tracking',
              icon: 'fas fa-receipt'
            },
            {
              id: 'banking',
              name: 'Banking & Transactions',
              description: 'Bank accounts and transactions',
              icon: 'fas fa-bank'
            },
            {
              id: 'messages',
              name: 'Finance Messages',
              description: 'Financial communication and approvals',
              icon: 'fas fa-comments',
              crossModule: true,
              sourceModule: 'crm'
            },
            {
              id: 'reports',
              name: 'Financial Reports',
              description: 'Financial reporting and analytics',
              icon: 'fas fa-chart-line',
              crossModule: true,
              sourceModule: 'reports'
            }
          ]
        },
        inventory: {
          name: 'Operations Management',
          description: 'Inventory, suppliers, and production',
          menus: [
            {
              id: 'inventory',
              name: 'Inventory Management',
              description: 'Stock and inventory tracking',
              icon: 'fas fa-boxes',
              submenus: [
                { id: 'products', name: 'Products', icon: 'fas fa-cube' },
                { id: 'stock-levels', name: 'Stock Levels', icon: 'fas fa-chart-bar' },
                { id: 'adjustments', name: 'Stock Adjustments', icon: 'fas fa-exchange-alt' }
              ]
            },
            {
              id: 'suppliers',
              name: 'Supplier Management',
              description: 'Vendor and supplier management',
              icon: 'fas fa-truck'
            },
            {
              id: 'production',
              name: 'Production & MRP',
              description: 'Manufacturing and planning',
              icon: 'fas fa-cogs'
            }
          ]
        },
        crm: {
          name: 'Customer Relations',
          description: 'CRM, bookings, and customer management',
          menus: [
            {
              id: 'crm',
              name: 'CRM',
              description: 'Customer relationship management',
              icon: 'fas fa-users',
              submenus: [
                { id: 'contacts', name: 'Contacts', icon: 'fas fa-address-book' },
                { id: 'leads', name: 'Leads', icon: 'fas fa-user-plus' },
                { id: 'opportunities', name: 'Opportunities', icon: 'fas fa-handshake' }
              ]
            },
            {
              id: 'bookings',
              name: 'Bookings & Appointments',
              description: 'Appointment scheduling',
              icon: 'fas fa-calendar-check'
            },
            {
              id: 'customers',
              name: 'Customer Management',
              description: 'Customer database and profiles',
              icon: 'fas fa-user-friends'
            },
            {
              id: 'events',
              name: 'Events Management',
              description: 'Event planning and management',
              icon: 'fas fa-calendar-star'
            },
            {
              id: 'messages',
              name: 'Messages & Communication',
              description: 'Internal messaging system',
              icon: 'fas fa-comments',
              submenus: [
                { id: 'customer-messages', name: 'Customer Messages', icon: 'fas fa-comment-dots' },
                { id: 'team-chat', name: 'Team Chat', icon: 'fas fa-comments' },
                { id: 'notifications', name: 'Notifications', icon: 'fas fa-bell' }
              ]
            },
            {
              id: 'video-call',
              name: 'Video Call',
              description: 'Video conferencing',
              icon: 'fas fa-video'
            },
            {
              id: 'invoices',
              name: 'Customer Invoicing',
              description: 'Customer billing from CRM',
              icon: 'fas fa-file-invoice',
              crossModule: true,
              sourceModule: 'finance'
            }
          ]
        },
        services: {
          name: 'Services & Projects',
          description: 'Service management and categorization',
          menus: [
            {
              id: 'service-categories',
              name: 'Service Categories',
              description: 'Organize services by category',
              icon: 'fas fa-concierge-bell',
              submenus: [
                { id: 'automotive-repair', name: 'Automotive Repair', icon: 'fas fa-tools' },
                { id: 'automotive-maintenance', name: 'Auto Maintenance', icon: 'fas fa-car' },
                { id: 'hair-services', name: 'Hair Services', icon: 'fas fa-cut' },
                { id: 'nail-services', name: 'Nail Services', icon: 'fas fa-hand-sparkles' },
                { id: 'spa-services', name: 'Spa Services', icon: 'fas fa-spa' }
              ]
            },
            {
              id: 'projects',
              name: 'Project Management',
              description: 'Project tracking and management',
              icon: 'fas fa-project-diagram'
            }
          ]
        },
        staff: {
          name: 'Human Resources',
          description: 'Staff and HR management',
          menus: [
            {
              id: 'staff',
              name: 'Staff Management',
              description: 'Employee management',
              icon: 'fas fa-users-cog',
              submenus: [
                { id: 'employees', name: 'Employees', icon: 'fas fa-user' },
                { id: 'schedules', name: 'Schedules', icon: 'fas fa-calendar' },
                { id: 'payroll', name: 'Payroll', icon: 'fas fa-dollar-sign' }
              ]
            }
          ]
        },
        sales: {
          name: 'Sales & E-commerce',
          description: 'POS and e-commerce features',
          menus: [
            {
              id: 'pos',
              name: 'Point of Sale',
              description: 'Retail point of sale system',
              icon: 'fas fa-cash-register'
            },
            {
              id: 'ecommerce',
              name: 'E-commerce',
              description: 'Online store management',
              icon: 'fas fa-shopping-cart'
            }
          ]
        },
        reports: {
          name: 'Analytics & Reports',
          description: 'Business intelligence and reporting',
          menus: [
            {
              id: 'reports',
              name: 'Reports & Analytics',
              description: 'Business reports and analytics',
              icon: 'fas fa-chart-bar',
              submenus: [
                { id: 'financial-reports', name: 'Financial Reports', icon: 'fas fa-chart-line' },
                { id: 'sales-reports', name: 'Sales Reports', icon: 'fas fa-chart-pie' },
                { id: 'custom-reports', name: 'Custom Reports', icon: 'fas fa-cog' }
              ]
            }
          ]
        }
      }
    }
  },
  methods: {
    isModuleEnabled(moduleKey) {
      // Check if module is enabled system-wide
      return this.systemModulesStore.isModuleEnabled(moduleKey)
    },

    isMenuEnabled(moduleKey, menuId) {
      return this.enabledMenus[moduleKey]?.includes(menuId) || false
    },

    isSubmenuEnabled(moduleKey, menuId, submenuId) {
      const key = `${moduleKey}.${menuId}.${submenuId}`
      return this.enabledSubmenu[key] || false
    },

    toggleMenu(moduleKey, menuId, enabled) {
      if (!this.enabledMenus[moduleKey]) {
        this.enabledMenus[moduleKey] = []
      }

      if (enabled) {
        if (!this.enabledMenus[moduleKey].includes(menuId)) {
          this.enabledMenus[moduleKey].push(menuId)
        }
      } else {
        const index = this.enabledMenus[moduleKey].indexOf(menuId)
        if (index > -1) {
          this.enabledMenus[moduleKey].splice(index, 1)
        }

        // Also disable all submenus of this menu
        const menu = this.moduleMenus[moduleKey].menus.find(m => m.id === menuId)
        if (menu && menu.submenus) {
          menu.submenus.forEach(submenu => {
            const submenuKey = `${moduleKey}.${menuId}.${submenu.id}`
            delete this.enabledSubmenu[submenuKey]
          })
        }
      }

      // Update localStorage immediately for real-time effect
      localStorage.setItem('dasyin_enabled_menus', JSON.stringify(this.enabledMenus))
      localStorage.setItem('dasyin_enabled_submenus', JSON.stringify(this.enabledSubmenu))

      // Trigger custom event for immediate UI update
      window.dispatchEvent(new CustomEvent('dasyin-menu-config-updated'))
    },

    toggleSubmenu(moduleKey, menuId, submenuId, enabled) {
      const key = `${moduleKey}.${menuId}.${submenuId}`
      if (enabled) {
        this.enabledSubmenu[key] = true
      } else {
        delete this.enabledSubmenu[key]
      }

      // Update localStorage immediately for real-time effect
      localStorage.setItem('dasyin_enabled_submenus', JSON.stringify(this.enabledSubmenu))

      // Trigger custom event for immediate UI update
      window.dispatchEvent(new CustomEvent('dasyin-menu-config-updated'))
    },

    getModuleIcon(moduleKey) {
      const icons = {
        finance: 'fas fa-calculator',
        inventory: 'fas fa-boxes',
        crm: 'fas fa-users',
        services: 'fas fa-concierge-bell',
        staff: 'fas fa-users-cog',
        sales: 'fas fa-cash-register',
        reports: 'fas fa-chart-bar'
      }
      return icons[moduleKey] || 'fas fa-puzzle-piece'
    },

    getModuleColor(moduleKey) {
      const colors = {
        finance: '#059669',
        inventory: '#f59e0b',
        crm: '#8b5cf6',
        services: '#06b6d4',
        staff: '#84cc16',
        sales: '#f97316',
        reports: '#64748b'
      }
      return colors[moduleKey] || '#6b7280'
    },

    getModuleName(moduleKey) {
      const names = {
        finance: 'Finance',
        inventory: 'Operations',
        crm: 'CRM',
        services: 'Services',
        staff: 'HR',
        sales: 'Sales',
        reports: 'Reports'
      }
      return names[moduleKey] || moduleKey
    },

    async saveConfiguration() {
      this.isSaving = true
      try {
        // Save to localStorage
        localStorage.setItem('dasyin_enabled_menus', JSON.stringify(this.enabledMenus))
        localStorage.setItem('dasyin_enabled_submenus', JSON.stringify(this.enabledSubmenu))

        // Trigger custom event to notify other components (same window)
        window.dispatchEvent(new CustomEvent('dasyin-menu-config-updated'))

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000))

        console.log('✅ Navigation configuration saved successfully!')
        alert('Navigation configuration saved successfully!')
      } catch (error) {
        console.error('Error saving configuration:', error)
        alert('Error saving configuration. Please try again.')
      } finally {
        this.isSaving = false
      }
    },

    initializeConfiguration() {
      // Load from localStorage
      const storedMenus = localStorage.getItem('dasyin_enabled_menus')
      const storedSubmenus = localStorage.getItem('dasyin_enabled_submenus')

      if (storedMenus) {
        try {
          this.enabledMenus = JSON.parse(storedMenus)
        } catch (e) {
          console.warn('Failed to parse stored menus')
        }
      } else {
        // Set default enabled menus
        this.enabledMenus = {
          finance: ['finance', 'invoices'],
          inventory: ['inventory'],
          crm: ['crm', 'bookings', 'customers'],
          services: ['service-categories'],
          staff: ['staff'],
          sales: ['pos'],
          reports: ['reports']
        }
      }

      if (storedSubmenus) {
        try {
          this.enabledSubmenu = JSON.parse(storedSubmenus)
        } catch (e) {
          console.warn('Failed to parse stored submenus')
        }
      } else {
        // Set default enabled submenus
        this.enabledSubmenu = {
          'finance.finance.general-ledger': true,
          'finance.finance.chart-of-accounts': true,
          'finance.invoices.create-invoice': true,
          'finance.invoices.manage-invoices': true,
          'inventory.inventory.products': true,
          'inventory.inventory.stock-levels': true,
          'crm.crm.contacts': true,
          'crm.crm.leads': true,
          'services.service-categories.automotive-repair': true,
          'services.service-categories.hair-services': true,
          'staff.staff.employees': true,
          'staff.staff.schedules': true,
          'reports.reports.financial-reports': true
        }
      }
    }
  },

  computed: {
    systemModulesStore() {
      return useSystemModulesStore()
    },

    enabledModules() {
      // Get enabled modules from system modules store (not navigation selector)
      return this.systemModulesStore.getEnabledModules
    }
  },

  mounted() {
    // Initialize system modules store
    this.systemModulesStore.initializeFromStorage()
    this.initializeConfiguration()
  }
}
</script>

<style scoped>
.menu-manager {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.clean-header {
  text-align: center;
  margin-bottom: 3rem;
  padding: 2rem;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.8) 100%);
  border-radius: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.clean-header h1 {
  font-size: 2.25rem;
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
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  color: #1e40af;
  font-size: 0.875rem;
  max-width: 700px;
  margin: 0 auto;
}

.modules-container {
  display: grid;
  gap: 2rem;
}

.module-nav-card {
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.3s ease;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.module-nav-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}

.module-nav-card.enabled {
  border-color: #10b981;
}

.module-header {
  padding: 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #f1f5f9;
}

.module-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.module-icon {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.75rem;
  background: rgba(102, 126, 234, 0.1);
}

.module-details h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.375rem;
  font-weight: 700;
  color: #1e293b;
}

.module-details p {
  margin: 0;
  color: #64748b;
  font-size: 0.875rem;
}

.status-badge {
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  background: #f1f5f9;
  color: #64748b;
}

.status-badge.enabled {
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
}

.menu-config {
  padding: 2rem;
}

.menu-config h4 {
  margin: 0 0 1.5rem 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
}

.menus-grid {
  display: grid;
  gap: 1.5rem;
}

.menu-item {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.menu-item.enabled {
  border-color: #10b981;
  background: rgba(16, 185, 129, 0.02);
}

.menu-content {
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.menu-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  background: rgba(102, 126, 234, 0.1);
  color: #667eea;
}

.menu-info {
  flex: 1;
}

.menu-info h5 {
  margin: 0 0 0.25rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
}

.menu-info p {
  margin: 0;
  color: #64748b;
  font-size: 0.8rem;
}

.cross-module-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  background: #3b82f6;
  color: white;
  border-radius: 50%;
  font-size: 10px;
  margin-left: 8px;
  vertical-align: middle;
}

.cross-module-info {
  margin-top: 4px;
  color: #3b82f6;
  font-size: 0.7rem;
  font-weight: 500;
}

.cross-module-info i {
  margin-right: 4px;
}

.menu-toggle,
.submenu-toggle {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 24px;
  cursor: pointer;
}

.menu-toggle input,
.submenu-toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider,
.toggle-slider-small {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #e5e7eb;
  border-radius: 24px;
  transition: all 0.3s ease;
}

.toggle-slider-small {
  width: 36px;
  height: 20px;
}

.toggle-slider:before,
.toggle-slider-small:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background: white;
  border-radius: 50%;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.toggle-slider-small:before {
  height: 14px;
  width: 14px;
}

.menu-toggle input:checked + .toggle-slider,
.submenu-toggle input:checked + .toggle-slider-small {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.menu-toggle input:checked + .toggle-slider:before {
  transform: translateX(24px);
}

.submenu-toggle input:checked + .toggle-slider-small:before {
  transform: translateX(16px);
}

.submenus {
  border-top: 1px solid #f1f5f9;
  background: #f8fafc;
  padding: 1.5rem;
}

.submenus h6 {
  margin: 0 0 1rem 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.submenu-list {
  display: grid;
  gap: 0.75rem;
}

.submenu-item {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1rem;
}

.submenu-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.submenu-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(102, 126, 234, 0.1);
  border-radius: 8px;
  color: #667eea;
  font-size: 0.875rem;
}

.submenu-name {
  flex: 1;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.disabled-message {
  padding: 2rem;
  text-align: center;
  color: #64748b;
  background: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-style: italic;
}

.save-section {
  text-align: center;
  padding: 2rem;
  margin-top: 2rem;
}

.save-btn {
  padding: 1rem 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.save-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
}

.save-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* Dark Theme */
[data-bs-theme="dark"] .clean-header {
  background: linear-gradient(135deg, rgba(31, 41, 55, 0.9) 0%, rgba(55, 65, 81, 0.8) 100%);
}

[data-bs-theme="dark"] .clean-header h1 {
  color: #f9fafb;
}

[data-bs-theme="dark"] .clean-header p {
  color: #d1d5db;
}

[data-bs-theme="dark"] .module-nav-card {
  background: #1f2937;
  border-color: #374151;
}

[data-bs-theme="dark"] .module-nav-card.enabled {
  border-color: #10b981;
}

[data-bs-theme="dark"] .module-details h3 {
  color: #f9fafb;
}

[data-bs-theme="dark"] .module-details p {
  color: #d1d5db;
}

[data-bs-theme="dark"] .menu-config h4 {
  color: #f9fafb;
}

[data-bs-theme="dark"] .menu-item {
  background: #1f2937;
  border-color: #374151;
}

[data-bs-theme="dark"] .menu-info h5 {
  color: #f9fafb;
}

[data-bs-theme="dark"] .menu-info p {
  color: #d1d5db;
}

[data-bs-theme="dark"] .submenus {
  background: #111827;
  border-top-color: #374151;
}

[data-bs-theme="dark"] .submenu-item {
  background: #1f2937;
  border-color: #374151;
}

[data-bs-theme="dark"] .submenu-name {
  color: #e5e7eb;
}

[data-bs-theme="dark"] .disabled-message {
  background: #111827;
  color: #d1d5db;
}
</style>