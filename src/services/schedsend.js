// Schedule send (Communication → Scheduled): API client + labels.
import api from './api'

const d = (r) => r.data?.data ?? r.data
const tz = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || ''
  } catch {
    return ''
  }
}

export const schedsendApi = {
  meta: () => api.get('/schedsend/meta', { params: { tz: tz() } }).then(d),
  list: (params) => api.get('/schedsend/messages', { params }).then(d),
  get: (id, run) => api.get(`/schedsend/messages/${id}`, { params: run ? { run } : {} }).then(d),
  create: (body) => api.post('/schedsend/messages', body).then(d),
  update: (id, body) => api.put(`/schedsend/messages/${id}`, body).then(d),
  act: (id, action, body) => api.post(`/schedsend/messages/${id}/${action}`, body).then(d),
  preview: (body, pick) => api.post('/schedsend/preview', body, { params: pick ? { pick } : {}, timeout: 40000 }).then(d),
  badges: (ids) => api.get('/schedsend/badges', { params: { ids: ids.join(',') } }).then((r) => d(r)?.badges || {}),
  optOut: (customerId) => api.get(`/schedsend/customers/${customerId}/marketing`).then(d),
  setOptOut: (customerId, optedOut) => api.put(`/schedsend/customers/${customerId}/marketing`, { opted_out: optedOut }).then(d),
  smsSettings: () => api.get('/schedsend/sms-settings').then(d),
  saveSmsSettings: (body) => api.put('/schedsend/sms-settings', body).then(d),
  testSms: (to) => api.post('/schedsend/sms-settings/test', { to }, { timeout: 40000 }).then(d),
  waTemplates: () => api.get('/whatsapp/templates').then(d),
  staff: () => api.get('/schedsend/staff').then((r) => d(r)?.people || [])
}

export const browserTimezone = tz

export const KIND_LABELS = {
  invoice: 'Invoice email',
  quote: 'Quote email',
  receipt: 'Receipt email',
  reminder: 'Payment reminder',
  customer: 'Customer message',
  statement: 'Statement of account',
  team: 'Team message'
}

export const KIND_ICONS = {
  invoice: 'fa-solid fa-file-invoice',
  quote: 'fa-solid fa-file-signature',
  receipt: 'fa-solid fa-receipt',
  reminder: 'fa-regular fa-bell',
  customer: 'fa-regular fa-envelope',
  statement: 'fa-solid fa-scale-balanced',
  team: 'fa-solid fa-user-group'
}

export const CHANNEL_LABELS = { email: 'Email', sms: 'SMS', whatsapp: 'WhatsApp', inapp: 'In-app' }
export const CHANNEL_ICONS = { email: 'fa-regular fa-envelope', sms: 'fa-solid fa-comment-sms', whatsapp: 'fa-brands fa-whatsapp', inapp: 'fa-regular fa-bell' }

export const RESULT_LABELS = {
  sent: { label: 'Sent', badge: 'ui-badge--success' },
  partial: { label: 'Partly failed', badge: 'ui-badge--warning' },
  failed: { label: 'Failed', badge: 'ui-badge--danger' },
  skipped: { label: 'Skipped', badge: 'ui-badge--draft' },
  missed: { label: 'Missed', badge: 'ui-badge--danger' },
  sending: { label: 'Sending', badge: 'ui-badge--info' },
  waiting: { label: 'Waiting for approval', badge: 'ui-badge--warning' }
}

export const STATUS_LABELS = {
  scheduled: { label: 'Scheduled', badge: 'ui-badge--info' },
  paused: { label: 'Paused', badge: 'ui-badge--warning' },
  running: { label: 'Sending', badge: 'ui-badge--info' },
  done: { label: 'Finished', badge: 'ui-badge--success' },
  cancelled: { label: 'Cancelled', badge: 'ui-badge--draft' }
}

export const DELIVERY_LABELS = {
  pending: { label: 'Waiting', badge: 'ui-badge--draft', icon: 'fa-regular fa-clock' },
  sending: { label: 'Sending', badge: 'ui-badge--info', icon: 'fa-solid fa-circle-notch' },
  retry: { label: 'Will retry', badge: 'ui-badge--warning', icon: 'fa-solid fa-rotate-right' },
  sent: { label: 'Sent', badge: 'ui-badge--info', icon: 'fa-solid fa-check' },
  delivered: { label: 'Delivered', badge: 'ui-badge--success', icon: 'fa-solid fa-check-double' },
  read: { label: 'Read', badge: 'ui-badge--success', icon: 'fa-regular fa-eye' },
  failed: { label: 'Failed', badge: 'ui-badge--danger', icon: 'fa-solid fa-triangle-exclamation' },
  skipped: { label: 'Skipped', badge: 'ui-badge--draft', icon: 'fa-solid fa-forward' },
  waiting: { label: 'Waiting for approval', badge: 'ui-badge--warning', icon: 'fa-solid fa-inbox' }
}

export const WEEKDAYS = [
  { value: 1, short: 'Mon' },
  { value: 2, short: 'Tue' },
  { value: 3, short: 'Wed' },
  { value: 4, short: 'Thu' },
  { value: 5, short: 'Fri' },
  { value: 6, short: 'Sat' },
  { value: 0, short: 'Sun' }
]

/** "Tue 19 Nov, 08:00" from a wall-clock string "2026-11-19T08:00". */
export function localLabel(local) {
  if (!local) return ''
  const [date, time] = String(local).split('T')
  const [y, m, dd] = date.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, dd, 12))
  const day = dt.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
  const thisYear = new Date().getUTCFullYear()
  return `${day}${y !== thisYear ? ' ' + y : ''}, ${time || ''}`.trim()
}

export function zoneLabel(tzName) {
  return String(tzName || '').replace(/_/g, ' ')
}
