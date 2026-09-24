// Platform admin (super admin) API + "log in as organisation" helpers.
import api from './api'
import { useOrganizationContext } from '@/composables/useOrganizationContext'

const BASE = '/super-admin/platform'
const d = (r) => r.data?.data ?? r.data

export const platformAPI = {
  overview: () => api.get(`${BASE}/overview`).then(d),

  organizations: (params) => api.get(`${BASE}/organizations`, { params }).then(d),
  organization: (id) => api.get(`${BASE}/organizations/${id}`).then(d),
  createOrganization: (body) => api.post(`${BASE}/organizations`, body).then(d),
  updateOrganization: (id, body) => api.put(`${BASE}/organizations/${id}`, body).then(d),
  suspendOrganization: (id, reason) => api.post(`${BASE}/organizations/${id}/suspend`, { reason }).then(d),
  activateOrganization: (id) => api.post(`${BASE}/organizations/${id}/activate`).then(d),
  deleteOrganization: (id, confirmName) => api.delete(`${BASE}/organizations/${id}`, { data: { confirm_name: confirmName } }).then(d),
  impersonate: (id) => api.post(`${BASE}/organizations/${id}/impersonate`).then(d),

  modules: () => api.get(`${BASE}/modules`).then(d),

  users: (params) => api.get(`${BASE}/users`, { params }).then(d),
  createUser: (body) => api.post(`${BASE}/users`, body).then(d),
  updateUser: (id, body) => api.put(`${BASE}/users/${id}`, body).then(d),
  resetPassword: (id) => api.post(`${BASE}/users/${id}/reset-password`).then(d),

  audit: (params) => api.get(`${BASE}/audit-logs`, { params }).then(d),

  database: () => api.get(`${BASE}/database`).then(d),
  analyze: () => api.post(`${BASE}/database/analyze`).then(d),

  integrations: () => api.get(`${BASE}/integrations`).then(d),
  saveIntegrations: (body) => api.put(`${BASE}/integrations`, body).then(d),
  testIntegration: (kind) => api.post(`${BASE}/integrations/test/${kind}`, null, { timeout: 40000 }).then(d),
  integrationLogs: () => api.get(`${BASE}/integrations/logs`).then(d),
  sendTestEmail: (to) => api.post(`${BASE}/integrations/send-test-email`, { to }, { timeout: 40000 }).then(d)
}

export const AUDIT_LABELS = {
  'organization.create': 'Organisation created',
  'organization.update': 'Organisation updated',
  'organization.suspend': 'Organisation suspended',
  'organization.activate': 'Organisation reactivated',
  'organization.delete': 'Organisation deleted',
  'organization.impersonate': 'Signed in as organisation',
  'user.create': 'User created',
  'user.update': 'User updated',
  'user.deactivate': 'User deactivated',
  'user.activate': 'User activated',
  'user.reset_password': 'Password reset',
  'database.analyze': 'Database statistics refreshed',
  'settings.integrations.update': 'Integration settings changed'
}

export function auditActionLabel(a) {
  if (AUDIT_LABELS[a]) return AUDIT_LABELS[a]
  const s = String(a || '').replace(/[._]/g, ' ')
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export const ROLE_LABELS = {
  super_admin: 'Super admin',
  admin: 'Admin',
  manager: 'Manager',
  staff: 'Staff',
  care_worker: 'Care worker',
  support_coordinator: 'Support coordinator'
}

export const roleLabel = (r) => ROLE_LABELS[r] || (r ? r.replace(/_/g, ' ') : '—')

export function initials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  return ((parts[0][0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

export function timeAgo(value) {
  if (!value) return 'Never'
  const t = new Date(value).getTime()
  if (Number.isNaN(t)) return '—'
  const s = Math.max(0, (Date.now() - t) / 1000)
  if (s < 60) return 'Just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`
  const days = Math.floor(s / 86400)
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`
  const years = Math.floor(days / 365)
  return `${years} year${years === 1 ? '' : 's'} ago`
}

export function formatBytes(n) {
  const v = Number(n) || 0
  if (v < 1024) return `${v} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let x = v / 1024
  let i = 0
  while (x >= 1024 && i < units.length - 1) {
    x /= 1024
    i++
  }
  return `${x.toFixed(x >= 100 ? 0 : 1)} ${units[i]}`
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      ta.remove()
      return ok
    } catch {
      return false
    }
  }
}

// ---------------------------------------------------------------------------
// "Log in as" an organisation. The backend issues a one-hour token that keeps
// the super admin's identity but scopes every request to that organisation.
// The super admin's own session is parked in localStorage and restored when
// the organisation banner's "Exit" returns to the platform overview.

const PARK_KEY = 'platform_impersonation'

function readPark() {
  try {
    return JSON.parse(localStorage.getItem(PARK_KEY) || 'null')
  } catch {
    return null
  }
}

export function isImpersonating() {
  return !!readPark()
}

export async function startImpersonation(org) {
  const res = await platformAPI.impersonate(org.id)
  if (!readPark()) {
    localStorage.setItem(
      PARK_KEY,
      JSON.stringify({
        token: localStorage.getItem('auth_token'),
        refresh_token: localStorage.getItem('refresh_token'),
        started_at: new Date().toISOString()
      })
    )
  }
  localStorage.setItem('auth_token', res.token)
  // The org session cannot be refreshed; it simply ends after an hour.
  localStorage.removeItem('refresh_token')
  const { setOrganizationContext } = useOrganizationContext()
  setOrganizationContext({ ...res.organization, id: res.organization.id, name: res.organization.name })
  window.location.assign('/dashboard')
}

/**
 * Platform admin pages always run as the super admin. Call on page creation:
 * if an organisation session is active (or a stale context is left over from
 * an older version), the super admin's own session is restored. Returns true
 * when the page must reload to pick the restored session up.
 */
export function ensurePlatformSession() {
  const park = readPark()
  const { clearOrganizationContext } = useOrganizationContext()
  if (!park) {
    // A context without a parked session is display-only and misleading.
    if (localStorage.getItem('current_organization')) clearOrganizationContext()
    return false
  }
  if (park.token) localStorage.setItem('auth_token', park.token)
  if (park.refresh_token) localStorage.setItem('refresh_token', park.refresh_token)
  localStorage.removeItem(PARK_KEY)
  clearOrganizationContext()
  return true
}
