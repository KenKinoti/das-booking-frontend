import api, { listFrom } from './api'
import { orgCurrency } from '@/utils/orgDefaults'

/**
 * Point of Sale API. All endpoints live under /api/v1/pos and are scoped to the
 * signed-in user's organisation by the backend.
 */
export const posService = {
  // Catalogue ---------------------------------------------------------------
  async products() {
    const res = await api.get('/inventory/products', { params: { is_active: true } })
    return listFrom(res, 'products', 'items')
  },
  async customers(search = '') {
    const res = await api.get('/customers', { params: { search: search || undefined, limit: 50 } })
    return listFrom(res, 'customers')
  },
  async organization() {
    const res = await api.get('/organization')
    return res.data?.data || res.data?.organization || res.data || null
  },

  // Transactions --------------------------------------------------------------
  /** The recorded sale; `duplicate: true` when the till's client_ref was already used (a retried request). */
  async createTransaction(payload) {
    const res = await api.post('/pos/transactions', payload)
    return res.data.duplicate ? { ...res.data.transaction, duplicate: true } : res.data.transaction
  },
  /** Returns { transactions, total, page, limit, summary } */
  async listTransactions(params = {}) {
    const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined))
    // tz: date filters (start_date/end_date) are calendar days in the user's time zone
    const res = await api.get('/pos/transactions', { params: { ...clean, tz: Intl.DateTimeFormat().resolvedOptions().timeZone } })
    return {
      transactions: listFrom(res, 'transactions'),
      total: res.data?.total || 0,
      page: res.data?.page || 1,
      limit: res.data?.limit || clean.limit || 25,
      summary: res.data?.summary || null
    }
  },
  async getTransaction(id) {
    const res = await api.get(`/pos/transactions/${id}`)
    return res.data.transaction
  },
  async voidTransaction(id, reason) {
    const res = await api.post(`/pos/transactions/${id}/void`, { reason })
    return res.data.transaction
  },

  // Cash drawer ---------------------------------------------------------------
  async drawers(params = {}) {
    const res = await api.get('/pos/cash-drawer', { params })
    return listFrom(res, 'cash_drawers')
  },
  async openDrawer({ opening_amount, terminal_id = 'main', notes = '' }) {
    const res = await api.post('/pos/cash-drawer/open', { opening_amount, terminal_id, notes })
    return res.data.cash_drawer
  },
  async closeDrawer(id, { closing_amount, notes = '' }) {
    const res = await api.post(`/pos/cash-drawer/${id}/close`, { closing_amount, notes })
    return res.data.cash_drawer
  },

  // Discounts & tax -----------------------------------------------------------
  async discounts() {
    const res = await api.get('/pos/discounts', { params: { is_active: true } })
    return listFrom(res, 'discounts')
  },
  async taxRates() {
    const res = await api.get('/pos/tax-rates')
    return listFrom(res, 'tax_rates')
  },
  async createTaxRate(payload) {
    const res = await api.post('/pos/tax-rates', payload)
    return res.data.tax_rate
  },

  async report(params = {}) {
    const res = await api.get('/pos/report', { params: { ...params, tz: Intl.DateTimeFormat().resolvedOptions().timeZone } })
    return res.data.report
  },

  // Fast sale on any device (pkg/mpos) -------------------------------------
  /** { picks: [{ product_id, qty, sales, source: mine|bar|top }], mine, days } */
  async quickPicks(locationId = '', limit = 12) {
    const res = await api.get('/pos/quick-picks', { params: { location_id: locationId || undefined, limit } })
    return res.data || { picks: [], mine: 0 }
  },
  /** Managers: sales, voids and discounts per person and device for a date range. */
  async peopleSummary(params = {}) {
    const res = await api.get('/pos/people-summary', { params: { ...params, tz: Intl.DateTimeFormat().resolvedOptions().timeZone } })
    return res.data.summary
  },
  /** Managers: save a scanned barcode on a product ({ replace, move } after a 409). */
  async linkBarcode(productId, barcode, opts = {}) {
    const res = await api.post('/pos/barcode-links', { product_id: productId, barcode, ...opts })
    return res.data
  },
  async addSalePhoto(transactionId, blob, { kind = 'other', note = '' } = {}) {
    const fd = new FormData()
    fd.append('photo', blob, 'sale-photo.jpg')
    fd.append('kind', kind)
    if (note) fd.append('note', note)
    const res = await api.post(`/pos/transactions/${transactionId}/photos`, fd, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60000 })
    return res.data.photo
  },
  async salePhotos(transactionId) {
    const res = await api.get(`/pos/transactions/${transactionId}/photos`)
    return res.data || { photos: [] }
  },
  /** The photo as a Blob (the API needs the sign-in token, so not an <img src>). */
  async salePhotoBlob(photoId) {
    const res = await api.get(`/pos/sale-photos/${photoId}`, { responseType: 'blob' })
    return res.data
  },
  async deleteSalePhoto(photoId) {
    await api.delete(`/pos/sale-photos/${photoId}`)
  }
}

/** "M-Pesa" where it is the mobile money people use (Kenya, Tanzania), else "Mobile money" ("Mobile" when short). */
export function mobileMoneyLabel(currency, short = false) {
  const c = String(currency || orgCurrency() || '').toUpperCase()
  return c === 'KES' || c === 'TZS' ? 'M-Pesa' : short ? 'Mobile' : 'Mobile money'
}

export const PAYMENT_LABELS = {
  cash: 'Cash',
  card: 'Card',
  eftpos: 'EFTPOS',
  bank_transfer: 'Bank transfer',
  voucher: 'Gift voucher',
  get mobile_money() {
    return mobileMoneyLabel()
  },
  other: 'Other',
  split: 'Split'
}

export function paymentSummary(t) {
  const methods = [...new Set((t?.payments || []).map((p) => p.method))]
  if (!methods.length) return '—'
  if ((t.payments || []).length > 1) return 'Split · ' + methods.map((m) => PAYMENT_LABELS[m] || m).join(' + ')
  return PAYMENT_LABELS[methods[0]] || methods[0]
}

export function personName(p) {
  if (!p) return ''
  return `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email || ''
}

export default posService
