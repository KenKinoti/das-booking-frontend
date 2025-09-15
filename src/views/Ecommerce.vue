<template>
  <div class="ecommerce-page">
    <!-- Action Buttons Section -->
    <div class="page-actions d-flex justify-content-end mb-4">
      <button class="btn btn-primary" @click="showProductModal = true">
        <i class="fas fa-plus me-2"></i>
        Add Product
      </button>
    </div>

    <div class="stats-overview">
      <div class="row g-4">
        <div class="col-md-3 col-sm-6">
          <div class="stat-card">
            <div class="stat-icon bg-primary">
              <i class="fas fa-shopping-bag"></i>
            </div>
            <div class="stat-info">
              <h3 class="stat-number">1,247</h3>
              <p class="stat-label">Products</p>
            </div>
          </div>
        </div>
        <div class="col-md-3 col-sm-6">
          <div class="stat-card">
            <div class="stat-icon bg-success">
              <i class="fas fa-chart-line"></i>
            </div>
            <div class="stat-info">
              <h3 class="stat-number">$45,890</h3>
              <p class="stat-label">Monthly Sales</p>
            </div>
          </div>
        </div>
        <div class="col-md-3 col-sm-6">
          <div class="stat-card">
            <div class="stat-icon bg-warning">
              <i class="fas fa-clipboard-list"></i>
            </div>
            <div class="stat-info">
              <h3 class="stat-number">156</h3>
              <p class="stat-label">Orders</p>
            </div>
          </div>
        </div>
        <div class="col-md-3 col-sm-6">
          <div class="stat-card">
            <div class="stat-icon bg-info">
              <i class="fas fa-users"></i>
            </div>
            <div class="stat-info">
              <h3 class="stat-number">892</h3>
              <p class="stat-label">Customers</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="main-content">
      <div class="row g-4">
        <div class="col-lg-8">
          <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
              <h5 class="card-title mb-0">
                <i class="fas fa-box me-2"></i>
                Product Catalog
              </h5>
              <div class="d-flex gap-2">
                <select class="form-select form-select-sm" v-model="selectedCategory" style="width: auto;">
                  <option value="">All Categories</option>
                  <option v-for="category in categories" :key="category" :value="category">
                    {{ category }}
                  </option>
                </select>
                <div class="btn-group btn-group-sm">
                  <button class="btn" :class="{ 'btn-primary': viewMode === 'table', 'btn-outline-primary': viewMode !== 'table' }" @click="viewMode = 'table'">
                    <i class="fas fa-list"></i>
                  </button>
                  <button class="btn" :class="{ 'btn-primary': viewMode === 'grid', 'btn-outline-primary': viewMode !== 'grid' }" @click="viewMode = 'grid'">
                    <i class="fas fa-th"></i>
                  </button>
                </div>
              </div>
            </div>
            <div class="card-body">
              <!-- Table View -->
              <div v-if="viewMode === 'table'" class="table-responsive">
                <table class="table table-hover">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Category</th>
                      <th>Price</th>
                      <th>Stock</th>
                      <th>Status</th>
                      <th>Sales</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="product in filteredProducts" :key="product.id">
                      <td>
                        <div class="d-flex align-items-center">
                          <div class="product-image me-3">
                            <i class="fas fa-image text-muted"></i>
                          </div>
                          <div>
                            <div class="fw-semibold">{{ product.name }}</div>
                            <small class="text-muted">SKU: {{ product.sku }}</small>
                          </div>
                        </div>
                      </td>
                      <td>{{ product.category }}</td>
                      <td>{{ formatCurrency(product.price) }}</td>
                      <td>
                        <span class="badge" :class="getStockClass(product.stock)">
                          {{ product.stock }}
                        </span>
                      </td>
                      <td>
                        <span class="badge" :class="getStatusClass(product.status)">
                          {{ product.status }}
                        </span>
                      </td>
                      <td>{{ product.sales }}</td>
                      <td>
                        <div class="btn-group btn-group-sm">
                          <button class="btn btn-outline-primary" @click="viewProduct(product)">
                            <i class="fas fa-eye"></i>
                          </button>
                          <button class="btn btn-outline-success" @click="editProduct(product)">
                            <i class="fas fa-edit"></i>
                          </button>
                          <button class="btn btn-outline-info" @click="syncProduct(product)">
                            <i class="fas fa-sync"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Grid View -->
              <div v-else class="row g-3">
                <div v-for="product in filteredProducts" :key="product.id" class="col-md-4 col-lg-3">
                  <div class="product-card">
                    <div class="product-image-placeholder">
                      <i class="fas fa-image"></i>
                    </div>
                    <div class="product-info">
                      <h6 class="product-name">{{ product.name }}</h6>
                      <p class="product-category text-muted small">{{ product.category }}</p>
                      <div class="product-price">{{ formatCurrency(product.price) }}</div>
                      <div class="product-stock">
                        <span class="badge" :class="getStockClass(product.stock)">
                          {{ product.stock }} in stock
                        </span>
                      </div>
                      <div class="product-actions mt-2">
                        <button class="btn btn-sm btn-outline-primary me-1" @click="viewProduct(product)">
                          <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-success me-1" @click="editProduct(product)">
                          <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-info" @click="syncProduct(product)">
                          <i class="fas fa-sync"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-lg-4">
          <div class="card">
            <div class="card-header">
              <h5 class="card-title mb-0">
                <i class="fas fa-chart-pie me-2"></i>
                Sales Channels
              </h5>
            </div>
            <div class="card-body">
              <div class="channel-item" v-for="channel in salesChannels" :key="channel.name">
                <div class="d-flex justify-content-between align-items-center mb-2">
                  <div class="d-flex align-items-center">
                    <i :class="channel.icon" class="me-2"></i>
                    <span class="fw-medium">{{ channel.name }}</span>
                  </div>
                  <div class="text-end">
                    <div class="fw-bold">{{ formatCurrency(channel.sales) }}</div>
                    <small class="text-muted">{{ channel.orders }} orders</small>
                  </div>
                </div>
                <div class="channel-status">
                  <span class="badge" :class="getChannelStatusClass(channel.status)">
                    {{ channel.status }}
                  </span>
                  <small class="text-muted ms-2">Last sync: {{ channel.lastSync }}</small>
                </div>
                <hr v-if="channel !== salesChannels[salesChannels.length - 1]">
              </div>
            </div>
          </div>

          <div class="card mt-4">
            <div class="card-header">
              <h5 class="card-title mb-0">
                <i class="fas fa-shipping-fast me-2"></i>
                Recent Orders
              </h5>
            </div>
            <div class="card-body">
              <div class="order-item" v-for="order in recentOrders" :key="order.id">
                <div class="d-flex justify-content-between align-items-start mb-2">
                  <div>
                    <div class="fw-semibold">#{{ order.id }}</div>
                    <small class="text-muted">{{ order.customer }}</small>
                  </div>
                  <div class="text-end">
                    <div class="fw-bold">{{ formatCurrency(order.total) }}</div>
                    <span class="badge" :class="getOrderStatusClass(order.status)">
                      {{ order.status }}
                    </span>
                  </div>
                </div>
                <div class="order-details">
                  <small class="text-muted">{{ order.items }} items • {{ order.channel }}</small>
                </div>
                <hr v-if="order !== recentOrders[recentOrders.length - 1]">
              </div>
            </div>
          </div>

          <div class="card mt-4">
            <div class="card-header">
              <h5 class="card-title mb-0">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Low Stock Alerts
              </h5>
            </div>
            <div class="card-body">
              <div class="alert-item" v-for="alert in lowStockAlerts" :key="alert.id">
                <div class="d-flex justify-content-between align-items-center">
                  <div>
                    <div class="fw-semibold">{{ alert.product }}</div>
                    <small class="text-muted">SKU: {{ alert.sku }}</small>
                  </div>
                  <span class="badge bg-warning">{{ alert.stock }} left</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Product Modal -->
    <div class="modal fade" :class="{ show: showProductModal }" :style="{ display: showProductModal ? 'block' : 'none' }" v-if="showProductModal" @click.self="showProductModal = false">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Add New Product</h5>
            <button type="button" class="btn-close" @click="showProductModal = false"></button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="createProduct">
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">Product Name</label>
                  <input type="text" class="form-control" v-model="newProduct.name" required>
                </div>
                <div class="col-md-6">
                  <label class="form-label">SKU</label>
                  <input type="text" class="form-control" v-model="newProduct.sku" required>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Category</label>
                  <select class="form-select" v-model="newProduct.category" required>
                    <option value="">Select Category</option>
                    <option v-for="category in categories" :key="category" :value="category">
                      {{ category }}
                    </option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Price</label>
                  <input type="number" class="form-control" v-model="newProduct.price" min="0" step="0.01" required>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Stock Quantity</label>
                  <input type="number" class="form-control" v-model="newProduct.stock" min="0" required>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Status</label>
                  <select class="form-select" v-model="newProduct.status">
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Draft">Draft</option>
                  </select>
                </div>
                <div class="col-12">
                  <label class="form-label">Description</label>
                  <textarea class="form-control" v-model="newProduct.description" rows="3"></textarea>
                </div>
                <div class="col-12">
                  <label class="form-label">Tags</label>
                  <input type="text" class="form-control" v-model="newProduct.tags" placeholder="Comma-separated tags">
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showProductModal = false">
              Cancel
            </button>
            <button type="button" class="btn btn-primary" @click="createProduct">
              <i class="fas fa-save me-2"></i>
              Add Product
            </button>
          </div>
        </div>
      </div>
    </div>
    <div class="modal-backdrop fade show" v-if="showProductModal"></div>
  </div>
</template>

<script>
export default {
  name: 'Ecommerce',
  data() {
    return {
      viewMode: 'table', // 'table' or 'grid'
      selectedCategory: '',
      showProductModal: false,
      categories: ['Electronics', 'Clothing', 'Home & Garden', 'Sports', 'Books', 'Health & Beauty'],
      newProduct: {
        name: '',
        sku: '',
        category: '',
        price: 0,
        stock: 0,
        status: 'Active',
        description: '',
        tags: ''
      },
      products: [
        {
          id: 1,
          name: 'Wireless Headphones',
          sku: 'WH-001',
          category: 'Electronics',
          price: 99.99,
          stock: 45,
          status: 'Active',
          sales: 156
        },
        {
          id: 2,
          name: 'Cotton T-Shirt',
          sku: 'TS-002',
          category: 'Clothing',
          price: 24.99,
          stock: 3,
          status: 'Active',
          sales: 89
        },
        {
          id: 3,
          name: 'Garden Hose',
          sku: 'GH-003',
          category: 'Home & Garden',
          price: 39.99,
          stock: 0,
          status: 'Inactive',
          sales: 23
        }
      ],
      salesChannels: [
        {
          name: 'Website',
          icon: 'fas fa-globe',
          sales: 15420,
          orders: 87,
          status: 'Connected',
          lastSync: '2 minutes ago'
        },
        {
          name: 'Amazon',
          icon: 'fab fa-amazon',
          sales: 12350,
          orders: 45,
          status: 'Connected',
          lastSync: '5 minutes ago'
        },
        {
          name: 'eBay',
          icon: 'fab fa-ebay',
          sales: 8920,
          orders: 32,
          status: 'Error',
          lastSync: '1 hour ago'
        },
        {
          name: 'Facebook Shop',
          icon: 'fab fa-facebook',
          sales: 5640,
          orders: 18,
          status: 'Connected',
          lastSync: '10 minutes ago'
        }
      ],
      recentOrders: [
        {
          id: '12847',
          customer: 'John Smith',
          total: 159.99,
          status: 'Processing',
          items: 3,
          channel: 'Website'
        },
        {
          id: '12846',
          customer: 'Sarah Johnson',
          total: 89.50,
          status: 'Shipped',
          items: 2,
          channel: 'Amazon'
        },
        {
          id: '12845',
          customer: 'Mike Davis',
          total: 234.99,
          status: 'Delivered',
          items: 5,
          channel: 'Website'
        }
      ],
      lowStockAlerts: [
        {
          id: 1,
          product: 'Cotton T-Shirt',
          sku: 'TS-002',
          stock: 3
        },
        {
          id: 2,
          product: 'Garden Hose',
          sku: 'GH-003',
          stock: 0
        }
      ]
    }
  },
  computed: {
    filteredProducts() {
      if (!this.selectedCategory) return this.products
      return this.products.filter(product => product.category === this.selectedCategory)
    }
  },
  methods: {
    getStockClass(stock) {
      if (stock === 0) return 'bg-danger'
      if (stock <= 10) return 'bg-warning'
      return 'bg-success'
    },
    getStatusClass(status) {
      const statusClasses = {
        'Active': 'bg-success',
        'Inactive': 'bg-secondary',
        'Draft': 'bg-warning'
      }
      return statusClasses[status] || 'bg-secondary'
    },
    getChannelStatusClass(status) {
      const statusClasses = {
        'Connected': 'bg-success',
        'Error': 'bg-danger',
        'Disconnected': 'bg-secondary'
      }
      return statusClasses[status] || 'bg-secondary'
    },
    getOrderStatusClass(status) {
      const statusClasses = {
        'Processing': 'bg-warning',
        'Shipped': 'bg-info',
        'Delivered': 'bg-success',
        'Cancelled': 'bg-danger'
      }
      return statusClasses[status] || 'bg-secondary'
    },
    formatCurrency(amount) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(amount)
    },
    viewProduct(product) {
      console.log('Viewing product:', product)
    },
    editProduct(product) {
      console.log('Editing product:', product)
    },
    syncProduct(product) {
      console.log('Syncing product:', product)
    },
    createProduct() {
      console.log('Creating product:', this.newProduct)
      // Reset form
      this.newProduct = {
        name: '',
        sku: '',
        category: '',
        price: 0,
        stock: 0,
        status: 'Active',
        description: '',
        tags: ''
      }
      this.showProductModal = false
    }
  }
}
</script>

<style scoped>
.product-image {
  width: 40px;
  height: 40px;
  background: var(--tertiary-bg);
  border-radius: var(--border-radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
}

.product-card {
  background: var(--card-background);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  padding: 1rem;
  height: 100%;
  transition: var(--transition-fast);
}

.product-card:hover {
  box-shadow: var(--shadow-medium);
  transform: translateY(-2px);
}

.product-image-placeholder {
  width: 100%;
  height: 120px;
  background: var(--tertiary-bg);
  border-radius: var(--border-radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  font-size: 2rem;
  margin-bottom: 1rem;
}

.product-name {
  margin-bottom: 0.25rem;
  font-weight: 600;
}

.product-price {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--primary-color);
  margin: 0.5rem 0;
}

.channel-item {
  margin-bottom: 1rem;
}

.channel-status {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.order-item,
.alert-item {
  margin-bottom: 1rem;
  padding-bottom: 1rem;
}

.order-item:last-child,
.alert-item:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
}
</style>