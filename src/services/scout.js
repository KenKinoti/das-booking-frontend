import api from './api'

// Market scout (Insights → Market scout): web searches with the platform's
// Anthropic key for tenders, grants, partnerships, leads, new markets and
// products to add, ranked by fit. See be/pkg/scout.
const data = (r) => r.data?.data ?? r.data
const clean = (p = {}) =>
  Object.fromEntries(Object.entries(p).filter(([, v]) => v !== '' && v !== null && v !== undefined))

export const scoutApi = {
  status: () => api.get('/insights/scout').then(data),
  saveSettings: (body) => api.put('/insights/scout/settings', body).then(data),
  refreshProfile: () =>
    api.post('/insights/scout/profile/refresh', {}, { timeout: 60000 }).then(data),
  estimate: (body) => api.post('/insights/scout/estimate', body).then(data),
  enable: (body) => api.post('/insights/scout/enable', body).then(data),
  disable: () => api.post('/insights/scout/disable').then(data),
  scan: (kind = 'light') => api.post('/insights/scout/scan', { kind }).then(data),
  list: (p) => api.get('/insights/scout/opportunities', { params: clean(p) }).then(data),
  get: (id) => api.get(`/insights/scout/opportunities/${id}`).then(data),
  update: (id, patch) => api.put(`/insights/scout/opportunities/${id}`, patch).then(data),
  dismiss: (id, reason, note) =>
    api.post(`/insights/scout/opportunities/${id}/dismiss`, { reason, note }).then(data),
  remind: (id, date) =>
    api.post(`/insights/scout/opportunities/${id}/remind`, { date: date || null }).then(data),
  pursue: (id, as) =>
    api.post(`/insights/scout/opportunities/${id}/pursue`, as ? { as } : {}).then(data),
  markets: (days = 90) => api.get('/insights/scout/markets', { params: { days } }).then(data),
  hideSignal: (id) => api.delete(`/insights/scout/markets/${id}`).then(data),
  runs: (limit = 50) => api.get('/insights/scout/runs', { params: { limit } }).then(data),
  run: (id) => api.get(`/insights/scout/runs/${id}`).then(data),
}

export const TYPE_LABELS = {
  tender: 'Tender',
  grant: 'Grant',
  partnership: 'Partnership',
  lead: 'Lead',
  new_market: 'New market',
  product: 'Product idea',
}

export const TYPE_ICONS = {
  tender: 'fa-solid fa-file-signature',
  grant: 'fa-solid fa-hand-holding-dollar',
  partnership: 'fa-solid fa-handshake',
  lead: 'fa-solid fa-user-tie',
  new_market: 'fa-solid fa-earth-africa',
  product: 'fa-solid fa-box-open',
}

/** US$ with cents (and 4 decimals under a cent). */
export function usd(v) {
  const n = Number(v) || 0
  if (n > 0 && n < 0.01) return `US$${n.toFixed(4)}`
  return `US$${n.toFixed(2)}`
}

/** 12,345 → "12.3k". */
export function tokens(v) {
  const n = Number(v) || 0
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

/** Only http(s) links are shown as links. */
export function safeLink(u) {
  return /^https?:\/\//i.test(String(u || '')) ? u : ''
}

/** Whole days from today (local calendar) to a YYYY-MM-DD date. */
export function daysUntil(day, today) {
  if (!day) return null
  const d = new Date(String(day).slice(0, 10) + 'T00:00:00')
  const t = today
    ? new Date(String(today).slice(0, 10) + 'T00:00:00')
    : new Date(new Date().toDateString())
  return Math.round((d - t) / 86400000)
}
