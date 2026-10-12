/**
 * Pure helpers for the setup wizard's "Bar setup" step (nightclub / bar /
 * lounge business type). No Vue or API imports so they can be unit-tested.
 *
 * The step posts to POST /bar/setup:
 *   { locations: [{ name, type, is_main_store }], tot_ml, day_cutoff: 'HH:MM',
 *     catalog_keys: [...], make_menu_items }
 * which the backend applies idempotently (locations by name, items by
 * catalogue key), so re-running the wizard never duplicates anything.
 */

export const LOCATION_TYPES = [
  { value: 'store', label: 'Store', hint: 'Where deliveries arrive and stock is kept' },
  { value: 'bar', label: 'Bar', hint: 'Where drinks are poured and sold' },
  { value: 'kitchen', label: 'Kitchen', hint: 'Food and garnish prep' },
  { value: 'event', label: 'Event / pop-up', hint: 'A temporary bar for an event' }
]

export const CATEGORY_LABELS = {
  spirits: 'Spirits',
  wine: 'Wine',
  beer: 'Beer',
  cider: 'Cider',
  soft_drinks: 'Soft drinks',
  mixers: 'Mixers',
  water: 'Water',
  energy: 'Energy drinks',
  garnish: 'Garnish',
  consumables: 'Consumables',
  food: 'Food',
  other: 'Other'
}

const CATEGORY_ORDER = Object.keys(CATEGORY_LABELS)

export const DEFAULT_TOT_ML = 25
export const DEFAULT_DAY_CUTOFF = '06:00'

let seq = 0
const rowKey = () => `loc-${Date.now().toString(36)}-${++seq}`

/** A new location row for the form. */
export function locationRow(name = '', type = 'bar', main = false) {
  return { key: rowKey(), id: '', name, type, main, existing: false, original: '', originalType: '' }
}

/** Suggested locations for a new club: a main store and two bars. */
export function defaultLocations() {
  return [locationRow('Main store', 'store', true), locationRow('Main bar', 'bar'), locationRow('VIP bar', 'bar')]
}

/**
 * Rows for locations that already exist (the wizard is being re-run). They
 * can be renamed but not removed here — removing a bar that holds stock
 * belongs in Bar stock → Setup.
 */
export function locationsFromExisting(list) {
  const rows = (Array.isArray(list) ? list : [])
    .filter((l) => l && l.name)
    .map((l) => {
      const type = LOCATION_TYPES.some((t) => t.value === l.type) ? l.type : 'bar'
      return { key: rowKey(), id: l.id || '', name: String(l.name), type, main: !!(l.is_main_store || l.main_store || l.is_main), existing: true, original: String(l.name), originalType: type }
    })
  if (rows.length && !rows.some((r) => r.main)) {
    const store = rows.find((r) => r.type === 'store') || rows[0]
    store.main = true
  }
  return rows
}

/** Existing locations whose name or type was changed in the form (PUT /bar/locations/:id). */
export function changedLocations(locations) {
  return (locations || []).filter((l) => l.existing && l.id && (String(l.name).trim() !== l.original || (l.originalType && l.type !== l.originalType)))
}

/** "HH:MM" between 00:00 and 12:00 (a business day ends in the morning). */
export function validCutoff(v) {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(v || '').trim())
  if (!m) return false
  const minutes = Number(m[1]) * 60 + Number(m[2])
  return minutes <= 12 * 60
}

/**
 * Validates the form. Returns { ok, errors } where errors has `locations`
 * (form-level), `rows` (index → message), `tot_ml` and `day_cutoff`.
 */
export function validateBarSetup({ locations = [], tot_ml, day_cutoff } = {}) {
  const errors = { rows: {} }
  const named = locations.filter((l) => String(l.name || '').trim())
  const seen = new Map()
  locations.forEach((l, i) => {
    const name = String(l.name || '').trim()
    if (!name) {
      errors.rows[i] = 'Give this location a name'
      return
    }
    if (name.length > 80) errors.rows[i] = 'Keep the name under 80 characters'
    const k = name.toLowerCase()
    if (seen.has(k)) errors.rows[i] = 'Two locations have this name'
    else seen.set(k, i)
  })
  if (!named.length) errors.locations = 'Add at least one bar or store'
  else if (!named.some((l) => l.type === 'bar')) errors.locations = 'Add at least one bar — it is where the till takes stock from'
  else if (named.filter((l) => l.main).length !== 1) errors.locations = 'Choose the main store, where deliveries are received'
  const tot = Number(tot_ml)
  if (!(tot >= 5 && tot <= 100)) errors.tot_ml = 'Enter the measure in ml (5–100)'
  if (!validCutoff(day_cutoff)) errors.day_cutoff = 'Choose a time between 00:00 and 12:00'
  const ok = !errors.locations && !Object.keys(errors.rows).length && !errors.tot_ml && !errors.day_cutoff
  return { ok, errors }
}

/** "750 ml bottle · case of 12", "50 L keg", "can · tray of 24", "piece". */
export function unitText(item) {
  if (!item) return ''
  const label = item.unit_label || (item.base_unit === 'ml' ? 'bottle' : 'unit')
  let size = ''
  const n = Number(item.unit_size) || 0
  if (item.base_unit === 'ml' && n > 0) size = n >= 1000 && n % 1000 === 0 ? `${n / 1000} L ` : n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')} L ` : `${n} ml `
  const pack = Number(item.pack_size) > 1 ? ` · ${item.pack_label || 'pack'} of ${Number(item.pack_size)}` : ''
  return `${size}${label}${pack}`
}

export function categoryLabel(c) {
  return CATEGORY_LABELS[c] || (c ? String(c).replace(/_/g, ' ').replace(/^./, (x) => x.toUpperCase()) : 'Other')
}

const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

/**
 * Groups the starter catalogue by category (fixed order, unknown categories
 * last), filtered by a search over name, category and unit.
 */
export function groupCatalog(catalog, query = '') {
  const q = norm(query).trim()
  const words = q ? q.split(/\s+/) : []
  const groups = new Map()
  for (const item of Array.isArray(catalog) ? catalog : []) {
    if (!item || !item.key) continue
    if (words.length) {
      const hay = norm(`${item.name} ${categoryLabel(item.category)} ${item.category} ${unitText(item)}`)
      if (!words.every((w) => hay.includes(w))) continue
    }
    const c = item.category || 'other'
    if (!groups.has(c)) groups.set(c, [])
    groups.get(c).push(item)
  }
  const rank = (c) => {
    const i = CATEGORY_ORDER.indexOf(c)
    return i < 0 ? CATEGORY_ORDER.length : i
  }
  return [...groups.entries()]
    .sort((a, b) => rank(a[0]) - rank(b[0]) || a[0].localeCompare(b[0]))
    .map(([category, items]) => ({ category, label: categoryLabel(category), items: items.slice().sort((a, b) => String(a.name).localeCompare(String(b.name))) }))
}

/** Catalogue keys whose item already exists in the club's stock list (by catalogue key or name). */
export function existingCatalogKeys(catalog, items) {
  const names = new Set((Array.isArray(items) ? items : []).map((i) => norm(i?.name).trim()).filter(Boolean))
  const keys = new Set((Array.isArray(items) ? items : []).map((i) => i?.catalog_key).filter(Boolean))
  const out = new Set()
  for (const c of Array.isArray(catalog) ? catalog : []) {
    if (!c?.key) continue
    if (c.exists || c.added || keys.has(c.key) || names.has(norm(c.name).trim())) out.add(c.key)
  }
  return out
}

/** How many of the selected keys are spirits (for the tot/bottle toggle). */
export function spiritsSelected(catalog, selected) {
  const sel = selected instanceof Set ? selected : new Set(selected || [])
  return (Array.isArray(catalog) ? catalog : []).filter((c) => c && sel.has(c.key) && c.category === 'spirits').length
}

/** "HH:MM" from "6:00", "06:00:00" or a Date-ish string. */
export function normaliseCutoff(v) {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(v || '').trim())
  if (!m) return DEFAULT_DAY_CUTOFF
  return `${m[1].padStart(2, '0')}:${m[2]}`
}

/**
 * The POST /bar/setup body. Items already in the stock list stay in
 * catalog_keys: the API skips them but still adds their tot/bottle menu items
 * when those are missing (a re-run can switch menu items on later).
 */
export function buildSetupPayload({ locations = [], tot_ml, day_cutoff, selected, make_menu_items }) {
  const sel = selected instanceof Set ? [...selected] : [...(selected || [])]
  return {
    locations: locations
      .filter((l) => String(l.name || '').trim())
      .map((l) => ({ name: String(l.name).trim(), type: l.type || 'bar', is_main_store: !!l.main })),
    tot_ml: Math.round(Number(tot_ml) * 10) / 10,
    day_cutoff: normaliseCutoff(day_cutoff),
    catalog_keys: [...new Set(sel)].sort(),
    make_menu_items: !!make_menu_items
  }
}

const num = (...vals) => {
  for (const v of vals) {
    if (typeof v === 'number' && Number.isFinite(v)) return v
    if (Array.isArray(v)) return v.length
  }
  return null
}

/**
 * What the step did, for the wizard's last page. Reads the counts the API
 * returns (several spellings accepted) and falls back to what was sent.
 */
export function summarise(response, payload) {
  const r = (response && (response.summary || response)) || {}
  const p = payload || { locations: [], catalog_keys: [] }
  const created = r.created || {}
  return {
    locations: p.locations.map((l) => ({ name: l.name, type: l.type, main: l.is_main_store })),
    tot_ml: p.tot_ml,
    day_cutoff: p.day_cutoff,
    locationsCreated: num(r.locations_created, created.locations, r.locations),
    items: num(r.items_created, created.items, r.items, p.catalog_keys.length) ?? 0,
    menuItems: num(r.menu_items_created, created.menu_items, r.menu_items, r.recipes_created, created.recipes),
    skipped: num(r.items_existing, r.items_skipped, r.skipped) ?? 0,
    makeMenuItems: !!p.make_menu_items
  }
}

/** A friendly "3 bars & stores" label. */
export function plural(n, one, many) {
  return `${n} ${n === 1 ? one : many || one + 's'}`
}

/** The "Menu items" line of the summary. */
export function menuItemsText(s) {
  if (!s) return ''
  if (s.menuItems == null) return 'Tot & bottle items for your spirits'
  if (s.menuItems === 0) return s.skipped ? 'Already on the till' : 'None added'
  return `${s.menuItems} tot & bottle items`
}

/** The toast after the step: what changed. */
export function summaryToast(s) {
  const parts = []
  if (s.locationsCreated) parts.push(plural(s.locationsCreated, 'new location'))
  if (s.items) parts.push(plural(s.items, 'stock item'))
  if (s.menuItems) parts.push(plural(s.menuItems, 'menu item'))
  return parts.length ? `Bar set up: ${parts.join(', ')} added` : 'Bar settings saved — nothing new to add'
}
