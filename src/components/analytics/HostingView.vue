<template>
  <div data-testid="view-hosting">
    <div v-if="error" class="ui-alert ui-alert--danger mb"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span></div>
    <div v-if="d && !d.has_data" class="ui-card">
      <div class="ui-empty">
        <div class="ui-empty__icon"><i class="fa-solid fa-server"></i></div>
        <h3>No hosting data yet</h3>
        <p>Upload your Synergy Wholesale statements and hosting usage reports to see cost, billing and margin per site.</p>
        <router-link to="/expenses?tab=synergy" class="ui-btn ui-btn--primary ui-btn--sm"><i class="fa-solid fa-upload"></i> Upload Synergy files</router-link>
      </div>
    </div>
    <template v-else>
      <div class="kpis">
        <KpiCard label="Active sites" icon="fa-solid fa-server" :loading="!d" :value="num(d?.active_sites)" :meta="`${num(d?.billed_sites)} billed · ${num(d?.unbilled_sites)} not billed · ${num(d?.cancelled_sites)} cancelled`" :show-delta="false" data-kpi="sites" />
        <KpiCard label="Revenue per site" icon="fa-solid fa-coins" tone="success" :loading="!d" :value="m(d?.arps)" meta="Per billed site, per month (ARPS)" :show-delta="false" data-kpi="arps" />
        <KpiCard label="Cost per site" icon="fa-solid fa-truck-fast" tone="warning" :loading="!d" :value="m(d?.cost_per_site)" :meta="`Synergy run-rate AUD ${num(d?.run_rate_aud, 2)}/mo`" :show-delta="false" data-kpi="cps" />
        <KpiCard label="Hosting margin" icon="fa-solid fa-percent" tone="info" :loading="!d" :value="m(d?.margin_month)" :meta="`${d?.margin_pct == null ? '—' : pct(d.margin_pct, 0)} of billed · ${pct(d?.profitable_pct, 0)} of billed sites profitable`" :show-delta="false" data-kpi="margin" />
      </div>

      <section class="ui-card mb">
        <div class="ui-card__head wrap">
          <div>
            <h2>By plan</h2>
            <span class="sub">{{ d?.note }}</span>
          </div>
          <router-link to="/expenses?tab=synergy" class="ui-btn ui-btn--sm">Synergy details</router-link>
        </div>
        <div v-if="!d" class="ui-card__body"><div class="ui-skeleton" style="height: 160px"></div></div>
        <div v-else class="ui-table-wrap">
          <table class="ui-table">
            <thead>
              <tr><th>Plan</th><th class="num">Sites</th><th class="num hide-sm">Avg disk used</th><th class="num">Cost / mo</th><th class="num">Billed / mo</th><th class="num">Margin</th><th class="num hide-sm">Avg price</th></tr>
            </thead>
            <tbody>
              <tr v-for="p in d.plans" :key="p.plan">
                <td>{{ p.plan || '—' }}</td>
                <td class="num">{{ p.sites }}</td>
                <td class="num hide-sm">{{ p.avg_pct_used ? pct(p.avg_pct_used, 0) : '—' }}</td>
                <td class="num">{{ m(p.cost_home) }}</td>
                <td class="num">{{ m(p.billed) }}</td>
                <td class="num" :class="{ down: p.margin < 0 }">{{ m(p.margin) }}</td>
                <td class="num hide-sm">{{ p.billed_sites ? m(p.avg_price) : '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="ui-card mb">
        <div class="ui-card__head wrap">
          <div>
            <h2>Per site</h2>
            <span class="sub">Lowest margin first. Cost per GB uses the latest usage report.</span>
          </div>
          <div class="ui-tabs" role="tablist" aria-label="Filter">
            <button v-for="f in FILTERS" :key="f.key" type="button" class="ui-tab" :class="{ 'is-active': filter === f.key }" @click="filter = f.key">{{ f.label }}</button>
          </div>
        </div>
        <div v-if="!d" class="ui-card__body"><div class="ui-skeleton" style="height: 240px"></div></div>
        <div v-else-if="!rows.length" class="ui-empty small"><p>No sites match.</p></div>
        <div v-else class="ui-table-wrap">
          <table class="ui-table" data-testid="sites">
            <thead>
              <tr>
                <th>Site</th>
                <th class="hide-sm">Plan</th>
                <th class="num">Cost</th>
                <th class="num">Billed</th>
                <th class="num">Margin</th>
                <th class="num hide-sm">Disk</th>
                <th class="num hide-sm">Cost / GB</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in rows" :key="s.domain" :class="{ dim: s.status === 'cancelled' }">
                <td>
                  <strong>{{ s.domain }}</strong>
                  <small class="muted block">{{ s.client || 'No client linked' }}<template v-if="s.status !== 'active'"> · {{ s.status }}</template></small>
                  <span v-for="f in s.flags" :key="f" class="ui-badge flag" :class="FLAG[f]?.cls || 'ui-badge--draft'">{{ FLAG[f]?.label || f }}</span>
                </td>
                <td class="hide-sm">{{ s.plan }}</td>
                <td class="num">{{ m(s.cost_home) }}<small class="muted block">AUD {{ num(s.cost_aud, 2) }}</small></td>
                <td class="num">{{ s.billed == null ? '—' : m(s.billed) }}</td>
                <td class="num" :class="{ down: s.margin < 0 }">{{ s.margin == null ? '—' : m(s.margin) }}<small v-if="s.margin_pct != null" class="muted block">{{ pct(s.margin_pct, 0) }}</small></td>
                <td class="num hide-sm">{{ s.pct_used == null ? '—' : pct(s.pct_used, 0) }}</td>
                <td class="num hide-sm">{{ s.cost_per_gb == null ? '—' : m(s.cost_per_gb) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </div>
</template>

<script>
import KpiCard from '@/components/dashboard/KpiCard.vue'
import { analyticsApi } from '@/services/insights'
import { apiErrorMessage } from '@/services/api'
import { money, num, pct, downloadCsv, fileStamp } from './fmt'

const FLAG = {
  over_quota: { label: 'Over quota', cls: 'ui-badge--danger' },
  near_full: { label: 'Near full', cls: 'ui-badge--warning' },
  fast_growth: { label: 'Fast growth', cls: 'ui-badge--info' },
  unbilled: { label: 'Not billed', cls: 'ui-badge--warning' },
  no_client: { label: 'No client', cls: 'ui-badge--draft' },
  below_cost: { label: 'Below cost', cls: 'ui-badge--danger' },
  price_change: { label: 'Price changed', cls: 'ui-badge--info' }
}
const FILTERS = [
  { key: 'active', label: 'Active' },
  { key: 'attention', label: 'Needs attention' },
  { key: 'all', label: 'All' }
]

export default {
  name: 'HostingView',
  components: { KpiCard },
  props: { params: { type: Object, required: true }, filters: { type: Object, required: true } },
  emits: ['drill', 'loaded'],
  data() {
    return { d: null, error: '', filter: 'active', FLAG, FILTERS }
  },
  computed: {
    rows() {
      const l = this.d?.sites || []
      if (this.filter === 'active') return l.filter((s) => s.status !== 'cancelled')
      if (this.filter === 'attention') return l.filter((s) => s.status !== 'cancelled' && s.flags.some((f) => ['over_quota', 'near_full', 'unbilled', 'below_cost', 'no_client'].includes(f)))
      return l
    }
  },
  created() {
    this.load()
  },
  methods: {
    num,
    pct,
    m(v) {
      return money(v, this.d?.home)
    },
    async load() {
      try {
        this.d = await analyticsApi.hosting()
        this.error = ''
        this.$emit('loaded', this.d)
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load hosting analytics.')
      }
    },
    exportCsv() {
      const d = this.d
      if (!d) return
      const rows = [[`Hosting unit economics (${d.home} per month)`], [d.note], [], ['Domain', 'Status', 'Plan', 'Client', 'Cost AUD', `Cost ${d.home}`, `Billed ${d.home}`, 'Billed from', `Margin ${d.home}`, 'Margin %', 'Usage MB', 'Limit MB', '% used', `Cost per GB ${d.home}`, 'Flags']]
      d.sites.forEach((s) => rows.push([s.domain, s.status, s.plan, s.client, s.cost_aud, s.cost_home, s.billed ?? '', s.billed_source, s.margin ?? '', s.margin_pct ?? '', s.usage_mb ?? '', s.limit_mb ?? '', s.pct_used ?? '', s.cost_per_gb ?? '', s.flags.join(';')]))
      downloadCsv(`hosting-${fileStamp()}.csv`, rows)
    }
  }
}
</script>

<style scoped>
.mb {
  margin-bottom: 16px;
}

.kpis {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.ui-card__head.wrap {
  flex-wrap: wrap;
  gap: 8px;
}

.sub {
  display: block;
  font-size: 12px;
  color: var(--text-3);
  margin-top: 2px;
  max-width: 760px;
}

.muted {
  color: var(--text-3);
}

.block {
  display: block;
}

.down {
  color: var(--danger);
}

.flag {
  margin: 4px 4px 0 0;
}

tr.dim td {
  opacity: 0.6;
}

@media (max-width: 1100px) {
  .kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 600px) {
  .hide-sm {
    display: none;
  }

  .kpis {
    gap: 10px;
  }
}
</style>
