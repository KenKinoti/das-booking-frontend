/**
 * Organisation regional preferences — where the business is based, its home
 * currency and time zone. One source for every module's default currency
 * (the backend equivalent is pkg/orgprefs). Changing the currency changes the
 * default for NEW records; existing records keep their own currency.
 */
import api from '@/services/api'
import { tokenOrgId } from '@/composables/useBranding'
import { orgDefaults, orgCurrency, orgCountry, applyOrgDefaults, resetOrgDefaults } from '@/utils/orgDefaults'

let inflight = null

/** Load the token organisation's preferences (cached per organisation). */
export async function loadOrgPrefs({ force = false } = {}) {
  const org = tokenOrgId()
  if (!org) {
    inflight = null
    resetOrgDefaults('')
    return orgDefaults
  }
  if (!force && orgDefaults.loaded && orgDefaults.orgId === org) return orgDefaults
  if (orgDefaults.orgId !== org) resetOrgDefaults(org)
  if (inflight && !force) return inflight
  const p = api
    .get('/org/prefs')
    .then((res) => {
      if (tokenOrgId() === org) applyOrgDefaults(res.data?.data || {}, org)
      return orgDefaults
    })
    .catch(() => orgDefaults)
    .finally(() => {
      if (inflight === p) inflight = null
    })
  inflight = p
  return p
}

/** Save country / currency / time zone for the organisation (admins). */
export async function saveOrgPrefs(body) {
  const res = await api.put('/org/prefs', body)
  applyOrgDefaults(res.data?.data || {}, tokenOrgId())
  return orgDefaults
}

/** Apply prefs returned by another endpoint (e.g. after saving settings). */
export function refreshOrgPrefs() {
  return loadOrgPrefs({ force: true })
}

export function clearOrgPrefs() {
  inflight = null
  resetOrgDefaults('')
}

export function useOrgPrefs() {
  return { prefs: orgDefaults, orgCurrency, orgCountry, loadOrgPrefs, saveOrgPrefs, refreshOrgPrefs, clearOrgPrefs }
}

export { orgCurrency, orgCountry, orgDefaults }
export default useOrgPrefs
