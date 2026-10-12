<template>
  <div class="ui-modal-backdrop" @mousedown.self="$emit('close')">
    <form class="ui-modal" style="max-width: 1000px" role="dialog" aria-modal="true" aria-labelledby="dl-title" data-testid="delivery-modal" @submit.prevent="save">
      <div class="ui-modal__head">
        <div>
          <h2 id="dl-title">Receive a delivery</h2>
          <p class="mlead">Stock goes into {{ locationName(loc) || 'the main store' }}; costs update the average cost and price history.</p>
        </div>
        <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="$emit('close')"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="ui-modal__body body">
        <div class="grid">
          <label class="ui-field">
            <span class="ui-label">Purchase order</span>
            <select v-model="poId" class="ui-select" data-testid="dl-po">
              <option value="">No purchase order</option>
              <option v-for="p in pos" :key="p.id" :value="p.id">{{ p.order_number }} · {{ p.supplier }}</option>
            </select>
          </label>
          <label class="ui-field">
            <span class="ui-label is-required">Supplier</span>
            <select v-model="supplierId" class="ui-select" required :disabled="!!poId" data-testid="dl-supplier">
              <option value="">Choose…</option>
              <option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.name || s.company_name }}</option>
            </select>
          </label>
          <label class="ui-field">
            <span class="ui-label">Delivery note no.</span>
            <input v-model.trim="note_no" class="ui-input" maxlength="80" placeholder="e.g. DN-20431" data-testid="dl-note-no" />
          </label>
          <label class="ui-field">
            <span class="ui-label">Date</span>
            <input v-model="date" class="ui-input" type="date" required :max="today" data-testid="dl-date" />
          </label>
          <label class="ui-field">
            <span class="ui-label">Received at</span>
            <select v-model="loc" class="ui-select" data-testid="dl-loc">
              <option v-for="l in bar.locations" :key="l.id" :value="l.id">{{ l.name }}</option>
            </select>
          </label>
        </div>

        <div class="ui-table-wrap">
          <table class="ui-table lines">
            <thead>
              <tr>
                <th>Item</th>
                <th class="num">Quantity</th>
                <th class="num">Cost per {{ costUnitWord }}</th>
                <th class="num">Damaged</th>
                <th class="num hide-sm">Line</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(l, i) in lines" :key="l.product_id" :data-line="l.item.name">
                <td>
                  <strong>{{ l.item.name }}</strong>
                  <small v-if="l.outstanding !== undefined" class="sub">{{ fmtNum(l.outstanding, 1) }} {{ plural(l.item.unit_label || 'unit', l.outstanding) }} still on order</small>
                </td>
                <td class="num">
                  <div class="qcell">
                    <input v-model.number="l.qty" class="ui-input" type="number" min="0" step="any" inputmode="decimal" :aria-label="`${l.item.name} quantity`" :data-testid="'dl-qty-' + i" />
                    <select v-if="Number(l.item.pack_size) > 1" v-model="l.unit" class="ui-select" :aria-label="`${l.item.name} unit`" :data-testid="'dl-unit-' + i">
                      <option value="unit">{{ plural(l.item.unit_label || 'unit', 2) }}</option>
                      <option value="pack">{{ plural(l.item.pack_label || 'pack', 2) }} of {{ l.item.pack_size }}</option>
                    </select>
                    <span v-else class="u">{{ plural(l.item.unit_label || 'unit', 2) }}</span>
                  </div>
                </td>
                <td class="num">
                  <input v-model="l.unit_cost" class="ui-input cost" type="number" min="0" step="any" inputmode="decimal" :placeholder="l.last ? String(l.last) : '0'" :aria-label="`${l.item.name} cost per ${l.item.unit_label || 'unit'}`" :data-testid="'dl-cost-' + i" />
                  <small class="sub">per {{ l.item.unit_label || 'unit' }}<template v-if="Number(l.item.pack_size) > 1 && Number(l.unit_cost) > 0"> · {{ money(Number(l.unit_cost) * Number(l.item.pack_size)) }}/{{ l.item.pack_label || 'pack' }}</template></small>
                </td>
                <td class="num"><input v-model.number="l.damaged" class="ui-input dmg" type="number" min="0" step="1" inputmode="numeric" :aria-label="`${l.item.name} damaged`" :data-testid="'dl-damaged-' + i" /></td>
                <td class="num hide-sm">{{ money(lineTotal(l)) }}</td>
                <td><button type="button" class="ui-btn ui-btn--ghost ui-btn--icon ui-btn--sm" :aria-label="`Remove ${l.item.name}`" @click="lines.splice(i, 1)"><i class="fa-solid fa-xmark"></i></button></td>
              </tr>
              <tr v-if="!lines.length">
                <td colspan="6" class="empty">Add the items on the delivery note.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <ItemPicker :items="items" :exclude="lines.map((l) => l.product_id)" placeholder="Add an item — search or scan" testid="dl-pick" @pick="add" />
        <div class="foot-row">
          <label class="ui-field grow">
            <span class="ui-label">Note</span>
            <input v-model.trim="note" class="ui-input" maxlength="300" placeholder="Optional" />
          </label>
          <div class="total"><span>Total</span><strong data-testid="dl-total">{{ money(total) }}</strong></div>
        </div>
        <p class="ui-hint">Costs are per {{ costUnitWord }} (bottle, can…), before tax. Damaged units are booked in and written off as “damaged on delivery”.</p>
        <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>
      </div>
      <div class="ui-modal__foot">
        <button type="button" class="ui-btn" @click="$emit('close')">Cancel</button>
        <button type="submit" class="ui-btn ui-btn--primary" :disabled="busy || !lines.length" data-testid="dl-save">{{ busy ? 'Receiving…' : 'Receive delivery' }}</button>
      </div>
    </form>
  </div>
</template>

<script>
import { bar, money, locationName, mainStoreId } from './barContext'
import { barApi } from '@/services/bar'
import { apiErrorMessage, listFrom } from '@/services/api'
import { supplierService } from '@/services/supplierService'
import { toast } from '@/composables/useToast'
import { isoDate } from '@/utils/format'
import { fmtNum, plural } from '@/utils/barUnits'
import ItemPicker from './ItemPicker.vue'

export default {
  name: 'DeliveryModal',
  components: { ItemPicker },
  props: { preset: { type: Object, default: () => ({}) } },
  emits: ['close', 'saved'],
  data() {
    return {
      bar,
      pos: [],
      suppliers: [],
      items: [],
      poId: this.preset?.po?.id || '',
      supplierId: this.preset?.po?.supplier_id || '',
      note_no: '',
      date: isoDate(),
      today: isoDate(),
      loc: mainStoreId() || bar.locations[0]?.id || '',
      lines: [],
      note: '',
      busy: false,
      error: ''
    }
  },
  computed: {
    costUnitWord() {
      return 'bottle / unit'
    },
    total() {
      return this.lines.reduce((s, l) => s + this.lineTotal(l), 0)
    }
  },
  watch: {
    poId(id) {
      const p = this.pos.find((x) => x.id === id)
      if (p) this.fromPO(p)
    }
  },
  async created() {
    const [pos, sups, items] = await Promise.allSettled([barApi.openPos(), supplierService.getSuppliers({ limit: 500 }), barApi.items()])
    this.pos = pos.status === 'fulfilled' ? pos.value : []
    this.suppliers = sups.status === 'fulfilled' ? listFrom(sups.value, 'suppliers') : []
    this.items = items.status === 'fulfilled' ? items.value.filter((it) => it.active !== false) : []
    if (items.status === 'rejected') this.error = apiErrorMessage(items.reason, 'Could not load the stock items')
    const p = this.preset?.po && (this.pos.find((x) => x.id === this.preset.po.id) || this.preset.po)
    if (p) this.fromPO(p)
  },
  methods: {
    money,
    fmtNum,
    plural,
    locationName,
    stockUnits(l) {
      const q = Math.max(0, Number(l.qty) || 0)
      return l.unit === 'pack' ? q * Math.max(1, Number(l.item.pack_size) || 1) : q
    },
    lineTotal(l) {
      const c = l.unit_cost === '' || l.unit_cost === null ? Number(l.last) || 0 : Number(l.unit_cost) || 0
      return this.stockUnits(l) * c
    },
    fromPO(p) {
      this.supplierId = p.supplier_id || this.supplierId
      this.lines = []
      for (const pl of p.lines || []) {
        if (pl.is_bar_item === false || !(pl.outstanding > 0)) continue
        const it = this.items.find((x) => x.product_id === pl.product_id)
        if (!it) continue
        this.lines.push({ product_id: it.product_id, item: it, qty: pl.outstanding, unit: 'unit', unit_cost: pl.unit_cost ?? '', last: it.last_cost || '', damaged: 0, outstanding: pl.outstanding })
      }
    },
    add(it) {
      this.lines.push({ product_id: it.product_id, item: it, qty: Number(it.pack_size) > 1 ? 1 : 1, unit: Number(it.pack_size) > 1 ? 'pack' : 'unit', unit_cost: it.last_cost || '', last: it.last_cost || '', damaged: 0 })
    },
    async save() {
      this.error = ''
      if (!this.supplierId) return (this.error = 'Choose the supplier')
      if (this.lines.some((l) => !(Number(l.qty) > 0))) return (this.error = 'Every line needs a quantity')
      if (this.lines.some((l) => Number(l.damaged) > this.stockUnits(l))) return (this.error = 'Damaged can’t be more than was delivered')
      const body = {
        po_id: this.poId || undefined,
        supplier_id: this.supplierId,
        delivery_note: this.note_no,
        date: this.date,
        location_id: this.loc,
        note: this.note,
        lines: this.lines.map((l) => {
          const out = { product_id: l.product_id, qty: Number(l.qty), unit: l.unit, damaged: Number(l.damaged) || 0 }
          if (l.unit_cost !== '' && l.unit_cost !== null && l.unit_cost !== undefined) out.unit_cost = Number(l.unit_cost)
          return out
        })
      }
      this.busy = true
      try {
        const d = await barApi.receiveDelivery(body)
        toast.success(`Delivery received into ${locationName(this.loc)}${d?.delivery_note ? ' · ' + d.delivery_note : ''}`)
        this.$emit('saved', d)
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not receive the delivery')
      } finally {
        this.busy = false
      }
    }
  }
}
</script>

<style scoped>
.mlead {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--text-3);
}
.body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 10px 12px;
}
.lines td,
.lines th {
  font-variant-numeric: tabular-nums;
  vertical-align: middle;
}
.lines td:first-child {
  min-width: 190px;
}
.sub {
  display: block;
  font-size: 12px;
  color: var(--text-3);
}
.qcell {
  display: inline-flex;
  gap: 6px;
  align-items: center;
}
.qcell .ui-input {
  width: 76px;
  text-align: right;
}
.qcell .ui-select {
  width: auto;
  min-width: 100px;
}
.qcell .u {
  font-size: 12px;
  color: var(--text-3);
  min-width: 52px;
  text-align: left;
}
.cost {
  width: 100px;
  text-align: right;
}
.dmg {
  width: 64px;
  text-align: right;
}
.empty {
  text-align: center;
  color: var(--text-3);
}
.foot-row {
  display: flex;
  gap: 16px;
  align-items: flex-end;
  flex-wrap: wrap;
}
.grow {
  flex: 1 1 260px;
}
.total {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}
.total span {
  font-size: 12px;
  color: var(--text-3);
}
.total strong {
  font-size: 20px;
  font-variant-numeric: tabular-nums;
}
@media (max-width: 640px) {
  .hide-sm {
    display: none;
  }
}
</style>
