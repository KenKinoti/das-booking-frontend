<template>
  <div class="ui-modal-backdrop" @mousedown.self="close">
    <form class="ui-modal" style="max-width: 760px" novalidate @submit.prevent="save">
      <div class="ui-modal__head">
        <h2>{{ isEdit ? 'Edit product' : 'Add product' }}</h2>
        <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="close"><i class="fa-solid fa-xmark"></i></button>
      </div>

      <div class="ui-modal__body">
        <div v-if="error" class="ui-alert ui-alert--danger" style="margin-bottom: 16px"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>

        <div class="section-label">Details</div>
        <div class="grid">
          <div class="ui-field span-2">
            <label for="pr_name">Product name <span class="req">*</span></label>
            <input id="pr_name" ref="name" v-model="form.name" class="ui-input" :class="{ 'is-invalid': errors.name }" maxlength="255" placeholder="e.g. Synthetic engine oil 5W-30 5L" @blur="autoSku" />
            <div v-if="errors.name" class="field-err">{{ errors.name }}</div>
          </div>
          <div class="ui-field">
            <label for="pr_sku">SKU</label>
            <div class="with-btn">
              <input id="pr_sku" v-model="form.sku" class="ui-input mono" :class="{ 'is-invalid': errors.sku }" maxlength="100" placeholder="Auto-generated if blank" @input="skuTouched = true" />
              <button type="button" class="ui-btn ui-btn--icon" title="Suggest a SKU from the name" aria-label="Suggest SKU" @click="suggest"><i class="fa-solid fa-wand-magic-sparkles"></i></button>
            </div>
            <div v-if="errors.sku" class="field-err">{{ errors.sku }}</div>
            <div v-else class="ui-hint">Unique within your organisation.</div>
          </div>
          <div class="ui-field">
            <label for="pr_barcode">Barcode</label>
            <input id="pr_barcode" v-model="form.barcode" class="ui-input mono" maxlength="100" placeholder="EAN / UPC" />
          </div>
          <div class="ui-field">
            <label for="pr_cat">Category</label>
            <div v-if="!newCat.open" class="with-btn">
              <select id="pr_cat" v-model="form.category_id" class="ui-select">
                <option value="">Uncategorised</option>
                <option v-for="c in categoryList" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
              <button type="button" class="ui-btn ui-btn--icon" title="New category" aria-label="New category" @click="openNewCat"><i class="fa-solid fa-plus"></i></button>
            </div>
            <div v-else class="with-btn">
              <input id="pr_cat" ref="newCat" v-model="newCat.name" class="ui-input" placeholder="New category name" maxlength="100" @keydown.enter.prevent="createCategory" @keydown.esc.stop.prevent="newCat.open = false" />
              <button type="button" class="ui-btn ui-btn--primary ui-btn--icon" :disabled="newCat.saving" aria-label="Create category" @click="createCategory">
                <i :class="newCat.saving ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-check'"></i>
              </button>
              <button type="button" class="ui-btn ui-btn--icon" aria-label="Cancel new category" @click="newCat.open = false"><i class="fa-solid fa-xmark"></i></button>
            </div>
          </div>
          <div class="ui-field">
            <label for="pr_unit">Unit</label>
            <input id="pr_unit" v-model="form.unit_of_measure" class="ui-input" list="pr-units" maxlength="20" />
            <datalist id="pr-units"><option v-for="u in units" :key="u" :value="u" /></datalist>
          </div>
        </div>

        <div class="section-label">Pricing</div>
        <div class="grid grid-3">
          <div class="ui-field">
            <label for="pr_cost">Cost price</label>
            <div class="ui-input-group"><i class="fa-solid fa-dollar-sign"></i><input id="pr_cost" v-model.number="form.cost_price" type="number" min="0" step="0.01" class="ui-input num" :class="{ 'is-invalid': errors.cost_price }" /></div>
            <div v-if="errors.cost_price" class="field-err">{{ errors.cost_price }}</div>
          </div>
          <div class="ui-field">
            <label for="pr_price">Selling price</label>
            <div class="ui-input-group"><i class="fa-solid fa-dollar-sign"></i><input id="pr_price" v-model.number="form.selling_price" type="number" min="0" step="0.01" class="ui-input num" :class="{ 'is-invalid': errors.selling_price }" /></div>
            <div v-if="errors.selling_price" class="field-err">{{ errors.selling_price }}</div>
          </div>
          <div class="margin-box">
            <span>Margin</span>
            <strong :class="marginClass">{{ margin == null ? '—' : margin.toFixed(1) + '%' }}</strong>
            <small v-if="margin != null">{{ money((Number(form.selling_price) || 0) - (Number(form.cost_price) || 0)) }} per {{ form.unit_of_measure || 'unit' }}</small>
          </div>
        </div>

        <div class="section-label">Stock levels</div>
        <div class="grid grid-4">
          <div v-if="!isEdit" class="ui-field">
            <label for="pr_stock">Opening stock</label>
            <input id="pr_stock" v-model.number="form.current_stock" type="number" min="0" step="1" class="ui-input num" :class="{ 'is-invalid': errors.current_stock }" />
          </div>
          <div v-else class="ui-field">
            <label>On hand</label>
            <div class="readonly">{{ product.current_stock }} {{ form.unit_of_measure }}</div>
          </div>
          <div class="ui-field">
            <label for="pr_min">Minimum</label>
            <input id="pr_min" v-model.number="form.min_stock" type="number" min="0" step="1" class="ui-input num" :class="{ 'is-invalid': errors.min_stock }" />
          </div>
          <div class="ui-field">
            <label for="pr_reorder">Reorder at</label>
            <input id="pr_reorder" v-model.number="form.reorder_point" type="number" min="0" step="1" class="ui-input num" :class="{ 'is-invalid': errors.reorder_point }" />
          </div>
          <div class="ui-field">
            <label for="pr_max">Maximum</label>
            <input id="pr_max" v-model.number="form.max_stock" type="number" min="0" step="1" class="ui-input num" :class="{ 'is-invalid': errors.max_stock }" />
          </div>
        </div>
        <div v-if="errors.levels" class="field-err">{{ errors.levels }}</div>
        <div class="ui-hint" style="margin-top: 6px">
          {{ isEdit ? 'Change stock on hand with “Adjust stock” so every change is recorded.' : 'Products at or below the reorder level show as low stock.' }}
        </div>

        <div class="section-label">More</div>
        <div class="ui-field">
          <label for="pr_desc">Description</label>
          <textarea id="pr_desc" v-model="form.description" class="ui-textarea" rows="2" placeholder="Optional"></textarea>
        </div>
        <label class="ui-switch" style="margin-top: 12px">
          <input v-model="form.is_active" type="checkbox" />
          <span>Active – available for sale and purchase orders</span>
        </label>
      </div>

      <div class="ui-modal__foot">
        <button type="button" class="ui-btn" @click="close">Cancel</button>
        <button type="submit" class="ui-btn ui-btn--primary" :disabled="saving">
          <i :class="saving ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-check'"></i> {{ isEdit ? 'Save changes' : 'Add product' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script>
import { inventoryService, suggestSku, UNITS } from '@/services/inventoryService'
import { apiErrorMessage } from '@/services/api'
import { formatMoney } from '@/utils/format'
import { toast } from '@/composables/useToast'

export default {
  name: 'ProductModal',
  props: {
    product: { type: Object, default: null },
    categories: { type: Array, default: () => [] },
    /** existing products – used to suggest unique SKUs */
    products: { type: Array, default: () => [] }
  },
  emits: ['close', 'saved', 'category-created'],
  data() {
    const p = this.product || {}
    return {
      form: {
        name: p.name || '',
        sku: p.sku || '',
        barcode: p.barcode || '',
        category_id: p.category_id || '',
        unit_of_measure: p.unit_of_measure || 'each',
        cost_price: p.cost_price ?? 0,
        selling_price: p.selling_price ?? 0,
        current_stock: 0,
        min_stock: p.min_stock ?? 0,
        reorder_point: p.reorder_point ?? 0,
        max_stock: p.max_stock ?? 0,
        description: p.description || '',
        is_active: p.is_active !== false
      },
      localCategories: [],
      newCat: { open: false, name: '', saving: false },
      skuTouched: !!p.sku,
      errors: {},
      error: '',
      saving: false,
      units: UNITS
    }
  },
  computed: {
    isEdit() {
      return !!this.product?.id
    },
    categoryList() {
      const seen = new Set()
      return [...this.categories, ...this.localCategories].filter((c) => (seen.has(c.id) ? false : seen.add(c.id))).sort((a, b) => a.name.localeCompare(b.name))
    },
    takenSkus() {
      return new Set(this.products.filter((p) => p.id !== this.product?.id).map((p) => String(p.sku || '').toUpperCase()))
    },
    margin() {
      const s = Number(this.form.selling_price) || 0
      const c = Number(this.form.cost_price) || 0
      if (!s) return null
      return ((s - c) / s) * 100
    },
    marginClass() {
      if (this.margin == null) return ''
      return this.margin < 0 ? 'txt-danger' : this.margin < 15 ? 'txt-warning' : 'txt-success'
    }
  },
  mounted() {
    this.$refs.name?.focus()
    document.addEventListener('keydown', this.onKey)
  },
  beforeUnmount() {
    document.removeEventListener('keydown', this.onKey)
  },
  methods: {
    money: (v) => formatMoney(v),
    onKey(e) {
      if (e.key === 'Escape' && !this.newCat.open) this.close()
    },
    close() {
      if (!this.saving) this.$emit('close')
    },
    autoSku() {
      if (!this.isEdit && !this.skuTouched && this.form.name.trim()) this.form.sku = suggestSku(this.form.name, this.takenSkus)
    },
    suggest() {
      if (!this.form.name.trim()) {
        this.errors = { ...this.errors, name: 'Enter a name first to suggest a SKU.' }
        return
      }
      this.form.sku = suggestSku(this.form.name, this.takenSkus)
      this.skuTouched = true
    },
    openNewCat() {
      this.newCat = { open: true, name: '', saving: false }
      this.$nextTick(() => this.$refs.newCat?.focus())
    },
    async createCategory() {
      const name = this.newCat.name.trim()
      if (!name) return
      const existing = this.categoryList.find((c) => c.name.toLowerCase() === name.toLowerCase())
      if (existing) {
        this.form.category_id = existing.id
        this.newCat.open = false
        return
      }
      this.newCat.saving = true
      try {
        const res = await inventoryService.createCategory({ name })
        const cat = res.data?.category
        if (cat) {
          this.localCategories.push(cat)
          this.form.category_id = cat.id
          this.$emit('category-created', cat)
          toast.success(`Category “${cat.name}” created`)
        }
        this.newCat.open = false
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not create the category'))
      } finally {
        this.newCat.saving = false
      }
    },
    validate() {
      const f = this.form
      const e = {}
      const nonNeg = (v) => v === '' || v == null || Number(v) >= 0
      const wholeNonNeg = (v) => v === '' || v == null || (Number.isInteger(Number(v)) && Number(v) >= 0)
      if (!f.name.trim()) e.name = 'Enter a product name.'
      const sku = f.sku.trim().toUpperCase()
      if (this.isEdit && !sku) e.sku = 'Enter a SKU.'
      else if (sku && this.takenSkus.has(sku)) e.sku = 'Another product already uses this SKU.'
      if (!nonNeg(f.cost_price)) e.cost_price = 'Cannot be negative.'
      if (!nonNeg(f.selling_price)) e.selling_price = 'Cannot be negative.'
      for (const k of ['current_stock', 'min_stock', 'reorder_point', 'max_stock']) if (!wholeNonNeg(f[k])) e[k] = true
      if (e.current_stock || e.min_stock || e.reorder_point || e.max_stock) e.levels = 'Stock levels must be whole numbers of 0 or more.'
      else if (Number(f.max_stock) > 0 && Number(f.min_stock) > Number(f.max_stock)) {
        e.levels = 'Minimum can’t be more than maximum.'
        e.min_stock = true
      }
      this.errors = e
      return !Object.keys(e).length
    },
    async save() {
      this.error = ''
      if (!this.validate()) return
      this.saving = true
      const f = this.form
      const payload = {
        name: f.name.trim(),
        sku: f.sku.trim(),
        barcode: f.barcode.trim(),
        category_id: f.category_id || '',
        unit_of_measure: f.unit_of_measure || 'each',
        cost_price: Number(f.cost_price) || 0,
        selling_price: Number(f.selling_price) || 0,
        min_stock: Number(f.min_stock) || 0,
        reorder_point: Number(f.reorder_point) || 0,
        max_stock: Number(f.max_stock) || 0,
        description: f.description,
        is_active: f.is_active
      }
      if (!this.isEdit) payload.current_stock = Number(f.current_stock) || 0
      try {
        const res = this.isEdit ? await inventoryService.updateProduct(this.product.id, payload) : await inventoryService.createProduct(payload)
        const p = res.data?.product
        toast.success(this.isEdit ? 'Product updated' : `${p?.name || 'Product'} added (${p?.sku})`)
        this.$emit('saved', p)
      } catch (e) {
        const msg = apiErrorMessage(e, 'Could not save the product')
        if (e.response?.status === 409 && /sku/i.test(msg)) this.errors = { ...this.errors, sku: msg }
        else this.error = msg
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

<style scoped>
.section-label {
  font-size: 11.5px;
  font-weight: 650;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-3);
  margin: 20px 0 10px;
}
.section-label:first-of-type {
  margin-top: 0;
}
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 14px;
}
.grid-3 {
  grid-template-columns: 1fr 1fr 1fr;
}
.grid-4 {
  grid-template-columns: repeat(4, 1fr);
}
.span-2 {
  grid-column: span 2;
}
.with-btn {
  display: flex;
  gap: 6px;
}
.with-btn > .ui-input,
.with-btn > .ui-select {
  flex: 1;
  min-width: 0;
}
.mono {
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
}
.num {
  font-variant-numeric: tabular-nums;
}
.req {
  color: var(--danger);
}
.is-invalid {
  border-color: var(--danger) !important;
}
.field-err {
  color: var(--danger);
  font-size: 12px;
  margin-top: 4px;
}
.margin-box {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.margin-box span {
  font-size: 11.5px;
  color: var(--text-3);
}
.margin-box strong {
  font-size: 17px;
  font-variant-numeric: tabular-nums;
  color: var(--text);
}
.margin-box small {
  font-size: 11.5px;
  color: var(--text-3);
}
.readonly {
  height: 40px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  border: 1px dashed var(--border-strong);
  color: var(--text-2);
  font-variant-numeric: tabular-nums;
}
.txt-danger {
  color: var(--danger) !important;
}
.txt-warning {
  color: var(--warning) !important;
}
.txt-success {
  color: var(--success) !important;
}
@media (max-width: 640px) {
  .grid,
  .grid-3 {
    grid-template-columns: 1fr;
  }
  .grid-4 {
    grid-template-columns: 1fr 1fr;
  }
  .span-2 {
    grid-column: auto;
  }
}
</style>
