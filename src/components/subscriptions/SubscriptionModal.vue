<template>
  <div class="ui-modal-backdrop" @mousedown.self="close">
    <form class="ui-modal" style="max-width: 860px" role="dialog" aria-modal="true" aria-labelledby="sm-title" data-testid="sub-modal" @submit.prevent="save">
      <div class="ui-modal__head">
        <h2 id="sm-title">{{ editing ? `Edit ${sub.number}` : 'New subscription' }}</h2>
        <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="close"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="ui-modal__body">
        <div v-if="error" class="ui-alert ui-alert--danger" data-testid="sm-error"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>
        <div v-if="locked" class="ui-alert ui-alert--warning"><i class="fa-solid fa-lock"></i><span>Invoices were created, so the client, currency, billing period, start date and billing day stay as they are. Service and price changes apply from the next invoice.</span></div>

        <section class="sec">
          <h3><i class="fa-solid fa-user"></i> Client</h3>
          <div class="ui-field">
            <label for="sm-customer">Customer</label>
            <CustomerPicker id="sm-customer" v-model="f.customer_id" :disabled="locked" :initial-name="sub?.customer_name || presetName" @picked="onCustomer" />
          </div>
        </section>

        <section class="sec">
          <div class="sec__head">
            <h3><i class="fa-solid fa-layer-group"></i> Services</h3>
            <button type="button" class="ui-btn ui-btn--sm" data-testid="sm-add-line" @click="addLine"><i class="fa-solid fa-plus"></i> Add a service</button>
          </div>
          <p v-if="!catalog.length && !loadingCatalog" class="ui-hint">The services catalogue is empty — type the item below, or add services under Settings → Services (or Supplier prices → Retail helper → “Save as service”).</p>
          <div v-for="(l, i) in f.lines" :key="l.key" class="line" :data-testid="`sm-line-${i}`">
            <div class="line__grid">
              <div class="ui-field">
                <label :for="`sm-svc-${i}`">Catalogue service</label>
                <select :id="`sm-svc-${i}`" v-model="l.service_id" class="ui-select" :data-testid="`sm-svc-${i}`" @change="onService(l)">
                  <option value="">Typed item (not in the catalogue)…</option>
                  <option v-for="s in catalog" :key="s.id" :value="s.id">{{ s.name }} — {{ money(s.price, s.currency) }}</option>
                </select>
              </div>
              <div class="ui-field">
                <label :for="`sm-desc-${i}`">On the invoice</label>
                <input :id="`sm-desc-${i}`" v-model="l.description" class="ui-input" :placeholder="l.service_id ? serviceOf(l)?.label : 'e.g. .co.ke domain renewal'" :data-testid="`sm-desc-${i}`" />
              </div>
              <div class="ui-field qty">
                <label :for="`sm-qty-${i}`">Qty</label>
                <input :id="`sm-qty-${i}`" v-model.number="l.quantity" class="ui-input" type="number" min="0.01" step="any" />
              </div>
              <div class="ui-field price">
                <label :for="`sm-price-${i}`">Price per {{ periodNoun(f.period) }}</label>
                <div class="price__row">
                  <input :id="`sm-price-${i}`" v-model="l.price" class="ui-input num" type="number" min="0" step="any" :data-testid="`sm-price-${i}`" />
                  <span class="cur">{{ currency }}</span>
                </div>
              </div>
              <div class="ui-field tax">
                <label :for="`sm-tax-${i}`">{{ taxLabel }} %</label>
                <input :id="`sm-tax-${i}`" v-model.number="l.tax_rate" class="ui-input num" type="number" min="0" max="100" step="any" />
              </div>
              <button v-if="f.lines.length > 1" type="button" class="ui-btn ui-btn--ghost ui-btn--icon rm" :aria-label="`Remove service ${i + 1}`" @click="f.lines.splice(i, 1)"><i class="fa-regular fa-trash-can"></i></button>
            </div>
            <p v-if="l.service_id && quoteNote(l)" class="ui-hint">{{ quoteNote(l) }}</p>
          </div>
        </section>

        <section class="sec">
          <h3><i class="fa-solid fa-calendar-days"></i> Billing</h3>
          <div class="ui-grid-3">
            <div class="ui-field">
              <label for="sm-period">Billing period</label>
              <select id="sm-period" v-model="f.period" class="ui-select" :disabled="locked" data-testid="sm-period" @change="requote">
                <option v-for="p in PERIODS" :key="p.key" :value="p.key">{{ p.label }}</option>
              </select>
            </div>
            <div class="ui-field">
              <label for="sm-start">Start (first period)</label>
              <input id="sm-start" v-model="f.start_date" class="ui-input" type="date" :disabled="locked" data-testid="sm-start" />
            </div>
            <div class="ui-field">
              <label for="sm-currency">Currency</label>
              <select id="sm-currency" v-model="f.currency" class="ui-select" :disabled="locked" data-testid="sm-currency" @change="requote">
                <option value="">Customer's ({{ customerCurrency || home }})</option>
                <optgroup v-for="g in currencyGroups" :key="g.region" :label="g.region">
                  <option v-for="c in g.items" :key="c.code" :value="c.code">{{ c.code }} — {{ c.name }}</option>
                </optgroup>
              </select>
            </div>
          </div>
          <div class="ui-grid-3">
            <div class="ui-field">
              <label for="sm-terms">Payment terms</label>
              <select id="sm-terms" v-model.number="f.payment_terms_days" class="ui-select" data-testid="sm-terms">
                <option :value="0">Due when the period starts</option>
                <option v-for="d in [3, 7, 14, 30]" :key="d" :value="d">{{ d }} days after it starts</option>
                <option v-if="![0, 3, 7, 14, 30].includes(f.payment_terms_days)" :value="f.payment_terms_days">{{ f.payment_terms_days }} days after it starts</option>
              </select>
            </div>
            <div class="ui-field">
              <label for="sm-grace">Grace period</label>
              <select id="sm-grace" v-model="f.grace_days" class="ui-select" data-testid="sm-grace">
                <option value="">Default ({{ defaultGrace }} days after due)</option>
                <option v-for="d in [0, 3, 5, 7, 10, 14, 21, 30]" :key="d" :value="d">{{ d === 0 ? 'Suspend on the due date' : `${d} days after due` }}</option>
              </select>
            </div>
            <div class="ui-field">
              <label for="sm-lead">Invoice ahead</label>
              <select id="sm-lead" v-model="f.lead_days" class="ui-select">
                <option value="">Default ({{ defaultLead }} days before it starts)</option>
                <option v-for="d in [0, 3, 7, 10, 14, 21, 30]" :key="d" :value="d">{{ d }} days before it starts</option>
              </select>
            </div>
          </div>
          <div class="switches">
            <label class="ui-switch"><input v-model="f.auto_send" type="checkbox" data-testid="sm-autosend" /> <span>Email each invoice with the View / Pay link</span></label>
            <label class="ui-switch"><input v-model="f.auto_suspend" type="checkbox" data-testid="sm-autosuspend" /> <span>Suspend automatically when unpaid after the grace period</span></label>
            <label class="ui-switch"><input v-model="f.prorate" type="checkbox" :disabled="locked" data-testid="sm-prorate" /> <span>Bill on a fixed day — prorate the first period</span></label>
          </div>
          <div v-if="f.prorate" class="ui-field narrow">
            <label for="sm-bday">Billing day of the month</label>
            <select id="sm-bday" v-model.number="f.billing_day" class="ui-select" :disabled="locked">
              <option v-for="n in 31" :key="n" :value="n">{{ ordinal(n) }}{{ n > 28 ? ' (or the month’s last day)' : '' }}</option>
            </select>
          </div>
          <div v-if="startsInPast && !locked" class="past" data-testid="sm-past">
            <p><i class="fa-solid fa-clock-rotate-left"></i> The start date is in the past.</p>
            <label class="radio"><input v-model="f.bill_past" type="radio" :value="false" /> Start billing at the next renewal — earlier periods were billed before DASYIN</label>
            <label class="radio"><input v-model="f.bill_past" type="radio" :value="true" /> Invoice the past periods too</label>
          </div>
        </section>

        <section class="sec">
          <h3><i class="fa-solid fa-server"></i> Sites and domains</h3>
          <div class="ui-grid-2">
            <div class="ui-field">
              <label for="sm-site">Hosted site (suspended when unpaid)</label>
              <input id="sm-site" v-model.trim="f.site_domain" class="ui-input" list="sm-sites" placeholder="e.g. wanjiku.co.ke" data-testid="sm-site" @change="onSite" />
              <datalist id="sm-sites">
                <option v-for="s in sites" :key="s.domain" :value="s.domain">{{ s.plan }}{{ s.customer_name ? ' · ' + s.customer_name : '' }}</option>
              </datalist>
              <span v-if="sites.length" class="ui-hint">Pick one of your Synergy Wholesale sites, or type a domain.</span>
            </div>
            <div class="ui-field">
              <label for="sm-domain">Registered domain (renewal reminders)</label>
              <input id="sm-domain" v-model.trim="f.domain" class="ui-input" placeholder="If different from the site, or a domain only" data-testid="sm-domain" />
            </div>
          </div>
          <div class="ui-grid-3">
            <div class="ui-field">
              <label for="sm-supplier">Hosted at</label>
              <select id="sm-supplier" v-model="f.supplier" class="ui-select" data-testid="sm-supplier">
                <option v-for="s in SUPPLIERS" :key="s.key" :value="s.key">{{ s.label }}</option>
              </select>
            </div>
            <div class="ui-field">
              <label for="sm-splan">Plan at the provider</label>
              <input id="sm-splan" v-model.trim="f.supplier_plan" class="ui-input" placeholder="e.g. Micro Env" />
            </div>
            <div class="ui-field">
              <label for="sm-dexp">Domain expires</label>
              <input id="sm-dexp" v-model="f.domain_expiry" class="ui-input" type="date" />
              <span class="ui-hint">Synergy's own date is used when it lists the domain.</span>
            </div>
          </div>
          <div class="ui-field">
            <label for="sm-more">More hosted sites (optional, comma-separated)</label>
            <input id="sm-more" v-model="f.domains" class="ui-input" placeholder="e.g. shop.wanjiku.co.ke, wanjiku.com" />
          </div>
          <p class="ui-hint"><i class="fa-solid fa-circle-info"></i> {{ supplierHint }}</p>
          <div class="ui-grid-2">
            <div class="ui-field">
              <label for="sm-name">Name (optional)</label>
              <input id="sm-name" v-model="f.name" class="ui-input" :placeholder="autoName" />
            </div>
            <div class="ui-field">
              <label for="sm-cost">What it costs you a month (optional, {{ home }})</label>
              <input id="sm-cost" v-model="f.cost_monthly" class="ui-input num" type="number" min="0" step="any" placeholder="From Synergy's charges when linked" />
            </div>
          </div>
          <div class="ui-field">
            <label for="sm-notes">Notes</label>
            <textarea id="sm-notes" v-model="f.notes" class="ui-textarea" rows="2"></textarea>
          </div>
        </section>

        <div class="summary" data-testid="sm-summary">
          <div>
            <span class="lbl">Per {{ periodNoun(f.period) }}</span>
            <strong class="num">{{ estimate }}</strong>
          </div>
          <div>
            <span class="lbl">First invoice</span>
            <strong>{{ firstInvoiceText }}</strong>
          </div>
          <div>
            <span class="lbl">Suspended if unpaid</span>
            <strong>{{ suspendText }}</strong>
          </div>
        </div>
      </div>
      <div class="ui-modal__foot">
        <button type="button" class="ui-btn" @click="close">Cancel</button>
        <button type="submit" class="ui-btn ui-btn--primary" :disabled="saving" data-testid="sm-save">
          <i :class="saving ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-check'"></i> {{ editing ? 'Save changes' : 'Create subscription' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script>
import CustomerPicker from './CustomerPicker.vue'
import { subscriptionsApi, PERIODS, SUPPLIERS, periodNoun, todayISO, daysBetween } from '@/services/subscriptions'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { currencyGroups, formatCurrency } from '@/utils/currencies'
import { orgCurrency } from '@/utils/orgDefaults'
import { formatDate, addDays } from '@/utils/format'

let seq = 0
const blankLine = (tax = 0) => ({ key: ++seq, service_id: '', description: '', quantity: 1, price: '', tax_rate: tax, quoted: null })

function addMonths(iso, n, day) {
  const [y, m] = iso.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1 + n, 1))
  const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate()
  t.setUTCDate(Math.min(day, last))
  return t.toISOString().slice(0, 10)
}

export default {
  name: 'SubscriptionModal',
  components: { CustomerPicker },
  props: {
    sub: { type: Object, default: null },
    /** periods (invoices) of the subscription being edited */
    invoiced: { type: Boolean, default: false },
    preset: { type: Object, default: () => ({}) }
  },
  emits: ['close', 'saved'],
  data() {
    return {
      PERIODS,
      SUPPLIERS,
      currencyGroups: currencyGroups(),
      catalog: [],
      quotes: {},
      tax: { default_tax_rate: 0, prices_include_tax: false, tax_label: 'Tax' },
      loadingCatalog: true,
      sites: [],
      settings: null,
      customer: null,
      error: '',
      saving: false,
      presetName: this.preset.customer_name || '',
      f: this.initial()
    }
  },
  computed: {
    editing() {
      return !!this.sub
    },
    locked() {
      return this.editing && this.invoiced
    },
    home() {
      return orgCurrency()
    },
    customerCurrency() {
      return this.customer?.currency || ''
    },
    currency() {
      return this.f.currency || this.sub?.currency || this.customerCurrency || this.home
    },
    taxLabel() {
      return this.tax.tax_label || 'Tax'
    },
    period() {
      return PERIODS.find((p) => p.key === this.f.period) || PERIODS[0]
    },
    defaultLead() {
      const st = this.settings || { lead_monthly: 7, lead_quarterly: 7, lead_yearly: 14 }
      return { monthly: st.lead_monthly, quarterly: st.lead_quarterly, yearly: st.lead_yearly }[this.f.period] ?? 7
    },
    defaultGrace() {
      return this.settings?.grace_days ?? 7
    },
    lead() {
      const l = this.f.lead_days === '' || this.f.lead_days === null ? this.defaultLead : Number(this.f.lead_days)
      return Math.min(l, this.period.months * 28 - 1)
    },
    grace() {
      return this.f.grace_days === '' || this.f.grace_days === null ? this.defaultGrace : Number(this.f.grace_days)
    },
    startsInPast() {
      return !!this.f.start_date && this.f.start_date < todayISO()
    },
    firstPeriodStart() {
      const s = this.f.start_date || todayISO()
      if (this.f.prorate && this.f.billing_day && Number(s.slice(8, 10)) !== this.f.billing_day) return s
      if (this.startsInPast && !this.f.bill_past && !this.locked) {
        const day = Number(s.slice(8, 10))
        let k = 0
        let d = s
        while (d < todayISO() && k < 600) d = addMonths(s, ++k * this.period.months, day)
        return d
      }
      return s
    },
    firstDue() {
      return addDays(this.firstPeriodStart, Number(this.f.payment_terms_days) || 0)
    },
    firstInvoiceText() {
      if (this.locked) return this.sub?.next_invoice_date ? formatDate(this.sub.next_invoice_date) : '—'
      const d = addDays(this.firstPeriodStart, -this.lead)
      return d <= todayISO() ? 'Straight away' : `${formatDate(d)} (${daysBetween(todayISO(), d)} days)`
    },
    suspendText() {
      if (!this.f.auto_suspend) return 'Never (auto-suspend off)'
      return `${formatDate(addDays(this.firstDue, this.grace))} — admins told 3 days before`
    },
    autoName() {
      const names = this.f.lines.map((l) => l.description || this.serviceOf(l)?.label).filter(Boolean)
      const w = this.f.site_domain || this.f.domain
      return names.join(' + ') + (w ? ` — ${w}` : '') || 'From the services and the site'
    },
    estimate() {
      let total = 0
      for (const l of this.f.lines) {
        const price = Number(l.price)
        if (!(price >= 0) || l.price === '' || l.price === null) continue
        const q = Number(l.quantity) || 0
        const tax = this.tax.prices_include_tax ? 0 : Number(l.tax_rate) || 0
        total += price * q * (1 + tax / 100)
      }
      return formatCurrency(total, this.currency) + (this.tax.prices_include_tax ? ' incl. tax' : '')
    },
    supplierHint() {
      if (this.f.supplier === 'synergy') return 'Suspended and unsuspended automatically at Synergy Wholesale through the API when it is connected (Expenses → Sources); otherwise you get a task with the steps.'
      if (this.f.supplier) return 'Suspending and unsuspending at this provider is done by you: you get a task with the exact steps.'
      return 'Set where it is hosted so suspensions happen at the right place.'
    }
  },
  watch: {
    'f.start_date'(v) {
      // A start a few days ago is a new client (bill from the start); an old one is an existing client.
      if (v && v < todayISO()) this.f.bill_past = daysBetween(v, todayISO()) <= 7
    }
  },
  async created() {
    try {
      const [st, sites] = await Promise.all([subscriptionsApi.settings().catch(() => null), subscriptionsApi.synergySites().catch(() => ({ sites: [] }))])
      this.settings = st?.settings || null
      this.sites = (sites.sites || []).filter((s) => s.status !== 'cancelled')
      if (!this.editing && this.settings) {
        if (this.preset.auto_send === undefined) this.f.auto_send = !!this.settings.auto_send
        this.f.auto_suspend = !!this.settings.auto_suspend
      }
      await this.loadCatalog(true)
    } catch (e) {
      this.error = apiErrorMessage(e, 'Could not load the catalogue')
    } finally {
      this.loadingCatalog = false
    }
  },
  methods: {
    periodNoun,
    initial() {
      const s = this.sub
      if (s) {
        return {
          customer_id: s.customer_id,
          name: s.name,
          currency: s.currency,
          period: s.period,
          start_date: (s.start_date || '').slice(0, 10),
          billing_day: s.billing_day,
          prorate: !!s.prorate,
          payment_terms_days: s.payment_terms_days || 0,
          lead_days: s.lead_days ?? '',
          grace_days: s.grace_days ?? '',
          auto_send: !!s.auto_send,
          auto_suspend: !!s.auto_suspend,
          bill_past: false,
          lines: (s.lines || []).map((l) => ({ key: ++seq, service_id: l.service_id || '', description: l.description, quantity: l.quantity, price: l.unit_price ?? l.price ?? '', tax_rate: l.tax_rate ?? 0, quoted: null })),
          site_domain: s.site_domain || '',
          domain: s.domain || '',
          domains: (s.domains || []).join(', '),
          supplier: s.supplier || '',
          supplier_plan: s.supplier_plan || '',
          domain_expiry: (s.domain_expiry || '').slice(0, 10),
          notes: s.notes || '',
          cost_monthly: s.cost_monthly ?? ''
        }
      }
      const p = this.preset || {}
      return {
        customer_id: p.customer_id || '',
        name: '',
        currency: '',
        period: p.period || 'monthly',
        start_date: p.start_date || todayISO(),
        billing_day: 1,
        prorate: false,
        payment_terms_days: 0,
        lead_days: '',
        grace_days: '',
        auto_send: p.auto_send ?? true,
        auto_suspend: true,
        bill_past: false,
        lines: [{ ...blankLine(), service_id: p.service_id || '' }],
        site_domain: p.site_domain || '',
        domain: p.domain || '',
        domains: '',
        supplier: p.supplier || '',
        supplier_plan: p.supplier_plan || '',
        domain_expiry: '',
        notes: '',
        cost_monthly: ''
      }
    },
    money(v, c) {
      return formatCurrency(v, c)
    },
    ordinal(n) {
      const s = ['th', 'st', 'nd', 'rd']
      const v = n % 100
      return n + (s[(v - 20) % 10] || s[v] || s[0])
    },
    serviceOf(l) {
      return this.catalog.find((s) => s.id === l.service_id) || null
    },
    async loadCatalog(first = false) {
      const r = await subscriptionsApi.catalog({ currency: this.currency, period: this.f.period })
      this.catalog = r.services || []
      this.tax = r.tax || this.tax
      this.quotes = {}
      for (const s of this.catalog) this.quotes[s.id] = s
      if (first && !this.editing) {
        // Lines nobody has priced yet get the defaults; a price already typed (or quoted) stays.
        for (const l of this.f.lines) {
          if (l.price !== '' && l.price !== null) continue
          l.tax_rate = this.tax.default_tax_rate || 0
          if (l.service_id) this.onService(l)
        }
      }
    },
    async requote() {
      try {
        await this.loadCatalog()
        // Lines that still show the catalogue's price follow the new period / currency.
        for (const l of this.f.lines) {
          if (l.service_id && (l.price === '' || Number(l.price) === l.quoted)) this.applyQuote(l)
        }
      } catch {
        /* keep the old prices */
      }
    },
    applyQuote(l) {
      const q = this.quotes[l.service_id]
      if (q && q.quote !== null && q.quote !== undefined) {
        l.price = q.quote
        l.quoted = q.quote
      }
    },
    quoteNote(l) {
      const q = this.quotes[l.service_id]
      if (!q) return ''
      const bits = [`Catalogue: ${this.money(q.price, q.currency)}${q.period ? ' ' + q.period : ''}`]
      if (q.quote_note) bits.push(q.quote_note)
      if (l.quoted !== null && Number(l.price) !== l.quoted) bits.push('custom price for this client')
      return bits.join(' · ')
    },
    addLine() {
      this.f.lines.push(blankLine(this.tax.default_tax_rate || 0))
    },
    onService(l) {
      const s = this.serviceOf(l)
      if (!s) return
      if (!l.description || this.catalog.some((c) => c.label === l.description)) l.description = s.label
      this.applyQuote(l)
    },
    onCustomer(c) {
      this.customer = c
      if (!this.editing && c && c.terms != null && !this.f.payment_terms_days) this.f.payment_terms_days = Number(c.terms) || 0
      if (!this.editing) this.requote()
    },
    onSite() {
      const s = this.sites.find((x) => x.domain === this.f.site_domain)
      if (!s) return
      if (!this.f.supplier) this.f.supplier = 'synergy'
      if (!this.f.supplier_plan) this.f.supplier_plan = s.plan
      if (!this.f.customer_id && s.customer_id) this.f.customer_id = s.customer_id
    },
    close() {
      this.$emit('close')
    },
    async save() {
      this.error = ''
      if (!this.f.customer_id) {
        this.error = 'Choose the customer.'
        return
      }
      const lines = []
      for (const [i, l] of this.f.lines.entries()) {
        if (!l.service_id && !String(l.description || '').trim()) {
          this.error = `Service ${i + 1}: choose a catalogue service or describe the item.`
          return
        }
        if (l.price === '' || l.price === null || !(Number(l.price) >= 0)) {
          this.error = `Service ${i + 1}: enter the price per ${periodNoun(this.f.period)}.`
          return
        }
        lines.push({ service_id: l.service_id, description: l.description, quantity: Number(l.quantity) || 1, unit_price: Number(l.price), tax_rate: Number(l.tax_rate) || 0 })
      }
      const body = {
        customer_id: this.f.customer_id,
        name: this.f.name,
        currency: this.f.currency,
        period: this.f.period,
        start_date: this.f.start_date,
        billing_day: this.f.prorate ? this.f.billing_day : 0,
        prorate: this.f.prorate,
        payment_terms_days: Number(this.f.payment_terms_days) || 0,
        lead_days: this.f.lead_days === '' || this.f.lead_days === null ? null : Number(this.f.lead_days),
        grace_days: this.f.grace_days === '' || this.f.grace_days === null ? null : Number(this.f.grace_days),
        auto_send: this.f.auto_send,
        auto_suspend: this.f.auto_suspend,
        lines,
        site_domain: this.f.site_domain,
        domain: this.f.domain,
        domains: String(this.f.domains || '')
          .split(/[\s,;]+/)
          .map((x) => x.trim())
          .filter(Boolean),
        supplier: this.f.supplier,
        supplier_plan: this.f.supplier_plan,
        domain_expiry: this.f.domain_expiry || '',
        notes: this.f.notes,
        cost_monthly: this.f.cost_monthly === '' || this.f.cost_monthly === null ? null : Number(this.f.cost_monthly),
        bill_past_periods: this.startsInPast ? !!this.f.bill_past : null
      }
      this.saving = true
      try {
        const out = this.editing ? await subscriptionsApi.update(this.sub.id, body) : await subscriptionsApi.create(body)
        toast.success(this.editing ? `${out.number} saved` : `${out.number} created — ${out.next_invoice_date && out.next_invoice_date <= todayISO() ? 'the first invoice goes out now' : 'the first invoice goes out on ' + formatDate(out.next_invoice_date)}`)
        this.$emit('saved', out)
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not save the subscription')
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

<style scoped>
.sec {
  padding: 4px 0 14px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 14px;
}
.sec:last-of-type {
  border-bottom: 0;
}
.sec h3 {
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-2);
  margin: 0 0 10px;
}
.sec h3 i {
  color: var(--accent);
  margin-right: 6px;
}
.sec__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}
.sec__head h3 {
  margin: 0;
}
.line {
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface-2);
  margin-bottom: 8px;
}
.line__grid {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 2fr) 70px 160px 80px auto;
  gap: 10px;
  align-items: end;
}
.line__grid .ui-field {
  margin: 0;
}
.line .ui-hint {
  margin: 6px 0 0;
}
.price__row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.cur {
  font-size: 12px;
  color: var(--text-3);
  font-weight: 600;
}
.num {
  font-variant-numeric: tabular-nums;
}
.rm {
  align-self: end;
}
.switches {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 22px;
  margin: 4px 0 10px;
}
.narrow {
  max-width: 280px;
}
.past {
  margin-top: 8px;
  padding: 10px 12px;
  border-radius: var(--radius);
  background: var(--warning-soft);
  color: var(--text);
}
.past p {
  margin: 0 0 6px;
  font-weight: 600;
}
.past i {
  color: var(--warning);
  margin-right: 6px;
}
.radio {
  display: flex;
  gap: 8px;
  align-items: baseline;
  font-size: 13.5px;
  margin: 4px 0;
}
.summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  padding: 12px;
  border-radius: var(--radius);
  background: var(--accent-soft);
}
.summary .lbl {
  display: block;
  font-size: 11.5px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-2);
}
.summary strong {
  font-size: 15px;
}
@media (max-width: 760px) {
  .line__grid {
    grid-template-columns: 1fr 1fr;
  }
  .line__grid .ui-field:first-child,
  .line__grid .ui-field:nth-child(2) {
    grid-column: 1 / -1;
  }
  .summary {
    grid-template-columns: 1fr;
  }
}
</style>
