import api from './api'

export const messagingService = {
  // Thread operations
  async getThreads(page = 1, limit = 50) {
    try {
      const response = await api.get(`/messaging/threads?page=${page}&limit=${limit}`)
      return response.data
    } catch (error) {
      throw error
    }
  },

  async createThread(threadData) {
    try {
      const response = await api.post('/messaging/threads', threadData)
      return response.data
    } catch (error) {
      throw error
    }
  },

  // Message operations
  async getMessages(threadId, page = 1, limit = 50) {
    try {
      const response = await api.get(`/messaging/threads/${threadId}/messages?page=${page}&limit=${limit}`)
      return response.data
    } catch (error) {
      throw error
    }
  },

  async sendMessage(threadId, messageData) {
    try {
      const response = await api.post(`/messaging/threads/${threadId}/messages`, messageData)
      return response.data
    } catch (error) {
      throw error
    }
  },

  // Settings
  async getSettings() {
    try {
      const response = await api.get('/messaging/settings')
      return response.data
    } catch (error) {
      throw error
    }
  },

  async updateSettings(settings) {
    try {
      const response = await api.put('/messaging/settings', settings)
      return response.data
    } catch (error) {
      throw error
    }
  },

  // Integrations
  async getIntegrations() {
    try {
      const response = await api.get('/messaging/integrations')
      return response.data
    } catch (error) {
      throw error
    }
  },

  async updateIntegration(provider, integrationData) {
    try {
      const response = await api.put(`/messaging/integrations/${provider}`, integrationData)
      return response.data
    } catch (error) {
      throw error
    }
  },

  // Search
  async searchMessages(query, threadId = null) {
    try {
      const params = new URLSearchParams({ q: query })
      if (threadId) params.append('thread_id', threadId)

      const response = await api.get(`/messaging/search?${params}`)
      return response.data
    } catch (error) {
      throw error
    }
  },

  // File upload
  async uploadFile(threadId, file, onProgress) {
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await api.post(`/messaging/threads/${threadId}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          )
          if (onProgress) onProgress(percentCompleted)
        },
      })
      return response.data
    } catch (error) {
      throw error
    }
  },

  // Unread count
  async getUnreadCount() {
    try {
      const response = await api.get('/messaging/unread-count')
      return response.data
    } catch (error) {
      throw error
    }
  },

  // WhatsApp Integration
  async sendWhatsAppMessage(to, message) {
    try {
      const response = await api.post('/messaging/whatsapp/send', { to, message })
      return response.data
    } catch (error) {
      throw error
    }
  },

  async sendWhatsAppTemplate(to, template, language = 'en_US', components = []) {
    try {
      const response = await api.post('/messaging/whatsapp/send-template', {
        to,
        template,
        language,
        components
      })
      return response.data
    } catch (error) {
      throw error
    }
  },

  async testWhatsAppConnection() {
    try {
      const response = await api.post('/messaging/whatsapp/test-connection')
      return response.data
    } catch (error) {
      throw error
    }
  }
}

// WebSocket service for real-time messaging
export class WebSocketService {
  constructor() {
    this.socket = null
    this.isConnected = false
    this.listeners = new Map()
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
  }

  connect(userId, organizationId) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.hostname
    const port = import.meta.env.VITE_WS_PORT || '8089'
    const wsUrl = `${protocol}//${host}:${port}/ws/messaging`

    this.socket = new WebSocket(wsUrl)

    this.socket.onopen = () => {
      console.log('WebSocket connected')
      this.isConnected = true
      this.reconnectAttempts = 0

      // Send authentication message
      this.send({
        type: 'auth',
        user_id: userId,
        organization_id: organizationId
      })
    }

    this.socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        this.handleMessage(message)
      } catch (error) {
        console.error('Error parsing WebSocket message:', error)
      }
    }

    this.socket.onclose = () => {
      console.log('WebSocket disconnected')
      this.isConnected = false
      this.attemptReconnect(userId, organizationId)
    }

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error)
    }
  }

  attemptReconnect(userId, organizationId) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      const delay = Math.pow(2, this.reconnectAttempts) * 1000 // Exponential backoff

      console.log(`Attempting to reconnect in ${delay}ms... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)

      setTimeout(() => {
        this.connect(userId, organizationId)
      }, delay)
    } else {
      console.error('Max reconnection attempts reached')
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close()
      this.socket = null
      this.isConnected = false
    }
  }

  send(data) {
    if (this.isConnected && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data))
    } else {
      console.warn('WebSocket not connected, message not sent:', data)
    }
  }

  handleMessage(message) {
    const { type } = message

    if (this.listeners.has(type)) {
      const callbacks = this.listeners.get(type)
      callbacks.forEach(callback => callback(message))
    }

    // Handle specific message types
    switch (type) {
      case 'new_message':
        this.emit('message_received', message.data)
        break
      case 'typing_indicator':
        this.emit('typing_changed', message.data)
        break
      case 'user_online':
        this.emit('user_status_changed', { user_id: message.user_id, status: 'online' })
        break
      case 'user_offline':
        this.emit('user_status_changed', { user_id: message.user_id, status: 'offline' })
        break
      default:
        this.emit(type, message.data)
    }
  }

  on(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, [])
    }
    this.listeners.get(eventType).push(callback)
  }

  off(eventType, callback) {
    if (this.listeners.has(eventType)) {
      const callbacks = this.listeners.get(eventType)
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    }
  }

  emit(eventType, data) {
    if (this.listeners.has(eventType)) {
      const callbacks = this.listeners.get(eventType)
      callbacks.forEach(callback => callback(data))
    }
  }

  // Convenience methods
  joinThread(threadId) {
    this.send({
      type: 'join_thread',
      thread_id: threadId
    })
  }

  leaveThread(threadId) {
    this.send({
      type: 'leave_thread',
      thread_id: threadId
    })
  }

  startTyping(threadId, userId) {
    this.send({
      type: 'typing_start',
      thread_id: threadId,
      user_id: userId
    })
  }

  stopTyping(threadId, userId) {
    this.send({
      type: 'typing_stop',
      thread_id: threadId,
      user_id: userId
    })
  }
}

// Create a singleton instance
export const webSocketService = new WebSocketService()

// Utility functions
export const formatMessageTime = (timestamp) => {
  const date = new Date(timestamp)
  const now = new Date()

  // Check if it's today
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  // Check if it's yesterday
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday'
  }

  // Check if it's this week
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  if (date > weekAgo) {
    return date.toLocaleDateString([], { weekday: 'short' })
  }

  // Otherwise show date
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export const getMessageStatus = (message, currentUserId) => {
  if (message.sender_id === currentUserId) {
    if (message.read_at) return 'read'
    if (message.delivered_at) return 'delivered'
    return 'sent'
  }
  return null
}

export const groupMessagesByDate = (messages) => {
  const groups = {}

  messages.forEach(message => {
    const date = new Date(message.created_at).toDateString()
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(message)
  })

  return Object.entries(groups).map(([date, messages]) => ({
    date,
    messages
  }))
}