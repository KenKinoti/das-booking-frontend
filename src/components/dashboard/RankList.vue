<template>
  <ol class="rank" :class="{ numbered }">
    <li v-for="(r, i) in rows" :key="r.key || r.label + i">
      <component :is="r.to ? 'router-link' : 'div'" :to="r.to || undefined" class="rank__row" :class="{ link: !!r.to }">
        <span v-if="numbered" class="rank__n">{{ i + 1 }}</span>
        <div class="rank__main">
          <div class="rank__line">
            <span class="rank__label" :title="r.label">{{ r.label }}</span>
            <strong class="rank__val">{{ r.display }}</strong>
          </div>
          <div class="rank__bar" aria-hidden="true">
            <span :style="{ width: width(r.value), background: r.color || color }"></span>
          </div>
          <small v-if="r.sub" class="rank__sub">{{ r.sub }}</small>
        </div>
      </component>
    </li>
  </ol>
</template>

<script>
export default {
  name: 'RankList',
  props: {
    // [{ key, label, sub, value, display, color, to }]
    rows: { type: Array, default: () => [] },
    color: { type: String, default: 'var(--viz-1)' },
    numbered: { type: Boolean, default: false },
    max: { type: Number, default: 0 }
  },
  computed: {
    top() {
      return this.max || Math.max(0, ...this.rows.map((r) => Number(r.value) || 0))
    }
  },
  methods: {
    width(v) {
      if (!this.top) return '0%'
      const w = ((Number(v) || 0) / this.top) * 100
      return `${Math.max(w > 0 ? 1.5 : 0, w)}%`
    }
  }
}
</script>

<style scoped>
.rank {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 2px;
}

.rank__row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 8px 10px;
  border-radius: 10px;
  color: var(--text);
}

.rank__row.link:hover {
  background: var(--surface-hover);
  color: var(--text);
}

.rank__n {
  width: 22px;
  height: 22px;
  border-radius: 7px;
  background: var(--bg-subtle);
  color: var(--text-3);
  font-size: 11.5px;
  font-weight: 650;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  margin-top: 1px;
}

.rank__main {
  flex: 1;
  min-width: 0;
}

.rank__line {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 13.5px;
}

.rank__label {
  font-weight: 550;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.rank__val {
  font-weight: 650;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.rank__bar {
  height: 6px;
  border-radius: 4px;
  background: var(--bg-subtle);
  margin-top: 6px;
  overflow: hidden;
}

.rank__bar span {
  display: block;
  height: 100%;
  border-radius: 4px;
  transition: width 0.4s var(--ease, ease);
}

.rank__sub {
  display: block;
  font-size: 11.5px;
  color: var(--text-3);
  margin-top: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
