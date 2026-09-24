/**
 * Module keys (item.module) are the entitlement units used by subscription
 * plans: core, smallbiz, invoicing, pos, ecommerce, crm, bookings, events,
 * inventory, manufacturing, accounting, hr, projects, documents, communication.
 * Items without a module are always available.
 *
 * Single source of truth for the app navigation.
 * Groups are rendered as collapsible sections in the sidebar and power the
 * command palette (Ctrl/Cmd + K).
 */
import { hasModule } from '@/composables/useEntitlements'

export const navGroups = [
  {
    id: 'overview',
    label: 'Overview',
    icon: 'fa-solid fa-house',
    items: [
      { label: 'Dashboard', to: '/dashboard', module: 'core', icon: 'fa-solid fa-gauge-high' },
      { label: 'Ask DASYIN', to: '/assistant', module: 'core', icon: 'fa-solid fa-wand-magic-sparkles' },
      { label: 'Analytics', to: '/reports-analytics', module: 'core', icon: 'fa-solid fa-chart-column' },
      { label: 'Reports', to: '/analytics', module: 'core', icon: 'fa-solid fa-chart-pie' }
    ]
  },
  {
    id: 'smallbiz',
    label: 'Small business',
    icon: 'fa-solid fa-store',
    items: [
      { label: 'Business hub', to: '/business', module: 'smallbiz', icon: 'fa-solid fa-briefcase', match: /^\/business/ }
    ]
  },
  {
    id: 'sales',
    label: 'Sales & Invoicing',
    icon: 'fa-solid fa-file-invoice-dollar',
    items: [
      { label: 'Invoicing overview', to: '/billing', module: 'invoicing', icon: 'fa-solid fa-chart-line' },
      { label: 'Invoices', to: '/invoices', module: 'invoicing', icon: 'fa-solid fa-file-invoice', match: /^\/invoices(?!\/settings)/ },
      { label: 'Quotes', to: '/quotes', module: 'invoicing', icon: 'fa-solid fa-file-signature', match: /^\/quotes/ },
      { label: 'Point of sale', to: '/pos', module: 'pos', icon: 'fa-solid fa-cash-register' },
      { label: 'POS transactions', to: '/pos-transactions', module: 'pos', icon: 'fa-solid fa-receipt' },
      { label: 'E-commerce', to: '/ecommerce', module: 'ecommerce', icon: 'fa-solid fa-store' },
      { label: 'Invoice settings', to: '/invoices/settings', module: 'invoicing', icon: 'fa-solid fa-sliders' }
    ]
  },
  {
    id: 'customers',
    label: 'Customers',
    icon: 'fa-solid fa-users',
    items: [
      { label: 'Customers', to: '/customers', module: 'crm', icon: 'fa-solid fa-address-book' },
      { label: 'CRM pipeline', to: '/crm', module: 'crm', icon: 'fa-solid fa-bullseye' }
    ]
  },
  {
    id: 'operations',
    label: 'Bookings & Services',
    icon: 'fa-solid fa-calendar-check',
    items: [
      { label: 'Bookings', to: '/bookings', module: 'bookings', icon: 'fa-solid fa-calendar-days' },
      { label: 'Scheduling', to: '/scheduling', module: 'bookings', icon: 'fa-solid fa-clock' },
      { label: 'Services', to: '/services', module: 'bookings', icon: 'fa-solid fa-bell-concierge', match: /^\/services$/ },
      { label: 'Service categories', to: '/services/categories', module: 'bookings', icon: 'fa-solid fa-layer-group', match: /^\/services\/.+/ },
      { label: 'Events', to: '/events', module: 'events', icon: 'fa-solid fa-ticket', match: /^\/events/ }
    ]
  },
  {
    id: 'inventory',
    label: 'Inventory & Supply',
    icon: 'fa-solid fa-boxes-stacked',
    items: [
      { label: 'Inventory', to: '/inventory', module: 'inventory', icon: 'fa-solid fa-box' },
      { label: 'Suppliers', to: '/suppliers', module: 'inventory', icon: 'fa-solid fa-truck' },
      { label: 'Production', to: '/production', module: 'manufacturing', icon: 'fa-solid fa-industry' }
    ]
  },
  {
    id: 'finance',
    label: 'Finance',
    icon: 'fa-solid fa-building-columns',
    items: [
      { label: 'Accounting', to: '/finance', module: 'accounting', icon: 'fa-solid fa-scale-balanced' },
      { label: 'Bills', to: '/bills', module: 'accounting', icon: 'fa-solid fa-money-bill-wave' },
      { label: 'Banking', to: '/banking', module: 'accounting', icon: 'fa-solid fa-building-columns' }
    ]
  },
  {
    id: 'people',
    label: 'People & Projects',
    icon: 'fa-solid fa-people-group',
    items: [
      { label: 'Staff', to: '/staff', module: 'hr', icon: 'fa-solid fa-user-tie' },
      { label: 'HR & payroll', to: '/hcm', module: 'hr', icon: 'fa-solid fa-id-card' },
      { label: 'Projects', to: '/projects', module: 'projects', icon: 'fa-solid fa-diagram-project' },
      { label: 'Documents', to: '/documents', module: 'documents', icon: 'fa-solid fa-folder-open' }
    ]
  },
  {
    id: 'communication',
    label: 'Communication',
    icon: 'fa-solid fa-comments',
    items: [
      { label: 'Meetings & calls', to: '/meetings', module: 'communication', icon: 'fa-solid fa-calendar-plus', match: /^\/meetings/ },
      { label: 'Messages', to: '/messages', module: 'communication', icon: 'fa-solid fa-message' },
      { label: 'Communication hub', to: '/communication', module: 'communication', icon: 'fa-solid fa-tower-broadcast' },
      { label: 'Video calls', to: '/video-call', module: 'communication', icon: 'fa-solid fa-video' },
      { label: 'Messaging settings', to: '/messaging-settings', module: 'communication', icon: 'fa-solid fa-gear' }
    ]
  },
  {
    id: 'admin',
    label: 'Administration',
    icon: 'fa-solid fa-gear',
    items: [
      { label: 'Settings', to: '/settings', icon: 'fa-solid fa-sliders', match: /^\/settings\/?$/ },
      { label: 'Plan & billing', to: '/plan', icon: 'fa-solid fa-gem' },
      { label: 'AI & MCP', to: '/settings/ai', icon: 'fa-solid fa-robot' },
      { label: 'My profile', to: '/profile', icon: 'fa-solid fa-user' },
      { label: 'Help & FAQ', to: '/faq', icon: 'fa-solid fa-circle-question' }
    ]
  },
  {
    id: 'platform',
    label: 'Platform admin',
    icon: 'fa-solid fa-crown',
    superAdmin: true,
    items: [
      { label: 'Platform overview', to: '/super-admin', icon: 'fa-solid fa-crown', match: /^\/super-admin$/ },
      { label: 'Plans & pricing', to: '/super-admin/plans', icon: 'fa-solid fa-tags' },
      { label: 'Organizations', to: '/organizations', icon: 'fa-solid fa-building' },
      { label: 'Users', to: '/users-admin', icon: 'fa-solid fa-users-gear' },
      { label: 'Modules', to: '/module-management', icon: 'fa-solid fa-puzzle-piece' },
      { label: 'Menu manager', to: '/menu-manager', icon: 'fa-solid fa-bars-staggered' },
      { label: 'System settings', to: '/system-settings', icon: 'fa-solid fa-server' },
      { label: 'Audit logs', to: '/audit-logs', icon: 'fa-solid fa-clock-rotate-left' },
      { label: 'Database', to: '/database', icon: 'fa-solid fa-database' }
    ]
  }
]

export function isItemActive(item, path) {
  if (item.match) return item.match.test(path)
  return path === item.to || path.startsWith(item.to + '/')
}

/**
 * Groups the current user may see. Items whose module is not in the
 * organisation's plan are hidden (super admins see everything); groups left
 * empty are dropped.
 */
export function visibleGroups(isSuperAdmin) {
  return navGroups
    .filter((g) => !g.superAdmin || isSuperAdmin)
    .map((g) => (isSuperAdmin ? g : { ...g, items: g.items.filter((i) => hasModule(i.module)) }))
    .filter((g) => g.items.length)
}

/** The entitlement module that guards a route path (null when unguarded). */
export function moduleForPath(path) {
  const nav = findNav(path)
  const mod = nav?.item.module
  return mod && mod !== 'core' ? mod : null
}

export function findNav(path) {
  for (const g of navGroups) {
    for (const item of g.items) {
      if (isItemActive(item, path)) return { group: g, item }
    }
  }
  return null
}
