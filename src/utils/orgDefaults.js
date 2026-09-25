/**
 * The signed-in organisation's regional defaults (country, home currency,
 * time zone) as plain reactive state with no API dependency, so low-level
 * helpers such as formatMoney() can use the organisation's currency as their
 * default. Loaded by composables/useOrgPrefs.js (GET /org/prefs) — the
 * backend's single source is pkg/orgprefs.
 */
import { reactive } from 'vue'

export const FALLBACK_CURRENCY = 'AUD'

export const orgDefaults = reactive({
  orgId: '',
  countryCode: '',
  countryName: '',
  currency: '',
  decimals: 2,
  timezone: '',
  source: '',
  needsSetup: false,
  canEdit: false,
  loaded: false
})

/** The organisation's home currency (ISO 4217), 'AUD' until loaded. */
export function orgCurrency() {
  return orgDefaults.currency || FALLBACK_CURRENCY
}

/** The organisation's country code ('' when unknown). */
export function orgCountry() {
  return orgDefaults.countryCode || ''
}

export function applyOrgDefaults(d = {}, orgId = orgDefaults.orgId) {
  Object.assign(orgDefaults, {
    orgId,
    countryCode: d.country_code || '',
    countryName: d.country_name || '',
    currency: d.currency || '',
    decimals: d.currency_decimals ?? 2,
    timezone: d.timezone || '',
    source: d.source || '',
    needsSetup: !!d.needs_setup,
    canEdit: !!d.can_edit,
    loaded: true
  })
}

export function resetOrgDefaults(orgId = '') {
  Object.assign(orgDefaults, { orgId, countryCode: '', countryName: '', currency: '', decimals: 2, timezone: '', source: '', needsSetup: false, canEdit: false, loaded: false })
}
