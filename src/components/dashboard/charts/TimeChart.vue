<template>
  <div ref="root" class="tchart" :style="{ height: height + 'px' }">
    <svg
      v-if="width > 0"
      :width="width"
      :height="height"
      class="tchart__svg"
      role="img"
      :aria-label="ariaLabel"
      @pointermove="onMove"
      @pointerleave="hover = -1"
      @pointerdown="onMove"
    >
      <!-- grid + y axis -->
      <g>
        <template v-for="t in scale.ticks" :key="'g' + t">
          <line :x1="padL" :x2="width - padR" :y1="y(t)" :y2="y(t)" class="grid" :class="{ base: t === 0 }" />
          <text :x="padL - 8" :y="y(t) + 4" class="axis" text-anchor="end">{{ formatY(t) }}</text>
        </template>
      </g>
      <!-- x axis labels -->
      <g>
        <text v-for="i in xTicks" :key="'x' + i" :x="x(i)" :y="height - 6" class="axis" :text-anchor="i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'">
          {{ formatX(labels[i]) }}
        </text>
      </g>
      <!-- series -->
      <g v-for="s in drawn" :key="s.key">
        <path v-if="s.type === 'area'" :d="s.area" :fill="s.color" fill-opacity="0.13" />
        <path
          :d="s.line"
          fill="none"
          :stroke="s.color"
          :stroke-width="s.dashed ? 1.75 : 2"
          :stroke-dasharray="s.dashed ? '5 4' : null"
          stroke-linejoin="round"
          stroke-linecap="round"
        />
      </g>
      <!-- single-point series need a visible mark -->
      <template v-if="n === 1">
        <circle v-for="s in drawn" :key="'one' + s.key" :cx="x(0)" :cy="y(s.values[0])" r="4" :fill="s.color" />
      </template>
      <!-- hover -->
      <g v-if="hover >= 0">
        <line :x1="x(hover)" :x2="x(hover)" :y1="padT" :y2="height - padB" class="cross" />
        <circle
          v-for="s in drawn"
          :key="'h' + s.key"
          :cx="x(hover)"
          :cy="y(s.values[hover])"
          r="4.5"
          :fill="s.color"
          stroke="var(--surface)"
          stroke-width="2"
        />
      </g>
      <rect :x="padL" :y="padT" :width="Math.max(0, width - padL - padR)" :height="Math.max(0, height - padT - padB)" fill="transparent" />
    </svg>
    <div v-if="hover >= 0 && width" class="dviz-tooltip" :style="tipStyle">
      <div class="dviz-tooltip__title">{{ formatTitle(labels[hover], hover) }}</div>
      <div v-for="s in drawn" :key="'t' + s.key" class="dviz-tooltip__row">
        <span>
          <i class="dviz-swatch" :class="{ 'dviz-swatch--dashed': s.dashed, 'dviz-swatch--line': s.type !== 'area' && !s.dashed }" :style="{ background: s.color }"></i>
          {{ s.tipName ? s.tipName(hover) : s.name }}
        </span>
        <strong>{{ formatValue(s.values[hover], s) }}</strong>
      </div>
    </div>
  </div>
</template>

<script>
import { niceScale } from '../analytics'

export default {
  name: 'TimeChart',
  props: {
    labels: { type: Array, default: () => [] },
    // [{ key, name, values, color, type: 'area'|'line', dashed, tipName(i) }]
    series: { type: Array, default: () => [] },
    height: { type: Number, default: 280 },
    formatY: { type: Function, default: (v) => String(v) },
    formatX: { type: Function, default: (v) => String(v) },
    formatTitle: { type: Function, default: (v) => String(v) },
    formatValue: { type: Function, default: (v) => String(v) },
    ariaLabel: { type: String, default: 'Time series chart' }
  },
  data() {
    return { width: 0, hover: -1, padT: 12, padR: 8, padB: 26, ro: null }
  },
  computed: {
    n() {
      return this.labels.length
    },
    padL() {
      const longest = Math.max(...this.scale.ticks.map((t) => this.formatY(t).length), 3)
      return Math.min(80, 14 + longest * 6.6)
    },
    scale() {
      let max = 0
      for (const s of this.series) for (const v of s.values || []) max = Math.max(max, Number(v) || 0)
      return niceScale(max, 4)
    },
    xTicks() {
      const n = this.n
      if (n <= 1) return n ? [0] : []
      const room = Math.max(2, Math.floor((this.width - this.padL) / 78))
      const step = Math.max(1, Math.ceil((n - 1) / (room - 1)))
      const out = []
      for (let i = 0; i < n; i += step) out.push(i)
      if (out[out.length - 1] !== n - 1) {
        if (n - 1 - out[out.length - 1] < step / 2) out.pop()
        out.push(n - 1)
      }
      return out
    },
    drawn() {
      return this.series
        .filter((s) => s && s.values && s.values.length)
        .map((s) => {
          const pts = s.values.map((v, i) => [this.x(i), this.y(Number(v) || 0)])
          const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('')
          const base = this.y(0)
          const area = pts.length ? `${line}L${pts[pts.length - 1][0].toFixed(1)},${base}L${pts[0][0].toFixed(1)},${base}Z` : ''
          return { ...s, line, area }
        })
    },
    tipStyle() {
      const px = this.x(this.hover)
      const left = px > this.width / 2 ? px - 14 : px + 14
      return {
        top: '8px',
        left: left + 'px',
        transform: px > this.width / 2 ? 'translateX(-100%)' : 'none'
      }
    }
  },
  mounted() {
    this.measure()
    if (typeof ResizeObserver !== 'undefined') {
      this.ro = new ResizeObserver(() => this.measure())
      this.ro.observe(this.$refs.root)
    } else {
      window.addEventListener('resize', this.measure)
    }
  },
  beforeUnmount() {
    if (this.ro) this.ro.disconnect()
    window.removeEventListener('resize', this.measure)
  },
  methods: {
    measure() {
      if (this.$refs.root) this.width = Math.floor(this.$refs.root.clientWidth)
    },
    x(i) {
      const w = this.width - this.padL - this.padR
      if (this.n <= 1) return this.padL + w / 2
      return this.padL + (i / (this.n - 1)) * w
    },
    y(v) {
      const h = this.height - this.padT - this.padB
      return this.padT + h - ((Number(v) || 0) / this.scale.max) * h
    },
    onMove(e) {
      if (!this.n) return
      const rect = this.$refs.root.getBoundingClientRect()
      const px = e.clientX - rect.left
      const w = this.width - this.padL - this.padR
      const i = this.n <= 1 ? 0 : Math.round(((px - this.padL) / w) * (this.n - 1))
      this.hover = Math.max(0, Math.min(this.n - 1, i))
    }
  }
}
</script>

<style scoped>
.tchart {
  position: relative;
  width: 100%;
  touch-action: pan-y;
}

.tchart__svg {
  display: block;
  overflow: visible;
}

.grid {
  stroke: var(--viz-grid, var(--border));
  stroke-width: 1;
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

.cross {
  stroke: var(--border-strong);
  stroke-width: 1;
}
</style>
