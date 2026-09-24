<template>
  <div ref="root" class="bchart" :style="{ height: height + 'px' }">
    <svg v-if="width > 0" :width="width" :height="height" role="img" :aria-label="ariaLabel" @pointerleave="hover = -1">
      <template v-for="t in scale.ticks" :key="'g' + t">
        <line :x1="padL" :x2="width - padR" :y1="y(t)" :y2="y(t)" class="grid" :class="{ base: t === 0 }" />
        <text :x="padL - 8" :y="y(t) + 4" class="axis" text-anchor="end">{{ formatY(t) }}</text>
      </template>
      <g v-for="(v, i) in values" :key="i">
        <path v-if="Number(v) > 0" :d="barPath(i, v)" :fill="barColor(i)" :opacity="hover >= 0 && hover !== i ? 0.55 : 1" />
        <rect
          :x="slotX(i)"
          :y="padT"
          :width="slot"
          :height="height - padT - padB"
          fill="transparent"
          @pointerenter="hover = i"
          @pointerdown="hover = i"
        />
      </g>
      <text
        v-for="i in xTicks"
        :key="'x' + i"
        :x="slotX(i) + slot / 2"
        :y="height - 6"
        class="axis"
        text-anchor="middle"
      >
        {{ formatX(labels[i], i) }}
      </text>
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
import { niceScale } from '../analytics'

export default {
  name: 'BarChart',
  props: {
    labels: { type: Array, default: () => [] },
    values: { type: Array, default: () => [] },
    colors: { type: Array, default: null }, // per-bar override
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
  data() {
    return { width: 0, hover: -1, padT: 10, padR: 4, padB: 24, ro: null }
  },
  computed: {
    scale() {
      return niceScale(Math.max(0, ...this.values.map((v) => Number(v) || 0)), 3)
    },
    padL() {
      const longest = Math.max(...this.scale.ticks.map((t) => this.formatY(t).length), 3)
      return Math.min(72, 12 + longest * 6.4)
    },
    slot() {
      const n = Math.max(1, this.values.length)
      return (this.width - this.padL - this.padR) / n
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
      return this.padT + h - ((Number(v) || 0) / this.scale.max) * h
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
      const top = this.y(v)
      const base = this.y(0)
      const r = Math.min(4, w / 2, (base - top) / 2)
      return `M${x0},${base}V${top + r}Q${x0},${top} ${x0 + r},${top}H${x0 + w - r}Q${x0 + w},${top} ${x0 + w},${top + r}V${base}Z`
    }
  }
}
</script>

<style scoped>
.bchart {
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

.axis {
  fill: var(--viz-axis, var(--text-3));
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}
</style>
