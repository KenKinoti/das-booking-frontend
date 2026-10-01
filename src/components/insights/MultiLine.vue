<template>
  <div ref="root" class="ml" :style="{ height: height + 'px' }">
    <svg v-if="width > 0" :width="width" :height="height" role="img" :aria-label="ariaLabel" @pointermove="onMove" @pointerleave="hover = -1" @pointerdown="onMove">
      <template v-for="t in ticks" :key="'g' + t">
        <line :x1="padL" :x2="width - padR" :y1="y(t)" :y2="y(t)" class="grid" />
        <text :x="padL - 6" :y="y(t) + 3.5" class="axis" text-anchor="end">{{ formatY(t) }}</text>
      </template>
      <text v-for="(xv, i) in xs" v-show="i === 0 || i === xs.length - 1 || (xs.length <= 8 && i % 2 === 0)" :key="'x' + xv" :x="x(i)" :y="height - 4" class="axis" :text-anchor="i === 0 ? 'start' : i === xs.length - 1 ? 'end' : 'middle'">{{ formatX(xv) }}</text>
      <g v-for="s in drawn" :key="s.key">
        <path :d="s.path" fill="none" :stroke="s.color" :stroke-width="s.strong ? 2 : 1.5" :stroke-opacity="s.strong ? 1 : 0.85" stroke-linejoin="round" stroke-linecap="round" />
        <circle v-if="s.last" :cx="s.last.x" :cy="s.last.y" r="3" :fill="s.color" stroke="var(--surface)" stroke-width="1.5" />
      </g>
      <g v-if="hover >= 0">
        <line :x1="x(hover)" :x2="x(hover)" :y1="padT" :y2="height - padB" class="cross" />
        <template v-for="s in drawn" :key="'h' + s.key">
          <circle v-if="s.values[hover] != null" :cx="x(hover)" :cy="y(s.values[hover])" r="3.5" :fill="s.color" stroke="var(--surface)" stroke-width="1.5" />
        </template>
      </g>
    </svg>
    <div v-if="hover >= 0 && width" class="dviz-tooltip" :style="tipStyle">
      <div class="dviz-tooltip__title">{{ formatX(xs[hover]) }}</div>
      <div v-for="s in series" :key="'t' + s.key" class="dviz-tooltip__row">
        <span><i class="dviz-swatch dviz-swatch--line" :style="{ background: s.color }"></i>{{ s.name }}</span>
        <strong>{{ s.values[hover] == null ? 'no data' : formatValue(s.values[hover]) }}</strong>
      </div>
    </div>
  </div>
</template>

<script>
// Compact multi-series line chart for small multiples; null values make gaps.
export default {
  name: 'MultiLine',
  props: {
    xs: { type: Array, default: () => [] },
    series: { type: Array, default: () => [] }, // [{ key, name, values (aligned to xs, null = gap), color, strong }]
    height: { type: Number, default: 120 },
    formatY: { type: Function, default: (v) => String(v) },
    formatX: { type: Function, default: (v) => String(v) },
    formatValue: { type: Function, default: (v) => String(v) },
    ariaLabel: { type: String, default: 'Trend' }
  },
  data() {
    return { width: 0, hover: -1, padT: 8, padR: 6, padB: 18, ro: null }
  },
  computed: {
    vals() {
      return this.series.flatMap((s) => s.values.filter((v) => v != null && Number.isFinite(Number(v))).map(Number))
    },
    lo() {
      const m = Math.min(...this.vals)
      return this.vals.length ? (m >= 0 && m < (this.hi - m) * 0.6 ? 0 : m) : 0
    },
    hi() {
      return this.vals.length ? Math.max(...this.vals) : 1
    },
    range() {
      const span = this.hi - this.lo || Math.abs(this.hi) || 1
      return { lo: this.lo - (this.lo === 0 ? 0 : span * 0.08), hi: this.hi + span * 0.08 }
    },
    ticks() {
      const { lo, hi } = this.range
      return [lo, (lo + hi) / 2, hi].map((v) => Number(v.toPrecision(3)))
    },
    padL() {
      return Math.min(54, 10 + Math.max(...this.ticks.map((t) => this.formatY(t).length), 2) * 6)
    },
    drawn() {
      return this.series.map((s) => {
        let d = ''
        let pen = false
        let last = null
        s.values.forEach((v, i) => {
          if (v == null || !Number.isFinite(Number(v))) {
            pen = false
            return
          }
          const px = this.x(i)
          const py = this.y(Number(v))
          d += `${pen ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}`
          pen = true
          last = { x: px, y: py }
        })
        return { ...s, path: d, last }
      })
    },
    tipStyle() {
      const px = this.x(this.hover)
      const right = px > this.width / 2
      return { top: '0px', left: (right ? px - 8 : px + 8) + 'px', transform: right ? 'translateX(-100%)' : 'none' }
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
    x(i) {
      const n = Math.max(1, this.xs.length - 1)
      return this.padL + (i / n) * (this.width - this.padL - this.padR)
    },
    y(v) {
      const { lo, hi } = this.range
      const h = this.height - this.padT - this.padB
      return this.padT + h - ((v - lo) / (hi - lo || 1)) * h
    },
    onMove(e) {
      const r = this.$refs.root.getBoundingClientRect()
      const px = e.clientX - r.left
      const n = this.xs.length
      if (!n) return
      const i = Math.round(((px - this.padL) / (this.width - this.padL - this.padR)) * (n - 1))
      this.hover = Math.max(0, Math.min(n - 1, i))
    }
  }
}
</script>

<style scoped>
.ml {
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

.cross {
  stroke: var(--border-strong);
}

.axis {
  fill: var(--viz-axis);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
}
</style>
