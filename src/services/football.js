// Football analysis & bet tracker (pages /football, /football/match/:id, /football/bets, /football/model
// and System settings → Football data). Backend: pkg/football — data is global (API-Football + The Odds
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
  deleteManualOdd: (id) => api.delete(`/football/odds/manual/${enc(id)}`).then(unwrap)
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
  unmatched: () => api.get('/super-admin/football/unmatched').then(unwrap)
}
