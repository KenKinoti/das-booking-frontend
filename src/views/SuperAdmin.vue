<template>
  <div class="page-container">
    <!-- Page Header -->
    <div class="page-header">
      <div class="page-header-content">
        <div class="page-title-section">
          <h1 class="page-title">
            <i class="fas fa-building"></i>
            Organizations Management
          </h1>
          <p class="page-subtitle">Manage all organizations, subscriptions, and user access in your system</p>
        </div>
      </div>
    </div>
    <!-- Action Buttons Section -->
    <div class="page-actions d-flex justify-content-end mb-4">
      <button @click="openCreateModal" class="btn btn-primary">
        <i class="fas fa-plus me-2"></i> Create Organization
      </button>
    </div>

    <!-- Search and Filters -->
    <div class="filters-section">
      <div class="filters-row">
        <div class="search-box">
          <i class="fas fa-search"></i>
          <input
            v-model="searchQuery"
            @input="debouncedSearch"
            placeholder="Search by name, email, ABN, phone..."
            class="form-input"
            type="text"
          />
          <div v-if="searchQuery && searchResults.length > 0" class="search-dropdown">
            <div v-for="result in searchResults.slice(0, 5)" :key="result.id" class="search-result-item" @click="selectOrganization(result)">
              <div class="result-main">
                <span class="result-name">{{ result.name }}</span>
                <span class="result-type">{{ result.subscription?.plan_name || 'No Plan' }}</span>
              </div>
              <div class="result-details">
                <span v-if="result.email">{{ result.email }}</span>
                <span v-if="result.abn">ABN: {{ result.abn }}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="filter-controls">
          <select v-model="statusFilter" @change="handleSearch" class="form-select">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="cancelled">Cancelled</option>
            <option value="inactive">Inactive</option>
          </select>

          <select v-model="planFilter" @change="handleSearch" class="form-select">
            <option value="">All Plans</option>
            <option value="starter">Starter</option>
            <option value="professional">Professional</option>
            <option value="enterprise">Enterprise</option>
          </select>
          
          <button @click="clearFilters" class="btn btn-outline-elegant">
            <i class="fas fa-times"></i>
            Clear Filters
          </button>
        </div>
      </div>
    </div>

    <!-- Organizations List -->
    <div class="content-card">

        <div v-if="loading" class="loading-state">
          <div class="loading-spinner"></div>
          <p>Loading organizations...</p>
        </div>

        <div v-else-if="organizations.length === 0" class="empty-state">
          <i class="fas fa-building"></i>
          <p>No organizations found</p>
        </div>

        <div v-else class="organizations-table">
          <div class="organizations-grid">
            <div v-for="org in organizations" :key="org.id" class="organization-card">
              <div class="org-header">
                <div class="org-avatar">
                  <i class="fas fa-building"></i>
                </div>
                <div class="org-basic-info">
                  <h3 class="org-name">{{ org.name }}</h3>
                  <div class="org-details">
                    <span v-if="org.abn" class="detail-item">
                      <i class="fas fa-file-alt"></i>
                      ABN: {{ org.abn }}
                    </span>
                    <span v-if="org.website" class="detail-item">
                      <i class="fas fa-globe"></i>
                      {{ org.website }}
                    </span>
                  </div>
                </div>
                <div class="org-status">
                  <span class="status-badge" :class="`status-${getSubscriptionStatus(org).toLowerCase()}`">
                    {{ formatStatus(getSubscriptionStatus(org)) }}
                  </span>
                </div>
              </div>

              <div class="org-stats">
                <div class="stat-item">
                  <div class="stat-icon users">
                    <i class="fas fa-users"></i>
                  </div>
                  <div class="stat-content">
                    <div class="stat-number">{{ org.users?.length || 0 }}</div>
                    <div class="stat-label">Users</div>
                  </div>
                </div>
                <div class="stat-item">
                  <div class="stat-icon participants">
                    <i class="fas fa-user-friends"></i>
                  </div>
                  <div class="stat-content">
                    <div class="stat-number">{{ org.participants?.length || 0 }}</div>
                    <div class="stat-label">Participants</div>
                  </div>
                </div>
                <div class="stat-item">
                  <div class="stat-icon subscription">
                    <i class="fas fa-credit-card"></i>
                  </div>
                  <div class="stat-content">
                    <div class="stat-number">{{ getSubscriptionPlan(org) }}</div>
                    <div class="stat-label">Plan</div>
                  </div>
                </div>
              </div>

              <div class="org-contact">
                <div v-if="org.email" class="contact-item">
                  <i class="fas fa-envelope"></i>
                  <span>{{ org.email }}</span>
                </div>
                <div v-if="org.phone" class="contact-item">
                  <i class="fas fa-phone"></i>
                  <span>{{ org.phone }}</span>
                </div>
                <div class="contact-item">
                  <i class="fas fa-calendar-alt"></i>
                  <span>Created {{ formatDate(org.created_at) }}</span>
                </div>
              </div>

              <div class="org-actions">
                <button @click="viewOrganization(org)" class="btn-action btn-view" title="View Organization">
                  <i class="fas fa-eye"></i>
                  <span>View</span>
                </button>
                <button @click="editOrganization(org)" class="btn-action btn-edit" title="Edit Organization">
                  <i class="fas fa-edit"></i>
                  <span>Edit</span>
                </button>
                <button @click="editStatus(org)" class="btn-action btn-status" title="Edit Status">
                  <i class="fas fa-toggle-on"></i>
                  <span>Status</span>
                </button>
                <button @click="loginAsOrganization(org)" class="btn-action btn-login" title="Login As Organization">
                  <i class="fas fa-sign-in-alt"></i>
                  <span>Login As</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Pagination -->
        <div v-if="pagination.total_pages > 1" class="pagination">
          <button 
            @click="changePage(pagination.page - 1)" 
            :disabled="pagination.page === 1"
            class="btn btn-sm"
          >
            Previous
          </button>
          
          <span class="page-info">
            Page {{ pagination.page }} of {{ pagination.total_pages }}
            ({{ pagination.total }} total)
          </span>

          <button 
            @click="changePage(pagination.page + 1)" 
            :disabled="pagination.page === pagination.total_pages"
            class="btn btn-sm"
          >
            Next
          </button>
        </div>
    </div>

    <!-- Create Organization Modal -->
    <div v-if="showCreateModal" class="modal-overlay" @click="closeCreateModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>{{ isEditMode ? 'Edit Organization' : 'Create New Organization' }}</h3>
          <button @click="closeCreateModal" class="btn-close">×</button>
        </div>

        <div class="modal-body">
          <form @submit.prevent="createOrganization">
            <div class="form-row">
              <div class="form-group">
                <label>Organization Name *</label>
                <input v-model="newOrganization.name" type="text" required>
              </div>
              <div class="form-group">
                <label>ABN</label>
                <input v-model="newOrganization.abn" type="text">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Email *</label>
                <input v-model="newOrganization.email" type="email" required>
              </div>
              <div class="form-group">
                <label>Phone</label>
                <input v-model="newOrganization.phone" type="tel">
              </div>
            </div>

            <div class="form-group">
              <label>Website</label>
              <input v-model="newOrganization.website" type="url">
            </div>

            <div v-if="!isEditMode">
              <h4>Admin User</h4>
              <div class="form-row">
                <div class="form-group">
                  <label>First Name *</label>
                  <input v-model="newOrganization.admin_user.first_name" type="text" required>
                </div>
                <div class="form-group">
                  <label>Last Name *</label>
                  <input v-model="newOrganization.admin_user.last_name" type="text" required>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Admin Email *</label>
                  <input v-model="newOrganization.admin_user.email" type="email" required>
                </div>
                <div class="form-group">
                  <label>Admin Phone</label>
                  <input v-model="newOrganization.admin_user.phone" type="tel">
                </div>
              </div>

              <div class="form-group">
                <label>Admin Password *</label>
                <input v-model="newOrganization.admin_user.password" type="password" required>
              </div>
            </div>

            <h4>Subscription Plan</h4>
            <div class="form-row">
              <div class="form-group">
                <label>Plan Name *</label>
                <select v-model="newOrganization.subscription.plan_name" required>
                  <option value="">Select Plan</option>
                  <option value="starter">Starter</option>
                  <option value="professional">Professional</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div class="form-group">
                <label>Billing Email *</label>
                <input v-model="newOrganization.subscription.billing_email" type="email" required>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Max Users *</label>
                <input v-model.number="newOrganization.subscription.max_users" type="number" min="1" required>
              </div>
              <div class="form-group">
                <label>Max Participants *</label>
                <input v-model.number="newOrganization.subscription.max_participants" type="number" min="1" required>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Max Storage (GB) *</label>
                <input v-model.number="newOrganization.subscription.max_storage_gb" type="number" min="1" required>
              </div>
              <div class="form-group">
                <label>Billing Cycle *</label>
                <select v-model="newOrganization.subscription.billing_cycle" required>
                  <option value="">Select Cycle</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </div>

            <div class="form-actions">
              <button type="button" @click="closeCreateModal" class="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" :disabled="createLoading" class="btn btn-primary">
                <i v-if="createLoading" class="fas fa-spinner fa-spin"></i>
                {{ isEditMode ? 'Update Organization' : 'Create Organization' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Status Edit Modal -->
    <div v-if="showStatusModal" class="modal-overlay" @click="showStatusModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>Update Organization Status</h3>
          <button @click="showStatusModal = false" class="btn-close">×</button>
        </div>

        <div class="modal-body">
          <form @submit.prevent="updateOrganizationStatus">
            <div class="form-group">
              <label>Organization</label>
              <input :value="selectedOrg?.name" type="text" readonly>
            </div>

            <div class="form-group">
              <label>Status *</label>
              <select v-model="statusUpdate.status" required>
                <option value="">Select Status</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div class="form-group">
              <label>Reason</label>
              <textarea v-model="statusUpdate.reason" rows="3" placeholder="Optional reason for status change"></textarea>
            </div>

            <div class="form-actions">
              <button type="button" @click="showStatusModal = false" class="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" :disabled="statusLoading" class="btn btn-primary">
                <i v-if="statusLoading" class="fas fa-spinner fa-spin"></i>
                Update Status
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Organization Details Modal -->
    <div v-if="showDetailsModal" class="modal-overlay" @click="showDetailsModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>Organization Details</h3>
          <button @click="showDetailsModal = false" class="btn-close">×</button>
        </div>

        <div class="modal-body" v-if="orgDetails">
          <div class="details-grid">
            <div class="detail-section">
              <h4>Organization Info</h4>
              <div class="detail-item">
                <label>Name:</label>
                <span>{{ orgDetails.organization.name }}</span>
              </div>
              <div class="detail-item" v-if="orgDetails.organization.abn">
                <label>ABN:</label>
                <span>{{ orgDetails.organization.abn }}</span>
              </div>
              <div class="detail-item" v-if="orgDetails.organization.email">
                <label>Email:</label>
                <span>{{ orgDetails.organization.email }}</span>
              </div>
              <div class="detail-item" v-if="orgDetails.organization.phone">
                <label>Phone:</label>
                <span>{{ orgDetails.organization.phone }}</span>
              </div>
              <div class="detail-item" v-if="orgDetails.organization.website">
                <label>Website:</label>
                <span>{{ orgDetails.organization.website }}</span>
              </div>
            </div>

            <div class="detail-section">
              <h4>Subscription</h4>
              <div class="detail-item">
                <label>Plan:</label>
                <span>{{ orgDetails.subscription.plan_name }}</span>
              </div>
              <div class="detail-item">
                <label>Status:</label>
                <span class="status-badge" :class="`status-${orgDetails.subscription.status}`">
                  {{ orgDetails.subscription.status }}
                </span>
              </div>
              <div class="detail-item">
                <label>Monthly Rate:</label>
                <span>${{ orgDetails.subscription.monthly_rate }}</span>
              </div>
              <div class="detail-item">
                <label>Max Users:</label>
                <span>{{ orgDetails.subscription.max_users }}</span>
              </div>
              <div class="detail-item">
                <label>Max Participants:</label>
                <span>{{ orgDetails.subscription.max_participants }}</span>
              </div>
              <div class="detail-item">
                <label>Max Storage:</label>
                <span>{{ orgDetails.subscription.max_storage_gb }} GB</span>
              </div>
            </div>

            <div class="detail-section">
              <h4>Users ({{ orgDetails.organization.users?.length || 0 }})</h4>
              <div class="user-list" v-if="orgDetails.organization.users?.length">
                <div v-for="user in orgDetails.organization.users" :key="user.id" class="user-item">
                  <span class="user-name">{{ user.first_name }} {{ user.last_name }}</span>
                  <span class="user-email">{{ user.email }}</span>
                  <span class="user-role">{{ user.role }}</span>
                </div>
              </div>
              <div v-else class="empty-state">No users found</div>
            </div>

            <div class="detail-section">
              <h4>Participants ({{ orgDetails.organization.participants?.length || 0 }})</h4>
              <div class="participant-list" v-if="orgDetails.organization.participants?.length">
                <div v-for="participant in orgDetails.organization.participants" :key="participant.id" class="participant-item">
                  <span class="participant-name">{{ participant.first_name }} {{ participant.last_name }}</span>
                  <span class="participant-ndis">{{ participant.ndis_number }}</span>
                </div>
              </div>
              <div v-else class="empty-state">No participants found</div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <div class="modal-actions">
            <button @click="showDetailsModal = false" class="btn btn-secondary">
              <i class="fas fa-times"></i>
              Close
            </button>
            <button @click="confirmDeleteOrganization(orgDetails.organization)" class="btn btn-danger">
              <i class="fas fa-trash"></i>
              Delete Organization
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Delete Confirmation Modal -->
  <div v-if="showDeleteModal && selectedOrg" class="modal-overlay" @click="showDeleteModal = false">
    <div class="modal-content delete-modal" @click.stop>
      <div class="modal-header">
        <h3>Confirm Delete Organization</h3>
        <button @click="showDeleteModal = false" class="btn-close">×</button>
      </div>
      
      <div class="modal-body">
        <div class="delete-confirmation">
          <div class="delete-icon">
            <i class="fas fa-exclamation-triangle"></i>
          </div>
          <h4>Are you sure you want to delete this organization?</h4>
          <div class="org-summary">
            <p><strong>Organization:</strong> {{ selectedOrg.name }}</p>
            <p v-if="selectedOrg.email"><strong>Email:</strong> {{ selectedOrg.email }}</p>
            <p v-if="selectedOrg.abn"><strong>ABN:</strong> {{ selectedOrg.abn }}</p>
            <p><strong>Users:</strong> {{ selectedOrg.users?.length || 0 }}</p>
            <p><strong>Participants:</strong> {{ selectedOrg.participants?.length || 0 }}</p>
          </div>
          <p class="warning-text">
            <i class="fas fa-exclamation-circle"></i>
            This action cannot be undone. All data associated with this organization will be permanently deleted.
          </p>
        </div>
      </div>

      <div class="modal-footer">
        <div class="modal-actions">
          <button @click="showDeleteModal = false" class="btn btn-view">
            <i class="fas fa-times"></i>
            Cancel
          </button>
          <button @click="confirmDelete" class="btn btn-delete">
            <i class="fas fa-trash"></i>
            Delete Organization
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, onMounted } from 'vue'
import { superAdminOrganizationService } from '../services/superAdminOrganization'
import { showModal } from '../utils/errorHandler'

export default {
  name: 'SuperAdmin',
  setup() {
    const showNotification = (message, type = 'info') => {
      showModal(message, type, type.charAt(0).toUpperCase() + type.slice(1))
    }

    // Reactive state
    const organizations = ref([])
    const loading = ref(false)
    const searchQuery = ref('')
    const statusFilter = ref('')
    const planFilter = ref('')
    const pagination = ref({
      page: 1,
      limit: 20,
      total: 0,
      total_pages: 0
    })

    // Modals
    const showCreateModal = ref(false)
    const showStatusModal = ref(false)
    const showDetailsModal = ref(false)
    const showDeleteModal = ref(false)
    const createLoading = ref(false)
    const statusLoading = ref(false)
    const isEditMode = ref(false)
    
    // Selected items
    const selectedOrg = ref(null)
    const orgDetails = ref(null)

    // Form data
    const newOrganization = reactive({
      name: '',
      abn: '',
      email: '',
      phone: '',
      website: '',
      address: {
        street: '',
        suburb: '',
        state: '',
        postcode: '',
        country: 'Australia'
      },
      ndis_registration: {
        registration_number: '',
        registration_status: '',
        expiry_date: null
      },
      admin_user: {
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        password: ''
      },
      subscription: {
        plan_name: '',
        billing_email: '',
        max_users: 5,
        max_participants: 10,
        max_storage_gb: 5,
        billing_cycle: 'monthly'
      }
    })

    const statusUpdate = reactive({
      status: '',
      reason: ''
    })


    const searchResults = ref([])
    const searchTimeout = ref(null)

    // API calls
    const fetchOrganizations = async () => {
      loading.value = true
      try {
        const params = {
          page: pagination.value.page,
          limit: pagination.value.limit,
          search: searchQuery.value,
          status: statusFilter.value
        }

        const response = await superAdminOrganizationService.getAllOrganizations(
          params.page,
          params.limit,
          params.search
        )

        if (response.success) {
          let orgsData = response.data.organizations || []

          // Apply client-side plan filter if specified
          if (planFilter.value) {
            orgsData = orgsData.filter(org =>
              org.subscription?.plan_name?.toLowerCase() === planFilter.value.toLowerCase()
            )
          }

          organizations.value = orgsData
          pagination.value = {
            page: response.data.current_page || 1,
            limit: response.data.per_page || 20,
            total: response.data.total || 0,
            total_pages: response.data.last_page || 1
          }
        } else {
          // Fallback to mock data if API fails or doesn't exist
          loadMockData()
        }
      } catch (error) {
        console.warn('API endpoint not available, using mock data:', error.message)
        loadMockData()
      } finally {
        loading.value = false
      }
    }

    // Fallback mock data for demonstration
    const loadMockData = () => {
      const mockOrganizations = [
        {
          id: 1,
          name: 'DASYIN Solutions',
          abn: '12 345 678 901',
          email: 'admin@dasyin.com',
          phone: '+61 2 8765 4321',
          website: 'https://dasyin.com',
          created_at: '2023-01-15T00:00:00Z',
          subscription: {
            plan_name: 'enterprise',
            status: 'active',
            billing_email: 'billing@dasyin.com',
            max_users: 100,
            max_participants: 1000,
            max_storage_gb: 100,
            billing_cycle: 'yearly',
            monthly_rate: 299
          },
          users: new Array(15).fill(null).map((_, i) => ({ id: i + 1 })),
          participants: new Array(234).fill(null).map((_, i) => ({ id: i + 1 }))
        },
        {
          id: 2,
          name: 'TechCorp Industries',
          abn: '98 765 432 109',
          email: 'contact@techcorp.com',
          phone: '+61 3 9876 5432',
          website: 'https://techcorp.com',
          created_at: '2023-03-22T00:00:00Z',
          subscription: {
            plan_name: 'professional',
            status: 'active',
            billing_email: 'accounts@techcorp.com',
            max_users: 25,
            max_participants: 250,
            max_storage_gb: 50,
            billing_cycle: 'monthly',
            monthly_rate: 99
          },
          users: new Array(8).fill(null).map((_, i) => ({ id: i + 1 })),
          participants: new Array(67).fill(null).map((_, i) => ({ id: i + 1 }))
        },
        {
          id: 3,
          name: 'StartupHub',
          abn: '56 789 012 345',
          email: 'hello@startuphub.com',
          phone: '+61 7 3456 7890',
          website: 'https://startuphub.com',
          created_at: '2023-07-10T00:00:00Z',
          subscription: {
            plan_name: 'starter',
            status: 'suspended',
            billing_email: 'finance@startuphub.com',
            max_users: 5,
            max_participants: 50,
            max_storage_gb: 10,
            billing_cycle: 'monthly',
            monthly_rate: 29
          },
          users: new Array(3).fill(null).map((_, i) => ({ id: i + 1 })),
          participants: new Array(12).fill(null).map((_, i) => ({ id: i + 1 }))
        }
      ]

      // Apply filters to mock data
      let filteredData = mockOrganizations

      if (searchQuery.value) {
        filteredData = filteredData.filter(org =>
          org.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
          org.email.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
          org.abn.includes(searchQuery.value) ||
          org.phone.includes(searchQuery.value)
        )
      }

      if (statusFilter.value) {
        filteredData = filteredData.filter(org =>
          org.subscription?.status?.toLowerCase() === statusFilter.value.toLowerCase()
        )
      }

      if (planFilter.value) {
        filteredData = filteredData.filter(org =>
          org.subscription?.plan_name?.toLowerCase() === planFilter.value.toLowerCase()
        )
      }

      organizations.value = filteredData
      pagination.value = {
        page: 1,
        limit: 20,
        total: filteredData.length,
        total_pages: Math.ceil(filteredData.length / 20)
      }

      showNotification('Using demonstration data - Super Admin API not available', 'info')
    }

    const fetchOrganizationDetails = async (orgId) => {
      try {
        const response = await superAdminOrganizationService.getOrganizationById(orgId)
        if (response.success) {
          orgDetails.value = response.data
        } else {
          showNotification('Failed to fetch organization details', 'error')
        }
      } catch (error) {
        showNotification('Error fetching organization details: ' + error.message, 'error')
        console.error('Error fetching organization details:', error)
      }
    }

    const createOrganization = async () => {
      createLoading.value = true
      try {
        let response
        if (isEditMode.value && selectedOrg.value) {
          // For editing, we'll use the updateOrganizationStatus as a placeholder
          // In a real implementation, you would create an updateOrganization API method
          const basicData = {
            name: newOrganization.name,
            abn: newOrganization.abn,
            email: newOrganization.email,
            phone: newOrganization.phone,
            website: newOrganization.website
          }
          // Note: This is a simplified approach. In a real implementation,
          // you would have a separate updateOrganization method in the API service
          response = { success: true, data: basicData }
          showNotification('Organization updated successfully (simulated)', 'info')
        } else {
          response = await superAdminOrganizationService.createOrganization(newOrganization)
          if (response.success) {
            showNotification('Organization created successfully', 'success')
          }
        }

        if (response.success) {
          closeCreateModal()
          fetchOrganizations()
        }
      } catch (error) {
        const action = isEditMode.value ? 'updating' : 'creating'
        showNotification(`Error ${action} organization: ` + error.message, 'error')
      } finally {
        createLoading.value = false
      }
    }

    const updateOrganizationStatus = async () => {
      statusLoading.value = true
      try {
        const response = await superAdminOrganizationService.updateOrganizationStatus(
          selectedOrg.value.id, 
          statusUpdate.status
        )
        
        if (response.success) {
          showNotification('Organization status updated successfully', 'success')
          showStatusModal.value = false
          fetchOrganizations()
        }
      } catch (error) {
        showNotification('Error updating organization status: ' + error.message, 'error')
      } finally {
        statusLoading.value = false
      }
    }

    const confirmDeleteOrganization = (org) => {
      selectedOrg.value = org
      showDeleteModal.value = true
    }

    const confirmDelete = async () => {
      if (!selectedOrg.value) return
      
      try {
        const response = await superAdminOrganizationService.deleteOrganization(selectedOrg.value.id)
        
        if (response.success) {
          showNotification('Organization deleted successfully', 'success')
          showDetailsModal.value = false
          showDeleteModal.value = false
          await fetchOrganizations()
        }
      } catch (error) {
        showNotification('Error deleting organization: ' + error.message, 'error')
      }
    }

    const deleteOrganization = async (org) => {
      if (!confirm(`Are you sure you want to delete "${org.name}"? This action cannot be undone.`)) {
        return
      }

      try {
        const response = await superAdminOrganizationService.deleteOrganization(org.id)
        
        if (response.success) {
          showNotification('Organization deleted successfully', 'success')
          showDetailsModal.value = false
          fetchOrganizations()
        }
      } catch (error) {
        showNotification('Error deleting organization: ' + error.message, 'error')
      }
    }

    // Helper functions
    const debouncedSearch = () => {
      if (searchTimeout.value) {
        clearTimeout(searchTimeout.value)
      }

      searchTimeout.value = setTimeout(() => {
        handleSearch()
      }, 500)
    }

    const handleSearch = async () => {
      // Update search results for dropdown
      if (searchQuery.value) {
        try {
          const response = await superAdminOrganizationService.getAllOrganizations(
            1, // First page for search results
            10,  // Increased limit for better search results
            searchQuery.value
          )

          if (response.success) {
            let results = response.data.organizations || []

            // Apply filters to search results
            if (statusFilter.value) {
              results = results.filter(org =>
                org.subscription?.status?.toLowerCase() === statusFilter.value.toLowerCase()
              )
            }
            if (planFilter.value) {
              results = results.filter(org =>
                org.subscription?.plan_name?.toLowerCase() === planFilter.value.toLowerCase()
              )
            }

            searchResults.value = results.slice(0, 5) // Limit dropdown to 5 items
          } else {
            searchResults.value = []
          }
        } catch {
          // For search dropdown, just clear results if API is not available
          searchResults.value = []
          console.warn('Search API not available')
        }
      } else {
        searchResults.value = []
      }

      // Reset pagination and fetch
      pagination.value.page = 1
      fetchOrganizations()
    }

    const selectOrganization = (org) => {
      searchQuery.value = org.name
      searchResults.value = []
      pagination.value.page = 1
      fetchOrganizations()
    }

    const changePage = (page) => {
      if (page >= 1 && page <= pagination.value.total_pages) {
        pagination.value.page = page
        fetchOrganizations()
      }
    }

    const resetCreateForm = () => {
      Object.assign(newOrganization, {
        name: '',
        abn: '',
        email: '',
        phone: '',
        website: '',
        address: {
          street: '',
          suburb: '',
          state: '',
          postcode: '',
          country: 'Australia'
        },
        ndis_registration: {
          registration_number: '',
          registration_status: '',
          expiry_date: null
        },
        admin_user: {
          first_name: '',
          last_name: '',
          email: '',
          phone: '',
          password: ''
        },
        subscription: {
          plan_name: '',
          billing_email: '',
          max_users: 5,
          max_participants: 10,
          max_storage_gb: 5,
          billing_cycle: 'monthly'
        }
      })
    }

    const openCreateModal = () => {
      isEditMode.value = false
      selectedOrg.value = null
      resetCreateForm()
      showCreateModal.value = true
    }

    const closeCreateModal = () => {
      showCreateModal.value = false
      isEditMode.value = false
      selectedOrg.value = null
      resetCreateForm()
    }

    const viewOrganization = async (org) => {
      selectedOrg.value = org
      await fetchOrganizationDetails(org.id)
      showDetailsModal.value = true
    }

    const editStatus = (org) => {
      selectedOrg.value = org
      statusUpdate.status = getSubscriptionStatus(org)
      statusUpdate.reason = ''
      showStatusModal.value = true
    }

    const editOrganization = async (org) => {
      selectedOrg.value = org

      // Populate the edit form with current organization data
      Object.assign(newOrganization, {
        name: org.name || '',
        abn: org.abn || '',
        email: org.email || '',
        phone: org.phone || '',
        website: org.website || '',
        address: {
          street: org.address?.street || '',
          suburb: org.address?.suburb || '',
          state: org.address?.state || '',
          postcode: org.address?.postcode || '',
          country: org.address?.country || 'Australia'
        },
        ndis_registration: {
          registration_number: org.ndis_registration?.registration_number || '',
          registration_status: org.ndis_registration?.registration_status || '',
          expiry_date: org.ndis_registration?.expiry_date || null
        },
        admin_user: {
          first_name: '',
          last_name: '',
          email: '',
          phone: '',
          password: ''
        },
        subscription: {
          plan_name: org.subscription?.plan_name || '',
          billing_email: org.subscription?.billing_email || '',
          max_users: org.subscription?.max_users || 5,
          max_participants: org.subscription?.max_participants || 10,
          max_storage_gb: org.subscription?.max_storage_gb || 5,
          billing_cycle: org.subscription?.billing_cycle || 'monthly'
        }
      })

      // Show create modal in edit mode
      isEditMode.value = true
      showCreateModal.value = true
    }

    const loginAsOrganization = (org) => {
      // This would typically switch context to the organization
      showNotification(`Login as "${org.name}" functionality is not yet implemented.`, 'info')
      console.log('Login as organization:', org)
    }

    const clearFilters = () => {
      searchQuery.value = ''
      statusFilter.value = ''
      planFilter.value = ''
      searchResults.value = []
      pagination.value.page = 1
      fetchOrganizations()
    }

    const getSubscriptionPlan = (org) => {
      return org.subscription?.plan_name || 'Unknown'
    }

    const getSubscriptionStatus = (org) => {
      return org.subscription?.status || 'active'
    }

    const formatDate = (dateString) => {
      if (!dateString) return 'N/A'
      return new Date(dateString).toLocaleDateString()
    }

    const formatStatus = (status) => {
      if (!status) return 'Active'
      return status.charAt(0).toUpperCase() + status.slice(1)
    }

    // Lifecycle
    onMounted(() => {
      fetchOrganizations()
      
      // Auto-refresh data when window gains focus to prevent stale data
      const handleFocus = () => {
        fetchOrganizations()
      }
      
      window.addEventListener('focus', handleFocus)
      
      // Cleanup on unmount  
      return () => {
        window.removeEventListener('focus', handleFocus)
      }
    })

    return {
      // State
      organizations,
      loading,
      searchQuery,
      statusFilter,
      planFilter,
      pagination,
      showCreateModal,
      showStatusModal,
      showDetailsModal,
      showDeleteModal,
      createLoading,
      statusLoading,
      isEditMode,
      selectedOrg,
      orgDetails,
      newOrganization,
      statusUpdate,
      searchResults,

      // Methods
      fetchOrganizations,
      createOrganization,
      updateOrganizationStatus,
      confirmDeleteOrganization,
      confirmDelete,
      deleteOrganization,
      handleSearch,
      debouncedSearch,
      selectOrganization,
      changePage,
      viewOrganization,
      editStatus,
      editOrganization,
      loginAsOrganization,
      clearFilters,
      openCreateModal,
      closeCreateModal,
      getSubscriptionPlan,
      getSubscriptionStatus,
      formatDate,
      formatStatus
    }
  }
}
</script>

<style scoped>
/* Organizations page using consistent site design system */

/* Organizations Grid */
.organizations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: var(--spacing-lg);
  padding: var(--spacing-md) 0;
}

/* Organization Cards */
.organization-card {
  background: var(--card-background);
  backdrop-filter: blur(20px);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-xl);
  box-shadow: var(--shadow-medium);
  transition: var(--transition-smooth);
  position: relative;
  overflow: hidden;
}

.organization-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--primary-gradient);
}

.organization-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-strong);
  border-color: var(--primary-color);
}

/* Organization Header */
.org-header {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-lg);
}

.org-avatar {
  width: 48px;
  height: 48px;
  background: var(--primary-gradient);
  border-radius: var(--border-radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  color: var(--text-white);
  box-shadow: var(--shadow-soft);
  transition: var(--transition-smooth);
  flex-shrink: 0;
}

.organization-card:hover .org-avatar {
  transform: scale(1.05) rotate(3deg);
  box-shadow: var(--shadow-medium);
}

.org-basic-info {
  flex: 1;
}

.org-name {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin: 0 0 var(--spacing-sm) 0;
  line-height: 1.3;
  font-family: var(--font-family);
}

.org-details {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.detail-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--font-size-sm);
  color: var(--text-medium);
  font-family: var(--font-family);
}

.detail-item i {
  width: 16px;
  color: var(--primary-color);
  text-align: center;
}

.org-status {
  flex-shrink: 0;
}

/* Status Badges */
.status-badge {
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--border-radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-family: var(--font-family);
}

.status-badge.status-active {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
  border: 1px solid rgba(34, 197, 94, 0.2);
}

.status-badge.status-suspended {
  background: rgba(251, 146, 60, 0.1);
  color: #fb923c;
  border: 1px solid rgba(251, 146, 60, 0.2);
}

.status-badge.status-cancelled {
  background: rgba(248, 113, 113, 0.1);
  color: #f87171;
  border: 1px solid rgba(248, 113, 113, 0.2);
}

.status-badge.status-inactive {
  background: rgba(156, 163, 175, 0.1);
  color: #9ca3af;
  border: 1px solid rgba(156, 163, 175, 0.2);
}

/* Organization Stats */
.org-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-md);
  margin: var(--spacing-lg) 0;
  padding: var(--spacing-lg);
  background: var(--surface-color);
  border-radius: var(--border-radius-md);
  border: 1px solid var(--border-color);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.stat-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--border-radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  color: var(--text-white);
  flex-shrink: 0;
}

.stat-icon.users {
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
}

.stat-icon.participants {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.stat-icon.subscription {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
}

.stat-content {
  flex: 1;
}

.stat-number {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  line-height: 1;
  font-family: var(--font-family);
}

.stat-label {
  font-size: var(--font-size-xs);
  color: var(--text-medium);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: var(--spacing-xs);
  font-family: var(--font-family);
}

/* Organization Contact */
.org-contact {
  margin: var(--spacing-lg) 0;
  padding: var(--spacing-md) 0;
  border-top: 1px solid var(--border-color);
  border-bottom: 1px solid var(--border-color);
}

.contact-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin: var(--spacing-sm) 0;
  font-size: var(--font-size-sm);
  color: var(--text-medium);
  font-family: var(--font-family);
}

.contact-item i {
  width: 16px;
  color: var(--primary-color);
  text-align: center;
}

/* Organization Actions */
.org-actions {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-sm);
  margin-top: var(--spacing-lg);
}

.btn-action {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm);
  background: var(--card-background);
  color: var(--text-primary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: var(--transition-smooth);
  text-decoration: none;
  justify-content: center;
  font-family: var(--font-family);
}

.btn-action:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-soft);
}

.btn-view {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.btn-view:hover {
  background: var(--primary-color);
  color: var(--text-white);
}

.btn-edit {
  border-color: #f59e0b;
  color: #f59e0b;
}

.btn-edit:hover {
  background: #f59e0b;
  color: var(--text-white);
}

.btn-status {
  border-color: #10b981;
  color: #10b981;
}

.btn-status:hover {
  background: #10b981;
  color: var(--text-white);
}

.btn-login {
  border-color: #8b5cf6;
  color: #8b5cf6;
}

.btn-login:hover {
  background: #8b5cf6;
  color: var(--text-white);
}

/* Page Header */
.page-title {
  font-size: var(--font-size-3xl);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  margin: 0 0 var(--spacing-sm) 0;
  font-family: var(--font-family);
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.page-title i {
  color: var(--primary-color);
}

.page-subtitle {
  font-size: var(--font-size-md);
  color: var(--text-medium);
  margin: 0;
  font-family: var(--font-family);
}

/* Search and Filters */
.filters-section {
  background: var(--surface-color);
  padding: var(--spacing-lg);
  border-radius: var(--border-radius-md);
  box-shadow: var(--shadow-soft);
  border: 1px solid var(--border-color);
  margin-bottom: var(--spacing-lg);
}

.filters-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  flex-wrap: wrap;
}

.search-box {
  position: relative;
  flex: 1;
  min-width: 300px;
  max-width: 400px;
}

.search-box i {
  position: absolute;
  left: var(--spacing-md);
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-light);
}

.form-input {
  width: 100%;
  padding: var(--spacing-md) var(--spacing-md) var(--spacing-md) 2.5rem;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-sm);
  background: var(--card-background);
  transition: var(--transition-smooth);
  font-family: var(--font-family);
}

.form-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.filter-controls {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  flex-wrap: wrap;
}

.form-select {
  padding: var(--spacing-md);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-sm);
  background: var(--card-background);
  transition: var(--transition-smooth);
  font-family: var(--font-family);
  min-width: 130px;
}

.form-select:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.btn-outline-elegant {
  background: var(--card-background);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  padding: var(--spacing-md);
  border-radius: var(--border-radius-md);
  font-weight: var(--font-weight-medium);
  transition: var(--transition-smooth);
  cursor: pointer;
  font-family: var(--font-family);
  font-size: var(--font-size-sm);
}

.btn-outline-elegant:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
  background: rgba(102, 126, 234, 0.05);
}

/* Search Dropdown */
.search-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--card-background);
  border: 1px solid var(--border-color);
  border-radius: 0 0 var(--border-radius-md) var(--border-radius-md);
  box-shadow: var(--shadow-medium);
  z-index: 1000;
  max-height: 300px;
  overflow-y: auto;
  margin-top: 2px;
}

.search-result-item {
  padding: var(--spacing-md);
  border-bottom: 1px solid var(--border-color);
  cursor: pointer;
  transition: var(--transition-smooth);
}

.search-result-item:hover {
  background: var(--surface-color);
  transform: translateX(4px);
}

.search-result-item:last-child {
  border-bottom: none;
}

.result-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-xs);
}

.result-name {
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  font-size: var(--font-size-sm);
  font-family: var(--font-family);
}

.result-type {
  font-size: var(--font-size-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  background: rgba(102, 126, 234, 0.1);
  color: var(--primary-color);
  border-radius: var(--border-radius-sm);
  text-transform: capitalize;
  font-weight: var(--font-weight-medium);
}

.result-details {
  display: flex;
  gap: var(--spacing-md);
  font-size: var(--font-size-xs);
  color: var(--text-medium);
}

/* Details Grid */
.details-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-xl);
}

.detail-section h4 {
  margin: 0 0 var(--spacing-md) 0;
  color: var(--text-primary);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  border-bottom: 2px solid var(--primary-color);
  padding-bottom: var(--spacing-xs);
  font-family: var(--font-family);
}

.detail-item {
  display: flex;
  margin-bottom: var(--spacing-sm);
  align-items: flex-start;
}

.detail-item label {
  font-weight: var(--font-weight-semibold);
  min-width: 120px;
  color: var(--text-medium);
  margin-right: var(--spacing-md);
  font-size: var(--font-size-sm);
  font-family: var(--font-family);
}

.detail-item span {
  flex: 1;
  color: var(--text-primary);
  font-family: var(--font-family);
}

/* Lists */
.user-list,
.participant-list {
  max-height: 200px;
  overflow-y: auto;
}

.user-item,
.participant-item {
  padding: var(--spacing-sm);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm);
  margin-bottom: var(--spacing-xs);
  transition: var(--transition-smooth);
  background: var(--surface-color);
}

.user-item:hover,
.participant-item:hover {
  border-color: var(--primary-color);
  background: rgba(102, 126, 234, 0.05);
}

.user-name,
.participant-name {
  font-weight: var(--font-weight-semibold);
  display: block;
  color: var(--text-primary);
  font-size: var(--font-size-sm);
  font-family: var(--font-family);
}

.user-email,
.participant-ndis {
  font-size: var(--font-size-xs);
  color: var(--text-medium);
  font-family: var(--font-family);
}

.user-role {
  font-size: var(--font-size-xs);
  color: var(--primary-color);
  text-transform: capitalize;
  font-family: var(--font-family);
}

/* Pagination */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--spacing-md);
  margin-top: var(--spacing-xl);
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--border-color);
}

.page-info {
  font-size: var(--font-size-sm);
  color: var(--text-medium);
  font-family: var(--font-family);
}

/* Form Styling */
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

/* Responsive Design */
@media (max-width: 1200px) {
  .organizations-grid {
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  }
}

@media (max-width: 768px) {
  .organizations-grid {
    grid-template-columns: 1fr;
  }

  .org-stats {
    grid-template-columns: 1fr;
  }

  .org-actions {
    grid-template-columns: 1fr;
  }

  .organization-card {
    padding: var(--spacing-lg);
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .details-grid {
    grid-template-columns: 1fr;
  }

  .filters-row {
    flex-direction: column;
    align-items: stretch;
  }

  .search-box {
    min-width: unset;
    max-width: unset;
  }
}
</style>