<template>
  <div class="ui-modal-backdrop" @mousedown.self="$emit('close')">
    <form class="ui-modal" style="max-width: 520px" role="dialog" aria-modal="true" aria-labelledby="mp-title" data-testid="paid-modal" @submit.prevent="save">
      <div class="ui-modal__head">
        <h2 id="mp-title">Mark {{ sub.open.invoice_number }} as paid</h2>
        <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="$emit('close')"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="ui-modal__body">
        <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>
        <p class="ui-hint">The payment is recorded on the invoice (receipt, balance and reports as for any payment).{{ sub.status === 'suspended' ? ' Paid in full, the service is unsuspended straight away.' : '' }}</p>
        <div class="ui-grid-2">
          <div class="ui-field">
            <label for="mp-amount">Amount ({{ sub.open.currency }})</label>
            <input id="mp-amount" v-model="f.amount" class="ui-input num" type="number" min="0.01" step="any" :max="sub.open.balance" data-testid="mp-amount" />
            <span class="ui-hint">Balance {{ money(sub.open.balance, sub.open.currency) }}</span>
          </div>
          <div class="ui-field">
            <label for="mp-method">How they paid</label>
            <select id="mp-method" v-model="f.method" class="ui-select" data-testid="mp-method">
              <option v-for="m in PAYMENT_METHODS" :key="m.key" :value="m.key">{{ m.label }}</option>
            </select>
          </div>
        </div>
        <div class="ui-grid-2">
          <div class="ui-field">
            <label for="mp-ref">Reference</label>
            <input id="mp-ref" v-model.trim="f.reference" class="ui-input" placeholder="e.g. M-Pesa code QKX81JD" data-testid="mp-ref" />
          </div>
          <div class="ui-field">
            <label for="mp-date">Date</label>
            <input id="mp-date" v-model="f.date" class="ui-input" type="date" :max="today" />
          </div>
        </div>
        <label class="ui-switch"><input v-model="f.email_receipt" type="checkbox" data-testid="mp-receipt" /> <span>Email the receipt to the client</span></label>
      </div>
      <div class="ui-modal__foot">
        <button type="button" class="ui-btn" @click="$emit('close')">Cancel</button>
        <button type="submit" class="ui-btn ui-btn--success" :disabled="busy" data-testid="mp-save"><i :class="busy ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-check'"></i> Record payment</button>
      </div>
    </form>
  </div>
</template>

<script>
import { subscriptionsApi, PAYMENT_METHODS, todayISO } from '@/services/subscriptions'
import { apiErrorMessage } from '@/services/api'
import { formatCurrency } from '@/utils/currencies'

export default {
  name: 'MarkPaidModal',
  props: { sub: { type: Object, required: true } },
  emits: ['close', 'paid'],
  data() {
    return {
      PAYMENT_METHODS,
      today: todayISO(),
      f: { amount: this.sub.open.balance, method: 'mobile_money', reference: '', date: todayISO(), email_receipt: true },
      busy: false,
      error: ''
    }
  },
  methods: {
    money(v, c) {
      return formatCurrency(v || 0, c)
    },
    async save() {
      this.error = ''
      const amount = Number(this.f.amount)
      if (!(amount > 0)) {
        this.error = 'Enter the amount paid.'
        return
      }
      this.busy = true
      try {
        const out = await subscriptionsApi.markPaid(this.sub.id, { amount, method: this.f.method, reference: this.f.reference, date: this.f.date, email_receipt: this.f.email_receipt })
        this.$emit('paid', out)
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not record the payment')
      } finally {
        this.busy = false
      }
    }
  }
}
</script>

<style scoped>
.num {
  font-variant-numeric: tabular-nums;
}
.ui-switch {
  margin-top: 4px;
}
</style>
