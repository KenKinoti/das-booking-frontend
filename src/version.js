/**
 * Release information.
 *
 * package.json "version" is the single source of truth. Both build pipelines
 * (vite.config.js and the sandbox esbuild builder) inject it as the
 * compile-time constants __APP_VERSION__ and __BUILD_DATE__. The fallbacks keep
 * tests and unusual tooling working when the constants are not defined.
 */
/* global __APP_VERSION__, __BUILD_DATE__ */
export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '2.19.1'

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
export const RELEASE_LEAD = 'Pending review: no email, SMS or WhatsApp reaches a client until you have checked it — fix it, approve it or reject it in one place.'

/** Highlights shown in the "What's new" notice and the About card. */
export const RELEASE_HIGHLIGHTS = [
  { icon: 'fa-solid fa-inbox', text: 'Communication → Pending review: every client message waits — invoices, quotes, reminders, receipts, scheduled messages, subscription notices, meeting invitations and WhatsApp replies' },
  { icon: 'fa-solid fa-pen-to-square', text: 'See exactly what the client will get, fix the recipients, subject or text, then send now, send at its planned time, or reject — one at a time or in bulk' },
  { icon: 'fa-solid fa-envelope-open-text', text: 'An email to you about 15 minutes after messages start waiting (at most one an hour) and a summary every morning at 7:30' },
  { icon: 'fa-solid fa-shield-halved', text: 'Checked again before sending: a reminder for an invoice that has since been paid is dropped, and no subscription is suspended while its final notice waits' },
  { icon: 'fa-solid fa-building', text: 'Bill a company: company name with "Attn:" contact on invoices and quotes, and recall notices now copy whoever was BCC\'d on the original' }
]
