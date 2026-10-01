<template>
  <div class="ui-modal-backdrop" @mousedown.self="$emit('close')">
    <div class="ui-modal dviz" style="max-width: 960px" role="dialog" aria-modal="true" aria-labelledby="vendor-title" data-testid="vendor-detail">
      <div class="ui-modal__head">
        <div>
          <div class="ui-eyebrow">Vendor</div>
          <h2 id="vendor-title">{{ d?.vendor?.name || 'Vendor' }}</h2>
        </div>
        <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="$emit('close')"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="ui-modal__body">
        <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>
        <div v-if="!d && !error" class="ui-skeleton" style="height: 300px"></div>
        <template v-else-if="d">
          <div class="stats">
            <div><span>Year to date</span><strong>{{ money(d.ytd, cur) }}</strong></div>
            <div><span>All time</span><strong>{{ money(d.total, cur) }}</strong><small>{{ d.count }} approved</small></div>
            <div v-if="d.subscriptions.length"><span>Annualised</span><strong>{{ money(annual, cur) }}</strong><small>{{ d.subscriptions.length }} subscription{{ d.subscriptions.length === 1 ? '' : 's' }}</small></div>
            <div><span>Category</span><strong class="cat">{{ cat.label }}</strong></div>
          </div>
          <div v-if="d.vendor.key !== 'synergy'" class="rule" data-testid="vendor-rule">
            <label class="ui-switch">
              <input v-model="rule.on" type="checkbox" data-testid="vendor-auto" />
              <span>Approve new invoices automatically</span>
            </label>
            <span class="rule__pct">when within ±<input v-model.number="rule.pct" type="number" min="1" max="100" step="1" class="ui-input tiny" aria-label="Tolerance in percent" :disabled="!rule.on" />% of the last approved one</span>
            <button type="button" class="ui-btn ui-btn--sm" :disabled="ruleSaving || !ruleDirty" @click="saveRule">{{ ruleSaving ? 'Saving…' : 'Save rule' }}</button>
            <span class="muted rule__hint">The first invoice is always approved by you; one outside the range waits in the Inbox with the reason.</span>
          </div>
          <h3>Monthly spend (excl. tax, {{ cur }})</h3>
          <BarChart :labels="d.months.map((m) => m.month)" :values="d.months.map((m) => m.amount)" :height="170" :color="cat.color" value-name="Spend"
            :format-x="(m) => monthLabel(m)" :format-title="(m) => monthLabel(m, true)" :format-y="(v) => money(v, cur, true)" :format-value="(v) => money(v, cur)" aria-label="Monthly spend with this vendor" />

          <div v-if="d.subscriptions.length" class="subs">
            <div v-for="s in d.subscriptions" :key="s.key" class="sub">
              <i class="fa-solid fa-repeat"></i>
              <div>
                <strong>{{ s.service }}</strong>
                <span>{{ s.interval }} · last {{ formatDate(s.last_date) }} {{ money(s.last_original, s.currency) }} · next {{ formatDate(s.next_date) }}</span>
              </div>
              <span v-if="s.change_pct" class="ui-badge" :class="s.change_pct > 5 ? 'ui-badge--danger' : 'ui-badge--info'">{{ pct(s.change_pct) }}</span>
            </div>
          </div>

          <h3>Timeline</h3>
          <div class="ui-table-wrap">
            <table class="ui-table">
              <thead>
                <tr><th>Date</th><th>Invoice</th><th>What</th><th>Status</th><th class="num">Amount</th><th class="num">{{ cur }} excl. tax</th><th>Document</th></tr>
              </thead>
              <tbody>
                <tr v-for="it in d.items" :key="it.id" class="is-clickable" @click="$emit('open', it.id)">
                  <td>{{ formatDate(it.invoice_date) }}</td>
                  <td>{{ it.invoice_number || '—' }}</td>
                  <td class="what">{{ it.service }}</td>
                  <td><span class="ui-badge" :class="'ui-badge--' + STATUS_BADGE[it.status]">{{ STATUS_LABEL[it.status] }}</span></td>
                  <td class="num">{{ it.total ? money(it.total, it.currency) : '—' }}</td>
                  <td class="num">{{ it.status === 'approved' ? money(it.home_net, cur) : '—' }}</td>
                  <td>
                    <button v-if="it.document_id" class="ui-btn ui-btn--ghost ui-btn--sm" type="button" :title="it.document_name" @click.stop="openDoc(it.document_id)"><i class="fa-regular fa-file-lines"></i></button>
                  </td>
                </tr>
                <tr v-if="!d.items.length"><td colspan="7" class="empty">No expenses from this vendor yet.</td></tr>
              </tbody>
            </table>
          </div>
          <template v-if="d.renewals?.length">
            <h3>Renewals</h3>
            <ul class="rens">
              <li v-for="r in d.renewals" :key="r.id">
                <i :class="r.kind === 'hosting' ? 'fa-solid fa-server' : 'fa-solid fa-globe'"></i> {{ r.name }} · {{ formatDate(r.expires_on) }}
                <span class="muted">({{ r.days_left >= 0 ? r.days_left + ' days' : 'expired' }})</span>
              </li>
            </ul>
          </template>
        </template>
      </div>
      <div class="ui-modal__foot">
        <button class="ui-btn" type="button" :disabled="!d" @click="exportCsv"><i class="fa-solid fa-download"></i> Export CSV</button>
        <span class="spacer"></span>
        <button class="ui-btn ui-btn--primary" type="button" @click="$emit('close')">Close</button>
      </div>
    </div>
  </div>
</template>

<script>
import BarChart from '@/components/dashboard/charts/BarChart.vue'
import '@/components/dashboard/dashviz.css'
import { expensesApi, money, monthLabel, pct, categoryOf, STATUS_BADGE, STATUS_LABEL } from '@/services/expenses'
import { apiErrorMessage } from '@/services/api'
import { formatDate, downloadBlob } from '@/utils/format'
import { toast } from '@/composables/useToast'

export default {
  name: 'VendorDetail',
  components: { BarChart },
  props: { vendorId: { type: String, required: true } },
  emits: ['close', 'open'],
  data() {
    return { d: null, error: '', STATUS_BADGE, STATUS_LABEL, rule: { on: false, pct: 20 }, ruleSaving: false }
  },
  computed: {
    cur() {
      return this.d?.currency
    },
    annual() {
      return (this.d?.subscriptions || []).filter((s) => s.status !== 'lapsed').reduce((a, s) => a + s.annualised, 0)
    },
    cat() {
      return categoryOf(this.d?.vendor?.category)
    },
    ruleDirty() {
      const v = this.d?.vendor
      return !!v && (this.rule.on !== !!v.auto_approve || Number(this.rule.pct) !== Number(v.auto_approve_pct || 20))
    }
  },
  async mounted() {
    try {
      this.d = await expensesApi.vendorDetail(this.vendorId)
      this.rule = { on: !!this.d.vendor.auto_approve, pct: this.d.vendor.auto_approve_pct || 20 }
    } catch (e) {
      this.error = apiErrorMessage(e, 'Could not load the vendor')
    }
  },
  methods: {
    money,
    monthLabel,
    pct,
    formatDate,
    async openDoc(id) {
      const w = window.open('', '_blank')
      try {
        const blob = await expensesApi.document(id)
        const url = URL.createObjectURL(blob)
        if (w) w.location.href = url
        setTimeout(() => URL.revokeObjectURL(url), 60000)
      } catch (e) {
        if (w) w.close()
        toast.error(apiErrorMessage(e, 'Could not open the document'))
      }
    },
    async saveRule() {
      const pct = Number(this.rule.pct)
      if (!pct || pct < 1 || pct > 100) return toast.error('Enter a tolerance between 1% and 100%')
      const v = this.d.vendor
      this.ruleSaving = true
      try {
        const nv = await expensesApi.saveVendor(v.id, { category: v.category, senders: v.senders || [], auto_approve: this.rule.on, auto_approve_pct: pct })
        this.d.vendor = { ...v, ...nv }
        toast.success(this.rule.on ? `${v.name}: invoices within ±${pct}% are approved automatically` : `${v.name}: invoices wait for your approval`)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not save the rule'))
      } finally {
        this.ruleSaving = false
      }
    },
    async exportCsv() {
      try {
        const blob = await expensesApi.exportCsv({ vendor_id: this.vendorId, status: 'approved' })
        downloadBlob(blob, `expenses-${(this.d.vendor.name || 'vendor').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Export failed'))
      }
    }
  }
}
</script>

<style scoped>
.rule {
  display: flex;
  gap: 8px 12px;
  align-items: center;
  flex-wrap: wrap;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-subtle);
  margin: 4px 0 12px;
  font-size: 13px;
}
.rule__pct {
  display: inline-flex;
  gap: 4px;
  align-items: center;
}
.rule .tiny {
  width: 64px;
  padding: 3px 6px;
  min-height: 0;
  text-align: right;
}
.rule__hint {
  flex-basis: 100%;
  font-size: 12px;
  color: var(--text-3);
}
.stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 14px;
}
.stats > div {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.stats span,
.stats small {
  color: var(--text-3);
  font-size: 12px;
}
.stats strong {
  font-size: 17px;
  font-variant-numeric: tabular-nums;
}
.stats .cat {
  font-size: 14px;
}
h3 {
  font-size: 14px;
  margin: 16px 0 8px;
}
.subs {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}
.sub {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 8px 12px;
}
.sub > div {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.sub span {
  font-size: 12.5px;
  color: var(--text-3);
}
.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.what {
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.empty {
  text-align: center;
  color: var(--text-3);
}
.rens {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13.5px;
}
.muted {
  color: var(--text-3);
}
.spacer {
  flex: 1;
}
@media (max-width: 640px) {
  .stats {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
