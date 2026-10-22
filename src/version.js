/**
 * Release information.
 *
 * package.json "version" is the single source of truth. Both build pipelines
 * (vite.config.js and the sandbox esbuild builder) inject it as the
 * compile-time constants __APP_VERSION__ and __BUILD_DATE__. The fallbacks keep
 * tests and unusual tooling working when the constants are not defined.
 */
/* global __APP_VERSION__, __BUILD_DATE__ */
export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '2.14.0'

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
export const RELEASE_LEAD = 'Your phone as a till with camera scanning, client subscriptions that warn you before a suspension, who opened each email, encrypted call links, announcements and seasonal themes.'

/** Highlights shown in the "What's new" notice and the About card. */
export const RELEASE_HIGHLIGHTS = [
  { icon: 'fa-solid fa-barcode', text: 'Fast sale on any device: scan bottles with the phone camera or a Bluetooth scanner, favourites, one-tap M-Pesa and cash with change, and who sold what on which phone' },
  { icon: 'fa-solid fa-arrows-rotate', text: 'Client subscriptions: invoices go out automatically, reminders to clients, and you hear at least 3 days before any hosting is suspended' },
  { icon: 'fa-solid fa-envelope-open-text', text: 'Know who read it: each person gets their own copy, and the Emails tab shows who opened, viewed and paid' },
  { icon: 'fa-solid fa-shield-halved', text: 'Secure calls: share a link, guests join from any phone without an account; the key stays in the link, so DASYIN itself cannot listen in' },
  { icon: 'fa-solid fa-bullhorn', text: 'Announcements from DASYIN with holiday nudges, and seasonal themes: a little spooky for Halloween, Kenyan colours on national days' },
  { icon: 'fa-solid fa-video-slash', text: 'Google sign-in that shows exactly why a button would be hidden, and the camera and microphone only ever start on your tap' }
]
