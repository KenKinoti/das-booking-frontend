<template>
  <div class="finance-page">
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-left">
          <h1 class="page-title">
            <i class="bi bi-receipt"></i>
            Invoices
          </h1>
          <p class="page-subtitle">Manage your invoices and billing</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-primary invoice-create-btn" @click="showInvoiceWizard = true">
            <i class="bi bi-magic"></i>
            Create Amazing Invoice
          </button>
          <button class="btn btn-outline-primary" @click="showCreateInvoiceModal = true">
            <i class="bi bi-plus-lg"></i>
            Quick Invoice
          </button>
        </div>
      </div>
    </div>

    <!-- Stats Overview -->
    <div class="stats-overview">
      <div class="row g-3">
        <div class="col-lg-3 col-md-6">
          <div class="stat-card">
            <div class="stat-icon paid">
              <i class="bi bi-check-circle"></i>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.paid.count }}</div>
              <div class="stat-label">Paid Invoices</div>
              <div class="stat-amount">{{ formatCurrency(stats.paid.amount) }}</div>
            </div>
          </div>
        </div>
        <div class="col-lg-3 col-md-6">
          <div class="stat-card">
            <div class="stat-icon pending">
              <i class="bi bi-clock"></i>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.pending.count }}</div>
              <div class="stat-label">Pending Invoices</div>
              <div class="stat-amount">{{ formatCurrency(stats.pending.amount) }}</div>
            </div>
          </div>
        </div>
        <div class="col-lg-3 col-md-6">
          <div class="stat-card">
            <div class="stat-icon overdue">
              <i class="bi bi-exclamation-triangle"></i>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.overdue.count }}</div>
              <div class="stat-label">Overdue Invoices</div>
              <div class="stat-amount">{{ formatCurrency(stats.overdue.amount) }}</div>
            </div>
          </div>
        </div>
        <div class="col-lg-3 col-md-6">
          <div class="stat-card">
            <div class="stat-icon draft">
              <i class="bi bi-file-earmark"></i>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.draft.count }}</div>
              <div class="stat-label">Draft Invoices</div>
              <div class="stat-amount">{{ formatCurrency(stats.draft.amount) }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="main-content">
      <div class="content-card">
        <div class="card-header">
          <div class="header-left">
            <h2 class="card-title">
              <i class="bi bi-list-ul"></i>
              Invoice List
            </h2>
          </div>
          <div class="header-actions">
            <div class="search-box">
              <i class="bi bi-search search-icon"></i>
              <input
                type="text"
                class="search-input"
                placeholder="Search invoices..."
                v-model="searchQuery"
                @input="filterInvoices"
              >
            </div>
          </div>
        </div>

        <!-- Filter Buttons -->
        <div class="filter-section">
          <div class="filter-buttons">
            <button
              v-for="status in statusFilters"
              :key="status.key"
              class="filter-btn"
              :class="{ active: activeStatusFilter === status.key }"
              @click="setStatusFilter(status.key)"
            >
              <i :class="status.icon"></i>
              {{ status.label }}
            </button>
          </div>
        </div>

        <div class="table-container">
          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th @click="sortBy('invoice_number')" class="sortable">
                    Invoice #
                    <i class="bi bi-arrow-up-down sort-icon"></i>
                  </th>
                  <th @click="sortBy('customer')" class="sortable">
                    Customer
                    <i class="bi bi-arrow-up-down sort-icon"></i>
                  </th>
                  <th @click="sortBy('issue_date')" class="sortable">
                    Issue Date
                    <i class="bi bi-arrow-up-down sort-icon"></i>
                  </th>
                  <th @click="sortBy('due_date')" class="sortable">
                    Due Date
                    <i class="bi bi-arrow-up-down sort-icon"></i>
                  </th>
                  <th @click="sortBy('amount')" class="sortable">
                    Amount
                    <i class="bi bi-arrow-up-down sort-icon"></i>
                  </th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="invoice in filteredInvoices" :key="invoice.id">
                  <td class="invoice-number">{{ invoice.invoice_number }}</td>
                  <td class="customer-name">{{ invoice.customer }}</td>
                  <td>{{ formatDate(invoice.issue_date) }}</td>
                  <td>{{ formatDate(invoice.due_date) }}</td>
                  <td class="amount">{{ formatCurrency(invoice.amount) }}</td>
                  <td>
                    <span class="status-badge" :class="invoice.status.toLowerCase()">
                      {{ invoice.status }}
                    </span>
                  </td>
                  <td>
                    <div class="action-buttons">
                      <button class="btn-action view" title="View">
                        <i class="bi bi-eye"></i>
                      </button>
                      <button class="btn-action edit" title="Edit">
                        <i class="bi bi-pencil"></i>
                      </button>
                      <button class="btn-action download" title="Download">
                        <i class="bi bi-download"></i>
                      </button>
                      <button class="btn-action delete" title="Delete">
                        <i class="bi bi-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Invoice Wizard Modal -->
    <div class="invoice-wizard-modal" v-if="showInvoiceWizard" @click="closeInvoiceWizard">
      <div class="wizard-modal-content" @click.stop>
        <button class="wizard-close-btn" @click="closeInvoiceWizard">
          <i class="bi bi-x-lg"></i>
        </button>
        <InvoiceWizard
          @invoice-created="onInvoiceCreated"
          @close="closeInvoiceWizard"
        />
      </div>
    </div>

    <!-- Create Invoice Modal -->
    <div class="modal fade" :class="{ show: showCreateInvoiceModal }" tabindex="-1" style="display: block;" v-if="showCreateInvoiceModal">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi bi-plus-circle"></i>
              Create New Invoice
            </h5>
            <button type="button" class="btn-close" @click="showCreateInvoiceModal = false"></button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="createInvoice">
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">Customer</label>
                  <select class="form-control" v-model="newInvoice.customer" required>
                    <option value="">Select Customer</option>
                    <option value="ABC Corporation">ABC Corporation</option>
                    <option value="XYZ Solutions">XYZ Solutions</option>
                    <option value="Tech Innovations">Tech Innovations</option>
                    <option value="Global Ventures">Global Ventures</option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Invoice Number</label>
                  <input type="text" class="form-control" v-model="newInvoice.invoice_number" required>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Issue Date</label>
                  <input type="date" class="form-control" v-model="newInvoice.issue_date" required>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Due Date</label>
                  <input type="date" class="form-control" v-model="newInvoice.due_date" required>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Amount</label>
                  <input type="number" step="0.01" class="form-control" v-model="newInvoice.amount" required>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Status</label>
                  <select class="form-control" v-model="newInvoice.status" required>
                    <option value="Draft">Draft</option>
                    <option value="Sent">Sent</option>
                    <option value="Paid">Paid</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                </div>
                <div class="col-12">
                  <label class="form-label">Description</label>
                  <textarea class="form-control" rows="3" v-model="newInvoice.description" placeholder="Invoice description..."></textarea>
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showCreateInvoiceModal = false">Cancel</button>
            <button type="button" class="btn btn-primary" @click="createInvoice">
              <i class="bi bi-plus-lg"></i>
              Create Invoice
            </button>
          </div>
        </div>
      </div>
    </div>
    <div class="modal-backdrop fade show" v-if="showCreateInvoiceModal"></div>
  </div>
</template>

<script>
import { globalTheme } from '../composables/useTheme'
import InvoiceWizard from '../components/InvoiceWizard.vue'

export default {
  name: 'Invoices',
  components: {
    InvoiceWizard
  },
  setup() {
    const { isDark } = globalTheme
    return { isDarkMode: isDark }
  },
  data() {
    return {
      searchQuery: '',
      activeStatusFilter: 'all',
      showCreateInvoiceModal: false,
      showInvoiceWizard: false,
      sortField: 'issue_date',
      sortDirection: 'desc',

      statusFilters: [
        { key: 'all', label: 'All Invoices', icon: 'bi bi-list' },
        { key: 'draft', label: 'Draft', icon: 'bi bi-file-earmark' },
        { key: 'sent', label: 'Sent', icon: 'bi bi-send' },
        { key: 'paid', label: 'Paid', icon: 'bi bi-check-circle' },
        { key: 'overdue', label: 'Overdue', icon: 'bi bi-exclamation-triangle' }
      ],

      newInvoice: {
        customer: '',
        invoice_number: '',
        issue_date: '',
        due_date: '',
        amount: '',
        status: 'Draft',
        description: ''
      },

      invoices: [
        {
          id: 1,
          invoice_number: 'INV-2024-001',
          customer: 'ABC Corporation',
          issue_date: '2024-01-15',
          due_date: '2024-02-15',
          amount: 15000.00,
          status: 'Paid',
          description: 'Consulting services for Q1 2024'
        },
        {
          id: 2,
          invoice_number: 'INV-2024-002',
          customer: 'XYZ Solutions',
          issue_date: '2024-01-20',
          due_date: '2024-02-20',
          amount: 8500.00,
          status: 'Sent',
          description: 'Software development project'
        },
        {
          id: 3,
          invoice_number: 'INV-2024-003',
          customer: 'Tech Innovations',
          issue_date: '2024-01-10',
          due_date: '2024-02-10',
          amount: 12000.00,
          status: 'Overdue',
          description: 'System integration services'
        },
        {
          id: 4,
          invoice_number: 'INV-2024-004',
          customer: 'Global Ventures',
          issue_date: '2024-01-25',
          due_date: '2024-02-25',
          amount: 22000.00,
          status: 'Draft',
          description: 'Enterprise solution implementation'
        },
        {
          id: 5,
          invoice_number: 'INV-2024-005',
          customer: 'Smart Systems',
          issue_date: '2024-01-30',
          due_date: '2024-03-01',
          amount: 7500.00,
          status: 'Sent',
          description: 'Maintenance and support services'
        },
        {
          id: 6,
          invoice_number: 'INV-2024-006',
          customer: 'Digital Corp',
          issue_date: '2024-02-01',
          due_date: '2024-03-03',
          amount: 18000.00,
          status: 'Paid',
          description: 'Web development project'
        }
      ],

      filteredInvoices: []
    }
  },

  computed: {
    stats() {
      const paid = this.invoices.filter(i => i.status === 'Paid')
      const pending = this.invoices.filter(i => i.status === 'Sent')
      const overdue = this.invoices.filter(i => i.status === 'Overdue')
      const draft = this.invoices.filter(i => i.status === 'Draft')

      return {
        paid: {
          count: paid.length,
          amount: paid.reduce((sum, i) => sum + i.amount, 0)
        },
        pending: {
          count: pending.length,
          amount: pending.reduce((sum, i) => sum + i.amount, 0)
        },
        overdue: {
          count: overdue.length,
          amount: overdue.reduce((sum, i) => sum + i.amount, 0)
        },
        draft: {
          count: draft.length,
          amount: draft.reduce((sum, i) => sum + i.amount, 0)
        }
      }
    }
  },

  methods: {
    // Invoice Wizard Methods
    closeInvoiceWizard() {
      this.showInvoiceWizard = false
    },

    onInvoiceCreated(invoice) {
      console.log('Invoice created:', invoice)
      // Add the new invoice to the list
      this.invoices.unshift({
        id: Date.now(),
        ...invoice,
        status: invoice.delivery_method === 'save' ? 'draft' : 'sent'
      })
      this.filterInvoices()
      this.closeInvoiceWizard()

      // Show success message
      this.showSuccessMessage(`Invoice ${invoice.invoice_number} ${invoice.delivery_method === 'save' ? 'saved as draft' : 'sent'} successfully!`)
    },

    showSuccessMessage(message) {
      // You can implement a toast notification system here
      alert(message)
    },

    filterInvoices() {
      let filtered = [...this.invoices]

      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase()
        filtered = filtered.filter(invoice =>
          invoice.invoice_number.toLowerCase().includes(query) ||
          invoice.customer.toLowerCase().includes(query) ||
          invoice.description.toLowerCase().includes(query)
        )
      }

      if (this.activeStatusFilter !== 'all') {
        filtered = filtered.filter(invoice =>
          invoice.status.toLowerCase() === this.activeStatusFilter
        )
      }

      this.filteredInvoices = this.sortInvoices(filtered)
    },

    setStatusFilter(status) {
      this.activeStatusFilter = status
      this.filterInvoices()
    },

    sortBy(field) {
      if (this.sortField === field) {
        this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc'
      } else {
        this.sortField = field
        this.sortDirection = 'asc'
      }
      this.filterInvoices()
    },

    sortInvoices(invoices) {
      return invoices.sort((a, b) => {
        let aValue = a[this.sortField]
        let bValue = b[this.sortField]

        if (this.sortField === 'amount') {
          aValue = parseFloat(aValue)
          bValue = parseFloat(bValue)
        }

        if (this.sortDirection === 'asc') {
          return aValue > bValue ? 1 : -1
        } else {
          return aValue < bValue ? 1 : -1
        }
      })
    },

    createInvoice() {
      const newId = Math.max(...this.invoices.map(i => i.id)) + 1
      const invoice = {
        id: newId,
        ...this.newInvoice,
        amount: parseFloat(this.newInvoice.amount)
      }

      this.invoices.unshift(invoice)
      this.filterInvoices()
      this.showCreateInvoiceModal = false
      this.resetNewInvoice()
    },

    resetNewInvoice() {
      this.newInvoice = {
        customer: '',
        invoice_number: '',
        issue_date: '',
        due_date: '',
        amount: '',
        status: 'Draft',
        description: ''
      }
    },

    formatCurrency(amount) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(amount)
    },

    formatDate(dateString) {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    }
  },

  mounted() {
    this.filteredInvoices = [...this.invoices]
    this.filterInvoices()
  }
}
</script>

<style scoped>
/* CSS Variables for Dark Theme */
.finance-page {
  --bg-primary: #ffffff;
  --bg-secondary: #f8fafc;
  --bg-card: #ffffff;
  --text-primary: #1e293b;
  --text-secondary: #64748b;
  --text-muted: #94a3b8;
  --border-color: #e2e8f0;
  --border-light: #f1f5f9;
  --shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

[data-theme="dark"] .finance-page {
  --bg-primary: #0f172a;
  --bg-secondary: #1e293b;
  --bg-card: #334155;
  --text-primary: #f8fafc;
  --text-secondary: #cbd5e1;
  --text-muted: #94a3b8;
  --border-color: #475569;
  --border-light: #64748b;
  --shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px 0 rgba(0, 0, 0, 0.2);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2);
}

.finance-page {
  min-height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
  transition: all 0.3s ease;
}

/* Page Header */
.page-header {
  background: var(--bg-card);
  border-bottom: 1px solid var(--border-color);
  padding: 1.5rem 0;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: var(--shadow);
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.page-subtitle {
  color: var(--text-secondary);
  margin: 0.25rem 0 0 0;
  font-size: 0.9rem;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

/* Stats Overview */
.stats-overview {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.stat-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: var(--shadow);
  transition: all 0.3s ease;
  height: 100%;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  color: white;
  flex-shrink: 0;
}

.stat-icon.paid { background: linear-gradient(135deg, #059669, #047857); }
.stat-icon.pending { background: linear-gradient(135deg, #f59e0b, #d97706); }
.stat-icon.overdue { background: linear-gradient(135deg, #dc2626, #b91c1c); }
.stat-icon.draft { background: linear-gradient(135deg, #6b7280, #4b5563); }

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 1.875rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1;
}

.stat-label {
  color: var(--text-secondary);
  font-size: 0.875rem;
  margin: 0.25rem 0;
}

.stat-amount {
  color: var(--text-primary);
  font-weight: 600;
  font-size: 0.9rem;
}

/* Main Content */
.main-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 1rem 2rem;
}

.content-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  box-shadow: var(--shadow);
  overflow: hidden;
}

.card-header {
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-light);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--bg-secondary);
}

.card-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

/* Search Box */
.search-box {
  position: relative;
  width: 300px;
}

.search-input {
  width: 100%;
  padding: 0.5rem 0.75rem 0.5rem 2.25rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.875rem;
  transition: all 0.2s ease;
}

.search-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  font-size: 0.875rem;
}

/* Filter Section */
.filter-section {
  padding: 1rem 1.5rem;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-light);
}

.filter-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.filter-btn {
  padding: 0.5rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--text-secondary);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.filter-btn:hover {
  background: var(--bg-card);
  border-color: #3b82f6;
}

.filter-btn.active {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
}

/* Table */
.table-container {
  overflow-x: auto;
}

.table-wrapper {
  min-width: 800px;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th {
  padding: 1rem;
  text-align: left;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.025em;
  border-bottom: 1px solid var(--border-light);
  white-space: nowrap;
}

.data-table th.sortable {
  cursor: pointer;
  user-select: none;
  transition: color 0.2s ease;
}

.data-table th.sortable:hover {
  color: var(--text-primary);
}

.sort-icon {
  margin-left: 0.25rem;
  opacity: 0.5;
  font-size: 0.75rem;
}

.data-table td {
  padding: 1rem;
  border-bottom: 1px solid var(--border-light);
  color: var(--text-primary);
  font-size: 0.875rem;
  vertical-align: middle;
}

.data-table tbody tr {
  transition: background-color 0.2s ease;
}

.data-table tbody tr:hover {
  background: var(--bg-secondary);
}

.invoice-number {
  font-weight: 600;
  color: #3b82f6;
}

.customer-name {
  font-weight: 500;
}

.amount {
  font-weight: 600;
  text-align: right;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.status-badge.paid {
  background: #dcfce7;
  color: #166534;
}

.status-badge.sent {
  background: #fef3c7;
  color: #92400e;
}

.status-badge.overdue {
  background: #fee2e2;
  color: #991b1b;
}

.status-badge.draft {
  background: #f1f5f9;
  color: #475569;
}

[data-theme="dark"] .status-badge.paid {
  background: #166534;
  color: #dcfce7;
}

[data-theme="dark"] .status-badge.sent {
  background: #92400e;
  color: #fef3c7;
}

[data-theme="dark"] .status-badge.overdue {
  background: #991b1b;
  color: #fee2e2;
}

[data-theme="dark"] .status-badge.draft {
  background: #475569;
  color: #f1f5f9;
}

/* Action Buttons */
.action-buttons {
  display: flex;
  gap: 0.25rem;
}

.btn-action {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.875rem;
}

.btn-action.view {
  background: #eff6ff;
  color: #2563eb;
}

.btn-action.view:hover {
  background: #dbeafe;
}

.btn-action.edit {
  background: #fef3c7;
  color: #d97706;
}

.btn-action.edit:hover {
  background: #fde68a;
}

.btn-action.download {
  background: #ecfdf5;
  color: #059669;
}

.btn-action.download:hover {
  background: #d1fae5;
}

.btn-action.delete {
  background: #fee2e2;
  color: #dc2626;
}

.btn-action.delete:hover {
  background: #fecaca;
}

/* Modal Styles */
.modal {
  background: rgba(0, 0, 0, 0.5);
}

.modal-content {
  background: var(--bg-card);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  box-shadow: var(--shadow-lg);
}

.modal-header {
  border-bottom: 1px solid var(--border-light);
  background: var(--bg-secondary);
}

.modal-title {
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-close {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  opacity: 1;
}

.modal-footer {
  border-top: 1px solid var(--border-light);
  background: var(--bg-secondary);
}

.form-label {
  color: var(--text-secondary);
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.form-control {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  transition: all 0.2s ease;
}

.form-control:focus {
  background: var(--bg-primary);
  border-color: #3b82f6;
  color: var(--text-primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* Responsive Design */
@media (max-width: 1024px) {
  .header-content {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
    justify-content: space-between;
  }

  .search-box {
    width: 250px;
  }
}

@media (max-width: 768px) {
  .page-header {
    padding: 1rem 0;
  }

  .stats-overview {
    padding: 1rem;
  }

  .stat-card {
    padding: 1rem;
  }

  .stat-icon {
    width: 40px;
    height: 40px;
    font-size: 1.125rem;
  }

  .stat-value {
    font-size: 1.5rem;
  }

  .main-content {
    padding: 0 1rem 1rem;
  }

  .card-header {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
  }

  .search-box {
    width: 100%;
  }

  .filter-buttons {
    justify-content: center;
  }

  .data-table th,
  .data-table td {
    padding: 0.75rem 0.5rem;
  }

  .action-buttons {
    flex-direction: column;
    gap: 0.125rem;
  }

  .btn-action {
    width: 28px;
    height: 28px;
    font-size: 0.75rem;
  }
}

@media (max-width: 480px) {
  .stats-overview {
    padding: 0.75rem;
  }

  .stat-card {
    padding: 0.75rem;
    flex-direction: column;
    text-align: center;
    gap: 0.75rem;
  }

  .filter-section {
    padding: 0.75rem;
  }

  .filter-btn {
    padding: 0.375rem 0.75rem;
    font-size: 0.8rem;
  }

  .table-wrapper {
    min-width: 600px;
  }

  .data-table th,
  .data-table td {
    padding: 0.5rem 0.25rem;
    font-size: 0.8rem;
  }
}

/* Invoice Wizard Modal */
.invoice-wizard-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1050;
  padding: 0;
  overflow: auto;
}

.wizard-modal-content {
  background: var(--card-bg);
  border-radius: var(--bs-border-radius-lg);
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
  position: relative;
  overflow: auto;
}

.wizard-close-btn {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 1051;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  transition: all 0.2s ease;
  backdrop-filter: blur(4px);
}

.wizard-close-btn:hover {
  background: rgba(0, 0, 0, 0.9);
  transform: scale(1.1);
}

/* Enhanced invoice create button */
.invoice-create-btn {
  background: linear-gradient(135deg, var(--bs-primary), #6366f1);
  border: none;
  color: white;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  box-shadow: 0 2px 8px rgba(var(--bs-primary-rgb), 0.3);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.invoice-create-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s;
}

.invoice-create-btn:hover::before {
  left: 100%;
}

.invoice-create-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(var(--bs-primary-rgb), 0.4);
}

.invoice-create-btn i {
  margin-right: 0.5rem;
  font-size: 1.1em;
}

/* Header actions alignment */
.header-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

@media (max-width: 768px) {
  .header-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .header-actions .btn {
    width: 100%;
    justify-content: center;
  }

  .wizard-close-btn {
    top: 0.5rem;
    right: 0.5rem;
  }
}
</style>