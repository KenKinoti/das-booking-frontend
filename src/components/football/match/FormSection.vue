<template>
  <FbSection id="form" title="Form" subtitle="Last 10 results, form by window and venue, and the rolling goals and expected-goals trend">
    <!-- Last 10: oldest → newest -->
    <div class="fbf__tl">
      <div v-for="t in teams" :key="t.side" class="fbf__team" :data-team="t.side">
        <div class="fbf__teamhead">
          <i class="fb-key" :style="{ background: t.color }"></i>
          <strong>{{ t.name }}</strong>
          <span class="fb-muted fb-small">last {{ t.recent.length }} · oldest → newest</span>
        </div>
        <ol class="fbf__chips">
          <li v-for="r in t.recent" :key="r.fixture_id" :title="chipTitle(r)" :data-result="r.result">
            <span class="fb-res" :class="'fb-res--' + r.result" :aria-label="resultLabel(r.result)">{{ r.result }}</span>
            <span class="fbf__opp">{{ r.venue === 'H' ? 'v' : '@' }} {{ r.opponent.code || r.opponent.name.slice(0, 3) }}</span>
            <span class="fbf__sc fb-num">{{ r.gf }}–{{ r.ga }}</span>
            <span class="fbf__rk fb-muted">{{ r.opponent_rank ? '#' + r.opponent_rank : '' }}</span>
          </li>
        </ol>
      </div>
    </div>

    <!-- Summary table -->
    <div class="fb-fig__title" style="margin-top: 18px">Form summary</div>
    <div class="fb-fig__sub">PPG = points per game · weighted = recent matches count more (half-life 4 matches) · opponent-adjusted = results against stronger sides count more</div>
    <div class="fb-scroll" style="margin-top: 6px">
      <table class="fb-table fbf__tbl" data-test="fb-form-table">
        <thead>
          <tr>
            <th>Window</th>
            <th>Team</th>
            <th class="num">W-D-L</th>
            <th class="num">PPG</th>
            <th class="num">Weighted</th>
            <th class="num">Opp.-adj.</th>
            <th class="num">Goals</th>
            <th class="num">xG for–against</th>
            <th class="num">Trend</th>
            <th>Sequence</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="w in windows" :key="w.key">
            <tr v-for="(r, i) in w.rows" :key="w.key + r.side" :class="{ 'fbf__first': i === 0 }" :data-window="w.key" :data-side="r.side" :data-ppg="r.s ? r.s.ppg : ''">
              <td v-if="i === 0" :rowspan="w.rows.length" class="fbf__win">{{ w.label }}</td>
              <td><i class="fb-key" :style="{ background: r.color }"></i> {{ r.label }}</td>
              <template v-if="r.s && r.s.n">
                <td class="num">{{ r.s.w }}-{{ r.s.d }}-{{ r.s.l }}</td>
                <td class="num"><strong>{{ fixed(r.s.ppg) }}</strong></td>
                <td class="num">{{ fixed(r.s.weighted_ppg) }}</td>
                <td class="num">{{ fixed(r.s.adj_ppg) }}</td>
                <td class="num">{{ r.s.gf }}–{{ r.s.ga }}</td>
                <td class="num">{{ r.s.has_xg ? `${fixed(r.s.xgf, 1)}–${fixed(r.s.xga, 1)}` : '—' }}</td>
                <td class="num" :class="r.s.trend > 0.05 ? 'fb-pos' : r.s.trend < -0.05 ? 'fb-neg' : ''">
                  <i :class="r.s.trend > 0.05 ? 'fa-solid fa-arrow-trend-up' : r.s.trend < -0.05 ? 'fa-solid fa-arrow-trend-down' : 'fa-solid fa-minus'" aria-hidden="true"></i>
                  {{ (r.s.trend > 0 ? '+' : '') + fixed(r.s.trend) }}
                </td>
                <td>
                  <span class="fbf__seq" :aria-label="'Results oldest to newest: ' + r.s.sequence.slice(-10)"
                    ><span v-for="(c, j) in r.s.sequence.split('').slice(-10)" :key="j" class="fb-res fbf__mini" :class="'fb-res--' + c" aria-hidden="true">{{ c }}</span></span
                  >
                </td>
              </template>
              <td v-else colspan="8" class="fb-muted">No matches</td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <!-- Rolling chart -->
    <FbFigure
      style="margin-top: 20px"
      :title="`Rolling ${metric.label} (${series.window || 5}-match average)`"
      :subtitle="metric.hint"
      :legend="[
        { name: f.home.name, color: 'var(--fb-home)', kind: 'line' },
        { name: f.away.name, color: 'var(--fb-away)', kind: 'line' }
      ]"
      :table="rollTable"
      chart-id="rolling-form"
    >
      <div class="fb-seg fbf__metric" role="radiogroup" aria-label="Measure">
        <button v-for="m in metrics" :key="m.key" type="button" role="radio" :aria-checked="metricKey === m.key" :class="{ 'is-on': metricKey === m.key }" @click="metricKey = m.key">{{ m.label }}</button>
      </div>
      <FbLine
        :series="rollSeries"
        :height="230"
        :format-x="(x) => (x === 0 ? 'latest' : String(x))"
        :format-x-tip="(x) => (x === 0 ? 'Latest match' : `${-x} match${x === -1 ? '' : 'es'} before the latest`)"
        :format-y="(v) => v.toFixed(1)"
        :format-value="(v, s, p) => `${v.toFixed(2)} · ${fmtShortDate(p.date, tz)}`"
        zero-based
        x-title="Matches (latest on the right)"
        :end-labels="endLabels"
        :aria-label="`Rolling ${metric.label} for both teams`"
      />
    </FbFigure>
  </FbSection>
</template>

<script>
import FbSection from './FbSection.vue'
import FbFigure from '../charts/FbFigure.vue'
import FbLine from '../charts/FbLine.vue'
import { fixed, fmtShortDate, RESULT_LABEL } from '../fb'

const METRICS = [
  { key: 'roll_xgf', raw: 'xgf', label: 'xG for', hint: 'Expected goals created — steadier than goals' },
  { key: 'roll_xga', raw: 'xga', label: 'xG against', hint: 'Expected goals conceded — lower is better' },
  { key: 'roll_gf', raw: 'gf', label: 'Goals for', hint: 'Goals scored' },
  { key: 'roll_ga', raw: 'ga', label: 'Goals against', hint: 'Goals conceded — lower is better' }
]

export default {
  name: 'FormSection',
  components: { FbSection, FbFigure, FbLine },
  props: {
    a: { type: Object, required: true },
    tz: { type: String, default: 'Africa/Nairobi' }
  },
  data() {
    return { metricKey: 'roll_xgf', metrics: METRICS }
  },
  computed: {
    f() {
      return this.a.fixture
    },
    series() {
      return this.a.series || {}
    },
    hasXg() {
      return (this.series.home || []).some((p) => p.xgf != null)
    },
    metric() {
      return METRICS.find((m) => m.key === this.metricKey)
    },
    teams() {
      return [
        { side: 'home', name: this.f.home.name, color: 'var(--fb-home)', recent: [...(this.a.recent?.home || [])].reverse() },
        { side: 'away', name: this.f.away.name, color: 'var(--fb-away)', recent: [...(this.a.recent?.away || [])].reverse() }
      ]
    },
    windows() {
      const h = this.a.form?.home || {}
      const w = this.a.form?.away || {}
      const H = { side: 'home', label: this.f.home.name, color: 'var(--fb-home)' }
      const A = { side: 'away', label: this.f.away.name, color: 'var(--fb-away)' }
      return [
        { key: 'last5', label: 'Last 5', rows: [{ ...H, s: h.last5 }, { ...A, s: w.last5 }] },
        { key: 'last10', label: 'Last 10', rows: [{ ...H, s: h.last10 }, { ...A, s: w.last10 }] },
        { key: 'venue', label: 'Home at home · away away', rows: [{ ...H, label: this.f.home.name + ' at home', s: h.home }, { ...A, label: this.f.away.name + ' away', s: w.away }] },
        { key: 'season', label: 'Season', rows: [{ ...H, s: h.season }, { ...A, s: w.season }] }
      ]
    },
    rollSeries() {
      const k = this.metricKey
      const mk = (pts, side, name, color) => {
        const n = pts.length
        return { key: side, name, color, points: pts.map((p, i) => ({ x: i - (n - 1), y: p[k] ?? null, date: p.date })) }
      }
      return [mk(this.series.home || [], 'home', this.f.home.name, 'var(--fb-home)'), mk(this.series.away || [], 'away', this.f.away.name, 'var(--fb-away)')]
    },
    endLabels() {
      return this.rollSeries
        .map((s) => {
          const last = [...s.points].reverse().find((p) => p.y != null)
          return last ? { key: s.key, text: `${s.name.split(' ')[0]} ${last.y.toFixed(2)}` } : null
        })
        .filter(Boolean)
    },
    rollTable() {
      const h = this.series.home || []
      const w = this.series.away || []
      const n = Math.max(h.length, w.length)
      const rows = []
      for (let i = 0; i < n; i++) {
        const ph = h[h.length - n + i]
        const pa = w[w.length - n + i]
        rows.push([
          i - (n - 1) === 0 ? 'latest' : String(i - (n - 1)),
          ph ? fmtShortDate(ph.date, this.tz) : '—',
          ph && ph[this.metricKey] != null ? ph[this.metricKey].toFixed(2) : '—',
          pa ? fmtShortDate(pa.date, this.tz) : '—',
          pa && pa[this.metricKey] != null ? pa[this.metricKey].toFixed(2) : '—'
        ])
      }
      return {
        cols: [{ label: 'Match' }, { label: this.f.home.name + ' date' }, { label: this.f.home.name, num: true }, { label: this.f.away.name + ' date' }, { label: this.f.away.name, num: true }],
        rows
      }
    }
  },
  created() {
    if (!this.hasXg) this.metricKey = 'roll_gf'
  },
  methods: {
    fixed,
    fmtShortDate,
    resultLabel(r) {
      return RESULT_LABEL[r] || r
    },
    chipTitle(r) {
      const xg = r.xg_for != null ? ` · xG ${r.xg_for.toFixed(2)}–${r.xg_against.toFixed(2)}` : ''
      return `${RESULT_LABEL[r.result]} ${r.gf}–${r.ga} ${r.venue === 'H' ? 'at home v' : 'away at'} ${r.opponent.name}${r.opponent_rank ? ` (#${r.opponent_rank})` : ''} · ${fmtShortDate(r.date, this.tz)} · ${r.competition}${xg}`
    }
  }
}
</script>

<style scoped>
.fbf__tl {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 14px;
}
.fbf__teamhead {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  font-size: 13px;
}
.fbf__chips {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(10, minmax(0, 1fr));
  gap: 6px;
}
.fbf__chips li {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  justify-items: center;
  gap: 2px;
  padding: 6px 2px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface-2);
  min-width: 0;
}
.fbf__opp {
  font-size: 11px;
  color: var(--text-2);
  white-space: nowrap;
}
.fbf__sc {
  font-size: 12px;
  font-weight: 650;
}
.fbf__rk {
  font-size: 10.5px;
  min-height: 14px;
}
.fbf__tbl td {
  white-space: nowrap;
}
.fbf__win {
  font-weight: 600;
  color: var(--text-2);
  white-space: normal !important;
  min-width: 90px;
  vertical-align: top;
}
.fbf__first td {
  border-top: 1px solid var(--border-strong);
}
.fbf__seq {
  display: inline-flex;
  gap: 2px;
}
.fbf__mini {
  width: 14px;
  height: 16px;
  font-size: 9px;
  border-radius: 3px;
}
.fbf__seq {
  gap: 1px !important;
}
.fbf__metric {
  margin-bottom: 8px;
}
@media (max-width: 640px) {
  .fbf__chips {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}
</style>
