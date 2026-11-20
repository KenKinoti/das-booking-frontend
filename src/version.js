/**
 * Release information.
 *
 * package.json "version" is the single source of truth. Both build pipelines
 * (vite.config.js and the sandbox esbuild builder) inject it as the
 * compile-time constants __APP_VERSION__ and __BUILD_DATE__. The fallbacks keep
 * tests and unusual tooling working when the constants are not defined.
 */
/* global __APP_VERSION__, __BUILD_DATE__ */
export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '2.16.0'

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
export const RELEASE_LEAD = 'Football analysis for bars and clubs: fair odds from the sharp market, a transparent model, a price check for your betting app, and an honest bet tracker.'

/** Highlights shown in the "What's new" notice and the About card. */
export const RELEASE_HIGHLIGHTS = [
  { icon: 'fa-solid fa-futbol', text: 'Match centre: every day\'s games with the fair chance from the sharp market, DASYIN\'s model as a second opinion, best prices and live scores' },
  { icon: 'fa-solid fa-chart-column', text: 'Match analysis: form, home and away form, league position history, head to head, key players and absences, score probabilities, odds movement — with sources' },
  { icon: 'fa-solid fa-scale-balanced', text: 'Price check: type the odds from SportPesa, Betika or Odibets and see the expected value against the fair price, with a capped stake suggestion' },
  { icon: 'fa-solid fa-wallet', text: 'My bets: automatic settlement, P&L, ROI, closing-line value, bankroll and drawdown, with limits and breaks' },
  { icon: 'fa-solid fa-bullseye', text: 'Model track record: calibration and accuracy against the market, measured openly' }
]
