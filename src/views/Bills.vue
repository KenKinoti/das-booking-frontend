<template>
  <div class="finance-page">
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-left">
          <h1 class="page-title">
            <i class="bi bi-receipt"></i>
            Bills & Expenses
          </h1>
          <p class="page-subtitle">Track and manage your bills and expenses</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-primary" @click="showCreateBillModal = true">
            <i class="bi bi-plus-lg"></i>
            New Bill
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
              <div class="stat-label">Paid Bills</div>
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
              <div class="stat-label">Pending Bills</div>
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
              <div class="stat-label">Overdue Bills</div>
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
              <div class="stat-label">Draft Bills</div>
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
              Bills & Expenses
            </h2>
          </div>
          <div class="header-actions">
            <div class="search-box">
              <i class="bi bi-search search-icon"></i>
              <input
                type="text"
                class="search-input"
                placeholder="Search bills..."
                v-model="searchQuery"
                @input="filterBills"
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
                  <th @click="sortBy('bill_number')" class="sortable">
                    Bill #
                    <i class="bi bi-arrow-up-down sort-icon"></i>
                  </th>
                  <th @click="sortBy('vendor')" class="sortable">
                    Vendor
                    <i class="bi bi-arrow-up-down sort-icon"></i>
                  </th>
                  <th @click="sortBy('category')" class="sortable">
                    Category
                    <i class="bi bi-arrow-up-down sort-icon"></i>
                  </th>
                  <th @click="sortBy('bill_date')" class="sortable">
                    Bill Date
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
                <tr v-for="bill in filteredBills" :key="bill.id">
                  <td class="bill-number">{{ bill.bill_number }}</td>
                  <td class="vendor-name">{{ bill.vendor }}</td>
                  <td>
                    <span class="category-badge" :style="{ backgroundColor: bill.category_color + '20', color: bill.category_color }">
                      {{ bill.category }}
                    </span>
                  </td>
                  <td>{{ formatDate(bill.bill_date) }}</td>
                  <td>{{ formatDate(bill.due_date) }}</td>
                  <td class="amount">{{ formatCurrency(bill.amount) }}</td>
                  <td>
                    <span class="status-badge" :class="bill.status.toLowerCase()">
                      {{ bill.status }}
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
                      <button class="btn-action pay" title="Pay" v-if="bill.status !== 'Paid'">
                        <i class="bi bi-credit-card"></i>
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

    <!-- Create Bill Modal -->
    <div class="modal fade" :class="{ show: showCreateBillModal }" tabindex="-1" style="display: block;" v-if="showCreateBillModal">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi bi-plus-circle"></i>
              Create New Bill
            </h5>
            <button type="button" class="btn-close" @click="showCreateBillModal = false"></button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="createBill">
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">Vendor</label>
                  <select class="form-control" v-model="newBill.vendor" required>
                    <option value="">Select Vendor</option>
                    <option value="Office Supplies Inc">Office Supplies Inc</option>
                    <option value="Tech Solutions Corp">Tech Solutions Corp</option>
                    <option value="Utilities Company">Utilities Company</option>
                    <option value="Marketing Agency">Marketing Agency</option>
                    <option value="Legal Services LLC">Legal Services LLC</option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Bill Number</label>
                  <input type="text" class="form-control" v-model="newBill.bill_number" required>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Category</label>
                  <select class="form-control" v-model="newBill.category" required>
                    <option value="">Select Category</option>
                    <option value="Office Supplies">Office Supplies</option>
                    <option value="Software">Software</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Legal">Legal</option>
                    <option value="Travel">Travel</option>
                    <option value="Equipment">Equipment</option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Amount</label>
                  <input type="number" step="0.01" class="form-control" v-model="newBill.amount" required>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Bill Date</label>
                  <input type="date" class="form-control" v-model="newBill.bill_date" required>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Due Date</label>
                  <input type="date" class="form-control" v-model="newBill.due_date" required>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Status</label>
                  <select class="form-control" v-model="newBill.status" required>
                    <option value="Draft">Draft</option>
                    <option value="Pending">Pending</option>
                    <option value="Paid">Paid</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                </div>
                <div class="col-12">
                  <label class="form-label">Description</label>
                  <textarea class="form-control" rows="3" v-model="newBill.description" placeholder="Bill description..."></textarea>
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showCreateBillModal = false">Cancel</button>
            <button type="button" class="btn btn-primary" @click="createBill">
              <i class="bi bi-plus-lg"></i>
              Create Bill
            </button>
          </div>
        </div>
      </div>
    </div>
    <div class="modal-backdrop fade show" v-if="showCreateBillModal"></div>
  </div>
</template>

<script>
import { globalTheme } from '../composables/useTheme'

export default {
  name: 'Bills',
  setup() {
    const { isDark } = globalTheme
    return { isDarkMode: isDark }
  },
  data() {
    return {
      searchQuery: '',
      activeStatusFilter: 'all',
      showCreateBillModal: false,
      sortField: 'bill_date',
      sortDirection: 'desc',

      categoryColors: {
        'Office Supplies': '#3b82f6',
        'Software': '#8b5cf6',
        'Utilities': '#f59e0b',
        'Marketing': '#ef4444',
        'Legal': '#059669',
        'Travel': '#06b6d4',
        'Equipment': '#6b7280'
      },

      statusFilters: [
        { key: 'all', label: 'All Bills', icon: 'bi bi-list' },
        { key: 'draft', label: 'Draft', icon: 'bi bi-file-earmark' },
        { key: 'pending', label: 'Pending', icon: 'bi bi-clock' },
        { key: 'paid', label: 'Paid', icon: 'bi bi-check-circle' },
        { key: 'overdue', label: 'Overdue', icon: 'bi bi-exclamation-triangle' }
      ],

      newBill: {
        vendor: '',
        bill_number: '',
        category: '',
        bill_date: '',
        due_date: '',
        amount: '',
        status: 'Draft',
        description: ''
      },

      bills: [
        {
          id: 1,
          bill_number: 'BILL-2024-001',
          vendor: 'Office Supplies Inc',
          category: 'Office Supplies',
          category_color: '#3b82f6',
          bill_date: '2024-01-15',
          due_date: '2024-02-15',
          amount: 1250.00,
          status: 'Paid',
          description: 'Monthly office supplies and stationery'
        },
        {
          id: 2,
          bill_number: 'BILL-2024-002',
          vendor: 'Tech Solutions Corp',
          category: 'Software',
          category_color: '#8b5cf6',
          bill_date: '2024-01-20',
          due_date: '2024-02-20',
          amount: 2500.00,
          status: 'Pending',
          description: 'Software licenses and subscriptions'
        },
        {
          id: 3,
          bill_number: 'BILL-2024-003',
          vendor: 'Utilities Company',
          category: 'Utilities',
          category_color: '#f59e0b',
          bill_date: '2024-01-10',
          due_date: '2024-02-10',
          amount: 850.00,
          status: 'Overdue',
          description: 'Electricity and water bills'
        },
        {
          id: 4,
          bill_number: 'BILL-2024-004',
          vendor: 'Marketing Agency',
          category: 'Marketing',
          category_color: '#ef4444',
          bill_date: '2024-01-25',
          due_date: '2024-02-25',
          amount: 5000.00,
          status: 'Draft',
          description: 'Digital marketing campaign'
        },
        {
          id: 5,
          bill_number: 'BILL-2024-005',
          vendor: 'Legal Services LLC',
          category: 'Legal',
          category_color: '#059669',
          bill_date: '2024-01-30',
          due_date: '2024-03-01',
          amount: 3200.00,
          status: 'Pending',
          description: 'Legal consultation and contract review'
        },
        {
          id: 6,
          bill_number: 'BILL-2024-006',
          vendor: 'Equipment Rentals',
          category: 'Equipment',
          category_color: '#6b7280',
          bill_date: '2024-02-01',
          due_date: '2024-03-03',
          amount: 1800.00,
          status: 'Paid',
          description: 'Office equipment rental'
        }
      ],

      filteredBills: []
    }
  },

  computed: {
    stats() {
      const paid = this.bills.filter(b => b.status === 'Paid')
      const pending = this.bills.filter(b => b.status === 'Pending')
      const overdue = this.bills.filter(b => b.status === 'Overdue')
      const draft = this.bills.filter(b => b.status === 'Draft')

      return {
        paid: {
          count: paid.length,
          amount: paid.reduce((sum, b) => sum + b.amount, 0)
        },
        pending: {
          count: pending.length,
          amount: pending.reduce((sum, b) => sum + b.amount, 0)
        },
        overdue: {
          count: overdue.length,
          amount: overdue.reduce((sum, b) => sum + b.amount, 0)
        },
        draft: {
          count: draft.length,
          amount: draft.reduce((sum, b) => sum + b.amount, 0)
        }
      }
    }
  },

  methods: {
    filterBills() {
      let filtered = [...this.bills]

      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase()
        filtered = filtered.filter(bill =>
          bill.bill_number.toLowerCase().includes(query) ||
          bill.vendor.toLowerCase().includes(query) ||
          bill.category.toLowerCase().includes(query) ||
          bill.description.toLowerCase().includes(query)
        )
      }

      if (this.activeStatusFilter !== 'all') {
        filtered = filtered.filter(bill =>
          bill.status.toLowerCase() === this.activeStatusFilter
        )
      }

      this.filteredBills = this.sortBills(filtered)
    },

    setStatusFilter(status) {
      this.activeStatusFilter = status
      this.filterBills()
    },

    sortBy(field) {
      if (this.sortField === field) {
        this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc'
      } else {
        this.sortField = field
        this.sortDirection = 'asc'
      }
      this.filterBills()
    },

    sortBills(bills) {
      return bills.sort((a, b) => {
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

    createBill() {
      const newId = Math.max(...this.bills.map(b => b.id)) + 1
      const bill = {
        id: newId,
        ...this.newBill,
        amount: parseFloat(this.newBill.amount),
        category_color: this.categoryColors[this.newBill.category] || '#6b7280'
      }

      this.bills.unshift(bill)
      this.filterBills()
      this.showCreateBillModal = false
      this.resetNewBill()
    },

    resetNewBill() {
      this.newBill = {
        vendor: '',
        bill_number: '',
        category: '',
        bill_date: '',
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
    this.filteredBills = [...this.bills]
    this.filterBills()
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
  min-width: 900px;
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

.bill-number {
  font-weight: 600;
  color: #3b82f6;
}

.vendor-name {
  font-weight: 500;
}

.amount {
  font-weight: 600;
  text-align: right;
}

.category-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.025em;
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

.status-badge.pending {
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

[data-theme="dark"] .status-badge.pending {
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

.btn-action.pay {
  background: #ecfdf5;
  color: #059669;
}

.btn-action.pay:hover {
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
    min-width: 700px;
  }

  .data-table th,
  .data-table td {
    padding: 0.5rem 0.25rem;
    font-size: 0.8rem;
  }
}
</style>