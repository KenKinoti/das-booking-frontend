<template>
  <div class="suppliers-page">
    <!-- Action Buttons Section -->
    <div class="page-actions d-flex justify-content-end mb-4">
      <button class="btn btn-outline-primary me-2" @click="showReportModal = true">
        <i class="bi bi-graph-up me-2"></i>Reports
      </button>
      <button class="btn btn-primary" @click="showSupplierModal = true">
        <i class="bi bi-plus-lg me-2"></i>Add Supplier
      </button>
    </div>

    <!-- Tabs -->
    <ul class="nav nav-tabs mb-4">
      <li class="nav-item">
        <a
          class="nav-link"
          :class="{ active: activeTab === 'suppliers' }"
          href="#"
          @click.prevent="activeTab = 'suppliers'"
        >
          <i class="bi bi-building me-2"></i>Suppliers
        </a>
      </li>
      <li class="nav-item">
        <a
          class="nav-link"
          :class="{ active: activeTab === 'purchase-orders' }"
          href="#"
          @click.prevent="activeTab = 'purchase-orders'"
        >
          <i class="bi bi-receipt me-2"></i>Purchase Orders
        </a>
      </li>
    </ul>

    <!-- Suppliers Tab -->
    <div v-if="activeTab === 'suppliers'">
      <!-- Stats Overview -->
      <div class="row mb-4">
        <div class="col-md-3">
          <div class="card border-0 shadow-sm">
            <div class="card-body text-center">
              <div class="text-primary mb-2">
                <i class="bi bi-building fs-1"></i>
              </div>
              <h4 class="card-title">{{ stats.totalSuppliers }}</h4>
              <p class="card-text text-muted">Total Suppliers</p>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card border-0 shadow-sm">
            <div class="card-body text-center">
              <div class="text-success mb-2">
                <i class="bi bi-check-circle fs-1"></i>
              </div>
              <h4 class="card-title">{{ stats.activeSuppliers }}</h4>
              <p class="card-text text-muted">Active Suppliers</p>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card border-0 shadow-sm">
            <div class="card-body text-center">
              <div class="text-info mb-2">
                <i class="bi bi-receipt fs-1"></i>
              </div>
              <h4 class="card-title">{{ purchaseOrders.length }}</h4>
              <p class="card-text text-muted">Purchase Orders</p>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card border-0 shadow-sm">
            <div class="card-body text-center">
              <div class="text-warning mb-2">
                <i class="bi bi-currency-dollar fs-1"></i>
              </div>
              <h4 class="card-title">${{ formatCurrency(stats.totalPurchases) }}</h4>
              <p class="card-text text-muted">Total Purchases</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Suppliers Table -->
      <div class="card">
        <div class="card-header">
          <div class="d-flex justify-content-between align-items-center">
            <h5 class="card-title mb-0">Suppliers</h5>
            <div class="d-flex gap-2">
              <input
                type="text"
                class="form-control form-control-sm"
                placeholder="Search suppliers..."
                v-model="supplierSearch"
                style="width: 200px;"
              >
              <select class="form-select form-select-sm" v-model="supplierStatusFilter" style="width: 120px;">
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>
        <div class="card-body p-0">
          <!-- Loading State -->
          <div v-if="loading" class="text-center py-5">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
          </div>

          <!-- Suppliers Table -->
          <div v-else class="table-responsive">
            <table class="table table-hover mb-0">
              <thead class="table-light">
                <tr>
                  <th>Supplier</th>
                  <th>Contact Person</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Rating</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="supplier in filteredSuppliers" :key="supplier.id">
                  <td>
                    <div class="fw-bold">{{ supplier.name }}</div>
                    <small class="text-muted">{{ supplier.abn }}</small>
                  </td>
                  <td>{{ supplier.contact_person }}</td>
                  <td>{{ supplier.email }}</td>
                  <td>{{ supplier.phone }}</td>
                  <td>
                    <div class="d-flex align-items-center">
                      <div class="me-2">
                        <span v-for="n in 5" :key="n" class="text-warning">
                          <i :class="n <= supplier.rating ? 'bi bi-star-fill' : 'bi bi-star'"></i>
                        </span>
                      </div>
                      <small class="text-muted">({{ supplier.rating }}/5)</small>
                    </div>
                  </td>
                  <td>
                    <span
                      class="badge"
                      :class="supplier.is_active ? 'bg-success' : 'bg-secondary'"
                    >
                      {{ supplier.is_active ? 'Active' : 'Inactive' }}
                    </span>
                  </td>
                  <td>
                    <div class="btn-group btn-group-sm">
                      <button
                        class="btn btn-outline-primary"
                        @click="editSupplier(supplier)"
                        title="Edit"
                      >
                        <i class="bi bi-pencil"></i>
                      </button>
                      <button
                        class="btn btn-outline-info"
                        @click="viewSupplierOrders(supplier)"
                        title="View Orders"
                      >
                        <i class="bi bi-receipt"></i>
                      </button>
                      <button
                        class="btn btn-outline-danger"
                        @click="deleteSupplier(supplier)"
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

          <!-- Empty State -->
          <div v-if="!loading && filteredSuppliers.length === 0" class="text-center py-5">
            <i class="bi bi-building text-muted" style="font-size: 4rem;"></i>
            <h5 class="mt-3 text-muted">No suppliers found</h5>
            <p class="text-muted">Start by adding your first supplier.</p>
            <button class="btn btn-primary" @click="showSupplierModal = true">
              <i class="bi bi-plus-lg me-2"></i>Add Supplier
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Purchase Orders Tab -->
    <div v-if="activeTab === 'purchase-orders'">
      <!-- Purchase Orders Header -->
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5>Purchase Orders</h5>
        <button class="btn btn-primary" @click="showPurchaseOrderModal = true">
          <i class="bi bi-plus-lg me-2"></i>Create Purchase Order
        </button>
      </div>

      <!-- Purchase Orders Table -->
      <div class="card">
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-hover mb-0">
              <thead class="table-light">
                <tr>
                  <th>Order Number</th>
                  <th>Supplier</th>
                  <th>Order Date</th>
                  <th>Expected Date</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="order in purchaseOrders" :key="order.id">
                  <td>
                    <div class="fw-bold">{{ order.order_number }}</div>
                  </td>
                  <td>{{ order.supplier?.name }}</td>
                  <td>{{ formatDate(order.order_date) }}</td>
                  <td>{{ formatDate(order.expected_date) || '-' }}</td>
                  <td>${{ formatCurrency(order.total_amount) }}</td>
                  <td>
                    <span
                      class="badge"
                      :class="getStatusBadgeClass(order.status)"
                    >
                      {{ order.status }}
                    </span>
                  </td>
                  <td>
                    <div class="btn-group btn-group-sm">
                      <button
                        class="btn btn-outline-primary"
                        @click="viewPurchaseOrder(order)"
                        title="View"
                      >
                        <i class="bi bi-eye"></i>
                      </button>
                      <button
                        v-if="order.status === 'sent'"
                        class="btn btn-outline-success"
                        @click="receivePurchaseOrder(order)"
                        title="Receive"
                      >
                        <i class="bi bi-check-square"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <SupplierModal
      v-if="showSupplierModal"
      :supplier="selectedSupplier"
      @close="closeSupplierModal"
      @saved="handleSupplierSaved"
    />

    <PurchaseOrderModal
      v-if="showPurchaseOrderModal"
      :suppliers="suppliers"
      @close="showPurchaseOrderModal = false"
      @saved="handlePurchaseOrderSaved"
    />

    <SupplierReportModal
      v-if="showReportModal"
      @close="showReportModal = false"
    />
  </div>
</template>

<script>
import SupplierModal from '@/components/suppliers/SupplierModal.vue'
import PurchaseOrderModal from '@/components/suppliers/PurchaseOrderModal.vue'
import SupplierReportModal from '@/components/suppliers/SupplierReportModal.vue'
import { supplierService } from '@/services/supplierService'

export default {
  name: 'SuppliersPage',
  components: {
    SupplierModal,
    PurchaseOrderModal,
    SupplierReportModal
  },
  data() {
    return {
      loading: false,
      activeTab: 'suppliers',
      suppliers: [],
      purchaseOrders: [],
      stats: {
        totalSuppliers: 0,
        activeSuppliers: 0,
        totalPurchases: 0
      },
      supplierSearch: '',
      supplierStatusFilter: '',
      selectedSupplier: null,
      showSupplierModal: false,
      showPurchaseOrderModal: false,
      showReportModal: false
    }
  },
  computed: {
    filteredSuppliers() {
      let filtered = this.suppliers

      if (this.supplierSearch.trim()) {
        const query = this.supplierSearch.toLowerCase()
        filtered = filtered.filter(supplier =>
          supplier.name.toLowerCase().includes(query) ||
          supplier.email.toLowerCase().includes(query) ||
          supplier.contact_person.toLowerCase().includes(query)
        )
      }

      if (this.supplierStatusFilter) {
        const isActive = this.supplierStatusFilter === 'active'
        filtered = filtered.filter(supplier => supplier.is_active === isActive)
      }

      return filtered
    }
  },
  created() {
    this.fetchData()
  },
  methods: {
    async fetchData() {
      await Promise.all([
        this.fetchSuppliers(),
        this.fetchPurchaseOrders(),
        this.fetchStats()
      ])
    },

    async fetchSuppliers() {
      this.loading = true
      try {
        const response = await supplierService.getSuppliers()
        this.suppliers = response.data.suppliers
      } catch (error) {
        console.error('Error fetching suppliers:', error)
        this.$toast.error('Failed to fetch suppliers')
      } finally {
        this.loading = false
      }
    },

    async fetchPurchaseOrders() {
      try {
        const response = await supplierService.getPurchaseOrders()
        this.purchaseOrders = response.data.purchase_orders
      } catch (error) {
        console.error('Error fetching purchase orders:', error)
      }
    },

    async fetchStats() {
      try {
        const response = await supplierService.getSupplierReport()
        this.stats = response.data.report
      } catch (error) {
        console.error('Error fetching stats:', error)
      }
    },

    editSupplier(supplier) {
      this.selectedSupplier = { ...supplier }
      this.showSupplierModal = true
    },

    viewSupplierOrders(supplier) {
      this.activeTab = 'purchase-orders'
      // Filter orders by supplier
    },

    async deleteSupplier(supplier) {
      if (!confirm(`Are you sure you want to delete ${supplier.name}?`)) {
        return
      }

      try {
        await supplierService.deleteSupplier(supplier.id)
        this.$toast.success('Supplier deleted successfully')
        this.fetchSuppliers()
      } catch (error) {
        console.error('Error deleting supplier:', error)
        this.$toast.error('Failed to delete supplier')
      }
    },

    closeSupplierModal() {
      this.showSupplierModal = false
      this.selectedSupplier = null
    },

    handleSupplierSaved() {
      this.closeSupplierModal()
      this.fetchSuppliers()
      this.fetchStats()
    },

    handlePurchaseOrderSaved() {
      this.showPurchaseOrderModal = false
      this.fetchPurchaseOrders()
    },

    viewPurchaseOrder(order) {
      // Navigate to purchase order detail or show modal
      console.log('View purchase order:', order)
    },

    async receivePurchaseOrder(order) {
      // Show receive modal or handle receiving
      console.log('Receive purchase order:', order)
    },

    getStatusBadgeClass(status) {
      switch (status) {
        case 'draft':
          return 'bg-secondary'
        case 'sent':
          return 'bg-warning'
        case 'confirmed':
          return 'bg-info'
        case 'received':
          return 'bg-success'
        case 'cancelled':
          return 'bg-danger'
        default:
          return 'bg-secondary'
      }
    },

    formatCurrency(amount) {
      return new Intl.NumberFormat('en-AU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount || 0)
    },

    formatDate(date) {
      if (!date) return null
      return new Date(date).toLocaleDateString('en-AU')
    }
  }
}
</script>

<style scoped>
.suppliers-page {
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

.nav-tabs .nav-link {
  border-bottom: 2px solid transparent;
}

.nav-tabs .nav-link.active {
  border-bottom-color: var(--bs-primary);
  font-weight: 600;
}
</style>