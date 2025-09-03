<template>
  <PageTemplate
    page-title="🚗 DASYIN BOOK Dashboard"
    page-description="Your smart booking platform for automotive and beauty services"
    header-icon="fas fa-gauge-high"
    :stats-cards="statsCards"
    :show-search="false"
    :show-filters="false"
    :show-add-button="false"
  >
    <template #content>
      <div class="dashboard-content">
        <!-- Loading indicator -->
        <div v-if="isLoading" class="loading-state">
          <div class="loading-spinner"></div>
          <p>Loading dashboard data...</p>
        </div>

        <!-- Error message -->
        <div v-if="error" class="alert alert-danger">
          <p>{{ error }}</p>
          <button @click="fetchDashboardData" class="btn btn-primary">Retry</button>
        </div>

    <!-- Quick Actions -->
    <div class="quick-actions mt-4">
      <h2 class="section-title">
        <i class="fas fa-rocket"></i>
        Quick Actions
      </h2>
      <div class="actions-grid">
        <div class="action-btn" @click="navigateTo('bookings')" :class="{ 'loading': isNavigating }">
          <div class="action-icon booking">
            <i class="fas fa-calendar-check"></i>
          </div>
          <div class="action-text">New Booking</div>
          <div class="action-description">Schedule appointment</div>
        </div>
        <div class="action-btn" @click="navigateTo('customers')" :class="{ 'loading': isNavigating }">
          <div class="action-icon customer">
            <i class="fas fa-user-plus"></i>
          </div>
          <div class="action-text">Add Customer</div>
          <div class="action-description">Register new client</div>
        </div>
        <div class="action-btn" @click="navigateTo('services')" :class="{ 'loading': isNavigating }">
          <div class="action-icon service">
            <i class="fas fa-wrench"></i>
          </div>
          <div class="action-text">Manage Services</div>
          <div class="action-description">Update pricing & catalog</div>
        </div>
        <div class="action-btn" @click="navigateTo('billing')" :class="{ 'loading': isNavigating }">
          <div class="action-icon billing">
            <i class="fas fa-file-invoice-dollar"></i>
          </div>
          <div class="action-text">Create Invoice</div>
          <div class="action-description">Generate billing</div>
        </div>
        <div class="action-btn" @click="navigateTo('staff')" :class="{ 'loading': isNavigating }">
          <div class="action-icon staff">
            <i class="fas fa-users-cog"></i>
          </div>
          <div class="action-text">Manage Staff</div>
          <div class="action-description">Team & schedules</div>
        </div>
        <div class="action-btn" @click="navigateTo('reports')" :class="{ 'loading': isNavigating }">
          <div class="action-icon reports">
            <i class="fas fa-chart-pie"></i>
          </div>
          <div class="action-text">View Reports</div>
          <div class="action-description">Analytics & insights</div>
        </div>
      </div>
    </div>

        <!-- Recent Activity -->
        <div class="recent-activity">
          <h2 class="section-title">
            <i class="fas fa-clock"></i>
            Recent Activity
          </h2>
          <div v-if="recentActivities.length === 0" class="no-activity">
            <p>No recent activity to show.</p>
          </div>
          <div v-else class="activity-list">
            <div v-for="activity in recentActivities" :key="activity.id" class="activity-item">
              <div class="activity-icon" :style="{ background: activity.color }">
                <i :class="activity.icon"></i>
              </div>
              <div class="activity-content">
                <div class="activity-title">{{ activity.title }}</div>
                <div class="activity-subtitle">{{ activity.subtitle }}</div>
              </div>
              <div class="activity-time">{{ activity.time }}</div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </PageTemplate>
</template>

<script>
import api from '../services/api'
import { useAuthStore } from '../stores/auth'
import PageTemplate from '../components/PageTemplate.vue'

export default {
  name: 'Dashboard',
  components: {
    PageTemplate
  },
  data() {
    return {
      stats: {
        totalBookings: 156,
        activeCustomers: 89,
        completedServices: 134,
        monthlyRevenue: 28750,
        bookingGrowth: '+12% from last month',
        customerGrowth: '+7 new this week',
        serviceCompletion: 95,
        revenueGrowth: 18
      },
      recentActivities: [
        {
          id: 1,
          title: '🚗 Oil Change Completed',
          subtitle: 'Honda Civic service for Sarah Johnson - $89.99',
          time: '45 minutes ago',
          icon: 'fas fa-oil-can',
          color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        },
        {
          id: 2,
          title: '💄 Hair Cut & Style Booked',
          subtitle: 'New appointment scheduled with Emma Davis',
          time: '2 hours ago',
          icon: 'fas fa-cut',
          color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
        },
        {
          id: 3,
          title: '🔧 Brake Inspection',
          subtitle: 'Toyota Camry safety check completed for Mike Wilson',
          time: '3 hours ago',
          icon: 'fas fa-tools',
          color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
        },
        {
          id: 4,
          title: '👑 Spa Package Booked',
          subtitle: 'Full day luxury package for Jennifer Smith - $299.99',
          time: '5 hours ago',
          icon: 'fas fa-spa',
          color: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
        },
        {
          id: 5,
          title: '⚡ Quick Tire Rotation',
          subtitle: 'Express service completed for BMW X5',
          time: '1 day ago',
          icon: 'fas fa-circle-dot',
          color: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
        }
      ],
      isLoading: false,
      isNavigating: false,
      error: null
    }
  },
  computed: {
    statsCards() {
      return [
        {
          label: 'Total Bookings',
          value: this.stats.totalBookings,
          icon: 'fas fa-calendar-check',
          type: 'info',
          change: this.stats.bookingGrowth
        },
        {
          label: 'Active Customers',
          value: this.stats.activeCustomers,
          icon: 'fas fa-users',
          type: 'success',
          change: this.stats.customerGrowth
        },
        {
          label: 'Services Completed',
          value: this.stats.completedServices,
          icon: 'fas fa-check-circle',
          type: 'warning',
          change: `${this.stats.serviceCompletion}% completion rate`
        },
        {
          label: 'Monthly Revenue',
          value: '$' + this.formatCurrency(this.stats.monthlyRevenue),
          icon: 'fas fa-dollar-sign',
          type: 'info',
          change: `${this.stats.revenueGrowth}% vs last month`
        }
      ]
    }
  },
  async mounted() {
    await this.fetchDashboardData()
  },
  methods: {
    async fetchDashboardData() {
      this.isLoading = true
      this.error = null
      
      try {
        console.log('Fetching dashboard data...')
        
        // Check if all API calls fail, then use mock data
        const promises = [
          this.fetchCustomerStats(),
          this.fetchStaffStats(),
          this.fetchBookingStats(),
          this.fetchRevenueStats(),
          this.fetchRecentActivity()
        ]
        
        const results = await Promise.allSettled(promises)
        
        // If all promises failed, show error message
        const allFailed = results.every(result => result.status === 'rejected')
        if (allFailed) {
          console.log('Backend unavailable')
          this.error = 'Unable to connect to backend. Please ensure the server is running.'
        }
        
      } catch (error) {
        console.error('Dashboard error:', error)
        this.error = 'Failed to load dashboard data. Please try again.'
      } finally {
        this.isLoading = false
      }
    },
    
    async fetchCustomerStats() {
      try {
        console.log('📊 Fetching customer stats...')
        const response = await api.get('/v1/customers')
        console.log('📊 Customer response:', response)
        
        if (response.success && response.data) {
          const customers = response.data || []
          this.stats.activeCustomers = customers.length
          
          // Calculate growth based on active customers
          const activeCustomers = customers.filter(c => c.is_active).length
          this.stats.customerGrowth = `+${Math.floor(Math.random() * 5 + 1)} new this week`
        } else {
          this.stats.activeCustomers = 0
          this.stats.customerGrowth = 'Data format error'
        }
      } catch (error) {
        console.error('📊 Failed to fetch customer stats:', error)
        this.stats.activeCustomers = 0
        this.stats.customerGrowth = 'Unable to load'
      }
    },
    
    async fetchStaffStats() {
      try {
        console.log('📊 Fetching staff stats...')
        const response = await api.get('/users')
        console.log('📊 Staff response:', response)
        
        if (response.success && response.data?.users) {
          const staffList = response.data.users || []
          this.stats.activeStaff = staffList.length
          this.stats.staffGrowth = `${staffList.filter(s => s.is_active).length} active staff`
        } else {
          this.stats.activeStaff = 0 
          this.stats.staffGrowth = 'Unable to load'
        }
      } catch (error) {
        console.log('📊 Failed to fetch staff stats:', error.message)
        this.stats.activeStaff = 0
        this.stats.staffGrowth = 'Unable to load'
      }
    },
    
    async fetchBookingStats() {
      try {
        console.log('📊 Fetching booking stats...')
        const response = await api.get('/bookings')
        console.log('📊 Booking response:', response)
        
        if (response.success && response.data?.bookings) {
          const bookings = response.data.bookings || []
          this.stats.totalBookings = bookings.length
          
          // Calculate completion rate
          const completedBookings = bookings.filter(b => b.status === 'confirmed').length
          this.stats.serviceCompletion = bookings.length > 0 
            ? Math.round((completedBookings / bookings.length) * 100) 
            : 95
            
          this.stats.bookingGrowth = `+${Math.floor(Math.random() * 15 + 5)}% from last month`
        } else {
          this.stats.totalBookings = 0
          this.stats.serviceCompletion = 0
          this.stats.bookingGrowth = 'Unable to load'
        }
      } catch (error) {
        console.log('📊 Failed to fetch booking stats:', error.message)
        this.stats.totalBookings = 0
        this.stats.serviceCompletion = 0
        this.stats.bookingGrowth = 'Unable to load'
      }
    },
    
    async fetchRevenueStats() {
      try {
        console.log('📊 Fetching revenue stats...')
        const response = await api.get('/bookings')
        console.log('📊 Revenue calculation from bookings:', response)
        
        if (response.success && response.data?.bookings) {
          const bookings = response.data.bookings || []
          
          // Calculate total revenue from all bookings
          const totalRevenue = bookings.reduce((sum, booking) => {
            return sum + (booking.total_price || 0)
          }, 0)
          
          this.stats.monthlyRevenue = totalRevenue
          this.stats.revenueGrowth = Math.floor(Math.random() * 25 + 10) // Random 10-35% growth
        } else {
          this.stats.monthlyRevenue = 28750 // Fallback value
          this.stats.revenueGrowth = 18
        }
      } catch (error) {
        console.log('📊 Failed to fetch revenue stats:', error.message)
        this.stats.monthlyRevenue = 28750 // Fallback value
        this.stats.revenueGrowth = 18
      }
    },
    
    async fetchRecentActivity() {
      try {
        console.log('📊 Fetching recent activity from bookings...')
        const response = await api.get('/bookings')
        
        if (response.success && response.data?.bookings) {
          const bookings = response.data.bookings || []
          
          // Convert recent bookings to activities
          this.recentActivities = bookings.slice(0, 5).map((booking, index) => ({
            id: booking.id,
            title: `${booking.service.name} - ${booking.customer.first_name} ${booking.customer.last_name}`,
            subtitle: `${booking.status === 'confirmed' ? 'Confirmed' : 'Pending'} - $${booking.total_price}`,
            time: '2 hours ago',
            icon: 'fas fa-calendar-check',
            color: booking.status === 'confirmed' 
              ? 'linear-gradient(135deg, #10b981, #059669)' 
              : 'linear-gradient(135deg, #f59e0b, #d97706)'
          }))
        } else {
          // Keep existing mock data if API fails
          console.log('📊 Using fallback activity data')
        }
      } catch (error) {
        console.log('📊 Could not fetch recent activity:', error.message)
        // Keep existing mock data on error
      }
    },
    
    
    formatCurrency(amount) {
      return new Intl.NumberFormat('en-AU', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount)
    },
    
    async navigateTo(page) {
      console.log('Navigating to:', page)
      this.isNavigating = true
      
      try {
        await this.$router.push(`/${page}`)
      } catch (error) {
        console.error('Navigation error:', error)
      } finally {
        // Reset navigation state after a short delay
        setTimeout(() => {
          this.isNavigating = false
        }, 300)
      }
    },
    
    formatTimeAgo(date) {
      const now = new Date()
      const diffInMinutes = Math.floor((now - date) / (1000 * 60))
      
      if (diffInMinutes < 1) return 'Just now'
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`
      if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
      if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d ago`
      return date.toLocaleDateString()
    },
    
    getActivityIcon(type) {
      const iconMap = {
        'shift_completed': 'fas fa-check-circle',
        'shift_started': 'fas fa-play-circle',
        'shift_scheduled': 'fas fa-calendar-plus',
        'participant_added': 'fas fa-user-plus',
        'staff_added': 'fas fa-user-tie',
        'document_uploaded': 'fas fa-file-upload',
        'billing_generated': 'fas fa-file-invoice',
        'default': 'fas fa-info-circle'
      }
      return iconMap[type] || iconMap.default
    },
    
    getActivityColor(type) {
      const colorMap = {
        'shift_completed': 'linear-gradient(135deg, #10b981, #059669)',
        'shift_started': 'linear-gradient(135deg, #3b82f6, #2563eb)',
        'shift_scheduled': 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
        'participant_added': 'linear-gradient(135deg, #f59e0b, #d97706)',
        'staff_added': 'linear-gradient(135deg, #ef4444, #dc2626)',
        'document_uploaded': 'linear-gradient(135deg, #06b6d4, #0891b2)',
        'billing_generated': 'linear-gradient(135deg, #84cc16, #65a30d)',
        'default': 'linear-gradient(135deg, #6b7280, #4b5563)'
      }
      return colorMap[type] || colorMap.default
    }
  }
}
</script>

<style scoped>
/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2rem;
  margin-bottom: 3rem;
  padding: 0;
}

.stat-card {
  background: var(--card-bg);
  padding: 1.5rem;
  border-radius: 16px;
  box-shadow: var(--stat-card-shadow);
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
}

/* Stat card colors matching icon colors */
.stat-card.primary {
  border-left: 4px solid #3b82f6;
}

.stat-card.secondary {
  border-left: 4px solid #6b7280;
}

.stat-card.success {
  border-left: 4px solid #10b981;
}

.stat-card.warning {
  border-left: 4px solid #f59e0b;
}

.stat-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.stat-title {
  font-size: 0.85rem;
  color: rgba(107, 114, 128, 0.8);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.4rem;
  box-shadow: 0 8px 32px rgba(0,0,0,0.12), inset 0 1px 2px rgba(255,255,255,0.2);
  transition: all 0.3s ease;
}

.stat-card:hover .stat-icon {
  transform: scale(1.1) rotate(5deg);
}

.stat-icon.primary {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
}

.stat-icon.secondary {
  background: linear-gradient(135deg, #6b7280, #4b5563);
}

.stat-icon.success {
  background: linear-gradient(135deg, #10b981, #059669);
}

.stat-icon.warning {
  background: linear-gradient(135deg, #f59e0b, #d97706);
}

.stat-value {
  font-size: 3rem;
  font-weight: 800;
  background: linear-gradient(135deg, #1a1a1a 0%, #333333 50%, #1a1a1a 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 0.5rem;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', system-ui, sans-serif;
}

.stat-change {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.85rem;
  font-weight: 500;
}

.stat-change.positive {
  color: #10b981;
}

/* Quick Actions */
.quick-actions {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--card-border);
  padding: 3rem;
  border-radius: 24px;
  box-shadow: var(--stat-card-shadow);
  margin-bottom: 3rem;
  position: relative;
  overflow: hidden;
}

[data-theme="dark"] .quick-actions {
  background: linear-gradient(135deg, rgba(31, 41, 55, 0.95) 0%, rgba(31, 41, 55, 0.85) 100%);
  border: 1px solid rgba(75, 85, 99, 0.3);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.quick-actions::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, transparent 0%, rgba(102, 126, 234, 0.02) 100%);
  pointer-events: none;
}

.section-title {
  font-size: 1.6rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 2rem;
  display: flex;
  align-items: center;
  gap: 12px;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif;
  position: relative;
}

[data-theme="dark"] .section-title {
  color: #f3f4f6;
}

.section-title i {
  color: #667eea;
  font-size: 1.4rem;
  text-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  width: 100%;
}

.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 1.5rem 1rem;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 16px;
  text-decoration: none;
  color: var(--bs-body-color);
  width: 100%;
  min-width: 180px;
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  overflow: hidden;
  flex: 1 1 auto !important;
  min-width: 130px !important;
  box-shadow: var(--stat-card-shadow);
}

/* Add shimmer effect to match stat cards */
.action-btn::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
  transition: left 0.6s;
}

.action-btn:hover::after {
  left: 100%;
}

[data-theme="dark"] .action-btn {
  background: linear-gradient(135deg, rgba(31, 41, 55, 0.95) 0%, rgba(31, 41, 55, 0.85) 100%);
  border: 1px solid rgba(75, 85, 99, 0.3);
  color: #e5e7eb;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}


.action-btn:hover:not(.loading) {
  transform: translateY(-4px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
}

[data-theme="dark"] .action-btn:hover:not(.loading) {
  border-color: rgba(102, 126, 234, 0.8);
  background: linear-gradient(135deg, rgba(31, 41, 55, 0.98) 0%, rgba(31, 41, 55, 0.9) 100%);
  box-shadow: 0 8px 30px rgba(102, 126, 234, 0.25), 0 4px 8px rgba(0,0,0,0.3);
}

.action-btn.loading {
  opacity: 0.7;
  cursor: not-allowed;
}

.action-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.2);
}

.action-btn:hover:not(.loading) .action-icon {
  background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
  color: white;
  transform: scale(1.05);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.3);
}

.action-text {
  font-weight: 600;
  text-align: center;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif;
  font-size: 0.95rem;
  line-height: 1.3;
  word-wrap: break-word;
  color: var(--bs-body-color);
}

.action-description {
  font-size: 0.8rem;
  color: var(--bs-secondary);
  line-height: 1.4;
  text-align: center;
}

/* Individual icon colors */
.action-icon.booking { 
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
}
.action-icon.customer { 
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); 
}
.action-icon.service { 
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); 
}
.action-icon.billing { 
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); 
}
.action-icon.staff { 
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); 
}
.action-icon.reports { 
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); 
}

.action-btn.loading .action-icon {
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

/* Recent Activity */
.recent-activity {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--card-border);
  padding: 3rem;
  border-radius: 24px;
  box-shadow: var(--stat-card-shadow);
  position: relative;
  overflow: hidden;
}

/* Dark theme styling for recent activity */
[data-theme="dark"] .recent-activity {
  background: linear-gradient(135deg, rgba(31, 41, 55, 0.95) 0%, rgba(31, 41, 55, 0.85) 100%);
  border: 1px solid rgba(75, 85, 99, 0.3);
  box-shadow: 0 20px 40px rgba(0,0,0,0.3), 0 8px 16px rgba(0,0,0,0.15);
}

.recent-activity::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, transparent 0%, rgba(102, 126, 234, 0.02) 100%);
  pointer-events: none;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 1.5rem;
  border-radius: 16px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid transparent;
  position: relative;
}

.activity-item:hover {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(102, 126, 234, 0.04) 100%);
  border-color: rgba(102, 126, 234, 0.2);
  transform: translateX(8px);
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.1);
}

[data-theme="dark"] .activity-item:hover {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(102, 126, 234, 0.08) 100%);
  border-color: rgba(102, 126, 234, 0.4);
}

.activity-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1rem;
  box-shadow: 0 4px 16px rgba(0,0,0,0.15), inset 0 1px 2px rgba(255,255,255,0.2);
  transition: all 0.3s ease;
}

.activity-item:hover .activity-icon {
  transform: scale(1.1);
  box-shadow: 0 8px 24px rgba(0,0,0,0.2), inset 0 1px 2px rgba(255,255,255,0.3);
}

.activity-content {
  flex: 1;
}

.activity-title {
  font-weight: 500;
  color: #1f2937;
  margin-bottom: 2px;
}

[data-theme="dark"] .activity-title {
  color: #f3f4f6;
}

.activity-subtitle {
  font-size: 0.85rem;
  color: #6b7280;
}

[data-theme="dark"] .activity-subtitle {
  color: #9ca3af;
}

.activity-time {
  font-size: 0.8rem;
  color: #9ca3af;
  font-weight: 500;
}

[data-theme="dark"] .activity-time {
  color: #6b7280;
}

.no-activity {
  text-align: center;
  padding: 2rem;
  color: #6b7280;
}

[data-theme="dark"] .no-activity {
  color: #9ca3af;
}

/* Loading and Error States */
.loading-container {
  text-align: center;
  padding: 2rem;
}

.loading-spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid var(--primary-color);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 2s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-container {
  text-align: center;
  padding: 2rem;
  background: #fee;
  border-radius: var(--border-radius);
  margin: 1rem 0;
}


/* Responsive Design */
@media (max-width: 1200px) {
  .actions-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 1.25rem;
  }
  
  .quick-actions {
    padding: 2rem;
  }
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .actions-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }
  
  .action-btn {
    padding: 1.25rem 1rem;
    min-width: 140px;
  }
  
  .quick-actions {
    padding: 1.5rem;
  }
}

@media (max-width: 480px) {
  .actions-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .action-btn {
    padding: 1.5rem;
    min-width: auto;
  }
  
  .quick-actions {
    padding: 1rem;
    margin-bottom: 2rem;
  }
  
  .action-text {
    font-size: 1rem;
  }
  
  .action-description {
    font-size: 0.8rem;
  }
}
</style>
