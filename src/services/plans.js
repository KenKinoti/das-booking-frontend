/**
 * Subscription plans API (pkg/plans on the backend).
 * Tiers: small | sme | large. Prices are stored in USD and quoted in any
 * supported currency.
 */
import api from '@/services/api'

const data = (r) => r?.data?.data ?? r?.data

export const plansAPI = {
  me: () => api.get('/plans/me').then(data),
  updateMe: (payload) => api.put('/plans/me', payload).then(data),
  catalog: (currency = 'USD') => api.get('/plans/catalog', { params: { currency } }).then(data),
  quote: (payload) => api.post('/plans/quote', payload).then(data),

  // Super admin
  adminCatalog: () => api.get('/super-admin/plans/catalog').then(data),
  adminSaveCatalog: (payload) => api.put('/super-admin/plans/catalog', payload).then(data),
  adminOrganizations: () => api.get('/super-admin/plans/organizations').then(data),
  adminOrgPlan: (id) => api.get(`/super-admin/organizations/${id}/plan`).then(data),
  adminSetOrgPlan: (id, payload) => api.put(`/super-admin/organizations/${id}/plan`, payload).then(data)
}

export const TIER_ICONS = {
  small: 'fa-solid fa-seedling',
  sme: 'fa-solid fa-store',
  large: 'fa-solid fa-building'
}

export const STATUS_LABELS = {
  trial: { label: 'Trial', badge: 'ui-badge--info' },
  active: { label: 'Active', badge: 'ui-badge--success' },
  past_due: { label: 'Past due', badge: 'ui-badge--warning' },
  cancelled: { label: 'Cancelled', badge: 'ui-badge--danger' }
}

/**
 * Format a plan price. Whole amounts drop minor units (pricing-page style);
 * otherwise the currency's own decimals are used (JPY/UGX 0, KWD 3).
 */
export function planMoney(value, code = 'USD', decimals = 2) {
  const n = Number(value) || 0
  const frac = Number.isInteger(n) ? 0 : decimals
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: code,
      minimumFractionDigits: frac,
      maximumFractionDigits: frac
    }).format(n)
  } catch {
    return `${code} ${n.toFixed(frac)}`
  }
}

export function cycleLabel(cycle) {
  return cycle === 'annual' ? 'per year' : 'per month'
}

/**
 * Same rounding as pkg/plans NiceRound: below 10 keep minor units, otherwise
 * three significant figures with no minor units.
 */
export function niceRound(v, decimals = 2) {
  const a = Math.abs(Number(v) || 0)
  if (!a) return 0
  let r
  if (a < 10) {
    const p = Math.pow(10, decimals)
    r = Math.round(a * p) / p
  } else {
    const step = Math.pow(10, Math.max(0, Math.floor(Math.log10(a)) - 2))
    r = Math.round(a / step) * step
  }
  return v < 0 ? -r : r
}
