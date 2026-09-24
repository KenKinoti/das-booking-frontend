import api from './api'

/** Organisation users (staff) API. */
export const usersService = {
  /** Returns { users, pagination, summary } */
  async list(params = {}) {
    const r = await api.get('/users', { params })
    const d = r.data?.data || {}
    return { users: d.users || [], pagination: d.pagination || {}, summary: d.summary || {} }
  },
  async create(data) {
    const r = await api.post('/users', data)
    return { user: r.data?.data, temporaryPassword: r.data?.temporary_password || '' }
  },
  async update(id, data) {
    const r = await api.put(`/users/${id}`, data)
    return r.data?.data
  },
  async remove(id) {
    await api.delete(`/users/${id}`)
  },
  /** Omit password to have the server generate a temporary one. */
  async resetPassword(id, password) {
    const r = await api.post(`/users/${id}/reset-password`, password ? { password } : {})
    return r.data?.temporary_password || ''
  },
  async me() {
    const r = await api.get('/users/me')
    return r.data?.data
  },

  // Backwards-compatible names
  async getAll(params = {}) {
    return api.get('/users', { params })
  },
  async getById(id) {
    return api.get(`/users/${id}`)
  },
  async delete(id) {
    return api.delete(`/users/${id}`)
  },
  async getCurrentUser() {
    return api.get('/users/me')
  }
}

export const ROLES = [
  { value: 'admin', label: 'Admin', description: 'Full access, including settings, billing and users', badge: 'ui-badge--converted' },
  { value: 'manager', label: 'Manager', description: 'Runs day-to-day operations, rosters and bookings', badge: 'ui-badge--info' },
  { value: 'staff', label: 'Staff member', description: 'Works shifts and bookings assigned to them', badge: 'ui-badge--draft' },
  { value: 'care_worker', label: 'Care worker', description: 'Delivers care shifts to participants', badge: 'ui-badge--success' },
  { value: 'support_coordinator', label: 'Support coordinator', description: 'Coordinates participant plans and supports', badge: 'ui-badge--warning' }
]

export function roleInfo(role) {
  if (role === 'super_admin') return { value: role, label: 'Super admin', badge: 'ui-badge--danger' }
  return ROLES.find((r) => r.value === role) || { value: role, label: String(role || 'Unknown').replace(/_/g, ' '), badge: 'ui-badge--draft' }
}

export function userName(u) {
  return `${u?.first_name || ''} ${u?.last_name || ''}`.trim() || u?.email || 'Unnamed'
}
