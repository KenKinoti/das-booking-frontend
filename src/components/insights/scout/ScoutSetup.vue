<template>
  <form class="setup" data-testid="scout-setup" @submit.prevent="save">
    <!-- Cost & switch -->
    <section class="ui-card blk" data-testid="scout-cost">
      <div class="blk__head">
        <div>
          <h3><i class="fa-solid fa-gauge-high"></i> Cost &amp; switch</h3>
          <p class="ui-hint">
            Each scan searches the web with the platform's Anthropic API key and is paid per search
            and per token. Scans stop when the monthly budget is used up.
          </p>
        </div>
        <span
          class="ui-badge"
          :class="st.settings.enabled ? 'ui-badge--success' : ''"
          data-testid="scout-onoff"
          >{{ st.settings.enabled ? 'On' : 'Off' }}</span
        >
      </div>

      <div v-if="!st.key_ok" class="ui-alert ui-alert--warning mb" data-testid="scout-no-key">
        <i class="fa-solid fa-key"></i>
        <span>
          {{ st.key_problem || 'No Anthropic API key is saved, so the scout cannot run.' }}
          <router-link v-if="st.can_enable" to="/system-settings?tab=ai"
            >Add it in System settings → AI assistant</router-link
          >
          <template v-else>Ask a super admin to add it in System settings → AI assistant.</template>
        </span>
      </div>

      <div class="cost">
        <div class="est" data-testid="scout-estimate">
          <span class="k">Estimated cost</span>
          <strong>about {{ usd(est.monthly_usd) }} a month</strong>
          <small>
            {{
              est.daily_runs_per_month
                ? `${Math.round(est.daily_runs_per_month)} daily scans × ~${usd(est.daily_run_usd)}`
                : 'No daily scans'
            }}
            <template v-if="est.weekly_runs_per_month">
              + {{ Math.round(est.weekly_runs_per_month) }} weekly × ~{{
                usd(est.weekly_run_usd)
              }}</template
            >
            · up to {{ usd(est.monthly_worst_usd) }} with heavy searches ·
            {{ est.searches_per_month }} searches
          </small>
        </div>
        <div class="ui-field budget">
          <label for="sc-budget">Monthly budget (US$)</label>
          <input
            id="sc-budget"
            v-model.number="draft.budget"
            class="ui-input"
            type="number"
            min="1"
            max="500"
            step="1"
            :disabled="!st.can_enable"
            data-testid="scout-budget"
            @input="estimateSoon"
          />
          <span class="ui-hint">{{
            st.can_enable
              ? 'Scans stop for the rest of the month once this is spent.'
              : 'Only a super admin can change it (the platform key pays).'
          }}</span>
        </div>
        <div class="spent">
          <span class="k">Spent this month</span>
          <strong>{{ usd(st.spent_usd) }}</strong>
          <div
            class="meter"
            :class="{ full: st.budget_reached }"
            role="img"
            :aria-label="`${usd(st.spent_usd)} of ${usd(st.settings.monthly_budget_usd)}`"
          >
            <span :style="{ width: pct + '%' }"></span>
          </div>
        </div>
      </div>
      <p class="ui-hint assume">
        {{ est.assumptions }}
        <a :href="est.source" target="_blank" rel="noopener noreferrer">Prices</a>
      </p>
      <p v-if="est.capped" class="ui-hint warn">
        <i class="fa-solid fa-triangle-exclamation"></i> With heavy searches this schedule could
        cost more than the budget — the cap would then stop scans before the month ends.
      </p>

      <div class="switch-row">
        <template v-if="st.settings.enabled">
          <span class="ui-hint">
            On since {{ formatDate(st.settings.enabled_at)
            }}<template v-if="st.settings.confirmed_estimate_usd"
              >, cost confirmed at about {{ usd(st.settings.confirmed_estimate_usd) }} a
              month</template
            >.
          </span>
          <button
            v-if="st.can_edit"
            class="ui-btn"
            type="button"
            :disabled="busy"
            data-action="scout-disable"
            @click="disable"
          >
            <i class="fa-solid fa-power-off"></i> Turn off
          </button>
        </template>
        <template v-else>
          <span class="ui-hint">{{
            st.can_enable
              ? 'Nothing runs — and nothing is spent — until you turn it on and confirm the cost.'
              : 'A super admin turns the scout on after confirming the cost (the platform key pays).'
          }}</span>
          <button
            v-if="st.can_enable"
            class="ui-btn ui-btn--primary"
            type="button"
            :disabled="busy || !st.key_ok"
            data-action="scout-enable"
            @click="confirming = true"
          >
            <i class="fa-solid fa-power-off"></i> Turn on…
          </button>
        </template>
      </div>
    </section>

    <!-- Business profile -->
    <section class="ui-card blk">
      <div class="blk__head">
        <div>
          <h3><i class="fa-solid fa-building"></i> Your business</h3>
          <p class="ui-hint">
            Built from your invoices, catalogue and customers (counts only — no client names are
            sent). Edit anything; the scout matches opportunities against it.
          </p>
        </div>
        <button
          v-if="st.can_edit"
          class="ui-btn ui-btn--sm"
          type="button"
          :disabled="refreshing"
          data-action="scout-refresh-profile"
          @click="refresh"
        >
          <i class="fa-solid fa-rotate" :class="{ 'fa-spin': refreshing }"></i> Refresh from my data
        </button>
      </div>
      <div class="grid2">
        <div class="ui-field">
          <label for="sc-name">Business name</label>
          <input
            id="sc-name"
            v-model.trim="draft.profile.org_name"
            class="ui-input"
            maxlength="120"
            :disabled="!st.can_edit"
          />
        </div>
        <div class="ui-field">
          <label for="sc-type">Business type</label>
          <input
            id="sc-type"
            v-model.trim="draft.profile.business_type"
            class="ui-input"
            maxlength="80"
            placeholder="e.g. Web hosting & software company"
            :disabled="!st.can_edit"
          />
        </div>
      </div>
      <div class="ui-field">
        <label for="sc-desc">In your own words</label>
        <textarea
          id="sc-desc"
          v-model="draft.profile.description"
          class="ui-textarea"
          rows="3"
          maxlength="1500"
          :disabled="!st.can_edit"
          placeholder="What you do, for whom, and what you want more of — e.g. “Websites, hosting and maintenance for NGOs, CBOs and small businesses in Kenya and Australia; we also sell our own ERP.”"
          data-testid="scout-description"
        ></textarea>
      </div>

      <div class="ui-field">
        <label>What you sell</label>
        <div class="offers">
          <div v-for="(o, i) in draft.profile.offerings" :key="i" class="offer">
            <input
              v-model.trim="o.name"
              class="ui-input ui-input--sm name"
              maxlength="80"
              aria-label="Product or service"
              :disabled="!st.can_edit"
            />
            <input
              v-model.number="o.price"
              class="ui-input ui-input--sm price"
              type="number"
              min="0"
              step="any"
              aria-label="Typical price"
              placeholder="Price"
              :disabled="!st.can_edit"
            />
            <select
              v-model="o.currency"
              class="ui-select ui-select--sm cur"
              aria-label="Currency"
              :disabled="!st.can_edit"
            >
              <option v-for="c in currencies" :key="c" :value="c">{{ c }}</option>
            </select>
            <span class="src" :title="srcTitle(o.source)">{{ srcLabel(o.source) }}</span>
            <button
              v-if="st.can_edit"
              type="button"
              class="ui-btn ui-btn--icon ui-btn--ghost ui-btn--sm"
              :aria-label="'Remove ' + o.name"
              @click="draft.profile.offerings.splice(i, 1)"
            >
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <p v-if="!draft.profile.offerings.length" class="ui-hint">
            Nothing found in your invoices or catalogue yet — add what you sell.
          </p>
          <button
            v-if="st.can_edit"
            type="button"
            class="ui-btn ui-btn--ghost ui-btn--sm add"
            @click="addOffering"
          >
            <i class="fa-solid fa-plus"></i> Add a product or service
          </button>
        </div>
      </div>

      <div class="facts">
        <div>
          <span class="k">Where your customers are</span>
          <div class="chips">
            <span v-for="c in st.settings.profile.customer_countries" :key="c.key" class="chip"
              >{{ flag(c.key) }} {{ c.name }} · {{ c.customers }}</span
            >
            <span v-if="!st.settings.profile.customer_countries.length" class="ui-hint"
              >No customers yet</span
            >
          </div>
        </div>
        <div>
          <span class="k">Customer sectors <small>(guessed from names)</small></span>
          <div class="chips">
            <span v-for="s in st.settings.profile.customer_sectors" :key="s.key" class="chip"
              >{{ s.name }} · {{ s.customers }}</span
            >
            <span v-if="!st.settings.profile.customer_sectors.length" class="ui-hint">—</span>
          </div>
        </div>
        <div v-if="st.settings.profile.target_markets.length">
          <span class="k">Target markets <small>(Trade &amp; exports)</small></span>
          <div class="chips">
            <span v-for="c in st.settings.profile.target_markets" :key="c" class="chip"
              >{{ flag(c) }} {{ cname(c) }}</span
            >
          </div>
        </div>
      </div>
    </section>

    <!-- Focus -->
    <section class="ui-card blk">
      <div class="blk__head">
        <div>
          <h3><i class="fa-solid fa-crosshairs"></i> What to look for</h3>
          <p class="ui-hint">
            Your direction for every scan. Dismissing a card with a reason also teaches the scout
            what you don't want.
          </p>
        </div>
      </div>
      <div class="ui-field">
        <label>Target countries</label>
        <div class="chips">
          <span v-for="(c, i) in draft.focus.countries" :key="c" class="chip on" :data-country="c">
            {{ flag(c) }} {{ cname(c) }}
            <button
              v-if="st.can_edit"
              type="button"
              class="x"
              :aria-label="'Remove ' + cname(c)"
              @click="draft.focus.countries.splice(i, 1)"
            >
              <i class="fa-solid fa-xmark"></i>
            </button>
          </span>
          <select
            v-if="st.can_edit"
            v-model="addCountry"
            class="ui-select ui-select--sm addc"
            aria-label="Add a country"
            data-testid="scout-add-country"
            @change="pushCountry"
          >
            <option value="">+ Add a country</option>
            <option v-for="c in countries" :key="c.code" :value="c.code">{{ c.name }}</option>
          </select>
        </div>
      </div>
      <div class="grid2">
        <div class="ui-field">
          <label>Regions</label>
          <TagInput
            v-model="draft.focus.regions"
            placeholder="e.g. East Africa, Pacific"
            :disabled="!st.can_edit"
            aria-label="Regions"
          />
        </div>
        <div class="ui-field">
          <label>Sectors</label>
          <TagInput
            v-model="draft.focus.sectors"
            placeholder="e.g. NGOs, schools, hospitality"
            :disabled="!st.can_edit"
            aria-label="Sectors"
          />
        </div>
        <div class="ui-field">
          <label>Keywords</label>
          <TagInput
            v-model="draft.focus.keywords"
            placeholder="e.g. website, hosting, ERP, digital skills"
            :disabled="!st.can_edit"
            aria-label="Keywords"
            testid="scout-keywords"
          />
        </div>
        <div class="ui-field">
          <label>Leave out</label>
          <TagInput
            v-model="draft.focus.exclusions"
            placeholder="e.g. construction, medical supplies"
            :disabled="!st.can_edit"
            aria-label="Exclusions"
            testid="scout-exclusions"
          />
        </div>
      </div>
      <div class="ui-field">
        <label>Kinds of opportunity</label>
        <div class="chips">
          <label
            v-for="t in st.types"
            :key="t.key"
            class="chip pick"
            :class="{ on: draft.focus.types.includes(t.key) }"
          >
            <input
              v-model="draft.focus.types"
              type="checkbox"
              :value="t.key"
              :disabled="!st.can_edit"
              :data-type="t.key"
            />
            {{ t.label }}
          </label>
        </div>
      </div>
      <div class="grid2">
        <div class="ui-field">
          <label for="sc-min"
            >Minimum value <small>(skip smaller ones when the value is stated)</small></label
          >
          <div class="minrow">
            <input
              id="sc-min"
              v-model.number="draft.focus.min_value"
              class="ui-input"
              type="number"
              min="0"
              step="any"
              placeholder="0 = any"
              :disabled="!st.can_edit"
              data-testid="scout-min-value"
            />
            <select
              v-model="draft.focus.min_value_currency"
              class="ui-select"
              aria-label="Currency of the minimum"
              :disabled="!st.can_edit"
            >
              <option v-for="c in currencies" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>
        </div>
        <div class="ui-field">
          <label for="sc-notes">Anything else the scout should know</label>
          <textarea
            id="sc-notes"
            v-model="draft.focus.notes"
            class="ui-textarea"
            rows="2"
            maxlength="1000"
            :disabled="!st.can_edit"
            placeholder="e.g. We prefer recurring work; we are AGPO registered."
          ></textarea>
        </div>
      </div>

      <div class="ui-field">
        <label>Sources to favour</label>
        <ul class="sources">
          <li v-for="(s, i) in draft.focus.sources" :key="s.domain" :data-source="s.domain">
            <span class="dom">{{ s.domain }}</span>
            <span class="lab">{{ s.label }}</span>
            <button
              v-if="st.can_edit"
              type="button"
              class="ui-btn ui-btn--icon ui-btn--ghost ui-btn--sm"
              :aria-label="'Remove ' + s.domain"
              @click="draft.focus.sources.splice(i, 1)"
            >
              <i class="fa-solid fa-xmark"></i>
            </button>
          </li>
          <li v-if="!draft.focus.sources.length" class="ui-hint">
            No sources — the scout searches the whole web.
          </li>
        </ul>
        <div v-if="st.can_edit" class="addsrc">
          <input
            v-model.trim="newSource.domain"
            class="ui-input ui-input--sm"
            placeholder="Website, e.g. tenders.go.ke"
            aria-label="Source website"
            data-testid="scout-source-domain"
            @keydown.enter.prevent="pushSource"
          />
          <input
            v-model.trim="newSource.label"
            class="ui-input ui-input--sm"
            placeholder="Name (optional)"
            aria-label="Source name"
            @keydown.enter.prevent="pushSource"
          />
          <button
            type="button"
            class="ui-btn ui-btn--sm"
            :disabled="!newSource.domain"
            @click="pushSource"
          >
            <i class="fa-solid fa-plus"></i> Add
          </button>
        </div>
        <div v-if="st.can_edit && suggestions.length" class="sugg">
          <span class="ui-hint">Suggested:</span>
          <button
            v-for="s in suggestions"
            :key="s.domain"
            type="button"
            class="chip pick"
            :title="s.label"
            @click="draft.focus.sources.push({ ...s })"
          >
            <i class="fa-solid fa-plus"></i> {{ s.domain }}
          </button>
        </div>
        <label class="ui-switch only">
          <input
            v-model="draft.focus.only_sources"
            type="checkbox"
            :disabled="!st.can_edit || !draft.focus.sources.length"
            data-testid="scout-only-sources"
          />
          Only search these sources
          <small class="ui-hint"
            >(fewer leads and new markets, but every result comes from a site you trust)</small
          >
        </label>
      </div>
      <div class="ui-field">
        <label>Never use these sites</label>
        <TagInput
          v-model="draft.focus.blocked_domains"
          placeholder="e.g. a tender-aggregator you don't trust"
          :disabled="!st.can_edit || draft.focus.only_sources"
          aria-label="Blocked sites"
          :normalize="cleanDomain"
        />
      </div>
    </section>

    <!-- Schedule -->
    <section class="ui-card blk">
      <div class="blk__head">
        <div>
          <h3><i class="fa-regular fa-clock"></i> Schedule</h3>
          <p class="ui-hint">
            Times are in {{ st.timezone }}. The daily scan runs early so the 8 am morning brief has
            fresh results; on the weekly day the deep scan runs instead.
          </p>
        </div>
      </div>
      <div class="sched">
        <div class="srow">
          <label class="ui-switch"
            ><input
              v-model="draft.daily_enabled"
              type="checkbox"
              :disabled="!st.can_edit"
              data-testid="scout-daily"
              @change="estimateSoon"
            />
            Daily light scan</label
          >
          <div class="ui-field inline">
            <label for="sc-at">at</label>
            <input
              id="sc-at"
              v-model="draft.daily_at"
              class="ui-input ui-input--sm"
              type="time"
              :disabled="!st.can_edit || !draft.daily_enabled"
            />
          </div>
          <div class="ui-field inline">
            <label for="sc-ds">up to</label>
            <input
              id="sc-ds"
              v-model.number="draft.daily_searches"
              class="ui-input ui-input--sm num"
              type="number"
              min="1"
              max="10"
              :disabled="!st.can_edit || !draft.daily_enabled"
              data-testid="scout-daily-searches"
              @input="estimateSoon"
            />
            <span>searches</span>
          </div>
        </div>
        <div class="srow">
          <label class="ui-switch"
            ><input
              v-model="draft.weekly_enabled"
              type="checkbox"
              :disabled="!st.can_edit"
              @change="estimateSoon"
            />
            Weekly deep scan</label
          >
          <div class="ui-field inline">
            <label for="sc-wd">on</label>
            <select
              id="sc-wd"
              v-model.number="draft.weekly_day"
              class="ui-select ui-select--sm"
              :disabled="!st.can_edit || !draft.weekly_enabled"
            >
              <option v-for="(d, i) in DAYS" :key="d" :value="i">{{ d }}</option>
            </select>
          </div>
          <div class="ui-field inline">
            <label for="sc-ws">up to</label>
            <input
              id="sc-ws"
              v-model.number="draft.weekly_searches"
              class="ui-input ui-input--sm num"
              type="number"
              min="1"
              max="40"
              :disabled="!st.can_edit || !draft.weekly_enabled"
              @input="estimateSoon"
            />
            <span>searches</span>
          </div>
        </div>
      </div>
    </section>

    <div v-if="st.can_edit" class="savebar" :class="{ dirty }">
      <span class="ui-hint">{{ dirty ? 'You have unsaved changes.' : 'All changes saved.' }}</span>
      <button class="ui-btn" type="button" :disabled="!dirty || saving" @click="reset">Undo</button>
      <button
        class="ui-btn ui-btn--primary"
        type="submit"
        :disabled="!dirty || saving"
        data-action="scout-save"
      >
        <i v-if="saving" class="fa-solid fa-spinner fa-spin"></i> Save
      </button>
    </div>

    <!-- Confirm the cost -->
    <div v-if="confirming" class="ui-modal-backdrop" @mousedown.self="confirming = false">
      <div
        class="ui-modal"
        style="max-width: 520px"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sc-confirm-title"
        data-testid="scout-confirm"
      >
        <div class="ui-modal__head">
          <h2 id="sc-confirm-title">Turn on the market scout?</h2>
          <button
            class="ui-btn ui-btn--icon ui-btn--ghost"
            type="button"
            aria-label="Close"
            @click="confirming = false"
          >
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div class="ui-modal__body">
          <ul class="sum">
            <li>
              <strong>{{ scheduleText }}</strong> with {{ est.model_name || st.model }}.
            </li>
            <li>
              Expected cost <strong>about {{ usd(est.monthly_usd) }} a month</strong> (up to
              {{ usd(est.monthly_worst_usd) }} with heavy searches), plus any “Scan now”.
            </li>
            <li>
              Paid with the platform's Anthropic API key: US$10 per 1,000 searches plus tokens.
            </li>
            <li>
              Hard stop at <strong>{{ usd(draft.budget) }}</strong> a month — the admins are told
              when it is reached.
            </li>
          </ul>
          <label class="confirm">
            <input v-model="agree" type="checkbox" data-testid="scout-confirm-check" />
            I understand that scans cost money and confirm about {{ usd(est.monthly_usd) }} a month,
            capped at {{ usd(draft.budget) }}.
          </label>
        </div>
        <div class="ui-modal__foot">
          <button class="ui-btn" type="button" @click="confirming = false">Cancel</button>
          <button
            class="ui-btn ui-btn--primary"
            type="button"
            :disabled="!agree || busy"
            data-action="scout-confirm-on"
            @click="enable"
          >
            <i v-if="busy" class="fa-solid fa-spinner fa-spin"></i> Turn on
          </button>
        </div>
      </div>
    </div>
  </form>
</template>

<script>
import TagInput from './TagInput.vue'
import { scoutApi, usd } from '@/services/scout'
import { COUNTRIES, CURRENCY_CODES, countryName, countryFlag } from '@/utils/currencies'
import { formatDate } from '@/utils/format'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function toDraft(s) {
  const c = JSON.parse(JSON.stringify(s))
  const f = c.focus || {}
  for (const k of [
    'countries',
    'regions',
    'sectors',
    'keywords',
    'exclusions',
    'types',
    'sources',
    'blocked_domains',
  ])
    f[k] = f[k] || []
  return {
    profile: { ...c.profile, offerings: c.profile.offerings || [] },
    focus: f,
    daily_enabled: c.daily_enabled,
    daily_at: c.daily_at,
    daily_searches: c.daily_searches,
    weekly_enabled: c.weekly_enabled,
    weekly_day: c.weekly_day,
    weekly_searches: c.weekly_searches,
    budget: c.monthly_budget_usd,
  }
}

export default {
  name: 'ScoutSetup',
  components: { TagInput },
  props: { st: { type: Object, required: true } },
  emits: ['changed'],
  data() {
    return {
      DAYS,
      draft: toDraft(this.st.settings),
      base: JSON.stringify(toDraft(this.st.settings)),
      est: this.st.estimate,
      saving: false,
      busy: false,
      refreshing: false,
      confirming: false,
      agree: false,
      addCountry: '',
      newSource: { domain: '', label: '' },
      timer: null,
      countries: COUNTRIES,
    }
  },
  computed: {
    dirty() {
      return JSON.stringify(this.draft) !== this.base
    },
    currencies() {
      const set = new Set(CURRENCY_CODES)
      for (const o of this.draft.profile.offerings) if (o.currency) set.add(o.currency)
      return [...set]
    },
    pct() {
      const b = Number(this.st.settings.monthly_budget_usd) || 0
      return b ? Math.min(100, Math.round((Number(this.st.spent_usd) / b) * 100)) : 0
    },
    suggestions() {
      const have = new Set(this.draft.focus.sources.map((s) => s.domain))
      const want = new Set(this.draft.focus.countries)
      return (this.st.suggested_sources || []).filter(
        (s) => !have.has(s.domain) && (!s.country || want.has(s.country)),
      )
    },
    scheduleText() {
      const p = []
      if (this.draft.daily_enabled)
        p.push(
          `A light scan every day at ${this.draft.daily_at} (up to ${this.draft.daily_searches} searches)`,
        )
      if (this.draft.weekly_enabled)
        p.push(
          `a deep scan every ${DAYS[this.draft.weekly_day]} (up to ${this.draft.weekly_searches} searches)`,
        )
      const t = p.join(' and ') || 'No scheduled scans — only “Scan now”'
      return t[0].toUpperCase() + t.slice(1)
    },
  },
  watch: {
    'st.settings': {
      handler(s) {
        // Keep local edits when the parent reloads; take the server copy when there are none.
        const fresh = toDraft(s)
        if (!this.dirty) this.draft = fresh
        this.base = JSON.stringify(fresh)
      },
      deep: true,
    },
    'st.estimate'(e) {
      if (!this.dirty) this.est = e
    },
  },
  beforeUnmount() {
    clearTimeout(this.timer)
  },
  methods: {
    usd,
    formatDate,
    flag: countryFlag,
    cname(c) {
      return countryName(c) || c
    },
    srcLabel(s) {
      return (
        {
          invoices: 'from invoices',
          services: 'catalogue',
          products: 'catalogue',
          manual: 'added',
        }[s] || 'added'
      )
    },
    srcTitle(s) {
      return (
        {
          invoices: 'Typical price of your invoice lines for this service line (last 24 months)',
          services: 'Your services list',
          products: 'Your products',
        }[s] || 'Added by you'
      )
    },
    cleanDomain(v) {
      return String(v || '')
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .replace(/[?#].*$/, '')
        .replace(/\/+$/, '')
    },
    addOffering() {
      this.draft.profile.offerings.push({
        name: '',
        price: 0,
        currency: this.st.settings.profile.currency || 'USD',
        source: 'manual',
      })
    },
    pushCountry() {
      const c = this.addCountry
      this.addCountry = ''
      if (c && !this.draft.focus.countries.includes(c)) this.draft.focus.countries.push(c)
    },
    pushSource() {
      const d = this.cleanDomain(this.newSource.domain)
      if (!d || !/^[a-z0-9-]+(\.[a-z0-9-]+)+(\/.*)?$/.test(d)) {
        toast.warning('Enter a website such as tenders.go.ke')
        return
      }
      if (!this.draft.focus.sources.some((s) => s.domain === d))
        this.draft.focus.sources.push({ domain: d, label: this.newSource.label })
      this.newSource = { domain: '', label: '' }
    },
    estimateSoon() {
      clearTimeout(this.timer)
      this.timer = setTimeout(this.estimate, 350)
    },
    async estimate() {
      try {
        this.est = await scoutApi.estimate({
          daily_enabled: this.draft.daily_enabled,
          daily_searches: Number(this.draft.daily_searches) || 1,
          weekly_enabled: this.draft.weekly_enabled,
          weekly_searches: Number(this.draft.weekly_searches) || 1,
          monthly_budget_usd: Number(this.draft.budget) || undefined,
        })
      } catch {
        /* the last estimate stays */
      }
    },
    body() {
      const d = this.draft
      const b = {
        profile: {
          ...d.profile,
          offerings: d.profile.offerings
            .filter((o) => o.name)
            .map((o) => ({ ...o, price: Number(o.price) || 0 })),
        },
        focus: { ...d.focus, min_value: Number(d.focus.min_value) || 0 },
        daily_enabled: d.daily_enabled,
        daily_at: d.daily_at,
        daily_searches: Number(d.daily_searches),
        weekly_enabled: d.weekly_enabled,
        weekly_day: Number(d.weekly_day),
        weekly_searches: Number(d.weekly_searches),
      }
      if (this.st.can_enable && Number(d.budget) !== Number(this.st.settings.monthly_budget_usd))
        b.monthly_budget_usd = Number(d.budget)
      return b
    },
    async save(quiet = false) {
      this.saving = true
      try {
        const st = await scoutApi.saveSettings(this.body())
        this.draft = toDraft(st.settings)
        this.base = JSON.stringify(this.draft)
        this.est = st.estimate
        if (quiet !== true) toast.success('Saved — the next scan uses it')
        this.$emit('changed', st)
        return true
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not save'))
        return false
      } finally {
        this.saving = false
      }
    },
    reset() {
      this.draft = JSON.parse(this.base)
      this.estimate()
    },
    async refresh() {
      this.refreshing = true
      try {
        // Unsaved edits are saved first: the rebuilt profile replaces the saved one.
        if (this.dirty && !(await this.save(true))) return
        await scoutApi.refreshProfile()
        toast.success('Profile rebuilt from your data — your own description is kept')
        this.$emit('changed')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not rebuild the profile'))
      } finally {
        this.refreshing = false
      }
    },
    async enable() {
      this.busy = true
      try {
        if (this.dirty && !(await this.save(true))) return
        const st = await scoutApi.enable({
          confirm_cost: true,
          monthly_budget_usd: Number(this.draft.budget),
          estimate_usd: this.est.monthly_usd,
        })
        this.confirming = false
        this.agree = false
        toast.success('Market scout is on — use “Scan now” or wait for the morning scan')
        this.$emit('changed', st)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not turn it on'))
      } finally {
        this.busy = false
      }
    },
    async disable() {
      this.busy = true
      try {
        const st = await scoutApi.disable()
        toast.info('Market scout is off — nothing more is spent')
        this.$emit('changed', st)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not turn it off'))
      } finally {
        this.busy = false
      }
    },
  },
}
</script>

<style scoped>
.setup {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.blk {
  padding: 16px 18px;
}

.blk .ui-field {
  margin-bottom: 14px;
}

.blk .ui-field.inline,
.blk .ui-field.budget {
  margin-bottom: 0;
}

.blk__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.blk__head h3 {
  margin: 0 0 2px;
  font-size: 15px;
  font-weight: 650;
}

.blk__head h3 i {
  color: var(--accent);
  margin-right: 6px;
}

.blk__head .ui-hint {
  margin: 0;
}

.mb {
  margin-bottom: 12px;
}

.k {
  display: block;
  font-size: 12px;
  color: var(--text-3);
  margin-bottom: 2px;
}

.cost {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.est strong,
.spent strong {
  display: block;
  font-size: 20px;
  font-variant-numeric: tabular-nums;
  color: var(--text);
}

.est small {
  font-size: 12px;
  color: var(--text-3);
}

.budget {
  margin: 0;
}

.meter {
  height: 8px;
  border-radius: 999px;
  background: var(--bg-subtle);
  overflow: hidden;
  margin-top: 6px;
}

.meter span {
  display: block;
  height: 100%;
  background: var(--accent);
  border-radius: 999px;
}

.meter.full span {
  background: var(--danger);
}

.assume {
  margin: 10px 0 0;
}

.warn {
  color: var(--warning);
}

.switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}

.switch-row .ui-hint {
  flex: 1 1 260px;
  margin: 0;
}

.grid2 {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 14px;
}

.offers {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.offer {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 120px 86px 92px 32px;
  gap: 6px;
  align-items: center;
}

.offer .src {
  font-size: 11.5px;
  color: var(--text-3);
}

.add {
  align-self: flex-start;
}

.facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
  margin-top: 6px;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface-2);
  color: var(--text-2);
  font-size: 12.5px;
}

.chip.on {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--text);
}

.chip.pick {
  cursor: pointer;
}

.chip.pick input {
  accent-color: var(--accent);
  margin: 0;
}

.chip .x {
  border: 0;
  background: transparent;
  color: var(--text-3);
  cursor: pointer;
  padding: 0 2px;
  font-size: 11px;
}

.addc {
  width: auto;
  max-width: 200px;
}

.minrow {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 100px;
  gap: 6px;
}

.sources {
  list-style: none;
  margin: 0 0 8px;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  max-height: 260px;
  overflow: auto;
}

.sources li {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.4fr) 32px;
  gap: 8px;
  align-items: center;
  padding: 5px 8px 5px 12px;
  font-size: 13px;
  border-top: 1px solid var(--border);
}

.sources li:first-child {
  border-top: 0;
}

.sources li.ui-hint {
  display: block;
}

.dom {
  font-weight: 600;
  color: var(--text);
  overflow-wrap: anywhere;
}

.lab {
  color: var(--text-2);
}

.addsrc {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
  gap: 6px;
}

.sugg {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
}

.sugg .ui-hint {
  margin: 0;
}

.only {
  margin-top: 10px;
  flex-wrap: wrap;
}

.sched {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sched .srow {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 18px;
}

.sched .ui-switch {
  min-width: 190px;
}

.sched .srow > * {
  flex: 0 0 auto;
}

.inline {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 6px;
  margin: 0;
  font-size: 13px;
  color: var(--text-2);
}

.inline label {
  margin: 0;
  font-weight: 500;
}

.inline .ui-input,
.inline .ui-select {
  width: auto;
}

.inline input[type='time'] {
  width: 140px;
}

.inline .num {
  width: 76px;
}

.savebar {
  position: sticky;
  bottom: calc(var(--bottom-nav-h, 0px) + env(safe-area-inset-bottom) + 10px);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 10px 14px;
  border-radius: var(--radius-lg, 12px);
  border: 1px solid var(--border);
  background: var(--surface);
  box-shadow: var(--shadow-sm);
  z-index: 5;
}

.savebar .ui-hint {
  margin: 0 auto 0 0;
}

.savebar.dirty {
  border-color: var(--accent);
}

.sum {
  margin: 0 0 14px;
  padding-left: 18px;
  font-size: 13.5px;
  line-height: 1.6;
  color: var(--text);
}

.confirm {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  background: var(--warning-soft);
  font-size: 13.5px;
  color: var(--text);
  cursor: pointer;
}

.confirm input {
  margin-top: 3px;
  accent-color: var(--accent);
}

@media (max-width: 860px) {
  .cost {
    grid-template-columns: minmax(0, 1fr);
  }

  .grid2 {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 560px) {
  .blk {
    padding: 14px 12px;
  }

  .blk__head {
    flex-direction: column;
  }

  .offer {
    grid-template-columns: minmax(0, 1fr) 90px 32px;
  }

  .offer .name {
    grid-column: 1 / -1;
  }

  .offer .cur {
    grid-column: 2 / 3;
  }

  .offer .src {
    display: none;
  }

  .sources li {
    grid-template-columns: minmax(0, 1fr) 32px;
  }

  .sources .lab {
    grid-column: 1 / 2;
    grid-row: 2;
    font-size: 12px;
  }

  .addsrc {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
