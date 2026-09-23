import api from './api'

export const documentsService = {
  async getAll(params = {}) {
    const response = await api.get('/documents', { params })
    return response
  },

  async getById(id) {
    const response = await api.get(`/documents/${id}`)
    return response
  },

  async upload(formData) {
    const response = await api.post('/documents', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return response
  },

  async update(id, documentData) {
    const response = await api.put(`/documents/${id}`, documentData)
    return response
  },

  async download(id) {
    const response = await api.get(`/documents/${id}/download`, {
      responseType: 'blob'
    })
    return response
  },

  async delete(id) {
    const response = await api.delete(`/documents/${id}`)
    return response
  },

  // Get documents by participant
  async getByParticipant(participantId, params = {}) {
    const response = await api.get('/documents', {
      params: {
        participant_id: participantId,
        ...params
      }
    })
    return response
  },

  // Get documents by category
  async getByCategory(category, params = {}) {
    const response = await api.get('/documents', {
      params: {
        category,
        ...params
      }
    })
    return response
  },

  // Share document
  async share(id, shareData) {
    const response = await api.post(`/documents/${id}/share`, shareData)
    return response
  },

  // Get document versions
  async getVersions(id) {
    const response = await api.get(`/documents/${id}/versions`)
    return response
  },

  // Get document metadata
  async getMetadata(id) {
    const response = await api.get(`/documents/${id}/metadata`)
    return response
  }
}