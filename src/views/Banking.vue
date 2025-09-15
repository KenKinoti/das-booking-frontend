<template>
  <div class="finance-page">
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-left">
          <h1 class="page-title">
            <i class="bi bi-bank"></i>
            Banking & Transactions
          </h1>
          <p class="page-subtitle">Manage bank accounts and transactions</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-outline-primary btn-sm me-2" @click="showAddAccountModal = true">
            <i class="bi bi-plus-lg"></i>
            Add Account
          </button>
          <button class="btn btn-primary" @click="showAddTransactionModal = true">
            <i class="bi bi-plus-lg"></i>
            New Transaction
          </button>
        </div>
      </div>
    </div>

    <!-- Bank Accounts Overview -->
    <div class="accounts-overview">
      <div class="section-header">
        <h2 class="section-title">
          <i class="bi bi-wallet2"></i>
          Bank Accounts
        </h2>
      </div>
      <div class="row g-3">
        <div class="col-lg-4 col-md-6" v-for="account in bankAccounts" :key="account.id">
          <div class="account-card" :class="account.type.toLowerCase()">
            <div class="account-header">
              <div class="account-info">
                <h3 class="account-name">{{ account.name }}</h3>
                <p class="account-type">{{ account.type }} • {{ account.bank }}</p>
              </div>
              <div class="account-icon">
                <i :class="getAccountIcon(account.type)"></i>
              </div>
            </div>
            <div class="account-balance">
              <div class="balance-amount" :class="{ negative: account.balance < 0 }">
                {{ formatCurrency(account.balance) }}
              </div>
              <div class="account-number">•••• {{ account.number.slice(-4) }}</div>
            </div>
            <div class="account-actions">
              <button class="btn-account-action" @click="viewAccountTransactions(account.id)">
                <i class="bi bi-list"></i>
                View Transactions
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Transactions Section -->
    <div class="transactions-section">
      <div class="content-card">
        <div class="card-header">
          <div class="header-left">
            <h2 class="card-title">
              <i class="bi bi-arrow-left-right"></i>
              Recent Transactions
            </h2>
          </div>
          <div class="header-actions">
            <div class="search-box">
              <i class="bi bi-search search-icon"></i>
              <input
                type="text"
                class="search-input"
                placeholder="Search transactions..."
                v-model="searchQuery"
                @input="filterTransactions"
              >
            </div>
          </div>
        </div>

        <!-- Filter Buttons -->
        <div class="filter-section">
          <div class="filter-buttons">
            <button
              v-for="type in transactionTypes"
              :key="type.key"
              class="filter-btn"
              :class="{ active: activeTypeFilter === type.key }"
              @click="setTypeFilter(type.key)"
            >
              <i :class="type.icon"></i>
              {{ type.label }}
            </button>
          </div>
        </div>

        <div class="table-container">
          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th @click="sortBy('date')" class="sortable">
                    Date
                    <i class="bi bi-arrow-up-down sort-icon"></i>
                  </th>
                  <th @click="sortBy('description')" class="sortable">
                    Description
                    <i class="bi bi-arrow-up-down sort-icon"></i>
                  </th>
                  <th @click="sortBy('category')" class="sortable">
                    Category
                    <i class="bi bi-arrow-up-down sort-icon"></i>
                  </th>
                  <th @click="sortBy('account')" class="sortable">
                    Account
                    <i class="bi bi-arrow-up-down sort-icon"></i>
                  </th>
                  <th @click="sortBy('amount')" class="sortable">
                    Amount
                    <i class="bi bi-arrow-up-down sort-icon"></i>
                  </th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="transaction in filteredTransactions" :key="transaction.id">
                  <td>{{ formatDate(transaction.date) }}</td>
                  <td class="description">{{ transaction.description }}</td>
                  <td>
                    <span class="category-badge" :style="{ backgroundColor: transaction.category_color + '20', color: transaction.category_color }">
                      {{ transaction.category }}
                    </span>
                  </td>
                  <td class="account-name">{{ transaction.account }}</td>
                  <td class="amount" :class="{ negative: transaction.amount < 0, positive: transaction.amount > 0 }">
                    {{ formatCurrency(Math.abs(transaction.amount)) }}
                  </td>
                  <td>
                    <span class="type-badge" :class="transaction.type.toLowerCase()">
                      <i :class="getTypeIcon(transaction.type)"></i>
                      {{ transaction.type }}
                    </span>
                  </td>
                  <td>
                    <span class="status-badge" :class="transaction.status.toLowerCase()">
                      {{ transaction.status }}
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

    <!-- Add Account Modal -->
    <div class="modal fade" :class="{ show: showAddAccountModal }" tabindex="-1" style="display: block;" v-if="showAddAccountModal">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi bi-plus-circle"></i>
              Add Bank Account
            </h5>
            <button type="button" class="btn-close" @click="showAddAccountModal = false"></button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="addAccount">
              <div class="row g-3">
                <div class="col-12">
                  <label class="form-label">Account Name</label>
                  <input type="text" class="form-control" v-model="newAccount.name" required>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Bank</label>
                  <input type="text" class="form-control" v-model="newAccount.bank" required>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Account Type</label>
                  <select class="form-control" v-model="newAccount.type" required>
                    <option value="">Select Type</option>
                    <option value="Checking">Checking</option>
                    <option value="Savings">Savings</option>
                    <option value="Credit">Credit Card</option>
                    <option value="Business">Business</option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Account Number</label>
                  <input type="text" class="form-control" v-model="newAccount.number" required>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Initial Balance</label>
                  <input type="number" step="0.01" class="form-control" v-model="newAccount.balance" required>
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showAddAccountModal = false">Cancel</button>
            <button type="button" class="btn btn-primary" @click="addAccount">
              <i class="bi bi-plus-lg"></i>
              Add Account
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Transaction Modal -->
    <div class="modal fade" :class="{ show: showAddTransactionModal }" tabindex="-1" style="display: block;" v-if="showAddTransactionModal">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi bi-plus-circle"></i>
              Add Transaction
            </h5>
            <button type="button" class="btn-close" @click="showAddTransactionModal = false"></button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="addTransaction">
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">Account</label>
                  <select class="form-control" v-model="newTransaction.account" required>
                    <option value="">Select Account</option>
                    <option v-for="account in bankAccounts" :key="account.id" :value="account.name">
                      {{ account.name }}
                    </option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Type</label>
                  <select class="form-control" v-model="newTransaction.type" required>
                    <option value="">Select Type</option>
                    <option value="Income">Income</option>
                    <option value="Expense">Expense</option>
                    <option value="Transfer">Transfer</option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Amount</label>
                  <input type="number" step="0.01" class="form-control" v-model="newTransaction.amount" required>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Date</label>
                  <input type="date" class="form-control" v-model="newTransaction.date" required>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Category</label>
                  <select class="form-control" v-model="newTransaction.category" required>
                    <option value="">Select Category</option>
                    <option value="Sales">Sales</option>
                    <option value="Office Expenses">Office Expenses</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Travel">Travel</option>
                    <option value="Equipment">Equipment</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Status</label>
                  <select class="form-control" v-model="newTransaction.status" required>
                    <option value="Completed">Completed</option>
                    <option value="Pending">Pending</option>
                    <option value="Failed">Failed</option>
                  </select>
                </div>
                <div class="col-12">
                  <label class="form-label">Description</label>
                  <input type="text" class="form-control" v-model="newTransaction.description" required>
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showAddTransactionModal = false">Cancel</button>
            <button type="button" class="btn btn-primary" @click="addTransaction">
              <i class="bi bi-plus-lg"></i>
              Add Transaction
            </button>
          </div>
        </div>
      </div>
    </div>
    <div class="modal-backdrop fade show" v-if="showAddAccountModal || showAddTransactionModal"></div>
  </div>
</template>

<script>
import { globalTheme } from '../composables/useTheme'

export default {
  name: 'Banking',
  setup() {
    const { isDark } = globalTheme
    return { isDarkMode: isDark }
  },
  data() {
    return {
      searchQuery: '',
      activeTypeFilter: 'all',
      showAddAccountModal: false,
      showAddTransactionModal: false,
      sortField: 'date',
      sortDirection: 'desc',

      categoryColors: {
        'Sales': '#059669',
        'Office Expenses': '#3b82f6',
        'Marketing': '#ef4444',
        'Utilities': '#f59e0b',
        'Travel': '#06b6d4',
        'Equipment': '#6b7280',
        'Other': '#8b5cf6'
      },

      transactionTypes: [
        { key: 'all', label: 'All Types', icon: 'bi bi-list' },
        { key: 'income', label: 'Income', icon: 'bi bi-arrow-down-left' },
        { key: 'expense', label: 'Expense', icon: 'bi bi-arrow-up-right' },
        { key: 'transfer', label: 'Transfer', icon: 'bi bi-arrow-left-right' }
      ],

      newAccount: {
        name: '',
        bank: '',
        type: '',
        number: '',
        balance: ''
      },

      newTransaction: {
        account: '',
        type: '',
        amount: '',
        date: '',
        category: '',
        status: 'Completed',
        description: ''
      },

      bankAccounts: [
        {
          id: 1,
          name: 'Business Checking',
          bank: 'Chase Bank',
          type: 'Checking',
          number: '1234567890',
          balance: 45750.00
        },
        {
          id: 2,
          name: 'Business Savings',
          bank: 'Chase Bank',
          type: 'Savings',
          number: '0987654321',
          balance: 125000.00
        },
        {
          id: 3,
          name: 'Corporate Credit',
          bank: 'American Express',
          type: 'Credit',
          number: '4567890123',
          balance: -3250.00
        }
      ],

      transactions: [
        {
          id: 1,
          date: '2024-01-15',
          description: 'Client Payment - Invoice #001',
          category: 'Sales',
          category_color: '#059669',
          account: 'Business Checking',
          amount: 15000.00,
          type: 'Income',
          status: 'Completed'
        },
        {
          id: 2,
          date: '2024-01-14',
          description: 'Office Supplies Purchase',
          category: 'Office Expenses',
          category_color: '#3b82f6',
          account: 'Corporate Credit',
          amount: -485.00,
          type: 'Expense',
          status: 'Completed'
        },
        {
          id: 3,
          date: '2024-01-13',
          description: 'Marketing Campaign Payment',
          category: 'Marketing',
          category_color: '#ef4444',
          account: 'Business Checking',
          amount: -2500.00,
          type: 'Expense',
          status: 'Completed'
        },
        {
          id: 4,
          date: '2024-01-12',
          description: 'Utility Bill Payment',
          category: 'Utilities',
          category_color: '#f59e0b',
          account: 'Business Checking',
          amount: -750.00,
          type: 'Expense',
          status: 'Completed'
        },
        {
          id: 5,
          date: '2024-01-11',
          description: 'Transfer to Savings',
          category: 'Other',
          category_color: '#8b5cf6',
          account: 'Business Checking',
          amount: -10000.00,
          type: 'Transfer',
          status: 'Completed'
        },
        {
          id: 6,
          date: '2024-01-10',
          description: 'Equipment Purchase',
          category: 'Equipment',
          category_color: '#6b7280',
          account: 'Corporate Credit',
          amount: -1800.00,
          type: 'Expense',
          status: 'Pending'
        }
      ],

      filteredTransactions: []
    }
  },

  methods: {
    getAccountIcon(type) {
      const icons = {
        'Checking': 'bi bi-cash-coin',
        'Savings': 'bi bi-piggy-bank',
        'Credit': 'bi bi-credit-card',
        'Business': 'bi bi-building'
      }
      return icons[type] || 'bi bi-bank'
    },

    getTypeIcon(type) {
      const icons = {
        'Income': 'bi bi-arrow-down-left',
        'Expense': 'bi bi-arrow-up-right',
        'Transfer': 'bi bi-arrow-left-right'
      }
      return icons[type] || 'bi bi-question'
    },

    viewAccountTransactions(accountId) {
      const account = this.bankAccounts.find(a => a.id === accountId)
      if (account) {
        this.searchQuery = account.name
        this.filterTransactions()
      }
    },

    filterTransactions() {
      let filtered = [...this.transactions]

      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase()
        filtered = filtered.filter(transaction =>
          transaction.description.toLowerCase().includes(query) ||
          transaction.category.toLowerCase().includes(query) ||
          transaction.account.toLowerCase().includes(query)
        )
      }

      if (this.activeTypeFilter !== 'all') {
        filtered = filtered.filter(transaction =>
          transaction.type.toLowerCase() === this.activeTypeFilter
        )
      }

      this.filteredTransactions = this.sortTransactions(filtered)
    },

    setTypeFilter(type) {
      this.activeTypeFilter = type
      this.filterTransactions()
    },

    sortBy(field) {
      if (this.sortField === field) {
        this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc'
      } else {
        this.sortField = field
        this.sortDirection = 'asc'
      }
      this.filterTransactions()
    },

    sortTransactions(transactions) {
      return transactions.sort((a, b) => {
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

    addAccount() {
      const newId = Math.max(...this.bankAccounts.map(a => a.id)) + 1
      const account = {
        id: newId,
        ...this.newAccount,
        balance: parseFloat(this.newAccount.balance)
      }

      this.bankAccounts.push(account)
      this.showAddAccountModal = false
      this.resetNewAccount()
    },

    addTransaction() {
      const newId = Math.max(...this.transactions.map(t => t.id)) + 1
      let amount = parseFloat(this.newTransaction.amount)

      if (this.newTransaction.type === 'Expense') {
        amount = -Math.abs(amount)
      } else if (this.newTransaction.type === 'Transfer') {
        amount = -Math.abs(amount)
      }

      const transaction = {
        id: newId,
        ...this.newTransaction,
        amount: amount,
        category_color: this.categoryColors[this.newTransaction.category] || '#6b7280'
      }

      this.transactions.unshift(transaction)
      this.filterTransactions()
      this.showAddTransactionModal = false
      this.resetNewTransaction()
    },

    resetNewAccount() {
      this.newAccount = {
        name: '',
        bank: '',
        type: '',
        number: '',
        balance: ''
      }
    },

    resetNewTransaction() {
      this.newTransaction = {
        account: '',
        type: '',
        amount: '',
        date: '',
        category: '',
        status: 'Completed',
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
    this.filteredTransactions = [...this.transactions]
    this.filterTransactions()
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

/* Accounts Overview */
.accounts-overview {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.section-header {
  margin-bottom: 1.5rem;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.account-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: var(--shadow);
  transition: all 0.3s ease;
  height: 100%;
}

.account-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.account-card.checking {
  border-left: 4px solid #3b82f6;
}

.account-card.savings {
  border-left: 4px solid #059669;
}

.account-card.credit {
  border-left: 4px solid #ef4444;
}

.account-card.business {
  border-left: 4px solid #8b5cf6;
}

.account-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.account-name {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 0.25rem 0;
}

.account-type {
  color: var(--text-secondary);
  font-size: 0.875rem;
  margin: 0;
}

.account-icon {
  width: 40px;
  height: 40px;
  background: var(--bg-secondary);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-size: 1.125rem;
}

.account-balance {
  margin-bottom: 1rem;
}

.balance-amount {
  font-size: 1.875rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1;
}

.balance-amount.negative {
  color: #ef4444;
}

.account-number {
  color: var(--text-muted);
  font-size: 0.875rem;
  margin-top: 0.25rem;
}

.btn-account-action {
  width: 100%;
  padding: 0.5rem 1rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.btn-account-action:hover {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
}

/* Transactions Section */
.transactions-section {
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
  min-width: 1000px;
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

.description {
  font-weight: 500;
}

.account-name {
  font-weight: 500;
  color: var(--text-secondary);
}

.amount {
  font-weight: 600;
  text-align: right;
}

.amount.positive {
  color: #059669;
}

.amount.negative {
  color: #ef4444;
}

.category-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.type-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.025em;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  width: fit-content;
}

.type-badge.income {
  background: #dcfce7;
  color: #166534;
}

.type-badge.expense {
  background: #fee2e2;
  color: #991b1b;
}

.type-badge.transfer {
  background: #e0f2fe;
  color: #0c4a6e;
}

[data-theme="dark"] .type-badge.income {
  background: #166534;
  color: #dcfce7;
}

[data-theme="dark"] .type-badge.expense {
  background: #991b1b;
  color: #fee2e2;
}

[data-theme="dark"] .type-badge.transfer {
  background: #0c4a6e;
  color: #e0f2fe;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.status-badge.completed {
  background: #dcfce7;
  color: #166534;
}

.status-badge.pending {
  background: #fef3c7;
  color: #92400e;
}

.status-badge.failed {
  background: #fee2e2;
  color: #991b1b;
}

[data-theme="dark"] .status-badge.completed {
  background: #166534;
  color: #dcfce7;
}

[data-theme="dark"] .status-badge.pending {
  background: #92400e;
  color: #fef3c7;
}

[data-theme="dark"] .status-badge.failed {
  background: #991b1b;
  color: #fee2e2;
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

  .accounts-overview {
    padding: 1rem;
  }

  .account-card {
    padding: 1rem;
  }

  .account-header {
    flex-direction: column;
    gap: 0.5rem;
  }

  .balance-amount {
    font-size: 1.5rem;
  }

  .transactions-section {
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
  .accounts-overview {
    padding: 0.75rem;
  }

  .account-card {
    padding: 0.75rem;
  }

  .balance-amount {
    font-size: 1.25rem;
  }

  .filter-section {
    padding: 0.75rem;
  }

  .filter-btn {
    padding: 0.375rem 0.75rem;
    font-size: 0.8rem;
  }

  .table-wrapper {
    min-width: 800px;
  }

  .data-table th,
  .data-table td {
    padding: 0.5rem 0.25rem;
    font-size: 0.8rem;
  }
}
</style>