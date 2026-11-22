/**
 * Release information.
 *
 * package.json "version" is the single source of truth. Both build pipelines
 * (vite.config.js and the sandbox esbuild builder) inject it as the
 * compile-time constants __APP_VERSION__ and __BUILD_DATE__. The fallbacks keep
 * tests and unusual tooling working when the constants are not defined.
 */
/* global __APP_VERSION__, __BUILD_DATE__ */
export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '2.18.0'

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
export const RELEASE_LEAD = 'Football made simple and honest: one plain pick per match, ✓ or ✗ after full time, and a scorecard of how often the picks really come off.'

/** Highlights shown in the "What's new" notice and the About card. */
export const RELEASE_HIGHLIGHTS = [
  { icon: 'fa-solid fa-bullseye', text: 'One pick per match — e.g. "Arsenal win · 64% · Strong" — with a safer pick, a draw alert, the goals lean and how often that level of pick has won in past matches' },
  { icon: 'fa-solid fa-circle-check', text: 'After full time every match says ✓ Correct or ✗ Wrong for the pick that was frozen before kick-off — never regraded' },
  { icon: 'fa-solid fa-chart-column', text: 'New Scorecard: picks right against what their chances said, with the normal range, by level, week by week and against the bookmaker\'s favourite' },
  { icon: 'fa-solid fa-ticket', text: 'Jackpots: ✓/✗ per game, a plain review of how it went and a budget planner for doubles and triples' },
  { icon: 'fa-solid fa-database', text: 'More free sources: API-Football predictions, Polymarket crowd prices and openfootball results, plus clearer The Odds API key checks' }
]
