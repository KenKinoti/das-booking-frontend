<template>
  <FbSection id="track-record" title="Track record here" :subtitle="subtitle">
    <div v-if="!t.n" class="fb-honest" data-test="fb-track-empty">
      <i class="fa-solid fa-hourglass-half"></i>
      <span>
        No graded predictions in {{ t.competition || 'this competition' }} yet. Every prediction is frozen before kick-off and scored after full time, so this fills up match by
        match. Until then, lean on the fair market; the model's backtest on five European leagues is on the
        <router-link to="/football/model">model page</router-link>.
      </span>
    </div>
    <template v-else>
      <div class="fb-grid-2">
        <div>
          <div class="fb-scroll">
            <table class="fb-table" data-test="fb-track-table">
              <thead>
                <tr>
                  <th>Score <span class="fb-muted">(lower is better)</span></th>
                  <th class="num">Model</th>
                  <th class="num">Market</th>
                  <th class="num">Model − market</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="m in metrics" :key="m.key" :data-metric="m.key">
                  <td>{{ m.label }}</td>
                  <td class="num">{{ fixed(m.model, 4) }}</td>
                  <td class="num">{{ fixed(m.market, 4) }}</td>
                  <td class="num" :class="m.diff != null ? (m.diff < 0 ? 'fb-pos' : 'fb-neg') : ''">{{ m.diff == null ? '—' : (m.diff > 0 ? '+' : '') + fixed(m.diff, 4) }}</td>
                </tr>
                <tr>
                  <td>Most likely outcome happened</td>
                  <td class="num">{{ pct(t.accuracy) }}</td>
                  <td class="num">—</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="fb-muted fb-small" style="margin: 8px 0 0">
            {{ t.n }} graded match{{ t.n === 1 ? '' : 'es' }} ({{ t.n_with_market }} with a closing market price). Differences are on the same matches.
            <template v-if="t.n < 200"> With fewer than a few hundred matches these numbers move a lot — don't read much into them yet.</template>
          </p>
        </div>
        <FbFigure
          title="Calibration"
          subtitle="When the forecast said x%, how often did it happen? Bars = 95% intervals"
          :legend="[
            { name: 'Model', color: 'var(--fb-model)', kind: 'dot' },
            { name: 'Market', color: 'var(--fb-market)', kind: 'dot' }
          ]"
          :table="calTable"
          chart-id="track-reliability"
        >
          <FbReliability :series="calSeries" :height="270" aria-label="Reliability of the model and the market in this competition" />
        </FbFigure>
      </div>
      <p class="fb-muted fb-small" style="margin: 10px 0 0">{{ t.note }}</p>
    </template>
  </FbSection>
</template>

<script>
import FbSection from './FbSection.vue'
import FbFigure from '../charts/FbFigure.vue'
import FbReliability from '../charts/FbReliability.vue'
import { fixed, pct } from '../fb'

export default {
  name: 'TrackSection',
  components: { FbSection, FbFigure, FbReliability },
  props: { a: { type: Object, required: true } },
  computed: {
    t() {
      return this.a.track_record || { n: 0 }
    },
    subtitle() {
      return `${this.t.competition || 'This competition'} · model vs the de-margined closing price`
    },
    metrics() {
      const t = this.t
      const d = (x, y) => (x != null && y != null ? x - y : null)
      return [
        { key: 'brier', label: 'Brier score', model: t.paired_brier ?? t.brier, market: t.market_brier, diff: d(t.paired_brier, t.market_brier) },
        { key: 'rps', label: 'Ranked probability score (RPS)', model: t.paired_rps ?? t.rps, market: t.market_rps, diff: d(t.paired_rps, t.market_rps) },
        { key: 'log_loss', label: 'Log loss', model: t.paired_log_loss ?? t.log_loss, market: t.market_log_loss, diff: d(t.paired_log_loss, t.market_log_loss) }
      ]
    },
    calSeries() {
      return [
        { key: 'model', name: 'Model', color: 'var(--fb-model)', bins: this.t.calibration || [] },
        { key: 'market', name: 'Market', color: 'var(--fb-market)', bins: this.t.market_calibration || [], labelDy: 16 }
      ]
    },
    calTable() {
      const rows = []
      for (const s of this.calSeries) for (const b of s.bins) rows.push([s.name, `${pct(b.lo, 0)}–${pct(b.hi, 0)}`, b.n, pct(b.mean_p), pct(b.freq), `${pct(b.ci_lo)}–${pct(b.ci_hi)}`])
      return { cols: [{ label: 'Source' }, { label: 'Bin' }, { label: 'Forecasts', num: true }, { label: 'Mean forecast', num: true }, { label: 'Happened', num: true }, { label: '95% interval', num: true }], rows }
    }
  },
  methods: { fixed, pct }
}
</script>
