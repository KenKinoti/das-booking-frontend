<template>
  <div class="ui-modal-backdrop" @mousedown.self="$emit('close')">
    <form class="ui-modal" style="max-width: 980px" role="dialog" aria-modal="true" aria-labelledby="bill-title" @submit.prevent="save('unpaid')">
      <div class="ui-modal__head">
        <div>
          <div v-if="bill" class="ui-eyebrow">{{ bill.bill_number }}</div>
          <h2 id="bill-title">{{ bill ? 'Edit bill' : 'New bill' }}</h2>
        </div>
        <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="$emit('close')"><i class="fa-solid fa-xmark"></i></button>
      </div>

      <div class="ui-modal__body">
        <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>
        <div v-if="locked" class="ui-alert ui-alert--warning">
          <i class="fa-solid fa-lock"></i><span>This bill has payments recorded, so only the reference, due date and notes can be changed. Remove the payments to edit amounts.</span>
        </div>

        <div class="top">
          <div class="ui-field vendor-field">
            <span class="ui-label">Vendor</span>
            <div v-if="!addingVendor" class="vendor-row">
              <select v-model="form.vendor_id" class="ui-select" :class="{ 'is-invalid': touched && !form.vendor_id }" :disabled="locked" aria-label="Vendor" @change="onVendor">
                <option value="">Select a vendor…</option>
                <option v-for="v in vendorList" :key="v.id" :value="v.id">{{ v.name }}</option>
              </select>
              <button v-if="!locked" type="button" class="ui-btn" title="Add a new vendor" @click="startVendor"><i class="fa-solid fa-plus"></i> <span class="hide-xs">New</span></button>
            </div>
            <div v-else class="vendor-new">
              <input ref="vname" v-model="newVendor.name" class="ui-input" placeholder="Vendor name" aria-label="New vendor name" @keydown.enter.prevent="createVendor" />
              <input v-model="newVendor.email" class="ui-input" type="email" placeholder="Email (optional)" aria-label="New vendor email" @keydown.enter.prevent="createVendor" />
              <select v-model="newVendor.payment_terms" class="ui-select" aria-label="Payment terms">
                <option v-for="t in terms" :key="t.value" :value="t.value">{{ t.label }}</option>
              </select>
              <div class="vendor-new__actions">
                <button type="button" class="ui-btn ui-btn--primary ui-btn--sm" :disabled="creatingVendor" @click="createVendor">
                  <i :class="creatingVendor ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-check'"></i> Add vendor
                </button>
                <button type="button" class="ui-btn ui-btn--ghost ui-btn--sm" @click="addingVendor = false">Cancel</button>
              </div>
            </div>
          </div>
          <label class="ui-field">
            <span class="ui-label">Supplier invoice #</span>
            <input v-model="form.reference" class="ui-input" placeholder="e.g. INV-2041" maxlength="60" />
          </label>
          <label v-if="poOptions.length || form.purchase_order_id" class="ui-field">
            <span class="ui-label">Purchase order <small class="opt">optional</small></span>
            <select v-model="form.purchase_order_id" class="ui-select" aria-label="Purchase order" data-testid="bill-po">
              <option value="">Not for a purchase order</option>
              <option v-for="po in poOptions" :key="po.id" :value="po.id">{{ po.label }}</option>
            </select>
            <span class="ui-hint">Link the supplier's bill for an order so its stock is counted once in Profit &amp; loss.</span>
          </label>
          <label class="ui-field">
            <span class="ui-label">Bill date</span>
            <input v-model="form.bill_date" type="date" class="ui-input" :disabled="locked" @change="onVendor" />
          </label>
          <label class="ui-field">
            <span class="ui-label">Due date</span>
            <input v-model="form.due_date" type="date" class="ui-input" :class="{ 'is-invalid': form.due_date && form.due_date < form.bill_date }" :min="form.bill_date" />
          </label>
        </div>

        <div class="lines">
          <div class="line line--head">
            <span>Description</span>
            <span>Account</span>
            <span class="num">Qty</span>
            <span class="num">Unit price</span>
            <span>Tax</span>
            <span class="num">Amount</span>
            <span></span>
          </div>
          <div v-for="(l, i) in form.lines" :key="l.key" class="line">
            <input v-model="l.description" class="ui-input c-desc" :disabled="locked" placeholder="What was purchased?" :aria-label="`Line ${i + 1} description`" />
            <AccountSelect v-model="l.account_id" class="c-acct" :accounts="accounts" :types="['Expense', 'Asset', 'Liability', 'Equity']" :disabled="locked" placeholder="Default account" :aria-label="`Line ${i + 1} account`" />
            <input v-model="l.quantity" class="ui-input num c-qty" type="number" min="0" step="any" :disabled="locked" :aria-label="`Line ${i + 1} quantity`" />
            <input v-model="l.unit_price" class="ui-input num c-price" type="number" min="0" step="0.01" placeholder="0.00" :disabled="locked" :aria-label="`Line ${i + 1} unit price`" />
            <select v-model.number="l.tax_rate" class="ui-select c-tax" :disabled="locked" :aria-label="`Line ${i + 1} tax`">
              <option v-for="t in taxOptions" :key="t.label" :value="t.rate">{{ t.label }}</option>
            </select>
            <span class="num c-amt">{{ money(lineAmount(l)) }}</span>
            <button v-if="!locked" type="button" class="ui-btn ui-btn--ghost ui-btn--icon ui-btn--sm c-del" :disabled="form.lines.length <= 1" aria-label="Remove line" @click="form.lines.splice(i, 1)">
              <i class="fa-solid fa-xmark"></i>
            </button>
            <span v-else></span>
          </div>
        </div>
        <button v-if="!locked" type="button" class="ui-btn ui-btn--sm add-line" @click="addLine"><i class="fa-solid fa-plus"></i> Add line</button>

        <div class="bottom">
          <label class="ui-field notes">
            <span class="ui-label">Notes</span>
            <textarea v-model="form.notes" class="ui-textarea" rows="3" placeholder="Internal notes" maxlength="1000"></textarea>
          </label>
          <div class="totals">
            <div><span>Subtotal</span><span>{{ money(totals.sub) }}</span></div>
            <div><span>Tax</span><span>{{ money(totals.tax) }}</span></div>
            <div class="grand"><span>Total</span><span>{{ money(totals.total) }}</span></div>
            <div v-if="bill && bill.paid_amount > 0" class="paid"><span>Paid</span><span>− {{ money(bill.paid_amount) }}</span></div>
          </div>
        </div>
      </div>

      <div class="ui-modal__foot">
        <button type="button" class="ui-btn" @click="$emit('close')">Cancel</button>
        <template v-if="locked">
          <button type="submit" class="ui-btn ui-btn--primary" :disabled="!!saving">
            <i :class="saving ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-check'"></i> Save changes
          </button>
        </template>
        <template v-else>
          <button v-if="!bill || bill.status === 'draft'" type="button" class="ui-btn" :disabled="!!saving" @click="save('draft')">
            <i :class="saving === 'draft' ? 'fa-solid fa-circle-notch fa-spin' : 'fa-regular fa-floppy-disk'"></i> Save as draft
          </button>
          <button type="submit" class="ui-btn ui-btn--primary" :disabled="!!saving">
            <i :class="saving === 'unpaid' ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-check'"></i> {{ bill && bill.status !== 'draft' ? 'Save bill' : 'Approve bill' }}
          </button>
        </template>
      </div>
    </form>
  </div>
</template>

<script>
import { orgCurrency } from '@/utils/orgDefaults'
import AccountSelect from './AccountSelect.vue'
import { financeApi, PAYMENT_TERMS, termDays, toCents } from '@/services/finance'
import { invoicingApi } from '@/services/invoicing'
import { apiErrorMessage, listFrom } from '@/services/api'
import supplierService from '@/services/supplierService'
import { hasModule } from '@/composables/useEntitlements'
import { formatMoney, isoDate, addDays } from '@/utils/format'
import { toast } from '@/composables/useToast'

let key = 0
const blank = (rate = 10) => ({ key: ++key, description: '', account_id: '', quantity: 1, unit_price: '', tax_rate: rate })

export default {
  name: 'BillModal',
  components: { AccountSelect },
  props: {
    bill: { type: Object, default: null },
    vendorId: { type: String, default: '' },
    vendors: { type: Array, default: () => [] },
    accounts: { type: Array, default: () => [] },
    currency: { type: String, default: () => orgCurrency() }
  },
  emits: ['close', 'saved', 'vendor-created'],
  data() {
    const b = this.bill
    const today = isoDate()
    return {
      form: {
        vendor_id: b?.vendor_id || this.vendorId || '',
        reference: b?.reference || '',
        purchase_order_id: b?.purchase_order_id || '',
        bill_date: b ? isoDate(b.bill_date) : today,
        due_date: b ? isoDate(b.due_date) : addDays(today, 30),
        notes: b?.notes || '',
        lines: b?.line_items?.length
          ? b.line_items.map((l) => ({ key: ++key, description: l.description, account_id: l.account_id || '', quantity: l.quantity, unit_price: l.unit_price, tax_rate: l.tax_rate || 0 }))
          : [blank()]
      },
      extraVendors: [],
      addingVendor: false,
      creatingVendor: false,
      newVendor: { name: '', email: '', payment_terms: 'NET30' },
      taxRates: [],
      pos: [],
      saving: '',
      touched: false,
      error: ''
    }
  },
  computed: {
    poOptions() {
      return this.pos
        .filter((p) => !['cancelled', 'draft'].includes(p.status) || p.id === this.form.purchase_order_id)
        .map((p) => ({ id: p.id, label: `${p.order_number} · ${p.supplier?.name || 'Supplier'} · ${String(p.status || '').replace(/_/g, ' ')} · ${formatMoney(p.total_amount, this.currency)}` }))
    },
    locked() {
      return !!this.bill && this.bill.paid_amount > 0
    },
    terms() {
      return PAYMENT_TERMS
    },
    vendorList() {
      const all = [...this.vendors, ...this.extraVendors.filter((v) => !this.vendors.some((x) => x.id === v.id))]
      return all.sort((a, b) => a.name.localeCompare(b.name))
    },
    taxOptions() {
      const opts = [{ label: 'No tax', rate: 0 }]
      const seen = new Set([0])
      for (const t of this.taxRates) {
        if (!seen.has(Number(t.rate))) {
          opts.push({ label: `${t.name} ${Number(t.rate)}%`, rate: Number(t.rate) })
          seen.add(Number(t.rate))
        }
      }
      if (!seen.has(10)) opts.push({ label: 'GST 10%', rate: 10 })
      for (const l of this.form.lines) {
        const r = Number(l.tax_rate)
        if (!seen.has(r) && !opts.some((o) => o.rate === r)) opts.push({ label: `${r}%`, rate: r })
      }
      return opts
    },
    totals() {
      let sub = 0
      let tax = 0
      for (const l of this.form.lines) {
        const amt = toCents(this.lineAmount(l))
        sub += amt
        tax += Math.round((amt * (Number(l.tax_rate) || 0)) / 100)
      }
      return { sub: sub / 100, tax: tax / 100, total: (sub + tax) / 100 }
    }
  },
  async created() {
    if (!this.bill && this.form.vendor_id) this.onVendor()
    this.loadPOs()
    try {
      this.taxRates = (await invoicingApi.taxRates()) || []
      if (!this.bill) {
        const def = this.taxRates.find((t) => t.is_default)
        if (def) this.form.lines.forEach((l) => (l.tax_rate = Number(def.rate)))
      }
    } catch {
      this.taxRates = []
    }
  },
  methods: {
    async loadPOs() {
      if (!hasModule('inventory')) return
      try {
        const res = await supplierService.getPurchaseOrders({ per_page: 200 })
        this.pos = listFrom(res, 'purchase_orders', 'data')
      } catch {
        this.pos = []
      }
    },
    money(v) {
      return formatMoney(v, this.currency)
    },
    lineAmount(l) {
      const qty = parseFloat(l.quantity) || 0
      const price = Math.round((parseFloat(l.unit_price) || 0) * 100) / 100
      return Math.round(qty * price * 100) / 100
    },
    addLine() {
      const last = this.form.lines[this.form.lines.length - 1]
      this.form.lines.push(blank(last ? last.tax_rate : 10))
    },
    onVendor() {
      const v = this.vendorList.find((x) => x.id === this.form.vendor_id)
      if (!v || this.bill) return
      this.form.due_date = addDays(this.form.bill_date, termDays(v.payment_terms))
    },
    startVendor() {
      this.addingVendor = true
      this.newVendor = { name: '', email: '', payment_terms: 'NET30' }
      this.$nextTick(() => this.$refs.vname?.focus())
    },
    async createVendor() {
      if (!this.newVendor.name.trim()) {
        toast.error('Enter the vendor name')
        return
      }
      this.creatingVendor = true
      try {
        const v = await financeApi.createVendor({ ...this.newVendor, name: this.newVendor.name.trim() })
        this.extraVendors.push(v)
        this.form.vendor_id = v.id
        this.addingVendor = false
        this.error = ''
        this.onVendor()
        this.$emit('vendor-created', v)
        toast.success(`${v.name} added`)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not add the vendor'))
      } finally {
        this.creatingVendor = false
      }
    },
    validate() {
      if (!this.form.vendor_id) return 'Choose a vendor.'
      if (this.form.due_date && this.form.due_date < this.form.bill_date) return 'The due date can’t be before the bill date.'
      if (this.locked) return ''
      const lines = this.form.lines.filter((l) => l.description.trim() || parseFloat(l.unit_price))
      if (!lines.length) return 'Add at least one line item.'
      for (const [i, l] of lines.entries()) {
        if (!l.description.trim()) return `Add a description on line ${i + 1}.`
        if ((parseFloat(l.quantity) || 0) < 0 || (parseFloat(l.unit_price) || 0) < 0) return 'Quantities and prices can’t be negative.'
      }
      if (this.totals.total <= 0) return 'The bill total must be more than zero.'
      return ''
    },
    async save(status) {
      this.touched = true
      this.error = this.validate()
      if (this.error) return
      this.saving = status
      const payload = {
        vendor_id: this.form.vendor_id,
        reference: this.form.reference.trim(),
        bill_date: this.form.bill_date,
        due_date: this.form.due_date,
        notes: this.form.notes,
        purchase_order_id: this.form.purchase_order_id || '',
        status: this.bill && this.bill.status !== 'draft' && status === 'unpaid' ? 'unpaid' : status,
        line_items: this.form.lines
          .filter((l) => l.description.trim() || parseFloat(l.unit_price))
          .map((l) => ({
            description: l.description.trim(),
            account_id: l.account_id,
            quantity: parseFloat(l.quantity) || 1,
            unit_price: Math.round((parseFloat(l.unit_price) || 0) * 100) / 100,
            tax_rate: Number(l.tax_rate) || 0
          }))
      }
      try {
        const saved = this.bill ? await financeApi.updateBill(this.bill.id, payload) : await financeApi.createBill(payload)
        toast.success(this.bill ? 'Bill updated' : status === 'draft' ? 'Draft bill saved' : `Bill ${saved.bill_number} approved`)
        this.$emit('saved', saved)
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not save the bill')
      } finally {
        this.saving = ''
      }
    }
  }
}
</script>

<style scoped>
.top {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr) 160px 160px;
  gap: 12px;
  margin-bottom: 18px;
}
.vendor-row {
  display: flex;
  gap: 8px;
}
.vendor-new {
  display: grid;
  gap: 8px;
  padding: 10px;
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius);
  background: var(--bg-subtle);
}
.vendor-new__actions {
  display: flex;
  gap: 6px;
}
.lines {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}
.line {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1.5fr) 70px 110px 120px 110px 34px;
  gap: 8px;
  align-items: center;
  padding: 8px 10px;
  border-bottom: 1px solid var(--border);
}
.line:last-child {
  border-bottom: 0;
}
.line--head {
  background: var(--bg-subtle);
  font-size: 12px;
  font-weight: 600;
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
input.num {
  text-align: right;
}
.c-amt {
  font-weight: 600;
}
.add-line {
  margin-top: 10px;
}
.bottom {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 24px;
  margin-top: 18px;
  align-items: start;
}
.totals {
  display: grid;
  gap: 6px;
  font-size: 14px;
}
.totals div {
  display: flex;
  justify-content: space-between;
  font-variant-numeric: tabular-nums;
}
.totals span:first-child {
  color: var(--text-3);
}
.totals .grand {
  border-top: 1px solid var(--border);
  padding-top: 8px;
  font-size: 17px;
  font-weight: 700;
}
.totals .grand span:first-child {
  color: var(--text);
}
.totals .paid span:last-child {
  color: var(--success);
}
.ui-modal__foot {
  flex-wrap: wrap;
}
@media (max-width: 900px) {
  .top {
    grid-template-columns: 1fr 1fr;
  }
  .vendor-field {
    grid-column: 1 / -1;
  }
  .line--head {
    display: none;
  }
  .line {
    grid-template-columns: repeat(6, minmax(0, 1fr));
    padding: 10px;
  }
  .c-desc {
    grid-column: 1 / 6;
  }
  .c-del {
    grid-column: 6;
    grid-row: 1;
    justify-self: end;
  }
  .c-acct {
    grid-column: 1 / -1;
  }
  .c-qty {
    grid-column: 1 / 2;
  }
  .c-price {
    grid-column: 2 / 4;
  }
  .c-tax {
    grid-column: 4 / 6;
  }
  .c-amt {
    grid-column: 6;
  }
  .bottom {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 520px) {
  .top {
    grid-template-columns: 1fr;
  }
  .hide-xs {
    display: none;
  }
  .c-qty {
    grid-column: 1 / 3;
  }
  .c-price {
    grid-column: 3 / 7;
  }
  .c-tax {
    grid-column: 1 / 4;
  }
  .c-amt {
    grid-column: 4 / 7;
  }
}

.opt {
  font-weight: 400;
  color: var(--text-3);
  font-size: 11.5px;
}
</style>
