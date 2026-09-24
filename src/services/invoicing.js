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
  convert: (id) => api.post(`${base}/invoices/${id}/convert`).then(unwrap),
  accept: (id) => api.post(`${base}/invoices/${id}/accept`).then(unwrap),
  decline: (id) => api.post(`${base}/invoices/${id}/decline`).then(unwrap),
  regenerateLink: (id) => api.post(`${base}/invoices/${id}/regenerate-link`).then(unwrap),
  addPayment: (id, payload) => api.post(`${base}/invoices/${id}/payments`, payload).then(unwrap),
  deletePayment: (id, paymentId) => api.delete(`${base}/invoices/${id}/payments/${paymentId}`).then(unwrap),
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
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'card', label: 'Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'stripe', label: 'Stripe' },
  { value: 'other', label: 'Other' }
]

export const RECURRENCE = [
  { value: 'weekly', label: 'Every week' },
  { value: 'fortnightly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Every month' },
  { value: 'quarterly', label: 'Every 3 months' },
  { value: 'yearly', label: 'Every year' }
]
