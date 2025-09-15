<template>
  <div id="app">
    <!-- Show navigation only when authenticated and not on login page -->
    <div v-if="showNavigation" class="app-container">
      <!-- Sidebar Component -->
      <AppSidebar 
        :is-open="sidebarOpen"
        :current-page="currentPage"
        @navigate="setCurrentPage"
      />

      <!-- Main Content -->
      <main class="main-content" :class="{ 'expanded': !sidebarOpen }">
        <!-- Header Component -->
        <AppHeader 
          :page-title="pageTitle"
          :sidebar-open="sidebarOpen"
          @toggle-sidebar="toggleSidebar"
        />

        <!-- Router View for different pages -->
        <div class="content">
          <router-view />
        </div>
      </main>
    </div>

    <!-- Standalone router view for login and other auth pages -->
    <div v-else class="auth-container">
      <router-view />
    </div>
  </div>
</template>

<script>
import Sidebar from './components/Sidebar.vue'
import Header from './components/Header.vue'
import { useAuthStore } from './stores/auth'
import { globalTheme } from './composables/useTheme'

export default {
  name: 'App',
  components: {
    AppSidebar: Sidebar,
    AppHeader: Header
  },
  data() {
    return {
      currentPage: 'dashboard',
      sidebarOpen: true
    }
  },
  computed: {
    showNavigation() {
      // Hide navigation on login page or when not authenticated
      const isLoginPage = this.$route.name === 'Login'
      const authStore = useAuthStore()
      
      // Show navigation only when authenticated AND not on login page
      return !isLoginPage && authStore.isAuthenticated
    },
    pageTitle() {
      const titles = {
        dashboard: 'Dashboard',
        bookings: 'Booking Management',
        customers: 'Customer Management', 
        services: 'Service Catalog',
        staff: 'Staff Management',
        billing: 'Billing & Invoicing',
        reports: 'Reports & Analytics',
        settings: 'Settings',
        'super-admin': 'Super Admin Dashboard',
        'superadmindashboard': 'Super Admin Dashboard',
        organizations: 'Organizations Management',
        'usersadmin': 'User Administration',
        'users-admin': 'User Administration',
        'systemsettings': 'System Settings',
        'system-settings': 'System Settings',
        analytics: 'Platform Analytics',
        'auditlogs': 'Audit Logs',
        'audit-logs': 'Audit Logs',
        database: 'Database Management',
        inventory: 'Inventory Management',
        suppliers: 'Supplier Management',
        pos: 'Point of Sale',
        'pos-transactions': 'POS Transactions'
      }
      return titles[this.currentPage] || 'Dashboard'
    }
  },
  methods: {
    toggleSidebar() {
      this.sidebarOpen = !this.sidebarOpen
    },
    setCurrentPage(page) {
      this.currentPage = page
      // Handle service category routes that include "services/" prefix
      const routePath = page.startsWith('services/') ? `/${page}` : `/${page}`
      this.$router.push(routePath)
      if (window.innerWidth <= 768) {
        this.sidebarOpen = false
      }
    }
  },
  watch: {
    '$route'(to) {
      // Handle service category routes
      if (to.path.startsWith('/services/')) {
        const serviceCategoryMatch = to.path.match(/^\/services\/(.+)$/)
        if (serviceCategoryMatch) {
          this.currentPage = serviceCategoryMatch[1]
        } else {
          this.currentPage = 'services'
        }
      } else {
        const routeName = to.name?.toLowerCase() || 'dashboard'
        this.currentPage = routeName
      }
      console.log('🔍 Route changed to:', { path: to.path, currentPage: this.currentPage })
    }
  },
  async mounted() {
    console.log('App mounted successfully')
    
    // Initialize theme system
    const { initTheme } = globalTheme
    initTheme()
    
    // Initialize mock authentication
    const authStore = useAuthStore()
    await authStore.initializeAuth()
    
    // Set initial page based on current route
    if (this.$route.path.startsWith('/services/')) {
      const serviceCategoryMatch = this.$route.path.match(/^\/services\/(.+)$/)
      if (serviceCategoryMatch) {
        this.currentPage = serviceCategoryMatch[1]
      } else {
        this.currentPage = 'services'
      }
    } else {
      const routeName = this.$route.name?.toLowerCase() || 'dashboard'
      this.currentPage = routeName
    }

    // Handle root path redirects
    if (this.$route.path === '/') {
      this.$router.push('/dashboard')
    }

    const handleResize = () => {
      if (window.innerWidth <= 768) {
        this.sidebarOpen = false
      } else {
        this.sidebarOpen = true
      }
    }
    
    window.addEventListener('resize', handleResize)
    handleResize()
  }
}
</script>

<style scoped>
#app {
  height: 100vh;
  width: 100vw;
}

.app-container {
  display: flex;
  height: 100vh;
  width: 100vw;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: all 0.3s ease;
  margin-left: 200px;
}

.main-content.expanded {
  margin-left: 0;
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.auth-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>