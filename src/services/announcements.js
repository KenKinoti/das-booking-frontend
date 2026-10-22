/**
 * Announcements from the DASYIN team (Platform admin → Announcements) and
 * the signed-in person's own "From DASYIN" messages. Backend: pkg/broadcast.
 */
import api from '@/services/api'

const d = (r) => r?.data?.data ?? r?.data ?? {}

const BASE = '/super-admin/announcements'

export const announcementsAPI = {
  list: (params) => api.get(BASE, { params }).then(d),
  get: (id) => api.get(`${BASE}/${id}`).then(d),
  create: (body) => api.post(BASE, body).then(d),
  update: (id, body) => api.put(`${BASE}/${id}`, body).then(d),
  remove: (id) => api.delete(`${BASE}/${id}`).then(d),
  schedule: (id) => api.post(`${BASE}/${id}/schedule`).then(d),
  unschedule: (id) => api.post(`${BASE}/${id}/unschedule`).then(d),
  sendNow: (id) => api.post(`${BASE}/${id}/send-now`).then(d),
  cancel: (id) => api.post(`${BASE}/${id}/cancel`).then(d),
  duplicate: (id) => api.post(`${BASE}/${id}/duplicate`).then(d),
  test: (id) => api.post(`${BASE}/${id}/test`).then(d),
  retryEmails: (id) => api.post(`${BASE}/${id}/retry-emails`).then(d),
  recipients: (id, params) => api.get(`${BASE}/${id}/recipients`, { params }).then(d),
  exportCsv: (id) => api.get(`${BASE}/${id}/export`, { responseType: 'blob' }),
  meta: () => api.get(`${BASE}/meta`).then(d),
  organizations: (params) => api.get(`${BASE}/organizations`, { params }).then(d),
  audience: (audience, kind) => api.post(`${BASE}/audience`, { audience, kind }).then(d),
  emailPreview: (body) => api.post(`${BASE}/email-preview`, body).then(d),
  occasions: (params) => api.get(`${BASE}/occasions`, { params }).then(d),
  planOccasion: (body) => api.post(`${BASE}/occasions/plan`, body).then(d),
  skipOccasion: (body) => api.post(`${BASE}/occasions/skip`, body).then(d),
  aiDraft: (body) => api.post(`${BASE}/ai-draft`, body, { timeout: 60000 }).then(d),
  settings: () => api.get(`${BASE}/settings`).then(d),
  saveSettings: (body) => api.put(`${BASE}/settings`, body).then(d),
  runDue: () => api.post(`${BASE}/run-due`, null, { timeout: 60000 }).then(d)
}

export const myAnnouncementsAPI = {
  list: () => api.get('/announcements/me').then(d),
  get: (id) => api.get(`/announcements/me/${encodeURIComponent(id)}`).then(d),
  read: (id) => api.post(`/announcements/me/${encodeURIComponent(id)}/read`).then(d),
  dismiss: (id) => api.post(`/announcements/me/${encodeURIComponent(id)}/dismiss`).then(d),
  click: (id) => api.post(`/announcements/me/${encodeURIComponent(id)}/click`).then(d),
  preferences: () => api.get('/announcements/me/preferences').then(d),
  savePreferences: (body) => api.put('/announcements/me/preferences', body).then(d)
}

export const unsubscribeAPI = {
  info: (t) => api.get('/public/announcements/unsubscribe', { params: { t } }).then(d),
  unsubscribe: (t) => api.post('/public/announcements/unsubscribe', { t }).then(d),
  resubscribe: (t) => api.post('/public/announcements/resubscribe', { t }).then(d)
}

export const KINDS = {
  update: { label: 'Update', icon: 'fa-solid fa-bullhorn', tone: 'info' },
  reminder: { label: 'Reminder', icon: 'fa-solid fa-bell', tone: 'warning' },
  promotion: { label: 'Offer', icon: 'fa-solid fa-gift', tone: 'success' },
  urgent: { label: 'Urgent', icon: 'fa-solid fa-triangle-exclamation', tone: 'danger' }
}

export const STATUS = {
  draft: { label: 'Draft', badge: 'draft' },
  scheduled: { label: 'Scheduled', badge: 'info' },
  sending: { label: 'Sending', badge: 'warning' },
  sent: { label: 'Sent', badge: 'success' },
  cancelled: { label: 'Cancelled', badge: 'void' }
}

/** "Tue 20 Oct, 08:00" in a time zone (the zone's short name appended). */
export function zoned(iso, tz, { zone = true, year = false } = {}) {
  if (!iso) return ''
  const t = new Date(iso)
  if (Number.isNaN(t.getTime())) return ''
  try {
    const s = t.toLocaleString(undefined, {
      timeZone: tz || 'Africa/Nairobi',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: year ? 'numeric' : undefined,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZoneName: zone ? 'short' : undefined
    })
    return s
  } catch {
    return t.toLocaleString()
  }
}

/** Wall-clock "2026-10-20T08:00" in tz → a Date (UTC instant). */
export function localToDate(local, tz) {
  if (!local) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(local)
  if (!m) return null
  const [y, mo, da, h, mi] = m.slice(1).map(Number)
  // Guess UTC, then correct by the zone's offset at that instant (twice for DST edges).
  let t = Date.UTC(y, mo - 1, da, h, mi)
  for (let i = 0; i < 2; i++) {
    const p = Object.fromEntries(
      new Intl.DateTimeFormat('en-GB', { timeZone: tz || 'Africa/Nairobi', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
        .formatToParts(new Date(t))
        .map((x) => [x.type, x.value])
    )
    const shown = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute)
    t += Date.UTC(y, mo - 1, da, h, mi) - shown
  }
  return new Date(t)
}

/** Now as wall-clock text in tz, rounded up to the next quarter hour, plus `addMinutes`. */
export function localNow(tz, addMinutes = 0) {
  const t = new Date(Date.now() + addMinutes * 60000)
  t.setUTCMinutes(Math.ceil(t.getUTCMinutes() / 15) * 15, 0, 0)
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: tz || 'Africa/Nairobi', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
      .formatToParts(t)
      .map((x) => [x.type, x.value])
  )
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`
}

export function delayLabel(min) {
  if (min === -1) return 'In the app only'
  if (min === 0) return 'Email straight away'
  if (min < 60) return `Email after ${min} min if unread`
  const h = min / 60
  return `Email after ${h} hour${h === 1 ? '' : 's'} if unread`
}

/** One-line audience summary. */
export function audienceSummary(a, meta) {
  if (!a) return 'Everyone'
  const parts = []
  const level = { owners: 'Owners & admins', managers: 'Managers and above' }[a.role_level]
  parts.push(level || 'Everyone')
  const label = (list, opts) => (list || []).map((k) => (opts || []).find((o) => o.key === k)?.label || k)
  if (a.business_types?.length) parts.push(label(a.business_types, meta?.business_types).join(', '))
  if (a.countries?.length) parts.push('in ' + label(a.countries, meta?.countries).join(', '))
  if (a.plan_tiers?.length) parts.push(label(a.plan_tiers, meta?.plan_tiers).join('/') + ' plan')
  if (a.organization_ids?.length) parts.push(`${a.organization_ids.length} organisation${a.organization_ids.length === 1 ? '' : 's'}`)
  if (a.active_within_days) parts.push(`active in ${a.active_within_days} days`)
  return parts.join(' · ')
}
