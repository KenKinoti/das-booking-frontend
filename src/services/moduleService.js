import api from './api'

// Mock data for development
const mockModuleConfig = {
  id: '1',
  organization_id: 'org-1',
  inventory_enabled: true,
  pos_enabled: true,
  supplier_enabled: true,
  hr_enabled: false,
  accounting_enabled: false,
  created_at: '2024-01-15T09:00:00Z',
  updated_at: '2024-03-15T10:30:00Z'
}

const mockOrganizationModules = [
  {
    organization_id: 'org-1',
    organization_name: 'DASYIN Auto Services',
    inventory_enabled: true,
    pos_enabled: true,
    supplier_enabled: true,
    hr_enabled: false,
    accounting_enabled: false
  },
  {
    organization_id: 'org-2',
    organization_name: 'QuickFix Garage',
    inventory_enabled: true,
    pos_enabled: false,
    supplier_enabled: true,
    hr_enabled: true,
    accounting_enabled: false
  }
]

export const moduleService = {
  // Get organization modules configuration
  async getOrganizationModules() {
    try {
      const response = await api.get('/module-config')
      return response
    } catch (error) {
      console.warn('Using mock data for module config:', error.message)
      return {
        data: {
          module_config: mockModuleConfig
        }
      }
    }
  },

  // Update organization modules configuration
  async updateOrganizationModules(organizationId, moduleData) {
    if (organizationId) {
      // Super admin updating specific organization
      return api.put(`/super-admin/modules/${organizationId}`, moduleData)
    } else {
      // Organization admin updating their own modules
      return api.put('/module-config', moduleData)
    }
  },

  // Super admin: Get all organization modules
  async getAllOrganizationModules() {
    try {
      const response = await api.get('/super-admin/modules')
      return response
    } catch (error) {
      console.warn('Using mock data for all organization modules:', error.message)
      return {
        data: {
          organization_modules: mockOrganizationModules
        }
      }
    }
  }
}