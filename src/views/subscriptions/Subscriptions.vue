<template>
  <div class="ui-page ui-page--wide" data-testid="subscriptions-page">
    <header class="ui-page-head">
      <div>
        <div class="ui-eyebrow">Finance</div>
        <h1>Subscriptions</h1>
        <p>Clients billed every month, quarter or year. Invoices go out ahead with the pay link; unpaid services are suspended after the grace period — and you hear about it at least 3 days before.</p>
      </div>
      <div class="ui-actions">
        <button type="button" class="ui-btn" data-testid="open-import" @click="modal = 'import'"><i class="fa-solid fa-file-import"></i> Import CSV</button>
        <button type="button" class="ui-btn" data-testid="open-sites" @click="setTab('sites')"><i class="fa-solid fa-server"></i> From Synergy sites</button>
        <button type="button" class="ui-btn ui-btn--primary" data-testid="new-subscription" @click="openNew()"><i class="fa-solid fa-plus"></i> New subscription</button>
        <OverflowMenu label="More actions" :items="moreActions" />
      </div>
    </header>

    <div v-if="dash?.test_clock" class="ui-alert ui-alert--warning clock" data-testid="test-clock">
      <i class="fa-solid fa-flask"></i>
      <span>
        <strong>Test clock</strong> — subscriptions think today is <strong data-testid="clock-today">{{ fmtDate(dash.today) }}</strong>
        <template v-if="dash.test_offset_days"> ({{ dash.test_offset_days > 0 ? '+' : '' }}{{ dash.test_offset_days }} days)</template>. Test environments only.
      </span>
      <span class="clock__btns">
        <button type="button" class="ui-btn ui-btn--sm" :disabled="clockBusy" data-testid="clock-plus1" @click="moveClock(1)">+1 day</button>
        <button type="button" class="ui-btn ui-btn--sm" :disabled="clockBusy" data-testid="clock-plus7" @click="moveClock(7)">+7 days</button>
        <button v-if="dash.test_offset_days" type="button" class="ui-btn ui-btn--sm ui-btn--ghost" :disabled="clockBusy" @click="moveClock(0)">Reset</button>
      </span>
    </div>

    <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="reload">Try again</a></span></div>

    <div class="ui-kpis kpis6" data-testid="kpis">
      <div class="ui-kpi" data-testid="kpi-mrr">
        <div class="ui-kpi__label"><span class="ui-kpi__icon"><i class="fa-solid fa-arrows-rotate"></i></span>MRR</div>
        <div class="ui-kpi__value num" :title="dash ? money(dash.mrr, dash.home) : ''"><span v-if="!dash" class="ui-skeleton sk"></span><template v-else>{{ kpiMoney(dash.mrr, dash.home) }}</template></div>
        <div class="ui-kpi__meta" data-testid="kpi-arr">ARR {{ dash ? money(dash.arr, dash.home) : '…' }}</div>
      </div>
      <button type="button" class="ui-kpi kpi-btn" data-testid="kpi-active" @click="go('active')">
        <div class="ui-kpi__label"><span class="ui-kpi__icon k-success"><i class="fa-solid fa-circle-check"></i></span>Active</div>
        <div class="ui-kpi__value num"><span v-if="!dash" class="ui-skeleton sk"></span><template v-else>{{ dash.active }}</template></div>
        <div class="ui-kpi__meta">{{ dash ? `${dash.subscribers} paying client${dash.subscribers === 1 ? '' : 's'}` : '…' }}</div>
      </button>
      <button type="button" class="ui-kpi kpi-btn" data-testid="kpi-pastdue" @click="go('past_due')">
        <div class="ui-kpi__label"><span class="ui-kpi__icon k-warning"><i class="fa-solid fa-hourglass-end"></i></span>Past due</div>
        <div class="ui-kpi__value num" :class="{ warn: dash?.past_due?.subscriptions }"><span v-if="!dash" class="ui-skeleton sk"></span><template v-else>{{ dash.past_due.subscriptions }}</template></div>
        <div class="ui-kpi__meta">{{ dash ? (dash.past_due.amount ? `${money(dash.past_due.amount, dash.home)} overdue` : 'nothing overdue') : '…' }}</div>
      </button>
      <button type="button" class="ui-kpi kpi-btn" data-testid="kpi-suspended" @click="go('suspended')">
        <div class="ui-kpi__label"><span class="ui-kpi__icon k-danger"><i class="fa-solid fa-ban"></i></span>Suspended</div>
        <div class="ui-kpi__value num" :class="{ danger: dash?.suspended }"><span v-if="!dash" class="ui-skeleton sk"></span><template v-else>{{ dash.suspended }}</template></div>
        <div class="ui-kpi__meta">{{ dash ? suspendedMeta : '…' }}</div>
      </button>
      <button type="button" class="ui-kpi kpi-btn" data-testid="kpi-churn" @click="go('cancelled')">
        <div class="ui-kpi__label"><span class="ui-kpi__icon"><i class="fa-solid fa-user-minus"></i></span>Churned this month</div>
        <div class="ui-kpi__value num"><span v-if="!dash" class="ui-skeleton sk"></span><template v-else>{{ dash.churned_this_month.count }}</template></div>
        <div class="ui-kpi__meta">{{ dash ? (dash.churned_this_month.rate_pct === null ? `since ${fmtDate(dash.churned_this_month.since, 'short')}` : `${dash.churned_this_month.rate_pct}% since ${fmtDate(dash.churned_this_month.since, 'short')}`) : '…' }}</div>
      </button>
      <div class="ui-kpi" data-testid="kpi-renewals">
        <div class="ui-kpi__label"><span class="ui-kpi__icon k-info"><i class="fa-solid fa-calendar-check"></i></span>Renewals · 30 days</div>
        <div class="ui-kpi__value num"><span v-if="!dash" class="ui-skeleton sk"></span><template v-else>{{ dash.renewals_30d.count }}</template></div>
        <div class="ui-kpi__meta">{{ dash ? money(dash.renewals_30d.amount, dash.home) : '…' }}</div>
      </div>
    </div>

    <section class="ui-card">
      <div class="ui-card__head tabs-head">
        <div class="ui-tabs" role="tablist">
          <button v-for="t in tabs" :key="t.id" type="button" class="ui-tab" :class="{ 'is-active': tab === t.id }" role="tab" :aria-selected="tab === t.id" :data-testid="`tab-${t.id}`" @click="setTab(t.id)">
            <i :class="t.icon"></i> {{ t.label }}<span v-if="t.count" class="ui-badge" :class="t.badge || 'ui-badge--info'">{{ t.count }}</span>
          </button>
        </div>
      </div>

      <!-- Overview -->
      <div v-if="tab === 'overview'" class="ui-card__body ov" data-testid="overview">
        <div v-if="!dash" class="ui-skeleton" style="height: 220px"></div>
        <template v-else>
          <div v-if="!subs.length && !loadingSubs" class="ui-empty" data-testid="empty-overview">
            <div class="ui-empty__icon"><i class="fa-solid fa-arrows-rotate"></i></div>
            <h3>No subscriptions yet</h3>
            <p>Put clients on your catalogue services — hosting, domains, email — and DASYIN invoices them every period, reminds them, and warns you before anything is suspended.</p>
            <div class="empty-actions">
              <button type="button" class="ui-btn ui-btn--primary" @click="openNew()"><i class="fa-solid fa-plus"></i> New subscription</button>
              <button v-if="dash.has_synergy" type="button" class="ui-btn" @click="setTab('sites')"><i class="fa-solid fa-server"></i> From your Synergy sites</button>
              <button type="button" class="ui-btn" @click="modal = 'import'"><i class="fa-solid fa-file-import"></i> Import CSV</button>
            </div>
          </div>

          <div v-if="dash.unbilled_sites" class="ui-alert callout" data-testid="unbilled-callout">
            <i class="fa-solid fa-server"></i>
            <span>
              <strong>{{ dash.unbilled_sites }} Synergy site{{ dash.unbilled_sites === 1 ? ' isn’t' : 's aren’t' }} billed yet</strong>
              <template v-if="dash.ready_sites"> — {{ dash.ready_sites }} {{ dash.ready_sites === 1 ? 'is' : 'are' }} matched to a client and ready in one click.</template>
            </span>
            <button type="button" class="ui-btn ui-btn--sm ui-btn--primary" @click="setTab('sites')">Bill them</button>
          </div>

          <div class="ov__grid">
            <section class="panel span2" data-testid="upcoming">
              <h3><i class="fa-solid fa-phone-volume"></i> Upcoming suspensions — call them <small>suspended within 7 days unless paid</small></h3>
              <p v-if="!dash.upcoming_suspensions.length" class="muted">Nobody is about to be suspended.</p>
              <div v-else class="ui-table-wrap">
                <table class="ui-table" v-table-cards>
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th>Invoice</th>
                      <th class="num">Unpaid</th>
                      <th>Suspended</th>
                      <th data-label=""></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="r in dash.upcoming_suspensions" :key="r.subscription_id" class="is-clickable" :data-testid="`up-${r.number}`" @click="openSub(r.subscription_id)">
                      <td class="card-title"><strong>{{ r.customer }}</strong><small class="sub">{{ r.number }} · {{ r.service }}<template v-if="r.phone"> · {{ r.phone }}</template></small></td>
                      <td>{{ r.invoice }}<small class="sub">{{ r.days_overdue > 0 ? `${r.days_overdue} day${r.days_overdue === 1 ? '' : 's'} overdue` : `due ${fmtDate(r.due_date, 'short')}` }}</small></td>
                      <td class="num"><strong>{{ money(r.balance, r.currency) }}</strong></td>
                      <td>
                        <span class="ui-badge" :class="r.days_to_suspend <= 1 ? 'ui-badge--danger' : 'ui-badge--warning'">{{ whenIn(r.days_to_suspend) }}</span>
                        <small class="sub">{{ fmtDate(r.suspend_on, 'short') }} · {{ r.automatic ? 'at Synergy (API)' : 'by hand' }}</small>
                      </td>
                      <td class="row-actions" @click.stop>
                        <button type="button" class="ui-btn ui-btn--sm" :data-testid="`up-extend-${r.number}`" @click="openSub(r.subscription_id, 'extend', 7)">+7 days</button>
                        <button type="button" class="ui-btn ui-btn--sm ui-btn--success" :data-testid="`up-paid-${r.number}`" @click="openSub(r.subscription_id, 'paid')">Paid</button>
                        <button type="button" class="ui-btn ui-btn--sm ui-btn--ghost" @click="openSub(r.subscription_id, 'skip')">Don't suspend</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section class="panel" data-testid="renewals">
              <h3><i class="fa-solid fa-calendar-check"></i> Renewals in the next 30 days</h3>
              <p v-if="!dash.renewals.length" class="muted">Nothing renews in the next 30 days.</p>
              <ul v-else class="list">
                <li v-for="r in dash.renewals.slice(0, 12)" :key="r.subscription_id + r.start" class="list__item" @click="openSub(r.subscription_id)">
                  <span class="list__main"><strong>{{ r.customer }}</strong><small>{{ r.service }}</small></span>
                  <span class="list__side"><strong class="num">{{ money(r.amount, r.currency) }}</strong><small>{{ fmtDate(r.start, 'short') }} · {{ r.paid ? 'paid' : r.invoiced ? 'invoiced' : `invoice ${fmtDate(r.invoice_date, 'short')}` }}</small></span>
                </li>
              </ul>
            </section>

            <section class="panel" data-testid="domains">
              <h3><i class="fa-solid fa-globe"></i> Domains to renew <small>next 30 days</small></h3>
              <p v-if="!dash.domains.length" class="muted">No linked domain expires in the next 30 days.</p>
              <ul v-else class="list">
                <li v-for="x in dash.domains" :key="x.domain" class="list__item" @click="openSub(x.subscription_id)">
                  <span class="list__main"><strong>{{ x.domain }}</strong><small>{{ x.customer }}{{ x.auto_renew ? ' · auto-renew on' : '' }}</small></span>
                  <span class="list__side"><strong :class="{ neg: x.days_left <= 7 }">{{ x.days_left < 0 ? 'expired' : `${x.days_left} days` }}</strong><small>{{ fmtDate(x.expires, 'short') }}</small></span>
                </li>
              </ul>
            </section>

            <section class="panel" data-testid="open-tasks">
              <h3><i class="fa-solid fa-list-check"></i> To do at the providers</h3>
              <p v-if="!openTasks.length" class="muted">Nothing to do by hand.</p>
              <ul v-else class="list">
                <li v-for="t in openTasks.slice(0, 8)" :key="t.id" class="list__item" @click="openSub(t.subscription_id)">
                  <span class="list__main"><strong><i :class="TASK_KINDS[t.kind]?.icon" :style="{ color: `var(--${TASK_KINDS[t.kind]?.tone})` }"></i> {{ t.title }}</strong><small>{{ t.customer_name }} · {{ t.subscription_number }}</small></span>
                  <span class="list__side"><small>{{ fmtDate(t.due_date, 'short') }}</small></span>
                </li>
              </ul>
            </section>

            <section class="panel" data-testid="recent-suspended">
              <h3><i class="fa-solid fa-ban"></i> Suspended now</h3>
              <p v-if="!dash.recent_suspensions.length" class="muted">No service is suspended.</p>
              <ul v-else class="list">
                <li v-for="x in dash.recent_suspensions" :key="x.subscription_id" class="list__item" @click="openSub(x.subscription_id)">
                  <span class="list__main"><strong>{{ x.customer }}</strong><small>{{ x.service }}</small></span>
                  <span class="list__side"><small>since {{ fmtDate(x.suspended_at, 'short') }}</small><small>{{ x.via === 'api' ? 'at Synergy (API)' : x.via === 'manual' ? 'by hand' : '' }}</small></span>
                </li>
              </ul>
            </section>
          </div>
          <p v-for="n in dash.notes" :key="n" class="ui-hint"><i class="fa-solid fa-circle-info"></i> {{ n }}</p>
          <p class="ui-hint">MRR counts active and past-due subscriptions before tax, at today's exchange rates, in {{ dash.home }}. It's a forecast — revenue and the P&amp;L count the invoices themselves.<template v-if="dash.margin.subscriptions"> Margin on {{ dash.margin.subscriptions }} with a known Synergy cost: {{ money(dash.margin.margin, dash.home) }}/mo{{ dash.margin.margin_pct !== null ? ` (${dash.margin.margin_pct}%)` : '' }}.</template></p>
        </template>
      </div>

      <!-- Subscriptions -->
      <template v-else-if="tab === 'subscriptions'">
        <div class="toolbar">
          <div class="chips" role="group" aria-label="Status">
            <button v-for="s in statusFilters" :key="s.key" type="button" class="chip" :class="{ on: status === s.key }" :aria-pressed="status === s.key" :data-testid="`filter-${s.key || 'all'}`" @click="status = s.key">
              {{ s.label }}<span v-if="s.count !== undefined" class="chip__n">{{ s.count }}</span>
            </button>
          </div>
          <div class="toolbar__right">
            <select v-model="period" class="ui-select sel" aria-label="Billing period" data-testid="filter-period">
              <option value="">Any period</option>
              <option v-for="p in PERIODS" :key="p.key" :value="p.key">{{ p.label }}</option>
            </select>
            <select v-model="supplier" class="ui-select sel" aria-label="Hosted at" data-testid="filter-supplier">
              <option value="">Any provider</option>
              <option v-for="s in SUPPLIERS.filter((x) => x.key)" :key="s.key" :value="s.key">{{ s.label }}</option>
            </select>
            <div class="ui-input-group search">
              <i class="fa-solid fa-magnifying-glass"></i>
              <input v-model="q" class="ui-input" type="search" placeholder="Search client, domain, service, SUB-…" aria-label="Search subscriptions" data-testid="sub-search" />
            </div>
          </div>
        </div>
        <div v-if="loadingSubs && !subs.length" class="ui-card__body"><div class="ui-skeleton" style="height: 200px"></div></div>
        <div v-else-if="!filtered.length" class="ui-empty">
          <div class="ui-empty__icon"><i class="fa-solid fa-magnifying-glass"></i></div>
          <h3>{{ subs.length ? 'No subscriptions match' : 'No subscriptions yet' }}</h3>
          <p>{{ subs.length ? 'Try another filter or search.' : 'Create the first one — it takes a minute.' }}</p>
          <button v-if="!subs.length" type="button" class="ui-btn ui-btn--primary" style="margin-top: 12px" @click="openNew()"><i class="fa-solid fa-plus"></i> New subscription</button>
        </div>
        <div v-else class="ui-table-wrap">
          <table class="ui-table" v-table-cards data-testid="sub-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Services</th>
                <th class="num">Amount</th>
                <th>Next billing</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in filtered" :key="s.id" class="is-clickable" :data-testid="`sub-${s.number}`" :data-status="s.status" @click="openSub(s.id)">
                <td class="card-title">
                  <strong>{{ s.customer_name }}</strong>
                  <small class="sub">{{ s.number }}<template v-if="s.site_domain || s.domain"> · {{ s.site_domain || s.domain }}</template><template v-if="supplierLabel(s.supplier)"> · {{ supplierLabel(s.supplier) }}</template></small>
                </td>
                <td>
                  <span v-for="l in s.lines" :key="l.id" class="line-chip"><i :class="kindIcon(l.kind)"></i> {{ l.description }}<template v-if="l.quantity !== 1"> × {{ l.quantity }}</template></span>
                </td>
                <td class="num">
                  <strong>{{ money(s.amount_tax, s.currency) }}</strong><small class="sub">{{ periodLabel(s.period) }}<template v-if="s.currency !== s.home_currency && s.monthly_home !== null"> · ≈ {{ money(s.monthly_home, s.home_currency) }}/mo</template></small>
                </td>
                <td class="nowrap">
                  <template v-if="s.open">
                    <strong :class="{ neg: s.open.days_overdue > 0 }">{{ fmtDate(s.open.due_date, 'short') }}</strong>
                    <small class="sub">{{ s.open.invoice_number }} · {{ s.open.days_overdue > 0 ? `${s.open.days_overdue} days overdue` : s.open.draft ? 'draft' : 'unpaid' }}</small>
                  </template>
                  <template v-else-if="s.status !== 'cancelled'">{{ fmtDate(s.next_billing_date, 'short') }}<small v-if="s.next_invoice_date" class="sub">invoice {{ fmtDate(s.next_invoice_date, 'short') }}</small></template>
                  <span v-else class="muted">—</span>
                </td>
                <td>
                  <span class="ui-badge" :class="statusBadge(s.status)">{{ statusLabel(s.status) }}</span>
                  <small v-if="s.open?.suspend_on && s.status !== 'suspended'" class="sub">suspends {{ fmtDate(s.open.suspend_on, 'short') }}</small>
                  <small v-else-if="s.status === 'suspended' && s.suspended_via" class="sub">{{ s.suspended_via === 'api' ? 'at Synergy (API)' : 'by hand' }}</small>
                  <small v-if="s.open_tasks" class="sub warn-txt"><i class="fa-solid fa-list-check"></i> {{ s.open_tasks }} task{{ s.open_tasks === 1 ? '' : 's' }}</small>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <!-- Synergy sites -->
      <SynergySites v-else-if="tab === 'sites'" :open-domain="siteQuery" @created="onSitesCreated" @count="sitesCount = $event" />

      <!-- Tasks -->
      <template v-else-if="tab === 'tasks'">
        <div class="toolbar">
          <p class="hs-lead">Suspending and unsuspending at hosting.com and other providers — or at Synergy Wholesale when the API isn't connected — is done by you, with these steps. Synergy work done through the API shows here as done.</p>
          <div class="chips" role="group" aria-label="Task status">
            <button v-for="s in ['open', 'done', 'all']" :key="s" type="button" class="chip" :class="{ on: taskStatus === s }" :aria-pressed="taskStatus === s" @click="taskStatus = s">{{ s === 'open' ? 'To do' : s === 'done' ? 'Done' : 'All' }}</button>
          </div>
        </div>
        <div class="ui-card__body">
          <div v-if="!shownTasks.length" class="ui-empty">
            <div class="ui-empty__icon"><i class="fa-solid fa-list-check"></i></div>
            <h3>{{ taskStatus === 'open' ? 'Nothing to do at the providers' : 'No tasks' }}</h3>
            <p>When a subscription is suspended, unsuspended or cancelled, the steps appear here.</p>
          </div>
          <TaskCard v-for="t in shownTasks" :key="t.id" :task="t" show-subscription @changed="onTaskChanged" />
        </div>
      </template>

      <!-- Activity -->
      <template v-else-if="tab === 'activity'">
        <div class="toolbar">
          <p class="hs-lead">Every invoice email, reminder, final notice, admin alert, suspension and digest — with who it went to.</p>
        </div>
        <div v-if="!events.length" class="ui-empty">
          <div class="ui-empty__icon"><i class="fa-solid fa-clock-rotate-left"></i></div>
          <h3>Nothing sent yet</h3>
          <p>Invoices, reminders and alerts appear here as they go out.</p>
        </div>
        <div v-else class="ui-table-wrap">
          <table class="ui-table" v-table-cards data-testid="event-table">
            <thead>
              <tr>
                <th>When</th>
                <th>What</th>
                <th>To</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="e in events" :key="e.id" :class="{ 'is-clickable': e.subscription_id }" @click="e.subscription_id && openSub(e.subscription_id)">
                <td class="card-title nowrap"><strong>{{ fmtDate(e.day, 'short') }}</strong><small class="sub">{{ fmtTime(e.created_at) }}</small></td>
                <td>{{ e.title }}<small class="sub">{{ e.subject }}</small></td>
                <td><span class="ui-badge" :class="e.audience === 'client' ? 'ui-badge--info' : 'ui-badge--draft'">{{ e.audience === 'client' ? 'Client' : 'Admins' }}</span><small class="sub">{{ e.recipients }}</small></td>
                <td>
                  <span class="ui-badge" :class="{ sent: 'ui-badge--success', done: 'ui-badge--success', failed: 'ui-badge--danger', skipped: 'ui-badge--draft', sending: 'ui-badge--info' }[e.status]">{{ e.status }}</span>
                  <small v-if="e.error" class="sub neg">{{ e.error }}</small>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <!-- Settings -->
      <div v-else-if="tab === 'settings'" class="ui-card__body">
        <SettingsPanel @saved="loadDash" />
      </div>
    </section>

    <SubscriptionDrawer v-if="drawerId" :id="drawerId" :key="drawerId" :action="drawerAction" :action-days="drawerDays" @close="closeSub" @changed="onChanged" @action-done="clearAction" />
    <SubscriptionModal v-if="modal === 'sub'" :preset="preset" @close="modal = ''" @saved="onSubSaved" />
    <ImportModal v-if="modal === 'import'" @close="modal = ''" @imported="reload" />
  </div>
</template>

<script>
import SubscriptionModal from '@/components/subscriptions/SubscriptionModal.vue'
import SubscriptionDrawer from '@/components/subscriptions/SubscriptionDrawer.vue'
import SynergySites from '@/components/subscriptions/SynergySites.vue'
import ImportModal from '@/components/subscriptions/ImportModal.vue'
import SettingsPanel from '@/components/subscriptions/SettingsPanel.vue'
import TaskCard from '@/components/subscriptions/TaskCard.vue'
import { subscriptionsApi, PERIODS, SUPPLIERS, periodLabel, kindIcon, statusLabel, statusBadge, supplierLabel, whenIn, TASK_KINDS } from '@/services/subscriptions'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { formatDate } from '@/utils/format'
import { formatCurrency } from '@/utils/currencies'
import { useAuthStore } from '@/stores/auth'

const TABS = ['overview', 'subscriptions', 'sites', 'tasks', 'activity', 'settings']

export default {
  name: 'Subscriptions',
  components: { SubscriptionModal, SubscriptionDrawer, SynergySites, ImportModal, SettingsPanel, TaskCard },
  props: { id: { type: String, default: '' } },
  data() {
    return {
      PERIODS,
      SUPPLIERS,
      TASK_KINDS,
      tab: TABS.includes(this.$route.query.tab) ? this.$route.query.tab : 'overview',
      dash: null,
      subs: [],
      counts: {},
      tasks: [],
      events: [],
      loadingSubs: true,
      status: this.$route.query.status || '',
      period: '',
      supplier: '',
      q: '',
      taskStatus: 'open',
      modal: '',
      preset: {},
      sitesCount: 0,
      clockBusy: false,
      handled: '',
      error: ''
    }
  },
  computed: {
    suspendedMeta() {
      const d = this.dash
      const soon = d.upcoming_suspensions.length
      const unpaid = d.past_due.suspended_amount ? `${this.money(d.past_due.suspended_amount, d.home)} unpaid · ` : ''
      return `${unpaid}${soon} more within 7 days unless paid`
    },
    isAdmin() {
      try {
        const r = useAuthStore().user?.role
        return ['owner', 'admin', 'org_admin', 'super_admin'].includes(r)
      } catch {
        return false
      }
    },
    drawerId() {
      return this.id || String(this.$route.query.sub || '')
    },
    drawerAction() {
      return this.handled === this.$route.fullPath ? '' : String(this.$route.query.action || '')
    },
    drawerDays() {
      return Number(this.$route.query.days) || 7
    },
    siteQuery() {
      return String(this.$route.query.site || '')
    },
    tabs() {
      const open = this.tasks.filter((t) => t.status === 'open').length
      return [
        { id: 'overview', label: 'Overview', icon: 'fa-solid fa-gauge-high' },
        { id: 'subscriptions', label: 'Subscriptions', icon: 'fa-solid fa-arrows-rotate', count: this.subs.filter((s) => s.status !== 'cancelled').length || 0, badge: 'ui-badge--draft' },
        { id: 'sites', label: 'Synergy sites', icon: 'fa-solid fa-server', count: this.dash?.unbilled_sites || 0, badge: 'ui-badge--info' },
        { id: 'tasks', label: 'Tasks', icon: 'fa-solid fa-list-check', count: open, badge: 'ui-badge--warning' },
        { id: 'activity', label: 'Activity', icon: 'fa-solid fa-clock-rotate-left' },
        { id: 'settings', label: 'Settings', icon: 'fa-solid fa-sliders' }
      ]
    },
    statusFilters() {
      const c = this.counts || {}
      const n = (k) => c[k] || 0
      return [
        { key: '', label: 'All', count: Object.values(c).reduce((a, b) => a + b, 0) },
        { key: 'active', label: 'Active', count: n('active') },
        { key: 'past_due', label: 'Past due', count: n('past_due') },
        { key: 'suspended', label: 'Suspended', count: n('suspended') },
        { key: 'cancelled', label: 'Cancelled', count: n('cancelled') }
      ]
    },
    filtered() {
      const t = this.q.trim().toLowerCase()
      return this.subs.filter((s) => {
        if (this.status && s.status !== this.status) return false
        if (this.period && s.period !== this.period) return false
        if (this.supplier && s.supplier !== this.supplier) return false
        if (!t) return true
        return [s.number, s.name, s.customer_name, s.customer_email, s.site_domain, s.domain, ...(s.domains || []), ...(s.lines || []).map((l) => l.description)].join(' ').toLowerCase().includes(t)
      })
    },
    openTasks() {
      return this.tasks.filter((t) => t.status === 'open')
    },
    shownTasks() {
      return this.taskStatus === 'all' ? this.tasks : this.tasks.filter((t) => t.status === this.taskStatus)
    },
    moreActions() {
      return [
        { label: 'Run billing now', icon: 'fa-solid fa-play', onClick: this.runNow, hidden: !this.isAdmin },
        { label: 'Email the daily digest now', icon: 'fa-solid fa-envelope-open-text', onClick: this.sendDigest, hidden: !this.isAdmin },
        { divider: true },
        { label: 'Services catalogue', icon: 'fa-solid fa-bell-concierge', onClick: () => this.$router.push('/services') }
      ]
    }
  },
  watch: {
    '$route.query.tab'(t) {
      if (TABS.includes(t)) this.tab = t
    },
    '$route.query.new'(v) {
      if (v) this.openNewFromQuery()
    }
  },
  created() {
    this.reload()
    this.openNewFromQuery()
  },
  methods: {
    statusLabel,
    statusBadge,
    periodLabel,
    kindIcon,
    supplierLabel,
    whenIn,
    money(v, c) {
      return formatCurrency(v || 0, c)
    },
    /** A KPI figure: whole units (compact from a million) so it fits the card; the exact amount is in its title. */
    kpiMoney(v, c) {
      const n = Number(v) || 0
      if (Math.abs(n) >= 1e6) return formatCurrency(n, c, { compact: true })
      try {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency: c, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)
      } catch {
        return formatCurrency(n, c)
      }
    },
    fmtDate(d, s) {
      return d ? formatDate(d, s) : '—'
    },
    fmtTime(t) {
      if (!t) return ''
      return new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    },
    setTab(t) {
      this.tab = t
      const query = { ...this.$route.query, tab: t === 'overview' ? undefined : t }
      delete query.status
      delete query.site
      this.$router.replace({ path: this.$route.path, query })
      if (t === 'activity') this.loadEvents()
    },
    go(status) {
      this.setTab('subscriptions')
      this.status = status || ''
    },
    async reload() {
      this.error = ''
      await Promise.all([this.loadDash(), this.loadSubs(), this.loadTasks(), this.tab === 'activity' ? this.loadEvents() : null])
    },
    async loadDash() {
      try {
        this.dash = await subscriptionsApi.dashboard()
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load the subscriptions')
      }
    },
    async loadSubs() {
      this.loadingSubs = true
      try {
        const r = await subscriptionsApi.list()
        this.subs = r.subscriptions || []
        this.counts = r.counts || {}
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load the subscriptions')
      } finally {
        this.loadingSubs = false
      }
    },
    async loadTasks() {
      try {
        this.tasks = (await subscriptionsApi.tasks({ status: 'all' })).tasks || []
      } catch {
        this.tasks = []
      }
    },
    async loadEvents() {
      try {
        this.events = (await subscriptionsApi.events()).events || []
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load the activity')
      }
    },
    // The drawer opens with ?sub= (the page stays mounted); /subscriptions/:id
    // (links in emails and elsewhere) opens it too.
    openSub(id, action, days) {
      const query = { ...this.$route.query, sub: id }
      delete query.action
      delete query.days
      if (action) {
        query.action = action
        if (days) query.days = String(days)
      }
      this.handled = ''
      this.$router.push({ path: this.id ? `/subscriptions/${id}` : '/subscriptions', query: this.id ? { ...query, sub: undefined } : query })
    },
    closeSub() {
      const query = { ...this.$route.query }
      delete query.action
      delete query.days
      delete query.sub
      this.$router.push({ path: '/subscriptions', query })
    },
    clearAction() {
      // The action was confirmed (or not): don't run it again on reload.
      this.handled = this.$route.fullPath
      const query = { ...this.$route.query }
      if (query.action) {
        delete query.action
        delete query.days
        this.$router.replace({ path: this.$route.path, query })
      }
    },
    onChanged() {
      this.reload()
    },
    openNew(preset = {}) {
      this.preset = preset
      this.modal = 'sub'
    },
    openNewFromQuery() {
      const c = this.$route.query.new
      if (c) {
        this.openNew(c === '1' ? {} : { customer_id: String(c), customer_name: String(this.$route.query.name || '') })
        const query = { ...this.$route.query }
        delete query.new
        delete query.name
        this.$router.replace({ path: this.$route.path, query })
      }
    },
    onSubSaved(s) {
      this.modal = ''
      this.reload()
      this.openSub(s.id)
    },
    onSitesCreated() {
      this.reload()
    },
    onTaskChanged() {
      this.loadTasks()
      this.loadDash()
    },
    async runNow() {
      try {
        const r = await subscriptionsApi.run()
        const parts = [
          r.invoiced && `${r.invoiced} invoiced`,
          r.emailed && `${r.emailed} emailed`,
          r.reminders && `${r.reminders} reminders`,
          r.final_notices && `${r.final_notices} final notices`,
          r.alerts && `${r.alerts} alerts`,
          r.suspended && `${r.suspended} suspended`,
          r.unsuspended && `${r.unsuspended} unsuspended`,
          r.domain_reminders && `${r.domain_reminders} domain reminders`
        ].filter(Boolean)
        toast.success(parts.length ? `Billing ran: ${parts.join(', ')}` : 'Billing ran — nothing was due')
        if (r.errors?.length) toast.warning(r.errors[0])
        this.reload()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not run billing'))
      }
    },
    async sendDigest() {
      try {
        await subscriptionsApi.sendDigest()
        toast.success('Digest emailed to the administrators')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not email the digest'))
      }
    },
    async moveClock(days) {
      this.clockBusy = true
      try {
        const r = await subscriptionsApi.setTestClock(days === 0 ? { reset: true, run: true } : { days, run: true })
        toast.info(`Test clock: ${formatDate(r.today)}`)
        await this.reload()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not move the test clock'))
      } finally {
        this.clockBusy = false
      }
    }
  }
}
</script>

<style scoped>
.ui-alert {
  margin-bottom: 16px;
}
.num {
  font-variant-numeric: tabular-nums;
}
.sk {
  display: inline-block;
  width: 110px;
  height: 26px;
}
.kpis6 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
@media (min-width: 1400px) {
  .kpis6 {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }
}
@media (max-width: 1000px) {
  .kpis6 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
.kpi-btn {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: stretch;
  text-align: left;
  font: inherit;
  color: inherit;
  cursor: pointer;
}
.kpi-btn:hover {
  border-color: var(--border-strong);
}
.ui-kpi__value.warn {
  color: var(--warning);
}
.ui-kpi__value.danger {
  color: var(--danger);
}
.clock {
  align-items: center;
}
.clock__btns {
  margin-left: auto;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.callout {
  align-items: center;
}
.callout .ui-btn {
  margin-left: auto;
  flex-shrink: 0;
}
.tabs-head {
  padding-bottom: 0;
  overflow-x: auto;
}
.ui-tab .ui-badge {
  margin-left: 6px;
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
  align-items: center;
  flex-wrap: wrap;
}
.sel {
  width: auto;
  min-width: 140px;
}
.hs-lead {
  margin: 0;
  color: var(--text-2);
  font-size: 13.5px;
  max-width: 720px;
}
.search {
  min-width: 220px;
  flex: 0 1 300px;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.chip {
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-2);
  border-radius: 999px;
  padding: 5px 12px;
  font-size: 13px;
  cursor: pointer;
}
.chip.on {
  background: var(--accent-soft);
  border-color: var(--accent);
  color: var(--accent);
  font-weight: 600;
}
.chip__n {
  margin-left: 6px;
  font-size: 11.5px;
  opacity: 0.8;
}
.sub {
  display: block;
  font-size: 12px;
  color: var(--text-3);
}
.muted {
  color: var(--text-3);
}
.nowrap {
  white-space: nowrap;
}
.neg {
  color: var(--danger);
}
.warn-txt {
  color: var(--warning);
}
.row-actions {
  text-align: right;
  white-space: nowrap;
}
.row-actions .ui-btn + .ui-btn {
  margin-left: 4px;
}
.line-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin: 2px 6px 2px 0;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  font-size: 12.5px;
  white-space: nowrap;
}
.line-chip i {
  color: var(--text-3);
  font-size: 11px;
}
.ov__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 12px;
}
.panel {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 14px 16px;
  background: var(--surface);
  min-width: 0;
}
.panel.span2 {
  grid-column: 1 / -1;
}
.panel h3 {
  margin: 0 0 10px;
  font-size: 14.5px;
}
.panel h3 i {
  color: var(--accent);
  margin-right: 6px;
}
.panel h3 small {
  font-weight: 400;
  color: var(--text-3);
  font-size: 12.5px;
  margin-left: 6px;
}
.list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.list__item {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 0;
  border-top: 1px solid var(--border);
  cursor: pointer;
}
.list__item:first-child {
  border-top: 0;
}
.list__item:hover strong {
  color: var(--accent);
}
.list__main,
.list__side {
  min-width: 0;
}
.list__main {
  flex: 1 1 0;
}
.list__main strong {
  overflow-wrap: anywhere;
}
.list__main small,
.list__side small {
  display: block;
  color: var(--text-3);
  font-size: 12px;
}
/* The figures keep their width; past half the row they wrap rather than run out of the card. */
.list__side {
  flex: 0 0 auto;
  max-width: 50%;
  text-align: right;
}
.empty-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 12px;
}
@media (max-width: 900px) {
  .ov__grid {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 640px) {
  .search {
    min-width: 0;
    flex: 1 1 100%;
  }
  .toolbar__right {
    width: 100%;
  }
  .sel {
    flex: 1 1 40%;
    min-width: 0;
  }
  .clock,
  .callout {
    flex-wrap: wrap;
  }
  .clock__btns,
  .callout .ui-btn {
    margin-left: 0;
  }
}
</style>
