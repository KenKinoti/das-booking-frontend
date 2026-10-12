<template>
  <div class="rp" data-testid="bar-reports">
    <div class="sub-tabs ui-tabs" role="tablist" aria-label="Report">
      <button v-for="t in tabs" :key="t.key" type="button" class="ui-tab" :class="{ 'is-active': view === t.key }" role="tab" :aria-selected="view === t.key" :data-report="t.key" @click="view = t.key"><i :class="t.icon"></i> {{ t.label }}</button>
    </div>

    <div class="toolbar">
      <select v-if="view !== 'slow' && view !== 'night'" v-model="loc" class="ui-select" aria-label="Location" data-testid="rp-loc">
        <option value="">All locations</option>
        <option v-for="l in bar.locations" :key="l.id" :value="l.id">{{ l.name }}</option>
      </select>
      <template v-if="view === 'variance'">
        <select v-model="countId" class="ui-select wide" aria-label="Count" data-testid="rp-count">
          <option value="">Approved counts in the period</option>
          <option v-for="c in counts" :key="c.id" :value="c.id">{{ c.number }} · {{ c.location }} · {{ formatDate(c.business_date, 'short') }}{{ c.status === 'submitted' ? ' (to review)' : '' }}</option>
        </select>
      </template>
      <template v-if="(view === 'variance' && !countId) || view === 'pour'">
        <label class="dt"><span>From</span><input v-model="from" class="ui-input" type="date" :max="to" /></label>
        <label class="dt"><span>To</span><input v-model="to" class="ui-input" type="date" :max="today" /></label>
      </template>
      <select v-if="view === 'slow'" v-model.number="days" class="ui-select" aria-label="Period">
        <option :value="7">Last 7 days</option>
        <option :value="14">Last 14 days</option>
        <option :value="30">Last 30 days</option>
        <option :value="60">Last 60 days</option>
        <option :value="90">Last 90 days</option>
      </select>
      <input v-if="view === 'night'" v-model="nightDate" class="ui-input dt-only" type="date" :max="today" aria-label="Night" />
      <div class="end">
        <button v-if="csvSet" type="button" class="ui-btn ui-btn--sm" data-testid="rp-csv" @click="exportCsv"><i class="fa-solid fa-download"></i> CSV</button>
      </div>
    </div>

    <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span></div>
    <div v-else-if="loading && !d" class="ui-skeleton" style="height: 280px"></div>

    <!-- Variance -->
    <template v-else-if="view === 'variance' && d">
      <div v-if="!(d.items || []).length" class="ui-empty small" data-testid="variance-empty">
        <div class="ui-empty__icon"><i class="fa-solid fa-scale-unbalanced"></i></div>
        <h3>No counted variance here</h3>
        <p>Variance comes from approved stock counts. Count a bar, approve the count, and the losses and gains show up here.</p>
      </div>
      <template v-else>
        <div class="stats" data-testid="variance-totals">
          <div v-if="perm.approve"><span>Net variance</span><strong :class="tone(t.variance_value)" data-testid="var-net">{{ signedMoney(t.variance_value) }}</strong><small>counted − expected, at cost</small></div>
          <div v-if="perm.approve"><span>Losses</span><strong class="neg" data-testid="var-loss">{{ money(t.loss_value) }}</strong><small>gains {{ money(t.gain_value) }}</small></div>
          <div><span>Items counted</span><strong>{{ t.items }}</strong><small>{{ (d.counts || []).length }} count{{ (d.counts || []).length === 1 ? '' : 's' }}</small></div>
          <div><span>Flagged</span><strong :class="t.flagged_count ? 'warn' : ''">{{ t.flagged_count }}</strong><small>{{ thresholdText }}</small></div>
          <div v-if="perm.approve"><span>Pour cost</span><strong>{{ t.pour_cost_pct !== null && t.pour_cost_pct !== undefined ? fmtNum(t.pour_cost_pct, 1) + '%' : '—' }}</strong><small>{{ has(t.revenue) ? money(t.revenue) + ' net sales' : '' }}</small></div>
        </div>

        <div class="split ui-tabs" role="tablist">
          <button v-for="s in splits" :key="s.key" type="button" class="ui-tab" :class="{ 'is-active': split === s.key }" role="tab" :data-split="s.key" @click="split = s.key">{{ s.label }} <span class="count">{{ s.n }}</span></button>
        </div>

        <div v-if="split === 'items' || split === 'flags'" class="ui-table-wrap">
          <table class="ui-table tbl" data-testid="variance-items">
            <thead>
              <tr>
                <th>Item</th>
                <th class="num hide-sm">Expected</th>
                <th class="num hide-sm">Counted</th>
                <th class="num">Variance</th>
                <th class="num hide-sm">Tots</th>
                <th class="num hide-sm">%</th>
                <th v-if="perm.approve" class="num">Value</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in split === 'flags' ? d.flags || [] : d.items" :key="r.product_id + r.location_id" :class="{ flagged: r.flagged }" :data-item="r.name">
                <td>
                  <strong><i v-if="r.flagged" class="fa-solid fa-flag flag"></i> {{ r.name }}</strong>
                  <small class="sub">{{ r.location }} · {{ categoryLabel(r.category) }}<template v-if="r.count_number"> · {{ r.count_number }}</template></small>
                </td>
                <td class="num hide-sm">{{ r.expected_text }}</td>
                <td class="num hide-sm">{{ r.counted_text }}</td>
                <td class="num" :class="tone(r.variance)" :data-variance="r.variance">{{ signText(r.variance, r.variance_text) }}</td>
                <td class="num hide-sm" :class="tone(r.variance)">{{ r.variance_tots !== null && r.variance_tots !== undefined ? signed(r.variance_tots, 1) : '' }}</td>
                <td class="num hide-sm" :class="tone(r.variance)">{{ r.variance_pct !== null && r.variance_pct !== undefined ? signed(r.variance_pct, 1) + '%' : '—' }}</td>
                <td v-if="perm.approve" class="num" :class="tone(r.variance_value)" :data-value="r.variance_value">{{ has(r.variance_value) ? signedMoney(r.variance_value) : '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else-if="split === 'categories'" class="ui-table-wrap">
          <table class="ui-table tbl">
            <thead>
              <tr>
                <th>Category</th>
                <th class="num">Variance %</th>
                <th v-if="perm.approve" class="num">Variance</th>
                <th v-if="perm.approve" class="num hide-sm">Net sales</th>
                <th v-if="perm.approve" class="num">Pour cost</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in d.categories" :key="c.category">
                <td>{{ c.label || categoryLabel(c.category) }}</td>
                <td class="num" :class="tone(c.variance_pct)">{{ c.variance_pct !== null && c.variance_pct !== undefined ? signed(c.variance_pct, 1) + '%' : '—' }}</td>
                <td v-if="perm.approve" class="num" :class="tone(c.variance_value)">{{ signedMoney(c.variance_value) }}</td>
                <td v-if="perm.approve" class="num hide-sm">{{ money(c.revenue) }}</td>
                <td v-if="perm.approve" class="num" :class="{ over: overTarget(c) }">{{ c.pour_cost_pct !== null && c.pour_cost_pct !== undefined ? fmtNum(c.pour_cost_pct, 1) + '%' : '—' }}<small v-if="has(c.pour_cost_target)" class="sub">target {{ fmtNum(c.pour_cost_target, 1) }}%</small></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else-if="split === 'locations'" class="ui-table-wrap">
          <table class="ui-table tbl">
            <thead>
              <tr>
                <th>Location</th>
                <th class="num">Flagged</th>
                <th v-if="perm.approve" class="num">Losses</th>
                <th v-if="perm.approve" class="num">Net variance</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="l in d.locations" :key="l.location_id">
                <td>{{ l.location }}</td>
                <td class="num">{{ l.flagged_count }}</td>
                <td v-if="perm.approve" class="num neg">{{ money(l.loss_value) }}</td>
                <td v-if="perm.approve" class="num" :class="tone(l.variance_value)">{{ signedMoney(l.variance_value) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else-if="split === 'staff'">
          <p class="ui-hint">Each count’s losses are shared equally between the staff recorded on it.</p>
          <div v-if="!(d.staff || []).length" class="ui-empty small"><p>No staff were recorded on these counts.</p></div>
          <div v-else class="ui-table-wrap">
            <table class="ui-table tbl" data-testid="variance-staff">
              <thead>
                <tr>
                  <th>Staff</th>
                  <th class="num">Shifts</th>
                  <th class="num">Loss (tots)</th>
                  <th v-if="perm.approve" class="num">Loss share</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="s in d.staff" :key="s.user_id">
                  <td>{{ s.name || 'Unknown' }}<small class="sub">{{ (s.counts || []).join(', ') }}</small></td>
                  <td class="num">{{ s.shifts }}</td>
                  <td class="num">{{ fmtNum(s.loss_tots, 1) }}</td>
                  <td v-if="perm.approve" class="num neg">{{ money(s.loss_value) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-else-if="split === 'counts'">
          <ul class="clist">
            <li v-for="c in d.counts" :key="c.id" @click="$emit('review', c.id)">
              <span><strong>{{ c.number }} · {{ c.location }}</strong><small>night of {{ formatDate(c.business_date) }} · {{ c.period_from === c.period_to ? 'one night' : `${formatDate(c.period_from, 'short')} → ${formatDate(c.period_to, 'short')}` }}</small></span>
              <span v-if="c.flagged_count" class="ui-badge ui-badge--warning">{{ c.flagged_count }} flagged</span>
              <span v-if="perm.approve" class="num" :class="tone(c.variance_value)">{{ signedMoney(c.variance_value) }}</span>
            </li>
          </ul>
        </div>
      </template>
    </template>

    <!-- Pour cost -->
    <template v-else-if="view === 'pour' && d">
      <div v-if="!perm.approve" class="ui-alert"><i class="fa-solid fa-lock"></i><span>Costs and pour cost are visible to managers who can approve stock.</span></div>
      <div v-if="!(d.items || []).length" class="ui-empty small"><p>No bar sales in this period.</p></div>
      <template v-else>
        <div class="stats">
          <div><span>Net sales</span><strong>{{ money(d.revenue) }}</strong><small>{{ d.transactions }} sales · {{ money(d.gross) }} incl. tax</small></div>
          <div v-if="perm.approve"><span>Cost of sales</span><strong>{{ money(d.cost_of_sales) }}</strong></div>
          <div v-if="perm.approve"><span>Pour cost</span><strong data-testid="pour-total">{{ d.pour_cost_pct !== null && d.pour_cost_pct !== undefined ? fmtNum(d.pour_cost_pct, 1) + '%' : '—' }}</strong></div>
          <div v-if="perm.approve"><span>Gross profit</span><strong>{{ money(d.gross_profit) }}</strong></div>
        </div>
        <div class="ui-table-wrap">
          <table class="ui-table tbl">
            <thead>
              <tr>
                <th>Category</th>
                <th class="num">Sold</th>
                <th class="num">Net sales</th>
                <th v-if="perm.approve" class="num hide-sm">Cost</th>
                <th v-if="perm.approve" class="num">Pour cost</th>
                <th v-if="perm.approve" class="num hide-sm">Gross profit</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in d.categories" :key="c.category">
                <td>{{ c.label || categoryLabel(c.category) }}</td>
                <td class="num">{{ c.qty }}</td>
                <td class="num">{{ money(c.revenue) }}</td>
                <td v-if="perm.approve" class="num hide-sm">{{ money(c.cost) }}</td>
                <td v-if="perm.approve" class="num" :class="{ over: c.on_target === false }">{{ c.pour_cost_pct !== null && c.pour_cost_pct !== undefined ? fmtNum(c.pour_cost_pct, 1) + '%' : '—' }}<small v-if="has(c.pour_cost_target)" class="sub">target {{ fmtNum(c.pour_cost_target, 1) }}%</small></td>
                <td v-if="perm.approve" class="num hide-sm">{{ money(c.gross_profit) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <h4 class="h4">Menu items</h4>
        <div class="ui-table-wrap">
          <table class="ui-table tbl">
            <thead>
              <tr>
                <th>Menu item</th>
                <th class="num">Sold</th>
                <th class="num">Net sales</th>
                <th v-if="perm.approve" class="num">Pour cost</th>
                <th v-if="perm.approve" class="num hide-sm">Gross profit</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="it in d.items" :key="it.pos_product_id">
                <td>{{ it.name }}<small class="sub">{{ categoryLabel(it.category) }}</small></td>
                <td class="num">{{ it.qty }}</td>
                <td class="num">{{ money(it.revenue) }}</td>
                <td v-if="perm.approve" class="num">{{ it.pour_cost_pct !== null && it.pour_cost_pct !== undefined ? fmtNum(it.pour_cost_pct, 1) + '%' : '—' }}</td>
                <td v-if="perm.approve" class="num hide-sm">{{ money(it.gross_profit) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </template>

    <!-- Valuation -->
    <template v-else-if="view === 'valuation' && d">
      <div v-if="!(d.items || []).length" class="ui-empty small"><p>No stock on hand.</p></div>
      <template v-else>
        <div v-if="perm.approve" class="stats">
          <div><span>Stock value</span><strong data-testid="val-total">{{ money(d.value_total) }}</strong><small>at average cost</small></div>
          <div v-for="c in (d.categories || []).slice(0, 4)" :key="c.category"><span>{{ c.label }}</span><strong>{{ money(c.value) }}</strong></div>
        </div>
        <div class="ui-table-wrap">
          <table class="ui-table tbl">
            <thead>
              <tr>
                <th>Item</th>
                <th class="num">On hand</th>
                <th v-if="perm.approve" class="num hide-sm">Avg cost</th>
                <th v-if="perm.approve" class="num">Value</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="it in valuationRows" :key="it.product_id">
                <td>{{ it.name }}<small class="sub">{{ categoryLabel(it.category) }}</small></td>
                <td class="num">{{ it.on_hand_text }}</td>
                <td v-if="perm.approve" class="num hide-sm">{{ money(it.avg_cost_per_unit) }}</td>
                <td v-if="perm.approve" class="num">{{ money(it.value) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </template>

    <!-- Slow movers -->
    <template v-else-if="view === 'slow' && d">
      <div v-if="!(d.items || []).length" class="ui-empty small"><p>Nothing on hand to report.</p></div>
      <div v-else class="ui-table-wrap">
        <table class="ui-table tbl">
          <thead>
            <tr>
              <th>Item</th>
              <th class="num">On hand</th>
              <th class="num">Sold</th>
              <th class="num hide-sm">Last sale</th>
              <th class="num">Days of cover</th>
              <th v-if="perm.approve" class="num hide-sm">Tied up</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="it in d.items" :key="it.product_id">
              <td>{{ it.name }}<small class="sub">{{ categoryLabel(it.category) }}</small></td>
              <td class="num">{{ it.on_hand_text }}</td>
              <td class="num">{{ Number(it.sold) ? it.sold_text : 'none' }}</td>
              <td class="num hide-sm">{{ it.last_sale_date ? formatDate(it.last_sale_date) : '—' }}</td>
              <td class="num">{{ it.days_of_cover !== null && it.days_of_cover !== undefined ? fmtNum(it.days_of_cover, 0) : '∞' }}</td>
              <td v-if="perm.approve" class="num hide-sm">{{ money(it.value) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- Night report -->
    <template v-else-if="view === 'night' && d">
      <div class="night">
        <div class="night__head">
          <div>
            <strong>{{ d.subject }}</strong>
            <small>To: {{ (d.recipients || []).join(', ') || 'no one yet — users who can approve stock receive it' }}</small>
          </div>
          <button type="button" class="ui-btn ui-btn--primary ui-btn--sm" :disabled="sending || !(d.recipients || []).length" data-testid="night-send" @click="sendNight"><i class="fa-regular fa-paper-plane"></i> Send now</button>
        </div>
        <p class="ui-hint">{{ bar.settings?.night_report?.enabled ? `Sent automatically at ${bar.settings.night_report.send_at} after each night.` : 'Automatic sending is off — switch it on in Setup.' }}</p>
        <iframe v-if="d.html" class="night__frame" :srcdoc="d.html" title="Night report preview" sandbox=""></iframe>
      </div>
    </template>
  </div>
</template>

<script>
import { bar, money, has } from './barContext'
import { barApi } from '@/services/bar'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { formatDate, addDays, downloadBlob } from '@/utils/format'
import { fmtNum, categoryLabel, signed } from '@/utils/barUnits'

export default {
  name: 'BarReports',
  props: {
    perm: { type: Object, required: true },
    version: { type: Number, default: 0 },
    date: { type: String, default: '' }
  },
  emits: ['review'],
  data() {
    const today = this.date || bar.settings?.business_date || new Date().toISOString().slice(0, 10)
    const q = String(this.$route.query.report || '')
    return {
      bar,
      view: ['variance', 'pour', 'valuation', 'slow', 'night'].includes(q) ? q : 'variance',
      split: 'items',
      loc: '',
      countId: '',
      counts: [],
      today,
      from: addDays(today, -6),
      to: today,
      days: 30,
      nightDate: addDays(today, -1),
      d: null,
      loading: false,
      error: '',
      sending: false,
      seq: 0
    }
  },
  computed: {
    tabs() {
      const t = [
        { key: 'variance', label: 'Variance', icon: 'fa-solid fa-scale-unbalanced' },
        { key: 'pour', label: 'Pour cost', icon: 'fa-solid fa-whiskey-glass' },
        { key: 'valuation', label: 'Valuation', icon: 'fa-solid fa-boxes-stacked' },
        { key: 'slow', label: 'Slow movers', icon: 'fa-solid fa-hourglass-end' }
      ]
      if (this.perm.approve) t.push({ key: 'night', label: 'Night report', icon: 'fa-regular fa-envelope' })
      return t
    },
    t() {
      return this.d?.totals || {}
    },
    splits() {
      const d = this.d || {}
      return [
        { key: 'items', label: 'Items', n: (d.items || []).length },
        { key: 'flags', label: 'Flags', n: (d.flags || []).length },
        { key: 'categories', label: 'Categories', n: (d.categories || []).length },
        { key: 'locations', label: 'Locations', n: (d.locations || []).length },
        { key: 'staff', label: 'Shifts & staff', n: (d.staff || []).length },
        { key: 'counts', label: 'Counts', n: (d.counts || []).length }
      ]
    },
    thresholdText() {
      const th = this.d?.thresholds || {}
      const parts = []
      if (Number(th.variance_pct)) parts.push(`over ${fmtNum(th.variance_pct, 1)}%`)
      if (Number(th.variance_amount) && this.perm.approve) parts.push(`over ${money(th.variance_amount)}`)
      return parts.join(' or ') || 'no thresholds set'
    },
    valuationRows() {
      return (this.d?.items || []).slice().sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0))
    },
    csvSet() {
      if (this.view === 'variance') return this.d?.items?.length ? 'variance' : ''
      if (this.view === 'valuation') return this.d?.items?.length ? 'valuation' : ''
      return ''
    },
    params() {
      if (this.view === 'variance') return this.countId ? { count_id: this.countId } : { location_id: this.loc, from: this.from, to: this.to }
      if (this.view === 'pour') return { location_id: this.loc, from: this.from, to: this.to }
      if (this.view === 'valuation') return { location_id: this.loc }
      if (this.view === 'slow') return { days: this.days }
      return { date: this.nightDate, html: 1 }
    }
  },
  watch: {
    view() {
      this.d = null
      this.$router.replace({ query: { ...this.$route.query, report: this.view === 'variance' ? undefined : this.view } }).catch(() => {})
      this.load()
    },
    params: {
      deep: true,
      handler() {
        this.load()
      }
    },
    version() {
      this.load()
      this.loadCounts()
    }
  },
  created() {
    this.load()
    this.loadCounts()
  },
  methods: {
    money,
    has,
    fmtNum,
    signed,
    formatDate,
    categoryLabel,
    signedMoney(v) {
      const n = Number(v) || 0
      return (n > 0 ? '+' : n < 0 ? '−' : '') + money(Math.abs(n))
    },
    tone(v) {
      const n = Number(v)
      if (!Number.isFinite(n) || Math.abs(n) < 0.0005) return ''
      return n < 0 ? 'neg' : 'pos'
    },
    // "+2 bottles" / "−75 ml" (the API text carries an ASCII minus)
    signText(v, txt) {
      const n = Number(v) || 0
      const t = String(txt || '').replace(/^-/, '')
      return n > 0 ? '+' + t : n < 0 ? '−' + t : t || '0'
    },
    overTarget(c) {
      return has(c.pour_cost_target) && typeof c.pour_cost_pct === 'number' && c.pour_cost_pct > c.pour_cost_target
    },
    async loadCounts() {
      try {
        this.counts = (await barApi.counts({ status: 'submitted,approved' })).slice(0, 60)
      } catch {
        this.counts = []
      }
    },
    async load() {
      const seq = ++this.seq
      this.loading = true
      this.error = ''
      try {
        let d
        if (this.view === 'variance') d = await barApi.variance(this.params)
        else if (this.view === 'pour') d = await barApi.pourCost(this.params)
        else if (this.view === 'valuation') d = await barApi.valuation(this.params)
        else if (this.view === 'slow') d = await barApi.slowMovers(this.params)
        else d = await barApi.nightReport(this.nightDate, true)
        if (seq === this.seq) this.d = d
      } catch (e) {
        if (seq === this.seq) this.error = apiErrorMessage(e, 'Could not load the report')
      } finally {
        if (seq === this.seq) this.loading = false
      }
    },
    async sendNight() {
      this.sending = true
      try {
        await barApi.sendNightReport(this.nightDate)
        toast.success('Night report sent')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not send the night report'))
      } finally {
        this.sending = false
      }
    },
    async exportCsv() {
      try {
        downloadBlob(await barApi.exportCsv(this.csvSet, this.params), `bar-${this.csvSet}-${this.to || this.today}.csv`)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Export failed'))
      }
    }
  }
}
</script>

<style scoped>
.rp {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.sub-tabs {
  overflow-x: auto;
}
.toolbar {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}
.toolbar .ui-select {
  width: 180px;
}
.toolbar .ui-select.wide {
  width: 260px;
}
.dt {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  font-size: 12.5px;
  color: var(--text-3);
}
.dt .ui-input,
.dt-only {
  width: 150px;
}
.end {
  margin-left: auto;
}
.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
}
.stats > div {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.stats span,
.stats small {
  font-size: 12px;
  color: var(--text-3);
}
.stats strong {
  font-size: 17px;
  font-variant-numeric: tabular-nums;
}
.split {
  overflow-x: auto;
}
.tbl td,
.tbl th {
  font-variant-numeric: tabular-nums;
}
.sub {
  display: block;
  font-size: 12px;
  color: var(--text-3);
  font-weight: 400;
}
.flag {
  color: var(--warning);
  font-size: 12px;
}
tr.flagged td {
  background: color-mix(in srgb, var(--warning-soft) 60%, transparent);
}
.neg {
  color: var(--danger);
  font-weight: 600;
}
.pos {
  color: var(--success);
  font-weight: 600;
}
.warn {
  color: var(--warning);
}
td.over {
  color: var(--danger);
  font-weight: 700;
}
.h4 {
  font-size: 14px;
  margin: 8px 0 0;
}
.clist {
  list-style: none;
  margin: 0;
  padding: 0;
}
.clist li {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-top: 1px solid var(--border);
  cursor: pointer;
}
.clist li > span:first-child {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.clist small {
  font-size: 12px;
  color: var(--text-3);
}
.num {
  font-variant-numeric: tabular-nums;
}
.night {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.night__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  flex-wrap: wrap;
}
.night__head > div {
  display: flex;
  flex-direction: column;
}
.night__head small {
  font-size: 12.5px;
  color: var(--text-3);
}
.night__frame {
  width: 100%;
  min-height: 640px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
@media (max-width: 760px) {
  .hide-sm {
    display: none;
  }
  .toolbar .ui-select,
  .toolbar .ui-select.wide {
    flex: 1 1 160px;
    width: auto;
  }
  .end {
    margin-left: 0;
  }
}
</style>
