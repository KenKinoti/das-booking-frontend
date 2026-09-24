/**
 * Client-side mirror of the backend invoice calculation (pkg/invoicing/calc.go)
 * so totals update live while editing. The server recalculates on save.
 */
/** Minor-unit decimals per currency (mirrors pkg/currency.Decimals). */
export function currencyDecimals(code) {
  const c = String(code || '').toUpperCase()
  if (c === 'JPY' || c === 'UGX') return 0
  if (c === 'KWD') return 3
  return 2
}

export function calculate(doc) {
  const p = Math.pow(10, currencyDecimals(doc.currency))
  const round2 = (v) => Math.round((Number(v) + Number.EPSILON) * p) / p
  const items = (doc.items || []).map((it) => {
    const qty = Math.max(0, Number(it.quantity) || 0)
    const price = Number(it.unit_price) || 0
    const disc = Math.min(100, Math.max(0, Number(it.discount_percent) || 0))
    const sub = round2(qty * price)
    const lineDiscount = round2((sub * disc) / 100)
    return { ...it, _sub: sub, _disc: lineDiscount, _net: sub - lineDiscount, _rate: Number(it.tax_rate) || 0 }
  })
  const net = round2(items.reduce((s, i) => s + i._net, 0))
  let docDiscount = 0
  const dv = Math.max(0, Number(doc.discount_value) || 0)
  if (dv > 0) docDiscount = doc.discount_type === 'amount' ? dv : (net * Math.min(dv, 100)) / 100
  docDiscount = round2(Math.min(docDiscount, net))

  let lastIdx = -1
  items.forEach((it, i) => {
    if (it._net !== 0) lastIdx = i
  })
  let allocated = 0
  let tax = 0
  const taxByRate = {}
  items.forEach((it, i) => {
    let share = 0
    if (docDiscount > 0 && net > 0) {
      if (i === lastIdx) share = round2(docDiscount - allocated)
      else {
        share = round2((docDiscount * it._net) / net)
        allocated += share
      }
    }
    const taxable = it._net - share
    const lineTax = doc.prices_include_tax ? round2(taxable - taxable / (1 + it._rate / 100)) : round2((taxable * it._rate) / 100)
    it.line_tax = lineTax
    it.line_total = round2(it._net)
    tax += lineTax
    if (it._rate > 0) {
      const key = `${it.tax_name || 'Tax'} ${it._rate}%`
      taxByRate[key] = round2((taxByRate[key] || 0) + lineTax)
    }
  })
  const subtotal = round2(items.reduce((s, i) => s + i._sub, 0))
  const lineDiscounts = round2(items.reduce((s, i) => s + i._disc, 0))
  const discountTotal = round2(lineDiscounts + docDiscount)
  const shipping = Math.max(0, Number(doc.shipping_amount) || 0)
  tax = round2(tax)
  const total = doc.prices_include_tax ? round2(subtotal - discountTotal + shipping) : round2(subtotal - discountTotal + tax + shipping)
  const paid = Number(doc.amount_paid) || 0
  return {
    items,
    subtotal,
    lineDiscounts,
    docDiscount,
    discountTotal,
    taxTotal: tax,
    taxByRate,
    shipping,
    total,
    balanceDue: round2(total - paid)
  }
}

export function renderTemplate(template, vars) {
  return String(template || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (vars[k] ?? ''))
}
