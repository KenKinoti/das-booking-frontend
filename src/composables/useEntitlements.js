/**
 * Plan entitlements for the signed-in organisation.
 *
 *   import { hasModule, ensureEntitlements, entitlements } from '@/composables/useEntitlements'
 *
 * Loaded from GET /plans/me after sign-in (the router guard calls
 * ensureEntitlements). Super admins see everything. Until the plan is known,
 * or if it cannot be loaded, everything stays visible (fail open — the API
 * enforces the plan anyway).
 */
import { reactive } from 'vue'
import api from '@/services/api'
import { plansAPI } from '@/services/plans'
import { useAuthStore } from '@/stores/auth'

export const entitlements = reactive({
  loaded: false,
  loading: false,
  key: '',
  modules: [],
  plan: null,
  error: ''
})

let inflight = null

function sessionKey() {
  try {
    const auth = useAuthStore()
    const u = auth.user || {}
    return auth.token ? `${u.id || u.email || ''}:${u.organization_id || ''}` : ''
  } catch {
    return ''
  }
}

function isSuperAdmin() {
  try {
    return useAuthStore().isSuperAdmin
  } catch {
    return false
  }
}

/** Apply a /plans/me payload (also used after a plan change). */
export function applyPlan(plan) {
  entitlements.plan = plan || null
  entitlements.modules = Array.isArray(plan?.entitlements) ? plan.entitlements : []
  entitlements.loaded = !!plan
  entitlements.error = ''
}

export async function loadEntitlements(force = false) {
  const key = sessionKey()
  if (!key) {
    resetEntitlements()
    return entitlements
  }
  if (!force && entitlements.loaded && entitlements.key === key) return entitlements
  if (inflight) return inflight
  entitlements.loading = true
  inflight = plansAPI
    .me()
    .then((plan) => {
      entitlements.key = key
      applyPlan(plan)
      return entitlements
    })
    .catch((e) => {
      // Fail open: keep the app usable if plans cannot be read.
      entitlements.key = key
      entitlements.loaded = false
      entitlements.plan = null
      entitlements.modules = []
      entitlements.error = e?.response?.data?.error?.message || 'Plan could not be loaded'
      return entitlements
    })
    .finally(() => {
      entitlements.loading = false
      inflight = null
    })
  return inflight
}

/** Load once per session (router guard). */
export function ensureEntitlements() {
  const key = sessionKey()
  if (entitlements.loaded && entitlements.key === key) return Promise.resolve(entitlements)
  if (!entitlements.loaded && entitlements.key === key && entitlements.error) return Promise.resolve(entitlements)
  return loadEntitlements(true)
}

export function resetEntitlements() {
  entitlements.loaded = false
  entitlements.key = ''
  entitlements.modules = []
  entitlements.plan = null
  entitlements.error = ''
}

/** Items without a module (or core) are always available. */
export function hasModule(key) {
  if (!key || key === 'core') return true
  if (isSuperAdmin()) return true
  if (!entitlements.loaded) return true
  return entitlements.modules.includes(key)
}

export function useEntitlements() {
  return { entitlements, hasModule, loadEntitlements, ensureEntitlements, applyPlan }
}

// If the API says a module is not in the plan (e.g. a super admin changed it),
// refresh so navigation catches up.
let refreshTimer = null
api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error?.response?.status === 402 && error.response.data?.error?.code === 'MODULE_NOT_IN_PLAN') {
      clearTimeout(refreshTimer)
      refreshTimer = setTimeout(() => loadEntitlements(true), 300)
    }
    return Promise.reject(error)
  }
)
