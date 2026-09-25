<template>
  <div>
    <div class="toolbar">
      <div class="ui-tabs" role="tablist" aria-label="Account type">
        <button v-for="t in typeTabs" :key="t.value" class="ui-tab" :class="{ 'is-active': type === t.value }" role="tab" :aria-selected="type === t.value" @click="type = t.value">
          {{ t.label }} <span class="count">{{ t.count }}</span>
        </button>
      </div>
      <div class="toolbar__right">
        <div class="ui-input-group search">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input v-model="q" class="ui-input" type="search" placeholder="Search code or name…" aria-label="Search accounts" />
        </div>
        <label class="ui-switch archived-toggle">
          <input v-model="showArchived" type="checkbox" />
          <span>Archived</span>
        </label>
        <button class="ui-btn ui-btn--primary" @click="openNew()"><i class="fa-solid fa-plus"></i> <span>New account</span></button>
      </div>
    </div>

    <div v-if="loading && !accounts.length" class="ui-card__body">
      <div v-for="n in 8" :key="n" class="sk-row">
        <div class="ui-skeleton" style="width: 60px"></div>
        <div class="ui-skeleton" style="flex: 1"></div>
        <div class="ui-skeleton" style="width: 100px"></div>
      </div>
    </div>

    <div v-else-if="!groups.length" class="ui-empty">
      <div class="ui-empty__icon"><i class="fa-solid fa-list-ol"></i></div>
      <h3>No accounts match</h3>
      <p>Try a different search or type.</p>
    </div>

    <div v-else class="ui-table-wrap">
      <table class="ui-table coa">
        <thead>
          <tr>
            <th style="width: 90px">Code</th>
            <th>Account</th>
            <th class="hide-sm">Detail type</th>
            <th class="num">Balance</th>
            <th style="width: 96px"></th>
          </tr>
        </thead>
        <tbody v-for="g in groups" :key="g.value">
          <tr class="group-row">
            <td colspan="3" class="group-cell">
              <span class="group-icon"><i :class="g.icon"></i></span>{{ g.label }}
              <span class="muted">· {{ g.accounts.length }}</span>
            </td>
            <td class="num group-cell group-total">{{ money(g.total) }}</td>
            <td class="group-cell"></td>
          </tr>
          <tr v-for="a in g.accounts" :key="a.id" class="is-clickable" :class="{ archived: !a.is_active }" @click="$emit('ledger', a)">
            <td class="mono">{{ a.code }}</td>
            <td>
              <div class="acc-name">
                {{ a.name }}
                <i v-if="a.is_system" class="fa-solid fa-lock sys" title="System account"></i>
                <span v-if="!a.is_active" class="ui-badge ui-badge--void">Archived</span>
              </div>
              <small v-if="a.description" class="desc">{{ a.description }}</small>
            </td>
            <td class="hide-sm muted">{{ a.sub_type || '—' }}</td>
            <td class="num" :class="{ muted: !a.balance, neg: a.balance < 0 }">{{ money(a.balance) }}</td>
            <td class="row-actions" @click.stop>
              <button class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" :aria-label="`Edit ${a.name}`" title="Edit" @click="openEdit(a)"><i class="fa-solid fa-pen"></i></button>
              <button v-if="!a.is_system" class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" :aria-label="`Delete ${a.name}`" title="Delete" @click="remove(a)"><i class="fa-regular fa-trash-can"></i></button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <AccountModal v-if="modal" :account="modal.account" :accounts="accounts" :default-type="type === 'all' ? 'Expense' : type" @close="modal = null" @saved="onSaved" />
  </div>
</template>

<script>
import { orgCurrency } from '@/utils/orgDefaults'
import AccountModal from './AccountModal.vue'
import { financeApi, ACCOUNT_TYPES } from '@/services/finance'
import { apiErrorMessage } from '@/services/api'
import { formatMoney } from '@/utils/format'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'

export default {
  name: 'AccountsTab',
  components: { AccountModal },
  props: {
    accounts: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    currency: { type: String, default: () => orgCurrency() }
  },
  emits: ['changed', 'ledger'],
  data() {
    return { type: 'all', q: '', showArchived: false, modal: null }
  },
  computed: {
    visible() {
      const q = this.q.trim().toLowerCase()
      return this.accounts.filter((a) => (this.showArchived || a.is_active) && (!q || `${a.code} ${a.name} ${a.sub_type}`.toLowerCase().includes(q)))
    },
    typeTabs() {
      return [{ value: 'all', label: 'All', count: this.visible.length }].concat(
        ACCOUNT_TYPES.map((t) => ({ value: t.value, label: t.label, count: this.visible.filter((a) => a.account_type === t.value).length }))
      )
    },
    groups() {
      return ACCOUNT_TYPES.filter((t) => this.type === 'all' || t.value === this.type)
        .map((t) => {
          const accounts = this.visible.filter((a) => a.account_type === t.value)
          return { ...t, accounts, total: accounts.reduce((s, a) => s + Math.round((a.balance || 0) * 100), 0) / 100 }
        })
        .filter((g) => g.accounts.length)
    }
  },
  methods: {
    money(v) {
      return formatMoney(v, this.currency)
    },
    openNew() {
      this.modal = { account: null }
    },
    openEdit(a) {
      this.modal = { account: a }
    },
    onSaved() {
      this.modal = null
      this.$emit('changed')
    },
    async remove(a) {
      const ok = await confirmDialog({
        title: `Delete ${a.code} · ${a.name}?`,
        message: a.has_activity
          ? 'This account has transactions, so it will be archived instead of deleted. It stays on reports but can’t be used for new entries.'
          : 'This account has no transactions and will be permanently removed.',
        confirmText: a.has_activity ? 'Archive account' : 'Delete account',
        danger: true
      })
      if (!ok) return
      try {
        const res = await financeApi.deleteAccount(a.id)
        toast.success(res?.archived ? 'Account archived' : 'Account deleted')
        this.$emit('changed')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not delete the account'))
      }
    }
  }
}
</script>

<style scoped>
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
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}
.search {
  width: 240px;
}
.archived-toggle {
  font-size: 13px;
}
.sk-row {
  display: flex;
  gap: 16px;
  padding: 12px 0;
}
.mono {
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--text-2);
}
.group-row td {
  background: var(--bg-subtle);
  font-weight: 650;
  font-size: 13px;
  color: var(--text);
  padding-top: 10px;
  padding-bottom: 10px;
}
.group-icon {
  display: inline-grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 7px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 11px;
  margin-right: 10px;
}
.group-total {
  font-variant-numeric: tabular-nums;
}
.acc-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 550;
}
.sys {
  font-size: 10px;
  color: var(--text-3);
}
.desc {
  display: block;
  color: var(--text-3);
  font-size: 12px;
}
.muted {
  color: var(--text-3);
}
.neg {
  color: var(--danger);
}
.archived td {
  opacity: 0.6;
}
.row-actions {
  text-align: right;
  white-space: nowrap;
}
@media (max-width: 700px) {
  .hide-sm {
    display: none;
  }
  .search {
    width: 100%;
  }
  .toolbar__right {
    width: 100%;
  }
  .toolbar__right .ui-input-group {
    flex: 1 1 100%;
  }
}
</style>
