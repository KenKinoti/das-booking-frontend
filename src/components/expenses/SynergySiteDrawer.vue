<template>
  <div class="drawer-backdrop" @mousedown.self="$emit('close')">
    <aside class="drawer dviz" role="dialog" aria-modal="true" aria-labelledby="site-title" data-testid="synergy-site">
      <header class="drawer__head">
        <div class="min0">
          <div class="ui-eyebrow">Hosted site</div>
          <h2 id="site-title">{{ domain }}</h2>
          <div v-if="site" class="chips">
            <span class="ui-badge" :class="statusTone">{{ site.status }}</span>
            <span class="muted">{{ site.plan || 'plan unknown' }}</span>
            <span v-if="site.status_date" class="muted">· since {{ formatDate(site.status_date) }}</span>
          </div>
        </div>
        <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="$emit('close')"><i class="fa-solid fa-xmark"></i></button>
      </header>
      <div class="drawer__body">
        <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>
        <div v-if="!d && !error" class="ui-skeleton" style="height: 320px"></div>
        <template v-else-if="d">
          <div class="stats">
            <div><span>Synergy cost</span><strong>{{ aud(site.total_monthly) }}<small>/mo</small></strong><small v-if="home && home !== 'AUD' && site.cost_home">≈ {{ wholeMoney(site.cost_home, home) }}/mo · {{ aud(site.total_monthly * 12, { whole: true }) }}/yr</small><small v-if="site.domain_monthly">incl. domain {{ aud(site.domain_monthly) }}/mo</small></div>
            <div><span>Billed</span><strong>{{ site.billed != null ? money(site.billed, home) : '—' }}<small v-if="site.billed != null">/mo</small></strong><small>{{ billedNote }}</small></div>
            <div><span>Margin</span><strong :class="site.margin == null ? '' : site.margin < 0 ? 'txt-danger' : 'txt-ok'">{{ site.margin != null ? money(site.margin, home) : '—' }}</strong><small v-if="site.margin_pct != null">{{ site.margin_pct.toFixed(1) }}%</small></div>
            <div><span>Disk</span><strong>{{ site.pct_used != null ? site.pct_used.toFixed(0) + '%' : '—' }}</strong><small v-if="site.usage_mb != null">{{ mb(site.usage_mb) }} of {{ mb(site.limit_mb) }}</small></div>
          </div>

          <ul v-if="d.decisions.length" class="decs">
            <li v-for="x in d.decisions" :key="x.key" :class="'sev-' + x.severity"><strong>{{ x.title }}</strong><span>{{ x.body }}</span></li>
          </ul>

          <section class="block">
            <h3>Client &amp; price</h3>
            <div class="form">
              <label class="ui-field">
                <span class="ui-label">Client</span>
                <select v-model="form.client" class="ui-select" data-testid="site-client">
                  <option value="">Automatic{{ autoName ? ` — ${autoName}` : ' (no match)' }}</option>
                  <option value="__none">Not a client (my own / internal site)</option>
                  <option v-for="c in customers" :key="c.id" :value="c.id">{{ c.name }}</option>
                </select>
                <small class="ui-hint">{{ matchHint }}</small>
              </label>
              <div class="price">
                <label class="ui-field">
                  <span class="ui-label">Monthly price you bill</span>
                  <input v-model="form.price" type="number" min="0" step="0.01" class="ui-input" placeholder="From invoices" data-testid="site-price" />
                </label>
                <label class="ui-field cur">
                  <span class="ui-label">Currency</span>
                  <select v-model="form.currency" class="ui-select">
                    <optgroup v-for="g in currencyGroups" :key="g.region" :label="g.region">
                      <option v-for="c in g.items" :key="c.code" :value="c.code">{{ c.code }}</option>
                    </optgroup>
                  </select>
                </label>
              </div>
              <label class="ui-field">
                <span class="ui-label">Notes</span>
                <textarea v-model="form.notes" class="ui-textarea" rows="2" placeholder="e.g. billed yearly with the domain"></textarea>
              </label>
              <div class="actions">
                <button type="button" class="ui-btn ui-btn--primary" :disabled="saving" data-testid="site-save" @click="save">
                  <i :class="saving ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-check'"></i> Save
                </button>
              </div>
            </div>
          </section>

          <section v-if="d.snapshots.length" class="block">
            <h3>Disk usage</h3>
            <TimeChart :labels="d.snapshots.map((s) => s.snapshot_date.slice(0, 10))" :series="usageSeries" :height="180" :format-y="(v) => mb(v)" :format-value="(v) => mb(v)"
              :format-x="(x) => shortDate(x)" :format-title="(x) => formatDate(x)" aria-label="Disk usage and limit per usage report" />
          </section>

          <section class="block">
            <h3>Timeline</h3>
            <ol class="tl" data-testid="site-timeline">
              <li v-for="e in timeline" :key="e.key" :class="'k-' + e.kind">
                <span class="tl__ic"><i :class="e.icon"></i></span>
                <div class="tl__main">
                  <div class="tl__line"><strong>{{ e.title }}</strong><span v-if="e.amount !== undefined" class="amt" :class="e.amount < 0 ? 'txt-ok' : ''">{{ e.amountText }}</span></div>
                  <small>{{ formatDate(e.date) }}<template v-if="e.sub"> · {{ e.sub }}</template></small>
                </div>
              </li>
              <li v-if="!timeline.length" class="muted">Nothing yet.</li>
            </ol>
          </section>
        </template>
      </div>
    </aside>
  </div>
</template>

<script>
import TimeChart from '@/components/dashboard/charts/TimeChart.vue'
import { expensesApi, money, aud, mb, wholeMoney } from '@/services/expenses'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { formatDate } from '@/utils/format'
import { currencyGroups } from '@/utils/currencies'

const KIND = {
  hosting_monthly: ['fa-solid fa-server', 'Monthly hosting'],
  hosting_prorata_new: ['fa-solid fa-circle-plus', 'Pro-rata (new service)'],
  plan_upgrade: ['fa-solid fa-arrow-up', 'Plan upgrade'],
  plan_downgrade_credit: ['fa-solid fa-arrow-down', 'Plan downgrade'],
  cancellation_credit: ['fa-solid fa-ban', 'Cancelled — pro-rata credit'],
  domain_renewal: ['fa-solid fa-globe', 'Domain renewal'],
  domain_delete: ['fa-solid fa-trash-can', 'Domain deleted'],
  support_fee: ['fa-solid fa-headset', 'Support fee'],
  other: ['fa-solid fa-receipt', 'Other']
}

export default {
  name: 'SynergySiteDrawer',
  components: { TimeChart },
  props: {
    domain: { type: String, required: true },
    customers: { type: Array, default: () => [] },
    home: { type: String, default: 'AUD' }
  },
  emits: ['close', 'saved'],
  data() {
    return { d: null, error: '', saving: false, form: { client: '', price: '', currency: this.home, notes: '' }, currencyGroups: currencyGroups() }
  },
  computed: {
    site() {
      return this.d?.site || null
    },
    statusTone() {
      return { active: 'ui-badge--success', new: 'ui-badge--info', cancelled: 'ui-badge--draft' }[this.site?.status] || 'ui-badge--draft'
    },
    autoName() {
      const s = this.site
      if (!s || s.client_match === 'manual' || s.client_match === 'none') return ''
      return s.customer_name || ''
    },
    matchHint() {
      const s = this.site
      if (!s) return ''
      return (
        {
          manual: 'Linked by you.',
          invoice: 'Matched: invoices to this client mention the domain.',
          website: "Matched by the client's website.",
          email: "Matched by the client's email domain.",
          name: 'Matched by name — check it is right.',
          none: 'Marked as your own site: not counted as unbilled.'
        }[s.client_match] || 'No client matched by invoice, website, email domain or name.'
      )
    },
    billedNote() {
      const s = this.site
      if (!s || s.billed == null) return 'not billed'
      if (s.billed_source === 'manual') return 'price set by you'
      return `from ${s.billed_invoice || 'invoice'} (${formatDate(s.billed_date)})`
    },
    usageSeries() {
      const sn = this.d?.snapshots || []
      return [
        { key: 'use', name: 'Used', values: sn.map((s) => s.usage_mb), color: 'var(--viz-1)', type: 'area' },
        { key: 'lim', name: 'Limit', values: sn.map((s) => s.limit_mb), color: 'var(--viz-8)', dashed: true }
      ]
    },
    timeline() {
      if (!this.d) return []
      const out = []
      for (const t of this.d.transactions) {
        const [icon, label] = KIND[t.kind] || KIND.other
        let title = label
        if (t.plan_from) title = `${label}: ${t.plan_from} → ${t.plan_to}`
        out.push({ key: 't' + t.id, kind: t.kind, icon, title, date: t.date, sub: t.description, amount: t.amount, amountText: t.amount < 0 ? `−${aud(-t.amount)}` : aud(t.amount) })
      }
      for (const s of this.d.snapshots) {
        out.push({ key: 's' + s.id, kind: 'usage', icon: 'fa-solid fa-hard-drive', title: `Usage report: ${mb(s.usage_mb)} of ${mb(s.limit_mb)} (${Math.round(s.pct_used)}%)`, date: s.snapshot_date, sub: s.plan })
      }
      for (const i of this.d.invoices) {
        out.push({ key: 'i' + i.invoice_id + i.description, kind: 'invoice', icon: 'fa-solid fa-file-invoice', title: `Billed on ${i.number || 'invoice'}`, date: i.date, sub: i.description,
          amount: -0, amountText: `${money(i.net_home, this.home)}${i.months > 1 ? ` · ${money(i.monthly_home, this.home)}/mo` : ''}` })
      }
      return out.sort((a, b) => String(b.date).localeCompare(String(a.date)))
    }
  },
  mounted() {
    this.load()
    document.addEventListener('keydown', this.onKey)
  },
  beforeUnmount() {
    document.removeEventListener('keydown', this.onKey)
  },
  methods: {
    money,
    aud,
    wholeMoney,
    mb,
    formatDate,
    shortDate(x) {
      return new Date(x + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
    },
    onKey(e) {
      if (e.key === 'Escape') this.$emit('close')
    },
    async load() {
      this.error = ''
      try {
        this.d = await expensesApi.synergySite(this.domain)
        const s = this.d.site
        this.form = {
          client: s.client_match === 'manual' ? s.customer_id : s.client_match === 'none' ? '__none' : '',
          price: s.price != null ? s.price : '',
          currency: s.price_currency || this.home,
          notes: s.notes || ''
        }
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load the site')
      }
    },
    async save() {
      const price = this.form.price === '' || this.form.price === null ? null : Number(this.form.price)
      if (price !== null && (Number.isNaN(price) || price < 0)) return toast.error('Enter a monthly price of zero or more')
      this.saving = true
      try {
        await expensesApi.saveSynergySite(this.domain, {
          customer_id: this.form.client && this.form.client !== '__none' ? this.form.client : '',
          no_client: this.form.client === '__none',
          price,
          price_currency: this.form.currency,
          notes: this.form.notes
        })
        toast.success('Saved')
        await this.load()
        this.$emit('saved')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not save'))
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

<style scoped>
.drawer-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1200;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  justify-content: flex-end;
}
.drawer {
  width: min(620px, 100vw);
  height: 100%;
  background: var(--surface);
  border-left: 1px solid var(--border);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  animation: slide 0.18s ease-out;
}
@keyframes slide {
  from {
    transform: translateX(24px);
    opacity: 0.6;
  }
}
.drawer__head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 16px 18px 12px;
  border-bottom: 1px solid var(--border);
}
.drawer__head h2 {
  margin: 2px 0 4px;
  font-size: 19px;
  overflow-wrap: anywhere;
}
.min0 {
  min-width: 0;
}
.chips {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
}
.drawer__body {
  padding: 16px 18px 28px;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}
.stats > div {
  background: var(--bg-subtle);
  border-radius: var(--radius-sm);
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.stats span {
  font-size: 12px;
  color: var(--text-3);
}
.stats strong {
  font-size: 16px;
  font-variant-numeric: tabular-nums;
}
.stats strong small {
  font-size: 11px;
  color: var(--text-3);
  font-weight: 500;
}
.stats > div > small {
  font-size: 11.5px;
  color: var(--text-3);
  overflow-wrap: anywhere;
}
.decs {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.decs li {
  border-left: 3px solid var(--info);
  background: var(--bg-subtle);
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 13px;
}
.decs li span {
  color: var(--text-2);
}
.decs .sev-danger {
  border-color: var(--danger);
}
.decs .sev-warning {
  border-color: var(--warning);
}
.decs .sev-success {
  border-color: var(--success);
}
.block h3 {
  font-size: 14px;
  margin: 0 0 8px;
}
.form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.price {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 120px;
  gap: 10px;
}
.actions {
  display: flex;
  justify-content: flex-end;
}
.tl {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}
.tl li {
  display: flex;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
}
.tl__ic {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--bg-subtle);
  color: var(--text-2);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 12px;
}
.k-cancellation_credit .tl__ic,
.k-plan_downgrade_credit .tl__ic {
  color: var(--success);
}
.k-plan_upgrade .tl__ic {
  color: var(--warning);
}
.k-usage .tl__ic {
  color: var(--viz-1);
}
.k-invoice .tl__ic {
  color: var(--accent);
}
.tl__main {
  flex: 1;
  min-width: 0;
}
.tl__line {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 13.5px;
}
.tl__line strong {
  font-weight: 600;
  overflow-wrap: anywhere;
}
.tl small {
  color: var(--text-3);
  font-size: 12px;
  overflow-wrap: anywhere;
}
.amt {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.muted {
  color: var(--text-3);
  font-size: 12.5px;
}
.txt-ok {
  color: var(--success);
}
.txt-danger {
  color: var(--danger);
}
@media (max-width: 640px) {
  .stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .drawer__head,
  .drawer__body {
    padding-left: 14px;
    padding-right: 14px;
  }
}
</style>
