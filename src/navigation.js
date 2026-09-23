/**
 * Single source of truth for the app navigation.
 * Groups are rendered as collapsible sections in the sidebar and power the
 * command palette (Ctrl/Cmd + K).
 */
export const navGroups = [
  {
    id: 'overview',
    label: 'Overview',
    icon: 'fa-solid fa-house',
    items: [
      { label: 'Dashboard', to: '/dashboard', icon: 'fa-solid fa-gauge-high' },
      { label: 'Analytics', to: '/reports-analytics', icon: 'fa-solid fa-chart-column' },
      { label: 'Reports', to: '/analytics', icon: 'fa-solid fa-chart-pie' }
    ]
  },
  {
    id: 'sales',
    label: 'Sales & Invoicing',
    icon: 'fa-solid fa-file-invoice-dollar',
    items: [
      { label: 'Invoicing overview', to: '/billing', icon: 'fa-solid fa-chart-line' },
      { label: 'Invoices', to: '/invoices', icon: 'fa-solid fa-file-invoice', match: /^\/invoices(?!\/settings)/ },
      { label: 'Quotes', to: '/quotes', icon: 'fa-solid fa-file-signature', match: /^\/quotes/ },
      { label: 'Point of sale', to: '/pos', icon: 'fa-solid fa-cash-register' },
      { label: 'POS transactions', to: '/pos-transactions', icon: 'fa-solid fa-receipt' },
      { label: 'E-commerce', to: '/ecommerce', icon: 'fa-solid fa-store' },
      { label: 'Invoice settings', to: '/invoices/settings', icon: 'fa-solid fa-sliders' }
    ]
  },
  {
    id: 'customers',
    label: 'Customers',
    icon: 'fa-solid fa-users',
    items: [
      { label: 'Customers', to: '/customers', icon: 'fa-solid fa-address-book' },
      { label: 'CRM pipeline', to: '/crm', icon: 'fa-solid fa-bullseye' }
    ]
  },
  {
    id: 'operations',
    label: 'Bookings & Services',
    icon: 'fa-solid fa-calendar-check',
    items: [
      { label: 'Bookings', to: '/bookings', icon: 'fa-solid fa-calendar-days' },
      { label: 'Scheduling', to: '/scheduling', icon: 'fa-solid fa-clock' },
      { label: 'Services', to: '/services', icon: 'fa-solid fa-bell-concierge', match: /^\/services$/ },
      { label: 'Service categories', to: '/services/categories', icon: 'fa-solid fa-layer-group', match: /^\/services\/.+/ },
      { label: 'Events', to: '/events', icon: 'fa-solid fa-ticket', match: /^\/events/ }
    ]
  },
  {
    id: 'inventory',
    label: 'Inventory & Supply',
    icon: 'fa-solid fa-boxes-stacked',
    items: [
      { label: 'Inventory', to: '/inventory', icon: 'fa-solid fa-box' },
      { label: 'Suppliers', to: '/suppliers', icon: 'fa-solid fa-truck' },
      { label: 'Production', to: '/production', icon: 'fa-solid fa-industry' }
    ]
  },
  {
    id: 'finance',
    label: 'Finance',
    icon: 'fa-solid fa-building-columns',
    items: [
      { label: 'Accounting', to: '/finance', icon: 'fa-solid fa-scale-balanced' },
      { label: 'Bills', to: '/bills', icon: 'fa-solid fa-money-bill-wave' },
      { label: 'Banking', to: '/banking', icon: 'fa-solid fa-building-columns' }
    ]
  },
  {
    id: 'people',
    label: 'People & Projects',
    icon: 'fa-solid fa-people-group',
    items: [
      { label: 'Staff', to: '/staff', icon: 'fa-solid fa-user-tie' },
      { label: 'HR & payroll', to: '/hcm', icon: 'fa-solid fa-id-card' },
      { label: 'Projects', to: '/projects', icon: 'fa-solid fa-diagram-project' },
      { label: 'Documents', to: '/documents', icon: 'fa-solid fa-folder-open' }
    ]
  },
  {
    id: 'communication',
    label: 'Communication',
    icon: 'fa-solid fa-comments',
    items: [
      { label: 'Messages', to: '/messages', icon: 'fa-solid fa-message' },
      { label: 'Communication hub', to: '/communication', icon: 'fa-solid fa-tower-broadcast' },
      { label: 'Video calls', to: '/video-call', icon: 'fa-solid fa-video' },
      { label: 'Messaging settings', to: '/messaging-settings', icon: 'fa-solid fa-gear' }
    ]
  },
  {
    id: 'admin',
    label: 'Administration',
    icon: 'fa-solid fa-gear',
    items: [
      { label: 'Settings', to: '/settings', icon: 'fa-solid fa-sliders' },
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
      { label: 'Platform overview', to: '/super-admin', icon: 'fa-solid fa-crown' },
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

export function visibleGroups(isSuperAdmin) {
  return navGroups.filter((g) => !g.superAdmin || isSuperAdmin)
}

export function findNav(path) {
  for (const g of navGroups) {
    for (const item of g.items) {
      if (isItemActive(item, path)) return { group: g, item }
    }
  }
  return null
}
