/**
 * Release information.
 *
 * package.json "version" is the single source of truth. Both build pipelines
 * (vite.config.js and the sandbox esbuild builder) inject it as the
 * compile-time constants __APP_VERSION__ and __BUILD_DATE__. The fallbacks keep
 * tests and unusual tooling working when the constants are not defined.
 */
/* global __APP_VERSION__, __BUILD_DATE__ */
export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '2.5.0'

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
export const RELEASE_LEAD = 'Know what you spend: expenses from Synergy Wholesale, Google Workspace and any supplier flow into one inbox, count once in your P&L, and warn you before renewals and price rises. Plus Zoho Books import.'

/** Highlights shown in the "What's new" notice and the About card. */
export const RELEASE_HIGHLIGHTS = [
  { icon: 'fa-solid fa-receipt', text: 'Expenses: Synergy Wholesale (balance, domains, hosting renewals) and Gmail billing emails (Google Workspace invoices, Synergy receipts, your own senders) into a review inbox' },
  { icon: 'fa-solid fa-cloud-arrow-up', text: 'Drop invoice PDFs, CSVs or photos — amounts, GST/VAT, dates and invoice numbers are read for you, and the same invoice from email, API and upload is kept once' },
  { icon: 'fa-solid fa-chart-pie', text: 'Expenses dashboard: spend by vendor and category, recurring subscriptions, renewals due, 3-month forecast, margin per client and alerts for price rises, failed payments and low balance' },
  { icon: 'fa-solid fa-scale-balanced', text: 'Approved expenses become paid supplier bills (converted to your currency), so the profit & loss counts each one exactly once' },
  { icon: 'fa-solid fa-file-import', text: 'Zoho Books import: live connection or CSV/XLS — clients, contacts, invoices, payments and PDFs' }
]
