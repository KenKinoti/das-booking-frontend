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
      <button @click="showCreateModal = true" class="btn btn-primary">
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
            @input="handleSearch"
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
    <div v-if="showCreateModal" class="modal-overlay" @click="showCreateModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>Create New Organization</h3>
          <button @click="showCreateModal = false" class="btn-close">×</button>
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
              <button type="button" @click="showCreateModal = false" class="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" :disabled="createLoading" class="btn btn-primary">
                <i v-if="createLoading" class="fas fa-spinner fa-spin"></i>
                Create Organization
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

    // Raw mock data for development
    const rawOrganizations = ref([
      {
        id: 1,
        name: 'Sydney Healthcare Solutions',
        abn: '12 345 678 901',
        email: 'admin@sydneyhealthcare.com.au',
        phone: '+61 2 9876 5432',
        website: 'https://sydneyhealthcare.com.au',
        created_at: '2024-01-15T08:30:00Z',
        subscription: {
          plan_name: 'enterprise',
          status: 'active',
          monthly_rate: 299.99
        },
        users: [
          { id: 1, first_name: 'Sarah', last_name: 'Johnson', email: 'sarah@sydneyhealthcare.com.au', role: 'admin' },
          { id: 2, first_name: 'Michael', last_name: 'Chen', email: 'michael@sydneyhealthcare.com.au', role: 'manager' }
        ],
        participants: [
          { id: 1, first_name: 'Emma', last_name: 'Wilson', ndis_number: 'NDIS001234' },
          { id: 2, first_name: 'James', last_name: 'Brown', ndis_number: 'NDIS005678' }
        ]
      },
      {
        id: 2,
        name: 'Melbourne Disability Services',
        abn: '23 456 789 012',
        email: 'contact@melbourneds.com.au',
        phone: '+61 3 8765 4321',
        website: 'https://melbourneds.com.au',
        created_at: '2024-02-10T14:20:00Z',
        subscription: {
          plan_name: 'professional',
          status: 'active',
          monthly_rate: 149.99
        },
        users: [
          { id: 3, first_name: 'Lisa', last_name: 'Taylor', email: 'lisa@melbourneds.com.au', role: 'admin' }
        ],
        participants: [
          { id: 3, first_name: 'Sophie', last_name: 'Davis', ndis_number: 'NDIS009876' }
        ]
      },
      {
        id: 3,
        name: 'Brisbane Community Care',
        abn: '34 567 890 123',
        email: 'info@brisbanecare.com.au',
        phone: '+61 7 7654 3210',
        website: 'https://brisbanecare.com.au',
        created_at: '2024-01-28T11:45:00Z',
        subscription: {
          plan_name: 'starter',
          status: 'suspended',
          monthly_rate: 49.99
        },
        users: [
          { id: 4, first_name: 'David', last_name: 'Wilson', email: 'david@brisbanecare.com.au', role: 'admin' }
        ],
        participants: []
      },
      {
        id: 4,
        name: 'Perth Wellness Center',
        abn: '45 678 901 234',
        email: 'hello@perthwellness.com.au',
        phone: '+61 8 6543 2109',
        website: 'https://perthwellness.com.au',
        created_at: '2024-03-05T09:15:00Z',
        subscription: {
          plan_name: 'professional',
          status: 'active',
          monthly_rate: 149.99
        },
        users: [
          { id: 5, first_name: 'Rachel', last_name: 'Green', email: 'rachel@perthwellness.com.au', role: 'admin' },
          { id: 6, first_name: 'Tom', last_name: 'Miller', email: 'tom@perthwellness.com.au', role: 'user' }
        ],
        participants: [
          { id: 4, first_name: 'Alex', last_name: 'Johnson', ndis_number: 'NDIS012345' },
          { id: 5, first_name: 'Grace', last_name: 'Lee', ndis_number: 'NDIS054321' },
          { id: 6, first_name: 'Oliver', last_name: 'Smith', ndis_number: 'NDIS098765' }
        ]
      },
      {
        id: 5,
        name: 'Adelaide Support Network',
        abn: '56 789 012 345',
        email: 'support@adelaidenetwork.com.au',
        phone: '+61 8 5432 1098',
        website: null,
        created_at: '2024-02-20T16:30:00Z',
        subscription: {
          plan_name: 'enterprise',
          status: 'cancelled',
          monthly_rate: 299.99
        },
        users: [
          { id: 7, first_name: 'Mark', last_name: 'Thompson', email: 'mark@adelaidenetwork.com.au', role: 'admin' }
        ],
        participants: [
          { id: 7, first_name: 'Lily', last_name: 'Anderson', ndis_number: 'NDIS067890' }
        ]
      }
    ])

    const searchResults = ref([])

    // API calls
    const fetchOrganizations = async () => {
      loading.value = true
      try {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 300))

        let filteredOrgs = [...rawOrganizations.value]

        // Apply search filter
        if (searchQuery.value) {
          const query = searchQuery.value.toLowerCase()
          filteredOrgs = filteredOrgs.filter(org =>
            org.name.toLowerCase().includes(query) ||
            (org.email && org.email.toLowerCase().includes(query)) ||
            (org.abn && org.abn.toLowerCase().includes(query)) ||
            (org.phone && org.phone.toLowerCase().includes(query)) ||
            (org.website && org.website.toLowerCase().includes(query))
          )
        }

        // Apply status filter
        if (statusFilter.value) {
          filteredOrgs = filteredOrgs.filter(org =>
            getSubscriptionStatus(org) === statusFilter.value
          )
        }

        // Calculate pagination
        const total = filteredOrgs.length
        const totalPages = Math.ceil(total / pagination.value.limit)
        const startIndex = (pagination.value.page - 1) * pagination.value.limit
        const endIndex = startIndex + pagination.value.limit
        const paginatedOrgs = filteredOrgs.slice(startIndex, endIndex)

        organizations.value = paginatedOrgs
        pagination.value = {
          ...pagination.value,
          total,
          total_pages: totalPages
        }
      } catch (error) {
        showNotification('Error fetching organizations: ' + error.message, 'error')
      } finally {
        loading.value = false
      }
    }

    const fetchOrganizationDetails = async (orgId) => {
      try {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 200))

        const org = rawOrganizations.value.find(o => o.id === orgId)
        if (org) {
          orgDetails.value = {
            organization: org,
            subscription: org.subscription
          }
        }
      } catch (error) {
        showNotification('Error fetching organization details: ' + error.message, 'error')
      }
    }

    const createOrganization = async () => {
      createLoading.value = true
      try {
        const response = await superAdminOrganizationService.createOrganization(newOrganization)
        
        if (response.success) {
          showNotification('Organization created successfully', 'success')
          showCreateModal.value = false
          resetCreateForm()
          fetchOrganizations()
        }
      } catch (error) {
        showNotification('Error creating organization: ' + error.message, 'error')
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
    const handleSearch = () => {
      // Update search results for dropdown
      if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase()
        searchResults.value = rawOrganizations.value.filter(org =>
          org.name.toLowerCase().includes(query) ||
          (org.email && org.email.toLowerCase().includes(query)) ||
          (org.abn && org.abn.toLowerCase().includes(query)) ||
          (org.phone && org.phone.toLowerCase().includes(query))
        )
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

    const editOrganization = (org) => {
      // For now, we'll show the details modal since there's no edit modal implemented
      viewOrganization(org)
      showNotification('Edit functionality is not yet implemented. Use the View details for now.', 'info')
    }

    const loginAsOrganization = (org) => {
      // This would typically switch context to the organization
      showNotification(`Login as "${org.name}" functionality is not yet implemented.`, 'info')
      console.log('Login as organization:', org)
    }

    const clearFilters = () => {
      searchQuery.value = ''
      statusFilter.value = ''
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
      pagination,
      showCreateModal,
      showStatusModal,
      showDetailsModal,
      showDeleteModal,
      createLoading,
      statusLoading,
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
      selectOrganization,
      changePage,
      viewOrganization,
      editStatus,
      editOrganization,
      loginAsOrganization,
      clearFilters,
      getSubscriptionPlan,
      getSubscriptionStatus,
      formatDate,
      formatStatus
    }
  }
}
</script>

<style scoped>
/* Modern Organization Cards */
.organizations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 2rem;
  padding: 1rem 0;
}

.organization-card {
  background: var(--card-bg);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--card-border);
  border-radius: 24px;
  padding: 2rem;
  box-shadow: var(--stat-card-shadow);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.organization-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #3b82f6 0%, #1d4ed8 50%, #3b82f6 100%);
  background-size: 200% 100%;
  animation: shimmer 3s ease-in-out infinite;
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.organization-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  border-color: rgba(59, 130, 246, 0.3);
}

[data-theme="dark"] .organization-card {
  background: linear-gradient(135deg, rgba(31, 41, 55, 0.95) 0%, rgba(31, 41, 55, 0.85) 100%);
  border: 1px solid rgba(75, 85, 99, 0.3);
  box-shadow: 0 20px 40px rgba(0,0,0,0.3), 0 8px 16px rgba(0,0,0,0.15);
}

/* Organization Header */
.org-header {
  display: flex;
  align-items: flex-start;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.org-avatar {
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: white;
  box-shadow: 0 8px 32px rgba(79, 172, 254, 0.25);
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.organization-card:hover .org-avatar {
  transform: scale(1.1) rotate(5deg);
  box-shadow: 0 12px 40px rgba(79, 172, 254, 0.35);
}

.org-basic-info {
  flex: 1;
}

.org-name {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 0.5rem 0;
  line-height: 1.3;
}

[data-theme="dark"] .org-name {
  color: #f3f4f6;
}

.org-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.detail-item i {
  width: 14px;
  color: var(--primary);
}

.org-status {
  flex-shrink: 0;
}

.status-badge {
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-badge.status-active {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.2);
}

.status-badge.status-suspended {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
  border: 1px solid rgba(245, 158, 11, 0.2);
}

.status-badge.status-cancelled {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.2);
}

/* Organization Stats */
.org-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin: 1.5rem 0;
  padding: 1.5rem;
  background: rgba(248, 250, 252, 0.8);
  border-radius: 16px;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

[data-theme="dark"] .org-stats {
  background: rgba(17, 24, 39, 0.8);
  border-color: rgba(75, 85, 99, 0.3);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  color: white;
  flex-shrink: 0;
}

.stat-icon.users {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stat-icon.participants {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.stat-icon.subscription {
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
}

.stat-content {
  flex: 1;
}

.stat-number {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1;
}

[data-theme="dark"] .stat-number {
  color: #f3f4f6;
}

.stat-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 0.25rem;
}

/* Organization Contact */
.org-contact {
  margin: 1.5rem 0;
  padding: 1rem 0;
  border-top: 1px solid var(--border-color);
  border-bottom: 1px solid var(--border-color);
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0.5rem 0;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.contact-item i {
  width: 16px;
  color: var(--primary);
}

/* Organization Actions */
.org-actions {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.btn-action {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  background: var(--card-bg);
  color: var(--text-primary);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
  justify-content: center;
}

[data-theme="dark"] .btn-action {
  background: rgba(31, 41, 55, 0.8);
  border-color: rgba(75, 85, 99, 0.3);
  color: #e5e7eb;
}

.btn-action:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.btn-view {
  border-color: rgba(59, 130, 246, 0.3);
  color: #3b82f6;
}

.btn-view:hover {
  background: #3b82f6;
  color: white;
}

.btn-edit {
  border-color: rgba(245, 158, 11, 0.3);
  color: #f59e0b;
}

.btn-edit:hover {
  background: #f59e0b;
  color: white;
}

.btn-status {
  border-color: rgba(16, 185, 129, 0.3);
  color: #10b981;
}

.btn-status:hover {
  background: #10b981;
  color: white;
}

.btn-login {
  border-color: rgba(139, 92, 246, 0.3);
  color: #8b5cf6;
}

.btn-login:hover {
  background: #8b5cf6;
  color: white;
}

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
    padding: 1.5rem;
  }
}

/* Component-specific styles that extend the global theme */

/* Page Header Styles */
.page-title {
  font-size: 1.5rem !important;
  font-weight: 600 !important;
  color: var(--text-primary);
  margin: 0 0 0.5rem 0;
  line-height: 1.3;
}

.page-subtitle {
  font-size: 0.875rem !important;
  color: var(--text-secondary);
  margin: 0;
}

/* Search Dropdown Styles */
.search-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 2px solid rgba(102, 126, 234, 0.2);
  border-radius: 0 0 12px 12px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  z-index: 1000;
  max-height: 300px;
  overflow-y: auto;
  margin-top: 2px;
}

.search-result-item {
  padding: 1rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  cursor: pointer;
  transition: all 0.2s ease;
  background: rgba(255, 255, 255, 0.95);
}

.search-result-item:hover {
  background: rgba(102, 126, 234, 0.08);
  transform: translateX(4px);
}

.search-result-item:last-child {
  border-bottom: none;
  border-radius: 0 0 10px 10px;
}

.result-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
}

.result-name {
  font-weight: 600;
  color: #1f2937;
  font-size: 0.9rem;
}

.result-type {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  background: rgba(102, 126, 234, 0.1);
  color: #667eea;
  border-radius: 6px;
  text-transform: capitalize;
  font-weight: 500;
}

.result-details {
  display: flex;
  gap: 1rem;
  font-size: 0.8rem;
  color: #6b7280;
}

.result-details span {
  display: flex;
  align-items: center;
}

[data-theme="dark"] .search-dropdown {
  background: rgba(31, 41, 55, 0.95);
  border-color: rgba(102, 126, 234, 0.3);
}

[data-theme="dark"] .search-result-item {
  background: rgba(31, 41, 55, 0.95);
  border-bottom-color: rgba(75, 85, 99, 0.3);
}

[data-theme="dark"] .search-result-item:hover {
  background: rgba(102, 126, 234, 0.15);
}

[data-theme="dark"] .result-name {
  color: #f3f4f6;
}

[data-theme="dark"] .result-details {
  color: #9ca3af;
}

/* Participants-style filters */
.filters-section {
  background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%);
  padding: 1rem 1.5rem;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(0, 0, 0, 0.04);
  margin-bottom: 1rem;
}

.filters-row {
  display: flex;
  align-items: center;
  gap: 1.5rem;
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
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
}

.form-input {
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.5rem;
  border: 2px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  font-size: 0.875rem;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
  font-weight: 500;
}

.form-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.12);
  background: rgba(255, 255, 255, 0.95);
  transform: translateY(-1px);
}

.filter-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.form-select {
  padding: 0.75rem 1rem;
  border: 2px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  font-size: 0.875rem;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
  font-weight: 500;
  min-width: 140px;
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 16px;
  padding-right: 40px;
}

.form-select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.12);
  background-color: rgba(255, 255, 255, 0.95);
  transform: translateY(-1px);
}

.btn-outline-elegant {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%);
  border: 2px solid rgba(0, 0, 0, 0.08);
  color: #4a5568;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  font-weight: 600;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
}

.btn-outline-elegant:hover {
  border-color: #667eea;
  color: #667eea;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(102, 126, 234, 0.04) 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(102, 126, 234, 0.15);
}

.org-info strong {
  display: block;
  margin-bottom: 0.25rem;
  color: var(--gray-800);
}

.org-details {
  font-size: var(--font-size-sm);
  color: var(--gray-600);
}

.org-details span {
  display: block;
}

.contact-info div {
  margin-bottom: 0.25rem;
  font-size: var(--font-size-sm);
}

.subscription-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.plan-name {
  font-weight: 600;
  text-transform: capitalize;
  color: var(--gray-800);
}

.subscription-status {
  font-size: var(--font-size-xs);
  text-transform: capitalize;
}

.action-buttons {
  display: flex;
  gap: var(--space-xs);
}

.btn-edit-status {
  margin-left: var(--space-xs);
  background: transparent;
  border: 1px solid var(--gray-300);
  color: var(--gray-600);
  transition: var(--transition-fast);
}

.btn-edit-status:hover {
  background: var(--primary-500);
  color: white;
  border-color: var(--primary-500);
}

.status-filter {
  min-width: 150px;
}

.details-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-xl);
}

.detail-section h4 {
  margin: 0 0 var(--space-md) 0;
  color: var(--gray-800);
  font-size: var(--font-size-lg);
  border-bottom: 2px solid var(--primary-500);
  padding-bottom: var(--space-xs);
}

.detail-item {
  display: flex;
  margin-bottom: var(--space-sm);
  align-items: flex-start;
}

.detail-item label {
  font-weight: 600;
  min-width: 120px;
  color: var(--gray-600);
  margin-right: var(--space-md);
  font-size: var(--font-size-sm);
}

.detail-item span {
  flex: 1;
  color: var(--gray-800);
}

.user-list,
.participant-list {
  max-height: 200px;
  overflow-y: auto;
}

.user-item,
.participant-item {
  padding: var(--space-sm);
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-xs);
  transition: var(--transition-fast);
}

.user-item:hover,
.participant-item:hover {
  border-color: var(--primary-300);
  background: var(--gray-50);
}

.user-name,
.participant-name {
  font-weight: 600;
  display: block;
  color: var(--gray-800);
  font-size: var(--font-size-sm);
}

.user-email,
.participant-ndis {
  font-size: var(--font-size-xs);
  color: var(--gray-600);
}

.user-role {
  font-size: var(--font-size-xs);
  color: var(--primary-600);
  text-transform: capitalize;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--space-md);
  margin-top: var(--space-xl);
  padding-top: var(--space-lg);
  border-top: 1px solid var(--gray-200);
}

.page-info {
  font-size: var(--font-size-sm);
  color: var(--gray-600);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-md);
  margin-bottom: var(--space-md);
}

@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }

  .details-grid {
    grid-template-columns: 1fr;
  }
}
</style>