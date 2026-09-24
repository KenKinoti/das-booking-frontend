<template>
  <div class="ui-page ui-page--wide">
    <header class="ui-page-head">
      <div>
        <div class="ui-eyebrow">Inventory & Supply</div>
        <h1>Inventory</h1>
        <p>Track products, stock on hand and every stock movement.</p>
      </div>
      <div class="ui-actions">
        <button class="ui-btn" @click="showCategories = true"><i class="fa-solid fa-tags"></i> Categories</button>
        <button class="ui-btn" :disabled="!filtered.length" @click="exportCsv"><i class="fa-solid fa-download"></i> Export CSV</button>
        <button class="ui-btn ui-btn--primary" @click="openProduct()"><i class="fa-solid fa-plus"></i> Add product</button>
      </div>
    </header>

    <div class="ui-kpis">
      <button class="ui-kpi kpi-btn" :class="{ 'is-selected': !stockFilter && activeFilter === 'active' && !categoryFilter && !search }" @click="resetFilters">
        <div class="ui-kpi__label"><span class="ui-kpi__icon"><i class="fa-solid fa-box"></i></span>Products</div>
        <div class="ui-kpi__value"><template v-if="loaded">{{ kpi.active }}</template><span v-else class="ui-skeleton kpi-sk"></span></div>
        <div class="ui-kpi__meta">{{ loaded ? `${kpi.units.toLocaleString()} units on hand${kpi.inactive ? ` · ${kpi.inactive} inactive` : ''}` : '&nbsp;' }}</div>
      </button>
      <div class="ui-kpi">
        <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-success"><i class="fa-solid fa-sack-dollar"></i></span>Stock value</div>
        <div class="ui-kpi__value"><template v-if="loaded">{{ money(kpi.value) }}</template><span v-else class="ui-skeleton kpi-sk"></span></div>
        <div class="ui-kpi__meta">{{ loaded ? `${money(kpi.retail)} at selling price` : '&nbsp;' }}</div>
      </div>
      <button class="ui-kpi kpi-btn" :class="{ 'is-selected': stockFilter === 'low_stock' }" @click="toggleStock('low_stock')">
        <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-warning"><i class="fa-solid fa-arrow-trend-down"></i></span>Low stock</div>
        <div class="ui-kpi__value" :class="{ 'txt-warning': kpi.low > 0 }"><template v-if="loaded">{{ kpi.low }}</template><span v-else class="ui-skeleton kpi-sk"></span></div>
        <div class="ui-kpi__meta">At or below reorder level</div>
      </button>
      <button class="ui-kpi kpi-btn" :class="{ 'is-selected': stockFilter === 'out_of_stock' }" @click="toggleStock('out_of_stock')">
        <div class="ui-kpi__label"><span class="ui-kpi__icon kpi-danger"><i class="fa-solid fa-circle-exclamation"></i></span>Out of stock</div>
        <div class="ui-kpi__value" :class="{ 'txt-danger': kpi.out > 0 }"><template v-if="loaded">{{ kpi.out }}</template><span v-else class="ui-skeleton kpi-sk"></span></div>
        <div class="ui-kpi__meta">Nothing on hand</div>
      </button>
    </div>

    <div v-if="loaded && reorderable.length && (stockFilter === 'low_stock' || stockFilter === 'out_of_stock')" class="ui-alert ui-alert--warning reorder">
      <i class="fa-solid fa-truck-arrow-right"></i>
      <span>{{ reorderable.length }} product{{ reorderable.length === 1 ? '' : 's' }} need restocking.</span>
      <button class="ui-btn ui-btn--sm" @click="reorder"><i class="fa-solid fa-file-circle-plus"></i> Create purchase order</button>
    </div>

    <section class="ui-card">
      <div class="toolbar">
        <div class="ui-input-group search">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input v-model="search" class="ui-input" type="search" placeholder="Search name, SKU or barcode…" aria-label="Search products" />
        </div>
        <div class="toolbar__right">
          <select v-model="categoryFilter" class="ui-select sel" aria-label="Category">
            <option value="">All categories</option>
            <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
            <option value="none">Uncategorised</option>
          </select>
          <select v-model="stockFilter" class="ui-select sel" aria-label="Stock status">
            <option value="">Any stock level</option>
            <option value="in_stock">In stock</option>
            <option value="low_stock">Low stock</option>
            <option value="out_of_stock">Out of stock</option>
          </select>
          <select v-model="activeFilter" class="ui-select sel-sm" aria-label="Product status">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="all">All products</option>
          </select>
          <select v-model="sort" class="ui-select sel-sm" aria-label="Sort">
            <option value="name">Name A–Z</option>
            <option value="stock">Lowest stock</option>
            <option value="value">Highest value</option>
            <option value="recent">Recently added</option>
          </select>
        </div>
      </div>

      <div v-if="error" class="ui-card__body">
        <div class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ error }} <a href="#" @click.prevent="load">Try again</a></span></div>
      </div>
      <div v-else-if="loading && !loaded" class="ui-card__body">
        <div v-for="n in 6" :key="n" class="sk-row">
          <div class="ui-skeleton" style="flex: 1"></div>
          <div class="ui-skeleton" style="width: 90px"></div>
          <div class="ui-skeleton" style="width: 60px"></div>
          <div class="ui-skeleton" style="width: 90px"></div>
        </div>
      </div>
      <div v-else-if="!filtered.length" class="ui-empty">
        <div class="ui-empty__icon"><i class="fa-solid fa-boxes-stacked"></i></div>
        <h3>{{ products.length ? 'No products match' : 'No products yet' }}</h3>
        <p>{{ products.length ? 'Try a different search or filter.' : 'Add the products you stock or sell. You can then adjust stock and order them from suppliers.' }}</p>
        <button v-if="!products.length" class="ui-btn ui-btn--primary" style="margin-top: 12px" @click="openProduct()"><i class="fa-solid fa-plus"></i> Add product</button>
        <button v-else class="ui-btn" style="margin-top: 12px" @click="resetFilters">Clear filters</button>
      </div>
      <div v-else class="ui-table-wrap" :class="{ 'is-loading': loading }">
        <table class="ui-table">
          <thead>
            <tr>
              <th>Product</th>
              <th class="hide-sm">SKU</th>
              <th class="num">On hand</th>
              <th class="num hide-lg">Reorder at</th>
              <th class="num hide-md">Cost</th>
              <th class="num hide-md">Price</th>
              <th class="num hide-lg">Value</th>
              <th class="hide-sm">Status</th>
              <th class="actions-col"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in filtered" :key="p.id" class="is-clickable" :class="{ 'is-off': p.is_active === false }" @click="openDrawer(p)">
              <td>
                <div class="p-cell">
                  <span class="p-icon" :class="p.stock_status"><i class="fa-solid fa-box"></i></span>
                  <span class="min0">
                    <span class="strong">{{ p.name }}</span>
                    <small>{{ p.category?.name || 'Uncategorised' }}<template v-if="p.is_active === false"> · inactive</template></small>
                  </span>
                </div>
              </td>
              <td class="hide-sm mono muted nowrap">{{ p.sku }}</td>
              <td class="num">
                <strong :class="stockClass(p)">{{ p.current_stock }}</strong>
                <small class="unit">{{ p.unit_of_measure || 'each' }}</small>
              </td>
              <td class="num hide-lg muted">{{ threshold(p) || '—' }}</td>
              <td class="num hide-md">{{ money(p.cost_price) }}</td>
              <td class="num hide-md">{{ money(p.selling_price) }}</td>
              <td class="num hide-lg strong">{{ money(p.stock_value) }}</td>
              <td class="hide-sm"><span class="ui-badge" :class="`ui-badge--${status(p).badge}`">{{ status(p).label }}</span></td>
              <td class="actions-col" @click.stop>
                <div class="row-actions">
                  <button class="ui-btn ui-btn--ghost ui-btn--icon ui-btn--sm" title="Adjust stock" :aria-label="`Adjust stock for ${p.name}`" @click="openAdjust(p)"><i class="fa-solid fa-sliders"></i></button>
                  <button class="ui-btn ui-btn--ghost ui-btn--icon ui-btn--sm hide-xs" title="Edit" :aria-label="`Edit ${p.name}`" @click="openProduct(p)"><i class="fa-regular fa-pen-to-square"></i></button>
                  <button class="ui-btn ui-btn--ghost ui-btn--icon ui-btn--sm danger-text hide-xs" title="Delete" :aria-label="`Delete ${p.name}`" @click="deleteProduct(p)"><i class="fa-regular fa-trash-can"></i></button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <footer v-if="filtered.length" class="foot">
        <span>{{ filtered.length }} of {{ products.length }} product{{ products.length === 1 ? '' : 's' }}</span>
        <span>Value shown: <strong>{{ money(filteredValue) }}</strong></span>
      </footer>
    </section>

    <ProductModal
      v-if="productModal.open"
      :product="productModal.product"
      :categories="categories"
      :products="products"
      @close="productModal.open = false"
      @saved="onProductSaved"
      @category-created="loadCategories"
    />
    <StockAdjustmentModal v-if="adjustProduct" :product="adjustProduct" @close="adjustProduct = null" @saved="onAdjusted" />
    <CategoriesModal v-if="showCategories" :categories="categories" @close="showCategories = false" @changed="onCategoriesChanged" />
    <PurchaseOrderModal v-if="poPrefill" :prefill-products="poPrefill" @close="poPrefill = null" @saved="onPOCreated" />
    <ProductDrawer
      :open="!!drawerProduct"
      :product="drawerProduct"
      :version="drawerVersion"
      @close="drawerProduct = null"
      @adjust="openAdjust"
      @edit="openProduct"
      @delete="deleteProduct"
    />
  </div>
</template>

<script>
import ProductModal from '@/components/inventory/ProductModal.vue'
import StockAdjustmentModal from '@/components/inventory/StockAdjustmentModal.vue'
import CategoriesModal from '@/components/inventory/CategoriesModal.vue'
import ProductDrawer from '@/components/inventory/ProductDrawer.vue'
import PurchaseOrderModal from '@/components/suppliers/PurchaseOrderModal.vue'
import { inventoryService, STOCK_STATUS } from '@/services/inventoryService'
import { listFrom, apiErrorMessage } from '@/services/api'
import { formatMoney, isoDate, downloadBlob } from '@/utils/format'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'

export default {
  name: 'InventoryManagement',
  components: { ProductModal, StockAdjustmentModal, CategoriesModal, ProductDrawer, PurchaseOrderModal },
  data() {
    const q = this.$route.query
    return {
      products: [],
      categories: [],
      loading: false,
      loaded: false,
      error: '',
      search: q.q || '',
      categoryFilter: q.category || '',
      stockFilter: ['in_stock', 'low_stock', 'out_of_stock'].includes(q.stock) ? q.stock : '',
      activeFilter: 'active',
      sort: 'name',
      productModal: { open: false, product: null },
      adjustProduct: null,
      showCategories: false,
      drawerProduct: null,
      drawerVersion: 0,
      poPrefill: null
    }
  },
  computed: {
    kpi() {
      const active = this.products.filter((p) => p.is_active !== false)
      return {
        active: active.length,
        inactive: this.products.length - active.length,
        units: active.reduce((s, p) => s + Math.max(0, p.current_stock || 0), 0),
        value: active.reduce((s, p) => s + Math.max(0, p.current_stock || 0) * (Number(p.cost_price) || 0), 0),
        retail: active.reduce((s, p) => s + Math.max(0, p.current_stock || 0) * (Number(p.selling_price) || 0), 0),
        low: active.filter((p) => p.stock_status === 'low_stock').length,
        out: active.filter((p) => p.stock_status === 'out_of_stock').length
      }
    },
    filtered() {
      const q = this.search.trim().toLowerCase()
      let rows = this.products.filter((p) => {
        if (this.activeFilter === 'active' && p.is_active === false) return false
        if (this.activeFilter === 'inactive' && p.is_active !== false) return false
        if (this.categoryFilter === 'none' && p.category_id) return false
        if (this.categoryFilter && this.categoryFilter !== 'none' && p.category_id !== this.categoryFilter) return false
        if (this.stockFilter && p.stock_status !== this.stockFilter) return false
        if (q && !`${p.name} ${p.sku} ${p.barcode || ''}`.toLowerCase().includes(q)) return false
        return true
      })
      const by = {
        name: (a, b) => a.name.localeCompare(b.name),
        stock: (a, b) => a.current_stock - b.current_stock || a.name.localeCompare(b.name),
        value: (a, b) => (b.stock_value || 0) - (a.stock_value || 0),
        recent: (a, b) => String(b.created_at).localeCompare(String(a.created_at))
      }[this.sort]
      return [...rows].sort(by)
    },
    filteredValue() {
      return this.filtered.reduce((s, p) => s + (Number(p.stock_value) || 0), 0)
    },
    reorderable() {
      return this.filtered.filter((p) => p.is_active !== false && p.stock_status !== 'in_stock')
    }
  },
  watch: {
    search() {
      this.syncQuery()
    },
    categoryFilter() {
      this.syncQuery()
    },
    stockFilter() {
      this.syncQuery()
    }
  },
  created() {
    this.load()
    this.loadCategories()
  },
  methods: {
    money: (v) => formatMoney(v),
    status(p) {
      return STOCK_STATUS[p.stock_status] || STOCK_STATUS.in_stock
    },
    threshold(p) {
      return Math.max(p.reorder_point || 0, p.min_stock || 0)
    },
    stockClass(p) {
      return p.stock_status === 'out_of_stock' ? 'txt-danger' : p.stock_status === 'low_stock' ? 'txt-warning' : ''
    },
    syncQuery() {
      const query = {}
      if (this.search) query.q = this.search
      if (this.categoryFilter) query.category = this.categoryFilter
      if (this.stockFilter) query.stock = this.stockFilter
      this.$router.replace({ query }).catch(() => {})
    },
    resetFilters() {
      this.search = ''
      this.categoryFilter = ''
      this.stockFilter = ''
      this.activeFilter = 'active'
    },
    toggleStock(s) {
      this.stockFilter = this.stockFilter === s ? '' : s
      this.activeFilter = 'active'
    },
    async load() {
      this.loading = true
      this.error = ''
      try {
        const res = await inventoryService.getProducts()
        this.products = listFrom(res, 'products')
        this.loaded = true
        if (this.drawerProduct) this.drawerProduct = this.products.find((p) => p.id === this.drawerProduct.id) || null
      } catch (e) {
        this.error = apiErrorMessage(e, 'Could not load products')
      } finally {
        this.loading = false
      }
    },
    async loadCategories() {
      try {
        const res = await inventoryService.getCategories()
        this.categories = listFrom(res, 'categories')
      } catch {
        /* categories are optional for the page */
      }
    },
    openProduct(p = null) {
      this.productModal = { open: true, product: p }
    },
    openAdjust(p) {
      this.adjustProduct = p
    },
    openDrawer(p) {
      this.drawerProduct = p
    },
    async onProductSaved(p) {
      this.productModal.open = false
      await Promise.all([this.load(), this.loadCategories()])
      if (p && this.drawerProduct?.id === p.id) this.drawerVersion++
    },
    async onAdjusted() {
      this.adjustProduct = null
      await this.load()
      this.drawerVersion++
    },
    onCategoriesChanged() {
      this.loadCategories()
      this.load()
    },
    async deleteProduct(p) {
      const ok = await confirmDialog({
        title: `Delete ${p.name}?`,
        message: `${p.sku} will be removed from your inventory${p.current_stock ? ` along with its ${p.current_stock} units on hand` : ''}. Its stock history is kept for reporting.`,
        confirmText: 'Delete product',
        danger: true
      })
      if (!ok) return
      try {
        await inventoryService.deleteProduct(p.id)
        toast.success(`${p.name} deleted`)
        if (this.drawerProduct?.id === p.id) this.drawerProduct = null
        this.load()
        this.loadCategories()
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not delete the product'))
      }
    },
    reorder() {
      this.poPrefill = this.reorderable.map((p) => p.id)
    },
    onPOCreated(po) {
      this.poPrefill = null
      if (po?.id) this.$router.push({ path: '/suppliers', query: { tab: 'orders' } })
    },
    exportCsv() {
      const cols = [
        ['SKU', (p) => p.sku],
        ['Name', (p) => p.name],
        ['Barcode', (p) => p.barcode || ''],
        ['Category', (p) => p.category?.name || ''],
        ['Unit', (p) => p.unit_of_measure || 'each'],
        ['On hand', (p) => p.current_stock],
        ['Min stock', (p) => p.min_stock || 0],
        ['Reorder point', (p) => p.reorder_point || 0],
        ['Max stock', (p) => p.max_stock || 0],
        ['Cost price', (p) => Number(p.cost_price || 0).toFixed(2)],
        ['Selling price', (p) => Number(p.selling_price || 0).toFixed(2)],
        ['Stock value', (p) => Number(p.stock_value || 0).toFixed(2)],
        ['Stock status', (p) => this.status(p).label],
        ['Active', (p) => (p.is_active === false ? 'No' : 'Yes')]
      ]
      const cell = (v) => {
        const s = String(v ?? '')
        return /[",\n\r]/.test(s) || /^[=+\-@]/.test(s) ? `"${s.replace(/^([=+\-@])/, "'$1").replace(/"/g, '""')}"` : s
      }
      const lines = [cols.map((c) => c[0]).join(',')].concat(this.filtered.map((p) => cols.map((c) => cell(c[1](p))).join(',')))
      downloadBlob(new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }), `inventory-${isoDate()}.csv`)
      toast.success(`Exported ${this.filtered.length} product${this.filtered.length === 1 ? '' : 's'}`)
    }
  }
}
</script>

<style scoped>
.kpi-btn {
  text-align: left;
  font: inherit;
  color: inherit;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.kpi-btn:hover {
  border-color: var(--border-strong);
  box-shadow: var(--shadow);
}
.kpi-btn.is-selected {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-ring);
}
.kpi-sk {
  display: inline-block;
  width: 70px;
  height: 26px;
}
.kpi-success {
  background: var(--success-soft);
  color: var(--success);
}
.kpi-warning {
  background: var(--warning-soft);
  color: var(--warning);
}
.kpi-danger {
  background: var(--danger-soft);
  color: var(--danger);
}
.txt-danger {
  color: var(--danger) !important;
}
.txt-warning {
  color: var(--warning) !important;
}
.muted {
  color: var(--text-3);
}
.strong {
  font-weight: 600;
  color: var(--text);
}
.mono {
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
  font-size: 13px;
}
.danger-text {
  color: var(--danger);
}
.nowrap {
  white-space: nowrap;
}
.reorder {
  margin-bottom: 16px;
  align-items: center;
}
.reorder .ui-btn {
  margin-left: auto;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
}
.toolbar__right {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.search {
  width: 320px;
}
.sel {
  width: 170px;
}
.sel-sm {
  width: 140px;
}
.sk-row {
  display: flex;
  gap: 16px;
  padding: 12px 0;
}
.is-loading {
  opacity: 0.6;
  transition: opacity 0.2s;
}

.p-cell {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 200px;
}
.min0 {
  min-width: 0;
}
.p-cell small {
  display: block;
  font-size: 12px;
  color: var(--text-3);
}
.p-icon {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  font-size: 12px;
  background: var(--accent-soft);
  color: var(--accent);
  flex-shrink: 0;
}
.p-icon.low_stock {
  background: var(--warning-soft);
  color: var(--warning);
}
.p-icon.out_of_stock {
  background: var(--danger-soft);
  color: var(--danger);
}
tr.is-off td {
  opacity: 0.65;
}
.num {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.unit {
  margin-left: 4px;
  font-size: 11.5px;
  color: var(--text-3);
}
.actions-col {
  width: 1%;
  white-space: nowrap;
}
.row-actions {
  display: flex;
  justify-content: flex-end;
  gap: 2px;
}
.foot {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 12px 16px;
  border-top: 1px solid var(--border);
  font-size: 13px;
  color: var(--text-3);
}
.foot strong {
  color: var(--text);
  font-variant-numeric: tabular-nums;
}

@media (max-width: 1320px) {
  .hide-lg {
    display: none;
  }
}
@media (max-width: 1000px) {
  .hide-md {
    display: none;
  }
}
@media (max-width: 700px) {
  .hide-sm {
    display: none;
  }
  .search,
  .toolbar__right {
    width: 100%;
  }
  .toolbar__right {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
  .sel,
  .sel-sm {
    width: 100%;
  }
  .p-cell {
    min-width: 0;
  }
  .reorder {
    flex-wrap: wrap;
  }
}
@media (max-width: 480px) {
  .hide-xs {
    display: none;
  }
}
</style>
