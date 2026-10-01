<template>
  <div class="ui-page ui-page--wide exp dviz">
    <header class="ui-page-head">
      <div>
        <div class="ui-eyebrow">Finance</div>
        <h1>Expenses</h1>
        <p>What you spend on Synergy Wholesale, Google Workspace and other suppliers — reviewed once, counted once in your profit &amp; loss.</p>
      </div>
      <div class="ui-actions">
        <button class="ui-btn" :disabled="!d" @click="exportCsv"><i class="fa-solid fa-download"></i> <span class="hide-xs">Export</span></button>
        <button class="ui-btn" :disabled="syncing || !anyConnected" data-testid="exp-sync" @click="syncNow">
          <i :class="syncing ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-rotate'"></i> <span class="hide-xs">Sync now</span>
        </button>
        <button class="ui-btn ui-btn--primary" @click="openItem('')"><i class="fa-solid fa-plus"></i> Add expense</button>
      </div>
    </header>

    <div v-if="loadError" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ loadError }} <a href="#" @click.prevent="load">Try again</a></span></div>

    <div class="ui-kpis" data-testid="exp-kpis">
      <KpiCard label="This month" icon="fa-solid fa-calendar-day" tone="accent" :loading="!d" :value="m(k.this_month)"
        :meta="d ? `${k.this_month_count} expense${k.this_month_count === 1 ? '' : 's'} · excl. tax` : ''" :delta="k.this_month_change_pct ?? null" :positive-is-good="false"
        delta-title="vs the same days last month" />
      <KpiCard label="Last month" icon="fa-solid fa-calendar" tone="info" :loading="!d" :value="m(k.last_month)" :meta="d ? `${k.last_month_count} expense${k.last_month_count === 1 ? '' : 's'}` : ''" :show-delta="false" />
      <KpiCard label="Year to date" icon="fa-solid fa-chart-column" tone="accent" :loading="!d" :value="m(k.ytd)" :meta="d ? `vs ${m(k.prev_ytd)} last year` : ''"
        :delta="k.ytd_change_pct ?? null" :positive-is-good="false" delta-title="vs the same period last year" />
      <KpiCard label="Subscriptions" icon="fa-solid fa-repeat" tone="warning" :loading="!d" :value="m(k.subscriptions_annual)"
        :meta="d ? `${k.subscriptions} recurring · ${m(k.subscriptions_monthly)}/month` : ''" :show-delta="false" />
      <KpiCard label="Next 3 months" icon="fa-solid fa-chart-line" tone="info" :loading="!d" :value="m(k.forecast_3m)" meta="Forecast, excl. tax" :show-delta="false" />
      <KpiCard label="Renewals in 30 days" icon="fa-solid fa-hourglass-half" :tone="k.renewals_30d ? 'danger' : 'success'" :loading="!d" :value="String(k.renewals_30d ?? 0)"
        :meta="d ? (k.renewals_30d_cost ? `about ${m(k.renewals_30d_cost)}` : 'nothing due soon') : ''" :show-delta="false" />
    </div>

    <section class="ui-card">
      <div class="tabs-row">
        <div class="ui-tabs" role="tablist" aria-label="Expenses sections">
          <button v-for="t in tabs" :key="t.key" class="ui-tab" :class="{ 'is-active': tab === t.key }" role="tab" :aria-selected="tab === t.key" :data-tab="t.key" @click="setTab(t.key)">
            <i :class="t.icon"></i> {{ t.label }}<span v-if="t.count" class="count" :class="t.tone">{{ t.count }}</span>
          </button>
        </div>
      </div>

      <!-- OVERVIEW -->
      <div v-if="tab === 'overview'" class="ui-card__body">
        <div v-if="!d" class="ui-skeleton" style="height: 360px"></div>
        <template v-else>
          <div v-if="d.inbox.pending" class="ui-alert ui-alert--warning banner">
            <i class="fa-solid fa-inbox"></i>
            <span>{{ d.inbox.pending }} expense{{ d.inbox.pending === 1 ? '' : 's' }} waiting for review — they are not counted until you approve them. <a href="#" @click.prevent="setTab('inbox')">Review now</a></span>
          </div>
          <div v-if="!hasData && !d.inbox.pending" class="ui-empty">
            <div class="ui-empty__icon"><i class="fa-solid fa-receipt"></i></div>
            <h3>No approved expenses yet</h3>
            <p>Connect Synergy Wholesale and Gmail, or drop invoice PDFs in the inbox, then approve them.</p>
            <div class="empty-actions">
              <button class="ui-btn ui-btn--primary" @click="setTab('sources')"><i class="fa-solid fa-plug"></i> Connect sources</button>
              <button class="ui-btn" @click="setTab('inbox')"><i class="fa-solid fa-cloud-arrow-up"></i> Upload invoices</button>
              <button class="ui-btn" @click="setTab('synergy')"><i class="fa-solid fa-server"></i> {{ d.synergy?.has_data ? 'Synergy analytics' : 'Upload Synergy files' }}</button>
            </div>
          </div>
          <template v-else>
            <div v-if="d.balance?.available" class="balance" :class="{ low: d.balance.amount < d.balance.low_balance }" data-testid="exp-balance">
              <i class="fa-solid fa-wallet"></i>
              Synergy Wholesale balance <strong>{{ money(d.balance.amount, 'AUD') }}</strong>
              <span class="muted">{{ d.balance.source === 'email' ? 'from the last low-balance email' : d.balance.source === 'statement' ? 'from the statement of ' + formatDate(d.balance.as_of) : 'as of ' + formatDateTime(d.balance.as_of) }}</span>
              <a v-if="d.synergy?.has_data" href="#" @click.prevent="setTab('synergy')">Synergy analytics →</a>
            </div>
            <div class="row2">
              <div class="panel">
                <div class="panel__head"><h3>Monthly spend</h3><span class="muted">Approved, excl. tax · {{ cur }}</span></div>
                <BarChart :labels="d.months.map((x) => x.month)" :values="d.months.map((x) => x.amount)" :height="220" value-name="Spend"
                  :format-x="(x) => monthLabel(x)" :format-title="(x) => monthLabel(x, true)" :format-y="(v) => money(v, cur, true)" :format-value="(v) => money(v, cur)"
                  :detail="(i) => monthDetail(i)" aria-label="Monthly spend, last 12 months" />
              </div>
              <div class="panel">
                <div class="panel__head"><h3>By category</h3><span class="muted">{{ rangeText }}</span></div>
                <DonutChart v-if="catSegments.length" :segments="catSegments" :center-value="money(catTotal, cur, true)" center-label="total" :format-value="(v) => money(v, cur)" aria-label="Spend by category" />
                <p v-else class="muted">Nothing in this period.</p>
              </div>
            </div>
            <div class="row2">
              <div class="panel">
                <div class="panel__head"><h3>By vendor</h3><span class="muted">{{ rangeText }}</span></div>
                <div class="vendors">
                  <button v-for="(v, i) in d.by_vendor" :key="v.vendor_id + v.vendor" type="button" class="vrow" :data-vendor="v.vendor" @click="v.vendor_id && (vendorId = v.vendor_id)">
                    <span class="vrow__n">{{ i + 1 }}</span>
                    <span class="vrow__main">
                      <span class="vrow__line"><span class="vrow__name">{{ v.vendor }}</span><strong>{{ money(v.amount, cur) }}</strong></span>
                      <span class="vrow__bar"><span :style="{ width: Math.max(2, (v.amount / (d.by_vendor[0]?.amount || 1)) * 100) + '%' }"></span></span>
                      <small>{{ v.count }} expense{{ v.count === 1 ? '' : 's' }} · {{ v.share_pct }}% · last {{ formatDate(v.last_date) }}</small>
                    </span>
                  </button>
                </div>
              </div>
              <div class="panel">
                <div class="panel__head"><h3>Alerts</h3><a v-if="d.alerts.length > 4" href="#" @click.prevent="setTab('alerts')">All {{ d.alerts.length }}</a></div>
                <AlertList :alerts="d.alerts.slice(0, 4)" :cur="cur" compact @dismiss="dismiss" />
                <p v-if="!d.alerts.length" class="muted ok"><i class="fa-solid fa-circle-check"></i> Nothing needs attention.</p>
              </div>
            </div>
            <div class="row2">
              <div class="panel">
                <div class="panel__head"><h3>Upcoming renewals</h3><a href="#" @click.prevent="setTab('renewals')">All</a></div>
                <ul class="rlist">
                  <li v-for="r in d.renewals.filter((x) => x.days_left >= 0).slice(0, 6)" :key="r.id">
                    <i :class="kindIcon(r.kind)"></i>
                    <span class="rname">{{ r.name }}</span>
                    <span class="ui-badge" :class="r.days_left <= 30 ? (r.auto_renew ? 'ui-badge--info' : 'ui-badge--warning') : 'ui-badge--draft'">{{ r.days_left }}d</span>
                    <span class="num">{{ r.cost ? money(r.cost, r.currency) : '—' }}</span>
                  </li>
                  <li v-if="!d.renewals.filter((x) => x.days_left >= 0).length" class="muted">No renewals in the next 90 days.</li>
                </ul>
              </div>
              <div class="panel">
                <div class="panel__head"><h3>Forecast</h3><span class="muted">Subscriptions + renewals + usual other spend</span></div>
                <div class="ui-table-wrap fcwrap">
                <table class="ui-table fc" data-testid="exp-forecast">
                  <thead><tr><th>Month</th><th class="num">Recurring</th><th class="num">Renewals</th><th class="num">Other</th><th class="num">Total</th></tr></thead>
                  <tbody>
                    <tr v-for="f in d.forecast" :key="f.month" :title="(f.items || []).map((x) => `${x.date} ${x.label} ${x.amount}`).join('\n')">
                      <td class="nowrap">{{ monthLabel(f.month) }} {{ f.month.slice(0, 4) }}</td>
                      <td class="num">{{ money(f.subscriptions, cur) }}</td>
                      <td class="num">{{ money(f.renewals, cur) }}</td>
                      <td class="num">{{ money(f.other, cur) }}</td>
                      <td class="num"><strong>{{ money(f.total, cur) }}</strong></td>
                    </tr>
                  </tbody>
                </table>
                </div>
              </div>
            </div>
          </template>
        </template>
      </div>

      <!-- SYNERGY -->
      <div v-else-if="tab === 'synergy'" class="ui-card__body">
        <SynergyPanel :customers="customers" :home="cur" @changed="load" />
      </div>

      <!-- INBOX / HISTORY -->
      <div v-else-if="tab === 'inbox' || tab === 'history'" class="ui-card__body">
        <UploadZone v-if="tab === 'inbox'" :vendors="vendors" @uploaded="onUploaded" />
        <div class="toolbar">
          <div class="ui-input-group search">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input v-model="q" class="ui-input" placeholder="Search vendor, invoice, service…" aria-label="Search expenses" @input="debouncedList" />
          </div>
          <select v-if="tab === 'history'" v-model="histStatus" class="ui-select narrow" aria-label="Status" @change="loadList">
            <option value="approved">Approved</option>
            <option value="ignored,duplicate">Ignored &amp; duplicates</option>
            <option value="all">All</option>
          </select>
          <select v-model="vendorFilter" class="ui-select narrow" aria-label="Vendor" @change="loadList">
            <option value="">All vendors</option>
            <option v-for="v in vendors" :key="v.id" :value="v.id">{{ v.name }}</option>
          </select>
          <select v-model="catFilter" class="ui-select narrow" aria-label="Category" @change="loadList">
            <option value="">All categories</option>
            <option v-for="c in CATEGORIES" :key="c.key" :value="c.key">{{ c.label }}</option>
          </select>
          <span class="spacer"></span>
          <button v-if="tab === 'inbox' && selected.length" class="ui-btn ui-btn--primary" :disabled="bulkBusy" data-testid="bulk-approve" @click="bulkApprove">
            <i :class="bulkBusy ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-check-double'"></i> Approve {{ selected.length }}
          </button>
        </div>
        <div v-if="listLoading && !list.length" class="ui-skeleton" style="height: 240px"></div>
        <div v-else-if="!list.length" class="ui-empty small">
          <div class="ui-empty__icon"><i :class="tab === 'inbox' ? 'fa-solid fa-inbox' : 'fa-solid fa-clock-rotate-left'"></i></div>
          <h3>{{ tab === 'inbox' ? 'Inbox is clear' : 'Nothing here yet' }}</h3>
          <p>{{ tab === 'inbox' ? 'New invoices from Gmail, Synergy and uploads appear here for review.' : 'Approved expenses appear here.' }}</p>
        </div>
        <div v-else class="ui-table-wrap" :class="{ busy: listLoading }">
          <table class="ui-table" data-testid="exp-table">
            <thead>
              <tr>
                <th v-if="tab === 'inbox'" class="chk"><input type="checkbox" :checked="allSelected" aria-label="Select all ready" @change="toggleAll" /></th>
                <th>Date</th>
                <th>Vendor</th>
                <th class="hide-sm">Invoice</th>
                <th class="hide-sm">Category</th>
                <th class="num">Amount</th>
                <th class="num hide-sm">{{ cur }} excl. tax</th>
                <th>{{ tab === 'inbox' ? 'Check' : 'Status' }}</th>
                <th class="hide-sm">Client</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="it in list" :key="it.id" class="is-clickable" :data-id="it.id" :data-invoice="it.invoice_number" @click="openItem(it.id)">
                <td v-if="tab === 'inbox'" class="chk" @click.stop>
                  <input v-model="selected" type="checkbox" :value="it.id" :disabled="!ready(it)" :aria-label="'Select ' + it.vendor_name" :title="ready(it) ? '' : 'Open it to complete the details first'" />
                </td>
                <td class="nowrap">{{ formatDate(it.invoice_date) }}</td>
                <td>
                  <div class="vcell">
                    <strong>{{ it.vendor_name || 'Unknown vendor' }}</strong>
                    <small>{{ it.service }}</small>
                  </div>
                </td>
                <td class="hide-sm">{{ it.invoice_number || '—' }}</td>
                <td class="hide-sm"><span class="cat"><i :class="categoryOf(it.category).icon"></i> {{ categoryOf(it.category).label }}</span></td>
                <td class="num">
                  <template v-if="it.total">{{ money(it.total, it.currency) }}</template><span v-else class="txt-warn">missing</span>
                  <small v-if="it.tax" class="block muted">incl. {{ money(it.tax, it.currency) }} tax</small>
                </td>
                <td class="num hide-sm">{{ it.home_net ? money(it.home_net, cur) : '—' }}</td>
                <td>
                  <template v-if="tab === 'inbox'">
                    <span class="ui-badge" :class="confTone(it)">{{ Math.round(it.confidence * 100) }}%</span>
                    <i v-if="it.ai_extracted" class="fa-solid fa-wand-magic-sparkles ai" title="AI-extracted, please confirm"></i>
                    <i v-if="it.document_id" class="fa-regular fa-file-lines muted" title="Has a source document"></i>
                    <small class="block muted">{{ SOURCE_LABEL[it.source] }}</small>
                  </template>
                  <span v-else class="ui-badge" :class="'ui-badge--' + STATUS_BADGE[it.status]">{{ STATUS_LABEL[it.status] }}</span>
                </td>
                <td class="hide-sm">{{ clientText(it) }}</td>
              </tr>
            </tbody>
          </table>
          <p v-if="listTotal > list.length" class="muted more">Showing {{ list.length }} of {{ listTotal }} — refine the search to see the rest.</p>
        </div>
      </div>

      <!-- SUBSCRIPTIONS -->
      <div v-else-if="tab === 'subscriptions'" class="ui-card__body">
        <div v-if="!d" class="ui-skeleton" style="height: 240px"></div>
        <div v-else-if="!d.subscriptions.length" class="ui-empty small">
          <div class="ui-empty__icon"><i class="fa-solid fa-repeat"></i></div>
          <h3>No recurring charges detected yet</h3>
          <p>Charges from the same vendor and service about every month, quarter or year are detected once two have been approved.</p>
        </div>
        <div v-else class="ui-table-wrap">
          <table class="ui-table" data-testid="exp-subs">
            <thead><tr><th>Service</th><th>Every</th><th class="num">Last charge</th><th class="num">Change</th><th>Next expected</th><th class="num">Annualised ({{ cur }})</th><th>Status</th><th>Bills</th></tr></thead>
            <tbody>
              <tr v-for="s in d.subscriptions" :key="s.key" class="is-clickable" @click="s.vendor_id && (vendorId = s.vendor_id)">
                <td><div class="vcell"><strong>{{ s.vendor }}</strong><small>{{ s.service }}</small></div></td>
                <td>{{ s.interval }}</td>
                <td class="num">{{ money(s.last_original, s.currency) }}<small class="block muted">{{ formatDate(s.last_date) }}</small></td>
                <td class="num"><span v-if="s.change_pct !== null" :class="s.change_pct > 5 ? 'txt-danger' : s.change_pct < 0 ? 'txt-ok' : ''">{{ pct(s.change_pct) }}</span><span v-else class="muted">—</span></td>
                <td>{{ formatDate(s.next_date) }}<small class="block muted">{{ money(s.next_amount, cur) }}</small></td>
                <td class="num"><strong>{{ money(s.annualised, cur) }}</strong></td>
                <td><span class="ui-badge" :class="{ active: 'ui-badge--success', overdue: 'ui-badge--warning', lapsed: 'ui-badge--draft' }[s.status]">{{ s.status }}</span></td>
                <td @click.stop>
                  <router-link v-if="s.recurring_bill_id" class="ui-btn ui-btn--ghost ui-btn--sm" :to="`/bills?view=recurring&schedule=${s.recurring_bill_id}`" title="Linked to a recurring bill — reminders on, counted once"><i class="fa-solid fa-link"></i> Recurring</router-link>
                  <router-link v-else-if="s.status !== 'lapsed'" class="ui-btn ui-btn--sm" :to="`/bills?view=recurring&convert=${encodeURIComponent(s.key)}`" data-testid="exp-make-recurring"><i class="fa-solid fa-repeat"></i> Make recurring bill</router-link>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr><td colspan="5"><strong>Total active</strong></td><td class="num"><strong>{{ money(k.subscriptions_annual, cur) }}</strong></td><td></td><td></td></tr>
            </tfoot>
          </table>
        </div>
      </div>

      <!-- RENEWALS -->
      <div v-else-if="tab === 'renewals'" class="ui-card__body">
        <div class="toolbar">
          <div class="ui-tabs small" role="tablist" aria-label="Renewal window">
            <button v-for="w in [30, 60, 90, 0]" :key="w" class="ui-tab" :class="{ 'is-active': renWithin === w }" @click="renWithin = w">{{ w ? `${w} days` : 'All' }}</button>
          </div>
          <span class="spacer"></span>
          <button class="ui-btn" @click="renewalEdit = {}"><i class="fa-solid fa-plus"></i> Track a renewal</button>
        </div>
        <div v-if="renLoading && !renewals.length" class="ui-skeleton" style="height: 220px"></div>
        <div v-else-if="!renewalsShown.length" class="ui-empty small">
          <div class="ui-empty__icon"><i class="fa-solid fa-globe"></i></div>
          <h3>No renewals {{ renWithin ? `in the next ${renWithin} days` : 'tracked' }}</h3>
          <p>Connect Synergy Wholesale to track domain and hosting expiry dates automatically.</p>
        </div>
        <div v-else class="ui-table-wrap">
          <table class="ui-table" data-testid="exp-renewals">
            <thead><tr><th>Name</th><th>Kind</th><th>Date</th><th>Days</th><th>Auto-renew</th><th class="num">Cost</th><th class="hide-sm">Client</th><th class="num hide-sm">Charged</th></tr></thead>
            <tbody>
              <tr v-for="r in renewalsShown" :key="r.id" class="is-clickable" :data-name="r.name" @click="renewalEdit = r">
                <td><strong>{{ r.name }}</strong><small v-if="r.plan" class="block muted">{{ r.plan }}</small></td>
                <td><i :class="kindIcon(r.kind)"></i> {{ r.kind }}</td>
                <td class="nowrap">{{ formatDate(r.expires_on) }}</td>
                <td><span class="ui-badge" :class="daysTone(r)">{{ r.days_left === null || r.days_left === undefined ? '—' : r.days_left < 0 ? 'expired' : r.days_left + 'd' }}</span></td>
                <td>{{ r.auto_renew ? 'Yes' : 'No' }}</td>
                <td class="num">{{ r.cost ? money(r.cost, r.currency) : '—' }}</td>
                <td class="hide-sm">{{ r.customer_name || '—' }}</td>
                <td class="num hide-sm">{{ r.price ? money(r.price, r.currency) : '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- CLIENTS -->
      <div v-else-if="tab === 'clients'" class="ui-card__body">
        <div class="toolbar">
          <label class="ui-field inline"><span class="ui-label">From</span><input v-model="clientFrom" type="date" class="ui-input" @change="loadClients" /></label>
          <label class="ui-field inline"><span class="ui-label">To</span><input v-model="clientTo" type="date" class="ui-input" @change="loadClients" /></label>
          <span class="muted">Revenue = invoices issued to the client (excl. tax). Costs = approved expenses you charged to them.</span>
        </div>
        <div v-if="clientsLoading && !clients" class="ui-skeleton" style="height: 200px"></div>
        <div v-else-if="!clients?.length" class="ui-empty small">
          <div class="ui-empty__icon"><i class="fa-solid fa-user-tag"></i></div>
          <h3>No costs attributed to clients</h3>
          <p>Open an expense (e.g. a client's domain or hosting) and use “Charge to clients”, or set a client on a renewal.</p>
        </div>
        <div v-else class="ui-table-wrap">
          <table class="ui-table" data-testid="exp-clients">
            <thead><tr><th>Client</th><th class="num">Revenue</th><th class="num">Costs</th><th class="num">Margin</th><th class="num">Margin %</th><th class="num hide-sm">Renewals next 12m (cost / charged)</th></tr></thead>
            <tbody>
              <tr v-for="c in clients" :key="c.customer_id" :data-client="c.customer">
                <td><strong>{{ c.customer }}</strong><small class="block muted">{{ c.invoices }} invoice{{ c.invoices === 1 ? '' : 's' }} · {{ c.cost_items }} cost{{ c.cost_items === 1 ? '' : 's' }}<template v-if="c.unconverted_invoices"> · {{ c.unconverted_invoices }} in another currency not counted</template></small></td>
                <td class="num">{{ money(c.revenue, cur) }}</td>
                <td class="num">{{ money(c.costs, cur) }}</td>
                <td class="num" :class="c.margin < 0 ? 'txt-danger' : 'txt-ok'"><strong>{{ money(c.margin, cur) }}</strong></td>
                <td class="num">{{ c.margin_pct === null ? '—' : c.margin_pct.toFixed(1) + '%' }}</td>
                <td class="num hide-sm">{{ money(c.renewal_costs_12m, cur) }} / {{ money(c.renewal_prices_12m, cur) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ALERTS -->
      <div v-else-if="tab === 'alerts'" class="ui-card__body">
        <div v-if="!d" class="ui-skeleton" style="height: 200px"></div>
        <AlertList v-else-if="d.alerts.length" :alerts="d.alerts" :cur="cur" @dismiss="dismiss" />
        <div v-else class="ui-empty small">
          <div class="ui-empty__icon"><i class="fa-solid fa-bell"></i></div>
          <h3>No alerts</h3>
          <p>Price rises over 5%, new vendors, possible duplicate charges, failed payments, renewals due and a low Synergy balance show here.</p>
        </div>
      </div>

      <!-- SOURCES -->
      <div v-else-if="tab === 'sources'" class="ui-card__body">
        <SourcesPanel @synced="refreshAll" @changed="load" />
      </div>
    </section>

    <ExpenseItemModal v-if="itemOpen !== null" :id="itemOpen" :key="itemOpen || 'new'" :vendors="vendors" :customers="customers" :home="cur" @close="itemOpen = null" @changed="refreshAll" @open="(id) => (itemOpen = id)" />
    <VendorDetail v-if="vendorId" :vendor-id="vendorId" @close="closeVendor" @open="(id) => ((vendorId = ''), (itemOpen = id))" />
    <RenewalModal v-if="renewalEdit" :renewal="renewalEdit.id ? renewalEdit : null" :customers="customers" @close="renewalEdit = null" @saved="loadRenewals(); load()" />
  </div>
</template>

<script>
import '@/components/dashboard/dashviz.css'
import KpiCard from '@/components/dashboard/KpiCard.vue'
import BarChart from '@/components/dashboard/charts/BarChart.vue'
import DonutChart from '@/components/dashboard/charts/DonutChart.vue'
import UploadZone from '@/components/expenses/UploadZone.vue'
import SourcesPanel from '@/components/expenses/SourcesPanel.vue'
import ExpenseItemModal from '@/components/expenses/ExpenseItemModal.vue'
import VendorDetail from '@/components/expenses/VendorDetail.vue'
import RenewalModal from '@/components/expenses/RenewalModal.vue'
import AlertList from '@/components/expenses/AlertList.vue'
import SynergyPanel from '@/components/expenses/SynergyPanel.vue'
import { expensesApi, money, monthLabel, pct, CATEGORIES, categoryOf, SOURCE_LABEL, STATUS_BADGE, STATUS_LABEL } from '@/services/expenses'
import api, { apiErrorMessage, listFrom } from '@/services/api'
import { toast } from '@/composables/useToast'
import { formatDate, formatDateTime, downloadBlob } from '@/utils/format'
import { orgCurrency } from '@/utils/orgDefaults'

const TABS = ['overview', 'synergy', 'inbox', 'history', 'subscriptions', 'renewals', 'clients', 'alerts', 'sources']

export default {
  name: 'ExpensesView',
  components: { KpiCard, BarChart, DonutChart, UploadZone, SourcesPanel, ExpenseItemModal, VendorDetail, RenewalModal, AlertList, SynergyPanel },
  data() {
    const today = new Date()
    const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    return {
      d: null,
      loadError: '',
      tab: TABS.includes(this.$route.query.tab) ? this.$route.query.tab : 'overview',
      vendors: [],
      customers: [],
      list: [],
      listTotal: 0,
      listLoading: false,
      q: '',
      vendorFilter: this.$route.query.vendor_id || '',
      catFilter: '',
      histStatus: 'approved',
      selected: [],
      bulkBusy: false,
      itemOpen: null,
      vendorId: this.$route.query.vendor || '',
      renewals: [],
      renLoading: false,
      renWithin: 90,
      renewalEdit: null,
      clients: null,
      clientsLoading: false,
      clientFrom: iso(new Date(today.getFullYear() - 1, today.getMonth(), today.getDate() + 1)),
      clientTo: iso(today),
      syncing: false,
      CATEGORIES,
      SOURCE_LABEL,
      STATUS_BADGE,
      STATUS_LABEL,
      timer: null
    }
  },
  computed: {
    cur() {
      return this.d?.currency || orgCurrency()
    },
    k() {
      return this.d?.kpis || {}
    },
    hasData() {
      return (this.d?.months || []).some((x) => x.amount) || (this.d?.by_vendor || []).length > 0
    },
    anyConnected() {
      return !!(this.d?.sources?.synergy?.connected || this.d?.sources?.gmail?.connected)
    },
    tabs() {
      const inbox = this.d?.inbox?.pending || 0
      const danger = (this.d?.alerts || []).filter((a) => a.severity !== 'info').length
      return [
        { key: 'overview', label: 'Overview', icon: 'fa-solid fa-chart-pie' },
        { key: 'synergy', label: 'Synergy', icon: 'fa-solid fa-server', count: this.d?.synergy?.alerts || 0, tone: 'warn' },
        { key: 'inbox', label: 'Inbox', icon: 'fa-solid fa-inbox', count: inbox, tone: 'warn' },
        { key: 'history', label: 'History', icon: 'fa-solid fa-clock-rotate-left' },
        { key: 'subscriptions', label: 'Subscriptions', icon: 'fa-solid fa-repeat', count: this.d?.subscriptions?.length || 0 },
        { key: 'renewals', label: 'Renewals', icon: 'fa-solid fa-hourglass-half', count: this.k.renewals_30d || 0, tone: 'warn' },
        { key: 'clients', label: 'Clients', icon: 'fa-solid fa-user-tag' },
        { key: 'alerts', label: 'Alerts', icon: 'fa-solid fa-bell', count: (this.d?.alerts || []).length, tone: danger ? 'danger' : '' },
        { key: 'sources', label: 'Sources', icon: 'fa-solid fa-plug' }
      ]
    },
    catSegments() {
      return (this.d?.by_category || []).map((c) => ({ name: c.label, value: c.amount, color: categoryOf(c.key).color }))
    },
    catTotal() {
      return this.catSegments.reduce((a, s) => a + s.value, 0)
    },
    rangeText() {
      if (!this.d?.range) return ''
      return `${formatDate(this.d.range.from)} – ${formatDate(this.d.range.to)}`
    },
    renewalsShown() {
      if (!this.renWithin) return this.renewals
      return this.renewals.filter((r) => r.days_left !== null && r.days_left !== undefined && r.days_left >= -45 && r.days_left <= this.renWithin)
    },
    readyIds() {
      return this.list.filter((it) => this.ready(it)).map((it) => it.id)
    },
    allSelected() {
      return this.readyIds.length > 0 && this.readyIds.every((id) => this.selected.includes(id))
    }
  },
  watch: {
    renewalEdit(v) {
      if (v) this.loadCustomers()
    },
    '$route.query.tab'(t) {
      if (t && TABS.includes(t) && t !== this.tab) {
        this.tab = t
        this.loadTab()
      }
    }
  },
  mounted() {
    this.load()
    this.loadVendors()
    this.loadCustomers()
    this.loadTab()
  },
  methods: {
    money,
    monthLabel,
    pct,
    formatDate,
    formatDateTime,
    categoryOf,
    m(v) {
      return money(v || 0, this.cur)
    },
    setTab(t) {
      this.tab = t
      this.$router.replace({ query: { ...this.$route.query, tab: t === 'overview' ? undefined : t } })
      this.loadTab()
    },
    loadTab() {
      this.selected = []
      if (this.tab === 'inbox' || this.tab === 'history') this.loadList()
      if (this.tab === 'renewals') this.loadRenewals()
      if (this.tab === 'clients') this.loadClients()
    },
    async load() {
      this.loadError = ''
      try {
        this.d = await expensesApi.dashboard()
      } catch (e) {
        this.loadError = apiErrorMessage(e, 'Could not load expenses')
      }
    },
    refreshAll() {
      this.load()
      this.loadVendors()
      this.loadTab()
    },
    async loadVendors() {
      try {
        this.vendors = (await expensesApi.vendors()).vendors || []
      } catch {
        this.vendors = []
      }
    },
    async loadCustomers() {
      try {
        const r = await api.get('/customers', { params: { limit: 500 } })
        this.customers = listFrom(r, 'customers', 'data', 'items')
          .map((c) => ({ id: c.id, name: [c.first_name, c.last_name].filter(Boolean).join(' ') || c.company_name || c.name || c.email || 'Customer' }))
          .sort((a, b) => a.name.localeCompare(b.name))
      } catch {
        this.customers = []
      }
    },
    async loadList() {
      this.listLoading = true
      try {
        const status = this.tab === 'inbox' ? 'pending' : this.histStatus
        const r = await expensesApi.items({ status, q: this.q || undefined, vendor_id: this.vendorFilter || undefined, category: this.catFilter || undefined, limit: 300 })
        this.list = r.items || []
        this.listTotal = r.total || 0
        this.selected = this.selected.filter((id) => this.list.some((x) => x.id === id))
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not load expenses'))
      } finally {
        this.listLoading = false
      }
    },
    debouncedList() {
      clearTimeout(this.timer)
      this.timer = setTimeout(() => this.loadList(), 300)
    },
    async loadRenewals() {
      this.renLoading = true
      try {
        this.renewals = (await expensesApi.renewals()).renewals || []
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not load renewals'))
      } finally {
        this.renLoading = false
      }
    },
    async loadClients() {
      this.clientsLoading = true
      try {
        this.clients = (await expensesApi.clients({ from: this.clientFrom, to: this.clientTo })).clients || []
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not load client margins'))
      } finally {
        this.clientsLoading = false
      }
    },
    ready(it) {
      return it.total > 0 && !!it.invoice_date && !!it.vendor_name && it.status === 'pending'
    },
    confTone(it) {
      return it.confidence >= 0.8 ? 'ui-badge--success' : it.confidence >= 0.5 ? 'ui-badge--warning' : 'ui-badge--danger'
    },
    clientText(it) {
      if (it.allocations?.length) return it.allocations.map((a) => `${a.customer_name}${a.percent < 100 ? ` ${a.percent}%` : ''}`).join(', ')
      return it.customer_name || '—'
    },
    toggleAll(e) {
      this.selected = e.target.checked ? [...this.readyIds] : []
    },
    async bulkApprove() {
      this.bulkBusy = true
      try {
        const r = await expensesApi.bulkApprove(this.selected)
        if (r.approved) toast.success(`${r.approved} approved — added to Bills and your profit & loss`)
        for (const f of r.failed || []) toast.error(f.message)
        this.selected = []
        this.refreshAll()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not approve'))
      } finally {
        this.bulkBusy = false
      }
    },
    openItem(id) {
      this.itemOpen = id
      this.loadCustomers()
    },
    onUploaded(ids) {
      this.refreshAll()
      if (ids.length === 1) this.itemOpen = ids[0]
    },
    closeVendor() {
      this.vendorId = ''
      if (this.$route.query.vendor) this.$router.replace({ query: { ...this.$route.query, vendor: undefined } })
    },
    monthDetail(i) {
      const row = this.d?.months?.[i]
      if (!row) return ''
      return CATEGORIES.filter((c) => row[c.key]).map((c) => `${c.label} ${money(row[c.key], this.cur)}`).join(' · ')
    },
    kindIcon(k) {
      return { domain: 'fa-solid fa-globe', hosting: 'fa-solid fa-server', ssl: 'fa-solid fa-lock' }[k] || 'fa-solid fa-rotate'
    },
    daysTone(r) {
      if (r.days_left === null || r.days_left === undefined) return 'ui-badge--draft'
      if (r.days_left < 0) return 'ui-badge--danger'
      if (r.days_left <= 30) return r.auto_renew ? 'ui-badge--info' : 'ui-badge--warning'
      return 'ui-badge--draft'
    },
    async dismiss(a) {
      try {
        await expensesApi.dismissAlert(a.key)
        this.d.alerts = this.d.alerts.filter((x) => x.key !== a.key)
        toast.info('Alert dismissed')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not dismiss'))
      }
    },
    async syncNow() {
      this.syncing = true
      try {
        const r = await expensesApi.sync('')
        const msgs = []
        for (const x of r.results || []) {
          if (!x.ok) toast.error(`${x.source === 'synergy' ? 'Synergy Wholesale' : 'Gmail'}: ${x.error}${x.hint ? ' — ' + x.hint : ''}`)
          else msgs.push(x.source === 'gmail' ? `${x.created} new from Gmail` : `${x.renewals} domains/services`)
        }
        if (msgs.length) toast.success('Synced: ' + msgs.join(' · '))
        this.refreshAll()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Sync failed'))
      } finally {
        this.syncing = false
      }
    },
    async exportCsv() {
      try {
        const blob = await expensesApi.exportCsv({ status: this.tab === 'inbox' ? 'pending' : 'approved' })
        downloadBlob(blob, `expenses-${new Date().toISOString().slice(0, 10)}.csv`)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Export failed'))
      }
    }
  }
}
</script>

<style scoped>
.tabs-row {
  padding: 10px 14px 0;
  border-bottom: 1px solid var(--border);
  overflow-x: auto;
}
.tabs-row .ui-tabs {
  flex-wrap: nowrap;
  white-space: nowrap;
}
.count {
  margin-left: 6px;
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--bg-subtle);
  color: var(--text-2);
  font-variant-numeric: tabular-nums;
}
.count.warn {
  background: var(--warning-soft);
  color: var(--warning);
}
.count.danger {
  background: var(--danger-soft);
  color: var(--danger);
}
.banner {
  margin-bottom: 14px;
}
.balance {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 13.5px;
  margin-bottom: 14px;
  color: var(--text-2);
}
.balance strong {
  color: var(--text);
  font-variant-numeric: tabular-nums;
}
.balance.low strong,
.balance.low i {
  color: var(--danger);
}
.row2 {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}
.panel {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 14px;
  min-width: 0;
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
.muted {
  color: var(--text-3);
  font-size: 12.5px;
}
.ok i {
  color: var(--success);
}
.vendors {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.vrow {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  background: none;
  border: 0;
  padding: 6px 4px;
  border-radius: var(--radius-sm);
  text-align: left;
  cursor: pointer;
  color: inherit;
  width: 100%;
}
.vrow:hover {
  background: var(--surface-hover);
}
.vrow__n {
  color: var(--text-3);
  font-size: 12px;
  width: 16px;
  padding-top: 2px;
}
.vrow__main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.vrow__line {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}
.vrow__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.vrow__line strong {
  font-variant-numeric: tabular-nums;
}
.vrow__bar {
  height: 6px;
  background: var(--bg-subtle);
  border-radius: 999px;
  overflow: hidden;
}
.vrow__bar span {
  display: block;
  height: 100%;
  background: var(--viz-1);
  border-radius: 999px;
}
.vrow small {
  color: var(--text-3);
  font-size: 12px;
}
.rlist {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.rlist li {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13.5px;
}
.rlist .rname {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.fc td,
.fc th {
  padding: 6px 8px;
}
.fcwrap {
  border: 0;
  margin: 0 -4px;
}
.toolbar {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  margin: 12px 0;
}
.toolbar .search {
  min-width: 220px;
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
.inline {
  flex-direction: row;
  align-items: center;
  gap: 6px;
}
.chk {
  width: 32px;
}
.vcell {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.vcell small {
  color: var(--text-3);
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cat {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  font-size: 13px;
  color: var(--text-2);
  white-space: nowrap;
}
.block {
  display: block;
}
.nowrap {
  white-space: nowrap;
}
.txt-warn {
  color: var(--warning);
}
.txt-danger {
  color: var(--danger);
}
.txt-ok {
  color: var(--success);
}
.ai {
  color: var(--accent);
  margin-left: 4px;
}
.busy {
  opacity: 0.6;
}
.more {
  padding: 8px 12px;
}
.empty-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
}
@media (max-width: 1000px) {
  .row2 {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 640px) {
  .hide-sm {
    display: none;
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
}
@media (max-width: 480px) {
  .hide-xs {
    display: none;
  }
}
</style>
