<template>
  <div class="audit-logs">
    <div class="page-header">
      <h1 class="page-title">
        <i class="fas fa-history"></i>
        Audit Logs
      </h1>
      <p class="page-subtitle">Track system activities and user actions across the platform</p>
    </div>

    <!-- Filters Section -->
    <div class="filters-section">
      <div class="filter-row">
        <div class="search-box">
          <i class="fas fa-search"></i>
          <input 
            type="text" 
            placeholder="Search logs..." 
            v-model="searchTerm"
            @input="filterLogs"
          >
        </div>
        <div class="date-filters">
          <input 
            type="date" 
            v-model="startDate"
            @change="filterLogs"
            class="date-input"
          >
          <span class="date-separator">to</span>
          <input 
            type="date" 
            v-model="endDate"
            @change="filterLogs"
            class="date-input"
          >
        </div>
      </div>
      
      <div class="filter-row">
        <select v-model="selectedAction" @change="filterLogs" class="filter-select">
          <option value="">All Actions</option>
          <option value="login">Login</option>
          <option value="logout">Logout</option>
          <option value="create">Create</option>
          <option value="update">Update</option>
          <option value="delete">Delete</option>
          <option value="export">Export</option>
          <option value="backup">Backup</option>
        </select>
        
        <select v-model="selectedUser" @change="filterLogs" class="filter-select">
          <option value="">All Users</option>
          <option v-for="user in uniqueUsers" :key="user" :value="user">
            {{ user }}
          </option>
        </select>
        
        <select v-model="selectedOrganization" @change="filterLogs" class="filter-select">
          <option value="">All Organizations</option>
          <option v-for="org in uniqueOrganizations" :key="org" :value="org">
            {{ org }}
          </option>
        </select>
        
        <select v-model="selectedSeverity" @change="filterLogs" class="filter-select">
          <option value="">All Levels</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="error">Error</option>
          <option value="critical">Critical</option>
        </select>
      </div>
    </div>

    <!-- Quick Stats -->
    <div class="stats-bar">
      <div class="stat-item">
        <span class="stat-value">{{ filteredLogs.length }}</span>
        <span class="stat-label">Total Entries</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ todayLogsCount }}</span>
        <span class="stat-label">Today</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ errorLogsCount }}</span>
        <span class="stat-label">Errors</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ uniqueUsersCount }}</span>
        <span class="stat-label">Active Users</span>
      </div>
    </div>

    <!-- Logs Table -->
    <div class="logs-container">
      <table class="logs-table">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>User</th>
            <th>Organization</th>
            <th>Action</th>
            <th>Resource</th>
            <th>Level</th>
            <th>IP Address</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="log in paginatedLogs" :key="log.id" :class="log.severity">
            <td>
              <div class="timestamp">
                <div class="date">{{ formatDate(log.timestamp) }}</div>
                <div class="time">{{ formatTime(log.timestamp) }}</div>
              </div>
            </td>
            <td>
              <div class="user-info">
                <div class="user-name">{{ log.user }}</div>
                <div class="user-role">{{ log.userRole }}</div>
              </div>
            </td>
            <td>{{ log.organization }}</td>
            <td>
              <span class="action-badge" :class="log.action">
                <i :class="getActionIcon(log.action)"></i>
                {{ log.action }}
              </span>
            </td>
            <td>{{ log.resource }}</td>
            <td>
              <span class="severity-badge" :class="log.severity">
                {{ log.severity }}
              </span>
            </td>
            <td class="ip-address">{{ log.ipAddress }}</td>
            <td>
              <button class="details-btn" @click="showDetails(log)">
                <i class="fas fa-eye"></i>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div class="pagination">
      <button 
        class="page-btn" 
        :disabled="currentPage === 1"
        @click="currentPage--"
      >
        <i class="fas fa-chevron-left"></i>
        Previous
      </button>
      
      <div class="page-info">
        <span>Page {{ currentPage }} of {{ totalPages }}</span>
        <select v-model="pageSize" @change="currentPage = 1" class="page-size-select">
          <option value="25">25 per page</option>
          <option value="50">50 per page</option>
          <option value="100">100 per page</option>
        </select>
      </div>
      
      <button 
        class="page-btn" 
        :disabled="currentPage === totalPages"
        @click="currentPage++"
      >
        Next
        <i class="fas fa-chevron-right"></i>
      </button>
    </div>

    <!-- Details Modal -->
    <div v-if="showDetailsModal" class="modal-overlay" @click="closeDetailsModal">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>Log Details</h3>
          <button class="close-btn" @click="closeDetailsModal">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-content">
          <div class="detail-group">
            <label>Timestamp</label>
            <span>{{ selectedLog?.timestamp }}</span>
          </div>
          <div class="detail-group">
            <label>User</label>
            <span>{{ selectedLog?.user }} ({{ selectedLog?.userRole }})</span>
          </div>
          <div class="detail-group">
            <label>Organization</label>
            <span>{{ selectedLog?.organization }}</span>
          </div>
          <div class="detail-group">
            <label>Action</label>
            <span>{{ selectedLog?.action }}</span>
          </div>
          <div class="detail-group">
            <label>Resource</label>
            <span>{{ selectedLog?.resource }}</span>
          </div>
          <div class="detail-group">
            <label>IP Address</label>
            <span>{{ selectedLog?.ipAddress }}</span>
          </div>
          <div class="detail-group">
            <label>User Agent</label>
            <span>{{ selectedLog?.userAgent }}</span>
          </div>
          <div class="detail-group">
            <label>Description</label>
            <span>{{ selectedLog?.description }}</span>
          </div>
          <div v-if="selectedLog?.metadata" class="detail-group">
            <label>Additional Data</label>
            <pre class="metadata">{{ JSON.stringify(selectedLog.metadata, null, 2) }}</pre>
          </div>
        </div>
      </div>
    </div>

    <!-- Export Options -->
    <div class="export-section">
      <button class="btn secondary" @click="exportLogs('csv')">
        <i class="fas fa-file-csv"></i>
        Export CSV
      </button>
      <button class="btn secondary" @click="exportLogs('json')">
        <i class="fas fa-file-code"></i>
        Export JSON
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AuditLogs',
  data() {
    return {
      searchTerm: '',
      startDate: '',
      endDate: '',
      selectedAction: '',
      selectedUser: '',
      selectedOrganization: '',
      selectedSeverity: '',
      currentPage: 1,
      pageSize: 25,
      showDetailsModal: false,
      selectedLog: null,
      logs: [
        {
          id: 1,
          timestamp: '2024-01-15T14:30:25Z',
          user: 'John Doe',
          userRole: 'Admin',
          organization: 'AutoCare Plus',
          action: 'login',
          resource: 'Authentication',
          severity: 'info',
          ipAddress: '192.168.1.105',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          description: 'User successfully logged in',
          metadata: { loginMethod: 'password', remember: true }
        },
        {
          id: 2,
          timestamp: '2024-01-15T14:25:12Z',
          user: 'Jane Smith',
          userRole: 'Manager',
          organization: 'Elegant Salon',
          action: 'create',
          resource: 'Booking',
          severity: 'info',
          ipAddress: '192.168.1.108',
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          description: 'New booking created for customer Sarah Wilson',
          metadata: { bookingId: 'BK-2024-001', customerId: 'CUST-456' }
        },
        {
          id: 3,
          timestamp: '2024-01-15T14:20:45Z',
          user: 'System',
          userRole: 'System',
          organization: 'Platform',
          action: 'backup',
          resource: 'Database',
          severity: 'info',
          ipAddress: '127.0.0.1',
          userAgent: 'System/1.0',
          description: 'Automated database backup completed',
          metadata: { backupSize: '2.5GB', duration: '45s' }
        },
        {
          id: 4,
          timestamp: '2024-01-15T13:45:18Z',
          user: 'Mike Johnson',
          userRole: 'Staff',
          organization: 'Quick Fix Garage',
          action: 'update',
          resource: 'Customer',
          severity: 'info',
          ipAddress: '192.168.1.112',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          description: 'Customer information updated',
          metadata: { customerId: 'CUST-789', changes: ['phone', 'email'] }
        },
        {
          id: 5,
          timestamp: '2024-01-15T13:30:05Z',
          user: 'Anonymous',
          userRole: 'Guest',
          organization: 'Unknown',
          action: 'login',
          resource: 'Authentication',
          severity: 'warning',
          ipAddress: '203.45.67.89',
          userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
          description: 'Failed login attempt - invalid credentials',
          metadata: { attempts: 3, blocked: false }
        },
        {
          id: 6,
          timestamp: '2024-01-15T12:15:33Z',
          user: 'Admin',
          userRole: 'Super Admin',
          organization: 'Platform',
          action: 'delete',
          resource: 'User',
          severity: 'warning',
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          description: 'User account deleted by admin',
          metadata: { deletedUserId: 'USER-123', reason: 'Policy violation' }
        }
      ],
      filteredLogs: []
    }
  },
  computed: {
    uniqueUsers() {
      return [...new Set(this.logs.map(log => log.user))].sort()
    },
    uniqueOrganizations() {
      return [...new Set(this.logs.map(log => log.organization))].sort()
    },
    todayLogsCount() {
      const today = new Date().toDateString()
      return this.filteredLogs.filter(log => 
        new Date(log.timestamp).toDateString() === today
      ).length
    },
    errorLogsCount() {
      return this.filteredLogs.filter(log => 
        ['error', 'critical'].includes(log.severity)
      ).length
    },
    uniqueUsersCount() {
      return new Set(this.filteredLogs.map(log => log.user)).size
    },
    totalPages() {
      return Math.ceil(this.filteredLogs.length / this.pageSize)
    },
    paginatedLogs() {
      const start = (this.currentPage - 1) * this.pageSize
      return this.filteredLogs.slice(start, start + parseInt(this.pageSize))
    }
  },
  mounted() {
    this.filteredLogs = [...this.logs]
  },
  methods: {
    filterLogs() {
      this.filteredLogs = this.logs.filter(log => {
        const matchesSearch = log.description.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                            log.user.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                            log.resource.toLowerCase().includes(this.searchTerm.toLowerCase())
        
        const logDate = new Date(log.timestamp).toISOString().split('T')[0]
        const matchesDateRange = (!this.startDate || logDate >= this.startDate) &&
                               (!this.endDate || logDate <= this.endDate)
        
        const matchesAction = !this.selectedAction || log.action === this.selectedAction
        const matchesUser = !this.selectedUser || log.user === this.selectedUser
        const matchesOrg = !this.selectedOrganization || log.organization === this.selectedOrganization
        const matchesSeverity = !this.selectedSeverity || log.severity === this.selectedSeverity
        
        return matchesSearch && matchesDateRange && matchesAction && matchesUser && matchesOrg && matchesSeverity
      })
      
      this.currentPage = 1
    },
    showDetails(log) {
      this.selectedLog = log
      this.showDetailsModal = true
    },
    closeDetailsModal() {
      this.showDetailsModal = false
      this.selectedLog = null
    },
    getActionIcon(action) {
      const icons = {
        login: 'fas fa-sign-in-alt',
        logout: 'fas fa-sign-out-alt',
        create: 'fas fa-plus',
        update: 'fas fa-edit',
        delete: 'fas fa-trash',
        export: 'fas fa-download',
        backup: 'fas fa-database'
      }
      return icons[action] || 'fas fa-circle'
    },
    formatDate(timestamp) {
      return new Date(timestamp).toLocaleDateString()
    },
    formatTime(timestamp) {
      return new Date(timestamp).toLocaleTimeString()
    },
    exportLogs(format) {
      alert(`Exporting audit logs as ${format.toUpperCase()}...`)
    }
  }
}
</script>

<style scoped>
.audit-logs {
  padding: 2rem;
  max-width: 1600px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 2rem;
}

.page-title {
  font-size: 2rem;
  font-weight: 600;
  color: var(--bs-body-color);
  margin-bottom: 0.5rem;
}

.page-title i {
  color: #667eea;
  margin-right: 0.75rem;
}

.page-subtitle {
  color: var(--bs-secondary);
  font-size: 1.1rem;
}

.filters-section {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.filter-row {
  display: flex;
  gap: 1rem;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.filter-row:last-child {
  margin-bottom: 0;
}

.search-box {
  position: relative;
  flex: 1;
  min-width: 250px;
}

.search-box i {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--bs-secondary);
}

.search-box input {
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.5rem;
  border: 2px solid var(--card-border);
  border-radius: 8px;
  font-size: 1rem;
}

.date-filters {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.date-input {
  padding: 0.75rem;
  border: 2px solid var(--card-border);
  border-radius: 8px;
}

.date-separator {
  color: var(--bs-secondary);
  font-weight: 500;
}

.filter-select {
  padding: 0.75rem;
  border: 2px solid var(--card-border);
  border-radius: 8px;
  min-width: 150px;
}

.stats-bar {
  display: flex;
  gap: 2rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.stat-item {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--bs-body-color);
}

.stat-label {
  color: var(--bs-secondary);
  font-size: 0.9rem;
}

.logs-container {
  background: var(--card-bg);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  margin-bottom: 2rem;
}

.logs-table {
  width: 100%;
  border-collapse: collapse;
}

.logs-table th {
  background: var(--bs-tertiary-bg);
  padding: 1rem 0.75rem;
  text-align: left;
  font-weight: 600;
  color: var(--bs-body-color);
  border-bottom: 2px solid #e9ecef;
  white-space: nowrap;
}

.logs-table td {
  padding: 1rem 0.75rem;
  border-bottom: 1px solid #f1f3f4;
  vertical-align: top;
}

.logs-table tr.warning {
  background: #fff8e1;
}

.logs-table tr.error,
.logs-table tr.critical {
  background: #ffebee;
}

.timestamp {
  white-space: nowrap;
}

.timestamp .date {
  font-weight: 600;
  color: var(--bs-body-color);
}

.timestamp .time {
  color: var(--bs-secondary);
  font-size: 0.9rem;
}

.user-info .user-name {
  font-weight: 600;
  color: var(--bs-body-color);
}

.user-info .user-role {
  color: var(--bs-secondary);
  font-size: 0.85rem;
}

.action-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
}

.action-badge.login { background: #e3f2fd; color: #1976d2; }
.action-badge.logout { background: #f3e5f5; color: #7b1fa2; }
.action-badge.create { background: #e8f5e8; color: #2e7d32; }
.action-badge.update { background: #fff3e0; color: #f57c00; }
.action-badge.delete { background: #ffebee; color: #d32f2f; }
.action-badge.export { background: #e0f2f1; color: #00796b; }
.action-badge.backup { background: #fce4ec; color: #c2185b; }

.severity-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.severity-badge.info { background: #e3f2fd; color: #1976d2; }
.severity-badge.warning { background: #fff8e1; color: #f57c00; }
.severity-badge.error { background: #ffebee; color: #d32f2f; }
.severity-badge.critical { background: #f3e5f5; color: #7b1fa2; }

.ip-address {
  font-family: monospace;
  font-size: 0.9rem;
}

.details-btn {
  background: var(--bs-tertiary-bg);
  border: 1px solid var(--card-border);
  border-radius: 4px;
  padding: 0.5rem;
  cursor: pointer;
  color: #667eea;
}

.details-btn:hover {
  background: #e9ecef;
}

.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.page-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: var(--card-bg);
  border: 2px solid var(--card-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.page-btn:hover:not(:disabled) {
  border-color: #667eea;
  color: #667eea;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.page-size-select {
  padding: 0.5rem;
  border: 1px solid var(--card-border);
  border-radius: 4px;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--card-bg);
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  padding: 1.5rem;
  border-bottom: 1px solid #e9ecef;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-content {
  padding: 1.5rem;
}

.detail-group {
  display: grid;
  grid-template-columns: 150px 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
  align-items: start;
}

.detail-group label {
  font-weight: 600;
  color: var(--bs-body-color);
}

.metadata {
  background: var(--bs-tertiary-bg);
  padding: 1rem;
  border-radius: 8px;
  font-size: 0.85rem;
  overflow-x: auto;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--bs-secondary);
}

.export-section {
  display: flex;
  gap: 1rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn.secondary {
  background: var(--bs-tertiary-bg);
  color: var(--bs-secondary);
  border: 2px solid var(--card-border);
}

.btn.secondary:hover {
  background: #e9ecef;
}

@media (max-width: 1200px) {
  .logs-table {
    font-size: 0.9rem;
  }
  
  .logs-table th,
  .logs-table td {
    padding: 0.75rem 0.5rem;
  }
}

@media (max-width: 768px) {
  .audit-logs {
    padding: 1rem;
  }
  
  .filter-row {
    flex-direction: column;
    align-items: stretch;
  }
  
  .stats-bar {
    gap: 1rem;
  }
  
  .pagination {
    flex-direction: column;
    gap: 1rem;
  }
}
</style>