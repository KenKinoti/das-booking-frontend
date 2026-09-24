<template>
  <div class="ui-page ui-page--wide">
    <header class="ui-page-head">
      <div>
        <div class="ui-eyebrow">Platform admin</div>
        <h1>Plans &amp; pricing</h1>
        <p>Fine-tune module prices, tier rules, industry bundles and exchange rates. Prices are set in USD.</p>
      </div>
      <div class="ui-actions">
        <button class="ui-btn" :disabled="loading" @click="load"><i class="fa-solid fa-rotate"></i> Reload</button>
        <button v-if="tab !== 'orgs'" class="ui-btn ui-btn--primary" :disabled="!dirty || saving" @click="save">
          <i :class="saving ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-floppy-disk'"></i> Save changes
        </button>
      </div>
    </header>

    <div v-if="error" class="ui-alert ui-alert--danger">
      <i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span>
    </div>

    <div class="ui-kpis" v-if="catalog">
      <div class="ui-kpi">
        <div class="ui-kpi__label"><span class="ui-kpi__icon"><i class="fa-solid fa-building"></i></span>Organisations</div>
        <div class="ui-kpi__value">{{ orgs.length }}</div>
        <div class="ui-kpi__meta">{{ tierCounts }}</div>
      </div>
      <div class="ui-kpi">
        <div class="ui-kpi__label"><span class="ui-kpi__icon k-success"><i class="fa-solid fa-sack-dollar"></i></span>Monthly recurring</div>
        <div class="ui-kpi__value">{{ usd(mrr) }}</div>
        <div class="ui-kpi__meta">USD, active &amp; past-due plans</div>
      </div>
      <div class="ui-kpi">
        <div class="ui-kpi__label"><span class="ui-kpi__icon k-info"><i class="fa-solid fa-hourglass-half"></i></span>On trial</div>
        <div class="ui-kpi__value">{{ orgs.filter((o) => o.plan?.status === 'trial').length }}</div>
        <div class="ui-kpi__meta">{{ orgs.filter((o) => o.plan?.grandfathered).length }} legacy full-access</div>
      </div>
      <div class="ui-kpi">
        <div class="ui-kpi__label"><span class="ui-kpi__icon k-warning"><i class="fa-solid fa-coins"></i></span>Exchange rates</div>
        <div class="ui-kpi__value">{{ catalog.fx_rates.filter((r) => r.source === 'live').length }}<small class="of"> live</small></div>
        <div class="ui-kpi__meta">{{ catalog.live_fx_as_of ? `Updated ${formatDateTime(catalog.live_fx_as_of)}` : 'Using reference rates' }}</div>
      </div>
    </div>

    <section class="ui-card">
      <div class="ui-card__head toolbar">
        <div class="ui-tabs" role="tablist">
          <button v-for="t in tabs" :key="t.key" class="ui-tab" :class="{ 'is-active': tab === t.key }" role="tab" :aria-selected="tab === t.key" @click="tab = t.key">
            <i :class="t.icon"></i>{{ t.label }}<span v-if="dirtyTabs[t.key]" class="dot" aria-label="unsaved"></span>
          </button>
        </div>
        <div v-if="tab === 'orgs'" class="ui-input-group search">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input v-model="q" class="ui-input" placeholder="Search organisations…" aria-label="Search organisations" />
        </div>
        <button v-if="tab === 'industries'" class="ui-btn ui-btn--sm" @click="addIndustry"><i class="fa-solid fa-plus"></i> Add industry</button>
      </div>

      <div v-if="loading && !catalog" class="ui-card__body"><div class="ui-skeleton" style="height: 320px"></div></div>

      <template v-else-if="catalog">
        <!-- Modules -->
        <div v-if="tab === 'modules'" class="ui-table-wrap">
          <table class="ui-table">
            <thead>
              <tr>
                <th>Module</th>
                <th>Description</th>
                <th class="num">Price / month (USD)</th>
                <th>Active</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="m in edit.modules" :key="m.key">
                <td>
                  <div class="mod-name">
                    <span class="mod-icon"><i :class="m.icon"></i></span>
                    <div>
                      <input v-model.trim="m.name" class="ui-input ui-input--sm" :aria-label="`${m.key} name`" />
                      <code>{{ m.key }}</code>
                    </div>
                  </div>
                </td>
                <td><textarea v-model="m.description" class="ui-textarea ui-input--sm" rows="2" :aria-label="`${m.key} description`"></textarea></td>
                <td class="num">
                  <span v-if="m.core" class="ui-badge ui-badge--draft">Always included</span>
                  <input v-else v-model.number="m.monthly_price_usd" type="number" min="0" step="0.5" class="ui-input ui-input--sm price-in" :aria-label="`${m.key} price`" />
                </td>
                <td>
                  <label class="ui-switch"><input type="checkbox" v-model="m.active" :disabled="m.core" /><span>{{ m.active ? 'On' : 'Off' }}</span></label>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Tiers -->
        <div v-else-if="tab === 'tiers'" class="ui-card__body tiers">
          <div v-for="t in edit.tiers" :key="t.key" class="tier-edit">
            <div class="tier-edit__head">
              <span class="tier-icon"><i :class="tierIcon(t.key)"></i></span>
              <div class="ui-field grow"><label>Name</label><input v-model.trim="t.name" class="ui-input" /></div>
              <code>{{ t.key }}</code>
            </div>
            <div class="ui-field"><label>Tagline</label><input v-model="t.tagline" class="ui-input" /></div>
            <div class="fgrid">
              <div class="ui-field"><label>Base price (USD / month)</label><input v-model.number="t.base_price_usd" type="number" min="0" step="1" class="ui-input" /></div>
              <div class="ui-field"><label>Max systems</label><input v-model.number="t.max_modules" type="number" min="0" step="1" class="ui-input" /><span class="ui-hint">0 = unlimited (core not counted)</span></div>
              <div class="ui-field"><label>Max users</label><input v-model.number="t.max_users" type="number" min="0" step="1" class="ui-input" /><span class="ui-hint">0 = unlimited</span></div>
              <div class="ui-field"><label>Add-on discount %</label><input v-model.number="t.addon_discount_pct" type="number" min="0" max="100" step="1" class="ui-input" /></div>
              <div class="ui-field"><label>Annual discount %</label><input v-model.number="t.annual_discount_pct" type="number" min="0" max="100" step="1" class="ui-input" /></div>
              <div class="ui-field"><label>Trial days</label><input v-model.number="t.trial_days" type="number" min="0" step="1" class="ui-input" /></div>
            </div>
            <div class="switches">
              <label class="ui-switch"><input type="checkbox" v-model="t.includes_industry_bundle" /><span>Includes industry bundle</span></label>
              <label class="ui-switch"><input type="checkbox" v-model="t.includes_all_modules" /><span>Includes all modules</span></label>
              <label class="ui-switch"><input type="checkbox" v-model="t.enterprise" /><span>Enterprise / custom pricing</span></label>
            </div>
            <div class="ui-field">
              <label>Highlights (one per line)</label>
              <textarea class="ui-textarea" rows="4" :value="(t.features || []).join('\n')" @input="t.features = $event.target.value.split('\n')"></textarea>
            </div>
            <p class="ui-hint rule">{{ ruleSummary(t) }}</p>
          </div>
        </div>

        <!-- Industries -->
        <div v-else-if="tab === 'industries'" class="ui-table-wrap">
          <table class="ui-table">
            <thead>
              <tr>
                <th>Industry</th>
                <th>Recommended bundle</th>
                <th>Tier</th>
                <th>Active</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="ind in edit.industries" :key="ind._uid">
                <td>
                  <div class="ind-cell">
                  <input v-model.trim="ind.name" class="ui-input ui-input--sm" placeholder="Name" :aria-label="`Industry name`" />
                  <input v-if="ind._new" v-model.trim="ind.key" class="ui-input ui-input--sm" placeholder="key (e.g. agriculture)" aria-label="Industry key" />
                  <code v-else>{{ ind.key }}</code>
                  <input v-model="ind.description" class="ui-input ui-input--sm" placeholder="Short description" aria-label="Industry description" />
                </div>
                </td>
                <td>
                  <div class="toggles">
                    <button
                      v-for="m in sellable"
                      :key="m.key"
                      type="button"
                      class="tog"
                      :class="{ on: ind.modules.includes(m.key) }"
                      :aria-pressed="ind.modules.includes(m.key)"
                      @click="toggleBundle(ind, m.key)"
                    >
                      <i :class="m.icon"></i>{{ m.name }}
                    </button>
                  </div>
                  <span class="ui-hint">{{ ind.modules.length }} modules · list value {{ usd(bundleValue(ind)) }}/mo</span>
                </td>
                <td>
                  <select v-model="ind.recommended_tier" class="ui-select ui-input--sm tier-sel" aria-label="Recommended tier">
                    <option v-for="t in edit.tiers" :key="t.key" :value="t.key">{{ t.name }}</option>
                  </select>
                </td>
                <td><label class="ui-switch"><input type="checkbox" v-model="ind.active" /><span>{{ ind.active ? 'On' : 'Off' }}</span></label></td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- FX -->
        <div v-else-if="tab === 'fx'" class="ui-table-wrap">
          <table class="ui-table">
            <thead>
              <tr>
                <th>Currency</th>
                <th class="num">Live rate</th>
                <th class="num">Reference rate (per 1 USD)</th>
                <th>In use</th>
                <th class="num">SME base price</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in edit.fx_rates" :key="r.currency">
                <td><strong>{{ r.currency }}</strong> <span class="muted">{{ currencyName(r.currency) }}</span></td>
                <td class="num">{{ r.live_rate ? r.live_rate : '—' }}</td>
                <td class="num">
                  <span v-if="r.currency === 'USD'">1</span>
                  <input v-else v-model.number="r.fallback_rate" type="number" min="0" step="any" class="ui-input ui-input--sm price-in" :aria-label="`${r.currency} rate`" />
                </td>
                <td><span class="ui-badge" :class="r.source === 'live' ? 'ui-badge--success' : 'ui-badge--draft'">{{ r.source === 'live' ? 'Live' : r.currency === 'USD' ? 'Base' : 'Reference' }}</span></td>
                <td class="num">{{ smePreview(r) }}</td>
              </tr>
            </tbody>
          </table>
          <p class="ui-hint fx-hint">Live rates come from the ECB (Frankfurter) and ExchangeRate-API and refresh every 30 minutes. Reference rates are used whenever a live rate is unavailable.</p>
        </div>

        <!-- Organisations -->
        <div v-else-if="tab === 'orgs'">
          <div v-if="!filteredOrgs.length" class="ui-empty">
            <div class="ui-empty__icon"><i class="fa-solid fa-building"></i></div>
            <h3>No organisations found</h3>
            <p>{{ q ? 'Try a different search.' : 'Organisations appear here once they sign up.' }}</p>
          </div>
          <div v-else class="ui-table-wrap">
            <table class="ui-table">
              <thead>
                <tr>
                  <th>Organisation</th>
                  <th>Plan</th>
                  <th>Industry</th>
                  <th>Status</th>
                  <th class="num">Price</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="o in filteredOrgs" :key="o.id" class="is-clickable" @click="openOrg(o)">
                  <td><strong>{{ o.name }}</strong><div class="muted small">{{ o.business_type }}</div></td>
                  <td>
                    <template v-if="o.plan">{{ tierName(o.plan.tier) }}<span v-if="o.plan.grandfathered" class="muted small"> · legacy</span></template>
                    <span v-else class="muted">Not set yet (full access)</span>
                  </td>
                  <td>{{ o.plan ? industryName(o.plan.industry) : '—' }}</td>
                  <td><span v-if="o.plan" class="ui-badge" :class="statusBadge(o.plan.status)">{{ statusLabel(o.plan.status) }}</span></td>
                  <td class="num">{{ o.plan ? money(o.plan.price, o.plan.currency) : '—' }}<div v-if="o.plan" class="muted small">{{ o.plan.cycle }}</div></td>
                  <td class="num"><button class="ui-btn ui-btn--sm" @click.stop="openOrg(o)">Set plan</button></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>
    </section>

    <!-- Org plan editor -->
    <div v-if="org.open" class="ui-modal-backdrop" @mousedown.self="org.open = false">
      <div class="ui-modal" style="max-width: 820px" role="dialog" aria-modal="true" aria-labelledby="org-plan-title">
        <div class="ui-modal__head">
          <h2 id="org-plan-title">Plan for {{ org.name }}</h2>
          <button class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="org.open = false"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="ui-modal__body">
          <div v-if="org.loading" class="ui-skeleton" style="height: 240px"></div>
          <template v-else>
            <div class="fgrid">
              <div class="ui-field">
                <label for="o-tier">Tier</label>
                <select id="o-tier" v-model="org.form.tier" class="ui-select">
                  <option v-for="t in catalog.tiers" :key="t.key" :value="t.key">{{ t.name }}</option>
                </select>
              </div>
              <div class="ui-field">
                <label for="o-ind">Industry</label>
                <select id="o-ind" v-model="org.form.industry" class="ui-select">
                  <option v-for="i in catalog.industries" :key="i.key" :value="i.key">{{ i.name }}</option>
                </select>
              </div>
              <div class="ui-field">
                <label for="o-status">Status</label>
                <select id="o-status" v-model="org.form.status" class="ui-select">
                  <option value="trial">Trial</option>
                  <option value="active">Active</option>
                  <option value="past_due">Past due</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div class="ui-field">
                <label for="o-cycle">Billing cycle</label>
                <select id="o-cycle" v-model="org.form.cycle" class="ui-select">
                  <option value="monthly">Monthly</option>
                  <option value="annual">Annual</option>
                </select>
              </div>
              <div class="ui-field">
                <label for="o-cur">Currency</label>
                <select id="o-cur" v-model="org.form.currency" class="ui-select">
                  <optgroup v-for="g in currencyGroups" :key="g.region" :label="g.region">
                    <option v-for="c in g.items" :key="c.code" :value="c.code">{{ c.code }} — {{ c.name }}</option>
                  </optgroup>
                </select>
              </div>
              <div class="ui-field" v-if="org.form.status === 'trial'">
                <label for="o-trial">Trial ends</label>
                <input id="o-trial" v-model="org.form.trial_ends" type="date" class="ui-input" />
              </div>
              <div class="ui-field">
                <label for="o-custom">Custom price (USD / month)</label>
                <input id="o-custom" v-model="org.form.custom_price" type="number" min="0" step="1" class="ui-input" placeholder="List price" />
                <span class="ui-hint">Leave empty for list price</span>
              </div>
              <div class="ui-field">
                <label for="o-users">Max users override</label>
                <input id="o-users" v-model="org.form.max_users" type="number" min="0" step="1" class="ui-input" :placeholder="`Tier default (${orgTier.max_users || 'unlimited'})`" />
                <span class="ui-hint">Empty = tier default · 0 = unlimited</span>
              </div>
            </div>

            <div v-if="!orgTier.includes_all_modules" class="ui-field">
              <label>{{ orgTier.includes_industry_bundle ? 'Add-on modules' : `Systems (up to ${orgTier.max_modules || 'any'})` }}</label>
              <div class="toggles">
                <button
                  v-for="m in sellable"
                  :key="m.key"
                  type="button"
                  class="tog"
                  :class="{ on: org.form.modules.includes(m.key) || orgBundle.includes(m.key), locked: orgBundle.includes(m.key) }"
                  :disabled="orgBundle.includes(m.key)"
                  @click="toggleOrgModule(m.key)"
                >
                  <i :class="m.icon"></i>{{ m.name }}<small v-if="orgBundle.includes(m.key)"> · bundle</small>
                </button>
              </div>
            </div>
            <p v-else class="ui-hint">{{ orgTier.name }} includes every module.</p>

            <div class="ui-field">
              <label for="o-notes">Internal notes</label>
              <textarea id="o-notes" v-model="org.form.notes" class="ui-textarea" rows="2"></textarea>
            </div>

            <div class="org-quote">
              <div v-if="org.quoteError" class="ui-alert ui-alert--warning"><i class="fa-solid fa-triangle-exclamation"></i><span>{{ org.quoteError }}</span></div>
              <template v-else-if="org.quote">
                <span>List price</span>
                <strong>{{ money(org.quote.total, org.quote.currency, org.quote.decimals) }}</strong>
                <span class="muted">{{ org.quote.cycle === 'annual' ? 'per year' : 'per month' }}<template v-if="org.form.custom_price !== '' && org.form.custom_price !== null"> · custom {{ usd(org.form.custom_price) }}/mo applies</template></span>
              </template>
            </div>
          </template>
        </div>
        <div class="ui-modal__foot">
          <button class="ui-btn" @click="org.open = false">Cancel</button>
          <button class="ui-btn ui-btn--primary" :disabled="org.saving || org.loading || !!org.quoteError" @click="saveOrg">
            <i :class="org.saving ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-check'"></i> Save plan
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { apiErrorMessage } from '@/services/api'
import { plansAPI, planMoney, TIER_ICONS, STATUS_LABELS } from '@/services/plans'
import { CURRENCIES, currencyGroups } from '@/utils/currencies'
import { formatDateTime } from '@/utils/format'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'

let uid = 0
const clone = (v) => JSON.parse(JSON.stringify(v))

export default {
  name: 'SuperAdminPlans',
  data() {
    return {
      loading: false,
      saving: false,
      error: '',
      catalog: null,
      edit: { modules: [], tiers: [], industries: [], fx_rates: [] },
      original: '',
      orgs: [],
      q: '',
      tab: 'modules',
      tabs: [
        { key: 'modules', label: 'Modules', icon: 'fa-solid fa-puzzle-piece' },
        { key: 'tiers', label: 'Tiers', icon: 'fa-solid fa-layer-group' },
        { key: 'industries', label: 'Industries', icon: 'fa-solid fa-industry' },
        { key: 'fx', label: 'Exchange rates', icon: 'fa-solid fa-coins' },
        { key: 'orgs', label: 'Organisations', icon: 'fa-solid fa-building' }
      ],
      currencyGroups: currencyGroups(),
      org: { open: false, id: '', name: '', loading: false, saving: false, form: null, quote: null, quoteError: '', timer: null }
    }
  },
  computed: {
    snapshots() {
      return {
        modules: JSON.stringify(this.edit.modules),
        tiers: JSON.stringify(this.edit.tiers),
        industries: JSON.stringify(this.edit.industries),
        fx: JSON.stringify(this.edit.fx_rates.map((r) => [r.currency, r.fallback_rate]))
      }
    },
    dirtyTabs() {
      if (!this.original) return {}
      const o = JSON.parse(this.original)
      const s = this.snapshots
      return { modules: o.modules !== s.modules, tiers: o.tiers !== s.tiers, industries: o.industries !== s.industries, fx: o.fx !== s.fx }
    },
    dirty() {
      return Object.values(this.dirtyTabs).some(Boolean)
    },
    sellable() {
      return this.edit.modules.filter((m) => !m.core)
    },
    filteredOrgs() {
      const q = this.q.trim().toLowerCase()
      return q ? this.orgs.filter((o) => `${o.name} ${o.business_type} ${o.plan?.tier || ''}`.toLowerCase().includes(q)) : this.orgs
    },
    mrr() {
      return this.orgs.reduce((sum, o) => {
        const p = o.plan
        if (!p || !['active', 'past_due'].includes(p.status)) return sum
        return sum + (Number(p.price_usd) || 0)
      }, 0)
    },
    tierCounts() {
      const c = {}
      for (const o of this.orgs) {
        const t = o.plan?.tier || 'unset'
        c[t] = (c[t] || 0) + 1
      }
      return Object.entries(c)
        .map(([k, n]) => `${n} ${k === 'unset' ? 'not set' : this.tierName(k)}`)
        .join(' · ')
    },
    orgTier() {
      return (this.catalog?.tiers || []).find((t) => t.key === this.org.form?.tier) || {}
    },
    orgBundle() {
      if (!this.orgTier.includes_industry_bundle) return []
      return (this.catalog?.industries || []).find((i) => i.key === this.org.form?.industry)?.modules || []
    },
    orgQuoteKey() {
      const f = this.org.form
      return this.org.open && f ? JSON.stringify([f.tier, f.industry, [...f.modules].sort(), f.cycle, f.currency]) : ''
    }
  },
  watch: {
    orgQuoteKey(v) {
      if (!v) return
      clearTimeout(this.org.timer)
      this.org.timer = setTimeout(this.quoteOrg, 250)
    }
  },
  created() {
    this.load()
  },
  beforeRouteLeave() {
    if (!this.dirty) return true
    return confirmDialog({ title: 'Discard changes?', message: 'You have unsaved pricing changes.', confirmText: 'Discard', danger: true })
  },
  methods: {
    formatDateTime,
    usd(v) {
      return planMoney(v, 'USD', 2)
    },
    money(v, code, dec) {
      // Minor units as in pkg/currency: JPY/UGX 0, KWD 3, others 2
      const d = dec ?? ({ JPY: 0, UGX: 0, KWD: 3 }[code] ?? 2)
      return planMoney(v, code || 'USD', d)
    },
    tierIcon(k) {
      return TIER_ICONS[k] || 'fa-solid fa-layer-group'
    },
    tierName(k) {
      return (this.catalog?.tiers || []).find((t) => t.key === k)?.name || k
    },
    industryName(k) {
      return (this.catalog?.industries || []).find((i) => i.key === k)?.name || k
    },
    currencyName(code) {
      return CURRENCIES.find((c) => c.code === code)?.name || ''
    },
    statusBadge(s) {
      return STATUS_LABELS[s]?.badge || 'ui-badge--draft'
    },
    statusLabel(s) {
      return STATUS_LABELS[s]?.label || s
    },
    ruleSummary(t) {
      if (t.includes_all_modules) return `Every module for ${this.usd(t.base_price_usd)}/mo${t.enterprise ? ', custom pricing available' : ''}.`
      if (t.includes_industry_bundle)
        return `${this.usd(t.base_price_usd)}/mo includes the industry bundle; extra modules at ${t.addon_discount_pct || 0}% off list price.`
      return `${this.usd(t.base_price_usd)}/mo base + list price of each chosen system${t.max_modules ? `, up to ${t.max_modules}` : ''}.`
    },
    bundleValue(ind) {
      return ind.modules.reduce((s, k) => s + (Number(this.edit.modules.find((m) => m.key === k)?.monthly_price_usd) || 0), 0)
    },
    smePreview(r) {
      const sme = this.edit.tiers.find((t) => t.key === 'sme')
      const rate = r.currency === 'USD' ? 1 : r.source === 'live' && r.live_rate ? r.live_rate : Number(r.fallback_rate) || 0
      if (!sme || !rate) return '—'
      return this.money(Math.round(sme.base_price_usd * rate), r.currency)
    },
    async load() {
      if (this.dirty && !(await confirmDialog({ title: 'Discard changes?', message: 'Reloading will discard your unsaved changes.', confirmText: 'Reload', danger: true }))) return
      this.loading = true
      this.error = ''
      try {
        const [cat, orgs] = await Promise.all([plansAPI.adminCatalog(), plansAPI.adminOrganizations()])
        this.setCatalog(cat)
        this.orgs = Array.isArray(orgs) ? orgs : []
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load the plan catalogue')
      } finally {
        this.loading = false
      }
    },
    setCatalog(cat) {
      this.catalog = cat
      this.edit = {
        modules: clone(cat.modules || []),
        tiers: clone(cat.tiers || []).map((t) => ({ ...t, features: t.features || [] })),
        industries: clone(cat.industries || []).map((i) => ({ ...i, modules: i.modules || [], _uid: ++uid })),
        fx_rates: clone(cat.fx_rates || [])
      }
      this.$nextTick(() => {
        this.original = JSON.stringify(this.snapshots)
      })
    },
    addIndustry() {
      this.edit.industries.push({ _uid: ++uid, _new: true, key: '', name: '', description: '', icon: 'fa-solid fa-building', modules: [], recommended_tier: 'sme', active: true, sort_order: this.edit.industries.length + 1 })
    },
    toggleBundle(ind, key) {
      const i = ind.modules.indexOf(key)
      if (i >= 0) ind.modules.splice(i, 1)
      else ind.modules.push(key)
    },
    async save() {
      const d = this.dirtyTabs
      const payload = {}
      if (d.modules) payload.modules = this.edit.modules
      if (d.tiers) payload.tiers = this.edit.tiers.map((t) => ({ ...t, features: (t.features || []).map((f) => f.trim()).filter(Boolean) }))
      if (d.industries) payload.industries = this.edit.industries.map(({ _uid, _new, ...rest }) => rest) // eslint-disable-line no-unused-vars
      if (d.fx) payload.fx_rates = this.edit.fx_rates.filter((r) => r.currency !== 'USD').map((r) => ({ currency: r.currency, rate_per_usd: Number(r.fallback_rate) }))
      this.saving = true
      try {
        const cat = await plansAPI.adminSaveCatalog(payload)
        this.setCatalog(cat)
        toast.success('Pricing saved — new quotes use it immediately')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not save pricing'))
      } finally {
        this.saving = false
      }
    },
    async openOrg(o) {
      this.org = { open: true, id: o.id, name: o.name, loading: true, saving: false, form: null, quote: null, quoteError: '', timer: null }
      try {
        const p = await plansAPI.adminOrgPlan(o.id)
        const s = p.subscription || {}
        this.org.form = {
          tier: s.tier,
          industry: s.industry,
          modules: [...(s.modules || [])],
          cycle: s.cycle || 'monthly',
          currency: s.currency || 'USD',
          status: s.status || 'active',
          trial_ends: s.trial_ends_at ? String(s.trial_ends_at).slice(0, 10) : '',
          custom_price: s.custom_price_usd ?? '',
          max_users: s.max_users_override ?? '',
          notes: s.notes || ''
        }
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not load the organisation plan'))
        this.org.open = false
      } finally {
        this.org.loading = false
      }
    },
    toggleOrgModule(k) {
      const m = this.org.form.modules
      const i = m.indexOf(k)
      if (i >= 0) m.splice(i, 1)
      else m.push(k)
    },
    async quoteOrg() {
      const f = this.org.form
      if (!f) return
      const modules = this.orgTier.includes_all_modules ? [] : f.modules.filter((m) => !this.orgBundle.includes(m))
      try {
        const res = await plansAPI.quote({ tier: f.tier, industry: f.industry, modules, cycle: f.cycle, currency: f.currency })
        this.org.quote = res.quote
        this.org.quoteError = ''
      } catch (e) {
        this.org.quote = null
        this.org.quoteError = apiErrorMessage(e, 'This selection is not valid')
      }
    },
    async saveOrg() {
      const f = this.org.form
      const payload = {
        tier: f.tier,
        industry: f.industry,
        modules: this.orgTier.includes_all_modules ? [] : f.modules.filter((m) => !this.orgBundle.includes(m)),
        cycle: f.cycle,
        currency: f.currency,
        status: f.status,
        notes: f.notes
      }
      if (f.custom_price === '' || f.custom_price === null) payload.clear_custom_price = true
      else payload.custom_price_usd = Number(f.custom_price)
      if (f.max_users === '' || f.max_users === null) payload.clear_max_users = true
      else payload.max_users_override = Number(f.max_users)
      if (f.status === 'trial' && f.trial_ends) payload.trial_ends_at = new Date(`${f.trial_ends}T23:59:59Z`).toISOString()
      this.org.saving = true
      try {
        await plansAPI.adminSetOrgPlan(this.org.id, payload)
        toast.success(`Plan updated for ${this.org.name}`)
        this.org.open = false
        this.orgs = await plansAPI.adminOrganizations()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not save the plan'))
      } finally {
        this.org.saving = false
      }
    }
  }
}
</script>

<style scoped>
.toolbar {
  gap: 12px;
  flex-wrap: wrap;
}

.search {
  max-width: 320px;
  flex: 1;
}

.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--warning);
  display: inline-block;
}

.of {
  font-size: 14px;
  color: var(--text-3);
  font-weight: 500;
}

.muted {
  color: var(--text-3);
}

.small {
  font-size: 12px;
}

.ui-input--sm {
  height: 32px;
  font-size: 13px;
  padding-top: 4px;
  padding-bottom: 4px;
}

textarea.ui-input--sm {
  height: auto;
  min-width: 220px;
}

.price-in {
  width: 120px;
  text-align: right;
  margin-left: auto;
  font-variant-numeric: tabular-nums;
}

.mod-name {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-width: 200px;
}

.mod-name > div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mod-icon,
.tier-icon {
  width: 32px;
  height: 32px;
  border-radius: 9px;
  display: grid;
  place-items: center;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 13px;
  flex-shrink: 0;
}

code {
  font-size: 11.5px;
  color: var(--text-3);
}

.tiers {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.tier-edit {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--surface-2);
}

.tier-edit__head {
  display: flex;
  align-items: flex-end;
  gap: 10px;
}

.tier-edit__head .tier-icon {
  margin-bottom: 4px;
}

.tier-edit__head code {
  margin-bottom: 10px;
}

.grow {
  flex: 1;
  margin: 0;
}

.fgrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 10px 12px;
}

.fgrid .ui-field {
  margin: 0;
}

.switches {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rule {
  margin: 0;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  background: var(--bg-subtle);
}

.ind-cell {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 220px;
}

.tier-sel {
  min-width: 110px;
}

.toggles {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 4px;
  min-width: 280px;
}

.tog {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 9px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-2);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

.tog i {
  font-size: 10.5px;
}

.tog.on {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--text);
}

.tog.on i {
  color: var(--accent);
}

.tog.locked {
  cursor: default;
  opacity: 0.85;
}

.tog small {
  color: var(--text-3);
}

.fx-hint {
  padding: 12px 16px;
  margin: 0;
}

.org-quote {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
  padding: 12px 14px;
  border-radius: var(--radius-sm);
  background: var(--bg-subtle);
  border: 1px solid var(--border);
}

.org-quote .ui-alert {
  margin: 0;
  width: 100%;
}

.org-quote strong {
  font-size: 20px;
  font-variant-numeric: tabular-nums;
}

@media (max-width: 1100px) {
  .tiers {
    grid-template-columns: 1fr;
  }
}
</style>
