<template>
  <section class="mp ui-card">
    <div class="toolbar">
      <div class="ui-tabs" role="tablist">
        <button v-for="s in statusTabs" :key="s.value" class="ui-tab" :class="{ 'is-active': status === s.value }" @click="setStatus(s.value)">{{ s.label }}</button>
      </div>
      <span class="muted small">Gross = approved hours × rate, or annual salary ÷ pay periods. Deductions are a flat % you set per run.</span>
    </div>

    <div v-if="error" class="ui-card__body">
      <div class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span></div>
    </div>
    <div v-else-if="loading && !rows.length" class="ui-card__body">
      <div v-for="n in 4" :key="n" class="sk-row"><div class="ui-skeleton" style="width: 80px"></div><div class="ui-skeleton" style="flex: 1"></div><div class="ui-skeleton" style="width: 100px"></div></div>
    </div>
    <div v-else-if="!rows.length" class="ui-empty">
      <div class="ui-empty__icon"><i class="fa-solid fa-money-check-dollar"></i></div>
      <h3>No pay runs {{ status === 'all' ? 'yet' : 'here' }}</h3>
      <p>Create a pay run for a week, fortnight or month. You can review every line before marking it paid.</p>
      <button v-if="canManage && employees.length" class="ui-btn ui-btn--primary" style="margin-top: 12px" @click="openCreate"><i class="fa-solid fa-plus"></i> New pay run</button>
    </div>
    <div v-else class="ui-table-wrap" :class="{ 'is-loading': loading }">
      <table class="ui-table">
        <thead>
          <tr>
            <th>Pay run</th>
            <th>Period</th>
            <th class="hide-sm">Pay date</th>
            <th class="num hide-sm">People</th>
            <th class="num hide-md">Gross</th>
            <th class="num">Net</th>
            <th>Status</th>
            <th style="width: 44px"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.id" class="is-clickable" @click="openDetail(r)">
            <td><strong>{{ r.number }}</strong><small class="muted block">{{ cap(r.frequency) }}</small></td>
            <td class="nowrap">{{ date(r.period_start) }} – {{ date(r.period_end) }}</td>
            <td class="hide-sm nowrap">{{ date(r.pay_date) }}</td>
            <td class="num hide-sm tnum">{{ r.employee_count }}</td>
            <td class="num hide-md tnum">{{ money(r.total_gross, r.currency) }}</td>
            <td class="num tnum"><strong>{{ money(r.total_net, r.currency) }}</strong></td>
            <td><span class="ui-badge" :class="r.status === 'paid' ? 'ui-badge--paid' : 'ui-badge--draft'">{{ r.status === 'paid' ? 'Paid' : 'Draft' }}</span></td>
            <td><button class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" :aria-label="`Open ${r.number}`" @click.stop="openDetail(r)"><i class="fa-solid fa-chevron-right"></i></button></td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- New pay run -->
    <div v-if="creating" class="ui-modal-backdrop" @mousedown.self="closeCreate">
      <form class="ui-modal" style="max-width: 880px" novalidate @submit.prevent="create">
        <div class="ui-modal__head">
          <h2>New pay run</h2>
          <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="closeCreate"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="ui-modal__body">
          <div class="form-grid four">
            <label class="ui-field">
              <span class="ui-label">Frequency</span>
              <select v-model="form.frequency" class="ui-select" @change="schedulePreview">
                <option value="weekly">Weekly</option>
                <option value="fortnightly">Fortnightly</option>
                <option value="monthly">Monthly</option>
              </select>
            </label>
            <label class="ui-field">
              <span class="ui-label">Period starts</span>
              <input v-model="form.period_start" type="date" class="ui-input" @change="schedulePreview" />
              <span class="ui-hint">Ends {{ date(periodEnd) }}</span>
            </label>
            <label class="ui-field">
              <span class="ui-label">Pay date</span>
              <input v-model="form.pay_date" type="date" class="ui-input" :placeholder="periodEnd" />
            </label>
            <label class="ui-field">
              <span class="ui-label">Currency</span>
              <select v-model="form.currency" class="ui-select" @change="schedulePreview">
                <option v-for="c in currencies" :key="c" :value="c">{{ c }}</option>
              </select>
            </label>
            <label class="ui-field">
              <span class="ui-label">Deductions %</span>
              <input v-model="form.deduction_rate" type="number" min="0" max="100" step="0.1" class="ui-input tnum" @input="schedulePreview" />
              <span class="ui-hint">Tax, super, etc. withheld</span>
            </label>
            <label class="ui-field span-3">
              <span class="ui-label">Notes</span>
              <input v-model="form.notes" class="ui-input" maxlength="2000" placeholder="Optional" />
            </label>
          </div>

          <div class="preview">
            <div class="preview__head">
              <h3>Preview</h3>
              <span v-if="previewing" class="muted small"><i class="fa-solid fa-circle-notch spin"></i> Calculating…</span>
            </div>
            <div v-if="previewError" class="ui-alert ui-alert--warning"><i class="fa-solid fa-triangle-exclamation"></i><span>{{ previewError }}</span></div>
            <template v-else-if="preview">
              <dl class="stat-list">
                <div><dt>People</dt><dd>{{ preview.pay_run.employee_count }}</dd></div>
                <div><dt>Gross</dt><dd>{{ money(preview.pay_run.total_gross, form.currency) }}</dd></div>
                <div><dt>Deductions</dt><dd>{{ money(preview.pay_run.total_deductions, form.currency) }}</dd></div>
                <div><dt>Net pay</dt><dd class="txt-success">{{ money(preview.pay_run.total_net, form.currency) }}</dd></div>
              </dl>
              <div v-if="(preview.pay_run.lines || []).length" class="ui-table-wrap lines">
                <table class="ui-table">
                  <thead>
                    <tr><th>Employee</th><th class="hide-sm">Basis</th><th class="num">Gross</th><th class="num hide-sm">Deductions</th><th class="num">Net</th></tr>
                  </thead>
                  <tbody>
                    <tr v-for="l in preview.pay_run.lines" :key="l.employee_id">
                      <td class="strong">{{ l.employee_name }}</td>
                      <td class="hide-sm muted small">{{ basis(l, form.currency, form.frequency) }}</td>
                      <td class="num tnum">{{ money(l.gross, form.currency) }}</td>
                      <td class="num tnum hide-sm">{{ money(l.deductions, form.currency) }}</td>
                      <td class="num tnum strong">{{ money(l.net, form.currency) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div v-if="(preview.skipped || []).length" class="skipped">
                <strong><i class="fa-solid fa-circle-info"></i> Not included</strong>
                <ul>
                  <li v-for="s in preview.skipped" :key="s.employee_id">{{ s.name }} — <span class="muted">{{ s.reason }}</span></li>
                </ul>
              </div>
            </template>
          </div>
        </div>
        <div class="ui-modal__foot">
          <button type="button" class="ui-btn" @click="closeCreate">Cancel</button>
          <button type="submit" class="ui-btn ui-btn--primary" :disabled="saving || !preview || !preview.pay_run.employee_count">
            <i :class="saving ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-check'"></i> Create draft pay run
          </button>
        </div>
      </form>
    </div>

    <!-- Detail -->
    <div v-if="detail" class="ui-modal-backdrop" @mousedown.self="detail = null">
      <div class="ui-modal" style="max-width: 920px" role="dialog" :aria-label="detail.number">
        <div class="ui-modal__head">
          <h2>
            {{ detail.number }}
            <span class="ui-badge" :class="detail.status === 'paid' ? 'ui-badge--paid' : 'ui-badge--draft'" style="margin-left: 8px; vertical-align: middle">{{ detail.status === 'paid' ? 'Paid' : 'Draft' }}</span>
          </h2>
          <button class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="detail = null"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="ui-modal__body">
          <p class="muted" style="margin-top: 0">
            {{ cap(detail.frequency) }} · {{ date(detail.period_start) }} – {{ date(detail.period_end) }} · paid on {{ date(detail.pay_date) }}
            <template v-if="detail.paid_at"> · marked paid {{ dateTime(detail.paid_at) }}</template>
          </p>
          <dl class="stat-list">
            <div><dt>People</dt><dd>{{ detail.employee_count }}</dd></div>
            <div><dt>Gross</dt><dd>{{ money(detail.total_gross, detail.currency) }}</dd></div>
            <div><dt>Deductions ({{ detail.deduction_rate }}%)</dt><dd>{{ money(detail.total_deductions, detail.currency) }}</dd></div>
            <div><dt>Net pay</dt><dd class="txt-success">{{ money(detail.total_net, detail.currency) }}</dd></div>
          </dl>
          <div v-if="detail.status === 'draft' && canManage" class="recalc">
            <label class="ui-field" style="margin: 0">
              <span class="ui-label">Deductions %</span>
              <input v-model="recalcRate" type="number" min="0" max="100" step="0.1" class="ui-input tnum" style="width: 120px" />
            </label>
            <button class="ui-btn" :disabled="detailBusy" @click="recalculate"><i class="fa-solid fa-rotate"></i> Recalculate</button>
            <span class="muted small">Picks up newly approved hours and pay-rate changes.</span>
          </div>
          <div class="ui-table-wrap lines">
            <table class="ui-table">
              <thead>
                <tr><th>Employee</th><th class="hide-sm">Basis</th><th class="num">Gross</th><th class="num hide-sm">Deductions</th><th class="num">Net</th></tr>
              </thead>
              <tbody>
                <tr v-for="l in detail.lines || []" :key="l.id">
                  <td><span class="strong">{{ l.employee_name }}</span><small v-if="l.position" class="muted block">{{ l.position }}</small></td>
                  <td class="hide-sm muted small">{{ basis(l, detail.currency, detail.frequency) }}</td>
                  <td class="num tnum">{{ money(l.gross, detail.currency) }}</td>
                  <td class="num tnum hide-sm">{{ money(l.deductions, detail.currency) }}</td>
                  <td class="num tnum strong">{{ money(l.net, detail.currency) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-if="detail.notes" class="muted small" style="margin-bottom: 0"><i class="fa-regular fa-note-sticky"></i> {{ detail.notes }}</p>
        </div>
        <div class="ui-modal__foot spread">
          <div class="ui-actions">
            <button v-if="detail.status === 'draft' && canManage" class="ui-btn ui-btn--ghost txt-danger" :disabled="detailBusy" @click="removeRun"><i class="fa-regular fa-trash-can"></i> Delete draft</button>
          </div>
          <div class="ui-actions">
            <button class="ui-btn" :disabled="detailBusy" @click="exportCsv"><i class="fa-solid fa-download"></i> Export CSV</button>
            <button v-if="detail.status === 'draft' && canManage" class="ui-btn ui-btn--success" :disabled="detailBusy" @click="markPaid"><i class="fa-solid fa-circle-check"></i> Mark as paid</button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
import { orgCurrency } from '@/utils/orgDefaults'
import '@/styles/module-page.css'
import api, { apiErrorMessage } from '@/services/api'
import { formatMoney, formatDate, formatDateTime, isoDate, addDays, downloadBlob } from '@/utils/format'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'

function mondayOf(d = new Date()) {
  const x = new Date(d)
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7))
  return isoDate(x)
}

export default {
  name: 'HrPayRuns',
  props: { employees: { type: Array, default: () => [] }, canManage: Boolean },
  emits: ['changed'],
  data() {
    return {
      rows: [],
      status: 'all',
      loading: false,
      error: '',
      creating: false,
      form: {},
      preview: null,
      previewError: '',
      previewing: false,
      previewTimer: null,
      saving: false,
      detail: null,
      detailBusy: false,
      recalcRate: 0,
      statusTabs: [
        { value: 'all', label: 'All' },
        { value: 'draft', label: 'Drafts' },
        { value: 'paid', label: 'Paid' }
      ]
    }
  },
  computed: {
    currencies() {
      const set = new Set(this.employees.filter((e) => e.status !== 'terminated').map((e) => e.currency))
      if (!set.size) set.add(orgCurrency())
      return [...set].sort()
    },
    periodEnd() {
      const s = this.form.period_start
      if (!s) return ''
      if (this.form.frequency === 'weekly') return addDays(s, 6)
      if (this.form.frequency === 'fortnightly') return addDays(s, 13)
      const d = new Date(s + 'T00:00:00')
      d.setMonth(d.getMonth() + 1)
      d.setDate(d.getDate() - 1)
      return isoDate(d)
    }
  },
  created() {
    this.load()
  },
  beforeUnmount() {
    clearTimeout(this.previewTimer)
  },
  methods: {
    money: formatMoney,
    date: formatDate,
    dateTime: formatDateTime,
    cap: (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : ''),
    basis(l, cur, freq) {
      if (l.pay_type === 'salary') return `${formatMoney(l.rate, cur)}/yr ÷ ${{ weekly: 52, fortnightly: 26, monthly: 12 }[freq] || '?'}`
      return `${Math.round(l.hours * 100) / 100} h × ${formatMoney(l.rate, cur)}`
    },
    setStatus(s) {
      this.status = s
      this.load()
    },
    async load() {
      this.loading = true
      this.error = ''
      try {
        const { data } = await api.get('/hr/payruns', { params: { status: this.status } })
        this.rows = data.data.pay_runs || []
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load pay runs')
      } finally {
        this.loading = false
      }
    },
    openCreate() {
      if (!this.canManage) return
      if (!this.employees.length) {
        toast.info('Add employees before creating a pay run')
        return
      }
      const start = addDays(mondayOf(), -7)
      this.form = { frequency: 'weekly', period_start: start, pay_date: '', currency: this.currencies[0], deduction_rate: 0, notes: '' }
      this.preview = null
      this.previewError = ''
      this.creating = true
      this.runPreview()
    },
    closeCreate() {
      if (!this.saving) this.creating = false
    },
    body() {
      return { ...this.form, deduction_rate: Number(this.form.deduction_rate) || 0, pay_date: this.form.pay_date || undefined }
    },
    schedulePreview() {
      clearTimeout(this.previewTimer)
      this.previewTimer = setTimeout(this.runPreview, 300)
    },
    async runPreview() {
      if (!this.form.period_start) return
      this.previewing = true
      try {
        const { data } = await api.post('/hr/payruns/preview', this.body())
        this.preview = data.data
        this.previewError = data.data.pay_run.employee_count ? '' : 'Nobody has anything to be paid for this period yet. Approve timesheets or check pay rates.'
      } catch (e) {
        this.preview = null
        this.previewError = apiErrorMessage(e, 'Could not calculate this pay run')
      } finally {
        this.previewing = false
      }
    },
    async create() {
      this.saving = true
      try {
        const { data } = await api.post('/hr/payruns', this.body())
        toast.success(`${data.data.pay_run.number} created as a draft`)
        this.creating = false
        this.status = 'all'
        await this.load()
        this.$emit('changed')
        this.openDetail(data.data.pay_run)
      } catch (e) {
        this.previewError = apiErrorMessage(e, 'Could not create pay run')
      } finally {
        this.saving = false
      }
    },
    async openDetail(r) {
      this.detail = { ...r, lines: r.lines || [] }
      this.recalcRate = r.deduction_rate
      try {
        const { data } = await api.get(`/hr/payruns/${r.id}`)
        this.detail = data.data
        this.recalcRate = data.data.deduction_rate
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not load pay run'))
      }
    },
    async recalculate() {
      this.detailBusy = true
      try {
        const { data } = await api.post(`/hr/payruns/${this.detail.id}/recalculate`, { deduction_rate: Number(this.recalcRate) || 0 })
        this.detail = data.data.pay_run
        const skipped = (data.data.skipped || []).length
        toast.success(`Recalculated${skipped ? ` · ${skipped} not included` : ''}`)
        this.load()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not recalculate'))
      } finally {
        this.detailBusy = false
      }
    },
    async markPaid() {
      const d = this.detail
      const okd = await confirmDialog({
        title: `Mark ${d.number} as paid?`,
        message: `${formatMoney(d.total_net, d.currency)} net to ${d.employee_count} people. The hours in this run are locked and it can no longer be edited.`,
        confirmText: 'Mark as paid'
      })
      if (!okd) return
      this.detailBusy = true
      try {
        const { data } = await api.post(`/hr/payruns/${d.id}/paid`)
        this.detail = data.data
        toast.success(`${d.number} marked as paid`)
        this.load()
        this.$emit('changed')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not mark as paid'))
      } finally {
        this.detailBusy = false
      }
    },
    async removeRun() {
      const d = this.detail
      const okd = await confirmDialog({ title: `Delete ${d.number}?`, message: 'This draft pay run will be removed. Timesheets are not affected.', confirmText: 'Delete', danger: true })
      if (!okd) return
      this.detailBusy = true
      try {
        await api.delete(`/hr/payruns/${d.id}`)
        toast.success('Draft deleted')
        this.detail = null
        this.load()
        this.$emit('changed')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not delete pay run'))
      } finally {
        this.detailBusy = false
      }
    },
    async exportCsv() {
      try {
        const res = await api.get(`/hr/payruns/${this.detail.id}/export`, { responseType: 'blob' })
        downloadBlob(res.data, `${this.detail.number}.csv`)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Export failed'))
      }
    }
  }
}
</script>

<style scoped>
.block {
  display: block;
  font-size: 12px;
}

.form-grid.four {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.form-grid.four .span-3 {
  grid-column: span 3;
}

.preview {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.preview__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.preview h3 {
  font-size: 14px;
  font-weight: 650;
  margin: 0;
}

.lines {
  margin-top: 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  max-height: 340px;
  overflow: auto;
}

.skipped {
  margin-top: 14px;
  padding: 12px 14px;
  border-radius: var(--radius);
  background: var(--surface-2);
  border: 1px dashed var(--border-strong);
  font-size: 13px;
}

.skipped ul {
  margin: 6px 0 0;
  padding-left: 18px;
}

.recalc {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 16px;
}

.spread {
  justify-content: space-between;
  flex-wrap: wrap;
}

@media (max-width: 760px) {
  .form-grid.four {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .form-grid.four .span-3 {
    grid-column: 1 / -1;
  }
}
</style>
