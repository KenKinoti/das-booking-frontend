<template>
  <div class="st" data-testid="bar-stock-tab">
    <div class="toolbar">
      <select v-model="loc" class="ui-select loc" aria-label="Location" data-testid="stock-loc">
        <option value="">All locations</option>
        <option v-for="l in bar.locations" :key="l.id" :value="l.id">{{ l.name }}</option>
      </select>
      <div class="ui-input-group search">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input v-model="q" class="ui-input" type="search" placeholder="Search name, SKU or barcode" aria-label="Search stock items" data-testid="stock-search" />
      </div>
      <select v-model="cat" class="ui-select cat" aria-label="Category" data-testid="stock-cat">
        <option value="">All categories</option>
        <option v-for="c in cats" :key="c.key" :value="c.key">{{ c.label }} ({{ c.count }})</option>
      </select>
      <label class="ui-switch low"><input v-model="lowOnly" type="checkbox" data-testid="stock-low" /><span>Low only</span></label>
      <div class="toolbar__end">
        <button v-if="perm.edit && items.length" type="button" class="ui-btn ui-btn--sm" :disabled="!list.length" title="Download the stock list (CSV)" @click="exportCsv"><i class="fa-solid fa-download"></i><span class="hide-sm"> CSV</span></button>
        <button v-if="perm.edit" type="button" class="ui-btn ui-btn--sm" data-testid="starter-list" @click="starterOpen = true"><i class="fa-solid fa-list-check"></i><span class="hide-sm"> Starter list</span></button>
        <button v-if="perm.edit" type="button" class="ui-btn ui-btn--primary ui-btn--sm" data-testid="add-item" @click="itemModal = { item: null }"><i class="fa-solid fa-plus"></i> Add item</button>
      </div>
    </div>

    <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span></div>
    <div v-else-if="loading && !items.length" class="sk"><div v-for="n in 6" :key="n" class="ui-skeleton" style="height: 44px"></div></div>

    <div v-else-if="!items.length && !q && !cat && !lowOnly" class="ui-empty" data-testid="stock-empty">
      <div class="ui-empty__icon"><i class="fa-solid fa-bottle-droplet"></i></div>
      <h3>No stock items yet</h3>
      <p v-if="perm.edit">Pick what you carry from the starter list (spirits, beers, sodas, mixers — common in Kenya) or add your own. Quantities start at zero until your first delivery or count.</p>
      <p v-else>Your manager hasn’t added the stock items yet.</p>
      <div v-if="perm.edit" class="empty-actions">
        <button type="button" class="ui-btn ui-btn--primary" @click="starterOpen = true"><i class="fa-solid fa-list-check"></i> Add from the starter list</button>
        <button type="button" class="ui-btn" @click="itemModal = { item: null }"><i class="fa-solid fa-plus"></i> Add an item</button>
      </div>
    </div>

    <div v-else-if="!list.length" class="ui-empty small">
      <div class="ui-empty__icon"><i class="fa-solid fa-filter"></i></div>
      <h3>Nothing matches</h3>
      <p>No item matches these filters{{ loc ? ' at ' + locationName(loc) : '' }}.</p>
      <button type="button" class="ui-btn ui-btn--sm" style="margin-top: 10px" @click="clearFilters">Clear filters</button>
    </div>

    <template v-else>
      <div class="ui-table-wrap">
        <table class="ui-table tbl">
          <thead>
            <tr>
              <th>Item</th>
              <th class="hide-sm">Category</th>
              <th class="num">On hand{{ loc ? '' : ' (all)' }}</th>
              <th class="num hide-sm">{{ loc ? 'Par / reorder' : 'Reorder at' }}</th>
              <th v-if="perm.approve" class="num hide-sm">Avg cost</th>
              <th v-if="perm.approve" class="num">Value</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="it in list" :key="it.product_id" class="is-clickable" :data-item="it.name" @click="$emit('open-item', it.product_id)">
              <td>
                <div class="name">
                  <span class="cat-ic" :title="catLabel(it.category)"><i :class="catIcon(it.category)"></i></span>
                  <div class="min0">
                    <strong>{{ it.name }}</strong>
                    <small>{{ sizeText(it) }}<template v-if="it.sku"> · {{ it.sku }}</template></small>
                  </div>
                </div>
              </td>
              <td class="hide-sm">{{ catLabel(it.category) }}</td>
              <td class="num qty">
                <span :class="{ neg: Number(it.on_hand) < 0 }">{{ qtyText(it.on_hand, it, { packs: !loc || isStore(loc) }) }}</span>
                <span v-if="it.low" class="ui-badge ui-badge--warning lowb">Low</span>
                <small v-if="isMl(it) && Number(it.on_hand) > 0" class="sub">{{ fmtNum(tots(it.on_hand, it, totMl), 0) }} tots</small>
              </td>
              <td class="num hide-sm">{{ parText(it) }}</td>
              <td v-if="perm.approve" class="num hide-sm">{{ has(it.avg_cost) ? perUnitCost(it) : '—' }}</td>
              <td v-if="perm.approve" class="num">{{ has(it.value) ? money(it.value) : '—' }}</td>
            </tr>
          </tbody>
          <tfoot v-if="perm.approve && totalValue !== null">
            <tr>
              <td :colspan="2" class="hide-sm"><strong>{{ list.length }} item{{ list.length === 1 ? '' : 's' }}</strong></td>
              <td class="show-sm-only"><strong>{{ list.length }} items</strong></td>
              <td class="num hide-sm"></td>
              <td class="num hide-sm"></td>
              <td class="num hide-sm"></td>
              <td class="num"><strong>{{ money(totalValue) }}</strong></td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p class="foot-note">{{ list.length }} of {{ items.length }} items<template v-if="loc"> at {{ locationName(loc) }}</template> · quantities in bottles + ml (spirits & wine) or units (beer, soda), cases at the store.</p>
    </template>

    <ItemModal v-if="itemModal" :item="itemModal.item" @close="itemModal = null" @saved="onSaved" />
    <StarterModal v-if="starterOpen" @close="starterOpen = false" @added="onSaved" />
  </div>
</template>

<script>
import { bar, money, has, locationName, orgTotMl } from './barContext'
import { barApi } from '@/services/bar'
import { apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { downloadBlob } from '@/utils/format'
import { qtyText, categoryLabel, categoryIcon, isMl, tots, fmtNum, CATEGORIES, unitSize, mlText } from '@/utils/barUnits'
import ItemModal from './ItemModal.vue'
import StarterModal from './StarterModal.vue'

const LS = 'bar.stock.loc.v1'

export default {
  name: 'BarStockTab',
  components: { ItemModal, StarterModal },
  props: {
    perm: { type: Object, required: true },
    version: { type: Number, default: 0 }
  },
  emits: ['open-item', 'changed', 'transfer'],
  data() {
    let loc = ''
    try {
      loc = localStorage.getItem(LS) || ''
    } catch {
      loc = ''
    }
    if (loc && !bar.locations.some((l) => l.id === loc)) loc = ''
    return { bar, loc, q: '', cat: '', lowOnly: String(this.$route.query.low || '') === '1', items: [], loading: false, error: '', itemModal: null, starterOpen: false, seq: 0 }
  },
  computed: {
    totMl() {
      return orgTotMl()
    },
    cats() {
      const m = new Map()
      for (const it of this.items) m.set(it.category || 'other', (m.get(it.category || 'other') || 0) + 1)
      return CATEGORIES.filter((c) => m.has(c.key)).map((c) => ({ ...c, count: m.get(c.key) }))
    },
    list() {
      const q = this.q.trim().toLowerCase()
      return this.items.filter((it) => {
        if (this.cat && (it.category || 'other') !== this.cat) return false
        if (this.lowOnly && !it.low) return false
        if (!q) return true
        return [it.name, it.sku, it.barcode].some((v) => v && String(v).toLowerCase().includes(q))
      })
    },
    totalValue() {
      if (!this.list.some((it) => has(it.value))) return null
      return this.list.reduce((s, it) => s + (Number(it.value) || 0), 0)
    }
  },
  watch: {
    loc(v) {
      try {
        localStorage.setItem(LS, v)
      } catch {
        /* per-viewer convenience */
      }
      this.load()
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
    qtyText,
    isMl,
    tots,
    fmtNum,
    locationName,
    catLabel: categoryLabel,
    catIcon: categoryIcon,
    isStore(id) {
      return bar.locations.find((l) => l.id === id)?.type === 'store'
    },
    sizeText(it) {
      if (isMl(it)) return `${mlText(unitSize(it))} ${it.unit_label || 'bottle'}${Number(it.pack_size) > 1 ? ` · ${it.pack_size}/${it.pack_label || 'case'}` : ''}`
      return `${it.unit_label || 'unit'}${Number(it.pack_size) > 1 ? ` · ${it.pack_size}/${it.pack_label || 'case'}` : ''}`
    },
    parText(it) {
      const par = Number(it.par) || 0
      const rp = Number(it.reorder_point) || 0
      if (!par && !rp) return '—'
      const u = (v) => qtyText(v * unitSize(it), it) // par levels are in stock units
      if (!this.loc) return rp ? u(rp) : '—'
      return `${par ? u(par) : '—'} / ${rp ? u(rp) : '—'}`
    },
    perUnitCost(it) {
      // avg cost per base unit → per stock unit (bottle / can)
      return `${money(Number(it.avg_cost) * unitSize(it))}/${it.unit_label || 'unit'}`
    },
    clearFilters() {
      this.q = ''
      this.cat = ''
      this.lowOnly = false
    },
    async load() {
      const seq = ++this.seq
      this.loading = true
      this.error = ''
      try {
        const list = await barApi.items({ location_id: this.loc })
        if (seq !== this.seq) return
        this.items = list.sort((a, b) => String(a.name).localeCompare(String(b.name)))
      } catch (e) {
        if (seq === this.seq) this.error = apiErrorMessage(e, 'Could not load the stock items')
      } finally {
        if (seq === this.seq) this.loading = false
      }
    },
    onSaved() {
      this.itemModal = null
      this.starterOpen = false
      this.load()
      this.$emit('changed')
    },
    async exportCsv() {
      try {
        downloadBlob(await barApi.exportCsv('stock', { location_id: this.loc }), `bar-stock${this.loc ? '-' + locationName(this.loc).toLowerCase().replace(/[^a-z0-9]+/g, '-') : ''}.csv`)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Export failed'))
      }
    }
  }
}
</script>

<style scoped>
.st {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.toolbar {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}
.toolbar .loc {
  width: 180px;
}
.toolbar .search {
  flex: 1 1 220px;
  min-width: 180px;
}
.toolbar .cat {
  width: 190px;
}
.toolbar .low {
  white-space: nowrap;
}
.toolbar__end {
  display: flex;
  gap: 6px;
  margin-left: auto;
}
.sk {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.empty-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 14px;
}
.name {
  display: flex;
  gap: 10px;
  align-items: center;
  min-width: 0;
}
.min0 {
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.name strong {
  font-weight: 600;
}
.name small,
.sub {
  color: var(--text-3);
  font-size: 12px;
}
.cat-ic {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  background: var(--surface-2);
  border: 1px solid var(--border);
  color: var(--text-2);
  flex-shrink: 0;
  font-size: 13px;
}
.qty {
  white-space: nowrap;
}
.qty .sub {
  display: block;
}
.neg {
  color: var(--danger);
  font-weight: 600;
}
.lowb {
  margin-left: 6px;
}
.tbl td,
.tbl th {
  font-variant-numeric: tabular-nums;
}
.foot-note {
  margin: 0;
  font-size: 12.5px;
  color: var(--text-3);
}
.show-sm-only {
  display: none;
}
@media (max-width: 760px) {
  .hide-sm {
    display: none;
  }
  .show-sm-only {
    display: table-cell;
  }
  .toolbar .loc,
  .toolbar .cat {
    flex: 1 1 140px;
    width: auto;
  }
  .toolbar__end {
    margin-left: 0;
    width: 100%;
    justify-content: flex-end;
  }
  .qty {
    white-space: normal;
  }
}
</style>
