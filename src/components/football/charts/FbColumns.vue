<template>
  <div ref="root" class="fbc" :style="{ height: height + 'px' }">
    <svg v-if="width > 0" :width="width" :height="height" role="img" :aria-label="ariaLabel">
      <template v-for="t in scale.ticks" :key="'g' + t">
        <line :x1="padL" :x2="width - padR" :y1="Y(t)" :y2="Y(t)" :class="t === 0 ? 'fb-baseline' : 'fb-gridline'" />
        <text :x="padL - 6" :y="Y(t) + 3.5" class="fb-axis" text-anchor="end">{{ formatY(t) }}</text>
      </template>
      <g v-for="r in refLines" :key="'r' + r.y">
        <line :x1="padL" :x2="width - padR" :y1="Y(r.y)" :y2="Y(r.y)" class="fbc__ref" />
        <text :x="width - padR" :y="Y(r.y) - 4" class="fb-axis" text-anchor="end">{{ r.label }}</text>
      </g>
      <g v-for="(b, i) in bars" :key="b.key" class="fbc__bar" :class="{ 'is-hover': hover === i }">
        <path :d="b.d" :fill="b.color" />
        <text v-if="showValues && b.value !== 0" :x="b.cx" :y="b.labelY" class="fbc__val" :class="{ 'fbc__val--in': b.labelIn }" text-anchor="middle">{{ formatValue(b.value, b) }}</text>
        <text v-if="labelEvery && i % labelEvery === 0" :x="b.cx" :y="Y(scale.lo) + 15" class="fb-axis" text-anchor="middle">{{ b.label }}</text>
        <rect
          :x="b.cx - band / 2"
          :y="padT"
          :width="band"
          :height="plotH"
          fill="transparent"
          tabindex="0"
          :aria-label="`${b.label}: ${formatValue(b.value, b)}`"
          @pointerenter="hover = i"
          @pointerleave="hover = null"
          @focus="hover = i"
          @blur="hover = null"
        />
      </g>
      <text v-if="xTitle" :x="padL + plotW / 2" :y="height - 2" class="fb-axis-title" text-anchor="middle">{{ xTitle }}</text>
    </svg>
    <div v-if="hover !== null && bars[hover]" class="fb-tip" :style="tipStyle" role="status">
      <div class="fb-tip__title">{{ bars[hover].tipTitle || bars[hover].label }}</div>
      <div class="fb-tip__row">
        <span><i class="fb-key" :style="{ background: bars[hover].color }"></i>{{ valueName }}</span>
        <strong>{{ formatValue(bars[hover].value, bars[hover]) }}</strong>
      </div>
      <div v-for="t in bars[hover].tip || []" :key="t[0]" class="fb-tip__row">
        <span>{{ t[0] }}</span><strong>{{ t[1] }}</strong>
      </div>
    </div>
  </div>
</template>

<script>
import { niceTicks } from '../fb'

// Columns from a zero baseline (negative values hang below it): items [{ key, label, value, color?, tip?: [[name, value]], tipTitle? }].
export default {
  name: 'FbColumns',
  props: {
    items: { type: Array, default: () => [] },
    height: { type: Number, default: 220 },
    color: { type: [String, Function], default: 'var(--fb-home)' },
    formatY: { type: Function, default: (v) => String(v) },
    formatValue: { type: Function, default: (v) => String(v) },
    valueName: { type: String, default: 'Value' },
    refLines: { type: Array, default: () => [] },
    values: { type: Boolean, default: true },
    integerTicks: { type: Boolean, default: false },
    xTitle: { type: String, default: '' },
    ariaLabel: { type: String, default: 'Column chart' }
  },
  data() {
    return { width: 0, hover: null, padT: 16, padR: 8, ro: null }
  },
  computed: {
    padB() {
      return this.xTitle ? 34 : 22
    },
    padL() {
      const longest = Math.max(3, ...this.scale.ticks.map((t) => String(this.formatY(t)).length))
      return Math.min(72, 12 + longest * 6.6)
    },
    plotW() {
      return Math.max(10, this.width - this.padL - this.padR)
    },
    plotH() {
      return Math.max(10, this.height - this.padT - this.padB)
    },
    scale() {
      const vals = this.items.map((i) => Number(i.value) || 0).concat(this.refLines.map((r) => r.y))
      const lo = Math.min(0, ...vals)
      const hi = Math.max(0, ...vals)
      const n = niceTicks(lo, hi === lo ? lo + 1 : hi, 4)
      if (this.integerTicks) {
        const t = n.ticks.filter((v) => Number.isInteger(v))
        const top = Math.max(1, Math.ceil(n.hi))
        return { lo: n.lo, hi: Math.max(n.hi, top), ticks: t.length >= 2 ? t : [0, top] }
      }
      return { lo: n.lo, hi: n.hi, ticks: n.ticks }
    },
    band() {
      return this.plotW / Math.max(1, this.items.length)
    },
    barW() {
      return Math.max(3, Math.min(24, this.band * 0.62))
    },
    showValues() {
      return this.values && this.items.length <= 14 && this.band >= 34
    },
    labelEvery() {
      const need = Math.max(...this.items.map((i) => String(i.label).length), 1) * 6.4 + 8
      return Math.max(1, Math.ceil(need / this.band))
    },
    bars() {
      const r = 4
      return this.items.map((it, i) => {
        const v = Number(it.value) || 0
        const cx = this.padL + this.band * (i + 0.5)
        const x0 = cx - this.barW / 2
        const x1 = cx + this.barW / 2
        const y0 = this.Y(0)
        const y1 = this.Y(v)
        const h = Math.abs(y1 - y0)
        const rr = Math.min(r, h, this.barW / 2)
        let d
        if (v >= 0) d = `M${x0},${y0}V${y1 + rr}Q${x0},${y1} ${x0 + rr},${y1}H${x1 - rr}Q${x1},${y1} ${x1},${y1 + rr}V${y0}Z`
        else d = `M${x0},${y0}V${y1 - rr}Q${x0},${y1} ${x0 + rr},${y1}H${x1 - rr}Q${x1},${y1} ${x1},${y1 - rr}V${y0}Z`
        const color = it.color || (typeof this.color === 'function' ? this.color(it) : this.color)
        const top = Math.min(y0, y1)
        const bottom = Math.max(y0, y1)
        // Value at the bar's tip; when there is no room outside the plot, inside the tip (white).
        let labelY = v >= 0 ? top - 5 : bottom + 13
        let labelIn = false
        if (v >= 0 && labelY < 10) {
          labelY = top + 14
          labelIn = true
        } else if (v < 0 && labelY > this.padT + this.plotH - 2) {
          labelY = bottom - 6
          labelIn = true
        }
        if (labelIn && h < 20) labelIn = false
        return { ...it, value: v, cx, d, top, bottom, color, labelY, labelIn }
      })
    },
    tipStyle() {
      const b = this.bars[this.hover]
      const right = b.cx > this.width / 2
      return { left: (right ? b.cx - 14 : b.cx + 14) + 'px', top: '4px', transform: right ? 'translateX(-100%)' : 'none' }
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
    measure() {
      if (this.$refs.root) this.width = Math.floor(this.$refs.root.clientWidth)
    },
    Y(v) {
      const { lo, hi } = this.scale
      return this.padT + this.plotH - ((v - lo) / (hi - lo || 1)) * this.plotH
    }
  }
}
</script>

<style scoped>
.fbc {
  position: relative;
  width: 100%;
}
.fbc svg {
  display: block;
  overflow: visible;
}
.fbc__val {
  fill: var(--text-2);
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.fbc__val--in {
  fill: #fff;
}
.fbc__bar.is-hover path {
  filter: brightness(1.12);
}
.fbc__ref {
  stroke: var(--text-3);
  stroke-width: 1;
}
.fbc rect[tabindex]:focus-visible {
  outline: none;
  stroke: var(--accent);
  stroke-width: 2;
}
</style>
