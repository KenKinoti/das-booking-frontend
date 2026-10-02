<template>
  <div class="ui-modal-backdrop" @mousedown.self="$emit('close')">
    <form class="ui-modal" style="max-width: 560px" role="dialog" aria-modal="true" aria-labelledby="pbs-title" data-testid="supplier-modal" @submit.prevent="save">
      <div class="ui-modal__head">
        <div>
          <div class="ui-eyebrow">Supplier prices</div>
          <h2 id="pbs-title">{{ supplier ? supplier.name : 'Add a supplier' }}</h2>
        </div>
        <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="$emit('close')"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="ui-modal__body">
        <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>
        <div class="grid">
          <label class="ui-field span2">
            <span class="ui-label">Name</span>
            <input v-model.trim="form.name" class="ui-input" required maxlength="160" placeholder="e.g. Synergy Wholesale" data-testid="supplier-name" />
          </label>
          <div class="ui-field span2">
            <span class="ui-label">Type</span>
            <div class="types" role="radiogroup" aria-label="Supplier type">
              <label v-for="t in TYPES" :key="t.key" class="type" :class="{ on: form.type === t.key }">
                <input v-model="form.type" type="radio" name="pb-type" :value="t.key" :data-testid="'type-' + t.key" />
                <span><i :class="t.icon"></i> <strong>{{ t.label }}</strong><small>{{ t.hint }}</small></span>
              </label>
            </div>
          </div>
          <label class="ui-field">
            <span class="ui-label">Currency of its prices</span>
            <select v-model="form.currency" class="ui-select" data-testid="supplier-currency">
              <optgroup v-for="g in groups" :key="g.region" :label="g.region">
                <option v-for="c in g.items" :key="c.code" :value="c.code">{{ c.code }} — {{ c.name }}</option>
              </optgroup>
            </select>
          </label>
          <label class="ui-field">
            <span class="ui-label">Website</span>
            <input v-model.trim="form.website" class="ui-input" placeholder="https://…" />
          </label>
          <label class="ui-field span2">
            <span class="ui-label">Notes</span>
            <textarea v-model.trim="form.notes" class="ui-textarea" rows="2" placeholder="Account number, GST treatment, contact…"></textarea>
          </label>
        </div>
      </div>
      <div class="ui-modal__foot">
        <button type="button" class="ui-btn" @click="$emit('close')">Cancel</button>
        <button type="submit" class="ui-btn ui-btn--primary" :disabled="busy" data-testid="supplier-save">{{ supplier ? 'Save' : 'Add supplier' }}</button>
      </div>
    </form>
  </div>
</template>

<script>
import { pricebookApi, TYPES } from '@/services/pricebook'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { currencyGroups } from '@/utils/currencies'

export default {
  name: 'PricebookSupplierModal',
  props: {
    supplier: { type: Object, default: null },
    presetType: { type: String, default: '' },
    home: { type: String, default: 'AUD' }
  },
  emits: ['close', 'saved'],
  data() {
    const s = this.supplier
    return {
      TYPES,
      groups: currencyGroups(),
      busy: false,
      error: '',
      form: { name: s?.name || '', type: s?.type || this.presetType || 'wholesale', currency: s?.currency || this.home, website: s?.website || '', notes: s?.notes || '' }
    }
  },
  methods: {
    async save() {
      this.busy = true
      this.error = ''
      try {
        const r = this.supplier ? await pricebookApi.updateSupplier(this.supplier.id, this.form) : await pricebookApi.createSupplier(this.form)
        toast.success(this.supplier ? 'Supplier saved' : 'Supplier added')
        this.$emit('saved', r.supplier)
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not save the supplier')
      } finally {
        this.busy = false
      }
    }
  }
}
</script>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 14px;
}
.span2 {
  grid-column: 1 / -1;
}
.types {
  display: grid;
  gap: 8px;
}
.type {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 9px 12px;
  cursor: pointer;
}
.type.on {
  border-color: var(--accent);
  background: var(--accent-soft);
}
.type input {
  margin-top: 3px;
}
.type span {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 8px;
  align-items: baseline;
  font-size: 13.5px;
}
.type i {
  color: var(--text-3);
  width: 16px;
}
.type small {
  flex-basis: 100%;
  color: var(--text-2);
  font-size: 12.5px;
}
@media (max-width: 560px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
