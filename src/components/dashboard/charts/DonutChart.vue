<template>
  <div class="donut">
    <div class="donut__chart" :style="{ width: size + 'px', height: size + 'px' }">
      <svg :viewBox="`0 0 ${size} ${size}`" :width="size" :height="size" role="img" :aria-label="ariaLabel">
        <circle :cx="c" :cy="c" :r="r" fill="none" stroke="var(--bg-subtle)" :stroke-width="thick" />
        <path
          v-for="(s, i) in arcs"
          :key="s.name"
          :d="s.d"
          fill="none"
          :stroke="s.color"
          :stroke-width="hover === i ? thick + 4 : thick"
          stroke-linecap="butt"
          class="seg"
          @pointerenter="hover = i"
          @pointerleave="hover = -1"
        />
      </svg>
      <div class="donut__center">
        <template v-if="hover >= 0 && arcs[hover]">
          <strong>{{ Math.round(arcs[hover].share * 100) }}%</strong>
          <small>{{ arcs[hover].name }}</small>
        </template>
        <template v-else>
          <strong>{{ centerValue }}</strong>
          <small>{{ centerLabel }}</small>
        </template>
      </div>
    </div>
    <ul class="donut__legend">
      <li v-for="(s, i) in rows" :key="s.name" :class="{ dim: hover >= 0 && hover !== i }" @pointerenter="hover = i" @pointerleave="hover = -1">
        <i class="dviz-swatch" :style="{ background: s.color }"></i>
        <span class="name">{{ s.name }}</span>
        <span class="val">{{ formatValue(s.value) }}</span>
        <span class="share">{{ total ? Math.round((s.value / total) * 100) : 0 }}%</span>
      </li>
    </ul>
  </div>
</template>

<script>
export default {
  name: 'DonutChart',
  props: {
    // [{ name, value, color }]
    segments: { type: Array, default: () => [] },
    size: { type: Number, default: 150 },
    thick: { type: Number, default: 16 },
    centerValue: { type: String, default: '' },
    centerLabel: { type: String, default: '' },
    formatValue: { type: Function, default: (v) => String(v) },
    ariaLabel: { type: String, default: 'Donut chart' }
  },
  data() {
    return { hover: -1 }
  },
  computed: {
    c() {
      return this.size / 2
    },
    r() {
      return this.size / 2 - this.thick / 2 - 3
    },
    rows() {
      return this.segments.filter((s) => s && s.value > 0)
    },
    total() {
      return this.rows.reduce((a, s) => a + Number(s.value || 0), 0)
    },
    arcs() {
      if (!this.total) return []
      const gap = this.rows.length > 1 ? 0.012 : 0 // fraction of circle left as surface gap
      let start = -0.25
      return this.rows.map((s) => {
        const share = s.value / this.total
        const a0 = start + gap / 2
        const a1 = start + Math.max(share - gap / 2, gap / 2 + 0.0001)
        start += share
        return { ...s, share, d: this.arc(a0, Math.min(a1, a0 + 0.9999)) }
      })
    }
  },
  methods: {
    arc(t0, t1) {
      const p = (t) => [this.c + this.r * Math.cos(t * 2 * Math.PI), this.c + this.r * Math.sin(t * 2 * Math.PI)]
      const [x0, y0] = p(t0)
      const [x1, y1] = p(t1)
      const large = t1 - t0 > 0.5 ? 1 : 0
      return `M${x0.toFixed(2)},${y0.toFixed(2)}A${this.r},${this.r} 0 ${large} 1 ${x1.toFixed(2)},${y1.toFixed(2)}`
    }
  }
}
</script>

<style scoped>
.donut {
  display: flex;
  align-items: center;
  gap: 22px;
  flex-wrap: wrap;
}

.donut__chart {
  position: relative;
  flex-shrink: 0;
}

.donut__chart svg {
  display: block;
}

.seg {
  transition: stroke-width 0.15s;
  cursor: default;
}

.donut__center {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  text-align: center;
  pointer-events: none;
  padding: 0 24px;
}

.donut__center strong {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}

.donut__center small {
  color: var(--text-3);
  font-size: 11.5px;
  line-height: 1.2;
}

.donut__legend {
  list-style: none;
  margin: 0;
  padding: 0;
  flex: 1;
  min-width: 170px;
  display: grid;
  gap: 8px;
}

.donut__legend li {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  transition: opacity 0.15s;
}

.donut__legend li.dim {
  opacity: 0.5;
}

.name {
  flex: 1;
  color: var(--text-2);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.val {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.share {
  width: 40px;
  text-align: right;
  color: var(--text-3);
  font-variant-numeric: tabular-nums;
}
</style>
