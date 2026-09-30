/**
 * One source of truth for entity status chips (label, colour tone, icon and
 * tooltip) used by <StatusBadge>. Keys are the raw API values.
 *
 *   import { statusInfo, STATUS_DOMAINS } from '@/utils/statuses'
 *   statusInfo('booking', 'no_show') → { label: 'No-show', tone: 'danger', icon, hint }
 *
 * Tones: neutral | info | accent | success | warning | danger | muted
 * (muted = finished/void, rendered struck-through when `strike` is set).
 */

const S = (label, tone, icon, hint, extra = {}) => ({ label, tone, icon, hint, ...extra })

const INVOICE = {
  draft: S('Draft', 'neutral', 'fa-regular fa-file-lines', 'Not sent yet — only your team can see it'),
  sent: S('Sent', 'info', 'fa-regular fa-paper-plane', 'Sent to the client, awaiting payment'),
  viewed: S('Viewed', 'accent', 'fa-regular fa-eye', 'The client has opened it'),
  partial: S('Part paid', 'warning', 'fa-solid fa-circle-half-stroke', 'Some of the balance has been paid'),
  paid: S('Paid', 'success', 'fa-solid fa-circle-check', 'Paid in full'),
  overdue: S('Overdue', 'danger', 'fa-solid fa-clock', 'Past the due date with a balance owing'),
  void: S('Void', 'muted', 'fa-solid fa-ban', 'Cancelled — kept for the record', { strike: true }),
  voided: S('Void', 'muted', 'fa-solid fa-ban', 'Cancelled — kept for the record', { strike: true }),
  unpaid: S('Unpaid', 'info', 'fa-regular fa-hourglass-half', 'Awaiting payment'),
  refunded: S('Refunded', 'muted', 'fa-solid fa-rotate-left', 'Money returned to the client')
}

const QUOTE = {
  draft: INVOICE.draft,
  sent: S('Sent', 'info', 'fa-regular fa-paper-plane', 'Sent to the client, awaiting a decision'),
  viewed: INVOICE.viewed,
  accepted: S('Accepted', 'success', 'fa-solid fa-thumbs-up', 'The client accepted the quote'),
  declined: S('Declined', 'danger', 'fa-solid fa-thumbs-down', 'The client declined the quote'),
  expired: S('Expired', 'muted', 'fa-regular fa-calendar-xmark', 'Past its expiry date', { strike: true }),
  converted: S('Converted', 'accent', 'fa-solid fa-arrow-right-arrow-left', 'Turned into an invoice'),
  void: INVOICE.void
}

const BOOKING = {
  scheduled: S('Scheduled', 'info', 'fa-regular fa-calendar', 'Booked, not yet confirmed'),
  confirmed: S('Confirmed', 'accent', 'fa-solid fa-circle-check', 'Confirmed with the customer'),
  in_progress: S('In progress', 'warning', 'fa-solid fa-spinner', 'Happening now'),
  completed: S('Completed', 'success', 'fa-solid fa-flag-checkered', 'Done'),
  cancelled: S('Cancelled', 'muted', 'fa-solid fa-ban', 'Cancelled — the slot is free again', { strike: true }),
  no_show: S('No-show', 'danger', 'fa-solid fa-user-slash', 'The customer did not turn up')
}

const POS = {
  completed: S('Completed', 'success', 'fa-solid fa-circle-check', 'Sale completed and paid'),
  paid: S('Paid', 'success', 'fa-solid fa-circle-check', 'Sale completed and paid'),
  refunded: S('Refunded', 'danger', 'fa-solid fa-rotate-left', 'Fully refunded — stock returned'),
  partially_refunded: S('Part refunded', 'warning', 'fa-solid fa-rotate-left', 'Some items were refunded'),
  voided: S('Voided', 'muted', 'fa-solid fa-ban', 'Voided — stock returned', { strike: true }),
  void: S('Voided', 'muted', 'fa-solid fa-ban', 'Voided — stock returned', { strike: true }),
  parked: S('Parked', 'info', 'fa-solid fa-square-parking', 'Saved to finish later'),
  pending: S('Pending', 'warning', 'fa-regular fa-hourglass-half', 'Awaiting payment')
}

const PO = {
  draft: S('Draft', 'neutral', 'fa-regular fa-file-lines', 'Not sent to the supplier yet'),
  sent: S('Ordered', 'info', 'fa-solid fa-truck-fast', 'Sent to the supplier'),
  ordered: S('Ordered', 'info', 'fa-solid fa-truck-fast', 'Sent to the supplier'),
  confirmed: S('Ordered', 'info', 'fa-solid fa-truck-fast', 'Confirmed by the supplier'),
  partially_received: S('Part received', 'warning', 'fa-solid fa-boxes-packing', 'Some items have arrived'),
  received: S('Received', 'success', 'fa-solid fa-box-open', 'Everything has arrived and is in stock'),
  cancelled: S('Cancelled', 'muted', 'fa-solid fa-ban', 'Order cancelled', { strike: true })
}

const BILL = {
  draft: S('Draft', 'neutral', 'fa-regular fa-file-lines', 'Not approved yet'),
  unpaid: S('Awaiting payment', 'info', 'fa-regular fa-hourglass-half', 'Approved, not paid yet'),
  due_soon: S('Due soon', 'warning', 'fa-regular fa-bell', 'Due within the next 7 days'),
  partial: S('Part paid', 'warning', 'fa-solid fa-circle-half-stroke', 'Some of it has been paid'),
  paid: S('Paid', 'success', 'fa-solid fa-circle-check', 'Paid in full'),
  overdue: S('Overdue', 'danger', 'fa-solid fa-clock', 'Past the due date'),
  void: INVOICE.void
}

const LEAVE = {
  pending: S('Pending', 'warning', 'fa-regular fa-hourglass-half', 'Waiting for a manager to decide'),
  approved: S('Approved', 'success', 'fa-solid fa-circle-check', 'Approved'),
  rejected: S('Rejected', 'danger', 'fa-solid fa-circle-xmark', 'Not approved'),
  cancelled: S('Cancelled', 'muted', 'fa-solid fa-ban', 'Withdrawn', { strike: true })
}

const TIMESHEET = {
  draft: S('Draft', 'neutral', 'fa-regular fa-file-lines', 'Not submitted yet'),
  submitted: S('Submitted', 'warning', 'fa-regular fa-hourglass-half', 'Waiting for approval'),
  approved: S('Approved', 'info', 'fa-solid fa-circle-check', 'Approved — will be paid in the next pay run'),
  rejected: S('Rejected', 'danger', 'fa-solid fa-circle-xmark', 'Sent back for changes'),
  paid: S('Paid', 'success', 'fa-solid fa-sack-dollar', 'Included in a paid pay run')
}

const PAYRUN = {
  draft: S('Draft', 'neutral', 'fa-regular fa-file-lines', 'Not paid yet — you can still change it'),
  paid: S('Paid', 'success', 'fa-solid fa-circle-check', 'Staff have been paid')
}

const EMPLOYEE = {
  active: S('Active', 'success', 'fa-solid fa-circle-check', 'Currently employed'),
  on_leave: S('On leave', 'info', 'fa-solid fa-umbrella-beach', 'Away on leave'),
  terminated: S('Terminated', 'muted', 'fa-solid fa-user-xmark', 'No longer employed')
}

const PAYMENT = {
  pending: S('Pending', 'warning', 'fa-regular fa-hourglass-half', 'Started, not completed yet'),
  successful: S('Successful', 'success', 'fa-solid fa-circle-check', 'Payment received'),
  succeeded: S('Successful', 'success', 'fa-solid fa-circle-check', 'Payment received'),
  failed: S('Failed', 'danger', 'fa-solid fa-circle-xmark', 'The payment did not go through'),
  cancelled: S('Cancelled', 'muted', 'fa-solid fa-ban', 'The payer cancelled', { strike: true }),
  refunded: S('Refunded', 'muted', 'fa-solid fa-rotate-left', 'Money returned')
}

const EVENT = {
  draft: S('Draft', 'neutral', 'fa-regular fa-file-lines', 'Not published — registration is closed'),
  published: S('Published', 'info', 'fa-solid fa-globe', 'Public page is live'),
  upcoming: S('Upcoming', 'info', 'fa-regular fa-calendar', 'Published and taking registrations'),
  live: S('Happening now', 'success', 'fa-solid fa-tower-broadcast', 'The event is under way'),
  completed: S('Completed', 'muted', 'fa-solid fa-flag-checkered', 'The event has finished'),
  cancelled: S('Cancelled', 'danger', 'fa-solid fa-ban', 'Cancelled')
}

const REGISTRATION = {
  confirmed: S('Confirmed', 'success', 'fa-solid fa-circle-check', 'Has a place'),
  pending: S('Pending', 'warning', 'fa-regular fa-hourglass-half', 'Waiting for your approval'),
  waitlisted: S('Waitlisted', 'info', 'fa-solid fa-list-ol', 'On the waitlist — sold out'),
  cancelled: S('Cancelled', 'muted', 'fa-solid fa-ban', 'Cancelled', { strike: true }),
  checked_in: S('Checked in', 'accent', 'fa-solid fa-user-check', 'Arrived at the event')
}

const EVENT_PAYMENT = {
  paid: S('Paid', 'success', 'fa-solid fa-circle-check', 'Paid'),
  pending: S('Unpaid', 'warning', 'fa-regular fa-hourglass-half', 'Payment outstanding'),
  free: S('Free', 'neutral', 'fa-solid fa-gift', 'Free ticket'),
  refunded: S('Refunded', 'muted', 'fa-solid fa-rotate-left', 'Money returned')
}

const MEETING = {
  scheduled: S('Scheduled', 'info', 'fa-regular fa-calendar', 'Invitations sent'),
  in_progress: S('In progress', 'success', 'fa-solid fa-video', 'Happening now'),
  live: S('Live', 'success', 'fa-solid fa-video', 'Happening now'),
  starting: S('Starting now', 'success', 'fa-solid fa-door-open', 'Starts within the hour — you can join'),
  ended: S('Ended', 'neutral', 'fa-regular fa-clock', 'The scheduled time has passed'),
  completed: S('Completed', 'neutral', 'fa-solid fa-flag-checkered', 'Finished'),
  cancelled: S('Cancelled', 'muted', 'fa-solid fa-ban', 'Cancelled — attendees were told', { strike: true })
}

const RSVP = {
  needs_action: S('Awaiting reply', 'neutral', 'fa-regular fa-envelope', 'Has not replied yet'),
  accepted: S('Going', 'success', 'fa-solid fa-circle-check', 'Accepted the invitation'),
  tentative: S('Maybe', 'warning', 'fa-regular fa-circle-question', 'Tentatively accepted'),
  declined: S('Not going', 'danger', 'fa-solid fa-circle-xmark', 'Declined the invitation')
}

const PROJECT = {
  planned: S('Planned', 'info', 'fa-regular fa-calendar', 'Not started yet'),
  active: S('Active', 'success', 'fa-solid fa-play', 'Work in progress'),
  on_hold: S('On hold', 'warning', 'fa-solid fa-pause', 'Paused'),
  completed: S('Completed', 'neutral', 'fa-solid fa-flag-checkered', 'Finished'),
  cancelled: S('Cancelled', 'muted', 'fa-solid fa-ban', 'Stopped', { strike: true })
}

const TASK = {
  todo: S('To do', 'neutral', 'fa-regular fa-circle', 'Not started'),
  in_progress: S('In progress', 'info', 'fa-solid fa-spinner', 'Being worked on'),
  review: S('In review', 'accent', 'fa-regular fa-eye', 'Waiting for review'),
  done: S('Done', 'success', 'fa-solid fa-circle-check', 'Finished'),
  blocked: S('Blocked', 'danger', 'fa-solid fa-hand', 'Cannot progress')
}

const PLAN = {
  trial: S('Trial', 'accent', 'fa-regular fa-hourglass-half', 'Free trial — choose a plan before it ends'),
  trialing: S('Trial', 'accent', 'fa-regular fa-hourglass-half', 'Free trial — choose a plan before it ends'),
  active: S('Active', 'success', 'fa-solid fa-circle-check', 'Subscription is active'),
  past_due: S('Past due', 'danger', 'fa-solid fa-triangle-exclamation', 'Payment is overdue'),
  cancelled: S('Cancelled', 'muted', 'fa-solid fa-ban', 'Subscription cancelled', { strike: true }),
  expired: S('Expired', 'muted', 'fa-regular fa-calendar-xmark', 'Trial or subscription ended'),
  suspended: S('Suspended', 'danger', 'fa-solid fa-lock', 'Access suspended'),
  grandfathered: S('Legacy price', 'info', 'fa-solid fa-shield-halved', 'Kept on an older price')
}

const MERGE = {
  dry_run: S('Preview', 'info', 'fa-regular fa-eye', 'Nothing has been changed yet'),
  pending: S('Pending', 'warning', 'fa-regular fa-hourglass-half', 'Waiting to run'),
  merged: S('Merged', 'success', 'fa-solid fa-code-merge', 'Records moved into the kept organisation'),
  failed: S('Failed', 'danger', 'fa-solid fa-circle-xmark', 'Rolled back — nothing changed'),
  archived: S('Archived', 'muted', 'fa-solid fa-box-archive', 'Merged away and archived')
}

const ORDER = {
  pending: S('Pending', 'warning', 'fa-regular fa-hourglass-half', 'Awaiting payment'),
  processing: S('Processing', 'info', 'fa-solid fa-gears', 'Paid, being prepared'),
  on_hold: S('On hold', 'warning', 'fa-solid fa-pause', 'On hold'),
  completed: S('Completed', 'success', 'fa-solid fa-circle-check', 'Fulfilled'),
  shipped: S('Shipped', 'accent', 'fa-solid fa-truck', 'On its way'),
  cancelled: S('Cancelled', 'muted', 'fa-solid fa-ban', 'Cancelled', { strike: true }),
  refunded: S('Refunded', 'danger', 'fa-solid fa-rotate-left', 'Refunded'),
  failed: S('Failed', 'danger', 'fa-solid fa-circle-xmark', 'Payment failed')
}

const CONNECTION = {
  connected: S('Connected', 'success', 'fa-solid fa-plug-circle-check', 'Working'),
  error: S('Error', 'danger', 'fa-solid fa-plug-circle-xmark', 'The last attempt failed'),
  untested: S('Not tested', 'neutral', 'fa-solid fa-plug', 'Run a test to check it'),
  disconnected: S('Disconnected', 'muted', 'fa-solid fa-plug-circle-minus', 'Not connected')
}

const STOCK = {
  in_stock: S('In stock', 'success', 'fa-solid fa-circle-check', 'Above the reorder level'),
  low_stock: S('Low stock', 'warning', 'fa-solid fa-arrow-trend-down', 'At or below the reorder level'),
  out_of_stock: S('Out of stock', 'danger', 'fa-solid fa-circle-xmark', 'None left to sell')
}

const WORK_ORDER = {
  planned: S('Planned', 'info', 'fa-regular fa-calendar', 'Scheduled'),
  draft: S('Draft', 'neutral', 'fa-regular fa-file-lines', 'Not released'),
  released: S('Released', 'accent', 'fa-solid fa-play', 'Released to the floor'),
  in_progress: S('In progress', 'warning', 'fa-solid fa-gears', 'Being produced'),
  completed: S('Completed', 'success', 'fa-solid fa-circle-check', 'Finished'),
  cancelled: S('Cancelled', 'muted', 'fa-solid fa-ban', 'Cancelled', { strike: true })
}

const ACCOUNT = {
  active: S('Active', 'success', 'fa-solid fa-circle-check', 'Can sign in'),
  inactive: S('Inactive', 'neutral', 'fa-solid fa-circle-pause', 'Cannot sign in'),
  suspended: S('Suspended', 'danger', 'fa-solid fa-lock', 'Access suspended'),
  invited: S('Invited', 'info', 'fa-regular fa-envelope', 'Invitation sent'),
  deleted: S('Deleted', 'muted', 'fa-solid fa-trash-can', 'Removed', { strike: true })
}

const JOURNAL = {
  draft: S('Draft', 'neutral', 'fa-regular fa-file-lines', 'Not posted to the ledger yet'),
  posted: S('Posted', 'success', 'fa-solid fa-circle-check', 'Posted to the ledger'),
  reversed: S('Reversed', 'muted', 'fa-solid fa-rotate-left', 'Cancelled by a reversing entry', { strike: true })
}

const CUSTOMER = {
  active: S('Active', 'success', 'fa-solid fa-circle-check', 'Shown in pickers and searches'),
  inactive: S('Inactive', 'neutral', 'fa-solid fa-circle-pause', 'Hidden from pickers — history is kept'),
  lead: S('Lead', 'info', 'fa-solid fa-seedling', 'Not a paying customer yet')
}

const SUPPLIER = {
  active: S('Active', 'success', 'fa-solid fa-circle-check', 'Available for purchase orders and bills'),
  inactive: S('Inactive', 'neutral', 'fa-solid fa-circle-pause', 'Hidden from new orders — history is kept')
}

const PRODUCT = {
  active: S('Active', 'success', 'fa-solid fa-circle-check', 'Sold at the POS and on invoices'),
  inactive: S('Archived', 'muted', 'fa-solid fa-box-archive', 'Hidden from sale — history is kept'),
  in_stock: S('In stock', 'success', 'fa-solid fa-circle-check', 'Above the reorder level'),
  low_stock: S('Low stock', 'warning', 'fa-solid fa-arrow-trend-down', 'At or below the reorder level'),
  out_of_stock: S('Out of stock', 'danger', 'fa-solid fa-circle-xmark', 'None left to sell')
}

const STAFF = {
  active: S('Active', 'success', 'fa-solid fa-circle-check', 'Can sign in'),
  inactive: S('Deactivated', 'neutral', 'fa-solid fa-user-slash', 'Cannot sign in — history is kept'),
  deactivated: S('Deactivated', 'neutral', 'fa-solid fa-user-slash', 'Cannot sign in — history is kept'),
  invited: S('Invited', 'info', 'fa-regular fa-envelope', 'Invitation sent, not accepted yet')
}

const NOTIFICATION = {
  info: S('Info', 'info', 'fa-solid fa-circle-info', 'For your information'),
  success: S('Success', 'success', 'fa-solid fa-circle-check', 'Completed successfully'),
  warning: S('Warning', 'warning', 'fa-solid fa-triangle-exclamation', 'Needs attention'),
  error: S('Error', 'danger', 'fa-solid fa-circle-exclamation', 'Something went wrong')
}

export const STATUS_DOMAINS = {
  invoice: INVOICE,
  quote: QUOTE,
  booking: BOOKING,
  pos: POS,
  po: PO,
  purchase_order: PO,
  bill: BILL,
  leave: LEAVE,
  timesheet: TIMESHEET,
  payrun: PAYRUN,
  employee: EMPLOYEE,
  payment: PAYMENT,
  event: EVENT,
  registration: REGISTRATION,
  event_payment: EVENT_PAYMENT,
  meeting: MEETING,
  rsvp: RSVP,
  project: PROJECT,
  task: TASK,
  plan: PLAN,
  subscription: PLAN,
  merge: MERGE,
  order: ORDER,
  connection: CONNECTION,
  stock: STOCK,
  work_order: WORK_ORDER,
  account: ACCOUNT,
  user: ACCOUNT,
  customer: CUSTOMER,
  journal: JOURNAL,
  supplier: SUPPLIER,
  product: PRODUCT,
  staff: STAFF,
  notification: NOTIFICATION
}

// Generic fallback: first domain that knows the value wins.
const GENERIC = {}
for (const d of [INVOICE, QUOTE, BOOKING, PAYMENT, LEAVE, PO, POS, EVENT, PROJECT, PLAN, ORDER, STOCK, ACCOUNT, CONNECTION, REGISTRATION, TASK, NOTIFICATION]) {
  for (const [k, v] of Object.entries(d)) if (!GENERIC[k]) GENERIC[k] = v
}

export function humanize(s) {
  const t = String(s ?? '').replace(/[_-]+/g, ' ').trim()
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : '—'
}

/** Status metadata for a domain (falls back to a generic map, then a neutral chip). */
export function statusInfo(domain, status) {
  const key = String(status ?? '').toLowerCase()
  const d = STATUS_DOMAINS[domain] || {}
  return d[key] || GENERIC[key] || S(humanize(status), 'neutral', 'fa-regular fa-circle', '')
}

/** The options for a filter/select: [{ value, label, tone, icon }] */
export function statusOptions(domain) {
  return Object.entries(STATUS_DOMAINS[domain] || {}).map(([value, m]) => ({ value, ...m }))
}

/** Legacy bridge: the ui-badge modifier class for a tone. */
export const TONE_BADGE = { neutral: 'draft', info: 'info', accent: 'converted', success: 'success', warning: 'warning', danger: 'danger', muted: 'void' }
