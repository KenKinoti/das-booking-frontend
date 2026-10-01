<template>
  <div class="opts">
    <fieldset class="opts__group">
      <legend>What to bring in</legend>
      <div class="opts__grid">
        <label v-for="e in entityChoices" :key="e.key" class="opt-check">
          <input type="checkbox" :checked="isOn(e.key)" :disabled="disabled" :data-testid="`opt-${e.key}`" @change="toggle(e.key, $event.target.checked)" />
          <span>
            <strong>{{ e.label }}</strong>
            <small>{{ e.hint }}</small>
          </span>
        </label>
      </div>
    </fieldset>

    <div class="ui-grid-2 opts__row">
      <div class="ui-field">
        <label for="opt-cust">A customer already exists here (same email or name)</label>
        <select id="opt-cust" class="ui-select" :value="modelValue.on_customer_match || 'merge'" :disabled="disabled" @change="set('on_customer_match', $event.target.value)">
          <option value="merge">Merge — link them and fill in missing details</option>
          <option value="skip">Skip — keep ours, don't import that customer</option>
          <option value="create">Create a separate customer</option>
        </select>
      </div>
      <div class="ui-field">
        <label for="opt-doc">An invoice or quote number already exists here</label>
        <select id="opt-doc" class="ui-select" :value="modelValue.on_doc_match || 'skip'" :disabled="disabled" @change="set('on_doc_match', $event.target.value)">
          <option value="skip">Skip it — keep the one here</option>
          <option value="overwrite">Replace it with the imported one</option>
        </select>
      </div>
    </div>

    <div class="opts__switches">
      <label class="ui-switch">
        <input type="checkbox" :checked="modelValue.items_to_catalog !== false" :disabled="disabled || !isOn('items')" @change="set('items_to_catalog', $event.target.checked)" />
        Add items to the services catalog (for new invoices)
      </label>
      <label class="ui-switch">
        <input type="checkbox" :checked="modelValue.continue_numbering !== false" :disabled="disabled" @change="set('continue_numbering', $event.target.checked)" />
        Continue invoice and quote numbers after the highest imported number
      </label>
      <label v-if="showOverwrite" class="ui-switch">
        <input type="checkbox" :checked="!!modelValue.overwrite" :disabled="disabled" data-testid="opt-overwrite" @change="set('overwrite', $event.target.checked)" />
        Overwrite changes made here since the last import (otherwise your edits are kept)
      </label>
    </div>
  </div>
</template>

<script>
const ZOHO = [
  { key: 'contacts', label: 'Customers & contact people', hint: 'Names, emails, addresses, tax numbers, payment terms' },
  { key: 'invoices', label: 'Invoices', hint: 'All statuses, exact numbers, totals and dates' },
  { key: 'payments', label: 'Payments', hint: 'Recorded with their original dates — nothing is emailed' },
  { key: 'quotes', label: 'Quotes (estimates)', hint: 'Linked to the invoices made from them' },
  { key: 'credit_notes', label: 'Credit notes', hint: 'Kept for reference; credit shown on each invoice' },
  { key: 'items', label: 'Items', hint: 'Your products and services' },
  { key: 'pdfs', label: 'Original PDFs', hint: '“Original from Zoho” on each document', api: true },
  { key: 'history', label: 'Email & history', hint: 'Who it was sent to and when', api: true },
  { key: 'recurring', label: 'Recurring profiles', hint: 'As inactive drafts — turn on when you stop them in Zoho', api: true }
]

export const DEFAULT_OPTIONS = () => ({
  entities: { contacts: true, invoices: true, payments: true, quotes: true, credit_notes: true, items: true, pdfs: true, history: true, recurring: false },
  on_customer_match: 'merge',
  on_doc_match: 'skip',
  items_to_catalog: true,
  continue_numbering: true,
  overwrite: false,
  decisions: {}
})

export default {
  name: 'ImportOptions',
  props: {
    modelValue: { type: Object, required: true },
    source: { type: String, default: 'zoho_api' },
    disabled: { type: Boolean, default: false },
    showOverwrite: { type: Boolean, default: false }
  },
  emits: ['update:modelValue'],
  computed: {
    entityChoices() {
      return ZOHO.filter((e) => this.source === 'zoho_api' || !e.api)
    }
  },
  methods: {
    isOn(k) {
      const e = this.modelValue.entities || {}
      return k in e ? !!e[k] : k !== 'recurring'
    },
    toggle(k, v) {
      this.$emit('update:modelValue', { ...this.modelValue, entities: { ...(this.modelValue.entities || {}), [k]: v } })
    },
    set(k, v) {
      this.$emit('update:modelValue', { ...this.modelValue, [k]: v })
    }
  }
}
</script>

<style scoped>
.opts {
  display: grid;
  gap: 18px;
}
.opts__group {
  border: 0;
  padding: 0;
  margin: 0;
  min-width: 0;
}
.opts__group legend {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-2);
  margin-bottom: 10px;
}
.opts__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 8px;
}
.opt-check {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  cursor: pointer;
}
.opt-check:hover {
  background: var(--surface-hover);
}
.opt-check input {
  margin-top: 3px;
  accent-color: var(--accent);
}
.opt-check span {
  display: grid;
  gap: 2px;
  min-width: 0;
}
.opt-check strong {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text);
}
.opt-check small {
  font-size: 12px;
  color: var(--text-3);
}
.opts__switches {
  display: grid;
  gap: 10px;
}
.opts__switches .ui-switch {
  align-items: flex-start;
  line-height: 1.4;
}
</style>
