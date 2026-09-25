<template>
  <div class="ui-page ui-page--wide">
    <header class="ui-page-head no-print">
      <div>
        <div class="ui-eyebrow">Finance</div>
        <h1>Accounting</h1>
        <p>Your chart of accounts, journals and financial statements — kept in balance automatically.</p>
      </div>
      <div class="ui-actions">
        <router-link to="/banking" class="ui-btn"><i class="fa-solid fa-building-columns"></i> Banking</router-link>
        <button class="ui-btn ui-btn--primary" @click="newJournal"><i class="fa-solid fa-plus"></i> Journal entry</button>
      </div>
    </header>

    <div v-if="summaryError" class="ui-alert ui-alert--danger no-print" style="margin-bottom: 16px">
      <i class="fa-solid fa-circle-exclamation"></i><span>{{ summaryError }} <a href="#" @click.prevent="loadSummary">Try again</a></span>
    </div>

    <div class="ui-kpis no-print">
      <router-link to="/banking" class="ui-kpi kpi-link">
        <div class="ui-kpi__label"><span class="ui-kpi__icon"><i class="fa-solid fa-building-columns"></i></span>Cash in bank</div>
        <div class="ui-kpi__value"><span v-if="!s" class="ui-skeleton sk"></span><template v-else>{{ money(s.cash_in_bank) }}</template></div>
        <div class="ui-kpi__meta">{{ s ? `${s.bank_accounts} active account${s.bank_accounts === 1 ? '' : 's'}` : '…' }}</div>
      </router-link>
      <router-link to="/invoices?status=unpaid" class="ui-kpi kpi-link">
        <div class="ui-kpi__label"><span class="ui-kpi__icon k-info"><i class="fa-solid fa-hand-holding-dollar"></i></span>Receivables</div>
        <div class="ui-kpi__value"><span v-if="!arLoaded" class="ui-skeleton sk"></span><template v-else-if="ar">{{ money(ar.outstanding) }}</template><template v-else>—</template></div>
        <div class="ui-kpi__meta">
          <template v-if="ar && ar.overdue > 0"><span class="txt-danger">{{ money(ar.overdue) }} overdue</span></template>
          <template v-else-if="ar">Nothing overdue</template>
          <template v-else-if="arLoaded">Invoicing unavailable</template>
          <template v-else>…</template>
        </div>
      </router-link>
      <router-link to="/bills" class="ui-kpi kpi-link">
        <div class="ui-kpi__label"><span class="ui-kpi__icon k-warning"><i class="fa-solid fa-file-invoice"></i></span>Payables</div>
        <div class="ui-kpi__value"><span v-if="!s" class="ui-skeleton sk"></span><template v-else>{{ money(s.payables_outstanding) }}</template></div>
        <div class="ui-kpi__meta">
          <template v-if="s && s.payables_overdue > 0"><span class="txt-danger">{{ money(s.payables_overdue) }} overdue</span></template>
          <template v-else-if="s">{{ s.open_bills }} open bill{{ s.open_bills === 1 ? '' : 's' }}</template>
          <template v-else>…</template>
        </div>
      </router-link>
      <router-link :to="pnlLink" class="ui-kpi kpi-link" data-testid="finance-business-pnl">
        <div class="ui-kpi__label"><span class="ui-kpi__icon" :class="pnl && pnl.totals.net_profit < 0 ? 'k-danger' : 'k-success'"><i class="fa-solid fa-chart-line"></i></span>Business net profit · {{ monthName }}</div>
        <div class="ui-kpi__value" :class="{ 'txt-danger': pnl && pnl.totals.net_profit < 0 }">
          <span v-if="!pnlLoaded" class="ui-skeleton sk"></span><template v-else-if="pnl">{{ pnlMoney(pnl.totals.net_profit) }}</template><template v-else>—</template>
        </div>
        <div class="ui-kpi__meta">
          <template v-if="pnl">{{ pnlMoney(pnl.totals.revenue) }} revenue − {{ pnlMoney(pnl.totals.total_expenses) }} expenses ({{ basisName }})</template>
          <template v-else-if="pnlLoaded">Profit &amp; loss unavailable</template>
          <template v-else>…</template>
          <span v-if="s" class="ledger" title="From posted journals only — see Reports → Ledger P&L">Ledger net profit {{ money(s.net_profit_this_month) }}</span>
        </div>
      </router-link>
    </div>

    <div v-if="attention.length" class="attention no-print">
      <component :is="a.to ? 'router-link' : 'button'" v-for="a in attention" :key="a.key" :to="a.to" class="chip" :class="a.tone" @click="a.action && a.action()">
        <i :class="a.icon"></i> {{ a.text }} <i class="fa-solid fa-chevron-right arrow"></i>
      </component>
    </div>

    <section class="ui-card">
      <div class="card-tabs no-print" role="tablist" aria-label="Accounting sections">
        <button v-for="t in tabs" :key="t.value" class="card-tab" :class="{ 'is-active': tab === t.value }" role="tab" :aria-selected="tab === t.value" @click="setTab(t.value)">
          <i :class="t.icon"></i> {{ t.label }}
        </button>
      </div>

      <div v-if="accountsError && tab !== 'reports'" class="ui-card__body">
        <div class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ accountsError }} <a href="#" @click.prevent="loadAccounts">Try again</a></span></div>
      </div>
      <AccountsTab v-else-if="tab === 'accounts'" :accounts="accounts" :loading="accountsLoading" :currency="currency" @changed="refreshAll" @ledger="openLedger" />
      <JournalsTab v-else-if="tab === 'journals'" ref="journals" :accounts="accounts" :currency="currency" @changed="refreshAll" />
      <ReportsTab v-else :currency="currency" :org-name="orgName" @ledger="openLedgerById" />
    </section>

    <LedgerModal v-if="ledgerAccount" :account="ledgerAccount" :currency="currency" @close="ledgerAccount = null" />
  </div>
</template>

<script>
import { orgCurrency } from '@/utils/orgDefaults'
import AccountsTab from '@/components/finance/AccountsTab.vue'
import JournalsTab from '@/components/finance/JournalsTab.vue'
import ReportsTab from '@/components/finance/ReportsTab.vue'
import LedgerModal from '@/components/finance/LedgerModal.vue'
import { financeApi } from '@/services/finance'
import { invoicingApi } from '@/services/invoicing'
import { apiErrorMessage } from '@/services/api'
import { formatMoney } from '@/utils/format'
import { useAuthStore } from '@/stores/auth'
import { fetchPnl, loadBasis, pnlMoney, BASIS_LABEL } from '@/services/pnl'

const TABS = ['accounts', 'journals', 'reports']

export default {
  name: 'Finance',
  components: { AccountsTab, JournalsTab, ReportsTab, LedgerModal },
  data() {
    return {
      tab: TABS.includes(this.$route.query.tab) ? this.$route.query.tab : 'accounts',
      s: null,
      summaryError: '',
      ar: null,
      arLoaded: false,
      accounts: [],
      accountsLoading: false,
      accountsError: '',
      ledgerAccount: null,
      pnl: null,
      pnlLoaded: false,
      basis: loadBasis()
    }
  },
  computed: {
    tabs() {
      return [
        { value: 'accounts', label: 'Chart of accounts', icon: 'fa-solid fa-list-ol' },
        { value: 'journals', label: 'Journal entries', icon: 'fa-solid fa-book-open' },
        { value: 'reports', label: 'Reports', icon: 'fa-solid fa-chart-pie' }
      ]
    },
    currency() {
      return this.ar?.currency || orgCurrency()
    },
    basisName() {
      return BASIS_LABEL[this.basis].toLowerCase() + ' basis'
    },
    pnlLink() {
      return { path: '/reports/profit-loss', query: { range: 'this_month', basis: this.basis } }
    },
    monthName() {
      return new Intl.DateTimeFormat(undefined, { month: 'long' }).format(new Date())
    },
    orgName() {
      const u = useAuthStore().user || {}
      return u.organization?.name || u.organization_name || ''
    },
    attention() {
      const s = this.s
      if (!s) return []
      const out = []
      if (!s.ledger_balanced) out.push({ key: 'tb', tone: 'danger', icon: 'fa-solid fa-scale-unbalanced', text: 'Ledger is out of balance', action: () => this.setTab('reports') })
      if (s.draft_journals) out.push({ key: 'dj', tone: 'info', icon: 'fa-solid fa-pen-ruler', text: `${s.draft_journals} draft journal${s.draft_journals === 1 ? '' : 's'} to post`, action: () => this.setTab('journals') })
      if (s.uncategorised_transactions)
        out.push({ key: 'uc', tone: 'warning', icon: 'fa-solid fa-tags', text: `${s.uncategorised_transactions} bank transaction${s.uncategorised_transactions === 1 ? '' : 's'} to categorise`, to: '/banking?status=uncategorised' })
      if (s.overdue_count) out.push({ key: 'ob', tone: 'danger', icon: 'fa-solid fa-triangle-exclamation', text: `${s.overdue_count} overdue bill${s.overdue_count === 1 ? '' : 's'}`, to: '/bills?status=overdue' })
      return out
    }
  },
  watch: {
    '$route.query.tab'(t) {
      if (TABS.includes(t)) this.tab = t
    }
  },
  created() {
    this.loadSummary()
    this.loadAccounts()
    this.loadReceivables()
    this.loadPnl()
  },
  methods: {
    money(v) {
      return formatMoney(v, this.currency)
    },
    setTab(t) {
      this.tab = t
      this.$router.replace({ query: { ...this.$route.query, tab: t } })
    },
    async loadSummary() {
      this.summaryError = ''
      try {
        this.s = await financeApi.summary()
      } catch (e) {
        this.summaryError = apiErrorMessage(e, 'Could not load the finance summary')
      }
    },
    pnlMoney(v) {
      return pnlMoney(v, this.pnl?.currency)
    },
    // Business P&L for this month — the same calculation as the dashboard.
    async loadPnl() {
      try {
        this.pnl = await fetchPnl({ range: 'this_month', basis: this.basis, compare: false, series: false })
      } catch {
        this.pnl = null
      } finally {
        this.pnlLoaded = true
      }
    },
    async loadReceivables() {
      try {
        this.ar = await invoicingApi.stats()
      } catch {
        this.ar = null
      } finally {
        this.arLoaded = true
      }
    },
    async loadAccounts() {
      this.accountsLoading = true
      this.accountsError = ''
      try {
        this.accounts = (await financeApi.accounts()) || []
      } catch (e) {
        this.accountsError = apiErrorMessage(e, 'Could not load the chart of accounts')
      } finally {
        this.accountsLoading = false
      }
    },
    refreshAll() {
      this.loadAccounts()
      this.loadSummary()
      this.loadPnl()
    },
    newJournal() {
      if (this.tab !== 'journals') this.setTab('journals')
      this.$nextTick(() => this.$refs.journals?.open(null))
    },
    openLedger(a) {
      this.ledgerAccount = a
    },
    openLedgerById(id) {
      const a = this.accounts.find((x) => x.id === id)
      if (a) this.ledgerAccount = a
    }
  }
}
</script>

<style scoped>
.kpi-link {
  color: inherit;
  text-decoration: none;
  text-align: left;
  font: inherit;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.kpi-link:hover {
  border-color: var(--border-strong);
  box-shadow: var(--shadow);
}
.ledger {
  display: block;
  margin-top: 2px;
  color: var(--text-3);
  font-size: 11.5px;
}
.sk {
  display: inline-block;
  width: 120px;
  height: 26px;
}
.k-info {
  background: var(--info-soft);
  color: var(--info);
}
.k-warning {
  background: var(--warning-soft);
  color: var(--warning);
}
.k-success {
  background: var(--success-soft);
  color: var(--success);
}
.k-danger {
  background: var(--danger-soft);
  color: var(--danger);
}
.txt-danger {
  color: var(--danger);
}
.attention {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin: -8px 0 20px;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 32px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  font: inherit;
  font-size: 13px;
  font-weight: 550;
  cursor: pointer;
  text-decoration: none;
}
.chip:hover {
  border-color: var(--border-strong);
}
.chip > i:first-child {
  font-size: 12px;
}
.chip.info > i:first-child {
  color: var(--info);
}
.chip.warning > i:first-child {
  color: var(--warning);
}
.chip.danger > i:first-child {
  color: var(--danger);
}
.chip .arrow {
  font-size: 9px;
  color: var(--text-3);
}
.card-tabs {
  display: flex;
  gap: 4px;
  padding: 0 12px;
  border-bottom: 1px solid var(--border);
  overflow-x: auto;
}
.card-tab {
  border: 0;
  background: none;
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-3);
  padding: 14px 12px 12px;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  cursor: pointer;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.card-tab:hover {
  color: var(--text);
}
.card-tab.is-active {
  color: var(--accent);
  border-bottom-color: var(--accent);
}
.card-tab i {
  font-size: 13px;
}
@media print {
  .no-print {
    display: none !important;
  }
  .ui-card {
    border: 0;
    box-shadow: none;
  }
}
@media (max-width: 700px) {
  .ui-kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }
  .ui-kpi {
    padding: 14px;
  }
  .ui-kpi__value {
    font-size: 19px;
  }
  .ui-kpi__meta {
    font-size: 11.5px;
  }
  .card-tab {
    padding: 12px 8px 10px;
    font-size: 13.5px;
  }
  .card-tab i {
    display: none;
  }
}
</style>
