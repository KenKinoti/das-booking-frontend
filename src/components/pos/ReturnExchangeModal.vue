<template>
  <div class="modal fade show d-block" tabindex="-1" style="background-color: rgba(0,0,0,0.5);">
    <div class="modal-dialog modal-xl">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">
            <i class="bi bi-arrow-return-left me-2"></i>
            Returns & Exchanges
          </h5>
          <button type="button" class="btn-close" @click="$emit('close')"></button>
        </div>
        <div class="modal-body">
          <div class="row">
            <!-- Left Panel - Transaction Lookup -->
            <div class="col-md-6">
              <h6>Find Original Transaction</h6>
              <div class="mb-3">
                <label class="form-label">Search Method</label>
                <div class="btn-group w-100" role="group">
                  <input
                    type="radio"
                    class="btn-check"
                    name="searchMethod"
                    id="receipt"
                    value="receipt"
                    v-model="searchMethod"
                  >
                  <label class="btn btn-outline-primary" for="receipt">Receipt Number</label>

                  <input
                    type="radio"
                    class="btn-check"
                    name="searchMethod"
                    id="phone"
                    value="phone"
                    v-model="searchMethod"
                  >
                  <label class="btn btn-outline-primary" for="phone">Phone Number</label>

                  <input
                    type="radio"
                    class="btn-check"
                    name="searchMethod"
                    id="card"
                    value="card"
                    v-model="searchMethod"
                  >
                  <label class="btn btn-outline-primary" for="card">Card (Last 4)</label>
                </div>
              </div>

              <div class="mb-3">
                <div class="input-group">
                  <input
                    type="text"
                    class="form-control"
                    v-model="searchValue"
                    :placeholder="getSearchPlaceholder()"
                    @keyup.enter="searchTransactions"
                  >
                  <button
                    class="btn btn-primary"
                    @click="searchTransactions"
                    :disabled="!searchValue.trim()"
                  >
                    <i class="bi bi-search"></i>
                  </button>
                </div>
              </div>

              <!-- Search Results -->
              <div v-if="searchResults.length > 0" class="mb-4">
                <h6>Search Results</h6>
                <div class="list-group">
                  <button
                    v-for="transaction in searchResults"
                    :key="transaction.id"
                    class="list-group-item list-group-item-action"
                    :class="{ active: selectedTransaction?.id === transaction.id }"
                    @click="selectTransaction(transaction)"
                  >
                    <div class="d-flex justify-content-between align-items-center">
                      <div>
                        <h6 class="mb-1">{{ transaction.transaction_number }}</h6>
                        <p class="mb-1">{{ formatDate(transaction.created_at) }}</p>
                        <small>{{ transaction.customer_name || 'Walk-in Customer' }}</small>
                      </div>
                      <div class="text-end">
                        <span class="fw-bold">${{ formatCurrency(transaction.total_amount) }}</span>
                        <br>
                        <small class="text-muted">{{ transaction.items?.length || 0 }} items</small>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              <!-- No Results -->
              <div v-else-if="searchPerformed && searchResults.length === 0" class="alert alert-warning">
                <i class="bi bi-exclamation-triangle me-2"></i>
                No transactions found matching your search.
              </div>
            </div>

            <!-- Right Panel - Return/Exchange Processing -->
            <div class="col-md-6">
              <div v-if="selectedTransaction">
                <h6>Transaction Details</h6>
                <div class="card mb-3">
                  <div class="card-body">
                    <div class="row">
                      <div class="col-6">
                        <strong>Transaction:</strong> {{ selectedTransaction.transaction_number }}<br>
                        <strong>Date:</strong> {{ formatDate(selectedTransaction.created_at) }}<br>
                        <strong>Customer:</strong> {{ selectedTransaction.customer_name || 'Walk-in' }}
                      </div>
                      <div class="col-6 text-end">
                        <strong>Total:</strong> ${{ formatCurrency(selectedTransaction.total_amount) }}<br>
                        <strong>Payment:</strong> {{ selectedTransaction.payment_method || 'Card' }}<br>
                        <strong>Items:</strong> {{ (selectedTransaction.items || []).length }}
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Return/Exchange Items -->
                <h6>Select Items to Return/Exchange</h6>
                <div class="table-responsive mb-3" style="max-height: 300px; overflow-y: auto;">
                  <table class="table table-sm">
                    <thead>
                      <tr>
                        <th>Select</th>
                        <th>Item</th>
                        <th>Qty</th>
                        <th>Price</th>
                        <th>Return Qty</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(item, index) in transactionItems" :key="index">
                        <td>
                          <div class="form-check">
                            <input
                              class="form-check-input"
                              type="checkbox"
                              v-model="item.selected"
                              @change="updateReturnItem(item)"
                            >
                          </div>
                        </td>
                        <td>{{ item.product_name || item.item_name }}</td>
                        <td>{{ item.quantity }}</td>
                        <td>${{ formatCurrency(item.unit_price) }}</td>
                        <td>
                          <input
                            type="number"
                            class="form-control form-control-sm"
                            v-model.number="item.return_quantity"
                            :max="item.quantity"
                            min="0"
                            :disabled="!item.selected"
                            style="width: 70px;"
                          >
                        </td>
                        <td>
                          <select
                            class="form-select form-select-sm"
                            v-model="item.action"
                            :disabled="!item.selected"
                          >
                            <option value="return">Return</option>
                            <option value="exchange">Exchange</option>
                          </select>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <!-- Return Reason -->
                <div class="mb-3">
                  <label class="form-label">Return Reason</label>
                  <select class="form-select" v-model="returnReason">
                    <option value="">Select reason...</option>
                    <option value="defective">Defective/Damaged</option>
                    <option value="wrong_item">Wrong Item</option>
                    <option value="not_needed">No Longer Needed</option>
                    <option value="not_as_described">Not As Described</option>
                    <option value="changed_mind">Changed Mind</option>
                    <option value="warranty">Warranty Claim</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div v-if="returnReason === 'other'" class="mb-3">
                  <label class="form-label">Additional Details</label>
                  <textarea
                    class="form-control"
                    v-model="returnNotes"
                    rows="3"
                    placeholder="Please provide additional details..."
                  ></textarea>
                </div>

                <!-- Refund/Exchange Summary -->
                <div class="card">
                  <div class="card-header">
                    <h6 class="card-title mb-0">Refund/Exchange Summary</h6>
                  </div>
                  <div class="card-body">
                    <div class="d-flex justify-content-between mb-2">
                      <span>Return Amount:</span>
                      <span class="fw-bold">${{ formatCurrency(calculateReturnAmount()) }}</span>
                    </div>
                    <div class="d-flex justify-content-between mb-2">
                      <span>Restocking Fee:</span>
                      <span>${{ formatCurrency(restockingFee) }}</span>
                    </div>
                    <hr>
                    <div class="d-flex justify-content-between">
                      <span class="fw-bold">Net Refund:</span>
                      <span class="fw-bold text-success">${{ formatCurrency(calculateNetRefund()) }}</span>
                    </div>

                    <div class="mt-3">
                      <label class="form-label">Refund Method</label>
                      <select class="form-select" v-model="refundMethod">
                        <option value="original">Original Payment Method</option>
                        <option value="cash">Cash</option>
                        <option value="store_credit">Store Credit</option>
                        <option value="exchange_only">Exchange Only</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              <div v-else class="text-center text-muted py-5">
                <i class="bi bi-search display-4"></i>
                <p class="mt-3">Search for a transaction to begin</p>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="$emit('close')">
            Cancel
          </button>
          <button
            v-if="selectedTransaction"
            type="button"
            class="btn btn-warning"
            @click="processReturn"
            :disabled="!canProcessReturn"
          >
            <i class="bi bi-arrow-return-left me-2"></i>
            Process Return/Exchange
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { posService } from '@/services/posService'

export default {
  name: 'ReturnExchangeModal',
  emits: ['close', 'transaction-processed'],
  data() {
    return {
      searchMethod: 'receipt',
      searchValue: '',
      searchResults: [],
      searchPerformed: false,
      selectedTransaction: null,
      transactionItems: [],
      returnReason: '',
      returnNotes: '',
      restockingFee: 0,
      refundMethod: 'original'
    }
  },
  computed: {
    canProcessReturn() {
      return this.selectedTransaction &&
             this.transactionItems.some(item => item.selected && item.return_quantity > 0) &&
             this.returnReason
    }
  },
  methods: {
    getSearchPlaceholder() {
      switch (this.searchMethod) {
        case 'receipt':
          return 'Enter receipt number'
        case 'phone':
          return 'Enter phone number'
        case 'card':
          return 'Enter last 4 digits'
        default:
          return 'Enter search value'
      }
    },

    async searchTransactions() {
      if (!this.searchValue.trim()) return

      this.searchPerformed = true
      try {
        // Mock search - in real implementation, call API
        this.searchResults = [
          {
            id: '1',
            transaction_number: 'TXN-2024-001',
            created_at: '2024-03-15T14:30:00Z',
            customer_name: 'John Smith',
            total_amount: 170.50,
            payment_method: 'card',
            items: [
              {
                id: '1',
                product_name: 'Engine Oil 5W-30',
                quantity: 2,
                unit_price: 35.00,
                total_price: 70.00
              },
              {
                id: '2',
                product_name: 'Brake Pads Front',
                quantity: 1,
                unit_price: 100.50,
                total_price: 100.50
              }
            ]
          }
        ]
      } catch (error) {
        console.error('Error searching transactions:', error)
        this.searchResults = []
      }
    },

    selectTransaction(transaction) {
      this.selectedTransaction = transaction
      this.transactionItems = (transaction.items || []).map(item => ({
        ...item,
        selected: false,
        return_quantity: 0,
        action: 'return'
      }))
    },

    updateReturnItem(item) {
      if (item.selected && item.return_quantity === 0) {
        item.return_quantity = item.quantity
      } else if (!item.selected) {
        item.return_quantity = 0
      }
    },

    calculateReturnAmount() {
      return this.transactionItems
        .filter(item => item.selected)
        .reduce((sum, item) => sum + (item.return_quantity * item.unit_price), 0)
    },

    calculateNetRefund() {
      return Math.max(0, this.calculateReturnAmount() - this.restockingFee)
    },

    async processReturn() {
      if (!this.canProcessReturn) return

      try {
        const returnData = {
          original_transaction_id: this.selectedTransaction.id,
          return_items: this.transactionItems
            .filter(item => item.selected && item.return_quantity > 0)
            .map(item => ({
              item_id: item.id,
              quantity: item.return_quantity,
              action: item.action,
              reason: this.returnReason,
              unit_price: item.unit_price
            })),
          return_reason: this.returnReason,
          return_notes: this.returnNotes,
          refund_method: this.refundMethod,
          refund_amount: this.calculateNetRefund(),
          restocking_fee: this.restockingFee
        }

        // Process the return
        const response = await posService.processReturn(returnData)

        this.$toast?.success('Return/Exchange processed successfully')
        this.$emit('transaction-processed', response.data)

      } catch (error) {
        console.error('Error processing return:', error)
        this.$toast?.error('Failed to process return/exchange')
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
    }
  }
}
</script>

<style scoped>
.modal-xl {
  max-width: 1200px;
}

.list-group-item.active {
  background-color: #0d6efd;
  border-color: #0d6efd;
}

.table th {
  font-weight: 600;
  color: #495057;
  border-top: none;
}

.card {
  border: 1px solid #dee2e6;
}

.card-header {
  background-color: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
}

.form-control-sm, .form-select-sm {
  font-size: 0.875rem;
}

.btn-group .btn-check:checked + .btn {
  background-color: #0d6efd;
  border-color: #0d6efd;
  color: white;
}
</style>