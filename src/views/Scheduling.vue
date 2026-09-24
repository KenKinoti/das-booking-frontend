<template>
  <div class="ui-page ui-page--wide">
    <header class="ui-page-head">
      <div>
        <div class="ui-eyebrow">Bookings &amp; Services</div>
        <h1>Staff roster</h1>
        <p>Plan who works when. Click an empty day to add a shift, or drag a shift to move it.</p>
      </div>
      <div class="ui-actions">
        <button class="ui-btn" :disabled="copying || !canManage" title="Copy last week's shifts into this week" @click="copyPreviousWeek">
          <i :class="copying ? 'fa-solid fa-circle-notch spin' : 'fa-regular fa-copy'"></i> Copy last week
        </button>
        <button class="ui-btn" :disabled="!shifts.length" title="Download this week's shifts as CSV" @click="exportCsv"><i class="fa-solid fa-download"></i> Export</button>
        <button v-if="canManage" class="ui-btn ui-btn--primary" @click="openCreate()"><i class="fa-solid fa-plus"></i> Add shift</button>
      </div>
    </header>

    <div class="ui-kpis">
      <div class="ui-kpi">
        <div class="ui-kpi__label"><span class="ui-kpi__icon"><i class="fa-regular fa-calendar-days"></i></span>Shifts this week</div>
        <div class="ui-kpi__value">{{ activeShifts.length }}</div>
        <div class="ui-kpi__meta">{{ countBy('cancelled') }} cancelled · {{ countBy('completed') }} completed</div>
      </div>
      <div class="ui-kpi">
        <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-info"><i class="fa-regular fa-clock"></i></span>Rostered hours</div>
        <div class="ui-kpi__value">{{ hoursLabel(totalHours) }}</div>
        <div class="ui-kpi__meta">Excludes cancelled and no-shows</div>
      </div>
      <div class="ui-kpi">
        <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-success"><i class="fa-solid fa-user-clock"></i></span>Staff rostered</div>
        <div class="ui-kpi__value">{{ rosteredStaff }}<span class="of"> / {{ staff.length }}</span></div>
        <div class="ui-kpi__meta">Active team members with a shift</div>
      </div>
      <div class="ui-kpi">
        <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-warning"><i class="fa-solid fa-sack-dollar"></i></span>Estimated wages</div>
        <div class="ui-kpi__value">{{ money(totalCost) }}</div>
        <div class="ui-kpi__meta">Hours × hourly rate</div>
      </div>
    </div>

    <section class="ui-card">
      <div class="toolbar">
        <div class="week-nav">
          <button class="ui-btn ui-btn--sm ui-btn--icon" title="Previous week" aria-label="Previous week" @click="shiftWeek(-1)"><i class="fa-solid fa-chevron-left"></i></button>
          <button class="ui-btn ui-btn--sm" :disabled="isThisWeek" @click="goToday">Today</button>
          <button class="ui-btn ui-btn--sm ui-btn--icon" title="Next week" aria-label="Next week" @click="shiftWeek(1)"><i class="fa-solid fa-chevron-right"></i></button>
          <h2 class="week-label">{{ weekLabel }}</h2>
          <input v-model="pickDate" type="date" class="ui-input date-pick" aria-label="Jump to date" @change="jump" />
        </div>
        <div class="toolbar__right">
          <div class="ui-input-group search">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input v-model="q" class="ui-input" type="search" placeholder="Find staff…" aria-label="Find staff" />
          </div>
          <select v-model="roleFilter" class="ui-select role-sel" aria-label="Role">
            <option value="">All roles</option>
            <option v-for="r in roleOptions" :key="r.value" :value="r.value">{{ r.label }}</option>
          </select>
          <label class="ui-switch compact"><input v-model="onlyRostered" type="checkbox" /> Rostered only</label>
          <div class="ui-tabs" role="tablist">
            <button class="ui-tab" :class="{ 'is-active': view === 'grid' }" role="tab" :aria-selected="view === 'grid'" title="Week grid" @click="setView('grid')"><i class="fa-solid fa-table-cells"></i> Week</button>
            <button class="ui-tab" :class="{ 'is-active': view === 'list' }" role="tab" :aria-selected="view === 'list'" title="List" @click="setView('list')"><i class="fa-solid fa-list"></i> List</button>
          </div>
        </div>
      </div>

      <div v-if="error" class="ui-card__body">
        <div class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span></div>
      </div>

      <div v-else-if="loading && !loaded" class="ui-card__body">
        <div v-for="n in 5" :key="n" class="sk-row">
          <div class="ui-skeleton" style="width: 180px; height: 40px"></div>
          <div v-for="d in 7" :key="d" class="ui-skeleton" style="flex: 1; height: 40px"></div>
        </div>
      </div>

      <div v-else-if="!staff.length" class="ui-empty">
        <div class="ui-empty__icon"><i class="fa-solid fa-user-plus"></i></div>
        <h3>No active staff yet</h3>
        <p>Add your team first, then build the roster here.</p>
        <router-link to="/staff" class="ui-btn ui-btn--primary" style="margin-top: 14px"><i class="fa-solid fa-user-plus"></i> Add staff</router-link>
      </div>

      <!-- Week grid -->
      <div v-else-if="view === 'grid'" class="grid-wrap" :class="{ 'is-loading': loading }">
        <div class="grid" role="grid" :aria-label="`Roster for ${weekLabel}`">
          <div class="grid__corner" role="columnheader">
            <span>Staff</span>
            <small>{{ visibleStaff.length }} shown</small>
          </div>
          <div v-for="d in days" :key="d.key" class="grid__day" :class="{ 'is-today': d.isToday, 'is-weekend': d.isWeekend }" role="columnheader">
            <span class="dow">{{ d.dow }}</span>
            <span class="dnum">{{ d.num }}</span>
            <small>{{ dayHours(d.key) ? hoursLabel(dayHours(d.key)) : '' }}</small>
          </div>

          <template v-for="s in visibleStaff" :key="s.id">
            <div class="grid__staff" role="rowheader">
              <span class="avatar" :style="{ '--hue': hue(s.id) }">{{ initials(s) }}</span>
              <span class="grid__staff-text">
                <strong>{{ name(s) }}</strong>
                <small>{{ roleLabel(s.role) }} · {{ hoursLabel(staffHours(s.id)) }}</small>
              </span>
            </div>
            <div
              v-for="d in days"
              :key="s.id + d.key"
              class="grid__cell"
              :class="{ 'is-today': d.isToday, 'is-weekend': d.isWeekend, 'is-drop': dropTarget === s.id + d.key }"
              role="gridcell"
              @click.self="canManage && openCreate(s.id, d.key)"
              @dragover.prevent="dropTarget = s.id + d.key"
              @dragleave="dropTarget = dropTarget === s.id + d.key ? null : dropTarget"
              @drop.prevent="onDrop(s.id, d.key)"
            >
              <button
                v-for="sh in cellShifts(s.id, d.key)"
                :key="sh.id"
                class="chip"
                :class="`chip--${sh.status}`"
                :draggable="canManage"
                :title="chipTitle(sh)"
                @click="openEdit(sh)"
                @dragstart="dragging = sh"
                @dragend="dragging = null; dropTarget = null"
              >
                <span class="chip__time">{{ shortTime(sh.start_time) }} – {{ shortTime(sh.end_time) }}</span>
                <span class="chip__role">{{ sh.service_type }}<template v-if="sh.location"> · {{ sh.location }}</template></span>
                <span v-if="sh.status !== 'scheduled'" class="chip__status">{{ statusLabel(sh.status) }}</span>
              </button>
              <button v-if="canManage" class="cell-add" :title="`Add shift for ${name(s)} on ${d.label}`" :aria-label="`Add shift for ${name(s)} on ${d.label}`" @click="openCreate(s.id, d.key)"><i class="fa-solid fa-plus"></i></button>
            </div>
          </template>
        </div>
        <p v-if="!visibleStaff.length" class="no-match">No staff match your filters.</p>
        <div class="legend">
          <span v-for="st in statuses" :key="st.value" class="legend__item"><i class="dot" :class="`chip--${st.value}`"></i>{{ st.label }}</span>
        </div>
      </div>

      <!-- List -->
      <div v-else>
        <div v-if="!listShifts.length" class="ui-empty">
          <div class="ui-empty__icon"><i class="fa-regular fa-calendar"></i></div>
          <h3>No shifts this week</h3>
          <p>Add a shift or copy last week's roster.</p>
        </div>
        <div v-else class="ui-table-wrap">
          <table class="ui-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Staff</th>
                <th class="hide-sm">Role / area</th>
                <th class="num hide-sm">Hours</th>
                <th class="num hide-md">Cost</th>
                <th>Status</th>
                <th class="actions-col"><span class="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="sh in listShifts" :key="sh.id" class="is-clickable" @click="openEdit(sh)">
                <td>
                  <strong>{{ dayLabel(sh.start_time) }}</strong>
                  <small class="block muted">{{ time(sh.start_time) }} – {{ time(sh.end_time) }}</small>
                </td>
                <td>{{ name(sh.staff) }}</td>
                <td class="hide-sm">{{ sh.service_type }}<small v-if="sh.location" class="block muted">{{ sh.location }}</small></td>
                <td class="num hide-sm">{{ hoursLabel(hoursOf(sh)) }}</td>
                <td class="num hide-md">{{ sh.hourly_rate ? money(sh.total_cost) : '—' }}</td>
                <td><span class="ui-badge" :class="statusBadge(sh.status)">{{ statusLabel(sh.status) }}</span></td>
                <td class="actions-col" @click.stop>
                  <div class="row-actions">
                    <button v-if="canManage && ['scheduled'].includes(sh.status)" class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" title="Confirm" aria-label="Confirm shift" @click="setStatus(sh, 'confirmed')"><i class="fa-solid fa-check"></i></button>
                    <button class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" title="Edit" aria-label="Edit shift" @click="openEdit(sh)"><i class="fa-regular fa-pen-to-square"></i></button>
                    <button v-if="canManage" class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon danger" title="Delete" aria-label="Delete shift" @click="remove(sh)"><i class="fa-regular fa-trash-can"></i></button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- Shift form -->
    <div v-if="formOpen" class="ui-modal-backdrop" @mousedown.self="closeForm">
      <form class="ui-modal" style="max-width: 640px" role="dialog" aria-modal="true" :aria-label="editing ? 'Edit shift' : 'Add shift'" @submit.prevent="save">
        <div class="ui-modal__head">
          <div>
            <h2>{{ editing ? 'Edit shift' : 'Add shift' }}</h2>
            <p class="sub">{{ summaryLine }}</p>
          </div>
          <button type="button" class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" title="Close" aria-label="Close" @click="closeForm"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="ui-modal__body">
          <div v-if="formError" class="ui-alert ui-alert--danger" style="margin-bottom: 16px"><i class="fa-solid fa-circle-exclamation"></i><span>{{ formError }}</span></div>

          <div v-if="editing" class="status-bar">
            <span class="ui-badge" :class="statusBadge(editing.status)">{{ statusLabel(editing.status) }}</span>
            <div class="status-actions">
              <button v-for="a in statusActions" :key="a.to" type="button" class="ui-btn ui-btn--sm" :class="a.cls" :disabled="saving" @click="setStatus(editing, a.to, true)"><i :class="a.icon"></i> {{ a.label }}</button>
            </div>
          </div>

          <div class="form-grid">
            <div class="ui-field span-2">
              <label for="sh-staff">Staff member <span class="req">*</span></label>
              <select id="sh-staff" v-model="form.staff_id" class="ui-select" :class="{ 'is-invalid': errors.staff_id }" :disabled="!canManage">
                <option value="" disabled>Choose someone…</option>
                <option v-for="s in staff" :key="s.id" :value="s.id">{{ name(s) }} · {{ roleLabel(s.role) }}</option>
              </select>
              <span v-if="errors.staff_id" class="field-error">{{ errors.staff_id }}</span>
            </div>
            <div class="ui-field">
              <label for="sh-date">Date <span class="req">*</span></label>
              <input id="sh-date" v-model="form.date" type="date" class="ui-input" :class="{ 'is-invalid': errors.date }" :disabled="!canManage" />
            </div>
            <div class="ui-field">
              <label>Time <span class="req">*</span></label>
              <div class="time-pair">
                <input v-model="form.start" type="time" class="ui-input" aria-label="Start time" step="900" :disabled="!canManage" />
                <span>to</span>
                <input v-model="form.end" type="time" class="ui-input" aria-label="End time" step="900" :disabled="!canManage" />
              </div>
              <span v-if="overnight" class="ui-hint"><i class="fa-regular fa-moon"></i> Finishes the next day</span>
              <span v-if="errors.time" class="field-error">{{ errors.time }}</span>
            </div>
            <div class="presets span-2">
              <span class="muted">Quick:</span>
              <button v-for="p in presets" :key="p.label" type="button" class="chip-btn" :disabled="!canManage" @click="applyPreset(p)">{{ p.label }}</button>
            </div>
            <div class="ui-field">
              <label for="sh-role">Role / area</label>
              <input id="sh-role" v-model.trim="form.service_type" class="ui-input" list="sh-roles" placeholder="e.g. Front desk" maxlength="100" :disabled="!canManage" />
              <datalist id="sh-roles">
                <option v-for="r in knownRoles" :key="r" :value="r" />
              </datalist>
            </div>
            <div class="ui-field">
              <label for="sh-loc">Location</label>
              <input id="sh-loc" v-model.trim="form.location" class="ui-input" list="sh-locs" maxlength="100" :disabled="!canManage" />
              <datalist id="sh-locs">
                <option v-for="l in knownLocations" :key="l" :value="l" />
              </datalist>
            </div>
            <div class="ui-field">
              <label for="sh-rate">Hourly rate</label>
              <div class="ui-input-group">
                <i class="fa-solid fa-dollar-sign"></i>
                <input id="sh-rate" v-model.number="form.hourly_rate" type="number" min="0" step="0.01" class="ui-input" :class="{ 'is-invalid': errors.rate }" :disabled="!canManage" />
              </div>
              <span v-if="errors.rate" class="field-error">{{ errors.rate }}</span>
            </div>
            <div class="ui-field">
              <label>Duration &amp; cost</label>
              <div class="calc">
                <strong>{{ hoursLabel(formHours) }}</strong>
                <span>{{ form.hourly_rate ? money(formHours * form.hourly_rate) : 'No rate set' }}</span>
              </div>
            </div>
            <div class="ui-field span-2">
              <label for="sh-notes">Notes</label>
              <textarea id="sh-notes" v-model="form.notes" class="ui-textarea" rows="2" :disabled="!canManage"></textarea>
            </div>
          </div>
        </div>
        <div class="ui-modal__foot">
          <button v-if="editing && canManage" type="button" class="ui-btn ui-btn--ghost danger-text" style="margin-right: auto" @click="remove(editing)"><i class="fa-regular fa-trash-can"></i> Delete</button>
          <button type="button" class="ui-btn" @click="closeForm">{{ canManage ? 'Cancel' : 'Close' }}</button>
          <button v-if="canManage" type="submit" class="ui-btn ui-btn--primary" :disabled="saving">
            <i :class="saving ? 'fa-solid fa-circle-notch spin' : 'fa-solid fa-check'"></i> {{ editing ? 'Save shift' : 'Add shift' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import api, { apiErrorMessage } from '@/services/api'
import { usersService, ROLES, roleInfo, userName } from '@/services/users'
import { useAuthStore } from '@/stores/auth'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'
import { formatMoney, isoDate, downloadBlob } from '@/utils/format'

const STATUSES = [
  { value: 'scheduled', label: 'Scheduled', badge: 'ui-badge--info' },
  { value: 'confirmed', label: 'Confirmed', badge: 'ui-badge--converted' },
  { value: 'in_progress', label: 'In progress', badge: 'ui-badge--warning' },
  { value: 'completed', label: 'Completed', badge: 'ui-badge--success' },
  { value: 'cancelled', label: 'Cancelled', badge: 'ui-badge--draft' },
  { value: 'no_show', label: 'No-show', badge: 'ui-badge--danger' }
]

function startOfWeek(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  const dow = (x.getDay() + 6) % 7 // Monday = 0
  x.setDate(x.getDate() - dow)
  return x
}

function localKey(d) {
  return isoDate(new Date(d))
}

function combine(dateStr, timeStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const [hh, mm] = timeStr.split(':').map(Number)
  return new Date(y, m - 1, d, hh, mm, 0, 0)
}

export default {
  name: 'Scheduling',
  data() {
    const q = this.$route.query
    const start = q.week ? startOfWeek(new Date(q.week + 'T00:00:00')) : startOfWeek(new Date())
    return {
      weekStart: start,
      pickDate: isoDate(start),
      staff: [],
      shifts: [],
      loaded: false,
      loading: false,
      error: '',
      q: '',
      roleFilter: '',
      onlyRostered: false,
      view: q.view === 'list' ? 'list' : 'grid',
      dragging: null,
      dropTarget: null,
      copying: false,
      formOpen: false,
      editing: null,
      form: {},
      errors: {},
      formError: '',
      saving: false,
      statuses: STATUSES,
      presets: [
        { label: 'Morning 7–15', start: '07:00', end: '15:00' },
        { label: 'Day 9–17', start: '09:00', end: '17:00' },
        { label: 'Evening 15–23', start: '15:00', end: '23:00' },
        { label: 'Night 22–6', start: '22:00', end: '06:00' }
      ]
    }
  },
  computed: {
    me() {
      return useAuthStore().user
    },
    canManage() {
      return ['admin', 'manager', 'super_admin'].includes(this.me?.role)
    },
    roleOptions() {
      return ROLES
    },
    weekEnd() {
      const e = new Date(this.weekStart)
      e.setDate(e.getDate() + 7)
      return e
    },
    days() {
      const today = localKey(new Date())
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(this.weekStart)
        d.setDate(d.getDate() + i)
        const key = localKey(d)
        return {
          key,
          dow: d.toLocaleDateString(undefined, { weekday: 'short' }),
          num: d.getDate(),
          label: d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' }),
          isToday: key === today,
          isWeekend: i >= 5
        }
      })
    },
    weekLabel() {
      const last = new Date(this.weekEnd)
      last.setDate(last.getDate() - 1)
      const sameMonth = last.getMonth() === this.weekStart.getMonth()
      const a = this.weekStart.toLocaleDateString(undefined, sameMonth ? { day: 'numeric' } : { day: 'numeric', month: 'short' })
      const b = last.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
      return `${a} – ${b}`
    },
    isThisWeek() {
      return localKey(this.weekStart) === localKey(startOfWeek(new Date()))
    },
    activeShifts() {
      return this.shifts.filter((s) => !['cancelled', 'no_show'].includes(s.status))
    },
    totalHours() {
      return this.activeShifts.reduce((t, s) => t + this.hoursOf(s), 0)
    },
    totalCost() {
      return this.activeShifts.reduce((t, s) => t + (Number(s.total_cost) || 0), 0)
    },
    rosteredStaff() {
      return new Set(this.activeShifts.map((s) => s.staff_id)).size
    },
    byCell() {
      const map = {}
      for (const s of this.shifts) {
        const k = s.staff_id + localKey(s.start_time)
        ;(map[k] = map[k] || []).push(s)
      }
      for (const k in map) map[k].sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
      return map
    },
    visibleStaff() {
      const q = this.q.trim().toLowerCase()
      const ids = new Set(this.shifts.map((s) => s.staff_id))
      // Include deactivated people who still have shifts this week.
      const extra = this.shifts.filter((s) => s.staff && !this.staff.some((u) => u.id === s.staff_id)).map((s) => s.staff)
      const all = [...this.staff, ...extra.filter((u, i, arr) => arr.findIndex((x) => x.id === u.id) === i)]
      return all.filter((s) => {
        if (this.onlyRostered && !ids.has(s.id)) return false
        if (this.roleFilter && s.role !== this.roleFilter) return false
        if (q && !`${userName(s)} ${s.email}`.toLowerCase().includes(q)) return false
        return true
      })
    },
    listShifts() {
      const ids = new Set(this.visibleStaff.map((s) => s.id))
      return [...this.shifts].filter((s) => ids.has(s.staff_id)).sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
    },
    knownRoles() {
      return [...new Set(['General', 'Front desk', 'Reception', 'Technician', 'Stylist', 'Kitchen', 'Sales floor', ...this.shifts.map((s) => s.service_type)].filter(Boolean))]
    },
    knownLocations() {
      return [...new Set(this.shifts.map((s) => s.location).filter(Boolean))]
    },
    overnight() {
      return this.form.start && this.form.end && this.form.end <= this.form.start
    },
    formRange() {
      if (!this.form.date || !this.form.start || !this.form.end) return null
      const start = combine(this.form.date, this.form.start)
      const end = combine(this.form.date, this.form.end)
      if (end <= start) end.setDate(end.getDate() + 1)
      return { start, end }
    },
    formHours() {
      const r = this.formRange
      return r ? (r.end - r.start) / 3600000 : 0
    },
    summaryLine() {
      const s = this.staff.find((u) => u.id === this.form.staff_id) || this.editing?.staff
      const d = this.form.date ? new Date(this.form.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }) : ''
      return [s ? userName(s) : '', d].filter(Boolean).join(' · ') || 'Choose a staff member, day and time.'
    },
    statusActions() {
      if (!this.editing || !this.canManage) return []
      const st = this.editing.status
      const a = []
      if (st === 'scheduled') a.push({ to: 'confirmed', label: 'Confirm', icon: 'fa-solid fa-check', cls: '' })
      if (['scheduled', 'confirmed'].includes(st)) a.push({ to: 'in_progress', label: 'Start', icon: 'fa-solid fa-play', cls: '' })
      if (st === 'in_progress') a.push({ to: 'completed', label: 'Complete', icon: 'fa-solid fa-flag-checkered', cls: 'ui-btn--success' })
      if (['scheduled', 'confirmed'].includes(st)) a.push({ to: 'no_show', label: 'No-show', icon: 'fa-solid fa-user-xmark', cls: '' })
      if (['scheduled', 'confirmed', 'in_progress'].includes(st)) a.push({ to: 'cancelled', label: 'Cancel shift', icon: 'fa-solid fa-ban', cls: '' })
      if (['cancelled', 'no_show'].includes(st)) a.push({ to: 'scheduled', label: 'Reinstate', icon: 'fa-solid fa-rotate-left', cls: '' })
      return a
    }
  },
  created() {
    this.loadStaff()
    this.load()
  },
  methods: {
    name: userName,
    money: (v) => formatMoney(v),
    roleLabel(r) {
      return roleInfo(r).label
    },
    initials(u) {
      return ((u?.first_name?.[0] || u?.email?.[0] || '') + (u?.last_name?.[0] || '')).toUpperCase()
    },
    hue(id = '') {
      let h = 0
      for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 360
      return h
    },
    time(v) {
      return new Date(v).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    },
    shortTime(v) {
      const d = new Date(v)
      const h = d.getHours()
      const m = d.getMinutes()
      const hh = h % 12 || 12
      return `${hh}${m ? ':' + String(m).padStart(2, '0') : ''}${h < 12 ? 'am' : 'pm'}`
    },
    dayLabel(v) {
      return new Date(v).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
    },
    hoursOf(s) {
      return Math.max(0, (new Date(s.end_time) - new Date(s.start_time)) / 3600000)
    },
    hoursLabel(h) {
      const r = Math.round(h * 4) / 4
      return `${r % 1 ? r.toFixed(2).replace(/0$/, '') : r} h`
    },
    countBy(st) {
      return this.shifts.filter((s) => s.status === st).length
    },
    statusLabel(s) {
      return STATUSES.find((x) => x.value === s)?.label || s
    },
    statusBadge(s) {
      return STATUSES.find((x) => x.value === s)?.badge || 'ui-badge--draft'
    },
    cellShifts(staffId, key) {
      return this.byCell[staffId + key] || []
    },
    staffHours(id) {
      return this.activeShifts.filter((s) => s.staff_id === id).reduce((t, s) => t + this.hoursOf(s), 0)
    },
    dayHours(key) {
      return this.activeShifts.filter((s) => localKey(s.start_time) === key).reduce((t, s) => t + this.hoursOf(s), 0)
    },
    chipTitle(sh) {
      return `${userName(sh.staff)} · ${this.time(sh.start_time)}–${this.time(sh.end_time)} · ${sh.service_type}${sh.location ? ' · ' + sh.location : ''} · ${this.statusLabel(sh.status)}${sh.notes ? '\n' + sh.notes : ''}`
    },
    async loadStaff() {
      try {
        const { users } = await usersService.list({ limit: 500, is_active: true, sort: 'name' })
        this.staff = users
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load staff')
      }
    },
    async fetchWeek(from, to) {
      const r = await api.get('/shifts', { params: { start_date: from.toISOString(), end_date: to.toISOString(), limit: 1000, order: 'asc' } })
      return r.data?.data?.shifts || []
    },
    async load() {
      this.loading = true
      this.error = ''
      try {
        const rows = await this.fetchWeek(this.weekStart, this.weekEnd)
        // Only shifts starting inside the week are placed on the grid.
        this.shifts = rows.filter((s) => new Date(s.start_time) >= this.weekStart && new Date(s.start_time) < this.weekEnd)
        this.loaded = true
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load the roster')
      } finally {
        this.loading = false
      }
    },
    syncQuery() {
      const query = {}
      if (!this.isThisWeek) query.week = localKey(this.weekStart)
      if (this.view === 'list') query.view = 'list'
      this.$router.replace({ query }).catch(() => {})
    },
    shiftWeek(n) {
      const d = new Date(this.weekStart)
      d.setDate(d.getDate() + 7 * n)
      this.weekStart = d
      this.pickDate = localKey(d)
      this.syncQuery()
      this.load()
    },
    goToday() {
      this.weekStart = startOfWeek(new Date())
      this.pickDate = localKey(this.weekStart)
      this.syncQuery()
      this.load()
    },
    jump() {
      if (!this.pickDate) return
      this.weekStart = startOfWeek(new Date(this.pickDate + 'T00:00:00'))
      this.syncQuery()
      this.load()
    },
    setView(v) {
      this.view = v
      this.syncQuery()
    },
    openCreate(staffId = '', dateKey = '') {
      if (!this.canManage) return
      const last = this.shifts.find((s) => s.staff_id === staffId)
      this.editing = null
      this.form = {
        staff_id: staffId || '',
        date: dateKey || (this.isThisWeek ? isoDate() : localKey(this.weekStart)),
        start: '09:00',
        end: '17:00',
        service_type: last?.service_type || '',
        location: last?.location || '',
        hourly_rate: last?.hourly_rate || '',
        notes: ''
      }
      this.errors = {}
      this.formError = ''
      this.formOpen = true
    },
    openEdit(sh) {
      const s = new Date(sh.start_time)
      const e = new Date(sh.end_time)
      const hm = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
      this.editing = sh
      this.form = {
        staff_id: sh.staff_id,
        date: localKey(s),
        start: hm(s),
        end: hm(e),
        service_type: sh.service_type || '',
        location: sh.location || '',
        hourly_rate: sh.hourly_rate || '',
        notes: sh.notes || ''
      }
      this.errors = {}
      this.formError = ''
      this.formOpen = true
    },
    closeForm() {
      if (!this.saving) this.formOpen = false
    },
    applyPreset(p) {
      this.form.start = p.start
      this.form.end = p.end
    },
    validate() {
      const e = {}
      if (!this.form.staff_id) e.staff_id = 'Choose who is working'
      if (!this.form.date) e.date = 'Choose a date'
      if (!this.form.start || !this.form.end) e.time = 'Set a start and end time'
      else if (this.form.start === this.form.end) e.time = 'Start and end cannot be the same'
      if (this.form.hourly_rate !== '' && Number(this.form.hourly_rate) < 0) e.rate = 'Cannot be negative'
      this.errors = e
      return !Object.keys(e).length
    },
    payload() {
      const { start, end } = this.formRange
      return {
        staff_id: this.form.staff_id,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        service_type: this.form.service_type,
        location: this.form.location,
        hourly_rate: this.form.hourly_rate === '' ? 0 : Number(this.form.hourly_rate),
        notes: this.form.notes
      }
    },
    async save() {
      if (!this.validate()) return
      this.saving = true
      this.formError = ''
      try {
        if (this.editing) await api.put(`/shifts/${this.editing.id}`, this.payload())
        else await api.post('/shifts', this.payload())
        toast.success(this.editing ? 'Shift updated' : 'Shift added')
        this.formOpen = false
        await this.load()
      } catch (e) {
        this.formError = apiErrorMessage(e, 'Could not save the shift')
      } finally {
        this.saving = false
      }
    },
    async setStatus(sh, status, fromModal = false) {
      if (['cancelled', 'no_show'].includes(status)) {
        const ok = await confirmDialog({
          title: status === 'cancelled' ? 'Cancel this shift?' : 'Mark as no-show?',
          message: `${userName(sh.staff)} · ${this.dayLabel(sh.start_time)} ${this.time(sh.start_time)}–${this.time(sh.end_time)}`,
          confirmText: status === 'cancelled' ? 'Cancel shift' : 'Mark no-show',
          danger: true
        })
        if (!ok) return
      }
      this.saving = true
      try {
        const r = await api.patch(`/shifts/${sh.id}/status`, { status })
        toast.success(`Shift ${this.statusLabel(status).toLowerCase()}`)
        if (fromModal && r.data?.data) this.editing = r.data.data
        await this.load()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not update the shift'))
      } finally {
        this.saving = false
      }
    },
    async remove(sh) {
      const ok = await confirmDialog({
        title: 'Delete this shift?',
        message: `${userName(sh.staff)} · ${this.dayLabel(sh.start_time)} ${this.time(sh.start_time)}–${this.time(sh.end_time)}. Shifts that have started must be cancelled instead.`,
        confirmText: 'Delete shift',
        danger: true
      })
      if (!ok) return
      try {
        await api.delete(`/shifts/${sh.id}`)
        toast.success('Shift deleted')
        this.formOpen = false
        await this.load()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not delete the shift'))
      }
    },
    async onDrop(staffId, dateKey) {
      const sh = this.dragging
      this.dropTarget = null
      this.dragging = null
      if (!sh || !this.canManage) return
      if (sh.staff_id === staffId && localKey(sh.start_time) === dateKey) return
      const s = new Date(sh.start_time)
      const e = new Date(sh.end_time)
      const [y, m, d] = dateKey.split('-').map(Number)
      const ns = new Date(y, m - 1, d, s.getHours(), s.getMinutes())
      const ne = new Date(ns.getTime() + (e - s))
      try {
        await api.put(`/shifts/${sh.id}`, { staff_id: staffId, start_time: ns.toISOString(), end_time: ne.toISOString() })
        toast.success('Shift moved')
        await this.load()
      } catch (err) {
        toast.error(apiErrorMessage(err, 'Could not move the shift'))
      }
    },
    async copyPreviousWeek() {
      const from = new Date(this.weekStart)
      from.setDate(from.getDate() - 7)
      this.copying = true
      try {
        const prev = (await this.fetchWeek(from, this.weekStart)).filter((s) => new Date(s.start_time) >= from && new Date(s.start_time) < this.weekStart && !['cancelled', 'no_show'].includes(s.status))
        if (!prev.length) {
          toast.info('Last week has no shifts to copy')
          return
        }
        const ok = await confirmDialog({
          title: `Copy ${prev.length} shift${prev.length === 1 ? '' : 's'} from last week?`,
          message: 'Each shift is added to the same day and time this week. Shifts that clash with existing ones are skipped.',
          confirmText: 'Copy shifts'
        })
        if (!ok) return
        let made = 0
        let skipped = 0
        for (const s of prev) {
          const ns = new Date(new Date(s.start_time).getTime() + 7 * 86400000)
          const ne = new Date(new Date(s.end_time).getTime() + 7 * 86400000)
          try {
            await api.post('/shifts', { staff_id: s.staff_id, start_time: ns.toISOString(), end_time: ne.toISOString(), service_type: s.service_type, location: s.location, hourly_rate: s.hourly_rate, notes: s.notes })
            made++
          } catch {
            skipped++
          }
        }
        toast.success(`Copied ${made} shift${made === 1 ? '' : 's'}${skipped ? ` · ${skipped} skipped` : ''}`)
        await this.load()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not copy last week'))
      } finally {
        this.copying = false
      }
    },
    exportCsv() {
      const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
      const head = ['Date', 'Start', 'End', 'Hours', 'Staff', 'Email', 'Role / area', 'Location', 'Status', 'Hourly rate', 'Cost', 'Notes']
      const lines = this.listShifts.map((s) =>
        [localKey(s.start_time), this.time(s.start_time), this.time(s.end_time), this.hoursOf(s).toFixed(2), userName(s.staff), s.staff?.email, s.service_type, s.location, this.statusLabel(s.status), s.hourly_rate, Number(s.total_cost || 0).toFixed(2), s.notes]
          .map(esc)
          .join(',')
      )
      downloadBlob(new Blob([[head.map(esc).join(','), ...lines].join('\n')], { type: 'text/csv' }), `roster-${localKey(this.weekStart)}.csv`)
    }
  }
}
</script>

<style scoped>
.kpi-info { background: var(--info-soft); color: var(--info); }
.kpi-success { background: var(--success-soft); color: var(--success); }
.kpi-warning { background: var(--warning-soft); color: var(--warning); }

.of {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-3);
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
  align-items: center;
}

.week-nav {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.week-label {
  font-size: 16px;
  margin: 0 8px;
  font-weight: 650;
  white-space: nowrap;
}

.date-pick {
  width: 150px;
  min-height: 32px;
  height: 32px;
  padding: 4px 10px;
  font-size: 13px;
}

.search {
  width: 180px;
}

.role-sel {
  width: 160px;
}

.compact {
  font-size: 13px;
  white-space: nowrap;
}

.sk-row {
  display: flex;
  gap: 8px;
  padding: 6px 0;
}

.grid-wrap {
  overflow-x: auto;
}

.grid {
  display: grid;
  grid-template-columns: minmax(190px, 240px) repeat(7, minmax(112px, 1fr));
  min-width: 980px;
}

.grid > div {
  border-bottom: 1px solid var(--border);
  border-right: 1px solid var(--border);
}

.grid > div:nth-child(8n) {
  border-right: 0;
}

.grid__corner,
.grid__day {
  position: sticky;
  top: 0;
  background: var(--surface-2);
  padding: 10px 12px;
  z-index: 2;
}

.grid__corner {
  left: 0;
  z-index: 3;
  display: flex;
  flex-direction: column;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.grid__corner small {
  text-transform: none;
  letter-spacing: 0;
  font-weight: 400;
}

.grid__day {
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-rows: auto auto;
  column-gap: 8px;
  align-items: baseline;
}

.dow {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.dnum {
  font-size: 18px;
  font-weight: 700;
  grid-row: 1;
  grid-column: 2;
  text-align: right;
}

.grid__day small {
  grid-column: 1 / -1;
  font-size: 11.5px;
  color: var(--text-3);
  min-height: 15px;
}

.grid__day.is-today .dnum {
  color: var(--accent);
}

.grid__day.is-today {
  box-shadow: inset 0 -2px 0 var(--accent);
}

.grid__staff {
  position: sticky;
  left: 0;
  z-index: 1;
  background: var(--surface);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
}

.grid__staff-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.grid__staff-text strong {
  font-size: 13.5px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.grid__staff-text small {
  font-size: 12px;
  color: var(--text-3);
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 11.5px;
  font-weight: 700;
  color: hsl(var(--hue) 60% 42%);
  background: hsl(var(--hue) 70% 50% / 0.14);
  flex-shrink: 0;
}

:root[data-theme='dark'] .avatar {
  color: hsl(var(--hue) 75% 72%);
}

.grid__cell {
  position: relative;
  min-height: 68px;
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  cursor: pointer;
  transition: background 0.12s;
}

.grid__cell.is-weekend {
  background: var(--bg-subtle);
}

.grid__cell.is-today {
  background: var(--accent-soft);
}

.grid__cell:hover {
  background: var(--surface-hover);
}

.grid__cell.is-drop {
  background: var(--accent-soft);
  outline: 2px dashed var(--accent);
  outline-offset: -3px;
}

.cell-add {
  position: absolute;
  right: 6px;
  bottom: 6px;
  width: 24px;
  height: 24px;
  border-radius: 7px;
  border: 1px dashed var(--border-strong);
  background: var(--surface);
  color: var(--text-3);
  font-size: 11px;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.12s;
}

.grid__cell:hover .cell-add,
.cell-add:focus-visible {
  opacity: 1;
}

.cell-add:hover {
  color: var(--accent);
  border-color: var(--accent);
}

.chip {
  --c: var(--info);
  --cs: var(--info-soft);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
  width: 100%;
  text-align: left;
  border: 0;
  border-left: 3px solid var(--c);
  background: var(--cs);
  color: var(--text);
  border-radius: 6px;
  padding: 5px 8px;
  font: inherit;
  cursor: pointer;
  transition: transform 0.1s, box-shadow 0.12s;
}

.chip:hover {
  box-shadow: var(--shadow-sm);
}

.chip[draggable='true'] {
  cursor: grab;
}

.chip__time {
  font-size: 12px;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
}

.chip__role {
  font-size: 11.5px;
  color: var(--text-2);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chip__status {
  font-size: 10.5px;
  font-weight: 650;
  color: var(--c);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.chip--confirmed { --c: var(--accent); --cs: var(--accent-soft); }
.chip--in_progress { --c: var(--warning); --cs: var(--warning-soft); }
.chip--completed { --c: var(--success); --cs: var(--success-soft); }
.chip--cancelled { --c: var(--text-3); --cs: var(--neutral-soft); }
.chip--no_show { --c: var(--danger); --cs: var(--danger-soft); }

.chip--cancelled .chip__time,
.chip--no_show .chip__time {
  text-decoration: line-through;
  color: var(--text-3);
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 12px 16px;
  font-size: 12.5px;
  color: var(--text-3);
  position: sticky;
  left: 0;
}

.legend__item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  background: var(--c, var(--info));
}

.no-match {
  padding: 24px;
  text-align: center;
  color: var(--text-3);
  margin: 0;
}

.is-loading {
  opacity: 0.6;
}

.block {
  display: block;
}

.muted {
  color: var(--text-3);
}

.actions-col {
  width: 1%;
  white-space: nowrap;
}

.row-actions {
  display: flex;
  gap: 2px;
  justify-content: flex-end;
}

.danger:hover,
.danger-text {
  color: var(--danger);
}

.sub {
  margin: 4px 0 0;
  color: var(--text-3);
  font-size: 13.5px;
}

.status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 10px 12px;
  margin-bottom: 16px;
  border-radius: var(--radius);
  background: var(--surface-2);
  border: 1px solid var(--border);
}

.status-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.span-2 {
  grid-column: 1 / -1;
}

.time-pair {
  display: flex;
  align-items: center;
  gap: 8px;
}

.time-pair span {
  color: var(--text-3);
  font-size: 13px;
}

.presets {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  margin-top: -6px;
  font-size: 12.5px;
}

.chip-btn {
  border: 1px solid var(--border);
  background: var(--surface-2);
  color: var(--text-2);
  border-radius: 999px;
  font: inherit;
  font-size: 12px;
  padding: 3px 10px;
  cursor: pointer;
}

.chip-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.calc {
  display: flex;
  align-items: baseline;
  gap: 10px;
  min-height: 38px;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  border: 1px solid var(--border);
}

.calc span {
  color: var(--text-3);
  font-size: 13px;
}

.req {
  color: var(--danger);
}

.field-error {
  font-size: 12px;
  color: var(--danger);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}

@media (max-width: 960px) {
  .hide-md {
    display: none;
  }
}

@media (max-width: 640px) {
  .hide-sm {
    display: none;
  }
  .search,
  .role-sel {
    width: 100%;
  }
  .toolbar__right {
    width: 100%;
  }
  .week-label {
    width: 100%;
    margin: 6px 0 0;
    order: 5;
  }
  .form-grid {
    grid-template-columns: 1fr;
  }
  .grid {
    grid-template-columns: 150px repeat(7, minmax(120px, 1fr));
    min-width: 990px;
  }
}

@media (max-width: 640px) {
  .ui-kpis {
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-bottom: 16px;
  }
  .ui-kpi {
    padding: 14px;
  }
  .ui-kpi__value {
    font-size: 20px;
  }
  .ui-kpi__meta {
    display: none;
  }
}
</style>
