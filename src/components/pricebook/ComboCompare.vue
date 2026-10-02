<template>
  <section class="ui-card cmp" data-testid="combo-compare">
    <div class="ui-card__head">
      <h2><i class="fa-solid fa-scale-balanced head-ic"></i> Compare a domain + hosting combo</h2>
      <span v-if="loading" class="muted"><i class="fa-solid fa-circle-notch fa-spin"></i> Comparing…</span>
      <span v-else-if="result" class="muted" data-testid="need-text">{{ result.need }} · {{ input.term_years === 2 ? '2 years' : '1 year' }}</span>
    </div>
    <div class="ui-card__body">
      <!-- What to compare -->
      <div class="form">
        <div class="fgroup grow">
          <span class="ui-label">Domain ending</span>
          <div class="chips" data-testid="tld-chips">
            <button v-for="t in tldChoices" :key="t" type="button" class="chip" :class="{ on: input.tlds.includes(t) }" :aria-pressed="input.tlds.includes(t)" :data-tld="t" @click="toggleTld(t)">{{ t }}</button>
            <form class="addtld" @submit.prevent="addTld">
              <input v-model.trim="newTld" class="ui-input tiny" placeholder=".tld" aria-label="Add a domain ending" data-testid="tld-add" />
              <button type="submit" class="ui-btn ui-btn--sm" :disabled="!newTld">Add</button>
            </form>
          </div>
          <span class="ui-hint">{{ input.tlds.length ? 'Each ending is compared separately.' : 'None selected: hosting only.' }}</span>
        </div>
        <div class="fgroup">
          <span class="ui-label">Hosting need <a v-if="canEdit" href="#" class="lnk" data-testid="edit-tiers" @click.prevent="$emit('edit-tiers')">edit tiers</a></span>
          <div class="seg" role="group" aria-label="Hosting need" data-testid="tier-seg">
            <button v-for="t in tiers" :key="t.key" type="button" :class="{ on: need === t.key }" :aria-pressed="need === t.key" :data-tier="t.key" @click="setNeed(t.key)">{{ t.label }}</button>
            <button type="button" :class="{ on: need === 'custom' }" :aria-pressed="need === 'custom'" data-tier="custom" @click="setNeed('custom')">Custom</button>
            <button type="button" :class="{ on: need === 'none' }" :aria-pressed="need === 'none'" data-tier="none" :disabled="!input.tlds.length" title="Domain only" @click="setNeed('none')">None</button>
          </div>
          <div v-if="need === 'custom'" class="inline">
            <label>at least <input class="ui-input tiny" type="number" min="0" step="0.5" :value="input.min_disk_gb" aria-label="Minimum disk in GB" data-testid="min-disk" @change="patch({ min_disk_gb: numOf($event, 0) })" /> GB</label>
            <label><input class="ui-input tiny" type="number" min="1" step="1" :value="input.min_sites" aria-label="Sites" @change="patch({ min_sites: Math.max(1, Math.round(numOf($event, 1))) })" /> site(s)</label>
          </div>
          <span v-else class="ui-hint">{{ needHint }}</span>
        </div>
        <div class="fgroup">
          <span class="ui-label">Term</span>
          <div class="seg" role="group" aria-label="Term" data-testid="term-seg">
            <button type="button" :class="{ on: input.term_years !== 2 }" :aria-pressed="input.term_years !== 2" data-term="1" @click="patch({ term_years: 1 })">1 year</button>
            <button type="button" :class="{ on: input.term_years === 2 }" :aria-pressed="input.term_years === 2" data-term="2" @click="patch({ term_years: 2 })">2 years</button>
          </div>
          <span class="ui-hint">Cheapest is judged over the term.</span>
        </div>
        <div class="fgroup">
          <span class="ui-label">Extras</span>
          <div class="inline">
            <label class="ui-switch"><input type="checkbox" :checked="input.include_ssl" data-testid="opt-ssl" @change="patch({ include_ssl: $event.target.checked })" /> <span>SSL</span></label>
            <label><input class="ui-input tiny" type="number" min="0" step="1" :value="input.mailboxes" aria-label="Mailboxes" data-testid="opt-mailboxes" @change="patch({ mailboxes: Math.max(0, Math.round(numOf($event, 0))) })" /> mailboxes</label>
          </div>
        </div>
      </div>

      <details class="adv" :open="advOpen" @toggle="advOpen = $event.target.open">
        <summary>More options<span v-if="input.domain_from || input.hosting_from" class="ui-badge ui-badge--info pin">your mix</span></summary>
        <div class="form adv__body">
          <label class="ui-field">
            <span class="ui-label">Domain</span>
            <select class="ui-select" :value="input.domain_action" aria-label="Register or transfer" @change="patch({ domain_action: $event.target.value })">
              <option value="register">New registration</option>
              <option value="transfer">Transfer in</option>
            </select>
          </label>
          <label class="ui-field">
            <span class="ui-label">Buy the domain from</span>
            <select class="ui-select" :value="input.domain_from || ''" data-testid="domain-from" @change="patch({ domain_from: $event.target.value })">
              <option value="">Whoever is cheapest</option>
              <option v-for="s in buyable" :key="s.id" :value="s.id">{{ s.name }}</option>
            </select>
          </label>
          <label class="ui-field">
            <span class="ui-label">Host it at</span>
            <select class="ui-select" :value="input.hosting_from || ''" data-testid="hosting-from" @change="patch({ hosting_from: $event.target.value })">
              <option value="">Whoever is cheapest</option>
              <option v-for="s in buyable" :key="s.id" :value="s.id">{{ s.name }}</option>
            </select>
          </label>
          <label class="ui-field">
            <span class="ui-label">Sites sharing a multi-site plan</span>
            <input class="ui-input" type="number" min="1" step="1" :value="input.share_sites" data-testid="share-sites" @change="patch({ share_sites: Math.max(1, Math.round(numOf($event, 1))) })" />
            <span class="ui-hint">1 = one client per plan. More spreads a reseller plan's price over that many client sites.</span>
          </label>
          <label class="ui-field">
            <span class="ui-label">Cost your own server</span>
            <select class="ui-select" :value="input.self_hosted_basis" @change="patch({ self_hosted_basis: $event.target.value })">
              <option value="current">At the current number of sites</option>
              <option value="capacity">With the server full</option>
            </select>
          </label>
        </div>
      </details>

      <!-- Exchange rates used (editable for what-if) -->
      <div v-if="result && result.rates.length" class="fx" data-testid="fx-rates">
        <i class="fa-solid fa-money-bill-transfer"></i>
        <div v-for="r in result.rates" :key="r.currency" class="fx__rate" :data-currency="r.currency" :data-source="r.source">
          <span>1 {{ r.currency }} =</span>
          <input class="ui-input tiny rate" type="number" min="0" step="any" :value="r.rate || ''" :aria-label="`${r.currency} to ${home} rate`" @change="setRate(r, $event)" />
          <span>{{ home }}</span>
          <small class="muted">{{ rateSource(r) }}<template v-if="r.as_of && !r.overridden"> · {{ formatDate(r.as_of) }}</template></small>
          <button v-if="r.overridden" type="button" class="ui-btn ui-btn--ghost ui-btn--sm" :title="`Back to ${rateNumber(r.default_rate)}`" @click="resetRate(r)"><i class="fa-solid fa-rotate-left"></i> {{ rateNumber(r.default_rate) }}</button>
          <i v-if="!r.overridden && (r.source === 'fallback' || r.source === 'missing' || r.stale)" class="fa-solid fa-triangle-exclamation warn" :title="r.warning"></i>
        </div>
        <small class="muted fx__hint">Edit a rate to see what happens if it moves.</small>
      </div>

      <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>
      <div v-else-if="!result" class="ui-skeleton" style="height: 260px"></div>
      <template v-else>
        <div v-for="(w, i) in result.warnings" :key="'w' + i" class="ui-alert ui-alert--warning"><i class="fa-solid fa-triangle-exclamation"></i><span>{{ w }} <a href="#" @click.prevent="$emit('import')">Import a price list</a></span></div>

        <div v-if="result.combos.length > 1" class="ui-tabs tldtabs" role="tablist" aria-label="Domain endings">
          <button v-for="c in result.combos" :key="c.tld" class="ui-tab" :class="{ 'is-active': combo && combo.tld === c.tld }" role="tab" :aria-selected="combo && combo.tld === c.tld" :data-tld-tab="c.tld" @click="$emit('update:activeTld', c.tld)">
            {{ c.tld || 'Hosting' }}
          </button>
        </div>

        <!-- Reseller plans: costed whole unless they are spread over your sites -->
        <form v-if="showShare" class="share" data-testid="share-notice" @submit.prevent="applyShare">
          <i class="fa-solid fa-people-roof"></i>
          <span class="share__text">
            <strong>Reseller plans are costed as if one client used the whole plan.</strong>
            <small v-if="knownHint">{{ knownHint }}</small>
          </span>
          <label class="share__in">Spread over <input v-model="shareN" class="ui-input tiny" type="number" min="2" step="1" aria-label="Number of your sites sharing a reseller plan" data-testid="share-n" @input="shareTouched = true" /> of my sites</label>
          <button type="submit" class="ui-btn ui-btn--sm" :disabled="!(Number(shareN) >= 2)" data-testid="share-apply">Apply</button>
        </form>
        <p v-else-if="result.multi_site_plans > 0 && input.share_sites > 1 && !input.no_hosting" class="share share--on" data-testid="share-active">
          <i class="fa-solid fa-people-roof"></i>
          <span>Reseller plans are spread over <strong>{{ input.share_sites }}</strong> of your sites: their cost per site only holds while that many sites are on the plan.</span>
          <button type="button" class="ui-btn ui-btn--ghost ui-btn--sm" data-testid="share-reset" @click="patch({ share_sites: 1 })">One client per plan</button>
        </p>

        <template v-if="combo">
          <!-- One card per way to supply it -->
          <div class="opts" data-testid="options">
            <article v-for="o in cards" :key="o.key" class="opt" :class="{ best: o.cheapest, sel: selectedKey === o.key, off: !o.complete }" :data-key="o.key" :data-supplier="o.supplier_name"
              :data-complete="o.complete" :data-cheapest="o.cheapest" tabindex="0" role="button" :aria-pressed="selectedKey === o.key" @click="pick(o)" @keydown.enter.prevent="pick(o)">
              <header>
                <span class="opt__ic" :class="'t-' + o.supplier_type"><i :class="typeIcon(o)"></i></span>
                <div class="opt__name">
                  <strong>{{ title(o) }}</strong>
                  <small>{{ isMix(o) ? o.supplier_name : typeLabel(o) }}</small>
                </div>
              </header>
              <div v-if="o.cheapest || o.lowest_ongoing || !o.complete" class="opt__badges">
                <span v-if="o.cheapest" class="ui-badge ui-badge--success" data-testid="cheapest-badge">Cheapest{{ input.term_years === 2 ? ' over 2 years' : ' first year' }}</span>
                <span v-if="o.lowest_ongoing" class="ui-badge ui-badge--info" data-testid="lowest-ongoing-badge" title="Costs the least per year once introductory prices have ended">{{ o.key === 'mix_ongoing' ? 'Lowest cost per year' : 'Cheapest to renew' }}</span>
                <span v-if="!o.complete" class="ui-badge ui-badge--draft">Incomplete</span>
              </div>
              <template v-if="parts(o).length">
                <div class="opt__total">
                  <span class="lbl">First year</span>
                  <strong data-testid="first-year-home" :data-value="o.first_year_home">{{ cur(o.first_year_home, home) }}</strong>
                  <small v-if="native(o, 'first_year')" data-testid="first-year-native">{{ native(o, 'first_year') }}</small>
                </div>
                <div class="opt__sub">
                  <span>then <b data-testid="ongoing-home" :data-value="o.ongoing_home">{{ cur(o.ongoing_home, home) }}</b> a year<small v-if="native(o, 'ongoing')"> · {{ native(o, 'ongoing') }}</small></span>
                  <span v-if="input.term_years === 2">2 years: <b data-testid="term-home" :data-value="o.term_total_home">{{ cur(o.term_total_home, home) }}</b></span>
                  <span v-if="o.key === 'mix' && o.saving_home > 0" class="save">saves {{ cur(o.saving_home, home) }} vs one supplier</span>
                  <span v-if="o.key === 'mix_ongoing' && o.saving_ongoing_home > 0" class="save" data-testid="saving-ongoing" :data-value="o.saving_ongoing_home">saves {{ cur(o.saving_ongoing_home, home) }} a year vs one supplier</span>
                </div>
              </template>
              <dl class="parts">
                <template v-for="p in parts(o)" :key="p.role">
                  <dt><i :class="roleIcon(p.role)"></i> {{ roleLabel(p, o) }}</dt>
                  <dd :data-part="p.role">{{ partText(p) }}<small v-if="p.note" class="block muted">{{ p.note }}</small></dd>
                </template>
                <template v-if="o.setup_home > 0">
                  <dt><i class="fa-solid fa-screwdriver-wrench"></i> Setup</dt>
                  <dd data-part="setup">{{ o.currency ? cur(o.setup, o.currency) : cur(o.setup_home, home) }} once</dd>
                </template>
              </dl>
              <ul v-if="o.flags.length || o.reasons?.length" class="flags">
                <li v-for="(r, i) in o.reasons || []" :key="'r' + i" class="f-missing"><i class="fa-solid fa-circle-minus"></i> {{ cap(r) }}</li>
                <li v-for="(f, i) in o.flags" :key="'f' + i" :class="'f-' + f.severity" :data-flag="f.type"><i :class="f.severity === 'warning' ? 'fa-solid fa-triangle-exclamation' : 'fa-solid fa-circle-info'"></i> {{ f.message }}</li>
              </ul>
              <footer>
                <span class="pick"><i :class="selectedKey === o.key ? 'fa-solid fa-circle-check' : 'fa-regular fa-circle'"></i> {{ selectedKey === o.key ? 'Pricing this option' : 'Price this option' }}</span>
              </footer>
            </article>
            <div v-if="!cards.length" class="ui-empty small">
              <div class="ui-empty__icon"><i class="fa-solid fa-tags"></i></div>
              <h3>No prices to compare yet</h3>
              <p>Import a price list, auto-fill Synergy or add prices by hand.</p>
            </div>
          </div>

          <p v-if="combo.mix_note" class="mixnote" data-testid="mix-note"><i class="fa-solid fa-circle-info"></i> {{ combo.mix_note }}</p>

          <!-- The market: competitors' retail prices -->
          <div v-if="combo.benchmarks.length" class="market" data-testid="market">
            <div class="market__head">
              <h3><i class="fa-solid fa-binoculars"></i> What competitors charge for this</h3>
              <span class="muted">Retail prices, {{ home }} — a benchmark, not options to buy</span>
            </div>
            <div v-if="combo.market" class="market__stats">
              <span data-stat="min" :data-value="combo.market.first_year.min"><small>Cheapest</small><b>{{ cur(combo.market.first_year.min, home) }}</b></span>
              <span data-stat="median" :data-value="combo.market.first_year.median"><small>Median</small><b>{{ cur(combo.market.first_year.median, home) }}</b></span>
              <span data-stat="max" :data-value="combo.market.first_year.max"><small>Most expensive</small><b>{{ cur(combo.market.first_year.max, home) }}</b></span>
              <span class="hide-sm"><small>Renewal, median</small><b>{{ cur(combo.market.ongoing.median, home) }}</b></span>
            </div>
            <div class="ui-table-wrap">
              <table v-table-cards class="ui-table">
                <thead>
                  <tr><th>Competitor</th><th class="hide-sm">Plan</th><th class="num">First year</th><th class="num">Then / year</th></tr>
                </thead>
                <tbody>
                  <tr v-for="b in combo.benchmarks" :key="b.key" :data-competitor="b.supplier_name">
                    <td>{{ b.supplier_name }}<small v-if="!b.complete" class="block muted">no {{ b.missing.join(' or ') }} price — left out of the summary</small><small v-if="b.promo_trap" class="block txt-warn">intro price</small></td>
                    <td class="hide-sm card-show">{{ b.hosting ? b.hosting.name : '—' }}</td>
                    <td class="num">{{ cur(b.first_year_home, home) }}<small v-if="native(b, 'first_year')" class="block muted">{{ native(b, 'first_year') }}</small></td>
                    <td class="num">{{ cur(b.ongoing_home, home) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Line by line -->
          <details v-if="cards.length > 1" class="lines" data-testid="lines">
            <summary>Line by line</summary>
            <div class="ui-table-wrap">
              <table class="ui-table">
                <thead>
                  <tr><th></th><th v-for="o in cards" :key="o.key" class="num" :data-col="o.key">{{ title(o) }}</th></tr>
                </thead>
                <tbody>
                  <tr v-for="row in lineRows" :key="row.key" :class="{ total: row.total }">
                    <td>{{ row.label }}</td>
                    <td v-for="o in cards" :key="o.key" class="num">{{ row.value(o) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </details>
        </template>
      </template>
    </div>
  </section>
</template>

<script>
import { cur, num, rateSource, rateNumber, typeOf } from '@/services/pricebook'
import { formatDate } from '@/utils/format'

export default {
  name: 'ComboCompare',
  props: {
    input: { type: Object, required: true },
    result: { type: Object, default: null },
    loading: { type: Boolean, default: false },
    error: { type: String, default: '' },
    home: { type: String, default: 'AUD' },
    tiers: { type: Array, default: () => [] },
    tldOptions: { type: Array, default: () => [] },
    suppliers: { type: Array, default: () => [] },
    knownSites: { type: Number, default: 0 },
    knownSitesSource: { type: String, default: '' },
    activeTld: { type: String, default: '' },
    selectedKey: { type: String, default: '' },
    canEdit: { type: Boolean, default: false }
  },
  emits: ['change', 'update:activeTld', 'select', 'edit-tiers', 'import'],
  data() {
    return { newTld: '', advOpen: false, shareN: this.knownSites > 1 ? this.knownSites : '', shareTouched: false }
  },
  computed: {
    tldChoices() {
      const seen = new Set()
      const out = []
      for (const t of [...this.tldOptions, ...this.input.tlds]) {
        if (t && !seen.has(t)) {
          seen.add(t)
          out.push(t)
        }
      }
      return out
    },
    buyable() {
      return this.suppliers.filter((s) => s.type !== 'competitor')
    },
    need() {
      if (this.input.no_hosting && this.input.tlds.length) return 'none'
      return this.input.tier || 'custom'
    },
    needHint() {
      if (this.need === 'none') return 'Domain only.'
      const t = this.tiers.find((x) => x.key === this.input.tier)
      if (!t) return ''
      return `At least ${num(t.min_disk_gb)} GB${t.min_sites > 1 ? `, ${t.min_sites} sites` : ''}: the cheapest plan that fits.`
    },
    combo() {
      const c = this.result?.combos || []
      return c.find((x) => x.tld === this.activeTld) || c[0] || null
    },
    cards() {
      if (!this.combo) return []
      // Nothing priced anywhere: the empty state says so better than three empty cards.
      if (!this.combo.options.some((o) => o.domain || o.hosting)) return []
      const list = [...this.combo.options]
      // The mixes lead: cheapest over the term, then cheapest to renew.
      if (this.combo.mix_ongoing) list.unshift(this.combo.mix_ongoing)
      const m = this.combo.mix
      if (m && !m.same_supplier) list.unshift(m)
      return list
    },
    showShare() {
      return !!this.result && this.result.multi_site_plans > 0 && !this.input.no_hosting && !(this.input.share_sites > 1)
    },
    knownHint() {
      if (!(this.knownSites > 1)) return ''
      return this.knownSitesSource === 'synergy' ? `You host ${this.knownSites} active sites at Synergy.` : `Your server has ${this.knownSites} sites on it.`
    },
    lineRows() {
      const home = this.home
      const part = (o, role, f) => (o[role] ? f(o[role]) : '—')
      const own = (v, p) => (p.included ? 'included' : cur(v, p.currency))
      const rows = []
      if (this.combo?.tld) {
        rows.push({ key: 'd1', label: `Domain ${this.combo.tld}, year 1`, value: (o) => part(o, 'domain', (p) => own(p.first_year, p)) })
        rows.push({ key: 'd2', label: 'Domain renewal / year', value: (o) => part(o, 'domain', (p) => own(p.ongoing, p)) })
      }
      if (!this.input.no_hosting) {
        rows.push({ key: 'hp', label: 'Hosting plan', value: (o) => part(o, 'hosting', (p) => p.name) })
        rows.push({ key: 'hm', label: 'Hosting / month', value: (o) => part(o, 'hosting', (p) => own(p.monthly, p)) })
        rows.push({ key: 'h1', label: 'Hosting, first year', value: (o) => part(o, 'hosting', (p) => own(p.first_year, p)) })
        rows.push({ key: 'h2', label: 'Hosting / year after', value: (o) => part(o, 'hosting', (p) => own(p.ongoing, p)) })
      }
      if (this.input.include_ssl) rows.push({ key: 'ssl', label: 'SSL / year', value: (o) => part(o, 'ssl', (p) => own(p.ongoing, p)) })
      if (this.input.mailboxes > 0) rows.push({ key: 'em', label: `${this.input.mailboxes} mailbox(es) / year`, value: (o) => part(o, 'email', (p) => own(p.ongoing, p)) })
      rows.push({ key: 'su', label: 'Setup (once)', value: (o) => (o.setup_home > 0 ? cur(o.setup_home, home) : '—') })
      rows.push({ key: 't1', label: `First-year total (${home})`, total: true, value: (o) => (o.complete ? cur(o.first_year_home, home) : '—') })
      rows.push({ key: 't2', label: `Ongoing / year (${home})`, total: true, value: (o) => (o.complete ? cur(o.ongoing_home, home) : '—') })
      if (this.input.term_years === 2) rows.push({ key: 't3', label: `2-year total (${home})`, total: true, value: (o) => (o.complete ? cur(o.term_total_home, home) : '—') })
      return rows
    }
  },
  watch: {
    knownSites(n) {
      // Follow the best known count until the user types their own.
      if (!this.shareTouched) this.shareN = n > 1 ? n : ''
    }
  },
  methods: {
    cur,
    rateSource,
    isMix(o) {
      return o.key === 'mix' || o.key === 'mix_ongoing'
    },
    title(o) {
      if (o.key === 'mix') return o.pinned ? 'Your mix' : 'Cheapest mix'
      if (o.key === 'mix_ongoing') return 'Cheapest to renew'
      return o.supplier_name
    },
    applyShare() {
      const n = Math.round(Number(this.shareN))
      if (n >= 2) this.patch({ share_sites: n })
    },
    rateNumber,
    formatDate,
    patch(p) {
      this.$emit('change', p)
    },
    numOf(e, fallback) {
      const n = Number(e.target.value)
      return Number.isFinite(n) && e.target.value !== '' ? n : fallback
    },
    normTld(t) {
      const s = String(t || '')
        .toLowerCase()
        .replace(/^[*\s.]+|[\s.]+$/g, '')
      return /^[a-z0-9.-]+$/.test(s) ? '.' + s : ''
    },
    toggleTld(t) {
      const list = this.input.tlds
      const next = list.includes(t) ? list.filter((x) => x !== t) : [...list, t]
      const p = { tlds: next }
      if (!next.length) p.no_hosting = false
      this.patch(p)
      if (!list.includes(t)) this.$emit('update:activeTld', t)
      else if (!next.includes(this.activeTld)) this.$emit('update:activeTld', next[next.length - 1] || '')
    },
    addTld() {
      const t = this.normTld(this.newTld)
      if (!t) return
      this.newTld = ''
      if (!this.input.tlds.includes(t)) this.toggleTld(t)
    },
    setNeed(k) {
      if (k === 'none') return this.patch({ no_hosting: true })
      if (k === 'custom') {
        const t = this.tiers.find((x) => x.key === this.input.tier)
        return this.patch({ no_hosting: false, tier: '', min_disk_gb: t ? t.min_disk_gb : this.input.min_disk_gb || 0, min_sites: t ? t.min_sites : this.input.min_sites || 1 })
      }
      this.patch({ no_hosting: false, tier: k })
    },
    setRate(r, e) {
      const v = Number(e.target.value)
      const rates = { ...(this.input.rates || {}) }
      if (!(v > 0) || v === r.default_rate) delete rates[r.currency]
      else rates[r.currency] = v
      this.patch({ rates })
    },
    resetRate(r) {
      const rates = { ...(this.input.rates || {}) }
      delete rates[r.currency]
      this.patch({ rates })
    },
    pick(o) {
      this.$emit('select', o.key)
    },
    parts(o) {
      return ['domain', 'hosting', 'ssl', 'email'].map((k) => o[k]).filter(Boolean)
    },
    typeIcon(o) {
      if (o.key === 'mix_ongoing') return 'fa-solid fa-rotate'
      return o.key === 'mix' ? 'fa-solid fa-shuffle' : typeOf(o.supplier_type).icon
    },
    typeLabel(o) {
      return `${typeOf(o.supplier_type).label}${o.currency ? ' · ' + o.currency : ''}`
    },
    roleIcon(role) {
      return { domain: 'fa-solid fa-globe', hosting: 'fa-solid fa-server', ssl: 'fa-solid fa-lock', email: 'fa-solid fa-envelope' }[role]
    },
    roleLabel(p, o) {
      const from = this.isMix(o) ? ` · ${p.supplier_name}` : ''
      if (p.role === 'domain') return `Domain ${this.combo?.tld || ''}${from}`
      if (p.role === 'hosting') return `${p.name}${from}`
      if (p.role === 'ssl') return 'SSL'
      return p.name || 'Email'
    },
    /** The option's total in its own currency (or "AUD … + USD …" for a mix). */
    native(o, field) {
      const by = (o.by_currency || []).filter((c) => c.currency !== this.home)
      if (!by.length) return ''
      return (o.by_currency || []).map((c) => cur(c[field], c.currency)).join(' + ')
    },
    partText(p) {
      if (p.included) return 'Included'
      const c = p.currency
      let s
      if (!p.months) s = `${cur(p.price, c)} once`
      else if (p.months === 1) {
        s = `${cur(p.price, c)} / month × 12 = ${cur(p.first_year, c)}`
        if (Math.abs(p.ongoing - p.first_year) > 0.005) s += `, then ${cur(p.ongoing, c)} / year`
      } else if (p.months === 12) {
        s = `${cur(p.first_year, c)} year 1`
        s += Math.abs(p.ongoing - p.first_year) > 0.005 ? ` · renews ${cur(p.ongoing, c)} / year` : ' · same every year'
      } else {
        s = `${cur(p.price, c)} per ${p.months / 12} years (${cur(p.ongoing, c)} / year after)`
      }
      if (p.setup > 0) s += ` + ${cur(p.setup, c)} setup`
      return s
    },
    cap(s) {
      return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''
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
.form {
  display: flex;
  flex-wrap: wrap;
  gap: 14px 22px;
  align-items: flex-start;
}
.fgroup {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}
.fgroup.grow {
  flex: 1 1 260px;
}
.lnk {
  font-weight: 400;
  font-size: 12px;
  margin-left: 6px;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}
.chip {
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-2);
  border-radius: 999px;
  padding: 5px 12px;
  font-size: 13px;
  cursor: pointer;
  font-variant-numeric: tabular-nums;
}
.chip:hover {
  border-color: var(--border-strong);
}
.chip.on {
  background: var(--accent-soft);
  border-color: var(--accent);
  color: var(--accent);
  font-weight: 600;
}
.addtld {
  display: inline-flex;
  gap: 4px;
  align-items: center;
}
.tiny {
  width: 84px;
  padding: 5px 8px;
  min-height: 0;
}
.tiny.rate {
  width: 116px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.seg {
  display: inline-flex;
  align-self: flex-start;
  flex-wrap: wrap;
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
.seg button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.inline {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  font-size: 13px;
  color: var(--text-2);
  min-height: 34px;
}
.inline label {
  display: inline-flex;
  gap: 6px;
  align-items: center;
}
.adv {
  margin-top: 12px;
  font-size: 13px;
}
.adv summary,
.lines summary {
  cursor: pointer;
  color: var(--text-2);
  width: fit-content;
}
.adv__body {
  margin-top: 10px;
}
.pin {
  margin-left: 8px;
  font-size: 10.5px;
}
.mixnote {
  margin: 12px 0 0;
  font-size: 13px;
  color: var(--text-2);
}
.mixnote i {
  color: var(--info);
}
.adv__body .ui-field {
  flex: 1 1 220px;
  max-width: 320px;
}
.fx {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 18px;
  align-items: center;
  margin: 14px 0;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  background: var(--bg-subtle);
  font-size: 13px;
  color: var(--text-2);
}
.fx > i {
  color: var(--accent);
}
.fx__rate {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
}
.fx__hint {
  margin-left: auto;
}
.warn {
  color: var(--warning);
}
.tldtabs {
  margin-bottom: 12px;
}
.share {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  align-items: center;
  margin: 0 0 14px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-left: 3px solid var(--warning);
  border-radius: var(--radius-sm);
  background: var(--surface);
  font-size: 13px;
  color: var(--text-2);
}
.share--on {
  border-left-color: var(--info);
}
.share > i {
  color: var(--warning);
}
.share--on > i {
  color: var(--info);
}
.share__text {
  flex: 1 1 260px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.share--on > span {
  flex: 1 1 260px;
  min-width: 0;
}
.share__text strong {
  color: var(--text);
  font-weight: 600;
}
.share__text small {
  color: var(--text-3);
  font-size: 12.5px;
}
.share__in {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  white-space: nowrap;
}
.opts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 14px;
  align-items: stretch;
}
.opt {
  display: flex;
  flex-direction: column;
  gap: 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 14px;
  background: var(--surface);
  cursor: pointer;
  min-width: 0;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}
.opt:hover {
  border-color: var(--border-strong);
  box-shadow: var(--shadow-xs);
}
.opt:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.opt.best {
  border-color: var(--success);
}
.opt.sel {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent);
}
.opt.off .opt__total strong {
  color: var(--text-3);
}
.opt header {
  display: flex;
  gap: 10px;
  align-items: center;
}
.opt__ic {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--info-soft);
  color: var(--info);
  flex-shrink: 0;
}
.opt__ic.t-self_hosted {
  background: var(--success-soft);
  color: var(--success);
}
.opt__ic.t-mix {
  background: var(--accent-soft);
  color: var(--accent);
}
.opt__name {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.opt__name strong {
  overflow-wrap: break-word;
}
.opt__name small {
  color: var(--text-3);
  font-size: 12px;
  overflow-wrap: break-word;
}
.opt__badges {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.save {
  color: var(--success);
}
.opt__total {
  display: flex;
  flex-direction: column;
}
.opt__total .lbl {
  font-size: 12px;
  color: var(--text-3);
}
.opt__total strong {
  font-size: 22px;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}
.opt__total small,
.opt__sub small {
  color: var(--text-3);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}
.opt__sub {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 13px;
  color: var(--text-2);
  font-variant-numeric: tabular-nums;
}
.parts {
  margin: 0;
  padding-top: 10px;
  border-top: 1px solid var(--border);
  display: grid;
  gap: 2px;
  font-size: 12.5px;
}
.parts dt {
  color: var(--text-2);
  font-weight: 600;
  margin-top: 4px;
  overflow-wrap: anywhere;
}
.parts dt i {
  width: 16px;
  color: var(--text-3);
  font-size: 11px;
}
.parts dd {
  margin: 0 0 0 20px;
  color: var(--text-2);
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}
.flags {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 12.5px;
}
.flags li {
  display: flex;
  gap: 7px;
  align-items: baseline;
  color: var(--text-2);
  overflow-wrap: anywhere;
}
.flags li i {
  flex-shrink: 0;
  font-size: 11px;
}
.f-warning i {
  color: var(--warning);
}
.f-info i {
  color: var(--info);
}
.f-missing i {
  color: var(--text-3);
}
.opt footer {
  margin-top: auto;
  padding-top: 4px;
}
.pick {
  font-size: 12.5px;
  color: var(--text-3);
  display: inline-flex;
  gap: 6px;
  align-items: center;
}
.opt.sel .pick {
  color: var(--accent);
  font-weight: 600;
}
.market {
  margin-top: 18px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 14px;
}
.market__head {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
  align-items: baseline;
  margin-bottom: 10px;
}
.market__head h3 {
  margin: 0;
  font-size: 14.5px;
}
.market__head h3 i {
  color: var(--text-3);
  margin-right: 4px;
}
.market__stats {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 26px;
  margin-bottom: 10px;
}
.market__stats span {
  display: flex;
  flex-direction: column;
}
.market__stats small {
  color: var(--text-3);
  font-size: 12px;
}
.market__stats b {
  font-variant-numeric: tabular-nums;
}
.lines {
  margin-top: 14px;
  font-size: 13px;
}
.lines .ui-table-wrap {
  margin-top: 8px;
}
.lines tr.total td {
  font-weight: 600;
}
.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.block {
  display: block;
}
.market td small {
  font-weight: 400;
}
.txt-ok {
  color: var(--success);
}
.txt-warn {
  color: var(--warning);
}
.ui-empty.small {
  grid-column: 1 / -1;
}
@media (max-width: 640px) {
  .hide-sm {
    display: none !important;
  }
  .fx__hint {
    margin-left: 0;
  }
  .opts {
    grid-template-columns: 1fr;
  }
  .fgroup,
  .fgroup.grow {
    flex: 1 1 100%;
  }
}
</style>
