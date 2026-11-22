/**
 * Scorecard helpers (v2.18, FOOTBALL_WINRATE_SPEC §C): one tolerant view model for GET /football/scorecard so the page,
 * the match-centre banner and the tests read the same numbers.
 */
import { TIER_ORDER, TIERS, HISTORY, normResult } from '../verdict/verdict'

const n = (v) => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v))
const rate = (c, g) => (g ? c / g : null)

export const PERIODS = [
  { key: 'weekend', label: 'Last weekend' },
  { key: '7d', label: '7 days' },
  { key: '30d', label: '30 days' },
  { key: 'season', label: 'Season' },
  { key: 'custom', label: 'Custom' }
]

function part(x) {
  if (!x) return null
  const graded = n(x.graded) ?? 0
  const correct = n(x.correct) ?? 0
  return {
    ...x,
    graded,
    correct,
    hit_rate: n(x.hit_rate) ?? rate(correct, graded),
    expected: n(x.expected),
    expected_low: n(x.expected_low ?? x.low),
    expected_high: n(x.expected_high ?? x.high)
  }
}

export function normScorecard(d) {
  if (!d) return null
  const t = part(d.totals || {})
  const byTier = TIER_ORDER.map((k) => {
    const r = (d.by_tier || []).find((x) => (x.tier?.key || x.tier || x.key) === k) || {}
    const graded = n(r.graded) ?? 0
    const correct = n(r.correct) ?? 0
    return {
      key: k,
      label: TIERS[k].label,
      range: TIERS[k].range,
      graded,
      correct,
      hit_rate: n(r.hit_rate) ?? rate(correct, graded),
      expected_rate: n(r.expected_rate),
      history_hit_rate: n(r.history_hit_rate) ?? HISTORY[k].hit,
      own_hit_rate: n(r.own_hit_rate)
    }
  })
  const fav = d.favourite_baseline || d.totals?.favourite_baseline || null
  return {
    ...d,
    period: d.period || {},
    totals: t,
    verdictText: d.verdict_text || d.totals?.verdict_text || '',
    safer: part(d.safer || d.totals?.safer),
    goals: part(d.goals || d.totals?.goals),
    btts: part(d.btts || d.totals?.btts),
    scores: part(d.scores || d.exact_scores || d.totals?.scores || d.totals?.exact_scores),
    favourite: fav
      ? {
          ...fav,
          graded: n(fav.graded),
          correct: n(fav.correct),
          hit_rate: n(fav.hit_rate),
          agreement_rate: n(fav.agreement_rate ?? d.agreement_rate),
          agreement: n(fav.agreement)
        }
      : null,
    byTier,
    byCompetition: (d.by_competition || []).map((c) => {
      const graded = n(c.graded) ?? 0
      const er = n(c.expected_rate)
      return {
        ...c,
        graded,
        correct: n(c.correct) ?? 0,
        hit_rate: n(c.hit_rate) ?? rate(n(c.correct) ?? 0, graded),
        expected_rate: er,
        expected: n(c.expected) ?? (er != null ? er * graded : null)
      }
    }),
    weekly: (d.weekly || []).map((w) => ({ ...w, graded: n(w.graded) ?? 0, correct: n(w.correct) ?? 0, expected: n(w.expected), low: n(w.low), high: n(w.high) })),
    rows: (d.rows || []).map((r) => ({
      ...r,
      p: n(r.p),
      result: normResult(r.result_check || (r.status ? { status: r.status, summary: r.summary && r.summary !== '…' ? r.summary : '' } : null))
    })),
    jackpots: (d.jackpots || []).map((j) => ({ ...j, correct: n(j.correct), of: n(j.of), expected: n(j.expected), low: n(j.low), high: n(j.high) }))
  }
}

/** "Fri 20 – Mon 23 Nov" from period.from / period.to (dates or RFC3339), in the organisation's zone. */
export function periodText(p, tz = 'Africa/Nairobi') {
  if (!p || !p.from) return p?.label || ''
  const d = (s) => (String(s).length === 10 ? new Date(s + 'T12:00:00Z') : new Date(s))
  const zone = String(p.from).length === 10 ? 'UTC' : tz
  const f = new Intl.DateTimeFormat(undefined, { timeZone: zone, weekday: 'short', day: 'numeric', month: 'short' })
  const a = d(p.from)
  const b = p.to ? d(p.to) : null
  return b ? `${f.format(a)} – ${f.format(b)}` : f.format(a)
}

/** The match-centre banner for the last graded weekend, from GET /football/fixtures → last_weekend
 *  ({ from, to, label, graded, correct, expected, low, high, verdict_text }); null when nothing was graded. */
export function weekendBanner(w) {
  if (!w || !n(w.graded)) return null
  const exp = n(w.expected)
  const range = n(w.low) != null && n(w.high) != null ? ` (normal range ${w.low}–${w.high})` : ''
  return {
    title: `Last weekend${w.label ? ' · ' + w.label : ''}`,
    line: w.verdict_text || `${w.correct} of ${w.graded} picks right${exp != null ? `; their own chances said about ${Math.round(exp)}${range}` : ''}.`,
    graded: n(w.graded),
    correct: n(w.correct)
  }
}
