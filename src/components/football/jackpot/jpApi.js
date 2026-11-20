/**
 * Jackpot API (football-free-contract.md §3) → view model. Every field the jackpot pages read goes through here,
 * so the pages stay simple and a change in the API's shape is fixed in one place.
 */
import { sym } from './jp'

const n = (v) => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v))

/** {"1","X","2"} | {home, draw, away} | [h, d, a] → { h, d, a } (or null). */
export function trio(p) {
  if (!p) return null
  if (Array.isArray(p)) return p.length >= 3 ? { h: n(p[0]), d: n(p[1]), a: n(p[2]) } : null
  const h = n(p['1'] ?? p.home ?? p.h)
  const d = n(p.X ?? p.x ?? p.draw ?? p.d)
  const a = n(p['2'] ?? p.away ?? p.a)
  return h == null && d == null && a == null ? null : { h, d, a }
}
export const pOf = (t, s) => (!t ? null : s === '1' ? t.h : s === 'X' ? t.d : s === '2' ? t.a : null)
/** Normalise a pick: "1", "X", "2" or a cover like "1X" (always in 1, X, 2 order). */
export function pick(s) {
  const t = String(s ?? '').toUpperCase()
  const out = ['1', 'X', '2'].filter((c) => t.includes(c))
  return out.length ? out.join('') : sym(s)
}

/** JackpotSummary (list) or Jackpot (view) → one shape for the list page. */
export function normJackpot(j) {
  if (!j) return null
  return {
    ...j,
    id: j.id,
    name: j.name || 'Jackpot',
    bookmaker: j.bookmaker || '',
    prize: n(j.prize),
    ticket_price: n(j.ticket_price),
    currency: j.currency || 'KES',
    bonuses: (j.bonuses || []).map((b) => ({ correct: n(b.correct), amount: n(b.amount) })).filter((b) => b.correct != null),
    closes_at: j.closes_at || null,
    status: j.status || '',
    games_count: n(j.n_games) ?? 0,
    matched: n(j.matched_games),
    unmatched: n(j.n_games) != null && n(j.matched_games) != null ? n(j.n_games) - n(j.matched_games) : 0,
    best_one_in: n(j.most_likely?.one_in),
    best_picks: (j.most_likely?.picks || []).map(pick),
    tickets_count: n(j.tickets) ?? 0,
    graded: j.graded
      ? { best_correct: n(j.graded.correct_most_likely), best_ticket: n(j.graded.best_ticket_correct), complete: !!j.graded.complete, expected_correct: n(j.graded.expected_correct) }
      : null
  }
}

export function normGame(g, i = 0) {
  const m = g.match || {}
  return {
    ...g,
    n: n(g.n) ?? i + 1,
    home: g.home || '',
    away: g.away || '',
    raw: g.raw || '',
    odds: trio(g.odds) || { h: null, d: null, a: null },
    kickoff: g.kickoff || m.kickoff || null,
    fixture_id: g.fixture_id ?? m.fixture_id ?? null,
    match: {
      status: m.status || (g.fixture_id ? 'matched' : 'unmatched'),
      fixture_id: m.fixture_id ?? g.fixture_id ?? null,
      confidence: n(m.confidence),
      home: m.home || '',
      away: m.away || '',
      kickoff: m.kickoff || null,
      competition: m.competition || '',
      via: m.via || '',
      candidates: m.candidates || []
    },
    result: g.result ? sym(g.result) : null,
    result_source: g.result_source || null,
    void: !!g.void,
    score: g.score || null
  }
}

const SOURCE_ORDER = ['jackpot', 'market', 'clubelo', 'model']

export function normAnalysis(a) {
  if (!a) return null
  const games = (a.games || []).map((g, i) => {
    const sources = {}
    for (const s of g.sources || []) sources[s.key] = { ...s, probs: trio(s.probs), weight: n(s.weight), used: s.used !== false && !!s.probs }
    const probs = trio(g.probs)
    const pk = sym(g.pick)
    return {
      ...g,
      n: n(g.n) ?? i + 1,
      home: g.home || '',
      away: g.away || '',
      label: `${g.home || ''} v ${g.away || ''}`,
      odds: trio(g.odds),
      margin: n(g.margin),
      sources,
      sourceList: SOURCE_ORDER.map((k) => sources[k]).filter(Boolean).concat((g.sources || []).filter((s) => !SOURCE_ORDER.includes(s.key)).map((s) => sources[s.key])),
      probs,
      pick: pk,
      pPick: n(g.pick_p) ?? pOf(probs, pk),
      second: g.second ? sym(g.second) : null,
      pSecond: n(g.second_p),
      certainty: n(g.certainty),
      drawLean: !!g.draw_lean,
      publicShares: trio(g.public),
      evidence: g.evidence || []
    }
  })
  const ml = a.most_likely || {}
  const ev = a.ev || null
  return {
    ...a,
    nGames: n(a.n_games) ?? games.length,
    combosFull: n(a.combinations_full),
    weights: a.weights || null,
    games,
    mostLikely: { picks: (ml.picks || []).map(pick), p: n(ml.p), oneIn: n(ml.one_in), expectedCorrect: n(ml.expected_correct), draws: n(ml.draws) },
    top: (a.top_tickets || []).map((t, i) => ({ rank: n(t.rank) ?? i + 1, picks: (t.picks || []).map(pick), p: n(t.p), oneIn: n(t.one_in), cum: n(t.cum_p), draws: n(t.draws), changes: (t.changes || []).map(chg) })),
    cover: (a.cover || []).map((c, i) => ({ step: n(c.step) ?? i + 1, game: n(c.game), add: sym(c.add), picks: pick(c.picks), kind: c.kind || '', combos: n(c.combinations), cost: n(c.cost), p: n(c.p_all), oneIn: n(c.one_in), gain: n(c.gain) })),
    plans: (a.cover_plans || []).map((p) => ({ ...p, picks: (p.picks || []).map(pick), combos: n(p.combinations), cost: n(p.cost), p: n(p.p_all), oneIn: n(p.one_in) })),
    atLeast: (a.at_least || []).map((x) => ({ k: n(x.k), p: n(x.p) })).sort((x, y) => y.k - x.k),
    correctDist: distArray(a.correct_dist),
    drawDist: distArray(a.draw_dist),
    expectedCorrect: n(a.expected_correct ?? ml.expected_correct),
    expectedDraws: n(a.expected_draws),
    ev: ev
      ? {
          ...ev,
          price: n(ev.ticket_price),
          prize: n(ev.prize),
          pJackpot: n(ev.p_jackpot),
          ticketsSold: n(ev.tickets_sold),
          coWinners: n(ev.co_winners_expected),
          shareFactor: n(ev.share_factor),
          evJackpot: n(ev.ev_jackpot),
          evBonuses: n(ev.ev_bonuses),
          evTotal: n(ev.ev_total),
          perShilling: n(ev.ev_per_shilling),
          bonuses: (ev.bonuses || []).map((b) => ({ correct: n(b.correct), amount: n(b.amount), p: n(b.p), ev: n(b.ev) }))
        }
      : null,
    contrarian: (a.contrarian || []).map((v) => ({ ...v, picks: (v.picks || []).map(pick), changes: (v.changes || []).map(chg), p: n(v.p), oneIn: n(v.one_in), ratio: n(v.p_ratio), coWinners: n(v.co_winners_expected), evTotal: n(v.ev_total) })),
    sharing: a.sharing || null,
    notes: a.notes || [],
    disclaimer: a.disclaimer || '',
    asOf: a.as_of || null
  }
}

function chg(c) {
  return { n: n(c.n), from: pick(c.from), to: pick(c.to) }
}
function distArray(d) {
  if (!Array.isArray(d)) return []
  if (d.length && typeof d[0] === 'object') {
    const out = []
    for (const x of d) out[n(x.k)] = n(x.p) || 0
    return Array.from(out, (v) => v || 0)
  }
  return d.map((v) => Number(v) || 0)
}

export function normView(v) {
  if (!v) return null
  const games = (v.games || []).map(normGame)
  return {
    jackpot: v.jackpot ? { ...v.jackpot, prize: n(v.jackpot.prize), ticket_price: n(v.jackpot.ticket_price), bonuses: (v.jackpot.bonuses || []).map((b) => ({ correct: n(b.correct), amount: n(b.amount) })) } : null,
    games,
    tickets: (v.tickets || []).map((t) => ({ ...t, picks: (t.picks || []).map(pick), combos: n(t.combinations), cost: n(t.cost), p: n(t.p_all), oneIn: n(t.one_in), correct: n(t.correct), of: n(t.of) })),
    analysis: normAnalysis(v.analysis),
    grading: v.grading || null
  }
}

/** E[1/(1+K)], K ~ Poisson(λ): the share of the top prize you keep when λ other winning tickets are expected. */
export function shareFactor(lambda) {
  const l = Math.max(0, Number(lambda) || 0)
  return l < 1e-9 ? 1 : (1 - Math.exp(-l)) / l
}

/** EV of one ticket with λ other expected winners (the slider), from the API's EV parts. */
export function evWith(ev, lambda) {
  if (!ev) return null
  const sf = shareFactor(lambda)
  const evJ = (ev.pJackpot || 0) * (ev.prize || 0) * sf
  const total = evJ + (ev.evBonuses || 0) - (ev.price || 0)
  return { shareFactor: sf, evJackpot: evJ, evTotal: total, back: ev.price ? (evJ + (ev.evBonuses || 0)) / ev.price : null }
}
