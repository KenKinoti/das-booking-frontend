<template>
  <div data-testid="opportunities">
    <div v-if="error" class="ui-alert ui-alert--danger mb"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span></div>

    <div class="kpis">
      <KpiCard label="Estimated value" icon="fa-solid fa-sack-dollar" tone="success" :loading="!d" :value="m(d?.total_value)" meta="Sum of the opportunities below (excl. risks)" :show-delta="false" data-kpi="total" />
      <KpiCard label="Opportunities" icon="fa-solid fa-lightbulb" tone="warning" :loading="!d" :value="String(d?.opportunities.length || 0)" :meta="`${high} high priority`" :show-delta="false" data-kpi="count" />
      <KpiCard label="Pipeline" icon="fa-solid fa-filter-circle-dollar" tone="info" :loading="!d" :value="m(p?.open_value)" :meta="pipeMeta" :show-delta="false" data-kpi="pipeline" />
      <KpiCard label="Renewals, 90 days" icon="fa-solid fa-rotate" :loading="!d" :value="String(d?.renewal_calendar.length || 0)" :meta="`${m(renewValue, true)} to bill`" :show-delta="false" data-kpi="renewals" />
    </div>

    <div class="types" role="tablist" aria-label="Opportunity type">
      <button type="button" class="tchip" :class="{ on: !type }" @click="setType('')">All <span>{{ d?.opportunities.length || 0 }}</span></button>
      <button v-for="(t, k) in presentTypes" :key="k" type="button" class="tchip" :class="{ on: type === k }" :data-type="k" @click="setType(k)">
        <i :class="t.icon"></i> {{ t.label }} <span>{{ t.n }}</span>
      </button>
    </div>

    <div v-if="!d" class="ui-skeleton" style="height: 320px"></div>
    <div v-else-if="!list.length" class="ui-card">
      <div class="ui-empty">
        <div class="ui-empty__icon ok"><i class="fa-solid fa-check"></i></div>
        <h3>No open signals{{ type ? ' of this type' : '' }}</h3>
        <p>As invoices, quotes, payments and Synergy data come in, opportunities will appear here.</p>
      </div>
    </div>
    <div v-else class="opps">
      <article v-for="o in list" :key="o.key" class="ui-card opp" :class="'sev-' + o.severity" :data-opp="o.key">
        <div class="opp__head">
          <span class="opp__icon"><i :class="(OPP_TYPES[o.type] || {}).icon"></i></span>
          <div class="opp__title">
            <h3>{{ o.title }}</h3>
            <p>{{ o.summary }}</p>
          </div>
          <div class="opp__val">
            <strong>{{ m(o.value, true) }}</strong>
            <small>{{ KIND[o.value_kind] }}</small>
            <span class="ui-badge" :class="SEV[o.severity].cls">{{ SEV[o.severity].label }}</span>
          </div>
        </div>
        <p class="basis"><i class="fa-solid fa-calculator"></i> {{ o.value_basis }}</p>
        <ul class="items">
          <li v-for="(it, i) in shown(o)" :key="o.key + i" class="item">
            <div class="item__main">
              <strong>{{ it.name }}</strong>
              <small>{{ it.detail }}</small>
            </div>
            <span class="item__val">{{ m(it.value, true) }}</span>
            <div class="item__act">
              <button
                v-if="it.quote && canQuote"
                type="button"
                class="ui-btn ui-btn--sm ui-btn--primary"
                :disabled="busy === o.key + i"
                data-action="quote"
                @click="createQuote(it.quote, o.key + i)"
              >
                <i :class="busy === o.key + i ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-file-signature'"></i> Quote
              </button>
              <button v-if="it.link_site && it.domain" type="button" class="ui-btn ui-btn--sm" data-action="link-site" @click="openLink(it)"><i class="fa-solid fa-link"></i> Link client</button>
              <router-link v-if="it.link" :to="it.customer_id && it.link.startsWith('/customers') ? `/customers?customer=${it.customer_id}` : it.link" class="ui-btn ui-btn--sm ui-btn--ghost" data-action="open">Open</router-link>
            </div>
          </li>
        </ul>
        <div class="opp__foot">
          <button v-if="o.items.length > 3" type="button" class="ui-btn ui-btn--ghost ui-btn--sm" @click="toggle(o.key)">
            {{ open[o.key] ? 'Show fewer' : `Show all ${o.items.length}` }}
          </button>
          <span class="grow"></span>
          <router-link :to="o.link" class="ui-btn ui-btn--sm">{{ o.action_text }} <i class="fa-solid fa-arrow-right"></i></router-link>
        </div>
      </article>
    </div>

    <div v-if="d" class="grid2">
      <section class="ui-card">
        <div class="ui-card__head">
          <div>
            <h2>Renewal calendar</h2>
            <span class="sub">Domains, hosting, SSL (Expenses → Renewals) and recurring invoices, next 90 days</span>
          </div>
        </div>
        <div v-if="!d.renewal_calendar.length" class="ui-empty small"><p>Nothing renews in the next 90 days.</p></div>
        <div v-else class="ui-table-wrap">
          <table class="ui-table" data-testid="renewals">
            <thead>
              <tr><th>Date</th><th>What</th><th class="hide-sm">Client</th><th class="num">Price</th></tr>
            </thead>
            <tbody>
              <tr v-for="(r, i) in d.renewal_calendar.slice(0, 30)" :key="i" class="is-clickable" @click="$router.push(r.link)">
                <td class="nowrap">{{ day(r.date) }}<small class="muted block">in {{ r.days_left }} days</small></td>
                <td>{{ r.name }}<small class="muted block">{{ KINDS[r.kind] || r.kind }}</small></td>
                <td class="hide-sm">{{ r.client || '—' }}</td>
                <td class="num">{{ r.price ? m(r.price) : r.cost ? 'cost ' + m(r.cost) : '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      <section class="ui-card">
        <div class="ui-card__head">
          <div>
            <h2>Quote pipeline</h2>
            <span class="sub">Open quotes and your win rate over the last 12 months</span>
          </div>
          <router-link to="/quotes" class="ui-btn ui-btn--ghost ui-btn--sm">Quotes</router-link>
        </div>
        <div class="ui-card__body pipe">
          <div><small>Open</small><strong>{{ p.open_count }}</strong><span>{{ m(p.open_value) }}</span></div>
          <div><small>Expired, not decided</small><strong>{{ p.expired_count }}</strong><span>{{ m(p.expired_value) }}</span></div>
          <div><small>Win rate (12 mo)</small><strong>{{ p.conversion_pct == null ? '—' : pct(p.conversion_pct) }}</strong><span>{{ p.won_12m }} won · {{ p.lost_12m }} lost</span></div>
          <div><small>Expected value</small><strong>{{ m(p.expected_value, true) }}</strong><span>{{ p.avg_days_to_close == null ? '' : `closes in ~${Math.round(p.avg_days_to_close)} days` }}</span></div>
        </div>
      </section>
    </div>

    <div v-if="link" class="ui-modal-backdrop" @mousedown.self="link = null">
      <div class="ui-modal" role="dialog" aria-modal="true" aria-labelledby="link-title">
        <div class="ui-modal__head">
          <h2 id="link-title">Link {{ link.domain }} to a client</h2>
          <button class="ui-btn ui-btn--icon ui-btn--ghost" type="button" aria-label="Close" @click="link = null"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="ui-modal__body">
          <div class="ui-field">
            <label for="cust-q">Find the client</label>
            <div class="ui-input-group">
              <i class="fa-solid fa-magnifying-glass"></i>
              <input id="cust-q" v-model="custQ" class="ui-input" placeholder="Name or email" @input="searchCustomers" />
            </div>
          </div>
          <div class="custs">
            <label v-for="c in customers" :key="c.id" class="cust" :class="{ on: link.customer_id === c.id }">
              <input v-model="link.customer_id" type="radio" :value="c.id" name="cust" />
              <span>{{ c.company_name || [c.first_name, c.last_name].join(' ') }}</span>
              <small>{{ c.email }}</small>
            </label>
            <p v-if="!customers.length" class="ui-hint">No customers found.</p>
          </div>
          <label class="ui-switch nc"><input v-model="link.no_client" type="checkbox" /> It’s my own / internal site (not a client’s)</label>
          <div v-if="linkError" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ linkError }}</span></div>
        </div>
        <div class="ui-modal__foot">
          <button class="ui-btn" type="button" @click="link = null">Cancel</button>
          <button class="ui-btn ui-btn--primary" type="button" :disabled="linkSaving || (!link.customer_id && !link.no_client)" data-testid="save-link" @click="saveLink">Save</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import KpiCard from '@/components/dashboard/KpiCard.vue'
import { insightsApi, OPP_TYPES } from '@/services/insights'
import { invoicingApi } from '@/services/invoicing'
import { expensesApi } from '@/services/expenses'
import api, { apiErrorMessage, listFrom } from '@/services/api'
import { toast } from '@/composables/useToast'
import { hasModule } from '@/composables/useEntitlements'
import { money, pct, day } from '@/components/analytics/fmt'

const SEV = { high: { label: 'High', cls: 'ui-badge--danger' }, medium: { label: 'Medium', cls: 'ui-badge--warning' }, low: { label: 'Low', cls: 'ui-badge--info' } }
const KIND = { per_year: 'per year', one_off: 'one-off', at_risk: 'at risk' }
const KINDS = { domain: 'Domain', hosting: 'Hosting', ssl: 'SSL', other: 'Renewal', recurring_invoice: 'Recurring invoice' }

export default {
  name: 'OpportunitiesPanel',
  components: { KpiCard },
  data() {
    return { d: null, error: '', open: {}, busy: '', link: null, linkSaving: false, linkError: '', custQ: '', customers: [], searchTimer: null, OPP_TYPES, SEV, KIND, KINDS }
  },
  computed: {
    type() {
      return OPP_TYPES[this.$route.query.type] ? this.$route.query.type : ''
    },
    list() {
      const l = this.d?.opportunities || []
      return this.type ? l.filter((o) => o.type === this.type) : l
    },
    presentTypes() {
      const out = {}
      ;(this.d?.opportunities || []).forEach((o) => {
        const t = OPP_TYPES[o.type]
        if (!t) return
        out[o.type] = out[o.type] || { ...t, n: 0 }
        out[o.type].n++
      })
      return out
    },
    high() {
      return (this.d?.opportunities || []).filter((o) => o.severity === 'high').length
    },
    p() {
      return this.d?.pipeline || {}
    },
    pipeMeta() {
      const p = this.p
      return `${p.open_count || 0} open · win rate ${p.conversion_pct == null ? '—' : pct(p.conversion_pct, 0)}`
    },
    renewValue() {
      return (this.d?.renewal_calendar || []).reduce((s, r) => s + (r.price || r.cost * 1.3 || 0), 0)
    },
    canQuote() {
      return hasModule('invoicing')
    }
  },
  created() {
    this.load()
  },
  methods: {
    pct,
    day,
    m(v, c = false) {
      return money(v, this.d?.currency, c)
    },
    setType(t) {
      this.$router.replace({ query: { ...this.$route.query, type: t || undefined } })
    },
    shown(o) {
      return this.open[o.key] ? o.items : o.items.slice(0, 3)
    },
    toggle(k) {
      this.open = { ...this.open, [k]: !this.open[k] }
    },
    async load() {
      try {
        this.d = await insightsApi.opportunities()
        this.error = ''
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load opportunities.')
      }
    },
    async createQuote(q, key) {
      this.busy = key
      try {
        const doc = await invoicingApi.create({
          doc_type: 'quote',
          customer_id: q.customer_id,
          client_name: q.client_name,
          currency: q.currency,
          title: q.title,
          items: [{ description: q.description, quantity: q.quantity || 1, unit_price: q.unit_price }]
        })
        toast.success(`Draft quote ${doc?.number || ''} created — review and send it`)
        if (doc?.id) this.$router.push(`/quotes/${doc.id}/edit`)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not create the quote'))
      } finally {
        this.busy = ''
      }
    },
    openLink(it) {
      this.link = { domain: it.domain, customer_id: '', no_client: false }
      this.linkError = ''
      this.custQ = (it.domain || '').split('.')[0]
      this.searchCustomers()
    },
    searchCustomers() {
      clearTimeout(this.searchTimer)
      this.searchTimer = setTimeout(async () => {
        try {
          const r = await api.get('/customers', { params: { search: this.custQ, limit: 20 } })
          this.customers = listFrom(r, 'customers')
          if (!this.customers.length && this.custQ) {
            const all = await api.get('/customers', { params: { limit: 20 } })
            this.customers = listFrom(all, 'customers')
          }
        } catch {
          this.customers = []
        }
      }, 250)
    },
    async saveLink() {
      this.linkSaving = true
      this.linkError = ''
      try {
        // Keep the site's manual price and notes (the endpoint replaces all fields).
        const cur = await expensesApi.synergySite(this.link.domain).catch(() => null)
        const st = cur?.site || {}
        const keep = { price: st.price ?? null, price_currency: st.price_currency || '', notes: st.notes || '' }
        await expensesApi.saveSynergySite(this.link.domain, this.link.no_client ? { ...keep, no_client: true, customer_id: '' } : { ...keep, customer_id: this.link.customer_id, no_client: false })
        toast.success(`${this.link.domain} linked`)
        this.link = null
        this.load()
      } catch (e) {
        this.linkError = apiErrorMessage(e, 'Could not link the site')
      } finally {
        this.linkSaving = false
      }
    }
  }
}
</script>

<style scoped>
.mb {
  margin-bottom: 16px;
}

.kpis {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.types {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 14px;
}

.tchip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-2);
  font-size: 12.5px;
  font-weight: 550;
  cursor: pointer;
}

.tchip span {
  font-size: 11px;
  background: var(--bg-subtle);
  border-radius: 999px;
  padding: 0 7px;
  color: var(--text-3);
}

.tchip.on {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--accent-soft);
}

.opps {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 16px;
  align-items: start;
}

.opp {
  min-width: 0;
  padding: 16px;
  border-left: 3px solid var(--border-strong);
}

.opp.sev-high {
  border-left-color: var(--danger);
}

.opp.sev-medium {
  border-left-color: var(--warning);
}

.opp.sev-low {
  border-left-color: var(--info);
}

.opp__head {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.opp__icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: var(--accent-soft);
  color: var(--accent);
  flex-shrink: 0;
}

.opp__title {
  flex: 1;
  min-width: 0;
}

.opp__title h3 {
  font-size: 15px;
  margin: 0 0 2px;
}

.opp__title p {
  margin: 0;
  font-size: 12.5px;
  color: var(--text-2);
}

.opp__val {
  text-align: right;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.opp__val strong {
  font-size: 18px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.opp__val small {
  font-size: 11px;
  color: var(--text-3);
}

.basis {
  margin: 10px 0 6px;
  font-size: 12px;
  color: var(--text-3);
}

.basis i {
  margin-right: 4px;
}

.items {
  list-style: none;
  margin: 0;
  padding: 0;
}

.item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 4px 10px;
  padding: 9px 0;
  border-top: 1px solid var(--border);
  align-items: center;
}

.item__main strong {
  display: block;
  font-size: 13.5px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item__main small {
  display: block;
  font-size: 12px;
  color: var(--text-3);
}

.item__val {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  font-size: 13px;
  white-space: nowrap;
}

.item__act {
  grid-column: 1 / -1;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.opp__foot {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.grow {
  flex: 1;
}

.grid2 {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.grid2 > .ui-card {
  min-width: 0;
}

.sub {
  display: block;
  font-size: 12px;
  color: var(--text-3);
  margin-top: 2px;
}

.pipe {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.pipe small {
  display: block;
  font-size: 11.5px;
  color: var(--text-3);
}

.pipe strong {
  display: block;
  font-size: 20px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.pipe span {
  font-size: 12px;
  color: var(--text-2);
}

.muted {
  color: var(--text-3);
}

.block {
  display: block;
}

.nowrap {
  white-space: nowrap;
}

.ok {
  background: var(--success-soft);
  color: var(--success);
}

.custs {
  max-height: 260px;
  overflow: auto;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  margin: 8px 0 12px;
}

.cust {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0 8px;
  padding: 8px 10px;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
}

.cust input {
  grid-row: span 2;
  align-self: center;
}

.cust small {
  color: var(--text-3);
}

.cust.on {
  background: var(--accent-soft);
}

.nc {
  margin-bottom: 8px;
}

@media (max-width: 1100px) {
  .kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .opps,
  .grid2 {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 600px) {
  .hide-sm {
    display: none;
  }

  .kpis {
    gap: 10px;
  }

  .opp__head {
    flex-wrap: wrap;
  }

  .opp__val {
    width: 100%;
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;
    gap: 8px;
  }
}
</style>
