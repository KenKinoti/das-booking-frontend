// Morning brief (My profile → Morning brief, /brief, /brief/:date).
// Backend: pkg/brief — each person's daily note by email and WhatsApp.
import api from './api'

const unwrap = (r) => r.data?.data ?? r.data
const enc = encodeURIComponent

export const briefApi = {
  /** { settings, timezone, org_timezone, phone, email, first_name, managing, country, sections, whatsapp, next_send_at, last } */
  settings: () => api.get('/brief/settings').then(unwrap),
  /** body: { enabled?, time?, days?, timezone?, email?, whatsapp?, phone?, sections?: {key: bool}, also_digests? } */
  save: (body) => api.put('/brief/settings', body).then(unwrap),
  /** One click: on at 08:00 every day in the organisation's time zone. */
  quickOn: () => api.post('/brief/settings/quick').then(unwrap),
  /** { brief, delivery, live, enabled, url } */
  today: (refresh = false) => api.get('/brief/today', { params: refresh ? { refresh: 1 } : {}, timeout: 60000 }).then(unwrap),
  /** { brief, delivery, live, url } — a stored brief (today live until sent) */
  day: (date) => api.get(`/brief/day/${enc(date)}`, { timeout: 60000 }).then(unwrap),
  /** { items: [snapshot without the brief], days } */
  history: (days = 30) => api.get('/brief/history', { params: { days } }).then(unwrap),
  /** { brief, email: { to, subject, html, text }, whatsapp: { ready, problem, mode, to, template, params, button, text, platform }, channels } */
  preview: () => api.get('/brief/preview', { timeout: 60000 }).then(unwrap),
  /** { delivery, headline } */
  test: () => api.post('/brief/test', {}, { timeout: 150000 }).then(unwrap)
}

export const briefAdminApi = {
  /** { config, recommended, templates, whatsapp, chosen, note } */
  config: () => api.get('/super-admin/brief/config').then(unwrap),
  save: (body) => api.put('/super-admin/brief/config', body).then(unwrap)
}

/** Channel status → label and badge tone. */
export const CHANNEL_STATUS = {
  sent: { label: 'Sent', tone: 'success' },
  accepted: { label: 'Sent', tone: 'success' },
  delivered: { label: 'Delivered', tone: 'success' },
  read: { label: 'Read', tone: 'success' },
  sending: { label: 'Sending…', tone: 'info' },
  retry: { label: 'Retrying', tone: 'warning' },
  failed: { label: 'Failed', tone: 'danger' }
}

export const BRIEF_STATUS = {
  sent: { label: 'Sent', tone: 'success' },
  partial: { label: 'Partly sent', tone: 'warning' },
  failed: { label: 'Not sent', tone: 'danger' },
  retry: { label: 'Retrying', tone: 'warning' },
  missed: { label: 'Missed', tone: 'danger' },
  sending: { label: 'Sending…', tone: 'info' }
}

/** All IANA time zones the browser knows (falls back to a short list). */
export function timeZones() {
  try {
    if (typeof Intl.supportedValuesOf === 'function') return Intl.supportedValuesOf('timeZone')
  } catch {
    /* older browsers */
  }
  return ['Africa/Nairobi', 'Africa/Kampala', 'Africa/Dar_es_Salaam', 'Africa/Kigali', 'Africa/Lagos', 'Africa/Johannesburg', 'Europe/London',
    'Australia/Sydney', 'Australia/Melbourne', 'Australia/Brisbane', 'Australia/Adelaide', 'Australia/Perth', 'Pacific/Auckland', 'UTC']
}

/** "Thu 19 Nov at 08:00 (Africa/Nairobi)" in the given zone. */
export function whenIn(iso, tz) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    const day = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: tz })
    const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: tz })
    return `${day} at ${time}`
  } catch {
    return new Date(iso).toLocaleString()
  }
}

/** "Wed 18 Nov" for a YYYY-MM-DD date. */
export function dayLabel(date, withYear = false) {
  if (!date) return ''
  const [y, m, d] = date.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: withYear ? 'numeric' : undefined, timeZone: 'UTC' })
}
