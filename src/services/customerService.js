import api from './api'
import { countryFlag, countryName } from '@/utils/currencies'

/** Customers & vehicles API (core /customers and /vehicles routes). */
export const customerService = {
  list: (params = {}) => api.get('/customers', { params }).then((r) => r.data?.customers || []),
  get: (id) => api.get(`/customers/${id}`).then((r) => r.data),
  create: (data) => api.post('/customers', data).then((r) => r.data?.customer),
  update: (id, data) => api.put(`/customers/${id}`, data).then((r) => r.data?.customer),
  remove: (id) => api.delete(`/customers/${id}`),
  toggleStatus: (id) => api.patch(`/customers/${id}/toggle-status`).then((r) => r.data?.customer),
  // tz: "new this month" uses the user's calendar month
  stats: () => api.get('/customers/stats', { params: { tz: Intl.DateTimeFormat().resolvedOptions().timeZone } }).then((r) => r.data?.stats || {}),

  vehicles: (customerId) => api.get(`/customers/${customerId}/vehicles`).then((r) => r.data?.vehicles || []),
  createVehicle: (data) => api.post('/vehicles', data).then((r) => r.data?.vehicle),
  updateVehicle: (id, data) => api.put(`/vehicles/${id}`, data).then((r) => r.data?.vehicle),
  removeVehicle: (id) => api.delete(`/vehicles/${id}`),

  // People at the customer who are copied on invoices, quotes, reminders, bookings
  contacts: (customerId) => api.get(`/customers/${customerId}/contacts`).then((r) => r.data?.contacts || []),
  createContact: (customerId, data) => api.post(`/customers/${customerId}/contacts`, data).then((r) => r.data?.contact),
  updateContact: (customerId, id, data) => api.put(`/customers/${customerId}/contacts/${id}`, data).then((r) => r.data?.contact),
  removeContact: (customerId, id) => api.delete(`/customers/${customerId}/contacts/${id}`),

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
  // Country is shown separately (see customerCountryLabel)
  return [a.street, [a.suburb, a.state, a.postcode].filter(Boolean).join(' ')].filter(Boolean).join(', ')
}

/** Country display name ('' when not set). */
export function customerCountry(c) {
  return countryName(c?.country_code) || c?.country_name || c?.address?.country || ''
}

/** '🇰🇪 Kenya' */
export function customerCountryLabel(c) {
  const name = customerCountry(c)
  return name ? `${countryFlag(c?.country_code)} ${name}`.trim() : ''
}

/**
 * The invoice editor prefills everything (address, currency, CC contacts)
 * from the customer record via customer_id; name/email/currency are passed
 * too so the form isn't empty while it loads.
 */
export function newInvoiceLink(c) {
  const q = new URLSearchParams({ customer_id: c?.id || '', client_name: customerName(c), client_email: c?.email || '' })
  if (c?.billing_currency) q.set('currency', c.billing_currency)
  return `/invoices/new?${q.toString()}`
}

export function newBookingLink(c) {
  return `/bookings?new=1&customer_id=${encodeURIComponent(c?.id || '')}`
}

export function invoicesLink(c) {
  return `/invoices?q=${encodeURIComponent(customerName(c))}`
}
