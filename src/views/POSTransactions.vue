<template>
  <div class="pos-transactions-page">
    <!-- Action Buttons Section -->
    <div class="page-actions d-flex justify-content-end mb-4">
      <button class="btn btn-outline-primary me-2" @click="showTransactionReport = true">
        <i class="fas fa-chart-bar me-2"></i>Transaction Report
      </button>
      <button class="btn btn-primary" @click="$router.push('/pos')">
        <i class="fas fa-cash-register me-2"></i>New Sale
      </button>
    </div>

    <!-- Filters and Search -->
    <div class="filters-section mb-4">
      <div class="row">
        <div class="col-md-4">
          <div class="form-group">
            <label class="form-label">Search</label>
            <div class="input-group">
              <span class="input-group-text">
                <i class="fas fa-search"></i>
              </span>
              <input
                type="text"
                class="form-control"
                placeholder="Search by transaction number or customer..."
                v-model="filters.search"
                @input="fetchTransactions"
              >
            </div>
          </div>
        </div>
        <div class="col-md-2">
          <div class="form-group">
            <label class="form-label">Status</label>
            <select class="form-select" v-model="filters.status" @change="fetchTransactions">
              <option value="">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="voided">Voided</option>
            </select>
          </div>
        </div>
        <div class="col-md-2">
          <div class="form-group">
            <label class="form-label">Payment Method</label>
            <select class="form-select" v-model="filters.payment_method" @change="fetchTransactions">
              <option value="">All Methods</option>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="mixed">Mixed</option>
            </select>
          </div>
        </div>
        <div class="col-md-2">
          <div class="form-group">
            <label class="form-label">Date From</label>
            <input type="date" class="form-control" v-model="filters.date_from" @change="fetchTransactions">
          </div>
        </div>
        <div class="col-md-2">
          <div class="form-group">
            <label class="form-label">Date To</label>
            <input type="date" class="form-control" v-model="filters.date_to" @change="fetchTransactions">
          </div>
        </div>
      </div>
    </div>

    <!-- Stats Overview -->
    <div class="stats-overview mb-4">
      <div class="row">
        <div class="col-md-3">
          <div class="stat-card">
            <div class="stat-value">${{ formatCurrency(totalSales) }}</div>
            <div class="stat-label">Total Sales</div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="stat-card">
            <div class="stat-value">{{ transactions.length }}</div>
            <div class="stat-label">Transactions</div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="stat-card">
            <div class="stat-value">${{ formatCurrency(avgTransactionValue) }}</div>
            <div class="stat-label">Avg Transaction</div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="stat-card">
            <div class="stat-value">{{ todaysTransactions }}</div>
            <div class="stat-label">Today's Sales</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Transactions Table -->
    <div class="card">
      <div class="card-header">
        <h5 class="card-title mb-0">Transaction History</h5>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover mb-0">
            <thead>
              <tr>
                <th>Transaction #</th>
                <th>Date/Time</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Payment Method</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="transaction in transactions" :key="transaction.id">
                <td>
                  <span class="fw-bold text-primary">{{ transaction.transaction_number }}</span>
                </td>
                <td>
                  <div>{{ formatDate(transaction.created_at) }}</div>
                  <small class="text-muted">{{ formatTime(transaction.created_at) }}</small>
                </td>
                <td>
                  <div>{{ transaction.customer_name || 'Walk-in Customer' }}</div>
                  <small v-if="transaction.customer_id" class="text-muted">ID: {{ transaction.customer_id }}</small>
                </td>
                <td>
                  <span class="badge bg-light text-dark">{{ transaction.items?.length || 0 }} items</span>
                </td>
                <td>
                  <span class="badge" :class="getPaymentMethodBadge(transaction.payment_method)">
                    {{ formatPaymentMethod(transaction.payment_method) }}
                  </span>
                </td>
                <td>
                  <div class="fw-bold">${{ formatCurrency(transaction.total_amount) }}</div>
                  <small class="text-muted" v-if="transaction.discount_amount > 0">
                    Discount: ${{ formatCurrency(transaction.discount_amount) }}
                  </small>
                </td>
                <td>
                  <span class="badge" :class="getStatusBadge(transaction.status)">
                    {{ formatStatus(transaction.status) }}
                  </span>
                </td>
                <td>
                  <div class="btn-group">
                    <button class="btn btn-sm btn-outline-primary" @click="viewTransaction(transaction)">
                      <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-secondary" @click="printReceipt(transaction)">
                      <i class="fas fa-print"></i>
                    </button>
                    <button
                      v-if="transaction.status === 'completed'"
                      class="btn btn-sm btn-outline-danger"
                      @click="voidTransaction(transaction)"
                    >
                      <i class="fas fa-ban"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Transaction Details Modal -->
    <TransactionDetailsModal
      v-if="showTransactionDetails"
      :transaction="selectedTransaction"
      @close="showTransactionDetails = false"
    />

    <!-- Transaction Report Modal -->
    <TransactionReportModal
      v-if="showTransactionReport"
      @close="showTransactionReport = false"
    />
  </div>
</template>

<script>
import { posService } from '@/services/posService'
import TransactionDetailsModal from '@/components/pos/TransactionDetailsModal.vue'
import TransactionReportModal from '@/components/pos/TransactionReportModal.vue'

export default {
  name: 'POSTransactions',
  components: {
    TransactionDetailsModal,
    TransactionReportModal
  },
  data() {
    return {
      loading: false,
      transactions: [],
      filters: {
        search: '',
        status: '',
        payment_method: '',
        date_from: '',
        date_to: ''
      },
      showTransactionDetails: false,
      showTransactionReport: false,
      selectedTransaction: null
    }
  },
  computed: {
    totalSales() {
      return this.transactions.reduce((sum, t) => sum + t.total_amount, 0)
    },
    avgTransactionValue() {
      if (this.transactions.length === 0) return 0
      return this.totalSales / this.transactions.length
    },
    todaysTransactions() {
      const today = new Date().toISOString().split('T')[0]
      return this.transactions.filter(t => t.created_at.startsWith(today)).length
    }
  },
  async created() {
    await this.fetchTransactions()
  },
  methods: {
    async fetchTransactions() {
      this.loading = true
      try {
        const response = await posService.getTransactions(this.filters)
        this.transactions = response.data.transactions
      } catch (error) {
        console.error('Error fetching transactions:', error)
      } finally {
        this.loading = false
      }
    },

    viewTransaction(transaction) {
      this.selectedTransaction = transaction
      this.showTransactionDetails = true
    },

    printReceipt(transaction) {
      console.log('Printing receipt for transaction:', transaction.id)
      // TODO: Implement receipt printing
    },

    async voidTransaction(transaction) {
      if (!confirm(`Are you sure you want to void transaction ${transaction.transaction_number}?`)) {
        return
      }

      try {
        const reason = prompt('Please provide a reason for voiding this transaction:')
        if (!reason) return

        await posService.voidTransaction(transaction.id, reason)
        await this.fetchTransactions()
      } catch (error) {
        console.error('Error voiding transaction:', error)
      }
    },

    getPaymentMethodBadge(method) {
      switch (method) {
        case 'cash': return 'bg-success'
        case 'card': return 'bg-primary'
        case 'mixed': return 'bg-warning'
        default: return 'bg-secondary'
      }
    },

    getStatusBadge(status) {
      switch (status) {
        case 'completed': return 'bg-success'
        case 'pending': return 'bg-warning'
        case 'voided': return 'bg-danger'
        default: return 'bg-secondary'
      }
    },

    formatPaymentMethod(method) {
      const methods = {
        cash: 'Cash',
        card: 'Card',
        mixed: 'Mixed'
      }
      return methods[method] || method
    },

    formatStatus(status) {
      return status.charAt(0).toUpperCase() + status.slice(1)
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
    }
  }
}
</script>

<style scoped>
.pos-transactions-page {
  padding: 1.5rem;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  min-height: 100vh;
}

.page-header {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 4px 20px rgba(0,0,0,0.08);
}

.page-title {
  font-size: 2rem;
  font-weight: 700;
  color: #2d3748;
  margin-bottom: 0.5rem;
}

.page-subtitle {
  color: #718096;
  margin-bottom: 0;
}

.filters-section {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
}

.stats-overview .stat-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  text-align: center;
  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
  transition: transform 0.2s ease;
}

.stats-overview .stat-card:hover {
  transform: translateY(-2px);
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: #2d3748;
  margin-bottom: 0.5rem;
}

.stat-label {
  color: #718096;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.card {
  border-radius: 12px;
  border: none;
  box-shadow: 0 4px 20px rgba(0,0,0,0.08);
}

.card-header {
  background: white;
  border-bottom: 1px solid #e2e8f0;
  border-radius: 12px 12px 0 0 !important;
  padding: 1.5rem;
}

.table th {
  border-top: none;
  border-bottom: 2px solid #e2e8f0;
  font-weight: 600;
  color: #4a5568;
  background: #f8f9fa;
}

.table td {
  border-top: 1px solid #f1f5f9;
  vertical-align: middle;
  padding: 1rem 0.75rem;
}

.table-hover tbody tr:hover {
  background-color: rgba(66, 153, 225, 0.05);
}

.btn-group .btn {
  border-radius: 6px;
  margin-right: 0.25rem;
}

.form-label {
  font-weight: 600;
  color: #4a5568;
  margin-bottom: 0.5rem;
}

.form-control, .form-select {
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  padding: 0.75rem;
}

.form-control:focus, .form-select:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.badge {
  font-size: 0.75rem;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
}

.input-group-text {
  background: #f8f9fa;
  border: 1px solid #e2e8f0;
  border-right: none;
}
</style>