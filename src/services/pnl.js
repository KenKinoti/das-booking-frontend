/**
 * Profit & loss — the one P&L calculation (GET /reports/profit-loss) used by
 * the dashboard, Reports → Profit & loss, Finance, the Business hub,
 * Analytics and the AI tools, so every page shows the same numbers.
 */
import api from '@/services/api'
import { formatCurrency } from '@/utils/currencies'
import { useAuthStore } from '@/stores/auth'
import { orgCurrency } from '@/utils/orgDefaults'

export function browserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

/**
 * Fetch the statement.
 * @param {object} p { range, from, to, basis, compare (bool|'previous'|'year'|'none'), series (bool) }
 */
export async function fetchPnl({ range, from, to, basis = 'accrual', compare = true, series = true } = {}) {
  const params = { tz: browserTimeZone(), basis }
  if (from && to) {
    params.from = from
    params.to = to
  } else if (range) {
    params.range = range === 'custom' ? '30d' : range
  }
  params.compare = compare === true ? 'previous' : compare === false ? 'none' : compare || 'previous'
  if (!series) params.series = '0'
  const res = await api.get('/reports/profit-loss', { params })
  return res.data?.data || res.data
}

/** Dashboard/analytics period ({ range, from, to }) → P&L query. */
export function periodParams(period = {}) {
  if (period.range === 'custom' && period.from && period.to) return { from: period.from, to: period.to }
  return { range: period.range || '30d' }
}

// ---- basis preference, remembered per user ----
function basisKey() {
  const u = useAuthStore().user
  return `pnl.basis.${u?.id || u?.email || 'me'}`
}

export function loadBasis() {
  try {
    const v = localStorage.getItem(basisKey())
    return v === 'cash' ? 'cash' : 'accrual'
  } catch {
    return 'accrual'
  }
}

export function saveBasis(v) {
  try {
    localStorage.setItem(basisKey(), v === 'cash' ? 'cash' : 'accrual')
  } catch {
    /* private window: not remembered */
  }
}

export function pnlMoney(v, cur, compact = false) {
  return formatCurrency(v || 0, cur || orgCurrency(), { compact })
}

/** Signed change text ("+12.5%"), '' when unknown. */
export function pctText(v) {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return ''
  const n = Number(v)
  return `${n > 0 ? '+' : ''}${n.toFixed(1)}%`
}

export const BASIS_LABEL = { accrual: 'Accrual', cash: 'Cash' }
export const BASIS_HELP = {
  accrual: 'Income when invoiced, costs when billed — whether or not paid yet.',
  cash: 'Income when money is received, costs when bills are paid.'
}

/** Rows for a CSV export of the statement. */
export function statementCsv(d) {
  const cur = d.currency
  const cmp = !!d.compare
  const head = ['Section', 'Line', `Amount (${cur})`]
  if (cmp) head.push(`Previous (${d.compare.from} – ${d.compare.to})`, 'Change %')
  const rows = [[`Profit & loss · ${d.organization?.name || ''}`], [`${d.period.from} to ${d.period.to}`, `${BASIS_LABEL[d.basis]} basis`, `Excluding ${d.tax?.label || 'tax'}`], head]
  const n = (v) => (v === null || v === undefined ? '' : Number(v).toFixed(d.decimals ?? 2))
  const row = (sec, label, amt, prev, ch) => {
    const r = [sec, label, n(amt)]
    if (cmp) r.push(n(prev), ch === null || ch === undefined ? '' : ch)
    return r
  }
  for (const s of d.sections) {
    for (const l of s.lines) {
      rows.push(row(s.label, l.label, l.amount, l.previous, l.change_pct))
      for (const c of l.children || []) rows.push(row(s.label, `  ${c.label}`, c.amount))
    }
    rows.push(row(s.label, `Total ${s.label.toLowerCase()}`, s.total, s.previous, s.change_pct))
    if (s.key === 'cost_of_sales') rows.push(row('', 'Gross profit', d.totals.gross_profit, d.previous?.gross_profit, d.change_pct?.gross_profit))
  }
  rows.push(row('', 'Net profit', d.totals.net_profit, d.previous?.net_profit, d.change_pct?.net_profit))
  rows.push([])
  rows.push(['Memo (not profit)', `${d.tax.label} collected`, n(d.tax.collected)])
  rows.push(['Memo (not profit)', `${d.tax.label} paid`, n(d.tax.paid)])
  rows.push(['Memo (not profit)', `Net ${d.tax.label}`, n(d.tax.net)])
  for (const o of d.other_currencies || []) rows.push(['Not included (other currency)', o.currency, `revenue ${o.revenue}`, `expenses ${o.expenses}`, `net ${o.net_profit}`])
  return rows
}
