<template>
  <div class="ui-page ui-page--wide bookings">
    <header class="ui-page-head">
      <div>
        <div class="ui-eyebrow">Operations</div>
        <h1>Bookings</h1>
        <p>Schedule appointments, track their progress and turn finished work into invoices.</p>
      </div>
      <div class="ui-actions">
        <button class="ui-btn" :disabled="loading" aria-label="Refresh" title="Refresh" @click="refreshAll">
          <i class="fa-solid fa-arrows-rotate" :class="{ spin: loading }"></i>
        </button>
        <button class="ui-btn ui-btn--primary" @click="openCreate()"><i class="fa-solid fa-plus"></i> New booking</button>
      </div>
    </header>

    <!-- KPIs -->
    <div class="ui-kpis">
      <button class="ui-kpi kpi-btn" @click="goToday">
        <div class="ui-kpi__label"><span class="ui-kpi__icon"><i class="fa-regular fa-calendar-check"></i></span>Today</div>
        <div class="ui-kpi__value"><span v-if="kpiLoading" class="ui-skeleton kpi-sk"></span><template v-else>{{ kpis.today }}</template></div>
        <div class="ui-kpi__meta">{{ kpiLoading ? ' ' : kpis.todayMeta }}</div>
      </button>
      <button class="ui-kpi kpi-btn" @click="showList('next7')">
        <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-info"><i class="fa-solid fa-forward"></i></span>Next 7 days</div>
        <div class="ui-kpi__value"><span v-if="kpiLoading" class="ui-skeleton kpi-sk"></span><template v-else>{{ kpis.upcoming }}</template></div>
        <div class="ui-kpi__meta">{{ kpiLoading ? ' ' : `${money(kpis.upcomingValue)} booked` }}</div>
      </button>
      <button class="ui-kpi kpi-btn" @click="showList('month', 'completed')">
        <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-success"><i class="fa-solid fa-flag-checkered"></i></span>Completed this month</div>
        <div class="ui-kpi__value"><span v-if="kpiLoading" class="ui-skeleton kpi-sk"></span><template v-else>{{ kpis.completed }}</template></div>
        <div class="ui-kpi__meta">{{ kpiLoading ? ' ' : kpis.completedMeta }}</div>
      </button>
      <button class="ui-kpi kpi-btn" @click="showList('month', 'completed')">
        <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-accent"><i class="fa-solid fa-sack-dollar"></i></span>Revenue this month</div>
        <div class="ui-kpi__value"><span v-if="kpiLoading" class="ui-skeleton kpi-sk"></span><template v-else>{{ money(kpis.revenue) }}</template></div>
        <div class="ui-kpi__meta">{{ kpiLoading ? ' ' : `${money(kpis.pipeline)} still scheduled` }}</div>
      </button>
    </div>

    <section class="ui-card">
      <!-- Toolbar -->
      <div class="toolbar">
        <div class="toolbar__left">
          <div class="ui-tabs view-switch" role="tablist" aria-label="View">
            <button v-for="v in views" :key="v.value" class="ui-tab" :class="{ 'is-active': view === v.value }" role="tab" :aria-selected="view === v.value" @click="setView(v.value)">
              <i :class="v.icon"></i><span class="vlabel">{{ v.label }}</span>
            </button>
          </div>
          <div v-if="view !== 'list'" class="cal-nav">
            <button class="ui-btn ui-btn--sm ui-btn--icon" :aria-label="`Previous ${view}`" @click="shift(-1)"><i class="fa-solid fa-chevron-left"></i></button>
            <button class="ui-btn ui-btn--sm" :disabled="isCurrentPeriod" @click="setCursor(new Date())">Today</button>
            <button class="ui-btn ui-btn--sm ui-btn--icon" :aria-label="`Next ${view}`" @click="shift(1)"><i class="fa-solid fa-chevron-right"></i></button>
            <label class="nav__label">
              <span>{{ periodLabel }}</span>
              <input type="date" class="nav__date" :value="cursorIso" aria-label="Jump to date" @change="$event.target.value && setCursor(new Date($event.target.value + 'T00:00:00'))" />
            </label>
          </div>
        </div>
        <div class="toolbar__right">
          <div class="ui-input-group search">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input v-model="q" class="ui-input" type="search" placeholder="Search customer, service, phone…" aria-label="Search bookings" />
          </div>
          <select v-model="staffFilter" class="ui-select staff-sel" aria-label="Filter by staff" @change="onStaffChange">
            <option value="">All staff</option>
            <option value="none">Unassigned</option>
            <option v-for="u in staff" :key="u.id" :value="u.id">{{ personName(u) }}</option>
          </select>
          <template v-if="view === 'list'">
            <select v-model="preset" class="ui-select preset-sel" aria-label="Date range" @change="onPresetChange">
              <option v-for="p in presets" :key="p.value" :value="p.value">{{ p.label }}</option>
            </select>
          </template>
        </div>
        <div v-if="view === 'list' && preset === 'custom'" class="toolbar__custom">
          <div class="ui-field inline">
            <label for="bk-from">From</label>
            <input id="bk-from" v-model="customFrom" type="date" class="ui-input" @change="loadRange" />
          </div>
          <div class="ui-field inline">
            <label for="bk-to">To</label>
            <input id="bk-to" v-model="customTo" type="date" class="ui-input" :min="customFrom" @change="loadRange" />
          </div>
          <span v-if="customFrom && customTo && customTo < customFrom" class="err">“To” must be on or after “From”.</span>
        </div>
      </div>

      <div v-if="view === 'list'" class="subbar">
        <div class="ui-tabs status-tabs" role="tablist" aria-label="Status">
          <button v-for="t in statusTabs" :key="t.value" class="ui-tab" :class="{ 'is-active': statusFilter === t.value }" role="tab" :aria-selected="statusFilter === t.value" @click="statusFilter = t.value">
            {{ t.label }} <span class="count">{{ t.count }}</span>
          </button>
        </div>
      </div>

      <div v-if="error" class="ui-card__body">
        <div class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="loadRange">Try again</a></span></div>
      </div>

      <!-- LIST -->
      <template v-else-if="view === 'list'">
        <div v-if="loading && !loadedOnce" class="ui-card__body">
          <div v-for="n in 6" :key="n" class="sk-row">
            <div class="ui-skeleton" style="width: 110px"></div>
            <div class="ui-skeleton" style="flex: 1"></div>
            <div class="ui-skeleton" style="width: 120px"></div>
            <div class="ui-skeleton" style="width: 80px"></div>
          </div>
        </div>

        <div v-else-if="!listRows.length" class="ui-empty">
          <div class="ui-empty__icon"><i class="fa-regular fa-calendar-plus"></i></div>
          <template v-if="hasFilters">
            <h3>No bookings match your filters</h3>
            <p>Try a different search, status, staff member or date range.</p>
            <button class="ui-btn" style="margin-top: 12px" @click="clearFilters"><i class="fa-solid fa-filter-circle-xmark"></i> Clear filters</button>
          </template>
          <template v-else>
            <h3>{{ preset === 'upcoming' ? 'No upcoming bookings' : 'No bookings in this period' }}</h3>
            <p>Create a booking, or switch to the calendar and click a free slot.</p>
            <button class="ui-btn ui-btn--primary" style="margin-top: 12px" @click="openCreate()"><i class="fa-solid fa-plus"></i> New booking</button>
          </template>
        </div>

        <div v-else class="ui-table-wrap" :class="{ 'is-loading': loading }">
          <table class="ui-table bk-table">
            <thead>
              <tr>
                <th>
                  <button class="th-sort" @click="sortDir = sortDir === 'asc' ? 'desc' : 'asc'">
                    When <i :class="sortDir === 'asc' ? 'fa-solid fa-arrow-up' : 'fa-solid fa-arrow-down'"></i>
                  </button>
                </th>
                <th>Customer</th>
                <th class="hide-md">Services</th>
                <th class="hide-sm">Staff</th>
                <th class="hide-xs">Status</th>
                <th class="num hide-xs">Price</th>
                <th style="width: 44px"></th>
              </tr>
            </thead>
            <tbody>
              <template v-for="g in groupedRows" :key="g.key">
                <tr class="group-row">
                  <td colspan="7">
                    <span class="group-date" :class="{ 'is-today': g.isToday }">{{ g.label }}</span>
                    <span class="group-meta">{{ g.rows.length }} booking{{ g.rows.length === 1 ? '' : 's' }} · {{ money(g.total) }}</span>
                  </td>
                </tr>
                <tr v-for="b in g.rows" :key="b.id" class="is-clickable" :class="{ 'is-dim': ['cancelled', 'no_show'].includes(b.status) }" @click="openDrawer(b)">
                  <td class="when">
                    <strong>{{ formatTime(b.start_time) }}</strong>
                    <small>{{ formatDuration(minutesBetween(b.start_time, b.end_time)) }}</small>
                  </td>
                  <td>
                    <div class="client-cell">
                      <span class="avatar">{{ initials(personName(b.customer)) }}</span>
                      <span class="client-text">
                        <span class="client-name">{{ personName(b.customer) || 'Unknown customer' }}</span>
                        <small>{{ b.customer?.phone || b.customer?.email || '' }}<template v-if="b.vehicle"> · {{ vehicleLabel(b.vehicle) }}</template></small>
                        <small class="show-md">{{ serviceNames(b) }}</small>
                        <span class="ui-badge show-xs" :class="`ui-badge--${statusMeta(b.status).badge}`">{{ statusMeta(b.status).label }} · {{ money(b.total_price) }}</span>
                      </span>
                    </div>
                  </td>
                  <td class="hide-md svc-cell">
                    <span v-if="b.services?.length">{{ serviceNames(b) }}</span>
                    <span v-else class="muted">—</span>
                  </td>
                  <td class="hide-sm">
                    <span v-if="b.staff" class="staff-chip"><span class="dot">{{ initials(personName(b.staff)) }}</span>{{ personName(b.staff) }}</span>
                    <span v-else class="muted">Unassigned</span>
                  </td>
                  <td class="hide-xs"><span class="ui-badge" :class="`ui-badge--${statusMeta(b.status).badge}`">{{ statusMeta(b.status).label }}</span></td>
                  <td class="num hide-xs"><strong>{{ money(b.total_price) }}</strong></td>
                  <td @click.stop>
                    <button class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" :aria-label="`Open booking for ${personName(b.customer)}`" @click="openDrawer(b)"><i class="fa-solid fa-chevron-right"></i></button>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
        <footer v-if="listRows.length" class="pager">
          <span class="muted">Showing {{ Math.min(limit, listRows.length) }} of {{ listRows.length }} · {{ money(listTotal) }} total</span>
          <button v-if="listRows.length > limit" class="ui-btn ui-btn--sm" @click="limit += 50">Show more</button>
        </footer>
      </template>

      <!-- WEEK -->
      <template v-else-if="view === 'week'">
        <div class="cal-wrap" :class="{ 'is-loading': loading }">
          <BookingTimeGrid :key="'w' + cursorIso" :days="weekDays" :bookings="calendarRows" @slot="openCreate($event)" @select="openDrawer" />
        </div>
        <div v-if="loadedOnce && !calendarRows.length && !loading" class="cal-empty">
          <i class="fa-regular fa-calendar"></i> No bookings this week{{ hasCalFilters ? ' match your filters' : '' }} — click any slot to add one.
        </div>
      </template>

      <!-- DAY -->
      <template v-else>
        <div class="day-layout" :class="{ 'is-loading': loading }">
          <aside class="agenda">
            <div class="agenda__head">
              <strong>{{ dayRows.length }} booking{{ dayRows.length === 1 ? '' : 's' }}</strong>
              <span class="muted">{{ money(dayRows.filter((b) => !['cancelled', 'no_show'].includes(b.status)).reduce((t, b) => t + Number(b.total_price || 0), 0)) }}</span>
            </div>
            <div v-if="!dayRows.length" class="agenda__empty">
              <i class="fa-regular fa-calendar"></i>
              <p>Nothing booked{{ hasCalFilters ? ' matching your filters' : '' }}.</p>
              <button class="ui-btn ui-btn--sm ui-btn--primary" @click="openCreate(defaultDayStart)"><i class="fa-solid fa-plus"></i> Add booking</button>
            </div>
            <button v-for="b in dayRows" :key="b.id" class="agenda__item" :class="`st-${b.status}`" @click="openDrawer(b)">
              <span class="agenda__time">
                <strong>{{ formatTime(b.start_time) }}</strong>
                <small>{{ formatTime(b.end_time) }}</small>
              </span>
              <span class="agenda__main">
                <span class="agenda__top">
                  <strong>{{ personName(b.customer) || 'Booking' }}</strong>
                  <span class="ui-badge" :class="`ui-badge--${statusMeta(b.status).badge}`">{{ statusMeta(b.status).label }}</span>
                </span>
                <small>{{ serviceNames(b) || 'No services' }}</small>
                <small v-if="b.staff || b.vehicle" class="agenda__extra">
                  <template v-if="b.staff"><i class="fa-regular fa-user"></i> {{ personName(b.staff) }}</template>
                  <template v-if="b.vehicle"> <i class="fa-solid fa-car-side"></i> {{ vehicleLabel(b.vehicle) }}</template>
                </small>
              </span>
            </button>
          </aside>
          <div class="day-grid">
            <BookingTimeGrid :key="'d' + cursorIso" :days="[cursorDay]" :bookings="calendarRows" :hour-px="64" @slot="openCreate($event)" @select="openDrawer" />
          </div>
        </div>
      </template>
    </section>

    <BookingDrawer
      v-if="selected"
      :booking="selected"
      :busy="busy"
      @close="closeDrawer"
      @status="changeStatus"
      @edit="openEdit(selected)"
      @delete="remove(selected)"
      @invoice="createInvoice(selected)"
    />

    <BookingFormModal
      v-if="form.open"
      :booking="form.booking"
      :preset="form.preset"
      :customers="customers"
      :services="services"
      :staff="staff"
      @close="form.open = false"
      @saved="onSaved"
      @customer-created="(c) => customers.unshift(c)"
    />
  </div>
</template>

<script>
import api, { listFrom, apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'
import { formatMoney, isoDate } from '@/utils/format'
import BookingTimeGrid from '@/components/bookings/BookingTimeGrid.vue'
import BookingDrawer from '@/components/bookings/BookingDrawer.vue'
import BookingFormModal from '@/components/bookings/BookingFormModal.vue'
import {
  BOOKING_STATUSES,
  ACTIVE_STATUSES,
  statusMeta,
  personName,
  initials,
  vehicleLabel,
  formatTime,
  formatDuration,
  minutesBetween,
  startOfDay,
  startOfWeek,
  addDaysDate,
  sameDay
} from '@/components/bookings/bookingUtils'

const PRESETS = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'today', label: 'Today' },
  { value: 'next7', label: 'Next 7 days' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'last30', label: 'Last 30 days' },
  { value: 'all', label: 'All time' },
  { value: 'custom', label: 'Custom range…' }
]

function readUser() {
  try {
    return JSON.parse(localStorage.getItem('current_user') || 'null')
  } catch {
    return null
  }
}

export default {
  name: 'Bookings',
  components: { BookingTimeGrid, BookingDrawer, BookingFormModal },
  data() {
    const qy = this.$route.query
    const view = ['list', 'week', 'day'].includes(qy.view) ? qy.view : 'list'
    const cursor = qy.date && /^\d{4}-\d{2}-\d{2}$/.test(qy.date) ? new Date(qy.date + 'T00:00:00') : startOfDay()
    return {
      view,
      cursor,
      preset: PRESETS.some((p) => p.value === qy.range) ? qy.range : 'upcoming',
      customFrom: isoDate(),
      customTo: isoDate(addDaysDate(new Date(), 30)),
      statusFilter: qy.status || 'all',
      staffFilter: '',
      q: '',
      sortDir: 'asc',
      limit: 50,
      rows: [],
      loading: false,
      loadedOnce: false,
      error: null,
      kpiRows: [],
      kpiLoading: true,
      customers: [],
      services: [],
      staff: [],
      selected: null,
      busy: '',
      form: { open: false, booking: null, preset: null },
      reqSeq: 0,
      views: [
        { value: 'list', label: 'List', icon: 'fa-solid fa-list' },
        { value: 'week', label: 'Week', icon: 'fa-solid fa-calendar-week' },
        { value: 'day', label: 'Day', icon: 'fa-solid fa-calendar-day' }
      ],
      presets: PRESETS
    }
  },
  computed: {
    cursorDay() {
      return startOfDay(this.cursor)
    },
    cursorIso() {
      return isoDate(this.cursor)
    },
    weekStart() {
      return startOfWeek(this.cursor)
    },
    weekDays() {
      return Array.from({ length: 7 }, (_, i) => addDaysDate(this.weekStart, i))
    },
    isCurrentPeriod() {
      return this.view === 'week' ? sameDay(this.weekStart, startOfWeek()) : sameDay(this.cursor, new Date())
    },
    periodLabel() {
      if (this.view === 'day') {
        return new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(this.cursor)
      }
      const a = this.weekStart
      const b = addDaysDate(a, 6)
      const sameMonth = a.getMonth() === b.getMonth()
      const fa = new Intl.DateTimeFormat(undefined, sameMonth ? { day: 'numeric' } : { day: 'numeric', month: 'short' }).format(a)
      const fb = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(b)
      return `${fa} – ${fb}`
    },
    defaultDayStart() {
      const d = new Date(this.cursor)
      const now = new Date()
      if (sameDay(d, now)) {
        d.setHours(now.getHours() + 1, 0, 0, 0)
      } else d.setHours(9, 0, 0, 0)
      return d
    },
    /** Date range [from, to) that the current view needs from the API */
    range() {
      if (this.view === 'week') return { from: this.weekStart, to: addDaysDate(this.weekStart, 7) }
      if (this.view === 'day') return { from: this.cursorDay, to: addDaysDate(this.cursorDay, 1) }
      const today = startOfDay()
      switch (this.preset) {
        case 'today':
          return { from: today, to: addDaysDate(today, 1) }
        case 'next7':
          return { from: today, to: addDaysDate(today, 7) }
        case 'week':
          return { from: startOfWeek(), to: addDaysDate(startOfWeek(), 7) }
        case 'month':
          return { from: new Date(today.getFullYear(), today.getMonth(), 1), to: new Date(today.getFullYear(), today.getMonth() + 1, 1) }
        case 'last30':
          return { from: addDaysDate(today, -30), to: addDaysDate(today, 1) }
        case 'custom': {
          const from = this.customFrom ? new Date(this.customFrom + 'T00:00:00') : null
          const to = this.customTo ? addDaysDate(new Date(this.customTo + 'T00:00:00'), 1) : null
          return { from, to }
        }
        case 'all':
          return { from: null, to: null }
        default:
          return { from: today, to: null }
      }
    },
    searched() {
      const q = this.q.trim().toLowerCase()
      if (!q) return this.rows
      const digits = q.replace(/\D/g, '')
      return this.rows.filter((b) => {
        const hay = [personName(b.customer), b.customer?.email, personName(b.staff), this.serviceNames(b), vehicleLabel(b.vehicle), b.notes].join(' ').toLowerCase()
        if (hay.includes(q)) return true
        return digits.length >= 3 && String(b.customer?.phone || '').replace(/\D/g, '').includes(digits)
      })
    },
    statusTabs() {
      const counts = {}
      for (const b of this.searched) counts[b.status] = (counts[b.status] || 0) + 1
      const active = this.searched.filter((b) => ACTIVE_STATUSES.includes(b.status)).length
      return [
        { value: 'all', label: 'All', count: this.searched.length },
        { value: 'active', label: 'Open', count: active },
        ...BOOKING_STATUSES.map((s) => ({ value: s.value, label: s.label, count: counts[s.value] || 0 }))
      ]
    },
    listRows() {
      let rows = this.searched
      if (this.statusFilter === 'active') rows = rows.filter((b) => ACTIVE_STATUSES.includes(b.status))
      else if (this.statusFilter !== 'all') rows = rows.filter((b) => b.status === this.statusFilter)
      const dir = this.sortDir === 'asc' ? 1 : -1
      return [...rows].sort((a, b) => (new Date(a.start_time) - new Date(b.start_time)) * dir)
    },
    listTotal() {
      return this.listRows.filter((b) => !['cancelled', 'no_show'].includes(b.status)).reduce((t, b) => t + Number(b.total_price || 0), 0)
    },
    groupedRows() {
      const groups = []
      const map = {}
      const today = new Date()
      const tomorrow = addDaysDate(today, 1)
      for (const b of this.listRows.slice(0, this.limit)) {
        const key = isoDate(new Date(b.start_time))
        if (!map[key]) {
          const d = new Date(b.start_time)
          let label = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined }).format(d)
          if (sameDay(d, today)) label = `Today · ${label}`
          else if (sameDay(d, tomorrow)) label = `Tomorrow · ${label}`
          map[key] = { key, label, isToday: sameDay(d, today), rows: [], total: 0 }
          groups.push(map[key])
        }
        map[key].rows.push(b)
        if (!['cancelled', 'no_show'].includes(b.status)) map[key].total += Number(b.total_price || 0)
      }
      return groups
    },
    calendarRows() {
      return this.searched
    },
    dayRows() {
      return this.searched.filter((b) => sameDay(b.start_time, this.cursor)).sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
    },
    hasFilters() {
      return !!this.q.trim() || this.statusFilter !== 'all' || !!this.staffFilter
    },
    hasCalFilters() {
      return !!this.q.trim() || !!this.staffFilter
    },
    kpis() {
      const now = new Date()
      const today = startOfDay()
      const in7 = addDaysDate(today, 7)
      const mFrom = new Date(today.getFullYear(), today.getMonth(), 1)
      const mTo = new Date(today.getFullYear(), today.getMonth() + 1, 1)
      const rows = this.kpiRows
      const live = (b) => !['cancelled', 'no_show'].includes(b.status)
      const todayRows = rows.filter((b) => sameDay(b.start_time, today) && live(b))
      const remaining = todayRows.filter((b) => new Date(b.end_time) > now && ACTIVE_STATUSES.includes(b.status)).length
      const upcoming = rows.filter((b) => ACTIVE_STATUSES.includes(b.status) && new Date(b.start_time) >= today && new Date(b.start_time) < in7)
      const month = rows.filter((b) => new Date(b.start_time) >= mFrom && new Date(b.start_time) < mTo)
      const completed = month.filter((b) => b.status === 'completed')
      const monthLive = month.filter(live)
      return {
        today: todayRows.length,
        todayMeta: todayRows.length ? (remaining ? `${remaining} still to come` : 'All done for today') : 'Nothing booked today',
        upcoming: upcoming.length,
        upcomingValue: upcoming.reduce((t, b) => t + Number(b.total_price || 0), 0),
        completed: completed.length,
        completedMeta: monthLive.length ? `of ${monthLive.length} booking${monthLive.length === 1 ? '' : 's'} this month (excl. cancelled & no-shows)` : 'No bookings this month yet',
        revenue: completed.reduce((t, b) => t + Number(b.total_price || 0), 0),
        pipeline: month.filter((b) => ACTIVE_STATUSES.includes(b.status)).reduce((t, b) => t + Number(b.total_price || 0), 0)
      }
    }
  },
  watch: {
    statusFilter() {
      this.limit = 50
      this.syncQuery()
    },
    q() {
      this.limit = 50
    }
  },
  created() {
    this.loadRange()
    this.loadKpis()
    this.loadRefs()
    this.handleDeepLinks()
  },
  methods: {
    statusMeta,
    personName,
    initials,
    vehicleLabel,
    formatTime,
    formatDuration,
    minutesBetween,
    money(v) {
      return formatMoney(v)
    },
    serviceNames(b) {
      return (b.services || []).map((s) => s.name).join(', ')
    },
    syncQuery() {
      const query = { view: this.view }
      if (this.view !== 'list') query.date = this.cursorIso
      else {
        if (this.preset !== 'upcoming') query.range = this.preset
        if (this.statusFilter !== 'all') query.status = this.statusFilter
      }
      this.$router.replace({ query }).catch(() => {})
    },
    params() {
      const p = {}
      const { from, to } = this.range
      if (from) p.date_from = from.toISOString()
      if (to) p.date_to = to.toISOString()
      if (this.staffFilter && this.staffFilter !== 'none') p.staff_id = this.staffFilter
      return p
    },
    async loadRange() {
      if (this.view === 'list' && this.preset === 'custom' && this.customFrom && this.customTo && this.customTo < this.customFrom) return
      const seq = ++this.reqSeq
      this.loading = true
      this.error = null
      try {
        const res = await api.get('/bookings', { params: this.params() })
        if (seq !== this.reqSeq) return
        let rows = listFrom(res, 'bookings')
        if (this.staffFilter === 'none') rows = rows.filter((b) => !b.staff_id)
        this.rows = rows
        this.loadedOnce = true
      } catch (e) {
        if (seq === this.reqSeq) this.error = apiErrorMessage(e, 'Could not load bookings')
      } finally {
        if (seq === this.reqSeq) this.loading = false
      }
    },
    async loadKpis() {
      const today = startOfDay()
      const from = new Date(Math.min(new Date(today.getFullYear(), today.getMonth(), 1), today))
      const to = new Date(Math.max(new Date(today.getFullYear(), today.getMonth() + 1, 1), addDaysDate(today, 8)))
      try {
        const res = await api.get('/bookings', { params: { date_from: from.toISOString(), date_to: to.toISOString() } })
        this.kpiRows = listFrom(res, 'bookings')
      } catch {
        this.kpiRows = []
      } finally {
        this.kpiLoading = false
      }
    },
    async loadRefs() {
      const me = readUser()
      const [c, s, u] = await Promise.allSettled([api.get('/customers'), api.get('/services'), api.get('/users', { params: { limit: 500, is_active: true } })])
      if (c.status === 'fulfilled') this.customers = listFrom(c.value, 'customers')
      if (s.status === 'fulfilled') this.services = listFrom(s.value, 'services').sort((a, b) => a.name.localeCompare(b.name))
      if (u.status === 'fulfilled') {
        this.staff = listFrom(u.value, 'users')
          .filter((x) => x.is_active !== false && (!me?.organization_id || x.organization_id === me.organization_id))
          .sort((a, b) => personName(a).localeCompare(personName(b)))
      }
      if (c.status === 'rejected' || s.status === 'rejected') toast.warning('Some booking options could not be loaded. Try refreshing the page.')
    },
    async handleDeepLinks() {
      const qy = this.$route.query
      if (qy.booking) {
        try {
          const { data } = await api.get(`/bookings/${qy.booking}`)
          this.selected = data.booking
        } catch (e) {
          toast.error(apiErrorMessage(e, 'Booking not found'))
        }
      } else if (qy.new) {
        this.openCreate(null, qy.customer_id ? String(qy.customer_id) : undefined)
      }
    },
    refreshAll() {
      this.loadRange()
      this.loadKpis()
      this.loadRefs()
    },
    setView(v) {
      if (this.view === v) return
      this.view = v
      this.limit = 50
      this.syncQuery()
      this.loadRange()
    },
    setCursor(d) {
      this.cursor = startOfDay(d)
      this.syncQuery()
      this.loadRange()
    },
    shift(dir) {
      this.setCursor(addDaysDate(this.cursor, this.view === 'week' ? 7 * dir : dir))
    },
    goToday() {
      this.view = 'day'
      this.setCursor(new Date())
    },
    showList(preset, status = 'all') {
      this.view = 'list'
      this.preset = preset
      this.statusFilter = status
      this.q = ''
      this.syncQuery()
      this.loadRange()
    },
    onPresetChange() {
      this.limit = 50
      this.sortDir = ['last30', 'all'].includes(this.preset) ? 'desc' : 'asc'
      this.syncQuery()
      this.loadRange()
    },
    onStaffChange() {
      this.loadRange()
    },
    clearFilters() {
      this.q = ''
      this.statusFilter = 'all'
      if (this.staffFilter) {
        this.staffFilter = ''
        this.loadRange()
      }
    },
    openCreate(start, customerId) {
      const preset = {}
      if (start instanceof Date) preset.start = start
      if (customerId) preset.customer_id = customerId
      if (this.staffFilter && this.staffFilter !== 'none') preset.staff_id = this.staffFilter
      this.form = { open: true, booking: null, preset }
    },
    openEdit(b) {
      this.form = { open: true, booking: b, preset: null }
    },
    openDrawer(b) {
      this.selected = b
    },
    closeDrawer() {
      this.selected = null
      if (this.$route.query.booking) this.syncQuery()
    },
    upsert(b) {
      const i = this.rows.findIndex((r) => r.id === b.id)
      if (i !== -1) this.rows.splice(i, 1, b)
      const k = this.kpiRows.findIndex((r) => r.id === b.id)
      if (k !== -1) this.kpiRows.splice(k, 1, b)
    },
    onSaved(b) {
      const wasEdit = !!this.form.booking
      this.form.open = false
      if (wasEdit && this.selected?.id === b.id) this.selected = b
      if (!wasEdit && this.view !== 'list') {
        // jump the calendar to the new booking
        const d = new Date(b.start_time)
        const inRange = this.view === 'week' ? d >= this.weekStart && d < addDaysDate(this.weekStart, 7) : sameDay(d, this.cursor)
        if (!inRange) this.cursor = startOfDay(d)
        this.syncQuery()
      }
      this.upsert(b)
      this.loadRange()
      this.loadKpis()
    },
    async changeStatus(to) {
      const b = this.selected
      if (!b) return
      if (to === 'cancelled') {
        const ok = await confirmDialog({ title: 'Cancel this booking?', message: `${personName(b.customer)}'s booking will be marked as cancelled and freed up in the calendar.`, confirmText: 'Mark as cancelled', danger: true })
        if (!ok) return
      }
      this.busy = to
      try {
        const { data } = await api.patch(`/bookings/${b.id}/status`, { status: to })
        const fresh = data.booking || { ...b, status: to }
        this.selected = fresh
        this.upsert(fresh)
        this.loadKpis()
        toast.success(`Booking marked as ${statusMeta(to).label.toLowerCase()}`)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not update the status'))
      } finally {
        this.busy = ''
      }
    },
    async remove(b) {
      const ok = await confirmDialog({
        title: 'Delete booking?',
        message: `This permanently removes ${personName(b.customer) || 'this'}'s booking on ${new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(new Date(b.start_time))}. To keep a record, cancel it instead.`,
        confirmText: 'Delete',
        danger: true
      })
      if (!ok) return
      this.busy = 'delete'
      try {
        await api.delete(`/bookings/${b.id}`)
        this.rows = this.rows.filter((r) => r.id !== b.id)
        this.kpiRows = this.kpiRows.filter((r) => r.id !== b.id)
        this.selected = null
        toast.success('Booking deleted')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not delete the booking'))
      } finally {
        this.busy = ''
      }
    },
    createInvoice(b) {
      const c = b.customer || {}
      const query = { client_name: personName(c), customer_id: b.customer_id }
      if (c.email) query.client_email = c.email
      this.$router.push({ path: '/invoices/new', query })
    }
  }
}
</script>

<style scoped>
.kpi-btn {
  text-align: left;
  font: inherit;
  color: inherit;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.kpi-btn:hover {
  border-color: var(--border-strong);
  box-shadow: var(--shadow);
}

.kpi-sk { display: inline-block; width: 70px; height: 26px; }
.kpi-info { background: var(--info-soft); color: var(--info); }
.kpi-success { background: var(--success-soft); color: var(--success); }
.kpi-accent { background: var(--warning-soft); color: var(--warning); }

.muted { color: var(--text-3); }
.err { color: var(--danger); font-size: 12.5px; align-self: center; }

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
}

.toolbar__left,
.toolbar__right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.toolbar__custom {
  display: flex;
  gap: 12px;
  width: 100%;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.ui-field.inline {
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.ui-field.inline .ui-input { width: 160px; }

.view-switch .ui-tab i { font-size: 12px; }

.cal-nav {
  display: flex;
  align-items: center;
  gap: 6px;
}

.nav__label {
  position: relative;
  margin-left: 6px;
  font-weight: 650;
  font-size: 15px;
  cursor: pointer;
  white-space: nowrap;
}

.nav__label:hover span { color: var(--accent); }

.nav__date {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
  width: 100%;
}

.nav__date::-webkit-calendar-picker-indicator {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  cursor: pointer;
}

.search { width: 250px; }
.staff-sel { width: 160px; }
.preset-sel { width: 160px; }

.subbar {
  padding: 10px 16px;
  border-bottom: 1px solid var(--border);
  overflow-x: auto;
}

.status-tabs { flex-wrap: nowrap; }
.status-tabs .ui-tab { white-space: nowrap; }

.sk-row {
  display: flex;
  gap: 16px;
  padding: 12px 0;
}

.th-sort {
  border: 0;
  background: none;
  font: inherit;
  color: inherit;
  text-transform: inherit;
  letter-spacing: inherit;
  padding: 0;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.th-sort i { font-size: 10px; }

.group-row td {
  background: var(--bg-subtle);
  padding-top: 8px !important;
  padding-bottom: 8px !important;
  font-size: 12.5px;
}

.group-date {
  font-weight: 650;
  color: var(--text);
}

.group-date.is-today { color: var(--accent); }

.group-meta {
  margin-left: 10px;
  color: var(--text-3);
  font-variant-numeric: tabular-nums;
}

.when {
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.when strong { display: block; font-weight: 600; }
.when small { color: var(--text-3); font-size: 12px; }

.client-cell {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.client-text { min-width: 0; }

.client-text small {
  display: block;
  color: var(--text-3);
  font-size: 12px;
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.client-name { font-weight: 550; }

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  font-size: 11.5px;
  font-weight: 700;
  background: var(--accent-soft);
  color: var(--accent);
  flex-shrink: 0;
}

.svc-cell {
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-2);
}

.staff-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.staff-chip .dot {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 9.5px;
  font-weight: 700;
  background: var(--neutral-soft);
  color: var(--text-2);
}

tr.is-dim td { opacity: 0.6; }
tr.is-dim td:nth-child(5) { opacity: 1; }

.show-md { display: none !important; }
.show-xs { display: none !important; }

.is-loading {
  opacity: 0.6;
  transition: opacity 0.2s;
}

.pager {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-top: 1px solid var(--border);
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

.cal-wrap { transition: opacity 0.2s; }

.cal-empty {
  padding: 12px 16px;
  border-top: 1px solid var(--border);
  color: var(--text-3);
  font-size: 13px;
}

.cal-empty i { margin-right: 6px; }

.day-layout {
  display: grid;
  grid-template-columns: 380px minmax(0, 1fr);
  transition: opacity 0.2s;
}

.agenda {
  border-right: 1px solid var(--border);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: calc(100vh - 250px);
  overflow: auto;
}

.agenda__head {
  display: flex;
  justify-content: space-between;
  padding: 4px 4px 8px;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

.agenda__empty {
  text-align: center;
  color: var(--text-3);
  padding: 32px 12px;
}

.agenda__empty > i { font-size: 22px; }
.agenda__empty p { margin: 8px 0 12px; font-size: 13.5px; }

.agenda__item {
  --c: var(--info);
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-left: 3px solid var(--c);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--text);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: box-shadow 0.15s, border-color 0.15s;
}

.agenda__item:hover { box-shadow: var(--shadow); }

.agenda__item.st-confirmed { --c: var(--accent); }
.agenda__item.st-in_progress { --c: var(--warning); }
.agenda__item.st-completed { --c: var(--success); }
.agenda__item.st-cancelled,
.agenda__item.st-no_show { --c: var(--text-3); opacity: 0.7; }

.agenda__time {
  display: flex;
  flex-direction: column;
  width: 64px;
  flex-shrink: 0;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.agenda__time strong { font-size: 13.5px; }
.agenda__time small { color: var(--text-3); font-size: 12px; }

.agenda__main { flex: 1; min-width: 0; display: grid; gap: 2px; }
.agenda__main strong { font-size: 14px; font-weight: 600; }

.agenda__main small {
  color: var(--text-3);
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agenda__extra i { font-size: 10.5px; margin-right: 2px; }

.agenda__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.agenda__top strong { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.agenda__top .ui-badge { flex-shrink: 0; height: 22px; font-size: 11.5px; padding: 0 8px; }

@media (max-width: 1200px) {
  .hide-md { display: none; }
  .show-md { display: block !important; }
}

@media (max-width: 980px) {
  .day-layout { grid-template-columns: 1fr; }
  .agenda { border-right: 0; border-bottom: 1px solid var(--border); max-height: none; }
}

@media (max-width: 760px) {
  .hide-sm { display: none; }
  .toolbar__left,
  .toolbar__right { width: 100%; }
  .search { width: 100%; }
  .staff-sel,
  .preset-sel { flex: 1; width: auto; min-width: 0; }
  .cal-nav { flex-wrap: wrap; }
  .nav__label { font-size: 14px; }
  .toolbar__custom { justify-content: flex-start; }
  .ui-field.inline .ui-input { width: 140px; }
}

@media (max-width: 520px) {
  .hide-xs { display: none; }
  .show-xs { display: inline-flex !important; margin-top: 4px; height: 22px; font-size: 11.5px; }
  .ui-kpis { grid-template-columns: 1fr 1fr; gap: 10px; }
  .ui-kpis .ui-kpi { padding: 14px; }
  .ui-kpis .ui-kpi__value { font-size: 20px; }
  .ui-kpis .ui-kpi__meta { font-size: 11.5px; }
  .bk-table td, .bk-table th { padding-left: 10px; padding-right: 10px; }
  .client-cell .avatar { display: none; }
  .view-switch { width: 100%; }
  .view-switch .ui-tab { flex: 1; justify-content: center; }
  .client-text small { max-width: 160px; }
}
</style>
