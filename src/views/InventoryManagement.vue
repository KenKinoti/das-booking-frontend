<template>
  <div class="inventory-module">
    <!-- Action Buttons Section -->
    <div class="page-actions d-flex justify-content-end mb-4">
      <button class="btn btn-outline-success me-2" @click="exportInventory">
        <i class="bi bi-download me-2"></i>
        Export
      </button>
      <button class="btn btn-primary" @click="showProductModal = true">
        <i class="bi bi-plus-lg me-2"></i>
        Add Product
      </button>
    </div>

    <!-- Inventory Dashboard Cards -->
    <div class="stats-overview mb-5">
      <div class="row g-4">
        <div class="col-lg-3 col-md-6">
          <div class="stat-card bg-gradient-primary">
            <div class="stat-content">
              <div class="stat-icon">
                <i class="bi bi-box-seam"></i>
              </div>
              <div class="stat-details">
                <h3 class="stat-value">{{ dashboard?.total_products || 0 }}</h3>
                <p class="stat-label">Total Products</p>
                <small class="stat-change positive">
                  <i class="bi bi-arrow-up"></i> +{{ dashboard?.new_products || 0 }} this month
                </small>
              </div>
            </div>
          </div>
        </div>

        <div class="col-lg-3 col-md-6">
          <div class="stat-card bg-gradient-success">
            <div class="stat-content">
              <div class="stat-icon">
                <i class="bi bi-check-circle"></i>
              </div>
              <div class="stat-details">
                <h3 class="stat-value">{{ dashboard?.in_stock || 0 }}</h3>
                <p class="stat-label">In Stock</p>
                <small class="stat-change positive">
                  <i class="bi bi-check"></i> {{ getStockPercentage() }}% available
                </small>
              </div>
            </div>
          </div>
        </div>

        <div class="col-lg-3 col-md-6">
          <div class="stat-card bg-gradient-warning">
            <div class="stat-content">
              <div class="stat-icon">
                <i class="bi bi-exclamation-triangle"></i>
              </div>
              <div class="stat-details">
                <h3 class="stat-value">{{ dashboard?.low_stock || 0 }}</h3>
                <p class="stat-label">Low Stock</p>
                <small class="stat-change warning">
                  <i class="bi bi-exclamation-triangle"></i> Needs attention
                </small>
              </div>
            </div>
          </div>
        </div>

        <div class="col-lg-3 col-md-6">
          <div class="stat-card bg-gradient-info">
            <div class="stat-content">
              <div class="stat-icon">
                <i class="bi bi-currency-dollar"></i>
              </div>
              <div class="stat-details">
                <h3 class="stat-value">${{ formatMoney(dashboard?.total_value || 0) }}</h3>
                <p class="stat-label">Inventory Value</p>
                <small class="stat-change positive">
                  <i class="bi bi-arrow-up"></i> +8.3% from last month
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Inventory Controls -->
    <div class="inventory-controls mb-4">
      <div class="row g-3 align-items-center">
        <div class="col-lg-3 col-md-6">
          <div class="search-box">
            <i class="bi bi-search"></i>
            <input
              type="text"
              class="form-control"
              placeholder="Search products..."
              v-model="searchQuery"
              @input="filterProducts"
            >
          </div>
        </div>
        <div class="col-lg-2 col-md-6">
          <select class="form-select" v-model="filterCategory" @change="filterProducts">
            <option value="">All Categories</option>
            <option v-for="category in categories" :key="category" :value="category">
              {{ category }}
            </option>
          </select>
        </div>
        <div class="col-lg-2 col-md-6">
          <select class="form-select" v-model="filterStatus" @change="filterProducts">
            <option value="">All Status</option>
            <option value="in_stock">In Stock</option>
            <option value="low_stock">Low Stock</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>
        </div>
        <div class="col-lg-3 col-md-6">
          <div class="form-check form-switch">
            <input
              class="form-check-input"
              type="checkbox"
              id="hideDiscontinued"
              v-model="hideDiscontinued"
              @change="filterProducts"
            >
            <label class="form-check-label" for="hideDiscontinued">
              Hide Discontinued
            </label>
          </div>
        </div>
        <div class="col-lg-2 col-md-12">
          <button class="btn btn-outline-primary w-100" @click="resetFilters">
            <i class="bi bi-arrow-clockwise me-1"></i>
            Reset
          </button>
        </div>
      </div>
    </div>

    <!-- Products Table -->
    <div class="card">
      <div class="card-header d-flex justify-content-between align-items-center">
        <h5 class="card-title mb-0">
          <i class="bi bi-grid-3x3-gap me-2"></i>
          Products Inventory
        </h5>
        <div class="view-toggle">
          <div class="btn-group" role="group">
            <button
              type="button"
              class="btn btn-sm btn-outline-primary"
              :class="{ active: viewMode === 'table' }"
              @click="viewMode = 'table'"
            >
              <i class="bi bi-table"></i>
            </button>
            <button
              type="button"
              class="btn btn-sm btn-outline-primary"
              :class="{ active: viewMode === 'grid' }"
              @click="viewMode = 'grid'"
            >
              <i class="bi bi-grid"></i>
            </button>
          </div>
        </div>
      </div>
      <div class="card-body">
        <!-- Table View -->
        <div v-show="viewMode === 'table'" class="table-responsive">
          <table class="table table-hover">
            <thead class="table-light">
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Stock Quantity</th>
                <th>Unit Price</th>
                <th>Total Value</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="product in filteredProducts" :key="product.id">
                <td>
                  <div class="d-flex align-items-center">
                    <div class="product-image me-3">
                      <img :src="product.image || '/placeholder-product.png'" :alt="product.name" class="rounded">
                    </div>
                    <div>
                      <strong>{{ product.name }}</strong>
                      <br>
                      <small class="text-muted">{{ product.description }}</small>
                    </div>
                  </div>
                </td>
                <td><code>{{ product.sku }}</code></td>
                <td>
                  <span class="badge bg-light text-dark">{{ product.category }}</span>
                </td>
                <td>
                  <div class="d-flex align-items-center">
                    <span class="me-2">{{ product.stock_quantity }}</span>
                    <span class="badge" :class="getStockBadgeClass(product)">
                      {{ getStockStatus(product) }}
                    </span>
                  </div>
                </td>
                <td>${{ formatMoney(product.unit_price) }}</td>
                <td>${{ formatMoney(product.stock_quantity * product.unit_price) }}</td>
                <td>
                  <span class="badge" :class="getStatusBadgeClass(product.status)">
                    {{ product.status.replace('_', ' ').toUpperCase() }}
                  </span>
                </td>
                <td>
                  <div class="btn-group" role="group">
                    <button class="btn btn-sm btn-outline-primary" @click="editProduct(product)">
                      <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-info" @click="viewProduct(product)">
                      <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-success" @click="adjustStock(product)">
                      <i class="bi bi-plus-minus"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" @click="deleteProduct(product.id)">
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Grid View -->
        <div v-show="viewMode === 'grid'" class="row g-4">
          <div v-for="product in filteredProducts" :key="product.id" class="col-lg-4 col-md-6">
            <div class="product-card">
              <div class="product-image">
                <img :src="product.image || '/placeholder-product.png'" :alt="product.name" class="card-img-top">
                <div class="stock-badge">
                  <span class="badge" :class="getStockBadgeClass(product)">
                    {{ getStockStatus(product) }}
                  </span>
                </div>
              </div>
              <div class="card-body">
                <h6 class="card-title">{{ product.name }}</h6>
                <p class="card-text text-muted small">{{ product.description }}</p>

                <div class="product-info">
                  <div class="d-flex justify-content-between mb-2">
                    <span class="text-muted">SKU:</span>
                    <code>{{ product.sku }}</code>
                  </div>
                  <div class="d-flex justify-content-between mb-2">
                    <span class="text-muted">Stock:</span>
                    <strong>{{ product.stock_quantity }}</strong>
                  </div>
                  <div class="d-flex justify-content-between mb-3">
                    <span class="text-muted">Price:</span>
                    <strong>${{ formatMoney(product.unit_price) }}</strong>
                  </div>
                </div>

                <div class="product-actions">
                  <button class="btn btn-sm btn-primary me-1" @click="editProduct(product)">
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button class="btn btn-sm btn-outline-success me-1" @click="adjustStock(product)">
                    <i class="bi bi-plus-minus"></i>
                  </button>
                  <button class="btn btn-sm btn-outline-info" @click="viewProduct(product)">
                    <i class="bi bi-eye"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="filteredProducts.length === 0" class="text-center py-5">
          <i class="bi bi-box display-1 text-muted"></i>
          <h4 class="mt-3">No Products Found</h4>
          <p class="text-muted">No products match your current filters</p>
          <button class="btn btn-primary" @click="resetFilters">
            <i class="bi bi-arrow-clockwise me-2"></i>
            Reset Filters
          </button>
        </div>
      </div>
    </div>

    <!-- Product Modal -->
    <div v-if="showProductModal" class="modal fade show d-block" tabindex="-1" style="background: rgba(0,0,0,0.5)">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi bi-plus-circle me-2"></i>
              {{ editingProduct ? 'Edit Product' : 'Add New Product' }}
            </h5>
            <button type="button" class="btn-close" @click="closeProductModal"></button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="saveProduct">
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">Product Name *</label>
                  <input type="text" class="form-control" v-model="productForm.name" required>
                </div>
                <div class="col-md-6">
                  <label class="form-label">SKU *</label>
                  <input type="text" class="form-control" v-model="productForm.sku" required>
                </div>
                <div class="col-12">
                  <label class="form-label">Description</label>
                  <textarea class="form-control" rows="3" v-model="productForm.description"></textarea>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Category *</label>
                  <select class="form-select" v-model="productForm.category" required>
                    <option value="">Select Category</option>
                    <option v-for="category in categories" :key="category" :value="category">
                      {{ category }}
                    </option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Unit Price *</label>
                  <div class="input-group">
                    <span class="input-group-text">$</span>
                    <input type="number" class="form-control" v-model="productForm.unit_price" step="0.01" min="0" required>
                  </div>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Initial Stock Quantity</label>
                  <input type="number" class="form-control" v-model="productForm.stock_quantity" min="0">
                </div>
                <div class="col-md-6">
                  <label class="form-label">Minimum Stock Level</label>
                  <input type="number" class="form-control" v-model="productForm.min_stock_level" min="0">
                </div>
                <div class="col-md-6">
                  <label class="form-label">Maximum Stock Level</label>
                  <input type="number" class="form-control" v-model="productForm.max_stock_level" min="0">
                </div>
                <div class="col-md-6">
                  <label class="form-label">Status</label>
                  <select class="form-select" v-model="productForm.status">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="discontinued">Discontinued</option>
                  </select>
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="closeProductModal">Cancel</button>
            <button type="button" class="btn btn-primary" @click="saveProduct">
              {{ editingProduct ? 'Update Product' : 'Create Product' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Stock Adjustment Modal -->
    <div v-if="showStockModal" class="modal fade show d-block" tabindex="-1" style="background: rgba(0,0,0,0.5)">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi bi-plus-minus-alt me-2"></i>
              Adjust Stock - {{ selectedProduct?.name }}
            </h5>
            <button type="button" class="btn-close" @click="showStockModal = false"></button>
          </div>
          <div class="modal-body">
            <div class="current-stock mb-3">
              <label class="form-label">Current Stock</label>
              <div class="input-group">
                <input type="number" class="form-control" :value="selectedProduct?.stock_quantity" readonly>
                <span class="input-group-text">units</span>
              </div>
            </div>

            <div class="adjustment-type mb-3">
              <label class="form-label">Adjustment Type</label>
              <select class="form-select" v-model="stockAdjustment.type">
                <option value="add">Add Stock</option>
                <option value="subtract">Subtract Stock</option>
                <option value="set">Set Exact Amount</option>
              </select>
            </div>

            <div class="adjustment-quantity mb-3">
              <label class="form-label">
                {{ stockAdjustment.type === 'set' ? 'New Stock Quantity' : 'Adjustment Quantity' }}
              </label>
              <input type="number" class="form-control" v-model="stockAdjustment.quantity" min="0" required>
            </div>

            <div class="adjustment-reason mb-3">
              <label class="form-label">Reason</label>
              <select class="form-select" v-model="stockAdjustment.reason">
                <option value="purchase">Purchase/Receiving</option>
                <option value="sale">Sale</option>
                <option value="damaged">Damaged Goods</option>
                <option value="theft">Theft/Loss</option>
                <option value="transfer">Transfer</option>
                <option value="correction">Inventory Correction</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div class="adjustment-notes">
              <label class="form-label">Notes</label>
              <textarea class="form-control" rows="3" v-model="stockAdjustment.notes" placeholder="Additional notes..."></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showStockModal = false">Cancel</button>
            <button type="button" class="btn btn-success" @click="saveStockAdjustment">
              Adjust Stock
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { listFrom, apiErrorMessage } from '@/services/api'
import { toast } from '@/composables/useToast'
import { confirmDialog } from '@/composables/useConfirm'
import { downloadBlob } from '@/utils/format'
import { ref, onMounted, computed } from 'vue'
import { inventoryAPI } from '../services/api'

export default {
  name: 'InventoryManagement',
  setup() {
    // State
    const loading = ref(false)
    const dashboard = ref(null)
    const products = ref([])
    const filteredProducts = ref([])
    const viewMode = ref('table')

    // Filters
    const searchQuery = ref('')
    const filterCategory = ref('')
    const filterStatus = ref('')
    const hideDiscontinued = ref(localStorage.getItem('hideDiscontinued') === 'true')

    // Modals
    const showProductModal = ref(false)
    const showStockModal = ref(false)
    const editingProduct = ref(null)
    const selectedProduct = ref(null)

    // Forms
    const productForm = ref({
      name: '',
      sku: '',
      description: '',
      category: '',
      unit_price: 0,
      stock_quantity: 0,
      min_stock_level: 0,
      max_stock_level: 0,
      status: 'active'
    })

    const stockAdjustment = ref({
      type: 'add',
      quantity: 0,
      reason: 'purchase',
      notes: ''
    })

    // Computed
    const categories = computed(() => {
      const cats = [...new Set(products.value.map(p => p.category).filter(Boolean))]
      return cats.length > 0 ? cats : ['Electronics', 'Automotive', 'Beauty', 'Health', 'Services']
    })

    // Map between the API product model and the fields this view uses
    const fromApi = (p) => ({
      ...p,
      category: p.category?.name || p.category_name || (typeof p.category === 'string' ? p.category : ''),
      unit_price: Number(p.selling_price ?? p.unit_price ?? 0),
      stock_quantity: Number(p.current_stock ?? p.stock_quantity ?? 0),
      min_stock_level: Number(p.min_stock ?? p.min_stock_level ?? 0),
      max_stock_level: Number(p.max_stock ?? p.max_stock_level ?? 0),
      status: p.status || (p.is_active === false ? 'inactive' : 'active'),
      image: p.image_url || p.image || ''
    })
    const toApi = (f) => ({
      name: (f.name || '').trim(),
      description: f.description || '',
      sku: (f.sku || '').trim() || `SKU-${Date.now().toString(36).toUpperCase()}`,
      selling_price: Number(f.unit_price) || 0,
      cost_price: Number(f.cost_price) || 0,
      current_stock: Math.max(0, parseInt(f.stock_quantity) || 0),
      min_stock: Math.max(0, parseInt(f.min_stock_level) || 0),
      max_stock: Math.max(0, parseInt(f.max_stock_level) || 0),
      unit_of_measure: f.unit_of_measure || 'each',
      is_active: f.status !== 'inactive' && f.status !== 'discontinued'
    })

    // Methods
    const loadInventoryData = async () => {
      try {
        loading.value = true
        const productsRes = await inventoryAPI.getProducts()
        products.value = listFrom(productsRes, 'products').map(fromApi)
        dashboard.value = generateMockDashboard()
        filterProducts()
      } catch (error) {
        products.value = []
        filteredProducts.value = []
        dashboard.value = generateMockDashboard()
        toast.error(apiErrorMessage(error, 'Could not load inventory'))
      } finally {
        loading.value = false
      }
    }

    const generateMockDashboard = () => {
      return {
        total_products: products.value.length,
        in_stock: products.value.filter(p => p.stock_quantity > 0).length,
        low_stock: products.value.filter(p => p.stock_quantity <= p.min_stock_level).length,
        total_value: products.value.reduce((sum, p) => sum + (p.stock_quantity * p.unit_price), 0),
        new_products: products.value.filter(p => p.created_at && Date.now() - new Date(p.created_at).getTime() < 30 * 86400000).length
      }
    }

    const filterProducts = () => {
      let filtered = [...products.value]

      if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase()
        filtered = filtered.filter(p =>
          p.name.toLowerCase().includes(query) ||
          p.sku.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query)
        )
      }

      if (filterCategory.value) {
        filtered = filtered.filter(p => p.category === filterCategory.value)
      }

      if (filterStatus.value) {
        filtered = filtered.filter(p => {
          switch (filterStatus.value) {
            case 'in_stock':
              return p.stock_quantity > p.min_stock_level
            case 'low_stock':
              return p.stock_quantity <= p.min_stock_level && p.stock_quantity > 0
            case 'out_of_stock':
              return p.stock_quantity === 0
            default:
              return true
          }
        })
      }

      // Filter out discontinued products if toggle is enabled
      if (hideDiscontinued.value) {
        filtered = filtered.filter(p => p.status !== 'discontinued')
        localStorage.setItem('hideDiscontinued', 'true')
      } else {
        localStorage.setItem('hideDiscontinued', 'false')
      }

      filteredProducts.value = filtered
    }

    const resetFilters = () => {
      searchQuery.value = ''
      filterCategory.value = ''
      filterStatus.value = ''
      hideDiscontinued.value = false
      localStorage.setItem('hideDiscontinued', 'false')
      filteredProducts.value = [...products.value]
    }

    const getStockStatus = (product) => {
      if (product.stock_quantity === 0) return 'Out of Stock'
      if (product.stock_quantity <= product.min_stock_level) return 'Low Stock'
      return 'In Stock'
    }

    const getStockBadgeClass = (product) => {
      if (product.stock_quantity === 0) return 'bg-danger'
      if (product.stock_quantity <= product.min_stock_level) return 'bg-warning'
      return 'bg-success'
    }

    const getStatusBadgeClass = (status) => {
      switch (status) {
        case 'active': return 'bg-success'
        case 'inactive': return 'bg-secondary'
        case 'discontinued': return 'bg-danger'
        default: return 'bg-secondary'
      }
    }

    const getStockPercentage = () => {
      if (!dashboard.value) return 0
      const total = dashboard.value.total_products
      const inStock = dashboard.value.in_stock
      return total > 0 ? Math.round((inStock / total) * 100) : 0
    }

    const editProduct = (product) => {
      editingProduct.value = product
      productForm.value = { ...product }
      showProductModal.value = true
    }

    const viewProduct = (product) => {
      // Implement product details view
      console.log('View product:', product)
    }

    const adjustStock = (product) => {
      selectedProduct.value = product
      stockAdjustment.value = {
        type: 'add',
        quantity: 0,
        reason: 'purchase',
        notes: ''
      }
      showStockModal.value = true
    }

    const deleteProduct = async (productId) => {
      const ok = await confirmDialog({ title: 'Delete product?', message: 'This product will be removed from your catalogue.', confirmText: 'Delete', danger: true })
      if (!ok) return
      try {
        await inventoryAPI.deleteProduct(productId)
        products.value = products.value.filter(p => p.id !== productId)
        dashboard.value = generateMockDashboard()
        filterProducts()
        toast.success('Product deleted')
      } catch (error) {
        toast.error(apiErrorMessage(error, 'Could not delete product'))
      }
    }

    const saveProduct = async () => {
      try {
        if (!productForm.value.name?.trim()) {
          toast.error('Give the product a name')
          return
        }
        if (editingProduct.value) {
          const res = await inventoryAPI.updateProduct(editingProduct.value.id, toApi(productForm.value))
          const saved = res.data?.product || res.data?.data || { ...toApi(productForm.value), id: editingProduct.value.id }
          const index = products.value.findIndex(p => p.id === editingProduct.value.id)
          if (index !== -1) products.value[index] = { ...fromApi(saved), category: productForm.value.category }
          toast.success('Product updated')
        } else {
          const res = await inventoryAPI.createProduct(toApi(productForm.value))
          const saved = res.data?.product || res.data?.data
          if (saved) products.value.push({ ...fromApi(saved), category: productForm.value.category })
          toast.success('Product added')
        }
        dashboard.value = generateMockDashboard()
        closeProductModal()
        filterProducts()
      } catch (error) {
        toast.error(apiErrorMessage(error, 'Could not save product'))
      }
    }

    const saveStockAdjustment = async () => {
      try {
        let newQuantity = selectedProduct.value.stock_quantity

        switch (stockAdjustment.value.type) {
          case 'add':
            newQuantity += parseInt(stockAdjustment.value.quantity)
            break
          case 'subtract':
            newQuantity -= parseInt(stockAdjustment.value.quantity)
            break
          case 'set':
            newQuantity = parseInt(stockAdjustment.value.quantity)
            break
        }

        // Update product stock
        const updatedProduct = { ...selectedProduct.value, stock_quantity: Math.max(0, newQuantity) }
        await inventoryAPI.updateProduct(selectedProduct.value.id, toApi(updatedProduct))
        toast.success('Stock updated')

        // Update local data
        const index = products.value.findIndex(p => p.id === selectedProduct.value.id)
        if (index !== -1) {
          products.value[index] = updatedProduct
        }

        showStockModal.value = false
        filterProducts()
      } catch (error) {
        toast.error(apiErrorMessage(error, 'Could not update stock'))
      }
    }

    const closeProductModal = () => {
      showProductModal.value = false
      editingProduct.value = null
      productForm.value = {
        name: '',
        sku: '',
        description: '',
        category: '',
        unit_price: 0,
        stock_quantity: 0,
        min_stock_level: 0,
        max_stock_level: 0,
        status: 'active'
      }
    }

    const exportInventory = () => {
      const rows = [['Name', 'SKU', 'Category', 'Stock', 'Min stock', 'Unit price', 'Value', 'Status']]
      for (const p of filteredProducts.value) rows.push([p.name, p.sku, p.category, p.stock_quantity, p.min_stock_level, p.unit_price, (p.stock_quantity * p.unit_price).toFixed(2), p.status])
      const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
      downloadBlob(new Blob([csv], { type: 'text/csv' }), `inventory-${new Date().toISOString().slice(0, 10)}.csv`)
    }

    const formatMoney = (amount) => {
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount || 0)
    }

    // Lifecycle
    onMounted(() => {
      loadInventoryData()
    })

    return {
      // State
      loading,
      dashboard,
      products,
      filteredProducts,
      viewMode,

      // Filters
      searchQuery,
      filterCategory,
      filterStatus,
      hideDiscontinued,

      // Modals
      showProductModal,
      showStockModal,
      editingProduct,
      selectedProduct,

      // Forms
      productForm,
      stockAdjustment,

      // Computed
      categories,

      // Methods
      filterProducts,
      resetFilters,
      getStockStatus,
      getStockBadgeClass,
      getStatusBadgeClass,
      getStockPercentage,
      editProduct,
      viewProduct,
      adjustStock,
      deleteProduct,
      saveProduct,
      saveStockAdjustment,
      closeProductModal,
      exportInventory,
      formatMoney
    }
  }
}
</script>

<style scoped>
.inventory-module {
  padding: 2rem;
  min-height: 100vh;
  background: var(--bs-body-bg);
}

.page-header {
  margin-bottom: 3rem;
}

.page-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--bs-body-color);
  margin-bottom: 0.5rem;
}

.page-subtitle {
  font-size: 1.1rem;
  color: var(--bs-secondary);
  margin: 0;
}

.stats-overview .stat-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--bs-border-radius-lg);
  padding: 2rem;
  height: 100%;
  transition: var(--transition-base);
  box-shadow: var(--card-shadow);
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--bs-box-shadow-lg);
}

.bg-gradient-primary { background: linear-gradient(135deg, var(--brand-primary) 0%, #667eea 100%); color: white; }
.bg-gradient-success { background: linear-gradient(135deg, var(--brand-success) 0%, #10b981 100%); color: white; }
.bg-gradient-warning { background: linear-gradient(135deg, var(--brand-warning) 0%, #f59e0b 100%); color: white; }
.bg-gradient-info { background: linear-gradient(135deg, var(--bs-info) 0%, #3b82f6 100%); color: white; }

.stat-content {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.stat-icon i {
  font-size: 3rem;
  opacity: 0.8;
}

.stat-value {
  font-size: 2.5rem;
  font-weight: 800;
  margin: 0;
  line-height: 1;
}

.stat-label {
  font-size: 1rem;
  margin: 0.5rem 0;
  opacity: 0.9;
}

.stat-change {
  font-size: 0.875rem;
  font-weight: 600;
}

.stat-change.positive { color: #10b981; }
.stat-change.warning { color: #f59e0b; }

.inventory-controls .search-box {
  position: relative;
}

.search-box i {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--bs-secondary);
  z-index: 5;
}

.search-box input {
  padding-left: 2.5rem;
}

.view-toggle .btn-group .btn.active {
  background-color: var(--brand-primary);
  border-color: var(--brand-primary);
  color: white;
}

.product-image img {
  width: 50px;
  height: 50px;
  object-fit: cover;
}

.product-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--bs-border-radius-lg);
  transition: var(--transition-base);
  overflow: hidden;
  box-shadow: var(--card-shadow);
}

.product-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--bs-box-shadow-lg);
}

.product-card .product-image {
  position: relative;
  height: 200px;
  overflow: hidden;
}

.product-card .product-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.stock-badge {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
}

.product-info {
  border-top: 1px solid var(--card-border);
  padding-top: 1rem;
  margin-top: 1rem;
}

.product-actions {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
}

.card {
  border: 1px solid var(--card-border);
  border-radius: var(--bs-border-radius-lg);
  box-shadow: var(--card-shadow);
  background: var(--card-bg);
}

.card-header {
  background: rgba(var(--bs-primary-rgb), 0.05);
  border-bottom: 1px solid var(--card-border);
  padding: 1.5rem;
}

.table th {
  font-weight: 600;
  color: var(--bs-body-color);
  border-bottom: 2px solid var(--card-border);
}

.modal-content {
  border: none;
  border-radius: var(--bs-border-radius-xl);
  box-shadow: var(--bs-box-shadow-xl);
}

.modal-header {
  background: var(--brand-primary-soft);
  border-bottom: 1px solid var(--card-border);
  border-radius: var(--bs-border-radius-xl) var(--bs-border-radius-xl) 0 0;
}

@media (max-width: 768px) {
  .inventory-module {
    padding: 1rem;
  }

  .page-title {
    font-size: 2rem;
  }

  .stat-content {
    flex-direction: column;
    text-align: center;
    gap: 1rem;
  }

  .stat-icon i {
    font-size: 2.5rem;
  }

  .stat-value {
    font-size: 2rem;
  }
}
</style>