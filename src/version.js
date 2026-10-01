/**
 * Release information.
 *
 * package.json "version" is the single source of truth. Both build pipelines
 * (vite.config.js and the sandbox esbuild builder) inject it as the
 * compile-time constants __APP_VERSION__ and __BUILD_DATE__. The fallbacks keep
 * tests and unusual tooling working when the constants are not defined.
 */
/* global __APP_VERSION__, __BUILD_DATE__ */
export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '2.6.0'

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
export const RELEASE_LEAD = 'Payments the way they really happen: record any amount, correct a payment after saving it, and every payment gets a numbered receipt the client receives by email.'

/** Highlights shown in the "What's new" notice and the About card. */
export const RELEASE_HIGHLIGHTS = [
  { icon: 'fa-solid fa-hand-holding-dollar', text: 'Record payment: any amount (part payments welcome), date, method incl. M-Pesa and Flutterwave, reference and notes — overpayments are blocked with a clear message' },
  { icon: 'fa-regular fa-pen-to-square', text: 'Edit saved payments and deposits (also from the invoice editor): balance and paid / partial status update, and the change is logged with who, when and why' },
  { icon: 'fa-solid fa-receipt', text: 'Numbered receipts (RCT-0001…) with your logo, the amount in words, paid to date and balance — marked “Revised” after an edit and “Cancelled” if the payment is removed' },
  { icon: 'fa-regular fa-envelope', text: 'Email receipts to clients when recording or editing a payment, or with Send receipt — PDF attached, preview and checks first, your own receipt template' },
  { icon: 'fa-solid fa-credit-card', text: 'Online (Flutterwave) payments email the receipt automatically; Ask DASYIN can edit payments and send receipts' }
]
