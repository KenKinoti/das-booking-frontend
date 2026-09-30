<template>
  <section class="ui-card mb" id="exchange-rates" data-testid="fx-rates-card">
    <div class="ui-card__head">
      <h2>Exchange rates</h2>
      <span class="muted small">Home currency {{ base || '—' }}</span>
    </div>
    <div class="ui-card__body">
      <p class="ui-hint m0">
        Documents in a customer's currency convert your catalog prices ({{ base }}) at the rate below, and lock that rate on the document when it is created.
        A manual rate replaces the market rate for that currency.
      </p>
      <div v-if="loading" class="ui-skeleton" style="height: 120px; margin-top: 12px"></div>
      <div v-else-if="error" class="ui-alert ui-alert--danger mt"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>
      <template v-else>
        <div class="ui-table-wrap mt">
          <table class="ui-table fx-table">
            <thead>
              <tr>
                <th>Currency</th>
                <th class="num">1 {{ base }} =</th>
                <th class="num hide-sm">Inverse</th>
                <th>Source</th>
                <th class="hide-sm">As of</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="q in rates" :key="q.to" :data-cur="q.to">
                <td><strong>{{ q.to }}</strong></td>
                <td class="num">{{ q.rate > 0 ? rateNum(q.rate) + ' ' + q.to : '—' }}</td>
                <td class="num hide-sm muted">{{ q.rate > 0 ? `1 ${q.to} = ${rateNum(q.inverse)} ${base}` : '' }}</td>
                <td><span class="ui-badge" :class="src(q).badge">{{ src(q).label }}</span><span v-if="q.stale" class="ui-badge ui-badge--warning stale">Stale</span></td>
                <td class="hide-sm muted">{{ q.as_of ? dt(q.as_of) : 'Reference table' }}</td>
                <td class="num">
                  <template v-if="canEdit">
                    <button v-if="q.source === 'manual'" class="ui-btn ui-btn--ghost ui-btn--sm" :disabled="busy" :data-testid="`fx-remove-${q.to}`" @click="remove(q)">Use market rate</button>
                    <button v-else class="ui-btn ui-btn--ghost ui-btn--sm" :data-testid="`fx-set-${q.to}`" @click="edit(q)">Set rate</button>
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="ui-hint">Live rates come from the European Central Bank and ExchangeRate-API. When they're unreachable an approximate reference table is used — check it or set a manual rate.</p>
        <form v-if="form" class="fx-form" data-testid="fx-manual-form" @submit.prevent="save">
          <span>1 {{ base }} =</span>
          <input v-model.number="form.rate" type="number" step="any" min="0" class="ui-input r" aria-label="Rate" data-testid="fx-manual-rate" required />
          <span>{{ form.to }}</span>
          <input v-model.trim="form.note" class="ui-input note" maxlength="255" placeholder="Note (e.g. bank rate 30 Sep)" aria-label="Note" />
          <button type="button" class="ui-btn" @click="form = null">Cancel</button>
          <button type="submit" class="ui-btn ui-btn--primary" :disabled="busy" data-testid="fx-manual-save">Save rate</button>
        </form>
      </template>
    </div>
  </section>
</template>

<script>
import { fxApi, RATE_SOURCES } from '@/services/invoicing'
import { apiErrorMessage } from '@/services/api'
import { rateNumber } from '@/utils/currencies'
import { formatDateTime } from '@/utils/format'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'

export default {
  name: 'FxRatesCard',
  data() {
    return { loading: true, error: '', base: '', rates: [], manual: [], canEdit: false, form: null, busy: false }
  },
  created() {
    this.load()
  },
  methods: {
    rateNum: rateNumber,
    dt: formatDateTime,
    src(q) {
      return RATE_SOURCES[q.source] || RATE_SOURCES.missing
    },
    async load() {
      this.loading = true
      try {
        const r = await fxApi.rates()
        this.base = r.base_currency
        this.rates = r.rates || []
        this.manual = r.manual || []
        this.canEdit = !!r.can_edit
        this.error = ''
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load exchange rates')
      } finally {
        this.loading = false
      }
    },
    edit(q) {
      this.form = { to: q.to, rate: q.rate > 0 ? Number(rateNumber(q.rate)) : '', note: '' }
    },
    async save() {
      if (!(this.form.rate > 0)) return toast.error('Enter a rate greater than zero')
      this.busy = true
      try {
        await fxApi.saveManual({ from: this.base, to: this.form.to, rate: this.form.rate, note: this.form.note })
        toast.success(`Manual rate saved for ${this.form.to}`)
        this.form = null
        await this.load()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not save the rate'))
      } finally {
        this.busy = false
      }
    },
    async remove(q) {
      const ok = await confirmDialog({ title: `Use the market rate for ${q.to}?`, message: 'The manual rate is removed. Documents already created keep the rate they were locked with.', confirmText: 'Remove manual rate' })
      if (!ok) return
      this.busy = true
      try {
        await fxApi.deleteManual(q.manual_id)
        toast.success('Manual rate removed')
        await this.load()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not remove the rate'))
      } finally {
        this.busy = false
      }
    }
  }
}
</script>

<style scoped>
.m0 {
  margin: 0;
}
.mt {
  margin-top: 12px;
}
.muted {
  color: var(--text-3);
}
.small {
  font-size: 12.5px;
}
.fx-table td,
.fx-table th {
  white-space: nowrap;
}
.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.stale {
  margin-left: 6px;
}
.fx-form {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 12px;
  padding: 12px;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  font-weight: 600;
}
.fx-form .ui-input {
  width: 140px;
}
.fx-form .ui-input.note {
  flex: 1;
  min-width: 180px;
  font-weight: 400;
}
@media (max-width: 640px) {
  .hide-sm {
    display: none;
  }
}
</style>
