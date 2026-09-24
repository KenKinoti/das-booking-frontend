import api from './api'

const base = '/smallbiz'
const unwrap = (r) => r.data?.data
// Periods ("this month", due reminders) follow the user's calendar.
const withTz = (params) => ({ ...(params || {}), tz: Intl.DateTimeFormat().resolvedOptions().timeZone })

export const smallbizApi = {
  settings: () => api.get(`${base}/settings`).then(unwrap),
  saveSettings: (payload) => api.put(`${base}/settings`, payload).then(unwrap),
  categories: () => api.get(`${base}/categories`).then(unwrap).then((d) => d?.categories || []),
  createCategory: (payload) => api.post(`${base}/categories`, payload).then(unwrap),
  updateCategory: (id, payload) => api.put(`${base}/categories/${id}`, payload).then(unwrap),
  deleteCategory: (id) => api.delete(`${base}/categories/${id}`).then(unwrap),
  entries: (params) => api.get(`${base}/entries`, { params: withTz(params) }).then(unwrap),
  entry: (id) => api.get(`${base}/entries/${id}`).then(unwrap),
  createEntry: (payload) => api.post(`${base}/entries`, payload).then(unwrap),
  updateEntry: (id, payload) => api.put(`${base}/entries/${id}`, payload).then(unwrap),
  deleteEntry: (id) => api.delete(`${base}/entries/${id}`).then(unwrap),
  exportEntries: (params) => api.get(`${base}/export`, { params: withTz(params), responseType: 'blob' }),
  overview: (params) => api.get(`${base}/overview`, { params: withTz(params) }).then(unwrap),
  pnl: (params) => api.get(`${base}/reports/pnl`, { params: withTz(params) }).then(unwrap),
  pnlCsv: (params) => api.get(`${base}/reports/pnl`, { params: withTz({ ...params, format: 'csv' }), responseType: 'blob' }),
  tax: (params) => api.get(`${base}/reports/tax`, { params: withTz(params) }).then(unwrap),
  taxCsv: (params) => api.get(`${base}/reports/tax`, { params: withTz({ ...params, format: 'csv' }), responseType: 'blob' }),
  reminders: (params) => api.get(`${base}/reminders`, { params: withTz(params) }).then(unwrap).then((d) => d?.reminders || []),
  createReminder: (payload) => api.post(`${base}/reminders`, payload).then(unwrap),
  updateReminder: (id, payload) => api.put(`${base}/reminders/${id}`, payload).then(unwrap),
  deleteReminder: (id) => api.delete(`${base}/reminders/${id}`).then(unwrap),
  toggleReminder: (id) => api.post(`${base}/reminders/${id}/toggle`).then(unwrap)
}

/** Minor units per currency — mirrors pkg/currency.Decimals. */
export function currencyDecimals(code) {
  const c = String(code || '').toUpperCase()
  if (c === 'JPY' || c === 'UGX') return 0
  if (c === 'KWD') return 3
  return 2
}

/** Format integer minor units (cents) as money, respecting 0/2/3-decimal currencies. */
export function fmtMinor(minor, code = 'AUD', opts = {}) {
  const dec = currencyDecimals(code)
  const n = Number(minor || 0) / Math.pow(10, dec)
  try {
    const compact = opts.compact && Math.abs(n) >= 10000
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: code,
      minimumFractionDigits: compact || opts.whole ? 0 : dec,
      maximumFractionDigits: compact || opts.whole ? 0 : dec,
      notation: compact ? 'compact' : 'standard',
      signDisplay: opts.sign ? 'exceptZero' : 'auto'
    }).format(n)
  } catch {
    return `${code} ${n.toFixed(dec)}`
  }
}

/** Minor units -> plain decimal string for inputs ("1234.50"). */
export function minorToInput(minor, code) {
  const dec = currencyDecimals(code)
  const v = Number(minor || 0)
  const neg = v < 0
  const abs = Math.abs(v)
  const p = Math.pow(10, dec)
  let s = String(Math.floor(abs / p))
  if (dec > 0) s += '.' + String(abs % p).padStart(dec, '0')
  return (neg ? '-' : '') + s
}

/** Parse a user-typed decimal into minor units without float drift. Returns null if invalid. */
export function parseMinor(str, code) {
  const dec = currencyDecimals(code)
  const s = String(str ?? '').replace(/[,\s]/g, '')
  const m = /^(-)?(\d*)(?:\.(\d*))?$/.exec(s)
  if (!m || (!m[2] && !m[3])) return null
  const frac = (m[3] || '').replace(/0+$/, '')
  if (frac.length > dec) return null
  const v = Number(m[2] || '0') * Math.pow(10, dec) + Number((frac + '0'.repeat(dec)).slice(0, dec) || 0)
  return m[1] ? -v : v
}

/** Tax contained in a tax-inclusive amount (minor units), half-up rounding — mirrors Go. */
export function taxFromInclusive(minor, rate) {
  const bp = Math.round(Number(rate || 0) * 100)
  if (!bp || !minor) return 0
  return Math.round((minor * bp) / (10000 + bp))
}

export const PAYMENT_METHODS = ['Cash', 'Card', 'Bank transfer', 'EFTPOS', 'Mobile money', 'PayPal', 'Cheque', 'Direct debit', 'Other']

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export const PERIODS = [
  { key: 'this_month', label: 'This month' },
  { key: 'last_month', label: 'Last month' },
  { key: 'this_quarter', label: 'This quarter' },
  { key: 'last_quarter', label: 'Last quarter' },
  { key: 'this_fy', label: 'This financial year' },
  { key: 'last_fy', label: 'Last financial year' },
  { key: 'all', label: 'All time' },
  { key: 'custom', label: 'Custom range…' }
]

export const RECURRENCE = [
  { key: 'none', label: 'Does not repeat' },
  { key: 'monthly', label: 'Every month' },
  { key: 'quarterly', label: 'Every quarter' },
  { key: 'yearly', label: 'Every year' }
]

/** Field errors from a 422 response: { field: message } */
export function fieldErrors(err) {
  return err?.response?.data?.error?.fields || {}
}

export function monthLabel(key, long) {
  const [y, m] = String(key).split('-').map(Number)
  return new Intl.DateTimeFormat(undefined, long ? { month: 'long', year: 'numeric' } : { month: 'short' }).format(new Date(y, m - 1, 1))
}

/**
 * Read an image/PDF file as a data URL. Large photos are downscaled to JPEG
 * so receipts fit the server limit (600 KB).
 */
export const MAX_ATTACHMENT = 600 * 1024

export function readAttachment(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read the file'))
    reader.onload = () => {
      const url = String(reader.result)
      const bytes = Math.floor((url.length - url.indexOf(',') - 1) * 0.75)
      if (file.type === 'application/pdf' || !file.type.startsWith('image/')) {
        if (!/^(application\/pdf)$/.test(file.type)) return reject(new Error('Choose an image or PDF'))
        if (bytes > MAX_ATTACHMENT) return reject(new Error('PDF is larger than 600 KB — attach a link instead'))
        return resolve(url)
      }
      if (bytes <= MAX_ATTACHMENT && file.type !== 'image/heic') return resolve(url)
      const img = new Image()
      img.onerror = () => reject(new Error('Could not read the image'))
      img.onload = () => {
        let quality = 0.82
        let scale = Math.min(1, 1600 / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        for (let i = 0; i < 6; i++) {
          canvas.width = Math.round(img.width * scale)
          canvas.height = Math.round(img.height * scale)
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
          const out = canvas.toDataURL('image/jpeg', quality)
          if ((out.length - 23) * 0.75 <= MAX_ATTACHMENT) return resolve(out)
          scale *= 0.75
          quality = Math.max(0.5, quality - 0.08)
        }
        reject(new Error('Image is too large even after compressing'))
      }
      img.src = url
    }
    reader.readAsDataURL(file)
  })
}
