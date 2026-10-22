// Fast sale on any device — the till's pure helpers (utils/posFast.js).
//   node /home/claude/tools/unit-mpos.mjs src/test/fastSale.test.js
import { describe, it, expect } from 'vitest'
import { buildIndex, lookupCode, searchIndex, WedgeDetector, quickCashAmounts, mergePicks, deviceKind, looksLikeBarcode, isMpesaCode, cleanMpesaCode, newRef } from '../utils/posFast.js'

const P = (id, name, extra = {}) => ({ id, name, sku: 'SKU-' + id, barcode: '', selling_price: 100, current_stock: 10, ...extra })

describe('catalogue index', () => {
  const products = [
    P('1', 'Tusker Lager 500ml', { barcode: '6161101600118', category: { name: 'Beer' } }),
    P('2', 'Coca-Cola 300ml', { barcode: '036000291452' }),
    P('3', 'Jameson 750ml', { sku: 'JAM-750' }),
    P('4', 'Tusker Malt 500ml'),
    P('5', 'Crème brûlée')
  ]
  const idx = buildIndex(products)
  it('finds a product by any spelling of its barcode, or its SKU', () => {
    expect(lookupCode(idx, '6161101600118').id).toBe('1')
    expect(lookupCode(idx, '0036000291452').id).toBe('2') // EAN-13 spelling of a UPC-A
    expect(lookupCode(idx, '036000291452').id).toBe('2')
    expect(lookupCode(idx, 'jam-750').id).toBe('3')
    expect(lookupCode(idx, '5901234123457')).toBeNull()
    expect(lookupCode(idx, '')).toBeNull()
  })
  it('search: every word must match, best matches first, accents ignored', () => {
    expect(searchIndex(idx, 'tusker').map((p) => p.id)).toEqual(['1', '4'])
    expect(searchIndex(idx, 'tusker malt').map((p) => p.id)).toEqual(['4'])
    expect(searchIndex(idx, 'creme').map((p) => p.id)).toEqual(['5'])
    expect(searchIndex(idx, 'beer').map((p) => p.id)).toEqual(['1']) // category
    expect(searchIndex(idx, '6161101600118')[0].id).toBe('1')
    expect(searchIndex(idx, 'lager 500').map((p) => p.id)).toEqual(['1'])
    expect(searchIndex(idx, '', { limit: 2 }).length).toBe(2)
    expect(searchIndex(idx, 'tusker', { filter: (p) => p.id !== '1' }).map((p) => p.id)).toEqual(['4'])
  })
  it('1000+ products: index and search in a few milliseconds', () => {
    const many = []
    for (let i = 0; i < 3000; i++) many.push(P('p' + i, `Product ${i} ${['Tusker', 'Guinness', 'Coke', 'Jameson', 'Smirnoff'][i % 5]} ${i % 7 ? '500ml' : '1L'}`, { barcode: String(6000000000000 + i) }))
    let t0 = performance.now()
    const big = buildIndex(many)
    const build = performance.now() - t0
    t0 = performance.now()
    let hits = 0
    for (const q of ['tus', 'tusker 500', 'guinness 1l', 'product 29', 'jam', 'smirnoff', 'coke 500ml', 'zzz']) hits += searchIndex(big, q, { limit: 120 }).length
    const search = (performance.now() - t0) / 8
    t0 = performance.now()
    for (let i = 0; i < 1000; i++) lookupCode(big, String(6000000000000 + i))
    const lookup = (performance.now() - t0) / 1000
    console.log(`    3000 products: index ${build.toFixed(1)} ms, search ${search.toFixed(2)} ms/query, code lookup ${(lookup * 1000).toFixed(1)} µs`)
    expect(hits).toBeGreaterThan(100)
    expect(build).toBeLessThan(400)
    expect(search).toBeLessThan(25)
    expect(lookup).toBeLessThan(1)
  })
})

describe('Bluetooth / USB scanners (keyboard wedge)', () => {
  const feed = (w, text, start, gap, enterGap = gap) => {
    let t = start
    let r = null
    for (const ch of text) {
      r = w.key(ch, t) || r
      t += gap
    }
    return w.key('Enter', t - gap + enterGap) || r
  }
  it('a fast burst ending in Enter is a scan', () => {
    const w = new WedgeDetector()
    expect(feed(w, '6161101600118', 1000, 8)).toEqual({ code: '6161101600118' })
    expect(feed(w, 'POS-FW', 5000, 15)).toEqual({ code: 'POS-FW' })
  })
  it('people typing are not scans', () => {
    const w = new WedgeDetector()
    expect(feed(w, '6161101600118', 1000, 140)).toBeNull()
    expect(feed(w, 'tusker', 9000, 90)).toBeNull()
  })
  it('too short, a slow Enter, or a pause in the middle', () => {
    const w = new WedgeDetector()
    expect(feed(w, '123', 1000, 8)).toBeNull()
    expect(feed(w, '6161101600118', 2000, 8, 400)).toBeNull()
    // a pause restarts the burst: only the part after it counts
    let t = 5000
    for (const ch of '61611') w.key(ch, (t += 8))
    t += 300
    let r = null
    for (const ch of '01600118') r = w.key(ch, (t += 8)) || r
    expect(w.key('Enter', t + 8)).toEqual({ code: '01600118' })
  })
  it('Shift (upper-case letters) is ignored; other keys break the burst', () => {
    const w = new WedgeDetector()
    let t = 100
    for (const k of ['Shift', 'P', 'Shift', 'O', 'S', '-', '1', '2']) w.key(k, (t += 6))
    expect(w.key('Enter', t + 6)).toEqual({ code: 'POS-12' })
    for (const k of ['1', '2', 'ArrowLeft', '3', '4']) w.key(k, (t += 6))
    expect(w.key('Enter', t + 6)).toBeNull()
    expect(w.pending).toBe(false)
  })
})

describe('payments', () => {
  it('KES: exact, then the notes people hand over', () => {
    expect(quickCashAmounts(850, 'KES')).toEqual([850, 900, 1000, 2000])
    expect(quickCashAmounts(250, 'KES')).toEqual([250, 300, 400, 500, 1000])
    expect(quickCashAmounts(1000, 'KES')).toEqual([1000, 2000, 3000])
    expect(quickCashAmounts(3250, 'KES')).toEqual([3250, 3300, 3400, 3500, 4000])
  })
  it('AUD / USD keep 5-10-20-50-100 steps', () => {
    expect(quickCashAmounts(23.5, 'AUD')).toEqual([23.5, 25, 30, 40, 50])
    expect(quickCashAmounts(100, 'USD')[0]).toBe(100)
    for (const t of [0.5, 7.25, 19.99, 101]) for (const v of quickCashAmounts(t, 'AUD')) expect(v).toBeGreaterThanOrEqual(t)
  })
  it('M-Pesa confirmation codes', () => {
    expect(isMpesaCode('qk12ab34cd')).toBe(true)
    expect(cleanMpesaCode(' qk12-ab34 cd ')).toBe('QK12AB34CD')
    expect(isMpesaCode('12345')).toBe(false)
    expect(isMpesaCode('1K12AB34CD')).toBe(false)
  })
})

describe('quick picks, devices, refs', () => {
  it('picks map onto sellable products, then fill', () => {
    const byId = new Map([P('a', 'A'), P('b', 'B', { current_stock: 0 }), P('c', 'C'), P('d', 'D')].map((p) => [p.id, p]))
    const out = mergePicks(
      [
        { product_id: 'a', source: 'mine' },
        { product_id: 'gone', source: 'mine' },
        { product_id: 'b', source: 'bar' },
        { product_id: 'c', source: 'top' }
      ],
      byId,
      { limit: 3, sellable: (p) => p.current_stock > 0, fill: [byId.get('a'), byId.get('d')] }
    )
    expect(out.map((x) => `${x.product.id}:${x.source}`)).toEqual(['a:mine', 'c:top', 'd:top'])
  })
  it('device kinds from user agents', () => {
    expect(deviceKind('Mozilla/5.0 (Linux; Android 14; SM-A146P) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36')).toBe('Android phone')
    expect(deviceKind('Mozilla/5.0 (Linux; Android 13; SM-X200) AppleWebKit/537.36 Chrome/120 Safari/537.36')).toBe('Android tablet')
    expect(deviceKind('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe('iPhone')
    expect(deviceKind('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5)).toBe('iPad')
    expect(deviceKind('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('Windows PC')
  })
  it('looks like a barcode / new refs', () => {
    expect(looksLikeBarcode('6161101600118')).toBe(true)
    expect(looksLikeBarcode('R58N123ABC')).toBe(true)
    expect(looksLikeBarcode('tusker')).toBe(false)
    expect(looksLikeBarcode('12')).toBe(false)
    const a = newRef('sale')
    expect(a).toMatch(/^sale-[a-z0-9]{16}$/)
    expect(newRef('sale')).not.toBe(a)
  })
})
