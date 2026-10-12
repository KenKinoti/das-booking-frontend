/**
 * Bar stock units — display and conversions shared by the bar pages, the
 * counting screen and the POS. Mirrors the backend maths (pkg/bar):
 *
 *   • quantities are stored in BASE units: ml for poured liquids, units for
 *     counted things (beer bottles, cans, lemons), 3 decimals;
 *   • unit_size = base units in one stock unit (750 for a 750 ml bottle,
 *     50000 for a 50 L keg, 1 for a can); pack_size stock units in a pack;
 *   • partial bottle from tenths → tenths × unit_size (tenths 0–1 in 0.1 steps, e.g. 0.4),
 *     from a scale       → (weight − empty) ÷ (full − empty) × unit_size;
 *   • tots = ml ÷ tot size (item override, else the org setting, default 25 ml);
 *   • pour cost % = cost ÷ net selling price (ex VAT) × 100.
 *
 *   import { qtyText, toBase, partialToBase, ... } from '@/utils/barUnits'
 */

export const DEFAULT_TOT_ML = 25

export const CATEGORIES = [
  { key: 'spirits', label: 'Spirits', icon: 'fa-solid fa-whiskey-glass' },
  { key: 'wine', label: 'Wine', icon: 'fa-solid fa-wine-glass' },
  { key: 'beer', label: 'Beer', icon: 'fa-solid fa-beer-mug-empty' },
  { key: 'cider', label: 'Cider', icon: 'fa-solid fa-apple-whole' },
  { key: 'soft_drinks', label: 'Soft drinks', icon: 'fa-solid fa-bottle-water' },
  { key: 'mixers', label: 'Mixers', icon: 'fa-solid fa-flask' },
  { key: 'water', label: 'Water', icon: 'fa-solid fa-droplet' },
  { key: 'energy', label: 'Energy drinks', icon: 'fa-solid fa-bolt' },
  { key: 'garnish', label: 'Garnish', icon: 'fa-solid fa-lemon' },
  { key: 'consumables', label: 'Consumables', icon: 'fa-solid fa-box-open' },
  { key: 'food', label: 'Food', icon: 'fa-solid fa-utensils' },
  { key: 'other', label: 'Other', icon: 'fa-solid fa-cube' }
]

export function categoryLabel(key) {
  return CATEGORIES.find((c) => c.key === key)?.label || (key ? String(key).replace(/_/g, ' ') : 'Other')
}
export function categoryIcon(key) {
  return CATEGORIES.find((c) => c.key === key)?.icon || 'fa-solid fa-cube'
}

export const LOCATION_TYPES = [
  { key: 'store', label: 'Store', icon: 'fa-solid fa-warehouse' },
  { key: 'bar', label: 'Bar', icon: 'fa-solid fa-martini-glass-citrus' },
  { key: 'kitchen', label: 'Kitchen', icon: 'fa-solid fa-kitchen-set' },
  { key: 'event', label: 'Event', icon: 'fa-solid fa-champagne-glasses' },
  { key: 'other', label: 'Other', icon: 'fa-solid fa-location-dot' }
]
export function locationTypeLabel(t) {
  return LOCATION_TYPES.find((x) => x.key === t)?.label || t || 'Other'
}
export function locationIcon(t) {
  return LOCATION_TYPES.find((x) => x.key === t)?.icon || 'fa-solid fa-location-dot'
}

export const WASTAGE_REASONS = [
  { key: 'breakage', label: 'Breakage', icon: 'fa-solid fa-wine-glass-empty' },
  { key: 'spillage', label: 'Spillage', icon: 'fa-solid fa-droplet' },
  { key: 'comp', label: 'Comp', icon: 'fa-solid fa-gift' },
  { key: 'staff_drink', label: 'Staff drink', icon: 'fa-solid fa-user-tie' },
  { key: 'expired', label: 'Expired', icon: 'fa-regular fa-calendar-xmark' },
  { key: 'other', label: 'Other', icon: 'fa-solid fa-ellipsis' }
]
const MORE_REASONS = {
  damaged_on_delivery: 'Damaged on delivery',
  returned_to_supplier: 'Returned to supplier',
  transfer_discrepancy: 'Transfer discrepancy'
}
export function reasonLabel(r) {
  return WASTAGE_REASONS.find((x) => x.key === r)?.label || MORE_REASONS[r] || (r ? String(r).replace(/_/g, ' ') : '—')
}

export const MOVEMENT_KINDS = {
  receive: 'Received',
  transfer_out: 'Transfer out',
  transfer_in: 'Transfer in',
  sale: 'Sale',
  sale_void: 'Sale voided',
  wastage: 'Wastage',
  count_adjust: 'Count adjustment',
  opening: 'Opening stock',
  return_supplier: 'Returned to supplier',
  manual_adjust: 'Manual adjustment'
}
export function movementLabel(k) {
  return MOVEMENT_KINDS[k] || (k ? String(k).replace(/_/g, ' ') : '—')
}

export const COUNT_TYPES = [
  { key: 'full', label: 'Full count', hint: 'Every item at the location' },
  { key: 'spot', label: 'Spot check', hint: 'Chosen items — e.g. the top 10 spirits, nightly' },
  { key: 'opening', label: 'Opening', hint: 'Start of the night' },
  { key: 'closing', label: 'Closing', hint: 'End of the night' }
]
export function countTypeLabel(t) {
  return COUNT_TYPES.find((x) => x.key === t)?.label || t || ''
}

/** Round to 3 decimals (base-unit precision used by the API). */
export function round3(n) {
  return Math.round((Number(n) || 0) * 1000) / 1000
}

const n0 = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/** Units in one stock unit (≥ 1). */
export function unitSize(item) {
  const s = n0(item?.unit_size)
  return s > 0 ? s : 1
}

export function isMl(item) {
  return (item?.base_unit || 'ml') === 'ml'
}

/** "bottle" → "bottles", "glass" → "glasses", "piece" → "pieces". */
export function plural(word, n) {
  const w = String(word || 'unit')
  if (Math.abs(n) === 1) return w
  if (/^(ml|g|kg)$/i.test(w) || (/s$/i.test(w) && !/ss$/i.test(w))) return w
  if (/(ss|x|z|ch|sh)$/i.test(w)) return w + 'es'
  if (/[^aeiou]y$/i.test(w)) return w.slice(0, -1) + 'ies'
  return w + 's'
}

/** Pretty ml: 420 ml, 12.5 L (≥ 1 L), 0.5 ml. */
export function mlText(ml) {
  const v = Math.abs(n0(ml))
  if (v >= 1000) {
    const l = v / 1000
    return `${fmtNum(l, l >= 100 ? 0 : l >= 10 ? 1 : 2)} L`
  }
  return `${fmtNum(v, v < 10 && v % 1 ? 1 : 0)} ml`
}

export function fmtNum(n, max = 2) {
  const v = n0(n)
  return v.toLocaleString(undefined, { maximumFractionDigits: max, minimumFractionDigits: 0 })
}

/**
 * Split a base quantity into whole stock units + remainder (base units).
 * A remainder within 0.0005 of a whole unit snaps to it (float noise).
 */
export function split(qty, item) {
  const size = unitSize(item)
  const v = Math.abs(n0(qty))
  let whole = Math.floor(v / size + 1e-9)
  let rest = round3(v - whole * size)
  if (rest >= size - 0.0005) {
    whole += 1
    rest = 0
  }
  if (rest < 0.0005) rest = 0
  return { whole, rest, negative: n0(qty) < 0 }
}

/**
 * Human quantity for a stock item.
 *   ml item:   "3 bottles + 420 ml", "420 ml", "1 keg + 12.5 L"
 *   unit item: "29 cans", or with { packs: true } "2 cases + 5 cans"
 * Negative stock (sold more than recorded) reads "−1 bottle + 300 ml".
 */
export function qtyText(qty, item, opts = {}) {
  if (qty === null || qty === undefined || qty === '') return '—'
  const label = item?.unit_label || (isMl(item) ? 'bottle' : 'unit')
  const neg = n0(qty) < 0 ? '−' : ''
  if (isMl(item)) {
    const { whole, rest } = split(qty, item)
    if (unitSize(item) <= 1) return neg + mlText(qty)
    const parts = []
    if (whole || !rest) parts.push(`${fmtNum(whole, 0)} ${plural(label, whole)}`)
    if (rest) parts.push(mlText(rest))
    return neg + parts.join(' + ')
  }
  // Counted items: base unit = 1 piece; unit_size pieces per stock unit (usually 1)
  const size = unitSize(item)
  let units = Math.abs(n0(qty)) / size
  const pack = n0(item?.pack_size)
  if (opts.packs && pack > 1 && units >= pack) {
    const packs = Math.floor(units / pack + 1e-9)
    const rest = round3(units - packs * pack)
    const packLabel = item?.pack_label || 'case'
    const parts = [`${fmtNum(packs, 0)} ${plural(packLabel, packs)}`]
    if (rest) parts.push(`${fmtNum(rest, 2)} ${plural(label, rest)}`)
    return neg + parts.join(' + ')
  }
  units = round3(units)
  return `${neg}${fmtNum(units, 2)} ${plural(label, units)}`
}

/** Stock units (bottles, kegs, cans…) as a number, e.g. 3.56. */
export function stockUnits(qty, item) {
  return n0(qty) / unitSize(item)
}

/** Tot size in ml for an item (item override → org setting → 25). */
export function totMl(item, orgTotMl) {
  const own = n0(item?.tot_ml)
  if (own > 0) return own
  const org = n0(orgTotMl)
  return org > 0 ? org : DEFAULT_TOT_ML
}

/** Tots in a quantity of ml (1 decimal). */
export function tots(ml, item, orgTotMl) {
  return Math.round((n0(ml) / totMl(item, orgTotMl)) * 10) / 10
}

/** Units a recipe / wastage / transfer line can be entered in. */
export function inputUnits(item) {
  if (!item) return [{ key: 'ml', label: 'ml' }]
  const label = item.unit_label || (isMl(item) ? 'bottle' : 'unit')
  if (isMl(item)) {
    const out = [
      { key: 'ml', label: 'ml' },
      { key: 'tot', label: 'tots' },
      { key: 'bottle', label: plural(label, 2) }
    ]
    return out
  }
  const out = [{ key: 'unit', label: plural(label, 2) }]
  if (n0(item.pack_size) > 1) out.push({ key: 'pack', label: plural(item.pack_label || 'case', 2) })
  return out
}

/**
 * A quantity entered in `unit` → base units.
 *   ml → ml · tot → tot_ml · bottle → unit_size · unit → 1 piece for counted
 *   items (a whole stock unit for ml items) · pack → pack_size stock units.
 */
export function toBase(qty, unit, item, orgTotMl) {
  const q = n0(qty)
  switch (unit) {
    case 'ml':
      return round3(q)
    case 'tot':
      return round3(q * totMl(item, orgTotMl))
    case 'bottle':
      return round3(q * unitSize(item))
    case 'pack':
      return round3(q * Math.max(1, n0(item?.pack_size)) * unitSize(item))
    case 'unit':
    default:
      return round3(isMl(item) ? q * unitSize(item) : q * unitSize(item))
  }
}

/** Base units → the amount in `unit` (inverse of toBase). */
export function fromBase(base, unit, item, orgTotMl) {
  const b = n0(base)
  switch (unit) {
    case 'ml':
      return round3(b)
    case 'tot':
      return round3(b / totMl(item, orgTotMl))
    case 'pack':
      return round3(b / (Math.max(1, n0(item?.pack_size)) * unitSize(item)))
    default:
      return round3(b / unitSize(item))
  }
}

/** Partial bottle from tenths (0–1 in 0.1 steps, e.g. 0.4 = four tenths) → ml. */
export function tenthsToMl(tenths, item) {
  return round3(n0(tenths) * unitSize(item))
}

/** ml → tenths of a bottle (0–1, nearest 0.1). */
export function mlToTenths(ml, item) {
  return Math.round((n0(ml) / unitSize(item)) * 10) / 10
}

/** Can this item be weighed (full and empty weights set, full > empty)? */
export function canWeigh(item) {
  const f = n0(item?.full_weight_g)
  const e = n0(item?.empty_weight_g)
  return f > 0 && f > e
}

/**
 * Partial from a scale → ml, or { error } when the weight is outside
 * [empty, full] (validated like the backend).
 */
export function weightToMl(grams, item) {
  const f = n0(item?.full_weight_g)
  const e = n0(item?.empty_weight_g)
  const w = n0(grams)
  if (!(f > e)) return { error: 'Set the full and empty weight of this item to count by weight' }
  if (w < e - 0.0005) return { error: `Below the empty weight (${fmtNum(e, 0)} g)` }
  if (w > f + 0.0005) return { error: `Above the full weight (${fmtNum(f, 0)} g)` }
  return { ml: round3(((w - e) / (f - e)) * unitSize(item)) }
}

/**
 * Partial value entered in a mode → ml.
 *   mode 'tenths' (0–1, 0.1 steps) | 'ml' | 'weight' (grams) | '' (none)
 * Returns { ml } or { error } (same rules as the API).
 */
export function partialToBase(mode, value, item) {
  if (value === '' || value === null || value === undefined) return { ml: 0 }
  const v = n0(value)
  if (v < 0) return { error: 'Cannot be negative' }
  if (mode === 'weight') return weightToMl(v, item)
  if (mode === 'ml') {
    if (v > unitSize(item)) return { error: `More than one ${item?.unit_label || 'bottle'} (${mlText(unitSize(item))})` }
    return { ml: round3(v) }
  }
  if (!mode) return v ? { error: 'Choose how the partial amount is measured' } : { ml: 0 }
  if (v > 1 + 1e-9) return { error: 'Tenths go from 0 to 1 (e.g. 0.4)' }
  if (Math.abs(v * 10 - Math.round(v * 10)) > 1e-6) return { error: 'Tenths go in steps of 0.1' }
  return { ml: tenthsToMl(Math.round(v * 10) / 10, item) }
}

/** A count line's total in base units: full × unit_size + partial. */
export function countLineBase(line, item) {
  const full = n0(line?.full_units)
  if (!isMl(item)) return round3(full * unitSize(item))
  const p = partialToBase(line?.partial_mode || 'tenths', line?.partial_value, item)
  return round3(full * unitSize(item) + (p.ml || 0))
}

/** Pour cost % = cost ÷ net price (ex VAT) × 100; null when no price. */
export function pourCostPct(cost, netPrice) {
  const p = n0(netPrice)
  if (!(p > 0)) return null
  return Math.round((n0(cost) / p) * 1000) / 10
}

/** Net (ex VAT) price from a VAT-inclusive price. */
export function netOfTax(price, taxRatePct, inclusive = true) {
  const p = n0(price)
  const r = n0(taxRatePct)
  if (!inclusive || !(r > 0)) return p
  return p / (1 + r / 100)
}

/** Variance (counted − expected) as a % of usage (sold + wastage); null when no usage. */
export function variancePct(variance, usage) {
  const u = n0(usage)
  if (!(Math.abs(u) > 0)) return null
  return Math.round((n0(variance) / u) * 1000) / 10
}

/** "HH:MM" → minutes after midnight (default 06:00). */
export function cutoffMinutes(cutoff) {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(cutoff || '06:00'))
  if (!m) return 360
  return Math.min(23, +m[1]) * 60 + Math.min(59, +m[2])
}

/**
 * The business date a moment belongs to: clubs trade past midnight, so
 * anything before the cutoff counts for the previous night. YYYY-MM-DD.
 */
export function businessDate(cutoff = '06:00', now = new Date()) {
  const d = new Date(now.getTime())
  if (d.getHours() * 60 + d.getMinutes() < cutoffMinutes(cutoff)) d.setDate(d.getDate() - 1)
  const pad = (x) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Signed number with a real minus sign: +1.5 / −2. */
export function signed(n, digits = 1) {
  const v = n0(n)
  const s = fmtNum(Math.abs(v), digits)
  return v > 0 ? `+${s}` : v < 0 ? `−${s}` : s
}

/** Signed quantity text: "−1 bottle + 300 ml", "+2 cans". */
export function signedQty(qty, item) {
  const v = n0(qty)
  if (Math.abs(v) < 0.0005) return '0'
  return (v > 0 ? '+' : '−') + qtyText(Math.abs(v), item)
}
