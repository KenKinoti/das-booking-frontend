/**
 * Release information.
 *
 * package.json "version" is the single source of truth. Both build pipelines
 * (vite.config.js and the sandbox esbuild builder) inject it as the
 * compile-time constants __APP_VERSION__ and __BUILD_DATE__. The fallbacks keep
 * tests and unusual tooling working when the constants are not defined.
 */
/* global __APP_VERSION__, __BUILD_DATE__ */
export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '2.11.0'

export const BUILD_DATE = typeof __BUILD_DATE__ !== 'undefined' ? __BUILD_DATE__ : ''

/** e.g. "v2.2.0" */
export const VERSION_LABEL = `v${APP_VERSION}`

/** e.g. "v2.2" — the release family, used for the "What's new" notice. */
export const VERSION_SHORT = `v${APP_VERSION.split('.').slice(0, 2).join('.')}`

/** Build date formatted for people, e.g. "24 Sep 2026", or '' when unknown. */
export function buildDateLabel(locale) {
  if (!BUILD_DATE) return ''
  const d = new Date(BUILD_DATE)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
}

/** One-line summary of this release for the "What's new" notice. */
export const RELEASE_LEAD = 'Bar stock for nightclubs, bars and lounges: bottles and tots sold through the POS, a store and bars with transfers, stock counts on a phone with variance, wastage and comps with approvals, and reorders into purchase orders.'

/** Highlights shown in the "What's new" notice and the About card. */
export const RELEASE_HIGHLIGHTS = [
  { icon: 'fa-solid fa-martini-glass-citrus', text: 'New business type “Nightclub / bar / lounge”: Guests, Table reservations and a Drinks menu, ready-made roles (bar manager, store keeper, bartender, cashier / waiter, host / door) and a bar setup step with a starter list of common drinks' },
  { icon: 'fa-solid fa-whiskey-glass', text: 'Tots, bottles and cocktails: menu items with recipes in ml, tots or bottles, their cost, pour cost % and margin; the POS sells from the bar you pick on each till, shows what the bar can still pour and never blocks a drink' },
  { icon: 'fa-solid fa-clipboard-check', text: 'Stock counts made for a phone behind the bar: full bottles plus tenths, ml or a scale weight, blind counts, barcode scanning and drafts that survive a dropped connection; variance per item, category, location and shift' },
  { icon: 'fa-solid fa-right-left', text: 'Store → bar transfers: the bar requests, the store keeper issues, the bar confirms what arrived (differences recorded) — or “Top up to par” in one tap' },
  { icon: 'fa-solid fa-wine-glass-empty', text: 'Wastage, comps and staff drinks: breakages and spills leave stock at once; comps over the per-shift allowance wait for a manager' },
  { icon: 'fa-solid fa-cart-flatbed', text: 'Purchasing: reorder suggestions rounded up to whole cases per supplier become draft purchase orders; deliveries update the weighted average cost and price history; optional night report email' }
]
