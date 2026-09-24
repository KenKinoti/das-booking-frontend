<template>
  <div class="ui-modal-backdrop" @mousedown.self="close">
    <form class="ui-modal entry-modal" :style="{ maxWidth: quick ? '560px' : '720px' }" role="dialog" aria-modal="true" :aria-label="title" novalidate @submit.prevent="save">
      <div class="ui-modal__head">
        <h2>{{ title }}</h2>
        <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="close"><i class="fa-solid fa-xmark"></i></button>
      </div>

      <div v-if="loading" class="ui-modal__body"><div class="ui-skeleton" style="height: 260px"></div></div>
      <div v-else class="ui-modal__body">
        <div class="seg" role="radiogroup" aria-label="Type">
          <button type="button" role="radio" :aria-checked="form.type === 'income'" class="seg__btn" :class="{ 'is-in': form.type === 'income' }" @click="setType('income')">
            <i class="fa-solid fa-arrow-down"></i> Money in
          </button>
          <button type="button" role="radio" :aria-checked="form.type === 'expense'" class="seg__btn" :class="{ 'is-out': form.type === 'expense' }" @click="setType('expense')">
            <i class="fa-solid fa-arrow-up"></i> Money out
          </button>
        </div>

        <div class="row amount-row">
          <div class="ui-field grow">
            <label for="smb_amount">Amount{{ taxLabelSuffix }}</label>
            <div class="amount-wrap" :class="{ 'has-error': errors.amount }">
              <span class="amount-cur">{{ form.currency }}</span>
              <input
                id="smb_amount"
                ref="amount"
                v-model.trim="form.amount"
                class="ui-input amount-input"
                inputmode="decimal"
                autocomplete="off"
                :placeholder="decimals ? '0.' + '0'.repeat(decimals) : '0'"
                @input="errors.amount = ''"
              />
            </div>
            <div v-if="errors.amount" class="err">{{ errors.amount }}</div>
          </div>
          <div class="ui-field">
            <label for="smb_date">Date</label>
            <input id="smb_date" v-model="form.date" type="date" class="ui-input" :class="{ 'has-error': errors.date }" />
            <div v-if="errors.date" class="err">{{ errors.date }}</div>
          </div>
        </div>

        <div class="row">
          <div class="ui-field grow">
            <label for="smb_cat">Category</label>
            <select id="smb_cat" v-model="form.category_id" class="ui-select" :class="{ 'has-error': errors.category_id }" @change="onCategory">
              <option value="">Uncategorised</option>
              <option v-for="c in typeCategories" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
            <div v-if="errors.category_id" class="err">{{ errors.category_id }}</div>
          </div>
          <div class="ui-field grow">
            <label for="smb_pm">Paid by</label>
            <select id="smb_pm" v-model="form.payment_method" class="ui-select">
              <option value="">—</option>
              <option v-for="m in methods" :key="m" :value="m">{{ m }}</option>
            </select>
          </div>
        </div>

        <div class="ui-field">
          <label for="smb_desc">Description</label>
          <input id="smb_desc" v-model="form.description" class="ui-input" maxlength="500" :placeholder="form.type === 'income' ? 'e.g. Market stall takings' : 'e.g. Fuel for delivery van'" />
          <div v-if="errors.description" class="err">{{ errors.description }}</div>
        </div>

        <div v-if="quick && !showMore" class="tax-line">
          <span v-if="taxMinor > 0">Includes {{ settings.tax_name }} {{ fmtRate(form.tax_rate) }}%: <strong>{{ money(taxMinor) }}</strong></span>
          <span v-else>No {{ settings.tax_name }} included</span>
          <button type="button" class="linkish" @click="showMore = true">More details <i class="fa-solid fa-chevron-down"></i></button>
        </div>

        <template v-if="!quick || showMore">
          <div class="row">
            <div class="ui-field">
              <label for="smb_cur">Currency</label>
              <select id="smb_cur" v-model="form.currency" class="ui-select" :class="{ 'has-error': errors.currency }">
                <optgroup v-for="g in currencyGroups" :key="g.region" :label="g.region">
                  <option v-for="c in g.items" :key="c.code" :value="c.code">{{ c.code }} — {{ c.name }}</option>
                </optgroup>
              </select>
            </div>
            <div class="ui-field">
              <label for="smb_rate">{{ settings.tax_name }} rate %</label>
              <input id="smb_rate" v-model="form.tax_rate" type="number" min="0" max="100" step="0.01" class="ui-input" :class="{ 'has-error': errors.tax_rate }" @input="taxTouched = true" />
              <div v-if="errors.tax_rate" class="err">{{ errors.tax_rate }}</div>
            </div>
            <div class="ui-field">
              <label>{{ settings.tax_name }} included</label>
              <div class="static">{{ money(taxMinor) }}</div>
            </div>
          </div>
          <div class="row">
            <div class="ui-field grow">
              <label for="smb_ref">Reference</label>
              <input id="smb_ref" v-model="form.reference" class="ui-input" maxlength="120" placeholder="Receipt or invoice number" />
            </div>
          </div>

          <div class="ui-field">
            <label>Receipt</label>
            <div v-if="form.attachment_data" class="receipt">
              <img v-if="isImage" :src="form.attachment_data" alt="Receipt preview" class="receipt__img" />
              <span v-else class="receipt__pdf"><i class="fa-regular fa-file-pdf"></i></span>
              <span class="receipt__name">{{ form.attachment_name || 'Uploaded receipt' }}</span>
              <a :href="form.attachment_data" :download="form.attachment_name || 'receipt'" class="ui-btn ui-btn--ghost ui-btn--sm"><i class="fa-solid fa-download"></i></a>
              <button type="button" class="ui-btn ui-btn--ghost ui-btn--sm" @click="removeUpload"><i class="fa-regular fa-trash-can"></i> Remove</button>
            </div>
            <div v-else class="receipt-inputs">
              <label class="ui-btn ui-btn--sm upload-btn" :class="{ 'is-busy': reading }">
                <i class="fa-solid fa-camera"></i> {{ reading ? 'Reading…' : 'Upload photo or PDF' }}
                <input type="file" accept="image/*,application/pdf" @change="onFile" />
              </label>
              <span class="or">or</span>
              <input v-model.trim="form.attachment_url" class="ui-input" :class="{ 'has-error': errors.attachment_url }" placeholder="https://link-to-receipt" />
            </div>
            <div v-if="errors.attachment_url || errors.attachment_data" class="err">{{ errors.attachment_url || errors.attachment_data }}</div>
            <div v-else class="ui-hint">Images are compressed automatically (max 600 KB).</div>
          </div>
        </template>
      </div>

      <div class="ui-modal__foot">
        <button v-if="entryId" type="button" class="ui-btn ui-btn--ghost danger-text" :disabled="saving" @click="remove"><i class="fa-regular fa-trash-can"></i> Delete</button>
        <span class="spacer"></span>
        <button type="button" class="ui-btn" @click="close">Cancel</button>
        <button type="submit" class="ui-btn" :class="form.type === 'income' ? 'ui-btn--success' : 'ui-btn--primary'" :disabled="saving || loading">
          <i v-if="saving" class="fa-solid fa-spinner fa-spin"></i>
          {{ entryId ? 'Save changes' : form.type === 'income' ? 'Record money in' : 'Record money out' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script>
import { smallbizApi, fmtMinor, minorToInput, parseMinor, taxFromInclusive, currencyDecimals, fieldErrors, readAttachment, PAYMENT_METHODS } from '@/services/smallbiz'
import { apiErrorMessage } from '@/services/api'
import { currencyGroups } from '@/utils/currencies'
import { isoDate } from '@/utils/format'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'

export default {
  name: 'EntryModal',
  props: {
    settings: { type: Object, required: true },
    categories: { type: Array, default: () => [] },
    entryId: { type: String, default: null },
    presetType: { type: String, default: 'income' },
    quick: { type: Boolean, default: false }
  },
  emits: ['close', 'saved', 'deleted'],
  data() {
    return {
      form: this.blank(this.presetType),
      errors: {},
      loading: !!this.entryId,
      saving: false,
      reading: false,
      showMore: false,
      taxTouched: false,
      methods: PAYMENT_METHODS,
      currencyGroups: currencyGroups()
    }
  },
  computed: {
    title() {
      if (this.entryId) return 'Edit entry'
      if (this.quick) return this.form.type === 'income' ? 'Quick sale' : 'Quick expense'
      return 'New entry'
    },
    typeCategories() {
      return this.categories.filter((c) => c.type === this.form.type)
    },
    decimals() {
      return currencyDecimals(this.form.currency)
    },
    amountMinor() {
      return parseMinor(this.form.amount, this.form.currency)
    },
    taxMinor() {
      return this.amountMinor > 0 ? taxFromInclusive(this.amountMinor, this.form.tax_rate) : 0
    },
    taxLabelSuffix() {
      return Number(this.form.tax_rate) > 0 ? ` (incl. ${this.settings.tax_name})` : ''
    },
    isImage() {
      return /^data:image\//.test(this.form.attachment_data || '')
    }
  },
  async created() {
    window.addEventListener('keydown', this.onKey)
    if (this.entryId) {
      try {
        const e = await smallbizApi.entry(this.entryId)
        this.form = {
          type: e.type,
          amount: minorToInput(e.amount_minor, e.currency),
          currency: e.currency,
          date: String(e.date).slice(0, 10),
          category_id: e.category_id || '',
          payment_method: e.payment_method || '',
          description: e.description || '',
          reference: e.reference || '',
          tax_rate: e.tax_rate,
          attachment_url: e.attachment_url || '',
          attachment_data: e.attachment_data || '',
          attachment_name: e.attachment_name || ''
        }
        this.taxTouched = true
      } catch (err) {
        toast.error(apiErrorMessage(err, 'Could not load entry'))
        this.$emit('close')
        return
      } finally {
        this.loading = false
      }
    } else {
      const first = this.typeCategories[0]
      if (this.form.type === 'income' && first) this.form.category_id = first.id
      this.applyDefaultRate()
    }
    this.$nextTick(() => this.$refs.amount?.focus())
  },
  beforeUnmount() {
    window.removeEventListener('keydown', this.onKey)
  },
  methods: {
    blank(type) {
      return {
        type: type === 'expense' ? 'expense' : 'income',
        amount: '',
        currency: this.settings.currency,
        date: isoDate(),
        category_id: '',
        payment_method: type === 'expense' ? 'Card' : 'Cash',
        description: '',
        reference: '',
        tax_rate: 0,
        attachment_url: '',
        attachment_data: '',
        attachment_name: ''
      }
    },
    onKey(e) {
      if (e.key === 'Escape') this.close()
    },
    close() {
      if (!this.saving) this.$emit('close')
    },
    money(v) {
      return fmtMinor(v, this.form.currency)
    },
    fmtRate(r) {
      return Number(r).toLocaleString(undefined, { maximumFractionDigits: 2 })
    },
    setType(t) {
      if (this.form.type === t) return
      this.form.type = t
      const cat = this.categories.find((c) => c.id === this.form.category_id)
      if (cat && cat.type !== t) this.form.category_id = ''
      if (!this.form.category_id && t === 'income' && this.typeCategories[0]) this.form.category_id = this.typeCategories[0].id
      this.applyDefaultRate()
    },
    onCategory() {
      this.errors.category_id = ''
      this.applyDefaultRate()
    },
    applyDefaultRate() {
      if (this.taxTouched) return
      const cat = this.categories.find((c) => c.id === this.form.category_id)
      this.form.tax_rate = this.settings.tax_registered && !(cat && cat.tax_free) ? this.settings.tax_rate : 0
    },
    async onFile(ev) {
      const file = ev.target.files?.[0]
      ev.target.value = ''
      if (!file) return
      this.reading = true
      this.errors.attachment_data = ''
      try {
        this.form.attachment_data = await readAttachment(file)
        this.form.attachment_name = file.type.startsWith('image/') && !/\.(jpe?g|png|webp|gif)$/i.test(file.name) ? file.name + '.jpg' : file.name
        this.form.attachment_url = ''
      } catch (e) {
        this.errors = { ...this.errors, attachment_data: e.message }
      } finally {
        this.reading = false
      }
    },
    removeUpload() {
      this.form.attachment_data = ''
      this.form.attachment_name = ''
    },
    validate() {
      const e = {}
      if (!this.form.amount) e.amount = 'Enter an amount'
      else if (this.amountMinor === null) e.amount = this.decimals === 0 ? `${this.form.currency} has no decimal places` : `Enter a number with up to ${this.decimals} decimal places`
      else if (this.amountMinor <= 0) e.amount = 'Amount must be more than zero'
      if (!this.form.date) e.date = 'Pick a date'
      const r = Number(this.form.tax_rate)
      if (Number.isNaN(r) || r < 0 || r > 100) e.tax_rate = 'Between 0 and 100'
      this.errors = e
      return !Object.keys(e).length
    },
    async save() {
      if (!this.validate()) {
        if (this.errors.tax_rate) this.showMore = true
        return
      }
      this.saving = true
      const payload = { ...this.form, tax_rate: Number(this.form.tax_rate) || 0 }
      if (this.entryId && !this.form.attachment_data) payload.attachment_data = ''
      try {
        const saved = this.entryId ? await smallbizApi.updateEntry(this.entryId, payload) : await smallbizApi.createEntry(payload)
        this.$emit('saved', saved, !this.entryId)
      } catch (err) {
        const f = fieldErrors(err)
        if (Object.keys(f).length) {
          this.errors = f
          if (f.currency || f.tax_rate || f.attachment_url || f.attachment_data || f.reference) this.showMore = true
        } else {
          toast.error(apiErrorMessage(err, 'Could not save entry'))
        }
      } finally {
        this.saving = false
      }
    },
    async remove() {
      const ok = await confirmDialog({ title: 'Delete this entry?', message: 'It will be removed from your cash book and reports.', confirmText: 'Delete', danger: true })
      if (!ok) return
      this.saving = true
      try {
        await smallbizApi.deleteEntry(this.entryId)
        this.$emit('deleted', this.entryId)
      } catch (err) {
        toast.error(apiErrorMessage(err, 'Could not delete entry'))
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

<style scoped>
.entry-modal {
  width: 100%;
}

.ui-modal__body > * + * {
  margin-top: 14px;
}

.seg + * {
  margin-top: 0 !important;
}

.seg {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  padding: 4px;
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  margin-bottom: 16px;
}

.seg__btn {
  border: 0;
  background: transparent;
  font: inherit;
  font-weight: 600;
  color: var(--text-2);
  height: 38px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.seg__btn.is-in {
  background: var(--surface);
  color: var(--success);
  box-shadow: var(--shadow-xs);
}

.seg__btn.is-out {
  background: var(--surface);
  color: var(--danger);
  box-shadow: var(--shadow-xs);
}

.row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.row > .ui-field {
  flex: 1 1 140px;
}

.row > .ui-field.grow {
  flex: 2 1 200px;
}

.amount-wrap {
  display: flex;
  align-items: stretch;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  background: var(--surface);
  overflow: hidden;
}

.amount-wrap:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.amount-wrap.has-error {
  border-color: var(--danger);
}

.amount-cur {
  display: inline-flex;
  align-items: center;
  padding: 0 12px;
  font-weight: 600;
  font-size: 13px;
  color: var(--text-3);
  background: var(--surface-2);
  border-right: 1px solid var(--border);
}

.amount-input {
  border: 0 !important;
  box-shadow: none !important;
  font-size: 20px;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
  height: 46px;
}

.has-error {
  border-color: var(--danger) !important;
}

.err {
  color: var(--danger);
  font-size: 12.5px;
  margin-top: 4px;
}

.static {
  height: 38px;
  display: flex;
  align-items: center;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--text-2);
}

.tax-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  font-size: 13px;
  color: var(--text-3);
  padding: 10px 12px;
  background: var(--bg-subtle);
  border-radius: var(--radius-sm);
  flex-wrap: wrap;
}

.tax-line strong {
  color: var(--text);
  font-variant-numeric: tabular-nums;
}

.linkish {
  border: 0;
  background: none;
  color: var(--accent);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
}

.receipt {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
}

.receipt__img {
  width: 56px;
  height: 56px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid var(--border);
}

.receipt__pdf {
  width: 56px;
  height: 56px;
  display: grid;
  place-items: center;
  font-size: 24px;
  color: var(--danger);
  background: var(--danger-soft);
  border-radius: 6px;
}

.receipt__name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
}

.receipt-inputs {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.receipt-inputs .ui-input {
  flex: 1;
  min-width: 180px;
}

.upload-btn {
  position: relative;
  overflow: hidden;
  cursor: pointer;
}

.upload-btn input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.upload-btn.is-busy {
  opacity: 0.6;
  pointer-events: none;
}

.or {
  color: var(--text-3);
  font-size: 13px;
}

.spacer {
  flex: 1;
}

.danger-text {
  color: var(--danger);
}

.ui-modal__foot {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

@media (max-width: 520px) {
  .row > .ui-field {
    flex: 1 1 100%;
  }
}
</style>
