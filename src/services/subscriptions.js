/**
 * Client subscriptions — customers on catalogue services billed monthly,
 * quarterly or yearly; invoices ahead with the pay link, reminders, admin
 * alerts at least 3 days before a suspension, suspension at Synergy
 * Wholesale through its API (tasks for other providers), domain renewals,
 * the dashboard and the public "Your services" page.
 * Backend: /api/v1/subscriptions/* and /api/v1/public/your-services/:token (pkg/subscriptions).
 */
import api from '@/services/api'

const BASE = '/subscriptions'
const data = (r) => r.data?.data ?? r.data

export const subscriptionsApi = {
  dashboard: () => api.get(`${BASE}/dashboard`).then(data),
  list: (params = {}) => api.get(BASE, { params }).then(data),
  get: (id) => api.get(`${BASE}/${id}`).then(data),
  create: (body) => api.post(BASE, body).then(data),
  update: (id, body) => api.put(`${BASE}/${id}`, body).then(data),
  remove: (id) => api.delete(`${BASE}/${id}`).then(data),
  extend: (id, days, note) => api.post(`${BASE}/${id}/extend`, { days, note }).then(data),
  markPaid: (id, body) => api.post(`${BASE}/${id}/mark-paid`, body, { timeout: 120000 }).then(data),
  suspend: (id, note) => api.post(`${BASE}/${id}/suspend`, { note }, { timeout: 120000 }).then(data),
  skipSuspension: (id, note, undo = false) => api.post(`${BASE}/${id}/skip-suspension`, { note, undo }).then(data),
  unsuspend: (id, days, note) => api.post(`${BASE}/${id}/unsuspend`, { days, note }, { timeout: 120000 }).then(data),
  cancel: (id, when, note) => api.post(`${BASE}/${id}/cancel`, { when, note }).then(data),
  remind: (id) => api.post(`${BASE}/${id}/remind`).then(data),
  catalog: (params = {}) => api.get(`${BASE}/catalog`, { params }).then(data),
  synergySites: (refresh = false) => api.get(`${BASE}/synergy-sites`, { params: refresh ? { refresh: 1 } : {} }).then(data),
  fromSynergy: (body) => api.post(`${BASE}/from-synergy`, body).then(data),
  bulkFromSynergy: (body) => api.post(`${BASE}/from-synergy/bulk`, body, { timeout: 180000 }).then(data),
  tasks: (params = {}) => api.get(`${BASE}/tasks`, { params }).then(data),
  updateTask: (id, status, note) => api.put(`${BASE}/tasks/${id}`, { status, note }).then(data),
  events: (params = {}) => api.get(`${BASE}/events`, { params }).then(data),
  settings: () => api.get(`${BASE}/settings`).then(data),
  saveSettings: (body) => api.put(`${BASE}/settings`, body).then(data),
  run: () => api.post(`${BASE}/run`, {}, { timeout: 180000 }).then(data),
  digest: () => api.get(`${BASE}/digest`).then(data),
  sendDigest: () => api.post(`${BASE}/digest`).then(data),
  importCsv: (csv, { dryRun, createCustomers } = {}) => api.post(`${BASE}/import`, { csv, dry_run: !!dryRun, create_customers: !!createCustomers }, { timeout: 180000 }).then(data),
  template: () => api.get(`${BASE}/import/template.csv`, { responseType: 'blob' }).then((r) => r.data),
  portalLink: (customerId) => api.get(`${BASE}/customers/${customerId}/portal-link`).then(data),
  testClock: () => api.get(`${BASE}/test-clock`).then(data),
  setTestClock: (body) => api.post(`${BASE}/test-clock`, body, { timeout: 180000 }).then(data),
  /** Public "Your services" page (no sign-in). */
  portal: (token) => api.get(`/public/your-services/${encodeURIComponent(token)}`).then(data)
}

export const PERIODS = [
  { key: 'monthly', label: 'Monthly', short: '/mo', noun: 'month', months: 1 },
  { key: 'quarterly', label: 'Quarterly', short: '/qtr', noun: 'quarter', months: 3 },
  { key: 'yearly', label: 'Yearly', short: '/yr', noun: 'year', months: 12 }
]
export const periodLabel = (k) => PERIODS.find((p) => p.key === k)?.label || k
export const periodShort = (k) => PERIODS.find((p) => p.key === k)?.short || ''
export const periodNoun = (k) => PERIODS.find((p) => p.key === k)?.noun || 'period'

export const KINDS = [
  { key: 'hosting', label: 'Hosting', icon: 'fa-solid fa-server' },
  { key: 'domain', label: 'Domain', icon: 'fa-solid fa-globe' },
  { key: 'email', label: 'Email', icon: 'fa-solid fa-envelope' },
  { key: 'maintenance', label: 'Maintenance', icon: 'fa-solid fa-screwdriver-wrench' },
  { key: 'other', label: 'Other', icon: 'fa-solid fa-puzzle-piece' }
]
export const kindIcon = (k) => KINDS.find((x) => x.key === k)?.icon || 'fa-solid fa-puzzle-piece'

export const SUPPLIERS = [
  { key: '', label: 'Not set / not hosted' },
  { key: 'synergy', label: 'Synergy Wholesale' },
  { key: 'hosting_com', label: 'hosting.com' },
  { key: 'other', label: 'Another provider' }
]
export const supplierLabel = (k) => SUPPLIERS.find((s) => s.key === k && k)?.label || ''

export const STATUSES = {
  active: { label: 'Active', badge: 'ui-badge--success', icon: 'fa-solid fa-circle-check' },
  past_due: { label: 'Past due', badge: 'ui-badge--warning', icon: 'fa-solid fa-triangle-exclamation' },
  suspended: { label: 'Suspended', badge: 'ui-badge--danger', icon: 'fa-solid fa-ban' },
  cancelled: { label: 'Cancelled', badge: 'ui-badge--draft', icon: 'fa-solid fa-circle-xmark' }
}
export const statusLabel = (s) => STATUSES[s]?.label || s
export const statusBadge = (s) => STATUSES[s]?.badge || 'ui-badge--draft'

export const PERIOD_STATUS = {
  generating: { label: 'Creating…', badge: 'ui-badge--draft' },
  invoiced: { label: 'Unpaid', badge: 'ui-badge--sent' },
  paid: { label: 'Paid', badge: 'ui-badge--paid' },
  void: { label: 'Void', badge: 'ui-badge--void' }
}

export const TASK_KINDS = {
  suspend: { label: 'Suspend', icon: 'fa-solid fa-ban', tone: 'danger' },
  restore: { label: 'Unsuspend', icon: 'fa-solid fa-rotate-left', tone: 'success' },
  cancel: { label: 'Cancel', icon: 'fa-solid fa-circle-xmark', tone: 'warning' }
}

export const VIA = { api: 'automatically at Synergy Wholesale', manual: 'by hand at the provider', mixed: 'partly automatically, partly by hand', none: '' }

export const PAYMENT_METHODS = [
  { key: 'mobile_money', label: 'M-Pesa / mobile money' },
  { key: 'bank_transfer', label: 'Bank transfer' },
  { key: 'cash', label: 'Cash' },
  { key: 'card', label: 'Card' },
  { key: 'cheque', label: 'Cheque' },
  { key: 'other', label: 'Other' }
]

/** Timeline item kind → icon. */
export const TIMELINE_ICONS = {
  invoice: 'fa-solid fa-file-invoice',
  paid: 'fa-solid fa-circle-check',
  reminder: 'fa-regular fa-envelope',
  notice: 'fa-solid fa-bullhorn',
  alert: 'fa-solid fa-phone-volume',
  suspend: 'fa-solid fa-ban',
  unsuspend: 'fa-solid fa-rotate-left',
  provider: 'fa-solid fa-server',
  task: 'fa-solid fa-list-check',
  domain: 'fa-solid fa-globe',
  action: 'fa-solid fa-user-pen',
  next: 'fa-regular fa-calendar'
}

/** Today in the browser as YYYY-MM-DD. */
export function todayISO() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** Days from a (YYYY-MM-DD) to b. */
export function daysBetween(a, b) {
  if (!a || !b) return 0
  return Math.round((new Date(b.slice(0, 10) + 'T00:00:00Z') - new Date(a.slice(0, 10) + 'T00:00:00Z')) / 86400000)
}

/** "in 3 days" / "tomorrow" / "today". */
export function whenIn(days) {
  if (days === null || days === undefined) return ''
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  if (days < 0) return `${-days} day${days === -1 ? '' : 's'} ago`
  return `in ${days} days`
}
