<template>
  <div class="ui-modal-backdrop" @mousedown.self="$emit('close')">
    <form class="ui-modal" style="max-width: 760px" role="dialog" aria-modal="true" aria-labelledby="item-title" data-testid="item-modal" @submit.prevent="save">
      <div class="ui-modal__head">
        <h2 id="item-title">{{ item ? `Edit ${item.name}` : 'Add a stock item' }}</h2>
        <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="$emit('close')"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="ui-modal__body body">
        <div class="row2">
          <label class="ui-field grow">
            <span class="ui-label is-required">Name</span>
            <input ref="name" v-model.trim="f.name" class="ui-input" required maxlength="200" placeholder="e.g. Jameson 750ml" data-testid="item-name" />
          </label>
          <label class="ui-field">
            <span class="ui-label">Category</span>
            <select v-model="f.category" class="ui-select" data-testid="item-category">
              <option v-for="c in CATEGORIES" :key="c.key" :value="c.key">{{ c.label }}</option>
            </select>
          </label>
        </div>

        <div class="ui-field">
          <span class="ui-label">Counted as</span>
          <div class="seg" role="radiogroup" aria-label="Base unit">
            <button type="button" :class="{ 'is-active': f.base_unit === 'ml' }" role="radio" :aria-checked="f.base_unit === 'ml'" data-testid="base-ml" @click="setBase('ml')"><i class="fa-solid fa-bottle-droplet"></i> Poured by measure (ml)</button>
            <button type="button" :class="{ 'is-active': f.base_unit === 'unit' }" role="radio" :aria-checked="f.base_unit === 'unit'" data-testid="base-unit" @click="setBase('unit')"><i class="fa-solid fa-beer-mug-empty"></i> Counted in units</button>
          </div>
          <span class="ui-hint">{{ f.base_unit === 'ml' ? 'Spirits, wine, kegs: stock is kept in ml and counted as full bottles + a partial.' : 'Beer bottles, cans, sodas, lemons: sold and counted whole.' }}</span>
        </div>

        <div class="row3">
          <label class="ui-field">
            <span class="ui-label">Stock unit</span>
            <input v-model.trim="f.unit_label" class="ui-input" maxlength="30" list="bar-unit-labels" :placeholder="f.base_unit === 'ml' ? 'bottle' : 'bottle, can, piece'" data-testid="item-unit-label" />
            <datalist id="bar-unit-labels"><option v-for="u in unitLabels" :key="u" :value="u" /></datalist>
          </label>
          <label v-if="f.base_unit === 'ml'" class="ui-field">
            <span class="ui-label is-required">Size (ml)</span>
            <input v-model.number="f.unit_size" class="ui-input" type="number" min="1" step="1" required list="bar-sizes" data-testid="item-size" />
            <datalist id="bar-sizes"><option v-for="s in SIZES" :key="s" :value="s" /></datalist>
          </label>
          <label v-if="f.base_unit === 'ml'" class="ui-field">
            <span class="ui-label">Tot size (ml)</span>
            <input v-model="f.tot_ml" class="ui-input" type="number" min="1" step="1" :placeholder="`${orgTot} (default)`" data-testid="item-tot" />
          </label>
        </div>

        <div class="row3">
          <label class="ui-field">
            <span class="ui-label">Bought in packs of</span>
            <input v-model.number="f.pack_size" class="ui-input" type="number" min="1" step="1" data-testid="item-pack" />
          </label>
          <label class="ui-field">
            <span class="ui-label">Pack name</span>
            <input v-model.trim="f.pack_label" class="ui-input" maxlength="30" placeholder="case, crate, carton" />
          </label>
          <label class="ui-field">
            <span class="ui-label">Preferred supplier</span>
            <select v-model="f.preferred_supplier_id" class="ui-select" data-testid="item-supplier">
              <option value="">—</option>
              <option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.name || s.company_name }}</option>
            </select>
          </label>
        </div>

        <div class="row3">
          <label class="ui-field">
            <span class="ui-label">SKU</span>
            <input v-model.trim="f.sku" class="ui-input" maxlength="100" placeholder="Auto when empty" />
          </label>
          <label class="ui-field">
            <span class="ui-label">Barcode</span>
            <input v-model.trim="f.barcode" class="ui-input" maxlength="100" inputmode="numeric" placeholder="Scan or type" data-testid="item-barcode" />
          </label>
          <label class="ui-field">
            <span class="ui-label">Selling price as is</span>
            <input v-model="f.selling_price" class="ui-input" type="number" min="0" step="0.01" placeholder="Optional" data-testid="item-price" />
          </label>
        </div>
        <label class="ui-switch"><input v-model="f.sold_as_is" type="checkbox" data-testid="item-sold-as-is" /><span>{{ f.base_unit === 'unit' ? 'Sold as it is in the POS (e.g. a bottle of beer, a can of soda)' : 'Also sell the whole bottle as it is in the POS' }}<small v-if="item && item.sold_as_is"> — already on the POS</small></span></label>

        <details v-if="f.base_unit === 'ml'" class="weigh" :open="!!(f.full_weight_g || f.empty_weight_g)">
          <summary><i class="fa-solid fa-scale-balanced"></i> Count partial bottles on a scale</summary>
          <div class="row2">
            <label class="ui-field">
              <span class="ui-label">Full weight (g)</span>
              <input v-model="f.full_weight_g" class="ui-input" type="number" min="0" step="1" placeholder="e.g. 1230" data-testid="item-full-g" />
            </label>
            <label class="ui-field">
              <span class="ui-label">Empty weight (g)</span>
              <input v-model="f.empty_weight_g" class="ui-input" type="number" min="0" step="1" placeholder="e.g. 480" data-testid="item-empty-g" />
            </label>
          </div>
          <p class="ui-hint">Weigh one unopened and one empty bottle once. While counting, ml = (weight − empty) ÷ (full − empty) × {{ f.unit_size || '…' }} ml.</p>
        </details>

        <div v-if="bar.locations.length" class="pars">
          <div class="pars__head">
            <span class="ui-label">Par &amp; reorder point per location</span>
            <span class="ui-hint">In {{ plural(f.unit_label || (f.base_unit === 'ml' ? 'bottle' : 'unit'), 2) }}. Par is what a location should hold; at or below the reorder point it shows as low and is suggested for top-up / purchase.</span>
          </div>
          <div class="pars__grid">
            <template v-for="p in f.pars" :key="p.location_id">
              <span class="pars__loc">{{ locationName(p.location_id) }}</span>
              <input v-model="p.par" class="ui-input" type="number" min="0" step="any" placeholder="Par" :aria-label="`Par at ${locationName(p.location_id)}`" :data-testid="'par-' + locationName(p.location_id)" />
              <input v-model="p.reorder_point" class="ui-input" type="number" min="0" step="any" placeholder="Reorder at" :aria-label="`Reorder point at ${locationName(p.location_id)}`" :data-testid="'reorder-' + locationName(p.location_id)" />
            </template>
          </div>
        </div>

        <div class="switches">
          <label class="ui-switch"><input v-model="f.track" type="checkbox" /><span>Track stock (counts, variance, low-stock alerts)</span></label>
          <label v-if="item" class="ui-switch"><input v-model="f.active" type="checkbox" /><span>Active</span></label>
        </div>

        <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>
      </div>
      <div class="ui-modal__foot">
        <button type="button" class="ui-btn" @click="$emit('close')">Cancel</button>
        <button type="submit" class="ui-btn ui-btn--primary" :disabled="busy" data-testid="item-save">{{ busy ? 'Saving…' : item ? 'Save' : 'Add item' }}</button>
      </div>
    </form>
  </div>
</template>

<script>
import { bar, locationName, orgTotMl } from './barContext'
import { barApi } from '@/services/bar'
import { apiErrorMessage, listFrom } from '@/services/api'
import { supplierService } from '@/services/supplierService'
import { toast } from '@/composables/useToast'
import { CATEGORIES, plural } from '@/utils/barUnits'

const SIZES = [200, 250, 330, 350, 375, 500, 700, 750, 1000, 1500, 1750, 20000, 30000, 50000]
const nOrNull = (v) => (v === '' || v === null || v === undefined || Number.isNaN(Number(v)) ? null : Number(v))

export default {
  name: 'ItemModal',
  props: { item: { type: Object, default: null } },
  emits: ['close', 'saved'],
  data() {
    const it = this.item || {}
    // Par levels and reorder points are kept in stock units (bottles, cans).
    const pars = bar.locations.map((l) => {
      const p = (it.pars || it.par_levels || it.stock || []).find((x) => x.location_id === l.id) || {}
      const v = (x) => (x === null || x === undefined || x === '' || Number(x) === 0 ? '' : Number(x))
      return { location_id: l.id, par: v(p.par), reorder_point: v(p.reorder_point) }
    })
    return {
      bar,
      CATEGORIES,
      SIZES,
      f: {
        name: it.name || '',
        category: it.category || 'spirits',
        base_unit: it.base_unit || 'ml',
        unit_size: it.unit_size || 750,
        unit_label: it.unit_label || '',
        pack_size: it.pack_size || 1,
        pack_label: it.pack_label || '',
        tot_ml: it.tot_ml_override ?? '',
        sku: it.sku || '',
        barcode: it.barcode || '',
        selling_price: it.selling_price || '',
        sold_as_is: false,
        full_weight_g: it.full_weight_g || '',
        empty_weight_g: it.empty_weight_g || '',
        preferred_supplier_id: it.preferred_supplier_id || it.preferred_supplier?.id || '',
        track: it.track !== false,
        active: it.active !== false,
        pars
      },
      suppliers: [],
      busy: false,
      error: ''
    }
  },
  computed: {
    orgTot() {
      return orgTotMl()
    },
    unitLabels() {
      return this.f.base_unit === 'ml' ? ['bottle', 'keg', 'box', 'carton', 'jar'] : ['bottle', 'can', 'piece', 'pack', 'sachet', 'kg']
    }
  },
  async created() {
    try {
      this.suppliers = listFrom(await supplierService.getSuppliers({ limit: 500 }), 'suppliers')
    } catch {
      this.suppliers = []
    }
  },
  mounted() {
    this.$nextTick(() => this.$refs.name?.focus())
  },
  methods: {
    plural,
    locationName,
    setBase(b) {
      this.f.base_unit = b
      if (b === 'unit') this.f.unit_size = 1
      else if (!(Number(this.f.unit_size) > 1)) this.f.unit_size = 750
    },
    async save() {
      this.error = ''
      const f = this.f
      const size = f.base_unit === 'ml' ? Number(f.unit_size) : 1
      if (!f.name) return (this.error = 'Give the item a name')
      if (!(size > 0)) return (this.error = 'Enter the bottle size in ml')
      const full = nOrNull(f.full_weight_g)
      const empty = nOrNull(f.empty_weight_g)
      if ((full !== null || empty !== null) && !(full > (empty || 0))) return (this.error = 'The full weight must be more than the empty weight')
      const pars = f.pars
        .map((p) => ({ location_id: p.location_id, par: nOrNull(p.par), reorder_point: nOrNull(p.reorder_point) }))
        .filter((p) => p.par !== null || p.reorder_point !== null)
        .map((p) => ({ location_id: p.location_id, par: p.par === null ? 0 : p.par, reorder_point: p.reorder_point === null ? 0 : p.reorder_point }))
      if (pars.some((p) => p.par < 0 || p.reorder_point < 0)) return (this.error = 'Par levels cannot be negative')
      const body = {
        name: f.name,
        category: f.category,
        base_unit: f.base_unit,
        unit_size: size,
        unit_label: f.unit_label || (f.base_unit === 'ml' ? 'bottle' : 'unit'),
        pack_size: Math.max(1, Number(f.pack_size) || 1),
        pack_label: f.pack_label || (Number(f.pack_size) > 1 ? 'case' : ''),
        tot_ml: f.base_unit === 'ml' ? nOrNull(f.tot_ml) : null,
        sku: f.sku,
        barcode: f.barcode,
        full_weight_g: f.base_unit === 'ml' ? full : null,
        empty_weight_g: f.base_unit === 'ml' ? empty : null,
        preferred_supplier_id: f.preferred_supplier_id || null,
        track: !!f.track,
        active: this.item ? !!f.active : true,
        pars
      }
      if (nOrNull(f.selling_price) !== null) body.selling_price = Number(f.selling_price)
      if (f.sold_as_is) {
        if (!(Number(f.selling_price) > 0)) return (this.error = 'Enter the selling price to sell it as it is')
        body.sold_as_is = true
      }
      this.busy = true
      try {
        const r = this.item ? await barApi.updateItem(this.item.product_id, body) : await barApi.createItem(body)
        toast.success(this.item ? `${f.name} saved` : `${f.name} added`)
        this.$emit('saved', r)
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not save the item')
      } finally {
        this.busy = false
      }
    }
  }
}
</script>

<style scoped>
.body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.row2 {
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: 12px;
}
.row3 {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
.seg {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}
.seg button {
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  color: var(--text-2);
  font: inherit;
  font-size: 13.5px;
  cursor: pointer;
  text-align: left;
}
.seg button.is-active {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 600;
}
.weigh {
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius-sm);
  padding: 10px 12px;
}
.weigh summary {
  cursor: pointer;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-2);
}
.weigh .row2 {
  margin-top: 10px;
  grid-template-columns: 1fr 1fr;
}
.weigh .ui-hint {
  margin: 6px 0 0;
}
.pars {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.pars__head {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.pars__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr) minmax(0, 1fr);
  gap: 6px 8px;
  align-items: center;
}
.pars__loc {
  font-size: 13.5px;
  font-weight: 550;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.switches {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
@media (max-width: 640px) {
  .row2,
  .row3,
  .seg {
    grid-template-columns: 1fr;
  }
  .weigh .row2 {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
