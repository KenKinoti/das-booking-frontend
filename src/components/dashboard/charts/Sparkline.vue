<template>
  <svg
    class="spark"
    :viewBox="`0 0 ${W} ${height}`"
    preserveAspectRatio="none"
    :style="{ height: height + 'px' }"
    role="img"
    :aria-label="ariaLabel || 'Trend'"
  >
    <template v-if="points.length > 1">
      <path v-if="area" :d="areaPath" :fill="color" fill-opacity="0.12" stroke="none" />
      <path :d="linePath" fill="none" :stroke="color" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" />
    </template>
    <line v-else :x1="0" :x2="W" :y1="height - 2" :y2="height - 2" stroke="var(--border)" stroke-width="2" vector-effect="non-scaling-stroke" />
  </svg>
</template>

<script>
export default {
  name: 'Sparkline',
  props: {
    values: { type: Array, default: () => [] },
    color: { type: String, default: 'var(--viz-1)' },
    height: { type: Number, default: 34 },
    area: { type: Boolean, default: true },
    ariaLabel: { type: String, default: '' }
  },
  data() {
    return { W: 100 }
  },
  computed: {
    points() {
      const v = (this.values || []).map((x) => Number(x) || 0)
      if (v.length < 2) return []
      const min = Math.min(...v)
      const max = Math.max(...v)
      const span = max - min || 1
      const pad = 3
      const h = this.height - pad * 2
      return v.map((y, i) => [(i / (v.length - 1)) * this.W, pad + h - ((y - min) / span) * h])
    },
    linePath() {
      return this.points.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join('')
    },
    areaPath() {
      if (!this.points.length) return ''
      return `${this.linePath}L${this.W},${this.height}L0,${this.height}Z`
    }
  }
}
</script>

<style scoped>
.spark {
  display: block;
  width: 100%;
  overflow: visible;
}
</style>
