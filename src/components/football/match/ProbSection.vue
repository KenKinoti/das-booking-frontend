<template>
  <FbSection id="probabilities" title="Probabilities" :subtitle="subtitle" open-on-phone>
    <FbFigure
      title="Home win · draw · away win"
      :subtitle="'Each row adds up to 100%. Fair market = ' + (market.fair_source || 'no market yet')"
      :legend="[
        { name: f.home.name, color: 'var(--fb-home)' },
        { name: 'Draw', color: 'var(--fb-draw)' },
        { name: f.away.name, color: 'var(--fb-away)' }
      ]"
      :table="stackTable"
      chart-id="prob-stack"
    >
      <FbStack :rows="rows" :names="[f.home.name, 'Draw', f.away.name]" />
    </FbFigure>

    <div class="fb-scroll fbp-sel">
      <table class="fb-table fb-table--nowrap" data-test="fb-prob-table">
        <thead>
          <tr>
            <th>Selection</th>
            <th class="num">Fair chance</th>
            <th class="num">Fair odds</th>
            <th class="num">Model</th>
            <th class="num">Model odds</th>
            <th class="num" title="Model probability minus the fair (market) probability">Edge</th>
            <th class="num">Best price</th>
            <th class="num" title="Expected value of 1 unit at the best price, using the fair probability">EV at best vs fair</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in sels" :key="s.key" :data-sel="s.key">
            <td><i class="fb-key" :style="{ background: s.color }"></i> {{ s.label }}</td>
            <td class="num" :data-v="s.fair">{{ pct(s.fair) }}</td>
            <td class="num">{{ s.fair ? odds(1 / s.fair) : '—' }}</td>
            <td class="num" :data-v="s.model">{{ pct(s.model) }}</td>
            <td class="num">{{ s.model ? odds(1 / s.model) : '—' }}</td>
            <td class="num" :data-v="s.edge">{{ pts(s.edge) }}</td>
            <td class="num">
              <template v-if="s.best">{{ odds(s.best.price) }} <span class="fb-muted fb-small">{{ s.best.title }}</span></template><template v-else>—</template>
            </td>
            <td class="num" :class="s.evFair > 0 ? 'fb-pos' : ''">{{ s.evFair == null ? '—' : spct(s.evFair) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <p class="fb-honest" data-test="fb-honest-line">
      <i class="fa-solid fa-scale-balanced"></i>
      <span>{{ honest }} <router-link to="/football/model">Full track record</router-link></span>
    </p>

    <p v-if="model.graded" class="fb-honest" data-test="fb-graded">
      <i class="fa-solid fa-flag-checkered"></i>
      <span>
        Graded after full time ({{ ['home win', 'draw', 'away win'][model.graded.outcome] }}): model RPS {{ fixed(model.graded.rps, 3) }}<template v-if="model.graded.market_rps != null">
          vs market {{ fixed(model.graded.market_rps, 3) }} ({{ model.graded.market_source }})</template
        >. Lower is better.
      </span>
    </p>

    <details class="fbp-inputs">
      <summary>How these numbers were made</summary>
      <ul>
        <li v-if="market.fair_source">
          <strong>Fair market:</strong> {{ market.fair_source }} — the bookmaker's margin is removed ({{ market.devig_method }}). Pinnacle is preferred because its closing
          prices are the hardest to beat; otherwise the consensus of {{ market.books }} bookmakers.
        </li>
        <li v-for="(t, i) in model.inputs || []" :key="i">{{ t }}</li>
        <li>
          <strong>Model:</strong> {{ model.version }}. {{ model.kind === 'frozen' ? 'Frozen before kick-off at ' + fmtDateTime(model.frozen_at, tz) + ' and never changed.' : 'Recomputed with the latest data at ' + fmtDateTime(model.computed_at, tz) + '.' }}
        </li>
      </ul>
    </details>
  </FbSection>
</template>

<script>
import FbSection from './FbSection.vue'
import FbFigure from '../charts/FbFigure.vue'
import FbStack from '../charts/FbStack.vue'
import { pct, pts, spct, odds, fixed, fmtDateTime, marketSel } from '../fb'

export default {
  name: 'ProbSection',
  components: { FbSection, FbFigure, FbStack },
  props: {
    a: { type: Object, required: true },
    tz: { type: String, default: 'Africa/Nairobi' }
  },
  computed: {
    f() {
      return this.a.fixture
    },
    model() {
      return this.a.model || {}
    },
    market() {
      return this.a.market || {}
    },
    subtitle() {
      return this.model.kind === 'frozen' ? 'Model frozen before kick-off; the fair market is the de-margined sharp price' : 'Fair market first — the model is a second, transparent opinion'
    },
    rows() {
      const m = this.model
      const mk = this.market
      const rows = []
      const fair = mk.fair_1x2
      rows.push({ key: 'fair', label: 'Fair market', sub: mk.fair_source || '', h: fair?.home, d: fair?.draw, a: fair?.away, empty: 'No bookmaker prices yet', note: 'Bookmaker margin removed' })
      rows.push({
        key: 'blend',
        label: 'Model blend',
        sub: m.weights ? `${Math.round((m.weights.dc || 0) * 100)}% Dixon–Coles + ${Math.round((m.weights.elo || 0) * 100)}% Elo` : '',
        h: m.blend?.home,
        d: m.blend?.draw,
        a: m.blend?.away
      })
      if (m.dc) rows.push({ key: 'dc', label: 'Dixon–Coles', sub: `expected goals ${fixed(m.dc.lambda_home)} v ${fixed(m.dc.lambda_away)}`, h: m.dc.p_home, d: m.dc.p_draw, a: m.dc.p_away })
      if (m.elo) rows.push({ key: 'elo', label: 'Elo', sub: `ratings ${Math.round(m.elo.rating_home)} v ${Math.round(m.elo.rating_away)}`, h: m.elo.p_home, d: m.elo.p_draw, a: m.elo.p_away })
      const c = mk.consensus_1x2
      if (c) rows.push({ key: 'consensus', label: 'Consensus', sub: `${mk.books || 0} bookmakers, margin removed`, h: c.home, d: c.draw, a: c.away })
      return rows
    },
    stackTable() {
      return {
        cols: [{ label: 'Source' }, { label: this.f.home.name, num: true }, { label: 'Draw', num: true }, { label: this.f.away.name, num: true }],
        rows: this.rows.map((r) => [r.label + (r.sub ? ` (${r.sub})` : ''), pct(r.h), pct(r.d), pct(r.a)])
      }
    },
    sels() {
      const colors = { home: 'var(--fb-home)', draw: 'var(--fb-draw)', away: 'var(--fb-away)' }
      const labels = { home: `${this.f.home.name} to win`, draw: 'Draw', away: `${this.f.away.name} to win` }
      return ['home', 'draw', 'away'].map((k) => {
        const ms = marketSel(this.market, '1x2', k, null)
        const fair = this.market.fair_1x2?.[k] ?? null
        const model = this.model.blend?.[k] ?? null
        const best = ms?.best || null
        return { key: k, label: labels[k], color: colors[k], fair, model, edge: fair != null && model != null ? model - fair : null, best, evFair: best && fair ? best.price * fair - 1 : null }
      })
    },
    honest() {
      const t = this.a.track_record || {}
      if (t.n > 0 && t.rps != null) {
        const vs = t.market_rps != null ? ` vs the market's ${fixed(t.market_rps, 3)}` : ''
        return `In ${t.competition || 'this competition'} the model has been graded on ${t.n} match${t.n === 1 ? '' : 'es'}: RPS ${fixed(t.rps, 3)}${vs} (lower is better; ${t.n < 100 ? 'too few matches to judge yet' : 'see the track record'}). Over five European leagues it was about 0.005–0.006 RPS behind Pinnacle's closing odds.`
      }
      return 'No graded predictions for this competition yet. Over five European leagues (2019–2026) the model was well calibrated but about 0.005–0.006 RPS behind Pinnacle\'s closing odds — treat it as a second opinion, not a signal to bet.'
    }
  },
  methods: { pct, pts, spct, odds, fixed, fmtDateTime }
}
</script>

<style scoped>
.fbp-sel {
  margin-top: 16px;
}
.fb-honest {
  margin: 14px 0 0;
}
.fbp-inputs {
  margin-top: 12px;
  font-size: 12.5px;
  color: var(--text-2);
}
.fbp-inputs summary {
  cursor: pointer;
  font-weight: 600;
  color: var(--text-2);
}
.fbp-inputs ul {
  margin: 8px 0 0;
  padding-left: 18px;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 4px;
}
</style>
