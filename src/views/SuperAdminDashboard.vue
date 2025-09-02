<template>
  <div class="super-admin-dashboard">
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">
          <div class="title-icon">
            <i class="fas fa-crown"></i>
          </div>
          Super Admin Dashboard
        </h1>
        <p class="page-description">System-wide control, monitoring, and management portal</p>
      </div>
      <div class="header-actions">
        <button @click="showSystemHealthModal = true" class="btn btn-outline">
          <i class="fas fa-heartbeat"></i>
          System Health
        </button>
        <button @click="refreshDashboard" class="btn btn-primary" :disabled="isRefreshing">
          <i :class="['fas', isRefreshing ? 'fa-spinner fa-spin' : 'fa-sync-alt']"></i>
          {{ isRefreshing ? 'Refreshing...' : 'Refresh' }}
        </button>
      </div>
    </div>

    <!-- Quick Stats -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon organizations">
          <i class="fas fa-building"></i>
        </div>
        <div class="stat-content">
          <h3>{{ stats.organizations }}</h3>
          <p>Active Organizations</p>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon users">
          <i class="fas fa-users"></i>
        </div>
        <div class="stat-content">
          <h3>{{ stats.totalUsers }}</h3>
          <p>Total Users</p>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon bookings">
          <i class="fas fa-calendar-check"></i>
        </div>
        <div class="stat-content">
          <h3>{{ stats.totalBookings }}</h3>
          <p>Total Bookings</p>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon revenue">
          <i class="fas fa-dollar-sign"></i>
        </div>
        <div class="stat-content">
          <h3>${{ stats.totalRevenue }}</h3>
          <p>Platform Revenue</p>
        </div>
      </div>
    </div>

    <!-- Admin Functions Grid -->
    <div class="admin-functions">
      <h2 class="section-title">Administrative Functions</h2>
      
      <div class="function-grid">
        <!-- Organizations Management -->
        <div class="function-card" @click="navigateTo('organizations')">
          <div class="function-icon">
            <i class="fas fa-building"></i>
          </div>
          <h3>Organizations</h3>
          <p>Manage business accounts, settings, and subscriptions</p>
          <div class="function-actions">
            <span class="badge">{{ stats.organizations }} Active</span>
            <i class="fas fa-arrow-right"></i>
          </div>
        </div>

        <!-- User Management -->
        <div class="function-card" @click="navigateTo('users-admin')">
          <div class="function-icon">
            <i class="fas fa-users-shield"></i>
          </div>
          <h3>User Management</h3>
          <p>Control user accounts, roles, and permissions</p>
          <div class="function-actions">
            <span class="badge">{{ stats.totalUsers }} Users</span>
            <i class="fas fa-arrow-right"></i>
          </div>
        </div>

        <!-- System Settings -->
        <div class="function-card" @click="navigateTo('system-settings')">
          <div class="function-icon">
            <i class="fas fa-cogs"></i>
          </div>
          <h3>System Settings</h3>
          <p>Configure platform-wide settings and features</p>
          <div class="function-actions">
            <span class="badge">Configure</span>
            <i class="fas fa-arrow-right"></i>
          </div>
        </div>

        <!-- Analytics -->
        <div class="function-card" @click="navigateTo('analytics')">
          <div class="function-icon">
            <i class="fas fa-chart-pie"></i>
          </div>
          <h3>Analytics</h3>
          <p>View platform metrics and business insights</p>
          <div class="function-actions">
            <span class="badge">Real-time</span>
            <i class="fas fa-arrow-right"></i>
          </div>
        </div>

        <!-- Audit Logs -->
        <div class="function-card" @click="navigateTo('audit-logs')">
          <div class="function-icon">
            <i class="fas fa-history"></i>
          </div>
          <h3>Audit Logs</h3>
          <p>Track system activities and user actions</p>
          <div class="function-actions">
            <span class="badge">{{ stats.recentLogs }} New</span>
            <i class="fas fa-arrow-right"></i>
          </div>
        </div>

        <!-- Database Management -->
        <div class="function-card" @click="navigateTo('database')">
          <div class="function-icon">
            <i class="fas fa-database"></i>
          </div>
          <h3>Database</h3>
          <p>Backup, restore, and manage database operations</p>
          <div class="function-actions">
            <span class="badge">Healthy</span>
            <i class="fas fa-arrow-right"></i>
          </div>
        </div>

        <!-- Email Templates -->
        <div class="function-card" @click="navigateTo('email-templates')">
          <div class="function-icon">
            <i class="fas fa-envelope"></i>
          </div>
          <h3>Email Templates</h3>
          <p>Customize system email notifications</p>
          <div class="function-actions">
            <span class="badge">12 Templates</span>
            <i class="fas fa-arrow-right"></i>
          </div>
        </div>

        <!-- API Management -->
        <div class="function-card" @click="navigateTo('api-management')">
          <div class="function-icon">
            <i class="fas fa-plug"></i>
          </div>
          <h3>API Management</h3>
          <p>Manage API keys and integrations</p>
          <div class="function-actions">
            <span class="badge">{{ stats.apiKeys }} Keys</span>
            <i class="fas fa-arrow-right"></i>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Activity -->
    <div class="recent-activity">
      <h2 class="section-title">Recent System Activity</h2>
      <div class="activity-list">
        <div v-for="activity in recentActivities" :key="activity.id" class="activity-item">
          <div class="activity-icon" :class="activity.type">
            <i :class="activity.icon"></i>
          </div>
          <div class="activity-content">
            <p class="activity-text">{{ activity.message }}</p>
            <span class="activity-time">{{ activity.time }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- System Health -->
    <div class="system-health">
      <h2 class="section-title">System Health</h2>
      <div class="health-grid">
        <div class="health-item">
          <div class="health-label">API Server</div>
          <div class="health-status good">
            <i class="fas fa-check-circle"></i> Operational
          </div>
        </div>
        <div class="health-item">
          <div class="health-label">Database</div>
          <div class="health-status good">
            <i class="fas fa-check-circle"></i> Healthy
          </div>
        </div>
        <div class="health-item">
          <div class="health-label">Storage</div>
          <div class="health-status warning">
            <i class="fas fa-exclamation-triangle"></i> 75% Used
          </div>
        </div>
        <div class="health-item">
          <div class="health-label">Email Service</div>
          <div class="health-status good">
            <i class="fas fa-check-circle"></i> Active
          </div>
        </div>
      </div>
    </div>

    <!-- System Performance Metrics -->
    <div class="performance-metrics">
      <h2 class="section-title">
        <i class="fas fa-tachometer-alt"></i>
        System Performance
      </h2>
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-header">
            <h3>Response Time</h3>
            <span class="metric-value good">{{ performance.responseTime }}ms</span>
          </div>
          <div class="metric-chart">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: `${(500 - performance.responseTime) / 500 * 100}%` }"></div>
            </div>
            <span class="metric-label">Target: <500ms</span>
          </div>
        </div>
        
        <div class="metric-card">
          <div class="metric-header">
            <h3>CPU Usage</h3>
            <span class="metric-value" :class="performance.cpuUsage > 80 ? 'warning' : 'good'">{{ performance.cpuUsage }}%</span>
          </div>
          <div class="metric-chart">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: `${performance.cpuUsage}%` }" :class="performance.cpuUsage > 80 ? 'warning' : 'good'"></div>
            </div>
            <span class="metric-label">Available: {{ 100 - performance.cpuUsage }}%</span>
          </div>
        </div>
        
        <div class="metric-card">
          <div class="metric-header">
            <h3>Memory Usage</h3>
            <span class="metric-value" :class="performance.memoryUsage > 85 ? 'warning' : 'good'">{{ performance.memoryUsage }}%</span>
          </div>
          <div class="metric-chart">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: `${performance.memoryUsage}%` }" :class="performance.memoryUsage > 85 ? 'warning' : 'good'"></div>
            </div>
            <span class="metric-label">{{ (8 * (100 - performance.memoryUsage) / 100).toFixed(1) }}GB free</span>
          </div>
        </div>
        
        <div class="metric-card">
          <div class="metric-header">
            <h3>Active Sessions</h3>
            <span class="metric-value good">{{ performance.activeSessions }}</span>
          </div>
          <div class="metric-chart">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: `${performance.activeSessions / 1000 * 100}%` }"></div>
            </div>
            <span class="metric-label">Peak today: {{ performance.peakSessions }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- System Maintenance Tools -->
    <div class="maintenance-tools">
      <h2 class="section-title">
        <i class="fas fa-tools"></i>
        System Maintenance
      </h2>
      <div class="tools-grid">
        <div class="tool-card" @click="performMaintenance('cache')">
          <div class="tool-icon cache">
            <i class="fas fa-memory"></i>
          </div>
          <div class="tool-content">
            <h3>Clear Cache</h3>
            <p>Clear system cache to improve performance</p>
            <span class="tool-status">Last cleared: {{ maintenance.lastCacheCleared }}</span>
          </div>
          <button class="tool-action" :disabled="maintenance.isClearing">
            <i :class="['fas', maintenance.isClearing ? 'fa-spinner fa-spin' : 'fa-broom']"></i>
            {{ maintenance.isClearing ? 'Clearing...' : 'Clear Now' }}
          </button>
        </div>

        <div class="tool-card" @click="performMaintenance('logs')">
          <div class="tool-icon logs">
            <i class="fas fa-file-alt"></i>
          </div>
          <div class="tool-content">
            <h3>Archive Logs</h3>
            <p>Archive old system logs to free up space</p>
            <span class="tool-status">{{ maintenance.logSize }} logs ({{ maintenance.logSizeFormatted }})</span>
          </div>
          <button class="tool-action" :disabled="maintenance.isArchiving">
            <i :class="['fas', maintenance.isArchiving ? 'fa-spinner fa-spin' : 'fa-archive']"></i>
            {{ maintenance.isArchiving ? 'Archiving...' : 'Archive' }}
          </button>
        </div>

        <div class="tool-card" @click="performMaintenance('database')">
          <div class="tool-icon database">
            <i class="fas fa-database"></i>
          </div>
          <div class="tool-content">
            <h3>Optimize Database</h3>
            <p>Run database optimization and cleanup</p>
            <span class="tool-status">Last optimized: {{ maintenance.lastDbOptimized }}</span>
          </div>
          <button class="tool-action" :disabled="maintenance.isOptimizing">
            <i :class="['fas', maintenance.isOptimizing ? 'fa-spinner fa-spin' : 'fa-bolt']"></i>
            {{ maintenance.isOptimizing ? 'Optimizing...' : 'Optimize' }}
          </button>
        </div>

        <div class="tool-card" @click="performMaintenance('backup')">
          <div class="tool-icon backup">
            <i class="fas fa-shield-alt"></i>
          </div>
          <div class="tool-content">
            <h3>System Backup</h3>
            <p>Create full system backup</p>
            <span class="tool-status">Last backup: {{ maintenance.lastBackup }}</span>
          </div>
          <button class="tool-action" :disabled="maintenance.isBackingUp">
            <i :class="['fas', maintenance.isBackingUp ? 'fa-spinner fa-spin' : 'fa-download']"></i>
            {{ maintenance.isBackingUp ? 'Backing up...' : 'Backup Now' }}
          </button>
        </div>
      </div>
    </div>

    <!-- System Health Modal -->
    <div v-if="showSystemHealthModal" class="modal-overlay" @click="showSystemHealthModal = false">
      <div class="modal-container" @click.stop>
        <div class="modal-header">
          <h3>
            <i class="fas fa-heartbeat"></i>
            Detailed System Health
          </h3>
          <button @click="showSystemHealthModal = false" class="close-btn">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="health-details">
            <div class="health-section">
              <h4>Server Status</h4>
              <div class="health-items">
                <div class="health-detail">
                  <span class="detail-label">Uptime</span>
                  <span class="detail-value">{{ systemHealth.uptime }}</span>
                </div>
                <div class="health-detail">
                  <span class="detail-label">Server Load</span>
                  <span class="detail-value" :class="systemHealth.serverLoad > 0.8 ? 'warning' : 'good'">{{ systemHealth.serverLoad }}</span>
                </div>
                <div class="health-detail">
                  <span class="detail-label">Disk Space</span>
                  <span class="detail-value" :class="systemHealth.diskUsage > 85 ? 'warning' : 'good'">{{ systemHealth.diskUsage }}% used</span>
                </div>
              </div>
            </div>
            
            <div class="health-section">
              <h4>Database Health</h4>
              <div class="health-items">
                <div class="health-detail">
                  <span class="detail-label">Connection Pool</span>
                  <span class="detail-value good">{{ systemHealth.dbConnections }}/100 active</span>
                </div>
                <div class="health-detail">
                  <span class="detail-label">Query Performance</span>
                  <span class="detail-value good">{{ systemHealth.avgQueryTime }}ms avg</span>
                </div>
                <div class="health-detail">
                  <span class="detail-label">Last Backup</span>
                  <span class="detail-value">{{ systemHealth.lastDbBackup }}</span>
                </div>
              </div>
            </div>

            <div class="health-section">
              <h4>Service Status</h4>
              <div class="service-status-grid">
                <div v-for="service in systemHealth.services" :key="service.name" class="service-item">
                  <div class="service-name">{{ service.name }}</div>
                  <div class="service-status" :class="service.status.toLowerCase()">
                    <i :class="service.status === 'Healthy' ? 'fas fa-check-circle' : 'fas fa-exclamation-triangle'"></i>
                    {{ service.status }}
                  </div>
                  <div class="service-response-time">{{ service.responseTime }}ms</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SuperAdminDashboard',
  data() {
    return {
      isRefreshing: false,
      showSystemHealthModal: false,
      stats: {
        organizations: 24,
        totalUsers: 486,
        totalBookings: 12847,
        totalRevenue: '284,500',
        recentLogs: 43,
        apiKeys: 8
      },
      performance: {
        responseTime: 145,
        cpuUsage: 35,
        memoryUsage: 62,
        activeSessions: 247,
        peakSessions: 389
      },
      maintenance: {
        isClearing: false,
        isArchiving: false,
        isOptimizing: false,
        isBackingUp: false,
        lastCacheCleared: '2 hours ago',
        lastDbOptimized: 'Yesterday',
        lastBackup: '6 hours ago',
        logSize: '15,234',
        logSizeFormatted: '1.2GB'
      },
      systemHealth: {
        uptime: '15 days, 4 hours',
        serverLoad: 0.45,
        diskUsage: 73,
        dbConnections: 12,
        avgQueryTime: 23,
        lastDbBackup: '6 hours ago',
        services: [
          { name: 'API Gateway', status: 'Healthy', responseTime: 45 },
          { name: 'Auth Service', status: 'Healthy', responseTime: 32 },
          { name: 'Email Service', status: 'Healthy', responseTime: 78 },
          { name: 'File Storage', status: 'Warning', responseTime: 156 },
          { name: 'Background Jobs', status: 'Healthy', responseTime: 12 },
          { name: 'Cache Service', status: 'Healthy', responseTime: 8 }
        ]
      },
      recentActivities: [
        {
          id: 1,
          type: 'user',
          icon: 'fas fa-user-plus',
          message: 'New organization "City Auto Repair" registered',
          time: '5 minutes ago'
        },
        {
          id: 2,
          type: 'system',
          icon: 'fas fa-database',
          message: 'Database backup completed successfully',
          time: '1 hour ago'
        },
        {
          id: 3,
          type: 'security',
          icon: 'fas fa-shield-alt',
          message: 'Failed login attempt blocked from IP 192.168.1.100',
          time: '2 hours ago'
        },
        {
          id: 4,
          type: 'api',
          icon: 'fas fa-plug',
          message: 'New API key generated for "Mobile App"',
          time: '3 hours ago'
        },
        {
          id: 5,
          type: 'maintenance',
          icon: 'fas fa-tools',
          message: 'System cache cleared successfully',
          time: '4 hours ago'
        }
      ]
    }
  },
  methods: {
    navigateTo(page) {
      this.$router.push(`/${page}`)
    },
    
    async refreshDashboard() {
      this.isRefreshing = true
      try {
        // Simulate API calls to refresh data
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        // Update stats with fresh data
        this.stats = {
          ...this.stats,
          organizations: Math.floor(Math.random() * 50) + 20,
          totalUsers: Math.floor(Math.random() * 100) + 450
        }
        
        // Update performance metrics
        this.performance.responseTime = Math.floor(Math.random() * 200) + 100
        this.performance.cpuUsage = Math.floor(Math.random() * 60) + 20
        this.performance.memoryUsage = Math.floor(Math.random() * 40) + 50
        this.performance.activeSessions = Math.floor(Math.random() * 200) + 200
        
        console.log('Dashboard data refreshed')
      } catch (error) {
        console.error('Failed to refresh dashboard:', error)
      } finally {
        this.isRefreshing = false
      }
    },
    
    async performMaintenance(type) {
      switch (type) {
        case 'cache':
          await this.clearCache()
          break
        case 'logs':
          await this.archiveLogs()
          break
        case 'database':
          await this.optimizeDatabase()
          break
        case 'backup':
          await this.createBackup()
          break
        default:
          console.warn('Unknown maintenance type:', type)
      }
    },
    
    async clearCache() {
      this.maintenance.isClearing = true
      try {
        await new Promise(resolve => setTimeout(resolve, 3000))
        this.maintenance.lastCacheCleared = 'Just now'
        
        // Add activity log
        this.recentActivities.unshift({
          id: Date.now(),
          type: 'maintenance',
          icon: 'fas fa-memory',
          message: 'System cache cleared successfully',
          time: 'Just now'
        })
        
        console.log('Cache cleared successfully')
      } catch (error) {
        console.error('Failed to clear cache:', error)
      } finally {
        this.maintenance.isClearing = false
      }
    },
    
    async archiveLogs() {
      this.maintenance.isArchiving = true
      try {
        await new Promise(resolve => setTimeout(resolve, 5000))
        this.maintenance.logSize = '2,543'
        this.maintenance.logSizeFormatted = '0.3GB'
        
        this.recentActivities.unshift({
          id: Date.now(),
          type: 'maintenance',
          icon: 'fas fa-archive',
          message: 'System logs archived successfully',
          time: 'Just now'
        })
        
        console.log('Logs archived successfully')
      } catch (error) {
        console.error('Failed to archive logs:', error)
      } finally {
        this.maintenance.isArchiving = false
      }
    },
    
    async optimizeDatabase() {
      this.maintenance.isOptimizing = true
      try {
        await new Promise(resolve => setTimeout(resolve, 8000))
        this.maintenance.lastDbOptimized = 'Just now'
        
        this.recentActivities.unshift({
          id: Date.now(),
          type: 'system',
          icon: 'fas fa-database',
          message: 'Database optimization completed',
          time: 'Just now'
        })
        
        console.log('Database optimized successfully')
      } catch (error) {
        console.error('Failed to optimize database:', error)
      } finally {
        this.maintenance.isOptimizing = false
      }
    },
    
    async createBackup() {
      this.maintenance.isBackingUp = true
      try {
        await new Promise(resolve => setTimeout(resolve, 10000))
        this.maintenance.lastBackup = 'Just now'
        
        this.recentActivities.unshift({
          id: Date.now(),
          type: 'system',
          icon: 'fas fa-shield-alt',
          message: 'System backup created successfully',
          time: 'Just now'
        })
        
        console.log('Backup created successfully')
      } catch (error) {
        console.error('Failed to create backup:', error)
      } finally {
        this.maintenance.isBackingUp = false
      }
    }
  }
}
</script>

<style scoped>
.super-admin-dashboard {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1.5rem;
  min-height: 100vh;
}

/* Modern Header */
.page-header {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.85) 100%);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--card-border);
  border-radius: 24px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: var(--bs-box-shadow-lg);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
}

.page-header:hover {
  transform: translateY(-2px);
  box-shadow: 0 15px 50px rgba(0, 0, 0, 0.1);
}

.page-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 215, 0, 0.6), transparent);
}

.header-content {
  flex: 1;
}

.page-title {
  font-size: 2.25rem;
  font-weight: 700;
  color: var(--bs-body-color);
  margin: 0 0 0.75rem 0;
  display: flex;
  align-items: center;
  gap: 1.25rem;
  line-height: 1.3;
  letter-spacing: -0.025em;
}

.title-icon {
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, #ffd700 0%, #ff8c00 100%);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 32px rgba(255, 215, 0, 0.25);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
}

.title-icon:hover {
  transform: scale(1.05) translateY(-2px);
  box-shadow: 0 12px 40px rgba(255, 215, 0, 0.35);
}

.title-icon i {
  font-size: 1.75rem;
  color: white;
}

.page-description {
  font-size: 1.125rem;
  color: var(--bs-secondary);
  margin: 0;
  line-height: 1.6;
  max-width: 640px;
  font-weight: 400;
}

.header-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.btn {
  padding: 12px 20px;
  border-radius: 10px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
  font-size: 14px;
}

.btn-primary {
  background: linear-gradient(135deg, #ffd700 0%, #ff8c00 100%);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(255, 215, 0, 0.3);
}

.btn-outline {
  background: rgba(255, 255, 255, 0.9);
  border: 2px solid rgba(226, 232, 240, 0.6);
  color: var(--bs-secondary);
}

.btn-outline:hover {
  border-color: #ffd700;
  color: #ff8c00;
  background: rgba(255, 215, 0, 0.1);
  transform: translateY(-2px);
}

.btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
}

.stat-card {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  display: flex;
  align-items: center;
  gap: 1.5rem;
  transition: transform 0.2s;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: white;
}

.stat-icon.organizations { background: linear-gradient(135deg, #667eea, #764ba2); }
.stat-icon.users { background: linear-gradient(135deg, #4facfe, #00f2fe); }
.stat-icon.bookings { background: linear-gradient(135deg, #43e97b, #38f9d7); }
.stat-icon.revenue { background: linear-gradient(135deg, #fa709a, #fee140); }

.stat-content h3 {
  font-size: 2rem;
  font-weight: 700;
  margin: 0;
  color: var(--bs-body-color);
}

.stat-content p {
  margin: 0;
  color: var(--bs-secondary);
  font-size: 0.9rem;
}

/* Admin Functions */
.admin-functions {
  margin-bottom: 3rem;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--bs-body-color);
  margin-bottom: 1.5rem;
}

.function-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}

.function-card {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  cursor: pointer;
  transition: all 0.3s;
}

.function-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
}

.function-icon {
  width: 50px;
  height: 50px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.3rem;
  margin-bottom: 1rem;
}

.function-card h3 {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--bs-body-color);
  margin-bottom: 0.5rem;
}

.function-card p {
  color: var(--bs-secondary);
  font-size: 0.9rem;
  margin-bottom: 1rem;
}

.function-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.badge {
  background: #f0f2f5;
  color: #667eea;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
}

/* Recent Activity */
.recent-activity {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.activity-item {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: var(--bs-tertiary-bg);
  border-radius: 8px;
}

.activity-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.activity-icon.user { background: #667eea; }
.activity-icon.system { background: #4facfe; }
.activity-icon.security { background: #fa709a; }
.activity-icon.api { background: #43e97b; }

.activity-content {
  flex: 1;
}

.activity-text {
  margin: 0 0 0.25rem 0;
  color: var(--bs-body-color);
}

.activity-time {
  color: var(--bs-secondary);
  font-size: 0.85rem;
}

/* System Health */
.system-health {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 2rem;
}

.health-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
}

.health-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: var(--bs-tertiary-bg);
  border-radius: 8px;
}

.health-label {
  font-weight: 600;
  color: var(--bs-body-color);
}

.health-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  font-weight: 600;
}

.health-status.good { color: #28a745; }
.health-status.warning { color: #ffc107; }
.health-status.error { color: #dc3545; }

/* Performance Metrics */
.performance-metrics {
  margin-bottom: 3rem;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--bs-body-color);
  margin-bottom: 1.5rem;
}

.section-title i {
  color: #ffd700;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}

.metric-card {
  background: var(--card-bg);
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: var(--stat-card-shadow);
  transition: all 0.3s ease;
}

.metric-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
}

.metric-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.metric-header h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
  margin: 0;
}

.metric-value {
  font-size: 1.5rem;
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 8px;
}

.metric-value.good {
  color: #059669;
  background: rgba(16, 185, 129, 0.1);
}

.metric-value.warning {
  color: #d97706;
  background: rgba(251, 191, 36, 0.1);
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #f1f5f9;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.progress-fill {
  height: 100%;
  border-radius: 4px;
  transition: all 0.3s ease;
}

.progress-fill.good {
  background: linear-gradient(90deg, #10b981, #059669);
}

.progress-fill.warning {
  background: linear-gradient(90deg, #f59e0b, #d97706);
}

.metric-label {
  font-size: 0.875rem;
  color: var(--bs-secondary);
}

/* Maintenance Tools */
.maintenance-tools {
  margin-bottom: 3rem;
}

.tools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1.5rem;
}

.tool-card {
  background: var(--card-bg);
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: var(--stat-card-shadow);
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: all 0.3s ease;
  cursor: pointer;
}

.tool-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
}

.tool-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  color: white;
  flex-shrink: 0;
}

.tool-icon.cache { background: linear-gradient(135deg, #6366f1, #8b5cf6); }
.tool-icon.logs { background: linear-gradient(135deg, #10b981, #059669); }
.tool-icon.database { background: linear-gradient(135deg, #f59e0b, #d97706); }
.tool-icon.backup { background: linear-gradient(135deg, #ef4444, #dc2626); }

.tool-content {
  flex: 1;
}

.tool-content h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--bs-body-color);
  margin: 0 0 0.25rem 0;
}

.tool-content p {
  font-size: 0.875rem;
  color: var(--bs-secondary);
  margin: 0 0 0.25rem 0;
}

.tool-status {
  font-size: 0.75rem;
  color: #94a3b8;
}

.tool-action {
  padding: 8px 16px;
  border-radius: 8px;
  border: none;
  background: #f1f5f9;
  color: var(--bs-secondary);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 6px;
}

.tool-action:hover:not(:disabled) {
  background: #e2e8f0;
  transform: translateY(-1px);
}

.tool-action:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-container {
  background: var(--card-bg);
  border-radius: 16px;
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  padding: 1.5rem;
  border-bottom: 1px solid var(--card-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--bs-body-color);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.25rem;
  color: var(--bs-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: #f1f5f9;
  color: #374151;
}

.modal-body {
  padding: 1.5rem;
}

.health-details {
  display: grid;
  gap: 2rem;
}

.health-section h4 {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--bs-body-color);
  margin: 0 0 1rem 0;
}

.health-items {
  display: grid;
  gap: 0.75rem;
}

.health-detail {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: var(--bs-body-bg);
  border-radius: 8px;
}

.detail-label {
  font-weight: 500;
  color: #374151;
}

.detail-value {
  font-weight: 600;
}

.detail-value.good {
  color: #059669;
}

.detail-value.warning {
  color: #d97706;
}

.service-status-grid {
  display: grid;
  gap: 0.75rem;
}

.service-item {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 1rem;
  align-items: center;
  padding: 0.75rem;
  background: var(--bs-body-bg);
  border-radius: 8px;
}

.service-name {
  font-weight: 500;
  color: #374151;
}

.service-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  font-size: 0.875rem;
}

.service-status.healthy {
  color: #059669;
}

.service-status.warning {
  color: #d97706;
}

.service-response-time {
  font-size: 0.75rem;
  color: var(--bs-secondary);
  text-align: right;
}

@media (max-width: 768px) {
  .stats-grid,
  .function-grid,
  .metrics-grid,
  .tools-grid {
    grid-template-columns: 1fr;
  }
  
  .page-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .header-actions {
    justify-content: center;
  }

  .service-item {
    grid-template-columns: 1fr;
    text-align: center;
    gap: 0.5rem;
  }

  .tool-card {
    flex-direction: column;
    text-align: center;
    gap: 1rem;
  }
}
</style>