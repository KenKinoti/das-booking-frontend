/**
 * Release information.
 *
 * package.json "version" is the single source of truth. Both build pipelines
 * (vite.config.js and the sandbox esbuild builder) inject it as the
 * compile-time constants __APP_VERSION__ and __BUILD_DATE__. The fallbacks keep
 * tests and unusual tooling working when the constants are not defined.
 */
/* global __APP_VERSION__, __BUILD_DATE__ */
export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '2.0.0'

export const BUILD_DATE = typeof __BUILD_DATE__ !== 'undefined' ? __BUILD_DATE__ : ''

/** "v2.0.0" */
export const VERSION_LABEL = `v${APP_VERSION}`

/** "v2.0" — the release family, used for the "What's new" notice. */
export const VERSION_SHORT = `v${APP_VERSION.split('.').slice(0, 2).join('.')}`

/** Build date formatted for people, e.g. "24 Sep 2026", or '' when unknown. */
export function buildDateLabel(locale) {
  if (!BUILD_DATE) return ''
  const d = new Date(BUILD_DATE)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Highlights shown in the "What's new" notice and the About card. */
export const RELEASE_HIGHLIGHTS = [
  { icon: 'fa-solid fa-wand-magic-sparkles', text: 'A redesigned workspace with light & dark themes that works on your phone' },
  { icon: 'fa-solid fa-file-invoice-dollar', text: 'Invoicing, quotes, POS, bookings and events in one place' },
  { icon: 'fa-solid fa-coins', text: 'Multi-currency finance, suppliers, inventory and manufacturing' },
  { icon: 'fa-solid fa-chart-line', text: 'Live analytics, market insights, HR, projects and meetings' }
]
