<template>
  <div class="ui-modal-backdrop" @mousedown.self="$emit('close')">
    <form class="ui-modal" style="max-width: 580px" role="dialog" aria-modal="true" aria-labelledby="txn-title" @submit.prevent="save">
      <div class="ui-modal__head">
        <h2 id="txn-title">Add transaction</h2>
        <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="$emit('close')"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="ui-modal__body form">
        <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>

        <div class="dir" role="radiogroup" aria-label="Direction">
          <button type="button" class="dir__btn in" :class="{ 'is-active': form.type === 'deposit' }" role="radio" :aria-checked="form.type === 'deposit'" @click="form.type = 'deposit'">
            <i class="fa-solid fa-arrow-down"></i> Money in
          </button>
          <button type="button" class="dir__btn out" :class="{ 'is-active': form.type === 'withdrawal' }" role="radio" :aria-checked="form.type === 'withdrawal'" @click="form.type = 'withdrawal'">
            <i class="fa-solid fa-arrow-up"></i> Money out
          </button>
        </div>

        <div class="ui-grid-2">
          <label class="ui-field">
            <span class="ui-label">Account</span>
            <select v-model="form.bank_account_id" class="ui-select" :class="{ 'is-invalid': touched && !form.bank_account_id }">
              <option value="" disabled>Select account…</option>
              <option v-for="b in banks" :key="b.id" :value="b.id">{{ b.account_name }}</option>
            </select>
          </label>
          <label class="ui-field">
            <span class="ui-label">Date</span>
            <input v-model="form.date" type="date" class="ui-input" />
          </label>
        </div>
        <label class="ui-field">
          <span class="ui-label">Description</span>
          <input ref="desc" v-model="form.description" class="ui-input" :class="{ 'is-invalid': touched && !form.description.trim() }" :placeholder="form.type === 'deposit' ? 'e.g. Payment from client' : 'e.g. Monthly software subscription'" maxlength="200" />
        </label>
        <div class="ui-grid-2">
          <label class="ui-field">
            <span class="ui-label">Amount</span>
            <input v-model="form.amount" type="number" step="0.01" min="0.01" class="ui-input num" :class="{ 'is-invalid': touched && !(parseFloat(form.amount) > 0) }" placeholder="0.00" />
          </label>
          <label class="ui-field">
            <span class="ui-label">Reference</span>
            <input v-model="form.reference" class="ui-input" placeholder="Optional" maxlength="60" />
          </label>
        </div>
        <label class="ui-field">
          <span class="ui-label">Category</span>
          <AccountSelect v-model="form.account_id" :accounts="accounts" :exclude="excluded" placeholder="Leave uncategorised for now" />
          <span class="ui-hint">Categorising posts the transaction to your ledger and reports.</span>
        </label>
        <label class="ui-switch">
          <input v-model="form.is_reconciled" type="checkbox" />
          <span>Matches my bank statement (reconciled)</span>
        </label>
      </div>
      <div class="ui-modal__foot">
        <button type="button" class="ui-btn" @click="$emit('close')">Cancel</button>
        <button type="submit" class="ui-btn ui-btn--primary" :disabled="saving">
          <i :class="saving ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-check'"></i> Add transaction
        </button>
      </div>
    </form>
  </div>
</template>

<script>
import AccountSelect from './AccountSelect.vue'
import { financeApi } from '@/services/finance'
import { apiErrorMessage } from '@/services/api'
import { isoDate } from '@/utils/format'
import { toast } from '@/composables/useToast'

export default {
  name: 'TransactionModal',
  components: { AccountSelect },
  props: {
    banks: { type: Array, default: () => [] },
    accounts: { type: Array, default: () => [] },
    bankAccountId: { type: String, default: '' }
  },
  emits: ['close', 'saved'],
  data() {
    return {
      form: {
        type: 'withdrawal',
        bank_account_id: this.bankAccountId || this.banks[0]?.id || '',
        date: isoDate(),
        description: '',
        amount: '',
        reference: '',
        account_id: '',
        is_reconciled: false
      },
      saving: false,
      touched: false,
      error: ''
    }
  },
  computed: {
    excluded() {
      return this.banks.map((b) => b.chart_account_id).filter(Boolean)
    }
  },
  mounted() {
    this.$refs.desc?.focus()
  },
  methods: {
    async save() {
      this.touched = true
      this.error = ''
      const amt = Math.round((parseFloat(this.form.amount) || 0) * 100) / 100
      if (!this.form.bank_account_id) this.error = 'Choose an account.'
      else if (!this.form.description.trim()) this.error = 'Add a description.'
      else if (amt <= 0) this.error = 'Enter an amount greater than zero.'
      if (this.error) return
      this.saving = true
      try {
        const saved = await financeApi.createTransaction({ ...this.form, description: this.form.description.trim(), amount: amt })
        toast.success('Transaction added')
        this.$emit('saved', saved)
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not add the transaction')
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

<style scoped>
.form {
  display: grid;
  gap: 14px;
}
.dir {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.dir__btn {
  height: 42px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-2);
  font: inherit;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.dir__btn.in.is-active {
  border-color: var(--success);
  background: var(--success-soft);
  color: var(--success);
}
.dir__btn.out.is-active {
  border-color: var(--danger);
  background: var(--danger-soft);
  color: var(--danger);
}
.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
@media (max-width: 520px) {
  .ui-grid-2 {
    grid-template-columns: 1fr;
  }
}
</style>
