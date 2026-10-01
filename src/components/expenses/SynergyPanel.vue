<template>
  <div class="syn" data-testid="synergy-panel">
    <div v-if="loadError" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ loadError }} <a href="#" @click.prevent="load">Try again</a></span></div>
    <div v-if="!r && !loadError" class="ui-skeleton" style="height: 420px"></div>

    <!-- One-time notice after the upgrade backfilled the Synergy expenses -->
    <div v-if="acc && acc.notice" class="ui-alert ui-alert--success notice" data-testid="synergy-notice">
      <i class="fa-solid fa-circle-check"></i>
      <span>{{ acc.notice }} <a href="#" @click.prevent="sub = 'accounting'">How they count</a></span>
      <button type="button" class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon x" aria-label="Dismiss" @click="dismissNotice"><i class="fa-solid fa-xmark"></i></button>
    </div>

    <!-- Empty: start by uploading -->
    <template v-if="r && !r.has_data">
      <div class="ui-empty small start">
        <div class="ui-empty__icon"><i class="fa-solid fa-server"></i></div>
        <h3>See what your Synergy hosting really costs — and earns</h3>
        <p>Upload your monthly statements and hosting usage reports from Synergy Wholesale (or connect Gmail and they arrive by themselves). Expenses are created automatically, with spend, run-rate, balance runway, disk usage per site and margin per client.</p>
      </div>
    </template>

    <div v-if="r && r.has_data" class="toolbar top">
      <button type="button" class="ui-btn" :class="{ 'is-on': showUpload }" data-testid="synergy-upload-toggle" @click="showUpload = !showUpload">
        <i class="fa-solid fa-cloud-arrow-up"></i> Upload files
      </button>
      <span v-if="acc" class="counting" data-testid="synergy-counting">
        <i class="fa-solid fa-scale-balanced"></i>
        Counting <strong>{{ acc.mode === 'topups' ? 'top-ups from your bank' : 'service charges' }}</strong>
        <span class="hide-xs">· {{ acc.auto_approve ? 'auto-approved' : 'approve in the Inbox' }}</span>
        <a href="#" @click.prevent="sub = 'accounting'">Change</a>
      </span>
      <span class="spacer"></span>
      <button type="button" class="ui-btn ui-btn--icon" title="Export the per-site table (CSV)" aria-label="Export CSV" @click="exportCsv"><i class="fa-solid fa-download"></i></button>
    </div>
    <!-- One upload instance for the empty and the data view, so the summary stays after the first upload. -->
    <SynergyUpload v-if="r && (!r.has_data || showUpload)" :compact="r.has_data" @uploaded="onUploaded" />

    <template v-if="r && r.has_data">
      <!-- Summary: 4 KPIs in the home currency, AUD secondary -->
      <div class="ui-kpis kpis" data-testid="synergy-kpis">
        <KpiCard label="Spend this month" icon="fa-solid fa-calendar-day" tone="accent" :value="h(k.this_month_home, k.this_month)" :meta="metaAud(k.this_month, monthLabel(thisMonth, true))"
          :show-delta="false" data-kpi="this_month" />
        <KpiCard label="Year to date" icon="fa-solid fa-chart-column" tone="info" :value="h(k.ytd_home, k.ytd)" :meta="metaAud(k.ytd, `last month ${hShort(k.last_month_home, k.last_month)}`)" :show-delta="false" data-kpi="ytd" />
        <KpiCard label="Monthly run-rate" icon="fa-solid fa-repeat" tone="warning" :value="h(k.run_rate_home, k.run_rate)" :meta="runRateMeta" :show-delta="false" data-kpi="run_rate" />
        <KpiCard label="Balance" icon="fa-solid fa-wallet" :tone="balanceTone" :value="k.balance == null ? '—' : aud(k.balance)" :meta="balanceMeta" :show-delta="false" data-kpi="balance" />
      </div>
      <p v-if="isForeign" class="fxline" data-testid="synergy-fx">
        <i class="fa-solid fa-money-bill-transfer"></i>
        {{ rateNote(r.fx) }} · spend uses each month's own rate, run-rates and prices today's rate
      </p>

      <!-- Charts | decisions -->
      <div class="row2">
        <div class="col">
          <section class="panel">
            <div class="panel__head">
              <h3>Monthly Synergy spend</h3>
              <div class="seg" role="group" aria-label="Date spend by">
                <button type="button" :class="{ on: basis === 'charge' }" :aria-pressed="basis === 'charge'" data-basis="charge" @click="setBasis('charge')">Charge date</button>
                <button type="button" :class="{ on: basis === 'service' }" :aria-pressed="basis === 'service'" data-basis="service" @click="setBasis('service')">Service month</button>
              </div>
            </div>
            <BarChart v-if="r.months.length" :labels="r.months.map((x) => x.month)" :values="r.months.map((x) => (isForeign ? x.total_home : x.total))"
              :colors="r.months.map((x) => (x.total < 0 ? 'var(--viz-3)' : 'var(--viz-1)'))" :height="200" value-name="Spend" :format-x="(x) => monthLabel(x)"
              :format-title="(x) => monthLabel(x, true)" :format-y="(v) => money(v, home, true)" :format-value="(v) => money(v, home)" :detail="monthDetail" aria-label="Synergy spend per month" />
            <p class="muted cap">{{ home }}{{ isForeign ? ' at each month’s rate' : '' }} · top-ups excluded · hover a bar for AUD and the categories</p>
          </section>
          <section class="panel">
            <div class="panel__head">
              <h3>Account balance</h3>
              <span class="muted">AUD · {{ r.negative_spells.length ? `went negative ${r.negative_spells.length}×` : 'end of each day' }}</span>
            </div>
            <SynergyBalanceChart v-if="r.balance_points.length" :points="r.balance_points" :format="(v) => aud(v)" :height="170" />
            <p v-else class="muted">Upload a statement to see the balance.</p>
          </section>
        </div>
        <section class="panel" data-testid="synergy-decisions">
          <div class="panel__head">
            <h3><i class="fa-solid fa-lightbulb head-ic"></i> What to do</h3>
            <span class="muted">{{ r.decisions.length }} recommendation{{ r.decisions.length === 1 ? '' : 's' }}</span>
          </div>
          <p v-if="!r.decisions.length" class="muted ok"><i class="fa-solid fa-circle-check"></i> Nothing needs attention.</p>
          <ul class="decs">
            <li v-for="x in decisionsShown" :key="x.key" :class="'sev-' + x.severity" :data-type="x.type">
              <span class="dic"><i :class="decIcon(x)"></i></span>
              <div class="dbody">
                <strong>{{ x.title }}</strong>
                <span class="dtext" :class="{ open: openDec === x.key }" :title="openDec === x.key ? '' : 'Click to read more'" @click="openDec = openDec === x.key ? '' : x.key">{{ x.body }}</span>
                <div class="dacts">
                  <button v-if="x.domain" type="button" class="ui-btn ui-btn--ghost ui-btn--sm" @click="openSite(x.domain)">Open {{ x.domain }}</button>
                  <button v-if="x.type === 'unbilled'" type="button" class="ui-btn ui-btn--ghost ui-btn--sm" @click="showFlag('unbilled')">Show unbilled sites</button>
                  <button v-if="x.type === 'below_cost'" type="button" class="ui-btn ui-btn--ghost ui-btn--sm" @click="showFlag('below_cost')">Show them</button>
                  <button v-if="x.type === 'cancellations'" type="button" class="ui-btn ui-btn--ghost ui-btn--sm" @click="showStatus('cancelled')">Show cancelled</button>
                </div>
              </div>
              <span v-if="x.impact" class="impact" :class="x.impact < 0 ? 'txt-ok' : ''" :title="x.impact < 0 ? 'Saving per month' : 'Per month / at stake'">
                <template v-if="x.impact_home">{{ x.impact < 0 ? '−' : '+' }}{{ wholeMoney(Math.abs(x.impact), home) }}/mo<small v-if="isForeign" class="block muted">≈ {{ aud(Math.abs(x.impact) / fxRate) }}</small></template>
                <template v-else>{{ x.impact < 0 ? '−' : '+' }}{{ aud(Math.abs(x.impact)) }}/mo<small v-if="isForeign" class="block muted">≈ {{ wholeMoney(Math.abs(x.impact) * fxRate, home) }}</small></template>
              </span>
            </li>
          </ul>
          <button v-if="r.decisions.length > 4" type="button" class="ui-btn ui-btn--ghost ui-btn--sm more" @click="allDecisions = !allDecisions">
            {{ allDecisions ? 'Show fewer' : `Show all ${r.decisions.length}` }}
          </button>
        </section>
      </div>

      <!-- Sites, how costs count, plan prices, comparison, uploads -->
      <section class="panel tabsec">
        <div class="ui-tabs subtabs" role="tablist" aria-label="Synergy details">
          <button v-for="t in subTabs" :key="t.key" class="ui-tab" :class="{ 'is-active': sub === t.key }" role="tab" :aria-selected="sub === t.key" :data-sub="t.key" @click="sub = t.key">
            <i :class="t.icon"></i> {{ t.label }}<span v-if="t.count" class="count">{{ t.count }}</span>
          </button>
        </div>

        <!-- Sites -->
        <div v-if="sub === 'sites'" class="subbody">
          <div class="toolbar">
            <div class="ui-input-group search">
              <i class="fa-solid fa-magnifying-glass"></i>
              <input v-model="q" class="ui-input" placeholder="Search domain, client, plan…" aria-label="Search sites" data-testid="site-search" />
            </div>
            <select v-model="status" class="ui-select narrow" aria-label="Status" data-testid="site-status">
              <option value="">All statuses</option>
              <option value="current">Active &amp; new</option>
              <option value="active">Active</option>
              <option value="new">New</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select v-model="flag" class="ui-select narrow" aria-label="Flag" data-testid="site-flag">
              <option value="">All sites</option>
              <option value="attention">Needs attention</option>
              <option value="over_quota">Over quota</option>
              <option value="near_full">75%+ full</option>
              <option value="fast_growth">Growing fast</option>
              <option value="unbilled">Not billed</option>
              <option value="no_client">No client</option>
              <option value="below_cost">Below cost</option>
            </select>
            <span class="muted">{{ sitesShown.length }} of {{ r.sites.length }}</span>
          </div>
          <div v-if="!sitesShown.length" class="ui-empty small"><div class="ui-empty__icon"><i class="fa-solid fa-filter"></i></div><h3>No sites match</h3><p>Change the search or filters.</p></div>
          <div v-else class="ui-table-wrap">
            <table class="ui-table sites" data-testid="synergy-sites">
              <thead>
                <tr>
                  <th v-for="c in columns" :key="c.key" :class="[c.cls, { sortable: c.sort }]" :aria-sort="sortKey === c.key ? (sortDir > 0 ? 'ascending' : 'descending') : null" @click="c.sort && sortBy(c.key)">
                    {{ c.label }} <i v-if="sortKey === c.key" class="fa-solid" :class="sortDir > 0 ? 'fa-caret-up' : 'fa-caret-down'"></i>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="s in sitesShown" :key="s.domain" class="is-clickable" :class="'st-' + s.status" :data-domain="s.domain" :data-status="s.status" :data-flags="s.flags.join(' ')" @click="openSite(s.domain)">
                  <td>
                    <div class="dom">
                      <strong>{{ s.domain }}</strong>
                      <span class="badges">
                        <span v-if="s.status !== 'active'" class="ui-badge" :class="s.status === 'new' ? 'ui-badge--info' : 'ui-badge--draft'">{{ s.status }}</span>
                        <span v-for="f in s.flags" :key="f" class="ui-badge" :class="flagTone(f)" :data-flag="f">{{ flagLabel(f) }}</span>
                      </span>
                      <small class="show-sm muted">{{ s.plan }}<template v-if="s.customer_name"> · {{ s.customer_name }}</template></small>
                    </div>
                  </td>
                  <td class="hide-sm">
                    <span v-if="s.customer_name" class="client" :title="matchTitle(s)"><i :class="s.client_match === 'manual' ? 'fa-solid fa-link' : 'fa-solid fa-wand-magic-sparkles'"></i> {{ s.customer_name }}</span>
                    <span v-else-if="s.no_client" class="muted">Own site</span>
                    <button v-else-if="s.status !== 'cancelled'" type="button" class="ui-btn ui-btn--ghost ui-btn--sm linkc" @click.stop="openSite(s.domain)">Link client</button>
                    <span v-else class="muted">—</span>
                  </td>
                  <td class="hide-sm">{{ s.plan || '—' }}<small v-if="s.suggested_plan" class="block sug">→ {{ s.suggested_plan }} ({{ s.suggested_delta > 0 ? '+' : '−' }}{{ aud(Math.abs(s.suggested_delta)) }}/mo)</small></td>
                  <td class="num" data-col="cost">
                    <template v-if="s.status === 'cancelled'">—</template>
                    <template v-else>
                      {{ aud(s.total_monthly) }}<small v-if="isForeign" class="block muted">≈ {{ wholeMoney(s.cost_home, home) }}</small><small v-if="s.domain_monthly" class="block muted">incl. domain</small>
                    </template>
                  </td>
                  <td class="disk">
                    <template v-if="s.pct_used != null">
                      <div class="bar" :title="`${mb(s.usage_mb)} of ${mb(s.limit_mb)}`"><span :class="barTone(s)" :style="{ width: Math.min(100, s.pct_used) + '%' }"></span></div>
                      <small><b>{{ s.pct_used.toFixed(0) }}%</b> · {{ mb(s.usage_mb) }} / {{ mb(s.limit_mb) }}</small>
                    </template>
                    <span v-else class="muted">no report</span>
                  </td>
                  <td class="hide-sm nowrap">
                    <template v-if="s.trend">
                      <i class="fa-solid trend" :class="{ 'fa-arrow-trend-up up': s.trend === 'up', 'fa-arrow-trend-down down': s.trend === 'down', 'fa-arrow-right flat': s.trend === 'flat' }"></i>
                      {{ s.growth_mb_month > 0 ? '+' : '' }}{{ mb(s.growth_mb_month) }}/mo
                    </template>
                    <span v-else class="muted">—</span>
                    <small v-if="s.days_to_full != null" class="block" :class="s.days_to_full <= 30 ? 'txt-danger' : 'muted'">{{ s.days_to_full === 0 ? 'full now' : s.days_to_full > 365 ? 'over a year to full' : `~${s.days_to_full} days to full` }}</small>
                  </td>
                  <td class="num hide-sm">{{ s.billed != null ? money(s.billed, home) : '—' }}<small v-if="s.billed_source === 'manual'" class="block muted">set by you</small></td>
                  <td class="num">
                    <template v-if="s.margin != null"><strong :class="s.margin < 0 ? 'txt-danger' : 'txt-ok'">{{ money(s.margin, home) }}</strong><small v-if="s.margin_pct != null" class="block muted">{{ s.margin_pct.toFixed(1) }}%</small></template>
                    <span v-else class="muted">—</span>
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td><strong>Total (active)</strong></td>
                  <td class="hide-sm"></td>
                  <td class="hide-sm"></td>
                  <td class="num"><strong>{{ isForeign ? wholeMoney(totals.cost * fxRate, home) : aud(totals.cost) }}</strong><small v-if="isForeign" class="block muted">{{ aud(totals.cost) }}</small></td>
                  <td></td>
                  <td class="hide-sm"></td>
                  <td class="num hide-sm"><strong>{{ money(totals.billed, home) }}</strong></td>
                  <td class="num"><strong v-if="k.margin_monthly != null">{{ money(k.margin_monthly, home) }}</strong></td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p class="muted cap">Cost per month in AUD{{ isForeign ? ` (≈ ${home} at today's rate)` : '' }}; billed and margin per month in {{ home }}.</p>
        </div>

        <!-- How costs count -->
        <div v-else-if="sub === 'accounting'" class="subbody">
          <SynergyAccounting v-if="acc" :acc="acc" :can-edit="canEdit" @changed="onAccounting" />
          <div v-else class="ui-skeleton" style="height: 240px"></div>
        </div>

        <!-- Plan prices -->
        <div v-else-if="sub === 'plans'" class="subbody">
          <div class="ui-table-wrap">
            <table class="ui-table plans" data-testid="synergy-plans">
              <thead>
                <tr><th>Plan</th><th class="num">Per month</th><th class="num hide-sm">Per year</th><th class="num">Disk</th><th class="num hide-sm">Sites</th><th></th></tr>
              </thead>
              <tbody>
                <tr v-for="p in r.plans" :key="p.key" :data-plan="p.name">
                  <template v-if="editPlan === p.key">
                    <td>{{ p.name }}</td>
                    <td class="num"><input v-model="planForm.price" type="number" min="0" step="0.05" class="ui-input tiny" aria-label="Monthly price (AUD)" /></td>
                    <td class="num hide-sm"></td>
                    <td class="num"><input v-model="planForm.limit" type="number" min="1" step="1" class="ui-input tiny" aria-label="Disk limit (MB)" /></td>
                    <td class="num hide-sm">{{ p.sites }}</td>
                    <td class="nowrap acts">
                      <button type="button" class="ui-btn ui-btn--primary ui-btn--sm" :disabled="planSaving" @click="savePlan(p)">Save</button>
                      <button type="button" class="ui-btn ui-btn--ghost ui-btn--sm" @click="editPlan = ''">Cancel</button>
                    </td>
                  </template>
                  <template v-else>
                    <td>{{ p.name }}<small v-if="p.evidence || p.price_source" class="block muted">{{ p.manual ? 'set by you' : p.evidence || p.price_source }}</small></td>
                    <td class="num" data-col="month">
                      <template v-if="p.monthly_price != null">{{ aud(p.monthly_price) }}<i v-if="p.price_source === 'plan change'" class="fa-solid fa-wave-square est" title="Estimated from a plan-change pro-rata"></i>
                        <small v-if="isForeign && p.monthly_price_home != null" class="block muted">≈ {{ wholeMoney(p.monthly_price_home, home) }}</small></template>
                      <template v-else>—</template>
                    </td>
                    <td class="num hide-sm">
                      <template v-if="p.annual_price != null">{{ aud(p.annual_price) }}<small v-if="isForeign" class="block muted">≈ {{ wholeMoney(p.annual_price_home, home) }}</small></template>
                      <template v-else>—</template>
                    </td>
                    <td class="num">{{ p.limit_mb != null ? mb(p.limit_mb) : '—' }}</td>
                    <td class="num hide-sm">{{ p.sites }}</td>
                    <td class="nowrap acts">
                      <button type="button" class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" :aria-label="'Edit ' + p.name" title="Edit price / disk" @click="startPlan(p)"><i class="fa-regular fa-pen-to-square"></i></button>
                      <button v-if="p.manual" type="button" class="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" :aria-label="'Reset ' + p.name" title="Back to learned values" @click="resetPlan(p)"><i class="fa-solid fa-rotate-left"></i></button>
                    </td>
                  </template>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="muted cap">Learned from your statements (monthly hosting charges incl. GST){{ isForeign ? ` · ${home} at today's rate (${rateText(r.fx)})` : '' }} · used for upgrade / downgrade suggestions.</p>
        </div>

        <!-- Month vs month -->
        <div v-else-if="sub === 'compare' && r.comparison" class="subbody" data-testid="synergy-compare">
          <div class="panel__head">
            <h3>{{ monthLabel(r.comparison.from, true) }} vs {{ monthLabel(r.comparison.to, true) }}</h3>
            <span class="delta" :class="r.comparison.delta > 0 ? 'txt-danger' : 'txt-ok'">{{ r.comparison.delta > 0 ? '+' : '−' }}{{ aud(Math.abs(r.comparison.delta)) }}</span>
          </div>
          <div class="cmp">
            <ul class="cmp__lines">
              <li v-for="(l, i) in r.comparison.lines" :key="i">{{ l }}</li>
            </ul>
            <table class="ui-table cmp__tbl">
              <thead><tr><th>Category</th><th class="num">{{ monthLabel(r.comparison.from) }}</th><th class="num">{{ monthLabel(r.comparison.to) }}</th><th class="num">Change</th></tr></thead>
              <tbody>
                <tr v-for="c in r.comparison.by_category" :key="c.key">
                  <td>{{ c.label }}</td><td class="num">{{ aud(c.from) }}</td><td class="num">{{ aud(c.to) }}</td>
                  <td class="num" :class="c.delta > 0 ? 'txt-danger' : c.delta < 0 ? 'txt-ok' : ''">{{ c.delta > 0 ? '+' : c.delta < 0 ? '−' : '' }}{{ aud(Math.abs(c.delta)) }}</td>
                </tr>
              </tbody>
              <tfoot><tr><td><strong>Total</strong></td><td class="num"><strong>{{ aud(r.comparison.cost_from) }}</strong></td><td class="num"><strong>{{ aud(r.comparison.cost_to) }}</strong></td><td></td></tr></tfoot>
            </table>
          </div>
        </div>

        <!-- Uploads -->
        <div v-else-if="sub === 'uploads'" class="subbody">
          <ul class="ups">
            <li v-for="u in r.uploads.slice(0, 12)" :key="u.id">
              <i :class="u.file_type === 'statement' ? 'fa-solid fa-file-invoice-dollar' : 'fa-solid fa-hard-drive'"></i>
              <div class="min0">
                <strong>{{ u.filename }}</strong>
                <small>{{ formatDateTime(u.created_at) }} · {{ u.new }} new · {{ u.duplicates }} duplicate{{ u.duplicates === 1 ? '' : 's' }}<template v-if="u.updated"> · {{ u.updated }} updated</template><template v-if="!u.created_by"> · automatic</template></small>
              </div>
              <span v-if="u.file_type === 'statement'" class="ui-badge" :class="u.reconciled ? 'ui-badge--success' : 'ui-badge--warning'">{{ u.reconciled ? 'reconciles' : 'gap' }}</span>
              <span v-else class="ui-badge ui-badge--draft">{{ formatDate(u.snapshot_date) }}</span>
            </li>
          </ul>
          <p class="muted cap">{{ r.statement_months.length }} statement month{{ r.statement_months.length === 1 ? '' : 's' }} · {{ r.snapshots.length }} usage report{{ r.snapshots.length === 1 ? '' : 's' }}</p>
          <div v-if="r.gaps.length" class="ui-alert ui-alert--warning gaps"><i class="fa-solid fa-link-slash"></i><span>{{ r.gaps[0].message }}</span></div>
        </div>
      </section>
    </template>

    <SynergySiteDrawer v-if="site" :key="site" :domain="site" :customers="customers" :home="home" @close="site = ''" @saved="load(true)" />
  </div>
</template>

<script>
import KpiCard from '@/components/dashboard/KpiCard.vue'
import BarChart from '@/components/dashboard/charts/BarChart.vue'
import SynergyUpload from './SynergyUpload.vue'
import SynergyBalanceChart from './SynergyBalanceChart.vue'
import SynergySiteDrawer from './SynergySiteDrawer.vue'
import SynergyAccounting from './SynergyAccounting.vue'
import { expensesApi, money, aud, mb, monthLabel, rateNote, rateText, wholeMoney } from '@/services/expenses'
import { orgDefaults } from '@/utils/orgDefaults'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { formatDate, formatDateTime, downloadBlob } from '@/utils/format'

const FLAGS = {
  over_quota: ['Over quota', 'ui-badge--danger'],
  near_full: ['75%+', 'ui-badge--warning'],
  fast_growth: ['Growing fast', 'ui-badge--warning'],
  unbilled: ['Not billed', 'ui-badge--warning'],
  no_client: ['No client', 'ui-badge--draft'],
  below_cost: ['Below cost', 'ui-badge--danger'],
  price_change: ['Price change', 'ui-badge--info']
}
const ATTENTION = ['over_quota', 'near_full', 'fast_growth', 'unbilled', 'below_cost', 'price_change']

export default {
  name: 'SynergyPanel',
  components: { KpiCard, BarChart, SynergyUpload, SynergyBalanceChart, SynergySiteDrawer, SynergyAccounting },
  props: {
    customers: { type: Array, default: () => [] },
    home: { type: String, default: 'AUD' }
  },
  emits: ['changed'],
  data() {
    let basis = 'charge'
    try {
      basis = localStorage.getItem('synergy.basis') === 'service' ? 'service' : 'charge'
    } catch {
      basis = 'charge'
    }
    return {
      r: null,
      loadError: '',
      basis,
      showUpload: false,
      q: '',
      status: '',
      flag: '',
      sortKey: 'urgency',
      sortDir: -1,
      site: '',
      sub: 'sites',
      openDec: '',
      acc: null,
      allDecisions: false,
      editPlan: '',
      planForm: { price: '', limit: '' },
      planSaving: false
    }
  },
  computed: {
    k() {
      return this.r?.kpis || {}
    },
    isForeign() {
      return !!this.home && this.home !== 'AUD' && !!this.r?.fx?.rate
    },
    fxRate() {
      return this.r?.fx?.rate || 0
    },
    canEdit() {
      return !!orgDefaults.canEdit
    },
    subTabs() {
      const t = [
        { key: 'sites', label: 'Sites', icon: 'fa-solid fa-server', count: this.r?.sites?.length || 0 },
        { key: 'accounting', label: 'How costs count', icon: 'fa-solid fa-scale-balanced' },
        { key: 'plans', label: 'Plan prices', icon: 'fa-solid fa-tags' }
      ]
      if (this.r?.comparison) t.push({ key: 'compare', label: 'Month vs month', icon: 'fa-solid fa-code-compare' })
      t.push({ key: 'uploads', label: 'Uploads', icon: 'fa-solid fa-file-arrow-up', count: this.r?.uploads?.length || 0 })
      return t
    },
    runRateMeta() {
      const k = this.k
      const yr = (k.run_rate || 0) * 12
      if (!this.isForeign) return `${aud(yr, { whole: true })}/yr · current hosting plans`
      return `${aud(k.run_rate)}/mo · ${wholeMoney(yr * this.fxRate, this.home)}/yr`
    },
    balanceMeta() {
      const k = this.k
      const conv = this.isForeign && k.balance != null ? `≈ ${wholeMoney(k.balance * this.fxRate, this.home)}` : ''
      let tail = this.runwayText
      if (this.isForeign && k.balance != null) {
        if (k.balance < 0 || k.topup_needed > 0) tail = `top up ${aud(k.topup_needed)}`
        else if (k.runway_days != null) tail = `~${k.runway_days} days`
        else tail = ''
      }
      return [conv, tail].filter(Boolean).join(' · ')
    },
    thisMonth() {
      return (this.r?.today || '').slice(0, 7)
    },
    lastMonth() {
      const t = this.r?.today
      if (!t) return ''
      const [y, m] = t.split('-').map(Number)
      const d = new Date(y, m - 2, 1)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    },
    balanceTone() {
      const b = this.k.balance
      if (b == null) return 'info'
      if (b < 0) return 'danger'
      return this.k.topup_needed > 0 ? 'warning' : 'success'
    },
    runwayText() {
      const k = this.k
      if (k.balance == null) return 'upload a statement'
      if (k.balance < 0) return `owing — top up ${aud(k.topup_needed)} now`
      if (k.topup_needed > 0 && k.next_charge_date) return `top up ${aud(k.topup_needed)} before ${formatDate(k.next_charge_date)}`
      if (k.runway_days != null) return `runway ~${k.runway_days} days`
      return k.balance_at ? `as of ${formatDate(k.balance_at)}` : ''
    },
    decisionsShown() {
      const d = this.r?.decisions || []
      return this.allDecisions ? d : d.slice(0, 4)
    },
    columns() {
      return [
        { key: 'domain', label: 'Site', sort: true },
        { key: 'client', label: 'Client', sort: true, cls: 'hide-sm' },
        { key: 'plan', label: 'Plan', sort: true, cls: 'hide-sm' },
        { key: 'cost', label: 'Cost / month', sort: true, cls: 'num' },
        { key: 'disk', label: 'Disk', sort: true },
        { key: 'growth', label: 'Trend', sort: true, cls: 'hide-sm' },
        { key: 'billed', label: 'Billed / month', sort: true, cls: 'num hide-sm' },
        { key: 'margin', label: 'Margin', sort: true, cls: 'num' }
      ]
    },
    sitesShown() {
      const q = this.q.trim().toLowerCase()
      let l = (this.r?.sites || []).filter((s) => {
        if (q && !`${s.domain} ${s.customer_name} ${s.plan}`.toLowerCase().includes(q)) return false
        if (this.status === 'current' && s.status === 'cancelled') return false
        if (this.status && this.status !== 'current' && s.status !== this.status) return false
        if (this.flag === 'attention' && !s.flags.some((f) => ATTENTION.includes(f))) return false
        if (this.flag && this.flag !== 'attention' && !s.flags.includes(this.flag)) return false
        return true
      })
      const val = (s) => {
        switch (this.sortKey) {
          case 'domain':
            return s.domain
          case 'client':
            return (s.customer_name || '~').toLowerCase()
          case 'plan':
            return s.plan_price ?? -1
          case 'cost':
            return s.total_monthly
          case 'disk':
            return s.pct_used ?? -1
          case 'growth':
            return s.growth_mb_month ?? -1e9
          case 'billed':
            return s.billed ?? -1e9
          case 'margin':
            return s.margin ?? -1e9
          default: {
            let u = s.status === 'cancelled' ? -1000 : 0
            if (s.flags.includes('over_quota')) u += 1000
            if (s.flags.includes('below_cost')) u += 600
            if (s.flags.includes('near_full')) u += 500
            if (s.flags.includes('fast_growth')) u += 300
            if (s.flags.includes('unbilled')) u += 100
            return u + (s.pct_used || 0)
          }
        }
      }
      l = [...l].sort((a, b) => {
        const va = val(a)
        const vb = val(b)
        if (va < vb) return -1 * this.sortDir
        if (va > vb) return 1 * this.sortDir
        return a.domain.localeCompare(b.domain)
      })
      return l
    },
    totals() {
      let cost = 0
      let billed = 0
      for (const s of this.r?.sites || []) {
        if (s.status === 'cancelled') continue
        cost += s.total_monthly
        billed += s.billed || 0
      }
      return { cost, billed }
    }
  },
  mounted() {
    this.load()
  },
  methods: {
    money,
    aud,
    mb,
    monthLabel,
    rateNote,
    rateText,
    wholeMoney,
    formatDate,
    formatDateTime,
    async load(changed = false) {
      this.loadError = ''
      try {
        this.r = await expensesApi.synergy({ basis: this.basis })
        this.acc = this.r.accounting || null
        if (changed) this.$emit('changed')
      } catch (e) {
        this.loadError = apiErrorMessage(e, 'Could not load the Synergy analytics')
      }
    },
    setBasis(b) {
      if (this.basis === b) return
      this.basis = b
      try {
        localStorage.setItem('synergy.basis', b)
      } catch {
        /* per-viewer convenience only */
      }
      this.load()
    },
    /** KPI value in the home currency (AUD when that is home). */
    h(homeV, audV) {
      return this.isForeign ? wholeMoney(homeV || 0, this.home) : aud(audV)
    },
    hShort(homeV, audV) {
      return this.isForeign ? wholeMoney(homeV || 0, this.home) : aud(audV)
    },
    metaAud(audV, rest) {
      return this.isForeign ? `${aud(audV)} · ${rest}` : rest
    },
    onAccounting(acc) {
      if (acc) this.acc = acc
      this.load(true)
    },
    async dismissNotice() {
      try {
        await expensesApi.dismissAccountingNotice()
      } catch {
        /* hide it anyway */
      }
      if (this.acc) this.acc = { ...this.acc, notice: '' }
    },
    monthDetail(i) {
      const m = this.r?.months?.[i]
      if (!m) return ''
      const parts = []
      if (this.isForeign) parts.push(`${aud(m.total)} · ${m.rate_label || rateText(this.r.fx)}`)
      if (m.hosting) parts.push(`Hosting ${aud(m.hosting)}`)
      if (m.domains) parts.push(`Domains ${aud(m.domains)}`)
      if (m.support) parts.push(`Support ${aud(m.support)}`)
      if (m.other) parts.push(`Other ${aud(m.other)}`)
      if (m.credits) parts.push(`credits −${aud(m.credits)}`)
      if (m.topups) parts.push(`top-ups ${aud(m.topups)} (not counted)`)
      return parts.join(' · ')
    },
    decIcon(x) {
      return (
        {
          over_quota: 'fa-solid fa-hard-drive',
          near_full: 'fa-solid fa-gauge-high',
          fast_growth: 'fa-solid fa-arrow-trend-up',
          downsize: 'fa-solid fa-down-left-and-up-right-to-center',
          plan_changes: 'fa-solid fa-right-left',
          unbilled: 'fa-solid fa-file-invoice-dollar',
          below_cost: 'fa-solid fa-scale-unbalanced',
          balance: 'fa-solid fa-wallet',
          support_fees: 'fa-solid fa-headset',
          cancellations: 'fa-solid fa-scissors',
          new_site: 'fa-solid fa-circle-plus',
          price_change: 'fa-solid fa-tag',
          statement_gap: 'fa-solid fa-link-slash'
        }[x.type] || 'fa-solid fa-circle-info'
      )
    },
    flagLabel(f) {
      return (FLAGS[f] || [f])[0]
    },
    flagTone(f) {
      return (FLAGS[f] || [f, 'ui-badge--draft'])[1]
    },
    barTone(s) {
      if (s.pct_used >= 100) return 'danger'
      if (s.pct_used >= 75) return 'warning'
      return 'ok'
    },
    matchTitle(s) {
      return { manual: 'Linked by you', invoice: 'Matched from invoices', website: 'Matched by website', email: 'Matched by email domain', name: 'Matched by name' }[s.client_match] || ''
    },
    sortBy(key) {
      if (this.sortKey === key) this.sortDir = -this.sortDir
      else {
        this.sortKey = key
        this.sortDir = ['domain', 'client'].includes(key) ? 1 : -1
      }
    },
    showFlag(f) {
      this.flag = f
      this.status = ''
    },
    showStatus(s) {
      this.status = s
      this.flag = ''
    },
    openSite(d) {
      this.site = d
    },
    onUploaded() {
      this.showUpload = true
      this.load(true)
    },
    async exportCsv() {
      try {
        downloadBlob(await expensesApi.synergyCsv(), `synergy-sites-${new Date().toISOString().slice(0, 10)}.csv`)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Export failed'))
      }
    },
    startPlan(p) {
      this.editPlan = p.key
      this.planForm = { price: p.monthly_price ?? '', limit: p.limit_mb ?? '' }
    },
    async savePlan(p) {
      const price = this.planForm.price === '' ? null : Number(this.planForm.price)
      const limit = this.planForm.limit === '' ? null : Number(this.planForm.limit)
      if ((price !== null && (Number.isNaN(price) || price < 0)) || (limit !== null && (Number.isNaN(limit) || limit <= 0))) return toast.error('Enter a price of zero or more and a disk limit above zero')
      this.planSaving = true
      try {
        await expensesApi.saveSynergyPlan({ name: p.name, monthly_price: price, limit_mb: limit })
        this.editPlan = ''
        toast.success(`${p.name} saved`)
        await this.load(true)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not save the plan'))
      } finally {
        this.planSaving = false
      }
    },
    async resetPlan(p) {
      try {
        await expensesApi.saveSynergyPlan({ name: p.name, monthly_price: null, limit_mb: null })
        toast.info(`${p.name} back to the learned values`)
        await this.load(true)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not reset the plan'))
      }
    }
  }
}
</script>

<style scoped>
.syn {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.notice {
  position: relative;
  padding-right: 44px;
}
.notice .x {
  position: absolute;
  right: 6px;
  top: 6px;
}
.counting {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
  font-size: 13px;
  color: var(--text-2);
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  background: var(--bg-subtle);
}
.counting i {
  color: var(--accent);
}
.fxline {
  margin: -6px 0 0;
  font-size: 12.5px;
  color: var(--text-3);
  display: flex;
  gap: 6px;
  align-items: baseline;
}
.col {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}
.cap {
  margin: 8px 0 0;
}
.tabsec {
  padding-top: 6px;
}
.subtabs {
  margin: 0 -14px 12px;
  padding: 0 14px;
  overflow-x: auto;
}
.subbody {
  min-width: 0;
}
.start {
  padding-bottom: 6px;
}
.toolbar {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.toolbar.top {
  margin-top: 4px;
}
.toolbar .search {
  min-width: 200px;
  flex: 1;
  max-width: 340px;
}
.narrow {
  width: auto;
  min-width: 140px;
}
.spacer {
  flex: 1;
}
.is-on {
  border-color: var(--accent);
  color: var(--accent);
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
  padding: 7px 12px;
  font-size: 13px;
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
.kpis {
  margin: 0;
}
.panel {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 14px;
  min-width: 0;
  background: var(--surface);
}
.panel__head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}
.panel__head h3 {
  font-size: 14.5px;
  margin: 0;
}
.head-ic {
  color: var(--warning);
  margin-right: 4px;
}
.row2 {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}
.muted {
  color: var(--text-3);
  font-size: 12.5px;
}
.ok i {
  color: var(--success);
}
.decs {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.decs li {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  background: var(--bg-subtle);
  border-left: 3px solid var(--info);
}
.decs li.sev-danger {
  border-left-color: var(--danger);
}
.decs li.sev-warning {
  border-left-color: var(--warning);
}
.decs li.sev-success {
  border-left-color: var(--success);
}
.dic {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--info-soft);
  color: var(--info);
  flex-shrink: 0;
}
.sev-danger .dic {
  background: var(--danger-soft);
  color: var(--danger);
}
.sev-warning .dic {
  background: var(--warning-soft);
  color: var(--warning);
}
.sev-success .dic {
  background: var(--success-soft);
  color: var(--success);
}
.dbody {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 13.5px;
}
.dbody strong {
  overflow-wrap: anywhere;
}
.dbody > span {
  color: var(--text-2);
  font-size: 13px;
  overflow-wrap: anywhere;
}
.dtext {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  cursor: pointer;
}
.dtext.open {
  display: block;
  -webkit-line-clamp: unset;
}
.dacts {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.dacts .ui-btn {
  padding-left: 0;
}
.impact {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  white-space: nowrap;
  font-size: 13px;
}
.more {
  margin-top: 8px;
}
.delta {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.cmp {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}
.cmp__lines {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13.5px;
  color: var(--text-2);
}
.cmp__lines li {
  overflow-wrap: anywhere;
}
.cmp__tbl td,
.cmp__tbl th {
  padding: 6px 8px;
}
.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.nowrap {
  white-space: nowrap;
}
.block {
  display: block;
}
.sites th.sortable {
  cursor: pointer;
  user-select: none;
}
.sites tr.st-cancelled td {
  opacity: 0.62;
}
.dom {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.dom {
  min-width: 170px;
}
.dom strong {
  overflow-wrap: break-word;
}
.badges {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.badges .ui-badge {
  font-size: 10.5px;
}
.client {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  font-size: 13px;
}
.client i {
  color: var(--text-3);
  font-size: 11px;
}
.linkc {
  padding-left: 0;
}
.sug {
  color: var(--accent);
  font-size: 12px;
}
.disk {
  min-width: 130px;
}
.bar {
  height: 7px;
  border-radius: 999px;
  background: var(--bg-subtle);
  overflow: hidden;
  margin-bottom: 3px;
}
.bar span {
  display: block;
  height: 100%;
  border-radius: 999px;
}
.bar .ok {
  background: var(--viz-1);
}
.bar .warning {
  background: var(--warning);
}
.bar .danger {
  background: var(--danger);
}
.disk small {
  font-size: 12px;
  color: var(--text-3);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.disk small b {
  color: var(--text);
}
.trend.up {
  color: var(--warning);
}
.trend.down {
  color: var(--success);
}
.trend.flat {
  color: var(--text-3);
}
.show-sm {
  display: none;
}
.plans td,
.plans th {
  padding: 7px 8px;
}
.est {
  margin-left: 4px;
  font-size: 10px;
  color: var(--text-3);
}
.tiny {
  width: 90px;
  padding: 4px 6px;
  min-height: 0;
  text-align: right;
}
.acts {
  text-align: right;
}
.ups {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ups li {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}
.ups i {
  color: var(--accent);
  width: 16px;
}
.ups .min0 {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.ups strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ups small {
  color: var(--text-3);
  font-size: 12px;
}
.gaps {
  margin-top: 10px;
}
.txt-danger {
  color: var(--danger);
}
.txt-ok {
  color: var(--success);
}
@media (max-width: 1000px) {
  .row2,
  .cmp {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 640px) {
  .hide-sm {
    display: none;
  }
  .show-sm {
    display: block;
  }
  .toolbar .search {
    max-width: none;
    min-width: 0;
    flex-basis: 100%;
  }
  .narrow {
    flex: 1;
    min-width: 0;
  }
  .disk {
    min-width: 96px;
  }
  .dom {
    min-width: 0;
  }
  .dom strong {
    overflow-wrap: anywhere;
  }
  .disk small {
    white-space: normal;
  }
  .decs li {
    flex-wrap: wrap;
    gap: 8px 10px;
    padding: 10px;
  }
  .dbody {
    flex: 1 1 calc(100% - 44px);
  }
  .impact {
    margin-left: 40px;
  }
}
@media (max-width: 480px) {
  .hide-xs {
    display: none;
  }
}
</style>
