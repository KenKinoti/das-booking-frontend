<template>
  <div class="ui-page ui-page--wide adv dviz">
    <header class="ui-page-head">
      <div>
        <div class="ui-eyebrow">Reports</div>
        <h1>{{ title }}</h1>
        <p>{{ subtitle }}</p>
      </div>
      <div class="ui-actions head-actions">
        <button class="ui-btn" type="button" data-testid="adv-export" :disabled="!ready" @click="exportCsv"><i class="fa-solid fa-file-csv"></i> Export CSV</button>
        <router-link to="/insights" class="ui-btn ui-btn--ghost"><i class="fa-solid fa-lightbulb"></i> Opportunities</router-link>
      </div>
    </header>

    <slot name="tabs"></slot>

    <div v-if="view !== 'hosting'" class="toolbar" data-testid="adv-toolbar">
      <div class="ui-tabs presets" role="tablist" aria-label="Date range">
        <button v-for="p in PRESETS" :key="p.key" type="button" class="ui-tab" :class="{ 'is-active': preset === p.key }" :data-range="p.key" @click="setPreset(p.key)">{{ p.label }}</button>
      </div>
      <div v-if="preset === 'custom'" class="custom">
        <input v-model="customFrom" type="date" class="ui-input" aria-label="From" @change="applyCustom" />
        <span>–</span>
        <input v-model="customTo" type="date" class="ui-input" aria-label="To" @change="applyCustom" />
      </div>
      <select v-model="currency" class="ui-select cur" aria-label="Currency" data-testid="adv-currency">
        <option value="">All currencies → {{ home || 'home currency' }}</option>
        <option v-for="c in currencies" :key="c" :value="c">Only {{ c }} documents</option>
      </select>
      <div v-if="chips.length" class="chips" data-testid="adv-filters">
        <span v-for="c in chips" :key="c.key" class="chip">
          {{ c.label }}
          <button type="button" :aria-label="'Remove filter ' + c.label" @click="clearFilter(c.key)"><i class="fa-solid fa-xmark"></i></button>
        </span>
      </div>
    </div>

    <component
      :is="viewComponent"
      ref="view"
      :params="params"
      :filters="filters"
      @drill="drill"
      @loaded="onLoaded"
    />
  </div>
</template>

<script>
import RevenueView from './RevenueView.vue'
import ClientsView from './ClientsView.vue'
import PaymentsView from './PaymentsView.vue'
import ServicesView from './ServicesView.vue'
import HostingView from './HostingView.vue'
import SeasonalityView from './SeasonalityView.vue'
import { presetRange, monthLabel } from '@/services/insights'
import { loadPref, savePref } from '@/components/dashboard/analytics'

const PRESETS = [
  { key: '12m', label: '12M' },
  { key: '24m', label: '24M' },
  { key: '36m', label: '36M' },
  { key: 'ytd', label: 'YTD' },
  { key: 'all', label: 'All' },
  { key: 'custom', label: 'Custom' }
]
const DEFAULTS = { revenue: '24m', clients: '36m', payments: '24m', services: '12m', seasonality: 'all' }
const COMPONENTS = { revenue: RevenueView, clients: ClientsView, payments: PaymentsView, services: ServicesView, hosting: HostingView, seasonality: SeasonalityView }
const SUBTITLES = {
  revenue: 'Revenue by month, client and service line with year-on-year change. Click a client, a service line or a month to see the invoice lines behind it.',
  clients: 'Cohort retention, client concentration (HHI), churn and customer lifetime value.',
  payments: 'Days sales outstanding and how each client pays.',
  services: 'Revenue, direct costs and margin by service line (hosting, web development, Workspace, consulting …).',
  hosting: 'Unit economics per hosted site and plan, from the Synergy Wholesale statements and usage reports.',
  seasonality: 'Which months are strong or weak, across years.'
}

export default {
  name: 'AdvancedAnalytics',
  props: {
    view: { type: String, required: true },
    title: { type: String, default: 'Analytics' }
  },
  data() {
    const q = this.$route.query
    const preset = PRESETS.some((p) => p.key === q.range) ? q.range : loadPref('an.range.' + this.view, DEFAULTS[this.view] || '24m')
    return {
      PRESETS,
      preset,
      customFrom: q.from && q.from !== 'all' ? q.from : '',
      customTo: q.to || '',
      currency: typeof q.currency === 'string' ? q.currency : '',
      home: '',
      currencies: [],
      ready: false
    }
  },
  computed: {
    viewComponent() {
      return COMPONENTS[this.view] || RevenueView
    },
    subtitle() {
      return SUBTITLES[this.view] || ''
    },
    range() {
      if (this.preset === 'custom') {
        const r = presetRange('24m')
        return { from: this.customFrom || r.from, to: this.customTo || r.to }
      }
      return presetRange(this.preset)
    },
    filters() {
      const q = this.$route.query
      return { client: q.client || '', line: q.line || '', month: q.month || '', clientName: q.client_name || '' }
    },
    params() {
      return { from: this.range.from, to: this.range.to, currency: this.currency }
    },
    chips() {
      const f = this.filters
      const out = []
      if (f.client) out.push({ key: 'client', label: 'Client: ' + (f.clientName || 'selected') })
      if (f.line) out.push({ key: 'line', label: 'Service: ' + (LINE_NAMES[f.line] || f.line) })
      if (f.month) out.push({ key: 'month', label: 'Month: ' + monthLabel(f.month, true) })
      return out
    }
  },
  watch: {
    currency(v) {
      this.replaceQuery({ currency: v || undefined })
    }
  },
  methods: {
    replaceQuery(patch) {
      const q = { ...this.$route.query, ...patch }
      Object.keys(q).forEach((k) => q[k] === undefined && delete q[k])
      this.$router.replace({ query: q })
    },
    setPreset(p) {
      this.preset = p
      savePref('an.range.' + this.view, p)
      if (p === 'custom') {
        const r = presetRange('24m')
        this.customFrom = this.customFrom || r.from
        this.customTo = this.customTo || r.to
        this.replaceQuery({ range: 'custom', from: this.customFrom, to: this.customTo })
      } else {
        this.replaceQuery({ range: p, from: undefined, to: undefined })
      }
    },
    applyCustom() {
      if (this.customFrom && this.customTo && this.customFrom > this.customTo) [this.customFrom, this.customTo] = [this.customTo, this.customFrom]
      this.replaceQuery({ range: 'custom', from: this.customFrom || undefined, to: this.customTo || undefined })
    },
    drill(f) {
      this.replaceQuery({
        client: f.client !== undefined ? f.client || undefined : this.$route.query.client,
        client_name: f.client !== undefined ? f.clientName || undefined : this.$route.query.client_name,
        line: f.line !== undefined ? f.line || undefined : this.$route.query.line,
        month: f.month !== undefined ? f.month || undefined : this.$route.query.month
      })
    },
    clearFilter(k) {
      this.replaceQuery(k === 'client' ? { client: undefined, client_name: undefined } : { [k]: undefined })
    },
    onLoaded(d) {
      this.ready = true
      const conv = d?.conversion
      if (conv) {
        this.home = conv.home
        const list = (conv.rates || []).map((r) => r.currency)
        if (conv.filter && !list.includes(conv.filter)) list.push(conv.filter)
        if (list.length) this.currencies = list
      } else if (d?.home) {
        this.home = d.home
      }
    },
    exportCsv() {
      this.$refs.view?.exportCsv?.()
    }
  }
}

const LINE_NAMES = {
  web_dev: 'Web development',
  hosting: 'Hosting',
  domains: 'Domains',
  workspace: 'Google Workspace & email',
  maintenance: 'Maintenance & support',
  software: 'Software & ERP',
  consulting: 'Consulting & training',
  other: 'Other'
}
</script>

<style scoped>
.head-actions {
  flex-wrap: wrap;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.presets {
  flex-wrap: nowrap;
}

.custom {
  display: flex;
  align-items: center;
  gap: 6px;
}

.custom .ui-input {
  width: 150px;
}

.cur {
  width: auto;
  min-width: 200px;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px 4px 10px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 12.5px;
  font-weight: 550;
}

.chip button {
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: grid;
  place-items: center;
}

.chip button:hover {
  background: var(--surface-hover);
}

@media (max-width: 520px) {
  .toolbar {
    gap: 8px;
  }

  .presets {
    width: 100%;
    overflow-x: auto;
  }

  .cur {
    min-width: 0;
    width: 100%;
  }

  .custom {
    width: 100%;
  }

  .custom .ui-input {
    flex: 1;
    width: auto;
    min-width: 0;
  }
}
</style>
