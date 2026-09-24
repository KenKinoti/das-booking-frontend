<template>
  <div>
    <div class="toolbar">
      <div class="ui-tabs" role="tablist" aria-label="Journal status">
        <button v-for="t in tabs" :key="t.value" class="ui-tab" :class="{ 'is-active': status === t.value }" role="tab" :aria-selected="status === t.value" @click="setStatus(t.value)">
          {{ t.label }}
        </button>
      </div>
      <div class="toolbar__right">
        <div class="ui-input-group search">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input v-model="q" class="ui-input" type="search" placeholder="Search entries…" aria-label="Search journal entries" @input="debounced" />
        </div>
        <select v-model="source" class="ui-select source" aria-label="Source" @change="load">
          <option value="">All sources</option>
          <option value="manual">Manual journals</option>
          <option value="system">Automatic (bills, bank)</option>
        </select>
        <button class="ui-btn ui-btn--primary" @click="open(null)"><i class="fa-solid fa-plus"></i> <span>New entry</span></button>
      </div>
    </div>

    <div v-if="error" class="ui-card__body">
      <div class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span></div>
    </div>

    <div v-else-if="loading && !rows.length" class="ui-card__body">
      <div v-for="n in 6" :key="n" class="sk-row">
        <div class="ui-skeleton" style="width: 80px"></div>
        <div class="ui-skeleton" style="flex: 1"></div>
        <div class="ui-skeleton" style="width: 100px"></div>
      </div>
    </div>

    <div v-else-if="!rows.length" class="ui-empty">
      <div class="ui-empty__icon"><i class="fa-solid fa-book-open"></i></div>
      <h3>{{ q || status !== 'all' || source ? 'No entries match your filters' : 'No journal entries yet' }}</h3>
      <p>{{ q || status !== 'all' || source ? 'Try a different search or filter.' : 'Record adjustments, depreciation or owner contributions with a balanced journal entry. Bills and bank transactions post here automatically.' }}</p>
      <button v-if="!q && status === 'all' && !source" class="ui-btn ui-btn--primary" style="margin-top: 12px" @click="open(null)"><i class="fa-solid fa-plus"></i> New journal entry</button>
    </div>

    <div v-else class="ui-table-wrap" :class="{ 'is-loading': loading }">
      <table class="ui-table">
        <thead>
          <tr>
            <th>Entry</th>
            <th>Date</th>
            <th>Description</th>
            <th class="hide-lg">Accounts</th>
            <th>Status</th>
            <th class="num">Amount</th>
            <th style="width: 120px"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="e in rows" :key="e.id" class="is-clickable" @click="open(e)">
            <td>
              <strong class="mono">{{ e.entry_number }}</strong>
              <small class="src"><i :class="sourceIcon(e.source)"></i> {{ sourceLabel(e.source) }}</small>
            </td>
            <td class="nowrap">{{ date(e.date) }}</td>
            <td>
              <div class="desc">{{ e.description || '—' }}</div>
              <small v-if="e.reference" class="muted">Ref {{ e.reference }}</small>
            </td>
            <td class="hide-lg accounts">{{ accountSummary(e) }}</td>
            <td><span class="ui-badge" :class="badge(e.status)">{{ statusLabel(e.status) }}</span></td>
            <td class="num"><strong>{{ money(e.total_debit) }}</strong></td>
            <td class="row-actions" @click.stop>
              <template v-if="e.status === 'draft'">
                <button class="ui-btn ui-btn--sm ui-btn--success" :disabled="busy === e.id" @click="post(e)"><i class="fa-solid fa-check"></i> Post</button>
                <button class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" :aria-label="`Delete ${e.entry_number}`" title="Delete draft" @click="remove(e)"><i class="fa-regular fa-trash-can"></i></button>
              </template>
              <button v-else-if="e.status === 'posted' && isManual(e)" class="ui-btn ui-btn--ghost ui-btn--sm" :disabled="busy === e.id" title="Post a reversing entry" @click="reverse(e)">
                <i class="fa-solid fa-rotate-left"></i> Reverse
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <JournalModal v-if="modal" :entry="modal.entry" :accounts="accounts" :currency="currency" @close="modal = null" @saved="onSaved" @reverse="reverse" />
  </div>
</template>

<script>
import JournalModal from './JournalModal.vue'
import { financeApi } from '@/services/finance'
import { apiErrorMessage } from '@/services/api'
import { formatMoney, formatDate } from '@/utils/format'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'

export default {
  name: 'JournalsTab',
  components: { JournalModal },
  props: {
    accounts: { type: Array, default: () => [] },
    currency: { type: String, default: 'AUD' }
  },
  emits: ['changed'],
  data() {
    return { rows: [], loading: false, error: '', status: 'all', q: '', source: '', modal: null, busy: '', timer: null }
  },
  computed: {
    tabs() {
      return [
        { value: 'all', label: 'All' },
        { value: 'draft', label: 'Draft' },
        { value: 'posted', label: 'Posted' },
        { value: 'reversed', label: 'Reversed' }
      ]
    }
  },
  created() {
    this.load()
  },
  beforeUnmount() {
    clearTimeout(this.timer)
  },
  methods: {
    money(v) {
      return formatMoney(v, this.currency)
    },
    date: formatDate,
    isManual(e) {
      return !e.source || e.source === 'manual'
    },
    badge(s) {
      return { draft: 'ui-badge--draft', posted: 'ui-badge--paid', reversed: 'ui-badge--void' }[s] || ''
    },
    statusLabel(s) {
      return { draft: 'Draft', posted: 'Posted', reversed: 'Reversed' }[s] || s
    },
    sourceLabel(s) {
      return { bill: 'Bill', bill_payment: 'Bill payment', bank: 'Bank', opening_balance: 'Opening balance', reversal: 'Reversal' }[s] || 'Manual'
    },
    sourceIcon(s) {
      return (
        { bill: 'fa-solid fa-file-invoice', bill_payment: 'fa-solid fa-money-bill-transfer', bank: 'fa-solid fa-building-columns', opening_balance: 'fa-solid fa-flag', reversal: 'fa-solid fa-rotate-left' }[s] ||
        'fa-solid fa-pen-to-square'
      )
    },
    accountSummary(e) {
      const names = [...new Set((e.line_items || []).map((l) => l.chart_of_account?.name).filter(Boolean))]
      return names.length > 3 ? `${names.slice(0, 3).join(', ')} +${names.length - 3}` : names.join(', ')
    },
    setStatus(s) {
      this.status = s
      this.load()
    },
    debounced() {
      clearTimeout(this.timer)
      this.timer = setTimeout(this.load, 280)
    },
    async load() {
      this.loading = true
      this.error = ''
      try {
        this.rows = (await financeApi.journals({ status: this.status, q: this.q || undefined, source: this.source || undefined })) || []
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load journal entries')
      } finally {
        this.loading = false
      }
    },
    open(entry) {
      this.modal = { entry }
    },
    onSaved() {
      this.modal = null
      this.load()
      this.$emit('changed')
    },
    async post(e) {
      const ok = await confirmDialog({
        title: `Post ${e.entry_number}?`,
        message: `Posting writes ${this.money(e.total_debit)} to the general ledger. Posted entries can’t be edited — only reversed.`,
        confirmText: 'Post entry'
      })
      if (!ok) return
      this.busy = e.id
      try {
        await financeApi.postJournal(e.id)
        toast.success(`${e.entry_number} posted`)
        this.load()
        this.$emit('changed')
      } catch (err) {
        toast.error(apiErrorMessage(err, 'Could not post the entry'))
      } finally {
        this.busy = ''
      }
    },
    async reverse(e) {
      const ok = await confirmDialog({
        title: `Reverse ${e.entry_number}?`,
        message: 'A new posted entry with opposite debits and credits will be created on the same date, cancelling this one out.',
        confirmText: 'Reverse entry',
        danger: true
      })
      if (!ok) return
      this.busy = e.id
      try {
        const rev = await financeApi.reverseJournal(e.id)
        toast.success(`Reversed with ${rev?.entry_number || 'a new entry'}`)
        this.modal = null
        this.load()
        this.$emit('changed')
      } catch (err) {
        toast.error(apiErrorMessage(err, 'Could not reverse the entry'))
      } finally {
        this.busy = ''
      }
    },
    async remove(e) {
      const ok = await confirmDialog({ title: `Delete draft ${e.entry_number}?`, message: 'This draft hasn’t been posted and will be permanently deleted.', confirmText: 'Delete', danger: true })
      if (!ok) return
      try {
        await financeApi.deleteJournal(e.id)
        toast.success('Draft deleted')
        this.load()
        this.$emit('changed')
      } catch (err) {
        toast.error(apiErrorMessage(err, 'Could not delete the entry'))
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
  gap: 8px;
  flex-wrap: wrap;
}
.search {
  width: 240px;
}
.source {
  width: 200px;
}
.sk-row {
  display: flex;
  gap: 16px;
  padding: 12px 0;
}
.mono {
  font-family: var(--font-mono);
  font-size: 13px;
  white-space: nowrap;
}
.src {
  display: block;
  font-size: 11.5px;
  color: var(--text-3);
  margin-top: 2px;
}
.src i {
  font-size: 10px;
  margin-right: 2px;
}
.desc {
  font-weight: 500;
  max-width: 320px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.accounts {
  color: var(--text-2);
  font-size: 13px;
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.muted {
  color: var(--text-3);
  font-size: 12px;
}
.nowrap {
  white-space: nowrap;
}
.row-actions {
  text-align: right;
  white-space: nowrap;
}
.row-actions .ui-btn + .ui-btn {
  margin-left: 4px;
}
.is-loading {
  opacity: 0.6;
}
@media (max-width: 1380px) {
  .hide-lg {
    display: none;
  }
}
@media (max-width: 700px) {
  .search,
  .source,
  .toolbar__right {
    width: 100%;
  }
  .desc {
    max-width: 180px;
  }
}
</style>
