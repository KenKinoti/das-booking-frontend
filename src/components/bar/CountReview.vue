<template>
  <BarDrawer :title="c ? `${countTypeLabel(c.type)} · ${c.location || locationName(c.location_id)}` : 'Loading…'" eyebrow="Stock count" width="980px" testid="count-review" @close="$emit('close')">
    <template v-if="c" #sub>
      <span class="ui-badge" :class="meta.badge">{{ meta.label }}</span>
      <span>{{ c.number }}</span>
      <span>Night of {{ formatDate(c.business_date) }}</span>
      <span v-if="c.blind"><i class="fa-solid fa-eye-slash"></i> blind</span>
      <span v-if="staffNames">On shift: {{ staffNames }}</span>
    </template>

    <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>
    <div v-else-if="!c" class="ui-skeleton" style="height: 360px"></div>
    <template v-else>
      <div v-if="c.status === 'draft' || c.status === 'recount'" class="ui-alert ui-alert--warning">
        <i class="fa-solid fa-hourglass-half"></i>
        <span>Still being counted ({{ countedN }} of {{ lines.length }} items). <router-link v-if="perm.create" :to="`/bar-stock/count/${c.id}`">Open the counting screen</router-link></span>
      </div>
      <div v-else-if="c.status === 'approved'" class="ui-alert ui-alert--success">
        <i class="fa-solid fa-lock"></i>
        <span>Approved{{ c.approved_by_name ? ' by ' + c.approved_by_name : '' }}{{ c.approved_at ? ' · ' + formatDateTime(c.approved_at) : '' }} — stock was set to what was counted and the count is locked.</span>
      </div>
      <div v-if="period && perm.approve && !c.expected_hidden" class="period">Expected stock and variance cover {{ period }} — from the previous approved count at this location.</div>
      <div v-if="c.expected_hidden && perm.approve" class="ui-alert"><i class="fa-solid fa-eye-slash"></i><span>Blind count — expected quantities appear once it is submitted.</span></div>

      <div class="stats" data-testid="count-stats">
        <div><span>Items counted</span><strong>{{ countedN }} / {{ lines.length }}</strong></div>
        <div v-if="perm.approve"><span>Net variance</span><strong :class="tone(totalValue)" data-testid="count-net">{{ has(totalValue) ? signedMoney(totalValue) : '—' }}</strong><small>counted − expected, at cost</small></div>
        <div v-if="perm.approve"><span>Losses</span><strong :class="lossValue ? 'neg' : ''">{{ has(lossValue) ? money(lossValue) : '—' }}</strong><small>{{ lossItems }} item{{ lossItems === 1 ? '' : 's' }} short</small></div>
        <div><span>Flagged</span><strong :class="flaggedN ? 'warn' : ''">{{ flaggedN }}</strong><small>{{ thresholdText }}</small></div>
      </div>

      <div class="tools">
        <div class="ui-tabs" role="tablist">
          <button v-for="f in filters" :key="f.key" type="button" class="ui-tab" :class="{ 'is-active': filter === f.key }" role="tab" @click="filter = f.key">{{ f.label }} <span class="count">{{ f.n }}</span></button>
        </div>
        <span v-if="canDecide && selected.length" class="sel">{{ selected.length }} selected</span>
      </div>

      <div class="ui-table-wrap">
        <table class="ui-table rv" data-testid="count-lines-table">
          <thead>
            <tr>
              <th v-if="canDecide" class="ck"><input type="checkbox" :checked="allSelected" aria-label="Select all shown" @change="toggleAll($event.target.checked)" /></th>
              <th>Item</th>
              <th class="num">Expected</th>
              <th class="num">Counted</th>
              <th class="num">Variance</th>
              <th class="num hide-sm">Tots</th>
              <th v-if="perm.approve" class="num">Value</th>
              <th class="num hide-sm">%</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="l in shown" :key="l.product_id">
              <tr class="is-clickable" :class="{ flagged: l.flagged, open: openId === l.product_id }" :data-line="l.name" @click="openId = openId === l.product_id ? '' : l.product_id">
                <td v-if="canDecide" class="ck" @click.stop><input v-model="selected" type="checkbox" :value="l.product_id" :aria-label="`Select ${l.name}`" /></td>
                <td>
                  <div class="iname">
                    <strong><i v-if="l.flagged" class="fa-solid fa-flag flag" :title="flagText(l)"></i> {{ l.name }}</strong>
                    <small>{{ categoryLabel(l.category) }}<template v-if="l.recount"> · recount</template></small>
                  </div>
                </td>
                <td class="num">{{ has(l.expected) ? qtyText(l.expected, l) : '—' }}</td>
                <td class="num">{{ l.counted === null ? 'not counted' : qtyText(l.counted, l) }}</td>
                <td class="num" :class="tone(l.variance)" :data-variance="l.variance">{{ has(l.variance) ? signedQty(l.variance, l) : '—' }}</td>
                <td class="num hide-sm" :class="tone(l.variance)">{{ isMl(l) && has(l.variance) ? signed(l.tots, 1) : '' }}</td>
                <td v-if="perm.approve" class="num" :class="tone(l.value)" :data-value="l.value">{{ has(l.value) ? signedMoney(l.value) : '—' }}</td>
                <td class="num hide-sm" :class="tone(l.variance)">{{ l.pct !== null && l.pct !== undefined ? signed(l.pct, 1) + '%' : '—' }}</td>
              </tr>
              <tr v-if="openId === l.product_id" class="detail">
                <td :colspan="cols">
                  <div class="flow">
                    <span>Opening <b>{{ qtyText(l.f.opening, l) }}</b></span>
                    <span>+ received <b>{{ qtyText(l.f.received, l) }}</b></span>
                    <span>+ in <b>{{ qtyText(l.f.transfers_in, l) }}</b></span>
                    <span>− out <b>{{ qtyText(l.f.transfers_out, l) }}</b></span>
                    <span>− sold <b>{{ qtyText(l.f.sold, l) }}</b></span>
                    <span>− wasted <b>{{ qtyText(l.f.wastage, l) }}</b></span>
                    <span v-if="l.f.returns">− returned <b>{{ qtyText(l.f.returns, l) }}</b></span>
                    <span v-if="l.f.adjustments">± adjusted <b>{{ signedQty(l.f.adjustments, l) }}</b></span>
                    <span>= expected <b>{{ qtyText(l.expected, l) }}</b></span>
                  </div>
                </td>
              </tr>
            </template>
            <tr v-if="!shown.length">
              <td :colspan="cols" class="empty-row">Nothing to show.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <section v-if="shifts.length" class="shifts">
        <h3>Losses by staff on shift</h3>
        <p class="ui-hint">Losses are shared equally between the staff recorded on the count.</p>
        <ul>
          <li v-for="s in shifts" :key="s.user_id || s.name"><span>{{ s.name || s.user_name }}</span><strong v-if="perm.approve && has(s.loss_value ?? s.value)">{{ money(s.loss_value ?? s.value) }}</strong></li>
        </ul>
      </section>
    </template>

    <template v-if="c && canDecide" #foot>
      <button type="button" class="ui-btn" :disabled="busy || !selected.length" data-testid="count-recount" @click="recount"><i class="fa-solid fa-rotate-left"></i> Recount {{ selected.length || '' }} selected</button>
      <button type="button" class="ui-btn ui-btn--success" :disabled="busy" data-testid="count-approve" @click="approve"><i class="fa-solid fa-check"></i> Approve count</button>
    </template>
  </BarDrawer>
</template>

<script>
import BarDrawer from './BarDrawer.vue'
import { bar, money, has, locationName, orgTotMl, pick } from './barContext'
import { barApi, arr, COUNT_STATUS, statusMeta } from '@/services/bar'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'
import { formatDate, formatDateTime } from '@/utils/format'
import { qtyText, signedQty, signed, isMl, tots, categoryLabel, countTypeLabel, variancePct, fmtNum } from '@/utils/barUnits'

export default {
  name: 'CountReview',
  components: { BarDrawer },
  props: {
    id: { type: String, required: true },
    perm: { type: Object, required: true }
  },
  emits: ['close', 'changed'],
  data() {
    return { d: null, error: '', filter: 'all', selected: [], openId: '', busy: false }
  },
  computed: {
    c() {
      if (!this.d) return null
      return this.d.count ? { ...this.d.count } : this.d
    },
    meta() {
      return statusMeta(COUNT_STATUS, this.c?.status)
    },
    canDecide() {
      return this.perm.approve && this.c?.status === 'submitted'
    },
    staffNames() {
      const s = arr(this.c, 'staff', 'staff_names')
      return s.map((x) => (typeof x === 'string' ? x : x.name || x.user_name)).filter(Boolean).join(', ')
    },
    period() {
      const f = pick(this.c, 'period_from', 'period.from')
      const t = pick(this.c, 'period_to', 'period.to')
      if (!f && !t) return ''
      if (f === t) return `the night of ${formatDate(f)}`
      return `nights of ${f ? formatDate(f) : 'the start'} → ${t ? formatDate(t) : formatDate(this.c.business_date)}`
    },
    totMl() {
      return orgTotMl()
    },
    lines() {
      const src = arr(this.d, 'lines').length ? arr(this.d, 'lines') : arr(this.c, 'lines')
      return src.map((x) => {
        const it = x.item || {}
        const l = {
          product_id: x.product_id,
          name: x.name || it.name,
          category: x.category || it.category,
          base_unit: x.base_unit || it.base_unit || 'ml',
          unit_size: Number(x.unit_size || it.unit_size) || 1,
          unit_label: x.unit_label || it.unit_label,
          pack_size: x.pack_size || it.pack_size,
          pack_label: x.pack_label || it.pack_label,
          tot_ml: x.tot_ml || it.tot_ml,
          recount: !!x.recount,
          counted: x.counted === null || x.counted === undefined ? null : Number(x.counted),
          expected: x.expected === null || x.expected === undefined ? null : Number(x.expected),
          variance: null,
          value: x.variance_value ?? x.value ?? null,
          flagged: !!(x.flagged ?? x.flag),
          flags: x.flag_reasons || x.flags || [],
          f: (() => {
            const fl = x.flows || x
            return {
              opening: Number(fl.opening) || 0,
              received: Number(fl.received) || 0,
              transfers_in: Number(fl.transfers_in) || 0,
              transfers_out: Number(fl.transfers_out) || 0,
              sold: Number(fl.sold) || 0,
              wastage: Number(fl.wastage ?? fl.wasted) || 0,
              returns: Number(fl.returns) || 0,
              adjustments: Number(fl.adjustments) || 0
            }
          })()
        }
        l.variance = x.variance !== undefined && x.variance !== null ? Number(x.variance) : l.counted !== null && l.expected !== null ? l.counted - l.expected : null
        l.tots = x.variance_tots ?? (has(l.variance) ? tots(l.variance, l, this.totMl) : null)
        l.pct = x.variance_pct !== undefined ? x.variance_pct : has(l.variance) ? variancePct(l.variance, l.f.sold + l.f.wastage) : null
        return l
      })
    },
    cols() {
      return 6 + (this.canDecide ? 1 : 0) + (this.perm.approve ? 1 : 0)
    },
    countedN() {
      return this.lines.filter((l) => l.counted !== null).length
    },
    filters() {
      const n = (fn) => this.lines.filter(fn).length
      return [
        { key: 'all', label: 'All', n: this.lines.length },
        { key: 'flagged', label: 'Flagged', n: n((l) => l.flagged) },
        { key: 'loss', label: 'Short', n: n((l) => Number(l.variance) < -0.0005) },
        { key: 'over', label: 'Over', n: n((l) => Number(l.variance) > 0.0005) }
      ]
    },
    shown() {
      const f = this.filter
      return this.lines.filter((l) => {
        if (f === 'flagged') return l.flagged
        if (f === 'loss') return Number(l.variance) < -0.0005
        if (f === 'over') return Number(l.variance) > 0.0005
        return true
      })
    },
    allSelected() {
      return this.shown.length > 0 && this.shown.every((l) => this.selected.includes(l.product_id))
    },
    totalValue() {
      const t = pick(this.d, 'totals.variance_value', 'count.variance_value', 'variance_value')
      if (has(t)) return Number(t)
      if (!this.lines.some((l) => has(l.value))) return null
      return this.lines.reduce((s, l) => s + (Number(l.value) || 0), 0)
    },
    lossValue() {
      const t = pick(this.d, 'totals.loss_value', 'count.loss_value', 'loss_value')
      if (has(t)) return Math.abs(Number(t))
      if (!this.lines.some((l) => has(l.value))) return null
      return Math.abs(this.lines.reduce((s, l) => s + Math.min(0, Number(l.value) || 0), 0))
    },
    lossItems() {
      return this.lines.filter((l) => Number(l.variance) < -0.0005).length
    },
    flaggedN() {
      return this.lines.filter((l) => l.flagged).length
    },
    thresholdText() {
      const s = bar.settings || {}
      const p = Number(s.variance_pct_threshold) || 0
      const a = Number(s.variance_amount_threshold) || 0
      const parts = []
      if (p) parts.push(`over ${fmtNum(p, 1)}%`)
      if (a && this.perm.approve) parts.push(`over ${money(a)}`)
      return parts.length ? parts.join(' or ') : 'no thresholds set'
    },
    shifts() {
      return arr(this.d, 'shifts', 'staff_losses')
    }
  },
  watch: {
    id() {
      this.load()
    }
  },
  created() {
    this.load()
  },
  methods: {
    money,
    has,
    qtyText,
    signedQty,
    signed,
    isMl,
    categoryLabel,
    countTypeLabel,
    formatDate,
    formatDateTime,
    locationName,
    signedMoney(v) {
      const n = Number(v) || 0
      return (n > 0 ? '+' : n < 0 ? '−' : '') + money(Math.abs(n))
    },
    tone(v) {
      const n = Number(v)
      if (!Number.isFinite(n) || Math.abs(n) < 0.0005) return ''
      return n < 0 ? 'neg' : 'pos'
    },
    flagText(l) {
      const why = (l.flags || []).map((f) => (f === 'pct' ? 'over the % threshold' : f === 'amount' ? 'over the amount threshold' : f))
      return why.length ? `Flagged: ${why.join(', ')}` : 'Flagged'
    },
    toggleAll(on) {
      const ids = this.shown.map((l) => l.product_id)
      this.selected = on ? [...new Set([...this.selected, ...ids])] : this.selected.filter((id) => !ids.includes(id))
    },
    async load() {
      this.error = ''
      try {
        this.d = await barApi.count(this.id)
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load the count')
      }
    },
    async recount() {
      const n = this.selected.length
      const ok = await confirmDialog({ title: `Send ${n} item${n === 1 ? '' : 's'} back for a recount?`, message: 'The count goes back to the counters with these items marked “recount”. Approve it after they resubmit.', confirmText: 'Send back' })
      if (!ok) return
      this.busy = true
      try {
        await barApi.recount(this.id, this.selected)
        toast.success(`${n} item${n === 1 ? '' : 's'} sent back for a recount`)
        this.selected = []
        await this.load()
        this.$emit('changed')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not send the items back'))
      } finally {
        this.busy = false
      }
    },
    async approve() {
      const v = this.totalValue
      const msg = `Stock at ${this.c.location || locationName(this.c.location_id)} is set to what was counted (${this.countedN} item${this.countedN === 1 ? '' : 's'})${has(v) ? `, a net variance of ${this.signedMoney(v)}` : ''}. The count is then locked.`
      const ok = await confirmDialog({ title: 'Approve this count?', message: msg, confirmText: 'Approve' })
      if (!ok) return
      this.busy = true
      try {
        await barApi.approveCount(this.id)
        toast.success('Count approved — stock adjusted')
        await this.load()
        this.$emit('changed')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not approve the count'))
      } finally {
        this.busy = false
      }
    }
  }
}
</script>

<style scoped>
.period {
  font-size: 13px;
  color: var(--text-3);
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
.tools {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.tools .ui-tabs {
  overflow-x: auto;
}
.sel {
  font-size: 13px;
  color: var(--accent);
  font-weight: 600;
}
.rv td,
.rv th {
  font-variant-numeric: tabular-nums;
}
.ck {
  width: 34px;
}
.iname {
  display: flex;
  flex-direction: column;
}
.iname small {
  font-size: 12px;
  color: var(--text-3);
}
.flag {
  color: var(--warning);
  font-size: 12px;
}
tr.flagged td {
  background: color-mix(in srgb, var(--warning-soft) 60%, transparent);
}
tr.detail td {
  background: var(--surface-2);
}
.flow {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  font-size: 12.5px;
  color: var(--text-3);
}
.flow b {
  color: var(--text);
  font-weight: 600;
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
.empty-row {
  text-align: center;
  color: var(--text-3);
}
.shifts h3 {
  font-size: 14px;
  margin: 0;
}
.shifts ul {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
}
.shifts li {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px solid var(--border);
  font-size: 13.5px;
}
@media (max-width: 760px) {
  .hide-sm {
    display: none;
  }
}
</style>
