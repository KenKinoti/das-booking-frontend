<template>
  <header class="header">
    <div class="header-container">
      <div class="header-left">
        <button class="menu-toggle" @click.stop="$emit('toggle-sidebar')">
          <i class="fas fa-bars"></i>
        </button>
        <!-- Remove breadcrumb to clean up navigation -->
      </div>

      <div class="header-center">
        <div class="search-container">
          <div class="search-box">
            <i class="fas fa-search search-icon-left"></i>
            <input
              type="text"
              class="search-input"
              placeholder="Search customers, bookings, staff..."
              v-model="searchQuery"
              @input="handleSearch"
              @keyup.enter="performSearch"
              @focus="showSearchResults = true"
              @blur="hideSearchResults"
            >
            <button v-if="searchQuery" class="search-clear" @click="clearSearch" title="Clear">
              <i class="fas fa-times"></i>
            </button>
          </div>

        <!-- Search Results Dropdown -->
        <div v-if="showSearchResults && searchQuery.trim()" class="search-results">
          <div v-if="isSearching" class="search-loading">
            <i class="fas fa-spinner fa-spin"></i>
            <span>Searching...</span>
          </div>
          <div v-else-if="searchResults.length === 0" class="search-no-results">
            <i class="fas fa-search"></i>
            <span>No results found for "{{ searchQuery }}"</span>
          </div>
          <div v-else class="search-results-list">
            <div v-for="result in searchResults" :key="`${result.type}-${result.id}`"
                 class="search-result-item" @mousedown="navigateToResult(result)">
              <div class="result-icon">
                <i :class="getResultIcon(result.type)"></i>
              </div>
              <div class="result-content">
                <div class="result-title">{{ result.title }}</div>
                <div class="result-subtitle">{{ result.subtitle }}</div>
              </div>
              <div class="result-meta">
                <div class="result-type">{{ result.type }}</div>
                <div v-if="result.status" class="result-status" :class="getStatusClass(result.status)">
                  {{ result.status }}
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>

      <div class="header-right">
        <!-- Quick Actions -->
        <div class="quick-actions">
          <div class="quick-add-dropdown">
            <button class="action-btn" title="Quick Add" @click="toggleQuickAdd">
              <i class="fas fa-plus"></i>
            </button>
            <div v-if="showQuickAdd" class="quick-add-menu">
              <div class="menu-header">Quick Add</div>
              <div class="menu-item" @click="navigateToNewBooking">
                <i class="fas fa-calendar-plus"></i>
                <span>New Booking</span>
              </div>
              <div class="menu-item" @click="navigateToNewCustomer">
                <i class="fas fa-user-plus"></i>
                <span>New Customer</span>
              </div>
              <div class="menu-item" @click="navigateToNewInvoice">
                <i class="fas fa-file-invoice"></i>
                <span>New Invoice</span>
              </div>
              <div class="menu-item" @click="navigateToNewStaff">
                <i class="fas fa-user-tie"></i>
                <span>New Staff</span>
              </div>
            </div>
          </div>
          <button class="action-btn" title="Notifications" @click="navigateToNotifications">
            <i class="fas fa-bell"></i>
            <span class="notification-badge" v-if="notificationCount > 0">{{ notificationCount }}</span>
          </button>
          <button class="action-btn" title="Help & FAQ" @click="navigateToFAQ">
            <i class="fas fa-question-circle"></i>
          </button>
        </div>

        <!-- Theme Toggle -->
        <ThemeToggle />

        <!-- Module Selector for SuperAdmin -->
        <ModuleSelector />

        <!-- Organization Selector for SuperAdmin -->
        <div v-if="isSuperAdmin" class="org-selector" @click="toggleOrgDropdown">
          <div class="org-display">
            <i class="fas fa-building"></i>
            <span>{{ currentOrgName }}</span>
            <i class="fas fa-chevron-down"></i>
          </div>
        
        <!-- Organization Dropdown -->
        <div v-if="showOrgDropdown" class="org-dropdown">
          <div class="dropdown-header">
            <i class="fas fa-building"></i>
            Switch Organization
          </div>
          <!-- Show All Organizations option for super admin -->
          <div v-if="isSuperAdmin" 
               class="dropdown-item" 
               :class="{ active: !currentOrgId }"
               @click="selectOrganization(null)">
            <i class="fas fa-globe"></i>
            <div class="org-info">
              <div class="org-name">All Organizations</div>
              <div class="org-details">View entire database corpus</div>
            </div>
            <i v-if="!currentOrgId" class="fas fa-check"></i>
          </div>
          <div v-for="org in availableOrganizations" :key="org.id" 
               class="dropdown-item" 
               :class="{ active: org.id === currentOrgId }"
               @click="selectOrganization(org)">
            <i class="fas fa-building"></i>
            <div class="org-info">
              <div class="org-name">{{ org.name }}</div>
              <div class="org-details">{{ org.email || org.id }}</div>
            </div>
            <i v-if="org.id === currentOrgId" class="fas fa-check"></i>
          </div>
          <div v-if="availableOrganizations.length === 0" class="dropdown-item disabled">
            No organizations available
          </div>
        </div>
        </div>

        <div class="user-menu" @click="toggleUserDropdown">
          <div class="user-info">
            <div class="user-avatar">{{ userInitials }}</div>
            <div class="user-details">
              <span class="user-name">{{ userName }}</span>
              <span class="user-role">{{ userRole }}</span>
            </div>
          </div>
          <i class="fas fa-chevron-down dropdown-arrow"></i>
        
        <!-- User Dropdown -->
        <div v-if="showUserDropdown" class="user-dropdown">
          <div class="dropdown-item" @click="navigateToProfile">
            <i class="fas fa-user"></i>
            Profile
          </div>
          <div class="dropdown-item" @click="navigateToSettings">
            <i class="fas fa-cog"></i>
            Settings
          </div>
          <hr class="dropdown-divider">
          <div class="dropdown-item logout" @click="handleLogout">
            <i class="fas fa-sign-out-alt"></i>
            Logout
          </div>
        </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script>
import { useAuthStore } from '../stores/auth'
import { useOrganizationContextStore } from '../stores/organizationContext'
import ThemeToggle from './ThemeToggle.vue'
import ModuleSelector from './ModuleSelector.vue'
import api from '../services/api'

export default {
  name: 'AppHeader',
  components: {
    ThemeToggle,
    ModuleSelector
  },
  props: {
    pageTitle: {
      type: String,
      default: 'Dashboard'
    },
    sidebarOpen: {
      type: Boolean,
      default: true
    }
  },
  data() {
    return {
      showUserDropdown: false,
      showOrgDropdown: false,
      showQuickAdd: false,
      searchQuery: '',
      searchResults: [],
      showSearchResults: false,
      isSearching: false,
      searchTimeout: null,
      notificationCount: 3
    }
  },
  computed: {
    authStore() {
      return useAuthStore()
    },
    orgContextStore() {
      return useOrganizationContextStore()
    },
    userName() {
      return this.authStore.userName || 'User'
    },
    userInitials() {
      if (this.authStore.user) {
        return (this.authStore.user.first_name?.[0] || '') + (this.authStore.user.last_name?.[0] || '')
      }
      return 'U'
    },
    isSuperAdmin() {
      return this.authStore.isSuperAdmin
    },
    availableOrganizations() {
      return this.orgContextStore.availableOrganizations
    },
    currentOrgName() {
      return this.orgContextStore.currentOrgName
    },
    currentOrgId() {
      return this.orgContextStore.currentOrgId
    },
    userRole() {
      return this.authStore.user?.role || 'User'
    }
  },
  methods: {
    toggleUserDropdown() {
      this.showUserDropdown = !this.showUserDropdown
    },
    async handleLogout() {
      try {
        await this.authStore.logout()
        this.$router.push('/login')
      } catch (error) {
        console.error('Logout error:', error)
      }
    },
    
    toggleOrgDropdown() {
      this.showOrgDropdown = !this.showOrgDropdown
      // Close user dropdown if open
      if (this.showOrgDropdown) {
        this.showUserDropdown = false
      }
    },
    
    selectOrganization(organization) {
      this.showOrgDropdown = false
      if (organization === null) {
        this.orgContextStore.switchToAllOrganizations()
      } else {
        this.orgContextStore.switchToOrganization(organization.id, organization.name)
      }
      // Emit event for organization change
      this.$emit('organization-changed', organization)
    },
    
    closeOrgDropdown() {
      this.showOrgDropdown = false
    },
    
    handleSearch() {
      // Debounce search to avoid too many API calls
      if (this.searchTimeout) {
        clearTimeout(this.searchTimeout)
      }
      
      this.searchTimeout = setTimeout(() => {
        if (this.searchQuery.trim().length >= 2) {
          this.performSearch()
        } else {
          this.searchResults = []
        }
      }, 300)
    },
    
    async performSearch() {
      if (!this.searchQuery.trim()) {
        this.searchResults = []
        return
      }

      this.isSearching = true
      try {
        const query = this.searchQuery.toLowerCase().trim()
        let mockResults = []

        // Mock customers
        const customers = [
          { id: 1, firstName: 'John', lastName: 'Smith', email: 'john.smith@email.com', phone: '(555) 123-4567', status: 'Active' },
          { id: 2, firstName: 'Sarah', lastName: 'Johnson', email: 'sarah.j@email.com', phone: '(555) 234-5678', status: 'Active' },
          { id: 3, firstName: 'Mike', lastName: 'Wilson', email: 'mike.wilson@email.com', phone: '(555) 345-6789', status: 'Inactive' },
          { id: 4, firstName: 'Lisa', lastName: 'Chen', email: 'lisa.chen@email.com', phone: '(555) 456-7890', status: 'Active' }
        ]

        // Mock bookings
        const bookings = [
          { id: 101, customerName: 'John Smith', service: 'Massage Therapy', date: '2024-01-15', time: '10:00 AM', status: 'Confirmed' },
          { id: 102, customerName: 'Sarah Johnson', service: 'Facial Treatment', date: '2024-01-16', time: '2:00 PM', status: 'Pending' },
          { id: 103, customerName: 'Mike Wilson', service: 'Hair Cut', date: '2024-01-17', time: '11:30 AM', status: 'Completed' }
        ]

        // Mock invoices
        const invoices = [
          { id: 'INV-001', customerName: 'John Smith', amount: '$120.00', date: '2024-01-10', status: 'Paid' },
          { id: 'INV-002', customerName: 'Sarah Johnson', amount: '$85.00', date: '2024-01-12', status: 'Pending' },
          { id: 'INV-003', customerName: 'Mike Wilson', amount: '$75.00', date: '2024-01-14', status: 'Overdue' }
        ]

        // Mock staff
        const staff = [
          { id: 201, firstName: 'Dr. Emily', lastName: 'Rodriguez', role: 'Therapist', department: 'Wellness', status: 'Available' },
          { id: 202, firstName: 'James', lastName: 'Thompson', role: 'Stylist', department: 'Beauty', status: 'Busy' },
          { id: 203, firstName: 'Maria', lastName: 'Garcia', role: 'Receptionist', department: 'Front Desk', status: 'Available' }
        ]

        // Search customers
        customers.forEach(customer => {
          if (customer.firstName.toLowerCase().includes(query) ||
              customer.lastName.toLowerCase().includes(query) ||
              customer.email.toLowerCase().includes(query) ||
              customer.phone.includes(query)) {
            mockResults.push({
              id: customer.id,
              type: 'customer',
              title: `${customer.firstName} ${customer.lastName}`,
              subtitle: `${customer.email} • ${customer.phone}`,
              status: customer.status,
              route: `/customers/${customer.id}`
            })
          }
        })

        // Search bookings
        bookings.forEach(booking => {
          if (booking.customerName.toLowerCase().includes(query) ||
              booking.service.toLowerCase().includes(query) ||
              booking.id.toString().includes(query)) {
            mockResults.push({
              id: booking.id,
              type: 'booking',
              title: `Booking #${booking.id} - ${booking.service}`,
              subtitle: `${booking.customerName} • ${booking.date} at ${booking.time}`,
              status: booking.status,
              route: `/bookings/${booking.id}`
            })
          }
        })

        // Search invoices
        invoices.forEach(invoice => {
          if (invoice.customerName.toLowerCase().includes(query) ||
              invoice.id.toLowerCase().includes(query)) {
            mockResults.push({
              id: invoice.id,
              type: 'invoice',
              title: `Invoice ${invoice.id} - ${invoice.amount}`,
              subtitle: `${invoice.customerName} • ${invoice.date}`,
              status: invoice.status,
              route: `/billing/${invoice.id}`
            })
          }
        })

        // Search staff
        staff.forEach(member => {
          if (member.firstName.toLowerCase().includes(query) ||
              member.lastName.toLowerCase().includes(query) ||
              member.role.toLowerCase().includes(query) ||
              member.department.toLowerCase().includes(query)) {
            mockResults.push({
              id: member.id,
              type: 'staff',
              title: `${member.firstName} ${member.lastName}`,
              subtitle: `${member.role} • ${member.department}`,
              status: member.status,
              route: `/staff/${member.id}`
            })
          }
        })

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 400))

        this.searchResults = mockResults.slice(0, 8) // Limit to 8 results

      } catch (error) {
        console.error('Search error:', error)
        this.searchResults = []
      } finally {
        this.isSearching = false
      }
    },

    clearSearch() {
      this.searchQuery = ''
      this.searchResults = []
      this.showSearchResults = false
    },
    
    async searchParticipants() {
      try {
        const response = await api.get('/participants', {
          params: { search: this.searchQuery, limit: 3 }
        })
        
        if (response.success && response.data.participants) {
          return response.data.participants.map(participant => ({
            id: participant.id,
            type: 'participant',
            title: `${participant.first_name} ${participant.last_name}`,
            subtitle: participant.ndis_number || 'Participant',
            route: `/participants/${participant.id}`
          }))
        }
        return []
      } catch (error) {
        console.log('Participant search failed:', error.message)
        return []
      }
    },
    
    async searchStaff() {
      try {
        const response = await api.get('/users', {
          params: { search: this.searchQuery, limit: 3 }
        })
        
        if (response.success && response.data.users) {
          return response.data.users.map(user => ({
            id: user.id,
            type: 'staff',
            title: `${user.first_name} ${user.last_name}`,
            subtitle: user.role || 'Staff Member',
            route: `/staff/${user.id}`
          }))
        }
        return []
      } catch (error) {
        console.log('Staff search failed:', error.message)
        return []
      }
    },
    
    async searchDocuments() {
      try {
        const response = await api.get('/documents', {
          params: { search: this.searchQuery, limit: 2 }
        })
        
        if (response.success && response.data.documents) {
          return response.data.documents.map(doc => ({
            id: doc.id,
            type: 'document',
            title: doc.title || doc.original_filename,
            subtitle: doc.category || 'Document',
            route: `/documents`
          }))
        }
        return []
      } catch (error) {
        console.log('Document search failed:', error.message)
        return []
      }
    },
    
    getResultIcon(type) {
      const icons = {
        participant: 'fas fa-user',
        staff: 'fas fa-user-tie',
        document: 'fas fa-file'
      }
      return icons[type] || 'fas fa-search'
    },
    
    navigateToResult(result) {
      this.searchQuery = ''
      this.searchResults = []
      this.showSearchResults = false
      this.$router.push(result.route)
    },
    
    hideSearchResults() {
      // Add small delay to allow click events on results
      setTimeout(() => {
        this.showSearchResults = false
      }, 200)
    },
    
    navigateToProfile() {
      this.showUserDropdown = false
      this.$router.push('/profile')
    },
    
    navigateToSettings() {
      this.showUserDropdown = false
      this.$router.push('/settings')
    },


    navigateToFAQ() {
      this.$router.push('/faq')
    },

    toggleQuickAdd() {
      this.showQuickAdd = !this.showQuickAdd
      // Close other dropdowns
      if (this.showQuickAdd) {
        this.showUserDropdown = false
        this.showOrgDropdown = false
        this.showSearchResults = false
      }
    },

    navigateToNewBooking() {
      this.showQuickAdd = false
      this.$router.push('/bookings')
    },

    navigateToNewCustomer() {
      this.showQuickAdd = false
      this.$router.push('/customers')
    },

    navigateToNewInvoice() {
      this.showQuickAdd = false
      this.$router.push('/billing')
    },

    navigateToNewStaff() {
      this.showQuickAdd = false
      this.$router.push('/staff')
    },

    navigateToNotifications() {
      this.$router.push('/dashboard')
    },

    getResultIcon(type) {
      const icons = {
        customer: 'fas fa-user',
        booking: 'fas fa-calendar-check',
        staff: 'fas fa-user-tie',
        invoice: 'fas fa-file-invoice-dollar',
        document: 'fas fa-file'
      }
      return icons[type] || 'fas fa-search'
    },

    getStatusClass(status) {
      const statusClasses = {
        'Active': 'status-active',
        'Inactive': 'status-inactive',
        'Confirmed': 'status-confirmed',
        'Pending': 'status-pending',
        'Completed': 'status-completed',
        'Cancelled': 'status-cancelled',
        'Paid': 'status-paid',
        'Overdue': 'status-overdue',
        'Available': 'status-available',
        'Busy': 'status-busy'
      }
      return statusClasses[status] || 'status-default'
    },
    
  },
  async mounted() {
    // Initialize organization context for SuperAdmin
    if (this.isSuperAdmin) {
      // Ensure default to "All Organizations" first
      this.orgContextStore.setDefaultAllOrganizations()
      this.orgContextStore.initializeFromStorage()
      await this.orgContextStore.fetchOrganizations()
    }
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
      if (!this.$el.contains(e.target)) {
        this.showUserDropdown = false
        this.showOrgDropdown = false
        this.showQuickAdd = false
        this.showSearchResults = false
      }
    })
  }
}
</script>

<style scoped>
.header {
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
  position: sticky;
  top: 0;
  z-index: 100;
  height: 60px;
  min-height: 60px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  transition: all 0.2s ease;
  backdrop-filter: blur(8px);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.header-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  max-width: 100%;
  padding: 0 20px;
  gap: 12px;
  overflow: hidden;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 0 0 auto;
  min-width: 50px;
}

.header-center {
  display: flex;
  justify-content: center;
  flex: 1;
  max-width: 600px;
  margin: 0 20px;
  min-width: 200px;
}

.menu-toggle {
  display: none;
  background: none;
  border: none;
  font-size: 16px;
  color: #6b7280;
  cursor: pointer;
  padding: 0;
  border-radius: 8px;
  transition: all 0.2s ease;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.menu-toggle:hover {
  background: #f3f4f6;
  color: #374151;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.breadcrumb-item {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--bs-body-color);
  margin: 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 0 0 auto;
  min-width: 300px;
  justify-content: flex-end;
  overflow: hidden;
  flex-shrink: 0;
}

.search-container {
  width: 100%;
  max-width: 500px;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 0 14px;
  height: 38px;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.search-box:focus-within {
  background: #ffffff;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.08), 0 1px 3px rgba(0, 0, 0, 0.1);
}

.search-icon-left {
  color: #64748b;
  font-size: 14px;
  margin-right: 10px;
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  color: #1e293b;
  padding: 0;
  font-weight: 400;
  min-width: 0;
}

.search-input::placeholder {
  color: #94a3b8;
  font-weight: 400;
}

.search-clear {
  background: none;
  border: none;
  color: #64748b;
  padding: 4px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s ease;
  font-size: 12px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
}

.search-clear:hover {
  background: #f1f5f9;
  color: #475569;
}

.search-results {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  z-index: 1000;
  border: 1px solid #e2e8f0;
  overflow: hidden;
  max-width: 400px;
}

.search-loading,
.search-no-results {
  padding: 16px;
  text-align: center;
  color: #64748b;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.search-loading i {
  color: #6366f1;
}

.search-results-list {
  max-height: 300px;
  overflow-y: auto;
}

.search-result-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 1px solid #f1f5f9;
}

.search-result-item:last-child {
  border-bottom: none;
}

.search-result-item:hover {
  background: #f8fafc;
}

.result-icon {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.result-icon i {
  color: white;
  font-size: 16px;
}

.result-content {
  flex: 1;
  min-width: 0;
}

.result-title {
  font-weight: 600;
  color: #1e293b;
  font-size: 14px;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.result-subtitle {
  font-size: 12px;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.result-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
}

.result-type {
  font-size: 10px;
  color: #6366f1;
  text-transform: uppercase;
  font-weight: 700;
  letter-spacing: 0.5px;
  background: rgba(99, 102, 241, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
}

.result-status {
  font-size: 9px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 12px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

/* Status colors */
.status-active, .status-confirmed, .status-paid, .status-available {
  background: rgba(34, 197, 94, 0.1);
  color: #16a34a;
}

.status-pending {
  background: rgba(245, 158, 11, 0.1);
  color: #d97706;
}

.status-inactive, .status-cancelled {
  background: rgba(107, 114, 128, 0.1);
  color: #6b7280;
}

.status-overdue {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

.status-completed {
  background: rgba(59, 130, 246, 0.1);
  color: #2563eb;
}

.status-busy {
  background: rgba(168, 85, 247, 0.1);
  color: #9333ea;
}

.status-default {
  background: rgba(107, 114, 128, 0.1);
  color: #6b7280;
}

.user-menu {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  height: 40px;
}

.user-menu:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-avatar {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 14px;
}

.user-details {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.user-name {
  font-size: 14px;
  font-weight: 500;
  color: #111827;
  line-height: 1.2;
}

.user-role {
  font-size: 12px;
  color: #6b7280;
  line-height: 1.2;
  margin-top: 1px;
}

.dropdown-arrow {
  color: #9ca3af;
  font-size: 12px;
  transition: transform 0.2s ease;
}

.user-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  background: var(--white);
  border-radius: var(--border-radius-sm);
  box-shadow: var(--shadow-medium);
  min-width: 180px;
  z-index: 1000;
  margin-top: 8px;
  overflow: hidden;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  color: var(--text-dark);
  cursor: pointer;
  transition: background 0.3s ease;
}

.dropdown-item:hover {
  background: rgba(102, 126, 234, 0.1);
}

.dropdown-item.logout {
  color: var(--danger-color);
}

.dropdown-item.logout:hover {
  background: rgba(250, 112, 154, 0.1);
}

.dropdown-divider {
  border: none;
  border-top: 1px solid #e2e8f0;
  margin: 0;
}

/* Quick Actions */
.quick-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-btn {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  width: 38px;
  height: 38px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #475569;
  position: relative;
  font-size: 16px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.action-btn:hover {
  background: #ffffff;
  color: #6366f1;
  border-color: #6366f1;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.notification-badge {
  position: absolute;
  top: 6px;
  right: 6px;
  background: #ef4444;
  color: white;
  font-size: 0.625rem;
  font-weight: 700;
  min-width: 16px;
  height: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #ffffff;
}

/* Quick Add Dropdown */
.quick-add-dropdown {
  position: relative;
}

.quick-add-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  min-width: 200px;
  z-index: 1000;
  overflow: hidden;
  margin-top: 8px;
}

.menu-header {
  padding: 12px 16px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  font-weight: 600;
  font-size: 14px;
  color: #374151;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  color: #374151;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
  border-bottom: 1px solid #f1f5f9;
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-item:hover {
  background: #f8fafc;
  color: #6366f1;
}

.menu-item i {
  width: 16px;
  color: #64748b;
  font-size: 14px;
}

.menu-item:hover i {
  color: #6366f1;
}

/* Organization Selector Styles */
.org-selector {
  position: relative;
  cursor: pointer;
}

.org-display {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  color: #111827;
  font-weight: 500;
  transition: all 0.3s ease;
  min-width: 160px;
  font-size: 14px;
  height: 40px;
}

.org-display:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
}

.org-display i.fa-chevron-down {
  font-size: 12px;
  transition: transform 0.3s ease;
}

.org-selector .org-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  background: var(--white);
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  min-width: 300px;
  z-index: 1000;
  margin-top: 8px;
  overflow: hidden;
}

.org-dropdown .dropdown-header {
  background: var(--primary-gradient);
  color: white;
  padding: 12px 16px;
  font-weight: 600;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.org-dropdown .dropdown-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.3s ease;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.org-dropdown .dropdown-item:last-child {
  border-bottom: none;
}

.org-dropdown .dropdown-item:hover {
  background: rgba(102, 126, 234, 0.08);
}

.org-dropdown .dropdown-item.active {
  background: rgba(102, 126, 234, 0.15);
  color: var(--primary-600);
}

.org-dropdown .dropdown-item.disabled {
  color: var(--text-light);
  cursor: not-allowed;
}

.org-dropdown .dropdown-item.disabled:hover {
  background: transparent;
}

.org-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.org-name {
  font-weight: 600;
  color: var(--text-dark);
  font-size: 14px;
}

.org-details {
  font-size: 12px;
  color: var(--text-medium);
  margin-top: 2px;
}


/* Icon Button Styles */
.icon-btn {
  background: rgba(102, 126, 234, 0.1);
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  color: var(--primary-color);
  font-size: 0.9rem;
}

.icon-btn:hover {
  background: rgba(102, 126, 234, 0.2);
  transform: translateY(-1px);
  box-shadow: var(--shadow-soft);
}

/* Desktop Responsive Design */
@media (min-width: 1400px) {
  .header-container {
    padding: 0 24px;
    gap: 16px;
  }

  .header-center {
    max-width: 700px;
    margin: 0 30px;
  }

  .header-right {
    min-width: 350px;
    gap: 16px;
  }

  .org-display {
    min-width: 180px;
    font-size: 14px;
  }

  .user-details {
    display: flex;
  }
}

@media (max-width: 1399px) and (min-width: 1200px) {
  .header-container {
    padding: 0 20px;
    gap: 14px;
  }

  .header-center {
    max-width: 600px;
    margin: 0 25px;
  }

  .header-right {
    min-width: 320px;
    gap: 14px;
  }

  .org-display {
    min-width: 170px;
    font-size: 14px;
  }

  .user-details {
    display: flex;
  }
}

@media (max-width: 1199px) and (min-width: 1024px) {
  .header-container {
    padding: 0 18px;
    gap: 12px;
  }

  .header-center {
    max-width: 500px;
    margin: 0 20px;
  }

  .header-right {
    min-width: 280px;
    gap: 12px;
  }

  .org-display {
    min-width: 150px;
    font-size: 13px;
  }

  .user-details {
    display: flex;
  }
}

@media (max-width: 1023px) and (min-width: 900px) {
  .header-container {
    padding: 0 16px;
    gap: 10px;
  }

  .header-center {
    max-width: 400px;
    margin: 0 15px;
  }

  .header-right {
    min-width: 250px;
    gap: 10px;
  }

  .org-display {
    min-width: 140px;
    font-size: 13px;
  }

  .user-details {
    display: flex;
  }

  /* Hide one less important quick action */
  .quick-actions .action-btn:nth-child(3) {
    display: none;
  }
}

@media (max-width: 899px) and (min-width: 769px) {
  .header-container {
    padding: 0 14px;
    gap: 8px;
  }

  .header-center {
    max-width: 300px;
    margin: 0 10px;
  }

  .header-right {
    min-width: 220px;
    gap: 8px;
  }

  .org-display {
    min-width: 120px;
    font-size: 12px;
  }

  .user-details {
    display: none;
  }

  .user-menu {
    padding: 4px;
    width: 36px;
    height: 36px;
    justify-content: center;
  }

  /* Hide multiple quick actions */
  .quick-actions .action-btn:nth-child(n+3) {
    display: none;
  }
}

@media (max-width: 768px) {
  .menu-toggle {
    display: flex !important;
  }

  .header {
    height: 56px;
    min-height: 56px;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 1000;
  }

  .header-container {
    padding: 0 12px;
    gap: 8px;
  }

  .header-left {
    gap: 6px;
    min-width: auto;
    flex: 0 0 auto;
  }

  .header-right {
    gap: 6px;
    min-width: auto;
    flex: 0 0 auto;
    max-width: 50%;
  }

  .header-center {
    margin: 0;
    max-width: 200px;
    flex: 1;
    min-width: 0;
  }

  .search-box {
    height: 36px;
    padding: 0 10px;
  }

  .search-input {
    font-size: 14px;
  }

  .user-details {
    display: none;
  }

  .user-menu {
    padding: 4px;
    gap: 0;
    min-width: 36px;
    width: 36px;
    justify-content: center;
    height: 36px;
  }

  .org-display {
    min-width: auto;
    padding: 4px 6px;
    font-size: 12px;
    height: 36px;
    max-width: 100px;
  }

  .org-display span {
    display: none;
  }

  .action-btn {
    width: 36px;
    height: 36px;
    font-size: 14px;
    flex-shrink: 0;
  }

  .quick-actions {
    gap: 3px;
    flex-shrink: 0;
  }

  /* Module selector on mobile */
  .module-selector {
    margin-right: 6px;
    flex-shrink: 0;
  }

  /* Hide less important action buttons on smaller tablets */
  .action-btn:nth-child(n+3) {
    display: none;
  }
}

@media (max-width: 480px) {
  .header {
    height: 52px;
    min-height: 52px;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 1001;
  }

  .header-container {
    padding: 0 8px;
    gap: 4px;
  }

  .search-box {
    display: none;
  }

  .header-center {
    display: none;
  }

  .header-left {
    gap: 4px;
    flex: 0 0 auto;
  }

  .header-right {
    gap: 4px;
    flex: 1;
    justify-content: flex-end;
    max-width: 70%;
    overflow: hidden;
  }

  .action-btn {
    width: 32px;
    height: 32px;
    font-size: 12px;
    flex-shrink: 0;
  }

  .user-avatar {
    width: 24px;
    height: 24px;
    font-size: 11px;
  }

  .user-menu {
    width: 32px;
    height: 32px;
    padding: 4px;
    flex-shrink: 0;
  }

  .org-display {
    padding: 4px;
    min-width: auto;
    font-size: 11px;
    height: 32px;
    width: 32px;
    justify-content: center;
  }

  .org-display span {
    display: none;
  }

  .org-display i {
    margin: 0;
  }

  .quick-actions {
    gap: 2px;
    flex-shrink: 0;
  }

  /* Show only essential actions on mobile */
  .action-btn:not(:first-child):not(:last-child) {
    display: none;
  }

  .module-selector {
    margin-right: 4px;
    flex-shrink: 0;
  }

  /* Further compress module selector on mobile */
  .module-selector-trigger {
    min-width: 120px !important;
    padding: 4px 8px !important;
    height: 32px !important;
  }

  .trigger-icon {
    width: 16px !important;
    height: 16px !important;
    margin-right: 4px !important;
    font-size: 12px !important;
  }

  .module-text {
    font-size: 12px !important;
  }

  .module-count {
    font-size: 10px !important;
  }

  .toggle-icon {
    font-size: 10px !important;
    margin-left: 4px !important;
  }
}

/* Organization Selector */
.org-selector {
  position: relative;
  margin-right: 1rem;
}

.org-dropdown {
  cursor: pointer;
}

.org-current {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: #f8f9fa;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  transition: all 0.2s;
  min-width: 200px;
}

.org-current:hover {
  border-color: #667eea;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.1);
}

.org-icon {
  color: #667eea;
}

.org-name {
  font-weight: 500;
  color: #2c3e50;
  flex: 1;
}

.dropdown-arrow {
  color: #6c757d;
  transition: transform 0.2s;
}

.dropdown-arrow.open {
  transform: rotate(180deg);
}

.org-dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
  z-index: 1000;
  margin-top: 0.25rem;
}

.org-dropdown-header {
  padding: 0.75rem 1rem;
  font-weight: 600;
  color: #2c3e50;
  border-bottom: 1px solid #f1f3f4;
  background: #f8f9fa;
}

.org-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.org-option:hover {
  background: #f8f9fa;
}

.org-option.active {
  background: #e3f2fd;
  color: #1976d2;
}

.org-info {
  flex: 1;
}

.org-title {
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.org-type {
  font-size: 0.85rem;
  color: #6c757d;
}

.org-option i.fa-check {
  color: #28a745;
}

@media (max-width: 768px) {
  .org-selector {
    order: -1;
    margin-right: 0.5rem;
    margin-left: 0.5rem;
  }
  
  .org-current {
    min-width: auto;
    padding: 0.5rem 0.75rem;
  }
  
  .org-name {
    display: none;
  }
}

@media (max-width: 480px) {
  .search-box {
    display: none;
  }
}

/* Dark Theme Support */
[data-bs-theme="dark"] .header {
  background: #1f2937;
  border-bottom-color: #374151;
}

[data-bs-theme="dark"] .search-box {
  background: #374151;
  border-color: #4b5563;
}

[data-bs-theme="dark"] .search-box:focus-within {
  background: #374151;
  border-color: #6366f1;
}

[data-bs-theme="dark"] .search-input {
  color: #f9fafb;
}

[data-bs-theme="dark"] .search-input::placeholder {
  color: #9ca3af;
}

[data-bs-theme="dark"] .search-icon-left,
[data-bs-theme="dark"] .search-filters {
  color: #9ca3af;
}

[data-bs-theme="dark"] .menu-toggle {
  color: #d1d5db;
}

[data-bs-theme="dark"] .menu-toggle:hover {
  background: #374151;
  color: #f9fafb;
}

[data-bs-theme="dark"] .action-btn {
  color: #d1d5db;
}

[data-bs-theme="dark"] .action-btn:hover {
  background: #374151;
  color: #f9fafb;
}

[data-bs-theme="dark"] .user-menu {
  background: #374151;
  border-color: #4b5563;
}

[data-bs-theme="dark"] .user-menu:hover {
  background: #4b5563;
  border-color: #6b7280;
}

[data-bs-theme="dark"] .user-name {
  color: #f9fafb;
}

[data-bs-theme="dark"] .user-role {
  color: #d1d5db;
}

[data-bs-theme="dark"] .org-display {
  background: #374151;
  border-color: #4b5563;
  color: #f9fafb;
}

[data-bs-theme="dark"] .org-display:hover {
  background: #4b5563;
  border-color: #6b7280;
}
</style>
