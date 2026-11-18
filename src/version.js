/**
 * Release information.
 *
 * package.json "version" is the single source of truth. Both build pipelines
 * (vite.config.js and the sandbox esbuild builder) inject it as the
 * compile-time constants __APP_VERSION__ and __BUILD_DATE__. The fallbacks keep
 * tests and unusual tooling working when the constants are not defined.
 */
/* global __APP_VERSION__, __BUILD_DATE__ */
export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '2.15.0'

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
export const RELEASE_LEAD = 'A morning brief at 8:00 by email and WhatsApp, schedule any message, an AI market scout that hunts for opportunities, and Undo and Recall for invoice emails.'

/** Highlights shown in the "What's new" notice and the About card. */
export const RELEASE_HIGHLIGHTS = [
  { icon: 'fa-solid fa-mug-hot', text: 'Morning brief: bills (incl. Synergy), money in, Jira progress and opportunities in one short note at 8:00 your time, by email and WhatsApp' },
  { icon: 'fa-solid fa-clock', text: 'Schedule send: invoices, quotes, receipts, reminders, customer and team messages by email, SMS or WhatsApp — once or on repeat' },
  { icon: 'fa-solid fa-binoculars', text: 'Market scout (Insights): tenders, grants, leads and new markets found on the web, ranked by fit, with sources and a monthly budget' },
  { icon: 'fa-solid fa-rotate-left', text: 'Undo send (2 minutes) and Recall for invoice emails: switch off their links and send a "please disregard" notice' },
  { icon: 'fa-brands fa-whatsapp', text: 'WhatsApp Business connected: approved templates, delivery and read status, and SMS through Africa\'s Talking or Twilio' },
  { icon: 'fa-solid fa-scale-balanced', text: 'Tax rates follow your country (Kenya: VAT 16%) with a one-click fix for older settings, bookings keep the business\'s time, and phone pages no longer cut off' }
]
