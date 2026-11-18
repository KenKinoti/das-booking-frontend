<template>
  <div data-testid="scout-runs">
    <div v-if="error" class="ui-alert ui-alert--danger mb">
      <i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span>
    </div>
    <div v-if="!d" class="ui-skeleton" style="height: 220px"></div>
    <template v-else>
      <div class="kpis">
        <div class="kpi">
          <span class="k">Spent in {{ monthName }}</span>
          <strong data-testid="scout-month-spend">{{ usd(d.spent_usd) }}</strong>
          <small>of {{ usd(d.budget_usd) }} budget</small>
        </div>
        <div class="kpi">
          <span class="k">Scans</span>
          <strong>{{ d.month_totals.runs }}</strong>
          <small>this month</small>
        </div>
        <div class="kpi">
          <span class="k">Web searches</span>
          <strong>{{ d.month_totals.searches }}</strong>
          <small>{{ usd(d.month_totals.searches * 0.01) }} at US$10 / 1,000</small>
        </div>
        <div class="kpi">
          <span class="k">Tokens</span>
          <strong
            >{{ tokens(d.month_totals.input_tokens) }} in ·
            {{ tokens(d.month_totals.output_tokens) }} out</strong
          >
          <small>search results count as input</small>
        </div>
      </div>

      <div v-if="!d.runs.length" class="ui-card">
        <div class="ui-empty small">
          <div class="ui-empty__icon"><i class="fa-solid fa-clock-rotate-left"></i></div>
          <h3>No scans yet</h3>
          <p>Every scan is listed here with its searches, tokens and what it cost.</p>
        </div>
      </div>
      <div v-else class="ui-card list">
        <div
          v-for="r in d.runs"
          :key="r.id"
          class="run"
          :data-run="r.id"
          :data-run-status="r.status"
        >
          <button type="button" class="run__row" :aria-expanded="open === r.id" @click="toggle(r)">
            <span class="when">
              <strong>{{ formatDateTime(r.started_at) }}</strong>
              <small
                >{{ r.kind === 'deep' ? 'Weekly deep scan' : 'Light scan' }} ·
                {{ triggerLabel(r) }}</small
              >
            </span>
            <span class="ui-badge" :class="statusClass(r.status)">{{ statusLabel(r.status) }}</span>
            <span class="num"
              ><i class="fa-solid fa-magnifying-glass"></i> {{ r.searches
              }}<small v-if="r.max_searches">/{{ r.max_searches }}</small></span
            >
            <span
              class="num"
              :title="r.input_tokens + ' input · ' + r.output_tokens + ' output tokens'"
              ><i class="fa-solid fa-microchip"></i>
              {{ tokens(r.input_tokens + r.output_tokens) }}</span
            >
            <span class="num cost" data-testid="scout-run-cost">{{ usd(r.cost_usd) }}</span>
            <span class="found">{{ found(r) }}</span>
            <i
              class="fa-solid chev"
              :class="open === r.id ? 'fa-chevron-up' : 'fa-chevron-down'"
            ></i>
          </button>
          <div v-if="open === r.id" class="run__detail">
            <p
              v-if="r.message"
              class="msg"
              :class="{ bad: r.status === 'error' || r.status === 'budget' }"
            >
              {{ r.message }}
            </p>
            <dl class="grid">
              <div>
                <dt>Model</dt>
                <dd>{{ r.model || '—' }}</dd>
              </div>
              <div>
                <dt>Searches</dt>
                <dd>
                  {{ r.searches }} of up to {{ r.max_searches }} · {{ usd(r.search_cost_usd) }}
                </dd>
              </div>
              <div>
                <dt>Tokens</dt>
                <dd>
                  {{ r.input_tokens.toLocaleString() }} in ·
                  {{ r.output_tokens.toLocaleString() }} out · {{ usd(r.token_cost_usd) }}
                </dd>
              </div>
              <div>
                <dt>Checked before it ran</dt>
                <dd>up to {{ usd(r.estimate_usd) }}</dd>
              </div>
              <div>
                <dt>Answer</dt>
                <dd>{{ r.found }} found · {{ r.kept }} new · {{ r.updated }} seen before</dd>
              </div>
              <div>
                <dt>Dropped</dt>
                <dd>
                  {{ r.unverified }} without a source from the search · {{ r.expired }} past
                  deadline · {{ r.duplicates }} duplicates · {{ r.filtered }} below your minimum /
                  excluded · {{ r.invalid }} unusable
                </dd>
              </div>
            </dl>
            <p v-if="r.price_note" class="ui-hint">{{ r.price_note }}</p>
            <div v-if="detail && detail.id === r.id">
              <h4>What it searched</h4>
              <ol v-if="detail.queries && detail.queries.length" class="queries">
                <li v-for="(q, i) in detail.queries" :key="i">{{ q }}</li>
              </ol>
              <p v-else class="ui-hint">No searches recorded.</p>
              <p v-if="detail.search_errors && detail.search_errors.length" class="ui-hint">
                Search errors: {{ detail.search_errors.join(', ') }}
              </p>
              <details v-if="detail.prompt" class="prompt">
                <summary>What the scout asked</summary>
                <pre data-testid="scout-run-prompt">{{ detail.prompt }}</pre>
              </details>
            </div>
          </div>
        </div>
      </div>

      <details class="ui-card rates">
        <summary>
          Prices used <small>(US$ per million tokens; web search US$10 per 1,000 searches)</small>
        </summary>
        <div class="ui-table-wrap">
          <table class="ui-table">
            <thead>
              <tr>
                <th>Model</th>
                <th class="r">Input</th>
                <th class="r">Output</th>
                <th class="r">Cache write</th>
                <th class="r">Cache read</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="x in d.rates" :key="x.model">
                <td>
                  {{ x.name
                  }}<small v-if="x.long_over">
                    (≤ {{ (x.long_over / 1000).toFixed(0) }}k-token prompts; then
                    {{ x.long_input }} / {{ x.long_output }})</small
                  >
                </td>
                <td class="r">{{ x.input }}</td>
                <td class="r">{{ x.output }}</td>
                <td class="r">{{ x.cache_write }}</td>
                <td class="r">{{ x.cache_read }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="ui-hint">
          From
          <a :href="d.pricing_source" target="_blank" rel="noopener noreferrer"
            >Anthropic's pricing page</a
          >. A model not in this list is counted at the highest rate.
        </p>
      </details>
    </template>
  </div>
</template>

<script>
import { scoutApi, usd, tokens } from '@/services/scout'
import { formatDateTime } from '@/utils/format'
import { apiErrorMessage } from '@/services/api'

export default {
  name: 'ScoutRuns',
  props: { version: { type: Number, default: 0 } },
  data() {
    return { d: null, error: '', open: '', detail: null }
  },
  computed: {
    monthName() {
      if (!this.d?.month) return 'this month'
      const [y, m] = this.d.month.split('-').map(Number)
      return new Date(y, m - 1, 1).toLocaleString(undefined, { month: 'long' })
    },
  },
  watch: {
    version() {
      this.load()
    },
  },
  created() {
    this.load()
  },
  methods: {
    usd,
    tokens,
    formatDateTime,
    async load() {
      try {
        this.d = await scoutApi.runs(50)
        this.error = ''
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load the scan history.')
      }
    },
    async toggle(r) {
      this.open = this.open === r.id ? '' : r.id
      if (this.open && (!this.detail || this.detail.id !== r.id)) {
        try {
          this.detail = await scoutApi.run(r.id)
        } catch {
          this.detail = null
        }
      }
    },
    triggerLabel(r) {
      if (r.trigger === 'schedule') return 'scheduled'
      if (r.trigger === 'ai') return 'by the AI assistant' + (r.by_name ? ` for ${r.by_name}` : '')
      return r.by_name ? `by ${r.by_name}` : 'Scan now'
    },
    statusLabel(s) {
      return (
        {
          ok: 'Done',
          running: 'Running',
          error: 'Failed',
          budget: 'Budget reached',
          skipped: 'Skipped',
        }[s] || s
      )
    },
    statusClass(s) {
      return (
        {
          ok: 'ui-badge--success',
          running: 'ui-badge--info',
          error: 'ui-badge--danger',
          budget: 'ui-badge--warning',
        }[s] || ''
      )
    },
    found(r) {
      if (r.status !== 'ok') return ''
      return `${r.kept} new${r.updated ? ` · ${r.updated} seen before` : ''}`
    },
  },
}
</script>

<style scoped>
.mb {
  margin-bottom: 12px;
}

.kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 10px;
  margin-bottom: 12px;
}

.kpi {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg, 12px);
  background: var(--surface);
}

.kpi .k {
  font-size: 12px;
  color: var(--text-3);
}

.kpi strong {
  font-size: 18px;
  font-variant-numeric: tabular-nums;
  color: var(--text);
}

.kpi small {
  font-size: 11.5px;
  color: var(--text-3);
}

.list {
  padding: 0;
  overflow: hidden;
}

.run + .run {
  border-top: 1px solid var(--border);
}

.run__row {
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) auto 64px 72px 84px minmax(0, 1fr) 14px;
  align-items: center;
  gap: 10px;
  padding: 11px 14px;
  border: 0;
  background: transparent;
  color: var(--text);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.run__row:hover {
  background: var(--bg-subtle);
}

.when {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.when strong {
  font-size: 13px;
  font-weight: 600;
}

.when small {
  font-size: 11.5px;
  color: var(--text-3);
}

.num {
  font-size: 12.5px;
  font-variant-numeric: tabular-nums;
  color: var(--text-2);
  white-space: nowrap;
}

.num i {
  font-size: 10px;
  color: var(--text-3);
  margin-right: 3px;
}

.cost {
  font-weight: 650;
  color: var(--text);
  text-align: right;
}

.found {
  font-size: 12.5px;
  color: var(--text-2);
}

.chev {
  font-size: 10px;
  color: var(--text-3);
}

.run__detail {
  padding: 4px 14px 14px;
  font-size: 13px;
}

.msg {
  margin: 0 0 10px;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  background: var(--bg-subtle);
  color: var(--text);
}

.msg.bad {
  background: var(--warning-soft);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 8px 16px;
  margin: 0 0 8px;
}

.grid dt {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-3);
}

.grid dd {
  margin: 0;
  color: var(--text);
}

h4 {
  margin: 10px 0 4px;
  font-size: 13px;
}

.queries {
  margin: 0;
  padding-left: 20px;
  color: var(--text-2);
}

.prompt summary {
  cursor: pointer;
  color: var(--accent);
  margin-top: 8px;
}

.prompt pre {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font-size: 12px;
  background: var(--bg-subtle);
  color: var(--text);
  padding: 10px;
  border-radius: var(--radius-sm);
  max-height: 360px;
  overflow: auto;
}

.rates {
  margin-top: 12px;
  padding: 12px 14px;
}

.rates summary {
  cursor: pointer;
  font-weight: 600;
  font-size: 13.5px;
}

.rates summary small {
  font-weight: 500;
  color: var(--text-3);
}

.r {
  text-align: right;
}

@media (max-width: 760px) {
  .run__row {
    grid-template-columns: minmax(0, 1fr) auto auto;
    gap: 6px 10px;
  }

  .run__row .num:not(.cost),
  .run__row .chev {
    display: none;
  }

  .found {
    grid-column: 1 / -1;
  }
}
</style>
