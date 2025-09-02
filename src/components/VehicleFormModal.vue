<template>
  <div v-if="show" class="modal-overlay" @click="closeModal">
    <div class="modal-container" @click.stop>
      <div class="modal-header">
        <h2>{{ isEditing ? 'Edit Vehicle' : 'Add New Vehicle' }}</h2>
        <button @click="closeModal" class="btn-close">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <form @submit.prevent="submitForm" class="modal-form">
        <div class="form-row">
          <div class="form-group">
            <label for="make">Make *</label>
            <input 
              id="make" 
              type="text" 
              v-model="formData.make" 
              class="form-input"
              required
              placeholder="e.g., Toyota, Honda, Ford"
            />
          </div>
          
          <div class="form-group">
            <label for="model">Model *</label>
            <input 
              id="model" 
              type="text" 
              v-model="formData.model" 
              class="form-input"
              required
              placeholder="e.g., Camry, Civic, Focus"
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="year">Year *</label>
            <input 
              id="year" 
              type="number" 
              v-model.number="formData.year" 
              class="form-input"
              required
              min="1900"
              :max="currentYear + 1"
              placeholder="2020"
            />
          </div>
          
          <div class="form-group">
            <label for="color">Color</label>
            <input 
              id="color" 
              type="text" 
              v-model="formData.color" 
              class="form-input"
              placeholder="e.g., Red, Blue, Silver"
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="license_plate">License Plate</label>
            <input 
              id="license_plate" 
              type="text" 
              v-model="formData.license_plate" 
              class="form-input"
              placeholder="ABC123"
              style="text-transform: uppercase"
            />
          </div>
          
          <div class="form-group">
            <label for="mileage">Mileage (km)</label>
            <input 
              id="mileage" 
              type="number" 
              v-model.number="formData.mileage" 
              class="form-input"
              min="0"
              placeholder="50000"
            />
          </div>
        </div>

        <div class="form-group">
          <label for="vin">VIN (Vehicle Identification Number)</label>
          <input 
            id="vin" 
            type="text" 
            v-model="formData.vin" 
            class="form-input"
            maxlength="17"
            placeholder="1HGBH41JXMN109186"
            style="text-transform: uppercase"
          />
          <small class="form-help">17-character unique vehicle identifier</small>
        </div>

        <div class="form-group">
          <label for="notes">Notes</label>
          <textarea 
            id="notes" 
            v-model="formData.notes"
            class="form-textarea"
            rows="3"
            placeholder="Any additional notes about the vehicle..."
          ></textarea>
        </div>

        <div class="form-actions">
          <button type="button" @click="closeModal" class="btn btn-outline">
            Cancel
          </button>
          
          <button 
            type="submit" 
            class="btn btn-primary"
            :disabled="isSubmitting"
          >
            <span v-if="isSubmitting">
              <i class="fas fa-spinner fa-spin"></i>
              Saving...
            </span>
            <span v-else>
              <i class="fas fa-check"></i>
              {{ isEditing ? 'Update Vehicle' : 'Add Vehicle' }}
            </span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue'

export default {
  name: 'VehicleFormModal',
  props: {
    show: {
      type: Boolean,
      default: false
    },
    vehicle: {
      type: Object,
      default: null
    },
    customer: {
      type: Object,
      default: null
    }
  },
  emits: ['close', 'save'],
  setup(props, { emit }) {
    const isSubmitting = ref(false)
    const currentYear = new Date().getFullYear()
    
    const formData = ref({
      make: '',
      model: '',
      year: currentYear,
      color: '',
      license_plate: '',
      vin: '',
      mileage: 0,
      notes: ''
    })

    const isEditing = computed(() => !!props.vehicle)

    const closeModal = () => {
      emit('close')
      resetForm()
    }

    const resetForm = () => {
      formData.value = {
        make: '',
        model: '',
        year: currentYear,
        color: '',
        license_plate: '',
        vin: '',
        mileage: 0,
        notes: ''
      }
    }

    const submitForm = async () => {
      if (isSubmitting.value) return
      
      isSubmitting.value = true
      try {
        const vehicleData = { ...formData.value }
        
        // Clean up data
        if (vehicleData.license_plate) {
          vehicleData.license_plate = vehicleData.license_plate.toUpperCase()
        }
        if (vehicleData.vin) {
          vehicleData.vin = vehicleData.vin.toUpperCase()
        }
        
        if (isEditing.value) {
          vehicleData.id = props.vehicle.id
        }
        
        emit('save', vehicleData)
      } catch (error) {
        console.error('Failed to save vehicle:', error)
        alert('Failed to save vehicle. Please try again.')
      } finally {
        isSubmitting.value = false
      }
    }

    // Watch for vehicle prop changes
    watch(() => props.vehicle, (newVehicle) => {
      if (newVehicle) {
        formData.value = {
          make: newVehicle.make || '',
          model: newVehicle.model || '',
          year: newVehicle.year || currentYear,
          color: newVehicle.color || '',
          license_plate: newVehicle.license_plate || '',
          vin: newVehicle.vin || '',
          mileage: newVehicle.mileage || 0,
          notes: newVehicle.notes || ''
        }
      }
    }, { immediate: true })

    return {
      isSubmitting,
      currentYear,
      formData,
      isEditing,
      closeModal,
      submitForm
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
  z-index: 1200;
  padding: var(--spacing-lg);
}

.modal-container {
  background: white;
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-strong);
  width: 100%;
  max-width: 600px;
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

.modal-form {
  padding: var(--spacing-xl);
  overflow-y: auto;
  flex: 1;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--spacing-xs);
}

.form-input,
.form-textarea {
  padding: var(--spacing-md);
  border: 2px solid var(--border-color);
  border-radius: var(--border-radius);
  font-size: 1rem;
  transition: all 0.2s ease;
  background: white;
}

.form-input:focus,
.form-textarea:focus {
  border-color: var(--primary);
  outline: none;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
  margin-bottom: var(--spacing-md);
}

.form-help {
  color: var(--text-secondary);
  font-size: 0.85rem;
  margin-top: var(--spacing-xs);
}

.form-actions {
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
  .modal-form {
    padding: var(--spacing-lg);
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>