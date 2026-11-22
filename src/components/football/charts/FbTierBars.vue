<template>
  <!-- Hit rate per tier on one shared 0–100% scale: the bar is what actually happened (tier colour, an ordinal ramp),
       the ink tick is what the picks' own chances said, the hollow ring is the open history for that tier. Every value is
       printed beside the bar, in the tooltip / focus and in the table view. -->
  <ul ref="root" class="fbtb" :class="{ 'is-narrow': narrow }" role="list" :aria-label="ariaLabel">
    <li
      v-for="r in drawn"
      :key="r.key"
      class="fbtb__row"
      :data-tier="r.key"
      :data-actual="r.hit_rate"
      :data-expected="r.expected_rate"
      :data-history="r.history_hit_rate"
      tabindex="0"
      :aria-label="r.aria"
      @pointerenter="show($event, r)"
      @pointermove="show($event, r)"
      @pointerleave="tip = null"
      @focus="focusRow(r)"
      @blur="tip = null"
    >
      <span class="fbtb__label">
        <span class="fbtb__name"><FbTierPips :tier="r.key" />{{ r.label }}</span>
        <span class="fbtb__sub">{{ r.range }} · {{ r.graded ? `${r.graded} graded` : 'none graded' }}</span>
      </span>
      <span class="fbtb__track">
        <span v-for="g in [0.25, 0.5, 0.75]" :key="g" class="fbtb__grid" :style="{ left: g * 100 + '%' }"></span>
        <span v-if="r.graded && r.hit_rate != null" class="fbtb__bar" :class="'fbtb__bar--' + r.key" :style="{ width: Math.max(0.8, r.hit_rate * 100) + '%' }"></span>
        <span v-if="r.expected_rate != null" class="fbtb__tick" :style="{ left: r.expected_rate * 100 + '%' }"></span>
        <span v-if="r.history_hit_rate != null" class="fbtb__ring" :style="{ left: r.history_hit_rate * 100 + '%' }"></span>
      </span>
      <span class="fbtb__fig fb-num"
        >{{ r.graded && r.hit_rate != null ? pct(r.hit_rate, 0) : '—' }}<span v-if="r.graded" class="fbtb__of">{{ r.correct }}/{{ r.graded }}</span></span
      >
    </li>
    <li class="fbtb__axis" aria-hidden="true">
      <span></span>
      <span class="fbtb__ticks"
        ><i v-for="g in [0, 0.25, 0.5, 0.75, 1]" :key="g" :style="{ left: g * 100 + '%' }">{{ Math.round(g * 100) }}%</i></span
      >
      <span></span>
    </li>
    <li v-if="tip" class="fb-tip" :style="tip.style" role="status">
      <div class="fb-tip__title">{{ tip.title }}</div>
      <div v-for="t in tip.lines" :key="t[0]" class="fb-tip__row">
        <span>{{ t[0] }}</span
        ><strong>{{ t[1] }}</strong>
      </div>
    </li>
  </ul>
</template>

<script>
import '../verdict/verdict.css'
import FbTierPips from '../verdict/FbTierPips.vue'
import { pct } from '../fb'

export default {
  name: 'FbTierBars',
  components: { FbTierPips },
  props: {
    // [{ key, label, range, graded, correct, hit_rate, expected_rate, history_hit_rate, own_hit_rate }]
    rows: { type: Array, default: () => [] },
    historyLabel: { type: String, default: 'History' },
    ariaLabel: { type: String, default: 'Hit rate per tier' }
  },
  data() {
    return { width: 0, tip: null, ro: null }
  },
  computed: {
    narrow() {
      return this.width > 0 && this.width < 440
    },
    drawn() {
      return this.rows.map((r) => ({
        ...r,
        aria: `${r.label}: ${r.graded ? `${r.correct} of ${r.graded} right, ${pct(r.hit_rate, 0)}` : 'no graded picks'}${r.expected_rate != null ? `, expected ${pct(r.expected_rate, 0)}` : ''}${
          r.history_hit_rate != null ? `, ${this.historyLabel.toLowerCase()} ${pct(r.history_hit_rate, 0)}` : ''
        }`
      }))
    }
  },
  mounted() {
    this.measure()
    if (typeof ResizeObserver !== 'undefined') {
      this.ro = new ResizeObserver(() => this.measure())
      this.ro.observe(this.$refs.root)
    }
  },
  beforeUnmount() {
    if (this.ro) this.ro.disconnect()
  },
  methods: {
    pct,
    measure() {
      if (this.$refs.root) this.width = this.$refs.root.clientWidth
    },
    lines(r) {
      const out = [
        ['Graded', r.graded ? `${r.graded}` : 'none'],
        ['Right', r.graded ? `${r.correct} (${pct(r.hit_rate, 0)})` : '—'],
        ['Expected from the chances', r.expected_rate != null ? pct(r.expected_rate, 0) : '—'],
        [this.historyLabel, r.history_hit_rate != null ? pct(r.history_hit_rate, 0) : '—']
      ]
      if (r.own_hit_rate != null) out.push(["DASYIN's own record", pct(r.own_hit_rate, 0)])
      return out
    },
    show(e, r) {
      const rect = this.$refs.root.getBoundingClientRect()
      const px = e.clientX - rect.left
      const py = e.clientY - rect.top
      const right = px > rect.width / 2
      this.tip = {
        title: `${r.label} (${r.range})`,
        lines: this.lines(r),
        style: { left: (right ? px - 12 : px + 12) + 'px', top: py + 14 + 'px', transform: right ? 'translateX(-100%)' : 'none' }
      }
    },
    focusRow(r) {
      const el = this.$refs.root.querySelector(`[data-tier="${r.key}"]`)
      this.tip = { title: `${r.label} (${r.range})`, lines: this.lines(r), style: { left: '0px', top: (el ? el.offsetTop + el.offsetHeight + 4 : 0) + 'px' } }
    }
  }
}
</script>

<style scoped>
.fbtb {
  position: relative;
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
}
.fbtb__row,
.fbtb__axis {
  display: grid;
  grid-template-columns: minmax(130px, 200px) minmax(0, 1fr) 84px;
  align-items: center;
  gap: 12px;
  border-radius: 6px;
}
.fbtb__row:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}
.fbtb__label {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.3;
}
.fbtb__name {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  font-weight: 650;
}
.fbtb__sub {
  font-size: 11.5px;
  color: var(--text-3);
}
.fbtb__track {
  position: relative;
  height: 24px;
  min-width: 0;
  border-left: 1px solid var(--fb-base);
}
.fbtb__grid {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: var(--fb-grid);
}
.fbtb__bar {
  position: absolute;
  left: 0;
  top: 5px;
  height: 14px;
  border-radius: 0 4px 4px 0;
}
.fbtb__bar--strong {
  background: var(--fb-tier-strong);
}
.fbtb__bar--good {
  background: var(--fb-tier-good);
}
.fbtb__bar--close {
  background: var(--fb-tier-close);
}
.fbtb__bar--coinflip {
  background: var(--fb-tier-coinflip);
}
.fbtb__tick {
  position: absolute;
  top: 1px;
  width: 3px;
  height: 22px;
  margin-left: -1.5px;
  border-radius: 2px;
  background: var(--text);
  box-shadow: 0 0 0 2px var(--surface);
}
.fbtb__ring {
  position: absolute;
  top: 6px;
  width: 12px;
  height: 12px;
  margin-left: -6px;
  border-radius: 50%;
  background: var(--surface);
  box-shadow:
    inset 0 0 0 2.5px var(--text-2),
    0 0 0 2px var(--surface);
}
.fbtb__fig {
  font-size: 13px;
  font-weight: 650;
  text-align: right;
  white-space: nowrap;
}
.fbtb__of {
  margin-left: 5px;
  font-weight: 500;
  color: var(--text-3);
  font-size: 11.5px;
}
.fbtb__axis {
  margin-top: -4px;
}
.fbtb__ticks {
  position: relative;
  height: 14px;
}
.fbtb__ticks i {
  position: absolute;
  transform: translateX(-50%);
  font-style: normal;
  font-size: 11px;
  color: var(--fb-axis);
  font-variant-numeric: tabular-nums;
}
.fbtb__ticks i:first-child {
  transform: none;
}
.fbtb__ticks i:last-child {
  transform: translateX(-100%);
}
.is-narrow .fbtb__row {
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas: 'label fig' 'track track';
  row-gap: 4px;
}
.is-narrow .fbtb__label {
  grid-area: label;
}
.is-narrow .fbtb__track {
  grid-area: track;
}
.is-narrow .fbtb__fig {
  grid-area: fig;
}
.is-narrow .fbtb__axis {
  grid-template-columns: minmax(0, 1fr);
}
.is-narrow .fbtb__axis > span:not(.fbtb__ticks) {
  display: none;
}
</style>
