<template>
  <div class="production-page">
    <!-- Action Buttons Section -->
    <div class="page-actions d-flex justify-content-end mb-4">
      <button class="btn btn-primary" @click="showProductionOrderModal = true">
        <i class="fas fa-plus me-2"></i>
        New Production Order
      </button>
    </div>

    <div class="stats-overview">
      <div class="row g-4">
        <div class="col-md-3 col-sm-6">
          <div class="stat-card">
            <div class="stat-icon bg-primary">
              <i class="fas fa-clipboard-list"></i>
            </div>
            <div class="stat-info">
              <h3 class="stat-number">24</h3>
              <p class="stat-label">Active Orders</p>
            </div>
          </div>
        </div>
        <div class="col-md-3 col-sm-6">
          <div class="stat-card">
            <div class="stat-icon bg-success">
              <i class="fas fa-check-circle"></i>
            </div>
            <div class="stat-info">
              <h3 class="stat-number">156</h3>
              <p class="stat-label">Completed</p>
            </div>
          </div>
        </div>
        <div class="col-md-3 col-sm-6">
          <div class="stat-card">
            <div class="stat-icon bg-warning">
              <i class="fas fa-exclamation-triangle"></i>
            </div>
            <div class="stat-info">
              <h3 class="stat-number">3</h3>
              <p class="stat-label">Delayed</p>
            </div>
          </div>
        </div>
        <div class="col-md-3 col-sm-6">
          <div class="stat-card">
            <div class="stat-icon bg-info">
              <i class="fas fa-percentage"></i>
            </div>
            <div class="stat-info">
              <h3 class="stat-number">87%</h3>
              <p class="stat-label">Efficiency</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="main-content">
      <div class="row g-4">
        <div class="col-lg-8">
          <div class="card">
            <div class="card-header">
              <h5 class="card-title mb-0">
                <i class="fas fa-industry me-2"></i>
                Production Orders
              </h5>
            </div>
            <div class="card-body">
              <div class="table-responsive">
                <table class="table table-hover">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Product</th>
                      <th>Quantity</th>
                      <th>Status</th>
                      <th>Due Date</th>
                      <th>Progress</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="order in productionOrders" :key="order.id">
                      <td><span class="fw-semibold">#{{ order.id }}</span></td>
                      <td>{{ order.product }}</td>
                      <td>{{ order.quantity }}</td>
                      <td>
                        <span class="badge" :class="getStatusClass(order.status)">
                          {{ order.status }}
                        </span>
                      </td>
                      <td>{{ formatDate(order.dueDate) }}</td>
                      <td>
                        <div class="progress" style="height: 20px;">
                          <div
                            class="progress-bar"
                            :class="getProgressClass(order.progress)"
                            :style="{ width: order.progress + '%' }"
                          >
                            {{ order.progress }}%
                          </div>
                        </div>
                      </td>
                      <td>
                        <div class="btn-group btn-group-sm">
                          <button class="btn btn-outline-primary" @click="viewOrder(order)">
                            <i class="fas fa-eye"></i>
                          </button>
                          <button class="btn btn-outline-success" @click="updateProgress(order)">
                            <i class="fas fa-edit"></i>
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

        <div class="col-lg-4">
          <div class="card">
            <div class="card-header">
              <h5 class="card-title mb-0">
                <i class="fas fa-clock me-2"></i>
                Production Schedule
              </h5>
            </div>
            <div class="card-body">
              <div class="schedule-item" v-for="item in scheduleItems" :key="item.id">
                <div class="schedule-time">{{ item.time }}</div>
                <div class="schedule-content">
                  <h6 class="mb-1">{{ item.task }}</h6>
                  <p class="text-muted mb-0 small">{{ item.description }}</p>
                </div>
              </div>
            </div>
          </div>

          <div class="card mt-4">
            <div class="card-header">
              <h5 class="card-title mb-0">
                <i class="fas fa-chart-pie me-2"></i>
                Resource Utilization
              </h5>
            </div>
            <div class="card-body">
              <div class="resource-item" v-for="resource in resources" :key="resource.name">
                <div class="d-flex justify-content-between mb-2">
                  <span class="fw-medium">{{ resource.name }}</span>
                  <span class="text-muted">{{ resource.utilization }}%</span>
                </div>
                <div class="progress mb-3" style="height: 8px;">
                  <div
                    class="progress-bar"
                    :class="getUtilizationClass(resource.utilization)"
                    :style="{ width: resource.utilization + '%' }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Production Order Modal -->
    <div class="modal fade" :class="{ show: showProductionOrderModal }" :style="{ display: showProductionOrderModal ? 'block' : 'none' }" v-if="showProductionOrderModal" @click.self="showProductionOrderModal = false">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">New Production Order</h5>
            <button type="button" class="btn-close" @click="showProductionOrderModal = false"></button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="createProductionOrder">
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">Product</label>
                  <select class="form-select" v-model="newOrder.product" required>
                    <option value="">Select Product</option>
                    <option value="Widget A">Widget A</option>
                    <option value="Widget B">Widget B</option>
                    <option value="Component X">Component X</option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Quantity</label>
                  <input type="number" class="form-control" v-model="newOrder.quantity" min="1" required>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Due Date</label>
                  <input type="date" class="form-control" v-model="newOrder.dueDate" required>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Priority</label>
                  <select class="form-select" v-model="newOrder.priority">
                    <option value="Low">Low</option>
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
                <div class="col-12">
                  <label class="form-label">Notes</label>
                  <textarea class="form-control" v-model="newOrder.notes" rows="3"></textarea>
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showProductionOrderModal = false">
              Cancel
            </button>
            <button type="button" class="btn btn-primary" @click="createProductionOrder">
              <i class="fas fa-save me-2"></i>
              Create Order
            </button>
          </div>
        </div>
      </div>
    </div>
    <div class="modal-backdrop fade show" v-if="showProductionOrderModal"></div>
  </div>
</template>

<script>
export default {
  name: 'Production',
  data() {
    return {
      showProductionOrderModal: false,
      newOrder: {
        product: '',
        quantity: 1,
        dueDate: '',
        priority: 'Normal',
        notes: ''
      },
      productionOrders: [
        {
          id: 'PO-001',
          product: 'Widget A',
          quantity: 100,
          status: 'In Progress',
          dueDate: '2025-01-20',
          progress: 65
        },
        {
          id: 'PO-002',
          product: 'Component X',
          quantity: 50,
          status: 'Scheduled',
          dueDate: '2025-01-25',
          progress: 0
        },
        {
          id: 'PO-003',
          product: 'Widget B',
          quantity: 75,
          status: 'Delayed',
          dueDate: '2025-01-15',
          progress: 40
        }
      ],
      scheduleItems: [
        {
          id: 1,
          time: '08:00',
          task: 'Setup Machine A',
          description: 'Prepare for Widget A production'
        },
        {
          id: 2,
          time: '10:30',
          task: 'Quality Check',
          description: 'Batch QC for PO-001'
        },
        {
          id: 3,
          time: '14:00',
          task: 'Material Delivery',
          description: 'Raw materials for next batch'
        }
      ],
      resources: [
        { name: 'Machine A', utilization: 85 },
        { name: 'Machine B', utilization: 67 },
        { name: 'Assembly Line 1', utilization: 92 },
        { name: 'Quality Control', utilization: 45 }
      ]
    }
  },
  methods: {
    getStatusClass(status) {
      const statusClasses = {
        'Scheduled': 'bg-info',
        'In Progress': 'bg-warning',
        'Completed': 'bg-success',
        'Delayed': 'bg-danger'
      }
      return statusClasses[status] || 'bg-secondary'
    },
    getProgressClass(progress) {
      if (progress >= 80) return 'bg-success'
      if (progress >= 50) return 'bg-warning'
      return 'bg-danger'
    },
    getUtilizationClass(utilization) {
      if (utilization >= 90) return 'bg-danger'
      if (utilization >= 70) return 'bg-warning'
      return 'bg-success'
    },
    formatDate(dateString) {
      return new Date(dateString).toLocaleDateString()
    },
    viewOrder(order) {
      console.log('Viewing order:', order)
    },
    updateProgress(order) {
      console.log('Updating progress for order:', order)
    },
    createProductionOrder() {
      console.log('Creating production order:', this.newOrder)
      // Reset form
      this.newOrder = {
        product: '',
        quantity: 1,
        dueDate: '',
        priority: 'Normal',
        notes: ''
      }
      this.showProductionOrderModal = false
    }
  }
}
</script>

<style scoped>
.schedule-item {
  display: flex;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.schedule-item:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.schedule-time {
  font-weight: 600;
  color: var(--primary-color);
  width: 60px;
  flex-shrink: 0;
}

.schedule-content {
  flex: 1;
  margin-left: 1rem;
}

.resource-item:last-child .progress {
  margin-bottom: 0 !important;
}
</style>