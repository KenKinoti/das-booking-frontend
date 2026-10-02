<template>
  <div class="scn" data-testid="scenarios">
    <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>
    <div v-else-if="!list" class="ui-skeleton" style="height: 120px"></div>
    <div v-else-if="!list.length" class="ui-empty">
      <div class="ui-empty__icon"><i class="fa-regular fa-bookmark"></i></div>
      <h3>No saved comparisons</h3>
      <p>Price an option above and choose “Save comparison” to keep the inputs and the numbers of the day.</p>
    </div>
    <div v-else class="ui-table-wrap">
      <table v-table-cards class="ui-table">
        <thead>
          <tr><th>Comparison</th><th class="hide-sm">Supplied by</th><th class="num">Cost / year</th><th class="num">Retail / year</th><th class="num hide-sm">Margin</th><th data-label=""></th></tr>
        </thead>
        <tbody>
          <tr v-for="s in list" :key="s.id" class="is-clickable" :data-scenario="s.name" @click="$emit('load', s)">
            <td>
              <strong>{{ s.name }}</strong>
              <small class="block muted">{{ s.snapshot.need || '' }}<template v-if="s.snapshot.need"> · </template>saved {{ formatDate(s.updated_at) }}</small>
            </td>
            <td class="hide-sm card-show">{{ s.snapshot.label || '—' }}</td>
            <td class="num">{{ s.snapshot.cost_home != null ? cur(s.snapshot.cost_home, s.snapshot.home) : '—' }}</td>
            <td class="num">
              <template v-if="price(s)">{{ cur(price(s).yearly, price(s).currency) }}</template><template v-else>—</template>
              <small v-for="p in (s.snapshot.prices || []).slice(1)" :key="p.currency" class="block muted">{{ cur(p.yearly, p.currency) }}</small>
            </td>
            <td class="num hide-sm card-show">{{ price(s) ? `${Number(price(s).margin_pct).toFixed(1)}%` : '—' }}</td>
            <td class="acts">
              <button type="button" class="ui-btn ui-btn--sm" :aria-label="`Open ${s.name}`" data-testid="scenario-load" @click.stop="$emit('load', s)"><i class="fa-solid fa-arrow-up-right-from-square"></i> <span class="hide-sm">Open</span></button>
              <button v-if="canEdit" type="button" class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" :aria-label="`Delete ${s.name}`" title="Delete" data-testid="scenario-delete" @click.stop="remove(s)"><i class="fa-regular fa-trash-can"></i></button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-if="list && list.length" class="muted cap">The numbers shown are from the day each comparison was saved. Open one to run it again with today's prices and exchange rates.</p>
  </div>
</template>

<script>
import { pricebookApi, cur } from '@/services/pricebook'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'
import { formatDate } from '@/utils/format'

export default {
  name: 'ScenarioList',
  props: {
    list: { type: Array, default: null },
    error: { type: String, default: '' },
    canEdit: { type: Boolean, default: false }
  },
  emits: ['load', 'changed'],
  methods: {
    cur,
    formatDate,
    price(s) {
      return (s.snapshot.prices || [])[0] || null
    },
    async remove(s) {
      const ok = await confirmDialog({ title: 'Delete this comparison?', message: `“${s.name}” will be removed. Your price lists are not affected.`, confirmText: 'Delete', danger: true })
      if (!ok) return
      try {
        await pricebookApi.deleteScenario(s.id)
        toast.success('Comparison deleted')
        this.$emit('changed')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not delete the comparison'))
      }
    }
  }
}
</script>

<style scoped>
.muted {
  color: var(--text-3);
  font-size: 12.5px;
}
.cap {
  margin: 10px 0 0;
}
.block {
  display: block;
}
td small.block {
  font-weight: 400;
}
.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.acts {
  text-align: right;
  white-space: nowrap;
}
@media (max-width: 640px) {
  .hide-sm {
    display: none;
  }
}
</style>
