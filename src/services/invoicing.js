import api from './api'

const base = '/invoicing'
const unwrap = (r) => r.data?.data
// "Today" (overdue), "this month" use the user's calendar, not the server's.
const tz = () => Intl.DateTimeFormat().resolvedOptions().timeZone

export const invoicingApi = {
  list: (params) => api.get(`${base}/invoices`, { params: { ...params, tz: tz() } }).then(unwrap),
  get: (id) => api.get(`${base}/invoices/${id}`).then(unwrap),
  create: (payload) => api.post(`${base}/invoices`, payload).then(unwrap),
  update: (id, payload) => api.put(`${base}/invoices/${id}`, payload).then(unwrap),
  remove: (id) => api.delete(`${base}/invoices/${id}`).then(unwrap),
  send: (id, payload) => api.post(`${base}/invoices/${id}/send`, payload || {}).then(unwrap),
  markSent: (id) => api.post(`${base}/invoices/${id}/mark-sent`).then(unwrap),
  void: (id) => api.post(`${base}/invoices/${id}/void`).then(unwrap),
  duplicate: (id) => api.post(`${base}/invoices/${id}/duplicate`).then(unwrap),
  convert: (id, body) => api.post(`${base}/invoices/${id}/convert`, body).then(unwrap),
  accept: (id) => api.post(`${base}/invoices/${id}/accept`).then(unwrap),
  decline: (id) => api.post(`${base}/invoices/${id}/decline`).then(unwrap),
  regenerateLink: (id) => api.post(`${base}/invoices/${id}/regenerate-link`).then(unwrap),
  addPayment: (id, payload) => api.post(`${base}/invoices/${id}/payments`, { app_url: window.location.origin, ...payload }, { timeout: 45000 }).then(unwrap),
  updatePayment: (id, paymentId, payload) => api.put(`${base}/invoices/${id}/payments/${paymentId}`, { app_url: window.location.origin, ...payload }, { timeout: 45000 }).then(unwrap),
  deletePayment: (id, paymentId, reason) => api.delete(`${base}/invoices/${id}/payments/${paymentId}`, { params: reason ? { reason } : {} }).then(unwrap),
  stats: () => api.get(`${base}/stats`, { params: { tz: tz() } }).then(unwrap),
  getSettings: () => api.get(`${base}/settings`).then(unwrap),
  saveSettings: (payload) => api.put(`${base}/settings`, payload).then(unwrap),
  taxRates: () => api.get(`${base}/tax-rates`).then(unwrap),
  createTaxRate: (payload) => api.post(`${base}/tax-rates`, payload).then(unwrap),
  updateTaxRate: (id, payload) => api.put(`${base}/tax-rates/${id}`, payload).then(unwrap),
  deleteTaxRate: (id) => api.delete(`${base}/tax-rates/${id}`).then(unwrap),
  clients: () => api.get(`${base}/clients`).then(unwrap),
  customerDefaults: (customerId, type) => api.get(`${base}/customer-defaults/${customerId}`, { params: { type } }).then(unwrap),
  recipients: (id, kind) => api.get(`${base}/invoices/${id}/recipients`, { params: { kind } }).then(unwrap),
  runRecurring: () => api.post(`${base}/recurring/run`).then(unwrap),
  exportCsv: (type) => api.get(`${base}/export`, { params: { type }, responseType: 'blob' }).then((r) => r.data),
  pdf: (id) => api.get(`${base}/invoices/${id}/pdf`, { params: { download: 1, app_url: window.location.origin }, responseType: 'blob', timeout: 45000 }).then((r) => r.data),
  receipt: (id, paymentId) => api.get(`${base}/invoices/${id}/payments/${paymentId}/receipt`, { params: { download: 1 }, responseType: 'blob' }).then((r) => r.data),
  payLink: (id) => api.get(`${base}/invoices/${id}/pay-link`, { params: { app_url: window.location.origin } }).then(unwrap),
  // Pre-send checks + exact preview, test send, send log (see pkg/invoicing/emaildoc.go)
  preflight: (id, payload) => api.post(`${base}/invoices/${id}/preflight`, { app_url: window.location.origin, ...payload }, { timeout: 45000 }).then(unwrap),
  emailDraft: (id, kind, paymentId) => api.get(`${base}/invoices/${id}/email-draft`, { params: { kind, payment_id: paymentId || undefined, app_url: window.location.origin } }).then(unwrap),
  sendTest: (id, payload) => api.post(`${base}/invoices/${id}/send-test`, { app_url: window.location.origin, ...payload }, { timeout: 45000 }).then(unwrap),
  emailLog: (id) => api.get(`${base}/invoices/${id}/email-log`).then(unwrap),
  // Exchange rate: lock today's rate ({}), or a manual one ({ exchange_rate })
  lockRate: (id, body) => api.post(`${base}/invoices/${id}/rate`, body || {}).then(unwrap),
  publicView: (token) => api.get(`/public/invoices/${token}`).then(unwrap),
  publicAccept: (token) => api.post(`/public/invoices/${token}/accept`).then(unwrap)
}

export const STATUS_LABELS = {
  draft: 'Draft',
  sent: 'Sent',
  partial: 'Partially paid',
  paid: 'Paid',
  overdue: 'Overdue',
  void: 'Void',
  accepted: 'Accepted',
  declined: 'Declined',
  converted: 'Converted',
  expired: 'Expired'
}

export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'card', label: 'Card' },
  { value: 'mobile_money', label: 'Mobile money (e.g. M-Pesa)' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'flutterwave', label: 'Flutterwave' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'stripe', label: 'Stripe' },
  { value: 'other', label: 'Other' }
]

/** Where a payment came from (server: invoicing.PaymentOrigin). */
export const PAYMENT_ORIGINS = {
  deposit: { label: 'Deposit', badge: 'ui-badge--info' },
  online: { label: 'Online', badge: 'ui-badge--success' },
  import: { label: 'Imported', badge: 'ui-badge--draft' }
}

/** Placeholders for the receipt email templates (Invoice settings). */
export const RECEIPT_PLACEHOLDERS = ['receipt_number', 'amount_received', 'balance_due', 'invoice_number', 'client_name', 'business_name', 'payment_date', 'payment_method', 'balance_sentence', 'link']

export const DEFAULT_RECEIPT_SUBJECT = 'Receipt {{receipt_number}} — payment received for invoice {{invoice_number}}'
export const DEFAULT_RECEIPT_MESSAGE =
  "Hi {{client_name}},\n\nThank you — we've received your payment of {{amount_received}} for invoice {{invoice_number}} on {{payment_date}} ({{payment_method}}).\n\n{{balance_sentence}}\n\nYour receipt {{receipt_number}} is attached for your records.\n\n{{business_name}}"

export const RECURRENCE = [
  { value: 'weekly', label: 'Every week' },
  { value: 'fortnightly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Every month' },
  { value: 'quarterly', label: 'Every 3 months' },
  { value: 'yearly', label: 'Every year' }
]

/** Exchange rates (pkg/fxrates): quotes, the rate table and manual overrides. */
export const fxApi = {
  rate: (from, to) => api.get('/fx/rate', { params: { from, to } }).then(unwrap),
  rates: (baseCur) => api.get('/fx/rates', { params: { base: baseCur } }).then(unwrap),
  manual: () => api.get('/fx/manual-rates').then(unwrap),
  saveManual: (payload) => api.put('/fx/manual-rates', payload).then(unwrap),
  deleteManual: (id) => api.delete(`/fx/manual-rates/${id}`).then(unwrap)
}

export const RATE_SOURCES = {
  live: { label: 'Live rate', badge: 'ui-badge--success', icon: 'fa-solid fa-signal' },
  fallback: { label: 'Reference rate', badge: 'ui-badge--warning', icon: 'fa-solid fa-triangle-exclamation' },
  manual: { label: 'Manual rate', badge: 'ui-badge--info', icon: 'fa-solid fa-hand' },
  same: { label: 'Same currency', badge: 'ui-badge--draft', icon: 'fa-solid fa-equals' },
  missing: { label: 'No rate', badge: 'ui-badge--danger', icon: 'fa-solid fa-circle-exclamation' },
  zoho: { label: 'Rate from Zoho Books', badge: 'ui-badge--info', icon: 'fa-solid fa-file-import' }
}
