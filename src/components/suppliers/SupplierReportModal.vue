<template>
  <div class="modal fade show d-block" tabindex="-1" style="background-color: rgba(0,0,0,0.5);">
    <div class="modal-dialog modal-xl">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Supplier Reports</h5>
          <button type="button" class="btn-close" @click="$emit('close')"></button>
        </div>
        <div class="modal-body">
          <!-- Stats Overview -->
          <div class="row mb-4">
            <div class="col-md-3">
              <div class="card text-center">
                <div class="card-body">
                  <h5>{{ report.total_suppliers || 0 }}</h5>
                  <small class="text-muted">Total Suppliers</small>
                </div>
              </div>
            </div>
            <div class="col-md-3">
              <div class="card text-center">
                <div class="card-body">
                  <h5>{{ report.active_suppliers || 0 }}</h5>
                  <small class="text-muted">Active Suppliers</small>
                </div>
              </div>
            </div>
            <div class="col-md-3">
              <div class="card text-center">
                <div class="card-body">
                  <h5>${{ formatCurrency(report.total_purchases || 0) }}</h5>
                  <small class="text-muted">Total Purchases</small>
                </div>
              </div>
            </div>
            <div class="col-md-3">
              <div class="card text-center">
                <div class="card-body">
                  <h5>{{ (report.recent_orders || []).length }}</h5>
                  <small class="text-muted">Recent Orders</small>
                </div>
              </div>
            </div>
          </div>

          <div class="row">
            <!-- Top Suppliers -->
            <div class="col-md-6">
              <h6>Top Suppliers by Purchase Amount</h6>
              <div class="table-responsive" style="max-height: 300px;">
                <table class="table table-sm">
                  <thead>
                    <tr>
                      <th>Supplier</th>
                      <th>Orders</th>
                      <th>Total Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="supplier in report.top_suppliers" :key="supplier.supplier_name">
                      <td>{{ supplier.supplier_name }}</td>
                      <td>{{ supplier.order_count }}</td>
                      <td>${{ formatCurrency(supplier.total_amount) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Recent Orders -->
            <div class="col-md-6">
              <h6>Recent Purchase Orders</h6>
              <div class="table-responsive" style="max-height: 300px;">
                <table class="table table-sm">
                  <thead>
                    <tr>
                      <th>Order #</th>
                      <th>Supplier</th>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="order in report.recent_orders" :key="order.id">
                      <td>{{ order.order_number }}</td>
                      <td>{{ order.supplier?.name }}</td>
                      <td>{{ formatDate(order.order_date) }}</td>
                      <td>${{ formatCurrency(order.total_amount) }}</td>
                      <td>
                        <span class="badge" :class="getStatusBadgeClass(order.status)">
                          {{ order.status }}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Purchase Trends -->
          <div class="mt-4">
            <h6>Purchase Summary</h6>
            <div class="row">
              <div class="col-md-4">
                <div class="card">
                  <div class="card-body text-center">
                    <h6>Average Order Value</h6>
                    <h4>${{ formatCurrency(averageOrderValue) }}</h4>
                  </div>
                </div>
              </div>
              <div class="col-md-4">
                <div class="card">
                  <div class="card-body text-center">
                    <h6>Orders This Month</h6>
                    <h4>{{ currentMonthOrders }}</h4>
                  </div>
                </div>
              </div>
              <div class="col-md-4">
                <div class="card">
                  <div class="card-body text-center">
                    <h6>Pending Orders</h6>
                    <h4>{{ pendingOrders }}</h4>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="$emit('close')">Close</button>
          <button type="button" class="btn btn-primary" @click="exportReport">Export Report</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { supplierService } from '@/services/supplierService'

export default {
  name: 'SupplierReportModal',
  emits: ['close'],
  data() {
    return {
      loading: false,
      report: {}
    }
  },
  computed: {
    averageOrderValue() {
      const orders = this.report.recent_orders || []
      if (orders.length === 0) return 0
      const total = orders.reduce((sum, order) => sum + order.total_amount, 0)
      return total / orders.length
    },

    currentMonthOrders() {
      const orders = this.report.recent_orders || []
      const currentMonth = new Date().getMonth()
      const currentYear = new Date().getFullYear()

      return orders.filter(order => {
        const orderDate = new Date(order.order_date)
        return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear
      }).length
    },

    pendingOrders() {
      const orders = this.report.recent_orders || []
      return orders.filter(order => ['draft', 'sent'].includes(order.status)).length
    }
  },
  async created() {
    await this.fetchReport()
  },
  methods: {
    async fetchReport() {
      this.loading = true
      try {
        const response = await supplierService.getSupplierReport()
        this.report = response.data.report
      } catch (error) {
        console.error('Error fetching report:', error)
      } finally {
        this.loading = false
      }
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

    exportReport() {
      console.log('Exporting supplier report...')
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
    }
  }
}
</script>