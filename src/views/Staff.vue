<template>
  <PageTemplate
    page-title="Staff Management"
    page-description="Manage your team members, roles, and schedules for automotive & beauty services"
    header-icon="fas fa-users-cog"
    :stats-cards="statsCards"
    :show-filters="true"
    :show-status-filter="true"
    :show-role-filter="true"
    :show-add-button="true"
    :show-view-toggle="true"
    add-button-text="Add New Staff Member"
    :search-query="searchQuery"
    :status-filter="statusFilter"
    :role-filter="roleFilter"
    :current-view="currentView"
    @add-clicked="showAddModal = true"
    @search-updated="searchQuery = $event"
    @status-filter-updated="statusFilter = $event"
    @role-filter-updated="roleFilter = $event"
    @clear-filters="clearFilters"
    @view-changed="currentView = $event"
  >
    <template #role-options>
      <option value="care_worker">👩‍⚕️ Care Worker</option>
      <option value="manager">👨‍💼 Manager</option>
      <option value="admin">⚙️ Administrator</option>
      <option value="supervisor">👑 Supervisor</option>
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
        <div v-else-if="currentView === 'list'" class="staff-list">
          <div class="staff-table">
            <div class="table-header">
              <div class="header-cell">Staff Member</div>
              <div class="header-cell">Role</div>
              <div class="header-cell">Contact</div>
              <div class="header-cell">Status</div>
              <div class="header-cell">Last Activity</div>
              <div class="header-cell">Actions</div>
            </div>
            
            <div 
              v-for="member in paginatedStaff" 
              :key="member.id" 
              class="table-row"
              :class="{ 
                'status-active': member.is_active !== false,
                'status-inactive': member.is_active === false
              }"
            >
              <div class="table-cell">
                <div class="staff-info">
                  <div class="staff-avatar">
                    {{ getInitials(member.first_name, member.last_name) }}
                  </div>
                  <div class="staff-details">
                    <div class="name">{{ member.first_name }} {{ member.last_name }}</div>
                    <div class="email">{{ member.email }}</div>
                  </div>
                </div>
              </div>
              
              <div class="table-cell">
                <div class="role-info">
                  <span class="role-badge" :class="getRoleClass(member.role)">
                    <i :class="getRoleIcon(member.role)"></i>
                    {{ formatRole(member.role) }}
                  </span>
                </div>
              </div>
              
              <div class="table-cell">
                <div class="contact-info">
                  <div class="phone">{{ member.phone || 'No phone' }}</div>
                  <div class="company">{{ getCompanyName(member) }}</div>
                </div>
              </div>
              
              <div class="table-cell">
                <div class="status-info">
                  <div class="form-check form-switch">
                    <input 
                      class="form-check-input" 
                      type="checkbox" 
                      :checked="member.is_active !== false"
                      @change="toggleStaffStatus(member)"
                      :disabled="isSubmitting"
                    />
                  </div>
                  <span :class="['status-badge', member.is_active !== false ? 'active' : 'inactive']">
                    {{ member.is_active !== false ? 'Active' : 'Inactive' }}
                  </span>
                </div>
              </div>
              
              <div class="table-cell">
                <div class="activity-info">
                  <i class="fas fa-clock"></i>
                  {{ formatLastLogin(member.last_login_at) }}
                </div>
              </div>
              
              <div class="table-cell">
                <div class="actions-menu">
                  <button @click="viewStaff(member)" class="action-btn view" title="View Details">
                    <i class="fas fa-eye"></i>
                  </button>
                  <button @click="scheduleStaff(member)" class="action-btn schedule" title="Schedule Shift">
                    <i class="fas fa-calendar-plus"></i>
                  </button>
                  <button @click="editStaff(member)" class="action-btn edit" title="Edit Staff">
                    <i class="fas fa-edit"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Grid View -->
        <div v-else class="row">
        <div v-for="member in paginatedStaff" :key="member.id" class="col-md-6 col-lg-4 mb-4">
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
      </div> <!-- Close staff-content -->
      
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
      currentPage: 1,
      itemsPerPage: 10,
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
          label: 'Total Staff',
          value: this.staff.length,
          icon: 'fas fa-user-nurse',
          type: 'info'
        },
        {
          label: 'Active Staff', 
          value: this.activeStaff,
          icon: 'fas fa-user-check',
          type: 'success'
        },
        {
          label: 'Available Today',
          value: this.availableToday,
          icon: 'fas fa-clock',
          type: 'warning'
        },
        {
          label: 'Scheduled Today',
          value: this.scheduledToday,
          icon: 'fas fa-calendar-alt',
          type: 'info'
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
          (s.phone && s.phone.includes(query)) ||
          this.formatRole(s.role).toLowerCase().includes(query)
        
        const matchesStatus = !this.statusFilter || 
          (this.statusFilter === 'active' && s.is_active !== false) ||
          (this.statusFilter === 'inactive' && s.is_active === false)
        
        const matchesRole = !this.roleFilter || s.role === this.roleFilter
        
        return matchesSearch && matchesStatus && matchesRole
      })
    },

    totalPages() {
      return Math.ceil(this.filteredStaff.length / this.itemsPerPage)
    },

    paginatedStaff() {
      const start = (this.currentPage - 1) * this.itemsPerPage
      const end = start + this.itemsPerPage
      return this.filteredStaff.slice(start, end)
    },

    startIndex() {
      return (this.currentPage - 1) * this.itemsPerPage
    },

    endIndex() {
      return Math.min(this.startIndex + this.itemsPerPage, this.filteredStaff.length)
    },

    visiblePages() {
      const pages = []
      const maxVisible = 5
      let start = Math.max(1, this.currentPage - 2)
      let end = Math.min(this.totalPages, start + maxVisible - 1)
      
      if (end - start < maxVisible - 1) {
        start = Math.max(1, end - maxVisible + 1)
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i)
      }
      
      return pages
    }
  },
  methods: {
    ...mapActions(useUsersStore, ['fetchUsers', 'createUser', 'updateUser']),

    clearFilters() {
      this.statusFilter = 'active'
      this.roleFilter = ''
      this.searchQuery = ''
      this.currentPage = 1
    },
    
    goToPage(page) {
      if (page >= 1 && page <= this.totalPages) {
        this.currentPage = page
      }
    },
    
    handlePerPageChange() {
      this.currentPage = 1
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

    getRoleClass(role) {
      const classMap = {
        care_worker: 'role-care-worker',
        manager: 'role-manager', 
        admin: 'role-admin',
        supervisor: 'role-supervisor'
      }
      return classMap[role] || 'role-default'
    },

    getRoleIcon(role) {
      const iconMap = {
        care_worker: 'fas fa-user-nurse',
        manager: 'fas fa-user-tie',
        admin: 'fas fa-user-cog', 
        supervisor: 'fas fa-crown'
      }
      return iconMap[role] || 'fas fa-user'
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
    },

    formatDate(date) {
      if (!date) return 'N/A'
      return new Date(date).toLocaleDateString()
    },

    viewStaff(member) {
      // Navigate to staff detail view or show modal
      console.log('View staff:', member)
    },

    scheduleStaff(member) {
      // Navigate to schedule view or show modal
      console.log('Schedule staff:', member)
    },

    editStaff(member) {
      // Navigate to edit view or show modal
      console.log('Edit staff:', member)
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
}

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
/* Staff Table Styles - Matching Bookings Table */
.staff-list {
  background: var(--card-bg);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: var(--card-shadow);
}

.staff-table {
  width: 100%;
}

.table-header {
  display: grid;
  grid-template-columns: 2fr 1fr 1.5fr 1fr 1fr 120px;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: var(--table-header-bg);
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid var(--border-color);
}

.header-cell {
  display: flex;
  align-items: center;
  white-space: nowrap;
}

.table-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1.5fr 1fr 1fr 120px;
  gap: 1rem;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
  transition: all 0.2s ease;
  cursor: pointer;
}

.table-row:hover {
  background: var(--hover-bg);
}

.table-row.status-active {
  border-left: 3px solid #22c55e;
}

.table-row.status-inactive {
  border-left: 3px solid #ef4444;
  opacity: 0.7;
}

.table-cell {
  display: flex;
  align-items: center;
  min-height: 60px;
}

/* Staff Info */
.staff-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.staff-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 0.875rem;
}

.staff-details .name {
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.staff-details .email {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

/* Role Info */
.role-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 500;
  white-space: nowrap;
}

.role-badge i {
  font-size: 0.875rem;
}

.role-care-worker {
  background: #e0f2fe;
  color: #0277bd;
}

.role-manager {
  background: #f3e5f5;
  color: #7b1fa2;
}

.role-admin {
  background: #ffecb3;
  color: #ff8f00;
}

.role-supervisor {
  background: #e8f5e8;
  color: #2e7d32;
}

.role-default {
  background: #f5f5f5;
  color: #666;
}

[data-theme="dark"] .role-care-worker {
  background: rgba(2, 119, 189, 0.2);
  color: #4fc3f7;
}

[data-theme="dark"] .role-manager {
  background: rgba(123, 31, 162, 0.2);
  color: #ba68c8;
}

[data-theme="dark"] .role-admin {
  background: rgba(255, 143, 0, 0.2);
  color: #ffb74d;
}

[data-theme="dark"] .role-supervisor {
  background: rgba(46, 125, 50, 0.2);
  color: #81c784;
}

/* Contact Info */
.contact-info .phone {
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.contact-info .company {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

/* Status Info */
.status-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
}

.status-badge.active {
  background: #dcfce7;
  color: #166534;
}

.status-badge.inactive {
  background: #fee2e2;
  color: #dc2626;
}

[data-theme="dark"] .status-badge.active {
  background: rgba(22, 163, 74, 0.2);
  color: #4ade80;
}

[data-theme="dark"] .status-badge.inactive {
  background: rgba(220, 38, 38, 0.2);
  color: #f87171;
}

/* Activity Info */
.activity-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.activity-info i {
  opacity: 0.6;
}

/* Actions Menu */
.actions-menu {
  display: flex;
  gap: 0.25rem;
}

.action-btn {
  padding: 0.5rem;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn:hover {
  background: var(--hover-bg);
  color: var(--text-primary);
}

.action-btn.view:hover {
  color: #3b82f6;
  background: rgba(59, 130, 246, 0.1);
}

.action-btn.schedule:hover {
  color: #10b981;
  background: rgba(16, 185, 129, 0.1);
}

.action-btn.edit:hover {
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.1);
}

/* Responsive Design */
@media (max-width: 1200px) {
  .table-header,
  .table-row {
    grid-template-columns: 2fr 1fr 1.2fr 1fr 100px;
  }
  
  .header-cell:nth-child(3),
  .table-cell:nth-child(3) {
    display: none;
  }
}

@media (max-width: 768px) {
  .table-header,
  .table-row {
    grid-template-columns: 2fr 1fr 80px;
  }
  
  .header-cell:nth-child(4),
  .header-cell:nth-child(5),
  .table-cell:nth-child(4),
  .table-cell:nth-child(5) {
    display: none;
  }
  
  .staff-details .email {
    display: none;
  }
}
</style>
