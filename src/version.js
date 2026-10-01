/**
 * Release information.
 *
 * package.json "version" is the single source of truth. Both build pipelines
 * (vite.config.js and the sandbox esbuild builder) inject it as the
 * compile-time constants __APP_VERSION__ and __BUILD_DATE__. The fallbacks keep
 * tests and unusual tooling working when the constants are not defined.
 */
/* global __APP_VERSION__, __BUILD_DATE__ */
export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '2.7.0'

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
export const RELEASE_LEAD = 'Synergy Wholesale analytics: upload your statements and hosting usage reports to see spend, run-rate, balance runway, disk usage and margin per site — with clear recommendations.'

/** Highlights shown in the "What's new" notice and the About card. */
export const RELEASE_HIGHLIGHTS = [
  { icon: 'fa-solid fa-file-csv', text: 'Drop Synergy statements and hosting usage reports (several at once) on Expenses → Synergy: the type is detected, re-uploads never duplicate, and the running balance is checked for gaps between months' },
  { icon: 'fa-solid fa-server', text: 'Per-site table: client (matched by invoices, website or email), plan, monthly cost, disk used with trend and days to full, what you bill, margin — sortable, filterable, CSV export' },
  { icon: 'fa-solid fa-lightbulb', text: 'Recommendations with the numbers: over-quota sites and the cheapest plan that fits, fast growers, unbilled sites, sites billed below cost, top up $X by date, cancellations and savings' },
  { icon: 'fa-solid fa-wallet', text: 'Spend this month / last month / year to date, monthly run-rate, balance runway and top-ups (never counted as an expense), plus an August-vs-September style comparison in plain English' },
  { icon: 'fa-solid fa-file-circle-plus', text: 'Create expenses from statements: one bill per month per category with a line per domain — on charge date or service month — counted once, never twice with Synergy receipts from Gmail' }
]
