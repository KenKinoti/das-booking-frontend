<template>
  <nav class="atabs" aria-label="Analytics views">
    <div class="ui-tabs" role="tablist">
      <button
        v-for="t in VIEWS"
        :key="t.key"
        type="button"
        role="tab"
        class="ui-tab"
        :class="{ 'is-active': modelValue === t.key }"
        :aria-selected="modelValue === t.key"
        :data-view="t.key"
        @click="$emit('update:modelValue', t.key)"
      >
        <i :class="t.icon"></i> {{ t.label }}
      </button>
    </div>
  </nav>
</template>

<script>
export const VIEWS = [
  { key: 'overview', label: 'Overview', icon: 'fa-solid fa-gauge' },
  { key: 'revenue', label: 'Revenue', icon: 'fa-solid fa-chart-line' },
  { key: 'clients', label: 'Clients', icon: 'fa-solid fa-users' },
  { key: 'payments', label: 'Payments', icon: 'fa-solid fa-stopwatch' },
  { key: 'services', label: 'Service lines', icon: 'fa-solid fa-layer-group' },
  { key: 'hosting', label: 'Hosting', icon: 'fa-solid fa-server' },
  { key: 'seasonality', label: 'Seasonality', icon: 'fa-solid fa-calendar-days' }
]

export default {
  name: 'AnalyticsTabs',
  props: { modelValue: { type: String, default: 'overview' } },
  emits: ['update:modelValue'],
  data() {
    return { VIEWS }
  }
}
</script>

<style scoped>
.atabs {
  margin: -4px 0 16px;
  overflow-x: auto;
  scrollbar-width: thin;
}

.atabs .ui-tabs {
  flex-wrap: nowrap;
  width: max-content;
  min-width: 100%;
}

.ui-tab {
  white-space: nowrap;
}

.ui-tab i {
  margin-right: 4px;
  opacity: 0.8;
}
</style>
