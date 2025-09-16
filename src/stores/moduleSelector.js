import { defineStore } from 'pinia'

export const useModuleSelectorStore = defineStore('moduleSelector', {
  state: () => ({
    activeModules: ['all'], // Default to show all modules
    availableModules: [
      {
        id: 'all',
        name: 'All Modules',
        icon: 'fas fa-th-large',
        description: 'Show all available modules',
        color: '#6366f1'
      },
      {
        id: 'finance',
        name: 'Finance & Accounting',
        icon: 'fas fa-calculator',
        description: 'Financial management, accounting, invoicing',
        color: '#059669',
        routes: ['finance', 'billing', 'reports']
      },
      {
        id: 'booking',
        name: 'Booking & Scheduling',
        icon: 'fas fa-calendar-alt',
        description: 'Appointments, bookings, scheduling',
        color: '#3b82f6',
        routes: ['dashboard', 'bookings', 'scheduling', 'customers', 'services']
      },
      {
        id: 'crm',
        name: 'CRM & Sales',
        icon: 'fas fa-users',
        description: 'Customer relationship management, sales pipeline, messaging',
        color: '#8b5cf6',
        routes: ['crm', 'customers', 'analytics', 'messages', 'messaging-settings']
      },
      {
        id: 'events',
        name: 'Events Management',
        icon: 'fas fa-calendar-star',
        description: 'Event creation, ticket management, registrations',
        color: '#ec4899',
        routes: ['events']
      },
      {
        id: 'inventory',
        name: 'Inventory & Supply Chain',
        icon: 'fas fa-boxes',
        description: 'Inventory management, suppliers, procurement',
        color: '#f59e0b',
        routes: ['inventory', 'inventorymanagement', 'suppliers', 'pos', 'pos-transactions']
      },
      {
        id: 'production',
        name: 'Production & Projects',
        icon: 'fas fa-industry',
        description: 'Manufacturing, project management',
        color: '#ef4444',
        routes: ['production', 'projects']
      },
      {
        id: 'hr',
        name: 'Human Resources',
        icon: 'fas fa-user-tie',
        description: 'Employee management, payroll, HR',
        color: '#06b6d4',
        routes: ['hcm', 'staff']
      },
      {
        id: 'ecommerce',
        name: 'E-commerce',
        icon: 'fas fa-shopping-cart',
        description: 'Online store, e-commerce management',
        color: '#84cc16',
        routes: ['ecommerce']
      },
      {
        id: 'admin',
        name: 'System Administration',
        icon: 'fas fa-cogs',
        description: 'System settings, user management, audit logs',
        color: '#64748b',
        routes: ['super-admin', 'superadmindashboard', 'organizations', 'users-admin', 'system-settings', 'auditlogs', 'database', 'documents', 'settings']
      }
    ]
  }),

  getters: {
    isModuleActive: (state) => (moduleId) => {
      return state.activeModules.includes('all') || state.activeModules.includes(moduleId)
    },

    shouldShowRoute: (state) => (routeName) => {
      if (state.activeModules.includes('all')) return true

      // Find which modules contain this route
      const modulesForRoute = state.availableModules.filter(module =>
        module.routes && module.routes.some(route =>
          routeName.toLowerCase().includes(route.toLowerCase())
        )
      )

      // Check if any of those modules are active
      return modulesForRoute.some(module =>
        state.activeModules.includes(module.id)
      )
    },

    activeModuleDetails: (state) => {
      return state.availableModules.filter(module =>
        state.activeModules.includes(module.id)
      )
    }
  },

  actions: {
    setActiveModules(moduleIds) {
      // If 'all' is selected, clear other selections
      if (moduleIds.includes('all')) {
        this.activeModules = ['all']
      } else {
        // Remove 'all' if other specific modules are selected
        this.activeModules = moduleIds.filter(id => id !== 'all')

        // If no modules selected, default to 'all'
        if (this.activeModules.length === 0) {
          this.activeModules = ['all']
        }
      }

      // Persist to localStorage
      localStorage.setItem('dasyin_active_modules', JSON.stringify(this.activeModules))
    },

    toggleModule(moduleId) {
      if (moduleId === 'all') {
        this.setActiveModules(['all'])
      } else {
        const currentModules = [...this.activeModules.filter(id => id !== 'all')]
        const index = currentModules.indexOf(moduleId)

        if (index > -1) {
          currentModules.splice(index, 1)
        } else {
          currentModules.push(moduleId)
        }

        this.setActiveModules(currentModules)
      }
    },

    initializeFromStorage() {
      const stored = localStorage.getItem('dasyin_active_modules')
      if (stored) {
        try {
          this.activeModules = JSON.parse(stored)
        } catch (e) {
          console.warn('Failed to parse stored modules, using default')
          this.activeModules = ['all']
        }
      }
    }
  }
})