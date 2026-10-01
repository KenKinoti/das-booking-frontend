<template>
  <div data-testid="market">
    <div class="bar">
      <p class="lead">
        Public data for your markets — Kenya and Australia — with East African Community peers (Uganda, Tanzania, Rwanda) for regional opportunity.
        <template v-if="d">Source: <a :href="d.source_url" target="_blank" rel="noopener">{{ d.source }}</a>, cached for 24 hours.</template>
      </p>
      <div class="actions">
        <button class="ui-btn ui-btn--sm" type="button" :disabled="loading" data-testid="market-refresh" @click="load(true)"><i class="fa-solid fa-rotate" :class="{ 'fa-spin': loading }"></i> Refresh</button>
        <button class="ui-btn ui-btn--sm" type="button" data-testid="add-indicator" @click="openAdd"><i class="fa-solid fa-plus"></i> Indicator</button>
        <button class="ui-btn ui-btn--sm" type="button" data-testid="upload-dataset" @click="openUpload"><i class="fa-solid fa-file-arrow-up"></i> Your data (CSV)</button>
        <button v-if="d && d.ai_enabled" class="ui-btn ui-btn--sm ui-btn--primary" type="button" :disabled="ai.loading" data-testid="explain-ai" @click="explain"><i :class="ai.loading ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-wand-magic-sparkles'"></i> Explain with AI</button>
      </div>
    </div>

    <div v-if="error" class="ui-alert ui-alert--danger mb"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load(false)">Try again</a></span></div>

    <section v-if="ai.text || ai.error" class="ui-card mb ai" data-testid="ai-panel">
      <div class="ui-card__head">
        <h2><i class="fa-solid fa-wand-magic-sparkles"></i> What this means for your business (AI)</h2>
        <button class="ui-btn ui-btn--icon ui-btn--ghost ui-btn--sm" type="button" aria-label="Close" @click="ai = { loading: false, text: '', error: '' }"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="ui-card__body">
        <p v-if="ai.error" class="err">{{ ai.error }}</p>
        <div v-else class="ai-text">{{ ai.text }}</div>
        <small class="muted">Generated from the figures on this page — check before acting.</small>
      </div>
    </section>

    <div v-if="d && d.highlights.length" class="hl mb">
      <div v-for="(h, i) in d.highlights" :key="i" class="hl__item"><i class="fa-solid fa-bolt"></i> {{ h }}</div>
    </div>

    <div class="legend mb" aria-label="Countries">
      <span v-for="c in COUNTRIES" :key="c.code"><i class="dviz-swatch dviz-swatch--line" :style="{ background: c.color }"></i>{{ c.name }}</span>
    </div>

    <div v-if="!d" class="grid">
      <div v-for="i in 6" :key="i" class="ui-card"><div class="ui-card__body"><div class="ui-skeleton" style="height: 220px"></div></div></div>
    </div>
    <div v-else class="grid">
      <article v-for="c in d.indicators" :key="c.code + (c.custom_id || '')" class="ui-card ind" :data-indicator="c.code">
        <div class="ind__head">
          <div class="min0">
            <h3>{{ c.title }}</h3>
            <span class="unit">{{ c.short || c.name }}</span>
          </div>
          <button v-if="c.custom" class="ui-btn ui-btn--icon ui-btn--ghost ui-btn--sm" type="button" :aria-label="'Remove ' + c.title" @click="removeIndicator(c)"><i class="fa-regular fa-trash-can"></i></button>
        </div>
        <div v-if="c.error && !c.countries.length" class="ind__err"><i class="fa-solid fa-cloud-exclamation"></i> {{ c.error }}</div>
        <template v-else>
          <MultiLine
            :xs="years(c)"
            :series="lineSeries(c)"
            :height="110"
            :format-y="(v) => short(v, c.unit)"
            :format-value="(v) => full(v, c.unit)"
            :aria-label="c.title + ', five-year trend'"
          />
          <table class="vals">
            <tbody>
              <tr v-for="s in c.countries" :key="s.country" :data-country="s.country">
                <td><i class="dviz-swatch" :style="{ background: colorOf(s.country) }"></i>{{ s.name }}</td>
                <td class="num"><strong>{{ s.latest == null ? '—' : full(s.latest, c.unit) }}</strong><small v-if="s.latest_year">{{ s.latest_year }}</small></td>
                <td class="num chg" :class="chgClass(s, c)">{{ change(s) }}</td>
              </tr>
            </tbody>
          </table>
          <p v-if="c.note" class="note">{{ c.note }}</p>
          <p v-if="c.stale || (c.error && c.countries.length)" class="warn"><i class="fa-solid fa-triangle-exclamation"></i> {{ c.error }}</p>
        </template>
        <footer class="src">
          <a :href="c.source_url" target="_blank" rel="noopener">{{ c.source }} · {{ c.code }}</a>
          <span v-if="c.last_updated">updated {{ c.last_updated }}</span>
          <span v-if="c.fetched_at">fetched {{ ago(c.fetched_at) }}<template v-if="c.cached"> (cached)</template></span>
        </footer>
      </article>
    </div>

    <section v-if="d && d.fx.length" class="ui-card mb">
      <div class="ui-card__head">
        <div>
          <h2>Exchange rates</h2>
          <span class="sub">Live rate from the ERP's exchange-rate service; yearly averages from the World Bank (PA.NUS.FCRF, cross rates via USD)</span>
        </div>
        <router-link to="/invoices/settings" class="ui-btn ui-btn--ghost ui-btn--sm">Manual rates</router-link>
      </div>
      <div class="ui-card__body fx">
        <div v-for="f in d.fx" :key="f.pair" class="fx__item" :data-pair="f.pair">
          <div class="fx__top">
            <strong>{{ f.pair }}</strong>
            <span class="big">{{ f.live == null ? '—' : num(f.live, 4) }}</span>
          </div>
          <small class="muted">1 {{ f.base }} in {{ f.quote }} · {{ f.live_source || 'no live rate' }}</small>
          <MultiLine
            v-if="f.annual.length > 1"
            :xs="f.annual.map((p) => p.year)"
            :series="[{ key: f.pair, name: f.pair + ' (yearly average)', values: f.annual.map((p) => p.value), color: 'var(--viz-1)', strong: true }]"
            :height="80"
            :format-y="(v) => num(v, v < 10 ? 2 : 0)"
            :format-value="(v) => num(v, 4)"
            :aria-label="f.pair + ' yearly average'"
          />
          <p class="note">{{ f.note }} <template v-if="f.yoy_pct != null">Last year: {{ f.yoy_pct > 0 ? '+' : '' }}{{ f.yoy_pct }}%.</template></p>
        </div>
      </div>
    </section>

    <section class="ui-card mb">
      <div class="ui-card__head">
        <div>
          <h2>Your datasets</h2>
          <span class="sub">Series you uploaded (e.g. KENIC .ke domain registrations, Communications Authority of Kenya sector statistics) with their source</span>
        </div>
        <button class="ui-btn ui-btn--sm" type="button" @click="openUpload"><i class="fa-solid fa-file-arrow-up"></i> Upload CSV</button>
      </div>
      <div v-if="d && !d.datasets.length" class="ui-empty small">
        <div class="ui-empty__icon"><i class="fa-solid fa-table-list"></i></div>
        <h3>No datasets yet</h3>
        <p>Upload a CSV with two columns — period (2024, 2024-03 or 2024-Q1) and value — and say where it comes from.</p>
      </div>
      <div v-else-if="d" class="grid ds">
        <article v-for="s in d.datasets" :key="s.id" class="ind ds__item" :data-dataset="s.name">
          <div class="ind__head">
            <div class="min0">
              <h3>{{ s.name }}</h3>
              <span class="unit">{{ [s.unit, s.country].filter(Boolean).join(' · ') }}</span>
            </div>
            <button class="ui-btn ui-btn--icon ui-btn--ghost ui-btn--sm" type="button" :aria-label="'Delete ' + s.name" @click="removeDataset(s)"><i class="fa-regular fa-trash-can"></i></button>
          </div>
          <MultiLine
            :xs="s.points.map((p) => p.period)"
            :series="[{ key: s.id, name: s.name, values: s.points.map((p) => p.value), color: 'var(--viz-7)', strong: true }]"
            :height="110"
            :format-y="(v) => short(v, 'number')"
            :format-value="(v) => num(v, 2)"
            :aria-label="s.name"
          />
          <p class="note">
            Latest {{ s.points[s.points.length - 1].period }}: <strong>{{ num(s.points[s.points.length - 1].value, 2) }}</strong>
            <template v-if="s.points.length > 1"> ({{ dsChange(s) }} vs {{ s.points[s.points.length - 2].period }})</template>
          </p>
          <footer class="src">
            <a v-if="s.source_url" :href="s.source_url" target="_blank" rel="noopener">{{ s.source }}</a>
            <span v-else>{{ s.source }}</span>
            <span>uploaded {{ ago(s.created_at) }}</span>
          </footer>
        </article>
      </div>
    </section>

    <!-- Add indicator -->
    <div v-if="add" class="ui-modal-backdrop" @mousedown.self="add = null">
      <form class="ui-modal" role="dialog" aria-modal="true" aria-labelledby="add-title" @submit.prevent="saveIndicator">
        <div class="ui-modal__head">
          <h2 id="add-title">Follow a World Bank indicator</h2>
          <button class="ui-btn ui-btn--icon ui-btn--ghost" type="button" aria-label="Close" @click="add = null"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="ui-modal__body">
          <div class="ui-field">
            <label for="ind-code">Indicator code</label>
            <input id="ind-code" v-model.trim="add.code" class="ui-input" placeholder="e.g. IT.NET.BBND.P2" required />
            <span class="ui-hint">Find codes on <a href="https://data.worldbank.org/indicator" target="_blank" rel="noopener">data.worldbank.org/indicator</a> (the code is in the page address).</span>
          </div>
          <div class="ui-field">
            <label for="ind-country">Country</label>
            <input id="ind-country" v-model.trim="add.country" class="ui-input" placeholder="KEN, AUS, UGA …" maxlength="3" required />
          </div>
          <div class="ui-field">
            <label for="ind-label">Label (optional)</label>
            <input id="ind-label" v-model="add.label" class="ui-input" placeholder="Fixed broadband, Kenya" maxlength="160" />
          </div>
          <div v-if="addError" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ addError }}</span></div>
        </div>
        <div class="ui-modal__foot">
          <button class="ui-btn" type="button" @click="add = null">Cancel</button>
          <button class="ui-btn ui-btn--primary" type="submit" data-testid="save-indicator" :disabled="saving"><i v-if="saving" class="fa-solid fa-spinner fa-spin"></i> Add</button>
        </div>
      </form>
    </div>

    <!-- Upload dataset -->
    <div v-if="up" class="ui-modal-backdrop" @mousedown.self="up = null">
      <form class="ui-modal" style="max-width: 640px" role="dialog" aria-modal="true" aria-labelledby="up-title" @submit.prevent="saveDataset">
        <div class="ui-modal__head">
          <h2 id="up-title">Upload a data series</h2>
          <button class="ui-btn ui-btn--icon ui-btn--ghost" type="button" aria-label="Close" @click="up = null"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="ui-modal__body">
          <p class="ui-hint">
            Two columns: <code>period,value</code> — period as 2024, 2024-03, 2024-Q1 or 2024-03-31. A header row and thousands separators are fine. Sector reports
            published as PDF (e.g. CA Kenya quarterly statistics) can be typed into a spreadsheet and saved as CSV.
          </p>
          <div class="ui-field">
            <label for="ds-name">Name</label>
            <input id="ds-name" v-model.trim="up.name" class="ui-input" placeholder=".ke domain registrations" required maxlength="160" />
          </div>
          <div class="row2">
            <div class="ui-field">
              <label for="ds-unit">Unit</label>
              <input id="ds-unit" v-model.trim="up.unit" class="ui-input" placeholder="domains" maxlength="60" />
            </div>
            <div class="ui-field">
              <label for="ds-country">Country</label>
              <input id="ds-country" v-model.trim="up.country" class="ui-input" placeholder="KEN" maxlength="3" />
            </div>
          </div>
          <div class="ui-field">
            <label for="ds-source">Source</label>
            <input id="ds-source" v-model.trim="up.source" class="ui-input" placeholder="KENIC annual report 2025" required maxlength="255" />
          </div>
          <div class="ui-field">
            <label for="ds-url">Source link (optional)</label>
            <input id="ds-url" v-model.trim="up.source_url" type="url" class="ui-input" placeholder="https://…" maxlength="500" />
          </div>
          <div class="ui-field">
            <label for="ds-file">CSV file</label>
            <input id="ds-file" ref="file" type="file" accept=".csv,text/csv,.txt" class="ui-input" data-testid="dataset-file" required />
          </div>
          <div v-if="upError" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ upError }}</span></div>
        </div>
        <div class="ui-modal__foot">
          <button class="ui-btn" type="button" @click="up = null">Cancel</button>
          <button class="ui-btn ui-btn--primary" type="submit" data-testid="save-dataset" :disabled="saving"><i v-if="saving" class="fa-solid fa-spinner fa-spin"></i> Upload</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import MultiLine from './MultiLine.vue'
import { insightsApi } from '@/services/insights'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'
import { timeAgo } from '@/components/dashboard/analytics'
import { num } from '@/components/analytics/fmt'

const COUNTRIES = [
  { code: 'KEN', name: 'Kenya', color: 'var(--viz-1)' },
  { code: 'AUS', name: 'Australia', color: 'var(--viz-2)' },
  { code: 'UGA', name: 'Uganda', color: 'var(--viz-3)' },
  { code: 'TZA', name: 'Tanzania', color: 'var(--viz-4)' },
  { code: 'RWA', name: 'Rwanda', color: 'var(--viz-5)' }
]

export default {
  name: 'MarketIndicators',
  components: { MultiLine },
  data() {
    return { d: null, loading: false, error: '', ai: { loading: false, text: '', error: '' }, add: null, addError: '', up: null, upError: '', saving: false, COUNTRIES }
  },
  created() {
    this.load(false)
  },
  methods: {
    num,
    ago: timeAgo,
    async load(refresh) {
      this.loading = true
      try {
        this.d = await insightsApi.market(refresh)
        this.error = ''
        if (refresh) toast.success('Indicators refreshed')
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load market indicators.')
      } finally {
        this.loading = false
      }
    },
    colorOf(c) {
      return (COUNTRIES.find((x) => x.code === c) || {}).color || 'var(--viz-7)'
    },
    years(c) {
      // The shared x-axis: the last six years up to the most recent value of any country.
      const ys = new Set()
      c.countries.forEach((s) => s.trend.forEach((p) => ys.add(p.year)))
      const max = Math.max(...ys)
      return [...ys].filter((y) => y > max - 6).sort((a, b) => a - b)
    },
    lineSeries(c) {
      const ys = this.years(c)
      return c.countries.map((s) => ({
        key: s.country,
        name: s.name,
        color: this.colorOf(s.country),
        strong: s.country === 'KEN' || s.country === 'AUS',
        values: ys.map((y) => {
          const p = s.trend.find((t) => t.year === y)
          return p && p.value != null ? p.value : null
        })
      }))
    },
    short(v, unit) {
      const n = Number(v) || 0
      if (unit === 'pct') return `${n.toFixed(Math.abs(n) < 10 ? 1 : 0)}%`
      return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(n)
    },
    full(v, unit) {
      const n = Number(v) || 0
      if (unit === 'pct') return `${n.toFixed(1)}%`
      if (unit === 'number') return new Intl.NumberFormat(undefined, { maximumFractionDigits: n < 100 ? 2 : 0 }).format(n)
      return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n)
    },
    change(s) {
      if (s.change == null) return ''
      const v = Number(s.change)
      return `${v > 0 ? '+' : ''}${v.toFixed(1)}${s.change_unit === 'pts' ? ' pts' : '%'}`
    },
    chgClass(s, c) {
      if (s.change == null || s.change === 0 || c.custom || c.code === 'PA.NUS.FCRF') return ''
      const good = c.code === 'FP.CPI.TOTL.ZG' ? s.change < 0 : s.change > 0
      return good ? 'good' : 'bad'
    },
    dsChange(s) {
      const a = s.points[s.points.length - 2].value
      const b = s.points[s.points.length - 1].value
      if (!a) return '—'
      const p = ((b - a) / Math.abs(a)) * 100
      return `${p > 0 ? '+' : ''}${p.toFixed(1)}%`
    },
    async explain() {
      this.ai = { loading: true, text: '', error: '' }
      try {
        const r = await insightsApi.explain()
        this.ai = { loading: false, text: r.text, error: '' }
      } catch (e) {
        this.ai = { loading: false, text: '', error: apiErrorMessage(e, 'The AI explanation is not available right now.') }
      }
    },
    openAdd() {
      this.add = { code: '', country: 'KEN', label: '' }
      this.addError = ''
    },
    async saveIndicator() {
      this.saving = true
      this.addError = ''
      try {
        await insightsApi.addIndicator({ code: this.add.code, country: this.add.country, label: this.add.label })
        toast.success('Indicator added')
        this.add = null
        this.load(false)
      } catch (e) {
        this.addError = apiErrorMessage(e, 'Could not add the indicator')
      } finally {
        this.saving = false
      }
    },
    async removeIndicator(c) {
      if (!(await confirmDialog({ title: `Stop following ${c.title}?`, message: 'It will be removed from this page.', confirmText: 'Remove', danger: true }))) return
      try {
        await insightsApi.removeIndicator(c.custom_id)
        toast.success('Indicator removed')
        this.load(false)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not remove the indicator'))
      }
    },
    openUpload() {
      this.up = { name: '', unit: '', country: 'KEN', source: '', source_url: '' }
      this.upError = ''
    },
    async saveDataset() {
      const f = this.$refs.file?.files?.[0]
      if (!f) {
        this.upError = 'Choose a CSV file'
        return
      }
      const form = new FormData()
      Object.entries(this.up).forEach(([k, v]) => form.append(k, v || ''))
      form.append('file', f)
      this.saving = true
      this.upError = ''
      try {
        const r = await insightsApi.uploadDataset(form)
        const w = r.warnings || []
        toast.success(`${r.dataset.points.length} values saved${w.length ? ` · ${w.length} row${w.length === 1 ? '' : 's'} skipped` : ''}`)
        this.up = null
        this.load(false)
      } catch (e) {
        this.upError = apiErrorMessage(e, 'Could not upload the dataset')
      } finally {
        this.saving = false
      }
    },
    async removeDataset(s) {
      if (!(await confirmDialog({ title: `Delete “${s.name}”?`, message: 'The uploaded values will be deleted.', confirmText: 'Delete', danger: true }))) return
      try {
        await insightsApi.removeDataset(s.id)
        toast.success('Dataset deleted')
        this.load(false)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not delete the dataset'))
      }
    }
  }
}
</script>

<style scoped>
.mb {
  margin-bottom: 16px;
}

.bar {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

.lead {
  margin: 0;
  font-size: 13px;
  color: var(--text-2);
  max-width: 720px;
}

.actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.hl {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 10px;
}

.hl__item {
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  background: var(--accent-soft);
  font-size: 13px;
  color: var(--text);
}

.hl__item i {
  color: var(--accent);
  margin-right: 4px;
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  font-size: 12px;
  color: var(--text-2);
}

.legend span {
  display: inline-flex;
  align-items: center;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 14px;
  margin-bottom: 16px;
}

.ind {
  min-width: 0;
  padding: 14px 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ds .ds__item {
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.ds {
  padding: 0 16px 16px;
}

.ind__head {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.min0 {
  min-width: 0;
  flex: 1;
}

.ind h3 {
  margin: 0;
  font-size: 14.5px;
}

.unit {
  font-size: 11.5px;
  color: var(--text-3);
}

.ind__err {
  padding: 24px 8px;
  text-align: center;
  font-size: 12.5px;
  color: var(--text-3);
}

.vals {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
}

.vals td {
  padding: 4px 0;
  border-top: 1px solid var(--border);
}

.vals .num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.vals strong {
  font-weight: 650;
}

.vals small {
  color: var(--text-3);
  margin-left: 4px;
  font-size: 10.5px;
}

.chg {
  width: 70px;
  color: var(--text-3);
}

.good {
  color: var(--success);
}

.bad {
  color: var(--danger);
}

.note {
  margin: 0;
  font-size: 12.5px;
  color: var(--text-2);
  line-height: 1.5;
}

.warn {
  margin: 0;
  font-size: 12px;
  color: var(--warning);
}

.src {
  margin-top: auto;
  display: flex;
  flex-wrap: wrap;
  gap: 2px 10px;
  font-size: 11px;
  color: var(--text-3);
}

.src a {
  color: var(--text-2);
}

.fx {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}

.fx__top {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.big {
  font-size: 20px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.sub {
  display: block;
  font-size: 12px;
  color: var(--text-3);
  margin-top: 2px;
}

.muted {
  color: var(--text-3);
}

.ai-text {
  white-space: pre-wrap;
  font-size: 13.5px;
  line-height: 1.6;
  margin-bottom: 8px;
}

.err {
  color: var(--danger);
}

.row2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

code {
  background: var(--bg-subtle);
  padding: 1px 5px;
  border-radius: 4px;
}

@media (max-width: 520px) {
  .grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .ds {
    padding: 0 10px 10px;
  }
}
</style>
