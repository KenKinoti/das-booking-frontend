/**
 * Business type + role access for the signed-in user (GET /industry/me).
 *
 *   import { access, can, term, useTerms, ensureAccess } from '@/composables/useAccess'
 *
 * Precedence (mirrors the API, pkg/industry):
 *   plan entitlements ∩ business-type modules (∪ extras an admin enabled)
 *     → the user's role (module × action, data scope)
 *     → super admins bypass everything.
 *
 * Until /industry/me has loaded, or if it fails, everything stays allowed
 * (fail open — the API enforces it anyway) and the default words are used.
 */
import { reactive } from 'vue'
import api from '@/services/api'
import { useAuthStore } from '@/stores/auth'

export const DEFAULT_TERMS = Object.freeze({
  customer: 'Customer',
  customers: 'Customers',
  booking: 'Booking',
  bookings: 'Bookings',
  service: 'Service',
  services: 'Services',
  staff_member: 'Staff member',
  staff: 'Staff',
  inventory: 'Inventory',
  inventory_item: 'Product',
  project: 'Project',
  projects: 'Projects',
  event: 'Event',
  events: 'Events'
})

export const access = reactive({
  loaded: false,
  key: '',
  error: '',
  type: null,
  terms: { ...DEFAULT_TERMS },
  confirmed: false,
  restricted: false,
  setupStatus: '',
  setupStep: '',
  needsSetup: false,
  showBanner: false,
  hiddenPaths: [],
  extraModules: [],
  planModules: [],
  typeModules: [],
  effectiveModules: [],
  role: null,
  permissions: {},
  scope: 'all',
  isAdmin: false
})

let inflight = null

function auth() {
  try {
    return useAuthStore()
  } catch {
    return null
  }
}

function sessionKey() {
  const a = auth()
  if (!a?.token) return ''
  const u = a.user || {}
  return `${u.id || u.email || ''}:${u.organization_id || ''}:${a.token.slice(-16)}`
}

function isSuper() {
  return !!auth()?.isSuperAdmin
}

/** Apply a /industry/me payload. */
export function applyAccess(d) {
  d = d || {}
  access.type = d.type || null
  access.terms = { ...DEFAULT_TERMS, ...(d.terms || {}) }
  access.confirmed = !!d.confirmed
  access.restricted = !!d.restricted
  access.setupStatus = d.setup_status || ''
  access.setupStep = d.setup_step || ''
  access.needsSetup = !!d.needs_setup
  access.showBanner = !!d.show_banner
  access.hiddenPaths = d.hidden_paths || []
  access.extraModules = d.extra_modules || []
  access.planModules = d.plan_modules || []
  access.typeModules = d.type_modules || []
  access.effectiveModules = d.effective_modules || []
  access.role = d.role || null
  access.permissions = d.permissions || {}
  access.scope = d.scope || 'all'
  access.isAdmin = !!d.is_admin
  access.loaded = true
  access.error = ''
}

export function resetAccess() {
  inflight = null
  applyAccess({})
  access.loaded = false
  access.key = ''
}

export async function loadAccess(force = false) {
  const key = sessionKey()
  if (!key) {
    resetAccess()
    return access
  }
  if (!force && access.loaded && access.key === key) return access
  if (inflight && !force) return inflight
  const p = api
    .get('/industry/me')
    .then((res) => {
      if (sessionKey() === key) {
        applyAccess(res.data?.data)
        access.key = key
      }
      return access
    })
    .catch((e) => {
      access.key = key
      access.loaded = false
      access.error = e?.response?.data?.error?.message || 'Access could not be loaded'
      return access
    })
    .finally(() => {
      if (inflight === p) inflight = null
    })
  inflight = p
  return p
}

/** Load once per session (router guard). */
export function ensureAccess() {
  const key = sessionKey()
  if (access.key === key && (access.loaded || access.error)) return Promise.resolve(access)
  return loadAccess(true)
}

/** Is module m shown for the business type (ignores the plan and the role)? */
export function typeShows(m) {
  if (!m || m === 'core' || isSuper() || !access.loaded) return true
  return access.typeModules.includes(m)
}

/**
 * Can the user do `action` on `module`? (plan ∩ type → role; super admin bypass)
 * Pseudo modules: 'core' (dashboard, reports) and 'team' (staff & users).
 */
export function can(module, action = 'view') {
  if (isSuper()) return true
  if (!access.loaded) return true
  const key = module || 'core'
  const acts = access.permissions[key]
  if (!acts) return true // unknown key: not governed by roles
  return acts.includes(action)
}

/** Navigation entries the business type hides (e.g. the CRM pipeline for a workshop). */
export function pathHidden(path) {
  if (isSuper() || !access.loaded) return false
  return access.hiddenPaths.some((p) => path === p || path.startsWith(p + '/'))
}

/** Does the business type offer a feature (e.g. 'vehicles', 'stations')? */
export function hasFeature(f) {
  return !!(access.confirmed && access.type?.features?.includes(f))
}

/** Role base level: admin | manager | staff | read_only. */
export function baseLevel() {
  const a = auth()
  const legacy = a?.user?.role
  if (legacy === 'super_admin') return 'admin'
  if (access.loaded && access.role?.base) return access.role.base
  if (legacy === 'admin' || legacy === 'owner') return 'admin'
  if (legacy === 'manager') return 'manager'
  return 'staff'
}

const RANK = { read_only: 0, staff: 1, manager: 2, admin: 3 }
export function atLeast(base) {
  return (RANK[baseLevel()] ?? 1) >= (RANK[base] ?? 0)
}

/** Where a user lands when the dashboard is not for them. */
export function homePath() {
  if (can('core', 'view')) return '/dashboard'
  const h = access.role?.home
  if (h) return h
  for (const [m, to] of [['bookings', '/bookings'], ['pos', '/pos'], ['inventory', '/inventory'], ['projects', '/projects'], ['events', '/events'], ['crm', '/customers']]) {
    if (can(m, 'view')) return to
  }
  return '/profile'
}

/** The word for key in the organisation's business type ("bookings" → "Job cards"). */
export function term(key, fallback) {
  return access.terms[key] || fallback || DEFAULT_TERMS[key] || key
}

/** Lower-case variant for running text ("New job card"). */
export function termLower(key) {
  const t = term(key)
  // keep acronyms (e.g. "NDIS") as they are
  return t
    .split(' ')
    .map((w) => (w.length > 1 && w === w.toUpperCase() ? w : w.toLowerCase()))
    .join(' ')
}

export function useTerms() {
  return { terms: access.terms, term, termLower, access }
}

export function useAccess() {
  return { access, can, term, termLower, typeShows, pathHidden, hasFeature, homePath, atLeast, baseLevel, loadAccess, ensureAccess }
}

// Refresh when the API reports a type/role change made elsewhere.
let refreshTimer = null
api.interceptors.response.use(
  (r) => r,
  (error) => {
    const code = error?.response?.data?.error?.code
    if (error?.response?.status === 403 && (code === 'MODULE_HIDDEN_FOR_TYPE' || code === 'ROLE_FORBIDDEN')) {
      clearTimeout(refreshTimer)
      refreshTimer = setTimeout(() => loadAccess(true), 300)
    }
    return Promise.reject(error)
  }
)
