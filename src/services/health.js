import axios from 'axios'
import { API_ORIGIN } from '../config'

export const healthService = {
  async checkHealth() {
    try {
      const response = await axios.get(`${API_ORIGIN}/health`, {
        timeout: 5000
      })
      return response.data
    } catch (error) {
      console.error('Health check failed:', error)
      return {
        status: 'error',
        message: error.message || 'Health check failed'
      }
    }
  }
}