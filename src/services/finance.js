import api from './api'

const base = '/finance'
const unwrap = (r) => r.data?.data

export const financeApi = {
  // tz: overdue / this month follow the user's calendar
  summary: () => api.get(`${base}/summary`, { params: { tz: Intl.DateTimeFormat().resolvedOptions().timeZone } }).then(unwrap),

  // Chart of accounts
  accounts: () => api.get(`${base}/chart-of-accounts`).then(unwrap),
  createAccount: (p) => api.post(`${base}/chart-of-accounts`, p).then(unwrap),
  updateAccount: (id, p) => api.put(`${base}/chart-of-accounts/${id}`, p).then(unwrap),
  deleteAccount: (id) => api.delete(`${base}/chart-of-accounts/${id}`).then(unwrap),

  // Journal entries
  journals: (params) => api.get(`${base}/journal-entries`, { params }).then(unwrap),
  journal: (id) => api.get(`${base}/journal-entries/${id}`).then(unwrap),
  createJournal: (p) => api.post(`${base}/journal-entries`, p).then(unwrap),
  updateJournal: (id, p) => api.put(`${base}/journal-entries/${id}`, p).then(unwrap),
  deleteJournal: (id) => api.delete(`${base}/journal-entries/${id}`).then(unwrap),
  postJournal: (id) => api.post(`${base}/journal-entries/${id}/post`).then(unwrap),
  reverseJournal: (id, p) => api.post(`${base}/journal-entries/${id}/reverse`, p || {}).then(unwrap),

  // Reports
  trialBalance: (params) => api.get(`${base}/reports/trial-balance`, { params }).then(unwrap),
  profitLoss: (params) => api.get(`${base}/reports/profit-loss`, { params }).then(unwrap),
  balanceSheet: (params) => api.get(`${base}/reports/balance-sheet`, { params }).then(unwrap),
  generalLedger: (params) => api.get(`${base}/reports/general-ledger`, { params }).then(unwrap),

  // Bills & vendors
  bills: (params) => api.get(`${base}/bills`, { params: { ...params, tz: Intl.DateTimeFormat().resolvedOptions().timeZone } }).then(unwrap),
  bill: (id) => api.get(`${base}/bills/${id}`).then(unwrap),
  createBill: (p) => api.post(`${base}/bills`, p).then(unwrap),
  updateBill: (id, p) => api.put(`${base}/bills/${id}`, p).then(unwrap),
  deleteBill: (id) => api.delete(`${base}/bills/${id}`).then(unwrap),
  approveBill: (id) => api.post(`${base}/bills/${id}/approve`).then(unwrap),
  payBill: (id, p) => api.post(`${base}/bills/${id}/payments`, p).then(unwrap),
  deleteBillPayment: (id, paymentId) => api.delete(`${base}/bills/${id}/payments/${paymentId}`).then(unwrap),
  vendors: (params) => api.get(`${base}/vendors`, { params }).then(unwrap),
  createVendor: (p) => api.post(`${base}/vendors`, p).then(unwrap),
  updateVendor: (id, p) => api.put(`${base}/vendors/${id}`, p).then(unwrap),
  deleteVendor: (id) => api.delete(`${base}/vendors/${id}`).then(unwrap),

  // Banking
  bankAccounts: (params) => api.get(`${base}/bank-accounts`, { params }).then(unwrap),
  createBankAccount: (p) => api.post(`${base}/bank-accounts`, p).then(unwrap),
  updateBankAccount: (id, p) => api.put(`${base}/bank-accounts/${id}`, p).then(unwrap),
  deleteBankAccount: (id) => api.delete(`${base}/bank-accounts/${id}`).then(unwrap),
  transactions: (params) => api.get(`${base}/bank-transactions`, { params }).then(unwrap),
  createTransaction: (p) => api.post(`${base}/bank-transactions`, p).then(unwrap),
  categorize: (id, accountId) => api.post(`${base}/bank-transactions/${id}/categorize`, { account_id: accountId }).then(unwrap),
  reconcile: (id, reconciled) => api.post(`${base}/bank-transactions/${id}/reconcile`, { reconciled }).then(unwrap),
  deleteTransaction: (id) => api.delete(`${base}/bank-transactions/${id}`).then(unwrap)
}

export const ACCOUNT_TYPES = [
  { value: 'Asset', label: 'Assets', icon: 'fa-solid fa-building-columns', subtypes: ['Current Asset', 'Bank', 'Fixed Asset', 'Non-current Asset'] },
  { value: 'Liability', label: 'Liabilities', icon: 'fa-solid fa-file-invoice', subtypes: ['Current Liability', 'Credit Card', 'Non-current Liability'] },
  { value: 'Equity', label: 'Equity', icon: 'fa-solid fa-scale-balanced', subtypes: ['Capital', 'Drawings', 'Retained Earnings'] },
  { value: 'Revenue', label: 'Revenue', icon: 'fa-solid fa-arrow-trend-up', subtypes: ['Operating Revenue', 'Other Income'] },
  { value: 'Expense', label: 'Expenses', icon: 'fa-solid fa-receipt', subtypes: ['Cost of Sales', 'Operating Expense', 'Other Expense'] }
]

export const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'card', label: 'Card' },
  { value: 'direct_debit', label: 'Direct debit' },
  { value: 'bpay', label: 'BPAY' },
  { value: 'cash', label: 'Cash' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' }
]

export const PAYMENT_TERMS = [
  { value: 'DUE_ON_RECEIPT', label: 'Due on receipt', days: 0 },
  { value: 'NET7', label: 'Net 7 days', days: 7 },
  { value: 'NET14', label: 'Net 14 days', days: 14 },
  { value: 'NET30', label: 'Net 30 days', days: 30 },
  { value: 'NET60', label: 'Net 60 days', days: 60 }
]

export const BANK_TYPES = [
  { value: 'checking', label: 'Everyday / cheque', icon: 'fa-solid fa-building-columns' },
  { value: 'savings', label: 'Savings', icon: 'fa-solid fa-piggy-bank' },
  { value: 'credit_card', label: 'Credit card', icon: 'fa-regular fa-credit-card' },
  { value: 'cash', label: 'Cash / petty cash', icon: 'fa-solid fa-wallet' }
]

export const BILL_STATUS_LABELS = {
  draft: 'Draft',
  unpaid: 'Awaiting payment',
  partial: 'Part paid',
  paid: 'Paid',
  overdue: 'Overdue'
}

export const BILL_BADGE = {
  draft: 'draft',
  unpaid: 'sent',
  partial: 'partial',
  paid: 'paid',
  overdue: 'overdue'
}

export function termDays(term) {
  return PAYMENT_TERMS.find((t) => t.value === term)?.days ?? 30
}

/** Round to cents to avoid float drift in UI totals. */
export function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100
}

export function toCents(n) {
  return Math.round((Number(n) || 0) * 100)
}

/** Mask an account number, keeping the last 4 digits. */
export function maskNumber(num) {
  const s = String(num || '').replace(/\s+/g, '')
  if (!s) return ''
  if (s.length <= 4) return s
  return '•••• ' + s.slice(-4)
}

/** Group accounts by type in display order. */
export function groupAccounts(accounts, { activeOnly = false, types = null } = {}) {
  return ACCOUNT_TYPES.filter((t) => !types || types.includes(t.value))
    .map((t) => ({
      ...t,
      accounts: (accounts || []).filter((a) => a.account_type === t.value && (!activeOnly || a.is_active))
    }))
    .filter((g) => g.accounts.length)
}
