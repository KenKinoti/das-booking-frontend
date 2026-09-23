<template>
  <div class="unified-analytics-page">
    <!-- Organization Context Aware Header -->
    <div class="page-header">
      <div class="page-header-content">
        <div class="page-title-section">
          <h1 class="page-title">
            <i class="fas fa-chart-line"></i>
            Analytics & Reports
          </h1>
          <p class="page-subtitle">
            Comprehensive insights and reporting for data-driven decisions
          </p>
        </div>
        <div class="page-actions">
          <div class="controls-group">
            <select v-model="selectedTimeRange" @change="refreshData" class="form-select time-range-select">
              <option v-for="range in timeRanges" :key="range.value" :value="range.value">
                {{ range.label }}
              </option>
            </select>
            <button @click="showCustomReportModal = true" class="btn btn-primary">
              <i class="fas fa-plus"></i>
              Custom Report
            </button>
            <button @click="exportAllData" class="btn btn-outline-primary">
              <i class="fas fa-download"></i>
              Export All
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>Loading analytics data...</p>
    </div>

    <!-- Main Content -->
    <div v-else class="analytics-content">
      <!-- Key Performance Metrics -->
      <section class="metrics-section">
        <h2 class="section-title">
          <i class="fas fa-tachometer-alt"></i>
          Key Performance Metrics
        </h2>
        <div class="metrics-grid">
          <div v-for="metric in keyMetrics" :key="metric.key" class="metric-card" :class="metric.type">
            <div class="metric-header">
              <div class="metric-icon">
                <i :class="metric.icon"></i>
              </div>
              <div class="metric-actions">
                <button @click="exportMetric(metric)" class="metric-export-btn" title="Export metric data">
                  <i class="fas fa-download"></i>
                </button>
              </div>
            </div>
            <div class="metric-content">
              <h3 class="metric-value">{{ formatMetricValue(metric.value, metric.format) }}</h3>
              <p class="metric-label">{{ metric.label }}</p>
              <div class="metric-change" :class="metric.trend">
                <i :class="metric.trend === 'positive' ? 'fas fa-arrow-up' : metric.trend === 'negative' ? 'fas fa-arrow-down' : 'fas fa-minus'"></i>
                {{ metric.change }}
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Report Categories -->
      <section class="reports-section">
        <h2 class="section-title">
          <i class="fas fa-file-alt"></i>
          Report Categories
        </h2>
        <div class="categories-grid">
          <div v-for="category in reportCategories" :key="category.key" class="category-card">
            <div class="category-header">
              <div class="category-icon">
                <i :class="category.icon"></i>
              </div>
              <h3 class="category-title">{{ category.title }}</h3>
              <p class="category-description">{{ category.description }}</p>
            </div>
            <div class="category-reports">
              <div v-for="report in category.reports" :key="report.key" class="report-item">
                <div class="report-info">
                  <span class="report-name">{{ report.name }}</span>
                  <span class="report-description">{{ report.description }}</span>
                </div>
                <div class="report-actions">
                  <button @click="viewReport(report)" class="btn-report-action view" title="View Report">
                    <i class="fas fa-eye"></i>
                  </button>
                  <button @click="exportReport(report)" class="btn-report-action export" title="Export Report">
                    <i class="fas fa-download"></i>
                  </button>
                  <button @click="scheduleReport(report)" class="btn-report-action schedule" title="Schedule Report">
                    <i class="fas fa-clock"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Quick Analytics Dashboard -->
      <section class="dashboard-section">
        <h2 class="section-title">
          <i class="fas fa-chart-bar"></i>
          Quick Analytics Dashboard
        </h2>
        <div class="dashboard-grid">
          <div class="chart-container revenue-trend">
            <div class="chart-header">
              <h4>Revenue Trend</h4>
              <div class="chart-controls">
                <button @click="changeChartType('revenue', 'line')" :class="{ active: chartTypes.revenue === 'line' }">Line</button>
                <button @click="changeChartType('revenue', 'bar')" :class="{ active: chartTypes.revenue === 'bar' }">Bar</button>
              </div>
            </div>
            <div class="chart-content">
              <div class="chart-placeholder">
                <i class="fas fa-chart-line"></i>
                <p>Revenue trend chart will appear here</p>
              </div>
            </div>
          </div>

          <div class="chart-container booking-analytics">
            <div class="chart-header">
              <h4>Booking Analytics</h4>
              <div class="chart-controls">
                <button @click="changeChartType('booking', 'pie')" :class="{ active: chartTypes.booking === 'pie' }">Pie</button>
                <button @click="changeChartType('booking', 'doughnut')" :class="{ active: chartTypes.booking === 'doughnut' }">Doughnut</button>
              </div>
            </div>
            <div class="chart-content">
              <div class="chart-placeholder">
                <i class="fas fa-chart-pie"></i>
                <p>Booking analytics chart will appear here</p>
              </div>
            </div>
          </div>

          <div class="chart-container customer-insights">
            <div class="chart-header">
              <h4>Customer Insights</h4>
            </div>
            <div class="chart-content">
              <div class="insight-stats">
                <div class="insight-item">
                  <span class="insight-value">{{ customerInsights.newCustomers }}</span>
                  <span class="insight-label">New Customers</span>
                </div>
                <div class="insight-item">
                  <span class="insight-value">{{ customerInsights.returningCustomers }}</span>
                  <span class="insight-label">Returning</span>
                </div>
                <div class="insight-item">
                  <span class="insight-value">{{ customerInsights.averageLifetime }}</span>
                  <span class="insight-label">Avg. Lifetime</span>
                </div>
                <div class="insight-item">
                  <span class="insight-value">{{ customerInsights.satisfactionScore }}</span>
                  <span class="insight-label">Satisfaction</span>
                </div>
              </div>
            </div>
          </div>

          <div class="chart-container performance-metrics">
            <div class="chart-header">
              <h4>Performance Metrics</h4>
            </div>
            <div class="chart-content">
              <div class="performance-list">
                <div v-for="metric in performanceMetrics" :key="metric.name" class="performance-item">
                  <div class="performance-info">
                    <span class="performance-name">{{ metric.name }}</span>
                    <span class="performance-target">Target: {{ metric.target }}</span>
                  </div>
                  <div class="performance-value">
                    <div class="progress-bar">
                      <div class="progress-fill" :style="{ width: metric.percentage + '%' }"></div>
                    </div>
                    <span class="percentage">{{ metric.current }} ({{ metric.percentage }}%)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Recent Activity & Alerts -->
      <section class="activity-section">
        <div class="activity-grid">
          <div class="recent-reports">
            <h3 class="activity-title">
              <i class="fas fa-history"></i>
              Recent Reports
            </h3>
            <div class="activity-list">
              <div v-for="report in recentReports" :key="report.id" class="activity-item">
                <div class="activity-icon">
                  <i :class="report.icon"></i>
                </div>
                <div class="activity-info">
                  <span class="activity-name">{{ report.name }}</span>
                  <span class="activity-time">{{ formatTime(report.createdAt) }}</span>
                </div>
                <div class="activity-actions">
                  <button @click="viewReport(report)" class="btn-activity">View</button>
                  <button @click="downloadReport(report)" class="btn-activity">Download</button>
                </div>
              </div>
            </div>
          </div>

          <div class="system-alerts">
            <h3 class="activity-title">
              <i class="fas fa-exclamation-triangle"></i>
              System Alerts
            </h3>
            <div class="alerts-list">
              <div v-for="alert in systemAlerts" :key="alert.id" class="alert-item" :class="alert.severity">
                <div class="alert-icon">
                  <i :class="alert.icon"></i>
                </div>
                <div class="alert-info">
                  <span class="alert-title">{{ alert.title }}</span>
                  <span class="alert-message">{{ alert.message }}</span>
                </div>
                <div class="alert-actions">
                  <button @click="dismissAlert(alert)" class="btn-dismiss">
                    <i class="fas fa-times"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- Custom Report Modal -->
    <div v-if="showCustomReportModal" class="modal-overlay" @click="closeCustomReportModal">
      <div class="modal-content custom-report-modal" @click.stop>
        <div class="modal-header">
          <h3>Create Custom Report</h3>
          <button @click="closeCustomReportModal" class="modal-close">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="custom-report-form">
            <div class="form-section">
              <label class="form-label">Report Name</label>
              <input v-model="customReport.name" type="text" class="form-input" placeholder="Enter report name">
            </div>
            <div class="form-section">
              <label class="form-label">Data Sources</label>
              <div class="checkbox-group">
                <label v-for="source in dataSources" :key="source.key" class="checkbox-item">
                  <input v-model="customReport.sources" :value="source.key" type="checkbox">
                  <span>{{ source.name }}</span>
                </label>
              </div>
            </div>
            <div class="form-section">
              <label class="form-label">Chart Type</label>
              <select v-model="customReport.chartType" class="form-select">
                <option value="table">Table</option>
                <option value="line">Line Chart</option>
                <option value="bar">Bar Chart</option>
                <option value="pie">Pie Chart</option>
                <option value="area">Area Chart</option>
              </select>
            </div>
            <div class="form-section">
              <label class="form-label">Date Range</label>
              <div class="date-range-inputs">
                <input v-model="customReport.dateFrom" type="date" class="form-input">
                <input v-model="customReport.dateTo" type="date" class="form-input">
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closeCustomReportModal" class="btn btn-secondary">Cancel</button>
          <button @click="generateCustomReport" class="btn btn-primary">Generate Report</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useOrganizationContext } from '@/composables/useOrganizationContext'

export default {
  name: 'UnifiedAnalytics',
  setup() {
    const {
      isInOrganizationContext,
      getCurrentOrganizationName,
      addOrganizationFilter
    } = useOrganizationContext()

    // Reactive data
    const isLoading = ref(false)
    const selectedTimeRange = ref('30d')
    const showCustomReportModal = ref(false)
    const chartTypes = ref({
      revenue: 'line',
      booking: 'pie'
    })

    // Time range options
    const timeRanges = ref([
      { value: '7d', label: 'Last 7 days' },
      { value: '30d', label: 'Last 30 days' },
      { value: '90d', label: 'Last 90 days' },
      { value: '6m', label: 'Last 6 months' },
      { value: '1y', label: 'Last year' },
      { value: 'custom', label: 'Custom range' }
    ])

    // Key metrics data
    const keyMetrics = ref([
      {
        key: 'revenue',
        label: 'Total Revenue',
        value: 145690,
        format: 'currency',
        change: '+12.5%',
        trend: 'positive',
        icon: 'fas fa-dollar-sign',
        type: 'revenue'
      },
      {
        key: 'bookings',
        label: 'Total Bookings',
        value: 2847,
        format: 'number',
        change: '+8.3%',
        trend: 'positive',
        icon: 'fas fa-calendar-check',
        type: 'bookings'
      },
      {
        key: 'customers',
        label: 'Active Customers',
        value: 1203,
        format: 'number',
        change: '+15.7%',
        trend: 'positive',
        icon: 'fas fa-users',
        type: 'customers'
      },
      {
        key: 'satisfaction',
        label: 'Customer Satisfaction',
        value: 94.2,
        format: 'percentage',
        change: '+2.1%',
        trend: 'positive',
        icon: 'fas fa-star',
        type: 'satisfaction'
      },
      {
        key: 'conversion',
        label: 'Conversion Rate',
        value: 23.8,
        format: 'percentage',
        change: '-1.2%',
        trend: 'negative',
        icon: 'fas fa-chart-line',
        type: 'conversion'
      },
      {
        key: 'avgBooking',
        label: 'Average Booking Value',
        value: 185.50,
        format: 'currency',
        change: '+5.4%',
        trend: 'positive',
        icon: 'fas fa-receipt',
        type: 'booking-value'
      }
    ])

    // Report categories
    const reportCategories = ref([
      {
        key: 'financial',
        title: 'Financial Reports',
        description: 'Revenue, expenses, and financial performance analytics',
        icon: 'fas fa-chart-line',
        reports: [
          { key: 'revenue-summary', name: 'Revenue Summary', description: 'Comprehensive revenue breakdown' },
          { key: 'profit-loss', name: 'Profit & Loss', description: 'P&L statement and trends' },
          { key: 'expense-analysis', name: 'Expense Analysis', description: 'Detailed expense categorization' },
          { key: 'tax-reports', name: 'Tax Reports', description: 'Tax compliance and reporting' }
        ]
      },
      {
        key: 'operational',
        title: 'Operational Reports',
        description: 'Service performance, bookings, and operational metrics',
        icon: 'fas fa-cogs',
        reports: [
          { key: 'booking-analytics', name: 'Booking Analytics', description: 'Booking trends and patterns' },
          { key: 'service-performance', name: 'Service Performance', description: 'Service utilization and efficiency' },
          { key: 'staff-productivity', name: 'Staff Productivity', description: 'Individual and team performance' },
          { key: 'resource-utilization', name: 'Resource Utilization', description: 'Equipment and facility usage' }
        ]
      },
      {
        key: 'customer',
        title: 'Customer Reports',
        description: 'Customer behavior, satisfaction, and retention analysis',
        icon: 'fas fa-users',
        reports: [
          { key: 'customer-acquisition', name: 'Customer Acquisition', description: 'New customer trends' },
          { key: 'retention-analysis', name: 'Retention Analysis', description: 'Customer loyalty metrics' },
          { key: 'satisfaction-surveys', name: 'Satisfaction Surveys', description: 'Customer feedback analysis' },
          { key: 'lifetime-value', name: 'Customer Lifetime Value', description: 'CLV calculations and trends' }
        ]
      },
      {
        key: 'marketing',
        title: 'Marketing Reports',
        description: 'Campaign performance, ROI, and marketing analytics',
        icon: 'fas fa-bullhorn',
        reports: [
          { key: 'campaign-performance', name: 'Campaign Performance', description: 'Marketing campaign effectiveness' },
          { key: 'roi-analysis', name: 'ROI Analysis', description: 'Marketing return on investment' },
          { key: 'channel-attribution', name: 'Channel Attribution', description: 'Lead source performance' },
          { key: 'social-media', name: 'Social Media Analytics', description: 'Social platform performance' }
        ]
      },
      {
        key: 'inventory',
        title: 'Inventory Reports',
        description: 'Stock levels, product performance, and supply chain analytics',
        icon: 'fas fa-boxes',
        reports: [
          { key: 'stock-levels', name: 'Stock Levels', description: 'Current inventory status' },
          { key: 'product-performance', name: 'Product Performance', description: 'Best and worst performers' },
          { key: 'supplier-analysis', name: 'Supplier Analysis', description: 'Vendor performance metrics' },
          { key: 'demand-forecasting', name: 'Demand Forecasting', description: 'Predictive inventory planning' }
        ]
      },
      {
        key: 'compliance',
        title: 'Compliance Reports',
        description: 'Regulatory compliance, audit trails, and governance',
        icon: 'fas fa-shield-alt',
        reports: [
          { key: 'audit-trail', name: 'Audit Trail', description: 'Complete system activity log' },
          { key: 'compliance-status', name: 'Compliance Status', description: 'Regulatory compliance overview' },
          { key: 'data-privacy', name: 'Data Privacy Report', description: 'GDPR and privacy compliance' },
          { key: 'security-incidents', name: 'Security Incidents', description: 'Security events and responses' }
        ]
      }
    ])

    // Sample data for dashboard components
    const customerInsights = ref({
      newCustomers: 127,
      returningCustomers: 891,
      averageLifetime: '18 months',
      satisfactionScore: '4.2/5'
    })

    const performanceMetrics = ref([
      { name: 'Booking Conversion', current: '23.8%', target: '25%', percentage: 95 },
      { name: 'Customer Retention', current: '87.3%', target: '90%', percentage: 97 },
      { name: 'Service Quality', current: '94.2%', target: '95%', percentage: 99 },
      { name: 'Response Time', current: '2.3 min', target: '2 min', percentage: 85 }
    ])

    const recentReports = ref([
      { id: 1, name: 'Monthly Revenue Report', icon: 'fas fa-chart-bar', createdAt: new Date() },
      { id: 2, name: 'Customer Satisfaction Survey', icon: 'fas fa-users', createdAt: new Date() },
      { id: 3, name: 'Staff Performance Review', icon: 'fas fa-user-tie', createdAt: new Date() }
    ])

    const systemAlerts = ref([
      {
        id: 1,
        title: 'High Booking Volume',
        message: 'Bookings are 150% above normal',
        severity: 'warning',
        icon: 'fas fa-exclamation-triangle'
      },
      {
        id: 2,
        title: 'Low Inventory Alert',
        message: 'Several items below minimum threshold',
        severity: 'error',
        icon: 'fas fa-box-open'
      }
    ])

    // Custom report form
    const customReport = ref({
      name: '',
      sources: [],
      chartType: 'table',
      dateFrom: '',
      dateTo: ''
    })

    const dataSources = ref([
      { key: 'bookings', name: 'Bookings' },
      { key: 'customers', name: 'Customers' },
      { key: 'revenue', name: 'Revenue' },
      { key: 'services', name: 'Services' },
      { key: 'staff', name: 'Staff' },
      { key: 'inventory', name: 'Inventory' }
    ])

    // Methods
    const formatMetricValue = (value, format) => {
      switch (format) {
        case 'currency':
          return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
        case 'percentage':
          return `${value}%`
        case 'number':
          return new Intl.NumberFormat('en-US').format(value)
        default:
          return value
      }
    }

    const formatTime = (date) => {
      return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(-1, 'day')
    }

    const refreshData = async () => {
      isLoading.value = true
      // Simulate API call with organization filter
      const params = addOrganizationFilter({ timeRange: selectedTimeRange.value })
      console.log('Refreshing analytics data with params:', params)

      // Simulate loading
      setTimeout(() => {
        isLoading.value = false
      }, 1000)
    }

    const changeChartType = (chart, type) => {
      chartTypes.value[chart] = type
    }

    const viewReport = (report) => {
      console.log('Viewing report:', report)
      // Implement report viewing logic
    }

    const exportReport = (report) => {
      console.log('Exporting report:', report)
      // Implement export logic
    }

    const scheduleReport = (report) => {
      console.log('Scheduling report:', report)
      // Implement scheduling logic
    }

    const exportMetric = (metric) => {
      console.log('Exporting metric:', metric)
      // Implement metric export logic
    }

    const exportAllData = () => {
      console.log('Exporting all data')
      // Implement bulk export logic
    }

    const closeCustomReportModal = () => {
      showCustomReportModal.value = false
      // Reset form
      customReport.value = {
        name: '',
        sources: [],
        chartType: 'table',
        dateFrom: '',
        dateTo: ''
      }
    }

    const generateCustomReport = () => {
      console.log('Generating custom report:', customReport.value)
      // Implement custom report generation
      closeCustomReportModal()
    }

    const dismissAlert = (alert) => {
      const index = systemAlerts.value.findIndex(a => a.id === alert.id)
      if (index > -1) {
        systemAlerts.value.splice(index, 1)
      }
    }

    // Lifecycle
    onMounted(() => {
      refreshData()
    })

    return {
      // Data
      isLoading,
      selectedTimeRange,
      showCustomReportModal,
      chartTypes,
      timeRanges,
      keyMetrics,
      reportCategories,
      customerInsights,
      performanceMetrics,
      recentReports,
      systemAlerts,
      customReport,
      dataSources,

      // Organization context
      isInOrganizationContext,
      getCurrentOrganizationName,

      // Methods
      formatMetricValue,
      formatTime,
      refreshData,
      changeChartType,
      viewReport,
      exportReport,
      scheduleReport,
      exportMetric,
      exportAllData,
      closeCustomReportModal,
      generateCustomReport,
      dismissAlert
    }
  }
}
</script>

<style scoped>
.unified-analytics-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

/* Header Styles */
.page-header {
  margin-bottom: 32px;
}

.page-header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: #1a202c;
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-title i {
  color: #3b82f6;
  font-size: 24px;
}

.page-subtitle {
  font-size: 16px;
  color: #64748b;
  margin: 0;
  line-height: 1.5;
}

.controls-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.time-range-select {
  min-width: 160px;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
}

.btn {
  padding: 10px 16px;
  border-radius: 8px;
  font-weight: 500;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
  cursor: pointer;
  border: none;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background: #2563eb;
  transform: translateY(-1px);
}

.btn-outline-primary {
  background: transparent;
  color: #3b82f6;
  border: 1px solid #3b82f6;
}

.btn-outline-primary:hover {
  background: #3b82f6;
  color: white;
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #64748b;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e2e8f0;
  border-left: 4px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Section Styles */
.section-title {
  font-size: 20px;
  font-weight: 600;
  color: #1a202c;
  margin: 0 0 20px 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.section-title i {
  color: #3b82f6;
  font-size: 18px;
}

.analytics-content > section {
  margin-bottom: 48px;
}

/* Metrics Grid */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

.metric-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 24px;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

.metric-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
  border-color: #3b82f6;
}

.metric-card.revenue {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
}

.metric-card.bookings {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
}

.metric-card.customers {
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  color: white;
}

.metric-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.metric-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.metric-export-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: inherit;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.metric-export-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.metric-value {
  font-size: 32px;
  font-weight: 700;
  margin: 0 0 4px 0;
}

.metric-label {
  font-size: 14px;
  opacity: 0.9;
  margin: 0 0 12px 0;
}

.metric-change {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  font-weight: 600;
}

.metric-change.positive {
  color: #10b981;
}

.metric-change.negative {
  color: #ef4444;
}

/* Dark theme overrides for metric cards */
[data-bs-theme="dark"] .metric-card {
  background: #1f2937;
  border-color: #374151;
  color: white;
}

[data-bs-theme="dark"] .metric-change.positive {
  color: #34d399;
}

[data-bs-theme="dark"] .metric-change.negative {
  color: #f87171;
}

/* Categories Grid */
.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 24px;
}

.category-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 24px;
  transition: all 0.2s ease;
}

.category-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.category-header {
  margin-bottom: 20px;
}

.category-icon {
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: white;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  margin-bottom: 16px;
}

.category-title {
  font-size: 20px;
  font-weight: 600;
  color: #1a202c;
  margin: 0 0 8px 0;
}

.category-description {
  font-size: 14px;
  color: #64748b;
  margin: 0;
  line-height: 1.5;
}

.report-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f1f5f9;
}

.report-item:last-child {
  border-bottom: none;
}

.report-info {
  flex: 1;
}

.report-name {
  display: block;
  font-weight: 500;
  color: #1a202c;
  margin-bottom: 4px;
}

.report-description {
  display: block;
  font-size: 13px;
  color: #64748b;
}

.report-actions {
  display: flex;
  gap: 8px;
}

.btn-report-action {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 12px;
}

.btn-report-action.view {
  background: #eff6ff;
  color: #3b82f6;
}

.btn-report-action.export {
  background: #f0fdf4;
  color: #10b981;
}

.btn-report-action.schedule {
  background: #fef3c7;
  color: #f59e0b;
}

.btn-report-action:hover {
  transform: scale(1.05);
}

/* Dashboard Grid */
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 24px;
}

.chart-container {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px;
  min-height: 280px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f1f5f9;
}

.chart-header h4 {
  font-size: 16px;
  font-weight: 600;
  color: #1a202c;
  margin: 0;
}

.chart-controls {
  display: flex;
  gap: 8px;
}

.chart-controls button {
  padding: 4px 12px;
  border: 1px solid #e2e8f0;
  background: white;
  color: #64748b;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.chart-controls button.active,
.chart-controls button:hover {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.chart-placeholder {
  height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  text-align: center;
}

.chart-placeholder i {
  font-size: 48px;
  margin-bottom: 12px;
}

/* Insight Stats */
.insight-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.insight-item {
  text-align: center;
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
}

.insight-value {
  display: block;
  font-size: 24px;
  font-weight: 700;
  color: #1a202c;
  margin-bottom: 4px;
}

.insight-label {
  display: block;
  font-size: 12px;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Performance Metrics */
.performance-list {
  space: 16px;
}

.performance-item {
  margin-bottom: 20px;
}

.performance-item:last-child {
  margin-bottom: 0;
}

.performance-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.performance-name {
  font-weight: 500;
  color: #1a202c;
}

.performance-target {
  font-size: 12px;
  color: #64748b;
}

.performance-value {
  display: flex;
  align-items: center;
  gap: 12px;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background: #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #10b981, #059669);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.percentage {
  font-size: 12px;
  color: #64748b;
  white-space: nowrap;
}

/* Activity Section */
.activity-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 24px;
}

.recent-reports,
.system-alerts {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 24px;
}

.activity-title {
  font-size: 18px;
  font-weight: 600;
  color: #1a202c;
  margin: 0 0 20px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.activity-item,
.alert-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #f1f5f9;
}

.activity-item:last-child,
.alert-item:last-child {
  border-bottom: none;
}

.activity-icon,
.alert-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  background: #f1f5f9;
  color: #64748b;
}

.activity-info,
.alert-info {
  flex: 1;
}

.activity-name,
.alert-title {
  display: block;
  font-weight: 500;
  color: #1a202c;
  margin-bottom: 2px;
}

.activity-time,
.alert-message {
  display: block;
  font-size: 12px;
  color: #64748b;
}

.activity-actions {
  display: flex;
  gap: 8px;
}

.btn-activity {
  padding: 4px 12px;
  border: 1px solid #e2e8f0;
  background: white;
  color: #64748b;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-activity:hover {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

/* Alert severity styles */
.alert-item.warning .alert-icon {
  background: #fef3c7;
  color: #f59e0b;
}

.alert-item.error .alert-icon {
  background: #fee2e2;
  color: #ef4444;
}

.alert-item.info .alert-icon {
  background: #dbeafe;
  color: #3b82f6;
}

.btn-dismiss {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: #94a3b8;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-dismiss:hover {
  background: #f1f5f9;
  color: #64748b;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid #e2e8f0;
}

.modal-header h3 {
  font-size: 20px;
  font-weight: 600;
  color: #1a202c;
  margin: 0;
}

.modal-close {
  width: 32px;
  height: 32px;
  border: none;
  background: #f1f5f9;
  color: #64748b;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.modal-close:hover {
  background: #e2e8f0;
  color: #1a202c;
}

.modal-body {
  padding: 24px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 24px;
  border-top: 1px solid #e2e8f0;
}

/* Custom Report Form */
.form-section {
  margin-bottom: 24px;
}

.form-label {
  display: block;
  font-weight: 500;
  color: #1a202c;
  margin-bottom: 8px;
}

.form-input,
.form-select {
  width: 100%;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s ease;
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.checkbox-group {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-item input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: #3b82f6;
}

.date-range-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.btn-secondary {
  background: #f1f5f9;
  color: #64748b;
  border: 1px solid #e2e8f0;
}

.btn-secondary:hover {
  background: #e2e8f0;
  color: #1a202c;
}

/* Dark Theme Support */
[data-bs-theme="dark"] {
  .unified-analytics-page {
    color: #e2e8f0;
  }

  .page-title {
    color: #f8fafc;
  }

  .page-subtitle {
    color: #94a3b8;
  }

  .section-title {
    color: #f8fafc;
  }

  .category-card,
  .chart-container,
  .recent-reports,
  .system-alerts {
    background: #1f2937;
    border-color: #374151;
  }

  .category-title,
  .activity-name,
  .alert-title,
  .report-name {
    color: #f8fafc;
  }

  .category-description,
    .activity-time,
    .alert-message,
    .report-description {
    color: #94a3b8;
  }

  .chart-header h4 {
    color: #f8fafc;
  }

  .insight-item {
    background: #374151;
  }

  .insight-value,
  .performance-name {
    color: #f8fafc;
  }

  .insight-label,
  .performance-target,
  .percentage {
    color: #94a3b8;
  }

  .progress-bar {
    background: #374151;
  }
}

/* Responsive Design */
@media (max-width: 768px) {
  .unified-analytics-page {
    padding: 16px;
  }

  .page-header-content {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }

  .controls-group {
    flex-wrap: wrap;
  }

  .metrics-grid {
    grid-template-columns: 1fr;
  }

  .categories-grid {
    grid-template-columns: 1fr;
  }

  .dashboard-grid {
    grid-template-columns: 1fr;
  }

  .activity-grid {
    grid-template-columns: 1fr;
  }

  .insight-stats {
    grid-template-columns: 1fr;
  }

  .checkbox-group {
    grid-template-columns: 1fr;
  }

  .date-range-inputs {
    grid-template-columns: 1fr;
  }
}
</style>