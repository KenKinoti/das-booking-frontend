<template>
  <PageTemplate
    page-title="Service Catalog"
    page-description="Manage automotive & beauty services, pricing, and availability"
    header-icon="fas fa-wrench"
    :stats-cards="statsCards"
    :show-add-button="true"
    add-button-text="Add Service"
    @add-clicked="showAddModal = true"
  >
    <template #content>

    <!-- Services Grid -->
    <div class="services-grid">
      <div v-for="service in services" :key="service.id" class="service-card">
        <div class="service-header">
          <div class="service-icon" :style="{ backgroundColor: service.color }">
            <i :class="service.icon"></i>
          </div>
          <div class="service-actions">
            <button @click="editService(service)" class="btn-icon">
              <i class="fas fa-edit"></i>
            </button>
            <button @click="deleteService(service)" class="btn-icon btn-danger">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
        
        <div class="service-content">
          <h3 class="service-name">{{ service.name }}</h3>
          <p class="service-description">{{ service.description }}</p>
          
          <div class="service-details">
            <div class="detail-item">
              <span class="detail-label">Price:</span>
              <span class="detail-value price">${{ service.price }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Duration:</span>
              <span class="detail-value">{{ service.duration }} mins</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Category:</span>
              <span class="detail-value">{{ service.category }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Status:</span>
              <span class="status-badge" :class="service.active ? 'active' : 'inactive'">
                {{ service.active ? 'Active' : 'Inactive' }}
              </span>
            </div>
          </div>

          <div v-if="service.requirements" class="service-requirements">
            <strong>Requirements:</strong>
            <ul>
              <li v-for="req in service.requirements" :key="req">{{ req }}</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Add Service Card -->
      <div class="service-card add-service-card" @click="showAddModal = true">
        <div class="add-service-content">
          <i class="fas fa-plus add-icon"></i>
          <h3>Add New Service</h3>
          <p>Create a new service for your business</p>
        </div>
      </div>
    </div>

    <!-- Service Categories -->
    <div class="categories-section">
      <h2 class="section-title">Service Categories</h2>
      <div class="categories-grid">
        <div v-for="category in categories" :key="category.name" class="category-card">
          <div class="category-header">
            <i :class="category.icon" :style="{ color: category.color }"></i>
            <h4>{{ category.name }}</h4>
          </div>
          <div class="category-stats">
            <span>{{ category.serviceCount }} services</span>
            <span>${{ category.avgPrice }} avg price</span>
          </div>
        </div>
      </div>
    </div>

    </template>
  </PageTemplate>

  <!-- Add/Edit Service Modal -->
  <div v-if="showAddModal || showEditModal" class="modal-overlay" @click="closeModal">
    <div class="modal-container" @click.stop>
      <div class="modal-header">
        <h2>{{ isEditing ? 'Edit Service' : 'Add New Service' }}</h2>
        <button @click="closeModal" class="btn-close">
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <form @submit.prevent="saveService" class="modal-form">
        <div class="form-row">
          <div class="form-group">
            <label>Service Name *</label>
            <input 
              type="text" 
              v-model="serviceForm.name" 
              class="form-input" 
              required
              placeholder="e.g., Oil Change, Haircut, Massage"
            />
          </div>
          
          <div class="form-group">
            <label>Category *</label>
            <select v-model="serviceForm.category" class="form-input" required>
              <option value="">Select Category</option>
              <option v-for="cat in categories" :key="cat.name" :value="cat.name">
                {{ cat.name }}
              </option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label>Description</label>
          <textarea 
            v-model="serviceForm.description" 
            class="form-textarea" 
            rows="3"
            placeholder="Describe what this service includes..."
          ></textarea>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Price ($) *</label>
            <input 
              type="number" 
              v-model.number="serviceForm.price" 
              class="form-input" 
              required
              min="0" 
              step="0.01"
            />
          </div>
          
          <div class="form-group">
            <label>Duration (minutes) *</label>
            <input 
              type="number" 
              v-model.number="serviceForm.duration" 
              class="form-input" 
              required
              min="15" 
              step="15"
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Icon</label>
            <select v-model="serviceForm.icon" class="form-input">
              <option value="fas fa-wrench">🔧 Wrench</option>
              <option value="fas fa-cut">✂️ Scissors</option>
              <option value="fas fa-car">🚗 Car</option>
              <option value="fas fa-spa">🧘 Spa</option>
              <option value="fas fa-paint-brush">🎨 Paint</option>
              <option value="fas fa-hammer">🔨 Repair</option>
            </select>
          </div>
          
          <div class="form-group">
            <label>Color</label>
            <select v-model="serviceForm.color" class="form-input">
              <option value="#667eea">Blue</option>
              <option value="#4facfe">Light Blue</option>
              <option value="#43e97b">Green</option>
              <option value="#fa709a">Pink</option>
              <option value="#ffc107">Yellow</option>
              <option value="#6f42c1">Purple</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="serviceForm.active" />
            <span class="checkmark"></span>
            Service is active and bookable
          </label>
        </div>

        <div class="modal-footer">
          <button type="button" @click="closeModal" class="btn btn-secondary">
            Cancel
          </button>
          <button type="submit" class="btn btn-primary">
            {{ isEditing ? 'Update Service' : 'Create Service' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import PageTemplate from '@/components/PageTemplate.vue'

export default {
  name: 'Services',
  components: {
    PageTemplate
  },
  data() {
    return {
      showAddModal: false,
      showEditModal: false,
      editingService: null,
      serviceForm: {
        name: '',
        description: '',
        price: 0,
        duration: 60,
        category: '',
        icon: 'fas fa-wrench',
        color: '#667eea',
        active: true,
        requirements: []
      },
      services: [
        {
          id: 1,
          name: 'Oil Change',
          description: 'Complete oil and filter change service',
          price: 49.99,
          duration: 30,
          category: 'Automotive',
          icon: 'fas fa-car',
          color: '#667eea',
          active: true,
          requirements: ['Vehicle access', 'Oil type specification']
        },
        {
          id: 2,
          name: 'Brake Inspection',
          description: 'Comprehensive brake system check and report',
          price: 89.99,
          duration: 45,
          category: 'Automotive',
          icon: 'fas fa-wrench',
          color: '#fa709a',
          active: true,
          requirements: ['Vehicle lifting equipment']
        },
        {
          id: 3,
          name: 'Haircut & Style',
          description: 'Professional cut and styling service',
          price: 35.00,
          duration: 60,
          category: 'Beauty',
          icon: 'fas fa-cut',
          color: '#43e97b',
          active: true,
          requirements: ['Hair washing station']
        }
      ],
      categories: [
        {
          name: 'Automotive',
          icon: 'fas fa-car',
          color: '#667eea',
          serviceCount: 8,
          avgPrice: '75.50'
        },
        {
          name: 'Beauty',
          icon: 'fas fa-cut',
          color: '#43e97b',
          serviceCount: 12,
          avgPrice: '45.00'
        },
        {
          name: 'Wellness',
          icon: 'fas fa-spa',
          color: '#4facfe',
          serviceCount: 6,
          avgPrice: '85.00'
        },
        {
          name: 'Maintenance',
          icon: 'fas fa-hammer',
          color: '#fa709a',
          serviceCount: 4,
          avgPrice: '120.00'
        }
      ]
    }
  },
  computed: {
    isEditing() {
      return this.showEditModal && this.editingService
    },
    
    statsCards() {
      const activeServices = this.services.filter(s => s.active).length
      const avgPrice = this.services.length > 0 
        ? (this.services.reduce((sum, s) => sum + s.price, 0) / this.services.length).toFixed(0)
        : 0
      
      return [
        {
          value: this.services.length,
          label: 'Total Services',
          icon: 'fas fa-wrench',
          type: 'info'
        },
        {
          value: activeServices,
          label: 'Active Services',
          icon: 'fas fa-check-circle',
          type: 'success'
        },
        {
          value: this.categories.length,
          label: 'Categories',
          icon: 'fas fa-tags',
          type: 'warning'
        },
        {
          value: `$${avgPrice}`,
          label: 'Average Price',
          icon: 'fas fa-dollar-sign',
          type: 'info'
        }
      ]
    }
  },
  methods: {
    editService(service) {
      this.editingService = service
      this.serviceForm = { ...service }
      this.showEditModal = true
    },
    
    deleteService(service) {
      if (confirm(`Are you sure you want to delete "${service.name}"?`)) {
        const index = this.services.findIndex(s => s.id === service.id)
        if (index > -1) {
          this.services.splice(index, 1)
        }
      }
    },
    
    closeModal() {
      this.showAddModal = false
      this.showEditModal = false
      this.editingService = null
      this.resetForm()
    },
    
    resetForm() {
      this.serviceForm = {
        name: '',
        description: '',
        price: 0,
        duration: 60,
        category: '',
        icon: 'fas fa-wrench',
        color: '#667eea',
        active: true,
        requirements: []
      }
    },
    
    saveService() {
      if (this.isEditing) {
        // Update existing service
        const index = this.services.findIndex(s => s.id === this.editingService.id)
        if (index > -1) {
          this.services[index] = { ...this.serviceForm, id: this.editingService.id }
        }
      } else {
        // Add new service
        const newService = {
          ...this.serviceForm,
          id: Date.now() // Mock ID
        }
        this.services.push(newService)
      }
      
      this.closeModal()
    }
  }
}
</script>

<style scoped>
.services-page {
  padding: 2rem;
  width: 100%;
  background: var(--bs-body-bg);
  min-height: 100vh;
}

/* Header Styles */
.page-header {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.85) 100%);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--card-border);
  border-radius: 24px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: var(--bs-box-shadow-lg);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
}

.page-header:hover {
  transform: translateY(-2px);
  box-shadow: 0 15px 50px rgba(0, 0, 0, 0.1);
}

.page-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(147, 197, 253, 0.5), transparent);
}

.page-title {
  font-size: 2.25rem;
  font-weight: 700;
  color: var(--bs-body-color);
  margin: 0 0 0.75rem 0;
  display: flex;
  align-items: center;
  gap: 1.25rem;
  line-height: 1.3;
  letter-spacing: -0.025em;
}

.title-icon {
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 32px rgba(67, 233, 123, 0.25);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
}

.title-icon:hover {
  transform: scale(1.05) translateY(-2px);
  box-shadow: 0 12px 40px rgba(67, 233, 123, 0.35);
}

.title-icon i {
  font-size: 1.75rem;
  color: white;
}

.page-description {
  font-size: 1.125rem;
  color: var(--bs-secondary);
  margin: 0;
  line-height: 1.6;
  max-width: 640px;
  font-weight: 400;
}

.header-actions {
  display: flex;
  gap: 1rem;
}

.btn-primary {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(67, 233, 123, 0.3);
}

.services-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
}

.service-card {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  transition: all 0.3s;
}

.service-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
}

.service-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.service-icon {
  width: 50px;
  height: 50px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.25rem;
}

.service-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-icon {
  width: 36px;
  height: 36px;
  border: none;
  background: var(--bs-tertiary-bg);
  border-radius: 50%;
  color: var(--bs-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: #667eea;
  color: white;
}

.btn-icon.btn-danger:hover {
  background: #dc3545;
  color: white;
}

.service-name {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--bs-body-color);
  margin-bottom: 0.5rem;
}

.service-description {
  color: var(--bs-secondary);
  margin-bottom: 1rem;
}

.service-details {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.detail-item {
  display: flex;
  flex-direction: column;
}

.detail-label {
  font-size: 0.85rem;
  color: var(--bs-secondary);
  margin-bottom: 0.25rem;
}

.detail-value {
  font-weight: 600;
  color: var(--bs-body-color);
}

.detail-value.price {
  color: #28a745;
  font-size: 1.1rem;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
}

.status-badge.active {
  background: #d4edda;
  color: #155724;
}

.status-badge.inactive {
  background: #f8d7da;
  color: #721c24;
}

.service-requirements {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e9ecef;
}

.service-requirements ul {
  margin: 0.5rem 0 0 0;
  padding-left: 1.5rem;
}

.service-requirements li {
  font-size: 0.9rem;
  color: var(--bs-secondary);
}

.add-service-card {
  border: 2px dashed #dee2e6;
  background: var(--bs-tertiary-bg);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
}

.add-service-card:hover {
  border-color: #667eea;
  background: rgba(102, 126, 234, 0.05);
}

.add-service-content {
  text-align: center;
}

.add-icon {
  font-size: 3rem;
  color: #667eea;
  margin-bottom: 1rem;
}

.categories-section {
  margin-top: 3rem;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--bs-body-color);
  margin-bottom: 1.5rem;
}

.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.category-card {
  background: var(--card-bg);
  border-radius: 8px;
  padding: 1.5rem;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.category-header {
  margin-bottom: 1rem;
}

.category-header i {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.category-header h4 {
  margin: 0;
  color: var(--bs-body-color);
}

.category-stats {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.category-stats span {
  font-size: 0.9rem;
  color: var(--bs-secondary);
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-container {
  background: var(--card-bg);
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e9ecef;
}

.modal-header h2 {
  margin: 0;
  color: var(--bs-body-color);
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--bs-secondary);
  cursor: pointer;
}

.modal-form {
  padding: 1.5rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  font-weight: 600;
  color: var(--bs-body-color);
  margin-bottom: 0.5rem;
}

.form-input,
.form-textarea {
  padding: 0.75rem;
  border: 2px solid var(--card-border);
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.form-input:focus,
.form-textarea:focus {
  border-color: #667eea;
  outline: none;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #667eea;
  color: white;
}

.btn-primary:hover {
  background: #5a6fd8;
}

.btn-outline {
  background: var(--card-bg);
  color: var(--bs-secondary);
  border: 2px solid var(--card-border);
}

.btn-outline:hover {
  background: var(--bs-tertiary-bg);
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 1rem;
  }
  
  .services-grid {
    grid-template-columns: 1fr;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .service-details {
    grid-template-columns: 1fr;
  }
}
</style>