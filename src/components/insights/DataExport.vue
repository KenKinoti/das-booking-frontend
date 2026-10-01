<template>
  <div data-testid="data-export">
    <section class="ui-card mb">
      <div class="ui-card__head wrap">
        <div>
          <h2>Fact tables (CSV)</h2>
          <span class="sub">Clean, one-row-per-fact exports for pandas, R, Power BI or a warehouse. UTF-8, comma separated, one header row; dates ISO 8601; *_home columns in the home currency.</span>
        </div>
        <div class="range">
          <input v-model="from" type="date" class="ui-input" aria-label="From" data-testid="export-from" />
          <span>–</span>
          <input v-model="to" type="date" class="ui-input" aria-label="To" data-testid="export-to" />
        </div>
      </div>
      <div v-if="error" class="ui-card__body"><div class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div></div>
      <div v-else-if="!list.length" class="ui-card__body"><div class="ui-skeleton" style="height: 240px"></div></div>
      <ul v-else class="ds">
        <li v-for="d in list" :key="d.key" :data-export="d.key">
          <div class="ds__main">
            <strong>{{ d.title }} <code>{{ d.key }}.csv</code></strong>
            <small>{{ d.grain }}<template v-if="d.dated_by"> · filtered by <code>{{ d.dated_by }}</code></template><template v-else> · not date-filtered</template></small>
            <details>
              <summary>{{ d.columns.length }} columns</summary>
              <code class="cols">{{ d.columns.join(', ') }}</code>
            </details>
          </div>
          <button class="ui-btn ui-btn--sm" type="button" :disabled="busy === d.key" @click="download(d)">
            <i :class="busy === d.key ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-download'"></i> Download
          </button>
        </li>
      </ul>
    </section>

    <section class="ui-card mb">
      <div class="ui-card__head">
        <div>
          <h2>Read-only JSON API</h2>
          <span class="sub">The same figures as these pages, for notebooks and scripts (Bearer token of a signed-in user), and as AI / MCP tools</span>
        </div>
      </div>
      <div class="ui-table-wrap">
        <table class="ui-table">
          <thead>
            <tr><th>Endpoint</th><th>Returns</th></tr>
          </thead>
          <tbody>
            <tr v-for="e in ENDPOINTS" :key="e[0]">
              <td><code>{{ e[0] }}</code></td>
              <td>{{ e[1] }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="ui-card__body tools">
        <p>
          AI / MCP tools: <code>analytics_revenue_breakdown</code> (revenue by month, client and service line with YoY and drill-down) and <code>insights_opportunities</code>
          (opportunities with estimated value), alongside <code>synergy_sites</code>, <code>expenses_summary</code>, <code>profit_and_loss</code> and the rest — connect an
          MCP client in <router-link to="/settings/ai">Settings → AI</router-link>.
        </p>
        <p class="muted">Common query parameters: <code>from</code>, <code>to</code> (YYYY-MM-DD, or <code>from=all</code>), <code>currency</code> (only documents in that currency), <code>client</code> (customer id), <code>line</code> (service line), <code>month</code> (YYYY-MM), <code>grain</code> (cohorts: month | quarter | year).</p>
      </div>
    </section>
  </div>
</template>

<script>
import { insightsApi, presetRange } from '@/services/insights'
import { apiErrorMessage } from '@/services/api'
import { downloadBlob } from '@/utils/format'
import { toast } from '@/composables/useToast'

const ENDPOINTS = [
  ['GET /api/v1/analytics/revenue', 'Total, months with YoY, by client, by service line; invoice lines when filtered'],
  ['GET /api/v1/analytics/clients', 'Cohort retention matrix, concentration (top-N, HHI, Lorenz), churn, CLV'],
  ['GET /api/v1/analytics/payments', 'DSO by month, days to pay, behaviour per client'],
  ['GET /api/v1/analytics/service-lines', 'Revenue, direct cost and margin per service line, monthly'],
  ['GET /api/v1/analytics/hosting', 'Per-site and per-plan hosting unit economics'],
  ['GET /api/v1/analytics/seasonality', 'Year × month revenue matrix and seasonality index'],
  ['GET /api/v1/insights/dashboard', 'Business snapshot, imported history, hosting summary, 90-day cash forecast'],
  ['GET /api/v1/insights/opportunities', 'Opportunities with value, basis and items; pipeline; renewal calendar'],
  ['GET /api/v1/insights/market', 'World Bank indicators, FX pairs, your datasets'],
  ['GET /api/v1/insights/export/{dataset}', 'The CSV files above']
]

export default {
  name: 'DataExport',
  data() {
    const r = presetRange('12m')
    return { list: [], error: '', from: r.from, to: r.to, busy: '', ENDPOINTS }
  },
  async created() {
    try {
      const r = await insightsApi.exportList()
      this.list = r.datasets || []
    } catch (e) {
      this.error = apiErrorMessage(e, 'Could not load the export catalogue.')
    }
  },
  methods: {
    async download(d) {
      this.busy = d.key
      try {
        const blob = await insightsApi.exportCsv(d.key, { from: this.from, to: this.to })
        downloadBlob(blob, d.dated_by ? `${d.key}_${this.from}_${this.to}.csv` : `${d.key}.csv`)
        toast.success(`${d.title} downloaded`)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not export'))
      } finally {
        this.busy = ''
      }
    }
  }
}
</script>

<style scoped>
.mb {
  margin-bottom: 16px;
}

.ui-card__head.wrap {
  flex-wrap: wrap;
  gap: 10px;
}

.sub {
  display: block;
  font-size: 12px;
  color: var(--text-3);
  margin-top: 2px;
  max-width: 720px;
}

.range {
  display: flex;
  align-items: center;
  gap: 6px;
}

.range .ui-input {
  width: 150px;
}

.ds {
  list-style: none;
  margin: 0;
  padding: 0;
}

.ds li {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
  padding: 12px 20px;
  border-top: 1px solid var(--border);
}

.ds__main {
  min-width: 0;
}

.ds__main strong {
  display: block;
  font-size: 13.5px;
}

.ds__main small {
  display: block;
  font-size: 12px;
  color: var(--text-3);
}

details {
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-2);
}

summary {
  cursor: pointer;
}

.cols {
  display: block;
  white-space: normal;
  word-break: break-word;
  margin-top: 4px;
}

code {
  background: var(--bg-subtle);
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 12px;
}

.tools p {
  font-size: 13px;
  color: var(--text-2);
  margin: 0 0 8px;
}

.muted {
  color: var(--text-3);
}

@media (max-width: 520px) {
  .range {
    width: 100%;
  }

  .range .ui-input {
    flex: 1;
    width: auto;
    min-width: 0;
  }

  .ds li {
    padding: 12px 14px;
  }
}
</style>
