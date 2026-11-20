<template>
  <FbSection id="scores" title="Score probabilities" :subtitle="subtitle">
    <div v-if="!matrix.length" class="fb-muted">The goals model has no estimate for this match (not enough results in this competition yet).</div>
    <div v-else class="fbsc">
      <FbFigure title="Every scoreline" subtitle="Dixon–Coles score grid; darker = more likely" chart-id="score-matrix">
        <FbHeatmap :matrix="matrix" :home="f.home.name" :away="f.away.name" :top="top" />
      </FbFigure>
      <FbFigure title="Most likely scores" :subtitle="`Together ${pct(topSum)} of all outcomes`" chart-id="top-scores" :table="topTable">
        <ol class="fbsc__top" aria-label="Most likely scores with probability and fair odds">
          <li v-for="(t, i) in top" :key="i" :data-score="`${t.h}-${t.a}`">
            <span class="fbsc__score fb-num">{{ t.h }}–{{ t.a }}</span>
            <span class="fbsc__track"><i :style="{ width: (t.p / maxTop) * 100 + '%' }"></i></span>
            <span class="fbsc__p fb-num">{{ pct(t.p) }}</span>
            <span class="fbsc__o fb-muted fb-num">{{ odds(1 / t.p) }}</span>
          </li>
        </ol>
        <dl class="fbsc__facts">
          <div>
            <dt>Expected goals</dt>
            <dd class="fb-num">{{ fixed(dc.lambda_home) }} – {{ fixed(dc.lambda_away) }}</dd>
          </div>
          <div>
            <dt>Grid adds up to</dt>
            <dd class="fb-num" data-test="fb-matrix-sum">{{ pct(sum, 2) }}</dd>
          </div>
          <div>
            <dt>Home win · draw · away win</dt>
            <dd class="fb-num">{{ pct(regions.h) }} · {{ pct(regions.d) }} · {{ pct(regions.a) }}</dd>
          </div>
        </dl>
      </FbFigure>
    </div>
  </FbSection>
</template>

<script>
import FbSection from './FbSection.vue'
import FbFigure from '../charts/FbFigure.vue'
import FbHeatmap from '../charts/FbHeatmap.vue'
import { pct, odds, fixed } from '../fb'

export default {
  name: 'ScoreSection',
  components: { FbSection, FbFigure, FbHeatmap },
  props: { a: { type: Object, required: true } },
  computed: {
    f() {
      return this.a.fixture
    },
    dc() {
      return this.a.model?.dc || {}
    },
    matrix() {
      return this.a.model?.score_matrix || []
    },
    top() {
      return this.a.model?.top_scores || []
    },
    maxTop() {
      return Math.max(...this.top.map((t) => t.p), 0.0001)
    },
    topSum() {
      return this.top.reduce((s, t) => s + t.p, 0)
    },
    sum() {
      return this.matrix.reduce((s, r) => s + r.reduce((x, p) => x + p, 0), 0)
    },
    regions() {
      const out = { h: 0, d: 0, a: 0 }
      this.matrix.forEach((r, i) => r.forEach((p, j) => (i > j ? (out.h += p) : i === j ? (out.d += p) : (out.a += p))))
      return out
    },
    subtitle() {
      return this.dc.matches ? `Goals model fitted on ${this.dc.matches} matches (as of ${this.dc.fitted_as_of})` : ''
    },
    topTable() {
      return { cols: [{ label: 'Score' }, { label: 'Probability', num: true }, { label: 'Fair odds', num: true }], rows: this.top.map((t) => [`${t.h}–${t.a}`, pct(t.p, 2), odds(1 / t.p)]) }
    }
  },
  methods: { pct, odds, fixed }
}
</script>

<style scoped>
.fbsc {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
  gap: 24px;
}
.fbsc__top {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 8px;
}
.fbsc__top li {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) 52px 44px;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}
.fbsc__score {
  font-weight: 650;
}
.fbsc__track {
  height: 12px;
  display: block;
}
.fbsc__track i {
  display: block;
  height: 12px;
  background: var(--fb-model);
  border-radius: 0 4px 4px 0;
}
.fbsc__p {
  text-align: right;
  font-weight: 600;
}
.fbsc__o {
  text-align: right;
  font-size: 12px;
}
.fbsc__facts {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 6px;
  margin: 16px 0 0;
  font-size: 12.5px;
}
.fbsc__facts div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  border-top: 1px solid var(--border);
  padding-top: 6px;
}
.fbsc__facts dt {
  color: var(--text-3);
  font-weight: 500;
}
.fbsc__facts dd {
  margin: 0;
  font-weight: 600;
}
@media (max-width: 900px) {
  .fbsc {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
