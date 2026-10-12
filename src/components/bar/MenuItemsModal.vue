<template>
  <div class="ui-modal-backdrop" @mousedown.self="$emit('close')">
    <form class="ui-modal" style="max-width: 560px" role="dialog" aria-modal="true" aria-labelledby="mi-title" data-testid="menu-items-modal" @submit.prevent="save">
      <div class="ui-modal__head">
        <div>
          <h2 id="mi-title">Tot &amp; bottle menu items</h2>
          <p class="mlead">POS products for <strong>{{ item.name }}</strong> with their recipes — a tot pours {{ tot }} ml, bottle service takes a whole {{ mlText(size) }} {{ item.unit_label || 'bottle' }}.</p>
        </div>
        <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Close" @click="$emit('close')"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="ui-modal__body body">
        <div v-for="row in rows" :key="row.key" class="mi" :class="{ off: !f[row.key] }">
          <label class="ui-switch"><input v-model="f[row.key]" type="checkbox" :data-testid="'mi-' + row.key" /><span><strong>{{ existing[row.key]?.name || `${item.name} ${row.key}` }}</strong> <small>{{ row.desc }}</small><span v-if="existing[row.key]" class="ui-badge ui-badge--success onpos">On the POS</span></span></label>
          <div v-if="f[row.key]" class="mi__price">
            <label class="ui-field">
              <span class="ui-label">Selling price ({{ cur }})</span>
              <input v-model="f[row.key + '_price']" class="ui-input" type="number" min="0" step="any" required :data-testid="'mi-' + row.key + '-price'" />
            </label>
            <div v-if="showMoney" class="mi__cost">
              <span>Cost <strong>{{ has(row.cost) ? money(row.cost) : '—' }}</strong></span>
              <span v-if="pc(row) !== null" :class="{ over: target !== null && pc(row) > target }">Pour cost <strong>{{ fmtNum(pc(row), 1) }}%</strong></span>
              <button v-if="suggest(row) !== null" type="button" class="ui-btn ui-btn--ghost ui-btn--sm" :title="`Price that meets your ${target}% target for ${catLabel(item.category)}`" @click="f[row.key + '_price'] = suggest(row)">Use {{ money(suggest(row)) }}</button>
            </div>
          </div>
        </div>
        <p v-if="showMoney" class="ui-hint">
          Pour cost = ingredient cost ÷ price{{ vat ? ` before ${vat.name} ${vat.rate}%` : '' }}.
          <template v-if="target === null">No pour-cost target is set for {{ catLabel(item.category) }} (Setup), so no price is suggested.</template>
          <template v-else-if="!has(avgCost)">Prices are suggested once a delivery has set this item’s cost.</template>
        </p>
        <div v-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }}</span></div>
      </div>
      <div class="ui-modal__foot">
        <button type="button" class="ui-btn" @click="$emit('close')">Cancel</button>
        <button type="submit" class="ui-btn ui-btn--primary" :disabled="busy || (!f.tot && !f.bottle)" data-testid="mi-save">{{ busy ? 'Saving…' : allExist ? 'Save prices' : 'Create menu items' }}</button>
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
import { totMl, unitSize, mlText, fmtNum, categoryLabel, pourCostPct, netOfTax } from '@/utils/barUnits'

export default {
  name: 'MenuItemsModal',
  props: { item: { type: Object, required: true } },
  emits: ['close', 'saved'],
  data() {
    return { f: { tot: true, bottle: true, tot_price: '', bottle_price: '' }, existing: {}, vat: null, busy: false, error: '' }
  },
  computed: {
    cur() {
      return currency()
    },
    allExist() {
      return ['tot', 'bottle'].every((k) => !this.f[k] || this.existing[k])
    },
    showMoney() {
      return barPerms().approve
    },
    tot() {
      return totMl(this.item, orgTotMl())
    },
    size() {
      return unitSize(this.item)
    },
    avgCost() {
      return this.item.avg_cost
    },
    target() {
      const t = bar.settings?.pour_cost_targets?.[this.item.category]
      return t === null || t === undefined || t === '' ? null : Number(t)
    },
    rows() {
      const c = has(this.avgCost) ? Number(this.avgCost) : null
      return [
        { key: 'tot', desc: `${this.tot} ml`, cost: c === null ? null : c * this.tot },
        { key: 'bottle', desc: `whole ${this.item.unit_label || 'bottle'}, bottle service`, cost: c === null ? null : c * this.size }
      ]
    }
  },
  async created() {
    // Tot / bottle items made before (starter list, wizard): show them and prefill their prices.
    barApi
      .recipes()
      .then((list) => {
        const ex = {}
        for (const r of list) if (r.source_id === this.item.product_id && (r.kind === 'tot' || r.kind === 'bottle') && !ex[r.kind]) ex[r.kind] = r
        this.existing = ex
        for (const k of ['tot', 'bottle']) if (ex[k] && Number(ex[k].price) > 0 && this.f[k + '_price'] === '') this.f[k + '_price'] = ex[k].price
      })
      .catch(() => {})
    try {
      const rates = await posService.taxRates()
      const d = rates.find((r) => r.is_default && r.is_active !== false)
      this.vat = d ? { name: d.name, rate: Number(d.rate) || 0 } : null
    } catch {
      this.vat = null
    }
  },
  methods: {
    money,
    has,
    mlText,
    fmtNum,
    catLabel: categoryLabel,
    net(price) {
      return netOfTax(price, this.vat?.rate || 0, true)
    },
    pc(row) {
      const p = Number(this.f[row.key + '_price'])
      if (!has(row.cost) || !(p > 0)) return null
      return pourCostPct(row.cost, this.net(p))
    },
    suggest(row) {
      const srv = this.item[row.key === 'tot' ? 'suggested_tot_price' : 'suggested_bottle_price']
      let gross = has(srv) && Number(srv) > 0 ? Number(srv) : null
      if (gross === null) {
        if (this.target === null || !(this.target > 0) || !has(row.cost) || !(row.cost > 0)) return null
        gross = (row.cost / (this.target / 100)) * (1 + (this.vat?.rate || 0) / 100)
      }
      // a price a bar would print: rounded up (stays within the target)
      const step = gross >= 1000 ? 50 : gross >= 100 ? 10 : 1
      return Math.ceil(gross / step - 1e-9) * step
    },
    async save() {
      this.error = ''
      const body = { tot: !!this.f.tot, bottle: !!this.f.bottle }
      if (this.f.tot) {
        if (!(Number(this.f.tot_price) > 0)) return (this.error = 'Enter the price of a tot')
        body.tot_price = Number(this.f.tot_price)
      }
      if (this.f.bottle) {
        if (!(Number(this.f.bottle_price) > 0)) return (this.error = 'Enter the bottle-service price')
        body.bottle_price = Number(this.f.bottle_price)
      }
      this.busy = true
      try {
        await barApi.makeMenuItems(this.item.product_id, body)
        toast.success(this.allExist ? `Prices of ${this.item.name} saved` : `${[this.f.tot && 'Tot', this.f.bottle && 'bottle'].filter(Boolean).join(' & ')} of ${this.item.name} added to the POS`)
        this.$emit('saved')
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not create the menu items')
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
.mi {
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.onpos {
  margin-left: 6px;
  font-size: 11px;
}
.mi.off {
  opacity: 0.7;
}
.mi small {
  color: var(--text-3);
  font-weight: 400;
}
.mi__price {
  display: flex;
  gap: 12px;
  align-items: flex-end;
  flex-wrap: wrap;
}
.mi__price .ui-field {
  width: 160px;
}
.mi__cost {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  font-size: 13px;
  color: var(--text-3);
  padding-bottom: 8px;
}
.mi__cost strong {
  color: var(--text);
  font-variant-numeric: tabular-nums;
}
.mi__cost .over strong {
  color: var(--danger);
}
</style>
