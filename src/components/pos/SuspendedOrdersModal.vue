<template>
  <div class="modal fade show d-block" tabindex="-1" style="background-color: rgba(0,0,0,0.5);">
    <div class="modal-dialog modal-xl">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">
            <i class="bi bi-list-ul me-2"></i>
            Suspended Orders
          </h5>
          <button type="button" class="btn-close" @click="$emit('close')"></button>
        </div>
        <div class="modal-body">
          <div v-if="suspendedOrders.length === 0" class="text-center py-5">
            <i class="bi bi-inbox display-1 text-muted"></i>
            <p class="text-muted mt-3">No suspended orders found</p>
          </div>
          <div v-else>
            <div class="table-responsive">
              <table class="table table-hover">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Suspended At</th>
                    <th>Staff</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="order in suspendedOrders" :key="order.id">
                    <td>
                      <span class="badge bg-secondary">{{ order.id }}</span>
                    </td>
                    <td>
                      <div v-if="order.customer_id">
                        {{ getCustomerName(order.customer_id) }}
                      </div>
                      <div v-else class="text-muted">Walk-in Customer</div>
                    </td>
                    <td>
                      <div class="small">
                        <div v-for="item in order.items.slice(0, 3)" :key="item.name" class="mb-1">
                          {{ item.quantity }}x {{ item.name }}
                        </div>
                        <div v-if="order.items.length > 3" class="text-muted">
                          +{{ order.items.length - 3 }} more items
                        </div>
                      </div>
                    </td>
                    <td>
                      <div class="fw-bold">${{ calculateOrderTotal(order) }}</div>
                      <small class="text-muted">{{ order.items.length }} items</small>
                    </td>
                    <td>
                      <div>{{ formatDate(order.timestamp) }}</div>
                      <small class="text-muted">{{ formatTime(order.timestamp) }}</small>
                    </td>
                    <td>
                      <span class="badge bg-light text-dark">{{ order.staff_id }}</span>
                    </td>
                    <td>
                      <div class="btn-group">
                        <button
                          class="btn btn-sm btn-primary"
                          @click="retrieveOrder(order)"
                          title="Retrieve Order"
                        >
                          <i class="bi bi-arrow-counterclockwise"></i>
                        </button>
                        <button
                          class="btn btn-sm btn-info"
                          @click="viewOrderDetails(order)"
                          title="View Details"
                        >
                          <i class="bi bi-eye"></i>
                        </button>
                        <button
                          class="btn btn-sm btn-danger"
                          @click="deleteOrder(order)"
                          title="Delete Order"
                        >
                          <i class="bi bi-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="$emit('close')">
            Close
          </button>
          <button
            v-if="suspendedOrders.length > 0"
            type="button"
            class="btn btn-outline-danger"
            @click="clearAllSuspended"
          >
            <i class="bi bi-trash me-2"></i>
            Clear All
          </button>
        </div>
      </div>
    </div>

    <!-- Order Details Modal -->
    <div v-if="showOrderDetails" class="modal fade show d-block" tabindex="-1" style="background-color: rgba(0,0,0,0.3);">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Order Details - {{ selectedOrder.id }}</h5>
            <button type="button" class="btn-close" @click="showOrderDetails = false"></button>
          </div>
          <div class="modal-body">
            <div class="row">
              <div class="col-md-6">
                <h6>Customer Information</h6>
                <p v-if="selectedOrder.customer_id">
                  {{ getCustomerName(selectedOrder.customer_id) }}
                </p>
                <p v-else class="text-muted">Walk-in Customer</p>

                <h6>Order Information</h6>
                <ul class="list-unstyled">
                  <li><strong>Order ID:</strong> {{ selectedOrder.id }}</li>
                  <li><strong>Staff:</strong> {{ selectedOrder.staff_id }}</li>
                  <li><strong>Suspended:</strong> {{ formatDateTime(selectedOrder.timestamp) }}</li>
                  <li><strong>Items:</strong> {{ selectedOrder.items.length }}</li>
                </ul>
              </div>
              <div class="col-md-6">
                <h6>Order Items</h6>
                <div class="table-responsive">
                  <table class="table table-sm">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Qty</th>
                        <th>Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="item in selectedOrder.items" :key="item.name">
                        <td>{{ item.name }}</td>
                        <td>{{ item.quantity }}</td>
                        <td>${{ formatCurrency(item.unit_price) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div class="mt-3">
                  <div class="d-flex justify-content-between">
                    <strong>Total: ${{ calculateOrderTotal(selectedOrder) }}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showOrderDetails = false">
              Close
            </button>
            <button type="button" class="btn btn-primary" @click="retrieveSelectedOrder">
              <i class="bi bi-arrow-counterclockwise me-2"></i>
              Retrieve Order
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SuspendedOrdersModal',
  emits: ['close', 'order-selected'],
  data() {
    return {
      suspendedOrders: [],
      showOrderDetails: false,
      selectedOrder: null,
      customers: []
    }
  },
  async created() {
    await this.loadSuspendedOrders()
    await this.loadCustomers()
  },
  methods: {
    async loadSuspendedOrders() {
      try {
        const suspended = JSON.parse(localStorage.getItem('suspendedOrders') || '[]')
        this.suspendedOrders = suspended
      } catch (error) {
        console.error('Error loading suspended orders:', error)
        this.suspendedOrders = []
      }
    },

    async loadCustomers() {
      try {
        // Load customers to show names instead of IDs
        const { customerService } = await import('@/services/customerService')
        const response = await customerService.getCustomers()
        this.customers = response.data.customers
      } catch (error) {
        console.error('Error loading customers:', error)
        this.customers = []
      }
    },

    getCustomerName(customerId) {
      const customer = this.customers.find(c => c.id === customerId)
      return customer ? `${customer.first_name} ${customer.last_name}` : 'Unknown Customer'
    },

    calculateOrderTotal(order) {
      const subtotal = order.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
      const taxAmount = (subtotal * 10) / 100 // 10% tax
      const total = subtotal + taxAmount - (order.discount_amount || 0)
      return this.formatCurrency(total)
    },

    retrieveOrder(order) {
      this.$emit('order-selected', order)
    },

    viewOrderDetails(order) {
      this.selectedOrder = order
      this.showOrderDetails = true
    },

    retrieveSelectedOrder() {
      this.retrieveOrder(this.selectedOrder)
      this.showOrderDetails = false
    },

    async deleteOrder(order) {
      if (!confirm(`Are you sure you want to delete suspended order ${order.id}?`)) {
        return
      }

      try {
        // Remove from local array
        const index = this.suspendedOrders.findIndex(o => o.id === order.id)
        if (index >= 0) {
          this.suspendedOrders.splice(index, 1)
        }

        // Update localStorage
        localStorage.setItem('suspendedOrders', JSON.stringify(this.suspendedOrders))

        this.$toast?.success('Suspended order deleted')
      } catch (error) {
        console.error('Error deleting suspended order:', error)
        this.$toast?.error('Failed to delete suspended order')
      }
    },

    async clearAllSuspended() {
      if (!confirm('Are you sure you want to clear all suspended orders? This action cannot be undone.')) {
        return
      }

      try {
        this.suspendedOrders = []
        localStorage.removeItem('suspendedOrders')
        this.$toast?.success('All suspended orders cleared')
      } catch (error) {
        console.error('Error clearing suspended orders:', error)
        this.$toast?.error('Failed to clear suspended orders')
      }
    },

    formatCurrency(amount) {
      return new Intl.NumberFormat('en-AU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount || 0)
    },

    formatDate(date) {
      if (!date) return '-'
      return new Date(date).toLocaleDateString('en-AU')
    },

    formatTime(date) {
      if (!date) return '-'
      return new Date(date).toLocaleTimeString('en-AU', {
        hour: '2-digit',
        minute: '2-digit'
      })
    },

    formatDateTime(date) {
      if (!date) return '-'
      return new Date(date).toLocaleString('en-AU')
    }
  }
}
</script>

<style scoped>
.modal-xl {
  max-width: 1200px;
}

.table th {
  font-weight: 600;
  color: #495057;
  border-top: none;
}

.btn-group .btn {
  border-radius: 4px;
  margin-right: 2px;
}

.btn-group .btn:last-child {
  margin-right: 0;
}

.small {
  font-size: 0.875rem;
  line-height: 1.4;
}
</style>