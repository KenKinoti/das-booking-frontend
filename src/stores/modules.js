import { defineStore } from 'pinia'
import { moduleService } from '@/services/moduleService'

export const useModulesStore = defineStore('modules', {
  state: () => ({
    modules: {
      inventory_enabled: false,
      supplier_enabled: false,
      purchase_order_enabled: false,
      pos_enabled: false,
      crm_enabled: false,
      reports_enabled: false
    },
    loading: false,
    initialized: false
  }),

  getters: {
    isInventoryEnabled: (state) => state.modules?.inventory_enabled || false,
    isSupplierEnabled: (state) => state.modules?.supplier_enabled || false,
    isPurchaseOrderEnabled: (state) => state.modules?.purchase_order_enabled || false,
    isPOSEnabled: (state) => state.modules?.pos_enabled || false,
    isCRMEnabled: (state) => state.modules?.crm_enabled || false,
    isReportsEnabled: (state) => state.modules?.reports_enabled || false,

    hasModule: (state) => (moduleName) => {
      // Safety check: if modules is not initialized, return false
      if (!state.modules) return false

      switch (moduleName) {
        case 'inventory':
          return state.modules.inventory_enabled || false
        case 'supplier':
          return state.modules.supplier_enabled || false
        case 'purchase_order':
          return state.modules.purchase_order_enabled || false
        case 'pos':
          return state.modules.pos_enabled || false
        case 'crm':
          return state.modules.crm_enabled || false
        case 'reports':
          return state.modules.reports_enabled || false
        default:
          return false
      }
    }
  },

  actions: {
    async fetchModules() {
      if (this.loading) return

      this.loading = true
      try {
        const response = await moduleService.getOrganizationModules()
        // Handle both real API response and mock fallback
        this.modules = response.data.module_config || response.data.modules || {
          inventory_enabled: false,
          supplier_enabled: false,
          purchase_order_enabled: false,
          pos_enabled: false,
          crm_enabled: false,
          reports_enabled: false
        }
        this.initialized = true
      } catch (error) {
        console.error('Error fetching modules:', error)
        // If error, assume no modules are enabled
        this.modules = {
          inventory_enabled: false,
          supplier_enabled: false,
          purchase_order_enabled: false,
          pos_enabled: false,
          crm_enabled: false,
          reports_enabled: false
        }
        this.initialized = true
      } finally {
        this.loading = false
      }
    },

    async updateModules(moduleData) {
      try {
        const response = await moduleService.updateOrganizationModules(null, moduleData)
        this.modules = response.data.modules
        return true
      } catch (error) {
        console.error('Error updating modules:', error)
        return false
      }
    },

    reset() {
      this.modules = {
        inventory_enabled: false,
        supplier_enabled: false,
        purchase_order_enabled: false,
        pos_enabled: false,
        crm_enabled: false,
        reports_enabled: false
      }
      this.loading = false
      this.initialized = false
    }
  }
})