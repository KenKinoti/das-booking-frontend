/**
 * Release information.
 *
 * package.json "version" is the single source of truth. Both build pipelines
 * (vite.config.js and the sandbox esbuild builder) inject it as the
 * compile-time constants __APP_VERSION__ and __BUILD_DATE__. The fallbacks keep
 * tests and unusual tooling working when the constants are not defined.
 */
/* global __APP_VERSION__, __BUILD_DATE__ */
export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '2.8.0'

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
export const RELEASE_LEAD = 'Recurring bills with reminder emails that keep hosting, domains and subscriptions paid — and staff now get an email with a calendar invite for every booking assigned to them.'

/** Highlights shown in the "What's new" notice and the About card. */
export const RELEASE_HIGHLIGHTS = [
  { icon: 'fa-solid fa-repeat', text: 'Recurring bills in Finance → Bills: weekly, monthly, quarterly, yearly or every N months, with an end date or count — the next bill is created as a draft or approved, in any currency, never twice for the same period' },
  { icon: 'fa-regular fa-calendar-days', text: 'Upcoming bills: the next 90 days with a calendar strip and totals per month — mark paid, skip one, or snooze its reminders' },
  { icon: 'fa-regular fa-bell', text: 'Bill reminder emails to admins 7 and 1 days before, on the due date and while overdue, plus a Monday digest with Synergy balance warnings (Settings → Bill reminders)' },
  { icon: 'fa-solid fa-link', text: 'Turn a subscription detected in Expenses into a recurring bill — reminders without counting the cost twice' },
  { icon: 'fa-regular fa-envelope', text: 'Staff booking emails with an .ics invite: assigned, rescheduled, reassigned, cancelled and no-show, plus an optional 7am agenda (switch off in My profile)' },
  { icon: 'fa-solid fa-right-to-bracket', text: 'Sign in with Google or Microsoft (replaces the quick sign-in buttons); Zoho item prices imported in the right currency' }
]
