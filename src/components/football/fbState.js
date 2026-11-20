/**
 * Shared state for the football pages: the API's meta (markets, Kenyan bookmaker suggestions,
 * currency, Kelly settings, the API clock) loaded once per session, and the "no access" check.
 */
import { reactive } from 'vue'
import { footballApi } from '@/services/football'

export const fb = reactive({ meta: null, loading: null, forbidden: '', error: '' })

/** 'plan' | 'role' when the API refuses the module, else ''. */
export function forbiddenReason(err) {
  const st = err?.response?.status
  const code = err?.response?.data?.error?.code || ''
  if (st === 402 || /PLAN|NOT_IN_PLAN/.test(code)) return 'plan'
  if (st === 403 && !/SUPER_ADMIN/.test(code)) return 'role'
  return ''
}

export async function loadMeta(force = false) {
  if (fb.meta && !force) return fb.meta
  if (fb.loading && !force) return fb.loading
  fb.loading = footballApi
    .meta()
    .then((m) => {
      fb.meta = m
      fb.forbidden = ''
      fb.error = ''
      return m
    })
    .catch((e) => {
      fb.forbidden = forbiddenReason(e)
      if (!fb.forbidden) fb.error = e?.response?.data?.message || 'Could not load football data'
      return null
    })
    .finally(() => {
      fb.loading = null
    })
  return fb.loading
}

/** The API's "now" (follows the test clock), advanced by the time since it was read. */
export function apiNow() {
  return fb.meta?.now ? new Date(fb.meta.now) : new Date()
}
