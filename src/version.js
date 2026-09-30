/**
 * Release information.
 *
 * package.json "version" is the single source of truth. Both build pipelines
 * (vite.config.js and the sandbox esbuild builder) inject it as the
 * compile-time constants __APP_VERSION__ and __BUILD_DATE__. The fallbacks keep
 * tests and unusual tooling working when the constants are not defined.
 */
/* global __APP_VERSION__, __BUILD_DATE__ */
export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '2.4.0'

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
export const RELEASE_LEAD = 'Invoice emails are checked before they go out: exact preview, correct amounts in every currency, exchange rates locked per document, and a professional new email design.'

/** Highlights shown in the "What's new" notice and the About card. */
export const RELEASE_HIGHLIGHTS = [
  { icon: 'fa-solid fa-list-check', text: 'Pre-send check and exact preview (email, plain text, PDF) before any invoice, quote, reminder or receipt is emailed — plus “Send test to me”' },
  { icon: 'fa-solid fa-right-left', text: 'Customers in another currency: catalog prices are converted at a live, reference or manual rate that is locked on each document' },
  { icon: 'fa-solid fa-envelope-open-text', text: 'New email design with your logo, amount due, status, line items and a full business footer; payment receipts by email' },
  { icon: 'fa-solid fa-clock-rotate-left', text: 'Every email is logged on the invoice (recipients, amounts, checks, server response) for easy troubleshooting' },
  { icon: 'fa-solid fa-mobile-screen', text: 'Installable web app, notification centre, mobile polish' }
]
