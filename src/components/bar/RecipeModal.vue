<template>
  <div class="ui-modal-backdrop" @mousedown.self="$emit('close')">
    <form class="ui-modal" style="max-width: 760px" role="dialog" aria-modal="true" aria-labelledby="rc-title" data-testid="recipe-modal" @submit.prevent="save">
      <div class="ui-modal__head">
        <div>
          <h2 id="rc-title">{{ recipe ? recipe.name : 'New menu item' }}</h2>
          <p class="mlead">{{ recipe && recipe.kind === 'self' ? 'Sold as it is — one stock unit per sale.' : 'What one serving takes from the bar. Enter in ml, tots or bottles for spirits; units for beers, sodas and garnish.' }}</p>
        </div>
        <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="$emit('close')"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="ui-modal__body body">
        <div class="row2">
          <label class="ui-field grow">
            <span class="ui-label is-required">Name on the POS</span>
            <input ref="name" v-model.trim="f.name" class="ui-input" required maxlength="200" placeholder="e.g. Mojito, Dawa, Jameson tot" data-testid="rc-name" />
          </label>
          <label class="ui-field">
            <span class="ui-label is-required">Price ({{ cur }})</span>
            <input v-model="f.price" class="ui-input" type="number" min="0" step="any" required data-testid="rc-price" />
          </label>
        </div>
        <label v-if="!recipe" class="ui-field">
          <span class="ui-label">POS category</span>
          <select v-model="f.category" class="ui-select">
            <option value="">Automatic (cocktails, or the main ingredient)</option>
            <option v-for="c in CATEGORIES" :key="c.key" :value="c.key">{{ c.label }}</option>
            <option value="Cocktails">Cocktails</option>
          </select>
        </label>

        <label v-if="!lines.length" class="ui-switch"><input v-model="f.noStock" type="checkbox" data-testid="rc-nostock" /><span>Doesn’t use stock — e.g. entry fee, cloakroom, table charge</span></label>
        <div v-if="!f.noStock" class="ui-field">
          <span class="ui-label">Recipe</span>
          <div v-if="!lines.length" class="nolines">No stock lines yet — add what goes into one serving.</div>
          <div v-for="(l, i) in lines" :key="l.key" class="line" :data-line="l.item?.name">
            <div class="line__name">
              <strong>{{ l.item?.name || l.name || 'Unknown item' }}</strong>
              <small v-if="showMoney && lineCost(l) !== null">{{ money(lineCost(l)) }}</small>
            </div>
            <QtyInput v-model:qty="l.qty" v-model:unit="l.unit" :item="l.item" :tot-ml="totMl" :allowed="allowed(l.item)" :label="`${l.item?.name} per serving`" :testid="'rc-line-' + i" />
            <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon ui-btn--sm" :aria-label="`Remove ${l.item?.name}`" @click="lines.splice(i, 1)"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <ItemPicker :items="items" :exclude="lines.map((l) => l.product_id)" placeholder="Add an ingredient" testid="rc-pick" @pick="add" />
        </div>

        <div v-if="showMoney && !f.noStock" class="calc" data-testid="rc-calc">
          <div><span>Cost per serving</span><strong>{{ money(cost) }}</strong></div>
          <div><span>Price{{ tax.rate && tax.inclusive ? ` before ${fmtNum(tax.rate, 1)}% tax` : '' }}</span><strong>{{ money(net) }}</strong></div>
          <div :class="{ over: over }"><span>Pour cost</span><strong data-testid="rc-pour">{{ pour !== null ? fmtNum(pour, 1) + '%' : '—' }}</strong><small v-if="target !== null">target {{ fmtNum(target, 1) }}%</small></div>
          <div><span>Margin</span><strong>{{ money(net - cost) }}</strong></div>
        </div>
        <p v-if="showMoney && missingCost" class="ui-hint">Some ingredients have no cost yet — receive a delivery to set them.</p>
        <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>
      </div>
      <div class="ui-modal__foot">
        <button v-if="recipe && perm.delete" type="button" class="ui-btn ui-btn--ghost danger" :disabled="busy" @click="remove"><i class="fa-regular fa-trash-can"></i> Remove recipe</button>
        <span class="sp"></span>
        <button type="button" class="ui-btn" @click="$emit('close')">Cancel</button>
        <button type="submit" class="ui-btn ui-btn--primary" :disabled="busy" data-testid="rc-save">{{ busy ? 'Saving…' : recipe ? 'Save' : 'Add to the POS' }}</button>
      </div>
    </form>
  </div>
</template>

<script>
import { bar, money, has, currency, orgTotMl, barPerms } from './barContext'
import { barApi } from '@/services/bar'
import { apiErrorMessage } from '@/services/api'
import { posService } from '@/services/posService'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'
import { CATEGORIES, isMl, toBase, fromBase, fmtNum, pourCostPct, netOfTax } from '@/utils/barUnits'
import ItemPicker from './ItemPicker.vue'
import QtyInput from './QtyInput.vue'

let seq = 0

export default {
  name: 'RecipeModal',
  components: { ItemPicker, QtyInput },
  props: {
    recipe: { type: Object, default: null },
    perm: { type: Object, required: true }
  },
  emits: ['close', 'saved'],
  data() {
    const r = this.recipe || {}
    return {
      CATEGORIES,
      f: { name: r.name || '', price: r.price ?? '', category: '', noStock: !!this.recipe && !(r.lines || []).length },
      lines: [],
      items: [],
      tax: { rate: Number(r.tax_rate) || 0, inclusive: r.prices_include_tax !== false },
      busy: false,
      error: ''
    }
  },
  computed: {
    cur() {
      return currency()
    },
    showMoney() {
      return barPerms().approve
    },
    totMl() {
      return orgTotMl()
    },
    cost() {
      return this.lines.reduce((s, l) => s + (this.lineCost(l) || 0), 0)
    },
    missingCost() {
      return this.lines.some((l) => !(Number(l.item?.avg_cost) > 0))
    },
    net() {
      return netOfTax(this.f.price, this.tax.rate, this.tax.inclusive)
    },
    pour() {
      return pourCostPct(this.cost, this.net)
    },
    mainCategory() {
      let best = ''
      let c = -1
      for (const l of this.lines) {
        const v = this.lineCost(l) || 0
        if (v > c) {
          c = v
          best = l.item?.category || ''
        }
      }
      return best
    },
    target() {
      if (this.recipe && has(this.recipe.pour_cost_target) && !this.lines.length) return Number(this.recipe.pour_cost_target)
      const t = bar.settings?.pour_cost_targets?.[this.mainCategory]
      return t === null || t === undefined || t === '' ? null : Number(t)
    },
    over() {
      return this.target !== null && this.pour !== null && this.pour > this.target
    }
  },
  async created() {
    try {
      this.items = (await barApi.items()).filter((it) => it.active !== false)
    } catch (e) {
      this.error = apiErrorMessage(e, 'Could not load the stock items')
    }
    if (!this.recipe) {
      try {
        const rates = await posService.taxRates()
        const d = rates.find((r) => r.is_default && r.is_active !== false)
        if (d) this.tax = { rate: Number(d.rate) || 0, inclusive: true }
      } catch {
        /* no tax info: pour cost on the price as entered */
      }
    }
    for (const l of this.recipe?.lines || []) {
      const it = this.items.find((x) => x.product_id === l.product_id)
      const unit = l.unit || (it && isMl(it) ? 'ml' : 'unit')
      const qty = l.entered_qty ? Number(l.entered_qty) : it ? fromBase(l.qty, unit, it, this.totMl) : Number(l.qty)
      this.lines.push({ key: ++seq, product_id: l.product_id, name: l.name, item: it || { product_id: l.product_id, name: l.name, base_unit: l.base_unit }, qty, unit })
    }
  },
  mounted() {
    if (!this.recipe) this.$nextTick(() => this.$refs.name?.focus())
  },
  methods: {
    money,
    fmtNum,
    allowed(it) {
      return isMl(it) ? ['ml', 'tot', 'bottle'] : ['unit']
    },
    add(it) {
      this.lines.push({ key: ++seq, product_id: it.product_id, item: it, qty: isMl(it) ? 1 : 1, unit: isMl(it) ? (it.category === 'spirits' ? 'tot' : 'ml') : 'unit' })
      if (!this.f.name && !this.recipe && this.lines.length === 1) this.f.name = it.name
    },
    lineCost(l) {
      const avg = Number(l.item?.avg_cost)
      if (!(avg > 0)) return null
      return toBase(l.qty, l.unit, l.item, this.totMl) * avg
    },
    async save() {
      this.error = ''
      if (!this.f.name) return (this.error = 'Enter the name shown on the POS')
      if (!(Number(this.f.price) >= 0) || this.f.price === '') return (this.error = 'Enter the selling price')
      if (!this.lines.length && !this.f.noStock) return (this.error = 'Add at least one stock line, or tick “Doesn’t use stock”')
      if (this.lines.some((l) => !(Number(l.qty) > 0))) return (this.error = 'Every line needs a quantity')
      const lines = this.f.noStock ? [] : this.lines
      const body = { name: this.f.name, price: Number(this.f.price), lines: lines.map((l) => ({ product_id: l.product_id, qty: Number(l.qty), unit: l.unit })) }
      // POS category: chosen, else "Cocktails" for mixed drinks, else the main ingredient's category
      if (!this.recipe) body.category = this.f.category || (lines.length > 1 ? 'Cocktails' : this.mainCategory || undefined)
      this.busy = true
      try {
        const r = this.recipe ? await barApi.saveRecipe(this.recipe.pos_product_id, body) : await barApi.createRecipe(body)
        toast.success(this.recipe ? `${this.f.name} saved` : `${this.f.name} added to the POS`)
        this.$emit('saved', r)
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not save the recipe')
      } finally {
        this.busy = false
      }
    },
    async remove() {
      const ok = await confirmDialog({ title: `Remove the recipe of ${this.recipe.name}?`, message: 'The POS product stays, but selling it no longer takes stock from the bar.', confirmText: 'Remove recipe', danger: true })
      if (!ok) return
      this.busy = true
      try {
        await barApi.deleteRecipe(this.recipe.pos_product_id)
        toast.success('Recipe removed')
        this.$emit('saved')
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not remove the recipe')
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
  gap: 14px;
}
.row2 {
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: 12px;
}
.nolines {
  font-size: 13px;
  color: var(--text-3);
  padding: 4px 0 8px;
}
.line {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(200px, 260px) auto;
  gap: 10px;
  align-items: start;
  padding: 8px 10px;
  margin-bottom: 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
}
.line__name {
  display: flex;
  flex-direction: column;
  padding-top: 6px;
  min-width: 0;
}
.line__name small {
  font-size: 12px;
  color: var(--text-3);
}
.calc {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}
.calc > div {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
}
.calc span,
.calc small {
  font-size: 12px;
  color: var(--text-3);
}
.calc strong {
  font-size: 16px;
  font-variant-numeric: tabular-nums;
}
.calc .over strong {
  color: var(--danger);
}
.danger {
  color: var(--danger);
}
.sp {
  flex: 1;
}
@media (max-width: 600px) {
  .row2 {
    grid-template-columns: 1fr;
  }
  .calc {
    grid-template-columns: 1fr 1fr;
  }
  .line {
    grid-template-columns: minmax(0, 1fr) auto;
  }
  .line > .qi {
    grid-column: 1 / -1;
    grid-row: 2;
  }
}
</style>
