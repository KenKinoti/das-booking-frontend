<template>
  <div id="bankroll" class="fbbk" data-test="fb-bankroll">
    <dl class="fbbk__kv">
      <div><dt>Balance</dt><dd class="fb-num" data-test="fb-bk-balance">{{ money(b.balance, currency) }}</dd></div>
      <div><dt>Available</dt><dd class="fb-num" title="Balance minus stakes on open bets">{{ money(b.available, currency) }}</dd></div>
      <div><dt>Start + deposits</dt><dd class="fb-num">{{ money((b.start || 0) + (b.deposits || 0), currency) }}</dd></div>
      <div><dt>Withdrawals</dt><dd class="fb-num">{{ money(b.withdrawals || 0, currency) }}</dd></div>
    </dl>
    <form class="fbbk__form" novalidate @submit.prevent="add">
      <select v-model="kind" class="ui-select" aria-label="Kind">
        <option value="start">Starting bankroll</option>
        <option value="deposit">Deposit</option>
        <option value="withdrawal">Withdrawal</option>
      </select>
      <input v-model="amount" class="ui-input" inputmode="decimal" :placeholder="'Amount (' + currency + ')'" aria-label="Amount" data-test="fb-bk-amount" />
      <input v-model.trim="note" class="ui-input" placeholder="Note (optional)" aria-label="Note" maxlength="200" />
      <button type="submit" class="ui-btn" :disabled="saving" data-test="fb-bk-add"><i class="fa-solid fa-plus"></i> Add</button>
    </form>
    <details class="fbbk__list">
      <summary>Deposits &amp; withdrawals ({{ entries.length }})</summary>
      <ul>
        <li v-for="e in entries" :key="e.id">
          <span class="fb-pill">{{ { start: 'Start', deposit: 'Deposit', withdrawal: 'Withdrawal' }[e.kind] || e.kind }}</span>
          <span class="fb-num">{{ money(e.amount, e.currency || currency) }}</span>
          <span class="fb-muted fb-small">{{ fmtDateTime(e.at, tz) }}<template v-if="e.note"> · {{ e.note }}</template></span>
          <button type="button" class="fb-linkbtn" :aria-label="'Delete ' + e.kind" @click="remove(e)"><i class="fa-regular fa-trash-can"></i></button>
        </li>
      </ul>
    </details>
  </div>
</template>

<script>
import { footballApi } from '@/services/football'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'
import { money, fmtDateTime } from '../fb'

export default {
  name: 'BankrollPanel',
  props: {
    b: { type: Object, default: () => ({}) },
    entries: { type: Array, default: () => [] },
    currency: { type: String, default: 'KES' },
    tz: { type: String, default: 'Africa/Nairobi' }
  },
  emits: ['changed'],
  data() {
    return { kind: this.entries.length ? 'deposit' : 'start', amount: '', note: '', saving: false }
  },
  methods: {
    money,
    fmtDateTime,
    async add() {
      const v = Number(String(this.amount).replace(/,/g, ''))
      if (!(v > 0)) {
        toast.error('Enter an amount above 0')
        return
      }
      this.saving = true
      try {
        await footballApi.addBankroll({ kind: this.kind, amount: v, note: this.note })
        this.amount = ''
        this.note = ''
        this.kind = 'deposit'
        this.$emit('changed')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not save'))
      } finally {
        this.saving = false
      }
    },
    async remove(e) {
      if (!(await confirmDialog({ title: 'Delete this entry?', message: `${e.kind} of ${money(e.amount, this.currency)}`, confirmText: 'Delete', danger: true }))) return
      try {
        await footballApi.deleteBankroll(e.id)
        this.$emit('changed')
      } catch (err) {
        toast.error(apiErrorMessage(err, 'Could not delete'))
      }
    }
  }
}
</script>

<style scoped>
.fbbk {
  scroll-margin-top: calc(var(--topbar-h, 64px) + 16px);
}
.fbbk__kv {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 10px;
  margin: 0 0 12px;
}
.fbbk__kv dt {
  font-size: 11.5px;
  color: var(--text-3);
  font-weight: 600;
}
.fbbk__kv dd {
  margin: 0;
  font-weight: 650;
  font-size: 15px;
}
.fbbk__form {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.fbbk__form > * {
  flex: 1 1 140px;
  min-width: 0;
}
.fbbk__form > button {
  flex: 0 0 auto;
}
.fbbk__list {
  margin-top: 10px;
  font-size: 13px;
}
.fbbk__list summary {
  cursor: pointer;
  color: var(--text-2);
  font-weight: 600;
}
.fbbk__list ul {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 6px;
}
.fbbk__list li {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
  align-items: center;
}
@media (max-width: 700px) {
  .fbbk__kv {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
