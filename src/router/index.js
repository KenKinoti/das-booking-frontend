import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useModulesStore } from '../stores/modules'
// import { usePermissionsStore } from '../stores/permissions' // unused import

// Lazy load components for better performance
const Login = () => import('../views/Login.vue')
const Dashboard = () => import('../views/Dashboard.vue')
const Staff = () => import('../views/Staff.vue')
const Billing = () => import('../views/Billing.vue')
const Reports = () => import('../views/Reports.vue')
const Settings = () => import('../views/Settings.vue')
const Profile = () => import('../views/Profile.vue')
const Bookings = () => import('../views/Bookings.vue')
const Customers = () => import('../views/Customers.vue')
const Services = () => import('../views/Services.vue')
const ServiceCategories = () => import('../views/services/ServiceCategories.vue')

// Super Admin Views
const SuperAdminDashboard = () => import('../views/SuperAdminDashboard.vue')
const Organizations = () => import('../views/SuperAdmin.vue')
const Database = () => import('../views/Database.vue')
const UsersAdmin = () => import('../views/UsersAdmin.vue')
const SystemSettings = () => import('../views/SystemSettings.vue')
const SuperAdminMenuManager = () => import('../views/SuperAdminMenuManager.vue')
const Analytics = () => import('../views/Analytics.vue')
const AuditLogs = () => import('../views/AuditLogs.vue')
const FAQ = () => import('../views/FAQ.vue')

// Events Module Views
const Events = () => import('../views/Events.vue')
const EventCreate = () => import('../views/EventCreate.vue')
const EventDetail = () => import('../views/EventDetail.vue')
const EventRegistrations = () => import('../views/EventRegistrations.vue')

// ERP & POS Views
const Inventory = () => import('../views/InventoryManagement.vue')
const Suppliers = () => import('../views/Suppliers.vue')
const POS = () => import('../views/POS.vue')
const ModuleManagement = () => import('../views/ModuleManagement.vue')

// New ERP Module Views
const Finance = () => import('../views/Finance.vue')
const Invoices = () => import('../views/Invoices.vue')
const Bills = () => import('../views/Bills.vue')
const Banking = () => import('../views/Banking.vue')
const CRM = () => import('../views/CRM.vue')
const Production = () => import('../views/Production.vue')
const Projects = () => import('../views/Projects.vue')
const HCM = () => import('../views/HCM.vue')
const Ecommerce = () => import('../views/Ecommerce.vue')

// Messaging Views
const Messages = () => import('../views/Messages.vue')
const MessagingSettings = () => import('../views/MessagingSettings.vue')

// Video Call Views
const VideoCall = () => import('../views/VideoCall.vue')

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    redirect: () => {
      // If user has a stored last route, redirect there
      const lastRoute = localStorage.getItem('lastRoute')
      return lastRoute || '/dashboard'
    }
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: Dashboard,
    meta: { requiresAuth: true }
  },
  {
    path: '/bookings',
    name: 'Bookings',
    component: Bookings,
    meta: { requiresAuth: true }
  },
  {
    path: '/customers',
    name: 'Customers',
    component: Customers,
    meta: { requiresAuth: true }
  },
  {
    path: '/services',
    name: 'Services',
    component: Services,
    meta: { requiresAuth: true }
  },
  {
    path: '/services/categories',
    name: 'ServiceCategories',
    component: ServiceCategories,
    meta: { requiresAuth: true }
  },
  {
    path: '/services/automotive-repair',
    name: 'AutomotiveRepair',
    component: () => import('../views/services/AutomotiveRepair.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/services/automotive-maintenance',
    name: 'AutomotiveMaintenance', 
    component: () => import('../views/services/AutomotiveMaintenance.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/services/hair-services',
    name: 'HairServices',
    component: () => import('../views/services/HairServices.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/services/beauty-spa',
    name: 'BeautySpa',
    component: () => import('../views/services/BeautySpa.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/services/nail-services',
    name: 'NailServices',
    component: () => import('../views/services/NailServices.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/services/diagnostic-services',
    name: 'DiagnosticServices',
    component: () => import('../views/services/DiagnosticServices.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/staff',
    name: 'Staff',
    component: Staff,
    meta: { requiresAuth: true }
  },
  {
    path: '/billing',
    name: 'Billing',
    component: Billing,
    meta: { requiresAuth: true }
  },
  {
    path: '/reports',
    name: 'Reports',
    component: Reports,
    meta: { requiresAuth: true }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: Settings,
    meta: { requiresAuth: true }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: Profile,
    meta: { requiresAuth: true }
  },
  // Super Admin Routes
  {
    path: '/super-admin',
    name: 'SuperAdminDashboard',
    component: SuperAdminDashboard,
    meta: { requiresAuth: true, requiresSuperAdmin: true }
  },
  {
    path: '/organizations',
    name: 'Organizations',
    component: Organizations,
    meta: { requiresAuth: true, requiresSuperAdmin: true }
  },
  {
    path: '/database',
    name: 'Database',
    component: Database,
    meta: { requiresAuth: true, requiresSuperAdmin: true }
  },
  {
    path: '/users-admin',
    name: 'UsersAdmin',
    component: UsersAdmin,
    meta: { requiresAuth: true, requiresSuperAdmin: true }
  },
  {
    path: '/system-settings',
    name: 'SystemSettings',
    component: SystemSettings,
    meta: { requiresAuth: true, requiresSuperAdmin: true }
  },
  {
    path: '/menu-manager',
    name: 'SuperAdminMenuManager',
    component: SuperAdminMenuManager,
    meta: { requiresAuth: true, requiresSuperAdmin: true }
  },
  {
    path: '/analytics',
    name: 'Analytics',
    component: Analytics,
    meta: { requiresAuth: true, requiresSuperAdmin: true }
  },
  {
    path: '/audit-logs',
    name: 'AuditLogs',
    component: AuditLogs,
    meta: { requiresAuth: true, requiresSuperAdmin: true }
  },
  // ERP Module Routes
  {
    path: '/finance',
    name: 'Finance',
    component: Finance,
    meta: { requiresAuth: true }
  },
  {
    path: '/invoices',
    name: 'Invoices',
    component: Invoices,
    meta: { requiresAuth: true }
  },
  {
    path: '/bills',
    name: 'Bills',
    component: Bills,
    meta: { requiresAuth: true }
  },
  {
    path: '/banking',
    name: 'Banking',
    component: Banking,
    meta: { requiresAuth: true }
  },
  {
    path: '/crm',
    name: 'CRM',
    component: CRM,
    meta: { requiresAuth: true }
  },
  {
    path: '/inventory',
    name: 'Inventory',
    component: Inventory,
    meta: { requiresAuth: true }
  },
  {
    path: '/suppliers',
    name: 'Suppliers',
    component: Suppliers,
    meta: { requiresAuth: true }
  },
  {
    path: '/production',
    name: 'Production',
    component: Production,
    meta: { requiresAuth: true }
  },
  {
    path: '/projects',
    name: 'Projects',
    component: Projects,
    meta: { requiresAuth: true }
  },
  {
    path: '/hcm',
    name: 'HCM',
    component: HCM,
    meta: { requiresAuth: true }
  },
  {
    path: '/pos',
    name: 'POS',
    component: POS,
    meta: { requiresAuth: true }
  },
  {
    path: '/pos-transactions',
    name: 'POSTransactions',
    component: () => import('../views/POSTransactions.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/ecommerce',
    name: 'Ecommerce',
    component: Ecommerce,
    meta: { requiresAuth: true }
  },
  {
    path: '/messages',
    name: 'Messages',
    component: Messages,
    meta: { requiresAuth: true }
  },
  {
    path: '/messaging-settings',
    name: 'MessagingSettings',
    component: MessagingSettings,
    meta: { requiresAuth: true }
  },
  {
    path: '/video-call',
    name: 'VideoCall',
    component: VideoCall,
    meta: { requiresAuth: true }
  },
  {
    path: '/module-management',
    name: 'ModuleManagement',
    component: ModuleManagement,
    meta: { requiresAuth: true, requiresSuperAdmin: true }
  },
  {
    path: '/faq',
    name: 'FAQ',
    component: FAQ,
    meta: { requiresAuth: true }
  },
  // Events Module Routes
  {
    path: '/events',
    name: 'Events',
    component: Events,
    meta: { requiresAuth: true }
  },
  {
    path: '/events/create',
    name: 'EventCreate',
    component: EventCreate,
    meta: { requiresAuth: true }
  },
  {
    path: '/events/:id',
    name: 'EventDetail',
    component: EventDetail,
    meta: { requiresAuth: true }
  },
  {
    path: '/events/:id/edit',
    name: 'EventEdit',
    component: EventCreate,
    meta: { requiresAuth: true }
  },
  {
    path: '/events/:eventId/registrations',
    name: 'EventRegistrations',
    component: EventRegistrations,
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Enhanced auth guard with role-based permissions
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  const modulesStore = useModulesStore()

  console.log('🛡️ ROUTER DEBUG: Guard triggered', {
    from: from.path,
    to: to.path,
    timestamp: new Date().toISOString()
  })

  // For protected routes, ensure we initialize auth properly
  if (to.meta.requiresAuth !== false) {
    // Save current route for refresh persistence BEFORE any redirects
    if (to.name && to.name !== 'Login' && to.path !== '/') {
      localStorage.setItem('lastRoute', to.path)
      localStorage.setItem('lastRouteName', to.name)
    }

    // Always try to initialize auth state from localStorage first
    if (!authStore.token) {
      // Check if we have stored auth data
      const storedToken = localStorage.getItem('auth_token')
      const storedUser = localStorage.getItem('current_user')

      if (storedToken && storedUser) {
        console.log('🔄 Restoring auth state from localStorage...')
        try {
          authStore.token = storedToken
          authStore.user = JSON.parse(storedUser)
        } catch (error) {
          console.error('Error parsing stored auth data:', error)
          localStorage.removeItem('auth_token')
          localStorage.removeItem('current_user')
          next('/login')
          return
        }
      } else {
        console.log('No stored auth data, redirecting to login')
        next('/login')
        return
      }
    }

    // If we have token but no user, initialize auth
    if (authStore.token && !authStore.user) {
      console.log('Token exists but no user data, initializing...')
      const isInitialized = await authStore.initializeAuth()

      if (!isInitialized) {
        console.log('Auth initialization failed, redirecting to login')
        next('/login')
        return
      }
    }

    // Final validation - must have both token and user
    if (!authStore.token || !authStore.user) {
      console.log('Authentication incomplete, redirecting to login')
      next('/login')
      return
    }

    // Check for super admin requirement
    if (to.meta.requiresSuperAdmin && !authStore.isSuperAdmin) {
      console.log('Super admin required, redirecting to dashboard')
      next('/dashboard')
      return
    }

    // Check for module requirements
    if (to.meta.requiresModule) {
      // Initialize modules if not already done
      if (!modulesStore.initialized) {
        await modulesStore.fetchModules()
      }

      // Check if the required module is enabled
      if (!modulesStore.hasModule(to.meta.requiresModule)) {
        console.log(`Module ${to.meta.requiresModule} not enabled, redirecting to dashboard`)
        next('/dashboard')
        return
      }
    }

    console.log('✅ Auth guard passed, proceeding to:', to.path)
    next()
    return
  }
  
  // If going to login page
  if (to.name === 'Login') {
    // If already authenticated, redirect away from login
    if (authStore.token && authStore.user) {
      const lastRoute = localStorage.getItem('lastRoute') || '/dashboard'
      console.log('Already authenticated, redirecting to:', lastRoute)
      next(lastRoute)
      return
    }
  }
  
  next()
})

export default router
