<template>
  <FbSection id="goals" title="Over/under & both teams to score" subtitle="Chance of more goals than the line: the model next to the fair market">
    <FbFigure
      title="Over the line"
      subtitle="Dot = probability of going over; the gap between the dots is where model and market disagree"
      :legend="[
        { name: 'Model', color: 'var(--fb-model)', kind: 'dot' },
        { name: 'Fair market', color: 'var(--fb-market)', kind: 'dot' }
      ]"
      :table="table"
      chart-id="over-under"
    >
      <div class="fbg" role="list" aria-label="Probability of going over each goals line: model and fair market">
        <div v-for="r in rows" :key="r.key" class="fbg__row" role="listitem" :data-line="r.key" :aria-label="r.aria">
          <span class="fbg__name">{{ r.name }}</span>
          <span class="fbg__track" aria-hidden="true">
            <i class="fbg__mid"></i>
            <i v-if="r.model != null && r.fair != null" class="fbg__gap" :style="gapStyle(r)"></i>
            <i v-if="r.fair != null" class="fbg__dot fbg__dot--market" :style="{ left: r.fair * 100 + '%' }" :title="'Fair market ' + pct(r.fair)"></i>
            <i v-if="r.model != null" class="fbg__dot fbg__dot--model" :style="{ left: r.model * 100 + '%' }" :title="'Model ' + pct(r.model)"></i>
          </span>
          <span class="fbg__vals fb-num">
            <span class="fbg__m">{{ pct(r.model, 0) }}</span>
            <span class="fbg__f fb-muted">{{ r.fair != null ? pct(r.fair, 0) : '—' }}</span>
          </span>
          <span class="fbg__best fb-num fb-muted">{{ r.bestOver ? odds(r.bestOver) : '—' }} / {{ r.bestUnder ? odds(r.bestUnder) : '—' }}</span>
        </div>
        <div class="fbg__axis" aria-hidden="true">
          <span></span>
          <span class="fbg__ticks"><i>0%</i><i>50%</i><i>100%</i></span>
          <span class="fbg__vals fb-muted"><span>Model</span><span>Fair</span></span>
          <span class="fbg__best fb-muted">Best over / under</span>
        </div>
      </div>
    </FbFigure>
    <p class="fb-muted fb-small" style="margin: 8px 0 0">Quarter and whole lines (2.25, 3 …) can be checked in the price check: they split or refund the stake, and the expected value counts that.</p>
  </FbSection>
</template>

<script>
import FbSection from './FbSection.vue'
import FbFigure from '../charts/FbFigure.vue'
import { pct, odds, marketSel } from '../fb'

export default {
  name: 'GoalsSection',
  components: { FbSection, FbFigure },
  props: { a: { type: Object, required: true } },
  computed: {
    rows() {
      const ou = this.a.model?.over_under || {}
      const lines = Object.keys(ou)
        .map(Number)
        .sort((x, y) => x - y)
      const out = lines.map((l) => {
        const o = marketSel(this.a.market, 'ou', 'over', l)
        const u = marketSel(this.a.market, 'ou', 'under', l)
        const model = ou[String(l)]?.over ?? null
        const fair = o?.fair_p ?? null
        return { key: String(l), name: `Over ${l}`, model, fair, bestOver: o?.best?.price, bestUnder: u?.best?.price, aria: this.aria(`Over ${l} goals`, model, fair) }
      })
      const by = marketSel(this.a.market, 'btts', 'yes', null)
      const bn = marketSel(this.a.market, 'btts', 'no', null)
      const bm = this.a.model?.btts?.yes ?? null
      out.push({ key: 'btts', name: 'Both score', model: bm, fair: by?.fair_p ?? null, bestOver: by?.best?.price, bestUnder: bn?.best?.price, aria: this.aria('Both teams to score', bm, by?.fair_p) })
      return out
    },
    table() {
      return {
        cols: [{ label: 'Market' }, { label: 'Model', num: true }, { label: 'Fair market', num: true }, { label: 'Best over / yes', num: true }, { label: 'Best under / no', num: true }],
        rows: this.rows.map((r) => [r.name, pct(r.model, 1), r.fair != null ? pct(r.fair, 1) : '—', r.bestOver ? odds(r.bestOver) : '—', r.bestUnder ? odds(r.bestUnder) : '—'])
      }
    }
  },
  methods: {
    pct,
    odds,
    aria(name, m, f) {
      return `${name}: model ${m != null ? pct(m) : 'no estimate'}, fair market ${f != null ? pct(f) : 'not priced'}`
    },
    gapStyle(r) {
      const lo = Math.min(r.model, r.fair)
      const hi = Math.max(r.model, r.fair)
      return { left: lo * 100 + '%', width: (hi - lo) * 100 + '%' }
    }
  }
}
</script>

<style scoped>
.fbg {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 2px;
}
.fbg__row,
.fbg__axis {
  display: grid;
  grid-template-columns: 84px minmax(80px, 1fr) 84px 110px;
  align-items: center;
  gap: 12px;
  min-height: 30px;
}
.fbg__name {
  font-size: 13px;
  font-weight: 600;
}
.fbg__track {
  position: relative;
  height: 16px;
  display: block;
}
.fbg__track::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 7.5px;
  height: 1px;
  background: var(--fb-grid);
}
.fbg__mid {
  position: absolute;
  left: 50%;
  top: 2px;
  bottom: 2px;
  width: 1px;
  background: var(--fb-base);
}
.fbg__gap {
  position: absolute;
  top: 6.5px;
  height: 3px;
  background: var(--text-3);
  opacity: 0.35;
  border-radius: 2px;
}
.fbg__dot {
  position: absolute;
  top: 3px;
  width: 10px;
  height: 10px;
  margin-left: -5px;
  border-radius: 50%;
  box-shadow: 0 0 0 2px var(--fb-surface);
}
.fbg__dot--model {
  background: var(--fb-model);
}
.fbg__dot--market {
  background: var(--fb-market);
}
.fbg__vals {
  display: grid;
  grid-template-columns: 1fr 1fr;
  text-align: right;
  font-size: 12.5px;
  gap: 6px;
}
.fbg__m {
  font-weight: 650;
}
.fbg__best {
  font-size: 12px;
  text-align: right;
}
.fbg__axis {
  font-size: 11px;
  min-height: 22px;
  border-top: 1px solid var(--border);
  margin-top: 4px;
}
.fbg__ticks {
  display: flex;
  justify-content: space-between;
  color: var(--text-3);
}
.fbg__ticks i {
  font-style: normal;
}
@media (max-width: 560px) {
  .fbg__row,
  .fbg__axis {
    grid-template-columns: 70px minmax(60px, 1fr) 72px;
    gap: 8px;
  }
  .fbg__best {
    display: none;
  }
}
</style>
