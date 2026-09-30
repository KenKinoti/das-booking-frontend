// Online invoice payments (Flutterwave). Backend: pkg/payments.
import api from './api'

const unwrap = (r) => r.data?.data ?? r.data

export const paymentsApi = {
  settings: () => api.get('/payments/settings').then(unwrap),
  save: (body) => api.put('/payments/settings', body).then(unwrap),
  test: (body) => api.post('/payments/settings/test', body || {}, { timeout: 45000 }).then(unwrap),
  estimate: (body) => api.post('/payments/estimate', body).then(unwrap),
  invoiceTransactions: (id) => api.get(`/invoicing/invoices/${id}/online-payments`).then(unwrap),
  platformStatus: () => api.get('/super-admin/payments/status').then(unwrap),
  // Public (no sign-in)
  payPage: (token, amount) => api.get(`/public/pay/${token}`, { params: amount ? { amount } : {} }).then(unwrap),
  checkout: (token, body) => api.post(`/public/pay/${token}/checkout`, { ...body, app_url: window.location.origin }, { timeout: 45000 }).then(unwrap),
  verify: (token, body) => api.post(`/public/pay/${token}/verify`, body, { timeout: 45000 }).then(unwrap)
}

export const TX_STATUS = {
  pending: { label: 'Pending', badge: 'ui-badge--warning' },
  successful: { label: 'Paid', badge: 'ui-badge--success' },
  failed: { label: 'Failed', badge: 'ui-badge--danger' },
  cancelled: { label: 'Cancelled', badge: 'ui-badge--draft' }
}

export const METHOD_LABELS = {
  mpesa: 'M-Pesa',
  mobilemoneyghana: 'Mobile money (Ghana)',
  mobilemoneyuganda: 'Mobile money (Uganda)',
  mobilemoneytanzania: 'Mobile money (Tanzania)',
  mobilemoneyrwanda: 'Mobile money (Rwanda)',
  mobilemoneyzambia: 'Mobile money (Zambia)',
  banktransfer: 'Bank transfer',
  ussd: 'USSD',
  card: 'Card'
}

/** "2.9%", "2.9% + 1.00", "1.4% (max 2,000)" */
export function feeText(o, money) {
  let s = `${Number(o.percent || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}%`
  if (Number(o.fixed) > 0) s += ` + ${money(o.fixed)}`
  if (Number(o.cap) > 0) s += ` (max ${money(o.cap)})`
  return s
}

/** Full URL of a public API path (PDF, receipts). */
export function apiURL(path) {
  const base = (api.defaults.baseURL || '/api/v1').replace(/\/api\/v1\/?$/, '')
  return base + path
}
