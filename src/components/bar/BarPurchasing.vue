<template>
  <div class="pu" data-testid="bar-purchasing">
    <!-- Reorder suggestions -->
    <section class="blk">
      <div class="blk__head">
        <div>
          <h3>Reorder suggestions</h3>
          <p>Par − on hand − already on order, rounded up to whole packs, grouped by preferred supplier.</p>
        </div>
        <div class="head-tools">
          <select v-model="loc" class="ui-select" aria-label="Reorder for" data-testid="reorder-loc">
            <option value="">Main store</option>
            <option value="total">Whole club (all locations)</option>
            <option v-for="l in bar.locations" :key="l.id" :value="l.id">{{ l.name }}</option>
          </select>
          <button type="button" class="ui-btn ui-btn--icon ui-btn--sm" aria-label="Refresh suggestions" :disabled="loading" @click="loadReorder"><i class="fa-solid fa-rotate" :class="{ 'fa-spin': loading }"></i></button>
        </div>
      </div>

      <div v-if="reorderError" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ reorderError }}</span></div>
      <div v-else-if="loading && !groups.length" class="ui-skeleton" style="height: 160px"></div>
      <div v-else-if="!groups.length" class="ui-empty small" data-testid="reorder-empty">
        <div class="ui-empty__icon ok"><i class="fa-solid fa-check"></i></div>
        <h3>Nothing to order</h3>
        <p>Everything with a par level is above its reorder point (counting stock on order). Set par levels on each item to get suggestions.</p>
      </div>
      <template v-else>
        <div v-for="(g, gi) in groups" :key="g.key" class="grp" :data-supplier="g.supplierName || 'none'">
          <header class="grp__head">
            <label class="ui-switch"><input v-model="g.on" type="checkbox" :aria-label="`Order from ${g.supplierName || 'this supplier'}`" /><span></span></label>
            <div class="grp__sup">
              <strong v-if="g.supplier_id">{{ g.supplierName }}</strong>
              <select v-else v-model="g.pick" class="ui-select" aria-label="Supplier" :data-testid="'reorder-supplier-' + gi">
                <option value="">Choose a supplier…</option>
                <option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.name || s.company_name }}</option>
              </select>
              <small>{{ g.lines.filter((l) => l.on).length }} of {{ g.lines.length }} items<template v-if="perm.approve && groupTotal(g) !== null"> · {{ money(groupTotal(g)) }}</template></small>
            </div>
          </header>
          <div class="ui-table-wrap">
            <table class="ui-table tbl">
              <thead>
                <tr>
                  <th class="ck"></th>
                  <th>Item</th>
                  <th class="num hide-sm">On hand</th>
                  <th class="num hide-sm">On order</th>
                  <th class="num hide-sm">Par</th>
                  <th class="num">Order</th>
                  <th v-if="perm.approve" class="num hide-sm">Last / best</th>
                  <th v-if="perm.approve" class="num">Line</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="l in g.lines" :key="l.product_id" :class="{ off: !l.on }" :data-line="l.name">
                  <td class="ck"><input v-model="l.on" type="checkbox" :aria-label="`Order ${l.name}`" /></td>
                  <td>
                    <strong>{{ l.name }}</strong>
                    <small class="sub show-sm">{{ l.on_hand_text }} on hand · par {{ fmtNum(l.par, 1) }}</small>
                  </td>
                  <td class="num hide-sm">{{ l.on_hand_text }}</td>
                  <td class="num hide-sm">{{ l.on_order ? fmtNum(l.on_order, 1) : '—' }}</td>
                  <td class="num hide-sm">{{ fmtNum(l.par, 1) }}</td>
                  <td class="num">
                    <div class="packs">
                      <input v-model.number="l.packs" class="ui-input" type="number" min="0" step="1" inputmode="numeric" :aria-label="`${l.name} packs`" :data-testid="'packs-' + l.name" />
                      <span>{{ packWord(l) }}</span>
                    </div>
                    <small class="sub">= {{ units(l) }} {{ plural(l.unit_label || 'unit', units(l)) }}</small>
                  </td>
                  <td v-if="perm.approve" class="num hide-sm">
                    {{ has(l.last_cost) && l.last_cost ? money(l.last_cost) : '—' }}
                    <small v-if="has(l.best_cost) && l.best_cost" class="sub" :class="{ better: l.best_cost < l.unit_cost - 0.005 }">best {{ money(l.best_cost) }}<template v-if="l.best_supplier"> · {{ l.best_supplier }}</template></small>
                  </td>
                  <td v-if="perm.approve" class="num">{{ has(l.unit_cost) ? money(units(l) * l.unit_cost) : '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="blk__foot">
          <span class="muted">{{ selectedGroups.length }} purchase order{{ selectedGroups.length === 1 ? '' : 's' }} · drafts you can review and send from Suppliers</span>
          <button v-if="perm.approve" type="button" class="ui-btn ui-btn--primary" :disabled="creating || !selectedGroups.length" data-testid="create-pos" @click="createPOs"><i class="fa-solid fa-file-circle-plus"></i> Create purchase orders</button>
          <span v-else class="muted">A manager creates the purchase orders.</span>
        </div>
      </template>
    </section>

    <!-- Open purchase orders -->
    <section class="blk">
      <div class="blk__head">
        <div>
          <h3>Open purchase orders</h3>
          <p>Expected deliveries with bar items. Receive one when the delivery arrives.</p>
        </div>
        <button v-if="perm.edit" type="button" class="ui-btn ui-btn--sm" data-testid="receive-no-po" @click="$emit('receive', {})"><i class="fa-solid fa-truck-ramp-box"></i> Receive without a PO</button>
      </div>
      <div v-if="!pos.length" class="ui-empty small"><p>No open purchase orders.</p></div>
      <ul v-else class="list">
        <li v-for="p in pos" :key="p.id" :data-po="p.order_number">
          <div class="list__main">
            <strong>{{ p.order_number }} · {{ p.supplier || 'Supplier' }}</strong>
            <small>
              <span class="ui-badge" :class="poBadge(p)">{{ poLabel(p) }}</span>
              {{ p.expected_date ? 'expected ' + formatDate(p.expected_date) : 'no delivery date' }}
              <span v-if="p.overdue" class="late">· overdue</span>
              · {{ (p.lines || []).filter((l) => l.outstanding > 0).length }} line(s) to come<template v-if="perm.approve && has(p.total_cost)"> · {{ money(p.total_cost) }}</template>
            </small>
          </div>
          <button v-if="perm.edit" type="button" class="ui-btn ui-btn--primary ui-btn--sm" :data-testid="'receive-po-' + p.order_number" @click="$emit('receive', { po: p })">Receive</button>
        </li>
      </ul>
    </section>

    <!-- Recent deliveries -->
    <section class="blk">
      <div class="blk__head">
        <div>
          <h3>Recent deliveries</h3>
          <p>Stock received, with delivery notes and what arrived damaged.</p>
        </div>
      </div>
      <div v-if="!deliveries.length" class="ui-empty small"><p>No deliveries received yet.</p></div>
      <div v-else class="ui-table-wrap">
        <table class="ui-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Supplier</th>
              <th class="hide-sm">Delivery note</th>
              <th class="hide-sm">To</th>
              <th class="num">Items</th>
              <th v-if="perm.approve" class="num">Cost</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in deliveries" :key="d.id">
              <td>{{ formatDate(d.date) }}</td>
              <td>{{ d.supplier || '—' }}<small v-if="d.po_number" class="sub">{{ d.po_number }}</small></td>
              <td class="hide-sm">{{ d.delivery_note || '—' }}</td>
              <td class="hide-sm">{{ d.location || locationName(d.location_id) }}</td>
              <td class="num">{{ (d.lines || []).length }}<small v-if="damaged(d)" class="sub dmg">{{ damaged(d) }} damaged</small></td>
              <td v-if="perm.approve" class="num">{{ has(d.total_cost) ? money(d.total_cost) : '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script>
import { bar, money, has, locationName } from './barContext'
import { barApi, arr } from '@/services/bar'
import { apiErrorMessage, listFrom } from '@/services/api'
import { supplierService, poStatusMeta } from '@/services/supplierService'
import { toast } from '@/composables/useToast'
import { formatDate } from '@/utils/format'
import { fmtNum, plural } from '@/utils/barUnits'

export default {
  name: 'BarPurchasing',
  props: {
    perm: { type: Object, required: true },
    version: { type: Number, default: 0 }
  },
  emits: ['receive', 'changed'],
  data() {
    return { bar, loc: '', groups: [], loading: false, reorderError: '', suppliers: [], pos: [], deliveries: [], creating: false }
  },
  computed: {
    selectedGroups() {
      return this.groups.filter((g) => g.on && g.lines.some((l) => l.on && this.units(l) > 0))
    }
  },
  watch: {
    loc() {
      this.loadReorder()
    },
    version() {
      this.loadAll()
    }
  },
  created() {
    this.loadAll()
    supplierService
      .getSuppliers({ limit: 500 })
      .then((r) => (this.suppliers = listFrom(r, 'suppliers')))
      .catch(() => (this.suppliers = []))
  },
  methods: {
    money,
    has,
    fmtNum,
    plural,
    formatDate,
    locationName,
    loadAll() {
      this.loadReorder()
      this.loadPOs()
      this.loadDeliveries()
    },
    packWord(l) {
      return Number(l.pack_size) > 1 ? plural(l.pack_label || 'pack', 2) : plural(l.unit_label || 'unit', 2)
    },
    units(l) {
      const n = Math.max(0, Number(l.packs) || 0)
      return n * Math.max(1, Number(l.pack_size) || 1)
    },
    groupTotal(g) {
      if (!g.lines.some((l) => has(l.unit_cost))) return null
      return g.lines.filter((l) => l.on).reduce((s, l) => s + this.units(l) * (Number(l.unit_cost) || 0), 0)
    },
    damaged(d) {
      const n = (d.lines || []).reduce((s, l) => s + (Number(l.damaged) || 0), 0)
      return n ? fmtNum(n, 1) : 0
    },
    poLabel(p) {
      return poStatusMeta(p.status).label
    },
    poBadge(p) {
      return 'ui-badge--' + poStatusMeta(p.status).badge
    },
    async loadReorder() {
      this.loading = true
      this.reorderError = ''
      try {
        const d = await barApi.reorder({ location_id: this.loc })
        this.groups = arr(d, 'groups').map((g, i) => ({
          key: g.supplier_id || 'none-' + i,
          supplier_id: g.supplier_id || '',
          supplierName: g.supplier?.name || '',
          pick: '',
          on: true,
          lines: arr(g, 'lines').map((l) => ({ ...l, on: true, packs: Number(l.suggest_packs) || Math.ceil((Number(l.suggest_units) || 0) / Math.max(1, Number(l.pack_size) || 1)) }))
        }))
      } catch (e) {
        this.reorderError = apiErrorMessage(e, 'Could not work out the reorder')
      } finally {
        this.loading = false
      }
    },
    async loadPOs() {
      try {
        this.pos = await barApi.openPos()
      } catch {
        this.pos = []
      }
    },
    async loadDeliveries() {
      try {
        this.deliveries = await barApi.deliveries({ limit: 20 })
      } catch {
        this.deliveries = []
      }
    },
    async createPOs() {
      const groups = []
      for (const g of this.selectedGroups) {
        const sid = g.supplier_id || g.pick
        if (!sid) {
          toast.error('Choose a supplier for the items without one (or untick them)')
          return
        }
        groups.push({ supplier_id: sid, lines: g.lines.filter((l) => l.on && this.units(l) > 0).map((l) => ({ product_id: l.product_id, qty_units: this.units(l), unit_cost: has(l.unit_cost) ? Number(l.unit_cost) : undefined })) })
      }
      this.creating = true
      try {
        const made = await barApi.createPos(groups)
        const nums = made.map((p) => p.order_number).filter(Boolean)
        toast.success(`${made.length || groups.length} draft purchase order${(made.length || groups.length) === 1 ? '' : 's'} created${nums.length ? ': ' + nums.join(', ') : ''}`, { action: { label: 'Open Suppliers', run: () => this.$router.push('/suppliers') } })
        this.loadAll()
        this.$emit('changed')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not create the purchase orders'))
      } finally {
        this.creating = false
      }
    }
  }
}
</script>

<style scoped>
.pu {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.blk {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.blk__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
  flex-wrap: wrap;
}
.blk__head > div:first-child {
  flex: 1 1 260px;
}
.blk h3 {
  font-size: 15px;
  margin: 0 0 2px;
}
.blk__head p {
  margin: 0;
  font-size: 13px;
  color: var(--text-3);
}
.head-tools {
  display: flex;
  gap: 6px;
}
.head-tools .ui-select {
  width: 220px;
}
.blk__foot {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.muted {
  color: var(--text-3);
  font-size: 13px;
}
.grp {
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  overflow: hidden;
}
.grp__head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: var(--surface-2);
  border-bottom: 1px solid var(--border);
}
.grp__sup {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}
.grp__sup .ui-select {
  max-width: 280px;
}
.grp__sup small {
  font-size: 12px;
  color: var(--text-3);
}
.tbl td,
.tbl th {
  font-variant-numeric: tabular-nums;
}
.ck {
  width: 30px;
}
.tbl td:nth-child(2) {
  min-width: 190px;
}
tr.off td {
  opacity: 0.5;
}
.sub {
  display: block;
  font-size: 12px;
  color: var(--text-3);
  font-weight: 400;
}
.better {
  color: var(--success);
}
.dmg {
  color: var(--danger);
}
.packs {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.packs .ui-input {
  width: 70px;
  text-align: right;
}
.packs span {
  font-size: 12px;
  color: var(--text-3);
  min-width: 40px;
  text-align: left;
}
.list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.list li {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-top: 1px solid var(--border);
}
.list li:first-child {
  border-top: 0;
}
.list__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.list__main small {
  font-size: 12.5px;
  color: var(--text-3);
}
.late {
  color: var(--danger);
  font-weight: 600;
}
.show-sm {
  display: none;
}
@media (max-width: 760px) {
  .hide-sm {
    display: none;
  }
  .show-sm {
    display: block;
  }
  .blk {
    padding: 12px;
  }
  .head-tools {
    width: 100%;
  }
  .head-tools .ui-select {
    flex: 1;
    width: auto;
  }
}
</style>
