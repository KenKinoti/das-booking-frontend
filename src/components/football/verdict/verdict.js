/**
 * v2.18 "simple picks, honest win rate" — UI helpers for the verdict (one plain pick per match), the ✓/✗ result check
 * after full time, and the accumulator ("combo") maths. FOOTBALL_WINRATE_SPEC.md §A–C.
 *
 * Tiers come from the consensus top probability: strong ≥ 60%, good 50–60%, close 42–50%, coin-flip < 42%.
 * Their colours are an ordinal ramp of the brand violet (validated with the dataviz validator, --ordinal, against the
 * light #ffffff and dark #121521 surfaces); the tier is ALWAYS also shown as a word and as 1–4 filled pips, so colour is
 * never the only cue. Results are status colours with an icon and a word (✓ Correct / ✗ Wrong).
 */
import { pct } from '../fb'

export const TIERS = {
  strong: { key: 'strong', label: 'Strong', pips: 4, min: 0.6, color: 'var(--fb-tier-strong)', range: '60% or more' },
  good: { key: 'good', label: 'Good', pips: 3, min: 0.5, color: 'var(--fb-tier-good)', range: '50–60%' },
  close: { key: 'close', label: 'Close call', pips: 2, min: 0.42, color: 'var(--fb-tier-close)', range: '42–50%' },
  coinflip: { key: 'coinflip', label: 'Coin-flip', pips: 1, min: 0, color: 'var(--fb-tier-coinflip)', range: 'under 42%' }
}
export const TIER_ORDER = ['strong', 'good', 'close', 'coinflip']

/** The open history figures (spec, Club Football Match Data 2019/20–2026, 76,528 matches) — shown only when the API
 *  doesn't send its own (it normally does: verdict.tier.history / scorecard by_tier[].history_hit_rate). */
export const HISTORY = {
  source: 'Club Football Match Data 2019/20–2026 (76,528 matches)',
  strong: { share: 0.166, hit: 0.718, dc: 0.896 },
  good: { share: 0.22, hit: 0.561, dc: 0.807 },
  close: { share: 0.299, hit: 0.461, dc: 0.752 },
  coinflip: { share: 0.314, hit: 0.385, dc: 0.71 },
  overall: 0.502
}

const num = (v) => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v))

export function tierKeyOf(p) {
  const v = num(p)
  if (v == null) return null
  return v >= 0.6 ? 'strong' : v >= 0.5 ? 'good' : v >= 0.42 ? 'close' : 'coinflip'
}

/** Any verdict payload → one tolerant shape (or null when there is no pick). */
export function normVerdict(v) {
  if (!v || !v.pick) return null
  const p = num(v.p)
  const t = v.tier || {}
  const key = TIERS[t.key] ? t.key : tierKeyOf(p) || 'coinflip'
  const hist = t.history || null
  const own = t.own && num(t.own.hit_rate) != null && (num(t.own.n) ?? 0) >= 30 ? { hit_rate: num(t.own.hit_rate), n: num(t.own.n) } : null
  const safer = v.safer && v.safer.selection ? { ...v.safer, p: num(v.safer.p), history_hit_rate: num(v.safer.history_hit_rate) } : null
  return {
    ...v,
    pick: String(v.pick).toUpperCase(),
    p,
    tier: {
      ...TIERS[key],
      ...t,
      key,
      label: t.label || TIERS[key].label,
      history: hist ? { ...hist, hit_rate: num(hist.hit_rate), n: num(hist.n) } : { hit_rate: HISTORY[key].hit, n: null, source: HISTORY.source },
      own,
      note: t.note || ''
    },
    safer,
    draw_alert: v.draw_alert && v.draw_alert.on ? v.draw_alert : null,
    goals: v.goals && v.goals.pick ? { ...v.goals, p: num(v.goals.p), line: num(v.goals.line) ?? 2.5 } : null,
    btts: v.btts && v.btts.pick ? { ...v.btts, p: num(v.btts.p) } : null,
    top_scores: (v.top_scores || []).slice(0, 3).map((s) => ({ ...s, p: num(s.p) })),
    score_note: v.score_note || 'Exact scores land about 1 time in 9',
    consensus: v.consensus || null
  }
}

/** A finished match whose row carries only the result check: the graded pick as a verdict (pick, chance, tier). */
export function verdictFromResult(rc) {
  if (!rc || !rc.pick || !rc.pick.selection) return null
  return normVerdict({
    pick: rc.pick.selection,
    pick_label: rc.pick.label || rc.pick.selection,
    p: rc.pick.p,
    tier: { key: rc.tier || tierKeyOf(rc.pick.p) },
    safer: rc.safer && rc.safer.selection ? { selection: rc.safer.selection, label: rc.safer.label, p: rc.safer.p } : null,
    kind: 'frozen'
  })
}

/** "Arsenal win · 64% · Strong" */
export function verdictText(v) {
  if (!v) return ''
  return `${v.pick_label} · ${pct(v.p, 0)} · ${v.tier.label}`
}

/** "Over 2.5 goals (58%)" */
export function goalsText(g) {
  if (!g) return ''
  return `${g.pick === 'over' ? 'Over' : 'Under'} ${g.line} goals`
}
export function bttsText(b) {
  if (!b) return ''
  return b.pick === 'yes' ? 'Both teams score' : 'Not both teams score'
}

// ------------------------------------------------------------------ consensus sources ("How we got 64%")
/** A swatch per consensus source, always beside its name (text never wears it). Only the module's validated trio is
 *  coloured — sharp market aqua, ClubElo yellow, DASYIN model violet (all-pairs CVD-checked in football.css); the
 *  all-bookmaker median is a hollow aqua ring (same family as the sharp price, not sharp), Polymarket a filled ink dot and
 *  API-Football's prediction a hollow ink ring. More colours would not stay distinguishable (dataviz series cap). */
export const CONSENSUS_STYLE = {
  sharp: { color: 'var(--fb-market)', ring: false },
  market: { color: 'var(--fb-market)', ring: true },
  polymarket: { color: 'var(--text-3)', ring: false },
  clubelo: { color: 'var(--fb-elo)', ring: false },
  model: { color: 'var(--fb-model)', ring: false },
  apifootball_pred: { color: 'var(--text-3)', ring: true }
}
const CONSENSUS_LABEL = {
  sharp: 'Sharp market (Pinnacle / exchange)',
  market: 'All bookmakers (median)',
  polymarket: 'Polymarket prediction market',
  clubelo: 'ClubElo',
  model: 'DASYIN model',
  apifootball_pred: 'API-Football prediction'
}
export const consensusLabel = (k) => CONSENSUS_LABEL[k] || k

// ------------------------------------------------------------------ result check (✓ / ✗)
/** Any result_check payload → { kind: correct|wrong|nopick|void|pending, label, summary, … } (or null).
 *  The API sends status: correct | wrong | no_pick | void (jackpot games also pending). */
export function normResult(rc) {
  if (!rc || (!rc.status && !rc.label)) return null
  const st = String(rc.status || rc.label || '').toLowerCase()
  const kind = st === 'correct' ? 'correct' : st === 'wrong' ? 'wrong' : st === 'void' ? 'void' : st === 'no_pick' || st.startsWith('no') ? 'nopick' : 'pending'
  const label = rc.label || { correct: 'Correct', wrong: 'Wrong', void: 'Void', nopick: 'No pick', pending: 'Not graded yet' }[kind]
  return { ...rc, kind, label }
}

export const RESULT_STYLE = {
  correct: { icon: 'fa-solid fa-check', cls: 'fb-rc--correct', word: 'Correct' },
  wrong: { icon: 'fa-solid fa-xmark', cls: 'fb-rc--wrong', word: 'Wrong' },
  void: { icon: 'fa-solid fa-ban', cls: 'fb-rc--void', word: 'Void' },
  nopick: { icon: 'fa-regular fa-circle', cls: 'fb-rc--none', word: 'No pick' },
  pending: { icon: 'fa-regular fa-clock', cls: 'fb-rc--none', word: 'Not graded yet' }
}

/** A mark — true / false / null, or { selection?, correct: bool|null } — → 'correct' | 'wrong' | null */
export function markKind(m) {
  if (m === true || m === false) return m ? 'correct' : 'wrong'
  if (!m || typeof m !== 'object' || m.correct == null) return null
  return m.correct ? 'correct' : 'wrong'
}

// ------------------------------------------------------------------ accumulator ("combo")
/** Combined chance of independent picks: the product of their chances. */
export function comboP(items) {
  if (!items.length) return null
  return items.reduce((t, x) => t * (Number(x.p) || 0), 1)
}
export const fairOddsOf = (p) => (p > 0 ? 1 / p : null)
/** "1 in 6" / "1 in 1.6" — rounded for reading. */
export function oneInText(p) {
  if (!(p > 0)) return '—'
  const n = 1 / p
  const r = n >= 1000 ? Math.round(n / 10) * 10 : n >= 20 ? Math.round(n) : Math.round(n * 10) / 10
  return `1 in ${r.toLocaleString('en')}`
}

// ------------------------------------------------------------------ Poisson-binomial range (client fallback)
/** 10th–90th percentile of the number correct for independent chances ps (used when the API gives no range). */
export function normalRange(ps) {
  let dist = [1]
  for (const p of ps) {
    const q = Math.max(0, Math.min(1, Number(p) || 0))
    const next = new Array(dist.length + 1).fill(0)
    for (let k = 0; k < dist.length; k++) {
      next[k] += dist[k] * (1 - q)
      next[k + 1] += dist[k] * q
    }
    dist = next
  }
  let c = 0
  let lo = null
  let hi = null
  for (let k = 0; k < dist.length; k++) {
    c += dist[k]
    if (lo == null && c >= 0.1) lo = k
    if (hi == null && c >= 0.9) hi = k
  }
  return { low: lo ?? 0, high: hi ?? ps.length, expected: ps.reduce((t, p) => t + (Number(p) || 0), 0) }
}

/** "4 of 13" */
export const ofText = (c, n) => (n ? `${c ?? 0} of ${n}` : '—')
