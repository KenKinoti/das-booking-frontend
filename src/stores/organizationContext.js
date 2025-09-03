import { defineStore } from 'pinia'
import { useAuthStore } from './auth'
import api from '../services/api'

export const useOrganizationContextStore = defineStore('organizationContext', {
  state: () => ({
    organizations: [],
    currentOrganization: null, // Defaults to "All Organizations" for super admin
    isLoading: false,
    error: null
  }),

  getters: {
    isSuperAdmin: () => {
      const authStore = useAuthStore()
      return authStore.isSuperAdmin
    },
    
    availableOrganizations: (state) => {
      const authStore = useAuthStore()
      if (authStore.isSuperAdmin) {
        return state.organizations
      }
      // Non-super admins only see their own organization
      return state.organizations.filter(org => org.id === authStore.user?.organization_id)
    },
    
    currentOrgName: (state) => {
      const authStore = useAuthStore()
      if (authStore.isSuperAdmin && !state.currentOrganization) {
        return 'All Organizations'
      }
      return state.currentOrganization?.name || 'Select Organization'
    },
    
    currentOrgId: (state) => {
      return state.currentOrganization?.id || null
    }
  },

  actions: {
    async fetchOrganizations() {
      this.isLoading = true
      this.error = null
      
      try {
        const response = await api.get('/organizations')
        
        if (response.success && response.data?.organizations) {
          this.organizations = response.data.organizations
          
          // Auto-select user's organization if not super admin
          const authStore = useAuthStore()
          if (!authStore.isSuperAdmin && authStore.user?.organization_id) {
            const userOrg = this.organizations.find(org => org.id === authStore.user.organization_id)
            if (userOrg) {
              this.currentOrganization = userOrg
            }
          } else if (authStore.isSuperAdmin) {
            // For super admin, try to restore from storage but default to "All Organizations"
            const stored = localStorage.getItem('selectedOrganizationId')
            if (stored) {
              const storedOrg = this.organizations.find(org => org.id === stored)
              if (storedOrg) {
                this.currentOrganization = storedOrg
              }
              // If stored org not found, leave as null (All Organizations)
            }
            // Default to null (All Organizations) for super admin
          }
        }
      } catch (error) {
        console.error('Error fetching organizations:', error)
        this.error = 'Failed to load organizations'
      } finally {
        this.isLoading = false
      }
    },

    setCurrentOrganization(organization) {
      this.currentOrganization = organization
      if (organization) {
        localStorage.setItem('selectedOrganizationId', organization.id)
      } else {
        // Null means "Show All" for super admins
        localStorage.removeItem('selectedOrganizationId')
      }
    },

    clearOrganizationFilter() {
      // For super admin to show all data
      const authStore = useAuthStore()
      if (authStore.isSuperAdmin) {
        this.currentOrganization = null
        localStorage.removeItem('selectedOrganizationId')
      }
    },

    initializeFromStorage() {
      const authStore = useAuthStore()
      
      // For non-super admins, always use their org
      if (!authStore.isSuperAdmin && authStore.user?.organization_id) {
        // Will be set when organizations are fetched
        return
      }
      
      // For super admins, restore from storage but prefer "All Organizations"
      const storedId = localStorage.getItem('selectedOrganizationId')
      if (storedId && this.organizations.length > 0) {
        const storedOrg = this.organizations.find(org => org.id === storedId)
        if (storedOrg) {
          this.currentOrganization = storedOrg
        }
      }
      // If no stored selection, default to null (All Organizations)
    },

    clearOrganizationContext() {
      this.currentOrganization = null
      this.organizations = []
      localStorage.removeItem('selectedOrganizationId')
    },

    setDefaultAllOrganizations() {
      // Force set to "All Organizations" for super admin
      const authStore = useAuthStore()
      if (authStore.isSuperAdmin) {
        this.currentOrganization = null
        localStorage.removeItem('selectedOrganizationId')
      }
    },

    switchToOrganization(orgId, orgName) {
      const org = this.organizations.find(o => o.id === orgId)
      if (org) {
        this.setCurrentOrganization(org)
      }
    },

    switchToAllOrganizations() {
      const authStore = useAuthStore()
      if (authStore.isSuperAdmin) {
        this.setCurrentOrganization(null)
      }
    }
  }
})