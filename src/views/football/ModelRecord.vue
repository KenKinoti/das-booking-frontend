<template>
  <div class="ui-page fb fbmr" data-test="fb-model">
    <header class="ui-page-head">
      <div>
        <div class="ui-eyebrow">Football</div>
        <h1>Model track record</h1>
        <p>How good DASYIN's probabilities have been — measured, with the uncertainty shown — and how to use them without fooling yourself.</p>
      </div>
      <div class="ui-actions">
        <router-link class="ui-btn" to="/football"><i class="fa-regular fa-futbol"></i> Match centre</router-link>
      </div>
    </header>

    <FbNoAccess v-if="forbidden" :reason="forbidden" />
    <template v-else>
      <div class="fb-honest fbmr__lead" data-test="fb-model-bottomline">
        <i class="fa-solid fa-scale-balanced"></i>
        <span>
          <strong>Bottom line.</strong> In out-of-sample tests on five European leagues the model was well calibrated — when it said 30%, it happened about 30% of the time — but
          about <strong>0.005–0.006 RPS less accurate than Pinnacle's closing odds</strong> in every league (each about 5 standard errors). Betting its “value” at closing prices lost
          money in all five. Only price shopping — taking a price above the sharp fair odds — was around break-even or slightly positive. Use the model to understand a match; use the
          fair market for the probability.
        </span>
      </div>

      <!-- Live record -->
      <section class="fb-panel">
        <div class="fb-panel__head">
          <div>
            <h2>Live record</h2>
            <p>Predictions frozen before kick-off, scored after full time against the de-margined closing price.</p>
          </div>
          <select v-model="competition" class="ui-select fbmr__sel" aria-label="Competition" @change="load">
            <option value="">All competitions</option>
            <option v-for="c in competitions" :key="c.id" :value="String(c.id)">{{ c.name }}{{ c.country && c.country !== 'World' ? ` (${c.country})` : '' }}</option>
          </select>
        </div>
        <div class="fb-panel__body">
          <div v-if="!p" class="ui-skeleton" style="height: 200px"></div>
          <div v-else-if="!p.n" class="fb-honest" data-test="fb-model-empty">
            <i class="fa-solid fa-hourglass-half"></i><span>{{ p.note }}</span>
          </div>
          <template v-else>
            <div class="fb-scroll">
              <table class="fb-table" data-test="fb-model-metrics">
                <thead>
                  <tr>
                    <th>Score <span class="fb-muted">(lower is better)</span></th>
                    <th class="num">Model</th>
                    <th class="num">Market</th>
                    <th class="num">Model − market</th>
                    <th>Reading</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="m in metrics" :key="m.key" :data-metric="m.key" :data-diff="m.diff == null ? '' : m.diff" :data-se="m.diffSe == null ? '' : m.diffSe">
                    <td>{{ m.label }}</td>
                    <td class="num">{{ fixed(m.model, 4) }} <span class="fb-muted fb-small">± {{ fixed(m.modelSe, 4) }}</span></td>
                    <td class="num">{{ m.market == null ? '—' : fixed(m.market, 4) }} <span v-if="m.marketSe != null" class="fb-muted fb-small">± {{ fixed(m.marketSe, 4) }}</span></td>
                    <td class="num">{{ m.diff == null ? '—' : (m.diff > 0 ? '+' : '') + fixed(m.diff, 4) }} <span v-if="m.diffSe != null" class="fb-muted fb-small">± {{ fixed(m.diffSe, 4) }}</span></td>
                    <td class="fb-small">{{ reading(m) }}</td>
                  </tr>
                  <tr>
                    <td>Most likely outcome happened</td>
                    <td class="num">{{ pct(p.accuracy) }}</td>
                    <td colspan="3"></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="fb-muted fb-small" style="margin: 6px 0 0">
              n = {{ p.n }} graded matches ({{ p.n_with_market }} with a closing market). ± is one standard error; the difference is paired on the same matches. A difference within about 2
              standard errors of zero is not evidence either way.
            </p>

            <div class="fb-grid-2" style="margin-top: 18px">
              <FbFigure
                title="Calibration"
                subtitle="Home, draw and away forecasts pooled; bars are 95% intervals"
                :legend="[
                  { name: 'Model', color: 'var(--fb-model)', kind: 'dot' },
                  { name: 'Market', color: 'var(--fb-market)', kind: 'dot' }
                ]"
                :table="calTable(p.calibration, p.market_calibration)"
                chart-id="model-reliability"
              >
                <FbReliability
                  :series="[
                    { key: 'model', name: 'Model', color: 'var(--fb-model)', bins: p.calibration },
                    { key: 'market', name: 'Market', color: 'var(--fb-market)', bins: p.market_calibration, labelDy: 16 }
                  ]"
                  :height="320"
                  aria-label="Reliability diagram: model and market"
                />
              </FbFigure>
              <div class="fb-figs">
                <FbFigure title="Graded matches over time" subtitle="Running total; the weekly count is in the tooltip" :table="timeTable" chart-id="n-over-time">
                  <FbLine
                    :series="[{ key: 'cum', name: 'Graded matches', color: 'var(--fb-model)', step: true, dots: timeline.length <= 30, points: timeline.map((w) => ({ x: new Date(w.week + 'T00:00:00Z').getTime(), y: w.cum, n: w.n })) }]"
                    :height="150"
                    zero-based
                    integer-ticks
                    :format-x="(x) => fmtShortDate(new Date(x).toISOString(), 'UTC')"
                    :format-x-tip="(x) => 'Week of ' + fmtShortDate(new Date(x).toISOString(), 'UTC')"
                    :format-y="(v) => compact(v)"
                    :format-value="(v, s, pt) => `${v} total (+${pt.n} that week)`"
                    aria-label="Cumulative number of graded predictions"
                  />
                </FbFigure>
                <FbFigure
                  title="RPS by week"
                  subtitle="Lower is better"
                  :legend="[
                    { name: 'Model', color: 'var(--fb-model)', kind: 'line' },
                    { name: 'Market', color: 'var(--fb-market)', kind: 'line' }
                  ]"
                  chart-id="rps-by-week"
                >
                  <FbLine
                    :series="[
                      { key: 'm', name: 'Model', color: 'var(--fb-model)', dots: timeline.length <= 30, points: timeline.map((w) => ({ x: new Date(w.week + 'T00:00:00Z').getTime(), y: w.rps })) },
                      { key: 'k', name: 'Market', color: 'var(--fb-market)', dots: timeline.length <= 30, points: timeline.map((w) => ({ x: new Date(w.week + 'T00:00:00Z').getTime(), y: w.market_rps })) }
                    ]"
                    :height="150"
                    :format-x="(x) => fmtShortDate(new Date(x).toISOString(), 'UTC')"
                    :format-x-tip="(x) => 'Week of ' + fmtShortDate(new Date(x).toISOString(), 'UTC')"
                    :format-y="(v) => v.toFixed(3)"
                    :format-value="(v) => v.toFixed(3)"
                    aria-label="Ranked probability score by week, model and market"
                  />
                </FbFigure>
              </div>
            </div>

            <div v-if="(p.by_competition || []).length" class="fb-scroll" style="margin-top: 16px">
              <table class="fb-table" data-test="fb-model-comps">
                <thead>
                  <tr>
                    <th>Competition</th>
                    <th class="num">Matches</th>
                    <th class="num">Model RPS</th>
                    <th class="num">Market RPS</th>
                    <th class="num">Model − market</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="c in p.by_competition" :key="c.competition_id">
                    <td>{{ c.name }}</td>
                    <td class="num">{{ c.n }}</td>
                    <td class="num">{{ fixed(c.rps, 4) }}</td>
                    <td class="num">{{ c.market_rps == null ? '—' : fixed(c.market_rps, 4) }}</td>
                    <td class="num">{{ c.rps_diff == null ? '—' : (c.rps_diff > 0 ? '+' : '') + fixed(c.rps_diff, 4) }} <span v-if="c.rps_diff_se != null" class="fb-muted fb-small">± {{ fixed(c.rps_diff_se, 4) }}</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
        </div>
      </section>

      <!-- Backtest -->
      <section class="fb-panel">
        <div class="fb-panel__head">
          <div>
            <h2>Backtest: five European leagues</h2>
            <p>{{ BACKTEST.source }} · market = Pinnacle closing odds with the margin removed (Shin)</p>
          </div>
        </div>
        <div class="fb-panel__body">
          <div class="fb-scroll">
            <table class="fb-table fb-table--nowrap" data-test="fb-backtest">
              <thead>
                <tr>
                  <th>League</th>
                  <th class="num">Matches</th>
                  <th class="num">Model RPS</th>
                  <th class="num">Market RPS</th>
                  <th class="num">Model − market</th>
                  <th class="num">Log loss model / market</th>
                  <th class="num">Brier model / market</th>
                  <th class="num" title="Expected calibration error">ECE model / market</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in BACKTEST.leagues" :key="r.league">
                  <td>{{ r.league }}</td>
                  <td class="num">{{ r.n.toLocaleString() }}</td>
                  <td class="num">{{ r.model.toFixed(4) }}</td>
                  <td class="num">{{ r.market.toFixed(4) }}</td>
                  <td class="num">+{{ r.diff.toFixed(4) }} <span class="fb-muted fb-small">± {{ r.se.toFixed(4) }}</span></td>
                  <td class="num">{{ r.ll.toFixed(3) }} / {{ r.mll.toFixed(3) }}</td>
                  <td class="num">{{ r.br.toFixed(3) }} / {{ r.mbr.toFixed(3) }}</td>
                  <td class="num">{{ r.ece.toFixed(3) }} / {{ r.mece.toFixed(3) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="fb-grid-2" style="margin-top: 18px">
            <FbFigure title="Premier League calibration, out of sample" subtitle="2,760 matches × 3 outcomes; bars are 95% intervals" :table="calTable(BACKTEST.eplCalibration, [])" chart-id="backtest-reliability">
              <FbReliability :series="[{ key: 'model', name: 'Model', color: 'var(--fb-model)', bins: BACKTEST.eplCalibration }]" :height="270" aria-label="Premier League backtest calibration of the model" />
            </FbFigure>
            <div>
              <div class="fb-fig__title">Betting the model, honestly</div>
              <div class="fb-fig__sub">¼ Kelly capped at 2%; flat yield = profit per 1-unit bet ± its standard error</div>
              <div class="fb-scroll" style="margin-top: 6px">
                <table class="fb-table">
                  <thead>
                    <tr>
                      <th>Strategy</th>
                      <th class="num">Bets</th>
                      <th class="num">Flat yield</th>
                      <th class="num">Bankroll</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="b in BACKTEST.bets" :key="b.what">
                      <td>{{ b.what }}</td>
                      <td class="num">{{ b.n }}</td>
                      <td class="num">{{ b.flat }}</td>
                      <td class="num">{{ b.roi }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p class="fb-small" style="margin: 8px 0 0">
                A higher edge threshold made things worse: the biggest “edges” were mostly model error. Even the price-shopping results are within about one standard error of zero, and
                real accounts at the best-priced bookmakers get limited.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div class="fb-grid-2">
        <!-- How it works -->
        <section class="fb-panel">
          <div class="fb-panel__head">
            <div>
              <h2>How the numbers are made</h2>
              <p>{{ meta ? meta.model_version : '' }}</p>
            </div>
          </div>
          <div class="fb-panel__body fbmr__prose">
            <h3>Fair market</h3>
            <p>Bookmaker odds include a margin. Removing it (the power method for 1X2, proportional for two-way markets; Shin's method in the backtest) gives the market's own probability. Pinnacle is preferred: its closing prices are the hardest benchmark to beat. Otherwise the median of all bookmakers.</p>
            <h3>Dixon–Coles goals model</h3>
            <p>Each team gets an attack and a defence strength, plus home advantage, fitted to this and last season's results with older matches counting less (half-life about a year). It predicts the chance of every scoreline, so it also gives over/under, both-teams-to-score and Asian handicap probabilities.</p>
            <h3>Elo ratings</h3>
            <p>A running rating from every stored result (K 15, home advantage 80 points, bigger wins move ratings more), with a draw model fitted to the league's own draw rate.</p>
            <h3>Blend and adjustments</h3>
            <p>60% Dixon–Coles + 40% Elo; the blend beat either part in every league tested. Known absences reduce a team's expected goals by a cautious rule of thumb (a replacement recovers 60% of a player's attacking output) — not fitted, so treat it as a sensitivity check.</p>
            <h3>Stakes</h3>
            <p>Suggested stakes use ¼ of the Kelly criterion, capped at 2% of your bankroll, and are zero when there is no edge. Never martingale, never chase.</p>
            <h3>What it doesn't know</h3>
            <p>No line-ups (until published), news, motivation or fixture congestion; one home-advantage estimate per league; cups mixing leagues lean on the prior. Kenyan and other African leagues have no public closing-odds history, so their accuracy is unmeasured until the live record above fills up.</p>
          </div>
        </section>
        <!-- How to use it honestly -->
        <section class="fb-panel">
          <div class="fb-panel__head">
            <div>
              <h2>How to use this honestly</h2>
              <p>What the evidence supports</p>
            </div>
          </div>
          <div class="fb-panel__body fbmr__prose">
            <ol class="fbmr__rules">
              <li><strong>Start from the fair price, not the model.</strong> The de-margined sharp market is the better probability. The model explains the match and is a second opinion.</li>
              <li><strong>Price-shop.</strong> Type the odds from SportPesa, Betika, Odibets and others into the price check. Only bet when the price is above the fair odds — that is the one approach that held up.</li>
              <li><strong>Treat model–market disagreement as a question, not a bet.</strong> Big “edges” were mostly model error in the backtest. Ask what the market knows (line-ups, injuries, news).</li>
              <li><strong>Judge yourself by closing-line value.</strong> Over a few hundred bets, beating the closing price is the clearest sign of skill; profit over a few dozen bets is mostly luck.</li>
              <li><strong>Small stakes, fixed bankroll.</strong> ¼ Kelly capped at 2%. Set daily, weekly and monthly limits on My bets and in your bookmaker's app.</li>
              <li><strong>Expect losing runs.</strong> Even a genuine 3% edge at odds of 3.0 has long losing streaks. Take a break when it stops being fun.</li>
            </ol>
            <h3>References</h3>
            <p class="fb-small">
              Dixon &amp; Coles (1997) JRSS C 46:265–280 · Maher (1982) Statistica Neerlandica 36 · Elo (1978); World Football Elo · Davidson (1970) JASA 65 · Shin (1993) Economic Journal 103 ·
              Štrumbelj (2014) IJF 30 · Epstein (1969) J. Appl. Meteorology 8 · Constantinou &amp; Fenton (2012) JQAS 8(1) · Brier (1950) · Kelly (1956) Bell System Technical Journal 35 ·
              Wilson (1927) JASA 22.
            </p>
          </div>
        </section>
      </div>
      <ConsensusWeights style="margin-top: 16px" />
      <FbFootnote />
    </template>
  </div>
</template>

<script>
import '@/components/football/football.css'
import { footballApi } from '@/services/football'
import { fb, loadMeta, forbiddenReason } from '@/components/football/fbState'
import { BACKTEST, fixed, pct, compact, fmtShortDate } from '@/components/football/fb'
import FbNoAccess from '@/components/football/FbNoAccess.vue'
import FbFootnote from '@/components/football/FbFootnote.vue'
import FbFigure from '@/components/football/charts/FbFigure.vue'
import FbLine from '@/components/football/charts/FbLine.vue'
import FbReliability from '@/components/football/charts/FbReliability.vue'
import ConsensusWeights from '@/components/football/model/ConsensusWeights.vue'

export default {
  name: 'ModelRecord',
  components: { FbNoAccess, FbFootnote, FbFigure, FbLine, FbReliability, ConsensusWeights },
  data() {
    return { BACKTEST, p: null, competitions: [], competition: typeof this.$route.query.competition === 'string' ? this.$route.query.competition : '', forbidden: '' }
  },
  computed: {
    meta() {
      return fb.meta
    },
    timeline() {
      return this.p?.timeline || []
    },
    metrics() {
      const p = this.p
      if (!p) return []
      const se = p.se || {}
      const row = (key, label) => ({
        key,
        label,
        model: p.n_with_market ? p['paired_' + key] : p[key],
        modelSe: se.model ? se.model[key] : null,
        market: p['market_' + key],
        marketSe: se.market ? se.market[key] : null,
        diff: p.diff ? p.diff[key] : null,
        diffSe: p.diff_se ? p.diff_se[key] : null
      })
      return [row('brier', 'Brier score'), row('rps', 'Ranked probability score (RPS)'), row('log_loss', 'Log loss')]
    },
    timeTable() {
      return { cols: [{ label: 'Week of' }, { label: 'Graded', num: true }, { label: 'Running total', num: true }, { label: 'Model RPS', num: true }, { label: 'Market RPS', num: true }], rows: this.timeline.map((w) => [w.week, w.n, w.cum, w.rps.toFixed(3), w.market_rps == null ? '—' : w.market_rps.toFixed(3)]) }
    }
  },
  async created() {
    await loadMeta(true)
    if (fb.forbidden) {
      this.forbidden = fb.forbidden
      return
    }
    footballApi
      .competitions()
      .then((d) => (this.competitions = d.competitions || []))
      .catch(() => {})
    await this.load()
  },
  methods: {
    fixed,
    pct,
    compact,
    fmtShortDate,
    async load() {
      try {
        this.p = await footballApi.performance({ competition: this.competition })
        this.$router.replace({ query: this.competition ? { competition: this.competition } : {} }).catch(() => {})
      } catch (e) {
        this.forbidden = forbiddenReason(e)
        this.p = { n: 0, note: 'Could not load the track record.' }
      }
    },
    reading(m) {
      if (m.diff == null) return 'No market to compare yet'
      if (!m.diffSe) return m.diff < 0 ? 'Model ahead (one match — no evidence yet)' : 'Market ahead (one match — no evidence yet)'
      const z = m.diff / m.diffSe
      if (Math.abs(z) < 2) return 'No clear difference yet'
      return z < 0 ? 'Model clearly better here' : 'Market clearly better here'
    },
    calTable(model, market) {
      const rows = []
      for (const [name, bins] of [
        ['Model', model || []],
        ['Market', market || []]
      ])
        for (const b of bins) rows.push([name, `${pct(b.lo, 0)}–${pct(b.hi, 0)}`, b.n, pct(b.mean_p), pct(b.freq), `${pct(b.ci_lo)}–${pct(b.ci_hi)}`])
      return { cols: [{ label: 'Source' }, { label: 'Forecast bin' }, { label: 'Forecasts', num: true }, { label: 'Mean forecast', num: true }, { label: 'Happened', num: true }, { label: '95% interval', num: true }], rows }
    }
  }
}
</script>

<style scoped>
.fbmr {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
}
.fbmr > .ui-page-head {
  margin-bottom: 0;
}
.fbmr__lead {
  font-size: 13.5px;
  line-height: 1.55;
}
.fbmr__sel {
  width: auto;
  max-width: 260px;
}
.fbmr__prose h3 {
  font-size: 13.5px;
  font-weight: 650;
  margin: 14px 0 4px;
}
.fbmr__prose h3:first-child {
  margin-top: 0;
}
.fbmr__prose p {
  margin: 0;
  font-size: 13px;
  color: var(--text-2);
  line-height: 1.55;
}
.fbmr__rules {
  margin: 0;
  padding-left: 20px;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 8px;
  font-size: 13px;
  color: var(--text-2);
  line-height: 1.5;
}
.fbmr__rules strong {
  color: var(--text);
}
</style>
