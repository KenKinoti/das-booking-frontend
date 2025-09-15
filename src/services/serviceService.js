import api from './api'

export const serviceService = {
  // Get all services
  async getServices(params = {}) {
    return api.get('/services', { params })
  },

  // Get service by ID
  async getService(id) {
    return api.get(`/services/${id}`)
  },

  // Create new service
  async createService(serviceData) {
    return api.post('/services', serviceData)
  },

  // Update service
  async updateService(id, serviceData) {
    return api.put(`/services/${id}`, serviceData)
  },

  // Delete service
  async deleteService(id) {
    return api.delete(`/services/${id}`)
  },

  // Toggle service status
  async toggleServiceStatus(id) {
    return api.patch(`/services/${id}/toggle-status`)
  },

  // Duplicate service
  async duplicateService(id) {
    return api.post(`/services/${id}/duplicate`)
  },

  // Get service categories
  async getServiceCategories() {
    return api.get('/services/categories')
  },

  // Get service statistics
  async getServiceStats() {
    return api.get('/services/stats')
  }
}