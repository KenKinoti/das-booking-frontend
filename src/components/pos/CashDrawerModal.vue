<template>
  <div class="ui-modal-backdrop" @mousedown.self="!busy && $emit('close')">
    <div class="ui-modal" style="max-width: 480px" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
      <div class="ui-modal__head">
        <div>
          <h2 id="drawer-title">{{ drawer ? 'Close cash drawer' : 'Open cash drawer' }}</h2>
          <p class="sub">{{ drawer ? `Opened ${dateTime(drawer.opened_at)}${opener ? ' by ' + opener : ''}` : 'Count the float you are starting the shift with.' }}</p>
        </div>
        <button class="ui-btn ui-btn--ghost ui-btn--icon ui-btn--sm" aria-label="Close" :disabled="busy" @click="$emit('close')"><i class="fa-solid fa-xmark"></i></button>
      </div>

      <form class="ui-modal__body" @submit.prevent="submit">
        <template v-if="!drawer">
          <div class="ui-field">
            <label for="float">Opening float</label>
            <div class="ui-input-group">
              <i class="fa-solid fa-coins"></i>
              <input id="float" ref="amount" v-model="amount" class="ui-input big" type="number" inputmode="decimal" min="0" step="0.05" required />
            </div>
          </div>
        </template>

        <template v-else>
          <dl class="summary">
            <div><dt>Opening float</dt><dd>{{ money(drawer.opening_amount) }}</dd></div>
            <div><dt>Cash received <small>({{ drawer.sales_count || 0 }} sale{{ drawer.sales_count === 1 ? '' : 's' }})</small></dt><dd>+ {{ money(drawer.cash_sales) }}</dd></div>
            <div><dt>Change given</dt><dd>− {{ money(drawer.cash_change) }}</dd></div>
            <div class="summary__total"><dt>Expected in drawer</dt><dd>{{ money(drawer.expected_amount) }}</dd></div>
          </dl>
          <div class="ui-field">
            <label for="counted">Counted cash</label>
            <div class="ui-input-group">
              <i class="fa-solid fa-calculator"></i>
              <input id="counted" ref="amount" v-model="amount" class="ui-input big" type="number" inputmode="decimal" min="0" step="0.05" required placeholder="0.00" />
            </div>
          </div>
          <div v-if="amount !== ''" class="variance" :class="varianceClass">
            <span>{{ variance === 0 ? 'Balanced' : variance > 0 ? 'Over' : 'Short' }}</span>
            <strong>{{ variance > 0 ? '+' : '' }}{{ money(variance) }}</strong>
          </div>
        </template>

        <div class="ui-field" style="margin-top: 14px">
          <label for="drawer-notes">Notes <span class="opt">(optional)</span></label>
          <textarea id="drawer-notes" v-model="notes" class="ui-textarea" rows="2" maxlength="500"></textarea>
        </div>
        <button type="submit" hidden></button>
      </form>

      <div class="ui-modal__foot">
        <button class="ui-btn" :disabled="busy" @click="$emit('close')">Cancel</button>
        <button class="ui-btn" :class="drawer ? 'ui-btn--danger' : 'ui-btn--primary'" :disabled="busy || !validAmount" @click="submit">
          <i :class="busy ? 'fa-solid fa-circle-notch spin' : drawer ? 'fa-solid fa-lock' : 'fa-solid fa-cash-register'"></i>
          {{ drawer ? 'Close drawer' : 'Open drawer' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { formatMoney, formatDateTime } from '@/utils/format'
import { personName } from '@/services/posService'

export default {
  name: 'CashDrawerModal',
  props: {
    drawer: { type: Object, default: null }, // the currently open drawer (close mode) or null (open mode)
    currency: { type: String, default: 'AUD' },
    busy: { type: Boolean, default: false }
  },
  emits: ['close', 'open', 'close-drawer'],
  data() {
    return { amount: this.drawer ? '' : '200.00', notes: '' }
  },
  computed: {
    opener() {
      return personName(this.drawer?.opened_by_user)
    },
    validAmount() {
      return this.amount !== '' && Number(this.amount) >= 0
    },
    variance() {
      return Math.round(((Number(this.amount) || 0) - (this.drawer?.expected_amount || 0)) * 100) / 100
    },
    varianceClass() {
      if (this.variance === 0) return 'is-ok'
      return Math.abs(this.variance) < 5 ? 'is-warn' : 'is-bad'
    }
  },
  mounted() {
    this.$nextTick(() => {
      this.$refs.amount?.focus()
      this.$refs.amount?.select()
    })
  },
  methods: {
    money(v) {
      return formatMoney(v, this.currency)
    },
    dateTime: formatDateTime,
    submit() {
      if (!this.validAmount || this.busy) return
      const amount = Math.round(Number(this.amount) * 100) / 100
      if (this.drawer) this.$emit('close-drawer', { closing_amount: amount, notes: this.notes })
      else this.$emit('open', { opening_amount: amount, notes: this.notes })
    }
  }
}
</script>

<style scoped>
.sub {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--text-3);
}
.big {
  font-size: 20px;
  height: 48px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.summary {
  margin: 0 0 16px;
  padding: 12px 14px;
  border-radius: var(--radius);
  background: var(--surface-2);
  border: 1px solid var(--border);
  font-size: 13.5px;
}
.summary div {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
}
.summary dt {
  font-weight: 400;
  color: var(--text-2);
}
.summary dt small {
  color: var(--text-3);
}
.summary dd {
  margin: 0;
  font-variant-numeric: tabular-nums;
}
.summary__total {
  margin-top: 4px;
  padding-top: 8px !important;
  border-top: 1px solid var(--border);
}
.summary__total dt,
.summary__total dd {
  font-weight: 650;
  color: var(--text);
}
.variance {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
  padding: 10px 14px;
  border-radius: var(--radius);
  font-size: 14px;
}
.variance strong {
  font-size: 18px;
  font-variant-numeric: tabular-nums;
}
.variance.is-ok {
  background: var(--success-soft);
  color: var(--success);
}
.variance.is-warn {
  background: var(--warning-soft);
  color: var(--warning);
}
.variance.is-bad {
  background: var(--danger-soft);
  color: var(--danger);
}
.opt {
  font-weight: 400;
  color: var(--text-3);
}
</style>
