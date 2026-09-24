<template>
  <SideDrawer :open="open" :title="product?.name || 'Product'" width="600px" @close="$emit('close')">
    <template #title>
      <h2>{{ product?.name || 'Product' }}</h2>
      <p v-if="product" class="sub">
        <span class="mono">{{ product.sku }}</span>
        <span v-if="product.category?.name">· {{ product.category.name }}</span>
        <span v-if="product.is_active === false" class="ui-badge ui-badge--draft">Inactive</span>
      </p>
    </template>

    <template v-if="product" #actions>
      <button class="ui-btn ui-btn--primary ui-btn--sm" @click="$emit('adjust', product)"><i class="fa-solid fa-sliders"></i> Adjust stock</button>
      <button class="ui-btn ui-btn--sm" @click="$emit('edit', product)"><i class="fa-regular fa-pen-to-square"></i> Edit</button>
      <router-link to="/suppliers?tab=orders" class="ui-btn ui-btn--sm"><i class="fa-solid fa-truck"></i> Purchase orders</router-link>
      <button class="ui-btn ui-btn--sm ui-btn--ghost danger-text" @click="$emit('delete', product)"><i class="fa-regular fa-trash-can"></i> Delete</button>
    </template>

    <template v-if="product">
      <div class="stats">
        <div class="stat-main">
          <span>On hand</span>
          <strong>{{ product.current_stock }} <small>{{ product.unit_of_measure || 'each' }}</small></strong>
          <span class="ui-badge" :class="`ui-badge--${statusMeta.badge}`">{{ statusMeta.label }}</span>
        </div>
        <div><span>Stock value</span><strong>{{ money(product.stock_value ?? product.current_stock * product.cost_price) }}</strong></div>
        <div><span>Cost / price</span><strong>{{ money(product.cost_price) }} / {{ money(product.selling_price) }}</strong></div>
        <div><span>Min · reorder · max</span><strong>{{ product.min_stock || 0 }} · {{ product.reorder_point || 0 }} · {{ product.max_stock || '—' }}</strong></div>
      </div>
      <p v-if="product.barcode || product.description" class="desc">
        <span v-if="product.barcode" class="mono"><i class="fa-solid fa-barcode"></i> {{ product.barcode }}</span>
        <span v-if="product.description">{{ product.description }}</span>
      </p>

      <div class="hist-head">
        <h3>Stock history</h3>
        <select v-model="typeFilter" class="ui-select type-sel" aria-label="Movement type">
          <option value="">All movements</option>
          <option value="in">Stock in</option>
          <option value="out">Stock out</option>
          <option value="adjustment">Counts / set</option>
        </select>
      </div>

      <div v-if="loading && !movements.length">
        <div v-for="n in 4" :key="n" class="ui-skeleton" style="height: 44px; margin-bottom: 8px"></div>
      </div>
      <div v-else-if="error" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span></div>
      <div v-else-if="!filtered.length" class="empty">
        <i class="fa-solid fa-clock-rotate-left"></i>
        <span>{{ typeFilter ? 'No movements of this type.' : 'No stock movements yet. Adjustments and received purchase orders show up here.' }}</span>
      </div>
      <ol v-else class="timeline">
        <li v-for="m in filtered" :key="m.id">
          <span class="dot" :class="kind(m).cls"><i :class="kind(m).icon"></i></span>
          <div class="body">
            <div class="line1">
              <strong>{{ kind(m).label }}</strong>
              <span class="qty" :class="m.quantity > 0 ? 'up' : m.quantity < 0 ? 'down' : ''">{{ m.quantity > 0 ? '+' : '' }}{{ m.quantity }}</span>
            </div>
            <div class="line2">
              <span class="levels">{{ m.previous_quantity }} → {{ m.new_quantity }}</span>
              <span v-if="m.reference" class="ref">{{ m.reference }}</span>
              <span v-if="m.notes && m.notes !== m.reference" class="note">{{ m.notes }}</span>
            </div>
            <div class="line3">{{ fmtDateTime(m.created_at) }}<span v-if="who(m)"> · {{ who(m) }}</span></div>
          </div>
        </li>
      </ol>
    </template>
  </SideDrawer>
</template>

<script>
import SideDrawer from '@/components/suppliers/SideDrawer.vue'
import { inventoryService, STOCK_STATUS } from '@/services/inventoryService'
import { listFrom, apiErrorMessage } from '@/services/api'
import { formatMoney, formatDateTime } from '@/utils/format'

export default {
  name: 'ProductDrawer',
  components: { SideDrawer },
  props: {
    open: { type: Boolean, default: false },
    product: { type: Object, default: null },
    /** bump to reload movements */
    version: { type: Number, default: 0 }
  },
  emits: ['close', 'adjust', 'edit', 'delete'],
  data() {
    return { movements: [], loading: false, error: '', typeFilter: '' }
  },
  computed: {
    statusMeta() {
      return STOCK_STATUS[this.product?.stock_status] || STOCK_STATUS.in_stock
    },
    filtered() {
      return this.typeFilter ? this.movements.filter((m) => m.movement_type === this.typeFilter) : this.movements
    }
  },
  watch: {
    open(v) {
      if (v) this.load()
    },
    'product.id'() {
      if (this.open) this.load()
    },
    version() {
      if (this.open) this.load()
    }
  },
  created() {
    if (this.open) this.load()
  },
  methods: {
    money: (v) => formatMoney(v),
    fmtDateTime: formatDateTime,
    async load() {
      if (!this.product?.id) return
      this.loading = true
      this.error = ''
      try {
        const res = await inventoryService.getInventoryMovements({ product_id: this.product.id, limit: 200 })
        this.movements = listFrom(res, 'movements')
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load stock history')
      } finally {
        this.loading = false
      }
    },
    kind(m) {
      if (m.reference_type === 'purchase_order') return { label: 'Received from purchase order', icon: 'fa-solid fa-truck-ramp-box', cls: 'in' }
      if (m.reference_type === 'sale' || m.reference_type === 'pos') return { label: 'Sold', icon: 'fa-solid fa-cart-shopping', cls: 'out' }
      if (m.movement_type === 'adjustment') return { label: 'Stock count set', icon: 'fa-solid fa-equals', cls: 'adj' }
      if (m.movement_type === 'out') return { label: 'Stock removed', icon: 'fa-solid fa-minus', cls: 'out' }
      if (m.reference === 'Opening stock') return { label: 'Opening stock', icon: 'fa-solid fa-flag', cls: 'in' }
      return { label: 'Stock added', icon: 'fa-solid fa-plus', cls: 'in' }
    },
    who(m) {
      const c = m.creator
      return c ? [c.first_name, c.last_name].filter(Boolean).join(' ') || c.email : ''
    }
  }
}
</script>

<style scoped>
.sub {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.mono {
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
}
.danger-text {
  color: var(--danger);
}
.stats {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 10px;
}
.stats > div {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 10px 12px;
  min-width: 0;
}
.stats span {
  display: block;
  font-size: 11.5px;
  color: var(--text-3);
}
.stats strong {
  display: block;
  font-size: 15px;
  font-weight: 650;
  color: var(--text);
  font-variant-numeric: tabular-nums;
}
.stat-main {
  grid-row: span 3;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
}
.stat-main strong {
  font-size: 34px;
  letter-spacing: -0.02em;
  line-height: 1.1;
}
.stat-main strong small {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-3);
  letter-spacing: 0;
}
.stat-main .ui-badge {
  align-self: flex-start;
}
.desc {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 14px 0 0;
  color: var(--text-2);
  font-size: 13.5px;
}
.hist-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin: 24px 0 12px;
}
.hist-head h3 {
  margin: 0;
  font-size: 12px;
  font-weight: 650;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-3);
}
.type-sel {
  width: 170px;
  height: 34px;
  font-size: 13px;
}
.empty {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 16px;
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius);
  color: var(--text-3);
}
.timeline {
  list-style: none;
  margin: 0;
  padding: 0;
  position: relative;
}
.timeline li {
  display: flex;
  gap: 12px;
  padding-bottom: 16px;
  position: relative;
}
.timeline li:not(:last-child)::before {
  content: '';
  position: absolute;
  left: 15px;
  top: 32px;
  bottom: 0;
  width: 2px;
  background: var(--border);
}
.dot {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 12px;
  flex-shrink: 0;
}
.dot.in {
  background: var(--success-soft);
  color: var(--success);
}
.dot.out {
  background: var(--danger-soft);
  color: var(--danger);
}
.dot.adj {
  background: var(--info-soft);
  color: var(--info);
}
.body {
  flex: 1;
  min-width: 0;
  padding-top: 5px;
}
.line1 {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: var(--text);
}
.line1 strong {
  font-weight: 600;
}
.qty {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.qty.up {
  color: var(--success);
}
.qty.down {
  color: var(--danger);
}
.line2 {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  font-size: 13px;
  color: var(--text-2);
  margin-top: 2px;
}
.levels {
  font-variant-numeric: tabular-nums;
}
.ref {
  padding: 0 6px;
  border-radius: 6px;
  background: var(--bg-subtle);
  font-size: 12px;
}
.note {
  color: var(--text-2);
}
.line3 {
  font-size: 12px;
  color: var(--text-3);
  margin-top: 2px;
}
@media (max-width: 520px) {
  .stats {
    grid-template-columns: 1fr;
  }
  .stat-main {
    grid-row: auto;
  }
}
</style>
