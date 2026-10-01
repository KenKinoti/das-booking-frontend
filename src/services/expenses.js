/**
 * Expenses — Synergy Wholesale, Google Workspace (Gmail) and other vendors.
 * Backend: /api/v1/expenses/* (pkg/expenses). Approved expenses become paid
 * supplier bills, so the P&L counts each one once.
 */
import api from '@/services/api'
import { formatMoney } from '@/utils/format'

const tz = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}
const data = (r) => r.data?.data ?? r.data

export const CATEGORIES = [
  { key: 'hosting', label: 'Web Hosting', icon: 'fa-solid fa-server', color: 'var(--viz-1)' },
  { key: 'domains', label: 'Domain Names', icon: 'fa-solid fa-globe', color: 'var(--viz-3)' },
  { key: 'email', label: 'Email & Workspace', icon: 'fa-solid fa-envelope', color: 'var(--viz-2)' },
  { key: 'software', label: 'Software & Subscriptions', icon: 'fa-solid fa-cubes', color: 'var(--viz-7)' },
  { key: 'support', label: 'Support Fees', icon: 'fa-solid fa-headset', color: 'var(--viz-5)' },
  { key: 'prepaid', label: 'Synergy prepaid hosting', icon: 'fa-solid fa-wallet', color: 'var(--viz-6)' },
  { key: 'other', label: 'Other Expenses', icon: 'fa-solid fa-receipt', color: 'var(--viz-4)' }
]
export const categoryOf = (k) => CATEGORIES.find((c) => c.key === k) || CATEGORIES[CATEGORIES.length - 1]

export const SOURCE_LABEL = { synergy_api: 'Synergy API', gmail: 'Gmail', upload: 'Upload', manual: 'Manual', synergy_statement: 'Synergy statement', synergy_topup: 'Synergy top-up' }
export const STATUS_BADGE = { pending: 'warning', approved: 'success', ignored: 'draft', duplicate: 'info' }
export const STATUS_LABEL = { pending: 'To review', approved: 'Approved', ignored: 'Ignored', duplicate: 'Duplicate' }

export const money = (v, cur, compact = false) => formatMoney(v || 0, cur, { compact })

export const expensesApi = {
  dashboard: (params = {}) => api.get('/expenses/dashboard', { params: { tz: tz(), ...params } }).then(data),
  summary: (params = {}) => api.get('/expenses/summary', { params: { tz: tz(), ...params } }).then(data),
  items: (params = {}) => api.get('/expenses/items', { params: { tz: tz(), ...params } }).then(data),
  item: (id) => api.get(`/expenses/items/${id}`).then(data),
  create: (body) => api.post('/expenses/items', body).then(data),
  update: (id, body) => api.patch(`/expenses/items/${id}`, body).then(data),
  remove: (id) => api.delete(`/expenses/items/${id}`).then(data),
  approve: (id, body = {}) => api.post(`/expenses/items/${id}/approve`, body).then(data),
  bulkApprove: (ids) => api.post('/expenses/bulk-approve', { ids }).then(data),
  unapprove: (id) => api.post(`/expenses/items/${id}/unapprove`).then(data),
  ignore: (id, reason) => api.post(`/expenses/items/${id}/ignore`, { reason }).then(data),
  restore: (id) => api.post(`/expenses/items/${id}/restore`).then(data),
  allocations: (id, allocations) => api.put(`/expenses/items/${id}/allocations`, { allocations }).then(data),
  upload: (files, extra = {}, onProgress) => {
    const fd = new FormData()
    for (const f of files) fd.append('files', f)
    for (const [k, v] of Object.entries(extra)) if (v) fd.append(k, typeof v === 'object' ? JSON.stringify(v) : v)
    return api.post('/expenses/uploads', fd, { headers: { 'Content-Type': 'multipart/form-data' }, onUploadProgress: onProgress }).then(data)
  },
  document: (id) => api.get(`/expenses/documents/${id}`, { responseType: 'blob' }).then((r) => r.data),
  vendors: () => api.get('/expenses/vendors').then(data),
  saveVendor: (id, body) => (id ? api.patch(`/expenses/vendors/${id}`, body) : api.post('/expenses/vendors', body)).then(data),
  vendorDetail: (id) => api.get(`/expenses/vendors/${id}/detail`, { params: { tz: tz() } }).then(data),
  renewals: (within) => api.get('/expenses/renewals', { params: { within } }).then(data),
  saveRenewal: (id, body) => (id ? api.patch(`/expenses/renewals/${id}`, body) : api.post('/expenses/renewals', body)).then(data),
  clients: (params = {}) => api.get('/expenses/clients', { params: { tz: tz(), ...params } }).then(data),
  dismissAlert: (key) => api.post('/expenses/alerts/dismiss', { key }).then(data),
  exportCsv: (params = {}) => api.get('/expenses/export.csv', { params, responseType: 'blob' }).then((r) => r.data),
  sources: () => api.get('/expenses/sources').then(data),
  saveSynergy: (body) => api.put('/expenses/sources/synergy', body).then(data),
  testSynergy: () => api.post('/expenses/sources/synergy/test').then(data),
  deleteSynergy: () => api.delete('/expenses/sources/synergy').then(data),
  saveGmail: (body) => api.put('/expenses/sources/gmail', body).then(data),
  connectGmail: () => api.post('/expenses/sources/gmail/connect').then(data),
  deleteGmail: () => api.delete('/expenses/sources/gmail').then(data),
  saveSchedule: (body) => api.put('/expenses/sources/schedule', body).then(data),
  sync: (source) => api.post('/expenses/sync', { source }, { timeout: 300000 }).then(data),
  // Synergy Wholesale analytics (statements + hosting usage reports)
  synergy: (params = {}) => api.get('/expenses/synergy', { params: { tz: tz(), ...params } }).then(data),
  synergySite: (domain) => api.get(`/expenses/synergy/sites/${encodeURIComponent(domain)}`, { params: { tz: tz() } }).then(data),
  saveSynergySite: (domain, body) => api.put(`/expenses/synergy/sites/${encodeURIComponent(domain)}`, body).then(data),
  saveSynergyPlan: (body) => api.put('/expenses/synergy/plans', body).then(data),
  synergyCsv: () => api.get('/expenses/synergy/sites.csv', { params: { tz: tz() }, responseType: 'blob' }).then((r) => r.data),
  statementPreview: (params = {}) => api.get('/expenses/synergy/statement-expenses', { params }).then(data),
  statementCreate: (body) => api.post('/expenses/synergy/statement-expenses', body, { timeout: 120000 }).then(data),
  // How Synergy costs count (service charges | top-ups), auto-approve, Australian GST, month rates
  accounting: () => api.get('/expenses/synergy/accounting').then(data),
  saveAccounting: (body) => api.put('/expenses/synergy/accounting', body, { timeout: 120000 }).then(data),
  applyAccounting: () => api.post('/expenses/synergy/accounting/apply', {}, { timeout: 120000 }).then(data),
  dismissAccountingNotice: () => api.post('/expenses/synergy/accounting/dismiss-notice', {}).then(data),
  saveMonthRate: (body) => api.put('/expenses/synergy/month-rate', body, { timeout: 120000 }).then(data),
  automation: () => api.get('/expenses/automation').then(data)
}

/** Synergy file kind from the CSV header line: 'statement' | 'usage' | ''. */
export function synergyKindOf(headerLine) {
  const h = String(headerLine || '')
    .replace(/^\ufeff/, '')
    .toLowerCase()
    .split(',')
    .map((x) => x.replace(/"/g, '').trim())
  const has = (...k) => k.every((x) => h.includes(x))
  if (has('date', 'product type', 'description', 'credit', 'debit', 'balance')) return 'statement'
  if (has('identifier', 'plan', 'usage', 'limit')) return 'usage'
  return ''
}

/** Snapshot date in a file name ("hosting-account-usage-2026-10-01.csv") → "2026-10-01" or ''. */
export function dateFromFileName(name) {
  const s = String(name || '')
  let m = s.match(/(20\d{2})[-_.](\d{1,2})[-_.](\d{1,2})/)
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  m = s.match(/(\d{1,2})[-_.](\d{1,2})[-_.](20\d{2})/)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  m = s.match(/(20\d{2})(\d{2})(\d{2})/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  return ''
}

/** AUD amount, always as "A$4.25" so it is never mistaken for another dollar. */
export function aud(v, opts = {}) {
  const n = Number(v) || 0
  const d = opts.whole ? 0 : 2
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'AUD', minimumFractionDigits: d, maximumFractionDigits: d }).format(n)
  } catch {
    return `A$${n.toFixed(d)}`
  }
}

/** A secondary (converted) amount: "≈ KES 363" (whole units from 100 up). */
export function approx(v, cur) {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return ''
  return '≈ ' + wholeMoney(v, cur)
}

/** Money with no minor units when the amount is 100 or more. */
export function wholeMoney(v, cur) {
  const n = Number(v) || 0
  if (Math.abs(n) < 100) return formatMoney(n, cur)
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: cur, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)
  } catch {
    return `${cur} ${Math.round(n)}`
  }
}

/** "1 AUD = 85.4 KES" from a rate block ({ from, to, rate }). */
export function rateText(fx) {
  if (!fx || !fx.rate || fx.from === fx.to) return ''
  const r = fx.rate >= 100 ? fx.rate.toFixed(2) : fx.rate >= 1 ? fx.rate.toFixed(3) : fx.rate.toFixed(6)
  return `1 ${fx.from} = ${String(Number(r))} ${fx.to}`
}

const SRC = { live: 'live', fallback: 'reference', manual: 'your rate', same: '' }

/** "rate 1 AUD = 85.4 KES, live, 1 Oct" — short rate note for amounts at today's rate. */
export function rateNote(fx, { withDate = true } = {}) {
  if (!fx || !fx.rate || fx.from === fx.to) return ''
  const parts = [rateText(fx)]
  const src = fx.basis === 'manual' ? 'your rate' : SRC[fx.source] || ''
  if (src) parts.push(src)
  if (withDate && fx.as_of) parts.push(new Date(fx.as_of).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }))
  return 'rate ' + parts.join(', ')
}

/**
 * An AUD amount with its period and the home-currency equivalent:
 * dual(4.25, 'month', fx, 'KES') → "A$4.25 / month · ≈ KES 363 / month".
 * homeValue overrides the conversion (e.g. amounts converted at their month's rate).
 */
export function dual(v, period, fx, home, homeValue) {
  const per = period ? ` / ${period}` : ''
  const a = aud(v) + per
  if (!home || home === 'AUD') return a
  const hv = homeValue ?? (fx && fx.rate ? Number(v) * fx.rate : null)
  if (hv === null || hv === undefined) return a
  return `${a} · ≈ ${wholeMoney(hv, home)}${per}`
}

/** Disk size in MB → "512 MB" / "10.2 GB". */
export function mb(v) {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return '—'
  const n = Number(v)
  if (Math.abs(n) >= 1024) return `${(n / 1024).toFixed(1).replace(/\.0$/, '')} GB`
  return `${Math.round(n)} MB`
}

/** Month label "2026-09" → "Sep". */
export function monthLabel(m, long = false) {
  const [y, mo] = String(m).split('-').map(Number)
  if (!y || !mo) return m
  return new Date(y, mo - 1, 1).toLocaleDateString(undefined, long ? { month: 'long', year: 'numeric' } : { month: 'short' })
}

export function pct(v) {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return ''
  const n = Number(v)
  return `${n > 0 ? '+' : ''}${n.toFixed(1)}%`
}
