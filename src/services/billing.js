import api from './api'

export const billingService = {
  async getAll(params = {}) {
    const response = await api.get('/billing', { params })
    return response
  },

  async getById(id) {
    const response = await api.get(`/billing/${id}`)
    return response
  },

  async create(billingData) {
    const response = await api.post('/billing', billingData)
    return response
  },

  async update(id, billingData) {
    const response = await api.put(`/billing/${id}`, billingData)
    return response
  },

  async delete(id) {
    const response = await api.delete(`/billing/${id}`)
    return response
  },

  // Generate invoice from shifts
  async generateInvoice(invoiceData) {
    const response = await api.post('/billing/generate', invoiceData)
    return response
  },

  // Get billing by participant
  async getByParticipant(participantId, params = {}) {
    const response = await api.get('/billing', {
      params: {
        participant_id: participantId,
        ...params
      }
    })
    return response
  },

  // Get billing by date range
  async getByDateRange(startDate, endDate, params = {}) {
    const response = await api.get('/billing', {
      params: {
        start_date: startDate,
        end_date: endDate,
        ...params
      }
    })
    return response
  },

  // Mark as paid
  async markAsPaid(id, paymentData) {
    const response = await api.post(`/billing/${id}/payment`, paymentData)
    return response
  },

  // Download invoice PDF
  async downloadInvoice(id) {
    const response = await api.get(`/billing/${id}/download`, {
      responseType: 'blob'
    })
    return response
  }
}