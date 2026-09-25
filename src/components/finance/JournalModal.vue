<template>
  <div class="ui-modal-backdrop" @mousedown.self="$emit('close')">
    <form class="ui-modal" style="max-width: 940px" role="dialog" aria-modal="true" aria-labelledby="je-title" @submit.prevent="save('draft')">
      <div class="ui-modal__head">
        <div>
          <div v-if="entry" class="ui-eyebrow">{{ entry.entry_number }}</div>
          <h2 id="je-title">{{ readonly ? 'Journal entry' : entry ? 'Edit journal entry' : 'New journal entry' }}</h2>
        </div>
        <div class="head-right">
          <span v-if="entry" class="ui-badge" :class="badge(entry.status)">{{ statusLabel(entry.status) }}</span>
          <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="$emit('close')"><i class="fa-solid fa-xmark"></i></button>
        </div>
      </div>

      <div class="ui-modal__body">
        <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>
        <div v-if="readonly && entry && entry.source && entry.source !== 'manual'" class="ui-alert">
          <i class="fa-solid fa-circle-info"></i><span>Created automatically from a {{ sourceLabel(entry.source) }}. Change the source document to adjust it.</span>
        </div>

        <div class="head-grid">
          <label class="ui-field">
            <span class="ui-label">Date</span>
            <input v-model="form.date" type="date" class="ui-input" :disabled="readonly" required />
          </label>
          <label class="ui-field grow">
            <span class="ui-label">Description</span>
            <input v-model="form.description" class="ui-input" :class="{ 'is-invalid': touched && !form.description.trim() }" :disabled="readonly" placeholder="e.g. Monthly depreciation" maxlength="200" />
          </label>
          <label class="ui-field">
            <span class="ui-label">Reference</span>
            <input v-model="form.reference" class="ui-input" :disabled="readonly" placeholder="Optional" maxlength="60" />
          </label>
        </div>

        <div class="lines">
          <div class="line line--head">
            <span>Account</span>
            <span class="hide-sm">Line description</span>
            <span class="num">Debit</span>
            <span class="num">Credit</span>
            <span></span>
          </div>
          <div v-for="(l, i) in form.lines" :key="l.key" class="line">
            <AccountSelect v-model="l.chart_of_account_id" :accounts="accounts" :disabled="readonly" :aria-label="`Line ${i + 1} account`" />
            <input v-model="l.description" class="ui-input hide-sm" :disabled="readonly" placeholder="Optional" :aria-label="`Line ${i + 1} description`" />
            <input v-model="l.debit" class="ui-input num" type="number" inputmode="decimal" min="0" step="0.01" placeholder="Debit" :disabled="readonly" :aria-label="`Line ${i + 1} debit`" @input="onAmount(l, 'debit')" />
            <input v-model="l.credit" class="ui-input num" type="number" inputmode="decimal" min="0" step="0.01" placeholder="Credit" :disabled="readonly" :aria-label="`Line ${i + 1} credit`" @input="onAmount(l, 'credit')" />
            <button v-if="!readonly" type="button" class="ui-btn ui-btn--ghost ui-btn--icon ui-btn--sm" :disabled="form.lines.length <= 2" aria-label="Remove line" @click="form.lines.splice(i, 1)">
              <i class="fa-solid fa-xmark"></i>
            </button>
            <span v-else></span>
          </div>
          <div class="line line--total">
            <span>
              <button v-if="!readonly" type="button" class="ui-btn ui-btn--sm" @click="addLine"><i class="fa-solid fa-plus"></i> Add line</button>
            </span>
            <span class="hide-sm total-label">Totals</span>
            <span class="num"><strong>{{ money(totals.dr) }}</strong></span>
            <span class="num"><strong>{{ money(totals.cr) }}</strong></span>
            <span></span>
          </div>
        </div>

        <div class="balance" :class="balanced ? 'ok' : 'bad'">
          <i :class="balanced ? 'fa-solid fa-circle-check' : 'fa-solid fa-scale-unbalanced'"></i>
          <span v-if="balanced">Balanced — debits equal credits.</span>
          <span v-else-if="totals.dr === 0 && totals.cr === 0">Enter debit and credit amounts. They must balance.</span>
          <span v-else>Out of balance by <strong>{{ money(Math.abs(totals.dr - totals.cr)) }}</strong>.</span>
        </div>
      </div>

      <div class="ui-modal__foot">
        <template v-if="readonly">
          <button v-if="entry && entry.status === 'posted' && (!entry.source || entry.source === 'manual')" type="button" class="ui-btn" :disabled="!!saving" @click="$emit('reverse', entry)">
            <i class="fa-solid fa-rotate-left"></i> Reverse
          </button>
          <button type="button" class="ui-btn ui-btn--primary" @click="$emit('close')">Close</button>
        </template>
        <template v-else>
          <button type="button" class="ui-btn" @click="$emit('close')">Cancel</button>
          <button type="submit" class="ui-btn" :disabled="!!saving">
            <i :class="saving === 'draft' ? 'fa-solid fa-circle-notch fa-spin' : 'fa-regular fa-floppy-disk'"></i> Save draft
          </button>
          <button type="button" class="ui-btn ui-btn--primary" :disabled="!!saving || !balanced" @click="save('posted')">
            <i :class="saving === 'posted' ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-check'"></i> Save & post
          </button>
        </template>
      </div>
    </form>
  </div>
</template>

<script>
import { orgCurrency } from '@/utils/orgDefaults'
import AccountSelect from './AccountSelect.vue'
import { financeApi } from '@/services/finance'
import { apiErrorMessage } from '@/services/api'
import { formatMoney, isoDate } from '@/utils/format'
import { toast } from '@/composables/useToast'

let key = 0
const blank = () => ({ key: ++key, chart_of_account_id: '', description: '', debit: '', credit: '' })

export default {
  name: 'JournalModal',
  components: { AccountSelect },
  props: {
    entry: { type: Object, default: null },
    accounts: { type: Array, default: () => [] },
    currency: { type: String, default: () => orgCurrency() }
  },
  emits: ['close', 'saved', 'reverse'],
  data() {
    const e = this.entry
    const lines = e?.line_items?.length
      ? e.line_items.map((l) => ({
          key: ++key,
          chart_of_account_id: l.chart_of_account_id,
          description: l.description,
          debit: l.debit_amount ? String(l.debit_amount) : '',
          credit: l.credit_amount ? String(l.credit_amount) : ''
        }))
      : [blank(), blank()]
    return {
      form: {
        date: e?.date ? isoDate(e.date) : isoDate(),
        description: e?.description || '',
        reference: e?.reference || '',
        lines
      },
      saving: '',
      touched: false,
      error: ''
    }
  },
  computed: {
    readonly() {
      return !!this.entry && this.entry.status !== 'draft'
    },
    totals() {
      const c = (v) => Math.round((parseFloat(v) || 0) * 100)
      return {
        dr: this.form.lines.reduce((s, l) => s + c(l.debit), 0) / 100,
        cr: this.form.lines.reduce((s, l) => s + c(l.credit), 0) / 100
      }
    },
    balanced() {
      return this.totals.dr > 0 && Math.round(this.totals.dr * 100) === Math.round(this.totals.cr * 100)
    }
  },
  methods: {
    money(v) {
      return formatMoney(v, this.currency)
    },
    badge(s) {
      return { draft: 'ui-badge--draft', posted: 'ui-badge--paid', reversed: 'ui-badge--void' }[s] || ''
    },
    statusLabel(s) {
      return { draft: 'Draft', posted: 'Posted', reversed: 'Reversed' }[s] || s
    },
    sourceLabel(s) {
      return { bill: 'bill', bill_payment: 'bill payment', bank: 'bank transaction', opening_balance: 'bank opening balance', reversal: 'reversal' }[s] || s
    },
    addLine() {
      this.form.lines.push(blank())
    },
    onAmount(l, side) {
      // a line is either a debit or a credit
      if (side === 'debit' && l.debit !== '') l.credit = ''
      if (side === 'credit' && l.credit !== '') l.debit = ''
    },
    validate() {
      if (!this.form.description.trim()) return 'Add a description.'
      const used = this.form.lines.filter((l) => l.chart_of_account_id || parseFloat(l.debit) || parseFloat(l.credit))
      if (used.length < 2) return 'A journal entry needs at least two lines.'
      for (const [i, l] of used.entries()) {
        if (!l.chart_of_account_id) return `Choose an account on line ${i + 1}.`
        const d = parseFloat(l.debit) || 0
        const c = parseFloat(l.credit) || 0
        if (d < 0 || c < 0) return 'Amounts cannot be negative.'
        if (!d && !c) return `Enter a debit or credit on line ${i + 1}.`
      }
      if (!this.balanced) return 'Debits and credits must balance.'
      return ''
    },
    async save(status) {
      this.touched = true
      this.error = this.validate()
      if (this.error) return
      this.saving = status
      const payload = {
        date: this.form.date,
        description: this.form.description.trim(),
        reference: this.form.reference.trim(),
        status,
        line_items: this.form.lines
          .filter((l) => l.chart_of_account_id)
          .map((l) => ({
            chart_of_account_id: l.chart_of_account_id,
            description: l.description,
            debit_amount: Math.round((parseFloat(l.debit) || 0) * 100) / 100,
            credit_amount: Math.round((parseFloat(l.credit) || 0) * 100) / 100
          }))
      }
      try {
        const saved = this.entry ? await financeApi.updateJournal(this.entry.id, payload) : await financeApi.createJournal(payload)
        toast.success(status === 'posted' ? `Journal ${saved?.entry_number || ''} posted` : 'Draft saved')
        this.$emit('saved', saved)
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not save the journal entry')
      } finally {
        this.saving = ''
      }
    }
  }
}
</script>

<style scoped>
.head-right {
  display: flex;
  align-items: center;
  gap: 10px;
}
.head-grid {
  display: grid;
  grid-template-columns: 170px minmax(0, 1fr) 170px;
  gap: 12px;
  margin-bottom: 18px;
}
.lines {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}
.line {
  display: grid;
  grid-template-columns: minmax(0, 2.2fr) minmax(0, 1.6fr) 130px 130px 36px;
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
.line--total {
  background: var(--bg-subtle);
}
.total-label {
  text-align: right;
  font-size: 13px;
  color: var(--text-3);
}
.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
input.num {
  text-align: right;
}
.balance {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  font-size: 13.5px;
  padding: 10px 12px;
  border-radius: var(--radius);
}
.balance.ok {
  background: var(--success-soft);
  color: var(--success);
}
.balance.bad {
  background: var(--warning-soft);
  color: var(--warning);
}
.balance span {
  color: var(--text);
}
.ui-modal__foot {
  flex-wrap: wrap;
}
@media (max-width: 760px) {
  .head-grid {
    grid-template-columns: 1fr;
  }
  .line--head {
    display: none;
  }
  .line {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 32px;
    gap: 6px;
    padding: 8px;
  }
  .line > :first-child {
    grid-column: 1 / -1;
  }
  .hide-sm {
    display: none;
  }
}
</style>
