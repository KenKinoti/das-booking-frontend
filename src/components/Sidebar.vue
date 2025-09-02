<template>
  <nav class="sidebar" :class="{ 'collapsed': !isOpen, 'open': isOpen }">
    <div class="sidebar-header">
      <div class="logo">
        <div class="logo-icon">
          <i class="fas fa-heart-pulse"></i>
        </div>
        <span class="logo-text">DAS CRM</span>
      </div>
    </div>
    
    <div class="nav-menu">
      <div v-if="visibleNavigation.includes('dashboard')" class="nav-item">
        <a href="#" class="nav-link" :class="{ active: currentPage === 'dashboard' }" @click="navigate('dashboard')">
          <i class="fas fa-chart-line nav-icon"></i>
          Dashboard
        </a>
      </div>
      <div v-if="visibleNavigation.includes('bookings')" class="nav-item">
        <a href="#" class="nav-link" :class="{ active: currentPage === 'bookings' }" @click="navigate('bookings')">
          <i class="fas fa-calendar-check nav-icon"></i>
          Bookings
        </a>
      </div>
      <div v-if="visibleNavigation.includes('customers')" class="nav-item">
        <a href="#" class="nav-link" :class="{ active: currentPage === 'customers' }" @click="navigate('customers')">
          <i class="fas fa-user-friends nav-icon"></i>
          Customers
        </a>
      </div>
      <!-- Service Categories Section -->
      <div v-if="visibleNavigation.includes('services')" class="nav-item nav-expandable">
        <div class="nav-parent">
          <a href="#" class="nav-link" :class="{ active: isServiceCategoryActive }" @click="toggleServiceCategories">
            <i class="fas fa-concierge-bell nav-icon"></i>
            Service Categories
            <i class="fas fa-chevron-right expand-icon" :class="{ expanded: serviceCategoriesExpanded }"></i>
          </a>
        </div>
        <div class="nav-submenu" :class="{ expanded: serviceCategoriesExpanded }">
          <div class="nav-item nav-sub-item">
            <a href="#" class="nav-link nav-sub-link" 
               :class="{ active: currentPage === 'automotive-repair' }" 
               @click="navigate('services/automotive-repair')">
              <i class="fas fa-tools nav-icon"></i>
              Automotive Repair
            </a>
          </div>
          <div class="nav-item nav-sub-item">
            <a href="#" class="nav-link nav-sub-link" 
               :class="{ active: currentPage === 'automotive-maintenance' }" 
               @click="navigate('services/automotive-maintenance')">
              <i class="fas fa-car nav-icon"></i>
              Auto Maintenance
            </a>
          </div>
          <div class="nav-item nav-sub-item">
            <a href="#" class="nav-link nav-sub-link" 
               :class="{ active: currentPage === 'hair-services' }" 
               @click="navigate('services/hair-services')">
              <i class="fas fa-cut nav-icon"></i>
              Hair Services
            </a>
          </div>
          <div class="nav-item nav-sub-item">
            <a href="#" class="nav-link nav-sub-link" 
               :class="{ active: currentPage === 'beauty-spa' }" 
               @click="navigate('services/beauty-spa')">
              <i class="fas fa-spa nav-icon"></i>
              Beauty & Spa
            </a>
          </div>
          <div class="nav-item nav-sub-item">
            <a href="#" class="nav-link nav-sub-link" 
               :class="{ active: currentPage === 'nail-services' }" 
               @click="navigate('services/nail-services')">
              <i class="fas fa-hand-paper nav-icon"></i>
              Nail Services
            </a>
          </div>
          <div class="nav-item nav-sub-item">
            <a href="#" class="nav-link nav-sub-link" 
               :class="{ active: currentPage === 'diagnostic-services' }" 
               @click="navigate('services/diagnostic-services')">
              <i class="fas fa-stethoscope nav-icon"></i>
              Diagnostic Services
            </a>
          </div>
          <div class="nav-item nav-sub-item">
            <a href="#" class="nav-link nav-sub-link" 
               :class="{ active: currentPage === 'service-categories' }" 
               @click="navigate('services/categories')">
              <i class="fas fa-cog nav-icon"></i>
              Manage Categories
            </a>
          </div>
        </div>
      </div>
      <div v-if="visibleNavigation.includes('staff')" class="nav-item">
        <a href="#" class="nav-link" :class="{ active: currentPage === 'staff' }" @click="navigate('staff')">
          <i class="fas fa-users-cog nav-icon"></i>
          Staff
        </a>
      </div>
      <div v-if="visibleNavigation.includes('billing')" class="nav-item">
        <a href="#" class="nav-link" :class="{ active: currentPage === 'billing' }" @click="navigate('billing')">
          <i class="fas fa-dollar-sign nav-icon"></i>
          Billing
        </a>
      </div>
      <div v-if="visibleNavigation.includes('reports')" class="nav-item">
        <a href="#" class="nav-link" :class="{ active: currentPage === 'reports' }" @click="navigate('reports')">
          <i class="fas fa-chart-bar nav-icon"></i>
          Reports
        </a>
      </div>
      <div v-if="visibleNavigation.includes('settings')" class="nav-item">
        <a href="#" class="nav-link" :class="{ active: currentPage === 'settings' }" @click="navigate('settings')">
          <i class="fas fa-cog nav-icon"></i>
          Settings
        </a>
      </div>
      
      <!-- Super Admin Section -->
      <div v-if="isSuperAdmin" class="nav-section">
        <div class="nav-divider"></div>
        <div class="nav-section-title">Super Admin</div>
        <div class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'organizations' }" @click="navigate('organizations')">
            <i class="fas fa-building nav-icon"></i>
            Organizations
          </a>
        </div>
        <div class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'users-admin' }" @click="navigate('users-admin')">
            <i class="fas fa-users-shield nav-icon"></i>
            User Management
          </a>
        </div>
        <div class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'system-settings' }" @click="navigate('system-settings')">
            <i class="fas fa-cogs nav-icon"></i>
            System Settings
          </a>
        </div>
        <div class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'analytics' }" @click="navigate('analytics')">
            <i class="fas fa-chart-pie nav-icon"></i>
            Analytics
          </a>
        </div>
        <div class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'audit-logs' }" @click="navigate('audit-logs')">
            <i class="fas fa-history nav-icon"></i>
            Audit Logs
          </a>
        </div>
        <div class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'database' }" @click="navigate('database')">
            <i class="fas fa-database nav-icon"></i>
            Database
          </a>
        </div>
      </div>
    </div>
  </nav>
</template>

<script>
import { useAuthStore } from '../stores/auth'
import { usePermissionsStore } from '../stores/permissions'

export default {
  name: 'Sidebar',
  props: {
    isOpen: {
      type: Boolean,
      default: true
    },
    currentPage: {
      type: String,
      default: 'dashboard'
    }
  },
  data() {
    return {
      serviceCategoriesExpanded: false
    }
  },
  computed: {
    authStore() {
      return useAuthStore()
    },
    permissionsStore() {
      return usePermissionsStore()
    },
    isSuperAdmin() {
      return this.authStore.isSuperAdmin
    },
    visibleNavigation() {
      // Ensure we always return an array even if permissions store isn't ready
      const navigation = this.permissionsStore.visibleNavigation
      const baseNavigation = Array.isArray(navigation) ? navigation : []
      
      // Ensure core navigation items are always available for authenticated users
      const coreNavigation = ['dashboard', 'bookings', 'customers', 'services']
      coreNavigation.forEach(item => {
        if (!baseNavigation.includes(item)) {
          baseNavigation.push(item)
        }
      })
      
      return baseNavigation
    },
    isServiceCategoryActive() {
      const serviceCategoryPages = [
        'automotive-repair', 'automotive-maintenance', 'hair-services', 
        'beauty-spa', 'nail-services', 'diagnostic-services', 'service-categories'
      ]
      return serviceCategoryPages.some(page => this.currentPage.includes(page))
    }
  },
  methods: {
    navigate(page) {
      this.$emit('navigate', page)
    },
    toggleServiceCategories() {
      this.serviceCategoriesExpanded = !this.serviceCategoriesExpanded
    }
  },
  watch: {
    currentPage(newPage) {
      // Auto-expand service categories if we're on a service category page
      const serviceCategoryPages = [
        'automotive-repair', 'automotive-maintenance', 'hair-services', 
        'beauty-spa', 'nail-services', 'diagnostic-services', 'service-categories'
      ]
      if (serviceCategoryPages.some(page => newPage.includes(page))) {
        this.serviceCategoriesExpanded = true
      }
    }
  }
}
</script>

<style scoped>
.sidebar {
  width: 240px;
  background: var(--card-background);
  backdrop-filter: blur(20px);
  border-right: 1px solid rgba(255,255,255,0.2);
  box-shadow: var(--shadow-medium);
  position: fixed;
  height: 100vh;
  z-index: 1000;
  transition: var(--transition-smooth);
  overflow-y: auto;
  font-family: var(--font-family);
}

.sidebar.collapsed {
  transform: translateX(-100%);
}

.sidebar-header {
  padding: var(--spacing-2xl) var(--spacing-xl);
  border-bottom: 1px solid var(--border-color);
  background: rgba(102, 126, 234, 0.02);
  position: relative;
}

.sidebar-header::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 2rem;
  right: 2rem;
  height: 2px;
  background: var(--primary-gradient);
  border-radius: 1px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  width: 48px;
  height: 48px;
  background: var(--primary-gradient);
  border-radius: var(--border-radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-white);
  font-size: 1.5rem;
  box-shadow: var(--shadow-soft);
  transition: var(--transition-bounce);
}

.logo-icon:hover {
  transform: scale(1.1) rotate(5deg);
  box-shadow: var(--shadow-strong);
}

.logo-text {
  font-size: 1.5rem;
  font-weight: var(--font-weight-bold);
  background: var(--primary-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-family: var(--font-family);
  letter-spacing: -0.02em;
}

.nav-menu {
  padding: var(--spacing-xl) 0;
  overflow-y: auto;
  flex: 1;
}

.nav-item {
  margin: var(--spacing-xs) var(--spacing-xl);
}

.nav-link {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  padding: var(--spacing-lg) var(--spacing-xl);
  text-decoration: none;
  color: var(--text-medium);
  border-radius: var(--border-radius-sm);
  transition: var(--transition-smooth);
  font-weight: var(--font-weight-medium);
  font-family: var(--font-family);
  font-size: 0.9rem;
  position: relative;
  overflow: hidden;
}

.nav-link::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
  transition: left 0.6s;
}

.nav-link:hover::before {
  left: 100%;
}

.nav-link:hover {
  background: rgba(102, 126, 234, 0.1);
  color: var(--primary-color);
  transform: translateX(4px);
  box-shadow: var(--shadow-soft);
}

.nav-link.active {
  background: var(--primary-gradient);
  color: var(--text-white);
  box-shadow: var(--shadow-medium);
  transform: translateX(4px);
}

.nav-link.active::before {
  display: none;
}

.nav-icon {
  width: 20px;
  text-align: center;
  font-size: 1rem;
  transition: var(--transition-fast);
}

.nav-link:hover .nav-icon {
  transform: scale(1.1);
}

.nav-link.active .nav-icon {
  transform: scale(1.1);
  text-shadow: 0 2px 8px rgba(0,0,0,0.2);
}

.nav-section {
  margin-top: var(--spacing-xl);
}

.nav-divider {
  height: 2px;
  background: linear-gradient(90deg, transparent 0%, var(--primary-color) 50%, transparent 100%);
  margin: var(--spacing-md) var(--spacing-lg);
  border-radius: 1px;
}

.nav-section-title {
  font-size: 0.75rem;
  font-weight: var(--font-weight-bold);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--primary-color);
  padding: var(--spacing-sm) var(--spacing-lg) var(--spacing-md) var(--spacing-lg);
  margin: 0;
  font-family: var(--font-family);
  opacity: 0.8;
}

/* Expandable navigation styles */
.nav-expandable {
  position: relative;
}

.nav-parent .nav-link {
  position: relative;
  justify-content: space-between;
}

.expand-icon {
  font-size: 0.75rem;
  transition: transform var(--transition-fast);
  opacity: 0.7;
}

.expand-icon.expanded {
  transform: rotate(90deg);
}

.nav-submenu {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease-out;
  background: rgba(102, 126, 234, 0.03);
  border-radius: var(--border-radius-sm);
  margin: var(--spacing-xs) 0;
}

.nav-submenu.expanded {
  max-height: 400px;
  transition: max-height 0.4s ease-in;
}

.nav-sub-item {
  margin: 0;
  padding: 0 var(--spacing-sm);
}

.nav-sub-link {
  font-size: 0.8rem;
  padding: var(--spacing-xs) var(--spacing-md) var(--spacing-xs) var(--spacing-xl);
  margin: var(--spacing-xs) 0;
  border-left: 2px solid transparent;
  position: relative;
}

.nav-sub-link:hover {
  background: rgba(102, 126, 234, 0.08);
  border-left-color: var(--primary-color);
  transform: translateX(2px);
}

.nav-sub-link.active {
  background: rgba(102, 126, 234, 0.15);
  color: var(--primary-color);
  border-left-color: var(--primary-color);
  font-weight: var(--font-weight-semibold);
}

.nav-sub-link .nav-icon {
  font-size: 0.875rem;
  opacity: 0.8;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .sidebar {
    width: 220px;
  }
  
  .nav-link {
    font-size: 0.875rem;
    padding: var(--spacing-md) var(--spacing-lg);
  }
}

@media (max-width: 768px) {
  .sidebar {
    transform: translateX(-100%);
    width: 280px;
    box-shadow: var(--shadow-strong);
  }

  .sidebar.open {
    transform: translateX(0);
  }
  
  .sidebar-header {
    padding: var(--spacing-xl) var(--spacing-lg);
  }
  
  .nav-menu {
    padding: var(--spacing-lg) 0;
  }
  
  .nav-item {
    margin: var(--spacing-xs) var(--spacing-lg);
  }
  
  .nav-link {
    padding: var(--spacing-lg) var(--spacing-xl);
    font-size: 0.95rem;
  }
}
</style>