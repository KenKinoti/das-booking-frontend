<template>
  <ul class="alerts" :class="{ compact }" data-testid="exp-alerts">
    <li v-for="a in alerts" :key="a.key" class="alert" :class="'sev-' + a.severity" :data-type="a.type">
      <span class="ic"><i :class="icon(a.type)"></i></span>
      <div class="body">
        <strong>{{ a.title }}</strong>
        <span>{{ a.body }}</span>
      </div>
      <div class="acts">
        <router-link v-if="a.link && !compact" :to="a.link" class="ui-btn ui-btn--ghost ui-btn--sm">View</router-link>
        <button type="button" class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" :aria-label="'Dismiss ' + a.title" title="Dismiss" @click="$emit('dismiss', a)">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    </li>
  </ul>
</template>

<script>
const ICONS = {
  price_increase: 'fa-solid fa-arrow-trend-up',
  new_vendor: 'fa-solid fa-store',
  duplicate: 'fa-solid fa-clone',
  payment_failed: 'fa-solid fa-credit-card',
  unpaid: 'fa-solid fa-file-invoice-dollar',
  renewal_due: 'fa-solid fa-hourglass-half',
  renewal_expired: 'fa-solid fa-circle-exclamation',
  low_balance: 'fa-solid fa-wallet',
  subscription_overdue: 'fa-solid fa-clock',
  synergy_over_quota: 'fa-solid fa-hard-drive',
  synergy_quota: 'fa-solid fa-gauge-high',
  synergy_runway: 'fa-solid fa-wallet',
  synergy_unbilled: 'fa-solid fa-file-invoice-dollar'
}
export default {
  name: 'AlertList',
  props: {
    alerts: { type: Array, default: () => [] },
    cur: { type: String, default: '' },
    compact: { type: Boolean, default: false }
  },
  emits: ['dismiss'],
  methods: {
    icon(t) {
      return ICONS[t] || 'fa-solid fa-bell'
    }
  }
}
</script>

<style scoped>
.alerts {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.alert {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
}
.ic {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  flex: none;
  background: var(--info-soft);
  color: var(--info);
}
.sev-warning .ic {
  background: var(--warning-soft);
  color: var(--warning);
}
.sev-danger .ic {
  background: var(--danger-soft);
  color: var(--danger);
}
.body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  font-size: 13.5px;
}
.body span {
  color: var(--text-2);
  font-size: 12.5px;
}
.acts {
  display: flex;
  gap: 4px;
  align-items: center;
}
.compact .alert {
  padding: 8px 10px;
}
</style>
