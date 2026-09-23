// Integration API Service – uses the shared authenticated API client.
// "current" is resolved server-side to the signed-in user's organisation.
import apiClient from './api'

const ORGANIZATION_ID = 'current'

export const integrationsAPI = {
  // Get integration settings for organization
  async getIntegrationSettings() {
    try {
      const response = await apiClient.get(`/integrations/organizations/${ORGANIZATION_ID}/settings`)
      return response.data
    } catch (error) {
      console.error('Failed to get integration settings:', error)
      throw error
    }
  },

  // Update integration settings
  async updateIntegrationSettings(settings) {
    try {
      const response = await apiClient.put(`/integrations/organizations/${ORGANIZATION_ID}/settings`, settings)
      return response.data
    } catch (error) {
      console.error('Failed to update integration settings:', error)
      throw error
    }
  },

  // Test connections
  async testStripeConnection() {
    try {
      const response = await apiClient.post(`/integrations/organizations/${ORGANIZATION_ID}/test/stripe`)
      return response.data
    } catch (error) {
      console.error('Failed to test Stripe connection:', error)
      throw error
    }
  },

  async testEmailConnection() {
    try {
      const response = await apiClient.post(`/integrations/organizations/${ORGANIZATION_ID}/test/email`)
      return response.data
    } catch (error) {
      console.error('Failed to test email connection:', error)
      throw error
    }
  },

  async testTwilioConnection() {
    try {
      const response = await apiClient.post(`/integrations/organizations/${ORGANIZATION_ID}/test/twilio`)
      return response.data
    } catch (error) {
      console.error('Failed to test Twilio connection:', error)
      throw error
    }
  },

  async testWhatsAppConnection() {
    try {
      const response = await apiClient.post(`/integrations/organizations/${ORGANIZATION_ID}/test/whatsapp`)
      return response.data
    } catch (error) {
      console.error('Failed to test WhatsApp connection:', error)
      throw error
    }
  },

  // Send test messages
  async sendTestEmail(emailData) {
    try {
      const response = await apiClient.post(`/integrations/organizations/${ORGANIZATION_ID}/send/test-email`, emailData)
      return response.data
    } catch (error) {
      console.error('Failed to send test email:', error)
      throw error
    }
  },

  async sendTestSMS(smsData) {
    try {
      const response = await apiClient.post(`/integrations/organizations/${ORGANIZATION_ID}/send/test-sms`, smsData)
      return response.data
    } catch (error) {
      console.error('Failed to send test SMS:', error)
      throw error
    }
  },

  async sendTestWhatsApp(whatsappData) {
    try {
      const response = await apiClient.post(`/integrations/organizations/${ORGANIZATION_ID}/send/test-whatsapp`, whatsappData)
      return response.data
    } catch (error) {
      console.error('Failed to send test WhatsApp:', error)
      throw error
    }
  },

  // Get logs and transactions
  async getIntegrationLogs(params = {}) {
    try {
      const response = await apiClient.get(`/integrations/organizations/${ORGANIZATION_ID}/logs/integrations`, { params })
      return response.data
    } catch (error) {
      console.error('Failed to fetch integration logs:', error)
      throw error
    }
  },

  async getCommunicationLogs(params = {}) {
    try {
      const response = await apiClient.get(`/integrations/organizations/${ORGANIZATION_ID}/logs/communications`, { params })
      return response.data
    } catch (error) {
      console.error('Failed to get communication logs:', error)
      throw error
    }
  },

  async getPaymentTransactions(params = {}) {
    try {
      const response = await apiClient.get(`/integrations/organizations/${ORGANIZATION_ID}/transactions/payments`, { params })
      return response.data
    } catch (error) {
      console.error('Failed to get payment transactions:', error)
      throw error
    }
  },

  // Get templates
  async getEmailTemplates() {
    try {
      const response = await apiClient.get('/integrations/templates/email')
      return response.data
    } catch (error) {
      console.error('Failed to fetch email templates:', error)
      throw error
    }
  },

  async getSMSTemplates() {
    try {
      const response = await apiClient.get('/integrations/templates/sms')
      return response.data
    } catch (error) {
      console.error('Failed to get SMS templates:', error)
      throw error
    }
  },

  async getWhatsAppTemplates() {
    try {
      const response = await apiClient.get('/integrations/templates/whatsapp')
      return response.data
    } catch (error) {
      console.error('Failed to get WhatsApp templates:', error)
      throw error
    }
  },

  // System-wide integration status
  async getSystemIntegrationStatus() {
    try {
      const response = await apiClient.get('/system/integrations/status')
      return response.data
    } catch (error) {
      console.error('Failed to fetch system integration status:', error)
      throw error
    }
  },

  // Health check
  async checkSystemHealth() {
    try {
      const response = await apiClient.get('/system/integrations/health')
      return response.data
    } catch (error) {
      console.error('Failed to check system health:', error)
      throw error
    }
  }
}

// Helper functions
export const formatError = (error) => {
  if (error.response?.data?.error) {
    return error.response.data.error
  }
  if (error.message) {
    return error.message
  }
  return 'An unknown error occurred'
}

export const showNotification = (message, type = 'info') => {
  // This would integrate with your notification system
  console.log(`[${type.toUpperCase()}] ${message}`)

  // For now, we'll use browser notifications
  if (type === 'success') {
    alert(`✅ ${message}`)
  } else if (type === 'error') {
    alert(`❌ ${message}`)
  } else {
    alert(`ℹ️ ${message}`)
  }
}

export default integrationsAPI