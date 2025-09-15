import api from './api'

export const customerService = {
  // Get all customers
  async getCustomers(params = {}) {
    return api.get('/customers', { params })
  },

  // Get customer by ID
  async getCustomer(id) {
    return api.get(`/customers/${id}`)
  },

  // Create new customer
  async createCustomer(customerData) {
    return api.post('/customers', customerData)
  },

  // Update customer
  async updateCustomer(id, customerData) {
    return api.put(`/customers/${id}`, customerData)
  },

  // Delete customer
  async deleteCustomer(id) {
    return api.delete(`/customers/${id}`)
  },

  // Toggle customer status
  async toggleCustomerStatus(id) {
    return api.patch(`/customers/${id}/toggle-status`)
  },

  // Get customer vehicles
  async getCustomerVehicles(id) {
    return api.get(`/customers/${id}/vehicles`)
  },

  // Get customer statistics
  async getCustomerStats() {
    return api.get('/customers/stats')
  }
}