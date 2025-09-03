import api from './api'

export const usersService = {
  async getAll(params = {}) {
    console.log('🚀 usersService.getAll called with params:', params)
    try {
      // Try /users first, fallback to /staff for mock server
      let response
      try {
        console.log('📡 Trying /users endpoint...')
        response = await api.get('/users', { params })
        console.log('✅ /users response:', response)
      } catch (error) {
        console.log('❌ /users failed:', error.response?.status, error.message)
        if (error.response?.status === 404) {
          console.log('📡 Fallback to /staff endpoint...')
          // Fallback to staff endpoint for mock server
          response = await api.get('/staff', { params })
          console.log('✅ /staff response:', response)
          
          // Transform staff data to match users format
          if (response.data?.staff) {
            console.log('🔄 Transforming staff data to users format...')
            response.data.users = response.data.staff.map(staff => ({
              ...staff,
              email: `${staff.first_name.toLowerCase()}.${staff.last_name.toLowerCase()}@company.com`,
              role: 'care_worker',
              is_active: true,
              last_login_at: null
            }))
            console.log('✅ Transformed users:', response.data.users)
          }
        } else {
          throw error
        }
      }
      return response
    } catch (error) {
      console.error('❌ usersService.getAll error:', error)
      throw error
    }
  },

  async getById(id) {
    try {
      const response = await api.get(`/users/${id}`)
      return response
    } catch (error) {
      throw error
    }
  },

  async create(userData) {
    try {
      const response = await api.post('/users', userData)
      return response
    } catch (error) {
      throw error
    }
  },

  async update(id, userData) {
    try {
      const response = await api.put(`/users/${id}`, userData)
      return response
    } catch (error) {
      throw error
    }
  },

  async delete(id) {
    try {
      const response = await api.delete(`/users/${id}`)
      return response
    } catch (error) {
      throw error
    }
  },

  async getCurrentUser() {
    try {
      const response = await api.get('/users/me')
      return response
    } catch (error) {
      throw error
    }
  }
}