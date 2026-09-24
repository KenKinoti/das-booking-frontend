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
      </div>
    </div>

    <div v-if="error" class="ui-card__body">
      <div class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span></div>
    </div>
    <div v-else-if="loading && !rows.length" class="ui-card__body">
      <div v-for="n in 4" :key="n" class="sk-row"><div class="ui-skeleton" style="flex: 1"></div><div class="ui-skeleton" style="width: 160px"></div><div class="ui-skeleton" style="width: 80px"></div></div>
    </div>
    <div v-else-if="!rows.length" class="ui-empty">
      <div class="ui-empty__icon"><i class="fa-solid fa-umbrella-beach"></i></div>
      <h3>{{ status === 'pending' ? 'No requests waiting' : 'No leave requests' }}</h3>
      <p>{{ employees.length ? 'Record annual, sick or other leave for your team.' : 'Add employees first, then record their leave.' }}</p>
      <button v-if="employees.length" class="ui-btn ui-btn--primary" style="margin-top: 12px" @click="openCreate"><i class="fa-solid fa-plus"></i> Request leave</button>
    </div>
    <div v-else class="ui-table-wrap" :class="{ 'is-loading': loading }">
      <table class="ui-table">
        <thead>
          <tr>
            <th>Employee</th>
            <th>Type</th>
            <th>Dates</th>
            <th class="num">Days</th>
            <th class="hide-md">Reason</th>
            <th>Status</th>
            <th style="width: 1%"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="l in rows" :key="l.id">
            <td><span class="strong">{{ l.employee_name || 'Former employee' }}</span></td>
            <td><span class="type-chip" :class="`type-${l.type}`">{{ typeLabel(l.type) }}</span></td>
            <td class="nowrap">
              {{ date(l.start_date) }}<template v-if="l.end_date !== l.start_date"> – {{ date(l.end_date) }}</template>
              <small v-if="isCurrent(l)" class="now-pill">Now</small>
            </td>
            <td class="num tnum">{{ l.days }}</td>
            <td class="hide-md muted reason">{{ l.reason || '—' }}</td>
            <td><span class="ui-badge" :class="badge(l.status)">{{ cap(l.status) }}</span></td>
            <td>
              <div class="row-actions">
                <template v-if="l.status === 'pending' && canManage">
                  <button class="ui-btn ui-btn--sm ui-btn--success" :disabled="busy === l.id" @click="decide(l, 'approve')"><i class="fa-solid fa-check"></i> Approve</button>
                  <button class="ui-btn ui-btn--sm" :disabled="busy === l.id" @click="decide(l, 'reject')"><i class="fa-solid fa-xmark"></i> Reject</button>
                </template>
                <button v-if="l.status === 'pending'" class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" aria-label="Edit request" title="Edit" @click="openEdit(l)"><i class="fa-regular fa-pen-to-square"></i></button>
                <button v-if="l.status === 'pending' || canManage" class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" aria-label="Delete request" title="Delete" @click="remove(l)"><i class="fa-regular fa-trash-can"></i></button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="modal" class="ui-modal-backdrop" @mousedown.self="close">
      <form class="ui-modal" style="max-width: 560px" novalidate @submit.prevent="save">
        <div class="ui-modal__head">
          <h2>{{ form.id ? 'Edit leave request' : 'Request leave' }}</h2>
          <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="close"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="ui-modal__body">
          <div v-if="formError" class="ui-alert ui-alert--danger" style="margin-bottom: 16px"><i class="fa-solid fa-circle-exclamation"></i><span>{{ formError }}</span></div>
          <div class="form-grid">
            <label class="ui-field span-2">
              <span class="ui-label">Employee *</span>
              <select v-model="form.employee_id" class="ui-select" :class="{ 'is-invalid': errors.employee_id }">
                <option value="">Choose an employee…</option>
                <option v-for="e in activeEmployees" :key="e.id" :value="e.id">{{ e.full_name }}</option>
              </select>
              <span v-if="errors.employee_id" class="field-error">{{ errors.employee_id }}</span>
            </label>
            <label class="ui-field span-2">
              <span class="ui-label">Leave type</span>
              <select v-model="form.type" class="ui-select">
                <option v-for="t in types" :key="t.value" :value="t.value">{{ t.label }}</option>
              </select>
            </label>
            <label class="ui-field">
              <span class="ui-label">From *</span>
              <input v-model="form.start_date" type="date" class="ui-input" :class="{ 'is-invalid': errors.dates }" @change="syncEnd" />
            </label>
            <label class="ui-field">
              <span class="ui-label">To *</span>
              <input v-model="form.end_date" type="date" class="ui-input" :min="form.start_date" :class="{ 'is-invalid': errors.dates }" />
            </label>
            <div class="span-2">
              <span v-if="errors.dates" class="field-error">{{ errors.dates }}</span>
              <span v-else-if="workdays" class="ui-hint"><i class="fa-regular fa-calendar"></i> {{ workdays }} working day{{ workdays === 1 ? '' : 's' }} (weekends excluded)</span>
            </div>
            <label class="ui-field span-2">
              <span class="ui-label">Reason / notes</span>
              <textarea v-model="form.reason" rows="3" class="ui-textarea" maxlength="2000" placeholder="Optional"></textarea>
            </label>
          </div>
        </div>
        <div class="ui-modal__foot">
          <button type="button" class="ui-btn" @click="close">Cancel</button>
          <button type="submit" class="ui-btn ui-btn--primary" :disabled="saving"><i :class="saving ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-check'"></i> {{ form.id ? 'Save changes' : 'Submit request' }}</button>
        </div>
      </form>
    </div>
  </section>
</template>

<script>
import '@/styles/module-page.css'
import api, { apiErrorMessage } from '@/services/api'
import { formatDate, isoDate } from '@/utils/format'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'

const TYPES = [
  { value: 'annual', label: 'Annual' },
  { value: 'sick', label: 'Sick' },
  { value: 'personal', label: 'Personal' },
  { value: 'parental', label: 'Parental' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'other', label: 'Other' }
]

export default {
  name: 'HrLeave',
  props: { employees: { type: Array, default: () => [] }, canManage: Boolean },
  emits: ['changed'],
  data() {
    return {
      rows: [],
      status: 'pending',
      employeeId: '',
      loading: false,
      error: '',
      busy: '',
      modal: false,
      form: {},
      errors: {},
      formError: '',
      saving: false,
      types: TYPES,
      statusTabs: [
        { value: 'pending', label: 'Pending' },
        { value: 'approved', label: 'Approved' },
        { value: 'rejected', label: 'Rejected' },
        { value: 'all', label: 'All' }
      ]
    }
  },
  computed: {
    activeEmployees() {
      return this.employees.filter((e) => e.status !== 'terminated' || e.id === this.form.employee_id)
    },
    workdays() {
      const { start_date: s, end_date: e } = this.form
      if (!s || !e || e < s) return 0
      let n = 0
      for (let d = new Date(s + 'T00:00:00'); isoDate(d) <= e; d.setDate(d.getDate() + 1)) if (d.getDay() % 6 !== 0) n++
      return n
    }
  },
  created() {
    this.load()
  },
  methods: {
    date: formatDate,
    cap: (s) => s.charAt(0).toUpperCase() + s.slice(1),
    typeLabel(t) {
      return (TYPES.find((x) => x.value === t) || {}).label || t
    },
    badge(s) {
      return { pending: 'ui-badge--warning', approved: 'ui-badge--success', rejected: 'ui-badge--danger' }[s]
    },
    isCurrent(l) {
      const t = isoDate()
      return l.status === 'approved' && l.start_date <= t && l.end_date >= t
    },
    setStatus(s) {
      this.status = s
      this.load()
    },
    async load() {
      this.loading = true
      this.error = ''
      try {
        const { data } = await api.get('/hr/leave', { params: { status: this.status, employee_id: this.employeeId || undefined } })
        this.rows = data.data.leave || []
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load leave requests')
      } finally {
        this.loading = false
      }
    },
    openCreate() {
      const t = isoDate()
      this.form = { id: '', employee_id: this.employeeId || '', type: 'annual', start_date: t, end_date: t, reason: '' }
      this.errors = {}
      this.formError = ''
      this.modal = true
    },
    openEdit(l) {
      this.form = { ...l }
      this.errors = {}
      this.formError = ''
      this.modal = true
    },
    close() {
      if (!this.saving) this.modal = false
    },
    syncEnd() {
      if (!this.form.end_date || this.form.end_date < this.form.start_date) this.form.end_date = this.form.start_date
    },
    async save() {
      const e = {}
      if (!this.form.employee_id) e.employee_id = 'Choose an employee'
      if (!this.form.start_date || !this.form.end_date) e.dates = 'Choose the dates'
      else if (this.form.end_date < this.form.start_date) e.dates = "End date can't be before the start date"
      else if (!this.workdays) e.dates = 'Those dates only cover a weekend'
      this.errors = e
      if (Object.keys(e).length) return
      this.saving = true
      this.formError = ''
      try {
        const body = { employee_id: this.form.employee_id, type: this.form.type, start_date: this.form.start_date, end_date: this.form.end_date, reason: this.form.reason }
        if (this.form.id) await api.put(`/hr/leave/${this.form.id}`, body)
        else await api.post('/hr/leave', body)
        toast.success(this.form.id ? 'Leave request updated' : 'Leave request submitted')
        this.modal = false
        if (!this.form.id && this.status !== 'pending' && this.status !== 'all') this.status = 'pending'
        this.load()
        this.$emit('changed')
      } catch (err) {
        this.formError = apiErrorMessage(err, 'Could not save leave request')
      } finally {
        this.saving = false
      }
    },
    async decide(l, action) {
      this.busy = l.id
      try {
        await api.post(`/hr/leave/${l.id}/${action}`)
        toast.success(action === 'approve' ? `Leave approved for ${l.employee_name}` : 'Leave request rejected')
        this.load()
        this.$emit('changed')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not update request'))
      } finally {
        this.busy = ''
      }
    },
    async remove(l) {
      const okd = await confirmDialog({ title: 'Delete this leave request?', message: `${this.typeLabel(l.type)} leave for ${l.employee_name}, ${formatDate(l.start_date)} – ${formatDate(l.end_date)}.`, confirmText: 'Delete', danger: true })
      if (!okd) return
      try {
        await api.delete(`/hr/leave/${l.id}`)
        toast.success('Leave request deleted')
        this.load()
        this.$emit('changed')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not delete request'))
      }
    }
  }
}
</script>

<style scoped>
.type-chip {
  display: inline-flex;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  background: var(--neutral-soft);
  color: var(--text-2);
}
.type-annual { background: var(--accent-soft); color: var(--accent); }
.type-sick { background: var(--danger-soft); color: var(--danger); }
.type-parental { background: var(--info-soft); color: var(--info); }
.type-personal { background: var(--warning-soft); color: var(--warning); }

.now-pill {
  margin-left: 8px;
  font-size: 11px;
  font-weight: 700;
  color: var(--success);
  background: var(--success-soft);
  padding: 1px 7px;
  border-radius: 999px;
}

.reason {
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
