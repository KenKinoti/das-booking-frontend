import api from './api'

export const organizationService = {
  // Get current organization
  async getOrganization() {
    return api.get('/organization')
  },

  // Update organization
  async updateOrganization(organizationData) {
    return api.put('/organization', organizationData)
  },

  // Get organization branding
  async getOrganizationBranding() {
    return api.get('/organization/branding')
  },

  // Update organization branding
  async updateOrganizationBranding(brandingData) {
    return api.put('/organization/branding', brandingData)
  },

  // Get organization settings
  async getOrganizationSettings() {
    return api.get('/organization/settings')
  },

  // Update organization settings
  async updateOrganizationSettings(settingsData) {
    return api.put('/organization/settings', settingsData)
  },

  // Get organization subscription
  async getOrganizationSubscription() {
    return api.get('/organization/subscription')
  },

  // Update organization subscription
  async updateOrganizationSubscription(subscriptionData) {
    return api.put('/organization/subscription', subscriptionData)
  },

  // Super Admin: Get all organizations
  async getAllOrganizations() {
    return api.get('/super-admin/organizations')
  },

  // Super Admin: Get organization by ID
  async getOrganizationById(id) {
    return api.get(`/super-admin/organizations/${id}`)
  },

  // Super Admin: Create organization
  async createOrganization(organizationData) {
    return api.post('/super-admin/organizations', organizationData)
  },

  // Super Admin: Update organization status
  async updateOrganizationStatus(id, status) {
    return api.patch(`/super-admin/organizations/${id}/status`, { status })
  },

  // Super Admin: Delete organization
  async deleteOrganization(id) {
    return api.delete(`/super-admin/organizations/${id}`)
  }
}