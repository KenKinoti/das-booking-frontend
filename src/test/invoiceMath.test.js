import { describe, it, expect } from 'vitest'
import { calculate, renderTemplate } from '../utils/invoiceMath'

describe('invoice calculations (mirror of pkg/invoicing/calc.go)', () => {
  it('adds tax per line and applies a document discount before tax', () => {
    const r = calculate({
      discount_type: 'percent',
      discount_value: 5,
      items: [
        { quantity: 10, unit_price: 150, tax_rate: 10 },
        { quantity: 1, unit_price: 80, tax_rate: 0 }
      ]
    })
    expect(r.subtotal).toBe(1580)
    expect(r.discountTotal).toBe(79)
    expect(r.taxTotal).toBe(142.5)
    expect(r.total).toBe(1643.5)
  })

  it('handles line discounts and shipping', () => {
    const r = calculate({
      discount_type: 'percent',
      discount_value: 10,
      shipping_amount: 15,
      items: [
        { quantity: 1, unit_price: 200, discount_percent: 50, tax_rate: 10 },
        { quantity: 4, unit_price: 25, tax_rate: 10 }
      ]
    })
    expect(r.taxTotal).toBe(18)
    expect(r.total).toBe(213)
  })

  it('extracts tax from tax-inclusive prices', () => {
    const r = calculate({ prices_include_tax: true, items: [{ quantity: 1, unit_price: 110, tax_rate: 10 }] })
    expect(r.total).toBe(110)
    expect(r.taxTotal).toBe(10)
  })

  it('caps fixed discounts at the net amount', () => {
    const r = calculate({ discount_type: 'amount', discount_value: 999, items: [{ quantity: 1, unit_price: 50, tax_rate: 10 }] })
    expect(r.total).toBe(0)
    expect(r.discountTotal).toBe(50)
  })

  it('computes balance due from amount paid', () => {
    const r = calculate({ amount_paid: 40, items: [{ quantity: 1, unit_price: 100 }] })
    expect(r.balanceDue).toBe(60)
  })

  it('renders email templates', () => {
    expect(renderTemplate('Hi {{client}}, {{ number }}', { client: 'Ann', number: 'INV-1' })).toBe('Hi Ann, INV-1')
  })
})
