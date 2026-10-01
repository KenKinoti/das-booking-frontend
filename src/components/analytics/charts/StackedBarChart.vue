<template>
  <div ref="root" class="stchart" :style="{ height: height + 'px' }">
    <svg v-if="width > 0" :width="width" :height="height" role="img" :aria-label="ariaLabel" @pointerleave="hover = -1">
      <template v-for="t in scale.ticks" :key="'g' + t">
        <line :x1="padL" :x2="width - padR" :y1="y(t)" :y2="y(t)" class="grid" :class="{ base: t === 0 }" />
        <text :x="padL - 8" :y="y(t) + 4" class="axis" text-anchor="end">{{ formatY(t) }}</text>
      </template>
      <g v-for="(lab, i) in labels" :key="i" :opacity="hover >= 0 && hover !== i ? 0.55 : 1">
        <rect v-for="seg in segs[i]" :key="seg.key" :x="bx(i)" :y="seg.y" :width="bw" :height="seg.h" :fill="seg.color" :rx="seg.top ? 3 : 0" />
        <rect :x="padL + i * slot" :y="padT" :width="slot" :height="height - padT - padB" fill="transparent" @pointerenter="hover = i" @pointerdown="hover = i" />
      </g>
      <text v-for="i in xTicks" :key="'x' + i" :x="padL + i * slot + slot / 2" :y="height - 6" class="axis" text-anchor="middle">{{ formatX(labels[i]) }}</text>
    </svg>
    <div v-if="hover >= 0 && width" class="dviz-tooltip" :style="tipStyle">
      <div class="dviz-tooltip__title">{{ formatTitle(labels[hover]) }}</div>
      <div v-for="s in series" v-show="Number(s.values[hover])" :key="s.key" class="dviz-tooltip__row">
        <span><i class="dviz-swatch" :style="{ background: s.color }"></i>{{ s.name }}</span>
        <strong>{{ formatValue(s.values[hover]) }}</strong>
      </div>
      <div class="dviz-tooltip__row">
        <span>Total</span><strong>{{ formatValue(totals[hover]) }}</strong>
      </div>
    </div>
  </div>
</template>

<script>
import { niceScale } from '@/components/dashboard/analytics'

// Stacked bars (positive parts only), 2px surface gap between segments.
export default {
  name: 'StackedBarChart',
  props: {
    labels: { type: Array, default: () => [] },
    series: { type: Array, default: () => [] }, // [{ key, name, values, color }]
    height: { type: Number, default: 240 },
    formatY: { type: Function, default: (v) => String(v) },
    formatX: { type: Function, default: (v) => String(v) },
    formatTitle: { type: Function, default: (v) => String(v) },
    formatValue: { type: Function, default: (v) => String(v) },
    ariaLabel: { type: String, default: 'Stacked bar chart' }
  },
  data() {
    return { width: 0, hover: -1, padT: 10, padR: 4, padB: 24, ro: null }
  },
  computed: {
    totals() {
      return this.labels.map((_, i) => this.series.reduce((s, x) => s + (Number(x.values[i]) || 0), 0))
    },
    scale() {
      const pos = this.labels.map((_, i) => this.series.reduce((s, x) => s + Math.max(0, Number(x.values[i]) || 0), 0))
      return niceScale(Math.max(0, ...pos), 3)
    },
    padL() {
      const longest = Math.max(...this.scale.ticks.map((t) => this.formatY(t).length), 3)
      return Math.min(76, 12 + longest * 6.4)
    },
    slot() {
      return (this.width - this.padL - this.padR) / Math.max(1, this.labels.length)
    },
    bw() {
      return Math.max(2, this.slot - Math.max(2, Math.min(10, this.slot * 0.28)))
    },
    segs() {
      return this.labels.map((_, i) => {
        let acc = 0
        const out = []
        const parts = this.series.filter((s) => Number(s.values[i]) > 0)
        parts.forEach((s, j) => {
          const v = Number(s.values[i])
          const y0 = this.y(acc)
          const y1 = this.y(acc + v)
          acc += v
          const gap = j < parts.length - 1 ? 0 : 0
          out.push({ key: s.key, y: y1, h: Math.max(0, y0 - y1 - (j > 0 ? 2 : 0)) - gap, color: s.color, top: j === parts.length - 1 })
        })
        return out
      })
    },
    xTicks() {
      const n = this.labels.length
      const room = Math.max(1, Math.floor((this.width - this.padL) / 56))
      const step = Math.max(1, Math.ceil(n / room))
      const out = []
      for (let i = 0; i < n; i += step) out.push(i)
      return out
    },
    tipStyle() {
      const px = this.padL + this.hover * this.slot + this.slot / 2
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
      return this.padT + h - (v / this.scale.max) * h
    },
    bx(i) {
      return this.padL + i * this.slot + (this.slot - this.bw) / 2
    }
  }
}
</script>

<style scoped>
.stchart {
  position: relative;
  width: 100%;
}

svg {
  display: block;
  overflow: visible;
}

.grid {
  stroke: var(--viz-grid);
  stroke-dasharray: 2 4;
}

.grid.base {
  stroke: var(--border-strong);
  stroke-dasharray: none;
}

.axis {
  fill: var(--viz-axis);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}
</style>
