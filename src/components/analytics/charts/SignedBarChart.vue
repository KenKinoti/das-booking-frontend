<template>
  <div ref="root" class="sbchart" :style="{ height: height + 'px' }">
    <svg v-if="width > 0" :width="width" :height="height" role="img" :aria-label="ariaLabel" @pointerleave="hover = -1">
      <template v-for="t in ticks" :key="'g' + t">
        <line :x1="padL" :x2="width - padR" :y1="y(t)" :y2="y(t)" class="grid" :class="{ base: t === 0 }" />
        <text :x="padL - 8" :y="y(t) + 4" class="axis" text-anchor="end">{{ formatY(t) }}</text>
      </template>
      <g v-for="(v, i) in values" :key="i">
        <path v-if="Number(v)" :d="barPath(i, Number(v))" :fill="barColor(i)" :opacity="hover >= 0 && hover !== i ? 0.55 : 1" />
        <rect :x="slotX(i)" :y="padT" :width="slot" :height="height - padT - padB" fill="transparent" @pointerenter="hover = i" @pointerdown="hover = i" @click="$emit('select', i)" />
      </g>
      <line :x1="padL" :x2="width - padR" :y1="y(0)" :y2="y(0)" class="zero" />
      <text v-for="i in xTicks" :key="'x' + i" :x="slotX(i) + slot / 2" :y="height - 6" class="axis" text-anchor="middle">{{ formatX(labels[i], i) }}</text>
    </svg>
    <div v-if="hover >= 0 && width" class="dviz-tooltip" :style="tipStyle">
      <div class="dviz-tooltip__title">{{ formatTitle(labels[hover], hover) }}</div>
      <div class="dviz-tooltip__row">
        <span><i class="dviz-swatch" :style="{ background: barColor(hover) }"></i>{{ valueName }}</span>
        <strong>{{ formatValue(values[hover], hover) }}</strong>
      </div>
      <div v-if="detail" class="dviz-tooltip__row">
        <span>{{ detail(hover) }}</span>
      </div>
    </div>
  </div>
</template>

<script>
import { niceScale } from '@/components/dashboard/analytics'

// Bar chart that handles negative values (bars grow from a zero line).
export default {
  name: 'SignedBarChart',
  props: {
    labels: { type: Array, default: () => [] },
    values: { type: Array, default: () => [] },
    colors: { type: Array, default: null },
    color: { type: String, default: 'var(--viz-1)' },
    height: { type: Number, default: 200 },
    valueName: { type: String, default: 'Value' },
    formatY: { type: Function, default: (v) => String(v) },
    formatX: { type: Function, default: (v) => String(v) },
    formatTitle: { type: Function, default: (v) => String(v) },
    formatValue: { type: Function, default: (v) => String(v) },
    detail: { type: Function, default: null },
    ariaLabel: { type: String, default: 'Bar chart' }
  },
  emits: ['select'],
  data() {
    return { width: 0, hover: -1, padT: 10, padR: 4, padB: 28, ro: null }
  },
  computed: {
    posScale() {
      return niceScale(Math.max(0, ...this.values.map((v) => Number(v) || 0)), 3)
    },
    negScale() {
      return niceScale(Math.max(0, ...this.values.map((v) => -(Number(v) || 0))), 3)
    },
    hasNeg() {
      return this.values.some((v) => Number(v) < 0)
    },
    hasPos() {
      return this.values.some((v) => Number(v) > 0)
    },
    top() {
      return this.hasPos || !this.hasNeg ? this.posScale.max : 0
    },
    bottom() {
      return this.hasNeg ? -this.negScale.max : 0
    },
    ticks() {
      const step = Math.max(this.hasPos ? this.posScale.step : 0, this.hasNeg ? this.negScale.step : 0) || 1
      const out = []
      for (let t = 0; t <= this.top + step / 2; t += step) out.push(Number(t.toFixed(10)))
      for (let t = -step; t >= this.bottom - step / 2; t -= step) out.push(Number(t.toFixed(10)))
      return out
    },
    padL() {
      const longest = Math.max(...this.ticks.map((t) => this.formatY(t).length), 3)
      return Math.min(76, 12 + longest * 6.4)
    },
    slot() {
      return (this.width - this.padL - this.padR) / Math.max(1, this.values.length)
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
      const span = this.top - this.bottom || 1
      return this.padT + ((this.top - v) / span) * h
    },
    slotX(i) {
      return this.padL + i * this.slot
    },
    barColor(i) {
      return (this.colors && this.colors[i]) || this.color
    },
    barPath(i, v) {
      const gap = Math.max(2, Math.min(10, this.slot * 0.28))
      const w = Math.max(2, this.slot - gap)
      const x0 = this.slotX(i) + (this.slot - w) / 2
      const base = this.y(0)
      const end = this.y(v)
      const r = Math.min(4, w / 2, Math.abs(base - end) / 2)
      if (v >= 0) return `M${x0},${base}V${end + r}Q${x0},${end} ${x0 + r},${end}H${x0 + w - r}Q${x0 + w},${end} ${x0 + w},${end + r}V${base}Z`
      return `M${x0},${base}V${end - r}Q${x0},${end} ${x0 + r},${end}H${x0 + w - r}Q${x0 + w},${end} ${x0 + w},${end - r}V${base}Z`
    }
  }
}
</script>

<style scoped>
.sbchart {
  position: relative;
  width: 100%;
}

svg {
  display: block;
  overflow: visible;
}

.grid {
  stroke: var(--viz-grid);
  stroke-width: 1;
  stroke-dasharray: 2 4;
}

.zero {
  stroke: var(--border-strong);
  stroke-width: 1;
}

.axis {
  fill: var(--viz-axis);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}
</style>
