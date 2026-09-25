<template>
  <div class="sheet-backdrop" @mousedown.self="$emit('close')">
    <aside class="sheet" role="dialog" aria-modal="true" aria-labelledby="txn-title">
      <header class="sheet__head">
        <div>
          <div class="ui-eyebrow">Sale</div>
          <h2 id="txn-title">{{ txn?.transaction_number || 'Loading…' }}</h2>
          <div v-if="txn" class="sheet__sub">
            <span class="ui-badge" :class="txn.status === 'voided' ? 'ui-badge--void' : 'ui-badge--paid'">{{ txn.status === 'voided' ? 'Voided' : 'Completed' }}</span>
            <span>{{ dateTime(txn.created_at) }}</span>
          </div>
        </div>
        <button class="ui-btn ui-btn--ghost ui-btn--icon ui-btn--sm" aria-label="Close" @click="$emit('close')"><i class="fa-solid fa-xmark"></i></button>
      </header>

      <div class="sheet__body">
        <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>
        <template v-else-if="!txn">
          <div v-for="n in 5" :key="n" class="ui-skeleton" style="height: 18px; margin-bottom: 12px"></div>
        </template>
        <template v-else>
          <div v-if="txn.status === 'voided'" class="ui-alert ui-alert--danger">
            <i class="fa-solid fa-ban"></i>
            <span>Voided {{ dateTime(txn.voided_at) }}. <strong>Reason:</strong> {{ txn.void_reason || '—' }}</span>
          </div>

          <div class="total-card">
            <span>Total</span>
            <strong :class="{ struck: txn.status === 'voided' }">{{ money(txn.total_amount) }}</strong>
          </div>

          <dl class="facts">
            <div>
              <dt>Customer</dt>
              <dd>
                <template v-if="txn.customer">
                  {{ name(txn.customer) }}<small v-if="txn.customer.email || txn.customer.phone">{{ txn.customer.email || txn.customer.phone }}</small>
                </template>
                <span v-else class="muted">Walk-in</span>
              </dd>
            </div>
            <div>
              <dt>Cashier</dt>
              <dd>{{ name(txn.cashier) || '—' }}</dd>
            </div>
          </dl>

          <h3 class="sec">Items</h3>
          <table class="ui-table mini">
            <thead>
              <tr>
                <th>Item</th>
                <th class="num">Qty</th>
                <th class="num">Price</th>
                <th class="num">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="it in txn.items" :key="it.id">
                <td>
                  <div class="item-name">{{ it.item_name }}</div>
                  <small v-if="it.sku" class="muted mono">{{ it.sku }}</small>
                </td>
                <td class="num">{{ it.quantity }}</td>
                <td class="num">{{ money(it.unit_price) }}</td>
                <td class="num">{{ money(it.total_price) }}</td>
              </tr>
            </tbody>
          </table>

          <dl class="sums">
            <div><dt>Subtotal</dt><dd>{{ money(txn.sub_total) }}</dd></div>
            <div v-if="txn.discount_amount > 0"><dt>Discount</dt><dd>−{{ money(txn.discount_amount) }}</dd></div>
            <div v-if="txn.tax_amount > 0"><dt>{{ txn.tax_inclusive ? 'Tax (included)' : 'Tax' }}</dt><dd>{{ money(txn.tax_amount) }}</dd></div>
            <div class="sums__grand"><dt>Total</dt><dd>{{ money(txn.total_amount) }}</dd></div>
          </dl>

          <h3 class="sec">Payments</h3>
          <ul class="pays">
            <li v-for="p in txn.payments" :key="p.id">
              <span class="pay-ic"><i :class="payIcon(p.method)"></i></span>
              <span class="pays__main">
                {{ label(p.method) }}
                <small v-if="p.reference" class="muted">{{ p.reference }}</small>
              </span>
              <strong>{{ money(p.amount) }}</strong>
            </li>
            <li v-if="txn.change_amount > 0" class="change">
              <span class="pay-ic"><i class="fa-solid fa-arrow-rotate-left"></i></span>
              <span class="pays__main">Change given</span>
              <strong>−{{ money(txn.change_amount) }}</strong>
            </li>
          </ul>

          <template v-if="txn.notes">
            <h3 class="sec">Notes</h3>
            <p class="notes">{{ txn.notes }}</p>
          </template>
        </template>
      </div>

      <footer v-if="txn" class="sheet__foot">
        <button v-if="txn.status !== 'voided'" class="ui-btn ui-btn--danger" @click="voidOpen = true"><i class="fa-solid fa-ban"></i> Void sale</button>
        <span class="spacer"></span>
        <button class="ui-btn ui-btn--primary" @click="showReceipt = true"><i class="fa-solid fa-print"></i> Receipt</button>
      </footer>
    </aside>

    <!-- Void confirmation -->
    <div v-if="voidOpen" class="ui-modal-backdrop" @mousedown.self="!voiding && (voidOpen = false)">
      <div class="ui-modal" role="alertdialog" aria-modal="true" aria-labelledby="void-title">
        <div class="ui-modal__head">
          <h2 id="void-title">Void {{ txn.transaction_number }}?</h2>
          <button class="ui-btn ui-btn--ghost ui-btn--icon ui-btn--sm" aria-label="Close" :disabled="voiding" @click="voidOpen = false"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <form class="ui-modal__body" @submit.prevent="doVoid">
          <p class="void-copy">This marks the {{ money(txn.total_amount) }} sale as voided and returns {{ itemQty }} item{{ itemQty === 1 ? '' : 's' }} to stock. Refund the customer’s payment separately. This can’t be undone.</p>
          <div class="ui-field">
            <label for="void-reason">Reason</label>
            <textarea id="void-reason" ref="reason" v-model="reason" class="ui-textarea" rows="2" maxlength="300" placeholder="e.g. Customer returned items, entered in error" required></textarea>
          </div>
        </form>
        <div class="ui-modal__foot">
          <button class="ui-btn" :disabled="voiding" @click="voidOpen = false">Cancel</button>
          <button class="ui-btn ui-btn--danger" :disabled="voiding || !reason.trim()" @click="doVoid">
            <i :class="voiding ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-ban'"></i> Void sale
          </button>
        </div>
      </div>
    </div>

    <ReceiptModal v-if="showReceipt && txn" :transaction="txn" :organization="organization" :currency="txn.currency || currency" @close="showReceipt = false" />
  </div>
</template>

<script>
import { orgCurrency } from '@/utils/orgDefaults'
import ReceiptModal from './ReceiptModal.vue'
import { posService, PAYMENT_LABELS, personName } from '@/services/posService'
import { apiErrorMessage } from '@/services/api'
import { formatMoney, formatDateTime } from '@/utils/format'
import { toast } from '@/composables/useToast'

export default {
  name: 'TransactionDrawer',
  components: { ReceiptModal },
  props: {
    transactionId: { type: String, required: true },
    organization: { type: Object, default: null },
    currency: { type: String, default: () => orgCurrency() }
  },
  emits: ['close', 'voided'],
  data() {
    return { txn: null, error: '', voidOpen: false, reason: '', voiding: false, showReceipt: false }
  },
  computed: {
    itemQty() {
      return (this.txn?.items || []).reduce((n, i) => n + (i.product_id ? i.quantity : 0), 0)
    }
  },
  watch: {
    transactionId: { immediate: true, handler: 'load' },
    voidOpen(v) {
      if (v) {
        this.reason = ''
        this.$nextTick(() => this.$refs.reason?.focus())
      }
    }
  },
  mounted() {
    document.addEventListener('keydown', this.onKey)
  },
  beforeUnmount() {
    document.removeEventListener('keydown', this.onKey)
  },
  methods: {
    money(v) {
      return formatMoney(v, this.txn?.currency || this.currency)
    },
    dateTime: formatDateTime,
    name: personName,
    label(m) {
      return PAYMENT_LABELS[m] || m
    },
    payIcon(m) {
      return m === 'cash' ? 'fa-solid fa-money-bill-wave' : m === 'card' || m === 'eftpos' ? 'fa-regular fa-credit-card' : m === 'voucher' ? 'fa-solid fa-gift' : 'fa-solid fa-building-columns'
    },
    onKey(e) {
      if (e.key !== 'Escape' || this.showReceipt) return
      if (this.voidOpen) {
        if (!this.voiding) this.voidOpen = false
      } else this.$emit('close')
    },
    async load() {
      this.txn = null
      this.error = ''
      try {
        this.txn = await posService.getTransaction(this.transactionId)
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load this sale')
      }
    },
    async doVoid() {
      if (!this.reason.trim() || this.voiding) return
      this.voiding = true
      try {
        this.txn = await posService.voidTransaction(this.txn.id, this.reason.trim())
        this.voidOpen = false
        toast.success(`${this.txn.transaction_number} voided and stock restored`)
        this.$emit('voided', this.txn)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not void this sale'))
      } finally {
        this.voiding = false
      }
    }
  }
}
</script>

<style scoped>
.sheet-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1990;
  background: rgba(10, 12, 24, 0.45);
  display: flex;
  justify-content: flex-end;
  animation: ui-fade 0.15s ease-out;
}
.sheet {
  width: min(520px, 100%);
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border-left: 1px solid var(--border);
  box-shadow: var(--shadow-lg);
  animation: slide 0.22s var(--ease);
}
@keyframes slide {
  from {
    transform: translateX(40px);
    opacity: 0;
  }
}
.sheet__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  padding: 20px 24px 16px;
  border-bottom: 1px solid var(--border);
}
.sheet__head h2 {
  margin: 2px 0 6px;
  font-size: 19px;
  font-family: var(--font-mono);
  letter-spacing: -0.01em;
}
.sheet__sub {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: var(--text-3);
}
.sheet__body {
  flex: 1;
  overflow-y: auto;
  padding: 18px 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.sheet__foot {
  display: flex;
  gap: 8px;
  padding: 14px 24px;
  border-top: 1px solid var(--border);
  background: var(--surface-2);
}
.spacer {
  flex: 1;
}
.total-card {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 16px 18px;
  border-radius: var(--radius);
  background: var(--surface-2);
  border: 1px solid var(--border);
}
.total-card span {
  color: var(--text-2);
  font-size: 13px;
}
.total-card strong {
  font-size: 28px;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}
.struck {
  text-decoration: line-through;
  color: var(--text-3);
}
.facts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin: 0;
}
.facts dt {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-3);
  margin-bottom: 2px;
}
.facts dd {
  margin: 0;
  font-weight: 550;
}
.facts small {
  display: block;
  font-weight: 400;
  color: var(--text-3);
  font-size: 12.5px;
}
.sec {
  margin: 6px 0 -4px;
  font-size: 12px;
  font-weight: 650;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-3);
}
.mini {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}
.mini th,
.mini td {
  padding: 8px 12px;
}
.item-name {
  font-weight: 550;
}
.mono {
  font-family: var(--font-mono);
  font-size: 11.5px;
}
.muted {
  color: var(--text-3);
}
.sums {
  margin: 0;
  font-size: 13.5px;
  align-self: flex-end;
  width: min(260px, 100%);
}
.sums div {
  display: flex;
  justify-content: space-between;
  padding: 2px 0;
}
.sums dt {
  font-weight: 400;
  color: var(--text-2);
}
.sums dd {
  margin: 0;
  font-variant-numeric: tabular-nums;
}
.sums__grand {
  border-top: 1px solid var(--border);
  margin-top: 4px;
  padding-top: 6px !important;
}
.sums__grand dt,
.sums__grand dd {
  font-weight: 700;
  color: var(--text);
}
.pays {
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.pays li {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
}
.pays li:last-child {
  border-bottom: 0;
}
.pays__main {
  flex: 1;
  display: flex;
  flex-direction: column;
  font-weight: 550;
}
.pays__main small {
  font-weight: 400;
  font-size: 12px;
}
.pays strong {
  font-variant-numeric: tabular-nums;
}
.pays .change {
  color: var(--text-2);
}
.pay-ic {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  background: var(--bg-subtle);
  color: var(--text-2);
  font-size: 13px;
}
.notes {
  margin: 0;
  white-space: pre-wrap;
  color: var(--text-2);
}
.void-copy {
  margin: 0 0 14px;
  color: var(--text-2);
  font-size: 14px;
}
@media (max-width: 560px) {
  .sheet__head,
  .sheet__body,
  .sheet__foot {
    padding-left: 16px;
    padding-right: 16px;
  }
}
</style>
