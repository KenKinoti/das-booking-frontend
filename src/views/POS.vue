<template>
  <div class="ui-page ui-page--wide pos" :class="{ 'has-cart': cart.length }">
    <header class="ui-page-head pos-head">
      <div class="pos-title">
        <div class="ui-eyebrow">Sales</div>
        <h1>Point of Sale</h1>
      </div>
      <div class="ui-actions">
        <label v-if="barMode" class="sell-from" :title="'Stock for bar drinks comes from this bar (remembered on this device)'">
          <i class="fa-solid fa-martini-glass-citrus"></i>
          <span class="hide-xs">Selling from</span>
          <select v-model="barLoc" class="ui-select" aria-label="Selling from" data-testid="pos-sell-from">
            <option v-for="l in barLocs" :key="l.id" :value="l.id">{{ l.name }}</option>
          </select>
        </label>
        <button class="drawer-pill" :class="drawer ? 'is-open' : 'is-closed'" :disabled="drawerLoading" @click="showDrawer = true">
          <span class="dot"></span>
          <span v-if="drawer">Drawer open<span class="hide-phone"> · <strong>{{ money(drawer.expected_amount) }}</strong></span></span>
          <span v-else>Drawer closed<span class="hide-xs"> · Open</span></span>
        </button>
        <button class="ui-btn hide-phone" @click="showParked = true">
          <i class="fa-regular fa-clock"></i> Parked<span v-if="parked.length" class="count">{{ parked.length }}</span>
        </button>
        <router-link to="/pos-transactions" class="ui-btn hide-phone"><i class="fa-solid fa-receipt"></i> <span class="hide-xs">Transactions</span></router-link>
        <OverflowMenu :items="moreItems" label="More till actions" btn-class="pos-more" />
      </div>
    </header>

    <div v-if="offlineAt" class="ui-alert ui-alert--warning pos-offline" role="status" data-testid="pos-offline">
      <i class="fa-solid fa-wifi"></i>
      <span>No connection — searching the products and prices saved on this device at {{ offlineAt }}. Sales go through once you’re back online. <a href="#" @click.prevent="loadProducts">Try again</a></span>
    </div>

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
              :placeholder="narrow ? 'Search products' : 'Search or scan a barcode / SKU'"
              aria-label="Search products or scan barcode"
              autocomplete="off"
              enterkeyhint="search"
              @keydown.enter.prevent="onScan"
              @keydown.esc="query = ''"
            />
            <kbd v-if="!query" class="kbd hide-sm">/</kbd>
          </div>
          <button type="button" class="ui-btn scan-cam" data-testid="pos-scan" aria-label="Scan barcodes with the camera" title="Scan barcodes with the camera" @click="openScanner">
            <i class="fa-solid fa-camera"></i><span class="hide-sm">Scan</span>
          </button>
          <label class="ui-switch stock-toggle hide-sm">
            <input v-model="hideOutOfStock" type="checkbox" />
            <span>In stock only</span>
          </label>
        </div>

        <div v-if="categories.length > 1" class="chips" role="tablist" aria-label="Categories">
          <button class="chip" :class="{ 'is-active': !activeCat }" role="tab" :aria-selected="!activeCat" @click="activeCat = ''">All <span>{{ posProducts.length }}</span></button>
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
            <p v-if="clubType">Create your drinks (tots, bottles, cocktails) in Bar stock → Menu &amp; recipes and they will appear here.</p>
            <p v-else>Add products with a selling price in Inventory and they will appear here.</p>
            <router-link v-if="clubType" to="/bar-stock?tab=recipes" class="ui-btn ui-btn--primary" style="margin-top: 12px"><i class="fa-solid fa-plus"></i> Set up the drinks menu</router-link>
            <router-link v-else to="/inventory" class="ui-btn ui-btn--primary" style="margin-top: 12px"><i class="fa-solid fa-plus"></i> Add products in Inventory</router-link>
          </div>

          <template v-else>
            <!-- Quick picks: this person's favourites at this bar, then top sellers -->
            <div v-if="showPicks" class="picks" data-testid="quick-picks">
              <div class="picks__head">
                <h3>{{ picksTitle }}</h3>
                <span class="muted hide-xs">{{ picksSub }}</span>
                <button v-if="lastSale && !cart.length" type="button" class="ui-btn ui-btn--sm picks__repeat" data-testid="repeat-last" :title="`Add the ${lastSale.count} items of your last sale again`" @click="repeatLast">
                  <i class="fa-solid fa-rotate-right"></i> Repeat<span class="hide-phone"> last sale</span>
                </button>
              </div>
              <div class="picks__row">
                <button
                  v-for="k in picks"
                  :key="k.product.id"
                  type="button"
                  class="pick"
                  :class="{ 'in-cart': qtyInCart(k.product.id), 'is-out': available(k.product) <= 0 }"
                  :disabled="available(k.product) <= 0"
                  :data-pick="k.product.name"
                  :aria-label="`Add ${k.product.name}, ${money(k.product.selling_price)}`"
                  @click="addProduct(k.product)"
                >
                  <span v-if="qtyInCart(k.product.id)" class="pick__qty">{{ qtyInCart(k.product.id) }}</span>
                  <span class="pick__name">{{ k.product.name }}</span>
                  <span class="pick__price">{{ money(k.product.selling_price) }}</span>
                </button>
              </div>
            </div>
            <div v-else-if="lastSale && !cart.length && !query" class="picks picks--bare">
              <button type="button" class="ui-btn ui-btn--sm picks__repeat" data-testid="repeat-last" @click="repeatLast"><i class="fa-solid fa-rotate-right"></i> Repeat last sale</button>
            </div>

            <div v-if="!filtered.length" class="ui-empty">
              <div class="ui-empty__icon"><i class="fa-solid fa-magnifying-glass"></i></div>
              <h3>No matching products</h3>
              <p>Nothing matches “{{ query || activeCat }}”.</p>
              <div class="empty-actions">
                <button class="ui-btn" @click="resetFilters">Clear filters</button>
                <button v-if="isManager && /^\d{6,14}$/.test(query.trim())" class="ui-btn ui-btn--primary" @click="openLink(query.trim())"><i class="fa-solid fa-link"></i> Link this barcode</button>
              </div>
            </div>

            <template v-else>
              <h3 v-if="showPicks" class="all-head">All products <span class="muted">{{ filtered.length }}</span></h3>
              <div class="grid">
                <button
                  v-for="p in visibleProducts"
                  :key="p.id"
                  class="tile"
                  :class="{ 'is-out': available(p) <= 0, 'in-cart': qtyInCart(p.id) }"
                  :disabled="available(p) <= 0"
                  :aria-label="`Add ${p.name}, ${money(p.selling_price)}${available(p) <= 0 ? ', out of stock' : ''}`"
                  :data-product="p.name"
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
              <div v-if="filtered.length > visibleProducts.length" ref="more" class="grid-more">
                <button type="button" class="ui-btn" @click="showMore">Show more ({{ filtered.length - visibleProducts.length }})</button>
              </div>
            </template>
          </template>
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
            <button v-if="lastSale" type="button" class="ui-btn ui-btn--sm" data-testid="repeat-last-cart" @click="repeatLast"><i class="fa-solid fa-rotate-right"></i> Repeat last sale · {{ lastSale.count }} item{{ lastSale.count === 1 ? '' : 's' }}</button>
          </div>
          <div v-for="(l, i) in cart" :key="l.product_id" class="line">
            <div class="line__main">
              <div class="line__name">{{ l.name }}</div>
              <div class="line__meta">{{ money(l.price) }} each<span v-if="!l.bar && l.qty >= l.stock" class="warn"> · max stock</span></div>
            </div>
            <div class="stepper">
              <button :aria-label="`Decrease ${l.name}`" @click="setQty(i, l.qty - 1)"><i class="fa-solid fa-minus"></i></button>
              <input :value="l.qty" type="number" min="1" :max="l.bar ? undefined : l.stock" inputmode="numeric" :aria-label="`${l.name} quantity`" @change="setQty(i, $event.target.value)" @focus="$event.target.select()" />
              <button :aria-label="`Increase ${l.name}`" :disabled="!l.bar && l.qty >= l.stock" @click="setQty(i, l.qty + 1)"><i class="fa-solid fa-plus"></i></button>
            </div>
            <div class="line__total">{{ money(lineTotal(l)) }}</div>
            <button class="ui-btn ui-btn--ghost ui-btn--icon ui-btn--sm line__remove" :aria-label="`Remove ${l.name}`" @click="cart.splice(i, 1)"><i class="fa-solid fa-xmark"></i></button>
          </div>
        </div>

        <!-- Adjustments & totals -->
        <div class="cart__foot">
          <button type="button" class="adjust-toggle" :aria-expanded="adjustOpen" @click="adjustOpen = !adjustOpen">
            <span>Discount &amp; tax</span>
            <span class="muted">{{ discountAmount > 0 ? `−${money(discountAmount)}` : taxRate ? taxName : 'None' }}</span>
            <i :class="adjustOpen ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'"></i>
          </button>
          <div class="adjust" :class="{ 'is-open': adjustOpen }">
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

          <div class="paybar" role="group" aria-label="Take payment">
            <button v-for="m in payButtons" :key="m.mode" type="button" class="paybar__btn" :data-pay="m.mode" :disabled="!cart.length || total < 0" @click="openPayment(m.mode)">
              <i :class="m.icon"></i><span>{{ m.label }}</span>
            </button>
          </div>
          <button class="charge" :disabled="!cart.length || total < 0" @click="openPayment()">
            <span>Charge</span>
            <strong>{{ money(total) }}</strong>
          </button>
          <div class="hint hide-sm"><kbd class="kbd">F9</kbd> charge · <kbd class="kbd">/</kbd> search · <kbd class="kbd">Enter</kbd> add scanned code · handheld scanners work anywhere</div>
        </div>
      </aside>
    </div>

    <!-- what a handheld scanner just added (a quiet chip, never over the Pay button) -->
    <transition name="pos-flash">
      <div v-if="flash" :key="flash.key" class="pos-flash" :class="{ 'is-warn': !flash.ok }" role="status" data-testid="pos-flash">
        <i :class="flash.ok ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-exclamation'"></i> {{ flash.text }}
      </div>
    </transition>

    <!-- Phone / tablet dock: scan, the sale's total (opens the cart), pay -->
    <div v-if="!cartOpen" class="cart-dock">
      <button type="button" class="dock-scan" aria-label="Scan barcodes" data-testid="dock-scan" @click="openScanner"><i class="fa-solid fa-barcode"></i></button>
      <button class="cart-bar" @click="cartOpen = true">
        <span><i class="fa-solid fa-cart-shopping"></i> {{ itemCount }}<span class="cart-bar__word"> item{{ itemCount === 1 ? '' : 's' }}</span></span>
        <strong>{{ money(total) }} <i class="fa-solid fa-chevron-up"></i></strong>
      </button>
      <button v-if="cart.length" type="button" class="dock-pay" data-testid="dock-pay" :disabled="total < 0" @click="openPayment()">Pay</button>
    </div>

    <PaymentModal v-if="showPay" :total="total" :currency="currency" :busy="paying" :error="payError" :initial-mode="payMode" @close="showPay = false" @confirm="completeSale" />
    <ReceiptModal v-if="receipt" :transaction="receipt" :organization="organization" :currency="currency" after-sale @close="receipt = null" @new-sale="newSale" @photo="photoFor = receipt" />
    <CashDrawerModal v-if="showDrawer" :drawer="drawer" :currency="currency" :busy="drawerBusy" @close="showDrawer = false" @open="openDrawer" @close-drawer="closeDrawer" />
    <ParkedSalesModal v-if="showParked" :sales="parked" :currency="currency" @close="showParked = false" @resume="resumeParked" @discard="discardParked" />
    <BarcodeScanner v-if="scanning" continuous title="Scan to sell" :feedback="onCameraCode" @close="closeScanner" />
    <LinkBarcodeSheet v-if="linkCode" :code="linkCode" :index="index" :currency="currency" :can-manage="isManager" :bar-mode="barMode" @close="linkCode = ''" @linked="onLinked" @created="onCreated" @search="linkSearchInstead" />
    <SalePhotoSheet v-if="photoFor" :transaction="photoFor" :currency="currency" @close="photoFor = null" @saved="onPhotoSaved" />

    <div v-if="deviceEdit" class="ui-modal-backdrop" @mousedown.self="deviceEdit = false">
      <form class="ui-modal" style="max-width: 440px" role="dialog" aria-modal="true" aria-labelledby="dev-title" data-testid="device-name" @submit.prevent="saveDevice">
        <div class="ui-modal__head">
          <h2 id="dev-title">Name this device</h2>
          <button type="button" class="ui-btn ui-btn--ghost ui-btn--icon ui-btn--sm" aria-label="Close" @click="deviceEdit = false"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="ui-modal__body">
          <p class="ui-hint" style="margin-top: 0">Every sale from this phone or computer is tagged with this name, so owners can see which device sold what.</p>
          <div class="ui-field">
            <label for="dev-name">Device name</label>
            <input id="dev-name" ref="deviceInput" v-model="deviceDraft" class="ui-input" maxlength="60" required placeholder="e.g. Brian’s phone, Front till" data-testid="device-input" />
          </div>
          <div class="dev-suggest">
            <button v-for="s in deviceSuggestions" :key="s" type="button" class="chip chip--sm" @click="deviceDraft = s">{{ s }}</button>
          </div>
        </div>
        <div class="ui-modal__foot">
          <button type="button" class="ui-btn" @click="deviceEdit = false">Cancel</button>
          <button type="submit" class="ui-btn ui-btn--primary" :disabled="!deviceDraft.trim()" data-testid="device-save">Save</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import { markRaw } from 'vue'
import { orgCurrency } from '@/utils/orgDefaults'
import PaymentModal from '@/components/pos/PaymentModal.vue'
import ReceiptModal from '@/components/pos/ReceiptModal.vue'
import CashDrawerModal from '@/components/pos/CashDrawerModal.vue'
import ParkedSalesModal from '@/components/pos/ParkedSalesModal.vue'
import LinkBarcodeSheet from '@/components/pos/LinkBarcodeSheet.vue'
import SalePhotoSheet from '@/components/pos/SalePhotoSheet.vue'
import BarcodeScanner from '@/components/bar/BarcodeScanner.vue'
import { posService, personName, mobileMoneyLabel } from '@/services/posService'
import { apiErrorMessage } from '@/services/api'
import { formatMoney } from '@/utils/format'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'
import { barApi } from '@/services/bar'
import { hasModule } from '@/composables/useEntitlements'
import { hasFeature, atLeast } from '@/composables/useAccess'
import { useAuthStore } from '@/stores/auth'
import { devicePosLocation, setDevicePosLocation } from '@/components/bar/barContext'
import { buildIndex, lookupCode, searchIndex, WedgeDetector, mergePicks, newRef } from '@/utils/posFast'
import { posDevice, setPosDeviceLabel, defaultDeviceLabel } from '@/utils/posDevice'

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100
const LS_CURRENT = 'pos.current.v1'
const LS_PARKED = 'pos.parked.v1'
const LS_TAX = 'pos.tax.v1'
const LS_CATALOG = 'pos.catalog.v1'
const LS_PICKS = 'pos.picks.v1'
const LS_LAST = 'pos.last.v1'
const PAGE = 120

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
const isField = (el) => !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && el.type !== 'checkbox' && el.type !== 'radio'
// the on-screen keyboard: don't pop it up on touch phones / tablets by focusing the search
const touchSmall = () => typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width: 1023px) and (pointer: coarse)').matches
// what a till keeps of a product offline (search + prices)
const slim = (p) => ({ id: p.id, name: p.name, sku: p.sku, barcode: p.barcode, selling_price: p.selling_price, current_stock: p.current_stock, min_stock: p.min_stock, is_active: p.is_active, category: p.category ? { name: p.category.name } : null })

export default {
  name: 'POS',
  components: { PaymentModal, ReceiptModal, CashDrawerModal, ParkedSalesModal, LinkBarcodeSheet, SalePhotoSheet, BarcodeScanner },
  data() {
    const current = readLS(LS_CURRENT, {})
    const tax = readLS(LS_TAX, {})
    return {
      products: [],
      index: null,
      loading: false,
      loadError: '',
      offlineAt: '',
      query: '',
      // the query the catalogue is filtered by: follows `query` after a short pause, so fast typing
      // (and handheld scanners typing into the box) never re-renders 1000+ products per key
      searchQ: '',
      activeCat: '',
      hideOutOfStock: false,
      limit: PAGE,

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
      adjustOpen: false,

      drawer: null,
      drawerLoading: false,
      drawerBusy: false,
      showDrawer: false,

      parked: readLS(LS_PARKED, []),
      showParked: false,

      showPay: false,
      payMode: 'cash',
      paying: false,
      payError: '',
      clientRef: '',
      receipt: null,
      organization: null,
      cartOpen: false,

      // fast sale on any device
      picksRaw: [],
      picksMine: 0,
      lastSale: null,
      scanning: false,
      linkCode: '',
      photoFor: null,
      device: null,
      deviceEdit: false,
      deviceDraft: '',
      flash: null,
      narrow: false,

      // Bar stock (clubs): the bar this device sells from and what it can make
      barLocs: [],
      barLoc: '',
      barAvail: {},
      barIngredients: {},
      barAvailTimer: null,
      barChecked: false
    }
  },
  computed: {
    me() {
      try {
        return useAuthStore().user || {}
      } catch {
        return {}
      }
    },
    orgKey() {
      return this.me.organization_id || 'org'
    },
    isManager() {
      return atLeast('manager')
    },
    // Bar stock is set up: drinks sell from a bar and use its stock (pkg/barstock).
    barMode() {
      return this.barLocs.length > 0
    },
    clubType() {
      return hasFeature('bar_stock')
    },
    // The organisation's home currency (Settings → Business details).
    currency() {
      return orgCurrency()
    },
    // Bar stock items without a selling price are ingredients (mint, cordial, a spirit's stock bottle): not sold as they are.
    posProducts() {
      return this.products.filter((p) => !(this.barIngredients[p.id] && !(Number(p.selling_price) > 0)))
    },
    byId() {
      return markRaw(new Map(this.posProducts.map((p) => [p.id, p])))
    },
    categories() {
      const map = new Map()
      for (const p of this.posProducts) {
        const n = p.category?.name || 'Uncategorised'
        map.set(n, (map.get(n) || 0) + 1)
      }
      return [...map.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name))
    },
    filtered() {
      const sellable = this.byId
      const cat = this.activeCat
      const filter = (p) => {
        if (!sellable.has(p.id)) return false
        if (cat && (p.category?.name || 'Uncategorised') !== cat) return false
        if (this.hideOutOfStock && this.available(p) <= 0 && !this.qtyInCart(p.id)) return false
        return true
      }
      // the index ranks name / SKU / barcode matches; without a query the catalogue keeps its order
      return searchIndex(this.index, this.searchQ, { filter })
    },
    visibleProducts() {
      return this.filtered.length > this.limit ? this.filtered.slice(0, this.limit) : this.filtered
    },
    picks() {
      // in stock (or poured from bar stock); a pick stays put while its last units go into the cart
      return mergePicks(this.picksRaw, this.byId, { limit: 12, sellable: (p) => (Number(p.current_stock) || 0) > 0 || this.isBarManaged(p) })
    },
    showPicks() {
      return !this.searchQ.trim() && !this.activeCat && this.picks.length > 0
    },
    picksTitle() {
      return this.picksMine > 0 ? 'Your favourites' : 'Top sellers'
    },
    picksSub() {
      const where = this.barMode ? ` at ${this.barLocs.find((l) => l.id === this.barLoc)?.name || 'this bar'}` : ''
      return this.picksMine > 0 ? `What you sell most${where}, last 30 days` : `Best sellers${where}, last 30 days`
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
    payButtons() {
      return [
        { mode: 'cash', label: 'Cash', icon: 'fa-solid fa-money-bill-wave' },
        { mode: 'mobile', label: mobileMoneyLabel(this.currency, true), icon: 'fa-solid fa-mobile-screen-button' },
        { mode: 'card', label: 'Card', icon: 'fa-regular fa-credit-card' },
        { mode: 'split', label: 'Split', icon: 'fa-solid fa-code-fork' }
      ]
    },
    moreItems() {
      return [
        { label: `This device: ${this.device?.label || '—'}`, icon: 'fa-solid fa-mobile-screen', onClick: () => this.openDevice() },
        { divider: true },
        { label: `Parked sales${this.parked.length ? ` (${this.parked.length})` : ''}`, icon: 'fa-regular fa-clock', onClick: () => (this.showParked = true) },
        { label: 'Repeat last sale', icon: 'fa-solid fa-rotate-right', disabled: !this.lastSale, onClick: () => this.repeatLast() },
        { label: 'Transactions', icon: 'fa-solid fa-receipt', to: '/pos-transactions' },
        { label: 'Sales by person & device', icon: 'fa-solid fa-users', to: '/pos-transactions?view=people', hidden: !this.isManager }
      ]
    },
    deviceSuggestions() {
      const first = this.me.first_name || ''
      return [...new Set([defaultDeviceLabel(first), first ? `${first}'s phone` : 'Bar phone', 'Front till', 'Bar phone'])].filter((s) => s !== this.deviceDraft).slice(0, 4)
    },
    anyModal() {
      return this.showPay || !!this.receipt || this.showDrawer || this.showParked || this.scanning || !!this.linkCode || !!this.photoFor || this.deviceEdit
    }
  },
  watch: {
    barLoc(id, old) {
      if (!id) return
      setDevicePosLocation(id)
      if (old !== undefined) {
        this.loadAvailability()
        if (old) this.loadPicks()
      }
    },
    query(v) {
      clearTimeout(this.searchTimer)
      // clearing is instant; typing waits for a pause (a scanner's whole code arrives within it)
      if (!v.trim()) this.applySearch()
      else this.searchTimer = setTimeout(() => this.applySearch(), this.products.length > 300 ? 140 : 60)
    },
    activeCat() {
      this.limit = PAGE
    },
    cart: { handler: 'persist', deep: true },
    customer: 'persist',
    discountMode: 'persist',
    discountValue: 'persist',
    taxRateId() {
      this.persistTax()
    },
    taxInclusive() {
      this.persistTax()
    },
    visibleProducts() {
      this.$nextTick(() => this.observeMore())
    }
  },
  created() {
    this.wedge = new WedgeDetector()
    this.device = posDevice(this.me.first_name)
    this.loadProducts()
    this.loadDrawer()
    this.loadSettings()
    this.loadBar().then(() => this.loadPicks())
    this.loadLastSale()
    posService
      .organization()
      .then((o) => (this.organization = o))
      .catch(() => {})
  },
  mounted() {
    // phones / tablets: the dock takes the place of the app's bottom navigation, so toasts, menus
    // opened as bottom sheets and the page padding stay above it (they all follow --bottom-nav-h)
    if (window.matchMedia) {
      this.dockMq = window.matchMedia('(max-width: 1023px)')
      this.narrowMq = window.matchMedia('(max-width: 480px)')
      this.applyDockSpace()
      this.dockMq.addEventListener?.('change', this.applyDockSpace)
      this.narrowMq.addEventListener?.('change', this.applyDockSpace)
    }
    document.addEventListener('keydown', this.onWedgeKey, true)
    document.addEventListener('keydown', this.onKey)
    document.addEventListener('mousedown', this.onDocClick)
    this.$nextTick(() => this.focusScan())
  },
  beforeUnmount() {
    this.dockMq?.removeEventListener?.('change', this.applyDockSpace)
    this.narrowMq?.removeEventListener?.('change', this.applyDockSpace)
    document.documentElement.style.removeProperty('--bottom-nav-h')
    document.removeEventListener('keydown', this.onWedgeKey, true)
    document.removeEventListener('keydown', this.onKey)
    document.removeEventListener('mousedown', this.onDocClick)
    clearTimeout(this.customerTimer)
    clearTimeout(this.picksTimer)
    clearTimeout(this.searchTimer)
    clearTimeout(this.flashTimer)
    clearTimeout(this.refreshTimer)
    clearInterval(this.barAvailTimer)
    this.moreObserver?.disconnect()
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
    setProducts(list) {
      // the catalogue is read-only here: keep 1000+ products out of Vue's deep reactivity
      this.products = markRaw(list.filter((p) => p.is_active !== false).map((p) => markRaw(p)))
      this.index = markRaw(buildIndex(this.products))
    },
    async loadProducts() {
      const key = `${LS_CATALOG}:${this.orgKey}`
      if (!this.products.length) {
        const cached = readLS(key, null)
        if (cached && Array.isArray(cached.products) && cached.products.length) {
          this.setProducts(cached.products)
          this.cachedAt = cached.at
        }
      }
      this.loading = true
      this.loadError = ''
      try {
        const list = await posService.products()
        this.lastRefresh = Date.now()
        this.setProducts(list)
        this.offlineAt = ''
        writeLS(key, { at: new Date().toISOString(), products: this.products.map(slim) })
        this.syncCartWithStock()
      } catch (e) {
        if (this.products.length && (!e?.response || e.response.status >= 500)) {
          // offline (or the server is down): keep selling from the saved catalogue
          const at = this.cachedAt ? new Date(this.cachedAt) : null
          this.offlineAt = at ? at.toLocaleString([], { hour: 'numeric', minute: '2-digit', day: 'numeric', month: 'short' }) : 'an earlier visit'
        } else this.loadError = apiErrorMessage(e, 'Could not load products')
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
          // Bar drinks are not capped by product stock (also while the bar's menu is still loading)
          if (this.isBarManaged(p) || (l.bar && !this.barChecked)) return { ...l, name: p.name, sku: p.sku, price: Number(p.selling_price) || 0, stock: p.current_stock, bar: true }
          return { ...l, name: p.name, sku: p.sku, price: Number(p.selling_price) || 0, stock: p.current_stock, qty: Math.min(l.qty, Math.max(p.current_stock, 0)), bar: false }
        })
        .filter((l) => l.qty > 0)
    },
    persist() {
      writeLS(LS_CURRENT, { cart: this.cart, customer: this.customer, discountMode: this.discountMode, discountValue: this.discountValue })
    },
    persistTax() {
      writeLS(LS_TAX, { id: this.taxRateId, inclusive: this.taxInclusive })
    },

    // ---------- quick picks & repeat ----------
    picksKey() {
      return `${LS_PICKS}:${this.me.id || ''}:${this.barLoc || ''}`
    },
    async loadPicks() {
      try {
        const res = await posService.quickPicks(this.barMode ? this.barLoc : '', 12)
        this.picksRaw = res.picks || []
        this.picksMine = res.mine || 0
        writeLS(this.picksKey(), { picks: this.picksRaw, mine: this.picksMine })
      } catch {
        const c = readLS(this.picksKey(), null)
        if (c) {
          this.picksRaw = c.picks || []
          this.picksMine = c.mine || 0
        }
      }
    },
    lastKey() {
      return `${LS_LAST}:${this.me.id || ''}`
    },
    async loadLastSale() {
      const local = readLS(this.lastKey(), null)
      if (local && Array.isArray(local.lines) && local.lines.length) {
        this.lastSale = local
        return
      }
      if (!this.me.id) return
      try {
        const data = await posService.listTransactions({ cashier_id: this.me.id, status: 'completed', limit: 1 })
        const t = data.transactions[0]
        if (t) this.rememberSale(t, false)
      } catch {
        /* optional */
      }
    },
    rememberSale(t, save = true) {
      const lines = (t.items || []).filter((i) => i.product_id).map((i) => ({ product_id: i.product_id, name: i.item_name, qty: i.quantity }))
      if (!lines.length) return
      this.lastSale = { number: t.transaction_number, at: t.created_at, total: t.total_amount, lines, count: lines.reduce((n, l) => n + l.qty, 0) }
      if (save) writeLS(this.lastKey(), this.lastSale)
    },
    repeatLast() {
      const s = this.lastSale
      if (!s) return
      let added = 0
      const missing = []
      for (const l of s.lines) {
        const p = this.byId.get(l.product_id)
        if (!p) {
          missing.push(l.name)
          continue
        }
        if (this.addProduct(p, l.qty, { quiet: true })) added += l.qty
        else missing.push(l.name)
      }
      if (added) toast.success(`Last sale added again: ${added} item${added === 1 ? '' : 's'}`)
      if (missing.length) toast.warning(`Not available now: ${missing.join(', ')}`)
    },

    // ---------- catalogue ----------
    qtyInCart(id) {
      return this.cart.find((l) => l.product_id === id)?.qty || 0
    },
    available(p) {
      // Bar-managed drinks are never out: the sale is recorded even when the bar shows no stock.
      if (this.isBarManaged(p)) return Infinity
      return (Number(p.current_stock) || 0) - this.qtyInCart(p.id)
    },
    stockClass(p) {
      if (this.isBarManaged(p)) {
        const a = this.barAvail[p.id]
        return a.available === null || a.available === undefined ? '' : a.available - this.qtyInCart(p.id) <= 0 ? 'is-bar-out' : a.low ? 'is-low' : ''
      }
      const s = Number(p.current_stock) || 0
      if (s <= 0) return 'is-out'
      if (s <= Math.max(5, p.min_stock || 0)) return 'is-low'
      return ''
    },
    stockLabel(p) {
      if (this.isBarManaged(p)) return this.barLabel(p)
      const s = Number(p.current_stock) || 0
      if (s <= 0) return 'Out of stock'
      return `${s} in stock`
    },
    showMore() {
      this.limit += PAGE
    },
    applySearch() {
      clearTimeout(this.searchTimer)
      if (this.searchQ !== this.query) {
        this.searchQ = this.query
        this.limit = PAGE
      }
    },
    observeMore() {
      const el = this.$refs.more
      if (!el || typeof IntersectionObserver === 'undefined') return
      if (!this.moreObserver) {
        this.moreObserver = new IntersectionObserver((entries) => {
          if (entries.some((e) => e.isIntersecting)) this.showMore()
        }, { rootMargin: '400px 0px' })
      }
      this.moreObserver.disconnect()
      this.moreObserver.observe(el)
    },
    resetFilters() {
      this.query = ''
      this.activeCat = ''
      this.focusScan()
    },
    focusScan() {
      if (touchSmall()) return
      this.$refs.scan?.focus()
    },
    addProduct(p, qty = 1, { quiet = false } = {}) {
      const stock = Number(p.current_stock) || 0
      const line = this.cart.find((l) => l.product_id === p.id)
      const have = line?.qty || 0
      if (this.isBarManaged(p)) {
        if (line) {
          line.qty += qty
          line.bar = true
          this.cart.splice(this.cart.indexOf(line), 1)
          this.cart.unshift(line)
        } else {
          this.cart.unshift({ product_id: p.id, name: p.name, sku: p.sku, price: Number(p.selling_price) || 0, qty, stock, bar: true })
        }
        return true
      }
      if (stock <= 0) {
        if (!quiet) toast.warning(`${p.name} is out of stock`)
        return false
      }
      if (have + qty > stock) {
        if (!quiet) toast.warning(`Only ${stock} × ${p.name} in stock`)
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
    /** The sellable product for a scanned / typed code (any barcode spelling, or SKU). */
    productForCode(code) {
      const p = lookupCode(this.index, code)
      return p && this.byId.has(p.id) ? p : null
    },
    /**
     * A code from the camera, a Bluetooth / USB scanner or the search box.
     * Known → added (result for the scanner's toast); unknown → "Link this barcode".
     */
    handleCode(raw, source) {
      let code = String(raw || '').trim()
      if (!code) return { ok: false, text: '' }
      let qty = 1
      const m = source !== 'camera' && code.match(/^(\d{1,3})\s*[*x×]\s*(.+)$/i)
      if (m) {
        qty = Math.max(1, parseInt(m[1], 10))
        code = m[2].trim()
      }
      const p = this.productForCode(code)
      if (p) {
        if (!this.addProduct(p, qty, { quiet: source === 'wedge' })) {
          if (source === 'wedge') this.showFlash(`${p.name} is out of stock`, false)
          return { ok: false, text: `${p.name} is out of stock` }
        }
        const n = this.qtyInCart(p.id)
        if (source === 'wedge') this.showFlash(`${p.name} · ${n} in cart`)
        return { ok: true, text: `${p.name} · ${n} in cart` }
      }
      this.openLink(code)
      return { ok: false, text: 'Unknown barcode', stop: true }
    },
    applyDockSpace() {
      this.narrow = !!this.narrowMq?.matches
      const root = document.documentElement
      if (this.dockMq?.matches) root.style.setProperty('--bottom-nav-h', '70px')
      else root.style.removeProperty('--bottom-nav-h')
    },
    showFlash(text, ok = true) {
      clearTimeout(this.flashTimer)
      this.flash = { text, ok, key: Date.now() }
      this.flashTimer = setTimeout(() => (this.flash = null), 1800)
    },
    onCameraCode(code) {
      return this.handleCode(code, 'camera')
    },
    openScanner() {
      this.cartOpen = false
      this.scanning = true
    },
    closeScanner() {
      this.scanning = false
      this.$nextTick(() => this.focusScan())
    },
    openLink(code) {
      this.scanning = false
      this.cartOpen = false
      this.linkCode = code
    },
    onLinked(p) {
      this.linkCode = ''
      const prod = this.byId.get(p.id)
      if (prod) {
        // the catalogue knows the new barcode at once (and the cached copy after the next refresh)
        const updated = markRaw({ ...prod, barcode: p.barcode })
        this.setProducts(this.products.map((x) => (x.id === p.id ? updated : x)))
        this.addProduct(updated)
      }
      toast.success(`Barcode saved on ${p.name}${prod ? ' — added to the sale' : ''}`)
      this.loadProducts()
    },
    onCreated(p) {
      this.linkCode = ''
      this.setProducts([markRaw(p), ...this.products.filter((x) => x.id !== p.id)])
      if (this.addProduct(p)) toast.success(`${p.name} created and added to the sale`)
      else toast.success(`${p.name} created`)
      this.loadProducts()
    },
    linkSearchInstead() {
      this.linkCode = ''
      this.query = ''
      this.$nextTick(() => this.$refs.scan?.focus())
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
      let p = this.productForCode(raw)
      if (!p) {
        this.applySearch()
        if (this.filtered.length === 1) p = this.filtered[0]
      }
      if (!p) {
        // a typed / scanned number nobody has: offer to link it
        if (/^\d{8,14}$/.test(raw)) {
          this.query = ''
          this.openLink(raw)
          return
        }
        toast.error(`No product matches “${raw}”`)
        this.$refs.scan?.select()
        return
      }
      if (this.addProduct(p, qty)) this.query = ''
      else this.$refs.scan?.select()
    },
    /**
     * Bluetooth / USB barcode scanners ("keyboard wedge") type fast and press
     * Enter; they work anywhere on the till, whatever has the focus.
     */
    onWedgeKey(e) {
      const blocking = this.showPay || !!this.receipt || this.showDrawer || this.showParked || !!this.linkCode || !!this.photoFor || this.deviceEdit
      if (blocking || e.isComposing || e.ctrlKey || e.metaKey || e.altKey) {
        this.wedge.reset()
        return
      }
      if (e.key !== 'Enter' && e.key && e.key.length === 1 && !this.wedge.pending) {
        this.wedgeFrom = isField(e.target) ? { el: e.target, value: e.target.value } : null
      }
      const r = this.wedge.key(e.key, e.timeStamp || performance.now())
      if (!r || !r.code) return
      e.preventDefault()
      e.stopPropagation()
      const from = this.wedgeFrom
      this.wedgeFrom = null
      if (from && from.el.value !== from.value) {
        // put back what the field held before the scanner typed into it
        from.el.value = from.value
        from.el.dispatchEvent(new Event('input', { bubbles: true }))
      }
      this.handleCode(r.code, 'wedge')
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
      if (!l.bar && q > l.stock) {
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
      this.clientRef = ''
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
      this.cartOpen = false
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
    openPayment(mode = 'cash') {
      if (!this.cart.length) {
        toast.info('Add something to the cart first')
        return
      }
      this.payError = ''
      this.payMode = mode
      this.cartOpen = false
      this.showPay = true
    },
    async completeSale(payments) {
      this.paying = true
      this.payError = ''
      // one key per sale attempt: a retry after a lost response returns the sale already recorded
      if (!this.clientRef) this.clientRef = newRef('sale')
      try {
        const payload = {
          items: this.cart.map((l) => ({ product_id: l.product_id, quantity: l.qty })),
          payments,
          customer_id: this.customer?.id || null,
          cash_drawer_id: this.drawer?.id || null,
          tax_rate: this.taxRate,
          tax_inclusive: !!this.taxRate && this.taxInclusive,
          device_id: this.device?.id || '',
          device_label: this.device?.label || '',
          client_ref: this.clientRef
        }
        if (this.barMode && this.barLoc) payload.location_id = this.barLoc
        if (this.discountMode === 'percent' && this.discountAmount > 0) payload.discount_percent = Number(this.discountValue)
        else if (this.discountMode === 'amount' && this.discountAmount > 0) payload.discount_amount = this.discountAmount
        const txn = await posService.createTransaction(payload)
        this.showPay = false
        this.receipt = txn
        if (txn.duplicate) toast.info('This sale was already recorded — showing it')
        this.rememberSale(txn)
        this.applySold(this.cart)
        this.resetSale()
        this.scheduleRefresh()
        this.loadDrawer()
        if (this.barMode) this.loadAvailability()
        clearTimeout(this.picksTimer)
        this.picksTimer = setTimeout(() => this.loadPicks(), 1500)
      } catch (e) {
        this.payError = apiErrorMessage(e, 'The sale could not be completed')
        // the server answered "no": nothing was recorded, so the next attempt is a new sale
        if (e?.response && e.response.status < 500) this.clientRef = ''
        if (e?.response?.status === 409) this.loadProducts()
      } finally {
        this.paying = false
      }
    },
    /** Take what was just sold off the local stock figures at once (the server has the real numbers). */
    applySold(lines) {
      const sold = new Map(lines.filter((l) => !l.bar).map((l) => [l.product_id, l.qty]))
      if (!sold.size) return
      this.setProducts(this.products.map((p) => (sold.has(p.id) ? { ...p, current_stock: (Number(p.current_stock) || 0) - sold.get(p.id) } : p)))
    },
    /** Refresh the catalogue in the background, at most every 20 s while selling (1000+ products is a big download on a phone). */
    scheduleRefresh() {
      if (this.refreshTimer) return
      const wait = Math.max(0, 20000 - (Date.now() - (this.lastRefresh || 0)))
      this.refreshTimer = setTimeout(() => {
        this.refreshTimer = null
        this.lastRefresh = Date.now()
        this.loadProducts()
      }, wait)
    },
    newSale() {
      this.receipt = null
      this.$nextTick(() => this.focusScan())
    },
    onPhotoSaved() {
      if (this.receipt && this.photoFor && this.receipt.id === this.photoFor.id) this.receipt = { ...this.receipt, photo_count: (this.receipt.photo_count || 0) + 1 }
      this.photoFor = null
    },

    // ---------- this device ----------
    openDevice() {
      this.deviceDraft = this.device?.label || ''
      this.deviceEdit = true
      this.$nextTick(() => this.$refs.deviceInput?.select())
    },
    saveDevice() {
      if (!this.deviceDraft.trim()) return
      this.device = setPosDeviceLabel(this.deviceDraft)
      this.deviceEdit = false
      toast.success(`Sales from this device now show “${this.device.label}”`)
    },

    // ---------- bar stock ----------
    async loadBar() {
      // Only organisations with bar locations (clubs, bars, lounges) sell from a bar.
      if (!hasModule('inventory')) {
        this.barChecked = true
        return
      }
      try {
        let locs = null
        try {
          locs = await barApi.locations()
        } catch {
          locs = null
        }
        if (locs === null) {
          // No stock permission (e.g. a cashier): the default bar's menu, so drinks are never blocked.
          const d = await barApi.posAvailability('')
          this.barAvail = Object.fromEntries((d?.items || []).map((x) => [x.product_id, x]))
          return
        }
        const sellable = locs.filter((l) => l.is_active !== false && l.type !== 'store')
        if (!sellable.length) return
        const terms = await barApi.terminals().catch(() => [])
        const saved = devicePosLocation()
        const mapped = (terms || []).find((t) => t.terminal_id === 'main')?.location_id
        const def = sellable.find((l) => l.is_default_bar)?.id
        this.barLocs = sellable
        this.barLoc = [saved, mapped, def, sellable[0].id].find((id) => id && sellable.some((l) => l.id === id))
        const items = await barApi.items().catch(() => [])
        this.barIngredients = Object.fromEntries(items.map((it) => [it.product_id, true]))
        await this.loadAvailability()
        this.barAvailTimer = setInterval(() => this.loadAvailability(), 60000)
      } catch {
        /* bar stock is optional for the POS */
      } finally {
        this.barChecked = true
        if (this.products.length) this.syncCartWithStock()
      }
    },
    async loadAvailability() {
      if (!this.barLoc) return
      try {
        const d = await barApi.posAvailability(this.barLoc)
        this.barAvail = Object.fromEntries((d?.items || []).map((x) => [x.product_id, x]))
        this.syncCartWithStock()
      } catch {
        /* availability is a hint only */
      }
    },
    isBarManaged(p) {
      return !!(p && this.barAvail[p.id])
    },
    barLabel(p) {
      const a = this.barAvail[p.id]
      if (a.available === null || a.available === undefined) return ''
      const left = a.available - this.qtyInCart(p.id)
      const where = this.barLocs.find((l) => l.id === this.barLoc)?.name || 'the bar'
      if (left <= 0) return `0 at ${where}`
      const unit = a.unit_label || 'serving'
      const label = left === 1 ? unit : /s$/.test(unit) ? unit : unit + 's'
      return a.low ? `low · ${left} ${label}` : `${left} ${label}`
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
/* Bar drinks never block: a quiet hint instead of "out of stock" */
.stock.is-bar-out {
  color: var(--text-3);
  font-style: italic;
}
.sell-from {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 4px 0 12px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface);
  color: var(--text-2);
  font-size: 13.5px;
  margin: 0;
}
.sell-from > i {
  color: var(--accent);
}
.sell-from > span {
  white-space: nowrap;
}
.sell-from .ui-select {
  height: 30px;
  min-width: 110px;
  padding-top: 2px;
  padding-bottom: 2px;
  padding-left: 4px;
  border: 0;
  border-radius: 999px;
  background-color: transparent;
  box-shadow: none;
  color: var(--text);
  font-weight: 600;
}
/* Bar availability hints ("0 at Main bar") may need their own line on narrow tiles */
.tile__foot {
  flex-wrap: wrap;
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
.customer__add {
  min-height: 44px;
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

@media (max-width: 640px) {
  .drawer-pill {
    min-height: 40px;
  }
}

/* ==========================================================================
   Fast sale on any device: scan button, quick picks, payment buttons, the
   phone / tablet dock and the phone-first layout (≤ 480 px).
   ========================================================================== */
.scan-cam {
  height: 44px;
  flex-shrink: 0;
  gap: 8px;
}
.scan-cam i {
  font-size: 16px;
}
.pos-offline {
  margin-bottom: 12px;
}
.picks {
  margin-bottom: 16px;
}
.picks--bare {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 10px;
}
.picks__head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 8px;
}
.picks__head h3,
.all-head {
  margin: 0;
  font-size: 13px;
  font-weight: 650;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--text-2);
}
.picks__head .muted {
  font-size: 12.5px;
}
.picks__repeat {
  margin-left: auto;
  white-space: nowrap;
}
.all-head {
  margin-bottom: 10px;
}
.all-head .muted {
  font-weight: 500;
}
.picks__row {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 8px;
}
.pick {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: space-between;
  gap: 4px;
  min-height: 64px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface-2);
  color: var(--text);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, transform 0.08s;
}
.pick:hover:not(:disabled) {
  border-color: var(--accent);
}
.pick:active:not(:disabled) {
  transform: scale(0.97);
}
.pick:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--accent-ring);
}
.pick.in-cart {
  border-color: var(--accent);
  background: var(--accent-soft);
}
.pick.is-out {
  opacity: 0.55;
  cursor: not-allowed;
}
.pick__name {
  font-weight: 600;
  font-size: 13.5px;
  line-height: 1.25;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  padding-right: 18px;
}
.pick__price {
  font-size: 13px;
  color: var(--text-2);
  font-variant-numeric: tabular-nums;
}
.pick__qty {
  position: absolute;
  top: 6px;
  right: 6px;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border-radius: 11px;
  display: grid;
  place-items: center;
  background: var(--accent);
  color: var(--accent-contrast);
  font-size: 11.5px;
  font-weight: 700;
}
.grid-more {
  display: flex;
  justify-content: center;
  padding: 16px 0 4px;
}
.empty-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 12px;
}
.cart-empty .ui-btn {
  margin-top: 4px;
}
.cart-empty .ui-btn i {
  font-size: inherit;
  opacity: 1;
}
.adjust-toggle {
  display: none;
}
.paybar {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
  margin-bottom: 8px;
}
.paybar__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 40px;
  padding: 0 6px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--text);
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
}
.paybar__btn i {
  color: var(--text-3);
}
.paybar__btn:hover:not(:disabled) {
  border-color: var(--accent);
  background: var(--accent-soft);
}
.paybar__btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.paybar__btn span {
  overflow: hidden;
  text-overflow: ellipsis;
}
.cart-dock {
  display: none;
}
.pos-flash {
  position: fixed;
  z-index: 1850;
  left: 50%;
  bottom: 24px;
  transform: translateX(-50%);
  max-width: min(420px, calc(100vw - 32px));
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 999px;
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-lg);
  font-size: 13.5px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
}
.pos-flash i {
  color: var(--success);
}
.pos-flash.is-warn i {
  color: var(--warning);
}
.pos-flash-enter-active,
.pos-flash-leave-active {
  transition: opacity 0.18s, transform 0.18s;
}
.pos-flash-enter-from,
.pos-flash-leave-to {
  opacity: 0;
  transform: translate(-50%, 6px);
}
.dev-suggest {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
:deep(.pos-more) {
  height: 40px;
  width: 40px;
}
@media (max-width: 1023px) {
  :deep(.pos-more) {
    height: 44px;
    width: 44px;
  }
}
/* the ⋯ menu (a bottom sheet on phones) above the dock and the floating "Getting started" pill */
.pos-head :deep(.ui-overflow__menu) {
  z-index: 1950;
}

@media (max-width: 1023px) {
  /* the dock replaces the old floating cart bar: Scan · items & total · Pay */
  .cart-dock {
    position: fixed;
    z-index: 1800;
    left: max(12px, env(safe-area-inset-left));
    right: max(12px, env(safe-area-inset-right));
    bottom: calc(12px + env(safe-area-inset-bottom));
    display: flex;
    gap: 8px;
  }
  .cart-dock .cart-bar {
    position: static;
    flex: 1;
    min-width: 0;
  }
  .dock-scan,
  .dock-pay {
    flex-shrink: 0;
    height: 54px;
    border: 0;
    border-radius: var(--radius);
    font: inherit;
    font-weight: 650;
    cursor: pointer;
    box-shadow: var(--shadow-lg);
  }
  .dock-scan {
    width: 58px;
    background: var(--surface);
    color: var(--text);
    border: 1px solid var(--border-strong);
    font-size: 20px;
  }
  .dock-pay {
    min-width: 76px;
    padding: 0 18px;
    background: var(--success);
    color: var(--surface);
    font-size: 16px;
  }
  .dock-pay:disabled {
    opacity: 0.5;
  }
  .cart-dock .cart-bar span,
  .cart-dock .cart-bar strong {
    white-space: nowrap;
  }

  .cart {
    padding-bottom: env(safe-area-inset-bottom);
  }
  .pos-flash {
    bottom: calc(78px + env(safe-area-inset-bottom));
  }
  .catalog {
    margin-bottom: 0; /* the page keeps room for the dock (--bottom-nav-h) */
  }
  /* search + Scan stay on screen while scrolling the catalogue */
  .catalog__bar {
    position: sticky;
    top: var(--topbar-h, 0px);
    z-index: 5;
    background: var(--surface);
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  }
}

/* ---------- phone-first (≤ 480 px): big targets, rows, one-handed ---------- */
@media (max-width: 480px) {
  .hide-phone {
    display: none !important;
  }
  .pos {
    padding-left: max(12px, env(safe-area-inset-left));
    padding-right: max(12px, env(safe-area-inset-right));
  }
  .pos-head {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
  }
  /* the top bar already says "Point of sale": the row is for the bar, the drawer and ⋯ */
  .pos-title {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }
  .pos-head .ui-actions {
    flex: 1;
    justify-content: flex-end;
    gap: 6px;
    flex-wrap: nowrap;
    min-width: 0;
  }
  .sell-from {
    min-width: 0;
    flex: 1 1 auto;
    padding-left: 10px;
  }
  .sell-from .ui-select {
    min-width: 0;
    width: 100%;
  }
  .drawer-pill {
    padding: 0 10px;
    font-size: 12.5px;
    white-space: nowrap;
  }
  .catalog {
    border-radius: var(--radius-lg);
  }
  .catalog__bar {
    gap: 8px;
    padding: 10px;
  }
  .scan .ui-input {
    height: 48px;
    font-size: 16px; /* no iOS zoom on focus */
  }
  .scan-cam {
    height: 48px;
    width: 52px;
    padding: 0;
    justify-content: center;
  }
  .scan-cam i {
    font-size: 19px;
  }
  .chips {
    padding: 8px 10px 0;
  }
  .chip {
    height: 36px;
    font-size: 13.5px;
  }
  .catalog__body {
    padding: 10px;
  }
  .picks__row {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px;
  }
  .pick {
    min-height: 74px;
    padding: 9px 10px;
  }
  .pick__name {
    font-size: 13px;
  }
  /* the catalogue as rows: name, stock, price — quicker to read and to hit than tiles */
  .grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 6px;
  }
  .tile {
    display: grid;
    grid-template-columns: 38px minmax(0, 1fr) auto;
    grid-template-areas: 'av name foot' 'av sku foot';
    align-items: center;
    column-gap: 10px;
    row-gap: 0;
    min-height: 60px;
    padding: 8px 12px;
  }
  .tile__avatar {
    grid-area: av;
    width: 38px;
    height: 38px;
    margin: 0;
    font-size: 12px;
  }
  .tile__name {
    grid-area: name;
    font-size: 14.5px;
    -webkit-line-clamp: 1;
  }
  .tile__sku {
    grid-area: sku;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .tile__foot {
    grid-area: foot;
    margin: 0;
    padding: 0;
    width: auto;
    flex-direction: column;
    align-items: flex-end;
    gap: 0;
  }
  .tile__qty {
    top: 50%;
    right: auto;
    left: 34px;
    transform: translateY(-120%);
    min-width: 20px;
    height: 20px;
    font-size: 11px;
  }
  .tile-sk {
    height: 60px;
  }
  /* cart sheet: the total and the payment buttons always in reach */
  .cart {
    height: min(92dvh, 760px);
  }
  .line {
    grid-template-columns: minmax(0, 1fr) auto 70px 32px;
    gap: 6px;
    padding: 10px 4px;
  }
  .stepper button {
    width: 40px;
    height: 40px;
    font-size: 13px;
  }
  .stepper input {
    width: 38px;
    height: 40px;
    font-size: 15px;
  }
  .adjust-toggle {
    display: flex;
    width: 100%;
    align-items: center;
    gap: 8px;
    min-height: 40px;
    padding: 0 2px;
    border: 0;
    background: transparent;
    color: var(--text-2);
    font: inherit;
    font-size: 13.5px;
    cursor: pointer;
  }
  .adjust-toggle .muted {
    margin-left: auto;
  }
  .adjust {
    display: none;
  }
  .adjust.is-open {
    display: flex;
    margin-bottom: 4px;
  }
  .totals {
    margin: 6px 0 10px;
  }
  .totals__grand dt,
  .totals__grand dd {
    font-size: 22px;
  }
  .paybar__btn {
    min-height: 50px;
    flex-direction: column;
    gap: 2px;
    font-size: 12.5px;
  }
  .paybar__btn i {
    font-size: 16px;
  }
  .charge {
    height: 56px;
  }
  .cart-dock .cart-bar {
    padding: 0 14px;
    gap: 8px;
  }
  .cart-bar__word {
    display: none;
  }
}
</style>
