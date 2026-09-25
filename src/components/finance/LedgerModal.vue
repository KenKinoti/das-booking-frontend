<template>
  <div class="ui-modal-backdrop" @mousedown.self="$emit('close')">
    <div class="ui-modal" style="max-width: 820px" role="dialog" aria-modal="true" aria-labelledby="ledger-title">
      <div class="ui-modal__head">
        <div>
          <div class="ui-eyebrow">{{ account.account_type }} · {{ account.code }}</div>
          <h2 id="ledger-title">{{ account.name }}</h2>
        </div>
        <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="$emit('close')"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="ui-modal__body">
        <div class="stats">
          <div><span>Balance</span><strong>{{ money(account.balance) }}</strong></div>
          <div><span>Total debits</span><strong>{{ money(totals.dr) }}</strong></div>
          <div><span>Total credits</span><strong>{{ money(totals.cr) }}</strong></div>
        </div>
        <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>
        <div v-else-if="loading" class="sk"><div v-for="n in 5" :key="n" class="ui-skeleton" style="margin: 12px 0"></div></div>
        <div v-else-if="!rows.length" class="ui-empty compact">
          <div class="ui-empty__icon"><i class="fa-solid fa-book"></i></div>
          <h3>No posted activity</h3>
          <p>Posted journal entries, bills, payments and bank transactions coded to this account will show here.</p>
        </div>
        <div v-else class="ui-table-wrap">
          <table class="ui-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Entry</th>
                <th>Description</th>
                <th class="num">Debit</th>
                <th class="num">Credit</th>
                <th class="num hide-sm">Balance</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in rows" :key="r.id">
                <td class="nowrap">{{ date(r.transaction_date) }}</td>
                <td class="mono">{{ r.journal_entry?.entry_number || '—' }}</td>
                <td>{{ r.description }}<small v-if="r.reference" class="muted"> · {{ r.reference }}</small></td>
                <td class="num">{{ r.debit_amount ? money(r.debit_amount) : '' }}</td>
                <td class="num">{{ r.credit_amount ? money(r.credit_amount) : '' }}</td>
                <td class="num hide-sm muted">{{ money(r.running) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { orgCurrency } from '@/utils/orgDefaults'
import { financeApi } from '@/services/finance'
import { apiErrorMessage } from '@/services/api'
import { formatMoney, formatDate } from '@/utils/format'

export default {
  name: 'LedgerModal',
  props: {
    account: { type: Object, required: true },
    currency: { type: String, default: () => orgCurrency() }
  },
  emits: ['close'],
  data() {
    return { rows: [], loading: true, error: '' }
  },
  computed: {
    totals() {
      return {
        dr: this.rows.reduce((s, r) => s + Math.round(r.debit_amount * 100), 0) / 100,
        cr: this.rows.reduce((s, r) => s + Math.round(r.credit_amount * 100), 0) / 100
      }
    }
  },
  async created() {
    try {
      const list = (await financeApi.generalLedger({ account_id: this.account.id })) || []
      const debitNormal = ['Asset', 'Expense'].includes(this.account.account_type)
      // compute running balance oldest → newest in the account's normal direction
      let run = 0
      const asc = [...list].reverse()
      asc.forEach((r) => {
        const d = Math.round((r.debit_amount || 0) * 100)
        const c = Math.round((r.credit_amount || 0) * 100)
        run += debitNormal ? d - c : c - d
        r.running = run / 100
      })
      this.rows = list
    } catch (e) {
      this.error = apiErrorMessage(e, 'Could not load ledger')
    } finally {
      this.loading = false
    }
  },
  methods: {
    money(v) {
      return formatMoney(v, this.currency)
    },
    date: formatDate
  }
}
</script>

<style scoped>
.stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}
.stats div {
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 10px 14px;
}
.stats span {
  display: block;
  font-size: 12px;
  color: var(--text-3);
}
.stats strong {
  font-size: 17px;
  font-variant-numeric: tabular-nums;
}
.mono {
  font-family: var(--font-mono);
  font-size: 12.5px;
}
.nowrap {
  white-space: nowrap;
}
.muted {
  color: var(--text-3);
}
.compact {
  padding: 32px 16px;
}
@media (max-width: 700px) {
  .hide-sm {
    display: none;
  }
  .stats {
    grid-template-columns: 1fr;
  }
}
</style>
