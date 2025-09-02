<template>
  <div class="database-management">
    <!-- Header -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">
          <div class="title-icon">
            <i class="fas fa-database"></i>
          </div>
          Database Management
        </h1>
        <p class="page-description">Super admin database operations and system maintenance tools</p>
      </div>
      <div class="header-actions">
        <button @click="refreshStats" class="btn-outline" :disabled="isLoading.stats">
          <i :class="['fas', isLoading.stats ? 'fa-spinner fa-spin' : 'fa-sync-alt']"></i>
          Refresh Stats
        </button>
        <button @click="showHealthModal = true" class="btn-primary">
          <i class="fas fa-heartbeat"></i>
          Health Check
        </button>
      </div>
    </div>

    <!-- Stats Overview -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon database">
          <i class="fas fa-database"></i>
        </div>
        <div class="stat-content">
          <h3>{{ databaseStats.size || '245 MB' }}</h3>
          <p>Database Size</p>
          <div class="stat-change positive">+2.3% this week</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon tables">
          <i class="fas fa-table"></i>
        </div>
        <div class="stat-content">
          <h3>{{ tableStats.count || '8' }}</h3>
          <p>Active Tables</p>
          <div class="stat-change neutral">{{ tableStats.records || '1,247' }} records</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon connections">
          <i class="fas fa-plug"></i>
        </div>
        <div class="stat-content">
          <h3>{{ connectionStats.active || '12' }}</h3>
          <p>Active Connections</p>
          <div class="stat-change positive">{{ connectionStats.max || '100' }} max pool</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon performance">
          <i class="fas fa-tachometer-alt"></i>
        </div>
        <div class="stat-content">
          <h3>{{ performanceStats.avgQuery || '0.8ms' }}</h3>
          <p>Avg Query Time</p>
          <div class="stat-change positive">98.7% uptime</div>
        </div>
      </div>
    </div>

    <!-- Main Content Grid -->
    <div class="main-grid">
      <!-- Database Operations -->
      <div class="panel">
        <div class="panel-header">
          <h2>Database Operations</h2>
          <div class="panel-actions">
            <button @click="refreshOperations" class="btn-sm">
              <i class="fas fa-sync-alt"></i>
            </button>
          </div>
        </div>
        <div class="operations-grid">
          <div @click="openSeedModal" class="operation-card seed" :class="{ 'loading': isLoading.seed }">
            <div class="operation-icon">
              <i class="fas fa-seedling"></i>
            </div>
            <div class="operation-content">
              <h4>Seed Database</h4>
              <p>Add sample data for development</p>
              <span v-if="isLoading.seed" class="status">Seeding...</span>
            </div>
          </div>

          <div @click="openBackupModal" class="operation-card backup" :class="{ 'loading': isLoading.backup }">
            <div class="operation-icon">
              <i class="fas fa-download"></i>
            </div>
            <div class="operation-content">
              <h4>Backup Database</h4>
              <p>Create full database backup</p>
              <span v-if="isLoading.backup" class="status">Backing up...</span>
            </div>
          </div>

          <div @click="openRestoreModal" class="operation-card restore">
            <div class="operation-icon">
              <i class="fas fa-upload"></i>
            </div>
            <div class="operation-content">
              <h4>Restore Database</h4>
              <p>Restore from backup file</p>
            </div>
          </div>

          <div @click="openMaintenanceModal" class="operation-card maintenance" :class="{ 'loading': isLoading.maintenance }">
            <div class="operation-icon">
              <i class="fas fa-tools"></i>
            </div>
            <div class="operation-content">
              <h4>Run Maintenance</h4>
              <p>Optimize and clean database</p>
              <span v-if="isLoading.maintenance" class="status">Running...</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Table Management -->
      <div class="panel">
        <div class="panel-header">
          <h2>Table Management</h2>
          <div class="panel-actions">
            <button @click="refreshTables" class="btn-sm">
              <i class="fas fa-sync-alt"></i>
            </button>
          </div>
        </div>
        <div class="table-list">
          <div v-for="category in tableCategories" :key="category.name" class="table-category">
            <div class="category-header">
              <div class="category-label" :class="category.class">
                <i :class="category.icon"></i>
                {{ category.name }}
              </div>
              <span class="category-count">{{ category.tables.length }} tables</span>
            </div>
            <div class="category-tables">
              <div v-for="table in category.tables" :key="table.name" class="table-item">
                <div class="table-info">
                  <div class="table-name">
                    <i :class="table.icon"></i>
                    {{ table.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) }}
                  </div>
                  <div class="table-stats">
                    <span class="record-count">{{ table.recordCount }} records</span>
                    <span class="table-size">{{ table.size }}</span>
                  </div>
                </div>
                <div class="table-actions">
                  <button @click="viewTableData(table)" class="btn-sm btn-outline">
                    <i class="fas fa-eye"></i>
                  </button>
                  <button @click="optimizeTable(table)" class="btn-sm btn-outline">
                    <i class="fas fa-bolt"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- System Health Panel -->
    <div class="panel health-panel">
      <div class="panel-header">
        <h2>System Health</h2>
        <div class="health-status" :class="systemHealth.status">
          <i :class="systemHealth.icon"></i>
          {{ systemHealth.text }}
        </div>
      </div>
      <div class="health-metrics">
        <div class="metric">
          <div class="metric-label">CPU Usage</div>
          <div class="metric-bar">
            <div class="metric-fill" :style="{ width: systemHealth.cpu + '%' }"></div>
          </div>
          <div class="metric-value">{{ systemHealth.cpu }}%</div>
        </div>
        <div class="metric">
          <div class="metric-label">Memory Usage</div>
          <div class="metric-bar">
            <div class="metric-fill" :style="{ width: systemHealth.memory + '%' }"></div>
          </div>
          <div class="metric-value">{{ systemHealth.memory }}%</div>
        </div>
        <div class="metric">
          <div class="metric-label">Storage Usage</div>
          <div class="metric-bar">
            <div class="metric-fill" :style="{ width: systemHealth.storage + '%' }"></div>
          </div>
          <div class="metric-value">{{ systemHealth.storage }}%</div>
        </div>
      </div>
    </div>

    <!-- Confirmation Modal -->
    <div v-if="showConfirmModal" class="modal-overlay" @click="closeConfirmModal">
      <div class="modal-container" @click.stop>
        <div class="modal-header">
          <h3>{{ confirmModal.title }}</h3>
          <button @click="closeConfirmModal" class="modal-close">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="confirm-icon" :class="confirmModal.type">
            <i :class="confirmModal.icon"></i>
          </div>
          <div class="confirm-content">
            <p v-html="confirmModal.message"></p>
            <div v-if="confirmModal.details" class="confirm-details">
              <ul>
                <li v-for="detail in confirmModal.details" :key="detail">{{ detail }}</li>
              </ul>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closeConfirmModal" class="btn-outline">Cancel</button>
          <button @click="confirmAction" class="btn-primary" :disabled="isProcessing">
            <i v-if="isProcessing" class="fas fa-spinner fa-spin"></i>
            {{ isProcessing ? 'Processing...' : confirmModal.confirmText }}
          </button>
        </div>
      </div>
    </div>

    <!-- Result Modal -->
    <div v-if="showResultModal" class="modal-overlay" @click="closeResultModal">
      <div class="modal-container" @click.stop>
        <div class="modal-header">
          <h3>{{ resultModal.title }}</h3>
          <button @click="closeResultModal" class="modal-close">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="result-icon" :class="resultModal.type">
            <i :class="resultModal.icon"></i>
          </div>
          <div class="result-content">
            <p v-html="resultModal.message"></p>
            <div v-if="resultModal.output" class="result-output">
              <pre>{{ resultModal.output }}</pre>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closeResultModal" class="btn-primary">Close</button>
        </div>
      </div>
    </div>

    <!-- File Upload Modal -->
    <div v-if="showUploadModal" class="modal-overlay" @click="closeUploadModal">
      <div class="modal-container" @click.stop>
        <div class="modal-header">
          <h3>Restore Database</h3>
          <button @click="closeUploadModal" class="modal-close">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="upload-area" :class="{ 'drag-over': isDragOver }" 
               @dragover.prevent="isDragOver = true" 
               @dragleave.prevent="isDragOver = false"
               @drop.prevent="handleFileDrop">
            <div class="upload-icon">
              <i class="fas fa-cloud-upload-alt"></i>
            </div>
            <p>Drop your backup file here or click to browse</p>
            <input type="file" ref="fileInput" @change="handleFileSelect" accept=".sql,.backup,.dump" style="display: none">
            <button @click="$refs.fileInput.click()" class="btn-outline">Browse Files</button>
          </div>
          <div v-if="selectedFile" class="selected-file">
            <i class="fas fa-file"></i>
            <span>{{ selectedFile.name }}</span>
            <button @click="selectedFile = null" class="remove-file">
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closeUploadModal" class="btn-outline">Cancel</button>
          <button @click="performRestore" class="btn-primary" :disabled="!selectedFile || isProcessing">
            <i v-if="isProcessing" class="fas fa-spinner fa-spin"></i>
            {{ isProcessing ? 'Restoring...' : 'Restore Database' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted } from 'vue'

export default {
  name: 'DatabaseManagement',
  setup() {
    // Reactive data
    const isLoading = reactive({
      stats: false,
      seed: false,
      backup: false,
      maintenance: false
    })

    const databaseStats = ref({ size: '245 MB' })
    const tableStats = ref({ count: 8, records: '1,247' })
    const connectionStats = ref({ active: 12, max: 100 })
    const performanceStats = ref({ avgQuery: '0.8ms' })

    const systemHealth = ref({
      status: 'healthy',
      icon: 'fas fa-check-circle',
      text: 'Healthy',
      cpu: 34,
      memory: 67,
      storage: 23
    })

    const tables = ref([
      { name: 'users', icon: 'fas fa-users', recordCount: 156, size: '2.3 MB', category: 'System' },
      { name: 'organizations', icon: 'fas fa-building', recordCount: 12, size: '156 KB', category: 'System' },
      { name: 'customers', icon: 'fas fa-user-friends', recordCount: 892, size: '12.4 MB', category: 'Core' },
      { name: 'bookings', icon: 'fas fa-calendar-check', recordCount: 2134, size: '45.2 MB', category: 'Core' },
      { name: 'automotive_services', icon: 'fas fa-car', recordCount: 34, size: '445 KB', category: 'Automotive' },
      { name: 'beauty_services', icon: 'fas fa-cut', recordCount: 33, size: '445 KB', category: 'Beauty' },
      { name: 'staff', icon: 'fas fa-user-tie', recordCount: 34, size: '445 KB', category: 'Core' },
      { name: 'payments', icon: 'fas fa-credit-card', recordCount: 1876, size: '23.1 MB', category: 'Financial' },
      { name: 'audit_logs', icon: 'fas fa-history', recordCount: 15672, size: '156 MB', category: 'System' },
      { name: 'vehicle_records', icon: 'fas fa-car-side', recordCount: 567, size: '8.9 MB', category: 'Automotive' },
      { name: 'appointments', icon: 'fas fa-calendar-alt', recordCount: 1243, size: '18.7 MB', category: 'Beauty' }
    ])

    const showHealthModal = ref(false)
    const showConfirmModal = ref(false)
    const showResultModal = ref(false)
    const showUploadModal = ref(false)
    const isProcessing = ref(false)
    const isDragOver = ref(false)
    const selectedFile = ref(null)
    
    const confirmModal = reactive({
      title: '',
      message: '',
      details: [],
      icon: '',
      type: '',
      confirmText: '',
      action: null
    })
    
    const resultModal = reactive({
      title: '',
      message: '',
      output: '',
      icon: '',
      type: ''
    })

    // Computed properties
    const tableCategories = computed(() => {
      const categories = {
        'Core Business': { tables: [], icon: 'fas fa-heart', class: 'core' },
        'Automotive Services': { tables: [], icon: 'fas fa-car', class: 'automotive' },
        'Beauty Services': { tables: [], icon: 'fas fa-cut', class: 'beauty' },
        'Financial': { tables: [], icon: 'fas fa-credit-card', class: 'financial' },
        'System': { tables: [], icon: 'fas fa-cogs', class: 'system' }
      }

      tables.value.forEach(table => {
        switch (table.category) {
          case 'Core':
            categories['Core Business'].tables.push(table)
            break
          case 'Automotive':
            categories['Automotive Services'].tables.push(table)
            break
          case 'Beauty':
            categories['Beauty Services'].tables.push(table)
            break
          case 'Financial':
            categories['Financial'].tables.push(table)
            break
          case 'System':
            categories['System'].tables.push(table)
            break
        }
      })

      return Object.entries(categories)
        .filter(([, category]) => category.tables.length > 0)
        .map(([name, category]) => ({
          name,
          ...category
        }))
    })

    // Methods
    const refreshStats = async () => {
      isLoading.stats = true
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500))
        // Update stats here
      } catch (error) {
        console.error('Failed to refresh stats:', error)
      } finally {
        isLoading.stats = false
      }
    }

    const openSeedModal = () => {
      confirmModal.title = 'Seed Database'
      confirmModal.message = 'This will populate your database with test data:'
      confirmModal.details = [
        '2 Test Organizations (Sunshine Care Services, Melbourne Support Network)',
        '6 Test Users (admin@dasyin.com.au, kennedy@dasyin.com.au, etc.)',
        '30+ Test Participants with medical information',
        '1700+ Test Shifts (past month + upcoming week)',
        'Emergency Contacts and Care Plans'
      ]
      confirmModal.icon = 'fas fa-seedling'
      confirmModal.type = 'seed'
      confirmModal.confirmText = 'Seed Database'
      confirmModal.action = runSeedDatabase
      showConfirmModal.value = true
    }

    const runSeedDatabase = async () => {
      isLoading.seed = true
      try {
        const authToken = localStorage.getItem('authToken') || localStorage.getItem('token')
        
        const response = await fetch('http://localhost:8080/api/admin/seed', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken && { 'Authorization': `Bearer ${authToken}` })
          }
        })

        const result = await response.json()

        if (response.ok && result.success) {
          showResultModal.value = true
          resultModal.title = 'Database Seeded Successfully'
          resultModal.message = 'Test data has been successfully added to your database.'
          resultModal.output = result.output || 'Seeding completed successfully!'
          resultModal.icon = 'fas fa-check-circle'
          resultModal.type = 'success'
          
          await refreshStats()
        } else {
          throw new Error(result.error?.message || result.error || 'Unknown error occurred')
        }
      } catch (error) {
        console.error('Seed database failed:', error)
        
        showResultModal.value = true
        resultModal.title = 'Seeding Failed'
        resultModal.icon = 'fas fa-exclamation-circle'
        resultModal.type = 'error'
        
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
          resultModal.message = 'Failed to connect to server. Make sure the backend is running on http://localhost:8080'
        } else {
          resultModal.message = `Failed to seed database: ${error.message}`
        }
        resultModal.output = ''
      } finally {
        isLoading.seed = false
      }
    }

    const openBackupModal = () => {
      confirmModal.title = 'Backup Database'
      confirmModal.message = 'This will create a full backup of your database:'
      confirmModal.details = [
        'All organizations and their data',
        'Users, participants, and relationships',
        'Shifts, care plans, and documents',
        'System configuration and settings'
      ]
      confirmModal.icon = 'fas fa-download'
      confirmModal.type = 'backup'
      confirmModal.confirmText = 'Create Backup'
      confirmModal.action = runBackupDatabase
      showConfirmModal.value = true
    }

    const openRestoreModal = () => {
      showUploadModal.value = true
    }

    const openMaintenanceModal = () => {
      confirmModal.title = 'Run Database Maintenance'
      confirmModal.message = 'This will perform database optimization and cleanup:'
      confirmModal.details = [
        'Optimize database tables and indexes',
        'Clean up temporary data and logs',
        'Rebuild statistics for better performance',
        'Vacuum and analyze database structure'
      ]
      confirmModal.icon = 'fas fa-tools'
      confirmModal.type = 'maintenance'
      confirmModal.confirmText = 'Run Maintenance'
      confirmModal.action = runMaintenance
      showConfirmModal.value = true
    }

    const runMaintenance = async () => {
      isLoading.maintenance = true
      try {
        const authToken = localStorage.getItem('authToken') || localStorage.getItem('token')
        
        const response = await fetch('http://localhost:8080/api/admin/maintenance', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken && { 'Authorization': `Bearer ${authToken}` })
          }
        })

        const result = await response.json()

        if (response.ok && result.success) {
          showResultModal.value = true
          resultModal.title = 'Maintenance Completed'
          resultModal.message = 'Database maintenance has been completed successfully.'
          resultModal.output = result.output || 'All maintenance tasks completed successfully!'
          resultModal.icon = 'fas fa-check-circle'
          resultModal.type = 'success'
        } else {
          throw new Error(result.error?.message || result.error || 'Maintenance failed')
        }
      } catch (error) {
        console.error('Maintenance failed:', error)
        
        showResultModal.value = true
        resultModal.title = 'Maintenance Failed'
        resultModal.message = `Database maintenance failed: ${error.message}`
        resultModal.output = ''
        resultModal.icon = 'fas fa-exclamation-circle'
        resultModal.type = 'error'
      } finally {
        isLoading.maintenance = false
      }
    }

    const runBackupDatabase = async () => {
      isLoading.backup = true
      try {
        const authToken = localStorage.getItem('authToken') || localStorage.getItem('token')
        
        const response = await fetch('http://localhost:8080/api/admin/backup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken && { 'Authorization': `Bearer ${authToken}` })
          }
        })

        if (response.ok) {
          const blob = await response.blob()
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `database_backup_${new Date().toISOString().split('T')[0]}.sql`
          document.body.appendChild(a)
          a.click()
          window.URL.revokeObjectURL(url)
          document.body.removeChild(a)

          showResultModal.value = true
          resultModal.title = 'Backup Created Successfully'
          resultModal.message = 'Your database backup has been downloaded to your computer.'
          resultModal.output = `Backup file: database_backup_${new Date().toISOString().split('T')[0]}.sql`
          resultModal.icon = 'fas fa-check-circle'
          resultModal.type = 'success'
        } else {
          const result = await response.json()
          throw new Error(result.error?.message || 'Backup failed')
        }
      } catch (error) {
        console.error('Backup failed:', error)
        
        showResultModal.value = true
        resultModal.title = 'Backup Failed'
        resultModal.message = `Database backup failed: ${error.message}`
        resultModal.output = ''
        resultModal.icon = 'fas fa-exclamation-circle'
        resultModal.type = 'error'
      } finally {
        isLoading.backup = false
      }
    }

    // Modal control methods
    const closeConfirmModal = () => {
      showConfirmModal.value = false
      confirmModal.action = null
    }

    const closeResultModal = () => {
      showResultModal.value = false
      resultModal.output = ''
    }

    const closeUploadModal = () => {
      showUploadModal.value = false
      selectedFile.value = null
      isDragOver.value = false
    }

    const confirmAction = async () => {
      if (confirmModal.action) {
        isProcessing.value = true
        showConfirmModal.value = false
        await confirmModal.action()
        isProcessing.value = false
        confirmModal.action = null
      }
    }

    // File upload handlers
    const handleFileDrop = (e) => {
      isDragOver.value = false
      const files = e.dataTransfer.files
      if (files.length > 0) {
        selectedFile.value = files[0]
      }
    }

    const handleFileSelect = (e) => {
      if (e.target.files.length > 0) {
        selectedFile.value = e.target.files[0]
      }
    }

    const performRestore = async () => {
      if (!selectedFile.value) return
      
      isProcessing.value = true
      try {
        const authToken = localStorage.getItem('authToken') || localStorage.getItem('token')
        const formData = new FormData()
        formData.append('backup', selectedFile.value)
        
        const response = await fetch('http://localhost:8080/api/admin/restore', {
          method: 'POST',
          headers: {
            ...(authToken && { 'Authorization': `Bearer ${authToken}` })
          },
          body: formData
        })

        const result = await response.json()
        showUploadModal.value = false

        if (response.ok && result.success) {
          showResultModal.value = true
          resultModal.title = 'Database Restored Successfully'
          resultModal.message = 'Your database has been restored from the backup file.'
          resultModal.output = result.output || 'Database restoration completed successfully!'
          resultModal.icon = 'fas fa-check-circle'
          resultModal.type = 'success'
          
          await refreshStats()
        } else {
          throw new Error(result.error?.message || 'Restore failed')
        }
      } catch (error) {
        console.error('Restore failed:', error)
        showUploadModal.value = false
        
        showResultModal.value = true
        resultModal.title = 'Restore Failed'
        resultModal.message = `Database restore failed: ${error.message}`
        resultModal.output = ''
        resultModal.icon = 'fas fa-exclamation-circle'
        resultModal.type = 'error'
      } finally {
        isProcessing.value = false
        selectedFile.value = null
      }
    }

    const refreshOperations = () => {
      // Refresh operation status
    }

    const refreshTables = () => {
      // Refresh table information
    }

    const viewTableData = (table) => {
      // Open table data viewer modal
      console.log('Viewing table data:', table.name)
    }

    const optimizeTable = (table) => {
      // Optimize specific table
      console.log('Optimizing table:', table.name)
    }

    onMounted(() => {
      refreshStats()
    })

    return {
      isLoading,
      databaseStats,
      tableStats,
      connectionStats,
      performanceStats,
      systemHealth,
      tables,
      tableCategories,
      showHealthModal,
      showConfirmModal,
      showResultModal,
      showUploadModal,
      isProcessing,
      isDragOver,
      selectedFile,
      confirmModal,
      resultModal,
      refreshStats,
      openSeedModal,
      runSeedDatabase,
      openBackupModal,
      openRestoreModal,
      openMaintenanceModal,
      runMaintenance,
      runBackupDatabase,
      closeConfirmModal,
      closeResultModal,
      closeUploadModal,
      confirmAction,
      handleFileDrop,
      handleFileSelect,
      performRestore,
      refreshOperations,
      refreshTables,
      viewTableData,
      optimizeTable
    }
  }
}
</script>

<style scoped>
.database-management {
  padding: 2rem;
  background: var(--background);
  min-height: 100vh;
}

/* Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  background: var(--card-background);
  padding: 2rem;
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-soft);
}

.header-content {
  flex: 1;
}

.page-title {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 2rem;
  font-weight: var(--font-weight-bold);
  color: var(--text-dark);
  margin: 0 0 0.5rem 0;
  font-family: var(--font-family);
}

.title-icon {
  width: 60px;
  height: 60px;
  background: var(--primary-gradient);
  border-radius: var(--border-radius);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-white);
  font-size: 1.5rem;
}

.page-description {
  color: var(--text-medium);
  margin: 0;
  font-size: 1.1rem;
}

.header-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.btn-outline, .btn-primary, .btn-sm {
  padding: 0.75rem 1.5rem;
  border-radius: var(--border-radius-sm);
  border: none;
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: var(--transition-fast);
  text-decoration: none;
  font-family: var(--font-family);
}

.btn-outline {
  background: var(--card-background);
  color: var(--text-medium);
  border: 1px solid var(--card-border);
}

.btn-outline:hover {
  background: var(--background);
  transform: translateY(-1px);
}

.btn-primary {
  background: var(--primary-gradient);
  color: var(--text-white);
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-medium);
}

.btn-sm {
  padding: 0.5rem;
  min-width: 36px;
  justify-content: center;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: var(--card-background);
  border-radius: var(--border-radius);
  padding: 2rem;
  box-shadow: var(--shadow-soft);
  display: flex;
  align-items: center;
  gap: 1.5rem;
  transition: var(--transition-smooth);
  border: 1px solid var(--card-border);
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-medium);
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: var(--border-radius);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: var(--text-white);
}

.stat-icon.database {
  background: var(--primary-gradient);
}

.stat-icon.tables {
  background: var(--success-gradient);
}

.stat-icon.connections {
  background: var(--warning-gradient);
}

.stat-icon.performance {
  background: var(--secondary-gradient);
}

.stat-content h3 {
  font-size: 2rem;
  font-weight: var(--font-weight-bold);
  color: var(--text-dark);
  margin: 0 0 0.25rem 0;
  font-family: var(--font-family);
}

.stat-content p {
  color: var(--text-medium);
  margin: 0 0 0.5rem 0;
  font-weight: var(--font-weight-medium);
}

.stat-change {
  font-size: 0.875rem;
  font-weight: var(--font-weight-medium);
  padding: 0.25rem 0.5rem;
  border-radius: var(--border-radius-sm);
  display: inline-block;
}

.stat-change.positive {
  color: var(--success-color);
  background: rgba(79, 172, 254, 0.1);
}

.stat-change.neutral {
  color: var(--primary-color);
  background: rgba(102, 126, 234, 0.1);
}

/* Main Grid */
.main-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin-bottom: 2rem;
}

.panel {
  background: var(--card-background);
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-soft);
  overflow: hidden;
}

.panel-header {
  padding: 1.5rem 2rem;
  background: var(--background);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-header h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: var(--font-weight-bold);
  color: var(--text-dark);
  font-family: var(--font-family);
}

.panel-actions {
  display: flex;
  gap: 0.5rem;
}

/* Operations Grid */
.operations-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  padding: 1.5rem;
}

.operation-card {
  padding: 1.5rem;
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  transition: var(--transition-fast);
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 1rem;
}

.operation-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-soft);
}

.operation-card.seed {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(22, 163, 74, 0.05) 100%);
  border-color: rgba(34, 197, 94, 0.2);
}

.operation-card.backup {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.05) 100%);
  border-color: rgba(59, 130, 246, 0.2);
}

.operation-card.restore {
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(147, 51, 234, 0.05) 100%);
  border-color: rgba(168, 85, 247, 0.2);
}

.operation-card.maintenance {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 119, 6, 0.05) 100%);
  border-color: rgba(245, 158, 11, 0.2);
}

.operation-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--border-radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: var(--text-white);
  background: var(--primary-gradient);
}

.operation-content h4 {
  margin: 0 0 0.5rem 0;
  font-weight: var(--font-weight-bold);
  color: var(--text-dark);
  font-family: var(--font-family);
}

.operation-content p {
  margin: 0;
  color: var(--text-medium);
  font-size: 0.9rem;
}

.operation-card .status {
  color: var(--primary-color);
  font-size: 0.875rem;
  font-weight: var(--font-weight-medium);
}

.operation-card.loading {
  opacity: 0.7;
  cursor: not-allowed;
}

/* Table List */
.table-list {
  padding: 1.5rem;
}

.table-category {
  margin-bottom: 2rem;
}

.table-category:last-child {
  margin-bottom: 0;
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid rgba(255, 255, 255, 0.1);
}

.category-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: var(--font-weight-bold);
  font-size: 1.1rem;
  padding: 0.5rem 1rem;
  border-radius: var(--border-radius-sm);
  font-family: var(--font-family);
}

.category-label.core {
  color: var(--danger-color);
  background: rgba(250, 112, 154, 0.1);
}

.category-label.automotive {
  color: var(--primary-color);
  background: rgba(102, 126, 234, 0.1);
}

.category-label.beauty {
  color: var(--secondary-color);
  background: rgba(240, 147, 251, 0.1);
}

.category-label.financial {
  color: var(--success-color);
  background: rgba(79, 172, 254, 0.1);
}

.category-label.system {
  color: var(--warning-color);
  background: rgba(67, 233, 123, 0.1);
}

.category-count {
  font-size: 0.875rem;
  color: var(--text-medium);
  font-weight: var(--font-weight-medium);
}

.category-tables {
  border-left: 3px solid rgba(255, 255, 255, 0.1);
  padding-left: 1rem;
}

.table-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.table-item:last-child {
  border-bottom: none;
}

.table-info {
  flex: 1;
}

.table-name {
  font-weight: var(--font-weight-bold);
  color: var(--text-dark);
  margin-bottom: 0.25rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--font-family);
}

.table-name i {
  color: var(--primary-color);
}

.table-stats {
  display: flex;
  gap: 1rem;
  font-size: 0.875rem;
  color: var(--text-medium);
}

.table-actions {
  display: flex;
  gap: 0.5rem;
}

/* Health Panel */
.health-panel {
  grid-column: 1 / -1;
}

.health-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: var(--font-weight-bold);
  padding: 0.5rem 1rem;
  border-radius: var(--border-radius-sm);
  font-family: var(--font-family);
}

.health-status.healthy {
  color: var(--success-color);
  background: rgba(79, 172, 254, 0.1);
}

.health-metrics {
  padding: 1.5rem 2rem;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 2rem;
}

.metric {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.metric-label {
  font-weight: var(--font-weight-medium);
  color: var(--text-medium);
  font-size: 0.875rem;
}

.metric-bar {
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
}

.metric-fill {
  height: 100%;
  background: var(--primary-gradient);
  transition: width 0.3s ease;
}

.metric-value {
  font-weight: var(--font-weight-bold);
  color: var(--text-dark);
  font-family: var(--font-family);
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-container {
  background: var(--card-background);
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-strong);
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  padding: 1.5rem 2rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--background);
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: var(--font-weight-bold);
  color: var(--text-dark);
  font-family: var(--font-family);
}

.modal-close {
  background: none;
  border: none;
  color: var(--text-medium);
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: var(--transition-fast);
}

.modal-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-dark);
}

.modal-body {
  padding: 2rem;
  overflow-y: auto;
}

.modal-footer {
  padding: 1.5rem 2rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  background: var(--background);
}

/* Confirm Modal */
.confirm-icon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1.5rem;
  font-size: 2rem;
  color: var(--text-white);
}

.confirm-icon.seed {
  background: var(--success-gradient);
}

.confirm-icon.backup {
  background: var(--primary-gradient);
}

.confirm-icon.maintenance {
  background: var(--warning-gradient);
}

.confirm-content {
  text-align: center;
}

.confirm-content p {
  font-size: 1.1rem;
  color: var(--text-dark);
  margin-bottom: 1.5rem;
}

.confirm-details {
  text-align: left;
  background: var(--background);
  padding: 1rem;
  border-radius: var(--border-radius-sm);
  margin-top: 1rem;
}

.confirm-details ul {
  margin: 0;
  padding-left: 1.5rem;
}

.confirm-details li {
  color: var(--text-medium);
  margin-bottom: 0.5rem;
}

/* Result Modal */
.result-icon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1.5rem;
  font-size: 2rem;
  color: var(--text-white);
}

.result-icon.success {
  background: var(--success-gradient);
}

.result-icon.error {
  background: var(--danger-gradient);
}

.result-content {
  text-align: center;
}

.result-content p {
  font-size: 1.1rem;
  color: var(--text-dark);
  margin-bottom: 1rem;
}

.result-output {
  background: var(--background);
  border-radius: var(--border-radius-sm);
  padding: 1rem;
  margin-top: 1rem;
  text-align: left;
}

.result-output pre {
  margin: 0;
  font-size: 0.875rem;
  color: var(--text-medium);
  white-space: pre-wrap;
  word-break: break-all;
}

/* Upload Modal */
.upload-area {
  border: 2px dashed var(--primary-color);
  border-radius: var(--border-radius);
  padding: 3rem 2rem;
  text-align: center;
  transition: var(--transition-smooth);
  cursor: pointer;
}

.upload-area.drag-over {
  border-color: var(--success-color);
  background: rgba(79, 172, 254, 0.1);
}

.upload-icon {
  font-size: 3rem;
  color: var(--primary-color);
  margin-bottom: 1rem;
}

.upload-area p {
  color: var(--text-medium);
  margin-bottom: 1.5rem;
}

.selected-file {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--background);
  border-radius: var(--border-radius-sm);
  margin-top: 1rem;
}

.selected-file i {
  color: var(--primary-color);
}

.selected-file span {
  flex: 1;
  color: var(--text-dark);
}

.remove-file {
  background: none;
  border: none;
  color: var(--text-medium);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: var(--transition-fast);
}

.remove-file:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--danger-color);
}

/* Responsive */
@media (max-width: 1200px) {
  .main-grid {
    grid-template-columns: 1fr;
  }
  
  .operations-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .database-management {
    padding: 1rem;
  }
  
  .page-header {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .health-metrics {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .modal-container {
    margin: 0.5rem;
    max-height: 95vh;
  }

  .modal-header,
  .modal-body,
  .modal-footer {
    padding: 1rem;
  }

  .modal-footer {
    flex-direction: column;
  }

  .modal-footer button {
    width: 100%;
  }
}
</style>