<template>
  <div class="service-categories-page">
    <!-- Header -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">
          <div class="title-icon">
            <i class="fas fa-th-large"></i>
          </div>
          Service Categories
        </h1>
        <p class="page-description">Manage service categories and organize your business offerings</p>
      </div>
      <div class="header-actions">
        <button @click="showAddCategoryModal = true" class="btn-primary">
          <i class="fas fa-plus"></i>
          Add Category
        </button>
      </div>
    </div>

    <!-- Categories Grid -->
    <div class="categories-grid">
      <div 
        v-for="category in categories" 
        :key="category.id" 
        class="category-card"
        @click="goToCategory(category.slug)"
      >
        <div class="category-header">
          <div class="category-icon" :style="{ backgroundColor: category.color }">
            <i :class="category.icon"></i>
          </div>
          <div class="category-actions" @click.stop>
            <button @click="editCategory(category)" class="btn-icon">
              <i class="fas fa-edit"></i>
            </button>
            <button @click="deleteCategory(category)" class="btn-icon btn-danger">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
        
        <div class="category-content">
          <h3 class="category-name">{{ category.name }}</h3>
          <p class="category-description">{{ category.description }}</p>
          
          <div class="category-stats">
            <div class="stat-item">
              <span class="stat-value">{{ category.serviceCount || 0 }}</span>
              <span class="stat-label">Services</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">${{ category.avgPrice || '0' }}</span>
              <span class="stat-label">Avg Price</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ category.avgDuration || 0 }}m</span>
              <span class="stat-label">Avg Duration</span>
            </div>
          </div>

          <div class="category-preview">
            <div class="preview-services">
              <span 
                v-for="service in category.sampleServices?.slice(0, 3)" 
                :key="service.id" 
                class="service-tag"
              >
                {{ service.name }}
              </span>
              <span 
                v-if="category.serviceCount > 3" 
                class="service-tag more"
              >
                +{{ category.serviceCount - 3 }} more
              </span>
            </div>
          </div>
        </div>
        
        <div class="category-footer">
          <span class="status-badge" :class="category.isActive ? 'active' : 'inactive'">
            {{ category.isActive ? 'Active' : 'Inactive' }}
          </span>
          <span class="view-link">
            View Services
            <i class="fas fa-arrow-right"></i>
          </span>
        </div>
      </div>

      <!-- Add Category Card -->
      <div class="category-card add-category-card" @click="showAddCategoryModal = true">
        <div class="add-category-content">
          <i class="fas fa-plus add-icon"></i>
          <h3>Add New Category</h3>
          <p>Create a new service category</p>
        </div>
      </div>
    </div>

    <!-- Add/Edit Category Modal -->
    <div v-if="showAddCategoryModal || showEditCategoryModal" class="modal-overlay" @click="closeCategoryModal">
      <div class="modal-container" @click.stop>
        <div class="modal-header">
          <h3>{{ isEditingCategory ? 'Edit Category' : 'Add New Category' }}</h3>
          <button @click="closeCategoryModal" class="btn-icon">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <form @submit.prevent="saveCategory" class="modal-form">
          <div class="form-group">
            <label for="categoryName">Category Name</label>
            <input 
              id="categoryName"
              v-model="categoryForm.name" 
              type="text" 
              required 
              placeholder="e.g., Automotive Repair"
            />
          </div>

          <div class="form-group">
            <label for="categoryDescription">Description</label>
            <textarea 
              id="categoryDescription"
              v-model="categoryForm.description" 
              rows="3" 
              placeholder="Describe this service category..."
            ></textarea>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="categoryIcon">Icon</label>
              <select id="categoryIcon" v-model="categoryForm.icon">
                <option value="fas fa-wrench">🔧 Wrench (Repair)</option>
                <option value="fas fa-car">🚗 Car (Automotive)</option>
                <option value="fas fa-cut">✂️ Scissors (Hair)</option>
                <option value="fas fa-spa">💆 Spa (Beauty)</option>
                <option value="fas fa-hammer">🔨 Hammer (Maintenance)</option>
                <option value="fas fa-paintbrush">🎨 Paint (Styling)</option>
                <option value="fas fa-heart">💗 Heart (Wellness)</option>
                <option value="fas fa-medkit">🏥 Medical (Healthcare)</option>
              </select>
            </div>

            <div class="form-group">
              <label for="categoryColor">Color</label>
              <select id="categoryColor" v-model="categoryForm.color">
                <option value="#667eea">🔵 Blue</option>
                <option value="#fa709a">🌸 Pink</option>
                <option value="#43e97b">🍃 Green</option>
                <option value="#4facfe">🌊 Light Blue</option>
                <option value="#f093fb">💜 Purple</option>
                <option value="#feca57">🌟 Yellow</option>
                <option value="#ff6b6b">❤️ Red</option>
                <option value="#48dbfb">🐬 Cyan</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                v-model="categoryForm.isActive"
              />
              <span class="checkmark"></span>
              Active Category
            </label>
          </div>

          <div class="form-actions">
            <button type="button" @click="closeCategoryModal" class="btn btn-outline">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary">
              {{ isEditingCategory ? 'Update Category' : 'Create Category' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ServiceCategories',
  data() {
    return {
      showAddCategoryModal: false,
      showEditCategoryModal: false,
      editingCategory: null,
      categoryForm: {
        name: '',
        description: '',
        icon: 'fas fa-wrench',
        color: '#667eea',
        isActive: true
      },
      categories: [
        {
          id: 1,
          name: 'Automotive Repair',
          slug: 'automotive-repair',
          description: 'Professional automotive repair and diagnostic services',
          icon: 'fas fa-wrench',
          color: '#667eea',
          isActive: true,
          serviceCount: 8,
          avgPrice: '125.50',
          avgDuration: 75,
          sampleServices: [
            { id: 1, name: 'Brake Service' },
            { id: 2, name: 'Engine Diagnostic' },
            { id: 3, name: 'Transmission Repair' }
          ]
        },
        {
          id: 2,
          name: 'Automotive Maintenance',
          slug: 'automotive-maintenance',
          description: 'Regular maintenance services to keep your vehicle running smoothly',
          icon: 'fas fa-car',
          color: '#43e97b',
          isActive: true,
          serviceCount: 6,
          avgPrice: '75.00',
          avgDuration: 45,
          sampleServices: [
            { id: 4, name: 'Oil Change' },
            { id: 5, name: 'Tire Rotation' },
            { id: 6, name: 'Filter Replacement' }
          ]
        },
        {
          id: 3,
          name: 'Hair Services',
          slug: 'hair-services',
          description: 'Professional hair cutting, styling, and coloring services',
          icon: 'fas fa-cut',
          color: '#fa709a',
          isActive: true,
          serviceCount: 12,
          avgPrice: '85.00',
          avgDuration: 90,
          sampleServices: [
            { id: 7, name: 'Haircut & Style' },
            { id: 8, name: 'Hair Coloring' },
            { id: 9, name: 'Hair Treatment' }
          ]
        },
        {
          id: 4,
          name: 'Beauty & Spa',
          slug: 'beauty-spa',
          description: 'Relaxing beauty treatments and spa services',
          icon: 'fas fa-spa',
          color: '#4facfe',
          isActive: true,
          serviceCount: 10,
          avgPrice: '95.00',
          avgDuration: 60,
          sampleServices: [
            { id: 10, name: 'Facial Treatment' },
            { id: 11, name: 'Manicure' },
            { id: 12, name: 'Massage' }
          ]
        },
        {
          id: 5,
          name: 'Nail Services',
          slug: 'nail-services',
          description: 'Professional nail care and nail art services',
          icon: 'fas fa-hand-paper',
          color: '#f093fb',
          isActive: true,
          serviceCount: 7,
          avgPrice: '42.00',
          avgDuration: 35,
          sampleServices: [
            { id: 13, name: 'Manicure' },
            { id: 14, name: 'Pedicure' },
            { id: 15, name: 'Nail Art' }
          ]
        },
        {
          id: 6,
          name: 'Diagnostic Services',
          slug: 'diagnostic-services',
          description: 'Advanced diagnostic and inspection services',
          icon: 'fas fa-search',
          color: '#feca57',
          isActive: true,
          serviceCount: 4,
          avgPrice: '110.00',
          avgDuration: 60,
          sampleServices: [
            { id: 16, name: 'Engine Diagnostic' },
            { id: 17, name: 'Pre-Purchase Inspection' },
            { id: 18, name: 'Safety Check' }
          ]
        }
      ]
    }
  },
  computed: {
    isEditingCategory() {
      return !!this.editingCategory
    }
  },
  methods: {
    goToCategory(categorySlug) {
      this.$router.push(`/services/${categorySlug}`)
    },
    
    editCategory(category) {
      this.editingCategory = category
      this.categoryForm = { ...category }
      this.showEditCategoryModal = true
    },
    
    deleteCategory(category) {
      if (confirm(`Are you sure you want to delete the "${category.name}" category?`)) {
        const index = this.categories.findIndex(c => c.id === category.id)
        if (index !== -1) {
          this.categories.splice(index, 1)
        }
      }
    },
    
    saveCategory() {
      if (this.isEditingCategory) {
        const index = this.categories.findIndex(c => c.id === this.editingCategory.id)
        if (index !== -1) {
          this.categories[index] = { ...this.categories[index], ...this.categoryForm }
        }
      } else {
        const newCategory = {
          id: Date.now(),
          slug: this.categoryForm.name.toLowerCase().replace(/\s+/g, '-'),
          serviceCount: 0,
          avgPrice: '0.00',
          avgDuration: 0,
          sampleServices: [],
          ...this.categoryForm
        }
        this.categories.push(newCategory)
      }
      
      this.closeCategoryModal()
    },
    
    closeCategoryModal() {
      this.showAddCategoryModal = false
      this.showEditCategoryModal = false
      this.editingCategory = null
      this.categoryForm = {
        name: '',
        description: '',
        icon: 'fas fa-wrench',
        color: '#667eea',
        isActive: true
      }
    }
  }
}
</script>

<style scoped>
.service-categories-page {
  padding: 2rem;
  width: 100%;
  background: var(--bs-body-bg);
  min-height: 100vh;
}

/* Header Styles */
.page-header {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.85) 100%);
  backdrop-filter: blur(20px);
  border: 1px solid var(--card-border);
  border-radius: 24px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: var(--bs-box-shadow-lg);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.page-title {
  font-size: 2.25rem;
  font-weight: 700;
  color: var(--bs-body-color);
  margin: 0 0 0.75rem 0;
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.title-icon {
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 32px rgba(102, 126, 234, 0.25);
  flex-shrink: 0;
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
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
}

/* Categories Grid */
.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 2rem;
}

.category-card {
  background: var(--card-bg);
  border-radius: 20px;
  padding: 1.5rem;
  box-shadow: var(--stat-card-shadow);
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.category-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.category-icon {
  width: 60px;
  height: 60px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: white;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.category-actions {
  display: flex;
  gap: 0.5rem;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.category-card:hover .category-actions {
  opacity: 1;
}

.btn-icon {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--bs-secondary);
}

.btn-icon:hover {
  background: var(--card-bg);
  transform: scale(1.1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.btn-danger {
  color: #ef4444;
}

.category-name {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--bs-body-color);
  margin: 0 0 0.5rem 0;
}

.category-description {
  color: var(--bs-secondary);
  line-height: 1.6;
  margin-bottom: 1.5rem;
}

.category-stats {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--bs-body-color);
}

.stat-label {
  font-size: 0.8rem;
  color: var(--bs-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.category-preview {
  margin-bottom: 1rem;
}

.preview-services {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.service-tag {
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  color: var(--bs-secondary);
  padding: 0.25rem 0.75rem;
  border-radius: 16px;
  font-size: 0.8rem;
  font-weight: 500;
}

.service-tag.more {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.category-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--card-border);
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.status-badge.active {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

.status-badge.inactive {
  background: rgba(148, 163, 184, 0.1);
  color: #94a3b8;
}

.view-link {
  color: #667eea;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}

/* Add Category Card */
.add-category-card {
  border: 2px dashed #cbd5e1;
  background: var(--bs-body-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}

.add-category-card:hover {
  border-color: #667eea;
  background: #f0f4ff;
}

.add-category-content {
  text-align: center;
  color: var(--bs-secondary);
}

.add-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  color: #cbd5e1;
}

.add-category-card:hover .add-icon {
  color: #667eea;
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
}

.modal-container {
  background: var(--card-bg);
  border-radius: 16px;
  max-width: 500px;
  width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid var(--card-border);
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
}

.modal-form {
  padding: 1.5rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-group label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #374151;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s ease;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
}

.checkmark {
  position: relative;
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}

.btn {
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-outline {
  background: var(--card-bg);
  color: var(--bs-secondary);
  border: 2px solid #e2e8f0;
}

.btn-outline:hover {
  background: var(--bs-body-bg);
  border-color: #cbd5e1;
}

/* Responsive Design */
@media (max-width: 768px) {
  .service-categories-page {
    padding: 1rem;
  }
  
  .categories-grid {
    grid-template-columns: 1fr;
  }
  
  .page-header {
    flex-direction: column;
    gap: 1rem;
  }
  
  .category-stats {
    gap: 1rem;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>