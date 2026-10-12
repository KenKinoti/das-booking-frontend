/**
 * Shared state for the bar stock pages: settings, locations and what the
 * signed-in user may do (inventory permissions of their role).
 *
 *   import { bar, loadBar, barPerms, money } from '@/components/bar/barContext'
 */
import { reactive } from 'vue'
import { barApi } from '@/services/bar'
import { apiErrorMessage } from '@/services/api'
import { can } from '@/composables/useAccess'
import { formatMoney } from '@/utils/format'
import { orgCurrency } from '@/utils/orgDefaults'
import { DEFAULT_TOT_ML } from '@/utils/barUnits'

export const bar = reactive({
  loaded: false,
  loading: false,
  error: '',
  forbidden: false,
  settings: null,
  locations: []
})

let inflight = null

/** Load settings + locations once (force to refresh). */
export function loadBar(force = false) {
  if (bar.loaded && !force) return Promise.resolve(bar)
  if (inflight && !force) return inflight
  bar.loading = true
  const p = Promise.allSettled([barApi.settings(), barApi.locations()])
    .then(([s, l]) => {
      if (s.status === 'fulfilled') bar.settings = s.value || {}
      if (l.status === 'fulfilled') bar.locations = (l.value || []).filter((x) => x && x.is_active !== false)
      const err = s.status === 'rejected' ? s.reason : l.status === 'rejected' ? l.reason : null
      if (err) {
        const st = err?.response?.status
        bar.forbidden = st === 403 || st === 402
        bar.error = apiErrorMessage(err, 'Could not load bar stock')
      } else {
        bar.error = ''
        bar.forbidden = false
      }
      bar.loaded = s.status === 'fulfilled' || l.status === 'fulfilled'
      return bar
    })
    .finally(() => {
      bar.loading = false
      if (inflight === p) inflight = null
    })
  inflight = p
  return p
}

export function resetBar() {
  bar.loaded = false
  bar.settings = null
  bar.locations = []
  bar.error = ''
}

/** What the user can do on bar stock (module "inventory"). */
export function barPerms() {
  return {
    view: can('inventory', 'view'),
    create: can('inventory', 'create'),
    edit: can('inventory', 'edit'),
    approve: can('inventory', 'approve'),
    delete: can('inventory', 'delete'),
    pos: can('pos', 'create') || can('pos', 'view')
  }
}

export function currency() {
  return bar.settings?.currency || orgCurrency()
}

export function money(v, opts) {
  if (v === null || v === undefined || v === '') return '—'
  return formatMoney(v, currency(), opts)
}

export function orgTotMl() {
  return Number(bar.settings?.tot_ml) > 0 ? Number(bar.settings.tot_ml) : DEFAULT_TOT_ML
}

export function dayCutoff() {
  return bar.settings?.day_cutoff || '06:00'
}

export function locationName(id) {
  if (!id) return '—'
  return bar.locations.find((l) => l.id === id)?.name || 'Unknown location'
}

export function barsOnly() {
  return bar.locations.filter((l) => l.type === 'bar')
}

export function stores() {
  return bar.locations.filter((l) => l.type === 'store')
}

export function mainStoreId() {
  return bar.settings?.main_store_id || bar.locations.find((l) => l.is_main_store)?.id || stores()[0]?.id || ''
}

export function defaultBarId() {
  return bar.settings?.default_bar_id || barsOnly()[0]?.id || ''
}

/** A money field is present (the server strips it for users without approve). */
export function has(v) {
  return v !== null && v !== undefined && v !== ''
}

const POS_LOC_KEY = 'bar.pos.location.v1'
/** The bar this device sells from (POS "Selling from"), per device. */
export function devicePosLocation() {
  try {
    return localStorage.getItem(POS_LOC_KEY) || ''
  } catch {
    return ''
  }
}
export function setDevicePosLocation(id) {
  try {
    if (id) localStorage.setItem(POS_LOC_KEY, id)
    else localStorage.removeItem(POS_LOC_KEY)
  } catch {
    /* per-device convenience only */
  }
}

const HOME_LOC_KEY = 'bar.my.location.v1'
/** The location a bartender works at on this device (counts, requests). */
export function myLocation() {
  try {
    return localStorage.getItem(HOME_LOC_KEY) || ''
  } catch {
    return ''
  }
}
export function setMyLocation(id) {
  try {
    if (id) localStorage.setItem(HOME_LOC_KEY, id)
  } catch {
    /* ignore */
  }
}

/** First defined value among dotted paths: pick(o, 'kpis.sales', 'sales'). */
export function pick(o, ...paths) {
  for (const p of paths) {
    const v = String(p)
      .split('.')
      .reduce((x, k) => (x === null || x === undefined ? undefined : x[k]), o)
    if (v !== undefined && v !== null) return v
  }
  return undefined
}

/** Count from a number, an array or an object of numbers. */
export function countOf(v) {
  if (Array.isArray(v)) return v.length
  if (v && typeof v === 'object') return Object.values(v).reduce((s, x) => s + (Number(typeof x === 'object' ? countOf(x) : x) || 0), 0)
  return Number(v) || 0
}

/** Money without minor units for KPIs ("KES 86,960"). */
export function moneyWhole(v) {
  const n = Math.round(Number(v) || 0)
  const cur = currency()
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: cur, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)
  } catch {
    return `${cur} ${n.toLocaleString()}`
  }
}
