import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useModulesStore } from '../stores/modules'
import { ensureEntitlements, hasModule } from '../composables/useEntitlements'
import { moduleForPath } from '../navigation'
// import { usePermissionsStore } from '../stores/permissions' // unused import

// Lazy load components for better performance
const Login = () => import('../views/Login.vue')
const Dashboard = () => import('../views/Dashboard.vue')

// Main Pages
const Staff = () => import('../views/Staff.vue')
// const Reports = () => import('../views/Reports.vue') // Unused - redirects to analytics
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
const UnifiedAnalytics = () => import('../views/UnifiedAnalytics.vue')
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
const Communication = () => import('../views/Communication.vue')

// Plans & billing
const PlanBilling = () => import('../views/plans/PlanBilling.vue')
const SuperAdminPlans = () => import('../views/plans/SuperAdminPlans.vue')
const Documents = () => import('../views/Documents.vue')
const Scheduling = () => import('../views/Scheduling.vue')

// Invoicing
const InvoicingOverview = () => import('../views/invoicing/InvoicingOverview.vue')
const InvoiceList = () => import('../views/invoicing/InvoiceList.vue')
const InvoiceEditor = () => import('../views/invoicing/InvoiceEditor.vue')
const InvoiceDetail = () => import('../views/invoicing/InvoiceDetail.vue')
const InvoiceSettings = () => import('../views/invoicing/InvoiceSettings.vue')
const PublicInvoice = () => import('../views/invoicing/PublicInvoice.vue')
const NotFound = () => import('../views/NotFound.vue')
const BusinessHub = () => import('../views/smallbiz/BusinessHub.vue')
const Meetings = () => import('../views/meetings/Meetings.vue')
const MeetingRoom = () => import('../views/meetings/MeetingRoom.vue')

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
    component: InvoicingOverview,
    meta: { requiresAuth: true }
  },
  {
    path: '/reports',
    name: 'Reports',
    redirect: '/analytics',
    meta: { requiresAuth: true }
  },
  {
    path: '/reports-analytics',
    name: 'UnifiedAnalytics',
    component: UnifiedAnalytics,
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
    meta: { requiresAuth: true }
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
    component: InvoiceList,
    props: { docType: 'invoice' },
    meta: { requiresAuth: true }
  },
  {
    path: '/invoices/new',
    name: 'InvoiceNew',
    component: InvoiceEditor,
    props: { docType: 'invoice' },
    meta: { requiresAuth: true, title: 'New invoice' }
  },
  {
    path: '/invoices/settings',
    name: 'InvoiceSettings',
    component: InvoiceSettings,
    meta: { requiresAuth: true, title: 'Invoice settings' }
  },
  {
    path: '/invoices/:id',
    name: 'InvoiceDetail',
    component: InvoiceDetail,
    props: true,
    meta: { requiresAuth: true, title: 'Invoice' }
  },
  {
    path: '/invoices/:id/edit',
    name: 'InvoiceEdit',
    component: InvoiceEditor,
    props: (route) => ({ id: route.params.id, docType: 'invoice' }),
    meta: { requiresAuth: true, title: 'Edit invoice' }
  },
  {
    path: '/quotes',
    name: 'Quotes',
    component: InvoiceList,
    props: { docType: 'quote' },
    meta: { requiresAuth: true, title: 'Quotes' }
  },
  {
    path: '/quotes/new',
    name: 'QuoteNew',
    component: InvoiceEditor,
    props: { docType: 'quote' },
    meta: { requiresAuth: true, title: 'New quote' }
  },
  {
    path: '/quotes/:id',
    name: 'QuoteDetail',
    component: InvoiceDetail,
    props: true,
    meta: { requiresAuth: true, title: 'Quote' }
  },
  {
    path: '/quotes/:id/edit',
    name: 'QuoteEdit',
    component: InvoiceEditor,
    props: (route) => ({ id: route.params.id, docType: 'quote' }),
    meta: { requiresAuth: true, title: 'Edit quote' }
  },
  {
    path: '/i/:token',
    name: 'PublicInvoice',
    component: PublicInvoice,
    props: true,
    meta: { requiresAuth: false, public: true, title: 'Invoice' }
  },
  {
    path: '/business',
    name: 'BusinessHub',
    component: BusinessHub,
    meta: { requiresAuth: true, title: 'Business hub' }
  },
  {
    path: '/meetings',
    name: 'Meetings',
    component: Meetings,
    meta: { requiresAuth: true, title: 'Meetings' }
  },
  {
    path: '/meetings/:id',
    name: 'MeetingRoom',
    component: MeetingRoom,
    props: true,
    meta: { requiresAuth: true, title: 'Meeting' }
  },
  {
    path: '/documents',
    name: 'Documents',
    component: Documents,
    meta: { requiresAuth: true }
  },
  {
    path: '/scheduling',
    name: 'Scheduling',
    component: Scheduling,
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
    path: '/communication',
    name: 'Communication',
    component: Communication,
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

routes.push(
  { path: '/plan', name: 'PlanBilling', component: PlanBilling, meta: { requiresAuth: true, title: 'Plan & billing' } },
  { path: '/super-admin/plans', name: 'SuperAdminPlans', component: SuperAdminPlans, meta: { requiresAuth: true, requiresSuperAdmin: true, title: 'Plans & pricing' } }
)

routes.push({ path: '/:pathMatch(.*)*', name: 'NotFound', component: NotFound, meta: { requiresAuth: false, title: 'Page not found' } })

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, saved) {
    return saved || { top: 0 }
  }
})

// Auth guard
router.beforeEach(async (to) => {
  const authStore = useAuthStore()

  if (to.meta.public) return true

  if (to.meta.requiresAuth !== false) {
    if (!authStore.isAuthenticated) {
      const ok = await authStore.initializeAuth()
      if (!ok) {
        return { path: '/login', query: to.fullPath !== '/' && to.fullPath !== '/dashboard' ? { redirect: to.fullPath } : {} }
      }
    }

    if (to.meta.requiresSuperAdmin && !authStore.isSuperAdmin) {
      return '/dashboard'
    }

    if (to.meta.requiresModule) {
      const modulesStore = useModulesStore()
      if (!modulesStore.initialized) await modulesStore.fetchModules()
      if (!modulesStore.hasModule(to.meta.requiresModule)) return '/dashboard'
    }

    // Subscription plan: modules outside the plan go to the upgrade page
    if (!authStore.isSuperAdmin) {
      const mod = moduleForPath(to.path)
      if (mod) {
        await ensureEntitlements()
        if (!hasModule(mod)) return { path: '/plan', query: { module: mod, from: to.fullPath } }
      } else {
        ensureEntitlements()
      }
    }

    if (to.name && to.name !== 'Login') {
      localStorage.setItem('lastRoute', to.fullPath)
    }
    return true
  }

  if (to.name === 'Login') {
    if (!authStore.isAuthenticated) await authStore.initializeAuth()
    if (authStore.isAuthenticated) {
      return to.query.redirect || localStorage.getItem('lastRoute') || '/dashboard'
    }
  }
  return true
})

router.afterEach((to) => {
  const base = import.meta.env.VITE_APP_TITLE || 'DASYIN ERP'
  const title = to.meta.title || (typeof to.name === 'string' ? to.name.replace(/([a-z])([A-Z])/g, '$1 $2') : '')
  document.title = title ? `${title} · ${base}` : base
})

export default router
