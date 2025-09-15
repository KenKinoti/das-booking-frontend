<template>
  <div class="pos-page">
    <div class="container-fluid h-100">
      <div class="row h-100">
        <!-- Left Panel - Products & Categories -->
        <div class="col-md-8 border-end">
          <div class="p-3">
            <!-- Header -->
            <div class="d-flex justify-content-between align-items-center mb-4">
              <h4 class="mb-0">Point of Sale</h4>
              <div class="d-flex gap-2">
                <button class="btn btn-outline-secondary btn-sm" @click="showReports = true">
                  <i class="bi bi-graph-up me-1"></i>Reports
                </button>
                <button class="btn btn-outline-primary btn-sm" @click="manageCashDrawer">
                  <i class="bi bi-cash-stack me-1"></i>Cash Drawer
                </button>
              </div>
            </div>

            <!-- Search & Filters -->
            <div class="row mb-3">
              <div class="col-md-6">
                <div class="input-group">
                  <span class="input-group-text">
                    <i class="bi bi-search"></i>
                  </span>
                  <input
                    type="text"
                    class="form-control"
                    placeholder="Search products or scan barcode..."
                    v-model="searchQuery"
                    @input="debouncedSearch"
                    @keyup.enter="addProductBySearch"
                    ref="searchInput"
                    autocomplete="off"
                  >
                  <button class="btn btn-outline-primary" @click="startBarcodeScanner" :disabled="scannerActive">
                    <i class="bi bi-upc-scan"></i>
                    {{ scannerActive ? 'Scanning...' : 'Scan' }}
                  </button>
                </div>
              </div>
              <div class="col-md-3">
                <select class="form-select" v-model="selectedCategory">
                  <option value="">All Categories</option>
                  <option v-for="category in categories" :key="category.id" :value="category.id">
                    {{ category.name }}
                  </option>
                </select>
              </div>
              <div class="col-md-3">
                <div class="btn-group w-100">
                  <button class="btn btn-outline-secondary" @click="suspendTransaction" :disabled="cartItems.length === 0">
                    <i class="bi bi-pause"></i> Suspend
                  </button>
                  <button class="btn btn-outline-info" @click="showSuspendedOrders = true">
                    <i class="bi bi-list"></i> Retrieve
                  </button>
                </div>
              </div>
            </div>

            <!-- Category Tabs -->
            <div class="mb-3">
              <ul class="nav nav-pills">
                <li class="nav-item">
                  <a
                    class="nav-link"
                    :class="{ active: selectedCategory === '' }"
                    href="#"
                    @click.prevent="selectedCategory = ''"
                  >
                    All
                  </a>
                </li>
                <li class="nav-item" v-for="category in categories" :key="category.id">
                  <a
                    class="nav-link"
                    :class="{ active: selectedCategory === category.id }"
                    href="#"
                    @click.prevent="selectedCategory = category.id"
                  >
                    {{ category.name }}
                  </a>
                </li>
              </ul>
            </div>

            <!-- Products Grid -->
            <div class="row g-2 overflow-auto" style="max-height: calc(100vh - 250px);">
              <div
                class="col-6 col-md-4 col-lg-3"
                v-for="product in filteredProducts"
                :key="product.id"
              >
                <div
                  class="card product-card h-100"
                  :class="{ 'out-of-stock': product.current_stock === 0 }"
                  @click="addProductToCart(product)"
                >
                  <img
                    :src="product.image_url || '/api/placeholder/150/150'"
                    class="card-img-top"
                    alt="Product"
                    style="height: 120px; object-fit: cover;"
                  >
                  <div class="card-body p-2">
                    <h6 class="card-title small mb-1">{{ product.name }}</h6>
                    <div class="d-flex justify-content-between align-items-center">
                      <span class="text-primary fw-bold">${{ formatCurrency(product.selling_price) }}</span>
                      <small
                        class="badge"
                        :class="product.current_stock > 0 ? 'bg-success' : 'bg-danger'"
                      >
                        {{ product.current_stock }}
                      </small>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Services -->
              <div
                class="col-6 col-md-4 col-lg-3"
                v-for="service in services"
                :key="'service-' + service.id"
              >
                <div class="card service-card h-100" @click="addServiceToCart(service)">
                  <div class="card-body p-2 text-center">
                    <i class="bi bi-gear fs-1 text-primary"></i>
                    <h6 class="card-title small mb-1">{{ service.name }}</h6>
                    <span class="text-primary fw-bold">${{ formatCurrency(service.price) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Panel - Cart & Checkout -->
        <div class="col-md-4">
          <div class="p-3">
            <!-- Customer Selection -->
            <div class="mb-3">
              <label class="form-label">Customer</label>
              <div class="input-group">
                <select class="form-select" v-model="selectedCustomer">
                  <option value="">Walk-in Customer</option>
                  <option v-for="customer in customers" :key="customer.id" :value="customer.id">
                    {{ customer.first_name }} {{ customer.last_name }}
                  </option>
                </select>
                <button class="btn btn-outline-secondary" @click="showCustomerModal = true">
                  <i class="bi bi-plus"></i>
                </button>
              </div>
            </div>

            <!-- Cart Items -->
            <div class="mb-3">
              <h5>Cart Items</h5>
              <div class="border rounded p-2" style="min-height: 300px; max-height: 400px; overflow-y: auto;">
                <div v-if="cartItems.length === 0" class="text-center text-muted py-5">
                  <i class="bi bi-cart3 fs-1"></i>
                  <p class="mt-2">Cart is empty</p>
                </div>

                <div v-else>
                  <div
                    v-for="(item, index) in cartItems"
                    :key="index"
                    class="d-flex justify-content-between align-items-center py-2 border-bottom"
                  >
                    <div class="flex-grow-1">
                      <h6 class="mb-1">{{ item.name }}</h6>
                      <small class="text-muted">${{ formatCurrency(item.unit_price) }} each</small>
                    </div>
                    <div class="d-flex align-items-center">
                      <button
                        class="btn btn-sm btn-outline-secondary"
                        @click="decreaseQuantity(index)"
                      >
                        <i class="bi bi-dash"></i>
                      </button>
                      <span class="mx-2 fw-bold">{{ item.quantity }}</span>
                      <button
                        class="btn btn-sm btn-outline-secondary"
                        @click="increaseQuantity(index)"
                      >
                        <i class="bi bi-plus"></i>
                      </button>
                      <button
                        class="btn btn-sm btn-outline-danger ms-2"
                        @click="removeFromCart(index)"
                      >
                        <i class="bi bi-trash"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Totals -->
            <div class="mb-3">
              <div class="d-flex justify-content-between">
                <span>Subtotal:</span>
                <span>${{ formatCurrency(subtotal) }}</span>
              </div>
              <div class="d-flex justify-content-between">
                <span>Tax ({{ defaultTaxRate }}%):</span>
                <span>${{ formatCurrency(taxAmount) }}</span>
              </div>
              <div class="d-flex justify-content-between">
                <span>Discount:</span>
                <div class="input-group input-group-sm" style="width: 100px;">
                  <span class="input-group-text">$</span>
                  <input
                    type="number"
                    class="form-control"
                    v-model.number="discountAmount"
                    min="0"
                    :max="subtotal"
                    step="0.01"
                  >
                </div>
              </div>
              <hr>
              <div class="d-flex justify-content-between fw-bold fs-5">
                <span>Total:</span>
                <span>${{ formatCurrency(total) }}</span>
              </div>
            </div>

            <!-- Payment Methods -->
            <div class="mb-3">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <label class="form-label mb-0">Payment</label>
                <small class="text-muted">
                  Remaining: ${{ formatCurrency(remainingAmount) }}
                </small>
              </div>

              <!-- Payment Method Buttons -->
              <div class="row g-2 mb-2">
                <div class="col-4">
                  <button class="btn btn-outline-success w-100" @click="addPayment('cash')">
                    <i class="bi bi-cash-stack"></i><br>Cash
                  </button>
                </div>
                <div class="col-4">
                  <button class="btn btn-outline-primary w-100" @click="addPayment('card')">
                    <i class="bi bi-credit-card"></i><br>Card
                  </button>
                </div>
                <div class="col-4">
                  <button class="btn btn-outline-info w-100" @click="addPayment('eftpos')">
                    <i class="bi bi-phone"></i><br>EFTPOS
                  </button>
                </div>
                <div class="col-4">
                  <button class="btn btn-outline-warning w-100" @click="addPayment('gift_card')">
                    <i class="bi bi-gift"></i><br>Gift Card
                  </button>
                </div>
                <div class="col-4">
                  <button class="btn btn-outline-secondary w-100" @click="addPayment('mobile_wallet')">
                    <i class="bi bi-wallet2"></i><br>Mobile Pay
                  </button>
                </div>
                <div class="col-4">
                  <button class="btn btn-outline-dark w-100" @click="addPayment('layby')">
                    <i class="bi bi-clock"></i><br>Layby
                  </button>
                </div>
              </div>

              <!-- Applied Payments -->
              <div v-if="appliedPayments.length > 0" class="border rounded p-2 mb-2">
                <div class="d-flex justify-content-between align-items-center mb-2">
                  <small class="fw-bold">Applied Payments:</small>
                  <button class="btn btn-sm btn-outline-danger" @click="clearAllPayments">
                    <i class="bi bi-trash"></i>
                  </button>
                </div>
                <div v-for="(payment, index) in appliedPayments" :key="index" class="d-flex justify-content-between align-items-center mb-1">
                  <span class="small">
                    <i :class="getPaymentIcon(payment.method)"></i>
                    {{ formatPaymentMethodName(payment.method) }}
                  </span>
                  <div>
                    <span class="badge bg-light text-dark me-1">${{ formatCurrency(payment.amount) }}</span>
                    <button class="btn btn-sm btn-outline-danger" @click="removePayment(index)">
                      <i class="bi bi-x"></i>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Quick Cash Amounts -->
              <div class="mb-2">
                <small class="text-muted">Quick Cash:</small>
                <div class="btn-group w-100 mb-2">
                  <button
                    v-for="amount in quickCashAmounts"
                    :key="amount"
                    class="btn btn-sm btn-outline-secondary"
                    @click="addCashPayment(amount)"
                  >
                    ${{ amount }}
                  </button>
                  <button class="btn btn-sm btn-outline-secondary" @click="addCashPayment(remainingAmount)">
                    Exact
                  </button>
                </div>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="d-grid gap-2">
              <button
                class="btn btn-success btn-lg"
                @click="processPayment"
                :disabled="!canCompleteTransaction"
              >
                <i class="bi bi-check-circle me-2"></i>
                Complete Sale (${{ formatCurrency(total) }})
              </button>

              <div class="row g-2">
                <div class="col-6">
                  <button
                    class="btn btn-warning w-100"
                    @click="processPartialPayment"
                    :disabled="appliedPayments.length === 0 || remainingAmount <= 0"
                  >
                    <i class="bi bi-credit-card-2-front me-1"></i>
                    Partial Payment
                  </button>
                </div>
                <div class="col-6">
                  <button
                    class="btn btn-info w-100"
                    @click="showReceiptOptions = true"
                    :disabled="lastTransactionId === null"
                  >
                    <i class="bi bi-printer me-1"></i>
                    Reprint
                  </button>
                </div>
              </div>

              <div class="row g-2">
                <div class="col-6">
                  <button
                    class="btn btn-outline-danger w-100"
                    @click="clearCart"
                    :disabled="cartItems.length === 0"
                  >
                    <i class="bi bi-trash me-1"></i>
                    Clear Cart
                  </button>
                </div>
                <div class="col-6">
                  <button
                    class="btn btn-outline-secondary w-100"
                    @click="showReturnExchange = true"
                  >
                    <i class="bi bi-arrow-return-left me-1"></i>
                    Return/Exchange
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <CustomerModal
      v-if="showCustomerModal"
      @close="showCustomerModal = false"
      @saved="handleCustomerSaved"
    />

    <POSReportModal
      v-if="showReports"
      @close="showReports = false"
    />

    <CashDrawerModal
      v-if="showCashDrawerModal"
      @close="showCashDrawerModal = false"
    />

    <!-- Payment Method Modal -->
    <PaymentModal
      v-if="showPaymentModal"
      :payment-method="selectedPaymentMethod"
      :amount="paymentAmount"
      :remaining-amount="remainingAmount"
      @close="showPaymentModal = false"
      @payment-added="handlePaymentAdded"
    />

    <!-- Suspended Orders Modal -->
    <SuspendedOrdersModal
      v-if="showSuspendedOrders"
      @close="showSuspendedOrders = false"
      @order-selected="retrieveSuspendedOrder"
    />

    <!-- Receipt Options Modal -->
    <ReceiptOptionsModal
      v-if="showReceiptOptions"
      :transaction-id="lastTransactionId"
      @close="showReceiptOptions = false"
    />

    <!-- Return/Exchange Modal -->
    <ReturnExchangeModal
      v-if="showReturnExchange"
      @close="showReturnExchange = false"
      @transaction-processed="handleReturnExchange"
    />

    <!-- Barcode Scanner Modal -->
    <BarcodeScannerModal
      v-if="showBarcodeScanner"
      @close="stopBarcodeScanner"
      @barcode-scanned="handleBarcodeScanned"
    />
  </div>
</template>

<script>
import { debounce } from 'lodash-es'
import CustomerModal from '@/components/customers/CustomerModal.vue'
import POSReportModal from '@/components/pos/POSReportModal.vue'
import CashDrawerModal from '@/components/pos/CashDrawerModal.vue'
import PaymentModal from '@/components/pos/PaymentModal.vue'
import SuspendedOrdersModal from '@/components/pos/SuspendedOrdersModal.vue'
import ReceiptOptionsModal from '@/components/pos/ReceiptOptionsModal.vue'
import ReturnExchangeModal from '@/components/pos/ReturnExchangeModal.vue'
import BarcodeScannerModal from '@/components/pos/BarcodeScannerModal.vue'
import { inventoryService } from '@/services/inventoryService'
import { posService } from '@/services/posService'
import { customerService } from '@/services/customerService'
import { serviceService } from '@/services/serviceService'

export default {
  name: 'POSPage',
  components: {
    CustomerModal,
    POSReportModal,
    CashDrawerModal,
    PaymentModal,
    SuspendedOrdersModal,
    ReceiptOptionsModal,
    ReturnExchangeModal,
    BarcodeScannerModal
  },
  data() {
    return {
      // Search and filtering
      searchQuery: '',
      selectedCategory: '',
      selectedCustomer: '',

      // Data arrays
      products: [],
      services: [],
      categories: [],
      customers: [],
      cartItems: [],
      suspendedOrders: [],

      // Payment and pricing
      discountAmount: 0,
      appliedPayments: [],
      defaultTaxRate: 10,
      quickCashAmounts: [5, 10, 20, 50, 100],

      // Modal visibility
      showCustomerModal: false,
      showReports: false,
      showCashDrawerModal: false,
      showPaymentModal: false,
      showSuspendedOrders: false,
      showReceiptOptions: false,
      showReturnExchange: false,
      showBarcodeScanner: false,

      // Scanner and transaction state
      scannerActive: false,
      selectedPaymentMethod: '',
      paymentAmount: 0,
      lastTransactionId: null,
      currentSuspendedOrderId: null,

      // Offline mode support
      offlineMode: false,
      pendingTransactions: []
    }
  },
  computed: {
    filteredProducts() {
      let filtered = this.products

      if (this.selectedCategory) {
        filtered = filtered.filter(p => p.category_id === this.selectedCategory)
      }

      if (this.searchQuery.trim()) {
        const query = this.searchQuery.toLowerCase()
        filtered = filtered.filter(p =>
          p.name.toLowerCase().includes(query) ||
          p.sku.toLowerCase().includes(query) ||
          (p.barcode && p.barcode.toLowerCase().includes(query))
        )
      }

      return filtered
    },

    subtotal() {
      return this.cartItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
    },

    taxAmount() {
      return (this.subtotal * this.defaultTaxRate) / 100
    },

    total() {
      return this.subtotal + this.taxAmount - this.discountAmount
    },

    totalPaid() {
      return this.appliedPayments.reduce((sum, payment) => sum + payment.amount, 0)
    },

    remainingAmount() {
      return Math.max(0, this.total - this.totalPaid)
    },

    changeAmount() {
      return Math.max(0, this.totalPaid - this.total)
    },

    canCompleteTransaction() {
      return this.cartItems.length > 0 && this.remainingAmount <= 0
    },

    canProcess() {
      if (this.cartItems.length === 0) return false
      if (this.paymentMethod === 'cash' && this.cashReceived < this.total) return false
      return true
    }
  },
  created() {
    this.debouncedSearch = debounce(this.searchProducts, 300)
    this.fetchData()
    this.loadSuspendedOrders()

    // Check network connectivity for offline mode
    window.addEventListener('online', this.disableOfflineMode)
    window.addEventListener('offline', this.enableOfflineMode)
  },
  mounted() {
    // Focus search input for barcode scanning
    this.$refs.searchInput?.focus()
  },
  methods: {
    async fetchData() {
      await Promise.all([
        this.fetchProducts(),
        this.fetchServices(),
        this.fetchCategories(),
        this.fetchCustomers()
      ])
    },

    async fetchProducts() {
      try {
        const response = await inventoryService.getProducts({ is_active: true })
        this.products = response.data.products
      } catch (error) {
        console.error('Error fetching products:', error)
      }
    },

    async fetchServices() {
      try {
        const response = await serviceService.getServices({ is_active: true })
        this.services = response.data.services
      } catch (error) {
        console.error('Error fetching services:', error)
      }
    },

    async fetchCategories() {
      try {
        const response = await inventoryService.getCategories()
        this.categories = response.data.categories
      } catch (error) {
        console.error('Error fetching categories:', error)
      }
    },

    async fetchCustomers() {
      try {
        const response = await customerService.getCustomers()
        this.customers = response.data.customers
      } catch (error) {
        console.error('Error fetching customers:', error)
      }
    },

    searchProducts() {
      // Search is handled by computed property
    },

    addProductBySearch() {
      if (this.filteredProducts.length === 1) {
        this.addProductToCart(this.filteredProducts[0])
        this.searchQuery = ''
        this.$refs.searchInput?.focus()
      }
    },

    addProductToCart(product) {
      if (product.current_stock === 0) {
        this.$toast.error('Product is out of stock')
        return
      }

      const existingIndex = this.cartItems.findIndex(
        item => item.product_id === product.id && item.type === 'product'
      )

      if (existingIndex >= 0) {
        if (this.cartItems[existingIndex].quantity < product.current_stock) {
          this.cartItems[existingIndex].quantity++
        } else {
          this.$toast.warning('Not enough stock available')
        }
      } else {
        this.cartItems.push({
          product_id: product.id,
          service_id: null,
          type: 'product',
          name: product.name,
          unit_price: product.selling_price,
          quantity: 1,
          max_quantity: product.current_stock
        })
      }

      this.searchQuery = ''
      this.$refs.searchInput?.focus()
    },

    addServiceToCart(service) {
      const existingIndex = this.cartItems.findIndex(
        item => item.service_id === service.id && item.type === 'service'
      )

      if (existingIndex >= 0) {
        this.cartItems[existingIndex].quantity++
      } else {
        this.cartItems.push({
          product_id: null,
          service_id: service.id,
          type: 'service',
          name: service.name,
          unit_price: service.price,
          quantity: 1,
          max_quantity: null
        })
      }
    },

    increaseQuantity(index) {
      const item = this.cartItems[index]
      if (item.type === 'product' && item.quantity >= item.max_quantity) {
        this.$toast.warning('Not enough stock available')
        return
      }
      item.quantity++
    },

    decreaseQuantity(index) {
      const item = this.cartItems[index]
      if (item.quantity > 1) {
        item.quantity--
      }
    },

    removeFromCart(index) {
      this.cartItems.splice(index, 1)
    },

    clearCart() {
      this.cartItems = []
      this.discountAmount = 0
      this.cashReceived = 0
      this.selectedCustomer = ''
    },

    async processPayment() {
      try {
        // Prepare transaction data
        const transactionData = {
          customer_id: this.selectedCustomer || null,
          items: this.cartItems.map(item => ({
            product_id: item.product_id,
            service_id: item.service_id,
            item_name: item.name,
            item_type: item.type,
            quantity: item.quantity,
            unit_price: item.unit_price,
            tax_rate: this.defaultTaxRate
          })),
          payments: [{
            method: this.paymentMethod,
            amount: this.paymentMethod === 'cash' ? this.cashReceived : this.total
          }],
          discount_amount: this.discountAmount
        }

        const response = await posService.createTransaction(transactionData)

        this.$toast.success('Transaction completed successfully')

        // Print receipt (you can implement this)
        this.printReceipt(response.data.transaction)

        // Clear cart
        this.clearCart()

        // Refresh products to update stock
        this.fetchProducts()

      } catch (error) {
        console.error('Error processing payment:', error)
        this.$toast.error('Failed to process payment')
      }
    },

    printReceipt(transaction) {
      // Implement receipt printing logic
      console.log('Printing receipt for transaction:', transaction)
    },

    manageCashDrawer() {
      this.showCashDrawerModal = true
    },

    handleCustomerSaved() {
      this.showCustomerModal = false
      this.fetchCustomers()
    },

    // ============ COMPREHENSIVE POS FEATURES ============

    // Barcode Scanner
    startBarcodeScanner() {
      this.scannerActive = true
      this.showBarcodeScanner = true
    },

    stopBarcodeScanner() {
      this.scannerActive = false
      this.showBarcodeScanner = false
    },

    handleBarcodeScanned(barcode) {
      const product = this.products.find(p => p.barcode === barcode || p.sku === barcode)
      if (product) {
        this.addProductToCart(product)
        this.$toast.success(`Added ${product.name} to cart`)
      } else {
        this.$toast.error('Product not found')
      }
      this.stopBarcodeScanner()
    },

    // Split Tender & Payment Processing
    addPayment(method) {
      this.selectedPaymentMethod = method
      this.paymentAmount = this.remainingAmount
      this.showPaymentModal = true
    },

    addCashPayment(amount) {
      if (amount > 0 && amount <= this.remainingAmount) {
        this.appliedPayments.push({
          method: 'cash',
          amount: amount,
          timestamp: new Date()
        })
      }
    },

    handlePaymentAdded(payment) {
      this.appliedPayments.push({
        ...payment,
        timestamp: new Date()
      })
      this.showPaymentModal = false
    },

    removePayment(index) {
      this.appliedPayments.splice(index, 1)
    },

    clearAllPayments() {
      this.appliedPayments = []
    },

    getPaymentIcon(method) {
      const icons = {
        cash: 'bi bi-cash-stack text-success',
        card: 'bi bi-credit-card text-primary',
        eftpos: 'bi bi-phone text-info',
        gift_card: 'bi bi-gift text-warning',
        mobile_wallet: 'bi bi-wallet2 text-secondary',
        layby: 'bi bi-clock text-dark'
      }
      return icons[method] || 'bi bi-currency-dollar'
    },

    formatPaymentMethodName(method) {
      const names = {
        cash: 'Cash',
        card: 'Credit/Debit Card',
        eftpos: 'EFTPOS',
        gift_card: 'Gift Card',
        mobile_wallet: 'Mobile Wallet',
        layby: 'Layby'
      }
      return names[method] || method
    },

    // Suspend & Retrieve Orders
    suspendTransaction() {
      if (this.cartItems.length === 0) return

      const suspendedOrder = {
        id: Date.now().toString(),
        items: [...this.cartItems],
        customer_id: this.selectedCustomer,
        discount_amount: this.discountAmount,
        timestamp: new Date(),
        staff_id: 'current-staff' // TODO: Get from auth store
      }

      // Save to local storage for persistence
      const suspended = JSON.parse(localStorage.getItem('suspendedOrders') || '[]')
      suspended.push(suspendedOrder)
      localStorage.setItem('suspendedOrders', JSON.stringify(suspended))

      this.suspendedOrders.push(suspendedOrder)
      this.clearCart()
      this.$toast.success('Transaction suspended')
    },

    retrieveSuspendedOrder(order) {
      this.cartItems = [...order.items]
      this.selectedCustomer = order.customer_id || ''
      this.discountAmount = order.discount_amount || 0

      // Remove from suspended orders
      const index = this.suspendedOrders.findIndex(o => o.id === order.id)
      if (index >= 0) {
        this.suspendedOrders.splice(index, 1)

        // Update localStorage
        const suspended = this.suspendedOrders
        localStorage.setItem('suspendedOrders', JSON.stringify(suspended))
      }

      this.showSuspendedOrders = false
      this.$toast.success('Transaction retrieved')
    },

    // Partial Payments
    async processPartialPayment() {
      if (this.appliedPayments.length === 0) return

      try {
        const transactionData = {
          customer_id: this.selectedCustomer || null,
          items: this.cartItems.map(item => ({
            product_id: item.product_id,
            service_id: item.service_id,
            item_name: item.name,
            item_type: item.type,
            quantity: item.quantity,
            unit_price: item.unit_price,
            tax_rate: this.defaultTaxRate
          })),
          payments: this.appliedPayments,
          discount_amount: this.discountAmount,
          status: 'partial_payment',
          remaining_amount: this.remainingAmount
        }

        const response = await posService.createTransaction(transactionData)
        this.lastTransactionId = response.data.transaction.id

        this.$toast.success(`Partial payment processed. Remaining: $${this.formatCurrency(this.remainingAmount)}`)

        // Clear applied payments but keep cart for remaining payment
        this.appliedPayments = []

      } catch (error) {
        console.error('Error processing partial payment:', error)
        this.$toast.error('Failed to process partial payment')
      }
    },

    // Enhanced Transaction Processing
    async processPayment() {
      if (!this.canCompleteTransaction) return

      try {
        const transactionData = {
          customer_id: this.selectedCustomer || null,
          items: this.cartItems.map(item => ({
            product_id: item.product_id,
            service_id: item.service_id,
            item_name: item.name,
            item_type: item.type,
            quantity: item.quantity,
            unit_price: item.unit_price,
            tax_rate: this.defaultTaxRate
          })),
          payments: this.appliedPayments,
          discount_amount: this.discountAmount,
          status: 'completed',
          change_amount: this.changeAmount
        }

        const response = await posService.createTransaction(transactionData)
        this.lastTransactionId = response.data.transaction.id

        this.$toast.success('Transaction completed successfully!')

        // Show change if applicable
        if (this.changeAmount > 0) {
          this.$toast.info(`Change due: $${this.formatCurrency(this.changeAmount)}`)
        }

        // Auto-print receipt
        this.printReceipt(response.data.transaction)

        // Clear everything
        this.clearCart()
        this.clearAllPayments()

        // Refresh products to update stock
        this.fetchProducts()

      } catch (error) {
        console.error('Error processing payment:', error)
        this.$toast.error('Failed to process payment')
      }
    },

    // Returns & Exchanges
    handleReturnExchange(transaction) {
      this.$toast.success('Return/Exchange processed successfully')
      this.showReturnExchange = false
      this.fetchProducts() // Refresh stock levels
    },

    // Enhanced Clear Cart
    clearCart() {
      this.cartItems = []
      this.discountAmount = 0
      this.selectedCustomer = ''
      this.appliedPayments = []
      this.currentSuspendedOrderId = null
    },

    // Offline Mode Support
    enableOfflineMode() {
      this.offlineMode = true
      this.$toast.warning('Offline mode enabled - transactions will be synced when connection is restored')
    },

    disableOfflineMode() {
      this.offlineMode = false
      this.syncPendingTransactions()
    },

    async syncPendingTransactions() {
      for (const transaction of this.pendingTransactions) {
        try {
          await posService.createTransaction(transaction)
          this.$toast.success('Offline transaction synced')
        } catch (error) {
          console.error('Failed to sync transaction:', error)
        }
      }
      this.pendingTransactions = []
    },

    // Load suspended orders from localStorage
    loadSuspendedOrders() {
      const suspended = JSON.parse(localStorage.getItem('suspendedOrders') || '[]')
      this.suspendedOrders = suspended
    },

    formatCurrency(amount) {
      return new Intl.NumberFormat('en-AU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount || 0)
    }
  }
}
</script>

<style scoped>
.pos-page {
  height: 100vh;
  background-color: #f8f9fa;
}

.product-card, .service-card {
  cursor: pointer;
  transition: all 0.2s ease;
}

.product-card:hover, .service-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.product-card.out-of-stock {
  opacity: 0.6;
  cursor: not-allowed;
}

.product-card.out-of-stock:hover {
  transform: none;
  box-shadow: none;
}

.service-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.nav-pills .nav-link {
  border-radius: 20px;
  margin-right: 0.5rem;
}

.nav-pills .nav-link.active {
  background-color: var(--bs-primary);
}

.btn-check:checked + .btn-outline-primary {
  background-color: var(--bs-primary);
  border-color: var(--bs-primary);
  color: white;
}
</style>