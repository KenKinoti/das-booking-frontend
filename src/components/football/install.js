/**
 * Football analysis & bet tracker — wiring (imported once from main.js, like the
 * subscriptions and brief modules): adds the football pages to the router so the
 * shared src/router/index.js stays untouched. Access follows the `football`
 * module (navigation.js): owners and managers by default, staff only if granted.
 *
 *   /football               match centre (date strip, competitions, live now, value filter, watchlist)
 *   /football/match/:id     the match analysis page (probabilities, price check, form, odds, sources …)
 *   /football/bets          bet tracker: bets, bankroll, limits & breaks, P&L analytics
 *   /football/model         the model's track record and how to use it honestly
 *   /football/jackpot       jackpot analyser: your jackpots, history (v2.17)
 *   /football/jackpot/new   paste or search the games of a new jackpot
 *   /football/jackpot/:id   one jackpot: per-game chances, most likely ticket, cover plan, EV, grading
 *
 * System settings → Football data (?tab=football) is a tab of the platform settings page.
 */
import router from '@/router'

const records = [
  { path: '/football', name: 'FootballMatchCentre', component: () => import('@/views/football/MatchCentre.vue'), meta: { requiresAuth: true, title: 'Match centre' } },
  {
    path: '/football/match/:id',
    name: 'FootballMatch',
    component: () => import('@/views/football/MatchAnalysis.vue'),
    props: true,
    meta: { requiresAuth: true, title: 'Match analysis' }
  },
  { path: '/football/bets', name: 'FootballBets', component: () => import('@/views/football/BetTracker.vue'), meta: { requiresAuth: true, title: 'My bets' } },
  { path: '/football/model', name: 'FootballModel', component: () => import('@/views/football/ModelRecord.vue'), meta: { requiresAuth: true, title: 'Model track record' } },
  { path: '/football/jackpot', name: 'FootballJackpots', component: () => import('@/views/football/JackpotList.vue'), meta: { requiresAuth: true, title: 'Jackpot analyser' } },
  {
    path: '/football/jackpot/:id',
    name: 'FootballJackpot',
    component: () => import('@/views/football/JackpotAnalyser.vue'),
    props: true,
    meta: { requiresAuth: true, title: 'Jackpot' }
  }
]

for (const r of records) {
  if (!router.hasRoute(r.name)) router.addRoute(r)
}

export default records
