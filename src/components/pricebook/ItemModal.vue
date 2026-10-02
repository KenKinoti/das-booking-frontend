<template>
  <div class="ui-modal-backdrop" @mousedown.self="$emit('close')">
    <form class="ui-modal" style="max-width: 720px" role="dialog" aria-modal="true" aria-labelledby="pbi-title" data-testid="item-modal" @submit.prevent="save">
      <div class="ui-modal__head">
        <div>
          <div class="ui-eyebrow">{{ item ? supplierName : 'Price list' }}</div>
          <h2 id="pbi-title">{{ item ? 'Edit price' : 'Add a price' }}</h2>
        </div>
        <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="$emit('close')"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="ui-modal__body">
        <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>
        <div class="grid">
          <label class="ui-field">
            <span class="ui-label">Supplier</span>
            <select v-model="form.supplier_id" class="ui-select" required data-testid="item-supplier" @change="onSupplier">
              <option value="" disabled>Choose…</option>
              <option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.name }} ({{ s.currency }})</option>
            </select>
          </label>
          <label class="ui-field">
            <span class="ui-label">Price for</span>
            <select v-model="form.kind" class="ui-select" data-testid="item-kind" @change="onKind">
              <option v-for="k in KINDS" :key="k.key" :value="k.key">{{ k.label }}</option>
            </select>
          </label>
          <label v-if="domain" class="ui-field">
            <span class="ui-label">Domain ending</span>
            <input v-model.trim="form.tld" class="ui-input" placeholder=".co.ke" required data-testid="item-tld" />
          </label>
          <label v-else class="ui-field">
            <span class="ui-label">Name</span>
            <input v-model.trim="form.name" class="ui-input" :placeholder="form.kind === 'hosting_plan' ? 'e.g. Starter' : 'e.g. Standard SSL'" required data-testid="item-name" />
          </label>
          <label class="ui-field">
            <span class="ui-label">Charged</span>
            <select v-model="form.period" class="ui-select" data-testid="item-period">
              <option v-for="p in periods" :key="p.key" :value="p.key">{{ p.label }}</option>
            </select>
          </label>
          <label class="ui-field">
            <span class="ui-label">Price per period</span>
            <input v-model="form.price" class="ui-input" type="number" min="0" step="any" required data-testid="item-price" />
            <span class="ui-hint">The first period's price when there is an introductory offer.</span>
          </label>
          <label class="ui-field">
            <span class="ui-label">Currency</span>
            <select v-model="form.currency" class="ui-select" data-testid="item-currency">
              <optgroup v-for="g in groups" :key="g.region" :label="g.region">
                <option v-for="c in g.items" :key="c.code" :value="c.code">{{ c.code }}</option>
              </optgroup>
            </select>
          </label>
          <label class="ui-field">
            <span class="ui-label">Renews at (regular price)</span>
            <input v-model="form.regular_price" class="ui-input" type="number" min="0" step="any" placeholder="same as the price" data-testid="item-regular" />
            <span class="ui-hint">Only for introductory offers.</span>
          </label>
          <label class="ui-field">
            <span class="ui-label">Setup fee (once)</span>
            <input v-model="form.setup_fee" class="ui-input" type="number" min="0" step="any" placeholder="0" />
          </label>
          <template v-if="form.kind === 'hosting_plan'">
            <label class="ui-field">
              <span class="ui-label">Disk (GB)</span>
              <input v-model="form.disk_gb" class="ui-input" type="number" min="-1" step="any" placeholder="unknown" data-testid="item-disk" />
              <span class="ui-hint">-1 = unlimited. Needed to match a hosting need.</span>
            </label>
            <label class="ui-field">
              <span class="ui-label">Sites allowed</span>
              <input v-model="form.sites" class="ui-input" type="number" min="-1" step="1" placeholder="1" />
              <span class="ui-hint">More than 1 for reseller / multi-site plans; -1 = unlimited.</span>
            </label>
            <label class="ui-field">
              <span class="ui-label">Mailboxes included</span>
              <input v-model="form.email_accounts" class="ui-input" type="number" min="-1" step="1" placeholder="unknown" />
            </label>
            <label class="ui-field">
              <span class="ui-label">Bandwidth</span>
              <input v-model.trim="form.bandwidth" class="ui-input" maxlength="60" placeholder="e.g. unmetered, 100 GB" />
            </label>
          </template>
          <label class="ui-field">
            <span class="ui-label">Price as of</span>
            <input v-model="form.as_of" class="ui-input" type="date" :max="today" data-testid="item-asof" />
          </label>
          <label class="ui-field">
            <span class="ui-label">Source link</span>
            <input v-model.trim="form.source_url" class="ui-input" placeholder="https://…" />
          </label>
          <label class="ui-field span2">
            <span class="ui-label">Notes</span>
            <input v-model.trim="form.notes" class="ui-input" placeholder="GST included, minimum term…" />
          </label>
          <label class="ui-switch span2"><input v-model="form.active" type="checkbox" /> <span>Use in comparisons</span></label>
        </div>
      </div>
      <div class="ui-modal__foot">
        <button type="button" class="ui-btn" @click="$emit('close')">Cancel</button>
        <button type="submit" class="ui-btn ui-btn--primary" :disabled="busy" data-testid="item-save">{{ item ? 'Save' : 'Add price' }}</button>
      </div>
    </form>
  </div>
</template>

<script>
import { pricebookApi, KINDS, PERIODS, isDomainKind } from '@/services/pricebook'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { currencyGroups } from '@/utils/currencies'

const numOrNull = (v) => (v === '' || v === null || v === undefined ? null : Number(v))

export default {
  name: 'PricebookItemModal',
  props: {
    item: { type: Object, default: null },
    suppliers: { type: Array, default: () => [] },
    supplierId: { type: String, default: '' },
    today: { type: String, default: '' }
  },
  emits: ['close', 'saved'],
  data() {
    const it = this.item
    const sup = this.suppliers.find((s) => s.id === (it?.supplier_id || this.supplierId)) || (this.suppliers.length === 1 ? this.suppliers[0] : null)
    return {
      KINDS,
      groups: currencyGroups(),
      busy: false,
      error: '',
      form: {
        supplier_id: sup?.id || '',
        kind: it?.kind || 'hosting_plan',
        name: it?.name || '',
        tld: it?.tld || '',
        period: it?.period || 'month',
        price: it?.price ?? '',
        currency: it?.currency || sup?.currency || 'AUD',
        regular_price: it?.regular_price ?? '',
        setup_fee: it?.setup_fee || '',
        disk_gb: it?.disk_gb ?? '',
        sites: it?.sites ?? '',
        email_accounts: it?.email_accounts ?? '',
        bandwidth: it?.bandwidth || '',
        as_of: it?.as_of ? String(it.as_of).slice(0, 10) : this.today,
        source_url: it?.source_url || '',
        notes: it?.notes || '',
        active: it ? !!it.active : true
      }
    }
  },
  computed: {
    domain() {
      return isDomainKind(this.form.kind)
    },
    periods() {
      return this.domain ? PERIODS.filter((p) => p.months >= 12) : PERIODS
    },
    supplierName() {
      return this.suppliers.find((s) => s.id === this.form.supplier_id)?.name || ''
    }
  },
  methods: {
    onSupplier() {
      const s = this.suppliers.find((x) => x.id === this.form.supplier_id)
      if (s && !this.item) this.form.currency = s.currency
    },
    onKind() {
      if (!this.item) this.form.period = this.domain || this.form.kind === 'ssl' ? 'year' : this.form.kind === 'other' ? 'one_off' : 'month'
      else if (this.domain && (this.form.period === 'month' || this.form.period === 'one_off')) this.form.period = 'year'
    },
    async save() {
      const f = this.form
      const price = numOrNull(f.price)
      if (price === null || Number.isNaN(price) || price < 0) {
        this.error = 'Enter a price of zero or more.'
        return
      }
      const body = {
        supplier_id: f.supplier_id,
        kind: f.kind,
        name: this.domain ? '' : f.name,
        tld: this.domain ? f.tld : '',
        period: f.period,
        price,
        currency: f.currency,
        regular_price: numOrNull(f.regular_price),
        setup_fee: numOrNull(f.setup_fee) || 0,
        disk_gb: f.kind === 'hosting_plan' ? numOrNull(f.disk_gb) : null,
        sites: f.kind === 'hosting_plan' ? numOrNull(f.sites) : null,
        email_accounts: f.kind === 'hosting_plan' ? numOrNull(f.email_accounts) : null,
        bandwidth: f.kind === 'hosting_plan' ? f.bandwidth : '',
        source_url: f.source_url,
        notes: f.notes,
        active: f.active
      }
      if (f.as_of) body.as_of = f.as_of
      this.busy = true
      this.error = ''
      try {
        const r = this.item ? await pricebookApi.updateItem(this.item.id, body) : await pricebookApi.createItem(body)
        toast.success(this.item ? 'Price saved' : 'Price added')
        this.$emit('saved', r.item)
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not save the price')
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
@media (max-width: 560px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
