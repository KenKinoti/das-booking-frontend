<template>
  <div class="mp ui-modal-backdrop" @mousedown.self="close">
    <form class="ui-modal" style="max-width: 820px" novalidate @submit.prevent="save">
      <div class="ui-modal__head">
        <h2>{{ bom && bom.id ? 'Edit bill of materials' : 'New bill of materials' }}</h2>
        <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="close"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="ui-modal__body">
        <div v-if="formError" class="ui-alert ui-alert--danger" style="margin-bottom: 16px"><i class="fa-solid fa-circle-exclamation"></i><span>{{ formError }}</span></div>
        <div v-if="!products.length" class="ui-alert ui-alert--warning" style="margin-bottom: 16px">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <span>You need products in inventory first — both the finished product and its components. <router-link to="/inventory">Go to inventory</router-link></span>
        </div>
        <div class="form-grid">
          <label class="ui-field">
            <span class="ui-label">Finished product *</span>
            <select v-model="form.product_id" class="ui-select" :class="{ 'is-invalid': errors.product_id }" @change="autoName">
              <option value="">Choose what this makes…</option>
              <option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }}{{ p.sku ? ` · ${p.sku}` : '' }}</option>
            </select>
            <span v-if="errors.product_id" class="field-error">{{ errors.product_id }}</span>
          </label>
          <label class="ui-field">
            <span class="ui-label">Recipe name</span>
            <input v-model.trim="form.name" class="ui-input" maxlength="160" placeholder="Defaults to the product name" />
          </label>
          <label class="ui-field">
            <span class="ui-label">Makes (units per batch)</span>
            <input v-model.number="form.output_qty" type="number" min="1" step="1" class="ui-input tnum" :class="{ 'is-invalid': errors.output_qty }" />
            <span v-if="errors.output_qty" class="field-error">{{ errors.output_qty }}</span>
            <span v-else class="ui-hint">Component quantities below are for this many units.</span>
          </label>
          <div class="ui-field">
            <span class="ui-label">Material cost per unit</span>
            <div class="cost tnum">{{ money(unitCost) }}</div>
            <span class="ui-hint">From component cost prices in inventory</span>
          </div>
        </div>

        <div class="comp-head">
          <h3>Components</h3>
          <button type="button" class="ui-btn ui-btn--sm" @click="addRow"><i class="fa-solid fa-plus"></i> Add component</button>
        </div>
        <div v-if="errors.components" class="field-error" style="margin-bottom: 8px">{{ errors.components }}</div>
        <div class="comp-list">
          <div v-for="(c, i) in form.components" :key="c.key" class="comp-row">
            <select v-model="c.product_id" class="ui-select" :class="{ 'is-invalid': c.error }" :aria-label="`Component ${i + 1}`">
              <option value="">Choose a component…</option>
              <option v-for="p in products" :key="p.id" :value="p.id" :disabled="p.id === form.product_id">{{ p.name }}{{ p.sku ? ` · ${p.sku}` : '' }} — {{ p.current_stock }} in stock</option>
            </select>
            <input v-model.number="c.quantity" type="number" min="1" step="1" class="ui-input tnum qty" :aria-label="`Quantity for component ${i + 1}`" />
            <span class="muted small unit">{{ unitOf(c.product_id) }}</span>
            <span class="tnum small line-cost">{{ money(lineCost(c)) }}</span>
            <button type="button" class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" :disabled="form.components.length === 1" aria-label="Remove component" @click="form.components.splice(i, 1)"><i class="fa-regular fa-trash-can"></i></button>
          </div>
        </div>
        <label class="ui-field" style="margin-top: 16px">
          <span class="ui-label">Notes</span>
          <textarea v-model="form.notes" rows="2" class="ui-textarea" maxlength="5000" placeholder="Assembly steps, tolerances… (optional)"></textarea>
        </label>
      </div>
      <div class="ui-modal__foot">
        <button type="button" class="ui-btn" @click="close">Cancel</button>
        <button type="submit" class="ui-btn ui-btn--primary" :disabled="saving || !products.length"><i :class="saving ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-check'"></i> {{ bom && bom.id ? 'Save changes' : 'Create' }}</button>
      </div>
    </form>
  </div>
</template>

<script>
import '@/styles/module-page.css'
import api, { apiErrorMessage } from '@/services/api'
import { formatMoney } from '@/utils/format'
import { toast } from '@/composables/useToast'

let seq = 0

export default {
  name: 'BomModal',
  props: { bom: { type: Object, default: null }, products: { type: Array, default: () => [] }, currency: { type: String, default: 'AUD' } },
  emits: ['close', 'saved'],
  data() {
    const b = this.bom || {}
    const comps = (b.components || []).map((c) => ({ key: ++seq, product_id: c.product_id, quantity: c.quantity }))
    return {
      form: { product_id: b.product_id || '', name: b.name || '', output_qty: b.output_qty || 1, notes: b.notes || '', components: comps.length ? comps : [{ key: ++seq, product_id: '', quantity: 1 }] },
      errors: {},
      formError: '',
      saving: false
    }
  },
  computed: {
    byId() {
      return Object.fromEntries(this.products.map((p) => [p.id, p]))
    },
    unitCost() {
      const total = this.form.components.reduce((s, c) => s + this.lineCost(c), 0)
      return total / Math.max(1, Number(this.form.output_qty) || 1)
    }
  },
  methods: {
    money(v) {
      return formatMoney(v, this.currency)
    },
    unitOf(id) {
      return (this.byId[id] && this.byId[id].unit_of_measure) || ''
    },
    lineCost(c) {
      const p = this.byId[c.product_id]
      return p ? Number(p.cost_price || 0) * (Number(c.quantity) || 0) : 0
    },
    autoName() {
      const p = this.byId[this.form.product_id]
      if (p && !this.form.name) this.form.name = p.name
    },
    addRow() {
      this.form.components.push({ key: ++seq, product_id: '', quantity: 1 })
    },
    close() {
      if (!this.saving) this.$emit('close')
    },
    async save() {
      const e = {}
      if (!this.form.product_id) e.product_id = 'Choose the finished product'
      if (!(Number.isInteger(this.form.output_qty) && this.form.output_qty >= 1)) e.output_qty = 'Enter a whole number of at least 1'
      const comps = this.form.components.filter((c) => c.product_id)
      this.form.components.forEach((c) => (c.error = false))
      if (!comps.length) e.components = 'Add at least one component'
      else if (comps.some((c) => !(Number.isInteger(c.quantity) && c.quantity >= 1))) e.components = 'Each component needs a whole-number quantity of at least 1'
      else if (comps.some((c) => c.product_id === this.form.product_id)) e.components = "A product can't be a component of itself"
      this.errors = e
      if (Object.keys(e).length) return
      this.saving = true
      this.formError = ''
      const body = { product_id: this.form.product_id, name: this.form.name, output_qty: this.form.output_qty, notes: this.form.notes, components: comps.map((c) => ({ product_id: c.product_id, quantity: c.quantity })) }
      try {
        const res = this.bom && this.bom.id ? await api.put(`/mrp/boms/${this.bom.id}`, body) : await api.post('/mrp/boms', body)
        toast.success(this.bom && this.bom.id ? 'Bill of materials saved' : 'Bill of materials created')
        this.$emit('saved', res.data.data)
      } catch (err) {
        this.formError = apiErrorMessage(err, 'Could not save')
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

<style scoped>
.cost {
  height: 38px;
  display: flex;
  align-items: center;
  font-size: 18px;
  font-weight: 650;
}

.comp-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 24px 0 10px;
}

.comp-head h3 {
  font-size: 14px;
  font-weight: 650;
  margin: 0;
}

.comp-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.comp-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 90px 48px 100px 36px;
  gap: 8px;
  align-items: center;
}

.line-cost {
  text-align: right;
  color: var(--text-2);
}

@media (max-width: 640px) {
  .comp-row {
    grid-template-columns: minmax(0, 1fr) 80px 36px;
  }
  .comp-row .unit,
  .comp-row .line-cost {
    display: none;
  }
}
</style>
