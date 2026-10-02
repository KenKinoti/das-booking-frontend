import api from './api'

// Insights (dashboard snapshot, opportunities, market indicators, exports)
// and the analyst views under /analytics. See be/pkg/insights.
const data = (r) => r.data?.data ?? r.data
const tz = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}
const clean = (p = {}) => Object.fromEntries(Object.entries(p).filter(([, v]) => v !== '' && v !== null && v !== undefined))

export const insightsApi = {
  dashboard: () => api.get('/insights/dashboard', { params: { tz: tz() } }).then(data),
  opportunities: () => api.get('/insights/opportunities', { params: { tz: tz() } }).then(data),
  market: (refresh = false) => api.get('/insights/market', { params: refresh ? { refresh: 1 } : {}, timeout: 45000 }).then(data),
  explain: (code) => api.post('/insights/market/explain', { code: code || '' }, { timeout: 90000 }).then(data),
  addIndicator: (body) => api.post('/insights/market/indicators', body, { timeout: 30000 }).then(data),
  removeIndicator: (id) => api.delete(`/insights/market/indicators/${id}`).then(data),
  datasets: () => api.get('/insights/datasets').then(data),
  uploadDataset: (form) => api.post('/insights/datasets', form, { headers: { 'Content-Type': 'multipart/form-data' } }).then(data),
  removeDataset: (id) => api.delete(`/insights/datasets/${id}`).then(data),
  exportList: () => api.get('/insights/export').then(data),
  exportCsv: (dataset, params) => api.get(`/insights/export/${dataset}`, { params: { ...clean(params), tz: tz() }, responseType: 'blob', timeout: 120000 }).then((r) => r.data)
}

export const analyticsApi = {
  revenue: (p) => api.get('/analytics/revenue', { params: { ...clean(p), tz: tz() } }).then(data),
  clients: (p) => api.get('/analytics/clients', { params: { ...clean(p), tz: tz() } }).then(data),
  payments: (p) => api.get('/analytics/payments', { params: { ...clean(p), tz: tz() } }).then(data),
  seasonality: (p) => api.get('/analytics/seasonality', { params: { ...clean(p), tz: tz() } }).then(data),
  serviceLines: (p) => api.get('/analytics/service-lines', { params: { ...clean(p), tz: tz() } }).then(data),
  hosting: () => api.get('/analytics/hosting', { params: { tz: tz() } }).then(data),
  serviceMap: () => api.get('/analytics/service-map').then(data),
  saveServiceMap: (rules) => api.put('/analytics/service-map', { rules }).then(data),
  resetServiceMap: () => api.delete('/analytics/service-map').then(data)
}

// Industry watch: stored headlines from RSS / Atom sources, tagged and scored.
export const watchApi = {
  list: (p) => api.get('/insights/watch', { params: clean(p) }).then(data),
  latest: (n = 3) => api.get('/insights/watch/latest', { params: { n } }).then(data),
  refresh: (feedId) => api.post('/insights/watch/refresh', feedId ? { feed_id: feedId } : {}, { timeout: 130000 }).then(data),
  setItem: (id, patch) => api.put(`/insights/watch/items/${id}`, patch).then(data),
  readAll: () => api.post('/insights/watch/read-all').then(data),
  feeds: () => api.get('/insights/watch/feeds').then(data),
  preview: (url) => api.post('/insights/watch/feeds/preview', { url }, { timeout: 30000 }).then(data),
  addFeed: (body) => api.post('/insights/watch/feeds', body, { timeout: 40000 }).then(data),
  addSuggested: (keys = []) => api.post('/insights/watch/feeds/suggested', { keys }, { timeout: 130000 }).then(data),
  updateFeed: (id, patch) => api.put(`/insights/watch/feeds/${id}`, patch, { timeout: 40000 }).then(data),
  removeFeed: (id) => api.delete(`/insights/watch/feeds/${id}`).then(data),
  rules: () => api.get('/insights/watch/rules').then(data),
  saveRules: (rules) => api.put('/insights/watch/rules', { rules }).then(data),
  resetRules: () => api.delete('/insights/watch/rules').then(data)
}

// Trade & exports: revenue by client country / currency, FX position, target markets.
export const tradeApi = {
  get: (p) => api.get('/insights/trade', { params: { ...clean(p), tz: tz() } }).then(data),
  documents: (p) => api.get('/insights/trade/documents', { params: { ...clean(p), tz: tz() } }).then(data),
  markets: (refresh = false) => api.get('/insights/trade/markets', { params: { ...(refresh ? { refresh: 1 } : {}), tz: tz() }, timeout: 60000 }).then(data),
  saveMarkets: (body) => api.put('/insights/trade/markets', body, { timeout: 60000 }).then(data),
  resetMarkets: () => api.delete('/insights/trade/markets', { timeout: 60000 }).then(data),
  exportCsv: (dataset, p) => api.get(`/insights/trade/export/${dataset}`, { params: { ...clean(p), tz: tz() }, responseType: 'blob', timeout: 120000 }).then((r) => r.data)
}

// Strategy brief: stored monthly briefs (rule-based, optionally AI-written from the same data).
export const briefApi = {
  list: () => api.get('/insights/briefs', { params: { tz: tz() } }).then(data),
  get: (id) => api.get(`/insights/briefs/${id}`).then(data),
  generate: (period) => api.post('/insights/briefs/generate', { period: period || '' }, { params: { tz: tz() }, timeout: 90000 }).then(data),
  ai: (id) => api.post(`/insights/briefs/${id}/ai`, {}, { timeout: 120000 }).then(data),
  email: (id) => api.post(`/insights/briefs/${id}/email`, {}, { timeout: 60000 }).then(data),
  remove: (id) => api.delete(`/insights/briefs/${id}`).then(data),
  settings: (body) => api.put('/insights/briefs/settings', body, { params: { tz: tz() } }).then(data)
}

/** "3 hours ago", "2 days ago", else a date. */
export function ago(value) {
  if (!value) return ''
  const t = new Date(value).getTime()
  if (Number.isNaN(t)) return ''
  const s = Math.max(0, (Date.now() - t) / 1000)
  if (s < 90) return 'just now'
  if (s < 3600) return `${Math.round(s / 60)} min ago`
  if (s < 36 * 3600) return `${Math.round(s / 3600)} h ago`
  if (s < 14 * 86400) return `${Math.round(s / 86400)} days ago`
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(t))
}

export const LINE_COLORS = {
  web_dev: 'var(--viz-1)',
  hosting: 'var(--viz-2)',
  domains: 'var(--viz-3)',
  workspace: 'var(--viz-4)',
  maintenance: 'var(--viz-5)',
  software: 'var(--viz-6)',
  consulting: 'var(--viz-7)',
  other: 'var(--text-3)'
}

export const OPP_TYPES = {
  upsell: { label: 'Upsell', icon: 'fa-solid fa-arrow-trend-up' },
  winback: { label: 'Win-back', icon: 'fa-solid fa-user-clock' },
  pricing: { label: 'Price review', icon: 'fa-solid fa-tags' },
  unbilled: { label: 'Unbilled work', icon: 'fa-solid fa-file-circle-exclamation' },
  collection: { label: 'Collection risk', icon: 'fa-solid fa-hand-holding-dollar' },
  pipeline: { label: 'Pipeline', icon: 'fa-solid fa-filter-circle-dollar' },
  renewal: { label: 'Renewals', icon: 'fa-solid fa-rotate' },
  risk: { label: 'Concentration risk', icon: 'fa-solid fa-scale-unbalanced' }
}

export function monthLabel(m, long = false) {
  if (!m) return ''
  const [y, mo] = String(m).split('-').map(Number)
  if (!mo) return String(m)
  return new Intl.DateTimeFormat(undefined, { month: long ? 'long' : 'short', year: long ? 'numeric' : '2-digit' }).format(new Date(y, mo - 1, 1))
}

export function isoDay(d) {
  const z = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`
}

/** Preset ranges for the analyst views. */
export function presetRange(key) {
  const now = new Date()
  const to = isoDay(now)
  const back = (months) => isoDay(new Date(now.getFullYear(), now.getMonth() - months + 1, 1))
  switch (key) {
    case '12m':
      return { from: back(12), to }
    case '36m':
      return { from: back(36), to }
    case 'ytd':
      return { from: `${now.getFullYear()}-01-01`, to }
    case 'all':
      return { from: 'all', to }
    default:
      return { from: back(24), to }
  }
}
