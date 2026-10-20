/**
 * Release information.
 *
 * package.json "version" is the single source of truth. Both build pipelines
 * (vite.config.js and the sandbox esbuild builder) inject it as the
 * compile-time constants __APP_VERSION__ and __BUILD_DATE__. The fallbacks keep
 * tests and unusual tooling working when the constants are not defined.
 */
/* global __APP_VERSION__, __BUILD_DATE__ */
export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '2.12.0'

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
export const RELEASE_LEAD = 'Who gets emails: owners decide who receives booking emails, the daily agenda, bill reminders, the bar night report and the strategy brief — everyone involved, owners and managers, or only owners — and can switch any person off.'

/** Highlights shown in the "What's new" notice and the About card. */
export const RELEASE_HIGHLIGHTS = [
  { icon: 'fa-solid fa-envelope-circle-check', text: 'Settings → Who gets emails: one place for every internal email, with three modes — Everyone involved (the default), Owners and managers, or Only owners (staff get no emails)' },
  { icon: 'fa-solid fa-user-slash', text: 'Switch emails off for one person — all of them or one kind — or on as an exception to the mode, and preview the exact addresses the next email of each kind goes to' },
  { icon: 'fa-solid fa-martini-glass-citrus', text: 'Nightclubs, bars and lounges start with “Only owners”: the owner gets the important emails, bartenders and other staff get none' },
  { icon: 'fa-regular fa-bell', text: 'My profile → Email notifications: everyone can turn their own emails off; anything an admin turned off shows “Turned off by your administrator”' }
]
