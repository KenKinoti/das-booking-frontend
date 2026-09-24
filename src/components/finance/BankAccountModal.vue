<template>
  <div class="ui-modal-backdrop" @mousedown.self="$emit('close')">
    <form class="ui-modal" style="max-width: 620px" role="dialog" aria-modal="true" aria-labelledby="bank-title" @submit.prevent="save">
      <div class="ui-modal__head">
        <h2 id="bank-title">{{ account ? 'Edit bank account' : 'Add bank account' }}</h2>
        <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="$emit('close')"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="ui-modal__body form">
        <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>

        <div class="types" role="radiogroup" aria-label="Account type">
          <button v-for="t in types" :key="t.value" type="button" class="type" :class="{ 'is-active': form.account_type === t.value }" role="radio" :aria-checked="form.account_type === t.value" :disabled="typeLocked(t.value)" @click="form.account_type = t.value">
            <i :class="t.icon"></i><span>{{ t.label }}</span>
          </button>
        </div>

        <div class="ui-grid-2">
          <label class="ui-field">
            <span class="ui-label">Account name</span>
            <input ref="name" v-model="form.account_name" class="ui-input" :class="{ 'is-invalid': touched && !form.account_name.trim() }" placeholder="e.g. Business Everyday" maxlength="100" />
          </label>
          <label class="ui-field">
            <span class="ui-label">{{ form.account_type === 'cash' ? 'Held at' : 'Bank' }}</span>
            <input v-model="form.bank_name" class="ui-input" :class="{ 'is-invalid': touched && form.account_type !== 'cash' && !form.bank_name.trim() }" :placeholder="form.account_type === 'cash' ? 'e.g. Office safe' : 'e.g. Commonwealth Bank'" maxlength="100" list="bank-names" />
            <datalist id="bank-names">
              <option v-for="b in bankNames" :key="b" :value="b" />
            </datalist>
          </label>
          <label v-if="form.account_type !== 'cash' && form.account_type !== 'credit_card'" class="ui-field">
            <span class="ui-label">BSB</span>
            <input v-model="form.bsb" class="ui-input mono" placeholder="000-000" maxlength="7" inputmode="numeric" @input="formatBsb" />
          </label>
          <label v-if="form.account_type !== 'cash'" class="ui-field">
            <span class="ui-label">{{ form.account_type === 'credit_card' ? 'Card number (last 4 is enough)' : 'Account number' }}</span>
            <input v-model="form.account_number" class="ui-input mono" maxlength="24" autocomplete="off" inputmode="numeric" />
          </label>
          <label class="ui-field">
            <span class="ui-label">Currency</span>
            <select v-model="form.currency" class="ui-select">
              <option v-for="c in currencies" :key="c" :value="c">{{ c }}</option>
            </select>
          </label>
        </div>

        <template v-if="!account">
          <div class="ui-grid-2">
            <label class="ui-field">
              <span class="ui-label">{{ form.account_type === 'credit_card' ? 'Balance owing today' : 'Opening balance' }}</span>
              <input v-model="form.opening_balance" type="number" step="0.01" class="ui-input num" placeholder="0.00" />
            </label>
            <label class="ui-field">
              <span class="ui-label">As of</span>
              <input v-model="form.opening_date" type="date" class="ui-input" />
            </label>
          </div>
          <p class="ui-hint">The opening balance is posted against Opening Balance Equity so your balance sheet stays in balance.</p>
        </template>
        <div v-else class="balance-note">
          <i class="fa-solid fa-circle-info"></i>
          Current balance <strong>{{ money(account.balance) }}</strong> — change it by adding transactions.
        </div>

        <label class="ui-field">
          <span class="ui-label">Notes</span>
          <textarea v-model="form.notes" class="ui-textarea" rows="2" maxlength="500"></textarea>
        </label>
      </div>
      <div class="ui-modal__foot">
        <button type="button" class="ui-btn" @click="$emit('close')">Cancel</button>
        <button type="submit" class="ui-btn ui-btn--primary" :disabled="saving">
          <i :class="saving ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-check'"></i> {{ account ? 'Save changes' : 'Add account' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script>
import { financeApi, BANK_TYPES } from '@/services/finance'
import { apiErrorMessage } from '@/services/api'
import { formatMoney, isoDate } from '@/utils/format'
import { toast } from '@/composables/useToast'

export default {
  name: 'BankAccountModal',
  props: {
    account: { type: Object, default: null }
  },
  emits: ['close', 'saved'],
  data() {
    const a = this.account || {}
    return {
      form: {
        account_name: a.account_name || '',
        bank_name: a.bank_name || '',
        account_number: a.account_number || '',
        bsb: a.bsb || '',
        account_type: a.account_type || 'checking',
        currency: a.currency || 'AUD',
        opening_balance: '',
        opening_date: isoDate(),
        notes: a.notes || ''
      },
      saving: false,
      touched: false,
      error: ''
    }
  },
  computed: {
    types() {
      return BANK_TYPES
    },
    currencies() {
      return ['AUD', 'NZD', 'USD', 'GBP', 'EUR', 'CAD', 'SGD']
    },
    bankNames() {
      return ['Commonwealth Bank', 'Westpac', 'ANZ', 'NAB', 'Macquarie Bank', 'ING', 'Bank of Queensland', 'Bendigo Bank', 'Suncorp', 'St.George', 'Up', 'Wise']
    }
  },
  mounted() {
    this.$refs.name?.focus()
  },
  methods: {
    money(v) {
      return formatMoney(v, this.form.currency)
    },
    typeLocked(t) {
      // switching between a bank account and a credit card changes the ledger side
      return !!this.account && (t === 'credit_card') !== (this.account.account_type === 'credit_card') && this.account.balance !== 0
    },
    formatBsb() {
      const d = this.form.bsb.replace(/\D/g, '').slice(0, 6)
      this.form.bsb = d.length > 3 ? `${d.slice(0, 3)}-${d.slice(3)}` : d
    },
    async save() {
      this.touched = true
      this.error = ''
      if (!this.form.account_name.trim()) {
        this.error = 'Give the account a name.'
        return
      }
      if (this.form.account_type !== 'cash' && !this.form.bank_name.trim()) {
        this.error = 'Enter the bank name.'
        return
      }
      this.saving = true
      try {
        let ob = Math.round((parseFloat(this.form.opening_balance) || 0) * 100) / 100
        // a credit card balance owing is money the business owes
        if (this.form.account_type === 'credit_card' && ob > 0) ob = -ob
        const payload = { ...this.form, opening_balance: ob }
        const saved = this.account ? await financeApi.updateBankAccount(this.account.id, payload) : await financeApi.createBankAccount(payload)
        toast.success(this.account ? 'Account updated' : `${saved.account_name} added`)
        this.$emit('saved', saved)
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not save the account')
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
.types {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}
.type {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 6px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--text-2);
  font: inherit;
  font-size: 12.5px;
  font-weight: 550;
  cursor: pointer;
  text-align: center;
}
.type i {
  font-size: 16px;
  color: var(--text-3);
}
.type:hover:not(:disabled) {
  border-color: var(--border-strong);
}
.type.is-active {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent);
}
.type.is-active i {
  color: var(--accent);
}
.type:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.mono {
  font-family: var(--font-mono);
}
.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.balance-note {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 13.5px;
  padding: 10px 12px;
  border-radius: var(--radius);
  background: var(--bg-subtle);
  color: var(--text-2);
}
.balance-note i {
  color: var(--info);
}
@media (max-width: 560px) {
  .types {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .ui-grid-2 {
    grid-template-columns: 1fr;
  }
}
</style>
