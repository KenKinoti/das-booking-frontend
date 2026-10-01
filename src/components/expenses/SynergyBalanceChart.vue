<template>
  <div ref="root" class="bchart" :style="{ height: height + 'px' }">
    <svg v-if="width > 0 && pts.length" :width="width" :height="height" role="img" :aria-label="ariaLabel" @pointermove="onMove" @pointerleave="hover = -1" @pointerdown="onMove">
      <g>
        <template v-for="t in ticks" :key="'t' + t">
          <line :x1="padL" :x2="width - padR" :y1="y(t)" :y2="y(t)" class="grid" :class="{ zero: t === 0 }" />
          <text :x="padL - 6" :y="y(t) + 4" class="axis" text-anchor="end">{{ fmtTick(t) }}</text>
        </template>
      </g>
      <rect v-if="minV < 0" :x="padL" :y="y(0)" :width="Math.max(0, width - padL - padR)" :height="Math.max(0, y(minV) - y(0))" class="neg" />
      <path :d="path" fill="none" class="line" stroke-width="2" stroke-linejoin="round" />
      <circle v-for="(p, i) in pts" :key="'p' + i" :cx="x(i)" :cy="y(p.balance)" r="2.5" :class="p.balance < 0 ? 'dot-neg' : 'dot'" />
      <text v-for="i in xTicks" :key="'x' + i" :x="x(i)" :y="height - 6" class="axis" :text-anchor="i === 0 ? 'start' : i === pts.length - 1 ? 'end' : 'middle'">{{ fmtDate(pts[i].date) }}</text>
      <line v-if="hover >= 0" :x1="x(hover)" :x2="x(hover)" :y1="padT" :y2="height - padB" class="cross" />
    </svg>
    <div v-if="hover >= 0 && width" class="dviz-tooltip" :style="tipStyle">
      <div class="dviz-tooltip__title">{{ fmtDate(pts[hover].date, true) }}</div>
      <div class="dviz-tooltip__row">
        <span>Balance</span><strong :class="pts[hover].balance < 0 ? 'neg-txt' : ''">{{ fmt(pts[hover].balance) }}</strong>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SynergyBalanceChart',
  props: {
    points: { type: Array, default: () => [] }, // [{ date: 'YYYY-MM-DD', balance }]
    height: { type: Number, default: 190 },
    format: { type: Function, default: (v) => String(v) },
    ariaLabel: { type: String, default: 'Account balance over time' }
  },
  data() {
    return { width: 0, hover: -1, padT: 10, padR: 8, padB: 24, padL: 58, ro: null }
  },
  computed: {
    pts() {
      return this.points || []
    },
    maxV() {
      return Math.max(0, ...this.pts.map((p) => p.balance))
    },
    minV() {
      return Math.min(0, ...this.pts.map((p) => p.balance))
    },
    step() {
      const span = this.maxV - this.minV || 1
      const raw = span / 4
      const mag = Math.pow(10, Math.floor(Math.log10(raw)))
      const n = raw / mag
      return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag
    },
    ticks() {
      const lo = Math.floor(this.minV / this.step) * this.step
      const hi = Math.ceil(this.maxV / this.step) * this.step || this.step
      const out = []
      for (let v = lo; v <= hi + this.step / 2; v += this.step) out.push(Number(v.toFixed(6)))
      return out
    },
    lo() {
      return this.ticks[0]
    },
    hi() {
      return this.ticks[this.ticks.length - 1]
    },
    path() {
      return this.pts.map((p, i) => `${i ? 'L' : 'M'}${this.x(i).toFixed(1)},${this.y(p.balance).toFixed(1)}`).join(' ')
    },
    xTicks() {
      const n = this.pts.length
      if (n <= 1) return n ? [0] : []
      const want = Math.max(2, Math.floor(this.width / 90))
      const every = Math.max(1, Math.ceil((n - 1) / (want - 1)))
      const out = []
      for (let i = 0; i < n - 1; i += every) out.push(i)
      if (n - 1 - out[out.length - 1] < every / 2 && out.length > 1) out.pop()
      out.push(n - 1)
      return out
    },
    tipStyle() {
      const left = Math.min(Math.max(this.x(this.hover) + 10, 0), Math.max(0, this.width - 170))
      return { left: left + 'px', top: '8px' }
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
    this.ro?.disconnect()
  },
  methods: {
    measure() {
      this.width = this.$refs.root?.clientWidth || 0
    },
    x(i) {
      const n = this.pts.length
      if (n <= 1) return this.padL + (this.width - this.padL - this.padR) / 2
      return this.padL + (i / (n - 1)) * (this.width - this.padL - this.padR)
    },
    y(v) {
      const h = this.height - this.padT - this.padB
      return this.padT + (1 - (v - this.lo) / (this.hi - this.lo || 1)) * h
    },
    fmt(v) {
      return this.format(v)
    },
    fmtTick(v) {
      return this.format(v).replace(/\.00$/, '')
    },
    fmtDate(d, long = false) {
      const t = new Date(d + 'T00:00:00')
      return t.toLocaleDateString(undefined, long ? { day: 'numeric', month: 'short', year: 'numeric' } : { day: 'numeric', month: 'short' })
    },
    onMove(e) {
      const r = this.$refs.root.getBoundingClientRect()
      const px = e.clientX - r.left
      const n = this.pts.length
      if (!n) return
      const i = Math.round(((px - this.padL) / Math.max(1, this.width - this.padL - this.padR)) * (n - 1))
      this.hover = Math.max(0, Math.min(n - 1, i))
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
  touch-action: pan-y;
}
.grid {
  stroke: var(--viz-grid, var(--border));
  stroke-width: 1;
}
.grid.zero {
  stroke: var(--text-3);
  stroke-dasharray: 3 3;
}
.axis {
  fill: var(--viz-axis, var(--text-3));
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}
.neg {
  fill: var(--danger-soft);
  opacity: 0.6;
}
.line {
  stroke: var(--viz-1);
}
.dot {
  fill: var(--viz-1);
}
.dot-neg {
  fill: var(--danger);
}
.cross {
  stroke: var(--text-3);
  stroke-dasharray: 3 3;
}
.neg-txt {
  color: var(--danger);
}
</style>
