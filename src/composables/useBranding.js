/**
 * Company branding for the signed-in organisation: its name and the company
 * logo (the single logo used on invoices, quotes, receipts, emails and the
 * sidebar). Loaded after sign-in from GET /organization/branding — which
 * follows the token's organisation, so a super admin signed in as an
 * organisation sees that organisation's logo — and refreshed after an upload.
 */
import { reactive } from 'vue'
import api from '@/services/api'

const state = reactive({
  orgId: '',
  orgName: '',
  tradingName: '',
  logoUrl: '',
  hasLogo: false,
  updatedAt: null,
  width: 0,
  height: 0,
  loaded: false,
  loading: false
})

let inflight = null

/** Organisation id from the current access token ('' when signed out). */
export function tokenOrgId() {
  try {
    const token = localStorage.getItem('auth_token')
    if (!token) return ''
    const part = token.split('.')[1]
    if (!part) return ''
    const json = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')))
    return json.org_id ? String(json.org_id) : ''
  } catch {
    return ''
  }
}

function reset(orgId = '') {
  Object.assign(state, { orgId, orgName: '', tradingName: '', logoUrl: '', hasLogo: false, updatedAt: null, width: 0, height: 0, loaded: false })
}

/** Apply a branding payload (from /organization/branding or a logo upload). */
export function setBranding(d = {}, orgId = tokenOrgId()) {
  if (state.orgId !== orgId) reset(orgId)
  Object.assign(state, {
    orgId,
    orgName: d.name || state.orgName || '',
    tradingName: d.trading_name || '',
    logoUrl: d.logo_url || '',
    hasLogo: !!d.has_logo && !!d.logo_url,
    updatedAt: d.updated_at || null,
    width: d.width || 0,
    height: d.height || 0,
    loaded: true
  })
}

/** Seed from the login / current-user payload so the sidebar is right at once. */
export function seedBranding(user) {
  const org = tokenOrgId()
  if (!user || !org || String(user.organization_id || '') !== org) return
  if (state.orgId === org && state.loaded) return
  reset(org)
  state.orgName = user.organization_name || ''
  state.logoUrl = user.logo_url || ''
  state.hasLogo = !!user.logo_url
}

export function clearBranding() {
  inflight = null
  reset('')
}

/** Load branding for the token's organisation (cached per organisation). */
export async function loadBranding({ force = false } = {}) {
  const org = tokenOrgId()
  if (!org) {
    clearBranding()
    return state
  }
  if (!force && state.loaded && state.orgId === org) return state
  if (state.orgId !== org) reset(org)
  if (inflight && !force) return inflight
  state.loading = true
  const p = api
    .get('/organization/branding')
    .then((res) => {
      // Ignore a late answer for an organisation we have since left.
      if (tokenOrgId() === org) setBranding(res.data?.data || {}, org)
      return state
    })
    .catch(() => state)
    .finally(() => {
      if (inflight === p) inflight = null
      state.loading = false
    })
  inflight = p
  return p
}

export function initialsOf(name) {
  const words = String(name || '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
  if (!words.length) return '·'
  return (words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[1][0]).toUpperCase()
}

export function useBranding() {
  return {
    branding: state,
    loadBranding,
    refreshBranding: () => loadBranding({ force: true }),
    setBranding,
    seedBranding,
    clearBranding
  }
}

export default useBranding
