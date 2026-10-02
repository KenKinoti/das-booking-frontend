<template>
  <div class="ui-modal-backdrop" @mousedown.self="$emit('close')">
    <div class="ui-modal" style="max-width: 560px" role="dialog" aria-modal="true" aria-labelledby="pbh-title" data-testid="history-modal">
      <div class="ui-modal__head">
        <div>
          <div class="ui-eyebrow">{{ item.supplier_name }} · {{ kindOf(item.kind).label }}</div>
          <h2 id="pbh-title">{{ item.name }} — price history</h2>
        </div>
        <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="$emit('close')"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="ui-modal__body">
        <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>
        <div v-else-if="!rows" class="ui-skeleton" style="height: 120px"></div>
        <template v-else>
          <div class="now">
            <span class="muted">Now</span>
            <strong>{{ cur(item.price, item.currency) }} <small>{{ periodOf(item.period).per }}</small></strong>
            <span class="muted">as of {{ item.as_of ? formatDate(item.as_of) : 'no date' }}<template v-if="item.regular_price != null"> · renews at {{ cur(item.regular_price, item.currency) }}</template></span>
          </div>
          <div v-if="!rows.length" class="ui-empty small">
            <div class="ui-empty__icon"><i class="fa-solid fa-clock-rotate-left"></i></div>
            <h3>No changes yet</h3>
            <p>When this price changes, the old price is kept here.</p>
          </div>
          <table v-else v-table-cards class="ui-table" data-testid="history-table">
            <thead>
              <tr><th>Changed</th><th class="num">Was</th><th class="num">Became</th><th class="num">Change</th></tr>
            </thead>
            <tbody>
              <tr v-for="h in rows" :key="h.id">
                <td>{{ formatDate(h.changed_at) }}<small class="block muted">{{ sourceLabel(h.source) }}<template v-if="h.as_of"> · old price as of {{ formatDate(h.as_of) }}</template></small></td>
                <td class="num">{{ cur(h.price, h.currency) }}<small v-if="h.regular_price != null" class="block muted">renewing at {{ cur(h.regular_price, h.currency) }}</small><small v-if="h.setup_fee" class="block muted">+ {{ cur(h.setup_fee, h.currency) }} setup</small></td>
                <td class="num">{{ cur(h.new_price, h.currency) }}<small v-if="h.new_regular_price != null" class="block muted">renewing at {{ cur(h.new_regular_price, h.currency) }}</small><small v-if="h.new_setup_fee" class="block muted">+ {{ cur(h.new_setup_fee, h.currency) }} setup</small></td>
                <td class="num" :class="h.new_price > h.price ? 'up' : h.new_price < h.price ? 'down' : ''">{{ change(h) }}</td>
              </tr>
            </tbody>
          </table>
        </template>
      </div>
      <div class="ui-modal__foot">
        <button type="button" class="ui-btn" @click="$emit('close')">Close</button>
      </div>
    </div>
  </div>
</template>

<script>
import { pricebookApi, kindOf, periodOf, cur } from '@/services/pricebook'
import { apiErrorMessage } from '@/services/api'
import { formatDate } from '@/utils/format'

export default {
  name: 'PricebookHistoryModal',
  props: { item: { type: Object, required: true } },
  emits: ['close'],
  data() {
    return { rows: null, error: '' }
  },
  async mounted() {
    try {
      this.rows = (await pricebookApi.history(this.item.id)).history || []
    } catch (e) {
      this.error = apiErrorMessage(e, 'Could not load the history')
    }
  },
  methods: {
    cur,
    kindOf,
    periodOf,
    formatDate,
    sourceLabel(s) {
      return { manual: 'changed by hand', csv: 'CSV import', synergy_statements: 'Synergy statements', synergy_api: 'Synergy API' }[s] || s || ''
    },
    change(h) {
      if (!h.price) return h.new_price === h.price ? '—' : 'new'
      const p = ((h.new_price - h.price) / h.price) * 100
      if (Math.abs(p) < 0.05) return '—'
      return `${p > 0 ? '+' : '−'}${Math.abs(p).toFixed(1)}%`
    }
  }
}
</script>

<style scoped>
.now {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  align-items: baseline;
  margin-bottom: 14px;
}
.now strong {
  font-size: 20px;
  font-variant-numeric: tabular-nums;
}
.now strong small {
  font-size: 12px;
  font-weight: 400;
  color: var(--text-3);
}
.muted {
  color: var(--text-3);
  font-size: 12.5px;
}
.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.block {
  display: block;
}
.up {
  color: var(--warning);
}
.down {
  color: var(--success);
}
</style>
