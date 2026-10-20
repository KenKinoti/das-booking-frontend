// Session helpers shared by the layout, access checks and onboarding.
//
// A super admin can "log in as" an organisation (Platform admin →
// Organizations). The backend then issues a token that keeps the super-admin
// role but scopes every request to that organisation and carries
// `impersonating: true`. While that token is in use the app shows the
// organisation the way its owner sees it ("owner view"): menus, plan,
// business type and words exactly as the owner gets them. A toggle in the
// "Viewing <org>" bar switches to "all menus" (every module, as a super admin)
// for support work; the choice lasts for that one impersonation.
import { reactive } from 'vue'

/** The decoded payload of an auth token (default: the current one; {} when none). */
export function tokenClaims(token) {
  try {
    const t = token === undefined ? localStorage.getItem('auth_token') : token
    if (!t) return {}
    const part = String(t).split('.')[1]
    if (!part) return {}
    return JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/'))) || {}
  } catch {
    return {}
  }
}

/** True while a super admin is signed in as another organisation. */
export function isViewingAsOrg(token) {
  const c = tokenClaims(token)
  return c.role === 'super_admin' && c.impersonating === true
}

/** True for a super admin on their own platform session (not viewing an organisation). */
export function isPlatformAdminSession(token) {
  const c = tokenClaims(token)
  return c.role === 'super_admin' && c.impersonating !== true
}

// ---------------------------------------------------------------------------
// Owner view / all menus while viewing an organisation.

export const VIEW_OWNER = 'owner'
export const VIEW_ALL = 'all'
const MODE_KEY = 'viewas.mode'

/** Identifies one impersonation (organisation + token issue time); '' when not impersonating. */
function impersonationId(claims) {
  return claims.role === 'super_admin' && claims.impersonating === true ? `${claims.org_id || ''}:${claims.iat || ''}` : ''
}

function storedMode(id) {
  if (!id) return VIEW_OWNER
  try {
    const s = JSON.parse(sessionStorage.getItem(MODE_KEY) || 'null')
    return s && s.id === id && s.mode === VIEW_ALL ? VIEW_ALL : VIEW_OWNER
  } catch {
    return VIEW_OWNER
  }
}

/**
 * Reactive owner-view state.
 *   mode    — 'owner' (default) or 'all'
 *   blocked — set by the router when owner view kept the super admin out of
 *             a page the owner cannot open: { from, label, reason, at }
 */
export const viewAs = reactive({
  id: '',
  mode: VIEW_OWNER,
  blocked: null
})

viewAs.id = impersonationId(tokenClaims())
viewAs.mode = storedMode(viewAs.id)

/** 'owner' | 'all' while viewing an organisation, '' otherwise. */
export function viewMode(token) {
  const mode = viewAs.mode // read first so computed properties track a toggle
  const id = impersonationId(tokenClaims(token))
  if (!id) return ''
  return viewAs.id === id ? mode : storedMode(id)
}

/** True while viewing an organisation in owner view (the default). */
export function isOwnerView(token) {
  return viewMode(token) === VIEW_OWNER
}

/** Switch between owner view and all menus for the current impersonation. */
export function setViewMode(mode, token) {
  viewAs.id = impersonationId(tokenClaims(token))
  viewAs.mode = mode === VIEW_ALL ? VIEW_ALL : VIEW_OWNER
  viewAs.blocked = null
  try {
    if (viewAs.id) sessionStorage.setItem(MODE_KEY, JSON.stringify({ id: viewAs.id, mode: viewAs.mode }))
    else sessionStorage.removeItem(MODE_KEY)
  } catch {
    /* storage unavailable: the choice lasts until the page reloads */
  }
}

/** Forget the owner-view choice (a new impersonation starts in owner view). */
export function clearViewMode() {
  viewAs.mode = VIEW_OWNER
  viewAs.blocked = null
  try {
    sessionStorage.removeItem(MODE_KEY)
  } catch {
    /* ignore */
  }
}
