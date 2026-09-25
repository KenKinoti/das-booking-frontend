<template>
  <div class="ui-page ui-page--wide">
    <header class="ui-page-head">
      <div>
        <div class="ui-eyebrow">Finance</div>
        <h1>Banking</h1>
        <p>Bank accounts, cards and cash — categorise and reconcile every transaction.</p>
      </div>
      <div class="ui-actions">
        <button class="ui-btn" @click="accountModal = { account: null }"><i class="fa-solid fa-building-columns"></i> Add account</button>
        <button class="ui-btn ui-btn--primary" :disabled="!activeBanks.length" @click="txnModal = true"><i class="fa-solid fa-plus"></i> Add transaction</button>
      </div>
    </header>

    <div v-if="banksError" class="ui-alert ui-alert--danger" style="margin-bottom: 16px">
      <i class="fa-solid fa-circle-exclamation"></i><span>{{ banksError }} <a href="#" @click.prevent="loadBanks">Try again</a></span>
    </div>

    <!-- Accounts -->
    <div v-if="banksLoading && !banks.length" class="cards">
      <div v-for="n in 3" :key="n" class="bank-card sk-card">
        <div class="ui-skeleton" style="width: 60%"></div>
        <div class="ui-skeleton" style="width: 40%; margin-top: 10px"></div>
        <div class="ui-skeleton" style="width: 50%; height: 26px; margin-top: 26px"></div>
      </div>
    </div>

    <section v-else-if="!banks.length && !banksError" class="ui-card">
      <div class="ui-empty">
        <div class="ui-empty__icon"><i class="fa-solid fa-building-columns"></i></div>
        <h3>Connect your first account</h3>
        <p>Add your business bank account, credit card or petty cash with its opening balance to start tracking transactions.</p>
        <button class="ui-btn ui-btn--primary" style="margin-top: 12px" @click="accountModal = { account: null }"><i class="fa-solid fa-plus"></i> Add bank account</button>
      </div>
    </section>

    <template v-else>
      <div class="totals-bar">
        <div>
          <span>Cash available</span><strong>{{ money(totals.cash) }}</strong>
        </div>
        <div v-if="totals.cards">
          <span>Credit cards</span><strong :class="{ neg: totals.cards < 0 }">{{ money(totals.cards) }}</strong>
        </div>
        <div>
          <span>To review</span><strong>{{ totals.uncategorised }} uncategorised · {{ totals.unreconciled }} unreconciled</strong>
        </div>
        <label v-if="banks.some((b) => !b.is_active)" class="ui-switch small">
          <input v-model="showArchived" type="checkbox" />
          <span>Show archived</span>
        </label>
      </div>

      <div class="cards">
        <article
          v-for="b in visibleBanks"
          :key="b.id"
          class="bank-card"
          :class="{ 'is-selected': filters.bank === b.id, archived: !b.is_active }"
          tabindex="0"
          role="button"
          :aria-pressed="filters.bank === b.id"
          @click="selectBank(b.id)"
          @keydown.enter.prevent="selectBank(b.id)"
        >
          <div class="bank-card__top">
            <span class="bank-icon" :class="b.account_type"><i :class="typeIcon(b.account_type)"></i></span>
            <div class="bank-card__name">
              <strong>{{ b.account_name }}</strong>
              <small>{{ b.bank_name }}<template v-if="b.account_number"> · {{ mask(b.account_number) }}</template></small>
            </div>
            <div class="bank-card__actions" @click.stop>
              <button class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" :aria-label="`Edit ${b.account_name}`" title="Edit" @click="accountModal = { account: b }"><i class="fa-solid fa-pen"></i></button>
              <button v-if="b.is_active" class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" :aria-label="`Delete ${b.account_name}`" title="Delete" @click="removeBank(b)"><i class="fa-regular fa-trash-can"></i></button>
              <button v-else class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" :aria-label="`Restore ${b.account_name}`" title="Restore" @click="restoreBank(b)"><i class="fa-solid fa-rotate-left"></i></button>
            </div>
          </div>
          <div class="bank-card__label">{{ b.account_type === 'credit_card' ? 'Balance' : 'Available balance' }}</div>
          <div class="bank-card__balance" :class="{ neg: b.balance < 0 }">{{ money(b.balance, b.currency) }}</div>
          <div class="bank-card__foot">
            <span class="type-pill">{{ typeLabel(b.account_type) }}</span>
            <span v-if="!b.is_active" class="ui-badge ui-badge--void">Archived</span>
            <span v-else-if="b.uncategorised_count" class="flag warn"><i class="fa-solid fa-tags"></i> {{ b.uncategorised_count }} to categorise</span>
            <span v-else-if="b.unreconciled_count" class="flag"><i class="fa-regular fa-circle"></i> {{ b.unreconciled_count }} unreconciled</span>
            <span v-else class="flag ok"><i class="fa-solid fa-circle-check"></i> All reconciled</span>
          </div>
        </article>
        <button class="bank-card add-card" @click="accountModal = { account: null }">
          <i class="fa-solid fa-plus"></i>
          <span>Add account</span>
        </button>
      </div>

      <!-- Transactions -->
      <section class="ui-card">
        <div class="ui-card__head">
          <h2>
            Transactions
            <span v-if="selectedBank" class="head-sub">· {{ selectedBank.account_name }} <button class="link-btn" @click="selectBank('')">Show all</button></span>
          </h2>
          <button class="ui-btn ui-btn--sm" :disabled="!activeBanks.length" @click="txnModal = true"><i class="fa-solid fa-plus"></i> Add</button>
        </div>
        <div class="toolbar">
          <div class="ui-tabs" role="tablist" aria-label="Transaction status">
            <button v-for="t in statusTabs" :key="t.value" class="ui-tab" :class="{ 'is-active': filters.status === t.value }" role="tab" :aria-selected="filters.status === t.value" @click="setFilter('status', t.value)">
              {{ t.label }}
            </button>
          </div>
          <div class="toolbar__right">
            <div class="ui-input-group search">
              <i class="fa-solid fa-magnifying-glass"></i>
              <input v-model="filters.q" class="ui-input" type="search" placeholder="Search description…" aria-label="Search transactions" @input="debounced" />
            </div>
            <select v-model="filters.direction" class="ui-select dir" aria-label="Direction" @change="loadTxns">
              <option value="">In & out</option>
              <option value="in">Money in</option>
              <option value="out">Money out</option>
            </select>
            <input v-model="filters.from" type="date" class="ui-input date" aria-label="From date" @change="loadTxns" />
            <input v-model="filters.to" type="date" class="ui-input date" aria-label="To date" @change="loadTxns" />
          </div>
        </div>

        <div v-if="txnError" class="ui-card__body">
          <div class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ txnError }} <a href="#" @click.prevent="loadTxns">Try again</a></span></div>
        </div>
        <div v-else-if="txnLoading && !txns.length" class="ui-card__body">
          <div v-for="n in 6" :key="n" class="sk-row">
            <div class="ui-skeleton" style="width: 80px"></div>
            <div class="ui-skeleton" style="flex: 1"></div>
            <div class="ui-skeleton" style="width: 90px"></div>
          </div>
        </div>
        <div v-else-if="!txns.length" class="ui-empty">
          <div class="ui-empty__icon"><i class="fa-solid fa-arrow-right-arrow-left"></i></div>
          <h3>{{ hasFilters ? 'No transactions match your filters' : 'No transactions yet' }}</h3>
          <p>{{ hasFilters ? 'Try a different status, date range or search.' : 'Add deposits and withdrawals manually. Bill payments appear here automatically.' }}</p>
          <button v-if="hasFilters" class="ui-btn" style="margin-top: 12px" @click="clearFilters">Clear filters</button>
          <button v-else-if="activeBanks.length" class="ui-btn ui-btn--primary" style="margin-top: 12px" @click="txnModal = true"><i class="fa-solid fa-plus"></i> Add transaction</button>
        </div>
        <div v-else class="ui-table-wrap" :class="{ 'is-loading': txnLoading }">
          <table class="ui-table">
            <thead>
              <tr>
                <th class="hide-sm">Date</th>
                <th>Description</th>
                <th v-if="!filters.bank" class="hide-md">Account</th>
                <th class="cat-col">Category</th>
                <th class="num">Amount</th>
                <th v-if="filters.bank" class="num hide-sm">Balance</th>
                <th class="center" title="Reconciled">Rec.</th>
                <th style="width: 44px"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="t in txns" :key="t.id" :class="{ 'row-review': !t.account_id }">
                <td class="nowrap hide-sm">{{ date(t.date) }}</td>
                <td>
                  <div class="desc">{{ t.description }}</div>
                  <small class="show-sm muted">{{ date(t.date) }}</small>
                  <small v-if="t.reference || t.source !== 'manual'" class="muted">
                    <template v-if="t.source === 'bill_payment'"><i class="fa-solid fa-file-invoice"></i> Bill payment</template>
                    <template v-else-if="t.source === 'opening_balance'"><i class="fa-solid fa-flag"></i> Opening balance</template>
                    <template v-if="t.reference"> · {{ t.reference }}</template>
                  </small>
                </td>
                <td v-if="!filters.bank" class="hide-md muted">{{ t.bank_account_name }}</td>
                <td class="cat-col">
                  <template v-if="t.source !== 'manual'">
                    <span class="cat locked">{{ t.category || '—' }}</span>
                  </template>
                  <AccountSelect
                    v-else-if="!t.account_id || editingCat === t.id"
                    :model-value="t.account_id"
                    class="cat-select"
                    :class="{ pending: !t.account_id }"
                    :accounts="accounts"
                    :exclude="bankLedgerIds"
                    placeholder="Categorise…"
                    :disabled="busy === t.id"
                    :aria-label="`Category for ${t.description}`"
                    @update:model-value="(v) => categorize(t, v)"
                  />
                  <button v-else class="cat" title="Change category" @click="editingCat = t.id">
                    <span class="mono">{{ t.account_code }}</span> {{ t.category }} <i class="fa-solid fa-pen"></i>
                  </button>
                </td>
                <td class="num amt" :class="t.amount >= 0 ? 'in' : 'out'">{{ t.amount >= 0 ? '+' : '−' }}{{ money(Math.abs(t.amount), bankCurrency(t)) }}</td>
                <td v-if="filters.bank" class="num hide-sm muted">{{ money(t.balance, bankCurrency(t)) }}</td>
                <td class="center">
                  <button class="rec" :class="{ on: t.is_reconciled }" :disabled="busy === t.id" :aria-pressed="t.is_reconciled" :aria-label="t.is_reconciled ? 'Mark as unreconciled' : 'Mark as reconciled'" :title="t.is_reconciled ? 'Reconciled' : 'Mark as reconciled'" @click="toggleRec(t)">
                    <i :class="t.is_reconciled ? 'fa-solid fa-circle-check' : 'fa-regular fa-circle'"></i>
                  </button>
                </td>
                <td class="center">
                  <button v-if="t.source === 'manual'" class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" :aria-label="`Delete ${t.description}`" title="Delete" @click="removeTxn(t)"><i class="fa-regular fa-trash-can"></i></button>
                </td>
              </tr>
            </tbody>
          </table>
          <footer class="list-foot">
            <span>{{ txns.length }} transaction{{ txns.length === 1 ? '' : 's' }}</span>
            <span>In <strong class="in">{{ money(flow.in) }}</strong></span>
            <span>Out <strong class="out">{{ money(flow.out) }}</strong></span>
          </footer>
        </div>
      </section>
    </template>

    <BankAccountModal v-if="accountModal" :account="accountModal.account" @close="accountModal = null" @saved="onBankSaved" />
    <TransactionModal v-if="txnModal" :banks="activeBanks" :accounts="accounts" :bank-account-id="filters.bank" @close="txnModal = false" @saved="onTxnSaved" />
  </div>
</template>

<script>
import { orgCurrency } from '@/utils/orgDefaults'
import BankAccountModal from '@/components/finance/BankAccountModal.vue'
import TransactionModal from '@/components/finance/TransactionModal.vue'
import AccountSelect from '@/components/finance/AccountSelect.vue'
import { financeApi, BANK_TYPES, maskNumber, toCents } from '@/services/finance'
import { apiErrorMessage } from '@/services/api'
import { formatMoney, formatDate } from '@/utils/format'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'

const STATUSES = ['all', 'uncategorised', 'unreconciled', 'reconciled']

export default {
  name: 'Banking',
  components: { BankAccountModal, TransactionModal, AccountSelect },
  data() {
    const qs = this.$route.query
    return {
      banks: [],
      banksLoading: false,
      banksError: '',
      showArchived: false,
      accounts: [],
      txns: [],
      txnLoading: false,
      txnError: '',
      filters: {
        bank: qs.account || '',
        status: STATUSES.includes(qs.status) ? qs.status : 'all',
        direction: '',
        q: '',
        from: '',
        to: ''
      },
      accountModal: null,
      txnModal: false,
      editingCat: '',
      busy: '',
      timer: null
    }
  },
  computed: {
    activeBanks() {
      return this.banks.filter((b) => b.is_active)
    },
    visibleBanks() {
      return this.showArchived ? this.banks : this.activeBanks
    },
    selectedBank() {
      return this.banks.find((b) => b.id === this.filters.bank) || null
    },
    bankLedgerIds() {
      return this.banks.map((b) => b.chart_account_id).filter(Boolean)
    },
    totals() {
      let cash = 0
      let cards = 0
      let un = 0
      let uc = 0
      for (const b of this.activeBanks) {
        if (b.account_type === 'credit_card') cards += toCents(b.balance)
        else cash += toCents(b.balance)
        un += b.unreconciled_count || 0
        uc += b.uncategorised_count || 0
      }
      return { cash: cash / 100, cards: cards / 100, unreconciled: un, uncategorised: uc }
    },
    statusTabs() {
      return [
        { value: 'all', label: 'All' },
        { value: 'uncategorised', label: 'To categorise' },
        { value: 'unreconciled', label: 'Unreconciled' },
        { value: 'reconciled', label: 'Reconciled' }
      ]
    },
    hasFilters() {
      const f = this.filters
      return f.status !== 'all' || !!f.direction || !!f.q || !!f.from || !!f.to
    },
    flow() {
      let i = 0
      let o = 0
      for (const t of this.txns) {
        if (t.amount >= 0) i += toCents(t.amount)
        else o -= toCents(t.amount)
      }
      return { in: i / 100, out: o / 100 }
    }
  },
  created() {
    this.loadBanks()
    this.loadTxns()
    this.loadAccounts()
  },
  beforeUnmount() {
    clearTimeout(this.timer)
  },
  methods: {
    money(v, cur) {
      return formatMoney(v, cur || orgCurrency())
    },
    date: formatDate,
    mask: maskNumber,
    typeIcon(t) {
      return BANK_TYPES.find((x) => x.value === t)?.icon || 'fa-solid fa-building-columns'
    },
    typeLabel(t) {
      return BANK_TYPES.find((x) => x.value === t)?.label || t
    },
    bankCurrency(t) {
      return this.banks.find((b) => b.id === t.bank_account_id)?.currency || orgCurrency()
    },
    syncQuery() {
      const query = {}
      if (this.filters.bank) query.account = this.filters.bank
      if (this.filters.status !== 'all') query.status = this.filters.status
      this.$router.replace({ query })
    },
    selectBank(id) {
      this.filters.bank = this.filters.bank === id ? '' : id
      this.syncQuery()
      this.loadTxns()
    },
    setFilter(k, v) {
      this.filters[k] = v
      this.syncQuery()
      this.loadTxns()
    },
    clearFilters() {
      Object.assign(this.filters, { status: 'all', direction: '', q: '', from: '', to: '' })
      this.syncQuery()
      this.loadTxns()
    },
    debounced() {
      clearTimeout(this.timer)
      this.timer = setTimeout(this.loadTxns, 280)
    },
    async loadBanks() {
      this.banksLoading = true
      this.banksError = ''
      try {
        this.banks = (await financeApi.bankAccounts({ include_inactive: 'true' })) || []
      } catch (e) {
        this.banksError = apiErrorMessage(e, 'Could not load bank accounts')
      } finally {
        this.banksLoading = false
      }
    },
    async loadAccounts() {
      try {
        this.accounts = (await financeApi.accounts()) || []
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not load the chart of accounts'))
      }
    },
    async loadTxns() {
      if (this.filters.from && this.filters.to && this.filters.to < this.filters.from) {
        this.txnError = 'The end date must be on or after the start date.'
        return
      }
      this.txnLoading = true
      this.txnError = ''
      const f = this.filters
      try {
        this.txns =
          (await financeApi.transactions({
            bank_account_id: f.bank || undefined,
            status: f.status !== 'all' ? f.status : undefined,
            direction: f.direction || undefined,
            q: f.q || undefined,
            from: f.from || undefined,
            to: f.to || undefined
          })) || []
      } catch (e) {
        this.txnError = apiErrorMessage(e, 'Could not load transactions')
      } finally {
        this.txnLoading = false
      }
    },
    refresh() {
      this.loadBanks()
      this.loadTxns()
    },
    onBankSaved() {
      this.accountModal = null
      this.refresh()
      this.loadAccounts()
    },
    onTxnSaved() {
      this.txnModal = false
      this.refresh()
    },
    async removeBank(b) {
      const hasActivity = b.last_transaction_date
      const ok = await confirmDialog({
        title: `Delete ${b.account_name}?`,
        message: hasActivity
          ? 'This account has transactions, so it will be archived. Its history stays in your ledger and reports.'
          : 'This account has no transactions and will be permanently removed.',
        confirmText: hasActivity ? 'Archive account' : 'Delete account',
        danger: true
      })
      if (!ok) return
      try {
        const res = await financeApi.deleteBankAccount(b.id)
        toast.success(res?.archived ? `${b.account_name} archived` : `${b.account_name} deleted`)
        if (this.filters.bank === b.id) this.filters.bank = ''
        this.refresh()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not delete the account'))
      }
    },
    async restoreBank(b) {
      try {
        await financeApi.updateBankAccount(b.id, { ...b, is_active: true })
        toast.success(`${b.account_name} restored`)
        this.loadBanks()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not restore the account'))
      }
    },
    async categorize(t, accountId) {
      if (accountId === t.account_id) {
        this.editingCat = ''
        return
      }
      this.busy = t.id
      try {
        const updated = await financeApi.categorize(t.id, accountId)
        const acc = this.accounts.find((a) => a.id === updated.account_id)
        Object.assign(t, { account_id: updated.account_id, category: acc?.name || updated.category, account_code: acc?.code || '' })
        this.editingCat = ''
        toast.success(accountId ? `Categorised as ${acc?.name || 'selected account'}` : 'Category removed')
        this.loadBanks()
        if (this.filters.status === 'uncategorised') this.loadTxns()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not categorise the transaction'))
      } finally {
        this.busy = ''
      }
    },
    async toggleRec(t) {
      this.busy = t.id
      try {
        await financeApi.reconcile(t.id, !t.is_reconciled)
        t.is_reconciled = !t.is_reconciled
        this.loadBanks()
        if (this.filters.status === 'reconciled' || this.filters.status === 'unreconciled') this.loadTxns()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not update the transaction'))
      } finally {
        this.busy = ''
      }
    },
    async removeTxn(t) {
      const ok = await confirmDialog({
        title: 'Delete transaction?',
        message: `“${t.description}” (${this.money(Math.abs(t.amount))}) will be removed, the account balance adjusted and any ledger posting reversed.`,
        confirmText: 'Delete',
        danger: true
      })
      if (!ok) return
      try {
        await financeApi.deleteTransaction(t.id)
        toast.success('Transaction deleted')
        this.refresh()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not delete the transaction'))
      }
    }
  }
}
</script>

<style scoped>
.totals-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 32px;
  margin-bottom: 14px;
}
.totals-bar span {
  display: block;
  font-size: 12px;
  color: var(--text-3);
  font-weight: 550;
}
.totals-bar strong {
  font-size: 15px;
  font-variant-numeric: tabular-nums;
}
.totals-bar .ui-switch {
  margin-left: auto;
}
.small {
  font-size: 13px;
}
.neg {
  color: var(--danger);
}
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(270px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}
.bank-card {
  position: relative;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xs);
  padding: 18px 18px 14px;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
  outline: none;
  min-height: 168px;
  display: flex;
  flex-direction: column;
}
.bank-card:hover,
.bank-card:focus-visible {
  border-color: var(--border-strong);
  box-shadow: var(--shadow);
}
.bank-card.is-selected {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-ring);
}
.bank-card.archived {
  opacity: 0.6;
}
.sk-card {
  cursor: default;
}
.bank-card__top {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.bank-icon {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  display: grid;
  place-items: center;
  background: var(--accent-soft);
  color: var(--accent);
  flex-shrink: 0;
}
.bank-icon.savings {
  background: var(--success-soft);
  color: var(--success);
}
.bank-icon.credit_card {
  background: var(--warning-soft);
  color: var(--warning);
}
.bank-icon.cash {
  background: var(--info-soft);
  color: var(--info);
}
.bank-card__name {
  flex: 1;
  min-width: 0;
}
.bank-card__name strong {
  display: block;
  font-size: 15px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bank-card__name small {
  display: block;
  color: var(--text-3);
  font-size: 12.5px;
  font-variant-numeric: tabular-nums;
}
.bank-card__actions {
  display: flex;
  gap: 2px;
  opacity: 0.55;
  transition: opacity 0.15s;
}
.bank-card:hover .bank-card__actions,
.bank-card:focus-within .bank-card__actions {
  opacity: 1;
}
.bank-card__label {
  margin-top: auto;
  padding-top: 18px;
  font-size: 12px;
  color: var(--text-3);
}
.bank-card__balance {
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}
.bank-card__foot {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--border);
  font-size: 12px;
}
.type-pill {
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 1px 8px;
  color: var(--text-2);
  font-weight: 550;
}
.flag {
  color: var(--text-3);
  display: inline-flex;
  gap: 5px;
  align-items: center;
}
.flag.warn {
  color: var(--warning);
}
.flag.ok {
  color: var(--success);
}
.add-card {
  border-style: dashed;
  background: transparent;
  box-shadow: none;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--text-3);
  font: inherit;
  font-weight: 600;
}
.add-card i {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--bg-subtle);
}
.add-card:hover {
  color: var(--accent);
}
.head-sub {
  font-weight: 500;
  color: var(--text-3);
}
.link-btn {
  border: 0;
  background: none;
  color: var(--accent);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  padding: 0 4px;
}
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
}
.toolbar__right {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.search {
  width: 220px;
}
.dir {
  width: 130px;
}
.date {
  width: 145px;
}
.sk-row {
  display: flex;
  gap: 16px;
  padding: 12px 0;
}
.nowrap {
  white-space: nowrap;
}
.desc {
  font-weight: 500;
  max-width: 340px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.muted {
  color: var(--text-3);
  font-size: 12.5px;
}
.muted i {
  font-size: 10px;
}
.row-review td:first-child {
  box-shadow: inset 3px 0 0 var(--warning);
}
.cat-col {
  width: 240px;
}
.cat-select {
  min-height: 32px;
  padding-top: 4px;
  padding-bottom: 4px;
  font-size: 13px;
}
.cat-select.pending {
  border-color: var(--warning);
  border-style: dashed;
}
.cat {
  border: 0;
  background: none;
  font: inherit;
  font-size: 13px;
  color: var(--text);
  padding: 4px 6px;
  margin-left: -6px;
  border-radius: 6px;
  cursor: pointer;
  text-align: left;
}
.cat:hover {
  background: var(--surface-hover);
}
.cat i {
  font-size: 10px;
  color: var(--text-3);
  margin-left: 4px;
  opacity: 0;
}
.cat:hover i {
  opacity: 1;
}
.cat.locked {
  cursor: default;
  color: var(--text-2);
}
.cat .mono {
  font-family: var(--font-mono);
  font-size: 11.5px;
  color: var(--text-3);
}
.amt {
  font-weight: 600;
}
.in {
  color: var(--success);
}
.out {
  color: var(--text);
}
.center {
  text-align: center;
}
.show-sm {
  display: none;
}
.rec {
  border: 0;
  background: none;
  font-size: 17px;
  color: var(--text-3);
  cursor: pointer;
  padding: 4px;
  border-radius: 50%;
}
.rec.on {
  color: var(--success);
}
.rec:hover {
  color: var(--success);
}
.list-foot {
  display: flex;
  justify-content: flex-end;
  gap: 24px;
  padding: 12px 16px;
  border-top: 1px solid var(--border);
  background: var(--bg-subtle);
  font-size: 13px;
  color: var(--text-3);
  font-variant-numeric: tabular-nums;
}
.list-foot strong {
  margin-left: 4px;
}
.is-loading {
  opacity: 0.6;
}
@media (max-width: 1100px) {
  .hide-md {
    display: none;
  }
}
@media (max-width: 700px) {
  .hide-sm {
    display: none;
  }
  .toolbar__right,
  .search {
    width: 100%;
  }
  .dir {
    flex: 1 1 100%;
    width: auto;
  }
  .date {
    flex: 1 1 120px;
    width: auto;
  }
  .cat-col {
    width: auto;
    min-width: 140px;
  }
  .show-sm {
    display: block;
  }
  .desc {
    max-width: 160px;
  }
  .totals-bar {
    gap: 10px 20px;
  }
  .list-foot {
    justify-content: space-between;
    gap: 8px;
  }
}
</style>
