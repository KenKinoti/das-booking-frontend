<template>
  <span v-if="value !== null && value !== undefined" class="delta" :class="tone" :title="title">
    <i :class="icon"></i>{{ text }}
  </span>
  <span v-else-if="showNew" class="delta neutral" title="No data in the comparison period">New</span>
</template>

<script>
export default {
  name: 'DeltaBadge',
  props: {
    value: { type: Number, default: null },
    // true when a rise is good (revenue), false when a rise is bad (overdue)
    positiveIsGood: { type: Boolean, default: true },
    unit: { type: String, default: '%' }, // '%' or 'pts'
    showNew: { type: Boolean, default: false },
    title: { type: String, default: 'Change vs the comparison period' }
  },
  computed: {
    tone() {
      if (!this.value || Math.abs(this.value) < 0.05) return 'neutral'
      const up = this.value > 0
      return up === this.positiveIsGood ? 'good' : 'bad'
    },
    icon() {
      if (!this.value || Math.abs(this.value) < 0.05) return 'fa-solid fa-minus'
      return this.value > 0 ? 'fa-solid fa-arrow-trend-up' : 'fa-solid fa-arrow-trend-down'
    },
    text() {
      const v = Math.abs(this.value)
      const s = v >= 1000 ? Math.round(v).toLocaleString() : v >= 100 ? Math.round(v) : v.toFixed(1)
      return this.unit === 'pts' ? `${s} pts` : `${s}%`
    }
  }
}
</script>

<style scoped>
.delta {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.delta i {
  font-size: 10.5px;
}

.good {
  background: var(--success-soft);
  color: var(--success);
}

.bad {
  background: var(--danger-soft);
  color: var(--danger);
}

.neutral {
  background: var(--neutral-soft);
  color: var(--text-3);
}
</style>
