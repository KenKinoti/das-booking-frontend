<template>
  <div class="mp ui-page ui-page--wide">
    <header class="ui-page-head">
      <div>
        <div class="ui-eyebrow">People</div>
        <h1>HR &amp; payroll</h1>
        <p>Your team, time off, hours worked and pay runs in one place.</p>
      </div>
      <div class="ui-actions">
        <button class="ui-btn" @click="showDepartments = true"><i class="fa-solid fa-sitemap"></i> Departments</button>
        <button v-if="primary" class="ui-btn ui-btn--primary" :disabled="primary.needsManager && !canManage" @click="primary.run()">
          <i :class="primary.icon"></i> {{ primary.label }}
        </button>
      </div>
    </header>

    <div class="ui-kpis">
      <button class="ui-kpi kpi-btn" @click="setTab('employees')">
        <div class="ui-kpi__label"><span class="ui-kpi__icon"><i class="fa-solid fa-users"></i></span>Headcount</div>
        <div class="ui-kpi__value tnum"><span v-if="!summary" class="ui-skeleton" style="width: 60px; height: 26px; display: inline-block"></span><template v-else>{{ summary.headcount }}</template></div>
        <div class="ui-kpi__meta">{{ summary ? `${summary.active} active · ${summary.departments} department${summary.departments === 1 ? '' : 's'}` : ' ' }}</div>
      </button>
      <button class="ui-kpi kpi-btn" @click="setTab('leave')">
        <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-info"><i class="fa-solid fa-umbrella-beach"></i></span>On leave today</div>
        <div class="ui-kpi__value tnum">{{ summary ? summary.on_leave_today : '–' }}</div>
        <div class="ui-kpi__meta">{{ summary ? `${summary.pending_leave} request${summary.pending_leave === 1 ? '' : 's'} awaiting approval` : ' ' }}</div>
      </button>
      <button class="ui-kpi kpi-btn" @click="setTab('timesheets')">
        <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-warning"><i class="fa-solid fa-clock"></i></span>Hours this week</div>
        <div class="ui-kpi__value tnum">{{ summary ? fmtHours(summary.hours_this_week) : '–' }}</div>
        <div class="ui-kpi__meta">{{ summary ? `${summary.pending_timesheets} timesheet${summary.pending_timesheets === 1 ? '' : 's'} to approve` : ' ' }}</div>
      </button>
      <button class="ui-kpi kpi-btn" @click="setTab('payruns')">
        <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-success"><i class="fa-solid fa-money-check-dollar"></i></span>Last pay run</div>
        <div class="ui-kpi__value tnum">{{ summary && summary.last_pay_run ? money(summary.last_pay_run.total_net, summary.last_pay_run.currency) : '–' }}</div>
        <div class="ui-kpi__meta">
          <template v-if="summary && summary.last_pay_run">Net pay · {{ summary.last_pay_run.number }} · {{ date(summary.last_pay_run.pay_date) }}</template>
          <template v-else-if="summary">No pay runs paid yet{{ summary.draft_pay_runs ? ` · ${summary.draft_pay_runs} draft` : '' }}</template>
        </div>
      </button>
    </div>

    <div class="tabbar">
      <div class="ui-tabs" role="tablist">
        <button v-for="t in tabs" :key="t.value" class="ui-tab" :class="{ 'is-active': tab === t.value }" role="tab" :aria-selected="tab === t.value" @click="setTab(t.value)">
          <i :class="t.icon"></i>&nbsp; {{ t.label }}
          <span v-if="t.count" class="count">{{ t.count }}</span>
        </button>
      </div>
      <span v-if="!canManage" class="muted small"><i class="fa-solid fa-lock"></i> Managers approve requests and run payroll</span>
    </div>

    <div v-if="loadError" class="ui-alert ui-alert--danger" style="margin-bottom: 16px">
      <i class="fa-solid fa-circle-exclamation"></i><span>{{ loadError }} <a href="#" @click.prevent="reloadAll">Try again</a></span>
    </div>

    <HrEmployees
      v-if="tab === 'employees'"
      ref="tab"
      :employees="employees"
      :departments="departments"
      :loading="loadingEmployees"
      :can-manage="canManage"
      @changed="reloadAll"
      @manage-departments="showDepartments = true"
    />
    <HrLeave v-else-if="tab === 'leave'" ref="tab" :employees="employees" :can-manage="canManage" @changed="loadSummary" />
    <HrTimesheets v-else-if="tab === 'timesheets'" ref="tab" :employees="employees" :can-manage="canManage" @changed="loadSummary" />
    <HrPayRuns v-else-if="tab === 'payruns'" ref="tab" :employees="employees" :can-manage="canManage" @changed="loadSummary" />

    <HrDepartments v-if="showDepartments" :departments="departments" :can-manage="canManage" @close="showDepartments = false" @changed="reloadAll" />
  </div>
</template>

<script>
import '@/styles/module-page.css'
import api, { apiErrorMessage } from '@/services/api'
import { formatMoney, formatDate } from '@/utils/format'
import HrEmployees from './hr/HrEmployees.vue'
import HrLeave from './hr/HrLeave.vue'
import HrTimesheets from './hr/HrTimesheets.vue'
import HrPayRuns from './hr/HrPayRuns.vue'
import HrDepartments from './hr/HrDepartments.vue'

const TABS = ['employees', 'leave', 'timesheets', 'payruns']

export default {
  name: 'HCM',
  components: { HrEmployees, HrLeave, HrTimesheets, HrPayRuns, HrDepartments },
  data() {
    return {
      tab: TABS.includes(this.$route.query.tab) ? this.$route.query.tab : 'employees',
      summary: null,
      employees: [],
      departments: [],
      loadingEmployees: true,
      loadError: '',
      showDepartments: false
    }
  },
  computed: {
    canManage() {
      return this.summary ? !!this.summary.can_manage : true
    },
    tabs() {
      const s = this.summary || {}
      return [
        { value: 'employees', label: 'Employees', icon: 'fa-solid fa-id-badge', count: this.employees.length || 0 },
        { value: 'leave', label: 'Leave', icon: 'fa-solid fa-umbrella-beach', count: s.pending_leave || 0 },
        { value: 'timesheets', label: 'Timesheets', icon: 'fa-solid fa-clock', count: s.pending_timesheets || 0 },
        { value: 'payruns', label: 'Pay runs', icon: 'fa-solid fa-money-check-dollar', count: s.draft_pay_runs || 0 }
      ]
    },
    primary() {
      const call = (fn) => () => this.$refs.tab && this.$refs.tab[fn] && this.$refs.tab[fn]()
      switch (this.tab) {
        case 'employees':
          return { label: 'Add employee', icon: 'fa-solid fa-user-plus', run: call('openCreate'), needsManager: true }
        case 'leave':
          return { label: 'Request leave', icon: 'fa-solid fa-plus', run: call('openCreate') }
        case 'timesheets':
          return { label: 'Log hours', icon: 'fa-solid fa-plus', run: call('openCreate') }
        case 'payruns':
          return { label: 'New pay run', icon: 'fa-solid fa-plus', run: call('openCreate'), needsManager: true }
      }
      return null
    }
  },
  watch: {
    '$route.query.tab'(t) {
      if (TABS.includes(t)) this.tab = t
    }
  },
  created() {
    this.reloadAll()
  },
  methods: {
    money: formatMoney,
    date: formatDate,
    fmtHours(h) {
      const n = Number(h) || 0
      return `${Number.isInteger(n) ? n : n.toFixed(1)} h`
    },
    setTab(t) {
      this.tab = t
      this.$router.replace({ query: { ...this.$route.query, tab: t } })
    },
    reloadAll() {
      this.loadSummary()
      this.loadEmployees()
    },
    async loadSummary() {
      try {
        const { data } = await api.get('/hr/summary', { params: { tz: Intl.DateTimeFormat().resolvedOptions().timeZone } })
        this.summary = data.data
      } catch (e) {
        this.loadError = apiErrorMessage(e, 'Could not load HR data')
      }
    },
    async loadEmployees() {
      this.loadingEmployees = true
      try {
        const [emps, depts] = await Promise.all([api.get('/hr/employees'), api.get('/hr/departments')])
        this.employees = emps.data.data.employees || []
        this.departments = depts.data.data.departments || []
        this.loadError = ''
      } catch (e) {
        this.loadError = apiErrorMessage(e, 'Could not load employees')
      } finally {
        this.loadingEmployees = false
      }
    }
  }
}
</script>

<style scoped>
.tabbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.ui-tab i {
  font-size: 12px;
  opacity: 0.75;
}

@media (max-width: 720px) {
  .tabbar .ui-tabs {
    width: 100%;
  }
  .tabbar .ui-tab {
    flex: 1 1 auto;
    justify-content: center;
  }
}
</style>
