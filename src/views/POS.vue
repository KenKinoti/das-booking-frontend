<template>
  <div class="ui-page ui-page--wide pos">
    <header class="ui-page-head pos-head">
      <div>
        <div class="ui-eyebrow">Sales</div>
        <h1>Point of Sale</h1>
      </div>
      <div class="ui-actions">
        <button class="drawer-pill" :class="drawer ? 'is-open' : 'is-closed'" :disabled="drawerLoading" @click="showDrawer = true">
          <span class="dot"></span>
          <span v-if="drawer">Drawer open · <strong>{{ money(drawer.expected_amount) }}</strong></span>
          <span v-else>Drawer closed<span class="hide-xs"> · Open</span></span>
        </button>
        <button class="ui-btn" @click="showParked = true">
          <i class="fa-regular fa-clock"></i> Parked<span v-if="parked.length" class="count">{{ parked.length }}</span>
        </button>
        <router-link to="/pos-transactions" class="ui-btn"><i class="fa-solid fa-receipt"></i> <span class="hide-xs">Transactions</span></router-link>
      </div>
    </header>

    <div class="pos-grid">
      <!-- ============ Catalogue ============ -->
      <section class="catalog ui-card">
        <div class="catalog__bar">
          <div class="ui-input-group scan">
            <i class="fa-solid fa-barcode"></i>
            <input
              ref="scan"
              v-model="query"
              class="ui-input"
              type="search"
              placeholder="Search, or scan a barcode / SKU and press Enter"
              aria-label="Search products or scan barcode"
              autocomplete="off"
              @keydown.enter.prevent="onScan"
              @keydown.esc="query = ''"
            />
            <kbd v-if="!query" class="kbd hide-sm">/</kbd>
          </div>
          <label class="ui-switch stock-toggle hide-sm">
            <input v-model="hideOutOfStock" type="checkbox" />
            <span>In stock only</span>
          </label>
        </div>

        <div v-if="categories.length > 1" class="chips" role="tablist" aria-label="Categories">
          <button class="chip" :class="{ 'is-active': !activeCat }" role="tab" :aria-selected="!activeCat" @click="activeCat = ''">All <span>{{ products.length }}</span></button>
          <button v-for="c in categories" :key="c.name" class="chip" :class="{ 'is-active': activeCat === c.name }" role="tab" :aria-selected="activeCat === c.name" @click="activeCat = activeCat === c.name ? '' : c.name">
            {{ c.name }} <span>{{ c.count }}</span>
          </button>
        </div>

        <div class="catalog__body">
          <div v-if="loadError" class="ui-alert ui-alert--danger"><i class="fa-solid fa-circle-exclamation"></i><span>{{ loadError }} <a href="#" @click.prevent="loadProducts">Try again</a></span></div>

          <div v-else-if="loading && !products.length" class="grid">
            <div v-for="n in 12" :key="n" class="ui-skeleton tile-sk"></div>
          </div>

          <div v-else-if="!products.length" class="ui-empty">
            <div class="ui-empty__icon"><i class="fa-solid fa-boxes-stacked"></i></div>
            <h3>No products to sell yet</h3>
            <p>Add products with a selling price in Inventory and they will appear here.</p>
            <router-link to="/inventory" class="ui-btn ui-btn--primary" style="margin-top: 12px"><i class="fa-solid fa-plus"></i> Add products in Inventory</router-link>
          </div>

          <div v-else-if="!filtered.length" class="ui-empty">
            <div class="ui-empty__icon"><i class="fa-solid fa-magnifying-glass"></i></div>
            <h3>No matching products</h3>
            <p>Nothing matches “{{ query || activeCat }}”.</p>
            <button class="ui-btn" style="margin-top: 12px" @click="resetFilters">Clear filters</button>
          </div>

          <div v-else class="grid">
            <button
              v-for="p in filtered"
              :key="p.id"
              class="tile"
              :class="{ 'is-out': available(p) <= 0, 'in-cart': qtyInCart(p.id) }"
              :disabled="available(p) <= 0"
              :aria-label="`Add ${p.name}, ${money(p.selling_price)}${available(p) <= 0 ? ', out of stock' : ''}`"
              @click="addProduct(p)"
            >
              <span v-if="qtyInCart(p.id)" class="tile__qty">{{ qtyInCart(p.id) }}</span>
              <span class="tile__avatar">{{ initials(p.name) }}</span>
              <span class="tile__name">{{ p.name }}</span>
              <span class="tile__sku">{{ p.sku }}</span>
              <span class="tile__foot">
                <strong>{{ money(p.selling_price) }}</strong>
                <span class="stock" :class="stockClass(p)">{{ stockLabel(p) }}</span>
              </span>
            </button>
          </div>
        </div>
      </section>

      <!-- ============ Cart ============ -->
      <div v-if="cartOpen" class="cart-scrim" @click="cartOpen = false"></div>
      <aside class="cart ui-card" :class="{ 'is-open': cartOpen }" aria-label="Current sale">
        <div class="cart__head">
          <div>
            <h2>Current sale</h2>
            <span class="muted">{{ itemCount }} item{{ itemCount === 1 ? '' : 's' }}</span>
          </div>
          <div class="cart__head-actions">
            <button class="ui-btn ui-btn--ghost ui-btn--sm" :disabled="!cart.length" title="Put this sale on hold" @click="parkSale"><i class="fa-regular fa-clock"></i> Park</button>
            <button class="ui-btn ui-btn--ghost ui-btn--sm" :disabled="!cart.length && !customer" @click="clearSale"><i class="fa-regular fa-trash-can"></i> Clear</button>
            <button class="ui-btn ui-btn--ghost ui-btn--icon ui-btn--sm cart-close" aria-label="Close cart" @click="cartOpen = false"><i class="fa-solid fa-xmark"></i></button>
          </div>
        </div>

        <!-- Customer -->
        <div class="customer" ref="customerBox">
          <button v-if="customer" class="customer__chip" @click="openCustomerPicker">
            <span class="avatar">{{ initials(personName(customer)) }}</span>
            <span class="customer__text">
              <strong>{{ personName(customer) }}</strong>
              <small>{{ customer.email || customer.phone }}</small>
            </span>
            <span class="ui-btn ui-btn--ghost ui-btn--icon ui-btn--sm" role="button" aria-label="Remove customer" @click.stop="customer = null"><i class="fa-solid fa-xmark"></i></span>
          </button>
          <button v-else class="customer__add" @click="openCustomerPicker"><i class="fa-regular fa-user"></i> Add customer <span class="muted">(optional)</span></button>

          <div v-if="customerOpen" class="picker" @keydown.esc.stop="customerOpen = false">
            <div class="ui-input-group">
              <i class="fa-solid fa-magnifying-glass"></i>
              <input ref="customerInput" v-model="customerQuery" class="ui-input" placeholder="Search name, email or phone" aria-label="Search customers" @input="searchCustomers" @keydown.enter.prevent="pickFirstCustomer" />
            </div>
            <ul class="picker__list">
              <li v-if="customersLoading" class="picker__empty"><i class="fa-solid fa-circle-notch spin"></i> Searching…</li>
              <li v-else-if="!customerResults.length" class="picker__empty">No customers found. <router-link to="/customers">Manage customers</router-link></li>
              <li v-for="c in customerResults" :key="c.id">
                <button @click="pickCustomer(c)">
                  <strong>{{ personName(c) }}</strong>
                  <small>{{ [c.email, c.phone].filter(Boolean).join(' · ') }}</small>
                </button>
              </li>
            </ul>
          </div>
        </div>

        <!-- Lines -->
        <div class="lines">
          <div v-if="!cart.length" class="cart-empty">
            <i class="fa-solid fa-cart-shopping"></i>
            <p>Tap a product or scan a barcode to start a sale.</p>
          </div>
          <div v-for="(l, i) in cart" :key="l.product_id" class="line">
            <div class="line__main">
              <div class="line__name">{{ l.name }}</div>
              <div class="line__meta">{{ money(l.price) }} each<span v-if="l.qty >= l.stock" class="warn"> · max stock</span></div>
            </div>
            <div class="stepper">
              <button :aria-label="`Decrease ${l.name}`" @click="setQty(i, l.qty - 1)"><i class="fa-solid fa-minus"></i></button>
              <input :value="l.qty" type="number" min="1" :max="l.stock" inputmode="numeric" :aria-label="`${l.name} quantity`" @change="setQty(i, $event.target.value)" @focus="$event.target.select()" />
              <button :aria-label="`Increase ${l.name}`" :disabled="l.qty >= l.stock" @click="setQty(i, l.qty + 1)"><i class="fa-solid fa-plus"></i></button>
            </div>
            <div class="line__total">{{ money(lineTotal(l)) }}</div>
            <button class="ui-btn ui-btn--ghost ui-btn--icon ui-btn--sm line__remove" :aria-label="`Remove ${l.name}`" @click="cart.splice(i, 1)"><i class="fa-solid fa-xmark"></i></button>
          </div>
        </div>

        <!-- Adjustments & totals -->
        <div class="cart__foot">
          <div class="adjust">
            <div class="adjust__row">
              <span class="adjust__label">Discount</span>
              <div class="seg">
                <button :class="{ 'is-active': discountMode === 'none' }" @click="setDiscountMode('none')">None</button>
                <button :class="{ 'is-active': discountMode === 'percent' }" @click="setDiscountMode('percent')">%</button>
                <button :class="{ 'is-active': discountMode === 'amount' }" @click="setDiscountMode('amount')">$</button>
              </div>
              <input v-if="discountMode !== 'none'" ref="discountInput" v-model="discountValue" class="ui-input adjust__input" type="number" min="0" :max="discountMode === 'percent' ? 100 : undefined" step="0.01" inputmode="decimal" :aria-label="discountMode === 'percent' ? 'Discount percent' : 'Discount amount'" />
            </div>
            <div v-if="presetDiscounts.length" class="presets">
              <button v-for="d in presetDiscounts" :key="d.id" class="chip chip--sm" :class="{ 'is-active': isPreset(d) }" :disabled="d.min_purchase > subTotal" :title="d.min_purchase > 0 ? `Min. spend ${money(d.min_purchase)}` : d.description" @click="applyPreset(d)">
                {{ d.name }} · {{ d.type === 'percentage' ? d.value + '%' : money(d.value) }}
              </button>
            </div>
            <div class="adjust__row">
              <span class="adjust__label">Tax</span>
              <select v-model="taxRateId" class="ui-select adjust__select" aria-label="Tax rate">
                <option value="">No tax</option>
                <option v-for="t in taxRates" :key="t.id" :value="t.id">{{ t.name }} ({{ t.rate }}%)</option>
              </select>
              <label v-if="taxRateId" class="incl" title="Prices already include tax">
                <input v-model="taxInclusive" type="checkbox" /> Incl.
              </label>
              <button v-if="!taxRates.length" class="ui-btn ui-btn--ghost ui-btn--sm" :disabled="creatingTax" @click="addGst">+ GST 10%</button>
            </div>
          </div>

          <dl class="totals">
            <div><dt>Subtotal</dt><dd>{{ money(subTotal) }}</dd></div>
            <div v-if="discountAmount > 0" class="is-discount"><dt>Discount</dt><dd>−{{ money(discountAmount) }}</dd></div>
            <div v-if="taxRate"><dt>{{ taxInclusive ? `Includes ${taxName}` : taxName }}</dt><dd>{{ taxInclusive ? '' : '+' }}{{ money(taxAmount) }}</dd></div>
            <div class="totals__grand"><dt>Total</dt><dd>{{ money(total) }}</dd></div>
          </dl>

          <button class="charge" :disabled="!cart.length || total < 0" @click="openPayment">
            <span>Charge</span>
            <strong>{{ money(total) }}</strong>
          </button>
          <div class="hint hide-sm"><kbd class="kbd">F9</kbd> charge · <kbd class="kbd">/</kbd> search · <kbd class="kbd">Enter</kbd> add scanned code</div>
        </div>
      </aside>
    </div>

    <!-- Mobile cart bar -->
    <button v-if="!cartOpen" class="cart-bar" @click="cartOpen = true">
      <span><i class="fa-solid fa-cart-shopping"></i> {{ itemCount }} item{{ itemCount === 1 ? '' : 's' }}</span>
      <strong>{{ money(total) }} <i class="fa-solid fa-chevron-up"></i></strong>
    </button>

    <PaymentModal v-if="showPay" :total="total" :currency="currency" :busy="paying" :error="payError" @close="showPay = false" @confirm="completeSale" />
    <ReceiptModal v-if="receipt" :transaction="receipt" :organization="organization" :currency="currency" after-sale @close="receipt = null" @new-sale="newSale" />
    <CashDrawerModal v-if="showDrawer" :drawer="drawer" :currency="currency" :busy="drawerBusy" @close="showDrawer = false" @open="openDrawer" @close-drawer="closeDrawer" />
    <ParkedSalesModal v-if="showParked" :sales="parked" :currency="currency" @close="showParked = false" @resume="resumeParked" @discard="discardParked" />
  </div>
</template>

<script>
import PaymentModal from '@/components/pos/PaymentModal.vue'
import ReceiptModal from '@/components/pos/ReceiptModal.vue'
import CashDrawerModal from '@/components/pos/CashDrawerModal.vue'
import ParkedSalesModal from '@/components/pos/ParkedSalesModal.vue'
import { posService, personName } from '@/services/posService'
import { apiErrorMessage } from '@/services/api'
import { formatMoney } from '@/utils/format'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100
const LS_CURRENT = 'pos.current.v1'
const LS_PARKED = 'pos.parked.v1'
const LS_TAX = 'pos.tax.v1'

function readLS(key, fallback) {
  try {
    const v = localStorage.getItem(key)
    return v ? JSON.parse(v) : fallback
  } catch {
    return fallback
  }
}
function writeLS(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage unavailable */
  }
}

export default {
  name: 'POS',
  components: { PaymentModal, ReceiptModal, CashDrawerModal, ParkedSalesModal },
  data() {
    const current = readLS(LS_CURRENT, {})
    const tax = readLS(LS_TAX, {})
    return {
      currency: 'AUD',
      products: [],
      loading: false,
      loadError: '',
      query: '',
      activeCat: '',
      hideOutOfStock: false,

      cart: Array.isArray(current.cart) ? current.cart : [],
      customer: current.customer || null,
      discountMode: current.discountMode || 'none',
      discountValue: current.discountValue ?? '',

      customerOpen: false,
      customerQuery: '',
      customerResults: [],
      customersLoading: false,
      customerTimer: null,

      discounts: [],
      taxRates: [],
      taxRateId: tax.id ?? null,
      taxInclusive: tax.inclusive ?? true,
      creatingTax: false,

      drawer: null,
      drawerLoading: false,
      drawerBusy: false,
      showDrawer: false,

      parked: readLS(LS_PARKED, []),
      showParked: false,

      showPay: false,
      paying: false,
      payError: '',
      receipt: null,
      organization: null,
      cartOpen: false
    }
  },
  computed: {
    categories() {
      const map = new Map()
      for (const p of this.products) {
        const n = p.category?.name || 'Uncategorised'
        map.set(n, (map.get(n) || 0) + 1)
      }
      return [...map.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name))
    },
    filtered() {
      const q = this.query.trim().toLowerCase()
      return this.products.filter((p) => {
        if (this.activeCat && (p.category?.name || 'Uncategorised') !== this.activeCat) return false
        if (this.hideOutOfStock && this.available(p) <= 0 && !this.qtyInCart(p.id)) return false
        if (!q) return true
        return [p.name, p.sku, p.barcode].some((v) => v && String(v).toLowerCase().includes(q))
      })
    },
    itemCount() {
      return this.cart.reduce((n, l) => n + l.qty, 0)
    },
    subTotal() {
      return r2(this.cart.reduce((s, l) => s + this.lineTotal(l), 0))
    },
    discountAmount() {
      const v = Number(this.discountValue) || 0
      let d = 0
      if (this.discountMode === 'percent') d = (this.subTotal * Math.min(100, Math.max(0, v))) / 100
      else if (this.discountMode === 'amount') d = v
      return r2(Math.max(0, Math.min(d, this.subTotal)))
    },
    taxRateObj() {
      return this.taxRates.find((t) => t.id === this.taxRateId) || null
    },
    taxRate() {
      return this.taxRateObj ? Number(this.taxRateObj.rate) || 0 : 0
    },
    taxName() {
      return this.taxRateObj ? `${this.taxRateObj.name} ${this.taxRateObj.rate}%` : 'Tax'
    },
    taxAmount() {
      if (!this.taxRate || !this.subTotal) return 0
      const factor = (this.subTotal - this.discountAmount) / this.subTotal
      const rate = this.taxRate
      return r2(
        this.cart.reduce((s, l) => {
          const base = this.lineTotal(l) * factor
          return s + r2(this.taxInclusive ? (base * rate) / (100 + rate) : (base * rate) / 100)
        }, 0)
      )
    },
    total() {
      const t = this.subTotal - this.discountAmount
      return r2(this.taxInclusive ? t : t + this.taxAmount)
    },
    presetDiscounts() {
      return this.discounts.filter((d) => d.is_active && (d.type === 'percentage' || d.type === 'fixed_amount'))
    },
    anyModal() {
      return this.showPay || !!this.receipt || this.showDrawer || this.showParked
    }
  },
  watch: {
    cart: { handler: 'persist', deep: true },
    customer: 'persist',
    discountMode: 'persist',
    discountValue: 'persist',
    taxRateId() {
      this.persistTax()
    },
    taxInclusive() {
      this.persistTax()
    }
  },
  created() {
    this.loadProducts()
    this.loadDrawer()
    this.loadSettings()
    posService
      .organization()
      .then((o) => (this.organization = o))
      .catch(() => {})
  },
  mounted() {
    document.addEventListener('keydown', this.onKey)
    document.addEventListener('mousedown', this.onDocClick)
    this.$nextTick(() => this.focusScan())
  },
  beforeUnmount() {
    document.removeEventListener('keydown', this.onKey)
    document.removeEventListener('mousedown', this.onDocClick)
    clearTimeout(this.customerTimer)
  },
  methods: {
    personName,
    money(v) {
      return formatMoney(v, this.currency)
    },
    initials(name = '') {
      return (
        String(name)
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((p) => p[0])
          .join('')
          .toUpperCase() || '?'
      )
    },
    lineTotal(l) {
      return r2(l.qty * l.price)
    },

    // ---------- data ----------
    async loadProducts() {
      this.loading = true
      this.loadError = ''
      try {
        const list = await posService.products()
        this.products = list.filter((p) => p.is_active !== false)
        this.syncCartWithStock()
      } catch (e) {
        this.loadError = apiErrorMessage(e, 'Could not load products')
      } finally {
        this.loading = false
      }
    },
    async loadDrawer() {
      this.drawerLoading = true
      try {
        const list = await posService.drawers({ status: 'open', terminal_id: 'main' })
        this.drawer = list[0] || null
      } catch {
        this.drawer = null
      } finally {
        this.drawerLoading = false
      }
    },
    async loadSettings() {
      const [d, t] = await Promise.allSettled([posService.discounts(), posService.taxRates()])
      if (d.status === 'fulfilled') this.discounts = d.value
      if (t.status === 'fulfilled') {
        this.taxRates = t.value.filter((r) => r.is_active !== false)
        const exists = this.taxRates.some((r) => r.id === this.taxRateId)
        if (this.taxRateId === null || (this.taxRateId && !exists)) {
          this.taxRateId = (this.taxRates.find((r) => r.is_default) || this.taxRates[0])?.id || ''
        }
      }
    },
    async addGst() {
      this.creatingTax = true
      try {
        const t = await posService.createTaxRate({ name: 'GST', rate: 10, is_default: true })
        this.taxRates = [t, ...this.taxRates]
        this.taxRateId = t.id
        toast.success('GST 10% added as the default tax rate')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not add tax rate'))
      } finally {
        this.creatingTax = false
      }
    },
    syncCartWithStock() {
      const byId = new Map(this.products.map((p) => [p.id, p]))
      this.cart = this.cart
        .filter((l) => byId.has(l.product_id))
        .map((l) => {
          const p = byId.get(l.product_id)
          return { ...l, name: p.name, sku: p.sku, price: Number(p.selling_price) || 0, stock: p.current_stock, qty: Math.min(l.qty, Math.max(p.current_stock, 0)) }
        })
        .filter((l) => l.qty > 0)
    },
    persist() {
      writeLS(LS_CURRENT, { cart: this.cart, customer: this.customer, discountMode: this.discountMode, discountValue: this.discountValue })
    },
    persistTax() {
      writeLS(LS_TAX, { id: this.taxRateId, inclusive: this.taxInclusive })
    },

    // ---------- catalogue ----------
    qtyInCart(id) {
      return this.cart.find((l) => l.product_id === id)?.qty || 0
    },
    available(p) {
      return (Number(p.current_stock) || 0) - this.qtyInCart(p.id)
    },
    stockClass(p) {
      const s = Number(p.current_stock) || 0
      if (s <= 0) return 'is-out'
      if (s <= Math.max(5, p.min_stock || 0)) return 'is-low'
      return ''
    },
    stockLabel(p) {
      const s = Number(p.current_stock) || 0
      if (s <= 0) return 'Out of stock'
      return `${s} in stock`
    },
    resetFilters() {
      this.query = ''
      this.activeCat = ''
      this.focusScan()
    },
    focusScan() {
      this.$refs.scan?.focus()
    },
    addProduct(p, qty = 1) {
      const stock = Number(p.current_stock) || 0
      const line = this.cart.find((l) => l.product_id === p.id)
      const have = line?.qty || 0
      if (stock <= 0) {
        toast.warning(`${p.name} is out of stock`)
        return false
      }
      if (have + qty > stock) {
        toast.warning(`Only ${stock} × ${p.name} in stock`)
        if (have >= stock) return false
        qty = stock - have
      }
      if (line) {
        line.qty += qty
        // move to top so the latest scan is visible
        this.cart.splice(this.cart.indexOf(line), 1)
        this.cart.unshift(line)
      } else {
        this.cart.unshift({ product_id: p.id, name: p.name, sku: p.sku, price: Number(p.selling_price) || 0, qty, stock })
      }
      return true
    },
    onScan() {
      let raw = this.query.trim()
      if (!raw) return
      let qty = 1
      const m = raw.match(/^(\d{1,3})\s*[*x×]\s*(.+)$/i)
      if (m) {
        qty = Math.max(1, parseInt(m[1], 10))
        raw = m[2].trim()
      }
      const code = raw.toLowerCase()
      let p = this.products.find((x) => (x.barcode && String(x.barcode).toLowerCase() === code) || (x.sku && String(x.sku).toLowerCase() === code))
      if (!p && this.filtered.length === 1) p = this.filtered[0]
      if (!p) {
        toast.error(`No product matches “${raw}”`)
        this.$refs.scan?.select()
        return
      }
      if (this.addProduct(p, qty)) this.query = ''
      else this.$refs.scan?.select()
    },
    onKey(e) {
      if (this.anyModal) return
      const tag = (e.target?.tagName || '').toLowerCase()
      const typing = tag === 'input' || tag === 'textarea' || tag === 'select'
      if (e.key === 'F9' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) {
        e.preventDefault()
        this.openPayment()
      } else if (e.key === '/' && !typing) {
        e.preventDefault()
        this.focusScan()
      } else if (e.key === 'F2') {
        e.preventDefault()
        this.focusScan()
      } else if (e.key === 'Escape' && this.cartOpen) {
        this.cartOpen = false
      }
    },

    // ---------- cart ----------
    setQty(i, value) {
      const l = this.cart[i]
      if (!l) return
      let q = parseInt(value, 10)
      if (!Number.isFinite(q) || q <= 0) {
        this.cart.splice(i, 1)
        return
      }
      if (q > l.stock) {
        toast.warning(`Only ${l.stock} × ${l.name} in stock`)
        q = l.stock
      }
      l.qty = q
    },
    setDiscountMode(m) {
      if (m === this.discountMode) return
      this.discountMode = m
      this.discountValue = ''
      if (m !== 'none') this.$nextTick(() => this.$refs.discountInput?.focus())
    },
    isPreset(d) {
      return (d.type === 'percentage' ? 'percent' : 'amount') === this.discountMode && Number(this.discountValue) === Number(d.value)
    },
    applyPreset(d) {
      if (this.isPreset(d)) {
        this.discountMode = 'none'
        this.discountValue = ''
        return
      }
      this.discountMode = d.type === 'percentage' ? 'percent' : 'amount'
      this.discountValue = String(d.value)
    },
    async clearSale() {
      if (this.cart.length) {
        const ok = await confirmDialog({ title: 'Clear this sale?', message: 'All items in the cart will be removed.', confirmText: 'Clear sale', danger: true })
        if (!ok) return
      }
      this.resetSale()
    },
    resetSale() {
      this.cart = []
      this.customer = null
      this.discountMode = 'none'
      this.discountValue = ''
    },

    // ---------- customers ----------
    openCustomerPicker() {
      this.customerOpen = !this.customerOpen
      if (this.customerOpen) {
        this.customerQuery = ''
        this.searchCustomers()
        this.$nextTick(() => this.$refs.customerInput?.focus())
      }
    },
    searchCustomers() {
      clearTimeout(this.customerTimer)
      this.customersLoading = true
      this.customerTimer = setTimeout(async () => {
        try {
          const list = await posService.customers(this.customerQuery.trim())
          this.customerResults = list.slice(0, 30)
        } catch {
          this.customerResults = []
        } finally {
          this.customersLoading = false
        }
      }, 220)
    },
    pickCustomer(c) {
      this.customer = { id: c.id, first_name: c.first_name, last_name: c.last_name, email: c.email, phone: c.phone }
      this.customerOpen = false
      this.focusScan()
    },
    pickFirstCustomer() {
      if (this.customerResults[0]) this.pickCustomer(this.customerResults[0])
    },
    onDocClick(e) {
      if (this.customerOpen && this.$refs.customerBox && !this.$refs.customerBox.contains(e.target)) this.customerOpen = false
    },

    // ---------- park ----------
    savePark() {
      writeLS(LS_PARKED, this.parked)
    },
    parkSale() {
      if (!this.cart.length) return
      const label = this.customer ? personName(this.customer) : `Sale ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
      this.parked.unshift({
        id: Date.now().toString(36),
        label,
        created_at: new Date().toISOString(),
        cart: this.cart.map((l) => ({ ...l })),
        customer: this.customer,
        discountMode: this.discountMode,
        discountValue: this.discountValue,
        total: this.total
      })
      this.savePark()
      this.resetSale()
      toast.success(`Sale parked as “${label}”`)
      this.focusScan()
    },
    async resumeParked(s) {
      if (this.cart.length) {
        const ok = await confirmDialog({ title: 'Replace current sale?', message: 'The current cart will be parked so you can come back to it.', confirmText: 'Park & resume' })
        if (!ok) return
        this.parkSale()
      }
      this.parked = this.parked.filter((p) => p.id !== s.id)
      this.savePark()
      this.cart = s.cart || []
      this.customer = s.customer || null
      this.discountMode = s.discountMode || 'none'
      this.discountValue = s.discountValue ?? ''
      this.syncCartWithStock()
      this.showParked = false
      toast.info(`Resumed “${s.label}”`)
    },
    async discardParked(s) {
      const ok = await confirmDialog({ title: 'Discard parked sale?', message: `“${s.label}” will be deleted.`, confirmText: 'Discard', danger: true })
      if (!ok) return
      this.parked = this.parked.filter((p) => p.id !== s.id)
      this.savePark()
    },

    // ---------- checkout ----------
    openPayment() {
      if (!this.cart.length) {
        toast.info('Add something to the cart first')
        return
      }
      this.payError = ''
      this.cartOpen = false
      this.showPay = true
    },
    async completeSale(payments) {
      this.paying = true
      this.payError = ''
      try {
        const payload = {
          items: this.cart.map((l) => ({ product_id: l.product_id, quantity: l.qty })),
          payments,
          customer_id: this.customer?.id || null,
          cash_drawer_id: this.drawer?.id || null,
          tax_rate: this.taxRate,
          tax_inclusive: !!this.taxRate && this.taxInclusive
        }
        if (this.discountMode === 'percent' && this.discountAmount > 0) payload.discount_percent = Number(this.discountValue)
        else if (this.discountMode === 'amount' && this.discountAmount > 0) payload.discount_amount = this.discountAmount
        const txn = await posService.createTransaction(payload)
        this.showPay = false
        this.receipt = txn
        this.resetSale()
        this.loadProducts()
        this.loadDrawer()
      } catch (e) {
        this.payError = apiErrorMessage(e, 'The sale could not be completed')
        if (e?.response?.status === 409) this.loadProducts()
      } finally {
        this.paying = false
      }
    },
    newSale() {
      this.receipt = null
      this.$nextTick(() => this.focusScan())
    },

    // ---------- drawer ----------
    async openDrawer(payload) {
      this.drawerBusy = true
      try {
        this.drawer = await posService.openDrawer({ ...payload, terminal_id: 'main' })
        this.showDrawer = false
        toast.success(`Drawer opened with ${this.money(this.drawer.opening_amount)} float`)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not open the drawer'))
        this.loadDrawer()
      } finally {
        this.drawerBusy = false
      }
    },
    async closeDrawer(payload) {
      this.drawerBusy = true
      try {
        const d = await posService.closeDrawer(this.drawer.id, payload)
        this.drawer = null
        this.showDrawer = false
        const v = Number(d.variance) || 0
        const msg = `Drawer closed. Expected ${this.money(d.expected_amount)}, counted ${this.money(d.closing_amount)}`
        if (v === 0) toast.success(`${msg} — balanced.`)
        else toast.warning(`${msg} — ${v > 0 ? 'over' : 'short'} by ${this.money(Math.abs(v))}.`)
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Could not close the drawer'))
      } finally {
        this.drawerBusy = false
      }
    }
  }
}
</script>

<style scoped>
.pos {
  --cart-w: 420px;
}
.pos-head {
  margin-bottom: 16px;
}
.pos-head h1 {
  margin-bottom: 0;
}
.count {
  margin-left: 2px;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 10px;
  display: inline-grid;
  place-items: center;
  font-size: 11.5px;
  font-weight: 700;
  background: var(--accent);
  color: var(--accent-contrast);
}
.drawer-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-2);
  font: inherit;
  font-size: 13.5px;
  cursor: pointer;
  font-variant-numeric: tabular-nums;
}
.drawer-pill:hover {
  border-color: var(--border-strong);
  background: var(--surface-hover);
}
.drawer-pill strong {
  color: var(--text);
}
.drawer-pill .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-3);
}
.drawer-pill.is-open .dot {
  background: var(--success);
  box-shadow: 0 0 0 3px var(--success-soft);
}
.drawer-pill.is-closed .dot {
  background: var(--warning);
  box-shadow: 0 0 0 3px var(--warning-soft);
}

.pos-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) var(--cart-w);
  gap: 20px;
  height: max(560px, calc(100vh - var(--topbar-h) - 124px));
}
@media (min-width: 1024px) {
  .pos {
    margin-bottom: -36px;
  }
}

/* ---------- catalogue ---------- */
.catalog {
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.catalog__bar {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
}
.scan {
  flex: 1;
  position: relative;
}
.scan .ui-input {
  height: 44px;
  font-size: 15px;
  padding-right: 40px;
}
.scan .kbd {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
}
.kbd {
  display: inline-grid;
  place-items: center;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  border-radius: 5px;
  border: 1px solid var(--border-strong);
  background: var(--surface-2);
  color: var(--text-3);
  font: 600 11px var(--font-mono);
}
.stock-toggle {
  white-space: nowrap;
  font-size: 13px;
  color: var(--text-2);
}
.chips {
  display: flex;
  gap: 6px;
  padding: 12px 16px 0;
  overflow-x: auto;
  scrollbar-width: none;
}
.chip {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-2);
  font: inherit;
  font-size: 13px;
  font-weight: 550;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}
.chip span {
  font-size: 11.5px;
  color: var(--text-3);
}
.chip:hover:not(:disabled) {
  background: var(--surface-hover);
}
.chip.is-active {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--accent-contrast);
}
.chip.is-active span {
  color: inherit;
  opacity: 0.8;
}
.chip:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.chip--sm {
  height: 26px;
  padding: 0 10px;
  font-size: 12px;
}
.catalog__body {
  padding: 16px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(168px, 1fr));
  gap: 12px;
}
.tile-sk {
  height: 150px;
  border-radius: var(--radius);
}
.tile {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  min-height: 150px;
  padding: 14px;
  text-align: left;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--text);
  font: inherit;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s, transform 0.08s;
}
.tile:hover:not(:disabled) {
  border-color: var(--accent);
  box-shadow: var(--shadow);
}
.tile:active:not(:disabled) {
  transform: scale(0.98);
}
.tile:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--accent-ring);
  border-color: var(--accent);
}
.tile.in-cart {
  border-color: var(--accent);
  background: var(--accent-soft);
}
.tile.is-out {
  cursor: not-allowed;
  opacity: 0.55;
}
.tile__qty {
  position: absolute;
  top: 10px;
  right: 10px;
  min-width: 24px;
  height: 24px;
  padding: 0 7px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: var(--accent);
  color: var(--accent-contrast);
  font-size: 12px;
  font-weight: 700;
}
.tile__avatar {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 700;
  background: var(--bg-subtle);
  color: var(--text-2);
}
.tile.in-cart .tile__avatar {
  background: var(--surface);
  color: var(--accent);
}
.tile__name {
  font-weight: 600;
  font-size: 14px;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.tile__sku {
  font-size: 11.5px;
  color: var(--text-3);
  font-family: var(--font-mono);
}
.tile__foot {
  margin-top: auto;
  padding-top: 8px;
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 6px;
}
.tile__foot strong {
  font-size: 15px;
  font-variant-numeric: tabular-nums;
}
.stock {
  font-size: 11.5px;
  color: var(--text-3);
  white-space: nowrap;
}
.stock.is-low {
  color: var(--warning);
}
.stock.is-out {
  color: var(--danger);
  font-weight: 600;
}

/* ---------- cart ---------- */
.cart {
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.cart__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
}
.cart__head h2 {
  font-size: 16px;
  margin: 0;
}
.cart__head .muted {
  font-size: 12.5px;
}
.cart__head-actions {
  display: flex;
  gap: 2px;
}
.cart-close {
  display: none;
}
.muted {
  color: var(--text-3);
}
.customer {
  position: relative;
  padding: 10px 16px;
  border-bottom: 1px solid var(--border);
}
.customer__add,
.customer__chip {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  border: 1px dashed var(--border-strong);
  background: transparent;
  color: var(--text-2);
  font: inherit;
  font-size: 13.5px;
  cursor: pointer;
  text-align: left;
}
.customer__add:hover {
  background: var(--surface-hover);
}
.customer__chip {
  border-style: solid;
  border-color: var(--border);
  background: var(--surface-2);
  padding: 6px 6px 6px 8px;
}
.customer__text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}
.customer__text strong {
  color: var(--text);
}
.customer__text small {
  color: var(--text-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.avatar {
  width: 30px;
  height: 30px;
  border-radius: 9px;
  display: grid;
  place-items: center;
  font-size: 11px;
  font-weight: 700;
  background: var(--accent-soft);
  color: var(--accent);
  flex-shrink: 0;
}
.picker {
  position: absolute;
  left: 12px;
  right: 12px;
  top: calc(100% - 4px);
  z-index: 20;
  padding: 8px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background: var(--surface);
  box-shadow: var(--shadow-lg);
}
.picker__list {
  list-style: none;
  margin: 6px 0 0;
  padding: 0;
  max-height: 260px;
  overflow: auto;
}
.picker__list button {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 8px 10px;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text);
  font: inherit;
  font-size: 13.5px;
  text-align: left;
  cursor: pointer;
}
.picker__list button:hover,
.picker__list button:focus-visible {
  background: var(--surface-hover);
  outline: none;
}
.picker__list small {
  color: var(--text-3);
  font-size: 12px;
}
.picker__empty {
  padding: 10px;
  font-size: 13px;
  color: var(--text-3);
}
.lines {
  flex: 1;
  overflow-y: auto;
  padding: 4px 8px;
}
.cart-empty {
  height: 100%;
  min-height: 140px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--text-3);
  text-align: center;
  padding: 24px;
}
.cart-empty i {
  font-size: 28px;
  opacity: 0.6;
}
.cart-empty p {
  margin: 0;
  font-size: 13.5px;
  max-width: 220px;
}
.line {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto 76px 28px;
  align-items: center;
  gap: 8px;
  padding: 10px 8px;
  border-bottom: 1px solid var(--border);
}
.line:last-child {
  border-bottom: 0;
}
.line__name {
  font-weight: 550;
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.line__meta {
  font-size: 12px;
  color: var(--text-3);
  font-variant-numeric: tabular-nums;
}
.line__meta .warn {
  color: var(--warning);
}
.line__total {
  text-align: right;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.line__remove {
  color: var(--text-3);
}
.stepper {
  display: flex;
  align-items: center;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: var(--surface);
}
.stepper button {
  width: 30px;
  height: 32px;
  border: 0;
  background: transparent;
  color: var(--text-2);
  cursor: pointer;
  font-size: 11px;
}
.stepper button:hover:not(:disabled) {
  background: var(--surface-hover);
  color: var(--text);
}
.stepper button:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.stepper input {
  width: 36px;
  height: 32px;
  border: 0;
  border-left: 1px solid var(--border);
  border-right: 1px solid var(--border);
  background: transparent;
  color: var(--text);
  text-align: center;
  font: inherit;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  -moz-appearance: textfield;
}
.stepper input::-webkit-outer-spin-button,
.stepper input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.stepper input:focus {
  outline: none;
  background: var(--accent-soft);
}
.cart__foot {
  border-top: 1px solid var(--border);
  padding: 12px 16px 14px;
  background: var(--surface-2);
}
.adjust {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border);
}
.adjust__row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.adjust__label {
  width: 64px;
  font-size: 13px;
  color: var(--text-2);
  flex-shrink: 0;
}
.adjust__input {
  flex: 1;
  height: 32px;
  min-width: 0;
  font-variant-numeric: tabular-nums;
}
.adjust__select {
  flex: 1;
  height: 32px;
  min-width: 0;
  padding-top: 0;
  padding-bottom: 0;
}
.presets {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding-left: 72px;
}
.incl {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12.5px;
  color: var(--text-2);
  white-space: nowrap;
  cursor: pointer;
}
.seg {
  display: flex;
  padding: 2px;
  gap: 2px;
  border-radius: var(--radius-sm);
  background: var(--bg-subtle);
}
.seg button {
  border: 0;
  height: 28px;
  padding: 0 10px;
  border-radius: 6px;
  background: transparent;
  color: var(--text-2);
  font: inherit;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
}
.seg button.is-active {
  background: var(--surface);
  color: var(--text);
  box-shadow: var(--shadow-xs);
}
.totals {
  margin: 10px 0 12px;
  font-size: 13.5px;
}
.totals div {
  display: flex;
  justify-content: space-between;
  padding: 2px 0;
}
.totals dt {
  font-weight: 400;
  color: var(--text-2);
}
.totals dd {
  margin: 0;
  font-variant-numeric: tabular-nums;
}
.totals .is-discount dd {
  color: var(--success);
}
.totals__grand {
  margin-top: 6px;
  padding-top: 8px !important;
  border-top: 1px dashed var(--border-strong);
}
.totals__grand dt,
.totals__grand dd {
  font-size: 20px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.01em;
}
.charge {
  width: 100%;
  height: 58px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  border: 0;
  border-radius: var(--radius);
  background: var(--accent);
  color: var(--accent-contrast);
  font: inherit;
  font-size: 17px;
  font-weight: 650;
  cursor: pointer;
  box-shadow: var(--shadow);
  transition: background 0.15s, transform 0.08s;
}
.charge strong {
  font-size: 20px;
  font-variant-numeric: tabular-nums;
}
.charge:hover:not(:disabled) {
  background: var(--accent-600);
}
.charge:active:not(:disabled) {
  transform: scale(0.99);
}
.charge:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  box-shadow: none;
}
.charge:focus-visible {
  outline: none;
  box-shadow: 0 0 0 4px var(--accent-ring);
}
.hint {
  margin-top: 8px;
  text-align: center;
  font-size: 11.5px;
  color: var(--text-3);
}
.cart-bar,
.cart-scrim {
  display: none;
}

@media (max-width: 1280px) {
  .pos {
    --cart-w: 380px;
  }
}

@media (max-width: 1023px) {
  .pos-grid {
    grid-template-columns: minmax(0, 1fr);
    height: auto;
  }
  .catalog {
    overflow: visible;
    margin-bottom: 72px;
  }
  .catalog__body {
    overflow: visible;
  }
  .cart {
    position: fixed;
    z-index: 1900;
    top: auto;
    right: 0;
    bottom: 0;
    left: 0;
    height: min(88vh, 760px);
    min-height: 0;
    border-radius: var(--radius-xl) var(--radius-xl) 0 0;
    transform: translateY(105%);
    transition: transform 0.25s var(--ease);
    box-shadow: var(--shadow-lg);
  }
  .cart.is-open {
    transform: none;
  }
  .cart-close {
    display: inline-flex;
  }
  .cart-scrim {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 1899;
    background: rgba(10, 12, 24, 0.45);
  }
  .cart-bar {
    position: fixed;
    z-index: 1800;
    left: 16px;
    right: 16px;
    bottom: 16px;
    height: 54px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 18px;
    border: 0;
    border-radius: var(--radius);
    background: var(--accent);
    color: var(--accent-contrast);
    font: inherit;
    font-size: 15px;
    font-weight: 600;
    box-shadow: var(--shadow-lg);
    cursor: pointer;
    font-variant-numeric: tabular-nums;
  }
  .cart-bar i {
    margin-right: 6px;
  }
  .cart-bar strong i {
    margin: 0 0 0 6px;
    font-size: 12px;
  }
}

@media (max-width: 640px) {
  .hide-sm {
    display: none !important;
  }
  .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
  .tile {
    min-height: 132px;
    padding: 12px;
  }
  .catalog__bar,
  .catalog__body {
    padding: 12px;
  }
  .chips {
    padding: 10px 12px 0;
  }
  .presets {
    padding-left: 0;
  }
}
@media (max-width: 420px) {
  .hide-xs {
    display: none;
  }
}
</style>
