<template>
  <div ref="root" class="pbars" :style="{ height: height + 'px' }">
    <svg v-if="width > 0" :width="width" :height="height" role="img" :aria-label="ariaLabel" @pointerleave="hover = -1">
      <template v-for="t in ticks" :key="'g' + t">
        <line :x1="padL" :x2="width - padR" :y1="y(t)" :y2="y(t)" class="grid" :class="{ base: t === 0 }" />
        <text :x="padL - 8" :y="y(t) + 4" class="axis" text-anchor="end">{{ formatY(t) }}</text>
      </template>
      <g v-for="(b, i) in bars" :key="i">
        <path v-if="b.start !== b.end" :d="barPath(i, b)" :fill="b.color" :opacity="hover >= 0 && hover !== i ? 0.5 : 1" />
        <line
          v-if="connectors && i < bars.length - 1"
          :x1="slotX(i) + (slot + barW) / 2"
          :x2="slotX(i + 1) + (slot - barW) / 2"
          :y1="y(b.end)"
          :y2="y(b.end)"
          class="conn"
        />
        <text v-if="showValues && slot > 44" :x="slotX(i) + slot / 2" :y="labelY(b)" class="val" text-anchor="middle">{{ b.short || '' }}</text>
        <rect :x="slotX(i)" :y="padT" :width="slot" :height="height - padT - padB" fill="transparent" @pointerenter="hover = i" @pointerdown="hover = i" />
      </g>
      <text v-for="i in xTicks" :key="'x' + i" :x="slotX(i) + slot / 2" :y="height - (xLines(i).length > 1 ? 18 : 6)" class="axis" text-anchor="middle">
        <tspan v-for="(ln, j) in xLines(i)" :key="j" :x="slotX(i) + slot / 2" :dy="j ? 12 : 0">{{ ln }}</tspan>
      </text>
    </svg>
    <div v-if="hover >= 0 && width && bars[hover]" class="dviz-tooltip" :style="tipStyle">
      <div class="dviz-tooltip__title">{{ bars[hover].title || bars[hover].label }}</div>
      <div class="dviz-tooltip__row">
        <span><i class="dviz-swatch" :style="{ background: bars[hover].color }"></i>{{ bars[hover].name || 'Amount' }}</span>
        <strong>{{ bars[hover].value }}</strong>
      </div>
      <div v-for="(dl, j) in bars[hover].details || []" :key="j" class="dviz-tooltip__row">
        <span>{{ dl[0] }}</span>
        <strong>{{ dl[1] }}</strong>
      </div>
    </div>
  </div>
</template>

<script>
import { niceScale } from '@/components/dashboard/analytics'

/**
 * Signed / floating bar chart (SVG, no dependencies) for the P&L waterfall and
 * the net-profit trend. bars: [{ label, start, end, color, value, short, title, name, details: [[k, v]] }]
 * — a bar spans start → end (both may be negative); a zero baseline is drawn.
 */
export default {
  name: 'PnlBars',
  props: {
    bars: { type: Array, default: () => [] },
    height: { type: Number, default: 220 },
    formatY: { type: Function, default: (v) => String(v) },
    connectors: { type: Boolean, default: false },
    showValues: { type: Boolean, default: false },
    ariaLabel: { type: String, default: 'Bar chart' }
  },
  data() {
    return { width: 0, hover: -1, padT: 18, padR: 4, ro: null }
  },
  computed: {
    // room for two-line category labels when a label doesn't fit its slot
    padB() {
      return this.bars.some((b, i) => this.xLines(i).length > 1) ? 36 : 24
    },
    range() {
      let lo = 0
      let hi = 0
      for (const b of this.bars) {
        lo = Math.min(lo, b.start, b.end)
        hi = Math.max(hi, b.start, b.end)
      }
      return { lo, hi }
    },
    scale() {
      const { lo, hi } = this.range
      const span = Math.max(hi, -lo)
      const s = niceScale(span || 1, 3)
      const step = s.step
      const top = hi > 0 ? Math.ceil(hi / step) * step : 0
      const bottom = lo < 0 ? Math.floor(lo / step) * step : 0
      return { top: top || (bottom ? 0 : step), bottom, step }
    },
    ticks() {
      const out = []
      const { top, bottom, step } = this.scale
      for (let v = bottom; v <= top + step / 2; v += step) out.push(Number(v.toFixed(10)))
      return out
    },
    padL() {
      const longest = Math.max(...this.ticks.map((t) => this.formatY(t).length), 3)
      return Math.min(78, 12 + longest * 6.4)
    },
    slot() {
      return (this.width - this.padL - this.padR) / Math.max(1, this.bars.length)
    },
    barW() {
      const gap = Math.max(2, Math.min(18, this.slot * 0.3))
      return Math.max(2, this.slot - gap)
    },
    xTicks() {
      const n = this.bars.length
      if (n <= 6) return [...Array(n).keys()] // few categories: always label every bar
      const room = Math.max(1, Math.floor((this.width - this.padL) / 58))
      const step = Math.max(1, Math.ceil(n / room))
      const out = []
      for (let i = 0; i < n; i += step) out.push(i)
      return out
    },
    tipStyle() {
      const px = this.slotX(this.hover) + this.slot / 2
      const right = px > this.width / 2
      return { top: '4px', left: (right ? px - 10 : px + 10) + 'px', transform: right ? 'translateX(-100%)' : 'none' }
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
    y(v) {
      const h = this.height - this.padT - this.padB
      const { top, bottom } = this.scale
      return this.padT + ((top - (Number(v) || 0)) / (top - bottom || 1)) * h
    },
    slotX(i) {
      return this.padL + i * this.slot
    },
    xLines(i) {
      const l = String(this.bars[i]?.label || '')
      if (!this.width || l.length * 6.3 <= this.slot - 4 || !l.includes(' ')) return [l]
      const k = l.indexOf(' ')
      return [l.slice(0, k), l.slice(k + 1)]
    },
    labelY(b) {
      const hi = Math.max(b.start, b.end)
      const lo = Math.min(b.start, b.end)
      return hi > 0 || lo >= 0 ? this.y(hi) - 5 : this.y(lo) + 13
    },
    barPath(i, b) {
      const w = this.barW
      const x0 = this.slotX(i) + (this.slot - w) / 2
      const a = this.y(Math.max(b.start, b.end))
      const z = this.y(Math.min(b.start, b.end))
      const r = Math.min(4, w / 2, (z - a) / 2)
      // rounded data-end: the end away from the start/baseline
      const up = b.end >= b.start
      if (up) return `M${x0},${z}V${a + r}Q${x0},${a} ${x0 + r},${a}H${x0 + w - r}Q${x0 + w},${a} ${x0 + w},${a + r}V${z}Z`
      return `M${x0},${a}V${z - r}Q${x0},${z} ${x0 + r},${z}H${x0 + w - r}Q${x0 + w},${z} ${x0 + w},${z - r}V${a}Z`
    }
  }
}
</script>

<style scoped>
.pbars {
  position: relative;
  width: 100%;
}

svg {
  display: block;
  overflow: visible;
}

.grid {
  stroke: var(--viz-grid, var(--border));
  stroke-dasharray: 2 4;
}

.grid.base {
  stroke-dasharray: none;
  stroke: var(--border-strong);
}

.conn {
  stroke: var(--text-3);
  stroke-dasharray: 3 3;
}

.axis {
  fill: var(--viz-axis, var(--text-3));
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.val {
  fill: var(--text-2);
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
</style>
