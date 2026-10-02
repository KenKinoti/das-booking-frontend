/**
 * Release information.
 *
 * package.json "version" is the single source of truth. Both build pipelines
 * (vite.config.js and the sandbox esbuild builder) inject it as the
 * compile-time constants __APP_VERSION__ and __BUILD_DATE__. The fallbacks keep
 * tests and unusual tooling working when the constants are not defined.
 */
/* global __APP_VERSION__, __BUILD_DATE__ */
export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '2.10.0'

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
export const RELEASE_LEAD = 'Insights now keeps you up to date with your industry, shows your export and exchange-rate position, and turns both into a monthly strategy brief with ranked actions.'

/** Highlights shown in the "What's new" notice and the About card. */
export const RELEASE_HIGHLIGHTS = [
  { icon: 'fa-solid fa-rss', text: 'Industry watch: headlines from the news feeds you follow (tech press, regulators, vendors, trade bodies), stored with history, tagged and scored against your business with keyword rules you can edit — and the top three on your dashboard' },
  { icon: 'fa-solid fa-plane-departure', text: 'Trade & exports: domestic vs export revenue by client country and currency, open foreign invoices at today’s rate (unrealised gain or loss), realised FX on paid invoices and your natural hedge — “AUD in vs AUD out”' },
  { icon: 'fa-solid fa-earth-africa', text: 'Target markets: World Bank indicators, currency stability and what you already earn in each country, combined into an opportunity score whose weights you can change' },
  { icon: 'fa-solid fa-chess-knight', text: 'Strategy brief: a stored monthly brief — performance, what changed, export & FX position, market signals, industry headlines, risks and recommended actions with estimates; optional AI version, email to admins and a print view' },
  { icon: 'fa-solid fa-key', text: 'AI assistant key can be saved in System settings (no server restart); clearer explanation of Claude-via-MCP vs the in-app assistant' },
  { icon: 'fa-solid fa-tags', text: 'Supplier price book: compare domain + hosting combos across suppliers in your currency, with margin and retail price suggestions' }
]
