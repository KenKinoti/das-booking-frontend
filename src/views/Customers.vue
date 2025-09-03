<template>
  <PageTemplate
    page-title="Customer Management"
    page-description="Manage your customers and their vehicle information for automotive & beauty services"
    header-icon="fas fa-users"
    :stats-cards="statsCards"
    :show-filters="true"
    :show-status-filter="true"
    :show-add-button="true"
    :show-view-toggle="true"
    add-button-text="Add New Customer"
    :search-query="searchQuery"
    :status-filter="statusFilter"
    :current-view="currentView"
    @add-clicked="showAddModal = true"
    @search-updated="searchQuery = $event"
    @status-filter-updated="statusFilter = $event"
    @clear-filters="clearFilters"
    @view-changed="currentView = $event"
  >
    <template #content>

    <!-- Customers Content -->
    <div class="content-card">
      <div v-if="isLoading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>Loading customers...</p>
      </div>

      <div v-else-if="filteredCustomers.length === 0 && !searchQuery" class="empty-state">
        <i class="fas fa-users"></i>
        <h3>No Customers Yet</h3>
        <p>Get started by adding your first customer</p>
        <button @click="showAddModal = true" class="btn btn-primary">
          <i class="fas fa-user-plus"></i>
          Add First Customer
        </button>
      </div>

      <div v-else-if="filteredCustomers.length === 0 && searchQuery" class="empty-state">
        <i class="fas fa-search"></i>
        <h3>No Results Found</h3>
        <p>Try adjusting your search criteria</p>
      </div>

      <!-- Grid View -->
      <div v-else-if="currentView === 'grid'" class="customers-grid">
        <div v-for="customer in paginatedCustomers" :key="customer.id" class="customer-card">
          <div class="customer-header">
            <div class="customer-avatar">
              {{ getInitials(customer.first_name, customer.last_name) }}
            </div>
            <div class="customer-info">
              <h3>{{ customer.first_name }} {{ customer.last_name }}</h3>
              <p class="customer-contact">{{ customer.phone }}</p>
              <p class="customer-email">{{ customer.email }}</p>
            </div>
            <div class="customer-status">
              <div class="status-toggle">
                <label class="toggle-switch">
                  <input 
                    type="checkbox" 
                    :checked="customer.is_active !== false"
                    @change="toggleCustomerStatus(customer)"
                    :disabled="isSubmitting"
                  />
                  <span class="slider"></span>
                </label>
              </div>
            </div>
          </div>

          <div class="customer-details">
            <div class="detail-item">
              <i class="fas fa-map-marker-alt"></i>
              <span>{{ formatAddress(customer.address) }}</span>
            </div>
            <div class="detail-item" v-if="customer.vehicles?.length">
              <i class="fas fa-car"></i>
              <span>{{ customer.vehicles.length }} vehicle{{ customer.vehicles.length !== 1 ? 's' : '' }}</span>
            </div>
            <div class="detail-item">
              <i class="fas fa-calendar-alt"></i>
              <span>Joined {{ formatDate(customer.created_at) }}</span>
            </div>
          </div>

          <div class="customer-actions">
            <button 
              @click="viewCustomer(customer)" 
              class="btn btn-outline-elegant btn-sm"
              title="View customer details"
            >
              <i class="fas fa-eye"></i>
              View
            </button>
            <button 
              @click="editCustomer(customer)" 
              class="btn btn-primary btn-sm"
              title="Edit customer"
            >
              <i class="fas fa-edit"></i>
              Edit
            </button>
            <button 
              @click="manageVehicles(customer)" 
              class="btn btn-success btn-sm"
              title="Manage vehicles"
              v-if="businessType === 'garage'"
            >
              <i class="fas fa-car"></i>
              Vehicles
            </button>
            <button 
              @click="deleteCustomer(customer)" 
              class="btn btn-danger btn-sm"
              title="Delete customer"
              v-if="!customer.is_active"
            >
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- List View -->
      <div v-else-if="currentView === 'list'" class="customers-table">
        <div class="table-header">
          <div class="header-cell">Customer</div>
          <div class="header-cell">Contact</div>
          <div class="header-cell">Address</div>
          <div class="header-cell" v-if="businessType === 'garage'">Vehicles</div>
          <div class="header-cell">Joined</div>
          <div class="header-cell">Status</div>
          <div class="header-cell">Actions</div>
        </div>
        
        <div 
          v-for="customer in paginatedCustomers" 
          :key="customer.id" 
          class="table-row"
          :class="{ 'inactive': !customer.is_active }"
        >
          <div class="table-cell">
            <div class="customer-info">
              <div class="customer-avatar small">
                {{ getInitials(customer.first_name, customer.last_name) }}
              </div>
              <div>
                <div class="name">{{ customer.first_name }} {{ customer.last_name }}</div>
                <div class="email">{{ customer.email }}</div>
              </div>
            </div>
          </div>
          
          <div class="table-cell">
            <div class="contact-info">
              <div class="phone">{{ customer.phone }}</div>
            </div>
          </div>
          
          <div class="table-cell">
            <div class="address">{{ formatAddress(customer.address) }}</div>
          </div>
          
          <div class="table-cell" v-if="businessType === 'garage'">
            <div class="vehicles-count">
              <i class="fas fa-car"></i>
              {{ customer.vehicles?.length || 0 }}
            </div>
          </div>
          
          <div class="table-cell">
            <div class="join-date">{{ formatDate(customer.created_at) }}</div>
          </div>
          
          <div class="table-cell">
            <span class="status-badge" :class="{ active: customer.is_active, inactive: !customer.is_active }">
              {{ customer.is_active ? 'Active' : 'Inactive' }}
            </span>
          </div>
          
          <div class="table-cell">
            <div class="action-buttons">
              <button 
                @click="viewCustomer(customer)" 
                class="btn-icon btn-view"
                title="View customer"
              >
                <i class="fas fa-eye"></i>
              </button>
              <button 
                @click="editCustomer(customer)" 
                class="btn-icon btn-edit"
                title="Edit customer"
              >
                <i class="fas fa-edit"></i>
              </button>
              <button 
                @click="manageVehicles(customer)" 
                class="btn-icon btn-vehicles"
                title="Manage vehicles"
                v-if="businessType === 'garage'"
              >
                <i class="fas fa-car"></i>
              </button>
              <button 
                @click="toggleCustomerStatus(customer)" 
                class="btn-icon btn-toggle"
                :title="customer.is_active ? 'Deactivate customer' : 'Activate customer'"
              >
                <i :class="customer.is_active ? 'fas fa-toggle-on' : 'fas fa-toggle-off'"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="pagination-container">
        <div class="pagination-info">
          Showing {{ (currentPage - 1) * itemsPerPage + 1 }} - {{ Math.min(currentPage * itemsPerPage, filteredCustomers.length) }} of {{ filteredCustomers.length }} customers
        </div>
        <div class="pagination-controls">
          <button 
            @click="currentPage = Math.max(1, currentPage - 1)"
            :disabled="currentPage === 1"
            class="btn btn-outline-elegant"
          >
            <i class="fas fa-chevron-left"></i>
            Previous
          </button>
          <span class="page-numbers">
            <button 
              v-for="page in visiblePages"
              :key="page"
              @click="currentPage = page"
              :class="['page-number', { active: page === currentPage }]"
            >
              {{ page }}
            </button>
          </span>
          <button 
            @click="currentPage = Math.min(totalPages, currentPage + 1)"
            :disabled="currentPage === totalPages"
            class="btn btn-outline-elegant"
          >
            Next
            <i class="fas fa-chevron-right"></i>
          </button>
        </div>
      </div>
    </div>
    </template>
  </PageTemplate>

  <!-- Customer Modal -->
  <CustomerModal
    v-if="showAddModal || showEditModal"
    :show="showAddModal || showEditModal"
    :customer="editingCustomer"
    @close="closeModals"
    @save="saveCustomer"
  />

  <!-- Customer Details Modal -->
  <CustomerDetailsModal
    v-if="showDetailsModal"
    :show="showDetailsModal"
    :customer="viewingCustomer"
    @close="showDetailsModal = false"
    @edit="editCustomer"
  />

  <!-- Vehicle Management Modal -->
  <VehicleManagementModal
    v-if="showVehiclesModal"
    :show="showVehiclesModal"
    :customer="managingCustomer"
    @close="showVehiclesModal = false"
  />
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import PageTemplate from '@/components/PageTemplate.vue'
import CustomerModal from '@/components/CustomerModal.vue'
import CustomerDetailsModal from '@/components/CustomerDetailsModal.vue'
import VehicleManagementModal from '@/components/VehicleManagementModal.vue'
import api from '@/services/api'

export default {
  name: 'Customers',
  components: {
    PageTemplate,
    CustomerModal,
    CustomerDetailsModal,
    VehicleManagementModal
  },
  setup() {
    // Reactive data
    const customers = ref([])
    const isLoading = ref(false)
    const isSubmitting = ref(false)
    const searchQuery = ref('')
    const statusFilter = ref('')
    const currentView = ref('grid')
    const currentPage = ref(1)
    const itemsPerPage = ref(20)
    const businessType = ref('garage') // This would come from the organization settings
    
    // Modals
    const showAddModal = ref(false)
    const showEditModal = ref(false)
    const showDetailsModal = ref(false)
    const showVehiclesModal = ref(false)
    const editingCustomer = ref(null)
    const viewingCustomer = ref(null)
    const managingCustomer = ref(null)

    // Computed properties
    const filteredCustomers = computed(() => {
      let filtered = customers.value

      // Filter by search query
      if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase()
        filtered = filtered.filter(customer => 
          customer.first_name?.toLowerCase().includes(query) ||
          customer.last_name?.toLowerCase().includes(query) ||
          customer.email?.toLowerCase().includes(query) ||
          customer.phone?.includes(query)
        )
      }

      // Filter by status
      if (statusFilter.value) {
        const isActive = statusFilter.value === 'active'
        filtered = filtered.filter(customer => customer.is_active === isActive)
      }

      return filtered
    })

    const paginatedCustomers = computed(() => {
      const start = (currentPage.value - 1) * itemsPerPage.value
      const end = start + itemsPerPage.value
      return filteredCustomers.value.slice(start, end)
    })

    const totalPages = computed(() => {
      return Math.ceil(filteredCustomers.value.length / itemsPerPage.value)
    })

    const visiblePages = computed(() => {
      const pages = []
      const total = totalPages.value
      const current = currentPage.value
      
      for (let i = Math.max(1, current - 2); i <= Math.min(total, current + 2); i++) {
        pages.push(i)
      }
      
      return pages
    })

    const activeCustomers = computed(() => {
      return customers.value.filter(c => c.is_active !== false).length
    })

    const totalVehicles = computed(() => {
      return customers.value.reduce((total, customer) => total + (customer.vehicles?.length || 0), 0)
    })

    const newThisMonth = computed(() => {
      const thisMonth = new Date()
      thisMonth.setDate(1)
      return customers.value.filter(c => new Date(c.created_at) >= thisMonth).length
    })

    const statsCards = computed(() => [
      {
        value: customers.value.length,
        label: 'Total Customers',
        icon: 'fas fa-users',
        type: 'total'
      },
      {
        value: activeCustomers.value,
        label: 'Active Customers',
        icon: 'fas fa-user-check',
        type: 'active'
      },
      {
        value: totalVehicles.value,
        label: 'Total Vehicles',
        icon: 'fas fa-car',
        type: 'info'
      },
      {
        value: newThisMonth.value,
        label: 'New This Month',
        icon: 'fas fa-calendar-plus',
        type: 'info'
      }
    ])

    // Methods
    const loadCustomers = async () => {
      isLoading.value = true
      try {
        const response = await api.get('/v1/customers')
        customers.value = response.data || []
      } catch (error) {
        console.error('Failed to load customers:', error)
        // Show empty state if API fails
        customers.value = []
      } finally {
        isLoading.value = false
      }
    }

    const filterCustomers = () => {
      currentPage.value = 1
    }

    const clearFilters = () => {
      searchQuery.value = ''
      statusFilter.value = ''
      filterCustomers()
    }

    const getInitials = (firstName, lastName) => {
      return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase()
    }

    const formatAddress = (address) => {
      if (!address) return 'No address provided'
      const parts = [address.street, address.suburb, address.state, address.postcode]
      return parts.filter(Boolean).join(', ')
    }

    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleDateString('en-AU')
    }

    const viewCustomer = (customer) => {
      viewingCustomer.value = customer
      showDetailsModal.value = true
    }

    const editCustomer = (customer) => {
      editingCustomer.value = customer
      showEditModal.value = true
    }

    const deleteCustomer = (customer) => {
      if (confirm(`Are you sure you want to delete ${customer.first_name} ${customer.last_name}?`)) {
        // Implementation for deleting customer
        console.log('Deleting customer:', customer)
      }
    }

    const toggleCustomerStatus = async (customer) => {
      if (isSubmitting.value) return
      
      isSubmitting.value = true
      try {
        // Implementation for toggling customer status
        customer.is_active = !customer.is_active
        console.log('Toggling customer status:', customer)
      } catch (error) {
        console.error('Failed to update customer status:', error)
        customer.is_active = !customer.is_active // Revert on error
      } finally {
        isSubmitting.value = false
      }
    }

    const manageVehicles = (customer) => {
      managingCustomer.value = customer
      showVehiclesModal.value = true
    }

    const closeModals = () => {
      showAddModal.value = false
      showEditModal.value = false
      showDetailsModal.value = false
      showVehiclesModal.value = false
      editingCustomer.value = null
      viewingCustomer.value = null
      managingCustomer.value = null
    }

    const saveCustomer = (customer) => {
      // Implementation for saving customer
      console.log('Saving customer:', customer)
      closeModals()
      loadCustomers()
    }

    // Lifecycle
    onMounted(() => {
      loadCustomers()
    })

    return {
      // Data
      customers,
      isLoading,
      isSubmitting,
      searchQuery,
      statusFilter,
      currentView,
      currentPage,
      itemsPerPage,
      businessType,
      
      // Modals
      showAddModal,
      showEditModal,
      showDetailsModal,
      showVehiclesModal,
      editingCustomer,
      viewingCustomer,
      managingCustomer,
      
      // Computed
      filteredCustomers,
      paginatedCustomers,
      totalPages,
      visiblePages,
      activeCustomers,
      totalVehicles,
      newThisMonth,
      statsCards,
      
      // Methods
      loadCustomers,
      filterCustomers,
      clearFilters,
      getInitials,
      formatAddress,
      formatDate,
      viewCustomer,
      editCustomer,
      deleteCustomer,
      toggleCustomerStatus,
      manageVehicles,
      closeModals,
      saveCustomer
    }
  }
}
</script>

<style scoped>
/* CSS Variables for Theme Support */
:root {
  --card-bg: rgba(255, 255, 255, 0.95);
  --card-border: rgba(0, 0, 0, 0.08);
  --stat-card-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  --shadow-strong: 0 8px 30px rgba(0, 0, 0, 0.12);
  --text-dark: #1f2937;
  --text-medium: #6b7280;
  --text-light: #9ca3af;
}

[data-theme="dark"] {
  --card-bg: rgba(31, 41, 55, 0.95);
  --card-border: rgba(75, 85, 99, 0.3);
  --stat-card-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  --shadow-strong: 0 8px 30px rgba(0, 0, 0, 0.5);
  --text-dark: #f3f4f6;
  --text-medium: #d1d5db;
  --text-light: #9ca3af;
}

.customers-page {
  padding: 2rem;
  width: 100%;
  background: var(--bs-body-bg);
  min-height: 100vh;
}

/* Header Styles */
.page-header {
  background: var(--card-bg);
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
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 32px rgba(79, 172, 254, 0.25);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
}

.title-icon:hover {
  transform: scale(1.05) translateY(-2px);
  box-shadow: 0 12px 40px rgba(79, 172, 254, 0.35);
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
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
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
  box-shadow: 0 8px 25px rgba(79, 172, 254, 0.3);
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  padding: 1.5rem;
  border-radius: 16px;
  box-shadow: var(--stat-card-shadow);
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: white;
}

.stat-icon.total { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
.stat-icon.active { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }
.stat-icon.vehicles { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); }
.stat-icon.recent { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }

.stat-content h3 {
  font-size: 1.8rem;
  font-weight: 700;
  margin: 0;
  color: var(--bs-body-color);
}

.stat-content p {
  font-size: 0.9rem;
  color: var(--bs-secondary);
  margin: 0.25rem 0;
}

.stat-change {
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
}

.stat-change.positive { 
  color: #28a745; 
  background: rgba(40, 167, 69, 0.1);
}
.stat-change.neutral { 
  color: var(--bs-secondary); 
  background: rgba(108, 117, 125, 0.1);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-xl);
  gap: var(--spacing-lg);
}

.header-content h1 {
  color: var(--text-primary);
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: var(--spacing-sm);
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.header-content p {
  color: var(--text-secondary);
  font-size: 1.1rem;
  margin: 0;
}

.stats-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
}

/* Customer specific styles */
.customers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: var(--spacing-lg);
}

.customer-card {
  background: var(--card-bg);
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: var(--stat-card-shadow);
  border: 1px solid var(--card-border);
  transition: all 0.3s ease;
}

.customer-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-strong);
}

.customer-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.customer-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: var(--gradient-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.2rem;
}

.customer-avatar.small {
  width: 40px;
  height: 40px;
  font-size: 0.9rem;
}

.customer-info {
  flex: 1;
}

.customer-info h3 {
  margin: 0 0 var(--spacing-xs) 0;
  color: var(--text-primary);
  font-weight: 600;
}

.customer-contact, .customer-email {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin: 2px 0;
}

.customer-details {
  margin-bottom: var(--spacing-lg);
}

.detail-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-sm);
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.detail-item i {
  width: 16px;
  color: var(--primary);
}

.customer-actions {
  display: flex;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

/* Table styles */
.customers-table {
  width: 100%;
  border-radius: var(--border-radius);
  overflow: hidden;
  box-shadow: var(--shadow-soft);
}

.table-header {
  display: grid;
  grid-template-columns: 250px 200px 250px 100px 120px 100px 120px;
  background: var(--gradient-primary);
  color: white;
  font-weight: 600;
  font-size: 0.9rem;
}

.table-row {
  display: grid;
  grid-template-columns: 250px 200px 250px 100px 120px 100px 120px;
  border-bottom: 1px solid var(--border-color);
  transition: all 0.2s ease;
  background: var(--card-bg);
}

.table-row:hover {
  background: var(--hover-bg);
  transform: translateX(4px);
}

.table-row.inactive {
  opacity: 0.7;
  background: #f9f9f9;
}

.header-cell, .table-cell {
  padding: var(--spacing-md);
  display: flex;
  align-items: center;
  border-right: 1px solid rgba(255, 255, 255, 0.2);
}

.table-cell {
  border-right: 1px solid var(--border-color);
}

.header-cell:last-child, .table-cell:last-child {
  border-right: none;
}

.name {
  font-weight: 600;
  color: var(--text-primary);
}

.email, .phone {
  color: var(--text-secondary);
  font-size: 0.85rem;
  margin-top: 2px;
}

.vehicles-count {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  color: var(--text-primary);
  font-weight: 500;
}

.status-badge {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-badge.active {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.status-badge.inactive {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.action-buttons {
  display: flex;
  gap: var(--spacing-xs);
}

.btn-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.8rem;
}

.btn-view {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.btn-view:hover {
  background: #3b82f6;
  color: white;
  transform: scale(1.1);
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

.btn-vehicles {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.btn-vehicles:hover {
  background: #10b981;
  color: white;
  transform: scale(1.1);
}

.btn-toggle {
  background: rgba(107, 114, 128, 0.1);
  color: #6b7280;
}

.btn-toggle:hover {
  background: #6b7280;
  color: white;
  transform: scale(1.1);
}

/* For garage business type, show vehicles column */
.table-header.garage,
.table-row.garage {
  grid-template-columns: 220px 180px 220px 100px 100px 100px 120px;
}

/* For salon business type, hide vehicles column */
.table-header.salon,
.table-row.salon {
  grid-template-columns: 250px 200px 300px 120px 100px 120px;
}

@media (max-width: 1200px) {
  .customers-grid {
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  }
}

@media (max-width: 900px) {
  .customers-grid {
    grid-template-columns: 1fr;
  }
  
  .table-header,
  .table-row {
    grid-template-columns: 1fr;
    grid-template-rows: auto;
  }
  
  .table-row {
    padding: var(--spacing-md);
    display: block;
    border-radius: var(--border-radius);
    margin-bottom: var(--spacing-md);
    box-shadow: var(--shadow-soft);
  }
  
  .table-cell {
    padding: var(--spacing-sm) 0;
    border: none;
    display: block;
  }
}

/* Dark Theme Additional Support */
[data-theme="dark"] .customer-avatar {
  background: linear-gradient(135deg, #4b5563 0%, #374151 100%);
  color: #f3f4f6;
}

[data-theme="dark"] .customer-info h3 {
  color: #f3f4f6;
}

[data-theme="dark"] .customer-contact,
[data-theme="dark"] .customer-email {
  color: #9ca3af;
}

[data-theme="dark"] .detail-item {
  color: #d1d5db;
}

[data-theme="dark"] .detail-item i {
  color: #9ca3af;
}

[data-theme="dark"] .btn-outline-elegant {
  background: rgba(31, 41, 55, 0.6);
  border-color: rgba(75, 85, 99, 0.4);
  color: #d1d5db;
}

[data-theme="dark"] .btn-outline-elegant:hover {
  background: rgba(55, 65, 81, 0.8);
  border-color: rgba(107, 114, 128, 0.5);
  color: #f3f4f6;
}

[data-theme="dark"] .toggle-switch input:checked + .slider {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
}

[data-theme="dark"] .toggle-switch .slider {
  background: #4b5563;
  border: 2px solid rgba(75, 85, 99, 0.3);
}

[data-theme="dark"] .loading-state,
[data-theme="dark"] .empty-state {
  background: rgba(31, 41, 55, 0.95);
  color: #f3f4f6;
}

[data-theme="dark"] .loading-state p,
[data-theme="dark"] .empty-state p {
  color: #9ca3af;
}

[data-theme="dark"] .empty-state i {
  color: #6b7280;
}

[data-theme="dark"] .pagination-section {
  background: rgba(31, 41, 55, 0.95);
  border: 1px solid rgba(75, 85, 99, 0.3);
}

[data-theme="dark"] .pagination-info {
  color: #9ca3af;
}

[data-theme="dark"] .pagination-btn:not(:disabled) {
  background: rgba(55, 65, 81, 0.6);
  color: #d1d5db;
}

[data-theme="dark"] .pagination-btn:not(:disabled):hover {
  background: rgba(75, 85, 99, 0.8);
  color: #f3f4f6;
}

[data-theme="dark"] .pagination-number {
  background: rgba(31, 41, 55, 0.6);
  color: #d1d5db;
}

[data-theme="dark"] .pagination-number:hover {
  background: rgba(55, 65, 81, 0.8);
  color: #f3f4f6;
}

[data-theme="dark"] .pagination-number.active {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
}

[data-theme="dark"] .per-page-select {
  background: rgba(17, 24, 39, 0.8);
  border: 2px solid rgba(75, 85, 99, 0.3);
  color: #f3f4f6;
}

[data-theme="dark"] .per-page-label {
  color: #9ca3af;
}
</style>