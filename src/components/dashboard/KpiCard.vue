<template>
  <component :is="to ? 'router-link' : 'div'" :to="to || undefined" class="ui-kpi kcard" :class="{ link: !!to }">
    <div class="ui-kpi__label">
      <span class="ui-kpi__icon" :class="'tone-' + tone"><i :class="icon"></i></span>
      <span class="lbl" :title="label">{{ label }}</span>
    </div>
    <div class="ui-kpi__value" :title="value">
      <span v-if="loading" class="ui-skeleton sk"></span>
      <template v-else>{{ value }}</template>
    </div>
    <div class="kmeta">
      <div class="ui-kpi__meta">
        <span v-if="loading" class="ui-skeleton sk-sm"></span>
        <slot v-else name="meta">{{ meta }}</slot>
      </div>
      <DeltaBadge
        v-if="!loading && showDelta"
        class="kdelta"
        :value="delta"
        :positive-is-good="positiveIsGood"
        :unit="deltaUnit"
        :show-new="showNew"
        :title="deltaTitle"
      />
    </div>
    <div v-if="spark" class="kspark">
      <Sparkline v-if="!loading" :values="spark" :color="sparkColor" :height="30" :aria-label="label + ' trend'" />
    </div>
  </component>
</template>

<script>
import DeltaBadge from './DeltaBadge.vue'
import Sparkline from './charts/Sparkline.vue'

export default {
  name: 'KpiCard',
  components: { DeltaBadge, Sparkline },
  props: {
    label: { type: String, required: true },
    icon: { type: String, default: 'fa-solid fa-chart-simple' },
    tone: { type: String, default: 'accent' }, // accent | success | info | warning | danger
    value: { type: String, default: '' },
    meta: { type: String, default: '' },
    delta: { type: Number, default: null },
    deltaUnit: { type: String, default: '%' },
    showDelta: { type: Boolean, default: true },
    showNew: { type: Boolean, default: false },
    deltaTitle: { type: String, default: 'Change vs the comparison period' },
    positiveIsGood: { type: Boolean, default: true },
    spark: { type: Array, default: null },
    sparkColor: { type: String, default: 'var(--viz-1)' },
    loading: { type: Boolean, default: false },
    to: { type: String, default: '' }
  }
}
</script>

<style scoped>
.kcard {
  display: flex;
  flex-direction: column;
  color: inherit;
  min-width: 0;
  padding-bottom: 14px;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.kcard.link:hover {
  color: inherit;
  border-color: var(--border-strong);
  box-shadow: var(--shadow);
}

.lbl {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.kdelta {
  flex-shrink: 0;
}

.kmeta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 2px;
}

.kmeta .ui-kpi__meta {
  margin-top: 0;
  min-width: 0;
}

.ui-kpi__value {
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ui-kpi__meta {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-height: 18px;
}

.kspark {
  margin-top: 10px;
  height: 30px;
}

.sk {
  display: inline-block;
  width: 120px;
  height: 26px;
}

.sk-sm {
  display: inline-block;
  width: 90px;
  height: 12px;
}

.tone-success {
  background: var(--success-soft);
  color: var(--success);
}

.tone-info {
  background: var(--info-soft);
  color: var(--info);
}

.tone-warning {
  background: var(--warning-soft);
  color: var(--warning);
}

.tone-danger {
  background: var(--danger-soft);
  color: var(--danger);
}
</style>
