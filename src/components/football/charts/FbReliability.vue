<template>
  <div ref="root" class="fbr" :style="{ height: height + 'px' }">
    <svg v-if="width > 0" :width="width" :height="height" role="img" :aria-label="ariaLabel">
      <!-- grid -->
      <template v-for="t in ticks" :key="'g' + t">
        <line :x1="X(0)" :x2="X(1)" :y1="Y(t)" :y2="Y(t)" :class="t === 0 ? 'fb-baseline' : 'fb-gridline'" />
        <text :x="X(0) - 6" :y="Y(t) + 3.5" class="fb-axis" text-anchor="end">{{ Math.round(t * 100) }}%</text>
        <text :x="X(t)" :y="Y(0) + 15" class="fb-axis" :text-anchor="t === 0 ? 'start' : t === 1 ? 'end' : 'middle'">{{ Math.round(t * 100) }}%</text>
      </template>
      <text :x="X(0.5)" :y="height - 2" class="fb-axis-title" text-anchor="middle">Forecast probability</text>
      <text :x="11" :y="Y(0.5)" class="fb-axis-title" text-anchor="middle" :transform="`rotate(-90 11 ${Y(0.5)})`">Observed frequency</text>
      <!-- perfect calibration -->
      <line :x1="X(0)" :y1="Y(0)" :x2="X(1)" :y2="Y(1)" class="fb-baseline" />
      <text :x="X(0.08)" :y="Y(0.08) - 6" class="fb-axis" :transform="`rotate(-45 ${X(0.08)} ${Y(0.08) - 6})`">perfect calibration</text>
      <!-- series -->
      <g v-for="s in drawn" :key="s.key" :data-series="s.key">
        <line v-for="(p, i) in s.pts" :key="'ci' + i" :x1="p.cx" :x2="p.cx" :y1="Y(p.ci_lo)" :y2="Y(p.ci_hi)" :stroke="s.color" stroke-width="1.5" stroke-opacity="0.55" stroke-linecap="round" />
        <path :d="s.d" fill="none" :stroke="s.color" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
        <circle v-for="(p, i) in s.pts" :key="'p' + i" :cx="p.cx" :cy="Y(p.freq)" r="4.5" :fill="s.color" stroke="var(--fb-surface)" stroke-width="2" class="fbr__pt" />
        <text v-if="s.pts.length && showEnd" :x="s.pts[s.pts.length - 1].cx + 8" :y="Y(s.pts[s.pts.length - 1].freq) + 4" class="fb-endlabel">{{ s.name }}</text>
      </g>
      <!-- hit targets (≥ 24px) -->
      <g>
        <template v-for="s in drawn" :key="'hit' + s.key">
          <circle
            v-for="(p, i) in s.pts"
            :key="i"
            :cx="p.cx"
            :cy="Y(p.freq)"
            r="12"
            fill="transparent"
            tabindex="0"
            :aria-label="`${s.name}, forecasts ${pctT(p.lo)}–${pctT(p.hi)}: ${p.n} forecasts, mean ${pctT(p.mean_p, 1)}, happened ${pctT(p.freq, 1)} (95% CI ${pctT(p.ci_lo)}–${pctT(p.ci_hi)})`"
            @pointerenter="show(s, p)"
            @pointerleave="tip = null"
            @focus="show(s, p)"
            @blur="tip = null"
          />
        </template>
      </g>
    </svg>
    <div v-if="tip" class="fb-tip" :style="tip.style" role="status">
      <div class="fb-tip__title">{{ tip.title }}</div>
      <div v-for="r in tip.rows" :key="r[0]" class="fb-tip__row">
        <span>{{ r[0] }}</span><strong>{{ r[1] }}</strong>
      </div>
    </div>
  </div>
</template>

<script>
// Reliability diagram: [{ key, name, color, bins: [{ lo, hi, mean_p, freq, n, ci_lo, ci_hi }] }].
export default {
  name: 'FbReliability',
  props: {
    series: { type: Array, default: () => [] },
    height: { type: Number, default: 300 },
    ariaLabel: { type: String, default: 'Reliability diagram' }
  },
  data() {
    return { width: 0, tip: null, ro: null, ticks: [0, 0.25, 0.5, 0.75, 1], padL: 48, padR: 64, padT: 10, padB: 34 }
  },
  computed: {
    // Direct labels at each series' last point, unless they would collide (the legend then carries identity).
    showEnd() {
      if (this.width < 360) return false
      const ys = this.drawn.filter((s) => s.pts.length).map((s) => this.Y(s.pts[s.pts.length - 1].freq))
      for (let i = 0; i < ys.length; i++) for (let j = i + 1; j < ys.length; j++) if (Math.abs(ys[i] - ys[j]) < 14) return false
      return true
    },
    side() {
      return Math.max(120, Math.min(this.width - this.padL - this.padR, this.height - this.padT - this.padB))
    },
    drawn() {
      const n = this.series.length
      return this.series.map((s, k) => {
        const dodge = n > 1 ? (k - (n - 1) / 2) * 4 : 0
        const pts = (s.bins || []).filter((b) => b.n > 0).map((b) => ({ ...b, cx: this.X(b.mean_p) + dodge }))
        const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p.cx.toFixed(1)},${this.Y(p.freq).toFixed(1)}`).join('')
        return { ...s, pts, d }
      })
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
    X(v) {
      return this.padL + v * this.side
    },
    Y(v) {
      return this.padT + this.side - v * this.side
    },
    pctT(v, d = 0) {
      return `${(Number(v) * 100).toFixed(d)}%`
    },
    show(s, p) {
      const px = p.cx
      const right = px > this.width / 2
      this.tip = {
        title: `${s.name} · forecasts ${this.pctT(p.lo)}–${this.pctT(p.hi)}`,
        rows: [
          ['Forecasts', String(p.n)],
          ['Mean forecast', this.pctT(p.mean_p, 1)],
          ['Happened', this.pctT(p.freq, 1)],
          ['95% interval', `${this.pctT(p.ci_lo, 1)}–${this.pctT(p.ci_hi, 1)}`]
        ],
        style: { left: (right ? px - 14 : px + 14) + 'px', top: Math.max(0, this.Y(p.freq) - 20) + 'px', transform: right ? 'translateX(-100%)' : 'none' }
      }
    }
  }
}
</script>

<style scoped>
.fbr {
  position: relative;
  width: 100%;
}
.fbr svg {
  display: block;
  overflow: visible;
}
.fbr circle[tabindex]:focus-visible {
  outline: none;
  stroke: var(--accent);
  stroke-width: 2;
}
</style>
