import api from './api'

export const carePlansService = {
  async getAll(params = {}) {
    const response = await api.get('/care-plans', { params })
    return response
  },

  async getById(id) {
    const response = await api.get(`/care-plans/${id}`)
    return response
  },

  async create(carePlanData) {
    const response = await api.post('/care-plans', carePlanData)
    return response
  },

  async update(id, carePlanData) {
    const response = await api.put(`/care-plans/${id}`, carePlanData)
    return response
  },

  async delete(id) {
    const response = await api.delete(`/care-plans/${id}`)
    return response
  },

  async approve(id, approvalData) {
    const response = await api.patch(`/care-plans/${id}/approve`, approvalData)
    return response
  },

  // Get care plans by participant
  async getByParticipant(participantId, params = {}) {
    const response = await api.get('/care-plans', {
      params: {
        participant_id: participantId,
        ...params
      }
    })
    return response
  },

  // Get care plans by status
  async getByStatus(status, params = {}) {
    const response = await api.get('/care-plans', {
      params: {
        status,
        ...params
      }
    })
    return response
  }
}