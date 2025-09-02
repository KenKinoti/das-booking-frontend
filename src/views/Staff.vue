<template>
  <div class="staff-page">
    <!-- Header -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">
          <div class="title-icon">
            <i class="fas fa-users-cog"></i>
          </div>
          Staff Management
        </h1>
        <p class="page-description">Manage your team members, roles, and schedules for automotive & beauty services</p>
      </div>
      <div class="header-actions">
        <button @click="showAddModal = true" class="btn-primary">
          <i class="fas fa-user-plus"></i>
          Add New Staff Member
        </button>
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon total">
          <i class="fas fa-users-cog"></i>
        </div>
        <div class="stat-content">
          <h3>{{ totalStaff }}</h3>
          <p>Total Staff</p>
          <div class="stat-change positive">+3 new hires</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon active">
          <i class="fas fa-user-check"></i>
        </div>
        <div class="stat-content">
          <h3>{{ activeStaff }}</h3>
          <p>Active Staff</p>
          <div class="stat-change positive">{{ Math.round(activeStaff / totalStaff * 100) }}% active</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon shifts">
          <i class="fas fa-calendar-week"></i>
        </div>
        <div class="stat-content">
          <h3>{{ weeklyShifts }}</h3>
          <p>Weekly Shifts</p>
          <div class="stat-change neutral">This week</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon performance">
          <i class="fas fa-star"></i>
        </div>
        <div class="stat-content">
          <h3>4.8</h3>
          <p>Avg. Rating</p>
          <div class="stat-change positive">Excellent performance</div>
        </div>
      </div>
    </div>

    <!-- Filters Section -->
    <div class="filters-section">
      <div class="filters-container">
        <div class="search-box">
          <i class="fas fa-search"></i>
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="Search staff members..." 
            class="search-input"
            @input="filterStaff"
          />
        </div>
        
        <div class="filter-controls">
          <div class="filter-group">
            <label>Status</label>
            <select v-model="statusFilter" @change="filterStaff" class="filter-select">
              <option value="">All Staff</option>
              <option value="active">✅ Active Staff</option>
              <option value="inactive">🔘 Inactive Staff</option>
            </select>
          </div>
          
          <div class="filter-group">
            <label>Role</label>
            <select v-model="roleFilter" @change="filterStaff" class="filter-select">
              <option value="">All Roles</option>
              <option value="technician">🔧 Technician</option>
              <option value="stylist">💄 Stylist</option>
              <option value="manager">👨‍💼 Manager</option>
              <option value="admin">⚙️ Administrator</option>
            </select>
          </div>
          
          <button @click="clearFilters" class="btn-secondary">
            <i class="fas fa-times"></i>
        Clear Filters
      </button>
      
      <div class="btn-group" role="group">
        <button 
          @click="currentView = 'list'" 
          :class="['btn', currentView === 'list' ? 'btn-primary' : 'btn-outline-primary']"
          title="List View"
        >
          <i class="fas fa-list"></i>
        </button>
        <button 
          @click="currentView = 'grid'" 
          :class="['btn', currentView === 'grid' ? 'btn-primary' : 'btn-outline-primary']"
          title="Grid View"
        >
          <i class="fas fa-th"></i>
        </button>
      </div>
    </template>

    <template #content>
      <div class="staff-content">
        <div v-if="isLoading" class="loading-state">
          <div class="loading-spinner"></div>
          <p>Loading staff members...</p>
        </div>

        <div v-else-if="filteredStaff.length === 0 && !searchQuery" class="empty-state">
          <i class="fas fa-user-nurse"></i>
          <h3>No Staff Members Yet</h3>
          <p>Get started by adding your first staff member</p>
          <button @click="showAddModal = true" class="btn btn-primary">
            <i class="fas fa-plus"></i>
            Add First Staff Member
          </button>
        </div>

        <div v-else-if="filteredStaff.length === 0 && searchQuery" class="empty-state">
          <i class="fas fa-search"></i>
          <h3>No Results Found</h3>
          <p class="text-muted">Try adjusting your search criteria</p>
        </div>

      <!-- List View -->
      <div v-else-if="currentView === 'list'" class="table-responsive">
        <table class="table table-hover">
          <thead>
            <tr>
              <th>Staff Member</th>
              <th>Status</th>
              <th>Role</th>
              <th>Organization</th>
              <th>Contact</th>
              <th>Last Activity</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="member in filteredStaff" :key="member.id">
              <td>
                <div class="d-flex align-items-center">
                  <div class="stat-icon me-3" style="width: 40px; height: 40px; font-size: 0.875rem;">
                    {{ getInitials(member.first_name, member.last_name) }}
                  </div>
                  <div>
                    <h6 class="mb-0">{{ member.first_name }} {{ member.last_name }}</h6>
                    <small class="text-muted">ID: {{ member.id }}</small>
                  </div>
                </div>
              </td>
              <td>
                <div class="d-flex align-items-center gap-2">
                  <div class="form-check form-switch">
                    <input 
                      class="form-check-input" 
                      type="checkbox" 
                      :checked="member.is_active !== false"
                      @change="toggleStaffStatus(member)"
                      :disabled="isSubmitting"
                    />
                  </div>
                  <span :class="['badge', member.is_active !== false ? 'bg-success' : 'bg-secondary']">
                    {{ member.is_active !== false ? 'Active' : 'Inactive' }}
                  </span>
                </div>
              </td>
              <td>
                <span class="badge bg-primary">{{ formatRole(member.role) }}</span>
              </td>
              <td>
                <span class="text-muted">{{ getCompanyName(member) }}</span>
              </td>
              <td>
                <div class="small" v-if="isAdmin || isSuperAdmin">
                  <div><i class="fas fa-envelope me-1"></i>{{ member.email }}</div>
                  <div><i class="fas fa-phone me-1"></i>{{ member.phone || 'N/A' }}</div>
                </div>
                <div class="small" v-else>
                  <div><i class="fas fa-envelope me-1"></i>{{ member.email ? member.email.substring(0, 3) + '***@' + member.email.split('@')[1] : 'N/A' }}</div>
                  <div><i class="fas fa-phone me-1"></i>{{ member.phone ? '***-***-' + member.phone.slice(-4) : 'N/A' }}</div>
                </div>
              </td>
              <td>
                <div class="small text-muted">
                  <i class="fas fa-clock me-1"></i>
                  {{ formatLastLogin(member.last_login_at) }}
                </div>
              </td>
              <td>
                <div class="action-buttons">
                  <button @click="viewStaff(member)" class="btn btn-outline-primary btn-sm" title="View Details">
                    <i class="fas fa-eye"></i>
                  </button>
                  <button @click="scheduleStaff(member)" class="btn btn-outline-success btn-sm" title="Schedule Shift">
                    <i class="fas fa-calendar-plus"></i>
                  </button>
                  <button @click="editStaff(member)" class="btn btn-outline-secondary btn-sm" title="Edit Staff">
                    <i class="fas fa-edit"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Grid View -->
      <div v-else class="row">
        <div v-for="member in filteredStaff" :key="member.id" class="col-md-6 col-lg-4 mb-4">
          <div class="card h-100">
            <div class="card-header d-flex align-items-center justify-content-between">
              <div class="d-flex align-items-center">
                <div class="stat-icon me-3">
                  {{ getInitials(member.first_name, member.last_name) }}
                </div>
                <div>
                  <h6 class="mb-0">{{ member.first_name }} {{ member.last_name }}</h6>
                  <span class="badge bg-primary">{{ formatRole(member.role) }}</span>
                </div>
              </div>
              <div class="form-check form-switch">
                <input 
                  class="form-check-input" 
                  type="checkbox" 
                  :checked="member.is_active !== false"
                  @change="toggleStaffStatus(member)"
                  :disabled="isSubmitting"
                />
              </div>
            </div>
            <div class="card-body">
              <div class="mb-2">
                <span :class="['badge', member.is_active !== false ? 'bg-success' : 'bg-secondary']">
                  {{ member.is_active !== false ? 'Active' : 'Inactive' }}
                </span>
              </div>
              <div class="small text-muted mb-3">
                <div class="mb-1" v-if="isAdmin || isSuperAdmin">
                  <i class="fas fa-envelope me-2"></i>{{ member.email }}
                </div>
                <div class="mb-1" v-else>
                  <i class="fas fa-envelope me-2"></i>{{ member.email ? member.email.substring(0, 3) + '***@' + member.email.split('@')[1] : 'N/A' }}
                </div>
                <div class="mb-1" v-if="isAdmin || isSuperAdmin">
                  <i class="fas fa-phone me-2"></i>{{ member.phone || 'No phone provided' }}
                </div>
                <div class="mb-1" v-else>
                  <i class="fas fa-phone me-2"></i>{{ member.phone ? '***-***-' + member.phone.slice(-4) : 'N/A' }}
                </div>
                <div>
                  <i class="fas fa-calendar me-2"></i>Added {{ formatDate(member.created_at) }}
                </div>
              </div>
            </div>
            <div class="card-footer bg-transparent">
              <div class="action-buttons">
                <button @click="viewStaff(member)" class="btn btn-outline-primary btn-sm">
                  <i class="fas fa-eye"></i>
                  View
                </button>
                <button @click="scheduleStaff(member)" class="btn btn-outline-success btn-sm">
                  <i class="fas fa-calendar-plus"></i>
                  Schedule
                </button>
                <button @click="editStaff(member)" class="btn btn-outline-secondary btn-sm">
                  <i class="fas fa-edit"></i>
                  Edit
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Pagination -->
      <div v-if="totalPages > 1" class="pagination-section">
        <div class="pagination-info">
          Showing {{ startIndex + 1 }}-{{ Math.min(endIndex, filteredStaff.length) }} of {{ filteredStaff.length }} staff members
        </div>
        
        <div class="pagination-controls">
          <button 
            @click="goToPage(currentPage - 1)" 
            :disabled="currentPage === 1" 
            class="pagination-btn"
            title="Previous page"
          >
            <i class="fas fa-chevron-left"></i>
          </button>
          
          <div class="pagination-numbers">
            <button 
              v-for="page in visiblePages" 
              :key="page" 
              @click="goToPage(page)" 
              :class="['pagination-number', { active: page === currentPage }]"
            >
              {{ page }}
            </button>
          </div>
          
          <button 
            @click="goToPage(currentPage + 1)" 
            :disabled="currentPage === totalPages" 
            class="pagination-btn"
            title="Next page"
          >
            <i class="fas fa-chevron-right"></i>
          </button>
        </div>
        
        <div class="pagination-options">
          <label class="per-page-label">
            <span>Per page:</span>
            <select v-model="itemsPerPage" @change="handlePerPageChange" class="per-page-select">
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </label>
        </div>
      </div>
      </div>
    </template>
  </PageTemplate>
</template>

<script>
import { mapState, mapActions } from 'pinia'
import { useUsersStore } from '../stores/users'
import { useShiftsStore } from '../stores/shifts'
import { useParticipantsStore } from '../stores/participants'
import { useAuthStore } from '../stores/auth'
import { useOrganizationContextStore } from '../stores/organizationContext'
import PageTemplate from '../components/PageTemplate.vue'
import { showSuccessNotification, showErrorNotification } from '../utils/notifications'
import { debounce } from '../utils/debounce'

export default {
  name: 'Staff',
  components: {
    PageTemplate
  },
  data() {
    return {
      searchQuery: '',
      statusFilter: 'active',
      roleFilter: '',
      currentView: 'list',
      showAddModal: false,
      isSubmitting: false,
      newStaff: {
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        role: 'care_worker',
        is_active: true
      }
    }
  },
  computed: {
    ...mapState(useUsersStore, ['staff', 'isLoading']),
    ...mapState(useAuthStore, ['user', 'isAdmin', 'isSuperAdmin']),
    ...mapState(useOrganizationContextStore, ['currentOrganization']),

    statsCards() {
      return [
        {
          title: 'Total Staff',
          value: this.staff.length,
          icon: 'fa-user-nurse',
          color: 'info'
        },
        {
          title: 'Active Staff', 
          value: this.activeStaff,
          icon: 'fa-user-check',
          color: 'success'
        },
        {
          title: 'Available Today',
          value: this.availableToday,
          icon: 'fa-clock',
          color: 'warning'
        },
        {
          title: 'Scheduled Today',
          value: this.scheduledToday,
          icon: 'fa-calendar-alt',
          color: 'info'
        }
      ]
    },

    activeStaff() {
      return this.staff.filter(s => s.is_active !== false).length
    },

    availableToday() {
      return this.staff.filter(s => s.is_active !== false).length
    },

    scheduledToday() {
      return Math.floor(this.staff.length * 0.6)
    },

    filteredStaff() {
      return this.staff.filter(s => {
        const query = this.searchQuery.toLowerCase()
        const matchesSearch = !query || 
          `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase().includes(query) ||
          (s.email && s.email.toLowerCase().includes(query)) ||
          (s.phone && s.phone.includes(query))
        
        const matchesStatus = !this.statusFilter || 
          (this.statusFilter === 'active' && s.is_active !== false) ||
          (this.statusFilter === 'inactive' && s.is_active === false)
        
        const matchesRole = !this.roleFilter || s.role === this.roleFilter
        
        return matchesSearch && matchesStatus && matchesRole
      })
    }
  },
  methods: {
    ...mapActions(useUsersStore, ['fetchUsers', 'createUser', 'updateUser']),

    clearFilters() {
      this.statusFilter = 'active'
      this.roleFilter = ''
      this.searchQuery = ''
    },

    filterStaff() {
      // Filtering is handled by computed property
    },

    formatRole(role) {
      const roleMap = {
        care_worker: 'Care Worker',
        support_coordinator: 'Support Coordinator', 
        manager: 'Manager',
        admin: 'Administrator'
      }
      return roleMap[role] || role
    },

    getInitials(firstName, lastName) {
      return `${(firstName || '').charAt(0)}${(lastName || '').charAt(0)}`.toUpperCase()
    },

    getCompanyName(member) {
      return 'DASYIN PRO'
    },

    formatLastLogin(loginDate) {
      if (!loginDate) return 'Never'
      return new Date(loginDate).toLocaleDateString()
    },

    async toggleStaffStatus(member) {
      try {
        this.isSubmitting = true
        const updatedData = { ...member, is_active: !member.is_active }
        await this.updateUser(member.id, updatedData)
        showSuccessNotification('Staff status updated successfully!')
      } catch (error) {
        console.error('Error updating staff status:', error)
        showErrorNotification(error, 'Error updating staff status')
      } finally {
        this.isSubmitting = false
      }
    },

    closeModal() {
      this.showAddModal = false
      this.newStaff = {
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        role: 'care_worker',
        is_active: true
      }
    },

    async addStaff() {
      try {
        this.isSubmitting = true
        await this.createUser(this.newStaff)
        this.closeModal()
        showSuccessNotification('Staff member added successfully!')
      } catch (error) {
        console.error('Error adding staff:', error)
        showErrorNotification(error, 'Error adding staff member')
      } finally {
        this.isSubmitting = false
      }
    }
  },
  async mounted() {
    await this.fetchUsers()
  }
}
</script>

<style scoped>
.staff-page {
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
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 32px rgba(240, 147, 251, 0.25);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
}

.title-icon:hover {
  transform: scale(1.05) translateY(-2px);
  box-shadow: 0 12px 40px rgba(240, 147, 251, 0.35);
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
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
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
  box-shadow: 0 8px 25px rgba(240, 147, 251, 0.3);
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

.stat-icon.total { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
.stat-icon.active { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }
.stat-icon.shifts { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
.stat-icon.performance { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); }

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

/* Filters Section */
.filters-section {
  background: var(--card-bg);
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  box-shadow: var(--stat-card-shadow);
}

.filters-container {
  display: flex;
  gap: 1.5rem;
  align-items: end;
  flex-wrap: wrap;
}

.search-box {
  position: relative;
  flex: 1;
  min-width: 300px;
}

.search-box i {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--bs-secondary);
  z-index: 2;
}

.search-input {
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.5rem;
  border: 2px solid var(--card-border);
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.2s ease;
}

.search-input:focus {
  outline: none;
  border-color: #f093fb;
  box-shadow: 0 0 0 3px rgba(240, 147, 251, 0.1);
}

.filter-controls {
  display: flex;
  gap: 1rem;
  align-items: end;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.filter-group label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--bs-body-color);
}

.filter-select {
  padding: 0.75rem 1rem;
  border: 2px solid var(--card-border);
  border-radius: 8px;
  font-size: 1rem;
  background: var(--card-bg);
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 150px;
}

.filter-select:focus {
  outline: none;
  border-color: #f093fb;
  box-shadow: 0 0 0 3px rgba(240, 147, 251, 0.1);
}

.btn-secondary {
  background: var(--bs-tertiary-bg);
  color: var(--bs-secondary);
  border: 2px solid var(--card-border);
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  background: #e9ecef;
  color: #495057;
}</style>
.staff-content {
  min-height: 400px;
}

.loading-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  text-align: center;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--color-border);
  border-top: 4px solid var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-state i {
  font-size: 4rem;
  color: var(--color-text-muted);
  margin-bottom: 1rem;
}

.table-responsive {
  border-radius: 12px;
  overflow: hidden;
}

.table {
  margin-bottom: 0;
}

.table th {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: none;
  padding: 1rem;
  font-weight: 600;
  color: var(--color-text);
}

.table td {
  padding: 1rem;
  border: none;
  background: rgba(255, 255, 255, 0.05);
}

.table tbody tr:hover td {
  background: rgba(255, 255, 255, 0.1);
  transition: background 0.2s ease;
}

.badge {
  font-size: 0.75rem;
  padding: 0.375rem 0.75rem;
  border-radius: 6px;
}

.form-check-input {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 0.5rem;
}
</style>
