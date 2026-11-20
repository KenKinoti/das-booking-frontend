<template>
  <div ref="root" class="fbl" :style="{ height: height + 'px' }">
    <svg
      v-if="width > 0"
      :width="width"
      :height="height"
      role="img"
      :aria-label="ariaLabel"
      tabindex="0"
      @pointermove="onMove"
      @pointerleave="hover = null"
      @pointerdown="onMove"
      @keydown="onKey"
      @focus="onFocus"
      @blur="hover = null"
    >
      <!-- y grid + ticks -->
      <g>
        <template v-for="t in yTicksUsed" :key="'y' + t">
          <line :x1="padL" :x2="width - padR" :y1="y(t)" :y2="y(t)" :class="t === baseY ? 'fb-baseline' : 'fb-gridline'" />
          <text :x="padL - 6" :y="y(t) + 3.5" class="fb-axis" text-anchor="end">{{ formatY(t) }}</text>
        </template>
        <text v-if="yTitle" :x="12" :y="padT + plotH / 2" class="fb-axis-title" text-anchor="middle" :transform="`rotate(-90 12 ${padT + plotH / 2})`">{{ yTitle }}</text>
      </g>
      <!-- x ticks -->
      <g>
        <text v-for="(t, i) in xTicksUsed" :key="'x' + i" :x="x(t)" :y="padT + plotH + 15" class="fb-axis" :text-anchor="anchor(t)">{{ formatX(t) }}</text>
        <text v-if="xTitle" :x="padL + plotW / 2" :y="height - 2" class="fb-axis-title" text-anchor="middle">{{ xTitle }}</text>
      </g>
      <!-- reference lines -->
      <g v-for="r in refLines" :key="'r' + r.y">
        <line :x1="padL" :x2="width - padR" :y1="y(r.y)" :y2="y(r.y)" class="fb-baseline" />
        <text v-if="r.label" :x="width - padR - 2" :y="y(r.y) - 4" class="fb-axis" text-anchor="end">{{ r.label }}</text>
      </g>
      <!-- bands (ranges, drawdown) -->
      <path v-for="b in drawnBands" :key="'b' + b.key" :d="b.d" :fill="b.color" :fill-opacity="b.opacity" stroke="none" />
      <!-- series -->
      <g v-for="s in drawn" :key="s.key">
        <path :d="s.d" fill="none" :stroke="s.color" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
        <circle v-for="(p, i) in s.dots" :key="i" :cx="p[0]" :cy="p[1]" r="4" :fill="s.color" stroke="var(--fb-surface)" stroke-width="2" />
      </g>
      <!-- end labels (only when they do not collide) -->
      <g v-if="showEndLabels">
        <text v-for="e in endLabelPos" :key="'e' + e.key" :x="e.x + 8" :y="e.y + 4" class="fb-endlabel">{{ e.text }}</text>
      </g>
      <!-- hover -->
      <g v-if="hover !== null">
        <line :x1="x(hover)" :x2="x(hover)" :y1="padT" :y2="padT + plotH" class="fb-cross" />
        <template v-for="s in drawn" :key="'h' + s.key">
          <circle v-if="valueAt(s, hover) != null" :cx="x(hover)" :cy="y(valueAt(s, hover).y)" r="4.5" :fill="s.color" stroke="var(--fb-surface)" stroke-width="2" />
        </template>
      </g>
    </svg>
    <div v-if="hover !== null && width" class="fb-tip" :style="tipStyle" role="status">
      <div class="fb-tip__title">{{ formatXTip(hover) }}</div>
      <div v-for="s in drawn" :key="'t' + s.key" class="fb-tip__row">
        <span><i class="fb-key fb-key--line" :style="{ background: s.color }"></i>{{ s.name }}</span>
        <strong>{{ valueAt(s, hover) ? formatValue(valueAt(s, hover).y, s, valueAt(s, hover)) : '—' }}</strong>
      </div>
      <div v-for="b in bandsWithTip" :key="'tb' + b.key" class="fb-tip__row">
        <span><i class="fb-key fb-key--band" :style="{ background: b.color }"></i>{{ b.name }}</span>
        <strong>{{ b.tip(hover) }}</strong>
      </div>
      <div v-if="tipNote" class="fb-tip__row" style="margin-top: 3px">
        <span class="fb-muted">{{ tipNote(hover) }}</span>
      </div>
    </div>
  </div>
</template>

<script>
import { niceTicks } from '../fb'

// Multi-series line chart. Series: [{ key, name, color, points: [{ x, y, ...meta }], step?, dots? }];
// bands: [{ key, name, color, opacity, points: [{ x, y0, y1 }], tip?(x) }]. x is a number (index or time).
export default {
  name: 'FbLine',
  props: {
    series: { type: Array, default: () => [] },
    bands: { type: Array, default: () => [] },
    height: { type: Number, default: 240 },
    yDomain: { type: Array, default: null },
    yTicks: { type: Array, default: null },
    yInvert: { type: Boolean, default: false },
    zeroBased: { type: Boolean, default: false },
    integerTicks: { type: Boolean, default: false },
    xTicks: { type: Array, default: null },
    formatX: { type: Function, default: (v) => String(v) },
    formatXTip: { type: Function, default: (v) => String(v) },
    formatY: { type: Function, default: (v) => String(v) },
    formatValue: { type: Function, default: (v) => String(v) },
    tipNote: { type: Function, default: null },
    yTitle: { type: String, default: '' },
    xTitle: { type: String, default: '' },
    refLines: { type: Array, default: () => [] },
    endLabels: { type: Array, default: () => [] }, // [{ key, text }] for series keys
    ariaLabel: { type: String, default: 'Line chart' }
  },
  data() {
    return { width: 0, hover: null, padT: 10, ro: null }
  },
  computed: {
    padB() {
      return this.xTitle ? 34 : 22
    },
    padL() {
      const longest = Math.max(3, ...this.yTicksUsed.map((t) => String(this.formatY(t)).length))
      return Math.min(72, 12 + longest * 6.6 + (this.yTitle ? 14 : 0))
    },
    padR() {
      if (!this.showEndLabelsWanted) return 10
      const longest = Math.max(...this.endLabels.map((e) => e.text.length), 4)
      return Math.min(150, 14 + longest * 6.4)
    },
    plotW() {
      return Math.max(10, this.width - this.padL - this.padR)
    },
    plotH() {
      return Math.max(10, this.height - this.padT - this.padB)
    },
    allX() {
      const s = new Set()
      for (const se of this.series) for (const p of se.points || []) if (Number.isFinite(p.x)) s.add(p.x)
      return [...s].sort((a, b) => a - b)
    },
    xRange() {
      const xs = this.allX
      if (!xs.length) return [0, 1]
      return xs[0] === xs[xs.length - 1] ? [xs[0] - 1, xs[0] + 1] : [xs[0], xs[xs.length - 1]]
    },
    yScale() {
      if (this.yDomain) return { lo: this.yDomain[0], hi: this.yDomain[1], ticks: this.yTicks || niceTicks(this.yDomain[0], this.yDomain[1], 4).ticks.filter((t) => t >= this.yDomain[0] && t <= this.yDomain[1]) }
      const vals = []
      for (const se of this.series) for (const p of se.points || []) if (p.y != null && Number.isFinite(p.y)) vals.push(p.y)
      for (const b of this.bands) for (const p of b.points || []) vals.push(p.y0, p.y1)
      for (const r of this.refLines) vals.push(r.y)
      if (!vals.length) return { lo: 0, hi: 1, ticks: [0, 1] }
      let lo = Math.min(...vals)
      let hi = Math.max(...vals)
      if (this.zeroBased) lo = Math.min(0, lo)
      const pad = (hi - lo) * 0.06 || Math.abs(hi) * 0.1 || 1
      const n = niceTicks(this.zeroBased && lo === 0 ? 0 : lo - pad, hi + pad, 4)
      return { lo: n.lo, hi: n.hi, ticks: this.yTicks || n.ticks }
    },
    yTicksUsed() {
      if (!this.integerTicks) return this.yScale.ticks
      const t = this.yScale.ticks.filter((v) => Number.isInteger(v))
      return t.length >= 2 ? t : [0, Math.ceil(this.yScale.hi)]
    },
    baseY() {
      return this.yScale.lo <= 0 && this.yScale.hi >= 0 && !this.yInvert ? 0 : null
    },
    xTicksUsed() {
      if (this.xTicks) return this.xTicks
      const xs = this.allX
      if (xs.length <= 1) return xs
      const room = Math.max(2, Math.floor(this.plotW / 74))
      const step = Math.max(1, Math.ceil((xs.length - 1) / (room - 1)))
      const out = []
      for (let i = 0; i < xs.length; i += step) out.push(xs[i])
      if (out[out.length - 1] !== xs[xs.length - 1]) {
        if (xs.length - 1 - xs.indexOf(out[out.length - 1]) < step / 2) out.pop()
        out.push(xs[xs.length - 1])
      }
      return out
    },
    drawn() {
      return this.series
        .filter((s) => s && (s.points || []).some((p) => p.y != null))
        .map((s) => {
          const pts = (s.points || []).filter((p) => p.y != null && Number.isFinite(p.y)).sort((a, b) => a.x - b.x)
          let d = ''
          pts.forEach((p, i) => {
            const X = this.x(p.x).toFixed(1)
            const Y = this.y(p.y).toFixed(1)
            if (!i) d += `M${X},${Y}`
            else if (s.step) d += `H${X}V${Y}`
            else d += `L${X},${Y}`
          })
          if (s.step && pts.length && s.extendTo != null) d += `H${this.x(s.extendTo).toFixed(1)}`
          const dots = pts.length === 1 || s.dots ? pts.map((p) => [this.x(p.x), this.y(p.y)]) : []
          return { ...s, pts, d, dots }
        })
    },
    drawnBands() {
      return this.bands
        .filter((b) => (b.points || []).length > 1)
        .map((b) => {
          const pts = [...b.points].sort((a, c) => a.x - c.x)
          const top = pts.map((p, i) => `${i ? 'L' : 'M'}${this.x(p.x).toFixed(1)},${this.y(p.y1).toFixed(1)}`).join('')
          const bottom = [...pts]
            .reverse()
            .map((p) => `L${this.x(p.x).toFixed(1)},${this.y(p.y0).toFixed(1)}`)
            .join('')
          return { ...b, opacity: b.opacity ?? 0.14, d: top + bottom + 'Z' }
        })
    },
    bandsWithTip() {
      return this.bands.filter((b) => typeof b.tip === 'function' && b.tip(this.hover) != null)
    },
    showEndLabelsWanted() {
      return this.endLabels.length > 0 && this.width >= 460
    },
    endLabelPos() {
      return this.endLabels
        .map((e) => {
          const s = this.drawn.find((d) => d.key === e.key)
          const last = s && s.pts[s.pts.length - 1]
          return last ? { key: e.key, text: e.text, x: this.x(last.x), y: this.y(last.y) } : null
        })
        .filter(Boolean)
    },
    showEndLabels() {
      if (!this.showEndLabelsWanted) return false
      const ys = this.endLabelPos.map((e) => e.y).sort((a, b) => a - b)
      for (let i = 1; i < ys.length; i++) if (ys[i] - ys[i - 1] < 14) return false
      return true
    },
    tipStyle() {
      const px = this.x(this.hover)
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
    x(v) {
      const [a, b] = this.xRange
      return this.padL + ((v - a) / (b - a || 1)) * this.plotW
    },
    y(v) {
      const { lo, hi } = this.yScale
      const t = (v - lo) / (hi - lo || 1)
      return this.yInvert ? this.padT + t * this.plotH : this.padT + this.plotH - t * this.plotH
    },
    anchor(t) {
      const px = this.x(t)
      return px - this.padL < 20 ? 'start' : this.width - this.padR - px < 20 ? 'end' : 'middle'
    },
    valueAt(s, xv) {
      if (!s.pts.length) return null
      const exact = s.pts.find((p) => p.x === xv)
      if (exact) return exact
      if (s.step) {
        let last = null
        for (const p of s.pts) if (p.x <= xv) last = p
        return last
      }
      return null
    },
    nearestX(px) {
      const xs = this.allX
      if (!xs.length) return null
      let best = xs[0]
      let bd = Infinity
      for (const v of xs) {
        const d = Math.abs(this.x(v) - px)
        if (d < bd) {
          bd = d
          best = v
        }
      }
      return best
    },
    onMove(e) {
      const rect = this.$refs.root.getBoundingClientRect()
      this.hover = this.nearestX(e.clientX - rect.left)
    },
    onFocus() {
      const xs = this.allX
      if (xs.length) this.hover = xs[xs.length - 1]
    },
    onKey(e) {
      const xs = this.allX
      if (!xs.length) return
      let i = xs.indexOf(this.hover)
      if (e.key === 'ArrowLeft') i = Math.max(0, (i < 0 ? xs.length : i) - 1)
      else if (e.key === 'ArrowRight') i = Math.min(xs.length - 1, i + 1)
      else if (e.key === 'Escape') {
        this.hover = null
        return
      } else return
      e.preventDefault()
      this.hover = xs[i]
    }
  }
}
</script>

<style scoped>
.fbl {
  position: relative;
  width: 100%;
  touch-action: pan-y;
}
.fbl svg {
  display: block;
  overflow: visible;
}
.fbl svg:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: 4px;
}
</style>
