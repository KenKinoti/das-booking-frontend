<template>
  <div class="ui-modal-backdrop" @mousedown.self="$emit('close')">
    <div class="ui-modal" style="max-width: 860px" role="dialog" aria-modal="true" aria-labelledby="stmt-title" data-testid="statement-modal">
      <div class="ui-modal__head">
        <h2 id="stmt-title">Create expenses from Synergy statements</h2>
        <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="$emit('close')"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="ui-modal__body">
        <p class="intro">
          One expense per month per category — Web hosting, Domain names, Support — with a line per domain (credits for a domain are netted into its line).
          Top-ups are money added to your prepaid balance, never an expense. Re-uploading a statement updates these expenses instead of adding new ones.
        </p>
        <div class="opts">
          <fieldset class="seg" aria-label="Date the expenses by">
            <legend class="ui-label">Date expenses by</legend>
            <label :class="{ on: basis === 'charge' }"><input v-model="basis" type="radio" value="charge" @change="preview" /> Charge date <small>cash — when Synergy charged you</small></label>
            <label :class="{ on: basis === 'service' }"><input v-model="basis" type="radio" value="service" @change="preview" /> Service month <small>accrual — hosting charged 25 Aug for September counts in September</small></label>
          </fieldset>
          <div v-if="p?.available_months?.length" class="months">
            <span class="ui-label">Months</span>
            <label v-for="m in p.available_months" :key="m" class="mchip" :class="{ on: months.includes(m) }">
              <input v-model="months" type="checkbox" :value="m" @change="preview" /> {{ monthLabel(m, true) }}
            </label>
          </div>
        </div>

        <div v-if="loading && !p" class="ui-skeleton" style="height: 200px"></div>
        <div v-else-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>
        <template v-else-if="p">
          <div v-if="!p.groups.length" class="ui-empty small">
            <div class="ui-empty__icon"><i class="fa-solid fa-file-invoice-dollar"></i></div>
            <h3>Nothing to create</h3>
            <p>{{ p.note || 'Choose at least one month with statement lines.' }}</p>
          </div>
          <div v-else class="ui-table-wrap" :class="{ busy: loading }">
            <table class="ui-table" data-testid="statement-groups">
              <thead><tr><th>Expense</th><th class="num">Lines</th><th class="num">Amount (AUD)</th><th class="hide-sm">Dated</th><th>Status</th></tr></thead>
              <tbody>
                <template v-for="g in p.groups" :key="g.key">
                  <tr class="is-clickable" :data-key="g.key" @click="open = open === g.key ? '' : g.key">
                    <td><i class="fa-solid" :class="open === g.key ? 'fa-chevron-down' : 'fa-chevron-right'"></i> {{ catLabel(g.category) }} · {{ monthLabel(g.month, true) }}</td>
                    <td class="num">{{ g.lines.length }}</td>
                    <td class="num"><strong>{{ aud(g.total) }}</strong><small v-if="g.credits" class="block muted">after {{ aud(g.credits) }} credits</small></td>
                    <td class="hide-sm nowrap">{{ formatDate(g.bill_date) }}</td>
                    <td><span class="ui-badge" :class="changeTone(g)">{{ changeText(g) }}</span></td>
                  </tr>
                  <tr v-if="open === g.key" class="lines">
                    <td colspan="5">
                      <ul>
                        <li v-for="l in g.lines" :key="l.label"><span>{{ l.label }}</span><span class="num">{{ aud(l.amount) }}</span></li>
                      </ul>
                    </td>
                  </tr>
                </template>
              </tbody>
              <tfoot><tr><td colspan="2"><strong>Total</strong></td><td class="num"><strong>{{ aud(p.total) }}</strong></td><td colspan="2"></td></tr></tfoot>
            </table>
          </div>

          <div v-if="p.overlaps.length" class="ui-alert ui-alert--warning overlap" data-testid="statement-overlaps">
            <i class="fa-solid fa-triangle-exclamation"></i>
            <div>
              <strong>{{ p.overlaps.length }} Synergy invoice{{ p.overlaps.length === 1 ? '' : 's' }}/receipt{{ p.overlaps.length === 1 ? '' : 's' }} in these months</strong>
              <p>{{ p.note }}</p>
              <ul>
                <li v-for="o in p.overlaps" :key="o.item_id">
                  {{ formatDate(o.date) }} · {{ o.invoice_number || 'no number' }} · {{ money(o.total, o.currency) }} · <em>{{ o.status === 'approved' ? 'approved' : 'in the inbox' }}</em> — {{ o.match }}
                </li>
              </ul>
            </div>
          </div>
          <label v-if="p.overlaps.length || p.count_from !== 'statement'" class="check">
            <input v-model="useStatement" type="checkbox" data-testid="use-statement" />
            <span>
              <strong>Use the statement as the source of truth for Synergy</strong>
              <small>Synergy invoices and receipts (Gmail / uploads) are top-ups of your prepaid balance: they will be ignored{{ approvedOverlaps ? ' (approved ones un-approved first)' : '' }}, and new ones are ignored automatically.</small>
            </span>
          </label>
          <p v-else class="muted"><i class="fa-solid fa-circle-check txt-ok"></i> Synergy is counted from statements.</p>
          <label class="check">
            <input v-model="approve" type="checkbox" data-testid="approve-now" />
            <span><strong>Approve straight away</strong><small>Creates the paid supplier bills now, so the P&amp;L counts them. Otherwise they wait in the inbox.</small></span>
          </label>
        </template>
      </div>
      <div class="ui-modal__foot">
        <button type="button" class="ui-btn ui-btn--ghost" @click="$emit('close')">Cancel</button>
        <button type="button" class="ui-btn ui-btn--primary" :disabled="!p?.groups?.length || saving || loading || blocked" data-testid="statement-create" @click="create">
          <i :class="saving ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-file-circle-plus'"></i> {{ actionText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { expensesApi, money, aud, monthLabel, categoryOf } from '@/services/expenses'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { formatDate } from '@/utils/format'

export default {
  name: 'StatementExpensesModal',
  props: { initialBasis: { type: String, default: 'charge' } },
  emits: ['close', 'created'],
  data() {
    return { p: null, loading: false, saving: false, error: '', basis: this.initialBasis === 'service' ? 'service' : 'charge', months: [], open: '', useStatement: false, approve: true, first: true }
  },
  computed: {
    approvedOverlaps() {
      return (this.p?.overlaps || []).filter((o) => o.status === 'approved').length
    },
    blocked() {
      return this.approvedOverlaps > 0 && !this.useStatement && this.p?.count_from !== 'statement'
    },
    actionText() {
      const g = this.p?.groups || []
      const n = g.filter((x) => x.change !== 'unchanged').length
      if (!g.length) return 'Create expenses'
      if (!n) return 'Nothing changed'
      const nw = g.filter((x) => x.change === 'new').length
      return nw === n ? `Create ${n} expense${n === 1 ? '' : 's'}` : `Create / update ${n} expense${n === 1 ? '' : 's'}`
    }
  },
  mounted() {
    this.preview()
  },
  methods: {
    money,
    aud,
    monthLabel,
    formatDate,
    catLabel(k) {
      return categoryOf(k).label
    },
    changeTone(g) {
      if (g.item_status === 'approved' && g.change === 'unchanged') return 'ui-badge--success'
      return { new: 'ui-badge--info', update: 'ui-badge--warning', unchanged: 'ui-badge--draft' }[g.change]
    },
    changeText(g) {
      if (g.change === 'new') return 'new'
      if (g.change === 'update') return `update (${g.item_status})`
      return g.item_status === 'approved' ? 'approved' : g.item_status
    },
    async preview() {
      this.error = ''
      if (!this.first && !this.months.length) {
        this.p = { ...(this.p || {}), groups: [], overlaps: [], total: 0, note: 'Choose at least one month.' }
        return
      }
      this.loading = true
      try {
        const p = await expensesApi.statementPreview({ basis: this.basis, months: this.first ? undefined : this.months.join(',') })
        if (this.first) {
          this.months = [...p.months]
          this.first = false
          this.useStatement = true // creating expenses from statements makes them the source of truth (untick to keep both)
        }
        this.p = p
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not preview')
      } finally {
        this.loading = false
      }
    },
    async create() {
      this.saving = true
      try {
        const r = await expensesApi.statementCreate({ months: this.months, basis: this.basis, use_statement: this.useStatement, approve: this.approve })
        const parts = []
        if (r.created) parts.push(`${r.created} created`)
        if (r.updated) parts.push(`${r.updated} updated`)
        if (r.approved) parts.push(`${r.approved} approved`)
        if (r.ignored) parts.push(`${r.ignored} receipt${r.ignored === 1 ? '' : 's'} ignored`)
        if (r.removed) parts.push(`${r.removed} removed`)
        toast.success(parts.length ? `Statement expenses: ${parts.join(' · ')}` : 'Statement expenses are up to date')
        for (const e of r.errors || []) toast.error(e)
        this.$emit('created', r)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not create the expenses'))
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

<style scoped>
.intro {
  margin: 0 0 12px;
  color: var(--text-2);
  font-size: 13.5px;
}
.opts {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 14px;
}
.seg {
  border: 0;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.seg legend {
  margin-bottom: 6px;
}
.seg label {
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 8px 10px;
  cursor: pointer;
  font-size: 13.5px;
  display: block;
}
.seg label.on {
  border-color: var(--accent);
  background: var(--accent-soft);
}
.seg small {
  display: block;
  color: var(--text-3);
  font-size: 12px;
  margin-top: 2px;
}
.months {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  align-items: center;
}
.mchip {
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 3px 10px;
  font-size: 13px;
  cursor: pointer;
  display: inline-flex;
  gap: 6px;
  align-items: center;
}
.mchip.on {
  border-color: var(--accent);
  background: var(--accent-soft);
}
.lines td {
  background: var(--bg-subtle);
}
.lines ul {
  list-style: none;
  margin: 0;
  padding: 0 0 0 18px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12.5px;
  color: var(--text-2);
}
.lines li {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}
.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.block {
  display: block;
}
.nowrap {
  white-space: nowrap;
}
.muted {
  color: var(--text-3);
  font-size: 12.5px;
}
.busy {
  opacity: 0.6;
}
.overlap {
  margin-top: 14px;
  align-items: flex-start;
}
.overlap p {
  margin: 4px 0;
  font-size: 13px;
}
.overlap ul {
  margin: 4px 0 0;
  padding-left: 18px;
  font-size: 12.5px;
}
.check {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  margin-top: 12px;
  cursor: pointer;
}
.check input {
  margin-top: 3px;
}
.check span {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 13.5px;
}
.check small {
  color: var(--text-3);
  font-size: 12.5px;
}
.txt-ok {
  color: var(--success);
}
@media (max-width: 640px) {
  .seg {
    grid-template-columns: 1fr;
  }
  .hide-sm {
    display: none;
  }
}
</style>
