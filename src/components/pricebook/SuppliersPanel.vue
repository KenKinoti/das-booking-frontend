<template>
  <div class="sup" data-testid="suppliers-panel">
    <div class="toolbar">
      <span class="muted">Wholesale suppliers and your own server are options to buy from; competitors are only a benchmark for your retail price.</span>
      <span class="spacer"></span>
      <button v-if="canEdit" type="button" class="ui-btn ui-btn--sm" data-testid="add-supplier" @click="$emit('add')"><i class="fa-solid fa-plus"></i> Add supplier</button>
    </div>
    <div class="ui-table-wrap">
      <table v-table-cards class="ui-table" data-testid="suppliers-table">
        <thead>
          <tr><th>Supplier</th><th>Type</th><th class="hide-sm">Currency</th><th class="num">Prices</th><th class="hide-sm">Last checked</th><th data-label=""></th></tr>
        </thead>
        <tbody>
          <tr v-for="s in suppliers" :key="s.id" :data-supplier="s.name" :data-type="s.type">
            <td>
              <strong>{{ s.name }}</strong>
              <a v-if="safeUrl(s.website)" :href="safeUrl(s.website)" target="_blank" rel="noopener noreferrer" class="web" :aria-label="`Website of ${s.name}`"><i class="fa-solid fa-arrow-up-right-from-square"></i></a>
              <small v-if="s.notes" class="block muted">{{ s.notes }}</small>
            </td>
            <td><span class="ui-badge" :class="typeOf(s.type).badge">{{ typeOf(s.type).label }}</span></td>
            <td class="hide-sm card-show">{{ s.currency }}</td>
            <td class="num">
              <button type="button" class="link" :title="`Show ${s.name}'s prices`" @click="$emit('show', s)">{{ s.items }}</button>
              <small v-if="s.stale" class="block txt-warn">{{ s.stale }} to check</small>
              <small v-else-if="s.type === 'self_hosted'" class="block muted">cost model</small>
            </td>
            <td class="hide-sm">{{ s.latest_as_of ? formatDate(s.latest_as_of) : '—' }}<small v-if="s.oldest_as_of && s.oldest_as_of !== s.latest_as_of" class="block muted">oldest {{ formatDate(s.oldest_as_of) }}</small></td>
            <td class="acts">
              <template v-if="canEdit">
                <button type="button" class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" :aria-label="`Add a price for ${s.name}`" title="Add a price" @click="$emit('add-price', s)"><i class="fa-solid fa-plus"></i></button>
                <button type="button" class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" :aria-label="`Edit ${s.name}`" title="Edit" data-testid="edit-supplier" @click="$emit('edit', s)"><i class="fa-regular fa-pen-to-square"></i></button>
                <button type="button" class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" :aria-label="`Delete ${s.name}`" title="Delete" data-testid="delete-supplier" @click="remove(s)"><i class="fa-regular fa-trash-can"></i></button>
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
import { pricebookApi, typeOf, safeUrl } from '@/services/pricebook'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'
import { formatDate } from '@/utils/format'

export default {
  name: 'SuppliersPanel',
  props: {
    suppliers: { type: Array, default: () => [] },
    canEdit: { type: Boolean, default: false }
  },
  emits: ['add', 'edit', 'show', 'add-price', 'changed'],
  methods: {
    typeOf,
    safeUrl,
    formatDate,
    async remove(s) {
      const ok = await confirmDialog({
        title: `Delete ${s.name}?`,
        message: s.items ? `Its ${s.items} price${s.items === 1 ? '' : 's'} and their history will be deleted too.` : 'The supplier will be removed.',
        confirmText: 'Delete',
        danger: true
      })
      if (!ok) return
      try {
        await pricebookApi.deleteSupplier(s.id)
        toast.success(`${s.name} deleted`)
        this.$emit('changed')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not delete the supplier'))
      }
    }
  }
}
</script>

<style scoped>
.toolbar {
  display: flex;
  gap: 8px 12px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.spacer {
  flex: 1;
}
.muted {
  color: var(--text-3);
  font-size: 12.5px;
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
}
.acts {
  text-align: right;
  white-space: nowrap;
}
.web {
  margin-left: 6px;
  color: var(--text-3);
  font-size: 11px;
}
.link {
  background: none;
  border: 0;
  padding: 0;
  font: inherit;
  color: var(--accent);
  cursor: pointer;
  font-weight: 600;
}
.txt-warn {
  color: var(--warning);
}
@media (max-width: 640px) {
  .hide-sm {
    display: none;
  }
}
</style>
