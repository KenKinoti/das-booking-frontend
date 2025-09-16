import { defineStore } from 'pinia'

export const useSystemModulesStore = defineStore('systemModules', {
  state: () => ({
    enabledModules: {
      finance: true,
      inventory: true,
      crm: true,
      services: true,
      staff: true,
      sales: true,
      reports: true,
      events: true,
      hr: true,
      admin: true
    },
    allModules: {
      finance: {
        name: 'Finance & Accounting',
        description: 'Financial management, accounting, invoicing',
        icon: 'fas fa-calculator',
        color: '#059669'
      },
      inventory: {
        name: 'Inventory & Supply Chain',
        description: 'Inventory management, suppliers, procurement',
        icon: 'fas fa-boxes',
        color: '#f59e0b'
      },
      crm: {
        name: 'CRM & Sales',
        description: 'Customer relationship management, sales pipeline',
        icon: 'fas fa-users',
        color: '#8b5cf6'
      },
      services: {
        name: 'Services & Projects',
        description: 'Service management and categorization',
        icon: 'fas fa-concierge-bell',
        color: '#06b6d4'
      },
      staff: {
        name: 'Human Resources',
        description: 'Staff and HR management',
        icon: 'fas fa-user-tie',
        color: '#84cc16'
      },
      sales: {
        name: 'Sales & E-commerce',
        description: 'POS and e-commerce features',
        icon: 'fas fa-shopping-cart',
        color: '#f97316'
      },
      reports: {
        name: 'Analytics & Reports',
        description: 'Business intelligence and reporting',
        icon: 'fas fa-chart-bar',
        color: '#64748b'
      },
      events: {
        name: 'Events Management',
        description: 'Event creation, ticket management, registrations',
        icon: 'fas fa-calendar-star',
        color: '#ec4899'
      },
      hr: {
        name: 'Human Resources',
        description: 'Employee management, payroll, HR',
        icon: 'fas fa-user-tie',
        color: '#06b6d4'
      },
      admin: {
        name: 'System Administration',
        description: 'System settings, user management, audit logs',
        icon: 'fas fa-cogs',
        color: '#64748b'
      }
    }
  }),

  getters: {
    isModuleEnabled: (state) => (moduleKey) => {
      return state.enabledModules[moduleKey] || false
    },

    getEnabledModules: (state) => {
      return Object.keys(state.enabledModules).filter(key => state.enabledModules[key])
    },

    getAvailableModulesForNavigation: (state) => {
      // Return only enabled modules for the navigation selector
      return Object.keys(state.allModules)
        .filter(key => state.enabledModules[key])
        .map(key => ({
          id: key,
          name: state.allModules[key].name,
          description: state.allModules[key].description,
          icon: state.allModules[key].icon,
          color: state.allModules[key].color
        }))
    },

    getModuleInfo: (state) => (moduleKey) => {
      return state.allModules[moduleKey] || null
    }
  },

  actions: {
    enableModule(moduleKey) {
      this.enabledModules[moduleKey] = true
      this.persistToStorage()
    },

    disableModule(moduleKey) {
      this.enabledModules[moduleKey] = false
      this.persistToStorage()
    },

    updateModuleStatus(moduleKey, enabled) {
      this.enabledModules[moduleKey] = enabled
      this.persistToStorage()

      // Trigger event to notify other components
      window.dispatchEvent(new CustomEvent('dasyin-system-modules-updated', {
        detail: { moduleKey, enabled }
      }))
    },

    persistToStorage() {
      localStorage.setItem('dasyin_system_modules', JSON.stringify(this.enabledModules))
    },

    initializeFromStorage() {
      const stored = localStorage.getItem('dasyin_system_modules')
      if (stored) {
        try {
          const parsedModules = JSON.parse(stored)
          // Merge with defaults to ensure all modules have a setting
          this.enabledModules = { ...this.enabledModules, ...parsedModules }
        } catch (e) {
          console.warn('Failed to parse stored system modules, using defaults')
        }
      }
    }
  }
})