/**
 * Release information.
 *
 * package.json "version" is the single source of truth. Both build pipelines
 * (vite.config.js and the sandbox esbuild builder) inject it as the
 * compile-time constants __APP_VERSION__ and __BUILD_DATE__. The fallbacks keep
 * tests and unusual tooling working when the constants are not defined.
 */
/* global __APP_VERSION__, __BUILD_DATE__ */
export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '2.9.0'

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
export const RELEASE_LEAD = 'Synergy costs now count in your P&L automatically — as service charges or as top-ups from your bank — with every amount shown per month in AUD and your own currency at the right rate.'

/** Highlights shown in the "What's new" notice and the About card. */
export const RELEASE_HIGHLIGHTS = [
  { icon: 'fa-solid fa-server', text: 'Synergy expenses are created and approved automatically from your statements (upload or Gmail): choose service charges or top-ups from your bank — never both — with a reconciliation of top-ups, charges and balance' },
  { icon: 'fa-solid fa-money-bill-transfer', text: 'Clear amounts everywhere: “A$4.25 / month ≈ KES 363 / month” with the rate, its source and date; each month converted at its own rate, Australian GST handled for non-Australian businesses' },
  { icon: 'fa-solid fa-wand-magic-sparkles', text: 'Less manual work: Google Workspace invoices approved automatically within ±20% of last month, Synergy statement emails imported for you, and a “How automatic is this?” panel per source' },
  { icon: 'fa-regular fa-envelope', text: 'Invoice email status: “Emailed 2 Oct 14:05 to … (+2 CC)”, failed sends with a Retry, and a timeline of every invoice, reminder and receipt email with when the client viewed it' },
  { icon: 'fa-solid fa-earth-africa', text: 'Tax and time zone follow your country (Kenya → VAT 16%, Africa/Nairobi …) with a one-click fix when they don’t match' },
  { icon: 'fa-solid fa-chart-line', text: 'Dashboard analytics with imported summaries and a Business opportunities view; business type (e.g. mechanic, salon) drives setup, menus and role templates' }
]
