<template>
  <div class="ui-modal-backdrop" @mousedown.self="close">
    <form class="ui-modal po-modal" novalidate @submit.prevent="save('draft')">
      <div class="ui-modal__head">
        <h2>{{ isEdit ? `Edit ${order.order_number}` : 'New purchase order' }}</h2>
        <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="close"><i class="fa-solid fa-xmark"></i></button>
      </div>

      <div class="ui-modal__body">
        <div v-if="error" class="ui-alert ui-alert--danger" style="margin-bottom: 16px"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>

        <div v-if="loading" class="loading"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading suppliers and products…</div>

        <template v-else>
          <div v-if="!suppliers.length" class="ui-alert ui-alert--warning" style="margin-bottom: 16px">
            <i class="fa-solid fa-triangle-exclamation"></i><span>Add a supplier first – purchase orders are raised against a supplier.</span>
          </div>
          <div v-if="!products.length" class="ui-alert ui-alert--warning" style="margin-bottom: 16px">
            <i class="fa-solid fa-triangle-exclamation"></i>
            <span>You have no products yet. <router-link to="/inventory" @click="$emit('close')">Add products in Inventory</router-link> to order them.</span>
          </div>

          <div class="head-grid">
            <div class="ui-field sup">
              <label for="po_supplier">Supplier <span class="req">*</span></label>
              <select id="po_supplier" v-model="form.supplier_id" class="ui-select" :class="{ 'is-invalid': errors.supplier_id }">
                <option value="" disabled>Choose a supplier…</option>
                <option v-for="s in supplierOptions" :key="s.id" :value="s.id">{{ s.name }}{{ s.is_active === false ? ' (inactive)' : '' }}</option>
              </select>
              <div v-if="errors.supplier_id" class="field-err">{{ errors.supplier_id }}</div>
              <div v-else-if="selectedSupplier?.payment_terms" class="ui-hint">Terms: {{ selectedSupplier.payment_terms }}</div>
            </div>
            <div class="ui-field">
              <label for="po_date">Order date</label>
              <input id="po_date" v-model="form.order_date" type="date" class="ui-input" />
            </div>
            <div class="ui-field">
              <label for="po_expected">Expected delivery</label>
              <input id="po_expected" v-model="form.expected_date" type="date" class="ui-input" :class="{ 'is-invalid': errors.expected_date }" :min="form.order_date" />
              <div v-if="errors.expected_date" class="field-err">{{ errors.expected_date }}</div>
            </div>
          </div>

          <div class="lines-head">
            <h3>Line items</h3>
            <span v-if="errors.items" class="field-err">{{ errors.items }}</span>
          </div>

          <div class="lines">
            <div class="line line--head" aria-hidden="true">
              <span>Product</span><span class="num">Qty</span><span class="num">Unit cost</span><span class="num">Total</span><span></span>
            </div>
            <div v-for="(l, i) in form.items" :key="l.key" class="line">
              <div class="cell-product">
                <label class="sr" :for="`po_p_${i}`">Product</label>
                <select :id="`po_p_${i}`" v-model="l.product_id" class="ui-select" :class="{ 'is-invalid': l.err && !l.product_id }" @change="onProduct(l)">
                  <option value="" disabled>Choose a product…</option>
                  <option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }} · {{ p.sku }}</option>
                </select>
                <small v-if="productById[l.product_id]" class="stock-note">
                  {{ productById[l.product_id].current_stock }} {{ productById[l.product_id].unit_of_measure || 'each' }} on hand
                  <span v-if="productById[l.product_id].stock_status !== 'in_stock'" :class="productById[l.product_id].stock_status === 'out_of_stock' ? 'txt-danger' : 'txt-warning'">
                    · {{ productById[l.product_id].stock_status === 'out_of_stock' ? 'out of stock' : 'low stock' }}
                  </span>
                </small>
              </div>
              <div class="cell-qty">
                <label class="sr" :for="`po_q_${i}`">Quantity</label>
                <input :id="`po_q_${i}`" v-model.number="l.quantity" type="number" min="1" step="1" class="ui-input num-input" :class="{ 'is-invalid': l.err && !(l.quantity >= 1) }" />
              </div>
              <div class="cell-cost">
                <label class="sr" :for="`po_c_${i}`">Unit cost</label>
                <input :id="`po_c_${i}`" v-model.number="l.unit_cost" type="number" min="0" step="0.01" class="ui-input num-input" />
              </div>
              <div class="cell-total num">{{ money(lineTotal(l)) }}</div>
              <div class="cell-rm">
                <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon ui-btn--sm" :disabled="form.items.length === 1" aria-label="Remove line" @click="removeLine(i)"><i class="fa-regular fa-trash-can"></i></button>
              </div>
            </div>
          </div>
          <button type="button" class="ui-btn ui-btn--sm add-line" :disabled="!products.length" @click="addLine"><i class="fa-solid fa-plus"></i> Add line</button>

          <div class="bottom">
            <div class="ui-field notes">
              <label for="po_notes">Notes for supplier</label>
              <textarea id="po_notes" v-model="form.notes" class="ui-textarea" rows="4" placeholder="Delivery instructions, account number…"></textarea>
            </div>
            <dl class="totals">
              <div><dt>Subtotal</dt><dd>{{ money(subTotal) }}</dd></div>
              <div class="row-input">
                <dt>
                  <select v-model.number="form.tax_rate" class="ui-select ui-select--sm" aria-label="Tax">
                    <option :value="0">No tax</option>
                    <option :value="10">GST 10%</option>
                  </select>
                </dt>
                <dd>{{ money(taxAmount) }}</dd>
              </div>
              <div class="row-input">
                <dt><label for="po_ship">Shipping</label></dt>
                <dd><input id="po_ship" v-model.number="form.shipping_cost" type="number" min="0" step="0.01" class="ui-input num-input ship" /></dd>
              </div>
              <div class="grand"><dt>Total</dt><dd>{{ money(total) }}</dd></div>
            </dl>
          </div>
        </template>
      </div>

      <div class="ui-modal__foot">
        <button type="button" class="ui-btn" @click="close">Cancel</button>
        <button type="submit" class="ui-btn" :disabled="saving || loading">
          <i :class="saving === 'draft' ? 'fa-solid fa-circle-notch fa-spin' : 'fa-regular fa-floppy-disk'"></i> {{ isEdit ? 'Save changes' : 'Save as draft' }}
        </button>
        <button v-if="!isEdit || order.status === 'draft'" type="button" class="ui-btn ui-btn--primary" :disabled="saving || loading" @click="save('sent')">
          <i :class="saving === 'sent' ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-paper-plane'"></i> {{ isEdit ? 'Save & mark ordered' : 'Create & mark ordered' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script>
import { supplierService } from '@/services/supplierService'
import { inventoryService } from '@/services/inventoryService'
import { listFrom, apiErrorMessage } from '@/services/api'
import { formatMoney, isoDate, addDays } from '@/utils/format'
import { toast } from '@/composables/useToast'

let seq = 0
const newLine = (p = {}) => ({ key: ++seq, product_id: p.product_id || '', quantity: p.quantity || 1, unit_cost: p.unit_cost ?? 0, err: false })

export default {
  name: 'PurchaseOrderModal',
  props: {
    order: { type: Object, default: null },
    supplierId: { type: String, default: '' },
    /** optional list of product ids to prefill (e.g. reorder low stock) */
    prefillProducts: { type: Array, default: () => [] }
  },
  emits: ['close', 'saved'],
  data() {
    return {
      loading: true,
      saving: '',
      error: '',
      errors: {},
      suppliers: [],
      products: [],
      form: {
        supplier_id: this.supplierId || '',
        order_date: isoDate(),
        expected_date: addDays(isoDate(), 7),
        notes: '',
        tax_rate: 10,
        shipping_cost: 0,
        items: [newLine()]
      }
    }
  },
  computed: {
    isEdit() {
      return !!this.order?.id
    },
    productById() {
      return Object.fromEntries(this.products.map((p) => [p.id, p]))
    },
    supplierOptions() {
      return this.suppliers.filter((s) => s.is_active !== false || s.id === this.form.supplier_id)
    },
    selectedSupplier() {
      return this.suppliers.find((s) => s.id === this.form.supplier_id)
    },
    subTotal() {
      return this.round(this.form.items.reduce((sum, l) => sum + this.lineTotal(l), 0))
    },
    taxAmount() {
      return this.round((this.subTotal * (Number(this.form.tax_rate) || 0)) / 100)
    },
    total() {
      return this.round(this.subTotal + this.taxAmount + (Number(this.form.shipping_cost) || 0))
    }
  },
  async created() {
    if (this.isEdit) {
      const o = this.order
      const sub = Number(o.sub_total) || 0
      this.form = {
        supplier_id: o.supplier_id,
        order_date: isoDate(o.order_date) || isoDate(),
        expected_date: o.expected_date ? isoDate(o.expected_date) : '',
        notes: o.notes || '',
        tax_rate: sub > 0 && Number(o.tax_amount) > 0 ? Math.round((Number(o.tax_amount) / sub) * 100) : 0,
        shipping_cost: Number(o.shipping_cost) || 0,
        items: (o.items || []).map((it) => newLine({ product_id: it.product_id, quantity: it.quantity, unit_cost: Number(it.unit_cost) }))
      }
      if (!this.form.items.length) this.form.items = [newLine()]
    }
    try {
      const [s, p] = await Promise.all([supplierService.getSuppliers(), inventoryService.getProducts()])
      this.suppliers = listFrom(s, 'suppliers')
      this.products = listFrom(p, 'products').filter((x) => x.is_active !== false || this.form.items.some((l) => l.product_id === x.id))
      if (!this.form.supplier_id && this.supplierOptions.length === 1) this.form.supplier_id = this.supplierOptions[0].id
      if (!this.isEdit && this.prefillProducts.length) {
        this.form.items = this.prefillProducts
          .map((id) => this.productById[id])
          .filter(Boolean)
          .map((pr) => newLine({ product_id: pr.id, quantity: Math.max(1, (pr.max_stock || pr.reorder_point * 2 || 1) - pr.current_stock), unit_cost: Number(pr.cost_price) || 0 }))
        if (!this.form.items.length) this.form.items = [newLine()]
      }
    } catch (e) {
      this.error = apiErrorMessage(e, 'Could not load suppliers and products')
    } finally {
      this.loading = false
    }
  },
  mounted() {
    document.addEventListener('keydown', this.onKey)
  },
  beforeUnmount() {
    document.removeEventListener('keydown', this.onKey)
  },
  methods: {
    money: (v) => formatMoney(v),
    round: (v) => Math.round((Number(v) || 0) * 100) / 100,
    onKey(e) {
      if (e.key === 'Escape') this.close()
    },
    close() {
      if (!this.saving) this.$emit('close')
    },
    lineTotal(l) {
      return this.round((Number(l.quantity) || 0) * (Number(l.unit_cost) || 0))
    },
    onProduct(l) {
      const p = this.productById[l.product_id]
      if (p && (!l.unit_cost || l.unit_cost === 0)) l.unit_cost = Number(p.cost_price) || 0
    },
    addLine() {
      this.form.items.push(newLine())
    },
    removeLine(i) {
      this.form.items.splice(i, 1)
    },
    validate() {
      const e = {}
      if (!this.form.supplier_id) e.supplier_id = 'Choose a supplier.'
      if (this.form.expected_date && this.form.order_date && this.form.expected_date < this.form.order_date) e.expected_date = 'Expected date is before the order date.'
      let bad = false
      for (const l of this.form.items) {
        l.err = !l.product_id || !(Number(l.quantity) >= 1) || !Number.isInteger(Number(l.quantity)) || Number(l.unit_cost) < 0
        if (l.err) bad = true
      }
      if (bad) e.items = 'Each line needs a product and a whole-number quantity of at least 1.'
      this.errors = e
      return !Object.keys(e).length
    },
    async save(status) {
      this.error = ''
      if (!this.validate()) return
      this.saving = status
      const payload = {
        supplier_id: this.form.supplier_id,
        order_date: this.form.order_date,
        expected_date: this.form.expected_date || '',
        notes: this.form.notes,
        tax_amount: this.taxAmount,
        shipping_cost: Number(this.form.shipping_cost) || 0,
        items: this.form.items.map((l) => ({ product_id: l.product_id, quantity: Number(l.quantity), unit_cost: Number(l.unit_cost) || 0 }))
      }
      if (!this.isEdit || this.order.status === 'draft') payload.status = status
      try {
        const res = this.isEdit ? await supplierService.updatePurchaseOrder(this.order.id, payload) : await supplierService.createPurchaseOrder(payload)
        const po = res.data?.purchase_order
        toast.success(this.isEdit ? `${po?.order_number || 'Purchase order'} updated` : `${po?.order_number || 'Purchase order'} created${status === 'sent' ? ' and marked as ordered' : ''}`)
        this.$emit('saved', po)
      } catch (err) {
        this.error = apiErrorMessage(err, 'Could not save the purchase order')
      } finally {
        this.saving = ''
      }
    }
  }
}
</script>

<style scoped>
.po-modal {
  max-width: 860px;
}
.loading {
  padding: 40px 0;
  text-align: center;
  color: var(--text-3);
}
.head-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 12px 14px;
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
.lines-head {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin: 22px 0 8px;
}
.lines-head h3 {
  font-size: 14px;
  font-weight: 650;
  margin: 0;
  color: var(--text);
}
.lines {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}
.line {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 90px 120px 110px 40px;
  gap: 10px;
  align-items: start;
  padding: 10px 12px;
  border-top: 1px solid var(--border);
}
.line--head {
  border-top: 0;
  padding-top: 8px;
  padding-bottom: 8px;
  background: var(--surface-2);
  font-size: 11.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-3);
}
.num {
  text-align: right;
}
.num-input {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.cell-total {
  padding-top: 9px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--text);
}
.cell-product {
  min-width: 0;
}
.stock-note {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-3);
}
.txt-danger {
  color: var(--danger);
}
.txt-warning {
  color: var(--warning);
}
.add-line {
  margin-top: 10px;
}
.bottom {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 24px;
  margin-top: 20px;
  align-items: start;
}
.totals {
  margin: 0;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 12px 14px;
}
.totals > div {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 5px 0;
}
.totals dt {
  font-weight: 500;
  color: var(--text-2);
  font-size: 13.5px;
}
.totals dd {
  margin: 0;
  font-variant-numeric: tabular-nums;
  color: var(--text);
}
.totals .grand {
  border-top: 1px solid var(--border);
  margin-top: 6px;
  padding-top: 10px;
}
.totals .grand dt,
.totals .grand dd {
  font-weight: 700;
  font-size: 16px;
  color: var(--text);
}
.ui-select--sm {
  height: 32px;
  padding-top: 4px;
  padding-bottom: 4px;
  font-size: 13px;
  width: auto;
}
.ship {
  width: 110px;
  height: 32px;
}
.sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}
@media (max-width: 760px) {
  .head-grid {
    grid-template-columns: 1fr 1fr;
  }
  .head-grid .sup {
    grid-column: span 2;
  }
  .bottom {
    grid-template-columns: 1fr;
  }
  .line--head {
    display: none;
  }
  .line {
    grid-template-columns: 1fr 1fr 40px;
    grid-template-areas: 'p p p' 'q c r' 't t t';
    border-top: 1px solid var(--border);
  }
  .line:nth-child(2) {
    border-top: 0;
  }
  .cell-product {
    grid-area: p;
  }
  .cell-qty {
    grid-area: q;
  }
  .cell-cost {
    grid-area: c;
  }
  .cell-rm {
    grid-area: r;
  }
  .cell-total {
    grid-area: t;
    padding-top: 0;
  }
  .cell-total::before {
    content: 'Line total ';
    font-weight: 500;
    color: var(--text-3);
  }
}
</style>
