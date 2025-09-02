<template>
  <div v-if="show" class="modal-overlay" @click="closeModal">
    <div class="modal-container" @click.stop>
      <div class="modal-header">
        <h2>Vehicle Management - {{ customer?.first_name }} {{ customer?.last_name }}</h2>
        <button @click="closeModal" class="btn-close">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <div class="modal-content">
        <div class="vehicles-header">
          <h3>Customer Vehicles</h3>
          <button @click="showAddVehicle = true" class="btn btn-primary">
            <i class="fas fa-plus"></i>
            Add Vehicle
          </button>
        </div>

        <div v-if="vehicles.length === 0" class="empty-state">
          <i class="fas fa-car"></i>
          <h4>No Vehicles</h4>
          <p>This customer doesn't have any vehicles yet.</p>
          <button @click="showAddVehicle = true" class="btn btn-primary">
            <i class="fas fa-plus"></i>
            Add First Vehicle
          </button>
        </div>

        <div v-else class="vehicles-list">
          <div 
            v-for="vehicle in vehicles" 
            :key="vehicle.id"
            class="vehicle-card"
          >
            <div class="vehicle-info">
              <h4>{{ vehicle.make }} {{ vehicle.model }}</h4>
              <div class="vehicle-details">
                <span class="license-plate">{{ vehicle.license_plate }}</span>
                <span class="year">{{ vehicle.year }}</span>
                <span class="color" v-if="vehicle.color">{{ vehicle.color }}</span>
              </div>
              <div class="vehicle-meta">
                <span class="vin" v-if="vehicle.vin">VIN: {{ vehicle.vin }}</span>
                <span class="mileage" v-if="vehicle.mileage">{{ vehicle.mileage?.toLocaleString() }} km</span>
              </div>
              <p v-if="vehicle.notes" class="vehicle-notes">{{ vehicle.notes }}</p>
            </div>
            
            <div class="vehicle-actions">
              <button 
                @click="editVehicle(vehicle)" 
                class="btn-icon btn-edit"
                title="Edit vehicle"
              >
                <i class="fas fa-edit"></i>
              </button>
              <button 
                @click="deleteVehicle(vehicle)" 
                class="btn-icon btn-delete"
                title="Delete vehicle"
              >
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button @click="closeModal" class="btn btn-outline">
            Close
          </button>
        </div>
      </div>

      <!-- Add/Edit Vehicle Modal -->
      <VehicleFormModal
        v-if="showAddVehicle || showEditVehicle"
        :show="showAddVehicle || showEditVehicle"
        :vehicle="editingVehicle"
        :customer="customer"
        @close="closeVehicleModal"
        @save="saveVehicle"
      />
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue'
import VehicleFormModal from './VehicleFormModal.vue'

export default {
  name: 'VehicleManagementModal',
  components: {
    VehicleFormModal
  },
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
  emits: ['close'],
  setup(props, { emit }) {
    const vehicles = ref([])
    const showAddVehicle = ref(false)
    const showEditVehicle = ref(false)
    const editingVehicle = ref(null)

    const closeModal = () => {
      emit('close')
    }

    const editVehicle = (vehicle) => {
      editingVehicle.value = vehicle
      showEditVehicle.value = true
    }

    const deleteVehicle = (vehicle) => {
      if (confirm(`Are you sure you want to delete ${vehicle.make} ${vehicle.model}?`)) {
        // Implementation for deleting vehicle
        const index = vehicles.value.findIndex(v => v.id === vehicle.id)
        if (index > -1) {
          vehicles.value.splice(index, 1)
        }
        console.log('Deleting vehicle:', vehicle)
      }
    }

    const closeVehicleModal = () => {
      showAddVehicle.value = false
      showEditVehicle.value = false
      editingVehicle.value = null
    }

    const saveVehicle = (vehicleData) => {
      // Implementation for saving vehicle
      if (editingVehicle.value) {
        // Update existing vehicle
        const index = vehicles.value.findIndex(v => v.id === editingVehicle.value.id)
        if (index > -1) {
          vehicles.value[index] = { ...vehicles.value[index], ...vehicleData }
        }
      } else {
        // Add new vehicle
        const newVehicle = {
          id: Date.now().toString(), // Mock ID
          ...vehicleData,
          customer_id: props.customer?.id
        }
        vehicles.value.push(newVehicle)
      }
      closeVehicleModal()
      console.log('Saving vehicle:', vehicleData)
    }

    // Watch for customer changes and load vehicles
    watch(() => props.customer, (newCustomer) => {
      if (newCustomer) {
        // Mock vehicle data - replace with actual API call
        vehicles.value = newCustomer.vehicles || []
      }
    }, { immediate: true })

    return {
      vehicles,
      showAddVehicle,
      showEditVehicle,
      editingVehicle,
      closeModal,
      editVehicle,
      deleteVehicle,
      closeVehicleModal,
      saveVehicle
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
  z-index: 1100;
  padding: var(--spacing-lg);
}

.modal-container {
  background: white;
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-strong);
  width: 100%;
  max-width: 800px;
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
  font-size: 1.3rem;
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

.vehicles-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-lg);
}

.vehicles-header h3 {
  margin: 0;
  color: var(--text-primary);
  font-weight: 600;
}

.empty-state {
  text-align: center;
  padding: var(--spacing-xl);
  color: var(--text-secondary);
}

.empty-state i {
  font-size: 3rem;
  margin-bottom: var(--spacing-lg);
  color: var(--text-muted);
}

.empty-state h4 {
  margin: 0 0 var(--spacing-sm) 0;
  color: var(--text-primary);
  font-weight: 600;
}

.vehicles-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.vehicle-card {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: var(--spacing-lg);
  background: white;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-soft);
  transition: all 0.2s ease;
}

.vehicle-card:hover {
  box-shadow: var(--shadow-medium);
  transform: translateY(-2px);
}

.vehicle-info {
  flex: 1;
}

.vehicle-info h4 {
  margin: 0 0 var(--spacing-sm) 0;
  color: var(--text-primary);
  font-weight: 600;
  font-size: 1.1rem;
}

.vehicle-details {
  display: flex;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-sm);
}

.license-plate {
  background: var(--gradient-primary);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-family: monospace;
  font-weight: 600;
  font-size: 0.9rem;
}

.year, .color {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.vehicle-meta {
  display: flex;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-sm);
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.vin {
  font-family: monospace;
}

.mileage {
  font-weight: 500;
}

.vehicle-notes {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
  font-style: italic;
  background: var(--bg-secondary);
  padding: var(--spacing-sm);
  border-radius: var(--border-radius);
  border-left: 3px solid var(--primary);
}

.vehicle-actions {
  display: flex;
  gap: var(--spacing-xs);
  margin-left: var(--spacing-md);
}

.btn-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
}

.btn-edit {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
}

.btn-edit:hover {
  background: #f59e0b;
  color: white;
  transform: scale(1.1);
}

.btn-delete {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.btn-delete:hover {
  background: #ef4444;
  color: white;
  transform: scale(1.1);
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
  
  .vehicles-header {
    flex-direction: column;
    gap: var(--spacing-md);
    align-items: stretch;
  }
  
  .vehicle-card {
    flex-direction: column;
    gap: var(--spacing-md);
  }
  
  .vehicle-actions {
    margin-left: 0;
    justify-content: flex-end;
  }
}
</style>