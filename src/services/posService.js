import api, { listFrom } from './api'

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
  async createTransaction(payload) {
    const res = await api.post('/pos/transactions', payload)
    return res.data.transaction
  },
  /** Returns { transactions, total, page, limit, summary } */
  async listTransactions(params = {}) {
    const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined))
    const res = await api.get('/pos/transactions', { params: clean })
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
    const res = await api.get('/pos/report', { params })
    return res.data.report
  }
}

export const PAYMENT_LABELS = {
  cash: 'Cash',
  card: 'Card',
  eftpos: 'EFTPOS',
  bank_transfer: 'Bank transfer',
  voucher: 'Gift voucher',
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
