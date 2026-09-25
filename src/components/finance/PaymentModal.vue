<template>
  <div class="ui-modal-backdrop" @mousedown.self="$emit('close')">
    <form class="ui-modal" role="dialog" aria-modal="true" aria-labelledby="pay-title" @submit.prevent="save">
      <div class="ui-modal__head">
        <div>
          <div class="ui-eyebrow">{{ bill.bill_number }} · {{ bill.vendor_name }}</div>
          <h2 id="pay-title">Record payment</h2>
        </div>
        <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="$emit('close')"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="ui-modal__body form">
        <div class="due-box">
          <div><span>Bill total</span><strong>{{ money(bill.total) }}</strong></div>
          <div><span>Already paid</span><strong>{{ money(bill.paid_amount) }}</strong></div>
          <div><span>Amount due</span><strong class="due">{{ money(bill.amount_due) }}</strong></div>
        </div>
        <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>
        <div class="ui-grid-2">
          <label class="ui-field">
            <span class="ui-label">Amount</span>
            <input ref="amount" v-model="form.amount" type="number" step="0.01" min="0.01" :max="bill.amount_due" class="ui-input num" :class="{ 'is-invalid': overpay }" />
            <span class="ui-hint">
              <template v-if="overpay"><span class="txt-danger">More than the amount due</span></template>
              <template v-else-if="partial">Part payment — {{ money(remaining) }} will remain</template>
              <template v-else>Pays the bill in full</template>
            </span>
          </label>
          <label class="ui-field">
            <span class="ui-label">Payment date</span>
            <input v-model="form.payment_date" type="date" class="ui-input" />
          </label>
        </div>
        <label class="ui-field">
          <span class="ui-label">Paid from</span>
          <select v-model="form.bank_account_id" class="ui-select">
            <option v-for="b in banks" :key="b.id" :value="b.id">{{ b.account_name }} · {{ b.bank_name }} ({{ money(b.balance) }})</option>
            <option value="">Cash on hand (no bank account)</option>
          </select>
          <span class="ui-hint">A matching withdrawal is added to the bank account’s transactions.</span>
        </label>
        <div class="ui-grid-2">
          <label class="ui-field">
            <span class="ui-label">Method</span>
            <select v-model="form.payment_method" class="ui-select">
              <option v-for="m in methods" :key="m.value" :value="m.value">{{ m.label }}</option>
            </select>
          </label>
          <label class="ui-field">
            <span class="ui-label">Reference</span>
            <input v-model="form.reference" class="ui-input" placeholder="Optional" maxlength="60" />
          </label>
        </div>
      </div>
      <div class="ui-modal__foot">
        <button type="button" class="ui-btn" @click="$emit('close')">Cancel</button>
        <button type="submit" class="ui-btn ui-btn--success" :disabled="saving || overpay">
          <i :class="saving ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-check'"></i> Record {{ money(amountNum) }}
        </button>
      </div>
    </form>
  </div>
</template>

<script>
import { orgCurrency } from '@/utils/orgDefaults'
import { financeApi, PAYMENT_METHODS, toCents } from '@/services/finance'
import { apiErrorMessage } from '@/services/api'
import { formatMoney, isoDate } from '@/utils/format'
import { toast } from '@/composables/useToast'

export default {
  name: 'PaymentModal',
  props: {
    bill: { type: Object, required: true },
    banks: { type: Array, default: () => [] },
    currency: { type: String, default: () => orgCurrency() }
  },
  emits: ['close', 'saved'],
  data() {
    const firstBank = this.banks.find((b) => b.account_type !== 'credit_card') || this.banks[0]
    return {
      form: {
        amount: this.bill.amount_due,
        payment_date: isoDate(),
        payment_method: 'bank_transfer',
        bank_account_id: firstBank ? firstBank.id : '',
        reference: ''
      },
      saving: false,
      error: ''
    }
  },
  computed: {
    methods() {
      return PAYMENT_METHODS
    },
    amountNum() {
      return Math.round((parseFloat(this.form.amount) || 0) * 100) / 100
    },
    overpay() {
      return toCents(this.amountNum) > toCents(this.bill.amount_due)
    },
    remaining() {
      return (toCents(this.bill.amount_due) - toCents(this.amountNum)) / 100
    },
    partial() {
      return this.remaining > 0
    }
  },
  mounted() {
    this.$refs.amount?.select()
  },
  methods: {
    money(v) {
      return formatMoney(v, this.currency)
    },
    async save() {
      this.error = ''
      if (this.amountNum <= 0) {
        this.error = 'Enter an amount greater than zero.'
        return
      }
      if (this.overpay) return
      this.saving = true
      try {
        const saved = await financeApi.payBill(this.bill.id, { ...this.form, amount: this.amountNum })
        toast.success(saved.status === 'paid' ? `${this.bill.bill_number} paid in full` : `Payment of ${this.money(this.amountNum)} recorded`)
        this.$emit('saved', saved)
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not record the payment')
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
.due-box {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  padding: 12px 14px;
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.due-box span {
  display: block;
  font-size: 12px;
  color: var(--text-3);
}
.due-box strong {
  font-variant-numeric: tabular-nums;
}
.due {
  color: var(--accent);
}
.num {
  font-variant-numeric: tabular-nums;
}
.txt-danger {
  color: var(--danger);
}
</style>
