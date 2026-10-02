<template>
  <section class="ui-card retail" data-testid="retail-helper">
    <div class="ui-card__head">
      <h2><i class="fa-solid fa-tag head-ic"></i> Retail price</h2>
      <span v-if="option" class="muted" data-testid="retail-for">for {{ optionName }}<template v-if="tld"> · {{ tld }}</template></span>
    </div>
    <div class="ui-card__body">
      <div v-if="!option" class="ui-empty small">
        <div class="ui-empty__icon"><i class="fa-solid fa-hand-pointer"></i></div>
        <h3>Pick an option to price</h3>
        <p>Choose one of the options above and set your margin here.</p>
      </div>
      <template v-else>
        <div class="controls">
          <div class="fgroup">
            <span class="ui-label">Target</span>
            <div class="inline">
              <div class="seg" role="group" aria-label="Margin or markup">
                <button type="button" :class="{ on: form.mode === 'margin' }" :aria-pressed="form.mode === 'margin'" data-mode="margin" title="Profit as a share of the price before tax" @click="form.mode = 'margin'">Margin</button>
                <button type="button" :class="{ on: form.mode === 'markup' }" :aria-pressed="form.mode === 'markup'" data-mode="markup" title="Profit as a share of the cost" @click="form.mode = 'markup'">Markup</button>
              </div>
              <label class="pct"><input v-model.number="form.percent" class="ui-input tiny" type="number" min="0" max="1000" step="1" aria-label="Target percent" data-testid="retail-percent" /> %</label>
            </div>
          </div>
          <label class="ui-field basis">
            <span class="ui-label">Cost to price on</span>
            <select v-model="form.basis" class="ui-select" data-testid="retail-basis">
              <option value="higher">The dearer year (safest)</option>
              <option value="first_year">First year</option>
              <option value="ongoing">A renewal year</option>
            </select>
          </label>
          <div v-if="result" class="cost" data-testid="retail-cost" :data-value="result.cost_home">
            <span class="ui-label">Your cost</span>
            <strong>{{ cur(result.cost_home, home) }} <small>/ year</small></strong>
            <small class="muted">{{ result.basis_used === 'first_year' ? 'first year' : 'renewal year' }}</small>
          </div>
        </div>

        <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>
        <div v-for="(w, i) in result?.warnings || []" :key="i" class="ui-alert ui-alert--warning"><i class="fa-solid fa-triangle-exclamation"></i><span>{{ w }}</span></div>

        <div class="markets">
          <div v-for="(m, i) in form.markets" :key="i" class="mk" :data-market="m.currency">
            <header>
              <div>
                <strong>{{ i === 0 ? 'Home market' : 'Second market' }}</strong>
                <select v-if="i > 0" v-model="m.currency" class="ui-select curpick" aria-label="Currency" @change="onCurrency(m)">
                  <optgroup v-for="g in groups" :key="g.region" :label="g.region">
                    <option v-for="c in g.items" :key="c.code" :value="c.code" :disabled="c.code === home">{{ c.code }}</option>
                  </optgroup>
                </select>
                <span v-else class="ui-badge ui-badge--info">{{ m.currency }}</span>
              </div>
              <label v-if="i > 0" class="ui-switch"><input v-model="m.on" type="checkbox" /> <span>Show</span></label>
            </header>
            <template v-if="m.on">
              <div class="mk__inputs">
                <label class="ui-field">
                  <span class="ui-label">{{ i === 0 ? context.tax_label || 'Tax' : 'Tax' }} %</span>
                  <input v-model.number="m.tax_rate" class="ui-input" type="number" min="0" max="100" step="0.5" :data-testid="'tax-' + i" />
                </label>
                <label class="ui-field">
                  <span class="ui-label">Prices quoted</span>
                  <select v-model="m.prices_include_tax" class="ui-select" :data-testid="'incl-' + i">
                    <option :value="false">Excluding tax</option>
                    <option :value="true">Including tax</option>
                  </select>
                </label>
                <label class="ui-field">
                  <span class="ui-label">Payment fee %</span>
                  <input v-model.number="m.fee_percent" class="ui-input" type="number" min="0" max="50" step="0.1" :data-testid="'fee-' + i" />
                </label>
                <label class="ui-field">
                  <span class="ui-label">Round to</span>
                  <select v-model="m.rounding" class="ui-select" :data-testid="'round-' + i">
                    <option value="friendly">A friendly price</option>
                    <option value="step">A multiple of…</option>
                    <option value="none">Don't round</option>
                  </select>
                </label>
                <label v-if="m.rounding === 'step'" class="ui-field">
                  <span class="ui-label">Multiple</span>
                  <input v-model.number="m.step" class="ui-input" type="number" min="0" step="any" placeholder="e.g. 50" />
                </label>
              </div>
              <p class="ui-hint feehint">{{ feeHint(m) }}</p>

              <div v-if="!priceOf(m)" class="ui-skeleton" style="height: 150px"></div>
              <div v-else-if="priceOf(m).error" class="ui-alert ui-alert--warning"><i class="fa-solid fa-triangle-exclamation"></i><span>{{ priceOf(m).error }}</span></div>
              <div v-else class="mk__out">
                <div class="prices">
                  <div class="price">
                    <span class="lbl">Yearly price</span>
                    <strong data-testid="retail-yearly" :data-value="priceOf(m).yearly.price">{{ cur(priceOf(m).yearly.price, m.currency) }}</strong>
                    <small>{{ taxNote(m, priceOf(m).yearly) }}</small>
                  </div>
                  <div v-if="priceOf(m).monthly" class="price">
                    <span class="lbl">Or monthly</span>
                    <strong data-testid="retail-monthly" :data-value="priceOf(m).monthly.price">{{ cur(priceOf(m).monthly.price, m.currency) }}</strong>
                    <small>{{ cur(priceOf(m).monthly.price * 12, m.currency) }} a year · margin {{ pct(priceOf(m).monthly.margin_pct) }}</small>
                  </div>
                </div>
                <dl class="rows">
                  <dt>Price before tax</dt>
                  <dd>{{ cur(priceOf(m).yearly.net, m.currency) }}</dd>
                  <dt>Cost</dt>
                  <dd data-testid="retail-market-cost" :data-value="priceOf(m).cost">− {{ cur(priceOf(m).yearly.cost, m.currency) }}</dd>
                  <dt>Payment fee</dt>
                  <dd data-testid="retail-fee" :data-value="priceOf(m).yearly.fee">− {{ cur(priceOf(m).yearly.fee, m.currency) }}</dd>
                  <dt class="strong">Your margin</dt>
                  <dd class="strong" :class="priceOf(m).yearly.profit < 0 ? 'txt-danger' : 'txt-ok'" data-testid="retail-profit" :data-value="priceOf(m).yearly.profit" :data-margin="priceOf(m).yearly.margin_pct">
                    {{ cur(priceOf(m).yearly.profit, m.currency) }} · {{ pct(priceOf(m).yearly.margin_pct) }}
                    <small v-if="m.currency !== home" class="block muted">≈ {{ cur(priceOf(m).yearly.profit_home, home) }}</small>
                    <small class="block muted">markup {{ pct(priceOf(m).yearly.markup_pct) }} on cost</small>
                  </dd>
                </dl>
                <div class="sens" data-testid="retail-sensitivity">
                  <i class="fa-solid fa-arrows-up-down"></i>
                  <span v-if="priceOf(m).moving_cost > 0">
                    If exchange rates move {{ result.shock }}%, the margin becomes
                    <template v-for="(s, si) in priceOf(m).sensitivity" :key="s.shock_pct">
                      <template v-if="si"> or </template>
                      <b :class="s.margin_pct < 0 ? 'txt-danger' : ''" :data-shock="s.shock_pct" :data-margin="s.margin_pct">{{ pct(s.margin_pct) }}</b> ({{ s.shock_pct > 0 ? 'costs up' : 'costs down' }})
                    </template>
                    <small class="block muted">{{ cur(priceOf(m).moving_cost, m.currency) }} of the cost is paid in another currency.</small>
                  </span>
                  <span v-else>The whole cost is in {{ m.currency }}: exchange rates do not move this margin.</span>
                </div>
                <ul v-if="priceOf(m).positions.length" class="pos" data-testid="retail-position">
                  <li v-for="p in priceOf(m).positions" :key="p.basis" :data-where="p.where" :data-basis="p.basis">
                    <span class="ui-badge" :class="posTone(p)">{{ posLabel(p) }}</span>
                    <span>{{ p.text }} <small class="muted">({{ ordinal(p.rank) }} cheapest of {{ p.of }})</small></span>
                  </li>
                </ul>
                <p v-else class="muted nopos">Add competitors' prices to see where this sits in the market.</p>
              </div>
            </template>
          </div>
        </div>

        <div class="acts">
          <button type="button" class="ui-btn ui-btn--primary" :disabled="!canSaveService" data-testid="save-service" @click="openServices"><i class="fa-solid fa-bell-concierge"></i> Save as service</button>
          <button type="button" class="ui-btn" :disabled="!result" data-testid="save-scenario" @click="openScenario"><i class="fa-regular fa-bookmark"></i> Save comparison</button>
          <span class="muted">Services go to your catalog with the price, the currency and a note of what they cost you.</span>
        </div>
      </template>
    </div>

    <!-- Save as service -->
    <div v-if="svc" class="ui-modal-backdrop" @mousedown.self="svc = null">
      <form class="ui-modal" style="max-width: 640px" role="dialog" aria-modal="true" aria-labelledby="svc-title" data-testid="service-modal" @submit.prevent="saveServices">
        <div class="ui-modal__head">
          <div>
            <div class="ui-eyebrow">Catalog</div>
            <h2 id="svc-title">Save as service</h2>
          </div>
          <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="svc = null"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="ui-modal__body">
          <div v-if="svc.error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ svc.error }}</span></div>
          <div v-for="(s, i) in svc.rows" :key="i" class="svcrow" :class="{ off: !s.on }">
            <label class="ui-switch"><input v-model="s.on" type="checkbox" :data-testid="'svc-on-' + i" /> <span class="sr">Save</span></label>
            <label class="ui-field grow">
              <span class="ui-label">Name</span>
              <input v-model.trim="s.name" class="ui-input" :disabled="!s.on" :data-testid="'svc-name-' + i" />
            </label>
            <label class="ui-field svcprice">
              <span class="ui-label">Price ({{ s.currency }}{{ s.price_includes_tax ? ', incl. tax' : '' }})</span>
              <input v-model.number="s.price" class="ui-input" type="number" min="0" step="any" :disabled="!s.on" :data-testid="'svc-price-' + i" />
            </label>
          </div>
          <label class="ui-field">
            <span class="ui-label">Category</span>
            <input v-model.trim="svc.category" class="ui-input" placeholder="Hosting & domains" />
          </label>
          <p class="ui-hint">A service with the same name in this category is updated instead of added twice. Cost note: {{ svc.note }}</p>
        </div>
        <div class="ui-modal__foot">
          <button type="button" class="ui-btn" @click="svc = null">Cancel</button>
          <button type="submit" class="ui-btn ui-btn--primary" :disabled="svc.busy || !svc.rows.some((r) => r.on)" data-testid="svc-save">Save {{ svc.rows.filter((r) => r.on).length || '' }} service{{ svc.rows.filter((r) => r.on).length === 1 ? '' : 's' }}</button>
        </div>
      </form>
    </div>

    <!-- Save comparison -->
    <div v-if="scn" class="ui-modal-backdrop" @mousedown.self="scn = null">
      <form class="ui-modal" style="max-width: 460px" role="dialog" aria-modal="true" aria-labelledby="scn-title" data-testid="scenario-modal" @submit.prevent="saveScenario">
        <div class="ui-modal__head">
          <h2 id="scn-title">Save this comparison</h2>
          <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="scn = null"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="ui-modal__body">
          <label class="ui-field">
            <span class="ui-label">Name</span>
            <input v-model.trim="scn.name" class="ui-input" maxlength="160" data-testid="scenario-name" />
            <span class="ui-hint">Saving under an existing name replaces it. The inputs and today's numbers are kept.</span>
          </label>
        </div>
        <div class="ui-modal__foot">
          <button type="button" class="ui-btn" @click="scn = null">Cancel</button>
          <button type="submit" class="ui-btn ui-btn--primary" :disabled="!scn.name" data-testid="scenario-save">Save</button>
        </div>
      </form>
    </div>
  </section>
</template>

<script>
import { pricebookApi, cur, serviceName } from '@/services/pricebook'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { currencyGroups } from '@/utils/currencies'

export default {
  name: 'RetailHelper',
  props: {
    compareInput: { type: Object, required: true },
    tld: { type: String, default: '' },
    optionKey: { type: String, default: '' },
    option: { type: Object, default: null },
    context: { type: Object, default: () => ({}) },
    home: { type: String, default: 'AUD' },
    tiers: { type: Array, default: () => [] },
    preset: { type: Object, default: null },
    today: { type: String, default: '' }
  },
  emits: ['priced', 'save-scenario', 'services-saved'],
  data() {
    return {
      form: { mode: 'margin', percent: 35, basis: 'higher', markets: [] },
      result: null,
      error: '',
      timer: null,
      seq: 0,
      svc: null,
      scn: null,
      groups: currencyGroups()
    }
  },
  computed: {
    retailInput() {
      return {
        mode: this.form.mode,
        percent: Number(this.form.percent) || 0,
        basis: this.form.basis,
        markets: this.form.markets
          .filter((m) => m.on && m.currency)
          .map((m) => ({
            currency: m.currency,
            tax_rate: Number(m.tax_rate) || 0,
            prices_include_tax: !!m.prices_include_tax,
            fee_percent: Number(m.fee_percent) || 0,
            fee_fixed: Number(m.fee_fixed) || 0,
            rounding: m.rounding,
            step: Number(m.step) || 0
          }))
      }
    },
    request() {
      if (!this.option || !this.form.markets.length) return null
      return { compare: this.compareInput, tld: this.tld, key: this.optionKey, retail: this.retailInput }
    },
    canSaveService() {
      return !!this.result && this.result.markets.some((m) => m.yearly)
    },
    optionName() {
      const o = this.option
      return o ? (String(o.key).startsWith('mix') ? o.label : o.supplier_name) : ''
    },
    tierLabel() {
      return this.tiers.find((t) => t.key === this.compareInput.tier)?.label || ''
    }
  },
  watch: {
    context: {
      immediate: true,
      handler(c) {
        if (c && c.home && !this.form.markets.length) this.initMarkets()
      }
    },
    preset(p) {
      if (p) this.applyPreset(p)
    },
    request: {
      deep: true,
      handler() {
        this.schedule()
      }
    }
  },
  mounted() {
    if (this.preset) this.applyPreset(this.preset)
    this.schedule()
  },
  beforeUnmount() {
    clearTimeout(this.timer)
  },
  methods: {
    cur,
    market(currency, home) {
      const fee = this.context.fees?.[currency]
      return {
        currency,
        on: true,
        tax_rate: home ? Number(this.context.tax_rate) || 0 : 0,
        prices_include_tax: home ? !!this.context.prices_include_tax : false,
        fee_percent: fee ? Math.round(fee.percent * 100) / 100 : 0,
        fee_fixed: fee ? fee.fixed || 0 : 0,
        rounding: 'friendly',
        step: 0
      }
    },
    initMarkets() {
      const m = [this.market(this.context.home, true)]
      if (this.context.second_currency && this.context.second_currency !== this.context.home) m.push(this.market(this.context.second_currency, false))
      this.form.markets = m
    },
    applyPreset(p) {
      this.form.mode = p.mode === 'markup' ? 'markup' : 'margin'
      this.form.percent = Number(p.percent) || 0
      this.form.basis = ['first_year', 'ongoing'].includes(p.basis) ? p.basis : 'higher'
      if (Array.isArray(p.markets) && p.markets.length) {
        this.form.markets = p.markets.map((x) => ({ on: true, fee_fixed: 0, step: 0, rounding: 'friendly', ...x }))
      }
    },
    onCurrency(m) {
      const fee = this.context.fees?.[m.currency]
      m.fee_percent = fee ? Math.round(fee.percent * 100) / 100 : 0
      m.fee_fixed = fee ? fee.fixed || 0 : 0
    },
    feeHint(m) {
      const fee = this.context.fees?.[m.currency]
      if (fee && Math.abs(fee.percent - m.fee_percent) < 0.005) return `${fee.label} · from your payment settings`
      return 'Charged on what the customer pays (tax included). Set it to what your payment provider takes.'
    },
    priceOf(m) {
      return this.result?.markets.find((x) => x.market.currency === m.currency) || null
    },
    pct(v) {
      return `${(Number(v) || 0).toFixed(1)}%`
    },
    taxNote(m, p) {
      if (!(m.tax_rate > 0)) return 'no tax'
      return m.prices_include_tax ? `includes ${cur(p.tax, m.currency)} tax` : `+ ${cur(p.tax, m.currency)} tax = ${cur(p.gross, m.currency)}`
    },
    posLabel(p) {
      return { cheapest: 'Cheapest', below_median: 'Below median', above_median: 'Above median', most_expensive: 'Most expensive' }[p.where] || ''
    },
    posTone(p) {
      return { cheapest: 'ui-badge--success', below_median: 'ui-badge--success', above_median: 'ui-badge--warning', most_expensive: 'ui-badge--danger' }[p.where] || 'ui-badge--draft'
    },
    ordinal(n) {
      const s = ['th', 'st', 'nd', 'rd']
      const v = n % 100
      return n + (s[(v - 20) % 10] || s[v] || s[0])
    },
    schedule() {
      clearTimeout(this.timer)
      this.timer = setTimeout(() => this.load(), 250)
    },
    async load() {
      const req = this.request
      if (!req) {
        this.result = null
        this.$emit('priced', null)
        return
      }
      const seq = ++this.seq
      try {
        const r = await pricebookApi.retail(JSON.parse(JSON.stringify(req)))
        if (seq !== this.seq) return
        this.result = r
        this.error = ''
        this.$emit('priced', { result: r, input: this.retailInput })
      } catch (e) {
        if (seq !== this.seq) return
        this.result = null
        this.error = apiErrorMessage(e, 'Could not work out the retail price')
        this.$emit('priced', null)
      }
    },
    openServices() {
      const rows = []
      const base = { tierLabel: this.tierLabel, minDiskGb: this.compareInput.min_disk_gb, tld: this.tld, noHosting: this.compareInput.no_hosting }
      this.result.markets.forEach((m, i) => {
        if (!m.yearly) return
        const suffix = i > 0 ? m.market.currency : ''
        rows.push({ on: true, name: serviceName({ ...base, period: 'yearly', suffix }), price: m.yearly.price, currency: m.market.currency, price_includes_tax: m.market.prices_include_tax, margin: m.yearly.margin_pct })
        if (m.monthly) rows.push({ on: false, name: serviceName({ ...base, period: 'monthly', suffix }), price: m.monthly.price, currency: m.market.currency, price_includes_tax: m.market.prices_include_tax, margin: m.monthly.margin_pct })
      })
      this.svc = { rows, category: 'Hosting & domains', busy: false, error: '', note: this.result.cost_note }
    },
    async saveServices() {
      const s = this.svc
      const list = s.rows
        .filter((r) => r.on)
        .map((r) => ({
          name: r.name,
          price: Number(r.price) || 0,
          currency: r.currency,
          price_includes_tax: r.price_includes_tax,
          category: s.category,
          description: `${this.result.cost_note} · margin ${this.pct(r.margin)} · priced ${this.today || new Date().toISOString().slice(0, 10)} from ${this.optionName}`
        }))
      if (list.some((r) => !r.name)) {
        s.error = 'Give every service a name.'
        return
      }
      s.busy = true
      s.error = ''
      try {
        const r = await pricebookApi.saveServices(list)
        const made = r.services || []
        const created = made.filter((x) => x.action === 'created').length
        toast.success(`${made.length} service${made.length === 1 ? '' : 's'} saved${created < made.length ? ` (${made.length - created} updated)` : ''} — find them under Services`)
        this.svc = null
        this.$emit('services-saved', made)
      } catch (e) {
        s.error = apiErrorMessage(e, 'Could not save the services')
      } finally {
        s.busy = false
      }
    },
    openScenario() {
      const base = { tierLabel: this.tierLabel, minDiskGb: this.compareInput.min_disk_gb, tld: this.tld, noHosting: this.compareInput.no_hosting }
      const name = serviceName({ ...base, period: this.compareInput.term_years === 2 ? '2 years' : '1 year' })
      this.scn = { name }
    },
    saveScenario() {
      this.$emit('save-scenario', { name: this.scn.name, retail: this.retailInput, result: this.result })
      this.scn = null
    }
  }
}
</script>

<style scoped>
.head-ic {
  color: var(--accent);
  margin-right: 4px;
}
.muted {
  color: var(--text-3);
  font-size: 12.5px;
}
.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 14px 24px;
  align-items: flex-start;
  margin-bottom: 14px;
}
.fgroup {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.inline {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}
.pct {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  color: var(--text-2);
}
.tiny {
  width: 84px;
  padding: 5px 8px;
  min-height: 0;
}
.basis {
  min-width: 210px;
}
.cost {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-left: auto;
  text-align: right;
}
.cost strong {
  font-size: 18px;
  font-variant-numeric: tabular-nums;
}
.cost strong small {
  font-size: 12px;
  font-weight: 400;
  color: var(--text-3);
}
.seg {
  display: inline-flex;
  align-self: flex-start;
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
.markets {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 14px;
  align-items: start;
}
.mk {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 14px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.mk header {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
}
.mk header > div {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.curpick {
  width: auto;
  padding-top: 4px;
  padding-bottom: 4px;
  min-height: 0;
}
.mk__inputs {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 10px;
}
.feehint {
  margin: -4px 0 0;
}
.mk__out {
  display: flex;
  flex-direction: column;
  gap: 12px;
  border-top: 1px solid var(--border);
  padding-top: 12px;
}
.prices {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 28px;
}
.price {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.price .lbl {
  font-size: 12px;
  color: var(--text-3);
}
.price strong {
  font-size: 24px;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}
.price small {
  color: var(--text-3);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}
.rows {
  margin: 0;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 4px 16px;
  font-size: 13.5px;
}
.rows dt {
  color: var(--text-2);
}
.rows dd {
  margin: 0;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.rows .strong {
  font-weight: 650;
  padding-top: 6px;
  border-top: 1px solid var(--border);
}
.sens {
  display: flex;
  gap: 8px;
  align-items: baseline;
  font-size: 13px;
  color: var(--text-2);
  background: var(--bg-subtle);
  border-radius: var(--radius-sm);
  padding: 8px 10px;
}
.sens > i {
  color: var(--text-3);
}
.sens b {
  font-variant-numeric: tabular-nums;
  color: var(--text);
}
.pos {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: var(--text-2);
}
.pos li {
  display: flex;
  gap: 8px;
  align-items: baseline;
}
.pos .ui-badge {
  flex-shrink: 0;
}
.nopos {
  margin: 0;
}
.acts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  align-items: center;
  margin-top: 16px;
}
.svcrow {
  display: flex;
  gap: 10px;
  align-items: flex-end;
  margin-bottom: 10px;
}
.svcrow.off {
  opacity: 0.6;
}
.svcrow .grow {
  flex: 1;
  min-width: 0;
}
.svcrow .svcprice {
  width: 170px;
}
.svcrow .ui-switch {
  padding-bottom: 8px;
}
.sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
}
.block {
  display: block;
}
.txt-ok {
  color: var(--success);
}
.txt-danger {
  color: var(--danger);
}
@media (max-width: 640px) {
  .cost {
    margin-left: 0;
    text-align: left;
  }
  .markets {
    grid-template-columns: 1fr;
  }
  .svcrow {
    flex-wrap: wrap;
  }
  .svcrow .svcprice {
    width: 100%;
  }
}
</style>
