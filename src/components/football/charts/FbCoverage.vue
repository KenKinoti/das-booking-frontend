<template>
  <!-- Coverage curve: number of combinations (log axis, 1 → thousands) against the chance that one of them gets
       every game right. Each point is one step of the doubles/triples priority list. A crosshair snaps to the
       nearest step and the tooltip shows combinations, cost at the ticket price, chance and what was added. -->
  <div ref="root" class="fbcv" :style="{ height: height + 'px' }">
    <svg
      v-if="width > 0 && pts.length"
      :width="width"
      :height="height"
      role="img"
      :aria-label="ariaLabel"
      tabindex="0"
      @pointermove="onMove"
      @pointerdown="onMove"
      @pointerleave="hover = null"
      @keydown="onKey"
      @focus="onFocus"
      @blur="hover = null"
    >
      <!-- y grid -->
      <template v-for="t in yTicks" :key="'y' + t">
        <line :x1="padL" :x2="width - padR" :y1="Y(t)" :y2="Y(t)" :class="t === yLo && !logY ? 'fb-baseline' : 'fb-gridline'" />
        <text :x="padL - 6" :y="Y(t) + 3.5" class="fb-axis" text-anchor="end">{{ fmtPct(t) }}</text>
      </template>
      <text :x="12" :y="padT + plotH / 2" class="fb-axis-title" text-anchor="middle" :transform="`rotate(-90 12 ${padT + plotH / 2})`">Chance of {{ allLabel }}</text>
      <!-- x ticks (log) -->
      <template v-for="t in xTicks" :key="'x' + t">
        <line :x1="X(t)" :x2="X(t)" :y1="padT + plotH" :y2="padT + plotH + 4" class="fb-baseline" />
        <text :x="X(t)" :y="padT + plotH + 16" class="fb-axis" :text-anchor="anchor(t)">{{ compactN(t) }}</text>
      </template>
      <text :x="padL + plotW / 2" :y="height - 3" class="fb-axis-title" text-anchor="middle">Combinations (log scale){{ price ? ` · ${priceTxt} each` : '' }}</text>
      <!-- area wash + line -->
      <path v-if="!logY" :d="areaD" fill="var(--fb-home)" fill-opacity="0.1" stroke="none" />
      <path :d="lineD" fill="none" stroke="var(--fb-home)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
      <circle v-for="(p, i) in pts" :key="'p' + i" :cx="X(p.combos)" :cy="Y(p.p)" :r="i === markIdx ? 5 : 3.5" fill="var(--fb-home)" stroke="var(--fb-surface)" stroke-width="2" :data-combos="p.combos" />
      <!-- the plan the person picked -->
      <g v-if="markIdx >= 0">
        <line :x1="X(pts[markIdx].combos)" :x2="X(pts[markIdx].combos)" :y1="Y(pts[markIdx].p) + 7" :y2="padT + plotH" class="fbcv__drop" />
        <text :x="markLabelX" :y="Math.max(padT + 10, Y(pts[markIdx].p) - 10)" class="fb-endlabel" :text-anchor="markAnchor">{{ markText }}</text>
      </g>
      <!-- hover -->
      <g v-if="hover !== null">
        <line :x1="X(pts[hover].combos)" :x2="X(pts[hover].combos)" :y1="padT" :y2="padT + plotH" class="fb-cross" />
        <circle :cx="X(pts[hover].combos)" :cy="Y(pts[hover].p)" r="5" fill="var(--fb-home)" stroke="var(--fb-surface)" stroke-width="2" />
      </g>
    </svg>
    <div v-if="hover !== null && width" class="fb-tip" :style="tipStyle" role="status">
      <div class="fb-tip__title">{{ pts[hover].combos.toLocaleString() }} combination{{ pts[hover].combos === 1 ? '' : 's' }}</div>
      <div class="fb-tip__row">
        <span><i class="fb-key fb-key--line" style="background: var(--fb-home)"></i>Chance of {{ allLabel }}</span>
        <strong>{{ fmtPct(pts[hover].p, true) }}</strong>
      </div>
      <div class="fb-tip__row"><span>In plain words</span><strong>{{ oneIn(pts[hover].p) }}</strong></div>
      <div v-if="price" class="fb-tip__row"><span>Cost</span><strong>{{ money(pts[hover].combos * price) }}</strong></div>
      <div v-if="pts[hover].added" class="fb-tip__row fb-muted" style="margin-top: 2px">
        <span>{{ pts[hover].added }}</span>
      </div>
    </div>
  </div>
</template>

<script>
import { formatMoney } from '@/utils/format'

export function oneInText(p) {
  if (!(p > 0)) return 'no chance'
  const n = 1 / p
  if (n < 1.05) return 'almost every time'
  const r = n >= 1e6 ? Math.round(n / 1e5) * 1e5 : n >= 1e4 ? Math.round(n / 1e3) * 1e3 : n >= 1000 ? Math.round(n / 100) * 100 : n >= 100 ? Math.round(n / 10) * 10 : n >= 10 ? Math.round(n) : Math.round(n * 10) / 10
  return `about 1 in ${r.toLocaleString()}`
}

export default {
  name: 'FbCoverage',
  props: {
    // [{ combos, p, added }] sorted by combos; p = chance that one combination gets every game right
    points: { type: Array, default: () => [] },
    height: { type: Number, default: 260 },
    price: { type: Number, default: 0 },
    currency: { type: String, default: 'KES' },
    games: { type: Number, default: 13 },
    logY: { type: Boolean, default: false },
    mark: { type: Number, default: null }, // combos of the plan to mark
    ariaLabel: { type: String, default: 'Chance of getting every game right against the number of combinations' }
  },
  data() {
    return { width: 0, hover: null, padT: 14, padR: 16, padB: 38, ro: null }
  },
  computed: {
    allLabel() {
      return `${this.games}/${this.games}`
    },
    pts() {
      return (this.points || []).filter((p) => p.combos >= 1 && p.p > 0).sort((a, b) => a.combos - b.combos)
    },
    padL() {
      return 14 + Math.max(...this.yTicks.map((t) => this.fmtPct(t).length), 4) * 6.4 + 10
    },
    plotW() {
      return Math.max(10, this.width - this.padL - this.padR)
    },
    plotH() {
      return Math.max(10, this.height - this.padT - this.padB)
    },
    xMax() {
      const m = this.pts.length ? this.pts[this.pts.length - 1].combos : 10
      return Math.max(10, m)
    },
    xTicks() {
      const out = []
      const top = Math.ceil(Math.log10(this.xMax))
      const decades = top
      for (let e = 0; e <= top; e++) {
        const base = Math.pow(10, e)
        if (base <= this.xMax * 1.001) out.push(base)
        if (decades <= 3) for (const m of [3]) if (base * m <= this.xMax * 1.001) out.push(base * m)
      }
      if (out[out.length - 1] < this.xMax && this.X(this.xMax) - this.X(out[out.length - 1]) > 34) out.push(this.xMax)
      return out.sort((a, b) => a - b)
    },
    yLo() {
      if (!this.logY) return 0
      const lo = Math.min(...this.pts.map((p) => p.p))
      return Math.pow(10, Math.floor(Math.log10(lo)))
    },
    yHi() {
      const hi = Math.max(...this.pts.map((p) => p.p), 1e-9)
      if (this.logY) return Math.pow(10, Math.ceil(Math.log10(hi)))
      // nice linear top
      const mag = Math.pow(10, Math.floor(Math.log10(hi)))
      const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= hi) || 10 * mag
      return step
    },
    yTicks() {
      if (this.logY) {
        const out = []
        for (let v = this.yLo; v <= this.yHi * 1.0001; v *= 10) out.push(v)
        return out
      }
      const out = []
      const n = 4
      for (let i = 0; i <= n; i++) out.push((this.yHi * i) / n)
      return out
    },
    lineD() {
      return this.pts.map((p, i) => `${i ? 'L' : 'M'}${this.X(p.combos).toFixed(1)},${this.Y(p.p).toFixed(1)}`).join('')
    },
    areaD() {
      if (!this.pts.length) return ''
      const base = this.padT + this.plotH
      return `${this.lineD}L${this.X(this.pts[this.pts.length - 1].combos).toFixed(1)},${base}L${this.X(this.pts[0].combos).toFixed(1)},${base}Z`
    },
    markIdx() {
      if (this.mark == null) return -1
      return this.pts.findIndex((p) => p.combos === this.mark)
    },
    markText() {
      const p = this.pts[this.markIdx]
      return p ? `Your plan: ${p.combos.toLocaleString()} · ${this.fmtPct(p.p, true)}` : ''
    },
    markAnchor() {
      const p = this.pts[this.markIdx]
      return p && this.X(p.combos) > this.padL + this.plotW * 0.6 ? 'end' : 'start'
    },
    markLabelX() {
      const p = this.pts[this.markIdx]
      if (!p) return 0
      return this.X(p.combos) + (this.markAnchor === 'end' ? -8 : 8)
    },
    priceTxt() {
      return formatMoney(this.price, this.currency)
    },
    tipStyle() {
      const px = this.X(this.pts[this.hover].combos)
      const right = px > this.width / 2
      return { top: '6px', left: (right ? px - 12 : px + 12) + 'px', transform: right ? 'translateX(-100%)' : 'none' }
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
    X(c) {
      return this.padL + (Math.log10(Math.max(1, c)) / Math.log10(this.xMax)) * this.plotW
    },
    Y(p) {
      if (this.logY) {
        const a = Math.log10(this.yLo)
        const b = Math.log10(this.yHi)
        return this.padT + this.plotH - ((Math.log10(Math.max(p, this.yLo)) - a) / (b - a || 1)) * this.plotH
      }
      return this.padT + this.plotH - (p / (this.yHi || 1)) * this.plotH
    },
    anchor(t) {
      const px = this.X(t)
      return px - this.padL < 14 ? 'start' : this.width - this.padR - px < 14 ? 'end' : 'middle'
    },
    compactN(n) {
      if (n >= 1e6) return (n / 1e6).toFixed(n % 1e6 ? 1 : 0) + 'M'
      if (n >= 1e4) return Math.round(n / 1e3) + 'K'
      return n.toLocaleString()
    },
    fmtPct(p, precise = false) {
      if (p === 0) return '0%'
      const v = p * 100
      if (precise) {
        if (v >= 10) return v.toFixed(1) + '%'
        if (v >= 1) return v.toFixed(2) + '%'
        return v.toPrecision(2) + '%'
      }
      if (v >= 1) return (Number.isInteger(v) ? v : v.toFixed(1).replace(/\.0$/, '')) + '%'
      return Number(v.toPrecision(2)) + '%'
    },
    oneIn: oneInText,
    money(v) {
      return formatMoney(v, this.currency)
    },
    nearest(px) {
      let best = 0
      let bd = Infinity
      this.pts.forEach((p, i) => {
        const d = Math.abs(this.X(p.combos) - px)
        if (d < bd) {
          bd = d
          best = i
        }
      })
      return best
    },
    onMove(e) {
      const rect = this.$refs.root.getBoundingClientRect()
      this.hover = this.nearest(e.clientX - rect.left)
    },
    onFocus() {
      this.hover = this.markIdx >= 0 ? this.markIdx : 0
    },
    onKey(e) {
      if (!this.pts.length) return
      let i = this.hover ?? 0
      if (e.key === 'ArrowLeft') i = Math.max(0, i - 1)
      else if (e.key === 'ArrowRight') i = Math.min(this.pts.length - 1, i + 1)
      else if (e.key === 'Escape') {
        this.hover = null
        return
      } else return
      e.preventDefault()
      this.hover = i
    }
  }
}
</script>

<style scoped>
.fbcv {
  position: relative;
  width: 100%;
  touch-action: pan-y;
}
.fbcv svg {
  display: block;
  overflow: visible;
}
.fbcv svg:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: 4px;
}
.fbcv__drop {
  stroke: var(--text-3);
  stroke-width: 1;
}
</style>
