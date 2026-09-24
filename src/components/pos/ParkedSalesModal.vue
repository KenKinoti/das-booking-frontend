<template>
  <div class="ui-modal-backdrop" @mousedown.self="$emit('close')">
    <div class="ui-modal" style="max-width: 560px" role="dialog" aria-modal="true" aria-labelledby="parked-title">
      <div class="ui-modal__head">
        <div>
          <h2 id="parked-title">Parked sales</h2>
          <p class="sub">Sales put on hold on this device. Resume one to finish it.</p>
        </div>
        <button class="ui-btn ui-btn--ghost ui-btn--icon ui-btn--sm" aria-label="Close" @click="$emit('close')"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="ui-modal__body">
        <div v-if="!sales.length" class="ui-empty">
          <div class="ui-empty__icon"><i class="fa-regular fa-clock"></i></div>
          <h3>No parked sales</h3>
          <p>Use “Park” in the cart to put a sale on hold.</p>
        </div>
        <ul v-else class="list">
          <li v-for="s in sales" :key="s.id" class="row">
            <div class="row__main">
              <strong>{{ s.label || 'Parked sale' }}</strong>
              <span class="meta">{{ itemCount(s) }} item{{ itemCount(s) === 1 ? '' : 's' }} · {{ dateTime(s.created_at) }}<template v-if="s.customer"> · {{ name(s.customer) }}</template></span>
            </div>
            <strong class="row__amt">{{ money(s.total) }}</strong>
            <div class="row__actions">
              <button class="ui-btn ui-btn--ghost ui-btn--icon ui-btn--sm" :aria-label="`Discard ${s.label || 'parked sale'}`" @click="$emit('discard', s)"><i class="fa-regular fa-trash-can"></i></button>
              <button class="ui-btn ui-btn--primary ui-btn--sm" @click="$emit('resume', s)">Resume</button>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script>
import { formatMoney, formatDateTime } from '@/utils/format'
import { personName } from '@/services/posService'

export default {
  name: 'ParkedSalesModal',
  props: {
    sales: { type: Array, default: () => [] },
    currency: { type: String, default: 'AUD' }
  },
  emits: ['close', 'resume', 'discard'],
  mounted() {
    document.addEventListener('keydown', this.onKey)
  },
  beforeUnmount() {
    document.removeEventListener('keydown', this.onKey)
  },
  methods: {
    onKey(e) {
      if (e.key === 'Escape') this.$emit('close')
    },
    money(v) {
      return formatMoney(v, this.currency)
    },
    dateTime: formatDateTime,
    name: personName,
    itemCount(s) {
      return (s.cart || []).reduce((n, l) => n + l.qty, 0)
    }
  }
}
</script>

<style scoped>
.sub {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--text-3);
}
.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface-2);
}
.row__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.meta {
  font-size: 12.5px;
  color: var(--text-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.row__amt {
  font-variant-numeric: tabular-nums;
}
.row__actions {
  display: flex;
  gap: 6px;
}
</style>
