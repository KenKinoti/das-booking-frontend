<template>
  <nav class="sidebar" :class="{ 'collapsed': !isOpen, 'open': isOpen }">
    <div class="sidebar-header">
      <div class="logo">
        <div class="logo-icon">
          <i class="bi bi-building-gear"></i>
        </div>
        <span class="logo-text">DASYIN ERP</span>
      </div>
    </div>
    
    <div class="nav-menu">
      <!-- Core ERP Modules -->
      <div v-if="shouldShowDashboard" class="nav-item">
        <a href="#" class="nav-link" :class="{ active: currentPage === 'dashboard' }" @click="navigate('dashboard')">
          <i class="fas fa-chart-line nav-icon"></i>
          Dashboard
        </a>
      </div>

      <!-- Financial Management -->
      <div v-if="shouldShowFinanceSection" class="nav-section">
        <div class="nav-section-title">Financial Management</div>
        <div class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'finance' }" @click="navigate('finance')">
            <i class="fas fa-calculator nav-icon"></i>
            Finance & Accounting
          </a>
        </div>
        <div class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'invoices' }" @click="navigate('invoices')">
            <i class="fas fa-file-invoice-dollar nav-icon"></i>
            Billing & Invoicing
          </a>
        </div>
        <div class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'bills' }" @click="navigate('bills')">
            <i class="fas fa-receipt nav-icon"></i>
            Bills & Expenses
          </a>
        </div>
        <div class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'banking' }" @click="navigate('banking')">
            <i class="fas fa-bank nav-icon"></i>
            Banking & Transactions
          </a>
        </div>
      </div>

      <!-- Operations Management -->
      <div v-if="shouldShowOperationsSection" class="nav-section">
        <div class="nav-divider"></div>
        <div class="nav-section-title">Operations</div>
        <div class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'inventory' }" @click="navigate('inventory')">
            <i class="fas fa-boxes nav-icon"></i>
            Inventory Management
          </a>
        </div>
        <div class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'suppliers' }" @click="navigate('suppliers')">
            <i class="fas fa-truck nav-icon"></i>
            Supplier Management
          </a>
        </div>
        <div class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'production' }" @click="navigate('production')">
            <i class="fas fa-cogs nav-icon"></i>
            Production & MRP
          </a>
        </div>
      </div>

      <!-- Customer Relations -->
      <div v-if="shouldShowCustomerSection" class="nav-section">
        <div class="nav-divider"></div>
        <div class="nav-section-title">Customer Relations</div>
        <div class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'crm' }" @click="navigate('crm')">
            <i class="fas fa-users nav-icon"></i>
            CRM
          </a>
        </div>
        <div class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'bookings' }" @click="navigate('bookings')">
            <i class="fas fa-calendar-check nav-icon"></i>
            Bookings & Appointments
          </a>
        </div>
        <div class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'customers' }" @click="navigate('customers')">
            <i class="fas fa-user-friends nav-icon"></i>
            Customer Management
          </a>
        </div>
      </div>

      <!-- Service Management -->
      <div v-if="shouldShowServicesSection" class="nav-section">
        <div class="nav-divider"></div>
        <div class="nav-section-title">Services & Projects</div>
        <div class="nav-item nav-expandable">
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
        <div class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'projects' }" @click="navigate('projects')">
            <i class="fas fa-project-diagram nav-icon"></i>
            Project Management
          </a>
        </div>
      </div>

      <!-- Human Resources -->
      <div v-if="shouldShowHRSection" class="nav-section">
        <div class="nav-divider"></div>
        <div class="nav-section-title">Human Resources</div>
        <div class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'staff' }" @click="navigate('staff')">
            <i class="fas fa-users-cog nav-icon"></i>
            Staff Management
          </a>
        </div>
        <div class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'hcm' }" @click="navigate('hcm')">
            <i class="fas fa-user-tie nav-icon"></i>
            HCM & Payroll
          </a>
        </div>
      </div>

      <!-- Sales & E-commerce -->
      <div v-if="shouldShowSalesSection" class="nav-section">
        <div class="nav-divider"></div>
        <div class="nav-section-title">Sales & E-commerce</div>
        <div class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'pos' }" @click="navigate('pos')">
            <i class="fas fa-cash-register nav-icon"></i>
            Point of Sale
          </a>
        </div>
        <div class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'pos-transactions' }" @click="navigate('pos-transactions')">
            <i class="fas fa-receipt nav-icon"></i>
            POS Transactions
          </a>
        </div>
        <div class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'ecommerce' }" @click="navigate('ecommerce')">
            <i class="fas fa-shopping-cart nav-icon"></i>
            E-commerce Integration
          </a>
        </div>
      </div>

      <!-- Analytics & Reports -->
      <div v-if="shouldShowReportsSection" class="nav-section">
        <div class="nav-divider"></div>
        <div class="nav-section-title">Analytics & Reports</div>
        <div class="nav-item">
          <a href="#" class="nav-link" :class="{ active: currentPage === 'reports' }" @click="navigate('reports')">
            <i class="fas fa-chart-bar nav-icon"></i>
            Reports & Analytics
          </a>
        </div>
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
import { useModuleSelectorStore } from '../stores/moduleSelector'
import { moduleService } from '../services/moduleService'

export default {
  name: 'AppSidebar',
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
      serviceCategoriesExpanded: false,
      moduleConfig: null
    }
  },
  computed: {
    authStore() {
      return useAuthStore()
    },
    permissionsStore() {
      return usePermissionsStore()
    },
    moduleSelectorStore() {
      return useModuleSelectorStore()
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
    },
    isERPEnabled() {
      // ERP modules are now always enabled as part of the comprehensive system
      return true
    },
    isPOSEnabled() {
      // POS modules are now integrated into the main navigation
      return true
    },
    shouldShowFinanceSection() {
      return !this.isSuperAdmin || this.moduleSelectorStore.shouldShowRoute('finance')
    },
    shouldShowOperationsSection() {
      return !this.isSuperAdmin ||
        this.moduleSelectorStore.shouldShowRoute('inventory') ||
        this.moduleSelectorStore.shouldShowRoute('production')
    },
    shouldShowCustomerSection() {
      return !this.isSuperAdmin ||
        this.moduleSelectorStore.shouldShowRoute('crm') ||
        this.moduleSelectorStore.shouldShowRoute('bookings') ||
        this.moduleSelectorStore.shouldShowRoute('customers')
    },
    shouldShowServicesSection() {
      return !this.isSuperAdmin || this.moduleSelectorStore.shouldShowRoute('services')
    },
    shouldShowHRSection() {
      return !this.isSuperAdmin || this.moduleSelectorStore.shouldShowRoute('hcm')
    },
    shouldShowSalesSection() {
      return !this.isSuperAdmin ||
        this.moduleSelectorStore.shouldShowRoute('pos') ||
        this.moduleSelectorStore.shouldShowRoute('ecommerce')
    },
    shouldShowReportsSection() {
      return !this.isSuperAdmin || this.moduleSelectorStore.shouldShowRoute('reports')
    },
    shouldShowDashboard() {
      return !this.isSuperAdmin || this.moduleSelectorStore.shouldShowRoute('dashboard')
    }
  },
  methods: {
    navigate(page) {
      this.$emit('navigate', page)
    },
    toggleServiceCategories() {
      this.serviceCategoriesExpanded = !this.serviceCategoriesExpanded
    },
    async fetchModuleConfig() {
      try {
        const response = await moduleService.getOrganizationModules()
        this.moduleConfig = response.data.module_config
      } catch (error) {
        console.error('Error fetching module config:', error)
      }
    }
  },
  async mounted() {
    await this.fetchModuleConfig()
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
  width: 200px;
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
  padding: 1rem;
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
  gap: 8px;
}

.logo-icon {
  width: 36px;
  height: 36px;
  background: var(--primary-gradient);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-white);
  font-size: 1.25rem;
  box-shadow: var(--shadow-soft);
  transition: var(--transition-bounce);
}

.logo-icon:hover {
  transform: scale(1.1) rotate(5deg);
  box-shadow: var(--shadow-strong);
}

.logo-text {
  font-size: 1.1rem;
  font-weight: var(--font-weight-bold);
  background: var(--primary-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-family: var(--font-family);
  letter-spacing: -0.02em;
}

.nav-menu {
  padding: 0.75rem 0;
  overflow-y: auto;
  flex: 1;
}

.nav-item {
  margin: 0.25rem 0.75rem;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  text-decoration: none;
  color: var(--text-medium);
  border-radius: 6px;
  transition: var(--transition-smooth);
  font-weight: var(--font-weight-medium);
  font-family: var(--font-family);
  font-size: 0.85rem;
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
  margin-top: 1rem;
}

.nav-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, var(--primary-color) 50%, transparent 100%);
  margin: 0.5rem 0.75rem;
  border-radius: 1px;
}

.nav-section-title {
  font-size: 0.65rem;
  font-weight: var(--font-weight-bold);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--primary-color);
  padding: 0.5rem 0.75rem 0.25rem 0.75rem;
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
    width: 180px;
  }

  .nav-link {
    font-size: 0.8rem;
    padding: 0.4rem 0.6rem;
  }
}

@media (max-width: 768px) {
  .sidebar {
    transform: translateX(-100%);
    width: 240px;
    box-shadow: var(--shadow-strong);
  }

  .sidebar.open {
    transform: translateX(0);
  }

  .sidebar-header {
    padding: 1rem 0.75rem;
  }

  .nav-menu {
    padding: 0.5rem 0;
  }

  .nav-item {
    margin: 0.25rem 0.5rem;
  }

  .nav-link {
    padding: 0.5rem 0.75rem;
    font-size: 0.9rem;
  }
}
</style>