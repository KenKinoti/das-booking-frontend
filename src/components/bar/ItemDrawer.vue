<template>
  <BarDrawer :title="it ? it.name : 'Loading…'" eyebrow="Stock item" width="720px" testid="item-drawer" @close="$emit('close')">
    <template v-if="it" #sub>
      <span><i :class="catIcon(it.category)"></i> {{ catLabel(it.category) }}</span>
      <span>{{ sizeText }}</span>
      <span v-if="it.sku">SKU {{ it.sku }}</span>
      <span v-if="it.barcode"><i class="fa-solid fa-barcode"></i> {{ it.barcode }}</span>
      <span v-if="it.active === false" class="ui-badge ui-badge--void">Inactive</span>
    </template>
    <template v-if="it" #actions>
      <button v-if="perm.edit" type="button" class="ui-btn ui-btn--sm" data-testid="item-edit" @click="editOpen = true"><i class="fa-regular fa-pen-to-square"></i><span class="hide-xs"> Edit</span></button>
    </template>

    <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>
    <div v-else-if="!it" class="ui-skeleton" style="height: 320px"></div>
    <template v-else>
      <div class="stats">
        <div>
          <span>On hand</span><strong data-testid="item-total">{{ qtyText(total, it) }}</strong><small v-if="isMl(it)">{{ fmtNum(tots(total, it, totMl), 0) }} tots of {{ totOf }} ml</small>
        </div>
        <div v-if="perm.approve">
          <span>Average cost</span><strong>{{ has(it.avg_cost) ? money(Number(it.avg_cost) * unitSize(it)) : '—' }}</strong><small>per {{ it.unit_label || 'unit' }}<template v-if="isMl(it) && has(it.avg_cost)"> · {{ money(Number(it.avg_cost) * totOf) }}/tot</template></small>
        </div>
        <div v-if="perm.approve">
          <span>Value</span><strong>{{ has(it.value) ? money(it.value) : '—' }}</strong><small>at average cost</small>
        </div>
        <div v-if="perm.approve">
          <span>Last cost</span><strong>{{ has(it.last_cost) ? money(it.last_cost) : '—' }}</strong><small>{{ it.preferred_supplier?.name || it.preferred_supplier_name || 'no preferred supplier' }}</small>
        </div>
      </div>

      <div class="acts">
        <button v-if="perm.edit && isMl(it)" type="button" class="ui-btn ui-btn--sm" data-testid="make-menu" @click="menuOpen = true"><i class="fa-solid fa-whiskey-glass"></i> Create tot &amp; bottle menu items</button>
        <button v-if="perm.create" type="button" class="ui-btn ui-btn--sm" @click="transferOpen = true"><i class="fa-solid fa-right-left"></i> {{ perm.edit ? 'Transfer' : 'Request' }}</button>
        <button v-if="perm.create" type="button" class="ui-btn ui-btn--sm" @click="wastageOpen = true"><i class="fa-solid fa-wine-glass-empty"></i> Log wastage</button>
        <button v-if="perm.delete" type="button" class="ui-btn ui-btn--ghost ui-btn--sm danger" @click="remove"><i class="fa-regular fa-trash-can"></i> Delete</button>
      </div>

      <section>
        <h3>Stock by location</h3>
        <div class="ui-table-wrap">
          <table class="ui-table">
            <thead>
              <tr>
                <th>Location</th>
                <th class="num">On hand</th>
                <th class="num">Par</th>
                <th class="num">Reorder at</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in perLocation" :key="s.location_id" :data-loc="s.name">
                <td>{{ s.name }} <span v-if="s.low" class="ui-badge ui-badge--warning">Low</span></td>
                <td class="num" :class="{ neg: s.qty < 0 }">{{ qtyText(s.qty, it, { packs: s.type === 'store' }) }}</td>
                <td class="num">{{ s.par ? qtyText(s.par * unitSize(it), it) : '—' }}</td>
                <td class="num">{{ s.reorder_point ? qtyText(s.reorder_point * unitSize(it), it) : '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div class="ui-tabs sub-tabs" role="tablist">
          <button type="button" class="ui-tab" :class="{ 'is-active': sub === 'ledger' }" role="tab" @click="sub = 'ledger'">Ledger <span class="count">{{ movements.length }}</span></button>
          <button v-if="perm.approve" type="button" class="ui-tab" :class="{ 'is-active': sub === 'prices' }" role="tab" @click="sub = 'prices'">Price history</button>
          <button type="button" class="ui-tab" :class="{ 'is-active': sub === 'used' }" role="tab" @click="sub = 'used'">Used in <span class="count">{{ usedIn.length }}</span></button>
        </div>

        <div v-if="sub === 'ledger'">
          <div v-if="!movements.length" class="ui-empty small"><p>No movements yet — deliveries, transfers, sales, wastage and counts will be listed here.</p></div>
          <ul v-else class="ledger" data-testid="item-ledger">
            <li v-for="m in movements" :key="m.id" :data-kind="m.kind">
              <span class="ledger__ic" :class="Number(m.qty) >= 0 ? 'in' : 'out'"><i :class="Number(m.qty) >= 0 ? 'fa-solid fa-arrow-down' : 'fa-solid fa-arrow-up'"></i></span>
              <div class="ledger__main">
                <strong>{{ movementLabel(m.kind) }}<template v-if="m.ref_label"> · {{ m.ref_label }}</template><span v-if="m.oversold" class="ui-badge ui-badge--warning os">sold more than recorded</span></strong>
                <small>{{ m.location || locationName(m.location_id) }} · {{ when(m) }}<template v-if="m.user"> · {{ m.user }}</template><template v-if="m.note && !m.oversold"> · {{ m.note }}</template></small>
              </div>
              <span class="ledger__qty" :class="Number(m.qty) >= 0 ? 'pos' : 'negv'">{{ signedQty(m.qty, it) }}</span>
            </li>
          </ul>
        </div>

        <div v-else-if="sub === 'prices'">
          <div v-if="!prices.length" class="ui-empty small"><p>No purchase prices yet — they are recorded with each delivery.</p></div>
          <table v-else class="ui-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Supplier</th>
                <th class="num">Cost per {{ it.unit_label || 'unit' }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(p, i) in prices" :key="i">
                <td>{{ formatDate(p.date || p.created_at) }}</td>
                <td>{{ p.supplier_name || p.supplier || '—' }}</td>
                <td class="num">{{ money(p.unit_cost) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else>
          <div v-if="!usedIn.length" class="ui-empty small">
            <p>No menu item uses {{ it.name }} yet.</p>
            <button v-if="perm.edit && isMl(it)" type="button" class="ui-btn ui-btn--sm" style="margin-top: 8px" @click="menuOpen = true">Create tot &amp; bottle</button>
          </div>
          <ul v-else class="used">
            <li v-for="u in usedIn" :key="u.pos_product_id || u.product_id || u.name">
              <strong>{{ u.name || u.pos_product_name }}</strong>
              <span>{{ qtyText(u.qty, it) }}<template v-if="isMl(it)"> · {{ fmtNum(tots(u.qty, it, totMl), 1) }} tot</template> per serve</span>
            </li>
          </ul>
        </div>
      </section>
    </template>

    <ItemModal v-if="editOpen" :item="it" @close="editOpen = false" @saved="onEdited" />
    <MenuItemsModal v-if="menuOpen" :item="it" @close="menuOpen = false" @saved="onMenu" />
    <TransferModal v-if="transferOpen" :preset="{ lines: [{ product_id: it.product_id }] }" :perm="perm" @close="transferOpen = false" @saved="onChanged" />
    <WastageModal v-if="wastageOpen" :perm="perm" :product-id="it.product_id" @close="wastageOpen = false" @saved="onChanged" />
  </BarDrawer>
</template>

<script>
import BarDrawer from './BarDrawer.vue'
import ItemModal from './ItemModal.vue'
import MenuItemsModal from './MenuItemsModal.vue'
import TransferModal from './TransferModal.vue'
import WastageModal from './WastageModal.vue'
import { bar, money, has, locationName, orgTotMl } from './barContext'
import { barApi, arr } from '@/services/bar'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'
import { formatDate, formatDateTime } from '@/utils/format'
import { qtyText, signedQty, categoryLabel, categoryIcon, isMl, tots, totMl, fmtNum, unitSize, mlText, movementLabel, reasonLabel } from '@/utils/barUnits'

export default {
  name: 'ItemDrawer',
  components: { BarDrawer, ItemModal, MenuItemsModal, TransferModal, WastageModal },
  props: {
    id: { type: String, required: true },
    perm: { type: Object, required: true }
  },
  emits: ['close', 'changed'],
  data() {
    return { d: null, error: '', sub: 'ledger', editOpen: false, menuOpen: false, transferOpen: false, wastageOpen: false }
  },
  computed: {
    it() {
      if (!this.d) return null
      return this.d.item ? { ...this.d.item } : this.d
    },
    totMl() {
      return orgTotMl()
    },
    totOf() {
      return totMl(this.it, this.totMl)
    },
    sizeText() {
      const it = this.it
      const pack = Number(it.pack_size) > 1 ? ` · ${it.pack_size} per ${it.pack_label || 'case'}` : ''
      return isMl(it) ? `${mlText(unitSize(it))} ${it.unit_label || 'bottle'}${pack}` : `${it.unit_label || 'unit'}${pack}`
    },
    stockRows() {
      return arr(this.d, 'stock', 'locations', 'stock_by_location')
    },
    perLocation() {
      const rows = this.stockRows
      return bar.locations.map((l) => {
        const r = rows.find((x) => x.location_id === l.id) || {}
        const pars = arr(this.it, 'pars', 'par_levels').find((x) => x.location_id === l.id) || {}
        return {
          location_id: l.id,
          name: l.name,
          type: l.type,
          qty: Number(r.qty ?? r.on_hand ?? 0) || 0,
          par: Number(r.par ?? pars.par) || 0,
          reorder_point: Number(r.reorder_point ?? pars.reorder_point) || 0,
          low: !!r.low
        }
      })
    },
    total() {
      const t = this.it?.on_hand
      if (t !== undefined && t !== null && !this.stockRows.length) return Number(t) || 0
      return this.perLocation.reduce((s, r) => s + r.qty, 0)
    },
    movements() {
      return arr(this.d, 'movements', 'ledger')
    },
    prices() {
      return arr(this.d, 'price_history', 'prices')
    },
    usedIn() {
      return arr(this.d, 'used_in', 'recipes', 'recipe_usage')
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
    isMl,
    tots,
    fmtNum,
    unitSize,
    formatDate,
    locationName,
    movementLabel,
    reasonLabel,
    catLabel: categoryLabel,
    catIcon: categoryIcon,
    when(m) {
      const t = m.created_at || m.at
      const bd = m.business_date ? String(m.business_date).slice(0, 10) : ''
      return `${formatDateTime(t)}${bd && t && bd !== String(t).slice(0, 10) ? ` (night of ${formatDate(bd, 'short')})` : ''}`
    },
    async load() {
      this.error = ''
      try {
        this.d = await barApi.item(this.id)
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load the item')
      }
    },
    onEdited() {
      this.editOpen = false
      this.load()
      this.$emit('changed')
    },
    onMenu() {
      this.menuOpen = false
      this.sub = 'used'
      this.load()
      this.$emit('changed')
    },
    onChanged() {
      this.transferOpen = false
      this.wastageOpen = false
      this.load()
      this.$emit('changed')
    },
    async remove() {
      const ok = await confirmDialog({ title: `Delete ${this.it.name}?`, message: 'The item and its par levels are removed. Items with stock history are kept for the record and can only be made inactive.', confirmText: 'Delete', danger: true })
      if (!ok) return
      try {
        await barApi.deleteItem(this.it.product_id || this.id)
        toast.success(`${this.it.name} deleted`)
        this.$emit('changed')
        this.$emit('close')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not delete the item'))
      }
    }
  }
}
</script>

<style scoped>
.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
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
.stats small {
  font-size: 11.5px;
  color: var(--text-3);
}
.acts {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.danger {
  color: var(--danger);
}
section h3 {
  font-size: 14px;
  margin: 0 0 8px;
}
.neg {
  color: var(--danger);
  font-weight: 600;
}
.sub-tabs {
  margin-bottom: 10px;
}
.ledger,
.used {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}
.ledger li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
}
.ledger__ic {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  font-size: 12px;
  flex-shrink: 0;
}
.ledger__ic.in {
  background: var(--success-soft);
  color: var(--success);
}
.ledger__ic.out {
  background: var(--danger-soft);
  color: var(--danger);
}
.ledger__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.ledger__main strong {
  font-size: 13.5px;
  font-weight: 600;
}
.ledger__main small {
  font-size: 12px;
  color: var(--text-3);
  overflow-wrap: anywhere;
}
.os {
  margin-left: 6px;
  font-size: 11px;
}
.ledger__qty {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  white-space: nowrap;
  font-size: 13px;
}
.pos {
  color: var(--success);
}
.negv {
  color: var(--danger);
}
.used li {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
  font-size: 13.5px;
}
.used li span {
  color: var(--text-3);
  font-variant-numeric: tabular-nums;
}
@media (max-width: 480px) {
  .hide-xs {
    display: none;
  }
}
</style>
