<template>
  <section class="mp ui-card">
    <div class="toolbar">
      <div class="ui-tabs" role="tablist">
        <button v-for="s in statusTabs" :key="s.value" class="ui-tab" :class="{ 'is-active': status === s.value }" @click="setStatus(s.value)">{{ s.label }}</button>
      </div>
      <div class="toolbar__right">
        <select v-model="employeeId" class="ui-select filter" aria-label="Employee" @change="load">
          <option value="">All employees</option>
          <option v-for="e in employees" :key="e.id" :value="e.id">{{ e.full_name }}</option>
        </select>
        <input v-model="from" type="date" class="ui-input date" aria-label="From" @change="load" />
        <input v-model="to" type="date" class="ui-input date" aria-label="To" @change="load" />
      </div>
    </div>

    <div v-if="canManage && selectable.length" class="bulkbar">
      <label class="check"><input type="checkbox" :checked="allSelected" @change="toggleAll($event.target.checked)" /> Select all to approve</label>
      <div class="ui-actions">
        <span class="muted small">{{ selected.length }} selected</span>
        <button class="ui-btn ui-btn--sm ui-btn--success" :disabled="!selected.length || bulkBusy" @click="bulk('approve')"><i :class="bulkBusy ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-check-double'"></i> Approve selected</button>
        <button class="ui-btn ui-btn--sm" :disabled="!selected.length || bulkBusy" @click="bulk('reject')"><i class="fa-solid fa-xmark"></i> Reject</button>
      </div>
    </div>

    <div v-if="error" class="ui-card__body">
      <div class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span></div>
    </div>
    <div v-else-if="loading && !rows.length" class="ui-card__body">
      <div v-for="n in 5" :key="n" class="sk-row"><div class="ui-skeleton" style="width: 100px"></div><div class="ui-skeleton" style="flex: 1"></div><div class="ui-skeleton" style="width: 60px"></div></div>
    </div>
    <div v-else-if="!rows.length" class="ui-empty">
      <div class="ui-empty__icon"><i class="fa-solid fa-clock"></i></div>
      <h3>No timesheets in this range</h3>
      <p>{{ employees.length ? 'Log hours worked; approved hours flow into the next pay run.' : 'Add employees first, then log their hours.' }}</p>
      <button v-if="employees.length" class="ui-btn ui-btn--primary" style="margin-top: 12px" @click="openCreate"><i class="fa-solid fa-plus"></i> Log hours</button>
    </div>
    <div v-else class="ui-table-wrap" :class="{ 'is-loading': loading }">
      <table class="ui-table">
        <thead>
          <tr>
            <th v-if="canManage && selectable.length" style="width: 36px"></th>
            <th>Date</th>
            <th>Employee</th>
            <th class="num">Hours</th>
            <th class="hide-md">Notes</th>
            <th>Status</th>
            <th style="width: 1%"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in rows" :key="t.id">
            <td v-if="canManage && selectable.length">
              <input v-if="t.status === 'submitted'" v-model="selected" type="checkbox" :value="t.id" :aria-label="`Select ${t.employee_name} ${t.date}`" />
            </td>
            <td class="nowrap">{{ weekday(t.date) }} <span class="muted">{{ date(t.date) }}</span></td>
            <td class="strong">{{ t.employee_name || 'Former employee' }}</td>
            <td class="num tnum strong">{{ hrs(t.hours) }}</td>
            <td class="hide-md muted notes">{{ t.notes || '—' }}</td>
            <td>
              <span class="ui-badge" :class="badge(t)">{{ label(t) }}</span>
            </td>
            <td>
              <div class="row-actions">
                <template v-if="t.status === 'submitted' && canManage">
                  <button class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" aria-label="Approve" title="Approve" :disabled="busy === t.id" @click="decide(t, 'approve')"><i class="fa-solid fa-check txt-success"></i></button>
                  <button class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" aria-label="Reject" title="Reject" :disabled="busy === t.id" @click="decide(t, 'reject')"><i class="fa-solid fa-xmark txt-danger"></i></button>
                </template>
                <template v-if="!t.pay_run_id && (t.status !== 'approved' || canManage)">
                  <button class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" aria-label="Edit" title="Edit" @click="openEdit(t)"><i class="fa-regular fa-pen-to-square"></i></button>
                  <button class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" aria-label="Delete" title="Delete" @click="remove(t)"><i class="fa-regular fa-trash-can"></i></button>
                </template>
                <i v-if="t.pay_run_id" class="fa-solid fa-lock muted" title="Paid — locked"></i>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-if="rows.length" class="table-foot">
      <span>{{ rows.length }} entr{{ rows.length === 1 ? 'y' : 'ies' }}</span>
      <span class="tnum"><strong>{{ hrs(totalHours) }}</strong> total (excluding rejected)</span>
    </div>

    <div v-if="modal" class="ui-modal-backdrop" @mousedown.self="close">
      <form class="ui-modal" style="max-width: 520px" novalidate @submit.prevent="save">
        <div class="ui-modal__head">
          <h2>{{ form.id ? 'Edit timesheet' : 'Log hours' }}</h2>
          <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="close"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="ui-modal__body">
          <div v-if="formError" class="ui-alert ui-alert--danger" style="margin-bottom: 16px"><i class="fa-solid fa-circle-exclamation"></i><span>{{ formError }}</span></div>
          <div v-if="form.id && form.status === 'approved'" class="ui-alert ui-alert--warning" style="margin-bottom: 16px"><i class="fa-solid fa-triangle-exclamation"></i><span>Saving changes sends this entry back for approval.</span></div>
          <div class="form-grid">
            <label class="ui-field span-2">
              <span class="ui-label">Employee *</span>
              <select v-model="form.employee_id" class="ui-select" :class="{ 'is-invalid': errors.employee_id }">
                <option value="">Choose an employee…</option>
                <option v-for="e in employees.filter((x) => x.status !== 'terminated' || x.id === form.employee_id)" :key="e.id" :value="e.id">{{ e.full_name }}</option>
              </select>
              <span v-if="errors.employee_id" class="field-error">{{ errors.employee_id }}</span>
            </label>
            <label class="ui-field">
              <span class="ui-label">Date *</span>
              <input v-model="form.date" type="date" class="ui-input" :max="today" :class="{ 'is-invalid': errors.date }" />
              <span v-if="errors.date" class="field-error">{{ errors.date }}</span>
            </label>
            <label class="ui-field">
              <span class="ui-label">Hours *</span>
              <input v-model="form.hours" type="number" min="0.25" max="24" step="0.25" inputmode="decimal" class="ui-input tnum" :class="{ 'is-invalid': errors.hours }" />
              <span v-if="errors.hours" class="field-error">{{ errors.hours }}</span>
            </label>
            <div class="quick span-2">
              <button v-for="h in [4, 6, 7.6, 8, 10]" :key="h" type="button" class="ui-btn ui-btn--sm" :class="{ 'ui-btn--primary': Number(form.hours) === h }" @click="form.hours = h">{{ h }} h</button>
            </div>
            <label class="ui-field span-2">
              <span class="ui-label">Notes</span>
              <textarea v-model="form.notes" class="ui-textarea" rows="2" maxlength="2000" placeholder="What was worked on (optional)"></textarea>
            </label>
          </div>
        </div>
        <div class="ui-modal__foot">
          <button type="button" class="ui-btn" @click="close">Cancel</button>
          <button type="submit" class="ui-btn ui-btn--primary" :disabled="saving"><i :class="saving ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-check'"></i> {{ form.id ? 'Save' : 'Log hours' }}</button>
        </div>
      </form>
    </div>
  </section>
</template>

<script>
import '@/styles/module-page.css'
import api, { apiErrorMessage } from '@/services/api'
import { formatDate, isoDate, addDays } from '@/utils/format'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'

export default {
  name: 'HrTimesheets',
  props: { employees: { type: Array, default: () => [] }, canManage: Boolean },
  emits: ['changed'],
  data() {
    const today = isoDate()
    return {
      rows: [],
      totalHours: 0,
      status: 'all',
      employeeId: '',
      from: addDays(today, -27),
      to: today,
      today,
      loading: false,
      error: '',
      busy: '',
      selected: [],
      bulkBusy: false,
      modal: false,
      form: {},
      errors: {},
      formError: '',
      saving: false,
      statusTabs: [
        { value: 'all', label: 'All' },
        { value: 'submitted', label: 'To approve' },
        { value: 'approved', label: 'Approved' },
        { value: 'rejected', label: 'Rejected' }
      ]
    }
  },
  computed: {
    selectable() {
      return this.rows.filter((r) => r.status === 'submitted')
    },
    allSelected() {
      return this.selectable.length > 0 && this.selected.length === this.selectable.length
    }
  },
  created() {
    this.load()
  },
  methods: {
    date: (d) => formatDate(d),
    weekday(d) {
      return new Date(d + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short' })
    },
    hrs(h) {
      const n = Number(h) || 0
      return `${Math.round(n * 100) / 100} h`
    },
    label(t) {
      if (t.pay_run_id) return 'Paid'
      return { submitted: 'To approve', approved: 'Approved', rejected: 'Rejected' }[t.status] || t.status
    },
    badge(t) {
      if (t.pay_run_id) return 'ui-badge--paid'
      return { submitted: 'ui-badge--warning', approved: 'ui-badge--info', rejected: 'ui-badge--danger' }[t.status]
    },
    setStatus(s) {
      this.status = s
      this.load()
    },
    toggleAll(on) {
      this.selected = on ? this.selectable.map((r) => r.id) : []
    },
    async load() {
      this.loading = true
      this.error = ''
      try {
        const { data } = await api.get('/hr/timesheets', { params: { status: this.status, employee_id: this.employeeId || undefined, from: this.from || undefined, to: this.to || undefined } })
        this.rows = data.data.timesheets || []
        this.totalHours = data.data.total_hours || 0
        this.selected = this.selected.filter((id) => this.rows.some((r) => r.id === id && r.status === 'submitted'))
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load timesheets')
      } finally {
        this.loading = false
      }
    },
    openCreate() {
      this.form = { id: '', employee_id: this.employeeId || '', date: this.today, hours: 8, notes: '' }
      this.errors = {}
      this.formError = ''
      this.modal = true
    },
    openEdit(t) {
      this.form = { ...t }
      this.errors = {}
      this.formError = ''
      this.modal = true
    },
    close() {
      if (!this.saving) this.modal = false
    },
    async save() {
      const e = {}
      const h = Number(this.form.hours)
      if (!this.form.employee_id) e.employee_id = 'Choose an employee'
      if (!this.form.date) e.date = 'Choose a date'
      else if (this.form.date > this.today) e.date = "Can't log hours in the future"
      if (!(h > 0 && h <= 24)) e.hours = 'Enter between 0.25 and 24 hours'
      this.errors = e
      if (Object.keys(e).length) return
      this.saving = true
      this.formError = ''
      try {
        const body = { employee_id: this.form.employee_id, date: this.form.date, hours: h, notes: this.form.notes }
        if (this.form.id) await api.put(`/hr/timesheets/${this.form.id}`, body)
        else await api.post('/hr/timesheets', body)
        toast.success(this.form.id ? 'Timesheet updated' : `${this.hrs(h)} logged`)
        this.modal = false
        if (this.form.date < this.from) this.from = this.form.date
        this.load()
        this.$emit('changed')
      } catch (err) {
        this.formError = apiErrorMessage(err, 'Could not save timesheet')
      } finally {
        this.saving = false
      }
    },
    async decide(t, action) {
      this.busy = t.id
      try {
        await api.post(`/hr/timesheets/${t.id}/${action}`)
        toast.success(action === 'approve' ? 'Timesheet approved' : 'Timesheet rejected')
        this.load()
        this.$emit('changed')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not update timesheet'))
      } finally {
        this.busy = ''
      }
    },
    async bulk(action) {
      const ids = [...this.selected]
      this.bulkBusy = true
      let done = 0
      for (const id of ids) {
        try {
          await api.post(`/hr/timesheets/${id}/${action}`)
          done++
        } catch (e) {
          toast.error(apiErrorMessage(e, 'Could not update a timesheet'))
        }
      }
      this.bulkBusy = false
      this.selected = []
      if (done) toast.success(`${done} timesheet${done === 1 ? '' : 's'} ${action === 'approve' ? 'approved' : 'rejected'}`)
      this.load()
      this.$emit('changed')
    },
    async remove(t) {
      const okd = await confirmDialog({ title: 'Delete this timesheet?', message: `${this.hrs(t.hours)} for ${t.employee_name} on ${formatDate(t.date)}.`, confirmText: 'Delete', danger: true })
      if (!okd) return
      try {
        await api.delete(`/hr/timesheets/${t.id}`)
        toast.success('Timesheet deleted')
        this.load()
        this.$emit('changed')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not delete timesheet'))
      }
    }
  }
}
</script>

<style scoped>
.date {
  width: 150px;
}

.bulkbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 10px 20px;
  background: var(--surface-2);
  border-bottom: 1px solid var(--border);
}

.check {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  font-size: 13px;
  color: var(--text-2);
  cursor: pointer;
}

.notes {
  max-width: 320px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.quick {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: -6px;
}

@media (max-width: 720px) {
  .date {
    width: calc(50% - 4px);
  }
}
</style>
