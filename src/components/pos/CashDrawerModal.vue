<template>
  <div class="modal fade show d-block" tabindex="-1" style="background-color: rgba(0,0,0,0.5);">
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Cash Drawer Management</h5>
          <button type="button" class="btn-close" @click="$emit('close')"></button>
        </div>
        <div class="modal-body">
          <!-- Current Cash Drawer Status -->
          <div class="alert alert-info mb-4">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <strong>Current Status:</strong>
                <span v-if="currentDrawer" :class="currentDrawer.status === 'open' ? 'text-success' : 'text-secondary'">
                  {{ currentDrawer.status === 'open' ? 'OPEN' : 'CLOSED' }}
                </span>
                <span v-else class="text-secondary">NO ACTIVE DRAWER</span>
              </div>
              <div v-if="currentDrawer && currentDrawer.status === 'open'">
                <small class="text-muted">
                  Opened: {{ formatDateTime(currentDrawer.opened_at) }}
                </small>
              </div>
            </div>
          </div>

          <!-- Open Cash Drawer -->
          <div v-if="!currentDrawer || currentDrawer.status === 'closed'" class="card mb-4">
            <div class="card-header">
              <h6 class="mb-0">Open Cash Drawer</h6>
            </div>
            <div class="card-body">
              <form @submit.prevent="openDrawer">
                <div class="row">
                  <div class="col-md-6">
                    <div class="mb-3">
                      <label class="form-label">Terminal ID *</label>
                      <input type="text" class="form-control" v-model="openForm.terminal_id" required>
                    </div>
                  </div>
                  <div class="col-md-6">
                    <div class="mb-3">
                      <label class="form-label">Opening Amount *</label>
                      <input type="number" class="form-control" v-model.number="openForm.opening_amount" step="0.01" required>
                    </div>
                  </div>
                </div>
                <button type="submit" class="btn btn-success" :disabled="loading">
                  <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
                  Open Cash Drawer
                </button>
              </form>
            </div>
          </div>

          <!-- Close Cash Drawer -->
          <div v-if="currentDrawer && currentDrawer.status === 'open'" class="card mb-4">
            <div class="card-header">
              <h6 class="mb-0">Close Cash Drawer</h6>
            </div>
            <div class="card-body">
              <div class="row mb-3">
                <div class="col-md-6">
                  <strong>Opening Amount:</strong> ${{ formatCurrency(currentDrawer.opening_amount) }}
                </div>
                <div class="col-md-6">
                  <strong>Expected Amount:</strong> ${{ formatCurrency(expectedAmount) }}
                </div>
              </div>

              <form @submit.prevent="closeDrawer">
                <div class="row">
                  <div class="col-md-6">
                    <div class="mb-3">
                      <label class="form-label">Closing Amount *</label>
                      <input
                        type="number"
                        class="form-control"
                        v-model.number="closeForm.closing_amount"
                        step="0.01"
                        required
                        @input="calculateVariance"
                      >
                    </div>
                  </div>
                  <div class="col-md-6">
                    <div class="mb-3">
                      <label class="form-label">Variance</label>
                      <input
                        type="number"
                        class="form-control"
                        :value="variance"
                        readonly
                        :class="variance !== 0 ? (variance > 0 ? 'bg-success bg-opacity-10' : 'bg-danger bg-opacity-10') : ''"
                      >
                    </div>
                  </div>
                </div>
                <div class="mb-3">
                  <label class="form-label">Notes</label>
                  <textarea class="form-control" v-model="closeForm.notes" rows="3"></textarea>
                </div>
                <button type="submit" class="btn btn-danger" :disabled="loading">
                  <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
                  Close Cash Drawer
                </button>
              </form>
            </div>
          </div>

          <!-- Cash Drawer History -->
          <div class="card">
            <div class="card-header">
              <h6 class="mb-0">Recent Cash Drawer Sessions</h6>
            </div>
            <div class="card-body p-0">
              <div class="table-responsive">
                <table class="table table-sm mb-0">
                  <thead>
                    <tr>
                      <th>Terminal</th>
                      <th>Opened</th>
                      <th>Closed</th>
                      <th>Opening</th>
                      <th>Closing</th>
                      <th>Variance</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="drawer in recentDrawers" :key="drawer.id">
                      <td>{{ drawer.terminal_id }}</td>
                      <td>{{ formatDateTime(drawer.opened_at) }}</td>
                      <td>{{ drawer.closed_at ? formatDateTime(drawer.closed_at) : '-' }}</td>
                      <td>${{ formatCurrency(drawer.opening_amount) }}</td>
                      <td>{{ drawer.closing_amount ? '$' + formatCurrency(drawer.closing_amount) : '-' }}</td>
                      <td>
                        <span v-if="drawer.variance !== undefined"
                              :class="drawer.variance === 0 ? 'text-success' : (drawer.variance > 0 ? 'text-success' : 'text-danger')">
                          ${{ formatCurrency(Math.abs(drawer.variance)) }}
                          {{ drawer.variance > 0 ? '↑' : drawer.variance < 0 ? '↓' : '' }}
                        </span>
                        <span v-else>-</span>
                      </td>
                      <td>
                        <span class="badge" :class="drawer.status === 'open' ? 'bg-success' : 'bg-secondary'">
                          {{ drawer.status }}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="$emit('close')">Close</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { posService } from '@/services/posService'

export default {
  name: 'CashDrawerModal',
  emits: ['close'],
  data() {
    return {
      loading: false,
      currentDrawer: null,
      recentDrawers: [],
      expectedAmount: 0,
      openForm: {
        terminal_id: 'POS-001',
        opening_amount: 100.00
      },
      closeForm: {
        closing_amount: 0,
        notes: ''
      }
    }
  },
  computed: {
    variance() {
      return this.closeForm.closing_amount - this.expectedAmount
    }
  },
  async created() {
    await this.fetchCashDrawers()
  },
  methods: {
    async fetchCashDrawers() {
      this.loading = true
      try {
        const response = await posService.getCashDrawers()
        this.recentDrawers = response.data.cash_drawers

        // Find current open drawer
        this.currentDrawer = this.recentDrawers.find(drawer => drawer.status === 'open')

        if (this.currentDrawer) {
          this.expectedAmount = this.currentDrawer.expected_amount || this.currentDrawer.opening_amount
          this.closeForm.closing_amount = this.expectedAmount
        }
      } catch (error) {
        console.error('Error fetching cash drawers:', error)
      } finally {
        this.loading = false
      }
    },

    async openDrawer() {
      this.loading = true
      try {
        await posService.openCashDrawer(this.openForm)
        await this.fetchCashDrawers()
        this.openForm = {
          terminal_id: 'POS-001',
          opening_amount: 100.00
        }
      } catch (error) {
        console.error('Error opening cash drawer:', error)
      } finally {
        this.loading = false
      }
    },

    async closeDrawer() {
      if (!this.currentDrawer) return

      this.loading = true
      try {
        await posService.closeCashDrawer(this.currentDrawer.id, this.closeForm)
        await this.fetchCashDrawers()
        this.closeForm = {
          closing_amount: 0,
          notes: ''
        }
      } catch (error) {
        console.error('Error closing cash drawer:', error)
      } finally {
        this.loading = false
      }
    },

    calculateVariance() {
      // Variance is calculated in computed property
    },

    formatCurrency(amount) {
      return new Intl.NumberFormat('en-AU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount || 0)
    },

    formatDateTime(dateTime) {
      if (!dateTime) return '-'
      return new Date(dateTime).toLocaleString('en-AU')
    }
  }
}
</script>