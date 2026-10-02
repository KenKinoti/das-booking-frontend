<template>
  <div class="cc">
    <div ref="root" class="cc__plot" :style="{ height: height + 'px' }">
      <svg v-if="width > 0" :width="width" :height="height" role="img" :aria-label="ariaLabel" @pointermove="onMove" @pointerleave="hover = -1" @pointerdown="onMove">
        <defs>
          <clipPath :id="clipId"><rect :x="padL" :y="padT - 2" :width="Math.max(0, width - padL - padR)" :height="height - padT - padB + 4" /></clipPath>
        </defs>
        <template v-for="t in ticks" :key="'g' + t">
          <line :x1="padL" :x2="width - padR" :y1="y(t)" :y2="y(t)" class="grid" />
          <text :x="padL - 6" :y="y(t) + 3.5" class="axis" text-anchor="end">{{ formatY(t) }}</text>
        </template>
        <text v-for="t in xTicks" :key="'x' + t" :x="x(t)" :y="height - 18" class="axis" text-anchor="middle">{{ t }}</text>
        <text :x="padL + (width - padL - padR) / 2" :y="height - 3" class="axis title" text-anchor="middle">sites on the server</text>
        <!-- where the server is now -->
        <g v-if="current >= xMin && current <= xMax">
          <line :x1="x(current)" :x2="x(current)" :y1="padT" :y2="height - padB" class="now" />
          <text :x="x(current) + (x(current) > width - 90 ? -5 : 5)" :y="padT + 9" class="axis nowlbl" :text-anchor="x(current) > width - 90 ? 'end' : 'start'">now · {{ current }}</text>
        </g>
        <g :clip-path="`url(#${clipId})`">
          <line v-for="p in planLines" :key="p.key" :x1="padL" :x2="width - padR" :y1="y(p.value)" :y2="y(p.value)" :stroke="p.color" stroke-width="2" stroke-linecap="round" />
          <path :d="selfPath" fill="none" :stroke="selfColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
        </g>
        <!-- break-even points -->
        <g v-for="p in crossings" :key="'be' + p.key">
          <circle :cx="x(p.sites)" :cy="y(p.value)" r="4.5" :fill="p.color" stroke="var(--surface)" stroke-width="2" />
          <text :x="x(p.sites)" :y="y(p.value) - 9" class="axis be" text-anchor="middle">{{ p.sites }}</text>
        </g>
        <g v-if="hover >= 0">
          <line :x1="x(xs[hover])" :x2="x(xs[hover])" :y1="padT" :y2="height - padB" class="cross" />
          <circle v-if="self[hover] <= yMax" :cx="x(xs[hover])" :cy="y(self[hover])" r="4" :fill="selfColor" stroke="var(--surface)" stroke-width="2" />
        </g>
      </svg>
      <div v-if="hover >= 0 && width" class="dviz-tooltip" :style="tipStyle">
        <div class="dviz-tooltip__title">{{ xs[hover] }} site{{ xs[hover] === 1 ? '' : 's' }}</div>
        <div class="dviz-tooltip__row">
          <span><i class="dviz-swatch dviz-swatch--line" :style="{ background: selfColor }"></i>{{ selfName }}</span>
          <strong>{{ formatValue(self[hover]) }}</strong>
        </div>
        <div v-for="p in planLines" :key="'t' + p.key" class="dviz-tooltip__row">
          <span><i class="dviz-swatch dviz-swatch--line" :style="{ background: p.color }"></i>{{ p.name }}</span>
          <strong>{{ formatValue(p.value) }}</strong>
        </div>
      </div>
    </div>
    <ul class="legend" aria-label="Legend">
      <li><i class="sw" :style="{ background: selfColor }"></i>{{ selfName }} <span class="muted">cost per site</span></li>
      <li v-for="p in planLines" :key="'l' + p.key"><i class="sw" :style="{ background: p.color }"></i>{{ p.name }} <span class="muted">{{ formatValue(p.value) }}</span></li>
    </ul>
  </div>
</template>

<script>
// Cost per site against the number of sites on a self-hosted server: one
// falling curve (the server) and one flat line per wholesale plan; a dot
// marks each break-even. One axis; the curve is clipped at the top so the
// plan prices stay readable.
const PLAN_COLORS = ['var(--viz-2)', 'var(--viz-3)', 'var(--viz-4)', 'var(--viz-5)', 'var(--viz-7)']
let uid = 0

export default {
  name: 'CostCurve',
  props: {
    xs: { type: Array, default: () => [] },
    self: { type: Array, default: () => [] },
    selfName: { type: String, default: 'Your server' },
    plans: { type: Array, default: () => [] }, // [{ key, name, value, sites }]
    current: { type: Number, default: 0 },
    height: { type: Number, default: 250 },
    formatY: { type: Function, default: (v) => String(v) },
    formatValue: { type: Function, default: (v) => String(v) },
    ariaLabel: { type: String, default: 'Cost per site by number of sites' }
  },
  data() {
    return { width: 0, hover: -1, padT: 10, padR: 10, padB: 34, ro: null, clipId: `cc-clip-${++uid}`, selfColor: 'var(--viz-1)' }
  },
  computed: {
    planLines() {
      return this.plans.slice(0, PLAN_COLORS.length).map((p, i) => ({ ...p, color: PLAN_COLORS[i] }))
    },
    xMin() {
      return this.xs.length ? this.xs[0] : 1
    },
    xMax() {
      return this.xs.length ? this.xs[this.xs.length - 1] : 1
    },
    yStep() {
      const plan = Math.max(0, ...this.plans.map((p) => p.value))
      const last = this.self.length ? this.self[this.self.length - 1] : 0
      const at = this.self.length ? this.self[Math.min(this.self.length - 1, Math.max(1, Math.round(this.self.length / 8)))] : 1
      const raw = (plan > 0 ? Math.max(plan * 2, last * 1.6) : at) || 1
      // A "nice" step (1, 2, 2.5 or 5 × a power of ten) for about three intervals.
      const rough = raw / 3
      const pow = Math.pow(10, Math.floor(Math.log10(rough)))
      const f = rough / pow
      return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * pow
    },
    yMax() {
      const plan = Math.max(0, ...this.plans.map((p) => p.value))
      const top = Math.max(plan * 1.25, this.yStep * 3)
      return Math.ceil(top / this.yStep - 1e-9) * this.yStep
    },
    ticks() {
      const out = []
      for (let v = 0; v <= this.yMax + 1e-9; v += this.yStep) out.push(Number(v.toPrecision(6)))
      return out
    },
    padL() {
      return Math.min(72, 12 + Math.max(...this.ticks.map((t) => String(this.formatY(t)).length), 2) * 6)
    },
    xTicks() {
      const a = this.xMin
      const b = this.xMax
      if (b <= a) return [a]
      const n = this.width < 420 ? 3 : 5
      const out = new Set()
      for (let i = 0; i < n; i++) out.add(Math.round(a + ((b - a) * i) / (n - 1)))
      return [...out]
    },
    selfPath() {
      let d = ''
      this.xs.forEach((n, i) => {
        const v = this.self[i]
        if (v == null) return
        d += `${d ? 'L' : 'M'}${this.x(n).toFixed(1)},${this.y(v).toFixed(1)}`
      })
      return d
    },
    crossings() {
      return this.planLines.filter((p) => p.sites > 0 && p.sites >= this.xMin && p.sites <= this.xMax && p.value <= this.yMax)
    },
    tipStyle() {
      const px = this.x(this.xs[this.hover])
      const right = px > this.width / 2
      return { top: '0px', left: (right ? px - 10 : px + 10) + 'px', transform: right ? 'translateX(-100%)' : 'none' }
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
    x(n) {
      const span = this.xMax - this.xMin || 1
      return this.padL + ((n - this.xMin) / span) * (this.width - this.padL - this.padR)
    },
    y(v) {
      const h = this.height - this.padT - this.padB
      return this.padT + h - (Math.max(0, v) / this.yMax) * h
    },
    onMove(e) {
      const r = this.$refs.root.getBoundingClientRect()
      const px = e.clientX - r.left
      const n = this.xs.length
      if (!n) return
      const target = this.xMin + ((px - this.padL) / (this.width - this.padL - this.padR)) * (this.xMax - this.xMin)
      let best = 0
      for (let i = 1; i < n; i++) if (Math.abs(this.xs[i] - target) < Math.abs(this.xs[best] - target)) best = i
      this.hover = best
    }
  }
}
</script>

<style scoped>
.cc__plot {
  position: relative;
  width: 100%;
}
svg {
  display: block;
  overflow: visible;
  touch-action: pan-y;
}
.grid {
  stroke: var(--viz-grid);
  stroke-dasharray: 2 4;
}
.cross {
  stroke: var(--border-strong);
}
.now {
  stroke: var(--text-3);
  stroke-dasharray: 3 3;
}
.axis {
  fill: var(--viz-axis);
  font-size: 10.5px;
  font-variant-numeric: tabular-nums;
}
.axis.title {
  font-size: 11px;
}
.axis.nowlbl,
.axis.be {
  fill: var(--text-2);
  font-weight: 600;
}
.legend {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px 18px;
  font-size: 12.5px;
  color: var(--text-2);
}
.legend li {
  display: inline-flex;
  gap: 6px;
  align-items: center;
}
.sw {
  width: 14px;
  height: 3px;
  border-radius: 2px;
  display: inline-block;
}
.muted {
  color: var(--text-3);
  font-variant-numeric: tabular-nums;
}
</style>
