<template>
  <div class="crm-module">
    <!-- Action Buttons Section -->
    <div class="page-actions d-flex justify-content-end mb-4">
      <button class="btn btn-outline-info me-2" @click="exportData">
        <i class="bi bi-download me-2"></i>
        Export Data
      </button>
      <button class="btn btn-primary" @click="showLeadModal = true">
        <i class="bi bi-plus-lg me-2"></i>
        Add Lead
      </button>
    </div>

    <!-- CRM Dashboard Cards -->
    <div class="stats-overview mb-5">
      <div class="row g-4">
        <div class="col-lg-3 col-md-6">
          <div class="stat-card bg-gradient-primary">
            <div class="stat-content">
              <div class="stat-icon">
                <i class="bi bi-person-plus"></i>
              </div>
              <div class="stat-details">
                <h3 class="stat-value">{{ dashboard?.total_leads || 0 }}</h3>
                <p class="stat-label">Total Leads</p>
                <small class="stat-change positive">
                  <i class="bi bi-arrow-up"></i> +{{ dashboard?.new_leads || 0 }} this week
                </small>
              </div>
            </div>
          </div>
        </div>

        <div class="col-lg-3 col-md-6">
          <div class="stat-card bg-gradient-success">
            <div class="stat-content">
              <div class="stat-icon">
                <i class="bi bi-trophy"></i>
              </div>
              <div class="stat-details">
                <h3 class="stat-value">{{ dashboard?.conversion_rate || 0 }}%</h3>
                <p class="stat-label">Conversion Rate</p>
                <small class="stat-change positive">
                  <i class="bi bi-arrow-up"></i> +2.1% this month
                </small>
              </div>
            </div>
          </div>
        </div>

        <div class="col-lg-3 col-md-6">
          <div class="stat-card bg-gradient-warning">
            <div class="stat-content">
              <div class="stat-icon">
                <i class="bi bi-bullseye"></i>
              </div>
              <div class="stat-details">
                <h3 class="stat-value">{{ dashboard?.active_opportunities || 0 }}</h3>
                <p class="stat-label">Active Opportunities</p>
                <small class="stat-change neutral">
                  <i class="bi bi-dash"></i> Pipeline value: ${{ formatMoney(dashboard?.pipeline_value || 0) }}
                </small>
              </div>
            </div>
          </div>
        </div>

        <div class="col-lg-3 col-md-6">
          <div class="stat-card bg-gradient-info">
            <div class="stat-content">
              <div class="stat-icon">
                <i class="bi bi-currency-dollar"></i>
              </div>
              <div class="stat-details">
                <h3 class="stat-value">${{ formatMoney(dashboard?.monthly_revenue || 0) }}</h3>
                <p class="stat-label">Monthly Revenue</p>
                <small class="stat-change positive">
                  <i class="bi bi-arrow-up"></i> +15.3% from last month
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- CRM Module Tabs -->
    <div class="module-tabs">
      <nav class="nav nav-tabs" id="crmTab" role="tablist">
        <button
          class="nav-link"
          :class="{ active: activeTab === 'leads' }"
          @click="activeTab = 'leads'"
          type="button"
        >
          <i class="bi bi-person-plus me-2"></i>
          Leads
        </button>
        <button
          class="nav-link"
          :class="{ active: activeTab === 'customers' }"
          @click="activeTab = 'customers'"
          type="button"
        >
          <i class="bi bi-people me-2"></i>
          Customers
        </button>
        <button
          class="nav-link"
          :class="{ active: activeTab === 'opportunities' }"
          @click="activeTab = 'opportunities'"
          type="button"
        >
          <i class="bi bi-bullseye me-2"></i>
          Opportunities
        </button>
        <button
          class="nav-link"
          :class="{ active: activeTab === 'pipeline' }"
          @click="activeTab = 'pipeline'"
          type="button"
        >
          <i class="bi bi-funnel me-2"></i>
          Sales Pipeline
        </button>
        <button
          class="nav-link"
          :class="{ active: activeTab === 'analytics' }"
          @click="activeTab = 'analytics'"
          type="button"
        >
          <i class="bi bi-graph-up me-2"></i>
          Analytics
        </button>
      </nav>

      <!-- Tab Content -->
      <div class="tab-content mt-4">
        <!-- Leads Tab -->
        <div v-show="activeTab === 'leads'" class="tab-pane">
          <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
              <h5 class="card-title mb-0">
                <i class="bi bi-person-plus me-2"></i>
                Lead Management
              </h5>
              <div class="d-flex gap-2">
                <select class="form-select form-select-sm" v-model="leadFilter" @change="filterLeads">
                  <option value="">All Leads</option>
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="qualified">Qualified</option>
                  <option value="proposal">Proposal</option>
                  <option value="negotiation">Negotiation</option>
                  <option value="closed_won">Closed Won</option>
                  <option value="closed_lost">Closed Lost</option>
                </select>
                <button class="btn btn-primary btn-sm" @click="showLeadModal = true">
                  <i class="bi bi-plus-lg me-1"></i>
                  Add Lead
                </button>
              </div>
            </div>
            <div class="card-body">
              <div class="table-responsive">
                <table class="table table-hover">
                  <thead class="table-light">
                    <tr>
                      <th>Lead</th>
                      <th>Company</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Source</th>
                      <th>Status</th>
                      <th>Value</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="lead in filteredLeads" :key="lead.id">
                      <td>
                        <div class="d-flex align-items-center">
                          <div class="avatar me-3">
                            <img :src="lead.avatar || '/default-avatar.png'" :alt="lead.name" class="rounded-circle">
                          </div>
                          <div>
                            <strong>{{ lead.name }}</strong>
                            <br>
                            <small class="text-muted">{{ lead.title }}</small>
                          </div>
                        </div>
                      </td>
                      <td>{{ lead.company }}</td>
                      <td>
                        <a :href="`mailto:${lead.email}`" class="text-decoration-none">
                          {{ lead.email }}
                        </a>
                      </td>
                      <td>
                        <a :href="`tel:${lead.phone}`" class="text-decoration-none">
                          {{ lead.phone }}
                        </a>
                      </td>
                      <td>
                        <span class="badge bg-light text-dark">{{ lead.source }}</span>
                      </td>
                      <td>
                        <span class="badge" :class="getStatusBadgeClass(lead.status)">
                          {{ getStatusLabel(lead.status) }}
                        </span>
                      </td>
                      <td class="fw-bold">${{ formatMoney(lead.estimated_value) }}</td>
                      <td>
                        <div class="btn-group" role="group">
                          <button class="btn btn-sm btn-outline-primary" @click="editLead(lead)">
                            <i class="bi bi-pencil"></i>
                          </button>
                          <button class="btn btn-sm btn-outline-info" @click="viewLead(lead)">
                            <i class="bi bi-eye"></i>
                          </button>
                          <button class="btn btn-sm btn-outline-success" @click="convertLead(lead)">
                            <i class="bi bi-arrow-right"></i>
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

        <!-- Customers Tab -->
        <div v-show="activeTab === 'customers'" class="tab-pane">
          <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
              <h5 class="card-title mb-0">
                <i class="bi bi-people me-2"></i>
                Customer Management
              </h5>
              <button class="btn btn-primary btn-sm" @click="showCustomerModal = true">
                <i class="bi bi-plus-lg me-1"></i>
                Add Customer
              </button>
            </div>
            <div class="card-body">
              <div class="table-responsive">
                <table class="table table-hover">
                  <thead class="table-light">
                    <tr>
                      <th>Customer</th>
                      <th>Company</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Total Orders</th>
                      <th>Lifetime Value</th>
                      <th>Last Contact</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="customer in customers" :key="customer.id">
                      <td>
                        <div class="d-flex align-items-center">
                          <div class="avatar me-3">
                            <img :src="customer.avatar || '/default-avatar.png'" :alt="customer.name" class="rounded-circle">
                          </div>
                          <div>
                            <strong>{{ customer.name }}</strong>
                            <br>
                            <small class="text-muted">Customer since {{ formatDate(customer.created_at) }}</small>
                          </div>
                        </div>
                      </td>
                      <td>{{ customer.company }}</td>
                      <td>
                        <a :href="`mailto:${customer.email}`" class="text-decoration-none">
                          {{ customer.email }}
                        </a>
                      </td>
                      <td>
                        <a :href="`tel:${customer.phone}`" class="text-decoration-none">
                          {{ customer.phone }}
                        </a>
                      </td>
                      <td class="text-center">{{ customer.total_orders || 0 }}</td>
                      <td class="fw-bold">${{ formatMoney(customer.lifetime_value) }}</td>
                      <td>{{ formatDate(customer.last_contact) }}</td>
                      <td>
                        <div class="btn-group" role="group">
                          <button class="btn btn-sm btn-outline-primary" @click="editCustomer(customer)">
                            <i class="bi bi-pencil"></i>
                          </button>
                          <button class="btn btn-sm btn-outline-info" @click="viewCustomer(customer)">
                            <i class="bi bi-eye"></i>
                          </button>
                          <button class="btn btn-sm btn-outline-success" @click="contactCustomer(customer)">
                            <i class="bi bi-telephone"></i>
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

        <!-- Opportunities Tab -->
        <div v-show="activeTab === 'opportunities'" class="tab-pane">
          <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
              <h5 class="card-title mb-0">
                <i class="bi bi-bullseye me-2"></i>
                Sales Opportunities
              </h5>
              <button class="btn btn-primary btn-sm" @click="showOpportunityModal = true">
                <i class="bi bi-plus-lg me-1"></i>
                New Opportunity
              </button>
            </div>
            <div class="card-body">
              <div class="table-responsive">
                <table class="table table-hover">
                  <thead class="table-light">
                    <tr>
                      <th>Opportunity</th>
                      <th>Customer</th>
                      <th>Value</th>
                      <th>Stage</th>
                      <th>Probability</th>
                      <th>Close Date</th>
                      <th>Owner</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="opportunity in opportunities" :key="opportunity.id">
                      <td>
                        <strong>{{ opportunity.name }}</strong>
                        <br>
                        <small class="text-muted">{{ opportunity.description }}</small>
                      </td>
                      <td>{{ opportunity.customer_name }}</td>
                      <td class="fw-bold">${{ formatMoney(opportunity.value) }}</td>
                      <td>
                        <span class="badge" :class="getOpportunityBadgeClass(opportunity.stage)">
                          {{ opportunity.stage.replace('_', ' ').toUpperCase() }}
                        </span>
                      </td>
                      <td>
                        <div class="progress" style="height: 20px;">
                          <div class="progress-bar" :style="`width: ${opportunity.probability}%`">
                            {{ opportunity.probability }}%
                          </div>
                        </div>
                      </td>
                      <td>{{ formatDate(opportunity.close_date) }}</td>
                      <td>{{ opportunity.owner }}</td>
                      <td>
                        <div class="btn-group" role="group">
                          <button class="btn btn-sm btn-outline-primary" @click="editOpportunity(opportunity)">
                            <i class="bi bi-pencil"></i>
                          </button>
                          <button class="btn btn-sm btn-outline-info" @click="viewOpportunity(opportunity)">
                            <i class="bi bi-eye"></i>
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

        <!-- Sales Pipeline Tab -->
        <div v-show="activeTab === 'pipeline'" class="tab-pane">
          <div class="card">
            <div class="card-header">
              <h5 class="card-title mb-0">
                <i class="bi bi-funnel me-2"></i>
                Sales Pipeline
              </h5>
            </div>
            <div class="card-body">
              <div class="pipeline-board">
                <div class="row g-3">
                  <div v-for="stage in pipelineStages" :key="stage.key" class="col-lg-2 col-md-4 col-sm-6">
                    <div class="pipeline-column">
                      <div class="pipeline-header">
                        <h6>{{ stage.name }}</h6>
                        <span class="badge bg-secondary">{{ getPipelineCount(stage.key) }}</span>
                      </div>
                      <div class="pipeline-value">
                        ${{ formatMoney(getPipelineValue(stage.key)) }}
                      </div>
                      <div class="pipeline-items">
                        <div
                          v-for="item in getPipelineItems(stage.key)"
                          :key="item.id"
                          class="pipeline-item"
                          @click="viewOpportunity(item)"
                        >
                          <div class="item-header">
                            <strong>{{ item.name }}</strong>
                            <span class="item-value">${{ formatMoney(item.value) }}</span>
                          </div>
                          <div class="item-details">
                            <small>{{ item.customer_name }}</small>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Analytics Tab -->
        <div v-show="activeTab === 'analytics'" class="tab-pane">
          <div class="row g-4">
            <div class="col-lg-6">
              <div class="card">
                <div class="card-header">
                  <h5 class="card-title mb-0">
                    <i class="bi bi-graph-up me-2"></i>
                    Lead Sources
                  </h5>
                </div>
                <div class="card-body">
                  <div class="source-analytics">
                    <div v-for="source in leadSources" :key="source.name" class="source-item mb-3">
                      <div class="d-flex justify-content-between align-items-center mb-1">
                        <span>{{ source.name }}</span>
                        <span class="fw-bold">{{ source.count }} leads</span>
                      </div>
                      <div class="progress">
                        <div class="progress-bar" :style="`width: ${source.percentage}%`"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="col-lg-6">
              <div class="card">
                <div class="card-header">
                  <h5 class="card-title mb-0">
                    <i class="bi bi-trophy me-2"></i>
                    Conversion Funnel
                  </h5>
                </div>
                <div class="card-body">
                  <div class="conversion-funnel">
                    <div v-for="stage in conversionFunnel" :key="stage.name" class="funnel-stage mb-3">
                      <div class="d-flex justify-content-between align-items-center mb-1">
                        <span>{{ stage.name }}</span>
                        <span class="fw-bold">{{ stage.count }} ({{ stage.percentage }}%)</span>
                      </div>
                      <div class="progress">
                        <div class="progress-bar bg-success" :style="`width: ${stage.percentage}%`"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Lead Modal -->
    <div v-if="showLeadModal" class="modal fade show d-block" tabindex="-1" style="background: rgba(0,0,0,0.5)">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi bi-person-plus me-2"></i>
              {{ editingLead ? 'Edit Lead' : 'Add New Lead' }}
            </h5>
            <button type="button" class="btn-close" @click="closeLeadModal"></button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="saveLead">
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">Full Name *</label>
                  <input type="text" class="form-control" v-model="leadForm.name" required>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Job Title</label>
                  <input type="text" class="form-control" v-model="leadForm.title">
                </div>
                <div class="col-md-6">
                  <label class="form-label">Company</label>
                  <input type="text" class="form-control" v-model="leadForm.company">
                </div>
                <div class="col-md-6">
                  <label class="form-label">Email *</label>
                  <input type="email" class="form-control" v-model="leadForm.email" required>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Phone</label>
                  <input type="tel" class="form-control" v-model="leadForm.phone">
                </div>
                <div class="col-md-6">
                  <label class="form-label">Lead Source</label>
                  <select class="form-select" v-model="leadForm.source">
                    <option value="website">Website</option>
                    <option value="referral">Referral</option>
                    <option value="social_media">Social Media</option>
                    <option value="email">Email Campaign</option>
                    <option value="phone">Cold Call</option>
                    <option value="trade_show">Trade Show</option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Status</label>
                  <select class="form-select" v-model="leadForm.status">
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="qualified">Qualified</option>
                    <option value="proposal">Proposal</option>
                    <option value="negotiation">Negotiation</option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Estimated Value</label>
                  <div class="input-group">
                    <span class="input-group-text">$</span>
                    <input type="number" class="form-control" v-model="leadForm.estimated_value" step="0.01" min="0">
                  </div>
                </div>
                <div class="col-12">
                  <label class="form-label">Notes</label>
                  <textarea class="form-control" rows="3" v-model="leadForm.notes"></textarea>
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="closeLeadModal">Cancel</button>
            <button type="button" class="btn btn-primary" @click="saveLead">
              {{ editingLead ? 'Update Lead' : 'Create Lead' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue'
import { crmAPI } from '../services/api'

export default {
  name: 'CRM',
  setup() {
    // State
    const loading = ref(false)
    const activeTab = ref('leads')
    const dashboard = ref(null)
    const leads = ref([])
    const customers = ref([])
    const opportunities = ref([])

    // Filters
    const leadFilter = ref('')
    const filteredLeads = ref([])

    // Modals
    const showLeadModal = ref(false)
    const showCustomerModal = ref(false)
    const showOpportunityModal = ref(false)
    const editingLead = ref(null)

    // Forms
    const leadForm = ref({
      name: '',
      title: '',
      company: '',
      email: '',
      phone: '',
      source: 'website',
      status: 'new',
      estimated_value: 0,
      notes: ''
    })

    // Pipeline data
    const pipelineStages = ref([
      { key: 'new', name: 'New' },
      { key: 'contacted', name: 'Contacted' },
      { key: 'qualified', name: 'Qualified' },
      { key: 'proposal', name: 'Proposal' },
      { key: 'negotiation', name: 'Negotiation' },
      { key: 'closed_won', name: 'Closed Won' }
    ])

    // Analytics data
    const leadSources = ref([])
    const conversionFunnel = ref([])

    // Methods
    const loadCRMData = async () => {
      try {
        loading.value = true
        const [dashboardRes, leadsRes, customersRes, opportunitiesRes] = await Promise.all([
          crmAPI.getDashboard(),
          crmAPI.getLeads(),
          crmAPI.getCustomers(),
          crmAPI.getOpportunities()
        ])

        dashboard.value = dashboardRes.data.data
        leads.value = leadsRes.data.data || []
        customers.value = customersRes.data.data || []
        opportunities.value = opportunitiesRes.data.data || []

        filteredLeads.value = leads.value
        generateAnalytics()
      } catch (error) {
        console.error('Error loading CRM data:', error)
        // Mock data for development
        generateMockData()
      } finally {
        loading.value = false
      }
    }

    const generateMockData = () => {
      leads.value = [
        {
          id: '1',
          name: 'John Smith',
          title: 'Marketing Director',
          company: 'Tech Solutions Inc',
          email: 'john.smith@techsolutions.com',
          phone: '+1 (555) 123-4567',
          source: 'website',
          status: 'qualified',
          estimated_value: 15000,
          notes: 'Interested in premium car wash services'
        },
        {
          id: '2',
          name: 'Sarah Johnson',
          title: 'CEO',
          company: 'Beauty Salon Pro',
          email: 'sarah@beautysalonpro.com',
          phone: '+1 (555) 987-6543',
          source: 'referral',
          status: 'proposal',
          estimated_value: 8500,
          notes: 'Looking for comprehensive beauty service packages'
        }
      ]

      customers.value = [
        {
          id: '1',
          name: 'Michael Brown',
          company: 'Corporate Fleet',
          email: 'michael@corporatefleet.com',
          phone: '+1 (555) 456-7890',
          total_orders: 12,
          lifetime_value: 25000,
          last_contact: '2025-09-10',
          created_at: '2024-01-15'
        }
      ]

      opportunities.value = [
        {
          id: '1',
          name: 'Fleet Management Contract',
          description: 'Monthly car wash services for 50 vehicles',
          customer_name: 'Corporate Fleet',
          value: 25000,
          stage: 'negotiation',
          probability: 75,
          close_date: '2025-10-15',
          owner: 'Sales Team'
        }
      ]

      dashboard.value = {
        total_leads: leads.value.length,
        conversion_rate: 25,
        active_opportunities: opportunities.value.length,
        pipeline_value: 50000,
        monthly_revenue: 35000,
        new_leads: 5
      }

      filteredLeads.value = leads.value
      generateAnalytics()
    }

    const generateAnalytics = () => {
      // Lead sources analysis
      const sources = {}
      leads.value.forEach(lead => {
        sources[lead.source] = (sources[lead.source] || 0) + 1
      })

      const totalLeads = leads.value.length
      leadSources.value = Object.entries(sources).map(([name, count]) => ({
        name: name.replace('_', ' ').toUpperCase(),
        count,
        percentage: totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0
      }))

      // Conversion funnel
      const stages = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won']
      const stageCounts = {}

      leads.value.forEach(lead => {
        stageCounts[lead.status] = (stageCounts[lead.status] || 0) + 1
      })

      conversionFunnel.value = stages.map(stage => {
        const count = stageCounts[stage] || 0
        return {
          name: stage.replace('_', ' ').toUpperCase(),
          count,
          percentage: totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0
        }
      })
    }

    const filterLeads = () => {
      if (leadFilter.value) {
        filteredLeads.value = leads.value.filter(lead => lead.status === leadFilter.value)
      } else {
        filteredLeads.value = leads.value
      }
    }

    const getStatusBadgeClass = (status) => {
      const classes = {
        'new': 'bg-info',
        'contacted': 'bg-primary',
        'qualified': 'bg-success',
        'proposal': 'bg-warning',
        'negotiation': 'bg-orange',
        'closed_won': 'bg-success',
        'closed_lost': 'bg-danger'
      }
      return classes[status] || 'bg-secondary'
    }

    const getStatusLabel = (status) => {
      return status.replace('_', ' ').toUpperCase()
    }

    const getOpportunityBadgeClass = (stage) => {
      const classes = {
        'new': 'bg-info',
        'contacted': 'bg-primary',
        'qualified': 'bg-success',
        'proposal': 'bg-warning',
        'negotiation': 'bg-orange',
        'closed_won': 'bg-success',
        'closed_lost': 'bg-danger'
      }
      return classes[stage] || 'bg-secondary'
    }

    const getPipelineCount = (stage) => {
      return opportunities.value.filter(opp => opp.stage === stage).length
    }

    const getPipelineValue = (stage) => {
      return opportunities.value
        .filter(opp => opp.stage === stage)
        .reduce((sum, opp) => sum + opp.value, 0)
    }

    const getPipelineItems = (stage) => {
      return opportunities.value.filter(opp => opp.stage === stage)
    }

    const editLead = (lead) => {
      editingLead.value = lead
      leadForm.value = { ...lead }
      showLeadModal.value = true
    }

    const viewLead = (lead) => {
      console.log('View lead:', lead)
    }

    const convertLead = async (lead) => {
      console.log('Convert lead to customer:', lead)
    }

    const editCustomer = (customer) => {
      console.log('Edit customer:', customer)
    }

    const viewCustomer = (customer) => {
      console.log('View customer:', customer)
    }

    const contactCustomer = (customer) => {
      console.log('Contact customer:', customer)
    }

    const editOpportunity = (opportunity) => {
      console.log('Edit opportunity:', opportunity)
    }

    const viewOpportunity = (opportunity) => {
      console.log('View opportunity:', opportunity)
    }

    const saveLead = async () => {
      try {
        if (editingLead.value) {
          await crmAPI.updateLead(editingLead.value.id, leadForm.value)
          const index = leads.value.findIndex(l => l.id === editingLead.value.id)
          if (index !== -1) {
            leads.value[index] = { ...leadForm.value, id: editingLead.value.id }
          }
        } else {
          const response = await crmAPI.createLead(leadForm.value)
          leads.value.push(response.data.data)
        }

        closeLeadModal()
        filterLeads()
        generateAnalytics()
      } catch (error) {
        console.error('Error saving lead:', error)
      }
    }

    const closeLeadModal = () => {
      showLeadModal.value = false
      editingLead.value = null
      leadForm.value = {
        name: '',
        title: '',
        company: '',
        email: '',
        phone: '',
        source: 'website',
        status: 'new',
        estimated_value: 0,
        notes: ''
      }
    }

    const exportData = () => {
      console.log('Exporting CRM data...')
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

    // Lifecycle
    onMounted(() => {
      loadCRMData()
    })

    return {
      // State
      loading,
      activeTab,
      dashboard,
      leads,
      customers,
      opportunities,

      // Filters
      leadFilter,
      filteredLeads,

      // Modals
      showLeadModal,
      showCustomerModal,
      showOpportunityModal,
      editingLead,

      // Forms
      leadForm,

      // Pipeline
      pipelineStages,

      // Analytics
      leadSources,
      conversionFunnel,

      // Methods
      filterLeads,
      getStatusBadgeClass,
      getStatusLabel,
      getOpportunityBadgeClass,
      getPipelineCount,
      getPipelineValue,
      getPipelineItems,
      editLead,
      viewLead,
      convertLead,
      editCustomer,
      viewCustomer,
      contactCustomer,
      editOpportunity,
      viewOpportunity,
      saveLead,
      closeLeadModal,
      exportData,
      formatMoney,
      formatDate
    }
  }
}
</script>

<style scoped>
.crm-module {
  padding: 2rem;
  min-height: 100vh;
  background: var(--bs-body-bg);
}

.page-header {
  margin-bottom: 3rem;
}

.page-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--bs-body-color);
  margin-bottom: 0.5rem;
}

.page-subtitle {
  font-size: 1.1rem;
  color: var(--bs-secondary);
  margin: 0;
}

.stats-overview .stat-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--bs-border-radius-lg);
  padding: 2rem;
  height: 100%;
  transition: var(--transition-base);
  box-shadow: var(--card-shadow);
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--bs-box-shadow-lg);
}

.bg-gradient-primary { background: linear-gradient(135deg, var(--brand-primary) 0%, #667eea 100%); color: white; }
.bg-gradient-success { background: linear-gradient(135deg, var(--brand-success) 0%, #10b981 100%); color: white; }
.bg-gradient-warning { background: linear-gradient(135deg, var(--brand-warning) 0%, #f59e0b 100%); color: white; }
.bg-gradient-info { background: linear-gradient(135deg, var(--bs-info) 0%, #3b82f6 100%); color: white; }

.stat-content {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.stat-icon i {
  font-size: 3rem;
  opacity: 0.8;
}

.stat-value {
  font-size: 2.5rem;
  font-weight: 800;
  margin: 0;
  line-height: 1;
}

.stat-label {
  font-size: 1rem;
  margin: 0.5rem 0;
  opacity: 0.9;
}

.stat-change {
  font-size: 0.875rem;
  font-weight: 600;
}

.stat-change.positive { color: #10b981; }
.stat-change.neutral { color: #6b7280; }

.module-tabs .nav-tabs {
  border-bottom: 2px solid var(--card-border);
}

.module-tabs .nav-link {
  border: none;
  border-radius: var(--bs-border-radius-sm) var(--bs-border-radius-sm) 0 0;
  padding: 1rem 1.5rem;
  font-weight: 600;
  color: var(--bs-secondary);
  transition: var(--transition-base);
}

.module-tabs .nav-link:hover {
  color: var(--brand-primary);
  background-color: var(--brand-primary-soft);
}

.module-tabs .nav-link.active {
  color: var(--brand-primary);
  background-color: var(--brand-primary-soft);
  border-bottom: 3px solid var(--brand-primary);
}

.avatar img {
  width: 40px;
  height: 40px;
  object-fit: cover;
}

.pipeline-board {
  overflow-x: auto;
}

.pipeline-column {
  background: var(--bs-secondary-bg);
  border-radius: var(--bs-border-radius);
  padding: 1rem;
  min-height: 400px;
}

.pipeline-header {
  display: flex;
  justify-content: between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.pipeline-header h6 {
  margin: 0;
  font-weight: 600;
}

.pipeline-value {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--brand-primary);
  margin-bottom: 1rem;
}

.pipeline-item {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--bs-border-radius-sm);
  padding: 1rem;
  margin-bottom: 0.75rem;
  cursor: pointer;
  transition: var(--transition-base);
}

.pipeline-item:hover {
  box-shadow: var(--bs-box-shadow);
  transform: translateY(-1px);
}

.item-header {
  display: flex;
  justify-content: between;
  align-items: flex-start;
  margin-bottom: 0.5rem;
}

.item-value {
  font-weight: 700;
  color: var(--brand-success);
}

.source-analytics .source-item,
.conversion-funnel .funnel-stage {
  margin-bottom: 1rem;
}

.progress {
  height: 8px;
  border-radius: 4px;
}

.bg-orange {
  background-color: #f97316 !important;
}

/* These styles are now handled by the global Bootstrap theme */

@media (max-width: 768px) {
  .crm-module {
    padding: 1rem;
  }

  .page-title {
    font-size: 2rem;
  }

  .stat-content {
    flex-direction: column;
    text-align: center;
    gap: 1rem;
  }

  .stat-icon i {
    font-size: 2.5rem;
  }

  .stat-value {
    font-size: 2rem;
  }

  .pipeline-board {
    padding-bottom: 1rem;
  }

  .pipeline-column {
    min-width: 250px;
  }
}
</style>