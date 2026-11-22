// Football analysis & bet tracker (pages /football, /football/match/:id, /football/bets, /football/model,
// /football/jackpot and System settings → Football data). Backend: pkg/football — data is global (API-Football + The Odds
// API, fetched once); bets, bankroll, limits, watchlist and typed-in prices belong to the signed-in person.
import api from './api'

const unwrap = (r) => r.data?.data ?? r.data
const enc = encodeURIComponent
const clean = (o = {}) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== ''))

export const footballApi = {
  /** { markets, bookmakers, currency, disclaimer, limits_help, min_edge, kelly_fraction, kelly_cap, lookahead_days, providers, last_run_at, now, test_clock, model_version, statuses } */
  meta: () => api.get('/football/meta').then(unwrap),
  /** { competitions } — enabled, with coverage */
  competitions: () => api.get('/football/competitions').then(unwrap),
  /** { fixtures, count, now, last_run_at, timezone, disclaimer } — params: date | from,to, competition, status, q, limit */
  fixtures: (params = {}) => api.get('/football/fixtures', { params: clean(params) }).then(unwrap),
  /** The match page (see pkg/football Analysis). */
  analysis: (id) => api.get(`/football/fixtures/${enc(id)}/analysis`, { timeout: 30000 }).then(unwrap),
  /** Model p, EV, ¼ Kelly at the odds someone was offered: { label, odds, model_p, model_push, model_fair_odds, market_p, market_source, edge, ev, kelly_fraction, kelly_stake, bankroll, currency, value, note } */
  kelly: (id, params) => api.get(`/football/fixtures/${enc(id)}/kelly`, { params: clean(params) }).then(unwrap),
  value: (params = {}) => api.get('/football/value', { params: clean(params) }).then(unwrap),
  /** { n, n_with_market, brier, rps, log_loss, market_*, paired_*, accuracy, calibration, market_calibration, by_competition, se, timeline, note } */
  performance: (params = {}) => api.get('/football/model/performance', { params: clean(params) }).then(unwrap),
  team: (id) => api.get(`/football/teams/${enc(id)}`).then(unwrap),
  standings: (competition, season) => api.get(`/football/standings/${enc(competition)}`, { params: clean({ season }) }).then(unwrap),
  /** { live: [fixture row + live], now } */
  live: () => api.get('/football/live').then(unwrap),

  // Bets (own)
  bets: (params = {}) => api.get('/football/bets', { params: clean(params) }).then(unwrap),
  bet: (id) => api.get(`/football/bets/${enc(id)}`).then(unwrap),
  createBet: (body) => api.post('/football/bets', body).then(unwrap),
  updateBet: (id, body) => api.put(`/football/bets/${enc(id)}`, body).then(unwrap),
  deleteBet: (id) => api.delete(`/football/bets/${enc(id)}`).then(unwrap),
  /** body: { status: won|lost|void|half_won|half_lost|cashed_out|open|auto, cash_out? } */
  settleBet: (id, body) => api.post(`/football/bets/${enc(id)}/settle`, body).then(unwrap),
  summary: (params = {}) => api.get('/football/bets/summary', { params: clean(params) }).then(unwrap),

  bankroll: () => api.get('/football/bankroll').then(unwrap),
  /** body: { kind: start|deposit|withdrawal, amount, at?, note? } */
  addBankroll: (body) => api.post('/football/bankroll', body).then(unwrap),
  deleteBankroll: (id) => api.delete(`/football/bankroll/${enc(id)}`).then(unwrap),

  limits: () => api.get('/football/limits').then(unwrap),
  /** body: { daily_stake, weekly_stake, monthly_stake, daily_loss, weekly_loss, monthly_loss } (null = none) */
  setLimits: (body) => api.put('/football/limits', body).then(unwrap),
  takeBreak: (days) => api.post('/football/limits/break', { days }).then(unwrap),

  watchlist: () => api.get('/football/watchlist').then(unwrap),
  watch: (body) => api.post('/football/watchlist', body).then(unwrap),
  unwatch: (id) => api.delete(`/football/watchlist/${enc(id)}`).then(unwrap),

  manualOdds: (fixtureId) => api.get('/football/odds/manual', { params: clean({ fixture_id: fixtureId }) }).then(unwrap),
  /** body: { fixture_id, bookmaker, market, selection, line?, price, seen_at? } */
  addManualOdd: (body) => api.post('/football/odds/manual', body).then(unwrap),
  deleteManualOdd: (id) => api.delete(`/football/odds/manual/${enc(id)}`).then(unwrap),

  // v2.17 — team news & news (football-free-contract.md §2)
  /** { team_news, news } */
  fixtureNews: (id) => api.get(`/football/fixtures/${enc(id)}/news`).then(unwrap),
  news: (params = {}) => api.get('/football/news', { params: clean(params) }).then(unwrap),
  /** body: { action: confirm|dismiss|clear, note? } → { fact, audit } (owners, admins, managers, super admins) */
  reviewFact: (id, body) => api.post(`/football/team-news/${enc(id)}/review`, body).then(unwrap),
  factAudit: (id) => api.get(`/football/team-news/${enc(id)}/audit`).then(unwrap),

  // v2.17 — jackpot analyser (§3): your own jackpots only
  jackpots: (params = {}) => api.get('/football/jackpots', { params: clean(params) }).then(unwrap),
  jackpotMeta: () => api.get('/football/jackpots/meta').then(unwrap),
  /** { text, date? } → { games: [{ line, raw, home, away, odds, kickoff, country, match }], skipped, warnings } */
  parseJackpot: (body) => api.post('/football/jackpots/parse', body, { timeout: 30000 }).then(unwrap),
  analyseJackpot: (body) => api.post('/football/jackpots/analyse', body, { timeout: 60000 }).then(unwrap),
  createJackpot: (body) => api.post('/football/jackpots', body, { timeout: 60000 }).then(unwrap),
  /** JackpotView { jackpot, games, tickets, analysis, grading } */
  jackpot: (id, params = {}) => api.get(`/football/jackpots/${enc(id)}`, { params: clean(params), timeout: 60000 }).then(unwrap),
  updateJackpot: (id, body) => api.put(`/football/jackpots/${enc(id)}`, body, { timeout: 60000 }).then(unwrap),
  deleteJackpot: (id) => api.delete(`/football/jackpots/${enc(id)}`).then(unwrap),
  duplicateJackpot: (id, body = {}) => api.post(`/football/jackpots/${enc(id)}/duplicate`, body).then(unwrap),
  /** fixtureId null = unmatch */
  matchJackpotGame: (id, n, fixtureId) => api.put(`/football/jackpots/${enc(id)}/games/${enc(n)}/match`, { fixture_id: fixtureId }).then(unwrap),
  setJackpotResult: (id, n, body) => api.put(`/football/jackpots/${enc(id)}/games/${enc(n)}/result`, body).then(unwrap),
  /** body: { name, picks, source: custom|most_likely|top|cover|contrarian } */
  addJackpotTicket: (id, body) => api.post(`/football/jackpots/${enc(id)}/tickets`, body).then(unwrap),
  deleteJackpotTicket: (id, ticketId) => api.delete(`/football/jackpots/${enc(id)}/tickets/${enc(ticketId)}`).then(unwrap),
  gradeJackpot: (id) => api.post(`/football/jackpots/${enc(id)}/grade`).then(unwrap),
  jackpotHistory: (params = {}) => api.get('/football/jackpots/history', { params: clean(params) }).then(unwrap),
  /** ?home=&away=&date=&q= → { candidates: [{ fixture_id, home, away, kickoff, competition, competition_id, confidence }] } */
  jackpotCandidates: (params = {}) => api.get('/football/jackpots/candidates', { params: clean(params) }).then(unwrap),

  // v2.18 — simple picks, honest win rate, ✓/✗ results (FOOTBALL_WINRATE_SPEC.md §A–D, football-winrate-contract.md)
  /** ?period=weekend|7d|30d|season|custom&from&to&competition&tier → { period, totals, safer, goals, btts, scores, favourite_baseline, by_tier, by_competition, weekly, rows, jackpots } */
  scorecard: (params = {}) => api.get('/football/scorecard', { params: clean(params), timeout: 30000 }).then(unwrap),
  /** ?from&to&min_tier&limit → { picks: [fixture row + verdict] } upcoming verdicts, strongest first */
  picks: (params = {}) => api.get('/football/picks', { params: clean(params) }).then(unwrap),
  /** body: { budget } → the budget planner (covered selections per game, combinations, cost, 1 in N, expected correct, bonus chances) */
  planJackpot: (id, body) => api.post(`/football/jackpots/${enc(id)}/plan`, body, { timeout: 60000 }).then(unwrap),
  /** { groups: [{ group, label, weights, in_use, n, holdout_n, logloss_default, logloss_learned, sources, fitted_at, note }], defaults, note } */
  consensusWeights: () => api.get('/football/model/consensus-weights').then(unwrap),
  /** { source, url, from, to, n, divisions, method, tiers, overall, scores, groups } — the open history tables */
  history: () => api.get('/football/history').then(unwrap)
}

// Super admin: the providers' keys, budgets and competitions are the platform's.
export const footballAdminApi = {
  settings: () => api.get('/super-admin/football/settings').then(unwrap),
  save: (body) => api.put('/super-admin/football/settings', body).then(unwrap),
  /** { provider, ok, code, message, plan, limit_day, used_today, remaining, used, soccer_competitions, duration_ms } — free call */
  test: (provider) => api.post('/super-admin/football/settings/test', { provider }, { timeout: 30000 }).then(unwrap),
  competitions: (params = {}) => api.get('/super-admin/football/competitions', { params: clean(params) }).then(unwrap),
  /** body: { kinds?, force?, refit?, no_fetch? } → run summary */
  refresh: (body = {}) => api.post('/super-admin/football/refresh', body, { timeout: 280000 }).then(unwrap),
  refreshFixture: (id) => api.post(`/super-admin/football/fixtures/${enc(id)}/refresh`, {}, { timeout: 60000 }).then(unwrap),
  fetchLog: (params = {}) => api.get('/super-admin/football/fetch-log', { params: clean(params) }).then(unwrap),
  aliases: () => api.get('/super-admin/football/aliases').then(unwrap),
  setAlias: (name, teamId) => api.put('/super-admin/football/aliases', { name, team_id: teamId }).then(unwrap),
  deleteAlias: (alias) => api.delete(`/super-admin/football/aliases/${enc(alias)}`).then(unwrap),
  unmatched: () => api.get('/super-admin/football/unmatched').then(unwrap),

  // v2.17 — free sources, news rules and feeds (football-free-contract.md §4)
  sources: () => api.get('/super-admin/football/sources').then(unwrap),
  saveSources: (body) => api.put('/super-admin/football/sources', body).then(unwrap),
  testSource: (provider) => api.post('/super-admin/football/sources/test', { provider }, { timeout: 30000 }).then(unwrap),
  runSources: (body = {}) => api.post('/super-admin/football/sources/run', body, { timeout: 280000 }).then(unwrap),
  seedHistory: (body = {}) => api.post('/super-admin/football/sources/seed-history', body, { timeout: 280000 }).then(unwrap),
  newsRules: () => api.get('/super-admin/football/news-rules').then(unwrap),
  /** body: { rules } or { reset: true } */
  saveNewsRules: (body) => api.put('/super-admin/football/news-rules', body).then(unwrap),
  testNewsRules: (body) => api.post('/super-admin/football/news-rules/test', body).then(unwrap),
  newsFeeds: () => api.get('/super-admin/football/news-feeds').then(unwrap),
  addNewsFeed: (body) => api.post('/super-admin/football/news-feeds', body).then(unwrap),
  updateNewsFeed: (id, body) => api.put(`/super-admin/football/news-feeds/${enc(id)}`, body).then(unwrap),
  deleteNewsFeed: (id) => api.delete(`/super-admin/football/news-feeds/${enc(id)}`).then(unwrap),
  newsSources: () => api.get('/super-admin/football/news-sources').then(unwrap),
  unmatchedNames: (params = {}) => api.get('/super-admin/football/unmatched-names', { params: clean(params) }).then(unwrap),
  // v2.18 — refit the consensus weights now (weekly on its own)
  fitConsensusWeights: () => api.post('/super-admin/football/consensus-weights/fit', {}, { timeout: 120000 }).then(unwrap)
}
