<template>
  <div class="ui-modal-backdrop" @mousedown.self="$emit('close')">
    <div class="ui-modal receipt-modal" role="dialog" aria-modal="true" aria-labelledby="receipt-title">
      <div class="ui-modal__head">
        <h2 id="receipt-title">{{ afterSale ? 'Sale complete' : 'Receipt' }}</h2>
        <button class="ui-btn ui-btn--ghost ui-btn--icon ui-btn--sm" aria-label="Close" @click="$emit('close')"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="ui-modal__body">
        <div v-if="afterSale" class="done">
          <span class="done__icon"><i class="fa-solid fa-check"></i></span>
          <div>
            <div class="done__label">{{ transaction.change_amount > 0 ? 'Change due' : 'Paid' }}</div>
            <div class="done__value">{{ money(transaction.change_amount > 0 ? transaction.change_amount : transaction.total_amount) }}</div>
          </div>
        </div>
        <div class="paper">
          <PosReceipt :transaction="transaction" :organization="organization" :currency="currency" />
        </div>
      </div>
      <div class="ui-modal__foot">
        <button class="ui-btn" @click="print"><i class="fa-solid fa-print"></i> Print</button>
        <button v-if="afterSale" ref="primary" class="ui-btn ui-btn--primary" @click="$emit('new-sale')"><i class="fa-solid fa-plus"></i> New sale</button>
        <button v-else ref="primary" class="ui-btn ui-btn--primary" @click="$emit('close')">Done</button>
      </div>
    </div>

    <Teleport to="body">
      <div class="pos-print-root" aria-hidden="true">
        <PosReceipt :transaction="transaction" :organization="organization" :currency="currency" />
      </div>
    </Teleport>
  </div>
</template>

<script>
import { orgCurrency } from '@/utils/orgDefaults'
import PosReceipt from './PosReceipt.vue'
import { formatMoney } from '@/utils/format'

export default {
  name: 'ReceiptModal',
  components: { PosReceipt },
  props: {
    transaction: { type: Object, required: true },
    organization: { type: Object, default: null },
    currency: { type: String, default: () => orgCurrency() },
    afterSale: { type: Boolean, default: false }
  },
  emits: ['close', 'new-sale'],
  mounted() {
    this.$nextTick(() => this.$refs.primary?.focus())
    document.addEventListener('keydown', this.onKey)
  },
  beforeUnmount() {
    document.removeEventListener('keydown', this.onKey)
    document.body.classList.remove('pos-printing')
  },
  methods: {
    money(v) {
      return formatMoney(v, this.transaction?.currency || this.currency)
    },
    onKey(e) {
      if (e.key === 'Escape') this.$emit('close')
    },
    print() {
      document.body.classList.add('pos-printing')
      const done = () => {
        document.body.classList.remove('pos-printing')
        window.removeEventListener('afterprint', done)
      }
      window.addEventListener('afterprint', done)
      window.print()
      setTimeout(done, 1500)
    }
  }
}
</script>

<style scoped>
.receipt-modal {
  max-width: 420px;
}
.done {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  margin-bottom: 14px;
  border-radius: var(--radius);
  background: var(--success-soft);
}
.done__icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--success);
  color: var(--surface);
  font-size: 18px;
  flex-shrink: 0;
}
.done__label {
  font-size: 12.5px;
  color: var(--text-2);
}
.done__value {
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}
.paper {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface-2);
  padding: 16px 18px;
  max-height: 46vh;
  overflow: auto;
}
</style>

<style>
.pos-print-root {
  display: none;
}
@media print {
  body.pos-printing > *:not(.pos-print-root) {
    display: none !important;
  }
  body.pos-printing {
    background: #fff !important;
  }
  body.pos-printing .pos-print-root {
    display: block !important;
    width: 72mm;
    margin: 0 auto;
    padding: 4mm 0;
    --text: #000;
    --text-2: #222;
    --text-3: #555;
    --border-strong: #888;
    --danger: #000;
    color: #000;
    background: #fff;
  }
}
</style>
