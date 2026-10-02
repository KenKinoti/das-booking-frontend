/**
 * Supplier prices — price lists of wholesale suppliers, a self-hosted server
 * and competitors; the domain + hosting combo comparison and the retail
 * pricing helper. Backend: /api/v1/finance/supplier-prices/* (pkg/pricebook).
 */
import api from '@/services/api'
import { currencyDecimals } from '@/utils/currencies'

const BASE = '/finance/supplier-prices'
const tz = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}
const data = (r) => r.data?.data ?? r.data

export const pricebookApi = {
  overview: () => api.get(BASE, { params: { tz: tz() } }).then(data),
  saveTiers: (tiers) => api.put(`${BASE}/tiers`, { tiers }).then(data),
  createSupplier: (body) => api.post(`${BASE}/suppliers`, body).then(data),
  updateSupplier: (id, body) => api.put(`${BASE}/suppliers/${id}`, body).then(data),
  deleteSupplier: (id) => api.delete(`${BASE}/suppliers/${id}`).then(data),
  model: (id, params = {}) => api.get(`${BASE}/suppliers/${id}/model`, { params: { tz: tz(), ...params } }).then(data),
  createItem: (body) => api.post(`${BASE}/items`, body, { params: { tz: tz() } }).then(data),
  updateItem: (id, body) => api.put(`${BASE}/items/${id}`, body, { params: { tz: tz() } }).then(data),
  deleteItem: (id) => api.delete(`${BASE}/items/${id}`).then(data),
  history: (id) => api.get(`${BASE}/items/${id}/history`, { params: { tz: tz() } }).then(data),
  /** Dry run (preview) or import of CSV text. */
  importCsv: (csv, dryRun) => api.post(`${BASE}/import`, { csv, dry_run: !!dryRun }, { params: { tz: tz() }, timeout: 120000 }).then(data),
  exportCsv: (params = {}) => api.get(`${BASE}/export.csv`, { params: { tz: tz(), ...params }, responseType: 'blob' }).then((r) => r.data),
  template: () => api.get(`${BASE}/template.csv`, { responseType: 'blob' }).then((r) => r.data),
  autofillSynergy: (body = {}) => api.post(`${BASE}/synergy/autofill`, body, { params: { tz: tz() }, timeout: 120000 }).then(data),
  compare: (body) => api.post(`${BASE}/compare`, body, { params: { tz: tz() } }).then(data),
  retail: (body) => api.post(`${BASE}/retail`, body, { params: { tz: tz() } }).then(data),
  saveServices: (services) => api.post(`${BASE}/services`, { services }).then(data),
  scenarios: () => api.get(`${BASE}/scenarios`).then(data),
  saveScenario: (id, body) => (id ? api.put(`${BASE}/scenarios/${id}`, body) : api.post(`${BASE}/scenarios`, body)).then(data),
  deleteScenario: (id) => api.delete(`${BASE}/scenarios/${id}`).then(data)
}

export const KINDS = [
  { key: 'hosting_plan', label: 'Hosting plan', short: 'Hosting', icon: 'fa-solid fa-server' },
  { key: 'domain_register', label: 'Domain registration', short: 'Register', icon: 'fa-solid fa-globe' },
  { key: 'domain_renew', label: 'Domain renewal', short: 'Renew', icon: 'fa-solid fa-rotate' },
  { key: 'domain_transfer', label: 'Domain transfer', short: 'Transfer', icon: 'fa-solid fa-right-left' },
  { key: 'ssl', label: 'SSL certificate', short: 'SSL', icon: 'fa-solid fa-lock' },
  { key: 'email_mailbox', label: 'Email mailbox', short: 'Mailbox', icon: 'fa-solid fa-envelope' },
  { key: 'other', label: 'Other', short: 'Other', icon: 'fa-solid fa-cube' }
]
export const kindOf = (k) => KINDS.find((x) => x.key === k) || KINDS[KINDS.length - 1]
export const isDomainKind = (k) => k === 'domain_register' || k === 'domain_renew' || k === 'domain_transfer'

export const PERIODS = [
  { key: 'month', label: 'Monthly', per: '/ month', months: 1 },
  { key: 'year', label: 'Yearly', per: '/ year', months: 12 },
  { key: '2y', label: 'Every 2 years', per: '/ 2 years', months: 24 },
  { key: '3y', label: 'Every 3 years', per: '/ 3 years', months: 36 },
  { key: 'one_off', label: 'One-off', per: 'once', months: 0 }
]
export const periodOf = (p) => PERIODS.find((x) => x.key === p) || PERIODS[0]

export const TYPES = [
  { key: 'wholesale', label: 'Wholesale', hint: 'You buy from them and resell', badge: 'ui-badge--info', icon: 'fa-solid fa-warehouse' },
  { key: 'self_hosted', label: 'Self-hosted', hint: 'Your own server: a monthly cost shared by the sites on it', badge: 'ui-badge--success', icon: 'fa-solid fa-hard-drive' },
  { key: 'competitor', label: 'Competitor', hint: 'Market retail prices: a benchmark, never an option to buy', badge: 'ui-badge--draft', icon: 'fa-solid fa-binoculars' }
]
export const typeOf = (t) => TYPES.find((x) => x.key === t) || TYPES[0]

/**
 * Money with the currency CODE ("AUD 99.00", "KES 8,514.00"): this page mixes
 * three dollar-like currencies, so a bare "$" would be ambiguous.
 */
export function cur(value, code, opts = {}) {
  const n = Number(value) || 0
  const c = code || 'AUD'
  const d = opts.whole ? 0 : currencyDecimals(c)
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency: c, currencyDisplay: 'code', minimumFractionDigits: d, maximumFractionDigits: d }).format(n).replace(/\s/g, ' ')
  } catch {
    return `${c} ${n.toFixed(d)}`
  }
}

/** A plain number with up to `max` decimals and thousands separators. */
export function num(value, max = 2) {
  const n = Number(value)
  if (!Number.isFinite(n)) return ''
  return new Intl.NumberFormat('en', { maximumFractionDigits: max }).format(n)
}

export function count(v, unit = '') {
  if (v == null) return '—'
  if (Number(v) === -1) return 'Unlimited'
  return `${num(v, 3)}${unit}`
}

/** "manual rate", "live rate", … for a RateInfo's source. */
export function rateSource(ri) {
  return (
    { same: 'same currency', manual: 'your manual rate', live: 'market rate', fallback: 'reference rate (approximate)', missing: 'no rate', 'what-if': 'what-if rate' }[ri?.source] || ri?.source || ''
  )
}

export function rateNumber(r) {
  const n = Number(r) || 0
  if (!n) return '—'
  const d = n >= 100 ? 2 : n >= 1 ? 4 : 6
  return new Intl.NumberFormat('en', { minimumFractionDigits: Math.min(2, d), maximumFractionDigits: d }).format(n)
}

/** A link is only clickable when it is a plain web address. */
export function safeUrl(u) {
  const s = String(u || '').trim()
  return /^https?:\/\//i.test(s) ? s : ''
}

/** Read a text file picked or dropped by the user. */
export function readFileText(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(String(fr.result || ''))
    fr.onerror = () => reject(new Error('Could not read the file'))
    fr.readAsText(file)
  })
}

/** Name a catalog service for a combo: "Starter hosting + .co.ke domain — yearly". */
export function serviceName({ tierLabel, minDiskGb, tld, noHosting, period, suffix }) {
  const parts = []
  if (!noHosting) parts.push(tierLabel ? `${tierLabel} hosting` : minDiskGb ? `Hosting (${num(minDiskGb)} GB)` : 'Hosting')
  if (tld) parts.push(`${tld} domain`)
  return `${parts.join(' + ')} — ${period}${suffix ? ` (${suffix})` : ''}`
}
