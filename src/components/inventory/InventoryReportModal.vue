<template>
  <div class="modal fade show d-block" tabindex="-1" style="background-color: rgba(0,0,0,0.5);">
    <div class="modal-dialog modal-xl">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Inventory Reports</h5>
          <button type="button" class="btn-close" @click="$emit('close')"></button>
        </div>
        <div class="modal-body">
          <div class="row mb-4">
            <div class="col-md-3">
              <div class="card text-center">
                <div class="card-body">
                  <h5>{{ report.total_products || 0 }}</h5>
                  <small class="text-muted">Total Products</small>
                </div>
              </div>
            </div>
            <div class="col-md-3">
              <div class="card text-center">
                <div class="card-body">
                  <h5>{{ (report.low_stock_products || []).length }}</h5>
                  <small class="text-muted">Low Stock</small>
                </div>
              </div>
            </div>
            <div class="col-md-3">
              <div class="card text-center">
                <div class="card-body">
                  <h5>{{ (report.out_of_stock_products || []).length }}</h5>
                  <small class="text-muted">Out of Stock</small>
                </div>
              </div>
            </div>
            <div class="col-md-3">
              <div class="card text-center">
                <div class="card-body">
                  <h5>${{ formatCurrency(report.total_stock_value || 0) }}</h5>
                  <small class="text-muted">Stock Value</small>
                </div>
              </div>
            </div>
          </div>

          <div class="row">
            <div class="col-md-6">
              <h6>Low Stock Products</h6>
              <div class="table-responsive" style="max-height: 300px;">
                <table class="table table-sm">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Current</th>
                      <th>Reorder Point</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="product in report.low_stock_products" :key="product.id">
                      <td>{{ product.name }}</td>
                      <td>{{ product.current_stock }}</td>
                      <td>{{ product.reorder_point }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div class="col-md-6">
              <h6>Out of Stock Products</h6>
              <div class="table-responsive" style="max-height: 300px;">
                <table class="table table-sm">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Category</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="product in report.out_of_stock_products" :key="product.id">
                      <td>{{ product.name }}</td>
                      <td>{{ product.category?.name || '-' }}</td>
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
import { inventoryService } from '@/services/inventoryService'

export default {
  name: 'InventoryReportModal',
  emits: ['close'],
  data() {
    return {
      loading: false,
      report: {}
    }
  },
  async created() {
    await this.fetchReport()
  },
  methods: {
    async fetchReport() {
      this.loading = true
      try {
        const response = await inventoryService.getReport()
        this.report = response.data.report
      } catch (error) {
        console.error('Error fetching report:', error)
      } finally {
        this.loading = false
      }
    },

    exportReport() {
      // Implement export functionality
      console.log('Exporting report...')
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