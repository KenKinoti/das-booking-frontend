<template>
  <div v-if="show" class="modal-overlay" @click="closeModal">
    <div class="modal-container" @click.stop>
      <div class="modal-header">
        <h2>{{ isEditing ? 'Edit Customer' : 'New Customer' }}</h2>
        <button @click="closeModal" class="btn-close">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <form @submit.prevent="submitForm" class="modal-form">
        <div class="form-row">
          <div class="form-group">
            <label for="first_name">First Name *</label>
            <input 
              id="first_name" 
              type="text" 
              v-model="formData.first_name" 
              class="form-input"
              required
            />
          </div>
          
          <div class="form-group">
            <label for="last_name">Last Name *</label>
            <input 
              id="last_name" 
              type="text" 
              v-model="formData.last_name" 
              class="form-input"
              required
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="email">Email</label>
            <input 
              id="email" 
              type="email" 
              v-model="formData.email" 
              class="form-input"
            />
          </div>
          
          <div class="form-group">
            <label for="phone">Phone *</label>
            <input 
              id="phone" 
              type="tel" 
              v-model="formData.phone" 
              class="form-input"
              required
            />
          </div>
        </div>

        <h3>Address Information</h3>
        <div class="form-row">
          <div class="form-group full-width">
            <label for="street">Street Address</label>
            <input 
              id="street" 
              type="text" 
              v-model="formData.address.street" 
              class="form-input"
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="suburb">Suburb</label>
            <input 
              id="suburb" 
              type="text" 
              v-model="formData.address.suburb" 
              class="form-input"
            />
          </div>
          
          <div class="form-group">
            <label for="state">State</label>
            <select id="state" v-model="formData.address.state" class="form-select">
              <option value="">Select State</option>
              <option value="NSW">NSW</option>
              <option value="VIC">VIC</option>
              <option value="QLD">QLD</option>
              <option value="SA">SA</option>
              <option value="WA">WA</option>
              <option value="TAS">TAS</option>
              <option value="ACT">ACT</option>
              <option value="NT">NT</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="postcode">Postcode</label>
            <input 
              id="postcode" 
              type="text" 
              v-model="formData.address.postcode" 
              class="form-input"
            />
          </div>
        </div>

        <div class="form-group">
          <label for="notes">Notes</label>
          <textarea 
            id="notes" 
            v-model="formData.notes"
            class="form-textarea"
            rows="3"
            placeholder="Any additional notes about the customer..."
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
              {{ isEditing ? 'Update Customer' : 'Create Customer' }}
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
  name: 'CustomerModal',
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
  emits: ['close', 'save'],
  setup(props, { emit }) {
    const isSubmitting = ref(false)
    
    const formData = ref({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      address: {
        street: '',
        suburb: '',
        state: 'SA',
        postcode: ''
      },
      notes: ''
    })

    const isEditing = computed(() => !!props.customer)

    const closeModal = () => {
      emit('close')
      resetForm()
    }

    const resetForm = () => {
      formData.value = {
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        address: {
          street: '',
          suburb: '',
          state: 'SA',
          postcode: ''
        },
        notes: ''
      }
    }

    const submitForm = async () => {
      if (isSubmitting.value) return
      
      isSubmitting.value = true
      try {
        const customerData = { ...formData.value }
        
        if (isEditing.value) {
          customerData.id = props.customer.id
        }
        
        emit('save', customerData)
      } catch (error) {
        console.error('Failed to save customer:', error)
        alert('Failed to save customer. Please try again.')
      } finally {
        isSubmitting.value = false
      }
    }

    // Watch for customer prop changes
    watch(() => props.customer, (newCustomer) => {
      if (newCustomer) {
        formData.value = {
          first_name: newCustomer.first_name || '',
          last_name: newCustomer.last_name || '',
          email: newCustomer.email || '',
          phone: newCustomer.phone || '',
          address: {
            street: newCustomer.address?.street || '',
            suburb: newCustomer.address?.suburb || '',
            state: newCustomer.address?.state || 'SA',
            postcode: newCustomer.address?.postcode || ''
          },
          notes: newCustomer.notes || ''
        }
      }
    }, { immediate: true })

    return {
      isSubmitting,
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
  z-index: 1000;
  padding: var(--spacing-lg);
}

.modal-container {
  background: var(--card-bg);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-strong);
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

[data-theme="dark"] .modal-container {
  background: linear-gradient(135deg, rgba(31, 41, 55, 0.95) 0%, rgba(31, 41, 55, 0.85) 100%);
  border: 1px solid rgba(75, 85, 99, 0.3);
  box-shadow: 0 20px 40px rgba(0,0,0,0.5), 0 8px 16px rgba(0,0,0,0.3);
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

.modal-form h3 {
  color: var(--text-primary);
  font-size: 1.2rem;
  font-weight: 600;
  margin: var(--spacing-lg) 0 var(--spacing-md) 0;
  border-bottom: 2px solid var(--primary);
  padding-bottom: var(--spacing-sm);
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

.form-group.full-width {
  grid-column: span 2;
}

.form-group label {
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--spacing-xs);
}

.form-input,
.form-select,
.form-textarea {
  padding: var(--spacing-md);
  border: 2px solid var(--border-color);
  border-radius: var(--border-radius);
  font-size: 1rem;
  transition: all 0.2s ease;
  background: var(--card-bg);
  color: var(--text-primary);
}

[data-theme="dark"] .form-input,
[data-theme="dark"] .form-select,
[data-theme="dark"] .form-textarea {
  background: rgba(31, 41, 55, 0.8);
  border-color: rgba(75, 85, 99, 0.5);
  color: #f3f4f6;
}

[data-theme="dark"] .form-input::placeholder,
[data-theme="dark"] .form-textarea::placeholder {
  color: #9ca3af;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  border-color: var(--primary);
  outline: none;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
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
  
  .form-group.full-width {
    grid-column: span 1;
  }
}
</style>