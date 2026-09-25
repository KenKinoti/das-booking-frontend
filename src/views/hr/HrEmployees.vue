<template>
  <section class="mp ui-card">
    <div class="toolbar">
      <div class="ui-tabs" role="tablist">
        <button v-for="s in statusTabs" :key="s.value" class="ui-tab" :class="{ 'is-active': status === s.value }" @click="status = s.value">
          {{ s.label }} <span class="count">{{ countFor(s.value) }}</span>
        </button>
      </div>
      <div class="toolbar__right">
        <div class="ui-input-group search">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input v-model="q" class="ui-input" type="search" placeholder="Search name, email, role…" aria-label="Search employees" />
        </div>
        <select v-model="dept" class="ui-select filter" aria-label="Department">
          <option value="">All departments</option>
          <option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</option>
          <option value="none">No department</option>
        </select>
      </div>
    </div>

    <div v-if="loading && !employees.length" class="ui-card__body">
      <div v-for="n in 5" :key="n" class="sk-row">
        <div class="ui-skeleton" style="width: 34px; height: 34px"></div>
        <div class="ui-skeleton" style="flex: 1"></div>
        <div class="ui-skeleton" style="width: 120px"></div>
        <div class="ui-skeleton" style="width: 90px"></div>
      </div>
    </div>

    <div v-else-if="!employees.length" class="ui-empty">
      <div class="ui-empty__icon"><i class="fa-solid fa-id-badge"></i></div>
      <h3>No employees yet</h3>
      <p>Add your team to track leave, timesheets and run payroll.</p>
      <button v-if="canManage" class="ui-btn ui-btn--primary" style="margin-top: 12px" @click="openCreate"><i class="fa-solid fa-user-plus"></i> Add employee</button>
    </div>

    <div v-else-if="!filtered.length" class="ui-empty">
      <div class="ui-empty__icon"><i class="fa-solid fa-filter"></i></div>
      <h3>Nothing matches your filters</h3>
      <p>Try a different search, status or department.</p>
    </div>

    <div v-else class="ui-table-wrap">
      <table class="ui-table">
        <thead>
          <tr>
            <th>Employee</th>
            <th class="hide-sm">Position</th>
            <th class="hide-md">Department</th>
            <th class="hide-md">Type</th>
            <th class="num">Pay</th>
            <th>Status</th>
            <th style="width: 90px"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="e in filtered" :key="e.id" :class="{ 'is-clickable': canManage }" @click="canManage && openEdit(e)">
            <td>
              <div class="person">
                <span class="avatar">{{ initials(e.full_name) }}</span>
                <span>
                  <span class="strong">{{ e.full_name }}</span>
                  <small>{{ e.email || e.phone || '—' }}<template v-if="e.user_id"> · <i class="fa-solid fa-link" title="Linked to a user account"></i></template></small>
                </span>
              </div>
            </td>
            <td class="hide-sm">{{ e.position || '—' }}</td>
            <td class="hide-md">{{ e.department_name || '—' }}</td>
            <td class="hide-md muted">{{ typeLabel(e.employment_type) }}</td>
            <td class="num tnum nowrap">
              <strong>{{ money(e.pay_rate, e.currency) }}</strong>
              <small class="muted"> {{ e.pay_type === 'salary' ? '/ yr' : '/ hr' }}</small>
            </td>
            <td><span class="ui-badge" :class="statusBadge(e.status)">{{ statusLabel(e.status) }}</span></td>
            <td @click.stop>
              <div v-if="canManage" class="row-actions">
                <button class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" :aria-label="`Edit ${e.full_name}`" title="Edit" @click="openEdit(e)"><i class="fa-regular fa-pen-to-square"></i></button>
                <button class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" :aria-label="`Delete ${e.full_name}`" title="Delete" @click="remove(e)"><i class="fa-regular fa-trash-can"></i></button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-if="filtered.length" class="table-foot">
      <span>{{ filtered.length }} of {{ employees.length }} employee{{ employees.length === 1 ? '' : 's' }}</span>
      <span v-if="annualCost" class="tnum">Salaried cost: {{ annualCost }} / yr</span>
    </div>

    <!-- Create / edit -->
    <div v-if="modal" class="ui-modal-backdrop" @mousedown.self="close">
      <form class="ui-modal" style="max-width: 760px" @submit.prevent="save" novalidate>
        <div class="ui-modal__head">
          <h2>{{ form.id ? 'Edit employee' : 'Add employee' }}</h2>
          <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="close"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="ui-modal__body">
          <div v-if="formError" class="ui-alert ui-alert--danger" style="margin-bottom: 16px"><i class="fa-solid fa-circle-exclamation"></i><span>{{ formError }}</span></div>
          <div class="form-grid">
            <div class="form-section span-2">Personal details</div>
            <label class="ui-field">
              <span class="ui-label">First name *</span>
              <input ref="first" v-model.trim="form.first_name" class="ui-input" :class="{ 'is-invalid': errors.first_name }" maxlength="100" autocomplete="off" />
              <span v-if="errors.first_name" class="field-error">{{ errors.first_name }}</span>
            </label>
            <label class="ui-field">
              <span class="ui-label">Last name</span>
              <input v-model.trim="form.last_name" class="ui-input" maxlength="100" autocomplete="off" />
            </label>
            <label class="ui-field">
              <span class="ui-label">Email</span>
              <input v-model.trim="form.email" type="email" class="ui-input" :class="{ 'is-invalid': errors.email }" maxlength="255" autocomplete="off" />
              <span v-if="errors.email" class="field-error">{{ errors.email }}</span>
            </label>
            <label class="ui-field">
              <span class="ui-label">Phone</span>
              <input v-model.trim="form.phone" type="tel" class="ui-input" maxlength="40" autocomplete="off" />
            </label>

            <div class="form-section span-2">Role</div>
            <label class="ui-field">
              <span class="ui-label">Position</span>
              <input v-model.trim="form.position" class="ui-input" maxlength="120" placeholder="e.g. Barista" />
            </label>
            <label class="ui-field">
              <span class="ui-label">Department</span>
              <select v-model="form.department_id" class="ui-select">
                <option value="">— None —</option>
                <option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</option>
              </select>
              <a href="#" class="ui-hint" @click.prevent="$emit('manage-departments')">Manage departments</a>
            </label>
            <label class="ui-field">
              <span class="ui-label">Employment type</span>
              <select v-model="form.employment_type" class="ui-select">
                <option v-for="t in types" :key="t.value" :value="t.value">{{ t.label }}</option>
              </select>
            </label>
            <label class="ui-field">
              <span class="ui-label">Start date</span>
              <input v-model="form.start_date" type="date" class="ui-input" />
            </label>
            <label class="ui-field">
              <span class="ui-label">Status</span>
              <select v-model="form.status" class="ui-select">
                <option value="active">Active</option>
                <option value="on_leave">On leave</option>
                <option value="terminated">Terminated</option>
              </select>
            </label>
            <label class="ui-field">
              <span class="ui-label">App user (optional)</span>
              <select v-model="form.user_id" class="ui-select">
                <option value="">— Not linked —</option>
                <option v-for="u in users" :key="u.id" :value="u.id">{{ userLabel(u) }}</option>
              </select>
            </label>

            <div class="form-section span-2">Pay</div>
            <label class="ui-field">
              <span class="ui-label">Pay type</span>
              <select v-model="form.pay_type" class="ui-select">
                <option value="hourly">Hourly — paid for approved timesheet hours</option>
                <option value="salary">Salary — fixed annual amount</option>
              </select>
            </label>
            <label class="ui-field">
              <span class="ui-label">{{ form.pay_type === 'salary' ? 'Annual salary *' : 'Hourly rate *' }}</span>
              <input v-model="form.pay_rate" type="number" min="0" step="0.01" inputmode="decimal" class="ui-input tnum" :class="{ 'is-invalid': errors.pay_rate }" />
              <span v-if="errors.pay_rate" class="field-error">{{ errors.pay_rate }}</span>
              <span v-else-if="form.pay_type === 'salary' && Number(form.pay_rate) > 0" class="ui-hint">≈ {{ money(form.pay_rate / 12, form.currency) }} a month</span>
            </label>
            <label class="ui-field">
              <span class="ui-label">Currency</span>
              <select v-model="form.currency" class="ui-select">
                <optgroup v-for="g in currencyGroups" :key="g.region" :label="g.region">
                  <option v-for="c in g.items" :key="c.code" :value="c.code">{{ c.code }} — {{ c.name }}</option>
                </optgroup>
              </select>
            </label>
            <label class="ui-field span-2">
              <span class="ui-label">Notes</span>
              <textarea v-model="form.notes" class="ui-textarea" rows="2" maxlength="5000"></textarea>
            </label>
          </div>
        </div>
        <div class="ui-modal__foot">
          <button type="button" class="ui-btn" @click="close">Cancel</button>
          <button type="submit" class="ui-btn ui-btn--primary" :disabled="saving">
            <i :class="saving ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-check'"></i> {{ form.id ? 'Save changes' : 'Add employee' }}
          </button>
        </div>
      </form>
    </div>
  </section>
</template>

<script>
import { orgCurrency } from '@/utils/orgDefaults'
import '@/styles/module-page.css'
import api, { apiErrorMessage, listFrom } from '@/services/api'
import { formatMoney } from '@/utils/format'
import { currencyGroups } from '@/utils/currencies'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'

const TYPES = [
  { value: 'full_time', label: 'Full time' },
  { value: 'part_time', label: 'Part time' },
  { value: 'casual', label: 'Casual' },
  { value: 'contractor', label: 'Contractor' }
]

function blank(currency) {
  return { id: '', first_name: '', last_name: '', email: '', phone: '', position: '', department_id: '', employment_type: 'full_time', start_date: '', status: 'active', user_id: '', pay_type: 'hourly', pay_rate: '', currency: currency || orgCurrency(), notes: '' }
}

export default {
  name: 'HrEmployees',
  props: {
    employees: { type: Array, default: () => [] },
    departments: { type: Array, default: () => [] },
    loading: Boolean,
    canManage: Boolean
  },
  emits: ['changed', 'manage-departments'],
  data() {
    return {
      q: '',
      status: 'current',
      dept: '',
      modal: false,
      form: blank(),
      errors: {},
      formError: '',
      saving: false,
      users: [],
      types: TYPES,
      currencyGroups: currencyGroups()
    }
  },
  computed: {
    statusTabs() {
      return [
        { value: 'current', label: 'Current' },
        { value: 'active', label: 'Active' },
        { value: 'on_leave', label: 'On leave' },
        { value: 'terminated', label: 'Former' },
        { value: 'all', label: 'All' }
      ]
    },
    filtered() {
      const q = this.q.toLowerCase()
      return this.employees.filter((e) => {
        if (!this.matchStatus(e, this.status)) return false
        if (this.dept === 'none' && e.department_id) return false
        if (this.dept && this.dept !== 'none' && e.department_id !== this.dept) return false
        if (!q) return true
        return [e.full_name, e.email, e.position, e.department_name, e.phone].some((v) => (v || '').toLowerCase().includes(q))
      })
    },
    annualCost() {
      const byCur = {}
      for (const e of this.filtered) if (e.pay_type === 'salary' && e.status !== 'terminated') byCur[e.currency] = (byCur[e.currency] || 0) + Number(e.pay_rate || 0)
      return Object.entries(byCur)
        .map(([c, v]) => formatMoney(v, c))
        .join(' + ')
    },
    defaultCurrency() {
      const counts = {}
      for (const e of this.employees) counts[e.currency] = (counts[e.currency] || 0) + 1
      return Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0] || orgCurrency()
    }
  },
  methods: {
    money: formatMoney,
    matchStatus(e, s) {
      if (s === 'all') return true
      if (s === 'current') return e.status !== 'terminated'
      return e.status === s
    },
    countFor(s) {
      return this.employees.filter((e) => this.matchStatus(e, s)).length
    },
    initials(name = '') {
      return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '?'
    },
    typeLabel(t) {
      return (TYPES.find((x) => x.value === t) || {}).label || t
    },
    statusLabel(s) {
      return { active: 'Active', on_leave: 'On leave', terminated: 'Former' }[s] || s
    },
    statusBadge(s) {
      return { active: 'ui-badge--success', on_leave: 'ui-badge--info', terminated: 'ui-badge--draft' }[s] || ''
    },
    userLabel(u) {
      const n = `${u.first_name || ''} ${u.last_name || ''}`.trim()
      return n ? `${n} (${u.email})` : u.email
    },
    async loadUsers() {
      if (this.users.length) return
      try {
        const res = await api.get('/users', { params: { limit: 500 } })
        this.users = listFrom(res, 'users', 'data')
      } catch {
        this.users = []
      }
    },
    openCreate() {
      if (!this.canManage) return
      this.form = blank(this.defaultCurrency)
      this.errors = {}
      this.formError = ''
      this.modal = true
      this.loadUsers()
      this.$nextTick(() => this.$refs.first && this.$refs.first.focus())
    },
    openEdit(e) {
      this.form = { ...blank(), ...e, department_id: e.department_id || '', user_id: e.user_id || '', pay_rate: e.pay_rate }
      this.errors = {}
      this.formError = ''
      this.modal = true
      this.loadUsers()
    },
    close() {
      if (!this.saving) this.modal = false
    },
    validate() {
      const e = {}
      if (!this.form.first_name) e.first_name = 'First name is required'
      if (this.form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.form.email)) e.email = 'Enter a valid email'
      const rate = Number(this.form.pay_rate)
      if (this.form.pay_rate === '' || Number.isNaN(rate) || rate < 0) e.pay_rate = 'Enter a pay rate of 0 or more'
      this.errors = e
      return !Object.keys(e).length
    },
    async save() {
      if (!this.validate()) return
      this.saving = true
      this.formError = ''
      const body = { ...this.form, pay_rate: Number(this.form.pay_rate), department_id: this.form.department_id || null, user_id: this.form.user_id || null }
      try {
        if (this.form.id) await api.put(`/hr/employees/${this.form.id}`, body)
        else await api.post('/hr/employees', body)
        toast.success(this.form.id ? 'Employee updated' : `${this.form.first_name} added to the team`)
        this.modal = false
        this.$emit('changed')
      } catch (err) {
        this.formError = apiErrorMessage(err, 'Could not save employee')
      } finally {
        this.saving = false
      }
    },
    async remove(e) {
      const okd = await confirmDialog({
        title: `Delete ${e.full_name}?`,
        message: 'Their pending leave and unpaid timesheets are removed too. Past pay runs keep their records. To keep history, set their status to Former instead.',
        confirmText: 'Delete employee',
        danger: true
      })
      if (!okd) return
      try {
        await api.delete(`/hr/employees/${e.id}`)
        toast.success('Employee deleted')
        this.$emit('changed')
      } catch (err) {
        toast.error(apiErrorMessage(err, 'Could not delete employee'))
      }
    }
  }
}
</script>

