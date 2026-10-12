<template>
  <div class="ws" data-testid="bar-wastage">
    <!-- Quick log -->
    <section v-if="perm.create" class="quick">
      <div class="quick__head">
        <strong>Quick log</strong>
        <span>Tap what happened</span>
      </div>
      <div class="chips">
        <button v-for="r in WASTAGE_REASONS" :key="r.key" type="button" class="chip" :data-quick="r.key" @click="logReason = r.key">
          <i :class="r.icon"></i> {{ r.label }}
        </button>
      </div>
    </section>

    <!-- Pending approvals -->
    <section v-if="perm.approve && pending.length" class="pend" data-testid="wastage-pending">
      <h3><i class="fa-solid fa-hourglass-half"></i> Waiting for approval <span class="count warn">{{ pending.length }}</span></h3>
      <ul>
        <li v-for="w in pending" :key="w.id" :data-wastage="w.name">
          <div class="pend__main">
            <strong>{{ reasonLabel(w.reason) }} · {{ w.name }}</strong>
            <small>{{ w.entered_text || w.qty_text }} at {{ w.location || locationName(w.location_id) }} · {{ w.staff || w.recorded_by_name || '—' }} · {{ formatDateTime(w.created_at) }}<template v-if="w.note"> · {{ w.note }}</template></small>
          </div>
          <span v-if="has(w.value)" class="pend__val">{{ money(w.value) }}</span>
          <div class="pend__act">
            <button type="button" class="ui-btn ui-btn--sm" :disabled="busy === w.id" :data-testid="'reject-' + w.name" @click="decide(w, false)">Reject</button>
            <button type="button" class="ui-btn ui-btn--success ui-btn--sm" :disabled="busy === w.id" :data-testid="'approve-' + w.name" @click="decide(w, true)"><i class="fa-solid fa-check"></i> Approve</button>
          </div>
        </li>
      </ul>
    </section>

    <!-- History -->
    <div class="toolbar">
      <select v-model="range" class="ui-select" aria-label="Period">
        <option value="tonight">Tonight</option>
        <option value="7">Last 7 nights</option>
        <option value="30">Last 30 nights</option>
        <option value="all">Everything</option>
      </select>
      <select v-model="loc" class="ui-select" aria-label="Location">
        <option value="">All locations</option>
        <option v-for="l in bar.locations" :key="l.id" :value="l.id">{{ l.name }}</option>
      </select>
      <select v-model="reason" class="ui-select" aria-label="Reason">
        <option value="">All reasons</option>
        <option v-for="r in allReasons" :key="r" :value="r">{{ reasonLabel(r) }}</option>
      </select>
      <button v-if="perm.edit && rows.length" type="button" class="ui-btn ui-btn--sm end" @click="exportCsv"><i class="fa-solid fa-download"></i> CSV</button>
    </div>

    <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span></div>
    <div v-else-if="loading && !rows.length" class="sk"><div v-for="n in 4" :key="n" class="ui-skeleton" style="height: 44px"></div></div>
    <div v-else-if="!rows.length" class="ui-empty small">
      <div class="ui-empty__icon"><i class="fa-solid fa-wine-glass-empty"></i></div>
      <h3>No wastage {{ range === 'tonight' ? 'tonight' : 'in this period' }}</h3>
      <p>Breakages, spills, comps and staff drinks logged here leave stock straight away (comps over the allowance after approval).</p>
    </div>
    <template v-else>
      <div class="totals">
        <span><strong>{{ rows.filter((w) => w.status !== 'rejected').length }}</strong> entries</span>
        <span v-for="t in byReason" :key="t.reason">{{ reasonLabel(t.reason) }} <strong>{{ t.n }}</strong><template v-if="perm.approve && t.value !== null"> · {{ money(t.value) }}</template></span>
      </div>
      <div class="ui-table-wrap">
        <table class="ui-table">
          <thead>
            <tr>
              <th>Item</th>
              <th class="num">Quantity</th>
              <th>Reason</th>
              <th class="hide-sm">Where · who</th>
              <th>Status</th>
              <th v-if="perm.approve" class="num">Value</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="w in rows" :key="w.id" :class="{ off: w.status === 'rejected' }">
              <td>
                <strong>{{ w.name }}</strong>
                <small class="sub">{{ formatDateTime(w.created_at) }}<template v-if="w.note"> · {{ w.note }}</template></small>
              </td>
              <td class="num">{{ w.entered_text || w.qty_text }}</td>
              <td>{{ reasonLabel(w.reason) }}</td>
              <td class="hide-sm">{{ w.location || locationName(w.location_id) }} · {{ w.staff || w.recorded_by_name || '—' }}</td>
              <td><span class="ui-badge" :class="statusMeta(WASTAGE_STATUS, w.status).badge">{{ statusMeta(WASTAGE_STATUS, w.status).label }}</span></td>
              <td v-if="perm.approve" class="num">{{ has(w.value) ? money(w.value) : '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <WastageModal v-if="logReason" :perm="perm" :preset-reason="logReason" @close="logReason = ''" @saved="onLogged" />
  </div>
</template>

<script>
import { bar, money, has, locationName } from './barContext'
import { barApi, WASTAGE_STATUS, statusMeta } from '@/services/bar'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { formatDateTime, addDays, downloadBlob } from '@/utils/format'
import { WASTAGE_REASONS, reasonLabel } from '@/utils/barUnits'
import WastageModal from './WastageModal.vue'

export default {
  name: 'BarWastage',
  components: { WastageModal },
  props: {
    perm: { type: Object, required: true },
    version: { type: Number, default: 0 },
    date: { type: String, default: '' }
  },
  emits: ['log', 'changed'],
  data() {
    return { bar, WASTAGE_REASONS, WASTAGE_STATUS, range: '7', loc: '', reason: '', rows: [], pending: [], loading: false, error: '', busy: '', logReason: '' }
  },
  computed: {
    allReasons() {
      return ['breakage', 'spillage', 'comp', 'staff_drink', 'expired', 'damaged_on_delivery', 'returned_to_supplier', 'other']
    },
    params() {
      const to = this.date || bar.settings?.business_date || ''
      const p = { location_id: this.loc, reason: this.reason }
      if (this.range === 'tonight') {
        p.from = to
        p.to = to
      } else if (this.range !== 'all' && to) {
        p.from = addDays(to, -(Number(this.range) - 1))
        p.to = to
      }
      return p
    },
    byReason() {
      const m = new Map()
      for (const w of this.rows) {
        if (w.status === 'rejected') continue
        const x = m.get(w.reason) || { reason: w.reason, n: 0, value: has(w.value) ? 0 : null }
        x.n++
        if (x.value !== null && has(w.value)) x.value += Number(w.value) || 0
        m.set(w.reason, x)
      }
      return [...m.values()].sort((a, b) => b.n - a.n)
    }
  },
  watch: {
    params: {
      deep: true,
      handler() {
        this.load()
      }
    },
    version() {
      this.load()
    }
  },
  created() {
    this.load()
  },
  methods: {
    money,
    has,
    locationName,
    reasonLabel,
    statusMeta,
    formatDateTime,
    async load() {
      this.loading = true
      this.error = ''
      try {
        const [rows, pending] = await Promise.all([barApi.wastage(this.params), this.perm.approve ? barApi.wastage({ status: 'pending' }) : Promise.resolve([])])
        this.rows = rows
        this.pending = pending
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load the wastage')
      } finally {
        this.loading = false
      }
    },
    async decide(w, ok) {
      this.busy = w.id
      try {
        if (ok) await barApi.approveWastage(w.id)
        else await barApi.rejectWastage(w.id)
        toast.success(ok ? `${reasonLabel(w.reason)} approved — ${w.name} taken out of stock` : `${reasonLabel(w.reason)} rejected`)
        await this.load()
        this.$emit('changed')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not record the decision'))
      } finally {
        this.busy = ''
      }
    },
    onLogged() {
      this.logReason = ''
      this.load()
      this.$emit('changed')
    },
    async exportCsv() {
      try {
        downloadBlob(await barApi.exportCsv('wastage', this.params), `bar-wastage-${this.params.to || 'all'}.csv`)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Export failed'))
      }
    }
  }
}
</script>

<style scoped>
.ws {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.quick {
  padding: 12px 14px;
  border-radius: var(--radius);
  background: var(--surface-2);
  border: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.quick__head {
  display: flex;
  gap: 10px;
  align-items: baseline;
}
.quick__head span {
  font-size: 12.5px;
  color: var(--text-3);
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 8px 16px;
  border-radius: 999px;
  border: 1px solid var(--border-strong);
  background: var(--surface);
  color: var(--text);
  font: inherit;
  font-size: 14px;
  font-weight: 550;
  cursor: pointer;
}
.chip:hover {
  border-color: var(--accent);
  color: var(--accent);
}
.chip i {
  color: var(--text-3);
}
.pend {
  border: 1px solid color-mix(in srgb, var(--warning) 45%, var(--border));
  border-radius: var(--radius);
  padding: 12px 14px;
}
.pend h3 {
  font-size: 14px;
  margin: 0 0 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.pend h3 > i {
  color: var(--warning);
}
.count.warn {
  background: var(--warning-soft);
  color: var(--warning);
  border-radius: 10px;
  padding: 0 7px;
  font-size: 12px;
}
.pend ul {
  list-style: none;
  margin: 0;
  padding: 0;
}
.pend li {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  border-top: 1px solid var(--border);
  flex-wrap: wrap;
}
.pend__main {
  flex: 1 1 260px;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.pend__main small {
  font-size: 12px;
  color: var(--text-3);
}
.pend__val {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}
.pend__act {
  display: flex;
  gap: 6px;
}
.toolbar {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}
.toolbar .ui-select {
  width: 170px;
}
.end {
  margin-left: auto;
}
.sk {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.totals {
  display: flex;
  gap: 6px 16px;
  flex-wrap: wrap;
  font-size: 13px;
  color: var(--text-2);
}
.sub {
  display: block;
  font-size: 12px;
  color: var(--text-3);
}
tr.off td {
  opacity: 0.55;
}
@media (max-width: 760px) {
  .hide-sm {
    display: none;
  }
  .toolbar .ui-select {
    flex: 1 1 140px;
    width: auto;
  }
}
</style>
