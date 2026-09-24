<template>
  <div class="ui-modal-backdrop" @mousedown.self="!busy && $emit('close')">
    <div class="ui-modal pay" role="dialog" aria-modal="true" aria-labelledby="pay-title">
      <div class="ui-modal__head">
        <div>
          <h2 id="pay-title">Take payment</h2>
          <div class="due">
            <span>Amount due</span>
            <strong>{{ money(total) }}</strong>
          </div>
        </div>
        <button class="ui-btn ui-btn--ghost ui-btn--icon ui-btn--sm" aria-label="Close" :disabled="busy" @click="$emit('close')"><i class="fa-solid fa-xmark"></i></button>
      </div>

      <div class="ui-modal__body">
        <div class="methods" role="tablist" aria-label="Payment method">
          <button v-for="m in modes" :key="m.value" type="button" class="method" :class="{ 'is-active': mode === m.value }" role="tab" :aria-selected="mode === m.value" @click="setMode(m.value)">
            <i :class="m.icon"></i>
            <span>{{ m.label }}</span>
          </button>
        </div>

        <!-- Cash -->
        <div v-if="mode === 'cash'" class="pane">
          <div class="ui-field">
            <label for="tendered">Cash received</label>
            <div class="ui-input-group big-input">
              <i class="fa-solid fa-money-bill-wave"></i>
              <input id="tendered" ref="tendered" v-model="tendered" class="ui-input" type="number" inputmode="decimal" min="0" step="0.05" @keydown.enter.prevent="submit" />
            </div>
          </div>
          <div class="quick">
            <button v-for="q in quickCash" :key="q" type="button" class="ui-btn ui-btn--sm" @click="tendered = q.toFixed(2)">{{ q === total ? 'Exact' : money(q, true) }}</button>
          </div>
          <div class="result" :class="cashShort > 0 ? 'is-short' : 'is-ok'">
            <span>{{ cashShort > 0 ? 'Still owing' : 'Change' }}</span>
            <strong>{{ money(cashShort > 0 ? cashShort : cashChange) }}</strong>
          </div>
        </div>

        <!-- Card -->
        <div v-else-if="mode === 'card'" class="pane">
          <div class="seg">
            <button type="button" :class="{ 'is-active': cardMethod === 'card' }" @click="cardMethod = 'card'">Credit / debit</button>
            <button type="button" :class="{ 'is-active': cardMethod === 'eftpos' }" @click="cardMethod = 'eftpos'">EFTPOS</button>
          </div>
          <div class="ui-field">
            <label for="card-ref">Terminal reference <span class="opt">(optional)</span></label>
            <input id="card-ref" ref="cardRef" v-model="reference" class="ui-input" maxlength="100" placeholder="e.g. last 4 digits or approval code" @keydown.enter.prevent="submit" />
          </div>
          <p class="ui-hint">Charge {{ money(total) }} on the card terminal, then confirm here once it's approved.</p>
        </div>

        <!-- Other -->
        <div v-else-if="mode === 'other'" class="pane">
          <div class="ui-field">
            <label for="other-method">Method</label>
            <select id="other-method" v-model="otherMethod" class="ui-select">
              <option value="bank_transfer">Bank transfer</option>
              <option value="voucher">Gift voucher</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div class="ui-field">
            <label for="other-ref">Reference <span class="opt">(optional)</span></label>
            <input id="other-ref" v-model="reference" class="ui-input" maxlength="100" @keydown.enter.prevent="submit" />
          </div>
        </div>

        <!-- Split -->
        <div v-else class="pane">
          <div v-for="(p, i) in splits" :key="i" class="split-row">
            <select v-model="p.method" class="ui-select" :aria-label="`Payment ${i + 1} method`">
              <option v-for="(label, key) in splitMethods" :key="key" :value="key">{{ label }}</option>
            </select>
            <input v-model="p.amount" class="ui-input" type="number" inputmode="decimal" min="0" step="0.01" :aria-label="`Payment ${i + 1} amount`" @keydown.enter.prevent="submit" />
            <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon ui-btn--sm" :disabled="splits.length <= 2" aria-label="Remove payment" @click="splits.splice(i, 1)"><i class="fa-regular fa-trash-can"></i></button>
          </div>
          <button type="button" class="ui-btn ui-btn--ghost ui-btn--sm add" @click="addSplit"><i class="fa-solid fa-plus"></i> Add payment</button>
          <div class="result" :class="splitRemaining > 0.004 ? 'is-short' : 'is-ok'">
            <span>{{ splitRemaining > 0.004 ? 'Remaining' : splitChange > 0 ? 'Change (cash)' : 'Fully paid' }}</span>
            <strong>{{ money(splitRemaining > 0.004 ? splitRemaining : splitChange) }}</strong>
          </div>
        </div>

        <div v-if="error" class="ui-alert ui-alert--danger err"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>
      </div>

      <div class="ui-modal__foot">
        <button class="ui-btn" :disabled="busy" @click="$emit('close')">Cancel</button>
        <button class="ui-btn ui-btn--primary ui-btn--lg" :disabled="busy || !valid" @click="submit">
          <i :class="busy ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-check'"></i>
          Complete sale
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { formatMoney } from '@/utils/format'

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100

export default {
  name: 'PaymentModal',
  props: {
    total: { type: Number, required: true },
    currency: { type: String, default: 'AUD' },
    busy: { type: Boolean, default: false },
    error: { type: String, default: '' }
  },
  emits: ['close', 'confirm'],
  data() {
    return {
      mode: 'cash',
      modes: [
        { value: 'cash', label: 'Cash', icon: 'fa-solid fa-money-bill-wave' },
        { value: 'card', label: 'Card', icon: 'fa-regular fa-credit-card' },
        { value: 'split', label: 'Split', icon: 'fa-solid fa-code-fork' },
        { value: 'other', label: 'Other', icon: 'fa-solid fa-ellipsis' }
      ],
      tendered: this.total.toFixed(2),
      cardMethod: 'card',
      otherMethod: 'bank_transfer',
      reference: '',
      splits: [
        { method: 'cash', amount: '' },
        { method: 'card', amount: '' }
      ],
      splitMethods: { cash: 'Cash', card: 'Card', eftpos: 'EFTPOS', bank_transfer: 'Bank transfer', voucher: 'Gift voucher', other: 'Other' }
    }
  },
  computed: {
    quickCash() {
      const t = this.total
      const set = new Set([r2(t)])
      for (const step of [5, 10, 20, 50, 100]) {
        const v = Math.ceil(t / step) * step
        if (v > t) set.add(v)
      }
      return [...set].sort((a, b) => a - b).slice(0, 5)
    },
    cashShort() {
      return Math.max(0, r2(this.total - (Number(this.tendered) || 0)))
    },
    cashChange() {
      return Math.max(0, r2((Number(this.tendered) || 0) - this.total))
    },
    splitPaid() {
      return r2(this.splits.reduce((s, p) => s + (Number(p.amount) || 0), 0))
    },
    splitRemaining() {
      return Math.max(0, r2(this.total - this.splitPaid))
    },
    splitCash() {
      return r2(this.splits.filter((p) => p.method === 'cash').reduce((s, p) => s + (Number(p.amount) || 0), 0))
    },
    splitChange() {
      return Math.max(0, r2(this.splitPaid - this.total))
    },
    valid() {
      if (this.mode === 'cash') return this.cashShort <= 0
      if (this.mode === 'split') return this.splitRemaining <= 0.004 && this.splitChange <= this.splitCash + 0.004 && this.splits.some((p) => Number(p.amount) > 0)
      return true
    }
  },
  mounted() {
    this.focusMode()
    document.addEventListener('keydown', this.onKey)
  },
  beforeUnmount() {
    document.removeEventListener('keydown', this.onKey)
  },
  methods: {
    money(v, compact) {
      return formatMoney(v, this.currency, { compact: compact && Number.isInteger(v) })
    },
    onKey(e) {
      if (e.key === 'Escape' && !this.busy) this.$emit('close')
    },
    setMode(m) {
      this.mode = m
      this.reference = ''
      if (m === 'split' && !this.splits.some((p) => Number(p.amount) > 0)) {
        this.splits[0].amount = ''
        this.splits[1].amount = this.total.toFixed(2)
      }
      this.focusMode()
    },
    focusMode() {
      this.$nextTick(() => {
        const el = this.mode === 'cash' ? this.$refs.tendered : this.mode === 'card' ? this.$refs.cardRef : null
        if (el) {
          el.focus()
          el.select?.()
        }
      })
    },
    addSplit() {
      this.splits.push({ method: 'other', amount: this.splitRemaining > 0 ? this.splitRemaining.toFixed(2) : '' })
    },
    submit() {
      if (!this.valid || this.busy) return
      let payments
      if (this.mode === 'cash') payments = [{ method: 'cash', amount: r2(this.tendered) }]
      else if (this.mode === 'card') payments = [{ method: this.cardMethod, amount: r2(this.total), reference: this.reference }]
      else if (this.mode === 'other') payments = [{ method: this.otherMethod, amount: r2(this.total), reference: this.reference }]
      else payments = this.splits.filter((p) => Number(p.amount) > 0).map((p) => ({ method: p.method, amount: r2(p.amount) }))
      this.$emit('confirm', payments)
    }
  }
}
</script>

<style scoped>
.pay {
  max-width: 480px;
}
.due {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-top: 6px;
  color: var(--text-2);
  font-size: 13px;
}
.due strong {
  font-size: 28px;
  letter-spacing: -0.02em;
  color: var(--text);
  font-variant-numeric: tabular-nums;
}
.methods {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}
.method {
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
  font-size: 13px;
  font-weight: 550;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, color 0.15s;
}
.method i {
  font-size: 18px;
}
.method:hover {
  border-color: var(--border-strong);
  background: var(--surface-hover);
}
.method.is-active {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-ring);
}
.pane {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.big-input .ui-input {
  font-size: 22px;
  height: 52px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.quick {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.quick .ui-btn {
  flex: 1;
  min-width: 64px;
  font-variant-numeric: tabular-nums;
}
.result {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  border-radius: var(--radius);
  font-size: 14px;
}
.result strong {
  font-size: 20px;
  font-variant-numeric: tabular-nums;
}
.result.is-ok {
  background: var(--success-soft);
}
.result.is-ok strong {
  color: var(--success);
}
.result.is-short {
  background: var(--warning-soft);
}
.result.is-short strong {
  color: var(--warning);
}
.seg {
  display: flex;
  padding: 3px;
  gap: 3px;
  border-radius: var(--radius-sm);
  background: var(--bg-subtle);
}
.seg button {
  flex: 1;
  border: 0;
  padding: 7px 10px;
  border-radius: 6px;
  background: transparent;
  color: var(--text-2);
  font: inherit;
  font-size: 13px;
  font-weight: 550;
  cursor: pointer;
}
.seg button.is-active {
  background: var(--surface);
  color: var(--text);
  box-shadow: var(--shadow-xs);
}
.opt {
  font-weight: 400;
  color: var(--text-3);
}
.split-row {
  display: grid;
  grid-template-columns: 1fr 130px auto;
  gap: 8px;
  align-items: center;
}
.split-row .ui-input {
  font-variant-numeric: tabular-nums;
}
.add {
  align-self: flex-start;
}
.err {
  margin-top: 14px;
}
.ui-btn--lg {
  height: 44px;
  padding: 0 20px;
  font-size: 15px;
}
@media (max-width: 480px) {
  .methods {
    grid-template-columns: repeat(2, 1fr);
  }
  .split-row {
    grid-template-columns: 1fr 100px auto;
  }
}
</style>
