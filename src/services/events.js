import api from './api'
import { API_BASE_URL } from '../config'

/** Unwrap `{ success, data }` responses. */
const unwrap = (res) => (res && res.data && Object.prototype.hasOwnProperty.call(res.data, 'data') ? res.data.data : res.data)

const clean = (params = {}) => {
  const out = {}
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '' && v !== 'all') out[k] = v
  })
  return out
}

export const EVENT_TYPES = [
  { value: 'in_person', label: 'In person', icon: 'fa-solid fa-location-dot' },
  { value: 'online', label: 'Online', icon: 'fa-solid fa-video' },
  { value: 'hybrid', label: 'Hybrid', icon: 'fa-solid fa-circle-half-stroke' }
]

export const STATUS_META = {
  draft: { label: 'Draft', badge: 'draft' },
  upcoming: { label: 'Upcoming', badge: 'info' },
  live: { label: 'Happening now', badge: 'success' },
  completed: { label: 'Completed', badge: 'void-plain' },
  cancelled: { label: 'Cancelled', badge: 'danger' },
  published: { label: 'Published', badge: 'info' }
}

export const REG_STATUS = {
  confirmed: { label: 'Confirmed', badge: 'success' },
  pending: { label: 'Pending', badge: 'warning' },
  waitlisted: { label: 'Waitlisted', badge: 'info' },
  cancelled: { label: 'Cancelled', badge: 'danger' }
}

export const PAY_STATUS = {
  paid: { label: 'Paid', badge: 'success' },
  pending: { label: 'Unpaid', badge: 'warning' },
  free: { label: 'Free', badge: 'draft' },
  refunded: { label: 'Refunded', badge: 'draft' }
}

export function typeLabel(t) {
  return (EVENT_TYPES.find((x) => x.value === t) || EVENT_TYPES[0]).label
}

export function typeIcon(t) {
  return (EVENT_TYPES.find((x) => x.value === t) || EVENT_TYPES[0]).icon
}

/** Public, shareable landing page served by the backend. */
export function publicEventUrl(id) {
  let base = API_BASE_URL || '/api/v1'
  if (!/^https?:\/\//.test(base)) base = window.location.origin + (base.startsWith('/') ? '' : '/') + base
  return `${base.replace(/\/$/, '')}/public/events/${id}/page`
}

export function eventLocation(e) {
  if (!e) return ''
  if (e.type === 'online') return e.online_platform || 'Online'
  const a = e.address || {}
  const parts = [e.venue_name, a.suburb || a.city].filter(Boolean)
  const place = parts.join(', ') || 'Venue to be announced'
  return e.type === 'hybrid' ? `${place} + online` : place
}

export const eventsApi = {
  async list(params = {}) {
    return unwrap(await api.get('/events', { params: clean(params) }))
  },
  async stats() {
    return unwrap(await api.get('/events/stats'))
  },
  async categories() {
    return unwrap(await api.get('/events/categories'))
  },
  async get(id) {
    return unwrap(await api.get(`/events/${id}`))
  },
  async create(payload) {
    return unwrap(await api.post('/events', payload))
  },
  async update(id, payload) {
    return unwrap(await api.put(`/events/${id}`, payload))
  },
  async setStatus(id, status) {
    return unwrap(await api.post(`/events/${id}/status`, { status }))
  },
  async duplicate(id) {
    return unwrap(await api.post(`/events/${id}/duplicate`))
  },
  async remove(id) {
    return unwrap(await api.delete(`/events/${id}`))
  },

  // Registrations
  async registrations(id, params = {}) {
    return unwrap(await api.get(`/events/${id}/registrations`, { params: clean(params) }))
  },
  async addRegistration(id, payload) {
    return unwrap(await api.post(`/events/${id}/registrations`, payload))
  },
  async updateRegistration(id, regId, payload) {
    return unwrap(await api.put(`/events/${id}/registrations/${regId}`, payload))
  },
  async checkIn(id, regId, checkedIn = true) {
    return unwrap(await api.post(`/events/${id}/registrations/${regId}/check-in`, { checked_in: checkedIn }))
  },
  async removeRegistration(id, regId) {
    return unwrap(await api.delete(`/events/${id}/registrations/${regId}`))
  },
  async exportCsv(id, params = {}) {
    const res = await api.get(`/events/${id}/registrations/export`, { params: clean(params), responseType: 'blob' })
    return res.data
  }
}

export default eventsApi
