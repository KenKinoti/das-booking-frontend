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
  { key: 'other', label: 'Other Expenses', icon: 'fa-solid fa-receipt', color: 'var(--viz-4)' }
]
export const categoryOf = (k) => CATEGORIES.find((c) => c.key === k) || CATEGORIES[4]

export const SOURCE_LABEL = { synergy_api: 'Synergy API', gmail: 'Gmail', upload: 'Upload', manual: 'Manual' }
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
    for (const [k, v] of Object.entries(extra)) if (v) fd.append(k, v)
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
  sync: (source) => api.post('/expenses/sync', { source }, { timeout: 300000 }).then(data)
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
