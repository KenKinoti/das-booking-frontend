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
      <div class="card">
        <div v-if="isLoading" class="card-body text-center">
          <div class="spinner-border" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
          <p class="mt-3">Loading customers...</p>
        </div>

        <div v-else-if="filteredCustomers.length === 0 && !searchQuery" class="card-body text-center">
          <i class="fas fa-users fa-4x text-muted mb-3"></i>
          <h3>No Customers Yet</h3>
          <p>Get started by adding your first customer</p>
          <button @click="showAddModal = true" class="btn btn-primary">
            <i class="fas fa-user-plus"></i>
            Add First Customer
          </button>
        </div>

        <div v-else-if="filteredCustomers.length === 0 && searchQuery" class="card-body text-center">
          <i class="fas fa-search fa-4x text-muted mb-3"></i>
          <h3>No Results Found</h3>
          <p>Try adjusting your search criteria</p>
        </div>

        <!-- Grid View -->
        <div v-else-if="currentView === 'grid'" class="card-body">
          <div class="content-grid three-col">
            <div v-for="customer in paginatedCustomers" :key="customer.id" class="card">
              <div class="card-body">
                <div class="d-flex align-items-center mb-3">
                  <div class="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" 
                       style="width: 48px; height: 48px;">
                    {{ getInitials(customer.first_name, customer.last_name) }}
                  </div>
                  <div class="ms-3">
                    <h5 class="mb-0">{{ customer.first_name }} {{ customer.last_name }}</h5>
                    <small class="text-muted">{{ customer.email }}</small>
                  </div>
                </div>
                
                <div class="mb-3">
                  <small class="text-muted d-block">Phone:</small>
                  <span>{{ customer.phone }}</span>
                </div>
                
                <div class="d-flex justify-content-between align-items-center">
                  <span class="status-badge" :class="customer.is_active ? 'active' : 'inactive'">
                    {{ customer.is_active ? 'Active' : 'Inactive' }}
                  </span>
                  <div class="btn-group btn-group-sm">
                    <button @click="viewCustomer(customer)" class="action-btn view-btn" title="View">
                      <i class="fas fa-eye"></i>
                    </button>
                    <button @click="editCustomer(customer)" class="action-btn edit-btn" title="Edit">
                      <i class="fas fa-edit"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- List View -->
        <div v-else class="table-responsive">
          <table class="table table-hover">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Contact</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="customer in paginatedCustomers" :key="customer.id">
                <td>
                  <div class="d-flex align-items-center">
                    <div class="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3" 
                         style="width: 40px; height: 40px; font-size: 0.875rem;">
                      {{ getInitials(customer.first_name, customer.last_name) }}
                    </div>
                    <div>
                      <div class="fw-medium">{{ customer.first_name }} {{ customer.last_name }}</div>
                      <small class="text-muted">{{ customer.email }}</small>
                    </div>
                  </div>
                </td>
                <td>{{ customer.phone }}</td>
                <td>
                  <span class="status-badge" :class="customer.is_active ? 'active' : 'inactive'">
                    {{ customer.is_active ? 'Active' : 'Inactive' }}
                  </span>
                </td>
                <td>
                  <div class="btn-group btn-group-sm">
                    <button @click="viewCustomer(customer)" class="action-btn view-btn" title="View">
                      <i class="fas fa-eye"></i>
                    </button>
                    <button @click="editCustomer(customer)" class="action-btn edit-btn" title="Edit">
                      <i class="fas fa-edit"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Modals -->
      <CustomerModal
        v-if="showAddModal || showEditModal"
        :show="showAddModal || showEditModal"
        :customer="editingCustomer"
        @close="closeModals"
        @save="saveCustomer"
      />

      <CustomerDetailsModal
        v-if="showDetailsModal"
        :show="showDetailsModal"
        :customer="viewingCustomer"
        @close="showDetailsModal = false"
        @edit="editCustomer"
      />
    </template>
  </PageTemplate>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import PageTemplate from '@/components/PageTemplate.vue'
import CustomerModal from '@/components/CustomerModal.vue'
import CustomerDetailsModal from '@/components/CustomerDetailsModal.vue'

export default {
  name: 'Customers',
  components: {
    PageTemplate,
    CustomerModal,
    CustomerDetailsModal
  },
  setup() {
    // Reactive data
    const customers = ref([])
    const isLoading = ref(false)
    const searchQuery = ref('')
    const statusFilter = ref('')
    const currentView = ref('grid')
    
    // Modals
    const showAddModal = ref(false)
    const showEditModal = ref(false)
    const showDetailsModal = ref(false)
    const editingCustomer = ref(null)
    const viewingCustomer = ref(null)

    // Computed properties
    const filteredCustomers = computed(() => {
      let filtered = customers.value
      if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase()
        filtered = filtered.filter(customer => 
          customer.first_name?.toLowerCase().includes(query) ||
          customer.last_name?.toLowerCase().includes(query) ||
          customer.email?.toLowerCase().includes(query) ||
          customer.phone?.includes(query)
        )
      }
      if (statusFilter.value) {
        const isActive = statusFilter.value === 'active'
        filtered = filtered.filter(c => c.is_active === isActive)
      }
      return filtered
    })

    const paginatedCustomers = computed(() => {
      return filteredCustomers.value // Simplified for now
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
        // Mock data for now
        customers.value = [
          {
            id: 1,
            first_name: 'John',
            last_name: 'Doe',
            email: 'john@example.com',
            phone: '(555) 123-4567',
            is_active: true,
            created_at: new Date().toISOString(),
            vehicles: [{ id: 1, make: 'Toyota' }]
          },
          {
            id: 2,
            first_name: 'Jane',
            last_name: 'Smith',
            email: 'jane@example.com',
            phone: '(555) 987-6543',
            is_active: true,
            created_at: new Date().toISOString(),
            vehicles: []
          }
        ]
      } catch (error) {
        console.error('Error loading customers:', error)
      } finally {
        isLoading.value = false
      }
    }

    const clearFilters = () => {
      searchQuery.value = ''
      statusFilter.value = ''
    }

    const getInitials = (firstName, lastName) => {
      return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase()
    }

    const viewCustomer = (customer) => {
      viewingCustomer.value = customer
      showDetailsModal.value = true
    }

    const editCustomer = (customer) => {
      editingCustomer.value = customer
      showEditModal.value = true
    }

    const closeModals = () => {
      showAddModal.value = false
      showEditModal.value = false
      editingCustomer.value = null
    }

    const saveCustomer = (customerData) => {
      console.log('Saving customer:', customerData)
      closeModals()
      loadCustomers() // Refresh data
    }

    onMounted(() => {
      loadCustomers()
    })

    return {
      // Data
      customers,
      isLoading,
      searchQuery,
      statusFilter,
      currentView,
      
      // Modals
      showAddModal,
      showEditModal,
      showDetailsModal,
      editingCustomer,
      viewingCustomer,
      
      // Computed
      filteredCustomers,
      paginatedCustomers,
      activeCustomers,
      totalVehicles,
      newThisMonth,
      statsCards,
      
      // Methods
      loadCustomers,
      clearFilters,
      getInitials,
      viewCustomer,
      editCustomer,
      closeModals,
      saveCustomer
    }
  }
}
</script>

<style scoped>
/* Use global styles with minimal custom styles */
</style>