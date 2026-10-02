<template>
  <section class="ui-card tm" data-testid="markets">
    <div class="ui-card__head">
      <div>
        <h2>Target markets</h2>
        <span class="sub">Public indicators, currency stability and what you already earn there, combined into an opportunity score you can tune</span>
      </div>
      <div class="acts">
        <button class="ui-btn ui-btn--ghost ui-btn--sm" type="button" :disabled="loading" data-testid="markets-refresh" @click="load(true)"><i class="fa-solid fa-rotate" :class="{ 'fa-spin': loading }"></i> Refresh data</button>
        <button v-if="m" class="ui-btn ui-btn--ghost ui-btn--sm" type="button" data-testid="markets-csv" @click="csv"><i class="fa-solid fa-download"></i> CSV</button>
        <button v-if="canEdit" class="ui-btn ui-btn--sm" type="button" data-testid="markets-edit" @click="openEdit"><i class="fa-solid fa-sliders"></i> Countries &amp; weights</button>
      </div>
    </div>

    <div v-if="error" class="ui-alert ui-alert--danger in"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load(false)">Try again</a></span></div>
    <div v-if="!m && !error" class="ui-card__body"><div class="ui-skeleton" style="height: 280px"></div></div>
    <template v-if="m">
      <div v-if="m.errors.length" class="ui-alert ui-alert--warning in" data-testid="markets-errors">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <span>Some World Bank data could not be loaded, so those columns are empty and left out of the score: {{ m.errors.join(' · ') }}</span>
      </div>
      <div class="ui-table-wrap">
        <table class="ui-table" data-testid="markets-table">
          <thead>
            <tr>
              <th class="rk">#</th>
              <th>Market</th>
              <th class="sc">Opportunity score</th>
              <th class="num hide-md" :title="why('NY.GDP.PCAP.CD')">GDP per capita</th>
              <th class="num hide-md" :title="why('IT.NET.USER.ZS')">Online</th>
              <th class="num hide-lg" :title="why('IC.BUS.NREG')">New businesses</th>
              <th class="num hide-lg" :title="why('NE.TRD.GNFS.ZS')">Trade / GDP</th>
              <th class="num hide-lg" :title="why('BX.GSR.CCIS.CD')">ICT exports</th>
              <th class="num hide-md" title="Standard deviation of the month-to-month change of the exchange rate against your currency">FX volatility</th>
              <th class="num">Your revenue</th>
              <th class="x"><span class="sr">Details</span></th>
            </tr>
          </thead>
          <tbody>
            <template v-for="r in m.rows" :key="r.country">
              <tr class="is-clickable" :data-market="r.country" :aria-expanded="!!open[r.country]" @click="toggle(r.country)">
                <td class="rk">{{ r.rank }}</td>
                <td>
                  <strong>{{ r.name }}</strong>
                  <span v-if="r.home" class="ui-badge ui-badge--draft">Home</span>
                  <small class="muted block">{{ r.currency }}</small>
                </td>
                <td class="sc">
                  <div class="score" :title="`${r.score} of 100 · ${r.factors} of ${m.factors.length} factors`">
                    <span class="track"><i :style="{ width: Math.max(0, Math.min(100, r.score)) + '%' }"></i></span>
                    <strong>{{ num(r.score, 1) }}</strong>
                  </div>
                </td>
                <td class="num hide-md">{{ ind(r, 'NY.GDP.PCAP.CD', 'usd') }}</td>
                <td class="num hide-md">{{ ind(r, 'IT.NET.USER.ZS', 'pct') }}</td>
                <td class="num hide-lg">{{ ind(r, 'IC.BUS.NREG', 'n') }}</td>
                <td class="num hide-lg">{{ ind(r, 'NE.TRD.GNFS.ZS', 'pct') }}</td>
                <td class="num hide-lg">{{ ind(r, 'BX.GSR.CCIS.CD', 'usd') }}</td>
                <td class="num hide-md">
                  <template v-if="r.fx_basis === 'home' || r.fx_basis === 'same'">—</template>
                  <template v-else-if="r.fx_volatility_pct != null">±{{ num(r.fx_volatility_pct, 2) }}%<small class="muted block" :title="r.fx_basis === 'monthly' ? `From ${r.fx_points} recorded monthly rates` : 'Estimated from World Bank yearly average rates'">{{ r.fx_basis === 'monthly' ? `${r.fx_points} months` : 'yearly est.' }}</small></template>
                  <template v-else>n/a</template>
                </td>
                <td class="num">{{ r.revenue ? money(r.revenue, m.currency) : '—' }}<small v-if="r.revenue" class="muted block">{{ pct(r.share_pct) }} · {{ r.clients }} client{{ r.clients === 1 ? '' : 's' }}</small></td>
                <td class="x"><i class="fa-solid" :class="open[r.country] ? 'fa-chevron-up' : 'fa-chevron-down'"></i></td>
              </tr>
              <tr v-if="open[r.country]" class="detail" :data-market-detail="r.country">
                <td :colspan="11">
                  <p class="note">{{ r.note }}</p>
                  <table class="parts">
                    <thead><tr><th>Factor</th><th>Figure</th><th>Position among these markets</th><th class="num">Weight</th><th class="num">Points</th></tr></thead>
                    <tbody>
                      <tr v-for="p in r.parts" :key="p.key" :data-part="p.key">
                        <td>{{ p.label }}</td>
                        <td>{{ p.raw }}</td>
                        <td>
                          <template v-if="p.norm != null"><span class="track sm"><i :style="{ width: Math.round(p.norm * 100) + '%' }"></i></span>{{ Math.round(p.norm * 100) }}%</template>
                          <span v-else class="muted">no data — left out</span>
                        </td>
                        <td class="num">{{ num(p.weight, p.weight % 1 ? 1 : 0) }}</td>
                        <td class="num">{{ p.norm == null ? '—' : num(p.points, 1) }}</td>
                      </tr>
                    </tbody>
                    <tfoot><tr><td colspan="4">Score</td><td class="num"><strong>{{ num(r.score, 1) }}</strong></td></tr></tfoot>
                  </table>
                  <p class="more">
                    <span v-for="i in m.indicators" :key="i.code">{{ i.title }}: <strong>{{ ind(r, i.code, i.unit === 'usd' ? 'usd' : i.unit === 'pct' ? 'pct' : 'n') }}</strong><template v-if="r.indicators[i.code]"> ({{ r.indicators[i.code].year }})</template></span>
                  </p>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
      <p class="formula"><i class="fa-solid fa-calculator"></i> {{ m.formula }}</p>
      <footer class="src">
        <a :href="m.source_url" target="_blank" rel="noopener">{{ m.source }}</a>
        <span>Revenue: {{ day(m.revenue_from) }} – {{ day(m.revenue_to) }}</span>
        <span v-if="m.custom">Custom countries / weights</span>
      </footer>
    </template>

    <!-- Countries & weights -->
    <div v-if="edit" class="ui-modal-backdrop" @mousedown.self="edit = null">
      <form class="ui-modal" style="max-width: 720px" role="dialog" aria-modal="true" aria-labelledby="tm-title" data-testid="markets-modal" @submit.prevent="save">
        <div class="ui-modal__head">
          <h2 id="tm-title">Countries &amp; weights</h2>
          <button class="ui-btn ui-btn--icon ui-btn--ghost" type="button" aria-label="Close" @click="edit = null"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="ui-modal__body">
          <h3>Countries to compare</h3>
          <div class="picked">
            <span v-for="c in edit.countries" :key="c" class="pick" :data-picked="c">
              {{ nameOf(c) }}
              <button type="button" :aria-label="'Remove ' + nameOf(c)" @click="edit.countries = edit.countries.filter((x) => x !== c)"><i class="fa-solid fa-xmark"></i></button>
            </span>
          </div>
          <div class="addc">
            <select v-model="edit.add" class="ui-select" aria-label="Add a country" data-testid="markets-add-country">
              <option value="">Add a country…</option>
              <option v-for="c in available" :key="c.iso2" :value="c.iso2">{{ c.name }} ({{ c.currency }})</option>
            </select>
            <button class="ui-btn" type="button" :disabled="!edit.add" data-testid="markets-add-btn" @click="addCountry"><i class="fa-solid fa-plus"></i> Add</button>
          </div>
          <span class="ui-hint">Between 2 and 15 countries. Scores are relative to the countries in the list.</span>

          <h3>Weights</h3>
          <p class="ui-hint">How much each factor counts. Only the proportions matter (they are rescaled to 100%).</p>
          <div class="weights">
            <div v-for="f in m.factors" :key="f.key" class="w">
              <label :for="'w-' + f.key">{{ f.label }}<small>{{ f.why }}</small></label>
              <input :id="'w-' + f.key" v-model.number="edit.weights[f.key]" class="ui-input" type="number" min="0" max="100" step="1" :data-weight="f.key" />
              <span class="share">{{ weightShare(f.key) }}</span>
            </div>
          </div>
          <div v-if="editError" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ editError }}</span></div>
        </div>
        <div class="ui-modal__foot">
          <button v-if="m.custom" class="ui-btn ui-btn--ghost" type="button" :disabled="saving" data-testid="markets-reset" @click="reset">Reset to defaults</button>
          <span class="grow"></span>
          <button class="ui-btn" type="button" @click="edit = null">Cancel</button>
          <button class="ui-btn ui-btn--primary" type="submit" :disabled="saving" data-testid="markets-save"><i v-if="saving" class="fa-solid fa-spinner fa-spin"></i> Save</button>
        </div>
      </form>
    </div>
  </section>
</template>

<script>
import { tradeApi } from '@/services/insights'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { downloadBlob } from '@/utils/format'
import { money, num, pct, day, fileStamp } from '@/components/analytics/fmt'

export default {
  name: 'TargetMarkets',
  props: { currency: { type: String, default: '' } },
  data() {
    return { m: null, canEdit: false, error: '', loading: false, open: {}, edit: null, editError: '', saving: false }
  },
  computed: {
    available() {
      return this.m.all_countries.filter((c) => !this.edit.countries.includes(c.iso2))
    }
  },
  created() {
    this.load(false)
  },
  methods: {
    money,
    num,
    pct,
    day,
    apply(r) {
      this.m = r.markets
      this.canEdit = !!r.can_edit
      this.error = ''
    },
    async load(refresh) {
      this.loading = true
      try {
        this.apply(await tradeApi.markets(refresh))
        if (refresh) toast.success('Market data refreshed')
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load the target markets.')
      } finally {
        this.loading = false
      }
    },
    why(code) {
      return ((this.m?.indicators || []).find((i) => i.code === code) || {}).why || ''
    },
    ind(r, code, kind) {
      const v = r.indicators[code]
      if (!v) return 'n/a'
      if (kind === 'pct') return `${Number(v.value).toFixed(1)}%`
      const c = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(v.value)
      return kind === 'usd' ? `US$${c}` : c
    },
    toggle(c) {
      this.open = { ...this.open, [c]: !this.open[c] }
    },
    nameOf(c) {
      return (this.m.all_countries.find((x) => x.iso2 === c) || {}).name || c
    },
    openEdit() {
      this.edit = { countries: [...this.m.countries], weights: { ...this.m.weights }, add: '' }
      this.editError = ''
    },
    addCountry() {
      if (this.edit.add && !this.edit.countries.includes(this.edit.add)) this.edit.countries.push(this.edit.add)
      this.edit.add = ''
    },
    weightShare(k) {
      const sum = Object.values(this.edit.weights).reduce((s, v) => s + (Number(v) || 0), 0)
      return sum > 0 ? `${Math.round(((Number(this.edit.weights[k]) || 0) / sum) * 100)}%` : '—'
    },
    async save() {
      this.saving = true
      this.editError = ''
      try {
        const weights = {}
        Object.entries(this.edit.weights).forEach(([k, v]) => (weights[k] = Number(v) || 0))
        this.apply(await tradeApi.saveMarkets({ countries: this.edit.countries, weights }))
        toast.success('Target markets updated')
        this.edit = null
      } catch (e) {
        this.editError = apiErrorMessage(e, 'Could not save the target markets')
      } finally {
        this.saving = false
      }
    },
    async reset() {
      this.saving = true
      try {
        this.apply(await tradeApi.resetMarkets())
        toast.success('Default countries and weights restored')
        this.edit = null
      } catch (e) {
        this.editError = apiErrorMessage(e, 'Could not reset the target markets')
      } finally {
        this.saving = false
      }
    },
    async csv() {
      try {
        downloadBlob(await tradeApi.exportCsv('markets', {}), `target_markets_${fileStamp()}.csv`)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not download the CSV'))
      }
    }
  }
}
</script>

<style scoped>
.tm {
  margin-bottom: 16px;
}

.sub {
  display: block;
  font-size: 12px;
  color: var(--text-3);
  margin-top: 2px;
}

.acts {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.in {
  margin: 0 16px 12px;
}

.muted {
  color: var(--text-3);
}

.block {
  display: block;
}

.sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}

.rk {
  width: 34px;
  color: var(--text-3);
  font-variant-numeric: tabular-nums;
}

.x {
  width: 28px;
  color: var(--text-3);
  text-align: right;
}

.sc {
  min-width: 150px;
}

.ui-table .ui-badge {
  margin-left: 6px;
}

.score {
  display: flex;
  align-items: center;
  gap: 8px;
}

.score strong {
  font-variant-numeric: tabular-nums;
  min-width: 34px;
  text-align: right;
}

/* One hue: the fill and a lighter step of it as the track. */
.track {
  display: inline-block;
  flex: 1;
  min-width: 60px;
  height: 8px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--viz-1) 16%, var(--surface));
  overflow: hidden;
}

.track i {
  display: block;
  height: 100%;
  border-radius: 4px;
  background: var(--viz-1);
}

.track.sm {
  width: 90px;
  flex: none;
  height: 6px;
  margin-right: 8px;
  vertical-align: middle;
}

.detail > td {
  background: var(--surface-2);
  padding: 12px 16px 14px;
}

.note {
  margin: 0 0 10px;
  font-size: 13px;
  color: var(--text);
  line-height: 1.5;
  max-width: 900px;
}

.parts {
  width: 100%;
  max-width: 760px;
  border-collapse: collapse;
  font-size: 12.5px;
}

.parts th {
  text-align: left;
  font-weight: 600;
  color: var(--text-3);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 4px 8px 4px 0;
}

.parts td {
  padding: 5px 8px 5px 0;
  border-top: 1px solid var(--border);
  color: var(--text-2);
}

.parts .num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.more {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 16px;
  margin: 10px 0 0;
  font-size: 12px;
  color: var(--text-3);
}

.more strong {
  color: var(--text-2);
  font-weight: 600;
}

.formula {
  margin: 0;
  padding: 12px 16px 6px;
  font-size: 12px;
  color: var(--text-3);
  line-height: 1.5;
}

.formula i {
  margin-right: 4px;
}

.src {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 14px;
  padding: 0 16px 14px;
  font-size: 11.5px;
  color: var(--text-3);
}

.src a {
  color: var(--text-2);
}

h3 {
  margin: 0 0 8px;
  font-size: 14px;
}

h3:not(:first-child) {
  margin-top: 20px;
}

.picked {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}

.pick {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 4px 3px 10px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface-2);
  font-size: 12.5px;
}

.pick button {
  border: 0;
  background: transparent;
  color: var(--text-3);
  cursor: pointer;
  width: 20px;
  height: 20px;
  border-radius: 50%;
}

.pick button:hover {
  background: var(--surface-hover);
  color: var(--text);
}

.addc {
  display: flex;
  gap: 8px;
  margin-bottom: 4px;
}

.addc .ui-select {
  flex: 1;
  min-width: 0;
}

.weights {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 10px 0 12px;
}

.w {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 84px 44px;
  gap: 10px;
  align-items: center;
}

.w label {
  font-size: 13px;
  font-weight: 600;
}

.w label small {
  display: block;
  font-weight: 400;
  color: var(--text-3);
  font-size: 12px;
}

.w .share {
  font-size: 12px;
  color: var(--text-3);
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.grow {
  flex: 1;
}

@media (max-width: 1700px) {
  .hide-lg {
    display: none;
  }
}

@media (max-width: 1000px) {
  .hide-md {
    display: none;
  }

  .sc {
    min-width: 110px;
  }
}

@media (max-width: 560px) {
  .track:not(.sm) {
    display: none;
  }

  .sc {
    min-width: 0;
  }

  .parts th:nth-child(3),
  .parts td:nth-child(3) {
    display: none;
  }
}
</style>
