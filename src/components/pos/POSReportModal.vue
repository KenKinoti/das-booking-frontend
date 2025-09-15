<template>
  <div class="modal fade show d-block" tabindex="-1" style="background-color: rgba(0,0,0,0.5);">
    <div class="modal-dialog modal-xl">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">POS Reports</h5>
          <button type="button" class="btn-close" @click="$emit('close')"></button>
        </div>
        <div class="modal-body">
          <!-- Date Range Filter -->
          <div class="row mb-4">
            <div class="col-md-3">
              <label class="form-label">Start Date</label>
              <input type="date" class="form-control" v-model="dateRange.start" @change="fetchReport">
            </div>
            <div class="col-md-3">
              <label class="form-label">End Date</label>
              <input type="date" class="form-control" v-model="dateRange.end" @change="fetchReport">
            </div>
            <div class="col-md-3 d-flex align-items-end">
              <button class="btn btn-primary" @click="fetchReport">
                <i class="bi bi-arrow-clockwise me-2"></i>Refresh
              </button>
            </div>
          </div>

          <!-- Stats Overview -->
          <div class="row mb-4">
            <div class="col-md-3">
              <div class="card text-center">
                <div class="card-body">
                  <h5>{{ report.total_transactions || 0 }}</h5>
                  <small class="text-muted">Total Transactions</small>
                </div>
              </div>
            </div>
            <div class="col-md-3">
              <div class="card text-center">
                <div class="card-body">
                  <h5>${{ formatCurrency(report.total_sales || 0) }}</h5>
                  <small class="text-muted">Total Sales</small>
                </div>
              </div>
            </div>
            <div class="col-md-3">
              <div class="card text-center">
                <div class="card-body">
                  <h5>${{ formatCurrency(report.total_tax || 0) }}</h5>
                  <small class="text-muted">Total Tax</small>
                </div>
              </div>
            </div>
            <div class="col-md-3">
              <div class="card text-center">
                <div class="card-body">
                  <h5>${{ formatCurrency(report.average_transaction || 0) }}</h5>
                  <small class="text-muted">Average Transaction</small>
                </div>
              </div>
            </div>
          </div>

          <!-- Charts and Tables -->
          <div class="row">
            <div class="col-md-6">
              <h6>Top Products</h6>
              <div class="table-responsive" style="max-height: 300px;">
                <table class="table table-sm">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Qty Sold</th>
                      <th>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="product in report.top_products" :key="product.item_name">
                      <td>{{ product.item_name }}</td>
                      <td>{{ product.total_quantity }}</td>
                      <td>${{ formatCurrency(product.total_sales) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div class="col-md-6">
              <h6>Sales by Payment Method</h6>
              <div class="table-responsive" style="max-height: 300px;">
                <table class="table table-sm">
                  <thead>
                    <tr>
                      <th>Payment Method</th>
                      <th>Amount</th>
                      <th>Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="payment in report.sales_by_payment_method" :key="payment.method">
                      <td class="text-capitalize">{{ payment.method }}</td>
                      <td>${{ formatCurrency(payment.total_amount) }}</td>
                      <td>{{ calculatePercentage(payment.total_amount) }}%</td>
                    </tr>
                  </tbody>
                </table>
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
import { posService } from '@/services/posService'

export default {
  name: 'POSReportModal',
  emits: ['close'],
  data() {
    return {
      loading: false,
      report: {},
      dateRange: {
        start: new Date().toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
      }
    }
  },
  async created() {
    await this.fetchReport()
  },
  methods: {
    async fetchReport() {
      this.loading = true
      try {
        const response = await posService.getPOSReport({
          start_date: this.dateRange.start,
          end_date: this.dateRange.end
        })
        this.report = response.data.report
      } catch (error) {
        console.error('Error fetching report:', error)
      } finally {
        this.loading = false
      }
    },

    calculatePercentage(amount) {
      const total = this.report.total_sales || 0
      return total > 0 ? ((amount / total) * 100).toFixed(1) : 0
    },

    exportReport() {
      console.log('Exporting POS report...')
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