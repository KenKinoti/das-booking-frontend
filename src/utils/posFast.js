/**
 * Fast sale on any device — pure helpers for the POS (no Vue, no DOM), so the
 * till stays quick with 1000+ products and the logic is unit-tested.
 *
 *   buildIndex(products) / lookupCode(index, code) / searchIndex(index, q)
 *   new WedgeDetector()  — Bluetooth / USB barcode scanners ("keyboard wedge")
 *   quickCashAmounts(total, currency) — exact + the notes people pay with
 *   looksLikeBarcode(s), mergePicks(picks, byId), deviceKind(ua), newRef(prefix)
 */
import { barcodeKeys } from './barcode/checks.js'

const STRIP = /[̀-ͯ]/g
export function normalise(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(STRIP, '')
    .toLowerCase()
}

/**
 * A search index over the catalogue: every product's name / SKU / barcode /
 * category in one lower-case string, and a map from every spelling of its
 * barcode and SKU to the product (a UPC-A typed as 12 digits finds the
 * EAN-13 the camera reads).
 */
export function buildIndex(products) {
  const byCode = new Map()
  const rows = []
  for (const p of products || []) {
    if (!p || !p.id) continue
    const name = normalise(p.name)
    rows.push({ p, name, hay: normalise([p.name, p.sku, p.barcode, p.category?.name].filter(Boolean).join(' ')) })
    for (const k of barcodeKeys(p.barcode)) if (!byCode.has(k)) byCode.set(k, p)
    const sku = String(p.sku || '')
      .trim()
      .toLowerCase()
    if (sku && !byCode.has(sku)) byCode.set(sku, p)
  }
  return { byCode, rows, size: rows.length }
}

/** The product with this barcode / SKU (any spelling), or null. */
export function lookupCode(index, code) {
  if (!index || !code) return null
  for (const k of barcodeKeys(code)) {
    const p = index.byCode.get(k)
    if (p) return p
  }
  return null
}

/**
 * Products matching every word of q, best first: exact code, then names that
 * start with the query, then a word of the name, then anywhere.
 */
export function searchIndex(index, q, { limit = Infinity, filter } = {}) {
  const query = normalise(q).trim()
  const rows = index?.rows || []
  if (!query) {
    const all = []
    for (const r of rows) {
      if (filter && !filter(r.p)) continue
      all.push(r.p)
      if (all.length >= limit) break
    }
    return all
  }
  const terms = query.split(/\s+/).filter(Boolean)
  const exact = lookupCode(index, q.trim())
  const scored = []
  for (const r of rows) {
    if (filter && !filter(r.p)) continue
    let ok = true
    for (const t of terms) {
      if (!r.hay.includes(t)) {
        ok = false
        break
      }
    }
    if (!ok) continue
    let s = 3
    if (exact && r.p === exact) s = 0
    else if (r.name.startsWith(query)) s = 1
    else if (r.name.includes(' ' + terms[0])) s = 2
    scored.push([s, r])
  }
  scored.sort((a, b) => a[0] - b[0] || (a[1].name < b[1].name ? -1 : a[1].name > b[1].name ? 1 : 0))
  const out = []
  for (const [, r] of scored) {
    out.push(r.p)
    if (out.length >= limit) break
  }
  return out
}

/** Something a scanner produced rather than a word typed by hand. */
export function looksLikeBarcode(s) {
  const v = String(s || '').trim()
  if (/^\d{6,14}$/.test(v)) return true
  return /^[A-Z0-9][A-Z0-9\-./]{5,}$/.test(v) && /\d/.test(v) && !/\s/.test(v)
}

/**
 * Bluetooth / USB barcode scanners type the code as very fast key presses
 * followed by Enter. Feed every keydown; key() returns { code } when Enter
 * ends a burst that came from a scanner (every key within maxGap ms of the
 * previous one, at least minLength characters). People type far slower.
 */
export class WedgeDetector {
  constructor({ maxGap = 60, minLength = 4, maxAvg = 35 } = {}) {
    this.maxGap = maxGap
    this.minLength = minLength
    this.maxAvg = maxAvg
    this.reset()
  }
  reset() {
    this.buf = ''
    this.start = 0
    this.last = 0
  }
  /** True while a fast burst is being typed (its first key is in `buf`). */
  get pending() {
    return this.buf.length > 0
  }
  key(key, t) {
    if (key === 'Enter') return this.finish(t)
    if (key === 'Shift' || key === 'CapsLock') return null
    if (typeof key !== 'string' || key.length !== 1) {
      this.reset()
      return null
    }
    if (this.buf && t - this.last > this.maxGap) this.reset()
    if (!this.buf) this.start = t
    this.buf += key
    this.last = t
    return null
  }
  finish(t) {
    const n = this.buf.length
    const ok = n >= this.minLength && t - this.last <= this.maxGap * 2 && this.last - this.start <= (n - 1) * this.maxAvg
    const code = this.buf
    this.reset()
    return ok ? { code: code.trim() } : null
  }
}

// Notes people pay with, by currency (smallest first).
const NOTES = {
  KES: [50, 100, 200, 500, 1000],
  UGX: [1000, 2000, 5000, 10000, 20000, 50000],
  TZS: [500, 1000, 2000, 5000, 10000],
  RWF: [500, 1000, 2000, 5000],
  NGN: [100, 200, 500, 1000],
  ZAR: [10, 20, 50, 100, 200],
  INR: [10, 20, 50, 100, 200, 500],
  JPY: [1000, 5000, 10000]
}

/** Exact amount first, then the amounts a customer is likely to hand over. */
export function quickCashAmounts(total, currency = '') {
  const t = Math.round((Number(total) || 0) * 100) / 100
  const notes = NOTES[String(currency).toUpperCase()] || [5, 10, 20, 50, 100]
  const set = new Set([t])
  for (const n of notes) {
    const v = Math.ceil(t / n) * n
    if (v > t) set.add(v)
  }
  const big = notes[notes.length - 1]
  set.add(Math.ceil(t / big) * big + (t % big === 0 ? big : 0))
  set.add((Math.floor(t / big) + 2) * big)
  return [...set]
    .filter((v) => v >= t)
    .sort((a, b) => a - b)
    .slice(0, 5)
}

/**
 * Quick-pick rows from the API mapped onto catalogue products: unknown,
 * inactive or unsellable ones are dropped; `fill` tops the list up.
 */
export function mergePicks(picks, byId, { limit = 12, sellable = () => true, fill = [] } = {}) {
  const out = []
  const seen = new Set()
  const push = (p, source) => {
    if (!p || seen.has(p.id) || !sellable(p) || out.length >= limit) return
    seen.add(p.id)
    out.push({ product: p, source })
  }
  for (const k of picks || []) push(byId.get(k.product_id), k.source || 'top')
  for (const p of fill) push(p, 'top')
  return out
}

/** "Android phone", "iPhone", "Windows PC"… from a user agent. */
export function deviceKind(ua = '', touchPoints = 0) {
  const s = String(ua)
  if (/iPhone/.test(s)) return 'iPhone'
  if (/iPad/.test(s) || (/Macintosh/.test(s) && touchPoints > 1)) return 'iPad'
  if (/Android/.test(s)) return /Mobile/.test(s) ? 'Android phone' : 'Android tablet'
  if (/CrOS/.test(s)) return 'Chromebook'
  if (/Windows/.test(s)) return 'Windows PC'
  if (/Macintosh|Mac OS X/.test(s)) return 'Mac'
  if (/Linux/.test(s)) return 'computer'
  return 'device'
}

/** A random id for a device or a sale attempt: prefix + 16 base-36 characters. */
export function newRef(prefix = 'ref') {
  let s = ''
  try {
    const a = new Uint8Array(12)
    crypto.getRandomValues(a)
    for (const b of a) s += (b % 36).toString(36)
  } catch {
    for (let i = 0; i < 12; i++) s += Math.floor(Math.random() * 36).toString(36)
  }
  return `${prefix}-${Date.now().toString(36).slice(-4)}${s}`
}

/** M-Pesa confirmation codes: 10 letters / digits, e.g. QK12AB34CD. */
export function cleanMpesaCode(s) {
  return String(s || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 12)
}
export function isMpesaCode(s) {
  return /^[A-Z][A-Z0-9]{9}$/.test(cleanMpesaCode(s))
}
