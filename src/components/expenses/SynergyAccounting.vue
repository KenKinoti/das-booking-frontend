<template>
  <div class="acc" data-testid="synergy-accounting">
    <section class="block">
      <div class="block__head">
        <h3>How should Synergy costs count?</h3>
        <span class="muted">One of the two — never both, so nothing is counted twice</span>
      </div>
      <div class="modes" role="radiogroup" aria-label="How Synergy costs count">
        <label class="mode" :class="{ on: form.mode === 'charges' }" data-mode="charges">
          <input v-model="form.mode" type="radio" value="charges" name="syn-mode" :disabled="!canEdit" />
          <span class="mode__body">
            <strong><i class="fa-solid fa-file-invoice"></i> Service charges <span class="ui-badge ui-badge--info">Recommended</span></strong>
            <span>Monthly hosting, domain renewals and support fees, minus credits — what each month really cost. Top-ups are just money moving into your Synergy balance.</span>
            <span v-if="form.mode === 'charges'" class="basis" @click.stop>
              <span class="muted">Date each month's expense by</span>
              <span class="seg" role="group" aria-label="Date Synergy expenses by">
                <button type="button" :class="{ on: form.basis === 'charge' }" :disabled="!canEdit" data-acc-basis="charge" @click="form.basis = 'charge'">Charge date</button>
                <button type="button" :class="{ on: form.basis === 'service' }" :disabled="!canEdit" data-acc-basis="service" @click="form.basis = 'service'">Service month</button>
              </span>
            </span>
          </span>
        </label>
        <label class="mode" :class="{ on: form.mode === 'topups' }" data-mode="topups">
          <input v-model="form.mode" type="radio" value="topups" name="syn-mode" :disabled="!canEdit" />
          <span class="mode__body">
            <strong><i class="fa-solid fa-building-columns"></i> Top-ups from my bank</strong>
            <span>Each top-up you paid from your own bank account is the expense, on the day you paid it (cash basis), as “Synergy prepaid hosting”. Charges then only feed the analytics, never your P&amp;L.</span>
          </span>
        </label>
      </div>
      <div class="toggles">
        <label class="ui-switch">
          <input v-model="form.auto_approve" type="checkbox" :disabled="!canEdit" data-testid="acc-auto-approve" />
          <span>Auto-approve Synergy expenses</span>
        </label>
        <span class="muted hint">On: created and approved as soon as a statement arrives (upload or Gmail), so your P&amp;L shows them immediately.</span>
        <label class="ui-switch">
          <input v-model="form.au_gst_registered" type="checkbox" :disabled="!canEdit" data-testid="acc-au-gst" />
          <span>I'm registered for Australian GST</span>
        </label>
        <span class="muted hint">Synergy's AUD prices include 10% Australian GST (1/11 of the total). {{ acc.country === 'AU' ? 'Registered businesses claim it back.' : 'A business outside Australia can’t claim it, so it stays part of the cost (default off).' }}</span>
      </div>
      <div v-if="canEdit" class="foot">
        <span v-if="acc.last_applied_at" class="muted">Last applied {{ formatDateTime(acc.last_applied_at) }}<template v-if="acc.last_apply"> · {{ acc.last_apply.message }}</template></span>
        <span class="spacer"></span>
        <button v-if="!dirty" type="button" class="ui-btn" :disabled="saving" data-testid="acc-reapply" @click="reapply"><i :class="saving ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-rotate'"></i> Re-apply</button>
        <button v-else type="button" class="ui-btn ui-btn--primary" :disabled="saving" data-testid="acc-save" @click="save"><i :class="saving ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-check'"></i> Save &amp; apply</button>
      </div>
    </section>

    <div class="grid2">
      <section class="block">
        <div class="block__head">
          <h3>In your profit &amp; loss</h3>
          <span class="muted">{{ acc.mode === 'topups' ? 'Top-ups by month' : 'Charges by month' }} · each month at its own rate</span>
        </div>
        <p v-if="!acc.counted.length" class="muted">Nothing counted yet — upload a statement.</p>
        <div v-else class="ui-table-wrap">
          <table class="ui-table tight" data-testid="acc-counted">
            <thead><tr><th>Month</th><th class="num">{{ home }}<template v-if="home !== 'AUD'"> · AUD</template></th><th>Status</th></tr></thead>
            <tbody>
              <tr v-for="c in acc.counted" :key="c.month" :data-month="c.month">
                <td>{{ monthLabel(c.month, true) }}<small v-if="home !== 'AUD' && c.rate_label" class="rline rate">{{ c.rate_label }}</small></td>
                <td class="num"><strong>{{ money(c.home, home) }}</strong><small v-if="home !== 'AUD'" class="rline muted">{{ aud(c.aud) }}</small></td>
                <td><span class="ui-badge" :class="c.approved === c.items ? 'ui-badge--success' : 'ui-badge--warning'">{{ c.approved === c.items ? 'approved' : `${c.items - c.approved} to approve` }}</span></td>
              </tr>
            </tbody>
            <tfoot>
              <tr><td><strong>Total</strong></td><td class="num"><strong>{{ money(acc.counted_home, home) }}</strong><small v-if="home !== 'AUD'" class="rline muted">{{ aud(acc.counted_aud) }}</small></td><td></td></tr>
            </tfoot>
          </table>
        </div>
        <p v-if="acc.pending" class="muted small">{{ acc.pending }} waiting for approval in the Inbox.</p>
      </section>

      <section class="block">
        <div class="block__head">
          <h3>Reconciliation</h3>
          <span class="muted">Top-ups − charges = change in balance (AUD)</span>
        </div>
        <p v-if="!acc.reconciliation.length" class="muted">Upload a statement to reconcile.</p>
        <div v-else class="ui-table-wrap">
          <table class="ui-table tight" data-testid="acc-recon">
            <thead><tr><th>Month</th><th class="num hide-sm">Opening</th><th class="num">+ Top-ups</th><th class="num">− Charges</th><th class="num">Closing</th><th class="num" aria-label="Reconciles"><i class="fa-solid fa-check-double"></i></th></tr></thead>
            <tbody>
              <tr v-for="r in acc.reconciliation" :key="r.month">
                <td class="nowrap">{{ monthLabel(r.month) }}</td>
                <td class="num hide-sm">{{ aud(r.opening) }}</td>
                <td class="num">{{ aud(r.topups) }}</td>
                <td class="num">{{ aud(r.charges) }}</td>
                <td class="num">{{ aud(r.closing) }}</td>
                <td class="num"><span v-if="r.ok" class="txt-ok" title="Balances"><i class="fa-solid fa-circle-check"></i></span><span v-else class="txt-danger" :title="'Difference ' + aud(r.difference)">{{ aud(r.difference) }}</span></td>
              </tr>
            </tbody>
            <tfoot v-if="acc.reconciliation_total">
              <tr>
                <td><strong>Period</strong></td>
                <td class="num hide-sm">{{ aud(acc.reconciliation_total.opening) }}</td>
                <td class="num"><strong>{{ aud(acc.reconciliation_total.topups) }}</strong></td>
                <td class="num"><strong>{{ aud(acc.reconciliation_total.charges) }}</strong></td>
                <td class="num"><strong>{{ aud(acc.reconciliation_total.closing) }}</strong></td>
                <td class="num"><span v-if="acc.reconciliation_total.ok" class="txt-ok"><i class="fa-solid fa-circle-check"></i></span><span v-else class="txt-danger">{{ aud(acc.reconciliation_total.difference) }}</span></td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p v-if="acc.reconciliation_total" class="muted small" data-testid="acc-recon-note">
          You topped up {{ aud(acc.reconciliation_total.topups) }}, Synergy charged {{ aud(acc.reconciliation_total.charges) }}, so the balance moved {{ aud(acc.reconciliation_total.change) }}
          ({{ aud(acc.reconciliation_total.opening) }} → {{ aud(acc.reconciliation_total.closing) }}).
        </p>
      </section>
    </div>

    <section v-if="home !== 'AUD'" class="block">
      <div class="block__head">
        <h3>Exchange rates</h3>
        <span class="muted">Today {{ rateNote(acc.fx) || '—' }}</span>
      </div>
      <p class="muted small">Each month's expenses are converted at that month's rate and the rate is stored on the expense. A month's rate is the last one seen while the month was open; months that ended before any rate was recorded use the rate of the day they were first needed. Set your own (e.g. your bank's) to re-convert that month.</p>
      <ul class="rates" data-testid="acc-rates">
        <li v-for="r in acc.month_rates" :key="r.month" :data-month="r.month">
          <span class="rmonth">{{ monthLabel(r.month, true) }}</span>
          <template v-if="editMonth === r.month">
            <span class="rinput">1 AUD = <input v-model="rateForm" type="number" min="0" step="0.01" class="ui-input tiny" :aria-label="'Rate for ' + r.month" /> {{ home }}</span>
            <button type="button" class="ui-btn ui-btn--primary ui-btn--sm" :disabled="saving" @click="saveRate(r.month)">Save</button>
            <button type="button" class="ui-btn ui-btn--ghost ui-btn--sm" @click="editMonth = ''">Cancel</button>
          </template>
          <template v-else>
            <span class="rlabel">{{ r.label }}</span>
            <span v-if="r.basis === 'backfilled'" class="ui-badge ui-badge--warning">estimated</span>
            <button v-if="canEdit" type="button" class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" :aria-label="'Set the rate for ' + r.month" title="Set this month's rate" @click="startRate(r)"><i class="fa-regular fa-pen-to-square"></i></button>
            <button v-if="canEdit && r.basis === 'manual'" type="button" class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" :aria-label="'Clear the rate for ' + r.month" title="Back to the recorded rate" @click="clearRate(r.month)"><i class="fa-solid fa-rotate-left"></i></button>
          </template>
        </li>
        <li v-if="!acc.month_rates.length" class="muted">No month rates recorded yet.</li>
      </ul>
    </section>
  </div>
</template>

<script>
import { expensesApi, money, aud, monthLabel, rateNote } from '@/services/expenses'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'
import { formatDateTime } from '@/utils/format'

export default {
  name: 'SynergyAccounting',
  props: {
    acc: { type: Object, required: true },
    canEdit: { type: Boolean, default: true }
  },
  emits: ['changed'],
  data() {
    return { form: this.formOf(this.acc), saving: false, editMonth: '', rateForm: '' }
  },
  computed: {
    home() {
      return this.acc.home || 'AUD'
    },
    dirty() {
      const a = this.acc
      const f = this.form
      return f.mode !== a.mode || f.basis !== a.basis || f.auto_approve !== a.auto_approve || f.au_gst_registered !== a.au_gst_registered
    }
  },
  watch: {
    acc(v) {
      this.form = this.formOf(v)
    }
  },
  methods: {
    money,
    aud,
    monthLabel,
    rateNote,
    formatDateTime,
    formOf(a) {
      return { mode: a.mode, basis: a.basis, auto_approve: a.auto_approve, au_gst_registered: a.au_gst_registered }
    },
    async save() {
      if (this.form.mode !== this.acc.mode) {
        const toTop = this.form.mode === 'topups'
        const ok = await confirmDialog({
          title: toTop ? 'Count Synergy by top-ups?' : 'Count Synergy by service charges?',
          message: toTop
            ? 'The monthly charge expenses (and their bills) are removed and each top-up from your bank becomes the expense instead. Charges stay in the analytics.'
            : 'The top-up expenses (and their bills) are removed and the monthly service charges become the expenses instead.',
          confirmText: 'Switch and apply'
        })
        if (!ok) return
      }
      this.saving = true
      try {
        const r = await expensesApi.saveAccounting(this.form)
        this.report(r.result)
        this.$emit('changed', r.accounting)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not save the Synergy settings'))
      } finally {
        this.saving = false
      }
    },
    async reapply() {
      this.saving = true
      try {
        const r = await expensesApi.applyAccounting()
        this.report(r.result)
        this.$emit('changed', r.accounting)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not apply'))
      } finally {
        this.saving = false
      }
    },
    report(res) {
      if (!res) return
      if (res.errors?.length) toast.warning(`Applied with problems: ${res.errors[0]}`)
      else toast.success(`Synergy expenses up to date — ${res.message}`)
    },
    startRate(r) {
      this.editMonth = r.month
      this.rateForm = r.rate ? String(Number(r.rate.toFixed(4))) : ''
    },
    async saveRate(month) {
      const rate = Number(this.rateForm)
      if (!rate || rate <= 0) return toast.error('Enter a rate above zero')
      await this.sendRate(month, rate)
    },
    async clearRate(month) {
      await this.sendRate(month, 0)
    },
    async sendRate(month, rate) {
      this.saving = true
      try {
        const r = await expensesApi.saveMonthRate({ from: 'AUD', to: this.home, month, rate })
        this.editMonth = ''
        toast.success(rate ? `Rate for ${monthLabel(month, true)} saved — expenses re-converted` : 'Back to the recorded rate')
        this.$emit('changed', r.accounting)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not save the rate'))
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

<style scoped>
.acc {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.block {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 14px;
  background: var(--surface);
  min-width: 0;
}
.block__head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}
.block__head h3 {
  font-size: 14.5px;
  margin: 0;
}
.muted {
  color: var(--text-3);
  font-size: 12.5px;
}
.small {
  margin: 8px 0 0;
}
.modes {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.mode {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 12px;
  cursor: pointer;
  background: var(--surface);
}
.mode.on {
  border-color: var(--accent);
  background: var(--accent-soft);
}
.mode input {
  margin-top: 3px;
}
.mode__body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  color: var(--text-2);
  min-width: 0;
}
.mode__body strong {
  color: var(--text);
  font-size: 13.5px;
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
}
.basis {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  margin-top: 4px;
}
.seg {
  display: inline-flex;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  overflow: hidden;
}
.seg button {
  background: var(--surface);
  color: var(--text-2);
  border: 0;
  padding: 5px 10px;
  font-size: 12.5px;
  cursor: pointer;
}
.seg button + button {
  border-left: 1px solid var(--border);
}
.seg button.on {
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 600;
}
.toggles {
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  gap: 8px 14px;
  align-items: center;
  margin-top: 14px;
}
.hint {
  font-size: 12.5px;
}
.foot {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}
.spacer {
  flex: 1;
}
.grid2 {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 16px;
}
.tight td,
.tight th {
  padding: 7px 8px;
}
[data-testid='acc-counted'] td:first-child {
  white-space: normal;
  min-width: 140px;
}
[data-testid='acc-counted'] {
  table-layout: auto;
  width: 100%;
}
.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.nowrap {
  white-space: nowrap;
}
.rate {
  white-space: normal;
  font-size: 11.5px;
  color: var(--text-3);
  margin-top: 2px;
  overflow-wrap: anywhere;
}
.rline {
  display: block;
}
.txt-ok {
  color: var(--success);
}
.txt-danger {
  color: var(--danger);
}
.rates {
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.rates li {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
  font-size: 13px;
  padding: 6px 0;
  border-bottom: 1px solid var(--border);
}
.rates li:last-child {
  border-bottom: 0;
}
.rmonth {
  font-weight: 600;
  flex: 1;
  min-width: 120px;
}
.rlabel {
  order: 5;
  flex-basis: 100%;
  color: var(--text-2);
  font-size: 12.5px;
  min-width: 0;
  overflow-wrap: anywhere;
}
.rinput {
  display: inline-flex;
  gap: 6px;
  align-items: center;
}
.tiny {
  width: 100px;
  padding: 4px 6px;
  min-height: 0;
  text-align: right;
}
@media (max-width: 900px) {
  .modes,
  .grid2 {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 640px) {
  .toggles {
    grid-template-columns: 1fr;
  }
  .hint {
    margin: -4px 0 6px;
  }
  .hide-sm {
    display: none;
  }
}
</style>
