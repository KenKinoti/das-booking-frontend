import api from './api'

export const eventsService = {
  // Events CRUD
  async getAllEvents(params = {}) {
    try {
      const queryParams = new URLSearchParams()

      // Add pagination
      if (params.page) queryParams.append('page', params.page.toString())
      if (params.limit) queryParams.append('limit', params.limit.toString())

      // Add filters
      if (params.category) queryParams.append('category', params.category)
      if (params.type) queryParams.append('type', params.type)
      if (params.status) queryParams.append('status', params.status)
      if (params.organization_id) queryParams.append('organization_id', params.organization_id)
      if (params.search) queryParams.append('search', params.search)
      if (params.upcoming) queryParams.append('upcoming', 'true')

      const response = await api.get(`/events?${queryParams}`)
      return response
    } catch (error) {
      throw error
    }
  },

  async getEventById(eventId) {
    try {
      const response = await api.get(`/events/${eventId}`)
      return response
    } catch (error) {
      throw error
    }
  },

  async createEvent(eventData) {
    try {
      // Transform the event data to match backend expectations
      const transformedData = {
        ...eventData,
        // Convert date strings to proper ISO format if needed
        start_date: eventData.start_date ? new Date(eventData.start_date).toISOString() : null,
        end_date: eventData.end_date ? new Date(eventData.end_date).toISOString() : null,
        // Handle address object
        address: {
          street: eventData.venue_address_street || '',
          city: eventData.venue_address_city || '',
          state: eventData.venue_address_state || '',
          postcode: eventData.venue_address_postcode || '',
          country: eventData.venue_address_country || 'Australia'
        }
      }

      const response = await api.post('/events', transformedData)
      return response
    } catch (error) {
      throw error
    }
  },

  async updateEvent(eventId, eventData) {
    try {
      const transformedData = {
        ...eventData,
        start_date: eventData.start_date ? new Date(eventData.start_date).toISOString() : null,
        end_date: eventData.end_date ? new Date(eventData.end_date).toISOString() : null,
        address: {
          street: eventData.venue_address_street || '',
          city: eventData.venue_address_city || '',
          state: eventData.venue_address_state || '',
          postcode: eventData.venue_address_postcode || '',
          country: eventData.venue_address_country || 'Australia'
        }
      }

      const response = await api.put(`/events/${eventId}`, transformedData)
      return response
    } catch (error) {
      throw error
    }
  },

  async deleteEvent(eventId) {
    try {
      const response = await api.delete(`/events/${eventId}`)
      return response
    } catch (error) {
      throw error
    }
  },

  // Ticket Types
  async getTicketTypes(eventId) {
    try {
      const response = await api.get(`/events/${eventId}/tickets`)
      return response
    } catch (error) {
      throw error
    }
  },

  async createTicketType(eventId, ticketTypeData) {
    try {
      const transformedData = {
        ...ticketTypeData,
        sale_start_date: ticketTypeData.sale_start_date ? new Date(ticketTypeData.sale_start_date).toISOString() : null,
        sale_end_date: ticketTypeData.sale_end_date ? new Date(ticketTypeData.sale_end_date).toISOString() : null
      }

      const response = await api.post(`/events/${eventId}/tickets`, transformedData)
      return response
    } catch (error) {
      throw error
    }
  },

  // Registrations
  async registerForEvent(eventId, registrationData) {
    try {
      const response = await api.post(`/events/${eventId}/register`, registrationData)
      return response
    } catch (error) {
      throw error
    }
  },

  async getRegistrations(eventId) {
    try {
      const response = await api.get(`/events/${eventId}/registrations`)
      return response
    } catch (error) {
      throw error
    }
  },

  async checkInRegistration(qrCode, checkedInBy) {
    try {
      const response = await api.post('/events/checkin', {
        qr_code: qrCode,
        checked_in_by: checkedInBy
      })
      return response
    } catch (error) {
      throw error
    }
  },

  // Event Categories
  async getEventCategories() {
    try {
      const response = await api.get('/events/categories')
      return response
    } catch (error) {
      throw error
    }
  },

  // Analytics
  async getEventAnalytics(eventId) {
    try {
      const response = await api.get(`/events/${eventId}/analytics`)
      return response
    } catch (error) {
      throw error
    }
  },

  // Search
  async searchEvents(query) {
    try {
      const response = await api.get(`/events/search?q=${encodeURIComponent(query)}`)
      return response
    } catch (error) {
      throw error
    }
  },

  // Organizer-specific methods
  async getOrganizerEvents(params = {}) {
    try {
      const queryParams = new URLSearchParams()

      if (params.page) queryParams.append('page', params.page.toString())
      if (params.limit) queryParams.append('limit', params.limit.toString())
      if (params.status) queryParams.append('status', params.status)

      const response = await api.get(`/organizer/events?${queryParams}`)
      return response
    } catch (error) {
      throw error
    }
  },

  async createOrganizerEvent(eventData) {
    try {
      const transformedData = {
        ...eventData,
        start_date: eventData.start_date ? new Date(eventData.start_date).toISOString() : null,
        end_date: eventData.end_date ? new Date(eventData.end_date).toISOString() : null,
        address: {
          street: eventData.venue_address_street || '',
          city: eventData.venue_address_city || '',
          state: eventData.venue_address_state || '',
          postcode: eventData.venue_address_postcode || '',
          country: eventData.venue_address_country || 'Australia'
        }
      }

      const response = await api.post('/organizer/events', transformedData)
      return response
    } catch (error) {
      throw error
    }
  },

  // File upload helpers
  async uploadEventImage(eventId, imageFile, imageType = 'cover') {
    try {
      const formData = new FormData()
      formData.append('image', imageFile)
      formData.append('type', imageType)

      const response = await api.post(`/events/${eventId}/images`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      return response
    } catch (error) {
      throw error
    }
  },

  // Export functionality
  async exportRegistrations(eventId, format = 'csv') {
    try {
      const response = await api.get(`/events/${eventId}/registrations/export?format=${format}`, {
        responseType: 'blob'
      })

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `event-${eventId}-registrations.${format}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      return { success: true }
    } catch (error) {
      throw error
    }
  },

  // Duplicate event
  async duplicateEvent(eventId) {
    try {
      const response = await api.post(`/events/${eventId}/duplicate`)
      return response
    } catch (error) {
      throw error
    }
  },

  // Batch operations
  async bulkUpdateEventStatus(eventIds, status) {
    try {
      const response = await api.post('/events/bulk/status', {
        event_ids: eventIds,
        status: status
      })
      return response
    } catch (error) {
      throw error
    }
  },

  async bulkDeleteEvents(eventIds) {
    try {
      const response = await api.delete('/events/bulk', {
        data: { event_ids: eventIds }
      })
      return response
    } catch (error) {
      throw error
    }
  }
}

// Event utility functions
export const eventUtils = {
  formatEventType(type) {
    const types = {
      'in_person': 'In Person',
      'online': 'Online',
      'hybrid': 'Hybrid'
    }
    return types[type] || type
  },

  formatEventStatus(status) {
    const statuses = {
      'draft': 'Draft',
      'published': 'Published',
      'cancelled': 'Cancelled',
      'postponed': 'Postponed',
      'completed': 'Completed'
    }
    return statuses[status] || status
  },

  getEventBadgeClass(type, status) {
    if (status) {
      return `badge-${status}`
    }
    return `badge-${type}`
  },

  isEventUpcoming(startDate) {
    return new Date(startDate) > new Date()
  },

  isEventOngoing(startDate, endDate) {
    const now = new Date()
    return now >= new Date(startDate) && now <= new Date(endDate)
  },

  isEventFinished(endDate) {
    return new Date(endDate) < new Date()
  },

  calculateEventDuration(startDate, endDate) {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const durationMs = end - start
    const durationMins = Math.floor(durationMs / (1000 * 60))

    const hours = Math.floor(durationMins / 60)
    const minutes = durationMins % 60

    if (hours === 0) return `${minutes} minutes`
    if (minutes === 0) return `${hours} hour${hours > 1 ? 's' : ''}`
    return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minutes`
  },

  formatEventDate(startDate, endDate) {
    const start = new Date(startDate)
    const end = new Date(endDate)

    if (start.toDateString() === end.toDateString()) {
      return start.toLocaleDateString('en-AU', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    } else {
      return `${start.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-AU', { month: 'short', day: 'numeric', year: 'numeric' })}`
    }
  },

  formatEventTime(startDate, endDate) {
    const start = new Date(startDate)
    const end = new Date(endDate)

    return `${start.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}`
  },

  getEventLocation(event) {
    if (event.type === 'online') {
      return event.online_platform || 'Online'
    } else if (event.type === 'hybrid') {
      return `${event.venue_name || 'TBA'} + Online`
    } else {
      const parts = []
      if (event.venue_name) parts.push(event.venue_name)
      if (event.venue_address_city) parts.push(event.venue_address_city)
      if (event.venue_address_state) parts.push(event.venue_address_state)
      return parts.length > 0 ? parts.join(', ') : 'TBA'
    }
  },

  getEventPrice(event) {
    if (event.is_free) {
      return 'Free'
    }

    if (event.ticket_types && event.ticket_types.length > 1) {
      const prices = event.ticket_types.map(t => t.price).sort((a, b) => a - b)
      return `$${prices[0]} - $${prices[prices.length - 1]}`
    }

    return `$${event.base_price || 0}`
  },

  calculateEventRevenue(event) {
    if (!event.ticket_types) return 0
    return event.ticket_types.reduce((sum, ticket) => {
      return sum + (ticket.price * ticket.sold_quantity || 0)
    }, 0)
  },

  getTicketAvailability(ticketType) {
    return (ticketType.quantity || 0) - (ticketType.sold_quantity || 0)
  },

  isTicketSaleActive(ticketType) {
    const now = new Date()
    const saleStart = ticketType.sale_start_date ? new Date(ticketType.sale_start_date) : new Date(0)
    const saleEnd = ticketType.sale_end_date ? new Date(ticketType.sale_end_date) : new Date('2099-12-31')

    return now >= saleStart && now <= saleEnd && ticketType.is_active
  }
}

export default eventsService