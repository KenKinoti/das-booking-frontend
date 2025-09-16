<template>
  <div class="event-registrations-page">
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-left">
          <button @click="$router.back()" class="btn btn-outline-secondary btn-sm me-3">
            <i class="fas fa-arrow-left me-2"></i>Back
          </button>
          <div>
            <h1 class="page-title">Event Registrations</h1>
            <p class="page-subtitle" v-if="event">{{ event.title }}</p>
          </div>
        </div>
        <div class="header-actions">
          <button @click="exportRegistrations" class="btn btn-outline-primary">
            <i class="fas fa-download me-2"></i>Export
          </button>
          <button @click="openCheckInMode" class="btn btn-primary">
            <i class="fas fa-qrcode me-2"></i>Check-in Mode
          </button>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading registrations...</span>
      </div>
      <p class="loading-text">Loading registrations...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="alert alert-danger" role="alert">
      <i class="fas fa-exclamation-triangle me-2"></i>
      {{ error }}
      <button @click="fetchRegistrations" class="btn btn-outline-danger btn-sm ms-3">
        <i class="fas fa-redo me-1"></i>Try Again
      </button>
    </div>

    <!-- Registration Statistics -->
    <div v-else class="registrations-content">
      <div class="stats-overview">
        <div class="stat-card primary">
          <div class="stat-number">{{ stats.totalRegistrations }}</div>
          <div class="stat-label">Total Registrations</div>
        </div>
        <div class="stat-card success">
          <div class="stat-number">{{ stats.checkedIn }}</div>
          <div class="stat-label">Checked In</div>
        </div>
        <div class="stat-card warning">
          <div class="stat-number">{{ stats.pendingCheckIn }}</div>
          <div class="stat-label">Pending Check-in</div>
        </div>
        <div class="stat-card info">
          <div class="stat-number">${{ stats.totalRevenue.toFixed(2) }}</div>
          <div class="stat-label">Total Revenue</div>
        </div>
      </div>

      <!-- Filters and Search -->
      <div class="filters-section">
        <div class="filters-header">
          <h5>Filter Registrations</h5>
          <button
            @click="showFilters = !showFilters"
            class="btn btn-outline-secondary btn-sm"
          >
            <i :class="showFilters ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"></i>
            {{ showFilters ? 'Hide' : 'Show' }} Filters
          </button>
        </div>

        <div v-show="showFilters" class="filters-panel">
          <div class="filters-grid">
            <!-- Search -->
            <div class="filter-group">
              <label class="form-label">Search</label>
              <input
                v-model="filters.search"
                type="text"
                class="form-control"
                placeholder="Search by name, email..."
                @input="debouncedSearch"
              >
            </div>

            <!-- Status Filter -->
            <div class="filter-group">
              <label class="form-label">Status</label>
              <select v-model="filters.status" @change="applyFilters" class="form-select">
                <option value="">All Statuses</option>
                <option value="registered">Registered</option>
                <option value="checked_in">Checked In</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <!-- Ticket Type Filter -->
            <div class="filter-group">
              <label class="form-label">Ticket Type</label>
              <select v-model="filters.ticketType" @change="applyFilters" class="form-select">
                <option value="">All Ticket Types</option>
                <option v-for="ticket in ticketTypes" :key="ticket.id" :value="ticket.id">
                  {{ ticket.name }}
                </option>
              </select>
            </div>

            <!-- Registration Date Range -->
            <div class="filter-group">
              <label class="form-label">Registration Date</label>
              <input
                v-model="filters.dateFrom"
                type="date"
                class="form-control"
                @change="applyFilters"
              >
            </div>
            <div class="filter-group">
              <label class="form-label">To</label>
              <input
                v-model="filters.dateTo"
                type="date"
                class="form-control"
                @change="applyFilters"
              >
            </div>

            <!-- Clear Filters -->
            <div class="filter-group d-flex align-items-end">
              <button @click="clearFilters" class="btn btn-outline-secondary w-100">
                <i class="fas fa-times me-2"></i>Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Registrations Table -->
      <div class="registrations-table-container">
        <div class="table-header">
          <div class="table-header-left">
            <h5>Registrations ({{ filteredRegistrations.length }})</h5>
          </div>
          <div class="table-header-right">
            <div class="bulk-actions" v-show="selectedRegistrations.length > 0">
              <span class="selection-count">{{ selectedRegistrations.length }} selected</span>
              <button @click="bulkCheckIn" class="btn btn-primary btn-sm">
                <i class="fas fa-check me-1"></i>Bulk Check-in
              </button>
              <button @click="bulkDelete" class="btn btn-danger btn-sm">
                <i class="fas fa-trash me-1"></i>Delete
              </button>
            </div>
            <div class="view-options">
              <div class="btn-group" role="group">
                <button
                  @click="viewMode = 'table'"
                  :class="['btn', 'btn-outline-secondary', { active: viewMode === 'table' }]"
                  title="Table View"
                >
                  <i class="fas fa-table"></i>
                </button>
                <button
                  @click="viewMode = 'cards'"
                  :class="['btn', 'btn-outline-secondary', { active: viewMode === 'cards' }]"
                  title="Cards View"
                >
                  <i class="fas fa-th-large"></i>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Table View -->
        <div v-if="viewMode === 'table'" class="table-responsive">
          <table class="table table-hover">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    :checked="allSelected"
                    @change="toggleSelectAll"
                    class="form-check-input"
                  >
                </th>
                <th @click="sortBy('attendee_name')" class="sortable">
                  Name
                  <i class="fas fa-sort ms-1"></i>
                </th>
                <th @click="sortBy('attendee_email')" class="sortable">
                  Email
                  <i class="fas fa-sort ms-1"></i>
                </th>
                <th>Ticket Type</th>
                <th @click="sortBy('status')" class="sortable">
                  Status
                  <i class="fas fa-sort ms-1"></i>
                </th>
                <th @click="sortBy('registered_at')" class="sortable">
                  Registered
                  <i class="fas fa-sort ms-1"></i>
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="registration in paginatedRegistrations" :key="registration.id">
                <td>
                  <input
                    type="checkbox"
                    :value="registration.id"
                    v-model="selectedRegistrations"
                    class="form-check-input"
                  >
                </td>
                <td>
                  <div class="attendee-info">
                    <strong>{{ registration.attendee_name }}</strong>
                    <div v-if="registration.attendee_phone" class="text-muted small">
                      {{ registration.attendee_phone }}
                    </div>
                  </div>
                </td>
                <td>{{ registration.attendee_email }}</td>
                <td>
                  <span class="badge bg-secondary">{{ registration.ticket_type?.name || 'General' }}</span>
                  <div v-if="registration.ticket_type?.price > 0" class="text-success small">
                    ${{ registration.ticket_type.price }}
                  </div>
                </td>
                <td>
                  <span :class="`badge badge-status-${registration.status}`">
                    {{ formatStatus(registration.status) }}
                  </span>
                  <div v-if="registration.checked_in_at" class="text-muted small">
                    {{ new Date(registration.checked_in_at).toLocaleString('en-AU') }}
                  </div>
                </td>
                <td>{{ new Date(registration.registered_at).toLocaleDateString('en-AU') }}</td>
                <td>
                  <div class="dropdown">
                    <button class="btn btn-outline-secondary btn-sm dropdown-toggle" type="button" data-bs-toggle="dropdown">
                      <i class="fas fa-ellipsis-v"></i>
                    </button>
                    <ul class="dropdown-menu">
                      <li v-if="registration.status !== 'checked_in'">
                        <a class="dropdown-item" @click="checkInRegistration(registration)">
                          <i class="fas fa-check me-2"></i>Check In
                        </a>
                      </li>
                      <li>
                        <a class="dropdown-item" @click="viewRegistrationDetails(registration)">
                          <i class="fas fa-eye me-2"></i>View Details
                        </a>
                      </li>
                      <li>
                        <a class="dropdown-item" @click="sendConfirmationEmail(registration)">
                          <i class="fas fa-envelope me-2"></i>Send Email
                        </a>
                      </li>
                      <li><hr class="dropdown-divider"></li>
                      <li>
                        <a class="dropdown-item text-danger" @click="cancelRegistration(registration)">
                          <i class="fas fa-times me-2"></i>Cancel
                        </a>
                      </li>
                    </ul>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Empty State -->
          <div v-if="filteredRegistrations.length === 0" class="empty-state">
            <i class="fas fa-users fa-3x text-muted"></i>
            <h4>No registrations found</h4>
            <p class="text-muted">{{ filters.search || hasActiveFilters ? 'Try adjusting your filters' : 'No one has registered for this event yet.' }}</p>
          </div>
        </div>

        <!-- Cards View -->
        <div v-else class="cards-view">
          <div class="registrations-grid">
            <div v-for="registration in paginatedRegistrations" :key="registration.id" class="registration-card">
              <div class="card-header">
                <input
                  type="checkbox"
                  :value="registration.id"
                  v-model="selectedRegistrations"
                  class="form-check-input"
                >
                <span :class="`badge badge-status-${registration.status}`">
                  {{ formatStatus(registration.status) }}
                </span>
              </div>
              <div class="card-content">
                <h6 class="attendee-name">{{ registration.attendee_name }}</h6>
                <p class="attendee-email">{{ registration.attendee_email }}</p>
                <div v-if="registration.attendee_phone" class="attendee-phone">
                  <i class="fas fa-phone me-1"></i>{{ registration.attendee_phone }}
                </div>
                <div class="ticket-info">
                  <span class="badge bg-secondary">{{ registration.ticket_type?.name || 'General' }}</span>
                  <span v-if="registration.ticket_type?.price > 0" class="price">
                    ${{ registration.ticket_type.price }}
                  </span>
                </div>
                <div class="registration-date">
                  Registered: {{ new Date(registration.registered_at).toLocaleDateString('en-AU') }}
                </div>
              </div>
              <div class="card-actions">
                <button v-if="registration.status !== 'checked_in'" @click="checkInRegistration(registration)" class="btn btn-primary btn-sm">
                  <i class="fas fa-check me-1"></i>Check In
                </button>
                <button @click="viewRegistrationDetails(registration)" class="btn btn-outline-secondary btn-sm">
                  <i class="fas fa-eye me-1"></i>Details
                </button>
              </div>
            </div>
          </div>

          <!-- Empty State for Cards -->
          <div v-if="filteredRegistrations.length === 0" class="empty-state">
            <i class="fas fa-users fa-3x text-muted"></i>
            <h4>No registrations found</h4>
            <p class="text-muted">{{ filters.search || hasActiveFilters ? 'Try adjusting your filters' : 'No one has registered for this event yet.' }}</p>
          </div>
        </div>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="pagination-container">
          <nav>
            <ul class="pagination justify-content-center">
              <li class="page-item" :class="{ disabled: currentPage === 1 }">
                <a class="page-link" @click="changePage(currentPage - 1)">Previous</a>
              </li>
              <li
                v-for="page in visiblePages"
                :key="page"
                class="page-item"
                :class="{ active: page === currentPage }"
              >
                <a class="page-link" @click="changePage(page)">{{ page }}</a>
              </li>
              <li class="page-item" :class="{ disabled: currentPage === totalPages }">
                <a class="page-link" @click="changePage(currentPage + 1)">Next</a>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </div>

    <!-- Check-in Mode Modal -->
    <div class="modal fade" id="checkinModal" tabindex="-1">
      <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Quick Check-in Mode</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="qr-scanner-container">
              <div class="scanner-instructions">
                <h6>Scan QR Code or Search Manually</h6>
                <p>Use the camera to scan attendee QR codes or search by name/email below.</p>
              </div>
              <div class="scanner-area">
                <div class="qr-scanner-placeholder">
                  <i class="fas fa-qrcode fa-4x text-muted mb-3"></i>
                  <p>QR Scanner Will Load Here</p>
                  <button class="btn btn-primary">Enable Camera</button>
                </div>
              </div>
              <div class="manual-search">
                <div class="input-group">
                  <input
                    v-model="manualSearchQuery"
                    type="text"
                    class="form-control"
                    placeholder="Search by name or email..."
                    @input="searchForCheckIn"
                  >
                  <button class="btn btn-outline-secondary" type="button">
                    <i class="fas fa-search"></i>
                  </button>
                </div>
                <div v-if="searchResults.length" class="search-results">
                  <div
                    v-for="result in searchResults"
                    :key="result.id"
                    class="search-result-item"
                    @click="checkInRegistration(result)"
                  >
                    <div class="result-info">
                      <strong>{{ result.attendee_name }}</strong>
                      <div class="text-muted">{{ result.attendee_email }}</div>
                    </div>
                    <span :class="`badge badge-status-${result.status}`">
                      {{ formatStatus(result.status) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Registration Details Modal -->
    <div class="modal fade" id="registrationModal" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content" v-if="selectedRegistration">
          <div class="modal-header">
            <h5 class="modal-title">Registration Details</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="registration-details">
              <div class="detail-group">
                <label>Attendee Name</label>
                <p>{{ selectedRegistration.attendee_name }}</p>
              </div>
              <div class="detail-group">
                <label>Email</label>
                <p>{{ selectedRegistration.attendee_email }}</p>
              </div>
              <div class="detail-group" v-if="selectedRegistration.attendee_phone">
                <label>Phone</label>
                <p>{{ selectedRegistration.attendee_phone }}</p>
              </div>
              <div class="detail-group">
                <label>Ticket Type</label>
                <p>{{ selectedRegistration.ticket_type?.name || 'General' }}</p>
              </div>
              <div class="detail-group">
                <label>Status</label>
                <span :class="`badge badge-status-${selectedRegistration.status}`">
                  {{ formatStatus(selectedRegistration.status) }}
                </span>
              </div>
              <div class="detail-group">
                <label>Registration Date</label>
                <p>{{ new Date(selectedRegistration.registered_at).toLocaleString('en-AU') }}</p>
              </div>
              <div class="detail-group" v-if="selectedRegistration.checked_in_at">
                <label>Check-in Time</label>
                <p>{{ new Date(selectedRegistration.checked_in_at).toLocaleString('en-AU') }}</p>
              </div>
              <div class="detail-group" v-if="selectedRegistration.special_requirements">
                <label>Special Requirements</label>
                <p>{{ selectedRegistration.special_requirements }}</p>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button v-if="selectedRegistration.status !== 'checked_in'" @click="checkInRegistration(selectedRegistration)" class="btn btn-primary">
              <i class="fas fa-check me-2"></i>Check In
            </button>
            <button @click="sendConfirmationEmail(selectedRegistration)" class="btn btn-outline-primary">
              <i class="fas fa-envelope me-2"></i>Send Email
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { eventsService } from '../services/events'

export default {
  name: 'EventRegistrations',
  setup() {
    const route = useRoute()
    const router = useRouter()
    const authStore = useAuthStore()

    // State
    const loading = ref(true)
    const error = ref('')
    const event = ref(null)
    const registrations = ref([])
    const ticketTypes = ref([])
    const selectedRegistrations = ref([])
    const selectedRegistration = ref(null)
    const showFilters = ref(false)
    const viewMode = ref('table')
    const currentPage = ref(1)
    const itemsPerPage = ref(20)
    const manualSearchQuery = ref('')
    const searchResults = ref([])

    // Filters
    const filters = reactive({
      search: '',
      status: '',
      ticketType: '',
      dateFrom: '',
      dateTo: ''
    })

    // Sorting
    const sortBy = ref('registered_at')
    const sortOrder = ref('desc')

    // Computed Properties
    const stats = computed(() => {
      const total = registrations.value.length
      const checkedIn = registrations.value.filter(r => r.status === 'checked_in').length
      const pendingCheckIn = total - checkedIn
      const totalRevenue = registrations.value.reduce((sum, r) => {
        return sum + (r.ticket_type?.price || 0)
      }, 0)

      return {
        totalRegistrations: total,
        checkedIn,
        pendingCheckIn,
        totalRevenue
      }
    })

    const hasActiveFilters = computed(() => {
      return filters.search || filters.status || filters.ticketType || filters.dateFrom || filters.dateTo
    })

    const filteredRegistrations = computed(() => {
      let filtered = [...registrations.value]

      // Apply filters
      if (filters.search) {
        const query = filters.search.toLowerCase()
        filtered = filtered.filter(r =>
          r.attendee_name.toLowerCase().includes(query) ||
          r.attendee_email.toLowerCase().includes(query)
        )
      }

      if (filters.status) {
        filtered = filtered.filter(r => r.status === filters.status)
      }

      if (filters.ticketType) {
        filtered = filtered.filter(r => r.ticket_type_id === filters.ticketType)
      }

      if (filters.dateFrom) {
        filtered = filtered.filter(r => new Date(r.registered_at) >= new Date(filters.dateFrom))
      }

      if (filters.dateTo) {
        filtered = filtered.filter(r => new Date(r.registered_at) <= new Date(filters.dateTo))
      }

      // Apply sorting
      filtered.sort((a, b) => {
        const aValue = a[sortBy.value]
        const bValue = b[sortBy.value]

        if (sortOrder.value === 'asc') {
          return aValue > bValue ? 1 : -1
        } else {
          return aValue < bValue ? 1 : -1
        }
      })

      return filtered
    })

    const totalPages = computed(() => {
      return Math.ceil(filteredRegistrations.value.length / itemsPerPage.value)
    })

    const paginatedRegistrations = computed(() => {
      const start = (currentPage.value - 1) * itemsPerPage.value
      const end = start + itemsPerPage.value
      return filteredRegistrations.value.slice(start, end)
    })

    const visiblePages = computed(() => {
      const pages = []
      const total = totalPages.value
      const current = currentPage.value

      if (total <= 7) {
        for (let i = 1; i <= total; i++) pages.push(i)
      } else {
        if (current <= 4) {
          for (let i = 1; i <= 5; i++) pages.push(i)
          pages.push('...')
          pages.push(total)
        } else if (current >= total - 3) {
          pages.push(1)
          pages.push('...')
          for (let i = total - 4; i <= total; i++) pages.push(i)
        } else {
          pages.push(1)
          pages.push('...')
          for (let i = current - 1; i <= current + 1; i++) pages.push(i)
          pages.push('...')
          pages.push(total)
        }
      }

      return pages
    })

    const allSelected = computed(() => {
      return paginatedRegistrations.value.length > 0 &&
             selectedRegistrations.value.length === paginatedRegistrations.value.length
    })

    // Methods
    const fetchData = async () => {
      try {
        loading.value = true
        error.value = ''

        const eventId = route.params.eventId

        const [eventResponse, registrationsResponse, ticketsResponse] = await Promise.all([
          eventsService.getEventById(eventId),
          eventsService.getRegistrations(eventId),
          eventsService.getTicketTypes(eventId)
        ])

        event.value = eventResponse.data
        registrations.value = registrationsResponse.data || []
        ticketTypes.value = ticketsResponse.data || []

      } catch (err) {
        console.error('Error fetching data:', err)
        error.value = err.response?.data?.message || 'Failed to load registrations'
      } finally {
        loading.value = false
      }
    }

    const applyFilters = () => {
      currentPage.value = 1
    }

    const clearFilters = () => {
      Object.assign(filters, {
        search: '',
        status: '',
        ticketType: '',
        dateFrom: '',
        dateTo: ''
      })
      currentPage.value = 1
    }

    const debouncedSearch = debounce(() => {
      applyFilters()
    }, 300)

    const changePage = (page) => {
      if (page >= 1 && page <= totalPages.value) {
        currentPage.value = page
      }
    }

    const toggleSelectAll = () => {
      if (allSelected.value) {
        selectedRegistrations.value = []
      } else {
        selectedRegistrations.value = paginatedRegistrations.value.map(r => r.id)
      }
    }

    const checkInRegistration = async (registration) => {
      try {
        await eventsService.checkInRegistration(registration.qr_code, authStore.user.id)
        registration.status = 'checked_in'
        registration.checked_in_at = new Date().toISOString()

        // Close modals if open
        const modals = ['checkinModal', 'registrationModal']
        modals.forEach(modalId => {
          const modal = bootstrap.Modal.getInstance(document.getElementById(modalId))
          if (modal) modal.hide()
        })

      } catch (err) {
        console.error('Error checking in registration:', err)
        // Show error notification
      }
    }

    const bulkCheckIn = async () => {
      try {
        const promises = selectedRegistrations.value.map(async (regId) => {
          const registration = registrations.value.find(r => r.id === regId)
          if (registration && registration.status !== 'checked_in') {
            await eventsService.checkInRegistration(registration.qr_code, authStore.user.id)
            registration.status = 'checked_in'
            registration.checked_in_at = new Date().toISOString()
          }
        })

        await Promise.all(promises)
        selectedRegistrations.value = []

      } catch (err) {
        console.error('Error bulk checking in:', err)
        // Show error notification
      }
    }

    const bulkDelete = async () => {
      if (!confirm(`Are you sure you want to cancel ${selectedRegistrations.value.length} registrations?`)) {
        return
      }

      try {
        // Implementation for bulk delete
        selectedRegistrations.value = []
      } catch (err) {
        console.error('Error bulk deleting:', err)
      }
    }

    const exportRegistrations = async () => {
      try {
        await eventsService.exportRegistrations(route.params.eventId, 'csv')
      } catch (err) {
        console.error('Error exporting registrations:', err)
      }
    }

    const openCheckInMode = () => {
      const modal = new bootstrap.Modal(document.getElementById('checkinModal'))
      modal.show()
    }

    const viewRegistrationDetails = (registration) => {
      selectedRegistration.value = registration
      const modal = new bootstrap.Modal(document.getElementById('registrationModal'))
      modal.show()
    }

    const sendConfirmationEmail = async (registration) => {
      try {
        // Implementation for sending confirmation email
        console.log('Sending confirmation email to:', registration.attendee_email)
      } catch (err) {
        console.error('Error sending email:', err)
      }
    }

    const cancelRegistration = async (registration) => {
      if (!confirm('Are you sure you want to cancel this registration?')) {
        return
      }

      try {
        registration.status = 'cancelled'
      } catch (err) {
        console.error('Error cancelling registration:', err)
      }
    }

    const searchForCheckIn = () => {
      if (!manualSearchQuery.value.trim()) {
        searchResults.value = []
        return
      }

      const query = manualSearchQuery.value.toLowerCase()
      searchResults.value = registrations.value.filter(r =>
        r.attendee_name.toLowerCase().includes(query) ||
        r.attendee_email.toLowerCase().includes(query)
      ).slice(0, 5)
    }

    const formatStatus = (status) => {
      const statusMap = {
        'registered': 'Registered',
        'checked_in': 'Checked In',
        'cancelled': 'Cancelled'
      }
      return statusMap[status] || status
    }

    // Utility function for debouncing
    function debounce(func, delay) {
      let timeoutId
      return function (...args) {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(() => func.apply(this, args), delay)
      }
    }

    // Lifecycle
    onMounted(() => {
      fetchData()
    })

    return {
      loading,
      error,
      event,
      registrations,
      ticketTypes,
      selectedRegistrations,
      selectedRegistration,
      showFilters,
      viewMode,
      currentPage,
      filters,
      stats,
      hasActiveFilters,
      filteredRegistrations,
      paginatedRegistrations,
      totalPages,
      visiblePages,
      allSelected,
      manualSearchQuery,
      searchResults,
      fetchRegistrations: fetchData,
      applyFilters,
      clearFilters,
      debouncedSearch,
      changePage,
      toggleSelectAll,
      checkInRegistration,
      bulkCheckIn,
      bulkDelete,
      exportRegistrations,
      openCheckInMode,
      viewRegistrationDetails,
      sendConfirmationEmail,
      cancelRegistration,
      searchForCheckIn,
      formatStatus
    }
  }
}
</script>

<style scoped>
.event-registrations-page {
  padding: 2rem 0;
}

.page-header {
  background: white;
  border-bottom: 1px solid var(--bs-border-color);
  margin-bottom: 2rem;
  padding: 1.5rem 0;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
}

.page-title {
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0;
  color: var(--bs-primary);
}

.page-subtitle {
  color: var(--bs-secondary);
  margin: 0;
  font-size: 1rem;
}

.header-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.loading-container {
  text-align: center;
  padding: 4rem 0;
}

.loading-text {
  margin-top: 1rem;
  color: var(--bs-secondary);
}

.stats-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: white;
  border-radius: var(--bs-border-radius);
  padding: 1.5rem;
  text-align: center;
  border-left: 4px solid transparent;
}

.stat-card.primary { border-left-color: var(--bs-primary); }
.stat-card.success { border-left-color: var(--bs-success); }
.stat-card.warning { border-left-color: var(--bs-warning); }
.stat-card.info { border-left-color: var(--bs-info); }

.stat-number {
  font-size: 2rem;
  font-weight: 700;
  line-height: 1;
}

.stat-card.primary .stat-number { color: var(--bs-primary); }
.stat-card.success .stat-number { color: var(--bs-success); }
.stat-card.warning .stat-number { color: var(--bs-warning); }
.stat-card.info .stat-number { color: var(--bs-info); }

.stat-label {
  font-size: 0.9rem;
  color: var(--bs-secondary);
  margin-top: 0.5rem;
}

.filters-section {
  background: white;
  border: 1px solid var(--bs-border-color);
  border-radius: var(--bs-border-radius);
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.filters-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.filter-group {
  display: flex;
  flex-direction: column;
}

.filter-group label {
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: var(--bs-secondary);
}

.registrations-table-container {
  background: white;
  border: 1px solid var(--bs-border-color);
  border-radius: var(--bs-border-radius);
  overflow: hidden;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid var(--bs-border-color);
  background: var(--bs-light);
}

.table-header h5 {
  margin: 0;
  color: var(--bs-dark);
}

.table-header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.bulk-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem 1rem;
  background: var(--bs-primary);
  color: white;
  border-radius: var(--bs-border-radius);
}

.selection-count {
  font-weight: 500;
}

.table {
  margin: 0;
}

.table th.sortable {
  cursor: pointer;
  user-select: none;
}

.table th.sortable:hover {
  background: var(--bs-light);
}

.attendee-info strong {
  color: var(--bs-dark);
}

.badge-status-registered { background-color: var(--bs-primary); }
.badge-status-checked_in { background-color: var(--bs-success); }
.badge-status-cancelled { background-color: var(--bs-danger); }

.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: var(--bs-secondary);
}

.empty-state h4 {
  margin-top: 1rem;
  color: var(--bs-secondary);
}

.cards-view {
  padding: 1.5rem;
}

.registrations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1.5rem;
}

.registration-card {
  border: 1px solid var(--bs-border-color);
  border-radius: var(--bs-border-radius);
  padding: 1.5rem;
  transition: all 0.2s ease;
}

.registration-card:hover {
  border-color: var(--bs-primary);
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.card-content {
  margin-bottom: 1rem;
}

.attendee-name {
  font-weight: 600;
  color: var(--bs-dark);
  margin-bottom: 0.25rem;
}

.attendee-email {
  color: var(--bs-secondary);
  margin-bottom: 0.5rem;
}

.attendee-phone {
  font-size: 0.9rem;
  color: var(--bs-secondary);
  margin-bottom: 0.5rem;
}

.ticket-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.price {
  font-weight: 600;
  color: var(--bs-success);
}

.registration-date {
  font-size: 0.9rem;
  color: var(--bs-secondary);
}

.card-actions {
  display: flex;
  gap: 0.5rem;
}

.pagination-container {
  padding: 1.5rem;
  border-top: 1px solid var(--bs-border-color);
  background: var(--bs-light);
}

.qr-scanner-container {
  text-align: center;
}

.scanner-instructions {
  margin-bottom: 2rem;
}

.scanner-instructions h6 {
  color: var(--bs-primary);
}

.qr-scanner-placeholder {
  background: var(--bs-light);
  border: 2px dashed var(--bs-border-color);
  border-radius: var(--bs-border-radius);
  padding: 3rem;
  margin-bottom: 2rem;
}

.manual-search {
  text-align: left;
  margin-top: 2rem;
}

.search-results {
  margin-top: 1rem;
  border: 1px solid var(--bs-border-color);
  border-radius: var(--bs-border-radius);
  max-height: 200px;
  overflow-y: auto;
}

.search-result-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  cursor: pointer;
  border-bottom: 1px solid var(--bs-border-color);
}

.search-result-item:hover {
  background: var(--bs-light);
}

.search-result-item:last-child {
  border-bottom: none;
}

.registration-details {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.detail-group label {
  font-weight: 600;
  color: var(--bs-secondary);
  margin-bottom: 0.25rem;
  display: block;
}

.detail-group p {
  margin: 0;
  color: var(--bs-dark);
}

/* Responsive Design */
@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .header-actions {
    justify-content: center;
  }

  .stats-overview {
    grid-template-columns: repeat(2, 1fr);
  }

  .filters-grid {
    grid-template-columns: 1fr;
  }

  .table-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .table-header-right {
    justify-content: center;
    flex-wrap: wrap;
  }

  .bulk-actions {
    justify-content: center;
  }

  .registrations-grid {
    grid-template-columns: 1fr;
  }
}
</style>