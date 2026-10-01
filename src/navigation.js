/**
 * Module keys (item.module) are the entitlement units used by subscription
 * plans: core, smallbiz, invoicing, pos, ecommerce, crm, bookings, events,
 * inventory, manufacturing, accounting, hr, projects, documents, communication.
 * Items without a module are always available.
 *
 * Business types (see useAccess): `t(terms)` builds the label from the
 * organisation's words (Bookings → Job cards), `perm` names the role
 * permission that shows the item (defaults to its module; `act` is the action
 * needed, default view — management pages need create), `feature` limits
 * it to types offering that feature and `minBase` to a role level.
 *
 * Single source of truth for the app navigation.
 * Groups are rendered as collapsible sections in the sidebar and power the
 * command palette (Ctrl/Cmd + K).
 */
import { hasModule } from '@/composables/useEntitlements'
import { access, can, pathHidden, hasFeature, atLeast } from '@/composables/useAccess'

export const navGroups = [
  {
    id: 'overview',
    label: 'Overview',
    icon: 'fa-solid fa-house',
    items: [
      { label: 'Dashboard', to: '/dashboard', module: 'core', icon: 'fa-solid fa-gauge-high' },
      { label: 'Insights', to: '/insights', module: 'core', icon: 'fa-solid fa-lightbulb', minBase: 'manager', match: /^\/insights/ },
      { label: 'Ask DASYIN', to: '/assistant', module: 'core', icon: 'fa-solid fa-wand-magic-sparkles' },
      { label: 'Analytics', to: '/reports-analytics', module: 'core', icon: 'fa-solid fa-chart-column' },
      // Reports opens the Profit & loss statement (the old /analytics page was
      // a duplicate of Analytics). It is highlighted under Finance instead.
      { label: 'Reports', to: '/reports', module: 'core', icon: 'fa-solid fa-chart-pie', match: /^\/reports\/?$/ }
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
    t: (T) => T.customers,
    icon: 'fa-solid fa-users',
    items: [
      { label: 'Customers', t: (T) => T.customers, to: '/customers', module: 'crm', icon: 'fa-solid fa-address-book' },
      { label: 'CRM pipeline', to: '/crm', module: 'crm', icon: 'fa-solid fa-bullseye' }
    ]
  },
  {
    id: 'operations',
    label: 'Bookings & Services',
    t: (T) => T.operations || `${T.bookings} & ${T.services}`,
    icon: 'fa-solid fa-calendar-check',
    items: [
      { label: 'Bookings', t: (T) => T.bookings, to: '/bookings', module: 'bookings', icon: 'fa-solid fa-calendar-days' },
      { label: 'Vehicles', to: '/vehicles', module: 'bookings', act: 'create', feature: 'vehicles', icon: 'fa-solid fa-car-side' },
      { label: 'Scheduling', to: '/scheduling', module: 'bookings', act: 'create', icon: 'fa-solid fa-clock' },
      { label: 'Services', t: (T) => T.services, to: '/services', module: 'bookings', act: 'create', icon: 'fa-solid fa-bell-concierge', match: /^\/services$/ },
      { label: 'Service categories', t: (T) => `${T.service} categories`, to: '/services/categories', module: 'bookings', act: 'create', icon: 'fa-solid fa-layer-group', match: /^\/services\/.+/ },
      { label: 'Events', t: (T) => T.events, to: '/events', module: 'events', icon: 'fa-solid fa-ticket', match: /^\/events/ }
    ]
  },
  {
    id: 'inventory',
    label: 'Inventory & Supply',
    icon: 'fa-solid fa-boxes-stacked',
    items: [
      { label: 'Inventory', t: (T) => T.inventory, to: '/inventory', module: 'inventory', icon: 'fa-solid fa-box' },
      { label: 'Suppliers', to: '/suppliers', module: 'inventory', act: 'create', icon: 'fa-solid fa-truck' },
      { label: 'Production', to: '/production', module: 'manufacturing', icon: 'fa-solid fa-industry' }
    ]
  },
  {
    id: 'finance',
    label: 'Finance',
    icon: 'fa-solid fa-building-columns',
    items: [
      { label: 'Profit & loss', to: '/reports/profit-loss', module: 'core', icon: 'fa-solid fa-chart-line', match: /^\/reports\/profit-loss/ },
      { label: 'Accounting', to: '/finance', module: 'accounting', icon: 'fa-solid fa-scale-balanced' },
      { label: 'Bills', to: '/bills', module: 'accounting', icon: 'fa-solid fa-money-bill-wave' },
      { label: 'Expenses', to: '/expenses', module: 'core', icon: 'fa-solid fa-receipt' },
      { label: 'Banking', to: '/banking', module: 'accounting', icon: 'fa-solid fa-building-columns' }
    ]
  },
  {
    id: 'people',
    label: 'People & Projects',
    icon: 'fa-solid fa-people-group',
    items: [
      { label: 'Staff', t: (T) => T.staff, to: '/staff', module: 'core', perm: 'team', icon: 'fa-solid fa-user-tie' },
      { label: 'HR & payroll', to: '/hcm', module: 'hr', icon: 'fa-solid fa-id-card' },
      { label: 'Projects', t: (T) => T.projects, to: '/projects', module: 'projects', icon: 'fa-solid fa-diagram-project' },
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
      { label: 'Plan & billing', to: '/plan', icon: 'fa-solid fa-gem', minBase: 'admin' },
      { label: 'AI & MCP', to: '/settings/ai', icon: 'fa-solid fa-robot' },
      { label: 'Expense sources', to: '/settings/expense-sources', icon: 'fa-solid fa-plug', minBase: 'admin' },
      { label: 'Import data', to: '/imports', icon: 'fa-solid fa-file-import', match: /^\/imports/, minBase: 'admin' },
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
      { label: 'Business types', to: '/super-admin/business-types', icon: 'fa-solid fa-shapes' },
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

/** The label of a nav item or group in the organisation's words. */
export function navLabel(x) {
  if (x && typeof x.t === 'function') {
    try {
      return x.t(access.terms) || x.label
    } catch {
      return x.label
    }
  }
  return x?.label || ''
}

/**
 * Can the current user see this nav item? Plan ∩ business type (hasModule),
 * then the role (view permission), then type-hidden entries, features and
 * role level. Super admins see everything.
 */
export function itemVisible(item, isSuperAdmin) {
  if (isSuperAdmin) return true
  if (!hasModule(item.module)) return false
  const perm = item.perm || item.module
  if (perm && !can(perm, item.act || 'view')) return false
  if (pathHidden(item.to)) return false
  if (item.feature && !hasFeature(item.feature)) return false
  if (item.minBase && !atLeast(item.minBase)) return false
  return true
}

/**
 * Groups the current user may see, with labels in the organisation's words.
 * Items whose module is not in the plan or hidden for the business type,
 * or that the user's role cannot view, are dropped; empty groups too.
 */
export function visibleGroups(isSuperAdmin) {
  void access.terms
  return navGroups
    .filter((g) => !g.superAdmin || isSuperAdmin)
    .map((g) => ({
      ...g,
      label: navLabel(g),
      items: g.items.filter((i) => itemVisible(i, isSuperAdmin)).map((i) => ({ ...i, label: navLabel(i) }))
    }))
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
