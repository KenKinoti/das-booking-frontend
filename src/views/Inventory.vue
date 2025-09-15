<template>
  <div class="inventory-page">
    <!-- Action Buttons Section -->
    <div class="page-actions d-flex justify-content-end mb-4">
      <button class="btn btn-outline-primary me-2" @click="showReportModal = true">
        <i class="bi bi-graph-up me-2"></i>Reports
      </button>
      <button class="btn btn-primary" @click="showProductModal = true">
        <i class="bi bi-plus-lg me-2"></i>Add Product
      </button>
    </div>

    <!-- Stats Overview -->
    <div class="row mb-4">
      <div class="col-md-3">
        <div class="card border-0 shadow-sm">
          <div class="card-body text-center">
            <div class="text-primary mb-2">
              <i class="bi bi-box-seam fs-1"></i>
            </div>
            <h4 class="card-title">{{ stats.totalProducts }}</h4>
            <p class="card-text text-muted">Total Products</p>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card border-0 shadow-sm">
          <div class="card-body text-center">
            <div class="text-warning mb-2">
              <i class="bi bi-exclamation-triangle fs-1"></i>
            </div>
            <h4 class="card-title">{{ stats.lowStockCount }}</h4>
            <p class="card-text text-muted">Low Stock Items</p>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card border-0 shadow-sm">
          <div class="card-body text-center">
            <div class="text-danger mb-2">
              <i class="bi bi-x-circle fs-1"></i>
            </div>
            <h4 class="card-title">{{ stats.outOfStockCount }}</h4>
            <p class="card-text text-muted">Out of Stock</p>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card border-0 shadow-sm">
          <div class="card-body text-center">
            <div class="text-success mb-2">
              <i class="bi bi-currency-dollar fs-1"></i>
            </div>
            <h4 class="card-title">${{ formatCurrency(stats.totalValue) }}</h4>
            <p class="card-text text-muted">Total Stock Value</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters and Search -->
    <div class="card mb-4">
      <div class="card-body">
        <div class="row g-3">
          <div class="col-md-4">
            <label class="form-label">Search Products</label>
            <input
              type="text"
              class="form-control"
              placeholder="Search by name or SKU..."
              v-model="filters.search"
              @input="debouncedSearch"
            >
          </div>
          <div class="col-md-3">
            <label class="form-label">Category</label>
            <select class="form-select" v-model="filters.categoryId">
              <option value="">All Categories</option>
              <option v-for="category in categories" :key="category.id" :value="category.id">
                {{ category.name }}
              </option>
            </select>
          </div>
          <div class="col-md-3">
            <label class="form-label">Status</label>
            <select class="form-select" v-model="filters.status">
              <option value="">All Products</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="low_stock">Low Stock</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
          </div>
          <div class="col-md-2 d-flex align-items-end">
            <button class="btn btn-outline-secondary w-100" @click="clearFilters">
              Clear Filters
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Products Table -->
    <div class="card">
      <div class="card-header d-flex justify-content-between align-items-center">
        <h5 class="card-title mb-0">Products</h5>
        <div class="btn-group" role="group">
          <button
            type="button"
            class="btn btn-outline-primary btn-sm"
            :class="{ active: viewMode === 'table' }"
            @click="viewMode = 'table'"
          >
            <i class="bi bi-list"></i>
          </button>
          <button
            type="button"
            class="btn btn-outline-primary btn-sm"
            :class="{ active: viewMode === 'grid' }"
            @click="viewMode = 'grid'"
          >
            <i class="bi bi-grid"></i>
          </button>
        </div>
      </div>
      <div class="card-body p-0">
        <!-- Loading State -->
        <div v-if="loading" class="text-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
        </div>

        <!-- Table View -->
        <div v-else-if="viewMode === 'table'" class="table-responsive">
          <table class="table table-hover mb-0">
            <thead class="table-light">
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Current Stock</th>
                <th>Reorder Point</th>
                <th>Cost Price</th>
                <th>Selling Price</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="product in products" :key="product.id">
                <td>
                  <div class="d-flex align-items-center">
                    <img
                      :src="product.image_url || '/api/placeholder/40/40'"
                      alt="Product"
                      class="rounded me-3"
                      style="width: 40px; height: 40px; object-fit: cover;"
                    >
                    <div>
                      <div class="fw-bold">{{ product.name }}</div>
                      <small class="text-muted">{{ product.description }}</small>
                    </div>
                  </div>
                </td>
                <td>{{ product.sku }}</td>
                <td>
                  <span v-if="product.category" class="badge bg-light text-dark">
                    {{ product.category.name }}
                  </span>
                </td>
                <td>
                  <span
                    class="badge"
                    :class="getStockBadgeClass(product)"
                  >
                    {{ product.current_stock }} {{ product.unit_of_measure }}
                  </span>
                </td>
                <td>{{ product.reorder_point }}</td>
                <td>${{ formatCurrency(product.cost_price) }}</td>
                <td>${{ formatCurrency(product.selling_price) }}</td>
                <td>
                  <span
                    class="badge"
                    :class="product.is_active ? 'bg-success' : 'bg-secondary'"
                  >
                    {{ product.is_active ? 'Active' : 'Inactive' }}
                  </span>
                </td>
                <td>
                  <div class="btn-group btn-group-sm">
                    <button
                      class="btn btn-outline-primary"
                      @click="editProduct(product)"
                      title="Edit"
                    >
                      <i class="bi bi-pencil"></i>
                    </button>
                    <button
                      class="btn btn-outline-info"
                      @click="adjustStock(product)"
                      title="Adjust Stock"
                    >
                      <i class="bi bi-plus-minus"></i>
                    </button>
                    <button
                      class="btn btn-outline-danger"
                      @click="deleteProduct(product)"
                      title="Delete"
                    >
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Grid View -->
        <div v-else class="row g-3 p-3">
          <div class="col-md-4 col-lg-3" v-for="product in products" :key="product.id">
            <div class="card h-100">
              <img
                :src="product.image_url || '/api/placeholder/300/200'"
                class="card-img-top"
                alt="Product"
                style="height: 200px; object-fit: cover;"
              >
              <div class="card-body d-flex flex-column">
                <h6 class="card-title">{{ product.name }}</h6>
                <p class="card-text text-muted small">{{ product.sku }}</p>
                <div class="mt-auto">
                  <div class="d-flex justify-content-between align-items-center mb-2">
                    <small class="text-muted">Stock:</small>
                    <span
                      class="badge"
                      :class="getStockBadgeClass(product)"
                    >
                      {{ product.current_stock }}
                    </span>
                  </div>
                  <div class="d-flex justify-content-between align-items-center mb-3">
                    <small class="text-muted">Price:</small>
                    <strong>${{ formatCurrency(product.selling_price) }}</strong>
                  </div>
                  <div class="btn-group w-100">
                    <button
                      class="btn btn-outline-primary btn-sm"
                      @click="editProduct(product)"
                    >
                      Edit
                    </button>
                    <button
                      class="btn btn-outline-info btn-sm"
                      @click="adjustStock(product)"
                    >
                      Stock
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="!loading && products.length === 0" class="text-center py-5">
          <i class="bi bi-box-seam text-muted" style="font-size: 4rem;"></i>
          <h5 class="mt-3 text-muted">No products found</h5>
          <p class="text-muted">Start by adding your first product to the inventory.</p>
          <button class="btn btn-primary" @click="showProductModal = true">
            <i class="bi bi-plus-lg me-2"></i>Add Product
          </button>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <ProductModal
      v-if="showProductModal"
      :product="selectedProduct"
      :categories="categories"
      :brands="brands"
      @close="closeProductModal"
      @saved="handleProductSaved"
    />

    <StockAdjustmentModal
      v-if="showStockModal"
      :product="selectedProduct"
      @close="showStockModal = false"
      @adjusted="handleStockAdjusted"
    />

    <InventoryReportModal
      v-if="showReportModal"
      @close="showReportModal = false"
    />
  </div>
</template>

<script>
import { debounce } from 'lodash-es'
import ProductModal from '@/components/inventory/ProductModal.vue'
import StockAdjustmentModal from '@/components/inventory/StockAdjustmentModal.vue'
import InventoryReportModal from '@/components/inventory/InventoryReportModal.vue'
import { inventoryService } from '@/services/inventoryService'

export default {
  name: 'InventoryPage',
  components: {
    ProductModal,
    StockAdjustmentModal,
    InventoryReportModal
  },
  data() {
    return {
      loading: false,
      viewMode: 'table',
      products: [],
      categories: [],
      brands: [],
      stats: {
        totalProducts: 0,
        lowStockCount: 0,
        outOfStockCount: 0,
        totalValue: 0
      },
      filters: {
        search: '',
        categoryId: '',
        status: ''
      },
      selectedProduct: null,
      showProductModal: false,
      showStockModal: false,
      showReportModal: false
    }
  },
  created() {
    this.debouncedSearch = debounce(this.fetchProducts, 300)
    this.fetchData()
  },
  watch: {
    'filters.categoryId'() {
      this.fetchProducts()
    },
    'filters.status'() {
      this.fetchProducts()
    }
  },
  methods: {
    async fetchData() {
      await Promise.all([
        this.fetchProducts(),
        this.fetchCategories(),
        this.fetchBrands(),
        this.fetchStats()
      ])
    },

    async fetchProducts() {
      this.loading = true
      try {
        const params = {}
        if (this.filters.search) params.search = this.filters.search
        if (this.filters.categoryId) params.category_id = this.filters.categoryId
        if (this.filters.status === 'active') params.is_active = true
        if (this.filters.status === 'inactive') params.is_active = false

        const response = await inventoryService.getProducts(params)
        this.products = response.data.products

        // Filter by stock status if needed
        if (this.filters.status === 'low_stock') {
          this.products = this.products.filter(p => p.current_stock <= p.reorder_point && p.current_stock > 0)
        } else if (this.filters.status === 'out_of_stock') {
          this.products = this.products.filter(p => p.current_stock === 0)
        }

      } catch (error) {
        console.error('Error fetching products:', error)
        this.$toast.error('Failed to fetch products')
      } finally {
        this.loading = false
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

    async fetchBrands() {
      try {
        const response = await inventoryService.getBrands()
        this.brands = response.data.brands
      } catch (error) {
        console.error('Error fetching brands:', error)
      }
    },

    async fetchStats() {
      try {
        const response = await inventoryService.getReport()
        this.stats = {
          totalProducts: response.data.report.total_products,
          lowStockCount: response.data.report.low_stock_products.length,
          outOfStockCount: response.data.report.out_of_stock_products.length,
          totalValue: response.data.report.total_stock_value
        }
      } catch (error) {
        console.error('Error fetching stats:', error)
      }
    },

    editProduct(product) {
      this.selectedProduct = { ...product }
      this.showProductModal = true
    },

    adjustStock(product) {
      this.selectedProduct = product
      this.showStockModal = true
    },

    async deleteProduct(product) {
      if (!confirm(`Are you sure you want to delete ${product.name}?`)) {
        return
      }

      try {
        await inventoryService.deleteProduct(product.id)
        this.$toast.success('Product deleted successfully')
        this.fetchProducts()
        this.fetchStats()
      } catch (error) {
        console.error('Error deleting product:', error)
        this.$toast.error('Failed to delete product')
      }
    },

    closeProductModal() {
      this.showProductModal = false
      this.selectedProduct = null
    },

    handleProductSaved() {
      this.closeProductModal()
      this.fetchProducts()
      this.fetchStats()
    },

    handleStockAdjusted() {
      this.showStockModal = false
      this.fetchProducts()
      this.fetchStats()
    },

    clearFilters() {
      this.filters = {
        search: '',
        categoryId: '',
        status: ''
      }
      this.fetchProducts()
    },

    getStockBadgeClass(product) {
      if (product.current_stock === 0) {
        return 'bg-danger'
      } else if (product.current_stock <= product.reorder_point) {
        return 'bg-warning'
      }
      return 'bg-success'
    },

    formatCurrency(amount) {
      return new Intl.NumberFormat('en-AU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount)
    }
  }
}
</script>

<style scoped>
.inventory-page {
  min-height: 100vh;
  background-color: #f8f9fa;
  padding: 2rem;
}

.card {
  border: none;
  box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
}

.table th {
  font-weight: 600;
  border-top: none;
}

.btn-group-sm .btn {
  padding: 0.25rem 0.5rem;
}
</style>