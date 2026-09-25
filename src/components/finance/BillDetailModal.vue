<template>
  <div class="ui-modal-backdrop" @mousedown.self="$emit('close')">
    <div class="ui-modal" style="max-width: 780px" role="dialog" aria-modal="true" aria-labelledby="bd-title">
      <div class="ui-modal__head">
        <div>
          <div class="ui-eyebrow">Bill {{ bill.bill_number }}<template v-if="bill.reference"> · {{ bill.reference }}</template><template v-if="bill.purchase_order_number"> · for {{ bill.purchase_order_number }}</template></div>
          <h2 id="bd-title">{{ bill.vendor_name || 'Unknown vendor' }}</h2>
        </div>
        <div class="head-right">
          <span class="ui-badge" :class="`ui-badge--${badge}`">{{ statusLabel }}</span>
          <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="$emit('close')"><i class="fa-solid fa-xmark"></i></button>
        </div>
      </div>
      <div class="ui-modal__body">
        <div class="meta">
          <div><span>Bill date</span><strong>{{ date(bill.bill_date) }}</strong></div>
          <div>
            <span>Due</span>
            <strong :class="{ 'txt-danger': bill.display_status === 'overdue' }">{{ date(bill.due_date) }}</strong>
            <small v-if="bill.amount_due > 0 && bill.status !== 'draft'" :class="{ 'txt-danger': bill.display_status === 'overdue' }">{{ rel(bill.due_date) }}</small>
          </div>
          <div><span>Total</span><strong>{{ money(bill.total) }}</strong></div>
          <div><span>Amount due</span><strong :class="{ accent: bill.amount_due > 0 }">{{ money(bill.amount_due) }}</strong></div>
        </div>

        <div class="progress" :aria-label="`${pct}% paid`">
          <div class="progress__bar" :style="{ width: pct + '%' }"></div>
        </div>

        <div class="ui-table-wrap lines">
          <table class="ui-table">
            <thead>
              <tr>
                <th>Description</th>
                <th class="hide-sm">Account</th>
                <th class="num">Qty</th>
                <th class="num hide-sm">Price</th>
                <th class="num hide-sm">Tax</th>
                <th class="num">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="l in bill.line_items" :key="l.id">
                <td>{{ l.description }}</td>
                <td class="hide-sm muted">{{ accountName(l.account_id) }}</td>
                <td class="num">{{ qty(l.quantity) }}</td>
                <td class="num hide-sm">{{ money(l.unit_price) }}</td>
                <td class="num hide-sm muted">{{ l.tax_rate ? `${l.tax_rate}%` : '—' }}</td>
                <td class="num">{{ money(l.line_total) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="totals">
          <div><span>Subtotal</span><span>{{ money(bill.subtotal) }}</span></div>
          <div><span>Tax</span><span>{{ money(bill.tax_amount) }}</span></div>
          <div class="grand"><span>Total</span><span>{{ money(bill.total) }}</span></div>
        </div>

        <p v-if="bill.notes" class="notes"><i class="fa-regular fa-note-sticky"></i> {{ bill.notes }}</p>

        <h3 class="sec-title">Payments</h3>
        <div v-if="!bill.payments || !bill.payments.length" class="no-pay">No payments recorded yet.</div>
        <ul v-else class="payments">
          <li v-for="p in bill.payments" :key="p.id">
            <span class="pay-icon"><i class="fa-solid fa-arrow-up-right-from-square"></i></span>
            <div class="pay-info">
              <strong>{{ money(p.amount) }}</strong>
              <small>{{ date(p.payment_date) }} · {{ methodLabel(p.payment_method) }}<template v-if="p.bank_account_name"> · {{ p.bank_account_name }}</template><template v-if="p.reference"> · {{ p.reference }}</template></small>
            </div>
            <button class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" :disabled="busy" aria-label="Remove payment" title="Remove payment" @click="removePayment(p)"><i class="fa-regular fa-trash-can"></i></button>
          </li>
        </ul>
      </div>
      <div class="ui-modal__foot foot">
        <button class="ui-btn ui-btn--ghost danger-text" @click="$emit('delete', bill)"><i class="fa-regular fa-trash-can"></i> Delete</button>
        <span class="spacer"></span>
        <button class="ui-btn" @click="$emit('edit', bill)"><i class="fa-solid fa-pen"></i> Edit</button>
        <button v-if="bill.status === 'draft'" class="ui-btn ui-btn--primary" :disabled="busy" @click="$emit('approve', bill)"><i class="fa-solid fa-check"></i> Approve</button>
        <button v-else-if="bill.amount_due > 0" class="ui-btn ui-btn--success" @click="$emit('pay', bill)"><i class="fa-solid fa-money-bill-wave"></i> Record payment</button>
      </div>
    </div>
  </div>
</template>

<script>
import { orgCurrency } from '@/utils/orgDefaults'
import { financeApi, PAYMENT_METHODS, BILL_STATUS_LABELS, BILL_BADGE } from '@/services/finance'
import { apiErrorMessage } from '@/services/api'
import { formatMoney, formatDate, relativeDays } from '@/utils/format'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'

export default {
  name: 'BillDetailModal',
  props: {
    bill: { type: Object, required: true },
    accounts: { type: Array, default: () => [] },
    currency: { type: String, default: () => orgCurrency() }
  },
  emits: ['close', 'edit', 'pay', 'approve', 'delete', 'changed'],
  data() {
    return { busy: false }
  },
  computed: {
    badge() {
      return BILL_BADGE[this.bill.display_status] || 'draft'
    },
    statusLabel() {
      return BILL_STATUS_LABELS[this.bill.display_status] || this.bill.display_status
    },
    pct() {
      if (!this.bill.total) return 0
      return Math.min(100, Math.round((this.bill.paid_amount / this.bill.total) * 100))
    }
  },
  methods: {
    money(v) {
      return formatMoney(v, this.currency)
    },
    date: formatDate,
    rel(d) {
      const r = relativeDays(d)
      return this.bill.display_status === 'overdue' ? `${this.bill.days_overdue} day${this.bill.days_overdue === 1 ? '' : 's'} overdue` : `due ${r}`
    },
    qty(q) {
      return Number(q) % 1 === 0 ? Number(q) : Number(q).toFixed(2)
    },
    accountName(id) {
      const a = this.accounts.find((x) => x.id === id)
      return a ? `${a.code} · ${a.name}` : '—'
    },
    methodLabel(m) {
      return PAYMENT_METHODS.find((x) => x.value === m)?.label || m
    },
    async removePayment(p) {
      const ok = await confirmDialog({
        title: `Remove payment of ${this.money(p.amount)}?`,
        message: 'The payment, its bank withdrawal and journal will be reversed, and the bill will show as unpaid again.',
        confirmText: 'Remove payment',
        danger: true
      })
      if (!ok) return
      this.busy = true
      try {
        const updated = await financeApi.deleteBillPayment(this.bill.id, p.id)
        toast.success('Payment removed')
        this.$emit('changed', updated)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not remove the payment'))
      } finally {
        this.busy = false
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
.meta {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}
.meta span {
  display: block;
  font-size: 12px;
  color: var(--text-3);
}
.meta strong {
  font-variant-numeric: tabular-nums;
  font-size: 15px;
}
.meta small {
  display: block;
  font-size: 12px;
  color: var(--text-3);
}
.accent {
  color: var(--accent);
}
.txt-danger,
.meta small.txt-danger {
  color: var(--danger);
}
.progress {
  height: 6px;
  border-radius: 999px;
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  margin: 16px 0 18px;
  overflow: hidden;
}
.progress__bar {
  height: 100%;
  background: var(--success);
  border-radius: 999px;
}
.lines {
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.muted {
  color: var(--text-3);
}
.totals {
  margin: 12px 0 0 auto;
  max-width: 260px;
  display: grid;
  gap: 4px;
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
  padding-top: 6px;
  font-weight: 700;
}
.notes {
  background: var(--bg-subtle);
  border-radius: var(--radius);
  padding: 10px 12px;
  font-size: 13.5px;
  color: var(--text-2);
  margin: 16px 0 0;
  white-space: pre-wrap;
}
.sec-title {
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-3);
  margin: 22px 0 8px;
}
.no-pay {
  color: var(--text-3);
  font-size: 13.5px;
}
.payments {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}
.payments li {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.pay-icon {
  width: 30px;
  height: 30px;
  border-radius: 9px;
  display: grid;
  place-items: center;
  background: var(--success-soft);
  color: var(--success);
  font-size: 12px;
  flex-shrink: 0;
}
.pay-info {
  flex: 1;
  min-width: 0;
}
.pay-info strong {
  font-variant-numeric: tabular-nums;
}
.pay-info small {
  display: block;
  color: var(--text-3);
  font-size: 12.5px;
}
.foot {
  flex-wrap: wrap;
}
.spacer {
  flex: 1;
}
.danger-text {
  color: var(--danger);
}
@media (max-width: 640px) {
  .meta {
    grid-template-columns: 1fr 1fr;
  }
  .hide-sm {
    display: none;
  }
}
</style>
