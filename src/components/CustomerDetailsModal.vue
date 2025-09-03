<template>
  <div v-if="show" class="modal-overlay" @click="closeModal">
    <div class="modal-container" @click.stop>
      <div class="modal-header">
        <h2>Customer Details</h2>
        <button @click="closeModal" class="btn-close">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <div class="modal-content">
        <div class="customer-profile">
          <div class="customer-avatar">
            {{ getInitials(customer?.first_name, customer?.last_name) }}
          </div>
          <div class="customer-info">
            <h3>{{ customer?.first_name }} {{ customer?.last_name }}</h3>
            <p class="customer-status" :class="{ active: customer?.is_active, inactive: !customer?.is_active }">
              {{ customer?.is_active ? 'Active Customer' : 'Inactive Customer' }}
            </p>
          </div>
        </div>

        <div class="details-grid">
          <div class="detail-section">
            <h4><i class="fas fa-address-book"></i> Contact Information</h4>
            <div class="detail-item">
              <strong>Email:</strong>
              <span>{{ customer?.email || 'Not provided' }}</span>
            </div>
            <div class="detail-item">
              <strong>Phone:</strong>
              <span>{{ customer?.phone || 'Not provided' }}</span>
            </div>
          </div>

          <div class="detail-section">
            <h4><i class="fas fa-map-marker-alt"></i> Address</h4>
            <div class="detail-item">
              <strong>Street:</strong>
              <span>{{ customer?.address?.street || 'Not provided' }}</span>
            </div>
            <div class="detail-item">
              <strong>Suburb:</strong>
              <span>{{ customer?.address?.suburb || 'Not provided' }}</span>
            </div>
            <div class="detail-item">
              <strong>State:</strong>
              <span>{{ customer?.address?.state || 'Not provided' }}</span>
            </div>
            <div class="detail-item">
              <strong>Postcode:</strong>
              <span>{{ customer?.address?.postcode || 'Not provided' }}</span>
            </div>
          </div>

          <div class="detail-section" v-if="customer?.vehicles?.length">
            <h4><i class="fas fa-car"></i> Vehicles</h4>
            <div class="vehicles-list">
              <div 
                v-for="vehicle in customer.vehicles" 
                :key="vehicle.id"
                class="vehicle-item"
              >
                <div class="vehicle-info">
                  <strong>{{ vehicle.make }} {{ vehicle.model }}</strong>
                  <span class="license-plate">{{ vehicle.license_plate }}</span>
                </div>
                <div class="vehicle-year">{{ vehicle.year }}</div>
              </div>
            </div>
          </div>

          <div class="detail-section">
            <h4><i class="fas fa-calendar-alt"></i> Account Information</h4>
            <div class="detail-item">
              <strong>Joined:</strong>
              <span>{{ formatDate(customer?.created_at) }}</span>
            </div>
            <div class="detail-item">
              <strong>Last Updated:</strong>
              <span>{{ formatDate(customer?.updated_at) }}</span>
            </div>
          </div>

          <div class="detail-section" v-if="customer?.notes">
            <h4><i class="fas fa-sticky-note"></i> Notes</h4>
            <p class="notes-text">{{ customer.notes }}</p>
          </div>
        </div>

        <div class="modal-actions">
          <button @click="closeModal" class="btn btn-outline">
            Close
          </button>
          <button @click="editCustomer" class="btn btn-primary">
            <i class="fas fa-edit"></i>
            Edit Customer
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
// import { computed } from 'vue' // unused import

export default {
  name: 'CustomerDetailsModal',
  props: {
    show: {
      type: Boolean,
      default: false
    },
    customer: {
      type: Object,
      default: null
    }
  },
  emits: ['close', 'edit'],
  setup(props, { emit }) {
    const closeModal = () => {
      emit('close')
    }

    const editCustomer = () => {
      emit('edit', props.customer)
      closeModal()
    }

    const getInitials = (firstName, lastName) => {
      return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase()
    }

    const formatDate = (dateString) => {
      if (!dateString) return 'Not available'
      return new Date(dateString).toLocaleDateString('en-AU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }

    return {
      closeModal,
      editCustomer,
      getInitials,
      formatDate
    }
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--spacing-lg);
}

.modal-container {
  background: white;
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-strong);
  width: 100%;
  max-width: 700px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-xl);
  border-bottom: 1px solid var(--border-color);
  background: var(--gradient-primary);
  color: white;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
}

.btn-close {
  background: none;
  border: none;
  color: white;
  font-size: 1.2rem;
  cursor: pointer;
  padding: var(--spacing-sm);
  border-radius: 50%;
  transition: all 0.2s ease;
}

.btn-close:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: rotate(90deg);
}

.modal-content {
  padding: var(--spacing-xl);
  overflow-y: auto;
  flex: 1;
}

.customer-profile {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
  padding: var(--spacing-lg);
  background: var(--bg-secondary);
  border-radius: var(--border-radius);
}

.customer-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: var(--gradient-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.8rem;
}

.customer-info h3 {
  margin: 0 0 var(--spacing-sm) 0;
  color: var(--text-primary);
  font-size: 1.5rem;
  font-weight: 700;
}

.customer-status {
  margin: 0;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.customer-status.active {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.customer-status.inactive {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.details-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--spacing-lg);
}

.detail-section {
  background: white;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  padding: var(--spacing-lg);
}

.detail-section h4 {
  margin: 0 0 var(--spacing-md) 0;
  color: var(--text-primary);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  border-bottom: 2px solid var(--border-color);
  padding-bottom: var(--spacing-sm);
}

.detail-section h4 i {
  color: var(--primary);
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-sm) 0;
  border-bottom: 1px solid var(--border-color);
}

.detail-item:last-child {
  border-bottom: none;
}

.detail-item strong {
  color: var(--text-primary);
  min-width: 120px;
}

.detail-item span {
  color: var(--text-secondary);
  text-align: right;
}

.vehicles-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.vehicle-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md);
  background: var(--bg-secondary);
  border-radius: var(--border-radius);
  border: 1px solid var(--border-color);
}

.vehicle-info strong {
  color: var(--text-primary);
  display: block;
}

.license-plate {
  color: var(--text-secondary);
  font-family: monospace;
  font-size: 0.9rem;
  margin-top: 2px;
}

.vehicle-year {
  color: var(--text-secondary);
  font-weight: 600;
}

.notes-text {
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0;
  background: var(--bg-secondary);
  padding: var(--spacing-md);
  border-radius: var(--border-radius);
  border-left: 4px solid var(--primary);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-md);
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--border-color);
  margin-top: var(--spacing-lg);
}

@media (max-width: 768px) {
  .modal-overlay {
    padding: var(--spacing-md);
  }
  
  .modal-container {
    max-height: 95vh;
  }
  
  .modal-header,
  .modal-content {
    padding: var(--spacing-lg);
  }
  
  .customer-profile {
    flex-direction: column;
    text-align: center;
  }
  
  .detail-item {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-xs);
  }
  
  .detail-item span {
    text-align: left;
  }
  
  .vehicle-item {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>