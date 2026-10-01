import api from './api'

const unwrap = (r) => r.data?.data
const enc = encodeURIComponent

/** Recurring bills, upcoming bills and bill reminders (Finance → Bills). */
export const recurringApi = {
  list: () => api.get('/finance/recurring').then(unwrap),
  get: (id) => api.get(`/finance/recurring/${enc(id)}`).then(unwrap),
  create: (p) => api.post('/finance/recurring', p).then(unwrap),
  update: (id, p) => api.put(`/finance/recurring/${enc(id)}`, p).then(unwrap),
  remove: (id) => api.delete(`/finance/recurring/${enc(id)}`).then(unwrap),
  pause: (id) => api.post(`/finance/recurring/${enc(id)}/pause`).then(unwrap),
  resume: (id) => api.post(`/finance/recurring/${enc(id)}/resume`).then(unwrap),
  run: () => api.post('/finance/recurring/run').then(unwrap),
  upcoming: (days = 90) => api.get('/finance/recurring/upcoming', { params: { days } }).then(unwrap),
  subscriptions: () => api.get('/finance/recurring/subscriptions').then(unwrap),
  fromSubscription: (key, p = {}) => api.post('/finance/recurring/from-subscription', { key, ...p }).then(unwrap),
  generate: (id, period) => api.post(`/finance/recurring/${enc(id)}/occurrences/${enc(period)}/generate`).then(unwrap),
  skip: (id, period, note = '') => api.post(`/finance/recurring/${enc(id)}/occurrences/${enc(period)}/skip`, { note }).then(unwrap),
  unskip: (id, period) => api.delete(`/finance/recurring/${enc(id)}/occurrences/${enc(period)}/skip`).then(unwrap),
  markPaid: (id, period, note = '') => api.post(`/finance/recurring/${enc(id)}/occurrences/${enc(period)}/paid`, { note }).then(unwrap),
  snooze: (p) => api.post('/finance/bill-reminders/snooze', p).then(unwrap),
  settings: () => api.get('/finance/bill-reminders/settings').then(unwrap),
  saveSettings: (p) => api.put('/finance/bill-reminders/settings', p).then(unwrap),
  log: (limit = 50) => api.get('/finance/bill-reminders/log', { params: { limit } }).then(unwrap),
  digestPreview: () => api.get('/finance/bill-reminders/digest').then(unwrap),
  sendDigest: () => api.post('/finance/bill-reminders/digest').then(unwrap)
}

export const FREQUENCIES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Every 3 months' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'custom', label: 'Every N months' }
]

export const UPCOMING_STATUS = {
  projected: { label: 'Scheduled', badge: 'info' },
  awaiting: { label: 'Awaiting invoice', badge: 'info' },
  draft: { label: 'Draft', badge: 'draft' },
  unpaid: { label: 'Unpaid', badge: 'warning' },
  partial: { label: 'Part-paid', badge: 'partial' },
  overdue: { label: 'Overdue', badge: 'overdue' },
  skipped: { label: 'Skipped', badge: 'void' },
  paid: { label: 'Paid', badge: 'paid' }
}

/** "before_7" → "7 days before", "overdue_2" → "overdue #2". */
export function stageLabel(s) {
  if (!s) return ''
  if (s === 'due') return 'on the due date'
  const m = /^before_(\d+)$/.exec(s)
  if (m) return m[1] === '1' ? '1 day before' : `${m[1]} days before`
  const o = /^overdue_(\d+)$/.exec(s)
  if (o) return `overdue #${o[1]}`
  return s
}

/** Booking emails to staff (Settings → Notifications, My profile). */
export const bookingEmailsApi = {
  settings: () => api.get('/booking-emails/settings').then(unwrap),
  saveSettings: (p) => api.put('/booking-emails/settings', p).then(unwrap),
  me: () => api.get('/booking-emails/me').then(unwrap),
  saveMe: (p) => api.put('/booking-emails/me', p).then(unwrap),
  log: (params) => api.get('/booking-emails/log', { params }).then(unwrap),
  sendAgenda: () => api.post('/booking-emails/agenda/send').then(unwrap)
}

/**
 * Booking calendar: add-to-calendar links for one booking and the
 * subscription feeds (My profile → My bookings calendar, Settings).
 */
export const bookingCalendarApi = {
  /** { ics_url, google_url, outlook_url, outlook_live_url, filename, cancelled } */
  links: (id) => api.get(`/bookings/${enc(id)}/calendar-links`).then(unwrap),
  /** The .ics as a Blob (signed-in download). */
  file: (id) => api.get(`/bookings/${enc(id)}/calendar.ics`, { responseType: 'blob' }).then((r) => r.data),
  /** { user, org?, can_manage_org, refresh_minutes } */
  feeds: () => api.get('/booking-emails/feed').then(unwrap),
  /** New secret link for scope 'user' | 'org' (the old one stops working). */
  regenerate: (scope = 'user') => api.post('/booking-emails/feed/regenerate', { scope }).then((r) => unwrap(r).feed),
  turnOff: (scope = 'user') => api.delete('/booking-emails/feed', { params: { scope } }).then((r) => unwrap(r).feed)
}
