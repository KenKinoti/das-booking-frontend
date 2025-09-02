<template>
  <header class="header">
    <div class="header-left">
      <button class="menu-toggle" @click.stop="$emit('toggle-sidebar')">
        <i class="fas fa-bars"></i>
      </button>
    </div>
    
    <div class="header-right">
      
      <!-- Theme Toggle -->
      <ThemeToggle />
      
      <div class="search-box">
        <input 
          type="text" 
          class="search-input" 
          placeholder="Search bookings, customers, or services..."
          v-model="searchQuery"
          @input="handleSearch"
          @keyup.enter="performSearch"
          @focus="showSearchResults = true"
          @blur="hideSearchResults"
        >
        <i class="fas fa-search search-icon" @click="performSearch"></i>
        
        <!-- Search Results Dropdown -->
        <div v-if="showSearchResults && (searchResults.length > 0 || isSearching)" class="search-results">
          <div v-if="isSearching" class="search-loading">
            <i class="fas fa-spinner fa-spin"></i>
            Searching...
          </div>
          <div v-else-if="searchResults.length === 0 && searchQuery.trim()" class="search-no-results">
            No results found for "{{ searchQuery }}"
          </div>
          <div v-else>
            <div v-for="result in searchResults" :key="`${result.type}-${result.id}`" 
                 class="search-result-item" @click="navigateToResult(result)">
              <div class="result-icon">
                <i :class="getResultIcon(result.type)"></i>
              </div>
              <div class="result-content">
                <div class="result-title">{{ result.title }}</div>
                <div class="result-subtitle">{{ result.subtitle }}</div>
              </div>
              <div class="result-type">{{ result.type }}</div>
            </div>
          </div>
        </div>
      </div>
      
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
        <div class="user-avatar">{{ userInitials }}</div>
        <span>{{ userName }}</span>
        <i class="fas fa-chevron-down"></i>
        
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
  </header>
</template>

<script>
import { useAuthStore } from '../stores/auth'
import { useOrganizationContextStore } from '../stores/organizationContext'
import ThemeToggle from './ThemeToggle.vue'
import api from '../services/api'

export default {
  name: 'Header',
  components: {
    ThemeToggle
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
      searchQuery: '',
      searchResults: [],
      showSearchResults: false,
      isSearching: false,
      searchTimeout: null
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
        // For MVP, implement basic search across participants, staff, and documents
        const promises = [
          this.searchParticipants(),
          this.searchStaff(),
          this.searchDocuments()
        ]
        
        const results = await Promise.allSettled(promises)
        this.searchResults = results
          .filter(result => result.status === 'fulfilled')
          .flatMap(result => result.value)
          .slice(0, 8) // Limit to 8 results
        
      } catch (error) {
        console.error('Search error:', error)
        this.searchResults = []
      } finally {
        this.isSearching = false
      }
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
      }
    })
  }
}
</script>

<style scoped>
.header {
  background: var(--card-background);
  backdrop-filter: blur(20px);
  padding: var(--spacing-2xl) var(--container-padding);
  box-shadow: var(--shadow-soft);
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 100;
  border-bottom: 1px solid var(--border-color);
  transition: all var(--transition-smooth);
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-2xl);
}

.menu-toggle {
  display: none;
  background: none;
  border: none;
  font-size: 1.25rem;
  color: var(--text-medium);
  cursor: pointer;
  padding: var(--spacing-sm);
  border-radius: var(--border-radius-sm);
  transition: all var(--transition-fast);
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.menu-toggle:hover {
  background: rgba(102, 126, 234, 0.1);
  color: var(--primary-color);
}

.page-title {
  font-size: 1.75rem;
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin: 0;
  letter-spacing: -0.025em;
}

.header-right {
  display: flex;
  align-items: center;
  gap: var(--spacing-xl);
}

.search-box {
  position: relative;
}

.search-input {
  padding: 12px 40px 12px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 25px;
  width: 300px;
  font-size: 0.9rem;
  transition: all 0.3s ease;
}

.search-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.search-icon {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-light);
  cursor: pointer;
  transition: color 0.3s ease;
}

.search-icon:hover {
  color: var(--primary-color);
}

.search-results {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  background: var(--white);
  border-radius: var(--border-radius-sm);
  box-shadow: var(--shadow-medium);
  z-index: 1000;
  border: 1px solid #e2e8f0;
  display: flex;
  flex-wrap: nowrap;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 8px;
  gap: 8px;
  max-width: 800px;
}

.search-loading,
.search-no-results {
  padding: 1rem;
  text-align: center;
  color: var(--text-medium);
  font-size: 0.9rem;
}

.search-loading i {
  margin-right: 0.5rem;
}

.search-result-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: var(--border-radius-sm);
  background: rgba(102, 126, 234, 0.05);
  min-width: 120px;
  flex-shrink: 0;
  text-align: center;
}

.search-result-item:hover {
  background-color: rgba(102, 126, 234, 0.15);
  transform: translateY(-2px);
  box-shadow: var(--shadow-soft);
}

.result-icon {
  width: 32px;
  height: 32px;
  background: rgba(102, 126, 234, 0.1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.result-icon i {
  color: var(--primary-color);
  font-size: 0.9rem;
}

.result-content {
  width: 100%;
}

.result-title {
  font-weight: var(--font-weight-medium);
  color: var(--text-dark);
  font-size: 0.8rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}

.result-subtitle {
  font-size: 0.7rem;
  color: var(--text-medium);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.result-type {
  font-size: 0.6rem;
  color: var(--primary-color);
  text-transform: uppercase;
  font-weight: var(--font-weight-bold);
  letter-spacing: 0.5px;
  margin-top: 4px;
}

.user-menu {
  display: flex;
  align-items: center;
  gap: 12px;
  
  padding: 8px 16px;
  background: rgba(102, 126, 234, 0.1);
  border-radius: 25px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
}

.user-menu:hover {
  background: rgba(102, 126, 234, 0.2);
}

.user-avatar {
  width: 32px;
  height: 32px;
  background: var(--primary-gradient);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 0.9rem;
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

/* Organization Selector Styles */
.org-selector {
  position: relative;
  margin-right: 1rem;
  cursor: pointer;
}

.org-display {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(102, 126, 234, 0.1);
  border: 1px solid rgba(102, 126, 234, 0.2);
  border-radius: 8px;
  color: var(--text-dark);
  font-weight: 500;
  transition: all 0.3s ease;
  min-width: 200px;
}

.org-display:hover {
  background: rgba(102, 126, 234, 0.15);
  border-color: rgba(102, 126, 234, 0.3);
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
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  color: var(--primary-color);
  font-size: 1.1rem;
}

.icon-btn:hover {
  background: rgba(102, 126, 234, 0.2);
  transform: translateY(-2px);
  box-shadow: var(--shadow-soft);
}

/* Responsive Design */
@media (max-width: 1024px) {
  .search-input {
    width: 250px;
  }
  
  .org-display {
    min-width: 150px;
  }
}

@media (max-width: 768px) {
  .menu-toggle {
    display: flex !important;
  }
  
  .header {
    padding: var(--spacing-lg) var(--spacing-lg);
  }
  
  .header-left {
    gap: var(--spacing-lg);
  }
  
  .header-right {
    gap: var(--spacing-md);
  }

  .search-input {
    width: 180px;
  }

  .page-title {
    font-size: 1.5rem;
  }
  
  .user-menu span {
    display: none;
  }
  
  .org-display {
    min-width: auto;
    padding: var(--spacing-xs) var(--spacing-sm);
  }
  
  .org-display span {
    display: none;
  }
}

@media (max-width: 480px) {
  .header {
    padding: var(--spacing-md) var(--spacing-lg);
  }
  
  .search-box {
    display: none;
  }
  
  .page-title {
    font-size: 1.25rem;
  }
  
  .header-right {
    gap: var(--spacing-sm);
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
</style>
