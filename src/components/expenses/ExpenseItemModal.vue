<template>
  <div class="ui-modal-backdrop" @mousedown.self="$emit('close')">
    <form class="ui-modal" style="max-width: 860px" role="dialog" aria-modal="true" aria-labelledby="exp-item-title" data-testid="expense-modal" @submit.prevent="saveAndApprove">
      <div class="ui-modal__head">
        <div>
          <div class="ui-eyebrow">{{ isNew ? 'New expense' : sourceLabel }}</div>
          <h2 id="exp-item-title">{{ isNew ? 'Add an expense' : item?.vendor_name || 'Review expense' }}</h2>
        </div>
        <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="$emit('close')"><i class="fa-solid fa-xmark"></i></button>
      </div>

      <div class="ui-modal__body">
        <div v-if="loading" class="ui-skeleton" style="height: 320px"></div>
        <template v-else>
          <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>
          <div v-if="item && item.status === 'approved'" class="ui-alert ui-alert--success">
            <i class="fa-solid fa-circle-check"></i>
            <span>
              Approved{{ item.bill_number ? ' as bill ' + item.bill_number : '' }}{{ item.bill_linked ? ' (linked to the bill you already entered)' : '' }} — counted in your profit &amp; loss.
              <router-link v-if="item.bill_id" :to="'/bills?bill=' + item.bill_id">Open bill</router-link>. To change amounts, undo the approval.
            </span>
          </div>
          <div v-else-if="item && item.status === 'duplicate'" class="ui-alert ui-alert--warning">
            <i class="fa-solid fa-clone"></i>
            <span>
              {{ item.notes || 'Duplicate of another expense.' }}
              <a v-if="dupOf" href="#" @click.prevent="$emit('open', dupOf.id)">Open the original ({{ dupOf.vendor_name }} {{ dupOf.invoice_number }})</a>
            </span>
          </div>
          <div v-else-if="item && item.status === 'ignored'" class="ui-alert">
            <i class="fa-solid fa-eye-slash"></i><span>Ignored{{ item.notes ? ': ' + item.notes : '' }}</span>
          </div>
          <div v-for="w in warnings" :key="w" class="ui-alert ui-alert--warning warn">
            <i :class="w.startsWith('AI') ? 'fa-solid fa-wand-magic-sparkles' : 'fa-solid fa-triangle-exclamation'"></i><span>{{ w }}</span>
          </div>

          <div class="grid">
            <label class="ui-field">
              <span class="ui-label">Vendor</span>
              <select v-model="form.vendor_id" class="ui-select" :disabled="locked" aria-label="Vendor" @change="onVendor">
                <option value="">Other vendor…</option>
                <option v-for="v in vendors" :key="v.id" :value="v.id">{{ v.name }}</option>
              </select>
            </label>
            <label v-if="!form.vendor_id" class="ui-field">
              <span class="ui-label">Vendor name</span>
              <input v-model.trim="form.vendor_name" class="ui-input" :class="{ 'is-invalid': touched && !form.vendor_name }" :disabled="locked" placeholder="e.g. Canva" />
            </label>
            <label class="ui-field">
              <span class="ui-label">Category</span>
              <select v-model="form.category" class="ui-select" :disabled="locked">
                <option v-for="c in categories" :key="c.key" :value="c.key">{{ c.label }}</option>
              </select>
            </label>
            <label class="ui-field">
              <span class="ui-label">Invoice number</span>
              <input v-model.trim="form.invoice_number" class="ui-input" :disabled="locked" placeholder="Supplier's invoice number" />
            </label>
            <label class="ui-field">
              <span class="ui-label">Invoice date</span>
              <input v-model="form.invoice_date" type="date" class="ui-input" :class="{ 'is-invalid': touched && !form.invoice_date }" :disabled="locked" />
            </label>
            <label class="ui-field span2">
              <span class="ui-label">What was it for</span>
              <input v-model.trim="form.service" class="ui-input" :disabled="locked" placeholder="e.g. Google Workspace Business Starter, example.com.au renewal" />
            </label>
            <label class="ui-field">
              <span class="ui-label">Currency</span>
              <select v-model="form.currency" class="ui-select" :disabled="locked">
                <optgroup v-for="g in currencyGroups" :key="g.region" :label="g.region">
                  <option v-for="c in g.items" :key="c.code" :value="c.code">{{ c.code }} — {{ c.name }}</option>
                </optgroup>
              </select>
            </label>
            <label class="ui-field">
              <span class="ui-label">Total (incl. tax)</span>
              <input v-model="form.total" type="number" step="0.01" min="0" class="ui-input num" :class="{ 'is-invalid': touched && !(Number(form.total) > 0) }" :disabled="locked" data-testid="exp-total" />
            </label>
            <label class="ui-field">
              <span class="ui-label">Tax included ({{ taxLabel }})</span>
              <input v-model="form.tax" type="number" step="0.01" min="0" class="ui-input num" :disabled="locked" data-testid="exp-tax" />
              <span v-if="item?.tax_note" class="ui-hint">{{ item.tax_note }}</span>
              <button v-if="!locked && form.currency === 'AUD' && Number(form.total) > 0" type="button" class="linkish" @click="gst11">Set GST to 1/11 of total</button>
            </label>
            <label class="ui-field">
              <span class="ui-label">Exchange rate</span>
              <input v-if="form.currency !== home" v-model="form.fx_rate" type="number" step="0.000001" min="0" class="ui-input num" :disabled="locked" :placeholder="'auto'" />
              <input v-else class="ui-input" value="Same currency" disabled />
              <span v-if="form.currency !== home" class="ui-hint" data-testid="item-fx-note">{{ item?.fx_note || `${home} per 1 ${form.currency}${item?.fx_source ? ' · ' + fxSource(item.fx_source) : ''}` }}</span>
            </label>
            <div class="ui-field paid">
              <label class="ui-switch"><input v-model="form.paid" type="checkbox" :disabled="locked" /> <span>Paid</span></label>
              <input v-if="form.paid" v-model="form.paid_date" type="date" class="ui-input" :disabled="locked" aria-label="Paid on" />
            </div>
          </div>

          <div class="totals" data-testid="exp-home">
            <div>
              <span class="muted">Excl. tax</span><strong>{{ money(net, form.currency) }}</strong>
            </div>
            <div v-if="form.currency !== home">
              <span class="muted">In {{ home }}</span><strong>{{ money(homeTotal, home) }}</strong>
              <small class="muted">{{ money(homeNet, home) }} excl. tax</small>
            </div>
            <div>
              <span class="muted">Confidence</span>
              <span class="ui-badge" :class="confTone">{{ Math.round((item?.confidence ?? 1) * 100) }}%</span>
              <small class="muted">{{ methodLabel }}</small>
            </div>
          </div>

          <!-- client attribution -->
          <div class="section">
            <div class="section__head">
              <h3><i class="fa-solid fa-user-tag"></i> Charge to clients</h3>
              <span class="muted">Attribute this cost to the client(s) it is for, to see margin per client.</span>
            </div>
            <div v-for="(a, i) in allocs" :key="i" class="alloc">
              <select v-model="a.customer_id" class="ui-select" aria-label="Client">
                <option value="">Choose a client…</option>
                <option v-for="c in customers" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
              <div class="ui-input-group pctin">
                <input v-model="a.percent" type="number" min="1" max="100" step="1" class="ui-input num" aria-label="Percent" />
                <span class="muted">%</span>
              </div>
              <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Remove client" @click="allocs.splice(i, 1)"><i class="fa-regular fa-trash-can"></i></button>
            </div>
            <div class="alloc-actions">
              <button type="button" class="ui-btn ui-btn--sm" :disabled="!customers.length" @click="allocs.push({ customer_id: '', percent: allocs.length ? 0 : 100 })">
                <i class="fa-solid fa-plus"></i> Add client
              </button>
              <span v-if="!customers.length" class="muted">No customers yet.</span>
              <span v-else-if="allocTotal > 0" class="muted">{{ allocTotal }}% attributed</span>
              <button v-if="item && allocsChanged" type="button" class="ui-btn ui-btn--sm ui-btn--primary" :disabled="busy" @click="saveAllocs">Save split</button>
            </div>
          </div>

          <label class="ui-field">
            <span class="ui-label">Notes</span>
            <textarea v-model="form.notes" class="ui-textarea" rows="2"></textarea>
          </label>

          <div v-if="item" class="source">
            <div>
              <i class="fa-solid fa-inbox"></i> {{ sourceLabel }}<template v-if="item.subject"> · {{ item.subject }}</template>
              <template v-if="item.sender"> · {{ item.sender }}</template>
            </div>
            <button v-if="item.document_id" type="button" class="ui-btn ui-btn--sm" :disabled="opening" @click="openDoc">
              <i class="fa-regular fa-file-pdf"></i> {{ item.document_name || 'Source document' }}
            </button>
            <details v-if="item.snippet" class="snippet">
              <summary>Text it was read from</summary>
              <pre>{{ item.snippet }}</pre>
            </details>
            <div v-if="dups.length" class="muted">Also received as: {{ dups.map((d) => sourceName(d.source) + (d.subject ? ' (' + d.subject + ')' : '')).join(', ') }}</div>
          </div>
        </template>
      </div>

      <div class="ui-modal__foot">
        <template v-if="item && item.status === 'approved'">
          <button type="button" class="ui-btn ui-btn--danger" :disabled="busy" @click="unapprove"><i class="fa-solid fa-rotate-left"></i> Undo approval</button>
          <span class="spacer"></span>
          <button type="button" class="ui-btn" @click="$emit('close')">Close</button>
          <button type="button" class="ui-btn ui-btn--primary" :disabled="busy" @click="saveMeta">Save</button>
        </template>
        <template v-else>
          <button v-if="item && item.status !== 'ignored'" type="button" class="ui-btn ui-btn--ghost" :disabled="busy" @click="ignore"><i class="fa-solid fa-eye-slash"></i> Ignore</button>
          <button v-if="item && item.status !== 'pending'" type="button" class="ui-btn ui-btn--ghost" :disabled="busy" @click="restore"><i class="fa-solid fa-inbox"></i> Back to inbox</button>
          <button v-if="item" type="button" class="ui-btn ui-btn--ghost danger" :disabled="busy" @click="remove"><i class="fa-regular fa-trash-can"></i> Delete</button>
          <span class="spacer"></span>
          <button type="button" class="ui-btn" :disabled="busy" @click="save(false)">{{ isNew ? 'Add to inbox' : 'Save' }}</button>
          <button v-if="!item || item.status === 'pending'" type="submit" class="ui-btn ui-btn--primary" :disabled="busy" data-testid="exp-approve">
            <i :class="busy ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-check'"></i> {{ isNew ? 'Add & approve' : 'Approve' }}
          </button>
        </template>
      </div>
    </form>
  </div>
</template>

<script>
import { expensesApi, CATEGORIES, SOURCE_LABEL, money } from '@/services/expenses'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'
import { currencyGroups } from '@/utils/currencies'
import { orgCurrency } from '@/utils/orgDefaults'

const r2 = (v) => Math.round((Number(v) || 0) * 100) / 100

export default {
  name: 'ExpenseItemModal',
  props: {
    id: { type: String, default: '' },
    vendors: { type: Array, default: () => [] },
    customers: { type: Array, default: () => [] },
    home: { type: String, default: () => orgCurrency() }
  },
  emits: ['close', 'changed', 'open'],
  data() {
    return {
      item: null,
      dupOf: null,
      dups: [],
      loading: !!this.id,
      busy: false,
      opening: false,
      error: '',
      touched: false,
      categories: CATEGORIES,
      currencyGroups: currencyGroups(),
      form: { vendor_id: '', vendor_name: '', category: 'other', invoice_number: '', invoice_date: new Date().toISOString().slice(0, 10), service: '', currency: this.home, total: '', tax: '', fx_rate: '', paid: true, paid_date: '', notes: '' },
      allocs: [],
      allocsOrig: '[]'
    }
  },
  computed: {
    isNew() {
      return !this.id
    },
    locked() {
      return !!this.item && this.item.status === 'approved'
    },
    warnings() {
      return (this.item?.warnings || []).filter(Boolean)
    },
    sourceLabel() {
      return this.item ? this.sourceName(this.item.source) : ''
    },
    taxLabel() {
      return this.form.currency === 'AUD' || this.form.currency === 'NZD' ? 'GST' : 'GST/VAT'
    },
    net() {
      return r2(this.form.total) - r2(this.form.tax)
    },
    rate() {
      if (this.form.currency === this.home) return 1
      return Number(this.form.fx_rate) || Number(this.item?.fx_rate) || 0
    },
    homeTotal() {
      return r2(r2(this.form.total) * this.rate)
    },
    homeNet() {
      return r2(this.homeTotal - r2(r2(this.form.tax) * this.rate))
    },
    confTone() {
      const c = this.item?.confidence ?? 1
      return c >= 0.8 ? 'ui-badge--success' : c >= 0.5 ? 'ui-badge--warning' : 'ui-badge--danger'
    },
    methodLabel() {
      const m = this.item?.method
      return { api: 'from the API', rules: 'read from the email / PDF', pdf: 'read from the PDF', csv: 'from a CSV', ai: 'AI-extracted', manual: 'entered by hand' }[m] || ''
    },
    allocTotal() {
      return this.allocs.reduce((s, a) => s + (Number(a.percent) || 0), 0)
    },
    allocsChanged() {
      return JSON.stringify(this.allocs.map((a) => ({ customer_id: a.customer_id, percent: Number(a.percent) }))) !== this.allocsOrig
    }
  },
  async mounted() {
    if (this.id) await this.load()
  },
  methods: {
    money,
    sourceName(s) {
      return SOURCE_LABEL[s] || s
    },
    fxSource(s) {
      return { same: 'same currency', manual: 'your rate', live: 'market rate', fallback: 'reference rate — check it', missing: 'no rate' }[s] || s
    },
    async load() {
      this.loading = true
      try {
        const d = await expensesApi.item(this.id)
        this.fill(d.item)
        this.dupOf = d.duplicate_of || null
        this.dups = d.duplicates || []
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load the expense')
      } finally {
        this.loading = false
      }
    },
    fill(it) {
      this.item = it
      const day = (v) => (v ? String(v).slice(0, 10) : '')
      this.form = {
        vendor_id: it.vendor_id || '',
        vendor_name: it.vendor_name || '',
        category: it.category || 'other',
        invoice_number: it.invoice_number || '',
        invoice_date: day(it.invoice_date),
        service: it.service || '',
        currency: it.currency || this.home,
        total: it.total || '',
        tax: it.tax || 0,
        fx_rate: it.fx_source === 'manual' ? it.fx_rate : '',
        paid: !!it.paid,
        paid_date: day(it.paid_date),
        notes: it.notes || ''
      }
      if (it.allocations?.length) this.allocs = it.allocations.map((a) => ({ customer_id: a.customer_id, percent: a.percent }))
      else if (it.customer_id) this.allocs = [{ customer_id: it.customer_id, percent: 100 }]
      else this.allocs = []
      this.allocsOrig = JSON.stringify(this.allocs.map((a) => ({ customer_id: a.customer_id, percent: Number(a.percent) })))
    },
    onVendor() {
      const v = this.vendors.find((x) => x.id === this.form.vendor_id)
      if (v) {
        this.form.vendor_name = v.name
        if (!this.item || this.form.category === 'other') this.form.category = v.category
        if (v.key === 'synergy' && this.isNew) this.form.currency = 'AUD'
      }
    },
    gst11() {
      this.form.tax = r2(Number(this.form.total) / 11)
    },
    payload() {
      const p = {
        vendor_id: this.form.vendor_id,
        invoice_number: this.form.invoice_number,
        invoice_date: this.form.invoice_date,
        service: this.form.service,
        category: this.form.category,
        currency: this.form.currency,
        total: r2(this.form.total),
        tax: r2(this.form.tax),
        paid: this.form.paid,
        paid_date: this.form.paid ? this.form.paid_date : '',
        notes: this.form.notes
      }
      if (!this.form.vendor_id) p.vendor_name = this.form.vendor_name
      if (this.form.currency !== this.home && Number(this.form.fx_rate) > 0) p.fx_rate = Number(this.form.fx_rate)
      return p
    },
    validate() {
      this.touched = true
      if (!this.form.vendor_id && !this.form.vendor_name) return 'Choose or enter the vendor'
      if (!(Number(this.form.total) > 0)) return 'Enter the total amount'
      if (!this.form.invoice_date) return 'Enter the invoice date'
      if (r2(this.form.tax) >= r2(this.form.total)) return 'Tax must be less than the total'
      if (this.allocTotal > 100) return 'The client split adds up to more than 100%'
      if (this.allocs.some((a) => !a.customer_id)) return 'Choose a client for each split line (or remove it)'
      return ''
    },
    async persist() {
      let it
      if (this.isNew && !this.item) {
        it = await expensesApi.create(this.payload())
      } else {
        it = await expensesApi.update(this.item.id, this.payload())
      }
      if (this.allocsChanged || (this.isNew && this.allocs.length)) {
        it = await expensesApi.allocations(it.id, this.allocs.map((a) => ({ customer_id: a.customer_id, percent: Number(a.percent) })))
      }
      this.fill(it)
      return it
    },
    async save(close = true) {
      this.error = this.validate()
      if (this.error) return
      this.busy = true
      try {
        const it = await this.persist()
        toast.success(it.status === 'duplicate' ? 'Saved — marked as a duplicate of an existing expense' : 'Expense saved')
        this.$emit('changed')
        if (close !== false || this.isNew) this.$emit('close')
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not save')
      } finally {
        this.busy = false
      }
    },
    async saveAndApprove() {
      this.error = this.validate()
      if (this.error) return
      this.busy = true
      try {
        const it = await this.persist()
        if (it.status === 'duplicate') {
          this.error = 'This is the same invoice as an expense already in your inbox — approve that one instead.'
          return
        }
        await expensesApi.approve(it.id)
        toast.success('Approved — added to Bills and your profit & loss')
        this.$emit('changed')
        this.$emit('close')
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not approve')
      } finally {
        this.busy = false
      }
    },
    async saveMeta() {
      this.busy = true
      try {
        let it = await expensesApi.update(this.item.id, { notes: this.form.notes })
        if (this.allocsChanged) it = await expensesApi.allocations(this.item.id, this.allocs.map((a) => ({ customer_id: a.customer_id, percent: Number(a.percent) })))
        this.fill(it)
        toast.success('Saved')
        this.$emit('changed')
        this.$emit('close')
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not save')
      } finally {
        this.busy = false
      }
    },
    async saveAllocs() {
      if (this.allocTotal > 100) {
        this.error = 'The client split adds up to more than 100%'
        return
      }
      this.busy = true
      try {
        const it = await expensesApi.allocations(this.item.id, this.allocs.filter((a) => a.customer_id).map((a) => ({ customer_id: a.customer_id, percent: Number(a.percent) })))
        this.fill(it)
        toast.success('Client split saved')
        this.$emit('changed')
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not save the split')
      } finally {
        this.busy = false
      }
    },
    async unapprove() {
      const ok = await confirmDialog({ title: 'Undo approval?', message: `The bill${this.item.bill_number ? ' ' + this.item.bill_number : ''} and its payment are removed and the expense goes back to the inbox.`, confirmText: 'Undo approval', danger: true })
      if (!ok) return
      this.busy = true
      try {
        this.fill(await expensesApi.unapprove(this.item.id))
        toast.success('Approval undone')
        this.$emit('changed')
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not undo')
      } finally {
        this.busy = false
      }
    },
    async ignore() {
      this.busy = true
      try {
        await expensesApi.ignore(this.item.id, 'Ignored by you')
        toast.info('Ignored — it will not be counted')
        this.$emit('changed')
        this.$emit('close')
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not ignore')
      } finally {
        this.busy = false
      }
    },
    async restore() {
      this.busy = true
      try {
        this.fill(await expensesApi.restore(this.item.id))
        toast.success('Back in the inbox')
        this.$emit('changed')
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not restore')
      } finally {
        this.busy = false
      }
    },
    async remove() {
      const ok = await confirmDialog({ title: 'Delete this expense?', message: 'It is removed from Expenses. A later sync can bring an email back only if you delete it.', confirmText: 'Delete', danger: true })
      if (!ok) return
      this.busy = true
      try {
        await expensesApi.remove(this.item.id)
        toast.success('Deleted')
        this.$emit('changed')
        this.$emit('close')
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not delete')
      } finally {
        this.busy = false
      }
    },
    async openDoc() {
      this.opening = true
      const w = window.open('', '_blank')
      try {
        const blob = await expensesApi.document(this.item.document_id)
        const url = URL.createObjectURL(blob)
        if (w) w.location.href = url
        else window.location.href = url
        setTimeout(() => URL.revokeObjectURL(url), 60000)
      } catch (e) {
        if (w) w.close()
        toast.error(apiErrorMessage(e, 'Could not open the document'))
      } finally {
        this.opening = false
      }
    }
  }
}
</script>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px 14px;
}
.span2 {
  grid-column: span 2;
}
.num {
  font-variant-numeric: tabular-nums;
  text-align: right;
}
.paid {
  display: flex;
  flex-direction: column;
  gap: 6px;
  justify-content: flex-end;
}
.warn {
  margin-bottom: 8px;
}
.linkish {
  background: none;
  border: 0;
  padding: 0;
  color: var(--accent);
  font-size: 12px;
  cursor: pointer;
  text-align: left;
}
.totals {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 28px;
  margin: 16px 0;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-subtle);
}
.totals > div {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
}
.totals strong {
  font-variant-numeric: tabular-nums;
  font-size: 16px;
}
.muted {
  color: var(--text-3);
  font-size: 12.5px;
}
.section {
  border-top: 1px solid var(--border);
  padding-top: 12px;
  margin-bottom: 12px;
}
.section__head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 10px;
  margin-bottom: 8px;
}
.section__head h3 {
  font-size: 14px;
  margin: 0;
}
.alloc {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 110px auto;
  gap: 8px;
  margin-bottom: 6px;
}
.pctin {
  display: flex;
  align-items: center;
  gap: 6px;
}
.alloc-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.source {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
  color: var(--text-2);
  border-top: 1px solid var(--border);
  padding-top: 12px;
  word-break: break-word;
}
.source .ui-btn {
  align-self: flex-start;
}
.snippet pre {
  white-space: pre-wrap;
  font-size: 12px;
  max-height: 220px;
  overflow: auto;
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 8px;
  color: var(--text-2);
}
.spacer {
  flex: 1;
}
.danger {
  color: var(--danger);
}
@media (max-width: 720px) {
  .grid {
    grid-template-columns: 1fr 1fr;
  }
}
@media (max-width: 480px) {
  .grid {
    grid-template-columns: 1fr;
  }
  .span2 {
    grid-column: auto;
  }
  .ui-modal__foot {
    flex-wrap: wrap;
  }
}
</style>
