<template>
  <div class="analytics-page">
    <!-- Action Buttons Section -->
    <div class="page-actions d-flex justify-content-end mb-4">
      <select v-model="selectedTimeRange" class="form-select" style="width: auto;">
        <option v-for="range in timeRanges" :key="range.value" :value="range.value">
          {{ range.label }}
        </option>
      </select>
    </div>

    <!-- Key Metrics Cards -->
    <div class="metrics-grid">
      <div class="metric-card revenue">
        <div class="metric-icon">
          <i class="fas fa-dollar-sign"></i>
        </div>
        <div class="metric-content">
          <h3>${{ formatNumber(metrics.totalRevenue) }}</h3>
          <p>Total Revenue</p>
          <div class="metric-change positive">
            <i class="fas fa-arrow-up"></i>
            +12.5%
          </div>
        </div>
      </div>

      <div class="metric-card bookings">
        <div class="metric-icon">
          <i class="fas fa-calendar-check"></i>
        </div>
        <div class="metric-content">
          <h3>{{ formatNumber(metrics.totalBookings) }}</h3>
          <p>Total Bookings</p>
          <div class="metric-change positive">
            <i class="fas fa-arrow-up"></i>
            +8.3%
          </div>
        </div>
      </div>

      <div class="metric-card customers">
        <div class="metric-icon">
          <i class="fas fa-users"></i>
        </div>
        <div class="metric-content">
          <h3>{{ formatNumber(metrics.totalCustomers) }}</h3>
          <p>Active Customers</p>
          <div class="metric-change positive">
            <i class="fas fa-arrow-up"></i>
            +15.2%
          </div>
        </div>
      </div>

      <div class="metric-card conversion">
        <div class="metric-icon">
          <i class="fas fa-percentage"></i>
        </div>
        <div class="metric-content">
          <h3>{{ metrics.conversionRate }}%</h3>
          <p>Conversion Rate</p>
          <div class="metric-change negative">
            <i class="fas fa-arrow-down"></i>
            -2.1%
          </div>
        </div>
      </div>
    </div>

    <!-- Charts Section -->
    <div class="charts-section">
      <div class="chart-container">
        <h3>Revenue Trends</h3>
        <div class="chart-placeholder">
          <i class="fas fa-chart-line"></i>
          <p>Revenue chart would be displayed here</p>
          <small>Integration with charting library (Chart.js, D3, etc.) required</small>
        </div>
      </div>

      <div class="chart-container">
        <h3>Booking Distribution by Business Type</h3>
        <div class="chart-placeholder">
          <i class="fas fa-chart-pie"></i>
          <p>Pie chart would be displayed here</p>
          <div class="business-stats">
            <div class="stat-item">
              <span class="color-dot garage"></span>
              <span>Garage Services: 45%</span>
            </div>
            <div class="stat-item">
              <span class="color-dot salon"></span>
              <span>Salon Services: 35%</span>
            </div>
            <div class="stat-item">
              <span class="color-dot other"></span>
              <span>Other Services: 20%</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Detailed Analytics Tables -->
    <div class="analytics-tables">
      <!-- Top Organizations -->
      <div class="table-container">
        <h3>Top Performing Organizations</h3>
        <table class="analytics-table">
          <thead>
            <tr>
              <th>Organization</th>
              <th>Business Type</th>
              <th>Revenue</th>
              <th>Bookings</th>
              <th>Growth</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="org in topOrganizations" :key="org.id">
              <td>
                <div class="org-info">
                  <strong>{{ org.name }}</strong>
                  <small>{{ org.location }}</small>
                </div>
              </td>
              <td>
                <span class="business-badge" :class="org.type">
                  {{ formatBusinessType(org.type) }}
                </span>
              </td>
              <td class="revenue">${{ formatNumber(org.revenue) }}</td>
              <td>{{ formatNumber(org.bookings) }}</td>
              <td>
                <div class="growth" :class="org.growth > 0 ? 'positive' : 'negative'">
                  <i :class="org.growth > 0 ? 'fas fa-arrow-up' : 'fas fa-arrow-down'"></i>
                  {{ Math.abs(org.growth) }}%
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Popular Services -->
      <div class="table-container">
        <h3>Most Popular Services</h3>
        <table class="analytics-table">
          <thead>
            <tr>
              <th>Service</th>
              <th>Category</th>
              <th>Bookings</th>
              <th>Revenue</th>
              <th>Avg. Rating</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="service in popularServices" :key="service.id">
              <td>
                <strong>{{ service.name }}</strong>
              </td>
              <td>{{ service.category }}</td>
              <td>{{ formatNumber(service.bookings) }}</td>
              <td>${{ formatNumber(service.revenue) }}</td>
              <td>
                <div class="rating">
                  <span class="stars">
                    <i v-for="n in 5" :key="n" class="fas fa-star" :class="{ active: n <= service.rating }"></i>
                  </span>
                  <span class="rating-value">{{ service.rating }}</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Export Options -->
    <div class="export-section">
      <h3>Export Analytics</h3>
      <div class="export-buttons">
        <button class="btn secondary" @click="exportData('csv')">
          <i class="fas fa-file-csv"></i>
          Export CSV
        </button>
        <button class="btn secondary" @click="exportData('excel')">
          <i class="fas fa-file-excel"></i>
          Export Excel
        </button>
        <button class="btn secondary" @click="exportData('pdf')">
          <i class="fas fa-file-pdf"></i>
          Export PDF Report
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Analytics',
  data() {
    return {
      selectedTimeRange: '30d',
      timeRanges: [
        { value: '7d', label: 'Last 7 Days' },
        { value: '30d', label: 'Last 30 Days' },
        { value: '90d', label: 'Last 3 Months' },
        { value: '1y', label: 'Last Year' }
      ],
      metrics: {
        totalRevenue: 284500,
        totalBookings: 12847,
        totalCustomers: 3654,
        conversionRate: 67.3
      },
      topOrganizations: [
        {
          id: 1,
          name: 'AutoCare Plus',
          location: 'New York, NY',
          type: 'garage',
          revenue: 85420,
          bookings: 342,
          growth: 12.5
        },
        {
          id: 2,
          name: 'Elegant Salon & Spa',
          location: 'Los Angeles, CA',
          type: 'salon',
          revenue: 67890,
          bookings: 289,
          growth: 8.7
        },
        {
          id: 3,
          name: 'Quick Fix Garage',
          location: 'Chicago, IL',
          type: 'garage',
          revenue: 54320,
          bookings: 198,
          growth: -2.3
        },
        {
          id: 4,
          name: 'Beauty Palace',
          location: 'Miami, FL',
          type: 'salon',
          revenue: 43210,
          bookings: 156,
          growth: 15.2
        }
      ],
      popularServices: [
        {
          id: 1,
          name: 'Oil Change & Filter',
          category: 'Automotive',
          bookings: 1243,
          revenue: 87010,
          rating: 4.8
        },
        {
          id: 2,
          name: 'Haircut & Styling',
          category: 'Beauty',
          bookings: 987,
          revenue: 49350,
          rating: 4.6
        },
        {
          id: 3,
          name: 'Brake Inspection',
          category: 'Automotive',
          bookings: 756,
          revenue: 64580,
          rating: 4.7
        },
        {
          id: 4,
          name: 'Facial Treatment',
          category: 'Beauty',
          bookings: 654,
          revenue: 39240,
          rating: 4.9
        }
      ]
    }
  },
  methods: {
    formatNumber(num) {
      return new Intl.NumberFormat().format(num)
    },
    formatBusinessType(type) {
      return type.charAt(0).toUpperCase() + type.slice(1)
    },
    exportData(format) {
      alert(`Exporting analytics data as ${format.toUpperCase()}...`)
    }
  }
}
</script>

<style scoped>
.analytics-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1.5rem;
  min-height: 100vh;
}

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
  background: linear-gradient(90deg, transparent, rgba(147, 197, 253, 0.5), transparent);
}

[data-theme="dark"] .page-header {
  background: linear-gradient(135deg, rgba(31, 41, 55, 0.95) 0%, rgba(17, 24, 39, 0.85) 100%);
  border: 1px solid rgba(75, 85, 99, 0.3);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}

[data-theme="dark"] .page-header::before {
  background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.3), transparent);
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
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 32px rgba(16, 185, 129, 0.25);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
}

.title-icon:hover {
  transform: scale(1.05) translateY(-2px);
  box-shadow: 0 12px 40px rgba(16, 185, 129, 0.35);
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

.time-select {
  padding: 14px 16px;
  border: 2px solid rgba(226, 232, 240, 0.6);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: var(--bs-body-color);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 180px;
  font-size: 1rem;
  line-height: 1.5;
}

.time-select:focus {
  outline: none;
  border-color: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
  transform: translateY(-1px);
}

[data-theme="dark"] .page-title {
  color: #f8fafc;
}

[data-theme="dark"] .page-description {
  color: #cbd5e1;
}

[data-theme="dark"] .time-select {
  border: 2px solid rgba(75, 85, 99, 0.6);
  background: rgba(31, 41, 55, 0.9);
  color: #f1f5f9;
}


.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
}

.metric-card {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  display: flex;
  align-items: center;
  gap: 1rem;
}

.metric-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: white;
}

.metric-card.revenue .metric-icon { background: linear-gradient(135deg, #667eea, #764ba2); }
.metric-card.bookings .metric-icon { background: linear-gradient(135deg, #4facfe, #00f2fe); }
.metric-card.customers .metric-icon { background: linear-gradient(135deg, #43e97b, #38f9d7); }
.metric-card.conversion .metric-icon { background: linear-gradient(135deg, #fa709a, #fee140); }

.metric-content h3 {
  font-size: 1.8rem;
  font-weight: 700;
  margin: 0;
  color: var(--bs-body-color);
}

.metric-content p {
  margin: 0;
  color: var(--bs-secondary);
  font-size: 0.9rem;
}

.metric-change {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.85rem;
  font-weight: 600;
  margin-top: 0.5rem;
}

.metric-change.positive { color: #28a745; }
.metric-change.negative { color: #dc3545; }

.charts-section {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 2rem;
  margin-bottom: 3rem;
}

.chart-container {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.chart-container h3 {
  margin-bottom: 1.5rem;
  color: var(--bs-body-color);
}

.chart-placeholder {
  text-align: center;
  padding: 3rem 2rem;
  color: var(--bs-secondary);
}

.chart-placeholder i {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.business-stats {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.color-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.color-dot.garage { background: #667eea; }
.color-dot.salon { background: #43e97b; }
.color-dot.other { background: #fa709a; }

.analytics-tables {
  display: grid;
  gap: 2rem;
  margin-bottom: 3rem;
}

.table-container {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.table-container h3 {
  margin-bottom: 1.5rem;
  color: var(--bs-body-color);
}

.analytics-table {
  width: 100%;
  border-collapse: collapse;
}

.analytics-table th {
  text-align: left;
  padding: 0.75rem;
  font-weight: 600;
  color: var(--bs-body-color);
  border-bottom: 2px solid #e9ecef;
}

.analytics-table td {
  padding: 1rem 0.75rem;
  border-bottom: 1px solid #f1f3f4;
}

.org-info strong {
  display: block;
  color: var(--bs-body-color);
}

.org-info small {
  color: var(--bs-secondary);
}

.business-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
}

.business-badge.garage { background: #e3f2fd; color: #1976d2; }
.business-badge.salon { background: #e8f5e8; color: #2e7d32; }

.revenue {
  font-weight: 600;
  color: var(--bs-body-color);
}

.growth {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-weight: 600;
  font-size: 0.9rem;
}

.growth.positive { color: #28a745; }
.growth.negative { color: #dc3545; }

.rating {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.stars {
  display: flex;
  gap: 0.1rem;
}

.stars i {
  color: #ddd;
  font-size: 0.8rem;
}

.stars i.active {
  color: #ffc107;
}

.rating-value {
  font-weight: 600;
  color: var(--bs-body-color);
}

.export-section {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.export-section h3 {
  margin-bottom: 1.5rem;
  color: var(--bs-body-color);
}

.export-buttons {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
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

@media (max-width: 1024px) {
  .charts-section {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .analytics {
    padding: 1rem;
  }
  
  .metrics-grid {
    grid-template-columns: 1fr;
  }
  
  .analytics-table {
    font-size: 0.9rem;
  }
  
  .export-buttons {
    flex-direction: column;
  }
}
</style>