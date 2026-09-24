import api from './api'

// Module configuration API. Errors propagate to the caller (the modules store
// treats a failure as "no optional modules enabled") — no mock fallbacks.
export const moduleService = {
  // Get organization modules configuration
  getOrganizationModules() {
    return api.get('/module-config')
  },

  // Update organization modules configuration
  updateOrganizationModules(organizationId, moduleData) {
    if (organizationId) {
      // Super admin updating specific organization
      return api.put(`/super-admin/modules/${organizationId}`, moduleData)
    }
    // Organization admin updating their own modules
    return api.put('/module-config', moduleData)
  },

  // Super admin: Get all organization modules
  getAllOrganizationModules() {
    return api.get('/super-admin/modules')
  }
}
