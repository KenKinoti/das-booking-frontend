import api from './api'

/** Customers & vehicles API (core /customers and /vehicles routes). */
export const customerService = {
  list: (params = {}) => api.get('/customers', { params }).then((r) => r.data?.customers || []),
  get: (id) => api.get(`/customers/${id}`).then((r) => r.data),
  create: (data) => api.post('/customers', data).then((r) => r.data?.customer),
  update: (id, data) => api.put(`/customers/${id}`, data).then((r) => r.data?.customer),
  remove: (id) => api.delete(`/customers/${id}`),
  toggleStatus: (id) => api.patch(`/customers/${id}/toggle-status`).then((r) => r.data?.customer),
  stats: () => api.get('/customers/stats').then((r) => r.data?.stats || {}),

  vehicles: (customerId) => api.get(`/customers/${customerId}/vehicles`).then((r) => r.data?.vehicles || []),
  createVehicle: (data) => api.post('/vehicles', data).then((r) => r.data?.vehicle),
  updateVehicle: (id, data) => api.put(`/vehicles/${id}`, data).then((r) => r.data?.vehicle),
  removeVehicle: (id) => api.delete(`/vehicles/${id}`),

  // Backwards-compatible names
  getCustomers(params = {}) {
    return api.get('/customers', { params })
  },
  getCustomer(id) {
    return api.get(`/customers/${id}`)
  },
  createCustomer(data) {
    return api.post('/customers', data)
  },
  updateCustomer(id, data) {
    return api.put(`/customers/${id}`, data)
  },
  deleteCustomer(id) {
    return api.delete(`/customers/${id}`)
  },
  toggleCustomerStatus(id) {
    return api.patch(`/customers/${id}/toggle-status`)
  },
  getCustomerVehicles(id) {
    return api.get(`/customers/${id}/vehicles`)
  },
  getCustomerStats() {
    return api.get('/customers/stats')
  }
}

export function customerName(c) {
  if (!c) return ''
  return `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.email || 'Unnamed customer'
}

export function initials(name = '') {
  return (
    String(name)
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0])
      .join('')
      .toUpperCase() || '?'
  )
}

export function customerAddress(c) {
  const a = c?.address || {}
  return [a.street, [a.suburb, a.state, a.postcode].filter(Boolean).join(' '), a.country && a.country !== 'Australia' ? a.country : '']
    .filter(Boolean)
    .join(', ')
}

export function newInvoiceLink(c) {
  const q = new URLSearchParams({ client_name: customerName(c), client_email: c?.email || '', customer_id: c?.id || '' })
  return `/invoices/new?${q.toString()}`
}

export function newBookingLink(c) {
  return `/bookings?new=1&customer_id=${encodeURIComponent(c?.id || '')}`
}

export function invoicesLink(c) {
  return `/invoices?q=${encodeURIComponent(customerName(c))}`
}
