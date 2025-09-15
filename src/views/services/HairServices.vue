<template>
  <div class="hair-services">
    <!-- Action Buttons Section -->
    <div class="page-actions d-flex justify-content-end mb-4">
      <button @click="showAddServiceModal = true" class="btn btn-primary">
        <i class="fas fa-plus me-2"></i>
        Add Service
      </button>
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
          <i class="fas fa-cut"></i>
        </div>
        <h3>No Hair Services</h3>
        <p>Start by adding your first hair service</p>
        <button @click="showAddServiceModal = true" class="btn-primary">
          <i class="fas fa-plus"></i>
          Add Your First Service
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'HairServices',
  data() {
    return {
      showAddServiceModal: false,
      showEditServiceModal: false,
      editingService: null,
      serviceForm: {
        name: '',
        description: '',
        duration: 45,
        price: 0,
        requiresVehicle: false,
        isActive: true
      },
      services: [
        {
          id: 'hs001',
          name: 'Haircut & Style',
          description: 'Professional haircut with wash and styling',
          duration: 45,
          price: 35.00,
          requiresVehicle: false,
          isActive: true,
          icon: 'fas fa-cut'
        },
        {
          id: 'hs002',
          name: 'Hair Wash & Blowdry',
          description: 'Shampoo, condition, and professional blowdry styling',
          duration: 30,
          price: 25.00,
          requiresVehicle: false,
          isActive: true,
          icon: 'fas fa-wind'
        },
        {
          id: 'hs003',
          name: 'Hair Coloring',
          description: 'Professional hair coloring and highlighting services',
          duration: 120,
          price: 85.00,
          requiresVehicle: false,
          isActive: true,
          icon: 'fas fa-palette'
        },
        {
          id: 'hs004',
          name: 'Deep Conditioning Treatment',
          description: 'Intensive hair treatment for damaged or dry hair',
          duration: 60,
          price: 45.00,
          requiresVehicle: false,
          isActive: true,
          icon: 'fas fa-seedling'
        },
        {
          id: 'hs005',
          name: 'Bridal Hair Styling',
          description: 'Special occasion and bridal hair styling service',
          duration: 90,
          price: 120.00,
          requiresVehicle: false,
          isActive: true,
          icon: 'fas fa-crown'
        },
        {
          id: 'hs006',
          name: 'Hair Extensions',
          description: 'Professional hair extension application and styling',
          duration: 150,
          price: 200.00,
          requiresVehicle: false,
          isActive: false,
          icon: 'fas fa-magic'
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
          id: 'hs' + Date.now(),
          icon: 'fas fa-cut'
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
        duration: 45,
        price: 0,
        requiresVehicle: false,
        isActive: true
      }
    }
  }
}
</script>

<style scoped>
.hair-services {
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
  background: linear-gradient(135deg, #e91e63, #c2185b);
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
  background: linear-gradient(135deg, #e91e63, #c2185b);
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

/* Responsive Design */
@media (max-width: 768px) {
  .hair-services {
    padding: var(--spacing-md);
  }
  
  .header-content {
    flex-direction: column;
    gap: var(--spacing-md);
  }
  
  .services-grid {
    grid-template-columns: 1fr;
  }
  
  .service-actions {
    flex-direction: column;
  }
}
</style>