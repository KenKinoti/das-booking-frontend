<template>
  <div class="automotive-repair">
    <div class="page-header">
      <div class="header-content">
        <div class="header-info">
          <div class="category-icon">
            <i class="fas fa-tools"></i>
          </div>
          <div class="title-section">
            <h1>Automotive Repair Services</h1>
            <p class="category-description">Comprehensive automotive repair services for all vehicle types</p>
          </div>
        </div>
        <div class="header-actions">
          <button @click="showAddServiceModal = true" class="btn-primary">
            <i class="fas fa-plus"></i>
            Add Service
          </button>
        </div>
      </div>
    </div>

    <div class="content-wrapper">
      <!-- Services Grid -->
      <div class="services-grid">
        <div 
          v-for="service in filteredServices" 
          :key="service.id"
          class="service-card"
          :class="{ inactive: !service.isActive }"
        >
          <div class="service-header">
            <div class="service-icon">
              <i :class="service.icon"></i>
            </div>
            <div class="service-status">
              <span class="status-badge" :class="service.isActive ? 'active' : 'inactive'">
                {{ service.isActive ? 'Active' : 'Inactive' }}
              </span>
            </div>
          </div>
          
          <div class="service-content">
            <h3>{{ service.name }}</h3>
            <p class="service-description">{{ service.description }}</p>
            
            <div class="service-details">
              <div class="detail-item">
                <i class="fas fa-clock"></i>
                <span>{{ service.duration }} mins</span>
              </div>
              <div class="detail-item">
                <i class="fas fa-dollar-sign"></i>
                <span>${{ service.price }}</span>
              </div>
              <div class="detail-item" v-if="service.requiresVehicle">
                <i class="fas fa-car"></i>
                <span>Vehicle Required</span>
              </div>
            </div>
          </div>

          <div class="service-actions">
            <button @click="editService(service)" class="btn-secondary btn-small">
              <i class="fas fa-edit"></i>
              Edit
            </button>
            <button @click="toggleServiceStatus(service)" class="btn-outline btn-small">
              <i :class="service.isActive ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
              {{ service.isActive ? 'Deactivate' : 'Activate' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="filteredServices.length === 0" class="empty-state">
        <div class="empty-icon">
          <i class="fas fa-tools"></i>
        </div>
        <h3>No Automotive Repair Services</h3>
        <p>Start by adding your first automotive repair service</p>
        <button @click="showAddServiceModal = true" class="btn-primary">
          <i class="fas fa-plus"></i>
          Add Your First Service
        </button>
      </div>
    </div>

    <!-- Add/Edit Service Modal -->
    <div v-if="showAddServiceModal || showEditServiceModal" class="modal-overlay" @click="closeModals">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>{{ showEditServiceModal ? 'Edit Service' : 'Add New Automotive Repair Service' }}</h3>
          <button @click="closeModals" class="modal-close">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="modal-content">
          <form @submit.prevent="saveService">
            <div class="form-group">
              <label for="serviceName">Service Name</label>
              <input 
                type="text" 
                id="serviceName"
                v-model="serviceForm.name" 
                class="form-input"
                required
                placeholder="e.g., Engine Repair, Brake Service"
              />
            </div>
            
            <div class="form-group">
              <label for="serviceDescription">Description</label>
              <textarea 
                id="serviceDescription"
                v-model="serviceForm.description" 
                class="form-textarea"
                rows="3"
                placeholder="Detailed description of the service..."
              ></textarea>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label for="serviceDuration">Duration (minutes)</label>
                <input 
                  type="number" 
                  id="serviceDuration"
                  v-model="serviceForm.duration" 
                  class="form-input"
                  required
                  min="1"
                />
              </div>
              
              <div class="form-group">
                <label for="servicePrice">Price ($)</label>
                <input 
                  type="number" 
                  id="servicePrice"
                  v-model="serviceForm.price" 
                  class="form-input"
                  step="0.01"
                  min="0"
                  required
                />
              </div>
            </div>
            
            <div class="form-group">
              <label class="checkbox-label">
                <input 
                  type="checkbox" 
                  v-model="serviceForm.requiresVehicle"
                  class="checkbox-input"
                />
                <span class="checkbox-custom"></span>
                Requires Vehicle Information
              </label>
            </div>
            
            <div class="form-group">
              <label class="checkbox-label">
                <input 
                  type="checkbox" 
                  v-model="serviceForm.isActive"
                  class="checkbox-input"
                />
                <span class="checkbox-custom"></span>
                Service Active
              </label>
            </div>
          </form>
        </div>
        
        <div class="modal-footer">
          <button @click="closeModals" class="btn-secondary">Cancel</button>
          <button @click="saveService" class="btn-primary">
            {{ showEditServiceModal ? 'Update Service' : 'Add Service' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AutomotiveRepair',
  data() {
    return {
      showAddServiceModal: false,
      showEditServiceModal: false,
      editingService: null,
      serviceForm: {
        name: '',
        description: '',
        duration: 60,
        price: 0,
        requiresVehicle: true,
        isActive: true
      },
      services: [
        {
          id: 'ar001',
          name: 'Engine Diagnostics',
          description: 'Comprehensive engine diagnostic testing using advanced computer systems',
          duration: 90,
          price: 120.00,
          requiresVehicle: true,
          isActive: true,
          icon: 'fas fa-search'
        },
        {
          id: 'ar002',
          name: 'Brake System Repair',
          description: 'Complete brake system inspection, repair, and replacement services',
          duration: 120,
          price: 250.00,
          requiresVehicle: true,
          isActive: true,
          icon: 'fas fa-stop-circle'
        },
        {
          id: 'ar003',
          name: 'Transmission Repair',
          description: 'Professional transmission diagnosis, repair, and rebuilding services',
          duration: 240,
          price: 800.00,
          requiresVehicle: true,
          isActive: true,
          icon: 'fas fa-cogs'
        },
        {
          id: 'ar004',
          name: 'Air Conditioning Repair',
          description: 'AC system diagnosis, repair, and recharging services',
          duration: 90,
          price: 150.00,
          requiresVehicle: true,
          isActive: true,
          icon: 'fas fa-snowflake'
        },
        {
          id: 'ar005',
          name: 'Electrical System Repair',
          description: 'Comprehensive electrical system diagnosis and repair',
          duration: 120,
          price: 180.00,
          requiresVehicle: true,
          isActive: false,
          icon: 'fas fa-bolt'
        }
      ]
    }
  },
  computed: {
    filteredServices() {
      return this.services.filter(service => service.isActive || !service.isActive)
    }
  },
  methods: {
    editService(service) {
      this.editingService = service
      this.serviceForm = { ...service }
      this.showEditServiceModal = true
    },
    
    toggleServiceStatus(service) {
      service.isActive = !service.isActive
    },
    
    saveService() {
      if (this.showEditServiceModal && this.editingService) {
        // Update existing service
        Object.assign(this.editingService, this.serviceForm)
      } else {
        // Add new service
        const newService = {
          ...this.serviceForm,
          id: 'ar' + Date.now(),
          icon: 'fas fa-wrench'
        }
        this.services.push(newService)
      }
      
      this.closeModals()
    },
    
    closeModals() {
      this.showAddServiceModal = false
      this.showEditServiceModal = false
      this.editingService = null
      this.serviceForm = {
        name: '',
        description: '',
        duration: 60,
        price: 0,
        requiresVehicle: true,
        isActive: true
      }
    }
  }
}
</script>

<style scoped>
.automotive-repair {
  padding: var(--spacing-lg);
  background: var(--background-color);
  min-height: 100vh;
}

.page-header {
  background: var(--card-background);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-xl);
  margin-bottom: var(--spacing-lg);
  box-shadow: var(--shadow-soft);
  border: 1px solid var(--border-color);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.header-info {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-lg);
}

.category-icon {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #e74c3c, #c0392b);
  border-radius: var(--border-radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 2rem;
  box-shadow: var(--shadow-medium);
}

.title-section h1 {
  margin: 0 0 var(--spacing-xs) 0;
  color: var(--text-primary);
  font-size: 2rem;
  font-weight: var(--font-weight-bold);
}

.category-description {
  color: var(--text-medium);
  margin: 0;
  font-size: 1.1rem;
}

.content-wrapper {
  max-width: 100%;
}

.services-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: var(--spacing-lg);
}

.service-card {
  background: var(--card-background);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-lg);
  transition: all var(--transition-smooth);
  position: relative;
  overflow: hidden;
}

.service-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-strong);
  border-color: var(--primary-color);
}

.service-card.inactive {
  opacity: 0.6;
  background: var(--background-muted);
}

.service-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-md);
}

.service-icon {
  width: 50px;
  height: 50px;
  background: linear-gradient(135deg, #e74c3c, #c0392b);
  border-radius: var(--border-radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.25rem;
}

.status-badge {
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--border-radius-full);
  font-size: 0.75rem;
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-badge.active {
  background: var(--success-light);
  color: var(--success-dark);
}

.status-badge.inactive {
  background: var(--error-light);
  color: var(--error-dark);
}

.service-content h3 {
  margin: 0 0 var(--spacing-sm) 0;
  color: var(--text-primary);
  font-size: 1.25rem;
  font-weight: var(--font-weight-semibold);
}

.service-description {
  color: var(--text-medium);
  margin: 0 0 var(--spacing-md) 0;
  line-height: 1.5;
}

.service-details {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.detail-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  color: var(--text-medium);
  font-size: 0.875rem;
}

.detail-item i {
  color: var(--primary-color);
  width: 16px;
}

.service-actions {
  display: flex;
  gap: var(--spacing-sm);
  border-top: 1px solid var(--border-color);
  padding-top: var(--spacing-md);
}

.btn-small {
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: 0.875rem;
}

.empty-state {
  text-align: center;
  padding: var(--spacing-xxl);
  color: var(--text-medium);
}

.empty-icon {
  font-size: 4rem;
  color: var(--border-color);
  margin-bottom: var(--spacing-lg);
}

.empty-state h3 {
  margin: 0 0 var(--spacing-sm) 0;
  color: var(--text-primary);
}

.empty-state p {
  margin: 0 0 var(--spacing-lg) 0;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--spacing-md);
}

.modal {
  background: var(--card-background);
  border-radius: var(--border-radius-lg);
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: var(--shadow-strong);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  margin: 0;
  color: var(--text-primary);
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.25rem;
  color: var(--text-medium);
  cursor: pointer;
  padding: var(--spacing-xs);
  border-radius: var(--border-radius-sm);
  transition: var(--transition-fast);
}

.modal-close:hover {
  color: var(--text-primary);
  background: var(--background-muted);
}

.modal-content {
  padding: var(--spacing-lg);
}

.form-group {
  margin-bottom: var(--spacing-md);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-md);
}

.form-group label {
  display: block;
  margin-bottom: var(--spacing-xs);
  color: var(--text-primary);
  font-weight: var(--font-weight-medium);
}

.form-input,
.form-textarea {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm);
  background: var(--background-color);
  color: var(--text-primary);
  transition: var(--transition-fast);
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px var(--primary-light);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  cursor: pointer;
}

.checkbox-input {
  display: none;
}

.checkbox-custom {
  width: 20px;
  height: 20px;
  border: 2px solid var(--border-color);
  border-radius: var(--border-radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: var(--transition-fast);
  position: relative;
}

.checkbox-input:checked + .checkbox-custom {
  background: var(--primary-color);
  border-color: var(--primary-color);
}

.checkbox-input:checked + .checkbox-custom::after {
  content: '✓';
  color: white;
  font-size: 0.875rem;
  font-weight: bold;
}

.modal-footer {
  display: flex;
  gap: var(--spacing-sm);
  justify-content: flex-end;
  padding: var(--spacing-lg);
  border-top: 1px solid var(--border-color);
}

/* Responsive Design */
@media (max-width: 768px) {
  .automotive-repair {
    padding: var(--spacing-md);
  }
  
  .header-content {
    flex-direction: column;
    gap: var(--spacing-md);
  }
  
  .services-grid {
    grid-template-columns: 1fr;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .service-actions {
    flex-direction: column;
  }
}
</style>