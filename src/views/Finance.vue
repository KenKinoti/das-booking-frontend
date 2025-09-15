<template>
  <div class="finance-page">
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-left">
          <h1 class="page-title">Finance & Accounting</h1>
          <p class="page-subtitle">Manage your financial data and generate reports</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-primary" @click="showJournalEntryModal = true">
            <i class="bi bi-plus-lg me-2"></i>
            New Entry
          </button>
        </div>
      </div>
    </div>

    <!-- Finance Overview Cards -->
    <div class="overview-section">
      <div class="row g-3">
        <div class="col-lg-3 col-md-6">
          <div class="overview-card primary">
            <div class="card-icon">
              <i class="bi bi-cash-stack"></i>
            </div>
            <div class="card-content">
              <div class="card-value">${{ formatMoney(dashboard?.total_assets || 0) }}</div>
              <div class="card-label">Total Assets</div>
              <div class="card-change positive">
                <i class="bi bi-arrow-up"></i> 5.2%
              </div>
            </div>
          </div>
        </div>
        <div class="col-lg-3 col-md-6">
          <div class="overview-card success">
            <div class="card-icon">
              <i class="bi bi-graph-up-arrow"></i>
            </div>
            <div class="card-content">
              <div class="card-value">${{ formatMoney(dashboard?.total_revenue || 0) }}</div>
              <div class="card-label">Total Revenue</div>
              <div class="card-change positive">
                <i class="bi bi-arrow-up"></i> 12.8%
              </div>
            </div>
          </div>
        </div>
        <div class="col-lg-3 col-md-6">
          <div class="overview-card warning">
            <div class="card-icon">
              <i class="bi bi-receipt"></i>
            </div>
            <div class="card-content">
              <div class="card-value">{{ dashboard?.pending_invoices || 0 }}</div>
              <div class="card-label">Pending Invoices</div>
              <div class="card-change neutral">
                <i class="bi bi-dash"></i> 0%
              </div>
            </div>
          </div>
        </div>
        <div class="col-lg-3 col-md-6">
          <div class="overview-card info">
            <div class="card-icon">
              <i class="bi bi-journal-text"></i>
            </div>
            <div class="card-content">
              <div class="card-value">{{ dashboard?.ledger_entries || 0 }}</div>
              <div class="card-label">Ledger Entries</div>
              <div class="card-change positive">
                <i class="bi bi-arrow-up"></i> New
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Navigation -->
    <div class="quick-nav-section">
      <h3 class="section-title">Financial Modules</h3>
      <div class="row g-3">
        <div class="col-lg-4 col-md-6">
          <div class="quick-nav-card" @click="navigateToInvoices">
            <div class="nav-card-icon invoices">
              <i class="bi bi-receipt"></i>
            </div>
            <div class="nav-card-content">
              <h4>Billing & Invoicing</h4>
              <p>Create and manage customer invoices</p>
              <div class="nav-card-stats">7 pending invoices</div>
            </div>
            <div class="nav-card-arrow">
              <i class="bi bi-arrow-right"></i>
            </div>
          </div>
        </div>
        <div class="col-lg-4 col-md-6">
          <div class="quick-nav-card" @click="navigateToBills">
            <div class="nav-card-icon bills">
              <i class="bi bi-receipt-cutoff"></i>
            </div>
            <div class="nav-card-content">
              <h4>Bills & Expenses</h4>
              <p>Track and manage company expenses</p>
              <div class="nav-card-stats">3 bills due this week</div>
            </div>
            <div class="nav-card-arrow">
              <i class="bi bi-arrow-right"></i>
            </div>
          </div>
        </div>
        <div class="col-lg-4 col-md-6">
          <div class="quick-nav-card" @click="navigateToBanking">
            <div class="nav-card-icon banking">
              <i class="bi bi-bank"></i>
            </div>
            <div class="nav-card-content">
              <h4>Banking & Transactions</h4>
              <p>Manage bank accounts and transactions</p>
              <div class="nav-card-stats">$45,750 available</div>
            </div>
            <div class="nav-card-arrow">
              <i class="bi bi-arrow-right"></i>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="navigation-tabs">
      <div class="nav nav-pills" role="tablist">
        <button
          class="nav-link"
          :class="{ active: activeTab === 'accounts' }"
          @click="activeTab = 'accounts'"
        >
          <i class="bi bi-list-ul"></i>
          <span class="nav-text">Chart of Accounts</span>
        </button>
        <button
          class="nav-link"
          :class="{ active: activeTab === 'journal' }"
          @click="activeTab = 'journal'"
        >
          <i class="bi bi-journal-text"></i>
          <span class="nav-text">Journal Entries</span>
        </button>
        <button
          class="nav-link"
          :class="{ active: activeTab === 'reports' }"
          @click="activeTab = 'reports'"
        >
          <i class="bi bi-graph-up"></i>
          <span class="nav-text">Reports</span>
        </button>
      </div>
    </div>

    <!-- Tab Content -->
    <div class="content-section">
      <!-- Chart of Accounts -->
      <div v-if="activeTab === 'accounts'" class="data-table-container">
        <div class="table-header">
          <h3 class="table-title">Chart of Accounts</h3>
          <div class="table-actions">
            <div class="search-box">
              <i class="bi bi-search search-icon"></i>
              <input
                type="text"
                class="search-input"
                placeholder="Search accounts..."
                v-model="searchQuery.accounts"
                @input="filterAccounts"
              >
            </div>
            <button class="btn btn-primary btn-sm" @click="showAccountModal = true">
              <i class="bi bi-plus-lg"></i>
              Add Account
            </button>
          </div>
        </div>
        <div class="data-table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th class="sortable" @click="sortTable('accounts', 'code')">
                  Code
                  <i class="bi bi-arrow-up-down sort-icon"></i>
                </th>
                <th class="sortable" @click="sortTable('accounts', 'name')">
                  Account Name
                  <i class="bi bi-arrow-up-down sort-icon"></i>
                </th>
                <th>Type</th>
                <th class="text-end">Debit Balance</th>
                <th class="text-end">Credit Balance</th>
                <th>Status</th>
                <th class="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="account in filteredAccounts" :key="account.id">
                <td class="font-mono font-weight-bold">{{ account.code }}</td>
                <td class="font-weight-medium">{{ account.name }}</td>
                <td>
                  <span class="badge badge-type" :class="`badge-${getAccountTypeBadge(account.account_type)}`">
                    {{ account.account_type }}
                  </span>
                </td>
                <td class="text-end font-mono">${{ formatMoney(account.debit_balance) }}</td>
                <td class="text-end font-mono">${{ formatMoney(account.credit_balance) }}</td>
                <td>
                  <span class="badge" :class="account.is_active ? 'badge-success' : 'badge-secondary'">
                    {{ account.is_active ? 'Active' : 'Inactive' }}
                  </span>
                </td>
                <td class="text-center">
                  <div class="action-buttons">
                    <button class="btn-action" title="Edit" @click="editAccount(account)">
                      <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn-action" title="View" @click="viewAccount(account)">
                      <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn-action" title="Delete" @click="deleteAccount(account)">
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="filteredAccounts.length === 0">
                <td colspan="7" class="text-center py-4 text-muted">
                  <i class="bi bi-search me-2"></i>
                  No accounts found matching your search
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Journal Entries -->
      <div v-if="activeTab === 'journal'" class="data-table-container">
        <div class="table-header">
          <h3 class="table-title">Journal Entries</h3>
          <div class="table-actions">
            <div class="search-box">
              <i class="bi bi-search search-icon"></i>
              <input
                type="text"
                class="search-input"
                placeholder="Search entries..."
                v-model="searchQuery.journal"
                @input="filterJournalEntries"
              >
            </div>
            <div class="filter-buttons">
              <button
                class="btn btn-outline-secondary btn-sm"
                :class="{ active: journalFilter === 'all' }"
                @click="journalFilter = 'all'"
              >
                All
              </button>
              <button
                class="btn btn-outline-secondary btn-sm"
                :class="{ active: journalFilter === 'draft' }"
                @click="journalFilter = 'draft'"
              >
                Draft
              </button>
              <button
                class="btn btn-outline-secondary btn-sm"
                :class="{ active: journalFilter === 'posted' }"
                @click="journalFilter = 'posted'"
              >
                Posted
              </button>
            </div>
            <button class="btn btn-primary btn-sm" @click="showJournalEntryModal = true">
              <i class="bi bi-plus-lg"></i>
              New Entry
            </button>
          </div>
        </div>
        <div class="data-table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th class="sortable" @click="sortTable('journal', 'entry_number')">
                  Entry #
                  <i class="bi bi-arrow-up-down sort-icon"></i>
                </th>
                <th class="sortable" @click="sortTable('journal', 'date')">
                  Date
                  <i class="bi bi-arrow-up-down sort-icon"></i>
                </th>
                <th>Description</th>
                <th>Reference</th>
                <th class="text-end">Total Debit</th>
                <th class="text-end">Total Credit</th>
                <th>Status</th>
                <th class="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="entry in filteredJournalEntries" :key="entry.id">
                <td class="font-mono font-weight-bold">{{ entry.entry_number }}</td>
                <td class="font-mono">{{ formatDate(entry.date) }}</td>
                <td>{{ entry.description }}</td>
                <td class="font-mono">{{ entry.reference }}</td>
                <td class="text-end font-mono">${{ formatMoney(entry.total_debit) }}</td>
                <td class="text-end font-mono">${{ formatMoney(entry.total_credit) }}</td>
                <td>
                  <span class="badge" :class="entry.status === 'posted' ? 'badge-success' : 'badge-warning'">
                    {{ entry.status }}
                  </span>
                </td>
                <td class="text-center">
                  <div class="action-buttons">
                    <button v-if="entry.status === 'draft'" class="btn-action btn-success" @click="postJournalEntry(entry.id)">
                      <i class="bi bi-check-lg"></i>
                    </button>
                    <button v-if="entry.status === 'draft'" class="btn-action" title="Edit" @click="editJournalEntry(entry)">
                      <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn-action" title="View" @click="viewJournalEntry(entry)">
                      <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn-action" title="Delete" @click="deleteJournalEntry(entry)">
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="filteredJournalEntries.length === 0">
                <td colspan="8" class="text-center py-4 text-muted">
                  <i class="bi bi-search me-2"></i>
                  No journal entries found
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Reports -->
      <div v-if="activeTab === 'reports'" class="reports-container">
        <div class="row g-4">
          <div class="col-lg-6">
            <div class="report-card">
              <div class="report-header">
                <h4 class="report-title">
                  <i class="bi bi-balance-scale me-2"></i>
                  Trial Balance
                </h4>
                <button class="btn btn-outline-primary btn-sm" @click="loadTrialBalance">
                  <i class="bi bi-arrow-clockwise me-1"></i>
                  Generate
                </button>
              </div>
              <div class="report-content">
                <div v-if="trialBalance.length > 0" class="report-table-wrapper">
                  <table class="report-table">
                    <thead>
                      <tr>
                        <th>Account</th>
                        <th class="text-end">Debit</th>
                        <th class="text-end">Credit</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="account in trialBalance" :key="account.id">
                        <td>{{ account.name }}</td>
                        <td class="text-end font-mono">${{ formatMoney(account.debit_balance) }}</td>
                        <td class="text-end font-mono">${{ formatMoney(account.credit_balance) }}</td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr class="totals-row">
                        <th>Total</th>
                        <th class="text-end font-mono">${{ formatMoney(getTotalDebits()) }}</th>
                        <th class="text-end font-mono">${{ formatMoney(getTotalCredits()) }}</th>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <div v-else class="empty-state">
                  <i class="bi bi-balance-scale"></i>
                  <p>Click Generate to view Trial Balance</p>
                </div>
              </div>
            </div>
          </div>

          <div class="col-lg-6">
            <div class="report-card">
              <div class="report-header">
                <h4 class="report-title">
                  <i class="bi bi-file-earmark-bar-graph me-2"></i>
                  Balance Sheet
                </h4>
                <button class="btn btn-outline-primary btn-sm" @click="loadBalanceSheet">
                  <i class="bi bi-arrow-clockwise me-1"></i>
                  Generate
                </button>
              </div>
              <div class="report-content">
                <div v-if="balanceSheet" class="balance-sheet">
                  <div class="balance-section">
                    <h6 class="section-title">Assets</h6>
                    <div v-for="asset in balanceSheet.assets?.current" :key="asset.account_code" class="balance-line">
                      <span>{{ asset.account_name }}</span>
                      <span class="font-mono">${{ formatMoney(asset.amount) }}</span>
                    </div>
                    <div class="balance-total">
                      <span>Total Assets</span>
                      <span class="font-mono">${{ formatMoney(balanceSheet.total_assets) }}</span>
                    </div>
                  </div>
                </div>
                <div v-else class="empty-state">
                  <i class="bi bi-file-earmark-bar-graph"></i>
                  <p>Click Generate to view Balance Sheet</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Invoices -->
    </div>

    <!-- Modals -->
    <!-- Journal Entry Modal -->
    <div v-if="showJournalEntryModal" class="modal fade show d-block" tabindex="-1" style="background: rgba(0,0,0,0.5)">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi bi-journal-plus me-2"></i>
              New Journal Entry
            </h5>
            <button type="button" class="btn-close" @click="showJournalEntryModal = false"></button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="createJournalEntry">
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">Date</label>
                  <input type="date" class="form-control" v-model="newJournalEntry.date" required>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Reference</label>
                  <input type="text" class="form-control" v-model="newJournalEntry.reference" placeholder="REF-001">
                </div>
                <div class="col-12">
                  <label class="form-label">Description</label>
                  <input type="text" class="form-control" v-model="newJournalEntry.description" required placeholder="Transaction description">
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showJournalEntryModal = false">Cancel</button>
            <button type="button" class="btn btn-primary" @click="createJournalEntry">Save Entry</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Account Modal -->
    <div v-if="showAccountModal" class="modal fade show d-block" tabindex="-1" style="background: rgba(0,0,0,0.5)">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi bi-plus-circle me-2"></i>
              Add New Account
            </h5>
            <button type="button" class="btn-close" @click="showAccountModal = false"></button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="createAccount">
              <div class="mb-3">
                <label class="form-label">Account Code</label>
                <input type="text" class="form-control" v-model="newAccount.code" required placeholder="1000">
              </div>
              <div class="mb-3">
                <label class="form-label">Account Name</label>
                <input type="text" class="form-control" v-model="newAccount.name" required placeholder="Cash">
              </div>
              <div class="mb-3">
                <label class="form-label">Account Type</label>
                <select class="form-select" v-model="newAccount.account_type" required>
                  <option value="">Select Type</option>
                  <option value="Asset">Asset</option>
                  <option value="Liability">Liability</option>
                  <option value="Equity">Equity</option>
                  <option value="Revenue">Revenue</option>
                  <option value="Expense">Expense</option>
                </select>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showAccountModal = false">Cancel</button>
            <button type="button" class="btn btn-primary" @click="createAccount">Create Account</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { globalTheme } from '../composables/useTheme'

export default {
  name: 'Finance',
  setup() {
    const { isDark } = globalTheme
    const router = useRouter()

    // State
    const activeTab = ref('accounts')
    const loading = ref(false)
    const dashboard = ref(null)
    const chartOfAccounts = ref([])
    const journalEntries = ref([])
    const trialBalance = ref([])
    const balanceSheet = ref(null)

    // Search and filtering
    const searchQuery = ref({
      accounts: '',
      journal: ''
    })
    const journalFilter = ref('all')
    const sortConfig = ref({
      table: '',
      column: '',
      direction: 'asc'
    })

    // Modals
    const showJournalEntryModal = ref(false)
    const showAccountModal = ref(false)

    // Forms
    const newJournalEntry = ref({
      date: new Date().toISOString().split('T')[0],
      description: '',
      reference: ''
    })

    const newAccount = ref({
      code: '',
      name: '',
      account_type: ''
    })

    // Computed properties for filtering
    const filteredAccounts = computed(() => {
      let filtered = chartOfAccounts.value

      if (searchQuery.value.accounts) {
        const query = searchQuery.value.accounts.toLowerCase()
        filtered = filtered.filter(account =>
          account.code.toLowerCase().includes(query) ||
          account.name.toLowerCase().includes(query) ||
          account.account_type.toLowerCase().includes(query)
        )
      }

      return filtered
    })

    const filteredJournalEntries = computed(() => {
      let filtered = journalEntries.value

      if (journalFilter.value !== 'all') {
        filtered = filtered.filter(entry => entry.status === journalFilter.value)
      }

      if (searchQuery.value.journal) {
        const query = searchQuery.value.journal.toLowerCase()
        filtered = filtered.filter(entry =>
          entry.entry_number.toLowerCase().includes(query) ||
          entry.description.toLowerCase().includes(query) ||
          entry.reference.toLowerCase().includes(query)
        )
      }

      return filtered
    })

    // Mock data initialization
    onMounted(() => {
      // Mock chart of accounts
      chartOfAccounts.value = [
        { id: 1, code: '1000', name: 'Cash', account_type: 'Asset', debit_balance: 15000, credit_balance: 0, is_active: true },
        { id: 2, code: '1200', name: 'Accounts Receivable', account_type: 'Asset', debit_balance: 8500, credit_balance: 0, is_active: true },
        { id: 3, code: '1300', name: 'Inventory', account_type: 'Asset', debit_balance: 12000, credit_balance: 0, is_active: true },
        { id: 4, code: '2000', name: 'Accounts Payable', account_type: 'Liability', debit_balance: 0, credit_balance: 5200, is_active: true },
        { id: 5, code: '2100', name: 'Notes Payable', account_type: 'Liability', debit_balance: 0, credit_balance: 8000, is_active: true },
        { id: 6, code: '3000', name: 'Owner Equity', account_type: 'Equity', debit_balance: 0, credit_balance: 18300, is_active: true },
        { id: 7, code: '4000', name: 'Service Revenue', account_type: 'Revenue', debit_balance: 0, credit_balance: 12000, is_active: true },
        { id: 8, code: '4100', name: 'Sales Revenue', account_type: 'Revenue', debit_balance: 0, credit_balance: 15000, is_active: true },
        { id: 9, code: '5000', name: 'Office Expenses', account_type: 'Expense', debit_balance: 2100, credit_balance: 0, is_active: true },
        { id: 10, code: '5100', name: 'Rent Expense', account_type: 'Expense', debit_balance: 1800, credit_balance: 0, is_active: true },
      ]

      // Mock journal entries
      journalEntries.value = [
        { id: 1, entry_number: 'JE001', date: '2024-01-15', description: 'Initial capital investment', reference: 'REF001', total_debit: 15000, total_credit: 15000, status: 'posted' },
        { id: 2, entry_number: 'JE002', date: '2024-01-16', description: 'Service revenue', reference: 'REF002', total_debit: 3000, total_credit: 3000, status: 'posted' },
        { id: 3, entry_number: 'JE003', date: '2024-01-17', description: 'Office supplies purchase', reference: 'REF003', total_debit: 500, total_credit: 500, status: 'draft' },
        { id: 4, entry_number: 'JE004', date: '2024-01-18', description: 'Rent payment for January', reference: 'REF004', total_debit: 1800, total_credit: 1800, status: 'posted' },
        { id: 5, entry_number: 'JE005', date: '2024-01-19', description: 'Equipment purchase', reference: 'REF005', total_debit: 5000, total_credit: 5000, status: 'draft' },
      ]

      // Mock dashboard data
      dashboard.value = {
        total_assets: 35500,
        total_revenue: 27000,
        pending_invoices: 7,
        ledger_entries: 156
      }
    })

    // Methods
    const loadTrialBalance = () => {
      trialBalance.value = chartOfAccounts.value
    }

    const loadBalanceSheet = () => {
      balanceSheet.value = {
        assets: {
          current: [
            { account_code: '1000', account_name: 'Cash', amount: 15000 },
            { account_code: '1200', account_name: 'Accounts Receivable', amount: 8500 },
            { account_code: '1300', account_name: 'Inventory', amount: 12000 }
          ]
        },
        total_assets: 35500
      }
    }

    const postJournalEntry = (entryId) => {
      const entry = journalEntries.value.find(e => e.id === entryId)
      if (entry) entry.status = 'posted'
    }

    const createJournalEntry = () => {
      const newId = Math.max(...journalEntries.value.map(e => e.id)) + 1
      const newEntryNumber = `JE${String(newId).padStart(3, '0')}`

      journalEntries.value.push({
        id: newId,
        entry_number: newEntryNumber,
        date: newJournalEntry.value.date,
        description: newJournalEntry.value.description,
        reference: newJournalEntry.value.reference,
        total_debit: 0,
        total_credit: 0,
        status: 'draft'
      })

      showJournalEntryModal.value = false
      // Reset form
      newJournalEntry.value = {
        date: new Date().toISOString().split('T')[0],
        description: '',
        reference: ''
      }
    }

    const createAccount = () => {
      const newId = Math.max(...chartOfAccounts.value.map(a => a.id)) + 1

      chartOfAccounts.value.push({
        id: newId,
        code: newAccount.value.code,
        name: newAccount.value.name,
        account_type: newAccount.value.account_type,
        debit_balance: 0,
        credit_balance: 0,
        is_active: true
      })

      showAccountModal.value = false
      // Reset form
      newAccount.value = {
        code: '',
        name: '',
        account_type: ''
      }
    }

    const sortTable = (table, column) => {
      if (sortConfig.value.table === table && sortConfig.value.column === column) {
        sortConfig.value.direction = sortConfig.value.direction === 'asc' ? 'desc' : 'asc'
      } else {
        sortConfig.value = { table, column, direction: 'asc' }
      }

      const data = table === 'accounts' ? chartOfAccounts : journalEntries
      data.value.sort((a, b) => {
        let aVal = a[column]
        let bVal = b[column]

        if (typeof aVal === 'string') {
          aVal = aVal.toLowerCase()
          bVal = bVal.toLowerCase()
        }

        if (sortConfig.value.direction === 'asc') {
          return aVal > bVal ? 1 : -1
        } else {
          return aVal < bVal ? 1 : -1
        }
      })
    }

    const getTotalDebits = () => {
      return trialBalance.value.reduce((sum, account) => sum + (account.debit_balance || 0), 0)
    }

    const getTotalCredits = () => {
      return trialBalance.value.reduce((sum, account) => sum + (account.credit_balance || 0), 0)
    }

    const formatMoney = (amount) => {
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount || 0)
    }

    const formatDate = (date) => {
      return new Date(date).toLocaleDateString()
    }

    const getAccountTypeBadge = (type) => {
      const badges = {
        'Asset': 'primary',
        'Liability': 'warning',
        'Equity': 'info',
        'Revenue': 'success',
        'Expense': 'danger'
      }
      return badges[type] || 'secondary'
    }

    const filterAccounts = () => {
      // Filtering is handled by computed property
    }

    const filterJournalEntries = () => {
      // Filtering is handled by computed property
    }

    // Navigation methods
    const navigateToInvoices = () => {
      router.push('/invoices')
    }

    const navigateToBills = () => {
      router.push('/bills')
    }

    const navigateToBanking = () => {
      router.push('/banking')
    }

    // CRUD Methods for Accounts
    const editAccount = (account) => {
      newAccount.value = { ...account }
      showAccountModal.value = true
    }

    const viewAccount = (account) => {
      // For now, show a simple alert with account details
      alert(`Account Details:\nCode: ${account.code}\nName: ${account.name}\nType: ${account.account_type}\nDebit Balance: $${formatMoney(account.debit_balance)}\nCredit Balance: $${formatMoney(account.credit_balance)}`)
    }

    const deleteAccount = (account) => {
      if (confirm(`Are you sure you want to delete account "${account.name}"?`)) {
        const index = chartOfAccounts.value.findIndex(a => a.id === account.id)
        if (index > -1) {
          chartOfAccounts.value.splice(index, 1)
        }
      }
    }

    // CRUD Methods for Journal Entries
    const editJournalEntry = (entry) => {
      newJournalEntry.value = { ...entry }
      showJournalEntryModal.value = true
    }

    const viewJournalEntry = (entry) => {
      alert(`Journal Entry Details:\nEntry Number: ${entry.entry_number}\nDate: ${formatDate(entry.date)}\nDescription: ${entry.description}\nReference: ${entry.reference}\nDebit: $${formatMoney(entry.total_debit)}\nCredit: $${formatMoney(entry.total_credit)}\nStatus: ${entry.status}`)
    }

    const deleteJournalEntry = (entry) => {
      if (confirm(`Are you sure you want to delete journal entry "${entry.entry_number}"?`)) {
        const index = journalEntries.value.findIndex(e => e.id === entry.id)
        if (index > -1) {
          journalEntries.value.splice(index, 1)
        }
      }
    }

    return {
      // State
      isDark,
      activeTab,
      loading,
      dashboard,
      chartOfAccounts,
      journalEntries,
      trialBalance,
      balanceSheet,

      // Search and filtering
      searchQuery,
      journalFilter,
      filteredAccounts,
      filteredJournalEntries,

      // Modals
      showJournalEntryModal,
      showAccountModal,

      // Forms
      newJournalEntry,
      newAccount,

      // Methods
      loadTrialBalance,
      loadBalanceSheet,
      postJournalEntry,
      createJournalEntry,
      createAccount,
      sortTable,
      filterAccounts,
      filterJournalEntries,
      getTotalDebits,
      getTotalCredits,
      formatMoney,
      formatDate,
      getAccountTypeBadge,
      navigateToInvoices,
      navigateToBills,
      navigateToBanking,

      // CRUD Methods
      editAccount,
      viewAccount,
      deleteAccount,
      editJournalEntry,
      viewJournalEntry,
      deleteJournalEntry
    }
  }
}
</script>

<style scoped>
/* Enhanced design system with dark theme support */
:root {
  --primary-color: #2563eb;
  --primary-light: #dbeafe;
  --success-color: #059669;
  --success-light: #d1fae5;
  --warning-color: #d97706;
  --warning-light: #fef3c7;
  --danger-color: #dc2626;
  --danger-light: #fee2e2;
  --gray-50: #f9fafb;
  --gray-100: #f3f4f6;
  --gray-200: #e5e7eb;
  --gray-300: #d1d5db;
  --gray-400: #9ca3af;
  --gray-500: #6b7280;
  --gray-600: #4b5563;
  --gray-700: #374151;
  --gray-800: #1f2937;
  --gray-900: #111827;
}

.finance-page {
  min-height: 100vh;
  background: var(--gray-50);
  color: var(--gray-900);
  transition: all 0.3s ease;
}

/* Dark Theme */
[data-theme="dark"] .finance-page {
  background: var(--gray-900);
  color: var(--gray-100);
}

[data-theme="dark"] .page-header {
  background: var(--gray-800);
  border-bottom-color: var(--gray-700);
}

[data-theme="dark"] .page-title {
  color: var(--gray-100);
}

[data-theme="dark"] .page-subtitle {
  color: var(--gray-400);
}

[data-theme="dark"] .overview-card {
  background: var(--gray-800);
  border-color: var(--gray-700);
}

[data-theme="dark"] .nav-pills {
  background: var(--gray-800);
  border-color: var(--gray-700);
}

[data-theme="dark"] .nav-link {
  color: var(--gray-300);
}

[data-theme="dark"] .nav-link:hover {
  background: var(--gray-700);
  color: var(--gray-100);
}

[data-theme="dark"] .data-table-container,
[data-theme="dark"] .report-card {
  background: var(--gray-800);
  border-color: var(--gray-700);
}

[data-theme="dark"] .table-header,
[data-theme="dark"] .report-header {
  background: var(--gray-750);
  border-bottom-color: var(--gray-700);
}

[data-theme="dark"] .table-title,
[data-theme="dark"] .report-title {
  color: var(--gray-100);
}

[data-theme="dark"] .data-table th {
  background: var(--gray-750);
  color: var(--gray-300);
  border-bottom-color: var(--gray-700);
}

[data-theme="dark"] .data-table td {
  color: var(--gray-200);
  border-bottom-color: var(--gray-700);
}

[data-theme="dark"] .data-table tbody tr:hover {
  background: var(--gray-750);
}

/* Page Header */
.page-header {
  background: white;
  border-bottom: 1px solid var(--gray-200);
  padding: 1.5rem 2rem;
  margin-bottom: 2rem;
  transition: all 0.3s ease;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1400px;
  margin: 0 auto;
}

.page-title {
  font-size: 1.875rem;
  font-weight: 700;
  color: var(--gray-900);
  margin: 0;
}

.page-subtitle {
  font-size: 1rem;
  color: var(--gray-500);
  margin: 0.25rem 0 0 0;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

/* Overview Cards */
.overview-section {
  padding: 0 2rem;
  margin-bottom: 2rem;
  max-width: 1400px;
  margin-left: auto;
  margin-right: auto;
}

.overview-card {
  background: white;
  border-radius: 0.75rem;
  padding: 1.5rem;
  border: 1px solid var(--gray-200);
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: all 0.2s ease;
}

.overview-card:hover {
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.card-icon {
  width: 3rem;
  height: 3rem;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: white;
}

.overview-card.primary .card-icon { background: var(--primary-color); }
.overview-card.success .card-icon { background: var(--success-color); }
.overview-card.warning .card-icon { background: var(--warning-color); }
.overview-card.info .card-icon { background: #0ea5e9; }

.card-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--gray-900);
  line-height: 1.2;
}

.card-label {
  font-size: 0.875rem;
  color: var(--gray-500);
  margin: 0.25rem 0;
}

.card-change {
  font-size: 0.75rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.card-change.positive { color: var(--success-color); }
.card-change.negative { color: var(--danger-color); }
.card-change.neutral { color: var(--gray-400); }

/* Quick Navigation */
.quick-nav-section {
  padding: 0 2rem;
  margin-bottom: 2rem;
  max-width: 1400px;
  margin-left: auto;
  margin-right: auto;
}

.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--gray-900);
  margin-bottom: 1rem;
}

.quick-nav-card {
  background: white;
  border-radius: 0.75rem;
  padding: 1.5rem;
  border: 1px solid var(--gray-200);
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: all 0.2s ease;
  cursor: pointer;
  height: 100%;
}

.quick-nav-card:hover {
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
  border-color: var(--primary-color);
}

.nav-card-icon {
  width: 3rem;
  height: 3rem;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: white;
  flex-shrink: 0;
}

.nav-card-icon.invoices { background: linear-gradient(135deg, #3b82f6, #1d4ed8); }
.nav-card-icon.bills { background: linear-gradient(135deg, #f59e0b, #d97706); }
.nav-card-icon.banking { background: linear-gradient(135deg, #059669, #047857); }

.nav-card-content {
  flex: 1;
}

.nav-card-content h4 {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--gray-900);
  margin: 0 0 0.25rem 0;
}

.nav-card-content p {
  font-size: 0.875rem;
  color: var(--gray-500);
  margin: 0 0 0.5rem 0;
}

.nav-card-stats {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--primary-color);
  background: var(--primary-light);
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
  display: inline-block;
}

.nav-card-arrow {
  color: var(--gray-400);
  font-size: 1.25rem;
  transition: all 0.2s ease;
}

.quick-nav-card:hover .nav-card-arrow {
  color: var(--primary-color);
  transform: translateX(0.25rem);
}

/* Dark theme for quick navigation */
[data-theme="dark"] .section-title {
  color: var(--gray-100);
}

[data-theme="dark"] .quick-nav-card {
  background: var(--gray-800);
  border-color: var(--gray-700);
}

[data-theme="dark"] .quick-nav-card:hover {
  border-color: var(--primary-color);
  background: var(--gray-750);
}

[data-theme="dark"] .nav-card-content h4 {
  color: var(--gray-100);
}

[data-theme="dark"] .nav-card-content p {
  color: var(--gray-400);
}

/* Navigation */
.navigation-tabs {
  padding: 0 2rem;
  margin-bottom: 2rem;
  max-width: 1400px;
  margin-left: auto;
  margin-right: auto;
}

.nav-pills {
  background: white;
  border-radius: 0.75rem;
  padding: 0.5rem;
  border: 1px solid var(--gray-200);
  gap: 0.25rem;
  display: flex;
  flex-wrap: wrap;
}

.nav-link {
  background: transparent;
  border: none;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  color: var(--gray-600);
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.nav-link:hover {
  background: var(--gray-100);
  color: var(--gray-900);
}

.nav-link.active {
  background: var(--primary-color);
  color: white;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

/* Content Section */
.content-section {
  padding: 0 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

/* Data Tables */
.data-table-container {
  background: white;
  border-radius: 0.75rem;
  border: 1px solid var(--gray-200);
  overflow: hidden;
  transition: all 0.3s ease;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid var(--gray-200);
  background: var(--gray-50);
  flex-wrap: wrap;
  gap: 1rem;
}

.table-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--gray-900);
  margin: 0;
}

.table-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  color: var(--gray-400);
  font-size: 0.875rem;
}

.search-input {
  background: white;
  border: 1px solid var(--gray-300);
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem 0.5rem 2.5rem;
  font-size: 0.875rem;
  min-width: 200px;
  transition: all 0.2s ease;
}

.search-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.filter-buttons {
  display: flex;
  gap: 0.25rem;
}

.filter-buttons .btn.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.data-table-wrapper {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 800px;
}

.data-table th {
  background: var(--gray-50);
  padding: 0.75rem 1rem;
  text-align: left;
  font-weight: 600;
  color: var(--gray-700);
  font-size: 0.875rem;
  border-bottom: 1px solid var(--gray-200);
  white-space: nowrap;
}

.data-table th.sortable {
  cursor: pointer;
  user-select: none;
  position: relative;
}

.sort-icon {
  margin-left: 0.5rem;
  font-size: 0.75rem;
  color: var(--gray-400);
}

.data-table td {
  padding: 1rem;
  border-bottom: 1px solid var(--gray-100);
  font-size: 0.875rem;
  color: var(--gray-900);
}

.data-table tbody tr:hover {
  background: var(--gray-50);
}

/* Typography utilities */
.font-mono { font-family: ui-monospace, 'Cascade Code', monospace; }
.font-weight-bold { font-weight: 700; }
.font-weight-medium { font-weight: 500; }

/* Badges */
.badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 500;
  border-radius: 0.375rem;
}

.badge-type {
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.badge-primary { background: var(--primary-light); color: var(--primary-color); }
.badge-success { background: var(--success-light); color: var(--success-color); }
.badge-warning { background: var(--warning-light); color: var(--warning-color); }
.badge-danger { background: var(--danger-light); color: var(--danger-color); }
.badge-info { background: #e0f2fe; color: #0ea5e9; }
.badge-secondary { background: var(--gray-100); color: var(--gray-600); }

/* Action Buttons */
.action-buttons {
  display: flex;
  gap: 0.25rem;
}

.btn-action {
  background: none;
  border: 1px solid var(--gray-300);
  width: 2rem;
  height: 2rem;
  border-radius: 0.375rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--gray-500);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-action:hover {
  background: var(--gray-100);
  color: var(--gray-700);
  border-color: var(--gray-400);
}

.btn-action.btn-success {
  background: var(--success-color);
  border-color: var(--success-color);
  color: white;
}

/* Reports */
.report-card {
  background: white;
  border-radius: 0.75rem;
  border: 1px solid var(--gray-200);
  overflow: hidden;
  height: fit-content;
  transition: all 0.3s ease;
}

.report-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid var(--gray-200);
  background: var(--gray-50);
}

.report-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--gray-900);
  margin: 0;
  display: flex;
  align-items: center;
}

.report-content {
  padding: 1.5rem;
  min-height: 300px;
}

.report-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.report-table th,
.report-table td {
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--gray-200);
}

.report-table th {
  font-weight: 600;
  color: var(--gray-700);
}

.totals-row {
  border-top: 2px solid var(--gray-300);
  font-weight: 600;
}

.balance-section {
  margin-bottom: 1.5rem;
}

.section-title {
  font-weight: 600;
  color: var(--gray-900);
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--gray-200);
}

.balance-line {
  display: flex;
  justify-content: space-between;
  padding: 0.25rem 0;
  color: var(--gray-600);
}

.balance-total {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-top: 1px solid var(--gray-300);
  font-weight: 600;
  color: var(--gray-900);
  margin-top: 0.5rem;
}

/* Empty States */
.empty-state {
  text-align: center;
  padding: 2rem;
  color: var(--gray-500);
}

.empty-state i {
  font-size: 2rem;
  margin-bottom: 0.5rem;
  display: block;
}

.empty-state-large {
  text-align: center;
  padding: 4rem 2rem;
  color: var(--gray-500);
}

.empty-state-large i {
  font-size: 4rem;
  margin-bottom: 1rem;
  display: block;
}

.empty-state-large h4 {
  color: var(--gray-900);
  margin-bottom: 0.5rem;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-weight: 500;
  font-size: 0.875rem;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
}

.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.8125rem;
}

.btn-primary {
  background: var(--primary-color);
  color: white;
}

.btn-primary:hover {
  background: #1d4ed8;
}

.btn-outline-primary {
  color: var(--primary-color);
  border-color: var(--primary-color);
}

.btn-outline-primary:hover {
  background: var(--primary-color);
  color: white;
}

.btn-outline-secondary {
  color: var(--gray-600);
  border-color: var(--gray-300);
  background: white;
}

.btn-outline-secondary:hover {
  background: var(--gray-100);
  color: var(--gray-900);
}

.btn-secondary {
  background: var(--gray-200);
  color: var(--gray-900);
}

.btn-secondary:hover {
  background: var(--gray-300);
}

.btn-dark {
  background: var(--gray-800);
  color: white;
}

.btn-dark:hover {
  background: var(--gray-900);
}

/* Modal Styles */
.modal-content {
  border: none;
  border-radius: 0.75rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.modal-header {
  background: var(--gray-50);
  border-bottom: 1px solid var(--gray-200);
  border-radius: 0.75rem 0.75rem 0 0;
}

.form-control,
.form-select {
  border: 1px solid var(--gray-300);
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem;
  transition: all 0.2s ease;
}

.form-control:focus,
.form-select:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.form-label {
  font-weight: 500;
  color: var(--gray-700);
  margin-bottom: 0.5rem;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .overview-section,
  .navigation-tabs,
  .content-section {
    padding: 0 1rem;
  }

  .data-table {
    min-width: 600px;
  }
}

@media (max-width: 768px) {
  .page-header {
    padding: 1rem;
  }

  .header-content {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .header-actions {
    justify-content: center;
  }

  .overview-card {
    flex-direction: column;
    text-align: center;
    padding: 1rem;
  }

  .card-value {
    font-size: 1.25rem;
  }

  .nav-pills {
    flex-direction: column;
    gap: 0.25rem;
  }

  .nav-link .nav-text {
    display: none;
  }

  .table-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .table-actions {
    justify-content: stretch;
    flex-direction: column;
  }

  .search-input {
    min-width: 100%;
  }

  .data-table {
    font-size: 0.8125rem;
    min-width: 500px;
  }

  .data-table th,
  .data-table td {
    padding: 0.5rem 0.75rem;
  }
}

@media (max-width: 480px) {
  .overview-section,
  .navigation-tabs,
  .content-section {
    padding: 0 0.5rem;
  }

  .page-header {
    padding: 1rem 0.5rem;
  }

  .nav-link {
    padding: 0.5rem;
    justify-content: center;
  }

  .data-table {
    min-width: 400px;
    font-size: 0.75rem;
  }
}
</style>