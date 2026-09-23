import { ref, computed, watch } from 'vue'

// Global organization context state
const currentOrganizationContext = ref(null)
const isLoading = ref(false)

// Initialize context from localStorage
const initializeOrganizationContext = () => {
  const contextData = localStorage.getItem('current_organization')
  if (contextData) {
    try {
      const parsedContext = JSON.parse(contextData)
      // Validate context structure
      if (parsedContext.id && parsedContext.name) {
        currentOrganizationContext.value = parsedContext
      } else {
        console.warn('Invalid organization context data, clearing...')
        localStorage.removeItem('current_organization')
      }
    } catch (error) {
      console.error('Error parsing organization context:', error)
      localStorage.removeItem('current_organization')
    }
  }
}

// Set organization context
const setOrganizationContext = (organizationData) => {
  if (!organizationData || !organizationData.id) {
    console.error('Invalid organization data provided')
    return false
  }

  const contextData = {
    id: organizationData.id,
    name: organizationData.name || `Organization ${organizationData.id}`,
    role: 'organization_admin',
    switchedAt: new Date().toISOString(),
    originalRole: 'super_admin',
    // Add more organization specific data as needed
    subscription: organizationData.subscription,
    status: organizationData.status,
    // Include module configuration
    enabled_modules: organizationData.enabled_modules || [],
    modules_config: organizationData.modules_config || {}
  }

  localStorage.setItem('current_organization', JSON.stringify(contextData))
  currentOrganizationContext.value = contextData

  return true
}

// Clear organization context
const clearOrganizationContext = () => {
  localStorage.removeItem('current_organization')
  currentOrganizationContext.value = null
}

// Check if currently in organization context
const isInOrganizationContext = computed(() => {
  return currentOrganizationContext.value !== null
})

// Get current organization ID
const getCurrentOrganizationId = computed(() => {
  return currentOrganizationContext.value?.id || null
})

// Get current organization name
const getCurrentOrganizationName = computed(() => {
  return currentOrganizationContext.value?.name || null
})

// Get current organization enabled modules
const getCurrentOrganizationModules = computed(() => {
  return currentOrganizationContext.value?.enabled_modules || []
})

// Get current organization modules config
const getCurrentOrganizationModulesConfig = computed(() => {
  return currentOrganizationContext.value?.modules_config || {}
})

// Data filtering utilities
const filterDataByOrganization = (data, orgIdField = 'organization_id') => {
  if (!isInOrganizationContext.value) {
    // If not in organization context, return all data (super admin view)
    return data
  }

  const currentOrgId = getCurrentOrganizationId.value
  if (!Array.isArray(data)) {
    return data
  }

  // Filter data to only include items belonging to the current organization
  return data.filter(item => {
    // Handle different organization ID field names and formats
    const orgId = item[orgIdField] || item.org_id || item.organizationId
    return orgId === currentOrgId || orgId === currentOrgId.toString()
  })
}

// API parameter modification for organization context
const addOrganizationFilter = (params = {}) => {
  if (isInOrganizationContext.value) {
    return {
      ...params,
      organization_id: getCurrentOrganizationId.value
    }
  }
  return params
}

// Check if user has permission to view data
const hasOrganizationAccess = (item, orgIdField = 'organization_id') => {
  if (!isInOrganizationContext.value) {
    // Super admin can see all data
    return true
  }

  const currentOrgId = getCurrentOrganizationId.value
  const itemOrgId = item[orgIdField] || item.org_id || item.organizationId

  return itemOrgId === currentOrgId || itemOrgId === currentOrgId.toString()
}

// Get role-appropriate page title
const getContextualPageTitle = (baseTitle) => {
  if (isInOrganizationContext.value) {
    return `${baseTitle} - ${getCurrentOrganizationName.value}`
  }
  return baseTitle
}

// Listen for context changes across tabs/windows
const setupContextListener = () => {
  const handleStorageChange = (event) => {
    if (event.key === 'current_organization') {
      if (event.newValue) {
        try {
          currentOrganizationContext.value = JSON.parse(event.newValue)
        } catch (error) {
          console.error('Error parsing organization context from storage event:', error)
          currentOrganizationContext.value = null
        }
      } else {
        currentOrganizationContext.value = null
      }
    }
  }

  window.addEventListener('storage', handleStorageChange)

  return () => {
    window.removeEventListener('storage', handleStorageChange)
  }
}

// Watch for context changes and emit events
watch(currentOrganizationContext, (newContext, oldContext) => {
  // Emit custom event for context changes
  const event = new CustomEvent('organizationContextChanged', {
    detail: { newContext, oldContext }
  })
  window.dispatchEvent(event)

  // Also trigger system modules store reactivity update
  try {
    // Use dynamic import in a Promise to avoid using require
    import('@/stores/systemModules').then(({ useSystemModulesStore }) => {
      const systemModulesStore = useSystemModulesStore()
      systemModulesStore.refreshOrganizationContext()
    }).catch(() => {
      console.log('System modules store not available yet')
    })
  } catch {
    console.log('System modules store not available yet')
  }
}, { deep: true })

// Main composable function
export function useOrganizationContext() {
  // Initialize on first use
  if (currentOrganizationContext.value === null && !isLoading.value) {
    initializeOrganizationContext()
  }

  return {
    // State
    currentOrganizationContext,
    isLoading,

    // Computed
    isInOrganizationContext,
    getCurrentOrganizationId,
    getCurrentOrganizationName,

    // Methods
    setOrganizationContext,
    clearOrganizationContext,
    filterDataByOrganization,
    addOrganizationFilter,
    hasOrganizationAccess,
    getContextualPageTitle,
    setupContextListener
  }
}

// Export individual utilities for direct use
export {
  currentOrganizationContext,
  isInOrganizationContext,
  getCurrentOrganizationId,
  getCurrentOrganizationName,
  getCurrentOrganizationModules,
  getCurrentOrganizationModulesConfig,
  filterDataByOrganization,
  addOrganizationFilter,
  hasOrganizationAccess,
  setupContextListener
}