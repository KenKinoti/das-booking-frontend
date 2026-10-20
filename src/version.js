/**
 * Release information.
 *
 * package.json "version" is the single source of truth. Both build pipelines
 * (vite.config.js and the sandbox esbuild builder) inject it as the
 * compile-time constants __APP_VERSION__ and __BUILD_DATE__. The fallbacks keep
 * tests and unusual tooling working when the constants are not defined.
 */
/* global __APP_VERSION__, __BUILD_DATE__ */
export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '2.13.0'

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
export const RELEASE_LEAD = 'Hand a tested organisation to its owner: super admins see an organisation exactly as its owner does, can reset it for handover, and every person gets getting-started steps for their own role.'

/** Highlights shown in the "What's new" notice and the About card. */
export const RELEASE_HIGHLIGHTS = [
  { icon: 'fa-solid fa-user-tie', text: 'Owner view: when a super admin logs in as an organisation, the menus, search, Create menu and plan are exactly what its owner sees — with an "All menus" switch for support work and Exit to platform' },
  { icon: 'fa-solid fa-rotate-left', text: 'Reset for handover: preview what goes, download a backup, then clear test sales, invoices, bookings and stock activity, restart numbering and send the owner back through the setup wizard' },
  { icon: 'fa-solid fa-list-check', text: 'Getting started for everyone: 3–6 steps for each person’s role and business type (owner, bar manager, bartender, store keeper, cashier, mechanic …) that tick themselves as they are done' }
]
