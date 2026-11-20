<template>
  <FbSection id="chances" title="How many right" subtitle="For the most likely ticket: the chance of getting at least k games right, and how many draws to expect" open-on-phone>
    <div class="fbjk__tiles">
      <div class="fbjk__tile">
        <div class="fbjk__k">Expected right</div>
        <div class="fbjk__v" data-test="fb-jp-exp-correct">{{ fixed(an.expectedCorrect, 1) }} <span class="fb-muted">of {{ an.nGames }}</span></div>
      </div>
      <div class="fbjk__tile">
        <div class="fbjk__k">Expected draws</div>
        <div class="fbjk__v" data-test="fb-jp-exp-draws">{{ fixed(an.expectedDraws, 1) }} <span class="fb-muted">of {{ an.nGames }} games</span></div>
      </div>
      <div class="fbjk__tile">
        <div class="fbjk__k">Draws in the most likely ticket</div>
        <div class="fbjk__v">{{ an.mostLikely.draws ?? '—' }}</div>
      </div>
    </div>
    <p v-if="drawGap" class="fb-honest" style="margin: 12px 0 0">
      <i class="fa-solid fa-circle-info"></i>
      <span>{{ drawGap }}</span>
    </p>

    <FbFigure
      style="margin-top: 18px"
      title="Chance of at least k right"
      subtitle="Bars share one scale, so the top rows are barely visible — that is the point: all or nearly all right is rare"
      :table="atLeastTable"
      chart-id="jp-at-least"
    >
      <FbMeterList :rows="atLeastRows" aria-label="Chance of at least k games right" data-test="fb-jp-atleast" />
    </FbFigure>

    <div class="fb-grid-2" style="margin-top: 18px">
      <FbFigure title="How many the most likely ticket gets right" :subtitle="`Chance of exactly k right · blue bars pay something (top prize or bonus: ${bonusText}), grey bars pay nothing`" :table="correctTable" chart-id="jp-correct-dist">
        <FbColumns :items="correctItems" :height="190" :format-y="fmtAxis" :format-value="(v) => smallPct(v)" value-name="Chance" :values="false" aria-label="Chance of exactly k games right" x-title="Games right" />
      </FbFigure>
      <FbFigure title="How many draws to expect" :subtitle="`Number of draws among the ${an.nGames} games · on average ${fixed(an.expectedDraws, 1)}`" :table="drawTable" chart-id="jp-draw-dist">
        <FbColumns :items="drawItems" :height="190" color="var(--fb-draw)" :format-y="fmtAxis" :format-value="(v) => smallPct(v)" value-name="Chance" :values="false" aria-label="Chance of each number of draws" x-title="Draws" />
      </FbFigure>
    </div>
  </FbSection>
</template>

<script>
import FbSection from '../match/FbSection.vue'
import FbFigure from '../charts/FbFigure.vue'
import FbColumns from '../charts/FbColumns.vue'
import FbMeterList from '../charts/FbMeterList.vue'
import { fixed, money } from '../fb'
import { smallPct, oneIn } from './jp'

export default {
  name: 'JpChances',
  components: { FbSection, FbFigure, FbColumns, FbMeterList },
  props: {
    an: { type: Object, required: true },
    bonuses: { type: Array, default: () => [] },
    currency: { type: String, default: 'KES' }
  },
  computed: {
    atLeastRows() {
      const N = this.an.nGames
      return this.an.atLeast.map((x) => ({
        key: String(x.k),
        label: x.k === N ? `All ${N} right` : `${x.k} or more right`,
        sub: this.bonusFor(x.k),
        value: x.p,
        valueText: `${smallPct(x.p)} · ${oneIn(x.p)}`,
        tip: [
          ['Chance', smallPct(x.p)],
          ['In plain words', oneIn(x.p)]
        ]
      }))
    },
    atLeastTable() {
      return { cols: [{ label: 'Right' }, { label: 'Chance', num: true }, { label: 'In plain words' }], rows: this.atLeastRows.map((r) => [r.label, smallPct(r.value), oneIn(r.value)]) }
    },
    bonusText() {
      const b = (this.bonuses || []).filter((x) => x.correct != null)
      if (!b.length) return 'none entered'
      return b.map((x) => `${x.correct} right`).join(', ')
    },
    correctItems() {
      const tiers = new Set((this.bonuses || []).map((b) => b.correct))
      const N = this.an.nGames
      return this.an.correctDist.map((p, k) => ({
        key: 'c' + k,
        label: String(k),
        value: p,
        color: k === N || tiers.has(k) ? 'var(--fb-home)' : 'color-mix(in srgb, var(--text-3) 50%, var(--surface))',
        tipTitle: `Exactly ${k} right`,
        tip: [['In plain words', oneIn(p)], ...(k === N ? [['Pays', 'the top prize']] : tiers.has(k) ? [['Pays', this.bonusFor(k)]] : [])]
      }))
    },
    drawItems() {
      return this.an.drawDist.map((p, k) => ({ key: 'd' + k, label: String(k), value: p, tipTitle: `${k} draw${k === 1 ? '' : 's'}`, tip: [['In plain words', oneIn(p)]] }))
    },
    correctTable() {
      return { cols: [{ label: 'Right', num: true }, { label: 'Chance', num: true }], rows: this.an.correctDist.map((p, k) => [k, smallPct(p)]) }
    },
    drawTable() {
      return { cols: [{ label: 'Draws', num: true }, { label: 'Chance', num: true }], rows: this.an.drawDist.map((p, k) => [k, smallPct(p)]) }
    },
    drawGap() {
      const d = this.an.mostLikely.draws
      const e = this.an.expectedDraws
      if (d == null || e == null || e - d < 1.5) return ''
      return `The most likely ticket has ${d} draw${d === 1 ? '' : 's'}, but about ${fixed(e, 1)} draws are expected across these games. Each game's single most likely result is rarely a draw, yet some draws almost always happen — that is why covering a game with X can be worth it.`
    }
  },
  methods: {
    fixed,
    smallPct,
    fmtAxis(v) {
      return `${Math.round(v * 100)}%`
    },
    bonusFor(k) {
      const b = (this.bonuses || []).find((x) => x.correct === k)
      return b ? `bonus ${money(b.amount, this.currency)} for exactly ${k}` : ''
    }
  }
}
</script>

<style scoped>
.fbjk__tiles {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}
.fbjk__tile {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 10px 12px;
  background: var(--surface-2);
}
.fbjk__k {
  font-size: 12px;
  color: var(--text-3);
  font-weight: 600;
}
.fbjk__v {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.01em;
}
.fbjk__v .fb-muted {
  font-size: 13px;
  font-weight: 500;
}
@media (max-width: 640px) {
  .fbjk__tiles {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
